-- ═══════════════════════════════════════════════════════════════════════════
--  REVIOZA — Schéma QR codes + tracking des scans/participations
--  À exécuter dans : Supabase → SQL Editor → New query → Run
--  Idempotent : peut être ré-exécuté sans casser l'existant.
--
--  Pré-requis : la table `public.merchants` existe déjà (clé `user_id` unique,
--  colonnes restaurant_name, restaurant_sub, primary_color, google_link,
--  image_url, prizes jsonb).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
--  1) TABLE qr_codes — un identifiant public stable par QR.
--     Aujourd'hui : 1 ligne par commerçant. Conçue pour en accepter
--     plusieurs plus tard (franchises multi-restaurants).
-- ───────────────────────────────────────────────────────────────
create table if not exists public.qr_codes (
	id          text primary key,                 -- id court public utilisé dans l'URL du QR
	user_id     uuid not null references auth.users(id) on delete cascade,
	label       text not null default 'Principal',
	active      boolean not null default true,
	created_at  timestamptz not null default now()
);
create index if not exists qr_codes_user_id_idx on public.qr_codes(user_id);

alter table public.qr_codes enable row level security;

-- Le commerçant connecté ne gère que SES propres QR codes.
drop policy if exists qr_select_own on public.qr_codes;
create policy qr_select_own on public.qr_codes
	for select using (auth.uid() = user_id);

drop policy if exists qr_insert_own on public.qr_codes;
create policy qr_insert_own on public.qr_codes
	for insert with check (auth.uid() = user_id);

drop policy if exists qr_update_own on public.qr_codes;
create policy qr_update_own on public.qr_codes
	for update using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
--  2) TABLE scans — une ligne par session de scan, enrichie au fil
--     du parcours client (device → consentement/Google → résultat).
-- ───────────────────────────────────────────────────────────────
create table if not exists public.scans (
	id              uuid primary key default gen_random_uuid(),
	qr_id           text references public.qr_codes(id) on delete set null,
	user_id         uuid,                 -- commerçant propriétaire (dénormalisé pour la RLS de lecture)
	scanned_at      timestamptz not null default now(),
	-- données appareil / réseau (capturées côté serveur Cloudflare)
	ip              text,
	country         text,
	city            text,
	region          text,
	user_agent      text,
	language        text,
	-- consentement RGPD + compte Google du joueur
	consent         boolean default false,
	google_email    text,
	google_name     text,
	google_sub      text,
	google_picture  text,
	-- résultat du jeu
	rating          int,
	prize_name      text,
	played          boolean default false,
	played_at       timestamptz,
	-- retour privé (note < 4) saisi par le client, visible uniquement du gérant
	feedback_text     text,
	feedback_archived boolean default false,
	updated_at      timestamptz default now()
);
create index if not exists scans_user_id_idx on public.scans(user_id);
create index if not exists scans_qr_id_idx on public.scans(qr_id);

alter table public.scans enable row level security;

-- Le commerçant ne lit QUE les scans de son établissement.
-- (Les écritures se font via les fonctions RPC SECURITY DEFINER ci-dessous,
--  donc aucune policy INSERT/UPDATE publique n'est ouverte sur la table.)
drop policy if exists scans_select_own on public.scans;
create policy scans_select_own on public.scans
	for select using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
--  3) RPC get_public_wheel — lecture publique (anon) de la config
--     d'une roue à partir de l'id du QR. SECURITY DEFINER : ne révèle
--     que les champs d'affichage, sans ouvrir la table merchants.
-- ───────────────────────────────────────────────────────────────
create or replace function public.get_public_wheel(p_qr text)
returns table (
	qr_id           text,
	restaurant_name text,
	restaurant_sub  text,
	primary_color   text,
	google_link     text,
	image_url       text,
	prizes          jsonb
)
language sql
security definer
set search_path = public
as $$
	select q.id, m.restaurant_name, m.restaurant_sub, m.primary_color,
	       m.google_link, m.image_url, to_jsonb(m.prizes)
	from public.qr_codes q
	join public.merchants m on m.user_id = q.user_id
	where q.id = p_qr and q.active = true;
$$;

revoke all on function public.get_public_wheel(text) from public;
grant execute on function public.get_public_wheel(text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────
--  4) RPC record_scan — crée une session de scan et renvoie son id.
--     Refuse les QR inexistants/inactifs. SECURITY DEFINER.
-- ───────────────────────────────────────────────────────────────
create or replace function public.record_scan(
	p_qr text, p_ip text, p_country text, p_city text,
	p_region text, p_user_agent text, p_language text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user uuid;
	v_id   uuid;
begin
	select user_id into v_user from public.qr_codes where id = p_qr and active = true;
	if v_user is null then
		return null;
	end if;

	insert into public.scans (qr_id, user_id, ip, country, city, region, user_agent, language)
	values (p_qr, v_user, p_ip, p_country, p_city, p_region, p_user_agent, p_language)
	returning id into v_id;

	return v_id;
end;
$$;

revoke all on function public.record_scan(text,text,text,text,text,text,text) from public;
grant execute on function public.record_scan(text,text,text,text,text,text,text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────
--  5) RPC update_scan — enrichit une session (consentement, compte
--     Google, note, lot). Champs NULL = inchangés. SECURITY DEFINER.
-- ───────────────────────────────────────────────────────────────
create or replace function public.update_scan(
	p_scan uuid, p_consent boolean, p_email text, p_name text,
	p_sub text, p_picture text, p_rating int, p_prize text, p_played boolean,
	p_feedback text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.scans set
		consent        = coalesce(p_consent, consent),
		google_email   = coalesce(p_email, google_email),
		google_name    = coalesce(p_name, google_name),
		google_sub     = coalesce(p_sub, google_sub),
		google_picture = coalesce(p_picture, google_picture),
		rating         = coalesce(p_rating, rating),
		prize_name     = coalesce(p_prize, prize_name),
		played         = coalesce(p_played, played),
		played_at      = case when p_played then now() else played_at end,
		feedback_text  = coalesce(p_feedback, feedback_text),
		updated_at     = now()
	where id = p_scan;
end;
$$;

revoke all on function public.update_scan(uuid,boolean,text,text,text,text,int,text,boolean,text) from public;
grant execute on function public.update_scan(uuid,boolean,text,text,text,text,int,text,boolean,text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────
--  6) RPC archive_feedback — le gérant marque un retour privé comme
--     traité. SECURITY DEFINER mais restreint à SES propres scans.
-- ───────────────────────────────────────────────────────────────
create or replace function public.archive_feedback(p_scan uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.scans
	set feedback_archived = true, updated_at = now()
	where id = p_scan and user_id = auth.uid();
end;
$$;

revoke all on function public.archive_feedback(uuid) from public;
grant execute on function public.archive_feedback(uuid) to authenticated;

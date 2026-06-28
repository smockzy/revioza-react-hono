-- ═══════════════════════════════════════════════════════════════════════════
--  REVIOZA — Migration : retours privés (note < 4) en base
--  À exécuter dans Supabase → SQL Editor → Run.
--  Pré-requis : qr_scans.sql déjà appliqué.
--  Idempotent : peut être ré-exécuté sans risque.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Nouvelles colonnes sur scans
alter table public.scans add column if not exists feedback_text     text;
alter table public.scans add column if not exists feedback_archived boolean default false;

-- 2) update_scan : on remplace l'ancienne version (9 args) par une version
--    qui accepte aussi le texte du retour privé (10 args).
drop function if exists public.update_scan(uuid,boolean,text,text,text,text,int,text,boolean);

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

-- 3) archive_feedback : le gérant marque un retour comme traité (ses scans only).
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

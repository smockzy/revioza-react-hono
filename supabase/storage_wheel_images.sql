-- ════════════════════════════════════════════════════════════════
--  REVIOZA — Storage : bucket public pour les images d'établissement
-- ════════════════════════════════════════════════════════════════
--  But : héberger de façon FIABLE et PUBLIQUE l'image d'accueil que le
--  commerçant affiche dans l'app client (/play). Remplace ImgBB + le
--  fallback base64 local (qui rendait l'image invisible pour les autres).
--
--  L'URL publique renvoyée est stockée dans `merchants.image_url` et lue
--  par /play via la fonction `get_public_wheel`.
--
--  Upload autorisé en anonyme (pour /demo) ET connecté (pour /merchant).
--  Lecture publique (bucket public → URL CDN accessible à tous).
--
--  À exécuter une fois dans le SQL Editor Supabase.
--  (Alternative : créer le bucket « wheel-images » en public via
--   Dashboard → Storage → New bucket, puis n'exécuter que les policies.)
-- ════════════════════════════════════════════════════════════════

-- 1) Bucket public
insert into storage.buckets (id, name, public)
values ('wheel-images', 'wheel-images', true)
on conflict (id) do update set public = true;

-- 2) Upload autorisé à tous (anon + connectés) dans CE bucket uniquement
drop policy if exists "wheel-images insert public" on storage.objects;
create policy "wheel-images insert public"
	on storage.objects for insert
	to anon, authenticated
	with check (bucket_id = 'wheel-images');

-- 3) Lecture publique de CE bucket (le bucket public suffit en général,
--    on l'explicite pour les accès via le client JS)
drop policy if exists "wheel-images select public" on storage.objects;
create policy "wheel-images select public"
	on storage.objects for select
	to anon, authenticated
	using (bucket_id = 'wheel-images');

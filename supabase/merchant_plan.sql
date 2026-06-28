-- ═══════════════════════════════════════════════════════════════════════════
--  REVIOZA — Migration : forfait (plan) du commerçant
--  À exécuter dans Supabase → SQL Editor → Run.
--  Idempotent : peut être ré-exécuté sans risque.
-- ═══════════════════════════════════════════════════════════════════════════

-- Code du forfait souscrit par l'établissement.
-- Valeur libre (text) pour pouvoir ajouter de nouveaux forfaits sans migration
-- de type enum. Aujourd'hui une seule offre : 'pro' (Plan Pro Tout-Inclus).
-- Futurs exemples : 'starter', 'business', 'franchise'.
alter table public.merchants
	add column if not exists plan text not null default 'pro';

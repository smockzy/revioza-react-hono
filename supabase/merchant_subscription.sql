-- ════════════════════════════════════════════════════════════════
--  REVIOZA — Migration : statut d'abonnement du commerçant
-- ════════════════════════════════════════════════════════════════
--  But : savoir si un commerçant a un abonnement actif, ce qui débloque
--  l'impression de son QR code (fonctionnalité payante).
--
--  Aujourd'hui : aucun paiement réel (Stripe pas encore branché) → la colonne
--  reste `false` pour tout le monde, donc le QR est verrouillé partout.
--  Plus tard : les webhooks Stripe passeront `subscription_active` à `true`
--  (source de vérité), ce qui débloquera le QR automatiquement.
--
--  Pour TESTER le QR débloqué dès maintenant, mets manuellement la colonne à
--  `true` sur ta ligne :
--    update public.merchants set subscription_active = true where user_id = '<ton-user-id>';
-- OU ALORS SANS UTILISER MON ID ET EN DEBLOQUANT TOUT : 
--	update public.merchants set subscription_active = true;
-- ════════════════════════════════════════════════════════════════

alter table public.merchants
	add column if not exists subscription_active boolean not null default false;

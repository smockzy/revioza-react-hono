# Journal de bord — Revioza

Résumé daté de chaque tâche de développement. **La plus récente en haut.**
Format date : `AAAA-MM-JJ HH:MM`.

> Ce fichier est versionné dans Git/GitHub : il survit à un crash ou un changement
> d'appareil. Il est tenu à jour à la fin de chaque tâche (règle n°8 de `CLAUDE.md`).

---

## 2026-06-30 — Vérification post-crash + mise en place du journal

- Vérifié que le dépôt local était **synchronisé avec GitHub** (`origin/main`) :
  0 commit en avance, 0 en retard, working tree propre, aucun stash.
  → Malgré le crash de l'autre appareil, **rien n'avait été perdu** : le travail de
  la session du 2026-06-29 avait bien été commité ET poussé.
- Ajouté la **règle absolue n°8** dans `CLAUDE.md` (résumé daté en fin de tâche).
- Créé ce `JOURNAL.md` versionné.

## 2026-06-29 00:53 — Gestion des forfaits (plans) marchands

Commit `6e4db12` « feat: Add plan management for merchants with corresponding SQL migration »
- `supabase/merchant_plan.sql` : migration ajoutant la colonne `plan` aux marchands
- `app/routes/merchant.tsx` : prise en charge du plan dans le panel marchand
- `app/styles/merchant.css` : styles associés

## 2026-06-29 00:10 — Sessions de scan & feedback privé

Commit `a7c166a` « feat: Enhance scan session management and feedback handling »
- `supabase/qr_scans.sql` + `supabase/private_feedback.sql` : nouvelles tables/migrations
- `app/utils/useMerchantSession.ts` (nouveau hook), `supabase-config.ts`, `supabase-client.ts`
- Refactor des routes : `merchant.tsx`, `play.tsx`, `qr-code.tsx`, `home.tsx`, `demo.tsx`
- `workers/app.ts` : endpoints backend pour scans/feedback

## 2026-06-28 — Animations « aurora » de l'accueil

Commits `e413eea`, `ad54839`, `aa2fadd`, `06f36ed`, `52e39cc`, `3128932`
- Fond aurora rouge animé « fumée » (filtre SVG turbulence) sur sections démo + tarifs
- Réglages successifs : taille, déformation, vitesse, parallaxe, version mobile

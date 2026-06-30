# 📋 Revioza — Liste de tâches

Issue de `app/routes/commentaires.md`. Découpée en 8 parties pour être exécutée
session par session sans surcharger le contexte.

**Contexte :** SaaS de gamification d'avis Google. Stack : React Router v7 (SSR) +
Hono/Cloudflare Workers + Supabase. Lire `CLAUDE.md` avant de commencer (règles
absolues). Gros changements visuels → **branche dédiée, jamais sur `main`**.
Journaliser chaque tâche dans `JOURNAL.md`.

**Ordre conseillé :** 1 → 4 (quick wins), puis 6, 7, puis 5 et 8 (sur branches).

---

## 🟢 Partie 1 — Accueil : bugs visuels rapides
*Fichiers : `app/routes/home.tsx`, `app/styles/style.css`*
- [ ] Supprimer les **taches blanches** sur les titres de certaines rubriques (mots en rouge).
- [ ] Rubrique « 3 étapes pour multiplier vos avis » : **3 cartes identiques en taille** + **retirer les animations flottantes** des icônes.
- [ ] Corriger le **bug en bas de page** : zone vide scrollable sous la navbar du bas.

## 🟢 Partie 2 — Accueil : contenu & neutralité
*Fichiers : `app/routes/home.tsx` (+ assets avis)*
- [ ] **Avis crédibles** : logos de commerces en photo de profil + quelques fautes/imperfections.
- [ ] Site **neutre, tous types de commerces** (pas que restaurants) : textes, exemples, visuels.

## 🟡 Partie 3 — Responsive / mobile
*Fichiers : `app/styles/style.css` (global) + pages concernées*
- [ ] Corriger l'affichage **mobile cassé** : contenu coupé à droite, textes qui débordent des boutons.
- [ ] **Adapter la disposition** des éléments sur téléphone.
- [ ] Rendre la **page client** (test de l'app) plus jolie et adaptée à tous les écrans.

## 🟡 Partie 4 — /demo : bugs fonctionnels
*Fichiers : `app/routes/demo.tsx`, `app/routes/play.tsx`*
- [ ] **Flèches en bas du téléphone** (« Tentez l'expérience en direct » + /demo) : fonctionnelles (passer/revenir entre étapes).
- [ ] /demo : **supprimer la redirection** vers une nouvelle page au clic sur les étoiles.
- [ ] /demo : **pop-up d'avertissement** si étoiles sans **Place ID valide**, au lieu d'une page d'erreur.

## 🔵 Partie 5 — /demo : refonte visuelle ⚠️ *(branche dédiée, pas main)*
*Fichiers : `app/routes/demo.tsx` + CSS*
- [ ] Refonte /demo : **même DA que l'accueil**, page vivante (animations + fond animé), personnalisation **compacte** (sans scroll). Objectif : page convaincante / « addictive » (demander les techniques d'engagement).

## 🟠 Partie 6 — QR code : gating, connexion & images client
*Fichiers : `app/routes/qr-code.tsx`, `app/routes/demo.tsx`, `app/routes/play.tsx`, `app/routes/merchant.tsx`*
- [ ] « Imprimer mon QR code » : QR **flouté + cadenas** + « Pour débloquer veuillez souscrire à l'abonnement » + bouton « Voir les tarifs ».
- [ ] **Sans être connecté** : afficher l'**interface connexion/inscription** au lieu de la redirection muette vers `/demo?login=required` (qr-code.tsx L46-48).
- [ ] **Images hébergées visibles par tous** + **affichées dans l'app client au scan**. Aujourd'hui publique seulement si upload **ImgBB** OK, sinon **base64 local** (invisible pour les autres). Cible : hébergement public fiable (idéalement **Supabase Storage**), URL dans `merchants.image_url`, affichage vérifié dans `/play` via `get_public_wheel`.

## 🟠 Partie 7 — Tarifs / forfaits
*Fichiers : `app/routes/pricing.tsx`*
- [ ] Remettre les **forfaits** (Starter, Business/Pro, Franchise) — prix à définir.
- [ ] **Tableau d'avantages** par forfait, croix grisées sur ce qui manque dans Starter.
- [ ] Clic « Essayer gratuitement » **sans compte** → afficher inscription/connexion.

## 🔴 Partie 8 — Auth, redirections & palette ⚠️ *(sensible — middleware Hono)*
*Fichiers : `workers/app.ts`, `app/routes/merchant.tsx`, `useMerchantSession.ts`, config Supabase*
- [ ] Écran Google sign-in : afficher **« revioza.com »** au lieu de « …supabase.co ».
- [ ] Corriger la **redirection après login** : parfois `/demo` au lieu de `/merchant`.
- [ ] **Scope de la palette** : dans `merchant.tsx` la couleur est posée sur `:root` (`document.documentElement`, L216/237/261) → change tout le dashboard. La scoper au **conteneur de l'aperçu téléphone** seulement, comme `/demo` (`.phone-simulator-wrapper`).

---

## 📎 Contexte déjà investigué (avant de coder)
- **QR de bout en bout :** OUI (qr-code.tsx → `/api/scan` → `get_public_wheel` → play.tsx). 3 conditions : migrations `qr_scans.sql` appliquées, config sauvée via `/merchant` (upsert `merchants`), **auth fonctionnelle** (seul vrai bloquant). ⚠️ `/demo` n'utilise PAS ce circuit (params d'URL `/play?name=...`).
- **Images :** hébergées sur **ImgBB** (externe/public) ; fallback **base64 local** si échec. Clé `IMGBB_API_KEY` exposée côté client → à migrer.
- **Auth :** Google OAuth via Supabase **non finalisé** — repartir de l'état réel des fichiers, ne rien supposer.

## ⏭️ Reporté (plus tard)
- CGV, mentions légales, politique de confidentialité.

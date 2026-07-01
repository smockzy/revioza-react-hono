# Journal de bord — Revioza

Résumé daté de chaque tâche de développement. **La plus récente en haut.**
Format date : `AAAA-MM-JJ HH:MM`.

> Ce fichier est versionné dans Git/GitHub : il survit à un crash ou un changement
> d'appareil. Il est tenu à jour à la fin de chaque tâche (règle n°8 de `CLAUDE.md`).

---

## 2026-07-01 02:00 — Partie 6c : images → Supabase Storage (fin Partie 6)

Migration de l'hébergement des images d'ImgBB (+ fallback base64 local invisible)
vers **Supabase Storage** (bucket public, hébergement fiable visible par tous).

- **Bucket + policies** : `supabase/storage_wheel_images.sql` (bucket public
  `wheel-images`, INSERT autorisé anon + authenticated, SELECT public). ⚠️ à appliquer.
- **Helper partagé** : `uploadWheelImage(file)` dans `app/utils/supabase-client.ts`
  (upload + renvoi de l'URL publique).
- **demo.tsx** : upload anonyme → Storage (plus d'ImgBB ni de fallback base64). En cas
  d'échec, on n'enregistre rien (jamais d'image invisible). base64 = aperçu temporaire.
- **merchant.tsx** : **nouveau champ d'upload d'image** dans le formulaire (le gérant
  n'avait aucun moyen d'uploader). Upload → Storage → `merchants.image_url` (via
  saveConfig/upsert) → lu par /play.
- **home.tsx** : le `handleFileUpload` (code mort) basculé aussi sur Storage.
- **Clé ImgBB supprimée** de `app/utils/state.ts` (plus utilisée). À révoquer côté
  ImgBB lors de l'audit (voir mémoire sécurité).
- **Chaîne vérifiée** : `get_public_wheel` renvoie `image_url` (qr_scans.sql L96/104),
  /play le lit (`wheel.image_url`).

⚠️ **ACTION REQUISE QUENTIN** : appliquer `supabase/storage_wheel_images.sql` (SQL editor)
OU créer un bucket public `wheel-images` via Dashboard → Storage puis exécuter les policies.

⏭️ Reporté en Partie 5 (refonte /demo) : placeholder noir « Image de votre établissement »
dans le téléphone de /demo tant qu'aucune image (le téléphone /demo sera refait en P5).

typecheck OK. En attente de validation.

## 2026-07-01 01:25 — Partie 6 (a+b) : QR — connexion + gating cadenas

Partie 4 validée et mergée sur `main`.

Partie 6 découpée (6c images/Storage à suivre). Fait ici (6a + 6b) :
- **6a — connexion** (`app/routes/qr-code.tsx`) : non connecté → redirection vers
  `/?login=required` (ouvre la modale connexion/inscription de l'accueil) au lieu de
  l'ancienne redirection muette vers `/demo?login=required`. Couvre aussi le clic
  « Imprimer mon QR code » depuis /demo (qui navigue vers /qr-code).
- **6b — gating abonnement** : décision grill = nouveau flag booléen
  **`merchants.subscription_active`** (migration `supabase/merchant_subscription.sql`,
  défaut `false`). qr-code.tsx lit ce flag :
  - non abonné → **QR flouté + cadenas** + « Pour débloquer veuillez souscrire à
    l'abonnement » + bouton **« Voir les tarifs »** (→ /pricing) + Retour.
  - abonné → QR net + bouton Imprimer (comportement normal).
  Stripe passera le flag à `true` plus tard (webhooks = source de vérité).

⚠️ **ACTION REQUISE QUENTIN** : appliquer `supabase/merchant_subscription.sql` dans
le SQL editor Supabase. Pour tester le QR débloqué :
`update public.merchants set subscription_active = true where user_id = '<ton-id>';`

typecheck OK. Reste 6c : images → Supabase Storage (nécessitera un bucket + policy).

## 2026-07-01 01:07 — Partie 4 : bugs /demo (flèches + clic étoiles) — Partie 3 validée

Partie 3 **validée sur S23** (le correctif blindé du hero — flex centré + enfants
≤100% — a réglé le décalage à droite). Mergée sur `main`.

Partie 4 (`app/styles/style.css`, `app/routes/home.tsx`, `app/routes/demo.tsx`) :
- **Flèches de navigation des étapes** (accueil « Tentez l'expérience » + /demo) :
  le `.preview-step-footer` (frère du téléphone, dans le wrapper `pointer-events:
  none`) n'était pas dans la liste `pointer-events: auto` → les clics étaient
  ignorés. Ajouté à la règle → flèches fonctionnelles (passer/revenir, bornées 1–4).
- **Clic sur les étoiles** (accueil + /demo) : suppression de la redirection
  `window.open` vers Google (et du branchement Place ID). Désormais : effet visuel
  (étoiles qui se remplissent) → popup « J'ai déposé mon avis » (icône check verte)
  → bouton « Lancer la roue 🎡 » qui passe à l'étape 3. Aucune redirection.
  Bouton « LAISSER UN AVIS SUR GOOGLE » : `window.open` retiré aussi.
- Rappel grill : la logique Place ID + redirection réelle vivra sur **/merchant**
  (pas /demo), à traiter plus tard.

typecheck OK. En attente de validation avant la Partie 6.

## 2026-06-30 18:15 — Partie 3 (suite 3) : VRAIE cause du hero décalé à droite

Le décalage touchait TOUT le bloc hero (titre + boutons + social proof) → problème
de **positionnement**, pas de police. Cause exacte trouvée :
`.hero-content-wrap` avait `justify-items: center` (≤860px) → `.hero-left` passait
en **shrink-to-fit**, donc son paragraphe prenait sa `max-width: 520px` (largeur
naturelle) au lieu de se limiter à l'écran. Résultat : `.hero-left` ≈ 520px > 360px,
démarrant à gauche et **débordant à droite** (clippé par `overflow: hidden` du hero).

Correctif (`app/styles/style.css`, bloc `@media max-width: 860px`) :
- `justify-items: center` → `stretch` ;
- `.hero-left { width: 100%; max-width: 100% }` ;
- `.hero-left p { max-width: 100% }` (ne déborde plus à 520px) ;
- `.hero-cta-group { width: 100% }`.
Le bloc se recentre et tout rentre dans l'écran.

En attente de re-validation S23.

## 2026-06-30 18:04 — Partie 3 (suite 2) : typo fluide du hero (débordement droite)

Retour test S23 (capture) : header OK, mais le **hero débordait encore à droite**
(le `.section-hero` a `overflow: hidden` → la partie droite était clippée, donc
invisible). Le h1 restait trop gros sur mobile.

Correctif (`app/styles/style.css`) — passage à une **typographie fluide `clamp()`**
qui se réduit automatiquement avec la largeur (exactement la demande de Quentin :
« le texte se rétrécit quand le format se resserre ») :
- `.hero-left h1` : `clamp(1.75rem, 7vw, 3.75rem)` (≈28px à 360px au lieu de ~45px).
- `.section-heading` : `clamp(1.5rem, 5.5vw, 2.5rem)`.
- `.hero-left p` : `clamp(0.95rem, 3.8vw, 1.15rem)`.
- Ajout `overflow-wrap: anywhere` + `min-width: 0` / `max-width: 100%` sur `.hero-left`.
- Suppression des overrides de breakpoint (`@media 1100/768/600/430`) qui fixaient
  ces tailles et entraient en conflit avec les `clamp`.

En attente de re-validation S23.

## 2026-06-30 17:50 — Partie 3 (suite) : header qui déborde sur mobile

Retour test S23 : le débordement à droite global était corrigé, mais le **header**
débordait encore (boutons « Mon espace gérant » / « Se déconnecter » trop grands).
Cause : les règles responsive du header ne ciblaient que l'état **déconnecté**
(`#btn-header-login`, `#btn-header-register`) ; les boutons de l'état **connecté**
gardaient `fontSize: 0.85rem` en dur (style inline) → débordement.

Correctif (`app/routes/home.tsx`, `app/styles/style.css`) :
- Classe `.header-actions` ajoutée au groupe de boutons du header.
- Rétrécissement **fluide** du texte et du padding via `clamp()` sur tous les
  boutons du groupe (`font-size: clamp(0.6rem, 2.7vw, 0.85rem)`, padding idem),
  avec `!important` pour battre les styles inline. Le texte se réduit tout seul
  quand l'écran se resserre.
- `.logo-text` réduit en ≤480px (1.4rem) et ≤380px (1.25rem) pour laisser la place.

En attente de re-validation S23.

## 2026-06-30 17:38 — Partie 3 : responsive mobile (accueil, cible Galaxy S23)

Sur `feat/refonte-taches` (`app/styles/style.css`) :
- **Bug n°1 du débordement à droite identifié** : le simulateur téléphone utilisait
  `transform: scale()` sur le wrapper — or un `transform` réduit le **visuel** mais
  **pas la largeur de mise en page** (le téléphone occupait toujours 375px → débordait
  sur 360px). Correctif : `transform` retiré du wrapper, scale appliqué à l'enfant
  `.phone-container` (origin top center) + largeur du wrapper = taille réduite réelle
  (`calc(var(--phone-w) * 0.85)` puis `* 0.72` en ≤480) + `margin-bottom` négatif pour
  récupérer l'espace vertical du scale. Le footprint correspond enfin au visuel.
- **Garde-fous globaux** : `html { overflow-x: hidden; max-width: 100% }`,
  `overflow-wrap: break-word` sur le texte, `max-width: 100%` sur img/canvas/svg/table.
- **Breakpoint S23 (≤430px)** : titres de section 1.6rem, hero h1 2.1rem, sous-titres
  réduits ; boutons en `white-space: normal` + `word-break` pour que le texte reste
  DANS le bouton (corrige « écritures qui dépassent des boutons »).
- **≤480px** : padding latéral des sections resserré (plus de place utile).
- La roue décorative du hero (340px) était déjà bornée par `max-width: 100%`.

**/play non modifiée** : déjà mobile-first et responsive (full-screen, centrée 420px
desktop, breakpoints hauteur). Une vraie passe « plus jolie » relèverait de la DA
(à cadrer comme la Partie 5) — en attente de l'avis de Quentin.

En attente de validation visuelle sur Galaxy S23 avant la Partie 4.

## 2026-06-30 16:31 — Partie 2 : contenu & neutralité accueil

Sur `feat/refonte-taches` (`app/routes/home.tsx`, `app/styles/style.css`) :
- **Avis crédibles** : textes raccourcis (longueurs variées, ton plus brut),
  **initiales conservées** (pas de logos, pas de fautes ajoutées). Le 5ᵉ avis
  « Pizzeria Napoli Nostra » → « Fleuriste Côté Jardin » pour sortir du tout-resto
  (avis désormais : coiffure, hôtel, garage, pharmacie, fleuriste).
- **Exemple par défaut neutralisé** : « Bella Napoli / Pizzeria » →
  « Votre établissement / Votre activité » (`DEFAULT_APP_STATE` + `renderPhoneSimulator`).
- **Image du téléphone d'accueil** : l'image pizza est remplacée par un
  **placeholder noir « Image de votre établissement »** (`.hero-image-placeholder`),
  cliquable → `/demo`. S'affiche tant qu'aucune image custom n'existe (sinon l'image
  custom est montrée). NB : l'upload de l'accueil était du code mort (aucun input rendu).
- **Neutralité du reste de la copie** : « serveur » → « commerçant » (×2),
  « du restaurant » → « de l'établissement », « sur sa table » → « sur place »,
  « QR Code de table » → « QR Code », footer « pizzerias, tacos, burgers » →
  « restaurants, salons, boutiques, garages et bien plus », placeholders du
  formulaire d'inscription → « Salon Élégance » / « Salon de coiffure ».

⚠️ À faire dans les parties suivantes : reproduire le placeholder noir dans le
téléphone de `/demo` (Partie 5/6) tant que le gérant n'a pas uploadé son image.

En attente de validation visuelle (Galaxy S23) avant la Partie 3.

## 2026-06-30 16:17 — Partie 1 : bugs visuels accueil (branche `feat/refonte-taches`)

Lancement de la refonte des 8 parties sur la branche **`feat/refonte-taches`**
(branche unique, commits granulaires, transfert sur `main` au choix de Quentin).

Partie 1 corrigée (`app/styles/style.css`, `app/routes/home.tsx`) :
- **Taches blanches sur les mots rouges des titres** : supprimé le double
  `background-clip: text` (le titre parent clippait un dégradé blanc→gris sur
  *tout* le texte, transparaissant sur les bords des mots rouges). Le parent
  `.section-heading` est désormais en couleur pleine `#f5f5f7` ; seul le `span`
  rouge garde le dégradé clippé. ⚠️ effet de bord : le titre n'a plus son léger
  dégradé blanc→gris (remplacé par blanc plein, visuellement quasi identique).
- **Cartes « 3 étapes » identiques** : `.how-steps` passe en `align-items: stretch`
  + `.how-step-card { height: 100%; min-width: 0 }` → mêmes hauteur et largeur.
- **Icônes flottantes des 3 étapes retirées** : sélecteur GSAP réduit à
  `.feature-icon i` (les features gardent l'effet, les 3 étapes non).
- **Zone vide scrollable en bas** : `body::after` (aurora) passé de
  `position: absolute` à `fixed` → ne rallonge plus la zone scrollable.

En attente de validation visuelle sur Galaxy S23 avant la Partie 2.

## 2026-06-30 14:04 — Analyse de commentaires.md + création de TODO.md

- Analysé `app/routes/commentaires.md` (23 points : tâches + questions) et
  établi un plan d'action **découpé en 8 parties** (1 session chacune) →
  écrit dans **`TODO.md`** (racine, versionné).
- Investigué et répondu aux 3 questions ouvertes :
  - **QR fonctionnel de bout en bout** : oui (qr-code → /api/scan → `get_public_wheel`
    → play), sous 3 conditions (migrations `qr_scans.sql`, config sauvée via `/merchant`,
    auth OK). `/demo` utilise un circuit séparé (params d'URL).
  - **Images** : hébergées sur **ImgBB** (public) avec fallback **base64 local** ;
    clé API exposée côté client.
  - **Palette** : fuit car posée sur `:root` dans `merchant.tsx` (L216/237/261) ;
    `/demo` la scope déjà au conteneur téléphone → modèle à recopier.
- Aucune modification de code applicatif : uniquement planification et doc.

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

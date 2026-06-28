# Listing des animations — page d'accueil (`app/routes/home.tsx`)

Branche `refonte-da`. Ce fichier recense **toutes** les animations de la page d'accueil
pour pouvoir retirer facilement celles qui ne plaisent pas.

Légende des types :
- **GSAP** : piloté par GreenSock (dans le `useEffect` "GSAP — animations d'ambiance" de [home.tsx](app/routes/home.tsx), ou les handlers de la roue).
- **CSS** : keyframes / transitions dans [style.css](app/styles/style.css).
- **Framer** : Framer Motion (composant `FadeInSection` ou `motion.*`).
- **Observer** : système maison `.reveal` (IntersectionObserver).

> Astuce : tout le GSAP est regroupé dans un seul `gsap.context(...)` dans `home.tsx`.
> Pour désactiver une anim GSAP, supprime son bloc dans ce `useEffect`.
> Tout est déjà coupé automatiquement si `prefers-reduced-motion` est actif.

---

## Fond global (toute la page)

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 1 | **Aurora rouge "fumée"** (nappes qui dérivent) | GSAP + CSS | `renderAuroraBg()` dans home.tsx ; `.section-aurora` / `.aurora-blob` dans style.css ; bloc GSAP "Aurora fumée" | Retirer les appels `{renderAuroraBg()}` dans les sections voulues (voir colonne "sections" plus bas) |
| 2 | **Halos qui dérivent** (aurora de fond) | CSS | `body::after` + `@keyframes aurora-drift` | Supprimer `animation: aurora-drift...` |
| 3 | **Grain de pellicule** (texture qui vibre) | CSS | `body::before` + `@keyframes grain-shift` | Supprimer `animation: grain-shift...` |

L'aurora (#1) est appliquée **une rubrique sur deux** : **"Comment ça marche", "Fonctionnalités", "Des tarifs simples"** (pas le hero, pas la démo, pas les avis — pour casser la symétrie).
Les nappes se déplacent **aléatoirement et en continu** (mouvement autonome via GSAP, amplitude large + `repeatRefresh`).
Leur forme irrégulière "fumée" vient d'un filtre SVG `#aurora-smoke` (`feTurbulence` + `feDisplacementMap`, défini en haut de `home.tsx`) appliqué via `filter: url(#aurora-smoke)` sur `.aurora-blob`.
Pour l'enlever d'une section : supprimer le `{renderAuroraBg()}` correspondant + remettre son ancien `background` dans style.css.
Pour une forme ronde "classique" : retirer `url(#aurora-smoke)` du `filter` de `.aurora-blob`.

---

## Section HERO

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 4 | **Grille rouge qui suit le curseur** (+ lueur néon + balayage blanc) | CSS + JS | `.hero-cursor-glow` (style.css) ; `onMouseMove` sur `.section-hero` (home.tsx) | Supprimer le `<div className="hero-cursor-glow">` + l'`onMouseMove` |
| 5 | **Entrée du hero en cascade** (titre, texte, CTA, roue) | Framer | `motion.*` + `heroContainerVariants`/`heroItemVariants`/`heroPhoneVariants` | Remplacer les `motion.div` par des `div` simples |
| 6 | **Roue qui tourne + lueur qui pulse** | CSS | `@keyframes hero-wheel-spin` / `hero-wheel-glow-pulse` | Supprimer les `animation:` sur `.hero-wheel-spin` / `.hero-wheel-glow` |
| 7 | **Survol roue : flèche sort + étoiles poppent + bounce out** | GSAP | `handleWheelEnter` / `handleWheelLeave` (home.tsx) | Retirer `onMouseEnter`/`onMouseLeave` sur `.hero-wheel-stage` |
| 9 | **Compteur +15 000** (s'incrémente) | GSAP | `.count-up` + bloc "Compteurs" | Remplacer `<span className="count-up"...>` par le texte fixe `15 000` |

> _(#8 parallaxe de la roue : supprimée.)_

---

## Section "Comment ça marche"

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 10 | **Titre qui apparaît** | Framer | `FadeInSection` autour du `<h2>` | Retirer le `FadeInSection` |
| 11 | **Cartes : entrée** (slide + scale + cascade, **sans 3D**) | GSAP | bloc "Entrées des cartes étapes" | Supprimer ce bloc (les cartes restent visibles) |
| 12 | **Icônes qui flottent** | GSAP | bloc "Icônes qui flottent" (`.how-step-icon i`) | Retirer `.how-step-icon i` du sélecteur |
| 13 | **Flèches de liaison qui coulent** | GSAP | bloc "Flèches de liaison" (`.how-step-connector i`) | Supprimer ce bloc |
| 14 | **Cartes : survol qui soulève** | CSS | `.how-step-card:hover` | Supprimer la règle `:hover` |

---

## Section "Testez l'expérience en direct" (démo)

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 15 | **Apparition au scroll** (titre, sous-titre, simulateur) | Observer | classes `.reveal .reveal-slide-up` | Retirer ces classes |
| 16 | **Aurora fumée** | (voir #1) | — | — |

---

## Section "Fonctionnalités"

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 17 | **Titre qui apparaît** | Framer | `FadeInSection` autour du `<h2>` | Retirer le `FadeInSection` |
| 18 | **Cartes : entrée 3D** | GSAP | bloc "Entrées musclées des cartes fonctionnalités" | Supprimer ce bloc |
| 19 | **Icônes qui flottent** | GSAP | bloc "Icônes qui flottent" (`.feature-icon i`) | Retirer `.feature-icon i` du sélecteur |
| 20 | **Cartes : survol qui soulève** | CSS | `.feature-card:hover` | Supprimer la règle `:hover` |

---

## Section "Ils nous font confiance" (avis)

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 21 | **Titre qui apparaît** | Observer | `.reveal .reveal-slide-up` | Retirer ces classes |
| 22 | **Carrousel d'avis en boucle infinie** | CSS | `.reviews-track` (animation de défilement) | Supprimer l'`animation:` sur `.reviews-track` |
| 23 | **Aurora fumée** | (voir #1) | — | — |

---

## Section "Des tarifs simples"

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 24 | **Apparition au scroll** (titre, toggle, carte, CTA) | Observer | `.reveal .reveal-slide-up` | Retirer ces classes |
| 25 | **Badge "Offre Unique" qui respire** | GSAP | bloc "Badge offre" (`.featured-ribbon`) | Supprimer ce bloc |
| 26 | **Aurora fumée** | (voir #1) | — | — |

---

## Global / transversal

| # | Nom | Type | Où | Pour retirer |
|---|-----|------|----|--------------|
| 27 | **Séparateurs qui se déploient au scroll** | GSAP | bloc "Séparateurs" (`.section-divider`) | Supprimer ce bloc |
| 28 | **Colonnes du footer en cascade** | GSAP | bloc "Colonnes du footer" | Supprimer ce bloc |
| 30 | **Fondu d'entrée de la page** | Framer | `motion.div className="page-landing"` | Remplacer par une `div` |
| 31 | **Système de reveal générique** | Observer | `useEffect` "Scroll Reveal Observer" + CSS `.reveal` | Retirer les classes `.reveal` voulues |
| 32 | **Lumière qui traverse les lignes de transition** | CSS | `.section-divider::after` + `@keyframes divider-light` | Supprimer la règle `::after` |

> _(#29 parallaxe des titres : supprimée.)_

---

### Note performance
L'aurora ajoute beaucoup d'éléments floutés animés (jusqu'à 6 sections × 4 nappes).
Si tu constates des ralentissements (surtout mobile / vieux PC), les premiers leviers :
- réduire le nombre de nappes (`renderAuroraBg` : passer de 4 à 2 `blob`),
- baisser le `blur(70px)`,
- retirer l'aurora du hero (le plus chargé visuellement).

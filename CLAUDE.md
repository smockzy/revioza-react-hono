# Revioza — Contexte projet complet

## Business

Revioza (revioza.com) est une plateforme SaaS B2B de gamification des avis Google,
ciblant les commerces locaux (restaurants, coiffeurs, etc.).

Le principe : le commerçant affiche un QR code ou une tablette en caisse.
Le client scanne, joue à une roue de la fortune, et est redirigé vers Google Maps
pour laisser un avis en échange d'une récompense (réduction, café offert, etc.).

Objectif : augmenter le volume d'avis Google de manière organique et conforme
aux CGU Google (pas d'achat d'avis, pas de filtrage — tous les avis sont redirigés,
qu'ils soient positifs ou négatifs).

## Modèle économique

Abonnement mensuel par établissement :
- Starter : 49€/mois
- Business : 99€/mois
- Franchise : 199€/mois

Cible actuelle : commerces locaux en général (restaurants, coiffeurs, et autres).
La cible n'est pas restreinte aux restaurants — la variété des commerces est assumée.
Cible prioritaire d'acquisition : établissements avec une note entre 4.0 et 4.4
et moins de 100 avis Google (impact immédiat et visible).

## Récompenses

Le commerçant configure librement ses propres récompenses (pas de liste imposée).
Exemples : réduction, produit offert, café, etc.
Raison : la diversité des types de commerces rend une liste fixe inadaptée.
Cette liberté est un choix produit délibéré, pas un manque de feature.

## Stack technique

- Frontend : React Router v7 (SSR)
- Backend : Hono sur Cloudflare Workers
- Auth : Google OAuth via Supabase — EN COURS, NON FONCTIONNEL
- Base de données : Supabase (Postgres)
- Deploy : GitHub Actions → Cloudflare Pages / Workers
- Domain + DNS : Cloudflare
- Email pro : contact@revioza.com via Spacemail/Spaceship
- Repo : github.com/smockzy/revioza-react-hono
- Branch active : main

## État actuel de l'auth

Google OAuth via Supabase est partiellement configuré mais non finalisé.
Ne pas considérer ce flow comme fonctionnel.
Toute intervention sur l'auth doit partir de zéro ou demander l'état exact des fichiers
concernés avant de proposer des modifications.

## Structure produit

- Page d'accueil : mise en avant du simulateur interactif (démo de la roue)
- /demo : panel admin — configuration de la roue, des récompenses, aperçu QR
- Pages légales : mentions légales, CGU, politique de confidentialité (figées, RGPD)
- Auth Google OAuth : login commerçant via Supabase (non finalisé)

## Contexte opérationnel

- Projet solo, développé principalement via assistant IA
- Stade actuel : MVP fonctionnel en production, auth à finaliser
- Prochaine DA (design system visuel) à tester sur une branche dédiée, jamais sur main

## Règles absolues

1. Ne jamais modifier wrangler.toml sans demande explicite
2. Ne jamais installer de dépendances sans justification argumentée
3. Ne pas créer de nouveaux composants hors de la structure existante
4. Les pages légales sont figées — ne pas régénérer ni reformuler leur contenu
5. Toute modification du flow auth → vérifier la compatibilité avec le middleware Hono
6. Ne jamais expérimenter la DA directement sur main
7. Avant toute intervention sur l'auth, demander les fichiers concernés —
   ne pas supposer leur état actuel
8. À la fin de chaque tâche, toujours rédiger un résumé de ce qui a été fait
   avec la date et l'heure (format `AAAA-MM-JJ HH:MM`), et l'ajouter dans le
   journal de session `memory/journal_sessions.md`. But : permettre à Quentin de
   se repérer entre deux sessions (notamment en cas de crash ou de changement
   d'appareil). Une entrée par tâche, la plus récente en haut.

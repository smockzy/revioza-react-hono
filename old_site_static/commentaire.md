# Cahier des Charges - Suivi d'Avancement des fonctionnalités

Voici l'état d'avancement des fonctionnalités listées dans le cahier des charges initial pour la démonstration de prospection commerciale de **Revioza** :

---

## 🛠️ Infrastructure & Hébergement (Hors-Scope Technique direct)

- `[ ]` **Relier le site à Cloudflare**
  - **Statut** : 🛑 Non réalisable directement via le code source (nécessite des actions sur la console Cloudflare).
  - **Procédure à suivre** : Déclarer le domaine sur Cloudflare, changer les DNS (Nameservers) chez le registrar, et configurer les enregistrements (CNAME/A) pointant vers l'hébergeur.
- `[ ]` **Mettre en place le nom de domaine revioza.com**
  - **Statut** : 🛑 Non réalisable directement via le code (nécessite l'achat/gestion de domaine).
  - **Procédure à suivre** : Acheter le domaine chez un registrar (Hostinger, OVH, etc.), le lier à Cloudflare, et configurer l'hébergement (Vercel ou Netlify).

---

## 📊 Espace Administration des Gérants (merchant.html / merchant.js)

- `[x]` **Estimation du nombre de nouveaux clients gagnés selon le nombre d'avis acquis**
  - **Statut** :  Réalisé & Dynamique. Les statistiques de base s'incrémentent en temps réel lorsqu'un client soumet un avis dans le simulateur.
- `[x]` **Graphique montrant l'évolution sur une semaine, un mois et un an**
  - **Statut** :  Réalisé. Intégration de Chart.js réactive aux boutons de période (Semaine, Mois, Année) et aux nouveaux avis simulés.
- `[x]` **Affichage d'une estimation de l'argent récolté grâce aux nouveaux clients**
  - **Statut** :  Réalisé. Calculé dynamiquement (Avis × Coefficient × Panier moyen) avec un curseur interactif réglable par le gérant.
- `[x]` **Rubrique de tous les retours clients mécontents (avis < 3 étoiles)**
  - **Statut** :  Réalisé. Filtre les retours négatifs saisis dans le simulateur, les affiche dans l'onglet "Retours Privés" avec badge de notification rouge, et permet de répondre par email ou d'archiver.

---

## 🔑 Page d'Accueil & Authentification (index.html / app.js)

- `[x]` **Créer un bouton et une page d'inscription pour les gérants dans l'accueil**
  - **Statut** :  Réalisé. Un bouton "Espace Gérant" ouvre une modale d'inscription/connexion qui enregistre localement la configuration du commerce et redirige vers le dashboard.
- `[x]` **Créer une base de données pour les gérants**
  - **Statut** : 🔄 Simulé localement via le `localStorage`.
  - **Procédure pour version finale** : Connecter un SDK Serverless comme **Supabase** ou **Firebase** pour gérer la persistance partagée de manière centralisée.

---

## ⚙️ Personnalisation de la Roue sur Mobile (merchant.html / merchant.js)

- `[x]` **Interface mobile pour personnaliser la roue (couleurs, images, textes, etc.)**
  - **Statut** :  Réalisé. Formulaire de configuration du nom, du sous-titre, de l'image de couverture, de la couleur principale, et des couleurs individuelles de chaque lot.
- `[x]` **Interface mobile pour configurer le nombre de lots, les prix et les probabilités**
  - **Statut** :  Réalisé. Le gérant peut ajouter/supprimer des lots, régler leur nom, et ajuster leur pourcentage de chance (probabilité rééquilibrée automatiquement sur un total de 100%).

---

## 📱 Démo de Prospection Commerciale (play.html / play.js)

- `[x]` **Partie Client** (Scan QR code → Connexion Google → Triage étoiles → Roulette → Ticket de gain temporaire)
  - **Statut** :  Réalisé. Intègre l'OAuth Google (pop-up GSI sécurisé) et le simulateur de ticket de gain avec minuteur de validité de 2 heures.
- `[x]` **Partie Gérant** (Configuration de la roue, statistiques d'utilisation en direct et QR Code à imprimer)
  - **Statut** :  Réalisé. Lié de manière bidirectionnelle avec la partie client.
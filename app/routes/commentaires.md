
--------------------------------------------------------------------------------------------------
commande à taper dans le terminal de antigravity (en bas) pour mettre à jour le site (2min~) :

git add -A
git commit -m "ta description"
git push origin main

-------------------------------------------------------------------------------------------------


modifier les prix, trop cher pour l'instant, à augmenter plus tard au fil des clients, ou soit mettre 1 seule case prix, mais on met notre prix en gros, + 50% à côté, + 1 mois gratuit

rendre plus jolie la page client quand on teste l'app, adapter aux differents formats d'ecrans.

rendre le fond du site plus vivant.

adapter la disposition des elements sur telephone portable

(POUR PLUS TARD) : faire les conditions générales de vente, les mentions légales, etc.
 
creer **base de données** pour les utilisateurs, les avis, les roues, les lots, les clients, les abonnements, etc.

Connecter un SDK Serverless comme **Supabase** ou **Firebase** pour gérer la persistance partagée de manière centralisée

configurer **google OAUTH** (dans supabase?)



COMMENTAIRE AMINE : 

Sur PC :

- Le même badge fait "AI Slop" -> il faut le retirer/le remplacer par autre chose (appliqué)
- Le texte "Transformez vos clients..." est trop long + certains termes font AI, comme "ambasaddeurs locaux"
- Retirer les mouvements du smartphone (appliqué)
- Agrandir le smartphone pour qu'on puisse mieux interagir avec (quand on est sur PC) (appliqué)
- "+50 établissements nous suivent déjà !" -> "+50 établissements ont améliorés leur visibilité" ou qlqch comme ça (appliqué - mis à jour avec le nombre d'avis collectés)
- "pour transformer chaque repas" ; on ne vises pas que les restaurants, donc fais plus général (appliqué)

Dans la démo interactive :
- La palette de couleur fait changer le style de tout le site -> il faut que ça change seulement le contenu dans le smartphone (appliqué)
- J'ai essayé de mettre une image, ça m'a mis "⚠️ Hébergement échoué. L'image sera visible localement uniquement."²²
- "Générer mon QRCode" -> "Imprimer le QR Code" ne fonctionne pas, la page est blanche
- Il faut également agrandir le téléphone, il est beaucoup trop petit (appliqué)
- Le panneau "Personnalisation en Temps Réel (Admin)" est trop brut, trop chargé, trop compact -> il faut une interface plus "douce" voir une page externe dédiée à la démo


- Les rubriques de la section "Tout ce dont vous avez besoin" font trop AI, on les voit sur tous les sites générés par ia -> trouve un nouveau design, et ajoute des images (c'est ce qui retire l'aspect ia)

- Les avis ont tous la même photo de profil (appliqué - initiales et couleurs de fond diversifiées)
- Les avis sont des noms de particuliers -> tu vises les entreprises, donc il faut mettre des noms d'établissements (fictifs) (appliqué - coiffeur, hôtel, garage, pharmacie, restaurant)
- Essaie de rendre les textes des avis moins parfaits, avec des potentielles fautes pour rendre ça plus crédible


- J'ai cliqué sur "Essayer gratuitement" dans les offres, puis "Connexion" -> "Connexion avec Google", et je suis arrivé sur https://revioza.com/merchant ? c'est pas censé arriver
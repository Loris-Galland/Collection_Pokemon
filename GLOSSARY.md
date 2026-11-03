# Appli de collection Pokémon

Application mobile pour suivre sa collection de cartes Pokémon : ce que l'on possède, ce qui manque dans chaque extension, et ce que vaut la collection.

## Le compte

**Compte** :
Ce qui identifie un utilisateur, avec un e-mail et un mot de passe ou avec Google. Il est demandé pour ajouter un exemplaire ou une envie.
_À éviter_ : profil, utilisateur (pour l'identifiant de connexion)

**Visiteur** :
Une personne sans compte. Elle peut parcourir le catalogue, mais pas collectionner.
_À éviter_ : invité

**A2F** :
L'authentification à deux facteurs d'un compte à mot de passe : un code temporaire de l'application d'authentification, ou un code de secours. L'appli l'affiche sous le nom « validation en deux étapes ».
_À éviter_ : 2FA, MFA

## Le catalogue

**Extension** :
Un ensemble de cartes publié officiellement sous un même nom (ex. « Écarlate et Violet 151 »).
_À éviter_ : set, série, édition

**Carte** :
Une entrée du catalogue, identifiée par son extension et son numéro (ex. 006/165). Une carte existe indépendamment de qui la possède.
_À éviter_ : référence, fiche

**Variante** :
Une version d'impression d'une même carte (normale, holo, reverse holo…).
_À éviter_ : version, finition

**Prix** :
Le prix moyen constaté sur Cardmarket, en euros, pour une carte dans une variante donnée, toutes langues et tous états confondus. C'est un prix indicatif, pas un prix de vente réel.
_À éviter_ : cote, valeur (réservé à la collection)

**Tendance du prix** :
Les moyennes Cardmarket récentes d'une carte dans une variante (sur 30 jours, 7 jours, 1 jour), avec le prix de tendance et le prix le plus bas proposé. Affichée sous forme de petite courbe sur la fiche d'une carte. Ce n'est pas un historique jour par jour.
_À éviter_ : historique, évolution (réservé à la valeur de la collection)

## La collection

**Exemplaire** :
Ce qu'un utilisateur possède d'une même carte dans une variante, une langue et un état donnés, avec la quantité correspondante. Deux Dracaufeu 006/165 holo VF Near Mint forment un seul exemplaire de quantité 2 ; le même en VO est un autre exemplaire.
_À éviter_ : possession, item, carte possédée

**Langue** :
La langue d'impression d'un exemplaire (français, anglais). Elle ne change pas la carte : un Dracaufeu 006/165 en VF et en VO est la même carte.

**État** :
La condition physique d'un exemplaire, sur l'échelle Cardmarket : Mint, Near Mint, Excellent, Good, Light Played, Played, Poor.
_À éviter_ : condition, grade (le grade désigne une note de gradation officielle type PSA, hors périmètre)

**Collection** :
L'ensemble des exemplaires d'un utilisateur.

**Progression** :
Pour une extension, le nombre de cartes distinctes possédées sur le nombre total de cartes, cartes secrètes comprises (ex. 172/207 pour une extension numérotée /165). Elle ne dépasse jamais 100 %. Une carte compte une seule fois, quels que soient la variante, la langue ou le nombre d'exemplaires.
_À éviter_ : complétion, avancement

**Valeur de la collection** :
La somme des prix de tous les exemplaires, multipliés par leur quantité. Contrairement à la progression, chaque exemplaire compte.

**Tendance de la valeur** :
Une estimation : ce que vaudraient les exemplaires possédés aujourd'hui aux moyennes Cardmarket récentes (sur 30, 7 et 1 jour). Elle ne bouge qu'avec les prix, jamais avec les ajouts d'exemplaires, et l'écart affiché compare la moyenne du dernier jour à celle des 7 derniers jours. Ce n'est pas un écart exact sur 24 h.
_À éviter_ : évolution, historique

**Relevé** :
La valeur de la collection d'un utilisateur à une date donnée.
_À éviter_ : snapshot, point

**Évolution** :
La suite des relevés d'un utilisateur, affichée sous forme de courbe.
_À éviter_ : historique, graphique

**Liste d'envies** :
Les cartes qu'un utilisateur veut obtenir. Une carte ajoutée à la collection sort automatiquement de la liste.
_À éviter_ : wishlist, recherches, liste de souhaits

**Envie** :
Une carte de la liste d'envies. Elle porte sur la carte, pas sur une variante ni une langue : posséder la carte, dans n'importe quelle variante, suffit à l'exaucer.

**Classeur** :
La présentation d'une extension sous forme de classeur de 9 cartes par page, les cartes manquantes apparaissant en grisé.
_À éviter_ : album, grille

**Scan** :
L'identification d'une carte en photographiant l'exemplaire avec le téléphone.

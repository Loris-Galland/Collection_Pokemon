---
status: accepted
---

# Better Auth plutôt que Clerk

L'appli doit proposer e-mail et mot de passe, Google et l'A2F, pour un budget de 0 €. Clerk était envisagé, mais son A2F n'existe qu'à partir de l'offre Pro (20 à 25 $/mois) en production, et l'offre gratuite d'Auth0 ne comprend pas non plus les facteurs d'A2F dits « Pro ». On a donc choisi **Better Auth**, une bibliothèque hébergée sur notre serveur Vercel, avec les comptes dans MongoDB Atlas.

## Conséquences

- La sécurité des comptes repose davantage sur nous : secrets, limitation des tentatives, suppression de compte.
- L'envoi d'e-mails (vérification, mot de passe oublié) n'est pas fourni : il faut brancher un expéditeur.
- L'A2F (application d'authentification et codes de secours) ne concerne que les comptes à mot de passe. Pour un compte Google, c'est Google qui protège la connexion.
- Désactiver l'A2F ou supprimer le compte demande aussi un code de l'application, pas seulement le mot de passe. Les codes de secours ne servent qu'à se connecter.
- Tant que les e-mails ne sont pas vérifiés, un compte Google et un compte à mot de passe de même adresse ne sont pas fusionnés : sinon, quelqu'un pourrait créer d'avance le compte d'une autre personne, et passer par Google contournerait l'A2F.

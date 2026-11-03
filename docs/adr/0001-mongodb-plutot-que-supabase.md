---
status: accepted
---

# MongoDB Atlas plutôt que Supabase

Le modèle de données (extension → carte → exemplaire → utilisateur) est relationnel, et Supabase aurait réuni base Postgres, authentification et tâches planifiées en un seul service. On a quand même choisi **MongoDB Atlas (offre gratuite)** : l'offre gratuite de Supabase est limitée à 2 projets actifs par organisation et met un projet en pause après 7 jours d'inactivité. Loris a déjà des projets Supabase et ne veut pas risquer de pause.

## Conséquences

- L'authentification ne vient pas avec la base : voir l'ADR 0002.
- La tâche quotidienne (récupération des prix, enregistrement de la valeur de la collection) passe par un cron Vercel.
- Les liens entre documents (exemplaire → carte, exemplaire → utilisateur) se font par identifiant, sans jointures : l'exemplaire stocke l'identifiant de la carte, pas une copie de ses données.

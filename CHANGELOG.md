# Changelog — Racine multi-utilisateur

## V1.0-multi (fork initial)

Fork expérimental créé à partir de Racine V51.82 (Coach Beurt, mono-utilisateur).
Voir README.md pour le détail complet des changements.

Résumé :
- Ajout du système de profils locaux multi-utilisateur (`scripts/profiles/`).
- Ajout de la mise à l'échelle des charges par profil (`scripts/charge/scaling.js`).
- Ajout de l'agressivité de progression réglable par profil.
- Retrait de la synchronisation GitHub (tout devient local).
- Retrait des modes spéciaux codés en dur "Stéphanie" / "Arnold".
- Correction d'un bug préexistant : appel orphelin à une fonction jamais
  définie (`setupGithubTokenRemovalControl`) en fin de `scripts/app_helpers.js`.
- `data/` repart vide (plus de données personnelles de Bertin dans ce repo).

L'historique détaillé des versions V39 à V51.82 (avant ce fork) reste
disponible dans le repo de production original `Miozza/Coach-Beurt`.

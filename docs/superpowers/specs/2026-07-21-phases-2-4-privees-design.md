# Phases 2 à 4 privées

## Objectif

Rendre privés les trois programmes actuellement présentés sous les sections Phase 2, Phase 3 et Phase 4 dans Gear :

- `hypertrophy_base` — Hypertrophie / Force Base — Phase 2;
- `force_performance` — Force + Résistance musculaire — Phase 3;
- `competition_peak` — Compétition CrossFit Peak — Phase 4.

## Comportement

Seul le champ `visibility` de ces trois entrées du catalogue passe de `public` à `private`. Aucun autre programme ne change de visibilité.

Les clients qui ont déjà l'un de ces programmes comme cycle actif conservent leur accès grâce à la réconciliation existante des permissions au démarrage. Leur semaine, leur historique et leurs charges ne sont pas modifiés. Un nouveau client doit recevoir et accepter une prescription privée pour y accéder.

## Validation

Un test de catalogue doit échouer tant qu'un des trois programmes demeure public, puis réussir après le changement. Les tests existants de migration, de prescription et de régression doivent également rester verts.

## Hors périmètre

Aucun changement d'interface, de contenu d'entraînement ou de mécanisme de prescription n'est prévu.

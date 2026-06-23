# État courant — Racine multi-utilisateur

Version actuelle : V1.6-multi

Statut : prototype viable avec catalogue sportif corrigé + cycle spécialisé strict muscle-up.

Ce fork est maintenant orienté produit multi-profil local. La priorité n'est plus de préserver l'ancien comportement mono-utilisateur à tout prix, mais de garantir qu'un nouveau profil n'hérite pas accidentellement des repères d'un autre utilisateur.

## Décisions actives

- Les données vivantes sont isolées par profil dans `localStorage`.
- `scripts/profiles/reference.js` contient seulement l'ancre de calibration des programmes.
- `PRELOADED_REFS` n'est plus injecté automatiquement dans `state.movementRefs`.
- `freshState()` démarre avec un profil vide et aucune référence de mouvement vivante.
- L'onboarding écrit les charges calculées dans `state.profile`, `athleteState`, `movementRefs` et les ratios dans le registre de profil.
- La sauvegarde est locale : export/import JSON, pas de sync GitHub.

## Validations à lancer avant livraison

```bash
node dev/multi_profile_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/regression_checks.js --full
node dev/structure_checks.js --full
node dev/program_catalog_checks.js
node dev/crossfit_quality_checks.js
node dev/strict_muscle_up_checks.js
```

## Documents de référence

- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `docs/ARCHITECTURE.md`
- `docs/STRUCTURE_CONTRACT.md`
- `docs/UI_CONSTRAINTS.md`
- `docs/DATA_FLOW_CONTRACT.md`
- `docs/CHARGE_CONTEXT.md`
- `docs/CHARGE_ENGINE.md`
- `docs/CHARGE_ENGINE_TESTS.md`
- `docs/CHARGE_PROGRESSION_AUDIT.md`
- `docs/CHARGE_PROGRESSION_CONTRACT.md`
- `docs/ERROR_LOGGING.md`
- `docs/PHASE_2_EXTRACTION_REPORT.md`


## Catalogue client

Cette version ajoute un vrai catalogue de programmes pour propositions futures client : débutant, hypertrophie, force, recomposition, performance hybride, Haltéro CrossFit, Performance RX CrossFit et Préparation Metcon. Les fréquences couvrent 2 à 5 jours selon l'objectif.

Correction sportive : Performance RX CrossFit et Préparation Metcon ne sont plus des squelettes répétitifs. Ils intègrent un benchmark/metcon connu par semaine et varient les mouvements de construction de S1 à S6. Les données utilisateur restent locales; `data/` est inclus comme données applicatives neutres.


## Cycle spécialisé Strict Muscle-Up

Cette version ajoute un seul cycle sérieux de 10 semaines / 4 jours pour construire le strict muscle-up aux anneaux à partir d'environ 10 strict pull-ups. Le cycle inclut tirage strict, false grip, transition, ring dip/support, préhab épaules/coudes, semaines de déload et test final conditionnel.

# Phase 2 — Extraction prudente moteur de charges

## Version

V51.37 — extraction progressive du moteur de charges hors de `app.js`.

## Objectif

Extraire progressivement les fonctions de charge vers `scripts/*` sans changer le comportement visible de Racine.

Règles respectées :

- aucun fichier dans `data/` modifié;
- le ZIP update V51.37 exclut complètement `data/`;
- aucun programme dans `programs/` modifié;
- aucune modification volontaire de la logique de suggestion de charges;
- pas de ES modules;
- pas de build system;
- pas de framework;
- scripts globaux chargés dans `index.html`, comme le reste de l’app.

## Fichiers lus avant intervention

- `ETAT_ACTUEL.md`
- `app.js`
- `index.html`
- `programs/config.js`

## Modules créés

Ordre de chargement ajouté dans `index.html` après `scripts/app_helpers.js` et avant les vues/app :

1. `scripts/charge/equipement.js`
2. `scripts/charge/utilitaires.js`
3. `scripts/charge/mouvements.js`
4. `scripts/charge/historique.js`
5. `scripts/charge/rpe.js`
6. `scripts/charge/suggestion.js`

## Fonctions extraites

### `scripts/charge/equipement.js`

Extrait de `scripts/app_helpers.js`, sans changement fonctionnel :

- `defaultEquipmentLoadRules`
- `effectiveEquipmentLoadRules`
- `normalizeChargeText`
- `equipmentRuleForExercise`
- `roundToStep`
- `roundToAvailableList`
- `roundLoadForExercise`
- `lbForExercise`
- `displayLoadForEquipment`
- `nextLoadForExercise`
- `equipmentStepLabelForExercise`

### `scripts/charge/utilitaires.js`

Extrait de `app.js`, sans changement fonctionnel :

- `chargeKeyFromName`
- `officialCharges`
- `charge`
- `displayChargeText`
- `chargeList`

### `scripts/charge/mouvements.js`

Extrait de `app.js`, sans changement fonctionnel :

- `normalizeExerciseName`
- `coachNormalizeMoveText`
- `coachMovementEquipmentFamily`
- `coachEquipmentCompatibleForAlias`
- `canonicalMovementLabel`
- `athleteMoveId`
- `movementLabelFromKeyOrName`
- `coachMovementLookupLabels`

### `scripts/charge/historique.js`

Extrait de `app.js`, sans changement fonctionnel :

- `ensureAthleteState`
- `epley1RM`
- `estimateLoadForRepsFrom1RM`
- `simpleStrengthIndexFromLoad`
- `athleteMovementRecord`
- `coachDefaultLoadSeedForMovement`
- `latestMovementHistory`
- `coachHistoryLoadNumber`
- `coachHistoryRepsNumber`
- `coachRecentBestControlledLoad`
- `coachMaxJumpForExercise`
- `coachIsFridayContext`
- `coachIsMondayContext`
- `coachLoadStepForExercise`
- `isIsolationMovement`
- `isTechnicalMovement`
- `storeLoadDecisionHint`

### `scripts/charge/rpe.js`

Extrait de `app.js`, sans changement fonctionnel :

- `repRange`
- `repRangeLabel`
- `getRpeAdjustment`
- `checkDeloadAlert`

### `scripts/charge/suggestion.js`

Extrait de `app.js`, sans changement fonctionnel :

- `guardedSuggestedLoadDecision`
- `plannedMapFromSessionExercises`
- `classifyPerformance`
- `enrichSessionResults`
- `updateAthleteStateFromResults`
- `athleteSuggestedLoad`
- `window.coachSafeSuggestedLoad`

## Fonctions laissées dans `app.js`

La phase 2 prudente laisse dans `app.js` les fonctions encore trop liées au rendu, au cycle, au stockage ou à la sync :

- cycle / programmes : `activeProgramId`, `currentDayOrder`, `currentDayMeta`, `focus`, `weekIdx`, `buildCycleStatePayload`, `applyCycleStatePayload`, `suggestLoad`, `referenceBase`, `tmFromProfile`;
- rendu / résultats : `collectSessionExercises`, `renderSessionEntry`, `collectSessionResults`, `updateRefsFromResults`, `rebuildRefsFromHistory`;
- GitHub / données : `buildSessionPayload`, `setupSessionSave`, `autoSyncFromGitHub`, `readSyncStatus`, `writeSyncStatus`;
- UI : timers, WOD, Cycle, Historique, PR, Paramètres.

Raison : ces fonctions dépendent encore fortement de `state`, du DOM ou de l’ordre de rendu. Les extraire maintenant aurait créé plus de risque qu’un gain réel.

## Vérification après chaque module

### `scripts/charge/equipement.js`

- Fonctions globales nécessaires conservées.
- `index.html` charge le module avant `view_session.js` et `app.js`.
- `nextLoadForExercise`, `roundLoadForExercise`, `equipmentRuleForExercise` restent disponibles pour Résultats et Séance.

### `scripts/charge/utilitaires.js`

- Fonctions globales nécessaires conservées.
- Le module est chargé après `data/charges.js` et avant `app.js`.
- Les accès à `customCharges` restent résolus au runtime, car `customCharges` reste global dans `app.js`.

### `scripts/charge/mouvements.js`

- Fonctions globales nécessaires conservées.
- Le module est chargé avant `charge_gestion.js` et `moteur_charges.js`.
- Les accès à `window.movements` / `movements` restent résolus au runtime après chargement de `programs/config.js`.

### `scripts/charge/historique.js`

- Fonctions globales nécessaires conservées.
- Le module est chargé avant `moteur_charges.js`.
- Les accès à `state` restent résolus au runtime; aucune lecture immédiate de `state` au chargement.

### `scripts/charge/rpe.js`

- Fonctions globales nécessaires conservées.
- Le module est chargé avant `app.js`.
- Les accès à `state.rpeHistory` et `movements` restent au runtime.

### `scripts/charge/suggestion.js`

- Fonctions globales nécessaires conservées.
- Le module est chargé avant `app.js`.
- `window.coachSafeSuggestedLoad` reste exposé.
- Les fonctions qui appellent `collectSessionExercises` le font seulement au runtime, après le chargement complet de `app.js`.

## Risques connus

- Les modules restent des scripts globaux. C’est volontaire pour éviter une conversion ES modules.
- Plusieurs fonctions extraites dépendent encore de `state`, `customCharges`, `window.DEFAULT_CHARGES` ou `movements`. C’est acceptable en phase prudente parce que les fonctions ne lisent pas ces dépendances au chargement, mais au moment de l’appel.
- `app.js` contient encore une partie importante du moteur historique/résultats parce que les fonctions sont liées au DOM et à la sauvegarde.

## Tests automatiques réalisés

- `node --check app.js`
- `node --check scripts/*.js`
- `node --check dev/*.js`
- `node --check programs/*.js`
- `node dev/regression_checks.js`
- `node dev/regression_checks.js --update-package`

## Tests manuels à faire

1. Ouvrir DEV et vérifier que l’app démarre sans message d’erreur.
2. Sélectionner `Épaules 3D v2 — Midi dense`.
3. Vérifier une séance vendredi : suggestions de charge visibles et cohérentes.
4. Ouvrir le bouton jaune `!` sur un mouvement avec historique.
5. Remplir Résultats : poids `− valeur +`, reps, RPE.
6. Sauvegarder une séance test locale.
7. Vérifier que l’historique et les références restent cohérents.
8. Vérifier que `data/resultats.json`, `data/athlete_state.json`, `data/cycle_state.json` n’ont pas été remplacés par l’import update.

## Verdict

Extraction réussie pour une première phase prudente. Aucun changement volontaire de comportement. Les fonctions trop fortement couplées à `app.js` sont laissées en place et documentées.

## Mise à jour V51.39 — Nettoyage après extraction

Après audit V51.38, `programs/config.js` contenait encore un vieux patch runtime capable de remplacer des fonctions liées aux charges et à la modale. En V51.39, ce patch est retiré.

Résultat :

- les modules `scripts/*` restent responsables du moteur de charges;
- `scripts/ui_modals.js` reste responsable de la modale `!`;
- `programs/config.js` redevient une configuration statique;
- aucune nouvelle extraction de `app.js` n’a été faite.


# Contrat de structure durable — Racine

## Objectif

Racine ne doit plus grossir par patchs dispersés. Chaque fichier doit avoir une responsabilité claire et servir à l’application, à la validation ou à la documentation stable.

Ce contrat vise à éviter de refaire le même ménage : noms de mouvements, logique de charges dans le mauvais fichier, dossiers temporaires, patchs runtime cachés, fichiers historiques inutiles et marqueurs de version dispersés.

## Consignes pour assistant IA / Codex

Ces règles s’appliquent à toute intervention automatisée ou assistée sur le repo.

- Travailler directement sur le repo GitHub, pas sur une copie locale, sauf demande explicite.
- Ne jamais modifier `data/resultats.json`, `data/athlete_state.json` ou `data/cycle_state.json` sans demande explicite.
- Ne jamais modifier `data/charges.js` sans demande explicite.
- Ne jamais modifier `programs/` sans demande explicite.
- Avant une modification importante, annoncer les fichiers concernés et attendre validation si le périmètre touche une zone protégée.
- Corriger la logique runtime dans `scripts/` quand un domaine existe déjà.
- Pour une correction UI ou séance, relire `docs/UI_CONSTRAINTS.md`.
- Pour une correction charges ou progression, relire `docs/CHARGE_ENGINE.md`, `docs/CHARGE_CONTEXT.md` et `docs/CHARGE_PROGRESSION_CONTRACT.md`.
- Pour une modification de version, appliquer le contrat de version ci-dessous.
- Ne pas créer de dossier ou fichier temporaire si un fichier existant peut porter l’information durablement.

## Structure autorisée

```txt
app.js                  orchestration principale
index.html              structure HTML + ordre explicite de chargement
styles.css              interface visuelle
manifest.json           PWA
service-worker.js       service worker sans cache durable
programs/               programmes d’entraînement seulement
scripts/                code runtime chargé par l’app
data/                   données et bases de charges
dev/                    validations et outils de développement
docs/                   contrats et documentation stable
CHANGELOG.md            seul historique de version
ETAT_ACTUEL.md          état court de référence
README.md               lecture rapide du projet
RELEASE_CHECKLIST.md    procédure de livraison
```

Le dossier `tools/` est interdit. Les fichiers de type `RELEASE_NOTES_V*`, `AUDIT_V*`, `REPORT_V*` ou autre historique versionné sont interdits.

## Contrat de version

Objectif : éviter de modifier vingt fichiers à chaque livraison et éviter les versions contradictoires.

### Fichiers qui portent la version courante

- `app.js` : source runtime avec `APP_VERSION` et l’en-tête court correspondant.
- `index.html` : version visible dans le titre, la topnav, le footer et cache-bust `?v=`.
- `README.md` : version courante seulement, pour lecture rapide.
- `ETAT_ACTUEL.md` : état courant de référence et détails de version.
- `CHANGELOG.md` : historique complet des versions.

### Fichiers qui ne doivent pas porter la version courante

- `scripts/*.js` hors `app.js` : les commentaires d’en-tête décrivent le domaine, pas la version.
- `docs/*.md` hors `CHANGELOG.md`, `README.md` et `ETAT_ACTUEL.md` : les contrats restent stables et non versionnés.
- `manifest.json` : le nom installé reste stable, sans numéro de version.
- `service-worker.js` : le nom de cache reste stable en mode sans cache applicatif durable, sauf rupture technique volontaire.
- `RELEASE_CHECKLIST.md` : procédure stable, pas historique de versions.

Les anciens en-têtes versionnés dans un gros module ne sont pas une source de vérité. Ils ne doivent plus être mis à jour lors d’une incrémentation; ils doivent être supprimés quand le fichier est touché pour une vraie raison.

### Quand incrémenter

- Changement livré visible dans l’app ou correction comportementale : incrémenter le patch affiché (`Vmajor.patch`).
- Refonte structurelle visible ou changement de frontière important, par exemple séparation durable des vues ou nouvelle architecture de navigation : incrémenter la version majeure suivante (`Vmajor+1.00`).
- Documentation seule, contrat, garde-fou CI ou nettoyage sans changement runtime : ne pas incrémenter l’affichage, sauf décision explicite.

À chaque incrémentation, mettre à jour ensemble `app.js`, `index.html`, `README.md`, `ETAT_ACTUEL.md` et `CHANGELOG.md`. Ne pas mettre à jour les en-têtes de modules juste pour suivre la version.

## Rôle de `app.js`

`app.js` reste le chef d’orchestre. Il peut :

- initialiser l’application;
- maintenir le `state` principal;
- brancher les événements;
- coordonner les vues;
- appeler les modules spécialisés.

Il ne devrait plus recevoir de nouvelle logique métier profonde si un domaine clair existe déjà.

## Rôle de `scripts/`

`scripts/` contient le code runtime chargé par `index.html`.

Règle : un problème doit être corrigé dans son domaine.

```txt
charge / progression     scripts/charge/equipement.js, scripts/charge/mouvements.js, scripts/charge/historique.js, scripts/charge/rpe.js, scripts/charge/suggestion.js, scripts/charge/scaling.js
session terrain         scripts/session/view.js, scripts/session/timer.js, scripts/session/results.js, scripts/session/save.js, scripts/session/index.js
profils multi-utilisateur  scripts/profiles/storage.js, scripts/profiles/onboarding.js, scripts/profiles/ui.js
core runtime            scripts/core/logger.js
WOD mobile               scripts/view_wodplus.js
PC / inspection          scripts/view_pc.js
navigation               scripts/app_navigation.js
modales                  scripts/ui_modals.js
TMS                      scripts/tms_session.js
diagnostic UI charges    scripts/charge_diagnostic_ui.js
helpers communs          scripts/app_helpers.js
```

Les domaines `scripts/charge/`, `scripts/session/`, `scripts/core/` et `scripts/profiles/` sont maintenant présents. Le domaine `scripts/sync/` (token GitHub) a été retiré : Racine fonctionne en local uniquement.

## Rôle de `programs/`

`programs/` contient le contenu d’entraînement. Autorisé : cycles, séances, blocs, mouvements, notes de programmation.

Interdit dans `programs/` :

- patch runtime;
- logique de suggestion de charges;
- modale ou rendu UI;
- logique GitHub;
- migration de données;
- correction globale de l’application.

`programs/config.js` doit rester une configuration statique. Il ne doit pas contenir `coachBeurtV5018RuntimePatch`, `smartSuggestedLoad`, `athleteSuggestedLoad`, `loadInfoButtonHtml`, `showLoadInfoModal` ou logique équivalente.

## Rôle de `data/`

`data/` contient les données et bases de charges. Les ZIP `update-files-no-durable-data` ne doivent contenir aucun fichier `data/`.

Fichiers durables protégés :

```txt
data/resultats.json
data/athlete_state.json
data/cycle_state.json
```

`data/charges.js` ne doit pas être modifié sauf demande explicite.

## Rôle de `dev/`

`dev/` contient les validations. Un fichier dev doit être appelé dans `RELEASE_CHECKLIST.md` ou justifié par une documentation stable.

Validations obligatoires :

```bash
node dev/regression_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/structure_checks.js
```

## Rôle de `docs/`

`docs/` contient des contrats stables. Un document doit expliquer une règle durable ou un audit encore utile. Aucun document versionné temporaire ne doit être ajouté.

## Règle des noms de mouvements

Dans `programs/*.js`, le champ `name` doit contenir uniquement le nom réel, stable et distinct du mouvement. Cette règle protège les tutos, l’historique, les charges automatiques, les PR et l’analyse du matériel disponible au gym.

Règles obligatoires :

- Un mouvement = une entrée `name`.
- Aucun `/` dans `name`.
- Aucun `ou` dans `name` pour fusionner deux mouvements.
- Aucun qualificatif de programmation dans `name` : `lourd`, `léger`, `technique`, `facile`, `contrôlé`, `progression`, `rappel`, `WOD`, etc.
- Si deux mouvements sont possibles, ils doivent être écrits comme deux exercices séparés.
- Les variantes, intensités, contraintes de matériel et consignes doivent vivre dans `format`, `load`, `rest`, `note` ou le contexte du bloc.
- Les alias permanents ne doivent pas servir à compenser des noms ambigus. Un ancien historique ambigu peut rester historique, mais les nouveaux programmes doivent utiliser des noms propres.

Autorisé :

```txt
Bench Press
DB Bench
Lateral Raise DB
Lateral Raise câble
Rear Delt Fly DB
Power Clean
Knee Raise
DB Shoulder Press
Landmine Press
Weighted Pull-up
Ring Row
Dead Bug
Hollow Hold
Bike
Row
```

Interdit :

```txt
B1. Hip Thrust
Power Clean technique
Pull-Up progression
Overhead Rope Extension — rappel vendredi
DB Shoulder Press / Landmine Press
Weighted Pull-up / Ring Row lourd
Dead Bug / Hollow Hold
Bike / Row Zone 3
DB RDL ou Barbell RDL
```

Exemple correct lorsque deux options existent :

```js
{name:"DB Shoulder Press", format:"3x10", load:"léger à modéré", rest:"1:15", note:"Press contrôlé."}
{name:"Landmine Press", format:"3x10", load:"léger à modéré", rest:"1:15", note:"Option séparée, pas fusionnée dans le nom."}
```

Exemple interdit :

```js
{name:"DB Shoulder Press / Landmine Press", format:"3x10", load:"léger à modéré", rest:"1:15", note:""}
```

## Règle de communication entre fichiers

Les modules exposent des fonctions. `app.js` orchestre.

Direction souhaitée :

```txt
app.js -> modules spécialisés
modules -> helpers/globaux nécessaires
```

À éviter :

```txt
module A appelle module B qui appelle app.js qui rappelle module A
```

Un module ne doit pas devenir un deuxième `app.js` caché.

## Critère “un fichier sert à quelque chose”

Un fichier est utile s’il remplit au moins une condition :

- chargé par `index.html`;
- utilisé comme programme actif/sélectionnable;
- lu par un script de validation;
- document stable cité dans `README.md`, `ETAT_ACTUEL.md` ou `RELEASE_CHECKLIST.md`;
- donnée durable explicitement protégée;
- asset PWA référencé par `index.html` ou `manifest.json`.

Sinon, il doit être supprimé ou justifié avant livraison.

## Domaine charge

Le moteur de charges doit vivre dans `scripts/charge/`.

Porte d’entrée publique :

```txt
scripts/charge/index.js -> window.CoachCharge
```

Les anciens emplacements directs dans `scripts/` sont interdits :

```txt
scripts/equipement.js
scripts/utilitaires_charges.js
scripts/mouvement.js
scripts/charge_gestion.js
scripts/progression_rpe.js
scripts/moteur_charges.js
```

Le commentaire d’en-tête de `app.js` doit toujours correspondre à `APP_VERSION`.


## Domaine session

La séance terrain doit vivre dans `scripts/session/`.

```txt
scripts/session/index.js -> window.CoachSession
```

Hors `scripts/session/`, les appels doivent passer par `CoachSession.*` quand ils déclenchent l’ouverture de séance, le rendu des résultats ou la sauvegarde session.

Le timer guidé appartient à `scripts/session/timer.js`; le rendu de séance appartient à `scripts/session/view.js`.


## Logger d’erreurs

Le journal d’erreurs runtime vit dans `scripts/core/logger.js` et est documenté dans `docs/ERROR_LOGGING.md`.

Règles :

- `CoachLog` est une API de diagnostic, pas une logique métier.
- Le logger peut être appelé par les domaines, mais aucun domaine ne doit dépendre de lui pour fonctionner.
- Les erreurs sont stockées localement dans `localStorage`, jamais dans `data/`.

# CLAUDE.md — Racine-multi

Instructions permanentes pour tout agent IA travaillant sur ce dépôt.

Ce fichier est le **condensé opérationnel** : les règles à ne jamais casser et les
réflexes attendus. Il ne décrit pas le code en détail — il **renvoie** vers les
contrats qui font autorité :

- `docs/STRUCTURE_CONTRACT.md` — frontières de fichiers, règle de nommage, contrat de version.
- `docs/ARCHITECTURE.md` — carte des vues, domaines et portes publiques (`window.Coach*`).
- `docs/DATA_FLOW_CONTRACT.md` — qui écrit quoi, priorité journal brut vs état dérivé.

En cas de contradiction, ces documents priment sur ce fichier.

---

## 1. Le projet

### Mission — ce qui rend Racine unique

**Le cœur de Racine, c'est son moteur de charges.** C'est lui qui différencie l'app
de tout autre suivi d'entraînement. Objectif de fond, assumé comme difficile :
**suggérer le bon poids, au bon moment, pour n'importe quel athlète** — pas
seulement pour le créateur.

Conséquence pratique pour tout agent :

- Le moteur de charges (`scripts/charge/`) est traité comme le **domaine prioritaire**.
  Avant d'y toucher, lire la section 3.2 **et** les contrats charges listés en § 9.
- Le choix des mouvements et la **progression des poids** sont au même niveau de
  priorité : un bon mouvement mal suivi ne donne pas une bonne progression.
- Toute intervention qui touche les charges se termine par les garde-fous charges
  (§ 6). Aucune exception.

### Nature

Racine est une PWA CrossFit en **JavaScript vanilla** — pas de framework, pas de
build step, pas de bundler. Développée en solo. Version multi-utilisateurs.

- `Miozza/Racine-multi` → **production**
- `Miozza/Coach-Beurt-Dev` → **staging uniquement**

Le code est livré dans Coach-Beurt-Dev, puis répliqué manuellement vers la
production. **Le code est répliqué, jamais les données.**

Ancien nom du projet : Coach-Beurt. Des références résiduelles peuvent subsister.

---

## 2. Règles absolues

### 2.1 Données d'athlètes — stockage local

La source de vérité est le **stockage local du navigateur**. Il n'existe **aucune
copie serveur**. Toute perte est définitive et non récupérable.

Interdictions :

- **Jamais** de `localStorage.clear()`, ni de suppression en masse de clés — y
  compris dans du code de debug, de reset, de démo ou de test.
- **Jamais** de renommage, de ré-indexation ou de changement de format des clés
  de stockage sans plan de migration explicite, écrit et validé au préalable.
- **Jamais** de valeurs factices ou de seed écrites par-dessus des clés existantes.

Exigences :

- Tout changement de schéma des objets persistés requiert : un **numéro de version
  de schéma**, une **migration ascendante** qui préserve les données existantes,
  et une vérification sur un jeu de données réel avant livraison.
- L'**export/import JSON est le seul mécanisme de sauvegarde**. Sa compatibilité
  ascendante ne doit jamais être cassée : un export produit par une version
  antérieure doit rester importable.

### 2.2 Fichiers `data/` — deux natures distinctes

Ne pas les traiter comme un bloc unique. Voir `docs/DATA_FLOW_CONTRACT.md`.

- `data/charges.js` — **config vivante**, chargée par `index.html`
  (`window.DEFAULT_CHARGES` : charges de départ + équipement). Un humain peut
  l'éditer **délibérément** pour changer une charge de base. Le code de l'app ne
  doit **jamais** la réécrire automatiquement lors d'une sauvegarde de séance.
  Elle ne représente pas la capacité réelle de l'athlète.
- `data/resultats.json`, `data/athlete_state.json`, `data/cycle_state.json` —
  dans le dépôt, ce sont des **squelettes vides** ; la vraie donnée vit dans le
  `localStorage`. `cycle_state.json` fige aussi le **schéma de référence**. Le
  danger n'est pas le fichier du dépôt : c'est l'**écrasement** par une version
  peuplée (ZIP, déploiement). Un agent ne pouvant pas savoir si un checkout
  contient un squelette ou des données seedées, la règle opérationnelle reste :
  **ne jamais les modifier ni les inclure dans un ZIP sans demande explicite**.

Les suites `dev/` imposent la présence et la forme de ces quatre fichiers en mode
`--full`. Ne pas casser ce contrat.

### 2.3 Fonctions gelées

Ne jamais modifier sans confirmation explicite et écrite :

- `setActiveWeek()`
- `applyWeekTrackingForWeek()`
- `buildWeekTrackingForWeek()`

Ces trois fonctions centralisent le scoping par semaine. Un bug de `completedDays`
inter-semaines a déjà été corrigé par cette centralisation. Toute retouche
non concertée risque de le réintroduire.

Si une tâche semble exiger de les toucher : **s'arrêter et demander**, proposer
l'approche, ne pas coder.

---

## 3. Architecture (forme générale)

Carte détaillée, domaines et portes publiques : `docs/ARCHITECTURE.md`. Ici,
seulement la forme à garder en tête.

### 3.1 Programmes autonomes modulaires

Chaque programme vit dans `programs/*.js` et est **auto-suffisant**. Contrat :

| Élément | Rôle |
|---|---|
| `getBlocks(day, week)` | Retourne les blocs d'entraînement |
| `getWodText(day, week)` | Texte du metcon |
| `dayMeta` | Étiquettes de séance (nommage agnostique du jour de la semaine) |
| `dayIntentions` | Intention/objectif de chaque journée |
| `cycleRules` | Règles de progression du cycle |

Un nouveau programme = **un nouveau fichier** + une entrée dans `programs/index.js`
+ une balise `<script defer>` dans `index.html` (les scripts restent listés
manuellement pour la stabilité Safari/iPhone ; `programs/index.js` ne charge rien).
Aucune logique de programme ne doit fuir dans le cœur applicatif.

Visibilité des programmes : `profile.programPermissions`. Tout nouveau programme
est **privé** tant qu'il n'est pas publié explicitement.

Noms de mouvements : uniquement le nom réel, stable et distinct. Aucune intention,
intensité ou qualificatif de programmation dans `name` — ça vit dans `format`,
`load`, `rest`, `note`. Voir la règle des noms dans `docs/STRUCTURE_CONTRACT.md`.

#### Recette — ajouter un programme

Écrite parce qu'un agent a dû la redécouvrir en lisant quinze fichiers. Suivre
cette liste évite l'exploration ; les détails font toujours autorité dans les
contrats de § 9.

**Modèle à copier** : `programs/transition_weeks.js` (court, complet, à jour).

**Fichiers à toucher, dans l'ordre :**

1. `programs/<id>.js` — le programme. IIFE, `window.COACH_BERTIN_PROGRAMS.<id> = {…}`.
2. `programs/index.js` — une entrée. Champs obligatoires pour tout programme
   **public** : `objective`, `frequency` (1-6), `suggestedNext` (tableau, peut
   être vide). Sinon `dev/program_catalog_checks.js` refuse.
3. `index.html` — une balise `<script defer>` avec le cache-bust courant.
4. `dev/architecture.json` — une entrée par nouveau fichier, sinon
   `dev/verify-architecture.js` échoue au premier commit.
5. `dev/program_catalog_checks.js` — le compteur de programmes publics. **Ce
   n'est pas de la friction** : c'est le tripwire qui force à décider
   explicitement qu'un programme devient public. Ne pas le rendre automatique.
6. Un `dev/<id>_checks.js` si le programme a des règles propres à protéger, **et
   sa ligne dans `RELEASE_CHECKLIST.md`** (`structure_checks.js` exige que tout
   script `dev/` y soit cité). Viser ~60 lignes : le contrat, pas l'inventaire.
7. Contrat de version § 4 — patch, et les cinq fichiers ensemble.

**Forme d'un bloc** : `{time, title, tag, kind, text}` ou `{…, exercises:[…]}`.
`kind` ∈ `warmup · main · secondary · hypertrophy · accessory · technique · core
· wod · mobility · bonus`. `bonus` est **informatif** : ignoré par la capture de
résultats et par la séance guidée — c'est le support d'une consigne, pas d'une
série. Un exercice = `{name, format, load, rest, note}`.

**Charges** : une charge chiffrée est un **%1RM de l'athlète de référence**
(`scripts/profiles/reference.js` — Back Squat 315, Bench 245, Front Squat 265,
Strict Press 155, Power Clean 205, Hip Thrust 400, Barbell Row 195,
Deadlift 375). `scripts/charge/scaling.js` la ramène au niveau réel de l'athlète.
Ne **jamais** écrire ici une « charge de travail » déjà réduite : la double
réduction rend les poids ridicules. Un mouvement sans repère se déclare dans
`scripts/charge/movement_tuning.js` (`defaultLoadSeeds`), jamais en dur ailleurs.

**Semaine légère / deload / reprise** : deux verrous, à poser volontairement.
`coachIsDeloadWeekOrContext()` lit le libellé et l'objectif de semaine (mots
`deload`, `récupération`, `facile`) ; `coachExtractMovementIntent()` lit la note
de l'exercice (`technique`, `léger`, `facile`). Les deux coupent
l'auto-progression et empêchent le résultat de remplacer une capacité principale.

**Avant de livrer** : `RELEASE_CHECKLIST.md`. Désinstaller `node_modules` avant
`structure_checks.js` — il parcourt tout l'arbre et ne l'exclut pas.

### 3.2 Moteur de suggestion de charges — la symbiose

Domaine **prioritaire** (voir Mission § 1). Regroupé dans `scripts/charge/`, porte
publique unique `window.CoachCharge` (`scripts/charge/index.js`).

Le moteur n'est pas un seul calcul : c'est un **empilement de couches** qui doivent
rester cohérentes entre elles. Ordre logique :

| Couche | Rôle | Fichier(s) |
|---|---|---|
| Math de base | e1RM **Epley** (`epley1RM`), projection entre plages de reps | `scripts/charge/historique.js` |
| Prudence RPE | pas de hausse après RPE ≥ 9, saut max, deload, statut surveillance | `scripts/charge/rpe.js`, `suggestion.js` |
| Contexte / intention | `technique`/`wod`/`light`… ne progressent pas comme un mouvement principal | `scripts/charge/mouvements.js` + `buildContext` |
| Échelle par profil | ratios de test + agressivité, par athlète | `scripts/charge/scaling.js` |
| Apprentissage (Brain) | confiance, précision, profils de mouvement, journal, explication `(!)` | `scripts/charge/brain_*.js`, `movement_profiles.js` |
| Arrondi équipement | tailles réelles du rack (câble/barre/haltère/KB/bande) | **`data/equipment.js`** (`EQUIPMENT_LOAD_RULES`) |

Règles clés :

- **Source de vérité primaire** : `athlete_state` (état dérivé **en mémoire /
  `localStorage`**), reconstructible depuis `resultats`. Les fichiers
  `data/athlete_state.json` / `data/resultats.json` du dépôt sont des **squelettes**
  (§ 2.2) — quand un doc parle d'« athlete_state.json », il désigne ce rôle logique,
  pas un fichier à lire/écrire.
- **Arrondi des charges** : autorité = **`data/equipment.js`** (`EQUIPMENT_LOAD_RULES`),
  **pas** `data/charges.js`. `charges.js` ne fournit que les charges de **départ**
  (`DEFAULT_CHARGES`). ⚠️ `docs/CHARGE_ENGINE.md` dit encore « arrondi via charges.js » —
  c'est **périmé**, se fier au code + `docs/BRAIN.md`.
- **Haltères** : mise à l'échelle **proportionnelle** à partir des ratios de test.
  Ne **pas** appliquer une conversion Epley directe — les échelles absolues sont
  incompatibles.
- Un résultat **WOD ou technique** ne remplace **jamais** automatiquement une capacité
  principale (filtre de contexte obligatoire).
- Le bouton `(!)` **explique** la suggestion ; il ne recalcule jamais une autre charge
  en silence.
- Tout seuil propre à un mouvement (regex de nom, saut max, multiplicateur…)
  va dans `scripts/charge/movement_tuning.js`, jamais en dur dans
  `suggestion.js`/`historique.js` — voir `docs/STRUCTURE_CONTRACT.md` §
  Domaine charge / Règle de tuning par mouvement.

Deux sens du mot **« Brain »**, à ne pas confondre :

- **Brain (livré)** = la couche locale d'apprentissage/explication déjà en place
  (`scripts/charge/brain_stats.js`, `brain_memory.js`, `brain_explain.js`,
  `brain_journal.js`), décrite dans `docs/BRAIN.md`. Elle **apprend déjà** : chaque
  prédiction testée est enregistrée comme réussie, trop ambitieuse ou trop prudente,
  et corrige la suivante. Sa progression se lit avec
  `CoachBrainMemory.precisionTrend()` et `precisionRecent`, pas avec la précision
  à vie (cumulative, donc figée par le volume).
- **Brain.js (différé)** = la bibliothèque ML externe ~100 Ko, **pas encore
  construite**. Ne pas l'implémenter : la décision se prend sur la courbe d'erreur,
  pas sur une date (voir § 8).

Détail persistance : la **sauvegarde est locale uniquement**. Le flux GitHub
(`saveToGitHub`) a été retiré du code ; les mentions résiduelles dans
`docs/DATA_FLOW_CONTRACT.md` et `docs/CHARGE_ENGINE_TESTS.md` sont **périmées**.

### 3.3 Cerveau statistique / Avis IA

- Suivi de confiance, ambition, sensibilité ; profils de mouvements ; Brain Journal ;
  Influence Tracker (détection des overrides manuels).
- L'**Avis IA est strictement consultatif**. Aucune modification automatique de
  charge, jamais. L'athlète décide.

### 3.4 Données et synchronisation

- Pas de module de sync GitHub — retiré délibérément. Racine fonctionne en local.
- Export/import JSON local uniquement.
- Ne pas réintroduire de sync distante sans décision explicite.

### 3.5 Admin

- Panneau admin (vue PC paysage) : accessible via le flag `profile.isAdmin`
  (`CoachProfiles.isActiveAdmin()`). Le profil nommé `Bertin` reçoit ce flag au
  passage de la porte admin.
- Sélecteur de profil protégé par PIN.

---

## 4. Conventions de version

Format `Vmajor.mineur.patch`. Autorité :
`docs/STRUCTURE_CONTRACT.md` § « Contrat de version ».

**La version courante ne se lit pas ici** — elle se lit dans `app.js`
(`APP_VERSION`, seconde ligne du fichier), la seule source que le contrat oblige à
tenir à jour. Ce fichier ne fait pas partie de la liste de mise à jour ci-dessous :
un numéro écrit ici se périmerait en silence et induirait en erreur le prochain
agent, ce qui est déjà arrivé.

| Type de changement | Incrément |
|---|---|
| Changement livré visible ou correction comportementale | patch (+1 sur le dernier chiffre) |
| Refonte structurelle visible / nouvelle architecture | version majeure (`V5.0.0`) |
| Doc seule, contrat, garde-fou CI, nettoyage sans runtime | pas d'incrément (sauf décision explicite) |

À chaque incrémentation, mettre à jour **ensemble** : `app.js` (`APP_VERSION`),
`index.html` (titre, topnav, footer, cache-bust `?v=`), `README.md`,
`ETAT_ACTUEL.md`, `CHANGELOG.md`. Ne pas mettre à jour les en-têtes de modules
juste pour suivre la version. Toujours annoncer la version visée avant de livrer.

---

## 5. Design system

Identité visuelle **établie et voulue** de Racine. C'est le style validé par le
créateur — **ne pas le remplacer sans validation écrite explicite**.

```css
--bg:   #04060f;   /* fond sombre "HUD" */
--blue: #1e90ff;
--cyan: #00d4ff;
```

### Polices — RÈGLE

Le style de police de Racine, c'est ce couple, et rien d'autre par défaut :

- **Orbitron** (`--font-hud`) → toute la typographie « HUD » : titres et eyebrows
  de sections, labels, et les valeurs numériques (charges, reps, RPE, chronos /
  timers). C'est la **signature typographique** de l'app.
- **Inter** (`--font-main`) → contenu et texte courant (paragraphes, descriptions).

### Interdit sans validation écrite

- **Changer la police HUD** (ex. remplacer Orbitron par une autre fonte comme
  Rajdhani, etc.). Orbitron reste la police HUD de Racine.
- **Retirer ou atténuer fortement la texture de scanlines « CRT / Matrix »**
  (`body::before`, rayures sombres tous les 2px) — elle fait partie de l'identité.
- Introduire de **nouvelles polices** ou de **nouvelles couleurs d'accent**.

Des lueurs / profondeurs de fond discrètes (aurore, glow cyan sur les cartes)
sont acceptables tant qu'elles respectent ces règles et ne changent ni les
polices ni la nature « dark HUD » de l'app.

---

## 6. Livraison

- Livraison par ZIP dans le repo staging.
- Le ZIP contient **soit** les fichiers modifiés uniquement, **soit** le codebase
  complet — selon le contexte. Demander si ambigu.
- Traiter les quatre fichiers `data/` selon § 2.2 : ne pas les écraser, ne pas les
  inclure dans un ZIP sans demande explicite.
- Une pipeline GitHub Actions (CI) existe : ne pas casser sa configuration.
- Validations `dev/` à faire passer avant livraison : liste de référence dans
  `RELEASE_CHECKLIST.md` (a minima `node dev/structure_checks.js`,
  `node dev/regression_checks.js`, `node dev/charge_engine_checks.js`,
  `node dev/progression_contract_checks.js`).

---

## 7. Style de collaboration attendu

- Livrer un **jet complet** plutôt que valider élément par élément. Les corrections
  se font sur la version terminée.
- Développement fréquent **depuis un iPhone** : privilégier les changements
  compacts et copiables, éviter les diffs éparpillés sur douze fichiers quand
  trois suffisent.
- Français.
- En cas de doute sur une règle de ce fichier : demander avant d'agir. Ne jamais
  supposer une autorisation.

---

## 8. Roadmap (contexte, pas instruction)

- V2 B2C commercial : Supabase + Stripe.

### Brain.js — un critère, pas une date

L'objectif n'est **pas** d'implanter une couche ML le jour où elle serait parfaite.
C'est que **Brain se trompe de moins en moins**, séance après séance. Ce mécanisme
existe déjà et tourne : `scripts/charge/brain_memory.js` accumule par mouvement +
intention les prédictions testées, réussies, trop ambitieuses, trop prudentes et
les corrections manuelles de l'athlète, et les reverse dans la décision suivante.

Une version antérieure de ce fichier fixait un seuil de « 3–6 mois d'historique »
avant d'implémenter Brain.js (~100 Ko). Ce chiffre a été écrit par un agent, n'était
justifié nulle part dans le dépôt, et décrivait une implantation d'un coup — l'inverse
de l'objectif. Il est remplacé par un critère mesurable :

> **Brain.js n'a de raison d'être que si la courbe d'erreur plafonne trop haut.**
> Si elle continue de descendre, la couche ML n'a pas de travail à faire.

Ce que ça veut dire concrètement :

- La courbe se lit avec `CoachBrainMemory.precisionTrend()` (un point par mois) et
  `precisionRecent` (fenêtre glissante sur les 10 dernières prédictions testées).
  La **précision à vie** ne sert pas à ça : c'est un ratio cumulatif, il se fige
  avec le volume et noie le progrès récent.
- Avant d'envisager Brain.js, il faut **une ligne de base** : la courbe actuelle du
  moteur de règles. Un modèle qui ne la bat pas sur des données qu'il n'a pas vues
  n'apporte rien — avec quelques centaines d'observations et des règles déjà bien
  réglées, c'est le cas le plus fréquent.
- La mesure est **par athlète**. Deux athlètes de régularité différente n'ont pas le
  même jeu de données au même moment ; un délai en mois ne veut donc rien dire.

Reste vrai : **ne pas implémenter Brain.js** tant que ce critère n'est pas examiné
sur des données réelles, et le décider sur la courbe, pas sur le calendrier.

---

## 9. Carte des docs — quand lire quoi

`CLAUDE.md` est le seul fichier lu automatiquement. Les docs ci-dessous ne
comptent que si on les ouvre. Deux natures à ne pas confondre.

### Contrats durables (font autorité — à lire avant d'agir dans le domaine)

| Doc | Lire avant de toucher à… | Autorité sur |
|---|---|---|
| `docs/STRUCTURE_CONTRACT.md` | n'importe quelle frontière de fichier, un nom de mouvement, la version | structure, nommage, version |
| `docs/ARCHITECTURE.md` | une vue, un domaine, une porte `window.Coach*` | carte du code |
| `docs/DATA_FLOW_CONTRACT.md` | sauvegarde, historique, `resultats` vs `athlete_state` | qui écrit quoi |
| `docs/CHARGE_PROGRESSION_CONTRACT.md` | la **progression** des charges | règles de progression |
| `docs/CHARGE_ENGINE.md` + `docs/CHARGE_CONTEXT.md` | le calcul/contexte de suggestion | moteur (voir réserves § 3.2) |
| `docs/BRAIN.md` | Brain : apprentissage, confiance, explication `(!)`, Avis IA | philosophie Brain |
| `docs/UI_CONSTRAINTS.md` | une vue / une séance | contraintes UI |
| `docs/ERROR_LOGGING.md` | le logger `CoachLog` | journal d'erreurs |

**Le moteur de charges est une symbiose de 5 contrats** : `CHARGE_ENGINE`,
`CHARGE_CONTEXT`, `CHARGE_PROGRESSION_CONTRACT`, `BRAIN` et `DATA_FLOW_CONTRACT`.
Les lire ensemble, pas isolément. En cas de désaccord entre eux **ou** avec un doc :
le **code** (`scripts/charge/`, `data/equipment.js`) tranche, puis
`STRUCTURE_CONTRACT.md`.

### Rapports / audits / historique (contexte périssable — jamais « la loi »)

`docs/CHARGE_PROGRESSION_AUDIT.md`, `docs/PHASE_2_EXTRACTION_REPORT.md`,
`docs/DIAGNOSTIC_CHARGES_CLIENT_PWA_IOS.md`, `docs/CHARGE_ENGINE_TESTS.md`,
`docs/CATALOGUE_MATRICE.md`, `docs/IDEES_FUTURES.md`.

Datés (souvent numérotés `V51.x`, un ancien lignage ≠ la version courante `V4.5.x`).
Utiles pour comprendre un choix passé ; ne jamais les traiter comme l'état actuel du
code ni comme une consigne.

# Plafond de progression et calibration du moteur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au moteur de charges ce qui lui manquait — une **asymptote** — puis rendre ses réglages ajustables **par profil**, sans toucher à une seule règle de décision et sans déplacer d'un gramme le comportement existant (golden master identique).

**Architecture:** Deux modules nouveaux, aucun module de décision réécrit. `scripts/charge/ceiling.js` déduit un plafond du comportement de l'athlète et l'applique comme une règle de plus dans la cascade de `guardedSuggestedLoadDecision()` (une ligne, appel défensif). `scripts/charge/tuning_override.js` pose un **calque** de valeurs scalaires sur `window.COACH_MOVEMENT_TUNING` au chargement et à chaque changement de profil ; comme les 23 sites de lecture consultent cette table **à l'exécution**, le moteur voit la calibration sans qu'aucun d'eux ne change. `scripts/profiles/admin_tuning.js` n'est qu'une vue de la table `PARAMS` : elle ne connaît aucun seuil.

**Tech Stack:** JavaScript vanilla global (pas de ES modules, pas de build), `localStorage` namespacé par profil, harnais `dev/` en Node `vm` avec assertions maison.

---

## Le problème

Tous les réglages du moteur portent une **vitesse** de progression :

| Réglage | Ce qu'il gouverne |
|---|---|
| `maxJumpBase` | combien de livres au maximum d'une séance à l'autre |
| `rpeProgression` | combien de crans selon l'effort ressenti |
| `brainGate.damping` | quelle part d'une hausse non confirmée survit |
| `progressionSpeed` | le biais du profil sur l'ambition mesurée |

Aucun ne porte d'**asymptote**. Un mouvement d'isolation joué à RPE bas gagne
donc un cran par séance indéfiniment, alors qu'il plafonne pour de bon bien
avant une barre lourde : un Lateral Raise ne suit pas la même courbe qu'un Back
Squat, et le moteur n'avait aucun moyen de le dire. Ralentir une progression et
la terminer ne sont pas la même opération — amortir toujours plus fort, c'est
approcher l'asymptote sans jamais l'atteindre, et continuer à proposer des
hausses qui ne se réaliseront pas.

## La décision

Le plafond est **déduit du comportement**, jamais déclaré en livres. Un chiffre
écrit dans le code serait le plafond du créateur livré à tous : ce nombre
appartient à l'athlète.

Deux signaux doivent tenir **ensemble**, sur la même fenêtre d'historique :

1. **pointe stable** — la charge maximale n'a pas bougé depuis `minStagnant`
   séances comparables ;
2. **effort élevé** — au moins `minHardRows` séries à ce palier coûtent
   `minRpe` ou plus.

Un seul des deux ne suffit pas, et c'est volontaire :

- pointe stable **sans** effort élevé → ce n'est pas un plafond, c'est un
  programme qui n'a pas encore demandé plus ;
- effort élevé **sans** stagnation → ce n'est pas un plafond, c'est une séance
  dure ; les freins RPE ≥ 8,5 et ≥ 9 s'en occupent déjà.

Corollaire indispensable : **ce qui se déduit d'un comportement se défait quand
le comportement change**. Dès que la dernière série au palier redevient
nettement moins chère (`releaseRpeDrop`), le plafond tombe. Sans cette sortie,
une déduction devient une condamnation.

**Trois familles, trois vitesses de plafonnement.** Une isolation se déclare
plafonnée vite (le cran est petit, la fenêtre utile est courte) ; un mouvement
principal exige beaucoup plus de preuves — s'y tromper coûterait des mois de
progression. La famille est lue par les détecteurs qui existent déjà
(`isIsolationMovement`, `coachIsMainLoadContext`) : **aucune nouvelle regex de
nom de mouvement**, conformément à `docs/STRUCTURE_CONTRACT.md` § Règle de
tuning par mouvement.

Ce que le plafond ne fait **jamais** :

- redescendre sous une charge déjà validée (le plafond vaut la pointe, donc il
  est par construction ≥ la dernière charge réussie) ;
- s'appliquer en contexte limité (technique, WOD, léger) ou en semaine de
  deload : ces chemins ne montent déjà pas seuls, et un plafond affiché à leur
  place volerait l'explication du `(!)` à la vraie raison ;
- décider en silence : la raison affichée dit la charge, le nombre de séances,
  le RPE, et **par où passe la progression maintenant** — les répétitions, le
  tempo, le volume.

## Pourquoi la surcharge par profil existe

`COACH_MOVEMENT_TUNING` était une constante en dur : **un seul jeu de réglages
pour tous les profils**. Un `damping` unique appliqué au Back Squat d'un avancé
et au Lateral Raise d'une débutante est faux par construction — ce ne sont ni
les mêmes gestes, ni les mêmes athlètes, ni les mêmes conséquences en cas
d'erreur.

Le plafond aggrave le problème s'il reste global : `minStagnant` est exactement
le genre de seuil qu'on veut serrer pour un athlète régulier et desserrer pour
quelqu'un qui s'entraîne une semaine sur deux. Livrer une asymptote sans moyen
de la régler par athlète, ce serait remplacer une progression infinie par un
plafond arbitraire.

D'où **23 paramètres scalaires** surchargeables par profil, plus les plafonds
manuels par mouvement, dans un panneau admin (⚙ Réglages → Calibration du
moteur) qui affiche pour chaque champ sa **valeur d'usine** et ses **bornes**,
marque tout écart, et sait tout remettre à l'usine.

## Pourquoi ça ne touche pas le moteur

Les sites de lecture consultent `window.COACH_MOVEMENT_TUNING` **à
l'exécution**, jamais capturé dans une variable au chargement. Vérifiable :

```txt
scripts/charge/suggestion.js:35    var T=window.COACH_MOVEMENT_TUNING||{};
scripts/charge/scaling.js:143      return (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.progressionSpeed) || {…}
scripts/charge/brain_stats.js:229  var G=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.brainGate)||{…}
```

Écrire dans la table vivante suffit donc à changer le comportement du moteur,
sans qu'aucun fichier de décision soit modifié. `dev/tuning_override_checks.js`
épingle cette propriété : si un module se mettait à capturer la table au
chargement, sa copie ne verrait jamais la calibration et le check tombe.

Trois règles de conception protègent ce pouvoir d'écriture :

1. **Scalaires déclarés seulement.** La surcharge n'atteint que les chemins
   listés dans `PARAMS`, tous numériques. Jamais une regex (`/curl/` ressort en
   `{}` après un aller-retour JSON), jamais un tableau (fusionner deux listes
   d'`overrides` n'a pas de sens univoque : remplacer ? concaténer ?
   dédupliquer ?). Un chemin absent de `PARAMS` est ignoré, même présent dans le
   stockage.
2. **Bornes côté app.** Chaque paramètre porte un `min`/`max` vérifié à la
   lecture, à l'écriture et à l'application. Un stockage édité à la main ou un
   futur bug d'UI ne peuvent pas injecter un amortissement de 40 dans le moteur.
3. **Retour à l'usine toujours possible.** Les valeurs d'usine sont capturées au
   chargement, **avant** toute application, et servent de base à chaque
   `apply()` : la surcharge est un calque, jamais une écriture destructrice.

## Pourquoi cette clé de stockage

`racineState::<id>::tuning-override-v1`.

Ce préfixe est celui que balaie `exportProfileBlob()`
(`scripts/profiles/storage.js:319`) et que réécrit `importProfileBlob()` : tout
ce qui vit **sous** la clé d'état d'un profil part avec son export et revient
avec son import. La calibration voyage donc avec le profil **sans une ligne de
code de plus** — c'est déjà comme ça que la mémoire Brain a été rattrapée.

Corollaire à ne jamais oublier : **aucun secret ne doit vivre sous ce préfixe**,
tout y est exporté en clair dans le JSON de sauvegarde.

Le suffixe porte une version de format (`tuning-override-v1`) sur le modèle de
`brain-memory-v1` : changer ce suffixe orphelinerait les calibrations
existantes, une évolution du contenu passe donc par `schema` + migration
ascendante (CLAUDE.md § 2.1).

---

## Global Constraints

- Domaine prioritaire : ce travail touche `scripts/charge/` (CLAUDE.md § 3.2).
  Contrats lus avant d'agir : `CHARGE_ENGINE`, `CHARGE_CONTEXT`,
  `CHARGE_PROGRESSION_CONTRACT`, `BRAIN`, `DATA_FLOW_CONTRACT`.
- Transparence obligatoire : `dev/charge_suggestion_golden_master.js` doit
  rester **identique** sur ses 20 scénarios, y compris une fois les deux
  nouveaux modules chargés. Aucun de ces scénarios ne doit déclencher un
  plafond — s'il en déclenchait un, ce serait la preuve que les seuils sont
  trop bas.
- Ne jamais toucher `setActiveWeek()`, `applyWeekTrackingForWeek()`,
  `buildWeekTrackingForWeek()`.
- Aucun fichier `data/` modifié, ni inclus dans une livraison.
- Aucun seuil en dur hors `movement_tuning.js` ; aucune nouvelle regex de nom de
  mouvement dans `suggestion.js` / `historique.js`.
- Tout nouveau fichier runtime : balise `<script defer>` dans `index.html` avec
  cache-bust, entrée dans `dev/architecture.json`, et ajout au `loadOrder` des
  harnais `dev/` qui chargent le moteur.
- Tout nouveau script `dev/` : cité dans `RELEASE_CHECKLIST.md` (c'est ce qui
  l'ajoute à la CI).

---

### Task 1: Le plafond déduit

**Files:**
- Create: `scripts/charge/ceiling.js`
- Modify: `scripts/charge/movement_tuning.js` (bloc `ceiling`)
- Modify: `scripts/charge/suggestion.js` (une ligne dans la cascade)

**Interfaces:**
- Produces: `coachCeilingForMovement(label, history, context)`,
  `coachDeduceCeiling()`, `coachCeilingManualLoad()`, `coachRuleCeilingCap(ctx)`,
  porte `window.CoachCeiling`.
- Consumes: `isIsolationMovement()`, `coachIsMainLoadContext()`,
  `coachHistoryHasValidLoad()`, `coachHistoryLoadNumber()`,
  `coachHistoryRpeNumber()`.

- [x] **Step 1: Poser la configuration par famille dans `movement_tuning.js`** —
  `window`, `plateauTolerance`, `releaseRpeDrop`, trois familles
  (`isolation`/`accessory`/`main`) et une table `manual` **vide** : aucun plafond
  n'est livré en dur.
- [x] **Step 2: Écrire la déduction** — pointe sur la fenêtre, comptage des
  séances depuis la première atteinte du palier, comptage des séries chères au
  palier, sortie de plafond. Retourne `null` tant que les deux signaux ne
  tiennent pas : « je ne sais pas » est la réponse par défaut.
- [x] **Step 3: Brancher la règle dans la cascade** — après
  `coachRuleFloorValidation` (le plancher garde son dernier mot) et avant les
  caps de surveillance / deload, en appel défensif
  (`if(typeof coachRuleCeilingCap==='function')`) pour qu'un chargement partiel
  ne casse jamais la séance.
- [x] **Step 4: Vérifier la transparence** — golden master identique sur 20
  scénarios avec `ceiling.js` chargé.

### Task 2: La surcharge de tuning par profil

**Files:**
- Create: `scripts/charge/tuning_override.js`
- Modify: `scripts/profiles/storage.js` (une ligne dans `setActive()`)
- Modify: `scripts/charge/index.js` (porte publique)

**Interfaces:**
- Produces: `window.CoachTuningOverride` — `PARAMS`, `factory()`,
  `factoryValue()`, `value()`, `isChanged()`, `isActive()`, `set()`, `clear()`,
  `ceilings()`, `setCeiling()`, `removeCeiling()`, `reset()`, `apply()`,
  `storageKey()`.

- [x] **Step 1: Déclarer les 23 paramètres** — chemin, groupe, libellé, bornes,
  pas. Rien qui ne soit un scalaire.
- [x] **Step 2: Capturer les valeurs d'usine au chargement**, avant toute
  application.
- [x] **Step 3: Lire / écrire / appliquer** avec bornes aux trois étages, en
  ignorant tout chemin non déclaré.
- [x] **Step 4: Réappliquer au changement de profil** — sans cette ligne dans
  `setActive()`, un client hériterait de la calibration de l'admin jusqu'au
  prochain rechargement.

### Task 3: Le panneau admin

**Files:**
- Create: `scripts/profiles/admin_tuning.js`
- Modify: `index.html` (panneau `#adminTuningPanel`, balises de script)
- Modify: `app.js` (point de montage dans `renderSettings()`)
- Modify: `styles.css` (classes `.tuning-*`)

- [x] **Step 1: Rendre la table `PARAMS`, pas une liste de champs écrite à la
  main** — ajouter un paramètre surchargeable ne doit se faire qu'à un seul
  endroit.
- [x] **Step 2: Afficher usine + bornes sous chaque champ, marquer tout écart,
  et un bandeau quand la calibration est active sur le profil.**
- [x] **Step 3: Plafonds manuels** — nom canonique obligatoire (le moteur
  compare des noms normalisés, pas des approximations), charge bornée.
- [x] **Step 4: CSS** — Orbitron pour les valeurs, Inter pour la phrase, cyan
  pour le chiffré, liseré bleu pour l'écart à l'usine ; cibles tactiles ≥ 38 px.

### Task 4: Les garde-fous

**Files:**
- Create: `dev/ceiling_checks.js`, `dev/tuning_override_checks.js`
- Modify: `dev/charge_suggestion_golden_master.js` (`loadOrder`),
  `RELEASE_CHECKLIST.md`, `dev/architecture.json`

- [x] **Step 1: Épingler le contrat, pas les chiffres** — les assertions lisent
  les seuils dans la table ; elles survivent donc à un réglage sans être
  réécrites (`docs/STRUCTURE_CONTRACT.md` § Ce qu'une assertion doit épingler).
- [x] **Step 2: Vérifier chaque paramètre un par un** — chemin vivant et
  numérique, bornes encadrant l'usine, clamp haut et bas, refus du non-numérique,
  retour exact à l'usine, référence d'usine intacte.
- [x] **Step 3: Muter le code et vérifier que les checks tombent** — un test qui
  ne peut pas échouer ne protège rien. Sept mutations sur `ceiling.js` (signal
  d'effort, stagnation, sortie de plafond, gardes de contexte, sens du plafond,
  plafond manuel, fenêtre) et sept sur `tuning_override.js`.

### Task 5: Version et documentation

- [x] **Step 1: V4.6.0** — `app.js`, `index.html`, `README.md`,
  `ETAT_ACTUEL.md`, `CHANGELOG.md` ensemble.
- [x] **Step 2: `docs/STRUCTURE_CONTRACT.md`** — section Domaine charge :
  plafond et calibration, avec les risques et leur mitigation.
- [x] **Step 3: Checklist complète verte**, `dev/architecture.json` à jour.

---

## Risques et mitigations

Repris de `docs/STRUCTURE_CONTRACT.md` § Domaine charge — Plafond de progression
et calibration par profil, qui fait autorité.

| Risque | Ce qui peut arriver | Mitigation |
|---|---|---|
| **Regex non sérialisables** | Stocker `isolationPatterns` en JSON rendrait `[{},{},…]` au retour : le moteur perdrait toute détection d'isolation | Seuls les chemins scalaires de `PARAMS` sont surchargeables ; un chemin non déclaré est ignoré à la lecture comme à l'écriture |
| **Fusion de tableaux** | `maxJumpBase.overrides` surchargé : remplacer, concaténer ou dédupliquer ? Trois réponses défendables, donc aucune | Aucun tableau n'est surchargeable. Un cas par mouvement se déclare dans `movement_tuning.js`, ou se pose comme plafond manuel |
| **Valeur aberrante** | Un `damping` à 40 ou un multiplicateur de deload négatif entrerait dans le moteur | Bornes `min`/`max` par paramètre, vérifiées à la lecture, à l'écriture et à l'application |
| **Changement de profil** | Le moteur garderait en mémoire la calibration du profil précédent : un client hériterait de celle de l'admin | `apply()` rappelé dans `CoachProfiles.setActive()` |
| **Chargement partiel** | `ceiling.js` absent (cache PWA à moitié rafraîchi) casserait la cascade de suggestion | Appel défensif `if(typeof coachRuleCeilingCap==='function')` : sans le module, le moteur retrouve exactement son comportement d'avant |
| **Divergence entre profils** | Deux athlètes avec des seuils différents rendent un rapport de bug ambigu | Le bandeau du panneau nomme le profil calibré ; la calibration part avec l'export du profil, donc un export reproduit le comportement observé |
| **Plafond trop bas** | Un mouvement figé sous son vrai potentiel | Sortie de plafond automatique (`releaseRpeDrop`), plafond jamais appliqué en contexte limité ou deload, et jamais sous une charge déjà validée |

## Ce qui reste ouvert

- **Granularité.** Le plafond se règle par **famille**, pas par mouvement. Un
  Lateral Raise câble et un Rear Delt Fly partagent aujourd'hui les mêmes seuils
  alors qu'ils ne plafonnent probablement pas au même rythme. Le passage au
  mouvement demanderait une clé de stockage par mouvement — à décider sur des
  données réelles, pas par principe.
- **Calibration automatique.** Rien ne mesure aujourd'hui si une calibration est
  *meilleure* que l'usine. Il faudrait une fonction de coût (erreur de
  prédiction par mouvement, lisible via `CoachBrainMemory.precisionTrend()`) et
  une comparaison sur des données que le réglage n'a pas vues. C'est le même
  critère que Brain.js (CLAUDE.md § 8) : régler sur la courbe d'erreur, jamais
  sur une intuition.
- **Valeur initiale d'un profil neuf.** Un profil neuf part à l'usine, donc aux
  seuils calibrés sur le créateur. Une valeur de départ fonction du niveau
  déclaré serait défendable — mais elle inventerait une vitesse de plafonnement
  avant la première séance. Laissé ouvert volontairement.

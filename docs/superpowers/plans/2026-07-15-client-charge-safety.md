# Client Charge Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sécuriser les suggestions de charge client et remplacer uniquement le second tirage vertical d’Arnold Split Strict par un Lat Pulldown prise large distinct du Weighted Pull-up.

**Architecture:** Conserver CoachCharge comme point central de décision. Ajouter de petits helpers globaux dans les modules de charge existants, faire ignorer les lignes non performantes ou invraisemblables sans détruire l’historique, et uniformiser le format final avant exposition aux vues. Le mouvement Lat Pulldown reçoit une identité propre sans modifier Weighted Pull-up.

**Tech Stack:** JavaScript vanilla global, Node.js `vm` pour les contrôles `dev/`, GitHub Contents API pour la branche distante.

## Global Constraints

- Ne modifier aucun fichier JSON dans `data/`.
- Ne pas modifier `data/charges.js`.
- Ne pas rendre Brain plus agressif.
- Ne jamais transformer `manual_charge_override` en performance réelle.
- Garder les changements chirurgicaux et compatibles multi-profil.
- Weighted Pull-up et Lat Pulldown restent deux mouvements distincts.

---

### Task 1: Arnold Split Strict et identité Lat Pulldown

**Files:**
- Modify: `programs/arnold_split_strict.js:25-32`
- Modify: `programs/config.js:9-28`
- Modify: `programs/tutorials.js:185-191`
- Modify: `scripts/charge/movement_profiles.js:8-118`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Consumes: `window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getBlocks(day, week)` et `CoachMovementProfiles.get(name)`.
- Produces: une entrée de configuration distincte `latPulldownWide`, un exercice nommé exactement `Lat Pulldown`, un tutoriel exact et un profil Brain câble.

- [ ] **Step 1: Écrire le test en échec**

```js
const monday = ctx.window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getBlocks('lundi', 1);
const main = monday.find(b => b.title === 'A. Pecs + Dos A');
const names = main.exercises.map(e => e.name);
assert(names.filter(n => n === 'Pull-Up').length === 1, 'Pecs + Dos A garde un seul Pull-Up.');
assert(names.includes('Lat Pulldown'), 'Pecs + Dos A contient Lat Pulldown.');
assert(!names.includes('Weighted Pull-up'), 'Pecs + Dos A ne contient plus Weighted Pull-up.');
const lat = main.exercises.find(e => e.name === 'Lat Pulldown');
assert(/prise large/i.test(lat.note), 'Lat Pulldown précise la prise large.');
assert(/Weighted pull-up/.test(configSource) && /Lat Pulldown/.test(configSource), 'Les deux mouvements restent enregistrés.');
assert(tutorials['Lat Pulldown'], 'Lat Pulldown possède un tutoriel exact.');
assert(profiles.get('Lat Pulldown').family === 'cable_pull', 'Lat Pulldown utilise le profil câble.');
```

- [ ] **Step 2: Lancer le test et vérifier l’échec attendu**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL sur l’absence de `Lat Pulldown` dans Arnold Split Strict.

- [ ] **Step 3: Implémenter le mouvement distinct minimal**

```js
// programs/config.js — conserver l’entrée actuelle Weighted Pull-up
latPulldown:     {name:"Weighted pull-up", profile:null},
latPulldownWide: {name:"Lat Pulldown",     profile:null},

// programs/arnold_split_strict.js — seulement Pecs + Dos A
ex("Lat Pulldown","4×10-12","140 lb","60-90 sec","Prise large, tire les coudes vers le bas et garde le torse stable."),
```

Ajouter dans `programs/tutorials.js` une entrée exacte `Lat Pulldown` et, avant le profil poids du corps dans `movement_profiles.js`, un profil `match:/lat\s*pull\s*down/i` avec `family:'cable_pull'`, `sensitivity:'low'` et `progressionStyle:'reps_first'`.

- [ ] **Step 4: Relancer le test dédié**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS pour le bloc Arnold, les deux entrées et le profil câble.

### Task 2: Blocage explicite des profils clients non calibrés

**Files:**
- Modify: `scripts/charge/scaling.js:9-52`
- Modify: `scripts/charge/suggestion.js:96-135`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Produces: `coachProfileNeedsCalibration(): boolean` et un texte de blocage central.

- [ ] **Step 1: Ajouter le test en échec**

```js
ctx.state.profile = {onboarded:false, scaleRatios:null};
const blocked = ctx.guardedSuggestedLoadDecision('Back Squat', '165 lb', 8, {});
assert(blocked.blocked === true, 'Profil client non calibré bloqué.');
assert(blocked.loadNum === null && !/\d+\s*lb/.test(blocked.loadText), 'Aucune charge numérique fiable affichée.');
assert(/Profil non calibré/.test(blocked.loadText), 'Avertissement explicite affiché.');
ctx.state.profile = null;
assert(ctx.coachProfileNeedsCalibration() === false, 'Migration sans profil reste compatible.');
```

- [ ] **Step 2: Vérifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL car `coachProfileNeedsCalibration` ou `blocked` n’existe pas.

- [ ] **Step 3: Implémenter la garde centrale**

```js
function coachProfileNeedsCalibration(){
  var profile = (typeof state !== 'undefined' && state) ? state.profile : null;
  if(!profile) return false;
  return !profile.onboarded || !profile.scaleRatios;
}
```

Au début de `guardedSuggestedLoadDecision`, retourner `{label,loadNum:null,loadText:'Profil non calibré : complète la calibration avant d’utiliser les charges suggérées.',blocked:true,severity:'watch',reason:'Profil client sans calibration.'}`.

- [ ] **Step 4: Vérifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS pour le profil non calibré et la migration sans profil.

### Task 3: Filtre de vraisemblance scalé et non destructif

**Files:**
- Modify: `scripts/charge/suggestion.js:106-121`
- Modify: `scripts/charge/utilitaires.js:35-85`
- Modify: `scripts/charge/historique.js:180-210`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Produces: `coachIsImplausibleLoadRow(row): boolean` et les champs conservés `implausible`, `implausibleReason`.

- [ ] **Step 1: Ajouter les scénarios RED**

```js
ctx.state.profile = {onboarded:true, scaleRatios:{_upperPush:0.2,_overall:0.2}};
// 10 lb DB Shoulder Press doit rester plausible après scaling.
// 5 lb face à un seed scalé encore très élevé doit être marqué et ignoré, jamais supprimé.
assert(lightRow.load === 10 && !lightRow.implausible, 'Charge réelle légère conservée.');
assert(badRow.load === 5 && badRow.implausible, 'Erreur conservée et marquée.');
assert(badRef.load === 5 && badRef.implausible, 'Référence conservée et marquée.');
```

- [ ] **Step 2: Vérifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL car le sanitizer supprime encore `load` ou la référence.

- [ ] **Step 3: Implémenter le seed scalé et le marquage**

```js
var rawSeedForFilter = coachDefaultLoadSeedForMovement(label, target);
var genericSeedForFilter = (rawSeedForFilter || rawSeedForFilter === 0)
  ? coachApplyUserLoadScale(label, rawSeedForFilter)
  : rawSeedForFilter;
```

Remplacer les `delete` du sanitizer par `implausible=true` et `implausibleReason`, conserver les valeurs, puis exclure ces lignes dans les filtres de progression.

- [ ] **Step 4: Vérifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS, valeurs conservées et données marquées ignorées.

### Task 4: Exclure les seeds non performants et neutraliser les overrides au reset

**Files:**
- Modify: `scripts/charge/historique.js`
- Modify: `scripts/charge/suggestion.js:96-121, 538-546`
- Modify: `scripts/charge/brain_stats.js:135-150`
- Modify: `app.js:1936-1998`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Produces: `coachIsNonPerformanceSeed(row): boolean` et `resetManualChargeOverridesFromAthleteState()`.

- [ ] **Step 1: Ajouter les tests RED**

Créer une vraie ligne à `100 lb` puis un `manual_charge_override` à `200 lb`; vérifier que la décision reste fondée sur `100 lb`. Appeler le helper de reset et vérifier que seule la ligne override disparaît et que la vraie séance reste.

- [ ] **Step 2: Vérifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL car l’override pilote encore l’historique ou reste après reset.

- [ ] **Step 3: Implémenter le helper partagé**

```js
function coachIsNonPerformanceSeed(r){
  var src = r && r.planned && r.planned.source;
  return src === 'manual_recalibration' || src === 'manual_charge_override';
}
```

Utiliser le helper dans `coachFilterHistoryForProgression`, `guardedSuggestedLoadDecision`, `coachSafeSuggestedLoad` et `coachBrainBuildStats`. Au reset, filtrer uniquement les lignes `manual_charge_override` et recalculer/neutraliser les capacités qui portent la même source.

- [ ] **Step 4: Vérifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS, vraie séance conservée, override exclu et neutralisé.

### Task 5: Format final unique des charges

**Files:**
- Modify: `scripts/charge/suggestion.js:506-772`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Produces: `coachFormatSuggestedLoad(label, value, fallbackText, suffix): string`.

- [ ] **Step 1: Ajouter les tests RED**

```js
assert(/lb \/ main/.test(dbProgression), 'Progression DB garde / main.');
assert(/lb \/ main/.test(dbDeload), 'Deload DB garde / main.');
assert(!/^\d+(\.\d+)?$/.test(dbDeload), 'Aucune sortie numérique nue.');
assert(/× 11 reps/.test(repsOutput), 'Suffixe de reps préservé.');
```

- [ ] **Step 2: Vérifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL sur les retours `String(newLoad)` ou `String(deloadRounded)`.

- [ ] **Step 3: Implémenter et utiliser le formatteur**

```js
function coachFormatSuggestedLoad(label,value,fallbackText,suffix){
  if(!(value || value === 0)) return fallbackText || '—';
  var text = displayLoadForEquipment(label,String(value)+' lb');
  if(suffix) text += suffix;
  return text;
}
```

Faire passer toutes les sorties finales et tous les hints numériques de `guardedSuggestedLoadDecision` et `coachSafeSuggestedLoad` par ce helper.

- [ ] **Step 4: Vérifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS pour progression, deload et reps DB.

### Task 6: Périodisation client, chemin legacy et validation complète

**Files:**
- Modify: `dev/client_charge_safety_checks.js`
- Modify only if required: `programs/workouts.js`

**Interfaces:**
- Consumes: `client_hypertrophy_5d.getBlocks()` et `CoachCharge.suggestLoad()`.

- [ ] **Step 1: Ajouter le test E2E client**

Charger le vrai programme et comparer S1/S5 pour Back Squat, Barbell Row et Bench Press. Vérifier statiquement que `ex()` dans `racine_client_programs.js` ne contient pas `charge(`.

- [ ] **Step 2: Vérifier le chemin legacy**

Run: `rg -n "progress\s*:" programs`
Expected: seules les configurations legacy et les tableaux vides sont trouvés; si aucun programme client réel ne l’utilise, ne pas modifier `programs/workouts.js` et conserver le risque dans la PR.

- [ ] **Step 3: Lancer toutes les validations disponibles**

```powershell
node dev/client_charge_safety_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/simulate_users.js
node dev/simulate_multi_users.js
node dev/prescription_checks.js
node dev/crossfit_quality_checks.js
node dev/multi_profile_checks.js
node dev/program_catalog_checks.js
```

Expected: tous les fichiers existants passent; signaler précisément les fichiers absents et les échecs non liés.

- [ ] **Step 4: Vérifier les données protégées et publier**

Confirmer qu’aucun des quatre fichiers protégés n’est dans le diff. Créer des commits ciblés sur `fix/client-charge-safety-before-distribution`, puis ouvrir une PR draft vers `main` avec résumé, tests et risque legacy `b.progress`.


# Client Charge Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SÃ©curiser les suggestions de charge client et remplacer uniquement le second tirage vertical dâ€™Arnold Split Strict par un Lat Pulldown prise large distinct du Weighted Pull-up.

**Architecture:** Conserver CoachCharge comme point central de dÃ©cision. Ajouter de petits helpers globaux dans les modules de charge existants, faire ignorer les lignes non performantes ou invraisemblables sans dÃ©truire lâ€™historique, et uniformiser le format final avant exposition aux vues. Le mouvement Lat Pulldown reÃ§oit une identitÃ© propre sans modifier Weighted Pull-up.

**Tech Stack:** JavaScript vanilla global, Node.js `vm` pour les contrÃ´les `dev/`, GitHub Contents API pour la branche distante.

## Global Constraints

- Ne modifier aucun fichier JSON dans `data/`.
- Ne pas modifier `data/charges.js`.
- Ne pas rendre Brain plus agressif.
- Ne jamais transformer `manual_charge_override` en performance rÃ©elle.
- Garder les changements chirurgicaux et compatibles multi-profil.
- Weighted Pull-up et Lat Pulldown restent deux mouvements distincts.

---

### Task 1: Arnold Split Strict et identitÃ© Lat Pulldown

**Files:**
- Modify: `programs/arnold_split_strict.js:25-32`
- Modify: `programs/config.js:9-28`
- Modify: `programs/tutorials.js:185-191`
- Modify: `scripts/charge/movement_profiles.js:8-118`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Consumes: `window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getBlocks(day, week)` et `CoachMovementProfiles.get(name)`.
- Produces: une entrÃ©e de configuration distincte `latPulldownWide`, un exercice nommÃ© exactement `Lat Pulldown`, un tutoriel exact et un profil Brain cÃ¢ble.

- [ ] **Step 1: Ã‰crire le test en Ã©chec**

```js
const monday = ctx.window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getBlocks('lundi', 1);
const main = monday.find(b => b.title === 'A. Pecs + Dos A');
const names = main.exercises.map(e => e.name);
assert(names.filter(n => n === 'Pull-Up').length === 1, 'Pecs + Dos A garde un seul Pull-Up.');
assert(names.includes('Lat Pulldown'), 'Pecs + Dos A contient Lat Pulldown.');
assert(!names.includes('Weighted Pull-up'), 'Pecs + Dos A ne contient plus Weighted Pull-up.');
const lat = main.exercises.find(e => e.name === 'Lat Pulldown');
assert(/prise large/i.test(lat.note), 'Lat Pulldown prÃ©cise la prise large.');
assert(/Weighted pull-up/.test(configSource) && /Lat Pulldown/.test(configSource), 'Les deux mouvements restent enregistrÃ©s.');
assert(tutorials['Lat Pulldown'], 'Lat Pulldown possÃ¨de un tutoriel exact.');
assert(profiles.get('Lat Pulldown').family === 'cable_pull', 'Lat Pulldown utilise le profil cÃ¢ble.');
```

- [ ] **Step 2: Lancer le test et vÃ©rifier lâ€™Ã©chec attendu**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL sur lâ€™absence de `Lat Pulldown` dans Arnold Split Strict.

- [ ] **Step 3: ImplÃ©menter le mouvement distinct minimal**

```js
// programs/config.js â€” conserver lâ€™entrÃ©e actuelle Weighted Pull-up
latPulldown:     {name:"Weighted pull-up", profile:null},
latPulldownWide: {name:"Lat Pulldown",     profile:null},

// programs/arnold_split_strict.js â€” seulement Pecs + Dos A
ex("Lat Pulldown","4Ã—10-12","140 lb","60-90 sec","Prise large, tire les coudes vers le bas et garde le torse stable."),
```

Ajouter dans `programs/tutorials.js` une entrÃ©e exacte `Lat Pulldown` et, avant le profil poids du corps dans `movement_profiles.js`, un profil `match:/lat\s*pull\s*down/i` avec `family:'cable_pull'`, `sensitivity:'low'` et `progressionStyle:'reps_first'`.

- [ ] **Step 4: Relancer le test dÃ©diÃ©**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS pour le bloc Arnold, les deux entrÃ©es et le profil cÃ¢ble.

### Task 2: Blocage explicite des profils clients non calibrÃ©s

**Files:**
- Modify: `scripts/charge/scaling.js:9-52`
- Modify: `scripts/charge/suggestion.js:96-135`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Produces: `coachProfileNeedsCalibration(): boolean` et un texte de blocage central.

- [ ] **Step 1: Ajouter le test en Ã©chec**

```js
ctx.state.profile = {onboarded:false, scaleRatios:null};
const blocked = ctx.guardedSuggestedLoadDecision('Back Squat', '165 lb', 8, {});
assert(blocked.blocked === true, 'Profil client non calibrÃ© bloquÃ©.');
assert(blocked.loadNum === null && !/\d+\s*lb/.test(blocked.loadText), 'Aucune charge numÃ©rique fiable affichÃ©e.');
assert(/Profil non calibrÃ©/.test(blocked.loadText), 'Avertissement explicite affichÃ©.');
ctx.state.profile = null;
assert(ctx.coachProfileNeedsCalibration() === false, 'Migration sans profil reste compatible.');
```

- [ ] **Step 2: VÃ©rifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL car `coachProfileNeedsCalibration` ou `blocked` nâ€™existe pas.

- [ ] **Step 3: ImplÃ©menter la garde centrale**

```js
function coachProfileNeedsCalibration(){
  var profile = (typeof state !== 'undefined' && state) ? state.profile : null;
  if(!profile) return false;
  return !profile.onboarded || !profile.scaleRatios;
}
```

Au dÃ©but de `guardedSuggestedLoadDecision`, retourner `{label,loadNum:null,loadText:'Profil non calibrÃ© : complÃ¨te la calibration avant dâ€™utiliser les charges suggÃ©rÃ©es.',blocked:true,severity:'watch',reason:'Profil client sans calibration.'}`.

- [ ] **Step 4: VÃ©rifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS pour le profil non calibrÃ© et la migration sans profil.

### Task 3: Filtre de vraisemblance scalÃ© et non destructif

**Files:**
- Modify: `scripts/charge/suggestion.js:106-121`
- Modify: `scripts/charge/utilitaires.js:35-85`
- Modify: `scripts/charge/historique.js:180-210`
- Test: `dev/client_charge_safety_checks.js`

**Interfaces:**
- Produces: `coachIsImplausibleLoadRow(row): boolean` et les champs conservÃ©s `implausible`, `implausibleReason`.

- [ ] **Step 1: Ajouter les scÃ©narios RED**

```js
ctx.state.profile = {onboarded:true, scaleRatios:{_upperPush:0.2,_overall:0.2}};
// 10 lb DB Shoulder Press doit rester plausible aprÃ¨s scaling.
// 5 lb face Ã  un seed scalÃ© encore trÃ¨s Ã©levÃ© doit Ãªtre marquÃ© et ignorÃ©, jamais supprimÃ©.
assert(lightRow.load === 10 && !lightRow.implausible, 'Charge rÃ©elle lÃ©gÃ¨re conservÃ©e.');
assert(badRow.load === 5 && badRow.implausible, 'Erreur conservÃ©e et marquÃ©e.');
assert(badRef.load === 5 && badRef.implausible, 'RÃ©fÃ©rence conservÃ©e et marquÃ©e.');
```

- [ ] **Step 2: VÃ©rifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL car le sanitizer supprime encore `load` ou la rÃ©fÃ©rence.

- [ ] **Step 3: ImplÃ©menter le seed scalÃ© et le marquage**

```js
var rawSeedForFilter = coachDefaultLoadSeedForMovement(label, target);
var genericSeedForFilter = (rawSeedForFilter || rawSeedForFilter === 0)
  ? coachApplyUserLoadScale(label, rawSeedForFilter)
  : rawSeedForFilter;
```

Remplacer les `delete` du sanitizer par `implausible=true` et `implausibleReason`, conserver les valeurs, puis exclure ces lignes dans les filtres de progression.

- [ ] **Step 4: VÃ©rifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS, valeurs conservÃ©es et donnÃ©es marquÃ©es ignorÃ©es.

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

CrÃ©er une vraie ligne Ã  `100 lb` puis un `manual_charge_override` Ã  `200 lb`; vÃ©rifier que la dÃ©cision reste fondÃ©e sur `100 lb`. Appeler le helper de reset et vÃ©rifier que seule la ligne override disparaÃ®t et que la vraie sÃ©ance reste.

- [ ] **Step 2: VÃ©rifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL car lâ€™override pilote encore lâ€™historique ou reste aprÃ¨s reset.

- [ ] **Step 3: ImplÃ©menter le helper partagÃ©**

```js
function coachIsNonPerformanceSeed(r){
  var src = r && r.planned && r.planned.source;
  return src === 'manual_recalibration' || src === 'manual_charge_override';
}
```

Utiliser le helper dans `coachFilterHistoryForProgression`, `guardedSuggestedLoadDecision`, `coachSafeSuggestedLoad` et `coachBrainBuildStats`. Au reset, filtrer uniquement les lignes `manual_charge_override` et recalculer/neutraliser les capacitÃ©s qui portent la mÃªme source.

- [ ] **Step 4: VÃ©rifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS, vraie sÃ©ance conservÃ©e, override exclu et neutralisÃ©.

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
assert(!/^\d+(\.\d+)?$/.test(dbDeload), 'Aucune sortie numÃ©rique nue.');
assert(/Ã— 11 reps/.test(repsOutput), 'Suffixe de reps prÃ©servÃ©.');
```

- [ ] **Step 2: VÃ©rifier RED**

Run: `node dev/client_charge_safety_checks.js`
Expected: FAIL sur les retours `String(newLoad)` ou `String(deloadRounded)`.

- [ ] **Step 3: ImplÃ©menter et utiliser le formatteur**

```js
function coachFormatSuggestedLoad(label,value,fallbackText,suffix){
  if(!(value || value === 0)) return fallbackText || 'â€”';
  var text = displayLoadForEquipment(label,String(value)+' lb');
  if(suffix) text += suffix;
  return text;
}
```

Faire passer toutes les sorties finales et tous les hints numÃ©riques de `guardedSuggestedLoadDecision` et `coachSafeSuggestedLoad` par ce helper.

- [ ] **Step 4: VÃ©rifier GREEN**

Run: `node dev/client_charge_safety_checks.js`
Expected: PASS pour progression, deload et reps DB.

### Task 6: PÃ©riodisation client, chemin legacy et validation complÃ¨te

**Files:**
- Modify: `dev/client_charge_safety_checks.js`
- Modify only if required: `programs/workouts.js`

**Interfaces:**
- Consumes: `client_hypertrophy_5d.getBlocks()` et `CoachCharge.suggestLoad()`.

- [ ] **Step 1: Ajouter le test E2E client**

Charger le vrai programme et comparer S1/S5 pour Back Squat, Barbell Row et Bench Press. VÃ©rifier statiquement que `ex()` dans `racine_client_programs.js` ne contient pas `charge(`.

- [ ] **Step 2: VÃ©rifier le chemin legacy**

Run: `rg -n "progress\s*:" programs`
Expected: seules les configurations legacy et les tableaux vides sont trouvÃ©s; si aucun programme client rÃ©el ne lâ€™utilise, ne pas modifier `programs/workouts.js` et conserver le risque dans la PR.

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

Expected: tous les fichiers existants passent; signaler prÃ©cisÃ©ment les fichiers absents et les Ã©checs non liÃ©s.

- [ ] **Step 4: VÃ©rifier les donnÃ©es protÃ©gÃ©es et publier**

Confirmer quâ€™aucun des quatre fichiers protÃ©gÃ©s nâ€™est dans le diff. CrÃ©er des commits ciblÃ©s sur `fix/client-charge-safety-before-distribution`, puis ouvrir une PR draft vers `main` avec rÃ©sumÃ©, tests et risque legacy `b.progress`.


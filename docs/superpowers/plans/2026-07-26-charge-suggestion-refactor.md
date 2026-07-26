# Refactor Structurel — Cascade de Suggestion de Charges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer `guardedSuggestedLoadDecision()` (scripts/charge/suggestion.js) en pipeline de règles nommées et documentées, sortir les regex de noms de mouvement dispersées dans une table de tuning centralisée, et graver une règle durable qui empêche leur retour — sans changer un seul octet de sortie du moteur de charges.

**Architecture:** Un golden master (tests de caractérisation) capture le comportement actuel du moteur sur une matrice de scénarios représentatifs AVANT tout changement de code — c'est le filet de sécurité qui remplace le TDD classique ici (le comportement existant est la spec, pas une nouvelle exigence). `guardedSuggestedLoadDecision()` est ensuite découpé en petites fonctions de règles nommées (`coachRuleXxx(ctx)`) qui mutent un objet d'état partagé `ctx`, appelées dans le même ordre exact que le code actuel — Extract Method pur. Les regex de noms de mouvement et leurs seuils (isolation, technique, mouvement principal, saut max, multiplicateur deload, seuils de remontée d'historique, préférence de contexte) sont sortis dans `scripts/charge/movement_tuning.js`, sur le même modèle que `MOVEMENT_PROGRESSION_CAPS` déjà présent dans `mouvements.js`. Chaque étape est vérifiée par le golden master avant de passer à la suivante.

**Tech Stack:** JavaScript vanilla global (pas de ES modules, pas de build), Node.js `vm` pour les harnais `dev/`, assertions maison (`assert(cond, msg)`), diff JSON pour le golden master.

## Global Constraints

- Domaine prioritaire : ce refactor touche `scripts/charge/` (CLAUDE.md § 3.2). Les contrats `docs/CHARGE_ENGINE.md`, `docs/CHARGE_CONTEXT.md`, `docs/CHARGE_PROGRESSION_CONTRACT.md`, `docs/BRAIN.md`, `docs/DATA_FLOW_CONTRACT.md` ont déjà été consultés pour cette session.
- Refactor pur : `guardedSuggestedLoadDecision()` doit produire une sortie strictement identique (JSON identique) pour chaque scénario du golden master, après chaque tâche. Toute divergence est un bug à corriger avant de continuer — jamais un "comportement amélioré".
- Ne jamais toucher `setActiveWeek()`, `applyWeekTrackingForWeek()`, `buildWeekTrackingForWeek()`.
- Ne jamais modifier `data/equipment.js`, `data/charges.js`, ni aucun fichier `data/*.json`.
- Tout nouveau fichier (`scripts/charge/movement_tuning.js`, nouveaux `dev/*.js`) reste dans le domaine `scripts/charge/` ou `dev/` selon `docs/STRUCTURE_CONTRACT.md`.
- Tout nouveau fichier JS chargé au runtime doit être ajouté à `index.html` (balise `<script defer>` avec cache-bust `?v=`) **et** à `loadOrder` dans chaque `dev/*_checks.js` qui charge le moteur de charges.
- Commentaires et messages en français, style du code existant (fonctions globales, pas de classes, pas de `const`/`let` obligatoires — suivre le style ES5 déjà en place dans `scripts/charge/`).
- Livrer un jet complet par tâche (pas de validation micro-étape par micro-étape avec l'utilisateur), mais chaque tâche doit rester vérifiable indépendamment via le golden master.

---

### Task 1: Golden master de caractérisation

**Files:**
- Create: `dev/charge_suggestion_golden_master.js`
- Create: `dev/fixtures/charge_suggestion_golden_master.json` (généré par le script, jamais écrit à la main)

**Interfaces:**
- Consumes: `guardedSuggestedLoadDecision(nameOrKey, currentLoad, targetReps, context)` tel qu'il existe aujourd'hui dans `scripts/charge/suggestion.js` (inchangé à cette étape).
- Produces: une fixture JSON de sorties attendues + un mode `--check` utilisé par toutes les tâches suivantes.

- [ ] **Step 1: Écrire le harnais et la matrice de scénarios**

```js
#!/usr/bin/env node
/*
  Racine - golden master de caracterisation pour guardedSuggestedLoadDecision().
  Capture le comportement du moteur de suggestion sur une matrice de scenarios
  representatifs, avant/pendant le refactor structurel (voir
  docs/superpowers/plans/2026-07-26-charge-suggestion-refactor.md).

  Usage :
    node dev/charge_suggestion_golden_master.js --record   (avant le refactor, une seule fois)
    node dev/charge_suggestion_golden_master.js            (verifie contre la fixture enregistree)
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(__dirname, 'fixtures', 'charge_suggestion_golden_master.json');
function rel(p){ return path.join(root, p); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }

const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN,
  setTimeout: function(fn){ if(typeof fn==='function') fn(); },
  clearTimeout: function(){},
  document: { getElementById: function(){ return null; } },
  navigator: {},
  localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {
    'Back Squat':'185 lb', 'Strict Press':'95 lb', 'Barbell Row':'115 lb',
    'Lateral Raise DB':'20 lb', 'Hip Thrust':'225 lb'
  },
  CHARGE_ORDER: [],
  movements: {
    backSquat:{name:'Back Squat', profile:'backSquat'},
    strictPress:{name:'Strict Press', profile:'strictPress'}
  },
  state: { week:3, day:'mardi', rpeHistory:{}, athleteState:{ movements:{} }, profile:{onboarded:true, scaleRatios:{_overall:1}} },
  save: function(){},
  focus: function(){ return {label:'test cycle', targetReps:{0:8,1:8,2:8,3:8,4:8,5:8}}; },
  buildWeekInfo: function(){ return {6:{label:'S6', goal:'Deload facile'}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; },
  parseTargetReps: function(format, fallback){
    const nums = String(format || '').match(/\d+/g) || [];
    if(!nums.length)return {min:fallback||8, max:fallback||8};
    const last = Number(nums[nums.length-1]) || fallback || 8;
    return {min:last, max:last};
  }
};
ctx.window = ctx;
ctx.globalThis = ctx;

const loadOrder = [
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js',
  'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js',
  'scripts/charge/suggestion.js'
];
loadOrder.forEach(file => vm.runInNewContext(read(file), ctx, { filename: file }));

function hist(rows){
  return rows.map(r => Object.assign(
    {date:'2026-01-0'+(r.d||1), reps:r.reps, rpe:r.rpe, load:r.load, status:r.status},
    r.context ? {context:r.context} : {}
  ));
}
function setMovement(label, history, ranges){
  ctx.state.athleteState.movements[label] = { history: hist(history), ranges: ranges||{} };
}

const scenarios = [
  { name:'no_history_no_numeric', setup(){ ctx.state.athleteState.movements={}; }, call:['Air Squat','Poids du corps',10,{}] },
  { name:'no_history_numeric_main', setup(){ ctx.state.athleteState.movements={}; }, call:['Back Squat','185 lb',8,{}] },
  { name:'progression_ready_low_rpe', setup(){ setMovement('Back Squat',[{reps:8,rpe:7,load:185,d:1},{reps:8,rpe:6,load:185,d:2}]); }, call:['Back Squat','185 lb',8,{}] },
  { name:'blocked_high_rpe', setup(){ setMovement('Back Squat',[{reps:8,rpe:9.5,load:185,d:1}]); }, call:['Back Squat','195 lb',8,{}] },
  { name:'brake_rpe_8_5_similar_target', setup(){ setMovement('Back Squat',[{reps:8,rpe:8.5,load:185,d:1}]); }, call:['Back Squat','195 lb',8,{}] },
  { name:'lift_from_history_barbell_row', setup(){ setMovement('Barbell Row',[{reps:8,rpe:7,load:135,d:1},{reps:8,rpe:7,load:135,d:2}]); }, call:['Barbell Row','110 lb',8,{}] },
  { name:'lift_from_history_generic_gap20', setup(){ setMovement('Deadlift',[{reps:8,rpe:7,load:225,d:1},{reps:8,rpe:7,load:225,d:2}]); }, call:['Deadlift','195 lb',8,{}] },
  { name:'isolation_small_step', setup(){ setMovement('Lateral Raise DB',[{reps:12,rpe:6,load:20,d:1},{reps:12,rpe:6,load:20,d:2}]); }, call:['Lateral Raise DB','20 lb',12,{}] },
  { name:'technical_no_progression', setup(){ setMovement('Power Clean Technique',[{reps:3,rpe:6,load:115,d:1}]); }, call:['Power Clean Technique','115 lb',3,{}] },
  { name:'deload_week', setup(){ ctx.state.week=6; setMovement('Back Squat',[{reps:8,rpe:7,load:225,d:1},{reps:8,rpe:7,load:225,d:2}]); }, call:['Back Squat','225 lb',8,{}], teardown(){ ctx.state.week=3; } },
  { name:'history_signal_stalled', setup(){ setMovement('Bench Press',[{reps:8,rpe:7,load:135,d:1},{reps:8,rpe:7,load:135,d:2},{reps:8,rpe:7,load:135,d:3}]); }, call:['Bench Press','145 lb',8,{}] },
  { name:'rep_gap_projection', setup(){ setMovement('Back Squat',[{reps:1,rpe:8,load:225,d:1}]); }, call:['Back Squat','225 lb',8,{}] },
  { name:'athlete_state_cap_watch', setup(){ setMovement('Front Squat',[{reps:8,rpe:7,load:135,d:1}],{strength:{status:'watch',currentLoad:135}}); }, call:['Front Squat','185 lb',8,{}] },
  { name:'movement_progression_cap_overhead_rope', setup(){ setMovement('Overhead Rope Extension',[{reps:12,rpe:7,load:50,d:1}]); }, call:['Overhead Rope Extension','50 lb',12,{}] },
  { name:'floor_validation', setup(){ setMovement('Back Squat',[{reps:8,rpe:9,load:225,d:1},{reps:8,rpe:9,load:225,d:2}]); }, call:['Back Squat','185 lb',8,{}] }
];

const results = {};
scenarios.forEach(s => {
  s.setup();
  results[s.name] = ctx.guardedSuggestedLoadDecision.apply(null, s.call);
  if(s.teardown) s.teardown();
});

const mode = process.argv.includes('--record') ? 'record' : 'check';
if(mode==='record'){
  fs.mkdirSync(path.dirname(fixturePath), {recursive:true});
  fs.writeFileSync(fixturePath, JSON.stringify(results, null, 2));
  console.log('Golden master enregistre : ' + fixturePath);
  process.exit(0);
}

if(!fs.existsSync(fixturePath)){
  console.error('Aucune fixture golden master. Lancer d\'abord --record avant le refactor.');
  process.exit(1);
}
const expected = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
let failed = 0;
Object.keys(expected).forEach(name => {
  const a = JSON.stringify(expected[name]);
  const b = JSON.stringify(results[name]);
  if(a !== b){
    failed++;
    console.error('DIVERGENCE sur "'+name+'":');
    console.error('  attendu : '+a);
    console.error('  obtenu  : '+b);
  }
});
if(failed){
  console.error(failed+' scenario(s) divergent(s). Refactor non transparent, a corriger avant de continuer.');
  process.exit(1);
}
console.log('Golden master : '+Object.keys(expected).length+' scenarios identiques. Refactor transparent.');
```

- [ ] **Step 2: Enregistrer la fixture de référence (comportement actuel, avant tout refactor)**

Run: `node dev/charge_suggestion_golden_master.js --record`
Expected: `Golden master enregistre : .../dev/fixtures/charge_suggestion_golden_master.json`

- [ ] **Step 3: Vérifier que le mode check passe immédiatement (sanity check)**

Run: `node dev/charge_suggestion_golden_master.js`
Expected: `Golden master : 15 scenarios identiques. Refactor transparent.`

- [ ] **Step 4: Commit**

```bash
git add dev/charge_suggestion_golden_master.js dev/fixtures/charge_suggestion_golden_master.json
git commit -m "test: golden master de caracterisation pour guardedSuggestedLoadDecision"
```

---

### Task 2: Table de tuning centralisée par mouvement

**Files:**
- Create: `scripts/charge/movement_tuning.js`
- Modify: `index.html` (nouvelle balise `<script>`)

**Interfaces:**
- Produces: `window.COACH_MOVEMENT_TUNING` (table de données) et `coachMatchesAnyTuningPattern(text, patterns)` (helper de lookup), utilisés par la Task 4. Rien ne les consomme encore à la fin de cette tâche — le fichier est créé mais pas encore branché, donc aucun risque de régression.

- [ ] **Step 1: Créer la table de tuning**

```js
// scripts/charge/movement_tuning.js
// Racine — table de tuning centralisee par mouvement pour le moteur de charges.
// Regroupe les seuils et motifs de noms de mouvements que suggestion.js et
// historique.js consultaient jusqu'ici via des regex inline dispersees dans
// plusieurs fonctions. Meme principe que MOVEMENT_PROGRESSION_CAPS
// (scripts/charge/mouvements.js), etendu a l'ensemble du moteur.
//
// Regle : tout nouveau seuil ou cas particulier par mouvement va ICI, jamais
// comme un nouveau regex/if inline dans une fonction de decision. Voir
// docs/STRUCTURE_CONTRACT.md — Domaine charge — Regle de tuning par mouvement.
(function(){
  window.COACH_MOVEMENT_TUNING = {
    // isIsolationMovement() — historique.js
    isolationPatterns: [
      /lateral raise/, /rear delt/, /curl/, /rope extension/, /pushdown/,
      /face pull/, /trap 3/, /serratus/, /calf/, /fly/
    ],
    // isTechnicalMovement() — historique.js
    technicalPatterns: [
      /technique/, /leger/, /light/, /warm up/, /warmup/
    ],
    // coachIsMainLoadContext() — suggestion.js (mots-cles de contexte)
    mainLoadKeywordPatterns: [
      /main/, /principal/, /prioritaire/, /force/, /strength/
    ],
    // coachIsMainLoadContext() — suggestion.js (mouvements principaux nommes)
    mainLoadMovementPatterns: [
      /strict press/, /front squat/, /back squat/, /bench press/,
      /barbell row/, /deadlift/, /power clean/, /hip thrust/
    ],
    // coachShouldPreferContextMatch() — historique.js
    contextPreferenceMovementPatterns: [
      /overhead rope extension/, /face pull/, /power clean/
    ],
    // coachLimitedContextFamilyMatches() — historique.js
    limitedContextFamilyPatterns: [
      /power clean/
    ],
    // coachMaxJumpForExercise() — historique.js
    // "default" s'applique si aucun override ne matche ET si le mouvement
    // n'est pas une isolation (auquel cas coachLoadStepForExercise decide).
    maxJumpBase: {
      default: 10,
      overrides: [
        {pattern:/hip thrust/, base:30}
      ]
    },
    // coachDeloadMultiplierForContext() — suggestion.js
    deloadMultiplier: { main: 0.85, other: 0.80 },
    // Bloc "allowLiftFromHistory" de guardedSuggestedLoadDecision() — suggestion.js
    liftFromHistoryThresholds: {
      default: {gap:20, maxRpe:8},
      overrides: [
        {pattern:/barbell row/, gap:15, maxRpe:null}
      ]
    }
  };

  window.coachMatchesAnyTuningPattern = function(text, patterns){
    return (patterns||[]).some(function(re){ return re.test(text); });
  };
})();
```

- [ ] **Step 2: Charger le fichier dans `index.html`, juste après l'équipement**

Modifier `index.html` ligne 333 (`<script src="scripts/charge/equipement.js?v=4.5.20" defer></script>`) pour ajouter juste après :

```html
<script src="scripts/charge/equipement.js?v=4.5.20" defer></script>
<script src="scripts/charge/movement_tuning.js?v=4.5.20" defer></script>
<script src="scripts/charge/utilitaires.js?v=4.5.20" defer></script>
```

- [ ] **Step 3: Ajouter le fichier au `loadOrder` des deux harnais golden master + charge_engine_checks**

Dans `dev/charge_suggestion_golden_master.js` et `dev/charge_engine_checks.js`, insérer `'scripts/charge/movement_tuning.js'` juste après `'scripts/charge/equipement.js'` dans le tableau `loadOrder`.

- [ ] **Step 4: Vérifier que rien n'a changé (fichier créé mais inutilisé)**

Run: `node dev/charge_suggestion_golden_master.js`
Expected: `Golden master : 15 scenarios identiques. Refactor transparent.`

Run: `node dev/charge_engine_checks.js`
Expected: sortie existante inchangée (aucune régression, la table n'est consultée par personne).

- [ ] **Step 5: Commit**

```bash
git add scripts/charge/movement_tuning.js index.html dev/charge_suggestion_golden_master.js dev/charge_engine_checks.js
git commit -m "feat(charge): table de tuning centralisee par mouvement (non branchee)"
```

---

### Task 3: Extraction du pipeline de règles dans suggestion.js

**Files:**
- Modify: `scripts/charge/suggestion.js:231-541` (remplace le corps de `guardedSuggestedLoadDecision`)

**Interfaces:**
- Consumes: toutes les fonctions déjà existantes utilisées par le corps actuel (`athleteMovementRecord`, `coachFilterHistoryForProgression`, `coachIsImplausibleLoadRow`, `coachRecentBestControlledLoad`, `coachBuildMovementHistorySignal`, `coachApplyUserLoadScale`, `displayLoadForEquipment`, `coachIsLimitedProgressionContext`, `coachContextProgressionReason`, `coachIsDeloadWeekOrContext`, `coachDefaultLoadSeedForMovement`, `coachDeclaredRangeReference`, `coachReferenceSeedWorkingLoad`, `coachMaxJumpForExercise`, `coachRecentUnresolvedHighRpeBrake`, `coachApplyDeloadCap`, `roundLoadForExercise`, `coachGetMovementProgressionCap`, `coachIsFridayContext`, `coachFormatSuggestedLoad`, `coachBrainApplyStatsGate`, `storeLoadDecisionHint`).
- Produces: `coachBuildSuggestionContext(nameOrKey,currentLoad,targetReps,context)` → `{early, decision}` ou `{early:false, ctx}`. Douze fonctions `coachRuleXxx(ctx)` mutant `ctx` en place, appelées dans l'ordre par `guardedSuggestedLoadDecision`. `coachFinalizeSuggestionDecision(ctx)` → objet décision final. Ces noms sont utilisés tels quels par la Task 4 (elle ne fait qu'y insérer des lookups dans la table de tuning, sans changer la signature).

**Important : cette tâche NE touche PAS aux regex de noms de mouvement.** Elles restent copiées telles quelles dans `coachRuleLiftFromControlledHistory`. La Task 4 les remplacera par des lookups dans `window.COACH_MOVEMENT_TUNING`. Séparer les deux évite de mélanger un risque structurel (réordonnancement de code) avec un risque sémantique (changement de table de données) dans le même diff.

- [ ] **Step 1: Remplacer les lignes 231-541 de `scripts/charge/suggestion.js`**

Supprimer le corps actuel de `guardedSuggestedLoadDecision` (lignes 231 à 541 incluses, de `function guardedSuggestedLoadDecision(...){` jusqu'à son `}` fermant, juste avant `function plannedMapFromSessionExercises(){`) et le remplacer par :

```js
// ─── Pipeline de suggestion de charge ──────────────────────────────────────
// guardedSuggestedLoadDecision() construit un etat partage (ctx), puis
// applique une sequence de regles nommees dans un ordre volontaire : une
// regle plus bas dans la liste peut resserrer OU remonter ce qu'une regle
// plus haut a decide (cascade assumee, pas un pipeline "premier qui matche
// gagne"). Ordre et raison de chaque regle :
//
//  1. coachRuleContextLimited            — contexte technique/wod/light : pas d'auto-progression.
//  2. coachRuleReferenceDeTravail        — aucun historique reel : rampe periodisee sous le RM, pas le max theorique.
//  3. coachRuleLiftFromControlledHistory — programme sous l'historique reel controle : remonte (borne).
//  4. coachRuleReferenceReelleValidee    — reference reelle plus haute deja validee : repart de la, pas de l'ancienne suggestion.
//  5. coachRuleHistorySignalAdjustment   — tendance recente (stalled/blocked/watch) : plafonne ou avertit.
//  6. coachRuleLastSetGuards             — dernier set reel : saut max prudent, hausse graduelle, freins RPE >=8.5/>=9, projection Epley si ecart de reps.
//  7. coachRuleRecentHardBrake           — RPE eleve recent non resolu par une reference plus haute depuis : bloque.
//  8. coachRuleFloorValidation           — plancher : un dernier set reellement reussi n'est jamais sous-suggere (dernier mot, place apres les freins).
//  9. coachRuleAthleteStateCap           — mouvement sous surveillance dans athlete_state : cap jusqu'a confirmation.
// 10. coachRuleDeloadCap                 — semaine 6 / contexte recuperation : cap a 80-85% de la derniere reference fiable.
// 11. coachRuleRoundingAndMovementCap    — arrondi equipement + cap de progression specifique au mouvement (MOVEMENT_PROGRESSION_CAPS).
// 12. coachRuleContextLimitedRounding    — re-clamp final si contexte limite malgre l'arrondi.
//
// Puis coachFinalizeSuggestionDecision() construit l'objet decision, applique
// le Brain stats gate, et journalise la source de la suggestion.

function guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps,context){
  var built=coachBuildSuggestionContext(nameOrKey,currentLoad,targetReps,context);
  if(built.early)return built.decision;
  var ctx=built.ctx;

  coachRuleContextLimited(ctx);
  coachRuleReferenceDeTravail(ctx);
  coachRuleLiftFromControlledHistory(ctx);
  coachRuleReferenceReelleValidee(ctx);
  coachRuleHistorySignalAdjustment(ctx);
  coachRuleLastSetGuards(ctx);
  coachRuleRecentHardBrake(ctx);
  coachRuleFloorValidation(ctx);
  coachRuleAthleteStateCap(ctx);
  coachRuleDeloadCap(ctx);
  coachRuleRoundingAndMovementCap(ctx);
  coachRuleContextLimitedRounding(ctx);

  return coachFinalizeSuggestionDecision(ctx);
}

function coachBuildSuggestionContext(nameOrKey,currentLoad,targetReps,context){
  var moveContext=(context&&context.label)?context:((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(nameOrKey,context||{}):null);
  var label=moveContext&&moveContext.label?moveContext.label:canonicalMovementLabel(nameOrKey);
  if(typeof coachProfileNeedsCalibration==='function'&&coachProfileNeedsCalibration()){
    var calibrationMessage='Profil non calibré : complète la calibration avant d’utiliser les charges suggérées.';
    return {early:true,decision:{label:label,loadNum:null,loadText:calibrationMessage,blocked:true,severity:'watch',reason:'Profil client sans calibration.'}};
  }
  var target=Number(targetReps)||8;
  var mv=athleteMovementRecord(label);
  var range=repRange(target);
  var cap=mv&&mv.ranges?(mv.ranges[range]||null):null;
  var histAll=(mv&&Array.isArray(mv.history))?mv.history:[];
  var hist=(typeof coachFilterHistoryForProgression==='function')?coachFilterHistoryForProgression(histAll,moveContext):histAll;

  hist=hist.filter(function(row){
    if(coachIsImplausibleLoadRow(label,row,target)){
      if(typeof coachLogWarn==='function')coachLogWarn('plausibility_filter', label+' : charge ignoree ('+coachHistoryLoadNumber(row)+' lb) — invraisemblable vs seed profil');
      return false;
    }
    return true;
  });

  var last=hist.length?hist[hist.length-1]:null;
  var lastLoad=coachHistoryLoadNumber(last);
  var lastHasValidLoad=last?coachHistoryHasValidLoad(last,label,moveContext):false;
  var lastRpe=last?coachHistoryRpeNumber(last):0;
  var bestControlled=coachRecentBestControlledLoad(hist,8.5,label,moveContext);
  var historySignal=(typeof coachBuildMovementHistorySignal==='function')?coachBuildMovementHistorySignal(label,hist,moveContext,target):null;
  var programNum=parseLoad(currentLoad);
  if(programNum!==null&&programNum!==undefined){
    programNum=coachApplyUserLoadScale(label,programNum);
  }
  var originalText=displayLoadForEquipment(label,currentLoad);
  var contextLimited=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(moveContext):false;
  var contextLimitReason=(typeof coachContextProgressionReason==='function')?coachContextProgressionReason(moveContext):'';
  var isDeload=coachIsDeloadWeekOrContext(moveContext);
  var seedReason="Charge du programme, arrondie selon l'equipement.";
  if(programNum===null||programNum===undefined){
    var genericSeedForFilter=coachDefaultLoadSeedForMovement(label,target);
    var seedFromReal=lastHasValidLoad?lastLoad:(((bestControlled&&bestControlled.load)||bestControlled&&bestControlled.load===0)?bestControlled.load:null);
    var seed;
    if(seedFromReal||seedFromReal===0){
      seed=seedFromReal;
    }else{
      seed=(genericSeedForFilter||genericSeedForFilter===0)?coachApplyUserLoadScale(label,genericSeedForFilter):null;
    }
    if(seed||seed===0){
      programNum=seed;
      seedReason=lastHasValidLoad
        ? "Charge de programme non numerique : suggestion basee sur la derniere charge historique."
        : ((bestControlled&&(bestControlled.load||bestControlled.load===0))
          ? "Charge de programme non numerique : suggestion basee sur l'historique controle."
          : "Charge de programme non numerique : suggestion basee sur les reperes d'equipement, ajustee a ton profil.");
    }else{
      storeLoadDecisionHint(label,originalText,"Charge non numerique et aucun historique/repere fiable trouve.","watch",hist,moveContext,'reperes');
      return {early:true,decision:{label:label,loadText:originalText,loadNum:null,severity:"watch",reason:"Charge non numerique et aucun historique/repere fiable trouve.",last:last,cap:cap}};
    }
  }

  return {early:false, ctx:{
    nameOrKey:nameOrKey, currentLoad:currentLoad, moveContext:moveContext, label:label,
    target:target, mv:mv, range:range, cap:cap, histAll:histAll, hist:hist,
    last:last, lastLoad:lastLoad, lastHasValidLoad:lastHasValidLoad, lastRpe:lastRpe,
    bestControlled:bestControlled, historySignal:historySignal, programNum:programNum,
    originalText:originalText, contextLimited:contextLimited, contextLimitReason:contextLimitReason,
    isDeload:isDeload, suggested:programNum, severity:"ok", reason:seedReason, mode:"nearest",
    brainAdjusted:false
  }};
}

function coachRuleContextLimited(ctx){
  if(ctx.contextLimited || isTechnicalMovement(ctx.label)){
    ctx.suggested=ctx.programNum;ctx.mode="nearest";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason=ctx.contextLimitReason || "Mouvement technique : pas d'auto-progression comme un mouvement principal.";
    ctx.brainAdjusted=true;
  }
}

function coachRuleReferenceDeTravail(ctx){
  var hasRealHistory=ctx.hist.some(function(r){return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext);});
  ctx.hasRealHistory=hasRealHistory;
  if(!hasRealHistory&&!ctx.contextLimited&&!isTechnicalMovement(ctx.label)&&!ctx.isDeload){
    var declaredRef=coachDeclaredRangeReference(ctx.mv,ctx.range,ctx.target,ctx.label);
    var refSeed=declaredRef?coachReferenceSeedWorkingLoad(declaredRef,ctx.range):null;
    if(refSeed&&refSeed.load>0){
      ctx.suggested=refSeed.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Reference de travail "+Math.round(declaredRef.load)+" lb"+(declaredRef.exact?"":" (derivee)")
        +" : semaine "+(refSeed.wIdx+1)+"/"+refSeed.loadingWeeks+" a ~"+Math.round(refSeed.pct*100)+"% ("
        +Math.round(refSeed.load)+" lb), sous le RM. Rampe planifiee : pas de charge proche du RM pour un travail en "+ctx.range+".";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleLiftFromControlledHistory(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&ctx.hist.length>=2){
    var gap=ctx.bestControlled.load-ctx.suggested;
    var n=coachNormalizeMoveText(ctx.label);
    var allowLiftFromHistory=false;
    if(/barbell row/.test(n)&&gap>=15)allowLiftFromHistory=true;
    else if(!isIsolationMovement(ctx.label)&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)&&gap>=20&&ctx.bestControlled.rpe<=8)allowLiftFromHistory=true;
    if(allowLiftFromHistory){
      ctx.suggested=Math.min(ctx.bestControlled.load+coachMaxJumpForExercise(ctx.label,ctx.bestControlled.load), ctx.bestControlled.load+10);
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Historique reel controle detecte : "+ctx.bestControlled.load+" lb x "+ctx.bestControlled.reps+" @RPE "+ctx.bestControlled.rpe+". Le moteur evite de sous-suggerer sous une reference facile.";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleReferenceReelleValidee(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&ctx.bestControlled.rpe<=8&&ctx.hist.length>=2){
    var bestReps=Number(ctx.bestControlled.reps)||0;
    if(!ctx.target||!bestReps||bestReps>=ctx.target||repRange(bestReps)===repRange(ctx.target)){
      ctx.suggested=ctx.bestControlled.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Reference reelle plus haute validee : "+ctx.bestControlled.load+" lb x "+(bestReps||ctx.target)+" @RPE "+ctx.bestControlled.rpe+". La prochaine suggestion repart de cette charge, pas de l'ancienne suggestion.";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleHistorySignalAdjustment(ctx){
  if(ctx.historySignal&&(ctx.historySignal.status==='blocked'||ctx.historySignal.status==='stalled')&&ctx.lastHasValidLoad&&ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastLoad;ctx.mode='down';ctx.severity='warning';
    ctx.reason=ctx.historySignal.reason;
    ctx.brainAdjusted=true;
  }else if(ctx.historySignal&&ctx.historySignal.status==='watch'&&ctx.suggested>ctx.programNum){
    ctx.severity=ctx.severity==='ok'?'watch':ctx.severity;
    ctx.reason=ctx.historySignal.reason;
    ctx.brainAdjusted=true;
  }
}

function coachRuleLastSetGuards(ctx){
  if(!ctx.last)return;
  var maxJump=coachMaxJumpForExercise(ctx.label,ctx.lastLoad);
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var repsReached=!ctx.target || !lastReps || lastReps>=ctx.target;
  if(ctx.lastHasValidLoad&&ctx.lastRpe<=8&&ctx.suggested>ctx.lastLoad+maxJump){
    ctx.suggested=ctx.lastLoad+maxJump;ctx.mode="down";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason="Progression limitee : derniere reference "+ctx.lastLoad+" lb @RPE "+ctx.lastRpe+". Saut maximal prudent +"+maxJump+" lb.";
    ctx.brainAdjusted=true;
  }
  if(ctx.lastHasValidLoad&&ctx.lastRpe>0&&ctx.lastRpe<=7&&repsReached&&!ctx.contextLimited&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)&&!ctx.isDeload&&ctx.hist.length>=2){
    var next=nextLoadForExercise(ctx.label,ctx.lastLoad,1,ctx.currentLoad);
    var maxAllowed=ctx.lastLoad+maxJump;
    if(next&&next>ctx.lastLoad&&next<=maxAllowed){
      if(ctx.suggested<=ctx.lastLoad){
        ctx.suggested=next;ctx.mode="up";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
        ctx.reason="Progression prete : dernier "+ctx.lastLoad+" lb x "+(lastReps||ctx.target)+" @RPE "+ctx.lastRpe+". Petite hausse vers la prochaine charge disponible.";
        ctx.brainAdjusted=true;
      }
    }else if(ctx.suggested<=ctx.lastLoad){
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Progression prete, mais aucune charge superieure disponible/configuree dans le saut prudent autorise.";
      ctx.brainAdjusted=true;
    }
  }
  if(ctx.lastHasValidLoad&&ctx.lastRpe>=9 && ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastLoad;ctx.mode="down";ctx.severity="warning";
    ctx.reason="Bloque : dernier RPE reel "+ctx.lastRpe+" a "+ctx.lastLoad+" lb. Regle V51 : RPE >= 9 = aucune hausse automatique.";
    ctx.brainAdjusted=true;
  }else if(ctx.lastHasValidLoad&&ctx.lastRpe>=8.5 && coachLastSetIsSimilarOrHarder(ctx.target,lastReps) && ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastRpe>=9.5?Math.max(0,ctx.lastLoad-coachLoadStepForExercise(ctx.label,ctx.currentLoad)):ctx.lastLoad;ctx.mode="down";ctx.severity="warning";
    ctx.reason="Frein RPE : dernier RPE "+ctx.lastRpe+" sur une cible similaire ou plus dure. Maintenir ou reduire, pas augmenter.";
    ctx.brainAdjusted=true;
  }
  if(ctx.lastHasValidLoad&&lastReps>0&&ctx.target&&!ctx.contextLimited&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)){
    var repGap=ctx.target-lastReps;
    if(repGap>=3||ctx.target>=lastReps*2){
      var projOneRM=epley1RM(ctx.lastLoad,lastReps);
      var projCapacity=projOneRM?estimateLoadForRepsFrom1RM(projOneRM,ctx.target):0;
      if(projCapacity>0&&ctx.suggested>projCapacity){
        ctx.suggested=projCapacity;ctx.mode="down";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
        ctx.reason="Ecart de reps : dernier "+ctx.lastLoad+" lb x "+lastReps+" ne se traduit pas directement en "+ctx.target+" reps. Capacite estimee ~"+Math.round(projCapacity)+" lb (projection Epley).";
        ctx.brainAdjusted=true;
      }
    }
  }
}

function coachRuleRecentHardBrake(ctx){
  if(!ctx.contextLimited&&!ctx.isDeload){
    var recentHardBrake=coachRecentUnresolvedHighRpeBrake(ctx.hist,ctx.label,ctx.moveContext,ctx.target,ctx.suggested);
    if(recentHardBrake&&ctx.suggested>recentHardBrake.load){
      ctx.suggested=recentHardBrake.rpe>=9.5?Math.max(0,recentHardBrake.load-coachLoadStepForExercise(ctx.label,ctx.currentLoad)):recentHardBrake.load;
      ctx.mode="down";ctx.severity="warning";
      ctx.reason="Frein RPE recent : "+recentHardBrake.load+" lb a deja coute RPE "+recentHardBrake.rpe+" sans reference plus haute controlee depuis. Pas de hausse automatique vers "+ctx.programNum+" lb.";
    }
  }
}

function coachRuleFloorValidation(ctx){
  if(!ctx.contextLimited&&!ctx.isDeload&&!isTechnicalMovement(ctx.label)&&ctx.last&&ctx.lastHasValidLoad){
    var floorReps=coachHistoryRepsNumber(ctx.last);
    var floorRepsReached=!ctx.target||!floorReps||floorReps>=ctx.target;
    var floorBadStatuses=['recalibrating','watch','failed','major_fail','context_logged'];
    var floorStatusOk=!ctx.last.status||floorBadStatuses.indexOf(ctx.last.status)===-1;
    var lastRpeFloor=coachHistoryRpeNumber(ctx.last);
    var histForFloor=Array.isArray(ctx.hist)?ctx.hist:[];
    var prevForFloor=histForFloor.length>=2?histForFloor[histForFloor.length-2]:null;
    var prevRpeFloor=coachHistoryRpeNumber(prevForFloor);
    var prevLoadFloor=coachHistoryLoadNumber(prevForFloor);
    var consecutiveHardOnSameLoad=lastRpeFloor>=9&&prevRpeFloor>=9&&prevLoadFloor>=ctx.lastLoad;
    if(floorRepsReached&&floorStatusOk&&ctx.suggested<ctx.lastLoad&&!consecutiveHardOnSameLoad){
      ctx.suggested=ctx.lastLoad;ctx.mode="nearest";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      if(lastRpeFloor>=9){
        ctx.reason="Brain — Plancher de validation : "+ctx.lastLoad+" lb x "+(floorReps||ctx.target)+" valide, mais confort faible (RPE "+lastRpeFloor+"). Maintien pour consolidation; aucune hausse automatique.";
      }else{
        ctx.reason="Brain — Plancher maitrise : "+ctx.lastLoad+" lb x "+(floorReps||ctx.target)+" valide avec confort acceptable. Brain evite de redescendre sans signal durable.";
      }
    }
  }
}

function coachRuleAthleteStateCap(ctx){
  if(ctx.cap&&(ctx.cap.status==="recalibrating"||ctx.cap.status==="watch"||Number(ctx.cap.confidence||1)<0.55)){
    var capLoadRaw=(ctx.cap.currentLoad!==undefined&&ctx.cap.currentLoad!==null)?ctx.cap.currentLoad:ctx.cap.actualLoad;
    var capLoad=parseLoad(capLoadRaw);
    if(capLoad===null||capLoad===undefined)capLoad=Number(capLoadRaw)||0;
    var hasCapLoad=(capLoad||capLoad===0);
    var ignoreLowCap=ctx.bestControlled&&hasCapLoad&&ctx.bestControlled.load>=capLoad+15&&ctx.bestControlled.rpe<=8.5;
    if(hasCapLoad&&capLoad>0&&ctx.suggested>capLoad&&!ignoreLowCap){ctx.suggested=capLoad;ctx.mode="down";ctx.severity="warning";ctx.reason="Mouvement sous surveillance dans athlete_state : charge cappee jusqu'a confirmation.";}
    else if(ignoreLowCap&&!ctx.isDeload){ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;ctx.reason="Cap athlete_state ignore : historique reel controle plus recent/plus fiable que le cap faible.";}
  }
}

function coachRuleDeloadCap(ctx){
  var deloadDecision=coachApplyDeloadCap(ctx.suggested,ctx.label,ctx.moveContext,ctx.hist,ctx.lastHasValidLoad?ctx.lastLoad:null,ctx.bestControlled,ctx.programNum);
  if(deloadDecision.changed){
    ctx.suggested=deloadDecision.value;
    ctx.mode="nearest";
    ctx.severity=ctx.severity==="critical"?ctx.severity:"watch";
    ctx.reason=deloadDecision.reason;
  }
}

function coachRuleRoundingAndMovementCap(ctx){
  ctx.rounded=roundLoadForExercise(ctx.label,ctx.suggested,ctx.mode,ctx.currentLoad);
  var mvProgCap=(typeof coachGetMovementProgressionCap==="function")?coachGetMovementProgressionCap(ctx.label):null;
  ctx.mvProgCap=mvProgCap;

  if(mvProgCap && ctx.last && ctx.lastHasValidLoad){
    var isFridayCtx=(typeof coachIsFridayContext==="function") && coachIsFridayContext();
    var baseForCap=ctx.lastLoad;

    if(mvProgCap.fridayUsesWeekBest && isFridayCtx){
      var eb=coachRecentBestControlledLoad(ctx.hist, 8, ctx.label, ctx.moveContext);
      if(eb && eb.load>baseForCap && eb.rpe<=8) baseForCap=eb.load;
    }

    var maxJumpCap=(ctx.lastRpe<=8) ? (mvProgCap.maxJumpWhenEasy||0) : (mvProgCap.maxJumpWhenHard||0);
    var cappedByMv=roundLoadForExercise(ctx.label, baseForCap+maxJumpCap, "down", ctx.currentLoad);
    if(!cappedByMv && cappedByMv!==0) cappedByMv=baseForCap+maxJumpCap;

    if(ctx.rounded>cappedByMv){
      ctx.rounded=cappedByMv;
      if(ctx.rounded>ctx.lastLoad && ctx.lastRpe>=9) ctx.rounded=ctx.lastLoad;
      ctx.severity="warning";
      ctx.reason=ctx.label+" : cap de progression +"+maxJumpCap+" lb"
        +(isFridayCtx && mvProgCap.fridayUsesWeekBest ? " (référence semaine vendredi)" : "")
        +".";
    }
  }
  if(ctx.last&&ctx.lastHasValidLoad&&ctx.lastRpe>=9&&ctx.rounded>ctx.lastLoad&&!(mvProgCap&&coachIsFridayContext())){
    ctx.rounded=roundLoadForExercise(ctx.label,ctx.lastLoad,"down",ctx.currentLoad)||ctx.lastLoad;
    ctx.brainAdjusted=true;
  }
}

function coachRuleContextLimitedRounding(ctx){
  if(ctx.contextLimited&&ctx.rounded>ctx.programNum){
    ctx.rounded=roundLoadForExercise(ctx.label,ctx.programNum,"nearest",ctx.currentLoad)||ctx.programNum;
    ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason=ctx.contextLimitReason||ctx.reason;
    ctx.brainAdjusted=true;
  }
}

function coachFinalizeSuggestionDecision(ctx){
  var text=coachFormatSuggestedLoad(ctx.label,ctx.rounded,ctx.originalText,'');
  if(ctx.severity==="warning"||ctx.severity==="critical")text += " ⚠";
  var decision={label:ctx.label,loadText:text,loadNum:ctx.rounded,severity:ctx.severity,reason:ctx.reason,last:ctx.last,cap:ctx.cap,historySignal:ctx.historySignal};
  if(typeof coachBrainApplyStatsGate==='function' && ctx.lastHasValidLoad && ctx.rounded>ctx.lastLoad && ctx.severity==='ok' && !ctx.contextLimited && !ctx.isDeload){
    decision=coachBrainApplyStatsGate(decision,ctx.label,ctx.hist,ctx.moveContext,ctx.target,ctx.lastLoad);
    decision.loadText=coachFormatSuggestedLoad(ctx.label,decision.loadNum,ctx.originalText,'');
    if((decision.severity==='warning'||decision.severity==='critical')&&decision.loadText.indexOf('⚠')<0)decision.loadText+=' ⚠';
    ctx.brainAdjusted=true;
  }
  var explicitSource=ctx.brainAdjusted?'brain':'moteur';
  storeLoadDecisionHint(ctx.label,decision.loadText,decision.reason,decision.severity,ctx.hist,ctx.moveContext,explicitSource);
  try{
    if(decision.brainStats && window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
      var bk=coachNormalizeMoveText(ctx.label);
      if(window.__coachLoadHints[bk])window.__coachLoadHints[bk].brainStats=decision.brainStats;
    }
  }catch(e){}
  return decision;
}
```

- [ ] **Step 2: Vérifier le golden master (aucune divergence tolérée)**

Run: `node dev/charge_suggestion_golden_master.js`
Expected: `Golden master : 15 scenarios identiques. Refactor transparent.`
Si une divergence apparaît : relire la règle concernée, comparer ligne à ligne avec le code original (encore visible dans `git diff`), corriger — ne jamais ajuster la fixture pour la faire coller au nouveau comportement.

- [ ] **Step 3: Suite complète du moteur de charges**

Run: `node dev/charge_engine_checks.js`
Run: `node dev/progression_contract_checks.js`
Run: `node dev/reference_seed_checks.js`
Run: `node dev/reference_seed_stress.js`
Run: `node dev/deload_guard_checks.js`
Run: `node dev/client_charge_safety_checks.js`
Run: `node dev/movement_swaps_checks.js`
Run: `node dev/prescription_checks.js`
Expected: toutes les suites passent sans nouvelle erreur par rapport à l'état avant refactor.

- [ ] **Step 4: Commit**

```bash
git add scripts/charge/suggestion.js
git commit -m "refactor(charge): extraire guardedSuggestedLoadDecision en pipeline de regles nommees"
```

---

### Task 4: Brancher la table de tuning dans les fonctions consommatrices

**Files:**
- Modify: `scripts/charge/historique.js` (`isIsolationMovement`, `isTechnicalMovement`, `coachMaxJumpForExercise`, `coachShouldPreferContextMatch`, `coachLimitedContextFamilyMatches`)
- Modify: `scripts/charge/suggestion.js` (`coachIsMainLoadContext`, `coachDeloadMultiplierForContext`, `coachRuleLiftFromControlledHistory`)

**Interfaces:**
- Consumes: `window.COACH_MOVEMENT_TUNING`, `coachMatchesAnyTuningPattern(text, patterns)` (Task 2).
- Produces: mêmes signatures publiques qu'avant (`isIsolationMovement(name)`, `isTechnicalMovement(name)`, `coachMaxJumpForExercise(label,lastLoad)`, `coachIsMainLoadContext(label,context)`, `coachDeloadMultiplierForContext(label,context)`, `coachShouldPreferContextMatch(label,ctx)`, `coachLimitedContextFamilyMatches(rowCtx,currentCtx,label)`) — rien en dehors de ces fichiers n'a besoin de changer.

- [ ] **Step 1: `scripts/charge/historique.js` — remplacer les 5 fonctions**

Remplacer `isIsolationMovement` et `isTechnicalMovement` (lignes ~315-323) :

```js
function isIsolationMovement(name){
  var n=coachNormalizeMoveText(name);
  return coachMatchesAnyTuningPattern(n, window.COACH_MOVEMENT_TUNING.isolationPatterns);
}

function isTechnicalMovement(name){
  var n=coachNormalizeMoveText(name);
  return coachMatchesAnyTuningPattern(n, window.COACH_MOVEMENT_TUNING.technicalPatterns);
}
```

Remplacer `coachMaxJumpForExercise` (lignes ~284-299) :

```js
function coachMaxJumpForExercise(label,lastLoad){
  var n=coachNormalizeMoveText(label);
  var T=window.COACH_MOVEMENT_TUNING.maxJumpBase;
  var base=null;
  for(var i=0;i<T.overrides.length;i++){
    if(T.overrides[i].pattern.test(n)){base=T.overrides[i].base;break;}
  }
  if(base===null){
    base=isIsolationMovement(label)?(coachLoadStepForExercise(label,lastLoad||'')||5):T.default;
  }
  var factor=(typeof coachAggressivenessFactor==='function')?coachAggressivenessFactor():1;
  if(factor===1)return base;
  var step=coachLoadStepForExercise(label,lastLoad||'')||5;
  var scaled=Math.round((base*factor)/step)*step;
  return Math.max(step, scaled);
}
```

Remplacer `coachShouldPreferContextMatch` et `coachLimitedContextFamilyMatches` (lignes ~154-168) :

```js
function coachShouldPreferContextMatch(label, ctx){
  var n=coachNormalizeMoveText((ctx&&ctx.label)||label||'');
  if(coachMatchesAnyTuningPattern(n, window.COACH_MOVEMENT_TUNING.contextPreferenceMovementPatterns))return true;
  if(ctx&&(ctx.isWod||ctx.isTechnical||ctx.isLight||ctx.isRecovery||ctx.isRecall))return true;
  if(ctx&&Array.isArray(ctx.intents)&&ctx.intents.length)return ctx.intents.some(function(x){return /wod|technique|light|recovery|recall|progression/.test(x);});
  return false;
}

function coachLimitedContextFamilyMatches(rowCtx,currentCtx,label){
  var n=coachNormalizeMoveText((currentCtx&&currentCtx.label)||label||'');
  if(!coachMatchesAnyTuningPattern(n, window.COACH_MOVEMENT_TUNING.limitedContextFamilyPatterns))return false;
  var rowLimitedSignal=!!(rowCtx&&(rowCtx.isWod||rowCtx.isTechnical||rowCtx.isLight||rowCtx.isRecovery||rowCtx.isProgression));
  var currentLimitedSignal=!!(currentCtx&&(currentCtx.isWod||currentCtx.isTechnical||currentCtx.isLight||currentCtx.isRecovery||currentCtx.isProgression));
  return rowLimitedSignal&&currentLimitedSignal;
}
```

- [ ] **Step 2: `scripts/charge/suggestion.js` — remplacer `coachIsMainLoadContext` / `coachDeloadMultiplierForContext` (lignes ~20-30)**

```js
function coachIsMainLoadContext(label,context){
  var raw=[label,context&&context.kind,context&&context.primaryIntent,context&&context.blockTitle].filter(Boolean).join(' ');
  var n=coachNormalizeMoveText(raw);
  var T=window.COACH_MOVEMENT_TUNING;
  if(coachMatchesAnyTuningPattern(n, T.mainLoadKeywordPatterns))return true;
  if(coachMatchesAnyTuningPattern(coachNormalizeMoveText(label), T.mainLoadMovementPatterns)&&!isIsolationMovement(label))return true;
  return false;
}

function coachDeloadMultiplierForContext(label,context){
  var T=window.COACH_MOVEMENT_TUNING.deloadMultiplier;
  return coachIsMainLoadContext(label,context)?T.main:T.other;
}
```

- [ ] **Step 3: `scripts/charge/suggestion.js` — brancher les seuils dans `coachRuleLiftFromControlledHistory` (Task 3)**

Ajouter avant `coachRuleLiftFromControlledHistory` :

```js
function coachLiftFromHistoryThreshold(label){
  var n=coachNormalizeMoveText(label);
  var T=window.COACH_MOVEMENT_TUNING.liftFromHistoryThresholds;
  for(var i=0;i<T.overrides.length;i++){
    if(T.overrides[i].pattern.test(n))return T.overrides[i];
  }
  return T.default;
}
```

Remplacer le corps de `coachRuleLiftFromControlledHistory` :

```js
function coachRuleLiftFromControlledHistory(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&ctx.hist.length>=2){
    var gap=ctx.bestControlled.load-ctx.suggested;
    var thr=coachLiftFromHistoryThreshold(ctx.label);
    var allowLiftFromHistory=gap>=thr.gap
      && (thr.maxRpe==null || ctx.bestControlled.rpe<=thr.maxRpe)
      && !isIsolationMovement(ctx.label)
      && !isTechnicalMovementInContext(ctx.label,ctx.moveContext);
    if(allowLiftFromHistory){
      ctx.suggested=Math.min(ctx.bestControlled.load+coachMaxJumpForExercise(ctx.label,ctx.bestControlled.load), ctx.bestControlled.load+10);
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Historique reel controle detecte : "+ctx.bestControlled.load+" lb x "+ctx.bestControlled.reps+" @RPE "+ctx.bestControlled.rpe+". Le moteur evite de sous-suggerer sous une reference facile.";
      ctx.brainAdjusted=true;
    }
  }
}
```

Note : ce dernier changement ajoute les gardes `!isIsolationMovement` / `!isTechnicalMovementInContext` au cas "barbell row", qui ne les avait pas explicitement dans le code original (elles étaient implicites — barbell row ne peut matcher ni l'un ni l'autre). Le golden master (Step 4) est la preuve, pas une supposition : si un scénario divergeait, ce serait détecté immédiatement.

- [ ] **Step 4: Vérifier le golden master + suite complète**

Run: `node dev/charge_suggestion_golden_master.js`
Expected: `Golden master : 15 scenarios identiques. Refactor transparent.`

Run: `node dev/charge_engine_checks.js`
Run: `node dev/progression_contract_checks.js`
Run: `node dev/reference_seed_checks.js`
Run: `node dev/reference_seed_stress.js`
Run: `node dev/deload_guard_checks.js`
Run: `node dev/client_charge_safety_checks.js`
Run: `node dev/movement_swaps_checks.js`
Run: `node dev/prescription_checks.js`
Expected: identique à l'état avant Task 4.

- [ ] **Step 5: Commit**

```bash
git add scripts/charge/historique.js scripts/charge/suggestion.js
git commit -m "refactor(charge): brancher la table de tuning centralisee dans les fonctions consommatrices"
```

---

### Task 5: Règle durable anti-récidive

**Files:**
- Modify: `docs/STRUCTURE_CONTRACT.md` (section "Domaine charge")
- Modify: `CLAUDE.md` (§ 3.2, une ligne de référence)
- Create: `dev/movement_tuning_boundary_checks.js`

**Interfaces:**
- Produces: un check `dev/movement_tuning_boundary_checks.js` qui échoue si de nouvelles regex de noms de mouvement apparaissent dans `suggestion.js`/`historique.js` en dehors de `movement_tuning.js`, au-delà du nombre relevé juste après ce refactor.

- [ ] **Step 1: Ajouter la règle à `docs/STRUCTURE_CONTRACT.md`, à la fin de la section "## Domaine charge" (après la ligne sur `app.js` / `APP_VERSION`, avant "## Domaine session")**

```markdown
### Règle de tuning par mouvement

Tout seuil ou cas particulier propre à un mouvement (saut de charge max,
multiplicateur de deload, seuil de remontée depuis l'historique, mouvement
"principal"/"isolation"/"technique") vit dans
`scripts/charge/movement_tuning.js` (`window.COACH_MOVEMENT_TUNING`), jamais
comme une nouvelle regex ou un nouveau `if` inline dans `suggestion.js` ou
`historique.js`.

Avant d'ajouter une regex sur un nom de mouvement dans ces deux fichiers :
vérifier si une table existante dans `movement_tuning.js` peut l'accueillir
(ajouter une entrée à `overrides`) plutôt que d'écrire un nouveau test
inline. `dev/movement_tuning_boundary_checks.js` fait respecter cette règle
mécaniquement et doit passer avant toute livraison touchant ces fichiers.
```

- [ ] **Step 2: Référencer la règle depuis `CLAUDE.md` § 3.2**

Dans `CLAUDE.md`, section "3.2 Moteur de suggestion de charges — la symbiose", sous le tableau des couches, ajouter une ligne aux "Règles clés" existantes :

```markdown
- Tout seuil propre à un mouvement (regex de nom, saut max, multiplicateur…)
  va dans `scripts/charge/movement_tuning.js`, jamais en dur dans
  `suggestion.js`/`historique.js` — voir `docs/STRUCTURE_CONTRACT.md` §
  Domaine charge / Règle de tuning par mouvement.
```

- [ ] **Step 3: Écrire le garde-fou automatisé**

```js
#!/usr/bin/env node
/*
  Racine - garde-fou structurel : empeche l'ajout de nouvelles regex de noms
  de mouvement en dehors de scripts/charge/movement_tuning.js.
  Voir docs/STRUCTURE_CONTRACT.md — Domaine charge — Regle de tuning par mouvement.

  Usage :
    node dev/movement_tuning_boundary_checks.js
*/
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

// Fichiers surveilles : la logique de decision ne doit plus contenir de
// regex de nom de mouvement en dur. Le nombre autorise est fige juste apres
// le refactor de 2026-07-26 (voir le plan associe) ; toute regex de mouvement
// ajoutee au-dela doit d'abord passer par movement_tuning.js.
const watchedFiles = [
  'scripts/charge/suggestion.js',
  'scripts/charge/historique.js'
];
const allowedCount = {
  'scripts/charge/suggestion.js': 0,
  'scripts/charge/historique.js': 0
};

// Heuristique : une regex litterale utilisee comme test de nom de mouvement
// ressemble a /mot ou expression\s*(en minuscules)/ suivie de .test(
const movementRegexPattern = /\/[a-z][a-z0-9 |]*\/\.test\(/g;

let failed = 0;
watchedFiles.forEach(file => {
  const full = path.join(root, file);
  const src = fs.readFileSync(full, 'utf8');
  const matches = src.match(movementRegexPattern) || [];
  const count = matches.length;
  const allowed = allowedCount[file] || 0;
  if(count > allowed){
    failed++;
    console.error(file+' : '+count+' regex de mouvement inline detectee(s) (autorise : '+allowed+').');
    matches.forEach(m => console.error('  '+m));
    console.error('  -> deplacer ce seuil dans scripts/charge/movement_tuning.js (voir STRUCTURE_CONTRACT.md).');
  }
});

if(failed){
  console.error(failed+' fichier(s) en violation de la regle de tuning par mouvement.');
  process.exit(1);
}
console.log('Regle de tuning par mouvement respectee : aucune regex de mouvement hors movement_tuning.js.');
```

- [ ] **Step 4: Vérifier que le garde-fou passe sur l'état post-refactor**

Run: `node dev/movement_tuning_boundary_checks.js`
Expected: `Regle de tuning par mouvement respectee : aucune regex de mouvement hors movement_tuning.js.`
Si des occurrences résiduelles apparaissent (une regex non couverte par les Tasks 3-4), les migrer dans `movement_tuning.js` avant de continuer — ne pas augmenter `allowedCount` pour faire passer le check.

- [ ] **Step 5: Ajouter le nouveau check à `RELEASE_CHECKLIST.md`**

Dans `RELEASE_CHECKLIST.md`, ajouter à la liste des validations `dev/` obligatoires :

```
node dev/movement_tuning_boundary_checks.js
```

- [ ] **Step 6: Commit**

```bash
git add docs/STRUCTURE_CONTRACT.md CLAUDE.md dev/movement_tuning_boundary_checks.js RELEASE_CHECKLIST.md
git commit -m "docs(charge): regle durable de tuning par mouvement + garde-fou automatise"
```

---

### Task 6: Validation finale et décision de version

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Suite complète de validation charges**

Run, dans l'ordre :

```bash
node dev/charge_suggestion_golden_master.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/regression_checks.js --full
node dev/structure_checks.js --full
node dev/reference_seed_checks.js
node dev/reference_seed_stress.js
node dev/deload_guard_checks.js
node dev/client_charge_safety_checks.js
node dev/movement_swaps_checks.js
node dev/prescription_checks.js
node dev/movement_tuning_boundary_checks.js
```

Expected: toutes les commandes se terminent sans erreur (`process.exit(0)` implicite), et le golden master annonce `15 scenarios identiques`.

- [ ] **Step 2: Décision de version (CLAUDE.md § 4)**

Ce refactor ne change aucune sortie observable du moteur (confirmé par le golden master) : ce n'est ni un "changement livré visible", ni une "correction comportementale". Par défaut, donc, **pas d'incrément de version**, conformément à la ligne "nettoyage sans runtime" du tableau § 4 — mais ce refactor touche bien des fichiers runtime (`suggestion.js`, `historique.js`, nouveau `movement_tuning.js`), donc annoncer explicitement ce choix à l'utilisateur avant de conclure, et lui laisser trancher s'il préfère quand même un patch (`V4.5.21`) pour marquer le passage dans `CHANGELOG.md`. Ne pas décider seul en cas de doute (CLAUDE.md § 7).

- [ ] **Step 3: Rapport de clôture**

Résumer à l'utilisateur : nombre de regex de mouvement centralisées (avant/après), confirmation "comportement identique, garde-fous charges § 6 passés", et rappeler que `dev/movement_tuning_boundary_checks.js` doit désormais faire partie de la checklist de livraison.

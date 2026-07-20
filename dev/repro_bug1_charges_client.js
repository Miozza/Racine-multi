#!/usr/bin/env node
// Reproduction Bug 1 — charges aberrantes pour un profil client (≠ Bertin).
// Charge les VRAIS fichiers du moteur + les lignes verbatim d'app.js
// (PR_FIELD_MAP + prCfgMatchesResult) dans un contexte vm, puis simule
// l'onboarding d'un client faible avec deux corruptions de données réalistes.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = require('path').resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }

function buildContext(){
  const context = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout(fn){ if(typeof fn === 'function') fn(); },
    clearTimeout(){},
    document:{getElementById(){ return null; }},
    navigator:{},
    localStorage:{_s:{},getItem(k){return this._s[k]||null;},setItem(k,v){this._s[k]=String(v);},removeItem(k){delete this._s[k];}},
    APP_VERSION:'REPRO',
    customCharges:{},
    CHARGE_ORDER:[],
    state:{week:1,day:'lundi',profile:null,rpeHistory:{},athleteState:{movements:{}},history:[],movementRefs:{}},
    save(){},
    focus(){return {label:'test',targetReps:{0:8}};},
    buildWeekInfo(){return {};},
    weekIdx(){return 0;},
    collectSessionExercises(){return [];},
    parseTargetReps(format,fallback){return {min:fallback||8,max:fallback||8};}
  };
  context.window = context;
  context.globalThis = context;
  // Fichiers réels, ordre de chargement de l'app.
  [
    'scripts/profiles/reference.js',
    'programs/config.js',           // defaultProfile + movements (vrai mapping)
    'data/charges.js',              // DEFAULT_CHARGES (lecture seule, non modifié)
    'scripts/profiles/onboarding.js',
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
  ].forEach(f => vm.runInNewContext(read(f), context, {filename:f}));
  // PR_FIELD_MAP (app.js:1720-1733) + normalizePrCompareName/prCfgMatchesResult
  // (app.js:1807-1841) — extraits verbatim du fichier réel.
  const app = read('app.js').split('\n');
  const slice = (a,b) => app.slice(a-1, b).join('\n');
  vm.runInNewContext(slice(1720,1733), context, {filename:'app.js#PR_FIELD_MAP'});
  vm.runInNewContext(slice(1807,1841), context, {filename:'app.js#prCfgMatchesResult'});
  return context;
}

function suggest(ctx, name, programLoad, reps){
  const d = ctx.guardedSuggestedLoadDecision(name, programLoad, reps, {kind:'main'});
  return d.loadNum + ' lb  (texte: "' + d.loadText + '")';
}

// ── Client faible type "Christian" : débutant, tests légers ────────────────
const answers = {
  squat: {weight:115, reps:8, rpe:8},
  bench: {weight:95,  reps:8, rpe:8},
  press: {weight:55,  reps:8, rpe:8},
  row:   {weight:85,  reps:8, rpe:8},
  hinge: {weight:40,  reps:8, rpe:8}
};

console.log('════ Scénario 0 — profil client SAIN (référence attendue) ════');
{
  const ctx = buildContext();
  const computed = ctx.CoachOnboarding.computeFromAnswers(answers, 'debutant');
  ctx.state.profile = {onboarded:true, name:'Client', experienceLevel:'debutant',
    aggressiveness:0.7, scaleRatios: computed.ratios};
  console.log('ratios sains:', JSON.stringify(computed.ratios, (k,v)=>typeof v==='number'?+v.toFixed(3):v));
  console.log('  Bench Press (prog 205 lb):', suggest(ctx,'Bench Press','205 lb',10));
  console.log('  DB Fly      (prog 35 lb): ', suggest(ctx,'DB Fly','35 lb',12));
  console.log('  Lat Pulldown(prog 140 lb):', suggest(ctx,'Lat Pulldown','140 lb',10));
  console.log('  Barbell Curl(prog 75 lb): ', suggest(ctx,'Barbell Curl','75 lb',10));
}

console.log('\n════ Scénario A — champ "Bench press" VIDÉ à l\'écran de revue ════');
console.log('(historique : ui.js:489 acceptait Number("")=0 → ratio 0 → scaling désactivé.');
console.log(' Corrigé : ui.js rejette vide/0, et ratiosFromValues + coachUserLoadRatio');
console.log(' traitent un 0 résiduel comme absent → fallback du niveau. Attendu : valeurs saines.)');
{
  const ctx = buildContext();
  const computed = ctx.CoachOnboarding.computeFromAnswers(answers, 'debutant');
  // Simulation exacte du handler ui.js:487-491 sur un champ vidé :
  const v = Number('');            // = 0
  if(!isNaN(v)) computed.values.bench = v;   // accepté !
  const ratios = ctx.CoachOnboarding.ratiosFromValues(computed.values, 'debutant');
  ctx.state.profile = {onboarded:true, name:'Client', experienceLevel:'debutant',
    aggressiveness:0.7, scaleRatios: ratios};
  console.log('ratios obtenus:', JSON.stringify(ratios, (k,v)=>typeof v==='number'?+v.toFixed(3):v));
  if(ratios.bench === 0) throw new Error('REGRESSION : ratiosFromValues produit encore un ratio 0');
  console.log('  Bench Press (prog 205 lb):', suggest(ctx,'Bench Press','205 lb',10), ' ← fallback niveau, plus de 205 lb brut');
  console.log('  DB Fly      (prog 35 lb): ', suggest(ctx,'DB Fly','35 lb',12), ' ← moyenne _upperPush préservée');
  console.log('  Incline DB  (prog 70 lb): ', suggest(ctx,'Incline DB Press','70 lb',10));
}

console.log('\n════ Scénario B — latPulldown10RM saisi à l\'échelle machine (120 lb) ════');
console.log('(réf V2 = 20 lb de LEST en traction ; 120/20 = ratio 6. Corrigé : les ratios');
console.log(' > 2.0 sont exclus des moyennes de famille, et tout ratio utilisé est borné');
console.log(' à [0.25, 1.6] au point d\'usage. Attendu : _upperPull sain.)');
{
  const ctx = buildContext();
  const computed = ctx.CoachOnboarding.computeFromAnswers(answers, 'debutant');
  computed.values.latPulldown10RM = 120;   // valeur machine entrée par erreur
  const ratios = ctx.CoachOnboarding.ratiosFromValues(computed.values, 'debutant');
  ctx.state.profile = {onboarded:true, name:'Client', experienceLevel:'debutant',
    aggressiveness:0.7, scaleRatios: ratios};
  console.log('ratios obtenus:', JSON.stringify(ratios, (k,v)=>typeof v==='number'?+v.toFixed(3):v));
  if(ratios._upperPull > 2.0) throw new Error('REGRESSION : _upperPull encore empoisonné par un ratio trans-échelle');
  console.log('  Lat Pulldown(prog 140 lb):', suggest(ctx,'Lat Pulldown','140 lb',10), ' ← famille _upperPull ×'+ratios._upperPull.toFixed(2));
  console.log('  Barbell Curl(prog 75 lb): ', suggest(ctx,'Barbell Curl','75 lb',10));
  console.log('  Barbell Row (prog 165 lb):', suggest(ctx,'Barbell Row','165 lb',10), ' ← direct row8RM, non touché');
}

console.log('\n════ Scénario C — cas réel « Deadlift 600 lb » (dbRdl à l\'échelle barre) ════');
console.log('(Test chaîne postérieure = DB RDL par main, réf 75. Saisi ~185 lb à l\'échelle');
console.log(' barre → ratio 2.45, propagé au Hip Thrust dérivé → _hinge 2.45 → Deadlift');
console.log(' jeudi 245 lb × 2.45 = 600 lb. PR 1RM réel du client : 375.)');
{
  // C1 — ratios recalculés APRÈS correctif (nouvelle calibration / revue) :
  // les deux composantes > 2.0 sont exclues → _hinge retombe sur le niveau.
  const ctx = buildContext();
  const computed = ctx.CoachOnboarding.computeFromAnswers(answers, 'debutant');
  computed.values.dbRdl = 185;                                    // échelle barre saisie par erreur
  computed.values.hipThrust8RM = Math.round(315 * (185/75)/5)*5;  // dérivé proportionnel contaminé
  const ratios = ctx.CoachOnboarding.ratiosFromValues(computed.values, 'debutant');
  ctx.state.profile = {onboarded:true, name:'Client', experienceLevel:'debutant',
    aggressiveness:0.7, scaleRatios: ratios};
  console.log('C1 ratios recalculés: _hinge =', +ratios._hinge.toFixed(3));
  if(ratios._hinge > 2.0) throw new Error('REGRESSION : _hinge encore empoisonné');
  const d1 = ctx.guardedSuggestedLoadDecision('Deadlift','245 lb',8,{kind:'main'});
  console.log('  Deadlift (prog 245 lb):', d1.loadNum + ' lb');
  if(d1.loadNum >= 400) throw new Error('REGRESSION : Deadlift aberrant avec ratios recalculés');

  // C2 — ratios corrompus déjà STOCKÉS (profil calibré avant le correctif) :
  // le clamp [0.25, 1.6] au point d'usage borne les dégâts (245×1.6=392→390),
  // plus jamais 600. La vraie correction reste la recalibration du profil.
  const ctx2 = buildContext();
  ctx2.state.profile = {onboarded:true, name:'Client', experienceLevel:'debutant',
    aggressiveness:0.7, scaleRatios: {_hinge: 2.449, _overall: 1.1}};
  const d2 = ctx2.guardedSuggestedLoadDecision('Deadlift','245 lb',8,{kind:'main'});
  console.log('C2 ratios stockés corrompus (_hinge 2.449) → Deadlift:', d2.loadNum + ' lb  (borné, plus jamais 600)');
  if(d2.loadNum > 245 * 1.6) throw new Error('REGRESSION : clamp au point d\'usage inopérant');
}

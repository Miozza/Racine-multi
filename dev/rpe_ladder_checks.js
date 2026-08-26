#!/usr/bin/env node
/*
  Racine - garde-fou du barreau RPE et du seuil de confiance (V4.6.8).

  Deux contrats, chacun contre un defaut mesure sur le moteur livre.

  1. LES CRANS DU BARREAU PASSENT TOUJOURS — LES BONUS NON.

     Le barreau RPE annoncait des crans qu'il ne pouvait pas donner. Sur une
     isolation, maxJumpBase vaut UN cran nominal et jumpFactor vaut 1 : le rung
     « 2 crans a RPE <= 6 » etait systematiquement rabote a un seul. Mesure
     avant correctif, Lateral Raise DB a 20 lb : RPE 6 et RPE 7,5 donnaient
     tous deux +2,5 lb — le RPE ne portait aucune information, exactement le
     defaut que ce barreau existe pour corriger.

     Le rack fait loi parce qu'un cran d'equipement est la plus petite
     progression qui existe reellement : un plafond en pourcentage qui
     l'interdit ne protege pas, il fige. Deux crans d'haltere font toujours
     plus de 15 % (20 -> 25 = +25 %), donc le plafond relatif interdisait ce
     rung a TOUTES les charges, pas seulement aux legeres.

     La contrepartie est ce que ce script protege surtout : les crans BONUS de
     la reactivite (tendance, reps depassees) restent sous le saut maximal
     prudent. Sans elle, trois signaux positifs se multiplient et 20 lb mene a
     40 lb en une seance sur la foi d'un seul RPE 6. Si un jour ce test tombe
     sur le cas « bonus », c'est que la regle a ete elargie sans le vouloir.

  2. UN SEUL SEUIL DE CONFIANCE.

     brainGate.confidenceFloor pilote les TROIS prudences que Brain declenche
     ensemble : exiger plus de confirmations, afficher « incertain », amortir
     la hausse au portail. Elles etaient en dur a trois endroits pendant que la
     table en declarait une quatrieme que personne ne lisait.

  Usage :
    node dev/rpe_ladder_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

let checks = 0, failed = 0;
function assert(cond, msg){
  checks++;
  if(!cond){ failed++; console.error(' ✗ ' + msg); }
}

function makeContext(){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN,
    setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
    clearTimeout: function(){},
    document: { getElementById: function(){ return null; } },
    navigator: {},
    localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
    APP_VERSION: 'TEST', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
    state: { week:3, day:'mardi', rpeHistory:{}, athleteState:{ movements:{} },
             profile:{ onboarded:true, scaleRatios:{_overall:1} } },
    save: function(){},
    focus: function(){ return {label:'test', targetReps:{}}; },
    buildWeekInfo: function(){ return {}; },
    weekIdx: function(){ return 2; },
    collectSessionExercises: function(){ return []; },
    parseTargetReps: function(f, fb){ return {min: fb||8, max: fb||8}; }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ['scripts/app_helpers.js','scripts/charge/equipement.js','scripts/charge/movement_tuning.js',
   'scripts/charge/tuning_override.js','scripts/charge/utilitaires.js','scripts/charge/mouvements.js',
   'scripts/charge/rpe.js','scripts/charge/historique.js','scripts/charge/scaling.js',
   'scripts/charge/brain_stats.js','scripts/charge/brain_memory.js','scripts/charge/brain_journal.js',
   'scripts/charge/ceiling.js','scripts/charge/suggestion.js']
    .forEach(f => vm.runInNewContext(read(f), ctx, { filename: f }));
  return ctx;
}

const ctx = makeContext();
function setMv(label, rows){
  ctx.state.athleteState.movements[label] = {
    history: rows.map((r,i) => ({date:'2026-01-0'+(i+1), reps:r.reps, rpe:r.rpe, load:r.load})),
    ranges: {}
  };
}
function suggest(label, programLoad, target){
  return ctx.guardedSuggestedLoadDecision(label, programLoad, target, {}).loadNum;
}
function flat(label, load, rpe, reps, n){
  ctx.state.athleteState.movements = {};
  const rows = [];
  for(let i=0;i<(n||2);i++) rows.push({reps:reps, rpe:rpe, load:load});
  setMv(label, rows);
}

// ─── 1. Les crans annonces par le barreau sont atteignables ────────────────
// Le rack de l'app : ... 20, 22.5, 25 ... Deux crans depuis 20 = 25.
flat('Lateral Raise DB', 20, 6, 12);
assert(suggest('Lateral Raise DB','20 lb',12) === 25,
  'Isolation a RPE 6 : les 2 crans annonces par le barreau sont donnes (25 lb).');

flat('Lateral Raise DB', 20, 7, 12);
assert(suggest('Lateral Raise DB','20 lb',12) === 22.5,
  'Isolation a RPE 7 : un seul cran, comme avant (22,5 lb).');

flat('Lateral Raise DB', 20, 7.5, 12);
assert(suggest('Lateral Raise DB','20 lb',12) === 22.5,
  'Isolation a RPE 7,5 : un seul cran (22,5 lb).');

flat('Lateral Raise DB', 20, 8, 12);
assert(suggest('Lateral Raise DB','20 lb',12) === 20,
  'Isolation a RPE 8 : aucune hausse, le barreau est a zero cran.');

// Le RPE porte enfin une information : 6 et 7,5 ne donnent plus la meme chose.
flat('Lateral Raise DB', 20, 6, 12);
const at6 = suggest('Lateral Raise DB','20 lb',12);
flat('Lateral Raise DB', 20, 7.5, 12);
const at75 = suggest('Lateral Raise DB','20 lb',12);
assert(at6 > at75,
  'RPE 6 et RPE 7,5 ne donnent plus la meme charge sur une isolation ('+at6+' vs '+at75+').');

// ─── 2. Les crans BONUS de la reactivite restent bridés ────────────────────
// Tendance qui s'ameliore (RPE 8 -> 7 -> 6) ET reps doublees : la reactivite
// ajoute 3 crans au barreau. Sans plafond, 20 lb menerait a 40 lb.
ctx.state.athleteState.movements = {};
setMv('Lateral Raise DB', [
  {reps:12, rpe:8, load:20},
  {reps:12, rpe:7, load:20},
  {reps:24, rpe:6, load:20}
]);
const hist = ctx.state.athleteState.movements['Lateral Raise DB'].history;
const react = ctx.coachRpeReactivityShift(hist, 20, 24, 12);
const rung = ctx.coachRpeProgressionRung('Lateral Raise DB', 6);
assert(react.shift > 0, 'Le scenario declenche bien des crans bonus (+' + react.shift + ').');
assert(ctx.coachNextLoadSteps('Lateral Raise DB', 20, rung.steps + react.shift, '20 lb') > 25,
  'Sans plafond, barreau + bonus depasserait les 2 crans du barreau.');
assert(suggest('Lateral Raise DB','20 lb',12) === 25,
  'Barreau + bonus reste rabote aux crans du BARREAU seul (25 lb, pas 40).');

// ─── 3. Les barres ne bougent pas ──────────────────────────────────────────
// Le saut maximal ne mordait deja pas la : le correctif ne doit rien y changer.
flat('Back Squat', 185, 6, 5);
assert(suggest('Back Squat','185 lb',5) === 200,
  'Barre a RPE 6 : comportement inchange (200 lb).');
flat('Back Squat', 185, 7, 5);
assert(suggest('Back Squat','185 lb',5) === 190,
  'Barre a RPE 7 : comportement inchange (190 lb).');

// ─── 3bis. Zero est une charge valide ──────────────────────────────────────
// Sur un Weighted Pull-up, le poids du corps seul (0 lb de lest) est un point
// de depart legitime. Un plafond qui refuse lastLoad === 0 gele le lest a zero
// pour toujours : regression reelle introduite puis corrigee en V4.6.8, relevee
// par dev/simulate_multi_users.js (profil strict_mu_candidate, une suggestion
// de 10 lb retombee a 0) alors que tous les tests unitaires passaient.
assert(ctx.coachRpeMaxAllowedLoad('Weighted Pull-up', 0, {steps:1, jumpFactor:1}, '0 lb') > 0,
  'Depuis 0 lb de lest, le plafond laisse une hausse possible (0 est une charge, pas une absence).');
assert(ctx.coachRpeMaxAllowedLoad('Back Squat', NaN, {steps:1, jumpFactor:1}, '') === 0,
  'Une charge illisible ne fabrique aucun plafond.');

// ─── 4. Le plafond ne descend jamais sous un cran ──────────────────────────
// Contrat anterieur (V4.5.56) toujours vrai : un plafond plus petit que le plus
// petit cran du rack figerait le mouvement au lieu de le proteger.
const oneStep = ctx.nextLoadForExercise('Lateral Raise DB', 20, 1, '20 lb');
assert(ctx.coachRpeMaxAllowedLoad('Lateral Raise DB', 20, {steps:0, jumpFactor:1}, '20 lb') >= oneStep,
  'Meme a zero cran annonce, le plafond reste au moins au cran suivant du rack.');

// ─── 5. Un seul seuil de confiance, lu dans la table ───────────────────────
const T = ctx.window.COACH_MOVEMENT_TUNING;
assert(typeof ctx.coachBrainConfidenceFloor === 'function',
  'Le seuil de confiance est lu par une fonction, pas ecrit en dur.');
assert(ctx.coachBrainConfidenceFloor() === T.brainGate.confidenceFloor,
  'La fonction rend exactement ce que declare la table.');
ctx.window.CoachTuningOverride.set('brainGate.confidenceFloor', 0.90);
assert(ctx.coachBrainConfidenceFloor() === 0.90,
  'Deplacer la table deplace le seuil : la ligne n\'est plus declarative.');
ctx.window.CoachTuningOverride.reset();
assert(ctx.coachBrainConfidenceFloor() === 0.65,
  'Retour a l\'usine : le seuil livre revient exactement.');

const src = read('scripts/charge/brain_stats.js');
assert(!/confidence\s*<\s*0\.65/.test(src) && !/confidenceRaw\s*<\s*0\.65/.test(src),
  'Plus aucun 0,65 en dur sur la confiance dans brain_stats.js.');
assert((src.match(/coachBrainConfidenceFloor\(\)/g) || []).length >= 3,
  'Les trois prudences lisent le meme seuil (confirmations, statut, portail).');

if(failed){
  console.error('\nÉCHEC rpe_ladder_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK rpe_ladder_checks.js — ' + checks + ' controles.');

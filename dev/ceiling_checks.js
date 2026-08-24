#!/usr/bin/env node
/*
  Racine - garde-fou du plafond de progression (scripts/charge/ceiling.js).

  Ce que ce script epingle : le CONTRAT du plafond, pas ses chiffres.
    · un plafond ne se declare jamais en livres dans le code : il se deduit
      de deux signaux qui doivent tenir ENSEMBLE (pointe stable + effort eleve);
    · un seul des deux signaux ne suffit pas, dans un sens comme dans l'autre;
    · ce qui se deduit d'un comportement se defait quand il change;
    · un plafond ne fait jamais redescendre sous une charge deja validee;
    · les contextes qui ne progressent pas seuls (technique/WOD, deload) ne
      recoivent pas de plafond — l'explication du (!) leur appartient;
    · un plafond manuel s'applique sans historique et prime la deduction;
    · baisser un seuil dans la calibration du profil deplace le plafond.

  Les seuils eux-memes (3 seances, RPE 8...) vivent dans movement_tuning.js et
  peuvent bouger : les assertions lisent la table, elles ne recopient pas ses
  valeurs. Voir docs/superpowers/plans/2026-08-24-plafond-et-surcharge-tuning.md.

  Usage :
    node dev/ceiling_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

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
  DEFAULT_CHARGES: { 'Back Squat':'185 lb', 'Lateral Raise DB':'20 lb', 'Seated Cable Row':'120 lb' },
  CHARGE_ORDER: [],
  movements: {},
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

[
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/movement_tuning.js',
  'scripts/charge/tuning_override.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js',
  'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js',
  'scripts/charge/ceiling.js',
  'scripts/charge/suggestion.js'
].forEach(file => vm.runInNewContext(read(file), ctx, { filename: file }));

let checks = 0, failed = 0;
function assert(cond, msg){
  checks++;
  if(!cond){ failed++; console.error(' ✗ ' + msg); }
}
function rows(list){
  return list.map((r, i) => ({date:'2026-0'+(1+Math.floor(i/9))+'-'+String((i%9)+1).padStart(2,'0'), reps:r.reps||8, rpe:r.rpe, load:r.load, status:r.status}));
}
function setMovement(label, history){
  ctx.state.athleteState.movements[label] = { history: rows(history), ranges: {} };
}
function repeat(n, row){ const out=[]; for(let i=0;i<n;i++) out.push(Object.assign({}, row)); return out; }
function freshCtx(over){
  return Object.assign({
    label:'Lateral Raise DB', hist:[], moveContext:null, suggested:0,
    severity:'ok', mode:'nearest', reason:'', contextLimited:false, isDeload:false,
    brainAdjusted:false
  }, over||{});
}

// ─── 1. Configuration ──────────────────────────────────────────────────────
const T = ctx.window.COACH_MOVEMENT_TUNING;
const C = T.ceiling;
assert(!!C, 'movement_tuning.js doit porter un bloc ceiling.');
assert(C.enabled === true, 'Le plafond est actif par defaut.');
assert(Number(C.window) > 0, 'Le plafond regarde une fenetre d\'historique bornee.');
assert(Number(C.plateauTolerance) >= 0 && Number(C.plateauTolerance) < 0.2, 'La tolerance de palier reste une tolerance, pas une plage.');
assert(Number(C.releaseRpeDrop) > 0, 'Un plafond deduit doit pouvoir se defaire (releaseRpeDrop).');
['isolation','accessory','main'].forEach(fam => {
  const r = C.families[fam];
  assert(!!r, 'Famille de plafond declaree : ' + fam);
  assert(Number(r.minStagnant) >= 2, fam + ' : au moins deux seances avant de parler de stagnation.');
  assert(Number(r.minRpe) >= 6 && Number(r.minRpe) <= 10, fam + ' : le seuil d\'effort reste dans l\'echelle RPE.');
  assert(Number(r.minHardRows) >= 1, fam + ' : au moins une serie chere exigee.');
});
assert(C.families.main.minStagnant > C.families.isolation.minStagnant,
  'Un mouvement principal exige plus de preuves qu\'une isolation avant de plafonner.');
assert(C.families.main.minRpe >= C.families.accessory.minRpe,
  'Le seuil d\'effort d\'un principal n\'est pas plus laxiste que celui d\'un accessoire.');
assert(C.families.accessory.minStagnant >= C.families.isolation.minStagnant,
  'Un accessoire plafonne moins vite qu\'une isolation.');
assert(C.manual && Object.keys(C.manual).length === 0,
  'Aucun plafond n\'est livre en dur : la table manuelle part vide.');
assert(!/\bceiling\b[\s\S]{0,400}?\b(load|lb)\s*:\s*\d/.test(read('scripts/charge/ceiling.js')),
  'ceiling.js ne doit contenir aucune charge de plafond ecrite en dur.');

// ─── 2. Famille par mouvement ──────────────────────────────────────────────
assert(ctx.coachCeilingFamilyForMovement('Lateral Raise DB', null) === 'isolation', 'Lateral Raise = isolation.');
assert(ctx.coachCeilingFamilyForMovement('Cable Curl', null) === 'isolation', 'Curl = isolation.');
assert(ctx.coachCeilingFamilyForMovement('Back Squat', null) === 'main', 'Back Squat = mouvement principal.');
assert(ctx.coachCeilingFamilyForMovement('Deadlift', null) === 'main', 'Deadlift = mouvement principal.');
assert(ctx.coachCeilingFamilyForMovement('Seated Cable Row', null) === 'accessory', 'Seated Cable Row = accessoire.');

// ─── 3. Deduction : les deux signaux, ensemble ─────────────────────────────
const isoRule = C.families.isolation;
const hardIso = repeat(isoRule.minStagnant, {load:30, rpe:isoRule.minRpe, reps:12});

assert(ctx.coachDeduceCeiling('Lateral Raise DB', rows([]), null) === null,
  'Aucun plafond sans historique.');
assert(ctx.coachDeduceCeiling('Lateral Raise DB', rows(repeat(isoRule.minStagnant - 1, {load:30, rpe:isoRule.minRpe})), null) === null,
  'Aucun plafond avant le nombre de seances exige.');
assert(ctx.coachDeduceCeiling('Lateral Raise DB', rows(repeat(isoRule.minStagnant + 2, {load:30, rpe:6})), null) === null,
  'Pointe stable mais effort bas : pas un plafond, un programme qui ne demande pas plus.');

// Un seul RPE cher au palier ne fait pas un plafond : une mauvaise journee
// n'est pas une asymptote. C'est `minHardRows` qui le dit, et c'est distinct
// de la sortie de plafond (`releaseRpeDrop`) testee plus bas — le dernier
// point ci-dessous est cher, donc la sortie ne s'applique pas.
const oneHardRow = repeat(isoRule.minStagnant - 1, {load:30, rpe:isoRule.minRpe - C.releaseRpeDrop + 0.5})
  .concat([{load:30, rpe:isoRule.minRpe}]);
assert(isoRule.minHardRows < 2 || ctx.coachDeduceCeiling('Lateral Raise DB', rows(oneHardRow), null) === null,
  'Une seule serie chere au palier ne suffit pas a declarer un plafond.');

const climbing = rows([{load:20, rpe:9},{load:25, rpe:9},{load:30, rpe:9}]);
assert(ctx.coachDeduceCeiling('Lateral Raise DB', climbing, null) === null,
  'Effort eleve mais progression en cours : pas un plafond, une seance dure.');

// Meme piege, mais avec assez d'historique ET assez de series cheres pour que
// seule la STAGNATION manque : la pointe vient d'etre atteinte, deux fois, a
// RPE eleve. C'est une montee qui coute cher, pas une fin de progression.
const justReachedPeak = repeat(isoRule.minStagnant, {load:20, rpe:isoRule.minRpe})
  .concat(repeat(Math.max(2, isoRule.minHardRows), {load:30, rpe:isoRule.minRpe}));
assert(isoRule.minStagnant <= Math.max(2, isoRule.minHardRows)
  || ctx.coachDeduceCeiling('Lateral Raise DB', rows(justReachedPeak), null) === null,
  'Une pointe atteinte a l\'instant ne plafonne pas, meme payee cher.');

const deduced = ctx.coachDeduceCeiling('Lateral Raise DB', rows(hardIso), null);
assert(!!deduced, 'Pointe stable + effort eleve = plafond deduit.');
assert(deduced && deduced.load === 30, 'Le plafond deduit vaut la pointe observee.');
assert(deduced && deduced.manual === false, 'Un plafond deduit ne se presente pas comme manuel.');
assert(deduced && deduced.family === 'isolation', 'Le plafond porte la famille du mouvement.');
assert(deduced && deduced.stagnant >= isoRule.minStagnant, 'Le plafond compte les seances sans progres.');
assert(deduced && deduced.hardRows >= isoRule.minHardRows, 'Le plafond compte les series cheres au palier.');

// Meme historique, mouvement principal : le seuil est plus exigeant.
assert(ctx.coachDeduceCeiling('Back Squat', rows(hardIso), null) === null,
  'Un mouvement principal ne plafonne pas sur l\'historique qui suffit a une isolation.');
const mainRule = C.families.main;
const hardMain = repeat(mainRule.minStagnant, {load:315, rpe:mainRule.minRpe});
assert(!!ctx.coachDeduceCeiling('Back Squat', rows(hardMain), null),
  'Avec assez de preuves, un mouvement principal plafonne aussi.');

// Sortie de plafond : la derniere serie au palier redevient bon marche.
const released = hardIso.slice();
released.push({load:30, rpe:isoRule.minRpe - C.releaseRpeDrop, reps:12});
assert(ctx.coachDeduceCeiling('Lateral Raise DB', rows(released), null) === null,
  'Une serie nettement moins chere au palier rouvre le plafond.');
const stillHard = hardIso.slice();
stillHard.push({load:30, rpe:isoRule.minRpe, reps:12});
assert(!!ctx.coachDeduceCeiling('Lateral Raise DB', rows(stillHard), null),
  'Tant que le palier coute cher, le plafond tient.');

// Tolerance de palier et fenetre.
const nearPeak = repeat(isoRule.minStagnant - 1, {load:30, rpe:isoRule.minRpe});
nearPeak.unshift({load:30 * (1 - C.plateauTolerance / 2), rpe:isoRule.minRpe});
assert(!!ctx.coachDeduceCeiling('Lateral Raise DB', rows(nearPeak), null),
  'Une charge a un cheveu de la pointe compte comme le meme palier.');
const oldPeak = [{load:60, rpe:5}].concat(repeat(C.window, {load:30, rpe:isoRule.minRpe}));
const oldDeduced = ctx.coachDeduceCeiling('Lateral Raise DB', rows(oldPeak), null);
assert(oldDeduced && oldDeduced.load === 30,
  'Hors fenetre, une vieille pointe ne gouverne plus le plafond.');

// ─── 4. Plafond manuel ─────────────────────────────────────────────────────
C.manual = {'Lateral Raise DB': 25};
assert(ctx.coachCeilingManualLoad('Lateral Raise DB') === 25, 'Un plafond manuel est lu tel quel.');
assert(ctx.coachCeilingManualLoad('lateral raise db') === 25, 'Le nom du plafond manuel est compare normalise.');
assert(ctx.coachCeilingManualLoad('Back Squat') === null, 'Un plafond manuel ne deborde pas sur un autre mouvement.');
const manualNoHistory = ctx.coachCeilingForMovement('Lateral Raise DB', rows([]), null);
assert(manualNoHistory && manualNoHistory.load === 25 && manualNoHistory.manual === true,
  'Un plafond manuel s\'applique sans le moindre historique.');
const manualOverDeduced = ctx.coachCeilingForMovement('Lateral Raise DB', rows(hardIso), null);
assert(manualOverDeduced && manualOverDeduced.load === 25,
  'Le plafond manuel prime la deduction (l\'athlete en sait plus que la fenetre).');
C.manual = {};
assert(ctx.coachCeilingManualLoad('Lateral Raise DB') === null, 'Table manuelle videe : plus aucun plafond manuel.');

// ─── 5. La regle dans le pipeline ──────────────────────────────────────────
let rc = freshCtx({hist: rows(hardIso), suggested: 45});
ctx.coachRuleCeilingCap(rc);
assert(rc.suggested === 30, 'La regle rabat la suggestion sur le plafond.');
assert(rc.severity === 'watch', 'Un plafond leve une surveillance, pas une alerte rouge.');
assert(rc.brainAdjusted === true, 'Le plafond est une intervention de Brain, tracee comme telle.');
assert(/repetitions/i.test(rc.reason), 'L\'explication (!) dit par ou passe la progression : les repetitions.');
assert(/30/.test(rc.reason), 'L\'explication (!) donne la charge du plafond.');
assert(!!rc.ceilingApplied, 'Le contexte garde la trace du plafond applique.');

rc = freshCtx({hist: rows(hardIso), suggested: 25});
ctx.coachRuleCeilingCap(rc);
assert(rc.suggested === 25, 'Un plafond ne fait jamais redescendre une suggestion deja sous lui.');
assert(rc.severity === 'ok', 'Sans effet, le plafond ne touche pas la severite.');

rc = freshCtx({hist: rows(hardIso), suggested: 45, contextLimited:true});
ctx.coachRuleCeilingCap(rc);
assert(rc.suggested === 45, 'Contexte limite (technique/WOD) : le plafond laisse la main.');

rc = freshCtx({hist: rows(hardIso), suggested: 45, isDeload:true});
ctx.coachRuleCeilingCap(rc);
assert(rc.suggested === 45, 'Semaine de deload : le cap de deload explique deja la charge.');

rc = freshCtx({label:'Back Squat', hist: rows(hardIso), suggested: 200});
ctx.coachRuleCeilingCap(rc);
assert(rc.suggested === 200, 'Aucun plafond deduit : la regle ne fait rien.');

// ─── 6. Bout en bout, par le moteur complet ────────────────────────────────
ctx.state.athleteState.movements = {};
setMovement('Lateral Raise DB', hardIso.map(r => ({load:r.load, rpe:r.rpe, reps:12})));
const capped = ctx.guardedSuggestedLoadDecision('Lateral Raise DB', '45 lb', 12, {});
assert(capped.loadNum <= 30, 'Le moteur complet ne propose plus au-dessus du plafond (' + capped.loadNum + ').');
assert(/plafond/i.test(capped.reason), 'La decision finale explique le plafond.');

ctx.state.athleteState.movements = {};
setMovement('Lateral Raise DB', [{load:20, rpe:6, reps:12},{load:20, rpe:6, reps:12}]);
const free = ctx.guardedSuggestedLoadDecision('Lateral Raise DB', '20 lb', 12, {});
assert(free.loadNum >= 20, 'Sans plafond, la progression normale continue (' + free.loadNum + ').');
assert(!/plafond/i.test(free.reason), 'Sans plafond, aucune explication de plafond.');

// ─── 7. Lien avec la calibration par profil ────────────────────────────────
const O = ctx.window.CoachTuningOverride;
const shortIso = repeat(2, {load:30, rpe:isoRule.minRpe});
assert(ctx.coachDeduceCeiling('Lateral Raise DB', rows(shortIso), null) === null,
  'Deux seances ne suffisent pas au reglage d\'usine.');
O.set('ceiling.families.isolation.minStagnant', 2);
assert(C.families.isolation.minStagnant === 2, 'La calibration du profil deplace bien le seuil dans la table vivante.');
assert(!!ctx.coachDeduceCeiling('Lateral Raise DB', rows(shortIso), null),
  'Seuil abaisse : le plafond apparait plus tot, sans toucher au moteur.');
O.reset();
assert(C.families.isolation.minStagnant === isoRule.minStagnant, 'Retour a l\'usine : le seuil d\'origine revient.');
assert(ctx.coachDeduceCeiling('Lateral Raise DB', rows(shortIso), null) === null,
  'Et le comportement d\'usine revient avec lui.');

if(failed){
  console.error('\nÉCHEC ceiling_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK ceiling_checks.js — ' + checks + ' controles.');

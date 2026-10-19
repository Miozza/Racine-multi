#!/usr/bin/env node
/*
  Racine — garde-fou de la couche Brain V1.16 (coachSafeSuggestedLoad,
  scripts/charge/suggestion.js) et de la trace qui doit la montrer.

  Cas d'origine (V5.2.31, profil Bertin, Pont Peak S4 lundi) : Back Squat
  5×3 RPE 8, programme 250 lb ramene a 220 par le moteur principal. La couche
  V1.16 relisait l'historique BRUT, prenait le test 300 × 1 @9,5 pour la
  derniere charge de travail et affichait 305 lb — 98 % de l'e1RM — pendant que
  la trace disait 220.

  Usage :
    node dev/brain_v116_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [], notes = [];
const assert = (c, m) => (c ? notes : errors).push(m);

function engine(tuning){
  const C = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    WeakMap, Map, Set, parseInt, parseFloat, isNaN, isFinite,
    setTimeout(){}, clearTimeout(){}, document:{getElementById:()=>null}, navigator:{},
    localStorage:{_s:{}, getItem(k){ return this._s[k] || null; }, setItem(k,v){ this._s[k] = String(v); }, removeItem(k){ delete this._s[k]; }},
    APP_VERSION:'TEST', customCharges:{}, DEFAULT_CHARGES:{}, CHARGE_ORDER:[],
    movements:{backSquat:{name:'Back Squat', profile:'backSquat5RM'}},
    state:{week:4, day:'lundi', rpeHistory:{}, athleteState:{movements:{}},
           profile:{scaleRatios:{_lowerBody:0.87, _overall:0.87}}, movementRefs:{}},
    save(){}, focus(){ return {targetReps:{}}; }, buildWeekInfo(){ return {}; },
    collectSessionExercises(){ return []; }
  };
  C.window = C; C.globalThis = C;
  const parser = (read('app.js').match(/function parseTargetReps[\s\S]*?\n}/) || [''])[0];
  if(!parser) errors.push('parseTargetReps introuvable dans app.js.');
  else vm.runInNewContext(parser, C, {filename:'app.js#parseTargetReps'});
  ['scripts/app_helpers.js', 'data/equipment.js', 'scripts/charge/equipement.js',
   'scripts/charge/movement_tuning.js', 'scripts/charge/utilitaires.js', 'scripts/charge/mouvements.js',
   'scripts/charge/rpe.js', 'scripts/charge/historique.js', 'scripts/charge/scaling.js',
   'scripts/charge/ceiling.js', 'scripts/charge/brain_stats.js', 'scripts/charge/brain_memory.js',
   'scripts/charge/brain_journal.js', 'scripts/charge/movement_profiles.js', 'scripts/charge/kalman.js',
   'scripts/charge/suggestion.js', 'scripts/charge/trace.js', 'scripts/charge/index.js'
  ].forEach(f => vm.runInNewContext(read(f), C, {filename:f}));
  if(tuning && C.COACH_MOVEMENT_TUNING.brainV116) Object.assign(C.COACH_MOVEMENT_TUNING.brainV116, tuning);
  return C;
}

function row(C, date, load, reps, rpe, status, format, blockTitle, kind, note, name){
  name = name || 'Back Squat';
  const context = C.coachBuildMovementContext(name, {kind, blockTitle, format, note});
  return {date, load, externalLoad:load, reps, rpe, status, planned:{format, kind, load:load + ' lb'}, context};
}

// Une seance du jour → charge affichee, decision du moteur, trace. `shown`
// passe par la porte de l'ecran (coachSuggestForExercise), comme WOD+, la
// seance guidee et le PC ; l'indice du (!) est lu juste apres, avant que le
// moteur ou la trace ne le reecrivent.
function run(C, history, ex, blk){
  const label = C.canonicalMovementLabel(ex.name);
  C.state.athleteState.movements[label] = {history, ranges:{}};
  C.__coachLoadHints = {};
  const shown = C.coachSuggestForExercise(ex, blk, {day:'lundi', week:4});
  const hint = Object.assign({}, C.__coachLoadHints[C.coachNormalizeMoveText(label)] || {});
  const parsed = C.parseTargetReps(ex.format, 10);
  const target = parsed.min || parsed.max || 10;
  const ctx = C.coachBuildMovementContext(ex.name, {kind:blk.kind, blockTitle:blk.title, note:ex.note,
    format:ex.format, targetMin:parsed.min, targetMax:parsed.max, day:'lundi', week:4});
  const motor = C.guardedSuggestedLoadDecision(ex.name, ex.load, target, ctx);
  const trace = C.CoachChargeTrace.movement(ex.name, {kind:blk.kind, blockTitle:blk.title, format:ex.format,
    note:ex.note, programLoad:ex.load, targetReps:target, targetMin:parsed.min, targetMax:parsed.max,
    day:'lundi', week:4, skipReplay:true});
  return {shown, shownNum:C.parseLoad(shown), motor, trace, hint};
}

const SQUAT = {name:'Back Squat', format:'5×3', load:'250 lb',
  note:'Retour au mouvement de compétition. RPE 8. Descente contrôlée, remontée explosive.'};
const MAIN = {kind:'main', title:'A. Back Squat'};

// ── 1. Cas Bertin ─────────────────────────────────────────────────────────
{
  const C = engine();
  const h = ['2026-08-21', '2026-08-28', '2026-09-04', '2026-09-11', '2026-09-18'].map((d, i) =>
    row(C, d, [160, 165, 170, 175, 175][i], 2, 7, 'context_logged', '6×2', 'B. Squat vitesse', 'technique', '70 % du 1RM, vitesse maximale.'));
  h.push(row(C, '2026-09-28', 300, 1, 9.5, 'hard', 'montée vers 1RM', 'A. Back Squat', 'main', 'TEST ANCRE — 1RM'));
  const r = run(C, h, SQUAT, MAIN);
  assert(r.motor.loadNum === 220, 'Bertin : le moteur principal propose 220 lb (' + r.motor.loadNum + ').');
  assert(r.shownNum !== 305 && r.shownNum <= 266, 'Bertin : la charge affichee n\'est plus 305 lb et reste ≤ 266 (' + r.shown + ').');
  assert(r.trace.suggestion.propose === r.shownNum, 'Bertin : la trace donne la charge affichee (' + r.trace.suggestion.propose + ' vs ' + r.shown + ').');
  assert(r.trace.suggestion.moteur && r.trace.suggestion.moteur.propose === r.motor.loadNum, 'Bertin : la trace garde la decision du moteur a cote.');
}

// ── 2. Un « montée vers 3RM » n'est jamais la base brute d'un 4×5 ─────────
{
  const C = engine();
  const h = [
    row(C, '2026-09-01', 200, 5, 7, 'success', '4×5', 'A. Back Squat', 'main', 'RPE 7.'),
    row(C, '2026-09-08', 205, 5, 7, 'success', '4×5', 'A. Back Squat', 'main', 'RPE 7.'),
    row(C, '2026-09-15', 245, 3, 9, 'hard', 'montée vers 3RM', 'A. Back Squat', 'main', '3RM propre.')
  ];
  const r = run(C, h, {name:'Back Squat', format:'4×5', load:'230 lb', note:'RPE 8.'}, MAIN);
  assert(r.shownNum < 245, 'Test 3RM : la ligne 245 × 3 ne sert pas de base au 4×5 (' + r.shown + ').');
  assert(r.trace.suggestion.propose === r.shownNum, 'Test 3RM : trace et ecran donnent le meme nombre.');
}

// ── 3. Non-regression : historique homogene, progression V1.16 inchangee ──
// Valeurs mesurees avec le code d'avant la correction, sur ces fixtures. Le
// Goblet Squat est le cas ou la couche V1.16 decide (35 lb, moteur 40) : la
// trace doit le montrer comme tel.
function homogeneous(C, name, loads, reps, rpe, format){
  return loads.map((l, i) => row(C, '2026-09-' + (10 + i * 3), l, reps, rpe, 'success', format, 'A. Force', 'main', 'RPE 8.', name));
}
const FORCE = {kind:'main', title:'A. Force'};
{
  const C = engine();
  const r = run(C, homogeneous(C, 'Back Squat', [200, 205, 210], 5, 7, '4×5'),
    {name:'Back Squat', format:'4×5', load:'150 lb', note:'RPE 8.'}, FORCE);
  assert(r.shown === '215 lb', 'Homogene Back Squat RPE 7 : 215 lb, comme avant (' + r.shown + ').');
}
{
  const C = engine();
  const r = run(C, homogeneous(C, 'Goblet Squat', [20, 25, 25], 10, 6, '4×10'),
    {name:'Goblet Squat', format:'4×10', load:'35 lb', note:'RPE 8.'}, FORCE);
  const s = r.trace.suggestion;
  assert(r.shown === '35 lb', 'Homogene Goblet Squat RPE 6 : 35 lb, comme avant (' + r.shown + ').');
  assert(s.propose === 35 && s.source === 'brain' && s.ecart === true && s.moteur.propose === r.motor.loadNum,
    'Trace : quand la couche V1.16 decide, la trace dit « brain » et garde le moteur a cote (' + s.propose + ' / moteur ' + (s.moteur && s.moteur.propose) + ').');
  const line = C.CoachChargeTrace.summaryLine(r.trace);
  assert(/propose 35 lb \(couche Brain V1\.16 ; moteur 40 lb\)/.test(line), 'Resume : l\'ecart moteur / affiche se lit sans deplier le JSON (' + line + ').');
}

// ── 3 bis. Le plafond de capacite renvoie au moteur, et le (!) le dit ─────
// Single lourd 290 × 1 @8 lu pour un 5×3. Filtre de reps coupe (repGapRatio
// geant) : seul le plafond se tient entre la ligne brute et l'ecran.
function single(C){
  return [row(C, '2026-09-01', 200, 3, 7, 'success', '5×3', 'A. Back Squat', 'main', 'RPE 8.'),
          row(C, '2026-09-10', 290, 1, 8, 'success', '1×1', 'A. Back Squat', 'main', 'Single lourd.')];
}
{
  const open = engine({repGapRatio:1000, capacityRpe:0});
  const ro = run(open, single(open), SQUAT, MAIN);
  assert(ro.shownNum > ro.motor.loadNum, 'Temoin : sans filtre ni plafond, la ligne brute passe au-dessus du moteur (' + ro.shown + ' vs ' + ro.motor.loadText + ').');
  const C = engine({repGapRatio:1000});
  const r = run(C, single(C), SQUAT, MAIN);
  assert(r.shown === r.motor.loadText, 'Plafond : au-dessus de la capacite, la charge du moteur fait foi (' + r.shown + ').');
  assert(/Couche Brain V1\.16 ecartee/.test(r.hint.reason || ''), 'Plafond : le (!) explique pourquoi la couche V1.16 est ecartee.');
  assert(r.hint.load === r.shown, 'Plafond : le (!) explique la charge affichee, pas celle refusee (' + r.hint.load + ' vs ' + r.shown + ').');
  const P = engine();
  const rp = run(P, single(P), SQUAT, MAIN);
  assert(rp.shownNum <= rp.motor.loadNum, 'Reps : le single est projete par Epley, jamais lu brut (' + rp.shown + ').');
}

// ── 4. Un frein `warning` du moteur survit a la couche V1.16 ──────────────
{
  const C = engine();
  const h = [
    row(C, '2026-09-01', 210, 3, 8, 'success', '5×3', 'A. Back Squat', 'main', 'RPE 8.'),
    row(C, '2026-09-08', 215, 3, 9.5, 'hard', '5×3', 'A. Back Squat', 'main', 'RPE 8.'),
    row(C, '2026-09-15', 215, 1, 10, 'failed', '5×3', 'A. Back Squat', 'main', 'RPE 8.')
  ];
  const r = run(C, h, SQUAT, MAIN);
  assert(r.motor.severity === 'warning' || r.motor.severity === 'critical', 'Frein : le moteur pose un avertissement (' + r.motor.severity + ').');
  assert(r.shown === r.motor.loadText, 'Frein : la couche V1.16 ne defait pas le frein (' + r.shown + ' vs ' + r.motor.loadText + ').');
}

notes.forEach(n => console.log('  ok  ' + n));
if(errors.length){
  errors.forEach(e => console.error('  ECHEC  ' + e));
  console.error('\nbrain_v116_checks : ' + errors.length + ' echec(s).');
  process.exit(1);
}
console.log('\nbrain_v116_checks : ' + notes.length + ' verifications OK.');

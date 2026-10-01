#!/usr/bin/env node
/*
  Racine — contrat de Phase 3 — Pont Peak (programs/pont_peak.js).

  Ce que ce fichier protège (le contrat, pas l'inventaire) :
    1. Le bloc se place entre Fable 5 et le Peak : 7 semaines, nextPhase
       competition_peak, et Fable 5 le propose en premier.
    2. Les constantes du bloc ne disparaissent pas en silence : Barbell RDL
       chaque lundi, DB Pullover mardi ET vendredi, Cuban Press et Band
       Pull-Apart — S6 et S7 comprises.
    3. Un seul test du cycle : Bench Press 1RM mardi S7, porte « 90% », en
       contexte de force plein (un mot de trop rendrait le 1RM muet).
    4. Rotations A/B sur les mouvements A ; lundi S7 = Back Squat 3×3 « 80% ».
    5. Le metcon du mardi épargne épaules et lats.
    6. Ratio tirage:poussée ≥ 1,5 en séries, S1-S5.
    7. Aucune charge en livres au-dessus du 1RM de l'athlète de référence.

  Usage :
    node dev/pont_peak_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond) errors.push(msg); else notes.push(msg); }

const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout(){}, clearTimeout(){},
  document: { getElementById: () => null },
  navigator: {},
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  APP_VERSION: 'TEST', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [],
  movements: {},
  state: { week: 1, day: 'mardi', rpeHistory: {}, athleteState: { movements: {} }, profile: null },
  save(){}, focus(){ return { targetReps: {} }; }, buildWeekInfo(){ return {}; },
  weekIdx(){ return 0; }, totalWeeks(){ return 7; }, collectSessionExercises(){ return []; }
};
ctx.window = ctx;
ctx.globalThis = ctx;

[
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/movement_tuning.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/suggestion.js',
  'programs/index.js',
  'programs/pont_peak.js'
].forEach(file => {
  try { vm.runInNewContext(read(file), ctx, { filename: file }); }
  catch (err) { errors.push('Chargement impossible de ' + file + ' : ' + err.message); }
});

try {
  const P = ctx.window.COACH_BERTIN_PROGRAMS && ctx.window.COACH_BERTIN_PROGRAMS.pont_peak;
  assert(!!P, 'Programme pont_peak chargé.');
  const W = [1, 2, 3, 4, 5, 6, 7];
  const days = P.days || [];
  const exs = (day, w) => [].concat(...(P.getBlocks(day, w) || []).map(b => (b.exercises || []).map(ex => Object.assign({ block: b }, ex))));
  const names = (day, w) => exs(day, w).map(e => e.name);

  // ─── 1. Place dans le macrocycle ─────────────────────────────────────────
  assert(P.nextPhase === 'competition_peak', 'nextPhase === "competition_peak".');
  assert((P.weekLabels || []).length === 7 && P.mult.length === 7 && P.weekGoals.length === 7,
    '7 semaines : weekLabels, weekGoals et mult alignés.');
  const index = ctx.window.COACH_BERTIN_PROGRAM_INDEX || [];
  const fable = index.filter(x => x.id === 'phase2_fable5')[0] || {};
  const entry = index.filter(x => x.id === 'pont_peak')[0] || {};
  assert((fable.suggestedNext || [])[0] === 'pont_peak', 'L\'entrée phase2_fable5 propose pont_peak en premier.');
  assert(entry.visibility === 'private' && (ctx.window.BERTIN_PRIVATE_PROGRAM_IDS || []).indexOf('pont_peak') >= 0,
    'pont_peak est privé et accordé au profil propriétaire (BERTIN_PRIVATE_PROGRAM_IDS).');
  assert(/nextPhase:\s*"pont_peak"/.test(read('programs/phase2_fable5.js')), 'Fable 5 enchaîne sur pont_peak.');

  // ─── Blocs non vides partout ─────────────────────────────────────────────
  const vides = [];
  days.forEach(d => W.forEach(w => { if (!(P.getBlocks(d, w) || []).length || !exs(d, w).length) vides.push(d + ' S' + w); }));
  assert(days.length === 4 && vides.length === 0, 'getBlocks non vide pour 4 jours × 7 semaines (' + (vides.join(', ') || 'complet') + ').');

  // ─── 2. Constantes ───────────────────────────────────────────────────────
  const manque = [];
  W.forEach(w => {
    [['lundi', 'Barbell RDL'], ['mardi', 'DB Pullover'], ['vendredi', 'DB Pullover'],
     ['jeudi', 'Cuban Press'], ['mardi', 'Band Pull-Apart']].forEach(([d, n]) => {
      if (names(d, w).indexOf(n) < 0) manque.push(d + ' S' + w + ' ' + n);
    });
  });
  assert(manque.length === 0, 'RDL lundi, DB Pullover mardi+vendredi, Cuban Press, Band Pull-Apart : S1-S7 (' + (manque.join(' | ') || 'tous présents') + ').');

  // ─── 3. Un seul test : Bench Press mardi S7 « 90% » ──────────────────────
  const tests = [];
  days.forEach(d => W.forEach(w => (P.getBlocks(d, w) || []).forEach(b => {
    if (/TEST/.test(b.tag || '') || (b.exercises || []).some(e => /TEST ANCRE/.test(String(e.note || '')) || /1RM/.test(e.format)))
      tests.push({ d, w, b });
  })));
  assert(tests.length === 1 && tests[0].d === 'mardi' && tests[0].w === 7,
    'Un seul bloc de test dans tout le cycle, mardi S7 (' + tests.map(t => t.d + ' S' + t.w + ' ' + t.b.title).join(' | ') + ').');
  const bench = exs('mardi', 7).filter(e => e.block.kind === 'main')[0] || {};
  assert(bench.name === 'Bench Press' && bench.load === '90%' && !!ctx.coachPercentTargetFromText(bench.load),
    'Test S7 : Bench Press à la charge « 90% », résolue en pourcentage.');
  const semaines = {};
  P.weekLabels.forEach((l, i) => { semaines[i + 1] = { label: l, goal: P.weekGoals[i] }; });
  ctx.buildWeekInfo = () => semaines;
  ctx.state.week = 7;
  const c = ctx.coachBuildMovementContext(bench.name, { kind: bench.block.kind, blockTitle: bench.block.title,
    note: bench.note, format: bench.format, load: bench.load, day: 'mardi', week: 7 });
  assert(!ctx.coachIsLimitedProgressionContext(c) && !ctx.coachIsDeloadWeekOrContext(c),
    'Le 1RM de S7 est un contexte de force plein, hors deload : il peut remplacer la capacité [' + c.intents.join(',') + '].');
  ctx.state.week = 6;
  assert(ctx.coachIsDeloadWeekOrContext({ week: 6, kind: 'main', note: '' }), 'S6 est lue comme semaine de deload (libellé).');
  ctx.state.week = 1;

  // ─── 4. Rotations et lundi S7 ────────────────────────────────────────────
  const A = { lundi: ['Tempo Back Squat', 'Back Squat'], mardi: ['Paused Bench Press', 'Bench Press'], jeudi: ['Landmine Press', 'Strict Press'] };
  const rot = [];
  Object.keys(A).forEach(d => W.slice(0, 5).forEach(w => {
    const main = exs(d, w).filter(e => e.block.kind === 'main')[0] || {};
    const attendu = A[d][w <= 3 ? 0 : 1];
    if (main.name !== attendu) rot.push(d + ' S' + w + ' : ' + main.name + ' au lieu de ' + attendu);
  }));
  assert(rot.length === 0, 'Rotation A (S1-3) et B (S4-5) sur les mouvements A (' + (rot.join(' | ') || 'conforme') + ').');
  const lun7 = exs('lundi', 7).filter(e => e.block.kind === 'main')[0] || {};
  assert(lun7.name === 'Back Squat' && lun7.format === '3×3' && lun7.load === '80%', 'Lundi S7 : Back Squat 3×3 « 80% », aucun test.');

  // ─── 5. Metcon du mardi ──────────────────────────────────────────────────
  const INTERDIT = /pull[- ]?up|traction|chin[- ]?up|\brow\b|rameur|wall ?ball|burpee|toes[- ]to[- ]bar|\bski\b/i;
  const sales = W.filter(w => INTERDIT.test(P.getWodText('mardi', w))).map(w => 'S' + w + ' : ' + P.getWodText('mardi', w));
  assert(sales.length === 0, 'Metcon du mardi sans traction, rameur, wall balls, burpees, toes-to-bar ni ski (' + (sales.join(' | ') || 'propre') + ').');

  // ─── 6. Ratio tirage:poussée ─────────────────────────────────────────────
  // Séries de travail ; « montée vers NRM » compte pour 3. Hors stabilité
  // (Cuban, Bottoms-Up), deltoïdes latéraux et gainage (Pallof Press n'est
  // pas une poussée). Bras : curl = tirage, extension = poussée.
  const PULL = /pendlay|pull-?up|pulldown|pullover|face pull|curl|pull-apart|\brow\b/i;
  const PUSH = /bench|press|extension/i;
  const HORS = /cuban|bottoms-up|lateral raise|pallof|power clean/i;
  const series = f => { const m = String(f).match(/^(\d+)×/); return m ? Number(m[1]) : (/montée vers \d+RM/.test(f) ? 3 : 0); };
  const ratios = [];
  W.slice(0, 5).forEach(w => {
    let pull = 0, push = 0;
    days.forEach(d => exs(d, w).forEach(e => {
      if (HORS.test(e.name)) return;
      if (PULL.test(e.name)) pull += series(e.format);
      else if (PUSH.test(e.name)) push += series(e.format);
    }));
    ratios.push({ w, pull, push, r: push ? pull / push : 0 });
  });
  const bas = ratios.filter(x => !(x.r >= 1.5));
  assert(bas.length === 0, 'Ratio tirage:poussée ≥ 1,5 chaque semaine S1-S5 : ' +
    ratios.map(x => 'S' + x.w + ' ' + x.pull + '/' + x.push + '=' + x.r.toFixed(2)).join(' · '));

  // ─── 7. Aucune charge en livres au-dessus de la référence × 1,0 ──────────
  const REF = { 'Back Squat': 315, 'Tempo Back Squat': 268, 'Bench Press': 245, 'Paused Bench Press': 228,
    'Close-Grip Bench Press': 225, 'Strict Press': 155, 'Front Squat': 265, 'Power Clean': 205,
    'Pendlay Row': 195, 'Barbell RDL': 375 };
  const lourds = [];
  let verifies = 0;
  days.forEach(d => W.forEach(w => exs(d, w).forEach(e => {
    const ref = REF[e.name];
    if (!ref || /%/.test(String(e.load))) return;
    const nums = String(e.load).match(/\d+(?:\.\d+)?/g) || [];
    if (!nums.length) return;
    verifies++;
    const max = Math.max(...nums.map(Number));
    if (max > ref) lourds.push(d + ' S' + w + ' ' + e.name + ' ' + e.load + ' > ' + ref);
  })));
  assert(verifies >= 30 && lourds.length === 0, 'Charges en livres ≤ 1RM de référence (' + verifies + ' vérifiées' + (lourds.length ? ' : ' + lourds.join(' | ') : '') + ').');

  // Mouvements A en livres = référence × mult (± arrondi à 5).
  const ecarts = [];
  [['lundi', 1], ['lundi', 2], ['lundi', 3], ['lundi', 4], ['lundi', 5], ['lundi', 6],
   ['mardi', 1], ['mardi', 2], ['mardi', 3], ['mardi', 4], ['mardi', 5], ['mardi', 6],
   ['jeudi', 4], ['jeudi', 5], ['jeudi', 6]].forEach(([d, w]) => {
    const m = exs(d, w).filter(e => e.block.kind === 'main')[0];
    const attendu = REF[m.name] * P.mult[w - 1];
    if (Math.abs(ctx.parseLoad(m.load) - attendu) > 3) ecarts.push(d + ' S' + w + ' ' + m.name + ' ' + m.load + ' ≠ ' + attendu.toFixed(1));
  });
  assert(ecarts.length === 0, 'Mouvements A en livres = référence × mult (' + (ecarts.join(' | ') || '15 charges conformes') + ').');
} catch (err) {
  errors.push('Erreur pendant les tests pont_peak : ' + (err && err.stack ? err.stack : err));
}

if (errors.length) {
  console.error('\nECHEC pont_peak_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK pont_peak_checks.js');
notes.forEach(n => console.log(' - ' + n));

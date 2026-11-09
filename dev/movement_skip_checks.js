#!/usr/bin/env node
/*
  Racine — un mouvement sauté n'est pas un échec (V5.4.0).

  Cas réel (profil Bertin, moteur_jambes S2 lundi, 2026-11-09) : le temps a
  manqué, les deux accessoires de fin n'ont pas été faits. Le seul moyen de le
  dire était 0 rep — avec la charge suggérée pré-remplie (50 lb) et un RPE 8
  pré-rempli. Le moteur y a lu un échec : Bulgarian Split Squat en
  `recalibrating`, capacité 40 lb, confiance 0,30, progression bloquée.

  Ce que ce fichier protège (le contrat, pas l'inventaire) :
    1. Collecte : une carte marquée Non fait donne {skipped, skipReason} et
       AUCUNE donnée de performance (load / reps / rpe), même quand le cache
       de la séance guidée les contient — le nettoyage passe en dernier.
    2. Moteur : la ligne n'est jamais classée (ni status ni performanceRatio),
       garde son `planned`, et athlete_state est identique avant / après.
    3. Lecteurs : résumé « Non fait — motif », rien dans « Ce qui bloque »,
       aucune moyenne de RPE ne la compte.
    4. Non-régression : une VRAIE tentative à 50 lb × 0 rep, sans Non fait,
       reste un échec majeur.
    5. Un seul noyau (scripts/session/wod_skip.js) pour le metcon et le
       mouvement, et une annulation ne déborde pas sur la séance suivante.

  Usage :
    node dev/movement_skip_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
let checks = 0, failed = 0;
function assert(cond, msg){ checks++; if(!cond){ failed++; console.error(' ✗ ' + msg); } }

const NAME = 'Bulgarian Split Squat';
// La ligne du 9 nov. telle que la carte la pré-remplissait.
const PREFILLED = {load: '50', reps: '0', rpe: '8'};

// ─── 1. Collecte ──────────────────────────────────────────────────────────
function collectCtx(screenInputs, cache){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    escHtml: v => String(v == null ? '' : v),
    document: { getElementById: () => null, querySelectorAll: () => [] },
    guidedResultCache: cache || {}
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.$ = id => id === 'sessionFields' ? { querySelectorAll: sel => sel === '.sf-input' ? (screenInputs || []) : [] } : null;
  vm.runInNewContext(read('scripts/session/wod_skip.js'), ctx, {filename: 'wod_skip.js'});
  vm.runInNewContext(read('scripts/session/results.js'), ctx, {filename: 'results.js'});
  return ctx;
}
function input(key, field, value){
  return { getAttribute: a => a === 'data-key' ? key : (a === 'data-field' ? field : null), value: value };
}
{
  // a. Marqué dans la séance guidée : seul le cache porte les champs.
  const ctx = collectCtx([], {[NAME]: Object.assign({}, PREFILLED), 'Back Squat': {load: '220', reps: '4', rpe: '9'}});
  ctx.CoachWodSkip.set(NAME, 'temps');
  const row = ctx.collectSessionResults()[NAME];
  assert(row && row.skipped === '1' && row.skipReason === 'Manque de temps',
    'Séance guidée : la ligne dit Non fait — Manque de temps (obtenu ' + JSON.stringify(row) + ').');
  assert(row && row.load === undefined && row.reps === undefined && row.rpe === undefined,
    'Le cache guidé (50 lb, 0 rep, RPE 8) n\'est pas réinjecté après l\'annulation.');
  const other = ctx.collectSessionResults()['Back Squat'];
  assert(other && other.load === '220' && other.rpe === '9', 'Les mouvements faits gardent leurs valeurs.');
}
{
  // b. Marqué sur la carte de l'écran Résultats : champs cachés, sans mémoire.
  const ctx = collectCtx([input(NAME, 'load', '50'), input(NAME, 'reps', '0'), input(NAME, 'rpe', '8'),
    input(NAME, 'skipped', '1'), input(NAME, 'skipReason', 'Manque de temps')], {[NAME]: Object.assign({}, PREFILLED)});
  const row = ctx.collectSessionResults()[NAME];
  assert(row && row.skipped === '1' && row.load === undefined && row.reps === undefined && row.rpe === undefined,
    'Écran Résultats : les champs POIDS / REPS / RPE de la carte ne sont pas collectés (obtenu ' + JSON.stringify(row) + ').');
}
{
  // c. Réversible avant l'enregistrement : « Finalement je l'ai fait ».
  const ctx = collectCtx([], {[NAME]: {load: '50', reps: '8', rpe: '8'}});
  ctx.CoachWodSkip.set(NAME, 'temps');
  ctx.CoachWodSkip.clear(NAME);
  const row = ctx.collectSessionResults()[NAME];
  assert(row && row.skipped === undefined && row.load === '50' && row.reps === '8',
    'Annuler l\'annulation rend la série telle que saisie.');
}

// ─── 2. Moteur ────────────────────────────────────────────────────────────
function engineCtx(){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout(fn){ if(typeof fn === 'function') fn(); }, clearTimeout(){},
    navigator: {}, localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    document: { getElementById: () => null, querySelectorAll: () => [] },
    APP_VERSION: 'TEST', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
    state: { week: 2, day: 'lundi', rpeHistory: {}, history: [], profile: {onboarded: true, scaleRatios: {bulgarianDb: 1, _lowerBody: 1, _overall: 1}}, athleteState: { movements: {} } },
    save(){}, focus(){ return {label: '', targetReps: {}}; }, buildWeekInfo(){ return {}; }, weekIdx(){ return 0; },
    collectSessionExercises(){ return []; }, nowIso(){ return '2026-11-09T18:00:00Z'; },
    parseTargetReps(f, fb){ const n = String(f||'').match(/\d+/g)||[]; const l = Number(n[0])||fb||8; return {min:l,max:l}; },
    escHtml: v => String(v == null ? '' : v)
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ['scripts/app_helpers.js', 'scripts/charge/equipement.js', 'scripts/charge/movement_tuning.js',
   'scripts/charge/utilitaires.js', 'scripts/charge/mouvements.js', 'scripts/charge/rpe.js',
   'scripts/charge/historique.js', 'scripts/charge/scaling.js', 'scripts/charge/brain_stats.js',
   'scripts/charge/suggestion.js', 'scripts/session/wod_skip.js', 'scripts/progression/index.js', 'scripts/summary/index.js',
   'scripts/season/suggest.js']
    .forEach(f => vm.runInNewContext(read(f), ctx, {filename: f}));
  const ctxNote = 'Torse droit, genou avant qui suit les orteils.';
  ctx.plannedMapFromSessionExercises = () => ({[NAME]: {load: 50, reps: 8, targetMin: 8, targetMax: 8, format: '3×8/jambe', kind: 'accessory',
    context: ctx.coachBuildMovementContext(NAME, {kind: 'accessory', format: '3×8/jambe', note: ctxNote, day: 'lundi', week: 2})}});
  // Le 2 nov. : 45 × 8 @7,5, la seule séance principale avant le 9.
  const nov2 = ctx.enrichSessionResults({[NAME]: {load: '45', reps: '8', rpe: '7.5'}});
  ctx.updateAthleteStateFromResults(nov2, '2026-11-02');
  return ctx;
}
{
  const ctx = engineCtx();
  const before = JSON.stringify(ctx.state.athleteState.movements[NAME]);
  const res = ctx.enrichSessionResults({[NAME]: {skipped: '1', skipReason: 'Manque de temps', note: 'Pas le temps'}});
  const row = res[NAME];
  assert(row.status === undefined && row.performanceRatio === undefined && row.coachNote === undefined,
    'Une ligne Non fait n\'est jamais classée (obtenu status ' + row.status + ').');
  assert(row.planned && row.planned.load === 50 && row.planned.format === '3×8/jambe',
    'Elle garde son `planned` : on sait LEQUEL n\'a pas été fait.');
  ctx.updateAthleteStateFromResults(res, '2026-11-09');
  assert(JSON.stringify(ctx.state.athleteState.movements[NAME]) === before,
    'athlete_state.movements["' + NAME + '"] est identique avant et après la séance.');
  assert(ctx.state.athleteState.movements[NAME].status !== 'recalibrating', 'Aucun recalibrage.');

  // Même avec une charge restée sur la ligne (import, version future) : la
  // marque prime, rien n'est classé ni appris.
  const dirty = ctx.enrichSessionResults({[NAME]: {skipped: '1', skipReason: 'Manque de temps', load: '50', reps: '0', rpe: '8'}});
  assert(dirty[NAME].status === undefined, 'Une ligne marquée mais restée chargée n\'est pas classée non plus.');
  // Reclassement d'une séance passée (history_edit → CoachCharge.classifyResult).
  const re = ctx.applyPerformanceClassification({skipped: '1', skipReason: 'Manque de temps', load: '50', reps: '0', status: 'major_fail', performanceRatio: 0},
    {name: NAME, reps: 8, targetMin: 8, targetMax: 8});
  assert(re.status === undefined && re.performanceRatio === undefined, 'Le reclassement d\'une ligne Non fait efface son ancien major_fail.');
  ctx.updateAthleteStateFromResults(dirty, '2026-11-09');
  assert(JSON.stringify(ctx.state.athleteState.movements[NAME]) === before, '… ni apprise par athlete_state.');

  // Résumé et progression.
  const sum = ctx.CoachSummary.buildSessionSummary({[NAME]: row, 'Back Squat': {load: '220', reps: '4', rpe: '8'}},
    {movementName: k => k, parseLoad: v => Number(v), round5: v => Math.round(v / 5) * 5});
  assert(sum.lines.indexOf(NAME + ' : Non fait — Manque de temps') >= 0, 'Le résumé dit « Non fait — Manque de temps ».');
  assert(!(sum.blockedLines || []).some(l => l.indexOf(NAME) >= 0), 'La progression ne le marque pas bloqué.');

  // Moyenne de RPE (La Saison) : seule la séance faite compte.
  const avg = ctx.CoachSuggest.recentAvgRpe({history: [{date: '2026-11-09', results: {'Back Squat': {load: '220', reps: '4', rpe: '9'}, [NAME]: row}}]}, '2026-11-10');
  assert(avg === 9, 'La moyenne de RPE ne compte pas la ligne Non fait (obtenu ' + avg + ').');
}
// 4. Non-régression : une vraie tentative ratée reste un échec majeur.
{
  const ctx = engineCtx();
  const res = ctx.enrichSessionResults({[NAME]: Object.assign({}, PREFILLED)});
  assert(res[NAME].status === 'major_fail', 'Sans Non fait, 50 lb × 0 rep reste major_fail (obtenu ' + res[NAME].status + ').');
  ctx.updateAthleteStateFromResults(res, '2026-11-09');
  assert(ctx.state.athleteState.movements[NAME].status === 'recalibrating', '… et recalibre, comme avant.');
}

// ─── 6. Corriger après coup + reconstruction SANS PERTE ───────────────────
// La ligne du 9 nov. telle qu'enregistrée, passée en Non fait dans l'édition
// d'historique, puis l'état reconstruit. La reconstruction remet aussi les
// références saisies à la main (onglet Charge) : avant V5.4.0 elle les
// effaçait — 6 recalibrages du 27 oct. sur l'export réel.
{
  const ctx = engineCtx();
  const app = read('app.js');
  [/function refKey[^\n]*/, /function resolveMovementKey[\s\S]*?\n\}/, /function updateMovementRefFromPR[\s\S]*?\n\}/,
   /function updateAthleteStateFromPR[\s\S]*?\n\}/, /var REPLAYED_REF_NOTE=[^\n]*/, /function manualSeedsForRebuild[\s\S]*?\n\}/,
   /function applyManualSeedForRebuild[\s\S]*?\n\}/, /function rebuildRefsFromHistory[\s\S]*?\n\}/]
    .forEach(re => { const src = (app.match(re) || [''])[0]; if(!src) throw new Error('introuvable dans app.js : ' + re); vm.runInNewContext(src, ctx); });
  const results = read('scripts/session/results.js');
  vm.runInNewContext(results.match(/function updateRefsFromResults[\s\S]*?\n\}/)[0], ctx);
  vm.runInNewContext(read('scripts/session/history_edit.js'), ctx, {filename: 'history_edit.js'});
  ctx.movements = {backSquat: {name: 'Back Squat'}};
  ctx.CoachCharge = {updateAthleteStateFromResults: ctx.updateAthleteStateFromResults};
  ctx.checkDeloadAlert = () => {};
  const day = (d, res) => ({date: d, week: 2, day: 'lundi', results: res});
  const nov2 = ctx.enrichSessionResults({[NAME]: {load: '45', reps: '8', rpe: '7.5'}, 'Back Squat': {load: '215', reps: '5', rpe: '8'}});
  const nov9 = ctx.enrichSessionResults({[NAME]: {load: '50', reps: '0', rpe: '8', note: 'Pas le temps'}, 'Back Squat': {load: '220', reps: '4', rpe: '9'}});
  ctx.state.athleteState = {movements: {}}; ctx.state.movementRefs = {};
  ctx.state.history = [day('2026-11-02', nov2), day('2026-11-09', nov9)];
  // Recalibrage manuel du 27 oct. (onglet Charge), entre deux séances.
  ctx.state.history.unshift(day('2026-10-26', ctx.enrichSessionResults({'Back Squat': {load: '220', reps: '3', rpe: '8'}})));
  ctx.rebuildRefsFromHistory();
  const cfg = {mvKey: 'backSquat', label: 'Back Squat', reps: 8, range: 'hypertrophy'};
  ctx.updateMovementRefFromPR(cfg, 205, '2026-10-27', 8);
  ctx.updateAthleteStateFromPR(cfg, 205, '2026-10-27', 8);
  const refBefore = JSON.stringify(ctx.state.movementRefs.backSquat__hypertrophy);
  const rangeBefore = JSON.stringify(ctx.state.athleteState.movements['Back Squat'].ranges.hypertrophy);
  assert(ctx.state.athleteState.movements[NAME].status === 'recalibrating', 'Départ réel : Bulgarian Split Squat en recalibrage après le 0 rep.');

  ctx.rebuildRefsFromHistory();
  assert(JSON.stringify(ctx.state.movementRefs.backSquat__hypertrophy) === refBefore
    && JSON.stringify(ctx.state.athleteState.movements['Back Squat'].ranges.hypertrophy) === rangeBefore,
    'Reconstruire sans rien corriger garde le recalibrage manuel du 27 oct. (référence et plage).');

  const stored = ctx.state.history[2].results;
  const changed = ctx.CoachHistoryEdit.mergeInto(stored, {[NAME]: {load: '50', reps: '0', rpe: '8', note: 'Pas le temps',
    skipped: '1', skipReason: 'Manque de temps'}});
  const row = stored[NAME];
  assert(changed && row.skipped === '1' && row.skipReason === 'Manque de temps' && row.note === 'Pas le temps',
    'Édition : la ligne du 9 nov. devient Non fait — Manque de temps, la note reste.');
  assert(row.load === undefined && row.reps === undefined && row.rpe === undefined && row.status === undefined && row.performanceRatio === undefined,
    'Édition : charge, reps, RPE et l\'ancien major_fail sont retirés (obtenu ' + JSON.stringify({l: row.load, s: row.status}) + ').');
  assert(row.planned && row.planned.format === '3×8/jambe', 'Édition : `planned` reste.');
  ctx.rebuildRefsFromHistory();
  const mv = ctx.state.athleteState.movements[NAME];
  assert(mv.status !== 'recalibrating' && mv.ranges.hypertrophy.status !== 'recalibrating' && mv.ranges.hypertrophy.currentLoad >= 45,
    'Après correction : plus de recalibrage, la capacité redevient celle du 2 nov. (obtenu ' + mv.status + ', ' + mv.ranges.hypertrophy.currentLoad + ' lb).');
  assert(JSON.stringify(ctx.state.movementRefs.backSquat__hypertrophy) === refBefore,
    'Après correction : le recalibrage manuel est toujours là.');
  // Chronologie : une séance APRÈS le recalibrage le remplace encore, comme le
  // jour même — la remise ne fige pas une saisie manuelle au-dessus du réel.
  ctx.state.history.push(day('2026-11-16', ctx.enrichSessionResults({'Back Squat': {load: '210', reps: '8', rpe: '8'}})));
  ctx.rebuildRefsFromHistory();
  assert(ctx.state.movementRefs.backSquat__hypertrophy.load === 210,
    'Une séance postérieure (210 × 8, 16 nov.) remplace toujours le recalibrage du 27 oct. (obtenu ' + ctx.state.movementRefs.backSquat__hypertrophy.load + ').');
  // (Une fois remplacé par une séance réelle, le recalibrage n'existe plus
  // dans l'état : retirer ensuite cette séance ne le fait pas revenir — comme
  // dans l'app au quotidien. La suite repart donc sans la séance du 16.)
  ctx.state.history.pop();
  ctx.rebuildRefsFromHistory();
  const sugg = ctx.coachSafeSuggestedLoad(NAME, '50 lb', 8, {kind: 'accessory', format: '3×8/jambe', day: 'lundi', week: 3});
  assert(!/⚠/.test(String(sugg)) && Number(String(sugg).match(/\d+/)) >= 45,
    'La suggestion suivante n\'est plus bridée par le faux échec (obtenu « ' + sugg + ' »).');
}

// ─── 5. Un seul noyau, et pas de débordement ──────────────────────────────
{
  const skip = read('scripts/session/wod_skip.js');
  assert(/PERFORMANCE_FIELDS = \['load','reps','rpe'/.test(skip), 'Le noyau retire load / reps / rpe d\'une ligne non faite.');
  const results = read('scripts/session/results.js');
  assert(/applyStore\(results\);[\s\S]{0,120}stripPerformanceFields\(results\)/.test(results),
    'Collecte : report de la mémoire, PUIS nettoyage, en dernier.');
  assert(/controlHtml\(key,\{label:'✕ Non fait'\}\)/.test(results) && /controlHtml\(key,\{label:'✕ Non fait',scope:'_g',noFields:true\}\)/.test(read('scripts/session/view.js')),
    'La carte Résultats et la séance guidée utilisent le même contrôle.');
  assert(!/CoachMovementSkip|movement_skip\.js/.test(results + read('index.html')), 'Aucune seconde implémentation.');
  const save = read('scripts/session/save.js'), view = read('scripts/session/view.js');
  assert((save.match(/CoachWodSkip\.resetAll\(\)/g) || []).length >= 2 && (view.match(/CoachWodSkip\.resetAll\(\)/g) || []).length >= 2,
    'La mémoire Non fait est vidée après sauvegarde et à l\'ouverture / abandon d\'une séance.');
  assert(/function liftParts\(r\)\{[\s\S]{0,300}non fait/.test(read('scripts/coach_ai/context.js')), 'Coach IA lit « non fait (motif) » sur un mouvement.');
  assert(/rowIsSkipped\(row\)\)\{\s*skippedCard/.test(read('scripts/session/history_edit.js')),
    'L\'édition d\'historique montre une ligne Non fait comme telle, pas comme un WOD.');
}

if(failed){
  console.error('\nÉCHEC movement_skip_checks.js — ' + failed + ' contrôle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK movement_skip_checks.js — ' + checks + ' contrôles.');

#!/usr/bin/env node
/*
  Racine - garde-fou de la capacite estimee (scripts/charge/kalman.js).

  Ce que ce script epingle :
    · les maths : convergence, variance qui grandit avec le temps, effet du RIR,
      borne basse d'un jour de test ;
    · le filtre de contexte : WOD, technique, leger, vitesse, deload ignores ;
    · le determinisme de rebuild (meme journal = meme etat, quel que soit l'ordre
      de saisie des seances) ;
    · aucune ecriture localStorage (setItem/removeItem espionnes) ;
    · mode shadow : decisions IDENTIQUES a off sur toute la matrice ;
    · mode blend : ecart borne par le saut max, le frein RPE >= 9 et les plafonds ;
    · module absent ou qui plante : moteur d'avant, exactement ;
    · une ligne (!) non vide en shadow ;
    · l'ancrage terrain : Strict Press arrete au 17 sept 2026 → 176 ± 3 lb.

  Usage :
    node dev/kalman_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

let checks = 0, failed = 0;
function assert(cond, msg){ checks++; if(!cond){ failed++; console.error(' ✗ ' + msg); } }
const clone = o => JSON.parse(JSON.stringify(o));

const ENGINE = [
  'scripts/app_helpers.js', 'scripts/charge/equipement.js', 'scripts/charge/movement_tuning.js',
  'scripts/charge/tuning_override.js', 'scripts/charge/utilitaires.js', 'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js', 'scripts/charge/historique.js', 'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js', 'scripts/charge/brain_memory.js', 'scripts/charge/brain_explain.js',
  'scripts/charge/brain_journal.js', 'scripts/charge/ceiling.js', 'scripts/charge/kalman.js',
  'scripts/charge/suggestion.js'
];
function makeContext(opts){
  opts = opts || {};
  const writes = [];
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp, parseInt, parseFloat, isNaN, isFinite,
    setTimeout(fn){ if(typeof fn === 'function') fn(); }, clearTimeout(){},
    document: { getElementById(){ return null; } }, navigator: {},
    localStorage: { _s:{}, getItem(k){ return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null; },
      setItem(k,v){ writes.push(k); this._s[k]=String(v); }, removeItem(k){ writes.push('-'+k); delete this._s[k]; } },
    APP_VERSION: 'TEST', customCharges: {}, CHARGE_ORDER: [],
    DEFAULT_CHARGES: { 'Back Squat':'185 lb', 'Strict Press':'95 lb', 'Lateral Raise DB':'20 lb' },
    movements: { backSquat:{name:'Back Squat', profile:'backSquat'}, strictPress:{name:'Strict Press', profile:'strictPress'} },
    state: { week:3, day:'jeudi', rpeHistory:{}, athleteState:{ movements:{} }, profile:{onboarded:true, scaleRatios:{_overall:1}}, history:[] },
    save(){}, focus(){ return {label:'test', targetReps:{}}; }, buildWeekInfo(){ return {6:{label:'S6', goal:'Deload facile'}}; },
    weekIdx(){ return 2; }, collectSessionExercises(){ return []; }, nowIso(){ return '2026-10-01T00:00:00Z'; },
    CoachState: { storageKeys(){ return {state:'racineState::p_test', charges:'racineCharges::p_test'}; } },
    parseTargetReps(f, fb){ const n = String(f||'').match(/\d+/g)||[]; if(!n.length) return {min:fb||8,max:fb||8}; const l = Number(n[n.length-1])||fb||8; return {min:l,max:l}; }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  (opts.files || ENGINE).forEach(f => vm.runInNewContext(read(f), ctx, { filename: f }));
  ctx.__writes = writes;
  if(ctx.CoachKalman) ctx.CoachKalman.clock = () => '2026-10-01';
  return ctx;
}

// Seance au format de state.history.
function session(date, label, load, reps, rpe, planned, extra){
  const r = Object.assign({load:String(load), reps:String(reps), rpe:String(rpe)}, extra || {});
  if(planned) r.planned = planned;
  const res = {}; res[label] = r;
  return {date, results: res};
}
function plannedCtx(label, kind, format, note, reps, more){
  return {reps, targetMin:reps, targetMax:reps, format, kind,
    context: Object.assign({rawName:label, label, kind, blockTitle:'A. '+label, note:note||'', text:'', format}, more||{})};
}
// Rejoue un journal comme la sauvegarde : state.history + athlete_state.
function seed(ctx, sessions){
  ctx.state.history = clone(sessions);
  ctx.state.athleteState = {movements:{}};
  sessions.forEach(s => ctx.updateAthleteStateFromResults(clone(s.results), s.date));
}

// ─── 1. Maths ──────────────────────────────────────────────────────────────
{
  const ctx = makeContext();
  const K = ctx.CoachKalman;
  assert(!!K && K.ready, 'window.CoachKalman est expose.');
  assert(K.mode() === 'shadow', 'Mode d\'usine : shadow (observation seule).');
  const P = plannedCtx('Back Squat','main','3×5','',5);
  const days = ['2026-09-01','2026-09-04','2026-09-08','2026-09-11','2026-09-15','2026-09-18'];
  const sds = [];
  for(let i = 1; i <= days.length; i++){
    const b = K.buildFrom(days.slice(0,i).map(d => session(d,'Back Squat',200,5,8,P)));
    sds.push(b.estimate('Back Squat',{asOf:days[i-1]}).sd);
  }
  assert(sds.every((s,i) => i === 0 || s < sds[i-1]), 'Convergence : l\'incertitude baisse a chaque mesure concordante.');
  const y = 200 * (1 + (5 + 2) / 30);
  const e = K.buildFrom(days.map(d => session(d,'Back Squat',200,5,8,P))).estimate('Back Squat',{asOf:'2026-09-18'});
  assert(Math.abs(e.e1RM - y) < 0.01, 'Mesures identiques : l\'estimation converge sur l\'observation (' + e.e1RM.toFixed(2) + ' vs ' + y.toFixed(2) + ').');
  assert(e.low < e.e1RM && e.e1RM < e.high && e.n === 6 && e.source === 'history', 'Intervalle a 95 % ordonne, n et source renseignes.');

  const b1 = K.buildFrom([session('2026-09-01','Back Squat',200,5,8,P)]);
  const near = b1.estimate('Back Squat',{asOf:'2026-09-02'}).sd, far = b1.estimate('Back Squat',{asOf:'2026-11-01'}).sd;
  assert(far > near, 'Sans mesure, la variance grandit avec le temps (' + near.toFixed(4) + ' → ' + far.toFixed(4) + ').');

  const rpe7 = K.buildFrom([session('2026-09-01','Back Squat',200,5,7,P)]).estimate('Back Squat',{asOf:'2026-09-01'}).e1RM;
  const rpe10 = K.buildFrom([session('2026-09-01','Back Squat',200,5,10,P)]).estimate('Back Squat',{asOf:'2026-09-01'}).e1RM;
  const noRpe = K.buildFrom([session('2026-09-01','Back Squat',200,5,'',P)]).estimate('Back Squat',{asOf:'2026-09-01'}).e1RM;
  assert(rpe7 > rpe10, 'RIR : le meme 200 x 5 vaut plus a RPE 7 qu\'a RPE 10.');
  assert(Math.abs(rpe10 - 200 * (1 + 5/30)) < 0.01, 'RPE 10 = RIR 0 : Epley sur les reps faites.');
  assert(Math.abs(noRpe - 200 * (1 + 7/30)) < 0.01, 'RPE absent lu comme 8 (RIR 2).');
  const rpe3 = K.buildFrom([session('2026-09-01','Back Squat',200,5,3,P)]).estimate('Back Squat',{asOf:'2026-09-01'}).e1RM;
  assert(Math.abs(rpe3 - 200 * (1 + 9/30)) < 0.01, 'RIR plafonne a 4 : RPE 3 ne s\'invente pas 7 reps en reserve.');

  const T = plannedCtx('Back Squat','main','montée vers 3RM','',3);
  const base = [session('2026-09-01','Back Squat',200,5,8,P), session('2026-09-04','Back Squat',200,5,8,P)];
  const ref = K.buildFrom(base).estimate('Back Squat',{asOf:'2026-09-04'});
  const low = K.buildFrom(base.concat([session('2026-09-04','Back Squat',180,3,9,T)])).estimate('Back Squat',{asOf:'2026-09-04'});
  const high = K.buildFrom(base.concat([session('2026-09-04','Back Squat',230,3,9,T)])).estimate('Back Squat',{asOf:'2026-09-04'});
  assert(Math.abs(low.e1RM - ref.e1RM) < 1e-9 && low.n === ref.n, 'Jour de test sous l\'estimation : borne basse sans information, etat inchange.');
  assert(high.e1RM > ref.e1RM + 0.5 * (230 * (1 + 4/30) - ref.e1RM), 'Jour de test au-dessus : la borne basse tire fort.');

  const loadFor = K.buildFrom(base).estimate('Back Squat',{asOf:'2026-09-04'});
  ctx.state.history = base;
  K.rebuild();
  const lf = K.loadFor('Back Squat', 5, 8, {asOf:'2026-09-04'});
  assert(Math.abs(lf - loadFor.e1RM / (1 + 7/30)) < 1e-9, 'loadFor : charge non arrondie pour reps @RPE cible.');
  assert(K.loadFor('Mouvement Inconnu', 5) === null, 'loadFor : null sans estimation.');
  const w = K.weight('Back Squat', {asOf:'2026-09-04'});
  const wMax = ctx.COACH_MOVEMENT_TUNING.kalman.wMax;
  assert(w > 0 && w <= wMax, 'weight : dans ]0, wMax] avec deux mesures concordantes.');
  ctx.state.history = base.slice(0,1); K.rebuild();
  assert(K.weight('Back Squat', {asOf:'2026-09-01'}) === 0, 'weight : nul sous minObservations.');
  assert(K.weight('Back Squat', {asOf:'2028-09-01'}) === 0, 'weight : nul quand l\'incertitude depasse sdMax (deux ans sans mesure).');
}

// ─── 2. Filtre de contexte ─────────────────────────────────────────────────
{
  const ctx = makeContext();
  const K = ctx.CoachKalman;
  const P = plannedCtx('Back Squat','main','3×5','',5);
  const base = [session('2026-09-01','Back Squat',200,5,8,P), session('2026-09-08','Back Squat',205,5,8,P)];
  const ref = JSON.stringify(K.buildFrom(base).summary().movements);
  const noisy = {
    'WOD': session('2026-09-10','Back Squat',95,20,9,plannedCtx('Back Squat','wod','AMRAP 12','',20),{isWod:true}),
    'WOD (kind)': session('2026-09-10','Back Squat',95,15,9,plannedCtx('Back Squat','wod','AMRAP 12','',15)),
    'technique': session('2026-09-10','Back Squat',135,5,6,plannedCtx('Back Squat','main','5×5','Technique, positions.',5)),
    'leger': session('2026-09-10','Back Squat',135,5,6,plannedCtx('Back Squat','main','3×5','Léger et propre.',5)),
    'vitesse': session('2026-09-10','Back Squat',140,2,6,plannedCtx('Back Squat','main','6×2 @ 55-60%','Vitesse de barre.',2)),
    'deload': session('2026-09-10','Back Squat',150,5,6,plannedCtx('Back Squat','main','3×5','',5,{isRecovery:true})),
    'calibrage': session('2026-09-10','Back Squat',300,1,9,{reps:1,source:'manual_recalibration'})
  };
  Object.keys(noisy).forEach(name => {
    const got = JSON.stringify(K.buildFrom(base.concat([noisy[name]])).summary().movements);
    assert(got === ref, 'Filtre de contexte : une seance ' + name + ' ne touche pas l\'etat.');
  });
  const audit = K.explainRow('Back Squat', noisy.technique.results['Back Squat']);
  assert(audit.retenue === false && audit.raison === 'contexte limite', 'Le refus est explicable : raison « contexte limite ».');
  // Reutilisation, pas duplication : la decision vient des detecteurs existants.
  const src = read('scripts/charge/kalman.js');
  ['coachHistoryContextIsLimited', 'coachBrainIsDeloadRow', 'coachIsNonPerformanceSeed'].forEach(fn =>
    assert(src.indexOf(fn + '(') > 0, 'Le filtre delegue a ' + fn + '().'));
  assert(!/\/(technique|leger|wod|deload|vitesse)[|/]/.test(src), 'Aucun motif de contexte recopie dans kalman.js.');
}

// ─── 3. Determinisme et absence d'ecriture ─────────────────────────────────
const fixture = JSON.parse(read('dev/fixtures/kalman_strict_press.json'));
{
  const ctx = makeContext();
  const K = ctx.CoachKalman;
  const h = fixture.state.history;
  const a = JSON.stringify(K.rebuild(clone(h)));
  const b = JSON.stringify(K.rebuild(clone(h)));
  const shuffled = clone(h).reverse();
  const c = JSON.stringify(K.rebuild(shuffled));
  assert(a === b, 'rebuild : deux reconstructions du meme journal sont identiques.');
  assert(a === c, 'rebuild : l\'ordre de saisie des seances ne change rien (tri par date).');
  assert(JSON.stringify(h) === JSON.stringify(fixture.state.history), 'rebuild : le journal recu n\'est jamais modifie.');
}

// ─── 4. Ancrage terrain : Strict Press au 17 sept 2026 ─────────────────────
{
  const ctx = makeContext();
  const K = ctx.CoachKalman;
  K.rebuild(fixture.state.history);
  const e = K.estimate('Strict Press', {asOf:'2026-09-17'});
  assert(!!e && Math.abs(e.e1RM - 176) <= 3, 'Ancrage : e1RM Strict Press au 17 sept = 176 ± 3 lb (obtenu ' + (e && e.e1RM.toFixed(1)) + ').');
  assert(e && e.n === 6, 'Ancrage : les six lignes comptent — les deux montees vers 3RM sont lues comme des tests, pas comme du contexte limite.');
  assert(e && e.low <= 175 && e.high >= 175, 'Le 175 reussi du 1er oct tombe dans l\'intervalle a 95 %.');
  const oct = K.estimate('Strict Press', {asOf:'2026-10-01'});
  assert(oct.sd > e.sd, 'Deux semaines sans mesure : l\'intervalle s\'elargit d\'ici au test.');
}

// ─── 5. Shadow = off, bit a bit ; blend borne ──────────────────────────────
const P8 = l => plannedCtx(l,'main','3×8','',8);
const P5 = l => plannedCtx(l,'main','3×5','',5);
const scenarios = [
  {name:'progression_rpe_bas', label:'Back Squat', rows:[['2026-09-01',185,8,7],['2026-09-08',185,8,6]], call:['Back Squat','185 lb',8,{}]},
  {name:'bloque_rpe_9_5', label:'Back Squat', rows:[['2026-09-01',185,8,9.5]], call:['Back Squat','195 lb',8,{}]},
  {name:'frein_rpe_8_5', label:'Back Squat', rows:[['2026-09-01',185,8,8.5],['2026-09-08',185,8,8.5]], call:['Back Squat','195 lb',8,{}]},
  {name:'capacite_haute_derniere_basse', label:'Back Squat', rows:[['2026-09-01',245,5,8,5],['2026-09-04',245,5,8,5],['2026-09-08',245,5,8,5],['2026-09-15',185,8,7]], call:['Back Squat','185 lb',8,{}]},
  {name:'capacite_basse_programme_haut', label:'Back Squat', rows:[['2026-09-01',150,8,8],['2026-09-08',150,8,8],['2026-09-15',150,8,7]], call:['Back Squat','195 lb',8,{}]},
  {name:'isolation', label:'Lateral Raise DB', rows:[['2026-09-01',20,12,6],['2026-09-08',20,12,6]], call:['Lateral Raise DB','20 lb',12,{}]},
  {name:'ecart_reps', label:'Back Squat', rows:[['2026-09-01',225,1,8,1],['2026-09-08',225,1,8,1]], call:['Back Squat','225 lb',8,{}]},
  {name:'contexte_wod', label:'Back Squat', rows:[['2026-09-01',185,8,7],['2026-09-08',185,8,7]], call:['Back Squat','188 lb',8,{kind:'wod'}]},
  {name:'semaine_deload', label:'Back Squat', rows:[['2026-09-01',225,8,7],['2026-09-08',225,8,7]], call:['Back Squat','225 lb',8,{}], week:6},
  {name:'sans_historique', label:'Back Squat', rows:[], call:['Back Squat','185 lb',8,{}]},
  {name:'strict_press_fixture_3x3', label:'Strict Press', fixture:true, call:['Strict Press','135 lb',3,{kind:'main',format:'4×3',blockTitle:'A. Strict Press'}]},
  {name:'strict_press_fixture_test_1rm', label:'Strict Press', fixture:true, week:8, call:['Strict Press','90%',1,{kind:'main',format:'montée vers 1RM',note:'TEST ANCRE 3 — 1RM.',blockTitle:'A. Strict Press'}]}
];
function sessionsFor(s){
  if(s.fixture) return clone(fixture.state.history);
  return s.rows.map(r => session(r[0], s.label, r[1], r[2], r[3], (r[4] === 5 ? P5 : P8)(s.label)));
}
function decide(ctx, s){
  ctx.state.week = s.week || 3;
  seed(ctx, sessionsFor(s));
  if(ctx.CoachKalman) ctx.CoachKalman.rebuild();
  ctx.__coachLoadHints = {};
  const call = s.call.slice();
  const mc = ctx.coachBuildMovementContext(call[0], Object.assign({day:'jeudi', week:ctx.state.week}, call[3]));
  return ctx.guardedSuggestedLoadDecision(call[0], call[1], call[2], mc);
}
function withMode(ctx, m, fn){ const T = ctx.COACH_MOVEMENT_TUNING.kalman; const prev = T.mode; T.mode = m; try{ return fn(); } finally{ T.mode = prev; } }
{
  const ctx = makeContext();
  const bare = makeContext({files: ENGINE.filter(f => f !== 'scripts/charge/kalman.js')});
  bare.CoachKalman = undefined;
  let blendMoved = 0;
  scenarios.forEach(s => {
    const off = JSON.stringify(withMode(ctx, 0, () => decide(ctx, s)));
    const shadow = JSON.stringify(withMode(ctx, 1, () => decide(ctx, s)));
    const absent = JSON.stringify(decide(bare, s));
    assert(shadow === off, s.name + ' : shadow identique a off, bit a bit.');
    assert(absent === off, s.name + ' : module absent = off, bit a bit.');

    const offD = JSON.parse(off);
    const blend = withMode(ctx, 2, () => decide(ctx, s));
    if(blend.loadNum !== offD.loadNum) blendMoved++;
    const mv = ctx.state.athleteState.movements[s.label];
    const hist = (mv && mv.history) || [];
    const last = hist[hist.length - 1];
    if(last && blend.loadNum > Number(last.load)){
      const lastLoad = Number(last.load), lastRpe = Number(last.rpe);
      assert(!(lastRpe >= 9), s.name + ' : blend ne monte jamais apres un dernier RPE >= 9.');
      const isTest = /1RM/.test(s.call[3].format || '');
      if(!isTest && lastRpe <= 8){
        const rung = ctx.coachRpeProgressionRung(s.label, lastRpe);
        const maxAllowed = ctx.coachRpeMaxAllowedLoad(s.label, lastLoad, rung, s.call[1]);
        const bound = Math.max(maxAllowed, offD.loadNum || 0);
        assert(blend.loadNum <= bound + 1e-9, s.name + ' : blend borne par le saut max (' + blend.loadNum + ' <= ' + bound + ').');
      }
    }
    if(s.call[3].kind === 'wod' || s.week === 6){
      assert(blend.loadNum === offD.loadNum, s.name + ' : contexte limite / deload, blend sans effet.');
    }
  });
  assert(blendMoved >= 2, 'Le mode blend change reellement des charges (' + blendMoved + ' scenario(s)).');

  // Plafond manuel : il garde le dernier mot sur le melange.
  ctx.COACH_MOVEMENT_TUNING.ceiling.manual = {'Strict Press': 150};
  const capped = withMode(ctx, 2, () => decide(ctx, scenarios.find(s => s.name === 'strict_press_fixture_test_1rm')));
  assert(capped.loadNum <= 150, 'Plafond manuel respecte en blend, porte de test comprise (' + capped.loadNum + ').');
  ctx.COACH_MOVEMENT_TUNING.ceiling.manual = {};

  // Jour de test 1RM : la porte suit l'estimation, les garde-fous restent.
  const test = scenarios.find(s => s.name === 'strict_press_fixture_test_1rm');
  const offTest = withMode(ctx, 0, () => decide(ctx, test));
  const blendTest = withMode(ctx, 2, () => decide(ctx, test));
  const est = ctx.CoachKalman.estimate('Strict Press');
  assert(blendTest.loadNum > offTest.loadNum, 'Jour de test : la porte monte au-dessus du moteur seul (' + offTest.loadNum + ' → ' + blendTest.loadNum + ').');
  assert(blendTest.loadNum <= 0.90 * est.e1RM + 1e-9, 'Jour de test : porte arrondie vers le bas, jamais au-dessus de 90 % de l\'e1RM.');
  assert(/1RM estime \d+ \(\d+-\d+\)/.test(blendTest.reason), 'Jour de test : raison « 1RM estime X (Y–Z) ».');
}

// ─── 6. Portail Brain en blend ─────────────────────────────────────────────
{
  const ctx = makeContext();
  const gate = ctx.coachBrainApplyStatsGate;
  const hist = [{date:'2026-09-01',load:185,reps:8,rpe:8},{date:'2026-09-08',load:185,reps:8,rpe:8}];
  const mk = () => ({label:'Back Squat', loadNum:205, loadText:'205 lb', severity:'ok', reason:'x'});
  const before = JSON.stringify(gate(mk(),'Back Squat',hist,{},8,185,0));
  const same = JSON.stringify(gate(mk(),'Back Squat',hist,{},8,185,0,null));
  assert(before === same, 'Portail : sans Kalman, comportement d\'avant a l\'identique.');
  const pass = gate(mk(),'Back Squat',hist,{},8,185,0,{uncertain:false, sd:0.02, target:210});
  assert(pass.loadNum === 205, 'Portail symetrique : estimation qui soutient la hausse → elle passe.');
  const damp = gate(mk(),'Back Squat',hist,{},8,185,0,{uncertain:true, sd:0.06, target:250});
  assert(damp.loadNum < 205 && damp.loadNum >= 185, 'Portail : incertitude grande → hausse amortie (' + damp.loadNum + ').');
  const hold = gate(mk(),'Back Squat',hist,{},8,185,0,{uncertain:false, sd:0.02, target:196});
  assert(hold.loadNum < 205 && hold.loadNum >= 185 && hold.loadNum <= 196, 'Portail : estimation sous la proposition → gardee sous ce qu\'elle soutient (' + hold.loadNum + ').');
}

// ─── 7. Module qui plante ──────────────────────────────────────────────────
{
  const ctx = makeContext();
  const s = scenarios.find(x => x.name === 'strict_press_fixture_test_1rm');
  const off = JSON.stringify(withMode(ctx, 0, () => decide(ctx, s)));
  const orig = ctx.CoachKalman.forSuggestion;
  ctx.CoachKalman.forSuggestion = function(){ throw new Error('boom'); };
  assert(JSON.stringify(withMode(ctx, 2, () => decide(ctx, s))) === off, 'forSuggestion qui leve : moteur d\'avant (blend).');
  ctx.CoachKalman.forSuggestion = orig;
  const rb = ctx.coachRuleKalmanBlend, rg = ctx.coachRuleKalmanTestGate;
  ctx.coachRuleKalmanBlend = function(c){ c.suggested = 999; throw new Error('boom'); };
  ctx.coachRuleKalmanTestGate = function(c){ c.suggested = 999; throw new Error('boom'); };
  assert(JSON.stringify(withMode(ctx, 2, () => decide(ctx, s))) === off, 'Regle qui ecrit puis leve : ecritures restaurees, moteur d\'avant.');
  ctx.coachRuleKalmanBlend = rb; ctx.coachRuleKalmanTestGate = rg;
}

// ─── 8. Explication (!) et journal ─────────────────────────────────────────
{
  const ctx = makeContext();
  const s = scenarios.find(x => x.name === 'strict_press_fixture_3x3');
  withMode(ctx, 1, () => decide(ctx, s));
  const hint = ctx.__coachLoadHints['strict press'];
  assert(!!hint && !!hint.kalman, 'Shadow : la capacite estimee est attachee a l\'indice du (!).');
  const ex = ctx.CoachBrainExplain.build(hint);
  assert(/^Capacite estimee \(observation\) : \d+ lb ± \d+/.test(ex.capacity || ''), 'Shadow : ligne (!) non vide — « ' + ex.capacity + ' ».');
  const j = ctx.CoachBrainJournal.kalmanFor('Strict Press');
  assert(!!j && j.mode === 'shadow' && j.e1RM > 0 && j.applique === null, 'Journal Brain : lecture shadow enregistree, aucune application.');
  // Le (!) de l'app relit un payload recopie champ par champ (loadInfoPayload) :
  // sans `kalman` dans cette copie, la ligne n'atteindrait jamais l'ecran.
  const modals = read('scripts/ui_modals.js');
  assert(/kalman:\s*hint && hint\.kalman/.test(modals), 'ui_modals : loadInfoPayload emporte hint.kalman jusqu\'au (!).');
  assert(/CoachKalman\.explainLine\(hint\.kalman\)/.test(modals), 'ui_modals : la section Capacite estimee relit la ligne, sans recalcul.');
  withMode(ctx, 0, () => decide(ctx, s));
  const hintOff = ctx.__coachLoadHints['strict press'];
  assert(!hintOff.kalman && !ctx.CoachBrainExplain.build(hintOff).capacity, 'Off : aucune ligne de capacite.');
}

// ─── 9. Stockage : rien n'est ecrit ────────────────────────────────────────
{
  const ctx = makeContext();
  const before = ctx.__writes.length;
  [0,1,2].forEach(m => scenarios.forEach(s => withMode(ctx, m, () => decide(ctx, s))));
  ctx.CoachKalman.rebuild(fixture.state.history); ctx.CoachKalman.estimate('Strict Press');
  assert(ctx.__writes.length === before, 'Aucune ecriture localStorage, quel que soit le mode (' + (ctx.__writes.length - before) + ').');
  const src = read('scripts/charge/kalman.js');
  assert(!/localStorage|sessionStorage|indexedDB/.test(src.replace(/\/\/.*$/gm, '')), 'kalman.js ne reference aucun stockage.');
}

// ─── 10. Reglage par profil : passe par la surcharge, pas par une cle ──────
{
  const ctx = makeContext();
  const O = ctx.CoachTuningOverride;
  assert(O.PARAMS.some(p => p.path === 'kalman.mode'), 'kalman.mode est un parametre de la surcharge de profil.');
  assert(ctx.CoachKalman.setMode('blend') === 'blend', 'setMode(blend) : 2 via CoachTuningOverride.');
  assert(JSON.parse(ctx.localStorage.getItem(O.storageKey())).params['kalman.mode'] === 2, 'Le mode vit dans la cle de surcharge existante (tuning-override-v1).');
  assert(ctx.CoachKalman.setMode('shadow') === 'shadow' && O.isChanged('kalman.mode') === false, 'Retour a shadow = retour a l\'usine.');
  const keys = Object.keys(ctx.localStorage._s);
  assert(keys.length === 1 && keys[0] === O.storageKey(), 'Aucune nouvelle cle de stockage.');
}

if(failed){
  console.error('ECHEC kalman_checks.js — ' + failed + '/' + checks + ' controle(s).');
  process.exit(1);
}
console.log('OK kalman_checks.js — ' + checks + ' controles.');

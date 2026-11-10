#!/usr/bin/env node
/*
  Racine - garde-fou du panneau « Calibration du moteur » (lecture seule).
  scripts/profiles/admin_tuning.js

  Ce panneau ne regle plus rien : il montre ce que Brain a mesure. Deux regles
  de lecture le gouvernent, posees par le createur, et ce script existe pour
  qu'aucune version future ne les perde de vue :

    1. « S'il veut progresser, il doit pouvoir essayer. »
       Une prediction TESTEE qui rate ses reps (underPredictions) est un
       apprentissage : Brain a recu la donnee et corrige deja la suivante.
       Elle ne doit JAMAIS faire apparaitre un mouvement dans la liste.
       Sans ce test, la premiere « amelioration » venue rebranchera un
       compteur d'erreurs sur l'ecran, et le panneau redeviendra une machine
       a brider le moteur — exactement la boucle auto-bloquante decrite dans
       movement_tuning.js §brainGate.

    2. « On n'accuse pas le moteur pour un faible historique. »
       Rien ne s'affiche sous les seuils de RULES : ni un mouvement a deux
       seances, ni une fenetre glissante trop courte pour vouloir dire
       quelque chose.

  Verifie aussi que le seul blocage signale est bien celui ou le moteur
  n'apprend RIEN (humanOverrideDown : la proposition n'a jamais ete testee,
  cf. brain_memory.js:227-228), et que la precision globale se tait tant que
  l'echantillon est trop court.

  Usage :
    node dev/calibration_readout_checks.js
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

// Contexte minimal : le panneau ne doit dependre ni du DOM ni du moteur de
// charges pour ANALYSER. C'est precisement ce qui le rend verifiable ici —
// si un jour analyze() se met a exiger un document, ce script casse, et c'est
// le signal que la logique de lecture est repartie se cacher dans le rendu.
function makeContext(profiles){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN,
    setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
    document: { getElementById: function(){ return null; }, querySelectorAll: function(){ return []; } },
    prompt: function(){ return null; },
    CoachProfiles: {
      isActiveAdmin: function(){ return true; },
      getActive: function(){ return { name: 'Test' }; },
      getActiveId: function(){ return 'p_test'; }
    },
    CoachBrainMemory: {
      exportSummary: function(){ return { profiles: profiles.slice() }; },
      precisionTrend: function(){ return []; }
    },
    CoachTuningOverride: {
      ceilings: function(){ return {}; },
      setCeiling: function(){ return true; },
      removeCeiling: function(){ return true; }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(read('scripts/profiles/admin_tuning.js'), ctx,
    { filename: 'scripts/profiles/admin_tuning.js' });
  return ctx;
}

function profile(over){
  return Object.assign({
    label: 'Back Squat', intent: 'strength', sessions: 20,
    testedPredictions: 0, successfulPredictions: 0,
    underPredictions: 0, overPredictions: 0,
    humanOverrideDown: 0, humanOverrideUp: 0,
    recentOutcomes: [], precisionTrend: [], lastDate: '2026-08-01'
  }, over || {});
}
function labels(findings){ return findings.map(f => f.label); }
function kinds(findings){ return findings.map(f => f.kind); }

// ─── Regle 1 : essayer et rater n'est pas une faute ────────────────────────
// Le pire cas honnete : beaucoup de predictions testees, beaucoup de reps
// manquees, mais la precision recente REMONTE. Le moteur apprend.
{
  const ctx = makeContext([profile({
    testedPredictions: 20, successfulPredictions: 10, underPredictions: 10,
    recentOutcomes: [1,1,1,1,1,1,1,0,1,1]   // 90 % recent contre 50 % a vie
  })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 0,
    'Une prediction testee qui rate ses reps ne fait apparaitre personne quand la courbe descend encore (' + labels(out.findings) + ').');
}
// Meme chose sans aucun refus : underPredictions seul ne declenche jamais rien,
// quel que soit son volume.
{
  const ctx = makeContext([profile({
    testedPredictions: 40, successfulPredictions: 20, underPredictions: 20,
    recentOutcomes: [1,1,1,1,1,1,1,1,1,1]
  })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 0, 'underPredictions n\'est jamais a lui seul un motif de signalement.');
}

// ─── Regle 2 : pas d'accusation sur un faible historique ───────────────────
{
  const R = makeContext([]).window.RacineAdminTuning.RULES;
  assert(R && R.minTested >= 5 && R.minRecentSample >= 5,
    'Les seuils de prudence existent et ne sont pas symboliques.');

  // Juste sous le seuil de predictions testees : silence.
  const few = makeContext([profile({
    testedPredictions: R.minTested - 1, successfulPredictions: 0,
    recentOutcomes: [0,0,0,0,0]
  })]);
  assert(few.window.RacineAdminTuning.analyze().findings.length === 0,
    'Sous minTested, aucun mouvement n\'est signale meme avec 0 % de reussite.');

  // Fenetre glissante trop courte : silence aussi.
  const short = makeContext([profile({
    testedPredictions: R.minTested + 10, successfulPredictions: 0,
    recentOutcomes: [0,0]
  })]);
  assert(short.window.RacineAdminTuning.analyze().findings.length === 0,
    'Sous minRecentSample, la fenetre recente ne sert pas a juger.');

  // Deux refus seulement : sous minOverrideDown, silence.
  const twoRefusals = makeContext([profile({ humanOverrideDown: R.minOverrideDown - 1 })]);
  assert(twoRefusals.window.RacineAdminTuning.analyze().findings.length === 0,
    'Sous minOverrideDown, un refus repete n\'accuse encore personne.');
}

// ─── Le seul vrai blocage : propose, refuse, jamais teste ──────────────────
{
  const ctx = makeContext([profile({ label: 'Lateral Raise DB', humanOverrideDown: 5, testedPredictions: 0 })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 1 && out.findings[0].kind === 'untested',
    'Cinq propositions refusees sans essai sont signalees (' + kinds(out.findings) + ').');
  assert(/refus/i.test(out.findings[0].title),
    'Le signalement dit ce qui s\'est passe, pas un score.');
}
// Mais si tu les testes majoritairement, ce n'est plus un blocage.
{
  const ctx = makeContext([profile({ humanOverrideDown: 3, testedPredictions: 20, successfulPredictions: 18,
                                     recentOutcomes: [1,1,1,1,1,1,1,1,1,1] })]);
  assert(ctx.window.RacineAdminTuning.analyze().findings.length === 0,
    'Quelques refus noyes dans des essais reussis ne sont pas un blocage.');
}

// ─── Courbe qui plafonne : la seule erreur qu'on signale ───────────────────
{
  const ctx = makeContext([profile({
    label: 'Face Pull',
    testedPredictions: 30, successfulPredictions: 12,   // 40 % a vie
    recentOutcomes: [0,0,1,0,0,0,1,0,0,0]               // 20 % recent : ca ne remonte pas
  })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 1 && out.findings[0].kind === 'stuck',
    'Une precision faible qui ne remonte pas est signalee (' + kinds(out.findings) + ').');
}
// La meme precision faible, mais qui REMONTE : on se tait, il apprend.
{
  const ctx = makeContext([profile({
    testedPredictions: 30, successfulPredictions: 9,    // 30 % a vie
    recentOutcomes: [1,1,0,1,1,1,0,1,1,1]               // 80 % recent
  })]);
  assert(ctx.window.RacineAdminTuning.analyze().findings.length === 0,
    'Une precision qui remonte n\'est jamais signalee, meme partie de bas.');
}

// ─── Agregation par mouvement, pas par intention ───────────────────────────
{
  const ctx = makeContext([
    profile({ label: 'Back Squat', intent: 'strength',    humanOverrideDown: 2 }),
    profile({ label: 'Back Squat', intent: 'hypertrophy', humanOverrideDown: 2 })
  ]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 1,
    'Deux intentions du meme mouvement se regroupent en une seule ligne (un plafond ne connait pas l\'intention).');
  assert(Object.keys(out.byMove).length === 1, 'Une seule entree par mouvement dans l\'agregat.');
}

// ─── Precision globale : silence tant que l'echantillon ne dit rien ────────
{
  const quiet = makeContext([profile({ recentOutcomes: [1,0] })]);
  assert(quiet.window.RacineAdminTuning.analyze().precision === null,
    'Sous l\'echantillon minimal, aucun chiffre de precision n\'est affiche.');

  const loud = makeContext([profile({ recentOutcomes: [1,1,1,0,1,1,1,1,0,1] })]);
  const p = loud.window.RacineAdminTuning.analyze().precision;
  assert(p && p.pct === 80 && p.sample === 10,
    'Avec assez d\'observations, la precision recente est mise en commun telle quelle.');
}

// ─── Aucune memoire : le panneau ne plante pas ─────────────────────────────
{
  const ctx = makeContext([]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out && out.findings.length === 0 && out.precision === null,
    'Un profil sans historique Brain donne un panneau vide, pas une erreur.');
}

// ─── Frontiere : plus aucun reglage scalaire dans cet ecran ────────────────
{
  const src = read('scripts/profiles/admin_tuning.js');
  assert(!/PARAMS/.test(src),
    'Le panneau ne rend plus la table PARAMS : il ne configure plus le moteur.');
  assert(!/type="number"/.test(src),
    'Aucun champ numerique libre : les deux gestes passent par une charge en livres explicite.');
  assert(!/\.set\(/.test(src),
    'Le panneau n\'ecrit plus aucun parametre scalaire du moteur.');
  assert(/setCeiling/.test(src),
    'Le plafond manuel reste le geste offert — c\'est le seul que la mesure ne remplace pas.');
}

// ═══ V5.3.3 — Calibration dépassée par ce que l'athlète a démontré ═══════
// Cas réel (profil Bertin, sauvegarde du 2026-11-06) : Back Squat 5RM calibré
// 235 lb à la saisie initiale, 300 × 1 @9,5 le 2026-09-28. Epley en tirait un
// 5RM de 266 lb ; ses séries de 5 disaient ≈ 225-230 (« est-ce que tu penses
// que je squatte 5 × 265 ? » — non). Un single ne prouve donc pas un 5RM :
// seule une série proche des reps de la clé compte, RPE lu en reps en réserve.
// Règle : on SIGNALE, on propose une valeur, l'athlète décide. Le signal seul
// ne change aucune charge.
function makeEngineContext(){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout(fn){ if(typeof fn === 'function') fn(); }, clearTimeout(){},
    navigator: {}, localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    APP_VERSION: 'TEST', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
    state: null,
    saves: 0, save(){ ctx.saves++; },
    focus(){ return {label: '', targetReps: {}}; }, buildWeekInfo(){ return {}; }, weekIdx(){ return 0; },
    collectSessionExercises(){ return []; }, nowIso(){ return ''; }, todayIsoDate(){ return '2026-11-07'; },
    parseTargetReps(f, fb){ const n = String(f||'').match(/\d+/g)||[]; const l = Number(n[n.length-1])||fb||8; return {min:l,max:l}; },
    confirm(){ return true; },
    regUpdates: [],
    CoachProfiles: {
      isActiveAdmin(){ return true; },
      getActive(){ return ctx.__reg; },
      getActiveId(){ return 'p1'; },
      update(id, patch){ ctx.regUpdates.push(patch); }
    },
    CoachBrainMemory: { exportSummary(){ return {profiles: []}; }, precisionTrend(){ return []; } },
    CoachTuningOverride: { ceilings(){ return {}; }, setCeiling(){ return true; }, removeCeiling(){ return true; } }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  // Panneau : un hôte factice qui rend les boutons cliquables depuis le HTML.
  const panel = { _html: '', set innerHTML(v){ this._html = v; }, get innerHTML(){ return this._html; },
    querySelectorAll(sel){
      const m = sel.match(/^\[([\w-]+)\]$/); if(!m) return [];
      const re = new RegExp(m[1] + '="([^"]*)"', 'g'); const out = []; let x;
      while((x = re.exec(this._html))){ const v = x[1]; out.push({ getAttribute(){ return v; }, onclick: null }); }
      ctx.__buttons = (ctx.__buttons || []).concat(out.map(b => ({attr: m[1], b})));
      return out;
    } };
  ctx.document = { getElementById(id){ return id === 'adminTuningBody' ? panel : null; }, querySelectorAll(){ return []; } };
  ctx.__panel = panel;
  ['scripts/app_helpers.js', 'scripts/charge/equipement.js', 'scripts/charge/movement_tuning.js',
   'scripts/charge/utilitaires.js', 'scripts/charge/mouvements.js', 'scripts/charge/rpe.js',
   'scripts/charge/historique.js', 'scripts/charge/scaling.js', 'scripts/charge/brain_stats.js',
   'scripts/charge/suggestion_deload.js', 'scripts/charge/suggestion_rpe.js', 'scripts/charge/suggestion_references.js', 'scripts/charge/suggestion_context.js', 'scripts/charge/suggestion_rules.js', 'scripts/charge/suggestion_state.js', 'scripts/charge/suggestion.js', 'scripts/profiles/reference.js', 'scripts/profiles/onboarding.js']
    .forEach(f => vm.runInNewContext(read(f), ctx, {filename: f}));
  const app = read('app.js');
  // Les vraies tables d'app.js, pas une copie : un renommage de clé y casse ce test.
  [/var PR_FIELD_MAP = \{[\s\S]*?\n\};/, /var TROPHY_FIELDS = \[[\s\S]*?\n\];/, /var REFERENCE_MOVEMENTS = \[[\s\S]*?\n\];/,
   /function normalizePrCompareName[\s\S]*?\n\}/, /function prCfgMatchesResult[\s\S]*?\n\}/,
   /function trophyNameKey[\s\S]*?\n\}/, /function trophyFieldForSingle[\s\S]*?\n\}/]
    .forEach(re => { const src = (app.match(re) || [''])[0]; if(!src) throw new Error('introuvable dans app.js : ' + re);
      vm.runInNewContext(src.replace(/^var /, ''), ctx); });
  ctx.movements.backSquat = {name: 'Back Squat'};
  vm.runInNewContext(read('scripts/profiles/admin_tuning.js'), ctx, {filename: 'scripts/profiles/admin_tuning.js'});
  return ctx;
}

// Profil réel réduit à ses chiffres utiles (CLAUDE.md § 3.4).
const BERTIN_RATIOS = {bench:1.2244897959183674, frontSquat:0.8113207547169812, strictPress:1.1935483870967742,
  powerClean:1.0975609756097562, backSquat5RM:0.8703703703703703, hipThrust8RM:1, bulgarianDb:0.9090909090909091,
  dbRdl:1, row8RM:1.1935483870967742, chestRow8RM:1.3333333333333333, latPulldown10RM:0.5, inclineDb10RM:1.1,
  _upperPush:1.1726793943383806, _upperPull:1.0089605734767024, _lowerBody:0.8635940113927535, _hinge:1,
  _olympic:1.0975609756097562, _overall:1.0194385761027722};
function strengthCtx(over){
  return Object.assign({rawName:'Back Squat', label:'Back Squat', equipment:'barbell', intents:['strength'],
    primaryIntent:'strength', kind:'main', blockTitle:'A. Back Squat', note:'', text:'', format:'montée vers 1RM',
    isWod:false, isTechnical:false, isLight:false, isRecovery:false, isStrength:true}, over || {});
}
function scenario(opts){
  opts = opts || {};
  const ctx = makeEngineContext();
  const date = opts.date || '2026-09-28';
  const load = opts.load || 255;
  const reps = opts.reps || 5;
  const rpe = opts.rpe || 8;
  const rowCtx = opts.rowContext || strengthCtx();
  ctx.__reg = {id: 'p1', createdAt: '2026-06-27T17:57:19.749Z', experienceLevel: 'avance', scaleRatios: Object.assign({}, BERTIN_RATIOS)};
  ctx.state = {
    week: 1, day: 'lundi', rpeHistory: {}, history: [],
    profile: Object.assign({onboarded: true, experienceLevel: 'avance', backSquat5RM: 235, scaleRatios: Object.assign({}, BERTIN_RATIOS),
      records: {backSquat1RM: {value: 300, date: '2026-09-28', unit: 'lb', source: 'historique'}}}, opts.profile || {}),
    movementRefs: {backSquat__strength: {movement:'backSquat', range:'strength', load: 300, reps: 1, date: '2026-09-28', status: 'hard', rpe: 9.5}},
    athleteState: {movements: {'Back Squat': {ranges: {}, history: [
      {date: '2026-08-03', load: 155, reps: 5, rpe: 7, status: 'context_logged', context: strengthCtx({intents:['technique'], primaryIntent:'technique', isTechnical:true, note:'technique'})},
      {date: '2026-09-28', load: 300, reps: 1, rpe: 9.5, status: 'hard', context: strengthCtx()},
      {date: '2026-11-02', load: 215, reps: 5, rpe: 8, status: 'success', context: strengthCtx({format:'4×5'})}
    ].concat(opts.noSet ? [] : [{date: date, load: load, reps: reps, rpe: rpe, status: opts.status || 'success', context: rowCtx}])}}}
  };
  if(opts.profile && opts.profile.scaleRatios) ctx.__reg.scaleRatios = Object.assign({}, opts.profile.scaleRatios);
  return ctx;
}
function backSquatGap(ctx){ return ctx.CoachOnboarding.calibrationGaps().filter(g => g.key === 'backSquat5RM')[0] || null; }

// 0. Le cas réel exact : 300 × 1 @9,5 (record, référence et séance) plus
//    215 × 5 @8 → aucun signal. Le single ne prouve pas un 5RM.
{
  const ctx = scenario({noSet: true});
  assert(!backSquatGap(ctx), 'Cas réel : un single à 300 lb ne fait pas proposer 265 lb en 5RM (obtenu « ' + (backSquatGap(ctx) || {}).text + ' »).');
}
// 1. Une vraie série de 5 au-dessus : 255 × 5 @8 → ≈ 270 lb en 5RM, 265 proposés.
{
  const ctx = scenario();
  const g = backSquatGap(ctx);
  assert(g && g.kind === 'stale' && g.proposed === 265 && g.calibrated === 235 && g.demonstrated === 270,
    '255 × 5 @8 (7 reps possibles) → signal, 265 lb proposés (obtenu ' + JSON.stringify(g && {k:g.kind, p:g.proposed, c:g.calibrated, d:g.demonstrated}) + ').');
  assert(g && g.text === 'Back Squat 5RM : calibré 235 lb · démontré ≈ 270 lb (255 × 5 @8, 28 sept.)',
    'La ligne affichée est celle du panneau (obtenu « ' + (g && g.text) + ' »).');
  assert(g && Math.abs(g.proposedRatio - 265 / 270) < 1e-12, 'Ratio proposé = 265 / 270 ≈ 0,98.');
}
// 2. Même record en contexte technique ou WOD : jamais une preuve.
{
  const tech = scenario({rowContext: strengthCtx({intents:['technique'], primaryIntent:'technique', isTechnical:true, note:'technique, léger'}), status: 'hard'});
  assert(!backSquatGap(tech), 'Un 300 × 1 loggé en contexte technique ne déclenche aucun signal.');
  const wod = scenario({rowContext: strengthCtx({kind:'wod', isWod:true, intents:['wod'], primaryIntent:'wod', blockTitle:'WOD'}), status: 'hard'});
  assert(!backSquatGap(wod), 'Un 300 × 1 loggé dans un WOD ne déclenche aucun signal.');
  const failed = scenario({status: 'fail'});
  assert(!backSquatGap(failed), 'Une tentative ratée ne déclenche aucun signal.');
}
// 3. Record plus ancien que la calibration : aucun signal.
{
  const ctx = scenario({profile: {calibrationLog: {backSquat5RM: {date: '2026-10-01', value: 235}}}});
  assert(!backSquatGap(ctx), 'Une calibration posée après le record n\'est pas « dépassée » par lui.');
  const undated = scenario(); undated.__reg = Object.assign({}, undated.__reg, {createdAt: ''});
  assert(!backSquatGap(undated), 'Sans date de calibration connue, on ne prétend pas qu\'une preuve est plus récente.');
}
// 4. Écart sous le seuil : silence.
{
  const ctx = scenario({load: 235, rpe: 9});   // 235 × 5 @9 → ≈ 242 lb en 5RM, +2,9 %
  assert(!backSquatGap(ctx), 'Un écart sous le seuil (' + ctx.CoachOnboarding.STALE_CALIBRATION_MIN_GAIN * 100 + ' %) ne dit rien.');
}
// 5. Calibration au-dessus des records : montrée, jamais proposée à la baisse.
{
  const r = Object.assign({}, BERTIN_RATIOS, {backSquat5RM: 300 / 270});
  const ctx = scenario({profile: {backSquat5RM: 300, scaleRatios: r}, rpe: 9.5});
  const g = backSquatGap(ctx);
  assert(g && g.kind === 'above' && g.proposed === null && /rien n'est proposé à la baisse/.test(g.text),
    'Calibration 300 au-dessus d\'un 255 × 5 @9,5 : montrée, rien de proposé.');
  const sub = scenario({profile: {backSquat5RM: 300, scaleRatios: r}});
  assert(!backSquatGap(sub), 'Une série sous-maximale (@8) ne dit jamais qu\'une calibration est trop haute.');
}
// 6. Le signal seul ne change aucune charge, ni l'état.
{
  const ctx = scenario();
  const cases = [['Back Squat', 225, 5], ['Back Squat', 175, 3], ['Front Squat', 185, 5], ['Goblet Squat', 50, 10],
    ['Bulgarian Split Squat', 45, 8], ['Bench Press', 195, 5], ['Leg Press', 400, 8], ['Overhead Squat', 95, 5]];
  const matrix = () => JSON.stringify(cases.map(c => [ctx.coachSafeSuggestedLoad(c[0], c[1] + ' lb', c[2], {kind:'main', week:1, day:'lundi'}),
    ctx.coachScaleProgramLoad(c[0], c[1], false), ctx.coachScaleProgramLoad(c[0], c[1], true)]));
  const before = matrix(), stateBefore = JSON.stringify(ctx.state), saves = ctx.saves;
  ctx.CoachOnboarding.calibrationGaps();
  ctx.CoachOnboarding.calibrationNoteFor('Back Squat', '175 lb', '150 lb');
  ctx.RacineAdminTuning.render();
  ctx.RacineAdminTuning.analyze();
  assert(matrix() === before, 'Matrice de charges identique bit à bit après lecture du signal, rendu du panneau et note du (!).');
  assert(JSON.stringify(ctx.state) === stateBefore && ctx.saves === saves && ctx.regUpdates.length === 0,
    'Le signal n\'écrit rien : ni state, ni sauvegarde, ni registre.');
  assert(/Mettre à jour à 265 lb/.test(ctx.__panel.innerHTML) && /Calibration dépassée/.test(ctx.__panel.innerHTML),
    'Le panneau affiche la ligne et le bouton « Mettre à jour à 265 lb ».');
}
// 7. Acceptation : setCalibrationValue une seule fois, après confirmation ;
//    ratio 0,98, _lowerBody / _overall recalculées, rien d'autre ; annulable.
{
  const ctx = scenario();
  const real = ctx.CoachOnboarding.setCalibrationValue;
  let calls = [];
  ctx.CoachOnboarding.setCalibrationValue = function(){ calls.push([].slice.call(arguments)); return real.apply(this, arguments); };
  const before = Object.assign({}, ctx.state.profile.scaleRatios);
  ctx.confirm = () => false;
  ctx.__buttons = []; ctx.RacineAdminTuning.render();
  const refuse = ctx.__buttons.filter(x => x.attr === 'data-calib-update' && x.b.getAttribute() === 'backSquat5RM')[0];
  refuse && refuse.b.onclick && refuse.b.onclick();
  assert(refuse && calls.length === 0 && ctx.state.profile.backSquat5RM === 235, 'Sans confirmation, rien n\'est écrit.');
  ctx.confirm = () => true;
  ctx.__buttons = []; ctx.RacineAdminTuning.render();
  const btn = ctx.__buttons.filter(x => x.attr === 'data-calib-update' && x.b.getAttribute() === 'backSquat5RM')[0];
  btn.b.onclick();
  const after = ctx.state.profile.scaleRatios;
  const changed = Object.keys(before).filter(k => before[k] !== after[k]).sort();
  assert(calls.length === 1 && calls[0][0] === 'backSquat5RM' && calls[0][1] === 265,
    'Accepter appelle setCalibrationValue une seule fois, avec 265 (appels : ' + JSON.stringify(calls) + ').');
  assert(Math.abs(after.backSquat5RM - 0.9814814814814815) < 1e-12 && ctx.state.profile.backSquat5RM === 265,
    'Ratio Back Squat 0,98 (obtenu ' + after.backSquat5RM + ').');
  assert(JSON.stringify(changed) === JSON.stringify(['_lowerBody', '_overall', 'backSquat5RM']),
    'Seules _lowerBody et _overall sont recalculées (changées : ' + changed + ').');
  assert(Math.abs(after._lowerBody - (BERTIN_RATIOS.frontSquat + 265 / 270 + BERTIN_RATIOS.bulgarianDb) / 3) < 1e-12,
    '_lowerBody = moyenne de ses trois composantes.');
  const log = ctx.state.profile.calibrationLog.backSquat5RM;
  assert(log && log.previous === 235 && log.date === '2026-11-07' && /255 × 5/.test(log.source),
    'L\'ancienne valeur et la preuve sont gardées dans la note.');
  assert(!backSquatGap(ctx), 'Une fois acceptée, la calibration n\'est plus signalée.');
  ctx.__buttons = []; ctx.RacineAdminTuning.render();
  const undo = ctx.__buttons.filter(x => x.attr === 'data-calib-undo' && x.b.getAttribute() === 'backSquat5RM')[0];
  assert(undo, 'Le panneau offre « Annuler » après la mise à jour.');
  undo && undo.b.onclick();
  assert(ctx.state.profile.backSquat5RM === 235 && JSON.stringify(ctx.state.profile.scaleRatios) === JSON.stringify(before)
    && !ctx.state.profile.calibrationLog.backSquat5RM && backSquatGap(ctx),
    'Annuler rétablit valeur, ratios et date : le signal revient.');
}
// 8. Frontières.
{
  const src = read('scripts/profiles/admin_tuning.js');
  const n = (src.match(/setCalibrationValue\(/g) || []).length;
  assert(n === 1 && /confirm\([\s\S]*?if\(!ok\) return;[\s\S]*?setCalibrationValue\(/.test(src),
    'Le panneau n\'écrit une calibration qu\'à un seul endroit, après confirm().');
  const ob = read('scripts/profiles/onboarding.js');
  const body = (ob.match(/api\.calibrationGaps = function\(\)\{[\s\S]*?\n  \};/) || [''])[0];
  assert(body && !/setCalibrationValue|save\(|state\.profile\[[^\]]+\]\s*=/.test(body),
    'calibrationGaps() ne contient aucune écriture.');
  assert(/calibrationGaps/.test(read('scripts/coach_ai/context.js')) && /calibrationNote/.test(read('scripts/ui_modals.js')),
    'Coach IA et le (!) lisent la même détection.');
}

if(failed){
  console.error('\nÉCHEC calibration_readout_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK calibration_readout_checks.js — ' + checks + ' controles.');

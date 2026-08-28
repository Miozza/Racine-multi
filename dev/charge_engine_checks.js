#!/usr/bin/env node
/*
  Racine - tests cibles du moteur de charges.

  Usage :
    node dev/charge_engine_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];

function rel(p){ return path.join(root, p); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }
function fail(msg){ errors.push(msg); }
function ok(msg){ notes.push(msg); }
function assert(cond, msg){ if(!cond) fail(msg); else ok(msg); }
function includes(arr, item){ return Array.isArray(arr) && arr.indexOf(item) !== -1; }
function notIncludes(arr, item){ return !Array.isArray(arr) || arr.indexOf(item) === -1; }

const ctx = {
  console,
  Math,
  Date,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  RegExp,
  parseInt,
  parseFloat,
  isNaN,
  setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
  clearTimeout: function(){},
  document: { getElementById: function(){ return null; } },
  navigator: {},
  localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {
    'Power Clean':'135 lb',
    'Lateral Raise DB':'20 lb',
    'Lateral Raise câble':'30 lb',
    'Rear Delt Fly DB':'20 lb',
    'Rear Delt Fly câble':'30 lb',
    'Overhead Rope Extension':'50 lb'
  },
  CHARGE_ORDER: [],
  movements: {
    powerClean:{name:'Power Clean', profile:'powerClean'},
    strictPress:{name:'Strict Press', profile:'strictPress'},
    bench:{name:'Bench Press', profile:'bench'}
  },
  state: {
    week: 3,
    day: 'vendredi',
    rpeHistory: {},
    athleteState: { movements: {} }
  },
  save: function(){},
  focus: function(){ return {label:'test cycle', targetReps:{0:8,1:8,2:8,3:8,4:8,5:8}}; },
  buildWeekInfo: function(){ return {6:{label:'S6', goal:'Deload facile'}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; },
  parseTargetReps: function(format, fallback){
    const nums = String(format || '').match(/\d+/g) || [];
    if(!nums.length)return {min:fallback || 8, max:fallback || 8};
    const last = Number(nums[nums.length - 1]) || fallback || 8;
    return {min:last, max:last};
  }
};
ctx.window = ctx;
ctx.globalThis = ctx;

const loadOrder = [
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/movement_tuning.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js',
  'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js',
  'scripts/charge/suggestion.js',
  'scripts/charge_diagnostic_ui.js'
];

loadOrder.forEach(file => {
  try {
    vm.runInNewContext(read(file), ctx, { filename: file });
  } catch (err) {
    fail('Chargement impossible de ' + file + ' : ' + err.message);
  }
});

function resetState(){
  ctx.state.week = 3;
  ctx.state.day = 'vendredi';
  ctx.state.athleteState = { movements: {} };
  ctx.__coachLoadHints = {};
}

try {
  // 1. Fonctions exposees attendues.
  [
    'coachBuildMovementContext',
    'coachIsLimitedProgressionContext',
    'coachContextProgressionReason',
    'coachFilterHistoryForProgression',
    'coachBuildMovementHistorySignal',
    'guardedSuggestedLoadDecision',
    'updateAthleteStateFromResults',
    'coachMovementLookupLabels',
    'canonicalMovementLabel',
    'coachMovementEquipmentFamily',
    'buildChargeDiagnosticForExercise'
  ].forEach(name => assert(typeof ctx[name] === 'function', 'Fonction disponible : ' + name));

  // 2. Alias par equipement : DB ne doit pas fusionner avec cable.
  const lateralDb = ctx.coachMovementLookupLabels('Lateral Raise DB');
  const lateralCable = ctx.coachMovementLookupLabels('Lateral Raise câble');
  const rearDb = ctx.coachMovementLookupLabels('Rear Delt Fly DB');
  const rearCable = ctx.coachMovementLookupLabels('Rear Delt Fly câble');

  assert(includes(lateralDb, 'Lateral Raise haltères'), 'Lateral Raise DB lit l ancien alias halteres.');
  assert(notIncludes(lateralDb, 'Lateral Raise câble bas'), 'Lateral Raise DB ne lit pas l alias cable.');
  assert(includes(lateralCable, 'Lateral Raise câble bas'), 'Lateral Raise cable lit l ancien alias cable bas.');
  assert(notIncludes(lateralCable, 'Lateral Raise haltères'), 'Lateral Raise cable ne lit pas l alias halteres.');
  assert(includes(rearDb, 'Rear Delt Fly haltères'), 'Rear Delt Fly DB lit l ancien alias halteres.');
  assert(notIncludes(rearDb, 'Rear Delt Fly câble bas'), 'Rear Delt Fly DB ne lit pas l alias cable.');
  assert(includes(rearCable, 'Rear Delt Fly câble bas'), 'Rear Delt Fly cable lit l ancien alias cable bas.');
  assert(notIncludes(rearCable, 'Rear Delt Fly haltères'), 'Rear Delt Fly cable ne lit pas l alias halteres.');

  assert(ctx.coachMovementEquipmentFamily('Lateral Raise DB') === 'db', 'Equipement Lateral Raise DB = dumbbell.');
  assert(ctx.coachMovementEquipmentFamily('Lateral Raise câble') === 'cable', 'Equipement Lateral Raise cable = cable.');
  assert(ctx.coachMovementEquipmentFamily('Rear Delt Fly DB') === 'db', 'Equipement Rear Delt Fly DB = dumbbell.');
  assert(ctx.coachMovementEquipmentFamily('Rear Delt Fly câble') === 'cable', 'Equipement Rear Delt Fly cable = cable.');

  // 3. Contexte/intention : le nom reste simple, l intention vit a cote.
  const pcTechnique = ctx.coachBuildMovementContext('Power Clean', { note:'technique vitesse propre', kind:'accessory', day:'vendredi', week:3 });
  const pcWod = ctx.coachBuildMovementContext('Power Clean', { kind:'wod', format:'AMRAP 8', text:'5 Power Clean + 8 Wall Balls + 10 cal Row' });
  const pcStrength = ctx.coachBuildMovementContext('Power Clean', { kind:'main', blockTitle:'Force principale' });
  assert(pcTechnique.label === 'Power Clean', 'Power Clean technique garde le nom simple Power Clean.');
  assert(includes(pcTechnique.intents, 'technique') && ctx.coachIsLimitedProgressionContext(pcTechnique), 'Power Clean avec note technique = contexte limite.');
  assert(includes(pcWod.intents, 'wod') && ctx.coachIsLimitedProgressionContext(pcWod), 'Power Clean en WOD = contexte limite.');
  assert(!ctx.coachIsLimitedProgressionContext(pcStrength), 'Power Clean principal/force non limite par defaut.');

  // 4. Filtrage d historique par contexte.
  const hist = [
    { date:'2026-01-01', load:115, reps:5, rpe:7 },
    { date:'2026-01-08', load:135, reps:5, rpe:7, context:pcTechnique },
    { date:'2026-01-15', load:185, reps:5, rpe:8, context:pcStrength }
  ];
  const mainFiltered = ctx.coachFilterHistoryForProgression(hist, pcStrength);
  const techFiltered = ctx.coachFilterHistoryForProgression(hist, pcTechnique);
  assert(mainFiltered.some(r => r.load === 115) && mainFiltered.some(r => r.load === 185), 'Historique principal garde les anciennes entrees sans contexte et les entrees principales.');
  assert(!mainFiltered.some(r => r.load === 135), 'Historique principal exclut les entrees techniques contextualisees.');
  assert(techFiltered.some(r => r.load === 115) && techFiltered.some(r => r.load === 135), 'Historique technique garde les anciennes entrees sans contexte et les entrees limitees.');
  assert(!techFiltered.some(r => r.load === 185), 'Historique technique exclut les entrees principales contextualisees.');

  // 5. Decision de suggestion : contexte limite ne doit pas monter comme principal.
  resetState();
  ctx.state.athleteState.movements['Power Clean'] = {
    ranges: { strength: { currentLoad:185, actualLoad:185, currentReps:5, actualReps:5, rpe:7, confidence:0.9, status:'upgrade_ready' } },
    history: [
      { date:'2026-01-15', load:185, reps:5, rpe:7, range:'strength', status:'upgrade_ready', context:pcStrength }
    ]
  };
  const techDecision = ctx.guardedSuggestedLoadDecision('Power Clean', '115 lb', 5, pcTechnique);
  const mainDecision = ctx.guardedSuggestedLoadDecision('Power Clean', '115 lb', 5, pcStrength);
  assert(techDecision.loadText === '115 lb', 'Power Clean technique conserve la charge du programme, pas la reference lourde.');
  assert(mainDecision.loadText !== '115 lb', 'Power Clean principal peut utiliser l historique controle quand le programme sous-suggere.');

  // 6. Mise a jour athlete_state : resultat WOD/technique logge mais ne remplace pas la capacite principale.
  resetState();
  ctx.state.day = 'vendredi';
  ctx.updateAthleteStateFromResults({
    'Power Clean': { load:'135 lb', reps:5, rpe:7, planned:{ reps:5, kind:'wod', format:'AMRAP 8', context:pcWod } }
  }, '2026-02-01');
  const mv = ctx.state.athleteState.movements['Power Clean'];
  assert(mv && mv.history && mv.history.length === 1, 'Resultat Power Clean WOD ajoute a l historique.');
  assert(mv.history[0].status === 'context_logged', 'Resultat WOD est marque context_logged.');
  assert(!mv.ranges.strength, 'Resultat WOD ne remplace pas la capacite strength.');

  // 7. Historique comme outil moteur : tendance, RPE repete et stagnation.
  const historySignalBlocked = ctx.coachBuildMovementHistorySignal('Bench Press', [
    { date:'2026-05-01', load:185, reps:8, rpe:9 },
    { date:'2026-05-08', load:185, reps:8, rpe:9.5 },
    { date:'2026-05-15', load:185, reps:7, rpe:9 }
  ], pcStrength, 8);
  assert(historySignalBlocked.status === 'blocked', 'Signal historique bloque deux RPE hauts ou plus.');
  assert(historySignalBlocked.highRpeCount >= 2, 'Signal historique compte les RPE eleves recents.');

  const historySignalReady = ctx.coachBuildMovementHistorySignal('Bench Press', [
    { date:'2026-05-01', load:185, reps:8, rpe:7.5 },
    { date:'2026-05-08', load:190, reps:8, rpe:8 },
    { date:'2026-05-15', load:190, reps:8, rpe:7.5 }
  ], pcStrength, 8);
  assert(historySignalReady.status === 'ready', 'Signal historique reconnait plusieurs references controlees.');

  resetState();
  ctx.state.day = 'lundi';
  ctx.state.athleteState.movements['Bench Press'] = {
    ranges: { hypertrophy: { currentLoad:185, actualLoad:185, currentReps:8, actualReps:8, rpe:9.5, confidence:0.75, status:'hard' } },
    history: [
      { date:'2026-05-01', load:185, reps:8, rpe:9, range:'hypertrophy', status:'hard' },
      { date:'2026-05-08', load:185, reps:8, rpe:9.5, range:'hypertrophy', status:'hard' },
      { date:'2026-05-15', load:185, reps:7, rpe:9, range:'hypertrophy', status:'failed' }
    ]
  };
  const benchCtx = ctx.coachBuildMovementContext('Bench Press', { kind:'main', blockTitle:'Force principale', format:'3x8', day:'lundi', week:3 });
  const benchDecision = ctx.guardedSuggestedLoadDecision('Bench Press', '195 lb', 8, benchCtx);
  assert(benchDecision.loadNum === 185, 'Le moteur utilise le signal historique pour bloquer une hausse apres RPE hauts repetes.');
  assert(benchDecision.historySignal && benchDecision.historySignal.status === 'blocked', 'La decision expose le signal historique utilise.');

  // 8. Coherence decisionnelle : la charge finale doit suivre la regle expliquee.
  resetState();
  ctx.state.day = 'jeudi';
  ctx.state.athleteState.movements['Bulgarian Split Squat'] = {
    ranges: { hypertrophy: { currentLoad:45, actualLoad:45, currentReps:8, actualReps:8, rpe:9, confidence:0.9, status:'hard_success' } },
    history: [
      { date:'2026-06-04', load:35, reps:8, rpe:7, range:'hypertrophy', status:'easy_success' },
      { date:'2026-06-11', load:45, reps:8, rpe:9, range:'hypertrophy', status:'hard_success' }
    ]
  };
  const bulgarianCtx = ctx.coachBuildMovementContext('Bulgarian Split Squat', { kind:'accessory', blockTitle:'B. Superset jambes + core', format:'3x8-10/jambe', day:'jeudi', week:3 });
  const bulgarianDecision = ctx.guardedSuggestedLoadDecision('Bulgarian Split Squat', '50 lb', 8, bulgarianCtx);
  assert(bulgarianDecision.loadNum === 45, 'Bulgarian Split Squat RPE 9 bloque la hausse finale a 45 lb.');
  assert(/aucune hausse automatique|Bloque/.test(bulgarianDecision.reason), 'Bulgarian Split Squat explique le blocage RPE 9.');

  resetState();
  ctx.state.day = 'jeudi';
  ctx.state.athleteState.movements['DB RDL'] = {
    ranges: { hypertrophy: { currentLoad:60, actualLoad:60, currentReps:10, actualReps:10, rpe:7, confidence:0.9, status:'upgrade_ready' } },
    history: [
      { date:'2026-06-04', load:60, reps:10, rpe:8, range:'hypertrophy', status:'success' },
      { date:'2026-06-11', load:60, reps:10, rpe:7, range:'hypertrophy', status:'easy_success' }
    ]
  };
  const rdlCtx = ctx.coachBuildMovementContext('DB RDL', { kind:'accessory', blockTitle:'C. Charniere posterieure', format:'3x10', day:'jeudi', week:3 });
  const rdlDecision = ctx.guardedSuggestedLoadDecision('DB RDL', '60 lb', 10, rdlCtx);
  assert(rdlDecision.loadNum === 65, 'DB RDL 60x10 RPE 7 propose la prochaine charge disponible 65 lb.');
  assert(/Progression prete|Petite hausse/.test(rdlDecision.reason), 'DB RDL explique la progression legere.');
  assert(ctx.coachMovementEquipmentFamily('Bulgarian Split Squat') === 'db', 'Bulgarian Split Squat classe equipement DB, pas barre.');


  resetState();
  ctx.state.day = 'jeudi';
  const bulgarianRecentCtx = ctx.coachBuildMovementContext('Bulgarian Split Squat', { kind:'accessory', blockTitle:'B. Superset jambes + core', format:'3x8-10/jambe', day:'jeudi', week:3 });
  ctx.state.athleteState.movements['Bulgarian Split Squat'] = {
    ranges: { hypertrophy: { currentLoad:40, actualLoad:40, currentReps:8, actualReps:8, rpe:8, confidence:0.8, status:'success' } },
    history: [
      { date:'2026-06-04', load:35, reps:8, rpe:7, range:'hypertrophy', status:'upgrade_ready', context:bulgarianRecentCtx },
      { date:'2026-06-11', load:45, reps:8, rpe:9, range:'hypertrophy', status:'hard', context:bulgarianRecentCtx },
      { date:'2026-06-18', load:40, reps:8, rpe:8, range:'hypertrophy', status:'success', context:bulgarianRecentCtx }
    ]
  };
  const bulgarianRecentDecision = ctx.guardedSuggestedLoadDecision('Bulgarian Split Squat', '50 lb', 8, bulgarianRecentCtx);
  assert(bulgarianRecentDecision.loadNum === 45, 'Bulgarian Split Squat garde 45 lb quand 45 lb RPE 9 reste non resolu malgre un retour a 40 lb.');
  assert(/Frein RPE recent/.test(bulgarianRecentDecision.reason), 'Bulgarian Split Squat explique le frein RPE recent non resolu.');
  const bulgarianHintKey = ctx.coachNormalizeMoveText('Bulgarian Split Squat');
  assert(ctx.__coachLoadHints[bulgarianHintKey] && ctx.__coachLoadHints[bulgarianHintKey].load === '45 lb / main ⚠', 'La modale ! lit la charge DB finale gardee 45 lb / main, pas la charge brute 50 lb.');

  // 8c. Plancher historique : un dernier set reussi a RPE eleve (reps atteintes,
  // pas un echec) ne doit pas etre sous-suggere par le programme, meme avec un
  // frein RPE recent non resolu sur un poids plus leger plus tot dans l historique.
  resetState();
  ctx.state.day = 'mardi';
  const frontSquatCtx = ctx.coachBuildMovementContext('Front Squat', { kind:'main', blockTitle:'Force principale', format:'3x8', day:'mardi', week:3 });
  ctx.state.athleteState.movements['Front Squat'] = {
    ranges: { hypertrophy: { currentLoad:60, actualLoad:60, currentReps:8, actualReps:8, rpe:9, confidence:0.8, status:'hard' } },
    history: [
      { date:'2026-06-01', load:50, reps:8, rpe:7, range:'hypertrophy', status:'easy_success', context:frontSquatCtx },
      { date:'2026-06-15', load:60, reps:8, rpe:9, range:'hypertrophy', status:'hard_success', context:frontSquatCtx }
    ]
  };
  const frontSquatDecision = ctx.guardedSuggestedLoadDecision('Front Squat', '55 lb', 8, frontSquatCtx);
  assert(frontSquatDecision.loadNum === 60, 'Plancher historique : Front Squat ne redescend pas sous le dernier 60 lb x8 RPE9 reellement reussi.');
  assert(/Plancher de validation|Plancher maitrise|Plancher historique/.test(frontSquatDecision.reason), 'Brain explique le plancher historique comme validation/maitrise avant de descendre sous 60 lb.');

  // 8d. Ecart de reps : un 1RM ou singulier recent ne se traduit pas directement
  // en charge pour un format a plusieurs reps (ex: 210 lb x1 ne suggere pas
  // 210+ lb pour un 5x5). La projection Epley doit ramener la suggestion vers
  // une charge realiste pour la cible reelle.
  resetState();
  ctx.state.day = 'mardi';
  const frontSquatMaxCtx = ctx.coachBuildMovementContext('Front Squat', { kind:'main', blockTitle:'Force principale', format:'1RM', day:'mardi', week:3 });
  ctx.updateAthleteStateFromResults({
    'Front Squat': { load:'210 lb', reps:1, rpe:8, planned:{ name:'Front Squat', reps:1, targetMin:1, kind:'main', format:'1RM', context:frontSquatMaxCtx } }
  }, '2026-06-22');
  const frontSquatTopSetCtx = ctx.coachBuildMovementContext('Front Squat', { kind:'main', blockTitle:'Force principale', format:'5x5', day:'mardi', week:3 });
  const frontSquatRepGapDecision = ctx.guardedSuggestedLoadDecision('Front Squat', '195 lb', 5, frontSquatTopSetCtx);
  assert(frontSquatRepGapDecision.loadNum === 185, 'Ecart de reps : un 210 lb x1 recent ne suggere pas la meme charge pour un 5x5 ; capacite projetee ramenee a 185 lb.');
  assert(/Ecart de reps/.test(frontSquatRepGapDecision.reason), 'Ecart de reps explique la projection Epley utilisee pour limiter la suggestion.');

  // 9. Deload : la semaine 6 reduit la suggestion finale apres apprentissage historique.
  resetState();
  ctx.state.week = 6;
  ctx.state.day = 'lundi';
  const strictCtx = ctx.coachBuildMovementContext('Strict Press', { kind:'main', blockTitle:'Force principale', format:'3x8', day:'lundi', week:6 });
  ctx.state.athleteState.movements['Strict Press'] = {
    ranges: { hypertrophy: { currentLoad:115, actualLoad:115, currentReps:8, actualReps:8, rpe:8, confidence:0.9, status:'success' } },
    history: [
      { date:'2026-06-01', load:115, reps:8, rpe:8, range:'hypertrophy', status:'success', context:strictCtx }
    ]
  };
  const deloadDecision = ctx.guardedSuggestedLoadDecision('Strict Press', '125 lb', 8, strictCtx);
  assert(deloadDecision.loadNum >= 100 && deloadDecision.loadNum <= 110, 'Deload Strict Press S6 ramene 125 lb vers 100-110 lb.');
  assert(deloadDecision.loadNum < 115, 'Deload Strict Press reste sous le peak recent 115 lb.');
  assert(/Deload actif/.test(deloadDecision.reason), 'Deload Strict Press explique la reduction finale.');

  // 10. Poids du corps leste : 0 lb est une vraie charge externe quand reps/RPE existent.
  resetState();
  ctx.state.day = 'mardi';
  const pullCtx = ctx.coachBuildMovementContext('Weighted Pull-up', { kind:'accessory', blockTitle:'Pull lourd', format:'3x8', day:'mardi', week:3 });
  ctx.updateAthleteStateFromResults({
    'Weighted Pull-up': { load:'0 lb', reps:8, rpe:8, planned:{ name:'Weighted Pull-up', reps:8, targetMin:8, kind:'accessory', format:'3x8', context:pullCtx, bodyweightMovement:true } }
  }, '2026-06-01');
  ctx.updateAthleteStateFromResults({
    'Weighted Pull-up': { load:'0 lb', reps:8, rpe:7.5, planned:{ name:'Weighted Pull-up', reps:8, targetMin:8, kind:'accessory', format:'3x8', context:pullCtx, bodyweightMovement:true } }
  }, '2026-06-08');
  const pullMv = ctx.state.athleteState.movements['Weighted Pull-up'];
  assert(pullMv && pullMv.history.length === 2, 'Weighted Pull-up 0 lb ajoute deux entrees historiques.');
  assert(pullMv.ranges.hypertrophy && pullMv.ranges.hypertrophy.currentLoad === 0, 'Weighted Pull-up conserve externalLoad 0 lb comme charge valide.');
  const pullSignal = ctx.coachBuildMovementHistorySignal('Weighted Pull-up', pullMv.history, pullCtx, 8);
  assert(pullSignal.rows.length === 2, 'Weighted Pull-up 0 lb est exploitable par le signal historique.');
  const pullDiag = ctx.buildChargeDiagnosticForExercise({name:'Weighted Pull-up', load:'0 lb', format:'3x8'}, '0 lb', {targetReps:8, kind:'accessory', blockTitle:'Pull lourd', day:'mardi', week:3});
  assert(pullDiag.validHistoryCount >= 2, 'Diagnostic Weighted Pull-up compte 0 lb comme historique valide.');
  assert(!pullDiag.alerts.some(a => a.code === 'data_low'), 'Diagnostic Weighted Pull-up ne crie plus donnees faibles apres historique suffisant.');

  // 11. RPE brake general : RPE >= 9 bloque toute hausse, pas seulement l isolation.
  resetState();
  ctx.state.day = 'mercredi';
  const inclineCtx = ctx.coachBuildMovementContext('Incline DB Press', { kind:'accessory', blockTitle:'Push volume', format:'3x8', day:'mercredi', week:3 });
  ctx.state.athleteState.movements['Incline DB Press'] = {
    ranges: { hypertrophy: { currentLoad:45, actualLoad:45, currentReps:8, actualReps:8, rpe:9, confidence:0.8, status:'hard_success' } },
    history: [ { date:'2026-06-10', load:45, reps:8, rpe:9, range:'hypertrophy', status:'hard_success', context:inclineCtx } ]
  };
  const inclineDecision = ctx.guardedSuggestedLoadDecision('Incline DB Press', '50 lb', 8, inclineCtx);
  assert(inclineDecision.loadNum <= 45, 'Incline DB Press RPE 9 ne monte pas au-dessus de la derniere charge reelle.');

  // 12. Apprentissage : si le reel controle depasse la suggestion, il devient la reference suivante.
  resetState();
  ctx.state.day = 'jeudi';
  const rdlLearnCtx = ctx.coachBuildMovementContext('DB RDL', { kind:'accessory', blockTitle:'C. Charniere posterieure', format:'3x10', day:'jeudi', week:3 });
  ctx.state.athleteState.movements['DB RDL'] = {
    ranges: { hypertrophy: { currentLoad:60, actualLoad:60, currentReps:10, actualReps:10, rpe:7.5, confidence:0.8, status:'success' } },
    history: [ { date:'2026-06-01', load:60, reps:10, rpe:7.5, range:'hypertrophy', status:'success', context:rdlLearnCtx } ]
  };
  ctx.updateAthleteStateFromResults({
    'DB RDL': { load:'70 lb', reps:10, rpe:8, planned:{ name:'DB RDL', load:60, reps:10, targetMin:10, kind:'accessory', format:'3x10', context:rdlLearnCtx } }
  }, '2026-06-08');
  const learnedRdlDecision = ctx.guardedSuggestedLoadDecision('DB RDL', '60 lb', 10, rdlLearnCtx);
  assert(learnedRdlDecision.loadNum === 70, 'DB RDL reel 70x10 RPE 8 devient la prochaine suggestion, pas 60 lb.');

  // 13b. Scaling par profil : sans profil, ratio neutre.
  resetState();
  ctx.state.profile = null;
  assert(ctx.coachUserLoadRatio('Back Squat') === 1, 'Sans profil actif, le ratio de charge reste neutre (1).');
  assert(ctx.coachApplyUserLoadScale('Back Squat', 100) === 100, 'Sans profil actif, la charge generique n est pas transformee.');
  assert(ctx.coachAggressivenessFactor() === 1, 'Sans profil actif, l agressivite de progression reste 1.');

  // 13c. Scaling par profil : ratio par famille de mouvement applique et arrondi.
  resetState();
  ctx.state.profile = { scaleRatios: { _lowerBody: 0.8, _overall: 0.9 } };
  assert(ctx.coachUserLoadRatio('Back Squat') === 0.8, 'Back Squat utilise le ratio de famille lowerBody.');
  assert(ctx.coachUserLoadRatio('Cable Row') === 0.9, 'Un mouvement hors famille connue retombe sur le ratio overall.');
  const scaledSquat = ctx.coachApplyUserLoadScale('Back Squat', 100);
  assert(scaledSquat < 100 && scaledSquat > 0, 'Back Squat scale a la baisse avec un ratio de 0.8.');

  // 13d. Vitesse de progression (V4.5.58) : MESUREE par le moteur, inclinee
  // par le profil. Le curseur libre 0,4-1,8 est remplace par trois positions ;
  // une valeur heritee hors de ces positions est ramenee A LA LECTURE, sans
  // reecriture du stockage (donc sans migration).
  {
    const BIAS = ctx.COACH_MOVEMENT_TUNING.progressionSpeed.bias;
    const MEM = ctx.CoachBrainMemory;

    // Valeurs heritees : rapprochees de la position la plus proche.
    ctx.state.profile = { aggressiveness: 5 };
    assert(ctx.coachProgressionBias() === BIAS.ambitieux, 'Valeur heritee 5 ramenee a la position ambitieuse.');
    ctx.state.profile = { aggressiveness: 0.01 };
    assert(ctx.coachProgressionBias() === BIAS.prudent, 'Valeur heritee 0.01 ramenee a la position prudente.');
    ctx.state.profile = { aggressiveness: 0.95 };
    assert(ctx.coachProgressionBias() === BIAS.normal, 'Valeur heritee 0.95 ramenee a la position normale.');

    // Sans mesure, le declare est tout ce qui existe.
    MEM.clear();
    ctx.state.profile = { aggressiveness: BIAS.normal };
    assert(ctx.coachObservedAggressiveness('Back Squat') === 1, 'Aucune observation : aucune vitesse inventee, facteur neutre.');
    assert(ctx.coachAggressivenessFactor('Back Squat') === BIAS.normal, 'Sans mesure, le facteur vaut le biais declare.');

    // Avec de la mesure, c est elle qui pilote.
    function seedAmbition(ambition, tested){
      MEM.clear();
      const mem = MEM.read();
      mem.profiles[ctx.coachNormalizeMoveText('Back Squat') + '::strength'] =
        { label:'Back Squat', intent:'strength', ambition:ambition, testedPredictions:tested };
      MEM.write(mem);
    }
    seedAmbition(0.95, 12);
    const mesureHaute = ctx.coachAggressivenessFactor('Back Squat');
    seedAmbition(0.25, 12);
    const mesureBasse = ctx.coachAggressivenessFactor('Back Squat');
    assert(mesureHaute > 1 && mesureBasse < 1 && mesureHaute > mesureBasse,
      'La mesure pilote : ambition haute accelere, ambition basse ralentit (' + mesureBasse.toFixed(2) + ' < 1 < ' + mesureHaute.toFixed(2) + ').');

    // Deux seances ne definissent pas une vitesse : la mesure est ponderee.
    seedAmbition(0.95, 1);
    const peuDeVolume = ctx.coachAggressivenessFactor('Back Squat');
    seedAmbition(0.95, 12);
    assert(peuDeVolume < ctx.coachAggressivenessFactor('Back Squat'),
      'Volume faible : la mesure est tiree vers le neutre plutot qu affirmee.');

    // Le biais incline la mesure, il ne la remplace pas.
    seedAmbition(0.95, 12);
    ctx.state.profile = { aggressiveness: BIAS.prudent };
    const prudentMesure = ctx.coachAggressivenessFactor('Back Squat');
    ctx.state.profile = { aggressiveness: BIAS.ambitieux };
    assert(prudentMesure < ctx.coachAggressivenessFactor('Back Squat'),
      'A mesure egale, la position prudente reste sous la position ambitieuse.');

    // Les bornes finales tiennent toujours.
    seedAmbition(0.95, 999);
    ctx.state.profile = { aggressiveness: BIAS.ambitieux };
    const f = ctx.coachAggressivenessFactor('Back Squat');
    assert(f >= 0.4 && f <= 1.8, 'Le facteur final reste borne entre 0.4 et 1.8 (' + f.toFixed(2) + ').');

    MEM.clear();
    ctx.state.profile = null;
    assert(ctx.coachAggressivenessFactor('Back Squat') === 1, 'Sans profil ni mesure, la vitesse reste neutre.');
  }



  // 14. Brain V2 statistiques : confiance de prediction par mouvement + intention.
  assert(typeof ctx.coachBrainBuildStats === 'function', 'Brain V2 expose coachBrainBuildStats.');
  assert(ctx.coachBrainIntentKey(ctx.coachBuildMovementContext('Front Squat', {kind:'main', blockTitle:'Force principale', format:'5x3'}), 3) === 'strength', 'Brain V2 classe Front Squat 5x3 comme strength.');
  assert(ctx.coachBrainSensitivity('Weighted Pull-up', pullCtx) === 'high', 'Brain V2 classe les mouvements poids de corps lestes comme haute sensibilite.');

  const rpeFlatStats = ctx.coachBrainRpeReliability([
    {load:100,reps:8,rpe:8},{load:105,reps:8,rpe:8},{load:110,reps:8,rpe:8},
    {load:115,reps:8,rpe:8},{load:120,reps:8,rpe:8},{load:125,reps:8,rpe:8}
  ]);
  assert(['personalized','compressed','low'].indexOf(rpeFlatStats.label) !== -1, 'Brain V2 applique un profil RPE personnalise quand tout est note pareil.');

  resetState();
  ctx.state.day = 'jeudi';
  const fsCtxV2 = ctx.coachBuildMovementContext('Front Squat', { kind:'main', blockTitle:'A. Front Squat', format:'5x3', day:'jeudi', week:5 });
  ctx.state.athleteState.movements['Front Squat'] = {
    ranges: { strength: { currentLoad:195, actualLoad:195, currentReps:3, actualReps:3, rpe:8, confidence:0.8, status:'success' } },
    history: [
      { date:'2026-06-18', load:185, reps:4, rpe:8, range:'strength', status:'success', context:fsCtxV2, planned:{load:185,reps:4,targetMin:4,context:fsCtxV2} },
      { date:'2026-06-25', load:190, reps:4, rpe:8, range:'strength', status:'success', context:fsCtxV2, planned:{load:190,reps:4,targetMin:4,context:fsCtxV2} },
      { date:'2026-07-02', load:195, reps:3, rpe:8, range:'strength', status:'success', context:fsCtxV2, planned:{load:195,reps:3,targetMin:3,context:fsCtxV2} }
    ]
  };
  const fsV2Decision = ctx.guardedSuggestedLoadDecision('Front Squat', '200 lb', 3, fsCtxV2);
  assert(fsV2Decision.brainStats && fsV2Decision.brainStats.intent === 'strength', 'Brain V2 attache les stats strength a la decision Front Squat.');
  assert(fsV2Decision.loadNum === 195, 'Brain V2 peut garder 195 lb avant de proposer 200 quand les validations sont insuffisantes.');
  assert(/Option ambitieuse : 200 lb/.test(fsV2Decision.reason), 'Brain V2 garde une option ambitieuse au lieu de bloquer mentalement la progression.');

  resetState();
  ctx.state.day = 'jeudi';
  const htCtxV2 = ctx.coachBuildMovementContext('Hip Thrust', { kind:'accessory', blockTitle:'C. Chaîne postérieure', format:'3x8', day:'jeudi', week:5 });
  ctx.state.athleteState.movements['Hip Thrust'] = {
    ranges: { hypertrophy: { currentLoad:275, actualLoad:275, currentReps:8, actualReps:8, rpe:8, confidence:0.8, status:'success' } },
    history: [
      { date:'2026-06-11', load:225, reps:10, rpe:8, range:'hypertrophy', status:'success', context:htCtxV2, planned:{load:215,reps:10,targetMin:10,context:htCtxV2} },
      { date:'2026-06-25', load:245, reps:8, rpe:8.5, range:'hypertrophy', status:'success', context:htCtxV2, planned:{load:225,reps:8,targetMin:8,context:htCtxV2} },
      { date:'2026-07-02', load:275, reps:8, rpe:8, range:'hypertrophy', status:'success', context:htCtxV2, planned:{load:260,reps:8,targetMin:8,context:htCtxV2} }
    ]
  };
  const htV2Decision = ctx.guardedSuggestedLoadDecision('Hip Thrust', '285 lb', 8, htCtxV2);
  assert(htV2Decision.loadNum >= 275, 'Brain V2 ne bloque pas inutilement Hip Thrust quand le mouvement progresse encore bien.');



  // 15. Brain V2.1 mémoire locale : apprend par mouvement + intention sans toucher aux data/*.json.
  assert(ctx.CoachBrainMemory && typeof ctx.CoachBrainMemory.updateFromSessionResults === 'function', 'Brain V2.1 expose la mémoire locale.');
  ctx.CoachBrainMemory.clear();
  const memoryCtx = ctx.coachBuildMovementContext('Front Squat', { kind:'main', blockTitle:'Force principale', format:'5x3', day:'jeudi', week:5 });
  ctx.CoachBrainMemory.updateFromSessionResults({
    'Front Squat': { load:'195 lb', reps:3, rpe:8, planned:{ load:195, reps:3, targetMin:3, kind:'main', format:'5x3', context:memoryCtx } }
  }, { date:'2026-07-02' });
  ctx.CoachBrainMemory.updateFromSessionResults({
    'Front Squat': { load:'195 lb', reps:5, rpe:8, planned:{ load:195, reps:3, targetMin:3, kind:'main', format:'5x3', context:memoryCtx } }
  }, { date:'2026-07-09' });
  const memProfile = ctx.CoachBrainMemory.getProfile('Front Squat', 'strength');
  assert(memProfile && memProfile.sessions === 2, 'Brain mémoire cumule deux séances Front Squat strength.');
  assert(memProfile.overPredictions >= 1, 'Brain mémoire détecte une prédiction trop prudente quand reps réelles dépassent la cible.');
  const memStats = ctx.coachBrainBuildStats('Front Squat', [
    {date:'2026-07-02', load:195, reps:3, rpe:8, context:memoryCtx, planned:{load:195,reps:3,context:memoryCtx}},
    {date:'2026-07-09', load:195, reps:5, rpe:8, context:memoryCtx, planned:{load:195,reps:3,context:memoryCtx}}
  ], memoryCtx, 3, 200, 195);
  assert(memStats.memory && memStats.memory.sessions === 2, 'Brain stats fusionne le profil mémoire dans le diagnostic.');
  assert(memStats.memory.precision >= 100, 'Brain mémoire expose une précision élevée après deux prédictions testées réussies.');
  assert(ctx.CoachBrainJournal && typeof ctx.CoachBrainJournal.summaryFor === 'function', 'Brain Journal V3.0 est exposé.');
  const journalSummary = ctx.CoachBrainJournal.summaryFor('Front Squat', 'strength');
  assert(journalSummary && journalSummary.sessions >= 2, 'Brain Journal résume les apprentissages Front Squat strength.');
  assert(journalSummary.latestSentence && journalSummary.latestSentence.indexOf('Dernier apprentissage') >= 0, 'Brain Journal produit une phrase d apprentissage exploitable.');

  // 13. Alertes : mouvements sans charge utile ne doivent pas crier donnees faibles.
  resetState();
  const deadBugDiag = ctx.buildChargeDiagnosticForExercise({name:'Dead Bug', load:'', format:'3x10'}, '', {targetReps:10, kind:'accessory', blockTitle:'Core'});
  assert(deadBugDiag.noLoadUseful === true, 'Dead Bug est reconnu comme mouvement sans charge utile.');
  assert(!deadBugDiag.alerts.some(a => a.code === 'data_low'), 'Dead Bug ne declenche pas d alerte donnees faibles.');

  // 14. Echec total (0 rep) : la charge engagee sans aucune rep sortie est le
  // signal d'echec le plus fort. Avant V4.5.27 elle n'etait ni classee ni
  // memorisee (`if(!hasValidLoad||!reps)return;`), et le moteur reproposait la
  // charge exacte qui venait d'echouer.
  resetState();
  ctx.state.day = 'lundi';
  const failCtx = ctx.coachBuildMovementContext('Bench Press', { kind:'strength', blockTitle:'A. Principal', format:'3x8', day:'lundi', week:3 });
  const failPlanned = { name:'Bench Press', load:135, reps:8, targetMin:8, targetMax:8, kind:'strength', format:'3x8', context:failCtx };
  ctx.state.athleteState.movements['Bench Press'] = {
    ranges: { hypertrophy: { currentLoad:135, actualLoad:135, currentReps:8, actualReps:8, rpe:7.5, confidence:0.8, status:'success' } },
    history: [
      { date:'2026-06-01', load:135, reps:8, rpe:7.5, range:'hypertrophy', status:'success', context:failCtx },
      { date:'2026-06-08', load:135, reps:8, rpe:7.5, range:'hypertrophy', status:'success', context:failCtx }
    ]
  };
  const beforeFail = ctx.state.athleteState.movements['Bench Press'].history.length;

  const failCls = ctx.classifyPerformance({ load:'135 lb', reps:0, rpe:10 }, failPlanned);
  assert(failCls.status === 'major_fail', 'Une charge engagee avec 0 rep est classee major_fail.');
  const noRpeCls = ctx.classifyPerformance({ load:'135 lb', reps:0, rpe:0 }, failPlanned);
  assert(noRpeCls.status === 'major_fail', '0 rep reste un echec meme si le RPE n a pas ete saisi.');

  ctx.updateAthleteStateFromResults({
    'Bench Press': { load:'135 lb', reps:0, rpe:10, planned:failPlanned }
  }, '2026-06-15');
  const failMv = ctx.state.athleteState.movements['Bench Press'];
  assert(failMv.history.length === beforeFail + 1, 'L echec total est memorise dans athlete_state.');
  // Plage prise sur les reps PRESCRITES : repRange(0) renverrait "strength".
  assert(!!failMv.ranges.hypertrophy && failMv.ranges.hypertrophy.status === 'recalibrating',
    'L echec total classe le mouvement en recalibrating dans la plage prescrite.');
  assert(failMv.ranges.hypertrophy.currentLoad > 0 && failMv.ranges.hypertrophy.currentLoad < 135,
    'La capacite retombe sous la charge echouee sans jamais valoir 0 (Epley n a aucun signal a 0 rep).');
  assert(failMv.ranges.hypertrophy.estimated1RM > 0,
    'Un echec total n ecrase pas la derniere estimation 1RM par un zero.');

  const afterFail = ctx.guardedSuggestedLoadDecision('Bench Press', '135 lb', 8, failCtx);
  assert(afterFail.loadNum < 135, 'Apres un echec total, le moteur ne repropose pas la charge qui vient d echouer.');
  assert(afterFail.loadNum <= failMv.ranges.hypertrophy.currentLoad,
    'La suggestion respecte le cap pose par l echec : une seance controlee ANTERIEURE ne le neutralise pas.');

  // Contre-epreuve : une reference controlee POSTERIEURE au cap doit, elle,
  // continuer de le neutraliser (comportement d origine preserve).
  ctx.updateAthleteStateFromResults({
    'Bench Press': { load:'135 lb', reps:8, rpe:7.5, planned:failPlanned }
  }, '2026-06-22');
  const recovered = ctx.guardedSuggestedLoadDecision('Bench Press', '135 lb', 8, failCtx);
  assert(recovered.loadNum >= 135, 'Une seance controlee posterieure a l echec redonne la main a la reference reelle.');

  // 15. Memoire Brain : mesurer si Brain se trompe DE MOINS EN MOINS.
  // La precision a vie se fige avec le volume ; seules la fenetre glissante et
  // la courbe mensuelle montrent une amelioration.
  const MEM = ctx.CoachBrainMemory;
  if(MEM && typeof MEM.updateFromResult === 'function'){
    // Migration ascendante : un profil ecrit avant le schema 2 ne perd rien.
    const legacyKey = 'racine::__pending__::brain-memory-v1';
    ctx.localStorage.setItem(legacyKey, JSON.stringify({
      version:'brain-memory-v1', updatedAt:'2026-01-01T00:00:00Z',
      profiles:{ 'bench press::strength': { label:'Bench Press', intent:'strength', sensitivity:'high',
        sessions:40, testedPredictions:30, successfulPredictions:18, lastLearning:'garde-moi' } },
      journal:[{ a:1 }]
    }));
    const migrated = MEM.read();
    const legacy = migrated.profiles['bench press::strength'];
    assert(migrated.schema === 2, 'La memoire Brain est migree au schema 2.');
    assert(legacy && legacy.sessions === 40 && legacy.successfulPredictions === 18,
      'La migration preserve les compteurs a vie deja accumules.');
    assert(legacy.lastLearning === 'garde-moi' && migrated.journal.length === 1,
      'La migration ne perd ni le journal ni les champs inconnus.');
    assert(Array.isArray(legacy.recentOutcomes) && legacy.recentOutcomes.length === 0,
      'Un profil migre demarre sa fenetre vide : on n inventerait pas un passe.');
    assert(MEM.recentPrecision(legacy) === null,
      'Pas de chiffre de precision recente tant que l echantillon est trop court.');

    // Brain s'ameliore : 10 predictions ratees, puis 10 reussies.
    MEM.clear();
    const memPlanned = { name:'Front Squat', load:150, reps:5, targetMin:5, targetMax:5,
      kind:'strength', format:'3x5', context:{ label:'Front Squat', kind:'strength', intents:[], primaryIntent:'' } };
    function feedMemory(ok, month, day){
      MEM.updateFromResult('Front Squat',
        { load:'150', reps: ok ? '5' : '3', rpe:'8.5', planned: memPlanned },
        { date: '2026-' + month + '-' + String(day).padStart(2,'0') });
    }
    for(let i = 1; i <= 10; i++) feedMemory(false, '03', i);
    const worst = MEM.getProfile('Front Squat','strength');
    assert(MEM.recentPrecision(worst) === 0, 'Dix predictions ratees donnent une precision recente de 0.');
    for(let i = 1; i <= 10; i++) feedMemory(true, '05', i);
    const better = MEM.getProfile('Front Squat','strength');
    assert(MEM.recentPrecision(better) === 1,
      'Apres dix reussites, la fenetre glissante voit le progres (100 %).');
    assert(Math.round(better.precision * 100) === 50,
      'La precision a vie, elle, reste diluee par le passe (50 %) — c est pourquoi la fenetre existe.');

    const trend = MEM.precisionTrend();
    assert(trend.length === 2 && trend[0].month === '2026-03' && trend[1].month === '2026-05',
      'La courbe mensuelle porte un point par mois, du plus ancien au plus recent.');
    assert(trend[0].precision === 0 && trend[1].precision === 100,
      'Chaque point mesure SON mois, sans dilution par les mois precedents.');
    MEM.clear();
  }

  // ─── Echelon RPE (V4.5.56) ────────────────────────────────────────────────
  // Avant : un seul palier (RPE <= 7 => un cran). RPE 5, 6 et 7 donnaient la
  // meme suggestion et RPE 7.5 n'en donnait aucune — le RPE ne portait presque
  // aucune information. Table : COACH_MOVEMENT_TUNING.rpeProgression.
  {
    const mainCtx = { label:'Back Squat', intents:[], kind:'main' };
    function seedRpe(label, load, rpe, reps){
      resetState();
      const range = ctx.repRange(reps);
      const rows = [
        { date:'2026-01-01', load:load, reps:reps, rpe:rpe, range:range, status:'upgrade_ready', context:mainCtx },
        { date:'2026-01-02', load:load, reps:reps, rpe:rpe, range:range, status:'upgrade_ready', context:mainCtx }
      ];
      ctx.state.athleteState.movements[label] = {
        ranges: { [range]: { currentLoad:load, actualLoad:load, currentReps:reps, actualReps:reps, rpe:rpe, confidence:0.9, status:'upgrade_ready' } },
        history: rows
      };
    }
    function suggest(label, prog, reps){
      return ctx.guardedSuggestedLoadDecision(label, prog, reps, { kind:'main', blockTitle:'Force principale' });
    }

    seedRpe('Back Squat', 185, 6, 8);
    const easy = suggest('Back Squat', '185 lb', 8).loadNum;
    seedRpe('Back Squat', 185, 7, 8);
    const normal = suggest('Back Squat', '185 lb', 8).loadNum;
    seedRpe('Back Squat', 185, 7.5, 8);
    const limite = suggest('Back Squat', '185 lb', 8).loadNum;
    assert(easy > normal, 'Echelon RPE : une seance a RPE 6 propose plus lourd qu a RPE 7 (' + easy + ' > ' + normal + ').');
    assert(normal > 185, 'Echelon RPE : RPE 7 propose toujours une hausse d un cran.');
    assert(limite > 185 && limite <= normal, 'Echelon RPE : RPE 7.5 progresse encore, sans depasser RPE 7.');

    // Les freins hauts ne bougent pas : contrat de progression inchange.
    seedRpe('Back Squat', 185, 8.5, 8);
    assert(suggest('Back Squat', '195 lb', 8).loadNum <= 185, 'Frein RPE 8.5 : aucune hausse (inchange).');
    seedRpe('Back Squat', 185, 9, 8);
    assert(suggest('Back Squat', '195 lb', 8).loadNum <= 185, 'Verrou RPE >= 9 : aucune hausse automatique (inchange).');

    // Isolation : progression plus fine, jamais de saut elargi.
    seedRpe('Lateral Raise DB', 20, 6, 12);
    const iso = suggest('Lateral Raise DB', '20 lb', 12).loadNum;
    assert(iso > 20 && iso <= 25, 'Isolation : RPE 6 progresse d un cran fin, sans saut elargi (' + iso + ' lb).');

    // Convergence des deux regles de relance : franchir le seuil d ecart
    // (liftFromHistoryThresholds.gap = 20) ne doit plus faire MONTER la
    // suggestion quand la charge du programme BAISSE. C est le defaut corrige
    // en V4.5.56 : coachRuleLiftFromControlledHistory ajoutait +10 la ou
    // coachRuleReferenceReelleValidee repartait de la reference seche.
    seedRpe('Deadlift', 225, 7, 8);
    const sousSeuil = suggest('Deadlift', '205 lb', 8).loadNum;   // ecart 20 => regle de relance
    seedRpe('Deadlift', 225, 7, 8);
    const surSeuil  = suggest('Deadlift', '210 lb', 8).loadNum;   // ecart 15 => reference reelle
    assert(sousSeuil <= surSeuil,
      'Seuil de relance : une charge de programme plus BASSE ne sort pas une suggestion plus HAUTE (' + sousSeuil + ' <= ' + surSeuil + ').');
    resetState();
  }

  // ─── Reactivite : la tendance, pas seulement le dernier RPE (V4.5.57) ─────
  // Un barreau seul ne lit qu'une valeur. Trois athletes a RPE 7 final n'ont
  // pas le meme elan selon d'ou ils viennent — le moteur doit les separer.
  {
    const mainCtx = { label:'Back Squat', intents:[], kind:'main' };
    function seedTrend(label, rows, reps){
      resetState();
      const range = ctx.repRange(reps);
      const last = rows[rows.length - 1];
      ctx.state.athleteState.movements[label] = {
        ranges: { [range]: { currentLoad:last.load, actualLoad:last.load, currentReps:last.reps, actualReps:last.reps, rpe:last.rpe, confidence:0.9, status:'upgrade_ready' } },
        history: rows.map((r, i) => ({ date:'2026-0' + (i+5) + '-01', load:r.load, reps:r.reps, rpe:r.rpe, range:range, status:'upgrade_ready', context:mainCtx }))
      };
    }
    const row = (load, reps, rpe) => ({ load:load, reps:reps, rpe:rpe });
    function decide(prog, reps){
      return ctx.guardedSuggestedLoadDecision('Back Squat', prog, reps, { kind:'main', blockTitle:'Force principale' });
    }

    seedTrend('Back Squat', [row(225,5,8), row(225,5,7.5), row(225,5,7)], 5);
    const versLeFacile = decide('225 lb', 5).loadNum;
    seedTrend('Back Squat', [row(225,5,7), row(225,5,7), row(225,5,7)], 5);
    const plat = decide('225 lb', 5).loadNum;
    seedTrend('Back Squat', [row(225,5,6), row(225,5,6.5), row(225,5,7)], 5);
    const versLeDur = decide('225 lb', 5).loadNum;
    assert(versLeFacile > plat && plat > versLeDur,
      'Tendance RPE : a RPE 7 final identique, le moteur separe les trois trajectoires (' + versLeFacile + ' > ' + plat + ' > ' + versLeDur + ').');
    assert(versLeDur === 225, 'Tendance qui durcit : maintien a la derniere charge, pas de hausse.');

    // RPE 8 n'est plus une zone morte silencieuse : maintien annonce par
    // defaut, promu a un cran si le meme poids devient moins couteux.
    seedTrend('Back Squat', [row(225,5,8), row(225,5,8), row(225,5,8)], 5);
    const huitStable = decide('225 lb', 5);
    assert(huitStable.loadNum === 225 && /Maintien/.test(huitStable.reason),
      'RPE 8 stable : maintien explicite, la zone morte est nommee.');
    seedTrend('Back Squat', [row(225,5,9), row(225,5,8.5), row(225,5,8)], 5);
    assert(decide('225 lb', 5).loadNum > 225, 'RPE 8 en nette baisse : le moteur repart d un cran.');

    // Reps depassees : signal deja enregistre, desormais lu.
    seedTrend('Back Squat', [row(225,8,7), row(225,8,7), row(225,8,7)], 5);
    const overshoot = decide('225 lb', 5).loadNum;
    seedTrend('Back Squat', [row(225,5,7), row(225,5,7), row(225,5,7)], 5);
    assert(overshoot > decide('225 lb', 5).loadNum,
      'Reps depassees : 8 reps pour 5 demandees pese plus lourd que 5 reps au meme RPE.');

    // La reactivite n'elargit JAMAIS le saut maximal prudent.
    seedTrend('Back Squat', [row(225,8,7.5), row(225,8,7), row(225,8,6.5)], 5);
    const cumul = decide('225 lb', 5).loadNum;
    const plafond = 225 + ctx.coachMaxJumpForExercise('Back Squat', 225) * 1.25;
    assert(cumul <= plafond,
      'Reactivite cumulee : la hausse reste sous le saut maximal du barreau RPE (' + cumul + ' <= ' + plafond + ').');

    // Les freins hauts restent hors de portee des modificateurs.
    seedTrend('Back Squat', [row(225,5,9.5), row(225,5,9), row(225,5,8.5)], 5);
    assert(decide('245 lb', 5).loadNum <= 225, 'Frein 8.5 : aucune tendance ne le contourne.');
    seedTrend('Back Squat', [row(225,5,9.5), row(225,5,9.5), row(225,5,9)], 5);
    assert(decide('245 lb', 5).loadNum <= 225, 'Verrou RPE >= 9 : aucune tendance ne le contourne.');
    resetState();
  }

  // ─── Surplus de reps : la capacite revelee, pas un forfait (V4.5.67) ──────
  // Le moteur projetait deja Epley vers le BAS quand les reps manquaient. La
  // projection vers le HAUT n'existait pas : sur une cible courte, 2 reps et
  // 5 reps a la meme charge et au meme RPE se ressemblaient trop.
  {
    const mainCtx = { label:'Back Squat', intents:['strength'], kind:'main' };
    function seedSurplus(rows, target){
      resetState();
      const range = ctx.repRange(target);
      const last = rows[rows.length - 1];
      ctx.state.athleteState.movements['Back Squat'] = {
        ranges: { [range]: { currentLoad:last.load, actualLoad:last.load, currentReps:target, actualReps:last.reps, rpe:last.rpe, confidence:0.9, status:'upgrade_ready' } },
        history: rows.map((r, i) => ({ date:'2026-0' + (i+3) + '-01', load:r.load, reps:r.reps, rpe:r.rpe, range:range, status:'easy_success', context:mainCtx }))
      };
    }
    const sRow = (load, reps, rpe) => ({ load:load, reps:reps, rpe:rpe });
    function decideMain(prog, target){
      return ctx.guardedSuggestedLoadDecision('Back Squat', prog, target, { kind:'main', blockTitle:'Force principale' });
    }

    seedSurplus([sRow(135,2,7), sRow(135,2,7)], 2);
    const cible = decideMain('135 lb', 2).loadNum;
    seedSurplus([sRow(135,5,7), sRow(135,5,7)], 2);
    const surplus = decideMain('135 lb', 2).loadNum;
    assert(surplus > cible,
      'Surplus de reps : 135 x 5 pour 2 demandees pese plus que 135 x 2 au meme RPE (' + surplus + ' > ' + cible + ').');

    // Le saut maximal prudent garde le dernier mot : le surplus rend le moteur
    // plus prompt a utiliser la marge, il ne l'elargit jamais.
    const plafondSurplus = 135 + ctx.coachMaxJumpForExercise('Back Squat', 135);
    assert(surplus <= plafondSurplus,
      'Surplus de reps : la hausse reste sous le saut maximal prudent (' + surplus + ' <= ' + plafondSurplus + ').');

    // Le RPE reste le signal majeur : un surplus a RPE 9.5 ne vaut rien.
    seedSurplus([sRow(135,5,9.5), sRow(135,5,9.5)], 2);
    const surplusDur = decideMain('135 lb', 2).loadNum;
    assert(surplusDur < surplus,
      'Surplus de reps a RPE 9.5 : aucun credit, ce n est pas le meme signal (' + surplusDur + ' < ' + surplus + ').');

    // Un contexte technique/WOD ne merite pas de charge parce qu il a fait des
    // reps en plus : la porte du surplus reste fermee.
    const techCtx = ctx.coachBuildMovementContext('Back Squat', { note:'technique, qualite du geste', kind:'accessory' });
    seedSurplus([sRow(135,5,7), sRow(135,5,7)], 2);
    ctx.state.athleteState.movements['Back Squat'].history.forEach(r => { r.context = techCtx; });
    const techSurplus = ctx.guardedSuggestedLoadDecision('Back Squat', '135 lb', 2, techCtx).loadNum;
    assert(techSurplus <= 135,
      'Contexte technique : un surplus de reps ne declenche aucune hausse (' + techSurplus + ' <= 135).');
    resetState();
  }

  // ─── Un deload se DECLARE, il ne se deduit pas d'un numero (V4.5.68) ──────
  // `if(weekNum===6)return true;` datait du temps ou l'app portait un seul
  // cycle de 6 semaines. Sur un catalogue de 42 programmes il declenchait un
  // deload fantome en S6 — « S6 Rotation B max » de phase2_fable5, semaine de
  // 3RM, se retrouvait cappee a 85 % de la derniere reference.
  {
    const infoSansDeload = { 6:{label:'S6 Rotation B max', goal:'3RM propres. RPE 9 max.'},
                             7:{label:'S7 Deload', goal:'Volume divise par deux.'} };
    const buildWeekInfoOrigine = ctx.buildWeekInfo;
    ctx.buildWeekInfo = function(){ return infoSansDeload; };

    assert(ctx.coachIsDeloadWeekOrContext({ week:6, kind:'main' }) === false,
      'Semaine 6 non declaree deload : le moteur ne l invente pas.');
    assert(ctx.coachIsDeloadWeekOrContext({ week:7, kind:'main' }) === true,
      'Semaine 7 declaree « Deload » dans le libelle : detectee.');

    // La S6 d un programme qui declare VRAIMENT son deload en S6 reste couverte.
    ctx.buildWeekInfo = function(){ return { 6:{label:'S6 Deload', goal:'Recuperation.'} }; };
    assert(ctx.coachIsDeloadWeekOrContext({ week:6, kind:'main' }) === true,
      'Semaine 6 declaree « Deload » : toujours detectee, sans hardcode.');

    // Un contexte de recuperation reste un deload quel que soit le numero.
    assert(ctx.coachIsDeloadWeekOrContext({ week:2, isRecovery:true }) === true,
      'Contexte recuperation : deload detecte hors de toute semaine particuliere.');

    ctx.buildWeekInfo = buildWeekInfoOrigine;
    resetState();
  }

  // ─── Charge de programme ecrite en pourcentage (V4.5.68) ─────────────────
  // parseLoad('75-82%') vaut 75 : sans traitement, un Push Press prescrit a
  // 75-82 % du 1RM sortait a 75 lb, puis encore multiplie par le ratio profil.
  {
    resetState();
    const pctCtx = ctx.coachBuildMovementContext('Bench Press', { kind:'main', blockTitle:'A. Bench Press', load:'75-82%' });
    assert(!!pctCtx.percentTarget, 'Une charge « 75-82% » est reconnue comme une cible en pourcentage.');
    assert(pctCtx.percentTarget.aim > 0.75 && pctCtx.percentTarget.aim < 0.82,
      'La cible visee est le milieu de la plage declaree (' + pctCtx.percentTarget.aim + ').');

    const lbCtx = ctx.coachBuildMovementContext('Bench Press', { kind:'main', load:'205 lb' });
    assert(!lbCtx.percentTarget, 'Une charge en livres n est jamais lue comme un pourcentage.');
    const mixteCtx = ctx.coachBuildMovementContext('Bench Press', { kind:'main', load:'60 % (135 lb)' });
    assert(!mixteCtx.percentTarget, 'Une charge portant une unite explicite reste une charge en livres.');

    // Avec une capacite reelle connue, le pourcentage se resout dessus.
    ctx.state.athleteState.movements['Bench Press'] = {
      ranges: { strength:{ currentLoad:205, currentReps:3, actualLoad:205, actualReps:3, rpe:8, confidence:0.9, status:'upgrade_ready', estimated1RM:225, lastUpdated:'2026-01-01' } },
      history: []
    };
    const resolu = ctx.guardedSuggestedLoadDecision('Bench Press', '75-82%', 3, pctCtx);
    assert(resolu.loadNum > 150,
      'Pourcentage resolu sur la capacite reelle, pas lu comme 75 lb (' + resolu.loadNum + ' lb pour un 1RM de 225).');

    // Sans capacite connue, le moteur n invente pas un nombre de livres.
    resetState();
    const inconnu = ctx.guardedSuggestedLoadDecision('Bench Press', '75-82%', 3, pctCtx);
    assert(inconnu.loadNum !== 75,
      'Sans capacite connue, « 75-82% » ne devient jamais 75 lb (' + inconnu.loadNum + ').');
    resetState();
  }

  // 12. « vitesse » en CONSIGNE D'ARRET n'est pas une intention technique.
  //
  // Cas reel signale par l'athlete : « Pause Back Squat — 3RM avec pause.
  // Aucune bataille : si la vitesse meurt, c'est fini. » (S3 de phase2_fable5).
  // Le mot « vitesse » declarait un contexte technique, ce qui (a) coupait
  // l'auto-progression sur un mouvement principal et (b) — bien plus grave —
  // ecartait TOUT l'historique des semaines voisines, dont le contexte n'etait
  // pas limite. Deux semaines a 170 lb x 3 @ RPE 7 ne pesaient rien et le
  // moteur reproposait indefiniment la charge ecrite dans le programme.
  {
    resetState();
    const cueNote = "3RM avec pause. Aucune bataille : si la vitesse meurt, c'est fini. Ce chiffre devient ta reference de variation.";
    const cueCtx = ctx.coachBuildMovementContext('Pause Back Squat', {kind:'main', blockTitle:'A. Pause Back Squat', format:'montee vers 3RM', note:cueNote, load:'190-205 lb'});
    assert(notIncludes(cueCtx.intents, 'technique'),
      'Une consigne d\'arret (« si la vitesse meurt ») ne declare pas une intention technique.');
    assert(!ctx.coachIsLimitedProgressionContext(cueCtx),
      'Un 3RM dont la note parle de vitesse de barre reste un contexte de progression normal.');

    // Le juge de vitesse de barre, meme formulation, meme verdict.
    const judgeCtx = ctx.coachBuildMovementContext('Bench Press', {kind:'main', format:'5x3', note:'Vitesse de barre comme juge. Arret des que la barre ralentit.', load:'205-215 lb'});
    assert(!ctx.coachIsLimitedProgressionContext(judgeCtx),
      '« Vitesse de barre comme juge » reste un contexte de progression normal.');

    // A l'oppose : un VRAI bloc vitesse declare un pourcentage cible. Il reste
    // un contexte limite — il ne progresse jamais comme un mouvement principal.
    const speedCtx = ctx.coachBuildMovementContext('Back Squat', {kind:'main', format:'6x2', note:'Squat vitesse ~60 %, intention de vitesse, pas de charge.', load:'~60 %'});
    assert(includes(speedCtx.intents, 'speed'), 'Un bloc vitesse avec pourcentage cible reste reconnu comme bloc vitesse.');
    assert(ctx.coachIsLimitedProgressionContext(speedCtx),
      'Un vrai bloc vitesse reste un contexte a progression limitee.');

    // Un bloc vitesse peut se declarer en clair, sans le mot « vitesse » : la
    // cible en pourcentage fait foi, et il reste un contexte limite.
    const speedDeclare = ctx.coachBuildMovementContext('Back Squat', {kind:'main', format:'6x2', note:'Remontee explosive, barre rapide.', load:'135 lb', pctOf1RM:0.60});
    assert(includes(speedDeclare.intents, 'speed'), 'Une cible posee en clair (pctOf1RM) declare un bloc vitesse.');
    assert(includes(speedDeclare.intents, 'technique'),
      'Un bloc vitesse declare en clair reste marque technique, meme sans le mot « vitesse ».');
    assert(ctx.coachIsLimitedProgressionContext(speedDeclare),
      'Et il reste un contexte a progression limitee.');

    // Un mot technique franc n'est pas affecte par la correction.
    const techCtx = ctx.coachBuildMovementContext('Power Clean', {kind:'technique', format:'5x2', note:'Travail technique, barre legere.', load:'95 lb'});
    assert(ctx.coachIsLimitedProgressionContext(techCtx), 'Un vrai contexte technique reste limite.');

    // Le vrai degat : l'historique des semaines normales survit au filtre.
    const normalCtx = ctx.coachBuildMovementContext('Pause Back Squat', {kind:'main', format:'5x3', note:'Pause 2 sec au fond, remontee explosive.', load:'165-175 lb'});
    const hist = [
      {date:'2026-08-10', load:170, reps:3, rpe:7, status:'success', context:{label:normalCtx.label, equipment:normalCtx.equipment, intents:normalCtx.intents, primaryIntent:normalCtx.primaryIntent}},
      {date:'2026-08-17', load:170, reps:3, rpe:7, status:'success', context:{label:normalCtx.label, equipment:normalCtx.equipment, intents:normalCtx.intents, primaryIntent:normalCtx.primaryIntent}}
    ];
    const gardees = ctx.coachFilterHistoryForProgression(hist, cueCtx);
    assert(gardees.length === 2,
      'Les seances des semaines normales comptent dans une semaine dont la note parle de vitesse de barre (' + gardees.length + '/2).');

    ctx.state.athleteState.movements['Pause Back Squat'] = {history:hist, ranges:{}};
    const d3 = ctx.guardedSuggestedLoadDecision('Pause Back Squat', '190-205 lb', 3, cueCtx);
    assert(d3.loadNum >= 170,
      'Apres deux seances a 170 lb x 3 @ RPE 7, le moteur ne repropose pas moins (' + d3.loadNum + ' lb).');
    resetState();
  }

  // 13. Un cap faible doit pouvoir etre depasse par une seance recente propre,
  //     y compris sur un mouvement a petites charges.
  //
  // Cas reel signale par l'athlete (Weighted Pull-up) :
  //   23/06  20 lb x 6 @ 8,5   30/06  25 lb x 5 @ 9,5   07/07  25 lb x 6 @ 9
  //   11/08  25 lb x 3 @ 8     18/08  30 lb x 3 @ 8  (propre, la plus recente)
  // et le moteur reproposait 25 lb. Le cap de surveillance ne pouvait pas etre
  // ignore : la porte de sortie exigeait +15 lb ABSOLUS, soit 40 lb — sur un
  // mouvement dont toute la plage de travail tient dans 20-40 lb. Le seuil est
  // desormais le plus petit de l'absolu et du relatif (table athleteStateCap).
  {
    resetState();
    const wpuCtx = ctx.coachBuildMovementContext('Weighted Pull-up', {kind:'main', blockTitle:'A. Weighted Pull-up', format:'4x3', note:'Tirage strict et lourd.', load:'30-40 lb'});
    const meta = {label:wpuCtx.label, equipment:wpuCtx.equipment, intents:wpuCtx.intents, primaryIntent:wpuCtx.primaryIntent};
    const wpuHist = [
      {date:'2026-06-23', load:20, reps:6, rpe:8.5, status:'success', context:meta},
      {date:'2026-06-30', load:25, reps:5, rpe:9.5, status:'hard',    context:meta},
      {date:'2026-07-07', load:25, reps:6, rpe:9,   status:'hard',    context:meta},
      {date:'2026-08-11', load:25, reps:3, rpe:8,   status:'success', context:meta},
      {date:'2026-08-18', load:30, reps:3, rpe:8,   status:'success', context:meta}
    ];

    // Cap faible ANTERIEUR a la seance propre : il doit s'effacer devant elle.
    ctx.state.athleteState.movements['Weighted Pull-up'] = {history:wpuHist,
      ranges:{strength:{currentLoad:25, currentReps:3, confidence:0.48, status:'ok', lastUpdated:'2026-08-11'}}};
    const apresPreuve = ctx.guardedSuggestedLoadDecision('Weighted Pull-up', '30-40 lb', 3, wpuCtx);
    assert(apresPreuve.loadNum >= 30,
      'Une seance recente et propre a 30 lb depasse un cap a 25 lb sur un mouvement a petites charges ('
      + apresPreuve.loadNum + ' lb).');

    // Cap POSTERIEUR a la seance : la protection reste, c'est son role.
    ctx.state.athleteState.movements['Weighted Pull-up'] = {history:wpuHist,
      ranges:{strength:{currentLoad:25, currentReps:3, confidence:0.48, status:'watch', lastUpdated:'2026-08-19'}}};
    const capRecent = ctx.guardedSuggestedLoadDecision('Weighted Pull-up', '30-40 lb', 3, wpuCtx);
    assert(capRecent.loadNum <= 25,
      'Un cap plus RECENT que la derniere seance protege toujours (' + capRecent.loadNum + ' lb).');

    // Sur une barre lourde, le seuil absolu continue de gouverner : une seance
    // a peine plus lourde ne balaie pas un cap de surveillance.
    const bsCtx = ctx.coachBuildMovementContext('Back Squat', {kind:'main', format:'5x3', load:'250 lb'});
    const bsMeta = {label:bsCtx.label, equipment:bsCtx.equipment, intents:bsCtx.intents, primaryIntent:bsCtx.primaryIntent};
    ctx.state.athleteState.movements['Back Squat'] = {history:[
      {date:'2026-08-18', load:210, reps:3, rpe:8, status:'success', context:bsMeta}
    ], ranges:{strength:{currentLoad:200, currentReps:3, confidence:0.48, status:'watch', lastUpdated:'2026-08-11'}}};
    const barre = ctx.guardedSuggestedLoadDecision('Back Squat', '250 lb', 3, bsCtx);
    assert(barre.loadNum <= 200,
      'Sur une barre lourde, +10 lb ne suffisent pas a balayer un cap de surveillance (' + barre.loadNum + ' lb).');
    resetState();
  }

  // 14. Une ligne mal etiquetee par une ANCIENNE version est relue, pas perdue.
  //
  // Une ligne d'historique stocke les intentions deja resolues. Quand le
  // detecteur est corrige, les lignes deja ecrites gardent leur ancienne
  // etiquette — et le filtre de progression, qui ne melange pas contextes
  // limites et normaux, les ecarte pour toujours. Trace d'un cycle reel :
  // 18 lignes perdues sur ce seul motif, dont la seance la plus recente.
  // La ligne stocke aussi son texte brut : on relit donc les intentions avec
  // le detecteur d'aujourd'hui, sans jamais reecrire la ligne.
  {
    resetState();
    const noteCue = "3RM avec pause. Aucune bataille : si la vitesse meurt, c'est fini.";
    const noteTech = 'Travail technique, barre legere.';
    const vieuxContexte = (note) => ({
      rawName:'Pause Back Squat', label:'Pause Back Squat', equipment:'barbell',
      intents:['technique'], primaryIntent:'technique', isTechnical:true,
      kind:'main', blockTitle:'A. Pause Back Squat', note:note, text:'', format:'montee vers 3RM'
    });
    const vieilleLigne = (note, statut) => ({date:'2026-08-24', load:170, reps:3, rpe:7, status:statut, context:vieuxContexte(note)});

    const relue = ctx.coachHistoryContext(vieilleLigne(noteCue, 'context_logged'));
    assert(Array.isArray(relue.intents) && relue.intents.indexOf('technique') === -1,
      'Une ligne etiquetee « technique » par une consigne d\'arret est relue sans cette intention.');
    assert(Array.isArray(relue.rederivedFrom) && relue.rederivedFrom.indexOf('technique') >= 0,
      'La relecture garde trace de ce que la ligne disait avant.');
    assert(ctx.coachHistoryContextIsLimited(vieilleLigne(noteCue, 'context_logged')) === false,
      'Le marqueur `context_logged` ne survit pas a une relecture qui le contredit.');

    // Une note vraiment technique n'est pas « reparee » : elle est confirmee.
    assert(ctx.coachHistoryContextIsLimited(vieilleLigne(noteTech, 'context_logged')) === true,
      'Une ligne dont la note dit vraiment « technique » reste un contexte limite.');

    // Sans texte brut, rien a relire : le marqueur garde le dernier mot.
    const sansTexte = {date:'2026-05-01', load:150, reps:3, rpe:8, status:'context_logged',
      context:{label:'Pause Back Squat', equipment:'barbell', intents:['technique'], primaryIntent:'technique'}};
    assert(ctx.coachHistoryContextIsLimited(sansTexte) === true,
      'Une ligne non relisible garde son marqueur : on n\'invente pas ce qu\'on ne peut pas relire.');
    // Et ses intentions stockees ne sont pas effacees non plus : sans texte a
    // relire, les remplacer par le resultat d'une lecture a vide reviendrait a
    // declarer normale toute ligne ancienne, sur la seule foi de son nom.
    assert(ctx.coachHistoryContext(sansTexte).intents.indexOf('technique') >= 0,
      'Une ligne non relisible garde aussi ses intentions d\'origine.');

    // La donnee stockee n'est JAMAIS reecrite : la relecture est une lecture.
    const ligneIntacte = vieilleLigne(noteCue, 'context_logged');
    const avant = JSON.stringify(ligneIntacte);
    ctx.coachHistoryContext(ligneIntacte);
    ctx.coachHistoryContextIsLimited(ligneIntacte);
    assert(JSON.stringify(ligneIntacte) === avant,
      'La relecture ne modifie pas la ligne stockee (rien ne part dans le localStorage).');

    // Bout en bout : les trois seances reelles de l'athlete comptent a nouveau.
    const ctxS3 = ctx.coachBuildMovementContext('Pause Back Squat', {kind:'main', blockTitle:'A. Pause Back Squat', format:'montee vers 3RM', note:noteCue, load:'190-205 lb'});
    const normal = (note) => Object.assign(vieuxContexte(note), {intents:[], primaryIntent:'', isTechnical:false});
    const histReel = [
      {date:'2026-08-10', load:160, reps:3, rpe:7, status:'upgrade_ready', context:normal('Pause 2 sec au fond.')},
      {date:'2026-08-17', load:170, reps:3, rpe:8, status:'success',       context:normal('Pause 2 sec au fond.')},
      vieilleLigne(noteCue, 'context_logged')
    ];
    const gardees = ctx.coachFilterHistoryForProgression(histReel, ctxS3);
    assert(gardees.length === 3,
      'Les trois seances reelles comptent a nouveau dans la progression (' + gardees.length + '/3).');
    resetState();
  }

  // ── « EMOM » dans un format ne declare pas un WOD ────────────────────────
  // Le texte lu par coachExtractMovementIntent inclut le FORMAT de l'exercice.
  // Un bloc principal ecrit « EMOM 8 : 2 Power Clean » se declarait donc
  // contexte WOD, et coachRuleContextLimited coupait toute auto-progression :
  // Power Clean fige a 125 lb sur les 8 semaines de phase2_fable5, sans aucun
  // rapport avec les reps ou le RPE. Le `kind` du bloc tranche, parce qu'il
  // est la seule declaration explicite de ce qu'est le bloc.
  {
    const emomMain = ctx.coachExtractMovementIntent(
      ['Power Clean', 'A. Power Clean vitesse', 'EMOM 8 : 2 Power Clean'], null, 'main');
    assert(notIncludes(emomMain, 'wod'),
      'EMOM ecrit dans le format d\'un bloc kind:"main" ne declare pas un contexte WOD.');
    assert(includes(emomMain, 'strength'),
      'Le bloc principal garde son intention de force.');

    // Un vrai metcon, lui, reste un WOD — c'est le kind qui le dit.
    assert(includes(ctx.coachExtractMovementIntent(['Thruster', 'C. Metcon', 'AMRAP 10'], null, 'wod'), 'wod'),
      'Un bloc kind:"wod" reste un contexte WOD.');
    // Et sans kind declare, le mot garde sa valeur : rien n'est perdu pour les
    // appels qui ne portent pas le bloc.
    assert(includes(ctx.coachExtractMovementIntent(['Thruster', 'AMRAP 10'], null, ''), 'wod'),
      'Sans kind declare, « AMRAP » continue de declarer un contexte WOD.');
    // Les autres blocs charges du contrat de forme sont couverts de la meme
    // maniere : un accessoire chronometre n'est pas un metcon.
    assert(notIncludes(ctx.coachExtractMovementIntent(['Face Pull', 'C. Posture', 'EMOM 6 : 12 Face Pull'], null, 'accessory'), 'wod'),
      'EMOM dans un bloc kind:"accessory" ne declare pas un contexte WOD.');
  }

} catch (err) {
  fail('Erreur pendant les tests moteur : ' + (err && err.stack ? err.stack : err));
}

if(errors.length){
  console.error('\nECHEC charge_engine_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}

console.log('OK charge_engine_checks.js');
notes.forEach(n => console.log(' - ' + n));


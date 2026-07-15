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

  // 13d. Agressivite de progression : bornee entre 0.4 et 1.8.
  ctx.state.profile = { aggressiveness: 5 };
  assert(ctx.coachAggressivenessFactor() === 1.8, 'L agressivite de progression est plafonnee a 1.8.');
  ctx.state.profile = { aggressiveness: 0.01 };
  assert(ctx.coachAggressivenessFactor() === 0.4, 'L agressivite de progression est plancher a 0.4.');
  ctx.state.profile = null;



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


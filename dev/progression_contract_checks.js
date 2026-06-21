#!/usr/bin/env node
/*
  Racine — contrat de progression des charges.
  Étape 6 : vérifier que la progression est protégée comme un pilier égal au choix de mouvement.

  Usage :
    node dev/progression_contract_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];

function rel(p){ return path.join(root, p); }
function exists(p){ return fs.existsSync(rel(p)); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }
function fail(msg){ errors.push(msg); }
function ok(msg){ notes.push(msg); }
function assert(cond, msg){ if(!cond) fail(msg); else ok(msg); }
function includes(arr, item){ return Array.isArray(arr) && arr.indexOf(item) !== -1; }
function notIncludes(arr, item){ return !Array.isArray(arr) || arr.indexOf(item) === -1; }

// 1. Contrat documentaire présent.
assert(exists('docs/CHARGE_PROGRESSION_CONTRACT.md'), 'Document de contrat de progression présent.');
const contract = exists('docs/CHARGE_PROGRESSION_CONTRACT.md') ? read('docs/CHARGE_PROGRESSION_CONTRACT.md') : '';
assert(contract.includes('La progression des charges est un pilier égal au choix des mouvements'), 'Le contrat doit affirmer que la progression est aussi importante que le choix de mouvement.');
assert(contract.includes('DB ≠ câble'), 'Le contrat doit verrouiller DB ≠ câble.');
assert(contract.includes('Power Clean WOD') && contract.includes('Power Clean principal'), 'Le contrat doit documenter la séparation WOD/principal.');

// 2. Frontières de modules.
const configSrc = read('programs/config.js');
assert(!configSrc.includes('coachBeurtV5018RuntimePatch'), 'programs/config.js ne doit plus contenir le vieux patch runtime.');
assert(!/function\s+smartSuggestedLoad/.test(configSrc), 'programs/config.js ne doit pas définir smartSuggestedLoad.');
assert(!/showLoadInfoModal|loadInfoButtonHtml|athleteSuggestedLoad/.test(configSrc), 'programs/config.js ne doit pas contenir UI/moteur de charges.');

const mouvementSrc = read('scripts/charge/mouvements.js');
const gestionSrc = read('scripts/charge/historique.js');
const moteurSrc = read('scripts/charge/suggestion.js');
assert(mouvementSrc.includes('function coachBuildMovementContext'), 'Le contexte mouvement doit être centralisé dans scripts/charge/mouvements.js.');
assert(mouvementSrc.includes('function coachMovementEquipmentFamily'), 'La famille équipement doit rester disponible pour protéger les alias.');
assert(gestionSrc.includes('function coachFilterHistoryForProgression'), 'Le filtrage historique par contexte doit rester dans charge_gestion.js.');
assert(moteurSrc.includes('coachFilterHistoryForProgression'), 'Le moteur doit utiliser le filtrage historique par contexte.');
assert(moteurSrc.includes('coachIsLimitedProgressionContext'), 'Le moteur doit tenir compte des contextes limités.');
assert(moteurSrc.includes('context_logged'), 'Les résultats WOD/technique doivent pouvoir être loggés sans écraser la capacité principale.');

// 3. Les noms simples restent protégés dans les programmes.
function walkPrograms(){
  const dir = rel('programs');
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.js') && f !== 'index.js')
    .map(f => 'programs/' + f);
}
function movementNamesFromProgramSource(src){
  const out = [];
  const patterns = [
    /\b\w*Ex\(\s*["']([^"']+)["']/g,
    /\bex\(\s*["']([^"']+)["']/g,
    /\bname\s*:\s*["']([^"']+)["']/g
  ];
  patterns.forEach(rx => {
    let m;
    while((m = rx.exec(src))) out.push(m[1]);
  });
  return Array.from(new Set(out));
}
const forbiddenInMovementName = /(^|\s)[A-D][0-9]\.\s|\b(technique|progression|tempo|pump|rappel|l[eé]ger|mod[eé]r[eé]|contr[oô]l[eé]|facile)\b|\s\/\s|\sou\s/i;
walkPrograms().forEach(file => {
  const names = movementNamesFromProgramSource(read(file));
  names.forEach(name => assert(!forbiddenInMovementName.test(name), 'Nom mouvement propre : ' + file + ' → ' + name));
});

// 4. Vérification dynamique du contrat de progression.
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
  localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {
    'Power Clean':'135 lb',
    'Lateral Raise DB':'20 lb',
    'Lateral Raise câble':'30 lb',
    'Rear Delt Fly DB':'20 lb',
    'Rear Delt Fly câble':'30 lb',
    'Strict Press':'115 lb'
  },
  CHARGE_ORDER: [],
  movements: {
    powerClean:{name:'Power Clean', profile:'powerClean'},
    strictPress:{name:'Strict Press', profile:'strictPress'},
    lateralRaise:{name:'Lateral Raise DB', profile:null},
    rearDeltFly:{name:'Rear Delt Fly DB', profile:null}
  },
  state: {
    week: 3,
    day: 'vendredi',
    rpeHistory: {},
    athleteState: { movements: {} }
  },
  save: function(){},
  focus: function(){ return {targetReps:{0:8,1:8,2:8,3:8,4:8,5:8}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; }
};
ctx.window = ctx;
ctx.globalThis = ctx;

['scripts/app_helpers.js','scripts/charge/equipement.js','scripts/charge/utilitaires.js','scripts/charge/mouvements.js','scripts/charge/rpe.js','scripts/charge/historique.js','scripts/charge/suggestion.js'].forEach(file => {
  try { vm.runInNewContext(read(file), ctx, { filename: file }); }
  catch(err){ fail('Chargement impossible de ' + file + ' : ' + err.message); }
});

try {
  const lateralDb = ctx.coachBuildMovementContext('Lateral Raise DB', {kind:'accessory'});
  const lateralCable = ctx.coachBuildMovementContext('Lateral Raise câble', {kind:'accessory'});
  const pcMain = ctx.coachBuildMovementContext('Power Clean', {kind:'main', blockTitle:'Force principale'});
  const pcWod = ctx.coachBuildMovementContext('Power Clean', {kind:'wod', format:'AMRAP 8', text:'5 Power Clean + 8 Wall Balls + 10 cal Row'});
  const pcTech = ctx.coachBuildMovementContext('Power Clean', {kind:'accessory', note:'technique vitesse propre'});

  assert(lateralDb.equipment === 'db', 'Contexte Lateral Raise DB = DB.');
  assert(lateralCable.equipment === 'cable', 'Contexte Lateral Raise câble = câble.');
  assert(ctx.coachEquipmentCompatibleForAlias('Lateral Raise DB', 'Lateral Raise haltères'), 'Alias historique haltères compatible avec Lateral Raise DB.');
  assert(!ctx.coachEquipmentCompatibleForAlias('Lateral Raise DB', 'Lateral Raise câble bas'), 'Alias câble incompatible avec Lateral Raise DB.');
  assert(ctx.coachIsLimitedProgressionContext(pcWod), 'Power Clean en WOD = contexte limité.');
  assert(ctx.coachIsLimitedProgressionContext(pcTech), 'Power Clean technique = contexte limité.');
  assert(!ctx.coachIsLimitedProgressionContext(pcMain), 'Power Clean principal = progression principale permise.');

  const mixedHistory = [
    {date:'2026-01-01', load:135, reps:5, rpe:7, context:pcWod},
    {date:'2026-01-08', load:185, reps:5, rpe:8, context:pcMain},
    {date:'2026-01-15', load:115, reps:5, rpe:6, context:pcTech}
  ];
  const mainRows = ctx.coachFilterHistoryForProgression(mixedHistory, pcMain);
  const wodRows = ctx.coachFilterHistoryForProgression(mixedHistory, pcWod);
  assert(mainRows.length === 1 && mainRows[0].load === 185, 'Historique principal ne garde que la référence principale contextualisée.');
  assert(wodRows.length === 2 && wodRows.some(r => r.load === 135) && wodRows.some(r => r.load === 115), 'Historique limité garde WOD/technique, pas principal.');

  ctx.state.athleteState.movements['Power Clean'] = {
    ranges: { strength: { currentLoad:185, actualLoad:185, currentReps:5, actualReps:5, rpe:7, confidence:0.9, status:'upgrade_ready' } },
    history: mixedHistory
  };
  const wodDecision = ctx.guardedSuggestedLoadDecision('Power Clean', '135 lb', 5, pcWod);
  const mainDecision = ctx.guardedSuggestedLoadDecision('Power Clean', '135 lb', 5, pcMain);
  assert(wodDecision.loadNum <= 135, 'Power Clean WOD ne monte pas automatiquement vers la référence principale.');
  assert(mainDecision.loadText !== '135 lb', 'Power Clean principal peut utiliser la référence principale contrôlée.');
} catch(err){
  fail('Erreur dynamique contrat progression : ' + (err && err.stack ? err.stack : err));
}

if(errors.length){
  console.error('\nÉCHEC progression_contract_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}

console.log('OK progression_contract_checks.js');
notes.forEach(n => console.log(' - ' + n));

#!/usr/bin/env node
/*
  Racine — Simulation utilisateurs virtuels
  Lecture seule. Aucune écriture dans data/ ou localStorage.
  Usage : node dev/simulate_users.js
*/
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

// ── Bootstrap identique à charge_engine_checks.js ──────────────────────────
const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN,
  setTimeout: function(fn){ if(typeof fn==='function') fn(); },
  clearTimeout: function(){},
  document: { getElementById: function(){ return null; } },
  navigator: {},
  localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {
    'Power Clean':'135 lb','Strict Press':'95 lb','Front Squat':'135 lb',
    'Back Squat':'155 lb','Bench Press':'135 lb','Barbell Row':'115 lb',
    'DB Shoulder Press':'35 lb','Lateral Raise DB':'20 lb',
    'Overhead Rope Extension':'50 lb','Face Pull':'60 lb'
  },
  CHARGE_ORDER: [],
  movements: {},
  state: { week:3, day:'lundi', rpeHistory:{}, athleteState:{ movements:{} } },
  save: function(){},
  focus: function(){ return {label:'test', targetReps:{0:8}}; },
  buildWeekInfo: function(){ return {6:{label:'S6',goal:'Deload facile'}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; },
  parseTargetReps: function(format, fallback){
    const nums = String(format||'').match(/\d+/g)||[];
    if(!nums.length) return {min:fallback||8,max:fallback||8};
    const last = Number(nums[nums.length-1])||fallback||8;
    return {min:last,max:last};
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
  'scripts/charge/suggestion.js'
];
loadOrder.forEach(f => vm.runInNewContext(read(f), ctx, {filename:f}));

// ── Helpers simulation ──────────────────────────────────────────────────────
function resetState(profile){
  ctx.state.athleteState = { movements:{} };
  ctx.__coachLoadHints = {};
  ctx.state.profile = profile ? Object.assign({onboarded:true}, profile) : null;
  ctx.state.week = 3;
  ctx.state.day = 'lundi';
}

function makeHistoryRow(load, reps, rpe, date, status){
  return { load, reps, rpe, date: date||'2026-01-01',
           hasValidLoad:true, externalLoad:load,
           status: status||'success',
           planned:{ load, reps, targetMin:reps, targetMax:reps } };
}

function injectHistory(label, rows){
  if(!ctx.state.athleteState.movements[label]){
    ctx.state.athleteState.movements[label] = { ranges:{}, history:[], status:'ok' };
  }
  ctx.state.athleteState.movements[label].history = rows;
}

function suggest(label, programLoad, targetReps){
  ctx.__coachLoadHints = {};
  const result = ctx.guardedSuggestedLoadDecision(label, String(programLoad)+' lb', targetReps, null);
  const brain  = ctx.coachSafeSuggestedLoad(label, String(programLoad)+' lb', targetReps, null);
  return { base: result.loadNum, brain: Number(brain)||result.loadNum,
           severity: result.severity, reason: result.reason };
}

function checkRange(label, val, min, max, desc){
  if(val < min || val > max){
    return `  ❌ ${label} [${desc}] : ${val} lb hors [${min}–${max}]`;
  }
  return `  ✅ ${label} [${desc}] : ${val} lb`;
}

// ── Profils types ───────────────────────────────────────────────────────────
const PROFILES = {
  debutant: { name:'Débutant', aggressiveness:0.6,
    scaleRatios:{'Strict Press':0.65,'Front Squat':0.60,'Back Squat':0.65,
                 'Bench Press':0.70,'Barbell Row':0.65,'DB Shoulder Press':0.70} },
  intermediaire: { name:'Intermédiaire', aggressiveness:1.0,
    scaleRatios:{'Strict Press':1.0,'Front Squat':1.0,'Back Squat':1.0,
                 'Bench Press':1.0,'Barbell Row':1.0,'DB Shoulder Press':1.0} },
  avance: { name:'Avancé', aggressiveness:1.3,
    scaleRatios:{'Strict Press':1.3,'Front Squat':1.3,'Back Squat':1.4,
                 'Bench Press':1.35,'Barbell Row':1.25,'DB Shoulder Press':1.2} },
  chaotique: { name:'Chaotique (irrégulier)', aggressiveness:0.9,
    scaleRatios:{'Strict Press':0.9,'Back Squat':0.9,'Bench Press':0.95} },
  crossfit: { name:'CrossFit RX', aggressiveness:1.1,
    scaleRatios:{'Power Clean':1.1,'Front Squat':1.05,'Back Squat':1.1,
                 'Strict Press':0.95,'Bench Press':1.0} }
};

// ── Scénarios par profil ────────────────────────────────────────────────────
const SCENARIOS = [

  // 1. DÉBUTANT — programme Fondation, premières semaines, RPE facile
  { profil:'debutant', label:'Back Squat', program:95, reps:8,
    histoire:[
      makeHistoryRow(75,8,7,'2026-01-07'),
      makeHistoryRow(80,8,7,'2026-01-14'),
      makeHistoryRow(85,8,7.5,'2026-01-21')
    ],
    desc:'Débutant progression régulière RPE ~7',
    expected:{ min:85, max:100 } },

  { profil:'debutant', label:'Bench Press', program:75, reps:8,
    histoire:[
      makeHistoryRow(65,8,9,'2026-01-07'),
      makeHistoryRow(65,7,9.5,'2026-01-14')
    ],
    desc:'Débutant RPE élevé — doit maintenir ou descendre',
    expected:{ min:55, max:65 } },

  // 2. INTERMÉDIAIRE — Arnold Split, progression stable
  { profil:'intermediaire', label:'Bench Press', program:155, reps:5,
    histoire:[
      makeHistoryRow(145,5,7.5,'2026-01-07'),
      makeHistoryRow(150,5,7,'2026-01-14'),
      makeHistoryRow(155,5,7,'2026-01-21')
    ],
    desc:'Intermédiaire progression linéaire Bench',
    expected:{ min:155, max:175 } },

  { profil:'intermediaire', label:'Strict Press', program:115, reps:5,
    histoire:[
      makeHistoryRow(110,5,8,'2026-01-07'),
      makeHistoryRow(115,5,8.5,'2026-01-14'),
      makeHistoryRow(115,4,9,'2026-01-21')
    ],
    desc:'Intermédiaire Strict Press plateau RPE 9 — bloquer hausse',
    expected:{ min:105, max:115 } },

  // 3. AVANCÉ — Force/Performance, charges lourdes, progression reps avant poids
  { profil:'avance', label:'Front Squat', program:205, reps:3,
    histoire:[
      makeHistoryRow(195,3,7.5,'2026-01-07'),
      makeHistoryRow(200,3,7,'2026-01-14'),
      makeHistoryRow(205,3,7,'2026-01-21')
    ],
    desc:'Avancé Front Squat progression RPE ok',
    expected:{ min:205, max:225 } },

  { profil:'avance', label:'Back Squat', program:275, reps:5,
    histoire:[
      makeHistoryRow(255,5,8,'2026-01-07'),
      makeHistoryRow(265,5,8,'2026-01-14'),
      makeHistoryRow(270,5,8.5,'2026-01-21'),
      makeHistoryRow(270,5,9,'2026-01-28')
    ],
    desc:'Avancé Back Squat dernier RPE 9 — pas de hausse',
    expected:{ min:255, max:270 } },

  // 4. CHAOTIQUE — séances irrégulières, RPE partout
  { profil:'chaotique', label:'Back Squat', program:155, reps:8,
    histoire:[
      makeHistoryRow(145,8,6,'2026-01-07'),
      makeHistoryRow(165,4,9.5,'2026-01-28'), // saut + échec
      makeHistoryRow(135,8,8,'2026-02-18')    // retour après repos
    ],
    desc:'Chaotique — saut + échec + retour prudent',
    expected:{ min:135, max:155 } },

  { profil:'chaotique', label:'Bench Press', program:135, reps:8,
    histoire:[
      makeHistoryRow(125,8,8,'2026-01-10'),
      makeHistoryRow(130,8,9,'2026-02-05'),
      makeHistoryRow(130,8,9,'2026-02-20')
    ],
    desc:'Chaotique — deux RPE 9 consécutifs → réduction attendue',
    expected:{ min:115, max:130 } },

  // 5. CROSSFIT — Power Clean technique vs lourd, Front Squat
  { profil:'crossfit', label:'Power Clean', program:135, reps:3,
    histoire:[
      makeHistoryRow(125,3,7,'2026-01-07'),
      makeHistoryRow(130,3,7.5,'2026-01-14'),
      makeHistoryRow(135,3,7,'2026-01-21')
    ],
    desc:'CrossFit Power Clean progression normale',
    expected:{ min:135, max:155 } },

  { profil:'crossfit', label:'Front Squat', program:175, reps:5,
    histoire:[
      makeHistoryRow(165,5,8,'2026-01-07'),
      makeHistoryRow(170,5,8.5,'2026-01-14'),
      makeHistoryRow(175,4,9.5,'2026-01-21') // échec reps
    ],
    desc:'CrossFit Front Squat échec reps RPE 9.5 — réduction',
    expected:{ min:155, max:175 } },

  // 6. PREMIER UTILISATEUR — zéro historique (onboarding fresh)
  { profil:'intermediaire', label:'Strict Press', program:95, reps:8,
    histoire: [],
    desc:'Nouvel utilisateur zéro historique — seed programme',
    expected:{ min:75, max:105 } },

  { profil:'debutant', label:'DB Shoulder Press', program:35, reps:10,
    histoire: [],
    desc:'Débutant zéro historique DB — seed profil',
    expected:{ min:20, max:45 } }
];

// ── Exécution ───────────────────────────────────────────────────────────────
console.log('\n=== Racine V1.16 — Simulation utilisateurs virtuels ===\n');

let passed = 0, failed = 0, warnings = 0;
let lastProfil = null;

SCENARIOS.forEach(sc => {
  const profile = PROFILES[sc.profil];
  resetState(profile);
  injectHistory(sc.label, sc.histoire);

  const r = suggest(sc.label, sc.program, sc.reps);
  const val = r.brain || r.base || 0;

  if(profile.name !== lastProfil){
    console.log(`\n── ${profile.name} ──────────────────────────────────`);
    lastProfil = profile.name;
  }

  const line = checkRange(sc.label, val, sc.expected.min, sc.expected.max, sc.desc);
  const ok = line.startsWith('  ✅');
  if(ok) passed++; else failed++;
  if(r.severity==='warning') warnings++;

  console.log(line);
  if(!ok){
    console.log(`     → Raison: ${r.reason.substring(0,120)}`);
  }
  if(r.severity==='warning'){
    console.log(`     ⚠ Sévérité warning : ${r.reason.substring(0,100)}`);
  }
});

// ── Résumé ──────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
console.log(`Résultat : ${passed} ✅  ${failed} ❌  ${warnings} ⚠ warnings`);
if(failed === 0){
  console.log('Moteur dans les bornes attendues pour tous les profils.');
} else {
  console.log('Voir les cas ❌ ci-dessus — ajustement moteur possiblement requis.');
}
console.log('');


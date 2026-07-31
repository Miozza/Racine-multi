#!/usr/bin/env node
/*
 * Racine multi — simulateur terrain virtuel multi-utilisateurs.
 * Objectif: tester la logique multi-profil, l'onboarding, les permissions,
 * les programmes, les tendances de charge et la vue Progression sans toucher
 * aux données vivantes de l'app.
 *
 * Usage:
 *   node dev/simulate_multi_users.js
 *   node dev/simulate_multi_users.js --json
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REPORT_MD = path.join(ROOT, 'dev', 'simulation_report.md');
const REPORT_JSON = path.join(ROOT, 'dev', 'simulation_report.json');

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(5162026);
function rand(min, max) { return min + (max - min) * rng(); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function roundTo(n, step) { return Math.round(Number(n || 0) / step) * step; }
function roundLoad(movement, n) {
  const name = normalize(movement);
  if (/cable|rope|poulie|face pull|triceps/.test(name)) return roundTo(n, 10);
  if (/db|dumbbell|halt[eè]re|bulgarian|incline/.test(name)) return roundTo(n, 2.5);
  return roundTo(n, 5);
}
function e1rm(load, reps) { return Number(load || 0) * (1 + Number(reps || 0) / 30); }
function fmt(n, digits = 1) { return Number.isFinite(n) ? Number(n).toFixed(digits).replace(/\.0$/, '') : '—'; }
function normalize(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function makeLocalStorage() {
  const data = new Map();
  return {
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(String(k), String(v)); },
    removeItem(k) { data.delete(k); },
    clear() { data.clear(); },
    _dump() { return Object.fromEntries(data.entries()); }
  };
}

function loadBrowserSandbox() {
  const sandbox = {
    console,
    localStorage: makeLocalStorage(),
    Math,
    Date,
    JSON,
    Number,
    String,
    Array,
    Object,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    RegExp,
    Error,
    Boolean,
    Set,
    Map,
    // Le moteur écrit ast.version = APP_VERSION. Valeur neutre : la simulation
    // n'a pas à connaître la version livrée.
    APP_VERSION: 'SIMULATION',
    setTimeout: function(){},
    clearTimeout: function(){},
    navigator: { userAgent: 'node-simulation' },
    document: {
      addEventListener: function(){},
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      getElementById: function(){ return null; },
      createElement: function(){ return { style:{}, classList:{ add(){}, remove(){}, toggle(){} }, appendChild(){}, setAttribute(){} }; },
      body: { classList: { add(){}, remove(){}, contains(){ return false; } } }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  // Ordre calqué sur index.html. Le VRAI moteur de charges est chargé ici : les
  // suggestions de cette simulation viennent de scripts/charge/, pas d'une
  // heuristique locale. C'est ce qui rend le rapport pertinent pour la mission
  // « le bon poids pour n'importe quel athlète » (CLAUDE.md §1).
  const files = [
    'programs/config.js',
    'scripts/profiles/reference.js',
    'scripts/profiles/onboarding.js',
    'programs/index.js',
    'programs/racine_client_programs.js',
    'programs/racine_crossfit_programs.js',
    'programs/strict_muscle_up_cycle.js',
    'programs/hypertrophie_fesse_stephanie.js',
    'data/charges.js',
    'data/equipment.js',
    'scripts/app_helpers.js',
    'scripts/charge/equipement.js',
    'scripts/charge/movement_tuning.js',
    'scripts/charge/utilitaires.js',
    'scripts/charge/mouvements.js',
    'scripts/charge/historique.js',
    'scripts/charge/rpe.js',
    'scripts/charge/scaling.js',
    'scripts/charge/brain_stats.js',
    'scripts/charge/brain_memory.js',
    'scripts/charge/movement_profiles.js',
    'scripts/charge/brain_explain.js',
    'scripts/charge/brain_journal.js',
    'scripts/charge/suggestion.js',
    'scripts/charge/ml_refinement.js',
    'scripts/history/index.js',
    'scripts/charge/index.js'
  ];
  for (const rel of files) {
    const file = path.join(ROOT, rel);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox;
}

// Deux globals vivent dans app.js, qui ne peut pas être chargé hors navigateur
// (DOM au chargement). Ce sont les seuls compléments : `resolveMovementKey` est
// recopié à l'identique d'app.js, `state` reçoit la forme de freshState().
// Aucune logique de charge n'est réécrite ici.
function installEngineGlobals(sb) {
  vm.runInContext(`
    var customCharges = {};
    var state = null;
    function resolveMovementKey(key){
      var mvKey = null, cleanKey = chargeKeyFromName(key);
      Object.keys(movements).forEach(function(k){
        if (k === key || k === cleanKey || movements[k].name === key || movements[k].name === cleanKey) mvKey = k;
      });
      return mvKey;
    }
  `, sb, { filename: 'simulation-globals' });
}

// Chaque persona repart d'un athlete_state vierge : aucun historique ne fuit
// d'un profil à l'autre (c'est justement ce que la suite doit prouver).
function resetEngineState(sb, profile, family) {
  sb.state = {
    week: 1,
    day: 'lundi',
    history: [],
    profile: profile,
    cycle: { goal: family },
    movementRefs: {},
    rpeHistory: {},
    deloadAlert: false,
    athleteState: { movements: {}, updatedAt: null, version: null }
  };
}

const sandbox = loadBrowserSandbox();
installEngineGlobals(sandbox);
const programIndex = Array.isArray(sandbox.COACH_BERTIN_PROGRAM_INDEX) ? sandbox.COACH_BERTIN_PROGRAM_INDEX : [];
const programObjects = sandbox.COACH_BERTIN_PROGRAMS || {};
const privateIds = new Set((sandbox.BERTIN_PRIVATE_PROGRAM_IDS || []).slice());
const onboarding = sandbox.CoachOnboarding;

const mainMovementPool = {
  beginner: ['Goblet Squat', 'Incline DB Press', 'Ring Row', 'Hip Thrust', 'Strict Press'],
  hypertrophy: ['Bench Press', 'Front Squat', 'Barbell Row', 'Hip Thrust', 'DB RDL', 'Incline DB Press'],
  strength: ['Back Squat', 'Bench Press', 'Deadlift', 'Strict Press', 'Barbell Row'],
  recomposition: ['Front Squat', 'Incline DB Press', 'Hip Thrust', 'Ring Row', 'DB RDL'],
  hybrid: ['Front Squat', 'Push Press', 'Power Clean', 'Barbell Row', 'Weighted Pull-up'],
  crossfit: ['Power Clean', 'Front Squat', 'Push Press', 'Deadlift', 'Pull-Up'],
  muscleup: ['Strict Pull-Up', 'Weighted Pull-Up', 'Ring Dip', 'False Grip Row', 'Transition Drill'],
  glutes: ['Hip Thrust', 'DB RDL', 'Bulgarian Split Squat', 'Goblet Squat', 'Cable Pull Through']
};

const movementSeedMap = [
  [/bench/i, 'bench'],
  [/front squat/i, 'frontSquat'],
  [/back squat/i, 'backSquat5RM'],
  [/strict press|push press/i, 'strictPress'],
  [/power clean/i, 'powerClean'],
  // Le Deadlift n'est PAS semé depuis hipThrust8RM : les deux ne sont pas à la
  // même échelle, et l'ancien mapping produisait des soulevés de terre à
  // 600-1050 lb chez des athlètes qui benchent 150-225. Il dérive du squat,
  // conformément au référentiel (scripts/profiles/reference.js : « deadlift
  // ≈ 1,2×squat »). Cas traité dans seedLoadFor().
  [/hip thrust/i, 'hipThrust8RM'],
  [/db rdl|romanian/i, 'dbRdl'],
  [/bulgarian/i, 'bulgarianDb'],
  [/barbell row|ring row|false grip row/i, 'row8RM'],
  [/incline db/i, 'inclineDb10RM'],
  [/pull.?up/i, 'latPulldown10RM'],
  [/ring dip|dip/i, 'strictPress'],
  [/goblet squat/i, 'frontSquat']
];

function fieldForMovement(movement) {
  for (const [rx, key] of movementSeedMap) if (rx.test(movement)) return key;
  return '_overall';
}

function targetRepsFor(movement, family) {
  const n = normalize(movement);
  if (/power clean|clean/.test(n)) return 3;
  if (/deadlift|back squat|bench press|strict press/.test(n) && family === 'strength') return 5;
  if (/pull up|ring dip|dip/.test(n)) return 6;
  if (/transition|false grip/.test(n)) return 8;
  if (/db|goblet|bulgarian|hip thrust|row|incline/.test(n)) return 8;
  return family === 'hypertrophy' || family === 'beginner' ? 8 : 5;
}

function stepFor(movement) {
  const n = normalize(movement);
  if (/pull up|ring dip|dip|strict press|power clean|incline|db|bulgarian/.test(n)) return 2.5;
  if (/front squat|bench|row|hip thrust|deadlift|back squat/.test(n)) return 5;
  return 5;
}

function familyForProgram(id, personaFamily) {
  if (/beginner/.test(id)) return 'beginner';
  if (/hypertrophy|hypertrophie|arnold/.test(id)) return 'hypertrophy';
  if (/strength|force/.test(id)) return 'strength';
  if (/recomposition/.test(id)) return 'recomposition';
  if (/hybrid/.test(id)) return 'hybrid';
  if (/crossfit|haltero|rx|metcon/.test(id)) return 'crossfit';
  if (/muscle_up/.test(id)) return 'muscleup';
  return personaFamily || 'hypertrophy';
}

function visiblePrograms(profile) {
  const perms = new Set(profile.programPermissions || []);
  return programIndex.filter(p => p.visibility === 'public' || perms.has(p.id));
}

function computeProfile(persona) {
  const computed = onboarding.computeFromAnswers(persona.answers, persona.level);
  const profile = {
    id: persona.id,
    name: persona.name,
    experienceLevel: persona.level,
    bodyweightLb: persona.bodyweightLb,
    aggressiveness: persona.aggressiveness,
    onboarded: true,
    scaleRatios: computed.ratios,
    programPermissions: (persona.programPermissions || []).slice()
  };
  return { profile, values: computed.values, ratios: computed.ratios };
}

function seedLoadFor(movement, computed, persona, family) {
  const key = fieldForMovement(movement);
  let base = computed.values[key] || computed.values.frontSquat || computed.values.bench || 50;
  const n = normalize(movement);
  if (/pull up|ring dip|dip/.test(n)) return 0;
  if (/transition|false grip/.test(n)) return 0;
  if (/deadlift/.test(n)) base = (computed.values.backSquat5RM || computed.values.frontSquat || 150) * 1.2;
  if (/db rdl/.test(n)) base = computed.values.dbRdl || 25;
  if (/incline db/.test(n)) base = computed.values.inclineDb10RM || 20;
  if (/goblet squat/.test(n)) base = Math.min(computed.values.frontSquat || 60, 90) * 0.55;
  const familyFactor = { beginner: 0.55, hypertrophy: 0.72, strength: 0.82, recomposition: 0.65, hybrid: 0.72, crossfit: 0.68, muscleup: 0.0, glutes: 0.72 }[family] || 0.7;
  return Math.max(0, roundLoad(movement, base * familyFactor));
}

// Contexte de bloc passé au moteur. Il doit rester un contexte de PROGRESSION
// principale : `technique`, `wod` ou `light` déclencheraient
// coachIsLimitedProgressionContext() et la suggestion cesserait de progresser —
// on ne mesurerait plus rien (docs/CHARGE_CONTEXT.md).
// Mêmes champs que coachSuggestForExercise() en production
// (scripts/charge/suggestion.js) : kind, blockTitle, format, day, week. Un
// contexte sous-spécifié ferait travailler le moteur à l'aveugle et le rapport
// mesurerait le harnais au lieu du moteur.
function engineContextFor(movement, family, week, targetReps) {
  const accessory = /db |dumbbell|goblet|bulgarian|incline|cable|ring row|hip thrust|rdl/i.test(movement);
  return {
    kind: accessory ? 'accessory' : 'strength',
    blockTitle: (accessory ? 'C. Accessoire — ' : 'A. Principal — ') + movement,
    format: '3x' + targetReps,
    day: sandbox.state ? sandbox.state.day : 'lundi',
    week: week
  };
}

// Suggestion produite par le VRAI moteur (scripts/charge/suggestion.js →
// coachSafeSuggestedLoad, qui empile guardedSuggestedLoadDecision + Brain V1.16).
// Le moteur lit state.athleteState, alimenté après chaque semaine simulée par
// updateAthleteStateFromResults() — exactement le flux de production
// (docs/DATA_FLOW_CONTRACT.md).
function suggestionFromEngine(movement, history, persona, targetReps, family, week, seedLoad) {
  const bodyweight = /pull.?up|ring dip|transition|false grip/i.test(movement);
  const lastLoad = history.length ? history[history.length - 1].load : seedLoad;
  sandbox.state.week = week;

  let text = '';
  let error = null;
  try {
    text = sandbox.coachSafeSuggestedLoad(movement, lastLoad, targetReps, engineContextFor(movement, family, week, targetReps));
  } catch (e) {
    error = e.message;
  }
  const num = error ? null : sandbox.parseLoad(text);
  const load = bodyweight ? 0 : (Number.isFinite(num) && num > 0 ? num : lastLoad);

  // C'est le moteur qui dit si la semaine est un deload, pas le simulateur.
  let deloadWeek = false;
  try {
    const ctx = sandbox.coachBuildMovementContext(movement, engineContextFor(movement, family, week, targetReps));
    deloadWeek = !!sandbox.coachIsDeloadWeekOrContext(ctx);
  } catch (e) { /* repli : semaine normale */ }

  return {
    deloadWeek: deloadWeek,
    load: load,
    reps: targetReps,
    reason: error ? ('moteur en erreur: ' + error) : String(text || '').trim(),
    severity: /⚠/.test(String(text)) ? 'warning' : 'ok',
    confidence: clamp(history.length / 6, 0.25, 0.95),
    engineText: String(text || ''),
    engineError: error
  };
}

// Renvoie la séance simulée au moteur par la porte de production.
function feedEngine(movement, load, reps, rpe, date) {
  const results = {};
  results[movement] = { load: String(load), reps: String(reps), rpe: String(rpe) };
  try { sandbox.updateAthleteStateFromResults(results, date); }
  catch (e) { return e.message; }
  return null;
}

function simulateMovement(persona, computed, movement, family, weeks) {
  const target = targetRepsFor(movement, family);
  const bodyweight = /pull.?up|ring dip|transition|false grip/i.test(movement);
  let load = seedLoadFor(movement, computed, persona, family);
  let ability = bodyweight ? Math.max(target, Math.round((persona.bodyweightLb || 170) / 22 * persona.baseStrength)) : load * (1.12 + persona.baseStrength * 0.08);
  const history = [];
  const warnings = [];

  for (let week = 1; week <= weeks; week++) {
    const date = `2026-${String(7 + Math.floor((week - 1) / 4)).padStart(2, '0')}-${String(1 + ((week - 1) % 4) * 7).padStart(2, '0')}`;
    const suggestion = suggestionFromEngine(movement, history, persona, target, family, week, load);
    if (suggestion.engineError) warnings.push(`${movement}: moteur en erreur — ${suggestion.engineError}`);
    let suggestedLoad = bodyweight ? 0 : suggestion.load;
    let complianceNoise = rand(-persona.chaos, persona.chaos);
    if (persona.id === 'chaos_donnees') complianceNoise += pick([-0.35, 0, 0.45]);
    let actualLoad = bodyweight ? 0 : Math.max(0, roundLoad(movement, suggestedLoad * (1 + complianceNoise)));
    let relative = bodyweight ? target / Math.max(1, ability) : actualLoad / Math.max(1, ability);
    let reps = Math.round(target + rand(-1, 1) + clamp((1 - relative) * 3, -1, 1));
    let failed = false;
    if (persona.injuryWeek && week >= persona.injuryWeek) {
      relative += 0.12;
      reps -= 1;
    }
    if (persona.id === 'chaos_donnees' && week === 3) {
      reps = 0;
      failed = true;
    }
    reps = clamp(reps, failed ? 0 : 1, target + 5);
    let rpe = clamp(6.2 + relative * 2.7 + rand(-persona.rpeNoise, persona.rpeNoise), 5.5, 10);
    if (failed) rpe = 10;
    if (persona.injuryWeek && week >= persona.injuryWeek) rpe = clamp(rpe + 0.8, 7, 10);
    if (persona.id === 'beginner_light' && week <= 2 && actualLoad > seedLoadFor(movement, computed, persona, family) * 1.25) warnings.push('Débutant reçoit un saut trop rapide sur ' + movement);

    const row = {
      date,
      movement,
      load: actualLoad,
      reps,
      rpe: Number(rpe.toFixed(1)),
      e1rm: bodyweight ? reps : e1rm(actualLoad, reps),
      suggestedLoad,
      suggestionReason: suggestion.reason,
      deloadWeek: !!suggestion.deloadWeek,
      severity: suggestion.severity,
      confidence: suggestion.confidence,
      failed
    };
    history.push(row);

    // Boucle fermée : le moteur apprend de la séance qu'il vient de suggérer.
    const feedError = feedEngine(movement, actualLoad, reps, row.rpe, date);
    if (feedError) warnings.push(`${movement}: athlete_state en erreur — ${feedError}`);

    const adaptation = persona.adaptationRate * (persona.injuryWeek && week >= persona.injuryWeek ? -0.35 : 1);
    ability = Math.max(bodyweight ? 1 : 5, ability * (1 + adaptation + rand(-0.005, 0.008)));
  }
  return { movement, target, history, warnings };
}

function buildProgressionPoints(profileSim) {
  const byMoveDate = new Map();
  for (const mv of profileSim.movements) {
    for (const row of mv.history) {
      const key = `${normalize(row.movement)}::${row.date}`;
      const prev = byMoveDate.get(key);
      if (!prev || row.e1rm > prev.e1rm || row.reps > prev.reps) {
        byMoveDate.set(key, Object.assign({}, row, { grouped: (prev ? (prev.grouped || 1) + 1 : 1) }));
      }
    }
  }
  return Array.from(byMoveDate.values()).sort((a,b) => a.date.localeCompare(b.date));
}

function detectTrend(rows) {
  // Le dernier point d'une semaine 6 est souvent un deload volontaire. Il ne
  // doit pas transformer une progression saine en “baisse suspecte”.
  // Le drapeau vient du moteur (coachIsDeloadWeekOrContext) et non d'une regex
  // sur sa prose : le texte d'une suggestion de deload ne contient pas forcément
  // le mot « deload », et le filtre passait alors à côté.
  const usable = rows.filter(r => !r.deloadWeek);
  const sample = usable.length >= 3 ? usable : rows;
  if (sample.length < 3) return { status: 'insuffisant', delta: 0 };
  const first = sample[0].e1rm;
  const last = sample[sample.length - 1].e1rm;
  const deltaPct = first ? ((last - first) / first) * 100 : 0;
  const avgRpe = sample.reduce((a,b) => a + b.rpe, 0) / sample.length;
  if (deltaPct > 5 && avgRpe <= 8.6) return { status: 'progression propre', delta: deltaPct };
  if (deltaPct > 5 && avgRpe > 8.6) return { status: 'monte cher', delta: deltaPct };
  if (deltaPct < -4) return { status: 'baisse suspecte', delta: deltaPct };
  if (avgRpe >= 8.7) return { status: 'stable lourd', delta: deltaPct };
  return { status: 'stable', delta: deltaPct };
}

const personas = [
  {
    id: 'beginner_light', name: 'Débutant très léger', level: 'debutant', bodyweightLb: 142, aggressiveness: 0.65,
    programId: 'client_beginner_foundation_2d', family: 'beginner', movementSet: mainMovementPool.beginner,
    baseStrength: 0.55, adaptationRate: 0.025, chaos: 0.03, rpeNoise: 0.45,
    answers: { squat:{weight:65,reps:8,rpe:7}, bench:{weight:55,reps:8,rpe:7}, press:{weight:35,reps:8,rpe:7}, row:{weight:60,reps:10,rpe:7}, hinge:{weight:30,reps:8,rpe:7} }
  },
  {
    id: 'recomp_intermittent', name: 'Recomposition 3j irrégulier', level: 'debutant', bodyweightLb: 205, aggressiveness: 0.75,
    programId: 'client_recomposition_3d', family: 'recomposition', movementSet: mainMovementPool.recomposition,
    baseStrength: 0.7, adaptationRate: 0.015, chaos: 0.08, rpeNoise: 0.65,
    answers: { squat:{weight:95,reps:7,rpe:8}, bench:null, press:{weight:55,reps:8,rpe:8}, row:{weight:85,reps:8,rpe:8}, hinge:{weight:45,reps:8,rpe:8} }
  },
  {
    id: 'steph_glutes', name: 'Profil fessiers privé', level: 'intermediaire', bodyweightLb: 150, aggressiveness: 0.9,
    programId: 'hypertrophie_fesse_stephanie', programPermissions:['hypertrophie_fesse_stephanie'], family: 'glutes', movementSet: mainMovementPool.glutes,
    baseStrength: 0.78, adaptationRate: 0.02, chaos: 0.04, rpeNoise: 0.45,
    answers: { squat:{weight:105,reps:8,rpe:7.5}, bench:{weight:75,reps:8,rpe:7.5}, press:{weight:45,reps:8,rpe:7.5}, row:{weight:90,reps:8,rpe:7.5}, hinge:{weight:50,reps:8,rpe:7.5} }
  },
  {
    id: 'strength_2d_busy', name: 'Force 2j emploi chargé', level: 'intermediaire', bodyweightLb: 190, aggressiveness: 0.95,
    programId: 'client_strength_2d', family: 'strength', movementSet: mainMovementPool.strength,
    baseStrength: 0.88, adaptationRate: 0.012, chaos: 0.04, rpeNoise: 0.4,
    answers: { squat:{weight:165,reps:5,rpe:8}, bench:{weight:155,reps:5,rpe:8}, press:{weight:95,reps:5,rpe:8}, row:{weight:145,reps:8,rpe:8}, hinge:{weight:75,reps:8,rpe:8} }
  },
  {
    id: 'advanced_force', name: 'Avancé force 4j', level: 'avance', bodyweightLb: 215, aggressiveness: 1.15,
    programId: 'client_strength_4d', family: 'strength', movementSet: mainMovementPool.strength,
    baseStrength: 1.08, adaptationRate: 0.008, chaos: 0.035, rpeNoise: 0.35,
    answers: { squat:{weight:255,reps:5,rpe:8}, bench:{weight:235,reps:5,rpe:8}, press:{weight:145,reps:5,rpe:8}, row:{weight:205,reps:8,rpe:8}, hinge:{weight:105,reps:8,rpe:8} }
  },
  {
    id: 'rx_crossfit', name: 'CrossFit RX 5j', level: 'avance', bodyweightLb: 185, aggressiveness: 1.05,
    programId: 'client_rx_crossfit_5d', family: 'crossfit', movementSet: mainMovementPool.crossfit,
    baseStrength: 1.0, adaptationRate: 0.006, chaos: 0.07, rpeNoise: 0.75,
    answers: { squat:{weight:225,reps:5,rpe:8}, bench:{weight:205,reps:5,rpe:8}, press:{weight:125,reps:5,rpe:8}, row:{weight:185,reps:8,rpe:8}, hinge:{weight:95,reps:8,rpe:8} }
  },
  {
    id: 'metcon_prep', name: 'Préparation Metcon 3j', level: 'intermediaire', bodyweightLb: 178, aggressiveness: 0.9,
    programId: 'client_metcon_prep_3d', family: 'crossfit', movementSet: mainMovementPool.crossfit,
    baseStrength: 0.82, adaptationRate: 0.012, chaos: 0.08, rpeNoise: 0.8,
    answers: { squat:{weight:155,reps:7,rpe:8}, bench:{weight:135,reps:8,rpe:8}, press:{weight:85,reps:8,rpe:8}, row:{weight:135,reps:8,rpe:8}, hinge:{weight:70,reps:8,rpe:8} }
  },
  {
    id: 'strict_mu_candidate', name: 'Candidat strict muscle-up', level: 'avance', bodyweightLb: 180, aggressiveness: 0.85,
    programId: 'strict_muscle_up_10w', family: 'muscleup', movementSet: mainMovementPool.muscleup,
    baseStrength: 1.0, adaptationRate: 0.018, chaos: 0.04, rpeNoise: 0.5,
    answers: { squat:{weight:185,reps:5,rpe:8}, bench:{weight:185,reps:5,rpe:8}, press:{weight:115,reps:5,rpe:8}, row:{weight:175,reps:8,rpe:8}, hinge:{weight:85,reps:8,rpe:8} }
  },
  {
    id: 'return_injury', name: 'Retour blessure prudent', level: 'intermediaire', bodyweightLb: 198, aggressiveness: 0.6,
    programId: 'client_hybrid_performance_3d', family: 'hybrid', movementSet: mainMovementPool.hybrid,
    baseStrength: 0.82, adaptationRate: 0.006, chaos: 0.04, rpeNoise: 0.55, injuryWeek: 4,
    answers: { squat:{weight:145,reps:6,rpe:8}, bench:{weight:135,reps:8,rpe:8}, press:{weight:85,reps:8,rpe:8}, row:{weight:135,reps:8,rpe:8}, hinge:{weight:65,reps:8,rpe:8} }
  },
  {
    id: 'chaos_donnees', name: 'Utilisateur données incohérentes', level: 'intermediaire', bodyweightLb: 170, aggressiveness: 1.25,
    programId: 'client_hypertrophy_5d', family: 'hypertrophy', movementSet: mainMovementPool.hypertrophy,
    baseStrength: 0.75, adaptationRate: 0.01, chaos: 0.18, rpeNoise: 1.1,
    answers: { squat:{weight:135,reps:20,rpe:6}, bench:{weight:45,reps:2,rpe:10}, press:null, row:{weight:250,reps:15,rpe:5}, hinge:{weight:95,reps:1,rpe:10} }
  }
];

function validateProgram(profile, persona) {
  const visible = visiblePrograms(profile);
  const visibleIds = new Set(visible.map(p => p.id));
  const selectedVisible = visibleIds.has(persona.programId);
  const leakedPrivate = visible.filter(p => p.visibility === 'private' && !(profile.programPermissions || []).includes(p.id)).map(p => p.id);
  const obj = programObjects[persona.programId];
  let blocksOk = false;
  let blockCount = 0;
  let blockError = null;
  try {
    const indexMeta = programIndex.find(p => p.id === persona.programId) || {};
    if (obj && typeof obj.getBlocks === 'function') {
      const days = obj.days || indexMeta.days || ['lundi'];
      const day = days[0] || 'lundi';
      const blocks = obj.getBlocks(day, 1);
      blockCount = Array.isArray(blocks) ? blocks.length : 0;
      blocksOk = blockCount > 0;
    } else if (obj && Array.isArray(obj.sessions) && obj.sessions.length) {
      // Programmes simples de type bibliothèque de séances (ex: Stéphanie).
      const first = obj.sessions[0];
      const blocks = first && Array.isArray(first.blocks) ? first.blocks : [];
      blockCount = blocks.length;
      blocksOk = blockCount > 0;
    }
  } catch (err) {
    blockError = err && err.message ? err.message : String(err);
  }
  return { selectedVisible, leakedPrivate, blocksOk, blockCount, blockError, visibleCount: visible.length };
}

function evaluateProfile(persona) {
  const computed = computeProfile(persona);
  const profile = computed.profile;
  const programCheck = validateProgram(profile, persona);
  const family = familyForProgram(persona.programId, persona.family);
  const weeks = persona.programId === 'strict_muscle_up_10w' ? 10 : 6;
  // Le moteur travaille sur un athlete_state neuf, propre à ce profil.
  resetEngineState(sandbox, profile, family);
  const movements = persona.movementSet.map(movement => simulateMovement(persona, computed, movement, family, weeks));
  const progressionPoints = buildProgressionPoints({ movements });
  const warnings = [];
  const fails = [];

  if (!programCheck.selectedVisible) fails.push(`Programme choisi non visible: ${persona.programId}`);
  if (programCheck.leakedPrivate.length) fails.push(`Programmes privés visibles sans permission: ${programCheck.leakedPrivate.join(', ')}`);
  if (!programCheck.blocksOk) fails.push(`Programme ne retourne aucun bloc: ${persona.programId}${programCheck.blockError ? ' (' + programCheck.blockError + ')' : ''}`);

  if (persona.level === 'debutant') {
    const suspicious = ['bench','frontSquat','strictPress'].filter(k => (computed.values[k] || 0) > {bench:170, frontSquat:170, strictPress:105}[k]);
    if (suspicious.length) fails.push(`Charges débutant trop hautes après onboarding: ${suspicious.join(', ')}`);
  }
  if (persona.id !== 'advanced_force' && persona.id !== 'rx_crossfit') {
    if ((computed.values.bench || 0) >= 250 || (computed.values.frontSquat || 0) >= 225) {
      fails.push('Suspicion fuite Bertin/référence forte dans un profil non avancé');
    }
  }

  for (const mv of movements) {
    warnings.push(...mv.warnings);
    const rows = mv.history;
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i-1], cur = rows[i];
      // On mesure le SUGGÉRÉ, pas le réalisé : la charge réalisée porte le bruit
      // de compliance du simulateur, pas une décision du moteur. Et le seuil
      // vient du moteur lui-même (coachMaxJumpForExercise, alimenté par
      // COACH_MOVEMENT_TUNING), au lieu d'un seuil inventé ici : la suite teste
      // donc le moteur contre son propre contrat.
      const jump = Number(cur.suggestedLoad || 0) - Number(prev.load || 0);
      let maxJump = 10;
      try { maxJump = Number(sandbox.coachMaxJumpForExercise(cur.movement, prev.load)) || 10; }
      catch (e) { /* repli neutre */ }
      // Garde « pas de hausse après RPE ≥ 9 ». Elle ne peut s'appliquer que si
      // le moteur a VU la série : updateAthleteStateFromResults() ignore les
      // séries à 0 rep (scripts/charge/suggestion.js — `if(!hasValidLoad||!reps)
      // return;`). Un échec total ne laisse donc aucune trace dans athlete_state
      // et la garde RPE n'a rien sur quoi se déclencher. Ce n'est pas une
      // violation du moteur : c'est un angle mort, signalé comme tel.
      if (prev.rpe >= 9 && cur.suggestedLoad > prev.load) {
        if (Number(prev.reps) > 0) {
          fails.push(`${cur.movement}: suggestion en hausse après RPE ${prev.rpe} (${prev.load} -> ${cur.suggestedLoad})`);
        } else {
          warnings.push(`${cur.movement}: échec à 0 rep non mémorisé par athlete_state — la garde RPE ne peut pas s'appliquer (${prev.load} -> ${cur.suggestedLoad})`);
        }
      }
      if (jump > maxJump + 0.1) warnings.push(`${cur.movement}: le moteur dépasse son propre saut max (${fmt(jump)} lb > ${fmt(maxJump)} lb)`);
    }
    const trend = detectTrend(rows);
    if (trend.status === 'monte cher') warnings.push(`${mv.movement}: progresse mais RPE coûteux (${fmt(trend.delta)}%)`);
    if (trend.status === 'baisse suspecte' && persona.id !== 'return_injury' && persona.id !== 'chaos_donnees') warnings.push(`${mv.movement}: baisse suspecte non attendue`);
  }

  const dupKeys = new Set();
  const dupAfterGrouping = [];
  for (const p of progressionPoints) {
    const key = `${normalize(p.movement)}::${p.date}`;
    if (dupKeys.has(key)) dupAfterGrouping.push(key);
    dupKeys.add(key);
  }
  if (dupAfterGrouping.length) fails.push(`Progression garde encore des doublons date/mouvement: ${dupAfterGrouping.slice(0,3).join(', ')}`);

  const movementSummaries = movements.map(mv => {
    const rows = mv.history;
    const trend = detectTrend(rows);
    return {
      movement: mv.movement,
      first: rows[0],
      last: rows[rows.length - 1],
      avgRpe: rows.reduce((a,b) => a + b.rpe, 0) / rows.length,
      trend
    };
  });

  let status = 'PASS';
  if (fails.length) status = 'FAIL';
  else if (warnings.length) status = 'WARN';

  return { persona, profile, computedValues: computed.values, programCheck, movements, movementSummaries, progressionPoints, warnings, fails, status };
}

const results = personas.map(evaluateProfile);
// Pas d'horodatage dans le rapport : il est réécrit à chaque exécution, et une
// date mouvante salissait le dépôt à chaque passage des validations. Sans elle,
// un diff sur simulation_report.* signifie qu'un verdict a réellement change.
const summary = {
  version: 'V1.16-multi',
  personas: results.length,
  pass: results.filter(r => r.status === 'PASS').length,
  warn: results.filter(r => r.status === 'WARN').length,
  fail: results.filter(r => r.status === 'FAIL').length,
  programsCovered: Array.from(new Set(results.map(r => r.persona.programId))),
  privateProgramsChecked: results.filter(r => (r.persona.programPermissions || []).length).map(r => r.persona.programId)
};

function makeMarkdown() {
  const lines = [];
  lines.push('# Rapport simulation multi-utilisateurs — Racine V1.16-multi');
  lines.push('');
  lines.push('## Verdict global');
  lines.push('');
  lines.push(`- Profils simulés: **${summary.personas}**`);
  lines.push(`- PASS: **${summary.pass}**`);
  lines.push(`- WARN: **${summary.warn}**`);
  lines.push(`- FAIL: **${summary.fail}**`);
  lines.push(`- Programmes couverts: ${summary.programsCovered.map(x => '`'+x+'`').join(', ')}`);
  lines.push('');
  if (summary.fail) {
    lines.push('Verdict: **FAIL** — corriger les erreurs avant test terrain large.');
  } else if (summary.warn) {
    lines.push('Verdict: **WARN contrôlé** — logique exploitable, mais certains profils méritent une surveillance terrain.');
  } else {
    lines.push('Verdict: **PASS** — simulation virtuelle propre.');
  }
  lines.push('');
  lines.push('## Ce que le simulateur vérifie');
  lines.push('');
  lines.push('**Les suggestions viennent du VRAI moteur** (`scripts/charge/`, via');
  lines.push('`coachSafeSuggestedLoad`), et chaque séance simulée lui est renvoyée par');
  lines.push('`updateAthleteStateFromResults()` — le flux de production');
  lines.push('(`docs/DATA_FLOW_CONTRACT.md`). Ce rapport mesure donc le moteur, pas une');
  lines.push('heuristique de test.');
  lines.push('');
  lines.push('- Création de profils très différents via l’onboarding réel.');
  lines.push('- Mise à l’échelle des charges de départ par profil.');
  lines.push('- Visibilité des programmes publics/privés.');
  lines.push('- Construction minimale des blocs de programme.');
  lines.push('- Plusieurs semaines de boucle fermée suggestion → séance → athlete_state.');
  lines.push('- Freins après RPE élevé ou échec (garde « pas de hausse après RPE ≥ 9 »).');
  lines.push('- Respect par le moteur de son propre saut max (`coachMaxJumpForExercise`).');
  lines.push('- Regroupement Progression: un mouvement + une date = un point.');
  lines.push('');
  lines.push('## Résultats par profil');
  lines.push('');
  for (const r of results) {
    lines.push(`### ${r.status} — ${r.persona.name}`);
    lines.push('');
    lines.push(`- Profil: \`${r.persona.id}\`, niveau \`${r.persona.level}\`, agressivité \`${r.persona.aggressiveness}\``);
    lines.push(`- Programme: \`${r.persona.programId}\``);
    lines.push(`- Programmes visibles: ${r.programCheck.visibleCount}, blocs S1: ${r.programCheck.blockCount}`);
    lines.push(`- Points Progression après dédup: ${r.progressionPoints.length}`);
    lines.push('- Charges de départ clés: ' + [
      `bench ${fmt(r.computedValues.bench || 0,0)} lb`,
      `front squat ${fmt(r.computedValues.frontSquat || 0,0)} lb`,
      `strict press ${fmt(r.computedValues.strictPress || 0,0)} lb`,
      `row ${fmt(r.computedValues.row8RM || 0,0)} lb`,
      `hinge ${fmt(r.computedValues.hipThrust8RM || 0,0)} lb`
    ].join(' · '));
    lines.push('');
    lines.push('| Mouvement | Début | Fin | RPE moy. | Tendance |');
    lines.push('|---|---:|---:|---:|---|');
    for (const m of r.movementSummaries) {
      const first = m.first.load > 0 ? `${fmt(m.first.load,0)}×${m.first.reps}` : `${m.first.reps} reps`;
      const last = m.last.load > 0 ? `${fmt(m.last.load,0)}×${m.last.reps}` : `${m.last.reps} reps`;
      lines.push(`| ${m.movement} | ${first} | ${last} | ${fmt(m.avgRpe)} | ${m.trend.status} (${fmt(m.trend.delta)}%) |`);
    }
    if (r.fails.length) {
      lines.push('');
      lines.push('**Échecs**');
      r.fails.forEach(x => lines.push(`- ${x}`));
    }
    if (r.warnings.length) {
      lines.push('');
      lines.push('**Alertes**');
      r.warnings.slice(0, 8).forEach(x => lines.push(`- ${x}`));
      if (r.warnings.length > 8) lines.push(`- … ${r.warnings.length - 8} autres alertes`);
    }
    lines.push('');
  }
  lines.push('## Limites');
  lines.push('');
  lines.push('- Simulation logique seulement: ne remplace pas Safari/iPhone, un vrai cache PWA ni la compréhension d’un utilisateur réel.');
  lines.push('- Le moteur est réel, **l’athlète est synthétique**: son adaptation, son bruit de compliance et son RPE sont un modèle. Une tendance douteuse peut venir de l’athlète simulé autant que du moteur — vérifier avant de conclure.');
  lines.push('- La “vélocité” simulée correspond à la vitesse de progression charge/e1RM, pas à une vraie mesure VBT en m/s.');
  lines.push('- Les résultats générés ne doivent jamais être importés dans `data/` comme historique réel.');
  lines.push('- Angle mort connu: une série à 0 rep n’est pas mémorisée par `updateAthleteStateFromResults()` (`if(!hasValidLoad||!reps)return;`), donc la garde « pas de hausse après RPE ≥ 9 » ne peut pas se déclencher sur un échec total.');
  lines.push('');
  return lines.join('\n');
}

const report = {
  summary,
  results: results.map(r => ({
    id: r.persona.id,
    name: r.persona.name,
    status: r.status,
    programId: r.persona.programId,
    programCheck: r.programCheck,
    computedValues: r.computedValues,
    warnings: r.warnings,
    fails: r.fails,
    progressionPointCount: r.progressionPoints.length,
    movementSummaries: r.movementSummaries.map(m => ({ movement:m.movement, first:m.first, last:m.last, avgRpe:m.avgRpe, trend:m.trend }))
  }))
};

fs.writeFileSync(REPORT_MD, makeMarkdown(), 'utf8');
fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8');

const table = results.map(r => ({
  statut: r.status,
  profil: r.persona.id,
  programme: r.persona.programId,
  alertes: r.warnings.length,
  erreurs: r.fails.length,
  pointsProgression: r.progressionPoints.length
}));
console.table(table);
console.log(`\nRapport écrit: ${path.relative(ROOT, REPORT_MD)}`);
console.log(`JSON écrit: ${path.relative(ROOT, REPORT_JSON)}`);
if (summary.fail) {
  console.error(`\nSimulation FAIL: ${summary.fail} profil(s) en erreur.`);
  process.exit(1);
}
if (!process.argv.includes('--json')) {
  console.log(`\nVerdict: ${summary.warn ? 'WARN contrôlé' : 'PASS'} (${summary.pass} PASS, ${summary.warn} WARN, ${summary.fail} FAIL).`);
} else {
  console.log(JSON.stringify(summary));
}

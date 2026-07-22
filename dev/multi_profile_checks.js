#!/usr/bin/env node
/*
  Racine — garde-fous multi-profil.
  Objectif : empêcher qu'un profil neuf hérite des charges/références d'un
  autre utilisateur par injection implicite.
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function rel(p){ return path.join(root, p); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }
function exists(p){ return fs.existsSync(rel(p)); }
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

assert(exists('scripts/profiles/reference.js'), 'Module référence profil présent.');
assert(read('index.html').indexOf('scripts/profiles/reference.js') > read('index.html').indexOf('scripts/profiles/storage.js'), 'reference.js charge après storage.js.');
assert(read('index.html').indexOf('scripts/profiles/reference.js') < read('index.html').indexOf('scripts/profiles/onboarding.js'), 'reference.js charge avant onboarding.js.');
assert(read('index.html').indexOf('scripts/profiles/reference.js') < read('index.html').indexOf('programs/config.js'), 'reference.js charge avant programs/config.js.');

const app = read('app.js');
assert(/profile:\s*blankProfile\(\)/.test(app), 'freshState démarre avec un profil vide.');
assert(/movementRefs:\s*\{\}/.test(app), 'freshState démarre sans références de mouvement vivantes.');
assert(!app.includes('Object.assign(copy(PRELOADED_REFS)'), 'load() ne fusionne plus PRELOADED_REFS dans chaque profil.');
assert(!/rebuildRefsFromHistory\(\)[\s\S]*?copy\(PRELOADED_REFS\)/.test(app), 'rebuildRefsFromHistory ne réinjecte pas PRELOADED_REFS.');
assert(app.includes('liveMovementRefsFromPayload(p)'), 'Les movementRefs viennent du payload du profil, pas d’une banque globale.');

const onboarding = read('scripts/profiles/onboarding.js');
assert(onboarding.includes('RacineProfileReference.profile'), 'Onboarding utilise le référentiel neutre.');
assert(onboarding.includes('scaleRatios: computed.ratios'), 'Onboarding écrit les ratios dans le registre du profil.');
assert(onboarding.includes('blankProfile()'), 'Onboarding initialise un profil vide avant d’écrire ses valeurs.');

// Programme de départ : un profil neuf ne doit plus atterrir en dur sur
// shoulders3d (privé) — il démarre sur le programme choisi dans le formulaire,
// sinon sur le premier programme accessible.
assert(!/cycle:\s*\{\s*goal:\s*"shoulders3d"\s*\}/.test(app), 'freshState ne code plus shoulders3d en dur comme cycle par défaut.');
assert(app.includes('function defaultCycleGoal'), 'app.js expose un défaut de cycle accessible (defaultCycleGoal).');
assert(app.includes('cycle: { goal:defaultCycleGoal() }'), 'freshState démarre sur le programme par défaut accessible.');
assert(onboarding.includes('meta.programId'), 'Onboarding applique le programme choisi (meta.programId) comme cycle actif.');
const onboardingUi = read('scripts/profiles/ui.js');
assert(onboardingUi.includes('programChoiceOptionsHtml'), 'Le formulaire d’onboarding propose un choix de programme accessible.');
assert(/id="rrProgram"/.test(onboardingUi), 'Le formulaire d’onboarding contient le sélecteur de programme de départ.');
assert(onboardingUi.includes('wiz.meta.programId'), 'Le formulaire capture le programme choisi dans meta.programId.');

const scaling = read('scripts/charge/scaling.js');
assert(scaling.includes('profile.scaleRatios'), 'Le scaling lit les ratios du profil actif.');
assert(!/^\/\/ Coach Bertin/m.test(read('data/charges.js')), 'data/charges.js n’est plus présenté comme profil Bertin.');
assert(app.includes('CoachProfiles.reconcileActivePrivateProgramPermissions'), 'Le boot protège les cycles actifs devenus privés avant le filtrage.');

// Migration locale : un programme public devenu privé reste accessible au
// profil qui l'utilise déjà, sans modifier son state ni dupliquer la permission.
try{
  const mem = {};
  const localStorage = {
    getItem: key => Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null,
    setItem: (key, value) => { mem[key] = String(value); },
    removeItem: key => { delete mem[key]; }
  };
  mem.racineProfileRegistry = JSON.stringify({
    version:1,
    activeProfileId:'p_steph',
    profiles:[{id:'p_steph',name:'Stéphanie',onboarded:true,programPermissions:[]}]
  });
  const originalState = {
    cycle:{goal:'hypertrophie_fesse_stephanie'},
    week:4,
    day:'jeudi',
    history:[{id:'h1'}],
    athleteState:{movements:{}}
  };
  mem['racineState::p_steph'] = JSON.stringify(originalState);
  const storageCtx = {
    window:{
      COACH_BERTIN_PROGRAM_INDEX:[
        {id:'hypertrophie_fesse_stephanie',visibility:'private'},
        {id:'programme_public',visibility:'public'}
      ]
    },
    localStorage,
    console
  };
  storageCtx.window.window = storageCtx.window;
  vm.runInNewContext(read('scripts/profiles/storage.js'), storageCtx, {filename:'storage.js'});
  const profilesApi = storageCtx.window.CoachProfiles;
  assert(typeof profilesApi.reconcileActivePrivateProgramPermissions === 'function', 'Migration des cycles privés exposée.');
  assert(profilesApi.reconcileActivePrivateProgramPermissions() === true, 'La migration ajoute la permission du cycle privé actif.');
  assert(profilesApi.hasProgramPermission('p_steph','hypertrophie_fesse_stephanie'), 'Le profil conserve son programme Stéphanie.');
  assert(profilesApi.reconcileActivePrivateProgramPermissions() === false, 'La migration est idempotente.');
  const savedState = JSON.parse(mem['racineState::p_steph']);
  assert(JSON.stringify(savedState) === JSON.stringify(originalState), 'La migration ne modifie ni cycle, ni semaine, ni historique, ni charges.');
}catch(e){
  errors.push('Migration programme privé actif impossible : ' + (e && e.stack ? e.stack : e));
}

// Test dynamique minimal : un débutant bench 95x8 doit produire un ratio bas,
// pas une charge de départ avancée ou héritée.
try{
  const context = { window:{}, console:console };
  context.window.window = context.window;
  vm.runInNewContext(read('scripts/profiles/reference.js'), context, {filename:'reference.js'});
  context.RacineProfileReference = context.window.RacineProfileReference;
  vm.runInNewContext(read('scripts/profiles/onboarding.js'), context, {filename:'onboarding.js'});
  const api = context.window.CoachOnboarding;
  const computed = api.computeFromAnswers({
    squat:{weight:95,reps:8,rpe:8},
    bench:{weight:95,reps:8,rpe:8},
    press:{weight:55,reps:8,rpe:8},
    row:{weight:75,reps:8,rpe:8},
    hinge:{weight:95,reps:8,rpe:8}
  }, 'debutant');
  assert(computed && computed.values && computed.ratios, 'Onboarding calcule valeurs et ratios.');
  // V4.4.1 : le RPE entre dans l'estimation (95×8 @ RPE 8 = 2 reps en réserve
  // → 1RM ≈ 125). La borne haute suit, l'intention reste : proche du test
  // réel, jamais le bench de référence avancé (~275).
  assert(computed.values.bench > 90 && computed.values.bench < 135, 'Bench débutant reste proche du test réel, pas du bench de référence avancé.');
  // V4.5 « Athlète X » : référence équilibrée (bench 1RM 245 au lieu de 300).
  // Un débutant à 95×8 @ RPE 8 (e1RM ≈ 125) vaut ~0,51 de la référence — la
  // bande suit, l'intention reste : nettement sous la référence, jamais ≥ 1.
  assert(computed.ratios.bench > 0.35 && computed.ratios.bench < 0.62, 'Ratio bench débutant cohérent.');
  assert(computed.values.inclineDb10RM < 30, 'Incline DB dérivé reste débutant.');
}catch(e){
  errors.push('Simulation onboarding débutant impossible : ' + (e && e.stack ? e.stack : e));
}

if(errors.length){
  console.error('\nÉCHEC multi_profile_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK multi_profile_checks.js');
notes.forEach(n => console.log(' - ' + n));

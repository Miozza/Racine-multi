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

const scaling = read('scripts/charge/scaling.js');
assert(scaling.includes('profile.scaleRatios'), 'Le scaling lit les ratios du profil actif.');
assert(!/^\/\/ Coach Bertin/m.test(read('data/charges.js')), 'data/charges.js n’est plus présenté comme profil Bertin.');

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

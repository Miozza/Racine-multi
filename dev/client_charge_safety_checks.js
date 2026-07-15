#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message){ (condition ? notes : errors).push(message); }

function loadArnoldStrict(){
  const context = {window:{}};
  context.window.window = context.window;
  vm.runInNewContext(read('programs/arnold_split_strict.js'), context, {filename:'arnold_split_strict.js'});
  return context.window.COACH_BERTIN_PROGRAMS.arnold_split_strict;
}

function loadMovementProfiles(){
  const context = {window:{}};
  context.window.window = context.window;
  vm.runInNewContext(read('scripts/charge/movement_profiles.js'), context, {filename:'movement_profiles.js'});
  return context.window.CoachMovementProfiles;
}

function loadClientCatalog(){
  const context = {window:{}};
  context.window.window = context.window;
  vm.runInNewContext(read('programs/racine_client_programs.js'), context, {filename:'racine_client_programs.js'});
  return context.window.COACH_BERTIN_PROGRAMS;
}

function findProgramExercise(program, week, movementName){
  for(const day of program.days){
    const blocks = program.getBlocks(day, week);
    for(const block of blocks){
      const exercise = (block.exercises || []).find(item => item.name === movementName);
      if(exercise) return exercise;
    }
  }
  return null;
}

function loadChargeEngine(){
  const context = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN,
    setTimeout(fn){ if(typeof fn === 'function') fn(); },
    clearTimeout(){},
    document:{getElementById(){ return null; }},
    navigator:{},
    localStorage:{_s:{},getItem(key){return this._s[key] || null;},setItem(key,value){this._s[key]=String(value);},removeItem(key){delete this._s[key];}},
    APP_VERSION:'TEST',
    customCharges:{},
    DEFAULT_CHARGES:{'Back Squat':'165 lb','DB Shoulder Press':'100 lb'},
    CHARGE_ORDER:[],
    movements:{backSquat:{name:'Back Squat',profile:'backSquat5RM'}},
    state:{week:1,day:'lundi',profile:null,rpeHistory:{},athleteState:{movements:{}},history:[],movementRefs:{}},
    save(){},
    focus(){return {label:'test',targetReps:{0:8}};},
    buildWeekInfo(){return {};},
    weekIdx(){return 0;},
    collectSessionExercises(){return [];},
    parseTargetReps(format,fallback){return {min:fallback || 8,max:fallback || 8};}
  };
  context.window = context;
  context.globalThis = context;
  [
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
    'scripts/charge/suggestion.js'
  ].forEach(file => vm.runInNewContext(read(file), context, {filename:file}));
  return context;
}

try{
  const program = loadArnoldStrict();
  const monday = program.getBlocks('lundi', 1);
  const main = monday.find(block => block.title === 'A. Pecs + Dos A');
  const names = main && main.exercises ? main.exercises.map(exercise => exercise.name) : [];
  const latPulldown = main && main.exercises ? main.exercises.find(exercise => exercise.name === 'Lat Pulldown') : null;

  assert(names.filter(name => name === 'Pull-Up').length === 1, 'Arnold Pecs + Dos A garde exactement un Pull-Up.');
  assert(names.includes('Lat Pulldown'), 'Arnold Pecs + Dos A contient Lat Pulldown.');
  assert(!names.includes('Weighted Pull-up'), 'Arnold Pecs + Dos A ne contient plus Weighted Pull-up.');
  assert(latPulldown && /prise large/i.test(latPulldown.note || ''), 'Lat Pulldown mentionne explicitement la prise large.');

  const config = read('programs/config.js');
  assert(/latPulldown\s*:\s*\{name:\s*"Weighted pull-up"/.test(config), 'Weighted Pull-up reste enregistré dans programs/config.js.');
  assert(/latPulldownWide\s*:\s*\{name:\s*"Lat Pulldown"/.test(config), 'Lat Pulldown possède une entrée distincte dans programs/config.js.');

  const tutorials = read('programs/tutorials.js');
  assert(/"Lat Pulldown"\s*:\s*\{/.test(tutorials), 'Lat Pulldown possède un tutoriel exact partagé.');

  const media = read('data/movements_media.js');
  assert(/"Weighted Pull-up"\s*:\s*"[A-Za-z0-9_-]+"/.test(media), 'Weighted Pull-up conserve son média distinct.');
  assert(/"Lat Pulldown"\s*:\s*"[A-Za-z0-9_-]+"/.test(media), 'Lat Pulldown possède un média distinct.');

  const equipment = read('data/equipment.js');
  assert(/match:\[[^\]]*"lat pulldown"/.test(equipment), 'Lat Pulldown reste classé comme équipement câble.');

  const profiles = loadMovementProfiles();
  assert(profiles.get('Lat Pulldown').family === 'cable_pull', 'Lat Pulldown utilise un profil Brain câble distinct.');
  assert(profiles.get('Weighted Pull-up').family === 'bodyweight_heavy', 'Weighted Pull-up conserve son profil poids du corps lesté.');
}catch(error){
  errors.push('Test Arnold/Lat Pulldown impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  const engine = loadChargeEngine();
  assert(engine.canonicalMovementLabel('Lat Pulldown') === 'Lat Pulldown', 'Le moteur normalise Lat Pulldown sous son nom stable.');
  assert(engine.coachMovementEquipmentFamily('Lat Pulldown') === 'cable', 'Le moteur classe Lat Pulldown dans la famille câble.');
  assert(engine.canonicalMovementLabel('Weighted Pull-up') === 'Weighted Pull-up', 'Weighted Pull-up garde son nom stable distinct.');
  assert(engine.coachMovementEquipmentFamily('Weighted Pull-up') === 'bodyweight', 'Weighted Pull-up garde sa famille poids du corps distincte.');
  assert(typeof engine.coachProfileNeedsCalibration === 'function', 'Le moteur expose coachProfileNeedsCalibration.');
  engine.state.profile = {onboarded:false, scaleRatios:null};
  const blocked = engine.guardedSuggestedLoadDecision('Back Squat', '165 lb', 8, {});
  assert(blocked && blocked.blocked === true, 'Un profil client non calibré est bloqué.');
  assert(blocked && blocked.loadNum === null && !/\d+\s*lb/.test(blocked.loadText || ''), 'Le blocage ne présente aucune charge numérique comme fiable.');
  assert(blocked && /Profil non calibré/.test(blocked.loadText || ''), 'Le blocage explique que le profil doit être calibré.');

  engine.state.profile = {scaleRatios:{_lowerBody:0.8,_overall:0.9}};
  engine.CoachProfiles = {getActive(){ return {onboarded:true}; }};
  const calibrated = engine.guardedSuggestedLoadDecision('Back Squat', '165 lb', 8, {});
  assert(calibrated && calibrated.blocked !== true, 'Un profil calibré dans le registre n’est pas bloqué si state.profile ne répète pas onboarded.');

  engine.state.profile = null;
  delete engine.CoachProfiles;
  assert(typeof engine.coachProfileNeedsCalibration === 'function' && engine.coachProfileNeedsCalibration() === false, 'Une migration ancienne sans profil garde le ratio neutre compatible.');
}catch(error){
  errors.push('Test profil non calibré impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  // Régression : un profil réel onboardé (registre ET state.profile.onboarded)
  // peut perdre sa copie locale de scaleRatios (migration partielle, state
  // namespacé désynchronisé) sans jamais avoir été « non calibré ». Le
  // registre garde sa copie de scaleRatios (écrite en parallèle par
  // applyToActiveProfile) : elle doit resynchroniser au lieu de bloquer.
  const engine = loadChargeEngine();
  engine.state.profile = {onboarded:true, scaleRatios:null};
  engine.CoachProfiles = {getActive(){ return {onboarded:true, scaleRatios:{_lowerBody:0.95,_overall:0.97}}; }};
  let saved = 0;
  engine.save = function(){ saved++; };
  const decision = engine.guardedSuggestedLoadDecision('Back Squat', '165 lb', 8, {});
  assert(decision && decision.blocked !== true, 'Un profil onboardé dont seul le registre garde scaleRatios n’est pas bloqué.');
  assert(engine.state.profile.scaleRatios && engine.state.profile.scaleRatios._overall === 0.97, 'Le state.profile local est resynchronisé depuis le registre.');
  assert(saved === 1, 'La resynchronisation est sauvegardée une seule fois, pas à chaque appel.');
}catch(error){
  errors.push('Test resynchronisation scaleRatios impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  const engine = loadChargeEngine();
  engine.state.profile = {onboarded:true,scaleRatios:{_upperPush:0.2,_lowerBody:1,_overall:1}};
  const lightRow = {load:10,reps:10,rpe:8};
  const badRow = {load:5,reps:8,rpe:8};
  const badRef = {movement:'Back Squat',load:5,reps:8,rpe:8};
  engine.state.history = [{results:{'DB Shoulder Press':lightRow,'Back Squat':badRow}}];
  engine.state.movementRefs = {'Back Squat':badRef};
  engine.coachSanitizeImplausibleLoads();

  assert(lightRow.load === 10 && !lightRow.implausible, 'Une charge réelle légère reste plausible après scaling du seed.');
  assert(badRow.load === 5 && badRow.implausible === true, 'Une erreur évidente est conservée et marquée dans l’historique.');
  assert(badRef.load === 5 && badRef.implausible === true, 'Une référence évidente est conservée et marquée.');

  const warnings = [];
  engine.coachLogWarn = function(code){ warnings.push(code); };
  engine.state.athleteState = {movements:{'DB Shoulder Press':{history:[{load:10,reps:10,rpe:8,status:'success'}],ranges:{}}}};
  engine.guardedSuggestedLoadDecision('DB Shoulder Press','100 lb',10,{});
  assert(!warnings.includes('plausibility_filter'), 'Le filtre de suggestion compare aussi l’historique au seed scalé.');
}catch(error){
  errors.push('Test plausibilité non destructive impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  // Régression : une charge invraisemblable dans athleteState.movements[...].history
  // (typo de saisie, ex. 5 lb au lieu de 205 lb) ne doit pas seulement être
  // ignorée par guardedSuggestedLoadDecision ; elle doit aussi être ignorée par
  // le moteur Brain V1.16 (coachSafeSuggestedLoad, celui réellement affiché
  // dans l'app via CoachCharge.suggestLoad), sinon la typo redevient la base
  // de la moyenne mobile / tendance affichée à l'utilisateur.
  const engine = loadChargeEngine();
  engine.state.profile = {onboarded:true, scaleRatios:{_lowerBody:1,_overall:1}};
  engine.state.athleteState = {movements:{'Back Squat':{ranges:{}, history:[
    {date:'2026-06-01', load:195, reps:8, rpe:7, range:'hypertrophy', status:'success', planned:{source:'session'}},
    {date:'2026-06-08', load:200, reps:8, rpe:7, range:'hypertrophy', status:'success', planned:{source:'session'}},
    {date:'2026-06-15', load:205, reps:8, rpe:7, range:'hypertrophy', status:'success', planned:{source:'session'}},
    {date:'2026-06-22', load:5,   reps:8, rpe:7, range:'hypertrophy', status:'success', planned:{source:'session'}}
  ]}}};
  const brainShown = engine.coachSafeSuggestedLoad('Back Squat', '205 lb', 8, {});
  assert(!/^5\s*lb/.test(brainShown), 'coachSafeSuggestedLoad n’affiche pas la typo (5 lb) comme suggestion.');
  assert(/2\d\d\s*lb/.test(brainShown), 'coachSafeSuggestedLoad se base sur les vraies séances (~205-210 lb), pas sur la typo.');
}catch(error){
  errors.push('Test vraisemblance moteur Brain impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  const engine = loadChargeEngine();
  engine.state.profile = null;
  const realA = {date:'2026-07-01',load:100,reps:8,rpe:8,range:'hypertrophy',status:'success',planned:{source:'session'}};
  const realB = {date:'2026-07-08',load:105,reps:8,rpe:8,range:'hypertrophy',status:'success',planned:{source:'session'}};
  const override = {date:'2026-07-09',load:200,reps:8,rpe:8,range:'hypertrophy',status:'success',planned:{source:'manual_charge_override'}};

  assert(typeof engine.coachIsNonPerformanceSeed === 'function', 'Le moteur expose coachIsNonPerformanceSeed.');
  const filtered = engine.coachFilterHistoryForProgression([realA,realB,override], null);
  assert(filtered.length === 2 && !filtered.includes(override), 'La progression exclut manual_charge_override.');

  engine.state.athleteState = {movements:{'Bench Press':{history:[realA,realB,override],ranges:{hypertrophy:{currentLoad:200,planned:{source:'manual_charge_override'}}}}}};
  const decision = engine.guardedSuggestedLoadDecision('Bench Press','105 lb',8,{});
  assert(decision.loadNum < 150, 'La décision utilise les vraies séances, pas l’override à 200 lb.');

  const statsWithOverride = engine.coachBrainBuildStats('Bench Press',[realA,realB,override],{},8,110,105);
  const statsWithoutOverride = engine.coachBrainBuildStats('Bench Press',[realA,realB],{},8,110,105);
  assert(JSON.stringify(statsWithOverride) === JSON.stringify(statsWithoutOverride), 'Brain produit les mêmes statistiques avec ou sans override manuel.');

  assert(typeof engine.resetManualChargeOverridesFromAthleteState === 'function', 'Le moteur expose le nettoyage ciblé des overrides.');
  if(typeof engine.resetManualChargeOverridesFromAthleteState === 'function') engine.resetManualChargeOverridesFromAthleteState();
  const movement = engine.state.athleteState.movements['Bench Press'];
  assert(movement.history.length === 2 && movement.history.includes(realA) && movement.history.includes(realB), 'Le reset conserve toutes les vraies séances.');
  assert(!movement.ranges.hypertrophy, 'Le reset neutralise la capacité issue d’un override manuel.');
  assert(/resetManualChargeOverridesFromAthleteState\(\)/.test(read('app.js')), 'resetCustomCharges appelle le nettoyage ciblé des overrides.');
}catch(error){
  errors.push('Test override manuel impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  const engine = loadChargeEngine();
  assert(typeof engine.coachFormatSuggestedLoad === 'function', 'Le moteur expose un formatteur final unique.');
  if(typeof engine.coachFormatSuggestedLoad === 'function'){
    assert(engine.coachFormatSuggestedLoad('DB RDL',40,'50 lb / main','') === '40 lb / main', 'Une charge DB conserve / main.');
    assert(engine.coachFormatSuggestedLoad('KB Swing',24,'24 kg','') === '24 kg', 'Une charge en kg conserve son unité.');
    assert(/poids du corps/i.test(engine.coachFormatSuggestedLoad('Pull-Up',0,'poids du corps','')), 'Une charge bodyweight conserve poids du corps.');
    assert(/× 11 reps/.test(engine.coachFormatSuggestedLoad('Incline DB Press',40,'35 lb / main',' × 11 reps')), 'Le formatteur conserve la suggestion de reps.');
    assert(/⚠/.test(engine.coachFormatSuggestedLoad('Incline DB Press',40,'35 lb / main ⚠','')), 'Le formatteur conserve les avertissements.');
  }
  const suggestionSource = read('scripts/charge/suggestion.js');
  assert(!/return String\((?:newLoad|deloadRounded)\)/.test(suggestionSource), 'Aucun chemin Brain ne retourne un nombre nu.');
  assert(!/loadText\s*:\s*String\(newLoad\)/.test(suggestionSource), 'Les décisions Brain utilisent le formatteur final.');
}catch(error){
  errors.push('Test format final impossible : ' + (error && error.stack ? error.stack : error));
}

try{
  const catalog = loadClientCatalog();
  const program = catalog.client_hypertrophy_5d;
  const engine = loadChargeEngine();
  engine.state.profile = null;

  ['Bench Press','Barbell Row','Front Squat'].forEach(name => {
    const week1 = findProgramExercise(program, 1, name);
    const week5 = findProgramExercise(program, 5, name);
    assert(week1 && week5, 'client_hypertrophy_5d expose ' + name + ' en S1 et S5.');
    if(week1 && week5){
      assert(week1.load !== week5.load, name + ' garde une charge de programme différente entre S1 et S5.');
      const shown1 = engine.coachSafeSuggestedLoad(name, week1.load, 8, {});
      const shown5 = engine.coachSafeSuggestedLoad(name, week5.load, 8, {});
      assert(shown1 !== shown5, name + ' traverse CoachCharge sans être écrasé par DEFAULT_CHARGES.');
    }
  });

  const source = read('programs/racine_client_programs.js');
  const exBody = source.match(/function ex\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/);
  assert(exBody && !/\bcharge\s*\(/.test(exBody[1]), 'Le helper ex() client ne rappelle jamais charge().');

  const allBlocks = program.days.flatMap(day => program.getBlocks(day, 1));
  assert(!allBlocks.some(block => Array.isArray(block.progress) && block.progress.length), 'Le programme client n’utilise pas le chemin legacy b.progress.');
}catch(error){
  errors.push('Test périodisation client impossible : ' + (error && error.stack ? error.stack : error));
}

if(errors.length){
  console.error('\nÉCHEC client_charge_safety_checks.js');
  errors.forEach(error => console.error(' - ' + error));
  process.exit(1);
}

console.log('OK client_charge_safety_checks.js');
notes.forEach(note => console.log(' - ' + note));




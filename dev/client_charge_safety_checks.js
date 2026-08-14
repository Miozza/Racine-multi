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
    'scripts/charge/movement_tuning.js',
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
  // Sans table de niveaux disponible, aucun repère n'existe : le blocage reste
  // le comportement sûr. Le moteur n'invente jamais un ratio.
  engine.state.profile = {onboarded:false, scaleRatios:null};
  const blocked = engine.guardedSuggestedLoadDecision('Back Squat', '165 lb', 8, {});
  assert(blocked && blocked.blocked === true, 'Sans repère de niveau, un profil non calibré est bloqué.');
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

// ── Profil non calibré : estimation de niveau plutôt que blocage ───────────
// Un profil sans ratios de test n'est pas un profil sans information : son
// NIVEAU déclaré donne une estimation grossière mais bornée. Le danger n'a
// jamais été l'absence de calibration — c'était l'ancien repli « ratio 1 », qui
// servait la charge de l'athlète de référence (Back Squat 315) à un débutant.
// Ce test verrouille les trois propriétés : une charge sort, elle est bornée
// par le niveau, et elle ne se présente jamais comme une capacité mesurée.
try{
  const engine = loadChargeEngine();
  // La VRAIE table de niveaux, chargée depuis son propriétaire. Si le moteur
  // recopiait les seuils au lieu de les lire, la mutation de ce fichier ne se
  // verrait pas ici.
  vm.runInNewContext(read('scripts/profiles/reference.js'), engine, {filename:'reference.js'});
  vm.runInNewContext(read('scripts/profiles/onboarding.js'), engine, {filename:'onboarding.js'});
  const levels = engine.CoachOnboarding && engine.CoachOnboarding.EXPERIENCE_LEVELS;
  assert(levels && levels.debutant && levels.avance, 'La table des niveaux est lisible par le moteur.');

  const PROGRAMME = 165;   // « 165 lb » = %1RM de l'athlète de référence
  function suggereFor(level){
    engine.state.profile = {onboarded:false, scaleRatios:null, experienceLevel:level};
    return engine.guardedSuggestedLoadDecision('Back Squat', PROGRAMME + ' lb', 8, {});
  }

  const debutant = suggereFor('debutant');
  assert(debutant && debutant.blocked !== true, 'Un profil non calibré reçoit une charge au lieu d’une phrase.');
  assert(debutant && debutant.loadNum > 0, 'Cette charge est un nombre exploitable.');
  assert(!/Profil non calibré/.test(debutant.loadText || ''),
    'La phrase de blocage ne s’affiche plus à la place de la charge.');

  // Bornes, pas égalité au pixel : l'arrondi équipement s'applique après.
  const attenduDebutant = PROGRAMME * levels.debutant.fallbackRatio;
  assert(Math.abs(debutant.loadNum - attenduDebutant) <= 10,
    'Débutant : la charge suit le repère de son niveau (' + debutant.loadNum + ' lb pour ~' + Math.round(attenduDebutant) + ').');
  assert(debutant.loadNum < PROGRAMME,
    'Débutant : JAMAIS la charge de l’athlète de référence — c’est ce qui rendait l’ancien repli dangereux.');

  const avance = suggereFor('avance');
  assert(avance.loadNum > debutant.loadNum,
    'Un avancé reçoit plus lourd qu’un débutant : le niveau déclaré pèse réellement.');
  assert(avance.loadNum <= PROGRAMME * levels.avance.fallbackRatio + 10,
    'Avancé : le repère plafonne au niveau de l’athlète de référence, il ne le dépasse pas.');

  const intermediaire = suggereFor('intermediaire');
  assert(intermediaire.loadNum > debutant.loadNum && intermediaire.loadNum < avance.loadNum,
    'Les trois niveaux restent ordonnés : débutant < intermédiaire < avancé.');

  // Niveau absent ou inconnu : repli sur intermédiaire, comme ratiosFromValues.
  const sansNiveau = suggereFor(undefined);
  assert(sansNiveau.loadNum === intermediaire.loadNum,
    'Un profil sans niveau déclaré est traité comme intermédiaire, jamais comme l’athlète de référence.');

  // Marquage : une estimation ne se présente jamais comme une mesure.
  [debutant, intermediaire, avance].forEach(d => {
    assert(d.severity !== 'ok',
      'Une estimation de niveau sort en surveillance, jamais en « ok » : ce n’est pas une capacité mesurée.');
    assert(/non calibré/i.test(d.reason || ''),
      'La raison lue par le bouton (!) dit que le profil n’est pas calibré.');
  });

  // Le profil reste non calibré : l'app doit pouvoir continuer d'inviter à
  // calibrer. Une estimation ne vaut pas une calibration.
  engine.state.profile = {onboarded:false, scaleRatios:null, experienceLevel:'debutant'};
  assert(engine.coachProfileNeedsCalibration() === true,
    'Recevoir une estimation ne fait pas passer le profil pour calibré.');

  // Un profil calibré n'est pas touché par ce chemin.
  engine.state.profile = {scaleRatios:{_lowerBody:0.9,_overall:0.9}, experienceLevel:'debutant'};
  engine.CoachProfiles = {getActive(){ return {onboarded:true}; }};
  const calibre = engine.guardedSuggestedLoadDecision('Back Squat', PROGRAMME + ' lb', 8, {});
  assert(Math.abs(calibre.loadNum - PROGRAMME * 0.9) <= 10,
    'Un profil calibré garde ses ratios de test : le niveau déclaré ne les écrase pas.');
  assert(!/non calibré/i.test(calibre.reason || ''),
    'Un profil calibré n’est jamais marqué comme estimation de niveau.');

  // Le clamp de bande couvre AUSSI ce chemin. Les trois niveaux réels
  // (0.45 / 0.75 / 1.00) tombent déjà dans [0.25, 1.6], donc rien ne le
  // prouverait sans un seuil hors bande : c'est exactement le scénario du
  // Deadlift à 600 lb, mais par le repère de niveau au lieu des ratios stockés.
  engine.CoachOnboarding.EXPERIENCE_LEVELS.absurde = {label:'Test', fallbackRatio:4.0};
  engine.state.profile = {onboarded:false, scaleRatios:null, experienceLevel:'absurde'};
  delete engine.CoachProfiles;
  const horsBande = engine.guardedSuggestedLoadDecision('Back Squat', PROGRAMME + ' lb', 8, {});
  assert(horsBande.loadNum <= PROGRAMME * 1.6 + 10,
    'Un repère de niveau hors bande est borné comme n’importe quel ratio (' + horsBande.loadNum + ' lb, pas ' + (PROGRAMME * 4) + ').');
  delete engine.CoachOnboarding.EXPERIENCE_LEVELS.absurde;

  const scaling = read('scripts/charge/scaling.js');
  assert(/CoachOnboarding/.test(scaling) && !/fallbackRatio\s*[:=]\s*0?\.\d/.test(scaling),
    'Le moteur LIT la table des niveaux, il ne recopie pas ses seuils.');
}catch(error){
  errors.push('Test estimation de niveau impossible : ' + (error && error.stack ? error.stack : error));
}

// ── Côté affichage du même contrat ─────────────────────────────────────────
// Le blocage renvoie une PHRASE de 88 caractères. La fente « Poids » de la
// séance guidée est dimensionnée pour « 185 lb » (41 px sur iPhone) : la phrase
// s'y enroulait sur huit lignes et recouvrait la carte entière, jusqu'à masquer
// les champs de saisie. Le message doit sortir de cette fente — sans jamais y
// faire sortir une vraie charge, sinon le contrat de lisibilité s'inverse.
try{
  const sandbox = {console:{log(){},warn(){},error(){}}};
  sandbox.window = sandbox;
  vm.runInNewContext(read('scripts/app_helpers.js'), sandbox, {filename:'app_helpers.js'});
  const isMessage = sandbox.coachLoadIsMessage;
  assert(typeof isMessage === 'function', 'Les vues savent distinguer une charge d’un message.');

  // Profil calibré : tout ce que le moteur renvoie reste une charge.
  sandbox.coachProfileNeedsCalibration = () => false;
  ['185 lb', '185 lb ↑', 'poids du corps', '40-45 lb / main', '0-20 lb', '≈60 % du cycle précédent',
   '185 → 205 → 215 → 225 si autorisé']
    .forEach(v => assert(isMessage(v) === false, 'Charge réelle affichée dans la fente Poids : ' + v));
  assert(isMessage('') === false && isMessage(null) === false, 'Une charge absente n’est pas traitée comme un message.');

  // La plus longue charge réelle du catalogue fait 33 caractères : le filet de
  // sécurité doit se déclencher au-dessus, pas dessus.
  assert(isMessage('x'.repeat(34)) === false, 'Le filet ne se déclenche pas sur une charge longue mais plausible.');
  assert(isMessage('x'.repeat(60)) === true, 'Un texte trop long pour être une charge est traité comme un message.');

  // Le message résiduel du moteur (aucun repère de niveau disponible) sort de
  // la fente Poids par sa seule longueur.
  assert(isMessage('Profil non calibré : complète la calibration avant d’utiliser les charges suggérées.') === true,
    'Le message de calibration ne s’affiche pas dans la fente dimensionnée pour « 185 lb ».');
  // Contrepartie indispensable : l'estimation de niveau servie à un profil NON
  // calibré est une vraie charge et doit rester dans sa fente. Une version
  // antérieure de ce test liait l'affichage à l'état du profil et écartait ces
  // 75 lb — c'est ce que cette assertion empêche de revenir.
  sandbox.coachProfileNeedsCalibration = () => true;
  assert(isMessage('75 lb') === false,
    'Profil non calibré : l’estimation de niveau reste affichée comme une charge, pas comme un message.');

  const source = read('scripts/session/view.js');
  assert(/coachLoadIsMessage\(e\.load\)/.test(source),
    'La liste d’exercices consulte bien ce test avant d’écrire dans la fente Poids.');
  assert(/guided-load-message/.test(source) && /guided-load-message/.test(read('styles.css')),
    'Le message a sa propre fente, stylée en texte courant.');
  // Même défaut, même cause, sur la vue WOD+ : la charge y est réglée à 31 px.
  const wodplus = read('scripts/view_wodplus.js');
  assert(/coachLoadIsMessage\(shown\)/.test(wodplus),
    'WOD+ consulte le même test avant d’écrire dans sa boîte de charge.');
  assert(wodplus.indexOf('coachLoadIsMessage(shown)') < wodplus.indexOf('wodplus-loadbox'),
    'WOD+ écarte le message AVANT de choisir la boîte de charge, pas après.');
  // Commentaires retirés : ils CITENT le message, ils ne le produisent pas.
  const code = source.split('\n')
    .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .map(line => line.replace(/\/\/.*$/, '')).join('\n');
  assert(!/Profil non calibré/.test(code),
    'La vue ne recopie pas le texte du moteur : une seule formulation, celle du moteur.');
}catch(error){
  errors.push('Test affichage d’un message de charge impossible : ' + (error && error.stack ? error.stack : error));
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




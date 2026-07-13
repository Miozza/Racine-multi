#!/usr/bin/env node
/*
  Racine — garde-fous remplacements de mouvements par profil.
  Objectif : les remplacements coach→client ne doivent jamais muter les
  templates de programmes ni fuiter d'un profil à l'autre.
  Voir docs/IDEES_FUTURES.md (idée 1) et scripts/profiles/swaps.js.
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

// Câblage statique.
assert(read('index.html').indexOf('scripts/profiles/swaps.js') !== -1, 'swaps.js chargé par index.html.');
assert(read('programs/workouts.js').indexOf('RacineMovementSwaps') !== -1, 'buildWorkout applique les remplacements (hook unique).');
const src = read('scripts/profiles/swaps.js');
assert(src.indexOf('Object.assign({}, b)') !== -1 && src.indexOf('Object.assign({}, e)') !== -1,
  'applyToWorkout copie blocs et exercices (pas de mutation des templates).');
// La logique ne doit pas vivre dans programs/ : le hook doit rester une délégation.
assert(read('programs/workouts.js').indexOf('movementSwaps') === -1, 'programs/workouts.js ne lit pas movementSwaps directement.');

// Test dynamique.
try{
  const ctx = { window:{}, console:console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, {filename:'swaps.js'});
  const api = ctx.window.RacineMovementSwaps;

  // Profil actif avec un remplacement.
  ctx.state = { movementSwaps: [{from:'Bench Press', to:'DB Bench Press', note:'épaule sensible'}] };
  const block = {
    title:'Force',
    exercises:[{name:'Bench Press', note:'tempo 31X1'}, {name:'Front Squat'}],
    text:'3x8 Bench Press puis accessoires'
  };
  const w = api.applyToWorkout({day:{}, blocks:[block], progress:[]});
  assert(w.blocks[0].exercises[0].name === 'DB Bench Press', 'Nom remplacé dans exercises.');
  assert(w.blocks[0].exercises[0].note.indexOf('Remplace « Bench Press »') !== -1, 'Note de remplacement visible.');
  assert(w.blocks[0].exercises[0].note.indexOf('épaule sensible') !== -1, 'Note du coach conservée.');
  assert(w.blocks[0].exercises[1].name === 'Front Squat', 'Autres mouvements intacts.');
  assert(w.blocks[0].text.indexOf('DB Bench Press') !== -1, 'Texte de bloc remplacé.');
  // Le template original ne doit JAMAIS être muté.
  assert(block.exercises[0].name === 'Bench Press', 'Template : nom d’origine intact.');
  assert(block.exercises[0].note === 'tempo 31X1', 'Template : note d’origine intacte.');
  assert(block.text.indexOf('DB Bench Press') === -1, 'Template : texte d’origine intact.');

  // Application idempotente (double passage = même résultat, pas de note dupliquée).
  const w2 = api.applyToWorkout(w);
  assert(w2.blocks[0].exercises[0].note.split('Remplace').length === 2, 'Pas de note dupliquée au double passage.');

  // Sans remplacement (autre profil) : rien ne change.
  ctx.state = { movementSwaps: [] };
  const w3 = api.applyToWorkout({day:{}, blocks:[block], progress:[]});
  assert(w3.blocks[0].exercises[0].name === 'Bench Press', 'Sans remplacement, la séance est inchangée.');

  // CRUD sur profil NON actif : écriture isolée dans sa clé localStorage.
  const store = {};
  ctx.localStorage = {
    getItem:k => (k in store ? store[k] : null),
    setItem:(k,v) => { store[k] = String(v); },
    removeItem:k => { delete store[k]; }
  };
  ctx.window.CoachProfiles = ctx.CoachProfiles = {
    getActiveId: function(){ return 'p_actif'; },
    storageKeysFor: function(id){ return { state:'racineState::'+id, charges:'racineCharges::'+id }; }
  };
  let r = api.add('p_client', 'Back Squat', 'Goblet Squat', 'genou');
  assert(r.ok, 'Ajout d’un remplacement sur profil non actif.');
  assert(api.listFor('p_client').length === 1, 'Remplacement listé pour le bon profil.');
  assert(JSON.parse(store['racineState::p_client']).movementSwaps[0].to === 'Goblet Squat', 'Écrit dans la clé du profil cible.');
  assert(!store['racineState::p_actif'], 'Aucune fuite vers le profil actif.');
  r = api.add('p_client', 'Back Squat', 'Back Squat', '');
  assert(!r.ok, 'Refus si remplaçant identique à l’origine.');
  r = api.add('p_client', '', 'X', '');
  assert(!r.ok, 'Refus si champ manquant.');
  api.remove('p_client', 'back squat');
  assert(api.listFor('p_client').length === 0, 'Retrait insensible à la casse — retour au programme.');

  // Catalogue de mouvements : programme du profil ciblé en premier, puis
  // sources canoniques (vidéos/tutos/config), dédupliqué.
  ctx.window.focusConfigs = {
    prog_test: { getBlocks: function(day, week){
      return day === 'lundi' ? [{exercises:[{name:'Bench Press'}, {name: week === 2 ? 'Pendlay Row' : 'Barbell Row'}]}] : [];
    }}
  };
  ctx.window.COACH_BERTIN_PROGRAMS = { prog_test: { days:['lundi'] } };
  ctx.window.COACH_BERTIN_PROGRAM_INDEX = [{ id:'prog_test', durationWeeks:2 }];
  ctx.window.COACH_BERTIN_MOVEMENT_VIDEOS = { 'Front Squat':'x', 'Bench Press':'y' };
  ctx.window.COACH_BERTIN_TUTORIALS = { 'Ring Row': {} };
  store['racineState::p_client'] = JSON.stringify({ cycle:{ goal:'prog_test' } });
  const cat = api.movementCatalog('p_client');
  assert(cat.program.indexOf('Bench Press') !== -1 && cat.program.indexOf('Barbell Row') !== -1, 'Catalogue : mouvements du programme du profil présents.');
  assert(cat.program.indexOf('Pendlay Row') !== -1, 'Catalogue : rotation hebdo couverte (toutes les semaines balayées).');
  assert(cat.others.indexOf('Front Squat') !== -1 && cat.others.indexOf('Ring Row') !== -1, 'Catalogue : sources vidéos/tutos incluses.');
  assert(cat.others.indexOf('Bench Press') === -1, 'Catalogue : pas de doublon programme/catalogue.');
  assert(read('scripts/profiles/admin_programs.js').indexOf('movementCatalog') !== -1, 'UI admin : sélection par liste branchée sur le catalogue.');
  assert(read('scripts/profiles/admin_programs.js').indexOf('canonicalMovement') !== -1, 'UI admin : nom exact exigé avant ajout.');
}catch(e){
  errors.push('Simulation remplacements impossible : ' + (e && e.stack ? e.stack : e));
}

if(errors.length){
  console.error('\nÉCHEC movement_swaps_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK movement_swaps_checks.js');
notes.forEach(n => console.log(' - ' + n));

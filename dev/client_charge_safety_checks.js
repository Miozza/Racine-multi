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
  assert(/latPulldown\s*:\s*\{name:\s*"Weighted pull-up"/.test(config), 'Weighted Pull-up reste enregistrÃ© dans programs/config.js.');
  assert(/latPulldownWide\s*:\s*\{name:\s*"Lat Pulldown"/.test(config), 'Lat Pulldown possÃ¨de une entrÃ©e distincte dans programs/config.js.');

  const tutorials = read('programs/tutorials.js');
  assert(/"Lat Pulldown"\s*:\s*\{/.test(tutorials), 'Lat Pulldown possÃ¨de un tutoriel exact partagÃ©.');

  const profiles = loadMovementProfiles();
  assert(profiles.get('Lat Pulldown').family === 'cable_pull', 'Lat Pulldown utilise un profil Brain cÃ¢ble distinct.');
  assert(profiles.get('Weighted Pull-up').family === 'bodyweight_heavy', 'Weighted Pull-up conserve son profil poids du corps lestÃ©.');
}catch(error){
  errors.push('Test Arnold/Lat Pulldown impossible : ' + (error && error.stack ? error.stack : error));
}

if(errors.length){
  console.error('\nÃ‰CHEC client_charge_safety_checks.js');
  errors.forEach(error => console.error(' - ' + error));
  process.exit(1);
}

console.log('OK client_charge_safety_checks.js');
notes.forEach(note => console.log(' - ' + note));


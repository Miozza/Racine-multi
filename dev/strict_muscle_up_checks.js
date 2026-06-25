#!/usr/bin/env node
// Racine V1.6 — tests qualité cycle Strict Muscle-Up.
// Vérifie que le cycle est structuré, progressif, sécuritaire et non bâclé.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function assert(condition, message){
  if(!condition){
    console.error('❌ ' + message);
    process.exit(1);
  }
  console.log('✅ ' + message);
}
function textOf(value){ return JSON.stringify(value); }

const context = { window:{}, console };
context.window.COACH_BERTIN_PROGRAMS = {};
vm.createContext(context);
vm.runInContext(read('programs/index.js'), context, {filename:'programs/index.js'});
vm.runInContext(read('programs/strict_muscle_up_cycle.js'), context, {filename:'programs/strict_muscle_up_cycle.js'});

const index = context.window.COACH_BERTIN_PROGRAM_INDEX || [];
const programs = context.window.COACH_BERTIN_PROGRAMS || {};
const meta = index.find(x => x.id === 'strict_muscle_up_10w');
const p = programs.strict_muscle_up_10w;

assert(!!meta, 'Le programme strict_muscle_up_10w est déclaré dans index.js.');
assert(meta.durationWeeks === 10 && meta.minWeeks === 10 && meta.maxWeeks === 10, 'Le cycle est fixé à 10 semaines.');
assert(meta.macroRole === 'specialized_cycle', 'Le cycle est classé comme cycle spécialisé, pas catalogue générique.');
assert(!!p, 'Le programme strict_muscle_up_10w est chargé.');
assert(p.weeks === 10, 'Le programme annonce 10 semaines.');
assert(Array.isArray(p.days) && p.days.length === 4, 'Le programme utilise exactement 4 jours/semaine.');
assert(p.days.join(',') === 'lundi,mardi,jeudi,vendredi', 'Le cycle respecte une structure lundi/mardi/jeudi/vendredi.');
assert(Array.isArray(p.weekLabels) && p.weekLabels.length === 10, 'Le cycle possède 10 labels de semaines.');
assert(Array.isArray(p.weekGoals) && p.weekGoals.length === 10, 'Le cycle possède 10 objectifs de semaine.');
assert(typeof p.getBlocks === 'function', 'Le cycle fournit getBlocks().');

for(let week=1; week<=10; week++){
  p.days.forEach(day => {
    const blocks = p.getBlocks(day, week);
    assert(Array.isArray(blocks) && blocks.length >= 4, `S${week} ${day} retourne une séance complète.`);
    assert(blocks.some(b => b.kind === 'main'), `S${week} ${day} contient un bloc principal.`);
  });
}

const source = read('programs/strict_muscle_up_cycle.js');
[
  'Weighted Pull-Up strict',
  'False Grip Ring Row',
  'False Grip Hang',
  'Low Ring Transition Drill',
  'Seated Strict Muscle-Up Transition',
  'Strict Ring Dip',
  'Ring Support Hold',
  'Slow Negative Muscle-Up',
  'Strict Muscle-Up',
  'Cable External Rotation',
  'Trap-3 Raise'
].forEach(term => assert(source.includes(term), 'Le cycle contient le mouvement clé : ' + term + '.'));

assert(/Kipping|kipping/.test(source) && /interdit|interdits/.test(source), 'Le cycle interdit explicitement le kipping.');
assert(/Douleur coude\/épaule >2\/10/.test(source), 'Le cycle contient une règle douleur coude/épaule.');
assert(/Semaines 4 et 8/.test(source), 'Le cycle force des déloads/checkpoints en S4 et S8.');
assert(/Tester seulement si les critères sont verts/.test(source), 'Le test final est conditionnel aux critères de sécurité.');

const s1Pull = textOf(p.getBlocks('lundi', 1));
const s2Pull = textOf(p.getBlocks('lundi', 2));
const s4Friday = textOf(p.getBlocks('vendredi', 4));
const s8Friday = textOf(p.getBlocks('vendredi', 8));
const s10Friday = textOf(p.getBlocks('vendredi', 10));
assert(s1Pull !== s2Pull, 'La séance de tirage varie entre S1 et S2.');
assert(/checkpoint|Checkpoint|Déload/.test(s4Friday), 'S4 vendredi est un checkpoint/déload.');
assert(/checkpoint|Checkpoint|Déload/.test(s8Friday), 'S8 vendredi est un checkpoint/déload.');
assert(/Test Strict Muscle-Up|Strict Muscle-Up/.test(s10Friday), 'S10 vendredi contient le test strict muscle-up.');
assert(!/resultats\.json|athlete_state\.json|cycle_state\.json/.test(source), 'Le cycle ne référence aucune donnée durable utilisateur.');

console.log('✅ Cycle Strict Muscle-Up V1.6 : OK');

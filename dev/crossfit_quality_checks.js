#!/usr/bin/env node
// Racine V1.5 — tests qualité catalogue CrossFit.
// Vérifie que RX et Préparation Metcon ne sont pas de simples répétitions :
// 1 benchmark/metcon connu par semaine, variation hebdo, mouvements RX réels.

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
function textOf(blocks){ return JSON.stringify(blocks); }
function wodTexts(program, week){ return program.days.map(day => program.getWodText(day, week)); }
function knownCount(texts){ return texts.filter(t => /Benchmark RX connu|Metcon connu/.test(t)).length; }
function knownName(texts){
  const t = texts.find(x => /Benchmark RX connu|Metcon connu/.test(x)) || '';
  const m = t.match(/(?:Benchmark RX connu|Metcon connu) — ([^|]+) \|/);
  return m ? m[1].trim() : '';
}

const context = { window:{}, console };
context.window.COACH_BERTIN_PROGRAMS = {};
vm.createContext(context);
vm.runInContext(read('programs/index.js'), context, {filename:'programs/index.js'});
vm.runInContext(read('programs/racine_client_programs.js'), context, {filename:'programs/racine_client_programs.js'});
vm.runInContext(read('programs/racine_crossfit_programs.js'), context, {filename:'programs/racine_crossfit_programs.js'});

const programs = context.window.COACH_BERTIN_PROGRAMS || {};
const rxIds = ['client_rx_crossfit_4d', 'client_rx_crossfit_5d'];
const metconIds = ['client_metcon_prep_2d', 'client_metcon_prep_3d', 'client_metcon_prep_4d'];
const rxPattern = /Chest-to-Bar|Toes-to-Bar|Handstand Push-up|Handstand Walk|Ring Muscle-up|Bar Muscle-up|Rope Climb|Double-under|Thruster|Snatch|Clean|Jerk|Wall Ball|Pistol|Bar-Facing Burpee|GHD/i;

rxIds.concat(metconIds).forEach(id => assert(!!programs[id], id + ' est chargé.'));

rxIds.forEach(id => {
  const p = programs[id];
  const names = [];
  for(let week=1; week<=6; week++){
    const texts = wodTexts(p, week);
    assert(knownCount(texts) === 1, id + ' semaine ' + week + ' a exactement un benchmark connu.');
    names.push(knownName(texts));
    assert(rxPattern.test(textOf(p.getBlocks(p.days[0], week))) || rxPattern.test(textOf(p.getBlocks(p.days[1], week))), id + ' semaine ' + week + ' contient de vrais mouvements RX dans les séances de construction.');
  }
  assert(new Set(names).size === 6, id + ' utilise 6 benchmarks RX différents sur 6 semaines.');
  const firstTrainingDay = p.days[0];
  assert(textOf(p.getBlocks(firstTrainingDay, 1)) !== textOf(p.getBlocks(firstTrainingDay, 2)), id + ' varie la première séance entre S1 et S2.');
  assert(textOf(p.getBlocks(firstTrainingDay, 2)) !== textOf(p.getBlocks(firstTrainingDay, 3)), id + ' varie la première séance entre S2 et S3.');
});

metconIds.forEach(id => {
  const p = programs[id];
  const names = [];
  for(let week=1; week<=6; week++){
    const texts = wodTexts(p, week);
    assert(knownCount(texts) === 1, id + ' semaine ' + week + ' a exactement un metcon connu.');
    names.push(knownName(texts));
  }
  assert(new Set(names).size === 6, id + ' utilise 6 metcons connus différents sur 6 semaines.');
  const firstTrainingDay = p.days[0];
  assert(textOf(p.getBlocks(firstTrainingDay, 1)) !== textOf(p.getBlocks(firstTrainingDay, 2)), id + ' varie la séance moteur entre S1 et S2.');
});

const source = read('programs/racine_crossfit_programs.js');
['Fran','Grace','Helen','DT','Fight Gone Bad','Cindy','Annie','Jackie','Christine'].forEach(name => {
  assert(source.includes(name), 'Le catalogue contient le metcon/benchmark connu : ' + name + '.');
});

console.log('✅ Qualité CrossFit V1.5 : OK');

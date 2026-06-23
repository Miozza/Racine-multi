#!/usr/bin/env node
// Racine V1.5 — tests catalogue client + sportif.
// But : vérifier que les programmes client sont présents, utilisables et
// restent des programmes neutres (aucune donnée vivante d'utilisateur).

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

const context = { window: {}, console };
context.window.COACH_BERTIN_PROGRAMS = {};
vm.createContext(context);
vm.runInContext(read('programs/index.js'), context, {filename:'programs/index.js'});
vm.runInContext(read('programs/racine_client_programs.js'), context, {filename:'programs/racine_client_programs.js'});
vm.runInContext(read('programs/racine_crossfit_programs.js'), context, {filename:'programs/racine_crossfit_programs.js'});

const index = context.window.COACH_BERTIN_PROGRAM_INDEX || [];
const programs = context.window.COACH_BERTIN_PROGRAMS || {};
const clientIds = index.filter(x => x && x.macroRole === 'client_catalog').map(x => x.id);
const baseClientIds = clientIds.filter(id => (index.find(x => x.id === id) || {}).file === 'programs/racine_client_programs.js');
const sportClientIds = clientIds.filter(id => (index.find(x => x.id === id) || {}).file === 'programs/racine_crossfit_programs.js');

assert(clientIds.length >= 20, 'Le catalogue expose au moins 20 programmes client/sportifs.');
assert(baseClientIds.length >= 12, 'Le catalogue de base conserve au moins 12 programmes.');
assert(sportClientIds.length >= 8, 'Le catalogue sportif expose au moins 8 programmes.');
assert(new Set(clientIds).size === clientIds.length, 'Les IDs du catalogue sont uniques.');
assert(clientIds.every(id => programs[id]), 'Chaque programme déclaré dans index.js est chargé.');
assert(clientIds.every(id => Array.isArray(programs[id].days) && programs[id].days.length >= 2 && programs[id].days.length <= 5), 'Chaque programme client a une fréquence entre 2 et 5 jours.');
assert(clientIds.some(id => programs[id].objective === 'apprendre les mouvements'), 'Le catalogue inclut un objectif débutant/fondation.');
assert(clientIds.some(id => programs[id].objective === 'prise de masse'), 'Le catalogue inclut un objectif hypertrophie.');
assert(clientIds.some(id => programs[id].objective === 'force structurée' || programs[id].objective === 'force temps limité'), 'Le catalogue inclut un objectif force.');
assert(clientIds.some(id => programs[id].objective === 'forme + perte de gras'), 'Le catalogue inclut un objectif recomposition.');
assert(clientIds.some(id => programs[id].objective === 'force + moteur'), 'Le catalogue inclut un objectif hybride/performance.');
assert(clientIds.some(id => programs[id].objective === 'haltéro crossfit'), 'Le catalogue inclut un objectif Haltéro CrossFit.');
assert(clientIds.some(id => programs[id].objective === 'performance RX crossfit'), 'Le catalogue inclut un objectif Performance RX CrossFit.');
assert(clientIds.some(id => programs[id].objective === 'préparation metcon'), 'Le catalogue inclut un objectif Préparation Metcon.');

clientIds.forEach(id => {
  const p = programs[id];
  assert(typeof p.getBlocks === 'function', id + ' fournit getBlocks().');
  p.days.forEach(day => {
    const blocks = p.getBlocks(day, 1);
    assert(Array.isArray(blocks) && blocks.length >= 5, id + ' / ' + day + ' retourne une séance complète.');
    assert(blocks.some(b => b.kind === 'main'), id + ' / ' + day + ' contient un bloc principal.');
    assert(blocks.some(b => b.kind === 'wod'), id + ' / ' + day + ' contient un finisher/WOD.');
  });
});

const catalogText = read('programs/racine_client_programs.js') + '\n' + read('programs/racine_crossfit_programs.js');
assert(!/resultats\.json|athlete_state\.json|cycle_state\.json/.test(catalogText), 'Le catalogue ne référence pas de données durables historiques.');
assert(!/Miozza|GitHub|github/i.test(catalogText), 'Le catalogue client ne dépend pas de GitHub.');

console.log('✅ Catalogue client/sportif V1.5 : OK');

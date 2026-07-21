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
const appSource = read('app.js');
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

// Programme privé Stéphanie : déclaré dans index.js, il doit être exécutable
// (enregistré dans COACH_BERTIN_PROGRAMS avec getBlocks). Bug historique : la
// bibliothèque de séances existait sans enregistrement runtime — l'activer
// déclenchait « programme absent » et la vue WOD restait vide.
vm.runInContext(read('programs/hypertrophie_fesse_stephanie.js'), context, {filename:'programs/hypertrophie_fesse_stephanie.js'});
const steph = programs['hypertrophie_fesse_stephanie'];
assert(!!steph, 'hypertrophie_fesse_stephanie est enregistré dans COACH_BERTIN_PROGRAMS.');
assert(typeof steph.getBlocks === 'function', 'hypertrophie_fesse_stephanie fournit getBlocks().');
assert(Array.isArray(steph.days) && steph.days.length >= 2, 'hypertrophie_fesse_stephanie déclare ses jours.');
const stephEntry = index.find(x => x && x.id === 'hypertrophie_fesse_stephanie') || {};
assert(stephEntry.visibility === 'private', 'hypertrophie_fesse_stephanie est privé par défaut.');
assert(index.filter(p => p && p.visibility === 'public').length === 32, 'Les 32 autres programmes publics restent accessibles à tous.');
assert(!appSource.includes('item.visibility || "public"'), 'Une visibilité absente ne doit jamais devenir publique.');
for(let wk = 1; wk <= (Number(stephEntry.durationWeeks) || 4); wk++){
  steph.days.forEach(day => {
    const blocks = steph.getBlocks(day, wk) || [];
    assert(blocks.length >= 5, 'hypertrophie_fesse_stephanie / S' + wk + ' ' + day + ' retourne une séance complète.');
    assert(blocks.every(b => b && b.title && b.kind), 'hypertrophie_fesse_stephanie / S' + wk + ' ' + day + ' : blocs avec titre et kind.');
    blocks.forEach(b => {
      if(Array.isArray(b.exercises)) assert(b.exercises.every(e => e && e.name), 'hypertrophie_fesse_stephanie / S' + wk + ' ' + day + ' : exercices nommés.');
    });
  });
}

// ─── V4.4 — Métadonnées de suggestion (La Saison) ───────────────────────────
// Tout programme public doit porter les champs dont le moteur de suggestion
// dépend : objective, frequency et le graphe suggestedNext.
const publicEntries = index.filter(p => p && p.visibility === 'public');
assert(publicEntries.length >= 20, 'Le catalogue expose au moins 20 programmes publics.');
publicEntries.forEach(p => {
  assert(typeof p.objective === 'string' && p.objective.length > 0, p.id + ' : objective présent.');
  assert(Number.isInteger(p.frequency) && p.frequency >= 1 && p.frequency <= 6, p.id + ' : frequency valide (1-6).');
  assert(Array.isArray(p.suggestedNext), p.id + ' : suggestedNext présent (tableau, peut être vide).');
  (p.suggestedNext || []).forEach(nid => {
    const target = index.find(t => t && t.id === nid);
    assert(!!target, p.id + " : suggestedNext '" + nid + "' référence un id existant.");
    assert(target && target.visibility === 'public', p.id + " : suggestedNext '" + nid + "' est public.");
    assert(nid !== p.id, p.id + ' : ne se suggère pas lui-même.');
  });
});

console.log('✅ Catalogue client/sportif V1.5 : OK');

#!/usr/bin/env node
/*
  Racine — garde-fous : durée réelle d'une séance (scripts/session/time_budget.js).

  Contrat protégé ici (le contrat, pas l'inventaire) :
    1. Le temps écrit d'un bloc est un plancher : l'estimation n'est jamais
       en dessous de ce que le programme annonce.
    2. Le temps humain est compté : montée en charge d'un mouvement principal
       à la barre, installation des postes, changement de machine dans un
       aérobie continu, transition entre deux blocs.
    3. Les blocs « en trop » sont ceux qui suivent le metcon (accessoire,
       volume, gainage) — jamais l'échauffement, le principal, le metcon ni le
       retour au calme.
    4. Le rappel de retard et la vue WOD lisent ce module ; sans lui, ils
       retombent sur le temps écrit.

  Usage : node dev/time_budget_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('scripts/session/time_budget.js'), ctx, {filename:'time_budget.js'});
const B = ctx.CoachTimeBudget;

assert(B.writtenMinutes('16 min') === 16 && B.writtenMinutes('10-12 min') === 12 && B.writtenMinutes('—') === 0, 'Temps écrit : « 10-12 min » compte la borne longue');
assert(B.restSeconds('1:00 avant A2') === 60 && B.restSeconds('0:45–2:00') === 120 && B.restSeconds('90 sec') === 90 && B.restSeconds('—') === 0, 'Repos : m:ss, plage (borne longue) et secondes');
const f = B.parseFormat('3×30 s/côté');
assert(f && f.sets === 3 && f.reps === 30 && f.timed && f.sided && B.parseFormat('EMOM 8 : 2 Power Clean') === null, 'Format : séries × durée par côté ; un EMOM n\'est pas une série');

const squat = {kind:'main', time:'14 min', exercises:[
  {name:'Back Squat', format:'5×3', load:'225 lb', rest:'1:00 avant A2'},
  {name:'Tibialis Raise', format:'3×15', load:'poids du corps', rest:'1:00 après A2'}]};
const m = B.blockMinutes(squat);
assert(m.estimated > m.written && m.estimated >= 14 + B.T.ramp / 2, 'Squat lourd : montée en charge et barre comptées (' + m.estimated.toFixed(1) + ' min pour 14 écrites)');
assert(B.blockMinutes({kind:'accessory', time:'20 min', exercises:[{name:'Face Pull', format:'2×10', rest:'0:30'}]}).estimated === 20, 'Le temps écrit est un plancher');

const aero = {kind:'wod', time:'30 min', wod:{format:'steady', minutes:30, moves:[{name:'Bike'},{name:'Row'},{name:'Bike'}]}};
assert(B.blockMinutes(aero).estimated === 30 + B.T.wodSetup + 2 * B.T.machineChange, 'Aérobie Bike → Row → Bike : deux changements de machine');

const day = [
  {kind:'warmup', time:'8 min', title:'Échauffement'}, squat, aero,
  {kind:'accessory', time:'8 min', title:'C. Accessoire', exercises:[{name:'Dead Bug', format:'3×8/côté', load:'poids du corps', rest:'1:00'}]},
  {kind:'mobility', time:'3 min', title:'D. Retour au calme'}];
const s = B.session(day);
assert(s.transitions === 4 * B.T.between && s.written === 63, 'Séance : une transition entre chaque bloc, aucune avant le premier');
assert(s.blocks.filter(b => b.extra).map(b => b.title).join() === 'C. Accessoire' && s.essential < s.full, '« En trop » = l\'accessoire après le metcon, pas le retour au calme');
assert(B.slotMinutes(squat, 1) === m.estimated + B.T.between && B.slotMinutes(squat, 0) === m.estimated, 'Créneau du rappel : bloc + transition qui le précède');

// 4. Branchements.
const rem = read('scripts/session/schedule_reminder.js'), wp = read('scripts/view_wodplus.js'), html = read('index.html');
assert(/CoachTimeBudget\.slotMinutes/.test(rem) && /return slotMinutes\(\(block \|\| \{\}\)\.time\)/.test(rem), 'Rappel de retard : durée réelle, repli sur le temps écrit');
assert(/CoachTimeBudget\.session\(blocks\)\.full/.test(wp) && /transitions comprises/.test(wp), 'Vue WOD : « Durée réelle ≈ N min, transitions comprises »');
assert(html.indexOf('scripts/session/time_budget.js') > 0 && html.indexOf('scripts/session/time_budget.js') < html.indexOf('scripts/view_wodplus.js'), 'index.html : le module est chargé avant la vue WOD');

if(failures){ console.error('\n' + failures + ' échec(s).'); process.exit(1); }
console.log('\nDurée réelle : contrat respecté.');

#!/usr/bin/env node
/*
  Racine — garde-fous : jambes du coureur (programs/course_maxence.js).

  Contrat protégé :
    1. DEUX SÉANCES FIXES, 1 par semaine au choix : A ~60 min, B plus courte.
       Les mêmes mouvements chaque semaine — c'est ce qui les rend mémorisables
       et fait disparaître les courbatures.
    2. RIEN À L'ÉCHEC. Aucun format AMRAP / max / échec dans un exercice.
    3. CHEVILLE. Aucun saut répété sur place (pogo, corde, depth jump) ; le
       Box Jump se redescend en marchant. Tibialis Raise dans les deux séances.
    4. SÉANCE B DÉCLARÉE LÉGÈRE : chaque exercice chargé porte « léger » —
       c'est ce qui coupe l'auto-progression (coachExtractMovementIntent).
    5. CHAQUE MOUVEMENT A UNE FICHE TECHNIQUE, y compris dans les cartes de
       texte d'échauffement et de retour au calme.

  Usage : node dev/course_maxence_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const ctx = { window:{}, console };
vm.createContext(ctx);
['programs/index.js','programs/course_maxence.js','programs/tutorials.js']
  .forEach(f => vm.runInContext(read(f), ctx, {filename:f}));

const P = ctx.window.COACH_BERTIN_PROGRAMS.course_maxence;
const entry = (ctx.window.COACH_BERTIN_PROGRAM_INDEX || []).find(x => x && x.id === 'course_maxence') || {};
const tutos = ctx.window.COACH_BERTIN_TUTORIALS || {};
const minutes = blocks => blocks.reduce((t, b) => t + (parseInt(b.time, 10) || 0), 0);
const names = blocks => blocks.flatMap(b => (b.exercises || []).map(e => e.name)).join('|');

assert(!!P && typeof P.getBlocks === 'function', 'course_maxence est enregistré et fournit getBlocks().');
assert(entry.visibility === 'public', 'le programme est publié : sélectionnable sans permission.');
assert(!/maxence/i.test(String(entry.name) + ' ' + P.label + ' ' + P.impact), 'aucun prénom dans ce qui est affiché.');
assert(P.days.length === 2 && Number(entry.frequency) === 1, 'deux séances, une par semaine au choix.');

const A1 = P.getBlocks('mardi', 2), B1 = P.getBlocks('jeudi', 2);
assert(minutes(A1) >= 55 && minutes(A1) <= 65, 'séance A ≈ 60 min (' + minutes(A1) + ').');
assert(minutes(B1) < minutes(A1), 'séance B plus courte que A (' + minutes(B1) + ').');

for(let w = 1; w <= P.weekLabels.length; w++){
  ['mardi','jeudi'].forEach(day => {
    const bl = P.getBlocks(day, w);
    const all = JSON.stringify(bl).toLowerCase();
    assert(names(bl) === names(P.getBlocks(day, 1)), day + ' S' + w + ' : mêmes mouvements chaque semaine.');
    assert(!/amrap|échec|to failure|max reps/.test(all.replace(/jamais à l'échec/g, '')), day + ' S' + w + ' : rien à l\'échec.');
    assert(!/pogo|double under|corde à sauter|depth jump|drop jump/.test(all), day + ' S' + w + ' : aucun saut répété ni réception en contrebas.');
    assert(/tibialis raise/.test(all), day + ' S' + w + ' : Tibialis Raise présent.');
    bl.forEach(b => (b.exercises || []).forEach(e => {
      if(e.name === 'Box Jump') assert(/marchant/i.test(e.note), day + ' S' + w + ' : Box Jump redescendu en marchant.');
      if(day === 'jeudi' && /\d+ lb/.test(e.load)) assert(/léger/i.test(e.note), 'B S' + w + ' : ' + e.name + ' déclaré léger.');
      if(w === 1) assert(!!tutos[e.name], 'fiche technique : ' + e.name + '.');
    }));
    // Les cartes de texte (échauffement, retour au calme) ouvrent aussi une fiche.
    if(w === 1) bl.filter(b => b.text && b.kind !== 'wod').forEach(b => b.text.split('+').map(t => t.trim())
      .filter(t => !/^vélo|^jogging/i.test(t))
      .forEach(t => assert(!!ctx.window.findCoachBertinTutorial(t), 'fiche technique (texte) : ' + t + '.')));
  });
}

if(failures){ console.error('\n' + failures + ' échec(s).'); process.exit(1); }
console.log('\ncourse_maxence_checks : tout est vert.');

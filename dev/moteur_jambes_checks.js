#!/usr/bin/env node
/*
  Racine — contrat du Pont — Moteur + jambes (programs/moteur_jambes.js).

  Ce que ce fichier protège (le contrat, pas l'inventaire) :
    1. Le bloc dure 5 semaines et mène au Peak (nextPhase competition_peak).
    2. L'épaule est épargnée en S1-S4 : aucun mouvement au-dessus de la tête,
       aucune traction, aucun ski, aucun curl, ni en exercice ni dans un metcon.
    3. S5 teste le retour (mardi : haut du corps, jeudi : Power Clean) dans un
       bloc technique, que la capture de résultats ne lit pas.
    4. Le metcon suit le travail principal (décision du 2026-10-17).
    5. Les mouvements principaux progressent : aucun mot qui coupe
       l'auto-progression dans leur note ni dans l'objectif de semaine, et
       aucune charge au-dessus du 1RM de l'athlète de référence.

  Usage : node dev/moteur_jambes_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const ctx = { console, Object, String, Number, Array };
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync(path.join(root, 'programs/moteur_jambes.js'), 'utf8'), ctx);
const P = ctx.COACH_BERTIN_PROGRAMS.moteur_jambes;

assert(P && P.weekLabels.length === 5 && P.weekGoals.length === 5, '5 semaines');
assert(P.nextPhase === 'competition_peak', 'mène au Peak');

const OVERHEAD = /wall ?ball|strict press|push press|jerk|snatch|pull-?up|chin-?up|toes-to-bar|\bski|curl|pullover|overhead|handstand|thruster|kb swing|lateral raise/i;
const MAIN_REF = { 'Back Squat':315, 'Front Squat':265, 'Bench Press':245, 'Hip Thrust':315 };
const LIMIT_WORDS = /léger|legere|technique|facile|deload|récupération|vitesse/i;

for(let w = 1; w <= 5; w++){
  assert(!LIMIT_WORDS.test(P.weekGoals[w - 1]), 'S' + w + ' : objectif de semaine sans mot de deload');
  P.days.forEach(day => {
    const blocks = P.getBlocks(day, w);
    const tag = 'S' + w + ' ' + day;
    const scored = blocks.filter(b => b.kind !== 'technique');
    const text = scored.map(b => (b.text || '') + ' ' + (b.exercises || []).map(e => e.name).join(' ')).join(' ');
    if(w <= 4) assert(!OVERHEAD.test(text), tag + ' : rien au-dessus de la tête ni en traction');
    const kinds = blocks.map(b => b.kind);
    const wod = kinds.indexOf('wod'), main = kinds.lastIndexOf('main');
    assert(wod === main + 1, tag + ' : le metcon suit le travail principal');
    blocks.forEach(b => (b.exercises || []).forEach(e => {
      if(!MAIN_REF[e.name]) return;
      const lb = parseFloat(e.load);
      assert(lb > 0 && lb <= MAIN_REF[e.name], tag + ' : ' + e.name + ' ' + e.load + ' ≤ référence');
      assert(!LIMIT_WORDS.test(e.note), tag + ' : ' + e.name + ' garde son auto-progression');
    }));
  });
}

const tech = d => P.getBlocks(d, 5).filter(b => b.kind === 'technique').map(b => b.text).join(' ');
assert(/Wall Ball/.test(tech('mardi')) && /Pull-Up/.test(tech('mardi')) && /Strict Press/.test(tech('mardi')), 'S5 mardi : test de retour haut du corps');
assert(/Power Clean/.test(tech('jeudi')), 'S5 jeudi : test de retour Power Clean');
assert(P.getBlocks('mardi', 4).every(b => b.kind !== 'technique'), 'S1-S4 : pas de test de retour');

if(failures){ console.error('\n' + failures + ' échec(s).'); process.exit(1); }
console.log('\nPont — Moteur + jambes : contrat respecté.');

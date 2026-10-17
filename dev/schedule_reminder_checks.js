#!/usr/bin/env node
/*
  Racine — rappel de retard anticipé (scripts/session/schedule_reminder.js).

  Ce que ce fichier protège (décision de l'athlète, 2026-10-17) :
    1. Pas de chrono strict : le repère est le départ réel, rien ne s'affiche
       sous 5 min de retard, la mention passe au rouge à 10.
    2. Entrer en retard dans un bloc compte, s'attarder au-delà du créneau
       aussi ; revenir en arrière ne crée pas de faux retard.
    3. La suggestion ne vise que les blocs de fin (hypertrophy, puis
       accessory) : jamais l'échauffement, le travail principal ni le cardio.
    4. Mémoire vive seulement, et la mention vit dans la ligne du tag.

  Usage : node dev/schedule_reminder_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [], notes = [];
const assert = (c, m) => (c ? notes : errors).push(m);

const ctx = { setInterval: () => 1, clearInterval(){}, document: { getElementById: () => null }, Date, Math, String, Number };
ctx.window = ctx;
vm.runInNewContext(read('scripts/session/schedule_reminder.js'), ctx);
vm.runInNewContext(read('programs/pont_peak.js'), ctx);
const R = ctx.CoachScheduleReminder, P = ctx.COACH_BERTIN_PROGRAMS.pont_peak;
const MIN = 60000, T0 = 1e12;

// Jeudi S3 : Échauffement 8 · A Press 14 · B Front Squat 10 · C EMOM 10 · D Masse épaules…
const jeudi = P.getBlocks('jeudi', 3);
R.start(jeudi, T0);
R.enter(1, T0 + 8 * MIN);
assert(R.noteAt(T0 + 20 * MIN) === null, 'Dans les temps : aucune mention.');
R.enter(2, T0 + 26 * MIN);   // prévu à 22 → +4
assert(R.noteAt(T0 + 26 * MIN) === null, 'Retard de 4 min : toujours rien (seuil ' + R.SEUIL + ').');
R.enter(3, T0 + 38 * MIN);   // prévu à 32 → +6
const n6 = R.noteAt(T0 + 38 * MIN) || {};
assert(/^⏱ \+6 min · écourte D\. Masse épaules$/.test(n6.text || '') && !n6.red,
  'Retard de 6 min : « ' + n6.text + ' », suggestion = volume musculaire.');
assert((R.noteAt(T0 + 52 * MIN) || {}).red === true, 'S\'attarder au-delà du créneau de l\'EMOM : retard ≥ ' + R.ROUGE + ' → rouge.');
R.enter(1, T0 + 53 * MIN);
assert((R.noteAt(T0 + 53 * MIN) || {}).red === true, 'Revenir en arrière ne change pas le repère (bloc le plus avancé).');

R.start(P.getBlocks('lundi', 3), T0);
R.enter(1, T0 + 8 * MIN);
assert(Math.round(R.lateMinutes(P.getBlocks('lundi', 3), 1, T0, T0 + 8 * MIN, T0 + 30 * MIN)) === 6,
  'Squat de 16 min fait en 22 : retard de 6 min, sans changer de bloc.');

// La suggestion ne touche jamais l'échauffement, le principal ni le cardio.
const fautes = [];
P.days.forEach(d => [1, 2, 3, 4, 5, 6, 7].forEach(w => {
  const bl = P.getBlocks(d, w);
  bl.forEach((_, i) => {
    const t = R.suggestCut(bl, i);
    const b = bl.filter(x => x.title === t)[0];
    if (t && !(b && (b.kind === 'hypertrophy' || b.kind === 'accessory'))) fautes.push(d + ' S' + w + ' #' + i + ' → ' + t);
  });
}));
assert(fautes.length === 0, 'Suggestion limitée aux blocs hypertrophy / accessory (' + (fautes.join(' | ') || '28 séances') + ').');

const src = read('scripts/session/schedule_reminder.js'), view = read('scripts/session/view.js');
assert(!/localStorage|sessionStorage|indexedDB|fetch\(/.test(src), 'Mémoire vive seulement : aucun stockage, aucun réseau.');
assert(/class='guided-tag'>[^\n]*id='guidedLateNote'/.test(view)
  && /CoachScheduleReminder\.start\(/.test(view) && /CoachScheduleReminder\.enter\(/.test(view) && /CoachScheduleReminder\.stop\(/.test(view),
  'view.js : mention dans la ligne du tag, start à l\'ouverture, enter à chaque bloc, stop à la fermeture.');

if (errors.length) { console.error('\nECHEC schedule_reminder_checks.js'); errors.forEach(e => console.error(' - ' + e)); process.exit(1); }
console.log('OK schedule_reminder_checks.js');
notes.forEach(n => console.log(' - ' + n));

#!/usr/bin/env node
/*
  Racine — garde-fous : intervalles travail/repos + horloge ancrée.

  Deux contrats, tous deux invisibles à l'œil et coûteux s'ils cassent.

  1. LIRE UN FORMAT D'INTERVALLES. « 10 × (20 s fort / 40 s facile) » et
     « 4 × 3 min / 1 min repos » sont les deux écritures réellement utilisées
     dans les programmes. La durée vient du FORMAT, jamais du créneau du bloc,
     et le dernier repos n'est pas compté — un format d'intervalles finit sur
     l'effort. Un AMRAP ou un EMOM ne doivent JAMAIS être lus comme des
     intervalles : ils ont déjà leur chrono, et « AMRAP 12 : 12 cal, 10 squats »
     ressemble à s'y méprendre à « N × A / B » pour une expression régulière.

  2. NE PAS DÉRIVER QUAND L'ÉCRAN S'ÉTEINT. Racine est utilisée sur iPhone en
     PWA, téléphone posé pendant que le vélo tourne. Un chrono qui compte ses
     propres tics revient en retard de tout le temps passé écran éteint. Les
     deux chronos de la séance doivent lire l'horloge murale (Date.now) et
     rattraper les secondes manquées — en silence, parce que rejouer quarante
     bips au déverrouillage n'apprend rien à personne.

  Le module d'intervalles est exécuté pour de vrai (aucune assertion sur son
  texte) ; seul le branchement des deux chronos se vérifie par lecture, faute
  d'équivalent exécutable sans DOM ni horloge réelle.

  Usage : node dev/interval_timer_checks.js
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
vm.runInContext(read('scripts/session/interval_timer.js'), ctx, {filename:'scripts/session/interval_timer.js'});
const I = ctx.window.CoachIntervalTimer;
assert(!!I && typeof I.parse === 'function', 'CoachIntervalTimer expose une porte publique.');

// ── 1. Lecture des deux écritures réelles ───────────────────────────────────
const court = I.parse('Intervalles vélo : 10 × (20 s fort / 40 s facile). Selle assez haute.');
assert(court && court.rounds === 10 && court.workSec === 20 && court.restSec === 40,
  'lit « 10 × (20 s fort / 40 s facile) » : 10 rondes, 20 s / 40 s.');
assert(court && court.totalSec === 10 * 60 - 40,
  'le dernier repos ne compte pas : le format finit sur l\'effort.');

const long = I.parse('Vélo : 4 × 3 min à environ 80 % / 1 min repos.');
assert(long && long.rounds === 4 && long.workSec === 180 && long.restSec === 60,
  'lit « 4 × 3 min / 1 min repos » et convertit les minutes en secondes.');
assert(long && long.totalSec === 15 * 60, '4 × 3 min / 1 min dure 15 min, pas 16.');

// ── 2. Les formats qui ont déjà leur chrono ne passent pas par ici ──────────
assert(I.parse('AMRAP 12 : 12 cal vélo + 10 Air Squat + 8 Step-Up') === null,
  'un AMRAP n\'est jamais lu comme des intervalles.');
assert(I.parse('EMOM 8 : min 1 = 10 cal bike ; min 2 = 8 KB swings') === null,
  'un EMOM n\'est jamais lu comme des intervalles.');
assert(I.parse('Zone 2 vélo : 15 min continu.') === null,
  'un bloc continu ne produit aucun format d\'intervalles.');
assert(I.parse('3 × 10 reps de goblet squat') === null,
  'un schéma de séries sans unité de temps ne devient pas un chrono.');

// ── 3. Où en est-on à la seconde N ──────────────────────────────────────────
const p0 = I.phaseAt(court, 0);
assert(p0.phase === 'work' && p0.round === 1 && p0.remaining === 20, 'seconde 0 : effort, ronde 1, 20 s restantes.');
assert(I.phaseAt(court, 19).phase === 'work', 'seconde 19 : encore dans l\'effort.');
const p20 = I.phaseAt(court, 20);
assert(p20.phase === 'rest' && p20.round === 1 && p20.remaining === 40, 'seconde 20 : repos de la ronde 1.');
const p60 = I.phaseAt(court, 60);
assert(p60.phase === 'work' && p60.round === 2, 'seconde 60 : effort de la ronde 2.');
assert(I.phaseAt(court, court.totalSec).phase === 'done', 'la fin du format se déclare terminée.');
assert(I.phaseAt(court, court.totalSec + 500).phase === 'done', 'passé la fin, le format reste terminé (aucune ronde 11).');

// Les rondes ne débordent jamais du format annoncé : un affichage « 11/10 »
// suffirait à faire douter de tout le reste.
for(let e = 0; e < court.totalSec; e++){
  const p = I.phaseAt(court, e);
  if(p.round < 1 || p.round > court.rounds){ assert(false, 'ronde hors bornes à la seconde ' + e); break; }
}
assert(true, 'aucune seconde du format ne produit une ronde hors bornes.');

// ── 4. Les signaux tombent aux changements de phase, et nulle part ailleurs ─
const transitions = [];
for(let e = 0; e <= court.totalSec; e++) if(I.isTransition(court, e)) transitions.push(e);
assert(transitions.length === court.rounds * 2 - 2,
  'un signal par changement de phase : ' + transitions.length + ' pour ' + court.rounds + ' rondes.');
assert(transitions[0] === 20 && transitions[1] === 60, 'les deux premiers signaux tombent à 20 s et 60 s.');
assert(!I.isTransition(court, 0), 'le départ n\'est pas un changement de phase : il a déjà le décompte.');
assert(!I.isTransition(court, court.totalSec), 'la fin n\'est pas un changement de phase : elle a son propre signal.');

// ── 5. Horloge ancrée sur Date.now dans les DEUX chronos ────────────────────
const timer = read('scripts/session/timer.js');
const mini = read('scripts/session/mini_timer.js');
assert(/function guidedTimerAnchoredInterval\(/.test(timer) && /Date\.now\(\)/.test(timer),
  'le chrono WOD calcule ses tics depuis Date.now(), pas depuis un compteur.');
assert(/guidedTimer\.interval=guidedTimerAnchoredInterval\(/.test(timer),
  'la boucle du chrono WOD passe bien par l\'horloge ancrée (et pas par un setInterval direct).');
assert(!/guidedTimer\.interval=setInterval\(/.test(timer),
  'aucune boucle du chrono WOD ne compte encore ses propres tics.');
assert(!/setInterval\(function\(\)\{\s*guidedTimer\.countdownRemaining--/.test(timer.replace(/\s+/g, ' ')),
  'le décompte de départ passe aussi par l\'horloge ancrée.');
assert(/function anchoredInterval/.test(mini) && /Date\.now\(\)/.test(mini),
  'le mini-chrono (EMOM + repos) calcule ses tics depuis Date.now().');
assert(/restState\.interval = anchoredInterval\(restTick\)/.test(mini),
  'le minuteur de repos tourne sur l\'horloge ancrée : il rend la main à l\'heure juste.');
assert(/guidedTimerSilent/.test(timer) && /catchingUp/.test(mini),
  'les deux chronos savent se taire pendant un rattrapage.');
assert(/if\(catchingUp\) return;/.test(mini),
  'le mini-chrono ne rejoue aucun bip rattrapé.');
assert(/function guidedBipStart\(\)\{ if\(!guidedTimerSilent/.test(timer),
  'les bips du chrono WOD sont filtrés par le drapeau de rattrapage.');

// ── 6. Branchement : le format est lu au montage du bloc ────────────────────
const app = read('app.js');
assert(/CoachIntervalTimer\.parse\(txt\)/.test(app),
  'wodTimerConfig() lit le format d\'intervalles dans le texte du bloc.');
assert(/seconds=intervals\.totalSec/.test(app),
  'la durée du chrono vient du format, jamais du créneau du bloc.');
assert(/guidedIntervalTransitionTick\(\)/.test(timer),
  'le chrono sonne les changements de phase.');
assert(/phase-work|phase-rest/.test(read('styles.css')),
  'les phases ont un état visuel (lisible en sombre, à distance).');

console.log(failures ? ('\n' + failures + ' échec(s).') : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

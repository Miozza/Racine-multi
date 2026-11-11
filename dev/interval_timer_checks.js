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

// ── Séance du 2026-11-10 : « 5 × (3 min Bike … / 1:30 repos) » ─────────────
// Le chrono n'avait pas lu le format (durée en minutes:secondes) et la carte
// ne montrait que son titre (aucune pastille, texte masqué).
{
  let r = I.parse('5 × (3 min Bike à effort 7 sur 10 / 1:30 repos). Même cadence sur les cinq.');
  assert(r && r.rounds === 5 && r.workSec === 180 && r.restSec === 90 && r.totalSec === 5 * 270 - 90,
    'durée en minutes:secondes lue : 5 × 3:00 / 1:30, dernier repos non compté.');
  r = I.parse('4 × (1:00 Shuttle Runs de 10 m / 1:00 repos)');
  assert(r && r.workSec === 60 && r.restSec === 60, 'travail ET repos en minutes:secondes.');
  r = I.parse('Intervalles 3×4 min : Bike ou row, effort soutenu mais conversationnel, 2 min repos.');
  assert(r && r.rounds === 3 && r.workSec === 240 && r.restSec === 120, 'repos annoncé après une consigne : lu parce que le mot « repos » le suit.');
  assert(I.parse('Every 2:00 × 5 : 5 Power Cleans + 7 burpees.') === null && I.parse('3 × 10 min facile, pause libre. 2 min repos entre blocs.') === null,
    'une heure d\'horloge ou une phrase voisine ne fabriquent pas un format.');

  // Tout metcon structuré en intervalles, dans TOUS les programmes, reçoit le
  // chrono d'intervalles, avec les nombres de sa structure.
  const cp = {console, charge:(n, l) => l}; cp.window = cp; vm.createContext(cp);
  (read('index.html').match(/src="programs\/[^"?]+/g) || []).map(x => x.slice(5))
    .forEach(f => { try{ vm.runInContext(read(f), cp, {filename:f}); }catch(e){} });
  const toSec = v => { const m = String(v).match(/^(\d+):(\d{2})$/); if(m) return m[1] * 60 + Number(m[2]);
    const n = String(v).match(/^(\d+)\s*(min|s|sec)?/); return n ? Number(n[1]) * (n[2] === 'min' ? 60 : 1) : NaN; };
  const bad = []; let seen = 0;
  Object.keys(cp.COACH_BERTIN_PROGRAMS).forEach(id => {
    for(let w = 1; w <= 12; w++) ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].forEach(d => {
      let bl; try{ bl = cp.COACH_BERTIN_PROGRAMS[id].getBlocks(d, w) || []; }catch(e){ return; }
      bl.forEach(b => {
        if(!b || b.kind !== 'wod' || !b.wod || b.wod.format !== 'intervals') return;
        seen++;
        const t = I.parse(b.text);
        if(!t || t.rounds !== Number(b.wod.sets) || t.workSec !== toSec(b.wod.work) || t.restSec !== toSec(b.wod.rest)) bad.push(id + ' S' + w + ' ' + d + ' : ' + b.text.slice(0, 60));
      });
    });
  });
  assert(seen > 0 && bad.length === 0, seen + ' metcons en intervalles dans les programmes : tous ont le chrono travail/repos'
    + (bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''));

  // Une carte de metcon n'est jamais réduite à son titre.
  const view = read('scripts/session/view.js'), css = read('styles.css');
  assert(/if\(wodMovesHtml\)\{[\s\S]{0,700}?\}else if\(text\)\{\s*html\+="<div class='guided-wod-plain'/.test(view),
    'sans pastille, la carte affiche le texte du metcon (docs/UI_CONSTRAINTS.md).');
  const hidden = (css.match(/[^{}]*\{[^{}]*display:\s*none[^{}]*\}/g) || []).filter(r => /\.guided-wod-plain\b/.test(r.split('{')[0]));
  assert(/\.guided-wod-plain\s*[,{]/.test(css) && hidden.length === 0, 'ce texte a son style et aucune règle ne le masque.');
  // La séance se lit sans lunettes (docs/UI_CONSTRAINTS.md).
  const rule = (css.match(/\.guided-wod-plain,\s*\.guided-wod-note\s*\{[^}]*\}/) || [''])[0];
  const minPx = Number((rule.match(/font-size:\s*clamp\((\d+)px/) || [])[1]);
  assert(minPx >= 19, 'consigne et texte du metcon : jamais sous 19px (' + minPx + 'px).');
  const zoom = (css.match(/\.guided-wod-zoom\s*\{[^}]*\}/) || [''])[0];
  assert(Number((zoom.match(/font-size:\s*clamp\((\d+)px/) || [])[1]) >= 28 && /openGuidedWodZoom/.test(view),
    'le metcon s\'ouvre en très gros, plein écran, d\'un toucher.');
  assert(/note\.parentNode\.removeChild\(note\)/.test(view) && !/note\.style\.display\s*=\s*"none"/.test(view),
    'une consigne qui ne tient pas est retirée du DOM, jamais masquée (le chrono mesure sur l\'élément précédent).');
}

console.log(failures ? ('\n' + failures + ' échec(s).') : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

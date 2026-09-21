#!/usr/bin/env node
/*
  Racine — garde-fous : cycle de réhabilitation (programs/rehab_stephanie.js).

  Ce programme est écrit autour de deux blessures nommées. Ce qui doit être
  protégé n'est donc pas sa forme, c'est ce qu'il ne contient PAS — et ça, un
  relecteur humain ne le revoit jamais en entier : 4 séances × 4 semaines, on
  regarde la semaine qu'on modifie.

  Contrat protégé :
    1. MOUVEMENTS INTERDITS. Aucun overhead, aucune position en appui sur les
       bras, aucun push-up, aucun RDL, aucun hip thrust unilatéral, aucun
       rameur ni SkiErg — dans AUCUNE semaine, ni en exercice, ni dans un texte
       de bloc. C'est la seule assertion du fichier qui vaut à elle seule son
       existence.
    2. PROFONDEUR DE SQUAT. Tout mouvement de squat porte une consigne écrite
       de profondeur (parallèle / boîte). Une hanche en conflit pincer ne
       négocie pas la profondeur en cours de série.
    3. CHARGES À L'ÉCHELLE DE RÉFÉRENCE. Les nombres écrits sont ceux de
       l'athlète de référence (CLAUDE.md § 3.1), pas les charges réelles de
       l'athlète. Y écrire un poids déjà réduit donnerait une double réduction.
    4. PROGRESSION. S2 ajoute des reps à charge égale, S3 monte la charge de
       5 % aux reps de la S1, S4 retire une série et 15 % de charge.
    5. LA S4 EST DÉTECTÉE COMME DELOAD par le moteur — c'est ce qui coupe
       l'auto-progression, et ça tient à des mots dans weekLabels/weekGoals.
    6. CARDIO VÉLO SEULEMENT, un bloc chronométrable par séance.
    7. CHAQUE MOUVEMENT A UNE FICHE ET UNE VIDÉO. Un programme de retour de
       blessure sans démonstration est un programme qu'on exécute de travers.

  Usage : node dev/rehab_stephanie_checks.js
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
ctx.window.COACH_BERTIN_PROGRAMS = {};
vm.createContext(ctx);
['programs/index.js','programs/rehab_stephanie.js','programs/tutorials.js','data/movements_media.js',
 'scripts/session/interval_timer.js'].forEach(f => vm.runInContext(read(f), ctx, {filename:f}));

const P = ctx.window.COACH_BERTIN_PROGRAMS.rehab_stephanie;
const entry = (ctx.window.COACH_BERTIN_PROGRAM_INDEX || []).find(x => x && x.id === 'rehab_stephanie') || {};
const WEEKS = [1,2,3,4];

assert(!!P && typeof P.getBlocks === 'function', 'rehab_stephanie est enregistré et fournit getBlocks().');
// Public par décision explicite (V5.1.4) : l'athlète le sélectionne elle-même.
// Ce qui reste épinglé, c'est que le libellé affiché ne nomme personne — un
// catalogue public ne doit pas porter le prénom de quelqu'un ni sa blessure.
assert(entry.visibility === 'public', 'le cycle est publié : sélectionnable sans permission.');
assert(!/st[ée]phanie/i.test(String(entry.name) + ' ' + String(P.label) + ' ' + String(P.impact)),
  'aucun prénom dans ce que le catalogue affiche.');
assert(Array.isArray(P.days) && P.days.length === 4, 'le cycle compte 4 séances par semaine.');
assert(Number(entry.durationWeeks) === 4, 'le cycle dure 4 semaines.');

// Toutes les séances de toutes les semaines, à plat : exercices d'un côté,
// textes de l'autre.
const sessions = [];
P.days.forEach(day => WEEKS.forEach(week => {
  const blocks = P.getBlocks(day, week) || [];
  sessions.push({day, week, blocks});
}));
const allEx = [];
const allText = [];
sessions.forEach(s => s.blocks.forEach(b => {
  if(b.text) allText.push(b.text);
  (b.exercises || []).forEach(e => allEx.push(Object.assign({day:s.day, week:s.week, block:b}, e)));
}));

sessions.forEach(s => {
  assert(s.blocks.length >= 5, s.day + ' S' + s.week + ' : séance complète.');
  assert(s.blocks.every(b => b && b.title && b.kind), s.day + ' S' + s.week + ' : blocs titrés et typés.');
  assert(s.blocks.some(b => b.kind === 'main'), s.day + ' S' + s.week + ' : un bloc principal.');
  assert(s.blocks.some(b => b.kind === 'mobility'), s.day + ' S' + s.week + ' : un bloc de mobilité.');
  assert(s.blocks.filter(b => b.kind === 'wod').length === 1, s.day + ' S' + s.week + ' : exactement un bloc cardio.');
});
assert(allEx.every(e => e.name && e.format && e.load), 'chaque exercice porte un nom, un format et une charge.');

// ── 0. Le format de la séance : 45 min, plus de force que de cardio ─────────
// La contrainte de temps n'est pas cosmétique : c'est elle qui décide si la
// séance se fait ou pas. Et la répartition dit le but du cycle — renforcer,
// avec du cardio autour, jamais l'inverse.
sessions.forEach(s => {
  const min = k => s.blocks.filter(b => k.includes(b.kind)).reduce((a, b) => a + (parseInt(b.time, 10) || 0), 0);
  const total = s.blocks.reduce((a, b) => a + (parseInt(b.time, 10) || 0), 0);
  assert(total === 45, s.day + ' S' + s.week + ' : la séance tient en 45 min (' + total + ').');
  assert(min(['mobility']) >= 7, s.day + ' S' + s.week + ' : au moins 7 min de mobilité.');
  assert(min(['main','accessory','core']) > min(['wod']),
    s.day + ' S' + s.week + ' : plus de renforcement que de cardio.');
});

// ── 1. Mouvements interdits ─────────────────────────────────────────────────
// Écrits comme des motifs sur le texte normalisé : c'est la formulation qui
// résiste à une reformulation du programme.
const INTERDITS = [
  [/\boverhead\b|\bsnatch\b|\bjerk\b|\bpress\b|\bthruster\b|wall ball/i, 'overhead'],
  [/\bplank\b|\bplanche\b|side plank/i, 'planche / appui sur les bras'],
  [/push[- ]?up|pompes?\b/i, 'push-up'],
  [/romanian deadlift|\brdl\b|stiff[- ]leg/i, 'RDL'],
  [/single[- ]?leg hip thrust|hip thrust unilat/i, 'hip thrust unilatéral'],
  [/ski ?erg|rameur|\browing\b/i, 'SkiErg / rameur'],
  [/burpee/i, 'burpee (appui sur les bras)']
];
// « Pallof Press » est le seul « press » du cycle et n'a rien d'un overhead :
// c'est un anti-rotation, bras devant. On le retire avant de chercher.
const corpus = allEx.map(e => [e.name, e.format, e.load, e.note].join(' '))
  .concat(allText)
  .concat(Object.values(P.dayMeta || {}).map(m => [m.label, m.base, m.focus].join(' ')))
  .join(' | ')
  .replace(/Pallof Press/g, 'Pallof')
  .replace(/Tricep Pushdown/g, 'Pushdown');
INTERDITS.forEach(([rx, nom]) => {
  const m = rx.exec(corpus);
  assert(!m, 'aucun ' + nom + ' dans le cycle' + (m ? ' (trouvé : « ' + m[0] + ' »)' : '') + '.');
});
// Les règles de cycle nomment les deux blessures : sans ça, personne ne sait
// pourquoi ces mouvements manquent, et le prochain agent les rajoute.
const rules = (P.cycleRules || []).join(' ').toLowerCase();
assert(/hanche|f[ée]moro/.test(rules) && /[ée]paule/.test(rules),
  'les règles du cycle nomment les deux blessures qui l\'ont écrit.');

// ── 2. Profondeur de squat ──────────────────────────────────────────────────
const squats = allEx.filter(e => /squat/i.test(e.name));
assert(squats.length > 0, 'le cycle contient bien du squat (il n\'est pas interdit, il est borné).');
assert(squats.every(e => /parallèle|boîte|boite/i.test(e.note)),
  'chaque squat porte sa consigne de profondeur écrite.');
const airSquatTexts = allText.filter(t => /air squat/i.test(t));
assert(airSquatTexts.length > 0 && airSquatTexts.every(t => /parallèle|jamais plus bas|boîte|boite/i.test(t)),
  'partout où un air squat est nommé, la limite de profondeur est écrite à côté.');

// ── 3. Charges à l'échelle de référence ─────────────────────────────────────
// Le repère réel de l'athlète au hip thrust est 135 lb. Une charge écrite à ce
// niveau serait une charge DÉJÀ réduite, que le moteur réduirait une seconde
// fois. À l'échelle de référence, la même prescription vaut ~300 lb.
function num(load){ const m = /(\d+(?:\.\d+)?)\s*lb/i.exec(String(load||'')); return m ? Number(m[1]) : null; }
const hipThrusts = allEx.filter(e => e.name === 'Hip Thrust' && e.week === 1);
assert(hipThrusts.length > 0 && hipThrusts.every(e => num(e.load) >= 200),
  'les hip thrusts sont écrits à l\'échelle de référence (≥ 200 lb), jamais aux charges réelles de l\'athlète.');
const goblet = allEx.find(e => e.name === 'Goblet Squat' && e.week === 1);
assert(goblet && num(goblet.load) >= 60,
  'le goblet squat est écrit à l\'échelle de référence, pas à la charge de travail réelle.');

// ── 4. Progression sur les 4 semaines ───────────────────────────────────────
function find(day, week, name){ return (P.getBlocks(day, week) || [])
  .reduce((acc, b) => acc.concat(b.exercises || []), [])
  .find(e => e.name === name); }
function sets(fmt){ return Number(String(fmt).split('×')[0]); }
function reps(fmt){ return Number(/×(\d+)/.exec(String(fmt))[1]); }

const s1 = find('lundi', 1, 'Hip Thrust');
const s2 = find('lundi', 2, 'Hip Thrust');
const s3 = find('lundi', 3, 'Hip Thrust');
const s4 = find('lundi', 4, 'Hip Thrust');
assert(num(s2.load) === num(s1.load) && reps(s2.format) > reps(s1.format),
  'S2 : mêmes charges qu\'en S1, davantage de répétitions.');
assert(num(s3.load) > num(s1.load) && reps(s3.format) === reps(s1.format),
  'S3 : charge au-dessus de la S1, répétitions de la S1.');
assert(Math.abs(num(s3.load) / num(s1.load) - 1.05) < 0.02, 'S3 monte d\'environ 5 %.');
assert(Math.abs(num(s4.load) / num(s1.load) - 0.85) < 0.02, 'S4 redescend d\'environ 15 %.');
assert(sets(s4.format) === sets(s1.format) - 1, 'S4 retire une série.');

// Aucune semaine n'invente une charge en dehors de cette règle : la table de
// semaines est le seul endroit où un pourcentage est écrit.
const src = read('programs/rehab_stephanie.js');
assert((src.match(/loadPct:/g) || []).length === 4,
  'les pourcentages de semaine vivent dans une seule table (4 valeurs, pas une par exercice).');

// ── 5. La S4 est lue comme une semaine de décharge ──────────────────────────
// coachIsDeloadWeekOrContext() lit le libellé et l'objectif de semaine et y
// cherche « deload », « récupération » ou « facile ». Sans un de ces mots, la
// S4 progresserait comme une semaine normale.
const DELOAD_RX = /deload|récupération|recuperation|facile/i;
assert(DELOAD_RX.test(P.weekLabels[3]) || DELOAD_RX.test(P.weekGoals[3]),
  'la S4 est reconnaissable comme semaine de décharge par le moteur.');
assert(!WEEKS.slice(0,3).some(w => DELOAD_RX.test(P.weekLabels[w-1])),
  'les semaines 1 à 3 ne se déclarent pas en décharge.');

// ── 6. Le curl reste plafonné ───────────────────────────────────────────────
const curls = allEx.filter(e => e.name === 'DB Curl');
assert(curls.length > 0 && curls.every(e => /rpe 7/i.test(e.note)),
  'le curl porte son plafond RPE 7 à toutes les semaines.');
assert(curls.every(e => /lég(er|ère)/i.test(e.note)),
  'le curl porte « léger » dans sa note : c\'est ce que lit coachExtractMovementIntent().');

// ── 7. Cardio : vélo seulement, et chronométrable ───────────────────────────
const cardio = [];
sessions.forEach(s => s.blocks.filter(b => b.kind === 'wod').forEach(b => cardio.push(b)));
assert(cardio.every(b => /vélo/i.test(b.text)), 'tout le cardio du cycle est du vélo.');
const I = ctx.window.CoachIntervalTimer;
assert(cardio.every(b => !!I.parse(b.text) || /AMRAP/i.test(b.text) || /zone\s*2/i.test(b.text)),
  'chaque bloc cardio est un format que le chrono sait lire (intervalles, AMRAP ou zone 2).');
const formats = new Set(cardio.map(b => I.parse(b.text) ? 'intervalles' : (/AMRAP/i.test(b.text) ? 'amrap' : 'zone2')));
assert(formats.size === 3, 'le cardio varie : intervalles, mini-WOD et zone 2 sont tous présents.');

// ── 8. Fiches techniques et vidéos ──────────────────────────────────────────
// Les mouvements chargés passent par leur nom ; les mouvements de mobilité
// vivent dans le texte des blocs, découpé sur « + » comme le fait la vue
// séance (scripts/session/view.js).
const mobilityNames = [];
sessions.forEach(s => s.blocks.filter(b => b.kind === 'mobility').forEach(b => {
  String(b.text).split(/\s*\+\s*/).forEach(tok => {
    const name = tok.replace(/\s+\d+([\/ ].*)?$/, '').replace(/\s+\d+\s*(sec|min|reps?)\b.*$/i, '').trim();
    if(name) mobilityNames.push(name);
  });
}));
const names = Array.from(new Set(allEx.map(e => e.name).concat(mobilityNames)));
const videos = ctx.window.COACH_BERTIN_MOVEMENT_VIDEOS || {};
names.forEach(n => {
  const found = ctx.window.findCoachBertinTutorial(n);
  assert(!!found, 'fiche technique disponible pour « ' + n + ' ».');
  if(found) assert(!!videos[found.key], 'vidéo disponible pour « ' + n + ' » (fiche ' + found.key + ').');
});

console.log(failures ? ('\n' + failures + ' échec(s).') : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

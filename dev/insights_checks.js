#!/usr/bin/env node
/*
  Racine — garde-fous de l'analyse locale (scripts/insights/).

  Ce module dit à l'athlète ce que ses données disent. Deux risques, et les
  vérifications ci-dessous portent sur eux :

   1. QU'IL ÉCRIVE. C'est un lecteur. S'il écrivait, il entrerait en
      concurrence avec le journal brut, qui fait foi (DATA_FLOW_CONTRACT).
   2. QU'IL SE TROMPE EN SILENCE. Un « plateau » annoncé à tort fait changer
      un entraînement pour rien. Les seuils sont donc testés dans les deux
      sens : le cas qui doit se déclencher, ET le cas voisin qui ne doit pas.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function code(p){
  return read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(function(l){ return l.replace(/(^|[^:])\/\/.*$/, '$1'); })
    .join('\n');
}
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

// ── Câblage ────────────────────────────────────────────────────────────────
const html = read('index.html');
assert(html.indexOf('scripts/insights/index.js') !== -1, 'index.js chargé par index.html.');
assert(html.indexOf('scripts/insights/ui.js') !== -1, 'ui.js chargé par index.html.');
assert(html.indexOf('id="insightsCard"') !== -1, 'La vue Historique porte le conteneur de la carte.');
assert(read('app.js').indexOf('CoachInsightsUI.render()') !== -1, 'renderHistory appelle le rendu (délégation).');
assert(code('app.js').indexOf('CoachInsights.build') === -1,
  'app.js ne calcule rien lui-même : il ne porte que le point d\'accroche.');

// Une seule analyse, deux lecteurs : l'écran ET le prompt Coach IA.
assert(code('scripts/coach_ai/context.js').indexOf('CoachInsights.toText') !== -1,
  'Le prompt Coach IA réutilise l\'analyse au lieu d\'en refaire une.');

// ── Lecture seule ──────────────────────────────────────────────────────────
['scripts/insights/index.js', 'scripts/insights/ui.js'].forEach(function(f){
  const src = code(f);
  assert(src.indexOf('localStorage.setItem') === -1, 'Aucune écriture de stockage dans ' + f + '.');
  assert(src.indexOf('localStorage.clear') === -1, 'Aucun localStorage.clear() dans ' + f + '.');
  assert(!/(^|[^a-zA-Z.])save\s*\(/.test(src), 'Aucun appel à save() dans ' + f + '.');
  assert(src.indexOf('fetch(') === -1, 'Aucun réseau dans ' + f + ' : l\'analyse est hors-ligne.');
});
// Le domaine charge reste intouché : seule l'identité mathématique d'Epley est lue.
const idxSrc = code('scripts/insights/index.js');
assert(!/CoachCharge\.|suggestLoad|movement_tuning/.test(idxSrc),
  'L\'analyse ne touche pas au domaine charge (domaine prioritaire).');
assert(idxSrc.indexOf('epley1RM') !== -1, 'L\'analyse compare des e1RM, pas des charges brutes.');

// ── Harnais ────────────────────────────────────────────────────────────────
const ctx = {window:{}, console:console};
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(read('scripts/insights/index.js'), ctx, {filename:'insights.js'});
const CoachInsights = ctx.window.CoachInsights;

function day(offset){
  const d = new Date(2026, 8, 19);           // 2026-09-19, la date de référence
  d.setDate(d.getDate() - offset);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function serie(movement, points){
  // points : [{jours, load, reps, rpe, note}] du plus ancien au plus récent
  return points.map(function(p){
    const results = {};
    results[movement] = {load:String(p.load), reps:String(p.reps), rpe:String(p.rpe), note:p.note || ''};
    return {date: day(p.jours), week:1, day:'lundi', results:results};
  });
}
function setHistory(h){ ctx.window.state = {history:h, week:1}; }

// ── Plateau : charge plate ET RPE qui monte ───────────────────────────────
setHistory(serie('Back Squat', [
  {jours:60, load:225, reps:5, rpe:7}, {jours:53, load:225, reps:5, rpe:7},
  {jours:46, load:225, reps:5, rpe:7.5}, {jours:39, load:225, reps:5, rpe:8},
  {jours:32, load:225, reps:5, rpe:8.5}, {jours:25, load:225, reps:5, rpe:9}
]));
let d = CoachInsights.build('2026-09-19');
assert(d.plateaus.length === 1 && d.plateaus[0].label === 'Back Squat',
  'Plateau détecté : charge plate pendant que le RPE monte.');
assert(d.plateaus[0].rpeDelta > 0, 'Le plateau rapporte la hausse de RPE qui le justifie.');

// ── Pas de plateau : charge plate mais RPE STABLE ─────────────────────────
// C'est le contre-exemple qui compte. Une charge plate peut être un choix de
// programmation ; sans hausse d'effort, ce n'est pas un signal.
setHistory(serie('Back Squat', [
  {jours:60, load:225, reps:5, rpe:7}, {jours:53, load:225, reps:5, rpe:7},
  {jours:46, load:225, reps:5, rpe:7}, {jours:39, load:225, reps:5, rpe:7},
  {jours:32, load:225, reps:5, rpe:7}, {jours:25, load:225, reps:5, rpe:7}
]));
assert(CoachInsights.build('2026-09-19').plateaus.length === 0,
  'Charge plate à RPE stable n\'est PAS un plateau (pas de fausse alerte).');

// ── Progression reconnue ──────────────────────────────────────────────────
setHistory(serie('Bench Press', [
  {jours:60, load:185, reps:5, rpe:7}, {jours:53, load:185, reps:5, rpe:7},
  {jours:46, load:190, reps:5, rpe:7}, {jours:39, load:200, reps:5, rpe:7},
  {jours:32, load:205, reps:5, rpe:7}, {jours:25, load:210, reps:5, rpe:7}
]));
d = CoachInsights.build('2026-09-19');
assert(d.strengths.length === 1 && d.strengths[0].gainPct > 0, 'Une vraie progression est reconnue comme telle.');
assert(d.plateaus.length === 0, 'Une progression n\'est pas signalée comme plateau.');

// ── e1RM : un changement de format n'est pas une chute de charge ──────────
setHistory(serie('Deadlift', [
  {jours:60, load:315, reps:5, rpe:7}, {jours:53, load:315, reps:5, rpe:7},
  {jours:46, load:315, reps:5, rpe:7},
  {jours:39, load:365, reps:3, rpe:7}, {jours:32, load:365, reps:3, rpe:7}, {jours:25, load:365, reps:3, rpe:7}
]));
d = CoachInsights.build('2026-09-19');
assert(d.plateaus.length === 0,
  'Passer de 5 reps à 3 reps plus lourd n\'est pas lu comme un plateau (comparaison en e1RM).');

// ── Patrons de mouvement ─────────────────────────────────────────────────
const attendus = {
  'Back Squat':'squat', 'Front Squat':'squat', 'Bulgarian Split Squat':'squat',
  'Deadlift':'charniere', 'Romanian Deadlift':'charniere', 'Hip Thrust':'charniere', 'Power Clean':'charniere',
  'Bench Press':'poussee_horizontale', 'Ring Dip':'poussee_horizontale', 'Push-Up':'poussee_horizontale',
  'Strict Press':'poussee_verticale', 'Push Press':'poussee_verticale', 'Handstand Push-Up':'poussee_verticale',
  'Barbell Row':'tirage_horizontal', 'Ring Row':'tirage_horizontal', 'Face Pull':'tirage_horizontal',
  'Pull-Up':'tirage_vertical', 'Lat Pulldown':'tirage_vertical', 'Strict Muscle-Up':'tirage_vertical'
};
Object.keys(attendus).forEach(function(nom){
  const got = CoachInsights.patternOf(nom);
  assert(got === attendus[nom], 'Patron de « ' + nom +' » = ' + attendus[nom] + ' (obtenu ' + got + ').');
});
// Le piège : « Handstand Push-Up » contient « Push-Up ». L'ordre des règles
// doit le classer en poussée VERTICALE, pas horizontale.
assert(CoachInsights.patternOf('Handstand Push-Up') === 'poussee_verticale',
  'Handstand Push-Up ne tombe pas dans la poussée horizontale malgré « Push-Up ».');

// ── Déséquilibre poussée / tirage ────────────────────────────────────────
let h = [];
for(let i = 0; i < 10; i++) h = h.concat(serie('Bench Press', [{jours:70 - i*5, load:185, reps:5, rpe:7}]));
for(let i = 0; i < 3; i++)  h = h.concat(serie('Barbell Row', [{jours:68 - i*5, load:135, reps:8, rpe:7}]));
setHistory(h);
d = CoachInsights.build('2026-09-19');
assert(d.balance.pushPull && d.balance.pushPull.more === 'poussée',
  'Déséquilibre poussée/tirage détecté quand il est net.');
assert(d.balance.pushPull.ratio >= 1.6, 'Le ratio du déséquilibre est rapporté.');

// En dessous du seuil de matière, on se tait plutôt que de conclure sur rien.
setHistory(serie('Bench Press', [{jours:30, load:185, reps:5, rpe:7}, {jours:25, load:185, reps:5, rpe:7}]));
assert(!CoachInsights.build('2026-09-19').balance.pushPull,
  'Trop peu de données : aucun déséquilibre n\'est affirmé.');

// ── Motifs dans les notes : il en faut 3 ─────────────────────────────────
setHistory(serie('Strict Press', [
  {jours:50, load:95, reps:5, rpe:7, note:'épaule gauche qui accroche'},
  {jours:43, load:95, reps:5, rpe:7, note:'encore l\'épaule'},
  {jours:36, load:95, reps:5, rpe:7, note:'rien à signaler'}
]));
let themes = CoachInsights.build('2026-09-19').noteThemes;
assert(themes.length === 0, 'Deux mentions ne font pas un motif (seuil à 3).');

setHistory(serie('Strict Press', [
  {jours:50, load:95, reps:5, rpe:7, note:'épaule gauche qui accroche'},
  {jours:43, load:95, reps:5, rpe:7, note:'encore l\'épaule'},
  {jours:36, load:95, reps:5, rpe:7, note:'épaule sensible aujourd\'hui'}
]));
themes = CoachInsights.build('2026-09-19').noteThemes;
assert(themes.length === 1 && themes[0].key === 'epaule', 'Trois mentions font un motif.');
assert(themes[0].hits === 3 && themes[0].movements.indexOf('Strict Press') !== -1,
  'Le motif rapporte son compte et le mouvement concerné.');
// Les accents ne doivent pas faire rater un motif.
setHistory(serie('Strict Press', [
  {jours:50, load:95, reps:5, rpe:7, note:'epaule sensible'},
  {jours:43, load:95, reps:5, rpe:7, note:'ÉPAULE encore'},
  {jours:36, load:95, reps:5, rpe:7, note:'Epaule gauche'}
]));
assert(CoachInsights.build('2026-09-19').noteThemes.length === 1,
  'Les motifs de notes sont insensibles aux accents et à la casse.');

// ── Fenêtre : ce qui est vieux sort de l'analyse ─────────────────────────
setHistory(serie('Back Squat', [
  {jours:300, load:225, reps:5, rpe:7}, {jours:290, load:225, reps:5, rpe:9}
]));
assert(CoachInsights.build('2026-09-19').empty === true,
  'Au-delà de la fenêtre, l\'analyse est vide au lieu de conclure sur du vieux.');

// ── Robustesse : aucun historique, données partielles ────────────────────
setHistory([]);
assert(CoachInsights.build('2026-09-19').empty === true, 'Historique vide : sortie vide, pas de plantage.');
ctx.window.state = undefined;
assert(CoachInsights.build('2026-09-19').empty === true, 'Aucun state : sortie vide, pas de plantage.');
setHistory([{date:'pas-une-date', results:{'X':{load:'abc'}}}, {results:null}]);
assert(CoachInsights.build('2026-09-19').empty === true, 'Données illisibles : ignorées silencieusement.');

// toText reste vide quand il n'y a rien à dire (sinon il polluerait le prompt).
assert(CoachInsights.toText(CoachInsights.build('2026-09-19')) === '',
  'Sans constat, toText() ne renvoie rien à mettre dans le prompt.');

// ── Sortie ────────────────────────────────────────────────────────────────
if(errors.length){
  console.error('\n✗ insights_checks — ' + errors.length + ' échec(s) :');
  errors.forEach(function(e){ console.error('  ✗ ' + e); });
  process.exit(1);
}
console.log('✓ insights_checks — ' + notes.length + ' vérifications passées.');

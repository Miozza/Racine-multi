#!/usr/bin/env node
/*
  Racine — garde-fous de l'historique des conditionnements.

  Ce que ce fichier protège, et rien d'autre :
    1. la clé de lecture est celle de la ligne WOD des résultats (`wod_<titre>`) ;
    2. le format se lit sur le TEXTE du WOD, jamais sur le titre du bloc — les
       titres sont génériques et réutilisés (« D. Finisher » couvre sept WOD) ;
    3. le texte enregistré (`wodText`) l'emporte sur toute reconstruction ;
    4. une séance faite sous un AUTRE programme ne se reconstruit pas — on
       préfère l'absence de texte à un texte faux ;
    5. un conditionnement non fait garde son identité : `wodText` n'est pas un
       champ de performance et survit au nettoyage de wod_skip.js ;
    6. le module n'expose aucune suggestion de charge : c'est de l'affichage.
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
function assert(cond, msg){ if(cond) console.log(' - ' + msg); else errors.push(msg); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// ── Chargement du module dans un bac à sable minimal ────────────────────────
const src = read('scripts/session/wod_history.js');
const sandbox = {
  window: {},
  document: { addEventListener(){}, getElementById(){ return null; }, querySelectorAll(){ return []; } },
  setTimeout(){}
};
sandbox.window.window = sandbox.window;
// escHtml et state vivent sur window dans l'app ; le module les lit en global.
// `state` n'est VOLONTAIREMENT pas un paramètre : le module doit lire
// window.state, comme dans le navigateur. Le passer en global nu masquait un
// module qui n'aurait rien trouvé une fois chargé dans la page.
const runner = new Function('window', 'document', 'setTimeout', 'escHtml', 'focus', 'buildWorkout', src);

let fakeState = { history: [] };
let activeProgram = 'Phase 2 — Fable 5';
let builtWorkout = null;
function escHtml(v){ return String(v === undefined || v === null ? '' : v); }
function focusFn(){ return { label: activeProgram }; }
function buildWorkoutFn(){ return builtWorkout; }

function load(){
  // Dans l'app, `var state` en tête de app.js en fait un global : le module le
  // lit via window.state. Le bac à sable reproduit exactement ce chemin.
  sandbox.window = { state: fakeState }; sandbox.window.window = sandbox.window;
  runner(sandbox.window, sandbox.document, sandbox.setTimeout, escHtml, focusFn, buildWorkoutFn);
  return sandbox.window.CoachWodHistory;
}

console.log('── Historique des conditionnements ──');

// ── 1. La clé est celle de la ligne WOD des résultats ───────────────────────
let api = load();
assert(typeof api === 'object' && api, 'Le module expose window.CoachWodHistory.');
assert(api.keyFor('D. Finisher') === 'wod_D. Finisher',
  'La cle est celle de la ligne WOD des resultats (collectSessionExercises).');

// ── 2. Le format se lit sur le texte, jamais sur le titre ───────────────────
assert(api.formatOf('AMRAP 10 : 10 Wall Ball + 10 cal Row.') === 'amrap',
  'Un AMRAP est reconnu depuis son texte.');
assert(api.formatOf('EMOM 8 : min 1 = 12 cal Row ; min 2 = 6 Pull-Up.') === 'emom',
  'Un EMOM est reconnu depuis son texte.');
assert(api.formatOf('21-15-9 Thruster + Pull-Up, for time. Cap 12 min.') === 'fortime',
  'Un For Time est reconnu depuis son texte.');
assert(api.formatOf('D. Finisher') === '',
  'Un TITRE de bloc ne produit aucun format : les titres sont generiques et reutilises.');

// ── 3. Le texte enregistré l'emporte sur la reconstruction ──────────────────
// Le programme actif renverrait autre chose ; c'est le journal qui gagne
// (docs/DATA_FLOW_CONTRACT.md : journal brut > etat reconstruit).
builtWorkout = { blocks: [{kind:'wod', title:'D. Finisher', text:'TEXTE RECONSTRUIT'}] };
fakeState.history = [{
  date:'2026-09-01', actualDate:'2026-09-01', week:2, day:'friday', focus:activeProgram,
  results:{ 'wod_D. Finisher': {result:'4 rounds + 6', rpe:'8', wodText:'AMRAP 10 : 10 Wall Ball + 10 cal Row.'} }
}];
api = load();
let rows = api.rows();
assert(rows.length === 1, 'Une seance portant une ligne WOD produit une ligne d\'historique.');
assert(rows[0].text === 'AMRAP 10 : 10 Wall Ball + 10 cal Row.',
  'Le texte ENREGISTRE l\'emporte sur la reconstruction.');
assert(rows[0].rebuilt === false, 'Une ligne au texte enregistre n\'est pas marquee reconstruite.');
assert(rows[0].score === '4 rounds + 6' && rows[0].rpe === '8',
  'Le score et le RPE de la ligne sont lus tels quels.');
assert(rows[0].format === 'amrap', 'Le format vient du texte de la ligne.');

// ── 4. Sans texte enregistré : reconstruction, et seulement au bon programme ─
fakeState.history = [{
  date:'2026-08-01', actualDate:'2026-08-01', week:1, day:'friday', focus:activeProgram,
  results:{ 'wod_D. Finisher': {result:'3 rounds', rpe:'7'} }
}];
api = load();
rows = api.rows();
assert(rows[0].text === 'TEXTE RECONSTRUIT' && rows[0].rebuilt === true,
  'Sans texte enregistre, le texte est reconstruit et MARQUE comme tel.');

fakeState.history[0].focus = 'Un autre programme';
api = load();
rows = api.rows();
assert(rows[0].text === '' && rows[0].rebuilt === false,
  'Une seance faite sous un AUTRE programme ne se reconstruit pas : pas de texte faux.');

// ── 5. Le plus récent d'abord, et le filtre de format ───────────────────────
fakeState.history = [
  {date:'2026-07-01', actualDate:'2026-07-01', week:1, day:'friday', focus:activeProgram,
   results:{'wod_A':{result:'2 rounds', wodText:'AMRAP 8 : 10 cal Row + 8 Box Jump.'}}},
  {date:'2026-09-10', actualDate:'2026-09-10', week:3, day:'friday', focus:activeProgram,
   results:{'wod_B':{result:'9:12', wodText:'21-15-9 Thruster, for time.'}}}
];
api = load();
rows = api.rows();
assert(rows[0].date === '2026-09-10', 'La seance la plus recente vient en premier.');
assert(api.rows({format:'amrap'}).length === 1 && api.rows({format:'amrap'})[0].text.indexOf('AMRAP') === 0,
  'Le filtre de format ne retient que les WOD de ce format.');
assert(api.rows({format:'fortime'}).length === 1,
  'Un For Time et un AMRAP ne se melangent pas : ce ne sont pas la meme unite.');

// ── 6. Un conditionnement non fait garde son identité ───────────────────────
fakeState.history = [{
  date:'2026-09-12', actualDate:'2026-09-12', week:3, day:'friday', focus:activeProgram,
  results:{ 'wod_D. Finisher': {skipped:'1', skipReason:'Chaleur extrême', wodText:'AMRAP 10 : 10 Wall Ball.'} }
}];
api = load();
rows = api.rows();
assert(rows[0].skipped === true && rows[0].skipReason === 'Chaleur extrême',
  'Une ligne annulee se lit comme annulee, avec son motif.');
assert(rows[0].text === 'AMRAP 10 : 10 Wall Ball.',
  'Un WOD non fait dit quand meme LEQUEL n\'a pas ete fait.');

// `wodText` ne doit jamais rejoindre la liste des champs de performance :
// ce n'est pas une performance, c'est l'identite du conditionnement.
const skipSrc = read('scripts/session/wod_skip.js');
const perfLine = (skipSrc.match(/var PERFORMANCE_FIELDS = \[[^\]]*\]/) || [''])[0];
assert(perfLine && perfLine.indexOf('wodText') === -1,
  'wodText n\'est PAS un champ de performance : il survit au nettoyage d\'une ligne annulee.');

// ── 7. Le module reste de l'affichage ───────────────────────────────────────
// Un resultat de WOD ne remplace jamais une capacite principale (CLAUDE.md
// § 3.2). Le module ne doit donc toucher ni au moteur de charges ni a l'etat.
assert(!/CoachCharge|athlete_state|suggestForExercise|updateAthleteState/.test(src),
  'Le module ne touche pas au moteur de charges : c\'est de l\'affichage.');
assert(!/localStorage/.test(src),
  'Le module n\'ecrit aucune cle de stockage : il lit state.history.');

// ── 8. Le champ est bien ecrit par la carte WOD des resultats ───────────────
const resultsSrc = read('scripts/session/results.js');
assert(/data-field="wodText"/.test(resultsSrc),
  'La carte WOD des resultats enregistre le texte du WOD avec le score.');

if(errors.length){
  console.error('\n✗ ' + errors.length + ' echec(s) :');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n✓ Historique des conditionnements : tous les garde-fous passent.');

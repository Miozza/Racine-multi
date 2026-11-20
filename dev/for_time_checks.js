#!/usr/bin/env node
/*
  Racine — contrat « pour le temps » (wodIsForTime, app.js).

  Ce que ce fichier protège :
    1. Un WOD pour le temps se reconnaît en anglais ET en français
       (« For Time », « Pour le temps », « RFT », « cap 14 », « (cap 14) »).
       Rapport du 2026-11-03 : « Pour le temps : 50 cal Bike » n'avait pas de
       champ de temps.
    2. « scapula », « capacité » ne sont plus pris pour un cap ; AMRAP, EMOM
       et aérobie ne sont pas des For Time.
    3. Une seule source : résultats, chrono, pastilles, rounds et historique
       passent tous par wodIsForTime — plus de regex recopiée.
    4. Le temps du chrono est noté à la pause et arrive présélectionné dans
       Résultats ; le corriger là remplace le temps noté.
    5. Tous les WOD du programme actif « Moteur + jambes » qui disent « pour le
       temps » sont détectés.
    6. Un « pour le temps » en plusieurs tours se compte en tours (séance du
       2026-11-20 : « 5 tours, cap 25 min », rien n'était compté et rien ne
       se notait au cap). Au cap, le score = tours + reps du tour en cours,
       et le temps choisi revient intact si l'athlète repasse sur « Fini ».

  Usage :
    node dev/for_time_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
let passed = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(cond) passed++; else errors.push(msg); }

const app = read('app.js');
const fnSrc = (app.match(/function wodIsForTime\([\s\S]*?\n\}/) || [''])[0];
assert(fnSrc, 'wodIsForTime existe dans app.js.');
const ctx = {};
vm.runInNewContext(fnSrc + '; this.f = wodIsForTime;', ctx);
const f = ctx.f;

// ─── 1-2. Détection ───────────────────────────────────────────────────────
[
  'Pour le temps : 50 cal Bike. Référence du bloc, re-test en S5.',
  'Re-test pour le temps : 50 cal Bike.',
  'For Time cap 14 : 5 rounds 12 KB Swings',
  'For time 21-15-9 : Cal Bike + Box Step',
  '3 RFT : 10 Shuttle Runs de 10 m, 15 Air Squats.',
  '21-15-9 : Wall Balls 20 lb, Burpees (cap 14).',
  'Chipper : 50 cal Row, 50 Air Squats. Cap 30 min.'
].forEach(t => assert(f(t), 'Pour le temps : « ' + t + ' »'));
[
  'AMRAP 7 : 12 cal Row, 10 KB Swings.',
  'EMOM 10 : 7 Burpees poids du corps chaque minute.',
  'Moteur aérobie, 24 min sans arrêt : 10 min Bike, 4 min Row, 10 min Bike.',
  'Scap Push-Up 2×10 + Band Pull-Apart 2×15',
  'Gymnastics + engine intervals : capacité respiratoire.'
].forEach(t => assert(!f(t), 'Pas un For Time : « ' + t + ' »'));

// ─── 3. Source unique ─────────────────────────────────────────────────────
const results = read('scripts/session/results.js');
assert(/isForTime:\(typeof wodIsForTime==="function"\?wodIsForTime\(wodText\)/.test(results), 'Résultats : champ de temps via wodIsForTime.');
assert(/else if\(wodIsForTime\(txt\)\)\{label="CAP /.test(app), 'Chrono montant via wodIsForTime.');
assert(/if\(wodIsForTime\(text\)\) return \{min:1,max:1,def:1\}/.test(app), 'Estimation des rounds via wodIsForTime.');
assert(/wodIsForTime\(t\)/.test(read('scripts/session/wod_history.js')), 'Filtre de l\'historique via wodIsForTime.');
assert(!/\/for time\|cap\/i\.test/.test(app), 'Plus aucune regex « for time|cap » dans app.js.');

// ─── 4. Temps du chrono ───────────────────────────────────────────────────
const timer = read('scripts/session/timer.js');
assert(/function pauseGuidedTimer\(\)\{[^}]*guidedTimerRecordForTime\(\);\}/.test(timer), 'La pause du chrono note le temps.');
assert(/setGuidedResult\("wod_"\+st\.title,"result",clock\)/.test(timer), 'Le temps est noté sous la clé de la ligne WOD.');
assert(/mode!=="up"/.test(timer) && /wodIsForTime\(st\.text\)/.test(timer), 'Seulement un chrono montant d\'un WOD pour le temps.');
assert(/getGuidedResult\(item\.key,'result',''\)/.test(results) && /setGuidedResult\(it\.key,'result',timeSel\.value\)/.test(results),
  'Résultats : temps du chrono présélectionné, et une correction le remplace.');

// ─── 5. Programme Moteur + jambes ─────────────────────────────────────────
// Les metcons sont structurés (programs/wod_format.js) : on lit le texte RENDU
// par le programme, celui que voient chrono et résultats, pas le source.
const mjCtx = {console}; mjCtx.window = mjCtx; vm.createContext(mjCtx);
['programs/wod_format.js', 'programs/moteur_jambes.js'].forEach(f => vm.runInContext(read(f), mjCtx, {filename:f}));
const mjP = mjCtx.COACH_BERTIN_PROGRAMS.moteur_jambes;
const texts = Array.from(new Set([1,2,3,4,5].flatMap(w => ['lundi','mardi','jeudi','vendredi']
  .flatMap(d => mjP.getBlocks(d, w).filter(b => b.kind === 'wod').map(b => b.text)))))
  .filter(t => /[Pp]our le temps/.test(t));
assert(texts.length >= 3, 'Moteur + jambes contient des WOD « pour le temps » (' + texts.length + ').');
texts.forEach(t => assert(f(t), 'Moteur + jambes détecté : « ' + t.slice(0, 60) + ' »'));

// ─── 6. Pour le temps en plusieurs tours ──────────────────────────────────
const rCtx = {console}; rCtx.window = rCtx; rCtx.wodIsForTime = f; vm.createContext(rCtx);
vm.runInContext(read('scripts/session/amrap_rounds.js'), rCtx, {filename:'amrap_rounds.js'});
const AR = rCtx.CoachAmrapRounds;
assert(AR.forTimeRounds('Pour le temps, 5 tours : 20 cal Bike, 20 Air Squats. Cap 25 min.') === 5, 'Tours prévus : « 5 tours » → 5.');
assert(AR.forTimeRounds('For time 21-15-9 : thrusters, pull-ups.') === 3, 'Échelle 21-15-9 → 3 tours.');
assert(AR.forTimeRounds('Pour le temps : 50 cal Bike.') === 0 && AR.forTimeRounds('Chipper pour le temps : 50 cal Row, 50 Air Squats. Cap 30 min.') === 0, 'Un seul tour (benchmark, chipper) : rien à compter.');
assert(AR.forTimeRounds('EMOM 16 en 4 stations, une station par minute, 4 tours : 8 Burpees.') === 0 && AR.forTimeRounds('AMRAP 20 : 3 rounds de…') === 0, 'EMOM et AMRAP ne sont pas des « pour le temps ».');
assert(AR.isRoundCountBlock({kind:'wod', text:'AMRAP 20 : 12 cal Row'}) && AR.isRoundCountBlock({kind:'wod', text:'Pour le temps, 5 tours : 20 cal Bike. Cap 25 min.'}) && !AR.isRoundCountBlock({kind:'wod', text:'Pour le temps : 50 cal Bike.'}), 'Le chrono compte les tours d\'un AMRAP et d\'un « pour le temps » en plusieurs tours.');
const mjFri = mjP.getBlocks('vendredi', 3).filter(b => b.kind === 'wod')[0];
assert(AR.forTimeRounds(mjFri.text) === 5, 'Moteur + jambes S3 vendredi : 5 tours comptés.');
const view = read('scripts/session/view.js');
assert(/CoachAmrapRounds\.isRoundCountBlock\(st\)/.test(view), 'La séance guidée arme le compteur de tours sur isRoundCountBlock.');
assert(/data-capmode="cap">Cap atteint/.test(results) && /data-field="capped"/.test(results) && /'Cap'\+\(capSecTxt/.test(results), 'Résultats : « Fini / Cap atteint », score au cap = tours + reps.');
assert(/guidedResultCache\[it\.key\]\.result = capStr/.test(results) && /forTimeClock/.test(results), 'Au cap, le score ne remplace pas le temps choisi (retour sur « Fini » intact).');

if(errors.length){
  console.error('✗ for_time_checks — ' + errors.length + ' échec(s) :');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✓ for_time_checks — ' + passed + ' vérifications.');

#!/usr/bin/env node
/*
  Racine — contrat de la saisie cardio (scripts/session/wod_cardio.js).

  Ce que ce fichier protège (le contrat, pas l'inventaire) :
    1. Le texte du WOD donne les morceaux machine (« 10 min Bike, 4 min Row »,
       « … puis …, 2 fois ») — et une quantité imposée d'AMRAP (« 12 cal Row »)
       n'en est pas un.
    2. Le champ durable `cardio` est un texte qui se relit à l'identique.
    3. Les moyennes : rythme pondéré (total ÷ minutes) et meilleur rythme, par
       machine ET par unité — calories et mètres ne se mélangent jamais.
    4. Une séance d'avant ce champ se lit dans sa note seulement si le nombre
       de valeurs correspond exactement aux morceaux.
    5. La collecte donne un score à un moteur aérobie, sans jamais écraser un
       score AMRAP / For Time ; une ligne annulée perd aussi `cardio`.
    6. Le module ne touche pas aux charges et est branché partout où il faut.

  Usage :
    node dev/wod_cardio_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
let passed = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(cond) passed++; else errors.push(msg); }

const ctx = { console, Math, JSON, Number, String, Array, Object, RegExp, isFinite, parseFloat, document: {} };
ctx.window = ctx;
vm.runInNewContext(read('scripts/session/wod_cardio.js'), ctx, { filename: 'wod_cardio.js' });
vm.runInNewContext(read('scripts/session/wod_skip.js'), ctx, { filename: 'wod_skip.js' });
const C = ctx.window.CoachWodCardio;
assert(!!C, 'La porte publique window.CoachWodCardio existe.');

// ─── 1. Morceaux machine ──────────────────────────────────────────────────
const WOD = 'Moteur aérobie, 24 min sans arrêt : 10 min Bike, 4 min Row, 10 min Bike. Rythme conversation.';
const segs = C.parseSegments(WOD);
assert(segs.map(s => s.machine + s.minutes).join(',') === 'Bike10,Row4,Bike10',
  'Trois morceaux lus dans « 10 min Bike, 4 min Row, 10 min Bike » (obtenu ' + JSON.stringify(segs) + ').');
assert(C.parseSegments('20 min sans arrêt : 5 min Bike puis 5 min Row, 2 fois.').length === 4, '« …, 2 fois » répète la séquence.');
assert(C.parseSegments('AMRAP 7 : 12 cal Row, 10 KB Swings.').length === 0, 'Une quantité imposée d\'AMRAP n\'est pas un morceau à mesurer.');
assert(C.parseSegments('EMOM 8 : minutes impaires 12 cal Row ; minutes paires 12 Goblet Squats.').length === 0, '« minutes impaires » n\'est pas une durée.');
assert(C.parseSegments('10 min Row zone 2').length === 1 && C.parseSegments('6 km course : 30 min de course').length === 1, 'Row et course reconnus.');

// ─── 2. Texte durable ─────────────────────────────────────────────────────
const rows = [{machine:'Bike', minutes:10, value:86, unit:'cal'}, {machine:'Row', minutes:4, value:51, unit:'cal'},
              {machine:'Bike', minutes:10, value:74, unit:'cal'}, {machine:'Row', minutes:5, value:0, unit:'cal'}];
const text = C.serialize(rows);
assert(text === 'Bike 10 min 86 cal · Row 4 min 51 cal · Bike 10 min 74 cal', 'Texte durable lisible, morceau vide omis (obtenu « ' + text + ' »).');
assert(C.serialize(C.parse(text)) === text, 'Le texte se relit à l\'identique.');
assert(C.parse('Row 2000 m')[0].unit === 'm' && !C.parse('Row 2000 m')[0].minutes, 'Mètres sans durée acceptés.');

// ─── 3. Moyennes ──────────────────────────────────────────────────────────
const history = [
  { date:'2026-10-26', results:{ 'wod_B. Moteur aérobie':{ cardio:'Bike 6 min 58 cal · Row 5 min 72 cal · Bike 6 min 61 cal · Row 5 min 73 cal' } } },
  { date:'2026-11-02', results:{ 'wod_B. Moteur aérobie':{ cardio:text } } },
  { date:'2026-11-03', results:{ 'wod_C. Row':{ cardio:'Row 8 min 2000 m' } } }
];
const st = C.stats(history);
const bike = st.find(s => s.machine === 'Bike' && s.unit === 'cal');
const rowM = st.find(s => s.machine === 'Row' && s.unit === 'm');
assert(bike && bike.sessions === 2 && Math.abs(bike.avgRate - (58+61+86+74)/32) < 1e-9, 'Bike : moyenne pondérée total ÷ minutes sur 2 séances.');
assert(bike && Math.abs(bike.bestRate - 61/6) < 1e-9, 'Bike : meilleur rythme = capacité observée.');
assert(rowM && rowM.avgRate === 250 && st.find(s => s.machine === 'Row' && s.unit === 'cal').sessions === 2, 'Calories et mètres ne se mélangent pas.');
assert(C.rateText(250, 'm', 'Row') === '250 m/min (2:00 /500 m)', 'Row en mètres : split au 500 m.');
assert(C.totalText("Bike 10 min 86 cal · Row 2000 m") === "86 cal + 2000 m", "Total par unité.");
assert(C.contextLines(history).join('\n').indexOf('Bike (cal) : ') >= 0, 'Coach IA reçoit les repères par machine.');

// ─── 4. Notes d'avant ce champ ────────────────────────────────────────────
const old = { wodText: WOD, note: '86 calories plus 51 calories plus 74', rpe: '8' };
assert(C.fromNote(old).map(r => r.value).join(',') === '86,51,74', 'Note « 86 calories plus 51 calories plus 74 » lue sur les trois morceaux.');
assert(C.rowsOf(old).fromNote === true, 'Une valeur lue dans la note est marquée comme telle.');
assert(C.fromNote({ wodText: WOD, note: 'environ 65 pour 70 calories' }).length === 0, 'Nombre de valeurs différent des morceaux : rien n\'est deviné.');
assert(C.fromNote({ wodText: WOD, note: '86 51 74' }).length === 0, 'Sans le mot « cal », rien n\'est deviné.');
assert(C.rowsOf({ wodText: WOD, note: old.note, skipped: '1' }).rows.length === 0, 'Un WOD non fait ne compte pas.');

// ─── 5. Collecte ──────────────────────────────────────────────────────────
const res = {
  'wod_B. Moteur aérobie': { cardio: 'Bike 10 min 86 cal · Row 4 min 51 cal', rpe: '8' },
  'wod_C. Metcon': { result: '4 rounds + 6 Push-Up', rounds: '4', cardio: 'Bike 6 min 60 cal' },
  'wod_D. EMOM': { result: 'EMOM complété', cardio: 'Row 10 min 120 cal' },
  'wod_E. Vide': { cardio: 'n\'importe quoi' }
};
C.finalizeResults(res);
assert(res['wod_B. Moteur aérobie'].result === 'Bike 10 min 86 cal · Row 4 min 51 cal', 'Moteur aérobie : les calories deviennent le score.');
assert(res['wod_C. Metcon'].result === '4 rounds + 6 Push-Up', 'Un score AMRAP n\'est jamais remplacé.');
assert(res['wod_D. EMOM'].result === 'EMOM complété · Row 10 min 120 cal', 'EMOM : les calories s\'ajoutent au marqueur.');
assert(res['wod_E. Vide'].cardio === undefined, 'Un texte illisible n\'entre pas dans le journal.');
const skipped = { 'wod_X': { cardio: 'Bike 10 min 86 cal', skipped: '1', skipReason: 'Manque de temps' } };
ctx.window.CoachWodSkip.stripPerformanceFields(skipped);
assert(skipped['wod_X'].cardio === undefined, 'Une ligne annulée ne garde pas de calories.');

// ─── 6. Frontières et branchements ────────────────────────────────────────
const src = read('scripts/session/wod_cardio.js');
assert(!/CoachCharge|movementRefs|athlete_state|localStorage|fetch\(/.test(src), 'Le module ne touche ni aux charges, ni au stockage, ni au réseau.');
const results = read('scripts/session/results.js');
assert(/CoachWodCardio\.controlHtml/.test(results) && /CoachWodCardio\.finalizeResults\(results\)[\s\S]*stripPerformanceFields/.test(results),
  'Carte WOD branchée, et la normalisation passe avant le nettoyage d\'une ligne annulée.');
assert(/CoachWodCardio/.test(read('scripts/session/history_edit.js')), 'L\'édition d\'une séance passée permet de saisir les calories.');
assert(/CoachWodCardio\.contextLines/.test(read('scripts/coach_ai/context.js')), 'Coach IA lit les repères cardio.');
assert(/<script src="scripts\/session\/wod_cardio\.js\?v=[^"]+" defer><\/script>/.test(read('index.html')), 'index.html charge le module.');

if(errors.length){
  console.error('✗ wod_cardio_checks — ' + errors.length + ' échec(s) :');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✓ wod_cardio_checks — ' + passed + ' vérifications.');

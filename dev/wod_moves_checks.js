#!/usr/bin/env node
/*
  Racine — garde-fous : pastilles de mouvements du WOD (guided-wod-moves).

  Contrat protégé ici — parseWodStructure() alimente à la fois les pastilles de
  la vue séance et la capture de résultats, donc une erreur d'analyse se voit
  deux fois :

    1. Une pastille = UN mouvement. Le texte se découpe sur « + », « ; » et
       « puis ». Sans ça, « 8 calories vélo ou rameur ; minutes paires :
       6 burpees » ne faisait qu'une pastille dont le nom débordait, et le
       burpee — la moitié du WOD — n'apparaissait nulle part.
    2. Une étiquette de position (« minutes paires : », « station 3 : ») n'est
       pas le nom du mouvement, mais on ne la retire que si un nombre suit.
    3. Un nombre suivi d'une unité de temps est une DURÉE, pas des répétitions :
       « 10 à 15 min de marche inclinée » ne produit aucune pastille. Le bloc
       affiche alors son texte complet, ce qui est le rendu juste.
    4. Le nom s'arrête au premier connecteur de consigne et ne dépasse jamais
       WOD_NAME_MAX caractères : .guided-wod-name ne tronque pas, un nom long
       déborde de la pastille (docs/UI_CONSTRAINTS.md).
    5. « avec » n'est PAS un connecteur : il appartient à de vrais noms de
       mouvement (« Marche avec haltères »).

  Usage : node dev/wod_moves_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const app = read('app.js');

// ── Extraction des fonctions d'analyse depuis app.js ────────────────────────
// app.js n'est pas un module : on isole les déclarations par équilibrage
// d'accolades, puis on les exécute dans un bac à sable sans DOM.
function extractFunction(src, name){
  const start = src.indexOf('function ' + name + '(');
  if(start < 0) return null;
  let depth = 0, i = src.indexOf('{', start);
  if(i < 0) return null;
  for(let j = i; j < src.length; j++){
    const c = src[j];
    if(c === '{') depth++;
    else if(c === '}'){ depth--; if(depth === 0) return src.slice(start, j+1); }
  }
  return null;
}

const NAMES = ['splitWodSegments','stripWodSegmentLabel','parseWodLeadingReps','boundWodMoveName','parseWodStructure'];
const CONSTS = [
  ['WOD_TIME_UNIT_RE',     /var WOD_TIME_UNIT_RE\s*=\s*[^\n]+\n/],
  ['WOD_DURATION_PREP_RE', /var WOD_DURATION_PREP_RE\s*=\s*[^\n]+\n/],
  ['WOD_NAME_MAX',         /var WOD_NAME_MAX\s*=\s*\d+;/]
];
const sandbox = {};
vm.createContext(sandbox);
CONSTS.forEach(function(pair){
  const m = app.match(pair[1]);
  assert(!!m, 'app.js : ' + pair[0] + ' déclaré');
  if(m) vm.runInContext(m[0], sandbox, {filename:'app.js'});
});
NAMES.forEach(function(n){
  const src = extractFunction(app, n);
  assert(!!src, 'app.js : ' + n + '() existe');
  if(src) vm.runInContext(src, sandbox, {filename:'app.js'});
});
if(failures){ console.error('\n' + failures + ' échec(s) — extraction impossible, analyse interrompue.'); process.exit(1); }

const parse = sandbox.parseWodStructure;
const bound = sandbox.boundWodMoveName;
const names = m => (m||[]).map(x => x.name);
const reps  = m => (m||[]).map(x => x.reps);

// ── 1. Cas réel : EMOM à minutes alternées (programs/retour_au_travail.js) ──
const emom = parse("EMOM 10 min — minutes impaires : 8 calories vélo ou rameur ; minutes paires : 6 burpees contrôlés. Rythme modéré, respiration sous contrôle.");
assert(emom && emom.length === 2, 'EMOM alterné : deux pastilles, pas une (obtenu ' + (emom ? emom.length : 0) + ')');
assert(reps(emom).join(',') === '8,6', 'EMOM alterné : reps 8 puis 6 (obtenu ' + reps(emom).join(',') + ')');
assert(emom && /rameur/i.test(emom[0].name) && !/paires|burpees/i.test(emom[0].name),
  'EMOM alterné : le 1er nom n\'avale pas la suite de la phrase (obtenu « ' + (emom ? emom[0].name : '') + ' »)');
assert(emom && /burpees/i.test(emom[1].name), 'EMOM alterné : le burpee a sa propre pastille');

// ── 2. Cas réel : durée, pas des reps (programs/retour_au_travail.js) ───────
const walk = parse("10 à 15 min de marche inclinée ou de vélo facile. Zone 2, respiration nasale si possible. Aucune intensité.");
assert(walk === null, 'Durée « 10 à 15 min » : aucune pastille (obtenu ' + JSON.stringify(names(walk)) + ')');
assert(parse("3 min de vélo facile") === null, 'Durée « 3 min » : aucune pastille');
assert(parse("45 sec de gainage") === null, 'Durée « 45 sec » : aucune pastille');
assert(parse("30 s de repos") === null, 'Durée « 30 s » : aucune pastille');

// … mais une dose de temps sur un vrai mouvement garde sa pastille : sans cette
// nuance, « 20 sec side plank/côté » disparaissait du WOD au lieu d'être corrigé.
const plank = parse("2 rondes : 8 dead bug/côté + 20 sec side plank/côté.");
assert(plank && plank.length === 2, 'Dose de temps : le side plank garde sa pastille');
assert(plank && plank[1].reps === '20' && plank[1].name === 'side plank/côté',
  'Dose de temps : l\'unité quitte le nom (obtenu « ' + (plank ? plank[1].reps + ' / ' + plank[1].name : '') + ' »)');

// « é » n'est pas un caractère de mot : `^s\b` matchait « séries ».
const series = parse("Activation : 2 séries progressives de front squat");
assert(series && series.length === 1 && /séries/.test(series[0].name),
  '« 2 séries progressives » n\'est pas lu comme une durée en secondes');

// ── 3. Non-régression : les formats déjà bons restent identiques ────────────
const amrap = parse("AMRAP 12 : 10 wall balls + 8 burpees + 12 kettlebell swings");
assert(amrap && amrap.length === 3, 'AMRAP « + » : trois pastilles (obtenu ' + (amrap ? amrap.length : 0) + ')');
assert(reps(amrap).join(',') === '10,8,12', 'AMRAP « + » : reps inchangées');

const emomNum = parse("EMOM 12 : min 1 = 12 cal row ; min 2 = 10 ring rows stricts");
assert(emomNum && emomNum.length === 2, 'EMOM « min 1 = » : deux pastilles');
assert(emomNum && emomNum[0].name === 'Cal Row', 'EMOM « min 1 = » : « Cal Row » conservé');

const ft = parse("For time 21-15-9 : thrusters + pull-ups. Cap 12 min.");
assert(ft && ft.length === 2, 'For time 21-15-9 : deux pastilles');
assert(ft && ft[0].reps === '21-15-9', 'For time 21-15-9 : la pyramide reste le libellé de reps');

// ── 4. Bornes du nom ───────────────────────────────────────────────────────
const long = parse("AMRAP 10 : 10 wall balls, garde le buste droit et respire en haut");
assert(long && long[0].name === 'wall balls',
  'Nom borné à la virgule de consigne (obtenu « ' + (long ? long[0].name : '') + ' »)');
assert(bound('Marche avec haltères') === 'Marche avec haltères',
  '« avec » n\'est pas un connecteur : « Marche avec haltères » reste entier');
assert(bound('Goblet squat puis fentes') === 'Goblet squat', '« puis » coupe le nom');
const veryLong = bound('Développé militaire debout à la barre olympique');
assert(veryLong.length <= sandbox.WOD_NAME_MAX + 1, 'Nom très long plafonné (obtenu ' + veryLong.length + ' caractères)');
assert(/…$/.test(veryLong), 'Nom tronqué signalé par une ellipse');
assert(bound(veryLong) === veryLong, 'Bornage idempotent : pas de « …… » au second passage');

// ── 5. Étiquette de position ───────────────────────────────────────────────
assert(sandbox.stripWodSegmentLabel('minutes paires : 6 burpees') === '6 burpees',
  'Étiquette « minutes paires : » retirée quand un nombre suit');
assert(sandbox.stripWodSegmentLabel('Row : rythme facile') === 'Row : rythme facile',
  'Étiquette conservée quand aucun nombre ne suit (pas de texte coupé à tort)');

// ── 6. La vue résultats ne calcule plus sur un libellé ─────────────────────
const results = read('scripts/session/results.js');
assert(/function wodMoveMaxReps\(/.test(results), 'results.js : wodMoveMaxReps() existe');
assert(/wodMoveMaxReps\(mv\.reps\)/.test(results),
  'results.js : les pastilles de reps du dernier round passent par wodMoveMaxReps (sinon NaN sur « 21-15-9 »)');

console.log(failures ? '\n' + failures + ' échec(s).' : '\nTous les garde-fous passent.');
process.exit(failures ? 1 : 0);

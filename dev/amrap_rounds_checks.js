#!/usr/bin/env node
/*
  Racine — garde-fous : rounds AMRAP tapés sur le chrono.

  Contrat protégé ici :
    1. Le comptage vit dans son propre domaine (scripts/session/amrap_rounds.js,
       porte window.CoachAmrapRounds), chargé avant la vue séance.
    2. Un tap n'est un round que si le chrono a avancé d'au moins une seconde :
       deux taps dans la même seconde affichée ne peuvent pas être deux rounds,
       et un split nul fausserait le classement rapide/lent.
    3. Le classement rapide/lent n'existe qu'à partir de deux splits distincts.
    4. Le temps restant retenu est celui du DERNIER round tapé : c'est le temps
       dont l'athlète disposait pour les reps du round entamé.
    5. Le panneau reste AU-DESSUS de la boîte du chrono, jamais dedans — la
       taille des chiffres se calcule sur la largeur (docs/UI_CONSTRAINTS.md).
       Banderole d'une ligne à pastilles hautes : ~3 temps visibles, puis
       défilement collé aux derniers. Une pastille ne porte QUE le numéro et
       le temps — pas d'étiquette, la couleur le dit. Numéro en Inter, temps
       en Orbitron. La place vient des cartes de mouvement, qui ne se replient
       qu'une fois le WOD lancé et ne rendent QUE la hauteur de la banderole :
       toute hauteur libérée en trop part dans l'étirement vertical du chrono,
       qui se mettrait à grossir au premier round sans qu'on l'ait demandé.
    6. L'écran Résultats reprend le compte tapé et le rend sélectionnable même
       s'il dépasse l'estimation du programme.
    7. Rien n'est persisté par le module : ce qui survit part par la ligne WOD
       de l'écran Résultats, en champs texte ordinaires.

  Usage : node dev/amrap_rounds_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const mod = read('scripts/session/amrap_rounds.js');
const view = read('scripts/session/view.js');
const timer = read('scripts/session/timer.js');
const results = read('scripts/session/results.js');
const html = read('index.html');
const css = read('styles.css');

// ── Lecture de valeurs CSS ─────────────────────────────────────────────────
// Un garde-fou d'interface doit épingler un CONTRAT, pas un pixel. Épingler
// « font-size:27px » oblige à réécrire le test au moindre ajustement de design
// — mesuré : ce fichier a été réécrit 4 fois en une session pour des
// renommages, sans qu'aucun bug n'existe. On teste donc des bornes et des
// relations : elles survivent aux retouches et cassent quand le contrat casse.
function cssPx(selector, prop){
  const sel = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const rule = css.match(new RegExp(sel + '\\s*\\{([^}]*)\\}'));
  if(!rule) return null;
  const v = rule[1].match(new RegExp(prop + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px'));
  return v ? Number(v[1]) : null;
}


// ── 1. Domaine et chargement ───────────────────────────────────────────────
assert(/window\.CoachAmrapRounds\s*=/.test(mod), 'amrap_rounds.js : porte publique window.CoachAmrapRounds');
const iAmrap = html.indexOf('scripts/session/amrap_rounds.js');
const iView = html.indexOf('scripts/session/view.js');
assert(iAmrap > -1, 'index.html : module chargé');
assert(iAmrap > -1 && iView > -1 && iAmrap < iView, 'index.html : amrap_rounds.js chargé avant view.js');
assert(!/localStorage/.test(mod), 'amrap_rounds.js : aucune clé de stockage créée (mémoire vive seulement)');

// ── 2/3/4. Logique de comptage, exécutée pour de vrai ──────────────────────
const sandbox = { window: {}, document: { getElementById: () => null } };
vm.createContext(sandbox);
vm.runInContext(mod, sandbox);
const R = sandbox.window.CoachAmrapRounds;
assert(!!R, 'module évaluable hors navigateur');

const KEY = R.keyFor('Metcon');
assert(KEY === 'wod_Metcon', 'keyFor() colle à la clé de la ligne WOD des résultats (wod_<titre>)');

R.tap(KEY, 70, 600);   // R1 : 1:10
R.tap(KEY, 70, 600);   // même seconde → refusé
R.tap(KEY, 65, 600);   // en arrière → refusé
assert(R.count(KEY) === 1, 'un tap dans la même seconde (ou en arrière) n\'ajoute pas de round');

R.tap(KEY, 195, 600);  // R2 : 2:05 (le plus lent)
R.tap(KEY, 255, 600);  // R3 : 1:00 (le plus rapide)
let st = R.stats(KEY);
assert(st.count === 3, 'trois rounds comptés');
assert(st.rounds.map(r => r.split).join(',') === '70,125,60', 'les splits sont des écarts, pas des temps absolus');
assert(st.fastestIndex === 2, 'le round le plus rapide est repéré');
assert(st.slowestIndex === 1, 'le round le plus lent est repéré');
assert(st.lastRemaining === 345, 'le temps restant retenu est celui du dernier round tapé');
assert(R.resultSuffix(KEY).indexOf('5:45') > -1, 'le résultat lisible porte le temps restant du dernier round');
assert(R.splitsText(KEY) === '1:10 / 2:05 / 1:00', 'les splits partent dans leur propre champ, formatés comme le chrono');

R.undo(KEY);
assert(R.count(KEY) === 2, 'undo retire le dernier round');

R.reset(KEY);
R.tap(KEY, 90, 300);
st = R.stats(KEY);
assert(st.fastestIndex === -1 && st.slowestIndex === -1, 'un round seul n\'est ni le plus rapide ni le plus lent');
assert(R.resultSuffix(KEY).indexOf('3:30') > -1, 'temps restant calculé sur la durée du chrono en cours');

R.reset(KEY);
R.tap(KEY, 300, 300);
assert(R.resultSuffix(KEY) === '', 'un round tombé sur la fin du chrono n\'annonce aucun temps restant');
R.resetAll();
assert(R.count(KEY) === 0, 'resetAll() vide le comptage (nouvelle séance)');

// ── 5. Placement dans la carte WOD ─────────────────────────────────────────
const iPanel = view.indexOf("guided-amrap-panel");
const iBox = view.indexOf("class='guided-wod-timer'");
assert(iPanel > -1 && iBox > -1 && iPanel < iBox,
  'view.js : le panneau des rounds est rendu AVANT la boîte du chrono, pas dedans');
// Banderole d'une ligne : la lisibilité du temps prime sur le nombre de
// pastilles visibles, et une ligne coûte deux fois moins de hauteur qu'une
// grille — c'est cette hauteur qui garde les mouvements lisibles.
assert(/\.guided-amrap-cells\{[\s\S]{0,220}overflow-x:auto/.test(css),
  'styles.css : les splits sont sur une ligne qui défile, pas en grille');
// Le contrat n'est pas « 27 px » : c'est « lisible à bout de bras, et c'est le
// TEMPS qu'on lit, pas le numéro ».
const splitPx = cssPx('.guided-amrap-split', 'font-size');
const noPx = cssPx('.guided-amrap-no', 'font-size');
assert(splitPx !== null && noPx !== null, 'styles.css : pastille de round mesurable (temps + numéro)');
assert(splitPx >= 20, 'styles.css : le temps de round reste lisible à bout de bras (≥ 20 px, vu ' + splitPx + ')');
assert(splitPx > noPx * 1.5, 'styles.css : le temps domine le numéro de round (' + splitPx + ' contre ' + noPx + ')');
// Deux polices : un numéro de round ne doit jamais se lire comme un chrono.
assert(/\.guided-amrap-no\{[\s\S]{0,120}font-family:var\(--font-main\)/.test(css),
  'styles.css : le numéro de round est en Inter, pas en Orbitron comme le temps');
assert(/\.guided-amrap-split\{[\s\S]{0,60}font-family:var\(--font-hud\)/.test(css),
  'styles.css : le temps de round reste en Orbitron');
// L'étiquette « le + rapide » est redondante avec la couleur : elle a été
// retirée, et la place gagnée est passée dans la taille du temps.
assert(!/guided-amrap-tag/.test(mod) && !/guided-amrap-tag/.test(css),
  'la pastille ne porte aucune étiquette — la couleur dit le classement');
assert(/'<span class=.guided-amrap-no.>' \+ \(i \+ 1\)/.test(mod.replace(/"/g, "'")),
  'amrap_rounds.js : la pastille affiche « 1 », pas « R1 »');
// Les mouvements ne rendent QUE la hauteur de la banderole. Toute hauteur
// libérée en trop part dans l'étirement vertical du chrono, qui se met alors à
// grossir au premier round sans qu'on l'ait demandé.
// « Repliés » ne veut pas dire « écrasés ». Planchers volontairement bas
// (~0,8 fois la pleine taille : 44 px de reps, 30 px de nom) : ils laissent
// respirer le design et attrapent quand même l'accident réel — les 19/15 px
// d'une version précédente, qui rendaient tant de hauteur que le chrono se
// mettait à grossir tout seul au premier round.
// La vraie vérification est la mesure navigateur à temps affiché égal ; ce
// plancher n'en est que le fil-piège bon marché.
const cReps = cssPx('.guided-card.kind-wod .guided-wod-moves.compact .guided-wod-reps', 'font-size');
const cName = cssPx('.guided-card.kind-wod .guided-wod-moves.compact .guided-wod-name', 'font-size');
assert(cReps !== null && cName !== null, 'styles.css : tailles des mouvements repliés mesurables');
assert(cReps >= 34, 'styles.css : mouvements repliés non écrasés (reps ≥ 34 px, vu ' + cReps + ')');
assert(cName >= 22, 'styles.css : nom de mouvement replié non écrasé (≥ 22 px, vu ' + cName + ')');
assert(cReps > cName, 'styles.css : le nombre de reps domine le nom, replié comme déplié');
assert(!/\.guided-wod-moves\.compact\{[\s\S]{0,200}display:flex/.test(css),
  'styles.css : le repli garde la mise en page empilée, il ne réorganise pas les mouvements');
// La place vient des cartes de mouvement — et seulement une fois le WOD lancé.
assert(/renderGuidedWodMoves\(st\.moves, amrapCount>0\)/.test(view),
  'view.js : les mouvements ne se replient qu\'à partir du premier round tapé');
assert(/function renderGuidedWodMoves\(moves, compact\)/.test(view),
  'view.js : le repli des mouvements est un paramètre, pas un état caché');
assert(/moves\.classList\.toggle\('compact', !!st\)/.test(mod),
  'amrap_rounds.js : un ↩ qui ramène à zéro round redéplie les mouvements');
assert(/\.guided-wod-moves\.compact\{/.test(css), 'styles.css : état replié des mouvements défini');
// Les boutons sont des éléments de grille : ils sont étirés à la hauteur de
// leur rangée. Baisser l'un sans l'autre ne change rien à l'écran — c'est le
// piège rencontré, et c'est LUI que le test doit retenir, pas la valeur.
const navBtn = cssPx('.guided-session .guided-actions .guided-btn', 'min-height');
const navRow = cssPx('.guided-session .guided-actions', 'min-height');
assert(navBtn !== null && navRow !== null, 'styles.css : hauteurs de la rangée de navigation mesurables');
assert(navBtn >= 40, 'styles.css : Précédent/Suivant restent tapables au pouce (≥ 40 px, vu ' + navBtn + ')');
assert(navRow >= navBtn, 'styles.css : la rangée suit ses boutons (éléments de grille : sinon ils restent étirés)');
assert(/t\.closest\("button"\)\) return;/.test(view),
  'view.js : un tap sur un bouton du chrono ne compte pas de round');
assert(/guidedTimerRoundTap/.test(timer) && /countdownActive\) return null;/.test(timer),
  'timer.js : aucun round pendant le décompte de départ');
assert(/if\(!\(elapsed > 0\)\) return null;/.test(timer),
  'timer.js : aucun round tant que le chrono n\'a pas avancé');
assert(/clearGuidedTimerRounds\(\);/.test(timer),
  'timer.js : éditer le chrono remet les rounds à zéro (leur temps restant ne veut plus rien dire)');
assert(/\.guided-amrap-panel\{/.test(css) && /\.guided-amrap-cell\.fast\{/.test(css) && /\.guided-amrap-cell\.slow\{/.test(css),
  'styles.css : banderole + couleurs or (1re place) et bronze (dernière)');
assert(/\.wod-round-line\.fast\{/.test(css) && /\.wod-round-line\.slow\{/.test(css),
  'styles.css : mêmes couleurs sur l\'écran Résultats');

// ── 6/7. Transfert vers l'écran Résultats ──────────────────────────────────
assert(/CoachAmrapRounds\.stats\(item\.key\)/.test(results),
  'results.js : la ligne WOD lit les rounds tapés pendant la séance');
assert(/Math\.max\(r2\.max\+2, amrapLog \? amrapLog\.count : 0\)/.test(results),
  'results.js : un compte tapé au-delà de l\'estimation reste sélectionnable');
assert(/tappedRounds > 0[\s\S]{0,80}wodRounds\.def/.test(results),
  'results.js : le compte tapé est pré-sélectionné, l\'estimation ne sert que de repli');
assert(/data-field="roundSplits"/.test(results) && /data-field="lastRoundRemaining"/.test(results),
  'results.js : splits et temps restant partent en champs durables de la ligne WOD');
assert(/if\(resultStr && amrapSuffix\) resultStr \+= amrapSuffix;/.test(results),
  'results.js : le temps restant du dernier round suit le résultat jusque dans l\'historique');

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

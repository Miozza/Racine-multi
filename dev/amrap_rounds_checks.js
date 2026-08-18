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
    8. Dans les limites du chrono, TOUT contact compte un round : le tap part au
       contact du doigt et rien ne l'annule au glissement. C'est le CSS qui
       retire le panoramique au chrono, pas le JS qui devine — départager un tap
       d'un scroll revenait à re-perdre des taps légitimes. Et le tap se VOIT :
       vibrate n'existe pas sur Safari iOS, donc un tap compté et un tap perdu
       se ressemblaient exactement.
    9. Un tap manqué se répare à froid, jamais tout seul : le round suspect est
       signalé, ÷2 le partage à parts égales en conservant la somme, et le
       journal réellement tapé reste récupérable.
   10. Les temps de round se relisent dans l'Historique, à partir du TEXTE du
       journal — donc aussi pour une séance exportée puis réimportée.

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
assert(/function bindGuidedTimerRoundTap/.test(timer) && /bindGuidedTimerRoundTap\(timerBox\)/.test(view),
  'le geste de tap appartient au domaine chrono, la vue ne fait que le brancher');
assert(/t\.closest\("button"\)\) return;/.test(timer),
  'timer.js : un tap sur un bouton du chrono ne compte pas de round');
assert(/guidedTimerRoundTap/.test(timer) && /countdownActive\) return null;/.test(timer),
  'timer.js : aucun round pendant le décompte de départ');
assert(/if\(!\(elapsed > 0\)\)\{ guidedTimerRoundFlash/.test(timer),
  'timer.js : aucun round tant que le chrono n\'a pas avancé');

// ── 8. Le tap doit être PRIS, et se voir ───────────────────────────────────
// Les deux moitiés du bug réel du 2026-08-17 : un tap perdu (click iOS annulé
// par un doigt qui glisse) et rien à l'écran pour le dire, donc un round qui
// vaut deux tours découvert seulement à l'écran Résultats.
assert(/addEventListener\("pointerdown", onPress\)/.test(timer),
  'timer.js : le round part au CONTACT du doigt, pas sur un click annulable par iOS');
// Le chrono n'arbitre plus entre un tap et un scroll : le CSS lui retire le
// panoramique, donc un doigt qui glisse dans ses limites est toujours un round.
// Sans cette règle CSS, il faudrait réintroduire une annulation au glissement —
// c'est-à-dire re-perdre des taps légitimes.
assert(!/pointermove|pointercancel|touchmove|SLOP/.test(timer),
  'timer.js : aucun tap n\'est annulé au glissement dans les limites du chrono');
assert(/\.guided-card \{[\s\S]{0,160}overflow-y: auto/.test(css),
  'styles.css : la carte de séance défile — c\'est ce que le chrono doit cesser de faire');
const timerRule = css.match(/\.guided-wod-timer \{([\s\S]*?)\}/);
assert(!!timerRule && /touch-action:\s*none/.test(timerRule[1]) && /touch-action:\s*pinch-zoom/.test(timerRule[1]),
  'styles.css : le chrono n\'est pas une surface de défilement (repli `none` si `pinch-zoom` est inconnu)');
assert(!!timerRule && timerRule[1].indexOf('touch-action: none') < timerRule[1].indexOf('touch-action: pinch-zoom'),
  'styles.css : `none` est déclaré AVANT `pinch-zoom`, sinon le repli ne joue pas');
assert(/window\.PointerEvent/.test(timer) && /addEventListener\("touchstart"/.test(timer) && /if\(!touched\) onPress\(ev\)/.test(timer),
  'timer.js : repli tactile+souris là où Pointer Events manque, sans double comptage');
assert(/navigator\.vibrate/.test(read('scripts/app_helpers.js')) && /guidedTimerRoundFlash\("round-hit"/.test(timer) && /guidedTimerRoundFlash\("round-miss"/.test(timer),
  'timer.js : tap compté ET tap refusé ont chacun leur retour visuel (vibrate absent sur iOS)');
assert(/\.guided-wod-timer\.round-hit\{/.test(css) && /\.guided-wod-timer\.round-miss\{/.test(css),
  'styles.css : la carte du chrono porte les deux états de tap');
assert(/\.guided-wod-timer\.round-hit\{[\s\S]{0,200}!important/.test(css),
  'styles.css : la confirmation de tap passe devant les alertes EMOM (déclarées plus haut)');
assert(css.indexOf('.guided-wod-timer.round-hit{') > css.indexOf('.guided-wod-timer.emom-blue{'),
  'styles.css : à !important égal, la confirmation de tap est déclarée après l\'alerte EMOM');

// ── 9. Réparer un tap manqué : ÷2, sans rien inventer ──────────────────────
R.resetAll();
const K2 = R.keyFor('Chipper');
R.tap(K2, 60, 600);    // R1 : 1:00
R.tap(K2, 245, 600);   // R2 : 3:05 — deux tours comptés pour un
R.tap(K2, 310, 600);   // R3 : 1:05
let s2 = R.stats(K2);
assert(s2.suspectIndex === 1, 'un round qui vaut ~2 fois les autres est signalé comme tap manqué');
assert(R.stats(K2).edited === false, 'le journal brut n\'est pas « corrigé » tant qu\'on n\'y touche pas');

s2 = R.split(K2, 1, 2);
assert(s2.count === 4, '÷2 rend au round manqué son tour perdu');
assert(s2.rounds.map(r => r.split).join(',') === '60,93,92,65',
  '÷2 partage à parts égales et conserve la somme (les rounds suivants ne bougent pas)');
assert(s2.rounds[3].at === 310 && s2.lastRemaining === 290,
  '÷2 ne touche ni au dernier tap ni au temps restant du round entamé');
assert(s2.edited === true && R.isEdited(K2), 'le journal se déclare corrigé');
assert(R.splitsText(K2) === '1:00 / 1:33 / 1:32 / 1:05', 'le champ durable suit la correction');

const back = R.restore(K2);
assert(back.count === 3 && R.splitsText(K2) === '1:00 / 3:05 / 1:05',
  '« Rétablir » ramène exactement ce que le chrono a vu');
assert(R.isEdited(K2) === false, 'après rétablissement, le journal n\'est plus marqué corrigé');

R.resetAll();
const K3 = R.keyFor('Court');
R.tap(K3, 1, 600);
assert(R.split(K3, 0, 2) === null, 'un round d\'une seconde ne se divise pas (pas de split nul)');
R.resetAll();
const K4 = R.keyFor('Deux');
R.tap(K4, 100, 600);
R.tap(K4, 200, 600);
assert(R.stats(K4).suspectIndex === -1,
  'sur deux rounds seulement, un écart n\'est pas un tap manqué mais un rythme');

assert(/data-round-split=/.test(mod) && /data-rounds-restore=/.test(mod),
  'amrap_rounds.js : ÷2 et Rétablir sont dans l\'écran Résultats, pas en plein WOD');
assert(/mountResultsLog/.test(mod) && /CoachAmrapRounds\.mountResultsLog\(it\.key/.test(results),
  'results.js : le journal du chrono est monté vivant, corrections comprises');
assert(/selectRoundChip\(st\.count\)/.test(results),
  'results.js : corriger un tap manqué met à jour le compte de rounds enregistré');
assert(/splitsInp\.value = CoachAmrapRounds\.splitsText\(it\.key\)/.test(results),
  'results.js : les champs durables suivent la correction (sinon l\'écran ment au journal)');

// ── 10. Les temps de round se relisent dans l'Historique ───────────────────
// Ils étaient enregistrés depuis leur première séance et affichés nulle part.
const app = read('app.js');
const histEdit = read('scripts/session/history_edit.js');
assert(R.historyHtml('1:10 / 2:05 / 1:00', '0:42').indexOf('1:10') > -1,
  'historyHtml() relit les splits depuis le TEXTE du journal (pas d\'objet persisté)');
assert(/history-round fast/.test(R.historyHtml('1:10 / 2:05 / 1:00', '')),
  'historyHtml() garde les couleurs or/bronze de l\'écran Résultats');
assert(R.historyHtml('', '') === '' && R.historyHtml('n\'importe quoi', '') === '',
  'une entrée sans splits lisibles n\'affiche rien plutôt qu\'une ligne vide');
assert(R.parseSplitsText('1:10 / 2:05').join(',') === '70,125', 'parseSplitsText() rend des secondes');
assert(/r\.roundSplits && window\.CoachAmrapRounds/.test(app) && /CoachAmrapRounds\.historyHtml\(r\.roundSplits, r\.lastRoundRemaining\)/.test(app),
  'app.js : l\'historique affiche les temps de round en plus de la note');
assert(/r\.load\|\|r\.result\|\|r\.note\|\|r\.rpe\|\|r\.roundSplits/.test(app),
  'app.js : une ligne qui n\'a QUE des splits reste affichée');
assert(/data-field="roundSplits"/.test(histEdit),
  'history_edit.js : les temps de round d\'une séance passée restent corrigeables');
assert(/\.history-round\{/.test(css) && /\.history-round\.fast\{/.test(css) && /\.history-round\.slow\{/.test(css),
  'styles.css : pastilles de round de l\'historique définies');
assert(/clearGuidedTimerRounds\(\);/.test(timer),
  'timer.js : éditer le chrono remet les rounds à zéro (leur temps restant ne veut plus rien dire)');
assert(/\.guided-amrap-panel\{/.test(css) && /\.guided-amrap-cell\.fast\{/.test(css) && /\.guided-amrap-cell\.slow\{/.test(css),
  'styles.css : banderole + couleurs or (1re place) et bronze (dernière)');
assert(/\.wod-round-line\.fast\{/.test(css) && /\.wod-round-line\.slow\{/.test(css),
  'styles.css : mêmes couleurs sur l\'écran Résultats');

// ── 6/7. Transfert vers l'écran Résultats ──────────────────────────────────
assert(/CoachAmrapRounds\.stats\(item\.key\)/.test(results),
  'results.js : la ligne WOD lit les rounds tapés pendant la séance');
assert(/Math\.max\(r2\.max\+2, amrapLog \? amrapLog\.count\+2 : 0\)/.test(results),
  'results.js : un compte tapé au-delà de l\'estimation reste sélectionnable (avec la marge d\'une correction ÷2)');
assert(/tappedRounds > 0[\s\S]{0,80}wodRounds\.def/.test(results),
  'results.js : le compte tapé est pré-sélectionné, l\'estimation ne sert que de repli');
assert(/data-field="roundSplits"/.test(results) && /data-field="lastRoundRemaining"/.test(results),
  'results.js : splits et temps restant partent en champs durables de la ligne WOD');
assert(/if\(resultStr && amrapSuffix\) resultStr \+= amrapSuffix;/.test(results),
  'results.js : le temps restant du dernier round suit le résultat jusque dans l\'historique');

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

#!/usr/bin/env node
/*
  Racine — garde-fous : sortie « terminé » d'un cycle.

  Le problème corrigé : Racine n'avait que trois sorties de cycle — pause
  (récupérable), archivé, abandonné. Un cycle mené jusqu'au bout n'est aucune
  des trois. Résultat : aucun bouton pour terminer, et démarrer le programme
  suivant annonçait « le cycle actuel sera mis en pause » alors qu'il était fini.

  Contrat protégé ici :
    1. Une sortie « terminé » existe : statut `completed`, écrit par
       markActiveCycleFinished(), et le cycle part dans le journal de saison.
    2. Terminer est atteignable depuis l'onglet Cycle (bouton toujours présent),
       pas seulement depuis le bandeau de fin de cycle de la vue WOD — ce
       bandeau dépend d'un compte de séances exact qui peut ne pas se déclencher.
    3. Tous les chemins qui installent un autre cycle passent par
       closeActiveCycleBefore() : un cycle déjà terminé n'est jamais remis en
       pause ni archivé une seconde fois (pas de fiche fantôme).
    4. L'écran Fin de cycle classe TERMINÉ, jamais archivé.
    5. Le vocabulaire suit : libellé « Terminé », rotation de statut à trois
       états, et les textes de confirmation ne parlent plus de pause quand le
       cycle est fini.
    6. Champ additif `activeCycleFinishedAt` : aucune migration, aucune clé de
       stockage nouvelle, et il voyage dans le payload de cycle (export JSON).

  Usage : node dev/cycle_finish_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const app = read('app.js');
const seasonUi = read('scripts/season/ui.js');
const html = read('index.html');
const css = read('styles.css');

// Un garde-fou d'interface épingle un CONTRAT, pas un pixel : une borne
// survit à une retouche de design, une égalité oblige à réécrire le test.
function cssPx(selector, prop){
  const sel = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const rule = css.match(new RegExp(sel + '\\s*\\{([^}]*)\\}'));
  if(!rule) return null;
  const v = rule[1].match(new RegExp(prop + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px'));
  return v ? Number(v[1]) : null;
}


// ── 1. La sortie existe ────────────────────────────────────────────────────
assert(/function markActiveCycleFinished\(/.test(app), 'app.js : markActiveCycleFinished() existe');
assert(/status:"completed"/.test(app), 'app.js : la fiche de cycle porte le statut completed');
assert(/if\(st==='completed'\)return 'Terminé';/.test(app), 'app.js : cycleStatusLabel sait dire « Terminé »');
assert(/markActiveCycleFinished[\s\S]{0,400}CoachSeason\.recordCycleEnd/.test(app),
  'app.js : terminer un cycle le journalise dans la saison');

// ── 2. Atteignable depuis l'onglet Cycle ───────────────────────────────────
assert(/id="cycleFinishCard"/.test(html), 'index.html : la carte « Terminer ce cycle » a sa place dans l\'onglet Cycle');
assert(/function renderCycleFinishCard\(/.test(app), 'app.js : la carte est rendue');
assert(/renderFocusDetails\(\);renderCycleFinishCard\(\);/.test(app), 'app.js : renderCycle() la rend à chaque passage');
assert(/id="finishCycleBtn"/.test(app) && /btn\.onclick=finishActiveCycle;/.test(app),
  'app.js : le bouton appelle finishActiveCycle()');
// Le bouton ne doit pas dépendre du détecteur de fin : il est rendu dans les
// trois cas (pas fini / fini non classé / déjà classé).
assert(/host\.innerHTML='<div class="cycle-finish-text">/.test(app) && !/if\(!complete\)\s*return;/.test(app),
  'app.js : la carte est rendue même quand la fin n\'est pas détectée');
assert(/\.cycle-finish-card\{/.test(css), 'styles.css : la carte est stylée');

// ── 3. Aucun cycle terminé remis en pause ──────────────────────────────────
assert(/function closeActiveCycleBefore\(/.test(app), 'app.js : closeActiveCycleBefore() est la porte unique de fermeture');
assert(/if\(state\.activeCycleFinishedAt\)\{ state\.activeCycleFinishedAt=null; return "completed"; \}/.test(app),
  'app.js : un cycle déjà classé terminé n\'est pas refilé une seconde fois');
// Plus aucun appel direct à pauseCurrentCycle() dans les flux de changement de
// cycle : ils décidaient de la sortie sans regarder si le cycle était fini.
const directPause = (app.match(/pauseCurrentCycle\(/g) || []).length;
assert(directPause === 2,
  'app.js : pauseCurrentCycle() n\'est plus appelé que par sa définition et closeActiveCycleBefore() (trouvé ' + directPause + ')');
['saveCycle', 'resumeSavedCycle', 'resumeArchivedCycle'].forEach(function(fn){
  const body = app.slice(app.indexOf('function ' + fn + '('), app.indexOf('function ' + fn + '(') + 1600);
  assert(/closeActiveCycleBefore\(/.test(body), 'app.js : ' + fn + '() ferme le cycle actif par la porte unique');
});
assert(/if\(state\.activeCycleFinishedAt\)\{\s*alert\(/.test(app),
  'app.js : archiver un cycle déjà terminé est refusé (sinon deux fiches pour un cycle)');

// ── 4. Écran Fin de cycle ──────────────────────────────────────────────────
assert(/closeActiveCycleBefore\(focusConfigs\[id\]\.label \|\| id, true\)/.test(seasonUi),
  'season/ui.js : démarrer depuis l\'écran Fin de cycle classe TERMINÉ');
assert(!/status: "archived"/.test(seasonUi),
  'season/ui.js : l\'écran Fin de cycle n\'archive plus un cycle terminé');

// ── 5. Vocabulaire ─────────────────────────────────────────────────────────
assert(/Le cycle actuel est terminé : il sera classé comme terminé/.test(app),
  'app.js : la confirmation ne parle plus de pause quand le cycle est fini');
assert(/completed:"archived",archived:"abandoned",abandoned:"completed"/.test(app),
  'app.js : rotation de statut à trois états (terminé → archivé → abandonné)');
assert(/Cycles terminés \/ archivés \/ abandonnés/.test(app),
  'app.js : la liste annonce les trois statuts');

// ── 6. Persistance additive ────────────────────────────────────────────────
assert(/activeCycleFinishedAt: null/.test(app), 'app.js : champ déclaré dans freshState() (absent = null, aucune migration)');
assert(/activeCycleFinishedAt:state\.activeCycleFinishedAt\|\|null/.test(app),
  'app.js : le champ voyage dans le payload de cycle (donc dans l\'export JSON)');
assert(/state\.activeCycleFinishedAt = p\.activeCycleFinishedAt/.test(app), 'app.js : relu au chargement du profil');
assert(!/localStorage/.test(app.slice(app.indexOf('function markActiveCycleFinished'), app.indexOf('function finishActiveCycle'))),
  'app.js : aucune clé de stockage créée pour cette sortie');

// ── 7. Corriger la date de fin ─────────────────────────────────────────────
// Racine inscrit la date du jour où le cycle est CLASSÉ, pas celle où il a été
// terminé. La correction doit exister, et surtout toucher les DEUX endroits qui
// portent cette date, sinon l'app en affiche deux différentes pour un cycle.
const seasonIdx = read('scripts/season/index.js');
const modals = read('scripts/ui_modals.js');

assert(/api\.setCycleEnd = function/.test(seasonIdx), 'season/index.js : setCycleEnd() corrige le journal de saison');
assert(/c\.prCount = countPrsBetween\(state, c\.startIso, iso\)/.test(seasonIdx),
  'season/index.js : le compte de PR est recalculé — il est borné par les dates du cycle');
assert(/if\(c\.startIso && iso < String\(c\.startIso\)\.slice\(0, 10\)\) return false;/.test(seasonIdx),
  'season/index.js : une fin antérieure au début est refusée, pas écrite');
assert(/api\.findCycleIndex = function/.test(seasonIdx), 'season/index.js : la fiche retrouve son entrée de journal');

assert(/function editArchivedCycleDate\(/.test(app), 'app.js : correction depuis la fiche de cycle');
assert(/edit-archived-date-btn/.test(app), 'app.js : bouton « Changer la date » sur la fiche');
assert(/if\(!c\.filedAt\) c\.filedAt=c\.archivedAt\|\|c\.pausedAt\|\|nowIso\(\);/.test(app),
  'app.js : la date de rangement est conservée (filedAt) — on corrige, on n\'efface pas');
assert(/function syncCycleFicheEndDate\(/.test(app), 'app.js : les fiches suivent une correction faite depuis la frise');
assert(/CoachSeason\.findCycleIndex\(state,c\.id,current\)[\s\S]{0,200}setCycleFicheEndDate\(c, iso\)/.test(app),
  'app.js : l\'entrée de journal est retrouvée AVANT de changer la fiche (elle se reconnaît à l\'ancienne date)');
assert(/data-season-date=/.test(seasonUi) && /CoachSeason\.setCycleEnd\(state, idx, iso\)/.test(seasonUi),
  'season/ui.js : correction depuis la frise Saison');
assert(/syncCycleFicheEndDate\(entry\.programId, current, iso\)/.test(seasonUi),
  'season/ui.js : corriger la frise corrige aussi la fiche');

assert(/function openDatePickerModal\(/.test(modals) && /type="date"/.test(modals),
  'ui_modals.js : champ date natif (roue iOS), pas une saisie clavier d\'une chaîne ISO');
assert(/if\(!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(iso\)\)\{ fail\("Choisis une date\."\); return; \}/.test(modals),
  'ui_modals.js : une date vide ne passe jamais (elle effacerait l\'information)');
assert(/opts\.max && iso > opts\.max/.test(modals), 'ui_modals.js : bornes min/max respectées');
// Le contrat est « utilisable au pouce en salle », pas « 52 px ».
const dpBtn = cssPx('.racine-date-picker .rdp-actions button', 'min-height');
assert(dpBtn !== null, 'styles.css : hauteur des boutons de la modale de date mesurable');
assert(dpBtn >= 44, 'styles.css : boutons de la modale de date utilisables au pouce (≥ 44 px, vu ' + dpBtn + ')');
assert(/\.season-tl-edit \{/.test(css), 'styles.css : bouton de correction stylé dans la frise');

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

#!/usr/bin/env node
/*
  Racine — garde-fous : correction d'une séance déjà enregistrée.

  Contrat protégé ici :
    1. L'Historique offre un bouton « Modifier » qui retombe dans l'onglet
       Résultats, sans jamais toucher aux fonctions gelées de scoping semaine.
    2. La correction modifie l'entrée d'historique EN PLACE, puis reconstruit
       l'état dérivé (rebuildRefsFromHistory) — jamais l'inverse.
    3. La fusion n'invente aucune ligne, préserve les champs non édités
       (planned…) et traite un champ vidé comme un effacement volontaire.
    4. Le cache de la séance en cours n'est jamais mélangé à l'édition.

  Usage : node dev/history_edit_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const mod = read('scripts/session/history_edit.js');
const app = read('app.js');
const html = read('index.html');
const results = read('scripts/session/results.js');
const save = read('scripts/session/save.js');
const suggestion = read('scripts/charge/suggestion.js');
const chargeApi = read('scripts/charge/index.js');
const css = read('styles.css');

// ── 1. Point d'entrée : Historique → Résultats ─────────────────────────────
assert(/class="history-edit-btn"/.test(app), 'app.js : bouton « Modifier » rendu sur chaque séance');
assert(/CoachHistoryEdit\.start\(btn\.getAttribute\("data-history-index"\)\)/.test(app),
  'app.js : le bouton ouvre l\'édition sur l\'index de la séance');
assert(/scripts\/session\/history_edit\.js/.test(html), 'index.html : module chargé');
assert(/\.history-edit-btn\{/.test(css), 'styles.css : bouton Modifier stylé');

// ── 2. La vue Résultats bascule en mode édition ────────────────────────────
assert(/CoachHistoryEdit\.isActive\(\)\)\{\s*CoachHistoryEdit\.renderFields\(\);\s*return;\s*\}/.test(results),
  'results.js : renderSessionEntry rend le journal, pas le plan du jour, en mode édition');
assert(/CoachHistoryEdit\.isActive\(\)\)\{\s*CoachHistoryEdit\.commit\(\);\s*return;\s*\}/.test(save),
  'save.js : le bouton Sauvegarder met à jour l\'entrée au lieu d\'en créer une');
assert(/CoachHistoryEdit\.isActive\(\)\)\{\s*CoachHistoryEdit\.cancel\(\);\s*return;\s*\}/.test(save),
  'save.js : le retour sort de l\'édition sans vider le cache de la séance en cours');
assert(/switchView\('results'\)/.test(mod) && /switchView\('history'\)/.test(mod),
  'module : entre par la vue Résultats, sort par la vue Historique');

// ── 3. Journal brut d'abord, état dérivé reconstruit ensuite ───────────────
const commit = mod.match(/function commit\(\)\{[\s\S]*?\n  \}/);
assert(!!commit, 'module : commit() présent');
assert(!!commit && /rebuildRefsFromHistory/.test(commit[0]),
  'commit : reconstruit movementRefs / athleteState / RPE depuis l\'historique corrigé');
assert(!!commit && commit[0].indexOf('rebuildRefsFromHistory') < commit[0].indexOf('window.save()'),
  'commit : reconstruit AVANT de persister');
assert(!/state\.history\.push|state\.history\.splice|history\s*=\s*\[/.test(mod),
  'module : n\'ajoute ni ne supprime jamais de séance (édition en place seulement)');
assert(!/setActiveWeek|applyWeekTrackingForWeek|buildWeekTrackingForWeek|state\.week\s*=|state\.day\s*=/.test(mod),
  'module : ne touche pas au scoping semaine/jour (fonctions gelées)');
assert(!/localStorage/.test(mod), 'module : aucune écriture directe de stockage (passe par save())');

// ── 4. Le cache de la séance en cours est mis de côté, puis restauré ───────
assert(/cache: window\.guidedResultCache \|\| \{\}/.test(mod) && /window\.guidedResultCache = \{\}/.test(mod),
  'start : le cache de la séance en cours est mis de côté');
assert(/window\.guidedResultCache = cache \|\| \{\}/.test(mod), 'exit : le cache de la séance en cours est restauré');

// ── 5. Classement : une seule source, partagée avec la saisie du jour ──────
assert(/function applyPerformanceClassification/.test(suggestion),
  'suggestion.js : classement extrait dans applyPerformanceClassification');
assert(/applyPerformanceClassification\(r,lookup\)/.test(suggestion),
  'enrichSessionResults : passe par la fonction extraite (pas de règle dupliquée)');
assert(/classifyResult: typeof applyPerformanceClassification/.test(chargeApi),
  'CoachCharge : classifyResult exposé sur la porte publique du moteur');
assert(/CoachCharge\.classifyResult/.test(mod) && !/coachNote\s*=/.test(mod),
  'module : reclasse via CoachCharge, ne réécrit aucune règle de charge');

// ── 6. Fusion : comportement réel, sans DOM ────────────────────────────────
const sandbox = { window: {}, document: undefined };
sandbox.window.window = sandbox.window;
const classified = [];
sandbox.window.CoachCharge = { classifyResult: function(row){ classified.push(row); row.status = 'reclassified'; } };
(new Function('window', 'document', 'Object', mod))(sandbox.window, undefined, Object);
const edit = sandbox.window.CoachHistoryEdit;
assert(!!edit && typeof edit.mergeInto === 'function', 'module : CoachHistoryEdit.mergeInto exposé');

const stored = {
  'Back Squat': { load: '225', reps: '5', rpe: '8', note: 'dos rond', planned: { load: 230, reps: 5 }, status: 'success' },
  'Strict Press': { load: '95', reps: '8', rpe: '7', planned: { load: 95, reps: 8 } }
};
const changed = edit.mergeInto(stored, {
  'Back Squat': { load: '245', reps: '5', rpe: '9', note: '' },
  'Strict Press': { load: '95', reps: '8', rpe: '7' },
  'Mouvement jamais fait': { load: '500', reps: '1', rpe: '10' }
});
assert(changed === true, 'mergeInto : signale une modification réelle');
assert(stored['Back Squat'].load === '245' && stored['Back Squat'].rpe === '9', 'mergeInto : la valeur corrigée remplace l\'ancienne');
assert(stored['Back Squat'].note === undefined, 'mergeInto : un champ vidé efface la valeur (effacement volontaire)');
assert(stored['Back Squat'].planned && stored['Back Squat'].planned.load === 230,
  'mergeInto : les champs non édités (planned) survivent intacts');
assert(stored['Mouvement jamais fait'] === undefined, 'mergeInto : aucune ligne inventée hors du journal');
assert(classified.length === 2, 'mergeInto : chaque ligne chargée est reclassée par le moteur');
assert(edit.mergeInto(stored, { 'Strict Press': { load: '95', reps: '8', rpe: '7' } }) === false,
  'mergeInto : aucune modification → aucun changement signalé');

// ── 7. Rétention long terme : limite assumée et documentée ─────────────────
assert(/CoachRetention/.test(mod) && !/CoachRetention\s*\.\s*recordSession\s*\(/.test(mod),
  'module : ne rejoue pas l\'agrégat mensuel (compteur cumulatif), et le dit');

process.on('exit', function(){
  if(failures){ console.error('\n❌ history_edit_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ history_edit_checks OK');
});

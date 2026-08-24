#!/usr/bin/env node
/*
  Racine — garde-fous anti-régression.
  Ce fichier vérifie les acquis sensibles sans forcer les modules à porter la version.

  Usage :
    node dev/regression_checks.js
    node dev/regression_checks.js --update-package
    node dev/regression_checks.js --full
*/
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const forcedUpdatePackage = process.argv.includes('--update-package');
const forcedFullPackage = process.argv.includes('--full');
const errors = [];
const notes = [];

function rel(p){ return path.join(root, p); }
function exists(p){ return fs.existsSync(rel(p)); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }
function fail(msg){ errors.push(msg); }
function ok(msg){ notes.push(msg); }
function assert(cond, msg){ cond ? ok(msg) : fail(msg); }
function walk(dir){
  const start = rel(dir);
  if(!fs.existsSync(start)) return [];
  const out = [];
  (function recur(abs){
    for(const entry of fs.readdirSync(abs, { withFileTypes:true })){
      const full = path.join(abs, entry.name);
      const rp = path.relative(root, full).replace(/\\/g, '/');
      if(entry.isDirectory()) recur(full); else out.push(rp);
    }
  })(start);
  return out.sort();
}
function formatTimerDisplay(sec){
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  return String(Math.floor(sec / 60)) + ':' + String(sec % 60).padStart(2, '0');
}
function currentVersion(){
  const m = read('app.js').match(/APP_VERSION\s*=\s*"(V\d+\.\d+(?:\.\d+)?(?:-multi)?)"/);
  return m && m[1];
}

if(forcedUpdatePackage && forcedFullPackage){
  fail('Flags incompatibles : --update-package et --full ne peuvent pas être utilisés ensemble.');
}

const allFiles = walk('.').filter(f => !f.startsWith('.git/'));
const hasDataFiles = allFiles.some(f => f.startsWith('data/'));
const isUpdatePackage = forcedUpdatePackage ? true : (forcedFullPackage ? false : !hasDataFiles);
const detectedModeReason = forcedUpdatePackage ? 'update (--update-package)' : (forcedFullPackage ? 'full (--full)' : (hasDataFiles ? 'full (data/ présent)' : 'update (data/ absent)'));

// 1. Artefacts et fichiers interdits.
const forbiddenRootDocs = [
  /^RELEASE_NOTES_V\d+\.\d+(?:\.\d+)?(?:-multi)?/,
  /^OFFICIAL_RELEASE_.*V\d+\.\d+(?:\.\d+)?(?:-multi)?/,
  /^STRUCTURE_AUDIT.*V\d+\.\d+(?:\.\d+)?(?:-multi)?/,
  /^AUDIT.*V\d+\.\d+(?:\.\d+)?(?:-multi)?/,
  /^REGRESSION_REPORT.*V\d+\.\d+(?:\.\d+)?(?:-multi)?/,
  /^VERSION_HISTORY\.md$/
];
allFiles.forEach(f => {
  const base = path.basename(f);
  if(forbiddenRootDocs.some(rx => rx.test(base))) fail('Fichier versionné/interdit détecté : ' + f);
});
assert(!exists('tools'), 'Le dossier tools/ ne doit pas revenir.');
assert(!exists('diagnostics'), 'Le dossier diagnostics/ ne doit pas revenir.');
assert(!exists('programs/test.js'), 'programs/test.js ne doit pas revenir.');
assert(!/id\s*:\s*["']test["']|file\s*:\s*["']programs\/test\.js["']/i.test(read('programs/index.js')), 'Le programme Test ne doit pas revenir dans programs/index.js.');

// 2. Données durables.
const durable = ['data/resultats.json','data/athlete_state.json','data/cycle_state.json'];
if(isUpdatePackage){
  assert(!allFiles.some(f => f.startsWith('data/')), 'ZIP update ne doit contenir aucun fichier data/.');
} else {
  durable.concat('data/charges.js').forEach(f => assert(exists(f), 'Fichier data attendu dans ZIP complet : ' + f));
}

// 3. Programmes protégés.
[
  'programs/epaules_3d.js',
  'programs/epaules_3d_v2.js',
  'programs/hypertrophy_base.js',
  'programs/force_performance.js',
  'programs/competition_peak.js',
  'programs/heritage_225.js'
].forEach(f => assert(exists(f), 'Programme protégé manquant : ' + f));
assert(read('programs/index.js').includes('heritage_225'), 'heritage_225 doit rester dans programs/index.js.');
assert(read('programs/index.js').includes('shoulders3d_v2'), 'Épaules 3D v2 doit rester dans programs/index.js.');

// 4. Contrat de version.
const version = currentVersion();
assert(!!version, 'APP_VERSION introuvable dans app.js.');
if(version){
  const cache = version.replace(/^V/, '');
  const app = read('app.js');
  const index = read('index.html');
  const readme = read('README.md');
  const etat = read('ETAT_ACTUEL.md');
  const changelog = read('CHANGELOG.md');
  const manifest = read('manifest.json');
  const serviceWorker = read('service-worker.js');
  const contract = read('docs/STRUCTURE_CONTRACT.md');

  // PROPRIÉTAIRE UNIQUE du contrat de version (docs/STRUCTURE_CONTRACT.md
  // § « Contrat de version »). structure_checks.js portait les mêmes onze
  // assertions mot pour mot : deux endroits à corriger pour une seule règle,
  // donc un jour deux règles divergentes. Ne pas les recopier ailleurs.
  const header = app.match(/^\/\/\s*Racine\s+(V\d+\.\d+(?:\.\d+)?(?:-multi)?)/m);
  assert(!!header, 'app.js doit garder un commentaire d’en-tête « // Racine Vx.y.z ».');
  assert(header && header[1] === version, 'app.js doit garder un en-tête aligné avec APP_VERSION.');
  assert(index.includes('<title>Racine ' + version + '</title>'), 'index.html doit afficher la version dans le titre.');
  assert(index.includes('<footer class="footer">' + version), 'index.html doit afficher la version dans le footer.');
  assert(index.includes('?v=' + cache), 'index.html doit cache-buster les assets avec ?v=' + cache + '.');
  assert(readme.includes('- Version : `' + version + '`'), 'README.md doit afficher la version courante.');
  assert((readme.match(/V\d+\.\d+(?:\.\d+)?(?:-multi)?/g) || []).length === 1, 'README.md ne doit pas redevenir un deuxième changelog.');
  assert(etat.includes('Version actuelle : ' + version), 'ETAT_ACTUEL.md doit afficher la version courante.');
  assert((etat.match(/V\d+\.\d+(?:\.\d+)?(?:-multi)?/g) || []).every(v => v === version), 'ETAT_ACTUEL.md ne doit pas contenir d’anciennes versions.');
  assert(changelog.includes('## ' + version), 'CHANGELOG.md doit contenir une entrée pour la version courante.');
  assert(contract.includes('## Contrat de version'), 'STRUCTURE_CONTRACT.md doit garder le contrat de version visible.');
  assert(contract.includes('Fichiers qui portent la version courante'), 'Le contrat doit lister les fichiers qui portent la version.');
  assert(contract.includes('Fichiers qui ne doivent pas porter la version courante'), 'Le contrat doit lister les fichiers déversionnés.');
  assert(!/V\d+\.\d+(?:\.\d+)?(?:-multi)?/.test(manifest), 'manifest.json ne doit pas porter la version affichée.');
  assert(!/V\d+\.\d+(?:\.\d+)?(?:-multi)?|v\d+-\d+|\b\d+\.\d+\b/.test(serviceWorker), 'service-worker.js doit rester déversionné en mode no-cache.');
}

// 4b. Navigation semaine : completedDays/missedDays doivent être reconstruits par semaine.
{
  const app = read('app.js');
  const swipeNav = app.match(/function setupSwipeNav\(\)\{[\s\S]*?\n\}/);
  const weeksRender = app.match(/function renderWeeks\(\)\{[\s\S]*?function renderDays\(\)/);
  assert(app.includes('function setActiveWeek(wk, opts)'), 'app.js doit centraliser les changements de semaine dans setActiveWeek.');
  assert(app.includes('function buildWeekTrackingForWeek(wk, cycle)'), 'app.js doit reconstruire le suivi par semaine depuis history/weekTransitions.');
  assert(app.includes('function applyWeekTrackingForWeek(wk)'), 'app.js doit appliquer un suivi de semaine reconstruit.');
  assert(app.includes('state.history||[]'), 'Le suivi de semaine doit relire state.history.');
  assert(app.includes('state.weekTransitions||[]'), 'Le suivi de semaine doit relire weekTransitions.');
  const weekTracking = app.match(/function buildWeekTrackingForWeek\(wk, cycle\)\{[\s\S]*?return \{completedDays:completed,missedDays:missed\};\r?\n\}/);
  assert(!!weekTracking && !weekTracking[0].includes('state.completedDays'), 'La reconstruction par semaine ne doit pas réinjecter state.completedDays.');
  const historyLoop = weekTracking && weekTracking[0].match(/\(state\.history\|\|\[\]\)\.forEach\(function\(s\)\{[\s\S]*?\}\);/);
  assert(!!historyLoop && /s\.cycle\s*!==\s*cycle/.test(historyLoop[0]), 'La relecture de state.history dans buildWeekTrackingForWeek doit filtrer par cycle (programme), pas seulement par semaine — sinon des séances d’un ancien programme réapparaissent comme complétées dans un nouveau cycle.');
  assert(!!swipeNav && swipeNav[0].includes('setActiveWeek(Number(state.week)-1)'), 'weekPrev doit passer par setActiveWeek.');
  assert(!!swipeNav && swipeNav[0].includes('setActiveWeek(Number(state.week)+1)'), 'weekNext doit passer par setActiveWeek.');
  assert(!!swipeNav && !/state\.week\+\+|state\.week--/.test(swipeNav[0]), 'setupSwipeNav ne doit plus muter state.week directement.');
  assert(!!weeksRender && weeksRender[0].includes('setActiveWeek(wk)'), 'Les onglets de semaine doivent passer par setActiveWeek.');
}

// 5. Documents et contrats stables.
[
  'CHANGELOG.md',
  'README.md',
  'ETAT_ACTUEL.md',
  'RELEASE_CHECKLIST.md',
  'docs/STRUCTURE_CONTRACT.md',
  'docs/ARCHITECTURE.md',
  'docs/UI_CONSTRAINTS.md',
  'docs/DATA_FLOW_CONTRACT.md',
  'docs/CHARGE_PROGRESSION_CONTRACT.md',
  'docs/ERROR_LOGGING.md'
].forEach(f => assert(exists(f), 'Document stable manquant : ' + f));

// 6. Chargement runtime minimal.
const html = read('index.html');
[
  'scripts/core/logger.js',
  'scripts/app_helpers.js',
  'scripts/state/storage.js',
  'scripts/state/index.js',
  'scripts/charge/index.js',
  'scripts/profiles/storage.js',
  'scripts/profiles/reference.js',
  'scripts/profiles/onboarding.js',
  'scripts/profiles/ui.js',
  'scripts/view_pc.js',
  'scripts/app_navigation.js',
  'scripts/view_wodplus.js',
  'scripts/session/view.js',
  'scripts/session/timer.js',
  'scripts/session/results.js',
  'scripts/session/save.js',
  'scripts/session/index.js',
  'app.js',
  'scripts/tms_session.js'
].forEach(f => assert(html.includes(f), 'Fichier runtime non chargé dans index.html : ' + f));
assert(html.indexOf('scripts/app_navigation.js') < html.indexOf('scripts/view_wodplus.js'), 'Navigation doit être chargée avant WOD+.');
assert(html.indexOf('scripts/session/index.js') < html.indexOf('app.js'), 'CoachSession doit être chargé avant app.js.');

// 7. Séparation WOD+ / PC / Session / Résultats.
assert(html.includes('id="resultsView"'), 'Résultats doit rester une vue dédiée.');
assert(read('scripts/app_navigation.js').includes('var VIEW_MAIN_IDS={pc:"pcView"}'), 'PC doit avoir pcView comme hôte officiel.');
assert(read('scripts/app_navigation.js').includes('legacyHost.id="phoneView"'), 'phoneView doit rester wrapper hérité interne.');
assert(read('scripts/session/index.js').includes("view.id = 'sessionView'"), 'Séance doit posséder sessionView.');
assert(read('scripts/session/index.js').includes("document.getElementById('pcView')"), 'Session doit être insérée à côté de pcView, pas dedans.');
assert(read('scripts/view_wodplus.js').includes('CoachSession.openFrom("wodplus")'), 'WOD+ doit ouvrir Séance via CoachSession.openFrom("wodplus").');
assert(read('scripts/view_pc.js').includes("CoachSession.openFrom('phone')"), 'PC doit ouvrir Séance via CoachSession.openFrom(\'phone\').');
assert(!read('scripts/view_pc.js').includes('CoachSession.renderResults'), 'PC ne doit pas rendre Résultats.');
assert(read('scripts/session/results.js').includes('CoachSummary.buildSessionSummary'), 'Résultats doit déléguer le résumé à CoachSummary.');

// 8. Timer et contrôles sensibles.
assert(formatTimerDisplay(45) === '0:45', 'Timer attendu : 45 sec -> 0:45.');
assert(formatTimerDisplay(552) === '9:12', 'Timer attendu : 552 sec -> 9:12.');
assert(formatTimerDisplay(600) === '10:00', 'Timer attendu : 600 sec -> 10:00.');
assert(formatTimerDisplay(3600) === '60:00', 'Timer attendu : 3600 sec -> 60:00.');
assert(read('scripts/app_helpers.js').includes('function formatTimerDisplay'), 'formatTimerDisplay doit rester dans app_helpers.');
assert(read('scripts/session/timer.js').includes('formatTimerDisplay'), 'Le timer session doit utiliser formatTimerDisplay.');
assert(read('scripts/session/results.js').includes('data-results-step="load"'), 'Résultats doit garder le contrôle compact de charge.');
assert(read('scripts/session/results.js').includes('data-results-step="reps"'), 'Résultats doit garder le contrôle compact de reps.');
assert(read('scripts/session/results.js').includes('data-results-step="rpe"'), 'Résultats doit garder le contrôle compact de RPE.');

// 9. Frontières moteur / historique.
const chargeRuntime = [
  'scripts/charge/equipement.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/historique.js',
  'scripts/charge/rpe.js',
  'scripts/charge/suggestion.js',
  'scripts/charge/scaling.js',
  'scripts/charge/index.js'
].filter(exists).map(read).join('\n');
assert(read('scripts/charge/index.js').includes('window.CoachCharge'), 'CoachCharge doit rester l’API publique du moteur.');
assert(read('scripts/history/index.js').includes('window.CoachHistory'), 'CoachHistory doit rester l’API publique historique.');
assert(read('scripts/progression/index.js').includes('window.CoachProgress'), 'CoachProgress doit rester l’API publique progression.');
assert(read('scripts/summary/index.js').includes('window.CoachSummary'), 'CoachSummary doit rester l’API publique résumé.');
assert(read('scripts/profiles/storage.js').includes('window.CoachProfiles'), 'CoachProfiles doit rester l’API publique des profils.');
assert(chargeRuntime.includes('coachBuildMovementContext'), 'Le moteur doit garder le contexte mouvement.');
assert(chargeRuntime.includes('coachFilterHistoryForProgression'), 'Le moteur doit garder le filtre historique par contexte.');
assert(chargeRuntime.includes('coachApplyUserLoadScale'), 'Le moteur doit garder le scaling de charge par profil.');
assert(chargeRuntime.includes('coachAggressivenessFactor'), 'Le moteur doit garder le facteur d’agressivité de progression par profil.');
assert(read('docs/DATA_FLOW_CONTRACT.md').includes('resultats = journal brut reconstructible'), 'DATA_FLOW_CONTRACT doit fixer resultats comme journal brut.');
assert(read('docs/DATA_FLOW_CONTRACT.md').includes('athlete_state = etat derive pour le moteur'), 'DATA_FLOW_CONTRACT doit fixer athlete_state comme état dérivé.');

// ── Lisibilité de la séance guidée ─────────────────────────────────────────
// Quatre défauts signalés en usage réel (V4.5.64), tous des régressions de
// lecture ou de saisie : ils ne cassent aucun test de moteur, seulement
// l'entraînement. D'où des garde-fous ici.

// 1. Une cible écrite en toutes lettres est une cible. « cumul 100 reps »
//    retombait sur repsHint (10) : l'écran proposait 10 répétitions pour un
//    objectif de 100, et l'athlète notait un dixième de son travail.
const appSrc = read('app.js');
const parseTargetRepsSrc = (appSrc.match(/function parseTargetReps[\s\S]*?\n}/) || [''])[0];
assert(!!parseTargetRepsSrc, 'parseTargetReps doit rester lisible dans app.js.');
if(parseTargetRepsSrc){
  const parseTargetReps = new Function('return (' + parseTargetRepsSrc + ')')();
  const target = (fmt) => { const r = parseTargetReps(fmt, 10); return r.min + '-' + r.max; };
  assert(target('cumul 100 reps') === '100-100', 'Une cible « cumul 100 reps » doit valoir 100, pas le repli 10.');
  assert(target('Validation : 1 rep propre') === '1-1', 'Le singulier « 1 rep » doit être lu comme une cible.');
  // Le nombre doit TOUCHER le mot : sinon « 3 rounds for reps » vaudrait 3 reps.
  assert(target('3 rounds for reps') === '10-10', '« 3 rounds for reps » ne déclare aucune cible de reps.');
  assert(target('5 rounds for time') === '10-10', '« 5 rounds for time » ne déclare aucune cible de reps.');
  // Les formes existantes ne bougent pas.
  assert(target('4×15-20') === '15-20', 'Une plage garde la priorité sur tout le reste.');
  assert(target('4×10/côté') === '10-10', 'Un format N×M reste lu par le « × ».');
  assert(target('5-6 reps strict') === '5-6', 'Une plage suivie du mot reps reste une plage.');
  // Un rep-max EST une cible de répétitions. Sans cette lecture, « montée vers
  // 3RM » ne matchait aucune règle et retombait sur le repli : le moteur
  // croyait qu'on demandait 8 ou 10 reps le jour le plus lourd du bloc, et
  // projetait Epley vers le BAS depuis la dernière série de 3. Mesuré sur un
  // cycle réel (phase2_fable5) : les 7 séances « montée vers NRM » touchées —
  // Pause Back Squat proposé à 145 lb après un 170 × 3 @ RPE 8.
  assert(target('montée vers 3RM') === '3-3', '« montée vers 3RM » déclare une cible de 3 reps.');
  assert(target('montée vers 5RM') === '5-5', '« montée vers 5RM » déclare une cible de 5 reps.');
  assert(target('montée vers 3RM test') === '3-3', 'Un suffixe après le rep-max ne l’efface pas.');
  assert(target('3RM') === '3-3', 'Le rep-max seul suffit.');
  // Un pourcentage n'est pas une cible de reps : « 80 % du 1RM » ne demande
  // pas UNE répétition.
  assert(target('à 80% du 1RM') === '10-10', 'Un pourcentage de 1RM ne déclare aucune cible de reps.');
  // Et le schéma de séries garde la priorité sur le rep-max cité après lui.
  assert(target('5×3 @ 85% du 1RM') === '3-3', 'Un format N×M reste prioritaire sur un 1RM cité en pourcentage.');
}

// 2. Deux exercices ne se compressent pas comme quatre. Le palier de densité
//    écrivait « 2, 3 ou 4 » dans le même sélecteur : un bloc de deux mouvements
//    était compressé comme un bloc de quatre, et la carte finissait sur un vide.
const cssSrc = read('styles.css');
// On lit les DEUX paliers de base, pas leurs variantes d'écran court : la
// recherche part du commentaire qui les introduit et prend la première
// occurrence de chacun, dans l'ordre du fichier.
const iTier = cssSrc.indexOf('Mode séance : DEUX exercices');
const iTwo = cssSrc.indexOf('.guided-ex-list:has(.guided-ex-card:nth-child(2)) .guided-ex-grid span', iTier);
const iThree = cssSrc.indexOf('.guided-ex-list:has(.guided-ex-card:nth-child(3)) .guided-ex-grid span', iTier);
assert(iTier > -1, 'Le palier « deux exercices » doit rester identifiable dans styles.css.');
assert(iTwo > -1 && iThree > -1, 'Les paliers 2 et 3+ des libellés d’exercice doivent exister.');
assert(iTwo > -1 && iThree > -1 && iThree > iTwo,
  'Le palier 3+ doit être déclaré APRÈS le palier 2 : à spécificité égale, c’est l’ordre qui tranche.');
function labelPx(from){
  const chunk = cssSrc.slice(from, from + 220);
  const m = chunk.match(/font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px/);
  return m ? Number(m[1]) : null;
}
const twoPx = labelPx(iTwo), threePx = labelPx(iThree);
assert(twoPx !== null && threePx !== null, 'Les tailles de libellé des deux paliers doivent être mesurables.');
assert(twoPx !== null && twoPx >= 13,
  'Libellés Format/Poids/Repos lisibles sans lunettes à deux exercices (≥ 13 px, vu ' + twoPx + ').');
assert(twoPx !== null && threePx !== null && twoPx > threePx,
  'Deux exercices doivent lire plus grand que trois (' + twoPx + ' contre ' + threePx + ').');

// 3. Le rouge du kicker WOD. La famille de couleur est conservée — rouge = bloc
//    WOD, la barre de la carte l'utilise aussi — mais le TEXTE prend une teinte
//    éclaircie : #ff2244 sur fond noir ne donnait que 5,1:1 et bavait.
assert(/--red-hud:/.test(cssSrc), 'Une teinte de rouge lisible en texte doit rester déclarée.');
assert(/\.guided-wod-kicker\s*\{[^}]*color:\s*var\(--red-hud\)/.test(cssSrc),
  'Le kicker du bloc WOD doit utiliser la teinte texte, pas le rouge de signalétique.');
assert(/\.guided-card\.kind-wod::before\s*\{[^}]*var\(--red\)/.test(cssSrc),
  'La barre de la carte WOD garde --red : le code couleur des blocs ne change pas.');

// 4. Le WOD a droit à sa note, et c'est LA MÊME que celle de l'écran Résultats.
//    Deux champs distincts s'écraseraient : guidedResultCache est prioritaire
//    dans collectSessionResults().
const viewSrc = read('scripts/session/view.js');
const resultsSrc = read('scripts/session/results.js');
assert(/guidedNoteButtonHtml\(\{key:"wod_"\+st\.title/.test(viewSrc),
  'La carte WOD doit porter un bouton Notes, sur la clé de sa ligne de résultat.');
assert(/guided-wod-kicker-row/.test(viewSrc) && /\.guided-wod-kicker-row\s*\{/.test(cssSrc),
  'Le bouton Notes du WOD tient sur la ligne du kicker : aucune rangée ajoutée sous le chrono.');
assert(/id="wod_note_'\+item\.key\+'"/.test(resultsSrc),
  'Le champ note du WOD doit être adressable pour être relié au cache.');
assert(/setGuidedResult\(it\.key,'note',noteInp\.value\)/.test(resultsSrc),
  'Le champ note de l’écran Résultats doit écrire dans le même cache que le bouton Notes du WOD.');
assert(/value="'\+escHtml\(getGuidedResult\(item\.key,'note',''\)\)\+'"/.test(resultsSrc),
  'Le champ note de l’écran Résultats doit être pré-rempli par la note écrite pendant le WOD.');

if(errors.length){
  console.error('\nÉCHEC regression_checks.js');
  errors.forEach((e,i) => console.error((i+1) + '. ' + e));
  process.exit(1);
}
console.log('OK regression_checks.js — ' + (version || 'version inconnue'));
console.log('Mode détecté : ' + detectedModeReason);
if(isUpdatePackage) console.log('Mode update : data/ exclu vérifié.');

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
  const m = read('app.js').match(/APP_VERSION\s*=\s*"(V\d+\.\d+)"/);
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
  /^RELEASE_NOTES_V\d+\.\d+/,
  /^OFFICIAL_RELEASE_.*V\d+\.\d+/,
  /^STRUCTURE_AUDIT.*V\d+\.\d+/,
  /^AUDIT.*V\d+\.\d+/,
  /^REGRESSION_REPORT.*V\d+\.\d+/,
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

  assert(app.includes('// Racine ' + version), 'app.js doit garder un en-tête aligné avec APP_VERSION.');
  assert(index.includes('<title>Racine ' + version + '</title>'), 'index.html doit afficher la version dans le titre.');
  assert(index.includes('class="topnav-v">' + version + '</span>'), 'index.html doit afficher la version dans la topnav.');
  assert(index.includes('<footer class="footer">' + version), 'index.html doit afficher la version dans le footer.');
  assert(index.includes('?v=' + cache), 'index.html doit cache-buster les assets avec ?v=' + cache + '.');
  assert(readme.includes('- Version : `' + version + '`'), 'README.md doit afficher la version courante.');
  assert((readme.match(/V\d+\.\d+/g) || []).length === 1, 'README.md ne doit pas redevenir un deuxième changelog.');
  assert(etat.includes('Version actuelle : ' + version), 'ETAT_ACTUEL.md doit afficher la version courante.');
  assert((etat.match(/V\d+\.\d+/g) || []).every(v => v === version), 'ETAT_ACTUEL.md ne doit pas contenir d’anciennes versions.');
  assert(changelog.includes('## ' + version), 'CHANGELOG.md doit contenir une entrée pour la version courante.');
  assert(contract.includes('## Contrat de version'), 'STRUCTURE_CONTRACT.md doit garder le contrat de version visible.');
  assert(contract.includes('Fichiers qui portent la version courante'), 'Le contrat doit lister les fichiers qui portent la version.');
  assert(contract.includes('Fichiers qui ne doivent pas porter la version courante'), 'Le contrat doit lister les fichiers déversionnés.');
  assert(!/V\d+\.\d+/.test(manifest), 'manifest.json ne doit pas porter la version affichée.');
  assert(!/V\d+\.\d+|v\d+-\d+|\b\d+\.\d+\b/.test(serviceWorker), 'service-worker.js doit rester déversionné en mode no-cache.');
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
  const weekTracking = app.match(/function buildWeekTrackingForWeek\(wk, cycle\)\{[\s\S]*?return \{completedDays:completed,missedDays:missed\};\n\}/);
  assert(!!weekTracking && !weekTracking[0].includes('state.completedDays'), 'La reconstruction par semaine ne doit pas réinjecter state.completedDays.');
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

if(errors.length){
  console.error('\nÉCHEC regression_checks.js');
  errors.forEach((e,i) => console.error((i+1) + '. ' + e));
  process.exit(1);
}
console.log('OK regression_checks.js — ' + (version || 'version inconnue'));
console.log('Mode détecté : ' + detectedModeReason);
if(isUpdatePackage) console.log('Mode update : data/ exclu vérifié.');

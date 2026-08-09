#!/usr/bin/env node
/*
  Racine — validation de structure durable.
  Objectif : vérifier les frontières du repo sans transformer chaque module en fichier versionné.

  Usage :
    node dev/structure_checks.js
    node dev/structure_checks.js --update-package
    node dev/structure_checks.js --full
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
  const out=[];
  (function recur(abs){
    for(const entry of fs.readdirSync(abs,{withFileTypes:true})){
      const full=path.join(abs,entry.name);
      const rp=path.relative(root,full).replace(/\\/g,'/');
      if(entry.isDirectory()) recur(full); else out.push(rp);
    }
  })(start);
  return out.sort();
}

const allFiles = walk('.').filter(f => !f.startsWith('.git/'));
if(forcedUpdatePackage && forcedFullPackage){
  fail('Flags incompatibles : --update-package et --full ne peuvent pas être utilisés ensemble.');
}
const hasDataFiles = allFiles.some(f => f.startsWith('data/'));
const isUpdatePackage = forcedUpdatePackage ? true : (forcedFullPackage ? false : !hasDataFiles);
const detectedModeReason = forcedUpdatePackage ? 'update (--update-package)' : (forcedFullPackage ? 'full (--full)' : (hasDataFiles ? 'full (data/ présent)' : 'update (data/ absent)'));

const allowedRootFiles = new Set([
  'app.js','index.html','styles.css','manifest.json','service-worker.js',
  'README.md','CHANGELOG.md','ETAT_ACTUEL.md','RELEASE_CHECKLIST.md','CLAUDE.md',
  'apple-touch-icon.png','apple-touch-icon-precomposed.png','icon-180.png','icon-192.png','icon-512.png',
  // Outillage de développement. Jamais servi au client, jamais référencé par
  // index.html, aucune influence sur le runtime de l'app.
  '.gitignore','jsconfig.json','package.json','package-lock.json','playwright.config.ts'
]);
const allowedDirs = new Set([
  'programs','scripts','data','dev','docs','.github','.claude','assets',
  // Outillage de développement (voir ci-dessus).
  '.vscode','tests'
]);

// 1. Structure racine.
allFiles.forEach(f => {
  const parts = f.split('/');
  if(parts.length === 1){
    assert(allowedRootFiles.has(f), 'Fichier racine autorisé : ' + f);
  } else {
    assert(allowedDirs.has(parts[0]), 'Dossier racine autorisé pour ' + f);
  }
});
assert(!exists('tools'), 'Le dossier tools/ ne doit pas revenir.');
assert(!exists('diagnostics'), 'Le dossier diagnostics/ ne doit pas revenir.');
assert(!exists('programs/test.js'), 'programs/test.js ne doit pas revenir.');
allFiles.forEach(f => {
  const base = path.basename(f);
  if(/^RELEASE_NOTES_V\d+\.\d+(?:\.\d+)?(?:-multi)?/.test(base) || /^AUDIT_V\d+\.\d+(?:\.\d+)?(?:-multi)?/.test(base) || /^REPORT_V\d+\.\d+(?:\.\d+)?(?:-multi)?/.test(base) || /^CHECKLIST_V\d+\.\d+(?:\.\d+)?(?:-multi)?/.test(base)){
    fail('Fichier temporaire/versionné interdit : ' + f);
  }
});

// 2. Données.
if(isUpdatePackage){
  assert(!allFiles.some(f => f.startsWith('data/')), 'ZIP update ne doit contenir aucun fichier data/.');
} else {
  ['data/resultats.json','data/athlete_state.json','data/cycle_state.json','data/charges.js'].forEach(f => assert(exists(f), 'Fichier data attendu dans ZIP complet : ' + f));
}

// 3. Chargement explicite.
const index = exists('index.html') ? read('index.html') : '';
walk('scripts').filter(f => f.endsWith('.js')).forEach(f => {
  assert(index.includes(f), 'Script runtime chargé dans index.html : ' + f);
});
const programsIndex = exists('programs/index.js') ? read('programs/index.js') : '';
walk('programs').filter(f => f.endsWith('.js')).forEach(f => {
  if(f === 'programs/index.js'){
    assert(index.includes(f), 'programs/index.js chargé dans index.html.');
  } else {
    assert(index.includes(f) || programsIndex.includes(path.basename(f, '.js')), 'Programme chargé ou indexé : ' + f);
  }
});

// 4. Dev et docs stables.
const checklist = exists('RELEASE_CHECKLIST.md') ? read('RELEASE_CHECKLIST.md') : '';
walk('dev').filter(f => f.endsWith('.js')).forEach(f => {
  const allowedSelf = f === 'dev/structure_checks.js';
  assert(checklist.includes('node ' + f) || allowedSelf, 'Script dev cité dans RELEASE_CHECKLIST.md : ' + f);
});
const readme = exists('README.md') ? read('README.md') : '';
const etat = exists('ETAT_ACTUEL.md') ? read('ETAT_ACTUEL.md') : '';
const docRefText = readme + '\n' + etat + '\n' + checklist;
walk('docs').filter(f => f.endsWith('.md')).forEach(f => {
  assert(!/V\d+\.\d+(?:\.\d+)?(?:-multi)?/.test(path.basename(f)), 'Document sans version dans le nom : ' + f);
  assert(docRefText.includes(f) || f === 'docs/STRUCTURE_CONTRACT.md', 'Document stable référencé : ' + f);
});
assert(exists('docs/STRUCTURE_CONTRACT.md'), 'docs/STRUCTURE_CONTRACT.md doit exister.');
assert(read('docs/STRUCTURE_CONTRACT.md').includes('## Contrat de version'), 'Le contrat de version doit rester visible.');

// 5. Contrat de version.
const app = exists('app.js') ? read('app.js') : '';
const versionMatch = app.match(/APP_VERSION\s*=\s*"(V\d+\.\d+(?:\.\d+)?(?:-multi)?)"/);
assert(!!versionMatch, 'app.js conserve APP_VERSION.');
// Contrat de version : entièrement délégué à dev/regression_checks.js.
// Les onze assertions vivaient ici ET là-bas, mot pour mot — deux endroits à
// corriger pour une seule règle. Ce qui reste est un verrou de propriété : si
// quelqu'un vide regression_checks de ces contrôles, celui-ci le dit.
if(versionMatch){
  const owner = exists('dev/regression_checks.js') ? read('dev/regression_checks.js') : '';
  assert(/PROPRIÉTAIRE UNIQUE du contrat de version/.test(owner),
    'Le contrat de version appartient à dev/regression_checks.js (ne pas le dupliquer ici).');
  assert(/Version actuelle/.test(owner) || /ETAT_ACTUEL\.md doit afficher la version courante/.test(owner),
    'regression_checks.js doit toujours vérifier la version dans ETAT_ACTUEL.md.');
  assert(/CHANGELOG\.md doit contenir une entrée/.test(owner),
    'regression_checks.js doit toujours vérifier l’entrée CHANGELOG de la version courante.');
}

// 6. Frontières programs.
walk('programs').filter(f => f.endsWith('.js')).forEach(f => {
  const src = read(f);
  assert(!/RuntimePatch|coachBeurtV\d+|smartSuggestedLoad|athleteSuggestedLoad|loadInfoButtonHtml|showLoadInfoModal|coachSafeSuggestedLoad/.test(src), 'Aucun patch/moteur charge dans ' + f);
});
assert(!programsIndex.includes('document.'), 'programs/index.js ne doit pas manipuler le DOM.');
assert(!programsIndex.includes('localStorage'), 'programs/index.js ne doit pas gérer la persistance UI.');
assert(!programsIndex.includes('pcRender'), 'programs/index.js ne doit pas patcher la vue PC.');
assert(!/id\s*:\s*["']test["']|file\s*:\s*["']programs\/test\.js["']/i.test(programsIndex), 'programs/index.js ne doit pas réintroduire le programme Test.');

// 7. Domaines runtime publics.
const domains = [
  ['scripts/core/logger.js', 'window.CoachLog'],
  ['scripts/charge/index.js', 'window.CoachCharge'],
  ['scripts/session/index.js', 'window.CoachSession'],
  ['scripts/state/index.js', 'window.CoachState'],
  ['scripts/ui/index.js', 'window.CoachUI'],
  ['scripts/history/index.js', 'window.CoachHistory'],
  ['scripts/progression/index.js', 'window.CoachProgress'],
  ['scripts/summary/index.js', 'window.CoachSummary'],
  ['scripts/profiles/storage.js', 'window.CoachProfiles']
];
domains.forEach(([file, marker]) => {
  assert(exists(file), 'Module présent : ' + file);
  assert(read(file).includes(marker), file + ' doit exposer ' + marker + '.');
});
['scripts/charge/equipement.js','scripts/charge/utilitaires.js','scripts/charge/mouvements.js','scripts/charge/historique.js','scripts/charge/rpe.js','scripts/charge/suggestion.js','scripts/charge/scaling.js','scripts/charge/index.js'].forEach(f => assert(exists(f), 'Module charge présent : ' + f));
['scripts/equipement.js','scripts/utilitaires_charges.js','scripts/mouvement.js','scripts/charge_gestion.js','scripts/progression_rpe.js','scripts/moteur_charges.js'].forEach(f => assert(!exists(f), 'Ancien emplacement charge supprimé : ' + f));
['scripts/session/view.js','scripts/session/timer.js','scripts/session/results.js','scripts/session/save.js','scripts/session/index.js'].forEach(f => assert(exists(f), 'Module session présent : ' + f));
assert(!exists('scripts/view_session.js'), 'Ancien emplacement session supprimé : scripts/view_session.js');
['scripts/profiles/storage.js','scripts/profiles/reference.js','scripts/profiles/onboarding.js','scripts/profiles/ui.js'].forEach(f => assert(exists(f), 'Module profils présent : ' + f));
assert(read('scripts/charge/suggestion.js').includes('coachApplyUserLoadScale'), 'Le scaling de charge par profil doit être branché dans le moteur de suggestion.');
assert(read('scripts/charge/historique.js').includes('coachAggressivenessFactor'), 'L’agressivité de progression par profil doit être branchée dans le signal historique.');
assert(read('scripts/profiles/reference.js').includes('window.RACINE_REFERENCE_PROFILE'), 'Le référentiel de calibration profil doit exposer RACINE_REFERENCE_PROFILE.');
assert(read('app.js').includes('profile: blankProfile()') && read('app.js').includes('movementRefs: {}'), 'Un profil neuf démarre sans références vivantes préchargées.');

// 8. Ordre et orchestration.
assert(index.indexOf('scripts/state/storage.js') < index.indexOf('app.js?v='), 'CoachState doit être chargé avant app.js.');
assert(index.indexOf('scripts/ui_modals.js') < index.indexOf('scripts/ui/index.js'), 'CoachUI doit être chargé après ui_modals.js.');
assert(index.indexOf('scripts/history/index.js') < index.indexOf('scripts/charge/index.js'), 'CoachHistory doit être chargé avant CoachCharge index.');
assert(index.indexOf('scripts/progression/index.js') < index.indexOf('scripts/summary/index.js'), 'CoachSummary doit être chargé après CoachProgress.');
assert(index.indexOf('scripts/summary/index.js') < index.indexOf('scripts/session/results.js'), 'CoachSummary doit être chargé avant les résultats session.');
assert(index.indexOf('scripts/session/index.js') < index.indexOf('app.js?v='), 'CoachSession doit être chargé avant app.js.');
assert(app.includes('CoachCharge.'), 'app.js doit utiliser CoachCharge.');
assert(app.includes('CoachSession.'), 'app.js doit utiliser CoachSession.');
assert(app.includes('CoachState.readState') && app.includes('CoachState.writeState'), 'app.js doit utiliser CoachState pour state.');
assert(app.includes('CoachUI.escapeHtml'), 'app.js doit utiliser CoachUI.escapeHtml.');
assert(!/localStorage\.(getItem|setItem|removeItem)\s*\(/.test(app), 'app.js ne doit plus accéder directement à localStorage.');

// 9. Vue PC / Session / Résultats.
assert(read('scripts/app_navigation.js').includes('var VIEW_MAIN_IDS={pc:"pcView"}'), 'Navigation doit utiliser #pcView comme hôte officiel PC.');
assert(read('scripts/app_navigation.js').includes('legacyHost.id="phoneView"'), 'phoneView doit rester wrapper hérité interne.');
assert(read('scripts/session/index.js').includes("view.id = 'sessionView'"), 'CoachSession doit posséder #sessionView.');
assert(read('scripts/session/index.js').includes("document.getElementById('pcView')"), 'Session doit être insérée à côté de pcView.');
assert(read('scripts/view_wodplus.js').includes('CoachSession.openFrom("wodplus")'), 'WOD+ doit ouvrir Session via CoachSession.');
assert(read('scripts/view_pc.js').includes("CoachSession.openFrom('phone')"), 'PC doit ouvrir Session via CoachSession.');
assert(!read('scripts/view_pc.js').includes('CoachSession.renderResults'), 'PC ne doit pas rendre Results.');
assert(read('scripts/session/results.js').includes('CoachSummary.buildSessionSummary'), 'Results doit déléguer le résumé à CoachSummary.');

// 10. Assets PWA.
['apple-touch-icon.png','apple-touch-icon-precomposed.png','icon-180.png','icon-192.png','icon-512.png'].forEach(f => {
  assert(index.includes(f) || read('manifest.json').includes(f), 'Asset PWA référencé : ' + f);
});

if(errors.length){
  console.error('\nÉCHEC structure_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK structure_checks.js');
console.log('Mode détecté : ' + detectedModeReason);
notes.forEach(n => console.log(' - ' + n));

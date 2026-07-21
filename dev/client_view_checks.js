#!/usr/bin/env node
/*
  Racine — garde-fous vue client + panneau admin programmes.
  Lecture statique des sources. Vérifie le gating admin/non-admin et l'innocuité
  de setProfileActiveProgram (aucune réinitialisation de l'historique).
*/
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [], notes = [];
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (cond, msg) => (cond ? notes : errors).push(msg);

const storage = read('scripts/profiles/storage.js');
const viewPc  = read('scripts/view_pc.js');
const app     = read('app.js');
const ui      = read('scripts/profiles/ui.js');
const modals  = read('scripts/ui_modals.js');
const index   = read('index.html');

// Helper admin centralisé
assert(/api\.isActiveAdmin\s*=\s*function/.test(storage), 'CoachProfiles.isActiveAdmin défini dans storage.js.');
// La vue PC n'a plus de gating interne : plus d'onglet Admin (grille déménagée
// dans Gear) ; l'accès à la vue reste gardé par switchView (assertion plus bas).
assert(!/pcRenderAdminTab|pcBindAdmin/.test(viewPc), 'Vue PC : onglet Admin retiré (grille dans Gear).');

// Gating vue client
const boot = app.match(/function coachFullBoot\(\)\{[\s\S]*?\n\}/);
assert(!!boot, 'coachFullBoot présent.');
assert(!!boot && /applyAdminVisibility\(/.test(boot[0]), 'applyAdminVisibility() appelée dans coachFullBoot.');
assert(/function applyAdminVisibility/.test(app), 'applyAdminVisibility définie.');
assert(read('scripts/app_navigation.js').includes('isActiveAdmin'), 'switchView garde la vue PC pour l’admin.');

// Modale (!) : boutons Avis IA gatés admin
assert(/aiAdmin/.test(modals) && modals.includes('copyAiAdviceMovementBtn'), 'Boutons Avis IA conditionnés à l’admin.');

// Réglages : dashboard clients + panneau admin programmes gatés
assert(ui.includes('CoachProfiles.isActiveAdmin') && ui.includes('clientDashboardBtn'), 'Tableau de bord clients conditionné à l’admin.');
assert(/RacineAdminPrograms\.render\(\)/.test(app) && /isActiveAdmin\(\)\s*\)\s*RacineAdminPrograms/.test(app.replace(/\s+/g,' ')), 'Panneau admin programmes rendu seulement si admin.');

// Module admin programmes chargé
assert(index.includes('scripts/profiles/admin_programs.js'), 'admin_programs.js chargé dans index.html.');
assert(fs.existsSync(path.join(root, 'scripts/profiles/admin_programs.js')), 'scripts/profiles/admin_programs.js existe.');
assert(index.includes('Programmes spécialisés'), 'Gear nomme clairement la gestion des programmes spécialisés.');
assert(index.includes('programmes de base'), 'Gear rappelle que les programmes de base sont déjà accessibles.');

// setProfileActiveProgram : ne réinitialise jamais l'historique/les résultats
const m = storage.match(/setProfileActiveProgram\s*=\s*function[\s\S]*?\n  \};/);
assert(!!m, 'setProfileActiveProgram présent dans storage.js.');
const body = m ? m[0] : '';
assert(!/\.history\s*=|\bhistory\s*=\s*\[|\.results\s*=|\.athleteState\s*=|splice\(|removeItem\(/.test(body),
  'setProfileActiveProgram n’écrit pas sur history/results/athleteState et ne supprime rien.');
assert(/st\.cycle\.goal\s*=\s*programId/.test(body), 'setProfileActiveProgram écrit bien le cycle cible.');

if(errors.length){
  console.error('\nÉCHEC client_view_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK client_view_checks.js');
notes.forEach(n => console.log(' - ' + n));

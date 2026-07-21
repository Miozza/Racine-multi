#!/usr/bin/env node
/*
  Racine — garde-fous UI export/import de profil.
  Après ménage : un seul couple de boutons (Exporter mon profil / Importer un
  profil) dans le panneau « Profil » des Réglages. Plus de sauvegarde « état
  brut » dédiée, plus de vue « Backup », plus d'export multi-profils
  (« la gestion de profil ne se fait plus par l'admin »). L'import unifié
  reste rétro-compatible avec les anciennes sauvegardes.

  Usage : node dev/profile_backup_ui_checks.js
*/
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const html = read('index.html');
const ui = read('scripts/profiles/ui.js');
const app = read('app.js');
const nav = read('scripts/app_navigation.js');

// ── Doublons retirés de l'UI ────────────────────────────────────────────────
assert(!/id="backupView"/.test(html), 'index.html : vue « Backup » dédiée retirée');
assert(!/exportBackupBtn|importBackupFile/.test(html), 'index.html : boutons backup état-brut retirés');
assert(!/Sauvegarde locale/.test(html), 'index.html : panneau « Sauvegarde locale » retiré');
assert(!/backup/.test(nav.match(/var VIEWS=\[[^\]]*\]/)[0]), 'app_navigation : vue « backup » retirée de VIEWS');

// ── Un seul couple export/import de profil ─────────────────────────────────
assert(ui.includes('id="exportProfileBtn"'), 'Réglages : bouton Exporter mon profil présent');
assert(/Exporter mon profil/.test(ui), 'Réglages : libellé « Exporter mon profil »');
assert(ui.includes('id="importProfileFile"'), 'Réglages : bouton Importer un profil présent');

// ── Export multi-profils (admin) retiré partout ────────────────────────────
assert(!/exportAllProfilesBtn/.test(ui), 'Réglages : bouton « Exporter tous les profils » retiré');
assert(!/racineExportAllBtn/.test(ui), 'Sélecteur : bouton « Exporter tous les profils » retiré');
assert(!/function exportAllProfiles\b/.test(ui), 'ui.js : fonction exportAllProfiles morte retirée');

// ── Rétro-compatibilité import : repli vers l'ancien format « état brut » ───
assert(/restoreLegacyStateBackup/.test(app) && /window\.restoreLegacyStateBackup\s*=/.test(app),
  'app.js : restaurateur legacy défini et exposé');
assert(ui.includes('restoreLegacyStateBackup'), 'Import de profil : repli legacy branché');
assert(!/function exportBackup\b/.test(app), 'app.js : ancienne fonction exportBackup retirée');
assert(!/function importBackup\b/.test(app), 'app.js : ancienne fonction importBackup retirée');

// ── L'import de profil reste fonctionnel (format profil) ───────────────────
assert(ui.includes('importExportPayload'), 'Import de profil : format profil toujours géré');

process.on('exit', function(){
  if(failures){ console.error('\n❌ profile_backup_ui_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ profile_backup_ui_checks OK');
});

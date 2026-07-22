#!/usr/bin/env node
/*
  Racine — garde-fous : Progression hébergée dans l'onglet Historique.
  La Progression riche (ex-onglet « Progression » de la vue PC) est montée
  dans #progressCharts de l'Historique pour TOUS les profils, et l'onglet
  a disparu de la vue PC (admin inclus). Lecture statique des sources.

  Usage : node dev/history_progress_checks.js
*/
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const pc = read('scripts/view_pc.js');
const app = read('app.js');
const html = read('index.html');

// ── L'onglet Progression n'existe plus dans la vue PC ──────────────────────
assert(!/\['progress'\s*,\s*'Progression'\]/.test(pc), 'vue PC : onglet « Progression » retiré de la barre d\'onglets');
assert(!/pcActiveTab==='progress'/.test(pc), 'vue PC : plus aucune branche de rendu/binding sur l\'onglet progress');

// ── Le moteur de rendu progression est conservé et monté ailleurs ──────────
assert(/function pcRenderProgressTab/.test(pc), 'moteur : pcRenderProgressTab conservé');
assert(/function pcRenderProgressInto/.test(pc) && /window\.pcRenderProgressInto\s*=/.test(pc),
  'moteur : pcRenderProgressInto défini et exposé pour l\'Historique');
assert(/"progressCharts"/.test(pc), 'moteur : monté par défaut dans #progressCharts');

// ── Les interactions re-rendent le conteneur, pas la vue PC ────────────────
const bindBlock = pc.match(/function pcBindProgression\(\)\{[\s\S]*?\n\}/);
assert(!!bindBlock, 'pcBindProgression présent');
assert(bindBlock && !/renderPhoneWod/.test(bindBlock[0]),
  'interactions progression : ne re-rendent plus la vue PC (renderPhoneWod)');
assert(bindBlock && /pcRenderProgressInto/.test(bindBlock[0]),
  'interactions progression : re-rendent le conteneur via pcRenderProgressInto');

// ── L'Historique monte la Progression riche, avec repli ────────────────────
assert(/pcRenderProgressInto\("progressCharts"\)/.test(app), 'renderHistory : monte la Progression riche');
assert(/else renderProgressCharts\(\)/.test(app), 'renderHistory : repli mini-barres si view_pc absent');
assert(/function renderProgressCharts/.test(app), 'repli renderProgressCharts conservé');
assert(/id="progressCharts"/.test(html), 'index.html : conteneur #progressCharts présent dans l\'Historique');

// ── Sous-onglets : séances prioritaires, progression sur demande ───────────
const css = read('styles.css');
assert(/id="historySubtabSessions"/.test(html) && /id="historySubtabProgress"/.test(html),
  'index.html : sous-onglets Séances / Progression présents');
assert(/historyActiveSubtab\s*=\s*"sessions"/.test(app), 'app.js : les séances sont le sous-onglet par défaut (prioritaires)');
assert(/historyActiveSubtab==="progress"/.test(app), 'renderHistory : bascule selon le sous-onglet actif');
assert(/historySubtabSessions/.test(app) && /historySubtabProgress/.test(app), 'app.js : clics des sous-onglets branchés');
assert(/id="historyLandscapeHint"/.test(html) && /paysage/i.test(html),
  'index.html : bandeau d\'invitation au mode paysage présent');
assert(/orientation\s*:\s*portrait/.test(css) && /history-landscape-hint/.test(css),
  'styles.css : le bandeau paysage ne s\'affiche qu\'en portrait (media query)');

// ── L'Historique reste accessible à tous (pas de garde admin) ──────────────
const histView = html.match(/<main id="historyView">[\s\S]*?<\/main>/);
assert(!!histView && !/admin-only/.test(histView[0]), 'vue Historique : aucune classe admin-only');

process.on('exit', function(){
  if(failures){ console.error('\n❌ history_progress_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ history_progress_checks OK');
});

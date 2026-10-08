#!/usr/bin/env node
/*
  Racine — garde-fous de la sauvegarde GitHub (scripts/sync/github_backup.js).

  Décision du 2026-10-08 (CLAUDE.md §3.4) : la copie GitHub revient, pour le
  profil admin seulement. Ce qui la rend acceptable, et que cette suite tient :
  un seul profil, le jeton hors du state, jamais le dépôt de code, aucune
  lecture distante automatique, aucune écriture locale par la restauration,
  et le réseau confiné à deux fichiers.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [], notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function code(p){
  return read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .map(function(l){ return l.replace(/(^|[^:])\/\/.*$/, '$1'); }).join('\n');
}
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

const FILE = 'scripts/sync/github_backup.js';
const src = code(FILE);

// ── Le réseau reste confiné ────────────────────────────────────────────────
const ALLOWED = ['scripts/coach_ai/client.js', FILE];
(function walk(dir){
  fs.readdirSync(path.join(root, dir), {withFileTypes:true}).forEach(function(e){
    const rel = dir + '/' + e.name;
    if(e.isDirectory()) return walk(rel);
    if(!/\.js$/.test(e.name) || ALLOWED.indexOf(rel) >= 0) return;
    assert(!/\bfetch\(/.test(code(rel)), 'Aucun fetch() hors des deux fichiers réseau : ' + rel);
  });
})('scripts');
assert(!/\bfetch\(/.test(code('app.js')), 'app.js n\'appelle pas le réseau.');

// ── Données : rien d'effacé, rien d'écrasé ─────────────────────────────────
assert(src.indexOf('localStorage.clear') === -1, 'Aucun localStorage.clear().');
assert((src.match(/localStorage\.removeItem\(([^)]*)\)/g) || []).every(function(m){ return m === 'localStorage.removeItem(KEY)'; }),
  'Seul removeItem permis : la clé de réglages du module.');
assert(/importProfileBlob\(got\.blob, \{setActive: false\}\)/.test(src) && src.indexOf('replaceId') === -1,
  'La restauration crée un NOUVEAU profil, jamais un remplacement.');
assert(/exportProfileBlob\(c\.profileId\)/.test(src), 'Le fichier envoyé est l\'export JSON ordinaire (importable à la main).');
assert(code('scripts/session/save.js').indexOf('RacineGitHubBackup.schedule()') !== -1, 'Envoi déclenché après une séance sauvegardée.');

// ── Comportement, sur un faux navigateur ───────────────────────────────────
const store = {};
const ctx = {console:console, setTimeout:function(){ return 1; }, clearTimeout:function(){},
  document:{readyState:'complete', getElementById:function(){ return null; }, addEventListener:function(){}},
  localStorage:{getItem:function(k){ return k in store ? store[k] : null; }, setItem:function(k, v){ store[k] = String(v); }, removeItem:function(k){ delete store[k]; }},
  addEventListener:function(){}};
ctx.window = ctx;
let admin = true, active = 'p_bertin';
ctx.CoachProfiles = {isActiveAdmin:function(){ return admin; }, getActiveId:function(){ return active; },
  get:function(){ return {name:'Bertin'}; }, exportProfileBlob:function(){ return {profile:{}, state:{history:[]}}; }};
vm.createContext(ctx);
vm.runInContext(read(FILE), ctx, {filename:FILE});
const B = ctx.RacineGitHubBackup;

assert(B.configure({token:'t', owner:'Miozza', repo:'Racine-multi'}).ok === false, 'Le dépôt de code est refusé (Pages publierait la sauvegarde).');
assert(B.configure({token:'t', owner:'Miozza', repo:'racine-sauvegarde'}).ok && B.isActiveTarget(), 'Un dépôt séparé est accepté pour le profil actif.');
assert(B.filePath() === 'racine/bertin.json', 'Chemin par défaut lisible : racine/<profil>.json.');
assert(JSON.stringify(B.get()).indexOf('"t"') === -1, 'get() ne rend jamais le jeton en clair.');
active = 'p_client';
assert(!B.isActiveTarget() && B.schedule() === false, 'Un autre profil n\'est jamais envoyé.');
active = 'p_bertin'; admin = false;
assert(!B.isActiveTarget() && B.configure({repo:'x'}).ok === false, 'Un profil non admin n\'envoie ni ne configure rien.');
admin = true;
assert(B.schedule() === true, 'Le profil admin configuré programme un envoi.');
assert(read('scripts/profiles/storage.js').indexOf('racine_github_backup') === -1, 'Le jeton n\'entre pas dans l\'export de profil.');

if(errors.length){
  console.error('\n✗ github_backup_checks — ' + errors.length + ' échec(s) :');
  errors.forEach(function(e){ console.error('  ✗ ' + e); });
  process.exit(1);
}
console.log('✓ github_backup_checks — ' + notes.length + ' vérifications passées.');

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
assert(B.filePath() === 'racine/bertin-profil.json' && B.files().historique === 'racine/bertin-historique.json' && B.files().resume === 'racine/bertin-resume.md',
  'Trois fichiers lisibles : historique brut, résumé, export de restauration.');
assert(/history: history/.test(src) && /CoachAIContext\.build\(/.test(src), 'L\'historique brut et le résumé Coach IA partent avec la sauvegarde.');
assert(/coachOnly/.test(src) && /\/coach\//.test(src) && /markArchived/.test(src),
  'Les échanges Coach IA partent dans une archive à part, sans renvoyer le profil complet.');
assert(/api\.pushRequest = /.test(src) && /\/demandes\//.test(src) && /nowIso\(\)\.replace/.test(src),
  'Les demandes pour Claude Code partent dans demandes/, horodatées : jamais réécrites ni relues.');
assert(/force: false/.test(src), 'La branche n\'est jamais déplacée de force : un conflit se rejoue, il n\'écrase pas.');
assert(JSON.stringify(B.get()).indexOf('"t"') === -1, 'get() ne rend jamais le jeton en clair.');
active = 'p_client';
assert(!B.isActiveTarget() && B.schedule() === false, 'Un autre profil n\'est jamais envoyé.');
active = 'p_bertin'; admin = false;
assert(!B.isActiveTarget() && B.configure({repo:'x'}).ok === false, 'Un profil non admin n\'envoie ni ne configure rien.');
admin = true;
assert(B.schedule() === true, 'Le profil admin configuré programme un envoi.');
assert(read('scripts/profiles/storage.js').indexOf('racine_github_backup') === -1, 'Le jeton n\'entre pas dans l\'export de profil.');

// ── V5.2.20 : un envoi n'est jamais avalé ni gelé ──────────────────────────
assert(/addEventListener\("visibilitychange", onVisible\)/.test(src) && /addEventListener\("pageshow", flushPending\)/.test(src),
  'Un envoi en attente repart quand l\'app sort de l\'arrière-plan (iPhone), pas seulement au démarrage.');
assert(/RacineGitHubBackup\.isActiveTarget\(\)/.test(code('scripts/session/results.js')) && /backupProfileBtn/.test(code('scripts/session/results.js')),
  'Fin de séance : le bouton d\'export manuel laisse place à « part sur GitHub » quand la sauvegarde est active, et reste sinon.');
assert(code('scripts/session/history_edit.js').indexOf('RacineGitHubBackup.schedule()') !== -1,
  'Une séance corrigée dans l\'Historique part aussi sur GitHub.');

(async function(){
  // Faux GitHub : chaque appel attend qu'on le libère, et on compte les commits.
  const posted = [];
  let release = [];
  ctx.fetch = function(url, init){
    return new Promise(function(resolve){
      release.push(function(){
        const m = (init && init.method) || 'GET';
        if(/\/git\/trees$/.test(url)) posted.push(JSON.parse(init.body).tree.map(function(t){ return t.path; }));
        const body = /\/git\/ref\//.test(url) ? {object:{sha:'p'}}
          : /\/git\/commits\/p$/.test(url) ? {tree:{sha:'t0'}}
          : /\/git\/trees$/.test(url) ? {sha:'t' + posted.length}
          : /\/git\/commits$/.test(url) ? {sha:'c'} : {};
        resolve({ok:true, status:200, json:async function(){ return body; }});
      });
    });
  };
  async function drain(){ for(let i = 0; i < 40; i++){ const r = release; release = []; r.forEach(function(f){ f(); }); await new Promise(function(r2){ setImmediate(r2); }); } }
  ctx.CoachAIChat = {pendingArchive:function(){ return {upTo:'2026-10-13T10:00:00Z', from:'2026-10-13T09:00:00Z', count:2, markdown:'x'}; }, markArchived:function(){}};
  const coach = B.push({coachOnly:true});        // une conversation part…
  const session = B.push();                      // …et la séance est sauvegardée pendant ce temps
  await drain();
  const a = await coach, b = await session;
  assert(a.ok && b.ok, 'Les deux envois aboutissent.');
  assert(posted.length === 2 && posted[1].some(function(p){ return /-historique\.json$/.test(p); }),
    'La séance sauvegardée pendant un envoi Coach IA part quand même (historique dans le second commit).');
  assert(JSON.parse(store.racine_github_backup_v1).pending === false, 'Plus rien en attente après les deux envois.');
  // Une séance restée en attente part avec la prochaine conversation Coach IA.
  store.racine_github_backup_v1 = JSON.stringify(Object.assign(JSON.parse(store.racine_github_backup_v1), {pending:true}));
  const before = posted.length;
  const late = B.push({coachOnly:true});
  await drain();
  await late;
  assert(posted.length === before + 1 && posted[before].some(function(p){ return /-historique\.json$/.test(p); }),
    'Une séance en attente part avec l\'envoi d\'une conversation Coach IA, au lieu de rester bloquée.');
  report();
})().catch(function(e){ errors.push('Exception : ' + e.message); report(); });

function report(){
if(errors.length){
  console.error('\n✗ github_backup_checks — ' + errors.length + ' échec(s) :');
  errors.forEach(function(e){ console.error('  ✗ ' + e); });
  process.exit(1);
}
console.log('✓ github_backup_checks — ' + notes.length + ' vérifications passées.');
}

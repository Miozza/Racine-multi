#!/usr/bin/env node
/*
  Racine — tests ciblés de l'export JSON (profil & historique) sur iOS.
  Vérifie scripts/export_file.js (window.RacineExport.saveJson) :
    - génération d'un vrai fichier (bon contenu JSON UTF-8) ;
    - nom de fichier et type MIME corrects ;
    - partage natif quand navigator.canShare({files}) le permet ;
    - repli <a download> + revokeObjectURL quand le partage est indisponible ;
    - message clair et AUCUNE ouverture du JSON comme page (nouvel onglet)
      sur un ancien Safari iOS.

  Usage : node dev/json_export_ios_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let failures = 0;
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

// --- Charge le module dans un bac à sable contrôlé -------------------------
function loadModule(env){
  const src = fs.readFileSync(path.join(root, 'scripts/export_file.js'), 'utf8');
  const self = {};
  const trace = { clicks: [], revoked: [], created: [], shared: null, shareCalls: 0,
                  messages: [], opened: [], canShareArgs: [] };

  function Blob(parts, opts){ this.parts = parts; this.type = (opts && opts.type) || ''; this._text = parts.join(''); }
  function File(parts, name, opts){ this.parts = parts; this.name = name; this.type = (opts && opts.type) || ''; this._text = parts.join(''); }

  const URL = {
    _n: 0,
    createObjectURL(b){ trace.created.push(b); return 'blob:mock/' + (++URL._n); },
    revokeObjectURL(u){ trace.revoked.push(u); }
  };

  const document = {
    createElement(tag){
      const el = { tagName: String(tag).toLowerCase(), style: {} };
      if(el.tagName === 'a' && env.anchorDownloadSupported) el.download = '';
      el.click = function(){
        trace.clicks.push({ href: el.href, download: el.download, target: el.target });
      };
      el.remove = function(){};
      return el;
    },
    body: { appendChild(){}, removeChild(){} }
  };

  const navigator = {
    userAgent: env.userAgent || '',
    platform: env.platform || '',
    maxTouchPoints: env.maxTouchPoints || 0
  };
  if(env.hasShare){
    navigator.share = function(payload){
      trace.shareCalls++;
      trace.shared = payload;
      if(env.shareRejects) return Promise.reject(env.shareRejects);
      return Promise.resolve();
    };
    navigator.canShare = function(data){
      trace.canShareArgs.push(data);
      return !!env.canShareFiles;
    };
  }

  self.window = self;
  self.document = document;
  self.navigator = navigator;
  self.URL = URL;
  self.Blob = Blob;
  self.File = File;
  self.alert = function(m){ trace.messages.push(m); };
  self.setTimeout = function(fn){ fn(); return 0; };
  self.open = function(u){ trace.opened.push(u); return null; }; // ne DOIT jamais être appelé

  vm.runInNewContext(src, { self });
  return { api: self.RacineExport, trace };
}

const DATA = { version: '4.5.18', history: [{ jour: 'lundi', rpe: 8 }], accents: 'éàçüô' };

// --- Scénario 1 : iOS moderne, partage de fichiers disponible --------------
(function(){
  const { api, trace } = loadModule({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) Safari',
    hasShare: true, canShareFiles: true, anchorDownloadSupported: true
  });
  return api.saveJson('racine-profil-bertin.json', DATA).then(function(res){
    assert(res.method === 'share', 'iOS moderne : utilise le partage natif');
    assert(trace.shareCalls === 1, 'iOS moderne : navigator.share appelé une fois');
    assert(trace.canShareArgs.length === 1 && Array.isArray(trace.canShareArgs[0].files),
      'iOS moderne : canShare vérifié avec {files:[...]} avant le partage');
    const f = trace.shared.files[0];
    assert(f && f.name === 'racine-profil-bertin.json', 'partage : nom de fichier .json correct');
    assert(f && f.type === 'application/json', 'partage : type MIME application/json');
    assert(f && f._text === JSON.stringify(DATA, null, 2), 'partage : contenu JSON exact (structure inchangée)');
    assert(/éàçüô/.test(f._text), 'partage : accents UTF-8 préservés');
    assert(trace.clicks.length === 0, 'partage : aucun repli <a download>');
    assert(trace.opened.length === 0, 'partage : aucune ouverture de page/onglet');
  });
})();

// --- Scénario 2 : desktop/Android, pas de partage → repli téléchargement ---
(function(){
  const { api, trace } = loadModule({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome Safari',
    hasShare: false, anchorDownloadSupported: true
  });
  return api.saveJson('racine-historique-2026-07-21.json', DATA).then(function(res){
    assert(res.method === 'download', 'desktop : repli <a download>');
    assert(trace.clicks.length === 1, 'desktop : un seul clic de téléchargement');
    assert(trace.clicks[0].download === 'racine-historique-2026-07-21.json', 'desktop : attribut download = nom .json');
    assert(/^blob:/.test(trace.clicks[0].href), 'desktop : href = URL blob (createObjectURL)');
    assert(!trace.clicks[0].target, 'desktop : pas de target=_blank (aucun nouvel onglet)');
    assert(trace.created[0] && /application\/json/.test(trace.created[0].type), 'desktop : Blob type application/json');
    assert(/charset=utf-8/.test(trace.created[0].type), 'desktop : Blob encodé UTF-8');
    assert(trace.revoked.length === 1, 'desktop : URL nettoyée avec revokeObjectURL');
    assert(trace.opened.length === 0, 'desktop : aucune ouverture de page/onglet');
  });
})();

// --- Scénario 3 : ancien iOS (iOS 13), partage de fichiers indisponible ----
(function(){
  const { api, trace } = loadModule({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2 like Mac OS X) Version/13.0 Safari',
    hasShare: false, anchorDownloadSupported: true // Safari « annonce » download mais navigue
  });
  return api.saveJson('racine-profil.json', DATA).then(function(res){
    assert(res.method === 'message', 'iOS ancien : message clair au lieu d\'ouvrir une page');
    assert(trace.messages.length === 1 && /Fichiers|Safari/.test(trace.messages[0]),
      'iOS ancien : le message invite au partage / mise à jour de Safari');
    assert(trace.clicks.length === 0, 'iOS ancien : PAS de navigation <a> vers le blob');
    assert(trace.opened.length === 0, 'iOS ancien : le JSON n\'est JAMAIS ouvert comme page web');
  });
})();

// --- Scénario 4 : iOS moderne, partage annulé par l'utilisateur ------------
(function(){
  const abort = new Error('cancel'); abort.name = 'AbortError';
  const { api, trace } = loadModule({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) Safari',
    hasShare: true, canShareFiles: true, shareRejects: abort, anchorDownloadSupported: true
  });
  return api.saveJson('racine-profil.json', DATA).then(function(res){
    assert(res.method === 'share-cancelled', 'annulation : ne bascule pas en téléchargement forcé');
    assert(trace.clicks.length === 0 && trace.opened.length === 0, 'annulation : aucun onglet, aucun clic parasite');
  });
})();

// --- Vérifications statiques : les points d'entrée passent par le helper ----
(function(){
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const results = fs.readFileSync(path.join(root, 'scripts/session/results.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'scripts/profiles/ui.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert(html.includes('scripts/export_file.js'), 'index.html charge scripts/export_file.js');
  assert(app.includes('saveJsonFile("racine-historique-'), 'app.js : export historique en vrai .json');
  assert(!/racine-historique\.txt/.test(app), 'app.js : plus d\'export historique en .txt');
  assert(app.includes('RacineExport.saveJson') || app.includes('window.RacineExport'), 'app.js : profil via RacineExport');
  assert(results.includes('RacineExport.saveJson'), 'results.js : sauvegarde profil via RacineExport');
  assert(ui.includes('RacineExport.saveJson'), 'profiles/ui.js : export profil via RacineExport');

  // Aucun export JSON profil/historique ne doit ouvrir un onglet.
  const exportFile = fs.readFileSync(path.join(root, 'scripts/export_file.js'), 'utf8');
  assert(!/window\.open|target\s*=\s*["']_blank/.test(exportFile), 'export_file.js : n\'ouvre jamais d\'onglet');
  assert(/\bcanShare\b/.test(exportFile) && /\bshare\s*\(/.test(exportFile) && /files\s*:\s*\[/.test(exportFile),
    'export_file.js : utilise navigator.share gardé par canShare({files})');
  assert(/revokeObjectURL/.test(exportFile), 'export_file.js : nettoie l\'URL (revokeObjectURL)');
})();

process.on('exit', function(){
  if(failures){ console.error('\n❌ json_export_ios_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ json_export_ios_checks OK');
});

#!/usr/bin/env node
/*
  Racine — vérificateur d'architecture (audit).

  Compare architecture.json au contenu réel du dépôt :
    1. ÉCHEC si un fichier suivi par git est absent de architecture.json.
    2. ÉCHEC si architecture.json référence un fichier qui n'existe plus.
    3. AVERTISSEMENT si la taille d'un fichier a bougé de façon significative
       depuis la génération (dérive de contenu → manifeste à régénérer).
  Code de sortie non nul en cas d'échec (branchable en CI).

  Usage :
    node tools/verify-architecture.js
    node tools/verify-architecture.js --drift 0.25   # seuil de dérive (défaut 0.20)
    node tools/verify-architecture.js --json          # sortie machine

  Sans dépendance externe. N'écrit rien.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'architecture.json');

function arg(name, fallback){
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const JSON_OUT = process.argv.includes('--json');
const DRIFT = Math.max(0, Number(arg('--drift', '0.20')) || 0.20);

function die(msg){ console.error('verify-architecture: ' + msg); process.exit(2); }

if(!fs.existsSync(MANIFEST)) die('architecture.json introuvable à la racine du dépôt.');

let manifest;
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); }
catch(e){ die('architecture.json illisible : ' + e.message); }

if(!manifest || !Array.isArray(manifest.files)) die('architecture.json : champ "files" absent ou non-tableau.');

// Liste des fichiers réellement suivis (source de vérité = git, hors .git).
let tracked;
try {
  tracked = cp.execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean)
    .filter(f => !f.startsWith('.git/'));
} catch(e){
  die('git ls-files a échoué (dépôt git requis) : ' + e.message);
}

const trackedSet = new Set(tracked);
const manifestPaths = manifest.files.map(f => f.path);
const manifestSet = new Set(manifestPaths);

// Le manifeste se référence lui-même : toléré même si non encore commité.
const SELF = new Set(['architecture.json', 'ARCHITECTURE.md', 'tools/verify-architecture.js']);

const errors = [];
const warnings = [];

// 1. Fichiers présents dans le dépôt mais absents du manifeste.
tracked.forEach(f => {
  if(!manifestSet.has(f)) errors.push('Fichier suivi absent de architecture.json : ' + f);
});

// 2. Entrées du manifeste sans fichier réel.
manifest.files.forEach(entry => {
  const f = entry.path;
  if(!fs.existsSync(path.join(ROOT, f))){
    errors.push('architecture.json référence un fichier inexistant : ' + f);
  } else if(!trackedSet.has(f) && !SELF.has(f)){
    warnings.push('Fichier listé mais non suivi par git : ' + f);
  }
});

// 3. Dérive de taille significative.
manifest.files.forEach(entry => {
  const f = entry.path;
  const abs = path.join(ROOT, f);
  if(typeof entry.size !== 'number' || !fs.existsSync(abs)) return;
  let cur;
  try { cur = fs.statSync(abs).size; } catch(e){ return; }
  const base = entry.size;
  if(base === 0){
    if(cur > 0) warnings.push('Dérive taille : ' + f + ' 0 → ' + cur + ' octets.');
    return;
  }
  const delta = Math.abs(cur - base) / base;
  if(delta >= DRIFT){
    warnings.push('Dérive taille ' + (delta * 100).toFixed(0) + '% : ' + f +
      ' (' + base + ' → ' + cur + ' octets) — régénérer architecture.json ?');
  }
});

if(JSON_OUT){
  console.log(JSON.stringify({
    ok: errors.length === 0,
    generatedAt: manifest.generatedAt || null,
    trackedFiles: tracked.length,
    manifestFiles: manifestPaths.length,
    errors, warnings
  }, null, 2));
} else {
  warnings.forEach(w => console.warn('AVERTISSEMENT : ' + w));
  if(errors.length){
    console.error('\nÉCHEC verify-architecture.js');
    errors.forEach(e => console.error(' - ' + e));
  } else {
    console.log('OK verify-architecture.js — ' + manifestPaths.length +
      ' fichiers manifestés, ' + tracked.length + ' suivis par git.' +
      (warnings.length ? ' (' + warnings.length + ' avertissement(s))' : ''));
  }
}

process.exit(errors.length ? 1 : 0);

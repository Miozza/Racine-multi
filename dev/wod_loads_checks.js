#!/usr/bin/env node
/*
  Racine — garde-fou : un metcon ne laisse jamais une charge à deviner.

  Règle (décision de l'athlète, 2026-10-15) : dans un bloc `kind:"wod"`, tout
  mouvement chargé porte sa charge écrite (« 20 lb », « 53/35 lb », « 24 po »,
  « poids du corps »), et un EMOM à plusieurs mouvements dit dans quelle
  minute va chacun. Une kettlebell se donne toujours en kg (2026-10-16).
  Sans ça, l'écran du metcon affichait « 12 Cal Row » et
  « 12 Goblet Squats » sans poids ni ordre, et l'athlète devinait.

  Portée : TOUS les programmes chargés par index.html, donc chaque nouveau
  programme. Les programmes antérieurs pas encore corrigés sont listés dans
  LEGACY : la liste ne peut que rétrécir. Un programme de LEGACY devenu propre
  fait échouer la suite tant qu'il n'en est pas retiré, et un programme
  absent de LEGACY doit être propre.

  Usage : node dev/wod_loads_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

// Programmes écrits avant la règle, à corriger un jour sur demande.
const LEGACY = [
  "shoulders3d",
  "shoulders3d_v2",
  "hypertrophy_base",
  "force_performance",
  "hypertrophie_fesse",
  "general_strength_3d",
  "general_hypertrophy_2d",
  "general_hypertrophy_3d",
  "client_strength_2d",
  "client_strength_4d",
  "client_recomposition_2d",
  "client_recomposition_3d",
  "client_recomposition_4d",
  "client_hybrid_performance_3d",
  "client_hybrid_performance_4d",
  "client_hybrid_performance_5d",
  "client_haltero_crossfit_3d",
  "client_haltero_crossfit_4d",
  "client_haltero_crossfit_5d",
  "client_rx_crossfit_4d",
  "client_rx_crossfit_5d",
  "client_metcon_prep_2d",
  "client_metcon_prep_3d",
  "client_metcon_prep_4d",
  "retour_au_travail",
  "shoulders3d_press225_phase2",
  "posture",
  "phase2_fable5",
];

// Mouvement chargé par nature : sans charge écrite, l'athlète devine.
const LOADED = /\b(?:wall ?balls?|kb swings?|kettlebell|goblet squats?|thrusters?|db [a-z]|dumbbell|haltères?|snatch(?:es)?|power cleans?|hang cleans?|clean and jerk|deadlifts?|sandbag|farmer carry|devil press|man ?makers?|box step-ups?|box jumps?|front squats?|overhead squats?|push press|front rack lunges?)\b/i;
const HAS_LOAD = /\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:lb|lbs|kg|po|pouces)(?![A-Za-zÀ-ÿ])|poids du corps|barre vide|PVC|à vide/i;
// Kettlebells : toujours en kg (décision du 2026-10-16), comme le rack de
// data/equipment.js (RACINE_EQUIPMENT.kettlebells.unit). « 53/35 lb » → « 24/16 kg ».
const KB = /\b(?:kb|kettlebells?)\b/i;
const KB_IN_LB = /\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:lb|lbs)(?![A-Za-zÀ-ÿ])/i;
const EMOM_ORDER = /impaires|paires|min(?:ute)?s?\s*\d|station|altern|même minute|dans la minute|chaque minute|\d\)/i;
const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

function wodIssues(text){
  const t = String(text || '');
  const issues = [];
  const segs = t.split(/[,;+]|\bpuis\b/i);
  segs.forEach(seg => {
    if(LOADED.test(seg) && !HAS_LOAD.test(seg)) issues.push('charge manquante : « ' + seg.trim().slice(0, 50) + ' »');
    if(KB.test(seg) && KB_IN_LB.test(seg)) issues.push('kettlebell en lb (toujours en kg) : « ' + seg.trim().slice(0, 50) + ' »');
  });
  if(/\bEMOM\b/i.test(t) && segs.length > 1 && !EMOM_ORDER.test(t)) issues.push('EMOM sans ordre des minutes');
  const st = t.match(/EMOM\s*(\d+)[^:]*?(\d+)\s*stations/i);
  if(st && Number(st[1]) % Number(st[2])) issues.push('EMOM ' + st[1] + ' pour ' + st[2] + ' stations');
  return issues;
}

// Charge tous les programmes comme index.html, dans un seul bac à sable.
const ctx = {console, Math, Date, JSON, String, Number, Array, Object, RegExp,
  charge: function(){ return '—'; }, chargeFor: function(){ return '—'; }};
ctx.window = ctx;
vm.createContext(ctx);
const files = (read('index.html').match(/src="programs\/[^"?]+/g) || []).map(s => s.slice(5));
files.forEach(f => { try{ vm.runInContext(read(f), ctx, {filename: f}); }catch(e){} });
const catalog = read('programs/index.js');
function weeksFor(id){
  const m = catalog.match(new RegExp('id:\\s*"' + id + '"[^}]*?durationWeeks:\\s*(\\d+)'));
  return m ? Number(m[1]) : 8;
}

const progs = ctx.COACH_BERTIN_PROGRAMS || {};
const report = {};
Object.keys(progs).forEach(id => {
  const P = progs[id];
  if(!P || typeof P.getBlocks !== 'function') return;
  const found = new Map();
  for(let w = 1; w <= weeksFor(id); w++) DAYS.forEach(d => {
    let blocks; try{ blocks = P.getBlocks(d, w); }catch(e){ return; }
    (blocks || []).forEach(b => {
      if(!b || b.kind !== 'wod') return;
      const issues = wodIssues(b.text);
      if(issues.length && !found.has(b.text)) found.set(b.text, 'S' + w + ' ' + d + ' — ' + issues.join(' ; '));
    });
  });
  report[id] = [...found.values()];
});

const failures = [];
const dirty = Object.keys(report).filter(id => report[id].length);
if(process.argv.includes('--list')){ console.log(JSON.stringify(dirty)); process.exit(0); }
dirty.filter(id => LEGACY.indexOf(id) < 0).forEach(id => {
  failures.push(id + ' : metcon à préciser —\n      ' + report[id].slice(0, 6).join('\n      '));
});
LEGACY.filter(id => report[id] && !report[id].length).forEach(id => {
  failures.push(id + ' est maintenant propre : le retirer de LEGACY (la liste ne fait que rétrécir).');
});
// La règle elle-même, sur des cas connus.
const must = [
  ['EMOM 8 : 12 cal Row, 12 Goblet Squats.', 2],
  ['AMRAP 7 : 12 cal Row, 10 KB Swings.', 1],
  ['EMOM 8 en alternance, un seul mouvement par minute : minutes impaires 12 cal Row ; minutes paires 12 Goblet Squats 53 lb.', 0],
  ['AMRAP 18 : 15 wall balls 20/14 lb + 12 box step-ups 24/20 po + 10 burpees.', 0],
  ['AMRAP 7 : 12 cal Row, 10 KB Swings 53 lb.', 1],
  ['400 m Run + 21 KB Swings 24/16 kg + 12 Pull-Ups.', 0]
];
must.forEach(([t, n]) => { const got = wodIssues(t).length; if(got !== n) failures.push('Règle : « ' + t + ' » → ' + got + ' problème(s), attendu ' + n); });
if(Object.keys(report).length < 20) failures.push('Moins de 20 programmes chargés (' + Object.keys(report).length + ') : le chargement a cassé.');

if(failures.length){
  console.error('✗ wod_loads_checks — ' + failures.length + ' échec(s) :\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('✓ wod_loads_checks — ' + Object.keys(report).length + ' programmes, ' + (Object.keys(report).length - LEGACY.length) + ' propres, ' + LEGACY.length + ' antérieurs à corriger.');

#!/usr/bin/env node
/*
  Racine — garde-fous : comparaison multi-mouvements de l'onglet Progression.
  Avant : deux menus déroulants (Mouvement A / B), 2 courbes max. Après : chaque
  mouvement disponible est un bouton toggle ; on en superpose autant qu'on veut,
  chaque courbe a sa couleur (normalisée en % depuis le premier point).

  Usage : node dev/pc_progress_compare_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const pc = read('scripts/view_pc.js');
const css = read('styles.css');

// ── Statique : plus de select A/B, place aux toggles ───────────────────────
assert(!/id="pcProgressCompareA"|id="pcProgressCompareB"/.test(pc), 'plus de menus déroulants Mouvement A / B');
assert(!/pcProgressCompareA|pcProgressCompareB/.test(pc), 'plus de variables A/B, une seule sélection multiple');
assert(/pcProgressCompareSet/.test(pc), 'état de sélection multiple (pcProgressCompareSet)');
assert(/data-pc-compare-toggle/.test(pc), 'boutons toggle par mouvement');
assert(/function pcProgCompareColor/.test(pc), 'palette de couleurs par mouvement');
assert(/\.pcx-compare-toggle/.test(css) && /\.pcx-compare-toggle\.active/.test(css), 'styles des toggles présents');

// ── Runtime : sélection multiple, une courbe par mouvement actif ───────────
try{
  const ctx = { console: console };
  ctx.window = ctx; ctx.self = ctx;
  ctx.escapeHtml = s => String(s==null?'':s);
  vm.createContext(ctx);
  vm.runInContext(pc, ctx, { filename:'view_pc.js' });
  function mk(id,label,loads){
    const rows = loads.map((l,i)=>({ load:l, date:'2026-0'+((i%9)+1)+'-01', _key:id+i }));
    return { id:id, label:label, metric:'load', rows:rows, stats:{ deltaMetric: loads[loads.length-1]-loads[0] } };
  }
  const series = [ mk('bench','Bench',[135,140,145,150]), mk('squat','Squat',[225,235,240]), mk('press','Press',[95,100,98,102]) ];

  ctx.pcProgressCompareSet = null; // pré-remplissage par défaut
  let out = ctx.pcRenderProgressCompare(series);
  assert((out.match(/data-pc-compare-toggle=/g)||[]).length === 3, 'un bouton toggle par mouvement disponible (3)');
  assert((out.match(/pcx-compare-toggle active/g)||[]).length === 2, 'deux mouvements actifs par défaut');
  assert((out.match(/<polyline/g)||[]).length === 2, 'deux courbes tracées par défaut');

  ctx.pcProgressCompareSet = ['bench','squat','press'];
  out = ctx.pcRenderProgressCompare(series);
  assert((out.match(/<polyline/g)||[]).length === 3, 'trois mouvements actifs → trois courbes (plus de limite à 2)');
  assert(/stroke:#/.test(out), 'couleur inline par courbe');
  // L'état + variation vit sur le bouton actif (pas de légende doublon en dessous).
  assert(!/pcx-progress-legend cmp/.test(out), 'plus de légende doublon : l\'état vit sur le toggle');
  assert((out.match(/pcx-compare-toggle-delta/g)||[]).length === 3, 'chaque toggle actif porte sa variation');

  ctx.pcProgressCompareSet = [];
  out = ctx.pcRenderProgressCompare(series);
  assert(/Sélectionne au moins un mouvement/.test(out) && !/<polyline/.test(out), 'aucun actif → invite, pas de courbe');
}catch(e){
  assert(false, 'runtime : comparaison sans exception (' + e.message + ')');
}

process.on('exit', function(){
  if(failures){ console.error('\n❌ pc_progress_compare_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ pc_progress_compare_checks OK');
});

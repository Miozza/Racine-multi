#!/usr/bin/env node
/*
  Racine — garde-fou : sauvegarde de séance ne plante pas quand le programme
  actif n'a pas de tableaux de périodisation (targetReps / sets / mult), ou
  quand le cycle actif est indisponible (focus() renvoie {}).

  Reproduit le crash iPhone SE :
    « undefined is not an object (evaluating 'focus().targetReps[weekIdx()]') »
  déclenché par checkDeloadAlert() à chaque « Sauvegarder la séance ».

  Usage : node dev/deload_guard_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const app = read('app.js');
const rpe = read('scripts/charge/rpe.js');

// ── Statique : plus d'accès nu focus().targetReps[...] / .sets[...] / .mult[...]
assert(!/focus\(\)\.targetReps\[/.test(app + rpe), 'aucun accès nu focus().targetReps[...]');
assert(!/focus\(\)\.sets\[/.test(app), 'aucun accès nu focus().sets[...]');
assert(!/focus\(\)\.mult\[/.test(app), 'aucun accès nu focus().mult[...]');

// ── Runtime : reproduire une sauvegarde avec un programme sans périodisation ─
function ctxWith(goal, focusConfigs){
  const ctx = { console: console };
  ctx.window = ctx; ctx.self = ctx;
  ctx.state = { cycle:{goal:goal}, week:2, rpeHistory:{ bench__R8:[9,9] } };
  ctx.focusConfigs = focusConfigs;
  ctx.defaultProgramId = function(){ return '__none__'; };
  ctx.totalWeeks = function(){ return 6; };
  ctx.movements = { bench:{profile:true}, squat:{profile:true} };
  ctx.save = function(){}; // repRange est défini par rpe.js (strength/hypertrophy/endurance)
  vm.createContext(ctx);
  vm.runInContext('function focus(){return focusConfigs[state.cycle.goal]||focusConfigs[defaultProgramId()]||{};}', ctx);
  vm.runInContext('function weekIdx(){var tw=Math.max(1,totalWeeks());return Math.max(0,Math.min(tw-1,state.week-1));}', ctx);
  vm.runInContext(rpe, ctx, { filename:'rpe.js' });
  return ctx;
}

// 1) Cycle indisponible : focus() renvoie {} (aucune config correspondante).
try{
  const ctx = ctxWith('programme_gate_indispo', {});
  ctx.checkDeloadAlert();
  assert(true, 'save : cycle indisponible (focus()==={}) ne plante pas');
}catch(e){ assert(false, 'save : cycle indisponible plante encore (' + e.message + ')'); }

// 2) Programme à exercices structurés : config sans targetReps.
try{
  const ctx = ctxWith('arnold', { arnold:{ label:'Arnold Split' } });
  ctx.checkDeloadAlert();
  assert(true, 'save : programme sans targetReps ne plante pas');
}catch(e){ assert(false, 'save : programme sans targetReps plante encore (' + e.message + ')'); }

// 3) Programme périodisé classique : rng dérivé de targetReps, deload détecté.
try{
  const ctx = ctxWith('force', { force:{ label:'Force', targetReps:[5,5,3,3,2,1] } });
  // Semaine 2 → weekIdx 1 → targetReps[1]=5 → repRange(5)="strength". Deux
  // mouvements principaux à RPE 9/9 sur cette plage → alerte deload (>=2).
  ctx.state.rpeHistory = { bench__strength:[9,9], squat__strength:[9,9] };
  ctx.checkDeloadAlert();
  assert(ctx.state.deloadAlert === true, 'save : programme périodisé → rng issu de targetReps, deload détecté');
}catch(e){ assert(false, 'save : programme périodisé plante (' + e.message + ')'); }

process.on('exit', function(){
  if(failures){ console.error('\n❌ deload_guard_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ deload_guard_checks OK');
});

#!/usr/bin/env node
/*
  Racine - golden master de caracterisation pour guardedSuggestedLoadDecision().
  Capture le comportement du moteur de suggestion sur une matrice de scenarios
  representatifs, avant/pendant le refactor structurel (voir
  docs/superpowers/plans/2026-07-26-charge-suggestion-refactor.md).

  Usage :
    node dev/charge_suggestion_golden_master.js --record   (avant le refactor, une seule fois)
    node dev/charge_suggestion_golden_master.js            (verifie contre la fixture enregistree)
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(__dirname, 'fixtures', 'charge_suggestion_golden_master.json');
function rel(p){ return path.join(root, p); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }

const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN,
  setTimeout: function(fn){ if(typeof fn==='function') fn(); },
  clearTimeout: function(){},
  document: { getElementById: function(){ return null; } },
  navigator: {},
  localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {
    'Back Squat':'185 lb', 'Strict Press':'95 lb', 'Barbell Row':'115 lb',
    'Lateral Raise DB':'20 lb', 'Hip Thrust':'225 lb'
  },
  CHARGE_ORDER: [],
  movements: {
    backSquat:{name:'Back Squat', profile:'backSquat'},
    strictPress:{name:'Strict Press', profile:'strictPress'}
  },
  state: { week:3, day:'mardi', rpeHistory:{}, athleteState:{ movements:{} }, profile:{onboarded:true, scaleRatios:{_overall:1}} },
  save: function(){},
  focus: function(){ return {label:'test cycle', targetReps:{0:8,1:8,2:8,3:8,4:8,5:8}}; },
  buildWeekInfo: function(){ return {6:{label:'S6', goal:'Deload facile'}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; },
  parseTargetReps: function(format, fallback){
    const nums = String(format || '').match(/\d+/g) || [];
    if(!nums.length)return {min:fallback||8, max:fallback||8};
    const last = Number(nums[nums.length-1]) || fallback || 8;
    return {min:last, max:last};
  }
};
ctx.window = ctx;
ctx.globalThis = ctx;

const loadOrder = [
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js',
  'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js',
  'scripts/charge/suggestion.js'
];
loadOrder.forEach(file => vm.runInNewContext(read(file), ctx, { filename: file }));

function hist(rows){
  return rows.map(r => Object.assign(
    {date:'2026-01-0'+(r.d||1), reps:r.reps, rpe:r.rpe, load:r.load, status:r.status},
    r.context ? {context:r.context} : {}
  ));
}
function setMovement(label, history, ranges){
  ctx.state.athleteState.movements[label] = { history: hist(history), ranges: ranges||{} };
}

const scenarios = [
  { name:'no_history_no_numeric', setup(){ ctx.state.athleteState.movements={}; }, call:['Air Squat','Poids du corps',10,{}] },
  { name:'no_history_numeric_main', setup(){ ctx.state.athleteState.movements={}; }, call:['Back Squat','185 lb',8,{}] },
  { name:'progression_ready_low_rpe', setup(){ setMovement('Back Squat',[{reps:8,rpe:7,load:185,d:1},{reps:8,rpe:6,load:185,d:2}]); }, call:['Back Squat','185 lb',8,{}] },
  { name:'blocked_high_rpe', setup(){ setMovement('Back Squat',[{reps:8,rpe:9.5,load:185,d:1}]); }, call:['Back Squat','195 lb',8,{}] },
  { name:'brake_rpe_8_5_similar_target', setup(){ setMovement('Back Squat',[{reps:8,rpe:8.5,load:185,d:1}]); }, call:['Back Squat','195 lb',8,{}] },
  { name:'lift_from_history_barbell_row', setup(){ setMovement('Barbell Row',[{reps:8,rpe:7,load:135,d:1},{reps:8,rpe:7,load:135,d:2}]); }, call:['Barbell Row','110 lb',8,{}] },
  { name:'lift_from_history_generic_gap20', setup(){ setMovement('Deadlift',[{reps:8,rpe:7,load:225,d:1},{reps:8,rpe:7,load:225,d:2}]); }, call:['Deadlift','195 lb',8,{}] },
  { name:'isolation_small_step', setup(){ setMovement('Lateral Raise DB',[{reps:12,rpe:6,load:20,d:1},{reps:12,rpe:6,load:20,d:2}]); }, call:['Lateral Raise DB','20 lb',12,{}] },
  { name:'technical_no_progression', setup(){ setMovement('Power Clean Technique',[{reps:3,rpe:6,load:115,d:1}]); }, call:['Power Clean Technique','115 lb',3,{}] },
  { name:'deload_week', setup(){ ctx.state.week=6; setMovement('Back Squat',[{reps:8,rpe:7,load:225,d:1},{reps:8,rpe:7,load:225,d:2}]); }, call:['Back Squat','225 lb',8,{}], teardown(){ ctx.state.week=3; } },
  { name:'history_signal_stalled', setup(){ setMovement('Bench Press',[{reps:8,rpe:7,load:135,d:1},{reps:8,rpe:7,load:135,d:2},{reps:8,rpe:7,load:135,d:3}]); }, call:['Bench Press','145 lb',8,{}] },
  { name:'rep_gap_projection', setup(){ setMovement('Back Squat',[{reps:1,rpe:8,load:225,d:1}]); }, call:['Back Squat','225 lb',8,{}] },
  { name:'athlete_state_cap_watch', setup(){ setMovement('Front Squat',[{reps:8,rpe:7,load:135,d:1}],{hypertrophy:{status:'watch',currentLoad:135}}); }, call:['Front Squat','185 lb',8,{}] },
  { name:'movement_progression_cap_overhead_rope', setup(){ setMovement('Overhead Rope Extension',[{reps:12,rpe:7,load:50,d:1},{reps:12,rpe:7,load:50,d:2}]); }, call:['Overhead Rope Extension','65 lb',12,{}] },
  { name:'floor_validation', setup(){ setMovement('Back Squat',[{reps:8,rpe:9,load:225,d:1},{reps:8,rpe:9,load:225,d:2}]); }, call:['Back Squat','185 lb',8,{}] }
];

const results = {};
scenarios.forEach(s => {
  s.setup();
  results[s.name] = ctx.guardedSuggestedLoadDecision.apply(null, s.call);
  if(s.teardown) s.teardown();
});

const mode = process.argv.includes('--record') ? 'record' : 'check';
if(mode==='record'){
  fs.mkdirSync(path.dirname(fixturePath), {recursive:true});
  fs.writeFileSync(fixturePath, JSON.stringify(results, null, 2));
  console.log('Golden master enregistre : ' + fixturePath);
  process.exit(0);
}

if(!fs.existsSync(fixturePath)){
  console.error('Aucune fixture golden master. Lancer d\'abord --record avant le refactor.');
  process.exit(1);
}
const expected = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
let failed = 0;
Object.keys(expected).forEach(name => {
  const a = JSON.stringify(expected[name]);
  const b = JSON.stringify(results[name]);
  if(a !== b){
    failed++;
    console.error('DIVERGENCE sur "'+name+'":');
    console.error('  attendu : '+a);
    console.error('  obtenu  : '+b);
  }
});
if(failed){
  console.error(failed+' scenario(s) divergent(s). Refactor non transparent, a corriger avant de continuer.');
  process.exit(1);
}
console.log('Golden master : '+Object.keys(expected).length+' scenarios identiques. Refactor transparent.');

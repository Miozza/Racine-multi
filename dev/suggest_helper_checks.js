#!/usr/bin/env node
/*
  Racine — preuve d'équivalence pour CoachCharge.suggestForExercise.

  But : garantir que l'entrée unique d'assemblage (exercice + bloc → charge)
  produit EXACTEMENT la même charge que l'ancien calcul inline reconstruit à la
  main dans chaque vue. Si un jour le helper diverge, ce test casse.

  + garde-fou : les vues ne doivent plus appeler CoachCharge.suggestLoad(...)
  directement (elles passent par suggestForExercise).

  Usage : node dev/suggest_helper_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function rel(p){ return path.join(root, p); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }
function assert(cond, msg){ if(!cond) errors.push(msg); else notes.push(msg); }

// ── Contexte isolé (même setup que dev/charge_engine_checks.js) ──────────────
const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN,
  setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
  clearTimeout: function(){},
  document: { getElementById: function(){ return null; } },
  navigator: {},
  localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {
    'Power Clean':'135 lb',
    'Strict Press':'115 lb',
    'Lateral Raise DB':'20 lb',
    'Lateral Raise câble':'30 lb',
    'Bench Press':'185 lb'
  },
  CHARGE_ORDER: [],
  movements: {
    powerClean:{name:'Power Clean', profile:'powerClean'},
    strictPress:{name:'Strict Press', profile:'strictPress'}
  },
  state: {
    week: 3,
    day: 'vendredi',
    rpeHistory: {},
    athleteState: { movements: {} }
  },
  save: function(){},
  focus: function(){ return {label:'test cycle', targetReps:{0:8,1:8,2:8,3:8,4:8,5:8}}; },
  buildWeekInfo: function(){ return {6:{label:'S6', goal:'Deload facile'}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; },
  parseTargetReps: function(format, fallback){
    const nums = String(format || '').match(/\d+/g) || [];
    if(!nums.length)return {min:fallback || 8, max:fallback || 8};
    const last = Number(nums[nums.length - 1]) || fallback || 8;
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
loadOrder.forEach(file => {
  try { vm.runInNewContext(read(file), ctx, { filename: file }); }
  catch (err) { errors.push('Chargement impossible de ' + file + ' : ' + err.message); }
});

// ── 1. Le helper existe et est exposé ───────────────────────────────────────
assert(typeof ctx.coachSuggestForExercise === 'function', 'coachSuggestForExercise doit être défini par suggestion.js.');
assert(typeof ctx.coachSafeSuggestedLoad === 'function', 'coachSafeSuggestedLoad doit rester disponible (moteur).');

// ── 2. Équivalence stricte helper vs inline canonique ───────────────────────
// Inline canonique = exactement ce que les vues faisaient avant migration.
function inlineCanonical(e, b, opts){
  opts = opts || {};
  const parsed = ctx.parseTargetReps(e.format, 10);
  const target = parsed.min || parsed.max || 10;
  const context = {
    kind: b.kind,
    blockTitle: b.title,
    note: e.note,
    text: b.text,
    format: e.format,
    day:  (opts.day  !== undefined) ? opts.day  : ctx.state.day,
    week: (opts.week !== undefined) ? opts.week : ctx.state.week
  };
  return ctx.coachSafeSuggestedLoad(e.name, e.load, target, context);
}

const exercises = [
  {name:'Power Clean',      load:'135 lb', note:'vitesse',      format:'EMOM 8 : 2 Power Clean'},
  {name:'Strict Press',     load:'115 lb', note:'',             format:'5×3'},
  {name:'Lateral Raise DB', load:'20 lb',  note:'contrôlé',     format:'4×15-20'},
  {name:'Bench Press',      load:'185 lb', note:'',             format:'3×5'},
  {name:'Mouvement Inconnu',load:'—',      note:'test fallback',format:''}
];
const blocks = [
  {kind:'main',      title:'A. Effort maximal', text:''},
  {kind:'accessory', title:'B. Volume',         text:'note bloc'},
  {kind:'wod',       title:'C. Metcon',         text:'AMRAP 10'},
  {kind:'mobility',  title:'D. Reset',          text:''}
];
const overrides = [ undefined, {day:'lundi', week:1}, {day:'mardi', week:7}, {week:6}, {day:'jeudi'} ];

let cases = 0, mismatches = 0;
[1,3,6,7,8].forEach(function(week){
  ['lundi','mardi','jeudi','vendredi'].forEach(function(day){
    ctx.state.week = week;
    ctx.state.day = day;
    exercises.forEach(function(e){
      blocks.forEach(function(b){
        overrides.forEach(function(opts){
          const oldVal = inlineCanonical(e, b, opts);
          const newVal = ctx.coachSuggestForExercise(e, b, opts);
          cases++;
          if(oldVal !== newVal){
            mismatches++;
            if(mismatches <= 5){
              errors.push('Divergence helper≠inline : '+e.name+' | '+b.kind+' | week='+week+' day='+day+' opts='+JSON.stringify(opts)+' → inline="'+oldVal+'" helper="'+newVal+'"');
            }
          }
        });
      });
    });
  });
});
assert(mismatches === 0, 'suggestForExercise doit égaler l\'inline canonique sur les '+cases+' cas (divergences: '+mismatches+').');
notes.push('Équivalence vérifiée sur '+cases+' combinaisons exercice×bloc×semaine×jour×override.');

// ── 3. Garde-fou : les vues ne reconstruisent plus le contexte à la main ────
// Elles doivent passer par suggestForExercise, pas appeler suggestLoad direct.
const renderFiles = [
  'scripts/view_pc.js',
  'scripts/view_wodplus.js',
  'scripts/session/view.js',
  'scripts/session/results.js',
  'scripts/charge_diagnostic_ui.js',
  'app.js'
];
renderFiles.forEach(function(f){
  const src = read(f);
  assert(!/CoachCharge\.suggestLoad\s*\(/.test(src), f+' ne doit plus appeler CoachCharge.suggestLoad( directement — utiliser suggestForExercise.');
});

// ── Rapport ─────────────────────────────────────────────────────────────────
if(errors.length){
  console.error('ÉCHEC suggest_helper_checks.js');
  errors.forEach(function(e){ console.error(' - ' + e); });
  process.exit(1);
}
console.log('OK suggest_helper_checks.js — ' + notes.length + ' assertions.');
notes.forEach(function(n){ console.log(' - ' + n); });

#!/usr/bin/env node
/*
  Racine - garde-fou : un bloc LEGER n'est pas une semaine de DELOAD (V4.6.10).

  LE DEFAUT CORRIGE. coachIsDeloadWeekOrContext() retournait true des que le
  contexte portait `isLight`. Un mouvement etiquete leger etait donc traite
  comme une semaine de deload et sa charge reduite a 80 % de la derniere
  reference — a chaque seance, indefiniment.

  Deux notions confondues :
    · un bloc LEGER ne doit pas AUTO-PROGRESSER — garanti par
      coachIsLimitedProgressionContext(), qui lit toujours isLight ;
    · une semaine de DELOAD reduit activement la charge. Rien dans « leger »
      ne dit « enleve 20 % a ce que l'athlete souleve deja ».

  Mesure au moment du correctif, sur le catalogue complet : 2 189 exercices
  mis en deload, dont 122 par un vrai mot et 2 067 par le seul isLight. Le mot
  declencheur n'avait souvent aucune valeur de consigne de charge — « coudes
  LEGEREMENT flechis » suffisait.

  Cas reel : Cuban Press de phase2_fable5, bloc « socle fixe », note « Leger
  et lent. Rotation externe complete a chaque rep. » L'athlete faisait
  15 lb x 10 @ RPE 7,5, le programme ecrivait 15-25 lb, le moteur proposait
  10 lb pendant huit semaines.

  CE QUE CE SCRIPT EPINGLE : la separation des deux notions. Un bloc leger ne
  progresse pas ET n'est pas reduit. Un vrai deload reste detecte.

  Usage :
    node dev/deload_detection_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

let checks = 0, failed = 0;
function assert(cond, msg){
  checks++;
  if(!cond){ failed++; console.error(' ✗ ' + msg); }
}

function makeContext(weekInfo){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp, WeakMap,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
    clearTimeout: function(){},
    document: { getElementById: function(){ return null; } },
    navigator: {},
    localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
    APP_VERSION: 'TEST', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
    state: { week:1, day:'jeudi', rpeHistory:{}, athleteState:{movements:{}},
             profile:{onboarded:true, scaleRatios:{_overall:1}} },
    save: function(){}, focus: function(){ return {label:'t', targetReps:{}}; },
    buildWeekInfo: function(){ return weekInfo || {}; },
    weekIdx: function(){ return 0; },
    collectSessionExercises: function(){ return []; },
    parseTargetReps: function(f, fb){ return {min: fb||8, max: fb||8}; }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ['scripts/app_helpers.js','scripts/charge/equipement.js','scripts/charge/movement_tuning.js',
   'scripts/charge/tuning_override.js','scripts/charge/utilitaires.js','scripts/charge/mouvements.js',
   'scripts/charge/rpe.js','scripts/charge/historique.js','scripts/charge/scaling.js',
   'scripts/charge/brain_stats.js','scripts/charge/brain_memory.js','scripts/charge/brain_journal.js',
   'scripts/charge/ceiling.js','scripts/charge/suggestion.js']
    .forEach(f => vm.runInNewContext(read(f), ctx, { filename: f }));
  return ctx;
}

const ctx = makeContext();
const CUBAN_NOTE = "Léger et lent. Rotation externe complète à chaque rep. Ce bloc ne tourne jamais : c'est le socle.";
const CUBAN_OPTS = { kind:'', blockTitle:"C. Santé d'épaules — socle fixe", note:CUBAN_NOTE,
                     format:'3x10', load:'15-25 lb total', day:'jeudi', week:1 };

// ─── 1. Le contexte est bien « leger », et le reste ────────────────────────
const light = ctx.coachBuildMovementContext('Cuban Press', CUBAN_OPTS);
assert(light.isLight === true, 'La note « Léger et lent » produit toujours un contexte léger.');
assert(ctx.coachIsLimitedProgressionContext(light) === true,
  'Un bloc léger reste un contexte à progression limitée : il n\'auto-progresse pas.');

// ─── 2. ... mais ce n'est PAS un deload ────────────────────────────────────
assert(ctx.coachIsDeloadWeekOrContext(light) === false,
  'Un bloc léger n\'est PAS une semaine de deload — c\'est tout le correctif.');

// ─── 3. Le cas reel : la charge n'est plus amputee ─────────────────────────
// Trois séances identiques à 15 lb, comme dans la trace de phase2_fable5.
ctx.state.athleteState.movements = { 'Cuban Press': { ranges:{}, history:[
  {date:'2026-08-13', load:15, reps:10, rpe:8,   status:'context_logged', context:light},
  {date:'2026-08-20', load:15, reps:10, rpe:7.5, status:'context_logged', context:light},
  {date:'2026-08-27', load:15, reps:10, rpe:7.5, status:'context_logged', context:light}
]}};
const d = ctx.guardedSuggestedLoadDecision('Cuban Press', '15-25 lb total', 10, CUBAN_OPTS);
assert(d.loadNum >= 15,
  'Le socle n\'est plus proposé SOUS ce que l\'athlète soulève (' + d.loadNum + ' lb pour 15 lb faits).');
assert(!/deload/i.test(String(d.reason || '')),
  'Et l\'explication ne parle plus de deload.');
// Pas de progression non plus : un socle reste un socle.
assert(d.loadNum <= 25,
  'Le socle ne part pas non plus vers le haut : il reste dans la fourchette écrite.');

// ─── 4. Un VRAI deload reste detecte, par chacune de ses voies ─────────────
const byWord = ctx.coachBuildMovementContext('Back Squat',
  { kind:'main', blockTitle:'A. Back Squat', note:'Semaine de deload, charge réduite volontairement.',
    format:'3x5', day:'lundi', week:6 });
assert(ctx.coachIsDeloadWeekOrContext(byWord) === true,
  'Un deload déclaré par le mot « deload » reste détecté.');

const byRecovery = ctx.coachBuildMovementContext('Back Squat',
  { kind:'main', blockTitle:'A. Back Squat', note:'Récupération active.', format:'3x5', day:'lundi', week:6 });
assert(byRecovery.isRecovery === true && ctx.coachIsDeloadWeekOrContext(byRecovery) === true,
  'Un contexte de récupération reste un deload.');

const weekCtx = makeContext({ 6: { label:'S6', goal:'Deload — semaine facile' } });
const byWeek = weekCtx.coachBuildMovementContext('Back Squat',
  { kind:'main', blockTitle:'A. Back Squat', note:'', format:'3x5', day:'lundi', week:6 });
assert(weekCtx.coachIsDeloadWeekOrContext(byWeek) === true,
  'Un deload déclaré par le libellé de semaine reste détecté.');

// ─── 5. Le faux positif le plus courant du catalogue ───────────────────────
// « coudes LÉGÈREMENT fléchis » est une consigne de position. Elle produit
// encore un contexte léger (defaut de fond, non traite ici), mais elle ne doit
// plus coûter 20 % de charge.
const cue = ctx.coachBuildMovementContext('DB Fly',
  { kind:'accessory', blockTitle:'C. DB Fly',
    note:'Grand étirement pecs, coudes légèrement fléchis, aucun rebond.', format:'3x12', day:'lundi', week:1 });
assert(ctx.coachIsDeloadWeekOrContext(cue) === false,
  'Une consigne de position (« légèrement fléchis ») ne déclenche plus de réduction de charge.');

// ─── 6. La ligne elle-meme, verifiee sur le source ─────────────────────────
const src = read('scripts/charge/suggestion.js');
assert(/if\(context&&context\.isRecovery\)return true;/.test(src),
  'La détection de deload ne lit plus isLight.');
assert(!/context\.isRecovery\s*\|\|\s*context\.isLight/.test(src),
  'isLight n\'est pas revenu dans la détection de deload.');
assert(/isLight/.test(read('scripts/charge/mouvements.js')),
  'isLight existe toujours : il gouverne la progression limitée, pas le deload.');

if(failed){
  console.error('\nÉCHEC deload_detection_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK deload_detection_checks.js — ' + checks + ' controles.');

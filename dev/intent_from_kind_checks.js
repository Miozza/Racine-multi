#!/usr/bin/env node
/*
  Racine - garde-fou : le `kind` d'un bloc produit son intention (V4.6.9).

  LE DEFAUT CORRIGE. Deux definitions de « principal » cohabitaient sans se
  parler. coachIsMainLoadContext() matche /main/ : un bloc kind:"main" etait
  donc traite comme principal pour le deload et le plafond. Mais
  coachExtractMovementIntent() ne lisait que des MOTS (lourd, force,
  principal, hypertrophie...) : le meme bloc ne declarait aucune intention et
  retombait sur le repli generique. Mesure sur le catalogue reel :
  1 643 exercices de bloc kind:"main" et 1 720 de bloc kind:"hypertrophy"
  tombaient sur `fallback` au lieu de leur propre reglage.

  CE QUE CE SCRIPT PROTEGE EN PRIORITE — L'EMPLACEMENT DE LA REGLE.

  Elle doit vivre dans coachExtractMovementIntent(), et nulle part ailleurs.
  Raison : coachRederiveStoredContext() (historique.js) relit les lignes DEJA
  LOGGEES avec ce meme detecteur, sans jamais les reecrire. Les deux cotes de
  la comparaison de contexte bougent donc ensemble.

  Placee dans coachBuildMovementContext(), elle changerait la cle de contexte
  du jour SANS changer celle des lignes stockees. Les mouvements a comparaison
  stricte (COACH_MOVEMENT_TUNING.contextPreferenceMovementPatterns : overhead
  rope extension, face pull, power clean) perdraient alors tout leur
  historique — 28 blocs Power Clean principaux dans le catalogue actuel.
  C'est exactement le bug « vitesse » de V4.6.1, ou 18 lignes disparaissaient
  du calcul dont la seance la plus recente.

  Le test « la ligne loggee avant le correctif compte toujours » est donc le
  coeur de ce fichier : s'il tombe, la regle a ete deplacee.

  Usage :
    node dev/intent_from_kind_checks.js
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

const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp, WeakMap,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
  clearTimeout: function(){},
  document: { getElementById: function(){ return null; } },
  navigator: {},
  localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
  APP_VERSION: 'TEST', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
  state: { week:3, day:'mardi', rpeHistory:{}, athleteState:{movements:{}},
           profile:{onboarded:true, scaleRatios:{_overall:1}} },
  save: function(){}, focus: function(){ return {label:'t', targetReps:{}}; },
  buildWeekInfo: function(){ return {}; }, weekIdx: function(){ return 2; },
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

const SURPLUS = ctx.window.COACH_MOVEMENT_TUNING.repsSurplus;
function build(opts){ return ctx.coachBuildMovementContext('Bench Press', opts); }
function convergeOf(c){
  const hit = (c.intents || []).find(i => SURPLUS.byIntent[i]);
  return hit ? SURPLUS.byIntent[hit].converge : SURPLUS.fallback.converge;
}

// ─── 1. Le kind comble le silence ──────────────────────────────────────────
const main = build({kind:'main', blockTitle:'A. Bench Press'});
assert(main.intents.indexOf('strength') >= 0,
  'Un bloc kind:"main" declare l\'intention force.');
assert(convergeOf(main) === SURPLUS.byIntent.strength.converge,
  'Et recoit le reglage force, plus le repli generique.');

const hyp = build({kind:'hypertrophy', blockTitle:'B. Bench Press'});
assert(hyp.intents.indexOf('hypertrophy') >= 0,
  'Un bloc kind:"hypertrophy" declare l\'intention hypertrophie.');
assert(convergeOf(hyp) === SURPLUS.byIntent.hypertrophy.converge,
  'Et recoit le reglage hypertrophie (plus lent : le surplus vient du volume).');

// ─── 2. Un mot explicite l'emporte, dans les DEUX sens ─────────────────────
const mainButHyp = build({kind:'main', blockTitle:'A. Bench Press', note:'hypertrophie, pump'});
assert(convergeOf(mainButHyp) === SURPLUS.byIntent.hypertrophy.converge,
  'Un bloc "main" qui ecrit « hypertrophie » est traite comme tel : le mot gagne.');
const hypButForce = build({kind:'hypertrophy', blockTitle:'B. Bench Press force'});
assert(convergeOf(hypButForce) === SURPLUS.byIntent.strength.converge,
  'Un bloc "hypertrophy" qui ecrit « force » est traite comme tel : le mot gagne aussi.');

// ─── 3. Les autres kinds ne sont pas devines ───────────────────────────────
// « accessoire » n'est pas synonyme d'hypertrophie : c'est une decision de
// programmation, pas une deduction du moteur. Volontairement laisse au repli.
const acc = build({kind:'accessory', blockTitle:'C. Bench Press'});
assert(convergeOf(acc) === SURPLUS.fallback.converge,
  'Un bloc "accessory" garde le repli generique : le moteur ne devine pas au-dela.');
assert(build({kind:'warmup', blockTitle:'Echauffement'}).intents.indexOf('strength') < 0,
  'Aucun autre kind ne fabrique une intention de force.');

// ─── 4. Rien ne devient (ni ne cesse d'etre) un contexte limite ────────────
// Un contexte limite ne progresse pas tout seul : si la regle en creait ou en
// supprimait un, elle couperait ou ouvrirait la progression par effet de bord.
assert(ctx.coachIsLimitedProgressionContext(main) === false,
  'Un bloc principal ne devient pas un contexte a progression limitee.');
assert(ctx.coachIsLimitedProgressionContext(hyp) === false,
  'Un bloc hypertrophie non plus.');

// ─── 5. LE COEUR — l'historique deja logge continue de compter ─────────────
// Power Clean : comparaison stricte des contextes active
// (contextPreferenceMovementPatterns). Une ligne ecrite AVANT le correctif ne
// porte aucune intention. Si elle n'est pas relue, sa cle diverge et elle
// disparait du calcul.
const loggedBefore = {
  rawName:'Power Clean', label:'Power Clean', equipment:'barbell',
  intent:'', primaryIntent:'', intents:[],
  kind:'main', blockTitle:'A. Power Clean', note:'', text:'', format:'5x3',
  day:'vendredi', week:3,
  isWod:false, isTechnical:false, isLight:false, isProgression:false,
  isRecall:false, isStrength:false, isHypertrophy:false, isRecovery:false, isSpeed:false
};
const today = ctx.coachBuildMovementContext('Power Clean', {
  kind:'main', blockTitle:'A. Power Clean', note:'', text:'', format:'5x3',
  day:'vendredi', week:3});

assert(ctx.coachShouldPreferContextMatch('Power Clean', today) === true,
  'Power Clean compare bien les contextes a l\'identique (sinon ce test ne prouve rien).');
assert(ctx.coachContextMatches(loggedBefore, today, 'Power Clean') === false,
  'Sans relecture, la ligne d\'avant ne correspondrait PAS (le risque est reel).');

const rederived = ctx.coachRederiveStoredContext(loggedBefore);
assert(rederived.intents.indexOf('strength') >= 0,
  'La relecture applique la meme regle aux lignes stockees.');
assert(ctx.coachMovementContextKey(rederived) === ctx.coachMovementContextKey(today),
  'Les deux cles redeviennent identiques.');
assert(ctx.coachContextMatches(rederived, today, 'Power Clean') === true,
  'LA LIGNE DEJA LOGGEE COMPTE TOUJOURS — si ce test tombe, la regle a ete deplacee hors de coachExtractMovementIntent.');

// Et par le chemin que le moteur emprunte vraiment.
const viaEngine = ctx.coachHistoryContext({date:'2026-08-01', reps:3, rpe:7, load:185, context:loggedBefore});
assert(((viaEngine && viaEngine.intents) || []).indexOf('strength') >= 0,
  'Le moteur relit bien la ligne avant de comparer (coachHistoryContext).');

// ─── 6. La regle est au bon endroit, verifie sur le source ─────────────────
const mvSrc = read('scripts/charge/mouvements.js');
const hiSrc = read('scripts/charge/historique.js');
assert(/function coachExtractMovementIntent\(parts, declaredPct, kind\)/.test(mvSrc),
  'coachExtractMovementIntent recoit le kind explicitement.');
assert(/coachExtractMovementIntent\(parts, stored\.pctOf1RM, stored\.kind\)/.test(hiSrc),
  'La relecture des lignes stockees lui passe le kind : sans ca, les cles divergent.');

if(failed){
  console.error('\nÉCHEC intent_from_kind_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK intent_from_kind_checks.js — ' + checks + ' controles.');

#!/usr/bin/env node
/*
  Racine - garde-fou du panneau « Calibration du moteur » (lecture seule).
  scripts/profiles/admin_tuning.js

  Ce panneau ne regle plus rien : il montre ce que Brain a mesure. Deux regles
  de lecture le gouvernent, posees par le createur, et ce script existe pour
  qu'aucune version future ne les perde de vue :

    1. « S'il veut progresser, il doit pouvoir essayer. »
       Une prediction TESTEE qui rate ses reps (underPredictions) est un
       apprentissage : Brain a recu la donnee et corrige deja la suivante.
       Elle ne doit JAMAIS faire apparaitre un mouvement dans la liste.
       Sans ce test, la premiere « amelioration » venue rebranchera un
       compteur d'erreurs sur l'ecran, et le panneau redeviendra une machine
       a brider le moteur — exactement la boucle auto-bloquante decrite dans
       movement_tuning.js §brainGate.

    2. « On n'accuse pas le moteur pour un faible historique. »
       Rien ne s'affiche sous les seuils de RULES : ni un mouvement a deux
       seances, ni une fenetre glissante trop courte pour vouloir dire
       quelque chose.

  Verifie aussi que le seul blocage signale est bien celui ou le moteur
  n'apprend RIEN (humanOverrideDown : la proposition n'a jamais ete testee,
  cf. brain_memory.js:227-228), et que la precision globale se tait tant que
  l'echantillon est trop court.

  Usage :
    node dev/calibration_readout_checks.js
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

// Contexte minimal : le panneau ne doit dependre ni du DOM ni du moteur de
// charges pour ANALYSER. C'est precisement ce qui le rend verifiable ici —
// si un jour analyze() se met a exiger un document, ce script casse, et c'est
// le signal que la logique de lecture est repartie se cacher dans le rendu.
function makeContext(profiles){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN,
    setTimeout: function(fn){ if(typeof fn === 'function') fn(); },
    document: { getElementById: function(){ return null; }, querySelectorAll: function(){ return []; } },
    prompt: function(){ return null; },
    CoachProfiles: {
      isActiveAdmin: function(){ return true; },
      getActive: function(){ return { name: 'Test' }; },
      getActiveId: function(){ return 'p_test'; }
    },
    CoachBrainMemory: {
      exportSummary: function(){ return { profiles: profiles.slice() }; },
      precisionTrend: function(){ return []; }
    },
    CoachTuningOverride: {
      ceilings: function(){ return {}; },
      setCeiling: function(){ return true; },
      removeCeiling: function(){ return true; }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(read('scripts/profiles/admin_tuning.js'), ctx,
    { filename: 'scripts/profiles/admin_tuning.js' });
  return ctx;
}

function profile(over){
  return Object.assign({
    label: 'Back Squat', intent: 'strength', sessions: 20,
    testedPredictions: 0, successfulPredictions: 0,
    underPredictions: 0, overPredictions: 0,
    humanOverrideDown: 0, humanOverrideUp: 0,
    recentOutcomes: [], precisionTrend: [], lastDate: '2026-08-01'
  }, over || {});
}
function labels(findings){ return findings.map(f => f.label); }
function kinds(findings){ return findings.map(f => f.kind); }

// ─── Regle 1 : essayer et rater n'est pas une faute ────────────────────────
// Le pire cas honnete : beaucoup de predictions testees, beaucoup de reps
// manquees, mais la precision recente REMONTE. Le moteur apprend.
{
  const ctx = makeContext([profile({
    testedPredictions: 20, successfulPredictions: 10, underPredictions: 10,
    recentOutcomes: [1,1,1,1,1,1,1,0,1,1]   // 90 % recent contre 50 % a vie
  })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 0,
    'Une prediction testee qui rate ses reps ne fait apparaitre personne quand la courbe descend encore (' + labels(out.findings) + ').');
}
// Meme chose sans aucun refus : underPredictions seul ne declenche jamais rien,
// quel que soit son volume.
{
  const ctx = makeContext([profile({
    testedPredictions: 40, successfulPredictions: 20, underPredictions: 20,
    recentOutcomes: [1,1,1,1,1,1,1,1,1,1]
  })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 0, 'underPredictions n\'est jamais a lui seul un motif de signalement.');
}

// ─── Regle 2 : pas d'accusation sur un faible historique ───────────────────
{
  const R = makeContext([]).window.RacineAdminTuning.RULES;
  assert(R && R.minTested >= 5 && R.minRecentSample >= 5,
    'Les seuils de prudence existent et ne sont pas symboliques.');

  // Juste sous le seuil de predictions testees : silence.
  const few = makeContext([profile({
    testedPredictions: R.minTested - 1, successfulPredictions: 0,
    recentOutcomes: [0,0,0,0,0]
  })]);
  assert(few.window.RacineAdminTuning.analyze().findings.length === 0,
    'Sous minTested, aucun mouvement n\'est signale meme avec 0 % de reussite.');

  // Fenetre glissante trop courte : silence aussi.
  const short = makeContext([profile({
    testedPredictions: R.minTested + 10, successfulPredictions: 0,
    recentOutcomes: [0,0]
  })]);
  assert(short.window.RacineAdminTuning.analyze().findings.length === 0,
    'Sous minRecentSample, la fenetre recente ne sert pas a juger.');

  // Deux refus seulement : sous minOverrideDown, silence.
  const twoRefusals = makeContext([profile({ humanOverrideDown: R.minOverrideDown - 1 })]);
  assert(twoRefusals.window.RacineAdminTuning.analyze().findings.length === 0,
    'Sous minOverrideDown, un refus repete n\'accuse encore personne.');
}

// ─── Le seul vrai blocage : propose, refuse, jamais teste ──────────────────
{
  const ctx = makeContext([profile({ label: 'Lateral Raise DB', humanOverrideDown: 5, testedPredictions: 0 })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 1 && out.findings[0].kind === 'untested',
    'Cinq propositions refusees sans essai sont signalees (' + kinds(out.findings) + ').');
  assert(/refus/i.test(out.findings[0].title),
    'Le signalement dit ce qui s\'est passe, pas un score.');
}
// Mais si tu les testes majoritairement, ce n'est plus un blocage.
{
  const ctx = makeContext([profile({ humanOverrideDown: 3, testedPredictions: 20, successfulPredictions: 18,
                                     recentOutcomes: [1,1,1,1,1,1,1,1,1,1] })]);
  assert(ctx.window.RacineAdminTuning.analyze().findings.length === 0,
    'Quelques refus noyes dans des essais reussis ne sont pas un blocage.');
}

// ─── Courbe qui plafonne : la seule erreur qu'on signale ───────────────────
{
  const ctx = makeContext([profile({
    label: 'Face Pull',
    testedPredictions: 30, successfulPredictions: 12,   // 40 % a vie
    recentOutcomes: [0,0,1,0,0,0,1,0,0,0]               // 20 % recent : ca ne remonte pas
  })]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 1 && out.findings[0].kind === 'stuck',
    'Une precision faible qui ne remonte pas est signalee (' + kinds(out.findings) + ').');
}
// La meme precision faible, mais qui REMONTE : on se tait, il apprend.
{
  const ctx = makeContext([profile({
    testedPredictions: 30, successfulPredictions: 9,    // 30 % a vie
    recentOutcomes: [1,1,0,1,1,1,0,1,1,1]               // 80 % recent
  })]);
  assert(ctx.window.RacineAdminTuning.analyze().findings.length === 0,
    'Une precision qui remonte n\'est jamais signalee, meme partie de bas.');
}

// ─── Agregation par mouvement, pas par intention ───────────────────────────
{
  const ctx = makeContext([
    profile({ label: 'Back Squat', intent: 'strength',    humanOverrideDown: 2 }),
    profile({ label: 'Back Squat', intent: 'hypertrophy', humanOverrideDown: 2 })
  ]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out.findings.length === 1,
    'Deux intentions du meme mouvement se regroupent en une seule ligne (un plafond ne connait pas l\'intention).');
  assert(Object.keys(out.byMove).length === 1, 'Une seule entree par mouvement dans l\'agregat.');
}

// ─── Precision globale : silence tant que l'echantillon ne dit rien ────────
{
  const quiet = makeContext([profile({ recentOutcomes: [1,0] })]);
  assert(quiet.window.RacineAdminTuning.analyze().precision === null,
    'Sous l\'echantillon minimal, aucun chiffre de precision n\'est affiche.');

  const loud = makeContext([profile({ recentOutcomes: [1,1,1,0,1,1,1,1,0,1] })]);
  const p = loud.window.RacineAdminTuning.analyze().precision;
  assert(p && p.pct === 80 && p.sample === 10,
    'Avec assez d\'observations, la precision recente est mise en commun telle quelle.');
}

// ─── Aucune memoire : le panneau ne plante pas ─────────────────────────────
{
  const ctx = makeContext([]);
  const out = ctx.window.RacineAdminTuning.analyze();
  assert(out && out.findings.length === 0 && out.precision === null,
    'Un profil sans historique Brain donne un panneau vide, pas une erreur.');
}

// ─── Frontiere : plus aucun reglage scalaire dans cet ecran ────────────────
{
  const src = read('scripts/profiles/admin_tuning.js');
  assert(!/PARAMS/.test(src),
    'Le panneau ne rend plus la table PARAMS : il ne configure plus le moteur.');
  assert(!/type="number"/.test(src),
    'Aucun champ numerique libre : les deux gestes passent par une charge en livres explicite.');
  assert(!/\.set\(/.test(src),
    'Le panneau n\'ecrit plus aucun parametre scalaire du moteur.');
  assert(/setCeiling/.test(src),
    'Le plafond manuel reste le geste offert — c\'est le seul que la mesure ne remplace pas.');
}

if(failed){
  console.error('\nÉCHEC calibration_readout_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK calibration_readout_checks.js — ' + checks + ' controles.');

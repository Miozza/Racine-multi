#!/usr/bin/env node
// Racine V4.4 — checks La Saison : journal de saison, rétention, suggestion.
// Pattern maison : vm + window factice, assertions bloquantes.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
const errors = [];
const notes = [];
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(read('scripts/season/index.js'), context, {filename:'scripts/season/index.js'});
const CoachSeason = context.window.CoachSeason;

assert(!!CoachSeason, 'CoachSeason est exposé.');

// ─── ensure() ────────────────────────────────────────────────────────────────
let st = {};
CoachSeason.ensure(st);
assert(st.season && Array.isArray(st.season.cycles) && st.season.cycles.length === 0,
  'ensure crée un journal vide sur un état neuf.');

// Reconstruction best-effort depuis weekTransitions : deux cycles passés + un actif.
st = {
  cycle: {goal: 'programme_c'},
  weekTransitions: [
    {cycle:'programme_a', fromWeek:1, toWeek:2, date:'2026-01-12'},
    {cycle:'programme_a', fromWeek:2, toWeek:3, date:'2026-01-19'},
    {cycle:'programme_b', fromWeek:1, toWeek:2, date:'2026-02-09'},
    {cycle:'programme_c', fromWeek:1, toWeek:2, date:'2026-03-02'}
  ]
};
CoachSeason.ensure(st);
assert(st.season.cycles.length === 2, 'Reconstruction : 2 cycles passés (l’actif exclu).');
assert(st.season.cycles[0].programId === 'programme_a' && st.season.cycles[0].weeksDone === 3,
  'Reconstruction : programme_a terminé S3.');
assert(st.season.cycles[1].programId === 'programme_b' && st.season.cycles[1].endIso === '2026-02-09',
  'Reconstruction : programme_b daté de sa dernière transition.');
const reconstructed = JSON.stringify(st.season.cycles);
CoachSeason.ensure(st);
assert(JSON.stringify(st.season.cycles) === reconstructed, 'ensure est idempotent (pas de double reconstruction).');

// ─── recordCycleEnd() ────────────────────────────────────────────────────────
st = {
  cycle: {goal: 'prog_x'},
  week: 6,
  activeCycleStartDate: '2026-05-04',
  history: [
    {date:'2026-05-06', results:{bench:{load:200}}},
    {date:'2026-05-20', results:{bench:{load:210}}},   // PR bench (dans le cycle)
    {date:'2026-06-03', results:{bench:{load:205}}}
  ]
};
CoachSeason.ensure(st);
CoachSeason.recordCycleEnd(st, '2026-06-10');
assert(st.season.cycles.length === 1, 'recordCycleEnd ajoute une entrée.');
const rec = st.season.cycles[0];
assert(rec.programId === 'prog_x' && rec.startIso === '2026-05-04' && rec.endIso === '2026-06-10' && rec.weeksDone === 6,
  'L’entrée porte programme, dates et semaines.');
assert(rec.prCount === 1, 'prCount compte les dépassements de meilleure charge (1 PR bench).');
CoachSeason.recordCycleEnd(st, '2026-06-10');
assert(st.season.cycles.length === 1, 'recordCycleEnd est idempotent le même jour (pas de doublon).');
st.cycle.goal = 'prog_y'; st.week = 2; st.activeCycleStartDate = '2026-06-11';
CoachSeason.recordCycleEnd(st, '2026-07-01');
assert(st.season.cycles.length === 2, 'Un autre programme peut être enregistré ensuite.');
assert(st.season.cycles[0].programId === 'prog_x', 'Le journal ne réécrit jamais les entrées passées.');

// ─── isCycleFinished() ───────────────────────────────────────────────────────
function fin(week, completed, total, days){ return CoachSeason.isCycleFinished({week:week, completedDays:completed}, total, days); }
assert(fin(3, ['lundi','mardi','jeudi','vendredi'], 6, 4) === false, 'S3/6 : cycle non fini.');
assert(fin(6, ['lundi'], 6, 4) === false, 'S6/6 incomplète : cycle non fini.');
assert(fin(6, ['lundi','mardi','jeudi','vendredi'], 6, 4) === true, 'S6/6 complète : cycle fini.');
assert(fin(7, [], 6, 4) === true, 'S7/6 (dépassé par la date) : cycle fini.');

// ─── Objectifs partagés (Task 5) ─────────────────────────────────────────────
const goals = context.window.CoachSeasonGoals;
assert(!!goals && Array.isArray(goals.KEYS) && goals.KEYS.length === 7, 'CoachSeasonGoals expose 7 objectifs.');
assert(goals.KEYS.every(k => typeof goals.LABELS[k] === 'string' && goals.LABELS[k].length > 0),
  'Chaque objectif a un libellé FR.');
assert(goals.normalize('prendre_du_muscle') === 'prendre_du_muscle', 'normalize accepte une valeur du vocabulaire.');
assert(goals.normalize('nimporte_quoi') === null && goals.normalize(undefined) === null,
  'normalize rejette les valeurs hors vocabulaire.');

// ─── Objectif utilisateur branché (statique) ─────────────────────────────────
const onboardingSrc = read('scripts/profiles/onboarding.js');
assert(onboardingSrc.includes('state.profile.trainingGoal'), 'L’onboarding persiste trainingGoal dans le profil.');
assert(onboardingSrc.includes('CoachSeasonGoals.normalize'), 'L’onboarding normalise trainingGoal (vocabulaire fermé).');
const profilesUiSrc = read('scripts/profiles/ui.js');
assert(profilesUiSrc.includes('rrTrainingGoal'), 'Le wizard pose la question de l’objectif.');
assert(profilesUiSrc.includes('settingsTrainingGoal'), 'L’objectif est éditable dans Réglages.');
assert(profilesUiSrc.includes('trainingGoalOptionsHtml'), 'Les options viennent du vocabulaire partagé.');

// ═══ Rétention long terme (scripts/season/retention.js) ═════════════════════
vm.runInContext(read('scripts/season/retention.js'), context, {filename:'scripts/season/retention.js'});
const CoachRetention = context.window.CoachRetention;
assert(!!CoachRetention, 'CoachRetention est exposé.');

st = {};
CoachRetention.recordSession(st, {bench:{load:'200', reps:'8', rpe:'8'}}, '2026-07-06');
CoachRetention.recordSession(st, {bench:{load:'210', reps:'6', rpe:'9'}}, '2026-07-13');
let mv = st.longTerm.byMovement.bench;
assert(Array.isArray(mv) && mv.length === 1, 'Deux séances du même mois fusionnent en une entrée.');
assert(mv[0].month === '2026-07' && mv[0].bestLoad === 210 && mv[0].bestReps === 6 && mv[0].sessions === 2,
  'Agrégat : bestLoad=max, sessions=2.');
assert(Math.abs(mv[0].avgRpe - 8.5) < 0.01, 'avgRpe incrémental correct (8,5).');
CoachRetention.recordSession(st, {bench:{load:'205', reps:'8', rpe:'7'}}, '2026-08-03');
assert(st.longTerm.byMovement.bench.length === 2, 'Un nouveau mois crée une nouvelle entrée.');
CoachRetention.recordSession(st, {deadBug:{note:'sans charge'}}, '2026-08-03');
assert(!st.longTerm.byMovement.deadBug, 'Un mouvement sans charge numérique est ignoré.');

// Plafond 36 mois glissants.
st = {};
for(let i = 0; i < 40; i++){
  const y = 2020 + Math.floor(i / 12), m = (i % 12) + 1;
  CoachRetention.recordSession(st, {squat:{load:String(100 + i), rpe:'7'}}, y + '-' + String(m).padStart(2,'0') + '-15');
}
mv = st.longTerm.byMovement.squat;
assert(mv.length === 36, 'Plafond : 36 entrées mensuelles conservées.');
assert(mv[mv.length - 1].bestLoad === 139 && mv[0].bestLoad === 104, 'Le plafond garde les mois les plus récents.');

// ═══ Suggestion (scripts/season/suggest.js) ══════════════════════════════════
vm.runInContext(read('scripts/season/suggest.js'), context, {filename:'scripts/season/suggest.js'});
const CoachSuggest = context.window.CoachSuggest;
assert(!!CoachSuggest, 'CoachSuggest est exposé.');

const catalog = [
  {id:'hyper_4d',  name:'Hypertrophie 4j', objective:'hypertrophie', frequency:4, visibility:'public', suggestedNext:['force_4d']},
  {id:'force_4d',  name:'Force 4j',        objective:'force',        frequency:4, visibility:'public', suggestedNext:[]},
  {id:'metcon_3d', name:'Metcon 3j',       objective:'préparation metcon', frequency:3, visibility:'public', suggestedNext:[]},
  {id:'deload_3d', name:'Deload',          objective:'transition',   frequency:3, visibility:'public', suggestedNext:[]},
  {id:'prive_4d',  name:'Privé 4j',        objective:'force',        frequency:4, visibility:'private', suggestedNext:[]}
];
const ended = catalog[0]; // hyper_4d, suggestedNext force_4d

// L'objectif domine le graphe : goal "perdre_du_poids" (→ metcon) bat force_4d (graphe).
let props = CoachSuggest.propositions({candidates:catalog, endedProgram:ended, trainingGoal:'perdre_du_poids', season:{cycles:[]}, recentAvgRpe:7});
assert(props.length >= 2 && props.length <= 3, 'Entre 2 et 3 propositions.');
assert(props[0].id === 'metcon_3d', 'L’objectif de l’utilisateur domine le graphe.');
assert(props.every(p => typeof p.reason === 'string' && p.reason.length > 0), 'Chaque proposition porte une raison.');
assert(!props.some(p => p.id === 'prive_4d'), 'Un programme privé n’est jamais proposé (refiltrage défensif).');

// Sans objectif : le graphe décide.
props = CoachSuggest.propositions({candidates:catalog, endedProgram:ended, trainingGoal:null, season:{cycles:[]}, recentAvgRpe:7});
assert(props[0].id === 'force_4d', 'Sans objectif, le successeur du graphe passe en tête.');

// Fatigue : RPE 8,6 → deload inséré en tête ; 8,4 → pas de deload forcé.
props = CoachSuggest.propositions({candidates:catalog, endedProgram:ended, trainingGoal:null, season:{cycles:[]}, recentAvgRpe:8.6});
assert(props[0].id === 'deload_3d', 'Fatigue ≥ 8,5 : la semaine deload passe en tête.');
props = CoachSuggest.propositions({candidates:catalog, endedProgram:ended, trainingGoal:null, season:{cycles:[]}, recentAvgRpe:8.4});
assert(props[0].id !== 'deload_3d', 'Fatigue < 8,5 : pas de deload forcé.');

// Le programme qui vient de se terminer n'est pas re-proposé en tête.
props = CoachSuggest.propositions({candidates:catalog, endedProgram:ended, trainingGoal:'prendre_du_muscle', season:{cycles:[]}, recentAvgRpe:7});
assert(props[0].id !== 'hyper_4d' || props.length === 1, 'Le cycle qui se termine ne se re-propose pas en premier.');

// recentAvgRpe helper : moyenne des RPE des 14 derniers jours.
st = {history:[
  {date:'2026-07-01', results:{a:{rpe:'9'}, b:{rpe:'9'}}},
  {date:'2026-07-05', results:{a:{rpe:'8'}}},
  {date:'2026-05-01', results:{a:{rpe:'5'}}} // trop vieux, ignoré
]};
const avg = CoachSuggest.recentAvgRpe(st, '2026-07-08');
assert(Math.abs(avg - 8.666) < 0.01, 'recentAvgRpe moyenne les 2 dernières semaines (8,67), ignore le reste.');

// ─── Sortie ──────────────────────────────────────────────────────────────────
if(errors.length){
  console.error('ÉCHEC season_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
notes.forEach(n => console.log(' - ' + n));
console.log('OK season_checks.js — V4.4');

#!/usr/bin/env node
/*
  Racine — garde-fous : vue « Cycle » de la vue PC + nettoyage toolbar.
  - La toolbar PC ne contient plus « ▶ Séance » ni « TMS ».
  - Un onglet « Cycle » (défaut) affiche la grille complète du cycle :
    mouvements + séries×reps seulement (sans charge), semaines en lignes /
    jours en colonnes, chaque journée cliquable vers l'inspection Séance avec
    un retour au cycle.

  Usage : node dev/pc_cycle_view_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const pc = read('scripts/view_pc.js');
const html = read('index.html');
const tms = read('scripts/tms_session.js');
const css = read('styles.css');

// ── Toolbar nettoyée ───────────────────────────────────────────────────────
const toolbar = (html.match(/<div class="phone-toolbar pc-toolbar">[\s\S]*?<div id="phoneWod"/)||[''])[0];
assert(!/id="sessionModeBtn"/.test(toolbar), 'toolbar PC : bouton « ▶ Séance » retiré');
assert(!/id="tmsSessionBtn"/.test(toolbar), 'toolbar PC : bouton « TMS » retiré');
assert(/id="copyPhoneBtn"/.test(toolbar) && /id="fullscreenBtn"/.test(toolbar), 'toolbar PC : copier + plein écran conservés');
assert(!/id:"tmsSessionBtn"/.test(tms), 'tms_session : plus de binding sur tmsSessionBtn');
assert(/id:"tmsGlobalBtn"/.test(tms), 'tms_session : TMS global (nav) conservé');

// ── Onglet Cycle ───────────────────────────────────────────────────────────
assert(/var pcActiveTab = "cycle"/.test(pc), 'vue PC : onglet Cycle par défaut');
assert(/\['cycle'\s*,\s*'Cycle'\]/.test(pc), 'vue PC : onglet Cycle dans la barre');
assert(/function pcRenderCycleTab/.test(pc) && /function pcCycleDayItems/.test(pc), 'vue PC : renderers Cycle définis');
assert(/pcActiveTab==='cycle'\)return pcRenderCycleTab/.test(pc), 'vue PC : Cycle branché dans pcRenderActiveTab');
assert(/data-pc-cycle-day/.test(pc) && /pcCycleReturn=true/.test(pc), 'vue PC : clic journée → inspection + retour armé');
assert(/id="pcBackToCycleBtn"/.test(pc) && /pcActiveTab='cycle'/.test(pc), 'vue PC : bouton « Retour au cycle »');
assert(/\.pcx-cycle-grid/.test(css), 'styles : grille Cycle stylée');

// ── V5.4.6 — en-tête compact, cardio, libellés ───────────────────────────
assert(/id="pcBackWodBtn"/.test(pc) && /pcBackWodBtn'\);if\(backWod\)backWod\.onclick=function\(\)\{switchView\("training"\)/.test(pc), 'vue PC : « ← WOD » dans l\'en-tête, branché');
assert(/#phoneView\.view-active \.phone-toolbar\.pc-toolbar\{display:none;\}/.test(css), 'vue PC : la barre d\'outils (un seul bouton) est masquée');
assert(/function pcCardioPace/.test(pc) && /pace===null\?CoachCharge\.suggestForExercise/.test(pc), 'vue PC : un cardio montre son allure, pas « 0 lb » ni de `!`');
assert(/pcWeekShortLabel\(i\)/.test(pc), 'vue PC : sélecteur de semaine au libellé court (« S1 Pacing »)');
assert(/'alertes':'alerte'/.test(pc) && /pcPlural\(alerts\.length,'alerte'\)/.test(pc), 'vue PC : « 1 alerte » au singulier');
{
  const diag = read('scripts/charge_diagnostic_ui.js');
  assert(/coachExerciseDose\(exercise\.name\|\|label,exercise\.format,exercise\.load\)\.cardio\) return true/.test(diag), 'diagnostic : un cardio n\'a pas de charge utile (pas d\'alerte « données faibles »)');
  assert(!/Donnees faibles|necessairement|coherente avec|Seance coherente/.test(diag), 'diagnostic : textes affichés accentués');
}

// ── Smoke runtime : la grille se construit sans charge, cliquable ──────────
try{
  const ctx = { console: console };
  ctx.window = ctx; ctx.self = ctx;
  ctx.state = { cycle:{goal:'test'}, week:1, day:'lundi' };
  ctx.escapeHtml = function(s){ return String(s==null?'':s); };
  ctx.cleanLine = function(s){ return s; };
  ctx.displayChargeText = function(s){ return s; };
  vm.createContext(ctx);
  vm.runInContext(pc, ctx, { filename:'view_pc.js' });

  // Stubs des dépendances (réassignés après chargement).
  ctx.pcDayOrder = function(){ return ['lundi','mardi']; };
  ctx.pcTotalWeeks = function(){ return 2; };
  ctx.pcDisplayDayName = function(d){ return d==='lundi'?'Lun':'Mar'; };
  ctx.pcFocusCfg = function(){ return { label:'Programme Test' }; };
  ctx.pcCurrentCycleId = function(){ return 'test'; };
  ctx.pcCurrentWeek = function(){ return 1; };
  ctx.pcCurrentDay = function(){ return 'lundi'; };
  ctx.movements = { squat:{ name:'Back Squat' } };
  ctx.setScheme = function(){ return '5×5'; };
  ctx.pcWorkout = function(day, week){
    if(day==='mardi' && week===2) return { blocks:[] };            // jour repos
    if(day==='mardi') return { blocks:[
      { kind:'warmup', title:'Warm-up compétition', time:'8 min', text:'Row facile 3 min + air squats 2×10' },
      { kind:'wod', text:'21-15-9 thrusters' }
    ] };
    return { blocks:[
      { kind:'main', exercises:[{ name:'Bench Press', format:'4×8' }] },
      { kind:'accessory', progress:['squat'] }
    ] };
  };

  const out = ctx.pcRenderCycleTab();
  assert(/Programme Test/.test(out), 'smoke : titre du programme affiché');
  assert(/data-pc-cycle-week="1"[^>]*data-pc-cycle-day="lundi"/.test(out), 'smoke : cellule S1/lundi cliquable');
  assert(/>S1<[\s\S]*>S2</.test(out), 'smoke : lignes de semaines S1 puis S2');
  assert(/Bench Press[\s\S]*?4×8/.test(out), 'smoke : mouvement + séries×reps (exercice)');
  assert(/Back Squat[\s\S]*?5×5/.test(out), 'smoke : mouvement + schéma (progress)');
  assert(/pcx-cycle-wod/.test(out) && /21-15-9 thrusters/.test(out), 'smoke : bloc WOD résumé');
  assert(/pcx-cycle-rest/.test(out) && /repos/.test(out), 'smoke : journée vide = repos');
  // V5.4.6 — l'étiquette dit la nature du bloc ; l'échauffement ne montre que
  // son titre, et seul le metcon porte la classe qui le met en avant.
  assert(/<b>Échauff\.<\/b>/.test(out) && /Warm-up compétition · 8 min/.test(out) && !/air squats 2×10/.test(out), 'smoke : échauffement = étiquette « Échauff. » + titre seul');
  assert(/is-metcon"><b>WOD<\/b>/.test(out) && !/<b>WOD<\/b>[^<]*<span>Warm-up/.test(out), 'smoke : seul le metcon s\'appelle « WOD »');
  assert(/data-day-label="Lun"/.test(out), 'smoke : chaque cellule porte son jour (lisible en colonne unique)');
  assert(!/ lb</.test(out) && !/Charge/.test(out), 'smoke : aucune charge dans la grille');
}catch(e){
  assert(false, 'smoke : rendu Cycle sans exception (' + e.message + ')');
}

process.on('exit', function(){
  if(failures){ console.error('\n❌ pc_cycle_view_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ pc_cycle_view_checks OK');
});

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
    if(day==='mardi') return { blocks:[{ kind:'wod', text:'21-15-9 thrusters' }] };
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
  assert(!/ lb</.test(out) && !/Charge/.test(out), 'smoke : aucune charge dans la grille');
}catch(e){
  assert(false, 'smoke : rendu Cycle sans exception (' + e.message + ')');
}

process.on('exit', function(){
  if(failures){ console.error('\n❌ pc_cycle_view_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ pc_cycle_view_checks OK');
});

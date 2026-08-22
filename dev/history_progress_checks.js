#!/usr/bin/env node
/*
  Racine — garde-fous : Progression hébergée dans l'onglet Historique.
  La Progression riche (ex-onglet « Progression » de la vue PC) est montée
  dans #progressCharts de l'Historique pour TOUS les profils, et l'onglet
  a disparu de la vue PC (admin inclus). Lecture statique des sources.

  Usage : node dev/history_progress_checks.js
*/
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const pc = read('scripts/view_pc.js');
const app = read('app.js');
const html = read('index.html');

// ── L'onglet Progression n'existe plus dans la vue PC ──────────────────────
assert(!/\['progress'\s*,\s*'Progression'\]/.test(pc), 'vue PC : onglet « Progression » retiré de la barre d\'onglets');
assert(!/pcActiveTab==='progress'/.test(pc), 'vue PC : plus aucune branche de rendu/binding sur l\'onglet progress');

// ── Le moteur de rendu progression est conservé et monté ailleurs ──────────
assert(/function pcRenderProgressTab/.test(pc), 'moteur : pcRenderProgressTab conservé');
assert(/function pcRenderProgressInto/.test(pc) && /window\.pcRenderProgressInto\s*=/.test(pc),
  'moteur : pcRenderProgressInto défini et exposé pour l\'Historique');
assert(/"progressCharts"/.test(pc), 'moteur : monté par défaut dans #progressCharts');

// ── Les interactions re-rendent le conteneur, pas la vue PC ────────────────
const bindBlock = pc.match(/function pcBindProgression\(\)\{[\s\S]*?\n\}/);
assert(!!bindBlock, 'pcBindProgression présent');
assert(bindBlock && !/renderPhoneWod/.test(bindBlock[0]),
  'interactions progression : ne re-rendent plus la vue PC (renderPhoneWod)');
assert(bindBlock && /pcRenderProgressInto/.test(bindBlock[0]),
  'interactions progression : re-rendent le conteneur via pcRenderProgressInto');

// ── L'Historique monte la Progression riche, avec repli ────────────────────
assert(/pcRenderProgressInto\("progressCharts"\)/.test(app), 'renderHistory : monte la Progression riche');
assert(/else renderProgressCharts\(\)/.test(app), 'renderHistory : repli mini-barres si view_pc absent');
assert(/function renderProgressCharts/.test(app), 'repli renderProgressCharts conservé');
assert(/id="progressCharts"/.test(html), 'index.html : conteneur #progressCharts présent dans l\'Historique');

// ── Sous-onglets : séances prioritaires, progression sur demande ───────────
const css = read('styles.css');
assert(/id="historySubtabSessions"/.test(html) && /id="historySubtabProgress"/.test(html),
  'index.html : sous-onglets Séances / Progression présents');
assert(/historyActiveSubtab\s*=\s*"sessions"/.test(app), 'app.js : les séances sont le sous-onglet par défaut (prioritaires)');
assert(/historyActiveSubtab==="progress"/.test(app), 'renderHistory : bascule selon le sous-onglet actif');
assert(/historySubtabSessions/.test(app) && /historySubtabProgress/.test(app), 'app.js : clics des sous-onglets branchés');
assert(/id="historyLandscapeHint"/.test(html) && /paysage/i.test(html),
  'index.html : bandeau d\'invitation au mode paysage présent');
assert(/orientation\s*:\s*portrait/.test(css) && /history-landscape-hint/.test(css),
  'styles.css : le bandeau paysage ne s\'affiche qu\'en portrait (media query)');

// ── L'Historique reste accessible à tous (pas de garde admin) ──────────────
const histView = html.match(/<main id="historyView">[\s\S]*?<\/main>/);
assert(!!histView && !/admin-only/.test(histView[0]), 'vue Historique : aucune classe admin-only');

// ── Une charge réduite VOLONTAIREMENT n'est pas une baisse ─────────────────
// Signalé en usage réel : une semaine « Retour au travail » (charges à ~55 %
// du 1RM de référence, RPE 6-7 imposé) plaçait chaque mouvement en « BAISSE
// SUSPECTE ». Le moteur de charges, lui, écartait déjà ces lignes depuis
// toujours — il les marque `context_logged` à la sauvegarde. C'est la LECTURE
// en aval qui les prenait pour une chute de capacité.
// Ce bloc exécute la vraie logique de tendance, il ne la relit pas.
const vm = require('vm');
function extractFn(src, name){
  const start = src.indexOf('function ' + name + '(');
  if(start < 0) return '';
  let depth = 0, end = -1;
  for(let j = src.indexOf('{', start); j < src.length; j++){
    if(src[j] === '{') depth++;
    else if(src[j] === '}'){ depth--; if(depth === 0){ end = j + 1; break; } }
  }
  return end > 0 ? src.slice(start, end) + '\n' : '';
}
const trendFns = ['pcProgIsContextRow','pcProgCapacityRows','pcProgFinalizeItem','pcProgCondenseRowsByDate',
                  'pcProgDateKey','pcProgRowScore','pcProgContextNote','pcProgInsight','pcProgPointClass',
                  'pcProgSetText','pcProgFormatNumber','pcProgMetricValue','pcProgE1rmIsStretched'];
let trendCode = '';
trendFns.forEach(function(n){
  const code = extractFn(pc, n);
  assert(!!code, 'progression : ' + n + ' reste extractible pour être testée');
  trendCode += code;
});
const box = { window:{}, console:{log:function(){},warn:function(){}}, pcProgressSelected:null };
// pcProgFinalizeItem lit le mode de lecture (charge / e1RM) : on le pose comme
// la vue le pose, sinon c'est le harnais qui casse, pas le code testé.
trendCode = 'var pcProgressMetricMode="load";\n' + trendCode;
// Le garde-fou n'invente pas sa propre définition : il rejoue la porte publique
// du moteur, celle que la courbe utilise réellement.
box.window.CoachCharge = { isContextualLoadRow: function(r){
  return !!(r && (r.status === 'context_logged' || (r.context && (r.context.isTechnical || r.context.isLight || r.context.isRecovery))));
}};
vm.createContext(box);
try{
  vm.runInContext(trendCode, box);

  const mkRow = function(date, load, rpe, extra){
    return Object.assign({_key:date+'|'+load,_order:0,date:date,sortDate:Date.parse(date),
      load:load,reps:5,rpe:rpe,e1rm:Math.round(load*(1+5/30)),status:'',planned:null,context:null}, extra||{});
  };
  const clean = [['2026-06-03',165,7.5],['2026-06-10',180,8],['2026-06-17',185,8],
                 ['2026-06-24',190,8],['2026-07-01',195,8.5],['2026-07-08',195,8.5]]
                 .map(function(a){ return mkRow(a[0],a[1],a[2]); });
  const deload = mkRow('2026-08-05',135,6.5,{status:'context_logged',context:{isRecovery:true,isTechnical:true}});
  const finalize = function(rows){
    return box.pcProgFinalizeItem({id:'back_squat',label:'Back Squat',priority:1,aliases:{},rows:rows.slice()});
  };

  const withDeload = finalize(clean.concat([deload]));
  assert(withDeload.stats.trend === 'up',
    'une semaine allégée en fin de cycle ne retourne pas la tendance (vu : ' + withDeload.stats.trend + ')');
  assert(box.pcProgInsight(withDeload).title !== 'Baisse suspecte',
    'le verdict ne crie plus « Baisse suspecte » pour une charge réduite voulue');
  assert(withDeload.rows.length === 7,
    'le point de la semaine allégée reste tracé : la séance a bien eu lieu');
  assert(/context/.test(box.pcProgPointClass(withDeload, withDeload.rows[6], 6, 6, withDeload.stats.best)),
    'ce point est visuellement distingué, pas confondu avec une capacité');
  assert(withDeload.stats.avgRpe === finalize(clean).stats.avgRpe,
    'le RPE 6-7 imposé d’une semaine allégée ne fait pas passer le cycle pour facile');
  assert(withDeload.stats.contextExcluded === 1 && withDeload.stats.capacityPoints === 6,
    'les points écartés sont comptés à part des points de capacité');
  assert(/allégée/.test(box.pcProgInsight(withDeload).text),
    'le verdict DIT ce qu’il a écarté, il ne le fait pas en silence');

  // Contre-épreuve : une vraie baisse, hors contexte, doit rester signalée.
  const realDrop = finalize(clean.concat([mkRow('2026-08-05',150,9)]));
  assert(realDrop.stats.trend === 'down' && box.pcProgInsight(realDrop).title === 'Baisse suspecte',
    'une vraie baisse hors contexte reste signalée');

  // Un mouvement vu SEULEMENT en semaine allégée ne reçoit pas de faux verdict.
  const onlyContext = finalize([mkRow('2026-08-05',95,6.5,{status:'context_logged'}),
                                mkRow('2026-08-07',95,6.5,{status:'context_logged'})]);
  assert(box.pcProgInsight(onlyContext).title === 'Semaine allégée',
    'un mouvement vu seulement en semaine allégée le dit, au lieu de conclure');
}catch(e){
  assert(false, 'progression : la logique de tendance doit rester exécutable hors navigateur (' + e.message + ')');
}

// La définition vient du moteur, elle n'est pas redupliquée dans les vues.
const charge = read('scripts/charge/index.js');
assert(/isContextualLoadRow:/.test(charge),
  'CoachCharge expose la lecture « charge réduite volontairement »');
assert(/coachIsContextualLoadRow/.test(read('scripts/charge/historique.js')),
  'la définition vit dans le domaine charge, pas dans les vues');
assert(/CoachCharge\.isContextualLoadRow/.test(pc),
  'la courbe lit la définition du moteur au lieu d’en écrire une deuxième');

// Le résumé de fin de séance a la MÊME lecture : sans ça, une semaine de
// reprise faisait tomber tous ses mouvements chargés dans « Ce qui bloque ».
const prog = read('scripts/progression/index.js');
const sum = read('scripts/summary/index.js');
assert(/CoachCharge\.isContextualLoadRow/.test(prog) && /CoachCharge\.isContextualLoadRow/.test(sum),
  'résumé de séance : même lecture du contexte que la courbe');
assert(/if\(contextual\)\{[\s\S]{0,160}out\.status = "context"/.test(prog),
  'une baisse voulue devient une information, pas un blocage');
assert(/delta < 0 && !contextual/.test(sum),
  'le repli du résumé (sans CoachProgress) applique la même exception');
// Garde-fou du garde-fou : un échec RÉEL pendant une semaine allégée doit
// rester signalé. Les branches d'échec sont évaluées AVANT l'exception.
assert(prog.indexOf('major_fail') < prog.indexOf('if(contextual){'),
  'un échec réel pendant une semaine allégée reste signalé (test d’échec avant l’exception)');

// ── Une charge sans ses répétitions ne veut pas dire grand-chose ───────────
// Signalé en usage réel : « un 1RM de 3 reps et de 8 reps ne sont pas
// équivalents ». La courbe traçait la charge nue, donc 195×3, 195×5 et 195×8
// formaient une ligne PLATE à 195 — trois performances très différentes
// affichées identiques. Deux réponses, toutes deux vérifiées ici :
//   · chaque point porte désormais ses répétitions ;
//   · une lecture e1RM (Epley, la math de base du moteur) les combine.
const metricFns = trendFns.concat(['pcProgMetricUnit','pcProgMetricName',
                                   'pcProgPointLabelText','pcProgFormatMetric','pcProgE1rm']);
let metricCode = 'var PC_E1RM_TRUST_REPS=12; var pcProgressMetricMode="load";\n';
metricFns.forEach(function(n){ metricCode += extractFn(pc, n); });
const mbox = { window:{ CoachCharge:{ isContextualLoadRow:function(){ return false; } } },
               console:{log:function(){},warn:function(){}}, pcProgressSelected:null };
vm.createContext(mbox);
try{
  vm.runInContext(metricCode, mbox);
  const r = function(date, load, reps, rpe){
    return {_key:date+'|'+load+'x'+reps,_order:0,date:date,sortDate:Date.parse(date),
      load:load,reps:reps,rpe:rpe,e1rm:mbox.pcProgE1rm(load,reps),status:'',planned:null,context:null};
  };
  const sameLoad = [r('2026-06-03',195,3,8), r('2026-06-10',195,5,8), r('2026-06-17',195,8,8.5)];
  const build = function(mode, rows){
    vm.runInContext('pcProgressMetricMode="'+mode+'";', mbox);
    return mbox.pcProgFinalizeItem({id:'back_squat',label:'Back Squat',priority:1,aliases:{},rows:rows.slice()});
  };

  const loadItem = build('load', sameLoad);
  const labels = loadItem.rows.map(function(row){
    return mbox.pcProgPointLabelText(loadItem, row, mbox.pcProgMetricValue(loadItem, row));
  });
  assert(labels.join(' ') === '195×3 195×5 195×8',
    'mode Charge : chaque point porte ses répétitions (vu : ' + labels.join(' ') + ')');

  const e1Item = build('e1rm', sameLoad);
  const vals = e1Item.rows.map(function(row){ return mbox.pcProgMetricValue(e1Item, row); });
  assert(e1Item.metric === 'e1rm' && mbox.pcProgMetricName(e1Item) === 'e1RM estimé',
    'mode e1RM : la courbe change de métrique, pas seulement d’étiquette');
  assert(vals[0] < vals[1] && vals[1] < vals[2],
    'mode e1RM : à charge égale, plus de répétitions vaut plus (vu : ' + vals.join(' < ') + ')');
  assert(e1Item.stats.trend === 'up',
    'mode e1RM : une progression en répétitions à charge constante devient visible');
  // Le verdict tenait déjà compte du e1RM (deltaE1rm >= 10 suffit à dire « up ») :
  // c'est le TRACÉ qui ignorait les répétitions, pas la conclusion. Épinglé pour
  // qu'on ne « corrige » pas un jour une règle qui n'a jamais été fautive.
  assert(loadItem.stats.trend === 'up',
    'mode Charge : le verdict tenait déjà compte des répétitions via le e1RM');
  assert(Math.round(loadItem.stats.deltaMetric) === 0,
    'mode Charge : la valeur TRACÉE, elle, ne bougeait pas — c’était toute l’incohérence');
  assert(/195×8/.test(mbox.pcProgPointLabelText(e1Item, e1Item.rows[2], vals[2])),
    'mode e1RM : la série réelle reste lisible sous la valeur estimée');

  // Un mouvement au poids du corps garde sa métrique en répétitions : il n'a
  // pas de charge à convertir.
  vm.runInContext('pcProgressMetricMode="e1rm";', mbox);
  const bw = mbox.pcProgFinalizeItem({id:'weighted_pull_up',label:'Pull-Up',priority:1,aliases:{},rows:[
    {_key:'a',_order:0,date:'2026-06-03',sortDate:Date.parse('2026-06-03'),load:0,reps:6,rpe:8,e1rm:0,status:'',planned:null,context:null},
    {_key:'b',_order:1,date:'2026-06-10',sortDate:Date.parse('2026-06-10'),load:0,reps:9,rpe:8,e1rm:0,status:'',planned:null,context:null}]});
  assert(bw.metric === 'reps', 'mode e1RM : un mouvement au poids du corps reste lu en répétitions');

  // Epley au-delà d'une douzaine de reps : extrapolation, pas mesure.
  const stretched = build('e1rm', [r('2026-06-03',95,20,8), r('2026-06-10',135,5,8)]);
  assert(mbox.pcProgE1rmIsStretched(stretched.rows[0]) && !mbox.pcProgE1rmIsStretched(stretched.rows[1]),
    'e1RM : une série longue est reconnue comme extrapolée');
  assert(/stretched/.test(mbox.pcProgPointClass(stretched, stretched.rows[0], 1, 0, stretched.stats.best)),
    'e1RM : le point extrapolé est marqué, il ne se fait pas passer pour une mesure');
}catch(e){
  assert(false, 'progression : les deux lectures (charge / e1RM) doivent rester exécutables (' + e.message + ')');
}
assert(/data-pc-progress-metric/.test(pc) && /pcProgressMetricMode/.test(pc),
  'la vue offre le choix de lecture, elle ne l’impose pas');
assert(/\.pcx-progress-svg circle\.stretched\{/.test(read('styles.css')),
  'styles.css : le point e1RM extrapolé a son marqueur visuel');

process.on('exit', function(){
  if(failures){ console.error('\n❌ history_progress_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ history_progress_checks OK');
});

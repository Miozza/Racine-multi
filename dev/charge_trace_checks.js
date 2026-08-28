#!/usr/bin/env node
/*
  Racine - garde-fou de la trace du moteur de charges (scripts/charge/trace.js).

  Ce que ce script epingle :
    · la trace NOMME le filtre qui a ecarte chaque seance — c'est sa raison
      d'etre : « toutes mes seances sont dans Historique mais le moteur ne les
      voit pas » n'est pas diagnosticable sans ca ;
    · elle distingue les quatre motifs d'ecart (nature de contexte, seed
      manuel, ligne invraisemblable, cle de contexte) ;
    · elle reconstitue ce que le moteur aurait propose AVANT chaque seance ;
    · elle est strictement en LECTURE SEULE : l'historique et les indices du
      panneau (!) sont intacts apres son passage, meme si le moteur leve.

  Usage :
    node dev/charge_trace_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

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
  DEFAULT_CHARGES: { 'Back Squat':'315 lb' },
  CHARGE_ORDER: [],
  movements: {},
  state: { week:3, day:'lundi', cycle:{goal:'phase2_fable5'}, rpeHistory:{}, athleteState:{ movements:{} }, profile:{onboarded:true, scaleRatios:{_overall:1}} },
  save: function(){},
  focus: function(){ return {label:'test', targetReps:{0:3,1:3,2:3,3:3,4:3,5:3}}; },
  buildWeekInfo: function(){ return {3:{label:'S3', goal:'3RM propres.'}}; },
  weekIdx: function(){ return 2; },
  collectSessionExercises: function(){ return []; },
  currentDayOrder: function(){ return ['lundi','mardi']; },
  totalWeeks: function(){ return 3; },
  parseTargetReps: function(format, fallback){
    const nums = String(format || '').match(/\d+/g) || [];
    if(!nums.length)return {min:fallback||8, max:fallback||8};
    const last = Number(nums[nums.length-1]) || fallback || 8;
    return {min:last, max:last};
  },
  // Deux jours, trois semaines : le mouvement principal revient chaque semaine
  // (c'est ce que la portee cycle doit montrer), le second jour porte un autre
  // mouvement pour verifier que le balayage ne s'arrete pas au premier.
  buildWorkout: function(day, week){
    if(day === 'mardi'){
      return { blocks: [ { title:'A. Weighted Pull-up', kind:'main', exercises:[
        {name:'Weighted Pull-up', format:'4x3', load:'25-30 lb', note:'Tirage strict.'}
      ]} ] };
    }
    return { blocks: [ { title:'A. Pause Back Squat', kind:'main', exercises:[
      {name:'Pause Back Squat', format:'5x3', load:'190-205 lb', note:'Semaine ' + week + '.'}
    ]} ] };
  }
};
ctx.window = ctx;
ctx.globalThis = ctx;

[
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/movement_tuning.js',
  'scripts/charge/tuning_override.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js',
  'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js',
  'scripts/charge/ceiling.js',
  'scripts/charge/suggestion.js',
  'scripts/charge/trace.js'
].forEach(file => vm.runInNewContext(read(file), ctx, { filename: file }));

let checks = 0, failed = 0;
function assert(cond, msg){
  checks++;
  if(!cond){ failed++; console.error(' ✗ ' + msg); }
}

const T = ctx.window.CoachChargeTrace;
assert(!!T && typeof T.movement === 'function', 'CoachChargeTrace.movement existe.');
assert(typeof T.day === 'function' && typeof T.report === 'function' && typeof T.text === 'function',
  'La porte publique expose movement/day/report/text.');

function ctxFor(note, format, load){
  return ctx.coachBuildMovementContext('Pause Back Squat', {kind:'main', blockTitle:'A. Pause Back Squat', format:format, note:note, load:load});
}
function row(date, load, reps, rpe, c, extra){
  return Object.assign({date:date, load:load, reps:reps, rpe:rpe, status:'success',
    context:{label:c.label, equipment:c.equipment, intents:c.intents, primaryIntent:c.primaryIntent}}, extra||{});
}
const normalCtx = ctxFor('Pause 2 sec au fond, remontee explosive.', '5x3', '165-175 lb');
const techCtx   = ctxFor('Travail technique, barre legere.', '5x3', '135 lb');

// ─── 1. Une trace normale : tout compte, et elle le dit ────────────────────
ctx.state.athleteState.movements['Pause Back Squat'] = {history:[
  row('2026-08-10',170,3,7,normalCtx), row('2026-08-17',170,3,7,normalCtx)
], ranges:{}};
let t = T.movement('Pause Back Squat', {context:normalCtx, targetReps:3, programLoad:'190-205 lb', note:'Pause 2 sec.', format:'5x3'});
assert(t.historique.lignesTracees === 2, 'La trace liste les seances stockees.');
assert(t.historique.retenues === 2, 'Deux seances de meme nature comptent toutes les deux.');
assert(t.historique.ecartees === 0, 'Aucune seance ecartee sans raison.');
assert(t.programme.chargeEcrite === '190-205 lb', 'La trace donne la charge ECRITE dans le programme.');
assert(t.programme.chargeLue === 190, 'Et le nombre que le moteur en lit (le bas de la plage).');
assert(t.suggestion && t.suggestion.propose !== null, 'La trace porte la suggestion du jour.');
assert(!!t.suggestion.raison, 'Avec la raison affichee par le bouton (!).');
assert(t.contexteDuJour.limite === false, 'La trace dit si le contexte du jour est limite.');

// ─── 2. Le cas qui a motive ce fichier ─────────────────────────────────────
// Les seances sont bien dans l'historique, mais leur contexte n'a pas la meme
// NATURE que celui du jour. Le filtre les ecartait TOUTES : un mouvement
// pouvait se retrouver a 0 ligne retenue alors que sept etaient stockees, et
// le moteur repartait de zero un jour de deload. Elles sont desormais admises
// A POIDS REDUIT — mieux que d'etre aveugle, moins bien qu'une reference
// propre — et la trace doit dire les deux : qu'elles comptent, et pourquoi
// elles comptent moins.
t = T.movement('Pause Back Squat', {context:techCtx, targetReps:3, programLoad:'135 lb', note:'Travail technique.', format:'5x3'});
assert(t.contexteDuJour.limite === true, 'Un contexte technique est signale comme limite.');
assert(t.historique.retenues === 2,
  'Une seance de nature differente est admise plutot qu\'ecartee (obtenu ' + t.historique.retenues + '/2).');
assert(t.historique.ecartees === 0, 'Plus aucune seance n\'est perdue pour cause de nature de contexte.');
assert(t.historique.poidsCumule < 2,
  'Mais elle ne pese pas une seance pleine : poids cumule ' + t.historique.poidsCumule + ' pour 2 lignes.');
assert(t.historique.lignes.every(l => l.poids < 1),
  'Chaque ligne porte son poids reel, pas un booleen.');
const motifs = t.historique.lignes.map(l => l.pourquoiPoidsReduit).filter(Boolean);
assert(motifs.length === 2, 'Chaque ligne admise a poids reduit porte son explication.');
assert(/Nature de contexte differente/.test(motifs[0]), 'Le motif nomme la nature de contexte : ' + motifs[0]);
assert(/limitee/.test(motifs[0]) && /normale/.test(motifs[0]),
  'Le motif dit laquelle des deux est limitee — sans ca, il n\'aide personne.');
// Et le moteur le DIT dans sa raison : une suggestion assise sur des seances
// d'un autre contexte n'est pas une capacite mesuree.
assert(/poids reduit/.test(String(t.suggestion.raison)),
  'La suggestion annonce qu\'elle travaille sur un historique pondere.');

// ─── 3. Les autres motifs sont distingues ──────────────────────────────────
ctx.state.athleteState.movements['Pause Back Squat'] = {history:[
  row('2026-08-10',170,3,7,normalCtx),
  row('2026-08-12',225,1,9,normalCtx,{planned:{source:'manual_pr'}}),
  row('2026-08-14',170,3,7,normalCtx,{implausible:true}),
  row('2026-08-17',175,3,7,normalCtx)
], ranges:{}};
t = T.movement('Pause Back Squat', {context:normalCtx, targetReps:3, programLoad:'190-205 lb'});
assert(t.historique.retenues === 2, 'Seed manuel et ligne invraisemblable sont ecartes, les vraies seances restent.');
const textes = t.historique.lignes.map(l => l.pourquoiEcartee).filter(Boolean);
assert(textes.some(x => /Seed manuel/.test(x)), 'Un PR saisi a la main est nomme comme seed, pas comme seance.');
assert(textes.some(x => /invraisemblable/.test(x)), 'Une ligne marquee invraisemblable est nommee comme telle.');
assert(t.historique.lignes.some(l => l.source === 'manual_pr'), 'La source de la ligne est reportee telle quelle.');

// ─── 4. Reconstitution ─────────────────────────────────────────────────────
const avecReplay = t.historique.lignes.filter(l => l.reconstitutionAvantCetteSeance);
assert(avecReplay.length === t.historique.lignes.length, 'Chaque ligne porte sa reconstitution.');
assert(avecReplay.some(l => l.reconstitutionAvantCetteSeance.propose !== null),
  'La reconstitution donne un nombre, pas seulement une raison.');
assert(avecReplay.every(l => typeof l.reconstitutionAvantCetteSeance.raison === 'string'),
  'La reconstitution porte la raison du moteur de l\'epoque.');

// ─── 5. Lecture seule, sans exception ──────────────────────────────────────
const mv = ctx.state.athleteState.movements['Pause Back Squat'];
const avant = JSON.stringify(mv.history);
ctx.window.__coachLoadHints = {marqueur:'intact'};
T.movement('Pause Back Squat', {context:normalCtx, targetReps:3, programLoad:'190-205 lb'});
assert(JSON.stringify(mv.history) === avant, 'L\'historique est rendu intact apres la trace.');
assert(mv.history.length === 4, 'Aucune ligne perdue par la reconstitution.');
assert(ctx.window.__coachLoadHints && ctx.window.__coachLoadHints.marqueur === 'intact',
  'Les indices du panneau (!) preexistants survivent a la trace.');
// Ce qui compte vraiment : le (!) doit montrer la VRAIE suggestion, jamais
// celle d'une reconstitution faite sur un historique tronque.
const traceFinale = T.movement('Pause Back Squat', {context:normalCtx, targetReps:3, programLoad:'190-205 lb'});
const cle = ctx.coachNormalizeMoveText('Pause Back Squat');
const indice = ctx.window.__coachLoadHints[cle];
assert(!!indice, 'La trace laisse un indice (!) pour le mouvement.');
assert(indice && indice.load === traceFinale.suggestion.texte,
  'L\'indice (!) porte la suggestion reelle, pas celle d\'une reconstitution ('
  + (indice && indice.load) + ' vs ' + traceFinale.suggestion.texte + ').');

// Cas limite qui justifie la restauration : si la suggestion finale leve, les
// reconstitutions ne doivent PAS laisser leur charge dans le panneau (!) — le
// (!) montrerait alors une charge calculee sur un historique tronque.
{
  const vrai = ctx.guardedSuggestedLoadDecision;
  const lignes = mv.history.length;
  let appels = 0;
  ctx.guardedSuggestedLoadDecision = function(){
    appels++;
    if(appels > lignes) throw new Error('panne simulee de la suggestion finale');
    return vrai.apply(null, arguments);
  };
  ctx.window.__coachLoadHints = {marqueur:'intact'};
  const casLimite = T.movement('Pause Back Squat', {context:normalCtx, targetReps:3, programLoad:'190-205 lb'});
  ctx.guardedSuggestedLoadDecision = vrai;
  assert(casLimite.suggestion && /impossible/.test(casLimite.suggestion.raison),
    'Une panne de la suggestion est rapportee dans la trace, pas avalee.');
  assert(Object.keys(ctx.window.__coachLoadHints).join(',') === 'marqueur',
    'Meme si la suggestion finale leve, aucune reconstitution ne reste dans le panneau (!) : '
    + Object.keys(ctx.window.__coachLoadHints).join(','));
}

// ─── 6. Rapport complet ────────────────────────────────────────────────────
const report = T.report('day');
assert(report.type === 'racine_charge_trace', 'Le rapport porte un type identifiable.');
assert(Array.isArray(report.mouvements) && report.mouvements.length >= 1, 'Le rapport liste les mouvements de la seance.');
assert(Array.isArray(report.resume) && report.resume.length === report.mouvements.length,
  'Une ligne de resume par mouvement, lisible sans deplier le JSON.');
assert(/retenu/.test(report.resume[0]), 'Le resume dit combien de seances ont compte : ' + report.resume[0]);
assert(!!report.note && /reconstitution/i.test(report.note),
  'Le rapport dit lui-meme que la reconstitution n\'est pas un enregistrement.');
assert(typeof T.text(report) === 'string' && T.text(report).indexOf('racine_charge_trace') === 0,
  'La sortie texte est copiable telle quelle.');
assert(JSON.stringify(report).length > 200, 'Le rapport n\'est pas vide.');

// ─── 7. Portee cycle : le chemin complet, sans payer dix fois le meme rejeu ──
// Un mouvement revient a chaque semaine ou il est programme. Son historique ne
// change pas — le rejouer a chaque fois couterait N fois le prix pour N fois le
// meme resultat. Mais son CONTEXTE change d'une semaine a l'autre, et c'est
// justement ce qu'une trace de cycle doit montrer.
{
  const cycle = T.report('cycle');
  assert(cycle.portee === 'cycle', 'Le rapport porte sa portee.');
  assert(cycle.semainesTracees === 3, 'Toutes les semaines du programme sont parcourues (' + cycle.semainesTracees + ').');
  assert(cycle.mouvements.length === 6, 'Chaque seance du cycle donne une entree (3 semaines x 2 jours) : ' + cycle.mouvements.length + '.');

  const squats = cycle.mouvements.filter(m => m.mouvement === 'Pause Back Squat');
  assert(squats.length === 3, 'Le mouvement principal apparait une fois par semaine.');
  assert(cycle.mouvements.some(m => m.mouvement === 'Weighted Pull-up'),
    'Le balayage ne s\'arrete pas au premier jour du cycle.');

  // La reconstitution n'est payee qu'une fois par mouvement.
  const avecRejeu = squats.filter(m => m.historique.lignes.some(l => l.reconstitutionAvantCetteSeance));
  assert(avecRejeu.length === 1, 'La reconstitution est faite une seule fois par mouvement (' + avecRejeu.length + ').');

  // Tout le reste, lui, est bien present sur CHAQUE occurrence : c'est ce qui
  // permet de voir ou une etiquette bascule d'une semaine a l'autre.
  assert(squats.every(m => m.contexteDuJour && typeof m.contexteDuJour.limite === 'boolean'),
    'Chaque occurrence porte le contexte de SA semaine.');
  assert(squats.every(m => m.suggestion && m.programme),
    'Chaque occurrence porte sa suggestion et sa charge prescrite.');
  assert(squats.every(m => m.historique.lignesTracees === squats[0].historique.lignesTracees),
    'L\'historique reste complet sur chaque occurrence.');
  assert(cycle.resume.length === cycle.mouvements.length, 'Une ligne de resume par occurrence.');

  // La portee semaine ne regarde toujours qu'une semaine.
  const semaine = T.report('week');
  assert(semaine.mouvements.length === 2, 'La portee semaine reste limitee a la semaine en cours.');
  assert(!semaine.semainesTracees, 'Seule la portee cycle annonce un nombre de semaines.');
}

if(failed){
  console.error('\nÉCHEC charge_trace_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK charge_trace_checks.js — ' + checks + ' controles.');

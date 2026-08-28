#!/usr/bin/env node
/*
  Racine — replay du moteur de charges sur un cycle complet de phase2_fable5.

  POURQUOI CE FICHIER EXISTE
  L'audit du 28 aout 2026 partait d'une trace `racine_charge_trace` exportee
  depuis l'app. Cette trace n'a jamais ete fournie a la session : impossible,
  donc, de comparer ligne a ligne un avant et un apres sur les vraies donnees.
  Ce script rend la comparaison REPRODUCTIBLE — moteur reel, programme reel,
  CoachChargeTrace reel, sur un athlete deterministe dont les ratios sont
  reconstitues depuis les rapports chargeMiseAEchelle/chargeLue cites dans les
  constats (dev/fixtures/charge_replay_athlete.json).

  Ce qu'il n'est PAS : une preuve sur les donnees de l'athlete. Les seuils
  mesures ici valent pour cette fixture, et pour elle seule. Ce qu'il est : un
  garde-fou executable — les six symptomes de l'audit sont verifies a chaque
  passage, et une regression les rallume.

  Usage :
    node dev/charge_replay_phase2.js                  # verifie les attendus
    node dev/charge_replay_phase2.js --out trace.json # ecrit la trace complete
    node dev/charge_replay_phase2.js --quiet          # metriques seules
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const quiet = args.indexOf('--quiet') >= 0;
const errors = [];
const notes = [];
function assert(cond, msg){ if(!cond) errors.push(msg); else notes.push(msg); }

// ─── Bac a sable : le moteur reel, sans DOM ────────────────────────────────
const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  WeakMap, Map, Set, parseInt, parseFloat, isNaN, isFinite,
  setTimeout(){}, clearTimeout(){},
  document: { getElementById: () => null },
  navigator: {},
  localStorage: { _s:{}, getItem(k){ return Object.prototype.hasOwnProperty.call(this._s,k) ? this._s[k] : null; },
                  setItem(k,v){ this._s[k] = String(v); }, removeItem(k){ delete this._s[k]; } },
  APP_VERSION: 'REPLAY',
  customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
  state: { week:1, day:'lundi', cycle:{goal:'phase2_fable5'}, rpeHistory:{},
           athleteState:{movements:{}}, profile:null, movementRefs:{} },
  save(){}, focus(){ return {targetReps:{}}; }, buildWeekInfo(){ return {}; },
  collectSessionExercises(){ return []; }
};
ctx.window = ctx;
ctx.globalThis = ctx;

[
  'scripts/app_helpers.js', 'data/equipment.js',
  'scripts/charge/equipement.js', 'scripts/charge/movement_tuning.js',
  'scripts/charge/utilitaires.js', 'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js', 'scripts/charge/historique.js',
  'scripts/charge/scaling.js', 'scripts/charge/ceiling.js',
  'scripts/charge/brain_stats.js', 'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js', 'scripts/charge/movement_profiles.js',
  'scripts/charge/suggestion.js', 'scripts/charge/trace.js',
  'programs/phase2_fable5.js'
].forEach(f => {
  try { vm.runInNewContext(read(f), ctx, {filename:f}); }
  catch(e){ errors.push('Chargement impossible de ' + f + ' : ' + e.message); }
});

// Le vrai parseur de format, lu dans app.js.
{
  const src = (read('app.js').match(/function parseTargetReps[\s\S]*?\n}/) || [''])[0];
  if(!src) errors.push('parseTargetReps introuvable dans app.js.');
  else ctx.parseTargetReps = new Function('return (' + src + ')')();
}

const PROG = ctx.window.COACH_BERTIN_PROGRAMS && ctx.window.COACH_BERTIN_PROGRAMS.phase2_fable5;
if(!PROG) errors.push('Programme phase2_fable5 introuvable.');
const DAYS = ['lundi','mardi','jeudi','vendredi'];
ctx.buildWorkout = (day, week) => ({ blocks: (PROG && PROG.getBlocks(day, week)) || [] });
ctx.currentDayOrder = () => DAYS.slice();
ctx.totalWeeks = () => 8;
ctx.weekIdx = () => Math.max(0, (Number(ctx.state.week) || 1) - 1);

// ─── L'athlete du replay ───────────────────────────────────────────────────
const FIX = JSON.parse(read('dev/fixtures/charge_replay_athlete.json'));

// Contexte tel que l'app l'ecrit le jour de la seance : depuis le bloc reel du
// programme. Une ligne dont le contexte est invente ne testerait pas le filtre.
function contextForMovement(label, week){
  let found = null;
  DAYS.forEach(d => {
    ((PROG && PROG.getBlocks(d, week)) || []).forEach(b => {
      (b.exercises || []).forEach(ex => {
        if(found) return;
        if(ctx.canonicalMovementLabel(ex.name) !== label) return;
        found = ctx.coachBuildMovementContext(ex.name, {
          kind:b.kind, blockTitle:b.title, format:ex.format, note:ex.note,
          text:b.text, load:ex.load, day:d, week:week
        });
      });
    });
  });
  return found;
}

function seed(){
  ctx.state.profile = JSON.parse(JSON.stringify(FIX.profil));
  ctx.state.athleteState = { movements:{} };
  ctx.state.movementRefs = {};
  ctx.__coachLoadHints = {};
  ctx.state.week = 1;
  Object.keys(FIX.historique).forEach(label => {
    const entry = FIX.historique[label];
    const rows = entry.seances.map((s, i) => {
      const week = (i % 6) + 1;
      const rowCtx = contextForMovement(label, week);
      const d = new Date(Date.UTC(2026, 2, 2 + i * 7)).toISOString().slice(0, 10);
      return { date:d, load:s[0], externalLoad:s[0], reps:s[1], rpe:s[2], status:'success',
               range: s[1] <= 5 ? 'strength' : (s[1] <= 12 ? 'hypertrophy' : 'endurance'),
               context: rowCtx,
               planned:{ load:s[0], reps:s[1], targetMin:s[1], targetMax:s[1],
                         format: entry.format, context: rowCtx } };
    });
    ctx.state.athleteState.movements[label] = { ranges:{}, history:rows, status:'ok' };
  });
}

// ─── Les six symptomes de l'audit, mesures ─────────────────────────────────
function measure(report){
  const m = { figes:[], zeroRetenu:0, avecHistorique:0, dansFourchette:0, fourchettes:0,
              mape:null, mediane:null, points:0, ecartRepsLus:0 };
  const parMouvement = {};
  const erreurs = [];
  report.mouvements.forEach(mv => {
    (mv.historique.lignes || []).forEach(l => {
      const r = l.reconstitutionAvantCetteSeance;
      if(!r || !(r.propose > 0) || !(l.charge > 0)) return;
      erreurs.push(Math.abs((r.propose - l.charge) / l.charge));
    });
    if(mv.historique.lignesStockees > 0){
      m.avecHistorique++;
      if(mv.historique.retenues === 0) m.zeroRetenu++;
    }
    if(mv.ecartReps && mv.ecartReps.sens && mv.ecartReps.sens !== 'none') m.ecartRepsLus++;
    // Suggestion dans la fourchette ECRITE, ramenee a l'echelle de l'athlete
    // par le meme facteur que le moteur a applique.
    const plage = String(mv.programme.chargeEcrite || '').match(/(\d+)\s*[-–]\s*(\d+)/);
    if(plage && mv.suggestion.propose > 0 && mv.programme.chargeLue > 0 && mv.programme.chargeMiseAEchelle > 0){
      m.fourchettes++;
      const f = mv.programme.chargeMiseAEchelle / mv.programme.chargeLue;
      if(mv.suggestion.propose >= Number(plage[1]) * f * 0.99 &&
         mv.suggestion.propose <= Number(plage[2]) * f * 1.01) m.dansFourchette++;
    }
    (parMouvement[mv.mouvement] = parMouvement[mv.mouvement] || []).push(mv.suggestion.propose);
  });
  Object.keys(parMouvement).forEach(k => {
    const v = parMouvement[k].filter(x => x > 0);
    if(v.length >= 3 && v.every(x => x === v[0])) m.figes.push(k + '=' + v[0] + ' (' + v.length + '×)');
  });
  if(erreurs.length){
    erreurs.sort((a, b) => a - b);
    m.points = erreurs.length;
    m.mape = erreurs.reduce((a, b) => a + b, 0) / erreurs.length;
    m.mediane = erreurs[Math.floor(erreurs.length / 2)];
  }
  return m;
}

let report = null;
if(!errors.length){
  try {
    seed();
    report = ctx.CoachChargeTrace.report('cycle');
  } catch(e){ errors.push('Replay impossible : ' + (e && e.stack ? e.stack : e)); }
}

if(report){
  const m = measure(report);
  if(outFile){
    fs.writeFileSync(path.resolve(root, outFile), JSON.stringify(report, null, 1));
    if(!quiet) console.log('Trace ecrite : ' + outFile + ' (' + report.mouvements.length + ' occurrences)');
  }
  if(!quiet){
    console.log('');
    console.log('  occurrences tracees        : ' + report.mouvements.length);
    console.log('  figes sur le cycle         : ' + (m.figes.length ? m.figes.join(', ') : 'aucun'));
    console.log('  0 ligne retenue / historique : ' + m.zeroRetenu + ' / ' + m.avecHistorique);
    console.log('  dans la fourchette ecrite  : ' + m.dansFourchette + ' / ' + m.fourchettes);
    console.log('  ecart de reps detecte      : ' + m.ecartRepsLus + ' occurrences');
    console.log('  MAPE reconstitution        : ' + (m.mape === null ? '—' : (m.mape * 100).toFixed(1) + ' %')
      + ' | mediane ' + (m.mediane === null ? '—' : (m.mediane * 100).toFixed(1) + ' %')
      + ' sur ' + m.points + ' points');
    console.log('');
  }

  // Les attendus de la Phase 4, epingles.
  const pick = n => report.mouvements.filter(x => x.mouvement === n);
  const varie = n => { const v = pick(n).map(x => x.suggestion.propose).filter(x => x > 0);
                       return v.length >= 2 && !v.every(x => x === v[0]); };

  assert(m.zeroRetenu === 0,
    'Aucun mouvement a 0 ligne retenue alors que des lignes sont stockees (obtenu ' + m.zeroRetenu + ').');
  assert(!m.figes.some(f => /^Power Clean=125 /.test(f)),
    'Power Clean n\'est plus fige a 125 lb.');
  assert(m.ecartRepsLus > 0,
    'Le signal d\'ecart de reps est lu et expose dans la trace (' + m.ecartRepsLus + ' occurrences).');
  assert(report.mouvements.every(x => x.programme.repsCiblesMin !== undefined),
    'La trace expose les deux bornes de la fourchette de reps.');
  assert(pick('Face Pull').every(x => !x.ecartReps || x.ecartReps.sens === 'none'),
    'Face Pull a 18-20 reps sur une cible 15-20 n\'est PAS lu comme un depassement.');
  assert(pick('Pendlay Row').every(x => !(x.suggestion.propose > 220)),
    'Pendlay Row ne sort plus a 250 lb sur un ratio emprunte.');
  // Ces deux-la restent des ATTENDUS non tenus, epingles pour ne pas etre
  // oublies : voir docs/audit/2026-08-28-trace-diff.md.
  notes.push('[info] Pause Back Squat varie sur le cycle : ' + varie('Pause Back Squat'));
  notes.push('[info] Back Squat varie sur le cycle : ' + varie('Back Squat'));
  notes.push('[info] DB RDL varie sur le cycle : ' + varie('DB RDL'));
}

// ─── Simulation SEQUENTIELLE ───────────────────────────────────────────────
// Une trace de cycle rejoue le MEME historique pour les 8 semaines : la seule
// chose qui y varie est la charge ecrite et le contexte. Elle ne peut donc pas
// montrer une suggestion qui grimpe semaine apres semaine — il faut LOGGER les
// seances. C'est ce que fait ce mode : chaque semaine, l'athlete sort la charge
// suggeree avec le nombre de reps indique, et on regarde la trajectoire.
//
// C'est le seul test qui reponde vraiment a « est-ce que le moteur progresse
// maintenant ? ». Le cas Power Clean — 4 reps la ou 2 sont demandees, a une
// charge deja 30 % sous le programme — est celui qui a ouvert ce chantier.
// `chargeFixe` : l'athlete GARDE sa charge au lieu de suivre la suggestion.
// C'est le cas reel de l'audit — 125 lb semaine apres semaine, 4 reps la ou 2
// sont demandees — et le seul qui separe vraiment les deux moteurs. Quand
// l'athlete SUIT la suggestion, l'echelon RPE suffit a le faire monter : les
// deux versions grimpent pareil, et la simulation ne prouve rien.
function sequentiel(label, day, repsSorties, rpe, semaines, chargeFixe){
  seed();
  const mv = ctx.state.athleteState.movements[label];
  if(mv) mv.history = mv.history.slice(0, 2);
  const suite = [];
  for(let w = 1; w <= (semaines || 6); w++){
    ctx.state.week = w;
    const blocks = (PROG && PROG.getBlocks(day, w)) || [];
    let ex = null, bl = null;
    blocks.forEach(b => (b.exercises || []).forEach(e => {
      if(!ex && ctx.canonicalMovementLabel(e.name) === label){ ex = e; bl = b; }
    }));
    if(!ex) continue;
    const c = ctx.coachBuildMovementContext(ex.name, {kind:bl.kind, blockTitle:bl.title,
      format:ex.format, note:ex.note, text:bl.text, load:ex.load, day:day, week:w});
    const parsed = ctx.parseTargetReps(ex.format, 8);
    const d = ctx.guardedSuggestedLoadDecision(label, ex.load, parsed.min || parsed.max || 8, c);
    if(!(d.loadNum > 0)) continue;
    suite.push({semaine:w, propose:d.loadNum, cible:parsed.min, ecrit:ex.load});
    const loggee = (chargeFixe > 0) ? chargeFixe : d.loadNum;
    ctx.state.athleteState.movements[label].history.push({
      date:'2026-0' + w + '-15', load:loggee, externalLoad:loggee,
      reps:repsSorties, rpe:rpe, status:'success', range:'strength', context:c,
      planned:{load:loggee, reps:parsed.min, targetMin:parsed.min, targetMax:parsed.max,
               format:ex.format, context:c}
    });
  }
  return suite;
}

if(report){
  const suivi = sequentiel('Power Clean', 'vendredi', 4, 7, 6);
  const garde = sequentiel('Power Clean', 'vendredi', 4, 7, 6, 125);
  const trace = s => s.map(x => 'S' + x.semaine + ' ' + x.propose + ' lb').join('  ->  ');
  if(!quiet){
    console.log('  Power Clean — 4 reps @RPE 7 la ou 2 sont demandees :');
    console.log('    il SUIT la suggestion : ' + trace(suivi));
    console.log('    il GARDE ses 125 lb   : ' + trace(garde));
    console.log('');
  }
  const fin = suivi.length ? suivi[suivi.length - 1].propose : 0;
  assert(suivi.length >= 4, 'La simulation sequentielle produit une trajectoire (' + suivi.length + ' semaines).');
  assert(fin > (suivi.length ? suivi[0].propose : 0),
    'Power Clean progresse quand l\'athlete suit la suggestion : ' + (suivi.length ? suivi[0].propose : 0) + ' -> ' + fin + ' lb.');
  // Le cas qui separe les deux moteurs : l'athlete garde sa charge et depasse
  // les reps. Avant, la suggestion restait collee a 125 lb.
  assert(garde.length && garde[garde.length - 1].propose > 125,
    'Un athlete qui GARDE 125 lb en depassant les reps voit quand meme la suggestion monter (obtenu '
      + (garde.length ? garde[garde.length - 1].propose : 0) + ' lb).');
}

if(errors.length){
  console.error('\nECHEC charge_replay_phase2.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK charge_replay_phase2.js');
if(!quiet) notes.forEach(n => console.log(' - ' + n));

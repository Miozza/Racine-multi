#!/usr/bin/env node
/*
  Racine — verrouille le comportement « moteur de charge pour mouvement neuf ».

  Regressions couvertes :
    1. Un PR 1RM (manual_pr) n'influence JAMAIS la charge de travail proposee.
    2. Avec une reference de travail de plage, le seed part SOUS le RM en
       semaine 1 (reps en reserve) au lieu de viser ~100% (ou pire, projeter
       le 1RM via Epley).
    3. La rampe monte semaine apres semaine sur le cycle (surcharge planifiee).

  Usage : node dev/reference_seed_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = r => fs.readFileSync(path.join(root, r), 'utf8');
const errors = [];
function assert(cond, msg){ if(!cond){ errors.push(msg); console.log('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); } }

function buildCtx(week, totalWeeks){
  const c = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout(f){ if(typeof f === 'function') f(); }, clearTimeout(){},
    document: { getElementById(){ return null; } }, navigator: {},
    localStorage: { _s:{}, getItem(k){ return this._s[k] || null; }, setItem(k,v){ this._s[k] = String(v); }, removeItem(k){ delete this._s[k]; } },
    APP_VERSION: 'TEST', customCharges: {}, CHARGE_ORDER: [],
    state: { week: week, day: 'lundi', profile: null, rpeHistory: {}, athleteState: { movements: {} }, history: [], movementRefs: {} },
    save(){},
    focus(){ return { label:'t', targetReps:{0:8}, weekLabels: new Array(totalWeeks).fill('w') }; },
    buildWeekInfo(){ return {}; }, collectSessionExercises(){ return []; },
    parseTargetReps(f, fb){ return { min: fb||8, max: fb||8 }; }
  };
  c.window = c; c.globalThis = c;
  [
    'scripts/profiles/reference.js','programs/config.js','data/charges.js','data/equipment.js',
    'scripts/profiles/onboarding.js','scripts/app_helpers.js','scripts/charge/equipement.js',
    'scripts/charge/utilitaires.js','scripts/charge/mouvements.js','scripts/charge/rpe.js',
    'scripts/charge/historique.js','scripts/charge/scaling.js','scripts/charge/brain_stats.js',
    'scripts/charge/brain_memory.js','scripts/charge/brain_journal.js','scripts/charge/suggestion.js'
  ].forEach(f => vm.runInNewContext(read(f), c, { filename: f }));
  // Blocs verbatim d'app.js, extraits par ancre de nom (robuste aux edits).
  const src = read('app.js');
  const grab = (re, tag) => { const m = src.match(re); if(!m) throw new Error('extract '+tag+' introuvable'); return m[0]; };
  vm.runInNewContext(grab(/var PR_FIELD_MAP = \{[\s\S]*?\n\};/, 'PR_FIELD_MAP'), c, { filename: 'PR_FIELD_MAP' });
  vm.runInNewContext(grab(/function totalWeeks\(\)\{[\s\S]*?\n\}/, 'totalWeeks'), c, { filename: 'totalWeeks' });
  vm.runInNewContext('function weekIdx(){var tw=Math.max(1,totalWeeks());return Math.max(0,Math.min(tw-1,state.week-1));}', c, { filename: 'weekIdx' });
  vm.runInNewContext(grab(/function updateMovementRefFromPR[\s\S]*?(?=\nfunction normalizePrCompareName)/, 'updatePR'), c, { filename: 'updatePR' });
  // Profil calibre type (avance), bench 1RM 300.
  const vals = { bench:300, frontSquat:265, strictPress:185, powerClean:205, backSquat5RM:270, hipThrust8RM:315, bulgarianDb:55, dbRdl:75, row8RM:185, chestRow8RM:135, latPulldown10RM:45, inclineDb10RM:70 };
  c.state.profile = Object.assign({ name:'T', onboarded:true, aggressiveness:1 }, vals);
  c.state.profile.scaleRatios = c.CoachOnboarding.ratiosFromValues(vals, 'avance');
  c.CoachProfiles = { getActive(){ return { onboarded:true, scaleRatios:c.state.profile.scaleRatios }; } };
  return c;
}
function benchCfg(c){ return c.PR_FIELD_MAP.prBench; }
function addPr(c, load){ const cfg = benchCfg(c); c.updateMovementRefFromPR(cfg, load, '2024-01-01'); c.updateAthleteStateFromPR(cfg, load, '2024-01-01'); }
function addWorkingRef(c, load, reps){ const cfg = Object.assign({}, benchCfg(c), { reps: reps, range: c.repRange(reps) }); c.updateMovementRefFromPR(cfg, load, '2024-06-01', 8); c.updateAthleteStateFromPR(cfg, load, '2024-06-01', 8); }
function bench(c){ return c.guardedSuggestedLoadDecision('Bench Press', '215 lb', 8, { kind:'main', blockTitle:'A. Bench Press', week:c.state.week, day:'lundi' }).loadNum; }

console.log('\n════ Reference seed & PR decoupling ════\n');

// 1. PR 1RM seul ne doit PAS piloter la charge de travail (pas de projection Epley).
(function(){
  const c = buildCtx(1, 6);
  const noData = bench(c);
  addPr(c, 300);
  const withPr = bench(c);
  const reason = c.guardedSuggestedLoadDecision('Bench Press','215 lb',8,{kind:'main',week:1,day:'lundi'}).reason || '';
  assert(withPr === noData, 'PR 300 saisi ne change pas la suggestion (' + noData + ' -> ' + withPr + ' lb)');
  assert(!/epley|ecart de reps/i.test(reason), 'La suggestion ne vient pas d\'une projection Epley du 1RM');
  // Sans reference de travail, le PR-seul retombe sur le defaut programme
  // (repli priorite 3), jamais sur une projection du 1RM.
  assert(/programme/i.test(reason), 'PR-seul : repli sur le defaut programme, pas une projection du record');
})();

// 2. Reference de travail 215x8 -> seed SOUS le RM en semaine 1.
(function(){
  const c = buildCtx(1, 6);
  addWorkingRef(c, 265, 5); addWorkingRef(c, 215, 8); addWorkingRef(c, 185, 15);
  const s1 = bench(c);
  assert(s1 < 215, 'Semaine 1 part sous le RM de plage 215 (' + s1 + ' lb)');
  assert(s1 >= 190 && s1 <= 210, 'Semaine 1 ~90-98% du RM (attendu ~200, obtenu ' + s1 + ' lb)');
})();

// 3. PR + references : le PR reste ignore, la reference pilote.
(function(){
  const c = buildCtx(1, 6);
  addPr(c, 300);
  addWorkingRef(c, 265, 5); addWorkingRef(c, 215, 8); addWorkingRef(c, 185, 15);
  const s1 = bench(c);
  assert(s1 >= 190 && s1 <= 210, 'Avec PR 300 + refs, semaine 1 pilotee par la reference (~200, obtenu ' + s1 + ' lb)');
})();

// 3b. Reference d'ONBOARDING (movementRefs seul, pas d'athleteState) doit
//     aussi piloter le seed — sinon un nouveau client garde une charge trop
//     haute en semaine 1.
(function(){
  const c = buildCtx(1, 6);
  const cfg = Object.assign({}, benchCfg(c), { reps: 8, range: 'hypertrophy' });
  c.updateMovementRefFromPR(cfg, 215, '2024-06-01', 8); // ecrit movementRefs seulement
  const hasAthlete = !!(c.state.athleteState.movements['Bench press']);
  const s1 = bench(c);
  assert(!hasAthlete, 'Cas onboarding : reference dans movementRefs, rien dans athleteState');
  assert(s1 >= 190 && s1 <= 210, 'Reference onboarding (movementRefs) pilote le seed sous le RM (~200, obtenu ' + s1 + ' lb)');
})();

// 4. Rampe croissante sur le cycle (surcharge planifiee).
(function(){
  const loads = [];
  for(let w = 1; w <= 5; w++){
    const c = buildCtx(w, 6);
    addWorkingRef(c, 265, 5); addWorkingRef(c, 215, 8); addWorkingRef(c, 185, 15);
    loads.push(bench(c));
  }
  let monotone = true;
  for(let i = 1; i < loads.length; i++){ if(loads[i] < loads[i-1]) monotone = false; }
  assert(monotone, 'La rampe ne redescend jamais sur le cycle : ' + loads.join(' -> ') + ' lb');
  assert(loads[4] > loads[0], 'Derniere semaine de charge > semaine 1 (' + loads[0] + ' -> ' + loads[4] + ' lb)');
  assert(loads[4] <= 215 * 1.10, 'Pic de rampe borne (~<=105-110% du RM, obtenu ' + loads[4] + ' lb)');
})();

console.log('\n' + (errors.length ? ('✗ ' + errors.length + ' echec(s)') : '✓ tout vert') + '\n');
process.exit(errors.length ? 1 : 0);

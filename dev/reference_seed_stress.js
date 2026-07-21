#!/usr/bin/env node
/*
  Racine — STRESS TEST multi-clients du seed via reference de travail.
  Passe de NOMBREUX profils differents (faible->fort x niveau x agressivite)
  a travers le VRAI moteur (guardedSuggestedLoadDecision) sur des mouvements
  NEUFS (aucun historique reel), et verifie des invariants physiologiques :

    I1. Avec une reference de travail RM, la semaine 1 est SOUS le RM (<= RM)
        et pas absurdement basse (>= 78% du RM).
    I2. La derniere semaine de charge est bornee (<= 112% du RM) et >= S1.
    I3. La rampe ne redescend jamais sur le cycle.
    I4. Un PR 1RM (manual_pr) ne change JAMAIS la suggestion vs sans PR.
    I5. Le seed proportionnel : jamais de valeur aberrante (0 < S1 < RM*1.3).

  Deux chemins de reference testes : grille (athleteState) et onboarding
  (movementRefs seul). Usage : node dev/reference_seed_stress.js [--verbose]
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const VERBOSE = process.argv.includes('--verbose');
const root = path.resolve(__dirname, '..');
const read = r => fs.readFileSync(path.join(root, r), 'utf8');

function buildCtx(week, totalWeeks){
  const c = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout(f){ if(typeof f==='function') f(); }, clearTimeout(){},
    document:{ getElementById(){ return null; } }, navigator:{},
    localStorage:{ _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } },
    APP_VERSION:'STRESS', customCharges:{}, CHARGE_ORDER:[], CoachLog:{ info(){}, warn(){} },
    state:{ week:week, day:'lundi', profile:null, rpeHistory:{}, athleteState:{ movements:{} }, history:[], movementRefs:{} },
    save(){}, focus(){ return { label:'t', targetReps:{0:8}, weekLabels:new Array(totalWeeks).fill('w') }; },
    buildWeekInfo(){ return {}; }, collectSessionExercises(){ return []; }, parseTargetReps(f,fb){ return { min:fb||8, max:fb||8 }; }
  };
  c.window = c; c.globalThis = c;
  [
    'scripts/profiles/reference.js','programs/config.js','data/charges.js','data/equipment.js',
    'scripts/profiles/onboarding.js','scripts/app_helpers.js','scripts/charge/equipement.js',
    'scripts/charge/utilitaires.js','scripts/charge/mouvements.js','scripts/charge/rpe.js',
    'scripts/charge/historique.js','scripts/charge/scaling.js','scripts/charge/brain_stats.js',
    'scripts/charge/brain_memory.js','scripts/charge/brain_journal.js','scripts/charge/suggestion.js'
  ].forEach(f => vm.runInNewContext(read(f), c, { filename:f }));
  const src = read('app.js');
  const grab = re => { const m = src.match(re); if(!m) throw new Error('miss'); return m[0]; };
  vm.runInNewContext(grab(/var PR_FIELD_MAP = \{[\s\S]*?\n\};/), c, { filename:'MAP' });
  vm.runInNewContext(grab(/function totalWeeks\(\)\{[\s\S]*?\n\}/), c, { filename:'tw' });
  vm.runInNewContext('function weekIdx(){var tw=Math.max(1,totalWeeks());return Math.max(0,Math.min(tw-1,state.week-1));}', c, { filename:'wi' });
  vm.runInNewContext(grab(/function updateMovementRefFromPR[\s\S]*?(?=\nfunction normalizePrCompareName)/), c, { filename:'pr' });
  return c;
}

// Profil calibre a partir d'un facteur de force (0.5 faible -> 1.4 tres fort).
function profileFor(c, sf, level){
  const base = { bench:245, frontSquat:265, strictPress:155, powerClean:205, backSquat5RM:270, hipThrust8RM:315, bulgarianDb:55, dbRdl:75, row8RM:155, chestRow8RM:135, latPulldown10RM:45, inclineDb10RM:50 };
  const vals = {}; Object.keys(base).forEach(k => { vals[k] = Math.round(base[k]*sf); });
  c.state.profile = Object.assign({ name:'S', onboarded:true, aggressiveness:1 }, vals);
  c.state.profile.scaleRatios = c.CoachOnboarding.ratiosFromValues(vals, level);
  c.CoachProfiles = { getActive(){ return { onboarded:true, scaleRatios:c.state.profile.scaleRatios }; } };
}

// Mouvements neufs testes : label, mvKey, charge programme (texte), RM de plage.
const MOVES = [
  { label:'Bench Press', mvKey:'bench',      prog:'215 lb', reps:8 },
  { label:'Back Squat',  mvKey:'backSquat',  prog:'225 lb', reps:8 },
  { label:'Hip Thrust',  mvKey:'hipThrust',  prog:'225 lb', reps:8 },
  { label:'Barbell Row', mvKey:'barbellRow', prog:'155 lb', reps:8 },
  { label:'Strict Press',mvKey:'strictPress',prog:'115 lb', reps:8 }
];

function seedWorkingRef(c, mvKey, label, load, reps, viaOnboarding){
  const cfg = { mvKey:mvKey, label:label, profile:null, reps:reps, range:c.repRange(reps) };
  c.updateMovementRefFromPR(cfg, load, '2024-06-01', 8);          // movementRefs (onboarding)
  if(!viaOnboarding) c.updateAthleteStateFromPR(cfg, load, '2024-06-01', 8); // + athleteState (grille)
}
function seedPr(c, mvKey, label, oneRM){
  const cfg = { mvKey:mvKey, label:label, profile:null, reps:1, range:'strength' };
  c.updateMovementRefFromPR(cfg, oneRM, '2024-01-01', 10);
  c.updateAthleteStateFromPR(cfg, oneRM, '2024-01-01', 10);
}
function suggest(sf, level, aggr, move, RM, opts){
  opts = opts || {};
  const c = buildCtx(opts.week||1, 6);
  profileFor(c, sf, level);
  c.state.profile.aggressiveness = aggr;
  if(opts.withRef) seedWorkingRef(c, move.mvKey, move.label, RM, move.reps, opts.viaOnboarding);
  if(opts.withPr)  seedPr(c, move.mvKey, move.label, opts.prLoad || Math.round(RM*1.45));
  return c.guardedSuggestedLoadDecision(move.label, move.prog, move.reps, { kind:'main', blockTitle:'A. '+move.label, week:opts.week||1, day:'lundi' });
}

const violations = [];
let cases = 0;
const SF = [0.55, 0.7, 0.85, 1.0, 1.15, 1.3];
const LEVELS = ['debutant','intermediaire','avance'];
const AGGR = [0.7, 1.0, 1.3];

SF.forEach(sf => LEVELS.forEach(level => AGGR.forEach(aggr => MOVES.forEach(move => {
  // RM de plage du client = sa propre force sur ce mouvement (mise a l'echelle).
  const RM = Math.round((move.mvKey==='hipThrust'?315: move.mvKey==='backSquat'?270: move.mvKey==='bench'?200: move.mvKey==='barbellRow'?155:130) * sf);
  if(RM < 45) return; // trop bas pour un mouvement charge, ignore
  cases++;
  const tag = `sf${sf} ${level} a${aggr} ${move.label} RM${RM}`;

  // --- grille (athleteState) + PR obsolete ---
  const loads = [];
  for(let w=1; w<=5; w++){
    const d = suggest(sf, level, aggr, move, RM, { withRef:true, withPr:true, prLoad:Math.round(RM*1.5), week:w });
    loads.push(d.loadNum);
  }
  const s1 = loads[0], sN = loads[4];
  // I1
  if(!(s1 <= RM))            violations.push(`I1 S1>${RM} : ${tag} -> S1 ${s1}`);
  if(!(s1 >= RM*0.78))       violations.push(`I1 S1 trop bas : ${tag} -> S1 ${s1} (<78% de ${RM})`);
  // I2
  if(!(sN <= RM*1.12))       violations.push(`I2 pic>${Math.round(RM*1.12)} : ${tag} -> S5 ${sN}`);
  if(!(sN >= s1))            violations.push(`I2 S5<S1 : ${tag} -> ${s1}->${sN}`);
  // I3
  for(let i=1;i<loads.length;i++) if(loads[i] < loads[i-1]) violations.push(`I3 rampe descend : ${tag} -> ${loads.join('/')}`);
  // I5
  if(!(s1 > 0 && s1 < RM*1.3)) violations.push(`I5 valeur aberrante : ${tag} -> S1 ${s1}`);

  // --- I4 : le PR ne change rien vs sans PR ---
  const noPr = suggest(sf, level, aggr, move, RM, { withRef:true, withPr:false, week:1 }).loadNum;
  const wiPr = suggest(sf, level, aggr, move, RM, { withRef:true, withPr:true, prLoad:Math.round(RM*1.6), week:1 }).loadNum;
  if(noPr !== wiPr) violations.push(`I4 PR change la suggestion : ${tag} -> sans ${noPr} vs avec ${wiPr}`);

  // --- chemin onboarding (movementRefs seul) : meme S1 attendu ---
  const onb = suggest(sf, level, aggr, move, RM, { withRef:true, viaOnboarding:true, week:1 }).loadNum;
  if(!(onb <= RM && onb >= RM*0.78)) violations.push(`ONB seed hors bande : ${tag} -> onboarding S1 ${onb}`);

  if(VERBOSE) console.log(`${tag}: ${loads.join(' -> ')} | onb ${onb} | noPr ${noPr}`);
}))));

console.log('\n════ STRESS TEST seed via reference — ' + cases + ' combinaisons client x mouvement ════');
console.log('   (' + SF.length + ' forces x ' + LEVELS.length + ' niveaux x ' + AGGR.length + ' agressivites x ' + MOVES.length + ' mouvements, rampe 5 semaines + chemins grille/onboarding/PR)\n');
if(violations.length){
  console.log('✗ ' + violations.length + ' violation(s) d\'invariant :');
  violations.slice(0, 40).forEach(v => console.log('  - ' + v));
  if(violations.length > 40) console.log('  ... (' + (violations.length-40) + ' de plus)');
  process.exit(1);
} else {
  console.log('✓ Tous les invariants tiennent sur les ' + cases + ' combinaisons.');
  console.log('  I1 S1 sous le RM (78-100%) · I2 pic borne · I3 rampe croissante · I4 PR ignore · I5 aucune aberration · onboarding OK');
  process.exit(0);
}

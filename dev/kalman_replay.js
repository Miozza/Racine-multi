#!/usr/bin/env node
/*
  Racine - rejeu d'un export : erreur du moteur vs capacite estimee (Kalman).

  Pour chaque ligne loggee ayant une charge suggeree (planned.load), on compare
  ce que l'athlete a REELLEMENT porte a :
    · moteur  : la charge que l'app avait suggeree ce jour-la ;
    · kalman  : loadFor(reps prescrites, RPE cible) depuis le seul journal
                ANTERIEUR a la seance (aucune fuite du futur) ;
    · melange : moteur + poids x (kalman - moteur), le mode blend avant les
                garde-fous.
  Erreur = |prediction - charge reelle| / charge reelle, en moyenne.
  Exclus : tests 1RM, deloads, seances techniques/legeres/WOD (le filtre de
  contexte de kalman.js, le meme que le moteur).

  Lecture seule. Rien n'est ecrit, ni dans le depot ni ailleurs.

  Usage :
    node dev/kalman_replay.js [export.json] [--profile NOM]
    (sans argument : dev/fixtures/kalman_strict_press.json)
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

const args = process.argv.slice(2);
const profIdx = args.indexOf('--profile');
const wantedProfile = profIdx >= 0 ? args[profIdx + 1] : null;
const file = args.filter((a, i) => a !== '--profile' && i !== profIdx + 1)[0]
  || path.join(__dirname, 'fixtures', 'kalman_strict_press.json');
const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

// Export mono-profil, multi-profils, etat brut ou liste de seances.
function profilesOf(x){
  if(Array.isArray(x)) return [{name: 'journal', state: {history: x}}];
  if(Array.isArray(x.profiles)) return x.profiles.map(p => ({name: (p.profile && p.profile.name) || p.name || '?', state: p.state || {}}));
  if(x.state) return [{name: (x.profile && x.profile.name) || 'profil', state: x.state}];
  if(Array.isArray(x.history)) return [{name: 'etat', state: x}];
  return [];
}

function makeContext(profileState){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp, parseInt, parseFloat, isNaN, isFinite,
    setTimeout(fn){ if(typeof fn === 'function') fn(); }, clearTimeout(){},
    document: { getElementById(){ return null; } }, navigator: {},
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    APP_VERSION: 'REPLAY', customCharges: {}, DEFAULT_CHARGES: {}, CHARGE_ORDER: [], movements: {},
    state: { week: 1, day: '', rpeHistory: {}, athleteState: {movements: {}},
      profile: (profileState && profileState.profile) || {onboarded: true}, history: [] },
    save(){}, focus(){ return {label: '', targetReps: {}}; }, buildWeekInfo(){ return {}; }, weekIdx(){ return 0; },
    collectSessionExercises(){ return []; }, nowIso(){ return ''; },
    parseTargetReps(f, fb){ const n = String(f||'').match(/\d+/g)||[]; if(!n.length) return {min:fb||8,max:fb||8}; const l = Number(n[n.length-1])||fb||8; return {min:l,max:l}; }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ['scripts/app_helpers.js', 'scripts/charge/equipement.js', 'scripts/charge/movement_tuning.js',
   'scripts/charge/utilitaires.js', 'scripts/charge/mouvements.js', 'scripts/charge/rpe.js',
   'scripts/charge/historique.js', 'scripts/charge/scaling.js', 'scripts/charge/brain_stats.js',
   'scripts/charge/kalman.js', 'scripts/charge/suggestion.js']
    .forEach(f => vm.runInNewContext(read(f), ctx, {filename: f}));
  return ctx;
}

const pct = v => (v === null || isNaN(v)) ? '  —  ' : (v * 100).toFixed(1).padStart(5) + ' %';
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

function replay(p){
  const ctx = makeContext(p.state);
  const K = ctx.CoachKalman;
  const sessions = (p.state.history || []).slice().filter(s => s && (s.actualDate || s.date))
    .sort((a, b) => String(a.actualDate || a.date).localeCompare(String(b.actualDate || b.date)));
  const rows = [], skipped = {};
  sessions.forEach(s => {
    const date = String(s.actualDate || s.date).slice(0, 10);
    const res = s.results || s.resultats || {};
    const before = K.buildFrom(sessions, {before: date});
    Object.keys(res).forEach(key => {
      const r = res[key] || {};
      const planned = r.planned || {};
      const pLoad = Number(ctx.parseLoad ? ctx.parseLoad(planned.load) : planned.load) || 0;
      const load = Number(ctx.parseLoad ? ctx.parseLoad(r.load) : r.load) || 0;
      if(!(pLoad > 0) || !(load > 0)) return;
      const audit = K.explainRow(key, r);
      if(!audit.retenue){ skipped[audit.raison] = (skipped[audit.raison] || 0) + 1; return; }
      const context = planned.context || null;
      if(K.isOneRmTestContext(context)){ skipped['test 1RM'] = (skipped['test 1RM'] || 0) + 1; return; }
      const label = ctx.movementLabelFromKeyOrName(key);
      const est = before.estimate(label, {asOf: date});
      if(!est || est.source !== 'history'){ skipped['sans etat anterieur'] = (skipped['sans etat anterieur'] || 0) + 1; return; }
      const reps = Number(planned.reps || planned.targetMin) || Number(r.reps) || 8;
      const T = ctx.COACH_MOVEMENT_TUNING.kalman;
      const kal = est.e1RM / (1 + (reps + Math.max(0, Math.min(T.maxRir, 10 - T.targetRpe))) / 30);
      const w = Math.max(0, Math.min(T.wMax, T.wMax * (1 - est.sd / T.sdMax))) * (est.n >= T.minObservations ? 1 : 0);
      const mix = pLoad + w * (kal - pLoad);
      rows.push({date, label, load, pLoad, kal, mix, deviated: Math.abs(load - pLoad) > 0.01,
        eM: Math.abs(pLoad - load) / load, eK: Math.abs(kal - load) / load, eB: Math.abs(mix - load) / load});
    });
  });

  console.log('\n=== ' + p.name + ' — ' + sessions.length + ' seance(s) ===');
  const last = sessions.length ? String(sessions[sessions.length - 1].actualDate || sessions[sessions.length - 1].date).slice(0, 10) : null;
  const sum = K.rebuild(sessions);
  Object.keys(sum.movements).forEach(label => {
    const e = K.estimate(label, {asOf: last});
    console.log('  ' + label.padEnd(28) + ' e1RM ' + e.e1RM.toFixed(1).padStart(6) + ' lb  IC95 ' + e.low.toFixed(0) + '–' + e.high.toFixed(0)
      + '  (' + e.n + ' mesure' + (e.n > 1 ? 's' : '') + ', derniere ' + e.lastDate + ')');
  });
  const groups = [['global', rows], ['devie (charge ≠ suggeree)', rows.filter(r => r.deviated)]];
  console.log('\n  Erreur moyenne                    n    moteur    kalman   melange');
  groups.forEach(([name, g]) => {
    console.log('  ' + name.padEnd(30) + String(g.length).padStart(4) + '   ' + pct(mean(g.map(r => r.eM))) + '   ' + pct(mean(g.map(r => r.eK))) + '   ' + pct(mean(g.map(r => r.eB))));
  });
  if(Object.keys(skipped).length) console.log('  Lignes ecartees : ' + Object.keys(skipped).map(k => k + ' ' + skipped[k]).join(', '));
  if(!rows.length) console.log('  (aucune ligne avec charge suggeree : erreurs non calculables sur ce journal)');
  return {K, sessions};
}

const profiles = profilesOf(raw).filter(p => !wantedProfile || p.name === wantedProfile);
if(!profiles.length){ console.error('Aucun journal lisible dans ' + file); process.exit(1); }
profiles.forEach(p => {
  const out = replay(p);
  // Point d'ancrage de non-regression (fixture Strict Press) : 176 ± 3 lb au 17 sept.
  const e = out.K.estimate('Strict Press', {asOf: '2026-09-17'});
  if(e && out.sessions.some(s => String(s.date).slice(0, 10) === '2026-09-17')){
    console.log('\n  Ancrage Strict Press au 2026-09-17 : ' + e.e1RM.toFixed(1) + ' lb ± ' + ((e.high - e.low) / 2).toFixed(1)
      + ' (IC95 ' + e.low.toFixed(1) + '–' + e.high.toFixed(1) + ', sd log ' + e.sd.toFixed(4) + ')');
    const oct = out.K.estimate('Strict Press', {asOf: '2026-10-01'});
    console.log('  Projection au 2026-10-01      : ' + oct.e1RM.toFixed(1) + ' lb ± ' + ((oct.high - oct.low) / 2).toFixed(1)
      + ' — porte 1RM a 90 % : ' + (0.9 * oct.e1RM).toFixed(1) + ' lb (terrain : 175 reussi, 185 rate)');
    if(path.resolve(file) === path.join(__dirname, 'fixtures', 'kalman_strict_press.json') && Math.abs(e.e1RM - 176) > 3){
      console.error('ECHEC : ancrage hors 176 ± 3 lb.'); process.exit(1);
    }
  }
});

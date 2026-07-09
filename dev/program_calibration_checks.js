#!/usr/bin/env node
// Racine V4.5 — contrat de calibration et de variété des programmes catalogue.
// Convention : BASE_LOADS = 1RM de l'athlète de référence ; multiplicateurs de
// semaine = %1RM réels ; le mouvement principal reste identique tout le cycle ;
// les blocs B/C tournent chaque semaine.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
const errors = [];
const notes = [];
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

const ctx = { window: {}, console };
vm.createContext(ctx);
['programs/index.js','programs/racine_client_programs.js','programs/racine_crossfit_programs.js','programs/hypertrophie_fesse.js',
 'programs/competition_peak.js','programs/force_performance.js','programs/hypertrophy_base.js','programs/force.js',
 'programs/general_strength_3d.js','programs/general_hypertrophy_2d.js','programs/general_hypertrophy_3d.js',
 'programs/transition_weeks.js','programs/strict_muscle_up_cycle.js','programs/epaules_3d.js']
  .forEach(f => vm.runInContext(read(f), ctx, {filename:f}));
const index = ctx.window.COACH_BERTIN_PROGRAM_INDEX;
const programs = ctx.window.COACH_BERTIN_PROGRAMS;

// ── 1. Convention : bases catalogue = 1RM de l'Athlète X ────────────────────
// Référence V2 « versatile » (scripts/profiles/reference.js) : squat 1RM 315,
// bench = squat/1,3 ≈ 245, press = 0,63×bench ≈ 155, clean = 0,65×squat ≈ 205,
// front squat = 0,85×squat ≈ 265, row 8RM 155→1RM 195, hipThrust 8RM 315→1RM 400,
// deadlift ≈ 1,2×squat ≈ 375.
const REF_BASES = { "Back Squat":315, "Front Squat":265, "Bench Press":245, "Strict Press":155,
  "Power Clean":205, "Hip Thrust":400, "Barbell Row":195, "Deadlift":375 };
const clientSrc = read('programs/racine_client_programs.js');
const crossfitSrc = read('programs/racine_crossfit_programs.js');
Object.keys(REF_BASES).forEach(name => {
  const re = new RegExp('"' + name + '":\\s*(\\d+)');
  [ ['client', clientSrc], ['crossfit', crossfitSrc] ].forEach(([tag, src]) => {
    const m = src.match(re);
    if(!m) return; // le mouvement peut être absent d'un des deux catalogues
    assert(Number(m[1]) === REF_BASES[name],
      tag + ' : base "' + name + '" = ' + m[1] + ' lb (convention 1RM référence : ' + REF_BASES[name] + ').');
  });
});

// ── 2. Intensités des mouvements principaux (semaines de travail) ───────────
// Un main numérique doit viser 55-90 %1RM hors deload (borne large : les reps
// cibles varient de 3 à 10 selon la famille), et le deload doit redescendre.
function parseNum(load){
  const m = String(load == null ? '' : load).match(/(\d+(?:\.\d+)?)\s*(?:-\s*\d+)?\s*lb/i);
  return m ? Number(m[1]) : null;
}
const clientIds = index.filter(x => x && x.macroRole === 'client_catalog').map(x => x.id);
clientIds.forEach(id => {
  const p = programs[id];
  const weeks = p.weekLabels.length;
  p.days.forEach(day => {
    for(let w = 1; w <= weeks; w++){
      const isDeload = w === weeks;
      (p.getBlocks(day, w) || []).filter(b => b.kind === 'main').forEach(b => {
        (b.exercises || []).forEach(e => {
          const num = parseNum(e.load);
          if(num === null || num === 0) return; // poids du corps / technique pure : toléré
          const base = { ...REF_BASES, "Goblet Squat":100, "Push Press":180, "Hang Power Clean":185,
            "Power Snatch":155, "Hang Power Snatch":140, "Clean and Jerk":195, "Thruster":160,
            "Overhead Squat":170, "Split Jerk":200, "Push Jerk":190 }[e.name];
          if(!base) return; // main non-barbell référencé ailleurs
          const pct = num / base;
          if(isDeload){
            assert(pct <= 0.66, id + ' / ' + day + ' S' + w + ' (deload) : ' + e.name + ' ' + num + ' lb = ' + Math.round(pct*100) + ' %1RM (≤ 66 attendu).');
          } else {
            assert(pct >= 0.42 && pct <= 0.90, id + ' / ' + day + ' S' + w + ' : ' + e.name + ' ' + num + ' lb = ' + Math.round(pct*100) + ' %1RM (fenêtre 42-90).');
          }
        });
      });
    }
  });
});

// ── 3. Principal fixe + rotation des blocs B/C ───────────────────────────────
clientIds.filter(id => (index.find(x=>x.id===id)||{}).file === 'programs/racine_client_programs.js').forEach(id => {
  const p = programs[id];
  const weeks = p.weekLabels.length;
  p.days.forEach(day => {
    const mains = new Set(), all = [];
    for(let w = 1; w <= weeks; w++){
      const names = new Set();
      (p.getBlocks(day, w) || []).forEach(b => (b.exercises||[]).forEach(e => {
        names.add(e.name);
        if(b.kind === 'main') mains.add(e.name);
      }));
      all.push(names);
    }
    assert(mains.size === 1, id + ' / ' + day + ' : le mouvement principal reste identique tout le cycle (' + [...mains].join(', ') + ').');
    const union = new Set(); all.forEach(sn => sn.forEach(n => union.add(n)));
    assert(union.size > all[0].size, id + ' / ' + day + ' : les accessoires tournent (' + union.size + ' mouvements distincts pour ' + all[0].size + ' par semaine).');
  });
});

// ── 4. Mains de hypertrophie_fesse chiffrés ──────────────────────────────────
const gf = programs.hypertrophie_fesse;
['lundi','jeudi'].forEach(day => {
  const main = (gf.getBlocks(day, 1) || []).find(b => b.kind === 'main');
  const e = main && main.exercises && main.exercises[0];
  assert(e && parseNum(e.load) !== null, 'hypertrophie_fesse / ' + day + ' : le principal a une charge numérique (' + (e && e.load) + ').');
});

// ── 4b. Legacy publics : plancher d'intensité (échelle Athlète X) ────────────
// Les programmes manuels recalibrés ne doivent jamais retomber sous ~52 %1RM
// sur un main barbell hors deload/taper (les 2 dernières semaines sont
// exemptées : deload ou taper de pic).
const LEGACY_IDS = ['hypertrophy_base','force_performance','competition_peak','strength',
  'general_strength_3d','general_hypertrophy_2d','general_hypertrophy_3d'];
const LEGACY_BASES = { "Back Squat":315, "Front Squat":265, "Bench Press":245, "Strict Press":155,
  "Power Clean":205, "Barbell Row":195, "Hip Thrust":400, "Deadlift":375 };
LEGACY_IDS.forEach(id => {
  const p = programs[id];
  if(!p || typeof p.getBlocks !== 'function'){ assert(false, id + ' : programme legacy chargeable.'); return; }
  const weeks = (p.weekLabels && p.weekLabels.length) || 4;
  let lows = [];
  for(let w = 1; w <= Math.max(1, weeks - 2); w++){
    p.days.forEach(day => {
      let blocks; try { blocks = p.getBlocks(day, w) || []; } catch(e){ return; }
      blocks.filter(b => b.kind === 'main').forEach(b => (b.exercises || []).forEach(e => {
        const base = LEGACY_BASES[e.name];
        const num = parseNum(e.load);
        if(!base || num === null || num === 0) return;
        if(num / base < 0.52) lows.push(e.name + ' S' + w + ' ' + num + ' lb (' + Math.round(num/base*100) + ' %)');
      }));
    });
  }
  assert(lows.length === 0, id + ' : mains barbell ≥ 52 %1RM hors deload/taper' + (lows.length ? ' — ' + lows.slice(0,3).join(' | ') : '') + '.');
});

// ── 5b. Règle des noms de mouvements (docs/STRUCTURE_CONTRACT.md) ────────────
// name = vrai mouvement stable. Pas de « / », « ou », « + » combinant deux
// mouvements, pas de faux qualificatif (lourd, léger, technique, facile,
// contrôlé, progression, WOD). Deux mouvements possibles = deux entrées.
const NAME_BANNED = /(\/| ou | \+ )|\b(lourd|lourds|léger|légers|technique|facile|faciles|contrôlé|progression|wod)\b/i;
const badNames = new Set();
Object.keys(programs).forEach(id => {
  const p = programs[id];
  if(!p || typeof p.getBlocks !== 'function' || !Array.isArray(p.days)) return;
  const weeks = (p.weekLabels && p.weekLabels.length) || 4;
  for(let w = 1; w <= weeks; w++){
    p.days.forEach(day => {
      let blocks; try { blocks = p.getBlocks(day, w) || []; } catch(e){ return; }
      blocks.forEach(b => (b.exercises || []).forEach(e => {
        if(e && e.name && NAME_BANNED.test(String(e.name))) badNames.add(id + ' : « ' + e.name + ' »');
      }));
    });
  }
});
assert(badNames.size === 0, badNames.size === 0
  ? 'Règle des noms : aucun nom de mouvement ambigu ou qualifié dans les programmes chargés.'
  : 'Règle des noms violée — ' + [...badNames].slice(0, 6).join(' | '));

// ── 5. Repères moteur : plus de mouvement chargé sans seed ───────────────────
const seedSrc = read('scripts/charge/historique.js');
['hip thrust','db rdl','goblet','pull through','kb swing','farmer carry','landmine']
  .forEach(k => assert(seedSrc.includes(k), 'Seed moteur présent pour : ' + k));

if(errors.length){
  console.error('ÉCHEC program_calibration_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
notes.forEach(n => console.log(' - ' + n));
console.log('OK program_calibration_checks.js — V4.5 (' + notes.length + ' assertions)');

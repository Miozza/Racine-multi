#!/usr/bin/env node
// Racine — contrat du programme de transition « Retour au travail ».
// Ce que ces tests protègent : c'est une semaine de REPRISE. Le risque n'est pas
// qu'elle soit trop facile, c'est qu'une retouche future la rende trop dure —
// une charge remontée, une série à l'échec, un test de max, un WOD qui gonfle.
// Chaque assertion ci-dessous existe pour bloquer une de ces dérives.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
const errors = [];
const notes = [];
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

const ctx = { window:{}, console };
vm.createContext(ctx);
['programs/index.js', 'programs/retour_au_travail.js']
  .forEach(f => vm.runInContext(read(f), ctx, {filename:f}));

const index = ctx.window.COACH_BERTIN_PROGRAM_INDEX || [];
const p = (ctx.window.COACH_BERTIN_PROGRAMS || {}).retour_au_travail;
const entry = index.find(x => x && x.id === 'retour_au_travail') || null;

// ── 1. Le programme existe et est utilisable comme les autres ────────────────
assert(!!p, 'retour_au_travail est enregistré dans COACH_BERTIN_PROGRAMS.');
if(!p){
  console.error('ÉCHEC retour_au_travail_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
assert(!!entry, 'retour_au_travail est déclaré dans programs/index.js.');
assert(read('index.html').includes('programs/retour_au_travail.js'), 'retour_au_travail.js est chargé par index.html.');
assert(typeof p.getBlocks === 'function', 'retour_au_travail fournit getBlocks().');
assert(typeof p.getWodText === 'function', 'retour_au_travail fournit getWodText().');
assert(entry && entry.visibility === 'public', 'retour_au_travail est accessible sans permission explicite.');

// ── 2. Durée et fréquence : exactement une semaine, quatre séances ───────────
assert(entry && Number(entry.durationWeeks) === 1 && Number(entry.minWeeks) === 1 && Number(entry.maxWeeks) === 1,
  'Le programme dure exactement une semaine (durationWeeks = min = max = 1).');
assert(Array.isArray(p.weekLabels) && p.weekLabels.length === 1, 'Une seule semaine déclarée dans weekLabels.');
assert(Array.isArray(p.days) && p.days.length === 4, 'Le programme comprend quatre séances.');
assert(entry && Number(entry.frequency) === 4, 'index.js déclare une fréquence de 4 jours.');

// ── 3. Ordre des séances ─────────────────────────────────────────────────────
// L'ordre est porté par p.days : c'est lui que currentDayOrder() (app.js) suit.
// Un jour réordonné ou renommé enverrait l'athlète dans la mauvaise séance.
const EXPECTED_ORDER = [
  {day:'lundi',    label:'Séance 1', main:'Back Squat'},
  {day:'mardi',    label:'Séance 2', main:'Power Clean'},
  {day:'jeudi',    label:'Séance 3', main:'Front Squat'},
  {day:'vendredi', label:'Séance 4', main:'Strict Press'}
];
assert(p.days.join(',') === EXPECTED_ORDER.map(x => x.day).join(','),
  'Les quatre séances sont dans le bon ordre : ' + EXPECTED_ORDER.map(x => x.day).join(' → ') + '.');
EXPECTED_ORDER.forEach((exp, i) => {
  const meta = (p.dayMeta || {})[exp.day] || {};
  assert(String(meta.label || '').indexOf(exp.label) === 0,
    exp.day + ' porte le libellé « ' + exp.label + ' » (nommage agnostique du jour de semaine).');
  const blocks = p.getBlocks(exp.day, 1) || [];
  const main = blocks.find(b => b.kind === 'main');
  const firstName = main && main.exercises && main.exercises[0] && main.exercises[0].name;
  assert(firstName === exp.main, 'Séance ' + (i + 1) + ' (' + exp.day + ') démarre sur ' + exp.main + '.');
});

// ── 4. Chaque séance est complète et exploitable par les vues ────────────────
// buildWorkout() (programs/workouts.js) refuse le fallback : un bloc sans titre
// ni kind, ou un exercice sans nom, casse la séance guidée.
p.days.forEach(day => {
  const blocks = p.getBlocks(day, 1) || [];
  assert(blocks.length >= 5, day + ' : séance complète (' + blocks.length + ' blocs).');
  assert(blocks.every(b => b && b.title && b.kind && b.time), day + ' : chaque bloc a titre, kind et durée.');
  assert(blocks.some(b => b.kind === 'warmup'), day + ' : contient un échauffement.');
  assert(blocks.some(b => b.kind === 'main'), day + ' : contient un bloc principal.');
  assert(blocks.some(b => b.kind === 'wod'), day + ' : contient un bloc cardiovasculaire ou un WOD.');
  assert(blocks.some(b => b.kind === 'mobility'), day + ' : contient un retour au calme / mobilité.');
  blocks.forEach(b => {
    (b.exercises || []).forEach(e => {
      assert(!!(e && e.name), day + ' / ' + b.title + ' : exercice nommé.');
      assert(!!(e && e.format), day + ' / ' + e.name + ' : format (séries × répétitions) renseigné.');
      assert(!!(e && e.rest && e.rest !== '—'), day + ' / ' + e.name + ' : temps de repos renseigné.');
      assert(!!(e && e.note), day + ' / ' + e.name + ' : consigne renseignée.');
    });
  });
  assert(typeof p.getWodText(day, 1) === 'string' && p.getWodText(day, 1).length > 0,
    day + ' : getWodText() retourne le texte du bloc conditionnement.');
  assert(!!(p.dayIntentions || {})[day], day + ' : intention de journée déclarée.');
});

// ── 5. Volume réduit par rapport à un cycle normal ──────────────────────────
// Mesuré en répétitions de travail prescrites par mouvement, pas en séries :
// 5×3 de technique (15 reps) est plus léger que 3×10 (30 reps). Un cycle normal
// monte à 40-60 reps par mouvement (WEEK_SCHEMES, racine_client_programs.js).
p.days.forEach(day => {
  (p.getBlocks(day, 1) || []).forEach(b => {
    (b.exercises || []).forEach(e => {
      // Les formats à unité de distance ou de temps (« 3×30 m ») ne se comptent
      // pas en répétitions : le port chargé est borné par la distance.
      const m = String(e.format || '').match(/^(\d+)\s*×\s*(\d+)(?!\s*(m|km|s|sec|min))/);
      if(!m) return;
      const sets = Number(m[1]), reps = Number(m[2]);
      assert(sets * reps <= 30,
        day + ' / ' + e.name + ' : ' + e.format + ' = ' + (sets * reps) + ' reps — 30 maximum sur une semaine de reprise.');
      assert(sets <= 5, day + ' / ' + e.name + ' : ' + sets + ' séries — 5 maximum.');
    });
  });
});

// ── 6. Aucun échec, aucun test de max, RPE plafonné à 7 ─────────────────────
const src = read('programs/retour_au_travail.js');
const prescriptions = [];
p.days.forEach(day => {
  (p.getBlocks(day, 1) || []).forEach(b => {
    (b.exercises || []).forEach(e => prescriptions.push(day + ' / ' + e.name + ' : ' + e.format + ' @ ' + e.load));
  });
});
prescriptions.forEach(line => {
  assert(!/\b1\s*rm\b|\bmax\b|\bamrap\b|\bemom\b|à l'échec/i.test(line),
    'Prescription sans test de max ni format ouvert — ' + line);
});
// Toute mention de « échec » dans les textes du programme doit être une
// interdiction, jamais une consigne : on exige une négation juste avant.
const surface = JSON.stringify([
  p.days.map(d => p.getBlocks(d, 1)),
  p.cycleRules, p.weekGoals, p.impact, p.sets
]);
const echecRe = /.{0,45}échec/gi;
let hit, echecCount = 0;
while((hit = echecRe.exec(surface)) !== null){
  echecCount++;
  assert(/aucun|aucune|jamais|ni |pas |sans /i.test(hit[0]),
    'Mention de l’échec formulée comme une interdiction : « …' + hit[0].slice(-45) + ' ».');
}
assert(echecCount > 0, 'Le programme interdit explicitement l’échec.');
assert(/aucun test de maximum/i.test(String(p.cycleRules.join(' '))),
  'Les règles du cycle interdisent explicitement le test de maximum.');
const rpes = (surface.match(/RPE\s*(\d+)/g) || []).map(s => Number(s.replace(/\D/g, '')));
assert(rpes.length > 0, 'Le programme prescrit explicitement des RPE.');
assert(rpes.every(r => r <= 7), 'Aucun RPE prescrit au-dessus de 7 (max trouvé : ' + Math.max.apply(null, rpes) + ').');

// ── 7. Contexte de reprise : le moteur ne doit pas auto-progresser ───────────
// Deux verrous lus par le moteur de charges. Les retirer rendrait la semaine
// progressive comme un cycle normal — exactement ce qu'elle ne doit pas être.
// 1) coachIsDeloadWeekOrContext() lit le libellé/objectif de semaine.
const weekText = String((p.weekLabels[0] || '') + ' ' + (p.weekGoals[0] || ''))
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
assert(/deload|facile|easy|recuperation|recovery|reset/.test(weekText),
  'Le libellé de semaine déclenche le contexte deload du moteur (coachIsDeloadWeekOrContext).');
// 2) coachExtractMovementIntent() lit la note de l'exercice.
p.days.forEach(day => {
  (p.getBlocks(day, 1) || []).forEach(b => {
    (b.exercises || []).forEach(e => {
      const n = String(e.note || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      assert(/technique|leger|light|facile/.test(n),
        day + ' / ' + e.name + ' : la note porte l’intention limitante lue par coachExtractMovementIntent.');
      assert(/technique se deteriore/.test(n),
        day + ' / ' + e.name + ' : la consigne « réduire la charge si la technique se détériore » est présente.');
    });
  });
});

// ── 8. Il ne s'auto-propose jamais et ne relance aucun cycle ─────────────────
// scripts/season/suggest.js écarte objective:"transition" du classement, et
// n'insère par fatigue que les ids qui matchent /deload/i.
assert(p.objective === 'transition' && entry.objective === 'transition',
  'objective:"transition" — le programme reste hors du classement automatique.');
assert(!/deload/i.test(entry.id), 'L’id ne matche pas /deload/i : jamais inséré par le signal de fatigue.');
assert(Array.isArray(entry.suggestedNext) && entry.suggestedNext.length === 0,
  'suggestedNext vide : aucun cycle n’est enchaîné automatiquement.');
assert(!/CoachSeason|setActiveWeek|localStorage|document\./.test(src),
  'Le programme reste déclaratif : aucun effet de bord sur l’état, le DOM ou la saison.');

// ── 9. Contenu imposé : description, avertissement, recommandation de fin ────
assert(/Une semaine de transition pour reprendre l'entraînement progressivement après une pause/.test(p.impact),
  'La description du programme est affichée (cfg.impact → programDetailsHtml).');
assert(/Cette semaine ne sert pas à tester votre niveau/.test(p.weekGoals[0]),
  'L’avertissement est affiché avec l’objectif de semaine (buildWeekInfo → vues WOD et Cycle).');
const lastBlocks = p.getBlocks('vendredi', 1) || [];
const outro = lastBlocks[lastBlocks.length - 1];
assert(outro && outro.kind === 'bonus',
  'La recommandation de fin ferme la séance 4 en bloc kind:"bonus" (ignoré par la capture de résultats).');
['sans douleur inhabituelle', 'technique', 'fatigue excessive', 'augmenter progressivement l\'intensité']
  .forEach(critere => {
    assert(outro && new RegExp(critere.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(outro.text),
      'Critère de reprise affiché : « ' + critere + ' ».');
  });
assert(outro && /Rien n'est relancé automatiquement/.test(outro.text),
  'La recommandation dit explicitement que rien n’est relancé automatiquement.');

// ── 10. Les charges restent sur l'échelle de l'athlète de référence ──────────
// Convention du dépôt (dev/program_calibration_checks.js) : une charge chiffrée
// est un %1RM de l'athlète X, remis à l'échelle par scripts/charge/scaling.js.
// Ici la fenêtre visée est ≈65-70 % d'une charge de travail normale, soit une
// fourchette basse en %1RM. Un dépassement signalerait une semaine trop lourde.
const REF_1RM = { 'Back Squat':315, 'Front Squat':265, 'Bench Press':245, 'Strict Press':155,
  'Power Clean':205, 'Hip Thrust':400, 'Barbell Row':195 };
p.days.forEach(day => {
  (p.getBlocks(day, 1) || []).forEach(b => {
    (b.exercises || []).forEach(e => {
      const base = REF_1RM[e.name];
      const m = String(e.load || '').match(/(\d+(?:\.\d+)?)\s*lb/i);
      if(!base || !m) return;
      const pct = Number(m[1]) / base;
      assert(pct >= 0.30 && pct <= 0.60,
        day + ' / ' + e.name + ' : ' + m[1] + ' lb = ' + Math.round(pct * 100) + ' %1RM référence (fenêtre reprise 30-60).');
    });
  });
});

// ── 11. Ne casse pas les programmes existants ───────────────────────────────
const ids = index.map(x => x && x.id);
assert(new Set(ids).size === ids.length, 'Les ids du catalogue restent uniques.');
assert(!!(ctx.window.COACH_BERTIN_PROGRAMS || {}).retour_au_travail && Object.keys(ctx.window.COACH_BERTIN_PROGRAMS).length >= 1,
  'L’enregistrement du programme n’écrase pas COACH_BERTIN_PROGRAMS.');

if(errors.length){
  console.error('ÉCHEC retour_au_travail_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
notes.forEach(n => console.log(' - ' + n));
console.log('OK retour_au_travail_checks.js (' + notes.length + ' assertions)');

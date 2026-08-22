#!/usr/bin/env node
/*
  Racine — contrat du bloc VITESSE de Phase 2 — Fable 5.

  Ce que ce fichier protege (le contrat, pas l'inventaire) :
    1. « B. Squat vitesse » est reconnu comme bloc vitesse avec sa bande cible.
    2. A charge et RPE identiques, des reps en plus font monter la suggestion.
    3. Un RPE eleve annule ce credit : le stimulus prime sur la charge.
    4. Une charge devenue trop legere se rapproche de la zone cible, par paliers.
    5. Le bloc vitesse ne devient jamais un bloc lourd, et ne monte jamais
       quand la barre ralentit.
    6. Sans ancre de force ni historique, rien ne bouge : les anciens
       historiques incomplets gardent le comportement d'avant.
    7. Une serie sortie proprement n'est jamais sous-suggeree, meme sans ancre.
    8. Une charge au-dessus de la bande, jamais portee, revient dedans tout de
       suite — une protection qui protege dans six semaines n'en est pas une.
    9. Une cible posee en clair (`pctOf1RM`) vaut declaration d'intention.
   10. Hygiene du catalogue : aucun bloc du dépôt ne declare un pourcentage
       que le moteur lirait comme des livres.

  Usage :
    node dev/phase2_fable5_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function fail(msg){ errors.push(msg); }
function assert(cond, msg){ if(!cond) fail(msg); else notes.push(msg); }

// ─── Bac a sable : le moteur de charges seul, sans DOM ni app.js ────────────
const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout(){}, clearTimeout(){},
  document: { getElementById: () => null },
  navigator: {},
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  APP_VERSION: 'TEST',
  customCharges: {},
  DEFAULT_CHARGES: {},
  CHARGE_ORDER: [],
  movements: { backSquat: { name: 'Back Squat', profile: 'backSquat' } },
  state: { week: 1, day: 'vendredi', rpeHistory: {}, athleteState: { movements: {} }, profile: null },
  save(){}, focus(){ return { targetReps: {} }; }, buildWeekInfo(){ return {}; },
  weekIdx(){ return 0; }, totalWeeks(){ return 8; }, collectSessionExercises(){ return []; }
};
ctx.window = ctx;
ctx.globalThis = ctx;

[
  'scripts/app_helpers.js',
  'scripts/charge/equipement.js',
  'scripts/charge/movement_tuning.js',
  'scripts/charge/utilitaires.js',
  'scripts/charge/mouvements.js',
  'scripts/charge/rpe.js',
  'scripts/charge/historique.js',
  'scripts/charge/scaling.js',
  'scripts/charge/brain_stats.js',
  'scripts/charge/brain_memory.js',
  'scripts/charge/brain_journal.js',
  'scripts/charge/suggestion.js',
  'programs/phase2_fable5.js'
].forEach(file => {
  try { vm.runInNewContext(read(file), ctx, { filename: file }); }
  catch (err) { fail('Chargement impossible de ' + file + ' : ' + err.message); }
});

try {
  const PROG = ctx.window.COACH_BERTIN_PROGRAMS && ctx.window.COACH_BERTIN_PROGRAMS.phase2_fable5;
  assert(!!PROG, 'Programme phase2_fable5 charge.');

  // ─── 1. Le bloc vitesse du vendredi, tel que le programme l'ecrit ─────────
  const vendredi = PROG.getBlocks('vendredi', 1) || [];
  const blocVitesse = vendredi.filter(b => /squat vitesse/i.test(b.title || ''))[0];
  assert(!!blocVitesse, 'Vendredi S1 contient le bloc « B. Squat vitesse ».');
  const exVitesse = (blocVitesse && blocVitesse.exercises && blocVitesse.exercises[0]) || {};
  assert(exVitesse.name === 'Back Squat', 'Le mouvement du bloc vitesse est bien « Back Squat » (nom simple).');
  assert(/%/.test(String(exVitesse.note || '')),
    'Le bloc vitesse declare une cible en pourcentage dans sa note — c est ce qui le rend recalibrable.');

  // Contexte construit exactement comme la vue de seance le fait.
  function speedContext(week){
    return ctx.coachBuildMovementContext(exVitesse.name, {
      kind: blocVitesse.kind,
      blockTitle: blocVitesse.title,
      note: exVitesse.note,
      format: exVitesse.format,
      day: 'vendredi',
      week: week || 1
    });
  }
  const speedCtx = speedContext(1);

  assert(speedCtx.isSpeed === true, 'Le bloc « Squat vitesse » porte l intention speed.');
  assert(!!speedCtx.speedBand && speedCtx.speedBand.declared === 0.60,
    'La cible declaree ~60 % est lue depuis la note (' + JSON.stringify(speedCtx.speedBand) + ').');
  assert(ctx.coachIsLimitedProgressionContext(speedCtx) === true,
    'Un bloc vitesse reste un contexte a progression limitee : il ne remplace jamais une capacite principale.');

  // Le socle du contrat : le Back Squat LOURD du lundi n est PAS un bloc vitesse.
  const lundi = PROG.getBlocks('lundi', 8) || [];
  const blocLourd = lundi.filter(b => b.kind === 'main')[0];
  const exLourd = (blocLourd && blocLourd.exercises && blocLourd.exercises[0]) || {};
  const heavyCtx = ctx.coachBuildMovementContext(exLourd.name, {
    kind: blocLourd.kind, blockTitle: blocLourd.title, note: exLourd.note,
    format: exLourd.format, day: 'lundi', week: 8
  });
  assert(heavyCtx.isSpeed !== true,
    'Le test d ancre du lundi (AMRAP @ ~85 %) n est PAS traite comme un bloc vitesse.');

  // ─── Outillage : semer un historique + une capacite de force ─────────────
  const ONE_RM = 275; // Back Squat de reference du scenario signale.
  function row(load, reps, rpe){
    return {
      date: '2026-02-0' + (1 + (reps % 8)),
      load: load, reps: reps, rpe: rpe,
      range: ctx.repRange(reps),
      status: 'context_logged',
      context: speedCtx,
      planned: { reps: 2, targetMin: 2, targetMax: 2, context: speedCtx }
    };
  }
  // `ranges` n est ecrit que par le travail NON limite : ce que le moteur lit
  // comme ancre vient donc du squat lourd, jamais du bloc vitesse lui-meme.
  function seed(rows, oneRm){
    ctx.state.athleteState = { movements: { 'Back Squat': {
      ranges: (oneRm === null) ? {} : { strength: {
        currentLoad: 235, currentReps: 3, actualLoad: 235, actualReps: 3,
        rpe: 8, confidence: 0.85, status: 'upgrade_ready',
        estimated1RM: (oneRm === undefined ? ONE_RM : oneRm), lastUpdated: '2026-01-01'
      } },
      history: rows
    } } };
  }
  function suggest(programLoad, rows, oneRm){
    seed(rows, oneRm);
    return ctx.guardedSuggestedLoadDecision('Back Squat', programLoad || '135 lb', 2, speedCtx);
  }
  const pct = v => Math.round((v / ONE_RM) * 100);

  // ─── Test 1 — reps prevues respectees : progression conservatrice ────────
  const t1 = suggest('135 lb', [row(135, 2, 7), row(135, 2, 7)]);
  assert(t1.loadNum >= 135, 'Test 1 : 135 x 2 @7 ne fait jamais redescendre sous la charge portee (' + t1.loadNum + ' lb).');
  assert(t1.loadNum <= 145, 'Test 1 : la progression reste conservatrice, pas un bond (' + t1.loadNum + ' lb).');

  // ─── Test 2 — beaucoup plus de reps que prevu : signal de sous-estimation ─
  const t2 = suggest('135 lb', [row(135, 5, 7), row(135, 5, 7)]);
  assert(t2.loadNum > t1.loadNum,
    'Test 2 : 135 x 5 @7 pese PLUS que 135 x 2 @7 a charge et RPE identiques (' + t2.loadNum + ' > ' + t1.loadNum + ' lb).');

  // ─── Test 3 — memes reps en plus, mais RPE eleve : signal different ───────
  const t3 = suggest('135 lb', [row(135, 5, 9.5), row(135, 5, 9.5)]);
  assert(t3.loadNum < t2.loadNum,
    'Test 3 : 135 x 5 @9.5 n est pas lu comme 135 x 5 @7 (' + t3.loadNum + ' < ' + t2.loadNum + ' lb).');
  assert(t3.loadNum <= 135, 'Test 3 : aucune hausse apres un RPE 9.5 (' + t3.loadNum + ' lb).');

  // ─── Test 4 — bloc vitesse sous-charge : convergence vers la zone cible ───
  // ~135 lb pour un 1RM de 275 = 49 %, le bloc vise 60 %. Le moteur doit
  // remonter par paliers, pas d un coup, et s arreter A la cible.
  let charge = 135, trajet = [135], securite = 0;
  while (securite++ < 25) {
    const d = suggest('135 lb', [row(charge, 2, 7), row(charge, 2, 7)]);
    if (!(d.loadNum > charge)) break;
    assert(d.loadNum - charge <= ctx.coachMaxJumpForExercise('Back Squat', charge),
      'Test 4 : chaque palier reste sous le saut maximal prudent (' + charge + ' -> ' + d.loadNum + ' lb).');
    charge = d.loadNum;
    trajet.push(charge);
  }
  assert(trajet.length >= 3,
    'Test 4 : la remontee se fait en plusieurs seances, jamais sur une seule performance (' + trajet.join(' -> ') + ').');
  assert(pct(charge) >= 55 && pct(charge) <= 65,
    'Test 4 : la charge se stabilise dans la zone cible du bloc, ' + charge + ' lb = ' + pct(charge) + ' % du 1RM (' + trajet.join(' -> ') + ').');

  // Stabilisation reelle : une fois la cible atteinte, plus rien ne monte.
  const stable = suggest('135 lb', [row(charge, 2, 7), row(charge, 2, 7)]);
  assert(stable.loadNum <= charge,
    'Test 4 : arrive a la cible, le moteur ne continue pas de monter (' + stable.loadNum + ' <= ' + charge + ' lb).');

  // ─── Test 5 — protection du stimulus vitesse ─────────────────────────────
  // Le RPE monte : on arrete d augmenter, meme si la bande n est pas atteinte.
  const rpeHaut = suggest('135 lb', [row(155, 2, 7), row(160, 2, 8.5)]);
  assert(rpeHaut.loadNum <= 160,
    'Test 5 : RPE 8.5 sur le bloc vitesse — aucune hausse au-dela de la charge portee (' + rpeHaut.loadNum + ' lb).');
  assert(rpeHaut.severity === 'warning',
    'Test 5 : la degradation du stimulus est signalee (severite ' + rpeHaut.severity + ').');

  // Les reps prevues ne sortent plus : meme verdict, la barre a ralenti.
  const repsRatees = suggest('135 lb', [row(155, 2, 7), row(160, 1, 7)]);
  assert(repsRatees.loadNum <= 160,
    'Test 5 : cible non sortie (1 rep sur 2) — aucune hausse (' + repsRatees.loadNum + ' lb).');

  // Un bloc vitesse ne devient jamais un bloc lourd, meme si le programme
  // ecrit une charge absolue au-dessus de la bande.
  const tropLourd = suggest('245 lb', [row(160, 2, 7), row(160, 2, 7)]);
  assert(pct(tropLourd.loadNum) <= 65,
    'Test 5 : une charge de programme a ' + pct(245) + ' % est ramenee dans la bande vitesse (' + tropLourd.loadNum + ' lb = ' + pct(tropLourd.loadNum) + ' %).');

  // ─── 6. Compatibilite : sans ancre ni historique, rien ne bouge ──────────
  const sansAncre = suggest('135 lb', [row(135, 5, 7), row(135, 5, 7)], null);
  assert(sansAncre.loadNum === 135,
    'Historique incomplet (aucune capacite de force connue) : la charge du programme fait foi (' + sansAncre.loadNum + ' lb).');

  ctx.state.athleteState = { movements: {} };
  const premiereSeance = ctx.guardedSuggestedLoadDecision('Back Squat', '145-155 lb', 2, speedCtx);
  assert(premiereSeance.loadNum === 145,
    'Premiere seance, aucun historique : la charge du programme est proposee telle quelle (' + premiereSeance.loadNum + ' lb).');

  // ─── 7. Le reste du programme n est pas devenu un bloc vitesse ───────────
  let vitesseCount = 0, exCount = 0;
  (PROG.days || []).forEach(day => {
    for (let w = 1; w <= (PROG.weekLabels || []).length; w++) {
      (PROG.getBlocks(day, w) || []).forEach(b => {
        (b.exercises || []).forEach(ex => {
          exCount++;
          const c = ctx.coachBuildMovementContext(ex.name, {
            kind: b.kind, blockTitle: b.title, note: ex.note, text: b.text,
            format: ex.format, day: day, week: w
          });
          if (c.isSpeed) vitesseCount++;
        });
      });
    }
  });
  // 7 semaines de bloc vitesse : S8 le retire, la note change.
  assert(vitesseCount > 0 && vitesseCount <= 8,
    'Detection etroite : ' + vitesseCount + ' exercice(s) vitesse sur ' + exCount + ' dans tout le programme.');

  // ─── 8. Plancher sans ancre (R3) ─────────────────────────────────────────
  // Un athlete sans capacite de force connue restait bloque sur le nombre du
  // programme, meme apres l'avoir depasse proprement pendant des semaines.
  const sansAncreMaisPropre = suggest('125 lb', [row(155, 2, 7), row(155, 2, 7)], null);
  assert(sansAncreMaisPropre.loadNum === 155,
    'Sans ancre : 155 lb x 2 @7 deja sortis, le moteur ne repropose pas 125 lb (' + sansAncreMaisPropre.loadNum + ').');

  const sansAncreEtSale = suggest('125 lb', [row(155, 1, 9.5), row(155, 1, 9.5)], null);
  assert(sansAncreEtSale.loadNum <= 125,
    'Sans ancre : une serie ratee a RPE 9.5 ne pose aucun plancher (' + sansAncreEtSale.loadNum + ').');

  // ─── 9. Retour dans la bande immediat si la charge n a jamais ete portee (R4) ─
  const jamaisPortee = suggest('245 lb', [], undefined);
  assert(pct(jamaisPortee.loadNum) <= 65,
    'Charge de programme jamais portee : ramenee dans la bande en une fois (' + jamaisPortee.loadNum + ' lb = ' + pct(jamaisPortee.loadNum) + ' %).');

  // Une charge REELLEMENT portee, elle, redescend par paliers.
  const portee = suggest('245 lb', [row(245, 2, 7), row(245, 2, 7)], undefined);
  assert(portee.loadNum >= 245 - ctx.coachMaxJumpForExercise('Back Squat', 245),
    'Charge reellement portee : la reduction reste bornee au saut maximal, pas un effondrement (' + portee.loadNum + ' lb).');

  // ─── 10. Cible declaree en clair (R5) ────────────────────────────────────
  // Un programme qui pose sa cible proprement, en clair, ne doit pas etre le
  // seul a ne pas etre reconnu faute de tournure de phrase.
  const declare = ctx.coachBuildMovementContext('Back Squat', {
    kind: 'secondary', blockTitle: 'B. Squat vitesse', format: '6×2',
    note: 'Descente contrôlée, remontée explosive. Intention de vitesse.',
    pctOf1RM: 0.60, day: 'vendredi', week: 1
  });
  assert(declare.isSpeed === true && !!declare.speedBand && declare.speedBand.declared === 0.60,
    'Cible posee en clair (pctOf1RM: 0.60) : bloc vitesse reconnu sans aucun % dans le texte.');
  const sansCible = ctx.coachBuildMovementContext('Back Squat', {
    kind: 'secondary', blockTitle: 'B. Squat vitesse', format: '6×2',
    note: 'Descente contrôlée, remontée explosive. Intention de vitesse.',
    day: 'vendredi', week: 1
  });
  assert(sansCible.isSpeed === false,
    'Sans cible declaree ni % ecrit : pas de bloc vitesse. La detection reste etroite.');

  // ─── 11. Hygiene du catalogue : aucun pourcentage lu comme des livres ────
  // Le defaut est structurel, pas propre a phase2_fable5 : tout programme qui
  // ecrit « 60-65 % » dans une charge doit etre reconnu comme un pourcentage,
  // sinon parseLoad() en fait 60 lb.
  const progDir = path.join(root, 'programs');
  const tousProgrammes = {};
  ctx.window.COACH_BERTIN_PROGRAMS = tousProgrammes;
  fs.readdirSync(progDir).filter(f => f.endsWith('.js')).forEach(f => {
    try { vm.runInNewContext(read('programs/' + f), ctx, { filename: f }); } catch (e) {}
  });
  const nonResolus = [];
  let blocsPct = 0;
  Object.keys(tousProgrammes).forEach(id => {
    const prog = tousProgrammes[id];
    if (!prog || typeof prog.getBlocks !== 'function') return;
    (prog.days || []).forEach(day => {
      for (let w = 1; w <= ((prog.weekLabels || []).length || 1); w++) {
        let blocks = [];
        try { blocks = prog.getBlocks(day, w) || []; } catch (e) { return; }
        blocks.forEach(b => (b.exercises || []).forEach(ex => {
          const load = String(ex.load || '');
          if (load.indexOf('%') < 0) return;
          if (/\b(lb|lbs|kg)\b/i.test(load)) return; // charge en livres qui mentionne un %
          blocsPct++;
          if (!ctx.coachPercentTargetFromText(load) && ctx.parseLoad(load) !== null) {
            nonResolus.push(id + ' / ' + day + ' S' + w + ' / ' + ex.name + ' : "' + load + '"');
          }
        }));
      }
    });
  });
  assert(blocsPct > 0, 'Le catalogue contient bien des charges en pourcentage a proteger (' + blocsPct + ' occurrences).');
  assert(nonResolus.length === 0,
    'Aucune charge en pourcentage ne retombe sur parseLoad() : ' + (nonResolus.slice(0, 5).join(' | ') || 'catalogue propre') + '.');

} catch (err) {
  fail('Erreur pendant les tests phase2_fable5 : ' + (err && err.stack ? err.stack : err));
}

if (errors.length) {
  console.error('\nECHEC phase2_fable5_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}

console.log('OK phase2_fable5_checks.js');
notes.forEach(n => console.log(' - ' + n));

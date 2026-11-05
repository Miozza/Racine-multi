#!/usr/bin/env node
/*
  Racine — garde-fous : metcons structurés (programs/wod_format.js) et leur
  modification par Coach IA (proposer_metcon).

  Contrat protégé ici :

    1. Un metcon structuré rend un texte, et c'est ce texte que lisent
       pastilles, chrono et résultats. Le rendu est stable.
    2. Coach IA modifie un metcon par OPÉRATIONS, sans champ de charge : un
       mouvement déjà présent garde sa charge fixe, un nouveau reçoit le
       standard de Racine, un mouvement chargé sans standard est refusé.
    3. Les programmes de la route de l'athlète sont structurés, et tout
       NOUVEAU programme l'est aussi : TEXT_LEGACY ne peut que rétrécir.
    4. Plan Coach IA, schéma 2 : la migration depuis le schéma 1 garde tout ;
       un ajustement de metcon s'applique en surcouche, sur une séance ou sur
       le reste du cycle, et se retire.
    5. Le bug du 2026-11-05 ne revient pas : un « ajustement » visant un
       metcon est refusé au lieu d'être marqué accepté sans rien changer.

  Usage : node dev/wod_format_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

// Programmes encore écrits en texte. Liste qui ne fait que RÉTRÉCIR : un
// nouveau programme écrit ses metcons en structure.
const TEXT_LEGACY = [
  "shoulders3d", "hypertrophy_base", "force_performance", "hypertrophie_fesse", "strength",
  "heritage225", "arnold_split_beurt", "general_strength_3d", "general_hypertrophy_2d", "general_hypertrophy_3d",
  "client_beginner_foundation_2d", "client_beginner_foundation_3d", "client_hypertrophy_4d", "client_hypertrophy_5d",
  "client_strength_2d", "client_strength_4d", "client_recomposition_2d", "client_recomposition_3d", "client_recomposition_4d",
  "client_hybrid_performance_3d", "client_hybrid_performance_4d", "client_hybrid_performance_5d",
  "client_haltero_crossfit_3d", "client_haltero_crossfit_4d", "client_haltero_crossfit_5d",
  "client_rx_crossfit_4d", "client_rx_crossfit_5d", "client_metcon_prep_2d", "client_metcon_prep_3d", "client_metcon_prep_4d",
  "strict_muscle_up_10w", "ai_custom", "shoulders3d_press225_phase2", "posture", "strict_muscle_up_personnel",
  "arnold_split_2026_adapte", "arnold_split_strict", "hypertrophie_fesse_stephanie"
];
// Route de l'athlète et programmes de ses athlètes : convertis le 2026-11-05.
const STRUCTURED = ["moteur_jambes", "pont_peak", "phase2_fable5", "shoulders3d_v2", "retour_au_travail",
  "rehab_stephanie", "competition_peak", "transition_deload_3d", "transition_tests_3d"];

// ── 1. Le module seul ───────────────────────────────────────────────────────
const c1 = {console}; c1.window = c1; vm.createContext(c1);
vm.runInContext(read('programs/wod_format.js'), c1, {filename:'wod_format.js'});
const W = c1.RacineWod;
const emom = {format:"emom", style:"alternate", minutes:14, moves:[
  {reps:"8", name:"Burpees", load:"poids du corps", minute:1}, {reps:"14", unit:"cal", name:"Bike", minute:2}]};
assert(W.render(emom) === "EMOM 14 en alternance, un seul mouvement par minute : minutes impaires 8 Burpees poids du corps ; minutes paires 14 cal Bike.",
  'EMOM en alternance : phrase de la règle CLAUDE.md § 3.1');
assert(W.validate(emom).length === 0, 'EMOM 14 sur 2 minutes : valide');
assert(W.validate(Object.assign({}, emom, {minutes:13})).length > 0, 'EMOM 13 sur 2 minutes : refusé (la durée tombe juste sur le cycle)');
assert(W.render({format:"emom", style:"stations", minutes:16, moves:[{reps:"8", name:"Burpees", minute:1}, {reps:"14", unit:"cal", name:"Bike", minute:2}, {reps:"10", name:"Box Jumps", load:"24 po", minute:3}, {reps:"15", name:"Air Squats", minute:4}]})
  === "EMOM 16 en 4 stations, une station par minute, 4 tours : 1) 8 Burpees, 2) 14 cal Bike, 3) 10 Box Jumps 24 po, 4) 15 Air Squats.",
  'EMOM en stations : nombre de stations et de tours calculés');
assert(W.render({format:"amrap", minutes:20, template:"AMRAP {minutes} à effort 7 sur 10 : {moves}.", sep:", ", moves:[{reps:"12", unit:"cal", name:"Row"}], note:"Note tes tours."})
  === "AMRAP 20 à effort 7 sur 10 : 12 cal Row. Note tes tours.", 'Phrase du programme conservée, durée en champ');

// Opérations
let r = W.applyOps(emom, [{op:"modifier", mouvement:"Bike", reps:"10"}]);
assert(r.ok && W.render(r.spec).indexOf("minutes paires 10 cal Bike") >= 0 && emom.moves[1].reps === "14",
  'modifier : 14 → 10 cal, sur une copie (le programme n\'est jamais muté)');
r = W.applyOps(emom, [{op:"regler", minutes:12}]);
assert(r.ok && /^EMOM 12 /.test(W.render(r.spec)), 'regler : la durée change, la phrase suit');
r = W.applyOps(emom, [{op:"remplacer", mouvement:"Burpees", vers:"Wall Balls", reps:"12"}]);
assert(r.ok && r.spec.moves[0].load === "20/14 lb", 'remplacer par un mouvement chargé : charge STANDARD, jamais choisie par le modèle');
r = W.applyOps(emom, [{op:"remplacer", mouvement:"Bike", vers:"Row"}]);
assert(r.ok && r.spec.moves[1].load === "" && r.spec.moves[1].unit === "cal", 'remplacer par du cardio : aucune charge, unité gardée');
r = W.applyOps(emom, [{op:"ajouter", nom:"Sandbag Clean", reps:"5"}]);
assert(r.ok && r.spec.moves[2].load === "100/70 lb", 'ajouter un mouvement chargé connu : standard');
r = W.applyOps(emom, [{op:"ajouter", nom:"Dumbbell Thruster Complex", reps:"5", load:"200 lb"}]);
assert(r.ok && r.spec.moves[2].load !== "200 lb" && r.spec.moves[2].load === W.standardLoad("Dumbbell Thruster Complex"), 'un champ `load` glissé dans une opération est ignoré : c\'est le standard qui s\'applique');
r = W.applyOps(emom, [{op:"ajouter", nom:"Kettlebell Halo", reps:"5"}]);
assert(!r.ok, 'mouvement chargé sans standard : refusé (aucune charge à deviner)');
r = W.applyOps(emom, [{op:"retirer", mouvement:"Absent"}]);
assert(!r.ok, 'aucune opération applicable : refus, pas de faux succès');
r = W.applyOps(emom, [{op:"regler", format:"amrap"}]);
assert(r.ok && /^AMRAP 14 : /.test(W.render(r.spec)), 'changer de format : phrase par défaut du nouveau format');
const src = read('programs/wod_format.js');
assert(!/op\.load|op\.charge|op\.poids/.test(src), 'applyOps ne lit aucun champ de charge d\'une opération');

// ── 2. Les programmes ───────────────────────────────────────────────────────
const cp = {console, charge:(n, l) => l}; cp.window = cp; vm.createContext(cp);
const files = (read('index.html').match(/src="programs\/[^"?]+/g) || []).map(s => s.slice(5));
assert(files.indexOf('programs/wod_format.js') === 0, 'index.html charge wod_format.js avant tout programme');
files.forEach(f => { try{ vm.runInContext(read(f), cp, {filename:f}); }catch(e){} });
const P = cp.COACH_BERTIN_PROGRAMS;
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
function metcons(id){
  const p = P[id], out = [];
  for(let w = 1; w <= 9; w++) DAYS.forEach(d => {
    let bl; try{ bl = p.getBlocks(d, w) || []; }catch(e){ return; }
    bl.forEach(b => { if(b && b.kind === 'wod') out.push({w, d, b}); });
  });
  return out;
}
STRUCTURED.forEach(id => {
  const list = metcons(id);
  const bad = list.filter(x => !x.b.wod || W.validate(x.b.wod).length || x.b.text !== W.render(x.b.wod));
  assert(list.length > 0 && bad.length === 0, id + ' : ' + list.length + ' metcons, tous structurés, valides et rendus'
    + (bad.length ? ' — ' + bad.slice(0, 3).map(x => 'S' + x.w + ' ' + x.d + ' ' + (x.b.title || '') + ' ' + (x.b.wod ? W.validate(x.b.wod).join(';') : 'texte')).join(' | ') : ''));
});
Object.keys(P).forEach(id => {
  if(TEXT_LEGACY.indexOf(id) >= 0) return;
  const text = metcons(id).filter(x => !x.b.wod);
  assert(text.length === 0, 'Nouveau programme ' + id + ' : metcons structurés (programs/wod_format.js), pas en texte');
});
TEXT_LEGACY.forEach(id => {
  if(!P[id]) return;
  const list = metcons(id);
  assert(!(list.length && list.every(x => x.b.wod)), id + ' est devenu structuré : le retirer de TEXT_LEGACY');
});
// Le standard d'un mouvement chargé existe toujours (sinon Coach IA ne peut pas l'ajouter).
['Wall Balls', 'KB Swings', 'Goblet Squats', 'Box Jumps', 'Box Step-Ups', 'Power Cleans', 'Thrusters', 'Front Squats', 'Deadlifts', 'DB Snatch']
  .forEach(n => assert(W.isLoaded(n) && W.standardLoad(n), 'Standard de metcon défini : ' + n + ' → ' + W.standardLoad(n)));

// ── 3. Plan Coach IA + proposer_metcon, sur le vrai Moteur + jambes ──────────
const ctx = {console, JSON, Date, Math};
ctx.window = ctx;
ctx.state = {aiPlan:{schema:1, updatedAt:"2026-11-05T18:31:00Z", weeks:{}, versions:[],
  adjustments:[{week:2, day:"jeudi", movement:"EMOM moteur", format:"", rest:"", note:"10 cal", createdAt:"2026-11-05T18:31:00Z"}]}};
ctx.save = function(){};
ctx.localStorage = {_s:{}, getItem(k){ return this._s[k] || null; }, setItem(k, v){ this._s[k] = String(v); }, removeItem(k){ delete this._s[k]; }};
ctx.activeProgramId = () => 'moteur_jambes';
ctx.totalWeeks = () => 5;
vm.createContext(ctx);
['programs/wod_format.js', 'programs/moteur_jambes.js', 'scripts/coach_ai/plan.js', 'scripts/coach_ai/patch.js']
  .forEach(f => vm.runInContext(read(f), ctx, {filename:f}));
ctx.buildWorkout = (d, w) => ctx.CoachAIPlan.applyToWorkout({blocks: ctx.COACH_BERTIN_PROGRAMS.moteur_jambes.getBlocks(d, w)}, d, w);
const Plan = ctx.CoachAIPlan, Patch = ctx.CoachAIPatch;
const emomText = (w) => ctx.buildWorkout('jeudi', w).blocks.filter(b => b.kind === 'wod')[0].text;

// Migration 1 → 2
assert(Plan.listWodAdjustments().length === 0 && Plan.listAdjustments().length === 1,
  'Migration schéma 1 → 2 : ajustements d\'exercice gardés, liste de metcons créée vide');

// Le bug : un « ajustement » sur un metcon est refusé.
const ghost = Patch.apply({name:'proposer_ajustement', input:{semaine:2, jour:'jeudi', mouvement:'EMOM moteur', note:'10 cal', raison:'x'}});
assert(!ghost.ok && /metcon/.test(ghost.error), 'proposer_ajustement sur un metcon : refusé, avec renvoi vers proposer_metcon');
const ghost2 = Patch.apply({name:'proposer_ajustement', input:{semaine:2, jour:'jeudi', mouvement:'Mouvement inventé', format:'3×5', raison:'x'}});
assert(!ghost2.ok, 'proposer_ajustement sur un exercice absent : refusé');
const real = Patch.apply({name:'proposer_ajustement', input:{semaine:2, jour:'jeudi', mouvement:'Pallof Press', format:'3×12', raison:'x'}});
assert(real.ok, 'proposer_ajustement sur un vrai exercice : accepté comme avant');

// Portée « séance »
const s2Before = emomText(2), s3Before = emomText(3);
const one = {name:'proposer_metcon', input:{semaine:2, jour:'jeudi', portee:'seance',
  operations:[{op:'modifier', mouvement:'Bike', reps:'9'}], raison:'Effort maximal dès la 9e minute en S1.'}};
const d1 = Patch.describe(one);
assert(d1.lines.some(l => /^S2 : .*minutes paires 9 cal Bike/.test(l)), 'Aperçu : l\'athlète voit le texte exact avant d\'accepter');
assert(Patch.apply(one).ok, 'proposer_metcon (séance) : accepté');
assert(/minutes paires 9 cal Bike/.test(emomText(2)) && /Ajusté par Coach IA/.test(emomText(2)), 'S2 jeudi : 9 cal, marqué « Ajusté par Coach IA »');
assert(emomText(3) === s3Before, 'Portée séance : S3 inchangée');
assert(ctx.state.aiPlan.schema === 2 && ctx.state.aiPlan.wodAdjustments.length === 1, 'Stocké dans state.aiPlan (schéma 2)');

// Portée « cycle » : la Bike des semaines suivantes, en 4 stations
const cyc = {name:'proposer_metcon', input:{semaine:3, jour:'jeudi', portee:'cycle',
  operations:[{op:'remplacer', mouvement:'Bike', vers:'Row'}], raison:'Le vélo lâche.'}};
assert(Patch.apply(cyc).ok, 'proposer_metcon (cycle) : accepté');
assert(/14 cal Row/.test(emomText(3)) && /15 cal Row/.test(emomText(4)), 'Portée cycle : S3 et S4 passent au Row, quantités gardées');
assert(!/Row/.test(emomText(5).split('.')[0]), 'S5 (EMOM de burpees, sans Bike) : opération sautée, metcon intact');

// Refus honnêtes
const nothing = Patch.apply({name:'proposer_metcon', input:{semaine:5, jour:'jeudi', portee:'seance', operations:[{op:'modifier', mouvement:'Bike', reps:'8'}], raison:'x'}});
assert(!nothing.ok, 'Aucun mouvement visé ce jour-là : refus, rien n\'est écrit');
const heavy = Patch.apply({name:'proposer_metcon', input:{semaine:2, jour:'jeudi', portee:'seance', operations:[{op:'ajouter', nom:'Kettlebell Halo', reps:'5'}], raison:'x'}});
assert(!heavy.ok, 'Mouvement chargé sans standard : refus');

// Retrait
assert(Patch.apply({name:'proposer_retrait_metcon', input:{semaine:2, jour:'jeudi', raison:'x'}}).ok && emomText(2) === s2Before,
  'proposer_retrait_metcon : S2 revient au programme');
assert(/14 cal Row/.test(emomText(3)), 'Le retrait de S2 ne touche pas l\'ajustement du cycle (S3)');

// Le schéma des outils : aucun champ de charge dans proposer_metcon.
const tool = Patch.tools().filter(t => t.name === 'proposer_metcon')[0];
const fields = JSON.stringify(tool.input_schema.properties.operations.items.properties);
assert(tool && !/"(?:load|charge|poids|weight|charge_fixe)"/.test(fields), 'proposer_metcon : aucun champ de charge dans les opérations');

// Contexte Coach IA : la structure est montrée au modèle.
assert(/Structure du metcon \(modifiable par proposer_metcon\)/.test(read('scripts/coach_ai/context.js')),
  'consulter_seance montre la structure du metcon');

if(failures){ console.error(failures + ' échec(s).'); process.exit(1); }
console.log('✓ wod_format_checks — tout passe.');

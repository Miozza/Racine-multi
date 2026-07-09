// Racine — Hypertrophie générale — 3 jours/semaine (6 semaines)
// Programme adaptatif : full-body x3, version "masse" du programme force
// générale 3 jours (general_strength_3d.js). Mêmes jours (lundi/mercredi/
// vendredi) et même squelette de séance, mais reps plus hauts (8-15),
// charges relatives plus légères et plus de volume accessoire : l'objectif
// est l'hypertrophie, pas le 1RM.
// Les charges déclarées sont une référence neutre, mises à l'échelle par
// scripts/charge/scaling.js selon le profil actif.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.general_hypertrophy_3d = {
  id: "general_hypertrophy_3d",
  label: "Hypertrophie générale — 3 jours/semaine",
  phase: 0,
  phaseName: "Full-body — fréquence 3x/semaine, volume hypertrophie",
  phaseEnd: "Bloc de 6 semaines, reconductible.",
  impact: "Trois séances full-body (lundi/mercredi/vendredi) avec plus de volume accessoire que la version force générale : reps 8-15, charges relatives plus légères, objectif masse plutôt que force pure.",
  days: ["lundi", "mercredi", "vendredi"],
  weekLabels: ["S1 Base","S2 Volume","S3 Volume+","S4 Surcharge","S5 Intensité","S6 Deload"],
  weekGoals: [
    "Repères techniques. RPE 7-8, aucune série à l'échec.",
    "Volume légèrement augmenté. Charges solides, transitions propres.",
    "Volume utile maximal de ce bloc. Densité, pas de grind.",
    "Surcharge contrôlée. RPE 8-9 max, technique prioritaire.",
    "Intensité la plus haute du cycle. Volume réduit, charges plus sérieuses.",
    "Deload. Réduire volume et charge, garder le mouvement."
  ],
  sets: ["4 x 8","4 x 8","4 x 10","4 x 8","5 x 6","3 x 10 léger"],
  targetReps: [8,8,10,8,6,10],
  mult: [0.70,0.72,0.68,0.75,0.78,0.55],
  rest: "0:30–2:00",
  tag: "hypertrophie 3 jours",
  versionDate: "2026-06-21",
  versionLabel: "2026-06-21 — première version, pilote hypertrophie 3 jours/semaine"
};

function gh3WeekPlan(week){
  return ({
    1:{label:"S1 Base",note:"Reprendre les repères. RPE 7-8. Aucun échec.",
      squat:"4×8",squatLoad:"165 lb",bench:"4×8",benchLoad:"195 lb",lateral:"3×12-15",
      row:"4×8",rowLoad:"125 lb",pull:"3×8",curl:"3×12-15",
      hip:"4×8",hipLoad:"205 lb",press:"4×8",pressLoad:"125 lb",face:"3×15-20",
      bulgarian:"3×10/jambe",triOh:"3×12-15",wodNote:"facile"},
    2:{label:"S2 Volume",note:"Augmenter légèrement le volume. Technique propre.",
      squat:"4×8",squatLoad:"175 lb",bench:"4×8",benchLoad:"200 lb",lateral:"3×12-15",
      row:"4×8",rowLoad:"130 lb",pull:"3×8",curl:"3×12-15",
      hip:"4×8",hipLoad:"215 lb",press:"4×8",pressLoad:"130 lb",face:"3×15-20",
      bulgarian:"3×10/jambe",triOh:"3×12-15",wodNote:"modéré"},
    3:{label:"S3 Volume+",note:"Plus gros volume utile. Densité, pas de grind.",
      squat:"4×10",squatLoad:"170 lb",bench:"4×10",benchLoad:"190 lb",lateral:"4×12-15",
      row:"4×10",rowLoad:"125 lb",pull:"4×8",curl:"4×12-15",
      hip:"4×10",hipLoad:"205 lb",press:"4×10",pressLoad:"120 lb",face:"4×15-20",
      bulgarian:"4×10/jambe",triOh:"4×12-15",wodNote:"contrôlé"},
    4:{label:"S4 Surcharge",note:"Charges les plus sérieuses avant l'intensité. RPE 8-9 max.",
      squat:"4×8",squatLoad:"185 lb",bench:"4×8",benchLoad:"210 lb",lateral:"3×10-12",
      row:"4×8",rowLoad:"140 lb",pull:"3×6-8",curl:"3×10-12",
      hip:"4×8",hipLoad:"230 lb",press:"4×8",pressLoad:"135 lb",face:"3×15-20",
      bulgarian:"3×8/jambe",triOh:"3×10-12",wodNote:"court"},
    5:{label:"S5 Intensité",note:"Intensité maximale du cycle. Moins de volume, plus lourd.",
      squat:"5×6",squatLoad:"195 lb",bench:"5×6",benchLoad:"220 lb",lateral:"3×10-12",
      row:"5×6",rowLoad:"145 lb",pull:"3×6",curl:"3×10",
      hip:"5×6",hipLoad:"240 lb",press:"5×6",pressLoad:"140 lb",face:"2×15-20",
      bulgarian:"3×8/jambe",triOh:"3×10",wodNote:"très court"},
    6:{label:"S6 Deload",note:"Baisser le volume et garder le mouvement.",
      squat:"3×10 léger",squatLoad:"135 lb",bench:"3×10 léger",benchLoad:"160 lb",lateral:"2×15",
      row:"3×10 léger",rowLoad:"100 lb",pull:"2×8 facile",curl:"2×15",
      hip:"3×10 léger",hipLoad:"165 lb",press:"3×10 léger",pressLoad:"100 lb",face:"2×15",
      bulgarian:"2×10/jambe",triOh:"2×15",wodNote:"flush seulement"}
  })[week] || {label:"S1",note:"",squat:"4×8",squatLoad:"165 lb",bench:"4×8",benchLoad:"195 lb",lateral:"3×12-15",row:"4×8",rowLoad:"125 lb",pull:"3×8",curl:"3×12-15",hip:"4×8",hipLoad:"205 lb",press:"4×8",pressLoad:"125 lb",face:"3×15-20",bulgarian:"3×10/jambe",triOh:"3×12-15",wodNote:"facile"};
}

function gh3Ex(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function gh3Blocks(day,week){
  var p = gh3WeekPlan(week);
  var deload = week === 6;
  var heavy = week >= 4 && week <= 5;

  // LUNDI — Squat + push hypertrophie.
  if(day === "lundi") return [
    {time:"7 min",title:"Warm-up jambes",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + air squats 2×10 + glute bridge 2×12 + ramp-up squat : barre×8, 50%×5, 70%×3."},

    {time:"14 min",title:"A. Back Squat",tag:"Jambes",kind:"main",
     exercises:[gh3Ex("Back Squat",p.squat,p.squatLoad,heavy?"2:00":"1:30-2:00","Mouvement principal du jour. Volume hypertrophie, stop à RPE 9.")]},

    {time:"14 min",title:"B. Push hypertrophie",tag:"Superset",kind:"hypertrophy",
     exercises:[
       gh3Ex("Bench Press",p.bench,p.benchLoad,"0:20 avant B2","Push principal de la semaine."),
       gh3Ex("Lateral Raise DB",p.lateral,"20-25 lb","1:00 après B2","Épaules basses, aucun élan.")
     ]},

    {time:"9 min",title:"C. Jambes accessoire",tag:"Accessoire",kind:"accessory",
     exercises:[gh3Ex("Bulgarian Split Squat",p.bulgarian,deload?"35 lb / main":"45-55 lb / main","0:45 après C1","Stable, amplitude propre.")]},

    {time:deload?"5 min":"7 min",title:"D. Finisher",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 5 min zone 2 facile.":"AMRAP 7 : 10 air squats + 10 push-ups + 10 sit-ups.")+" "+p.wodNote+"."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Couch stretch 1 min/côté + pec stretch 1 min/côté + respiration 1 min."}
  ];

  // MERCREDI — Tirage + bras hypertrophie.
  if(day === "mercredi") return [
    {time:"7 min",title:"Warm-up dos",tag:"Préparation",kind:"warmup",
     text:"Row facile 3 min + band pull-apart 2×15 + scap ring row 2×8 + ramp-up row : barre×8, 60%×5, 80%×3."},

    {time:"14 min",title:"A. Barbell Row",tag:"Dos",kind:"main",
     exercises:[gh3Ex("Barbell Row",p.row,p.rowLoad,heavy?"1:45":"1:30-1:45","Mouvement principal du jour. Buste solide, pas de swing.")]},

    {time:"14 min",title:"B. Tirage vertical + biceps",tag:"Superset",kind:"hypertrophy",
     exercises:[
       gh3Ex("Weighted Pull-up",p.pull,deload?"poids du corps":week>=4?"+10 à +20 lb":"+0 à +15 lb","0:20 avant B2","Strict. Remplaçable par Ring Row (angle plus difficile) si besoin."),
       gh3Ex("DB Curl",p.curl,deload?"léger":"modéré","1:00 après B2","Contrôle complet, pas d'élan.")
     ]},

    {time:"9 min",title:"C. Arrière épaule",tag:"Accessoire",kind:"accessory",
     exercises:[gh3Ex("Face Pull",p.face,"60-70 lb","0:45 après C1","Rotation externe, cou relâché.")]},

    {time:deload?"5 min":"7 min",title:"D. Finisher",tag:"Conditioning",kind:"wod",
     text:(deload?"Row 5 min facile zone 2.":"EMOM 7 : min impair = 10 cal row ; min pair = 10 ring rows.")+" "+p.wodNote+"."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Open book 1 min/côté + lat stretch 1 min/côté + respiration 1 min."}
  ];

  // VENDREDI — Hinge + overhead hypertrophie.
  return [
    {time:"7 min",title:"Warm-up hanches",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + glute bridge 2×12 + band external rotation 12/côté + ramp-up hip thrust : léger×10, 60%×5, 80%×3."},

    {time:"14 min",title:"A. Hip Thrust",tag:"Fessiers / Ischios",kind:"main",
     exercises:[gh3Ex("Hip Thrust",p.hip,p.hipLoad,heavy?"1:45":"1:30-1:45","Mouvement principal du jour. Pause 1 sec en haut, fessiers pas lombaires.")]},

    {time:"14 min",title:"B. Overhead hypertrophie",tag:"Superset",kind:"hypertrophy",
     exercises:[
       gh3Ex("Strict Press",p.press,p.pressLoad,"0:20 avant B2","Press contrôlé, complément overhead de la semaine."),
       gh3Ex("Overhead Rope Extension",p.triOh,"50-60 lb","1:00 après B2","Longue portion triceps. Coudes propres.")
     ]},

    {time:"9 min",title:"C. Core",tag:"Accessoire",kind:"accessory",
     exercises:[gh3Ex("Dead Bug",deload?"2 séries faciles":"3 séries","poids du corps","0:45 après C1","Côtes basses, respiration contrôlée.")]},

    {time:deload?"5 min":"7 min",title:"D. Finisher",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 5 min zone 2 facile.":"AMRAP 7 : 8 KB swings + 10 box step-ups + 10 sit-ups.")+" "+p.wodNote+"."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Hamstring stretch 1 min/côté + front rack stretch 1 min + respiration 1 min."}
  ];
}

window.COACH_BERTIN_PROGRAMS.general_hypertrophy_3d.getBlocks = function(day, week){
  return gh3Blocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.general_hypertrophy_3d.getWodText = function(day, week){
  var b = gh3Blocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.general_hypertrophy_3d.cycleRules = [
  "3 jours non consécutifs (lundi/mercredi/vendredi), chaque séance reste full-body.",
  "Reps hypertrophie (8-15) plutôt que force pure : volume avant lourd.",
  "Aucun échec sur Back Squat, Bench Press, Barbell Row ou Hip Thrust.",
  "Weighted Pull-up est le nom officiel; utiliser poids du corps si aucune charge ajoutée."
];

window.COACH_BERTIN_PROGRAMS.general_hypertrophy_3d.dayIntentions = {
  lundi: "Squat principal + push hypertrophie : Back Squat, Bench Press, Lateral Raise, Bulgarian.",
  mercredi: "Tirage principal + bras : Barbell Row, Weighted Pull-up, DB Curl, Face Pull.",
  vendredi: "Hinge principal + overhead : Hip Thrust, Strict Press, Overhead Rope Extension, Dead Bug."
};

window.COACH_BERTIN_PROGRAMS.general_hypertrophy_3d.dayMeta = {
  lundi:    {label:"Lundi",    base:"Squat + push",    focus:"Back Squat, Bench Press, Lateral Raise."},
  mercredi: {label:"Mercredi", base:"Tirage + bras",    focus:"Barbell Row, Weighted Pull-up, DB Curl."},
  vendredi: {label:"Vendredi", base:"Hinge + overhead", focus:"Hip Thrust, Strict Press, Overhead Rope Extension."}
};

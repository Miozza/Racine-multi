// Racine — Force / Hypertrophie générale — 3 jours/semaine (6 semaines)
// Programme adaptatif : pensé pour un profil qui ne peut/veut s'entraîner que
// 3 jours par semaine. Structure full-body classique (squat / bench / hinge),
// chaque séance touche jambes + push + pull pour garder une fréquence
// raisonnable par groupe musculaire malgré le faible nombre de séances.
// Les charges déclarées ci-dessous sont une référence neutre : le moteur de
// charge (scripts/charge/scaling.js) les met à l'échelle du profil actif.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.general_strength_3d = {
  id: "general_strength_3d",
  label: "Force / Hypertrophie générale — 3 jours/semaine",
  phase: 0,
  phaseName: "Full-body — fréquence 3x/semaine",
  phaseEnd: "Bloc de 6 semaines, reconductible.",
  impact: "Structure full-body sur 3 jours non consécutifs (lundi/mercredi/vendredi) : chaque séance combine un mouvement principal (squat, bench, hip thrust) avec un complément push/pull, pour garder une fréquence correcte par groupe musculaire malgré le nombre réduit de séances.",
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
  sets: ["5 x 5","5 x 5","4 x 6","5 x 4","6 x 3","3 x 5 léger"],
  targetReps: [5,5,6,4,3,5],
  mult: [0.75,0.78,0.80,0.83,0.87,0.60],
  rest: "0:45–3:00",
  tag: "force générale 3 jours",
  versionDate: "2026-06-21",
  versionLabel: "2026-06-21 — première version, pilote 3 jours/semaine"
};

function gsWeekPlan(week){
  return ({
    1:{label:"S1 Base",note:"Reprendre les repères. RPE 7-8. Aucun échec.",
      squat:"5×5",squatLoad:"185 lb",bench:"4×6",benchLoad:"225 lb",lateral:"3×12-15",
      row:"4×8",rowLoad:"140 lb",pull:"3×6-8",curl:"3×10-12",
      hip:"4×8",hipLoad:"245 lb",press:"3×8",pressLoad:"140 lb",face:"3×15-20",
      wodNote:"facile à modéré"},
    2:{label:"S2 Volume",note:"Augmenter légèrement le volume. Technique propre.",
      squat:"5×5",squatLoad:"195 lb",bench:"4×6",benchLoad:"230 lb",lateral:"3×12-15",
      row:"4×8",rowLoad:"145 lb",pull:"3×6-8",curl:"3×10-12",
      hip:"4×8",hipLoad:"255 lb",press:"3×8",pressLoad:"145 lb",face:"3×15-20",
      wodNote:"modéré"},
    3:{label:"S3 Volume+",note:"Plus gros volume utile. Densité, pas de grind.",
      squat:"5×5",squatLoad:"205 lb",bench:"4×6",benchLoad:"235 lb",lateral:"4×12-15",
      row:"4×8",rowLoad:"150 lb",pull:"4×6-8",curl:"4×10-12",
      hip:"4×8",hipLoad:"265 lb",press:"4×8",pressLoad:"150 lb",face:"4×15-20",
      wodNote:"contrôlé"},
    4:{label:"S4 Surcharge",note:"Charges les plus sérieuses avant l'intensité. RPE 8-9 max.",
      squat:"5×4",squatLoad:"215 lb",bench:"5×4",benchLoad:"245 lb",lateral:"4×10-15",
      row:"5×6",rowLoad:"155 lb",pull:"4×5-6",curl:"3×8-12",
      hip:"5×6",hipLoad:"280 lb",press:"4×6",pressLoad:"155 lb",face:"3×15-20",
      wodNote:"court, pas destructeur"},
    5:{label:"S5 Intensité",note:"Intensité maximale du cycle. Moins de volume, plus lourd.",
      squat:"6×3",squatLoad:"225 lb",bench:"6×3",benchLoad:"255 lb",lateral:"3×10-12",
      row:"4×5",rowLoad:"160 lb",pull:"4×5-6",curl:"3×8-10",
      hip:"5×5",hipLoad:"290 lb",press:"4×5",pressLoad:"160 lb",face:"2×15-20",
      wodNote:"très court"},
    6:{label:"S6 Deload",note:"Baisser le volume et garder le mouvement.",
      squat:"3×5 léger",squatLoad:"165 lb",bench:"3×5 léger",benchLoad:"205 lb",lateral:"2×15",
      row:"3×8 léger",rowLoad:"110 lb",pull:"2×6 facile",curl:"2×12",
      hip:"3×8 léger",hipLoad:"200 lb",press:"2×8 léger",pressLoad:"115 lb",face:"2×15",
      wodNote:"flush seulement"}
  })[week] || {label:"S1",note:"",squat:"5×5",squatLoad:"185 lb",bench:"4×6",benchLoad:"225 lb",lateral:"3×12-15",row:"4×8",rowLoad:"140 lb",pull:"3×6-8",curl:"3×10-12",hip:"4×8",hipLoad:"245 lb",press:"3×8",pressLoad:"140 lb",face:"3×15-20",wodNote:"modéré"};
}

function gsEx(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function gsBlocks(day,week){
  var p = gsWeekPlan(week);
  var deload = week === 6;
  var heavy = week >= 4 && week <= 5;

  // LUNDI — Squat principal + push complémentaire.
  if(day === "lundi") return [
    {time:"7 min",title:"Warm-up jambes",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + air squats 2×10 + glute bridge 2×12 + ramp-up squat : barre×8, 50%×5, 70%×3."},

    {time:"16 min",title:"A. Back Squat",tag:"Jambes",kind:"main",
     exercises:[gsEx("Back Squat",p.squat,p.squatLoad,heavy?"2:30-3:00":"2:00-2:30","Mouvement principal du jour. Profondeur propre, stop à RPE 9.")]},

    {time:"13 min",title:"B. Push complémentaire",tag:"Superset",kind:"hypertrophy",
     exercises:[
       gsEx("Bench Press",p.bench,p.benchLoad,"0:30 avant B2","Push principal de la semaine, en complément des jambes."),
       gsEx("Lateral Raise DB",p.lateral,"20-25 lb","1:15 après B2","Épaules basses, aucun élan.")
     ]},

    {time:deload?"6 min":"8 min",title:"C. Finisher",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 6 min zone 2 facile.":"AMRAP 8 : 10 air squats + 10 push-ups + 10 sit-ups.")+" "+p.wodNote+"."},

    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Couch stretch 1 min/côté + pec stretch 1 min/côté + respiration 1 min."}
  ];

  // MERCREDI — Tirage principal + complément bras.
  if(day === "mercredi") return [
    {time:"7 min",title:"Warm-up dos",tag:"Préparation",kind:"warmup",
     text:"Row facile 3 min + band pull-apart 2×15 + scap ring row 2×8 + ramp-up row : barre×8, 60%×5, 80%×3."},

    {time:"15 min",title:"A. Barbell Row",tag:"Dos",kind:"main",
     exercises:[gsEx("Barbell Row",p.row,p.rowLoad,heavy?"2:00":"1:45-2:00","Mouvement principal du jour. Buste solide, pas de swing.")]},

    {time:"13 min",title:"B. Tirage vertical + biceps",tag:"Superset",kind:"accessory",
     exercises:[
       gsEx("Weighted Pull-up",p.pull,deload?"poids du corps":week>=4?"+10 à +20 lb":"+0 à +15 lb","0:30 avant B2","Strict. Remplaçable par Ring Row lourd si besoin."),
       gsEx("DB Curl",p.curl,deload?"léger":"modéré","1:15 après B2","Contrôle complet, pas d'élan.")
     ]},

    {time:deload?"6 min":"8 min",title:"C. Finisher",tag:"Conditioning",kind:"wod",
     text:(deload?"Row 6 min facile zone 2.":"EMOM 8 : min 1 = 10 cal row ; min 2 = 10 ring rows.")+" "+p.wodNote+"."},

    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Open book 1 min/côté + lat stretch 1 min/côté + respiration 1 min."}
  ];

  // VENDREDI — Hinge principal + overhead complémentaire.
  return [
    {time:"7 min",title:"Warm-up hanches",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + glute bridge 2×12 + band external rotation 12/côté + ramp-up hip thrust : léger×10, 60%×5, 80%×3."},

    {time:"15 min",title:"A. Hip Thrust",tag:"Fessiers / Ischios",kind:"main",
     exercises:[gsEx("Hip Thrust",p.hip,p.hipLoad,heavy?"2:00":"1:30-2:00","Mouvement principal du jour. Pause 1 sec en haut, fessiers pas lombaires.")]},

    {time:"13 min",title:"B. Overhead + tirage léger",tag:"Superset",kind:"hypertrophy",
     exercises:[
       gsEx("Strict Press",p.press,p.pressLoad,"0:30 avant B2","Press contrôlé, complément overhead de la semaine."),
       gsEx("Face Pull",p.face,"60-70 lb","1:00 après B2","Rotation externe, cou relâché.")
     ]},

    {time:deload?"6 min":"8 min",title:"C. Finisher",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 6 min zone 2 facile.":"AMRAP 8 : 8 KB swings + 10 box step-ups + 10 sit-ups.")+" "+p.wodNote+"."},

    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Hamstring stretch 1 min/côté + front rack stretch 1 min + respiration 1 min."}
  ];
}

window.COACH_BERTIN_PROGRAMS.general_strength_3d.getBlocks = function(day, week){
  return gsBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.general_strength_3d.getWodText = function(day, week){
  var b = gsBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.general_strength_3d.cycleRules = [
  "3 jours non consécutifs (lundi/mercredi/vendredi) : chaque séance reste full-body (1 mouvement principal + 1 complément push/pull) pour garder une fréquence correcte malgré le faible nombre de séances.",
  "Aucun échec sur Back Squat, Bench Press, Barbell Row ou Hip Thrust.",
  "Weighted Pull-up est le nom officiel; utiliser poids du corps si aucune charge ajoutée.",
  "Pas de faux mouvements nommés léger. La légèreté va dans la charge, la note ou le RPE."
];

window.COACH_BERTIN_PROGRAMS.general_strength_3d.dayIntentions = {
  lundi: "Squat principal + push complémentaire : Back Squat, Bench Press, Lateral Raise.",
  mercredi: "Tirage principal + bras : Barbell Row, Weighted Pull-up, DB Curl.",
  vendredi: "Hinge principal + overhead : Hip Thrust, Strict Press, Face Pull."
};

window.COACH_BERTIN_PROGRAMS.general_strength_3d.dayMeta = {
  lundi:    {label:"Lundi",    base:"Squat + push",  focus:"Back Squat, Bench Press, Lateral Raise."},
  mercredi: {label:"Mercredi", base:"Tirage + bras",  focus:"Barbell Row, Weighted Pull-up, DB Curl."},
  vendredi: {label:"Vendredi", base:"Hinge + overhead", focus:"Hip Thrust, Strict Press, Face Pull."}
};

// Racine 2026-06-09 — Phase 2 : Hypertrophie / Force Base (6 semaines)
// Objectif : monter d'un niveau l'effort musculaire général, force de base, masse, chaîne postérieure.
// Structure : PPL strict + vendredi power/bras/grip. Aucun Chest Supported Row, aucun Reverse Sled Drag, aucun deadlift lourd en Phase 2.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.hypertrophy_base = {
  id: "hypertrophy_base",
  label: "Hypertrophie / Force Base — Phase 2",
  phase: 2,
  phaseName: "Construction masse + force",
  phaseEnd: "décembre 2025",
  nextPhase: "force_performance",
  impact: "Phase 2 reconstruite en PPL strict : lundi push/bench, mardi pull, jeudi legs, vendredi power clean + bras/grip. Objectif : monter l'effort musculaire général sans copier la Phase 1. Deadlift lourd reporté en Phase 3; la chaîne postérieure est préparée par hip thrust, DB RDL, front squat, power clean et farmer carry.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Base","S2 Volume","S3 Volume+","S4 Surcharge","S5 Intensité","S6 Deload"],
  weekGoals: [
    "Réintroduction charges sérieuses. Repères force. RPE 7-8, aucune série à l'échec.",
    "Volume augmente. Charges solides, transitions propres, installation terrain réaliste.",
    "Volume maximal utile. Densité musculaire sans mélanger push/pull/legs.",
    "Surcharge contrôlée. RPE 8-9 max, technique prioritaire.",
    "Intensité maximale du cycle. Volume réduit, charges plus sérieuses.",
    "Deload. Réduire volume et charge. Préparer la Phase 3 force/performance."
  ],
  sets: ["5 x 5","5 x 5","4 x 6","5 x 4","6 x 3","3 x 5 léger"],
  targetReps: [5,5,6,4,3,5],
  mult: [0.75,0.78,0.80,0.83,0.87,0.60],
  rest: "0:45–3:00",
  tag: "force base",
  versionDate: "2026-06-09",
  versionLabel: "2026-06-09 — Phase 2 PPL strict, effort musculaire général"
};

function hypertrophyWeekPlan(week){
  return({
    1:{
      label:"S1 Base",note:"Reprendre les repères. RPE 7-8. Aucun échec.",
      bench:"5×5",benchLoad:"185 lb",incline:"3×10",inclineLoad:"50-55 lb / main",lat:"3×15-20",dips:"3×6-10",pushdown:"3×12-15",
      row:"4×10",rowLoad:"120 lb",pull:"3×6-8",curl:"3×10-12",rear:"3×15-20",face:"3×15-20",
      squat:"4×6",squatLoad:"205 lb",bulgarian:"3×8/jambe",hip:"3×10",hinge:"3×10",
      clean:"6×3",cleanLoad:"140-150 lb",dbBench:"3×10",dbBenchLoad:"50 lb / main",carry:"4×40 m",hammer:"3×10-12",triOh:"3×12-15",
      wodNote:"facile à modéré"
    },
    2:{
      label:"S2 Volume",note:"Augmenter légèrement le volume. Charges solides, technique propre.",
      bench:"5×5",benchLoad:"190 lb",incline:"4×8-10",inclineLoad:"55 lb / main",lat:"4×12-20",dips:"3×8-10",pushdown:"3×12-15",
      row:"5×8-10",rowLoad:"125 lb",pull:"4×6-8",curl:"3×10-12",rear:"4×15-20",face:"3×15-20",
      squat:"5×5",squatLoad:"215 lb",bulgarian:"3×8-10/jambe",hip:"3×10",hinge:"4×10",
      clean:"6×3",cleanLoad:"145-155 lb",dbBench:"3×10-12",dbBenchLoad:"50-55 lb / main",carry:"4×40 m",hammer:"3×10-12",triOh:"3×12-15",
      wodNote:"modéré"
    },
    3:{
      label:"S3 Volume+",note:"Plus gros volume utile. Densité musculaire, pas de grind.",
      bench:"4×6",benchLoad:"190 lb",incline:"4×8-10",inclineLoad:"55-60 lb / main",lat:"4×15-20",dips:"4×6-10",pushdown:"3×12-15",
      row:"4×8",rowLoad:"130 lb",pull:"4×6-8",curl:"4×10-12",rear:"4×15-20",face:"3×15-20",
      squat:"5×5",squatLoad:"220 lb",bulgarian:"4×8/jambe",hip:"4×8-10",hinge:"4×8-10",
      clean:"6×2-3",cleanLoad:"150-160 lb",dbBench:"4×8-10",dbBenchLoad:"55 lb / main",carry:"5×40 m",hammer:"4×10",triOh:"3×12-15",
      wodNote:"contrôlé"
    },
    4:{
      label:"S4 Surcharge",note:"Charges les plus sérieuses avant l'intensité. RPE 8-9 max.",
      bench:"5×4",benchLoad:"200 lb",incline:"4×8",inclineLoad:"60 lb / main",lat:"4×12-18",dips:"4×6-8",pushdown:"3×10-15",
      row:"5×6-8",rowLoad:"140 lb",pull:"4×5-6",curl:"3×8-12",rear:"4×12-20",face:"3×15-20",
      squat:"5×4",squatLoad:"225 lb",bulgarian:"3×8/jambe",hip:"4×8",hinge:"3×8-10",
      clean:"7×2",cleanLoad:"160-170 lb",dbBench:"3×8-10",dbBenchLoad:"55 lb / main",carry:"5×40 m lourd",hammer:"3×8-12",triOh:"3×10-12",
      wodNote:"court, pas destructeur"
    },
    5:{
      label:"S5 Intensité",note:"Intensité maximale du cycle. Moins de volume, plus lourd.",
      bench:"6×3",benchLoad:"210 lb",incline:"3×8",inclineLoad:"60-65 lb / main",lat:"3×12-18",dips:"3×6-8",pushdown:"2×12-15",
      row:"4×6",rowLoad:"140 lb",pull:"4×5-6",curl:"3×8-10",rear:"3×12-20",face:"2×15-20",
      squat:"5×3",squatLoad:"235 lb",bulgarian:"3×8/jambe",hip:"3×8",hinge:"3×8",
      clean:"7×2",cleanLoad:"165-175 lb",dbBench:"3×8",dbBenchLoad:"55 lb / main",carry:"4×40 m lourd",hammer:"3×8-10",triOh:"2×10-12",
      wodNote:"très court"
    },
    6:{
      label:"S6 Deload",note:"Baisser le volume et garder le mouvement. Préparer la phase force.",
      bench:"3×5 léger",benchLoad:"165 lb",incline:"2×10",inclineLoad:"40-45 lb / main",lat:"2×15",dips:"2×6 facile",pushdown:"2×12",
      row:"3×8 léger",rowLoad:"100-110 lb",pull:"2×6 facile",curl:"2×12",rear:"2×15",face:"2×15",
      squat:"3×5 léger",squatLoad:"170 lb",bulgarian:"2×8/jambe",hip:"2×10 léger",hinge:"2×10 léger",
      clean:"5×2 léger",cleanLoad:"125 lb",dbBench:"2×10",dbBenchLoad:"40 lb / main",carry:"2×30 m",hammer:"2×12",triOh:"2×12",
      wodNote:"flush seulement"
    }
  })[week] || {label:"S1",note:"",bench:"5×5",benchLoad:"185 lb",incline:"3×10",inclineLoad:"50-55 lb / main",lat:"3×15-20",dips:"3×6-10",pushdown:"3×12-15",row:"4×10",rowLoad:"120 lb",pull:"3×6-8",curl:"3×10-12",rear:"3×15-20",face:"3×15-20",squat:"4×6",squatLoad:"205 lb",bulgarian:"3×8/jambe",hip:"3×10",hinge:"3×10",clean:"6×3",cleanLoad:"140-150 lb",dbBench:"3×10",dbBenchLoad:"50 lb / main",carry:"4×40 m",hammer:"3×10-12",triOh:"3×12-15",wodNote:"modéré"};
}

function hbEx(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function hypertrophyBlocks(day,week){
  var p = hypertrophyWeekPlan(week);
  var deload = week === 6;
  var heavy = week >= 4 && week <= 5;

  // LUNDI — PUSH strict : bench priorité, hypertrophie push, triceps.
  if(day === "lundi") return [
    {time:"8 min",title:"Warm-up push",tag:"Préparation",kind:"warmup",
     text:"Bike 2-3 min + scap push-ups 2×10 + push-ups contrôlés 2×8 + band external rotation 12/côté. Ramp-up bench : barre×10, 135×5, 185×3."},

    {time:"16 min",title:"A. Bench Press",tag:"Force",kind:"main",
     exercises:[hbEx("Bench Press",p.bench,p.benchLoad,heavy?"2:30-3:00":"2:00-2:30","Objectif force de base. Stop à RPE 9. Garde 1 rep en réserve.")]},

    {time:"13 min",title:"B. Push hypertrophie",tag:"Superset",kind:"hypertrophy",
     text:"Push strict : haut de pec + deltoïde latéral. Aucun tirage dans la journée push.",
     exercises:[
       hbEx("Incline DB Press",p.incline,p.inclineLoad,"0:30 avant B2","Contrôle complet. Pas d'échec."),
       hbEx("Lateral Raise DB",p.lat,"20-25 lb","1:15 après B2","Épaules maintenues, pas de trapèzes.")
     ]},

    {time:"10 min",title:"C. Triceps",tag:"Hypertrophie",kind:"hypertrophy",
     text:"Weighted Dips = nom officiel. Mettre 0 lb si poids du corps.",
     exercises:[
       hbEx("Weighted Dips",p.dips,deload?"0 lb":"0-45 lb","0:45 avant C2","Poussée lourde triceps/lockout. Ajouter du poids seulement si reps propres."),
       hbEx("Triceps Rope Pushdown",p.pushdown,"60-80 lb","1:00 après C2","Coudes fixes, extension complète, aucune balançoire.")
     ]},

    {time:deload?"6 min":"8 min",title:"D. Finisher court push",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 6 min zone 2 facile. ":"AMRAP 8 : 8 push-ups + 10 cal row + 12 sit-ups. ")+p.wodNote+". Garder le moteur sans nuire au bench."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Doorway pec stretch 1 min/côté + lat stretch 1 min/côté + triceps stretch 1 min + respiration thoracique 1 min."}
  ];

  // MARDI — PULL strict : row, vertical pull, biceps, rear delts.
  if(day === "mardi") return [
    {time:"8 min",title:"Warm-up pull",tag:"Préparation",kind:"warmup",
     text:"Row facile 3 min + dead hang 2×20 sec + band face pull 2×20 + scap ring row 2×8 + ramp-up Barbell Row : barre×8, 95×5, 115×3."},

    {time:"14 min",title:"A. Barbell Row",tag:"Dos",kind:"main",
     exercises:[hbEx("Barbell Row",p.row,p.rowLoad,heavy?"2:00":"1:45-2:00","Mouvement pull principal. Buste solide, pas de swing. Aucun Chest Supported Row dans ce programme.")]},

    {time:"13 min",title:"B. Tirage vertical + biceps",tag:"Superset",kind:"accessory",
     exercises:[
       hbEx("Weighted Pull-Up",p.pull,deload?"poids du corps":week>=4?"+15 à +30 lb":"+0 à +20 lb","0:30 avant B2","Strict. Si les coudes tirent : Ring Row avec angle plus difficile."),
       hbEx("DB Curl",p.curl,deload?"léger":"modéré","1:15 après B2","Contrôle complet, pas d'élan du dos.")
     ]},

    {time:"10 min",title:"C. Rear delts / posture",tag:"Arrière épaule",kind:"accessory",
     exercises:[
       hbEx("Rear Delt Fly DB",p.rear,"20-25 lb","0:30 avant C2","Arrière d'épaule, trapèzes calmes."),
       hbEx("Face Pull",p.face,"60-70 lb","1:00 après C2","Rotation externe en fin. Cou relâché.")
     ]},

    {time:deload?"6 min":"8 min",title:"D. Finisher pull",tag:"Conditioning",kind:"wod",
     text:(deload?"SkiErg 6 min facile.":"EMOM 8 : min 1 = 10 cal SkiErg ; min 2 = 10-12 ring rows stricts.")+" "+p.wodNote+"."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Open book 1 min/côté + pec minor stretch 1 min/côté + lat stretch 1 min + respiration 1 min."}
  ];

  // JEUDI — LEGS strict : squat, unilatéral/core, chaîne postérieure. Pas de deadlift lourd en Phase 2.
  if(day === "jeudi") return [
    {time:"9 min",title:"Warm-up legs",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + ankle rocks 10/côté + goblet squat 2×10 + glute bridge 2×15 + ramp-up front squat : barre×8, 135×5, 155×3."},

    {time:"16 min",title:"A. Front Squat",tag:"Jambes",kind:"main",
     exercises:[hbEx("Front Squat",p.squat,p.squatLoad,heavy?"2:30":"2:00","Dos protégé. Profondeur propre. Aucune tentative héroïque.")]},

    {time:"12 min",title:"B. Unilatéral + core",tag:"Jambes / Core",kind:"accessory",
     text:"Structure terrain : Bulgarian + core pour récupérer les jambes sans courir entre deux stations lourdes.",
     exercises:[
       hbEx("Bulgarian Split Squat",p.bulgarian,deload?"35 lb / main":"45-55 lb / main","0:45 avant B2","Stable, amplitude propre."),
       hbEx("Dead Bug",deload?"2 séries faciles":"3 séries","poids du corps","0:45 après B2","Côtes basses, respiration contrôlée.")
     ]},

    {time:"11 min",title:"C. Chaîne postérieure",tag:"Fessiers / Ischios",kind:"accessory",
     text:"Préparation au deadlift de Phase 3 sans deadlift lourd : fessiers, ischios, gainage.",
     exercises:[
       hbEx("Hip Thrust",p.hip,deload?"léger":week>=4?"275-315 lb":"245-275 lb","0:45 avant C2","Pause 1 sec en haut. Fessiers, pas lombaires."),
       hbEx("DB RDL",p.hinge,deload?"léger":"60-70 lb / main","1:00 après C2","Étirement ischios. Dos neutre. Aucun ego.")
     ]},

    {time:deload?"6 min":"9 min",title:"D. Conditioning jambes contrôlé",tag:"Conditioning",kind:"wod",
     text:(deload?"Row 6 min facile zone 2.":"For time 3 rounds : 12 cal bike + 12 KB swings + 10 box step-ups. Cap 9 min.")+" "+p.wodNote+". Pas de redline."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Couch stretch 1 min/côté + hamstring stretch 1 min/côté + ankle stretch 1 min + respiration 1 min."}
  ];

  // VENDREDI — Power clean + bras/grip. Complément musculaire, pas full body random.
  return [
    {time:"9 min",title:"Warm-up power",tag:"Préparation",kind:"warmup",
     text:"Row 3 min + front rack mobility 1 min + tall muscle clean 2×5 + air squats 2×10 + ramp-up power clean : barre×5, 95×3, 135×2."},

    {time:"14 min",title:"A. Power Clean",tag:"Haltéro",kind:"main",
     exercises:[hbEx("Power Clean",p.clean,p.cleanLoad,"1:30-2:00","Vitesse avant charge. Zéro grind. Maintenir l'haltéro vivant sans voler la Phase 3.")]},

    {time:"13 min",title:"B. Push complémentaire + grip",tag:"Superset",kind:"accessory",
     text:"Vendredi option 1 : puissance + bras/grip. Ce n'est pas une copie de Phase 1; l'effort musculaire global monte.",
     exercises:[
       hbEx("DB Bench Press",p.dbBench,p.dbBenchLoad,"0:30 avant B2","Contrôle, amplitude, pas d'échec."),
       hbEx("Farmer Carry",p.carry,deload?"modéré":"lourd propre","1:00 après B2","Gainage fort, posture haute, grip solide.")
     ]},

    {time:"10 min",title:"C. Bras",tag:"Hypertrophie",kind:"accessory",
     exercises:[
       hbEx("Hammer Curl",p.hammer,deload?"léger":"modéré à lourd","0:30 avant C2","Brachial/brachioradial, grip. Aucun swing."),
       hbEx("Overhead Rope Extension",p.triOh,"50-70 lb","1:00 après C2","Longue portion triceps. Coudes propres.")
     ]},

    {time:deload?"6 min":"8 min",title:"D. Finisher court",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 6 min zone 2 facile.":"AMRAP 8 : 5 power cleans légers + 8 wall balls 14 lb + 10 cal row.")+" "+p.wodNote+". Court et propre, pas un test compétition."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Front rack stretch 1 min + pec stretch 1 min/côté + lat stretch 1 min/côté + wrist stretch 1 min."}
  ];
}

window.COACH_BERTIN_PROGRAMS.hypertrophy_base.getBlocks = function(day, week){
  return hypertrophyBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.hypertrophy_base.getWodText = function(day, week){
  var b = hypertrophyBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.hypertrophy_base.cycleRules = [
  "PPL strict : lundi push, mardi pull, jeudi legs. Vendredi = power clean + bras/grip complémentaire.",
  "Aucun pull caché dans le push day et aucun push lourd dans le pull day.",
  "Aucun Chest Supported Row : utiliser Barbell Row comme tirage principal.",
  "Aucun Reverse Sled Drag.",
  "Aucun deadlift lourd en Phase 2 : la charnière est préparée par Hip Thrust, DB RDL, Front Squat, Power Clean et Farmer Carry.",
  "Weighted Dips est le nom officiel; utiliser 0 lb si poids du corps.",
  "Pas de faux mouvements nommés léger. La légèreté va dans la charge, la note ou le RPE.",
  "Tous les blocs accessoires doivent être cohérents sur le terrain : installation réaliste, 2 mouvements complémentaires minimum.",
  "Aucun échec sur bench, front squat, barbell row, power clean ou mouvements techniques.",
  "Objectif Phase 2 : monter l'effort musculaire général sans copier la spécialisation épaules/triceps de Phase 1."
];

window.COACH_BERTIN_PROGRAMS.hypertrophy_base.dayIntentions = {
  lundi: "Push force base : bench prioritaire, incline DB + lateral raise, weighted dips + triceps pushdown. Aucun pull.",
  mardi: "Pull force base : barbell row, weighted pull-up, curl, rear delt, face pull. Aucun press.",
  jeudi: "Legs force base : front squat, Bulgarian + core, hip thrust + DB RDL. Pas de deadlift lourd en Phase 2.",
  vendredi: "Power clean + bras/grip : power clean, DB bench + farmer carry, hammer curl + overhead rope extension."
};

window.COACH_BERTIN_PROGRAMS.hypertrophy_base.dayMeta = {
  lundi:   {label:"Lundi",   base:"Push force base",      focus:"Bench, incline DB, lateral raise, weighted dips, triceps pushdown."},
  mardi:   {label:"Mardi",   base:"Pull force base",      focus:"Barbell Row, weighted pull-up, DB curl, rear delt fly, face pull."},
  jeudi:   {label:"Jeudi",   base:"Legs force base",      focus:"Front Squat, Bulgarian + core, hip thrust + DB RDL."},
  vendredi:{label:"Vendredi",base:"Power + bras/grip",    focus:"Power clean, DB bench, farmer carry, hammer curl, overhead triceps."}
};

// Racine Programme autonome : Force classique
// Objectif : force pure, repos longs, très peu de conditioning, aucun WOD destructeur.
// ne dépend plus de la structure PPL générique.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.strength = {
  id: "strength",
  label: "Force classique",
  phase: 0,
  phaseName: "Force pure",
  impact: "Priorité aux lifts. Charges lourdes, volume contrôlé, repos longs. Aucun WOD obligatoire. Objectif : monter les mouvements sans fatigue CrossFit inutile.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Base","S2 Charge","S3 Intensité","S4 Deload"],
  weekGoals: [
    "Installer les repères. RPE 7-8, technique parfaite.",
    "Augmenter la charge sans augmenter le chaos. Repos longs.",
    "Semaine la plus lourde. Peu de volume, aucune tentative stupide.",
    "Deload : récupérer, garder le pattern, préparer le prochain bloc."
  ],
  sets: ["5 x 5","5 x 4","6 x 3","3 x 5 léger"],
  targetReps: [5,4,3,5],
  mult: [0.75,0.80,0.86,0.60],
  rest: "2:30–3:30",
  tag: "force",
  trainingStyle: "strength",
  conditioning: "none",
  cycleRules: [
    "Aucun WOD obligatoire en cycle force.",
    "Repos longs : la qualité de la série passe avant la densité.",
    "Stop à RPE 9. Aucun grind laid.",
    "Si le dos parle : réduire, remplacer, ou arrêter le lift.",
    "Le conditioning est optionnel et facile seulement."
  ],
  dayIntentions: {
    lundi: "Bench priorité. Tirage lourd pour protéger les épaules. Pas de WOD.",
    mardi: "Squat priorité. Chaîne postérieure solide, dos protégé.",
    jeudi: "Haltéro/press : force-vitesse et overhead stable.",
    vendredi: "Force secondaire et tirage lourd. Finir frais, pas vidé."
  }
};

function strengthWeekPlan(week){
  return({
    1:{label:"S1 Base",note:"Repères de force. RPE 7-8. Technique parfaite.",bench:"5×5",benchLoad:"235 lb",squat:"5×5",squatLoad:"205 lb",clean:"6×2",cleanLoad:"165 lb",press:"5×5",pressLoad:"120 lb",dead:"4×5",deadLoad:"225 lb"},
    2:{label:"S2 Charge",note:"Charge plus sérieuse. Même propreté. Repos complet.",bench:"5×4",benchLoad:"250 lb",squat:"5×4",squatLoad:"220 lb",clean:"7×2",cleanLoad:"175 lb",press:"5×4",pressLoad:"130 lb",dead:"5×4",deadLoad:"245 lb"},
    3:{label:"S3 Intensité",note:"Semaine lourde. Peu de reps. Aucune série ratée.",bench:"6×3",benchLoad:"265 lb",squat:"6×3",squatLoad:"235 lb",clean:"8×1",cleanLoad:"185-195 lb",press:"6×3",pressLoad:"140 lb",dead:"6×3",deadLoad:"265 lb"},
    4:{label:"S4 Deload",note:"Baisser la charge, garder le mouvement. Tu dois sortir plus frais.",bench:"3×5 léger",benchLoad:"205 lb",squat:"3×5 léger",squatLoad:"165 lb",clean:"5×2 léger",cleanLoad:"135 lb",press:"3×5 léger",pressLoad:"95 lb",dead:"3×5 léger",deadLoad:"185 lb"}
  })[week] || {label:"S1",note:"",bench:"5×5",benchLoad:"235 lb",squat:"5×5",squatLoad:"205 lb",clean:"6×2",cleanLoad:"165 lb",press:"5×5",pressLoad:"120 lb",dead:"4×5",deadLoad:"225 lb"};
}
function stEx(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function strengthBlocks(day,week){
  var p=strengthWeekPlan(week);
  var deload=week===4;
  var heavy=week===3;

  if(day==="lundi") return [
    {time:"9 min",title:"Warm-up bench",tag:"Préparation",kind:"warmup",
     text:"Row facile 3 min + band pull-aparts 2×20 + scap push-ups 2×10 + push-ups 2×8 + ramp-up bench : barre×10, 135×5, 185×3, 215×1."},
    {time:"20 min",title:"A. Bench Press priorité",tag:"Force",kind:"main",
     exercises:[stEx("Bench Press",p.bench,p.benchLoad,heavy?"3:00-3:30":"2:30-3:00","Force pure. Setup identique à chaque série. Stop si la vitesse s'effondre.")]},
    {time:"14 min",title:"B. Tirage lourd",tag:"Force",kind:"accessory",
     exercises:[stEx("Chest Supported Row",deload?"3×8 léger":heavy?"5×5 lourd":"4×6-8",deload?"105 lb":heavy?"145-155 lb":"130-145 lb","2:00","Tirage strict. Haut du dos fort pour soutenir le bench.")]},
    {time:"8 min",title:"C. Triceps / stabilité",tag:"Assistance",kind:"accessory",
     exercises:[
       stEx("Close-Grip Bench Press",deload?"2×8 léger":"3×6",deload?"165 lb":heavy?"215 lb":"195-205 lb","1:45","Triceps fort sans échec."),
       stEx("Face Pull",deload?"2×15":"3×15-20","60-70 lb","0:45","Santé épaules.")
     ]},
    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",text:"Pec stretch 1 min/côté + lat stretch 1 min/côté + respiration 1 min."}
  ];

  if(day==="mardi") return [
    {time:"10 min",title:"Warm-up squat",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + ankle rocks 10/côté + goblet squat 2×10 + glute bridge 2×15 + ramp-up squat : barre×8, 135×5, 185×3."},
    {time:"22 min",title:"A. Squat priorité",tag:"Force",kind:"main",
     exercises:[stEx("Back Squat",p.squat,p.squatLoad,heavy?"3:00-3:30":"2:30-3:00","Force jambes. Si le bas du dos compense, remplace par front squat plus léger.")]},
    {time:"13 min",title:"B. Chaîne postérieure",tag:"Force",kind:"accessory",
     exercises:[
       stEx("Hip Thrust",deload?"2×8 léger":heavy?"4×5 lourd":"4×6-8",deload?"225 lb":heavy?"315 lb":"275-305 lb","1:30","Pause en haut. Fessiers."),
       stEx("DB RDL",deload?"2×8 léger":"3×8","60-70 lb / main","1:30","Ischios, dos neutre.")
     ]},
    {time:"5 min",title:"C. Mobilité",tag:"Mobilité",kind:"mobility",text:"Couch stretch 1 min/côté + hamstring stretch 1 min/côté + respiration 1 min."}
  ];

  if(day==="jeudi") return [
    {time:"10 min",title:"Warm-up haltéro / press",tag:"Préparation",kind:"warmup",
     text:"Row 3 min + front rack stretch 1 min + tall muscle clean 2×5 + strict press barre 2×8 + ramp-up power clean."},
    {time:"16 min",title:"A. Power clean force-vitesse",tag:"Haltéro",kind:"main",
     exercises:[stEx("Power Clean",p.clean,p.cleanLoad,heavy?"2:00-2:30":"1:30-2:00","Vitesse avant ego. Réception propre. Aucune rep grindée.")]},
    {time:"16 min",title:"B. Strict press",tag:"Force",kind:"main",
     exercises:[stEx("Strict Press",p.press,p.pressLoad,heavy?"2:30-3:00":"2:00-2:30","Gainage solide. Pas de banane lombaire.")]},
    {time:"10 min",title:"C. Tirage vertical",tag:"Assistance",kind:"accessory",
     exercises:[stEx("Weighted Pull-up",deload?"3×5 facile":heavy?"5×3 lourd":"4×5",deload?"poids du corps":heavy?"+25 à +40 lb":"+15 à +30 lb","2:00","Strict. Stop avant de tirer croche.")]},
    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",text:"Front rack stretch 1 min + lat stretch 1 min/côté + wrist stretch 1 min."}
  ];

  return [
    {time:"8 min",title:"Warm-up force secondaire",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + air squats 2×10 + ring rows 2×8 + hip hinge drill 2×10 + ramp-up deadlift/RDL."},
    {time:"18 min",title:"A. Deadlift / hinge",tag:"Force",kind:"main",
     exercises:[stEx("Deadlift",p.dead,p.deadLoad,heavy?"3:00":"2:30","Choisis deadlift si le dos est parfait, sinon RDL. Aucun ego lift.")]},
    {time:"14 min",title:"B. Front Squat technique lourd",tag:"Force",kind:"accessory",
     exercises:[stEx("Front Squat",deload?"3×5 léger":heavy?"5×2 lourd":"4×4",deload?"135 lb":heavy?"195-205 lb":"175-190 lb","2:30","Transfert clean/thruster. Position solide.")]},
    {time:"10 min",title:"C. Carry + core",tag:"Assistance",kind:"accessory",
     exercises:[
       stEx("Farmer Carry",deload?"2×30 m":"4×40 m","lourd propre","1:15","Posture haute, grip."),
       stEx("Hollow Hold",deload?"2×20 sec":"3×30 sec","poids du corps","0:45","Côtes basses, gainage.")
     ]},
    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",text:"Lat stretch 1 min/côté + couch stretch 1 min/côté + respiration 1 min."}
  ];
}

window.COACH_BERTIN_PROGRAMS.strength.getBlocks = function(day, week){ return strengthBlocks(day, week); };
window.COACH_BERTIN_PROGRAMS.strength.getWodText = function(day, week){
  var b=strengthBlocks(day, week).filter(function(x){return x.kind==="wod";})[0];
  return b ? b.text : "Aucun WOD — cycle force.";
};

window.COACH_BERTIN_PROGRAMS.strength.dayMeta = {
  lundi:   {label:"Lundi",   base:"Bench lourd",       focus:"Bench priorité, tirage lourd, triceps/stabilité."},
  mardi:   {label:"Mardi",   base:"Squat lourd",       focus:"Squat priorité, fessiers/ischios, dos protégé."},
  jeudi:   {label:"Jeudi",   base:"Clean + Press",     focus:"Force-vitesse, strict press, tirage vertical."},
  vendredi:{label:"Vendredi",base:"Hinge + assistance",focus:"Deadlift/RDL, front squat technique, carry/core."}
};

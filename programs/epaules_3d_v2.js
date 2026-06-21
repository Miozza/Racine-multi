// Coach Bertin — Épaules 3D v2
// Objectif : même intention que Épaules 3D Phase 1, mais format midi dense.
// Philosophie : warm-up ciblé court, fonte utile maximale, WOD court obligatoire, moins de blocs séparés.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.shoulders3d_v2 = {
  id: "shoulders3d_v2",
  label: "Épaules 3D v2 — Midi dense",
  phase: 1,
  phaseName: "Spécialisation efficace",
  phaseEnd: "transition depuis Épaules 3D",
  nextPhase: "hypertrophy_base",
  impact: "Même objectif que Épaules 3D : épaules rondes, triceps solides, overhead stable et posture protégée. Version plus efficace pour le midi : un mouvement prioritaire, un bloc support, un WOD fonte court obligatoire et un mini-reset.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Base", "S2 Technique", "S3 Volume", "S4 Surcharge", "S5 Intensité", "S6 Deload"],
  weekGoals: [
    "Repères techniques, RPE 7-8, rythme de séance stable.",
    "Même qualité, transitions plus fluides, aucune course inutile.",
    "Volume utile plus élevé, WOD dense mais contrôlé.",
    "Semaine la plus dense, RPE 8-9 max, aucune compensation.",
    "Charges plus sérieuses, volume un peu réduit, qualité avant ego.",
    "Deload actif, conserver le pattern et sortir plus frais."
  ],
  sets: ["4 x 10", "5 x 8-10", "5 x 10", "5 x 8", "4 x 8 lourd", "3 x 10 léger"],
  targetReps: [10,10,10,8,8,10],
  mult: [0.55,0.58,0.62,0.66,0.70,0.50],
  rest: "0:30–2:00",
  tag: "épaules 3D v2",
  versionDate: "2026-06-14",
  versionLabel: "V51.36 — WOD benchmarks restaurés mardi/jeudi/vendredi",
  transitionFrom: "shoulders3d"
};

function shouldersV2WeekPlan(week){
  return ({
    1:{label:"S1 Base",note:"Qualité et repères. RPE 7-8. Aucun échec.",
      press:"3×8-10",pressLoad:"110 lb",incline:"3×10",inclineLoad:"45-50 lb / main",lat:"3×15-20",triOh:"3×10-15",dips:"3×6-10",
      row:"4×10",pull:"3×8",rear:"3×15-20",face:"3×15-20",curl:"3×10-15",
      squat:"5×5",squatLoad:"165 lb",bulg:"3×8-10/jambe",hip:"3×10",hinge:"3×10",
      shPress:"3×10",shPressLoad:"léger",latDb:"3×15-20",rearDb:"3×15-20",upright:"3×10-15",clean:"4×2",cleanLoad:"115-135 lb",wodNote:"pacing propre"},
    2:{label:"S2 Technique",note:"Transitions plus fluides. Toujours 1-2 reps en réserve.",
      press:"4×8",pressLoad:"115 lb",incline:"4×8-10",inclineLoad:"50 lb / main",lat:"3×15-20",triOh:"3×10-15",dips:"3×6-10",
      row:"5×8-10",pull:"4×6-8",rear:"3×15-20",face:"3×15-20",curl:"3×10-15",
      squat:"5×5",squatLoad:"175 lb",bulg:"3×8-10/jambe",hip:"3×10",hinge:"3×10",
      shPress:"3×8-10",shPressLoad:"léger à modéré",latDb:"3×15-20",rearDb:"3×15-20",upright:"3×10-15",clean:"4×2",cleanLoad:"125-145 lb",wodNote:"contrôlé"},
    3:{label:"S3 Volume",note:"Volume utile plus élevé. WOD dense, pas redline.",
      press:"4×8-10",pressLoad:"120 lb",incline:"4×8-10",inclineLoad:"50-55 lb / main",lat:"4×15-20",triOh:"3×12-15",dips:"3×6-10",
      row:"4×8",pull:"4×6-8",rear:"4×15-20",face:"3×15-20",curl:"3×10-15",
      squat:"5×4",squatLoad:"185 lb",bulg:"3×8-10/jambe",hip:"4×8-10",hinge:"3×10",
      shPress:"4×8-10",shPressLoad:"modéré",latDb:"4×12-20",rearDb:"4×15-20",upright:"3×10-15",clean:"4×2",cleanLoad:"135-155 lb",wodNote:"modéré"},
    4:{label:"S4 Surcharge",note:"Semaine dense. RPE 8-9 max, technique parfaite.",
      press:"4×8",pressLoad:"125 lb",incline:"4×8",inclineLoad:"50-55 lb / main",lat:"4×12-20",triOh:"3×10-15",dips:"3×6-10",
      row:"5×8",pull:"4×6",rear:"4×15-20",face:"3×15-20",curl:"3×10-12",
      squat:"5×4",squatLoad:"190 lb",bulg:"3×8/jambe",hip:"4×8",hinge:"3×8-10",
      shPress:"4×8",shPressLoad:"modéré",latDb:"4×12-20",rearDb:"4×15-20",upright:"3×10-15",clean:"4×2",cleanLoad:"145-165 lb",wodNote:"fort mais propre"},
    5:{label:"S5 Intensité",note:"Charges sérieuses, volume un peu réduit.",
      press:"3×8",pressLoad:"130 lb",incline:"3×8",inclineLoad:"55 lb / main",lat:"3×12-18",triOh:"3×8-12",dips:"3×5-8",
      row:"4×6",pull:"4×5-6",rear:"3×12-20",face:"2×15-20",curl:"3×8-12",
      squat:"5×3",squatLoad:"195 lb",bulg:"2×8/jambe",hip:"3×8",hinge:"3×8",
      shPress:"3×8",shPressLoad:"modéré",latDb:"3×12-18",rearDb:"3×12-20",upright:"2×10-12",clean:"3×2",cleanLoad:"145-165 lb",wodNote:"court et propre"},
    6:{label:"S6 Deload",note:"Deload actif. Réduire volume et charge.",
      press:"2×10",pressLoad:"95 lb",incline:"2×10",inclineLoad:"40-45 lb / main",lat:"2×15",triOh:"2×12",dips:"2×6 facile",
      row:"3×10",pull:"2×6",rear:"2×15",face:"2×15",curl:"2×12",
      squat:"3×5",squatLoad:"140 lb",bulg:"2×8/jambe",hip:"2×10",hinge:"2×10",
      shPress:"2×10",shPressLoad:"très léger",latDb:"2×15",rearDb:"2×15",upright:"2×10",clean:"3×2",cleanLoad:"95-115 lb",wodNote:"facile"}
  })[week] || shouldersV2WeekPlan(1);
}
function shouldersV2Ex(name,format,load,rest,note){return {name:name,format:format,load:charge(name,load||"—"),rest:rest||"—",note:note||""};}
function shouldersV2ExFixed(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function shouldersV2Blocks(day,week){
  var p=shouldersV2WeekPlan(week);
  var isDeload=week===6;

  if(day==="lundi")return [
    {time:"6 min",title:"Échauffement push",tag:"Préparation",kind:"warmup",text:"2 min rameur ou bike. Puis 2 tours : Band External Rotation 12/côté + Scap Push-Up 10 + Empty Bar Strict Press 10."},
    {time:"18 min",title:"A. Strict Press",tag:"Force",kind:"main",exercises:[
      shouldersV2ExFixed("Strict Press",p.press,p.pressLoad,"2:00","Priorité du jour. RPE 7-8. Stop si compensation lombaire.")
    ]},
    {time:"14 min",title:"B. Superset support",tag:"Fonte",kind:"hypertrophy",text:"Un seul bloc support : poussée secondaire + deltoïde latéral. Peu de transition, beaucoup de travail utile.",exercises:[
      shouldersV2ExFixed("Incline DB Press",p.incline,p.inclineLoad,"0:20 avant B2","Haut de pec + deltoïde antérieur. Pas d'échec."),
      shouldersV2Ex("Lateral Raise câble",p.lat,"15-20 lb","1:15 après B2","Tension constante, épaules basses, aucun élan.")
    ]},
    {time:"10 min",title:"C. Triceps",tag:"Fonte",kind:"hypertrophy",exercises:[
      shouldersV2Ex("Weighted Dips",isDeload?"2×6 facile":p.dips,isDeload?"0 lb":"0-45 lb","0:30 avant C2","Lockout propre. 0 lb si poids du corps."),
      shouldersV2Ex("Overhead Rope Extension",p.triOh,"50-60 lb","1:00 après C2","Longue portion triceps. Coudes stables.")
    ]},
    {time:"8 min",title:"D. WOD fonte",tag:"WOD",kind:"wod",text:"AMRAP 8 : 8 DB Bench + 10 KB Swing + 12 Sit-Up. "+p.wodNote+"."},
    {time:"2 min",title:"E. Mini-reset",tag:"Mobilité",kind:"mobility",text:"Pec stretch 45 sec/côté + respiration 30 sec."}
  ];

  if(day==="mardi")return [
    {time:"6 min",title:"Échauffement pull",tag:"Préparation",kind:"warmup",text:"Row facile 2 min. Puis 2 tours : Band Pull-Apart 15 + Scap Ring Row 8 + Face Pull léger 15."},
    {time:"16 min",title:"A. Barbell Row",tag:"Dos",kind:"main",exercises:[
      shouldersV2Ex("Barbell Row",p.row,week>=3&&week<=5?"125 lb":"115 lb","1:45-2:00","Tirage strict, buste solide, pas de swing.")
    ]},
    {time:"14 min",title:"B. Superset dos + biceps",tag:"Fonte",kind:"accessory",exercises:[
      shouldersV2ExFixed("Weighted Pull-up",p.pull,week>=4&&!isDeload?"+15 à +30 lb":"poids du corps","0:20 avant B2","Si remplacé par Ring Row, inscrire Ring Row comme mouvement distinct."),
      shouldersV2Ex("Cable Curl",p.curl,"modéré","1:30 après B2","Contrôle complet, pas d'élan du dos.")
    ]},
    {time:"10 min",title:"C. Rear delt / posture",tag:"Fonte",kind:"accessory",exercises:[
      shouldersV2Ex("Rear Delt Fly câble",p.rear,"15-20 lb","0:30 avant C2","Arrière d'épaule, sans transformer en rowing."),
      shouldersV2Ex("Face Pull",p.face,"60-70 lb","1:00 après C2","Rotation externe, cou relâché.")
    ]},
    {time:"10 min",title:"D. WOD pull / engine",tag:"WOD",kind:"wod",text:"EMOM 10 : min 1 = 12 cal Row ; min 2 = 8-10 Ring Row. "+p.wodNote+". RPE global 7-8, pas de sprint."},
    {time:"2 min",title:"E. Mini-reset",tag:"Mobilité",kind:"mobility",text:"Lat stretch 45 sec/côté + respiration 30 sec."}
  ];

  if(day==="jeudi")return [
    {time:"6 min",title:"Warm-up jambes",tag:"Préparation",kind:"warmup",text:"Bike 2 min + ankle rocks 10/côté + glute bridge 15 + goblet squat léger 10 + montée Front Squat."},
    {time:"18 min",title:"A. Front Squat",tag:"Jambes",kind:"main",exercises:[
      shouldersV2ExFixed("Front Squat",p.squat,p.squatLoad,"2:00","Priorité jambes. RPE 7-8, dos protégé.")
    ]},
    {time:"14 min",title:"B. Superset jambes + core",tag:"Fonte",kind:"accessory",exercises:[
      shouldersV2Ex("Bulgarian Split Squat",p.bulg,"45-55 lb / main","0:30 avant B2","Amplitude propre, genou stable."),
      shouldersV2ExFixed("Dead Bug",isDeload?"2 séries":"3 séries","poids du corps","1:00 après B2","Côtes basses, respiration contrôlée.")
    ]},
    {time:"10 min",title:"C. Chaîne postérieure",tag:"Fonte",kind:"accessory",exercises:[
      shouldersV2Ex("Hip Thrust",p.hip,"225-275 lb","0:30 avant C2","Pause en haut. Fessiers, pas lombaires."),
      shouldersV2Ex("DB RDL",p.hinge,"60-70 lb / main","1:00 après C2","Ischios. Dos neutre. Aucun ego.")
    ]},
    {time:"8 min",title:"D. WOD jambes / engine",tag:"WOD",kind:"wod",text:"For time 21-15-9 : Cal Bike + Box Step-Up. "+p.wodNote+". Cap 8 min. Zéro épaules directes, zéro bras direct."},
    {time:"2 min",title:"E. Mini-reset",tag:"Mobilité",kind:"mobility",text:"Couch stretch 45 sec/côté + respiration 30 sec."}
  ];

  return [
    {time:"6 min",title:"Échauffement épaules",tag:"Préparation",kind:"warmup",text:"2 tours : Band External Rotation 12/côté + Serratus Wall Slide 8 + PVC Pass-through 10. Puis DB Shoulder Press léger 12."},
    {time:"16 min",title:"A. DB Shoulder Press",tag:"Épaules",kind:"main",exercises:[
      shouldersV2ExFixed("DB Shoulder Press",p.shPress,p.shPressLoad,"1:30","Press contrôlé. Si Landmine Press est choisi, le noter comme Landmine Press distinct.")
    ]},
    {time:"14 min",title:"B. Giant set épaules",tag:"Fonte",kind:"accessory",text:"Angle différent du lundi : DB plutôt que câble pour le deltoïde latéral et arrière d'épaule.",exercises:[
      shouldersV2Ex("Lateral Raise DB",p.latDb,"modéré","—","Deltoïde latéral. Aucun élan."),
      shouldersV2Ex("Rear Delt Fly DB",p.rearDb,"modéré","—","Arrière d'épaule. Épaule basse."),
      shouldersV2Ex("Face Pull",p.face,"50-70 lb","1:15 après B3","Posture/scapulas. RPE 7-8.")
    ]},
    {time:"10 min",title:"C. Delts + triceps",tag:"Fonte",kind:"accessory",exercises:[
      shouldersV2Ex("Wide-Grip Cable Upright Row",p.upright,"modéré","0:30 avant C2","Tirer vers bas de poitrine, pas vers le menton. Stop si pincement."),
      shouldersV2Ex("Overhead Rope Extension",p.triOh,"60-70 lb","1:00 après C2","Rappel triceps, RPE 8 max.")
    ]},
    {time:"6 min",title:"D. Power Clean",tag:"Haltéro",kind:"accessory",exercises:[
      shouldersV2ExFixed("Power Clean",p.clean,p.cleanLoad,"1:00","Technique seulement dans ce cycle : vitesse propre, aucune rep grindée.")
    ]},
    {time:"8 min",title:"E. WOD full body court",tag:"WOD",kind:"wod",text:"AMRAP 8 : 5 Power Clean + 8 Wall Balls + 10 cal Row. "+p.wodNote+". Modéré, pas redline."},
    {time:"2 min",title:"F. Mini-reset",tag:"Mobilité",kind:"mobility",text:"Lat stretch 45 sec/côté + respiration 30 sec."}
  ];
}

window.COACH_BERTIN_PROGRAMS.shoulders3d_v2.getBlocks = function(day, week){ return shouldersV2Blocks(day, week); };
window.COACH_BERTIN_PROGRAMS.shoulders3d_v2.getWodText = function(day, week){
  var b = shouldersV2Blocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};
window.COACH_BERTIN_PROGRAMS.shoulders3d_v2.cycleRules = [
  "Même intention que Épaules 3D original : épaules/triceps, posture et overhead stable.",
  "Format midi dense : warm-up court, fonte prioritaire, WOD court obligatoire, mini-reset seulement.",
  "Un mouvement prioritaire par séance. Les autres blocs supportent la priorité sans rallonger inutilement.",
  "Le WOD de fin est un bloc productif de 6 à 10 minutes, pas un extra optionnel.",
  "Les noms de mouvements restent simples; l’intention va dans les notes.",
  "Les anciens noms du cycle Épaules 3D restent lisibles par le moteur via alias de transition."
];
window.COACH_BERTIN_PROGRAMS.shoulders3d_v2.dayIntentions = {
  lundi: "Push + épaules/triceps : Strict Press prioritaire, support DB/câble, triceps, WOD fonte.",
  mardi: "Pull + arrière d'épaule + biceps : Barbell Row prioritaire, tirage, rear delt, EMOM original.",
  jeudi: "Jambes + core : Front Squat prioritaire, chaîne postérieure, For time original sans épaules directes.",
  vendredi: "Épaules 3D angle différent + triceps + Power Clean contrôlé, puis WOD fonte."
};
window.COACH_BERTIN_PROGRAMS.shoulders3d_v2.dayMeta = {
  lundi:   {label:"Lundi",   base:"Push dense",        focus:"Strict Press, Incline DB Press + Lateral Raise câble, triceps, AMRAP 8 fonte."},
  mardi:   {label:"Mardi",   base:"Pull dense",        focus:"Barbell Row, Weighted Pull-up, Cable Curl, Rear Delt Fly câble, Face Pull, EMOM 10 original."},
  jeudi:   {label:"Jeudi",   base:"Jambes + core",     focus:"Front Squat, Bulgarian Split Squat, Hip Thrust, DB RDL, For time 21-15-9 original."},
  vendredi:{label:"Vendredi",base:"Épaules 3D dense", focus:"DB Shoulder Press, Lateral Raise DB, Rear Delt Fly DB, Face Pull, triceps, Power Clean, AMRAP 8 fonte."}
};

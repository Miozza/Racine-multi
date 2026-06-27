// Coach Bertin — Épaules 3D + Press 225 — Phase 2
// Objectif : transformer le gain d'épaules de la Phase 1 en force overhead utilisable, sans sacrifier bench, dos, biceps, jambes ni metcon court.
// Règle : noms de mouvements propres. Les intentions vivent dans les notes, jamais dans les noms.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.shoulders3d_press225_phase2 = {
  id: "shoulders3d_press225_phase2",
  label: "Épaules 3D + Press 225 — Phase 2",
  phase: 2,
  phaseName: "Pont overhead vers Press 225",
  phaseEnd: "à planifier",
  nextPhase: "force_performance",
  impact: "Phase 2 variée sur 6 semaines : overhead lundi, dos/biceps mardi, jambes jeudi, bench/épaules vendredi. Le cycle sert de pont vers Press 225 tout en gardant bench, épaules 3D, dos, biceps, jambes et metcon court quotidien.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Transition", "S2 Volume", "S3 Intensification", "S4 Densité", "S5 Forte", "S6 Consolidation"],
  weekGoals: [
    "Installer le pont vers Press 225. RPE 7-8, aucun grind, repères propres sur push press et bench.",
    "Augmenter le volume utile épaules/dos/jambes sans allonger les séances. Garder les metcons courts.",
    "Monter l'intensité sur press, row, squat et bench. Volume accessoire contrôlé.",
    "Varier les angles et la densité pour éviter la monotonie sans perdre la structure.",
    "Semaine forte du bloc. Charges sérieuses, volume légèrement resserré, aucun ego lift.",
    "Consolider les repères : top sets propres, accessoires réduits, metcons courts. Préparer la suite."
  ],
  sets: ["5×3", "4×8", "6×2", "5×5", "5×2", "top set"],
  targetReps: [3, 8, 2, 5, 2, 3],
  mult: [0.74, 0.70, 0.80, 0.76, 0.84, 0.82],
  rest: "0:30–2:30",
  tag: "phase 2 press 225 bridge",
  versionDate: "2026-06-24",
  versionLabel: "2026-06-24 — Phase 2 variée, Épaules 3D + Press 225"
};

function press225Phase2Plan(week){
  return ({
    1: {
      label:"S1 Transition", note:"Force propre, RPE 7-8.", wodNote:"modéré et propre",
      monMain:"Push Press", monMainFormat:"5×3", monMainLoad:"145-155 lb", monSecond:"Strict Press", monSecondFormat:"3×8", monSecondLoad:"115-125 lb", monLat:"4×15-20", monLatLoad:"20 lb", monTri:"3×12-15", monTriLoad:"50-60 lb", monWod:"AMRAP 8 : 8 DB Bench Press + 10 KB Swing + 8 Burpees.",
      tueMain:"Barbell Row", tueMainFormat:"4×8", tueMainLoad:"175 lb", tuePull:"Weighted Pull-up", tuePullFormat:"4×5", tuePullLoad:"0-20 lb", tueCurl:"3×10-15", tueCurlLoad:"80-90 lb", tueRear:"4×15-20", tueRearLoad:"20 lb", tueFace:"3×15-20", tueFaceLoad:"60-70 lb", tueWod:"EMOM 8 : min 1 = 12 cal Row ; min 2 = 10 Ring Row.",
      thuMain:"Front Squat", thuMainFormat:"5×5", thuMainLoad:"180-190 lb", thuBulg:"3×8/jambe", thuBulgLoad:"40-45 lb / main", thuCore:"3 séries", thuHip:"3×10", thuHipLoad:"225-245 lb", thuHinge:"3×10", thuHingeLoad:"65-70 lb / main", thuWod:"AMRAP 8 : 10 cal Bike + 10 Goblet Squat.",
      friMain:"Bench Press", friMainFormat:"5×5", friMainLoad:"225-235 lb", friPress:"DB Shoulder Press", friPressFormat:"3×10", friPressLoad:"45-50 lb / main", friLat:"4×12-20", friLatLoad:"20 lb", friRear:"4×15-20", friRearLoad:"15-20 lb", friPower:"5×2", friPowerLoad:"135-145 lb", friWod:"AMRAP 7 : 5 Power Clean + 8 Wall Ball + 10 cal Row."
    },
    2: {
      label:"S2 Volume", note:"Volume utile, transitions efficaces.", wodNote:"volume contrôlé",
      monMain:"Strict Press", monMainFormat:"4×8", monMainLoad:"120-125 lb", monSecond:"Incline DB Press", monSecondFormat:"4×8-10", monSecondLoad:"60 lb / main", monLat:"5×12-20", monLatLoad:"20 lb", monTri:"3×12-20", monTriLoad:"70-80 lb", monWod:"AMRAP 8 : 8 DB Push Press + 12 Sit-Up + 10 cal Ski.",
      tueMain:"Pendlay Row", tueMainFormat:"5×5", tueMainLoad:"155-165 lb", tuePull:"Pull-Up", tuePullFormat:"4 séries", tuePullLoad:"poids du corps", tueCurl:"4×10-12", tueCurlLoad:"80-90 lb", tueRear:"3×15-20", tueRearLoad:"20 lb", tueFace:"4×15-20", tueFaceLoad:"60-70 lb", tueWod:"EMOM 8 : min 1 = 10 cal Ski ; min 2 = 10 Knee Raise.",
      thuMain:"Back Squat", thuMainFormat:"4×6", thuMainLoad:"205-215 lb", thuBulg:"3×10/jambe", thuBulgLoad:"35-45 lb / main", thuCore:"3 séries", thuHip:"3×12", thuHipLoad:"225 lb", thuHinge:"4×10", thuHingeLoad:"65-70 lb / main", thuWod:"AMRAP 9 : 10 cal Row + 10 Box Step-Up.",
      friMain:"Bench Press", friMainFormat:"4×8", friMainLoad:"215-225 lb", friPress:"Landmine Press", friPressFormat:"4×8/côté", friPressLoad:"modéré", friLat:"3×15-20", friLatLoad:"20 lb", friRear:"4×15-20", friRearLoad:"20 lb", friPower:"4×2", friPowerLoad:"135 lb", friWod:"AMRAP 8 : 8 DB Bench Press + 8 Burpees over DB."
    },
    3: {
      label:"S3 Intensification", note:"Plus lourd, moins de bruit.", wodNote:"court et solide",
      monMain:"Push Press", monMainFormat:"6×2", monMainLoad:"155-170 lb", monSecond:"Strict Press", monSecondFormat:"3×6", monSecondLoad:"125-130 lb", monLat:"4×12-20", monLatLoad:"20 lb", monTri:"3×12", monTriLoad:"60-70 lb", monWod:"AMRAP 6 : 10 cal Bike + 8 Push-Up.",
      tueMain:"Barbell Row", tueMainFormat:"5×6", tueMainLoad:"180 lb", tuePull:"Weighted Pull-up", tuePullFormat:"5×3", tuePullLoad:"20-30 lb", tueCurl:"3×10-12", tueCurlLoad:"40-45 lb / main", tueRear:"4×15-20", tueRearLoad:"20 lb", tueFace:"4×15-20", tueFaceLoad:"70 lb", tueWod:"EMOM 8 : min 1 = 12 cal Row ; min 2 = 6 Pull-Up.",
      thuMain:"Front Squat", thuMainFormat:"6×3", thuMainLoad:"190-200 lb", thuBulg:"4×8/jambe", thuBulgLoad:"40-45 lb / main", thuCore:"3 séries", thuHip:"4×8", thuHipLoad:"245-275 lb", thuHinge:"3×10", thuHingeLoad:"70 lb / main", thuWod:"AMRAP 8 : 10 cal Bike + 8 Walking Lunge/jambe.",
      friMain:"Bench Press", friMainFormat:"6×3", friMainLoad:"245-255 lb", friPress:"DB Shoulder Press", friPressFormat:"4×8", friPressLoad:"50 lb / main", friLat:"4×15", friLatLoad:"20 lb", friRear:"4×15", friRearLoad:"15-20 lb", friPower:"6×2", friPowerLoad:"145-155 lb", friWod:"AMRAP 7 : 5 Power Clean + 10 cal Row."
    },
    4: {
      label:"S4 Densité", note:"Angles différents, même direction.", wodNote:"dense sans redline",
      monMain:"Strict Press", monMainFormat:"5×5", monMainLoad:"125-135 lb", monSecond:"Seated DB Press", monSecondFormat:"3×10", monSecondLoad:"40-45 lb / main", monLat:"4×15-20", monLatLoad:"20 lb", monTri:"4×12-15", monTriLoad:"70-80 lb", monWod:"AMRAP 9 : 8 DB Bench Press + 10 KB Swing + 12 Air Squat.",
      tueMain:"Pull-Up", tueMainFormat:"5 séries", tueMainLoad:"poids du corps", tuePull:"One-Arm DB Row", tuePullFormat:"4×10/côté", tuePullLoad:"70-85 lb", tueCurl:"4×12", tueCurlLoad:"80-90 lb", tueRear:"4×15-20", tueRearLoad:"20 lb", tueFace:"3×20", tueFaceLoad:"60-70 lb", tueWod:"EMOM 8 : min 1 = 10 cal Ski ; min 2 = 10 Ring Row.",
      thuMain:"Back Squat", thuMainFormat:"5×5", thuMainLoad:"215-225 lb", thuBulg:"3×8/jambe", thuBulgLoad:"45 lb / main", thuCore:"3 séries", thuHip:"4×10", thuHipLoad:"245 lb", thuHinge:"3×12", thuHingeLoad:"60-70 lb / main", thuWod:"AMRAP 8 : 10 cal Row + 8 Box Jump.",
      friMain:"Bench Press", friMainFormat:"5×4", friMainLoad:"245 lb", friPress:"Incline DB Press", friPressFormat:"3×10", friPressLoad:"60-65 lb / main", friLat:"3×15-20", friLatLoad:"20 lb", friRear:"3×15-20", friRearLoad:"15-20 lb", friPower:"4×2", friPowerLoad:"145 lb", friWod:"AMRAP 8 : 10 Wall Ball + 8 Burpees."
    },
    5: {
      label:"S5 Forte", note:"Semaine forte. RPE 8-9 max.", wodNote:"très court et propre",
      monMain:"Push Press", monMainFormat:"5×2", monMainLoad:"170-185 lb", monSecond:"Strict Press", monSecondFormat:"4×4", monSecondLoad:"130-140 lb", monLat:"5×12-20", monLatLoad:"20 lb", monTri:"4×10-12", monTriLoad:"60-70 lb", monWod:"AMRAP 6 : 8 DB Push Press + 10 cal Bike.",
      tueMain:"Barbell Row", tueMainFormat:"5×5", tueMainLoad:"180-190 lb", tuePull:"Weighted Pull-up", tuePullFormat:"5×4", tuePullLoad:"20-30 lb", tueCurl:"4×10", tueCurlLoad:"90 lb", tueRear:"3×20", tueRearLoad:"20 lb", tueFace:"4×15-20", tueFaceLoad:"70 lb", tueWod:"AMRAP 8 : 10 cal Row + 6 Pull-Up.",
      thuMain:"Front Squat", thuMainFormat:"5×3", thuMainLoad:"200-210 lb", thuBulg:"4×8/jambe", thuBulgLoad:"40-45 lb / main", thuCore:"3 séries", thuHip:"4×8", thuHipLoad:"245-275 lb", thuHinge:"3×10", thuHingeLoad:"70 lb / main", thuWod:"AMRAP 7 : 10 cal Bike + 8 Front Rack Lunge.",
      friMain:"Bench Press", friMainFormat:"5×3", friMainLoad:"255-265 lb", friPress:"DB Shoulder Press", friPressFormat:"4×6-8", friPressLoad:"50-55 lb / main", friLat:"4×15", friLatLoad:"20 lb", friRear:"4×15", friRearLoad:"20 lb", friPower:"5×2", friPowerLoad:"155-165 lb", friWod:"AMRAP 7 : 4 Power Clean + 8 Push-Up + 10 cal Row."
    },
    6: {
      label:"S6 Consolidation", note:"Top sets propres, volume réduit.", wodNote:"test contrôlé",
      monMain:"Push Press", monMainFormat:"top set de 2", monMainLoad:"175-195 lb", monSecond:"Strict Press", monSecondFormat:"3×6", monSecondLoad:"120-130 lb", monLat:"3×20", monLatLoad:"15-20 lb", monTri:"3×12", monTriLoad:"50-60 lb", monWod:"AMRAP 8 : 8 DB Bench Press + 10 KB Swing.",
      tueMain:"Barbell Row", tueMainFormat:"top set de 6", tueMainLoad:"180-195 lb", tuePull:"Weighted Pull-up", tuePullFormat:"4×4", tuePullLoad:"20-30 lb", tueCurl:"3×12", tueCurlLoad:"80-90 lb", tueRear:"3×20", tueRearLoad:"15-20 lb", tueFace:"3×20", tueFaceLoad:"60-70 lb", tueWod:"EMOM 8 : min 1 = 10 cal Ski ; min 2 = 10 Ring Row.",
      thuMain:"Front Squat", thuMainFormat:"top set de 3", thuMainLoad:"200-215 lb", thuBulg:"3×8/jambe", thuBulgLoad:"35-40 lb / main", thuCore:"3 séries", thuHip:"3×10", thuHipLoad:"225-245 lb", thuHinge:"2×12", thuHingeLoad:"60-65 lb / main", thuWod:"AMRAP 6 : 10 cal Bike + 12 Air Squat.",
      friMain:"Bench Press", friMainFormat:"top set de 3", friMainLoad:"255-275 lb", friPress:"DB Shoulder Press", friPressFormat:"3×10", friPressLoad:"45-50 lb / main", friLat:"3×20", friLatLoad:"15-20 lb", friRear:"3×20", friRearLoad:"15 lb", friPower:"4×2", friPowerLoad:"135-145 lb", friWod:"AMRAP 8 : 10 Wall Ball + 10 cal Row."
    }
  })[week] || press225Phase2Plan(1);
}

function press225Phase2Ex(name, format, load, rest, note){
  return {name:name, format:format, load:charge(name, load || "—"), rest:rest || "—", note:note || ""};
}
function press225Phase2ExFixed(name, format, load, rest, note){
  return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
}

function press225Phase2Blocks(day, week){
  var p = press225Phase2Plan(week);
  var isWeekSix = Number(week) === 6;

  if(day === "lundi") return [
    {time:"7 min", title:"Échauffement overhead", tag:"Préparation", kind:"warmup", text:"2 min Row ou Bike. Puis 2 tours : Band External Rotation 12/côté + Scap Push-Up 10 + Wall Slide 8. Montée progressive sur le mouvement A."},
    {time:"16 min", title:"A. " + p.monMain, tag:"Overhead", kind:"main", exercises:[
      press225Phase2ExFixed(p.monMain, p.monMainFormat, p.monMainLoad, isWeekSix ? "2:30" : "2:00-2:30", "Priorité overhead du jour. Vitesse propre, gainage solide, stop si compensation lombaire.")
    ]},
    {time:"12 min", title:"B. " + p.monSecond, tag:"Support", kind:"secondary", exercises:[
      press225Phase2ExFixed(p.monSecond, p.monSecondFormat, p.monSecondLoad, "1:30-2:00", "Poussée contrôlée. Garder une marge, ne pas transformer le bloc en test.")
    ]},
    {time:"13 min", title:"C. Delts + triceps", tag:"Hypertrophie", kind:"hypertrophy", exercises:[
      press225Phase2Ex("Lateral Raise câble", p.monLat, p.monLatLoad, "0:30 avant C2", "Tension constante, épaules basses, zéro élan."),
      press225Phase2Ex("Overhead Rope Extension", p.monTri, p.monTriLoad, "1:00 après C2", "Longue portion du triceps. Coudes stables, lockout propre.")
    ]},
    {time:"8 min", title:"D. Metcon", tag:"WOD", kind:"wod", text:p.monWod + " " + p.wodNote + "."},
    {time:"2 min", title:"E. Reset", tag:"Mobilité", kind:"mobility", text:"Pec stretch 45 sec/côté + lat stretch 45 sec/côté + respiration."}
  ];

  if(day === "mardi") return [
    {time:"7 min", title:"Échauffement pull", tag:"Préparation", kind:"warmup", text:"Row facile 2 min. Puis 2 tours : Band Pull-Apart 15 + Scap Pull-Up 6 + Face Pull 15. Montée progressive sur le mouvement A."},
    {time:"16 min", title:"A. " + p.tueMain, tag:"Dos", kind:"main", exercises:[
      press225Phase2ExFixed(p.tueMain, p.tueMainFormat, p.tueMainLoad, "1:45-2:15", "Tirage strict. Le dos doit compenser le volume de poussée du cycle.")
    ]},
    {time:"13 min", title:"B. Tirage + biceps", tag:"Superset", kind:"accessory", exercises:[
      press225Phase2ExFixed(p.tuePull, p.tuePullFormat, p.tuePullLoad, "0:30 avant B2", "Amplitude propre. Si les coudes tirent, réduire la charge ou passer en Ring Row."),
      press225Phase2ExFixed(week === 3 ? "Hammer Curl DB" : "Cable Curl", p.tueCurl, p.tueCurlLoad, "1:15 après B2", "Contrôle complet, épaules basses, pas d'élan du dos.")
    ]},
    {time:"12 min", title:"C. Arrière d'épaule", tag:"Posture", kind:"accessory", exercises:[
      press225Phase2Ex("Rear Delt Fly câble", p.tueRear, p.tueRearLoad, "0:30 avant C2", "Arrière d'épaule. Ne pas transformer en rowing."),
      press225Phase2Ex("Face Pull", p.tueFace, p.tueFaceLoad, "1:00 après C2", "Rotation externe en fin de tirage. Cou relâché.")
    ]},
    {time:"8 min", title:"D. Metcon", tag:"WOD", kind:"wod", text:p.tueWod + " " + p.wodNote + "."},
    {time:"2 min", title:"E. Reset", tag:"Mobilité", kind:"mobility", text:"Lat stretch 45 sec/côté + extension thoracique + respiration."}
  ];

  if(day === "jeudi") return [
    {time:"7 min", title:"Échauffement jambes", tag:"Préparation", kind:"warmup", text:"Bike 2 min + ankle rocks 10/côté + glute bridge 15 + goblet squat 10. Montée progressive sur le mouvement A."},
    {time:"17 min", title:"A. " + p.thuMain, tag:"Jambes", kind:"main", exercises:[
      press225Phase2ExFixed(p.thuMain, p.thuMainFormat, p.thuMainLoad, "2:00-2:30", "Priorité jambes. Dos protégé, reps propres, aucune bataille inutile.")
    ]},
    {time:"13 min", title:"B. Unilatéral + core", tag:"Superset", kind:"accessory", exercises:[
      press225Phase2Ex("Bulgarian Split Squat", p.thuBulg, p.thuBulgLoad, "0:30 avant B2", "Amplitude propre, genou stable."),
      press225Phase2ExFixed(week === 4 ? "Knee Raise" : "Dead Bug", p.thuCore, "poids du corps", "1:00 après B2", "Côtes basses, bassin contrôlé.")
    ]},
    {time:"12 min", title:"C. Chaîne postérieure", tag:"Force", kind:"accessory", exercises:[
      press225Phase2Ex("Hip Thrust", p.thuHip, p.thuHipLoad, "0:30 avant C2", "Pause en haut. Fessiers avant lombaires."),
      press225Phase2Ex("DB RDL", p.thuHinge, p.thuHingeLoad, "1:00 après C2", "Charnière propre, dos neutre, ischios chargés.")
    ]},
    {time:"8 min", title:"D. Metcon", tag:"WOD", kind:"wod", text:p.thuWod + " " + p.wodNote + "."},
    {time:"2 min", title:"E. Reset", tag:"Mobilité", kind:"mobility", text:"Couch stretch 45 sec/côté + respiration."}
  ];

  return [
    {time:"7 min", title:"Échauffement bench", tag:"Préparation", kind:"warmup", text:"Row 2 min. Puis 2 tours : Band Pull-Apart 15 + Push-Up 8 + Empty Bar Bench Press 10. Montée progressive sur le mouvement A."},
    {time:"17 min", title:"A. Bench Press", tag:"Force", kind:"main", exercises:[
      press225Phase2ExFixed("Bench Press", p.friMainFormat, p.friMainLoad, isWeekSix ? "2:30" : "2:00-2:30", "Bench gardé fort sans voler la récupération overhead. Garder 1 rep en réserve.")
    ]},
    {time:"12 min", title:"B. " + p.friPress, tag:"Épaules", kind:"secondary", exercises:[
      press225Phase2ExFixed(p.friPress, p.friPressFormat, p.friPressLoad, "1:30", "Press contrôlé. Volume utile pour transférer vers l'overhead.")
    ]},
    {time:"12 min", title:"C. Delts", tag:"Hypertrophie", kind:"accessory", exercises:[
      press225Phase2Ex("Lateral Raise DB", p.friLat, p.friLatLoad, "0:30 avant C2", "Deltoïde latéral. Aucun élan."),
      press225Phase2Ex("Rear Delt Fly DB", p.friRear, p.friRearLoad, "1:00 après C2", "Arrière d'épaule. Épaule basse.")
    ]},
    {time:"6 min", title:"D. Power Clean", tag:"Puissance", kind:"accessory", exercises:[
      press225Phase2ExFixed("Power Clean", p.friPower, p.friPowerLoad, "1:00", "Vitesse propre. Aucune rep grindée, aucune fatigue nerveuse inutile.")
    ]},
    {time:"8 min", title:"E. Metcon", tag:"WOD", kind:"wod", text:p.friWod + " " + p.wodNote + "."},
    {time:"2 min", title:"F. Reset", tag:"Mobilité", kind:"mobility", text:"Pec stretch 45 sec/côté + lat stretch 45 sec/côté + respiration."}
  ];
}

window.COACH_BERTIN_PROGRAMS.shoulders3d_press225_phase2.getBlocks = function(day, week){ return press225Phase2Blocks(day, week); };
window.COACH_BERTIN_PROGRAMS.shoulders3d_press225_phase2.getWodText = function(day, week){
  var b = press225Phase2Blocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};
window.COACH_BERTIN_PROGRAMS.shoulders3d_press225_phase2.cycleRules = [
  "Cycle varié : chaque semaine garde l'alignement, mais les séances ne sont pas copiées-collées.",
  "60 minutes max : warm-up court, principal, support, accessoires utiles, metcon de 6 à 9 minutes.",
  "Aucun nom de mouvement ne porte une intention. Les intentions restent dans les notes.",
  "Le dos, les biceps et l'arrière d'épaule compensent le volume bench/press.",
  "Les jambes restent une journée complète, pas un simple entretien symbolique.",
  "Heritage 225 reste une branche future plus spécialisée, après ce pont."
];
window.COACH_BERTIN_PROGRAMS.shoulders3d_press225_phase2.dayIntentions = {
  lundi: "Overhead strength + épaules 3D : push press ou strict press, support press, delts, triceps, metcon court.",
  mardi: "Dos + biceps + scapulas : tirage lourd, tirage vertical, curl, rear delts, face pull, metcon court.",
  jeudi: "Jambes + chaîne postérieure + core : squat, unilatéral, hip thrust, DB RDL, metcon court.",
  vendredi: "Bench + épaules + puissance : bench fort, press secondaire, delts, Power Clean, metcon court."
};
window.COACH_BERTIN_PROGRAMS.shoulders3d_press225_phase2.dayMeta = {
  lundi:   {label:"Lundi",   base:"Overhead + delts", focus:"Push Press ou Strict Press, support press, Lateral Raise câble, Overhead Rope Extension, metcon."},
  mardi:   {label:"Mardi",   base:"Dos + biceps",     focus:"Row/Pull-Up, Cable Curl ou Hammer Curl DB, Rear Delt Fly câble, Face Pull, metcon."},
  jeudi:   {label:"Jeudi",   base:"Jambes + core",    focus:"Front Squat ou Back Squat, Bulgarian Split Squat, Hip Thrust, DB RDL, metcon."},
  vendredi:{label:"Vendredi",base:"Bench + épaules",  focus:"Bench Press, DB/Landmine/Incline Press, Lateral Raise DB, Rear Delt Fly DB, Power Clean, metcon."}
};

// Racine — Phase 2 Fable 5 — 8 semaines
// Objectif : force dos/épaules en santé, variété réelle semaine en semaine, progression mesurable sur 3 ancres.
// Méthode : patrons fixes par jour, variations en rotation aux 3 semaines, vague RPE 7→8→9 intra-bloc, S7 deload, S8 tests.
// Ancres testées S8 : Back Squat, Weighted Pull-up, Strict Press (AMRAP @ ~85% → e1RM Epley via moteur existant).
// Règle : noms de mouvements propres. Les intentions vivent dans les notes, jamais dans les noms.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.phase2_fable5 = {
  id: "phase2_fable5",
  label: "Phase 2 — Fable 5",
  phase: 2,
  phaseName: "Bloc conjugué varié — force + dos/épaules",
  phaseEnd: "à planifier",
  nextPhase: "force_performance",
  impact: "Bloc conjugué de 8 semaines : les patrons restent fixes (squat lundi, tirage mardi, poussée jeudi, dynamique vendredi) mais les variations tournent aux 3 semaines. Ratio tirage:poussée 2:1 pour la santé d'épaules, protection lombaire systématique, 3 ancres testées en S8.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Rotation A", "S2 Rotation A+", "S3 Rotation A max", "S4 Rotation B", "S5 Rotation B+", "S6 Rotation B max", "S7 Deload", "S8 Tests"],
  weekGoals: [
    "Installer la rotation A (pause squat, traction lestée, strict press). RPE 7, technique irréprochable, aucun grind.",
    "Même rotation, charges montées. RPE 8. Le volume accessoire dos reste élevé.",
    "Semaine max de la rotation A : 3RM propres sur les trois variations. RPE 9 max, jamais d'échec.",
    "Rotation B (box squat, pendlay row, bench prise serrée). Nouveau stimulus, RPE 7, réapprendre proprement.",
    "Rotation B chargée. RPE 8. Vitesse de barre comme juge : si elle ralentit trop, la charge est trop haute.",
    "Semaine max de la rotation B : 3RM ou 5RM propres. RPE 9 max, garder 1 rep en réserve.",
    "Deload complet : charges légères, volume réduit de moitié, mobilité et posture en priorité.",
    "Tests des 3 ancres : Back Squat, Weighted Pull-up, Strict Press. AMRAP contrôlé, arrêt dès que la technique casse."
  ],
  sets: ["5×3", "4×3", "3RM", "5×3", "4×3", "3RM", "3×5 léger", "AMRAP test"],
  targetReps: [3, 3, 3, 3, 3, 3, 5, 5],
  mult: [0.72, 0.78, 0.85, 0.74, 0.80, 0.87, 0.55, 0.85],
  rest: "0:30–2:30",
  tag: "conjugué force dos épaules",
  versionDate: "2026-07-22",
  versionLabel: "2026-07-22 — Phase 2 Fable 5 V1, bloc 8 semaines"
};

function fable5Plan(week){
  return ({
    1: {
      label:"S1 Rotation A", note:"RPE 7. Installer les variations proprement.", wodNote:"modéré et propre",
      monMain:"Pause Back Squat", monMainFormat:"5×3", monMainLoad:"165-175 lb", monMainNote:"Pause 2 sec au fond, remontée explosive. Zéro rebond, dos verrouillé.",
      monHinge:"3×10", monHingeLoad:"65-70 lb / main", monCore:"3×8", monWod:"AMRAP 8 : 10 cal Bike + 10 Goblet Squat + 8 KB Swing.",
      tueMain:"Weighted Pull-up", tueMainFormat:"5×3", tueMainLoad:"20-25 lb", tueRow:"4×10/côté", tueRowLoad:"70-75 lb", tueRear:"4×15-20", tueRearLoad:"15-20 lb", tueFace:"3×15-20", tueFaceLoad:"60-70 lb", tueWod:"EMOM 8 : min 1 = 12 cal Row ; min 2 = 10 Ring Row.",
      thuMain:"Strict Press", thuMainFormat:"5×3", thuMainLoad:"140-150 lb", thuSecond:"DB Shoulder Press", thuSecondFormat:"3×10", thuSecondLoad:"40-45 lb / main", thuLat:"4×15-20", thuLatLoad:"20 lb", thuWod:"AMRAP 7 : 8 Push-Up + 10 cal Ski + 12 Sit-Up.",
      friClean:"EMOM 8 : 2 Power Clean", friCleanLoad:"160-170 lb", friSpeed:"6×2", friSpeedLoad:"145-155 lb", friWod:"AMRAP 10 : 10 Wall Ball + 10 cal Row + 8 Burpees."
    },
    2: {
      label:"S2 Rotation A+", note:"RPE 8. Mêmes variations, plus lourd.", wodNote:"contrôlé",
      monMain:"Pause Back Squat", monMainFormat:"4×3", monMainLoad:"180-190 lb", monMainNote:"Pause 2 sec. Si le dos arrondit à la remontée, la charge est trop haute.",
      monHinge:"3×10", monHingeLoad:"70 lb / main", monCore:"3×8", monWod:"AMRAP 8 : 12 cal Row + 10 Box Step-Up.",
      tueMain:"Weighted Pull-up", tueMainFormat:"4×3", tueMainLoad:"25-30 lb", tueRow:"4×10/côté", tueRowLoad:"75-80 lb", tueRear:"4×15-20", tueRearLoad:"20 lb", tueFace:"4×15-20", tueFaceLoad:"70 lb", tueWod:"EMOM 8 : min 1 = 10 cal Ski ; min 2 = 8 Ring Row + 5 Scap Pull-Up.",
      thuMain:"Strict Press", thuMainFormat:"4×3", thuMainLoad:"150-155 lb", thuSecond:"Incline DB Press", thuSecondFormat:"3×10", thuSecondLoad:"55-60 lb / main", thuLat:"4×15-20", thuLatLoad:"20 lb", thuWod:"AMRAP 7 : 8 DB Push Press + 10 cal Bike.",
      friClean:"EMOM 9 : 2 Power Clean", friCleanLoad:"165-175 lb", friSpeed:"6×2", friSpeedLoad:"150-160 lb", friWod:"AMRAP 10 : 10 KB Swing + 10 cal Bike + 10 Walking Lunge."
    },
    3: {
      label:"S3 Rotation A max", note:"3RM propres. RPE 9 max, jamais d'échec.", wodNote:"court et propre",
      monMain:"Pause Back Squat", monMainFormat:"montée vers 3RM", monMainLoad:"190-205 lb", monMainNote:"3RM avec pause. Aucune bataille : si la vitesse meurt, c'est fini. Ce chiffre devient ta référence de variation.",
      monHinge:"2×10", monHingeLoad:"65 lb / main", monCore:"3×8", monWod:"AMRAP 6 : 10 cal Bike + 10 Air Squat.",
      tueMain:"Weighted Pull-up", tueMainFormat:"montée vers 3RM", tueMainLoad:"30-40 lb", tueRow:"3×10/côté", tueRowLoad:"75 lb", tueRear:"3×20", tueRearLoad:"20 lb", tueFace:"3×20", tueFaceLoad:"70 lb", tueWod:"EMOM 6 : min 1 = 10 cal Row ; min 2 = 8 Ring Row.",
      thuMain:"Strict Press", thuMainFormat:"montée vers 3RM", thuMainLoad:"155-165 lb", thuSecond:"DB Shoulder Press", thuSecondFormat:"2×10", thuSecondLoad:"40 lb / main", thuLat:"3×15", thuLatLoad:"20 lb", thuWod:"AMRAP 6 : 6 Push-Up + 10 cal Ski.",
      friClean:"EMOM 8 : 2 Power Clean", friCleanLoad:"170-180 lb", friSpeed:"5×2", friSpeedLoad:"150-155 lb", friWod:"AMRAP 8 : 8 Wall Ball + 10 cal Row."
    },
    4: {
      label:"S4 Rotation B", note:"Nouvelles variations. RPE 7, réapprendre proprement.", wodNote:"modéré",
      monMain:"Box Squat", monMainFormat:"5×3", monMainLoad:"185-195 lb", monMainNote:"Box à hauteur parallèle. Assis contrôlé, tibias verticaux, remontée explosive. Protège le dos en limitant la profondeur sous fatigue.",
      monHinge:"3×10", monHingeLoad:"65-70 lb / main", monCore:"3×8", monWod:"AMRAP 8 : 10 cal Row + 8 Box Jump.",
      tueMain:"Pendlay Row", tueMainFormat:"5×5", tueMainLoad:"155-165 lb", tueRow:"4×8", tueRowLoad:"poids du corps", tueRear:"4×15-20", tueRearLoad:"15-20 lb", tueFace:"3×15-20", tueFaceLoad:"60-70 lb", tueWod:"EMOM 8 : min 1 = 12 cal Row ; min 2 = 6 Pull-Up.",
      thuMain:"Close-Grip Bench Press", thuMainFormat:"5×3", thuMainLoad:"205-215 lb", thuSecond:"Strict Press", thuSecondFormat:"3×6", thuSecondLoad:"120-125 lb", thuLat:"4×15-20", thuLatLoad:"20 lb", thuWod:"AMRAP 7 : 8 DB Bench Press + 10 KB Swing.",
      friClean:"EMOM 8 : 2 Power Clean", friCleanLoad:"160-170 lb", friSpeed:"6×2", friSpeedLoad:"150-160 lb", friWod:"AMRAP 10 : 10 cal Bike + 10 Goblet Squat + 8 Burpees."
    },
    5: {
      label:"S5 Rotation B+", note:"RPE 8. Vitesse de barre comme juge.", wodNote:"contrôlé",
      monMain:"Box Squat", monMainFormat:"4×3", monMainLoad:"195-205 lb", monMainNote:"Pas d'affaissement sur la box. Si tu t'écrases, réduis.",
      monHinge:"3×10", monHingeLoad:"70 lb / main", monCore:"3×8", monWod:"AMRAP 8 : 12 cal Bike + 8 Walking Lunge/jambe.",
      tueMain:"Pendlay Row", tueMainFormat:"5×5", tueMainLoad:"165-175 lb", tueRow:"4×8", tueRowLoad:"0-10 lb", tueRear:"4×15-20", tueRearLoad:"20 lb", tueFace:"4×15-20", tueFaceLoad:"70 lb", tueWod:"EMOM 8 : min 1 = 10 cal Ski ; min 2 = 10 Ring Row.",
      thuMain:"Close-Grip Bench Press", thuMainFormat:"4×3", thuMainLoad:"215-225 lb", thuSecond:"Strict Press", thuSecondFormat:"3×6", thuSecondLoad:"125-130 lb", thuLat:"4×15-20", thuLatLoad:"20 lb", thuWod:"AMRAP 7 : 8 DB Push Press + 10 cal Row.",
      friClean:"EMOM 9 : 2 Power Clean", friCleanLoad:"165-180 lb", friSpeed:"6×2", friSpeedLoad:"155-165 lb", friWod:"AMRAP 10 : 5 Power Clean léger + 10 cal Row + 10 Sit-Up."
    },
    6: {
      label:"S6 Rotation B max", note:"3RM/5RM propres. RPE 9 max, 1 rep en réserve.", wodNote:"court et solide",
      monMain:"Box Squat", monMainFormat:"montée vers 3RM", monMainLoad:"205-220 lb", monMainNote:"3RM box squat. Référence de variation, pas un ego lift.",
      monHinge:"2×10", monHingeLoad:"65 lb / main", monCore:"3×8", monWod:"AMRAP 6 : 10 cal Row + 10 Air Squat.",
      tueMain:"Pendlay Row", tueMainFormat:"montée vers 5RM", tueMainLoad:"175-190 lb", tueRow:"3×8", tueRowLoad:"poids du corps", tueRear:"3×20", tueRearLoad:"20 lb", tueFace:"3×20", tueFaceLoad:"70 lb", tueWod:"EMOM 6 : min 1 = 10 cal Row ; min 2 = 8 Ring Row.",
      thuMain:"Close-Grip Bench Press", thuMainFormat:"montée vers 3RM", thuMainLoad:"225-240 lb", thuSecond:"Strict Press", thuSecondFormat:"2×6", thuSecondLoad:"120 lb", thuLat:"3×15", thuLatLoad:"20 lb", thuWod:"AMRAP 6 : 6 Push-Up + 10 cal Bike.",
      friClean:"EMOM 8 : 2 Power Clean", friCleanLoad:"170-180 lb", friSpeed:"5×2", friSpeedLoad:"155-160 lb", friWod:"AMRAP 8 : 8 Wall Ball + 8 cal Row."
    },
    7: {
      label:"S7 Deload", note:"Volume divisé par deux. Mobilité et posture en priorité.", wodNote:"facile, zone 2",
      monMain:"Front Squat", monMainFormat:"3×5", monMainLoad:"135-145 lb", monMainNote:"Léger et propre. Le but est de bouger, pas de charger.",
      monHinge:"2×10", monHingeLoad:"50 lb / main", monCore:"2×8", monWod:"10 min Bike zone 2, conversation possible.",
      tueMain:"Pull-Up", tueMainFormat:"3 séries faciles", tueMainLoad:"poids du corps", tueRow:"2×10/côté", tueRowLoad:"55-60 lb", tueRear:"3×15", tueRearLoad:"15 lb", tueFace:"3×15", tueFaceLoad:"50-60 lb", tueWod:"10 min Row zone 2 + 5 min mobilité thoracique.",
      thuMain:"DB Shoulder Press", thuMainFormat:"3×10", thuMainLoad:"35-40 lb / main", thuSecond:"Push-Up", thuSecondFormat:"3×10", thuSecondLoad:"poids du corps", thuLat:"3×15", thuLatLoad:"15 lb", thuWod:"AMRAP facile 8 : 8 cal Ski + 8 Air Squat + 8 Ring Row.",
      friClean:"EMOM 6 : 2 Power Clean technique", friCleanLoad:"115-135 lb", friSpeed:"4×2", friSpeedLoad:"115-125 lb", friWod:"10 min pacing facile : Bike + Step-Up + Ring Row."
    },
    8: {
      label:"S8 Tests", note:"Tests des 3 ancres. AMRAP contrôlé, arrêt dès que la technique casse.", wodNote:"aucun metcon lourd",
      monMain:"Back Squat", monMainFormat:"AMRAP @ 205 lb", monMainLoad:"205 lb", monMainNote:"TEST ANCRE 1. Échauffement long, puis une seule série AMRAP à 205 lb (~85%). Stop dès que le dos compense. Le moteur calcule le e1RM.",
      monHinge:"2×8 léger", monHingeLoad:"50 lb / main", monCore:"2×8", monWod:"8 min Bike zone 2, récupération.",
      tueMain:"Weighted Pull-up", tueMainFormat:"montée vers 3RM test", tueMainLoad:"30-45 lb", tueRow:"2×10/côté léger", tueRowLoad:"55 lb", tueRear:"2×15", tueRearLoad:"15 lb", tueFace:"2×15", tueFaceLoad:"50 lb", tueWod:"8 min Row zone 2.",
      thuMain:"Strict Press", thuMainFormat:"AMRAP @ 155 lb", thuMainLoad:"155 lb", thuSecond:"Lateral Raise DB", thuSecondFormat:"2×15", thuSecondLoad:"15 lb", thuLat:"2×15", thuLatLoad:"15 lb", thuWod:"8 min Ski ou Bike zone 2.",
      friClean:"Montée optionnelle : Power Clean lourd simple", friCleanLoad:"185-215 lb", friSpeed:"—", friSpeedLoad:"—", friWod:"WOD célébration au choix, 10-12 min, intensité libre. Fin de bloc."
    }
  })[week] || fable5Plan(1);
}

function fable5Ex(name, format, load, rest, note){
  return {name:name, format:format, load:charge(name, load || "—"), rest:rest || "—", note:note || ""};
}
function fable5ExFixed(name, format, load, rest, note){
  return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
}

function fable5Blocks(day, week){
  var p = fable5Plan(week);
  var w = Number(week);
  var isDeload = w === 7;
  var isTest = w === 8;

  if(day === "lundi") return [
    {time:"8 min", title:"Échauffement squat", tag:"Préparation", kind:"warmup", text:"Bike 2 min + ankle rocks 10/côté + glute bridge 15 + goblet squat 10 + 90/90 hanches. Montée progressive longue sur le mouvement A" + (isTest ? " — au moins 6 paliers avant le test" : "") + "."},
    {time:isTest ? "20 min" : "17 min", title:"A. " + p.monMain, tag:isTest ? "TEST ANCRE" : "Effort maximal", kind:"main", exercises:[
      fable5ExFixed(p.monMain, p.monMainFormat, p.monMainLoad, "2:00-2:30", p.monMainNote)
    ]},
    {time:"12 min", title:"B. Chaîne postérieure", tag:"Protection lombaire", kind:"accessory", exercises:[
      fable5ExFixed("DB RDL", p.monHinge, p.monHingeLoad, "0:30 avant B2", "Charnière propre, dos neutre, ischios chargés. Le socle de la protection du dos."),
      fable5ExFixed(isDeload || isTest ? "Dead Bug" : "Pallof Press", p.monCore, "bande ou câble léger", "1:00 après B2", "Anti-rotation et anti-extension. Côtes basses, souffle contrôlé.")
    ]},
    {time:isDeload || isTest ? "10 min" : "8 min", title:"C. Metcon", tag:"WOD", kind:"wod", text:p.monWod + " " + p.wodNote + "."},
    {time:"3 min", title:"D. Reset", tag:"Mobilité", kind:"mobility", text:"Couch stretch 45 sec/côté + décompression suspendue 30 sec + respiration."}
  ];

  if(day === "mardi") return [
    {time:"8 min", title:"Échauffement tirage + posture", tag:"Préparation", kind:"warmup", text:"Row 2 min. Puis 2 tours : Band Pull-Apart 15 + Scap Pull-Up 6 + Wall Slide 8 + extension thoracique sur rouleau 60 sec. Montée progressive sur le mouvement A."},
    {time:"16 min", title:"A. " + p.tueMain, tag:isTest ? "TEST ANCRE" : "Tirage lourd", kind:"main", exercises:[
      fable5ExFixed(p.tueMain, p.tueMainFormat, p.tueMainLoad, "2:00-2:30", isTest ? "TEST ANCRE 2. Montée par paliers de 5 lb vers un 3RM propre. Arrêt au premier signe de kip." : "Tirage strict et lourd. Le dos porte le bloc : c'est lui qui rend les épaules durables.")
    ]},
    {time:"13 min", title:"B. Volume dorsal", tag:"Ratio 2:1", kind:"accessory", exercises:[
      fable5ExFixed("One-Arm DB Row", p.tueRow, p.tueRowLoad, "0:30 avant B2", "Amplitude complète, coude vers la hanche, zéro rotation du tronc."),
      fable5Ex("Rear Delt Fly câble", p.tueRear, p.tueRearLoad, "1:00 après B2", "Arrière d'épaule pur. Ne pas transformer en rowing.")
    ]},
    {time:"10 min", title:"C. Posture + coiffe", tag:"Kyphose", kind:"accessory", exercises:[
      fable5Ex("Face Pull", p.tueFace, p.tueFaceLoad, "0:30 avant C2", "Rotation externe en fin de tirage, cou relâché."),
      fable5ExFixed("Band Pull-Apart", "cumul 100 reps", "bande légère", "au besoin", "Réparties en séries de 15-25. La dette posturale se paie ici, chaque semaine.")
    ]},
    {time:isDeload || isTest ? "10 min" : "8 min", title:"D. Metcon", tag:"WOD", kind:"wod", text:p.tueWod + " " + p.wodNote + "."},
    {time:"3 min", title:"E. Reset", tag:"Mobilité", kind:"mobility", text:"Lat stretch 45 sec/côté + ouverture thoracique sur rouleau 90 sec + respiration."}
  ];

  if(day === "jeudi") return [
    {time:"8 min", title:"Échauffement poussée", tag:"Préparation", kind:"warmup", text:"Row 2 min. Puis 2 tours : Band External Rotation 12/côté + Scap Push-Up 10 + Wall Slide 8. Montée progressive sur le mouvement A" + (isTest ? " — paliers longs avant le test" : "") + "."},
    {time:isTest ? "20 min" : "16 min", title:"A. " + p.thuMain, tag:isTest ? "TEST ANCRE" : "Effort maximal", kind:"main", exercises:[
      fable5ExFixed(p.thuMain, p.thuMainFormat, p.thuMainLoad, "2:00-2:30", isTest ? "TEST ANCRE 3. Une seule série AMRAP à 155 lb (~85%). Stop si le bas du dos cambre ou si la barre dérive vers l'avant." : "Poussée du jour. Gainage solide, aucune compensation lombaire, stop si la vitesse meurt.")
    ]},
    {time:"11 min", title:"B. Poussée support", tag:"Support", kind:"secondary", exercises:[
      fable5ExFixed(p.thuSecond, p.thuSecondFormat, p.thuSecondLoad, "1:30", "Volume utile, jamais un deuxième test.")
    ]},
    {time:"12 min", title:"C. Santé d'épaules — socle fixe", tag:"Coiffe", kind:"accessory", exercises:[
      fable5ExFixed("Cuban Press", "3×10", "15-25 lb total", "0:30 avant C2", "Léger et lent. Rotation externe complète à chaque rep. Ce bloc ne tourne jamais : c'est le socle."),
      fable5Ex("Lateral Raise DB", p.thuLat, p.thuLatLoad, "1:00 après C2", "Deltoïde latéral, aucun élan, épaules basses.")
    ]},
    {time:isDeload || isTest ? "10 min" : "8 min", title:"D. Metcon", tag:"WOD", kind:"wod", text:p.thuWod + " " + p.wodNote + "."},
    {time:"3 min", title:"E. Reset", tag:"Mobilité", kind:"mobility", text:"Pec stretch 45 sec/côté + lat stretch 45 sec/côté + respiration."}
  ];

  return [
    {time:"8 min", title:"Échauffement dynamique", tag:"Préparation", kind:"warmup", text:"Row 2 min + mobilité hanches/épaules + ramp-up technique clean avec barre vide puis 95-135 lb."},
    {time:"12 min", title:"A. Power Clean vitesse", tag:"Effort dynamique", kind:"main", exercises:[
      fable5ExFixed("Power Clean", p.friClean, p.friCleanLoad, "le reste de la minute", isTest ? "Option fin de bloc : montée vers un simple lourd si les jambes sont fraîches, sinon rester technique." : "Vitesse maximale à charge sous-maximale. Chaque rep doit claquer. Une rep lente = fin du bloc.")
    ]},
    {time:"10 min", title:"B. Squat vitesse", tag:"Effort dynamique", kind:"secondary", exercises:[
      fable5ExFixed("Back Squat", p.friSpeed, p.friSpeedLoad, "1:00", isTest ? "Retiré en semaine de tests." : "~60%, descente contrôlée, remontée explosive. Intention de vitesse, pas de charge.")
    ]},
    {time:"12 min", title:"C. Metcon moteur", tag:"WOD", kind:"wod", text:p.friWod + " " + p.wodNote + ". Pont vers janvier 2027 : pacing intelligent, transitions rapides."},
    {time:"3 min", title:"D. Reset", tag:"Mobilité", kind:"mobility", text:"Couch stretch + pec stretch + 10 respirations lentes. Fin de semaine."}
  ];
}

window.COACH_BERTIN_PROGRAMS.phase2_fable5.getBlocks = function(day, week){ return fable5Blocks(day, week); };
window.COACH_BERTIN_PROGRAMS.phase2_fable5.getWodText = function(day, week){
  var b = fable5Blocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};
window.COACH_BERTIN_PROGRAMS.phase2_fable5.cycleRules = [
  "Méthode conjuguée adaptée : patrons fixes par jour, variations en rotation aux 3 semaines (A : S1-3, B : S4-6).",
  "Vague intra-rotation : RPE 7 → 8 → 9. La semaine 3 de chaque rotation monte vers un RM propre, jamais un échec.",
  "S7 deload obligatoire, S8 tests des 3 ancres : Back Squat, Weighted Pull-up, Strict Press (AMRAP/3RM → e1RM Epley).",
  "Ratio tirage:poussée 2:1 chaque semaine. Le Cuban Press et les Band Pull-Apart ne tournent jamais : socle santé d'épaules.",
  "Protection lombaire systématique : pause/box squat pour contrôler la profondeur, DB RDL et anti-rotation chaque lundi.",
  "Chaque variation garde son propre historique de charges. Ne jamais comparer un 3RM pause squat à un 3RM back squat.",
  "60 minutes max par séance : warm-up, principal, accessoires utiles, metcon court."
];
window.COACH_BERTIN_PROGRAMS.phase2_fable5.dayIntentions = {
  lundi: "Effort maximal bas du corps : variation de squat en rotation, chaîne postérieure, gainage anti-rotation, metcon court.",
  mardi: "Tirage lourd + posture : variation de tirage en rotation, volume dorsal 2:1, face pull, 100 band pull-aparts, metcon court.",
  jeudi: "Effort maximal poussée : variation de press en rotation, poussée support, socle fixe santé d'épaules (Cuban Press), metcon court.",
  vendredi: "Effort dynamique : Power Clean vitesse en EMOM, squat vitesse, metcon moteur vers janvier 2027."
};
window.COACH_BERTIN_PROGRAMS.phase2_fable5.dayMeta = {
  lundi:   {label:"Lundi",   base:"Squat max effort",  focus:"Pause Back Squat / Box Squat en rotation, DB RDL, Pallof Press, metcon."},
  mardi:   {label:"Mardi",   base:"Tirage + posture",  focus:"Weighted Pull-up / Pendlay Row en rotation, One-Arm DB Row, Face Pull, Band Pull-Apart, metcon."},
  jeudi:   {label:"Jeudi",   base:"Press max effort",  focus:"Strict Press / Close-Grip Bench en rotation, press support, Cuban Press, Lateral Raise, metcon."},
  vendredi:{label:"Vendredi",base:"Effort dynamique",  focus:"Power Clean EMOM vitesse, Back Squat vitesse, metcon moteur."}
};

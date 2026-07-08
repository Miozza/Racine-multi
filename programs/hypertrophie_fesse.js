// Racine — Programme autonome : Hypertrophie Fessiers (4 semaines)
// Objectif : spécialisation fessiers réaliste, sans frapper les hanches/lombaires lourdement 4 jours de suite.
// Structure : 4 jours/semaine, 4 semaines. Deux vrais stimuli fessiers, un jour support haut du corps/posture, un jour pump/récupération active.
// Règle centrale : progression par RPE/RIR et qualité, pas par charges inventées.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse = {
  id: "hypertrophie_fesse",
  label: "Hypertrophie Fessiers — 4 semaines",
  phase: 0,
  phaseName: "Spécialisation fessiers contrôlée",
  phaseEnd: "4 semaines",
  nextPhase: "shoulders3d",
  impact: "Développer les fessiers avec deux séances stimulantes par semaine, une séance support et une séance pump/récupération. Priorité : tension utile, amplitude, récupération et dos protégé.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Base", "S2 Volume", "S3 Surcharge contrôlée", "S4 Consolidation"],
  weekGoals: [
    "Trouver les charges propres. Garder 3 reps en réserve sur les mouvements lourds.",
    "Ajouter un peu de volume sur les mouvements principaux sans augmenter toutes les charges en même temps.",
    "Semaine la plus stimulante : 1-2 reps en réserve, aucune série grindée, aucun signal lombaire.",
    "Réduire le volume de 30-40 %, garder le mouvement, sortir frais et sans douleur."
  ],
  sets: ["2-3 séries utiles", "3-4 séries utiles", "3-5 séries utiles", "2 séries faciles"],
  targetReps: [10, 10, 8, 10],
  mult: [0.66, 0.70, 0.74, 0.60],
  rest: "1:00–2:30 selon le bloc",
  tag: "fessiers hypertrophie récupérable",
  trainingStyle: "hypertrophy"
};

function gfWeekPlan(week){
  return ({
    1: {
      label:"S1 Base", rir:"3 RIR", mainSets:"3", supportSets:"2", pumpSets:"2", repMain:"8-10", repSupport:"10-12", repPump:"15-25", intensity:"RPE 6-7", note:"Base technique. On doit finir avec l'impression qu'on aurait pu en faire plus."
    },
    2: {
      label:"S2 Volume", rir:"2-3 RIR", mainSets:"4", supportSets:"3", pumpSets:"3", repMain:"8-10", repSupport:"10-12", repPump:"15-25", intensity:"RPE 7", note:"Ajoute surtout du volume, pas une course aux charges."
    },
    3: {
      label:"S3 Surcharge contrôlée", rir:"1-2 RIR", mainSets:"4-5", supportSets:"3", pumpSets:"3-4", repMain:"6-8", repSupport:"8-10", repPump:"12-20", intensity:"RPE 7.5-8", note:"Plus lourd, mais propre. Zéro grind lombaire."
    },
    4: {
      label:"S4 Consolidation", rir:"3-4 RIR", mainSets:"2-3", supportSets:"2", pumpSets:"2", repMain:"8-10", repSupport:"10", repPump:"15-20", intensity:"RPE 6", note:"Volume réduit. Le but est d'assimiler, pas de prouver quelque chose."
    }
  })[week] || {label:"S1 Base", rir:"3 RIR", mainSets:"3", supportSets:"2", pumpSets:"2", repMain:"8-10", repSupport:"10-12", repPump:"15-25", intensity:"RPE 6-7", note:"Base technique."};
}


// Charges numériques des mouvements principaux (V4.5) : %1RM de l'athlète de
// référence par semaine — le scaling par profil ramène chaque client à son
// niveau, puis le moteur RPE ajuste séance après séance.
function gfMainLoad(week, oneRm){
  var pct = {1:0.68, 2:0.71, 3:0.77, 4:0.55}[week] || 0.68;
  return Math.round(oneRm * pct / 5) * 5 + " lb";
}
function gfEx(name, format, load, rest, note){
  return { name:name, format:format, load:load || "—", rest:rest || "—", note:note || "" };
}

function gfBlocks(day, week){
  var p = gfWeekPlan(week);
  var deload = week === 4;

  if(day === "lundi") return [
    { time:"8 min", title:"Warm-up hanches / fessiers", tag:"Préparation", kind:"warmup",
      text:"Bike 3 min + 90/90 hip switch 8/côté + glute bridge 2×12 avec pause + lateral band walk 2×10/côté + 2-3 ramp-up sets du hip thrust." },

    { time:"18 min", title:"A. Hip Thrust — stimulus principal", tag:"Principal", kind:"main",
      exercises:[gfEx("Barbell Hip Thrust", p.mainSets + "×" + p.repMain, gfMainLoad(week, 400) + " (" + p.intensity + ")", "2:00-2:30", "Pause 1 sec en haut. Côtes basses, menton rentré. Arrête la série si le bas du dos compense. " + p.rir)] },

    { time:"13 min", title:"B. Amplitude longue sans ego", tag:"Hypertrophie", kind:"accessory",
      exercises:[
        gfEx("Front-Foot Elevated Split Squat", p.supportSets + "×" + p.repSupport + "/jambe", "modéré, " + p.rir, "0:30 avant B2", "Grand pas. Descente contrôlée. Tu dois sentir l'étirement fessier, pas chercher un record."),
        gfEx("Cable Pull-Through", p.supportSets + "×12-15", "léger à modéré", "1:15 après B2", "Hinge propre. Les bras ne tirent pas.")
      ] },

    { time:"7 min", title:"C. Moyen fessier / stabilité", tag:"Accessoire", kind:"accessory",
      exercises:[gfEx("Cable Hip Abduction", p.pumpSets + "×" + p.repPump + "/côté", "léger", "0:30-0:45", "Brûlure locale OK. Échec inutile.")] },

    { time:"6-8 min", title:"D. Conditioning bas impact", tag:"Conditioning", kind:"wod",
      text:(deload ? "Bike 6 min facile." : "EMOM 8 : min 1 = 10-12 cal bike modéré ; min 2 = 8 KB deadlifts légers.") + " RPE 6-7 max. Le WOD ne doit pas devenir une deuxième séance de jambes." },

    { time:"5 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
      text:"Couch stretch 1 min/côté + pigeon stretch 1 min/côté + respiration 90/90 1 min." }
  ];

  if(day === "mardi") return [
    { time:"8 min", title:"Warm-up posture / haut du corps", tag:"Préparation", kind:"warmup",
      text:"Row facile 3 min + band pull-apart 2×15 + scap push-up 2×10 + dead bug 2×8/côté + activation fessiers légère 1×20." },

    { time:"16 min", title:"A. Haut du corps — maintien force", tag:"Principal", kind:"main",
      exercises:[gfEx("Bench Press", deload ? "3×8" : "4×6-8", "RPE 7, pas d'échec", "2:00", "Garder le haut du corps actif sans ajouter de fatigue aux hanches.")] },

    { time:"14 min", title:"B. Dos / posture", tag:"Secondaire", kind:"accessory",
      exercises:[
        gfEx("Chest-Supported Row", deload ? "2×10" : "3×10-12", "modéré", "0:30 avant B2", "Support poitrine pour ne pas charger le bas du dos."),
        gfEx("Face Pull", deload ? "2×15" : "3×15-20", "léger", "1:00 après B2", "Scapulas arrière/bas, cou relax.")
      ] },

    { time:"8 min", title:"C. Activation fessiers optionnelle", tag:"Préhab", kind:"accessory",
      exercises:[gfEx("Mini-Band Lateral Walk", "2 tours faciles", "bande légère", "0:45", "Seulement activation. Pas une séance fessiers cachée.")] },

    { time:"8-10 min", title:"D. Core et cardio léger", tag:"Core", kind:"wod",
      text:(deload ? "2 tours faciles : 30 sec dead bug + 30 sec side plank/côté." : "AMRAP 9 contrôlé : 8 dead bug/côté + 10 ring rows + 30 sec farmer carry.") + " RPE 6-7. Zéro congestion fessiers recherchée." },

    { time:"5 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
      text:"Child pose breathing 1 min + doorway pec stretch 1 min/côté + hamstring floss léger 1 min/côté." }
  ];

  if(day === "jeudi") return [
    { time:"8 min", title:"Warm-up hinge", tag:"Préparation", kind:"warmup",
      text:"Bike 3 min + hamstring sweep 8/côté + hip airplane assisté 5/côté + KB RDL léger 2×10 + ramp-up RDL." },

    { time:"17 min", title:"A. Hinge — tension longue", tag:"Principal", kind:"main",
      exercises:[gfEx("Romanian Deadlift", p.mainSets + "×" + p.repMain, gfMainLoad(week, 285) + " (" + p.intensity + ")", "2:00-2:30", "Descente lente 2-3 sec. Étirement ischios/fessiers. Stop si le dos devient le moteur. " + p.rir)] },

    { time:"13 min", title:"B. Unilatéral contrôlé", tag:"Hypertrophie", kind:"accessory",
      exercises:[
        gfEx("Step-Up", p.supportSets + "×" + p.repSupport + "/jambe", "modéré", "0:30 avant B2", "Pousser par la jambe sur la box. Pas d'élan avec la jambe arrière."),
        gfEx("Single-Leg Hip Thrust", p.supportSets + "×10-12/jambe", "poids du corps ou DB légère", "1:15 après B2", "Contrôle du bassin. Contraction propre.")
      ] },

    { time:"7 min", title:"C. Pump local court", tag:"Pump", kind:"accessory",
      exercises:[gfEx("Frog Bridge", p.pumpSets + "×" + p.repPump, "léger", "0:45", "Sensation locale, pas d'échec obligatoire.")] },

    { time:"7-9 min", title:"D. Conditioning sans impact", tag:"Conditioning", kind:"wod",
      text:(deload ? "SkiErg 6 min facile." : "9 min contrôlé : 8 cal SkiErg + 8 push-ups + 10 anchored sit-ups.") + " On évite les sauts et les lunges ici pour ne pas cumuler." },

    { time:"5 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
      text:"Hamstring stretch 1 min/côté + adductor rockback 1 min + figure-4 stretch 1 min/côté." }
  ];

  return [
    { time:"8 min", title:"Warm-up récupération active", tag:"Préparation", kind:"warmup",
      text:"Bike ou row facile 4 min + mobilité hanches 2 min + band walk léger 1×12/côté + respiration 90/90 1 min." },

    { time:"14 min", title:"A. Pump fessiers léger", tag:"Accessoire", kind:"main",
      exercises:[gfEx("Hip Thrust", p.pumpSets + "×" + p.repPump, "léger à modéré, RPE 6", "1:00", "Tempo 2-1-2. Aucun grind. Si les hanches sont lourdes, remplacer par glute bridge au sol.")] },

    { time:"14 min", title:"B. Carries + tronc", tag:"Core", kind:"accessory",
      exercises:[
        gfEx("Farmer Carry", deload ? "3×30 sec" : "4×30-40 sec", "lourd mais propre", "0:30 avant B2", "Tronc solide. Pas de compensation lombaire."),
        gfEx("Pallof Press", deload ? "2×10/côté" : "3×10-12/côté", "modéré", "1:00 après B2", "Anti-rotation. Bassin stable.")
      ] },

    { time:"8 min", title:"C. Mobilité active hanches", tag:"Préhab", kind:"accessory",
      exercises:[gfEx("Hip Switch", "2-3 tours", "poids du corps", "0:30", "Qualité d'amplitude. Ce bloc sert à récupérer.")] },

    { time:"8-10 min", title:"D. WOD court non destructeur", tag:"Conditioning", kind:"wod",
      text:(deload ? "Bike 6 min facile + marche légère." : "AMRAP 10 : 10 cal row + 8 DB push press légers + 10 sit-ups.") + " Pas de lunges, pas de deadlift lourd, pas de box jump. RPE 7 max." },

    { time:"5 min", title:"E. Retour au calme", tag:"Mobilité", kind:"mobility",
      text:"Pigeon stretch 1 min/côté + couch stretch 1 min/côté + respiration couchée 1 min." }
  ];
}

window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse.getBlocks = function(day, week){
  return gfBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse.getWodText = function(day, week){
  var b = gfBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse.cycleRules = [
  "Deux vrais jours fessiers par semaine : lundi hip thrust, jeudi hinge. Mardi et vendredi ne doivent pas devenir des séances fessiers lourdes déguisées.",
  "Progression par RPE/RIR : les charges viennent de la performance réelle, pas de chiffres inventés dans le programme.",
  "Volume utile visé : commencer bas, monter progressivement, puis réduire en S4. Si les fessiers ou le bas du dos restent lourds plus de 48 h, retirer une série aux blocs A/B.",
  "Aucune série lourde à l'échec. L'échec est tolérable seulement sur un petit exercice pump, et même là ce n'est pas nécessaire.",
  "Stop ou remplacement si douleur lombaire, douleur hanche vive, compensation majeure ou perte d'amplitude."
];

window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse.dayIntentions = {
  lundi: "Stimulus fessiers principal : hip thrust + amplitude longue, volume contrôlé.",
  mardi: "Support haut du corps/posture : récupération des hanches, maintien de la force générale.",
  jeudi: "Deuxième stimulus fessiers : hinge contrôlé + unilatéral, sans surcharge lombaire.",
  vendredi: "Pump léger, core et récupération active : finir la semaine sans accumuler trop de fatigue."
};

window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse.dayMeta = {
  lundi: "Fessiers lourd récupérable.",
  mardi: "Haut du corps, posture et activation légère.",
  jeudi: "Hinge contrôlé et tension longue.",
  vendredi: "Pump léger, core et récupération."
};

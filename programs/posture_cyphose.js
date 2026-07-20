// Coach Bertin Programme autonome : Posture / Cyphose
// Cycle test 3 semaines : correction cyphose, mobilité scapulo-thoracique,
// trap inférieur, serratus, rotateurs externes, chaîne postérieure et respiration.
// Règle : qualité posturale > charge > score.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.posture = {
  id: "posture",
  label: "Posture / cyphose",
  phase: 0,
  phaseName: "Correction posture / mobilité scapulo-thoracique — 3 semaines",
  impact: "Cycle correctif court : extension thoracique, serratus, trap inférieur, rotateurs externes, haut du dos, hanches et respiration. Les WOD restent contrôlés pour ne pas ajouter de fatigue inutile.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Réaligner", "S2 Renforcer", "S3 Intégrer"],
  weekGoals: [
    "Réapprendre les positions : cage basse, cou relâché, scapulas contrôlées et respiration plus basse.",
    "Augmenter le volume utile : plus de tirage, plus de stabilité overhead, plus de chaîne postérieure sans surcharge lombaire.",
    "Intégrer les gains : charges un peu plus solides, carries, tempo et conditioning contrôlé sans perdre la posture."
  ],
  sets: ["3–4 séries propres", "4 séries contrôlées", "4–5 séries solides"],
  targetReps: [10, 12, 8],
  mult: [0.58, 0.64, 0.70],
  rest: "0:45–2:00 selon le bloc",
  tag: "posture"
};

function postureWeekPlan(week){
  return ({
    1:{
      label:"S1 Réaligner",
      note:"Semaine technique. Tu dois sentir serratus, trap inférieur, haut du dos et hanches, pas le cou ni les lombaires.",
      rowLoad:"110-120 lb",
      hingeLoad:"55-60 lb / main",
      pressLoad:"85-100 lb",
      carryLoad:"modéré",
      hipLoad:"225-255 lb",
      pullLoad:"poids du corps à +10 lb",
      density:"facile à modéré",
      mainSets:"3×10",
      accessorySets:"3×12-15",
      conditioningRpe:"RPE 6"
    },
    2:{
      label:"S2 Renforcer",
      note:"Même structure, plus de volume et un peu plus de charge. Aucun shrug, aucun grind, aucune douleur antérieure d'épaule.",
      rowLoad:"120-130 lb",
      hingeLoad:"60-65 lb / main",
      pressLoad:"95-110 lb",
      carryLoad:"modéré lourd",
      hipLoad:"255-285 lb",
      pullLoad:"+10 à +20 lb",
      density:"modéré",
      mainSets:"4×8-10",
      accessorySets:"3×15-20",
      conditioningRpe:"RPE 6-7"
    },
    3:{
      label:"S3 Intégrer",
      note:"Semaine la plus solide. Charges un peu plus hautes, mais seulement si la posture reste propre. Sinon tu gardes la charge de S2.",
      rowLoad:"130-140 lb",
      hingeLoad:"65-70 lb / main",
      pressLoad:"105-120 lb",
      carryLoad:"lourd propre",
      hipLoad:"275-315 lb",
      pullLoad:"+20 à +30 lb",
      density:"contrôlé solide",
      mainSets:"4×6-8",
      accessorySets:"3×12-15",
      conditioningRpe:"RPE 7 max"
    }
  })[week] || ({
    label:"S1 Réaligner",
    note:"Semaine technique.",
    rowLoad:"110-120 lb",
    hingeLoad:"55-60 lb / main",
    pressLoad:"85-100 lb",
    carryLoad:"modéré",
    hipLoad:"225-255 lb",
    pullLoad:"poids du corps à +10 lb",
    density:"facile à modéré",
    mainSets:"3×10",
    accessorySets:"3×12-15",
    conditioningRpe:"RPE 6"
  });
}

function pstEx(name, format, load, rest, note){
  return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
}

function postureBlocks(day, week){
  var p = postureWeekPlan(week);
  var w1 = week === 1;
  var w3 = week === 3;

  // LUNDI — Haut du dos + serratus
  if(day === "lundi") return [
    {time:"8 min", title:"Warm-up thoracique", tag:"Préparation", kind:"warmup",
     text:"Row facile 2 min + foam roller extension thoracique 6 reps + open book 6/côté + wall slides 2×10 + scap push-up 2×10."},

    {time:"14 min", title:"A. Tirage postural principal", tag:"Dos", kind:"main",
     exercises:[pstEx("Chest Supported Row", p.mainSets, p.rowLoad, w3?"2:00":"1:30", "Poitrine collée. Cou long. Omoplates vers les poches arrière. Aucune impulsion du bas du dos.")]},

    {time:"12 min", title:"B. Serratus + trap inférieur", tag:"Correctif", kind:"accessory",
     text:"Alterner B1 → B2. Repos après B2. Le but est de créer de la qualité, pas de brûler pour rien.",
     exercises:[
       pstEx("Serratus Cable Punch", p.accessorySets + "/côté", w1?"léger":"léger à modéré", "0:30 avant B2", "Cage basse. Protraction complète sans hausser l'épaule."),
       pstEx("Trap-3 Raise", p.accessorySets, "léger", "1:00 après B2", "Pouce vers le haut. Cherche le trap inférieur, pas le trap supérieur.")
     ]},

    {time:"10 min", title:"C. Arrière épaule / rotation externe", tag:"Accessoire", kind:"accessory",
     exercises:[
       pstEx("Face Pull", p.accessorySets, w1?"50-60 lb":"60-75 lb", "0:30", "Tirer vers le visage avec rotation externe en fin."),
       pstEx("Rear Delt Fly DB", p.accessorySets, w1?"15-20 lb":"20-25 lb", "0:45", "Bras longs, épaules basses, aucun swing.")
     ]},

    {time:w3?"10 min":"8 min", title:"D. Conditioning posture", tag:"Conditioning", kind:"wod",
     text:(w1?"EMOM 8 : min 1 = 8 cal row ; min 2 = 8 ring rows stricts.":w3?"EMOM 10 : min 1 = 10 cal row ; min 2 = 10 ring rows stricts.":"EMOM 8 : min 1 = 10 cal row ; min 2 = 10 ring rows stricts.") + " " + p.conditioningRpe + ". Le score ne compte pas si la posture s'effondre."},

    {time:"5 min", title:"E. Mobilité cage", tag:"Mobilité", kind:"mobility",
     text:"Doorway pec stretch 1 min/côté + lat stretch sur rig 1 min/côté + respiration 90/90 1 min."}
  ];

  // MARDI — Hanches + chaîne postérieure + respiration
  if(day === "mardi") return [
    {time:"9 min", title:"Warm-up hanches / colonne", tag:"Préparation", kind:"warmup",
     text:"Bike 3 min + cat-cow 10 reps + world's greatest stretch 5/côté + glute bridge 2×15 + hip airplane assisté 5/côté."},

    {time:"14 min", title:"A. Charnière posturale", tag:"Chaîne postérieure", kind:"main",
     exercises:[pstEx("DB RDL", p.mainSets, p.hingeLoad, w3?"1:45":"1:30", "Dos neutre, lats engagés, étirement ischios. Stop si les lombaires prennent tout.")]},

    {time:"12 min", title:"B. Fessiers + gainage anti-extension", tag:"Correctif", kind:"accessory",
     exercises:[
       pstEx("Hip Thrust", w1?"3×10":w3?"4×8":"4×10", p.hipLoad, "0:45 avant B2", "Pause en haut. Bassin neutre, pas d'hyperextension."),
       pstEx("Dead Bug", w1?"3×8/côté":"3×10/côté", "poids du corps", "1:00 après B2", "Côtes basses, expiration longue, contrôle total.")
     ]},

    {time:"9 min", title:"C. Unilatéral propre", tag:"Accessoire", kind:"accessory",
     exercises:[pstEx("Bulgarian Split Squat", w1?"3×8/jambe":w3?"3×8-10/jambe":"3×10/jambe", w1?"35-40 lb / main":w3?"50-60 lb / main":"40-50 lb / main", "1:00", "Reste haut, bassin stable, genou propre. Ne cherche pas l'échec.")]},

    {time:w3?"12 min":"10 min", title:"D. Zone 2 posture", tag:"Conditioning", kind:"wod",
     text:(w1?"Bike 10 min facile avec posture haute.":w3?"Bike 12 min zone 2 solide avec posture haute.":"Bike 10 min zone 2, un peu plus constant que S1.") + " Toutes les 2 min : 5 respirations lentes cage basse. Aucun sprint."},

    {time:"5 min", title:"E. Mobilité hanches", tag:"Mobilité", kind:"mobility",
     text:"Couch stretch 1 min/côté + hamstring stretch 1 min/côté + respiration crocodile 1 min."}
  ];

  // JEUDI — Overhead mobility + scapula
  if(day === "jeudi") return [
    {time:"9 min", title:"Warm-up overhead", tag:"Préparation", kind:"warmup",
     text:"Row 2 min + PVC pass through 2×10 + wall slides 2×10 + lat stretch 45 sec/côté + scap pull-ups 2×6 + front rack rotations 10 reps."},

    {time:"13 min", title:"A. Press technique posturale", tag:"Overhead", kind:"main",
     exercises:[pstEx("Strict Press", w1?"4×6 technique":w3?"5×5 technique":"4×6-8", p.pressLoad, w3?"2:00":"1:30", "Cage basse, fessiers serrés, trajectoire verticale. Pas de compensation lombaire.")]},

    {time:"12 min", title:"B. Scapula overhead", tag:"Correctif", kind:"accessory",
     exercises:[
       pstEx("Wall Slide", w1?"3×8":"3×10", "poids du corps", "0:30 avant B2", "Lent. Rotation supérieure sans trap supérieur."),
       pstEx("Face Pull External Rotation", p.accessorySets, w1?"léger":"léger à modéré", "1:00 après B2", "Rotation externe propre, coudes hauts, cou relâché.")
     ]},

    {time:"10 min", title:"C. Tirage vertical contrôlé", tag:"Accessoire", kind:"accessory",
     exercises:[
       pstEx("Weighted Pull-up", w1?"3×5 strict":w3?"4×5":"3×6", p.pullLoad, "1:15", "Strict, amplitude propre. Remplacer par ring rows si coudes sensibles."),
       pstEx("Serratus Wall Slide", w1?"3×10":"3×12", "mini-band optionnel", "0:45", "Pousser le mur, cage basse.")
     ]},

    {time:w3?"10 min":"8 min", title:"D. EMOM qualité", tag:"Conditioning", kind:"wod",
     text:(w1?"EMOM 8 : min 1 = 8 cal SkiErg ; min 2 = PVC overhead hold 20 sec.":w3?"EMOM 10 : min 1 = 8-10 cal SkiErg ; min 2 = 6 strict press très légers ou overhead hold 25 sec.":"EMOM 8 : min 1 = 8-10 cal SkiErg ; min 2 = 6 strict press très légers.") + " " + p.conditioningRpe + ". Qualité overhead seulement."},

    {time:"5 min", title:"E. Mobilité overhead", tag:"Mobilité", kind:"mobility",
     text:"Lat stretch 1 min/côté + pec minor stretch 1 min/côté + thoracic extension breathing 1 min."}
  ];

  // VENDREDI — Full body posture + conditioning léger
  return [
    {time:"8 min", title:"Warm-up full body posture", tag:"Préparation", kind:"warmup",
     text:"Row facile 3 min + band pull-aparts 2×20 + goblet squat pry 1 min + hollow body breathing 5 reps + farmer carry léger 2×20 m."},

    {time:"13 min", title:"A. Carry postural", tag:"Gainage", kind:"main",
     exercises:[pstEx("Farmer Carry", w1?"4×30 m":w3?"5×50 m":"5×40 m", p.carryLoad, w3?"1:30":"1:00", "Grandis-toi. Côtes basses, épaules basses, marche contrôlée.")]},

    {time:"12 min", title:"B. Full body correctif", tag:"Correctif", kind:"accessory",
     exercises:[
       pstEx("Goblet Squat", w1?"3×8":w3?"4×8":"3×10", w1?"53 lb":"53-70 lb", "0:30 avant B2", "Tempo 3 sec descente. Torse haut, respiration calme."),
       pstEx("Ring Row", w1?"3×8":w3?"4×8-10":"3×10-12", "poids du corps", "1:00 après B2", "Poitrine aux anneaux, omoplates fortes.")
     ]},

    {time:"10 min", title:"C. Reset scapula / core", tag:"Accessoire", kind:"accessory",
     exercises:[
       pstEx("Pallof Press", w1?"3×10/côté":"3×12/côté", "léger à modéré", "0:30", "Anti-rotation. Bassin stable."),
       pstEx("Band Pull Apart", w1?"3×20":w3?"3×30":"3×25", "élastique", "0:45", "Volume facile, qualité posturale.")
     ]},

    {time:w3?"14 min":"12 min", title:"D. Conditioning léger", tag:"Conditioning", kind:"wod",
     text:(w1?"AMRAP 12 qualité : 8 cal row + 8 air squats tempo + 12 band pull-aparts + 20 m farmer carry léger.":w3?"AMRAP 14 qualité : 10 cal row + 10 air squats tempo + 15 band pull-aparts + 30 m farmer carry léger.":"AMRAP 12 qualité : 10 cal row + 10 air squats tempo + 15 band pull-aparts + 20 m farmer carry léger.") + " " + p.conditioningRpe + ". Respiration et posture > score."},

    {time:"5 min", title:"E. Mobilité finale", tag:"Mobilité", kind:"mobility",
     text:"Open book 1 min/côté + doorway stretch 1 min/côté + lat stretch 1 min + respiration 90/90."}
  ];
}

window.COACH_BERTIN_PROGRAMS.posture.getBlocks = function(day, week){
  return postureBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.posture.getWodText = function(day, week){
  var b = postureBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.posture.cycleRules = [
  "Cycle de 3 semaines : S1 réaligner, S2 renforcer, S3 intégrer.",
  "Objectif posture : sortir plus droit, pas finir détruit.",
  "Le cou doit rester relâché : si les trapèzes supérieurs dominent, baisse la charge.",
  "Cage basse, respiration contrôlée, amplitude propre.",
  "Les conditionings sont légers à modérés : RPE 6-7, aucun redline.",
  "Douleur antérieure d'épaule, irritation coude ou tension cervicale : baisse la charge ou remplace par tirage strict/mobilité."
];

window.COACH_BERTIN_PROGRAMS.posture.dayIntentions = {
  lundi: "Haut du dos et serratus : renforcer ce qui ouvre la cage et ramène les épaules en bonne position.",
  mardi: "Chaîne postérieure et respiration : hanches fortes, bas du dos protégé, cage mieux contrôlée.",
  jeudi: "Overhead propre : améliorer la mobilité scapulo-thoracique sans compenser avec les lombaires.",
  vendredi: "Full body posture : carries, gainage et conditioning léger pour intégrer les positions."
};

window.COACH_BERTIN_PROGRAMS.posture.dayMeta = {
  lundi:   {label:"Lundi",   base:"Haut du dos + serratus", focus:"Scapulas, trap inférieur, serratus, ouverture thoracique."},
  mardi:   {label:"Mardi",   base:"Hanches + respiration",  focus:"Chaîne postérieure, hanches, respiration et posture."},
  jeudi:   {label:"Jeudi",   base:"Overhead + scapula",    focus:"Mobilité overhead, rotateurs externes, contrôle scapulaire."},
  vendredi:{label:"Vendredi",base:"Full body posture",     focus:"Intégrer posture dans mouvements globaux et conditioning léger."}
};

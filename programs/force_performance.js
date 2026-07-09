// Racine 2026-06-09 — Phase 3 : Force + Résistance musculaire (6 semaines)
// Objectif : force réelle + transfert CrossFit. Sortie du PPL strict.
// Architecture : lundi bench force, mardi squat + deadlift contrôlé, jeudi clean + press + skill, vendredi force-résistance.
// Note : cette phase prépare soit Compétition CrossFit Peak — Phase 4, soit un futur bloc Héritage 225 selon l'objectif choisi.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.force_performance = {
  id: "force_performance",
  label: "Force + Résistance musculaire — Phase 3",
  phase: 3,
  phaseName: "Force compétition + seuil musculaire",
  phaseEnd: "juillet 2026",
  nextPhase: "competition_peak",
  alternateNextPhase: "heritage_225",
  impact: "Phase 3 sérieuse : bench lourd, squat lourd, retour du deadlift contrôlé, maintien power clean/strict press, skill gym et force-résistance CrossFit courte. Pas de PPL : la structure sert la performance. Cette phase peut ensuite mener vers Compétition CrossFit Peak — Phase 4 ou vers Héritage 225 selon la priorité.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Base","S2 Volume","S3 Densité","S4 Surcharge","S5 Peak","S6 Deload"],
  weekGoals: [
    "Installer les repères de force. Aucun échec. Technique propre sur bench/squat/deadlift/clean.",
    "Monter le volume lourd. Ajouter de la densité contrôlée sans redline inutile.",
    "Semaine densité : force + résistance musculaire sans voler les lifts.",
    "Surcharge : charges sérieuses, volume accessoire réduit. Priorité qualité.",
    "Peak force : moins de volume, plus lourd. Tester sans se briser.",
    "Deload complet : récupérer et préparer la suite."
  ],
  sets: ["5 x 5","5 x 4","6 x 3","5 x 3","3 x 2 lourd","3 x 5 léger"],
  targetReps: [5,4,3,3,2,5],
  mult: [0.80,0.84,0.87,0.90,0.93,0.65],
  rest: "1:00–3:00",
  tag: "force compétition",
  versionDate: "2026-06-09",
  versionLabel: "2026-06-09 — Phase 3 force/performance, sortie du PPL"
};

function forceWeekPlan(week){
  return ({
    1:{
      label:"S1 Base",note:"RPE 7-8. Reprendre les repères. Zéro échec.",
      bench:"5×5",benchLoad:"195 lb",
      row:"4×6-8",rowLoad:"140 lb",pull:"4×5",pullLoad:"+10 à +25 lb",
      cgb:"3×6-8",cgbLoad:"185 lb",face:"3×15-20",
      squat:"5×5",squatLoad:"235 lb",
      deadlift:"3×5",deadliftLoad:"225-250 lb",
      hip:"3×8-10",hipLoad:"255-275 lb",step:"3×10/jambe",
      clean:"6×2",cleanLoad:"150 lb",
      press:"4×5",pressLoad:"105 lb",
      dip:"4×5",dipLoad:"+10 à +25 lb",ctb:"4×4-6",
      front:"4×5",frontLoad:"205-215 lb",
      dbBench:"3×10",dbBenchLoad:"50 lb / main",carry:"4×40 m",
      wodNote:"court et contrôlé"
    },
    2:{
      label:"S2 Volume",note:"Volume lourd. +5 à +10 lb si S1 était propre.",
      bench:"5×4",benchLoad:"205 lb",
      row:"5×6-8",rowLoad:"145 lb",pull:"5×5",pullLoad:"+15 à +30 lb",
      cgb:"3×6-8",cgbLoad:"195 lb",face:"3×15-20",
      squat:"5×4",squatLoad:"245 lb",
      deadlift:"4×4",deadliftLoad:"250-270 lb",
      hip:"4×8",hipLoad:"275-295 lb",step:"3×12/jambe",
      clean:"7×2",cleanLoad:"160 lb",
      press:"5×4",pressLoad:"110 lb",
      dip:"5×5",dipLoad:"+15 à +30 lb",ctb:"5×4-6",
      front:"4×4",frontLoad:"215-230 lb",
      dbBench:"3×10",dbBenchLoad:"55 lb / main",carry:"4×40 m lourd",
      wodNote:"modéré, pas redline"
    },
    3:{
      label:"S3 Densité",note:"Semaine force + densité. Le cardio ne doit pas voler les lifts.",
      bench:"6×3",benchLoad:"210 lb",
      row:"5×5-6",rowLoad:"155 lb",pull:"5×4-5",pullLoad:"+20 à +35 lb",
      cgb:"3×5-6",cgbLoad:"205 lb",face:"3×15-20",
      squat:"6×3",squatLoad:"260 lb",
      deadlift:"5×3",deadliftLoad:"270-290 lb",
      hip:"4×6-8",hipLoad:"295-315 lb",step:"3×12-15/jambe",
      clean:"8×1",cleanLoad:"170 lb",
      press:"5×3",pressLoad:"115 lb",
      dip:"5×4-5",dipLoad:"+20 à +35 lb",ctb:"5×4-5",
      front:"5×3",frontLoad:"230-240 lb",
      dbBench:"4×8",dbBenchLoad:"55 lb / main",carry:"5×40 m lourd",
      wodNote:"dense mais contrôlé"
    },
    4:{
      label:"S4 Surcharge",note:"Charges sérieuses. RPE 8-9 max. Aucun grind laid.",
      bench:"5×3",benchLoad:"215 lb",
      row:"4×5",rowLoad:"160 lb",pull:"4×4",pullLoad:"+25 à +40 lb",
      cgb:"3×5",cgbLoad:"210-215 lb",face:"2×15-20",
      squat:"5×3",squatLoad:"270 lb",
      deadlift:"4×3",deadliftLoad:"290-315 lb",
      hip:"3×6",hipLoad:"315 lb",step:"3×10/jambe",
      clean:"6×1",cleanLoad:"180 lb",
      press:"5×3",pressLoad:"115 lb",
      dip:"4×3-5",dipLoad:"+25 à +40 lb",ctb:"4×3-5",
      front:"5×3",frontLoad:"240 lb",
      dbBench:"3×8",dbBenchLoad:"55 lb / main",carry:"4×40 m très lourd",
      wodNote:"très court"
    },
    5:{
      label:"S5 Peak",note:"Peak force. Peu de volume. Tu dois finir nerveux, pas détruit.",
      bench:"3×2 lourd",benchLoad:"225-235 lb",
      row:"4×4",rowLoad:"160-170 lb",pull:"4×3 lourd",pullLoad:"+30 à +45 lb",
      cgb:"2×5",cgbLoad:"205 lb",face:"2×15",
      squat:"3×2 lourd",squatLoad:"280-295 lb",
      deadlift:"3×2 lourd propre",deadliftLoad:"315-335 lb",
      hip:"2×6",hipLoad:"295-315 lb",step:"2×10/jambe",
      clean:"5×1 lourd",cleanLoad:"180-190 lb",
      press:"3×2",pressLoad:"120-125 lb",
      dip:"4×3 lourd",dipLoad:"+30 à +45 lb",ctb:"4×3",
      front:"4×2 lourd",frontLoad:"240-255 lb",
      dbBench:"3×6-8",dbBenchLoad:"55 lb / main",carry:"4×30-40 m lourd",
      wodNote:"minimal"
    },
    6:{
      label:"S6 Deload",note:"Deload. Bar speed, mobilité, récupération. Aucun test.",
      bench:"3×5 léger",benchLoad:"170 lb",
      row:"2×8 léger",rowLoad:"110 lb",pull:"3×5 poids du corps",pullLoad:"poids du corps",
      cgb:"2×8 léger",cgbLoad:"155 lb",face:"2×15",
      squat:"3×5 léger",squatLoad:"200 lb",
      deadlift:"2×5 léger",deadliftLoad:"205-225 lb",
      hip:"2×8 léger",hipLoad:"225 lb",step:"2×10/jambe facile",
      clean:"5×2 léger",cleanLoad:"130 lb",
      press:"3×5 léger",pressLoad:"90 lb",
      dip:"3×5 facile",dipLoad:"poids du corps",ctb:"3×4 facile",
      front:"3×5 léger",frontLoad:"165 lb",
      dbBench:"2×10 léger",dbBenchLoad:"40 lb / main",carry:"2×30 m modéré",
      wodNote:"flush facile"
    }
  })[week] || {label:"S1 Base",note:"",bench:"5×5",benchLoad:"195 lb",row:"4×6-8",rowLoad:"140 lb",pull:"4×5",pullLoad:"+10 à +25 lb",cgb:"3×6-8",cgbLoad:"185 lb",face:"3×15-20",squat:"5×5",squatLoad:"235 lb",deadlift:"3×5",deadliftLoad:"225-250 lb",hip:"3×8-10",hipLoad:"255-275 lb",step:"3×10/jambe",clean:"6×2",cleanLoad:"150 lb",press:"4×5",pressLoad:"105 lb",dip:"4×5",dipLoad:"+10 à +25 lb",ctb:"4×4-6",front:"4×5",frontLoad:"205-215 lb",dbBench:"3×10",dbBenchLoad:"50 lb / main",carry:"4×40 m",wodNote:"contrôlé"};
}

function fpEx(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function forcePerformanceBlocks(day,week){
  var p = forceWeekPlan(week);
  var deload = week === 6;
  var peak = week === 5;
  var heavy = week >= 4 && week <= 5;

  // LUNDI — Bench Force + tirage utile.
  if(day === "lundi") return [
    {time:"8 min",title:"Warm-up bench",tag:"Préparation",kind:"warmup",
     text:"Row facile 3 min + band pull-aparts 2×15 + scap push-ups 2×10 + empty bar bench 2×10 + ramp-up bench : 135×5, 185×3, 225×1."},

    {time:"18 min",title:"A. Bench Press",tag:"Force",kind:"main",
     exercises:[fpEx("Bench Press",p.bench,p.benchLoad,heavy?"3:00":"2:30","Objectif force. Pause contrôlée. Stop si la vitesse tombe trop. Aucun échec.")]},

    {time:"13 min",title:"B. Tirage utile",tag:"Force",kind:"accessory",
     text:"Tirage lourd utile pour soutenir le bench, sans Chest Supported Row.",
     exercises:[
       fpEx("Barbell Row",p.row,p.rowLoad,"0:45 avant B2","Dos fort, buste solide, pas de swing."),
       fpEx("Weighted Pull-Up",p.pull,p.pullLoad,"1:45 après B2","Strict. Si les coudes chialent : Ring Row (angle plus difficile).")
     ]},

    {time:"9 min",title:"C. Assistance bench",tag:"Accessoire",kind:"accessory",
     exercises:[
       fpEx("Close-Grip Bench Press",p.cgb,p.cgbLoad,"1:00 avant C2","Triceps fort sans chercher l'échec."),
       fpEx("Face Pull",p.face,"60-70 lb","0:45 après C2","Santé épaules. Rotation externe.")
     ]},

    {time:"6 min",title:"D. Flush optionnel",tag:"Conditioning",kind:"wod",
     text:(deload?"Bike 6 min zone 2 facile.":"Bike 6 min facile nasal. Pas un WOD. Juste faire circuler.")+" "+p.wodNote+"."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Doorway pec stretch 1 min/côté + lat stretch 1 min/côté + thoracic extension 1 min."}
  ];

  // MARDI — Squat + Deadlift contrôlé.
  if(day === "mardi") return [
    {time:"9 min",title:"Warm-up squat / hinge",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + ankle rocks 10/côté + goblet squat 2×10 + glute bridge 2×15 + hip hinge drill 10 + ramp-up squat : barre×8, 135×5, 185×3."},

    {time:"17 min",title:"A. Back Squat",tag:"Force",kind:"main",
     exercises:[fpEx("Back Squat",p.squat,p.squatLoad,heavy?"3:00":"2:30","Force jambes. Dos neutre. Aucun ego lift. Si le dos parle : front squat même effort relatif.")]},

    {time:"13 min",title:"B. Deadlift contrôlé + core",tag:"Force / Core",kind:"accessory",
     text:"Retour du deadlift en Phase 3 : lourd propre, jamais max, jamais grind.",
     exercises:[
       fpEx("Deadlift",p.deadlift,p.deadliftLoad,"0:45 avant B2","Charnière propre, tension avant de tirer. Stop si le bas du dos prend le dessus."),
       fpEx("Dead Bug",deload?"2 séries faciles":"3 séries","poids du corps","1:15 après B2","Côtes basses, gainage avant de recharger la colonne.")
     ]},

    {time:"10 min",title:"C. Chaîne postérieure / legs",tag:"Accessoire",kind:"accessory",
     exercises:[
       fpEx("Hip Thrust",p.hip,p.hipLoad,"0:45 avant C2","Pause 1 sec en haut. Fessiers, pas lombaires."),
       fpEx("Box Step-Up",p.step,deload?"poids du corps":"20-35 lb / main","0:45 après C2","Rythme constant, genou stable.")
     ]},

    {time:deload?"6 min":"8 min",title:"D. Conditioning jambes court",tag:"Conditioning",kind:"wod",
     text:(deload?"Row 6 min facile zone 2.":"EMOM 8 : min 1 = 12 cal bike ; min 2 = 12 KB swings.")+" "+p.wodNote+"."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Couch stretch 1 min/côté + hamstring stretch 1 min/côté + respiration 1 min."}
  ];

  // JEUDI — Clean + Press + Skill.
  if(day === "jeudi") return [
    {time:"10 min",title:"Warm-up haltéro",tag:"Préparation",kind:"warmup",
     text:"Row 3 min + front rack stretch 1 min + tall muscle clean 2×5 + clean pull 2×3 + ramp-up power clean : 95×3, 135×2, 155×1."},

    {time:"16 min",title:"A. Power Clean",tag:"Haltéro",kind:"main",
     exercises:[fpEx("Power Clean",p.clean,p.cleanLoad,peak?"2:00-2:30":"1:30-2:00","Vitesse et réception propre. Zéro grind. Si tu tires avec les bras, baisse.")]},

    {time:"12 min",title:"B. Strict Press",tag:"Force",kind:"accessory",
     exercises:[fpEx("Strict Press",p.press,p.pressLoad,heavy?"2:15":"1:45-2:00","Force verticale. Gainage dur. Pas de compensation lombaire.")]},

    {time:"12 min",title:"C. Skill muscle-up",tag:"Skill",kind:"accessory",
     text:"Qualité stricte. Ce bloc prépare les muscle-ups sans détruire les coudes.",
     exercises:[
       fpEx("Ring Dip",p.dip,p.dipLoad,"0:45 avant C2","Épaules basses. Amplitude propre."),
       fpEx("Chest-to-Bar Pull-Up",p.ctb,"poids du corps","1:15 après C2","Tirage haut. Stop avant la perte de forme.")
     ]},

    {time:deload?"6 min":"10 min",title:"D. Conditioning technique",tag:"Conditioning",kind:"wod",
     text:(deload?"SkiErg 6 min facile.":"EMOM 10 : min 1 = 2 power cleans légers ; min 2 = 6 burpees contrôlés.")+" "+p.wodNote+". Le but est technique sous fatigue légère."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Front rack stretch 1 min + lat stretch 1 min/côté + wrist stretch 1 min."}
  ];

  // VENDREDI — Force-résistance CrossFit courte.
  return [
    {time:"8 min",title:"Warm-up force-résistance",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + PVC pass through 2×10 + air squats 2×10 + empty bar front squat 2×8 + 2 montées progressives sur front squat."},

    {time:"14 min",title:"A. Front Squat",tag:"Force",kind:"main",
     exercises:[fpEx("Front Squat",p.front,p.frontLoad,heavy?"2:30":"2:00","Front rack solide. Transfert clean/thruster. Pas de fail.")]},

    {time:"12 min",title:"B. Push complémentaire + carry",tag:"Accessoire",kind:"accessory",
     text:"Vendredi reste force-résistance : pas de deuxième gros row dans la semaine.",
     exercises:[
       fpEx("DB Bench Press",p.dbBench,p.dbBenchLoad,"0:45 avant B2","Volume push utile sans refaire bench lourd."),
       fpEx("Farmer Carry",p.carry,"lourd propre","1:15 après B2","Gainage, posture haute, grip.")
     ]},

    {time:deload?"8 min":peak?"8 min":"12 min",title:"C. WOD force-résistance",tag:"Conditioning",kind:"wod",
     text:(deload?"AMRAP 8 facile : 8 cal row + 8 air squats + 8 ring rows.":
       peak?"AMRAP 8 : 5 front squats légers + 8 burpees + 10 cal row.":
       week>=3?"AMRAP 12 : 10 wall balls 14 lb + 10 cal row + 8 burpees.":
       "AMRAP 10 : 8 wall balls 14 lb + 10 cal row + 8 ring rows.")+" "+p.wodNote+". Court, spécifique, pas un test Open."},

    {time:"5 min",title:"D. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Lat stretch 1 min/côté + couch stretch 1 min/côté + respiration 1 min."}
  ];
}

window.COACH_BERTIN_PROGRAMS.force_performance.getBlocks = function(day, week){
  return forcePerformanceBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.force_performance.getWodText = function(day, week){
  var b = forcePerformanceBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.force_performance.cycleRules = [
  "Phase 3 sort du PPL : la structure sert la force et le transfert CrossFit.",
  "Architecture : lundi bench force, mardi squat + deadlift contrôlé, jeudi clean + press + skill, vendredi force-résistance courte.",
  "Aucun Chest Supported Row.",
  "Deadlift présent seulement à partir de Phase 3 : lourd propre, jamais max, jamais grind.",
  "Aucun WOD long : les conditionings servent le cycle, ils ne le dominent pas.",
  "Aucun échec sur bench, squat, deadlift, clean ou press.",
  "RPE 9 maximum sur les semaines lourdes; RPE 10 = erreur de gestion.",
  "Si le bas du dos ou les coudes deviennent sensibles : réduire le volume accessoire avant de toucher au mouvement principal.",
  "Après cette phase, choisir selon l'objectif : Compétition CrossFit Peak — Phase 4 ou Héritage 225."
];

window.COACH_BERTIN_PROGRAMS.force_performance.dayIntentions = {
  lundi: "Bench force + tirage utile. Construire la force haut du corps sans WOD destructeur.",
  mardi: "Squat + deadlift contrôlé. Développer jambes, charnière et gainage sans ego lift.",
  jeudi: "Power clean + strict press + skill muscle-up. Force explosive et technique sous fatigue légère.",
  vendredi: "Force-résistance CrossFit courte. Front Squat, push complémentaire, farmer carry et WOD spécifique."
};

window.COACH_BERTIN_PROGRAMS.force_performance.dayMeta = {
  lundi:   {label:"Lundi",   base:"Bench force",          focus:"Bench lourd, barbell row, weighted pull-up, close-grip bench."},
  mardi:   {label:"Mardi",   base:"Squat + Deadlift",     focus:"Back squat, deadlift contrôlé, core, hip thrust, step-up."},
  jeudi:   {label:"Jeudi",   base:"Clean + Press + Skill",focus:"Power clean, strict press, ring dip, chest-to-bar."},
  vendredi:{label:"Vendredi",base:"Force-résistance",     focus:"Front Squat, DB bench, farmer carry, WOD court spécifique."}
};

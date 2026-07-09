// Racine 2026-06-09 — Phase 4 : Compétition CrossFit Peak (8 semaines)
// Objectif : performance CrossFit / Open janvier 2027.
// Logique : pas de PPL, pas d'hypertrophie. Pacing, transitions, barbell cycling, gymnastics, simulations, taper.
// La force est maintenue, le WOD devient central. Aucune séance ne doit détruire les 3 jours suivants.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.competition_peak = {
  id: "competition_peak",
  label: "Compétition CrossFit Peak — Phase 4",
  phase: 4,
  phaseName: "Peaking compétition janvier 2027",
  phaseEnd: "janvier 2027",
  nextPhase: null,
  impact: "Phase compétition : le WOD devient central. Objectif : pacing, transitions, barbell cycling, gymnastics utiles, simulations et taper. La force est maintenue sans grind. Cette phase ne cherche pas à construire du muscle; elle transforme la force acquise en performance CrossFit.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Pacing","S2 Volume Open","S3 Intensité","S4 Chipper","S5 Benchmarks","S6 Simulation","S7 Taper","S8 Compétition"],
  weekGoals: [
    "Construire le pacing. WODs contrôlés, transitions propres, aucune redline inutile.",
    "Volume Open. Plus de densité, WODs 18–24 min, garder la technique sous fatigue.",
    "Intensité courte/moyenne. Apprendre à pousser sans exploser.",
    "Chippers longs. Endurance musculaire et stratégie de cassure obligatoire.",
    "Benchmarks adaptés. Mesurer sans se détruire.",
    "Simulation compétition. Deux efforts dans la semaine, gestion récupération.",
    "Taper. Volume réduit, intensité vive, fraîcheur prioritaire.",
    "Semaine compétition/test. Très peu de volume. Arriver nerveux et frais."
  ],
  sets: ["WOD 15-20","WOD 18-24","WOD 12-20","WOD 25-30","Benchmarks","Simulation","Taper","Compétition"],
  targetReps: [8,8,6,8,5,5,5,3],
  mult: [0.70,0.72,0.75,0.70,0.78,0.72,0.60,0.55],
  rest: "selon WOD",
  tag: "peak compétition",
  versionDate: "2026-06-09",
  versionLabel: "2026-06-09 — Phase 4 compétition peak, pacing/simulation/taper"
};

function cpWeekPlan(week){
  return ({
    1:{label:"S1 Pacing",note:"Rythme contrôlé. Finir en contrôle, pas mort.",clean:"6×2",cleanLoad:"155-165 lb",front:"4×4",frontLoad:"165-175 lb",skill:"base",long:"AMRAP 20",wodNote:"pacing nasal le plus longtemps possible"},
    2:{label:"S2 Volume Open",note:"Volume compétitif. Transitions plus rapides, technique stable.",clean:"7×2",cleanLoad:"165-175 lb",front:"5×3",frontLoad:"175-185 lb",skill:"volume",long:"AMRAP 24",wodNote:"volume Open, pas de sprint au départ"},
    3:{label:"S3 Intensité",note:"Plus intense, moins de bavardage entre les mouvements. Push sans exploser.",clean:"8×1",cleanLoad:"175-190 lb",front:"5×3",frontLoad:"185-195 lb",skill:"intensity",long:"For time",wodNote:"intense avec cassures planifiées"},
    4:{label:"S4 Chipper",note:"Grosse semaine endurance musculaire. Stratégie de cassure obligatoire.",clean:"6×1",cleanLoad:"185-195 lb",front:"4×3",frontLoad:"185-195 lb",skill:"chipper",long:"Chipper 30",wodNote:"long effort, aucune panique"},
    5:{label:"S5 Benchmarks",note:"Benchmarks adaptés. Mesurer, pas prouver ton ego.",clean:"5×1",cleanLoad:"190-205 lb",front:"3×3",frontLoad:"190-200 lb",skill:"benchmark",long:"Benchmark",wodNote:"tester proprement"},
    6:{label:"S6 Simulation",note:"Simulation compétition. Gestion de deux efforts. Récupération active importante.",clean:"4×1",cleanLoad:"185-200 lb",front:"3×2",frontLoad:"185-195 lb",skill:"simulation",long:"Simulation 35",wodNote:"compétition simulée, stratégie avant intensité"},
    7:{label:"S7 Taper",note:"Volume réduit. Garder vitesse et timing. Sortir plus frais que tu es entré.",clean:"5×1 facile",cleanLoad:"155-175 lb",front:"3×2 léger",frontLoad:"155-165 lb",skill:"taper",long:"AMRAP 15",wodNote:"court et vif, jamais destructeur"},
    8:{label:"S8 Compétition",note:"Aucun nouveau stimulus. Activer, respirer, performer.",clean:"3×1 facile",cleanLoad:"135-155 lb",front:"2×2 léger",frontLoad:"135-155 lb",skill:"comp",long:"Test",wodNote:"effort choisi, fraîcheur prioritaire"}
  })[week] || {label:"S1 Pacing",note:"",clean:"6×2",cleanLoad:"155 lb",front:"4×4",frontLoad:"165 lb",skill:"base",long:"AMRAP 20",wodNote:"contrôlé"};
}

function cpEx(name,format,load,rest,note){return {name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}
function cpWarmup(text){return {time:"8 min",title:"Warm-up compétition",tag:"Préparation",kind:"warmup",text:text};}
function cpMob(text){return {time:"5 min",title:"Mobilité / retour au calme",tag:"Mobilité",kind:"mobility",text:text||"Respiration 1 min + lat stretch 1 min/côté + couch stretch 1 min/côté + marche lente."};}

function competitionPeakBlocks(day,week){
  var p = cpWeekPlan(week);
  var taper = week >= 7;
  var simulation = week === 6;
  var benchmark = week === 5;

  // LUNDI — Open court/moyen : wall balls, burpees, row, transitions.
  if(day === "lundi") return [
    cpWarmup("Row facile 3 min + air squats 2×10 + inchworm 6 reps + wall ball léger 2×8 + burpees step-down 2×5 + montée rythme 2 min."),

    {time:"8 min",title:"A. Skill transitions",tag:"Skill",kind:"main",
     exercises:[
       cpEx("Wall Ball",taper?"5×30 sec":"6×40 sec","14 lb","0:40-1:00","Objectif : cycle régulier, respiration, pas de précipitation."),
       cpEx("Burpee",taper?"5×30 sec":"6×40 sec","poids du corps","0:40-1:00","Objectif : transition régulière et respiration stable.")
     ]},

    {time:taper?"12 min":week>=3?"16 min":"15 min",title:"B. WOD Open court",tag:"Conditioning",kind:"wod",
     text:(week===1?"AMRAP 15 : 12 wall balls 14 lb + 10 cal row + 8 burpees." :
       week===2?"AMRAP 18 : 14 wall balls 14 lb + 12 cal row + 10 burpees." :
       week===3?"For time 5 rounds : 12 wall balls 14 lb + 10 burpees + 12 cal row. Cap 16 min." :
       week===4?"AMRAP 18 : 15 wall balls 14 lb + 12 box step-ups + 10 burpees." :
       week===5?"Benchmark style Open — AMRAP 15 : 10 wall balls 14 lb + 10 cal row + 10 burpees." :
       week===6?"AMRAP 16 : 12 wall balls 14 lb + 12 cal row + 8 burpees over line." :
       week===7?"AMRAP 12 : 8 wall balls 14 lb + 8 cal row + 6 burpees. Reste frais." :
       "AMRAP 10 : 6 wall balls 14 lb + 6 cal row + 4 burpees. Activation seulement.")+" "+p.wodNote+"."},

    {time:"7 min",title:"C. Reset moteur",tag:"Recovery",kind:"accessory",
     exercises:[cpEx("Bike",taper?"5 min":"6 min","zone 2","—","Faire redescendre le système. Tu dois finir mieux, pas écrasé.")]},

    cpMob()
  ];

  // MARDI — Gymnastics + engine intervals. Pas une journée pull classique.
  if(day === "mardi") return [
    cpWarmup("SkiErg ou row 3 min + dead hang 2×20 sec + scap pull-up 2×8 + hollow hold 2×20 sec + ring row 2×8 + 3 accélérations de 15 sec."),

    {time:"10 min",title:"A. Gymnastics skill",tag:"Skill",kind:"main",
     exercises:[
       cpEx("Pull-Up",taper?"4×4 facile":benchmark?"5×4":"5×4-6","poids du corps","0:45","Qualité. Stop avant de perdre le rythme."),
       cpEx("Knee Raise",taper?"4×5":"5×6-8","poids du corps","0:45","Garder le tronc serré. Pas de swing incontrôlé.")
     ]},

    {time:week>=4&&!taper?"18 min":taper?"12 min":"16 min",title:"B. Intervalles engine",tag:"Conditioning",kind:"wod",
     text:(week===1?"EMOM 16 : min 1 = 12 cal row ; min 2 = 10 ring rows ; min 3 = 12 cal bike ; min 4 = 10 sit-ups." :
       week===2?"EMOM 20 : min 1 = 14 cal row ; min 2 = 8 pull-ups ; min 3 = 14 cal bike ; min 4 = 12 sit-ups." :
       week===3?"EMOM 16 : min 1 = 15 cal row ; min 2 = 10 burpees ; min 3 = 12 cal ski ; min 4 = 8 pull-ups." :
       week===4?"AMRAP 18 : 12 cal ski + 10 pull-ups/ring rows + 12 sit-ups + 10 box step-ups." :
       week===5?"Helen adapté — 3 rounds for time : 400 m row + 21 KB swings + 12 pull-ups/ring rows. Cap 15 min." :
       week===6?"EMOM 18 : min 1 = 15 cal row ; min 2 = 10 burpees ; min 3 = 10 pull-ups/ring rows." :
       week===7?"EMOM 12 : min 1 = 10 cal row ; min 2 = 6 pull-ups/ring rows ; min 3 = 8 sit-ups." :
       "EMOM 8 : min 1 = 8 cal row ; min 2 = 5 pull-ups/ring rows. Activation.")+" "+p.wodNote+"."},

    {time:"7 min",title:"C. Posture rapide",tag:"Accessoire",kind:"accessory",
     exercises:[
       cpEx("Face Pull",taper?"2×15":"2×15-20","60-70 lb","0:45","Santé épaules, pas un bloc hypertrophie."),
       cpEx("Farmer Carry",taper?"2×30 m":"2×40 m","lourd propre","1:00","Posture haute, respiration contrôlée.")
     ]},

    cpMob("Lat stretch 1 min/côté + pec minor stretch 1 min/côté + respiration 2 min.")
  ];

  // JEUDI — Haltéro + barbell cycling sous fatigue contrôlée.
  if(day === "jeudi") return [
    cpWarmup("Row 3 min + front rack stretch 1 min + tall muscle clean 2×5 + clean pull 2×3 + front squat barre 2×5 + montée clean progressive."),

    {time:"12 min",title:"A. Haltéro maintien",tag:"Haltéro",kind:"main",
     exercises:[cpEx("Power Clean",p.clean,p.cleanLoad,taper?"1:30":"1:30-2:00","Vitesse. Réception propre. Pas de grind pendant une phase compétition.")]},

    {time:"8 min",title:"B. Front Squat / thruster prep",tag:"Force maintien",kind:"accessory",
     exercises:[cpEx("Front Squat",p.front,p.frontLoad,taper?"1:30":"2:00","Maintenir les jambes et le rack. Aucune bataille.")]},

    {time:taper?"10 min":week>=4?"18 min":"14 min",title:"C. WOD haltéro sous fatigue",tag:"Conditioning",kind:"wod",
     text:(week===1?"AMRAP 14 : 6 power cleans légers + 10 wall balls 14 lb + 12 cal row." :
       week===2?"AMRAP 18 : 5 power cleans légers + 10 box step-ups + 12 wall balls 14 lb + 10 cal row." :
       week===3?"For time 21-15-9 : wall balls 14 lb + cal row, puis 15 power cleans légers. Cap 14 min." :
       week===4?"AMRAP 18 : 4 power cleans + 8 front squats légers + 12 burpees + 14 cal row." :
       week===5?"Grace adapté — For time : 30 clean and jerk légers à modérés. Cap 8 min, puis 5 min easy row." :
       week===6?"For time 4 rounds : 10 power cleans légers + 12 wall balls 14 lb + 12 cal row. Cap 18 min." :
       week===7?"AMRAP 10 : 4 power cleans légers + 8 wall balls 14 lb + 8 cal row. Vif, frais." :
       "AMRAP 8 : 3 power cleans légers + 6 wall balls 14 lb + 6 cal row. Activation.")+" "+p.wodNote+"."},

    cpMob("Front rack stretch 1 min + lat stretch 1 min/côté + wrist stretch 1 min + respiration 1 min.")
  ];

  // VENDREDI — WOD long compétition. Cœur de la phase.
  return [
    cpWarmup("Bike/row 4 min + mobilité hanches/épaules 2 min + 2 tours faciles : 6 wall balls + 6 cal row + 4 burpees + 6 box step-ups."),

    {time:taper?"6 min":"7 min",title:"A. Prep spécifique",tag:"Primer",kind:"main",
     exercises:[cpEx("Transitions",taper?"3 tours faciles":"3-4 tours","6 reps / mouvement","0:45","Tester le rythme du WOD sans créer de fatigue.")]},

    {time:week===6?"35 min":week===4?"30 min":week===2?"24 min":week===7?"15 min":week===8?"12 min":week===5?"20 min":"20 min",title:"B. WOD long compétition",tag:"Conditioning",kind:"wod",
     text:(week===1?"AMRAP 20 : 12 wall balls 14 lb + 12 cal row + 10 box step-ups + 8 burpees." :
       week===2?"AMRAP 24 : 15 wall balls 14 lb + 15 cal row + 12 box step-ups + 10 burpees + 8 ring rows." :
       week===3?"For time 5 rounds : 20 cal row + 20 wall balls 14 lb + 15 box step-ups + 10 burpees. Cap 25 min." :
       week===4?"Chipper for time : 50 cal row + 50 wall balls 14 lb + 50 box step-ups + 40 KB swings + 30 burpees + 20 ring rows. Cap 30 min." :
       week===5?"Benchmark long — AMRAP 20 : 5 power cleans légers + 10 wall balls 14 lb + 15 cal row + 20 sit-ups." :
       week===6?"Simulation compétition — For time : 60 cal row + 50 wall balls 14 lb + 40 box step-ups + 30 burpees + 20 power cleans légers + 10 pull-ups/ring rows. Cap 35 min." :
       week===7?"AMRAP 15 : 10 wall balls 14 lb + 10 cal row + 8 box step-ups + 6 burpees. Reste frais." :
       "Test court — AMRAP 12 : 8 wall balls 14 lb + 8 cal row + 6 burpees + 6 sit-ups. Activation compétitive.")+" "+p.wodNote+"."},

    {time:"5 min",title:"C. Cooldown obligatoire",tag:"Recovery",kind:"mobility",
     text:"Marche lente 2 min + respiration nasale 1 min + couch stretch 1 min/côté. Évalue stratégie : départ, cassures, transitions."}
  ];
}

window.COACH_BERTIN_PROGRAMS.competition_peak.getBlocks = function(day, week){
  return competitionPeakBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.competition_peak.getWodText = function(day, week){
  var b = competitionPeakBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.competition_peak.cycleRules = [
  "Phase 4 sort complètement du PPL : compétition, pacing, transitions, simulations, taper.",
  "Le WOD est central; la force est seulement maintenue.",
  "Vendredi = WOD long 15–35 min. Stratégie avant ego.",
  "Aucune séance ne doit te laisser détruit pendant 3 jours.",
  "Les charges haltéro doivent rester rapides. Pas de grind.",
  "Les accessoires existent seulement pour maintenir santé, posture ou grip. Aucun bloc hypertrophie.",
  "S6 = simulation; S7-S8 = taper et fraîcheur prioritaire.",
  "Si une séance dépasse 55-60 min, couper l'accessoire, jamais le WOD central."
];

window.COACH_BERTIN_PROGRAMS.competition_peak.dayIntentions = {
  lundi: "Open court/moyen : wall balls, burpees, row, transitions et pacing.",
  mardi: "Gymnastics + engine intervals : capacité respiratoire et rythme gym sans faire un pull day.",
  jeudi: "Haltéro + barbell cycling : maintenir puissance et technique sous fatigue contrôlée.",
  vendredi: "WOD long compétition : journée centrale de la phase peak, stratégie et pacing."
};

window.COACH_BERTIN_PROGRAMS.competition_peak.dayMeta = {
  lundi:   {label:"Lundi",   base:"Open court/moyen",     focus:"Transitions wall ball/burpee/row, pacing, intensité contrôlée."},
  mardi:   {label:"Mardi",   base:"Gym + engine",         focus:"Pull-ups/TTB progressions, intervalles, respiration."},
  jeudi:   {label:"Jeudi",   base:"Haltéro + WOD moyen", focus:"Power clean, front squat maintien, barbell cycling sous fatigue."},
  vendredi:{label:"Vendredi",base:"WOD long compétition",focus:"Chipper/AMRAP long 15–35 min, stratégie et pacing."}
};

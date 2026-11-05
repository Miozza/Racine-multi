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
    1:{label:"S1 Pacing",note:"Rythme contrôlé. Finir en contrôle, pas mort.",clean:"6×2",cleanLoad:"140-150 lb",front:"4×4",frontLoad:"205-215 lb",skill:"base",long:"AMRAP 20",wodNote:"pacing nasal le plus longtemps possible"},
    2:{label:"S2 Volume Open",note:"Volume compétitif. Transitions plus rapides, technique stable.",clean:"7×2",cleanLoad:"150-160 lb",front:"5×3",frontLoad:"215-230 lb",skill:"volume",long:"AMRAP 24",wodNote:"volume Open, pas de sprint au départ"},
    3:{label:"S3 Intensité",note:"Plus intense, moins de bavardage entre les mouvements. Push sans exploser.",clean:"8×1",cleanLoad:"160-175 lb",front:"5×3",frontLoad:"230-240 lb",skill:"intensity",long:"For time",wodNote:"intense avec cassures planifiées"},
    4:{label:"S4 Chipper",note:"Grosse semaine endurance musculaire. Stratégie de cassure obligatoire.",clean:"6×1",cleanLoad:"170-180 lb",front:"4×3",frontLoad:"230-240 lb",skill:"chipper",long:"Chipper 30",wodNote:"long effort, aucune panique"},
    5:{label:"S5 Benchmarks",note:"Benchmarks adaptés. Mesurer, pas prouver ton ego.",clean:"5×1",cleanLoad:"175-185 lb",front:"3×3",frontLoad:"235-245 lb",skill:"benchmark",long:"Benchmark",wodNote:"tester proprement"},
    6:{label:"S6 Simulation",note:"Simulation compétition. Gestion de deux efforts. Récupération active importante.",clean:"4×1",cleanLoad:"170-180 lb",front:"3×2",frontLoad:"230-240 lb",skill:"simulation",long:"Simulation 35",wodNote:"compétition simulée, stratégie avant intensité"},
    7:{label:"S7 Taper",note:"Volume réduit. Garder vitesse et timing. Sortir plus frais que tu es entré.",clean:"5×1 facile",cleanLoad:"140-160 lb",front:"3×2 léger",frontLoad:"190-205 lb",skill:"taper",long:"AMRAP 15",wodNote:"court et vif, jamais destructeur"},
    8:{label:"S8 Compétition",note:"Aucun nouveau stimulus. Activer, respirer, performer.",clean:"3×1 facile",cleanLoad:"125-140 lb",front:"2×2 léger",frontLoad:"165-190 lb",skill:"comp",long:"Test",wodNote:"effort choisi, fraîcheur prioritaire"}
  })[week] || {label:"S1 Pacing",note:"",clean:"6×2",cleanLoad:"140 lb",front:"4×4",frontLoad:"205 lb",skill:"base",long:"AMRAP 20",wodNote:"contrôlé"};
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
     wod:window.RacineWod.withNote((week===1?{format:"amrap", minutes:15, moves:[{reps:"12", name:"wall balls", load:"20/14 lb"}, {reps:"10", unit:"cal", name:"row"}, {reps:"8", name:"burpees"}]} :
       week===2?{format:"amrap", minutes:18, moves:[{reps:"14", name:"wall balls", load:"20/14 lb"}, {reps:"12", unit:"cal", name:"row"}, {reps:"10", name:"burpees"}]} :
       week===3?{format:"fortime", rounds:5, template:"For time {rounds} rounds : {moves}.", moves:[{reps:"12", name:"wall balls", load:"20/14 lb"}, {reps:"10", name:"burpees"}, {reps:"12", unit:"cal", name:"row"}], note:"Cap 16 min."} :
       week===4?{format:"amrap", minutes:18, moves:[{reps:"15", name:"wall balls", load:"20/14 lb"}, {reps:"12", name:"box step-ups", load:"24/20 po"}, {reps:"10", name:"burpees"}]} :
       week===5?{format:"amrap", minutes:15, template:"Benchmark style Open — AMRAP {minutes} : {moves}.", moves:[{reps:"10", name:"wall balls", load:"20/14 lb"}, {reps:"10", unit:"cal", name:"row"}, {reps:"10", name:"burpees"}]} :
       week===6?{format:"amrap", minutes:16, moves:[{reps:"12", name:"wall balls", load:"20/14 lb"}, {reps:"12", unit:"cal", name:"row"}, {reps:"8", name:"burpees over line"}]} :
       week===7?{format:"amrap", minutes:12, moves:[{reps:"8", name:"wall balls", load:"20/14 lb"}, {reps:"8", unit:"cal", name:"row"}, {reps:"6", name:"burpees"}], note:"Reste frais."} :
       {format:"amrap", minutes:10, moves:[{reps:"6", name:"wall balls", load:"20/14 lb"}, {reps:"6", unit:"cal", name:"row"}, {reps:"4", name:"burpees"}], note:"Activation seulement."}), p.wodNote+".")},

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
     wod:window.RacineWod.withNote((week===1?{format:"emom", style:"sequence", minutes:16, moves:[{reps:"12", unit:"cal", name:"row", minute:1}, {reps:"10", name:"ring rows", minute:2}, {reps:"12", unit:"cal", name:"bike", minute:3}, {reps:"10", name:"sit-ups", minute:4}]} :
       week===2?{format:"emom", style:"sequence", minutes:20, moves:[{reps:"14", unit:"cal", name:"row", minute:1}, {reps:"8", name:"pull-ups", minute:2}, {reps:"14", unit:"cal", name:"bike", minute:3}, {reps:"12", name:"sit-ups", minute:4}]} :
       week===3?{format:"emom", style:"sequence", minutes:16, moves:[{reps:"15", unit:"cal", name:"row", minute:1}, {reps:"10", name:"burpees", minute:2}, {reps:"12", unit:"cal", name:"ski", minute:3}, {reps:"8", name:"pull-ups", minute:4}]} :
       week===4?{format:"amrap", minutes:18, moves:[{reps:"12", unit:"cal", name:"ski"}, {reps:"10", name:"pull-ups", detail:"/ring rows"}, {reps:"12", name:"sit-ups"}, {reps:"10", name:"box step-ups", load:"24/20 po"}]} :
       week===5?{format:"fortime", rounds:3, template:"Helen adapté — {rounds} rounds for time : {moves}.", moves:[{reps:"400", unit:"m", name:"row"}, {reps:"21", name:"KB swings", load:"24/16 kg"}, {reps:"12", name:"pull-ups", detail:"/ring rows"}], note:"Cap 15 min."} :
       week===6?{format:"emom", style:"sequence", minutes:18, moves:[{reps:"15", unit:"cal", name:"row", minute:1}, {reps:"10", name:"burpees", minute:2}, {reps:"10", name:"pull-ups", detail:"/ring rows", minute:3}]} :
       week===7?{format:"emom", style:"sequence", minutes:12, moves:[{reps:"10", unit:"cal", name:"row", minute:1}, {reps:"6", name:"pull-ups", detail:"/ring rows", minute:2}, {reps:"8", name:"sit-ups", minute:3}]} :
       {format:"emom", style:"sequence", minutes:8, moves:[{reps:"8", unit:"cal", name:"row", minute:1}, {reps:"5", name:"pull-ups", detail:"/ring rows", minute:2}], note:"Activation."}), p.wodNote+".")},

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
     wod:window.RacineWod.withNote((week===1?{format:"amrap", minutes:14, moves:[{reps:"6", name:"power cleans", load:"135/95 lb"}, {reps:"10", name:"wall balls", load:"20/14 lb"}, {reps:"12", unit:"cal", name:"row"}]} :
       week===2?{format:"amrap", minutes:18, moves:[{reps:"5", name:"power cleans", load:"135/95 lb"}, {reps:"10", name:"box step-ups", load:"24/20 po"}, {reps:"12", name:"wall balls", load:"20/14 lb"}, {reps:"10", unit:"cal", name:"row"}]} :
       week===3?{format:"fortime", cap:14, ladder:"21-15-9", template:"For time {ladder} : {moves}. Cap {cap} min.", moves:[{name:"wall balls", load:"20/14 lb"}, {unit:"cal", name:"row"}, {reps:"15", name:"power cleans", load:"135/95 lb", join:", puis "}]} :
       week===4?{format:"amrap", minutes:18, moves:[{reps:"4", name:"power cleans", load:"135/95 lb"}, {reps:"8", name:"front squats", load:"135/95 lb"}, {reps:"12", name:"burpees"}, {reps:"14", unit:"cal", name:"row"}]} :
       week===5?{format:"fortime", template:"Grace adapté — For time : {moves}.", sep:", ", moves:[{reps:"30", name:"clean and jerk", load:"135/95 lb"}], note:"Cap 8 min, puis 5 min easy row."} :
       week===6?{format:"fortime", rounds:4, template:"For time {rounds} rounds : {moves}.", moves:[{reps:"10", name:"power cleans", load:"135/95 lb"}, {reps:"12", name:"wall balls", load:"20/14 lb"}, {reps:"12", unit:"cal", name:"row"}], note:"Cap 18 min."} :
       week===7?{format:"amrap", minutes:10, moves:[{reps:"4", name:"power cleans", load:"135/95 lb"}, {reps:"8", name:"wall balls", load:"20/14 lb"}, {reps:"8", unit:"cal", name:"row"}], note:"Vif, frais."} :
       {format:"amrap", minutes:8, moves:[{reps:"3", name:"power cleans", load:"135/95 lb"}, {reps:"6", name:"wall balls", load:"20/14 lb"}, {reps:"6", unit:"cal", name:"row"}], note:"Activation."}), p.wodNote+".")},

    cpMob("Front rack stretch 1 min + lat stretch 1 min/côté + wrist stretch 1 min + respiration 1 min.")
  ];

  // VENDREDI — WOD long compétition. Cœur de la phase.
  return [
    cpWarmup("Bike/row 4 min + mobilité hanches/épaules 2 min + 2 tours faciles : 6 wall balls + 6 cal row + 4 burpees + 6 box step-ups."),

    {time:taper?"6 min":"7 min",title:"A. Prep spécifique",tag:"Primer",kind:"main",
     exercises:[cpEx("Transitions",taper?"3 tours faciles":"3-4 tours","6 reps / mouvement","0:45","Tester le rythme du WOD sans créer de fatigue.")]},

    {time:week===6?"35 min":week===4?"30 min":week===2?"24 min":week===7?"15 min":week===8?"12 min":week===5?"20 min":"20 min",title:"B. WOD long compétition",tag:"Conditioning",kind:"wod",
     wod:window.RacineWod.withNote((week===1?{format:"amrap", minutes:20, moves:[{reps:"12", name:"wall balls", load:"20/14 lb"}, {reps:"12", unit:"cal", name:"row"}, {reps:"10", name:"box step-ups", load:"24/20 po"}, {reps:"8", name:"burpees"}]} :
       week===2?{format:"amrap", minutes:24, moves:[{reps:"15", name:"wall balls", load:"20/14 lb"}, {reps:"15", unit:"cal", name:"row"}, {reps:"12", name:"box step-ups", load:"24/20 po"}, {reps:"10", name:"burpees"}, {reps:"8", name:"ring rows"}]} :
       week===3?{format:"fortime", rounds:5, template:"For time {rounds} rounds : {moves}.", moves:[{reps:"20", unit:"cal", name:"row"}, {reps:"20", name:"wall balls", load:"20/14 lb"}, {reps:"15", name:"box step-ups", load:"24/20 po"}, {reps:"10", name:"burpees"}], note:"Cap 25 min."} :
       week===4?{format:"fortime", template:"Chipper for time : {moves}.", moves:[{reps:"50", unit:"cal", name:"row"}, {reps:"50", name:"wall balls", load:"20/14 lb"}, {reps:"50", name:"box step-ups", load:"24/20 po"}, {reps:"40", name:"KB swings", load:"24/16 kg"}, {reps:"30", name:"burpees"}, {reps:"20", name:"ring rows"}], note:"Cap 30 min."} :
       week===5?{format:"amrap", minutes:20, template:"Benchmark long — AMRAP {minutes} : {moves}.", moves:[{reps:"5", name:"power cleans", load:"135/95 lb"}, {reps:"10", name:"wall balls", load:"20/14 lb"}, {reps:"15", unit:"cal", name:"row"}, {reps:"20", name:"sit-ups"}]} :
       week===6?{format:"fortime", template:"Simulation compétition — For time : {moves}.", moves:[{reps:"60", unit:"cal", name:"row"}, {reps:"50", name:"wall balls", load:"20/14 lb"}, {reps:"40", name:"box step-ups", load:"24/20 po"}, {reps:"30", name:"burpees"}, {reps:"20", name:"power cleans", load:"135/95 lb"}, {reps:"10", name:"pull-ups", detail:"/ring rows"}], note:"Cap 35 min."} :
       week===7?{format:"amrap", minutes:15, moves:[{reps:"10", name:"wall balls", load:"20/14 lb"}, {reps:"10", unit:"cal", name:"row"}, {reps:"8", name:"box step-ups", load:"24/20 po"}, {reps:"6", name:"burpees"}], note:"Reste frais."} :
       {format:"amrap", minutes:12, template:"Test court — AMRAP {minutes} : {moves}.", moves:[{reps:"8", name:"wall balls", load:"20/14 lb"}, {reps:"8", unit:"cal", name:"row"}, {reps:"6", name:"burpees"}, {reps:"6", name:"sit-ups"}], note:"Activation compétitive."}), p.wodNote+".")},

    {time:"5 min",title:"C. Cooldown obligatoire",tag:"Recovery",kind:"mobility",
     text:"Marche lente 2 min + respiration nasale 1 min + couch stretch 1 min/côté. Évalue stratégie : départ, cassures, transitions."}
  ];
}

window.COACH_BERTIN_PROGRAMS.competition_peak.getBlocks = function(day, week){
  return window.RacineWod.fill(competitionPeakBlocks(day, week));
};

window.COACH_BERTIN_PROGRAMS.competition_peak.getWodText = function(day, week){
  var b = window.COACH_BERTIN_PROGRAMS.competition_peak.getBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
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

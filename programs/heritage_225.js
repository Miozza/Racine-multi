// Coach Bertin 2026-06-09 — Héritage 225 v2 (16 semaines)
// Statut : PROJET FUTUR — parcours majeur après Phase 3 si la route Héritage est choisie.
// Mission : vieillir fort, mobile, explosif et capable.
// Objectifs marqueurs : Push Press 225 lb + Bench Press 315 lb, seulement si le corps est prêt.
// Hommage à Théodore (Théo). Le chiffre se mérite; il ne se force pas.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function wk(i){ return Math.max(1, Math.min(16, Number(i)||1)); }
  function blockOf(week){
    week = wk(week);
    if(week <= 4) return 1;
    if(week <= 8) return 2;
    if(week <= 12) return 3;
    return 4;
  }
  function isDeload(week){ return week===4 || week===8 || week===12; }
  function isTest(week){ return week===16; }

  var weekLabels = [
    "S1 Socle", "S2 Technique+", "S3 Volume propre", "S4 Deload",
    "S5 Construction", "S6 Force", "S7 Force lourde", "S8 Deload",
    "S9 Spécifique", "S10 Singles", "S11 Pré-peak", "S12 Deload",
    "S13 Héritage I", "S14 Héritage II", "S15 Pré-test", "S16 Évaluation"
  ];

  var weekGoals = [
    "Bâtir le socle : technique, mobilité, stabilité, aucune rep grindée.",
    "Augmenter légèrement le volume sans irriter épaules, coudes ou bas du dos.",
    "Semaine de volume propre : devenir plus solide, pas plus cassé.",
    "Deload : récupérer, garder vitesse et mobilité.",
    "Construire la force spécifique : jambes, triceps, lockout, bench.",
    "Charges sérieuses mais propres. RPE 8 max sur les mouvements principaux.",
    "Force lourde contrôlée. Aucune bataille inutile.",
    "Deload : consolidation technique et récupération.",
    "Transformer la force en push press et bench lourds.",
    "Singles propres : confiance, vitesse, trajectoire.",
    "Dernière grosse exposition contrôlée. Garder de la fraîcheur.",
    "Deload nerveux : vitesse, mobilité, sommeil.",
    "Héritage I : singles faciles, corps frais, confiance.",
    "Héritage II : singles modérés, aucun ego.",
    "Pré-test : 205/215 doivent être propres, sinon pas de test.",
    "Évaluation Héritage : 225/315 autorisés seulement si les barres précédentes sont propres."
  ];

  function ppPlan(week){
    week = wk(week);
    if(week===1) return {format:"5×5", load:"RPE 7 / ~70%", rest:"2:00-2:30", note:"Dip vertical, drive agressif, lockout propre. Aucun grind."};
    if(week===2) return {format:"5×5", load:"+5 lb si S1 propre", rest:"2:00-2:30", note:"Même vitesse. Si le tronc plie, ne monte pas."};
    if(week===3) return {format:"6×4", load:"RPE 8", rest:"2:15-2:45", note:"Volume propre. Stop si trapèze, épaule ou coude parle."};
    if(week===4) return {format:"3×5", load:"60-65%", rest:"1:45-2:00", note:"Deload. Vitesse et trajectoire seulement."};
    if(week===5) return {format:"5×3", load:"RPE 8", rest:"2:30", note:"Force spécifique. Toutes les reps doivent être identiques."};
    if(week===6) return {format:"6×3", load:"+5 lb si S5 propre", rest:"2:30-3:00", note:"Solide, mais pas de max."};
    if(week===7) return {format:"6×2", load:"RPE 8-9", rest:"3:00", note:"Plus lourd. Si la barre ralentit trop, couper une série."};
    if(week===8) return {format:"3×3", load:"60-65%", rest:"2:00", note:"Deload. Rien à prouver."};
    if(week===9) return {format:"6×1", load:"RPE 8", rest:"2:30-3:00", note:"Singles propres, rapides, aucune lutte."};
    if(week===10) return {format:"7×1", load:"RPE 8-8.5", rest:"3:00", note:"Approche lourde. Lockout stable 2 sec."};
    if(week===11) return {format:"5×1", load:"RPE 8.5-9", rest:"3:00", note:"Dernier lourd. Objectif confiance, pas fatigue."};
    if(week===12) return {format:"3×2", load:"60%", rest:"1:30-2:00", note:"Deload nerveux. Bar speed."};
    if(week===13) return {format:"5×1", load:"75-82%", rest:"2:30", note:"Singles faciles. Le corps doit ressortir mieux."};
    if(week===14) return {format:"4×1", load:"82-88%", rest:"3:00", note:"Singles modérés. Aucun grind."};
    if(week===15) return {format:"3×1", load:"185 → 205 → 215 si propre", rest:"3:00", note:"Pré-test. 215 doit être propre pour autoriser 225 en S16."};
    return {format:"Évaluation", load:"185 → 205 → 215 → 225 si autorisé", rest:"3:00-4:00", note:"225 seulement si 205 rapide et 215 propre. Sinon 215/220 qualité = réussite."};
  }

  function benchPlan(week){
    week = wk(week);
    if(week===1) return {format:"5×5", load:"RPE 7 / ~72%", rest:"2:00-2:30", note:"Bench technique. Pause courte, trajectoire stable."};
    if(week===2) return {format:"5×5", load:"+5 lb si S1 propre", rest:"2:00-2:30", note:"Contrôle identique, pas d'échec."};
    if(week===3) return {format:"4×6", load:"RPE 8", rest:"2:30", note:"Volume fort, épaules stables."};
    if(week===4) return {format:"3×5", load:"60-65%", rest:"1:45", note:"Deload, vitesse."};
    if(week===5) return {format:"5×4", load:"RPE 8", rest:"2:30", note:"Force de base vers 315."};
    if(week===6) return {format:"6×3", load:"RPE 8", rest:"2:30-3:00", note:"Triples solides, aucune rep laide."};
    if(week===7) return {format:"5×3", load:"RPE 8-9", rest:"3:00", note:"Lourd contrôlé."};
    if(week===8) return {format:"3×5", load:"60-65%", rest:"1:45", note:"Deload."};
    if(week===9) return {format:"5×2", load:"RPE 8", rest:"3:00", note:"Doubles propres, vitesse."};
    if(week===10) return {format:"6×1", load:"RPE 8-8.5", rest:"3:00", note:"Singles contrôlés."};
    if(week===11) return {format:"4×1", load:"RPE 8.5-9", rest:"3:00", note:"Dernière exposition lourde."};
    if(week===12) return {format:"3×3", load:"60%", rest:"1:30", note:"Deload nerveux."};
    if(week===13) return {format:"4×1", load:"80-85%", rest:"3:00", note:"Singles faciles."};
    if(week===14) return {format:"3×1", load:"85-90%", rest:"3:00", note:"Singles modérés."};
    if(week===15) return {format:"2-3×1", load:"285 → 300 si propre", rest:"3:00-4:00", note:"300 doit être solide pour autoriser 315 en S16."};
    return {format:"Évaluation", load:"275 → 295 → 305 → 315 si autorisé", rest:"3:00-4:00", note:"315 seulement si 305 est propre et rapide. Sinon 305/310 qualité = réussite."};
  }

  function speedPP(week){
    week = wk(week);
    if(week<=3) return {format:"8×2", load:"60-65%", rest:"1:00", note:"Vitesse maximale. Chaque rep doit claquer."};
    if(week===4) return {format:"5×2", load:"55-60%", rest:"1:00", note:"Technique légère."};
    if(week<=7) return {format:"10×1", load:"65-72%", rest:"0:45-1:00", note:"Singles explosifs. Dip court, drive violent."};
    if(week===8) return {format:"5×1", load:"55-60%", rest:"1:00", note:"Vitesse facile."};
    if(week<=11) return {format:"6×1", load:"60-68%", rest:"1:00", note:"Pattern parfait, aucune fatigue inutile."};
    if(week===12) return {format:"4×1", load:"50-55%", rest:"1:00", note:"Primer léger."};
    if(week<=15) return {format:"3×1", load:"50-60%", rest:"1:00", note:"Vitesse seulement, couper si fatigue."};
    return {format:"Optionnel", load:"barre à vide à 50%", rest:"—", note:"À couper si le test est dans la même semaine."};
  }

  function lowerPlan(week){
    week = wk(week);
    if(isDeload(week)) return {front:"3×5 léger", frontLoad:"60-65%", bulgarian:"2×8/jambe", hip:"2×10 léger", rdl:"2×10 léger"};
    if(week<=3) return {front:"5×4-6", frontLoad:"RPE 7-8", bulgarian:"3×8-10/jambe", hip:"3×8-12", rdl:"3×8-10"};
    if(week<=7) return {front:"5×3-5", frontLoad:"RPE 8", bulgarian:"3×8/jambe", hip:"4×6-8", rdl:"3×8"};
    if(week<=11) return {front:"4×3", frontLoad:"RPE 7-8", bulgarian:"2-3×8/jambe", hip:"3×6-8", rdl:"2-3×8"};
    if(week<=15) return {front:"3×3 léger/modéré", frontLoad:"RPE 6-7", bulgarian:"2×8/jambe", hip:"2×8", rdl:"2×8 léger"};
    return {front:"2×3 activation", frontLoad:"léger", bulgarian:"optionnel", hip:"optionnel", rdl:"optionnel"};
  }

  function mission(week){
    var b = blockOf(week);
    if(b===1) return "Bloc 1 — Fondations : technique, mobilité, stabilité, capacité de travail.";
    if(b===2) return "Bloc 2 — Construction : triceps, jambes, drive, lockout, bench.";
    if(b===3) return "Bloc 3 — Force spécifique : transformer la force en push press/bench lourds.";
    return "Bloc 4 — Héritage : exprimer la force sans forcer le corps à mentir.";
  }

  function rules(){
    return [
      "Projet futur majeur : route Héritage après Phase 3 si la compétition n'est pas prioritaire.",
      "Mission : vieillir fort, mobile, explosif et capable.",
      "Objectifs marqueurs : Push Press 225 lb + Bench Press 315 lb.",
      "Les chiffres sont autorisés seulement si les barres précédentes sont propres.",
      "225 push press seulement si 205 est rapide et 215 est propre.",
      "315 bench seulement si 305 est propre et rapide.",
      "Aucun overhead grindé. Aucun bench grindé.",
      "Aucun WOD overhead destructeur.",
      "La récupération fait partie du programme.",
      "Le cycle est réussi si tu finis plus fort, plus mobile, plus stable et encore capable de t'entraîner.",
      "Le chiffre se mérite; il ne se force pas."
    ];
  }

  function warmupPush(){
    return "2 tours : Band External Rotation — elbow tucked 12/côté + Scap Push-up 8 + Wall Slide 8 + PVC Pass-through 10. Puis ramp-up push press : barre×8, 40%×5, 55%×3.";
  }

  window.COACH_BERTIN_PROGRAMS.heritage225 = {
    id: "heritage225",
    label: "Héritage 225",
    phase: 5,
    status: "Disponible — projet futur",
    draft: false,
    phaseName: "Force durable — année des 50 ans",
    nextPhase: null,
    impact: "Héritage 225 v2 : parcours narratif de 16 semaines. Objectif apparent : Push Press 225 lb + Bench Press 315 lb. Objectif réel : vieillir fort, mobile, explosif et capable, sans se blesser. Hommage à Théodore (Théo).",
    days: ["lundi", "mardi", "jeudi", "vendredi"],
    weekLabels: weekLabels,
    weekGoals: weekGoals,
    sets: ["Bloc 1 fondations","Bloc 2 construction","Bloc 3 force spécifique","Bloc 4 héritage"],
    targetReps: [5,5,4,3,3,3,2,3,1,1,1,2,1,1,1,1],
    mult: [0.70,0.72,0.75,0.62,0.78,0.82,0.86,0.62,0.88,0.90,0.92,0.60,0.82,0.88,0.92,0.95],
    rest: "1:00-4:00 selon bloc",
    tag: "héritage",
    versionDate: "2026-06-09",
    versionLabel: "2026-06-09 — Héritage 225 v2, Push Press 225 + Bench 315",
    cycleRules: rules,

    dayIntentions: {
      lundi: "Jour 1 — Push Press priorité + triceps/lockout. Objectif : construire le 225 sans grind.",
      mardi: "Jour 2 — Jambes / drive / gainage. Objectif : base solide pour pousser fort sans casser le dos.",
      jeudi: "Jour 3 — Bench 315 + Push Press vitesse. Objectif : force haut du corps et explosivité propre.",
      vendredi: "Jour 4 — Athlète Héritage. Carries, grip, moteur, CrossFit minimal sans volume overhead destructeur."
    },

    dayMeta: {
      lundi:   {label:"Lundi",   base:"Push Press priorité", focus:"Push press, lockout, triceps, stabilité overhead."},
      mardi:   {label:"Mardi",   base:"Jambes / Drive",      focus:"Front Squat, unilatéral, chaîne postérieure, core."},
      jeudi:   {label:"Jeudi",   base:"Bench + Vitesse",     focus:"Bench lourd, speed push press, épaules stables."},
      vendredi:{label:"Vendredi",base:"Athlète Héritage",    focus:"Carries, grip, moteur, WOD court, mobilité."}
    },

    getBlocks: function(day, week, ctx) {
      week = wk(week);
      var pp = ppPlan(week);
      var bp = benchPlan(week);
      var sp = speedPP(week);
      var lp = lowerPlan(week);
      var deload = isDeload(week);
      var test = isTest(week);
      var note = mission(week);

      if(day==="lundi") return [
        {time:"8 min", title:"Échauffement push + coiffe", tag:"Préparation", kind:"warmup", text:warmupPush()},
        {time:test?"22 min":"18 min", title:"A. Push Press priorité", tag:"Force", kind:"main",
          exercises:[{name:"Push Press", format:pp.format, load:pp.load, rest:pp.rest, note:pp.note}]},
        {time:"10 min", title:"B. Lockout / triceps", tag:"Triceps", kind:"accessory",
          text:"Triceps utile pour push press et bench. Aucun échec.",
          exercises:[
            {name:"Close-Grip Bench Press", format:deload?"2×8 léger":week>=13?"2×5 léger/modéré":"3×6-8", load:deload?"léger":week>=13?"RPE 6-7":"RPE 7-8", rest:"0:45 avant B2", note:"Aide le lockout sans transformer lundi en deuxième journée bench lourde."},
            {name:"Overhead Rope Extension", format:deload?"2×12":"3×10-15", load:"modéré", rest:"1:00 après B2", note:"Longue portion du triceps. Coude stable."}
          ]},
        {time:"8 min", title:"C. Stabilité overhead", tag:"Stabilité", kind:"accessory",
          exercises:[
            {name:"Overhead Hold", format:deload?"2×20 sec":"3×20-30 sec", load:"modéré", rest:"0:45 avant C2", note:"Lockout stable, côtes basses."},
            {name:"Dead Bug", format:"3×8/côté", load:"contrôle", rest:"0:45 après C2", note:"Anti-extension. Protéger le bas du dos."}
          ]},
        {time:"5 min", title:"D. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Lat stretch 1 min/côté + triceps overhead stretch 1 min + respiration 1 min. "+note}
      ];

      if(day==="mardi") return [
        {time:"8 min", title:"Échauffement jambes / tronc", tag:"Préparation", kind:"warmup",
          text:"Bike 3 min + ankle rocks 10/côté + world's greatest stretch 5/côté + glute bridge 2×12 + goblet squat léger 10."},
        {time:"16 min", title:"A. Front Squat", tag:"Jambes", kind:"main",
          exercises:[{name:"Front Squat", format:lp.front, load:lp.frontLoad, rest:"2:00-2:30", note:"Drive de jambes pour push press. Torse vertical, tronc rigide."}]},
        {time:"12 min", title:"B. Unilatéral + core", tag:"Jambes / Core", kind:"accessory",
          exercises:[
            {name:"Bulgarian Split Squat", format:lp.bulgarian, load:deload?"léger":"45-55 lb / main", rest:"0:45 avant B2", note:"Stable, amplitude propre."},
            {name:"Pallof Press", format:"3×10/côté", load:"contrôle", rest:"0:45 après B2", note:"Anti-rotation. Tronc solide pour le dip-drive."}
          ]},
        {time:"11 min", title:"C. Chaîne postérieure", tag:"Fessiers / Ischios", kind:"accessory",
          exercises:[
            {name:"Hip Thrust", format:lp.hip, load:deload?"léger":"RPE 7-8", rest:"0:45 avant C2", note:"Drive de hanches utile sans surcharger les épaules."},
            {name:"DB RDL", format:lp.rdl, load:deload?"léger":"60-70 lb / main", rest:"1:00 après C2", note:"Ischios/fessiers, dos neutre. Aucun ego."}
          ]},
        {time:"6 min", title:"D. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Couch stretch 1 min/côté + lat stretch 1 min/côté + thoracic extension 2 min + respiration 1 min. "+note}
      ];

      if(day==="jeudi") return [
        {time:"8 min", title:"Échauffement bench + vitesse", tag:"Préparation", kind:"warmup",
          text:"Row facile 2 min + scap push-up 10 + band external rotation 12/côté + empty bar bench 2×10 + push press technique barre à vide×8."},
        {time:test?"22 min":"18 min", title:"A. Bench Press", tag:"Force", kind:"main",
          exercises:[{name:"Bench Press", format:bp.format, load:bp.load, rest:bp.rest, note:bp.note}]},
        {time:"10 min", title:"B. Push Press vitesse", tag:"Explosivité", kind:"accessory",
          exercises:[{name:"Push Press", format:sp.format, load:sp.load, rest:sp.rest, note:sp.note}]},
        {time:"10 min", title:"C. Épaules santé / puissance", tag:"Épaules", kind:"accessory",
          exercises:[
            {name:"Lateral Raise DB", format:deload?"2×15":"3×12-20", load:"léger/modéré", rest:"0:30 avant C2", note:"Deltoïdes sans voler la récupération."},
            {name:"Face Pull", format:deload?"2×15":"3×15-20", load:"60-70 lb", rest:"0:45 après C2", note:"Épaules solides, posture, rotation externe."}
          ]},
        {time:"5 min", title:"D. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Doorway pec stretch 1 min/côté + lat stretch 1 min/côté + respiration 2 min. "+note}
      ];

      if(day==="vendredi") return [
        {time:"7 min", title:"Échauffement athlète", tag:"Préparation", kind:"warmup",
          text:"Bike ou row facile 3 min + scap push-up 10 + KB deadlift léger 10 + front rack stretch 1 min/côté."},
        {time:"12 min", title:"A. Carries / grip", tag:"Carries", kind:"main",
          exercises:[
            {name:"Farmer Carry", format:deload?"2×30 m":"4×40 m", load:"lourd propre", rest:"0:45 avant A2", note:"Tronc rigide. Ne pas transformer en grip max."},
            {name:"Front Rack Carry", format:deload?"2×20 m":"3×30 m", load:"modéré", rest:"1:00 après A2", note:"Rack solide, respiration contrôlée."}
          ]},
        {time:"10 min", title:"B. Haut du corps durable", tag:"Accessoire", kind:"accessory",
          exercises:[
            {name:"DB Bench Press", format:deload?"2×10":"3×8-12", load:deload?"léger":"modéré", rest:"0:30 avant B2", note:"Volume utile sans stress lourd."},
            {name:"Hammer Curl", format:deload?"2×12":"3×10-12", load:"modéré", rest:"0:45 après B2", note:"Coudes, grip, bras forts."}
          ]},
        {time:"10 min", title:"C. WOD maintien CrossFit", tag:"Conditioning", kind:"wod",
          text:(week>=13?"AMRAP 8":"AMRAP 10")+" : 10 cal row + 10 box step-ups + 8 burpees contrôlés + 40 m farmer carry. RPE 7-8. Aucun volume overhead inutile."},
        {time:"8 min", title:"D. Mobilité récupération", tag:"Mobilité", kind:"mobility",
          text:"Lat stretch 1 min/côté + pec stretch 1 min/côté + couch stretch 1 min/côté + respiration 2 min. "+note}
      ];

      return [{time:"—", title:"Héritage 225", tag:"Projet futur", kind:"warmup", text:"Projet futur — À activer après Phase 3 si la route Héritage est choisie."}];
    },

    getWodText: function(day, week){
      var b = this.getBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
      return b ? b.text : "";
    }
  };
})();

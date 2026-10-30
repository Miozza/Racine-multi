// Racine — Pont — Moteur + jambes, épaule épargnée — 5 semaines
// (2 novembre → 6 décembre 2026). Remplace la fin de Pont Peak (S4-S7) après
// une blessure à l'épaule droite (trapèze bas, cou) sur un snatch d'un bras.
// La compétition passe à début février : competition_peak (8 sem.) commence
// le 7 décembre, ce bloc l'amène prêt et l'épaule guérie.
// Méthode : jambes lourdes (Back Squat, Front Squat, Hip Thrust), moteur au
// centre (aérobie long, intervalles au seuil, EMOM, metcon long), bench
// seulement s'il reste indolore. Rien au-dessus de la tête jusqu'à S5, qui
// teste le retour (Wall Ball, Pull-Up, Strict Press, Power Clean) avant le Peak.
// Ce n'est pas un programme de réhabilitation : le reste du corps travaille.
//
// CHARGES — échelle de l'ATHLÈTE DE RÉFÉRENCE (scripts/profiles/reference.js :
// Back Squat 315, Front Squat 265, Bench 245, Hip Thrust 8RM 315), ramenées
// au niveau réel par scripts/charge/scaling.js. Jamais une charge déjà réduite.
//   Back Squat  S1 ×0,72 · S2 ×0,76 · S3 ×0,80 · S4 ×0,85 · S5 ×0,80
//   Front Squat S1 ×0,72 · S2 ×0,75 · S3 ×0,79 · S4 ×0,82 · S5 ×0,77
//   Bench Press S1 ×0,70 · S2 ×0,72 · S3 ×0,74 · S4 ×0,76 · S5 ×0,72 (RPE 7)
// Les metcons ne contiennent aucun mouvement au-dessus de la tête, ni traction,
// ni ski. Garde-fou : dev/moteur_jambes_checks.js.

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
  window.COACH_BERTIN_PROGRAMS.moteur_jambes = {
    id: "moteur_jambes",
    label: "Pont — Moteur + jambes",
    phase: 3,
    phaseName: "Moteur et jambes, épaule épargnée, avant le Peak",
    phaseEnd: "2026-12-06",
    nextPhase: "competition_peak",
    impact: "Bloc de 5 semaines entre Pont Peak et le Peak, pendant que l'épaule droite guérit. Jambes lourdes (Back Squat, Front Squat, Hip Thrust), moteur au centre de chaque séance, bench seulement s'il reste indolore. Aucun mouvement au-dessus de la tête avant S5, qui teste le retour des mouvements du Peak.",
    days: ["lundi", "mardi", "jeudi", "vendredi"],
    weekLabels: ["S1 Base moteur", "S2 Volume", "S3 Seuil", "S4 Grosse semaine", "S5 Retour + re-test"],
    weekGoals: [
      "Installer le moteur : aérobie 24 min, référence 50 cal Bike, AMRAP 20 de référence. Jambes à RPE 7. Bench seulement s'il ne réveille pas le cou.",
      "Plus de volume moteur : aérobie 27 min, premiers intervalles au seuil. Jambes à RPE 7-8.",
      "Seuil : intervalles plus longs, EMOM en 4 stations, metcon pour le temps. Jambes à RPE 8.",
      "Plus grosse semaine du bloc : aérobie 32 min, chipper 30 min, squat le plus lourd. RPE 8, jamais au-delà.",
      "Retour : test des mouvements du Peak (Wall Ball, Pull-Up, Strict Press, Power Clean) et re-test du moteur. Le Peak commence lundi si le test passe sans douleur."
    ],
    sets: ["4×5", "5×4", "5×3", "4×3", "3×3"],
    targetReps: [5, 4, 3, 3, 3],
    mult: [0.72, 0.76, 0.80, 0.85, 0.80],
    rest: "0:45–2:00",
    tag: "moteur jambes épaule",
    versionDate: "2026-10-29",
    versionLabel: "2026-10-29 — Pont Moteur + jambes V1, épaule droite épargnée"
  };

  var ROW_RULE = " Règle épaule : si le cou ou le trapèze réagit au Row, passe au Bike, mêmes calories.";
  var PAIN_RULE = "Douleur au cou ou au trapèze au-dessus de 3 sur 10, ou qui monte pendant la séance : la série s'arrête là.";

  function plan(week){
    return ({
      1: {squat:"4×5", squatLoad:"225 lb", front:"4×4", frontLoad:"190 lb", bench:"4×5", benchLoad:"170 lb", thrust:"4×6", thrustLoad:"285 lb", split:"40 lb / main",
          aeroTime:"24 min", aero:"Moteur aérobie, 24 min sans arrêt : 10 min Bike, 4 min Row, 10 min Bike.",
          intTime:"10 min", intervals:"Pour le temps : 50 cal Bike. Référence du bloc, re-test en S5.",
          emomTime:"12 min", emom:"EMOM 12 en alternance, un seul mouvement par minute : minutes impaires 7 Burpees poids du corps ; minutes paires 12 cal Bike.",
          longTime:"20 min", long:"AMRAP 20 à effort 7 sur 10 : 12 cal Row, 15 Air Squats, 10 Box Step-Ups 24 po, 8 Burpees poids du corps. C'est le premier vendredi du Peak, avec les Air Squats à la place du lancer. Note tes tours : re-test en S5."},
      2: {squat:"5×4", squatLoad:"240 lb", front:"4×4", frontLoad:"200 lb", bench:"4×5", benchLoad:"175 lb", thrust:"4×6", thrustLoad:"295 lb", split:"40 lb / main",
          aeroTime:"27 min", aero:"Moteur aérobie, 27 min sans arrêt : 9 min Bike, 9 min Row, 9 min Bike.",
          intTime:"22 min", intervals:"5 × (3 min Bike à effort 7 sur 10 / 1:30 repos). Même cadence sur les cinq : tu peux dire trois mots, pas une phrase.",
          emomTime:"14 min", emom:"EMOM 14 en alternance, un seul mouvement par minute : minutes impaires 8 Burpees poids du corps ; minutes paires 14 cal Bike.",
          longTime:"24 min", long:"AMRAP 24 à effort 7 sur 10 : 15 cal Row, 15 Air Squats, 12 Box Step-Ups 24 po, 10 Burpees poids du corps. Stratégie : le Row à rythme fixe, Burpees jamais arrêtés, ralentis plutôt."},
      3: {squat:"5×3", squatLoad:"250 lb", front:"5×3", frontLoad:"210 lb", bench:"4×5", benchLoad:"180 lb", thrust:"4×6", thrustLoad:"305 lb", split:"45 lb / main",
          aeroTime:"30 min", aero:"Moteur aérobie, 30 min sans arrêt : 10 min Bike, 10 min Row, 10 min Bike.",
          intTime:"24 min", intervals:"6 × (3 min Bike à effort 8 sur 10 / 1:00 repos). Le dernier intervalle doit ressembler au premier.",
          emomTime:"16 min", emom:"EMOM 16 en 4 stations, une station par minute, 4 tours : 1) 8 Burpees poids du corps, 2) 14 cal Bike, 3) 10 Box Jumps 24 po, 4) 15 Air Squats.",
          longTime:"25 min", long:"Pour le temps, 5 tours : 20 cal Bike, 20 Air Squats, 15 Box Step-Ups 24 po, 10 Burpees poids du corps. Cap 25 min. Stratégie : Burpees en 2 séries de 5, Step-Ups d'une traite."},
      4: {squat:"4×3", squatLoad:"270 lb", front:"4×3", frontLoad:"215 lb", bench:"4×5", benchLoad:"185 lb", thrust:"4×5", thrustLoad:"315 lb", split:"45 lb / main",
          aeroTime:"32 min", aero:"Moteur aérobie, 32 min sans arrêt : 8 min Bike, 8 min Row, 8 min Bike, 8 min Row.",
          intTime:"26 min", intervals:"4 × (5 min Bike à effort 7 sur 10 / 1:30 repos). Cadence régulière, aucune accélération en fin d'intervalle.",
          emomTime:"20 min", emom:"EMOM 20 en 4 stations, une station par minute, 5 tours : 1) 9 Burpees poids du corps, 2) 15 cal Bike, 3) 12 Box Jumps 24 po, 4) 20 Air Squats.",
          longTime:"30 min", long:"Chipper pour le temps : 50 cal Row, 50 Air Squats, 50 Box Step-Ups 24 po, 40 cal Bike, 30 Burpees poids du corps. Cap 30 min. Stratégie : chaque bloc découpé en séries de 10, Burpees en séries de 5 avec 3 respirations entre."},
      5: {squat:"3×3", squatLoad:"250 lb", front:"3×3", frontLoad:"205 lb", bench:"4×5", benchLoad:"175 lb", thrust:"3×6", thrustLoad:"295 lb", split:"40 lb / main",
          aeroTime:"24 min", aero:"Moteur aérobie, 24 min sans arrêt : 10 min Bike, 4 min Row, 10 min Bike. Compare ton souffle à S1.",
          intTime:"10 min", intervals:"Re-test pour le temps : 50 cal Bike. Compare au temps de S1.",
          emomTime:"10 min", emom:"EMOM 10 : 8 Burpees poids du corps chaque minute. Rythme constant, le dernier tour doit ressembler au premier.",
          longTime:"20 min", long:"Re-test de S1 — AMRAP 20 à effort 7 sur 10 : 12 cal Row, 15 Air Squats, 10 Box Step-Ups 24 po, 8 Burpees poids du corps. Objectif : au moins un tour de plus qu'en S1."}
    })[week] || plan(1);
  }

  var RETURN_TEST = "Test de retour avant le Peak, avant toute fatigue. Dans l'ordre, et seulement si l'étape précédente est passée à 0-2 sur 10 : " +
    "Strict Press 2×5 barre vide, puis 10 Wall Balls 14 lb, puis Pull-Up 3×3 stricts. " +
    "Douleur au-dessus de 2 sur 10, ou qui monte le lendemain : le test s'arrête et le Peak attend une semaine. Note ce qui est passé.";
  var CLEAN_TEST = "Test de retour du Power Clean : barre vide 2×3, puis 95 lb 3×2 si zéro douleur au cou ou au trapèze. " +
    "Le haussement d'épaules du clean sollicite le trapèze : s'il réagit, arrêt, et le jeudi du Peak se fera sans clean jusqu'à nouvel ordre.";

  function ex(name, format, load, rest, note){
    return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
  }

  // Le metcon suit toujours le travail principal (décision du 2026-10-17) :
  // le temps qui manque coupe les accessoires de fin, jamais le moteur.
  function blocks(day, week){
    var w = Number(week) || 1;
    var p = plan(w);
    var back = w === 5;

    if(day === "lundi") return [
      {time:"8 min", title:"Échauffement squat", tag:"Préparation", kind:"warmup", text:"Bike 3 min + rotations du cou dans l'amplitude sans douleur + ankle rocks 10/côté + glute bridge 15 + goblet squat 10. Montée progressive longue sur le Back Squat."},
      {time:"14 min", title:"A. Back Squat", tag:"Jambes lourd", kind:"main", exercises:[
        ex("Back Squat", p.squat, p.squatLoad, "1:00 avant A2", "RPE " + (w >= 3 ? "8" : "7") + ", jamais au-delà : le moteur passe ensuite. Barre posée bas sur le trapèze ; si elle appuie sur la zone blessée, garde la prise plus large."),
        ex("Tibialis Raise", "3×15", "poids du corps", "1:00 après A2", "Pendant la pause du squat. Dos au mur, lent, sans élan.")
      ]},
      {time:p.aeroTime, title:"B. Moteur aérobie", tag:"Aérobie", kind:"wod", text:p.aero + " Rythme conversation : tu peux dire une phrase complète. Respiration par le nez si possible. Effort 4-5 sur 10." + ROW_RULE},
      {time:"8 min", title:"C. Unilatéral + gainage", tag:"Jambes", kind:"accessory", exercises:[
        ex("Bulgarian Split Squat", "3×8/jambe", p.split, "0:30 avant C2", "Torse droit, genou avant qui suit les orteils. Épaules basses : si tenir les haltères tire sur le trapèze, garde-les près du corps."),
        ex("Dead Bug", "3×8/côté", "poids du corps", "1:00 après C2", "Côtes basses, bas du dos collé au sol.")
      ]},
      {time:"3 min", title:"D. Retour au calme", tag:"Mobilité", kind:"mobility", text:"Couch stretch 45 sec/côté + 90/90 hanches 1 min + respiration lente 1 min."}
    ];

    if(day === "mardi"){
      var mardi = [
        {time:"8 min", title:"Échauffement bench", tag:"Préparation", kind:"warmup", text:"Bike 3 min + rotations du cou dans l'amplitude sans douleur + Scap Push-Up 2×10 + Band Pull-Apart 2×15, bras sous les épaules. Montée progressive sur le Bench Press."}
      ];
      if(back) mardi.push({time:"8 min", title:"Test de retour — haut du corps", tag:"Retour Peak", kind:"technique", text:RETURN_TEST});
      mardi.push(
        {time:"12 min", title:"Bench Press", tag:"Bench prudent", kind:"main", exercises:[
          ex("Bench Press", p.bench, p.benchLoad, "1:00 avant @2", "RPE 7, une marge de 3 reps. Omoplates serrées, fessiers sur le banc. " + PAIN_RULE),
          ex("Hip Airplane", "3×5/côté", "poids du corps", "1:00 après @2", "Pendant la pause du bench. Main au rack, sur une jambe : ouvre puis ferme le bassin lentement.")
        ]},
        {time:p.intTime, title:w === 1 || back ? "Benchmark Bike" : "Intervalles au seuil", tag:"Moteur", kind:"wod", text:p.intervals},
        {time:"6 min", title:"Tirage sans douleur", tag:"Haut du dos", kind:"accessory", exercises:[
          ex("Chest Supported Row", "3×10", "95 lb", "1:00", "Léger, poitrine collée, cou long, aucun haussement d'épaules. Si le cou ou le trapèze réagit, saute le bloc : il revient la semaine suivante.")
        ]},
        {time:"4 min", title:"Gainage", tag:"Tronc", kind:"core", exercises:[
          ex("Side Plank", "3×30 s/côté", "poids du corps", "0:30", "Coude sous l'épaule, bassin haut. Côté droit : sur l'avant-bras, jamais sur la main.")
        ]},
        {time:"3 min", title:"Retour au calme", tag:"Mobilité", kind:"mobility", text:"Pec stretch doux, bras sous la hauteur de l'épaule, 45 sec/côté + respiration lente 1 min."}
      );
      return letter(mardi);
    }

    if(day === "jeudi"){
      var jeudi = [
        {time:"8 min", title:"Échauffement front squat", tag:"Préparation", kind:"warmup", text:"Bike 3 min + rotations du cou dans l'amplitude sans douleur + front rack stretch 30 sec/côté + goblet squat 10 + barre vide 2×5 front squat."}
      ];
      if(back) jeudi.push({time:"6 min", title:"Test de retour — Power Clean", tag:"Retour Peak", kind:"technique", text:CLEAN_TEST});
      jeudi.push(
        {time:"12 min", title:"Front Squat", tag:"Jambes lourd", kind:"main", exercises:[
          ex("Front Squat", p.front, p.frontLoad, "0:45 avant @2", "RPE " + (w >= 3 ? "8" : "7") + ", jamais au-delà. Coudes hauts, torse droit. Le Peak en fait chaque jeudi."),
          ex("Single-Leg Calf Raise", "3×12/jambe", "poids du corps", "0:45 après @2", "Pendant la pause du front squat. Sur une marche, amplitude complète.")
        ]},
        {time:p.emomTime, title:"EMOM moteur", tag:"WOD", kind:"wod", text:p.emom + " Aucune poussée au-dessus de la tête."},
        {time:"6 min", title:"Anti-rotation", tag:"Tronc", kind:"core", exercises:[
          ex("Pallof Press", "3×10/côté", "léger à modéré", "0:30", "Bras devant la poitrine, jamais au-dessus. Bassin stable.")
        ]},
        {time:"3 min", title:"Retour au calme", tag:"Mobilité", kind:"mobility", text:"Couch stretch 45 sec/côté + respiration lente 1 min."}
      );
      return letter(jeudi);
    }

    // vendredi
    return [
      {time:"8 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:"Row 3 min (ou Bike si le trapèze réagit) + glute bridge 2×15 + 2 tours lents : 5 Air Squats, 5 Box Step-Ups, 3 Burpees."},
      {time:"10 min", title:"A. Hip Thrust", tag:"Chaîne postérieure", kind:"main", exercises:[
        ex("Hip Thrust", p.thrust, p.thrustLoad, "0:45 avant A2", "Pause 1 s en haut, menton rentré, côtes basses. Remplace le RDL : aucune barre tenue à bout de bras."),
        ex("Dead Bug", "3×8/côté", "poids du corps", "0:45 après A2", "Pendant la pause du hip thrust. Bas du dos collé au sol.")
      ]},
      {time:p.longTime, title:"B. Metcon long", tag:"WOD", kind:"wod", text:p.long + ROW_RULE},
      {time:"4 min", title:"C. Retour au calme", tag:"Mobilité", kind:"mobility", text:"Marche lente 2 min + couch stretch 1 min/côté. Note tes tours ou ton temps."}
    ];
  }

  // Lettres posées après les blocs conditionnels de S5 (test de retour).
  function letter(list){
    var n = 0;
    return list.map(function(b){
      if(b.kind === "warmup") return b;
      var L = "ABCDEFGH".charAt(n++);
      var out = Object.assign({}, b, {title: L + ". " + b.title});
      if(b.exercises) out.exercises = b.exercises.map(function(e){
        return Object.assign({}, e, {rest: String(e.rest).replace(/@2/g, L + "2")});
      });
      return out;
    });
  }

  var P = window.COACH_BERTIN_PROGRAMS.moteur_jambes;
  P.getBlocks = function(day, week){ return blocks(day, week); };
  P.getWodText = function(day, week){
    var b = blocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
    return b ? b.text : "";
  };
  P.cycleRules = [
    "Épaule droite épargnée : aucun mouvement au-dessus de la tête, aucune traction, aucun ski, aucun curl de S1 à S4.",
    "Règle douleur : 0-2 sur 10 qui ne monte pas, on continue. Au-dessus de 3 sur 10, ou qui monte pendant la séance ou le lendemain, le mouvement sort.",
    "Choc électrique dans le bras qui revient, fourmillements, ou perte de force : arrêt du haut du corps et consultation avant la séance suivante.",
    "Jambes lourdes : Back Squat le lundi, Front Squat le jeudi, Hip Thrust le vendredi, RPE 7 en S1-S2 puis 8, jamais au-delà.",
    "Moteur au centre : aérobie 24 → 27 → 30 → 32 min au rythme conversation, intervalles au seuil le mardi, EMOM le jeudi, metcon long le vendredi.",
    "Row permis tant que le cou ne réagit pas ; sinon Bike, mêmes calories.",
    "Bench Press à RPE 7 seulement s'il reste indolore. Tirage sur banc incliné léger, sauté au moindre signal du cou.",
    "Le metcon suit le travail principal : si le temps manque, ce sont les accessoires de fin qui sautent.",
    "S5 : test de retour (Strict Press barre vide, Wall Balls, Pull-Up, Power Clean). Passé à 0-2 sur 10 : le Peak commence lundi. Sinon, une semaine de plus dans ce bloc.",
    "Re-tests S5 : 50 cal Bike (mardi) et AMRAP 20 du vendredi, comparés à S1.",
    "Charges écrites à l'échelle de l'athlète de référence : le moteur les ramène au niveau réel."
  ];
  P.dayIntentions = {
    lundi: "Jambes + aérobie : Back Squat lourd avec Tibialis Raise pendant les pauses, aérobie long au rythme conversation, Bulgarian Split Squat et Dead Bug.",
    mardi: "Bench prudent + seuil : Bench Press à RPE 7 s'il reste indolore, benchmark ou intervalles au Bike, tirage sur banc incliné, Side Plank.",
    jeudi: "Front Squat + EMOM : front squat lourd, EMOM burpees/Bike/box, Pallof Press. Aucune poussée au-dessus de la tête.",
    vendredi: "Chaîne postérieure + metcon long : Hip Thrust à la place du RDL, puis le metcon long au format du Peak, sans Wall Balls."
  };
  P.dayMeta = {
    lundi:   {label:"Lundi",   base:"Squat + aérobie",     focus:"Back Squat, moteur aérobie long, Bulgarian Split Squat, Dead Bug."},
    mardi:   {label:"Mardi",   base:"Bench + seuil",       focus:"Bench Press RPE 7, intervalles Bike, Chest Supported Row, Side Plank."},
    jeudi:   {label:"Jeudi",   base:"Front squat + EMOM",  focus:"Front Squat, EMOM moteur, Pallof Press."},
    vendredi:{label:"Vendredi",base:"Hip thrust + metcon", focus:"Hip Thrust, metcon long 20-30 min."}
  };
})();

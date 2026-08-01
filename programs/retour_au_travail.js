// Racine — « Retour au travail » : semaine de transition après 2 à 4 semaines d'arrêt.
// Micro-cycle d'UNE semaine, 4 séances. Même famille que programs/transition_weeks.js
// (durationWeeks:1, objective:"transition") : il se choisit à la main, il ne sort
// jamais du classement automatique de La Saison (scripts/season/suggest.js).
//
// Intention : retrouver les mouvements, limiter les courbatures, réhabituer au
// volume, reprendre confiance — puis reprendre le cycle normal la semaine
// suivante. Aucun test de max, aucune série à l'échec, jamais de record.
//
// CHARGES — convention du dépôt (voir dev/program_calibration_checks.js) :
// les charges écrites ici sont sur l'échelle du 1RM de l'athlète de référence
// (scripts/profiles/reference.js : Back Squat 315, Bench 245, Front Squat 265,
// Strict Press 155, Power Clean 205, Hip Thrust 400, Barbell Row 195,
// Deadlift 375). scripts/charge/scaling.js les ramène ensuite au niveau réel de
// l'athlète actif. Elles valent ≈55 % de ce 1RM, soit ≈65-70 % d'une charge de
// travail normale sur la même plage de reps — c'est la consigne « 60-70 % des
// charges habituelles » traduite dans l'unité que le moteur comprend.
//
// ANTI-PROGRESSION — deux verrous volontaires, pas un effet de bord :
//  1. le libellé de semaine contient « récupération » : coachIsDeloadWeekOrContext()
//     (scripts/charge/suggestion.js) bascule le moteur en contexte deload, qui
//     n'auto-progresse pas et plafonne la charge sous la dernière référence ;
//  2. chaque note d'exercice porte TECHNIQUE_RULE, donc le mot « technique » :
//     coachExtractMovementIntent() (scripts/charge/mouvements.js) marque
//     l'intention, coachIsLimitedProgressionContext() la lit, et la charge
//     affichée reste celle du programme. Un résultat de cette semaine ne
//     remplace donc jamais une capacité principale (CLAUDE.md § 3.2).

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

  // Rappel imposé à chaque mouvement chargé : la technique décide, pas le poids.
  var TECHNIQUE_RULE = "Réduis la charge dès que la technique se détériore.";
  var RESERVE_RULE = "Garde 3 à 4 répétitions en réserve, jamais d'échec.";

  function ex(name, format, load, rest, note){
    return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
  }

  // ─── Séance 1 — Full body, reprise de force ────────────────────────────────

  function seance1(){
    return [
      {time:"12 min", title:"Warm-up full body", tag:"Préparation", kind:"warmup",
       text:"Bike ou rameur 5 min très facile. Mobilité dynamique hanches, épaules, chevilles. Puis 2 séries progressives légères de squat et de développé couché : barre × 8, puis ~50 % × 5. Cette semaine, l'échauffement compte autant que le travail."},

      {time:"16 min", title:"A. Back Squat", tag:"Principal", kind:"main", exercises:[
        ex("Back Squat", "3×5", "175 lb", "2:00",
           "≈65-70 % de tes charges habituelles. RPE 7 maximum. " + RESERVE_RULE + " " + TECHNIQUE_RULE)]},

      {time:"14 min", title:"B. Bench Press", tag:"Principal", kind:"secondary", exercises:[
        ex("Bench Press", "3×5", "135 lb", "2:00",
           "≈65-70 % de tes charges habituelles. RPE 7 maximum. " + RESERVE_RULE + " " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"C. Tirage horizontal", tag:"Dos", kind:"hypertrophy", exercises:[
        ex("Barbell Row", "3×8", "95 lb", "1:30",
           "Charge modérée, buste solide, aucun swing. Remplaçable par One-Arm DB Row si la barre n'est pas libre. " + TECHNIQUE_RULE)]},

      {time:"10 min", title:"D. Farmer Carry", tag:"Grip / posture", kind:"accessory", exercises:[
        ex("Farmer Carry", "3×30 m", "65 lb / main", "1:00–1:30",
           "Charge qui laisse une posture solide du départ à l'arrivée. Épaules basses, côtes en place. " + TECHNIQUE_RULE)]},

      {time:"8 min", title:"E. Retour au calme", tag:"Conditioning", kind:"wod",
       text:"Rameur ou vélo 8 min en zone facile à modérée. Conversation possible en continu. Objectif : circulation, pas performance."},

      {time:"5 min", title:"F. Mobilité", tag:"Mobilité", kind:"mobility",
       text:"Couch stretch 1 min/côté + ouverture pectoraux 1 min/côté + respiration nasale 1 min. Sors du gym sans être vidé."}
    ];
  }

  // ─── Séance 2 — Technique et conditionnement ───────────────────────────────

  function seance2(){
    return [
      {time:"12 min", title:"Warm-up technique", tag:"Préparation", kind:"warmup",
       text:"Cardio facile 5 min. Mobilité épaules, poignets, hanches, chevilles. Puis travail technique à la barre vide : deadlift à mi-cuisse, haussements, réception en quart de squat."},

      {time:"14 min", title:"A. Power Clean — vitesse et position", tag:"Principal", kind:"main", exercises:[
        ex("Power Clean", "5×3", "85 lb", "1:30",
           "Charge très légère : la vitesse de barre et la position priment sur le poids. Aucune série à l'échec, aucune montée de charge cette semaine. " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"B. Strict Press", tag:"Épaules", kind:"secondary", exercises:[
        ex("Strict Press", "3×6", "80 lb", "1:30",
           "RPE 6. Côtes basses, zéro impulsion des jambes. " + RESERVE_RULE + " " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"C. Tirage vertical", tag:"Dos", kind:"hypertrophy", exercises:[
        ex("Pull-Up", "3×6-8", "poids du corps", "1:30",
           "Ne pas aller à l'échec : arrête la série tant que les reps restent propres. Utilise l'élastique d'assistance ou le Lat Pulldown si 6 reps strictes ne sortent pas. " + TECHNIQUE_RULE)]},

      {time:"10 min", title:"D. Conditionnement", tag:"Conditioning", kind:"wod",
       text:"EMOM 10 min — minutes impaires : 8 calories vélo ou rameur ; minutes paires : 6 burpees contrôlés. Rythme modéré, respiration sous contrôle. Réduis les calories ou les répétitions si la minute devient serrée."},

      {time:"5 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
       text:"Étirement lats 1 min/côté + poignets 1 min + respiration nasale allongé 1 min."}
    ];
  }

  // ─── Séance 3 — Bas du corps ───────────────────────────────────────────────

  function seance3(){
    return [
      {time:"12 min", title:"Warm-up bas du corps", tag:"Préparation", kind:"warmup",
       text:"Vélo 5 min facile. Mobilité dynamique hanches et chevilles. Activation légère : glute bridge 2×12 + hamstring walkout 2×8 + 2 séries progressives de front squat à la barre."},

      {time:"16 min", title:"A. Front Squat", tag:"Principal", kind:"main", exercises:[
        ex("Front Squat", "3×5", "145 lb", "2:00",
           "RPE 6-7. Coudes hauts, profondeur propre. " + RESERVE_RULE + " " + TECHNIQUE_RULE)]},

      {time:"13 min", title:"B. Chaîne postérieure", tag:"Ischios", kind:"secondary", exercises:[
        ex("Romanian Deadlift", "3×8", "145 lb", "1:30",
           "Charge modérée. Dos neutre, amplitude jusqu'à la tension des ischios, pas plus bas. " + TECHNIQUE_RULE)]},

      {time:"10 min", title:"C. Unilatéral", tag:"Jambes", kind:"accessory", exercises:[
        ex("Walking Lunge DB", "2×8 / jambe", "25 lb / main", "1:30",
           "Fentes marchées, ou fentes arrière si l'espace manque. Genou qui suit le pied, buste droit. " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"D. Hip Thrust", tag:"Fessiers", kind:"hypertrophy", exercises:[
        ex("Hip Thrust", "3×10", "165 lb", "1:30",
           "RPE 6. Pause 1 sec en haut, fessiers et non lombaires. " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"E. Retour au calme", tag:"Conditioning", kind:"wod",
       text:"10 à 15 min de marche inclinée ou de vélo facile. Zone 2, respiration nasale si possible. Aucune intensité."},

      {time:"5 min", title:"F. Mobilité", tag:"Mobilité", kind:"mobility",
       text:"Étirement ischios 1 min/côté + figure-4 1 min/côté + respiration 1 min."}
    ];
  }

  // ─── Séance 4 — Haut du corps et WOD court ─────────────────────────────────

  function seance4(){
    return [
      {time:"12 min", title:"Warm-up haut du corps", tag:"Préparation", kind:"warmup",
       text:"Cardio facile 5 min. Mobilité épaules et haut du dos : band pull-apart 2×15, open book 8/côté, wall slide 2×10. Puis 2 séries progressives légères de strict press."},

      {time:"16 min", title:"A. Strict Press", tag:"Principal", kind:"main", exercises:[
        ex("Strict Press", "3×5", "85 lb", "2:00",
           "RPE 6-7. " + RESERVE_RULE + " " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"B. Push incliné", tag:"Pectoraux", kind:"hypertrophy", exercises:[
        ex("Incline DB Press", "3×8", "45 lb / main", "1:30",
           "Charge modérée, amplitude complète, aucune série à l'échec. " + TECHNIQUE_RULE)]},

      {time:"12 min", title:"C. Tirage horizontal", tag:"Dos", kind:"hypertrophy", exercises:[
        ex("Seated Cable Row", "3×10", "85 lb", "1:30",
           "Remplaçable par One-Arm DB Row. Scapulas d'abord, buste stable. " + TECHNIQUE_RULE)]},

      {time:"8 min", title:"D. Épaules", tag:"Isolation", kind:"accessory", exercises:[
        ex("Lateral Raise DB", "2×12", "20 lb / main", "1:00",
           "Charge légère, aucun élan, trapèzes relâchés. " + TECHNIQUE_RULE)]},

      {time:"8 min", title:"E. WOD court", tag:"Conditioning", kind:"wod",
       text:"AMRAP 8 min à intensité modérée : 6 push-ups + 8 goblet squats + 10 calories vélo ou rameur. Les push-ups peuvent se faire sur un banc, le goblet squat reste léger. Rythme régulier : tu dois pouvoir finir sans être vidé."},

      {time:"5 min", title:"F. Mobilité", tag:"Mobilité", kind:"mobility",
       text:"Étirement pectoraux 1 min/côté + open book 1 min/côté + respiration 1 min."},

      {time:"—", title:"Fin du programme — reprendre ton cycle", tag:"Recommandation", kind:"bonus",
       text:"Tu peux reprendre ton cycle précédent si les quatre conditions sont réunies : "
          + "1) tu as terminé les séances sans douleur inhabituelle ; "
          + "2) ta technique est restée bonne du début à la fin ; "
          + "3) tu ne ressens pas de fatigue excessive ; "
          + "4) tu te sens prêt à augmenter progressivement l'intensité. "
          + "Si une seule manque, refais cette semaine plutôt que de forcer. Rien n'est relancé automatiquement : c'est toi qui choisis le prochain programme."}
    ];
  }

  var SEANCES = {lundi:seance1, mardi:seance2, jeudi:seance3, vendredi:seance4};

  function blocksFor(day){
    var build = SEANCES[day] || seance1;
    return build();
  }

  window.COACH_BERTIN_PROGRAMS.retour_au_travail = {
    id: "retour_au_travail",
    label: "Retour au travail",
    phase: 0,
    phaseName: "Reprise progressive après une pause",
    phaseEnd: "Une semaine. Ensuite : retour au cycle normal si la reprise s'est bien passée.",
    impact: "Une semaine de transition pour reprendre l'entraînement progressivement après une pause. Le volume et l'intensité sont volontairement réduits afin de retrouver les mouvements, les sensations et la confiance avant de reprendre un cycle normal.",
    days: ["lundi", "mardi", "jeudi", "vendredi"],
    weekLabels: ["Reprise"],
    weekGoals: [
      "Cette semaine ne sert pas à tester votre niveau. Gardez plusieurs répétitions en réserve et réduisez la charge en cas de douleur, de fatigue excessive ou de détérioration de la technique. Semaine de récupération active : RPE 6-7, aucun échec, aucun test de max."
    ],
    sets: ["3×5 à ≈65-70 % des charges habituelles"],
    targetReps: [5],
    mult: [0.55],
    rest: "1:00–2:00",
    tag: "REPRISE",
    objective: "transition",
    audience: "tous",
    frequency: 4,
    versionDate: "2026-08-01",
    versionLabel: "2026-08-01 — Retour au travail V1",
    cycleRules: [
      "Intensité cible RPE 6-7 : garder 3 à 4 répétitions en réserve sur chaque série.",
      "Aucun exercice à l'échec, aucun test de maximum, aucun record cette semaine.",
      "Charges à ≈60-70 % des charges habituelles : le volume est volontairement réduit.",
      "Réduire la charge dès que la technique se détériore.",
      "Les blocs cardiovasculaires restent modérés : la séance doit se terminer sans épuisement important."
    ],
    dayIntentions: {
      lundi:    "Full body : retrouver squat, bench et tirage sans chercher la charge.",
      mardi:    "Technique et conditionnement : vitesse de barre, position, EMOM modéré.",
      jeudi:    "Bas du corps : réhabituer les jambes et les hanches au volume.",
      vendredi: "Haut du corps et WOD court : finir la semaine sans épuisement."
    },
    dayMeta: {
      lundi:    {label:"Séance 1 — Full body",   base:"Reprise de force",        focus:"Back Squat, Bench Press, Barbell Row, Farmer Carry."},
      mardi:    {label:"Séance 2 — Technique",   base:"Technique + conditionnement", focus:"Power Clean, Strict Press, Pull-Up, EMOM 10."},
      jeudi:    {label:"Séance 3 — Bas du corps", base:"Jambes et hanches",      focus:"Front Squat, Romanian Deadlift, Walking Lunge DB, Hip Thrust."},
      vendredi: {label:"Séance 4 — Haut du corps", base:"Haut du corps + WOD court", focus:"Strict Press, Incline DB Press, Seated Cable Row, AMRAP 8."}
    },
    getBlocks: function(day, week){ return blocksFor(day); },
    getWodText: function(day, week){
      var b = blocksFor(day).filter(function(x){ return x.kind === "wod"; })[0];
      return b ? b.text : "";
    }
  };
})();

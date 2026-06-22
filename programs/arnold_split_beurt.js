// Coach Bertin — Arnold Split
// Objectif : bloc hors-saison hypertrophie, rotation continue Pecs+Dos / Épaules+Bras / Jambes
// sur 4 jours d'entraînement (lundi, mardi, jeudi, vendredi), durée ouverte.
// Programme réel connecté au moteur de charge (CoachCharge), pas un mode local isolé.
// Aucun WOD obligatoire. Reprise du CrossFit quand prêt, sans date forcée.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.arnold_split_beurt = {
  id: "arnold_split_beurt",
  label: "Arnold Split",
  phase: 0,
  phaseName: "Hors-saison hypertrophie",
  phaseEnd: "Durée ouverte — retour CrossFit quand prêt.",
  impact: "Bloc hors-saison bodybuilding, calibré pour 60 min. Rotation continue de 3 séances (Pecs+Dos, Épaules+Bras, Jambes) sur tes 4 jours d'entraînement, comme le split Arnold original mais compressé sur 4 jours au lieu de 6. La séance qui tombe un jour donné change d'une semaine à l'autre. Les accessoires sont jumelés en supersets (transition courte entre les deux, vrai repos après la paire) pour tenir le temps sans sacrifier les gros mouvements. Aucun WOD, aucun conditioning.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  tag: "arnold_beurt",
  trainingStyle: "hypertrophy",
  conditioning: "none",
  cycleRules: [
    "Séance calibrée pour 60 min. Bench Press et Back Squat restent seuls avec repos complet (2:00-2:30) — ce sont les mouvements lourds et techniques, on ne les bouscule pas.",
    "Tout le reste tourne en superset : exercice 1, transition courte (0:20-0:30), exercice 2, vrai repos (1:00-1:15), puis retour à l'exercice 1.",
    "RPE 7-8 en début de bloc, 8-9 max plus tard. Toujours 1-2 reps en réserve sur les gros mouvements.",
    "Aucun échec sur Back Squat ou Romanian Deadlift. Technique propre seulement.",
    "AMRAP seulement sur Pull-Up et Dips, arrêt à RPE 9 max.",
    "Si le bas du dos parle sur Back Squat ou Romanian Deadlift : réduire la charge immédiatement la séance suivante.",
    "Progression : si toutes les séries atteignent le haut de la plage de reps en bonne forme sur 2 séances consécutives, augmenter légèrement la charge la prochaine fois.",
    "Ce bloc n'a pas de fin fixe. Reprendre le cycle CrossFit en pause quand le retour est décidé."
  ],
  sessionIntentions: {
    A: "Pecs + Dos — gros volume haut du corps, alternance poussée/tirage.",
    B: "Épaules + Bras — deltoïdes et bras construits avec contrôle, sans élan.",
    C: "Jambes — base solide, squat, hinge, fessiers, mollets."
  },
  dayMeta: {
    lundi:    { label: "Lundi",    base: "Rotation A/B/C", focus: "Le type de séance dépend de la semaine du cycle." },
    mardi:    { label: "Mardi",    base: "Rotation A/B/C", focus: "Le type de séance dépend de la semaine du cycle." },
    jeudi:    { label: "Jeudi",    base: "Rotation A/B/C", focus: "Le type de séance dépend de la semaine du cycle." },
    vendredi: { label: "Vendredi", base: "Rotation A/B/C", focus: "Le type de séance dépend de la semaine du cycle." }
  }
};

var ARNOLD_BEURT_DAY_ORDER = ["lundi", "mardi", "jeudi", "vendredi"];
var ARNOLD_BEURT_TYPES = ["A", "B", "C"];

function arnoldBeurtSessionType(day, week){
  var idx = ARNOLD_BEURT_DAY_ORDER.indexOf(day);
  if(idx < 0) idx = 0;
  var w = Math.max(1, Number(week) || 1);
  var sessionIndex = (w - 1) * 4 + idx;
  return ARNOLD_BEURT_TYPES[sessionIndex % 3];
}

function arnoldBeurtEx(name, format, load, rest, note){
  return { name: name, format: format, load: load || "RPE 7-8", rest: rest || "—", note: note || "" };
}

function arnoldBeurtBlocksA(){
  return [
    { time: "6 min", title: "Warm-up haut du corps", tag: "Préparation", kind: "warmup",
      text: "Row léger 2 min + band pull-aparts 2×15 + scap push-ups 2×8 + ramp-up bench : barre×10, 135×5, 165×3." },
    { time: "12 min", title: "A. Bench Press", tag: "Pecs", kind: "main",
      exercises: [arnoldBeurtEx("Bench Press", "4×8-12", "215 lb", "2:00", "Omoplates serrées, barre contrôlée, pas de rebond. Repos complet, pas de superset.")] },
    { time: "8 min", title: "B. Superset étirement pecs + lats", tag: "Superset", kind: "accessory",
      text: "DB Fly puis DB Pullover, transition courte, vrai repos après le 2e. Mouvement original du Jour 1 Arnold, fait couché sur banc : aucune charge sur le bas du dos.",
      exercises: [
        arnoldBeurtEx("DB Fly", "3×10-15", "RPE 7-8", "0:20 avant DB Pullover", "Grand étirement pecs, coudes légèrement fléchis, aucune douleur d'épaule."),
        arnoldBeurtEx("DB Pullover", "3×10-15", "RPE 7-8", "1:00 après DB Fly", "Étirement lats/cage thoracique, mouvement contrôlé, charge légère.")
      ] },
    { time: "8 min", title: "C. Superset tirage + santé épaules", tag: "Superset", kind: "accessory",
      text: "Pull-Up puis Face Pull, transition courte, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("Pull-Up", "3×AMRAP propre", "poids du corps", "0:20 avant Face Pull", "Arrête avant de perdre la forme. RPE 9 max."),
        arnoldBeurtEx("Face Pull", "3×12-15", "RPE 7-8", "1:00 après Pull-Up", "Contraction haut du dos, mouvement contrôlé.")
      ] },
    { time: "14 min", title: "D. Superset tirage + poussée", tag: "Superset", kind: "accessory",
      text: "Barbell Row puis Incline DB Press, transition courte entre les deux, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("Barbell Row", "4×8-12", "185 lb", "0:30 avant Incline DB Press", "Dos gainé, tire les coudes vers les hanches."),
        arnoldBeurtEx("Incline DB Press", "4×8-12", "60 lb / main", "1:15 après Barbell Row", "Inclinaison modérée, descente lente.")
      ] },
    { time: "3 min", title: "Sortie", tag: "Mobilité", kind: "mobility",
      text: "Mobilité pecs/lats rapide + respiration. Stopper si épaules irritées." }
  ];
}

function arnoldBeurtBlocksB(){
  return [
    { time: "6 min", title: "Warm-up épaules/bras", tag: "Préparation", kind: "warmup",
      text: "Bike léger 2 min + band pull-aparts 2×15 + arm circles 1 min + ramp-up DB press léger 2×10." },
    { time: "16 min", title: "A. Superset press + biceps", tag: "Superset", kind: "main",
      text: "DB Shoulder Press puis Cable Curl, transition courte, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("DB Shoulder Press", "4×8-12", "50 lb / main", "0:30 avant Cable Curl", "Tronc solide, haltères contrôlés, pas d'élan."),
        arnoldBeurtEx("Cable Curl", "4×8-12", "RPE 7-8", "1:15 après DB Shoulder Press", "Coudes fixes, pas de swing du dos.")
      ] },
    { time: "14 min", title: "B. Superset triceps + arrière épaule", tag: "Superset", kind: "accessory",
      text: "Dips puis Rear Delt Fly câble, transition courte, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("Dips", "3×AMRAP propre", "poids du corps", "0:30 avant Rear Delt Fly câble", "RPE 9 max. Amplitude réduite si épaules sensibles."),
        arnoldBeurtEx("Rear Delt Fly câble", "3×12-15", "RPE 8", "1:00 après Dips", "Contraction arrière d'épaule, pas d'élan.")
      ] },
    { time: "12 min", title: "C. Superset finition épaules + triceps", tag: "Superset", kind: "accessory",
      text: "Lateral Raise câble puis Triceps Rope Pushdown, transition courte, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("Lateral Raise câble", "4×10-15", "RPE 8", "0:30 avant Triceps Rope Pushdown", "Monte jusqu'à l'épaule, contrôle la descente."),
        arnoldBeurtEx("Triceps Rope Pushdown", "3×10-12", "RPE 7-8", "1:00 après Lateral Raise câble", "Coudes collés au corps, extension complète.")
      ] },
    { time: "3 min", title: "Sortie", tag: "Mobilité", kind: "mobility",
      text: "Décompression épaules/coudes. Aucun set forcé." }
  ];
}

function arnoldBeurtBlocksC(){
  return [
    { time: "8 min", title: "Warm-up jambes", tag: "Préparation", kind: "warmup",
      text: "Bike 3 min + ankle rocks 10/côté + goblet squat 2×10 + glute bridge 2×15 + ramp-up squat : barre×8, 135×5, 165×3." },
    { time: "16 min", title: "A. Back Squat", tag: "Quadriceps", kind: "main",
      exercises: [arnoldBeurtEx("Back Squat", "4×8-12", "185 lb", "2:00-2:30", "Aucun échec. Descente contrôlée, profondeur stable, RPE 8 max. Repos complet, pas de superset.")] },
    { time: "16 min", title: "B. Superset quadriceps + ischios", tag: "Superset", kind: "accessory",
      text: "Bulgarian Split Squat puis Romanian Deadlift, transition courte, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("Bulgarian Split Squat", "3×10-12/jambe", "50 lb / main", "0:30 avant Romanian Deadlift", "Descente stable, pousse par le talon avant."),
        arnoldBeurtEx("Romanian Deadlift", "4×8-12", "140 lb", "1:15 après Bulgarian Split Squat", "Hanches loin derrière, dos neutre, aucun échec.")
      ] },
    { time: "10 min", title: "C. Superset fessiers + mollets", tag: "Superset", kind: "accessory",
      text: "Hip Thrust puis Standing Calf Raise, transition courte, vrai repos après le 2e.",
      exercises: [
        arnoldBeurtEx("Hip Thrust", "3×10-12", "RPE 7-8", "0:30 avant Standing Calf Raise", "Pause en haut, contraction fessiers complète."),
        arnoldBeurtEx("Standing Calf Raise", "4×15-20", "RPE 8", "1:00 après Hip Thrust", "Pause en haut, descente complète.")
      ] },
    { time: "5 min", title: "Sortie", tag: "Mobilité", kind: "mobility",
      text: "Mobilité hanches/ischios/mollets. Si le bas du dos parle, réduire la prochaine séance jambes." }
  ];
}

function arnoldBeurtBlocks(day, week){
  var type = arnoldBeurtSessionType(day, week);
  if(type === "A") return arnoldBeurtBlocksA();
  if(type === "B") return arnoldBeurtBlocksB();
  return arnoldBeurtBlocksC();
}

window.COACH_BERTIN_PROGRAMS.arnold_split_beurt.getBlocks = function(day, week){
  return arnoldBeurtBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.arnold_split_beurt.getWodText = function(){
  return "Aucun WOD — bloc hypertrophie hors-saison Arnold Split Beurt.";
};

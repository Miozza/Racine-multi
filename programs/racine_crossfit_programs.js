// Racine — catalogue CrossFit / haltéro / metcon V1.5
// Objectif V1.5 : corriger la branche sportive avec de vrais mouvements RX,
// des benchmarks/metcons connus une fois par semaine et de la variation réelle
// semaine par semaine. Données neutres, aucune donnée vivante utilisateur ici.

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

  var WEEK_LABELS = [
    "S1 Repères",
    "S2 Construction",
    "S3 Densité",
    "S4 Intensité",
    "S5 Test contrôlé",
    "S6 Assimilation"
  ];
  var WEEK_GOALS = [
    "Installer les standards techniques, trouver le bon scaling et noter les scores de départ.",
    "Monter le volume utile sans casser les positions. Garder une marge avant l'échec.",
    "Densité : transitions plus propres, moins de temps mort, mouvements encore solides.",
    "Intensité contrôlée : charges ou rythme plus hauts, aucune répétition laide acceptée.",
    "Semaine de test : benchmark clair, score comparable, scaling noté précisément.",
    "Assimilation : benchmark plus gérable ou bodyweight, qualité et récupération avant ego."
  ];

  var WEEK_SCHEMES = {
    haltero: [
      {load:0.62, tech:"8×2", strength:"4×5", support:"3×8", note:"Technique fraîche"},
      {load:0.66, tech:"9×2", strength:"5×4", support:"3×8", note:"Volume contrôlé"},
      {load:0.70, tech:"10×2", strength:"5×3", support:"3×6", note:"Densité"},
      {load:0.76, tech:"8×1", strength:"6×3", support:"3×5", note:"Intensité"},
      {load:0.72, tech:"6×1 propre", strength:"5×3", support:"2×6", note:"Test technique"},
      {load:0.52, tech:"6×2 léger", strength:"3×5 léger", support:"2×8 facile", note:"Assimilation"}
    ],
    rx: [
      {load:0.72, tech:"EMOM 8", strength:"5×5", support:"3×8", skill:"8 min qualité"},
      {load:0.76, tech:"EMOM 10", strength:"5×4", support:"3×8", skill:"10 min accumulation"},
      {load:0.80, tech:"EMOM 12", strength:"6×3", support:"3×6", skill:"12 min densité"},
      {load:0.84, tech:"EMOM 8 lourd", strength:"5×3", support:"2×6", skill:"8 min intense"},
      {load:0.78, tech:"test technique", strength:"4×3", support:"2×8", skill:"benchmark skill"},
      {load:0.58, tech:"technique léger", strength:"3×5 léger", support:"2×8 facile", skill:"qualité facile"}
    ],
    metcon: [
      {load:0.60, strength:"3×8", support:"3×10", skill:"8 min facile"},
      {load:0.64, strength:"4×8", support:"3×10", skill:"10 min contrôlé"},
      {load:0.62, strength:"4×10", support:"3×12", skill:"12 min densité"},
      {load:0.68, strength:"4×6", support:"3×8", skill:"12 min seuil"},
      {load:0.62, strength:"3×8", support:"2×12", skill:"benchmark contrôlé"},
      {load:0.50, strength:"2×10 léger", support:"2×10 facile", skill:"qualité + récupération"}
    ]
  };

  // Convention V4.5 : BASE_LOADS = 1RM ESTIMÉ DE L'ATHLÈTE DE RÉFÉRENCE
  // (reference.js ; ratios olympiques standards depuis le power clean 225).
  // Les multiplicateurs des schémas sont des %1RM réels ; le scaling par profil
  // ramène chaque client à son niveau.
  var BASE_LOADS = {
    "Back Squat":275,
    "Front Squat":215,
    "Overhead Squat":180,
    "Deadlift":330,
    "Bench Press":300,
    "Strict Press":185,
    "Push Press":215,
    "Push Jerk":225,
    "Split Jerk":235,
    "Thruster":170,
    "Power Clean":225,
    "Clean and Jerk":215,
    "Hang Power Clean":205,
    "Clean Pull":250,
    "Clean Deadlift":275,
    "Power Snatch":170,
    "Hang Power Snatch":155,
    "Snatch Pull":190,
    "Barbell Row":235,
    "Weighted Pull-up":0,
    "DB RDL":90,
    "DB Snatch":80,
    "DB Thruster":55,
    "Goblet Squat":100,
    "KB Swing":70,
    "Farmer Carry":90,
    "Wall Ball":30,
    "Walking Lunge DB":60,
    "Sumo Deadlift High Pull":115
  };

  var DAY_NAMES = {lundi:"Lundi", mardi:"Mardi", mercredi:"Mercredi", jeudi:"Jeudi", vendredi:"Vendredi", samedi:"Samedi", dimanche:"Dimanche"};
  var RX_MOVEMENT_PATTERN = /Chest-to-Bar|Toes-to-Bar|Handstand Push-up|Handstand Walk|Ring Muscle-up|Bar Muscle-up|Rope Climb|Double-under|Thruster|Snatch|Clean|Jerk|Wall Ball|Pistol|Bar-Facing Burpee|GHD/i;

  var RX_BENCHMARKS = [
    {
      name:"Fran",
      format:"For Time",
      prescription:"21-15-9 Thrusters 95/65 lb + Pull-Ups.",
      cap:"Cap 10 min",
      prep:["Thruster", "Pull-Up"],
      stimulus:"Court, violent, grip + épaules. Viser séries cassées intelligentes, pas explosion au premier 21.",
      scale:"Réduire thruster à charge cyclable; pull-ups bandés/ring rows si nécessaire."
    },
    {
      name:"Grace",
      format:"For Time",
      prescription:"30 Clean and Jerks 135/95 lb.",
      cap:"Cap 8 min",
      prep:["Clean and Jerk", "Push Jerk"],
      stimulus:"Puissance cyclable. Singles rapides ou petits sets; aucune réception molle.",
      scale:"Charge permettant 30 reps propres en moins de 8 min."
    },
    {
      name:"Helen",
      format:"3 rounds for time",
      prescription:"400 m Run + 21 KB Swings 53/35 lb + 12 Pull-Ups.",
      cap:"Cap 14 min",
      prep:["KB Swing", "Pull-Up"],
      stimulus:"Moteur + grip. Course soutenable; swings idéalement gros sets.",
      scale:"Row 500 m si pas de course; ring rows si pull-ups non solides."
    },
    {
      name:"DT",
      format:"5 rounds for time",
      prescription:"12 Deadlifts + 9 Hang Power Cleans + 6 Push Jerks à 155/105 lb.",
      cap:"Cap 15 min",
      prep:["Deadlift", "Hang Power Clean", "Push Jerk"],
      stimulus:"Barbell cycling lourd. Casser avant les hang cleans, protéger le bas du dos.",
      scale:"Charge où 1 round propre prend moins de 2:30 sans perte de position."
    },
    {
      name:"Fight Gone Bad",
      format:"3 rounds for reps",
      prescription:"1 min Wall Ball + 1 min Sumo Deadlift High Pull 75/55 + 1 min Box Jump + 1 min Push Press 75/55 + 1 min Row calories + 1 min repos.",
      cap:"17 min total",
      prep:["Wall Ball", "Sumo Deadlift High Pull", "Push Press"],
      stimulus:"Score total, pacing brutal. Ne pas ouvrir trop vite au premier round.",
      scale:"Charges légères, box step-up accepté. Score comparable si scaling noté."
    },
    {
      name:"Cindy",
      format:"AMRAP 20",
      prescription:"5 Pull-Ups + 10 Push-Ups + 15 Air Squats.",
      cap:"20 min",
      prep:["Pull-Up", "Push-Up", "Air Squat"],
      stimulus:"Bodyweight benchmark. Garder rounds réguliers, push-ups cassés tôt.",
      scale:"AMRAP 12-15 si récupération basse; ring rows/push-ups inclinés."
    }
  ];

  var METCON_BENCHMARKS = [
    {
      name:"Cindy",
      format:"AMRAP 20",
      prescription:"5 Pull-Ups + 10 Push-Ups + 15 Air Squats.",
      cap:"20 min",
      prep:["Pull-Up", "Push-Up", "Air Squat"],
      stimulus:"Pace stable, volume simple, excellent repère moteur.",
      scale:"Ring rows, push-ups inclinés, AMRAP 12-16 pour débutant."
    },
    {
      name:"Annie",
      format:"For Time",
      prescription:"50-40-30-20-10 Double-Unders + Sit-Ups.",
      cap:"12 min",
      prep:["Double-under", "Sit-Up"],
      stimulus:"Respiration + coordination. Ne pas transformer la corde en frustration.",
      scale:"Singles 2:1 ou 1:1 selon niveau; garder même scaling au retest."
    },
    {
      name:"Jackie",
      format:"For Time",
      prescription:"1000 m Row + 50 Thrusters 45/35 lb + 30 Pull-Ups.",
      cap:"16 min",
      prep:["Row", "Thruster", "Pull-Up"],
      stimulus:"Row contrôlé, thrusters légers mais longs, grip final.",
      scale:"750 m row, thrusters PVC/barre vide, ring rows selon niveau."
    },
    {
      name:"Helen",
      format:"3 rounds for time",
      prescription:"400 m Run + 21 KB Swings 53/35 lb + 12 Pull-Ups.",
      cap:"16 min",
      prep:["Run/Row", "KB Swing", "Pull-Up"],
      stimulus:"Seuil + transitions. Rester capable d'accélérer au 3e round.",
      scale:"Row 500 m ou bike 30/24 cal; ring rows si besoin."
    },
    {
      name:"Fight Gone Bad",
      format:"3 rounds for reps",
      prescription:"Wall Ball, Sumo Deadlift High Pull, Box Jump, Push Press, Row calories, 1 min chaque station + repos.",
      cap:"17 min total",
      prep:["Wall Ball", "Sumo Deadlift High Pull", "Push Press"],
      stimulus:"Gestion d'effort. Même score par round plutôt qu'un premier round héroïque.",
      scale:"Wall ball léger, SDHP léger, box step-up; score total."
    },
    {
      name:"Christine",
      format:"3 rounds for time",
      prescription:"500 m Row + 12 Deadlifts au poids du corps + 21 Box Jumps.",
      cap:"18 min",
      prep:["Row", "Deadlift", "Box Jump"],
      stimulus:"Hinge sous fatigue + moteur. Deadlift propre obligatoire.",
      scale:"Deadlift 50-70% poids de corps, step-ups, cap strict."
    }
  ];

  function round5(n){ return Math.max(0, Math.round(n / 5) * 5); }
  function wk(week){ return Math.max(1, Math.min(6, week || 1)); }
  function scheme(family, week){ return (WEEK_SCHEMES[family] || WEEK_SCHEMES.metcon)[wk(week) - 1]; }
  function pick(list, week){ return list[(wk(week) - 1) % list.length]; }
  function loadFor(name, week, family, bias){
    var base = BASE_LOADS[name];
    if(base === undefined) return "technique";
    var out = round5(base * scheme(family, week).load * (bias || 1));
    if(name === "Weighted Pull-up") return out <= 0 ? "poids du corps" : "+" + out + " lb";
    if(/DB|Farmer|Walking Lunge/.test(name)) return out + " lb / main";
    if(/KB|Wall Ball/.test(name)) return out + " lb";
    return out + " lb";
  }
  function ex(name, format, load, rest, note){ return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""}; }
  function wodBlock(text){ return {time:"10-20 min", title:"D. WOD / Metcon", tag:"WOD", kind:"wod", text:text}; }
  function movementNames(items){ return (items || []).join(", "); }

  function benchmarkText(bench, family){
    var prefix = family === "rx" ? "Benchmark RX connu" : "Metcon connu";
    return prefix + " — " + bench.name + " | " + bench.format + " | " + bench.prescription + " " + bench.cap + ". Stimulus : " + bench.stimulus + " Scaling : " + bench.scale;
  }

  function warmupFor(theme, bench){
    if(bench) return "Warm-up spécifique " + bench.name + " : cardio facile 3 min + mobilité ciblée + 2 rounds progressifs de " + movementNames(bench.prep) + ".";
    if(theme === "clean") return "Row 3 min + front rack mobilité + clean high pull léger + 3 ramp-up sets.";
    if(theme === "snatch") return "Bike 3 min + PVC pass-through + overhead squat léger + snatch balance technique.";
    if(theme === "jerk") return "Row 3 min + mobilité épaules/poignets + dip-drive drill + jerk footwork.";
    if(theme === "gym") return "Row 3 min + hollow/arch 2×20 sec + scap pull-up 2×8 + support hold.";
    if(theme === "engine") return "Zone 2 4 min + respiration nasale + mobilité hanches/chevilles.";
    if(theme === "threshold") return "Cardio facile 4 min + 3 accélérations de 20 sec + mobilité hanches/épaules.";
    if(theme === "mixed") return "Cardio facile 3 min + air squats + inchworms + 2 rounds très faciles du metcon.";
    return "Cardio facile 3 min + mobilité dynamique + 2 ramp-up sets.";
  }

  function formatBenchmarkPrep(bench, family, week){
    var s = scheme(family, week);
    return bench.prep.map(function(name){
      var fmt = /Pull-Up|Push-Up|Air Squat|Double-under|Sit-Up|Run|Row|Box Jump/.test(name) ? "3×qualité" : (family === "rx" ? s.tech : s.support);
      var load = loadFor(name, week, family);
      return ex(name, fmt, load, "0:30-1:00", "Préparer " + bench.name + " sans fatigue inutile.");
    });
  }

  var HALTERO_VARIANTS = {
    clean:[
      {main:"Power Clean", second:"Front Squat", support:"Clean Pull", wod:"EMOM 8 : 1 Power Clean technique + 6 burpees contrôlés."},
      {main:"Hang Power Clean", second:"Front Squat", support:"Clean Deadlift", wod:"AMRAP 8 : 5 Hang Power Cleans légers + 8 box jump/step-ups + 10 sit-ups."},
      {main:"Clean and Jerk", second:"Front Squat", support:"Barbell Row", wod:"For quality 10 min : 3 Clean and Jerks légers + 10 cal row."},
      {main:"Power Clean", second:"Deadlift", support:"Clean Pull", wod:"Every 2:00 × 5 : 5 Power Cleans + 7 bar-facing burpees."},
      {main:"Clean and Jerk", second:"Front Squat", support:"Farmer Carry", wod:"Benchmark court : Grace ajusté 30 Clean and Jerks, charge technique."},
      {main:"Hang Power Clean", second:"Front Squat", support:"Hollow Hold", wod:"Flush EMOM 8 : 2 Hang Power Cleans légers + respiration."}
    ],
    snatch:[
      {main:"Hang Power Snatch", second:"Overhead Squat", support:"Snatch Pull", wod:"AMRAP 7 : 6 DB Snatch alternés + 8 box step-ups + 10 sit-ups."},
      {main:"Power Snatch", second:"Overhead Squat", support:"Snatch Pull", wod:"EMOM 10 : 3 Power Snatches légers + 20 double-unders/singles."},
      {main:"Hang Power Snatch", second:"Back Squat", support:"Face Pull", wod:"AMRAP 9 : 9 Wall Balls + 6 Hang Power Snatches légers."},
      {main:"Power Snatch", second:"Overhead Squat", support:"Farmer Carry", wod:"For Time cap 8 : 21-15-9 DB Snatch + burpees."},
      {main:"Power Snatch", second:"Front Squat", support:"Snatch Pull", wod:"Benchmark court : Isabel ajusté 30 Snatches, charge technique."},
      {main:"Hang Power Snatch", second:"Overhead Squat", support:"Side Plank", wod:"Flush 8 min : row facile + PVC snatch technique."}
    ],
    jerk:[
      {main:"Push Jerk", second:"Push Press", support:"Front Rack Hold", wod:"For quality 8 min : 5 Push Jerks légers + 10 cal row + 20 sec front rack hold."},
      {main:"Split Jerk", second:"Push Press", support:"Farmer Carry", wod:"EMOM 9 : 2 Split Jerks légers + 8 wall balls."},
      {main:"Push Jerk", second:"Back Squat", support:"Strict Press", wod:"AMRAP 8 : 6 Push Jerks + 8 toes-to-bar/knee raises."},
      {main:"Clean and Jerk", second:"Front Squat", support:"Push Press", wod:"Every 90 sec × 6 : 1 Clean and Jerk + 6 burpees."},
      {main:"Split Jerk", second:"Push Press", support:"Weighted Pull-up", wod:"Benchmark court : 10 rounds qualité 1 jerk + 5 pull-ups."},
      {main:"Push Jerk", second:"Strict Press", support:"Dead Bug", wod:"Flush 8 min : bike facile + jerk footwork."}
    ],
    mixed:[
      {main:"Back Squat", second:"DB RDL", support:"KB Swing", wod:"AMRAP 8 : 8 cal row + 8 KB swings + 8 wall balls."},
      {main:"Deadlift", second:"Front Squat", support:"Barbell Row", wod:"AMRAP 10 : 5 deadlifts légers + 10 box jumps + 15 sit-ups."},
      {main:"Front Squat", second:"Power Clean", support:"Farmer Carry", wod:"EMOM 12 : min1 row cal, min2 wall ball, min3 burpees."},
      {main:"Back Squat", second:"Hang Power Clean", support:"Toes-to-Bar", wod:"For Time cap 10 : 3 rounds 12 wall balls + 9 hang cleans + 6 burpees."},
      {main:"Deadlift", second:"Push Jerk", support:"Hollow Hold", wod:"Benchmark court : DT très ajusté 3 rounds."},
      {main:"Goblet Squat", second:"DB RDL", support:"Farmer Carry", wod:"Flush 10 min : carries + bike facile."}
    ]
  };

  var RX_VARIANTS = {
    squat:[
      {main:"Front Squat", skill:"Toes-to-Bar", support:"Wall Ball", wod:"AMRAP 11 : 10 Wall Balls + 8 Toes-to-Bar + 6 Front Squats légers."},
      {main:"Back Squat", skill:"Pistol Progression", support:"Double-under", wod:"For Time cap 12 : 4 rounds 30 double-unders + 12 pistols/box step-down + 8 burpees."},
      {main:"Overhead Squat", skill:"Chest-to-Bar Pull-Up", support:"GHD Sit-Up", wod:"AMRAP 10 : 6 Overhead Squats légers + 8 Chest-to-Bar + 10 GHD/sit-ups."},
      {main:"Deadlift", skill:"Rope Climb", support:"Box Jump", wod:"Every 3:00 × 4 : 12 Deadlifts modérés + 1 Rope Climb + 12 Box Jumps."},
      {main:"Front Squat", skill:"Bar Muscle-up Progression", support:"Farmer Carry", wod:"AMRAP 9 : 5 Front Squats lourds-propres + 3 Bar Muscle-ups/progression + 30 m carry."},
      {main:"Back Squat", skill:"Strict Pull-Up", support:"Hollow Hold", wod:"AMRAP 12 facile : 5 Pull-Ups + 10 Push-Ups + 15 Air Squats, RPE 7."}
    ],
    barbell:[
      {main:"Power Clean", skill:"Bar-Facing Burpee", support:"Push Press", wod:"Every 2:00 × 5 : 6 Power Cleans + 8 Bar-Facing Burpees."},
      {main:"Clean and Jerk", skill:"Double-under", support:"Front Rack Lunge", wod:"AMRAP 10 : 5 Clean and Jerks + 40 Double-Unders + 10 Lunges."},
      {main:"Power Snatch", skill:"Toes-to-Bar", support:"Overhead Squat", wod:"For Time cap 10 : 21-15-9 Power Snatches légers + Toes-to-Bar."},
      {main:"Thruster", skill:"Chest-to-Bar Pull-Up", support:"DB RDL", wod:"AMRAP 8 : 7 Thrusters + 7 Chest-to-Bar. Casser avant échec."},
      {main:"Deadlift", skill:"Handstand Push-up", support:"Hang Power Clean", wod:"Diane ajusté : 21-15-9 Deadlifts + Handstand Push-ups/progression."},
      {main:"Hang Power Clean", skill:"Burpee", support:"Barbell Row", wod:"EMOM 10 léger : min1 8 Hang Cleans, min2 10 Burpees contrôlés."}
    ],
    gym:[
      {main:"Strict Press", skill:"Chest-to-Bar Pull-Up", support:"Ring Dip", wod:"AMRAP 10 : 5 Chest-to-Bar + 10 Push-Ups + 15 Air Squats."},
      {main:"Push Press", skill:"Toes-to-Bar", support:"Double-under", wod:"AMRAP 12 : 8 Toes-to-Bar + 12 Push Press légers + 40 Double-Unders."},
      {main:"Strict Press", skill:"Handstand Push-up", support:"Barbell Row", wod:"Every 90 sec × 8 : 5 HSPU/progression + 8 cal bike."},
      {main:"Weighted Pull-up", skill:"Ring Muscle-up Progression", support:"DB Thruster", wod:"AMRAP 10 : 2 Ring Muscle-ups/progression + 8 DB Thrusters + 12 cal row."},
      {main:"Push Jerk", skill:"Handstand Walk", support:"Toes-to-Bar", wod:"For Time cap 12 : 5 rounds 25 ft Handstand Walk/progression + 10 Toes-to-Bar."},
      {main:"Strict Press", skill:"Strict Pull-Up", support:"Face Pull", wod:"EMOM 12 facile : strict pull + push-up + hollow, qualité."}
    ],
    mixed:[
      {main:"Front Squat", skill:"Double-under", support:"Wall Ball", wod:"AMRAP 12 : 10 cal row + 10 Wall Balls + 30 Double-Unders."},
      {main:"Deadlift", skill:"Box Jump Over", support:"KB Swing", wod:"For Time cap 14 : 5 rounds 12 KB Swings + 10 Box Jump Overs + 8 Deadlifts."},
      {main:"Thruster", skill:"Pull-Up", support:"Farmer Carry", wod:"AMRAP 9 : 9 Thrusters + 9 Pull-Ups + 40 m Farmer Carry."},
      {main:"Power Snatch", skill:"Burpee Box Jump", support:"GHD Sit-Up", wod:"AMRAP 11 : 6 Power Snatches + 8 Burpee Box Jumps + 12 GHD/Sit-Ups."},
      {main:"Clean and Jerk", skill:"Rope Climb", support:"Walking Lunge DB", wod:"For Time cap 12 : 4 rounds 3 Clean and Jerks + 1 Rope Climb + 16 Lunges."},
      {main:"Goblet Squat", skill:"Single-under", support:"Dead Bug", wod:"Flush AMRAP 10 : easy row + goblet squats + mobility."}
    ]
  };

  var METCON_VARIANTS = {
    engine:[
      {main:"Goblet Squat", support:"Farmer Carry", engine:"Row/Bike 8×40 sec effort / 20 sec facile", wod:"Zone control 12 : 10 cal row + 12 walking lunges + 10 sit-ups."},
      {main:"DB RDL", support:"Push-Up", engine:"Bike 10×30 sec fort / 30 sec facile", wod:"AMRAP 10 : 8 DB Snatches + 10 box step-ups + 12 sit-ups."},
      {main:"Front Squat", support:"Ring Row", engine:"Row 5×2 min soutenable / 1 min facile", wod:"EMOM 12 : min1 row cal, min2 air squats, min3 ring rows."},
      {main:"KB Swing", support:"Wall Ball", engine:"Bike/Row 3×4 min seuil / 2 min facile", wod:"AMRAP 12 : 10 KB Swings + 10 Wall Balls + 10 Burpees."},
      {main:"Deadlift", support:"Farmer Carry", engine:"Row 2×6 min négative split", wod:"For Time cap 12 : 1000 m row + 50 air squats + 30 sit-ups."},
      {main:"Goblet Squat", support:"Dead Bug", engine:"Zone 2 12 min facile", wod:"Flush 10 : bike facile + mobilité + nasal breathing."}
    ],
    threshold:[
      {main:"KB Swing", support:"Push-Up", engine:"Pace practice 3 rounds faciles", wod:"AMRAP 12 : 10 cal row + 10 KB Swings + 10 Burpees."},
      {main:"Wall Ball", support:"Ring Row", engine:"Transitions : wall ball → row → lunge", wod:"For Time cap 14 : 4 rounds 15 Wall Balls + 12 Ring Rows + 9 Burpees."},
      {main:"DB Thruster", support:"Sit-Up", engine:"EMOM 10 alterné", wod:"AMRAP 13 : 8 DB Thrusters + 12 Sit-Ups + 40 Single-Unders."},
      {main:"Deadlift", support:"Box Step-Up", engine:"Seuil 12 min progressif", wod:"AMRAP 12 : 8 Deadlifts légers + 12 Box Step-Ups + 16 Mountain Climbers."},
      {main:"Walking Lunge DB", support:"Push Press", engine:"Negative split test", wod:"For Time cap 15 : 21-15-9 DB Push Press + Burpees + Lunges."},
      {main:"KB Swing", support:"Side Plank", engine:"Technique 8 min facile", wod:"Flush EMOM 12 : swings légers, plank, bike facile."}
    ],
    bodyweight:[
      {main:"Walking Lunge DB", support:"Strict Press", engine:"EMOM bodyweight 12", wod:"AMRAP 12 : 12 Air Squats + 10 Push-Ups + 8 Ring Rows."},
      {main:"Goblet Squat", support:"Hollow Hold", engine:"Core + respiration", wod:"For Time cap 10 : 50-40-30-20-10 Single-Unders + Sit-Ups."},
      {main:"DB RDL", support:"Face Pull", engine:"Density practice", wod:"EMOM 15 : min1 air squats, min2 push-ups, min3 sit-ups."},
      {main:"Wall Ball", support:"Ring Row", engine:"Soutenable 14 min", wod:"AMRAP 14 : 10 Wall Balls + 10 Ring Rows + 10 Step-Ups."},
      {main:"Farmer Carry", support:"Push-Up", engine:"Carry intervals", wod:"For Time cap 12 : 5 rounds 30 m carry + 15 push-ups + 20 squats."},
      {main:"Goblet Squat", support:"Dead Bug", engine:"Easy movement quality", wod:"Flush 10 : walk/bike + squats + mobility."}
    ],
    mixed:[
      {main:"Front Squat", support:"Barbell Row", engine:"Transitions row → wall ball → lunge", wod:"AMRAP 10 : 8 cal row + 10 Wall Balls + 12 Walking Lunges."},
      {main:"Deadlift", support:"DB Thruster", engine:"2 rounds easy + 1 round strong", wod:"AMRAP 12 : 6 Deadlifts + 8 DB Thrusters + 10 Box Step-Ups."},
      {main:"KB Swing", support:"Push-Up", engine:"Grip management", wod:"For Time cap 13 : 5 rounds 15 KB Swings + 12 Push-Ups + 9 Burpees."},
      {main:"Goblet Squat", support:"Ring Row", engine:"Respiration sous fatigue", wod:"AMRAP 14 : 12 Goblet Squats + 12 Ring Rows + 12 cal bike."},
      {main:"Wall Ball", support:"Farmer Carry", engine:"Pace test", wod:"For Time cap 15 : 60 Wall Balls + 800 m Row + 60 Sit-Ups."},
      {main:"DB RDL", support:"Side Plank", engine:"Easy transitions", wod:"Flush EMOM 12 : row, carry, mobility."}
    ]
  };

  function buildHaltero(theme, week){
    var s = scheme("haltero", week);
    var v = pick(HALTERO_VARIANTS[theme] || HALTERO_VARIANTS.mixed, week);
    return [
      {time:"7 min", title:"Warm-up spécifique", tag:"Préparation", kind:"warmup", text:warmupFor(theme)},
      {time:"14 min", title:"A. Technique haltéro — " + v.main, tag:"Haltéro", kind:"main", exercises:[ex(v.main, s.tech, loadFor(v.main, week, "haltero"), "0:45-1:30", s.note + ". Réception solide, aucun échec.")]},
      {time:"12 min", title:"B. Force support — " + v.second, tag:"Force", kind:"strength", exercises:[ex(v.second, s.strength, loadFor(v.second, week, "haltero"), "1:30-2:00", "Force utile au lift du jour.")]},
      {time:"8 min", title:"C. Support — " + v.support, tag:"Support", kind:"accessory", exercises:[ex(v.support, s.support, loadFor(v.support, week, "haltero", 0.9), "0:45-1:00", "Renforcer sans voler le WOD.")]},
      wodBlock(v.wod),
      {time:"4 min", title:"Cooldown", tag:"Mobilité", kind:"mobility", text:"Respiration + mobilité poignets/épaules/hanches. Noter charge, vitesse et qualité technique."}
    ];
  }

  function buildRx(theme, week){
    if(theme === "benchmark"){
      var bench = pick(RX_BENCHMARKS, week);
      return [
        {time:"8 min", title:"Warm-up benchmark — " + bench.name, tag:"Préparation", kind:"warmup", text:warmupFor(theme, bench)},
        {time:"12 min", title:"A. Standards RX ajustés", tag:"Skill", kind:"main", exercises:formatBenchmarkPrep(bench, "rx", week)},
        {time:"8 min", title:"B. Stratégie", tag:"Pacing", kind:"skill", text:"Choisir le scaling avant de partir. Objectif : stimulus de " + bench.name + ", pas copier RX si le mouvement n'est pas maîtrisé."},
        wodBlock(benchmarkText(bench, "rx")),
        {time:"5 min", title:"Cooldown + score", tag:"Analyse", kind:"mobility", text:"Noter score, scaling exact, RPE, coupure des séries et mouvement limitant."}
      ];
    }
    var s = scheme("rx", week);
    var v = pick(RX_VARIANTS[theme] || RX_VARIANTS.mixed, week);
    return [
      {time:"7 min", title:"Warm-up RX", tag:"Préparation", kind:"warmup", text:warmupFor(theme)},
      {time:"14 min", title:"A. Principal — " + v.main, tag:"Principal", kind:"main", exercises:[ex(v.main, theme === "barbell" ? s.tech : s.strength, loadFor(v.main, week, "rx"), "1:00-2:30", "Mouvement RX utile. Technique avant chrono.")]},
      {time:"11 min", title:"B. Skill RX — " + v.skill, tag:"Skill", kind:"skill", exercises:[ex(v.skill, s.skill, loadFor(v.skill, week, "rx"), "qualité", "Adapter : strict, progression, bandé ou volume réduit.")]},
      {time:"8 min", title:"C. Support — " + v.support, tag:"Support", kind:"accessory", exercises:[ex(v.support, s.support, loadFor(v.support, week, "rx", 0.85), "0:45-1:15", "Support sans vider le système nerveux.")]},
      wodBlock(v.wod),
      {time:"4 min", title:"Cooldown", tag:"Mobilité", kind:"mobility", text:"Respiration + mobilité spécifique. Noter score/RPE et mouvement RX limitant."}
    ];
  }

  function buildMetcon(theme, week){
    if(theme === "benchmark"){
      var bench = pick(METCON_BENCHMARKS, week);
      return [
        {time:"8 min", title:"Warm-up metcon connu — " + bench.name, tag:"Préparation", kind:"warmup", text:warmupFor(theme, bench)},
        {time:"10 min", title:"A. Préparation mouvements", tag:"Technique", kind:"main", exercises:formatBenchmarkPrep(bench, "metcon", week)},
        {time:"8 min", title:"B. Pace practice", tag:"Pacing", kind:"conditioning", text:"Faire 1-2 mini-rounds à 60 %. Ajuster charge/reps maintenant. Le score doit être comparable au prochain retest."},
        wodBlock(benchmarkText(bench, "metcon")),
        {time:"5 min", title:"Retour au calme + score", tag:"Analyse", kind:"mobility", text:"Noter score, scaling, respiration, transitions et mouvement limitant."}
      ];
    }
    var s = scheme("metcon", week);
    var v = pick(METCON_VARIANTS[theme] || METCON_VARIANTS.mixed, week);
    return [
      {time:"7 min", title:"Warm-up moteur", tag:"Préparation", kind:"warmup", text:warmupFor(theme)},
      {time:"11 min", title:"A. Force minimale — " + v.main, tag:"Principal", kind:"main", exercises:[ex(v.main, s.strength, loadFor(v.main, week, "metcon"), "0:45-1:30", "Renforcer sans nuire au moteur.")]},
      {time:"8 min", title:"B. Support — " + v.support, tag:"Support", kind:"accessory", exercises:[ex(v.support, s.support, loadFor(v.support, week, "metcon", 0.8), "0:30-1:00", "Simple, propre, respirable.")]},
      {time:"10 min", title:"C. Travail moteur", tag:"Conditioning", kind:"conditioning", text:v.engine},
      wodBlock(v.wod),
      {time:"4 min", title:"Retour au calme", tag:"Récupération", kind:"mobility", text:"Marcher ou pédaler facile 2 min + respiration. Noter si le pace était soutenable."}
    ];
  }

  function buildDay(spec, family, week){
    if(family === "haltero") return buildHaltero(spec.theme, week || 1);
    if(family === "rx") return buildRx(spec.theme, week || 1);
    return buildMetcon(spec.theme, week || 1);
  }

  function program(cfg){
    var s = WEEK_SCHEMES[cfg.family] || WEEK_SCHEMES.metcon;
    var obj = {
      id:cfg.id,
      label:cfg.label,
      phaseName:cfg.phaseName,
      impact:cfg.impact,
      weeks:6,
      days:cfg.days.slice(),
      weekLabels:WEEK_LABELS.slice(),
      weekGoals:WEEK_GOALS.slice(),
      sets:s.map(function(x){ return x.strength || x.tech || "variable"; }),
      targetReps:cfg.family === "rx" ? [5,4,3,3,3,5] : cfg.family === "haltero" ? [2,2,2,1,1,2] : [8,8,10,6,8,10],
      mult:s.map(function(x){ return x.load; }),
      rest:cfg.family === "rx" ? "0:30–3:00" : cfg.family === "haltero" ? "0:45–2:00" : "0:20–1:30",
      tag:cfg.tag,
      objective:cfg.objective,
      audience:cfg.audience,
      frequency:cfg.days.length,
      versionDate:"2026-06-22",
      versionLabel:"2026-06-22 — CrossFit V1.5 : RX/metcon connus + variation hebdo",
      dayIntentions:{},
      dayMeta:{},
      cycleRules:cfg.rules || []
    };
    cfg.days.forEach(function(day, idx){
      var spec = cfg.plan[idx] || cfg.plan[cfg.plan.length - 1] || {theme:"mixed", base:"Mixed", focus:"Conditioning"};
      obj.dayIntentions[day] = spec.intent || (spec.base + " : " + spec.focus + ".");
      obj.dayMeta[day] = {label:DAY_NAMES[day] || day, base:spec.base, focus:spec.focus, theme:spec.theme};
    });
    obj.getBlocks = function(day, week){
      var idx = cfg.days.indexOf(day);
      var spec = cfg.plan[idx >= 0 ? idx : 0] || cfg.plan[0] || {theme:"mixed"};
      return buildDay(spec, cfg.family, week || 1);
    };
    obj.getWodText = function(day, week){
      var blocks = obj.getBlocks(day, week || 1).filter(function(b){ return b.kind === "wod"; });
      return blocks[0] ? blocks[0].text : "";
    };
    window.COACH_BERTIN_PROGRAMS[cfg.id] = obj;
  }

  var commonRules = [
    "Les charges sont des repères neutres : le profil actif les met à l'échelle.",
    "La technique prime sur le chrono. Une répétition laide ne compte pas comme progrès.",
    "Adapter mouvements gymniques : strict, bandé, ring row, knee raise ou version réduite selon le niveau.",
    "RPE 9 rarement. Si le sommeil ou les douleurs montent, réduire le volume immédiatement."
  ];
  var halteroRules = commonRules.concat([
    "Haltéro CrossFit n'est pas un cycle olympique pur : les lifts servent le WOD, pas l'ego.",
    "Snatch et jerk restent techniques. Si mobilité insuffisante, garder power variation et réduire amplitude."
  ]);
  var rxRules = commonRules.concat([
    "Performance RX est réservé à un utilisateur intermédiaire/avancé qui maîtrise déjà les bases.",
    "Une seule séance benchmark connue par semaine. Les autres séances construisent les qualités RX.",
    "Les mouvements RX incluent C2B, T2B, HSPU, muscle-up/rope climb progressions, double-under, barbell cycling et wall ball selon la semaine.",
    "Les standards RX sont une direction, pas une obligation : l'app doit rester ajustable au profil."
  ]);
  var metconRules = commonRules.concat([
    "Préparation Metcon construit le moteur avant de chercher des charges complexes sous fatigue.",
    "Une seule séance metcon connu par semaine : benchmark noté, scaling stable, score comparable.",
    "Le pace doit rester répétable. Si la séance devient un carnage, elle est trop dure."
  ]);

  var catalog = [
    {id:"client_haltero_crossfit_3d", label:"Haltéro CrossFit — 3 jours/semaine", family:"haltero", objective:"haltéro crossfit", audience:"intermédiaire", tag:"haltéro 3 jours", phaseName:"Technique haltéro + WOD courts", days:["lundi","mercredi","vendredi"], impact:"Trois séances pour apprendre clean/snatch/jerk en contexte CrossFit sans volume excessif.", rules:halteroRules, plan:[{theme:"clean", base:"Clean + front squat", focus:"Power Clean, Front Squat, metcon court"},{theme:"snatch", base:"Snatch technique", focus:"Hang Power Snatch, overhead stabilité"},{theme:"jerk", base:"Jerk + engine", focus:"Push Jerk, Push Press, WOD court"}]},
    {id:"client_haltero_crossfit_4d", label:"Haltéro CrossFit — 4 jours/semaine", family:"haltero", objective:"haltéro crossfit", audience:"intermédiaire/avancé", tag:"haltéro 4 jours", phaseName:"Clean / Snatch / Squat / Jerk", days:["lundi","mardi","jeudi","vendredi"], impact:"Quatre jours pour mieux répartir les lifts, garder de la force et ajouter des WOD courts sans surcharger la technique.", rules:halteroRules, plan:[{theme:"clean", base:"Clean", focus:"Power Clean + Front Squat"},{theme:"snatch", base:"Snatch", focus:"Hang Power Snatch + overhead"},{theme:"mixed", base:"Squat support", focus:"Squat + hinge"},{theme:"jerk", base:"Jerk", focus:"Push Jerk + metcon"}]},
    {id:"client_haltero_crossfit_5d", label:"Haltéro CrossFit — 5 jours/semaine", family:"haltero", objective:"haltéro crossfit", audience:"avancé", tag:"haltéro 5 jours", phaseName:"Haltéro technique fréquente", days:["lundi","mardi","mercredi","vendredi","samedi"], impact:"Version avancée : exposition fréquente aux lifts, force support et engine court. À utiliser seulement si récupération solide.", rules:halteroRules.concat(["Si la vitesse de barre chute deux séances de suite : retirer la séance samedi."]), plan:[{theme:"clean", base:"Clean lourd propre", focus:"Power Clean + front squat"},{theme:"snatch", base:"Snatch technique", focus:"Hang Power Snatch"},{theme:"jerk", base:"Jerk", focus:"Push Jerk + lockout"},{theme:"mixed", base:"Squat/hinge support", focus:"Back Squat + DB RDL"},{theme:"clean", base:"Barbell cycling", focus:"Complex léger + metcon"}]},

    {id:"client_rx_crossfit_4d", label:"Performance RX CrossFit — 4 jours/semaine", family:"rx", objective:"performance RX crossfit", audience:"intermédiaire/avancé", tag:"rx 4 jours", phaseName:"Force, skills RX, barbell cycling, benchmark connu", days:["lundi","mardi","jeudi","vendredi"], impact:"Pour utilisateur qui veut s'approcher d'un format RX : force, gymnastique avancée, barbell cycling et un benchmark connu chaque semaine.", rules:rxRules, plan:[{theme:"squat", base:"Strength + skill RX", focus:"Squat, T2B/C2B, midline"},{theme:"barbell", base:"Barbell cycling", focus:"Clean/snatch/thruster cycling"},{theme:"gym", base:"Gymnastique RX", focus:"C2B, T2B, HSPU, muscle-up progressions"},{theme:"benchmark", base:"Benchmark connu", focus:"Fran/Grace/Helen/DT/FGB/Cindy selon la semaine"}]},
    {id:"client_rx_crossfit_5d", label:"Performance RX CrossFit — 5 jours/semaine", family:"rx", objective:"performance RX crossfit", audience:"avancé", tag:"rx 5 jours", phaseName:"Préparation RX avancée", days:["lundi","mardi","mercredi","vendredi","samedi"], impact:"Programme avancé avec force lourde, skills RX, barbell cycling, mixed modal et un benchmark connu par semaine.", rules:rxRules.concat(["Programme non recommandé à un débutant. Si deux WODs explosent la récupération, basculer vers RX 4 jours."]), plan:[{theme:"squat", base:"Lower strength RX", focus:"Squat + skill"},{theme:"barbell", base:"Barbell cycling", focus:"Clean/snatch/thruster"},{theme:"gym", base:"Gymnastics RX", focus:"C2B/T2B/HSPU/MU progressions"},{theme:"mixed", base:"Mixed modal RX", focus:"Wall ball, double-under, rope climb, hinge"},{theme:"benchmark", base:"Benchmark connu", focus:"Fran/Grace/Helen/DT/FGB/Cindy selon la semaine"}]},

    {id:"client_metcon_prep_2d", label:"Préparation Metcon — 2 jours/semaine", family:"metcon", objective:"préparation metcon", audience:"débutant/intermédiaire", tag:"metcon 2 jours", phaseName:"Moteur minimal efficace + metcon connu", days:["lundi","jeudi"], impact:"Deux séances pour bâtir cardio, transitions et tolérance au volume avec un metcon connu par semaine.", rules:metconRules, plan:[{theme:"engine", base:"Engine base", focus:"Intervalles row/bike + force simple"},{theme:"benchmark", base:"Metcon connu", focus:"Cindy/Annie/Jackie/Helen/FGB/Christine selon la semaine"}]},
    {id:"client_metcon_prep_3d", label:"Préparation Metcon — 3 jours/semaine", family:"metcon", objective:"préparation metcon", audience:"débutant/intermédiaire", tag:"metcon 3 jours", phaseName:"Base moteur 3x/semaine + benchmark", days:["lundi","mercredi","vendredi"], impact:"Trois expositions : aérobie, seuil et metcon connu. Bon pont vers CrossFit sans se brûler.", rules:metconRules, plan:[{theme:"engine", base:"Aérobie", focus:"Row/bike + carries"},{theme:"threshold", base:"Seuil", focus:"KB swing, burpees, pace"},{theme:"benchmark", base:"Metcon connu", focus:"Cindy/Annie/Jackie/Helen/FGB/Christine selon la semaine"}]},
    {id:"client_metcon_prep_4d", label:"Préparation Metcon — 4 jours/semaine", family:"metcon", objective:"préparation metcon", audience:"intermédiaire", tag:"metcon 4 jours", phaseName:"Densité, moteur et metcon connu", days:["lundi","mardi","jeudi","vendredi"], impact:"Quatre séances pour améliorer moteur et transitions, avec un metcon connu par semaine et trois séances de construction variées.", rules:metconRules, plan:[{theme:"engine", base:"Engine", focus:"Intervalles cardio"},{theme:"mixed", base:"Mixed modal", focus:"Squat/row/wall ball"},{theme:"threshold", base:"Threshold", focus:"KB swing + burpees"},{theme:"benchmark", base:"Metcon connu", focus:"Cindy/Annie/Jackie/Helen/FGB/Christine selon la semaine"}]}
  ];

  catalog.forEach(program);
  window.RACINE_CROSSFIT_PROGRAM_CATALOG_IDS = catalog.map(function(x){ return x.id; });
  window.RACINE_CROSSFIT_KNOWN_BENCHMARKS = {
    rx: RX_BENCHMARKS.map(function(x){ return x.name; }),
    metcon: METCON_BENCHMARKS.map(function(x){ return x.name; }),
    rxMovementPattern: RX_MOVEMENT_PATTERN.source
  };
})();

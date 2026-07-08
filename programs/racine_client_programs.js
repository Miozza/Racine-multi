// Racine — catalogue client multi-objectifs V1.5
// Objectif : offrir des programmes prêts à tester pour plusieurs profils,
// fréquences et intentions. Les charges restent des références neutres :
// scripts/charge/scaling.js les adapte au profil actif.

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

  var WEEK_LABELS = ["S1 Repères", "S2 Construction", "S3 Volume utile", "S4 Surcharge", "S5 Consolidation", "S6 Deload"];
  var WEEK_GOALS = [
    "Trouver les charges propres. RPE 6-7 pour débutant, 7-8 pour les autres.",
    "Ajouter un peu de volume sans casser la technique.",
    "Semaine de travail la plus dense. Garder 1-2 reps en réserve.",
    "Surcharge contrôlée. Aucun grind, aucune série à l'échec.",
    "Consolider les charges. Réduire le volume si le sommeil ou la récupération baisse.",
    "Deload. Garder le mouvement, sortir frais."
  ];

  var WEEK_SCHEMES = {
    beginner: [
      {main:"3×8", support:"2×10", accessory:"2×12", load:0.58, note:"apprentissage", wod:"facile"},
      {main:"3×8", support:"3×10", accessory:"2×12", load:0.60, note:"construction", wod:"facile"},
      {main:"3×10", support:"3×10", accessory:"3×12", load:0.55, note:"volume propre", wod:"modéré"},
      {main:"4×8", support:"3×8", accessory:"3×10", load:0.63, note:"un peu plus lourd", wod:"court"},
      {main:"3×8", support:"3×10", accessory:"2×12", load:0.60, note:"consolidation", wod:"contrôlé"},
      {main:"2×10 léger", support:"2×10 léger", accessory:"2×12 facile", load:0.45, note:"deload", wod:"flush"}
    ],
    hypertrophy: [
      {main:"4×8", support:"3×10", accessory:"3×12-15", load:0.68, note:"base", wod:"court"},
      {main:"4×8", support:"4×10", accessory:"3×12-15", load:0.70, note:"volume", wod:"modéré"},
      {main:"4×10", support:"4×10", accessory:"4×12-15", load:0.64, note:"volume utile", wod:"contrôlé"},
      {main:"4×8", support:"3×8", accessory:"3×10-12", load:0.73, note:"surcharge", wod:"court"},
      {main:"5×6", support:"3×8", accessory:"3×10", load:0.77, note:"intensité", wod:"très court"},
      {main:"3×10 léger", support:"2×10 léger", accessory:"2×15", load:0.52, note:"deload", wod:"flush"}
    ],
    strength: [
      {main:"5×5", support:"3×6", accessory:"2×10", load:0.78, note:"base force", wod:"minimal"},
      {main:"5×5", support:"4×6", accessory:"2×10", load:0.80, note:"construction", wod:"minimal"},
      {main:"6×4", support:"4×6", accessory:"3×8", load:0.83, note:"force", wod:"court"},
      {main:"5×3", support:"3×5", accessory:"2×8", load:0.86, note:"lourd propre", wod:"très court"},
      {main:"4×4", support:"3×5", accessory:"2×10", load:0.82, note:"consolidation", wod:"court"},
      {main:"3×5 léger", support:"2×6 léger", accessory:"2×10 facile", load:0.60, note:"deload", wod:"flush"}
    ],
    recomposition: [
      {main:"3×8", support:"3×10", accessory:"2×12", load:0.62, note:"base", wod:"modéré"},
      {main:"4×8", support:"3×10", accessory:"3×12", load:0.64, note:"construction", wod:"modéré"},
      {main:"4×10", support:"3×12", accessory:"3×12", load:0.59, note:"densité", wod:"soutenu"},
      {main:"4×8", support:"3×8", accessory:"2×12", load:0.68, note:"surcharge", wod:"court"},
      {main:"3×8", support:"3×10", accessory:"3×12", load:0.64, note:"consolidation", wod:"soutenu"},
      {main:"2×10 léger", support:"2×10 léger", accessory:"2×12 facile", load:0.48, note:"deload", wod:"flush"}
    ],
    hybrid: [
      {main:"4×6", support:"3×8", accessory:"2×12", load:0.70, note:"technique + moteur", wod:"modéré"},
      {main:"4×6", support:"3×8", accessory:"3×12", load:0.72, note:"construction", wod:"modéré"},
      {main:"5×5", support:"3×8", accessory:"3×10", load:0.75, note:"volume force", wod:"soutenu"},
      {main:"5×3", support:"3×6", accessory:"2×10", load:0.82, note:"puissance", wod:"court intense"},
      {main:"4×4", support:"3×8", accessory:"2×12", load:0.77, note:"consolidation", wod:"benchmark court"},
      {main:"3×6 léger", support:"2×8 léger", accessory:"2×12 facile", load:0.55, note:"deload", wod:"flush"}
    ]
  };

  // Convention V4.5 : BASE_LOADS = 1RM ESTIMÉ DE L'ATHLÈTE DE RÉFÉRENCE
  // (scripts/profiles/reference.js). Les multiplicateurs de WEEK_SCHEMES sont
  // des %1RM réels. Le scaling par profil (scripts/charge/scaling.js) ramène
  // ensuite chaque client à son niveau. Ne jamais écrire ici une « charge de
  // travail » : c'est la double réduction qui rendait les poids ridicules.
  var BASE_LOADS = {
    "Back Squat": 275,
    "Front Squat": 215,
    "Bench Press": 300,
    "Strict Press": 185,
    "Push Press": 215,
    "Barbell Row": 235,
    "Hip Thrust": 400,
    "DB RDL": 90,
    "Bulgarian Split Squat": 65,
    "Weighted Pull-up": 0,
    "Incline DB Press": 75,
    "Power Clean": 225,
    "Deadlift": 330,
    "Landmine Press": 100,
    "Goblet Squat": 100,
    "Farmer Carry": 90,
    "KB Swing": 70,
    "DB Snatch": 80,
    "DB Curl": 45,
    "Triceps Rope Pushdown": 100,
    "Overhead Rope Extension": 90,
    "Face Pull": 100,
    "Lateral Raise DB": 35,
    "Rear Delt Fly DB": 35
  };

  var DAY_NAMES = {
    lundi:"Lundi", mardi:"Mardi", mercredi:"Mercredi", jeudi:"Jeudi", vendredi:"Vendredi", samedi:"Samedi", dimanche:"Dimanche"
  };

  function round5(n){ return Math.max(0, Math.round(n / 5) * 5); }
  function loadFor(name, week, family, bias){
    var scheme = (WEEK_SCHEMES[family] || WEEK_SCHEMES.hypertrophy)[Math.max(0, Math.min(5, (week || 1) - 1))];
    var base = BASE_LOADS[name];
    if(base === undefined) return "modéré";
    var factor = scheme.load * (bias || 1);
    var out = round5(base * factor);
    if(name === "Weighted Pull-up") return out <= 0 ? "poids du corps" : "+" + out + " lb";
    if(/DB|Bulgarian|Farmer/.test(name)) return out + " lb / main";
    if(/KB/.test(name)) return out + " lb";
    return out + " lb";
  }
  function ex(name, format, load, rest, note){
    return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
  }
  function wodText(theme, family, week){
    var deload = week === 6;
    if(deload) return "Zone 2 facile 6 min + mobilité. Objectif : ressortir mieux qu'au début.";
    if(family === "beginner") return "AMRAP 6 technique : 8 air squats + 8 ring rows + 8 dead bugs. Stop si la forme baisse.";
    if(family === "recomposition") return "AMRAP 10 : 10 cal bike/row + 10 KB swings + 10 sit-ups. Rythme soutenable, pas sprint.";
    if(family === "hybrid") return theme === "power" ? "EMOM 10 : 2 Power Clean techniques + 8 burpees contrôlés." : "AMRAP 9 : 8 cal row + 8 DB snatch alternés + 8 box step-ups.";
    if(family === "strength") return "Finisher 6 min facile : farmer carry + respiration. Ne pas voler la récupération.";
    return "AMRAP 7 : 10 air squats + 10 push-ups + 10 ring rows. Pompe, pas destruction.";
  }
  function warmupFor(theme){
    if(theme === "squat" || theme === "legs") return "Bike 3 min + air squats 2×10 + glute bridge 2×12 + ramp-up squat progressif.";
    if(theme === "hinge" || theme === "posterior") return "Row 3 min + hip hinge drill 2×10 + glute bridge 2×12 + ramp-up hanches.";
    if(theme === "upper" || theme === "push") return "Row 3 min + band pull-aparts 2×15 + scap push-ups 2×8 + ramp-up press.";
    if(theme === "pull") return "Row 3 min + dead hang 2×20 sec + band row 2×15 + activation scapula.";
    if(theme === "power") return "Row 3 min + front rack mobility + clean high pull léger + ramp-up technique.";
    return "Cardio facile 3 min + mobilité dynamique hanches/épaules + 2 ramp-up sets.";
  }
  // Rotation hebdomadaire (V4.5) : le mouvement PRINCIPAL reste identique tout
  // le cycle — c'est lui qui porte la progression visible et la « surprise »
  // de fin de cycle. Les blocs B/C tournent chaque semaine dans des banques de
  // variantes du même pattern : fraîcheur sans perdre la mesure du progrès.
  function rot(week, list){ return list[(wkIndex(week)) % list.length]; }
  function wkIndex(week){ return Math.max(0, Math.min(5, (week || 1) - 1)); }
  function pair(a, b){ return {a:a, b:b}; }

  function buildDay(theme, family, week){
    var s = (WEEK_SCHEMES[family] || WEEK_SCHEMES.hypertrophy)[wkIndex(week)];
    var heavyRest = family === "strength" ? "2:00-3:00" : "1:30-2:00";
    var normalRest = family === "beginner" ? "0:45-1:15" : "1:00-1:30";
    var blocks = [
      {time:"7 min", title:"Warm-up", tag:"Préparation", kind:"warmup", text:warmupFor(theme)}
    ];

    function bEx(name, fmt, bias, rest, note){
      var load = BASE_LOADS[name] !== undefined && BASE_LOADS[name] > 0
        ? loadFor(name, week, family, bias || 1)
        : "poids du corps";
      return ex(name, fmt, load, rest, note);
    }
    function superset(title, tag, p){
      return {time:"13 min", title:title, tag:tag, kind:"hypertrophy", exercises:[
        Object.assign({}, p.a, {rest:"0:20 avant B2"}),
        Object.assign({}, p.b, {rest:"1:00 après B2"})
      ]};
    }
    function accessory(title, p){
      return {time:"9 min", title:title, tag:"Accessoire", kind:"accessory", exercises:[
        Object.assign({}, p.a, {rest:"0:30 avant C2"}),
        Object.assign({}, p.b, {rest:"0:45 après C2"})
      ]};
    }

    if(theme === "squat"){
      blocks.push({time:"15 min", title:"A. Squat principal", tag:"Principal", kind:"main", exercises:[bEx(family === "beginner" ? "Goblet Squat" : "Back Squat", s.main, 1, heavyRest, "Profondeur contrôlée. Même mouvement toutes les semaines : regarde la charge monter.")]});
      blocks.push(superset("B. Push + Pull", "Superset", rot(week, [
        pair(bEx("Bench Press", s.support, 0.95, "", "Tempo propre."), bEx("Barbell Row", s.support, 1, "", "Dos solide, pas d'élan.")),
        pair(bEx("Incline DB Press", s.support, 1, "", "Contrôle en bas."), bEx("Face Pull", s.support, 1, "", "Scapula propre.")),
        pair(bEx("Strict Press", s.support, 0.95, "", "Côtes basses."), bEx("Ring Row", s.support, 1, "", "Corps gainé, tempo lent."))
      ])));
      blocks.push(accessory("C. Unilatéral + delts", rot(week, [
        pair(bEx("Bulgarian Split Squat", s.accessory, 1, "", "Stable."), bEx("Lateral Raise DB", s.accessory, 1, "", "Strict.")),
        pair(bEx("Goblet Squat", s.accessory, 0.8, "", "Tempo 3-1-1, amplitude complète."), bEx("Rear Delt Fly DB", s.accessory, 1, "", "Delts arrière.")),
        pair(bEx("Farmer Carry", "3×30-40 m", 1, "", "Grip + posture."), bEx("Lateral Raise DB", s.accessory, 1, "", "Strict."))
      ])));
    } else if(theme === "hinge"){
      blocks.push({time:"15 min", title:"A. Hinge principal", tag:"Principal", kind:"main", exercises:[bEx("Hip Thrust", s.main, 1, heavyRest, "Pause 1 sec en haut. Même mouvement toutes les semaines : la progression se mesure ici.")]});
      blocks.push(superset("B. Overhead + tirage", "Superset", rot(week, [
        pair(bEx("Strict Press", s.support, 1, "", "Côtes basses."), bEx("Weighted Pull-up", s.support, 1, "", "Strict. Ring row si nécessaire.")),
        pair(bEx("Push Press", s.support, 0.95, "", "Drive jambes propre."), bEx("Ring Row", s.support, 1, "", "Scapula.")),
        pair(bEx("Landmine Press", s.support, 1, "", "Trajectoire diagonale, tronc gainé."), bEx("Face Pull", s.support, 1, "", "Haut du dos."))
      ])));
      blocks.push(accessory("C. Chaîne postérieure", rot(week, [
        pair(bEx("DB RDL", s.accessory, 1, "", "Hanches loin derrière."), bEx("Face Pull", s.accessory, 1, "", "Scapula propre.")),
        pair(bEx("KB Swing", s.accessory, 1, "", "Hanches explosives, dos neutre."), bEx("Rear Delt Fly DB", s.accessory, 1, "", "Posture.")),
        pair(bEx("Bulgarian Split Squat", s.accessory, 1, "", "Version hanches : buste penché."), bEx("Dead Bug", "3×10/côté", 1, "", "Côtes basses."))
      ])));
    } else if(theme === "upper"){
      blocks.push({time:"14 min", title:"A. Bench Press", tag:"Principal", kind:"main", exercises:[bEx("Bench Press", s.main, 1, heavyRest, "Bar path stable. Même mouvement toutes les semaines : c'est ton test de progression.")]});
      blocks.push(superset("B. Dos + épaules", "Superset", rot(week, [
        pair(bEx("Barbell Row", s.support, 1, "", "Tirage fort."), bEx("Incline DB Press", s.support, 1, "", "Contrôle bas du mouvement.")),
        pair(bEx("Weighted Pull-up", s.support, 1, "", "Strict."), bEx("Landmine Press", s.support, 1, "", "Épaule saine, gainage.")),
        pair(bEx("Ring Row", s.support, 1, "", "Tempo lent, scapula."), bEx("Push Press", s.support, 0.9, "", "Drive jambes."))
      ])));
      blocks.push(accessory("C. Bras + delts", rot(week, [
        pair(bEx("DB Curl", s.accessory, 1, "", "Complet."), bEx("Triceps Rope Pushdown", s.accessory, 1, "", "Coudes fixes.")),
        pair(bEx("Overhead Rope Extension", s.accessory, 1, "", "Longue portion."), bEx("Rear Delt Fly DB", s.accessory, 1, "", "Delts arrière.")),
        pair(bEx("DB Curl", s.accessory, 0.9, "", "Tempo 3-0-1."), bEx("Lateral Raise DB", s.accessory, 1, "", "Strict."))
      ])));
    } else if(theme === "push"){
      blocks.push({time:"14 min", title:"A. Press principal", tag:"Principal", kind:"main", exercises:[bEx(family === "hybrid" ? "Push Press" : "Bench Press", s.main, 1, heavyRest, "Puissance propre, aucune rep forcée. Même mouvement chaque semaine.")]});
      blocks.push(superset("B. Push hypertrophie", "Superset", rot(week, [
        pair(bEx("Strict Press", s.support, 1, "", "Côtes basses."), bEx("Incline DB Press", s.support, 1, "", "Contrôle.")),
        pair(bEx("Landmine Press", s.support, 1, "", "Diagonale, gainage."), bEx("Push-Up lesté", s.support, 0, "", "Corps rigide, amplitude complète.")),
        pair(bEx("Incline DB Press", s.support, 0.95, "", "Tempo contrôlé."), bEx("Face Pull", s.support, 1, "", "Équilibre tirage."))
      ])));
      blocks.push(accessory("C. Triceps + delts", rot(week, [
        pair(bEx("Overhead Rope Extension", s.accessory, 1, "", "Longue portion."), bEx("Lateral Raise DB", s.accessory, 1, "", "Strict.")),
        pair(bEx("Triceps Rope Pushdown", s.accessory, 1, "", "Coudes fixes."), bEx("Rear Delt Fly DB", s.accessory, 1, "", "Posture.")),
        pair(bEx("DB Curl", s.accessory, 1, "", "Antagoniste : coudes reposés."), bEx("Lateral Raise DB", s.accessory, 0.9, "", "Partiels ok en fin de série."))
      ])));
    } else if(theme === "pull"){
      blocks.push({time:"14 min", title:"A. Row principal", tag:"Principal", kind:"main", exercises:[bEx("Barbell Row", s.main, 1, heavyRest, "Buste solide. Même mouvement chaque semaine : mesure ta traction.")]});
      blocks.push(superset("B. Tirage vertical + arrière d'épaule", "Superset", rot(week, [
        pair(bEx("Weighted Pull-up", s.support, 1, "", "Strict."), bEx("Face Pull", s.support, 1, "", "Haut du dos.")),
        pair(bEx("Ring Row", s.support, 1, "", "Pieds surélevés si trop facile."), bEx("Rear Delt Fly DB", s.support, 1, "", "Delts arrière.")),
        pair(bEx("Weighted Pull-up", s.support, 0.9, "", "Prise large."), bEx("DB Curl", s.support, 1, "", "Supination complète."))
      ])));
      blocks.push(accessory("C. Bras + carry", rot(week, [
        pair(bEx("DB Curl", s.accessory, 1, "", "Contrôle."), bEx("Farmer Carry", "4×30-40 m", 1, "", "Grip + posture.")),
        pair(bEx("Face Pull", s.accessory, 1, "", "Fin de mouvement marquée."), bEx("KB Swing", s.accessory, 0.9, "", "Hanches, pas les bras.")),
        pair(bEx("DB Curl", s.accessory, 0.9, "", "Marteau."), bEx("Farmer Carry", "3×40 m", 1.05, "", "Plus lourd, trajet court."))
      ])));
    } else if(theme === "legs"){
      blocks.push({time:"15 min", title:"A. Front Squat", tag:"Principal", kind:"main", exercises:[bEx("Front Squat", s.main, 1, heavyRest, "Tronc dur. Même mouvement chaque semaine.")]});
      blocks.push(superset("B. Fessiers + ischios", "Superset", rot(week, [
        pair(bEx("Hip Thrust", s.support, 1, "", "Pause en haut."), bEx("DB RDL", s.support, 1, "", "Étirement ischios.")),
        pair(bEx("Bulgarian Split Squat", s.support, 1, "", "Grand pas, buste droit."), bEx("KB Swing", s.support, 1, "", "Hanches explosives.")),
        pair(bEx("DB RDL", s.support, 1.05, "", "Tempo 3-1-1."), bEx("Goblet Squat", s.support, 0.75, "", "Pause 2 sec en bas."))
      ])));
      blocks.push(accessory("C. Core", rot(week, [
        pair(bEx("Hanging Knee Raise", s.accessory, 0, "", "Contrôle bassin."), bEx("Goblet Squat", s.accessory, 0.8, "", "Volume propre.")),
        pair(bEx("Dead Bug", "3×10/côté", 0, "", "Côtes basses."), bEx("Farmer Carry", "3×30 m", 1, "", "Anti-flexion latérale.")),
        pair(bEx("Hanging Knee Raise", s.accessory, 0, "", "Montée lente."), bEx("Bulgarian Split Squat", s.accessory, 0.9, "", "Volume unilatéral."))
      ])));
    } else if(theme === "posterior"){
      blocks.push({time:"15 min", title:"A. Chaîne postérieure", tag:"Principal", kind:"main", exercises:[bEx(family === "strength" ? "Deadlift" : "Hip Thrust", s.main, 1, heavyRest, "Aucune rep arrachée. Même mouvement chaque semaine : c'est lui qu'on fait monter.")]});
      blocks.push(superset("B. Squat léger + tirage", "Superset", rot(week, [
        pair(bEx("Front Squat", s.support, 0.85, "", "Technique."), bEx("Barbell Row", s.support, 1, "", "Dos fort.")),
        pair(bEx("Goblet Squat", s.support, 0.85, "", "Amplitude, tempo."), bEx("Weighted Pull-up", s.support, 1, "", "Strict.")),
        pair(bEx("Bulgarian Split Squat", s.support, 1, "", "Unilatéral propre."), bEx("Ring Row", s.support, 1, "", "Scapula."))
      ])));
      blocks.push(accessory("C. Finition", rot(week, [
        pair(bEx("KB Swing", s.accessory, 1, "", "Hanches explosives."), bEx("Rear Delt Fly DB", s.accessory, 1, "", "Posture.")),
        pair(bEx("DB RDL", s.accessory, 0.9, "", "Étirement contrôlé."), bEx("Face Pull", s.accessory, 1, "", "Haut du dos.")),
        pair(bEx("Farmer Carry", "3×40 m", 1, "", "Grip."), bEx("Dead Bug", "3×10/côté", 0, "", "Respiration."))
      ])));
    } else if(theme === "power"){
      blocks.push({time:"15 min", title:"A. Power Clean technique", tag:"Puissance", kind:"main", exercises:[bEx("Power Clean", s.main, 1, "1:30-2:00", "Vitesse. Stop dès que ça ralentit. Même mouvement chaque semaine.")]});
      blocks.push(superset("B. Squat + Press", "Force vitesse", rot(week, [
        pair(bEx("Front Squat", s.support, 0.9, "", "Solide."), bEx("Push Press", s.support, 1, "", "Drive jambes.")),
        pair(bEx("Back Squat", s.support, 0.85, "", "Vitesse en montée."), bEx("Strict Press", s.support, 0.95, "", "Strict, gainé.")),
        pair(bEx("Goblet Squat", s.support, 0.8, "", "Explosif en montée."), bEx("Landmine Press", s.support, 1, "", "Puissance diagonale."))
      ])));
      blocks.push(accessory("C. Pull + core", rot(week, [
        pair(bEx("Weighted Pull-up", s.accessory, 1, "", "Strict."), bEx("Dead Bug", "3×10/côté", 0, "", "Contrôle.")),
        pair(bEx("Barbell Row", s.accessory, 0.9, "", "Explosif concentrique."), bEx("Hanging Knee Raise", s.accessory, 0, "", "Bassin contrôlé.")),
        pair(bEx("Ring Row", s.accessory, 0, "", "Tempo."), bEx("Farmer Carry", "3×30 m", 1, "", "Posture."))
      ])));
    } else {
      blocks.push({time:"15 min", title:"A. Full-body principal", tag:"Principal", kind:"main", exercises:[bEx("Goblet Squat", s.main, 1, normalRest, "Technique d'abord. Même mouvement chaque semaine : regarde-le monter.")]});
      blocks.push(superset("B. Push + Pull", "Superset", rot(week, [
        pair(bEx("Incline DB Press", s.support, 1, "", "Contrôle."), bEx("Ring Row", s.support, 0, "", "Scapula.")),
        pair(bEx("Landmine Press", s.support, 1, "", "Diagonale douce épaules."), bEx("Face Pull", s.support, 1, "", "Haut du dos.")),
        pair(bEx("Push-Up", s.support, 0, "", "Amplitude complète, genoux ok."), bEx("Ring Row", s.support, 0, "", "Plus horizontal = plus dur."))
      ])));
      blocks.push(accessory("C. Hanches + core", rot(week, [
        pair(bEx("DB RDL", s.accessory, 1, "", "Hinge."), bEx("Dead Bug", "3×10/côté", 0, "", "Côtes basses.")),
        pair(bEx("KB Swing", s.accessory, 0.85, "", "Léger, technique."), bEx("Hanging Knee Raise", s.accessory, 0, "", "Ou genoux relevés au sol.")),
        pair(bEx("Bulgarian Split Squat", s.accessory, 0.85, "", "Équilibre."), bEx("Farmer Carry", "3×30 m", 0.9, "", "Marche fière."))
      ])));
    }

    blocks.push({time: family === "strength" ? "6 min" : "8-10 min", title:"D. Finisher", tag:"Conditioning", kind:"wod", text:wodText(theme, family, week) + " Niveau semaine : " + s.wod + "."});
    blocks.push({time:"5 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility", text:"Respiration 1 min + mobilité ciblée hanches/pecs/lats selon la séance."});
    return blocks;
  }

  function program(cfg){
    var obj = {
      id: cfg.id,
      label: cfg.label,
      phase: 0,
      phaseName: cfg.phaseName,
      phaseEnd: "Bloc de 6 semaines. Peut être répété avec progression de charges si la récupération est bonne.",
      impact: cfg.impact,
      days: cfg.days,
      weekLabels: WEEK_LABELS,
      weekGoals: WEEK_GOALS,
      sets: (WEEK_SCHEMES[cfg.family] || WEEK_SCHEMES.hypertrophy).map(function(x){ return x.main; }),
      targetReps: cfg.family === "strength" ? [5,5,4,3,4,5] : cfg.family === "hybrid" ? [6,6,5,3,4,6] : [8,8,10,8,8,10],
      mult: (WEEK_SCHEMES[cfg.family] || WEEK_SCHEMES.hypertrophy).map(function(x){ return x.load; }),
      rest: cfg.family === "strength" ? "1:30–3:00" : "0:45–2:00",
      tag: cfg.tag,
      objective: cfg.objective,
      audience: cfg.audience,
      frequency: cfg.days.length,
      versionDate: "2026-06-22",
      versionLabel: "2026-06-22 — catalogue client V1.5 multi-objectifs",
      dayIntentions: {},
      dayMeta: {},
      cycleRules: cfg.rules || []
    };
    cfg.days.forEach(function(day, idx){
      var spec = cfg.plan[idx] || cfg.plan[cfg.plan.length - 1] || {theme:"full", base:"Full-body", focus:"Technique générale"};
      obj.dayIntentions[day] = spec.intent || (spec.base + " : " + spec.focus + ".");
      obj.dayMeta[day] = {label: DAY_NAMES[day] || day, base: spec.base, focus: spec.focus};
    });
    obj.getBlocks = function(day, week){
      var idx = cfg.days.indexOf(day);
      var spec = cfg.plan[idx >= 0 ? idx : 0] || cfg.plan[0] || {theme:"full"};
      return buildDay(spec.theme, cfg.family, week || 1);
    };
    obj.getWodText = function(day, week){
      var blocks = obj.getBlocks(day, week || 1).filter(function(b){ return b.kind === "wod"; });
      return blocks[0] ? blocks[0].text : "";
    };
    window.COACH_BERTIN_PROGRAMS[cfg.id] = obj;
  }

  var commonRules = [
    "Toutes les charges du programme sont neutres et mises à l'échelle selon le profil actif.",
    "RPE cible : 7-8 la majorité du temps; RPE 9 seulement si la technique reste propre.",
    "Un utilisateur débutant doit choisir l'agressivité prudente dans le profil.",
    "Si douleur articulaire ou fatigue anormale : réduire charge/volume, ne pas pousser le plan aveuglément."
  ];

  var catalog = [
    {id:"client_beginner_foundation_2d", label:"Débutant — Fondation 2 jours/semaine", family:"beginner", objective:"apprendre les mouvements", audience:"débutant", tag:"débutant 2 jours", phaseName:"Fondations full-body 2x/semaine", days:["lundi","jeudi"], impact:"Deux séances full-body simples pour apprendre squat/hinge/push/pull sans surcharge inutile.", rules:commonRules, plan:[{theme:"full",base:"Full-body A",focus:"Goblet Squat, Incline DB Press, Ring Row"},{theme:"hinge",base:"Full-body B",focus:"Hip Thrust, Strict Press, tirage"}]},
    {id:"client_beginner_foundation_3d", label:"Débutant — Fondation 3 jours/semaine", family:"beginner", objective:"apprendre + fréquence", audience:"débutant", tag:"débutant 3 jours", phaseName:"Fondations full-body 3x/semaine", days:["lundi","mercredi","vendredi"], impact:"Trois séances courtes pour apprendre souvent, sans volume excessif.", rules:commonRules, plan:[{theme:"full",base:"Technique full-body",focus:"Squat, push, row"},{theme:"hinge",base:"Hinge + overhead",focus:"Hip Thrust, Strict Press"},{theme:"squat",base:"Squat + haut du corps",focus:"Squat, Bench, Row"}]},

    {id:"client_hypertrophy_4d", label:"Hypertrophie générale — 4 jours/semaine", family:"hypertrophy", objective:"prise de masse", audience:"intermédiaire", tag:"hypertrophie 4 jours", phaseName:"Upper/Lower hypertrophie", days:["lundi","mardi","jeudi","vendredi"], impact:"Split haut/bas 4 jours : volume suffisant pour masse sans aller vers un split bodybuilding extrême.", rules:commonRules, plan:[{theme:"upper",base:"Upper A",focus:"Bench, Row, Incline DB"},{theme:"legs",base:"Lower A",focus:"Front Squat, Hip Thrust, DB RDL"},{theme:"pull",base:"Upper B",focus:"Row, Pull-up, bras"},{theme:"posterior",base:"Lower B",focus:"Hinge, chaîne postérieure, core"}]},
    {id:"client_hypertrophy_5d", label:"Hypertrophie générale — 5 jours/semaine", family:"hypertrophy", objective:"prise de masse", audience:"intermédiaire/avancé", tag:"hypertrophie 5 jours", phaseName:"Split hypertrophie 5x/semaine", days:["lundi","mardi","mercredi","vendredi","samedi"], impact:"Cinq séances orientées volume : push, pull, legs, upper pump, lower/posture. À réserver aux profils qui récupèrent bien.", rules:commonRules.concat(["Si le sommeil baisse ou si courbatures persistantes : retirer la séance samedi au lieu de forcer."]), plan:[{theme:"push",base:"Push",focus:"Bench/Press + triceps"},{theme:"pull",base:"Pull",focus:"Row/Pull-up + biceps"},{theme:"legs",base:"Legs",focus:"Front Squat + hanches"},{theme:"upper",base:"Upper volume",focus:"Bench léger, Row, delts"},{theme:"posterior",base:"Lower/posture",focus:"Hip Thrust, RDL, core"}]},

    {id:"client_strength_2d", label:"Force générale — 2 jours/semaine", family:"strength", objective:"force temps limité", audience:"intermédiaire", tag:"force 2 jours", phaseName:"Force full-body 2x/semaine", days:["lundi","jeudi"], impact:"Deux séances lourdes full-body pour maintenir/progresser en force avec peu de disponibilité.", rules:commonRules.concat(["Le WOD reste minimal pour ne pas nuire à la force."]), plan:[{theme:"squat",base:"Force A",focus:"Squat, Bench, Row"},{theme:"posterior",base:"Force B",focus:"Deadlift/Hip Thrust, Front Squat, Row"}]},
    {id:"client_strength_4d", label:"Force générale — 4 jours/semaine", family:"strength", objective:"force structurée", audience:"intermédiaire/avancé", tag:"force 4 jours", phaseName:"Upper/Lower force", days:["lundi","mardi","jeudi","vendredi"], impact:"Quatre jours pour séparer haut/bas, monter les charges et garder assez d'accessoires protecteurs.", rules:commonRules.concat(["Aucune série forcée : la force se construit avec répétitions propres, pas avec ego lift."]), plan:[{theme:"upper",base:"Upper force A",focus:"Bench + Row"},{theme:"squat",base:"Lower force A",focus:"Back Squat"},{theme:"push",base:"Upper force B",focus:"Strict/Push Press"},{theme:"posterior",base:"Lower force B",focus:"Deadlift/Hip Thrust"}]},

    {id:"client_recomposition_2d", label:"Recomposition — 2 jours/semaine", family:"recomposition", objective:"forme + perte de gras", audience:"débutant/intermédiaire", tag:"recomposition 2 jours", phaseName:"Force minimale + conditioning", days:["lundi","jeudi"], impact:"Deux séances full-body avec musculation suffisante et conditioning soutenable. Bon choix pour client occupé.", rules:commonRules, plan:[{theme:"squat",base:"Full-body dense A",focus:"Squat, Bench, Row, AMRAP"},{theme:"hinge",base:"Full-body dense B",focus:"Hip Thrust, Press, Pull-up, cardio"}]},
    {id:"client_recomposition_3d", label:"Recomposition — 3 jours/semaine", family:"recomposition", objective:"forme + perte de gras", audience:"débutant/intermédiaire", tag:"recomposition 3 jours", phaseName:"Musculation + moteur 3x/semaine", days:["lundi","mercredi","vendredi"], impact:"Trois séances équilibrées : force technique, volume modéré, finishers plus présents.", rules:commonRules, plan:[{theme:"squat",base:"Densité A",focus:"Squat + push/pull"},{theme:"upper",base:"Densité B",focus:"Haut du corps + conditioning"},{theme:"hinge",base:"Densité C",focus:"Hanches + moteur"}]},
    {id:"client_recomposition_4d", label:"Recomposition — 4 jours/semaine", family:"recomposition", objective:"forme + perte de gras", audience:"intermédiaire", tag:"recomposition 4 jours", phaseName:"Densité 4x/semaine", days:["lundi","mardi","jeudi","vendredi"], impact:"Quatre séances plus courtes, densité élevée, volume raisonnable. Objectif : constance et dépense énergétique.", rules:commonRules, plan:[{theme:"upper",base:"Upper dense" ,focus:"Bench/Row + AMRAP"},{theme:"legs",base:"Lower dense",focus:"Squat/Hip Thrust + cardio"},{theme:"pull",base:"Pull + carry",focus:"Dos, bras, grip"},{theme:"hinge",base:"Hinge + moteur",focus:"Hanches, press, row"}]},

    {id:"client_hybrid_performance_3d", label:"Performance hybride — 3 jours/semaine", family:"hybrid", objective:"force + moteur", audience:"intermédiaire", tag:"hybride 3 jours", phaseName:"Force, puissance, conditioning", days:["lundi","mercredi","vendredi"], impact:"Pour client qui veut se sentir athlétique : force utile, puissance simple et WOD courts.", rules:commonRules.concat(["La technique prime sur le chrono. Si les power cleans deviennent laids, réduire la charge."]), plan:[{theme:"squat",base:"Force jambes",focus:"Squat + push/pull"},{theme:"power",base:"Puissance",focus:"Power Clean + Push Press"},{theme:"hinge",base:"Hinge + moteur",focus:"Hip Thrust/RDL + AMRAP"}]},
    {id:"client_hybrid_performance_4d", label:"Performance hybride — 4 jours/semaine", family:"hybrid", objective:"force + moteur", audience:"intermédiaire/avancé", tag:"hybride 4 jours", phaseName:"Hybride 4x/semaine", days:["lundi","mardi","jeudi","vendredi"], impact:"Quatre jours pour combiner force, puissance, haut du corps et moteur sans tomber dans un cycle compétition complet.", rules:commonRules, plan:[{theme:"squat",base:"Strength A",focus:"Squat + Bench"},{theme:"upper",base:"Upper",focus:"Bench/Row volume"},{theme:"power",base:"Power",focus:"Power Clean + Push Press"},{theme:"hinge",base:"Engine",focus:"Hinge + WOD court"}]},
    {id:"client_hybrid_performance_5d", label:"Performance hybride — 5 jours/semaine", family:"hybrid", objective:"force + moteur", audience:"avancé", tag:"hybride 5 jours", phaseName:"Hybride avancé 5x/semaine", days:["lundi","mardi","mercredi","vendredi","samedi"], impact:"Version avancée : force, puissance, haut du corps, jambes et engine. À utiliser seulement si récupération correcte.", rules:commonRules.concat(["Si l'utilisateur rate deux séances ou accumule fatigue : basculer vers hybride 4 jours."]), plan:[{theme:"squat",base:"Squat strength",focus:"Back Squat + Bench"},{theme:"pull",base:"Pull strength",focus:"Row + Pull-up"},{theme:"power",base:"Power",focus:"Power Clean + Push Press"},{theme:"legs",base:"Legs volume",focus:"Front Squat + Hip Thrust"},{theme:"hinge",base:"Engine",focus:"Hinge + WOD court"}]}
  ];

  catalog.forEach(program);
  window.RACINE_CLIENT_PROGRAM_CATALOG_IDS = catalog.map(function(x){ return x.id; });
})();

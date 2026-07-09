// Racine — cycle spécialisé Strict Muscle-Up V1.6
// Objectif : passer d'environ 10 strict pull-ups à un strict muscle-up aux anneaux
// sans kipping, avec progression de force, transition, ring dip/support et garde-fous tendons.
// Données neutres : les charges sont des repères, le profil actif ajuste ensuite.

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

  var DAYS = ["lundi", "mardi", "jeudi", "vendredi"];
  var DAY_NAMES = {lundi:"Lundi", mardi:"Mardi", jeudi:"Jeudi", vendredi:"Vendredi"};

  var WEEK_LABELS = [
    "S1 Base stricte",
    "S2 False grip + tirage haut",
    "S3 Force contrôlée",
    "S4 Déload tendons + checkpoint",
    "S5 Transition assistée",
    "S6 Tirage haut + dip profond",
    "S7 Spécifique muscle-up strict",
    "S8 Déload + répétitions propres",
    "S9 Pic technique contrôlé",
    "S10 Test strict + consolidation"
  ];

  var WEEK_GOALS = [
    "Installer le false grip, la scapula active et les positions hollow/support sans douleur.",
    "Monter la tolérance false grip et commencer à tirer vers le bas des pecs, pas seulement au menton.",
    "Renforcer le tirage lourd et le ring dip strict sans courir après l'échec.",
    "Baisser le volume pour laisser coudes/épaules absorber. Valider les prérequis avant la suite.",
    "Apprendre la transition stricte avec assistance : anneaux bas, pieds au sol, tempo lent.",
    "Construire le passage tirage haut → transition → dip avec plus de hauteur et moins d'aide.",
    "Exposition spécifique : singles assistés, négatives très lentes et verrouillage solide.",
    "Déload spécifique : garder le pattern, retirer la fatigue, préparer le test final.",
    "Pic technique : peu de volume, haute qualité, assistance minimale, aucun grind sale.",
    "Tester le strict muscle-up si les critères sont verts; sinon tester la meilleure version assistée propre."
  ];

  var PROGRESSION = [
    {pull:"5×5 tempo 31X1", weighted:"poids du corps", high:"4×3 poitrine vers anneaux", falseGrip:"5×15 sec", transition:"5×3 anneaux bas + pieds", dip:"5×5 tempo 31X1", support:"5×20 sec", integration:"complexe technique 4 rounds", rpe:"7", note:"Aucune douleur coude/épaule acceptée."},
    {pull:"6×4 tempo 21X1", weighted:"+ léger si facile", high:"5×3 sternum vers anneaux", falseGrip:"6×15-20 sec", transition:"6×3 anneaux bas", dip:"6×4 tempo 31X1", support:"5×25 sec", integration:"complexe 5 rounds", rpe:"7-8", note:"Le false grip doit rester fermé."},
    {pull:"6×3 lourd propre", weighted:"+5 à +15 lb", high:"5×3 tirage haut", falseGrip:"5×20 sec", transition:"6×2 tempo lent", dip:"6×3 profond contrôlé", support:"6×20 sec turn-out", integration:"singles assistés 6×1", rpe:"8", note:"Force sans échec."},
    {pull:"4×4 facile", weighted:"poids du corps", high:"3×3 propre", falseGrip:"4×15 sec", transition:"4×2 facile", dip:"4×4 facile", support:"4×20 sec", integration:"checkpoint technique", rpe:"6-7", note:"Déload tendons. Si douleur : rester ici une semaine."},
    {pull:"5×3 lourd", weighted:"+10 à +20 lb", high:"6×2 explosif strict", falseGrip:"6×20 sec", transition:"6×2 avec moins d'aide", dip:"5×4 anneaux", support:"5×25 sec", integration:"band/feet assisted strict MU 6×1", rpe:"8", note:"Début du spécifique, volume encore bas."},
    {pull:"6×2 lourd", weighted:"+15 à +25 lb", high:"6×2 sternum haut", falseGrip:"5×25 sec", transition:"7×2 transition lente", dip:"6×3 profond", support:"5×30 sec", integration:"complexe haut 5 rounds", rpe:"8", note:"Le tirage doit monter assez haut pour la transition."},
    {pull:"5×2 lourd + back-off", weighted:"+20 lb ou selon profil", high:"8×1 tirage max propre", falseGrip:"5×20 sec", transition:"8×1 assistance minimale", dip:"5×3 anneaux", support:"4×25 sec", integration:"strict MU assisté 8×1", rpe:"8-8.5", note:"Singles propres, longues pauses."},
    {pull:"4×3 facile", weighted:"poids du corps ou léger", high:"4×2 propre", falseGrip:"4×20 sec", transition:"4×2 facile", dip:"4×3 facile", support:"4×20 sec", integration:"singles faciles 5×1", rpe:"6-7", note:"Déload spécifique. Retirer 30-40 % du volume."},
    {pull:"4×2 lourd propre", weighted:"+15 à +25 lb", high:"6×1 tirage maximal", falseGrip:"4×20 sec", transition:"6×1 assistance minimale", dip:"4×2 fort", support:"4×25 sec", integration:"tentatives assistées très légères 6×1", rpe:"8", note:"Peu de volume. Qualité maximale."},
    {pull:"3×2 activation", weighted:"léger", high:"3×1 activation", falseGrip:"3×15 sec", transition:"3×1 activation", dip:"3×2 activation", support:"3×15 sec", integration:"test strict", rpe:"variable", note:"Tester seulement si les critères sont verts."}
  ];

  function clampWeek(week){ return Math.max(1, Math.min(10, Number(week || 1))); }
  function p(week){ return PROGRESSION[clampWeek(week) - 1]; }
  function ex(name, format, load, rest, note){ return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""}; }
  function textBlock(time, title, tag, kind, text){ return {time:time, title:title, tag:tag, kind:kind, text:text}; }
  function exerciseBlock(time, title, tag, kind, exercises){ return {time:time, title:title, tag:tag, kind:kind, exercises:exercises}; }
  function warmupText(week, focus){
    return "Préparation stricte " + focus + " : 3 min cardio facile + circles épaules + scap pull-up 2×8 + hollow hold 2×20 sec + false grip léger. Semaine " + clampWeek(week) + " : " + p(week).note;
  }
  function readinessText(){
    return "Feu vert avant de tenter : 0 douleur coude/épaule, false grip 20 sec/bras, 3-5 ring dips stricts propres, tirage poitrine/anneaux sans perte de hollow. Si un critère manque : faire la version assistée, pas de tentative ego.";
  }

  function pullDay(week){
    var s = p(week);
    return [
      textBlock("7 min", "Warm-up scapula + false grip", "Préparation", "warmup", warmupText(week, "tirage")),
      exerciseBlock("16 min", "A. Tirage strict prioritaire", "Principal", "main", [
        ex("Weighted Pull-Up strict", s.pull, s.weighted, "2:00-3:00", "Départ dead hang actif. Menton ne suffit pas : chercher hauteur vers poitrine."),
        ex("Scap Pull-Up", "3×8", "poids du corps", "0:45", "Bras longs, bouger seulement les omoplates.")
      ]),
      exerciseBlock("12 min", "B. Tirage haut + false grip", "Renforcement", "accessory", [
        ex("False Grip Ring Row", s.high, "poids du corps", "1:00", "Finir anneaux bas des pecs. Plus les pieds avancent, plus c'est dur."),
        ex("False Grip Hang", s.falseGrip, "poids du corps", "0:45", "Poignet cassé sur l'anneau, épaule active, pas suspendu mou.")
      ]),
      exerciseBlock("8 min", "C. Protection coudes/épaules", "Préhab", "accessory", [
        ex("Face Pull", "3×15-20", "léger", "0:30", "Coudes hauts, rotation externe."),
        ex("Wrist Strength", "2×15/bras", "léger", "0:30", "Préparer les avant-bras au false grip.")
      ]),
      textBlock("4 min", "Retour au calme", "Mobilité", "mobility", "Lats + biceps + avant-bras. Noter douleur 0-10. Si douleur >2, réduire la prochaine séance de tirage.")
    ];
  }

  function transitionDay(week){
    var s = p(week);
    var specific = clampWeek(week) >= 7 ? "Strict Muscle-Up assisté" : "Low Ring Transition Drill";
    return [
      textBlock("8 min", "Warm-up transition", "Préparation", "warmup", warmupText(week, "transition anneaux")),
      exerciseBlock("14 min", "A. Pattern de transition", "Technique", "main", [
        ex("Seated Strict Muscle-Up Transition", s.transition, "anneaux bas", "1:00", "Tirer bas des pecs, garder anneaux près du corps, passer les épaules au-dessus sans saut."),
        ex("Low Ring Transition Drill", s.transition, "pieds au sol", "1:00", "Assistance des jambes minimale. Tempo 3 sec dans le passage.")
      ]),
      exerciseBlock("12 min", "B. Spécifique sans kipping", "Skill", "skill", [
        ex(specific, s.integration, "band/box au besoin", "1:30-2:30", "Strict seulement. Pas de kip, pas de balancement, pas de chicken wing."),
        ex("False Grip Pull to Sternum", s.high, "poids du corps", "1:00", "Si la hauteur n'est pas là, ne forcer aucune transition.")
      ]),
      exerciseBlock("8 min", "C. Core position", "Support", "accessory", [
        ex("Hollow Body Hold", "4×20-30 sec", "poids du corps", "0:30", "Côtes basses, fessiers serrés."),
        ex("Arch Hold", "3×20 sec", "poids du corps", "0:30", "Contrôle, pas lombaire écrasé.")
      ]),
      textBlock("4 min", "Critère du jour", "Sécurité", "mobility", "La transition doit devenir plus propre, pas plus violente. Si les épaules pincent en bas du dip, réduire amplitude et renforcer jeudi.")
    ];
  }

  function dipDay(week){
    var s = p(week);
    return [
      textBlock("7 min", "Warm-up support anneaux", "Préparation", "warmup", warmupText(week, "support + dip")),
      exerciseBlock("15 min", "A. Ring dip strict", "Principal", "main", [
        ex("Strict Ring Dip", s.dip, "poids du corps ou band", "2:00", "Épaules basses, anneaux serrés, amplitude seulement si sans douleur."),
        ex("Ring Support Hold", s.support, "poids du corps", "0:45", "Coudes barrés, anneaux tournés légèrement vers l'extérieur si possible.")
      ]),
      exerciseBlock("12 min", "B. Stabilité scapulaire", "Renforcement", "accessory", [
        ex("Ring Turnout Support", "4×10-20 sec", "poids du corps", "0:45", "Petit turnout propre, pas d'épaule qui remonte."),
        ex("Push Up", "3×8-12", "poids du corps", "0:45", "Contrôle pec/épaule sans douleur.")
      ]),
      exerciseBlock("10 min", "C. Préhab obligatoire", "Préhab", "accessory", [
        ex("Cable External Rotation", "3×15/bras", "léger", "0:30", "Coude collé, lent."),
        ex("Trap-3 Raise", "3×12/bras", "léger", "0:30", "Omoplate basse, pas trap sup."),
        ex("Serratus Wall Slide", "2×12", "poids du corps", "0:30", "Cage thoracique contrôlée.")
      ]),
      textBlock("4 min", "Retour au calme", "Mobilité", "mobility", "Pec mineur + lats + respiration. Le ring dip ne doit jamais irriter l'avant d'épaule.")
    ];
  }

  function integrationDay(week){
    var s = p(week);
    var w = clampWeek(week);
    if(w === 4 || w === 8){
      return [
        textBlock("8 min", "Warm-up checkpoint", "Préparation", "warmup", warmupText(week, "checkpoint")),
        exerciseBlock("12 min", "A. Check force sans fatigue", "Checkpoint", "main", [
          ex("Strict Pull-Up", "1 set technique à 70 %, puis 3×3", "poids du corps", "2:00", "Arrêter 2-3 reps avant échec. Objectif : qualité, pas record."),
          ex("Strict Ring Dip", "3×3-5", "poids du corps ou band", "1:30", "Amplitude propre sans pincement.")
        ]),
        exerciseBlock("12 min", "B. Check transition", "Technique", "skill", [
          ex("Low Ring Transition Drill", "5×2", "pieds au sol", "1:00", "Aide minimale, passage lent."),
          ex("False Grip Hang", "4×15-20 sec", "poids du corps", "0:45", "Si le false grip ouvre, ne pas progresser.")
        ]),
        textBlock("8 min", "C. Décision de progression", "Sécurité", "mobility", readinessText() + " Semaine " + w + " = réduire volume, pas prouver quelque chose."),
        textBlock("4 min", "Cooldown", "Mobilité", "mobility", "Avant-bras, biceps, pecs, lats. Score douleur et fatigue tendons.")
      ];
    }
    if(w === 10){
      return [
        textBlock("8 min", "Warm-up test", "Préparation", "warmup", "Cardio facile + scap + false grip + 2 transitions faciles + 2 dips faciles. Rien qui fatigue."),
        textBlock("6 min", "A. Feu vert obligatoire", "Sécurité", "main", readinessText() + " Si rouge : test assisté propre au lieu du strict."),
        exerciseBlock("18 min", "B. Test Strict Muscle-Up", "Test", "skill", [
          ex("Strict Muscle-Up", "jusqu'à 5 singles espacés", "poids du corps", "3:00", "Départ dead hang actif, false grip, tirage haut, transition serrée, dip solide. Zéro kip."),
          ex("Band-Assisted Strict Muscle-Up", "option si strict échoue", "assistance minimale", "2:00", "Réussite propre > échec laid.")
        ]),
        exerciseBlock("8 min", "C. Back-off technique", "Consolidation", "accessory", [
          ex("Low Ring Transition Drill", "3×2", "facile", "1:00", "Répéter le bon pattern."),
          ex("Ring Support Hold", "3×15 sec", "poids du corps", "0:45", "Finir stable.")
        ]),
        textBlock("4 min", "Bilan", "Analyse", "mobility", "Noter : réussi strict oui/non, niveau d'assistance, douleur, point limitant : tirage, transition ou dip. Le prochain cycle se décide selon ce point, pas selon l'ego.")
      ];
    }
    return [
      textBlock("7 min", "Warm-up intégration", "Préparation", "warmup", warmupText(week, "intégration")),
      exerciseBlock("12 min", "A. Complexe strict", "Principal", "main", [
        ex("False Grip Pull-Up", s.integration, "assisté au besoin", "0:15 avant la transition", "Complexe strict, partie 1/3 : tirage strict en false grip, menton au-dessus des anneaux."),
        ex("Transition Drill", s.integration, "assisté au besoin", "0:15 avant le dip", "Complexe strict, partie 2/3 : transition propre, coudes qui passent devant. Pas de vitesse sale."),
        ex("Ring Dip", s.integration, "assisté au besoin", "2:00 après le complexe", "Complexe strict, partie 3/3 : dip solide jusqu'au lockout."),
        ex("Slow Negative Muscle-Up", "3-5×1 à 5 sec", "assisté", "2:00", "Seulement si épaules/coudes vont bien. Descente contrôlée, pas de chute.")
      ]),
      exerciseBlock("12 min", "B. Renforcement du maillon faible", "Accessoire", "accessory", [
        ex("Chest-to-Ring Pull-Up", s.high, "poids du corps", "1:30", "Priorité si la transition manque de hauteur."),
        ex("Deep Ring Dip Hold", "4×10 sec", "assisté si besoin", "1:00", "Priorité si le dip bloque."),
        ex("Low Ring Transition Pause", "4×2 avec pause 2 sec", "anneaux bas", "1:00", "Priorité si le passage est confus.")
      ]),
      textBlock("8 min", "C. Flush non destructeur", "Conditioning", "conditioning", "EMOM 8 facile : minute 1 = 6 ring rows contrôlés; minute 2 = 8 push-ups ou support hold 20 sec. RPE 6-7 seulement."),
      textBlock("4 min", "Cooldown", "Mobilité", "mobility", "Décompression épaules + avant-bras. Si les coudes tirent, retirer les négatives la semaine suivante.")
    ];
  }

  function blocks(day, week){
    if(day === "lundi") return pullDay(week);
    if(day === "mardi") return transitionDay(week);
    if(day === "jeudi") return dipDay(week);
    return integrationDay(week);
  }

  var cycleRules = [
    "Pré-requis de départ : environ 10 strict pull-ups propres. Si moins de 8, choisir d'abord un cycle pull-up strict.",
    "Objectif : strict muscle-up aux anneaux. Kipping, balancement et chicken wing sont interdits dans ce cycle.",
    "Quatre jours/semaine maximum : deux jours force/skill, un jour support/dip, un jour intégration/checkpoint.",
    "Ne jamais travailler à l'échec sur les anneaux. Garder 1-3 reps en réserve presque tout le cycle.",
    "Douleur coude/épaule >2/10 : retirer négatives et tentatives, garder prehab + version assistée.",
    "Semaines 4 et 8 sont des déloads/checkpoints obligatoires, pas des semaines à sauter.",
    "Le test S10 se fait seulement si false grip, tirage haut, ring dip et support sont verts. Sinon : test assisté propre."
  ];

  window.COACH_BERTIN_PROGRAMS.strict_muscle_up_10w = {
    id:"strict_muscle_up_10w",
    label:"Cycle Strict Muscle-Up — 10 semaines / 4 jours",
    phaseName:"Spécialisation anneaux : pull-up strict → muscle-up strict",
    impact:"Cycle spécialisé pour un athlète capable d'environ 10 strict pull-ups qui veut construire un strict muscle-up sans se blesser.",
    weeks:10,
    days:DAYS.slice(),
    weekLabels:WEEK_LABELS.slice(),
    weekGoals:WEEK_GOALS.slice(),
    sets:PROGRESSION.map(function(x){ return x.pull; }),
    targetReps:[5,4,3,4,3,2,2,3,2,1],
    mult:[0.70,0.74,0.80,0.60,0.82,0.86,0.88,0.62,0.84,0.50],
    rest:"0:30–3:00 selon bloc",
    tag:"strict muscle-up",
    objective:"strict muscle-up",
    audience:"intermédiaire/avancé avec 10 strict pull-ups",
    frequency:4,
    versionDate:"2026-06-22",
    versionLabel:"2026-06-22 — Strict Muscle-Up V1.6 : force, transition, support, test",
    dayIntentions:{
      lundi:"Force de tirage strict, false grip et tirage haut vers sternum.",
      mardi:"Apprentissage de la transition stricte sans kipping, anneaux bas et assistance contrôlée.",
      jeudi:"Ring dip, support hold, stabilité scapulaire et protection épaules/coudes.",
      vendredi:"Intégration tirage-transition-dip, checkpoints et test final contrôlé."
    },
    dayMeta:{
      lundi:{label:DAY_NAMES.lundi, base:"Pull strength", focus:"Weighted/tempo pull-up, false grip, scapula"},
      mardi:{label:DAY_NAMES.mardi, base:"Transition", focus:"Low rings, seated transition, strict assisted pattern"},
      jeudi:{label:DAY_NAMES.jeudi, base:"Support + dip", focus:"Ring support, strict ring dip, prehab"},
      vendredi:{label:DAY_NAMES.vendredi, base:"Integration", focus:"Complexe strict, checkpoints, test S10"}
    },
    cycleRules:cycleRules,
    getBlocks:function(day, week){ return blocks(day, week || 1); },
    getWodText:function(day, week){
      var list = blocks(day, week || 1).filter(function(b){ return b.kind === "conditioning" || b.tag === "Test"; });
      return list[0] ? (list[0].text || ((list[0].exercises || []).map(function(e){ return e.name + " " + e.format; }).join("; "))) : "Aucun WOD cardio : cycle technique/force strict muscle-up.";
    }
  };
})();

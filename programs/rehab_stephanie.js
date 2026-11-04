// Racine Programme autonome : Réhabilitation & renforcement profond (Stéphanie)
// 5 séances nommées par objectif (jamais par jour de semaine). Les clés
// lundi→samedi sont des identifiants internes moteur ; l'affichage passe par
// dayMeta[day].label. Cycle de 4 semaines, 45 min par séance.
//
// ── DEUX BLESSURES, ET ELLES COMMANDENT TOUT ────────────────────────────────
// Hanche droite : conflit fémoro-acétabulaire de type pincer. La flexion
// profonde pince. Squat toléré JUSQU'À LA PARALLÈLE, jamais plus bas.
// Épaule gauche : supra-épineux et infra-épineux atteints. Tout overhead fait
// mal, et l'appui statique sur les bras aussi.
// Sont donc absents du programme, volontairement et sans exception : overhead,
// planche et variantes en appui sur les bras, push-ups, RDL, hip thrust
// unilatéral, SkiErg, rameur, squat sous la parallèle. Ajouter l'un d'eux ici
// n'est pas une variation de programmation, c'est une régression clinique.
// La barre sur le dos est tolérée : c'est ce qui autorise le back squat.
//
// ── CE QUE L'ATHLÈTE A DEMANDÉ (révision du 2026-11-03) ────────────────────
// Quatre retours, et ce qui y répond ici :
//   1. « Plus de variation de semaine en semaine. » Les mouvements PRINCIPAUX
//      sont stables sur les 4 semaines — c'est ce qui donne au moteur de
//      charges de l'historique par mouvement, donc des suggestions qui
//      s'affinent. Ce qui tourne, c'est le metcon (20 textes différents, un
//      par séance et par semaine) et un bloc accessoire par séance. La
//      variation se sent là où elle se sent vraiment : la fin de séance.
//   2. « Inclure du back squat. » Il a sa propre journée (samedi), bilatérale
//      et lourde, séparée de la journée unilatérale (jeudi).
//   3. « Je n'ai pas l'impression de travailler mes cuisses. » Trois leviers,
//      parce qu'il n'y a ni presse à jambes ni extension de jambes dans ce
//      gym (data/equipment.js) : le back squat à la barre, deux mouvements de
//      cuisses par semaine au lieu d'un, et les TALONS SURÉLEVÉS sur le
//      goblet squat. Ce dernier point n'est pas un détail de confort : à
//      profondeur égale, surélever les talons réduit la flexion de hanche
//      demandée et transfère la charge sur les quadriceps. C'est exactement
//      ce qu'il faut quand la hanche pince en flexion.
//   4. « Je n'aime pas le pull-through. » Retiré. Sa place va au deuxième
//      mouvement de cuisses. Un garde-fou interdit son retour.
//
// ── CHARGES : %1RM DE L'ATHLÈTE DE RÉFÉRENCE, PAS LES KILOS DE STÉPHANIE ────
// Convention du dépôt (CLAUDE.md § 3.1) : une charge chiffrée dans programs/
// est une charge de l'ATHLÈTE DE RÉFÉRENCE (scripts/profiles/reference.js).
// scripts/charge/scaling.js la ramène au niveau réel du profil actif, puis
// l'historique (Epley) reprend la main dès la première séance loggée. Écrire
// ici ses 135 lb réels aurait produit une DOUBLE RÉDUCTION — le défaut que le
// contrat interdit.
//
// Les bases sont la charge de référence à la plage visée, dérivée du 1RM de
// référence par Epley : base = 1RM_réf / (1 + reps/30).
//   Back Squat    1RM réf 315 → 4×8  : 235 lb  (ratio ≈ 0,30 → ~70 lb réels,
//                                       soit la barre + deux plaques de 12,5)
//   Hip Thrust    1RM réf 400 → 4×10 : 300 lb  (ratio ≈ 0,45 → 135 lb réels)
//   Goblet Squat  1RM réf 100 → 3×10 :  75 lb  (ratio ≈ 0,33 →  25 lb réels)
//   Fente DB      1RM réf  55 → 3×8  :  45 lb/main  (→ ≈ 20 lb/main)
//   Step-Up       1RM réf  50 → 3×8  :  40 lb/main  (→ ≈ 15 lb/main)
// Les mouvements jamais faits (kickback) partent volontairement BAS.
//
// ── PROGRESSION : LE MOTEUR EXISTANT, PAS UN DEUXIÈME ──────────────────────
// S1 base, S2 +2 reps à charge égale, S3 +5 % de charge, S4 −15 % et une série
// de moins. Le pourcentage est appliqué à la base de référence (rsLoad), pas à
// une table de multiplicateurs parallèle ; le reste — RPE, freins, arrondi
// équipement, plafonds — reste au moteur de charges. La S4 porte
// « récupération » dans son libellé ET dans son objectif : c'est ce que lit
// coachIsDeloadWeekOrContext() pour couper l'auto-progression. Le curl porte
// « léger » dans sa note : c'est ce que lit coachExtractMovementIntent() pour
// l'empêcher de progresser comme un mouvement principal — son RPE est plafonné
// à 7, elle est déjà près de la douleur à 10 lb.
//
// ── ORDRE DES BLOCS ET METCONS ─────────────────────────────────────────────
// Le cardio vient JUSTE APRÈS le bloc principal, avant les accessoires
// (décision du 2026-10-17) : quand la séance déborde, ce sont les accessoires
// qui sautent, jamais le metcon. Les metcons ne contiennent que ce que
// l'athlète accepte : vélo, air squats à la parallèle, step-ups sur boîte et
// gainage. Aucun mouvement chargé, donc aucune charge à deviner — et la boîte
// porte sa hauteur écrite (24 po), comme l'exige dev/wod_loads_checks.js.
//
// ── SUIVI ──────────────────────────────────────────────────────────────────
// RPE seulement. Aucune note de douleur : Racine n'a pas de champ douleur, et
// en inventer un dans le texte d'un programme serait une donnée de santé
// écrite là où rien ne sait la lire.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function ex(name, format, load, rest, note){
    return { name:name, format:format, load:load || "—", rest:rest || "60–90 sec", note:note || "" };
  }

  // ── Semaines ──────────────────────────────────────────────────────────────
  // loadPct s'applique à la base de référence ; repsDelta et setsDelta au
  // schéma écrit dans la séance. Une seule table, lue par tout le fichier.
  var WEEKS = {
    1: {label:"S1 — Installation",  loadPct:1.00, repsDelta:0, setsDelta:0,  rpe:"RPE 6-7"},
    2: {label:"S2 — Volume",        loadPct:1.00, repsDelta:2, setsDelta:0,  rpe:"RPE 7"},
    3: {label:"S3 — Surcharge",     loadPct:1.05, repsDelta:0, setsDelta:0,  rpe:"RPE 7-8"},
    4: {label:"S4 — Allègement",    loadPct:0.85, repsDelta:0, setsDelta:-1, rpe:"RPE 6"}
  };
  function wk(week){ return WEEKS[Number(week)] || WEEKS[1]; }
  function wIdx(week){ var n = Number(week); return (n >= 1 && n <= 4) ? n - 1 : 0; }

  // Charge de référence à la semaine demandée. Arrondi aux 5 lb : le moteur
  // ré-arrondit ensuite au vrai matériel (data/equipment.js).
  function rsLoad(base, week, suffix){
    var n = Math.round((Number(base) || 0) * wk(week).loadPct / 5) * 5;
    return n + " lb" + (suffix ? " " + suffix : "");
  }
  function rsSets(sets, reps, week, suffix){
    var w = wk(week);
    var s = Math.max(1, Number(sets) + w.setsDelta);
    var r = Math.max(1, Number(reps) + w.repsDelta);
    return s + "×" + r + (suffix || "");
  }
  function rsHold(sets, seconds, week, suffix){
    var s = Math.max(1, Number(sets) + wk(week).setsDelta);
    return s + "×" + seconds + " sec" + (suffix || "");
  }

  // ── Mobilité ──────────────────────────────────────────────────────────────
  // Texte séparé par « + » : la vue séance en fait une carte par mouvement,
  // avec le bouton « ? » qui ouvre le tuto (scripts/session/view.js).
  // La mobilité, elle, ne tourne PAS d'une semaine à l'autre : c'est le seul
  // bloc dont la répétition est l'effet recherché.
  var MOB_HANCHE = "Vélo stationnaire 3 min + Hip Switch 8/côté + Half-Kneeling Hip Flexor Stretch 30 sec + Clamshell 15/côté";
  var MOB_DOS    = "Cat-Cow 10 reps + 90/90 Breathing 8 reps + Mini-Band Lateral Walk 10/côté";
  var MOB_SQUAT  = "Hip CARs 5/côté + Glute Bridge 12 reps + Adductor Rockback 8/côté";

  function mobBlock(text){
    return {time:"7 min", title:"Mobilité", tag:"Préparation", kind:"mobility", text:text};
  }
  function coolBlock(minutes, text){
    return {time:minutes + " min", title:"Retour au calme", tag:"Mobilité", kind:"mobility", text:text};
  }
  function ruleBlock(day, rules){
    return {time:"1 min", title:"Règle de la séance", tag:"Préparation", kind:"warmup", text:rules[day]};
  }

  // ── Règles par séance ─────────────────────────────────────────────────────
  // Une règle courte et concrète, tirée des mouvements du jour. Les règles
  // permanentes (hanche, épaule) vivent dans cycleRules, affichées une fois
  // dans la vue Cycle — les répéter ici les rendrait invisibles.
  var dayRules = {
    lundi:    "Hip thrust : menton rentré, côtes basses, aucune hyperextension lombaire en haut. Si ça pince à l'aine droite, tu arrêtes la série — ce n'est pas un signal à négocier. Mobilité : 2 tenues de 30 secondes par côté sur l'étirement des fléchisseurs.",
    mardi:    "Rien ne monte au-dessus des épaules aujourd'hui. Coudes près du corps, épaules basses et en arrière sur tout le bloc. Le curl reste léger : RPE 7 maximum, jamais plus, même si ça semble facile.",
    jeudi:    "Journée unilatérale : genou dans l'axe du pied, bassin de face, aucune rotation de hanche. Sur le goblet, les talons sont surélevés sur deux plaques — c'est ce qui met la charge dans les cuisses sans fermer la hanche. Tu descends jusqu'au contact de la boîte, jamais plus bas.",
    vendredi: "Séance de contrôle, pas de charge. Le tempo de 3 secondes en descente est le travail — le poids ne sert qu'à le rendre difficile. Dead bug : bras vers le plafond seulement si l'épaule est silencieuse, sinon bras au sol.",
    samedi:   "Back squat : la boîte derrière toi est le repère de profondeur, tu t'arrêtes à son contact. Barre bien calée sur le haut du dos, coudes sous la barre et épaules basses — si l'épaule gauche tire, élargis la prise avant de changer quoi que ce soit d'autre. Aucune série à l'échec."
  };

  // ── Metcons : 20 textes, un par séance et par semaine ─────────────────────
  // Contenu limité à ce que l'athlète accepte : vélo, air squats à la
  // parallèle, step-ups sur boîte 24 po sans charge, gainage. Les formats
  // tournent (intervalles, AMRAP, zone 2, pour le temps, EMOM) : c'est là que
  // se joue la variation d'une semaine à l'autre.
  // La limite de profondeur est RÉÉCRITE dans chaque metcon qui contient des
  // air squats. En AMRAP, la fatigue est précisément le moment où on descend
  // trop bas sans le décider.
  var METCONS = {
    lundi: [
      "Intervalles vélo : 10 × (20 s fort / 40 s facile). Selle assez haute pour ne jamais fermer la hanche. Le « fort » est une cadence, pas une position — si la hanche pince, réduis la résistance, pas l'amplitude.",
      "AMRAP 10 : 10 cal vélo + 10 Air Squat à la parallèle + 10 Sit-Up. Les air squats s'arrêtent à la parallèle même en AMRAP — la fatigue n'autorise pas une profondeur que la hanche refuse.",
      "Intervalles vélo : 8 × (30 s fort / 30 s facile). Effort plus long qu'en S1, même résistance : c'est la cadence qui monte, pas la charge.",
      "Zone 2 vélo : 10 min continu. Allure de conversation du début à la fin. RPE 5-6, jamais plus — semaine d'allègement."
    ],
    mardi: [
      "Zone 2 vélo : 15 min continu. Allure de conversation, tu dois pouvoir parler en phrases complètes du début à la fin. Selle assez haute pour éviter la flexion de hanche profonde. RPE 5-6, jamais plus — ce n'est pas un intervalle.",
      "Intervalles vélo : 5 × (2 min fort / 1 min facile). Le « fort » reste une cadence tenue, jamais un sprint.",
      "AMRAP 15 : 15 cal vélo + 12 Sit-Up + 20 sec Hollow Hold. Bras le long du corps sur le hollow, jamais au-dessus de la tête.",
      "Zone 2 vélo : 15 min très facile. Tu finis la séance plus fraîche qu'en la commençant."
    ],
    jeudi: [
      "AMRAP 12 : 12 cal vélo + 10 Air Squat à la parallèle + 8 Step-Up sur boîte 24 po. Les air squats s'arrêtent à la parallèle même en AMRAP — la fatigue n'autorise pas une profondeur que la hanche refuse. Rythme régulier.",
      "Pour le temps (cap 12) : 3 tours de 15 cal vélo + 12 Air Squat à la parallèle + 12 Sit-Up. Les air squats s'arrêtent à la parallèle. Note ton temps final.",
      "EMOM 12 en alternance, un seul mouvement par minute : minutes impaires 12 cal vélo ; minutes paires 10 Air Squat à la parallèle.",
      "AMRAP 12 : 10 cal vélo + 8 Air Squat à la parallèle + 8 Step-Up sur boîte 24 po. Semaine d'allègement : allure de promenade, RPE 6."
    ],
    vendredi: [
      "Vélo : 4 × 3 min à environ 80 % / 1 min repos. L'effort reste une cadence tenue, jamais un sprint. Selle assez haute pour ne pas fermer la hanche.",
      "AMRAP 15 : 12 cal vélo + 10 Sit-Up + 10 Dead Bug. Le dead bug reste lent même en AMRAP : bas du dos collé, expiration longue.",
      "Vélo : 5 × 2 min à environ 80 % / 1 min repos. Un bloc de plus qu'en S1, même intensité.",
      "Zone 2 vélo : 15 min continu. RPE 5-6. Semaine d'allègement : on entretient, on ne construit pas."
    ],
    samedi: [
      "Intervalles vélo : 8 × (45 s fort / 45 s facile). Les cuisses viennent de travailler : la cadence reste ronde, aucun à-coup.",
      "AMRAP 12 : 12 cal vélo + 10 Step-Up sur boîte 24 po + 10 Sit-Up.",
      "Pour le temps (cap 12) : 4 tours de 10 cal vélo + 10 Air Squat à la parallèle. Les air squats s'arrêtent à la parallèle. Note ton temps final.",
      "Zone 2 vélo : 12 min continu. Allure facile après un squat allégé."
    ]
  };
  function metconBlock(day, week, minutes, title){
    return {time:minutes + " min", title:title, tag:"Cardio", kind:"wod", text:METCONS[day][wIdx(week)]};
  }

  // ── Bloc accessoire qui tourne ────────────────────────────────────────────
  // Un accessoire par séance change chaque semaine. Les quatre options d'une
  // séance visent la même chose : ce sont des variantes, pas un autre
  // programme. Le mouvement PRINCIPAL, lui, ne tourne jamais — sans
  // répétition, le moteur de charges n'a rien à apprendre.
  var ROTATIONS = {
    lundi: [
      function(w){ return ex("Cable Kickback", rsSets(3, 12, w, "/jambe"), rsLoad(30, w), "45–60 sec",
        "Charge de départ prudente : mouvement récent. Bassin fixe, amplitude courte, aucune cambrure pour aller plus loin. " + wk(w).rpe + "."); },
      function(w){ return ex("Hip Abduction", rsSets(3, 15, w, "/côté"), "poids du corps", "45 sec",
        "Couchée sur le côté, bassin perpendiculaire au sol, jambe légèrement en arrière. Amplitude courte et propre, aucune bascule de bassin pour monter plus haut."); },
      // « Frog Bridge » et non « Frog Pump » : le mot « pump » est un
      // qualificatif de programmation, interdit dans un nom de mouvement
      // (docs/STRUCTURE_CONTRACT.md, § Règle des noms). Même exercice, nom
      // propre — la bibliothèque porte les deux fiches.
      function(w){ return ex("Frog Bridge", rsSets(3, 20, w), "poids du corps", "45 sec",
        "Talons joints, genoux ouverts. L'ouverture de hanche est confortable pour une hanche qui pince en flexion : c'est la position, pas l'amplitude, qui fait le travail."); },
      function(w){ return ex("Glute Bridge", rsSets(3, 15, w), "poids du corps", "45 sec",
        "Pousse dans les talons, pause en haut. Semaine d'allègement : on entretient la connexion fessiers, rien de plus."); }
    ],
    mardi: [
      function(w){ return ex("Pallof Press", rsSets(3, 10, w, "/côté"), rsLoad(30, w), "45 sec",
        "Câble à hauteur de sternum, jamais plus haut. Bras tendus devant, pas au-dessus. Le tronc refuse de tourner : c'est tout le travail."); },
      function(w){ return ex("Seated Cable Row", rsSets(3, 12, w), rsLoad(120, w), "60 sec",
        "Tirage horizontal au câble, poignée basse. Coudes le long du corps vers les hanches, épaules basses — rien ne passe au-dessus de l'épaule."); },
      function(w){ return ex("One-Arm DB Row", rsSets(3, 10, w, "/côté"), rsLoad(65, w, "/ main"), "60 sec",
        "Appui sur un banc avec la main libre, dos à plat. Tire le coude vers la hanche, pause en haut. Si l'épaule gauche tire, réduis l'amplitude du haut."); },
      function(w){ return ex("Hollow Hold", rsHold(3, 20, w), "poids du corps", "45 sec",
        "Bras le long du corps — jamais en appui, jamais au-dessus de la tête. Bas du dos collé au sol ; réduis le levier avant de cambrer."); }
    ],
    jeudi: [
      function(w){ return ex("Sit-Up", rsSets(3, 15, w), "poids du corps", "45 sec",
        "Bras croisés sur la poitrine ou le long du corps, jamais tendus au-dessus de la tête. Montée sans à-coup."); },
      function(w){ return ex("Dead Bug", rsSets(3, 10, w), "poids du corps", "45 sec",
        "Bras vers le plafond seulement si l'épaule gauche ne dit rien ; sinon bras au sol. Bas du dos collé, expiration lente."); },
      function(w){ return ex("Hollow Hold", rsHold(3, 20, w), "poids du corps", "45 sec",
        "Bras le long du corps. Qualité avant durée : tu sors de la tenue dès que le bas du dos décolle."); },
      function(w){ return ex("Pallof Press", rsSets(3, 10, w, "/côté"), rsLoad(30, w), "45 sec",
        "Câble à hauteur de sternum. Semaine d'allègement : charge légère, contrôle total."); }
    ],
    vendredi: [
      function(w){ return ex("Hip Abduction", rsSets(3, 15, w, "/côté"), "poids du corps", "45 sec",
        "Couchée sur le côté, jambe légèrement en arrière. Le moyen fessier travaille, pas le bas du dos."); },
      function(w){ return ex("Cable Kickback", rsSets(3, 15, w, "/jambe"), rsLoad(30, w), "45 sec",
        "Bassin fixe, amplitude courte. On cherche la sensation locale, pas la charge. " + wk(w).rpe + "."); },
      function(w){ return ex("Clamshell", rsSets(3, 15, w, "/côté"), "élastique léger", "45 sec",
        "Élastique au-dessus des genoux, bassin immobile. Rotation externe de hanche : bien tolérée quand la flexion, elle, pince."); },
      function(w){ return ex("Mini-Band Lateral Walk", rsSets(3, 12, w, "/côté"), "élastique léger", "45 sec",
        "Élastique aux chevilles, genoux légèrement fléchis. Pas courts et contrôlés, buste droit."); }
    ],
    samedi: [
      function(w){ return ex("Hollow Hold", rsHold(3, 20, w), "poids du corps", "45 sec",
        "Bras le long du corps — jamais en appui. Bas du dos collé au sol."); },
      function(w){ return ex("Sit-Up", rsSets(3, 15, w), "poids du corps", "45 sec",
        "Bras croisés sur la poitrine, jamais tendus au-dessus de la tête."); },
      function(w){ return ex("Dead Bug", rsSets(3, 10, w), "poids du corps", "45 sec",
        "Lent, bas du dos collé. Bras au sol si l'épaule gauche parle."); },
      function(w){ return ex("Pallof Press", rsSets(3, 10, w, "/côté"), rsLoad(30, w), "45 sec",
        "Câble à hauteur de sternum, bras devant. Semaine d'allègement."); }
    ]
  };
  function rotationBlock(day, week, minutes, title, tag, kind){
    return {time:minutes + " min", title:title, tag:tag, kind:kind, exercises:[ROTATIONS[day][wIdx(week)](week)]};
  }

  // ── Séances ───────────────────────────────────────────────────────────────
  // Ordre voulu : règle → mobilité → PRINCIPAL → accessoires → CONDITIONNEMENT
  // → sortie.
  //
  // EXCEPTION ASSUMÉE À LA RÈGLE D'ORDRE DU DÉPÔT (décision du 2026-11-04).
  // CLAUDE.md § 3.1 demande que le cardio passe juste après le principal, pour
  // que ce soient les accessoires qui sautent quand le temps manque. Ce cycle
  // fait l'inverse, volontairement : c'est un cycle de réhabilitation. Ce qui
  // doit survivre à une séance écourtée, ici, c'est le renforcement et la
  // mobilité — pas le vélo. Le conditionnement reste donc en fin de séance, et
  // dev/rehab_stephanie_checks.js l'épingle dans ce sens : un agent qui
  // appliquerait la règle générale à ce programme fera tomber le garde-fou.
  function rsBlocks(day, week){
    var w = wk(week);

    // A — Fessiers : extension de hanche chargée.
    if(day === "lundi") return [
      ruleBlock("lundi", dayRules),
      mobBlock(MOB_HANCHE),
      {time:"13 min", title:"A. Extension de hanche", tag:"Principal", kind:"main", exercises:[
        ex("Hip Thrust", rsSets(4, 10, week), rsLoad(300, week), "90 sec",
           "Deux jambes. Pause 1 sec en haut, bassin fini par les fessiers. Aucune hyperextension lombaire. Stop immédiat si pincement à l'aine droite. " + w.rpe + ".")
      ]},
      rotationBlock("lundi", week, 6, "B. Fessier isolé", "Isolation", "accessory"),
      {time:"5 min", title:"C. Tronc", tag:"Core", kind:"core", exercises:[
        ex("Dead Bug", rsSets(3, 10, week), "poids du corps", "45 sec",
           "Bras vers le plafond seulement si l'épaule gauche ne dit rien ; sinon bras au sol. Bas du dos collé, expiration lente.")
      ]},
      metconBlock("lundi", week, 10, "D. Cardio vélo"),
      coolBlock(3, "Hip Switch 6/côté + Half-Kneeling Hip Flexor Stretch 30 sec")
    ];

    // B — Tirage, bras, tronc : la seule séance haut du corps de la semaine.
    if(day === "mardi") return [
      ruleBlock("mardi", dayRules),
      mobBlock(MOB_DOS),
      {time:"9 min", title:"A. Tirage horizontal", tag:"Principal", kind:"main", exercises:[
        ex("Ring Row", rsSets(4, 12, week), "poids du corps", "75 sec",
           "L'angle du corps EST la charge : plus tu te redresses, plus c'est facile. Ajuste-le pour finir chaque série à " + w.rpe + ". Coudes près du corps, épaules basses et en arrière, jamais de traction au-dessus des épaules.")
      ]},
      {time:"4 min", title:"B. Triceps", tag:"Isolation", kind:"accessory", exercises:[
        ex("Tricep Pushdown", rsSets(3, 10, week), rsLoad(70, week), "60 sec",
           "Coudes collés au corps, épaules basses. Extension complète sans hausser l'épaule gauche. " + w.rpe + ".")
      ]},
      {time:"4 min", title:"C. Biceps", tag:"Isolation", kind:"accessory", exercises:[
        ex("DB Curl", rsSets(3, 10, week), rsLoad(15, week, "/ main"), "60 sec",
           "Léger, volontairement : RPE 7 maximum cette semaine et toutes les autres. Coudes fixes près du corps, aucun élan d'épaule. Si le coude ou l'épaule tire, tu descends de charge le jour même.")
      ]},
      rotationBlock("mardi", week, 5, "D. Tronc et haut du dos", "Core", "core"),
      metconBlock("mardi", week, 15, "E. Cardio vélo")
    ];

    // C — Unilatéral : fentes, et le deuxième mouvement de cuisses.
    if(day === "jeudi") return [
      ruleBlock("jeudi", dayRules),
      mobBlock(MOB_SQUAT),
      {time:"11 min", title:"A. Fentes", tag:"Principal", kind:"main", exercises:[
        ex("DB Reverse Lunge", rsSets(3, 8, week, "/jambe"), rsLoad(45, week, "/ main"), "75 sec",
           "Haltères le long du corps. Pas arrière, genou avant aligné sur le pied, bassin de face — aucune rotation de hanche. Descente contrôlée, pas de profondeur cherchée. " + w.rpe + ".")
      ]},
      {time:"8 min", title:"B. Cuisses — talons surélevés", tag:"Cuisses", kind:"accessory", exercises:[
        ex("Goblet Squat", rsSets(3, 10, week), rsLoad(75, week), "75 sec",
           "Talons sur deux plaques de 2,5 lb. C'est ce qui met la charge dans les cuisses sans demander plus de flexion à la hanche. Boîte derrière toi réglée à la parallèle : tu descends jusqu'au CONTACT, jamais plus bas. " + w.rpe + ".")
      ]},
      rotationBlock("jeudi", week, 4, "C. Tronc", "Core", "core"),
      metconBlock("jeudi", week, 12, "D. Cardio vélo"),
      coolBlock(2, "Adductor Rockback 8/côté + Hip Switch 6/côté")
    ];

    // D — Renforcement profond : tempo et isolation, la séance la plus légère.
    if(day === "vendredi") return [
      ruleBlock("vendredi", dayRules),
      mobBlock(MOB_HANCHE),
      {time:"10 min", title:"A. Extension de hanche en tempo", tag:"Principal", kind:"main", exercises:[
        ex("Hip Thrust", rsSets(3, 12, week), rsLoad(255, week), "90 sec",
           "Deux jambes, 3 secondes de descente contrôlée sur chaque répétition. Plus léger que lundi, c'est voulu : le tempo est la charge. Côtes basses, aucune hyperextension. " + w.rpe + ".")
      ]},
      rotationBlock("vendredi", week, 6, "B. Moyen fessier", "Isolation", "accessory"),
      {time:"6 min", title:"C. Superset tronc", tag:"Superset", kind:"core", exercises:[
        ex("Dead Bug", rsSets(3, 10, week), "poids du corps", "0 sec avant C2",
           "Bras vers le plafond seulement si l'épaule gauche est silencieuse, sinon bras au sol. Enchaîne directement sur le Pallof Press."),
        ex("Pallof Press", rsSets(3, 10, week, "/côté"), rsLoad(30, week), "60 sec après C2",
           "Câble à hauteur de sternum, bras devant et jamais au-dessus. " + Math.max(1, 3 + w.setsDelta) + " tours au total avec le dead bug.")
      ]},
      metconBlock("vendredi", week, 15, "D. Cardio vélo")
    ];

    // E — Cuisses : back squat bilatéral, la journée ajoutée.
    return [
      ruleBlock("samedi", dayRules),
      mobBlock(MOB_SQUAT),
      {time:"13 min", title:"A. Back Squat à la parallèle", tag:"Principal", kind:"main", exercises:[
        ex("Back Squat", rsSets(4, 8, week), rsLoad(235, week), "2:00",
           "Barre sur le haut du dos. Boîte derrière toi réglée à la parallèle : tu t'arrêtes à son CONTACT, jamais plus bas. Un seul pincement à l'aine = la boîte monte d'un cran. Aucune série à l'échec. " + w.rpe + ".")
      ]},
      {time:"7 min", title:"B. Cuisses — unilatéral chargé", tag:"Cuisses", kind:"accessory", exercises:[
        ex("Step-Up", rsSets(3, 8, week, "/jambe"), rsLoad(40, week, "/ main"), "60–75 sec",
           "Boîte 24 po, haltères le long du corps. Pousse par le talon, genou aligné sur le pied, aucune rotation de hanche. Descente lente, sans élan de la jambe arrière. " + w.rpe + ".")
      ]},
      rotationBlock("samedi", week, 3, "C. Tronc", "Core", "core"),
      metconBlock("samedi", week, 12, "D. Cardio vélo"),
      coolBlock(2, "Adductor Rockback 8/côté + Half-Kneeling Hip Flexor Stretch 30 sec")
    ];
  }
  window.COACH_BERTIN_PROGRAMS.rehab_stephanie = {
    id: "rehab_stephanie",
    label: "Réhabilitation & renforcement profond",
    phase: 0,
    phaseName: "Réhabilitation hanche et épaule",
    phaseEnd: "4 semaines. Ensuite : refaire le cycle avec les charges atteintes, ou réévaluer.",
    impact: "5 séances de 45 min par semaine, construites autour d'un conflit fémoro-acétabulaire à droite et d'une coiffe gauche irritée. Back squat et deux mouvements de cuisses par semaine, mobilité, renforcement profond et vélo. Les mouvements principaux ne changent pas ; le cardio et un accessoire tournent chaque semaine. Aucun overhead, aucun appui sur les bras, aucun squat sous la parallèle.",
    days: ["lundi", "mardi", "jeudi", "vendredi", "samedi"],
    weekLabels: ["S1 — Installation", "S2 — Volume", "S3 — Surcharge", "S4 — Allègement, récupération"],
    weekGoals: [
      "Installer les charges de base et les amplitudes sans douleur. RPE 6-7, jamais de série arrachée.",
      "Mêmes charges qu'en S1, 1 à 2 répétitions de plus par série. RPE 7.",
      "+5 % sur les charges, répétitions de la S1. RPE 7-8 — sauf le curl, plafonné à RPE 7.",
      "Semaine de récupération : −15 % de charge et une série de moins par exercice. RPE 6, on sort plus frais qu'en entrant."
    ],
    rest: "90–120 sec principal / 60–75 sec accessoire / 45 sec isolation et tronc",
    tag: "réhabilitation",
    trainingStyle: "rehab",
    conditioning: "light",
    objective: "réhabilitation",
    audience: "retour de blessure",
    frequency: 5,
    durationWeeks: 4,
    cycleRules: [
      "Hanche droite — conflit fémoro-acétabulaire de type pincer : squat, fentes et back squat s'arrêtent à la parallèle, jamais plus bas. La boîte derrière toi est le repère, pas une suggestion. Un pincement à l'aine arrête la série, il ne se négocie pas.",
      "Épaule gauche — supra-épineux et infra-épineux : aucun mouvement au-dessus des épaules, aucune position en appui sur les bras (planche, push-up). Coudes près du corps, épaules basses et en arrière. Sur le back squat, la barre est sur le haut du dos : si l'épaule tire, élargis la prise avant de changer autre chose.",
      "Mouvements exclus du cycle : overhead, planche et variantes en appui, push-ups, RDL, hip thrust unilatéral, pull-through, SkiErg, rameur, squat sous la parallèle.",
      "Les mouvements principaux ne changent pas sur les 4 semaines : c'est ce qui permet au moteur de suivre tes charges. Ce qui varie, c'est le cardio et un accessoire par séance.",
      "Cuisses : deux mouvements chargés par semaine (back squat le samedi, goblet talons surélevés le jeudi) plus les step-ups. Les talons surélevés ne sont pas un confort — ils déplacent la charge du bassin vers les cuisses.",
      "Cardio : vélo uniquement, selle assez haute pour éviter la flexion de hanche profonde.",
      "Le curl reste plafonné à RPE 7 tout le cycle — elle est déjà près de la douleur à 10 lb.",
      "Suivi par RPE seulement. Les séances se suivent dans l'ordre du cycle, peu importe le jour réel : décaler une séance n'a aucune conséquence."
    ],
    dayIntentions: {
      lundi:    "Charger l'extension de hanche à deux jambes et réveiller le fessier sans jamais fermer la hanche droite.",
      mardi:    "Tirer et travailler les bras sous la ligne des épaules, puis poser une base aérobie facile.",
      jeudi:    "Travailler jambe par jambe, puis charger les cuisses au goblet talons surélevés sans demander plus de flexion à la hanche.",
      vendredi: "Renforcer en profondeur au tempo et par l'isolation : la séance la plus légère de la semaine.",
      samedi:   "Charger les cuisses au back squat, bilatéral et borné à la parallèle — la séance qui fait sentir les quadriceps."
    },
    dayMeta: {
      lundi:    {label:"Fessiers",              base:"Hip thrust",            focus:"Hip thrust deux jambes, accessoire fessier qui tourne, dead bug. Cardio vélo variable."},
      mardi:    {label:"Tirage, bras & tronc",  base:"Ring row + bras",       focus:"Ring rows, pushdown, curl léger, bloc tronc/haut du dos qui tourne. Cardio vélo variable."},
      jeudi:    {label:"Unilatéral & cuisses",  base:"Fentes + goblet",       focus:"Fentes arrière, goblet squat talons surélevés à la parallèle, tronc qui tourne. Cardio vélo variable."},
      vendredi: {label:"Renforcement profond",  base:"Tempo + isolation",     focus:"Hip thrust tempo, moyen fessier qui tourne, superset tronc. Cardio vélo variable."},
      samedi:   {label:"Cuisses — back squat",  base:"Back squat + step-up",  focus:"Back squat à la parallèle, step-ups chargés, tronc qui tourne. Cardio vélo variable."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.rehab_stephanie.getBlocks = function(day, week){ return rsBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.rehab_stephanie.getWodText = function(day, week){
    var b = rsBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
    return b ? b.text : "Aucun cardio — séance de force seulement.";
  };
})();

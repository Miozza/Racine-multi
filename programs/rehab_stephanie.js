// Racine Programme autonome : Réhabilitation & renforcement profond (Stéphanie)
// 4 séances nommées par objectif (jamais par jour de semaine). Les clés
// lundi/mardi/jeudi/vendredi sont des identifiants internes moteur ;
// l'affichage passe par dayMeta[day].label. Cycle de 4 semaines, 45 min par
// séance : ~7 min mobilité, ~23 min force, ~15 min cardio (vélo uniquement).
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
//
// ── CHARGES : %1RM DE L'ATHLÈTE DE RÉFÉRENCE, PAS LES KILOS DE STÉPHANIE ────
// Convention du dépôt (CLAUDE.md § 3.1) : une charge chiffrée dans programs/
// est une charge de l'ATHLÈTE DE RÉFÉRENCE (scripts/profiles/reference.js).
// scripts/charge/scaling.js la ramène ensuite au niveau réel du profil actif,
// puis l'historique (Epley) reprend la main dès la première séance loggée.
// Écrire ici les 135 lb réels de Stéphanie aurait produit une DOUBLE
// RÉDUCTION — exactement le défaut que le contrat interdit.
//
// Les bases ci-dessous sont donc la charge de référence à la plage visée,
// dérivée du 1RM de référence par Epley : base = 1RM_réf / (1 + reps/30).
// Ce choix n'est pas arbitraire : il redonne EXACTEMENT les repères réels de
// Stéphanie une fois le ratio de son profil appliqué, parce que son ratio est
// lui-même le rapport de ses e1RM à ceux de la référence.
//   Hip Thrust    1RM réf 400 → 4×10 : 300 lb  (ratio ≈ 0,45 → 135 lb réels)
//   Goblet Squat  1RM réf 100 → 4×10 :  75 lb  (ratio ≈ 0,33 →  25 lb réels)
//   Fente DB      1RM réf  55 → 3×8  :  45 lb/main  (→ ≈ 20 lb/main)
//   Step-Up       1RM réf  50 → 3×8  :  40 lb/main  (→ ≈ 15 lb/main)
// Les mouvements jamais faits (kickback, pull-through) partent volontairement
// BAS : 30 et 50 lb de référence, soit ~10 et ~20 lb réels, les charges de
// départ prudentes demandées.
//
// ── PROGRESSION : LE MOTEUR EXISTANT, PAS UN DEUXIÈME ──────────────────────
// La progression sur 4 semaines passe par les deux leviers que Racine lit
// déjà, comme hypertrophie_fesse.js :
//   S1 base, S2 +2 reps à charge égale, S3 +5 % de charge, S4 −15 % et une
//   série de moins.
// Le pourcentage est appliqué à la base de référence (rsLoad), pas à une table
// de multiplicateurs parallèle ; le reste — RPE, freins, arrondi équipement,
// plafonds — reste au moteur de charges. La S4 porte « récupération » dans son
// libellé ET dans son objectif : c'est ce que lit coachIsDeloadWeekOrContext()
// pour couper l'auto-progression. Le curl porte « léger » dans sa note : c'est
// ce que lit coachExtractMovementIntent() pour l'empêcher de progresser comme
// un mouvement principal — son RPE est plafonné à 7, elle est déjà près de la
// douleur à 10 lb.
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
    1: {label:"S1 — Installation",  loadPct:1.00, repsDelta:0, setsDelta:0,  rpe:"RPE 6-7",
        note:"Charges de base. On cherche le geste propre, pas la charge."},
    2: {label:"S2 — Volume",        loadPct:1.00, repsDelta:2, setsDelta:0,  rpe:"RPE 7",
        note:"Mêmes charges, 1 à 2 répétitions de plus par série."},
    3: {label:"S3 — Surcharge",     loadPct:1.05, repsDelta:0, setsDelta:0,  rpe:"RPE 7-8",
        note:"+5 % sur les charges, reps de la S1. Aucune série grindée."},
    4: {label:"S4 — Allègement",    loadPct:0.85, repsDelta:0, setsDelta:-1, rpe:"RPE 6",
        note:"−15 % de charge et une série de moins. Semaine de récupération."}
  };
  function wk(week){ return WEEKS[Number(week)] || WEEKS[1]; }

  // Charge de référence à la semaine demandée. Arrondi aux 5 lb : le moteur
  // ré-arrondit ensuite au vrai matériel (data/equipment.js).
  function rsLoad(base, week, suffix){
    var n = Math.round((Number(base) || 0) * wk(week).loadPct / 5) * 5;
    return n + " lb" + (suffix ? " " + suffix : "");
  }
  // Schéma de séries : séries et reps suivent la semaine, le suffixe
  // (« /jambe », « /côté ») reste celui du mouvement.
  function rsSets(sets, reps, week, suffix){
    var w = wk(week);
    var s = Math.max(1, Number(sets) + w.setsDelta);
    var r = Math.max(1, Number(reps) + w.repsDelta);
    return s + "×" + r + (suffix || "");
  }
  function rsHold(sets, seconds, week, suffix){
    var w = wk(week);
    var s = Math.max(1, Number(sets) + w.setsDelta);
    return s + "×" + seconds + " sec" + (suffix || "");
  }

  // ── Règles par séance ─────────────────────────────────────────────────────
  // Une règle courte et concrète, tirée des mouvements du jour. Les règles
  // permanentes (hanche, épaule) vivent dans cycleRules, affichées une fois
  // dans la vue Cycle — les répéter ici les rendrait invisibles.
  var dayRules = {
    lundi:    "Hip thrust : menton rentré, côtes basses, aucune hyperextension lombaire en haut. Si ça pince à l'aine droite, tu arrêtes la série — ce n'est pas un signal à négocier. Step-ups : genou dans l'axe du pied, pas de rotation de hanche. Mobilité : 2 tenues de 30 secondes par côté sur l'étirement des fléchisseurs.",
    mardi:    "Rien ne monte au-dessus des épaules aujourd'hui. Coudes près du corps, épaules basses et en arrière sur tout le bloc. Le curl reste léger : RPE 7 maximum, jamais plus, même si ça semble facile.",
    jeudi:    "La boîte derrière toi est le repère de profondeur : tu t'arrêtes à son contact, jamais plus bas. Même consigne sur les air squats du cardio. Pull-through : charnière courte, tu arrêtes la descente avant le pincement.",
    vendredi: "Séance de contrôle, pas de charge. Le tempo de 3 secondes en descente est le travail — le poids ne sert qu'à le rendre difficile. Dead bug : bras vers le plafond seulement si l'épaule est silencieuse, sinon bras au sol. Mobilité : 2 tenues de 30 secondes par côté sur l'étirement des fléchisseurs."
  };

  // ── Mobilité ──────────────────────────────────────────────────────────────
  // Texte séparé par « + » : la vue séance en fait une carte par mouvement,
  // avec le bouton « ? » qui ouvre le tuto (scripts/session/view.js).
  var MOB_HANCHE = "Vélo stationnaire 3 min + Hip Switch 8/côté + Half-Kneeling Hip Flexor Stretch 30 sec + Clamshell 15/côté";
  var MOB_DOS    = "Cat-Cow 10 reps + 90/90 Breathing 8 reps + Mini-Band Lateral Walk 10/côté";
  var MOB_SQUAT  = "Hip CARs 5/côté + Glute Bridge 12 reps + Adductor Rockback 8/côté";

  function mobBlock(text, extra){
    return {time:"7 min", title:"Mobilité", tag:"Préparation", kind:"mobility", text:text + (extra ? " + " + extra : "")};
  }
  function ruleBlock(day){
    return {time:"1 min", title:"Règle de la séance", tag:"Préparation", kind:"warmup", text:dayRules[day] || dayRules.lundi};
  }

  // ── Séances ───────────────────────────────────────────────────────────────
  function rsBlocks(day, week){
    var w = wk(week);

    // A — Fessiers.
    if(day === "lundi") return [
      ruleBlock("lundi"),
      mobBlock(MOB_HANCHE),
      {time:"12 min", title:"A. Extension de hanche", tag:"Principal", kind:"main", exercises:[
        ex("Hip Thrust", rsSets(4, 10, week), rsLoad(300, week), "90 sec",
           "Deux jambes. Pause 1 sec en haut, bassin fini par les fessiers. Aucune hyperextension lombaire. Stop immédiat si pincement à l'aine droite. " + w.rpe + ".")
      ]},
      {time:"6 min", title:"B. Unilatéral contrôlé", tag:"Unilatéral", kind:"accessory", exercises:[
        ex("Step-Up", rsSets(3, 8, week, "/jambe"), rsLoad(40, week, "/ main"), "60–75 sec",
           "Boîte 24 po, haltères le long du corps. Pousse par le talon, genou aligné sur le pied, aucune rotation de hanche. Descente lente. " + w.rpe + ".")
      ]},
      {time:"4 min", title:"C. Fessier isolé", tag:"Isolation", kind:"accessory", exercises:[
        ex("Cable Kickback", rsSets(3, 12, week, "/jambe"), rsLoad(30, week), "45–60 sec",
           "Charge de départ prudente : mouvement jamais fait. Bassin fixe, amplitude courte, aucune cambrure pour aller plus loin. " + w.rpe + ".")
      ]},
      {time:"3 min", title:"D. Tronc", tag:"Core", kind:"core", exercises:[
        ex("Dead Bug", rsSets(3, 10, week), "poids du corps", "45 sec",
           "Bras vers le plafond seulement si l'épaule gauche ne dit rien ; sinon bras au sol. Bas du dos collé, expiration lente.")
      ]},
      {time:"10 min", title:"E. Intervalles vélo", tag:"Cardio", kind:"wod",
       text:"Intervalles vélo : 10 × (20 s fort / 40 s facile). Selle assez haute pour ne jamais fermer la hanche. Le « fort » est une cadence, pas une position — si la hanche pince, réduis la résistance, pas l'amplitude. " + w.rpe + " sur les 20 secondes."},
      {time:"2 min", title:"F. Retour au calme", tag:"Mobilité", kind:"mobility",
       text:"Hip Switch 6/côté + Half-Kneeling Hip Flexor Stretch 30 sec"}
    ];

    // B — Tirage, bras, tronc.
    if(day === "mardi") return [
      ruleBlock("mardi"),
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
      {time:"3 min", title:"D. Anti-rotation", tag:"Core", kind:"core", exercises:[
        ex("Pallof Press", rsSets(3, 10, week, "/côté"), rsLoad(30, week), "45 sec",
           "Câble à hauteur de sternum, jamais plus haut. Bras tendus devant, pas au-dessus. Le tronc refuse de tourner : c'est tout le travail.")
      ]},
      {time:"2 min", title:"E. Gainage", tag:"Core", kind:"core", exercises:[
        ex("Hollow Hold", rsHold(3, 20, week), "poids du corps", "45 sec",
           "Bras le long du corps — jamais en appui, jamais au-dessus de la tête. Bas du dos collé au sol ; réduis le levier avant de cambrer.")
      ]},
      {time:"15 min", title:"F. Zone 2 vélo", tag:"Cardio", kind:"wod",
       text:"Zone 2 vélo : 15 min continu. Allure de conversation, tu dois pouvoir parler en phrases complètes du début à la fin. Selle assez haute pour éviter la flexion de hanche profonde. RPE 5-6, jamais plus — ce n'est pas un intervalle."}
    ];

    // C — Squat et unilatéral.
    if(day === "jeudi") return [
      ruleBlock("jeudi"),
      mobBlock(MOB_SQUAT),
      {time:"12 min", title:"A. Squat à la parallèle", tag:"Principal", kind:"main", exercises:[
        ex("Goblet Squat", rsSets(4, 10, week), rsLoad(75, week), "90 sec",
           "Boîte derrière toi réglée à la parallèle : tu descends jusqu'au CONTACT, jamais plus bas. Torse haut, genoux dans l'axe. Un seul pincement à l'aine = la boîte monte d'un cran. " + w.rpe + ".")
      ]},
      {time:"6 min", title:"B. Fentes", tag:"Unilatéral", kind:"accessory", exercises:[
        ex("DB Reverse Lunge", rsSets(3, 8, week, "/jambe"), rsLoad(45, week, "/ main"), "75 sec",
           "Haltères le long du corps. Pas arrière, genou avant aligné sur le pied, bassin de face — aucune rotation de hanche. Descente contrôlée, pas de profondeur cherchée. " + w.rpe + ".")
      ]},
      {time:"4 min", title:"C. Charnière courte", tag:"Accessoire", kind:"accessory", exercises:[
        ex("Cable Pull-Through", rsSets(3, 12, week), rsLoad(50, week), "60 sec",
           "Charge de départ prudente : mouvement jamais fait. Amplitude de charnière LIMITÉE — tu recules les hanches jusqu'à la première tension, pas plus. Stop si pincement à l'aine. " + w.rpe + ".")
      ]},
      {time:"3 min", title:"D. Tronc", tag:"Core", kind:"core", exercises:[
        ex("Sit-Up", rsSets(3, 15, week), "poids du corps", "45 sec",
           "Bras croisés sur la poitrine ou le long du corps, jamais tendus au-dessus de la tête. Montée sans à-coup.")
      ]},
      {time:"12 min", title:"E. AMRAP vélo", tag:"Cardio", kind:"wod",
       text:"AMRAP 12 : 12 cal vélo + 10 Air Squat à la parallèle + 8 Step-Up sans charge. Les air squats s'arrêtent à la parallèle même en AMRAP — la fatigue n'autorise pas une profondeur que la hanche refuse. Rythme régulier, " + w.rpe + "."}
    ];

    // D — Renforcement profond.
    return [
      ruleBlock("vendredi"),
      mobBlock(MOB_HANCHE),
      {time:"10 min", title:"A. Extension de hanche en tempo", tag:"Principal", kind:"main", exercises:[
        ex("Hip Thrust", rsSets(3, 12, week), rsLoad(255, week), "90 sec",
           "Deux jambes, 3 secondes de descente contrôlée sur chaque répétition. Plus léger que lundi, c'est voulu : le tempo est la charge. Côtes basses, aucune hyperextension. " + w.rpe + ".")
      ]},
      {time:"5 min", title:"B. Moyen fessier", tag:"Isolation", kind:"accessory", exercises:[
        ex("Hip Abduction", rsSets(3, 15, week, "/côté"), "poids du corps", "45 sec",
           "Couchée sur le côté, bassin perpendiculaire au sol, jambe légèrement en arrière. Amplitude courte et propre, aucune bascule de bassin pour monter plus haut.")
      ]},
      {time:"3 min", title:"C. Fessier isolé", tag:"Isolation", kind:"accessory", exercises:[
        ex("Cable Kickback", rsSets(2, 15, week, "/jambe"), rsLoad(30, week), "45 sec",
           "Bassin fixe, amplitude courte. On cherche la sensation locale, pas la charge. " + w.rpe + ".")
      ]},
      {time:"4 min", title:"D. Superset tronc", tag:"Superset", kind:"core", exercises:[
        ex("Dead Bug", rsSets(3, 10, week), "poids du corps", "0 sec avant D2",
           "Bras vers le plafond seulement si l'épaule gauche est silencieuse, sinon bras au sol. Enchaîne directement sur le Pallof Press."),
        ex("Pallof Press", rsSets(3, 10, week, "/côté"), rsLoad(30, week), "60 sec après D2",
           "Câble à hauteur de sternum, bras devant et jamais au-dessus. " + Math.max(1, 3 + w.setsDelta) + " tours au total avec le dead bug.")
      ]},
      {time:"15 min", title:"E. Intervalles longs vélo", tag:"Cardio", kind:"wod",
       text:"Vélo : 4 × 3 min à environ 80 % / 1 min repos. L'effort reste une cadence tenue, jamais un sprint. Selle assez haute pour ne pas fermer la hanche. " + w.rpe + " sur les blocs de 3 minutes."}
    ];
  }

  window.COACH_BERTIN_PROGRAMS.rehab_stephanie = {
    id: "rehab_stephanie",
    label: "Réhabilitation & renforcement profond",
    phase: 0,
    phaseName: "Réhabilitation hanche et épaule",
    phaseEnd: "4 semaines. Ensuite : refaire le cycle avec les charges atteintes, ou réévaluer.",
    impact: "4 séances de 45 min par semaine, construites autour d'un conflit fémoro-acétabulaire à droite et d'une coiffe gauche irritée. Mobilité, renforcement profond et vélo. Aucun overhead, aucun appui sur les bras, aucun squat sous la parallèle.",
    days: ["lundi", "mardi", "jeudi", "vendredi"],
    weekLabels: ["S1 — Installation", "S2 — Volume", "S3 — Surcharge", "S4 — Allègement, récupération"],
    weekGoals: [
      "Installer les charges de base et les amplitudes sans douleur. RPE 6-7, jamais de série arrachée.",
      "Mêmes charges qu'en S1, 1 à 2 répétitions de plus par série. RPE 7.",
      "+5 % sur les charges, répétitions de la S1. RPE 7-8 — sauf le curl, plafonné à RPE 7.",
      "Semaine de récupération : −15 % de charge et une série de moins par exercice. RPE 6, on sort plus frais qu'en entrant."
    ],
    rest: "90 sec principal / 60–75 sec accessoire / 45 sec isolation et tronc",
    tag: "réhabilitation",
    trainingStyle: "rehab",
    conditioning: "light",
    objective: "réhabilitation",
    audience: "retour de blessure",
    frequency: 4,
    durationWeeks: 4,
    cycleRules: [
      "Hanche droite — conflit fémoro-acétabulaire de type pincer : squat et fentes s'arrêtent à la parallèle, jamais plus bas. Un pincement à l'aine arrête la série, il ne se négocie pas.",
      "Épaule gauche — supra-épineux et infra-épineux : aucun mouvement au-dessus des épaules, aucune position en appui sur les bras (planche, push-up). Coudes près du corps, épaules basses et en arrière.",
      "Mouvements exclus du cycle : overhead, planche et variantes en appui, push-ups, RDL, hip thrust unilatéral, SkiErg, rameur, squat sous la parallèle.",
      "Cardio : vélo uniquement, selle assez haute pour éviter la flexion de hanche profonde.",
      "Le curl reste plafonné à RPE 7 tout le cycle — elle est déjà près de la douleur à 10 lb.",
      "Suivi par RPE seulement. Les séances se suivent dans l'ordre du cycle, peu importe le jour réel."
    ],
    dayIntentions: {
      lundi:    "Charger l'extension de hanche à deux jambes et réveiller le fessier sans jamais fermer la hanche droite.",
      mardi:    "Tirer et travailler les bras sous la ligne des épaules, puis poser une base aérobie facile.",
      jeudi:    "Retrouver un squat propre à la parallèle et du travail jambe par jambe, avec la boîte comme garde-fou.",
      vendredi: "Renforcer en profondeur au tempo et par l'isolation, avec le cardio le plus structuré de la semaine."
    },
    dayMeta: {
      lundi:    {label:"Fessiers",                base:"Hip thrust + step-up",      focus:"Hip thrust deux jambes, step-ups 24 po, kickback câble, dead bug. Intervalles vélo courts."},
      mardi:    {label:"Tirage, bras & tronc",    base:"Ring row + bras",           focus:"Ring rows, pushdown, curl léger, Pallof, hollow hold. Zone 2 vélo."},
      jeudi:    {label:"Squat & unilatéral",      base:"Goblet squat + fentes",     focus:"Goblet squat à la parallèle, fentes, pull-through, sit-ups. AMRAP vélo."},
      vendredi: {label:"Renforcement profond",    base:"Tempo + isolation",         focus:"Hip thrust tempo, abduction, kickback, superset tronc. Intervalles longs vélo."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.rehab_stephanie.getBlocks = function(day, week){ return rsBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.rehab_stephanie.getWodText = function(day, week){
    var b = rsBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
    return b ? b.text : "Aucun cardio — séance de force seulement.";
  };
})();

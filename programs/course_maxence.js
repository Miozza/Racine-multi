// Racine Programme autonome : Jambes du coureur — cross-country (Maxence)
// Deux séances fixes, à répéter jusqu'à les connaître par cœur, faites UNE
// fois par semaine au choix :
//   - Séance A « Force »          (~60 min) — semaine normale ;
//   - Séance B « Semaine de course » (~40 min) — semaine de compétition.
// Public depuis V5.2.28 : l'athlète le choisit lui-même dans l'onglet Cycle.
// Les clés mardi/jeudi sont des identifiants internes moteur ; l'affichage
// passe par dayMeta[day].label.
// UNE SEULE SEMAINE, qui ne se termine jamais vraiment (V5.2.30, demande de
// l'athlète) : les deux mêmes séances se répètent, sans S2…S8 à faire avancer
// ni séance à marquer « manquée ». La progression ne dépend pas de la
// semaine : le moteur de charges la tire de l'historique et du RPE.
//
// ── L'ATHLÈTE ET CE QUI COMMANDE TOUT ──────────────────────────────────────
// 18 ans, 5'10, 140 lb, 6 km en 20:37. Un peu d'expérience en salle.
// L'objectif n'est pas la musculation : c'est la course. Deux règles en
// découlent, et le programme est écrit pour elles :
//   1. AUCUNE COURBATURE qui gêne la course. Volume bas, jamais d'échec
//      (RPE 7 max), peu d'excentrique lent. Les mêmes séances répétées
//      chaque semaine sont voulues : l'effet de la séance répétée fait
//      disparaître les courbatures après 2-3 semaines.
//   2. FORCE LOURDE ET RAPIDE, PAS DE VOLUME. Peu de reps, montée explosive :
//      c'est ce qui améliore l'économie de course sans ajouter de masse.
// Fragilités : cheville et releveurs des orteils (tibial antérieur). Ils
// sont renforcés doucement à chaque séance (Tibialis Raise, mollets,
// équilibre). Pas de sauts répétés sur place (pogo, corde) ni de réception
// en contrebas : le seul saut est un Squat Jump, UN saut à la fois, réception
// amortie et tenue 2 sec (V5.2.29 : le gym n'a pas de boîte, il remplace le
// Box Jump ; volume plafonné à 3×3 parce que la réception se fait au sol).
//
// ── CHARGES : %1RM DE L'ATHLÈTE DE RÉFÉRENCE ───────────────────────────────
// Convention du dépôt (CLAUDE.md § 3.1) : les nombres écrits sont ceux de
// l'athlète de référence (scripts/profiles/reference.js) ; scaling.js les
// ramène au niveau de Maxence, puis son historique prend la main.
//   Leg Press             4×6 : 450 lb ; B : 3×4 à 385 lb (≈ −15 %)
//   Single-Leg Leg Press  180 lb ; Leg Curl / Leg Extension 110 lb
//   Calf Raise            debout 180 lb (comme arnold_split_strict), assis 90 lb
// Repères déclarés dans movement_tuning.js (defaultLoadSeeds). Le poids
// affiché d'une presse ou d'une pile varie d'une machine à l'autre : le
// premier résultat loggé recale tout, c'est voulu.
//
// ── V5.2.30 : UN GYM D'APPAREILS ───────────────────────────────────────────
// Le gym du cégep est un gym de musculation à appareils, sans boîte. Le
// programme est construit autour : presse à jambes (principal), presse à une
// jambe, leg curl + leg extension, machines à mollets debout et assis. Les
// appareils réduisent aussi la technique à apprendre et les courbatures
// (peu d'excentrique sous charge libre) — exactement la règle 1.
// Pas de semaine allégée : il n'y a qu'une semaine. La première séance se
// prend plus légère par consigne (cycleRules), le moteur recale ensuite.
//
// ── SÉANCE B : LÉGÈRE PAR DÉCLARATION ──────────────────────────────────────
// Chaque exercice chargé de B porte « léger » dans sa note : c'est ce que lit
// coachExtractMovementIntent() pour couper l'auto-progression. Une presse de
// semaine de course ne doit jamais remplacer la capacité mesurée en A.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function ex(name, format, load, rest, note){
    return { name:name, format:format, load:load || "—", rest:rest || "60 sec", note:note || "" };
  }

  // Une seule semaine, répétée : la progression vient du moteur, pas d'ici.
  var WEEK_LABELS = ["Séances à répéter"];
  function cmLoad(base, week, suffix){
    var n = Math.round((Number(base) || 0) / 5) * 5;
    return n + " lb" + (suffix ? " " + suffix : "");
  }

  // Texte séparé par « + » : la vue séance en fait une carte par mouvement.
  var WARMUP = "Vélo ou jogging facile 5 min + Ankle Rocks 10/côté + Glute Bridge 10 reps + Tibialis Raise 10 reps légères + 3 Air Squat lents";
  var COOLDOWN = "Ankle Rocks 8/côté + Wall Calf Stretch 30 sec jambe tendue puis 30 sec genou plié, par côté";

  function seanceA(week){
    return [
      {time:"8 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:WARMUP},
      {time:"5 min", title:"A. Puissance", tag:"Puissance", kind:"secondary", exercises:[
        ex("Squat Jump", "3×3", "poids du corps", "1:30",
           "UN saut à la fois : quart de squat, saut le plus haut possible, réception douce et silencieuse sur l'avant-pied puis les talons, genoux souples. Tu TIENS la réception 2 secondes avant le saut suivant — jamais d'enchaînement rebondi, pour la cheville. Chaque saut est frais : qualité, pas fatigue.")
      ]},
      {time:"13 min", title:"B. Presse à jambes", tag:"Principal", kind:"main", exercises:[
        ex("Leg Press", "4×6", cmLoad(450, week), "2:30",
           "Pieds largeur des hanches au milieu de la plateforme. Descends jusqu'à environ 90° aux genoux, bassin collé au dossier — s'il décolle, c'est trop bas. Pousse le plus vite possible, sans verrouiller les genoux en haut. RPE 7 : il te reste 3 reps. Chaque machine est différente : à la 1re séance, ajuste la charge sur la 1re série, le moteur apprend ensuite.")
      ]},
      {time:"8 min", title:"C. Ischios & quadriceps", tag:"Superset", kind:"accessory", exercises:[
        ex("Leg Curl", "3×8", cmLoad(110, week), "0:30 avant C2",
           "Couché ou assis, selon la machine. Fléchis vite, redescends en 2 secondes. Les ischios protègent la foulée : RPE 7, jamais de crampe recherchée."),
        ex("Leg Extension", "2×10", cmLoad(110, week), "1:00 après C2",
           "Monte jusqu'à la jambe tendue, pause 1 sec, descente contrôlée. Renforce le genou du coureur. RPE 7.")
      ]},
      {time:"7 min", title:"D. Une jambe à la fois", tag:"Unilatéral", kind:"accessory", exercises:[
        ex("Single-Leg Leg Press", "3×6/jambe", cmLoad(180, week), "1:00",
           "Même presse, un seul pied au centre de la plateforme. Genou aligné sur le pied, poussée rapide comme une foulée. Commence par la jambe la plus faible. RPE 7.")
      ]},
      {time:"8 min", title:"E. Mollets", tag:"Superset", kind:"accessory", exercises:[
        ex("Standing Calf Raise", "3×10", cmLoad(180, week), "0:20 avant E2",
           "Machine à mollets debout, genoux tendus. Pause 1 sec en haut, descente complète. Enchaîne sur E2."),
        ex("Seated Calf Raise", "3×12", cmLoad(90, week), "1:00 après E2",
           "Machine à mollets assis, genoux pliés : c'est le soléaire, le muscle qui encaisse chaque foulée. Pause en haut, amplitude complète.")
      ]},
      {time:"6 min", title:"F. Cheville & tronc", tag:"Prévention", kind:"core", exercises:[
        ex("Tibialis Raise", "2×15", "poids du corps", "0:20 avant F2",
           "Dos au mur, talons à un pied du mur : lève les orteils le plus haut possible, descends lentement. C'est le muscle qui te fait mal : effort modéré, tu arrêtes si la douleur monte pendant la série."),
        ex("Side Plank", "2×30 sec/côté", "poids du corps", "0:45 après F2",
           "Corps en ligne, hanches hautes. Le bassin stable d'un coureur, c'est ça.")
      ]},
      {time:"3 min", title:"G. Retour au calme", tag:"Mobilité", kind:"mobility", text:COOLDOWN}
    ];
  }

  function seanceB(week){
    return [
      {time:"8 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:WARMUP},
      {time:"4 min", title:"A. Puissance", tag:"Puissance", kind:"secondary", exercises:[
        ex("Squat Jump", "2×3", "poids du corps", "1:30",
           "Mêmes consignes qu'en A : un saut à la fois, réception tenue 2 secondes. Léger : tu cherches à te sentir vif, pas à te fatiguer.")
      ]},
      {time:"9 min", title:"B. Presse rapide", tag:"Entretien", kind:"main", exercises:[
        ex("Leg Press", "3×4", cmLoad(385, week), "2:00",
           "Léger, volontairement : environ 15 % de moins qu'en A, RPE 6. Chaque rep pousse vite et facile. On garde la force sans rien laisser dans les jambes pour la course.")
      ]},
      {time:"6 min", title:"C. Une jambe à la fois", tag:"Entretien", kind:"accessory", exercises:[
        ex("Single-Leg Leg Press", "2×5/jambe", cmLoad(180, week), "1:00",
           "Léger : même charge qu'en A, moins de reps. Poussée rapide, retour contrôlé.")
      ]},
      {time:"6 min", title:"D. Mollets & cheville", tag:"Prévention", kind:"accessory", exercises:[
        ex("Standing Calf Raise", "2×10", cmLoad(180, week), "0:20 avant D2",
           "Léger : pause en haut, aucune brûlure recherchée."),
        ex("Tibialis Raise", "2×15", "poids du corps", "0:45 après D2",
           "Dos au mur, effort modéré. Tu arrêtes si la douleur monte pendant la série.")
      ]},
      {time:"3 min", title:"E. Retour au calme", tag:"Mobilité", kind:"mobility", text:COOLDOWN}
    ];
  }

  function cmBlocks(day, week){ return day === "jeudi" ? seanceB(week) : seanceA(week); }

  window.COACH_BERTIN_PROGRAMS.course_maxence = {
    id: "course_maxence",
    label: "Jambes du coureur — cross-country",
    phase: 0,
    phaseName: "Force des jambes pour la course",
    phaseEnd: "Pas de fin : les deux mêmes séances se répètent chaque semaine, les charges montent avec le RPE.",
    impact: "Une séance par semaine, au choix : A (force, ~60 min) en semaine normale, B (entretien, ~40 min) en semaine de course. Construit pour un gym à appareils, sans boîte : presse à jambes, leg curl, leg extension, machines à mollets. Force lourde et rapide, jamais à l'échec, pour courir plus économique sans courbatures.",
    days: ["mardi", "jeudi"],
    weekLabels: WEEK_LABELS,
    weekGoals: [
      "Les deux mêmes séances, à répéter chaque semaine : A en semaine normale, B en semaine de course. Pas de semaines à faire avancer — les charges progressent avec ton RPE."
    ],
    rest: "2:00–2:30 principal / 1:00 accessoire",
    tag: "COURSE",
    objective: "performance course",
    audience: "coureur",
    frequency: 1,
    durationWeeks: 1,
    cycleRules: [
      "Une seule séance par semaine : A en semaine normale, B en semaine de course. Les deux mêmes séances se répètent, sans semaine à faire avancer.",
      "Première séance : prends des charges plus légères que ce que tu penses pouvoir faire. C'est celle qui donnerait des courbatures ; le moteur ajuste ensuite sur ton RPE.",
      "Place la séance un jour de course facile ou de repos, au moins 48 h avant des intervalles ou une course. Jamais la veille d'une compétition.",
      "Rien à l'échec : RPE 7 maximum en A, RPE 6 en B. Une courbature qui dure plus de 2 jours veut dire trop lourd.",
      "Cheville et releveurs des orteils : pas de saut répété sur place, Squat Jump un saut à la fois avec réception tenue 2 secondes. Une douleur qui monte pendant une série arrête la série.",
      "Montée toujours rapide, descente contrôlée : la vitesse est le travail, pas la fatigue."
    ],
    dayIntentions: {
      mardi: "Construire de la force lourde et rapide dans les jambes, puis renforcer mollets, cheville et tronc.",
      jeudi: "Garder la force en semaine de course sans rien laisser dans les jambes."
    },
    dayMeta: {
      mardi: {label:"Séance A — Force",           base:"Presse + leg curl", focus:"Squat jump, presse à jambes 4×6, leg curl + leg extension, presse à une jambe, mollets aux machines, tibial, gainage latéral. ~58 min."},
      jeudi: {label:"Séance B — Semaine de course", base:"Presse légère", focus:"Squat jump, presse à jambes 3×4 légère, presse à une jambe, mollets, tibial. ~36 min."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.course_maxence.getBlocks = function(day, week){ return cmBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.course_maxence.getWodText = function(day, week){
    return "Aucun metcon — la course est son cardio.";
  };
})();

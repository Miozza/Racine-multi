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
//   Leg Press             4×4 RPE 8 : 495 lb ; B : 3×3 à 420 lb (≈ −15 %)
//   Hip Thrust            3×6 RPE 8 : 300 lb (1RM réf 400) ; B : 2×5 à 255 lb
//   Single-Leg Leg Press  3×5 : 200 lb ; B : 170 lb
//   Leg Curl              3×6 : 120 lb
//   Standing Calf Raise   4×6 lourd : 220 lb ; B : 2×6 à 185 lb. Un seul
//                         exercice de mollets par séance (choix de l'athlète).
// Repères déclarés dans movement_tuning.js (defaultLoadSeeds). Le poids
// affiché d'une presse ou d'une pile varie d'une machine à l'autre : le
// premier résultat loggé recale tout, c'est voulu.
//
// ── V5.2.30 : UN GYM D'APPAREILS ───────────────────────────────────────────
// Le gym du cégep est un gym de musculation à appareils, sans boîte. Le
// programme est construit autour : presse à jambes (principal), presse à une
// jambe, leg curl + leg extension, machine à mollets debout. Les
// appareils réduisent aussi la technique à apprendre et les courbatures
// (peu d'excentrique sous charge libre) — exactement la règle 1.
//
// ── V5.2.32 : UN COMPLÉMENT, PAS UN DEUXIÈME ENTRAÎNEMENT ──────────────────
// L'athlète est un coureur de niveau provincial (15e / 180 au cross), en club
// de course ET de natation : son cardio n'est pas une lacune. La séance ne
// garde donc que ce que la course et la natation ne donnent pas — force
// lourde (4×4 RPE 8), poussée de hanche, mollets/Achille lourds, ischios,
// cheville. Retirés : leg extension (peu de transfert à la course) et gainage
// latéral (couvert par la natation et le club). Durée gardée à ~60 min.
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
      {time:"7 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:WARMUP},
      {time:"5 min", title:"A. Puissance", tag:"Puissance", kind:"secondary", exercises:[
        ex("Squat Jump", "3×3", "poids du corps", "1:30",
           "UN saut à la fois : quart de squat, saut le plus haut possible, réception douce et silencieuse sur l'avant-pied puis les talons, genoux souples. Tu TIENS la réception 2 secondes avant le saut suivant — jamais d'enchaînement rebondi, pour la cheville. Chaque saut est frais : qualité, pas fatigue.")
      ]},
      {time:"13 min", title:"B. Presse lourde", tag:"Principal", kind:"main", exercises:[
        ex("Leg Press", "4×4", cmLoad(495, week), "2:30",
           "Lourd et rapide : c'est la force que la course ne te donne pas. Pieds largeur des hanches, descends jusqu'à environ 90° aux genoux, bassin collé au dossier. Pousse le plus vite possible, sans verrouiller les genoux. RPE 8 : il te reste 2 reps, jamais à l'échec. Chaque machine est différente : à la 1re séance, ajuste la charge sur la 1re série.")
      ]},
      {time:"9 min", title:"C. Poussée de hanche", tag:"Principal", kind:"main", exercises:[
        ex("Hip Thrust", "3×6", cmLoad(300, week), "2:00",
           "Machine à hip thrust, ou barre sur les hanches avec le haut du dos appuyé sur un banc. Ce sont les fessiers qui propulsent la foulée. Monte vite, pause 1 sec en haut, côtes basses, aucune cambrure du bas du dos. RPE 8.")
      ]},
      {time:"8 min", title:"D. Une jambe à la fois", tag:"Unilatéral", kind:"accessory", exercises:[
        ex("Single-Leg Leg Press", "3×5/jambe", cmLoad(200, week), "1:00",
           "Même presse, un seul pied au centre de la plateforme. Genou aligné sur le pied, poussée rapide comme une foulée. Commence par la jambe la plus faible. RPE 8.")
      ]},
      {time:"6 min", title:"E. Ischios", tag:"Accessoire", kind:"accessory", exercises:[
        ex("Leg Curl", "3×6", cmLoad(120, week), "1:00",
           "Couché ou assis, selon la machine. Fléchis vite, redescends en 2 secondes. Des ischios forts protègent les fins de course rapides. RPE 8, jamais de crampe recherchée.")
      ]},
      {time:"7 min", title:"F. Mollets lourds", tag:"Accessoire", kind:"accessory", exercises:[
        ex("Standing Calf Raise", "4×6", cmLoad(220, week), "1:30",
           "Machine à mollets debout, genoux tendus. Lourd : le mollet et le tendon d'Achille encaissent plusieurs fois ton poids à chaque foulée. Montée rapide, pause 1 sec en haut, descente complète en 2 secondes. RPE 8.")
      ]},
      {time:"4 min", title:"G. Cheville", tag:"Prévention", kind:"accessory", exercises:[
        ex("Tibialis Raise", "2×15", "poids du corps", "0:45",
           "Dos au mur, talons à un pied du mur : lève les orteils le plus haut possible, descends lentement. C'est le muscle qui te fait mal : effort modéré, tu arrêtes si la douleur monte pendant la série.")
      ]},
      {time:"3 min", title:"H. Retour au calme", tag:"Mobilité", kind:"mobility", text:COOLDOWN}
    ];
  }

  function seanceB(week){
    return [
      {time:"8 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:WARMUP},
      {time:"4 min", title:"A. Puissance", tag:"Puissance", kind:"secondary", exercises:[
        ex("Squat Jump", "2×3", "poids du corps", "1:30",
           "Mêmes consignes qu'en A : un saut à la fois, réception tenue 2 secondes. Léger : tu cherches à te sentir vif, pas à te fatiguer.")
      ]},
      {time:"8 min", title:"B. Presse rapide", tag:"Entretien", kind:"main", exercises:[
        ex("Leg Press", "3×3", cmLoad(420, week), "2:00",
           "Léger, volontairement : environ 15 % de moins qu'en A, RPE 6. Chaque rep pousse vite et facile. On garde la force sans rien laisser dans les jambes pour la course.")
      ]},
      {time:"6 min", title:"C. Poussée de hanche", tag:"Entretien", kind:"accessory", exercises:[
        ex("Hip Thrust", "2×5", cmLoad(255, week), "1:30",
           "Léger : environ 15 % de moins qu'en A, RPE 6. Montée rapide, pause 1 sec en haut.")
      ]},
      {time:"5 min", title:"D. Une jambe à la fois", tag:"Entretien", kind:"accessory", exercises:[
        ex("Single-Leg Leg Press", "2×4/jambe", cmLoad(170, week), "1:00",
           "Léger : poussée rapide, retour contrôlé, RPE 6.")
      ]},
      {time:"6 min", title:"E. Mollets & cheville", tag:"Prévention", kind:"accessory", exercises:[
        ex("Standing Calf Raise", "2×6", cmLoad(185, week), "0:20 avant E2",
           "Léger : pause en haut, aucune brûlure recherchée."),
        ex("Tibialis Raise", "2×15", "poids du corps", "0:45 après E2",
           "Dos au mur, effort modéré. Tu arrêtes si la douleur monte pendant la série.")
      ]},
      {time:"3 min", title:"F. Retour au calme", tag:"Mobilité", kind:"mobility", text:COOLDOWN}
    ];
  }

  function cmBlocks(day, week){ return day === "jeudi" ? seanceB(week) : seanceA(week); }

  window.COACH_BERTIN_PROGRAMS.course_maxence = {
    id: "course_maxence",
    label: "Jambes du coureur — cross-country",
    phase: 0,
    phaseName: "Force des jambes pour la course",
    phaseEnd: "Pas de fin : les deux mêmes séances se répètent chaque semaine, les charges montent avec le RPE.",
    impact: "Une séance par semaine, au choix : A (force, ~60 min) en semaine normale, B (entretien, ~40 min) en semaine de course. Construit pour un gym à appareils, sans boîte : presse à jambes, hip thrust, leg curl, machine à mollets. Un complément à la course : seulement ce qu'elle ne travaille pas. Force lourde et rapide, jamais à l'échec, pour courir plus économique sans courbatures.",
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
      "Rien à l'échec : RPE 8 maximum en A, RPE 6 en B. Une courbature qui dure plus de 2 jours veut dire trop lourd.",
      "C'est un complément à la course et à la natation, pas un deuxième entraînement : semaine chargée ou fatigue, la séance B ou rien. Dis à ton entraîneur de club quel jour tu la places.",
      "Cheville et releveurs des orteils : pas de saut répété sur place, Squat Jump un saut à la fois avec réception tenue 2 secondes. Une douleur qui monte pendant une série arrête la série.",
      "Montée toujours rapide, descente contrôlée : la vitesse est le travail, pas la fatigue."
    ],
    dayIntentions: {
      mardi: "Construire de la force lourde et rapide dans les jambes et les hanches, puis des mollets et une cheville plus solides.",
      jeudi: "Garder la force en semaine de course sans rien laisser dans les jambes."
    },
    dayMeta: {
      mardi: {label:"Séance A — Force",           base:"Presse lourde + hip thrust", focus:"Squat jump, presse à jambes 4×4 lourde, hip thrust, presse à une jambe, leg curl, mollets lourds, tibial. ~60 min."},
      jeudi: {label:"Séance B — Semaine de course", base:"Presse légère", focus:"Squat jump, presse à jambes 3×3 légère, hip thrust léger, presse à une jambe, mollets, tibial. ~40 min."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.course_maxence.getBlocks = function(day, week){ return cmBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.course_maxence.getWodText = function(day, week){
    return "Aucun metcon — la course est son cardio.";
  };
})();

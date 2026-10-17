// Racine Programme autonome : Jambes du coureur — cross-country (Maxence)
// Deux séances fixes, à répéter jusqu'à les connaître par cœur, faites UNE
// fois par semaine au choix :
//   - Séance A « Force »          (~60 min) — semaine normale ;
//   - Séance B « Semaine de course » (~40 min) — semaine de compétition.
// Public depuis V5.2.28 : l'athlète le choisit lui-même dans l'onglet Cycle.
// Les clés mardi/jeudi sont des identifiants internes moteur ; l'affichage
// passe par dayMeta[day].label. La séance non faite se marque « manquée »
// avec la raison « au choix » pour passer à la semaine suivante.
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
//   Back Squat   1RM réf 315 → 4×5 à ≈75 % : 235 lb ; B : 3×3 à ≈65 % : 205 lb
//   Barbell RDL  repère 170 → 185 lb à 3×6, RPE 6-7
//   DB Reverse Lunge  repère 40 lb / main (V5.2.30 : remplace le Step-Up,
//                qui demandait une boîte — le gym n'en a pas)
//   Calf Raise   debout 180 lb (comme arnold_split_strict), assis 90 lb
// La S1 est à −15 % : c'est la semaine qui donnerait des courbatures.
//
// ── SÉANCE B : LÉGÈRE PAR DÉCLARATION ──────────────────────────────────────
// Chaque exercice chargé de B porte « léger » dans sa note : c'est ce que lit
// coachExtractMovementIntent() pour couper l'auto-progression. Un squat de
// semaine de course ne doit jamais remplacer la capacité mesurée en A.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function ex(name, format, load, rest, note){
    return { name:name, format:format, load:load || "—", rest:rest || "60 sec", note:note || "" };
  }

  // S1 allégée, puis charges pleines : le moteur fait la suite sur le RPE.
  var WEEK_LABELS = ["S1 — Installation", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
  function loadPct(week){ return Number(week) === 1 ? 0.85 : 1; }
  function cmLoad(base, week, suffix){
    var n = Math.round((Number(base) || 0) * loadPct(week) / 5) * 5;
    return n + " lb" + (suffix ? " " + suffix : "");
  }

  // Texte séparé par « + » : la vue séance en fait une carte par mouvement.
  var WARMUP = "Vélo ou jogging facile 5 min + Ankle Rocks 10/côté + Glute Bridge 10 reps + Tibialis Raise 10 reps légères + 3 Air Squat lents";
  var COOLDOWN = "Ankle Rocks 8/côté + Wall Calf Stretch 30 sec jambe tendue puis 30 sec genou plié, par côté";

  function seanceA(week){
    return [
      {time:"8 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:WARMUP},
      {time:"6 min", title:"A. Puissance", tag:"Puissance", kind:"secondary", exercises:[
        ex("Squat Jump", "3×3", "poids du corps", "1:30",
           "UN saut à la fois : quart de squat, saut le plus haut possible, réception douce et silencieuse sur l'avant-pied puis les talons, genoux souples. Tu TIENS la réception 2 secondes avant le saut suivant — jamais d'enchaînement rebondi, pour la cheville. Chaque saut est frais : qualité, pas fatigue.")
      ]},
      {time:"14 min", title:"B. Squat", tag:"Principal", kind:"main", exercises:[
        ex("Back Squat", "4×5", cmLoad(235, week), "2:30",
           "Descente contrôlée (2 sec), montée la plus rapide possible. RPE 7 : il te reste 3 reps dans le réservoir. Jamais à l'échec.")
      ]},
      {time:"9 min", title:"C. Chaîne arrière", tag:"Principal", kind:"main", exercises:[
        ex("Barbell RDL", "3×6", cmLoad(185, week), "2:00",
           "Hanches loin derrière, dos neutre, barre collée aux cuisses. Descends jusqu'à l'étirement des ischios, pas plus bas. RPE 6-7 : les ischios d'un coureur se fâchent vite, on les renforce sans les écraser.")
      ]},
      {time:"8 min", title:"D. Unilatéral", tag:"Unilatéral", kind:"accessory", exercises:[
        ex("DB Reverse Lunge", "3×6/jambe", cmLoad(40, week, "/ main"), "1:00",
           "Un haltère dans chaque main, aucun autre équipement. Pas vers l'arrière, genou arrière qui frôle le sol sans le cogner. Toute la poussée vient du pied avant, remontée rapide comme une foulée, genou aligné sur le pied. RPE 7.")
      ]},
      {time:"8 min", title:"E. Mollets", tag:"Superset", kind:"accessory", exercises:[
        ex("Standing Calf Raise", "3×10", cmLoad(180, week), "0:20 avant E2",
           "Genoux tendus. Pause 1 sec en haut, descente complète. Enchaîne sur E2."),
        ex("Seated Calf Raise", "3×12", cmLoad(90, week), "1:00 après E2",
           "Genoux pliés : c'est le soléaire, le muscle qui encaisse chaque foulée. Pause en haut, amplitude complète.")
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
      {time:"10 min", title:"B. Squat rapide", tag:"Entretien", kind:"main", exercises:[
        ex("Back Squat", "3×3", cmLoad(205, week), "2:00",
           "Léger, volontairement : RPE 6. Chaque rep monte vite et facile. On garde la force sans rien laisser dans les jambes pour la course.")
      ]},
      {time:"6 min", title:"C. Unilatéral", tag:"Entretien", kind:"accessory", exercises:[
        ex("DB Reverse Lunge", "2×5/jambe", cmLoad(40, week, "/ main"), "1:00",
           "Léger : même charge qu'en A, moins de reps. Remontée rapide, descente contrôlée.")
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
    phaseEnd: "8 semaines. Ensuite : on recommence le même cycle avec les charges atteintes.",
    impact: "Une séance par semaine, au choix : A (force, ~60 min) en semaine normale, B (entretien, ~40 min) en semaine de course. Force lourde et rapide, jamais à l'échec, pour courir plus économique sans courbatures.",
    days: ["mardi", "jeudi"],
    weekLabels: WEEK_LABELS,
    weekGoals: [
      "Charges allégées de 15 % : c'est la semaine qui pourrait donner des courbatures. Apprends les deux séances.",
      "Charges pleines. RPE 7 maximum, montée rapide.",
      "Mêmes séances. Si tout est sous RPE 7, le moteur monte la charge.",
      "Mêmes séances, mêmes règles. Rien à l'échec.",
      "Mêmes séances. Les courbatures devraient avoir disparu.",
      "Mêmes séances. Note ton RPE honnêtement : c'est lui qui règle les charges.",
      "Mêmes séances. Semaine de course ? Prends la séance B.",
      "Dernière semaine du cycle. Relance-le pour continuer."
    ],
    rest: "2:00–2:30 principal / 1:00 accessoire",
    tag: "COURSE",
    objective: "performance course",
    audience: "coureur",
    frequency: 1,
    durationWeeks: 8,
    cycleRules: [
      "Une seule séance par semaine : A en semaine normale, B en semaine de course. L'autre se marque « manquée » (raison : au choix).",
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
      mardi: {label:"Séance A — Force",           base:"Squat + RDL + fentes", focus:"Squat jump, back squat 4×5, RDL, fentes arrière, mollets, tibial, gainage latéral. ~60 min."},
      jeudi: {label:"Séance B — Semaine de course", base:"Squat léger + fentes", focus:"Squat jump, back squat 3×3 léger, fentes arrière, mollets, tibial. ~40 min."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.course_maxence.getBlocks = function(day, week){ return cmBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.course_maxence.getWodText = function(day, week){
    return "Aucun metcon — la course est son cardio.";
  };
})();

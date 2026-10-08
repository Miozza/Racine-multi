// Racine — Phase 3 — Pont Peak — 7 semaines (5 octobre → 22 novembre 2026)
// Place : après Phase 2 — Fable 5, avant competition_peak (8 sem., compétition
// le 2027-01-15, début le 23 novembre). competition_peak ne contient ni bench,
// ni back squat, ni RDL : ce bloc est la dernière fenêtre de bench lourd et de
// masse d'épaules avant janvier.
// Méthode : rotation A (S1-3, variations nouvelles), rotation B (S4-5,
// mouvements de compétition), S6 deload, S7 test 1RM au Bench Press SEUL.
// Règle : noms de mouvements propres. Les intentions vivent dans les notes.
// Trois variations sont des mouvements DISTINCTS avec leur propre historique :
// Tempo Back Squat, Paused Bench Press, Bottoms-Up KB Press.
//
// CHARGES — échelle de l'ATHLÈTE DE RÉFÉRENCE, jamais celle d'un athlète réel.
// (scripts/profiles/reference.js : Back Squat 315, Bench 245, Front Squat 265,
// Strict Press 155, Power Clean 205.) scripts/charge/scaling.js multiplie ces
// nombres par le ratio de test du profil actif ; écrire ici les charges de
// travail d'un athlète les fait donc passer DEUX fois à l'échelle — mesuré sur
// la V1 de Fable 5 : Strict Press à 96-108 % du 1RM en 5×3, Box Squat à 57 %.
// Le sens de l'erreur suit le ratio : il écrase le bas du corps (ratio < 1) et
// gonfle le haut (ratio > 1).
//
// Mouvements A en livres = 1RM de référence × mult de la semaine, arrondi à 5 :
//   Tempo Back Squat   ≈ 0,85 × Back Squat 315 = 268 (tempo 3-1-X)
//   Paused Bench Press ≈ 0,93 × Bench 245      = 228 (pause 1 s)
//   S1 ×0,72 · S2 ×0,80 · S3 ×0,87 · S4 ×0,80 · S5 ×0,88 · S6 ×0,55
// Mise à l'échelle des variations, vérifiée dans le code (aucun mécanisme
// ajouté) : « Tempo Back Squat » prend le ratio direct du Back Squat
// (prCfgMatchesResult, /back.*squat/) ; « Paused Bench Press » et
// « Bottoms-Up KB Press » prennent le ratio de famille « poussée », borné à
// 1,20 tant qu'ils n'ont pas d'historique (coachApplyUnprovenLoadScale). Le
// Bottoms-Up est en kg, arrondi aux vraies KB du rack (data/equipment.js).
//
// Quatre charges ne s'écrivent pas en livres du tout — un pourcentage se
// résout sur la capacité MESURÉE (coachPercentTargetFromText) et ne traverse
// pas le ratio de profil : la porte du test bench S7 (« 90% »), le Back
// Squat S7 (« 80% »), le Weighted Pull-up et le Power Clean.

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
  window.COACH_BERTIN_PROGRAMS.pont_peak = {
    id: "pont_peak",
    label: "Phase 3 — Pont Peak",
    phase: 3,
    phaseName: "Pont vers le Peak — bench, épaules, équilibre du haut du corps",
    phaseEnd: "2026-11-22",
    nextPhase: "competition_peak",
    impact: "Bloc de 7 semaines entre Fable 5 et le Peak : dernière fenêtre de bench lourd et de masse d'épaules avant janvier, puisque competition_peak ne contient ni bench, ni back squat, ni RDL. Rotation A (S1-3) sur des variations nouvelles — Tempo Back Squat, Paused Bench Press, Landmine Press —, rotation B (S4-5) sur les mouvements de compétition, S6 deload, S7 test 1RM au Bench Press. Barbell RDL chaque lundi, DB Pullover deux fois par semaine, ratio tirage:poussée ≥ 1,5:1.",
    days: ["lundi", "mardi", "jeudi", "vendredi"],
    weekLabels: ["S1 Rotation A", "S2 Rotation A+", "S3 Rotation A max", "S4 Rotation B", "S5 Rotation B max", "S6 Deload", "S7 Test Bench"],
    weekGoals: [
      "Installer la rotation A : Tempo Back Squat, Paused Bench Press, Landmine Press. RPE 7, exécution irréprochable, aucun grind.",
      "Mêmes variations, charges montées. RPE 8. Le volume de tirage reste au-dessus de la poussée.",
      "Semaine max de la rotation A : 3RM propres au Tempo Back Squat et au Paused Bench Press, Landmine Press à RPE 9 sans RM. Jamais d'échec.",
      "Rotation B : retour aux mouvements de compétition — Back Squat, Bench Press, Strict Press en 5×3 à RPE 8.",
      "Doubles lourds à RPE 9 : préparation neurale du test de bench. Une rep en réserve, toujours.",
      "Deload : volume divisé par deux, charges légères, mobilité. On arrive frais au test.",
      "Test 1RM au Bench Press le mardi, porte à ~90 % d'abord. Condition d'entrée : 48 h sans fièvre. Le reste de la semaine : volume réduit, aucun RM."
    ],
    sets: ["4×5", "5×3", "3RM", "5×3", "4×2", "3×5 léger", "1RM test"],
    targetReps: [5, 3, 3, 3, 2, 5, 1],
    mult: [0.72, 0.80, 0.87, 0.80, 0.88, 0.55, 0.90],
    rest: "0:30–3:00",
    tag: "pont peak bench épaules",
    versionDate: "2026-10-01",
    versionLabel: "2026-10-01 — Phase 3 Pont Peak V1, rotations A/B, deload S6, test bench S7"
  };

  // ── S7 — TEST 1RM BENCH PRESS ───────────────────────────────────────────
  // Même mécanisme que la S8 de Fable 5 (programs/phase2_fable5.js) : la
  // charge affichée « 90% » est la PORTE, pas le 1RM. Le moteur la résout sur
  // la capacité mesurée ; les sauts réglés au RPE atteignent le 1RM du jour
  // quelle que soit la précision de la charge affichée.
  // Mots à NE PAS écrire dans cette note ni dans l'objectif de S7 : deload,
  // récupération, reset, facile (semaine lue comme deload) ; léger, technique,
  // vitesse, progression (contexte limité). Un 1RM réussi ne remplacerait
  // alors jamais la capacité du Bench Press. Garde-fou : dev/pont_peak_checks.js.
  var TEST_PROTOCOLE = "Paliers : 50% ×5, 70% ×3, 85% ×1 de la charge affichée. " +
    "PORTE : la charge affichée ×1. Porte à RPE 9 ou plus → pas de test aujourd'hui, reporte au vendredi. " +
    "Sinon, chaque saut se règle sur le RPE du single précédent : RPE 6 ou moins → +10 %, RPE 7 → +5 %, " +
    "RPE 8 → +2 à 3 % et c'est la dernière tentative, RPE 9 → stop, c'est ton 1RM du jour. " +
    "3 tentatives max après la porte, 3-4 min de repos. Enregistre la meilleure rep réussie avec son RPE.";

  // Une ligne par semaine. Les charges A suivent l'en-tête (référence × mult).
  function plan(week){
    return ({
      1: {
        monMain:"Tempo Back Squat", monFormat:"4×5", monLoad:"195 lb", // 268 × 0,72
        monNote:"Tempo 3-1-X : 3 s de descente, 1 s d'arrêt au fond, remontée explosive. RPE 7. Dos verrouillé, zéro rebond.",
        rdl:"3×8", rdlLoad:"180 lb",
        monWod:"AMRAP 8 : 8 Toes-to-Bar, 12 cal Bike.",
        tueMain:"Paused Bench Press", tueFormat:"4×5", tueLoad:"165 lb", // 228 × 0,72
        tueNote:"Pause 1 s immobile sur la poitrine, sans relâcher. RPE 7. Omoplates serrées, fessiers sur le banc.",
        pull:"Pendlay Row", pullFormat:"4×6", pullLoad:"135 lb",
        tueWod:"AMRAP 6 : 10 Box Jumps, 30 Double-Unders.",
        thuMain:"Landmine Press", thuFormat:"4×8/bras", thuLoad:"45 lb",
        thuNote:"Demi-genou, côtes basses. RPE 7. Laisse l'omoplate glisser vers le haut en fin de poussée.",
        thuWod:"AMRAP 7 : 12 cal Row, 10 KB Swings.",
        cleanFormat:"EMOM 8 × 2", cleanLoad:"70-75%",
        cleanNote:"70-75 % du 1RM, vitesse maximale. Chaque rep doit claquer. Une rep lente = fin du bloc.",
        friWod:"AMRAP 12 : 15 Wall Balls, 12 cal Row, 9 Toes-to-Bar."
      },
      2: {
        monMain:"Tempo Back Squat", monFormat:"5×3", monLoad:"215 lb", // 268 × 0,80
        monNote:"Tempo 3-1-X. RPE 8. Si le dos arrondit à la remontée, la charge est trop haute.",
        rdl:"3×8", rdlLoad:"185 lb",
        monWod:"EMOM 10 : minutes impaires 12 cal Ski ; minutes paires 10 Hanging Knee Raise.",
        tueMain:"Paused Bench Press", tueFormat:"5×3", tueLoad:"180 lb", // 228 × 0,80
        tueNote:"Pause 1 s sur la poitrine. RPE 8. La barre repart du même point à chaque rep.",
        pull:"Pendlay Row", pullFormat:"4×6", pullLoad:"145 lb",
        tueWod:"3 RFT : 10 Shuttle Runs de 10 m (aller-retour, ≈ 200 m), 15 Air Squats.",
        thuMain:"Landmine Press", thuFormat:"4×6/bras", thuLoad:"55 lb",
        thuNote:"Demi-genou, côtes basses. RPE 8. Aucune rotation du tronc.",
        thuWod:"EMOM 8 : minutes impaires 12 cal Row ; minutes paires 12 Goblet Squats.",
        cleanFormat:"EMOM 8 × 2", cleanLoad:"70-75%",
        cleanNote:"70-75 % du 1RM, vitesse maximale. Chaque rep doit claquer. Une rep lente = fin du bloc.",
        friWod:"21-15-9 : Wall Balls, Burpees — 10 Shuttle Runs de 10 m (aller-retour) après chaque tour (cap 14)."
      },
      3: {
        monMain:"Tempo Back Squat", monFormat:"montée vers 3RM", monLoad:"235 lb", // 268 × 0,87
        monNote:"3RM au tempo 3-1-X. RPE 9 max, jamais d'échec. Ce chiffre devient la référence de la variation.",
        rdl:"3×6", rdlLoad:"195 lb",
        monWod:"3 RFT : 15 cal Bike, 10 Burpees (cap 9).",
        tueMain:"Paused Bench Press", tueFormat:"montée vers 3RM", tueLoad:"200 lb", // 228 × 0,87
        tueNote:"3RM avec pause 1 s. RPE 9 max, jamais d'échec. Pareur obligatoire.",
        pull:"Pendlay Row", pullFormat:"4×6", pullLoad:"155 lb",
        tueWod:"EMOM 8 : minutes impaires 40 Double-Unders ; minutes paires 8 Box Jumps.",
        thuMain:"Landmine Press", thuFormat:"4×5/bras", thuLoad:"65 lb",
        thuNote:"RPE 9, pas de RM. Gainage solide, stop si l'épaule monte vers l'oreille.",
        thuWod:"2 RFT : 20 cal Row, 20 Walking Lunges.",
        cleanFormat:"EMOM 8 × 2", cleanLoad:"70-75%",
        cleanNote:"70-75 % du 1RM, vitesse maximale. Chaque rep doit claquer. Une rep lente = fin du bloc.",
        friWod:"EMOM 14 en 4 stations : 1) cal Row, 2) Wall Balls, 3) Burpees over the bar, 4) Double-Unders."
      },
      4: {
        monMain:"Back Squat", monFormat:"5×3", monLoad:"250 lb", // 315 × 0,80
        monNote:"Retour au mouvement de compétition. RPE 8. Descente contrôlée, remontée explosive.",
        rdl:"3×6", rdlLoad:"195 lb",
        monWod:"8 × (0:30 Bike fort / 0:30 repos).",
        tueMain:"Bench Press", tueFormat:"5×3", tueLoad:"195 lb", // 245 × 0,80
        tueNote:"Touch-and-go contrôlé, aucun rebond. RPE 8. Omoplates serrées, fessiers sur le banc.",
        pull:"Weighted Pull-up", pullFormat:"4×4", pullLoad:"80%",
        tueWod:"4 × (1:00 Shuttle Runs de 10 m / 1:00 repos) — compte les allers-retours, garde le même nombre à chaque intervalle.",
        thuMain:"Strict Press", thuFormat:"5×3", thuLoad:"125 lb", // 155 × 0,80
        thuNote:"RPE 8. Fessiers serrés, aucune cambrure, tête qui passe à travers en fin de poussée.",
        thuWod:"6 × (0:40 Row / 0:20 repos).",
        cleanFormat:"EMOM 10 × 3", cleanLoad:"65-70%",
        cleanNote:"Barbell cycling : 3 reps touch-and-go par minute à 65-70 % du 1RM. Cycle fluide, dos verrouillé.",
        friWod:"5 × (2:00 effort / 1:00 repos) : 12 cal Row puis max Wall Balls."
      },
      5: {
        monMain:"Back Squat", monFormat:"4×2", monLoad:"275 lb", // 315 × 0,88
        monNote:"Doubles lourds, RPE 9. Une rep en réserve, toujours. Aucune bataille.",
        rdl:"3×5", rdlLoad:"205 lb",
        monWod:"Pour le temps : 30 cal Bike, 20 Toes-to-Bar, 15 Burpees (cap 10).",
        tueMain:"Bench Press", tueFormat:"4×2", tueLoad:"215 lb", // 245 × 0,88
        tueNote:"Doubles lourds, RPE 9 : préparation neurale du test. Une rep en réserve. Pareur obligatoire.",
        pull:"Weighted Pull-up", pullFormat:"4×4", pullLoad:"85%",
        tueWod:"Pour le temps : 50 cal Bike (mini-benchmark, à refaire pendant le Peak).",
        thuMain:"Strict Press", thuFormat:"4×2", thuLoad:"135 lb", // 155 × 0,88
        thuNote:"Doubles lourds, RPE 9. Stop si le bas du dos cambre ou si la barre dérive vers l'avant.",
        thuWod:"Pour le temps : 500 m Row + 30 KB Swings (cap 7).",
        cleanFormat:"EMOM 10 × 3", cleanLoad:"65-70%",
        cleanNote:"Barbell cycling : 3 reps touch-and-go par minute à 65-70 % du 1RM. Cycle fluide, dos verrouillé.",
        friWod:"Mini-benchmark pour le temps : 50 Wall Balls, 40 cal Row, 30 Burpees, 20 Toes-to-Bar (cap 15). À refaire pendant le Peak pour mesurer la progression."
      },
      6: {
        monMain:"Back Squat", monFormat:"3×5", monLoad:"175 lb", // 315 × 0,55
        monNote:"Deload. Léger et propre : bouger, pas charger.",
        rdl:"2×8", rdlLoad:"135 lb",
        monWod:"8 min Bike, conversation possible.",
        tueMain:"Bench Press", tueFormat:"3×5", tueLoad:"135 lb", // 245 × 0,55
        tueNote:"Deload. Léger, barre qui monte toute seule.",
        pull:"Pendlay Row", pullFormat:"2×6", pullLoad:"115 lb",
        tueWod:"6 min Bike facile.",
        thuMain:"Strict Press", thuFormat:"3×5", thuLoad:"85 lb", // 155 × 0,55
        thuNote:"Deload. Léger, côtes basses.",
        thuWod:"6 min Row facile.",
        cleanFormat:"EMOM 6 × 2", cleanLoad:"60%",
        cleanNote:"Deload : 60 % du 1RM, réception propre, aucune rep lente.",
        friWod:"12 min flush facile au choix (Bike ou Row), conversation possible."
      },
      7: {
        monMain:"Back Squat", monFormat:"3×3", monLoad:"80%",
        monNote:"Pas de test : aucune montée vers un 1RM. 3×3 solides à la charge affichée, puis on range la barre.",
        rdl:"2×6", rdlLoad:"155 lb",
        monWod:"8 min Bike facile + mobilité hanches.",
        tueMain:"Bench Press", tueFormat:"montée vers 1RM", tueLoad:"90%",
        tueNote:"TEST ANCRE — 1RM, seul test du cycle. " + TEST_PROTOCOLE + " Pause touchée à la poitrine, fessiers sur le banc. Pareur obligatoire.",
        pull:"Pendlay Row", pullFormat:"2×8", pullLoad:"115 lb",
        tueWod:"6 min Bike facile (après le test).",
        thuMain:"Strict Press", thuFormat:"3×3", thuLoad:"115 lb", // modéré, ~0,75 × 155 (pas de mult : semaine de test)
        thuNote:"Modéré, aucune montée. Gainage solide, barre qui reste rapide.",
        thuWod:"6 min Row facile.",
        cleanFormat:"EMOM 8 × 2", cleanLoad:"75%",
        cleanNote:"75 % du 1RM, vitesse maximale. Chaque rep doit claquer. Aucun RM cette semaine.",
        friWod:"AMRAP 12 modéré, aperçu du Peak : 10 Wall Balls, 10 cal Row, 5 Burpees."
      }
    })[week] || plan(1);
  }

  function ex(name, format, load, rest, note){
    return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
  }

  function blocks(day, week){
    var w = Number(week) || 1;
    var p = plan(w);
    var rotA = w <= 3;
    var light = w >= 6;      // S6 deload, S7 semaine de test : accessoires réduits
    var isTest = w === 7;

    if(day === "lundi") return [
      {time:"8 min", title:"Échauffement squat", tag:"Préparation", kind:"warmup", text:"Bike 2 min + ankle rocks 10/côté + glute bridge 15 + goblet squat 10 + 90/90 hanches. Montée progressive longue sur le mouvement A."},
      {time:"16 min", title:"A. " + p.monMain, tag:"Squat lourd", kind:"main", exercises:[
        ex(p.monMain, p.monFormat, p.monLoad, "1:00 avant A2", p.monNote),
        // Filler : remplit la pause du squat sans le fatiguer, ni le RDL, ni le bench du mardi.
        ex("Tibialis Raise", light ? "2×15" : "3×15", "poids du corps", "1:00 après A2", "Pendant la pause du squat. Dos au mur, talons en avant, orteils vers les tibias. Lent, sans élan. Genoux et chevilles, zéro fatigue pour la série suivante.")
      ]},
      {time:"10 min", title:"B. Volume quadriceps", tag:"Masse jambes", kind:"hypertrophy", exercises:[
        light ? ex("Bulgarian Split Squat", "2×10/jambe", "30-35 lb / main", "1:00", "Léger, amplitude complète. On entretient, on ne charge pas.")
        : rotA ? ex("Front-Foot Elevated Split Squat", "3×8-10/jambe", "40-50 lb / main", "1:00", "Pied avant sur une plaque, genou avant qui voyage loin. Dernière série à 1-2 reps de l'échec.")
        : ex("Bulgarian Split Squat", "3×8-12/jambe", "50-55 lb / main", "1:00", "Torse un peu penché, genou avant qui voyage. Dernière série à 1-2 reps de l'échec.")
      ]},
      {time:"10 min", title:"C. Chaîne postérieure", tag:"Protection lombaire", kind:"accessory", exercises:[
        ex("Barbell RDL", p.rdl, p.rdlLoad, "0:30 avant C2", "Charnière propre, dos neutre, barre proche des tibias, genoux à peine fléchis. Le seul RDL avant janvier : le Peak n'en contient pas."),
        light ? ex("Dead Bug", "2×8/côté", "poids du corps", "1:00 après C2", "Côtes basses, bas du dos collé au sol, souffle contrôlé.")
        : ex("Ab Wheel Rollout", "3×8-10", "poids du corps", "1:00 après C2", "Anti-extension. Bassin rentré, côtes basses, dos qui ne creuse jamais. Rollout à genoux ; quand 10 reps propres passent, départ debout ou gilet lesté.")
      ]},
      {time:"8 min", title:"D. Metcon court", tag:"WOD", kind:"wod", text:p.monWod},
      {time:"3 min", title:"E. Retour au calme", tag:"Mobilité", kind:"mobility", text:"Couch stretch 45 sec/côté + décompression suspendue 30 sec + respiration."}
    ];

    if(day === "mardi"){
      var mardi = [
        {time:"8 min", title:"Échauffement bench + posture", tag:"Préparation", kind:"warmup", text:"Row 2 min. Puis 2 tours : Band Pull-Apart 20 (première série des 100 de la séance) + Scap Push-Up 10 + Wall Slide 8 + extension thoracique sur rouleau 60 sec. Montée progressive sur le mouvement A" + (isTest ? " — au moins 6 paliers avant la porte." : ".")}
      ];
      if(isTest){
        mardi.push({time:"22 min", title:"A. Bench Press", tag:"TEST ANCRE", kind:"main", exercises:[
          ex(p.tueMain, p.tueFormat, p.tueLoad, "3:00-4:00", p.tueNote)
        ]});
        mardi.push({time:"6 min", title:"B. Tirage après le test", tag:"Tirage", kind:"accessory", exercises:[
          ex(p.pull, p.pullFormat, p.pullLoad, "1:00", "Léger, uniquement après le test. Dos plat, barre qui touche le bas du sternum.")
        ]});
      } else {
        mardi.push({time:"12 min", title:"A. " + p.tueMain, tag:"Bench lourd", kind:"main", exercises:[
          ex(p.tueMain, p.tueFormat, p.tueLoad, "1:00 avant A2", p.tueNote)
        ]});
        mardi.push({time:"8 min", title:"B. " + p.pull + " — superset avec A", tag:"Tirage", kind:"secondary", exercises:[
          ex(p.pull, p.pullFormat, p.pullLoad, "1:30 après A1",
            p.pull === "Weighted Pull-up" ? "Lest ajouté, départ bras tendus, menton au-dessus de la barre. Aucun kip."
            : light ? "Léger. Dos plat, barre qui repart du sol à chaque rep."
            : "Barre qui repart du sol à chaque rep, dos parallèle au sol, tirage vers le bas du sternum.")
        ]});
        // Volume vertical en S1-S5, aussi en rotation B pour tenir le ratio
        // tirage:poussée ≥ 1,5 (voir dev/pont_peak_checks.js). « Pull-Up » et
        // non « Weighted Pull-up » : en rotation B, le lourd lesté du bloc B
        // porte déjà ce nom, et la capture des résultats se clé par nom.
        if(w <= 5) mardi.push({time:"6 min", title:"C. Volume dorsal", tag:"Ratio tirage", kind:"accessory", exercises:[
          ex("Pull-Up", "3×8-10", "poids du corps", "1:00", "Strict, départ bras tendus, menton au-dessus de la barre, aucun kip. Si 10 reps propres passent sur les 3 séries, ajoute 5-10 lb de lest.")
        ]});
      }
      mardi.push({time:"6 min", title:"D. DB Pullover", tag:"Lats + thoracique", kind:"accessory", exercises:[
        ex("DB Pullover", light ? "2×10" : "3×10-12", light ? "30-35 lb" : "45 lb", "1:00",
          "Excentrique 3 s, pause 2 s en étirement, côtes basses, bassin neutre. Objectif : extension thoracique et lats, pas la charge.")
      ]});
      mardi.push({time:"9 min", title:"E. Coiffe, posture et biceps", tag:"Santé d'épaules", kind:"accessory", exercises:[
        ex("Face Pull", light ? "2×15" : "3×15", light ? "50 lb" : "60 lb", "0:30 avant E2", "Rotation externe en fin de tirage, cou relâché."),
        ex("Cable Curl", light ? "2×10-12" : "3×10-12", light ? "30-35 lb" : "40 lb", "0:45", "Coudes fixes, aucun balancement."),
        ex("Band Pull-Apart", "5×20", "bande légère", "au besoin", "100 reps au total sur la séance : une série à l'échauffement, les autres entre les blocs. Ce socle ne tourne jamais.")
      ]});
      mardi.push({time:"8 min", title:"F. Metcon court", tag:"WOD", kind:"wod", text:p.tueWod + " Mardi : monostructural et bas du corps seulement, épaules et lats épargnés."});
      mardi.push({time:"3 min", title:"G. Retour au calme", tag:"Mobilité", kind:"mobility", text:"Lat stretch 45 sec/côté + pec stretch 45 sec/côté + ouverture thoracique sur rouleau 90 sec."});
      return mardi;
    }

    if(day === "jeudi") return [
      {time:"8 min", title:"Échauffement épaules + thoracique", tag:"Préparation", kind:"warmup", text:"Row 2 min. Puis 2 tours : Band External Rotation 12/côté + Scap Push-Up 10 + Wall Slide 8 + extension thoracique sur rouleau 60 sec. Montée progressive sur le mouvement A."},
      {time:"14 min", title:"A. " + p.thuMain, tag:"Épaules lourd", kind:"main", exercises:[
        ex(p.thuMain, p.thuFormat, p.thuLoad, "1:00 avant A2", p.thuNote),
        // Filler : aucun travail d'épaule ni de triceps, rien qui pèse sur le Front Squat.
        ex("Single-Leg Calf Raise", light ? "2×12/jambe" : "3×12/jambe", "poids du corps", "0:45 après A2", "Pendant la pause du press. Sur une marche, amplitude complète, 1 s en haut. Main au mur pour l'équilibre, pas pour pousser.")
      ]},
      {time:"10 min", title:"B. Front Squat", tag:"Amorce du Peak", kind:"secondary", exercises:[
        light ? ex("Front Squat", "3×3", "160 lb", "1:30", "Léger. Coudes hauts, torse droit.")
        : ex("Front Squat", "4×4", "200 lb", "1:30", "RPE 7, jamais au-delà : amorce du Peak, pas un test. Coudes hauts, torse droit.")
      ]},
      {time:"9 min", title:"C. Masse épaules", tag:"Superset", kind:"hypertrophy", exercises:
        light ? [
          ex("Arnold Press", "2×10", "25 lb / main", "0:30 avant C2", "Léger, rotation complète."),
          ex("Lateral Raise DB", "2×15", "15 lb", "1:00 après C2", "Léger, épaules basses.")
        ] : rotA ? [
          ex("Arnold Press", "3×10", "30-35 lb / main", "0:30 avant C2", "Rotation complète, coudes qui s'ouvrent en montant. Aucun élan."),
          ex("Lateral Raise DB", "4×12-15", "20 lb", "1:00 après C2", "Deltoïde latéral, aucun élan, épaules basses.")
        ] : [
          ex("Seated DB Press", "3×8", "45 lb / main", "0:30 avant C2", "Dos appuyé, cage basse, descente contrôlée aux épaules."),
          ex("Cable Lateral Raise", "4×12-15/bras", "20 lb", "1:00 après C2", "Câble au plus bas, tension constante, arrêt à hauteur d'épaule.")
        ]
      },
      {time:"9 min", title:"D. Stabilité — socle fixe", tag:"Coiffe", kind:"accessory", exercises:[
        ex("Bottoms-Up KB Press", light ? "2×6/bras" : "3×6/bras", "12 kg", "0:30", "KB à l'envers, poignet neutre, prise ferme. Lent et stable : si la cloche tombe, la charge est trop lourde."),
        ex("Cuban Press", "2×12", "15-25 lb total", "0:30", "Lent. Rotation externe complète à chaque rep. Ce bloc ne tourne jamais : c'est le socle."),
        ex("Overhead Rope Extension", light ? "2×12" : "3×12", light ? "35-40 lb" : "50 lb", "0:45", "Coudes serrés et hauts, étirement complet en bas.")
      ]},
      {time:"7 min", title:"E. Metcon court", tag:"WOD", kind:"wod", text:p.thuWod + " Aucune poussée au-dessus de la tête."},
      {time:"3 min", title:"F. Retour au calme", tag:"Mobilité", kind:"mobility", text:"Pec stretch 45 sec/côté + lat stretch 45 sec/côté + respiration."}
    ];

    // vendredi
    return [
      {time:"8 min", title:"Échauffement", tag:"Préparation", kind:"warmup", text:"Row 2 min + mobilité hanches/épaules + barre vide : 2×5 hang power clean, 2×5 front squat." + (isTest ? " Si le test bench a été reporté, il se fait ici À LA PLACE du DB Bench Press." : "")},
      {time:"10 min", title:"A. Power Clean", tag:"Transition Peak", kind:"main", exercises:[
        ex("Power Clean", p.cleanFormat, p.cleanLoad, "le reste de la minute", p.cleanNote)
      ]},
      {time:"10 min", title:"B. Bench volume", tag:"Bench", kind:"hypertrophy", exercises:[
        light ? ex("DB Bench Press", "2×10", "40 lb / main", "0:30 avant B2", "Léger, amplitude complète.")
        : rotA ? ex("DB Bench Press", "4×8-10", "55-60 lb / main", "0:45 avant B2", "Amplitude complète, omoplates serrées. Dernière série à 1-2 reps de l'échec.")
        : ex("Close-Grip Bench Press", "4×5", "175 lb", "0:45 avant B2", "Prise largeur d'épaules, coudes proches du corps, pause touchée à la poitrine."),
        // Filler : gainage doux au sol, ne fatigue ni le rowing qui suit ni le squat du lundi.
        ex("Dead Bug", light ? "2×8/côté" : "3×8/côté", "poids du corps", light ? "0:30 après B2" : "0:45 après B2", "Pendant la pause du bench. Côtes basses, bas du dos collé au sol, bras et jambe opposés qui s'allongent lentement.")
      ]},
      {time:"8 min", title:"C. Rowing", tag:"Superset", kind:"accessory", exercises:[
        light ? ex("One-Arm DB Row", "2×10/côté", "55 lb", "0:30 avant C2", "Coude vers la hanche, zéro rotation du tronc.")
        : rotA ? ex("One-Arm DB Row", "3×10/côté", "70 lb", "0:30 avant C2", "Amplitude complète, coude vers la hanche, zéro rotation du tronc.")
        : ex("Seated Cable Row", "3×10-12", "120 lb", "0:30 avant C2", "Torse droit, omoplates serrées en fin de tirage, aucun balancement."),
        // Face Pull : 2×15 prévu ; 3×15 en S1-S5 pour tenir le ratio ≥ 1,5.
        ex("Face Pull", light ? "2×15" : "3×15", light ? "50 lb" : "60 lb", "1:00 après C2", "Rotation externe en fin de tirage, cou relâché.")
      ]},
      {time:"5 min", title:"D. DB Pullover", tag:"Ouverture thoracique", kind:"accessory", exercises:[
        ex("DB Pullover", light ? "2×10" : "3×12", light ? "25-30 lb" : "35 lb", "0:45", "Cross-bench, plus léger que le mardi. Respiration, ouverture thoracique, amplitude maximale contrôlée.")
      ]},
      {time:light ? "12 min" : "14 min", title:"E. Metcon long", tag:"WOD", kind:"wod", text:p.friWod},
      {time:"3 min", title:"F. Retour au calme", tag:"Mobilité", kind:"mobility", text:"Couch stretch + pec stretch + 10 respirations lentes." + (isTest ? " Fin du bloc : le Peak commence lundi." : "")}
    ];
  }

  var P = window.COACH_BERTIN_PROGRAMS.pont_peak;
  P.getBlocks = function(day, week){ return blocks(day, week); };
  P.getWodText = function(day, week){
    var b = blocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
    return b ? b.text : "";
  };
  P.cycleRules = [
    "Rotation A (S1-3) : Tempo Back Squat, Paused Bench Press, Landmine Press. Rotation B (S4-5) : Back Squat, Bench Press, Strict Press — les mouvements de compétition.",
    "Vague RPE sur les mouvements A : 7 → 8 → 9 en rotation A (3RM propres en S3, jamais d'échec), 8 → 9 en rotation B (doubles lourds en S5).",
    "S6 deload obligatoire : volume divisé par deux, charges légères.",
    "S7 : un seul test du cycle, le Bench Press 1RM du mardi. Porte à la charge affichée (≈ 90 %) ×1 ; porte à RPE 9+ → report au vendredi. Sinon sauts au RPE : ≤6 → +10 %, 7 → +5 %, 8 → +2-3 % (dernière), 9 → stop. 48 h sans fièvre avant le test. Back Squat 3×3 à 80 %, aucun autre RM.",
    "Barbell RDL chaque lundi, DB Pullover le mardi et le vendredi, Cuban Press (jeudi) et Band Pull-Apart (mardi) : socle fixe, jamais en rotation.",
    "Ratio tirage:poussée ≥ 1,5:1 en séries chaque semaine de travail (S1-S5), hors stabilité et deltoïdes latéraux.",
    "Chaque variation garde son propre historique : ne jamais comparer un 3RM de Tempo Back Squat à un Back Squat, ni un Paused Bench Press à un Bench Press.",
    "Mardi : metcon monostructural ou bas du corps seulement — ni traction, ni rameur, ni wall balls, ni burpees, ni toes-to-bar, ni ski. Jeudi : aucune poussée au-dessus de la tête dans le metcon.",
    "60 minutes max par séance : lundi et jeudi courts, vendredi avec le metcon long, style Peak.",
    "Fillers pendant les pauses : Tibialis Raise (lundi, A2), Single-Leg Calf Raise (jeudi, A2), Dead Bug (vendredi, B2). Légers et sans conflit avec le mouvement principal ni avec la veille ou le lendemain.",
    "Charges écrites à l'échelle de l'athlète de référence : le moteur les ramène au niveau réel. Test bench, Back Squat S7, Weighted Pull-up et Power Clean en pourcentage, résolus sur la capacité mesurée."
  ];
  P.dayIntentions = {
    lundi: "Squat lourd : variation de squat en rotation avec Tibialis Raise pendant les pauses, volume quadriceps unilatéral, Barbell RDL, gainage anti-extension, metcon court.",
    mardi: "Bench lourd + tirage : variation de bench en rotation en superset avec un tirage, Pull-Up, DB Pullover, Face Pull, Cable Curl, 100 Band Pull-Apart, metcon qui épargne épaules et lats.",
    jeudi: "Épaules : press en rotation avec Single-Leg Calf Raise pendant les pauses, Front Squat d'amorce du Peak, masse deltoïdes, socle de stabilité (Bottoms-Up KB Press, Cuban Press), triceps, metcon sans poussée au-dessus de la tête.",
    vendredi: "Bench volume + transition Peak : Power Clean en EMOM, bench d'accessoire avec Dead Bug pendant les pauses, rowing, DB Pullover cross-bench, metcon long style Peak."
  };
  P.dayMeta = {
    lundi:   {label:"Lundi",   base:"Squat lourd",            focus:"Tempo Back Squat / Back Squat en rotation, split squat, Barbell RDL, Ab Wheel Rollout, metcon court."},
    mardi:   {label:"Mardi",   base:"Bench lourd + tirage",   focus:"Paused Bench Press / Bench Press en rotation, Pendlay Row / Weighted Pull-up, Pull-Up, DB Pullover, Face Pull, Band Pull-Apart, metcon court."},
    jeudi:   {label:"Jeudi",   base:"Épaules + front squat",  focus:"Landmine Press / Strict Press en rotation, Front Squat, Arnold Press / Seated DB Press, Bottoms-Up KB Press, Cuban Press, metcon court."},
    vendredi:{label:"Vendredi",base:"Bench volume + Peak",    focus:"Power Clean EMOM, DB Bench / Close-Grip Bench, rowing, DB Pullover, metcon long."}
  };
})();

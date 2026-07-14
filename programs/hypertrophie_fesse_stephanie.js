// Racine Programme autonome : Hypertrophie Fessiers — Stéphanie
// 10 séances fessiers nommées par objectif (jamais par jour de semaine),
// enchaînées en séquence fixe sur un cycle de 2 semaines. Les clés
// lundi→vendredi sont des identifiants internes moteur uniquement ;
// l'affichage passe par dayMeta[day].label. Le paramètre `week` sélectionne
// le bloc de 5 séances : semaines impaires = séances lourdes/volume,
// semaines paires = isolation, pump et récupération.
//
// Charges : Stéphanie n'a pas encore de tests chiffrés (data/athlete_state.json
// vide, data/charges.js ne couvre que 3 mouvements). Aucune charge de BASE
// numérique n'est donc inventée ici : les prescriptions restent en RPE
// textuel, exactement comme les mouvements au poids du corps / bande d'Arnold.
// Dès que ses vrais maxes/tests existeront, remplacer le RPE par une charge
// numérique de travail (comme Arnold) — le moteur scripts/charge/ la mettra
// alors à l'échelle du profil (scaleRatios) et progressera via l'historique
// (Epley). Ne pas coder de progression de charge en dur ici.
//
// Contrainte épaule reportée dans globalRules et cycleRules : pas d'overhead,
// pas de front rack lourd, pas de burpees en volume.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function ex(name, format, load, rest, note){
    return { name:name, format:format, load:load || "RPE 7", rest:rest || "60–90 sec", note:note || "" };
  }

  var globalRules = "Épaule à respecter : pas d’overhead, pas de front rack lourd, pas de burpees en volume — charges guidées par le RPE. RPE 7–8, jamais d’échec sur les mouvements lourds. Les séances se suivent dans l’ordre du cycle, peu importe le jour réel — saute ou répète librement. Semaines impaires : séances lourdes et volume. Semaines paires : isolation, pump et récupération active.";

  // Bloc d'ouverture commun : rappelle les règles globales + la prudence propre
  // à la séance (la note de surveillance historique est reportée ici pour ne pas
  // perdre l'info de sécurité).
  function intro(caution){
    return {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules + (caution ? " Prudence : " + caution : "")};
  }

  function stephBlocks(day, week){
    var even = (Number(week) || 1) % 2 === 0;

    // ── lundi : extension de hanche ─────────────────────────────────────────
    if(day==="lundi"){
      if(!even) return [
        intro("RPE 7–8, pas d’échec. Ne pas placer cette séance la veille ou le lendemain d’une autre séance fessiers lourde. Stop si douleur hanche, dos ou épaule."),
        {time:"8 min",title:"Warm-up général",tag:"Activation",kind:"warmup",text:"Bike 5 min + respiration côtes basses + Hip Switch + Hip CARs."},
        {time:"8 min",title:"Activation fessiers",tag:"Activation",kind:"warmup",text:"2 rondes : 15 glute bridge + 12 side-lying hip abduction/côté + 12 bodyweight reverse lunge/jambe."},
        {time:"18 min",title:"A. Hip Thrust lourd",tag:"Principal",kind:"main",exercises:[ex("Barbell Hip Thrust","5×6-8","RPE 7–8","90–120 sec","Pause 1 sec en haut, bassin stable. Monter seulement si la technique reste propre.")]},
        {time:"12 min",title:"B. Split Squat",tag:"Unilatéral",kind:"accessory",exercises:[ex("DB Bulgarian Split Squat","3×8/jambe","RPE 7","90 sec","Amplitude contrôlée, buste stable, pas d’échec.")]},
        {time:"8 min",title:"C. Abduction",tag:"Isolation",kind:"accessory",exercises:[ex("Cable Hip Abduction","3×15-20/côté","RPE 8","60 sec","Brûlure locale. Éviter de compenser avec le bas du dos.")]},
        {time:"5 min",title:"Finisher",tag:"Finisher",kind:"wod",text:"Glute bridge hold : 5×30 sec, repos 30 sec."},
        {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Couch Stretch + Figure-4 Stretch + Box Breathing."}
      ];
      return [
        intro("Très peu de stress systémique. Chercher la connexion fessiers, pas la charge. Ne pas la compter comme remplacement complet d’une séance lourde trop souvent."),
        {time:"7 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike + Hip Switch + Hip CARs + side-lying hip abduction."},
        {time:"14 min",title:"A. Cable Kickback",tag:"Principal",kind:"main",exercises:[ex("Cable Kickback","4×12-15/côté","RPE 7–8","60–90 sec","Bassin stable, amplitude contrôlée, pas de dos creux.")]},
        {time:"12 min",title:"B. Cable Hip Abduction",tag:"Isolation",kind:"accessory",exercises:[ex("Cable Hip Abduction","4×15-20/côté","RPE 8","60 sec","Chercher le moyen fessier, pas les lombaires.")]},
        {time:"10 min",title:"C. Hip Thrust",tag:"Accessoire",kind:"accessory",exercises:[ex("Hip Thrust","3×15","RPE 7","60–90 sec","Pompe musculaire, pas lourd.")]},
        {time:"8 min",title:"D. Pump circuit",tag:"Finisher",kind:"wod",text:"2 rondes : 20 frog pumps + 20 banded seated hip abductions + 30 sec glute bridge hold."},
        {time:"4 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Box Breathing + Hip Switch."}
      ];
    }

    // ── mardi : unilatéral & séance complète ────────────────────────────────
    if(day==="mardi"){
      if(!even) return [
        intro("Choisir des charges contrôlables. Risque de fatigue genou/hanche si les pas sont trop courts ou si la charge est forcée : réduire si le genou ou la hanche compense."),
        {time:"8 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike 5 min + Knee-to-Wall Ankle Rocks + Hip Switch + 10 step-up poids du corps/jambe."},
        {time:"7 min",title:"Activation",tag:"Activation",kind:"warmup",text:"2 rondes : 12 single-leg glute bridge/jambe + 15 banded seated hip abductions/côté."},
        {time:"16 min",title:"A. Step-up haut",tag:"Principal",kind:"main",exercises:[ex("DB Step-up","4×8/jambe","RPE 7–8","90 sec","Pousser par le talon, descente lente, pas d’élan.")]},
        {time:"12 min",title:"B. Reverse Lunge",tag:"Unilatéral",kind:"accessory",exercises:[ex("DB Reverse Lunge","3×10/jambe","RPE 7","90 sec","Long pas arrière pour charger plus le fessier.")]},
        {time:"10 min",title:"C. Hip Thrust modéré",tag:"Accessoire",kind:"accessory",exercises:[ex("Hip Thrust","3×12","RPE 7","90 sec","Série propre, congestion, pas lourd maximal.")]},
        {time:"6 min",title:"D. Abduction pump",tag:"Finisher",kind:"wod",text:"2 rondes : 20 banded seated hip abductions + 20 frog pumps."},
        {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Box Breathing + Hip Switch."}
      ];
      return [
        intro("Garder le rythme, mais ne pas sacrifier la technique. Si elle a plus de temps et beaucoup d’énergie, préférer une séance plus complète."),
        {time:"6 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike 4 min + glute bridge + side-lying hip abduction."},
        {time:"14 min",title:"A. Mouvement principal",tag:"Principal",kind:"main",exercises:[ex("Hip Thrust","4×8","RPE 7","90 sec","Pause en haut, stable.")]},
        {time:"10 min",title:"B. Unilatéral",tag:"Unilatéral",kind:"accessory",exercises:[ex("DB Reverse Lunge","3×10/jambe","RPE 7","90 sec","Choisir l’option la plus confortable.")]},
        {time:"8 min",title:"C. Isolation",tag:"Isolation",kind:"accessory",exercises:[ex("Cable Hip Abduction","3×15-20/côté","RPE 8","60 sec","Contrôle et sensation locale.")]},
        {time:"6 min",title:"D. Finisher",tag:"Finisher",kind:"wod",text:"AMRAP 6 : 12 glute bridge + 10 air squat tempo + 12 side-lying hip abduction/côté."},
        {time:"4 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Hip Switch + Box Breathing."}
      ];
    }

    // ── mercredi : volume & pump ────────────────────────────────────────────
    if(day==="mercredi"){
      if(!even) return [
        intro("Chercher la congestion, pas le max. RPE 7–8 maximum. Si courbatures fortes, réduire le finisher ou une série d’abduction."),
        {time:"8 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Row ou bike facile 5 min + activation élastique."},
        {time:"15 min",title:"A. Hip Thrust volume",tag:"Principal",kind:"main",exercises:[ex("Hip Thrust","4×10-12","RPE 7","90 sec","2 reps en réserve. Pause en haut sur chaque rep.")]},
        {time:"12 min",title:"B. Goblet Squat",tag:"Accessoire",kind:"accessory",exercises:[ex("Goblet Squat","3×12","RPE 7","90 sec","Pieds placés pour sentir les fessiers. Mouvement contrôlé.")]},
        {time:"10 min",title:"C. Slider Curl",tag:"Ischios",kind:"accessory",exercises:[ex("Slider Curl","3×12-15","RPE 8","60–90 sec","Ischios actifs, bassin stable.")]},
        {time:"8 min",title:"D. Abduction",tag:"Isolation",kind:"accessory",exercises:[ex("Cable Hip Abduction","3×20/côté","RPE 8","60 sec","Sensation locale, pas de vitesse inutile.")]},
        {time:"5 min",title:"Finisher",tag:"Finisher",kind:"wod",text:"AMRAP qualité : 12 glute bridge + 12 side-lying hip abduction/côté + 12 air squat tempo."},
        {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Figure-4 Stretch + Couch Stretch."}
      ];
      return [
        intro("Séance longue et légère orientée congestion. La brûlure musculaire est correcte ; la douleur articulaire ne l’est pas."),
        {time:"6 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike + Hip Switch + Hip CARs."},
        {time:"14 min",title:"A. Circuit 1",tag:"Finisher",kind:"wod",text:"3 rondes : 15 glute bridge + 12 step-up/jambe + 20 side-lying hip abduction/côté."},
        {time:"14 min",title:"B. Circuit 2",tag:"Finisher",kind:"wod",text:"3 rondes : 15 frog pumps + 15 side-lying hip abduction/côté + 12 reverse lunge/jambe."},
        {time:"8 min",title:"C. Finisher",tag:"Finisher",kind:"wod",text:"EMOM 8 : min impaires 35 sec wall sit, min paires 35 sec banded seated hip abduction."},
        {time:"6 min",title:"Core",tag:"Core",kind:"core",text:"2 rondes : 8 dead bug/côté + 20 sec side plank/côté."},
        {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Hip Switch + Couch Stretch + Box Breathing."}
      ];
    }

    // ── jeudi : chaîne postérieure & récupération ───────────────────────────
    if(day==="jeudi"){
      if(!even) return [
        intro("Dos neutre. Baisser la charge immédiatement si le bas du dos travaille plus que les ischios/fessiers."),
        {time:"8 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike 5 min + good morning PVC + hip hinge drill."},
        {time:"18 min",title:"A. RDL",tag:"Principal",kind:"main",exercises:[ex("DB RDL","4×8","RPE 7","90–120 sec","Charnière de hanche contrôlée, charge proche des jambes, aucune douleur lombaire.")]},
        {time:"12 min",title:"B. Glute Bridge",tag:"Accessoire",kind:"accessory",exercises:[ex("Glute Bridge","4×10-12","RPE 7","90 sec","Pause en haut, côtes basses, bassin stable.")]},
        {time:"10 min",title:"C. Hamstring",tag:"Ischios",kind:"accessory",exercises:[ex("Slider Curl","3×10-12","RPE 8","60–90 sec","Contrôle lent, surtout à l’excentrique.")]},
        {time:"7 min",title:"D. Core anti-extension",tag:"Core",kind:"core",exercises:[ex("Dead Bug","3×8/côté","poids du corps","45–60 sec","Expiration lente, lombaires stables.")]},
        {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Supine Hamstring Stretch + Figure-4 Stretch + Box Breathing."}
      ];
      return [
        intro("Aucun mouvement ne devrait dépasser RPE 6. Ne pas transformer cette séance en séance intense : tout doit rester facile."),
        {time:"12 min",title:"Cardio facile",tag:"Cardio",kind:"warmup",text:"Bike ou marche inclinée en aisance respiratoire."},
        {time:"10 min",title:"Activation",tag:"Activation",kind:"warmup",text:"2 rondes : 15 glute bridge + 12 side-lying clamshell/côté + 12 bird dog/côté."},
        {time:"12 min",title:"Hip Switch + Hip CARs",tag:"Mobilité",kind:"mobility",text:"90/90 hanches + couch stretch + pigeon modifié + respiration lente."},
        {time:"8 min",title:"Core léger",tag:"Core",kind:"core",text:"2 rondes : 8 dead bug/côté + 20 sec side plank/côté + 8 pallof press/côté si câble disponible."},
        {time:"5 min",title:"Option pump",tag:"Finisher",kind:"wod",text:"Banded seated hip abduction légère 2×20 si elle veut finir avec une activation."}
      ];
    }

    // ── vendredi : fessiers + jambes & moteur doux ──────────────────────────
    if(!even) return [
      intro("Le contrôle compte plus que le poids. Éviter le front rack si l’épaule est sensible ; rester sur le goblet."),
      {time:"8 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike 5 min + air squats tempo + activation fessiers."},
      {time:"15 min",title:"A. Squat pattern",tag:"Principal",kind:"main",exercises:[ex("Goblet Squat","4×10","RPE 7","90 sec","Amplitude propre. Éviter le front rack si l’épaule est sensible.")]},
      {time:"12 min",title:"B. Hip Thrust",tag:"Accessoire",kind:"accessory",exercises:[ex("Hip Thrust","3×10","RPE 7","90 sec","Pause en haut. Série stable.")]},
      {time:"10 min",title:"C. Walking Lunge",tag:"Unilatéral",kind:"accessory",exercises:[ex("Walking Lunge","3×12 pas/jambe","RPE 7","90 sec","Long pas, contrôle, pas de douleur genou.")]},
      {time:"8 min",title:"D. Abduction + mollets",tag:"Finisher",kind:"wod",text:"2 rondes : 20 banded seated hip abductions + 20 calf raises."},
      {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Hip Switch + Couch Stretch + Box Breathing."}
    ];
    return [
      intro("Cardio contrôlé, pas un WOD à fond. Garder le RPE cardio à 6–7 : si ça devient une course, la qualité fessiers baisse."),
      {time:"7 min",title:"Warm-up",tag:"Activation",kind:"warmup",text:"Bike + activation fessiers."},
      {time:"12 min",title:"A. Hip Thrust",tag:"Principal",kind:"main",exercises:[ex("Hip Thrust","3×10","RPE 7","90 sec","Stable, sans grind.")]},
      {time:"10 min",title:"B. Step-up",tag:"Unilatéral",kind:"accessory",exercises:[ex("Step-up","3×12/jambe","RPE 7","90 sec","Poids léger ou corps libre selon la fatigue.")]},
      {time:"16 min",title:"C. Conditioning doux",tag:"Finisher",kind:"wod",text:"AMRAP 16 facile : 10 cal bike + 12 air squats tempo + 12 glute bridge + 10 band pull-aparts. RPE 6–7."},
      {time:"6 min",title:"D. Core",tag:"Core",kind:"core",text:"Dead bug 2×8/côté + side plank 2×20 sec/côté."},
      {time:"5 min",title:"Retour au calme",tag:"Mobilité",kind:"mobility",text:"Box Breathing + Hip Switch."}
    ];
  }

  window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse_stephanie = {
    id: "hypertrophie_fesse_stephanie",
    label: "Hypertrophie Fessiers — Stéphanie",
    phase: 0,
    phaseName: "Hypertrophie fessiers",
    impact: "10 séances fessiers nommées par objectif, enchaînées en cycle de 2 semaines à fréquence réelle libre. Semaines impaires lourdes/volume, semaines paires isolation/pump/récupération. RPE contrôlé, aucun échec, épaule ménagée.",
    days: ["lundi","mardi","mercredi","jeudi","vendredi"],
    rest: "90–120 sec principal / 60–90 sec accessoire / 45–60 sec isolation",
    tag: "hypertrophie",
    trainingStyle: "bodybuilding",
    conditioning: "light",
    cycleRules: [
      "Les séances se suivent dans l’ordre du cycle, peu importe le jour réel — saute ou répète librement.",
      "Semaines impaires : les 5 séances lourdes et de volume. Semaines paires : isolation, pump et récupération.",
      "Épaule à respecter : pas d’overhead, pas de front rack lourd, pas de burpees en volume.",
      "RPE 7–8, jamais d’échec sur les mouvements lourds ; charges guidées par le RPE tant qu’aucun test chiffré n’existe.",
      "Ne pas empiler deux séances fessiers lourdes sur des jours consécutifs ; surveiller bas du dos et hanche.",
      "Sur le RDL : baisser la charge dès que le bas du dos travaille plus que les ischios/fessiers.",
      "Brûlure musculaire tolérée sur le pump ; douleur articulaire = stop."
    ],
    dayIntentions: {
      lundi:    "Charger l’extension de hanche (hip thrust lourd, puis isolation câble en semaine paire) sans stresser l’épaule.",
      mardi:    "Développer les fessiers jambe par jambe et corriger les asymétries, ou faire une séance complète efficace quand le temps manque.",
      mercredi: "Accumuler du volume hypertrophie propre, puis du pump long quand le système nerveux doit rester tranquille.",
      jeudi:    "Renforcer ischios/fessiers avec un hinge contrôlé, ou récupérer activement sans créer de nouvelle fatigue.",
      vendredi: "Travailler fessiers avec jambes complètes, ou ajouter un peu de moteur doux sans irriter l’épaule."
    },
    dayMeta: {
      lundi:    {label:"Fessiers — Extension de hanche", base:"Hip thrust / isolation câble", focus:"Hip thrust lourd et abduction (S. impaire) ; cable kickback et abduction (S. paire)."},
      mardi:    {label:"Fessiers — Unilatéral",         base:"Step-up, lunge, séance courte", focus:"Step-up, reverse lunge, hip thrust (S. impaire) ; séance complète courte (S. paire)."},
      mercredi: {label:"Fessiers — Volume & pump",      base:"Volume hypertrophie / circuits", focus:"Hip thrust volume, goblet, slider curl (S. impaire) ; circuits pump long (S. paire)."},
      jeudi:    {label:"Chaîne postérieure & récup",    base:"RDL / mobilité",              focus:"RDL, glute bridge, slider curl (S. impaire) ; récupération active mobilité (S. paire)."},
      vendredi: {label:"Fessiers + jambes",             base:"Squat pattern / moteur doux", focus:"Goblet squat, hip thrust, walking lunge (S. impaire) ; fessiers + cardio doux (S. paire)."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse_stephanie.getBlocks = function(day, week){ return stephBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse_stephanie.getWodText = function(day, week){
    var b = stephBlocks(day, week).filter(function(x){ return x.kind==="wod"; })[0];
    return b ? b.text : "Aucun WOD — bloc hypertrophie.";
  };
})();

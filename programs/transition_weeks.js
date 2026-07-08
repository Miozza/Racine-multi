// Racine — semaines de transition entre deux cycles (La Saison, étape 1)
// Deux micro-cycles d'une semaine, 3 jours :
//  - transition_deload_3d : décharge structurée quand la fatigue s'accumule.
//  - transition_tests_3d  : recalibrage des 5 mouvements de référence de
//    l'onboarding — redonne des données fraîches au moteur de charges.
// Les charges sont exprimées en % du cycle précédent : ces semaines suivent
// l'utilisateur, elles ne dépendent pas d'une référence absolue.

(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

  function ex(name, format, load, rest, note){
    return {name:name, format:format, load:load || "—", rest:rest || "—", note:note || ""};
  }

  // ─── Semaine deload ─────────────────────────────────────────────────────────

  function deloadBlocks(day){
    var blocks = [
      {time:"8 min", title:"Warm-up long", tag:"Préparation", kind:"warmup",
       text:"Cardio très facile 4 min + mobilité complète hanches/épaules/thoracique. Cette semaine, l'échauffement est aussi important que le travail."}
    ];
    if(day === "lundi"){
      blocks.push({time:"12 min", title:"A. Squat léger", tag:"Principal", kind:"main", exercises:[
        ex("Back Squat", "2×8", "≈60 % du cycle précédent", "1:30", "RPE 6 maximum. Vitesse propre, zéro grind.")]});
      blocks.push({time:"10 min", title:"B. Push + Pull faciles", tag:"Superset", kind:"hypertrophy", exercises:[
        ex("Bench Press", "2×8", "≈60 % du cycle précédent", "0:20 avant B2", "Loin de l'échec."),
        ex("Ring Row", "2×10", "poids du corps", "1:00 après B2", "Scapula, tempo lent.")]});
    } else if(day === "mercredi"){
      blocks.push({time:"12 min", title:"A. Hinge léger", tag:"Principal", kind:"main", exercises:[
        ex("Hip Thrust", "2×10", "≈60 % du cycle précédent", "1:30", "Pause en haut, aucune surcharge.")]});
      blocks.push({time:"10 min", title:"B. Épaules + haut du dos", tag:"Superset", kind:"hypertrophy", exercises:[
        ex("Strict Press", "2×8", "≈60 % du cycle précédent", "0:20 avant B2", "Côtes basses."),
        ex("Face Pull", "2×15", "léger", "1:00 après B2", "Posture, sang dans le haut du dos.")]});
    } else {
      blocks.push({time:"12 min", title:"A. Full-body facile", tag:"Principal", kind:"main", exercises:[
        ex("Goblet Squat", "2×10", "léger", "1:00", "Amplitude complète, respiration.")]});
      blocks.push({time:"10 min", title:"B. Tirage + unilatéral", tag:"Superset", kind:"hypertrophy", exercises:[
        ex("Barbell Row", "2×8", "≈60 % du cycle précédent", "0:20 avant B2", "Propre."),
        ex("Bulgarian Split Squat", "2×8", "léger", "1:00 après B2", "Équilibre, pas de brûlure.")]});
    }
    blocks.push({time:"8 min", title:"C. Flush aérobie", tag:"Conditioning", kind:"wod",
      text:"Zone 2 très facile 8 min (bike/row/marche rapide). Conversation possible en continu. Objectif : circulation, pas performance."});
    blocks.push({time:"6 min", title:"D. Mobilité + respiration", tag:"Mobilité", kind:"mobility",
      text:"Respiration nasale 2 min allongé + étirements doux hanches/pecs/lats. Sors du gym plus frais qu'en entrant."});
    return blocks;
  }

  window.COACH_BERTIN_PROGRAMS.transition_deload_3d = {
    id: "transition_deload_3d",
    label: "Transition — Semaine Deload",
    phase: 0,
    phaseName: "Décharge entre deux cycles",
    phaseEnd: "Une semaine. Ensuite : nouveau cycle, frais.",
    impact: "Volume −50 %, charges ≈60 % : le corps récupère, le mouvement reste. À placer quand les RPE des dernières semaines montent trop haut.",
    days: ["lundi", "mercredi", "vendredi"],
    weekLabels: ["Deload"],
    weekGoals: ["Récupérer sans s'arrêter. RPE ≤ 6 sur tout. Si un jour tu te sens exceptionnel, garde-le pour le prochain cycle."],
    sets: ["2×8 léger"],
    targetReps: [8],
    mult: [0.60],
    rest: "1:00–1:30",
    tag: "TRANSITION",
    objective: "transition",
    audience: "tous",
    frequency: 3,
    versionDate: "2026-07-08",
    versionLabel: "2026-07-08 — semaines de transition V1",
    dayIntentions: {},
    dayMeta: {},
    cycleRules: ["Aucun PR cette semaine.", "Aucune série à l'échec.", "Le finisher reste en zone 2."],
    getBlocks: function(day, week){ return deloadBlocks(day); }
  };

  // ─── Semaine de tests ───────────────────────────────────────────────────────

  function testsBlocks(day){
    var rampNote = "Monte par paliers : 5 reps légères, 3 moyennes, puis séries de test. Inscris chaque résultat — il recalibre tes charges pour le prochain cycle.";
    var blocks = [
      {time:"10 min", title:"Warm-up progressif", tag:"Préparation", kind:"warmup",
       text:"Cardio facile 4 min + mobilité ciblée + 2 ramp-up sets légers sur le premier test du jour. Ne teste jamais à froid."}
    ];
    if(day === "lundi"){
      blocks.push({time:"18 min", title:"A. Test Squat", tag:"Test", kind:"main", exercises:[
        ex("Back Squat", "5 reps @ charge test", "charge contrôlée (RPE 8)", "3:00", rampNote)]});
      blocks.push({time:"14 min", title:"B. Test Tirage horizontal", tag:"Test", kind:"hypertrophy", exercises:[
        ex("Barbell Row", "8 reps @ charge test", "charge contrôlée (RPE 8)", "2:30", "Buste solide. La rep 8 doit rester propre.")]});
    } else if(day === "mercredi"){
      blocks.push({time:"18 min", title:"A. Test Bench Press", tag:"Test", kind:"main", exercises:[
        ex("Bench Press", "5 reps @ charge test", "charge contrôlée (RPE 8)", "3:00", rampNote)]});
      blocks.push({time:"14 min", title:"B. Test Strict Press", tag:"Test", kind:"hypertrophy", exercises:[
        ex("Strict Press", "5 reps @ charge test", "charge contrôlée (RPE 8)", "2:30", "Côtes basses, zéro impulsion des jambes.")]});
    } else {
      blocks.push({time:"18 min", title:"A. Test Hinge", tag:"Test", kind:"main", exercises:[
        ex("Hip Thrust", "8 reps @ charge test", "charge contrôlée (RPE 8)", "3:00", rampNote)]});
      blocks.push({time:"12 min", title:"B. Volume technique libre", tag:"Bonus", kind:"hypertrophy", exercises:[
        ex("Goblet Squat", "2×10", "léger", "1:00", "Mouvement plaisir, aucune donnée à prendre.")]});
    }
    blocks.push({time:"6 min", title:"C. Flush court", tag:"Conditioning", kind:"wod",
      text:"Zone 2 facile 6 min. Les tests fatiguent le système nerveux, pas besoin d'en rajouter."});
    blocks.push({time:"5 min", title:"D. Mobilité", tag:"Mobilité", kind:"mobility",
      text:"Étirements doux ciblés sur les mouvements testés aujourd'hui."});
    return blocks;
  }

  window.COACH_BERTIN_PROGRAMS.transition_tests_3d = {
    id: "transition_tests_3d",
    label: "Transition — Semaine de Tests",
    phase: 0,
    phaseName: "Recalibrage des références",
    phaseEnd: "Une semaine. Les résultats recalibrent le prochain cycle.",
    impact: "Les 5 mouvements de référence (squat, bench, strict press, tirage horizontal, hinge) re-testés à RPE 8 contrôlé. Donne des repères frais au moteur de charges.",
    days: ["lundi", "mercredi", "vendredi"],
    weekLabels: ["Tests"],
    weekGoals: ["RPE 8 contrôlé, jamais 10. Un test raté ne se retente pas le même jour : note la charge précédente et passe."],
    sets: ["5 @ test"],
    targetReps: [5],
    mult: [0.85],
    rest: "2:30–3:00",
    tag: "TRANSITION",
    objective: "transition",
    audience: "tous",
    frequency: 3,
    versionDate: "2026-07-08",
    versionLabel: "2026-07-08 — semaines de transition V1",
    dayIntentions: {},
    dayMeta: {},
    cycleRules: ["Chaque test s'arrête à RPE 8.", "Inscris tous les résultats dans la séance.", "Pas de WOD intense cette semaine."],
    getBlocks: function(day, week){ return testsBlocks(day); }
  };
})();

// Racine — logique d'intégration (onboarding) d'un nouvel utilisateur.
// Pur calcul, sans DOM. L'interface (assistant visuel) vit dans scripts/profiles/ui.js.
// Ce fichier charge AVANT app.js : il ne doit donc jamais appeler une fonction
// d'app.js (epley1RM, defaultProfile, PR_FIELD_MAP, state, save()...) au
// chargement du script — seulement depuis des fonctions invoquées plus tard,
// après un clic utilisateur (à ce moment app.js est forcément déjà chargé).
window.CoachOnboarding = window.CoachOnboarding || {};

(function(){
  var api = window.CoachOnboarding;

  api.EXPERIENCE_LEVELS = {
    debutant: {
      label: "Débutant",
      hint: "Moins de 6 mois d'entraînement structuré en force.",
      defaultAggressiveness: 0.7,
      fallbackRatio: 0.45
    },
    intermediaire: {
      label: "Intermédiaire",
      hint: "Entre 6 mois et 3 ans d'entraînement structuré.",
      defaultAggressiveness: 1.0,
      fallbackRatio: 0.75
    },
    avance: {
      label: "Avancé",
      hint: "Plus de 3 ans, technique solide sur les mouvements principaux.",
      defaultAggressiveness: 1.25,
      fallbackRatio: 1.0
    }
  };

  // Les 5 tests guidés. Chaque test produit un e1RM (formule Epley, identique
  // à celle déjà utilisée par le moteur de charge) pour son mouvement
  // "primaire" (même famille d'implément que ce qui est testé). Les variantes
  // à la même famille d'implément (barre -> barre) sont dérivées par la même
  // formule Epley (absoluteKeys). Les variantes qui changent de famille
  // d'implément (barre -> haltère unilatéral) ne peuvent PAS être dérivées
  // par 1RM absolu : l'échelle de charge n'est pas la même (un Bulgarian
  // Split Squat à haltère n'a rien à voir, en lb, avec un Front Squat à la
  // barre). Pour celles-là on applique plutôt le RATIO du test à la valeur
  // de référence (proportionalKeys).
  api.TEST_PLAN = [
    {
      id: "squat",
      title: "Squat",
      subtitle: "Front Squat ou Back Squat — celui que tu maîtrises le mieux.",
      guidance: "Échauffe-toi progressivement, puis fais UNE série de travail propre de 5 à 10 répétitions à RPE 7-8 (encore 2-3 reps en réserve). Pas de tentative maximale.",
      primary: "frontSquat", primaryReps: 1,
      absoluteKeys: { backSquat5RM: 5 },
      proportionalKeys: ["bulgarianDb"]
    },
    {
      id: "bench",
      title: "Bench Press",
      subtitle: "Développé couché à la barre.",
      guidance: "Même logique : une série de travail propre de 5 à 10 répétitions à RPE 7-8.",
      primary: "bench", primaryReps: 1,
      absoluteKeys: {},
      proportionalKeys: ["inclineDb10RM"]
    },
    {
      id: "press",
      title: "Strict Press",
      subtitle: "Développé épaules strict, debout, sans élan des jambes.",
      guidance: "Charge modérée, 5 à 10 répétitions propres à RPE 7-8.",
      primary: "strictPress", primaryReps: 1,
      absoluteKeys: {},
      proportionalKeys: []
    },
    {
      id: "row",
      title: "Tirage horizontal",
      subtitle: "Barbell Row, Chest Supported Row ou équivalent.",
      guidance: "5 à 10 répétitions propres à RPE 7-8, dos neutre.",
      primary: "row8RM", primaryReps: 8,
      absoluteKeys: { chestRow8RM: 8, latPulldown10RM: 10 },
      proportionalKeys: []
    },
    {
      id: "hinge",
      title: "Chaîne postérieure",
      subtitle: "Hip Thrust ou DB RDL.",
      guidance: "5 à 10 répétitions propres à RPE 7-8.",
      primary: "hipThrust8RM", primaryReps: 8,
      absoluteKeys: {},
      proportionalKeys: ["dbRdl"]
    }
  ];

  function round5(n){ return Math.round(Number(n)/5)*5; }

  function epley(weight, reps){
    if(typeof epley1RM === "function") return epley1RM(weight, reps);
    weight = Number(weight)||0; reps = Number(reps)||0;
    if(!weight||!reps) return 0;
    return weight*(1+reps/30);
  }
  function fromOneRM(oneRm, reps){
    if(typeof estimateLoadForRepsFrom1RM === "function") return estimateLoadForRepsFrom1RM(oneRm, reps);
    oneRm = Number(oneRm)||0; reps = Number(reps)||1;
    if(!oneRm) return 0;
    return oneRm/(1+reps/30);
  }

  // answers = { squat:{weight,reps,rpe}|null, bench:{...}, press:{...}, row:{...}, hinge:{...} }
  // Un test "null"/incomplet est traité comme "ignoré" : on estime à partir du
  // niveau déclaré plutôt que de bloquer l'intégration.
  api.computeFromAnswers = function(answers, experienceLevel){
    answers = answers || {};
    var lvl = api.EXPERIENCE_LEVELS[experienceLevel] || api.EXPERIENCE_LEVELS.intermediaire;
    var ref = (typeof defaultProfile === "object" && defaultProfile) ? defaultProfile : {};
    var values = {};
    var testRatio = {};

    api.TEST_PLAN.forEach(function(test){
      var a = answers[test.id];
      var e1rm = null;
      if(a && Number(a.weight) > 0 && Number(a.reps) > 0){
        e1rm = epley(Number(a.weight), Number(a.reps));
      }

      // 1. Mouvement primaire + variantes de même famille d'implément (barre) :
      //    dérivés directement par 1RM (Epley), comme le ferait le moteur.
      var primaryDefault = ref[test.primary];
      var primaryVal = null;
      if(e1rm){
        primaryVal = round5(fromOneRM(e1rm, test.primaryReps));
      } else if(primaryDefault || primaryDefault === 0){
        primaryVal = round5(primaryDefault * lvl.fallbackRatio);
      }
      if(primaryVal || primaryVal === 0) values[test.primary] = primaryVal;

      Object.keys(test.absoluteKeys || {}).forEach(function(key){
        var reps = test.absoluteKeys[key];
        var d = ref[key];
        var val = null;
        if(e1rm){ val = round5(fromOneRM(e1rm, reps)); }
        else if(d || d === 0){ val = round5(d * lvl.fallbackRatio); }
        if(val || val === 0) values[key] = val;
      });

      // Ratio représentatif de ce test, basé sur le mouvement primaire —
      // utilisé pour le power clean et pour les variantes haltère ci-dessous.
      if((values[test.primary] || values[test.primary] === 0) && primaryDefault){
        testRatio[test.id] = values[test.primary] / primaryDefault;
      }

      // 2. Variantes qui changent de famille d'implément (barre -> haltère
      //    unilatéral) : l'échelle absolue en lb n'est pas comparable, donc
      //    on met à l'échelle proportionnellement au ratio du test plutôt
      //    que de réutiliser le 1RM absolu du mouvement barre.
      var ratioForProportional = testRatio[test.id] || lvl.fallbackRatio;
      (test.proportionalKeys || []).forEach(function(key){
        var d = ref[key];
        if(d || d === 0) values[key] = round5(d * ratioForProportional);
      });
    });

    // Power clean : mouvement hybride non testé directement (trop technique
    // pour un mini-test sans supervision). Estimation prudente : moyenne du
    // ratio squat et du ratio tirage.
    if(ref.powerClean){
      var rs = testRatio.squat || lvl.fallbackRatio;
      var rr = testRatio.row || lvl.fallbackRatio;
      values.powerClean = round5(ref.powerClean * ((rs + rr) / 2));
    }

    var ratios = api.ratiosFromValues(values, experienceLevel);
    return { values: values, ratios: ratios };
  };

  // Recalcule les ratios (mêmes règles que computeFromAnswers) à partir de
  // valeurs déjà connues — utilisé quand l'utilisateur édite manuellement ses
  // charges de départ à l'écran de revue, pour que la mise à l'échelle live
  // (state.profile.scaleRatios) reflète bien ses corrections.
  api.ratiosFromValues = function(values, experienceLevel){
    var lvl = api.EXPERIENCE_LEVELS[experienceLevel] || api.EXPERIENCE_LEVELS.intermediaire;
    var ref = (typeof defaultProfile === "object" && defaultProfile) ? defaultProfile : {};
    var ratios = {};
    Object.keys(ref).forEach(function(key){
      var v = values[key], d = ref[key];
      ratios[key] = ((v||v===0) && d) ? (v/d) : lvl.fallbackRatio;
    });
    function avg(keys){
      var present = keys.map(function(k){ return ratios[k]; }).filter(function(v){ return v||v===0; });
      if(!present.length) return lvl.fallbackRatio;
      return present.reduce(function(a,b){ return a+b; }, 0) / present.length;
    }
    ratios._upperPush = avg(["bench","strictPress","inclineDb10RM"]);
    ratios._upperPull = avg(["row8RM","chestRow8RM","latPulldown10RM"]);
    ratios._lowerBody = avg(["frontSquat","backSquat5RM","bulgarianDb"]);
    ratios._hinge     = avg(["hipThrust8RM","dbRdl"]);
    ratios._olympic   = avg(["powerClean"]);
    var allVals = Object.keys(ref).map(function(k){ return ratios[k]; }).filter(function(v){ return v||v===0; });
    ratios._overall = allVals.length ? (allVals.reduce(function(a,b){ return a+b; }, 0) / allVals.length) : lvl.fallbackRatio;
    return ratios;
  };

  // Applique un résultat calculé (computeFromAnswers) au profil ACTUELLEMENT
  // actif dans CoachProfiles. Doit être appelé uniquement depuis un gestionnaire
  // d'événement (jamais au chargement du script) car elle dépend d'app.js.
  api.applyToActiveProfile = function(meta, computed){
    if(typeof load === "function") load(); // s'assure que `state` correspond bien au profil actif
    if(!state.profile) state.profile = (typeof copy === "function" && typeof defaultProfile==="object") ? copy(defaultProfile) : {};
    Object.keys(computed.values).forEach(function(key){ state.profile[key] = computed.values[key]; });
    state.profile.name = meta.name;
    state.profile.experienceLevel = meta.experienceLevel;
    state.profile.bodyweightLb = meta.bodyweightLb || null;
    state.profile.aggressiveness = meta.aggressiveness;
    state.profile.competitionDateIso = meta.competitionDateIso || null;
    state.profile.scaleRatios = computed.ratios;

    // Ensemence aussi athleteState/movementRefs via le mécanisme PR déjà
    // existant dans app.js (onglet Profil/PR), pour démarrer cohérent partout.
    if(typeof PR_FIELD_MAP === "object" && typeof updateAthleteStateFromPR === "function" && typeof updateMovementRefFromPR === "function"){
      var dateStr = (typeof todayDateString === "function") ? todayDateString() : new Date().toLocaleDateString("fr-CA");
      Object.keys(PR_FIELD_MAP).forEach(function(id){
        var cfg = PR_FIELD_MAP[id];
        var val = computed.values[cfg.profile];
        if(val || val === 0){
          updateMovementRefFromPR(cfg, val, dateStr);
          updateAthleteStateFromPR(cfg, val, dateStr);
        }
      });
    }
    if(typeof save === "function") save();

    if(window.CoachProfiles && CoachProfiles.markOnboarded){
      CoachProfiles.markOnboarded(CoachProfiles.getActiveId(), {
        name: meta.name,
        experienceLevel: meta.experienceLevel,
        bodyweightLb: meta.bodyweightLb || null,
        aggressiveness: meta.aggressiveness
      });
    }
  };
})();

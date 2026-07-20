// Racine — logique d'intégration (onboarding) d'un nouvel utilisateur.
// Pur calcul, sans DOM. L'interface (assistant visuel) vit dans scripts/profiles/ui.js.
// Ce fichier charge AVANT app.js : il ne doit donc jamais appeler une fonction
// d'app.js (epley1RM, PR_FIELD_MAP, state, save()...) au
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

  // Les 5 tests guidés. Chaque test produit un 1RM de base (formule Epley,
  // identique à celle du moteur de charge) sur son mouvement "primaire" — le
  // mouvement réellement effectué. Toutes les autres valeurs de ce test en
  // dérivent, ce qui garde des ratios physiologiques que le test soit fait ou
  // non :
  //   - absoluteKeys  : même mouvement/famille d'implément (barre -> barre),
  //     simplement à un autre nombre de reps → 1RM ramené à ces reps (Epley).
  //   - ratioKeys     : un AUTRE mouvement barre lié au primaire par un
  //     coefficient de 1RM physiologique (ex. front squat ≈ 0.85 du back
  //     squat, power clean ≈ 0.65). On applique le coefficient au 1RM de base
  //     puis on convertit au nombre de reps de la clé. C'est ce qui évite les
  //     absurdités du passé (back squat = front squat, power clean ≈ squat).
  //   - proportionalKeys : variantes qui changent de famille d'implément
  //     (barre -> haltère unilatéral). L'échelle absolue en lb n'est pas
  //     comparable (un Bulgarian Split Squat haltère n'a rien à voir, en lb,
  //     avec un squat barre), donc on applique le RATIO du test à la valeur de
  //     référence plutôt que le 1RM absolu.
  api.TEST_PLAN = [
    {
      id: "squat",
      title: "Back Squat",
      subtitle: "Back Squat à la barre — le squat de référence.",
      guidance: "Échauffe-toi progressivement, puis fais UNE série de travail propre de 8 répétitions à RPE 7-8 (encore 2-3 reps en réserve). Pas de tentative maximale. Le front squat et le power clean sont estimés à partir de ce test.",
      primary: "backSquat5RM", primaryReps: 5,
      absoluteKeys: {},
      ratioKeys: { frontSquat: { coeff: 0.85, reps: 1 }, powerClean: { coeff: 0.65, reps: 1 } },
      proportionalKeys: ["bulgarianDb"]
    },
    {
      id: "bench",
      title: "Bench Press",
      subtitle: "Développé couché à la barre.",
      guidance: "Même logique : une série de travail propre de 8 répétitions à RPE 7-8.",
      primary: "bench", primaryReps: 1,
      absoluteKeys: {},
      ratioKeys: {},
      proportionalKeys: ["inclineDb10RM"]
    },
    {
      id: "press",
      title: "Strict Press",
      subtitle: "Développé épaules strict, debout, sans élan des jambes.",
      guidance: "Charge modérée, 8 répétitions propres à RPE 7-8.",
      primary: "strictPress", primaryReps: 1,
      absoluteKeys: {},
      ratioKeys: {},
      proportionalKeys: []
    },
    {
      id: "row",
      title: "Tirage horizontal",
      subtitle: "Barbell Row, Chest Supported Row ou équivalent.",
      guidance: "8 répétitions propres à RPE 7-8, dos neutre.",
      primary: "row8RM", primaryReps: 8,
      absoluteKeys: { chestRow8RM: 8 },
      ratioKeys: {},
      proportionalKeys: []
    },
    {
      // Test "reps seulement" : une traction lestée ne s'estime pas au 1RM à
      // partir d'un autre mouvement (un poids ajouté n'a aucune commune mesure).
      // On compte simplement les tractions au poids du corps ; le lestage se
      // règle plus tard à l'entraînement (le moteur de charge prend le relais).
      id: "pullups",
      title: "Tractions strictes",
      subtitle: "Au poids du corps, sans élan.",
      guidance: "Combien de tractions strictes propres peux-tu enchaîner ? On part du poids du corps ; le lestage viendra plus tard à l'entraînement.",
      repsOnly: true, storeRepsAs: "strictPullupReps"
    },
    {
      // Chaîne postérieure testée au DB RDL (haltères) : le Hip Thrust en est
      // dérivé PROPORTIONNELLEMENT et non au 1RM absolu — un hip thrust chargé
      // à la barre (~315) et un DB RDL aux haltères (~70) ne sont pas à la même
      // échelle de charge.
      id: "hinge",
      title: "Chaîne postérieure",
      subtitle: "DB RDL aux haltères (soulevé de terre jambes semi-tendues).",
      guidance: "8 répétitions propres à RPE 7-8, dos neutre. Le Hip Thrust est estimé à partir de ce test.",
      primary: "dbRdl", primaryReps: 8,
      absoluteKeys: {},
      ratioKeys: {},
      proportionalKeys: ["hipThrust8RM"]
    }
  ];

  // Protocole de test : nombre de répétitions FIXE. Une cible unique donne un
  // chiffre plus précis qu'une fourchette — c'est le RPE qui fait la différence
  // entre deux athlètes à la même charge.
  api.TEST_REPS = 8;

  // Base de référence de chaque valeur calculée, affichée sous les champs de
  // l'écran « Mouvements calculés » (mêmes conventions que les onglets PR/Réfs).
  api.REFERENCE_BASIS = {
    bench:            "1RM estimé",
    strictPress:      "1RM estimé",
    frontSquat:       "1RM estimé · dérivé du squat",
    powerClean:       "1RM estimé · dérivé du squat",
    backSquat5RM:     "5RM estimé",
    hipThrust8RM:     "8RM · dérivé du DB RDL",
    row8RM:           "8RM",
    chestRow8RM:      "8RM",
    bulgarianDb:      "lb par main",
    dbRdl:            "8RM · lb par main",
    inclineDb10RM:    "10RM · lb par main",
    strictPullupReps: "répétitions au poids du corps"
  };

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
    var ref = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : ((typeof defaultProfile === "object" && defaultProfile) ? defaultProfile : {});
    var values = {};
    var testRatio = {};

    api.TEST_PLAN.forEach(function(test){
      var a = answers[test.id];

      // Test "reps seulement" (ex. tractions au poids du corps) : aucune charge
      // dérivée, on stocke seulement le nombre de répétitions. Le lestage se
      // fera plus tard à l'entraînement.
      if(test.repsOnly){
        if(a && Number(a.reps) > 0 && test.storeRepsAs){
          values[test.storeRepsAs] = Math.round(Number(a.reps));
        }
        return;
      }

      // 1RM de base de ce test. Testé -> Epley sur la série saisie. Non testé
      // -> 1RM de l'athlète de référence pour le mouvement primaire, ramené au
      // niveau déclaré (fallbackRatio). Tout le reste du test dérive de ce
      // base1RM, donc les ratios entre mouvements restent physiologiques que le
      // test soit fait ou non.
      var base1RM = null;
      if(a && Number(a.weight) > 0 && Number(a.reps) > 0){
        // Le RPE entre dans l'estimation : une série à RPE 8 n'est pas une
        // série maximale. Les répétitions en réserve (10 − RPE, bornées à 4)
        // s'ajoutent aux reps faites avant Epley. RPE absent → RPE 8 supposé
        // (la consigne du test), soit 2 reps en réserve.
        var rpe = Number(a.rpe);
        var rir = (isFinite(rpe) && rpe >= 5 && rpe <= 10) ? Math.min(4, Math.max(0, 10 - rpe)) : 2;
        base1RM = epley(Number(a.weight), Number(a.reps) + rir);
      } else {
        var pd = ref[test.primary];
        if(pd || pd === 0) base1RM = epley(pd, test.primaryReps) * lvl.fallbackRatio;
      }
      if(!(base1RM > 0)) return;

      // 1. Mouvement primaire (le mouvement réellement effectué).
      values[test.primary] = round5(fromOneRM(base1RM, test.primaryReps));

      // 2. Variantes de même mouvement/famille d'implément (barre), à un autre
      //    nombre de reps : 1RM de base ramené à ces reps.
      Object.keys(test.absoluteKeys || {}).forEach(function(key){
        values[key] = round5(fromOneRM(base1RM, test.absoluteKeys[key]));
      });

      // 3. Autres mouvements barre liés par un coefficient de 1RM physiologique
      //    (front squat, power clean...). Coefficient appliqué au 1RM de base,
      //    puis conversion au nombre de reps de la clé.
      Object.keys(test.ratioKeys || {}).forEach(function(key){
        var rk = test.ratioKeys[key];
        values[key] = round5(fromOneRM(base1RM * rk.coeff, rk.reps || 1));
      });

      // Ratio représentatif de ce test (mouvement primaire vs référence) —
      // utilisé pour mettre à l'échelle les variantes haltère ci-dessous.
      var primaryDefault = ref[test.primary];
      if((values[test.primary] || values[test.primary] === 0) && primaryDefault){
        testRatio[test.id] = values[test.primary] / primaryDefault;
      }

      // 4. Variantes qui changent de famille d'implément (barre -> haltère
      //    unilatéral) : échelle absolue non comparable, donc mise à l'échelle
      //    proportionnelle au ratio du test plutôt que par 1RM absolu.
      var ratioForProportional = testRatio[test.id] || lvl.fallbackRatio;
      (test.proportionalKeys || []).forEach(function(key){
        var d = ref[key];
        if(d || d === 0) values[key] = round5(d * ratioForProportional);
      });
    });

    var ratios = api.ratiosFromValues(values, experienceLevel);
    return { values: values, ratios: ratios };
  };

  // Recalcule les ratios (mêmes règles que computeFromAnswers) à partir de
  // valeurs déjà connues — utilisé quand l'utilisateur édite manuellement ses
  // charges de départ à l'écran de revue, pour que la mise à l'échelle live
  // (state.profile.scaleRatios) reflète bien ses corrections.
  api.ratiosFromValues = function(values, experienceLevel){
    var lvl = api.EXPERIENCE_LEVELS[experienceLevel] || api.EXPERIENCE_LEVELS.intermediaire;
    var ref = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : ((typeof defaultProfile === "object" && defaultProfile) ? defaultProfile : {});
    var ratios = {};
    Object.keys(ref).forEach(function(key){
      var v = values[key], d = ref[key];
      // v > 0 : une valeur absente, nulle ou négative n'est pas une mesure —
      // un ratio 0 désactiverait le scaling en aval (coachApplyUserLoadScale)
      // et plomberait les moyennes de famille ci-dessous.
      ratios[key] = (v > 0 && d) ? (v/d) : lvl.fallbackRatio;
    });
    function avg(keys){
      var present = keys.map(function(k){ return ratios[k]; }).filter(function(v){ return v > 0; });
      if(!present.length) return lvl.fallbackRatio;
      return present.reduce(function(a,b){ return a+b; }, 0) / present.length;
    }
    ratios._upperPush = avg(["bench","strictPress","inclineDb10RM"]);
    ratios._upperPull = avg(["row8RM","chestRow8RM","latPulldown10RM"]);
    ratios._lowerBody = avg(["frontSquat","backSquat5RM","bulgarianDb"]);
    ratios._hinge     = avg(["hipThrust8RM","dbRdl"]);
    ratios._olympic   = avg(["powerClean"]);
    var allVals = Object.keys(ref).map(function(k){ return ratios[k]; }).filter(function(v){ return v > 0; });
    ratios._overall = allVals.length ? (allVals.reduce(function(a,b){ return a+b; }, 0) / allVals.length) : lvl.fallbackRatio;
    return ratios;
  };

  // Migration référence V2 « Athlète X » : les scaleRatios stockés ont été
  // calculés contre l'ancienne référence (dominante haut du corps). On les
  // recalcule contre la nouvelle à partir des valeurs de mouvement du profil —
  // ses valeurs à LUI ne changent pas, seule l'ancre de comparaison change.
  // Couvre aussi les profils sans ratios (ex. migration legacy Bertin) : leurs
  // valeurs existent, leurs ratios sont enfin calculés.
  api.migrateReferenceVersion = function(){
    try{
      if(typeof state !== "object" || !state.profile) return false;
      var target = (window.RacineProfileReference && RacineProfileReference.REFERENCE_VERSION) || 2;
      if(state.profile.referenceVersion === target) return false;
      var ref = RacineProfileReference.profile();
      var values = {};
      var found = 0;
      Object.keys(ref).forEach(function(k){
        var v = Number(state.profile[k]);
        if(isFinite(v) && v > 0){ values[k] = v; found++; }
      });
      // Au moins 3 repères connus, sinon on ne fabrique pas de ratios (le
      // fallback par niveau reste plus honnête qu'un calcul sur rien).
      if(found >= 3){
        state.profile.scaleRatios = api.ratiosFromValues(values, state.profile.experienceLevel);
      }
      state.profile.referenceVersion = target;
      if(typeof save === "function") save();
      if(window.CoachLog && CoachLog.info) CoachLog.info("reference_migration", {version: target, movementsFound: found});
      return true;
    }catch(e){
      if(window.CoachLog && CoachLog.error) CoachLog.error("reference_migration_failed", e, {});
      return false;
    }
  };

  // Applique un résultat calculé (computeFromAnswers) au profil ACTUELLEMENT
  // actif dans CoachProfiles. Doit être appelé uniquement depuis un gestionnaire
  // d'événement (jamais au chargement du script) car elle dépend d'app.js.
  api.applyToActiveProfile = function(meta, computed){
    if(typeof load === "function") load(); // s'assure que `state` correspond bien au profil actif
    if(!state.profile) state.profile = (typeof blankProfile === "function") ? blankProfile() : {};
    Object.keys(computed.values).forEach(function(key){ state.profile[key] = computed.values[key]; });
    state.profile.name = meta.name;
    state.profile.experienceLevel = meta.experienceLevel;
    state.profile.bodyweightLb = meta.bodyweightLb || null;
    state.profile.aggressiveness = meta.aggressiveness;
    state.profile.competitionDateIso = meta.competitionDateIso || null;
    state.profile.trainingGoal = (window.CoachSeasonGoals ? CoachSeasonGoals.normalize(meta.trainingGoal) : meta.trainingGoal) || null;
    state.profile.scaleRatios = computed.ratios;
    state.profile.referenceVersion = (window.RacineProfileReference && RacineProfileReference.REFERENCE_VERSION) || 2;

    // Ensemence movementRefs (référence de charge utilisée pour le scaling et
    // l'affichage), MAIS PLUS l'historique d'entraînement (athleteState.history).
    // Un repère de calibrage est un 1RM/5RM à bas reps : ce n'est pas une séance.
    // Le pousser dans l'historique faussait les suggestions en plage hypertrophie
    // — le moteur Brain le prenait pour une charge de travail récente et proposait
    // ~1RM pour des sets de 8-12 reps. Sans ce seed, le moteur repart de la charge
    // de base du programme, mise à l'échelle par scaleRatios : cohérente ET
    // adaptée à la plage de reps.
    if(typeof PR_FIELD_MAP === "object" && typeof updateMovementRefFromPR === "function"){
      var dateStr = (typeof todayDateString === "function") ? todayDateString() : new Date().toLocaleDateString("fr-CA");
      Object.keys(PR_FIELD_MAP).forEach(function(id){
        var cfg = PR_FIELD_MAP[id];
        var val = computed.values[cfg.profile];
        if(val || val === 0){
          updateMovementRefFromPR(cfg, val, dateStr, 8);
        }
      });
    }
    // Heals un profil calibré par une version précédente : retire les repères de
    // calibrage déjà semés dans l'historique (source "manual_recalibration"),
    // sans toucher aux vraies séances loggées ni aux PR max saisis (manual_pr).
    if(state.athleteState && state.athleteState.movements){
      Object.keys(state.athleteState.movements).forEach(function(mvKey){
        var mv = state.athleteState.movements[mvKey];
        if(mv && Array.isArray(mv.history)){
          mv.history = mv.history.filter(function(r){
            return !(r && r.planned && r.planned.source === "manual_recalibration");
          });
        }
      });
    }
    if(typeof save === "function") save();

    if(window.CoachProfiles && CoachProfiles.markOnboarded){
      CoachProfiles.markOnboarded(CoachProfiles.getActiveId(), {
        name: meta.name,
        experienceLevel: meta.experienceLevel,
        bodyweightLb: meta.bodyweightLb || null,
        aggressiveness: meta.aggressiveness,
        scaleRatios: computed.ratios,
        referenceVersion: "racine-reference-v2"
      });
    }
  };
})();

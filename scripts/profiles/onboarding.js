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
      defaultAggressiveness: 0.75,
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
      defaultAggressiveness: 1.20,
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
    // Bande de vraisemblance des composantes de moyenne : les clés de profil
    // mélangent des échelles absolues différentes (barre, haltère « par main »,
    // lest de traction). Une valeur saisie à la mauvaise échelle produit un
    // ratio individuel énorme (cas réel : dbRdl saisi ~185 lb à l'échelle
    // barre vs référence 75/main → ratio 2.45 → _hinge empoisonné → Deadlift
    // de programme 245 lb suggéré à 600 lb). Un ratio > 2 n'est pas un humain
    // plus fort, c'est une donnée à la mauvaise échelle : exclu de la moyenne,
    // la famille s'appuie sur les autres repères ou retombe sur le niveau.
    var fam = familyRatios(ratios, Object.keys(ref), lvl.fallbackRatio);
    Object.keys(fam).forEach(function(k){ ratios[k] = fam[k]; });
    return ratios;
  };

  // Règle des moyennes de famille, en un seul endroit : le calcul
  // (ratiosFromValues) et la réparation des ratios stockés
  // (migrateFamilyRatios) ne peuvent pas diverger.
  var RATIO_COMPONENT_MAX = 2.0;
  var FAMILY_KEYS = {
    _upperPush: ["bench","strictPress","inclineDb10RM"],
    _upperPull: ["row8RM","chestRow8RM","latPulldown10RM"],
    _lowerBody: ["frontSquat","backSquat5RM","bulgarianDb"],
    _hinge:     ["hipThrust8RM","dbRdl"],
    _olympic:   ["powerClean"]
  };
  function inBand(v){ return v > 0 && v <= RATIO_COMPONENT_MAX; }
  function familyRatios(ratios, componentKeys, fallback){
    function avg(keys){
      var present = keys.map(function(k){ return ratios[k]; }).filter(inBand);
      if(!present.length) return fallback;
      return present.reduce(function(a,b){ return a+b; }, 0) / present.length;
    }
    var out = {};
    Object.keys(FAMILY_KEYS).forEach(function(f){ out[f] = avg(FAMILY_KEYS[f]); });
    out._overall = avg(componentKeys);
    return out;
  }
  api.RATIO_COMPONENT_MAX = RATIO_COMPONENT_MAX;

  // Réparation des moyennes de famille STOCKÉES. Des profils calibrés avant la
  // bande RATIO_COMPONENT_MAX gardent des moyennes empoisonnées par une
  // composante à la mauvaise échelle (cas réel : latPulldown10RM = 140/20 = 7
  // → _upperPull 3,18, _overall 1,56), et migrateReferenceVersion ne repasse
  // jamais une fois referenceVersion posé. Pure : ne touche que les clés
  // `_famille` DÉJÀ stockées dont au moins une composante est connue, et
  // seulement si le profil porte une composante hors bande : un profil sain
  // n'est pas réécrit.
  // Les composantes (mesures de l'athlète) ne sont jamais modifiées.
  api.repairFamilyRatios = function(stored, experienceLevel){
    if(!stored || typeof stored !== "object") return {ratios: stored, changed: []};
    var lvl = api.EXPERIENCE_LEVELS[experienceLevel] || api.EXPERIENCE_LEVELS.intermediaire;
    var ref = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : {};
    var componentKeys = Object.keys(ref).filter(function(k){ return Number(stored[k]) > 0; });
    var aberrant = componentKeys.some(function(k){ return !inBand(Number(stored[k])); });
    if(!aberrant) return {ratios: stored, changed: []};
    var nums = {};
    componentKeys.forEach(function(k){ nums[k] = Number(stored[k]); });
    var fam = familyRatios(nums, componentKeys, lvl.fallbackRatio);
    var out = Object.assign({}, stored), changed = [];
    Object.keys(fam).forEach(function(f){
      if(!(f in stored)) return;
      var keys = f === "_overall" ? componentKeys : FAMILY_KEYS[f];
      if(!keys.some(function(k){ return nums[k] > 0; })) return;
      if(Math.abs((Number(stored[f]) || 0) - fam[f]) > 1e-9){ out[f] = fam[f]; changed.push(f); }
    });
    return {ratios: changed.length ? out : stored, changed: changed};
  };

  // Saisie d'UN repère de calibration après l'onboarding (onglet Charge).
  // Met à jour la valeur, son ratio, et seulement les moyennes qui la
  // contiennent (sa famille + _overall), avec la même règle que le calcul :
  // une valeur hors bande est enregistrée (avertissement non bloquant) mais
  // exclue des moyennes, et ignorée par le moteur (scaling.js). Sans ratios
  // stockés (profil non calibré), seule la valeur est écrite.
  //
  // V5.3.3 — chaque saisie est datée dans `state.profile.calibrationLog[key]`
  // (clé OPTIONNELLE : un profil ou un export qui ne l'a pas reste valide, et
  // une version antérieure l'ignore). Elle garde aussi la valeur et le ratio
  // d'avant, pour que la saisie soit annulable (undoCalibrationValue), et la
  // date sert à calibrationGaps() : une preuve n'est « plus récente » que si
  // l'on sait quand la calibration a été posée.
  // meta.source : d'où vient la valeur (texte court, affiché dans la note).
  api.setCalibrationValue = function(key, value, meta){
    if(typeof state !== "object" || !state.profile) return null;
    var ref = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : {};
    var d = Number(ref[key]), v = Number(value);
    if(!(d > 0) || !(v > 0)) return null;
    var log = state.profile.calibrationLog;
    var prior = (log && typeof log === "object") ? log[key] : null;
    var stored = state.profile.scaleRatios;
    var entry = {
      date: todayIso(), value: v,
      previous: Number(state.profile[key]) > 0 ? Number(state.profile[key]) : null,
      previousRatio: (stored && Number(stored[key]) > 0) ? Number(stored[key]) : null,
      source: String((meta && meta.source) || "")
    };
    if(prior && typeof prior === "object"){
      entry.prior = Object.assign({}, prior);
      delete entry.prior.prior;
    }
    var res = writeCalibration(key, v, v / d);
    if(!state.profile.calibrationLog || typeof state.profile.calibrationLog !== "object") state.profile.calibrationLog = {};
    state.profile.calibrationLog[key] = entry;
    if(typeof save === "function") save();
    return res;
  };

  // Annule la dernière saisie d'une clé : valeur ET ratio d'avant, mêmes
  // familles recalculées, et la date de calibration redevient celle d'avant
  // (sinon un signal annulé ne reviendrait jamais).
  api.undoCalibrationValue = function(key){
    if(typeof state !== "object" || !state.profile) return null;
    var log = state.profile.calibrationLog;
    var entry = (log && typeof log === "object") ? log[key] : null;
    if(!entry || !(Number(entry.previous) > 0)) return null;
    var ref = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : {};
    var d = Number(ref[key]);
    if(!(d > 0)) return null;
    var prevRatio = Number(entry.previousRatio) > 0 ? Number(entry.previousRatio) : Number(entry.previous) / d;
    var res = writeCalibration(key, Number(entry.previous), prevRatio);
    if(entry.prior && typeof entry.prior === "object") log[key] = entry.prior;
    else delete log[key];
    if(typeof save === "function") save();
    return res;
  };

  function todayIso(){
    try{ if(typeof todayIsoDate === "function") return String(todayIsoDate()).slice(0, 10); }catch(e){}
    var t = new Date();
    return t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
  }

  // Écriture commune de setCalibrationValue / undoCalibrationValue : la
  // valeur, son ratio, et seulement les moyennes qui la contiennent.
  function writeCalibration(key, v, ratio){
    var ref = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : {};
    state.profile[key] = v;
    function apply(stored, level){
      if(!stored || typeof stored !== "object") return stored;
      var lvl = api.EXPERIENCE_LEVELS[level] || api.EXPERIENCE_LEVELS.intermediaire;
      var out = Object.assign({}, stored);
      out[key] = ratio;
      var keys = Object.keys(ref).filter(function(k){ return Number(out[k]) > 0; });
      var nums = {};
      keys.forEach(function(k){ nums[k] = Number(out[k]); });
      var fam = familyRatios(nums, keys, lvl.fallbackRatio);
      Object.keys(FAMILY_KEYS).forEach(function(f){
        if(FAMILY_KEYS[f].indexOf(key) >= 0 && (f in out)) out[f] = fam[f];
      });
      if("_overall" in out) out._overall = fam._overall;
      return out;
    }
    state.profile.scaleRatios = apply(state.profile.scaleRatios, state.profile.experienceLevel);
    try{
      var reg = (window.CoachProfiles && CoachProfiles.getActive) ? CoachProfiles.getActive() : null;
      if(reg && reg.scaleRatios) CoachProfiles.update(reg.id, {scaleRatios: apply(reg.scaleRatios, reg.experienceLevel || state.profile.experienceLevel)});
    }catch(e){}
    return {value: v, ratio: ratio, outOfBand: !inBand(ratio)};
  }

  // ─── Calibration dépassée par ce que l'athlète a démontré (V5.3.3) ───────
  // LECTURE SEULE. Les trophées 1RM n'écrivent jamais une clé de calibration
  // (V5.2.2, voulu). Conséquence : une calibration peut rester figée sous les
  // records de l'athlète sans que rien ne le dise — cas réel : Back Squat 5RM
  // calibré 235 lb, 300 × 1 démontré le 28 sept. Cette fonction le DIT ; elle
  // ne corrige rien. La correction passe par un geste confirmé de l'athlète
  // (setCalibrationValue), jamais par ici.
  //
  // Aucune nouvelle couche de calcul : la preuve est ramenée aux reps de la
  // clé par coachRefAtTargetReps (Epley, même conversion que V5.2.4), le
  // contexte est jugé par coachHistoryContextIsLimited (même filtre que la
  // progression), l'arrondi vient de roundLoadForExercise.
  //
  // Asymétrie voulue : une série sous-maximale prouve « au moins », jamais
  // « au plus ». Elle peut donc montrer qu'une calibration est dépassée, mais
  // seule une tentative quasi maximale (record, RPE ≥ 9) peut montrer qu'une
  // calibration est au-dessus du réel — et même là, rien n'est proposé à la
  // baisse : une blessure ou un deload expliquent un creux.
  var STALE_CALIBRATION_MIN_GAIN = 0.05;   // écart minimal, en fraction de la calibration
  var STALE_CALIBRATION_MAX_PROOF_REPS = 12; // au-delà, Epley ne prouve plus rien
  // Une preuve ne vaut que pour une clé PROCHE de ses reps. Cas réel qui l'a
  // imposé : 300 × 1 @9,5 « prouvait » un 5RM de 266 lb, alors que les séries
  // de 5 du même athlète (215 × 5 @8, 220 × 3 @8) disent ≈ 225-230. Un single
  // réussi est surtout technique et nerveux : Epley l'étire mal vers 5 reps.
  // Un single prouve un 1RM ; un 5RM se prouve entre 2 et 8 reps.
  var STALE_CALIBRATION_REP_WINDOW = 3;
  // Reps en réserve lues sur le RPE (RPE 8 ≈ 2 en réserve, la convention de
  // reference.js), plafonnées : sous RPE 6, l'estimation ne veut plus rien dire.
  var STALE_CALIBRATION_MAX_RIR = 4;
  var STALE_CALIBRATION_NEAR_MAX_RPE = 9;  // une série « au plus » doit être quasi maximale
  api.STALE_CALIBRATION_MIN_GAIN = STALE_CALIBRATION_MIN_GAIN;

  var MONTHS_SHORT = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  function isoDay(v){ var m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ""; }
  function shortDate(iso){
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? Number(m[3]) + " " + MONTHS_SHORT[Number(m[2]) - 1] : "";
  }
  function trophyFields(){ return (typeof TROPHY_FIELDS !== "undefined" && Array.isArray(TROPHY_FIELDS)) ? TROPHY_FIELDS : []; }
  // Libellé de l'onglet Charge (REFERENCE_MOVEMENTS) : `movements[mvKey].name`
  // n'est pas fiable ici (chestRow y porte le nom « Barbell Row »).
  function movementLabel(cfg){
    try{
      if(cfg.mvKey && typeof REFERENCE_MOVEMENTS !== "undefined" && Array.isArray(REFERENCE_MOVEMENTS)){
        for(var i = 0; i < REFERENCE_MOVEMENTS.length; i++) if(REFERENCE_MOVEMENTS[i].mvKey === cfg.mvKey) return String(REFERENCE_MOVEMENTS[i].label);
      }
    }catch(e){}
    return String(cfg.label || cfg.profile);
  }
  // Le trophée qui parle du même mouvement : miroir direct (scaleKey) ou
  // single du même nom exact (Back Squat 1RM ↔ backSquat5RM).
  function trophyFor(cfg, label){
    var list = trophyFields();
    for(var i = 0; i < list.length; i++) if(list[i].scaleKey === cfg.profile) return list[i];
    if(typeof trophyFieldForSingle === "function"){ try{ return trophyFieldForSingle(label) || null; }catch(e){} }
    return null;
  }
  function rawRows(label){
    if(typeof athleteMovementRecord !== "function") return [];
    var mv = null;
    try{ mv = athleteMovementRecord(label); }catch(e){ mv = null; }
    return (mv && Array.isArray(mv.history)) ? mv.history : [];
  }
  function rowLoad(r){ return (typeof coachHistoryLoadNumber === "function") ? coachHistoryLoadNumber(r) : (Number(r && r.load) || 0); }
  // Contexte limité (technique, léger, WOD, récupération), test raté ou
  // copie à poids réduit : jamais une preuve (règle V5.2.34).
  function rowExcluded(r){
    if(!r) return true;
    if(String(r.status || "").toLowerCase() === "fail") return true;
    if(typeof coachHistoryWeight === "function" && coachHistoryWeight(r) < 1) return true;
    return (typeof coachHistoryContextIsLimited === "function") ? !!coachHistoryContextIsLimited(r) : false;
  }
  // Calibration posée quand ? Saisie datée, sinon trophée miroir de MÊME
  // valeur (c'est alors lui qui a posé la valeur), sinon création du profil
  // (saisie initiale à l'onboarding). Sans date : on ne prétend rien.
  function calibrationSince(key, p, calibrated, reg){
    var log = p.calibrationLog && p.calibrationLog[key];
    if(log && isoDay(log.date)) return {date: isoDay(log.date), basis: "saisie"};
    var list = trophyFields();
    for(var i = 0; i < list.length; i++){
      if(list[i].scaleKey !== key) continue;
      var rec = p.records && p.records[list[i].key];
      if(rec && isoDay(rec.date) && Math.abs(Number(rec.value) - calibrated) < 1) return {date: isoDay(rec.date), basis: "record"};
    }
    if(reg && isoDay(reg.createdAt)) return {date: isoDay(reg.createdAt), basis: "saisie initiale"};
    return {date: "", basis: "inconnue"};
  }
  function collectProofs(cfg, label, reps, p){
    var raw = rawRows(label), proofs = [];
    // Un record ou une référence n'a pas de contexte propre : on relit la
    // séance du même jour à la même charge. Si elle était limitée, la preuve
    // tombe avec elle.
    function sessionExcluded(date, load){
      return raw.some(function(r){
        return isoDay(r.date || r.actualDate) === date && Math.abs(rowLoad(r) - load) < 0.01 && rowExcluded(r);
      });
    }
    function add(load, r, date, source, rpe){
      load = Number(load); r = Number(r); rpe = Number(rpe) || 0;
      if(!(load > 0) || !(r > 0) || r > STALE_CALIBRATION_MAX_PROOF_REPS || !date) return;
      if(Math.abs(r - reps) > STALE_CALIBRATION_REP_WINDOW) return;
      // Reps possibles = reps faites + reps en réserve. RPE absent : aucune
      // réserve supposée (lecture prudente, jamais gonflée).
      var rir = (rpe > 0 && rpe < 10) ? Math.min(STALE_CALIBRATION_MAX_RIR, 10 - rpe) : 0;
      var at = (typeof coachRefAtTargetReps === "function") ? coachRefAtTargetReps(load, r + rir, reps) : null;
      if(!at || !(Number(at.load) > 0)) return;
      proofs.push({load: load, reps: r, date: date, source: source, rpe: rpe, at: Number(at.load)});
    }
    var tf = trophyFor(cfg, label);
    var rec = tf && p.records ? p.records[tf.key] : null;
    if(rec && (!rec.unit || rec.unit === "lb") && isoDay(rec.date) && !sessionExcluded(isoDay(rec.date), Number(rec.value))){
      add(rec.value, 1, isoDay(rec.date), "record", 10);
    }
    var ref = (cfg.mvKey && state.movementRefs) ? state.movementRefs[cfg.mvKey + "__strength"] : null;
    if(ref && !ref.implausible && String(ref.status || "").toLowerCase() !== "fail" && isoDay(ref.date)
       && !sessionExcluded(isoDay(ref.date), Number(ref.load))){
      add(ref.load, ref.reps, isoDay(ref.date), "référence", ref.rpe);
    }
    var kept = (typeof coachFilterHistoryForProgression === "function") ? coachFilterHistoryForProgression(raw, null) : raw;
    kept.forEach(function(r){
      if(rowExcluded(r)) return;
      add(rowLoad(r), r.reps || r.actualReps, isoDay(r.date || r.actualDate), "séance", r.rpe);
    });
    return proofs;
  }
  function gapText(g){
    var pr = g.proof;
    var base = g.title + " : calibré " + g.calibrated + " lb · démontré ≈ " + g.demonstrated + " lb ("
      + pr.load + " × " + pr.reps + (pr.rpe > 0 && pr.rpe < 10 ? " @" + String(pr.rpe).replace(".", ",") : "") + ", " + shortDate(pr.date) + ")";
    if(g.kind === "above") return base + " — calibration au-dessus de la dernière tentative maximale ; rien n'est proposé à la baisse.";
    if(!(g.proposed > 0)) return base + " — la valeur démontrée sortirait de la bande de confiance : rien n'est proposé.";
    return base;
  }

  // Liste des écarts, une entrée par clé de calibration concernée.
  //   kind "stale" : la calibration est dépassée par une preuve plus récente
  //                  (proposed = valeur arrondie au rack, ou null hors bande) ;
  //   kind "above" : la calibration dépasse la dernière tentative quasi
  //                  maximale — montré, jamais proposé.
  api.calibrationGaps = function(){
    var out = [];
    try{
      if(typeof state !== "object" || !state || !state.profile) return out;
      if(typeof PR_FIELD_MAP !== "object" || !PR_FIELD_MAP) return out;
      var p = state.profile;
      var refProfile = (window.RacineProfileReference && RacineProfileReference.profile) ? RacineProfileReference.profile() : {};
      var reg = null;
      try{ reg = (window.CoachProfiles && CoachProfiles.getActive) ? CoachProfiles.getActive() : null; }catch(e){ reg = null; }
      Object.keys(PR_FIELD_MAP).forEach(function(id){
        var cfg = PR_FIELD_MAP[id], key = cfg && cfg.profile;
        var d = Number(refProfile[key]);
        if(!key || !(d > 0)) return;
        var label = movementLabel(cfg);
        // Un lest sur le poids du corps ne se convertit pas par Epley
        // (historique.js, bodyweightExternalLoadPatterns).
        if(typeof coachIsBodyweightExternalLoadMovement === "function" && coachIsBodyweightExternalLoadMovement(label, null)) return;
        var reps = Number(cfg.reps) || 1;
        // Ce que le moteur utilise vraiment : le ratio stocké, s'il est une
        // mesure. La valeur affichée peut avoir divergé (miroir de trophée).
        var r = p.scaleRatios ? Number(p.scaleRatios[key]) : 0;
        var calibrated = (r > 0 && inBand(r)) ? r * d : Number(p[key]);
        if(!(calibrated > 0)) return;
        var since = calibrationSince(key, p, calibrated, reg);
        if(!since.date) return;
        var newer = collectProofs(cfg, label, reps, p).filter(function(pr){ return pr.date > since.date; });
        if(!newer.length) return;
        var best = newer.reduce(function(a, b){ return b.at > a.at ? b : a; });
        var gap = {
          key: key, label: label, reps: reps, title: label + " " + reps + "RM",
          calibrated: Math.round(calibrated), since: since,
          demonstrated: Math.round(best.at), proof: best,
          gain: best.at / calibrated - 1, proposed: null, proposedRatio: null
        };
        if(gap.gain > STALE_CALIBRATION_MIN_GAIN){
          gap.kind = "stale";
          var rounded = (typeof roundLoadForExercise === "function") ? roundLoadForExercise(label, best.at, "down") : Math.floor(best.at / 5) * 5;
          // Le rack ne sait pas l'exprimer (50 → 53 lb d'haltère) : rien à dire.
          if(!(rounded > calibrated)) return;
          if(inBand(rounded / d)){ gap.proposed = rounded; gap.proposedRatio = rounded / d; }
        }else{
          var maxes = newer.filter(function(pr){ return pr.rpe >= STALE_CALIBRATION_NEAR_MAX_RPE; });
          if(!maxes.length) return;
          var top = maxes.reduce(function(a, b){ return b.at > a.at ? b : a; });
          if(!(top.at / calibrated - 1 < -STALE_CALIBRATION_MIN_GAIN)) return;
          gap.kind = "above"; gap.proof = top; gap.demonstrated = Math.round(top.at); gap.gain = top.at / calibrated - 1;
        }
        gap.text = gapText(gap);
        out.push(gap);
      });
    }catch(e){
      if(window.CoachLog && CoachLog.error) CoachLog.error("calibration_gaps_failed", e, {});
    }
    return out;
  };

  // Phrase du (!) : seulement quand la charge affichée EST la charge du
  // programme mise à l'échelle par un ratio qui contient une clé dépassée.
  // Elle relit la même porte que le moteur (coachScaleProgramLoad, comme
  // trace.js) — aucune autre charge n'est calculée ni proposée.
  api.calibrationNoteFor = function(label, programLoad, shownLoad){
    try{
      var gaps = api.calibrationGaps().filter(function(g){ return g.kind === "stale"; });
      if(!gaps.length || typeof coachUserLoadRatioSource !== "function" || typeof coachScaleProgramLoad !== "function") return "";
      var programNum = (typeof parseLoad === "function") ? parseLoad(programLoad) : Number(programLoad);
      var shown = (typeof parseLoad === "function") ? parseLoad(shownLoad) : Number(shownLoad);
      if(!(programNum > 0) || !(shown > 0)) return "";
      var src = coachUserLoadRatioSource(label) || {};
      var hit = gaps.filter(function(g){
        if(src.source === g.key || src.source === "_overall") return true;
        return !!(FAMILY_KEYS[src.source] && FAMILY_KEYS[src.source].indexOf(g.key) >= 0);
      })[0];
      if(!hit) return "";
      var hasHist = rawRows(label).some(function(r){
        return (typeof coachHistoryHasValidLoad === "function") ? coachHistoryHasValidLoad(r, label, null) : rowLoad(r) > 0;
      });
      var scaled = coachScaleProgramLoad(label, programNum, hasHist);
      if(!scaled || Number(scaled.load) !== Number(shown)) return "";
      return "Cette charge vient du programme mis à ton échelle par un ratio qui s'appuie sur "
        + hit.title + " = " + hit.calibrated + " lb, alors que tu as démontré ≈ " + hit.demonstrated + " lb ("
        + hit.proof.load + " × " + hit.proof.reps + ", " + shortDate(hit.proof.date) + "). "
        + (hit.proposed ? "La mise à jour à " + hit.proposed + " lb se fait dans Calibration du moteur, sur ton accord." : "");
    }catch(e){ return ""; }
  };

  // Migration au chargement, idempotente : un second passage ne trouve plus
  // rien à changer. Répare la copie de travail (state.profile) ET la copie du
  // registre, qui sert de source de resynchronisation (scaling.js).
  api.migrateFamilyRatios = function(){
    try{
      if(typeof state !== "object" || !state.profile) return false;
      var lvl = state.profile.experienceLevel;
      var fix = api.repairFamilyRatios(state.profile.scaleRatios, lvl);
      if(fix.changed.length){
        state.profile.scaleRatios = fix.ratios;
        if(typeof save === "function") save();
      }
      var reg = (window.CoachProfiles && CoachProfiles.getActive) ? CoachProfiles.getActive() : null;
      var regFix = reg ? api.repairFamilyRatios(reg.scaleRatios, reg.experienceLevel || lvl) : {changed: []};
      if(regFix.changed.length) CoachProfiles.update(reg.id, {scaleRatios: regFix.ratios});
      if((fix.changed.length || regFix.changed.length) && window.CoachLog && CoachLog.info){
        CoachLog.info("family_ratio_repair", {state: fix.changed, registry: regFix.changed});
      }
      return !!(fix.changed.length || regFix.changed.length);
    }catch(e){
      if(window.CoachLog && CoachLog.error) CoachLog.error("family_ratio_repair_failed", e, {});
      return false;
    }
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

    // Programme choisi dans le formulaire. On l'active comme cycle courant plutôt
    // que de laisser le défaut codé en dur (jadis shoulders3d, un programme privé
    // que la plupart des profils ne peuvent pas ouvrir). Si le formulaire n'a rien
    // fourni (compat), on retombe sur le premier programme accessible.
    var chosenProgram = meta.programId || (typeof defaultCycleGoal === "function" ? defaultCycleGoal() : (state.cycle && state.cycle.goal));
    if(chosenProgram && state.cycle){
      state.cycle.goal = chosenProgram;
      state.missingCycle = null;
      state.week = 1;
      var prog = (window.focusConfigs && window.focusConfigs[chosenProgram]) || null;
      state.day = (prog && Array.isArray(prog.days) && prog.days[0]) || "lundi";
      state.activeCycleStartDate = (typeof nowIso === "function") ? nowIso() : new Date().toISOString();
    }
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

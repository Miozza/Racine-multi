// @ts-check
// Coach Beurt - moteur de suggestions de charges.
// Script global volontaire : pas de ES modules.

// ─── Pipeline de suggestion de charge ──────────────────────────────────────
// guardedSuggestedLoadDecision() construit un etat partage (ctx), puis
// applique une sequence de regles nommees dans un ordre volontaire : une
// regle plus bas dans la liste peut resserrer OU remonter ce qu'une regle
// plus haut a decide (cascade assumee, pas un pipeline "premier qui matche
// gagne"). Ordre et raison de chaque regle :
//
//  1. coachRuleContextLimited            — contexte technique/wod/light : pas d'auto-progression.
//  2. coachRuleReferenceDeTravail        — aucun historique reel : rampe periodisee sous le RM, pas le max theorique.
//  3. coachRuleLiftFromControlledHistory — programme sous l'historique reel controle : remonte (borne).
//  4. coachRuleReferenceReelleValidee    — reference reelle plus haute deja validee : repart de la, pas de l'ancienne suggestion.
//  5. coachRuleHistorySignalAdjustment   — tendance recente (stalled/blocked/watch) : plafonne ou avertit.
//  5b. coachRuleKalmanBlend             — mode blend : melange vers la capacite estimee (scripts/charge/kalman.js), avant tous les garde-fous.
//  6. coachRuleLastSetGuards             — dernier set reel : saut max prudent, hausse graduelle, freins RPE >=8.5/>=9, projection Epley si ecart de reps.
//  6b. coachRuleRepSurplusLift           — reps DEPASSEES : projection Epley vers le HAUT (symetrique de la reduction du point 6).
//  6c. coachRuleSpeedStimulusBand        — bloc vitesse : derive lente vers le pourcentage cible du bloc, dans les deux sens.
//  7. coachRuleRecentHardBrake           — RPE eleve recent non resolu par une reference plus haute depuis : bloque.
//  7b. coachRuleKalmanTestGate          — mode blend, jour de test 1RM : porte a 90 % de l'e1RM estime (scripts/charge/kalman.js).
//  8. coachRuleFloorValidation           — plancher : un dernier set reellement reussi n'est jamais sous-suggere (dernier mot, place apres les freins).
//  8b. coachRuleCeilingCap               — plafond deduit (pointe stable + effort eleve) ou manuel : la charge ne monte plus, la progression passe par les reps (scripts/charge/ceiling.js).
//  9. coachRuleAthleteStateCap           — mouvement sous surveillance dans athlete_state : cap jusqu'a confirmation.
// 10. coachRuleDeloadCap                 — semaine 6 / contexte recuperation : cap a 80-85% de la derniere reference fiable.
// 11. coachRuleRoundingAndMovementCap    — arrondi equipement + cap de progression specifique au mouvement (MOVEMENT_PROGRESSION_CAPS).
// 12. coachRuleContextLimitedRounding    — re-clamp final si contexte limite malgre l'arrondi.
//
// Puis coachFinalizeSuggestionDecision() construit l'objet decision, applique
// le Brain stats gate, et journalise la source de la suggestion.

function guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps,context){
  var built=coachBuildSuggestionContext(nameOrKey,currentLoad,targetReps,context);
  if(built.early)return built.decision;
  var ctx=built.ctx;
  // Capacite estimee (scripts/charge/kalman.js). Lue une fois, attachee a ctx
  // seulement : en mode shadow, rien de ce qui suit n'y touche et la decision
  // reste identique bit a bit. Module absent ou en erreur : ctx.kalman reste
  // nul et le moteur se comporte exactement comme avant.
  ctx.kalman=null;
  try{
    if(window.CoachKalman&&typeof CoachKalman.forSuggestion==='function')ctx.kalman=CoachKalman.forSuggestion(ctx)||null;
  }catch(e){ctx.kalman=null;}

  coachRuleUnprovenScaleWatch(ctx);
  coachRuleProgramScaleGuard(ctx);
  coachRuleContextLimited(ctx);
  coachRuleReferenceDeTravail(ctx);
  coachRuleLiftFromControlledHistory(ctx);
  coachRuleReferenceReelleValidee(ctx);
  coachRuleHistorySignalAdjustment(ctx);
  // Mode blend seulement : melange vers la capacite estimee, AVANT le saut
  // max, les freins RPE, les plafonds et l'arrondi.
  coachKalmanRule('coachRuleKalmanBlend',ctx);
  coachRuleLastSetGuards(ctx);
  coachRuleRepSurplusLift(ctx);
  coachRuleRepSurplusHold(ctx);
  coachRuleSpeedStimulusBand(ctx);
  coachRuleRecentHardBrake(ctx);
  // Mode blend, jour de test 1RM : porte a gatePct x e1RM, avant le plancher,
  // les plafonds, les caps et l'arrondi.
  coachKalmanRule('coachRuleKalmanTestGate',ctx);
  coachRuleFloorValidation(ctx);
  if(typeof coachRuleCeilingCap==='function')coachRuleCeilingCap(ctx);
  coachRuleAthleteStateCap(ctx);
  coachRuleDeloadCap(ctx);
  coachRuleRoundingAndMovementCap(ctx);
  coachRuleContextLimitedRounding(ctx);
  coachRuleWrittenCeilingCap(ctx);
  coachRuleProgramRampFloor(ctx);
  // En dernier, et c'est le point : cette regle AJOUTE une phrase a la raison
  // finale. Placee en tete, elle etait effacee par la premiere regle qui
  // reecrivait `reason` — coachRuleContextLimited, justement le cas ou
  // l'historique pondere est le plus frequent.
  coachRuleWeightedHistoryWatch(ctx);

  return coachFinalizeSuggestionDecision(ctx);
}

// Regle Kalman, appelee de facon defensive : absente, ou en erreur, elle ne
// laisse aucune trace — la regle elle-meme calcule avant d'ecrire, et ses
// seules ecritures sont restaurees si elle leve une exception.
function coachKalmanRule(name,ctx){
  var fn=window[name];
  if(!ctx||!ctx.kalman||typeof fn!=='function')return;
  var saved={suggested:ctx.suggested,mode:ctx.mode,reason:ctx.reason,severity:ctx.severity,brainAdjusted:ctx.brainAdjusted};
  try{fn(ctx);}catch(e){
    Object.keys(saved).forEach(function(k){ctx[k]=saved[k];});
    ctx.kalman=null;
  }
}

function athleteSuggestedLoad(nameOrKey, currentLoad, targetReps, context){
  return guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps,context).loadText;
}
window.coachSafeSuggestedLoad=function(nameOrKey,currentLoad,targetReps,context){
  var base = guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps,context);

  // ── Moteur Brain V1.16 ────────────────────────────────────────────────────
  // Couche 1 : Règles RPE (delta de base — baisse contrôlée autorisée si RPE≥9×2)
  // Couche 2 : Moyenne mobile — signal de confiance/prudence (base = lastLoad)
  // Couche 3 : Tendance récente de progression (≥3 séances — pas de la vélocité VBT)
  // Couche 4 : Signal de cohérence (recalibrage si dépassement systématique)
  // Deload   : -20% principal / -25% accessoire / -30% technique
  // Contexte technique/wod/light = ignoré
  try{
    var baseNum = base.loadNum;
    if(!baseNum || baseNum <= 0) return base.loadText;

    var label = base.label || nameOrKey;
    // Capacite estimee : coachFinalizeSuggestionDecision vient de l'attacher a
    // l'indice de CETTE decision (nulle en mode off). Les re-stockages plus bas
    // (deload, couche Brain, portail stats) ecrivent un payload neuf : sans
    // cette relecture, le (!) perdait sa section « Capacite estimee » des que
    // la couche Brain repassait. Relue une fois, reattachee, jamais recalculee.
    var hintKey = (typeof coachNormalizeMoveText==='function') ? coachNormalizeMoveText(label) : '';
    var baseHint = (hintKey && window.__coachLoadHints) ? window.__coachLoadHints[hintKey] : null;
    var baseKalman = (baseHint && baseHint.kalman) ? baseHint.kalman : null;
    // Instantane des indices tels que le moteur principal les a laisses : le
    // portail stats ci-dessous re-stocke un indice AVANT le plafond de
    // capacite. Sans restauration, l'ecran gardait la charge du moteur et le
    // (!) expliquait celle que le plafond venait de refuser.
    var hintsBefore = window.__coachLoadHints ? Object.assign({}, window.__coachLoadHints) : null;
    var mv = (typeof athleteMovementRecord==='function') ? athleteMovementRecord(label) : null;
    var histAll = (mv && Array.isArray(mv.history)) ? mv.history : [];
    if(!histAll.length) return base.loadText;

    var ctx = (context&&context.label)?context:((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(nameOrKey,context||{}):null);
    var isLimited = (typeof coachIsLimitedProgressionContext==='function') ? coachIsLimitedProgressionContext(ctx) : false;
    if(isLimited) return base.loadText;

    // Brain raffine une progression normale ; il ne doit jamais DEFAIRE un frein.
    // Quand la pile de regles a deja pose un avertissement (cap
    // recalibrating/watch, RPE haut repete, echec), sa decision fait foi.
    // Sans ce garde-fou, un echec total cappe a 175 lb par
    // guardedSuggestedLoadDecision() ressortait a 220 lb apres la couche Brain —
    // exactement la charge qui venait d'echouer. Le frein doit survivre au
    // raffinement.
    if(base.severity==='warning'||base.severity==='critical') return base.loadText;

    var isDeload = (typeof coachIsDeloadWeekOrContext==='function') ? coachIsDeloadWeekOrContext(ctx) : false;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function rowLoad(r){ return Number(r && (r.load || r.externalLoad)) || 0; }
    function rowRpe(r){  return Number(r && r.rpe) || 0; }
    function rowReps(r){ return Number(r && (r.reps || r.actualReps)) || 0; }
    function isDeloadRow(r){ return (typeof coachBrainIsDeloadRow==='function') ? coachBrainIsDeloadRow(r) : !!(r && (r.context === 'deload' || r.status === 'deload' || (r.planned && r.planned.deload))); }

    // Filtrer l'historique : on exclut les séances deload ET les repères de
    // calibrage (source "manual_recalibration" = 1RM/5RM semé à l'onboarding).
    // Un repère de calibrage n'est pas une charge de travail : le laisser piloter
    // la progression faisait suggérer ~1RM pour des sets de 8-12 reps.
    function isCalibrationSeed(r){ return (typeof coachIsNonPerformanceSeed==='function')?coachIsNonPerformanceSeed(r):!!(r&&r.planned&&(r.planned.source==='manual_recalibration'||r.planned.source==='manual_charge_override')); }
    // Même filtre de vraisemblance que guardedSuggestedLoadDecision : sans ça,
    // une charge invraisemblable (typo de saisie) reste dans l'historique lu
    // ici et corrompt la moyenne mobile / tendance du moteur Brain V1.16
    // ci-dessous, même si `base` (guardedSuggestedLoadDecision) l'ignore.
    function isImplausible(r){ return (typeof coachIsImplausibleLoadRow==='function') && coachIsImplausibleLoadRow(label,r,Number(targetReps)||8); }

    // Meme historique que le moteur principal. Cette couche relisait
    // l'historique BRUT : un test 300 x 1 @9,5 apres des doubles de vitesse
    // devenait la base d'un 5 x 3 a RPE 8 et sortait a 305 lb, quand le moteur
    // proposait 220. Trois filtres, aucun reecrit ici :
    //  1. nature de contexte — coachFilterHistoryForProgression(), le filtre
    //     du moteur principal (motif « Nature de contexte differente » de la
    //     trace). Une ligne admise a poids reduit (repli quand aucune ligne de
    //     meme nature n'existe) aide le moteur a ne pas etre aveugle ; ici elle
    //     deviendrait la charge de base brute, donc elle est ecartee ;
    //  2. jour de test — CoachKalman.isTestContext(), lu sur le format
    //     (« montee vers 1RM », « 3RM test »). Un test n'est pas une charge de
    //     travail ;
    //  3. reps compatibles — au-dela de repGapRatio, la charge brute d'une
    //     ligne ne dit rien de la charge du jour : elle est projetee par Epley
    //     vers la cible (sur une COPIE, la ligne stockee n'est jamais touchee).
    //     Projeter plutot qu'exclure : exclure renvoyait la couche a une ligne
    //     plus ancienne, donc plus legere que ce que le moteur venait de lire.
    var V116 = (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.brainV116) || {};
    var tMinDay = Number(ctx && ctx.targetMin) || Number(targetReps) || 8;
    var tMaxDay = Number(ctx && ctx.targetMax) || Number(targetReps) || tMinDay;
    function isTestRow(r){
      var rc = (typeof coachHistoryContext==='function') ? coachHistoryContext(r) : null;
      var fmt = {format: (rc && rc.format) || (r && r.planned && r.planned.format) || ''};
      if(window.CoachKalman && typeof CoachKalman.isTestContext==='function') return CoachKalman.isTestContext(fmt);
      var K = (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.kalman) || {};
      return typeof coachMatchesAnyTuningPattern==='function' && coachMatchesAnyTuningPattern(coachNormalizeMoveText(fmt.format), K.testFormatPatterns);
    }
    function repsIncompatible(r){
      var reps = rowReps(r), ratio = Number(V116.repGapRatio);
      if(!reps || !(ratio > 0)) return false;
      var gap = reps < tMinDay ? tMinDay - reps : (reps > tMaxDay ? reps - tMaxDay : 0);
      return gap > tMaxDay * ratio;
    }
    function projectToTarget(r){
      if(!repsIncompatible(r) || typeof epley1RM!=='function') return r;
      var reps = rowReps(r), toward = reps < tMinDay ? tMinDay : tMaxDay;
      var projected = epley1RM(rowLoad(r), reps) / (1 + toward / 30);
      // Sans charge prescrite : une projection n'a jamais « depasse » une
      // suggestion qu'elle n'a pas recue (couche 4).
      return Object.assign({}, r, {load: projected, externalLoad: projected, reps: toward,
        planned: Object.assign({}, r.planned || {}, {load: null}), __v116ProjectedFrom: rowLoad(r) + ' x ' + reps});
    }
    var sameNature = (typeof coachFilterHistoryForProgression==='function') ? coachFilterHistoryForProgression(histAll, ctx) : histAll;
    var hist = sameNature.filter(function(r){
      if(typeof coachHistoryWeight==='function' && coachHistoryWeight(r) < 1) return false;
      return !isDeloadRow(r) && !isCalibrationSeed(r) && !isImplausible(r) && rowLoad(r) > 0 && rowRpe(r) > 0
        && !isTestRow(r);
    }).map(projectToTarget);
    if(!hist.length) return base.loadText;

    // Plafond de capacite : la couche raffine une charge de travail, elle ne
    // depasse jamais ce que l'e1RM retenu permet pour les reps du jour au RPE
    // capacityRpe. e1RM retenu = la meilleure des deux lectures : l'ancre de
    // force du moteur (coachStrengthAnchorOneRm : athlete_state, references,
    // profil) et les lignes retenues ci-dessus, RIR compte (meme convention
    // que kalman.js : RIR = 10 - RPE, borne a maxRir). Sans e1RM, pas de
    // plafond : le comportement d'avant reste intact.
    function capacityCap(){
      var K = (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.kalman) || {};
      var maxRir = Number(K.maxRir) || 4;
      var capRpe = Number(V116.capacityRpe);
      if(!(capRpe > 0) || typeof epley1RM!=='function') return null;
      function rirOf(rpe){ return Math.max(0, Math.min(maxRir, 10 - (Number(rpe) || 10))); }
      var anchor = (typeof coachStrengthAnchorOneRm==='function') ? coachStrengthAnchorOneRm(label, mv) : null;
      var e1 = (anchor && anchor.oneRm > 0) ? anchor.oneRm : 0;
      hist.forEach(function(r){
        var reps = rowReps(r);
        if(reps > 0) e1 = Math.max(e1, epley1RM(rowLoad(r), reps + rirOf(rowRpe(r))));
      });
      if(!(e1 > 0)) return null;
      var reps = Math.max(1, Number(targetReps) || tMinDay);
      var raw = e1 / (1 + (reps + rirOf(capRpe)) / 30);
      // Arrondi au cran SUPERIEUR du rack : un plafond qu'on ne peut pas
      // charger gelerait les petites charges (un Goblet Squat a 10 lb n'a pas
      // de 10,5), sans rien proteger de plus.
      var up = (typeof roundLoadForExercise==='function') ? roundLoadForExercise(label, raw, 'up') : raw;
      return {e1RM: e1, load: Math.max(raw, Number(up) || 0), reps: reps, rpe: capRpe};
    }

    var step    = (typeof coachLoadStepForExercise==='function') ? coachLoadStepForExercise(label, rowLoad(hist[hist.length-1])) : 5;
    var maxJump = (typeof coachMaxJumpForExercise==='function')  ? coachMaxJumpForExercise(label, rowLoad(hist[hist.length-1]))  : 5;

    // ── Deload calculé en % ───────────────────────────────────────────────────
    if(isDeload){
      var lastNormal = hist[hist.length-1];
      var lastNormalLoad = rowLoad(lastNormal);
      if(!lastNormalLoad) return base.loadText;

      // Détecter le type de mouvement
      var deloadPct = 0.80; // principal par défaut (-20%)
      if(typeof coachIsIsolationMovement==='function' && coachIsIsolationMovement(label)){
        deloadPct = 0.75; // accessoire (-25%)
      } else if(ctx && (ctx.primaryIntent === 'technique' || ctx.kind === 'technique')){
        deloadPct = 0.70; // technique (-30%)
      }
      var deloadLoad = lastNormalLoad * deloadPct;
      var deloadRounded = (typeof roundLoadForExercise==='function')
        ? roundLoadForExercise(label, deloadLoad, 'nearest', String(lastNormalLoad))
        : Math.round(deloadLoad / step) * step;

      var deloadPctLabel = Math.round((1-deloadPct)*100) + '%';
      var reason = 'Deload — réduction de ' + deloadPctLabel + ' vs dernière charge normale (' + lastNormalLoad + ' lb).';
      if(typeof storeLoadDecisionHint==='function'){
        storeLoadDecisionHint(label, coachFormatSuggestedLoad(label,deloadRounded,base.loadText,''), reason, 'ok', histAll, ctx, 'brain');
      }
      try{
        if(window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
          var dk = coachNormalizeMoveText(label);
          if(dk && window.__coachLoadHints[dk]){
            window.__coachLoadHints[dk].load=coachFormatSuggestedLoad(label,deloadRounded,base.loadText,'');
            window.__coachLoadHints[dk].reason=reason;
            window.__coachLoadHints[dk].source='brain';
            if(baseKalman)window.__coachLoadHints[dk].kalman=baseKalman;
          }
        }
      }catch(e){}
      return coachFormatSuggestedLoad(label,deloadRounded,base.loadText,'');
    }

    // ── Données des dernières séances normales ────────────────────────────────
    var last  = hist[hist.length-1];
    var prev  = hist.length >= 2 ? hist[hist.length-2] : null;
    var prev2 = hist.length >= 3 ? hist[hist.length-3] : null;

    var lastLoad = rowLoad(last);
    var lastRpe  = rowRpe(last);
    var lastReps = rowReps(last);
    if(!lastLoad || !lastRpe) return base.loadText;

    var tmax = Number(
      (ctx && ctx.targetMax) ||
      (last && last.planned && last.planned.targetMax) ||
      targetReps || 8
    );

    // ── Couche 1 : Règle RPE → delta de base ─────────────────────────────────
    var delta = 0;
    var reason = '';

    if(lastRpe <= 6 && lastReps >= tmax){
      delta  = Math.round((maxJump * 2) / step) * step;
      reason = 'RPE ' + lastRpe + ' avec reps au max (' + lastReps + '/' + tmax + ') — hausse majeure.';
    } else if(lastRpe <= 7){
      delta  = maxJump;
      reason = 'RPE ' + lastRpe + ' — progression normale.';
    } else if(lastRpe <= 8){
      delta  = Math.round((maxJump * 0.5) / step) * step || step;
      reason = 'RPE ' + lastRpe + ' — progression prudente.';
    } else if(lastRpe <= 8.5){
      delta  = Math.round((maxJump * 0.25) / step) * step || step;
      reason = 'RPE ' + lastRpe + ' — micro-progression.';
    } else if(lastRpe < 9){
      delta  = 0;
      reason = 'RPE ' + lastRpe + ' — maintien recommandé.';
    } else {
      var prevRpe = prev ? rowRpe(prev) : 0;
      if(prevRpe >= 9){
        delta  = -(Math.round((maxJump * 0.5) / step) * step || step);
        reason = 'RPE ≥ 9 deux séances consécutives — réduction recommandée.';
      } else {
        delta  = 0;
        reason = 'RPE ' + lastRpe + ' — maintien, séance difficile isolée.';
      }
    }

    // ── Couche 2 : Moyenne mobile — signal de confiance uniquement ───────────
    // La base reste la dernière charge réelle (lastLoad).
    // La moyenne sert uniquement à moduler l'agressivité du delta :
    // si la moyenne est très en retard sur lastLoad → progression rapide → delta réduit.
    var baseLoad = lastLoad;
    if(hist.length >= 2){
      var w1 = 0.50, w2 = 0.30, w3 = 0.20;
      if(hist.length === 2){ w1 = 0.60; w2 = 0.40; w3 = 0; }
      var l1 = lastLoad;
      var l2 = rowLoad(prev) || l1;
      var l3 = prev2 ? (rowLoad(prev2) || l2) : l2;
      var movingAvg = (l1*w1) + (l2*w2) + (l3*w3);
      // Si la moyenne est plus de 10% sous lastLoad → progression rapide → prudence sur le delta
      var avgGap = lastLoad - movingAvg;
      var rapidProgressionPenalty = 0;
      if(avgGap > lastLoad * 0.10 && delta > 0){
        rapidProgressionPenalty = Math.round((delta * 0.30) / step) * step;
        delta = Math.max(0, delta - rapidProgressionPenalty);
        reason += ' [Tendance rapide : +' + Math.round(avgGap) + ' lb sur moy., delta réduit]';
      }
    }

    // ── Couche 3 : Tendance récente de progression (≥3 séances) ─────────────
    // NOTE : ce n'est PAS de la vélocité VBT (vitesse de barre en m/s).
    // C'est la vitesse de progression de la charge dans le temps.
    var velocityDelta = 0;
    if(hist.length >= 3){
      var v1 = rowLoad(last);
      var v2 = rowLoad(prev);
      var v3 = rowLoad(prev2);
      // Tendance = pente moyenne sur 3 points
      var rawTrend = ((v1 - v3) / 2);
      // Plafonner à 1× maxJump
      velocityDelta = Math.max(-maxJump, Math.min(maxJump, rawTrend));
      // Pondérer à 30% — ne domine pas les règles RPE
      velocityDelta = velocityDelta * 0.30;
    }

    // ── Couche 4 : Signal de cohérence ───────────────────────────────────────
    // Si tu dépasses la suggestion 3 séances de suite → recalibrer la base
    var consistencyBoost = 0;
    if(hist.length >= 3){
      var overrides = [last, prev, prev2].filter(function(r){
        if(!r) return false;
        var suggested = Number(r.planned && r.planned.load) || 0;
        return suggested > 0 && rowLoad(r) > suggested * 1.05;
      });
      if(overrides.length >= 3){
        // Recalibrer vers le haut — moyenne des dépassements
        var avgOverride = overrides.reduce(function(sum,r){
          return sum + (rowLoad(r) - (Number(r.planned&&r.planned.load)||rowLoad(r)));
        }, 0) / overrides.length;
        consistencyBoost = Math.min(avgOverride, maxJump);
        reason += ' [Recalibrage +' + Math.round(consistencyBoost) + ' lb]';
      }
    }

    // ── Calcul final ──────────────────────────────────────────────────────────
    var rawLoad = baseLoad + delta + velocityDelta + consistencyBoost;
    // Plancher conditionnel :
    // - Si delta > 0 (hausse) : jamais sous la dernière charge réelle (sécurité normale)
    // - Si delta < 0 (baisse justifiée : RPE≥9×2, RPE≥9.5, échec) : la baisse est autorisée
    //   mais plancher à (lastLoad - 2×maxJump) pour éviter un effondrement brutal
    if(delta >= 0){
      rawLoad = Math.max(rawLoad, lastLoad);
    } else {
      var minFloor = lastLoad - (maxJump * 2);
      rawLoad = Math.max(rawLoad, minFloor);
    }

    // Arrondir aux poids disponibles
    var roundedLoad = (typeof roundLoadForExercise==='function')
      ? roundLoadForExercise(label, rawLoad, 'nearest', String(lastLoad))
      : Math.round(rawLoad / step) * step;
    if(!roundedLoad || roundedLoad <= 0) roundedLoad = lastLoad;

    // Charge disponible immédiatement supérieure
    var nextAvail = (typeof nextLoadForExercise==='function')
      ? nextLoadForExercise(label, lastLoad, 1, String(lastLoad))
      : lastLoad + step;

    // ── Logique reps/poids ────────────────────────────────────────────────────
    var newLoad = roundedLoad;
    var newReps = null;
    var repsSuggestion = '';

    if(delta > 0 && roundedLoad > lastLoad && roundedLoad < nextAvail){
      var repThreshold = tmax + 3;
      var currentReps  = lastReps || tmax;
      if(currentReps < repThreshold){
        newLoad        = lastLoad;
        newReps        = currentReps + 1;
        repsSuggestion = ' × ' + newReps + ' reps';
        reason         = 'RPE ' + lastRpe + ' — progression en reps (' + newReps + '/' + repThreshold + ' avant passage à ' + nextAvail + ' lb).';
      } else {
        newLoad = nextAvail;
        reason  = 'RPE ' + lastRpe + ' — seuil reps atteint, passage à ' + nextAvail + ' lb.';
      }
    }

    // Plafond : jamais plus de 2× maxJump au-dessus de la dernière charge réelle
    newLoad = Math.min(newLoad, lastLoad + maxJump * 2);

    var safeDecision={label:label,loadNum:newLoad,loadText:coachFormatSuggestedLoad(label,newLoad,base.loadText,repsSuggestion),severity:(delta<0?'watch':'ok'),reason:reason};
    if(typeof coachBrainApplyStatsGate==='function' && newLoad>lastLoad && (safeDecision.severity==='ok') && !isDeload){
      // Fix : on passait histAll (brut, deload + seeds de calibrage inclus) au
      // gate de validations. `hist` (defini plus haut, ligne ~545) exclut deja
      // ces lignes pour le reste du moteur ; le gate doit voir le meme historique,
      // sinon un deload recent peut casser le compteur de validations et
      // redemander 2-3 confirmations sur une charge deja maitrisee.
      // Plancher : la decision du moteur profond, qui a deja applique tout
      // l'echelon RPE. La couche V1.16 peut amortir son propre supplement
      // d'ambition, pas defaire ce que l'evidence de l'athlete a etabli.
      safeDecision=coachBrainApplyStatsGate(safeDecision,label,hist,ctx,targetReps,lastLoad,baseNum);
      newLoad=safeDecision.loadNum;
      reason=safeDecision.reason;
      repsSuggestion='';
      safeDecision.loadText=coachFormatSuggestedLoad(label,newLoad,base.loadText,'');
    }

    // Au-dessus du plafond de capacite, la decision du moteur principal fait
    // foi — et le (!) le dit, sans rien recalculer d'autre.
    var cap = (newLoad > baseNum) ? capacityCap() : null;
    if(cap && newLoad > cap.load){
      try{
        if(hintsBefore){
          window.__coachLoadHints = hintsBefore;
          if(baseHint && baseHint.load === base.loadText){
            var capHint = Object.assign({}, baseHint, {reason: String(baseHint.reason || base.reason || '')
              + ' Couche Brain V1.16 ecartee : ' + newLoad + ' lb depasserait la capacite estimee (e1RM '
              + Math.round(cap.e1RM) + ' lb → ' + cap.load + ' lb max pour ' + cap.reps
              + ' reps @RPE ' + cap.rpe + ').'});
            Object.keys(hintsBefore).forEach(function(k){ if(hintsBefore[k] === baseHint) hintsBefore[k] = capHint; });
          }
        }
      }catch(e){}
      return base.loadText;
    }

    if(newLoad === baseNum && !newReps && !(safeDecision&&safeDecision.brainStats)) return base.loadText;

    var hintLoad = safeDecision.loadText || coachFormatSuggestedLoad(label,newLoad,base.loadText,repsSuggestion);
    var explicitSource = (safeDecision&&safeDecision.brainStats) || newLoad!==baseNum || newReps ? 'brain' : 'moteur';
    if(typeof storeLoadDecisionHint==='function'){
      storeLoadDecisionHint(label, hintLoad, reason, safeDecision.severity || (delta < 0 ? 'watch' : 'ok'), histAll, ctx, explicitSource);
    }
    try{
      if(window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
        var normKey = coachNormalizeMoveText(label);
        if(normKey && window.__coachLoadHints[normKey]){
          window.__coachLoadHints[normKey].load   = hintLoad;
          window.__coachLoadHints[normKey].reason = reason;
          window.__coachLoadHints[normKey].source = 'brain';
          if(safeDecision.brainStats)window.__coachLoadHints[normKey].brainStats=safeDecision.brainStats;
          if(baseKalman)window.__coachLoadHints[normKey].kalman=baseKalman;
        }
      }
    }catch(e){}

    return safeDecision.loadText || coachFormatSuggestedLoad(label,newLoad,base.loadText,repsSuggestion);

  }catch(e){ /* silencieux — fallback moteur */ }

  return base.loadText;
};

// ── Entrée unique d'assemblage : exercice + bloc → charge suggérée ───────────
// Toutes les vues (WOD+, PC, séance guidée, résultats, export, diagnostic)
// passent par ici au lieu de reconstruire target + contexte à la main. But :
// la même charge pour le même exercice, quel que soit l'écran.
// Comportement identique à l'ancien inline : target = parseTargetReps(format,10)
// .min||.max, contexte {kind,blockTitle,note,text,format,day,week}, puis moteur.
// opts.day / opts.week permettent de prévisualiser un autre jour/semaine (PC).
function coachSuggestForExercise(exercise, block, opts){
  exercise = exercise || {};
  block = block || {};
  opts = opts || {};
  var parsed = (typeof parseTargetReps === 'function')
    ? parseTargetReps(exercise.format, 10)
    : { min: 10, max: 10 };
  var target = parsed.min || parsed.max || 10;
  var st = (typeof state !== 'undefined') ? state : null;
  var context = {
    kind: block.kind,
    blockTitle: block.title,
    note: exercise.note,
    text: block.text,
    format: exercise.format,
    // La fourchette entiere, pas seulement sa borne basse : 18 reps sur une
    // cible « 15-20 » sont DANS la cible, pas au-dessus.
    targetMin: parsed.min || parsed.max || target,
    targetMax: parsed.max || parsed.min || target,
    // `load` sert a lire une charge ecrite en pourcentage (« 60-65 % ») ;
    // `pctOf1RM` est la cible posee explicitement par le programme, qui
    // dispense de toute lecture de phrase. Voir docs/CHARGE_PROGRESSION_CONTRACT.md.
    load: exercise.load,
    pctOf1RM: exercise.pctOf1RM,
    day:  (opts.day  !== undefined) ? opts.day  : (st ? st.day  : undefined),
    week: (opts.week !== undefined) ? opts.week : (st ? st.week : undefined)
  };
  var fn = (typeof window !== 'undefined' && window.CoachCharge && window.CoachCharge.suggestLoad)
    ? window.CoachCharge.suggestLoad
    : (typeof coachSafeSuggestedLoad === 'function' ? coachSafeSuggestedLoad
      : (typeof athleteSuggestedLoad === 'function' ? athleteSuggestedLoad : null));
  return fn ? fn(exercise.name, exercise.load, target, context) : "";
}
window.coachSuggestForExercise = coachSuggestForExercise;

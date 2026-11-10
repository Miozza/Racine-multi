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
// ── Couche Brain V1.16 ──────────────────────────────────────────────────────
// Raffine la decision de la pile de regles a partir des dernieres seances
// normales. Chaque etape est une fonction nommee, sans effet de bord sauf
// coachV116WriteHint() : c'est ce qui permet de les verifier une a une
// (dev/brain_v116_checks.js). L'ordre vit dans coachBrainV116Refine().
//  Couche 1 : regles RPE (delta de base — baisse controlee si RPE>=9 deux fois)
//  Couche 2 : moyenne mobile — signal de prudence (la base reste lastLoad)
//  Couche 3 : tendance recente de progression (>=3 seances — pas de la velocite VBT)
//  Couche 4 : signal de coherence (recalibrage si depassement systematique)
//  Deload   : part de la derniere charge normale, selon le type de mouvement
//  Tous les seuils : COACH_MOVEMENT_TUNING.brainV116 (movement_tuning.js).
//  Contexte technique/wod/light = ignore
function coachV116Tuning(){ return (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.brainV116) || {}; }
function coachV116RowLoad(r){ return Number(r && (r.load || r.externalLoad)) || 0; }
function coachV116RowRpe(r){  return Number(r && r.rpe) || 0; }
function coachV116RowReps(r){ return Number(r && (r.reps || r.actualReps)) || 0; }
function coachV116IsDeloadRow(r){ return (typeof coachBrainIsDeloadRow==='function') ? coachBrainIsDeloadRow(r) : !!(r && (r.context === 'deload' || r.status === 'deload' || (r.planned && r.planned.deload))); }
// Repere de calibrage (source "manual_recalibration" = 1RM/5RM seme a
// l'onboarding) : ce n'est pas une charge de travail. Le laisser piloter la
// progression faisait suggerer ~1RM pour des sets de 8-12 reps.
function coachV116IsCalibrationSeed(r){ return (typeof coachIsNonPerformanceSeed==='function')?coachIsNonPerformanceSeed(r):!!(r&&r.planned&&(r.planned.source==='manual_recalibration'||r.planned.source==='manual_charge_override')); }
function coachV116IsTestRow(r){
  var rc = (typeof coachHistoryContext==='function') ? coachHistoryContext(r) : null;
  var fmt = {format: (rc && rc.format) || (r && r.planned && r.planned.format) || ''};
  if(window.CoachKalman && typeof CoachKalman.isTestContext==='function') return CoachKalman.isTestContext(fmt);
  var K = (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.kalman) || {};
  return typeof coachMatchesAnyTuningPattern==='function' && coachMatchesAnyTuningPattern(coachNormalizeMoveText(fmt.format), K.testFormatPatterns);
}
function coachV116RepsIncompatible(r,tMinDay,tMaxDay){
  var reps = coachV116RowReps(r), ratio = Number(coachV116Tuning().repGapRatio);
  if(!reps || !(ratio > 0)) return false;
  var gap = reps < tMinDay ? tMinDay - reps : (reps > tMaxDay ? reps - tMaxDay : 0);
  return gap > tMaxDay * ratio;
}
function coachV116ProjectToTarget(r,tMinDay,tMaxDay){
  if(!coachV116RepsIncompatible(r,tMinDay,tMaxDay) || typeof epley1RM!=='function') return r;
  var reps = coachV116RowReps(r), toward = reps < tMinDay ? tMinDay : tMaxDay;
  var projected = epley1RM(coachV116RowLoad(r), reps) / (1 + toward / 30);
  // Sans charge prescrite : une projection n'a jamais « depasse » une
  // suggestion qu'elle n'a pas recue (couche 4).
  return Object.assign({}, r, {load: projected, externalLoad: projected, reps: toward,
    planned: Object.assign({}, r.planned || {}, {load: null}), __v116ProjectedFrom: coachV116RowLoad(r) + ' x ' + reps});
}

// Meme historique que le moteur principal. Cette couche relisait
// l'historique BRUT : un test 300 x 1 @9,5 apres des doubles de vitesse
// devenait la base d'un 5 x 3 a RPE 8 et sortait a 305 lb, quand le moteur
// proposait 220. Filtres, aucun reecrit ici :
//  1. nature de contexte — coachFilterHistoryForProgression(), le filtre
//     du moteur principal (motif « Nature de contexte differente » de la
//     trace). Une ligne admise a poids reduit (repli quand aucune ligne de
//     meme nature n'existe) aide le moteur a ne pas etre aveugle ; ici elle
//     deviendrait la charge de base brute, donc elle est ecartee ;
//  2. deload, repere de calibrage, charge invraisemblable (typo de saisie,
//     meme filtre que guardedSuggestedLoadDecision) ;
//  3. jour de test — CoachKalman.isTestContext(), lu sur le format
//     (« montee vers 1RM », « 3RM test »). Un test n'est pas une charge de
//     travail ;
//  4. reps compatibles — au-dela de repGapRatio, la charge brute d'une
//     ligne ne dit rien de la charge du jour : elle est projetee par Epley
//     vers la cible (sur une COPIE, la ligne stockee n'est jamais touchee).
//     Projeter plutot qu'exclure : exclure renvoyait la couche a une ligne
//     plus ancienne, donc plus legere que ce que le moteur venait de lire.
function coachV116History(label,histAll,ctx,targetReps,tMinDay,tMaxDay){
  var sameNature = (typeof coachFilterHistoryForProgression==='function') ? coachFilterHistoryForProgression(histAll, ctx) : histAll;
  return sameNature.filter(function(r){
    if(typeof coachHistoryWeight==='function' && coachHistoryWeight(r) < 1) return false;
    var implausible = (typeof coachIsImplausibleLoadRow==='function') && coachIsImplausibleLoadRow(label,r,Number(targetReps)||8);
    return !coachV116IsDeloadRow(r) && !coachV116IsCalibrationSeed(r) && !implausible && coachV116RowLoad(r) > 0 && coachV116RowRpe(r) > 0
      && !coachV116IsTestRow(r);
  }).map(function(r){ return coachV116ProjectToTarget(r,tMinDay,tMaxDay); });
}

// Plafond de capacite : la couche raffine une charge de travail, elle ne
// depasse jamais ce que l'e1RM retenu permet pour les reps du jour au RPE
// capacityRpe. e1RM retenu = la meilleure des deux lectures : l'ancre de
// force du moteur (coachStrengthAnchorOneRm : athlete_state, references,
// profil) et les lignes retenues, RIR compte (meme convention que
// kalman.js : RIR = 10 - RPE, borne a maxRir). Sans e1RM, pas de plafond.
function coachV116CapacityCap(label,mv,hist,targetReps,tMinDay){
  var K = (window.COACH_MOVEMENT_TUNING && window.COACH_MOVEMENT_TUNING.kalman) || {};
  var maxRir = Number(K.maxRir) || 4;
  var capRpe = Number(coachV116Tuning().capacityRpe);
  if(!(capRpe > 0) || typeof epley1RM!=='function') return null;
  function rirOf(rpe){ return Math.max(0, Math.min(maxRir, 10 - (Number(rpe) || 10))); }
  var anchor = (typeof coachStrengthAnchorOneRm==='function') ? coachStrengthAnchorOneRm(label, mv) : null;
  var e1 = (anchor && anchor.oneRm > 0) ? anchor.oneRm : 0;
  hist.forEach(function(r){
    var reps = coachV116RowReps(r);
    if(reps > 0) e1 = Math.max(e1, epley1RM(coachV116RowLoad(r), reps + rirOf(coachV116RowRpe(r))));
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

// Part de la derniere charge normale gardee en deload.
function coachV116DeloadPct(label,ctx){
  var P = coachV116Tuning().deloadPct || {};
  if(typeof coachIsIsolationMovement==='function' && coachIsIsolationMovement(label)) return P.isolation; // accessoire
  if(ctx && (ctx.primaryIntent === 'technique' || ctx.kind === 'technique')) return P.technique;
  return P.main;
}

// Couche 1 : RPE de la derniere serie → delta de base. Paliers et parts du
// saut max : COACH_MOVEMENT_TUNING.brainV116.rpeDelta (movement_tuning.js).
function coachV116RpeDelta(lastRpe,lastReps,tmax,prevRpe,maxJump,step){
  var R = coachV116Tuning().rpeDelta || {};
  if(lastRpe <= R.majorMaxRpe && lastReps >= tmax) return {delta: Math.round((maxJump * R.majorJumps) / step) * step,
    reason: 'RPE ' + lastRpe + ' avec reps au max (' + lastReps + '/' + tmax + ') — hausse majeure.'};
  if(lastRpe <= R.normalMaxRpe)  return {delta: maxJump * R.normalJumps, reason: 'RPE ' + lastRpe + ' — progression normale.'};
  if(lastRpe <= R.prudentMaxRpe) return {delta: Math.round((maxJump * R.prudentJumps) / step) * step || step, reason: 'RPE ' + lastRpe + ' — progression prudente.'};
  if(lastRpe <= R.microMaxRpe)   return {delta: Math.round((maxJump * R.microJumps) / step) * step || step, reason: 'RPE ' + lastRpe + ' — micro-progression.'};
  if(lastRpe < R.holdBelowRpe)   return {delta: 0, reason: 'RPE ' + lastRpe + ' — maintien recommandé.'};
  if(prevRpe >= R.repeatHighRpe) return {delta: -(Math.round((maxJump * R.repeatDropJumps) / step) * step || step), reason: 'RPE ≥ ' + R.repeatHighRpe + ' deux séances consécutives — réduction recommandée.'};
  return {delta: 0, reason: 'RPE ' + lastRpe + ' — maintien, séance difficile isolée.'};
}

// Couche 2 : ecart entre la derniere charge et la moyenne mobile ponderee
// des 2-3 dernieres. La base reste la derniere charge reelle ; l'ecart sert
// uniquement a moderer le delta quand la progression a ete rapide.
function coachV116MovingAverageGap(hist){
  if(hist.length < 2) return 0;
  var T = coachV116Tuning();
  var w = (hist.length === 2 ? T.movingAverageWeights2 : T.movingAverageWeights3) || [];
  var w1 = w[0], w2 = w[1], w3 = w[2];
  var prev2 = hist.length >= 3 ? hist[hist.length-3] : null;
  var l1 = coachV116RowLoad(hist[hist.length-1]);
  var l2 = coachV116RowLoad(hist[hist.length-2]) || l1;
  var l3 = prev2 ? (coachV116RowLoad(prev2) || l2) : l2;
  return l1 - ((l1*w1) + (l2*w2) + (l3*w3));
}
// Moyenne trop loin sous la derniere charge (rapidGapRatio) → progression
// rapide → hausse reduite (rapidPenalty).
function coachV116RapidProgressionPenalty(d,avgGap,lastLoad,step){
  var T = coachV116Tuning();
  if(!(avgGap > lastLoad * T.rapidGapRatio && d.delta > 0)) return d;
  var penalty = Math.round((d.delta * T.rapidPenalty) / step) * step;
  return {delta: Math.max(0, d.delta - penalty),
    reason: d.reason + ' [Tendance rapide : +' + Math.round(avgGap) + ' lb sur moy., delta réduit]'};
}

// Couche 3 : pente moyenne de la charge sur 3 seances, plafonnee
// (trendMaxJumps) et ponderee (trendWeight) — elle ne domine pas les regles RPE.
function coachV116TrendDelta(hist,maxJump){
  if(hist.length < 3) return 0;
  var rawTrend = (coachV116RowLoad(hist[hist.length-1]) - coachV116RowLoad(hist[hist.length-3])) / 2;
  var T = coachV116Tuning(), bound = maxJump * T.trendMaxJumps;
  return Math.max(-bound, Math.min(bound, rawTrend)) * T.trendWeight;
}

// Couche 4 : la suggestion depassee (overrideRatio) trois seances de suite →
// recalibrage vers le haut (moyenne des depassements, bornee a maxJump).
// Retourne null quand le signal n'existe pas.
function coachV116ConsistencyBoost(hist,maxJump){
  if(hist.length < 3) return null;
  var ratio = coachV116Tuning().overrideRatio;
  var overrides = [hist[hist.length-1], hist[hist.length-2], hist[hist.length-3]].filter(function(r){
    if(!r) return false;
    var suggested = Number(r.planned && r.planned.load) || 0;
    return suggested > 0 && coachV116RowLoad(r) > suggested * ratio;
  });
  if(overrides.length < 3) return null;
  var avgOverride = overrides.reduce(function(sum,r){
    return sum + (coachV116RowLoad(r) - (Number(r.planned&&r.planned.load)||coachV116RowLoad(r)));
  }, 0) / overrides.length;
  return Math.min(avgOverride, maxJump);
}

// Plancher conditionnel de la somme des couches :
// - delta >= 0 (hausse ou maintien) : jamais sous la derniere charge reelle ;
// - delta < 0 (baisse justifiee) : autorisee, mais pas plus de maxDropJumps
//   sauts sous la derniere charge, pour eviter un effondrement brutal.
function coachV116RawLoad(lastLoad,delta,trendDelta,boost,maxJump){
  var rawLoad = lastLoad + delta + trendDelta + boost;
  return Math.max(rawLoad, delta >= 0 ? lastLoad : lastLoad - (maxJump * coachV116Tuning().maxDropJumps));
}

// Re-ecrit l'indice du (!) avec la decision de la couche. La capacite
// estimee (Kalman) attachee par coachFinalizeSuggestionDecision est relue
// une fois par l'appelant et reattachee ici, jamais recalculee : un payload
// neuf la perdrait.
function coachV116WriteHint(label,loadText,reason,brainStats,baseKalman){
  try{
    if(window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
      var key = coachNormalizeMoveText(label);
      if(key && window.__coachLoadHints[key]){
        window.__coachLoadHints[key].load   = loadText;
        window.__coachLoadHints[key].reason = reason;
        window.__coachLoadHints[key].source = 'brain';
        if(brainStats)window.__coachLoadHints[key].brainStats=brainStats;
        if(baseKalman)window.__coachLoadHints[key].kalman=baseKalman;
      }
    }
  }catch(e){}
}

// Retourne le texte de charge final. Rend base.loadText tel quel des que la
// couche n'a pas a parler. Peut lever : l'appelant retombe sur le moteur.
function coachBrainV116Refine(base,nameOrKey,targetReps,context){
  var baseNum = base.loadNum;
  if(!baseNum || baseNum <= 0) return base.loadText;
  // Sans sa table de reglages, la couche se tait : le moteur fait foi.
  var T = coachV116Tuning();
  if(!T.rpeDelta) return base.loadText;

  var label = base.label || nameOrKey;
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
  var tMinDay = Number(ctx && ctx.targetMin) || Number(targetReps) || 8;
  var tMaxDay = Number(ctx && ctx.targetMax) || Number(targetReps) || tMinDay;
  var hist = coachV116History(label,histAll,ctx,targetReps,tMinDay,tMaxDay);
  if(!hist.length) return base.loadText;

  var last = hist[hist.length-1];
  var lastLoad = coachV116RowLoad(last);
  var step    = (typeof coachLoadStepForExercise==='function') ? coachLoadStepForExercise(label, lastLoad) : 5;
  var maxJump = (typeof coachMaxJumpForExercise==='function')  ? coachMaxJumpForExercise(label, lastLoad)  : 5;

  // ── Deload calcule en % de la derniere charge normale ─────────────────────
  if(isDeload){
    if(!lastLoad) return base.loadText;
    var deloadPct = coachV116DeloadPct(label,ctx);
    var deloadRounded = (typeof roundLoadForExercise==='function')
      ? roundLoadForExercise(label, lastLoad * deloadPct, 'nearest', String(lastLoad))
      : Math.round((lastLoad * deloadPct) / step) * step;
    var deloadText = coachFormatSuggestedLoad(label,deloadRounded,base.loadText,'');
    var deloadReason = 'Deload — réduction de ' + Math.round((1-deloadPct)*100) + '% vs dernière charge normale (' + lastLoad + ' lb).';
    if(typeof storeLoadDecisionHint==='function'){
      storeLoadDecisionHint(label, deloadText, deloadReason, 'ok', histAll, ctx, 'brain');
    }
    coachV116WriteHint(label,deloadText,deloadReason,null,baseKalman);
    return deloadText;
  }

  var prev = hist.length >= 2 ? hist[hist.length-2] : null;
  var lastRpe  = coachV116RowRpe(last);
  var lastReps = coachV116RowReps(last);
  if(!lastLoad || !lastRpe) return base.loadText;

  var tmax = Number(
    (ctx && ctx.targetMax) ||
    (last && last.planned && last.planned.targetMax) ||
    targetReps || 8
  );

  // ── Couches 1 a 4 ─────────────────────────────────────────────────────────
  var d = coachV116RpeDelta(lastRpe,lastReps,tmax,prev ? coachV116RowRpe(prev) : 0,maxJump,step);
  d = coachV116RapidProgressionPenalty(d,coachV116MovingAverageGap(hist),lastLoad,step);
  var delta = d.delta, reason = d.reason;
  var trendDelta = coachV116TrendDelta(hist,maxJump);
  var boost = coachV116ConsistencyBoost(hist,maxJump);
  if(boost !== null) reason += ' [Recalibrage +' + Math.round(boost) + ' lb]';
  var rawLoad = coachV116RawLoad(lastLoad,delta,trendDelta,boost || 0,maxJump);

  // Arrondir aux poids disponibles
  var roundedLoad = (typeof roundLoadForExercise==='function')
    ? roundLoadForExercise(label, rawLoad, 'nearest', String(lastLoad))
    : Math.round(rawLoad / step) * step;
  if(!roundedLoad || roundedLoad <= 0) roundedLoad = lastLoad;

  // Charge disponible immediatement superieure
  var nextAvail = (typeof nextLoadForExercise==='function')
    ? nextLoadForExercise(label, lastLoad, 1, String(lastLoad))
    : lastLoad + step;

  // ── Reps ou poids : une hausse plus petite que le prochain cran du rack
  // se prend d'abord en reps, puis passe au cran une fois le seuil atteint.
  var newLoad = roundedLoad;
  var newReps = null;
  var repsSuggestion = '';
  if(delta > 0 && roundedLoad > lastLoad && roundedLoad < nextAvail){
    var repThreshold = tmax + T.repsBeforeNextLoad;
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

  // Plafond : jamais plus de maxRiseJumps sauts au-dessus de la derniere charge reelle
  newLoad = Math.min(newLoad, lastLoad + maxJump * T.maxRiseJumps);

  var safeDecision={label:label,loadNum:newLoad,loadText:coachFormatSuggestedLoad(label,newLoad,base.loadText,repsSuggestion),severity:(delta<0?'watch':'ok'),reason:reason};
  if(typeof coachBrainApplyStatsGate==='function' && newLoad>lastLoad && (safeDecision.severity==='ok') && !isDeload){
    // Le portail de validations voit `hist` (sans deload ni seeds de
    // calibrage), comme le reste de la couche : sinon un deload recent casse
    // le compteur et redemande 2-3 confirmations sur une charge maitrisee.
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
  var cap = (newLoad > baseNum) ? coachV116CapacityCap(label,mv,hist,targetReps,tMinDay) : null;
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
  coachV116WriteHint(label,hintLoad,reason,safeDecision.brainStats,baseKalman);
  return hintLoad;
}

window.coachSafeSuggestedLoad=function(nameOrKey,currentLoad,targetReps,context){
  var base = guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps,context);
  try{
    return coachBrainV116Refine(base,nameOrKey,targetReps,context);
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

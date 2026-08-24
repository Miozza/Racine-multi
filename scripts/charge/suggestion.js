// @ts-check
// Coach Beurt - moteur de suggestions de charges.
// Script global volontaire : pas de ES modules.

function coachIsDeloadWeekOrContext(context){
  var weekNum=Number((context&&context.week)||(state&&state.week)||0)||0;
  // La semaine 6 n'est PAS un deload en soi. `if(weekNum===6)return true;`
  // datait de l'epoque ou l'app ne portait qu'un seul cycle de 6 semaines ;
  // le catalogue en compte 42, de 1 a 16 semaines. Le hardcode declenchait un
  // deload fantome en S6 sur 14 programmes — dont « S6 Rotation B max » de
  // phase2_fable5 (semaine de 3RM, la plus lourde du bloc), cappee a 85 % de
  // la derniere reference : 175 lb au lieu de 210. Les 19 programmes dont la
  // S6 est un VRAI deload la declarent tous dans weekLabels/weekGoals et sont
  // donc couverts par la lecture de libelle plus bas, qui est arrivee apres
  // ce hardcode et le rend redondant.
  //
  // Une semaine de deload se DECLARE (libelle ou objectif de semaine, note du
  // bloc, contexte recuperation) ; elle ne se deduit jamais d'un numero.
  if(context&&(context.isRecovery||context.isLight))return true;
  var raw=[context&&context.primaryIntent,context&&context.kind,context&&context.blockTitle,context&&context.note,context&&context.text,context&&context.format].filter(Boolean).join(' ');
  var n=(typeof coachNormalizeMoveText==='function')?coachNormalizeMoveText(raw):String(raw||'').toLowerCase();
  if(/deload|recuperation|recovery|reset/.test(n))return true;
  try{
    var wi=(typeof buildWeekInfo==='function'&&weekNum)?buildWeekInfo()[weekNum]:null;
    var weekText=(wi&&((wi.label||'')+' '+(wi.goal||'')))||'';
    var wn=coachNormalizeMoveText(weekText);
    if(/deload|facile|easy|recuperation|recovery|reset/.test(wn))return true;
  }catch(e){}
  return false;
}

function coachIsMainLoadContext(label,context){
  var raw=[label,context&&context.kind,context&&context.primaryIntent,context&&context.blockTitle].filter(Boolean).join(' ');
  var n=coachNormalizeMoveText(raw);
  var T=window.COACH_MOVEMENT_TUNING||{};
  if(coachMatchesAnyTuningPattern(n, T.mainLoadKeywordPatterns))return true;
  if(coachMatchesAnyTuningPattern(coachNormalizeMoveText(label), T.mainLoadMovementPatterns)&&!isIsolationMovement(label))return true;
  return false;
}

function coachDeloadMultiplierForContext(label,context){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.deloadMultiplier)||{main:0.85,other:0.80};
  return coachIsMainLoadContext(label,context)?T.main:T.other;
}

function coachRecentPeakLoad(history,label,context){
  var peak=0;
  (Array.isArray(history)?history:[]).forEach(function(row){
    if(!coachHistoryHasValidLoad(row,label,context))return;
    var load=coachHistoryLoadNumber(row);
    if(load>peak)peak=load;
  });
  return peak||0;
}

function coachApplyDeloadCap(suggested,label,context,history,lastLoad,bestControlled,programNum){
  if(!coachIsDeloadWeekOrContext(context))return {value:suggested,changed:false,reason:''};
  var base=0;
  if(lastLoad||lastLoad===0)base=lastLoad;
  if(!(base>0)&&bestControlled&&bestControlled.load)base=bestControlled.load;
  if(!(base>0)&&programNum)base=programNum;
  if(!(base>0))return {value:suggested,changed:false,reason:''};
  var mult=coachDeloadMultiplierForContext(label,context);
  var cap=base*mult;
  var peak=coachRecentPeakLoad(history,label,context);
  if(peak&&cap>=peak)cap=peak*mult;
  var next=Math.min(Number(suggested)||0,cap);
  if(next<suggested){
    return {value:next,changed:true,reason:'Deload actif : charge finale reduite a environ '+Math.round(mult*100)+'% de la derniere reference fiable, sous le peak recent.'};
  }
  return {value:suggested,changed:false,reason:''};
}

// Echelon de progression correspondant au RPE reel de la derniere serie.
// Retourne null au-dela du dernier barreau : pas de hausse automatique.
// Table : COACH_MOVEMENT_TUNING.rpeProgression (movement_tuning.js).
function coachRpeProgressionRung(label,rpe){
  var r=Number(rpe)||0;
  if(!(r>0))return null;
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.rpeProgression)||null;
  if(!T)return (r<=7)?{steps:1,jumpFactor:1}:null;
  var n=(typeof coachNormalizeMoveText==='function')?coachNormalizeMoveText(label):String(label||'');
  var table=null;
  var ov=T.overrides||[];
  for(var i=0;i<ov.length;i++){ if(ov[i].pattern.test(n)){ table=ov[i]; break; } }
  if(!table && T.isolation && typeof isIsolationMovement==='function' && isIsolationMovement(label)) table=T.isolation;
  if(!table) table=T.default;
  var ladder=(table&&table.ladder)||[];
  for(var j=0;j<ladder.length;j++){
    if(r<=Number(ladder[j].maxRpe)){
      // steps peut valoir 0 (barreau de maintien) : ne pas passer par
      // "|| 1", qui transformerait ce zero en une hausse d'un cran.
      var st=Number(ladder[j].steps);
      if(!isFinite(st)||st<0)st=1;
      var jf=Number(ladder[j].jumpFactor);
      if(!isFinite(jf)||jf<=0)jf=1;
      return {steps:st,jumpFactor:jf};
    }
  }
  return null;
}

// Decalage de reactivite : ce que raconte l'historique recent, en plus du
// seul RPE de la derniere seance. Retourne un entier (-1, 0 ou +1 par
// modificateur, cumules) applique au nombre de crans du barreau RPE.
// Ne touche jamais au saut maximal prudent : voir COACH_MOVEMENT_TUNING.
function coachRpeReactivityShift(hist,lastLoad,lastReps,target){
  var M=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.rpeProgression&&window.COACH_MOVEMENT_TUNING.rpeProgression.modifiers)||null;
  if(!M)return {shift:0,notes:[]};
  var shift=0,notes=[];

  // 1. Tendance du RPE a charge egale.
  var T=M.trend;
  if(T&&Array.isArray(hist)&&lastLoad>0){
    var same=hist.filter(function(row){
      return coachHistoryLoadNumber(row)===lastLoad && coachHistoryRpeNumber(row)>0;
    }).slice(-(Number(T.window)||3));
    if(same.length>=(Number(T.minRows)||3)){
      var first=coachHistoryRpeNumber(same[0]);
      var latest=coachHistoryRpeNumber(same[same.length-1]);
      var d=Number(T.delta)||0.5;
      if(latest<=first-d){ shift+=Number(T.shiftEasier)||0; notes.push("meme charge de moins en moins couteuse (RPE "+first+" -> "+latest+")"); }
      else if(latest>=first+d){ shift+=Number(T.shiftHarder)||0; notes.push("meme charge de plus en plus couteuse (RPE "+first+" -> "+latest+")"); }
    }
  }

  // 2. Reps depassees sur la derniere serie.
  // Deux lectures du meme fait, la plus severe gagne :
  //   - l'ecart ABSOLU (minExtra), qui parle bien des cibles longues ;
  //   - le RATIO reps/cible, seul a distinguer « 4 reps pour 2 » (un
  //     doublement) de « 10 reps pour 8 » (un debordement mineur). Sans lui,
  //     une cible de 2 reps donnait le meme credit forfaitaire quel que soit
  //     le depassement — l'angle mort a l'origine du defaut Squat vitesse de
  //     phase2_fable5.
  var R=M.repsOvershoot;
  if(R&&target>0&&lastReps>0){
    var shiftFromReps=0;
    if((lastReps-target)>=(Number(R.minExtra)||2))shiftFromReps=Number(R.shift)||0;
    var ratio=lastReps/target;
    (R.ladder||[]).some(function(rung){
      if(ratio<Number(rung.minRatio))return false;
      var st=Number(rung.shift)||0;
      if(st>shiftFromReps)shiftFromReps=st;
      return true;
    });
    if(shiftFromReps>0){
      shift+=shiftFromReps;
      notes.push(lastReps+" reps pour "+target+" demandees");
    }
  }

  return {shift:shift,notes:notes};
}

// Applique N crans d'equipement vers le haut a partir d'une charge.
// nextLoadForExercise() ne connait qu'une direction : on itere, en s'arretant
// des que le rack ne propose plus rien de superieur.
function coachNextLoadSteps(label,from,steps,loadText){
  var cur=Number(from)||0;
  var n=Math.max(1,Number(steps)||1);
  for(var i=0;i<n;i++){
    var nx=nextLoadForExercise(label,cur,1,loadText);
    if(!(nx>cur))break;
    cur=nx;
  }
  return cur;
}

function coachLastSetIsSimilarOrHarder(target,lastReps){
  target=Number(target)||0;lastReps=Number(lastReps)||0;
  if(!target||!lastReps)return true;
  if(target>=lastReps)return true;
  return repRange(target)===repRange(lastReps);
}


function coachRecentUnresolvedHighRpeBrake(history,label,context,target,suggested){
  var rows=Array.isArray(history)?history.slice(-6):[];
  var brake=null;
  rows.forEach(function(row,idx){
    if(!coachHistoryHasValidLoad(row,label,context))return;
    var load=coachHistoryLoadNumber(row);
    var rpe=coachHistoryRpeNumber(row);
    var reps=coachHistoryRepsNumber(row);
    if(!(load||load===0)||!(rpe>=8.5))return;
    if(!coachLastSetIsSimilarOrHarder(target,reps))return;
    if(!(Number(suggested)>load))return;
    var resolved=false;
    for(var j=idx+1;j<rows.length;j++){
      var later=rows[j];
      if(!coachHistoryHasValidLoad(later,label,context))continue;
      var laterLoad=coachHistoryLoadNumber(later);
      var laterRpe=coachHistoryRpeNumber(later);
      var laterReps=coachHistoryRepsNumber(later);
      if(laterLoad>=load&&laterRpe>0&&laterRpe<=8.5&&coachLastSetIsSimilarOrHarder(target,laterReps)){
        resolved=true;break;
      }
    }
    if(resolved)return;
    if(!brake||load>brake.load||rpe>brake.rpe)brake={load:load,rpe:rpe,reps:reps,date:row.date||'',status:row.status||''};
  });
  return brake;
}

function coachFormatSuggestedLoad(label,value,fallbackText,suffix){
  var fallback=String(fallbackText||'').trim();
  if(!(value||value===0))return fallback||'—';
  if(Number(value)===0&&/poids du corps/i.test(fallback))return fallback+(suffix||'');
  var unit=/\bkg\b/i.test(fallback)?'kg':'lb';
  var text=displayLoadForEquipment(label,String(value)+' '+unit);
  if(unit==='lb'){
    var family=(typeof coachMovementEquipmentFamily==='function')?coachMovementEquipmentFamily(label):'';
    var single=(typeof coachMatchesAnyTuningPattern==='function')
      && coachMatchesAnyTuningPattern(coachNormalizeMoveText(label),(window.COACH_MOVEMENT_TUNING||{}).singleImplementPatterns);
    var perHand=(/\/\s*main/i.test(fallback)||family==='db')&&!single;
    if(perHand&&!/\/\s*main/i.test(text))text+=' / main';
  }
  if(/⚠/.test(fallback)&&!/⚠/.test(text))text+=' ⚠';
  if(suffix)text+=suffix;
  return text;
}

// ── Filtre de vraisemblance partagé ─────────────────────────────────────────
// Une charge est invraisemblable si elle est < 20% du seed par défaut du
// mouvement (mis à l'échelle du profil) ET < 15 lb absolus (seuil universel
// haltères minimum réaliste). Ça protège contre les erreurs de saisie
// (ex: 5 lb au lieu de 50 lb). Partagé entre guardedSuggestedLoadDecision et
// coachSafeSuggestedLoad : les deux lisent le même historique et doivent
// ignorer les mêmes lignes aberrantes, sinon une typo peut encore corrompre
// la moyenne mobile / tendance du moteur Brain même si la décision gardée
// l'ignore correctement.
function coachIsImplausibleLoadRow(label,row,targetReps){
  var load=(typeof coachHistoryLoadNumber==='function')?coachHistoryLoadNumber(row):(Number(row&&row.load)||0);
  if(!load||load<=0)return false; // pas de charge = plausible (poids du corps, etc.)
  var rawSeed=(typeof coachDefaultLoadSeedForMovement==='function')?coachDefaultLoadSeedForMovement(label,targetReps):null;
  var seed=(rawSeed||rawSeed===0)&&typeof coachApplyUserLoadScale==='function'
    ? coachApplyUserLoadScale(label,rawSeed)
    : rawSeed;
  return load<15 && !!seed && load<(seed*0.20);
}

// ── Rampe de reference (priorite 2) ─────────────────────────────────────────
// Quand un mouvement n'a AUCUN historique reel loggé mais qu'une reference de
// travail existe pour la plage cible, le moteur prescrit une charge de travail
// SOUS le RM de reference et la fait monter sur le cycle (surcharge progressive
// planifiee). Un RM (ex. 215x8) n'est pas une charge de travail : programmer
// « 8-12 reps a 215 » = viser l'echec chaque serie. Semaine 1 part a reps en
// reserve (~RPE 7 ≈ 90-93% du RM), la derniere semaine de charge approche/
// depasse le RM (adaptation attendue sur le bloc). Des qu'une seance reelle est
// loggée, l'autoregulation (priorite 1) reprend la main.
// Les PR (source manual_pr) sont TOUJOURS exclus : un record n'est jamais une
// reference de travail. Anneaux reglables ici sans toucher au reste du moteur.
var COACH_REF_RAMP = {
  strength:    {start:0.90, end:1.02},
  hypertrophy: {start:0.93, end:1.05},
  endurance:   {start:0.90, end:1.03}
};

// Progression 0..1 dans les semaines de charge du cycle. weekIdx/totalWeeks
// sont des globals de l'app ; repli prudent hors app (tests, contextes isoles).
function coachCycleProgress01(){
  var wIdx=(typeof weekIdx==='function')?Number(weekIdx()):Math.max(0,(Number(state&&state.week)||1)-1);
  if(!(wIdx>=0))wIdx=0;
  var tw=(typeof totalWeeks==='function')?Number(totalWeeks()):0;
  // ~1 semaine de deload en fin de cycle : les semaines de charge sont tw-1.
  // Repli 5 semaines de charge si le cycle est inconnu.
  var loadingWeeks=tw>1?Math.max(1,tw-1):5;
  if(loadingWeeks<=1)return {progress:0,wIdx:wIdx,loadingWeeks:loadingWeeks};
  var p=wIdx/(loadingWeeks-1);
  if(p<0)p=0;if(p>1)p=1;
  return {progress:p,wIdx:wIdx,loadingWeeks:loadingWeeks};
}

// Reference de travail declaree pour une plage (PR exclus). Cherche d'abord la
// plage exacte ; sinon derive via 1RM Epley depuis une autre plage disponible.
function coachDeclaredRangeReference(mv,range,targetReps,label){
  // 1. athleteState (references saisies dans la grille + seances). Peut etre
  //    absent pour un client onboardé (voir fallback movementRefs plus bas).
  if(mv&&mv.ranges){
    var refLoad=function(r){var l=parseLoad(r&&r.currentLoad);if(l===null||l===undefined)l=Number(r&&r.currentLoad)||0;return Number(l)||0;};
    var isPrRef=function(r){return !!(r&&r.planned&&r.planned.source==='manual_pr');};
    var direct=mv.ranges[range];
    if(direct&&!isPrRef(direct)){
      var l=refLoad(direct);
      var reps=Number(direct.currentReps)||Number(direct.actualReps)||0;
      if(l>0)return {load:l,reps:reps||Number(targetReps)||0,range:range,exact:true};
    }
    /** @type {any} — rempli plus bas avec {oneRM}. */
    var best=null;
    ['strength','hypertrophy','endurance'].forEach(function(rg){
      var r=mv.ranges[rg];if(!r||isPrRef(r))return;
      var l=refLoad(r),reps=Number(r.currentReps)||Number(r.actualReps)||0;
      if(l>0&&reps>0){
        var oneRM=epley1RM(l,reps);
        if(oneRM>0&&(!best||oneRM>best.oneRM))best={oneRM:oneRM};
      }
    });
    if(best){
      var derived=estimateLoadForRepsFrom1RM(best.oneRM,Number(targetReps)||8);
      if(derived>0)return {load:derived,reps:Number(targetReps)||8,range:range,exact:false};
    }
  }
  // 2. Fallback: state.movementRefs (keyed mvKey__range) est semé par l'ONBOARDING
  // et les seances, et ne passe PAS par athleteState. Sans cette lecture, un
  // client fraichement onboardé n'aurait jamais son seed sous-le-RM (le moteur
  // retomberait sur le defaut programme x ratio, ~100% de la capacite). On
  // exclut les trophees 1RM (status "pr").
  if(typeof state!=='undefined'&&state&&state.movementRefs){
    var wantedRefLabels=(typeof coachMovementLookupLabels==='function')?coachMovementLookupLabels(label).map(coachNormalizeMoveText):[coachNormalizeMoveText(label)];
    var mvCfg=(typeof movements!=='undefined'&&movements)?movements:{};
    var refMovesToLabel=function(mvKey){
      var nm=mvCfg[mvKey]&&mvCfg[mvKey].name;
      return !!nm&&wantedRefLabels.indexOf(coachNormalizeMoveText(nm))>=0;
    };
    var rkeys=Object.keys(state.movementRefs),rExact=null,rBest=null;
    for(var ri=0;ri<rkeys.length;ri++){
      var e=state.movementRefs[rkeys[ri]];
      if(!e||e.implausible||e.status==='pr')continue;
      var eMvKey=e.movement||rkeys[ri].split('__')[0];
      if(!refMovesToLabel(eMvKey))continue;
      var eLoad=parseLoad(e.load);if(eLoad===null||eLoad===undefined)eLoad=Number(e.load)||0;
      if(!(eLoad>0))continue;
      var eReps=Number(e.reps)||0;
      var eRange=e.range||(eReps?repRange(eReps):null);
      if(eRange===range&&!rExact)rExact={load:eLoad,reps:eReps};
      if(eReps>0){var oneRMr=epley1RM(eLoad,eReps);if(oneRMr>0&&(!rBest||oneRMr>rBest.oneRM))rBest={oneRM:oneRMr};}
    }
    if(rExact)return {load:rExact.load,reps:rExact.reps||Number(targetReps)||0,range:range,exact:true};
    if(rBest){var dRef=estimateLoadForRepsFrom1RM(rBest.oneRM,Number(targetReps)||8);if(dRef>0)return {load:dRef,reps:Number(targetReps)||8,range:range,exact:false};}
  }
  return null;
}

// Charge de travail periodisee depuis une reference de plage.
function coachReferenceSeedWorkingLoad(declaredRef,range){
  if(!declaredRef||!(declaredRef.load>0))return null;
  var ramp=COACH_REF_RAMP[range]||COACH_REF_RAMP.hypertrophy;
  var cyc=coachCycleProgress01();
  var pct=ramp.start+(ramp.end-ramp.start)*cyc.progress;
  return {load:declaredRef.load*pct,pct:pct,progress:cyc.progress,wIdx:cyc.wIdx,loadingWeeks:cyc.loadingWeeks};
}

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
//  6. coachRuleLastSetGuards             — dernier set reel : saut max prudent, hausse graduelle, freins RPE >=8.5/>=9, projection Epley si ecart de reps.
//  6b. coachRuleRepSurplusLift           — reps DEPASSEES : projection Epley vers le HAUT (symetrique de la reduction du point 6).
//  6c. coachRuleSpeedStimulusBand        — bloc vitesse : derive lente vers le pourcentage cible du bloc, dans les deux sens.
//  7. coachRuleRecentHardBrake           — RPE eleve recent non resolu par une reference plus haute depuis : bloque.
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

  coachRuleContextLimited(ctx);
  coachRuleReferenceDeTravail(ctx);
  coachRuleLiftFromControlledHistory(ctx);
  coachRuleReferenceReelleValidee(ctx);
  coachRuleHistorySignalAdjustment(ctx);
  coachRuleLastSetGuards(ctx);
  coachRuleRepSurplusLift(ctx);
  coachRuleSpeedStimulusBand(ctx);
  coachRuleRecentHardBrake(ctx);
  coachRuleFloorValidation(ctx);
  if(typeof coachRuleCeilingCap==='function')coachRuleCeilingCap(ctx);
  coachRuleAthleteStateCap(ctx);
  coachRuleDeloadCap(ctx);
  coachRuleRoundingAndMovementCap(ctx);
  coachRuleContextLimitedRounding(ctx);

  return coachFinalizeSuggestionDecision(ctx);
}

function coachBuildSuggestionContext(nameOrKey,currentLoad,targetReps,context){
  var moveContext=(context&&context.label)?context:((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(nameOrKey,context||{}):null);
  var label=moveContext&&moveContext.label?moveContext.label:canonicalMovementLabel(nameOrKey);
  // Profil sans calibration : on ne bloque plus si son NIVEAU permet une
  // estimation bornée (cf. coachUncalibratedLevelRatio dans scaling.js). La
  // suggestion suit alors le chemin normal — mise à l'échelle, plancher
  // historique, prudence RPE, arrondi équipement — et ressort marquée
  // « surveillance » : c'est une estimation, pas une capacité mesurée.
  // Le blocage reste pour le seul cas où aucun repère n'existe.
  var uncalibrated=(typeof coachProfileNeedsCalibration==='function')&&coachProfileNeedsCalibration();
  if(uncalibrated){
    var levelRatio=(typeof coachUncalibratedLevelRatio==='function')?coachUncalibratedLevelRatio():0;
    if(!(levelRatio>0)){
      var calibrationMessage='Profil non calibré : complète la calibration avant d’utiliser les charges suggérées.';
      return {early:true,decision:{label:label,loadNum:null,loadText:calibrationMessage,blocked:true,severity:'watch',reason:'Profil client sans calibration.'}};
    }
  }
  var target=Number(targetReps)||8;
  var mv=athleteMovementRecord(label);
  var range=repRange(target);
  var cap=mv&&mv.ranges?(mv.ranges[range]||null):null;
  var histAll=(mv&&Array.isArray(mv.history))?mv.history:[];
  var hist=(typeof coachFilterHistoryForProgression==='function')?coachFilterHistoryForProgression(histAll,moveContext):histAll;

  hist=hist.filter(function(row){
    if(coachIsImplausibleLoadRow(label,row,target)){
      if(typeof coachLogWarn==='function')coachLogWarn('plausibility_filter', label+' : charge ignoree ('+coachHistoryLoadNumber(row)+' lb) — invraisemblable vs seed profil');
      return false;
    }
    return true;
  });

  var last=hist.length?hist[hist.length-1]:null;
  var lastLoad=coachHistoryLoadNumber(last);
  var lastHasValidLoad=last?coachHistoryHasValidLoad(last,label,moveContext):false;
  var lastRpe=last?coachHistoryRpeNumber(last):0;
  var bestControlled=coachRecentBestControlledLoad(hist,8.5,label,moveContext);
  var historySignal=(typeof coachBuildMovementHistorySignal==='function')?coachBuildMovementHistorySignal(label,hist,moveContext,target):null;
  // Charge ecrite en POURCENTAGE du 1RM (« 60-65 % », « ~60 % ») : ce ne sont
  // pas des livres. parseLoad() y attrape le premier nombre — « 75-82 % »
  // devenait 75 lb pour un Push Press a 75-82 % du 1RM, puis etait encore
  // multiplie par le ratio de profil. Un pourcentage se resout contre la
  // capacite reelle de l'athlete ; sans ancre fiable il ne vaut RIEN, et la
  // charge repart du chemin « non numerique » (historique, puis reperes) —
  // strictement mieux qu'un nombre de livres invente.
  var percentTarget=(typeof coachPercentTargetFromText==='function')
    ? ((moveContext&&moveContext.percentTarget)||coachPercentTargetFromText(currentLoad))
    : null;
  var percentAnchor=null;
  var programNum;
  if(percentTarget){
    percentAnchor=coachStrengthAnchorOneRm(label,mv);
    programNum=(percentAnchor&&percentAnchor.oneRm>0)
      ? roundLoadForExercise(label,percentAnchor.oneRm*percentTarget.aim,'nearest',currentLoad)
      : null;
  }else{
    programNum=parseLoad(currentLoad);
    if(programNum!==null&&programNum!==undefined){
      programNum=coachApplyUserLoadScale(label,programNum);
    }
  }
  var originalText=displayLoadForEquipment(label,currentLoad);
  var contextLimited=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(moveContext):false;
  var contextLimitReason=(typeof coachContextProgressionReason==='function')?coachContextProgressionReason(moveContext):'';
  var isDeload=coachIsDeloadWeekOrContext(moveContext);
  var seedReason="Charge du programme, arrondie selon l'equipement.";
  if(percentTarget&&programNum!==null&&programNum!==undefined){
    seedReason="Charge du programme en pourcentage ("+Math.round(percentTarget.aim*100)+" % du 1RM) resolue sur ta capacite reelle : "
      +Math.round(percentAnchor.oneRm)+" lb estimes (source "+percentAnchor.source+").";
  }
  if(programNum===null||programNum===undefined){
    // Déclaration rétablie : le refactor du filtre de vraisemblance
    // (coachIsImplausibleLoadRow) avait supprimé ce var mais laissé son usage
    // ci-dessous — ReferenceError pour tout profil sans historique sur un
    // mouvement à charge texte (« Poids du corps »…), vue de séance cassée.
    var genericSeedForFilter=coachDefaultLoadSeedForMovement(label,target);
    var seedFromReal=lastHasValidLoad?lastLoad:(((bestControlled&&bestControlled.load)||bestControlled&&bestControlled.load===0)?bestControlled.load:null);
    var seed;
    if(seedFromReal||seedFromReal===0){
      seed=seedFromReal;
    }else{
      seed=(genericSeedForFilter||genericSeedForFilter===0)?coachApplyUserLoadScale(label,genericSeedForFilter):null;
    }
    if(seed||seed===0){
      programNum=seed;
      seedReason=lastHasValidLoad
        ? "Charge de programme non numerique : suggestion basee sur la derniere charge historique."
        : ((bestControlled&&(bestControlled.load||bestControlled.load===0))
          ? "Charge de programme non numerique : suggestion basee sur l'historique controle."
          : "Charge de programme non numerique : suggestion basee sur les reperes d'equipement, ajustee a ton profil.");
    }else{
      storeLoadDecisionHint(label,originalText,"Charge non numerique et aucun historique/repere fiable trouve.","watch",hist,moveContext,'reperes');
      return {early:true,decision:{label:label,loadText:originalText,loadNum:null,severity:"watch",reason:"Charge non numerique et aucun historique/repere fiable trouve.",last:last,cap:cap}};
    }
  }

  return {early:false, ctx:{
    nameOrKey:nameOrKey, currentLoad:currentLoad, moveContext:moveContext, label:label,
    target:target, mv:mv, range:range, cap:cap, histAll:histAll, hist:hist,
    last:last, lastLoad:lastLoad, lastHasValidLoad:lastHasValidLoad, lastRpe:lastRpe,
    bestControlled:bestControlled, historySignal:historySignal, programNum:programNum,
    originalText:originalText, contextLimited:contextLimited, contextLimitReason:contextLimitReason,
    isDeload:isDeload, suggested:programNum, severity:"ok", reason:seedReason, mode:"nearest",
    // brainAdjusted — Trace explicite : passe a true chaque fois qu'une regle
    // depassant le simple arrondi equipement intervient (historique, RPE,
    // deload, cap contextuel). Remplace la detection par mots-cles sur
    // `reason` faite plus loin dans storeLoadDecisionHint : la source est ici
    // un fait connu, pas une supposition.
    brainAdjusted:false,
    // Profil sans calibration ayant reçu une estimation de niveau. La
    // suggestion sort du moteur normalement, mais elle ne doit jamais se
    // présenter comme une capacité mesurée : marquée en finalisation.
    uncalibrated:uncalibrated
  }};
}

function coachRuleContextLimited(ctx){
  if(ctx.contextLimited || isTechnicalMovement(ctx.label)){
    ctx.suggested=ctx.programNum;ctx.mode="nearest";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason=ctx.contextLimitReason || "Mouvement technique : pas d'auto-progression comme un mouvement principal.";
    ctx.brainAdjusted=true;
  }
}

// Sans aucune seance reelle, on ne part PAS du defaut programme x ratio (qui
// vise ~100% d'une capacite theorique, souvent issue d'un vieux max) : on part
// d'une reference de travail declaree pour la plage cible, periodisee SOUS le
// RM (rampe planifiee). Des qu'une seance reelle est loggée, hasRealHistory
// devient vrai et l'autoregulation (priorite 1, blocs ci-dessous) reprend la
// main. Les PR (manual_pr) sont exclus de la reference : jamais une charge de
// travail.
function coachRuleReferenceDeTravail(ctx){
  var hasRealHistory=ctx.hist.some(function(r){return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext);});
  ctx.hasRealHistory=hasRealHistory;
  if(!hasRealHistory&&!ctx.contextLimited&&!isTechnicalMovement(ctx.label)&&!ctx.isDeload){
    var declaredRef=coachDeclaredRangeReference(ctx.mv,ctx.range,ctx.target,ctx.label);
    var refSeed=declaredRef?coachReferenceSeedWorkingLoad(declaredRef,ctx.range):null;
    if(refSeed&&refSeed.load>0){
      ctx.suggested=refSeed.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Reference de travail "+Math.round(declaredRef.load)+" lb"+(declaredRef.exact?"":" (derivee)")
        +" : semaine "+(refSeed.wIdx+1)+"/"+refSeed.loadingWeeks+" a ~"+Math.round(refSeed.pct*100)+"% ("
        +Math.round(refSeed.load)+" lb), sous le RM. Rampe planifiee : pas de charge proche du RM pour un travail en "+ctx.range+".";
      ctx.brainAdjusted=true;
    }
  }
}

function coachLiftFromHistoryThreshold(label){
  var n=coachNormalizeMoveText(label);
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.liftFromHistoryThresholds)||{default:{gap:20,maxRpe:8},overrides:[]};
  for(var i=0;i<T.overrides.length;i++){
    if(T.overrides[i].pattern.test(n))return T.overrides[i];
  }
  return T.default;
}

// Exige au moins 2 entrees d'historique : un point unique (ex. le seed de calibrage/onboarding)
// n'est pas encore une "reference prouvee" — il ne doit pas a lui seul justifier de suggerer
// plus que ce que l'utilisateur vient juste d'etablir comme sa propre charge de depart.
function coachRuleLiftFromControlledHistory(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&ctx.hist.length>=2){
    var gap=ctx.bestControlled.load-ctx.suggested;
    var thr=coachLiftFromHistoryThreshold(ctx.label);
    var allowLiftFromHistory=gap>=thr.gap
      && (thr.maxRpe==null || ctx.bestControlled.rpe<=thr.maxRpe)
      && !isIsolationMovement(ctx.label)
      && !isTechnicalMovementInContext(ctx.label,ctx.moveContext);
    if(allowLiftFromHistory){
      // Se poser SUR la reference controlee, pas au-dessus. La hausse est
      // ensuite decidee par l'echelon RPE dans coachRuleLastSetGuards, comme
      // sur le chemin voisin coachRuleReferenceReelleValidee.
      // Avant V4.5.56 cette regle ajoutait +10 lb ici alors que le chemin
      // voisin repartait de la reference seche : les deux regles couvrent la
      // meme situation et ne se departageaient que par le seuil d'ecart
      // (liftFromHistoryThresholds.gap). Resultat, franchir ce seuil VERS LE
      // BAS faisait MONTER la suggestion — une charge de programme plus lourde
      // sortait une suggestion plus legere. Les deux chemins convergent
      // desormais sur la meme valeur.
      ctx.suggested=ctx.bestControlled.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Historique reel controle detecte : "+ctx.bestControlled.load+" lb x "+ctx.bestControlled.reps+" @RPE "+ctx.bestControlled.rpe+". Le moteur evite de sous-suggerer sous une reference facile.";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleReferenceReelleValidee(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&ctx.bestControlled.rpe<=8&&ctx.hist.length>=2){
    var bestReps=Number(ctx.bestControlled.reps)||0;
    if(!ctx.target||!bestReps||bestReps>=ctx.target||repRange(bestReps)===repRange(ctx.target)){
      ctx.suggested=ctx.bestControlled.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Reference reelle plus haute validee : "+ctx.bestControlled.load+" lb x "+(bestReps||ctx.target)+" @RPE "+ctx.bestControlled.rpe+". La prochaine suggestion repart de cette charge, pas de l'ancienne suggestion.";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleHistorySignalAdjustment(ctx){
  if(ctx.historySignal&&(ctx.historySignal.status==='blocked'||ctx.historySignal.status==='stalled')&&ctx.lastHasValidLoad&&ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastLoad;ctx.mode='down';ctx.severity='warning';
    ctx.reason=ctx.historySignal.reason;
    ctx.brainAdjusted=true;
  }else if(ctx.historySignal&&ctx.historySignal.status==='watch'&&ctx.suggested>ctx.programNum){
    ctx.severity=ctx.severity==='ok'?'watch':ctx.severity;
    ctx.reason=ctx.historySignal.reason;
    ctx.brainAdjusted=true;
  }
}

// Charge que l'evidence RPE de l'athlete MERITE : dernier poids + echelon du
// barreau, corrige par la reactivite, borne par le saut maximal prudent.
// Retourne lastLoad quand rien n'est merite. Une seule definition, utilisee a
// la fois par coachRuleLastSetGuards (qui la propose) et par le portail Brain
// (qui ne doit jamais descendre en dessous).
function coachRpeEarnedLoad(ctx){
  if(!ctx||!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return 0;
  if(ctx.contextLimited||ctx.isDeload)return ctx.lastLoad;
  var rung=coachRpeProgressionRung(ctx.label,ctx.lastRpe);
  if(!rung)return ctx.lastLoad;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  // Zero rep sorti n'est PAS « cible atteinte » : `!lastReps` est vrai pour 0
  // comme pour une ligne sans reps, et laisserait un echec total meriter une
  // hausse. On exige une serie reellement sortie.
  if(!(lastReps>0))return ctx.lastLoad;
  if(ctx.target&&lastReps<ctx.target)return ctx.lastLoad;
  // Un mouvement en recalibrage ou sous surveillance n'a rien merite non plus :
  // meme liste que le plancher de validation (coachRuleFloorValidation).
  var badStatuses=['recalibrating','watch','failed','major_fail','context_logged'];
  if(ctx.last.status&&badStatuses.indexOf(ctx.last.status)!==-1)return ctx.lastLoad;
  if(ctx.cap&&ctx.cap.status&&badStatuses.indexOf(ctx.cap.status)!==-1)return ctx.lastLoad;
  if(!ctx.hist||ctx.hist.length<2)return ctx.lastLoad;
  if(isTechnicalMovementInContext(ctx.label,ctx.moveContext))return ctx.lastLoad;
  var react=coachRpeReactivityShift(ctx.hist,ctx.lastLoad,lastReps,ctx.target);
  var steps=Math.max(0,rung.steps+react.shift);
  if(steps<=0)return ctx.lastLoad;
  var baseMaxJump=coachMaxJumpForExercise(ctx.label,ctx.lastLoad);
  var maxJump=Math.max(baseMaxJump,Math.round(baseMaxJump*rung.jumpFactor));
  var oneStep=nextLoadForExercise(ctx.label,ctx.lastLoad,1,ctx.currentLoad);
  var maxAllowed=Math.max(ctx.lastLoad+maxJump,(oneStep>ctx.lastLoad)?oneStep:0);
  var next=coachNextLoadSteps(ctx.label,ctx.lastLoad,steps,ctx.currentLoad);
  while(next>maxAllowed){
    var back=nextLoadForExercise(ctx.label,next,-1,ctx.currentLoad);
    if(!(back>ctx.lastLoad)||back>=next)break;
    next=back;
  }
  return (next>ctx.lastLoad&&next<=maxAllowed)?next:ctx.lastLoad;
}

function coachRuleLastSetGuards(ctx){
  if(!ctx.last)return;
  // Le saut maximal prudent devient fonction du RPE reel : une seance vecue
  // facile autorise un saut plus large, une seance limite garde le saut de
  // base. Les freins RPE >= 8.5 / >= 9 plus bas ne sont pas concernes.
  var rung=coachRpeProgressionRung(ctx.label,ctx.lastRpe);
  var baseMaxJump=coachMaxJumpForExercise(ctx.label,ctx.lastLoad);
  var maxJump=rung?Math.max(baseMaxJump,Math.round(baseMaxJump*rung.jumpFactor)):baseMaxJump;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var repsReached=!ctx.target || !lastReps || lastReps>=ctx.target;
  if(ctx.lastHasValidLoad&&ctx.lastRpe<=8&&ctx.suggested>ctx.lastLoad+maxJump){
    ctx.suggested=ctx.lastLoad+maxJump;ctx.mode="down";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason="Progression limitee : derniere reference "+ctx.lastLoad+" lb @RPE "+ctx.lastRpe+". Saut maximal prudent +"+maxJump+" lb.";
    ctx.brainAdjusted=true;
  }
  if(ctx.lastHasValidLoad&&ctx.lastRpe>0&&rung&&repsReached&&!ctx.contextLimited&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)&&!ctx.isDeload&&ctx.hist.length>=2){
    // Un plafond prudent plus petit que le plus petit cran disponible sur le
    // rack n'est pas de la prudence : il interdit la seule progression
    // possible. Cas reel (anterieur a V4.5.56) : Lateral Raise DB a 20 lb,
    // saut isolation 2 lb, haltere suivant 22,5 lb — le mouvement etait fige
    // definitivement. Le plafond ne descend donc jamais sous un cran.
    var oneStep=nextLoadForExercise(ctx.label,ctx.lastLoad,1,ctx.currentLoad);
    var maxAllowed=Math.max(ctx.lastLoad+maxJump, (oneStep>ctx.lastLoad)?oneStep:0);
    // Le barreau RPE donne l'ambition de base, la reactivite la corrige d'un
    // cran selon la tendance recente, puis le saut maximal rabote. Ordre
    // volontaire : le garde-fou passe toujours en dernier.
    var react=coachRpeReactivityShift(ctx.hist,ctx.lastLoad,lastReps,ctx.target);
    var steps=Math.max(0,rung.steps+react.shift);
    var next=steps>0?coachNextLoadSteps(ctx.label,ctx.lastLoad,steps,ctx.currentLoad):ctx.lastLoad;
    while(next>maxAllowed){
      var back=nextLoadForExercise(ctx.label,next,-1,ctx.currentLoad);
      if(!(back>ctx.lastLoad)||back>=next)break;
      next=back;
    }
    if(steps>0&&next&&next>ctx.lastLoad&&next<=maxAllowed){
      // Condition elargie : la charge meritee est un PLANCHER, pas seulement
      // un rattrapage quand le programme demande moins que la derniere seance.
      // Avant, la regle n'agissait que si `suggested <= lastLoad` : un
      // programme demandant 230 quand l'athlete avait merite 240 ne declenchait
      // rien, et le portail Brain redescendait ensuite a 225 — une charge de
      // programme plus lourde sortait une suggestion plus legere.
      if(ctx.suggested<next){
        ctx.suggested=next;ctx.mode="up";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
        ctx.reason="Progression prete : dernier "+ctx.lastLoad+" lb x "+(lastReps||ctx.target)+" @RPE "+ctx.lastRpe+". Hausse de "+steps+" cran"+(steps>1?"s":"")+" vers "+next+" lb"
          +(react.notes.length?" — "+react.notes.join(", "):"")+".";
        ctx.brainAdjusted=true;
      }
    }else if(steps<=0&&ctx.suggested<=ctx.lastLoad){
      // Barreau a zero cran (RPE 8, ou tendance qui durcit) : on maintient et
      // on le DIT, au lieu de laisser une zone morte silencieuse.
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Maintien a "+ctx.lastLoad+" lb : RPE "+ctx.lastRpe+" sur la derniere serie"
        +(react.notes.length?" — "+react.notes.join(", "):"")+". Confirme cette charge avant de monter.";
      ctx.brainAdjusted=true;
    }else if(ctx.suggested<=ctx.lastLoad){
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Progression prete, mais aucune charge superieure disponible/configuree dans le saut prudent autorise.";
      ctx.brainAdjusted=true;
    }
  }
  if(ctx.lastHasValidLoad&&ctx.lastRpe>=9 && ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastLoad;ctx.mode="down";ctx.severity="warning";
    ctx.reason="Bloque : dernier RPE reel "+ctx.lastRpe+" a "+ctx.lastLoad+" lb. Regle V51 : RPE >= 9 = aucune hausse automatique.";
    ctx.brainAdjusted=true;
  }else if(ctx.lastHasValidLoad&&ctx.lastRpe>=8.5 && coachLastSetIsSimilarOrHarder(ctx.target,lastReps) && ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastRpe>=9.5?Math.max(0,ctx.lastLoad-coachLoadStepForExercise(ctx.label,ctx.currentLoad)):ctx.lastLoad;ctx.mode="down";ctx.severity="warning";
    ctx.reason="Frein RPE : dernier RPE "+ctx.lastRpe+" sur une cible similaire ou plus dure. Maintenir ou reduire, pas augmenter.";
    ctx.brainAdjusted=true;
  }
  if(ctx.lastHasValidLoad&&lastReps>0&&ctx.target&&!ctx.contextLimited&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)){
    var repGap=ctx.target-lastReps;
    if(repGap>=3||ctx.target>=lastReps*2){
      var projOneRM=epley1RM(ctx.lastLoad,lastReps);
      var projCapacity=projOneRM?estimateLoadForRepsFrom1RM(projOneRM,ctx.target):0;
      if(projCapacity>0&&ctx.suggested>projCapacity){
        ctx.suggested=projCapacity;ctx.mode="down";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
        ctx.reason="Ecart de reps : dernier "+ctx.lastLoad+" lb x "+lastReps+" ne se traduit pas directement en "+ctx.target+" reps. Capacite estimee ~"+Math.round(projCapacity)+" lb (projection Epley).";
        ctx.brainAdjusted=true;
      }
    }
  }
}

// ── Surplus de reps : la capacite revelee, pas seulement l'ambition ────────
// Le moteur savait deja projeter Epley vers le BAS (fin de
// coachRuleLastSetGuards) : « dernier 135 x 2 pour 5 reps demandees » reduit
// la suggestion. La projection vers le HAUT n'existait pas. Consequence
// directe du bug signale : 135 x 2 @7 et 135 x 5 @7 sur une cible de 2 reps
// ne se separaient que par un cran forfaitaire de reactivite, alors qu'Epley
// dit 135 lb d'un cote et ~148 lb de l'autre pour la meme cible.
//
// La projection ne devient JAMAIS la suggestion telle quelle : on en franchit
// une part par seance (`converge`, reglee par intention), et le saut maximal
// prudent garde le dernier mot. Une seule performance ne fait pas bondir la
// barre — c'est un plancher qui monte, pas un bond.
function coachRepSurplusTuning(ctx){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.repsSurplus)||null;
  if(!T)return null;
  var byIntent=T.byIntent||{};
  var intents=(ctx&&ctx.moveContext&&Array.isArray(ctx.moveContext.intents))?ctx.moveContext.intents:[];
  for(var i=0;i<intents.length;i++){
    if(byIntent[intents[i]])return {tuning:byIntent[intents[i]],intent:intents[i],table:T};
  }
  return T.fallback?{tuning:T.fallback,intent:'',table:T}:null;
}

// Capacite projetee a la cible de reps depuis une serie qui a DEPASSE la cible.
// Retourne null quand il n'y a pas de surplus affirme, quand le RPE est trop
// haut pour croire la marge, ou quand le statut de la ligne l'interdit.
function coachRepSurplusProjection(ctx){
  if(!ctx||!ctx.last||!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return null;
  var picked=coachRepSurplusTuning(ctx);
  if(!picked)return null;
  var T=picked.table, tuning=picked.tuning;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var target=Number(ctx.target)||0;
  if(!(lastReps>0)||!(target>0)||lastReps<=target)return null;
  var ratio=lastReps/target;
  if(ratio<(Number(T.minRatio)||1.25))return null;
  if(!(ctx.lastRpe>0)||ctx.lastRpe>(Number(tuning.maxRpe)||8))return null;
  var blocking=T.blockingStatuses||[];
  if(ctx.last.status&&blocking.indexOf(ctx.last.status)!==-1)return null;
  if(ctx.cap&&ctx.cap.status&&blocking.indexOf(ctx.cap.status)!==-1)return null;
  var oneRm=epley1RM(ctx.lastLoad,lastReps);
  var capacity=oneRm?estimateLoadForRepsFrom1RM(oneRm,target):0;
  if(!(capacity>ctx.lastLoad))return null;
  var converge=Number(tuning.converge);
  if(!(converge>0))return null;
  return {
    capacity:capacity,
    ratio:ratio,
    lastReps:lastReps,
    intent:picked.intent,
    proposed:ctx.lastLoad+(capacity-ctx.lastLoad)*converge
  };
}

function coachRuleRepSurplusLift(ctx){
  // Le contexte limite (technique/WOD/light/vitesse) a sa propre porte :
  // coachRuleSpeedStimulusBand pour la vitesse, rien pour les autres. Un drill
  // technique ne merite pas de charge parce qu'il a fait des reps en plus.
  if(ctx.contextLimited||ctx.isDeload)return;
  if(isTechnicalMovementInContext(ctx.label,ctx.moveContext))return;
  if(!ctx.hist||ctx.hist.length<2)return;
  var proj=coachRepSurplusProjection(ctx);
  if(!proj)return;
  // Meme plafond que la hausse ordinaire : le saut maximal prudent, elargi au
  // plus par le barreau RPE. Un surplus de reps rend le moteur plus prompt a
  // utiliser la marge existante, il ne l'elargit pas (contrat de progression).
  var rung=coachRpeProgressionRung(ctx.label,ctx.lastRpe);
  var baseMaxJump=coachMaxJumpForExercise(ctx.label,ctx.lastLoad);
  var maxJump=rung?Math.max(baseMaxJump,Math.round(baseMaxJump*rung.jumpFactor)):baseMaxJump;
  var oneStep=nextLoadForExercise(ctx.label,ctx.lastLoad,1,ctx.currentLoad);
  var maxAllowed=Math.max(ctx.lastLoad+maxJump,(oneStep>ctx.lastLoad)?oneStep:0);
  var next=Math.min(proj.proposed,maxAllowed);
  if(!(next>ctx.suggested))return;
  ctx.suggested=next;
  ctx.mode="nearest";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Reps depassees : "+proj.lastReps+" reps pour "+ctx.target+" demandees a "+ctx.lastLoad
    +" lb @RPE "+ctx.lastRpe+". Capacite projetee ~"+Math.round(proj.capacity)+" lb sur "+ctx.target
    +" reps (Epley) : la charge etait sous-estimee, le moteur en franchit une partie.";
  ctx.brainAdjusted=true;
}

// ── Bloc vitesse : preserver le stimulus, pas la charge absolue ────────────
// Un bloc vitesse est prescrit en POURCENTAGE du 1RM. Une charge absolue
// ecrite dans un programme devient trop legere des que l'athlete progresse :
// « ~60 % » ecrit 145 lb pour l'athlete de reference finit a 47 % pour un
// athlete plus fort. Le moteur doit ramener la charge dans la bande declaree,
// LENTEMENT et dans les deux sens — jamais transformer un bloc vitesse en
// bloc lourd, jamais monter jusqu'a ce que le RPE grimpe.
//
// Ancre = capacite de force REELLE du mouvement, pas l'e1RM du set de vitesse
// lui-meme : une serie a RPE 7 sur un bloc vitesse n'est pas proche de
// l'echec, son e1RM sous-estime enormement. Sans ancre fiable, la regle ne
// fait rien : un historique incomplet garde le comportement d'avant.
// Sert aussi a resoudre une charge de programme ecrite en pourcentage
// (coachBuildSuggestionContext) : meme question, meme reponse.
function coachStrengthAnchorOneRm(label,mv){
  // 1. Capacite mesuree par le travail lourd reel (athlete_state). Les
  //    contextes limites n'ecrivent jamais `ranges` : ce qu'on lit ici vient
  //    donc bien d'un bloc principal, jamais du bloc vitesse lui-meme.
  var best=0,source='';
  var ranges=(mv&&mv.ranges)||null;
  if(ranges){
    Object.keys(ranges).forEach(function(rg){
      var r=ranges[rg];if(!r)return;
      var est=Number(r.estimated1RM)||0;
      if(!est){
        var l=parseLoad(r.currentLoad);if(l===null||l===undefined)l=Number(r.currentLoad)||0;
        est=epley1RM(l,Number(r.currentReps)||Number(r.actualReps)||0);
      }
      if(est>best){best=est;source='athlete_state';}
    });
  }
  // 2. References de travail saisies (state.movementRefs). Un trophee 1RM y
  //    est ici LEGITIME : on cherche une ancre de pourcentage, pas une charge
  //    de travail — contrairement a coachDeclaredRangeReference().
  if(!(best>0)&&typeof state!=='undefined'&&state&&state.movementRefs){
    var wanted=(typeof coachMovementLookupLabels==='function')
      ? coachMovementLookupLabels(label).map(coachNormalizeMoveText)
      : [coachNormalizeMoveText(label)];
    var mvCfg=(typeof movements!=='undefined'&&movements)?movements:{};
    Object.keys(state.movementRefs).forEach(function(k){
      var e=state.movementRefs[k];
      if(!e||e.implausible)return;
      var mvKey=e.movement||k.split('__')[0];
      var nm=mvCfg[mvKey]&&mvCfg[mvKey].name;
      if(!nm||wanted.indexOf(coachNormalizeMoveText(nm))<0)return;
      var l=parseLoad(e.load);if(l===null||l===undefined)l=Number(e.load)||0;
      var est=epley1RM(l,Number(e.reps)||1);
      if(est>best){best=est;source='reference';}
    });
  }
  // 3. Tests de calibration du profil (PR_FIELD_MAP). Deja des entrees du
  //    moteur (elles alimentent scaleRatios) : les relire ici n'ouvre aucune
  //    nouvelle source de donnees.
  if(!(best>0)&&typeof PR_FIELD_MAP==='object'&&typeof prCfgMatchesResult==='function'){
    var profile=(typeof state!=='undefined'&&state)?state.profile:null;
    if(profile){
      Object.keys(PR_FIELD_MAP).forEach(function(id){
        var cfg=PR_FIELD_MAP[id];
        if(!cfg||!cfg.profile||!prCfgMatchesResult(cfg,label))return;
        var v=Number(profile[cfg.profile])||0;
        if(!(v>0))return;
        var est=epley1RM(v,Number(cfg.reps)||1);
        if(est>best){best=est;source='profil';}
      });
    }
  }
  return best>0?{oneRm:best,source:source}:null;
}

// Part du saut maximal debloquee par ce que la derniere serie a montre.
// Cible juste atteinte = derive minimale ; reps depassees = marge complete.
// C'est ce qui separe 135 x 2 @7 de 135 x 5 @7 dans un bloc vitesse, ou la
// bande seule donnerait exactement la meme reponse aux deux.
function coachSpeedDriftFactor(T,lastReps,target){
  var D=(T&&T.drift)||{};
  var base=Number(D.base);
  if(!(base>0))base=0.5;
  if(!(lastReps>0)||!(target>0))return base;
  var ratio=lastReps/target;
  var ladder=D.surplus||[];
  for(var i=0;i<ladder.length;i++){
    if(ratio>=Number(ladder[i].minRatio)){
      var f=Number(ladder[i].factor);
      return (f>base)?f:base;
    }
  }
  return base;
}

// Une serie sortie proprement dans le bloc (RPE dans la cible, reps faites,
// statut sain) est un fait, pas une estimation : reproposer MOINS que ca,
// c'est exactement la charge figee qu'on corrige. Ce plancher ne demande donc
// aucune ancre de force — il ne fait que refuser de redescendre sous ce que
// l'athlete vient de faire. Sans lui, un athlete sans capacite de force
// connue restait bloque sur le nombre du programme meme apres l'avoir
// depasse proprement pendant des semaines.
function coachSpeedCleanFloor(ctx,T){
  if(!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return false;
  if(!(ctx.suggested<ctx.lastLoad))return false;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var blocking=(T&&T.blockingStatuses)||[];
  if(ctx.last&&ctx.last.status&&blocking.indexOf(ctx.last.status)!==-1)return false;
  if(!(ctx.lastRpe>0)||ctx.lastRpe>(Number(T&&T.maxRpe)||7.5))return false;
  if(ctx.target&&!(lastReps>=ctx.target))return false;
  ctx.suggested=ctx.lastLoad;
  ctx.mode="nearest";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Stimulus vitesse : "+ctx.lastLoad+" lb x "+lastReps+" @RPE "+ctx.lastRpe
    +" deja sorti proprement dans ce bloc. Le moteur ne redescend pas sous cette charge.";
  ctx.brainAdjusted=true;
  ctx.speedBandApplied=true;
  return true;
}

function coachRuleSpeedStimulusBand(ctx){
  var mc=ctx.moveContext;
  if(!mc||!mc.isSpeed||!mc.speedBand)return;
  // Un deload ne recalibre rien : sa charge basse est voulue.
  if(ctx.isDeload)return;
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.speedStimulus)||null;
  if(!T)return;
  // Plancher d'abord : il vaut AVEC comme SANS ancre.
  coachSpeedCleanFloor(ctx,T);
  var anchor=coachStrengthAnchorOneRm(ctx.label,ctx.mv);
  if(!anchor||!(anchor.oneRm>0))return; // aucune capacite connue : rien de plus.
  var band=mc.speedBand;
  // `aim` = le pourcentage que le bloc annonce (« ~60 % »). C'est vers lui que
  // la charge derive, pas vers le bas de la bande : s'arreter au plancher
  // laisserait le stimulus sous ce que le coach a ecrit. `ceil` reste le
  // garde-fou dur — au-dela, ce n'est plus un bloc vitesse.
  var aim=anchor.oneRm*(Number(band.aim)||band.min);
  var ceil=anchor.oneRm*band.max;
  var maxJump=coachMaxJumpForExercise(ctx.label,ctx.lastHasValidLoad?ctx.lastLoad:ctx.suggested);
  var pctOf=function(v){return Math.round((v/anchor.oneRm)*100);};

  // ── Sens BAS : un bloc vitesse ne devient jamais un bloc lourd. ──────────
  // Protection, donc pas conditionnee a l'historique — mais bornee au meme
  // saut maximal pour ne jamais s'effondrer d'un coup.
  if(ctx.suggested>ceil){
    // Reduire une charge que l'athlete a REELLEMENT portee se fait par
    // paliers : un effondrement brutal casse la confiance dans la suggestion.
    // Mais une charge jamais portee n'est qu'un nombre ecrit dans un
    // programme : la ramener d'un coup dans la bande ne coute rien, et la
    // faire descendre de 10 lb par seance laissait le bloc lourd pendant des
    // semaines — une protection qui protege trop tard n'en est pas une.
    var dejaPortee=(Array.isArray(ctx.hist)?ctx.hist:[]).some(function(r){
      return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext)&&coachHistoryLoadNumber(r)>=ctx.suggested;
    });
    var down=dejaPortee?Math.max(ceil,ctx.suggested-maxJump):ceil;
    if(down<ctx.suggested){
      ctx.suggested=down;
      ctx.mode="down";
      ctx.severity=ctx.severity==="critical"?ctx.severity:"watch";
      ctx.reason="Stimulus vitesse : "+pctOf(down)+" % du 1RM estime ("+Math.round(anchor.oneRm)
        +" lb). Au-dela de "+Math.round(band.max*100)+" % ce n'est plus de la vitesse — charge ramenee dans la bande.";
      ctx.brainAdjusted=true;
      ctx.speedBandApplied=true;
    }
    return;
  }

  if(!(ctx.suggested<aim))return; // deja a la cible du bloc : rien a faire.

  // ── Sens HAUT : uniquement sur preuve loggee dans CE contexte. ───────────
  var rows=(Array.isArray(ctx.hist)?ctx.hist:[]).filter(function(r){
    return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext)&&coachHistoryRepsNumber(r)>0;
  });
  if(rows.length<(Number(T.minHistoryRows)||1))return;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var blocking=T.blockingStatuses||[];
  var statusOk=!(ctx.last&&ctx.last.status&&blocking.indexOf(ctx.last.status)!==-1);
  var rpeOk=ctx.lastRpe>0&&ctx.lastRpe<=(Number(T.maxRpe)||7.5);
  var repsOk=!ctx.target||lastReps>=ctx.target;

  // Protection du stimulus : barre lente, technique degradee ou reps non
  // sorties = on ne monte plus, et on plafonne a la charge qui vient d'etre
  // portee. C'est la limite qui separe « charge trop facile pour produire le
  // stimulus » de « monter jusqu'a ce que le RPE devienne eleve » : sous la
  // bande cible ou pas, un bloc vitesse qui grince ne monte pas.
  if(!ctx.lastHasValidLoad||!statusOk||!rpeOk||!repsOk){
    if(ctx.lastHasValidLoad&&ctx.lastLoad>0){
      if(ctx.suggested>ctx.lastLoad){ctx.suggested=ctx.lastLoad;ctx.mode="down";}
      ctx.severity=(ctx.severity==="critical")?ctx.severity:"warning";
      ctx.reason="Stimulus vitesse protege : derniere serie "+ctx.lastLoad+" lb x "+(lastReps||0)
        +" @RPE "+(ctx.lastRpe||"?")+" — barre plus assez rapide ou cible non sortie. Aucune hausse vers la bande "
        +Math.round(band.min*100)+"-"+Math.round(band.max*100)+" % tant que ce n'est pas propre.";
      ctx.brainAdjusted=true;
      ctx.speedBandApplied=true;
    }
    return;
  }

  // Jamais moins que ce que l'athlete vient de faire proprement dans ce bloc :
  // c'est exactement la charge figee que le programme reproposait.
  var base=Math.max(ctx.suggested,ctx.lastLoad);
  if(base>=aim){
    if(base>ctx.suggested){
      ctx.suggested=base;ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Stimulus vitesse : "+ctx.lastLoad+" lb deja sorti proprement ("+pctOf(base)+" % du 1RM estime). Le moteur ne redescend pas sous cette charge.";
      ctx.brainAdjusted=true;ctx.speedBandApplied=true;
    }
    return;
  }
  var converge=Number(T.converge)||0.5;
  var allowed=maxJump*coachSpeedDriftFactor(T,lastReps,ctx.target);
  var stepUp=Math.min((aim-base)*converge,allowed);
  var next=Math.min(base+stepUp,aim);
  if(!(next>ctx.suggested))return;
  ctx.suggested=next;
  ctx.mode="nearest";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Stimulus vitesse sous-charge : "+Math.round(base)+" lb = "+pctOf(base)+" % du 1RM estime ("
    +Math.round(anchor.oneRm)+" lb, source "+anchor.source+"), le bloc vise "+Math.round(band.min*100)+"-"
    +Math.round(band.max*100)+" %. Rapprochement progressif vers "+Math.round(aim)+" lb"
    +(lastReps>ctx.target?" — "+lastReps+" reps pour "+ctx.target+" demandees":"")+".";
  ctx.brainAdjusted=true;
  ctx.speedBandApplied=true;
}

function coachRuleRecentHardBrake(ctx){
  if(!ctx.contextLimited&&!ctx.isDeload){
    var recentHardBrake=coachRecentUnresolvedHighRpeBrake(ctx.hist,ctx.label,ctx.moveContext,ctx.target,ctx.suggested);
    if(recentHardBrake&&ctx.suggested>recentHardBrake.load){
      ctx.suggested=recentHardBrake.rpe>=9.5?Math.max(0,recentHardBrake.load-coachLoadStepForExercise(ctx.label,ctx.currentLoad)):recentHardBrake.load;
      ctx.mode="down";ctx.severity="warning";
      ctx.reason="Frein RPE recent : "+recentHardBrake.load+" lb a deja coute RPE "+recentHardBrake.rpe+" sans reference plus haute controlee depuis. Pas de hausse automatique vers "+ctx.programNum+" lb.";
    }
  }
}

// Plancher historique : un dernier set reellement reussi (reps cibles atteintes,
// pas un echec/recalibrage) ne doit jamais etre sous-suggere, meme apres les
// freins RPE generiques ci-dessus (qui ne plafonnent qu'une hausse). Place en
// dernier pour avoir le dernier mot : un frein peut traiter un poids plus
// lourd reussi au meme RPE comme "non resolu" et faire retomber suggested
// sous ce plancher, ce qui doit etre corrige ici.
function coachRuleFloorValidation(ctx){
  if(!ctx.contextLimited&&!ctx.isDeload&&!isTechnicalMovement(ctx.label)&&ctx.last&&ctx.lastHasValidLoad){
    var floorReps=coachHistoryRepsNumber(ctx.last);
    var floorRepsReached=!ctx.target||!floorReps||floorReps>=ctx.target;
    var floorBadStatuses=['recalibrating','watch','failed','major_fail','context_logged'];
    var floorStatusOk=!ctx.last.status||floorBadStatuses.indexOf(ctx.last.status)===-1;
    var lastRpeFloor=coachHistoryRpeNumber(ctx.last);
    var histForFloor=Array.isArray(ctx.hist)?ctx.hist:[];
    var prevForFloor=histForFloor.length>=2?histForFloor[histForFloor.length-2]:null;
    var prevRpeFloor=coachHistoryRpeNumber(prevForFloor);
    var prevLoadFloor=coachHistoryLoadNumber(prevForFloor);
    var consecutiveHardOnSameLoad=lastRpeFloor>=9&&prevRpeFloor>=9&&prevLoadFloor>=ctx.lastLoad;
    if(floorRepsReached&&floorStatusOk&&ctx.suggested<ctx.lastLoad&&!consecutiveHardOnSameLoad){
      ctx.suggested=ctx.lastLoad;ctx.mode="nearest";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      if(lastRpeFloor>=9){
        ctx.reason="Brain — Plancher de validation : "+ctx.lastLoad+" lb x "+(floorReps||ctx.target)+" valide, mais confort faible (RPE "+lastRpeFloor+"). Maintien pour consolidation; aucune hausse automatique.";
      }else{
        ctx.reason="Brain — Plancher maitrise : "+ctx.lastLoad+" lb x "+(floorReps||ctx.target)+" valide avec confort acceptable. Brain evite de redescendre sans signal durable.";
      }
    }
  }
}

function coachRuleAthleteStateCap(ctx){
  if(ctx.cap&&(ctx.cap.status==="recalibrating"||ctx.cap.status==="watch"||Number(ctx.cap.confidence||1)<0.55)){
    var capLoadRaw=(ctx.cap.currentLoad!==undefined&&ctx.cap.currentLoad!==null)?ctx.cap.currentLoad:ctx.cap.actualLoad;
    var capLoad=parseLoad(capLoadRaw);
    if(capLoad===null||capLoad===undefined)capLoad=Number(capLoadRaw)||0;
    var hasCapLoad=(capLoad||capLoad===0);
    // Ne pas laisser un cap faible ecraser une reference reelle controlee clairement superieure.
    // La reference doit etre PLUS RECENTE que le cap — ce que la raison affichee
    // affirmait deja sans que la condition le verifie. Sans ce test, un echec
    // total (0 rep) posait bien un cap "recalibrating", mais une seance
    // controlee ANTERIEURE le faisait ignorer : le moteur reproposait la charge
    // qui venait d'echouer. Une reference d'avant l'echec ne prouve plus rien.
    var capDate=String((ctx.cap&&ctx.cap.lastUpdated)||"");
    var controlledDate=String((ctx.bestControlled&&ctx.bestControlled.row&&ctx.bestControlled.row.date)||"");
    var controlledIsNewer=!capDate||!controlledDate||controlledDate>capDate;
    // Ecart exige pour ignorer un cap faible : le plus petit de l'absolu et du
    // relatif, plancher a un cran d'equipement. Table : COACH_MOVEMENT_TUNING.
    // athleteStateCap (un +15 lb en dur rendait cette porte inatteignable sur
    // un mouvement dont la plage de travail tient dans 20-40 lb).
    var capT=((window.COACH_MOVEMENT_TUNING||{}).athleteStateCap||{}).ignoreLowCap||{absoluteGap:15,relativeGap:0.15,maxRpe:8.5};
    var capStep=(typeof coachLoadStepForExercise==='function')?coachLoadStepForExercise(ctx.label,ctx.currentLoad):5;
    // Plancher a un cran : sur une charge minuscule, 15 % ne valent presque
    // rien et n'importe quelle seance franchirait la porte — le cap ne
    // protegerait plus personne.
    var capGap=Math.max(capStep, Math.min(Number(capT.absoluteGap)||15, capLoad*(Number(capT.relativeGap)||0.15)));
    var ignoreLowCap=ctx.bestControlled&&hasCapLoad&&ctx.bestControlled.load>=capLoad+capGap&&ctx.bestControlled.rpe<=(Number(capT.maxRpe)||8.5)&&controlledIsNewer;
    if(hasCapLoad&&capLoad>0&&ctx.suggested>capLoad&&!ignoreLowCap){ctx.suggested=capLoad;ctx.mode="down";ctx.severity="warning";ctx.reason="Mouvement sous surveillance dans athlete_state : charge cappee jusqu'a confirmation.";}
    else if(ignoreLowCap&&!ctx.isDeload){ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;ctx.reason="Cap athlete_state ignore : historique reel controle plus recent/plus fiable que le cap faible.";}
  }
}

function coachRuleDeloadCap(ctx){
  var deloadDecision=coachApplyDeloadCap(ctx.suggested,ctx.label,ctx.moveContext,ctx.hist,ctx.lastHasValidLoad?ctx.lastLoad:null,ctx.bestControlled,ctx.programNum);
  if(deloadDecision.changed){
    ctx.suggested=deloadDecision.value;
    ctx.mode="nearest";
    ctx.severity=ctx.severity==="critical"?ctx.severity:"watch";
    ctx.reason=deloadDecision.reason;
  }
}

function coachRuleRoundingAndMovementCap(ctx){
  ctx.rounded=roundLoadForExercise(ctx.label,ctx.suggested,ctx.mode,ctx.currentLoad);
  var mvProgCap=(typeof coachGetMovementProgressionCap==="function")?coachGetMovementProgressionCap(ctx.label):null;
  ctx.mvProgCap=mvProgCap;

  if(mvProgCap && ctx.last && ctx.lastHasValidLoad){
    var isFridayCtx=(typeof coachIsFridayContext==="function") && coachIsFridayContext();
    var baseForCap=ctx.lastLoad;

    if(mvProgCap.fridayUsesWeekBest && isFridayCtx){
      var eb=coachRecentBestControlledLoad(ctx.hist, 8, ctx.label, ctx.moveContext);
      if(eb && eb.load>baseForCap && eb.rpe<=8) baseForCap=eb.load;
    }

    var maxJumpCap=(ctx.lastRpe<=8) ? (mvProgCap.maxJumpWhenEasy||0) : (mvProgCap.maxJumpWhenHard||0);
    var cappedByMv=roundLoadForExercise(ctx.label, baseForCap+maxJumpCap, "down", ctx.currentLoad);
    if(!cappedByMv && cappedByMv!==0) cappedByMv=baseForCap+maxJumpCap;

    if(ctx.rounded>cappedByMv){
      ctx.rounded=cappedByMv;
      if(ctx.rounded>ctx.lastLoad && ctx.lastRpe>=9) ctx.rounded=ctx.lastLoad; // sécurité RPE
      ctx.severity="warning";
      ctx.reason=ctx.label+" : cap de progression +"+maxJumpCap+" lb"
        +(isFridayCtx && mvProgCap.fridayUsesWeekBest ? " (référence semaine vendredi)" : "")
        +".";
    }
  }
  if(ctx.last&&ctx.lastHasValidLoad&&ctx.lastRpe>=9&&ctx.rounded>ctx.lastLoad&&!(mvProgCap&&coachIsFridayContext())){
    ctx.rounded=roundLoadForExercise(ctx.label,ctx.lastLoad,"down",ctx.currentLoad)||ctx.lastLoad;
    ctx.brainAdjusted=true;
  }
}

function coachRuleContextLimitedRounding(ctx){
  // Un bloc vitesse est un contexte limite, mais sa charge suit un
  // pourcentage cible : re-clamper sur le nombre du programme annulerait
  // exactement la recalibration de coachRuleSpeedStimulusBand.
  if(ctx.speedBandApplied)return;
  if(ctx.contextLimited&&ctx.rounded>ctx.programNum){
    ctx.rounded=roundLoadForExercise(ctx.label,ctx.programNum,"nearest",ctx.currentLoad)||ctx.programNum;
    ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason=ctx.contextLimitReason||ctx.reason;
    ctx.brainAdjusted=true;
  }
}

function coachFinalizeSuggestionDecision(ctx){
  // Estimation de niveau : jamais présentée comme une capacité mesurée. La
  // sévérité ne peut plus redescendre à « ok » tant que le profil n'est pas
  // calibré, et la raison le dit — c'est ce que lit le bouton (!).
  if(ctx.uncalibrated){
    ctx.severity=(ctx.severity==="ok")?"watch":ctx.severity;
    ctx.reason="Estimation d'après le niveau déclaré : profil non calibré. Calibre pour des charges à ta mesure.";
    ctx.uncalibratedApplied=true;
  }
  var text=coachFormatSuggestedLoad(ctx.label,ctx.rounded,ctx.originalText,'');
  if(ctx.severity==="warning"||ctx.severity==="critical")text += " ⚠";
  var decision={label:ctx.label,loadText:text,loadNum:ctx.rounded,severity:ctx.severity,reason:ctx.reason,last:ctx.last,cap:ctx.cap,historySignal:ctx.historySignal};
  // Le portail Brain s'applique aussi quand une regle a pose un « watch ».
  // Avant, la condition etait severity === 'ok' seule : toute regle levant une
  // simple surveillance court-circuitait le portail, si bien qu'une charge de
  // programme PLUS LOURDE pouvait sortir une suggestion PLUS LEGERE (programme
  // 225 -> 230 donnait 230 puis 225). Le chemin le plus confiant recevait le
  // traitement le plus prudent, l'inverse de l'intention.
  // 'warning' et 'critical' restent exclus : un frein dur a deja reduit la
  // charge, le portail n'a rien a y ajouter.
  var gateOpen = (ctx.severity==='ok' || ctx.severity==='watch');
  var earnedFloor = (typeof coachRpeEarnedLoad==='function') ? coachRpeEarnedLoad(ctx) : 0;
  if(typeof coachBrainApplyStatsGate==='function' && ctx.lastHasValidLoad && ctx.rounded>ctx.lastLoad && gateOpen && !ctx.contextLimited && !ctx.isDeload){
    decision=coachBrainApplyStatsGate(decision,ctx.label,ctx.hist,ctx.moveContext,ctx.target,ctx.lastLoad,earnedFloor);
    decision.loadText=coachFormatSuggestedLoad(ctx.label,decision.loadNum,ctx.originalText,'');
    if((decision.severity==='warning'||decision.severity==='critical')&&decision.loadText.indexOf('⚠')<0)decision.loadText+=' ⚠';
    ctx.brainAdjusted=true;
  }
  var explicitSource=ctx.brainAdjusted?'brain':'moteur';
  storeLoadDecisionHint(ctx.label,decision.loadText,decision.reason,decision.severity,ctx.hist,ctx.moveContext,explicitSource);
  try{
    if(decision.brainStats && window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
      var bk=coachNormalizeMoveText(ctx.label);
      if(window.__coachLoadHints[bk])window.__coachLoadHints[bk].brainStats=decision.brainStats;
    }
  }catch(e){}
  return decision;
}

function plannedMapFromSessionExercises(){
  var map={};
  try{
    collectSessionExercises().forEach(function(it){
      if(!it||it.isWod)return;
      var label=movementLabelFromKeyOrName(it.key||it.name);
      var plannedLoad=parseLoad(it.suggested);
      var targetMin=Number(it.targetMin)||0;
      var targetMax=Number(it.targetMax)||targetMin||0;
      var ctx=(typeof coachBuildMovementContext==='function'?coachBuildMovementContext(it.name||it.key,{kind:it.kind,format:it.format,note:it.note,text:it.text,blockTitle:it.blockTitle,load:it.load,pctOf1RM:it.pctOf1RM,day:(state&&state.day),week:(state&&state.week)}):null);
      map[it.key]={name:label,load:plannedLoad,reps:targetMin||targetMax, targetMin:targetMin, targetMax:targetMax, format:it.format||"", kind:it.kind||"", context:ctx, bodyweightMovement:(typeof coachIsBodyweightExternalLoadMovement==='function'?coachIsBodyweightExternalLoadMovement(label,ctx):false)};
      map[label]=map[it.key];
      map[normalizeExerciseName(label)]=map[it.key];
    });
  }catch(e){}
  return map;
}

function classifyPerformance(actual, planned){
  var load=parseLoad(actual.load), reps=Number(actual.reps)||0, rpe=Number(actual.rpe)||0;
  var label=(planned&&planned.name)||(actual&&actual.name)||'';
  var bodyweightMovement=!!(planned&&planned.bodyweightMovement) || (typeof coachIsBodyweightExternalLoadMovement==='function'&&coachIsBodyweightExternalLoadMovement(label,planned&&planned.context));
  var hasLoad=(load>0)||(load===0&&bodyweightMovement);
  var targetReps=Number((planned&&planned.reps)||actual.targetMin||actual.targetMax)||reps||1;
  var ratio=targetReps?reps/targetReps:1;
  var status="logged";
  // Echec total : la charge a ete engagee et aucune rep n'est sortie. C'est le
  // signal d'echec le plus fort qui existe, et il ne depend pas du RPE saisi —
  // l'athlete qui repose la barre ne pense pas toujours a noter 10. Sans cette
  // branche, un 0 rep restait "logged", donc non memorise par
  // updateAthleteStateFromResults(), et le moteur reproposait la charge exacte
  // qui venait d'echouer.
  if(hasLoad&&!reps)status="major_fail";
  else if(hasLoad&&reps&&rpe>=9.5&&ratio<0.60)status="major_fail";
  else if(hasLoad&&reps&&rpe>=9&&ratio<1)status="failed";
  else if(hasLoad&&reps&&rpe<=7&&ratio>=1)status="easy_success";
  else if(hasLoad&&reps&&rpe>=9)status="hard_success";
  else if(hasLoad&&reps)status="success";
  return {status:status,ratio:Math.round(ratio*100)/100,targetReps:targetReps};
}

// Classement d'une ligne de resultat par rapport a ce qui etait prescrit.
// Extrait de enrichSessionResults() pour rester la seule ecriture de status /
// performanceRatio / coachNote : une correction de seance passee
// (scripts/session/history_edit.js) doit reclasser exactement comme la saisie
// du jour, sans recopier ces regles ailleurs.
function applyPerformanceClassification(r, planned){
  if(!r||!planned)return r;
  var c=classifyPerformance(r,planned);
  r.status=c.status;r.performanceRatio=c.ratio;
  if(c.status==="major_fail")r.coachNote="Echec majeur : niveau probablement surestime aujourd'hui. Recalibrage requis.";
  else if(c.status==="failed")r.coachNote="Echec partiel : ne pas monter la charge avant confirmation.";
  else if(r.coachNote!==undefined)delete r.coachNote;
  return r;
}

function enrichSessionResults(results){
  var plan=plannedMapFromSessionExercises();
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod||r.load===undefined||r.load===null||r.load==='')return;
    var lookup=plan[key]||plan[movementLabelFromKeyOrName(key)]||plan[normalizeExerciseName(key)]||null;
    if(lookup){
      r.planned={load:lookup.load||null,reps:lookup.reps||null,targetMin:lookup.targetMin||null,targetMax:lookup.targetMax||null,format:lookup.format||"",kind:lookup.kind||"",context:lookup.context||null,bodyweightMovement:lookup.bodyweightMovement||false};
      applyPerformanceClassification(r,lookup);
    }
  });
  return results;
}

function updateAthleteStateFromResults(results,dateStr){
  var ast=ensureAthleteState();
  dateStr=dateStr||new Date().toLocaleDateString("fr-CA");
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod||r.load===undefined||r.load===null||r.load==='')return;
    var load=parseLoad(r.load), reps=Number(r.reps)||0, rpe=Number(r.rpe)||0;
    var label=movementLabelFromKeyOrName(key);
    var planned=r.planned||{};
    var resultContext=planned.context||((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(label,{kind:planned.kind,format:planned.format,day:(state&&state.day),week:(state&&state.week)}):null);
    var bodyweightMovement=!!planned.bodyweightMovement || (typeof coachIsBodyweightExternalLoadMovement==='function'&&coachIsBodyweightExternalLoadMovement(label,resultContext));
    var hasValidLoad=(load>0)||(load===0&&bodyweightMovement);
    // Un 0 rep n'est un echec que s'il a ete SAISI. Un champ reps absent est une
    // ligne incomplete, pas une tentative ratee : on continue de l'ignorer.
    var repsProvided=(r.reps!==undefined&&r.reps!==null&&String(r.reps).trim()!=='');
    var failedAttempt=hasValidLoad&&!reps&&repsProvided;
    if(!hasValidLoad||(!reps&&!failedAttempt))return;
    var limitedResultContext=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(resultContext):false;
    var targetReps=Number(planned.reps||planned.targetMin)||reps;
    // La plage vient des reps PRESCRITES quand rien n'est sorti : repRange(0)
    // renverrait "strength" et classerait un 8-reps rate dans la mauvaise plage.
    // Sans prescription connue (mouvement hors programme, resultat non enrichi),
    // on classe dans la plage ou le mouvement est REELLEMENT travaille — sa fiche
    // la plus recente. Une plage par defaut ferait atterrir le cap a cote : un
    // Back Squat travaille en force verrait son echec classe en hypertrophie, et
    // la suggestion des 5 reps ignorerait le cap.
    var range;
    if(reps||targetReps){
      range=repRange(reps||targetReps);
    }else{
      var knownRanges=(ast.movements[label]&&ast.movements[label].ranges)||{};
      var newestRange="",newestRangeDate="";
      Object.keys(knownRanges).forEach(function(rk){
        var d=String((knownRanges[rk]&&knownRanges[rk].lastUpdated)||"");
        if(!newestRange||d>newestRangeDate){newestRange=rk;newestRangeDate=d;}
      });
      range=newestRange||repRange(8);
    }
    var cls=classifyPerformance(r,{name:label,context:resultContext,bodyweightMovement:bodyweightMovement,reps:targetReps,targetMin:planned.targetMin,targetMax:planned.targetMax});
    var oneRM=epley1RM(load,reps);
    var capacityLoad=load;
    var confidence=0.65;
    var status=cls.status;
    if(failedAttempt){
      // Epley n'a aucun signal ici (epley1RM(load,0)=0) : le laisser piloter la
      // recalibration ecrirait une capacite de 0 lb dans athlete_state. On
      // repart de la meilleure charge recente REELLEMENT maitrisee sous la
      // charge echouee ; sans historique exploitable, repli prudent sur un
      // pourcentage de la charge tentee (COACH_MOVEMENT_TUNING).
      var prevMv=ast.movements[label];
      var controlled=(typeof coachRecentBestControlledLoad==='function')
        ? coachRecentBestControlledLoad((prevMv&&prevMv.history)||[], 8.5, label, resultContext)
        : null;
      var fallbackPct=((window.COACH_MOVEMENT_TUNING||{}).failedAttemptMultiplier)||0.80;
      var recovered=(controlled&&controlled.load>0&&controlled.load<load)?controlled.load:(load*fallbackPct);
      capacityLoad=roundLoadForExercise(label, recovered, "down")||roundLoadForExercise(label, recovered, "nearest")||load;
      confidence=0.30;
      status="recalibrating";
    }else if(cls.status==="major_fail"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.35;
      status="recalibrating";
    }else if(cls.status==="failed"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.50;
      status="watch";
    }else if(cls.status==="easy_success"){
      // Symetrie avec les branches d'echec ci-dessus : elles projettent deja
      // Epley vers le BAS quand les reps manquent. Une serie qui DEPASSE la
      // cible a RPE bas prouve, avec le meme calcul, une capacite superieure
      // a la charge portee — 135 lb x 5 pour 2 reps demandees vaut ~148 lb
      // sur 2 reps. Ecrire `load` tel quel effacait cette preuve : la memoire
      // de capacite restait a 135 lb et la seance suivante repartait de la.
      // Bornee au saut maximal prudent : une seule seance ne redefinit pas
      // une capacite d'un bond.
      capacityLoad=load;
      if(reps>targetReps&&targetReps>0&&oneRM){
        var surplusCapacity=estimateLoadForRepsFrom1RM(oneRM,targetReps);
        var surplusCeiling=load+((typeof coachMaxJumpForExercise==='function')?coachMaxJumpForExercise(label,load):10);
        if(surplusCapacity>load){
          var boundedCapacity=Math.min(surplusCapacity,surplusCeiling);
          capacityLoad=roundLoadForExercise(label,boundedCapacity,"down")||load;
          if(capacityLoad<load)capacityLoad=load;
        }
      }
      confidence=0.85;
      status="upgrade_ready";
    }else if(cls.status==="hard_success"){
      capacityLoad=load;
      confidence=0.70;
      status="hard";
    }
    if(!ast.movements[label]){
      ast.movements[label]={ranges:{},history:[],lastUpdated:null,status:"new"};
    }
    var mv=ast.movements[label];
    mv.ranges=mv.ranges||{};mv.history=mv.history||[];
    var prev=mv.ranges[range]||{};
    var prevMissing=!(prev.currentLoad||prev.currentLoad===0);
    var shouldReplace = prevMissing || cls.status==="major_fail" || cls.status==="failed" || load>=Number(prev.currentLoad||0) || confidence>Number(prev.confidence||0);
    if(shouldReplace && !limitedResultContext){
      mv.ranges[range]={
        currentLoad:capacityLoad,
        currentReps:targetReps,
        actualLoad:load,
        actualReps:reps,
        externalLoad:load,
        bodyweightMovement:bodyweightMovement,
        hasValidLoad:true,
        rpe:rpe,
        confidence:confidence,
        status:status,
        // Un echec total donne oneRM=0 : ne pas ecraser la derniere estimation
        // valide par un zero, qui ferait passer le mouvement pour inconnu. A
        // defaut d'estimation stockee (fiche ancienne ou migree), on la reconstruit
        // depuis la derniere performance reelle de la plage.
        estimated1RM:oneRM
          ?Math.round(oneRM)
          :(Number(prev.estimated1RM)||Math.round(epley1RM(Number(prev.actualLoad)||0,Number(prev.actualReps)||0))||0),
        lastUpdated:dateStr,
        planned:planned||null
      };
    }
    mv.status=status;
    mv.upgradedAt = (cls.status==="easy_success"||cls.status==="success"||cls.status==="hard_success") ? dateStr : (mv.upgradedAt||null);
    mv.lastUpdated=dateStr;
    mv.history.push({date:dateStr,load:load,externalLoad:load,bodyweightMovement:bodyweightMovement,hasValidLoad:true,reps:reps,rpe:rpe,range:range,status:limitedResultContext?'context_logged':status,capacityLoad:capacityLoad,planned:planned||null,context:resultContext||null});
    if(mv.history.length>12)mv.history=mv.history.slice(-12);
  });
  ast.updatedAt=nowIso();ast.version=APP_VERSION;
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
    function isDeloadRow(r){ return !!(r && (r.context === 'deload' || r.status === 'deload' || (r.planned && r.planned.deload))); }

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
    var hist = histAll.filter(function(r){ return !isDeloadRow(r) && !isCalibrationSeed(r) && !isImplausible(r) && rowLoad(r) > 0 && rowRpe(r) > 0; });
    if(!hist.length) return base.loadText;

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


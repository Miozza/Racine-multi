// @ts-check
// Coach Beurt - moteur de suggestions de charges : format, plausibilite et references de travail.
// Script global volontaire : pas de ES modules. Extrait de suggestion.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

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
//
// Une plage couvre plusieurs nombres de reps (strength = 1 a 5). Une reference
// de la bonne plage mais a d'autres reps n'est PAS une charge de la cible :
// un single a 300 lb n'est pas un 5RM a 300 lb. Mesure avant correction :
// case Force = 300 x 1, Back Squat 5x5 sans historique -> 270 lb suggeres
// (90 % du 1RM pour 5 reps). On la ramene donc aux reps cibles par Epley
// (300 x 1 -> ~265 en 5RM -> ~240 en debut de rampe).
function coachRefAtTargetReps(load,reps,targetReps){
  var t=Number(targetReps)||0;
  reps=Number(reps)||0;
  if(!(load>0)||!reps||!t||reps===t)return {load:load,reps:reps||t,converted:false};
  var derived=estimateLoadForRepsFrom1RM(epley1RM(load,reps),t);
  return (derived>0)?{load:derived,reps:t,converted:true,fromLoad:load,fromReps:reps}:{load:load,reps:reps,converted:false};
}
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
      if(l>0){var at=coachRefAtTargetReps(l,reps,targetReps);return {load:at.load,reps:at.reps,range:range,exact:!at.converted,from:at.converted?{load:l,reps:reps}:null};}
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
    if(rExact){var atR=coachRefAtTargetReps(rExact.load,rExact.reps,targetReps);return {load:atR.load,reps:atR.reps,range:range,exact:!atR.converted,from:atR.converted?{load:rExact.load,reps:rExact.reps}:null};}
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

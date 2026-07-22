// Coach Beurt - moteur de suggestions de charges.
// Script global volontaire : pas de ES modules.

function coachIsDeloadWeekOrContext(context){
  var weekNum=Number((context&&context.week)||(state&&state.week)||0)||0;
  if(weekNum===6)return true;
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
  if(/main|principal|prioritaire|force|strength/.test(n))return true;
  if(/strict press|front squat|back squat|bench press|barbell row|deadlift|power clean|hip thrust/.test(coachNormalizeMoveText(label))&&!isIsolationMovement(label))return true;
  return false;
}

function coachDeloadMultiplierForContext(label,context){
  return coachIsMainLoadContext(label,context)?0.85:0.80;
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
    var perHand=/\/\s*main/i.test(fallback)||family==='db';
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

function guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps,context){
  var moveContext=(context&&context.label)?context:((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(nameOrKey,context||{}):null);
  var label=moveContext&&moveContext.label?moveContext.label:canonicalMovementLabel(nameOrKey);
  if(typeof coachProfileNeedsCalibration==='function'&&coachProfileNeedsCalibration()){
    var calibrationMessage='Profil non calibré : complète la calibration avant d’utiliser les charges suggérées.';
    return {label:label,loadNum:null,loadText:calibrationMessage,blocked:true,severity:'watch',reason:'Profil client sans calibration.'};
  }
  var target=Number(targetReps)||8;
  var mv=athleteMovementRecord(label);
  var range=repRange(target);
  var cap=mv&&mv.ranges?(mv.ranges[range]||null):null;
  var histAll=(mv&&Array.isArray(mv.history))?mv.history:[];
  var hist=(typeof coachFilterHistoryForProgression==='function')?coachFilterHistoryForProgression(histAll,moveContext):histAll;

  // ── Filtre de vraisemblance : retire les charges invraisemblables de l'historique ──
  hist = hist.filter(function(row){
    if(coachIsImplausibleLoadRow(label,row,target)){
      if(typeof coachLogWarn === 'function') coachLogWarn('plausibility_filter', label + ' : charge ignoree (' + coachHistoryLoadNumber(row) + ' lb) — invraisemblable vs seed profil');
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
  var programNum=parseLoad(currentLoad);
  if(programNum!==null&&programNum!==undefined){
    programNum=coachApplyUserLoadScale(label,programNum);
  }
  var originalText=displayLoadForEquipment(label,currentLoad);
  var contextLimited=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(moveContext):false;
  var contextLimitReason=(typeof coachContextProgressionReason==='function')?coachContextProgressionReason(moveContext):'';
  var isDeload=coachIsDeloadWeekOrContext(moveContext);
  var seedReason="Charge du programme, arrondie selon l'equipement.";
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
      return{label:label,loadText:originalText,loadNum:null,severity:"watch",reason:"Charge non numerique et aucun historique/repere fiable trouve.",last:last,cap:cap};
    }
  }
  var suggested=programNum;
  var severity="ok";
  var reason=seedReason;
  var mode="nearest";
  // Trace explicite : passe a true chaque fois qu'une regle depassant le simple
  // arrondi equipement intervient (historique, RPE, deload, cap contextuel).
  // Remplace la detection par mots-cles sur `reason` faite plus loin dans
  // storeLoadDecisionHint : la source est ici un fait connu, pas une supposition.
  var brainAdjusted=false;

  if(contextLimited || isTechnicalMovement(label)){
    suggested=programNum;mode="nearest";severity=severity==="ok"?"watch":severity;
    reason=contextLimitReason || "Mouvement technique : pas d'auto-progression comme un mouvement principal.";
    brainAdjusted=true;
  }

  // ── Priorite 2 : reference de travail (aucun historique reel loggé) ────────
  // Sans aucune seance reelle, on ne part PAS du defaut programme x ratio (qui
  // vise ~100% d'une capacite theorique, souvent issue d'un vieux max) : on part
  // d'une reference de travail declaree pour la plage cible, periodisee SOUS le
  // RM (rampe planifiee). Des qu'une seance reelle est loggée, hasRealHistory
  // devient vrai et l'autoregulation (priorite 1, blocs ci-dessous) reprend la
  // main. Les PR (manual_pr) sont exclus de la reference : jamais une charge de
  // travail.
  var hasRealHistory=hist.some(function(r){return coachHistoryHasValidLoad(r,label,moveContext);});
  if(!hasRealHistory&&!contextLimited&&!isTechnicalMovement(label)&&!isDeload){
    var declaredRef=coachDeclaredRangeReference(mv,range,target,label);
    var refSeed=declaredRef?coachReferenceSeedWorkingLoad(declaredRef,range):null;
    if(refSeed&&refSeed.load>0){
      suggested=refSeed.load;
      mode="nearest";
      severity=severity==="ok"?"watch":severity;
      reason="Reference de travail "+Math.round(declaredRef.load)+" lb"+(declaredRef.exact?"":" (derivee)")
        +" : semaine "+(refSeed.wIdx+1)+"/"+refSeed.loadingWeeks+" a ~"+Math.round(refSeed.pct*100)+"% ("
        +Math.round(refSeed.load)+" lb), sous le RM. Rampe planifiee : pas de charge proche du RM pour un travail en "+range+".";
      brainAdjusted=true;
    }
  }

  // Si le programme est clairement sous l'historique reel controle, remonter vers la reference reelle.
  // Exige au moins 2 entrees d'historique : un point unique (ex. le seed de calibrage/onboarding)
  // n'est pas encore une "reference prouvee" — il ne doit pas a lui seul justifier de suggerer
  // plus que ce que l'utilisateur vient juste d'etablir comme sa propre charge de depart.
  if(!contextLimited && !isDeload && bestControlled&&bestControlled.load>suggested&&hist.length>=2){
    var gap=bestControlled.load-suggested;
    var n=coachNormalizeMoveText(label);
    var allowLiftFromHistory=false;
    if(/barbell row/.test(n)&&gap>=15)allowLiftFromHistory=true;
    else if(!isIsolationMovement(label)&&!isTechnicalMovementInContext(label,moveContext)&&gap>=20&&bestControlled.rpe<=8)allowLiftFromHistory=true;
    if(allowLiftFromHistory){
      suggested=Math.min(bestControlled.load+coachMaxJumpForExercise(label,bestControlled.load), bestControlled.load+10);
      mode="nearest";
      severity=severity==="ok"?"watch":severity;
      reason="Historique reel controle detecte : "+bestControlled.load+" lb x "+bestControlled.reps+" @RPE "+bestControlled.rpe+". Le moteur evite de sous-suggerer sous une reference facile.";
      brainAdjusted=true;
    }
  }

  if(!contextLimited && !isDeload && bestControlled&&bestControlled.load>suggested&&bestControlled.rpe<=8&&hist.length>=2){
    var bestReps=Number(bestControlled.reps)||0;
    if(!target||!bestReps||bestReps>=target||repRange(bestReps)===repRange(target)){
      suggested=bestControlled.load;
      mode="nearest";
      severity=severity==="ok"?"watch":severity;
      reason="Reference reelle plus haute validee : "+bestControlled.load+" lb x "+(bestReps||target)+" @RPE "+bestControlled.rpe+". La prochaine suggestion repart de cette charge, pas de l'ancienne suggestion.";
      brainAdjusted=true;
    }
  }

  if(historySignal&&(historySignal.status==='blocked'||historySignal.status==='stalled')&&lastHasValidLoad&&suggested>lastLoad){
    suggested=lastLoad;mode='down';severity='warning';
    reason=historySignal.reason;
    brainAdjusted=true;
  }else if(historySignal&&historySignal.status==='watch'&&suggested>programNum){
    severity=severity==='ok'?'watch':severity;
    reason=historySignal.reason;
    brainAdjusted=true;
  }

  if(last){
    var maxJump=coachMaxJumpForExercise(label,lastLoad);
    var lastReps=coachHistoryRepsNumber(last);
    var repsReached=!target || !lastReps || lastReps>=target;
    if(lastHasValidLoad&&lastRpe<=8&&suggested>lastLoad+maxJump){
      suggested=lastLoad+maxJump;mode="down";severity=severity==="ok"?"watch":severity;
      reason="Progression limitee : derniere reference "+lastLoad+" lb @RPE "+lastRpe+". Saut maximal prudent +"+maxJump+" lb.";
      brainAdjusted=true;
    }
    if(lastHasValidLoad&&lastRpe>0&&lastRpe<=7&&repsReached&&!contextLimited&&!isTechnicalMovementInContext(label,moveContext)&&!isDeload&&hist.length>=2){
      var next=nextLoadForExercise(label,lastLoad,1,currentLoad);
      var maxAllowed=lastLoad+maxJump;
      if(next&&next>lastLoad&&next<=maxAllowed){
        if(suggested<=lastLoad){
          suggested=next;mode="up";severity=severity==="ok"?"watch":severity;
          reason="Progression prete : dernier "+lastLoad+" lb x "+(lastReps||target)+" @RPE "+lastRpe+". Petite hausse vers la prochaine charge disponible.";
          brainAdjusted=true;
        }
      }else if(suggested<=lastLoad){
        severity=severity==="ok"?"watch":severity;
        reason="Progression prete, mais aucune charge superieure disponible/configuree dans le saut prudent autorise.";
        brainAdjusted=true;
      }
    }
    if(lastHasValidLoad&&lastRpe>=9 && suggested>lastLoad){
      suggested=lastLoad;mode="down";severity="warning";
      reason="Bloque : dernier RPE reel "+lastRpe+" a "+lastLoad+" lb. Regle V51 : RPE >= 9 = aucune hausse automatique.";
      brainAdjusted=true;
    }else if(lastHasValidLoad&&lastRpe>=8.5 && coachLastSetIsSimilarOrHarder(target,lastReps) && suggested>lastLoad){
      suggested=lastRpe>=9.5?Math.max(0,lastLoad-coachLoadStepForExercise(label,currentLoad)):lastLoad;mode="down";severity="warning";
      reason="Frein RPE : dernier RPE "+lastRpe+" sur une cible similaire ou plus dure. Maintenir ou reduire, pas augmenter.";
      brainAdjusted=true;
    }
    // Ecart de reps important entre la derniere reference et la cible (ex : 1RM ou
    // singulier récent utilisé tel quel pour suggérer un format type 5x5) : le poids
    // ne se transpose pas directement d'un nombre de reps a un autre. On ne plafonne
    // (jamais on ne remonte) la suggestion via une projection Epley que pour un ecart
    // suffisant, pour ne pas perturber les freins existants sur un ecart d'1 rep normal.
    if(lastHasValidLoad&&lastReps>0&&target&&!contextLimited&&!isTechnicalMovementInContext(label,moveContext)){
      var repGap=target-lastReps;
      if(repGap>=3||target>=lastReps*2){
        var projOneRM=epley1RM(lastLoad,lastReps);
        var projCapacity=projOneRM?estimateLoadForRepsFrom1RM(projOneRM,target):0;
        if(projCapacity>0&&suggested>projCapacity){
          suggested=projCapacity;mode="down";severity=severity==="ok"?"watch":severity;
          reason="Ecart de reps : dernier "+lastLoad+" lb x "+lastReps+" ne se traduit pas directement en "+target+" reps. Capacite estimee ~"+Math.round(projCapacity)+" lb (projection Epley).";
          brainAdjusted=true;
        }
      }
    }
  }

  if(!contextLimited&&!isDeload){
    var recentHardBrake=coachRecentUnresolvedHighRpeBrake(hist,label,moveContext,target,suggested);
    if(recentHardBrake&&suggested>recentHardBrake.load){
      suggested=recentHardBrake.rpe>=9.5?Math.max(0,recentHardBrake.load-coachLoadStepForExercise(label,currentLoad)):recentHardBrake.load;
      mode="down";severity="warning";
      reason="Frein RPE recent : "+recentHardBrake.load+" lb a deja coute RPE "+recentHardBrake.rpe+" sans reference plus haute controlee depuis. Pas de hausse automatique vers "+programNum+" lb.";
    }
  }

  // Plancher historique : un dernier set reellement reussi (reps cibles atteintes,
  // pas un echec/recalibrage) ne doit jamais etre sous-suggere, meme apres les
  // freins RPE generiques ci-dessus (qui ne plafonnent qu'une hausse). Place en
  // dernier pour avoir le dernier mot : un frein peut traiter un poids plus
  // lourd reussi au meme RPE comme "non resolu" et faire retomber suggested
  // sous ce plancher, ce qui doit etre corrige ici.
  if(!contextLimited&&!isDeload&&!isTechnicalMovement(label)&&last&&lastHasValidLoad){
    var floorReps=coachHistoryRepsNumber(last);
    var floorRepsReached=!target||!floorReps||floorReps>=target;
    var floorBadStatuses=['recalibrating','watch','failed','major_fail','context_logged'];
    var floorStatusOk=!last.status||floorBadStatuses.indexOf(last.status)===-1;
    // Exception : RPE >= 9 deux séances consécutives sur la même charge → baisse autorisée.
    var lastRpeFloor=coachHistoryRpeNumber(last);
    var histForFloor=Array.isArray(hist)?hist:[];
    var prevForFloor=histForFloor.length>=2?histForFloor[histForFloor.length-2]:null;
    var prevRpeFloor=coachHistoryRpeNumber(prevForFloor);
    var prevLoadFloor=coachHistoryLoadNumber(prevForFloor);
    var consecutiveHardOnSameLoad=lastRpeFloor>=9&&prevRpeFloor>=9&&prevLoadFloor>=lastLoad;
    if(floorRepsReached&&floorStatusOk&&suggested<lastLoad&&!consecutiveHardOnSameLoad){
      suggested=lastLoad;mode="nearest";severity=severity==="ok"?"watch":severity;
      if(lastRpeFloor>=9){
        reason="Brain — Plancher de validation : "+lastLoad+" lb x "+(floorReps||target)+" valide, mais confort faible (RPE "+lastRpeFloor+"). Maintien pour consolidation; aucune hausse automatique.";
      }else{
        reason="Brain — Plancher maitrise : "+lastLoad+" lb x "+(floorReps||target)+" valide avec confort acceptable. Brain evite de redescendre sans signal durable.";
      }
    }
  }

  if(cap&&(cap.status==="recalibrating"||cap.status==="watch"||Number(cap.confidence||1)<0.55)){
    var capLoadRaw=(cap.currentLoad!==undefined&&cap.currentLoad!==null)?cap.currentLoad:cap.actualLoad;
    var capLoad=parseLoad(capLoadRaw);
    if(capLoad===null||capLoad===undefined)capLoad=Number(capLoadRaw)||0;
    var hasCapLoad=(capLoad||capLoad===0);
    // Ne pas laisser un cap faible ecraser une reference reelle controlee clairement superieure.
    var ignoreLowCap=bestControlled&&hasCapLoad&&bestControlled.load>=capLoad+15&&bestControlled.rpe<=8.5;
    if(hasCapLoad&&capLoad>0&&suggested>capLoad&&!ignoreLowCap){suggested=capLoad;mode="down";severity="warning";reason="Mouvement sous surveillance dans athlete_state : charge cappee jusqu'a confirmation.";}
    else if(ignoreLowCap&&!isDeload){severity=severity==="ok"?"watch":severity;reason="Cap athlete_state ignore : historique reel controle plus recent/plus fiable que le cap faible.";}
  }

  var deloadDecision=coachApplyDeloadCap(suggested,label,moveContext,hist,lastHasValidLoad?lastLoad:null,bestControlled,programNum);
  if(deloadDecision.changed){
    suggested=deloadDecision.value;
    mode="nearest";
    severity=severity==="critical"?severity:"watch";
    reason=deloadDecision.reason;
  }

  var rounded=roundLoadForExercise(label,suggested,mode,currentLoad);
  // Cap de progression spécifique au mouvement (ex: Overhead Rope Extension)
  var mvProgCap = (typeof coachGetMovementProgressionCap === "function")
    ? coachGetMovementProgressionCap(label)
    : null;

  if (mvProgCap && last && lastHasValidLoad) {
    var isFridayCtx = (typeof coachIsFridayContext === "function") && coachIsFridayContext();
    var baseForCap = lastLoad;

    if (mvProgCap.fridayUsesWeekBest && isFridayCtx) {
      var eb = coachRecentBestControlledLoad(hist, 8, label, moveContext);
      if (eb && eb.load > baseForCap && eb.rpe <= 8) baseForCap = eb.load;
    }

    var maxJumpCap = (lastRpe <= 8)
      ? (mvProgCap.maxJumpWhenEasy || 0)
      : (mvProgCap.maxJumpWhenHard || 0);

    var cappedByMv = roundLoadForExercise(label, baseForCap + maxJumpCap, "down", currentLoad);
    if (!cappedByMv && cappedByMv !== 0) cappedByMv = baseForCap + maxJumpCap;

    if (rounded > cappedByMv) {
      rounded = cappedByMv;
      if (rounded > lastLoad && lastRpe >= 9) rounded = lastLoad; // sécurité RPE
      severity = "warning";
      reason = label + " : cap de progression +" + maxJumpCap + " lb"
        + (isFridayCtx && mvProgCap.fridayUsesWeekBest ? " (référence semaine vendredi)" : "")
        + ".";
    }
  }
  if(last&&lastHasValidLoad&&lastRpe>=9&&rounded>lastLoad&&!(mvProgCap&&coachIsFridayContext())){
    rounded=roundLoadForExercise(label,lastLoad,"down",currentLoad)||lastLoad;
    brainAdjusted=true;
  }
  if(contextLimited&&rounded>programNum){
    rounded=roundLoadForExercise(label,programNum,"nearest",currentLoad)||programNum;
    severity=severity==="ok"?"watch":severity;
    reason=contextLimitReason||reason;
    brainAdjusted=true;
  }
  var text=coachFormatSuggestedLoad(label,rounded,originalText,'');
  if(severity==="warning"||severity==="critical")text += " ⚠";
  var decision={label:label,loadText:text,loadNum:rounded,severity:severity,reason:reason,last:last,cap:cap,historySignal:historySignal};
  if(typeof coachBrainApplyStatsGate==='function' && lastHasValidLoad && rounded>lastLoad && severity==='ok' && !contextLimited && !isDeload){
    decision=coachBrainApplyStatsGate(decision,label,hist,moveContext,target,lastLoad);
    decision.loadText=coachFormatSuggestedLoad(label,decision.loadNum,originalText,'');
    if((decision.severity==='warning'||decision.severity==='critical')&&decision.loadText.indexOf('⚠')<0)decision.loadText+=' ⚠';
    brainAdjusted=true;
  }
  // Source explicite : fait connu a cet endroit, plus fiable qu'une detection
  // par mots-cles sur `decision.reason` faite en aval.
  var explicitSource=brainAdjusted?'brain':'moteur';
  storeLoadDecisionHint(label,decision.loadText,decision.reason,decision.severity,hist,moveContext,explicitSource);
  try{
    if(decision.brainStats && window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
      var bk=coachNormalizeMoveText(label);
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
      var ctx=(typeof coachBuildMovementContext==='function'?coachBuildMovementContext(it.name||it.key,{kind:it.kind,format:it.format,note:it.note,text:it.text,blockTitle:it.blockTitle,day:(state&&state.day),week:(state&&state.week)}):null);
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
  if(hasLoad&&reps&&rpe>=9.5&&ratio<0.60)status="major_fail";
  else if(hasLoad&&reps&&rpe>=9&&ratio<1)status="failed";
  else if(hasLoad&&reps&&rpe<=7&&ratio>=1)status="easy_success";
  else if(hasLoad&&reps&&rpe>=9)status="hard_success";
  else if(hasLoad&&reps)status="success";
  return {status:status,ratio:Math.round(ratio*100)/100,targetReps:targetReps};
}

function enrichSessionResults(results){
  var plan=plannedMapFromSessionExercises();
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod||r.load===undefined||r.load===null||r.load==='')return;
    var lookup=plan[key]||plan[movementLabelFromKeyOrName(key)]||plan[normalizeExerciseName(key)]||null;
    if(lookup){
      r.planned={load:lookup.load||null,reps:lookup.reps||null,targetMin:lookup.targetMin||null,targetMax:lookup.targetMax||null,format:lookup.format||"",kind:lookup.kind||"",context:lookup.context||null,bodyweightMovement:lookup.bodyweightMovement||false};
      var c=classifyPerformance(r,lookup);
      r.status=c.status;r.performanceRatio=c.ratio;
      if(c.status==="major_fail")r.coachNote="Echec majeur : niveau probablement surestime aujourd'hui. Recalibrage requis.";
      else if(c.status==="failed")r.coachNote="Echec partiel : ne pas monter la charge avant confirmation.";
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
    if(!hasValidLoad||!reps)return;
    var range=repRange(reps);
    var limitedResultContext=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(resultContext):false;
    var targetReps=Number(planned.reps||planned.targetMin)||reps;
    var cls=classifyPerformance(r,{name:label,context:resultContext,bodyweightMovement:bodyweightMovement,reps:targetReps,targetMin:planned.targetMin,targetMax:planned.targetMax});
    var oneRM=epley1RM(load,reps);
    var capacityLoad=load;
    var confidence=0.65;
    var status=cls.status;
    if(cls.status==="major_fail"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.35;
      status="recalibrating";
    }else if(cls.status==="failed"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.50;
      status="watch";
    }else if(cls.status==="easy_success"){
      capacityLoad=load;
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
        estimated1RM:Math.round(oneRM),
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
      safeDecision=coachBrainApplyStatsGate(safeDecision,label,hist,ctx,targetReps,lastLoad);
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


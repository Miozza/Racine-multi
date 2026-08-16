// @ts-check
// Coach Beurt - historique et signaux du moteur de charges.
// Script global volontaire : pas de ES modules.

function ensureAthleteState(){
  if(!state.athleteState)state.athleteState={movements:{},updatedAt:null,version:null};
  if(!state.athleteState.movements)state.athleteState.movements={};
  return state.athleteState;
}

function epley1RM(load,reps){load=Number(load)||0;reps=Number(reps)||0;if(!load||!reps)return 0;return load*(1+reps/30);}

function estimateLoadForRepsFrom1RM(oneRm,reps){oneRm=Number(oneRm)||0;reps=Number(reps)||1;if(!oneRm)return 0;return oneRm/(1+reps/30);}

function simpleStrengthIndexFromLoad(load){load=Number(load)||0;return Math.max(1,Math.round(load/12.5));}

function athleteMovementRecord(label){
  var ast=ensureAthleteState();
  var map=ast&&ast.movements?ast.movements:{};
  var labels=coachMovementLookupLabels(label);
  for(var a=0;a<labels.length;a++){
    if(map[labels[a]])return map[labels[a]];
  }
  var wantedList=labels.map(coachNormalizeMoveText).filter(Boolean);
  var keys=Object.keys(map||{});
  for(var i=0;i<keys.length;i++){
    var kn=coachNormalizeMoveText(keys[i]);
    for(var j=0;j<wantedList.length;j++){
      var wanted=wantedList[j];
      if(kn===wanted&&coachEquipmentCompatibleForAlias(label,keys[i]))return map[keys[i]];
    }
  }
  for(var k=0;k<keys.length;k++){
    var keyNorm=coachNormalizeMoveText(keys[k]);
    for(var w=0;w<wantedList.length;w++){
      var want=wantedList[w];
      if(want.length<8)continue;
      if(!coachEquipmentCompatibleForAlias(label,keys[k]))continue;
      if(keyNorm.indexOf(want)>=0 || want.indexOf(keyNorm)>=0)return map[keys[k]];
    }
  }
  return null;
}

function coachDefaultLoadSeedForMovement(label, targetReps){
  var labels=coachMovementLookupLabels(label);
  var defaults=(typeof officialCharges==='function')?officialCharges():(window.DEFAULT_CHARGES||{});
  for(var i=0;i<labels.length;i++){
    if(defaults&&defaults[labels[i]]){
      /** @type {any} — 'n' est redeclare plus bas en chaine (hoisting var). */
      var n=parseLoad(defaults[labels[i]]);
      if(n||n===0)return n;
    }
  }
  /** @type {any} — meme 'n' que plus haut (hoisting var), type different. */
  var n=coachNormalizeMoveText(labels.join(' '));
  var T=window.COACH_MOVEMENT_TUNING||{};
  return coachFirstMatchingTuningLoad(n, T.defaultLoadSeeds);
}

function coachHistoryContext(row){
  if(!row)return null;
  return row.context || (row.planned&&row.planned.context) || null;
}

function coachHistoryContextIsLimited(row){
  var ctx=coachHistoryContext(row);
  return (typeof coachIsLimitedProgressionContext==='function') ? coachIsLimitedProgressionContext(ctx) : false;
}

function coachIsBodyweightExternalLoadMovement(label, context){
  var raw=[label, context&&context.rawName, context&&context.label].filter(Boolean).join(' ');
  var n=coachNormalizeMoveText(raw);
  var T=window.COACH_MOVEMENT_TUNING||{};
  return coachMatchesAnyTuningPattern(n, T.bodyweightExternalLoadPatterns);
}

function coachHistoryRawLoadValue(row){
  if(!row)return null;
  var keys=['load','actualLoad','capacityLoad','externalLoad','currentLoad'];
  for(var i=0;i<keys.length;i++){
    if(Object.prototype.hasOwnProperty.call(row,keys[i]) && row[keys[i]]!=='' && row[keys[i]]!==null && row[keys[i]]!==undefined){
      var parsed=parseLoad(row[keys[i]]);
      if(parsed||parsed===0)return parsed;
      var n=Number(row[keys[i]]);
      if(Number.isFinite(n))return n;
    }
  }
  return null;
}

function coachHistoryLoadNumber(row){
  var v=coachHistoryRawLoadValue(row);
  return (v||v===0)?Number(v)||0:0;
}

function coachHistoryHasValidLoad(row,label,context){
  var v=coachHistoryRawLoadValue(row);
  if(!(v||v===0))return false;
  if(Number(v)>0)return true;
  return Number(v)===0 && coachIsBodyweightExternalLoadMovement(label, context||coachHistoryContext(row));
}

function coachHistoryRepsNumber(row){return Number(row&&(row.reps||row.actualReps||row.currentReps||0))||0;}

function coachHistoryRpeNumber(row){return Number(row&&row.rpe||0)||0;}

function coachMovementContextKey(ctx){
  if(!ctx)return '';
  var bits=[
    ctx.label||'',
    ctx.equipment||'',
    ctx.primaryIntent||'',
    ctx.kind||'',
    ctx.blockTitle||'',
    ctx.day||''
  ];
  return bits.map(coachNormalizeMoveText).join('|');
}

function coachShouldPreferContextMatch(label, ctx){
  var n=coachNormalizeMoveText((ctx&&ctx.label)||label||'');
  var T=window.COACH_MOVEMENT_TUNING||{};
  if(coachMatchesAnyTuningPattern(n, T.contextPreferenceMovementPatterns))return true;
  if(ctx&&(ctx.isWod||ctx.isTechnical||ctx.isLight||ctx.isRecovery||ctx.isRecall))return true;
  if(ctx&&Array.isArray(ctx.intents)&&ctx.intents.length)return ctx.intents.some(function(x){return /wod|technique|light|recovery|recall|progression/.test(x);});
  return false;
}

function coachLimitedContextFamilyMatches(rowCtx,currentCtx,label){
  var n=coachNormalizeMoveText((currentCtx&&currentCtx.label)||label||'');
  var T=window.COACH_MOVEMENT_TUNING||{};
  if(!coachMatchesAnyTuningPattern(n, T.limitedContextFamilyPatterns))return false;
  var rowLimitedSignal=!!(rowCtx&&(rowCtx.isWod||rowCtx.isTechnical||rowCtx.isLight||rowCtx.isRecovery||rowCtx.isProgression));
  var currentLimitedSignal=!!(currentCtx&&(currentCtx.isWod||currentCtx.isTechnical||currentCtx.isLight||currentCtx.isRecovery||currentCtx.isProgression));
  return rowLimitedSignal&&currentLimitedSignal;
}

function coachContextMatches(rowCtx, currentCtx, label){
  if(!rowCtx||!currentCtx)return true;
  var rowLimited=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(rowCtx):false;
  var currentLimited=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(currentCtx):false;
  if(rowLimited!==currentLimited)return false;
  if(rowLimited&&currentLimited&&coachLimitedContextFamilyMatches(rowCtx,currentCtx,label))return true;
  if(!coachShouldPreferContextMatch(label,currentCtx))return true;
  return coachMovementContextKey(rowCtx)===coachMovementContextKey(currentCtx);
}

function coachIsNonPerformanceSeed(row){
  var source=row&&row.planned&&row.planned.source;
  // manual_pr = record 1RM saisi (trophee date). C'est un maximum, souvent
  // ancien, jamais une charge de travail : le moteur ne doit JAMAIS le lire
  // comme une seance recente (sinon il projette ~1RM via Epley et surevalue
  // tout mouvement sans historique reel). Comme les autres seeds de calibrage,
  // il reste stocke pour l'affichage/trophee mais est exclu de la progression.
  return source==='manual_recalibration'||source==='manual_charge_override'||source==='manual_pr';
}

function resetManualChargeOverridesFromAthleteState(){
  var ast=state&&state.athleteState;
  var movements=ast&&ast.movements;
  if(!movements||typeof movements!=='object')return 0;
  var removed=0;
  Object.keys(movements).forEach(function(label){
    var movement=movements[label];
    if(!movement)return;
    if(Array.isArray(movement.history)){
      var before=movement.history.length;
      movement.history=movement.history.filter(function(row){return !(row&&row.planned&&row.planned.source==='manual_charge_override');});
      removed+=before-movement.history.length;
    }
    if(movement.ranges&&typeof movement.ranges==='object'){
      Object.keys(movement.ranges).forEach(function(range){
        var capacity=movement.ranges[range];
        if(capacity&&capacity.planned&&capacity.planned.source==='manual_charge_override'){
          delete movement.ranges[range];
          removed++;
        }
      });
    }
    if(movement.planned&&movement.planned.source==='manual_charge_override')delete movement.planned;
  });
  if(removed){
    ast.updatedAt=(typeof nowIso==='function')?nowIso():new Date().toISOString();
  }
  return removed;
}

function coachFilterHistoryForProgression(history, context){
  var rows=(Array.isArray(history)?history:[]).filter(function(row){return !(row&&row.implausible)&&!coachIsNonPerformanceSeed(row);});
  if(!context || typeof coachIsLimitedProgressionContext!=='function')return rows;
  var label=context&&context.label?context.label:'';
  var limited=coachIsLimitedProgressionContext(context);
  return rows.filter(function(row){
    var rowCtx=coachHistoryContext(row);
    if(!rowCtx)return true;
    var rowLimited=coachIsLimitedProgressionContext(rowCtx);
    if(limited!==rowLimited)return false;
    return coachContextMatches(rowCtx,context,label);
  });
}

function coachIsTechnicalOrLimitedMovement(name, context){
  if(context && typeof coachIsLimitedProgressionContext==='function' && coachIsLimitedProgressionContext(context))return true;
  return isTechnicalMovement(name);
}

function latestMovementHistory(label){
  var mv=athleteMovementRecord(label);
  var h=(mv&&Array.isArray(mv.history))?mv.history:[];
  return h.length?h[h.length-1]:null;
}

function coachRecentBestControlledLoad(history, maxRpe, label, context){
  var rows=Array.isArray(history)?history:[];
  var best=null;
  maxRpe=Number(maxRpe)||8.5;
  rows.forEach(function(r){
    var load=coachHistoryLoadNumber(r), reps=coachHistoryRepsNumber(r), rpe=coachHistoryRpeNumber(r);
    if(!coachHistoryHasValidLoad(r,label,context)||!rpe||rpe>maxRpe)return;
    var score=load*100+reps-(rpe>=8.5?10:0);
    if(!best||score>best.score)best={row:r,load:load,reps:reps,rpe:rpe,score:score};
  });
  return best;
}

function coachBuildMovementHistorySignal(label, history, context, targetReps){
  var rows=(Array.isArray(history)?history:[]).filter(function(row){return row&&coachHistoryHasValidLoad(row,label,context)&&coachHistoryRepsNumber(row);});
  var recent=rows.slice(-4);
  var last=recent.length?recent[recent.length-1]:null;
  var previous=recent.length>1?recent[recent.length-2]:null;
  var lastLoad=coachHistoryLoadNumber(last);
  var prevLoad=coachHistoryLoadNumber(previous);
  var lastRpe=coachHistoryRpeNumber(last);
  var target=Number(targetReps)||coachHistoryRepsNumber(last)||0;
  var highRpeCount=recent.filter(function(row){return coachHistoryRpeNumber(row)>=9;}).length;
  var controlledCount=recent.filter(function(row){var reps=coachHistoryRepsNumber(row), rpe=coachHistoryRpeNumber(row);return reps&&(!target||reps>=target)&&rpe>0&&rpe<=8;}).length;
  var stagnationCount=0;
  if(recent.length>=3){var stableLoad=coachHistoryLoadNumber(recent[recent.length-1]);stagnationCount=recent.filter(function(row){return coachHistoryLoadNumber(row)===stableLoad;}).length;}
  var direction='unknown';
  if(last&&previous){direction=lastLoad>prevLoad?'up':(lastLoad<prevLoad?'down':'flat');}
  var status='neutral';
  var reason='Historique insuffisant pour trancher.';
  if(lastRpe>=9.5||highRpeCount>=2){status='blocked';reason='Historique difficile : RPE eleve repete, hausse bloquee avant confirmation.';}
  else if(stagnationCount>=3&&controlledCount===0){status='stalled';reason='Stagnation detectee : meme charge repetee sans signal facile.';}
  else if(controlledCount>=2&&direction!=='down'){status='ready';reason='Historique controle : plusieurs references atteintes a RPE acceptable.';}
  else if(lastRpe>=9){status='watch';reason='Derniere reference difficile : maintenir avant de monter.';}
  else if(direction==='down'){status='watch';reason='Charge recente en baisse : verifier fatigue ou contexte avant progression.';}
  else if(last){status='watch';reason='Historique a confirmer avant decision agressive.';}
  return {label:label,rows:recent,last:last,previous:previous,lastLoad:lastLoad,previousLoad:prevLoad,lastRpe:lastRpe,highRpeCount:highRpeCount,controlledCount:controlledCount,stagnationCount:stagnationCount,direction:direction,status:status,reason:reason};
}

function coachMaxJumpForExercise(label,lastLoad){
  var n=coachNormalizeMoveText(label);
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.maxJumpBase)||{default:10,overrides:[]};
  var base=null;
  for(var i=0;i<T.overrides.length;i++){
    if(T.overrides[i].pattern.test(n)){base=T.overrides[i].base;break;}
  }
  if(base===null){
    base=isIsolationMovement(label)?(coachLoadStepForExercise(label,lastLoad||'')||5):T.default;
  }
  var factor=(typeof coachAggressivenessFactor==='function')?coachAggressivenessFactor(label):1;
  var step=coachLoadStepForExercise(label,lastLoad||'')||5;
  var jump=base;
  if(factor!==1){
    var scaled=Math.round((base*factor)/step)*step;
    jump=Math.max(step, scaled);
  }
  // Borne relative : voir COACH_MOVEMENT_TUNING.maxJumpBase.relativeCeiling.
  // Jamais sous un cran d'equipement — un plafond plus petit que le plus
  // petit pas disponible fige le mouvement au lieu de le proteger.
  var ceiling=Number(T.relativeCeiling);
  var ref=Number(lastLoad)||0;
  if(ceiling>0&&ref>0){
    // Plancher = le VRAI ecart jusqu'au cran suivant du rack, pas le pas
    // nominal. A 2,5 lb l'haltere suivant est a 5 (ecart 2,5) alors que le pas
    // nominal vaut 2 : un plafond de 2 aurait interdit le seul mouvement
    // possible et fige la charge — exactement le defaut qu'on corrige.
    var realStep=step;
    if(typeof nextLoadForExercise==='function'){
      var nx=nextLoadForExercise(label,ref,1,lastLoad||'');
      if(nx>ref)realStep=nx-ref;
    }
    var relative=Math.max(realStep, ref*ceiling);
    jump=Math.min(jump, relative);
  }
  return jump;
}

function coachIsFridayContext(){return !!(state&&String(state.day||'').toLowerCase()==='vendredi');}

function coachIsMondayContext(){return !!(state&&String(state.day||'').toLowerCase()==='lundi');}

function coachLoadStepForExercise(name,loadText){
  var rule=(typeof equipmentRuleForExercise==='function')?equipmentRuleForExercise(name,loadText):null;
  if(rule&&Array.isArray(rule.available)){
    var nums=rule.available.map(Number).filter(function(x){return !isNaN(x);}).sort(function(a,b){return a-b;});
    if(nums.length>1){var best=5;for(var i=1;i<nums.length;i++){var d=nums[i]-nums[i-1];if(d>0)best=Math.min(best,d);}return best;}
  }
  if(rule&&rule.step)return Number(rule.step)||5;
  return 5;
}

function isIsolationMovement(name){
  var n=coachNormalizeMoveText(name);
  var T=window.COACH_MOVEMENT_TUNING||{};
  return coachMatchesAnyTuningPattern(n, T.isolationPatterns);
}

function isTechnicalMovement(name){
  var n=coachNormalizeMoveText(name);
  var T=window.COACH_MOVEMENT_TUNING||{};
  return coachMatchesAnyTuningPattern(n, T.technicalPatterns);
}

function isTechnicalMovementInContext(name, context){
  return coachIsTechnicalOrLimitedMovement(name, context);
}

function storeLoadDecisionHint(name,loadText,reason,severity,history,context,explicitSource){
  window.__coachLoadHints=window.__coachLoadHints||{};
  var ctx=(context&&context.label)?context:((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(name,context||{}):null);
  var label=ctx&&ctx.label?ctx.label:canonicalMovementLabel(name);
  var rows=(history||[]).slice(-5).reverse().map(function(x){
    var load=coachHistoryRawLoadValue(x);
    // Origine de chaque ligne d'historique
    var origine = x._fromAthleteState ? 'Historique brut' : (x._fromML ? 'Brain local' : 'Historique brut');
    return{date:x.date||"?",load:(load||load===0)?load:"?",reps:x.reps||x.actualReps||x.currentReps||"?",rpe:x.rpe||"?",status:x.status||"",origine:origine};
  });

  // ── Déterminer la source de la suggestion ──────────────────────────────────
  // 'moteur'   : charge numérique venue du programme, arrondie équipement seulement
  // 'brain'    : ajustée par l'historique, RPE, caps, deload, garde-fous
  // 'reperes'  : pas d'historique fiable, on utilise les seeds par défaut
  //
  // Priorité : si l'appelant connaît la source (fait réel au moment de la
  // décision), on l'utilise directement. La détection par mots-clés sur
  // `reason` ne sert plus que de repli pour les appels qui ne la fournissent
  // pas encore — elle ne doit plus être la seule source de vérité.
  var source;
  if(explicitSource === 'moteur' || explicitSource === 'brain' || explicitSource === 'reperes'){
    source = explicitSource;
  }else{
    source = 'moteur';
    var reasonLow = String(reason||'').toLowerCase();
    if(reasonLow.indexOf('historique') >= 0 || reasonLow.indexOf('controle') >= 0 ||
       reasonLow.indexOf('rpe') >= 0 || reasonLow.indexOf('deload') >= 0 ||
       reasonLow.indexOf('prudence') >= 0 || reasonLow.indexOf('cap') >= 0 ||
       reasonLow.indexOf('garde') >= 0 || reasonLow.indexOf('bloque') >= 0 ||
       reasonLow.indexOf('maintien') >= 0 || reasonLow.indexOf('surveillance') >= 0 || reasonLow.indexOf('brain') >= 0 ||
       reasonLow.indexOf('validation') >= 0 || reasonLow.indexOf('hausse') >= 0 ||
       reasonLow.indexOf('option ambitieuse') >= 0){
      source = 'brain';
    }
    if(reasonLow.indexOf('repere') >= 0 || reasonLow.indexOf('equipement') >= 0 ||
       reasonLow.indexOf('aucun historique') >= 0 || reasonLow.indexOf('non numerique') >= 0){
      source = 'reperes';
    }
  }

  var payload={name:label,load:loadText,reason:reason||"Charge prévue par le programme.",severity:severity||"ok",rows:rows,source:source};
  if(ctx)payload.context={equipment:ctx.equipment||"",intent:ctx.primaryIntent||"",contextKey:coachMovementContextKey(ctx),intents:ctx.intents||[],kind:ctx.kind||"",blockTitle:ctx.blockTitle||"",day:ctx.day||"",week:ctx.week||""};
  var aliases=(typeof coachMovementLookupLabels==='function')?coachMovementLookupLabels(label):[label];
  aliases.forEach(function(a){ window.__coachLoadHints[coachNormalizeMoveText(a)]=payload; });
}


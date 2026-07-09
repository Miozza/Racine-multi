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
      var n=parseLoad(defaults[labels[i]]);
      if(n||n===0)return n;
    }
  }
  var n=coachNormalizeMoveText(labels.join(' '));
  if(/weighted pull up|weighted pullup|weighted dip|weighted dips/.test(n))return 0;
  if(/db shoulder press/.test(n))return 35;
  if(/lateral raise.*(cable|poulie)/.test(n))return 30;
  if(/lateral raise.*(haltere|dumbbell|db)/.test(n))return 20;
  if(/lateral raise/.test(n))return 20;
  if(/rear delt fly.*(cable|poulie)/.test(n))return 30;
  if(/rear delt fly.*(haltere|dumbbell|db)/.test(n))return 20;
  if(/rear delt fly/.test(n))return 20;
  if(/wide grip cable upright row|upright row/.test(n))return 50;
  if(/overhead rope extension/.test(n))return 50;
  if(/face pull/.test(n))return 60;
  if(/cable curl/.test(n))return 40;
  if(/power clean technique|power clean/.test(n))return 115;
  if(/db fly|dumbbell fly/.test(n))return 30;
  if(/db pullover|dumbbell pullover/.test(n))return 45;
  // V4.5 — repères ajoutés : mouvements des programmes publics qui n'avaient
  // aucun seed (le moteur restait aveugle sur charge textuelle sans historique).
  if(/single leg hip thrust/.test(n))return 95;
  if(/hip thrust/.test(n))return 225;
  if(/db rdl|romanian deadlift|stiff leg deadlift/.test(n))return 60;
  if(/goblet/.test(n))return 70;
  if(/front foot elevated|split squat|bulgarian/.test(n))return 40;
  if(/pull through/.test(n))return 70;
  if(/hip abduction/.test(n))return 25;
  if(/kb swing|kettlebell swing/.test(n))return 53;
  if(/step up|box step/.test(n))return 35;
  if(/farmer carry|farmer walk/.test(n))return 70;
  if(/db snatch/.test(n))return 50;
  if(/db thruster/.test(n))return 35;
  if(/thruster/.test(n))return 95;
  if(/wall ball/.test(n))return 20;
  if(/walking lunge|lunge/.test(n))return 35;
  if(/landmine/.test(n))return 70;
  if(/one arm db row|db row/.test(n))return 65;
  // Mouvements au poids du corps : seed 0 = pas de charge externe.
  if(/dead bug|hollow|plank|bird dog|band |mini band|glute bridge|dead hang/.test(n))return 0;
  if(/pull up|pullup|chin up|chest to bar|toes to bar|knee raise|muscle up/.test(n))return 0;
  if(/ring dip|dips|dip$|push up|pushup|air squat|sit up|situp|burpee|pistol|double under|handstand|wall walk|rope climb|ring row|scap|muscle up/.test(n))return 0;
  if(n === "run" || n === "row" || n === "bike")return 0; // cardio : pas de charge externe
  return null;
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
  return /weighted pull up|weighted pullup|weighted dip|weighted dips/.test(n);
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
  if(/overhead rope extension|face pull|power clean/.test(n))return true;
  if(ctx&&(ctx.isWod||ctx.isTechnical||ctx.isLight||ctx.isRecovery||ctx.isRecall))return true;
  if(ctx&&Array.isArray(ctx.intents)&&ctx.intents.length)return ctx.intents.some(function(x){return /wod|technique|light|recovery|recall|progression/.test(x);});
  return false;
}

function coachLimitedContextFamilyMatches(rowCtx,currentCtx,label){
  var n=coachNormalizeMoveText((currentCtx&&currentCtx.label)||label||'');
  if(!/power clean/.test(n))return false;
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

function coachFilterHistoryForProgression(history, context){
  var rows=Array.isArray(history)?history:[];
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
  var base;
  if(/bulgarian split squat/.test(n))base=10;
  else if(/hip thrust/.test(n))base=30;
  else if(/barbell row/.test(n))base=10;
  else if(/front squat|back squat|strict press|bench press|power clean/.test(n))base=10;
  else if(/db rdl/.test(n))base=10;
  else if(isIsolationMovement(label))base=coachLoadStepForExercise(label,lastLoad||'')||5;
  else base=10;
  var factor=(typeof coachAggressivenessFactor==='function')?coachAggressivenessFactor():1;
  if(factor===1)return base;
  var step=coachLoadStepForExercise(label,lastLoad||'')||5;
  var scaled=Math.round((base*factor)/step)*step;
  return Math.max(step, scaled);
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
  return /lateral raise|rear delt|curl|rope extension|pushdown|face pull|trap 3|serratus|calf|fly/.test(n);
}

function isTechnicalMovement(name){
  var n=coachNormalizeMoveText(name);
  return /technique|leger|light|warm up|warmup/.test(n) || n.indexOf("power clean technique")>=0;
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

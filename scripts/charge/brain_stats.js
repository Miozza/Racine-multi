// Racine — Brain V2 statistiques locales.
// Objectif : apprendre par mouvement + intention sans alourdir la saisie utilisateur.
// Script global volontaire : aucune API externe, aucune IA distante.

function coachBrainNumber(v){
  var n=Number(v);
  return isNaN(n)?0:n;
}
function coachBrainClamp(v,min,max){
  v=Number(v); if(isNaN(v))v=min;
  return Math.max(min,Math.min(max,v));
}
function coachBrainIntentKey(context,targetReps){
  context=context||{};
  var raw=[context.primaryIntent,context.kind,context.blockTitle,context.note,context.text,context.format].filter(Boolean).join(' ');
  var n=(typeof coachNormalizeMoveText==='function')?coachNormalizeMoveText(raw):String(raw||'').toLowerCase();
  var reps=Number(targetReps)||0;
  if(/deload|recovery|recuperation|reset|facile|easy/.test(n))return 'deload';
  if(/technique|vitesse|speed|skill|drill/.test(n))return 'technique';
  if(/wod|amrap|emom|for time|metcon|engine/.test(n))return 'conditioning';
  if(/puissance|power|explosive/.test(n))return 'power';
  if(/force|strength|main|principal|prioritaire/.test(n) || (reps>0&&reps<=6))return 'strength';
  if(/endurance|density|dense/.test(n) || reps>=15)return 'endurance';
  if(/hypertrophy|hypertrophie|volume|accessory|accessoire/.test(n) || (reps>=7&&reps<=14))return 'hypertrophy';
  return 'general';
}
function coachBrainSensitivity(label,context){
  var n=(typeof coachNormalizeMoveText==='function')?coachNormalizeMoveText(label):String(label||'').toLowerCase();
  var ctx=context||{};
  var bodyweight=false;
  try{ bodyweight=!!(typeof coachIsBodyweightExternalLoadMovement==='function'&&coachIsBodyweightExternalLoadMovement(label,ctx)); }catch(e){}
  if(bodyweight||/pull up|pull-up|chin up|chin-up|ring dip|weighted dip|muscle up|muscle-up|hspu|handstand push/.test(n))return 'high';
  if(/strict press|bench press|front squat|back squat|deadlift|power clean|clean|snatch/.test(n))return 'high';
  if(/barbell row|db rdl|bulgarian split squat|hip thrust/.test(n))return 'medium';
  if(typeof isIsolationMovement==='function'&&isIsolationMovement(label))return 'low';
  return 'medium';
}
function coachBrainRowLoad(r){return coachBrainNumber(r&&(r.load||r.externalLoad));}
function coachBrainRowReps(r){return coachBrainNumber(r&&(r.reps||r.actualReps||r.currentReps));}
function coachBrainRowRpe(r){return coachBrainNumber(r&&r.rpe);}
function coachBrainRpeSignal(rpe){
  rpe=Number(rpe)||0;
  if(!rpe)return {level:'unknown',weight:0.50,label:'RPE absent'};
  if(rpe<=7)return {level:'low',weight:1.00,label:'signal fiable bas'};
  if(rpe===8)return {level:'target8',weight:0.55,label:'RPE 8 interprete comme cible volontaire'};
  if(rpe===8.5)return {level:'moderate_high',weight:0.80,label:'signal utile'};
  if(rpe>=9.5)return {level:'max',weight:1.00,label:'signal maximal'};
  if(rpe>=9)return {level:'high',weight:1.00,label:'signal fort'};
  return {level:'medium',weight:0.70,label:'signal moyen'};
}
function coachBrainComfortFromRpe(rpe){
  rpe=Number(rpe)||0;
  if(!rpe)return 'unknown';
  if(rpe>=9)return 'low';
  if(rpe>=8.5)return 'moderate';
  if(rpe>=7.5)return 'good';
  return 'high';
}
function coachBrainRowIntent(r,targetReps){
  var ctx=(typeof coachHistoryContext==='function')?coachHistoryContext(r):(r&&(r.context||(r.planned&&r.planned.context)));
  return coachBrainIntentKey(ctx,targetReps||coachBrainRowReps(r));
}
function coachBrainRpeReliability(rows){
  rows=Array.isArray(rows)?rows:[];
  var rpes=rows.map(coachBrainRowRpe).filter(function(x){return x>0;});
  if(rpes.length<5)return {score:0.65,label:'personalized',reason:'Profil RPE en apprentissage : RPE 8 est traité prudemment, RPE 9+ comme signal fort.'};
  var counts={};
  rpes.forEach(function(r){var k=String(Math.round(r*2)/2);counts[k]=(counts[k]||0)+1;});
  var uniq=Object.keys(counts).length;
  var maxCount=Object.keys(counts).reduce(function(m,k){return Math.max(m,counts[k]);},0);
  var dominance=maxCount/rpes.length;
  var mean=rpes.reduce(function(a,b){return a+b;},0)/rpes.length;
  var variance=rpes.reduce(function(a,b){return a+Math.pow(b-mean,2);},0)/rpes.length;
  var sd=Math.sqrt(variance);
  var score=0.75;
  var label='good';
  var reason='RPE suffisamment varié : Brain le garde comme signal utile.';
  if(counts['8'] && counts['8']/rpes.length>=0.55){
    score=0.55; label='personalized';
    reason='Profil RPE personnalisé : RPE 8 revient souvent et reste un signal moyen; RPE 9+ garde un poids fort.';
  }else if(uniq<=2||dominance>=0.70||sd<0.35){
    score=0.50; label='compressed';
    reason='RPE compressé : Brain réduit le poids des valeurs répétées, mais respecte les RPE extrêmes.';
  }else if(uniq<=3||dominance>=0.55||sd<0.55){
    score=0.62; label='medium';
    reason='RPE moyennement discriminant : utile, mais secondaire.';
  }
  return {score:score,label:label,reason:reason,uniqueValues:uniq,dominance:Math.round(dominance*100)/100,sd:Math.round(sd*100)/100};
}
function coachBrainPredictionStats(rows,targetReps){
  rows=Array.isArray(rows)?rows:[];
  var tested=0, exactOrGood=0, under=0, over=0, humanOverrideDown=0, humanOverrideUp=0;
  rows.forEach(function(r){
    var planned=r&&r.planned||{};
    var pLoad=coachBrainNumber(planned.load);
    var pReps=coachBrainNumber(planned.reps||planned.targetMin||targetReps);
    var load=coachBrainRowLoad(r), reps=coachBrainRowReps(r);
    if(!(pLoad>0)||!(load>0)||!reps)return;
    if(Math.abs(load-pLoad)<=0.01){
      tested++;
      if(reps>=pReps)exactOrGood++;
      if(reps<pReps)under++;
      if(reps>=pReps+2)over++;
    }else if(load<pLoad){
      humanOverrideDown++;
    }else if(load>pLoad){
      humanOverrideUp++;
    }
  });
  var accuracy=tested?exactOrGood/tested:0.60;
  return {tested:tested,accuracy:Math.round(accuracy*100)/100,under:under,over:over,humanOverrideDown:humanOverrideDown,humanOverrideUp:humanOverrideUp};
}
function coachBrainProgressionStats(rows){
  rows=Array.isArray(rows)?rows:[];
  var loads=rows.map(coachBrainRowLoad).filter(function(x){return x>0;});
  if(loads.length<2)return {avgStep:0,trend:'unknown'};
  var diffs=[];
  for(var i=1;i<loads.length;i++)diffs.push(loads[i]-loads[i-1]);
  var ups=diffs.filter(function(d){return d>0;});
  var avg=ups.length?ups.reduce(function(a,b){return a+b;},0)/ups.length:0;
  var recent=loads[loads.length-1]-loads[0];
  return {avgStep:Math.round(avg*10)/10,totalDelta:Math.round(recent*10)/10,trend:recent>0?'up':(recent<0?'down':'flat')};
}
function coachBrainValidationCount(rows,lastLoad,targetReps){
  rows=Array.isArray(rows)?rows:[];
  var target=Number(targetReps)||0;
  var count=0;
  for(var i=rows.length-1;i>=0;i--){
    var r=rows[i];
    var load=coachBrainRowLoad(r), reps=coachBrainRowReps(r), rpe=coachBrainRowRpe(r);
    if(Math.abs(load-lastLoad)>0.01)break;
    if(reps && (!target||reps>=target) && (!rpe||rpe<=8.5))count++;
  }
  return count;
}
function coachBrainIsDeloadRow(r){ return !!(r && (r.context === 'deload' || r.status === 'deload' || (r.planned && r.planned.deload))); }
function coachBrainIsCalibrationSeed(r){ return (typeof coachIsNonPerformanceSeed==='function')?coachIsNonPerformanceSeed(r):!!(r&&r.planned&&(r.planned.source==='manual_recalibration'||r.planned.source==='manual_charge_override')); }
function coachBrainBuildStats(label,history,context,targetReps,proposedLoad,lastLoad){
  // Exclut les séances deload et les seeds de calibrage (1RM/5RM d'onboarding) :
  // ce ne sont pas des charges de travail normales. Sans ce filtre, une semaine
  // deload récente casse le compteur de validations et redemande des
  // confirmations sur une charge déjà maîtrisée. Filtre appliqué ici (et non
  // seulement chez l'appelant) pour rester valide quel que soit l'historique
  // transmis.
  var rows=(Array.isArray(history)?history:[]).filter(function(r){return r&&!coachBrainIsDeloadRow(r)&&!coachBrainIsCalibrationSeed(r)&&coachBrainRowLoad(r)>0&&coachBrainRowReps(r)>0;});
  var intent=coachBrainIntentKey(context,targetReps);
  var intentRows=rows.filter(function(r){return coachBrainRowIntent(r,targetReps)===intent;});
  if(intentRows.length<2)intentRows=rows.slice(-8);
  else intentRows=intentRows.slice(-8);
  var recent=intentRows.slice(-6);
  var sensitivity=coachBrainSensitivity(label,context);
  var rpeRel=coachBrainRpeReliability(rows.slice(-12));
  var pred=coachBrainPredictionStats(recent,targetReps);
  var prog=coachBrainProgressionStats(recent);
  var target=Number(targetReps)||0;
  var last=recent.length?recent[recent.length-1]:null;
  var lastRpe=coachBrainRowRpe(last);
  var lastReps=coachBrainRowReps(last);
  var highRpe=recent.filter(function(r){return coachBrainRowRpe(r)>=9;}).length;
  var shortfalls=recent.filter(function(r){var reps=coachBrainRowReps(r);return target&&reps&&reps<target;}).length;
  var confidence=0.55;
  confidence += Math.min(0.20,recent.length*0.035);
  confidence += (pred.accuracy-0.60)*0.25;
  if(pred.tested>=3)confidence += 0.08;
  if(sensitivity==='high')confidence -= 0.12;
  else if(sensitivity==='medium')confidence -= 0.05;
  if(highRpe>=2)confidence -= 0.10;
  if(shortfalls>=1)confidence -= 0.12;
  if(rpeRel.score<0.45)confidence -= 0.04; // RPE biaisé : on ne panique pas, on le dépriorise.
  confidence=coachBrainClamp(confidence,0.25,0.96);

  var ambition=0.60;
  if(pred.over>0)ambition+=Math.min(0.18,pred.over*0.06);
  if(pred.humanOverrideUp>0)ambition+=Math.min(0.16,pred.humanOverrideUp*0.05);
  if(pred.under>0)ambition-=Math.min(0.18,pred.under*0.07);
  if(pred.humanOverrideDown>=2)ambition-=0.08;
  if(sensitivity==='high')ambition-=0.08;
  if(/hip thrust/i.test(label))ambition+=0.07;
  ambition=coachBrainClamp(ambition,0.25,0.95);

  var required=1;
  var easyRecent=(lastRpe>0&&lastRpe<=7.5&&lastReps&&(!target||lastReps>=target));
  if(sensitivity==='high')required=2;
  if(confidence<0.85)required=Math.max(required,2);
  if(confidence<0.65)required=Math.max(required,3);
  if(shortfalls>0)required=Math.max(required,3);
  if(easyRecent&&sensitivity!=='high'&&shortfalls===0)required=1;
  if(ambition>0.78&&confidence>=0.70)required=Math.max(1,required-1);

  var validations=coachBrainValidationCount(recent,Number(lastLoad)||coachBrainRowLoad(last),target);
  var status='normal';
  if(confidence<0.65)status='uncertain';
  else if(confidence<0.85)status='confirm';
  else status='trusted';
  var built = {
    label:label,
    intent:intent,
    sensitivity:sensitivity,
    rows:recent,
    historyCount:recent.length,
    confidence:Math.round(confidence*100),
    confidenceRaw:confidence,
    ambition:Math.round(ambition*100),
    ambitionRaw:ambition,
    prediction:pred,
    progression:prog,
    rpeReliability:rpeRel,
    requiredConfirmations:required,
    validations:validations,
    lastRpe:lastRpe,
    lastRpeSignal:coachBrainRpeSignal(lastRpe),
    comfort:coachBrainComfortFromRpe(lastRpe),
    lastReps:lastReps,
    status:status,
    proposedLoad:Number(proposedLoad)||0,
    lastLoad:Number(lastLoad)||0
  };
  try{
    if(window.CoachBrainMemory && typeof CoachBrainMemory.enrichStats==='function') built = CoachBrainMemory.enrichStats(built) || built;
  }catch(e){}
  return built;
}
function coachBrainApplyStatsGate(decision,label,history,context,targetReps,lastLoad){
  if(!decision||!(decision.loadNum>0)||!(lastLoad>0))return decision;
  var proposed=Number(decision.loadNum)||0;
  if(proposed<=lastLoad)return decision;
  var stats=coachBrainBuildStats(label,history,context,targetReps,proposed,lastLoad);
  decision.brainStats=stats;
  var shouldGate=false;
  var level='watch';
  var extra='';
  if(stats.confidenceRaw<0.65){
    shouldGate=true;
    extra='Confiance de prediction faible ('+stats.confidence+'%).';
  }else if(stats.validations<stats.requiredConfirmations && stats.ambitionRaw<0.78){
    shouldGate=true;
    extra='Validation '+stats.validations+'/'+stats.requiredConfirmations+' avant hausse.';
  }
  if(!shouldGate)return decision;
  var old=proposed;
  var kept=lastLoad;
  var loadText=String(kept)+' lb ⚠';
  var reason='Brain V2 — '+extra+' Intention '+stats.intent+', sensibilite '+stats.sensitivity+'. Option ambitieuse : '+old+' lb.';
  decision.loadNum=kept;
  decision.loadText=loadText;
  decision.severity=level;
  decision.reason=reason;
  decision.brainStats=stats;
  try{
    if(typeof storeLoadDecisionHint==='function'){
      storeLoadDecisionHint(label,loadText,reason,level,history,context,'brain');
      if(window.__coachLoadHints&&typeof coachNormalizeMoveText==='function'){
        var k=coachNormalizeMoveText(label);
        if(window.__coachLoadHints[k]){
          window.__coachLoadHints[k].brainStats=stats;
          window.__coachLoadHints[k].ambitiousOption=String(old)+' lb';
        }
      }
    }
  }catch(e){}
  return decision;
}


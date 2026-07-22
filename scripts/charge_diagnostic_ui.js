// Diagnostic de charges lecture seule : commentaires de cycle, alertes, export JSON.
// Ne modifie pas les charges actives, l'historique, le cycle ou les fichiers data/.

function chargeDiagNormalize(s){
  if(typeof coachNormalizeMoveText==='function')return coachNormalizeMoveText(s);
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function chargeDiagNumber(v){
  var n=(typeof parseLoad==='function') ? parseLoad(v) : Number(String(v||'').match(/\d+(?:\.\d+)?/)||0);
  return (n||n===0)?Number(n)||0:0;
}
function chargeDiagRawLoad(row){
  if(!row)return null;
  var keys=['load','actualLoad','capacityLoad','externalLoad','currentLoad'];
  for(var i=0;i<keys.length;i++){
    if(Object.prototype.hasOwnProperty.call(row,keys[i])&&row[keys[i]]!==''&&row[keys[i]]!==null&&row[keys[i]]!==undefined){
      var n=(typeof parseLoad==='function')?parseLoad(row[keys[i]]):Number(row[keys[i]]);
      if(n||n===0)return Number(n)||0;
    }
  }
  return null;
}
function chargeDiagRepRange(reps){
  reps=Number(reps)||0;
  if(typeof repRange==='function')return repRange(reps||8);
  if(reps>=15)return 'endurance';
  if(reps>=8)return 'hypertrophy';
  return 'strength';
}
function chargeDiagLabel(exercise){
  if(typeof canonicalMovementLabel==='function')return canonicalMovementLabel((exercise&&exercise.name)||'Mouvement');
  return movementLabelFromKeyOrName ? movementLabelFromKeyOrName((exercise&&exercise.name)||'') : chargeKeyFromName((exercise&&exercise.name)||'Mouvement');
}
function chargeDiagHistory(label){
  var ast=(typeof ensureAthleteState==='function')?ensureAthleteState():{movements:{}};
  var mv=ast.movements&&ast.movements[label];
  return (mv&&Array.isArray(mv.history))?mv.history.slice(-8):[];
}
function chargeDiagRangeCap(label,targetReps){
  var ast=(typeof ensureAthleteState==='function')?ensureAthleteState():{movements:{}};
  var mv=ast.movements&&ast.movements[label];
  if(!mv||!mv.ranges)return null;
  var range=chargeDiagRepRange(targetReps||8);
  return mv.ranges[range]||null;
}
function chargeDiagNoLoadUseful(label,exercise){
  var raw=[label,exercise&&exercise.name,exercise&&exercise.format,exercise&&exercise.note].filter(Boolean).join(' ');
  var n=chargeDiagNormalize(raw);
  return /dead bug|sit up|situp|scap push up|scapular push up|band external rotation|external rotation band|mobilite|mobility|wall slide|stretch|respiration|breathing/.test(n);
}
function chargeDiagIsBodyweightExternal(label,context){
  if(typeof coachIsBodyweightExternalLoadMovement==='function')return coachIsBodyweightExternalLoadMovement(label,context);
  var n=chargeDiagNormalize(label);
  return /weighted pull up|weighted pullup|weighted dip|weighted dips/.test(n);
}
function chargeDiagHasValidHistory(row,label,context){
  var load=chargeDiagRawLoad(row);
  if(!(load||load===0))return false;
  var reps=Number(row&&(row.reps||row.actualReps||row.currentReps||0))||0;
  var rpe=Number(row&&row.rpe||0)||0;
  if(load>0)return reps>0;
  return load===0 && chargeDiagIsBodyweightExternal(label,context) && reps>0 && rpe>0;
}
function chargeDiagContextMatches(row,currentContext,label){
  var rowCtx=(typeof coachHistoryContext==='function')?coachHistoryContext(row):(row&&(row.context||(row.planned&&row.planned.context)));
  if(!rowCtx||!currentContext)return true;
  if(typeof coachContextMatches==='function')return coachContextMatches(rowCtx,currentContext,label);
  return true;
}
function chargeDiagRecentBest(rows,label,context){
  var best=null;
  (rows||[]).forEach(function(r){
    if(!chargeDiagHasValidHistory(r,label,context))return;
    var load=chargeDiagRawLoad(r);
    var reps=Number(r.reps||r.actualReps||r.currentReps||0)||0;
    var rpe=Number(r.rpe||0)||0;
    var score=load*100+reps-(rpe>=9?25:0);
    if(!best||score>best.score)best={load:load,reps:reps,rpe:rpe,status:r.status||'',date:r.date||'',score:score};
  });
  return best;
}
function buildChargeDiagnosticForExercise(exercise, shownLoad, context){
  context=context||{};
  if(!exercise)return null;
  var name=chargeKeyFromName ? chargeKeyFromName(exercise.name||'Mouvement') : (exercise.name||'Mouvement');
  var label=chargeDiagLabel(exercise);
  var parsed=(typeof parseTargetReps==='function')?parseTargetReps(exercise.format||'', context.targetReps||10):{min:context.targetReps||10,max:context.targetReps||10};
  var targetReps=Number(context.targetReps||parsed.min||parsed.max||8)||8;
  var diagContext=(typeof coachBuildMovementContext==='function')?coachBuildMovementContext(label,{kind:context.kind||context.blockKind||'',blockTitle:context.blockTitle||'',note:exercise.note||context.note||'',text:context.text||'',format:exercise.format||context.format||'',day:context.day||(state&&state.day),week:context.week||(state&&state.week)}):null;
  var shown=String(shownLoad||exercise.load||'').trim();
  var programLoad=String(exercise.load||context.programLoad||'').trim();
  var shownNum=chargeDiagNumber(shown);
  var programNum=chargeDiagNumber(programLoad);
  var rows=chargeDiagHistory(label);
  var sameContextRows=rows.filter(function(row){return chargeDiagContextMatches(row,diagContext,label);});
  var validRows=sameContextRows.filter(function(row){return chargeDiagHasValidHistory(row,label,diagContext);});
  var recent=validRows.length?validRows[validRows.length-1]:null;
  var recentBest=chargeDiagRecentBest(validRows,label,diagContext);
  var cap=chargeDiagRangeCap(label,targetReps);
  var noLoadUseful=chargeDiagNoLoadUseful(label,exercise);
  var alerts=[];
  var severity='ok';

  function add(code,level,title,detail){
    alerts.push({code:code,level:level,title:title,detail:detail});
    if(level==='critical')severity='critical';
    else if(level==='warning'&&severity!=='critical')severity='warning';
    else if(level==='watch'&&severity==='ok')severity='watch';
  }

  if(!noLoadUseful&&validRows.length<2){
    add('data_low','watch','Donnees faibles','Historique exploitable insuffisant pour ce mouvement dans ce contexte. La charge vient surtout du programme ou des references de base.');
  }
  if(shown.indexOf('⚠')>=0){
    add('active_warning','warning','Avertissement actif','Le moteur affiche deja un triangle. La charge est probablement cappee ou sous surveillance.');
  }
  if(recentBest&&shownNum){
    var gap=recentBest.load-shownNum;
    if(gap>=25 && recentBest.rpe && recentBest.rpe<=8.5){
      add('suspect_too_low','critical','Charge probablement trop basse','Historique recent : '+recentBest.load+' lb x '+recentBest.reps+' @ RPE '+recentBest.rpe+'. Charge affichee : '+shown+'. Ecart : '+gap+' lb.');
    }else if(gap>=15 && recentBest.rpe && recentBest.rpe<=8){
      add('maybe_too_low','watch','Charge possiblement basse','Historique recent au-dessus de la suggestion avec RPE controle. A surveiller, pas necessairement une erreur si la baisse est volontaire.');
    }
  }
  if(recent&&shownNum){
    var lastLoad=chargeDiagRawLoad(recent);
    var lastRpe=Number(recent.rpe||0)||0;
    if(lastRpe>=9 && shownNum>lastLoad){
      add('suspect_too_high','critical','Progression bloquee attendue','Derniere donnee RPE '+lastRpe+' a '+lastLoad+' lb. Regle V51 : la prochaine suggestion ne doit jamais augmenter.');
    }
    if(typeof isIsolationMovement==='function'&&isIsolationMovement(label)&&lastRpe>=8.5&&shownNum>lastLoad){
      add('isolation_too_high','warning','Isolation trop agressive','Mouvement d isolation avec RPE '+lastRpe+'. La suggestion devrait maintenir ou reduire legerement.');
    }
    if(label==='Overhead Rope Extension'&&lastLoad){
      var fridayCtx=(state&&String(state.day||'').toLowerCase()==='vendredi');
      var maxAllowed=(lastRpe<=8)?lastLoad+5:lastLoad;
      if(fridayCtx&&recentBest&&recentBest.load>=60&&recentBest.rpe<=8)maxAllowed=Math.max(maxAllowed,recentBest.load);
      if(shownNum>maxAllowed){
        add('overhead_rope_jump','critical','Saut Overhead Rope Extension bloque','Derniere reference '+lastLoad+' lb @ RPE '+lastRpe+'. Progression max +5 lb seulement si RPE <= 8.');
      }
    }
  }
  if(typeof isTechnicalMovement==='function'&&isTechnicalMovement(label)&&shownNum&&programNum&&shownNum>programNum){
    add('technique_progression','warning','Technique : progression automatique interdite','Ce mouvement technique ne devrait pas auto-progresser comme un mouvement principal.');
  }
  if(cap&&cap.status){
    if(cap.status==='recalibrating'||cap.status==='watch'){
      add('recalibration','watch','Mouvement sous surveillance','athlete_state indique '+cap.status+'. Le moteur devrait rester prudent jusqu a confirmation.');
    }
    if(cap.status==='upgrade_ready'){
      add('upgrade_ready','watch','Progression possible','Derniere reference facile ou reussie avec marge. Une petite progression peut etre logique.');
    }
    if(cap.status==='hard'){
      var capRecent=recent&&Number(recent.rpe||0)>=8.5;
      if(capRecent)add('hard_recent','watch','RPE haut recent','Derniere reference difficile dans ce contexte. Maintien ou legere baisse peut etre logique.');
    }
  }
  if(!noLoadUseful&&programNum&&shownNum&&Math.abs(shownNum-programNum)>=20 && !alerts.some(function(a){return a.code==='suspect_too_low'||a.code==='suspect_too_high';})){
    add('far_from_program','watch','Ecart important avec le programme','La charge affichee est loin de la charge prevue. Ce n est pas forcement une erreur, mais ca merite verification.');
  }

  var brainStats=null;
  var ambitiousOption='';
  try{
    if(window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
      var hk=coachNormalizeMoveText(label);
      var hint=window.__coachLoadHints[hk];
      if(hint&&hint.brainStats)brainStats=hint.brainStats;
      if(hint&&hint.ambitiousOption)ambitiousOption=hint.ambitiousOption;
    }
  }catch(e){}
  if(brainStats){
    add('brain_v2','watch','Brain V2','Confiance '+brainStats.confidence+'% · ambition '+brainStats.ambition+'% · validations '+brainStats.validations+'/'+brainStats.requiredConfirmations+' · intention '+brainStats.intent+'.'+(brainStats.memory?' Mémoire : '+brainStats.memory.sessions+' séances · précision '+brainStats.memory.precision+'% · connaissance '+brainStats.memory.knowledge+'%.':''));
  }

  var cycleComment='';
  try{
    var wk=state&&state.week?state.week:null;
    var day=state&&state.day?state.day:null;
    var cfg=focus?focus():{};
    var weekInfo=buildWeekInfo?buildWeekInfo():{};
    var wg=(wk&&weekInfo[wk])?weekInfo[wk].goal:'';
    cycleComment='S'+wk+' '+day+' — '+((cfg&&cfg.label)||'cycle actif')+(wg?' · '+wg:'');
  }catch(e){ cycleComment='Cycle actif non disponible.'; }

  var summary='Charge coherente avec les donnees disponibles.';
  if(severity==='critical')summary='Alerte forte : la charge affichee semble incoherente avec l historique recent.';
  else if(severity==='warning')summary='Avertissement : la charge merite une verification avant execution.';
  else if(severity==='watch')summary='A surveiller : donnees faibles, contexte different ou ajustement prudent. Pas necessairement une erreur.';

  return {
    name:name,
    movementKey:label,
    format:exercise.format||context.format||'',
    targetReps:targetReps,
    programLoad:programLoad,
    shownLoad:shown,
    shownLoadNum:shownNum||null,
    programLoadNum:programNum||null,
    equipment:(typeof equipmentStepLabelForExercise==='function'?equipmentStepLabelForExercise(name, programLoad||shown):''),
    range:chargeDiagRepRange(targetReps),
    severity:severity,
    summary:summary,
    cycleComment:cycleComment,
    alerts:alerts,
    validHistoryCount:validRows.length,
    noLoadUseful:noLoadUseful,
    recentBest:recentBest?{date:recentBest.date,load:recentBest.load,reps:recentBest.reps,rpe:recentBest.rpe,status:recentBest.status}:null,
    cap:cap||null,
    brainStats:brainStats,
    ambitiousOption:ambitiousOption,
    recentHistory:validRows.slice(-5).reverse()
  };
}
function collectChargeDiagnosticsForDay(day,week){
  day=day||state.day; week=week||state.week;
  var w=buildWorkout(day,week);
  var rows=[];
  (w.blocks||[]).forEach(function(b,bi){
    if(b.exercises&&b.exercises.length){
      b.exercises.forEach(function(e,ei){
        var parsed=parseTargetReps(e.format,10);
        var target=parsed.min||parsed.max||10;
        var shown=CoachCharge.suggestForExercise(e,b,{day:day,week:week});
        var d=buildChargeDiagnosticForExercise(e,shown,{blockTitle:b.title,blockIndex:bi+1,exerciseIndex:ei,targetReps:target,kind:b.kind,day:day,week:week});
        if(d){d.blockTitle=b.title;d.blockIndex=bi+1;d.exerciseIndex=ei;rows.push(d);}
      });
    }else if(b.progress&&b.progress.length){
      b.progress.forEach(function(mvKey,j){
        var reps=targetReps(j,b.kind),fmt=setScheme(b.kind,j),base=suggestLoad(mvKey,progressionPct(j),reps);
        var mv=movements[mvKey]||{name:mvKey};
        var shown=lbForExercise(mv.name, roundLoadForExercise(mv.name, base, 'nearest'));
        var d=buildChargeDiagnosticForExercise({name:mv.name,load:shown,format:fmt},shown,{blockTitle:b.title,blockIndex:bi+1,exerciseIndex:j,targetReps:reps,kind:b.kind,day:day,week:week});
        if(d){d.blockTitle=b.title;d.blockIndex=bi+1;d.exerciseIndex=j;d.progressKey=mvKey;rows.push(d);}
      });
    }
  });
  return rows;
}
function buildChargeDiagnosticReport(scope){
  scope=scope||'day';
  var rows=[];
  if(scope==='week'){
    currentDayOrder().forEach(function(d){ rows=rows.concat(collectChargeDiagnosticsForDay(d,state.week).map(function(x){x.day=d;return x;})); });
  }else{
    rows=collectChargeDiagnosticsForDay(state.day,state.week).map(function(x){x.day=state.day;return x;});
  }
  var counts={critical:0,warning:0,watch:0,ok:0};
  rows.forEach(function(r){counts[r.severity]=(counts[r.severity]||0)+1;});
  return {
    version:APP_VERSION,
    generatedAt:new Date().toISOString(),
    type:'charge_diagnostic_readonly',
    scope:scope,
    cycle:state.cycle&&state.cycle.goal,
    week:state.week,
    day:scope==='day'?state.day:null,
    summary:counts,
    cycleComment:chargeDiagnosticCycleComment(rows),
    rows:rows
  };
}
function chargeDiagnosticCycleComment(rows){
  var crit=rows.filter(function(r){return r.severity==='critical';}).length;
  var warn=rows.filter(function(r){return r.severity==='warning';}).length;
  var watch=rows.filter(function(r){return r.severity==='watch';}).length;
  if(crit)return 'Alerte : au moins une charge semble aberrante par rapport a l historique. Ne pas corriger automatiquement sans verifier le mouvement.';
  if(warn)return 'Seance globalement utilisable, mais certaines charges meritent une verification avant execution.';
  if(watch)return 'Seance coherente, avec quelques mouvements a surveiller a cause du RPE ou du manque de donnees.';
  return 'Aucune aberration evidente detectee dans les charges de cette selection.';
}
function renderChargeDiagnosticPanel(){
  var box=$('chargeDiagnosticOutput'); if(!box)return;
  var report=buildChargeDiagnosticReport('day');
  var rows=report.rows||[];
  var flags=rows.filter(function(r){return r.severity!=='ok';});
  var html='<div class="system-tag" style="margin-bottom:10px">Lecture seule · aucune correction automatique</div>'+
    '<p class="muted">'+escapeHtml(report.cycleComment)+'</p>'+
    '<p><strong>'+rows.length+'</strong> mouvements analyses · <strong>'+report.summary.critical+'</strong> critiques · <strong>'+report.summary.warning+'</strong> avertissements · <strong>'+report.summary.watch+'</strong> a surveiller.</p>';
  if(flags.length){
    html+='<div class="history-list">'+flags.map(function(r){
      var icon=r.severity==='critical'?'⚠️':(r.severity==='warning'?'⚠':'•');
      var first=(r.alerts&&r.alerts[0])?r.alerts[0]:null;
      var brain=r.brainStats?'<p class="muted"><strong>Brain V2</strong> · confiance '+escapeHtml(r.brainStats.confidence)+'% · ambition '+escapeHtml(r.brainStats.ambition)+'% · validations '+escapeHtml(r.brainStats.validations)+'/'+escapeHtml(r.brainStats.requiredConfirmations)+(r.ambitiousOption?' · option ambitieuse '+escapeHtml(r.ambitiousOption):'')+(r.brainStats.memory?' · mémoire '+escapeHtml(r.brainStats.memory.sessions)+' séances · précision '+escapeHtml(r.brainStats.memory.precision)+'%':'')+'</p>':'';
      return '<div class="history-item"><strong>'+icon+' '+escapeHtml(r.name)+'</strong><br><small>'+escapeHtml(r.blockTitle||'')+' · '+escapeHtml(r.shownLoad||'—')+' · '+escapeHtml(r.summary)+'</small>'+(first?'<p class="muted">'+escapeHtml(first.detail)+'</p>':'')+brain+'</div>';
    }).join('')+'</div>';
  }else{
    html+='<p class="muted">Aucune alerte pour la seance affichee.</p>';
  }
  box.innerHTML=html;
}
function exportChargeDiagnostic(scope){
  var report=buildChargeDiagnosticReport(scope||'day');
  var name='coach-beurt-charge-diagnostic-'+(report.cycle||'cycle')+'-S'+report.week+'-'+(report.day||'semaine')+'.json';
  download(name,JSON.stringify(report,null,2));
}
function copyChargeDiagnostic(scope){
  var report=buildChargeDiagnosticReport(scope||'day');
  var txt=JSON.stringify(report,null,2);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){alert('Diagnostic copie.');}).catch(function(){download('coach-beurt-charge-diagnostic.json',txt);});
  }else{
    download('coach-beurt-charge-diagnostic.json',txt);
  }
}
function setupChargeDiagnosticBindings(){
  var refresh=$('refreshChargeDiagnosticBtn'); if(refresh)refresh.onclick=renderChargeDiagnosticPanel;
  var copyDay=$('copyChargeDiagnosticDayBtn'); if(copyDay)copyDay.onclick=function(){copyChargeDiagnostic('day');};
  var exportDay=$('exportChargeDiagnosticDayBtn'); if(exportDay)exportDay.onclick=function(){exportChargeDiagnostic('day');};
  var exportWeek=$('exportChargeDiagnosticWeekBtn'); if(exportWeek)exportWeek.onclick=function(){exportChargeDiagnostic('week');};
}
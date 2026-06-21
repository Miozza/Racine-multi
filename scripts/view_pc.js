// Coach Beurt V51.63 — PC export IA actions utiles
// Objectif : grande vue WOD en landscape + inspection/logistique/export.
// Lecture seule: aucune modification de programme, aucune écriture data.
// IMPORTANT: ne pas toucher ici au mode résultats/séance guidée.

var pcActiveTab = "session";
var pcInspectCycleId = null;
var pcInspectWeek = null;
var pcInspectDay = null;
var pcWeekAlertsOpen = false;

function pcEsc(v){
  if(typeof escapeHtml === "function") return escapeHtml(v);
  return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});
}
function pcCurrentCycleId(){ return pcInspectCycleId || (state && state.cycle && state.cycle.goal) || (typeof defaultProgramId==="function"?defaultProgramId():""); }
function pcCurrentWeek(){ return Number(pcInspectWeek || (state && state.week) || 1); }
function pcCurrentDay(){ return pcInspectDay || (state && state.day) || "lundi"; }
function pcIsActiveSelection(){
  return pcCurrentCycleId()===(state&&state.cycle&&state.cycle.goal) && Number(pcCurrentWeek())===Number(state&&state.week) && pcCurrentDay()===(state&&state.day);
}
function pcWithSelection(fn){
  var oldGoal=state.cycle.goal, oldWeek=state.week, oldDay=state.day;
  state.cycle.goal=pcCurrentCycleId();
  state.week=pcCurrentWeek();
  state.day=pcCurrentDay();
  try{return fn();}
  finally{state.cycle.goal=oldGoal;state.week=oldWeek;state.day=oldDay;}
}
function pcFocusCfg(){
  var id=pcCurrentCycleId();
  return (window.focusConfigs && focusConfigs[id]) || {};
}
function pcTotalWeeks(){
  return pcWithSelection(function(){return (typeof totalWeeks==="function")?totalWeeks():6;});
}
function pcDayOrder(){
  return pcWithSelection(function(){return (typeof currentDayOrder==="function")?currentDayOrder():["lundi","mardi","jeudi","vendredi"];});
}
function pcDayMeta(day){
  return pcWithSelection(function(){return (typeof currentDayMeta==="function")?currentDayMeta(day):{label:day,base:"",focus:""};});
}
function pcWorkout(day,week){
  return pcWithSelection(function(){return buildWorkout(day||pcCurrentDay(),week||pcCurrentWeek());});
}
function pcWeekPlanLabel(week){
  return pcWithSelection(function(){
    if(state.cycle.goal==="shoulders3d" && typeof shouldersWeekPlan==="function"){
      var p=shouldersWeekPlan(week||state.week);return p?(p.label+(p.note?" — "+p.note:"")):"";
    }
    if(typeof buildWeekInfo==="function"){
      var info=buildWeekInfo();var wk=week||state.week;return info&&info[wk]&&info[wk].goal?info[wk].goal:"";
    }
    return "";
  });
}
function pcDisplayDayName(day){ var m=pcDayMeta(day); return m.label||day; }
function pcBlockRank(block, mainSeen){
  if(typeof displayRankForBlock==="function") return displayRankForBlock(block, mainSeen||0);
  return {rank:"",cls:"",tag:(block&&block.kind)||""};
}
function pcRecentSessionFor(day,week,cycleId){
  var hist=(state&&state.history)||[];
  cycleId=cycleId||pcCurrentCycleId();
  day=day||pcCurrentDay();week=week||pcCurrentWeek();
  for(var i=hist.length-1;i>=0;i--){
    var h=hist[i]||{};
    var hDay=h.plannedDay||h.day||h.jour;
    var hWeek=Number(h.week||h.semaine||0);
    var hCycle=h.cycle||h.goal||cycleId;
    if(hDay===day && hWeek===Number(week) && (!h.cycle || hCycle===cycleId)) return h;
  }
  return null;
}
function pcResultForExercise(session, exerciseName){
  if(!session||!session.results)return null;
  var target=chargeKeyFromName?chargeKeyFromName(exerciseName):String(exerciseName||"").toLowerCase();
  var keys=Object.keys(session.results||{});
  for(var i=0;i<keys.length;i++){
    var k=keys[i];
    var kk=chargeKeyFromName?chargeKeyFromName(k):String(k||"").toLowerCase();
    if(kk===target || kk.indexOf(target)>=0 || target.indexOf(kk)>=0) return session.results[k];
  }
  return null;
}
function pcPhoneWodLoadHints(text){
  var t=(text||"").toLowerCase(),hints=[];
  if(t.indexOf("db push press")>=0)hints.push({label:"Light DB push press",val:charge("Light DB Push Press","35 lb / main")});
  if(t.indexOf("hang power clean")>=0)hints.push({label:"Hang power cleans",val:charge("Hang Power Clean","115-135 lb")});
  if(t.indexOf("wall balls")>=0)hints.push({label:"Wall balls",val:charge("Wall Ball","14 lb")});
  if(t.indexOf("kb swings")>=0)hints.push({label:"KB swings",val:charge("KB Swings","24 kg")});
  if(!hints.length)return"";
  return '<div class="pcx-load-hints">'+hints.map(function(item){return '<span>'+pcEsc(item.label)+' : <strong>'+pcEsc(item.val)+'</strong></span>';}).join('')+'</div>';
}
// compatibilité ancienne fonction utilisée ailleurs
function phoneWodLoadHints(text){ return pcPhoneWodLoadHints(text); }

function pcDiagnosticsForDay(day,week){
  return pcWithSelection(function(){
    if(typeof collectChargeDiagnosticsForDay!=="function") return [];
    try{return collectChargeDiagnosticsForDay(day||state.day, week||state.week)||[];}catch(e){return [];}
  });
}
function pcAlerts(day,week){
  return pcDiagnosticsForDay(day,week).filter(function(r){return r&&r.severity&&r.severity!=="ok";});
}
function pcSeverityClass(sev){ return sev==="critical"?"danger":sev==="warning"?"warn":sev==="watch"?"watch":"ok"; }
function pcAlertWhy(a){
  if(!a) return "Alerte non disponible.";
  if(a.alerts&&a.alerts.length){
    return a.alerts.map(function(x){return (x.title||x.code||"Alerte")+(x.detail?" : "+x.detail:"");}).join(" • ");
  }
  if(a.summary) return a.summary;
  if(a.severity==="warning") return "Charge ou progression à vérifier avant exécution.";
  return "Données faibles, RPE spécial ou ajustement prudent.";
}
function pcAlertContext(a){
  var bits=[];
  if(a.blockTitle) bits.push("Bloc "+a.blockTitle);
  if(a.format) bits.push("Format "+a.format);
  if(a.shownLoad) bits.push("Affichée "+a.shownLoad);
  if(a.programLoad) bits.push("Programme "+a.programLoad);
  if(a.recentBest) bits.push("Réf. "+a.recentBest.load+" lb × "+a.recentBest.reps+(a.recentBest.rpe?" @RPE "+a.recentBest.rpe:""));
  if(a.cap&&a.cap.status) bits.push("État "+a.cap.status);
  return bits.join(" · ");
}
function pcAlertButton(a){
  return '<div class="pcx-alert '+pcSeverityClass(a.severity)+'">'+
    '<strong>⚠ '+pcEsc(a.name)+'</strong>'+
    '<span>'+pcEsc(a.summary||"À surveiller")+'</span>'+
    '<em>Pourquoi : '+pcEsc(pcAlertWhy(a))+'</em>'+
    (pcAlertContext(a)?'<small>'+pcEsc(pcAlertContext(a))+'</small>':'')+
    '</div>';
}
function pcSummaryCounts(rows){
  var c={critical:0,warning:0,watch:0,ok:0};
  (rows||[]).forEach(function(r){c[r.severity]=(c[r.severity]||0)+1;});
  return c;
}
function pcCurrentDayContextLines(){
  var w=pcWorkout();
  var lines=[];
  lines.push("Contexte Racine");
  lines.push("- App: Racine " + (typeof APP_VERSION!=="undefined"?APP_VERSION:""));
  lines.push("- Cycle: "+((pcFocusCfg().label)||pcCurrentCycleId()));
  lines.push("- Sélection: S"+pcCurrentWeek()+" · "+pcDisplayDayName(pcCurrentDay()));
  lines.push("- Objectif du jour: "+(w.day.base||""));
  var intention=(typeof dayIntention==="function"?pcWithSelection(function(){return dayIntention(state.day);}):"");
  if(intention) lines.push("- Intention: "+intention);
  lines.push("- Règle: proposer, ne rien appliquer directement dans l'app.");
  return lines;
}
function pcCurrentBlocksSummaryLines(){
  var w=pcWorkout();
  var lines=[];
  lines.push("Séance prévue");
  (w.blocks||[]).forEach(function(block){
    lines.push("- "+(block.title||"Bloc")+(block.time?" · "+block.time:""));
    if(block.text) lines.push("  "+cleanLine(displayChargeText(block.text||"")));
    if(block.exercises&&block.exercises.length){
      block.exercises.forEach(function(e){
        var parsed=parseTargetReps(e.format,10);var target=parsed.min||parsed.max||10;
        var shown=CoachCharge.suggestLoad(e.name,e.load,target,{kind:block.kind,blockTitle:block.title,note:e.note,text:block.text,format:e.format,day:(state&&state.day),week:(state&&state.week)});
        lines.push("  • "+e.name+" · "+(e.format||"?")+" · "+shown+(e.rest?" · repos "+e.rest:"")+(e.note?" · note: "+e.note:""));
      });
    }
  });
  return lines;
}
function pcAlertSummaryLines(limit){
  var alerts=pcAlerts();
  var lines=[];
  if(!alerts.length){
    lines.push("Alertes: aucune alerte majeure détectée pour cette séance.");
    return lines;
  }
  lines.push("Alertes détectées");
  alerts.slice(0,limit||8).forEach(function(a){
    lines.push("- "+a.name+" · "+(a.shownLoad||"charge n/d")+" · "+(a.summary||"À surveiller"));
    var why=pcAlertWhy(a); if(why) lines.push("  Pourquoi: "+why);
    var ctx=pcAlertContext(a); if(ctx) lines.push("  Contexte: "+ctx);
  });
  return lines;
}
function pcPrompt(kind){
  if(kind==="cycle") return pcCycleAuditText();
  if(kind==="problems") return pcProblemMovementsText();
  if(kind==="nextweek") return pcNextWeekText();
  var lines=[];
  lines=lines.concat(pcCurrentDayContextLines());
  lines.push("");
  if(kind==="replace"){
    lines.push("Demande à traiter");
    lines.push("Je veux évaluer un remplacement de mouvement ciblé, seulement si c'est justifié par les alertes, la fatigue, la logique de séance ou une redondance.");
    lines.push("Format de réponse attendu:");
    lines.push("1. Mouvement à remplacer et raison réelle");
    lines.push("2. Mouvement proposé");
    lines.push("3. Pourquoi il respecte l'objectif du bloc");
    lines.push("4. Charge/format/repos proposés");
    lines.push("5. Risque ou compromis");
    lines.push("6. Fichiers programme à modifier, sans toucher aux fichiers data/");
  }else if(kind==="load"){
    lines.push("Demande à traiter");
    lines.push("Je veux vérifier les charges affichées et proposer un fine tuning prudent seulement si une charge est incohérente avec l'historique, le RPE ou la progression prévue.");
    lines.push("Format de réponse attendu:");
    lines.push("1. Charge actuelle affichée");
    lines.push("2. Historique pertinent utilisé");
    lines.push("3. Problème détecté ou absence de problème");
    lines.push("4. Charge proposée avec raison courte");
    lines.push("5. Ce qu'il ne faut pas modifier");
    lines.push("6. Fichiers à modifier seulement si nécessaire, sans toucher aux fichiers data/");
  }else{
    lines.push("Demande à traiter");
    lines.push("Analyse la séance sélectionnée pour voir si elle est logique, lisible, bien ordonnée et cohérente avec le cycle. Propose seulement des ajustements ciblés si nécessaire.");
    lines.push("Format de réponse attendu:");
    lines.push("1. Ce qui est cohérent");
    lines.push("2. Ce qui est à surveiller");
    lines.push("3. Alertes prioritaires");
    lines.push("4. Ajustements recommandés, minimum viable");
    lines.push("5. Ce qu'il ne faut pas changer");
    lines.push("6. Fichiers à produire si modification demandée");
  }
  lines.push("");
  lines=lines.concat(pcAlertSummaryLines(10));
  lines.push("");
  lines=lines.concat(pcCurrentBlocksSummaryLines());
  lines.push("");
  lines.push("Contraintes strictes");
  lines.push("- Ne pas transformer ça en Builder.");
  lines.push("- Ne pas appliquer de modification automatiquement.");
  lines.push("- Ne pas toucher à data/resultats.json, data/athlete_state.json, data/cycle_state.json ni data/charges.js sauf demande explicite.");
  lines.push("- Garder les corrections petites, ciblées et vérifiables.");
  lines.push("- Respecter l'objectif du cycle et de la séance.");
  return lines.join("\n");
}
function pcJsonRoleText(scope,mode){
  if(scope==="week"){
    return "Rôle fixe : exporter un fichier JSON de la semaine complète pour analyser les tendances, les alertes récurrentes et la logique globale. À joindre au chat IA quand une correction dépasse une seule séance.";
  }
  if(mode==="copy"){
    return "Rôle fixe : copier le JSON de la séance actuelle pour le coller directement dans le chat IA. À utiliser pour diagnostiquer rapidement une charge, une alerte ou un mouvement précis.";
  }
  return "Rôle fixe : télécharger un fichier JSON de la séance actuelle pour le joindre au chat IA. À utiliser quand le diagnostic est trop long pour un simple copier-coller.";
}
function pcCopyText(text){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){alert("Copié.");}).catch(function(){download("coach-beurt-pc-export.txt",text);});}
  else download("coach-beurt-pc-export.txt",text);
}
function pcExportJson(scope){
  var report;
  if(typeof buildChargeDiagnosticReport==="function"){
    report=pcWithSelection(function(){return buildChargeDiagnosticReport(scope||"day");});
  }else{
    report={version:APP_VERSION,cycle:pcCurrentCycleId(),week:pcCurrentWeek(),day:pcCurrentDay(),alerts:pcAlerts()};
  }
  download("coach-beurt-pc-diagnostic-"+(scope||"day")+"-S"+pcCurrentWeek()+".json",JSON.stringify(report,null,2));
}

function pcRenderSelectors(){
  var ids=Object.keys(window.focusConfigs||{});
  var cycleOpts=ids.map(function(id){var cfg=focusConfigs[id]||{};return '<option value="'+pcEsc(id)+'" '+(id===pcCurrentCycleId()?"selected":"")+'>'+pcEsc(cfg.label||id)+'</option>';}).join('');
  var tw=pcTotalWeeks(), wkOpts='';
  for(var i=1;i<=tw;i++){wkOpts+='<option value="'+i+'" '+(i===pcCurrentWeek()?"selected":"")+'>S'+i+' '+pcEsc(pcWeekPlanLabel(i)).replace(/^S\d+\s*/,'')+'</option>';}
  var dayOpts=pcDayOrder().map(function(d){return '<option value="'+pcEsc(d)+'" '+(d===pcCurrentDay()?"selected":"")+'>'+pcEsc(pcDisplayDayName(d))+'</option>';}).join('');
  return '<div class="pcx-selectors">'+
    '<label>Cycle<select id="pcCycleSelect" class="pcx-select">'+cycleOpts+'</select></label>'+ 
    '<label>Semaine<select id="pcWeekSelect" class="pcx-select">'+wkOpts+'</select></label>'+ 
    '<label>Jour<select id="pcDaySelect" class="pcx-select">'+dayOpts+'</select></label>'+ 
    '</div>';
}
function pcRenderTabs(){
  var tabs=[['session','Séance'],['week','Semaine'],['roadmap','Route'],['analysis','Analyse'],['export','Export']];
  return '<div class="pcx-tabs">'+tabs.map(function(t){return '<button type="button" class="pcx-tab '+(pcActiveTab===t[0]?'active':'')+'" data-pc-tab="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>';
}
function pcRenderTopHeader(){
  var w=pcWorkout();
  var alerts=pcAlerts();
  var plan=pcWeekPlanLabel();
  return '<section class="pcx-hero">'+
    '<div><div class="pcx-kicker">PC · inspection logistique · lecture seule</div>'+ 
    '<h1>'+pcEsc(w.day.label)+'</h1>'+ 
    '<p>'+pcEsc(w.day.base||'')+(plan?' · '+pcEsc(plan):'')+'</p></div>'+ 
    '<div class="pcx-alert-badge"><strong>'+alerts.length+'</strong><span>alertes</span></div>'+ 
    '</section>'+pcRenderSelectors()+pcRenderTabs();
}
function pcRenderMiniAlerts(alerts){
  if(!alerts.length)return '<div class="pcx-panel"><h3>Alertes séance</h3><p class="pcx-muted">Aucune alerte majeure détectée pour cette séance.</p></div>';
  return '<div class="pcx-panel"><h3>Alertes séance</h3><div class="pcx-alert-list">'+alerts.slice(0,6).map(function(a){return pcAlertButton(a);}).join('')+'</div></div>';
}
function pcRenderBlock(block, session, mainSeen){
  var rk=pcBlockRank(block, mainSeen);
  var html='<article class="pcx-block '+pcEsc(block.kind||'')+'">';
  html+='<header><div><span class="pcx-rank">'+pcEsc(rk.rank||'')+'</span><h3>'+pcEsc(block.title||'Bloc')+'</h3></div><span class="pcx-time">'+pcEsc(block.time||'')+'</span></header>';
  if(block.text && block.kind!=='wod')html+='<p class="pcx-block-text">'+pcEsc(cleanLine(displayChargeText(block.text)))+'</p>';
  if(block.kind==='wod'){
    html+='<div class="pcx-wod-text">'+pcEsc(cleanLine(displayChargeText(block.text||'')))+'</div>'+pcPhoneWodLoadHints(block.text||'');
  }else if(block.exercises&&block.exercises.length){
    html+='<div class="pcx-table"><div class="pcx-row pcx-head"><span>Mouvement</span><span>Format</span><span>Charge</span><span>Repos</span><span>Réalisé</span></div>';
    block.exercises.forEach(function(e){
      var parsed=parseTargetReps(e.format,10);var target=parsed.min||parsed.max||10;
      var shown=CoachCharge.suggestLoad(e.name,e.load,target,{kind:block.kind,blockTitle:block.title,note:e.note,text:block.text,format:e.format,day:(state&&state.day),week:(state&&state.week)});
      var res=pcResultForExercise(session,e.name);
      var done=res?((res.load?res.load+' lb':'')+(res.reps?' × '+res.reps:'')+(res.rpe?' @RPE '+res.rpe:'')):'—';
      html+='<div class="pcx-row"><span><strong>'+pcEsc(e.name)+'</strong>'+(e.note?'<small>'+pcEsc(e.note)+'</small>':'')+'</span><span>'+pcEsc(e.format||'')+'</span><span class="pcx-load">'+pcEsc(shown)+loadInfoButtonHtml(e,shown)+'</span><span>'+pcEsc(e.rest||'')+'</span><span>'+pcEsc(done)+'</span></div>';
    });
    html+='</div>';
  }else if(block.progress&&block.progress.length){
    html+='<div class="pcx-table"><div class="pcx-row pcx-head"><span>Mouvement</span><span>Format</span><span>Charge</span><span>Repos</span><span>Réalisé</span></div>';
    block.progress.forEach(function(mvKey,j){
      var reps=targetReps(j,block.kind),fmt=setScheme(block.kind,j),base=suggestLoad(mvKey,progressionPct(j),reps),adj=getRpeAdjustment(mvKey,reps);
      var mv=movements[mvKey]||{name:mvKey};var finalLoad=roundLoadForExercise(mv.name, base+(adj.adj||0), "nearest");var shown=lbForExercise(mv.name, finalLoad)+(adj.arrow?' '+adj.arrow:'');
      html+='<div class="pcx-row"><span><strong>'+pcEsc(mv.name)+'</strong></span><span>'+pcEsc(fmt)+'</span><span class="pcx-load">'+pcEsc(shown)+'</span><span>'+pcEsc(restFor(block.kind))+'</span><span>—</span></div>';
    });
    html+='</div>';
  }else if(!block.text){
    html+='<p class="pcx-block-text">'+pcEsc(cleanLine(displayChargeText(block.text||'')))+'</p>';
  }
  html+='</article>';
  return html;
}
function pcRenderSessionTab(){
  var w=pcWorkout(), session=pcRecentSessionFor(), alerts=pcAlerts();
  var mainSeen=0;
  var blocks=(w.blocks||[]).map(function(b){if(b.kind==='main')mainSeen++;return pcRenderBlock(b,session,mainSeen);}).join('');
  var action=pcIsActiveSelection()?'<button type="button" class="pcx-action green" id="pcStartSessionBtn">▶ Démarrer séance</button>':'<button type="button" class="pcx-action" disabled>Lecture seule — séance active différente</button>';
  return '<div class="pcx-layout"><main class="pcx-main"><section class="pcx-panel pcx-intro"><h2>'+pcEsc(w.day.label)+'</h2><p>'+pcEsc(typeof dayIntention==="function"?pcWithSelection(function(){return dayIntention(state.day);}):'')+'</p></section>'+blocks+'</main><aside class="pcx-side">'+pcRenderMiniAlerts(alerts)+'<div class="pcx-panel"><h3>Réalisation</h3>'+(session?'<p>Dernière séance trouvée : <strong>'+pcEsc(session.date||'date inconnue')+'</strong></p>':'<p class="pcx-muted">Aucun résultat enregistré pour ce jour/semaine.</p>')+action+'</div></aside></div>';
}
function pcWeekDayIntention(day){
  if(typeof dayIntention!=="function") return "";
  return pcWithSelection(function(){var old=state.day;state.day=day;try{return dayIntention(day);}finally{state.day=old;}});
}
function pcRenderWeekBlock(block, session, mainSeen){
  var rk=pcBlockRank(block, mainSeen);
  var html='<article class="pcx-week-block '+pcEsc(block.kind||'')+'">';
  html+='<header><div><span class="pcx-rank">'+pcEsc(rk.rank||'')+'</span><strong>'+pcEsc(block.title||'Bloc')+'</strong></div><span>'+pcEsc(block.time||'')+'</span></header>';
  if(block.text){
    html+='<p>'+pcEsc(cleanLine(displayChargeText(block.text||'')))+'</p>'+pcPhoneWodLoadHints(block.text||'');
  }
  var items=[];
  if(block.exercises&&block.exercises.length){
    block.exercises.forEach(function(e){
      var parsed=parseTargetReps(e.format,10);var target=parsed.min||parsed.max||10;
      var shown=CoachCharge.suggestLoad(e.name,e.load,target,{kind:block.kind,blockTitle:block.title,note:e.note,text:block.text,format:e.format,day:(state&&state.day),week:(state&&state.week)});
      var res=pcResultForExercise(session,e.name);
      var done=res?((res.load?res.load+' lb':'')+(res.reps?' × '+res.reps:'')+(res.rpe?' @RPE '+res.rpe:'')):'—';
      items.push('<li><strong>'+pcEsc(e.name)+'</strong><span>Format '+pcEsc(e.format||'—')+' · Charge <b class="pcx-week-load">'+pcEsc(shown)+loadInfoButtonHtml(e,shown)+'</b> · Repos '+pcEsc(e.rest||'—')+'</span>'+(e.note?'<small>'+pcEsc(e.note)+'</small>':'')+(done!=='—'?'<small>Réalisé : '+pcEsc(done)+'</small>':'')+'</li>');
    });
  }else if(block.progress&&block.progress.length){
    block.progress.forEach(function(mvKey,j){
      var reps=targetReps(j,block.kind),fmt=setScheme(block.kind,j),base=suggestLoad(mvKey,progressionPct(j),reps),adj=getRpeAdjustment(mvKey,reps);
      var mv=movements[mvKey]||{name:mvKey};var finalLoad=roundLoadForExercise(mv.name, base+(adj.adj||0), "nearest");var shown=lbForExercise(mv.name, finalLoad)+(adj.arrow?' '+adj.arrow:'');
      items.push('<li><strong>'+pcEsc(mv.name)+'</strong><span>Format '+pcEsc(fmt)+' · Charge <b class="pcx-week-load">'+pcEsc(shown)+loadInfoButtonHtml({name:mv.name,load:shown,note:""},shown)+'</b> · Repos '+pcEsc(restFor(block.kind))+'</span></li>');
    });
  }
  if(items.length) html+='<ul>'+items.join('')+'</ul>';
  html+='</article>';
  return html;
}
function pcRenderWeekDayFull(day){
  var w=pcWorkout(day,pcCurrentWeek());
  var session=pcRecentSessionFor(day,pcCurrentWeek());
  var alerts=pcAlerts(day,pcCurrentWeek());
  var mainSeen=0;
  var blocks=(w.blocks||[]).map(function(b){if(b.kind==='main')mainSeen++;return pcRenderWeekBlock(b,session,mainSeen);}).join('');
  return '<section class="pcx-week-day '+(day===pcCurrentDay()?'selected':'')+'">'+
    '<header class="pcx-week-day-head"><div><h2>'+pcEsc(w.day.label)+'</h2><p>'+pcEsc(w.day.base||'')+'</p></div><div class="pcx-week-day-meta"><span>'+(w.blocks||[]).length+' blocs</span><span>'+alerts.length+' alertes</span></div></header>'+ 
    '<div class="pcx-week-intention">'+pcEsc(pcWeekDayIntention(day))+'</div>'+ 
    '<div class="pcx-week-blocks">'+blocks+'</div>'+ 
    '</section>';
}
function pcRenderWeekAlertsPanel(alertsAll){
  if(!alertsAll.length){
    return '<section class="pcx-panel pcx-week-alerts"><h3>Alertes de semaine</h3><p class="pcx-muted">Aucune alerte majeure pour cette semaine.</p></section>';
  }
  var groups={};
  (alertsAll||[]).forEach(function(a){var d=a.day||pcCurrentDay();(groups[d]=groups[d]||[]).push(a);});
  var days=pcDayOrder();
  var html='<section class="pcx-panel pcx-week-alerts"><header><div><h3>Alertes de semaine consultables</h3><p>Chaque carte explique pourquoi le point est à surveiller. Utilise les ! jaunes dans les charges pour voir le détail du moteur.</p></div><button type="button" class="pcx-action slim" data-pc-toggle-week-alerts="1">Refermer</button></header>';
  html+='<div class="pcx-week-alert-groups">';
  days.forEach(function(d){
    var arr=groups[d]||[];
    if(!arr.length)return;
    html+='<article><h4>'+pcEsc(pcDisplayDayName(d))+' · '+arr.length+' alerte'+(arr.length>1?'s':'')+'</h4><div class="pcx-alert-list">'+arr.map(function(a){return pcAlertButton(a);}).join('')+'</div></article>';
  });
  html+='</div></section>';
  return html;
}
function pcRenderWeekTab(){
  var days=pcDayOrder();
  var alertsAll=[];
  var totalBlocks=0;
  days.forEach(function(d){
    var w=pcWorkout(d,pcCurrentWeek());
    totalBlocks+=(w.blocks||[]).length;
    alertsAll=alertsAll.concat(pcAlerts(d,pcCurrentWeek()).map(function(x){x.day=d;return x;}));
  });
  var html='<section class="pcx-panel pcx-week-summary"><h2>Résumé de semaine</h2><p>S'+pcCurrentWeek()+' · '+pcEsc((pcFocusCfg().label)||pcCurrentCycleId())+'</p><div class="pcx-week-stats"><span>'+days.length+' jours</span><span>'+totalBlocks+' blocs visibles</span><button type="button" class="pcx-week-stat-btn" data-pc-toggle-week-alerts="1">'+alertsAll.length+' alertes / points à surveiller</button></div><p class="pcx-muted">Vue paysage : les journées sont de gauche à droite, avec les blocs visibles au complet. Clique sur les alertes pour voir le détail.</p></section>';
  if(pcWeekAlertsOpen) html+=pcRenderWeekAlertsPanel(alertsAll);
  html+='<div class="pcx-week-full">'+days.map(function(d){return pcRenderWeekDayFull(d);}).join('')+'</div>';
  return html;
}

function pcRenderRoadmapTab(){
  var macro=window.COACH_BERTIN_MACROCYCLE||{};
  var index=window.COACH_BERTIN_PROGRAM_INDEX||[];
  var active=pcCurrentCycleId();
  var mainRoute=Array.isArray(macro.mainRoute)?macro.mainRoute.slice():["shoulders3d_v2","hypertrophy_base","force_performance","competition_peak"];
  var route=mainRoute.indexOf(active)>=0?mainRoute.slice(mainRoute.indexOf(active)):[active,"competition_peak"].filter(function(id,i,a){return id&&a.indexOf(id)===i;});
  var rows=[], cursor=new Date(), currentWeek=pcCurrentWeek();
  function entryFor(id){for(var i=0;i<index.length;i++){if(index[i]&&index[i].id===id)return index[i];}return null;}
  function labelFor(id){var cfg=(window.focusConfigs&&focusConfigs[id])||{}, ent=entryFor(id)||{};return cfg.label||ent.name||id;}
  function pct(n,d){return Math.max(0,Math.min(100,Math.round((Number(n)||0)/Math.max(1,(Number(d)||1))*100)));}
  route.forEach(function(id,idx){
    var cfg=(window.focusConfigs&&focusConfigs[id])||{};
    var ent=entryFor(id)||{};
    var total=Number(ent.durationWeeks||cfg.durationWeeks||cfg.weeks||((cfg.weekLabels&&cfg.weekLabels.length)||0)||((cfg.sets&&cfg.sets.length)||0)||6)||6;
    var remaining=idx===0?Math.max(0,total-currentWeek+1):total;
    var start=new Date(cursor), end=new Date(cursor);end.setDate(end.getDate()+remaining*7);cursor=end;
    rows.push({id:id,label:labelFor(id),totalWeeks:total,remainingWeeks:remaining,start:start,end:end,current:idx===0,entry:ent});
  });
  var daysLeft=(typeof daysToCompetition==="function")?daysToCompetition():0;
  var totalWeeks=rows.reduce(function(sum,r){return sum+r.remainingWeeks;},0);
  var weeksToComp=Math.floor(daysLeft/7), margin=weeksToComp-totalWeeks;
  var status=margin>=4?"OK":margin>=1?"serré":"trop long";
  var cls=status==="OK"?"ok":(status==="serré"?"warn":"danger");
  var rdCls=status==="OK"?"pcx-rd-ok":(status==="serré"?"pcx-rd-warn":"pcx-rd-danger");
  var marginPct=pct(weeksToComp,totalWeeks);
  var activeRow=rows[0]||{label:labelFor(active),totalWeeks:(typeof pcTotalWeeks==="function"?pcTotalWeeks():1),remainingWeeks:1,start:new Date(),end:new Date(),entry:{}};
  var weekPct=pct(currentWeek,activeRow.totalWeeks);
  var nextRow=rows[1]||null;
  var branchAfter=Array.isArray(activeRow.entry&&activeRow.entry.branchAfter)?activeRow.entry.branchAfter:[];
  var branchText=branchAfter.length>1?'<div class="pcx-rd-next-branch">Carrefour après '+pcEsc(activeRow.label)+' : '+branchAfter.map(function(id){return pcEsc(labelFor(id));}).join(' ou ')+'</div>':'';
  var timelineTotal=rows.reduce(function(sum,r){return sum+Math.max(1,r.remainingWeeks);},0)||1;
  var html='<div class="pcx-layout"><main class="pcx-main"><section class="pcx-panel pcx-roadmap"><h2>Feuille de route macro</h2>'+
    '<p>Route officielle depuis <code>programs/index.js</code>, calculée avec les durées réelles du registre macrocycle.</p>'+
    '<div class="pcx-rd-dash">'+
      '<article class="pcx-rd-countdown '+rdCls+'"><div class="pcx-rd-comp-label">Compétition</div><h3>'+pcEsc(COMPETITION_DATE.toLocaleDateString('fr-CA'))+'</h3><div class="pcx-rd-counters"><span class="pcx-rd-counter"><b class="pcx-rd-num">'+daysLeft+'</b><small class="pcx-rd-unit">jours</small></span><span class="pcx-rd-counter"><b class="pcx-rd-num">'+weeksToComp+'</b><small class="pcx-rd-unit">sem. dispo</small></span><span class="pcx-rd-counter"><b class="pcx-rd-num">'+(margin>=0?'+':'')+margin+'</b><small class="pcx-rd-unit">marge</small></span></div><div class="pcx-rd-margin-bar-wrap"><div class="pcx-rd-margin-bar" style="width:'+marginPct+'%"><span class="pcx-rd-bar-pct">'+marginPct+'%</span></div></div><div class="pcx-rd-margin-legend">'+pcEsc(status)+' · route estimée '+totalWeeks+' semaines</div></article>'+
      '<article class="pcx-rd-countdown"><div class="pcx-rd-now-header"><div><div class="pcx-rd-comp-label">Maintenant</div><h3>'+pcEsc(activeRow.label)+'</h3></div><span class="pcx-rd-week-badge">S'+currentWeek+' / '+pcEsc(String(activeRow.totalWeeks))+'</span></div><div class="pcx-rd-now-day">'+pcEsc(pcDisplayDayName(pcCurrentDay()))+'</div><div class="pcx-rd-now-prog"><div class="pcx-rd-prog-bar-wrap"><div class="pcx-rd-prog-bar" style="width:'+weekPct+'%"><span class="pcx-rd-bar-pct">'+weekPct+'%</span></div></div><div class="pcx-rd-prog-legend">Progression de la phase active</div></div></article>'+
    '</div>'+
    '<section class="pcx-rd-timeline" aria-label="Timeline macrocycle">';
  rows.forEach(function(row,idx){
    var phaseCls=row.current?'pcx-rd-ph-current':(idx===rows.length-1?'pcx-rd-ph-comp':'pcx-rd-ph-future');
    html+='<article class="pcx-rd-phase '+phaseCls+'" style="flex-grow:'+Math.max(1,row.remainingWeeks)+'"><div class="pcx-rd-phase-bar">'+(row.current?'<span class="pcx-rd-phase-active"><span class="pcx-rd-phase-dot"></span></span>':'')+'</div><div class="pcx-rd-phase-label"><strong class="pcx-rd-phase-name">'+pcEsc(row.label)+'</strong><small class="pcx-rd-phase-dates">'+pcEsc(formatRoadDate(row.start))+' → '+pcEsc(formatRoadDate(row.end))+'</small></div></article>';
  });
  html+='<span class="pcx-rd-comp-pin" title="Compétition">🏆</span></section>'+
    '<section class="pcx-rd-countdown"><div class="pcx-rd-comp-label">Prochaine étape</div>'+(nextRow?'<h3 class="pcx-rd-next-name">'+pcEsc(nextRow.label)+'</h3><p class="pcx-rd-next-dates">'+pcEsc(formatRoadDate(nextRow.start))+' → '+pcEsc(formatRoadDate(nextRow.end))+'</p>':'<h3 class="pcx-rd-next-name">Dernière phase de la route</h3><p class="pcx-rd-next-dates">Aucune phase suivante dans la route active.</p>')+branchText+'</section>'+
    '<div class="pcx-roadmap-status '+cls+'"><strong>'+pcEsc(status.toUpperCase())+'</strong><span>Marge estimée : '+(margin>=0?'+':'')+pcEsc(String(margin))+' semaine'+(Math.abs(margin)>1?'s':'')+'</span></div>'+
    '<div class="pcx-roadmap-list">';
  rows.forEach(function(row){
    html+='<article class="pcx-roadmap-row '+(row.current?'current':'')+'"><div><strong>'+(row.current?'▶ ':'')+pcEsc(row.label)+'</strong><small>'+pcEsc(row.id)+' · durée totale '+pcEsc(String(row.totalWeeks))+' sem.</small></div><b>'+pcEsc(String(row.remainingWeeks))+' sem.</b><span>'+pcEsc(formatRoadDate(row.start))+' → '+pcEsc(formatRoadDate(row.end))+'</span></article>';
  });
  html+='</div></section></main><aside class="pcx-side"><section class="pcx-panel"><h3>Compétition</h3><p><strong>'+pcEsc(COMPETITION_DATE.toLocaleDateString('fr-CA'))+'</strong></p><p>'+daysLeft+' jours restants.</p><p>Route estimée : '+totalWeeks+' semaines.</p><p>Temps disponible : '+weeksToComp+' semaines.</p></section><section class="pcx-panel"><h3>Règle</h3><p>La Route PC lit <code>COACH_BERTIN_MACROCYCLE.mainRoute</code>. Les vieux <code>phaseEnd</code> statiques ne guident pas la planification.</p></section></aside></div>';
  return html;
}

function pcRenderAnalysisTab(){
  var dayAlerts=pcAlerts(), weekRows=[];pcDayOrder().forEach(function(d){weekRows=weekRows.concat(pcAlerts(d,pcCurrentWeek()).map(function(x){x.day=d;return x;}));});
  var counts=pcSummaryCounts(weekRows);
  var html='<div class="pcx-layout"><main class="pcx-main"><section class="pcx-panel"><h2>Alertes du jour sélectionné</h2>';
  html+=dayAlerts.length?'<div class="pcx-alert-list">'+dayAlerts.map(function(a){return pcAlertButton(a);}).join('')+'</div>':'<p class="pcx-muted">Aucune alerte majeure pour cette séance.</p>';
  html+='</section></main><aside class="pcx-side"><section class="pcx-panel"><h3>Analyse semaine</h3><p>Critiques : <strong>'+counts.critical+'</strong></p><p>Avertissements : <strong>'+counts.warning+'</strong></p><p>À surveiller : <strong>'+counts.watch+'</strong></p></section></aside></div>';
  return html;
}

function pcResultLineForExercise(session, exerciseName){
  var r=pcResultForExercise(session,exerciseName);
  if(!r) return "réel n/d";
  var bits=[];
  if(r.load!=null&&String(r.load).trim()) bits.push("fait "+r.load+" lb");
  if(r.reps!=null&&String(r.reps).trim()) bits.push("reps "+r.reps);
  if(r.rpe!=null&&String(r.rpe).trim()) bits.push("RPE "+r.rpe);
  if(r.note) bits.push("note "+r.note);
  return bits.length?bits.join(" · "):"réel présent, détails n/d";
}
function pcPlannedExerciseLine(e, session, block){
  block = block || {};
  var parsed=parseTargetReps(e.format,10);var target=parsed.min||parsed.max||10;
  var shown=CoachCharge.suggestLoad(e.name,e.load,target,{kind:block.kind,blockTitle:block.title,note:e.note,text:block.text,format:e.format,day:(state&&state.day),week:(state&&state.week)});
  return "  • "+e.name+" · prévu "+(e.format||"?")+" · suggéré "+shown+(e.rest?" · repos "+e.rest:"")+" · "+pcResultLineForExercise(session,e.name)+(e.note?" · note: "+e.note:"");
}
function pcDayAuditLines(day, week){
  var w=pcWorkout(day,week);
  var session=pcRecentSessionFor(day,week);
  var alerts=pcAlerts(day,week);
  var lines=[];
  lines.push("## S"+week+" · "+pcDisplayDayName(day));
  lines.push("Objectif: "+((w.day&&w.day.base)||""));
  lines.push("Historique réel: "+(session?("présent · "+(session.date||"")+" "+(session.time||"")):"aucune séance réelle trouvée"));
  lines.push("Alertes: "+alerts.length);
  alerts.slice(0,8).forEach(function(a){lines.push("- Alerte: "+a.name+" · "+(a.shownLoad||"charge n/d")+" · "+(a.summary||"À surveiller")+" · "+pcAlertWhy(a));});
  (w.blocks||[]).forEach(function(block){
    lines.push("- Bloc "+(block.title||"Bloc")+(block.time?" · "+block.time:"")+(block.kind?" · "+block.kind:""));
    if(block.exercises&&block.exercises.length){
      block.exercises.forEach(function(e){lines.push(pcPlannedExerciseLine(e,session,block));});
    }else if(block.text){
      lines.push("  "+cleanLine(displayChargeText(block.text||"")));
    }
  });
  return lines;
}
function pcCycleAuditText(){
  var lines=[];
  var days=pcDayOrder();
  var total=pcTotalWeeks();
  lines.push("DEMANDE À L'IA — AUDIT CYCLE COMPLET COACH BEURT");
  lines.push("");
  lines.push("Objectif: vérifier si le moteur de charges apprend correctement sur le cycle complet, en comparant prévu / suggéré / réel / RPE / alertes.");
  lines.push("Réponse attendue: verdict clair du moteur, mouvements fiables, mouvements à surveiller, erreurs de mapping possibles, progression trop rapide/lente, corrections minimales proposées.");
  lines.push("Contraintes: ne pas réécrire le programme, ne rien appliquer automatiquement, ne pas toucher aux données durables sauf demande explicite.");
  lines.push("");
  lines=lines.concat(pcCurrentDayContextLines());
  lines.push("- Portée: cycle complet · "+total+" semaines · "+days.length+" jours/semaine");
  lines.push("");
  for(var wk=1;wk<=total;wk++){
    lines.push("# SEMAINE "+wk+" — "+pcWeekPlanLabel(wk));
    days.forEach(function(day){lines=lines.concat(pcDayAuditLines(day,wk));lines.push("");});
  }
  return lines.join("\n");
}
function pcProblemMovementsText(){
  var days=pcDayOrder(), total=pcTotalWeeks(), map={};
  function add(name, reason, ctx){
    if(!name)return;
    var k=chargeKeyFromName?chargeKeyFromName(name):String(name).toLowerCase();
    if(!map[k])map[k]={name:name,count:0,reasons:[],contexts:[]};
    map[k].count++;
    if(reason&&map[k].reasons.indexOf(reason)<0)map[k].reasons.push(reason);
    if(ctx&&map[k].contexts.length<6)map[k].contexts.push(ctx);
  }
  for(var wk=1;wk<=total;wk++){
    days.forEach(function(day){
      pcAlerts(day,wk).forEach(function(a){add(a.name,a.summary||pcAlertWhy(a),"S"+wk+" "+pcDisplayDayName(day)+" · "+pcAlertContext(a));});
      var s=pcRecentSessionFor(day,wk);var res=s&&(s.results||s.resultats);
      Object.keys(res||{}).forEach(function(k){var r=res[k]||{};var rpe=Number(r.rpe)||0;if(rpe>=9)add(k,"RPE élevé", "S"+wk+" "+pcDisplayDayName(day)+" · "+(r.load?"load "+r.load+" lb · ":"")+(r.reps?"reps "+r.reps+" · ":"")+"RPE "+rpe);});
    });
  }
  var arr=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.count-a.count;});
  var lines=[];
  lines.push("DEMANDE À L'IA — TROUVER LES MOUVEMENTS À CORRIGER");
  lines.push("");
  lines.push("Objectif: repérer les mouvements où le moteur de charges, le mapping ou la progression semblent douteux sur le cycle.");
  lines.push("Réponse attendue: prioriser les vrais problèmes, expliquer pourquoi, dire quoi surveiller, proposer corrections minimales sans modifier les données durables.");
  lines.push("");
  lines=lines.concat(pcCurrentDayContextLines());
  lines.push("");
  if(!arr.length){
    lines.push("Aucun mouvement problématique évident détecté automatiquement. Analyse quand même les données si un JSON est joint.");
  }else{
    lines.push("Mouvements candidats détectés automatiquement");
    arr.slice(0,25).forEach(function(x){
      lines.push("- "+x.name+" · occurrences "+x.count+" · raisons: "+x.reasons.join(" / "));
      x.contexts.forEach(function(c){lines.push("  "+c);});
    });
  }
  lines.push("");
  lines.push("Important: ne conclus pas qu'un mouvement est mauvais juste parce qu'il apparaît ici. Vérifie l'objectif du bloc, l'ordre des mouvements et la fatigue.");
  return lines.join("\n");
}
function pcNextWeekText(){
  var wk=pcCurrentWeek();
  var next=Math.min(wk+1,pcTotalWeeks());
  var days=pcDayOrder();
  var lines=[];
  lines.push("DEMANDE À L'IA — PRÉPARER LA PROCHAINE SEMAINE");
  lines.push("");
  lines.push("Objectif: avec les résultats réels récents, vérifier si la semaine suivante est encore logique avant de la faire.");
  lines.push("Réponse attendue: mouvements à monter/maintenir/baisser, points de fatigue à surveiller, corrections minimales, rien d'automatique.");
  lines.push("");
  lines=lines.concat(pcCurrentDayContextLines());
  lines.push("");
  lines.push("# Semaine actuelle S"+wk+" — résultats et alertes");
  days.forEach(function(day){lines=lines.concat(pcDayAuditLines(day,wk));lines.push("");});
  if(next===wk){
    lines.push("# Prochaine semaine");
    lines.push("Le cycle est déjà à sa dernière semaine. Analyse plutôt la suite logique ou le deload post-cycle.");
  }else{
    lines.push("# Semaine suivante S"+next+" — prévu");
    days.forEach(function(day){
      var w=pcWorkout(day,next);
      lines.push("## S"+next+" · "+pcDisplayDayName(day)+" · "+((w.day&&w.day.base)||""));
      (w.blocks||[]).forEach(function(block){
        lines.push("- Bloc "+(block.title||"Bloc")+(block.time?" · "+block.time:""));
        (block.exercises||[]).forEach(function(e){
          var parsed=parseTargetReps(e.format,10);var target=parsed.min||parsed.max||10;
          lines.push("  • "+e.name+" · "+(e.format||"?")+" · suggéré "+CoachCharge.suggestLoad(e.name,e.load,target,{kind:block.kind,blockTitle:block.title,note:e.note,text:block.text,format:e.format,day:day,week:next})+(e.rest?" · repos "+e.rest:""));
        });
        if((!block.exercises||!block.exercises.length)&&block.text)lines.push("  "+cleanLine(displayChargeText(block.text||"")));
      });
      lines.push("");
    });
  }
  return lines.join("\n");
}

function pcExportContextText(){
  var lines=[];
  lines.push("CONTEXTE AUTOMATIQUE COACH BEURT — ce n'est pas une demande");
  lines.push("Utilisation : colle ce contexte dans le chat, puis écris ta demande en langage normal.");
  lines.push("");
  lines=lines.concat(pcCurrentDayContextLines());
  lines.push("");
  lines=lines.concat(pcAlertSummaryLines(10));
  lines.push("");
  lines=lines.concat(pcCurrentBlocksSummaryLines());
  lines.push("");
  lines.push("Rappels de sécurité");
  lines.push("- Le contexte ci-dessus ne demande aucune modification par lui-même.");
  lines.push("- C'est Bertin qui écrit la vraie demande ensuite.");
  lines.push("- Ne pas toucher aux fichiers data/ durables sauf demande explicite.");
  return lines.join("\n");
}
function pcExportActionCard(type,title,desc,button){
  var attr=type==="context"?'data-pc-copy-context="day"':'data-pc-copy="'+pcEsc(type)+'"';
  return '<article class="pcx-export-card pcx-export-action">'+
    '<header><div><h3>'+pcEsc(title)+'</h3><p>'+pcEsc(desc)+'</p></div><button type="button" class="pcx-action" '+attr+'>'+pcEsc(button)+'</button></header>'+
    '</article>';
}
function pcRenderExportTab(){
  return '<section class="pcx-panel pcx-export-panel"><h2>IA / Export</h2>'+
    '<p class="pcx-muted">Lecture seule. L’app prépare les faits, puis tu choisis la question à poser à l’IA. Aucun bouton ne modifie le programme.</p>'+
    '<div class="pcx-export-grid simple">'+
      pcExportActionCard('full','Analyser séance actuelle','Demande directe à l’IA pour juger la séance sélectionnée : logique, charges, fatigue, alertes et corrections minimales.','Copier analyse séance')+
      pcExportActionCard('cycle','Auditer cycle complet','Demande à l’IA de vérifier si le moteur apprend correctement sur toutes les semaines : prévu, suggéré, réel, RPE et alertes.','Copier audit cycle')+
      pcExportActionCard('problems','Trouver mouvements à corriger','Repère les mouvements avec alertes, RPE élevés, mapping douteux ou progression suspecte sur le cycle.','Copier recherche problèmes')+
      pcExportActionCard('nextweek','Préparer prochaine semaine','Compare les résultats récents avec la semaine suivante prévue pour décider quoi surveiller avant de continuer.','Copier prochaine semaine')+
      pcExportActionCard('context','Copier contexte brut','Copie seulement les faits de la séance sélectionnée. Ensuite tu me parles normalement : “remplace C1”, “pourquoi ce poids?”, etc.','Copier contexte')+
    '</div>'+
    '<div class="pcx-export-help">'+
      '<h3>Comment l’utiliser</h3>'+
      '<p><strong>Analyser séance</strong> = une journée précise.</p>'+
      '<p><strong>Auditer cycle complet</strong> = vérifier si le moteur apprend bien sur plusieurs semaines.</p>'+
      '<p><strong>Trouver mouvements à corriger</strong> = repérer les charges/mappings/RPE suspects.</p>'+
      '<p><strong>Préparer prochaine semaine</strong> = décider quoi surveiller avant de continuer.</p>'+
      '<p><strong>Copier contexte brut</strong> = donner les faits à l’IA, puis écrire ta vraie demande en langage normal.</p>'+
    '</div>'+
    '<div class="pcx-json-roles simple">'+
      '<article><h3>JSON séance</h3><p>'+pcEsc(pcJsonRoleText('day','copy'))+'</p><button type="button" class="pcx-action" id="pcCopyJsonDay">Copier JSON séance</button></article>'+
      '<article><h3>Fichier séance</h3><p>'+pcEsc(pcJsonRoleText('day','export'))+'</p><button type="button" class="pcx-action" id="pcExportJsonDay">Exporter JSON séance</button></article>'+
      '<article><h3>Fichier semaine</h3><p>'+pcEsc(pcJsonRoleText('week','export'))+'</p><button type="button" class="pcx-action" id="pcExportJsonWeek">Exporter JSON semaine</button></article>'+
    '</div>'+
    '</section>';
}
function pcRenderActiveTab(){
  if(pcActiveTab==='week')return pcRenderWeekTab();
  if(pcActiveTab==='roadmap')return pcRenderRoadmapTab();
  if(pcActiveTab==='analysis')return pcRenderAnalysisTab();
  if(pcActiveTab==='export')return pcRenderExportTab();
  return pcRenderSessionTab();
}
function pcBind(){
  var c=$('pcCycleSelect'), w=$('pcWeekSelect'), d=$('pcDaySelect');
  if(c)c.onchange=function(){pcInspectCycleId=this.value;pcInspectWeek=1;pcInspectDay=(pcDayOrder()[0]||'lundi');renderPhoneWod();};
  if(w)w.onchange=function(){pcInspectWeek=Number(this.value)||1;renderPhoneWod();};
  if(d)d.onchange=function(){pcInspectDay=this.value;renderPhoneWod();};
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-tab]'),function(btn){btn.onclick=function(){pcActiveTab=btn.getAttribute('data-pc-tab')||'session';renderPhoneWod();};});
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-toggle-week-alerts]'),function(btn){btn.onclick=function(){pcWeekAlertsOpen=!pcWeekAlertsOpen;renderPhoneWod();};});
  var start=$('pcStartSessionBtn');if(start)start.onclick=function(){CoachSession.openFrom('phone');};
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-copy]'),function(btn){btn.onclick=function(){pcCopyText(pcPrompt(btn.getAttribute('data-pc-copy')||'full'));};});
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-copy-context]'),function(btn){btn.onclick=function(){pcCopyText(pcExportContextText());};});
  var cj=$('pcCopyJsonDay');if(cj)cj.onclick=function(){var report=pcWithSelection(function(){return typeof buildChargeDiagnosticReport==='function'?buildChargeDiagnosticReport('day'):{alerts:pcAlerts()};});pcCopyText(JSON.stringify(report,null,2));};
  var ej=$('pcExportJsonDay');if(ej)ej.onclick=function(){pcExportJson('day');};
  var ew=$('pcExportJsonWeek');if(ew)ew.onclick=function(){pcExportJson('week');};
  setupLoadInfoButtons($('phoneWod'));
}
function renderPhoneWod(){
  var el=$('phoneWod');if(!el)return;
  pcInspectCycleId=pcInspectCycleId||((state&&state.cycle&&state.cycle.goal)||null);
  pcInspectWeek=pcInspectWeek||((state&&state.week)||1);
  pcInspectDay=pcInspectDay||((state&&state.day)||'lundi');
  var label=$('phoneDayLabel'); if(label)label.textContent=pcDisplayDayName(pcCurrentDay())+' · S'+pcCurrentWeek();
  el.innerHTML='<div class="pcx-shell">'+pcRenderTopHeader()+'<div class="pcx-content">'+pcRenderActiveTab()+'</div></div>';
  pcBind();
}

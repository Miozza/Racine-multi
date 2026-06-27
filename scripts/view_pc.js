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
function pcIsAdmin(){
  // Admin = profil ayant le flag isAdmin, ou profil "Bertin" comme fallback initial.
  try{
    var ap = window.CoachProfiles && CoachProfiles.getActive && CoachProfiles.getActive();
    if(!ap) return false;
    return !!(ap.isAdmin || ap.name === "Bertin");
  }catch(e){ return false; }
}

function pcRenderTabs(){
  var tabs=[['session','Séance'],['week','Semaine'],['roadmap','Route'],['progress','Progression'],['analysis','Analyse'],['export','Export']];
  if(pcIsAdmin()) tabs.push(['admin','Admin']);
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
  // Utilise le macrocycle override du profil actif si disponible (ex: profil Bertin),
  // sinon tombe sur le macrocycle générique.
  var activeMacro = null;
  try{
    var ap = window.CoachProfiles && CoachProfiles.getActive && CoachProfiles.getActive();
    if(ap && ap.macrocycleOverrideKey && window[ap.macrocycleOverrideKey]){
      activeMacro = window[ap.macrocycleOverrideKey];
    }
  }catch(e){}
  var macro = activeMacro || window.COACH_BERTIN_MACROCYCLE || {};
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



// ─────────────────────────────────────────────────────────────
// Progression PC — lecture seule, mouvements principaux seulement.
// Source: state.athleteState.movements + fallback state.history.
// Ne modifie jamais les données durables.
var pcProgressRange = pcProgressRange || "all";
var pcProgressSelected = pcProgressSelected || null;
var pcProgressCompareA = pcProgressCompareA || null;
var pcProgressCompareB = pcProgressCompareB || null;

var PC_PROGRESS_TRACKERS=[
  {id:"front_squat",label:"Front Squat",priority:10,rx:/\bfront squat\b/},
  {id:"back_squat",label:"Back Squat",priority:20,rx:/\bback squat\b|\bsquat arriere\b/},
  {id:"bench_press",label:"Bench Press",priority:30,rx:/\bbench press\b|\bbarbell bench\b|\bdeveloppe couche\b/},
  {id:"strict_press",label:"Strict Press",priority:40,rx:/\bstrict press\b|\bshoulder press strict\b|\bpress strict\b/},
  {id:"push_press",label:"Push Press",priority:50,rx:/\bpush press\b/},
  {id:"deadlift",label:"Deadlift",priority:60,rx:/\bdeadlift\b|\bsouleve de terre\b/},
  {id:"rdl",label:"Romanian Deadlift / DB RDL",priority:70,rx:/\brdl\b|\bromanian deadlift\b|\bdb rdl\b|\bdumbbell rdl\b/},
  {id:"hip_thrust",label:"Hip Thrust",priority:80,rx:/\bhip thrust\b/},
  {id:"barbell_row",label:"Barbell Row",priority:90,rx:/\bbarbell row\b|\bbent over row\b|\brow barre\b/},
  {id:"weighted_pull_up",label:"Pull-Up / Weighted Pull-Up",priority:100,rx:/\bweighted pull\s*up\b|\bpull\s*up\b|\bstrict pull\s*up\b|\bchin\s*up\b/},
  {id:"weighted_dip",label:"Dip / Weighted Dip",priority:110,rx:/\bweighted dip\b|\bring dip\b|\bdip\b/},
  {id:"db_shoulder_press",label:"DB Shoulder Press",priority:120,rx:/\bdb shoulder press\b|\bdumbbell shoulder press\b|\bseated db press\b/},
  {id:"power_clean",label:"Power Clean",priority:130,rx:/\bpower clean\b|\bclean technique\b/},
  {id:"clean_jerk",label:"Clean & Jerk",priority:140,rx:/\bclean and jerk\b|\bclean & jerk\b|\bc\s*&\s*j\b/},
  {id:"muscle_up",label:"Muscle-Up strict / transition",priority:150,rx:/\bmuscle\s*up\b|\bfalse grip\b|\btransition\b/}
];
function pcProgNorm(value){
  var s=String(value||"").toLowerCase();
  try{s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");}catch(e){}
  return s.replace(/^[a-z][0-9]?\.\s*/i,"").replace(/[^a-z0-9&]+/g," ").replace(/\s+/g," ").trim();
}
function pcProgNumber(value){
  if(value===0)return 0;
  if(value===null||value===undefined||value==="")return 0;
  if(typeof parseLoad==="function"){
    var parsed=parseLoad(value);
    if(parsed||parsed===0)return Number(parsed)||0;
  }
  var m=String(value).replace(",",".").match(/-?\d+(?:\.\d+)?/);
  return m?Number(m[0])||0:0;
}
function pcProgTrackerFor(label){
  var n=pcProgNorm(label);
  if(!n)return null;
  // Évite de mélanger tirage horizontal et vertical, et évite les accessoires.
  if(/ring row|cable row|seated row/.test(n))return null;
  if(/lateral raise|face pull|curl|extension|fly|raise/.test(n) && !/muscle up/.test(n))return null;
  for(var i=0;i<PC_PROGRESS_TRACKERS.length;i++){
    if(PC_PROGRESS_TRACKERS[i].rx.test(n))return PC_PROGRESS_TRACKERS[i];
  }
  return null;
}
function pcProgRowDate(row, fallbackIndex){
  var raw=row&&(row.date||row.actualDate||row.completedAt||row.time||row.timestamp);
  var t=raw?Date.parse(raw):NaN;
  return isNaN(t)?(fallbackIndex||0):t;
}
function pcProgIsRealDate(v){return Number(v)>946684800000;}
function pcProgDateLabel(raw){
  if(!raw)return "—";
  var d=new Date(raw);
  if(!isNaN(d.getTime()))return d.toLocaleDateString("fr-CA",{month:"short",day:"numeric"});
  return String(raw);
}
function pcProgFullDateLabel(raw){
  if(!raw)return "date n/d";
  var d=new Date(raw);
  if(!isNaN(d.getTime()))return d.toLocaleDateString("fr-CA");
  return String(raw);
}
function pcProgE1rm(load,reps){
  load=Number(load)||0;reps=Number(reps)||0;
  if(!load||!reps)return 0;
  if(typeof epley1RM==="function")return Math.round(epley1RM(load,reps));
  return Math.round(load*(1+reps/30));
}
function pcProgAddRow(map, tracker, rawLabel, row, source, order){
  if(!tracker||!row)return;
  var load=pcProgNumber(row.load||row.actualLoad||row.externalLoad||row.capacityLoad||row.currentLoad);
  var reps=Number(row.reps||row.actualReps||row.currentReps||0)||0;
  var rpe=Number(row.rpe||0)||0;
  if(!(load||load===0)||!reps)return;
  if(load<=0 && !/pull|dip/.test(tracker.id))return;
  var date=row.date||row.actualDate||row.completedAt||"";
  if(!map[tracker.id]){
    map[tracker.id]={id:tracker.id,label:tracker.label,priority:tracker.priority,aliases:{},rows:[]};
  }
  var item=map[tracker.id];
  item.aliases[rawLabel||tracker.label]=true;
  var e1rm=pcProgE1rm(load,reps);
  var key=[date,load,reps,rpe,source,rawLabel||tracker.label,order||0].join("|");
  for(var i=0;i<item.rows.length;i++)if(item.rows[i]._key===key)return;
  item.rows.push({
    _key:key,_order:order||0,date:date,sortDate:pcProgRowDate(row,order),
    load:load,reps:reps,rpe:rpe,e1rm:e1rm,range:row.range||"",source:source||"historique",
    status:row.status||"",planned:row.planned||null,rawLabel:rawLabel||tracker.label,
    note:row.note||row.comment||"", cycle:row.cycle||row.goal||"", week:row.week||row.semaine||"", day:row.day||row.jour||row.plannedDay||""
  });
}
function pcProgDateKey(row, fallbackIndex){
  var raw=row&&(row.date||row.actualDate||row.completedAt||row.time||row.timestamp);
  if(raw){
    var t=Date.parse(raw);
    if(!isNaN(t)){
      var d=new Date(t);
      var m=String(d.getMonth()+1);if(m.length<2)m="0"+m;
      var day=String(d.getDate());if(day.length<2)day="0"+day;
      return d.getFullYear()+"-"+m+"-"+day;
    }
    var str=String(raw).trim().toLowerCase();
    if(str)return str;
  }
  return "unknown-"+(fallbackIndex||0);
}
function pcProgRowScore(row, metric){
  row=row||{};
  var reps=Number(row.reps)||0, load=Number(row.load)||0, e1rm=Number(row.e1rm)||0, rpe=Number(row.rpe)||0;
  if(metric==="reps")return reps*100000 + load*100 + e1rm + rpe/10;
  return e1rm*100000 + load*100 + reps + rpe/10;
}
function pcProgSetText(row){
  row=row||{};
  var load=Number(row.load)||0, reps=Number(row.reps)||0;
  if(!reps)return "—";
  return (load>0?pcProgFormatNumber(load)+" lb × ":"")+pcProgFormatNumber(reps)+" reps";
}
function pcProgCondenseRowsByDate(item, rows){
  rows=(rows||[]).slice().sort(function(a,b){return (a.sortDate-b.sortDate)||(a._order-b._order);});
  if(!rows.length)return rows;
  var hasPositiveLoad=rows.some(function(r){return Number(r.load)>0;});
  var metric=((/weighted_pull_up|weighted_dip|muscle_up/.test(item.id))&&!hasPositiveLoad)?"reps":"load";
  var groups=[], map={};
  rows.forEach(function(row,idx){
    var key=pcProgDateKey(row,idx);
    if(!map[key]){
      map[key]={key:key,rows:[],sortDate:row.sortDate||idx,order:row._order||idx,date:row.date||""};
      groups.push(map[key]);
    }
    map[key].rows.push(row);
    if(Number(row.sortDate)<Number(map[key].sortDate))map[key].sortDate=row.sortDate;
    if(Number(row._order)<Number(map[key].order))map[key].order=row._order;
  });
  groups.sort(function(a,b){return (a.sortDate-b.sortDate)||(a.order-b.order);});
  return groups.map(function(group){
    var sorted=group.rows.slice().sort(function(a,b){return (a.sortDate-b.sortDate)||(a._order-b._order);});
    var rep=sorted.reduce(function(best,row){return pcProgRowScore(row,metric)>pcProgRowScore(best,metric)?row:best;},sorted[0]);
    var merged={};Object.keys(rep||{}).forEach(function(k){merged[k]=rep[k];});
    var sources={};sorted.forEach(function(r){if(r.source)sources[r.source]=true;});
    merged._groupRows=sorted;
    merged._groupCount=sorted.length;
    merged._groupKey=group.key;
    merged._key=[item.id,group.key,rep._key||"point"].join("|");
    merged.sortDate=group.sortDate;
    merged.source=Object.keys(sources).join(" + ") || rep.source || "historique";
    if(!merged.date)merged.date=group.date;
    return merged;
  });
}
function pcProgFinalizeItem(item){
  var sortedRows=(item.rows||[]).slice().sort(function(a,b){return (a.sortDate-b.sortDate)||(a._order-b._order);});
  item.rows=pcProgCondenseRowsByDate(item, sortedRows);
  var last=item.rows[item.rows.length-1]||{};
  var first=item.rows[0]||{};
  var hasPositiveLoad=item.rows.some(function(r){return Number(r.load)>0;});
  item.metric=((/weighted_pull_up|weighted_dip|muscle_up/.test(item.id))&&!hasPositiveLoad)?"reps":"load";
  var best=item.rows.reduce(function(acc,r){
    if(item.metric==="reps")return (Number(r.reps)||0)>(Number(acc.reps)||0)?r:acc;
    return (Number(r.e1rm)||0)>(Number(acc.e1rm)||0)?r:acc;
  },item.rows[0]||{});
  var avgRpe=0,rpeCount=0;
  item.rows.forEach(function(r){if(Number(r.rpe)>0){avgRpe+=Number(r.rpe);rpeCount++;}});
  avgRpe=rpeCount?Math.round((avgRpe/rpeCount)*10)/10:0;
  var firstMetric=item.metric==="reps"?(Number(first.reps)||0):(Number(first.load)||0);
  var lastMetric=item.metric==="reps"?(Number(last.reps)||0):(Number(last.load)||0);
  var deltaMetric=lastMetric-firstMetric;
  var deltaLoad=(Number(last.load)||0)-(Number(first.load)||0);
  var deltaE1rm=(Number(last.e1rm)||0)-(Number(first.e1rm)||0);
  var trend="stable";
  if(item.metric==="reps"){
    if(deltaMetric>=2)trend="up";
    else if(deltaMetric<=-2)trend="down";
  }else{
    if(deltaE1rm>=10||deltaLoad>=10)trend="up";
    else if(deltaE1rm<=-10||deltaLoad<=-10)trend="down";
  }
  item.stats={last:last,first:first,best:best,avgRpe:avgRpe,deltaMetric:deltaMetric,deltaLoad:deltaLoad,deltaE1rm:deltaE1rm,trend:trend,points:item.rows.length};
  return item;
}
function pcBuildProgressionSeries(){
  var map={};
  var ast=state&&state.athleteState&&state.athleteState.movements?state.athleteState.movements:{};
  var keys=Object.keys(ast||{}), order=0;
  keys.forEach(function(label){
    var tracker=pcProgTrackerFor(label);
    var mv=ast[label]||{};
    var hist=Array.isArray(mv.history)?mv.history:[];
    hist.forEach(function(row){pcProgAddRow(map,tracker,label,row,"athlete_state",order++);});
  });
  // Fallback utile si athleteState est incomplet : relit les séances locales sans écrire.
  var sessions=(state&&Array.isArray(state.history))?state.history:[];
  sessions.forEach(function(sess,si){
    var res=sess&&sess.results?sess.results:{};
    Object.keys(res||{}).forEach(function(label){
      var tracker=pcProgTrackerFor(label);
      if(!tracker)return;
      var row=res[label]||{};
      pcProgAddRow(map,tracker,label,{date:sess.date||sess.actualDate,load:row.load,reps:row.reps,rpe:row.rpe,status:"session",planned:row.planned||null,note:row.note,cycle:sess.cycle||sess.goal,week:sess.week,day:sess.plannedDay||sess.day||sess.jour},"session",10000+si);
    });
  });
  return Object.keys(map).map(function(id){return pcProgFinalizeItem(map[id]);}).filter(function(item){return item.rows.length>=1;}).sort(function(a,b){return a.priority-b.priority;});
}
function pcProgRowsForRange(item,range){
  var rows=(item&&item.rows||[]).slice();
  if(range==="4w"||range==="8w"){
    var weeks=range==="4w"?4:8;
    var last=rows[rows.length-1]||{};
    if(pcProgIsRealDate(last.sortDate)){
      var cutoff=Number(last.sortDate)-(weeks*7*24*60*60*1000);
      var filtered=rows.filter(function(r){return pcProgIsRealDate(r.sortDate)&&Number(r.sortDate)>=cutoff;});
      return filtered.length?filtered:rows.slice(-Math.min(rows.length,weeks));
    }
    return rows.slice(-Math.min(rows.length,weeks));
  }
  return rows;
}
function pcProgCloneWithRows(item,rows){
  var clone={id:item.id,label:item.label,priority:item.priority,aliases:item.aliases||{},rows:(rows||[]).slice(),_allRows:(item.rows||[]).slice()};
  return pcProgFinalizeItem(clone);
}
function pcProgFilteredSeries(raw){
  return (raw||[]).map(function(item){return pcProgCloneWithRows(item,pcProgRowsForRange(item,pcProgressRange));}).filter(function(item){return item.rows.length>=1;});
}
function pcProgMetricValue(item,row){return item&&item.metric==="reps"?(Number(row&&row.reps)||0):(Number(row&&row.load)||0);}
function pcProgMetricUnit(item){return item&&item.metric==="reps"?" reps":" lb";}
function pcProgMetricName(item){return item&&item.metric==="reps"?"Reps":"Charge";}
function pcProgFormatNumber(v){
  v=Number(v)||0;
  if(Math.abs(v)>=100)return String(Math.round(v));
  if(Math.abs(v)>=10)return (Math.round(v*2)/2).toString().replace(".5",",5");
  return (Math.round(v*10)/10).toString().replace(".",",");
}
function pcProgFormatMetric(item,v){return pcProgFormatNumber(v)+pcProgMetricUnit(item);}
function pcProgNiceStep(raw){
  raw=Number(raw)||1;
  var pow=Math.pow(10,Math.floor(Math.log10(raw)));
  var n=raw/pow;
  var nice=n<=1?1:(n<=2?2:(n<=2.5?2.5:(n<=5?5:10)));
  return nice*pow;
}
function pcProgScale(item){
  var rows=item.rows||[];
  var vals=rows.map(function(r){return pcProgMetricValue(item,r);}).filter(function(v){return isFinite(v);});
  if(!vals.length)vals=[0,1];
  var rawMin=Math.min.apply(null,vals), rawMax=Math.max.apply(null,vals);
  var range=rawMax-rawMin;
  if(!range){range=Math.max(5,Math.abs(rawMax)*0.12||5);rawMin=Math.max(0,rawMin-range/2);rawMax=rawMax+range/2;}
  var step=pcProgNiceStep(range/4);
  var min=Math.floor(rawMin/step)*step;
  var max=Math.ceil(rawMax/step)*step;
  if(item&&item.metric!=="reps"&&rawMin>=0)min=Math.max(0,min);
  if(max<=min)max=min+step*4;
  var ticks=[];
  for(var v=min,guard=0;v<=max+step/2&&guard<8;v+=step,guard++)ticks.push(Math.round(v*10)/10);
  if(ticks.length<3){ticks=[min,min+step,max];}
  return {min:min,max:max,step:step,ticks:ticks,rawMin:rawMin,rawMax:rawMax};
}
function pcProgPointClass(item,row,lastIndex,i,best){
  var cls="";
  if(i===lastIndex)cls+=" last";
  if(best&&row===best)cls+=" best";
  if(pcProgressSelected&&pcProgressSelected.id===item.id&&pcProgressSelected.key===row._key)cls+=" selected";
  return cls.trim();
}
function pcProgSvg(item){
  var rows=item.rows||[];
  if(!rows.length)return "";
  var scale=pcProgScale(item);
  item.scale=scale;
  var w=640,h=280,left=62,right=24,top=28,bottom=52;
  var innerW=w-left-right,innerH=h-top-bottom;
  function x(i){return left+(rows.length===1?innerW/2:(i/(rows.length-1))*innerW);}
  function y(v){return top+((scale.max-v)/(scale.max-scale.min))*innerH;}
  var pts=rows.map(function(r,i){return Math.round(x(i))+","+Math.round(y(pcProgMetricValue(item,r)));}).join(" ");
  var best=(item.stats&&item.stats.best)||null;
  var lastIndex=rows.length-1;
  var grid=scale.ticks.map(function(t){
    var yy=Math.round(y(t));
    return '<g class="pcx-progress-gridline"><line x1="'+left+'" y1="'+yy+'" x2="'+(w-right)+'" y2="'+yy+'"></line><text x="'+(left-8)+'" y="'+(yy+4)+'">'+pcEsc(pcProgFormatMetric(item,t))+'</text></g>';
  }).join('');
  var xLabelEvery=rows.length<=6?1:Math.ceil(rows.length/5);
  var xLabels=rows.map(function(r,i){
    if(i!==0&&i!==rows.length-1&&(i%xLabelEvery)!==0)return '';
    return '<text class="pcx-progress-date" x="'+Math.round(x(i))+'" y="'+(h-18)+'">'+pcEsc(pcProgDateLabel(r.date))+'</text>';
  }).join('');
  var pointLabels=rows.map(function(r,i){
    var val=pcProgMetricValue(item,r);
    if(rows.length>10 && i!==0 && i!==lastIndex && r!==best)return '';
    var yy=Math.round(y(val));
    var dy=yy<top+18?18:-9;
    return '<text class="pcx-progress-point-label" x="'+Math.round(x(i))+'" y="'+(yy+dy)+'">'+pcEsc(pcProgFormatMetric(item,val))+'</text>';
  }).join('');
  var dots=rows.map(function(r,i){
    var val=pcProgMetricValue(item,r);
    var cls=pcProgPointClass(item,r,lastIndex,i,best);
    var title=pcProgFullDateLabel(r.date)+' · '+pcProgMetricName(item)+' '+pcProgFormatMetric(item,val)+' · '+pcProgSetText(r)+(r.rpe?' @RPE '+r.rpe:'')+(r.e1rm?' · e1RM '+r.e1rm+' lb':'')+(r._groupCount>1?' · '+r._groupCount+' entrées condensées':'');
    return '<circle class="'+pcEsc(cls)+'" data-pc-prog-point="'+pcEsc(item.id)+'" data-pc-prog-key="'+pcEsc(r._key)+'" cx="'+Math.round(x(i))+'" cy="'+Math.round(y(val))+'" r="'+(cls?6:4.5)+'"><title>'+pcEsc(title)+'</title></circle>';
  }).join('');
  return '<svg class="pcx-progress-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Progression '+pcEsc(item.label)+'">'+
    '<rect class="pcx-progress-plot-bg" x="'+left+'" y="'+top+'" width="'+innerW+'" height="'+innerH+'"></rect>'+grid+
    '<line class="pcx-progress-axis" x1="'+left+'" y1="'+(h-bottom)+'" x2="'+(w-right)+'" y2="'+(h-bottom)+'"></line>'+ 
    '<line class="pcx-progress-axis" x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(h-bottom)+'"></line>'+ 
    '<text class="pcx-progress-axis-title" x="'+left+'" y="16">'+pcEsc(pcProgMetricName(item)+' · échelle '+pcProgFormatMetric(item,scale.min)+' → '+pcProgFormatMetric(item,scale.max))+'</text>'+ 
    '<polyline points="'+pts+'"></polyline>'+dots+pointLabels+xLabels+
    '</svg>';
}
function pcProgScaleSummary(item){
  var sc=item.scale||pcProgScale(item);
  return '<div class="pcx-progress-scale-row">'+
    '<span><b>Échelle</b>'+pcEsc(pcProgFormatMetric(item,sc.min))+' → '+pcEsc(pcProgFormatMetric(item,sc.max))+'</span>'+ 
    '<span><b>Pas</b>'+pcEsc(pcProgFormatMetric(item,sc.step))+'</span>'+ 
    '<span><b>Min réel</b>'+pcEsc(pcProgFormatMetric(item,sc.rawMin))+'</span>'+ 
    '<span><b>Max réel</b>'+pcEsc(pcProgFormatMetric(item,sc.rawMax))+'</span>'+ 
    '</div>';
}
function pcProgTrendLabel(item){
  var s=item.stats||{};
  var delta=Number(s.deltaMetric||0);
  var sign=delta>0?"+":"";
  var cls=s.trend==="up"?"up":(s.trend==="down"?"down":"flat");
  var unit=pcProgMetricUnit(item);
  var txt=s.points<2?"1 point":(sign+Math.round(delta)+unit);
  return '<span class="pcx-progress-trend '+cls+'">'+pcEsc(txt)+'</span>';
}
function pcProgInsight(item){
  var s=item.stats||{}, last=s.last||{};
  var points=Number(s.points||0), avg=Number(s.avgRpe||0), lastRpe=Number(last.rpe||0);
  if(points<2)return {cls:"watch",title:"Pas assez de données",text:"Garde le mouvement en suivi, mais ne tire pas encore de conclusion."};
  if(s.trend==="up" && avg && avg<=8.4 && lastRpe<9)return {cls:"good",title:"Progression propre",text:"La tendance monte sans RPE moyen trop haut."};
  if(s.trend==="up" && (avg>=8.6 || lastRpe>=9))return {cls:"warn",title:"Monte cher",text:"La progression existe, mais elle coûte cher en RPE. À surveiller."};
  if(s.trend==="stable" && (avg>=8.6 || lastRpe>=9))return {cls:"warn",title:"Stable mais lourd",text:"La charge ne monte pas beaucoup et l’effort reste élevé."};
  if(s.trend==="down")return {cls:"bad",title:"Baisse suspecte",text:"La tendance descend. Possible fatigue, deload, douleur ou mauvais mapping."};
  if(s.trend==="stable")return {cls:"flat",title:"Stable",text:"Rien d’alarmant, mais pas de progression nette sur la période."};
  return {cls:"watch",title:"À surveiller",text:"Données utilisables, mais tendance encore ambiguë."};
}
function pcProgSelectedDetail(item){
  if(!pcProgressSelected||pcProgressSelected.id!==item.id)return "";
  var row=(item.rows||[]).filter(function(r){return r._key===pcProgressSelected.key;})[0];
  if(!row)return "";
  var planned=row.planned?String(row.planned):"—";
  return '<div class="pcx-progress-selected"><h4>Point sélectionné</h4>'+ 
    '<div class="pcx-progress-selected-grid">'+
      '<span><b>Date</b>'+pcEsc(pcProgFullDateLabel(row.date))+'</span>'+ 
      '<span><b>Mouvement lu</b>'+pcEsc(row.rawLabel||item.label)+'</span>'+ 
      '<span><b>Réel</b>'+pcEsc(pcProgSetText(row))+'</span>'+ 
      '<span><b>Entrées regroupées</b>'+pcEsc(row._groupCount>1?row._groupCount:'1')+'</span>'+ 
      '<span><b>RPE</b>'+pcEsc(row.rpe?row.rpe:'—')+'</span>'+ 
      '<span><b>e1RM</b>'+pcEsc(row.e1rm?row.e1rm+' lb':'—')+'</span>'+ 
      '<span><b>Source</b>'+pcEsc(row.source||'historique')+'</span>'+ 
      '<span><b>Prévu</b>'+pcEsc(planned)+'</span>'+ 
      '<span><b>Contexte</b>'+pcEsc([row.cycle,row.week?('S'+row.week):'',row.day].filter(Boolean).join(' · ')||'—')+'</span>'+ 
    '</div>'+ (row._groupCount>1?'<p class="pcx-muted">Sets condensés ce jour-là : '+pcEsc((row._groupRows||[]).map(function(r){return pcProgSetText(r)+(r.rpe?' @RPE '+r.rpe:'');}).join(' · '))+'</p>':'')+ (row.note?'<p>'+pcEsc(row.note)+'</p>':'')+'</div>';
}
function pcRenderProgressCard(item){
  var s=item.stats||{}, last=s.last||{}, best=s.best||{};
  var lastText=item.metric==="reps"?(last.reps?pcProgFormatNumber(last.reps)+' reps'+(last.rpe?' @'+last.rpe:''):'—'):(last.load!=null?(pcProgSetText(last)+(last.rpe?' @'+last.rpe:'')):'—');
  var bestTitle=item.metric==="reps"?'Meilleur reps':'Meilleur e1RM';
  var bestText=item.metric==="reps"?(best.reps?best.reps+' reps':'—'):(best.e1rm?(best.e1rm+' lb'):'—');
  var insight=pcProgInsight(item);
  var rows=(item.rows||[]).slice(-8).reverse();
  var table=rows.map(function(r){
    return '<tr><td>'+pcEsc(pcProgFullDateLabel(r.date))+'</td><td>'+pcEsc(pcProgSetText(r))+(r._groupCount>1?' <small>('+pcEsc(r._groupCount)+' entrées)</small>':'')+'</td><td>'+pcEsc(r.rpe?('RPE '+r.rpe):'—')+'</td><td>'+pcEsc(r.e1rm?(r.e1rm+' lb'):'—')+'</td></tr>';
  }).join('');
  var aliasCount=Object.keys(item.aliases||{}).length;
  return '<article class="pcx-progress-card">'+
    '<header><div><h3>'+pcEsc(item.label)+'</h3><p>'+pcEsc((item.rows.length||0)+' séance'+(item.rows.length>1?'s':'')+' affichée'+(item.rows.length>1?'s':'')+(aliasCount>1?' · aliases regroupés':'') )+'</p></div>'+pcProgTrendLabel(item)+'</header>'+ 
    '<div class="pcx-progress-insight '+pcEsc(insight.cls)+'"><strong>'+pcEsc(insight.title)+'</strong><span>'+pcEsc(insight.text)+'</span></div>'+ 
    '<div class="pcx-progress-chart">'+pcProgSvg(item)+pcProgScaleSummary(item)+'</div>'+ pcProgSelectedDetail(item)+
    '<div class="pcx-progress-metrics">'+
      '<span><b>Dernier</b>'+pcEsc(lastText)+'</span>'+ 
      '<span><b>'+pcEsc(bestTitle)+'</b>'+pcEsc(bestText)+'</span>'+ 
      '<span><b>Variation</b>'+pcEsc((s.deltaMetric>0?'+':'')+Math.round(s.deltaMetric)+pcProgMetricUnit(item))+'</span>'+ 
      '<span><b>RPE moyen</b>'+pcEsc(s.avgRpe||'—')+'</span>'+ 
      '<span><b>Points</b>'+pcEsc(s.points||0)+'</span>'+ 
      '<span><b>e1RM Δ</b>'+pcEsc(item.metric==='reps'?'n/d':((s.deltaE1rm>0?'+':'')+Math.round(s.deltaE1rm)+' lb'))+'</span>'+ 
    '</div>'+ 
    '<details class="pcx-progress-details"><summary>Voir les dernières séances condensées</summary><table><thead><tr><th>Date</th><th>Réel retenu</th><th>RPE</th><th>e1RM</th></tr></thead><tbody>'+table+'</tbody></table></details>'+ 
    '</article>';
}
function pcProgOptionList(series,selected){
  return (series||[]).filter(function(x){return x.rows.length>=1;}).map(function(item){return '<option value="'+pcEsc(item.id)+'" '+(selected===item.id?'selected':'')+'>'+pcEsc(item.label)+'</option>';}).join('');
}
function pcProgFind(series,id){
  for(var i=0;i<(series||[]).length;i++)if(series[i].id===id)return series[i];
  return null;
}
function pcProgPercentRows(item){
  var rows=item.rows||[];
  var first=rows[0]||{};
  var base=pcProgMetricValue(item,first)||1;
  return rows.map(function(r,i){return {i:i,label:pcProgDateLabel(r.date),pct:Math.round(((pcProgMetricValue(item,r)-base)/base)*1000)/10,raw:pcProgMetricValue(item,r)};});
}
function pcProgCompareSvg(a,b){
  if(!a||!b)return '';
  var ar=pcProgPercentRows(a), br=pcProgPercentRows(b);
  if(!ar.length||!br.length)return '';
  var vals=ar.concat(br).map(function(r){return r.pct;});
  var rawMin=Math.min.apply(null,vals), rawMax=Math.max.apply(null,vals);
  if(rawMin===rawMax){rawMin-=5;rawMax+=5;}
  var step=pcProgNiceStep((rawMax-rawMin)/4);
  var min=Math.floor(rawMin/step)*step, max=Math.ceil(rawMax/step)*step;
  if(min>0)min=0;if(max<0)max=0;
  var ticks=[];for(var tv=min,g=0;tv<=max+step/2&&g<8;tv+=step,g++)ticks.push(Math.round(tv*10)/10);
  var w=640,h=220,left=58,right=24,top=24,bottom=42,innerW=w-left-right,innerH=h-top-bottom;
  function x(i,count){return left+(count===1?innerW/2:(i/(count-1))*innerW);} function y(v){return top+((max-v)/(max-min))*innerH;}
  function points(rows){return rows.map(function(r,i){return Math.round(x(i,rows.length))+','+Math.round(y(r.pct));}).join(' ');}
  var grid=ticks.map(function(t){var yy=Math.round(y(t));return '<g class="pcx-progress-gridline"><line x1="'+left+'" y1="'+yy+'" x2="'+(w-right)+'" y2="'+yy+'"></line><text x="'+(left-8)+'" y="'+(yy+4)+'">'+pcEsc((t>0?'+':'')+pcProgFormatNumber(t)+'%')+'</text></g>';}).join('');
  var labels=ar.map(function(r,i){if(i!==0&&i!==ar.length-1&&i%Math.ceil(ar.length/4)!==0)return '';return '<text class="pcx-progress-date" x="'+Math.round(x(i,ar.length))+'" y="'+(h-14)+'">'+pcEsc(r.label)+'</text>';}).join('');
  return '<svg class="pcx-progress-svg pcx-compare-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Comparaison progression">'+
    '<rect class="pcx-progress-plot-bg" x="'+left+'" y="'+top+'" width="'+innerW+'" height="'+innerH+'"></rect>'+grid+
    '<line class="pcx-progress-axis" x1="'+left+'" y1="'+(h-bottom)+'" x2="'+(w-right)+'" y2="'+(h-bottom)+'"></line>'+ 
    '<line class="pcx-progress-axis" x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(h-bottom)+'"></line>'+ 
    '<text class="pcx-progress-axis-title" x="'+left+'" y="16">Évolution normalisée depuis le premier point</text>'+ 
    '<polyline class="compare-a" points="'+points(ar)+'"></polyline><polyline class="compare-b" points="'+points(br)+'"></polyline>'+ labels + '</svg>';
}
function pcRenderProgressCompare(series){
  var candidates=(series||[]).filter(function(x){return x.rows.length>=2;});
  if(candidates.length<2)return '<section class="pcx-panel pcx-progress-compare"><h3>Comparaison</h3><p class="pcx-muted">Il faut au moins deux mouvements avec deux points chacun pour comparer.</p></section>';
  if(!pcProgressCompareA || !pcProgFind(candidates,pcProgressCompareA))pcProgressCompareA=candidates[0].id;
  if(!pcProgressCompareB || pcProgressCompareB===pcProgressCompareA || !pcProgFind(candidates,pcProgressCompareB))pcProgressCompareB=(candidates[1]||candidates[0]).id;
  var a=pcProgFind(candidates,pcProgressCompareA), b=pcProgFind(candidates,pcProgressCompareB);
  var aDelta=a&&a.stats?Math.round(a.stats.deltaMetric):0, bDelta=b&&b.stats?Math.round(b.stats.deltaMetric):0;
  return '<section class="pcx-panel pcx-progress-compare"><div class="pcx-progress-compare-head"><div><h3>Comparaison</h3><p>Compare deux mouvements sur la même période. Le graphique est normalisé en % depuis le premier point pour éviter de comparer 225 lb avec 12 reps directement.</p></div></div>'+ 
    '<div class="pcx-progress-controls compact"><label>Mouvement A<select id="pcProgressCompareA" class="pcx-select">'+pcProgOptionList(candidates,pcProgressCompareA)+'</select></label><label>Mouvement B<select id="pcProgressCompareB" class="pcx-select">'+pcProgOptionList(candidates,pcProgressCompareB)+'</select></label></div>'+ 
    '<div class="pcx-progress-legend"><span class="a">'+pcEsc(a.label)+' · '+(aDelta>0?'+':'')+aDelta+pcProgMetricUnit(a)+'</span><span class="b">'+pcEsc(b.label)+' · '+(bDelta>0?'+':'')+bDelta+pcProgMetricUnit(b)+'</span></div>'+ 
    '<div class="pcx-progress-chart">'+pcProgCompareSvg(a,b)+'</div></section>';
}
function pcRenderProgressControls(series,enough,onePoint){
  return '<section class="pcx-panel pcx-progress-summary"><div class="pcx-progress-summary-head"><div><h2>Progression — mouvements principaux</h2>'+ 
    '<p>Lecture seule : l’onglet lit l’historique local du profil actif et regroupe seulement les mouvements avec un vrai potentiel de progression. Les accessoires restent hors graphique.</p></div>'+ 
    '<div class="pcx-progress-stats"><span>'+series.length+' mouvements suivis</span><span>'+enough+' graphiques utiles</span><span>'+onePoint+' avec un seul point</span></div></div>'+ 
    '<div class="pcx-progress-controls"><button type="button" class="pcx-progress-filter '+(pcProgressRange==='4w'?'active':'')+'" data-pc-progress-range="4w">4 sem.</button>'+ 
    '<button type="button" class="pcx-progress-filter '+(pcProgressRange==='8w'?'active':'')+'" data-pc-progress-range="8w">8 sem.</button>'+ 
    '<button type="button" class="pcx-progress-filter '+(pcProgressRange==='all'?'active':'')+'" data-pc-progress-range="all">Tout</button></div></section>';
}
function pcRenderProgressTab(){
  var raw=pcBuildProgressionSeries();
  var series=pcProgFilteredSeries(raw);
  var enough=series.filter(function(x){return x.rows.length>=2;}).length;
  var onePoint=series.length-enough;
  if(!raw.length){
    return '<section class="pcx-panel pcx-progress-empty"><h2>Progression — mouvements principaux</h2><p class="pcx-muted">Aucun mouvement principal trackable trouvé dans l’historique du profil actif.</p><p>Les graphiques apparaîtront après des résultats sur Front Squat, Bench, Press, Pull-Up, Dip, Row, Hip Thrust, Clean, etc.</p></section>';
  }
  if(!series.length){
    return pcRenderProgressControls([],0,0)+'<section class="pcx-panel pcx-progress-empty"><p>Aucun point dans cette période. Passe à 8 semaines ou Tout.</p></section>';
  }
  var html=pcRenderProgressControls(series,enough,onePoint)+pcRenderProgressCompare(series)+ '<div class="pcx-progress-grid">'+series.map(pcRenderProgressCard).join('')+'</div>';
  return html;
}
function pcBindProgression(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-progress-range]'),function(btn){btn.onclick=function(){pcProgressRange=btn.getAttribute('data-pc-progress-range')||'all';pcProgressSelected=null;renderPhoneWod();};});
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-prog-point]'),function(dot){dot.onclick=function(){pcProgressSelected={id:dot.getAttribute('data-pc-prog-point'),key:dot.getAttribute('data-pc-prog-key')};renderPhoneWod();};});
  var a=document.getElementById('pcProgressCompareA');if(a)a.onchange=function(){pcProgressCompareA=this.value;renderPhoneWod();};
  var b=document.getElementById('pcProgressCompareB');if(b)b.onchange=function(){pcProgressCompareB=this.value;renderPhoneWod();};
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
  lines.push("- L’utilisateur écrit la vraie demande ensuite.");
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
function pcRenderAdminTab(){
  var profiles = window.CoachProfiles ? CoachProfiles.list().filter(function(p){ return p.onboarded; }) : [];
  var privatePrograms = (window.COACH_BERTIN_PROGRAM_INDEX || []).filter(function(p){ return p.visibility === 'private'; });

  if(!privatePrograms.length){
    return '<section class="pcx-panel"><h2>Admin</h2><p class="pcx-muted">Aucun programme privé défini.</p></section>';
  }

  var rows = profiles.map(function(p){
    var permCells = privatePrograms.map(function(prog){
      var has = Array.isArray(p.programPermissions) && p.programPermissions.indexOf(prog.id) !== -1;
      return '<td style="text-align:center">'+
        '<button type="button" class="pcx-perm-toggle '+(has?'active':'')+'" '+
          'data-profile-id="'+pcEsc(p.id)+'" data-program-id="'+pcEsc(prog.id)+'" '+
          'title="'+(has?'Révoquer':'Accorder')+' «'+pcEsc(prog.name)+'» à '+pcEsc(p.name)+'" '+
          'style="font-size:16px;background:none;border:none;cursor:pointer;opacity:'+(has?'1':'0.25')+'">'+(has?'✓':'·')+'</button>'+
        '</td>';
    }).join('');
    return '<tr><td style="padding:6px 10px 6px 0;white-space:nowrap"><strong>'+pcEsc(p.name)+'</strong></td>'+permCells+'</tr>';
  }).join('');

  var headers = privatePrograms.map(function(prog){
    var short = prog.name.replace(/^Phase \d+ — /,'').replace(/^Strict /,'').slice(0,22);
    return '<th style="font-size:10px;font-weight:600;padding:4px 6px;text-align:center;opacity:.7">'+pcEsc(short)+'</th>';
  }).join('');

  return '<section class="pcx-panel"><h2>Admin — Programmes privés</h2>'+
    '<p class="pcx-muted" style="font-size:11px">Coche ✓ pour donner accès, · pour retirer. Effet immédiat.</p>'+
    '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%">'+
      '<thead><tr><th style="text-align:left;padding:4px 10px 4px 0"></th>'+headers+'</tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
    '</table></div>'+
    '<p id="pcAdminStatus" class="status-msg" style="margin-top:10px"></p>'+
  '</section>';
}

function pcBindAdmin(){
  document.querySelectorAll('.pcx-perm-toggle').forEach(function(btn){
    btn.onclick = function(){
      var pid = btn.getAttribute('data-profile-id');
      var progId = btn.getAttribute('data-program-id');
      if(!pid || !progId || !window.CoachProfiles) return;
      var has = btn.classList.contains('active');
      if(has){
        CoachProfiles.revokeProgramPermission(pid, progId);
      } else {
        CoachProfiles.grantProgramPermission(pid, progId);
      }
      var s = document.getElementById('pcAdminStatus');
      if(s){ s.textContent = (has ? '❌ Retiré : ' : '✅ Accordé : ') + progId + ' → ' + pid; s.className='status-msg ok'; }
      // Re-render le tableau seulement
      renderPhoneWod();
    };
  });
}

function pcRenderActiveTab(){
  if(pcActiveTab==='week')return pcRenderWeekTab();
  if(pcActiveTab==='roadmap')return pcRenderRoadmapTab();
  if(pcActiveTab==='progress')return pcRenderProgressTab();
  if(pcActiveTab==='analysis')return pcRenderAnalysisTab();
  if(pcActiveTab==='export')return pcRenderExportTab();
  if(pcActiveTab==='admin' && pcIsAdmin())return pcRenderAdminTab();
  return pcRenderSessionTab();
}
function pcBind(){
  var c=$('pcCycleSelect'), w=$('pcWeekSelect'), d=$('pcDaySelect');
  if(c)c.onchange=function(){pcInspectCycleId=this.value;pcInspectWeek=1;pcInspectDay=(pcDayOrder()[0]||'lundi');renderPhoneWod();};
  if(w)w.onchange=function(){pcInspectWeek=Number(this.value)||1;renderPhoneWod();};
  if(d)d.onchange=function(){pcInspectDay=this.value;renderPhoneWod();};
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-tab]'),function(btn){btn.onclick=function(){pcActiveTab=btn.getAttribute('data-pc-tab')||'session';renderPhoneWod();};});
  if(pcIsAdmin()) pcBindAdmin();
  if(pcActiveTab==='progress' && typeof pcBindProgression==='function') pcBindProgression();
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

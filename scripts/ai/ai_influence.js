// Racine V3.3 — Avis IA Influence Tracker
// Trace les changements MANUELS de l'utilisateur qui semblent liés à un Avis IA importé.
// Règle sacrée : Avis IA ne modifie jamais une charge. L'utilisateur choisit; Racine documente l'origine.
(function(){
  "use strict";

  var api = window.RacineAIInfluence = window.RacineAIInfluence || {};
  var LOG_KEY = "racine_ai_influence_log_v1";
  var MAX_AGE_DAYS = 21;

  function str(v){ return String(v==null?"":v).trim(); }
  function norm(v){
    var s=str(v).toLowerCase();
    try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(e){}
    return s.replace(/[^a-z0-9]+/g,' ').trim();
  }
  function num(v){
    var n=Number(str(v).replace(',', '.').replace(/[^0-9.\-]/g,''));
    return isNaN(n)?null:n;
  }
  function nowIso(){ return new Date().toISOString(); }
  function daysSince(iso){
    if(!iso) return 9999;
    var t=new Date(iso).getTime();
    if(!t||isNaN(t)) return 9999;
    return Math.max(0,(Date.now()-t)/864e5);
  }
  function readLog(){
    try{ var raw=localStorage.getItem(LOG_KEY); var parsed=raw?JSON.parse(raw):[]; return Array.isArray(parsed)?parsed:[]; }
    catch(e){ return []; }
  }
  function writeLog(list){
    try{ localStorage.setItem(LOG_KEY, JSON.stringify((Array.isArray(list)?list:[]).slice(-160))); }
    catch(e){}
  }
  function saveInfluence(rec){
    if(!rec) return null;
    rec.created_at = rec.created_at || nowIso();
    var list=readLog();
    list.push(rec);
    writeLog(list);
    return rec;
  }
  function latestAdviceForMovement(movement){
    try{
      if(!window.RacineAIImport || typeof RacineAIImport.readLog!=='function') return null;
      var key=norm(movement);
      if(!key) return null;
      var list=RacineAIImport.readLog();
      for(var i=list.length-1;i>=0;i--){
        var r=list[i]||{};
        if(norm(r.movement)!==key) continue;
        if(daysSince(r.created_at)>MAX_AGE_DAYS) continue;
        if(!r.structured) continue;
        return r;
      }
    }catch(e){}
    return null;
  }
  function movementFromResultKey(key,result){
    if(result && result.planned && result.planned.context && result.planned.context.label) return result.planned.context.label;
    try{ if(typeof movementLabelFromKeyOrName==='function') return movementLabelFromKeyOrName(key); }catch(e){}
    return key;
  }
  function plannedLoadFromResult(result){
    var p=result&&result.planned?result.planned:{};
    var n=num(p.load);
    if(n!==null) return n;
    return null;
  }
  function direction(actual,planned){
    if(actual>planned) return 'higher_than_brain';
    if(actual<planned) return 'lower_than_brain';
    return 'same_as_brain';
  }
  function actionSupportsDirection(action,dir){
    action=str(action||'');
    if(dir==='higher_than_brain') return action==='consider_ambitious_option';
    if(dir==='lower_than_brain') return action==='reduce_aggressiveness'||action==='increase_confirmations'||action==='flag_possible_issue';
    return action==='confirm_current_load'||action==='monitor_only';
  }
  function buildInfluenceRecord(key,result,advice,actualLoad,brainLoad){
    var st=(advice&&advice.structured)||{};
    var dir=direction(actualLoad,brainLoad);
    var strong=actionSupportsDirection(st.suggested_action,dir);
    return {
      id:'AII-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase(),
      type:'user_override_influenced_by_ai_advice',
      confidence: strong ? 'strong' : 'possible',
      movement: movementFromResultKey(key,result),
      result_key:key,
      brainSuggestion:brainLoad,
      userLoad:actualLoad,
      direction:dir,
      aiAdviceId:advice&&advice.id||'',
      prompt_id:advice&&advice.prompt_id||'',
      ai_verdict:st.verdict||'unclear',
      ai_suggested_action:st.suggested_action||'monitor_only',
      ai_summary:st.summary||st.reason||'',
      source:'user_override',
      influencedBy:'ai_advice',
      consultative_only:true,
      applied_by_user:true
    };
  }
  function annotateSessionResults(results, payload){
    var annotated=[];
    Object.keys(results||{}).forEach(function(key){
      var r=results[key];
      if(!r || r.isWod) return;
      var actual=num(r.load);
      if(actual===null) return;
      var brain=plannedLoadFromResult(r);
      if(brain===null) return;
      // L'utilisateur a gardé la suggestion Brain : rien à tracer.
      if(Math.abs(actual-brain)<0.01) return;
      var movement=movementFromResultKey(key,r);
      var advice=latestAdviceForMovement(movement);
      if(!advice) return;
      var rec=buildInfluenceRecord(key,r,advice,actual,brain);
      rec.session={
        date:(payload&&payload.date)||'',
        day:(payload&&payload.jour)||'',
        week:(payload&&payload.semaine)||'',
        cycle:(payload&&payload.cycle)||''
      };
      r.aiAdviceInfluence={
        source:rec.source,
        influencedBy:rec.influencedBy,
        aiAdviceId:rec.aiAdviceId,
        prompt_id:rec.prompt_id,
        brainSuggestion:rec.brainSuggestion,
        userLoad:rec.userLoad,
        direction:rec.direction,
        confidence:rec.confidence,
        aiSuggestedAction:rec.ai_suggested_action,
        consultative_only:true
      };
      saveInfluence(rec);
      annotated.push(rec);
    });
    return annotated;
  }
  function latestInfluenceForMovement(movement){
    var key=norm(movement); if(!key) return null;
    var list=readLog();
    for(var i=list.length-1;i>=0;i--){ if(norm(list[i]&&list[i].movement)===key) return list[i]; }
    return null;
  }
  function influenceSummaryText(rec){
    if(!rec) return '';
    var dir=rec.direction==='higher_than_brain'?'plus haut que Brain':(rec.direction==='lower_than_brain'?'plus bas que Brain':'égal à Brain');
    return 'Dernier choix utilisateur influencé par Avis IA : '+rec.userLoad+' lb ('+dir+'). Brain proposait '+rec.brainSuggestion+' lb.';
  }

  api.LOG_KEY=LOG_KEY;
  api.annotateSessionResults=annotateSessionResults;
  api.readLog=readLog;
  api.latestAdviceForMovement=latestAdviceForMovement;
  api.latestInfluenceForMovement=latestInfluenceForMovement;
  api.influenceSummaryText=influenceSummaryText;
})();

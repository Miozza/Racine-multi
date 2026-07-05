// Racine V4.2 — Avis IA Gestion + Nettoyage
// Mobile-first: coller une réponse IA, extraire le bloc structuré, sauvegarder localement.
// Brain décide. Avis IA conseille. Aucune charge n'est modifiée automatiquement.
(function(){
  "use strict";

  var api = window.RacineAIImport = window.RacineAIImport || {};
  var ADVICE_LOG_KEY = "racine_ai_advice_log_v1";
  var RESPONSE_START = "RACINE_AI_RESPONSE_START";
  var RESPONSE_END = "RACINE_AI_RESPONSE_END";

  function str(v){ return String(v==null?"":v).trim(); }
  function esc(s){
    return str(s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});
  }
  function norm(v){
    var s=str(v).toLowerCase();
    try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(e){}
    return s.replace(/[^a-z0-9]+/g,' ').trim();
  }
  function nowIso(){ return new Date().toISOString(); }
  function uuid(){ return 'AI-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase(); }

  function readLog(){
    try{ var raw=localStorage.getItem(ADVICE_LOG_KEY); var parsed=raw?JSON.parse(raw):[]; return Array.isArray(parsed)?parsed:[]; }
    catch(e){ return []; }
  }
  function writeLog(list){
    try{ localStorage.setItem(ADVICE_LOG_KEY, JSON.stringify((Array.isArray(list)?list:[]).slice(-120))); }
    catch(e){}
  }
  function promptMetaForId(pid){
    try{ if(window.RacineAIExport && typeof RacineAIExport.promptMetaForId==='function') return RacineAIExport.promptMetaForId(pid); }
    catch(e){}
    return null;
  }

  function markerBlock(text){
    text=str(text);
    var start=text.indexOf(RESPONSE_START);
    var end=text.indexOf(RESPONSE_END);
    if(start<0 || end<0 || end<=start) return '';
    return text.slice(start+RESPONSE_START.length,end).trim();
  }
  function stripCodeFence(text){
    text=str(text);
    var m=text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return m?str(m[1]):text;
  }
  function firstJsonObject(text){
    text=stripCodeFence(text);
    var start=text.indexOf('{');
    var end=text.lastIndexOf('}');
    if(start<0 || end<=start) return '';
    return text.slice(start,end+1).trim();
  }
  function parseJsonCandidate(candidate){
    candidate=str(candidate);
    if(!candidate) return {structured:null,error:'empty_json'};
    try{ return {structured:JSON.parse(candidate),error:null,jsonText:candidate}; }
    catch(e){ return {structured:null,error:'invalid_json',jsonText:candidate}; }
  }
  function parseStructured(text){
    text=str(text);
    var block=markerBlock(text);
    if(block){
      var marked=parseJsonCandidate(block);
      if(!marked.error) marked.source='markers';
      return marked;
    }
    var direct=firstJsonObject(text);
    if(direct){
      var parsed=parseJsonCandidate(direct);
      if(!parsed.error){ parsed.source='json_fallback'; parsed.warning='missing_markers'; }
      return parsed;
    }
    return {structured:null,error:'missing_markers'};
  }
  function normalizeStructured(obj){
    obj=obj&&typeof obj==='object'?obj:{};
    var allowed=['confirm_current_load','consider_ambitious_option','increase_confirmations','reduce_aggressiveness','monitor_only','flag_possible_issue','maintain_but_watch'];
    var action=str(obj.suggested_action||'monitor_only');
    if(allowed.indexOf(action)<0) action='monitor_only';
    var verdict=str(obj.verdict||'unclear');
    if(['agree','partially_agree','disagree','unclear'].indexOf(verdict)<0) verdict='unclear';
    var confidence=Number(obj.confidence);
    if(isNaN(confidence)) confidence=null;
    if(confidence!=null && confidence>1) confidence=confidence/100;
    if(confidence!=null) confidence=Math.max(0,Math.min(1,confidence));
    return {
      racine_ai_response_version: str(obj.racine_ai_response_version||'1.0'),
      prompt_version: str(obj.prompt_version||''),
      prompt_id: str(obj.prompt_id||''),
      scope: str(obj.scope||'movement'),
      movement: str(obj.movement||''),
      verdict: verdict,
      confidence: confidence,
      summary: str(obj.summary||''),
      brain_agreement: str(obj.brain_agreement||''),
      suggested_action: action,
      reason: str(obj.reason||''),
      global_risk_level: str(obj.global_risk_level||''),
      priority_movements: Array.isArray(obj.priority_movements)?obj.priority_movements.slice(0,12):[],
      cycle_findings: Array.isArray(obj.cycle_findings)?obj.cycle_findings.slice(0,20):[],
      do_not_auto_apply: obj.do_not_auto_apply!==false
    };
  }
  function verdictLabel(v){
    v=str(v);
    if(v==='agree') return 'D’accord avec Brain';
    if(v==='partially_agree') return 'Partiellement d’accord';
    if(v==='disagree') return 'En désaccord';
    return 'Avis incertain';
  }
  function actionLabel(a){
    a=str(a);
    return {
      confirm_current_load:'Confirmer la charge actuelle',
      consider_ambitious_option:'Considérer l’option ambitieuse',
      increase_confirmations:'Demander plus de validations',
      reduce_aggressiveness:'Réduire l’agressivité',
      monitor_only:'Surveiller seulement',
      flag_possible_issue:'Signaler un point à vérifier',
      maintain_but_watch:'Maintenir et surveiller'
    }[a] || 'Surveiller seulement';
  }
  function confidenceLabel(c){
    if(c==null) return '—';
    return Math.round(c*100)+' %';
  }
  function dateLabel(iso){
    var s=str(iso);
    if(!s) return '';
    try{
      var d=new Date(s);
      if(isNaN(d.getTime())) return s.slice(0,16).replace('T',' ');
      return d.toLocaleDateString('fr-CA',{month:'2-digit',day:'2-digit'})+' '+d.toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'});
    }catch(e){ return s.slice(0,16).replace('T',' '); }
  }

  function statusLabel(status){
    status=str(status);
    return {
      reliable:'Fiable',
      watch:'À surveiller',
      too_fast:'Trop rapide',
      too_slow:'Trop lent',
      mapping_issue:'Mapping à vérifier',
      unclear:'Incertain'
    }[status] || (status || 'Incertain');
  }
  function latestCycleFindingForMovement(movement){
    var key=norm(movement);
    if(!key) return null;
    var list=readLog();
    for(var i=list.length-1;i>=0;i--){
      var r=list[i]||{};
      var st=r.structured||{};
      if(str(r.scope)!=='cycle' && str(st.scope)!=='cycle') continue;
      var findings=Array.isArray(st.cycle_findings)?st.cycle_findings:[];
      for(var j=0;j<findings.length;j++){
        var f=findings[j]||{};
        if(norm(f.movement)===key){
          return {record:r, finding:f};
        }
      }
    }
    return null;
  }

  function saveAdvice(record){
    record=record||{};
    var list=readLog();
    if(!record.id) record.id=uuid();
    record.created_at=record.created_at||nowIso();
    record.consultative_only=true;
    record.applied=false;
    list.push(record);
    writeLog(list);
    return record;
  }
  function latestForMovement(movement){
    var key=norm(movement);
    if(!key) return null;
    var list=readLog();
    for(var i=list.length-1;i>=0;i--){
      var r=list[i]||{};
      if(norm(r.movement)===key) return r;
    }
    return null;
  }
  function latestForScope(scope){
    scope=str(scope||'');
    if(!scope) return null;
    var list=readLog();
    for(var i=list.length-1;i>=0;i--){
      var r=list[i]||{};
      if(str(r.scope)===scope) return r;
    }
    return null;
  }
  function listRecent(limit){ return readLog().slice(-(limit||20)).reverse(); }

  function importAdvice(rawText, context){
    context=context||{};
    var parsed=parseStructured(rawText);
    var structured=parsed.structured?normalizeStructured(parsed.structured):null;
    var pid=structured?structured.prompt_id:'';
    var meta=pid?promptMetaForId(pid):null;
    var movement=str(context.movement || (structured&&structured.movement) || (meta&&meta.movement) || '');
    var record={
      id: uuid(),
      created_at: nowIso(),
      status: structured?'structured':'raw_only',
      parse_error: parsed.error||null,
      parse_source: parsed.source || null,
      parse_warning: parsed.warning || null,
      prompt_id: pid,
      prompt_matched: !!meta,
      scope: str(context.scope || (structured&&structured.scope) || (meta&&meta.scope) || 'movement'),
      movement: movement,
      raw_text: str(rawText),
      structured: structured,
      consultative_only: true,
      applied: false
    };
    return saveAdvice(record);
  }

  function removeById(id){
    id=str(id);
    if(!id) return false;
    var list=readLog();
    var next=list.filter(function(r){return str(r&&r.id)!==id;});
    if(next.length===list.length) return false;
    writeLog(next);
    return true;
  }
  function clearLatestMovementAdvice(movement){
    var rec=latestForMovement(movement);
    return rec?removeById(rec.id):false;
  }
  function clearLatestCycleAdvice(){
    var rec=latestForScope('cycle');
    return rec?removeById(rec.id):false;
  }
  function clearAllAdvice(){
    writeLog([]);
    return true;
  }

  function renderAdviceSummaryForMovement(movement){
    var rec=latestForMovement(movement);
    var cycle=latestCycleFindingForMovement(movement);
    var blocks=[];
    if(rec){
      var st=rec.structured;
      if(!st){
        blocks.push('<div class="ai-advice-summary" data-ai-advice-kind="movement"><strong>Avis IA mouvement actif</strong><br><small>Texte brut seulement · aucune action structurée.</small><br><small>Importé : '+esc(dateLabel(rec.created_at))+'</small><button type="button" class="btn-secondary ai-advice-btn ai-advice-clear-btn" data-ai-clear="movement">Effacer avis mouvement actif</button></div>');
      }else{
        blocks.push('<div class="ai-advice-summary" data-ai-advice-kind="movement">'+
          '<strong>Avis IA mouvement actif — '+esc(verdictLabel(st.verdict))+'</strong>'+
          '<p>'+esc(st.summary||st.reason||'Avis consultatif importé.')+'</p>'+
          '<small>Importé : '+esc(dateLabel(rec.created_at))+'</small><br>'+
          '<small>Action : '+esc(actionLabel(st.suggested_action))+' · Confiance IA : '+esc(confidenceLabel(st.confidence))+'</small><br>'+
          '<small>Aucune modification automatique.</small>'+
          '<button type="button" class="btn-secondary ai-advice-btn ai-advice-clear-btn" data-ai-clear="movement">Effacer avis mouvement actif</button>'+
        '</div>');
      }
    }
    if(cycle && cycle.finding){
      var f=cycle.finding||{};
      var stc=(cycle.record&&cycle.record.structured)||{};
      blocks.push('<div class="ai-advice-summary ai-advice-cycle-summary" data-ai-advice-kind="cycle">'+
        '<strong>Avis IA cycle actif — '+esc(statusLabel(f.status))+'</strong>'+
        '<p>'+esc(f.reason||'Constat cycle importé pour ce mouvement.')+'</p>'+
        '<small>Importé : '+esc(dateLabel(cycle.record&&cycle.record.created_at))+'</small><br>'+
        '<small>Action cycle : '+esc(actionLabel(f.suggested_action))+
          (stc.confidence!=null?' · Confiance IA : '+esc(confidenceLabel(stc.confidence)):'')+
          (stc.global_risk_level?' · Risque global : '+esc(stc.global_risk_level):'')+
        '</small><br>'+
        '<small>Aucune modification automatique.</small>'+
        '<button type="button" class="btn-secondary ai-advice-btn ai-advice-clear-btn" data-ai-clear="cycle">Effacer avis cycle actif</button>'+
      '</div>');
    }
    if(!blocks.length) return '<p class="ai-advice-note">Aucun avis importé pour ce mouvement.</p>';
    return blocks.join('');
  }
  function renderAdviceSummaryForScope(scope){
    var rec=latestForScope(scope);
    if(!rec) return '<div class="ai-advice-summary pc-ai-cycle-summary"><strong>Aucun Avis IA '+esc(scope||'global')+' importé</strong><br><small>Copie le prompt, colle la réponse IA ici, puis Racine la garde en mémoire locale.</small></div>';
    var st=rec.structured;
    if(!st){
      return '<div class="ai-advice-summary pc-ai-cycle-summary"><strong>Avis IA '+esc(scope)+' actif</strong><br><small>Texte brut seulement · aucune action structurée.</small><br><small>Importé : '+esc(dateLabel(rec.created_at))+'</small><button type="button" class="pcx-action secondary ai-advice-clear-btn" data-ai-clear="'+esc(scope)+'">Effacer avis '+esc(scope)+' actif</button></div>';
    }
    var findings='';
    if(Array.isArray(st.cycle_findings)&&st.cycle_findings.length){
      findings='<ul>'+st.cycle_findings.slice(0,8).map(function(f){
        return '<li><strong>'+esc(f.movement||'Mouvement')+'</strong> — '+esc(f.status||'')+' · '+esc(actionLabel(f.suggested_action||''))+'<br><small>'+esc(f.reason||'')+'</small></li>';
      }).join('')+'</ul>';
    }
    var risk=st.global_risk_level?'<small>Risque global : '+esc(st.global_risk_level)+'</small><br>':'';
    return '<div class="ai-advice-summary pc-ai-cycle-summary">'+
      '<strong>Avis IA '+esc(scope)+' actif — '+esc(verdictLabel(st.verdict))+'</strong>'+
      '<p>'+esc(st.summary||st.reason||'Avis consultatif importé.')+'</p>'+
      '<small>Importé : '+esc(dateLabel(rec.created_at))+'</small><br>'+
      risk+
      '<small>Action globale : '+esc(actionLabel(st.suggested_action))+' · Confiance IA : '+esc(confidenceLabel(st.confidence))+'</small>'+
      findings+
      '<small>Aucune modification automatique.</small>'+
      '<button type="button" class="pcx-action secondary ai-advice-clear-btn" data-ai-clear="'+esc(scope)+'">Effacer avis '+esc(scope)+' actif</button>'+
      '<button type="button" class="pcx-action secondary danger ai-advice-clear-btn" data-ai-clear="all">Effacer tous les avis IA</button>'+
    '</div>';
  }

  function showImportModal(context, onSaved){
    context=context||{};
    var existing=document.getElementById('aiAdviceImportModal');
    if(existing) existing.remove();
    var modal=document.createElement('div');
    modal.id='aiAdviceImportModal';
    modal.className='tuto-modal';
    modal.innerHTML='<div class="tuto-modal-inner ai-import-modal">'+
      '<div class="tuto-topline">AVIS IA</div>'+
      '<div class="tuto-title">Importer une réponse IA</div>'+
      '<p class="muted">Colle ici toute la réponse de l’IA. Idéalement avec '+RESPONSE_START+' / '+RESPONSE_END+', mais un JSON seul valide sera aussi reconnu.</p>'+ 
      '<textarea id="aiAdviceImportText" class="ai-import-textarea" placeholder="Colle la réponse IA ici..."></textarea>'+
      '<div id="aiAdviceImportResult" class="ai-import-result"></div>'+
      '<button type="button" id="aiAdviceSaveBtn" class="btn-accent" style="width:100%;margin-top:10px">Analyser et enregistrer</button>'+
      '<button type="button" id="aiAdviceCloseBtn" class="btn-secondary" style="width:100%;margin-top:8px">Fermer</button>'+
    '</div>';
    document.body.appendChild(modal);
    setTimeout(function(){modal.classList.add('visible');},20);
    var close=function(){modal.classList.remove('visible');setTimeout(function(){modal.remove();},220);};
    var saveBtn=document.getElementById('aiAdviceSaveBtn');
    var closeBtn=document.getElementById('aiAdviceCloseBtn');
    var box=document.getElementById('aiAdviceImportResult');
    if(closeBtn) closeBtn.onclick=close;
    if(saveBtn) saveBtn.onclick=function(){
      var ta=document.getElementById('aiAdviceImportText');
      var raw=ta?ta.value:'';
      if(!str(raw)){ if(box) box.innerHTML='<p class="bad">Rien à importer.</p>'; return; }
      var rec=importAdvice(raw,context);
      if(box){
        if(rec.structured){
          var warn=rec.parse_warning==='missing_markers'?' <br><small>Import JSON sans marqueurs reconnu.</small>':'';
          box.innerHTML='<p class="good"><strong>Avis IA importé.</strong><br>'+esc(verdictLabel(rec.structured.verdict))+' · '+esc(actionLabel(rec.structured.suggested_action))+warn+'</p><p class="muted">Consultatif seulement. Aucune charge n’a été modifiée.</p>';
        }else{
          box.innerHTML='<p class="warn"><strong>Réponse enregistrée en texte brut.</strong><br>Aucun JSON structuré valide détecté.</p>';
        }
      }
      if(typeof onSaved==='function') onSaved(rec);
    };
    modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
  }

  api.ADVICE_LOG_KEY=ADVICE_LOG_KEY;
  api.importAdvice=importAdvice;
  api.readLog=readLog;
  api.listRecent=listRecent;
  api.latestForScope=latestForScope;
  api.latestForMovement=latestForMovement;
  api.latestCycleFindingForMovement=latestCycleFindingForMovement;
  api.clearLatestMovementAdvice=clearLatestMovementAdvice;
  api.clearLatestCycleAdvice=clearLatestCycleAdvice;
  api.clearAllAdvice=clearAllAdvice;
  api.removeById=removeById;
  api.renderAdviceSummaryForMovement=renderAdviceSummaryForMovement;
  api.renderAdviceSummaryForScope=renderAdviceSummaryForScope;
  api.showImportModal=showImportModal;
})();

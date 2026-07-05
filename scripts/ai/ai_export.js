// Racine V3.6 — Avis IA Cycle Schema
// Format universel, sans API. Brain décide. Avis IA conseille.
(function(){
  "use strict";

  var api = window.RacineAIExport = window.RacineAIExport || {};
  var PROMPT_VERSION = "RACINE_AI_PROMPT_V1";
  var RESPONSE_START = "RACINE_AI_RESPONSE_START";
  var RESPONSE_END = "RACINE_AI_RESPONSE_END";

  function str(v){ return String(v==null?"":v).trim(); }
  function num(v){ var n=Number(str(v).replace(',', '.').replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; }
  function safeName(v){ return str(v).normalize ? str(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toUpperCase() : str(v).replace(/[^a-zA-Z0-9]+/g,'-').toUpperCase(); }
  function todayKey(){
    var d=new Date();
    var m=String(d.getMonth()+1); if(m.length<2)m='0'+m;
    var day=String(d.getDate()); if(day.length<2)day='0'+day;
    return d.getFullYear()+m+day;
  }
  function promptId(scope, movement){
    return ['RACINE', todayKey(), safeName(scope||'GENERAL'), safeName(movement||'GLOBAL'), Math.random().toString(36).slice(2,7).toUpperCase()].join('-');
  }
  function appVersion(){ return (typeof APP_VERSION!=='undefined' && APP_VERSION) ? APP_VERSION : 'V?'; }
  function linesPush(lines, title, value){
    if(value!==undefined && value!==null && str(value)!==''){
      lines.push(title+': '+str(value));
    }
  }
  function cleanLoad(v){ return str(v).replace(/\s*⚠\s*/g,'').trim(); }
  function rows(h){ return (h&&Array.isArray(h.rows))?h.rows:[]; }
  function recentRowsText(h, limit){
    var r=rows(h).slice(0,limit||8);
    if(!r.length) return ['- Aucun historique ciblé disponible.'];
    return r.map(function(x){
      var parts=[];
      if(x.date) parts.push(str(x.date));
      parts.push((x.load!=null?str(x.load)+' lb':'charge n/d')+' × '+(x.reps||'?'));
      if(x.rpe) parts.push('RPE '+x.rpe);
      if(x.status) parts.push(str(x.status));
      return '- '+parts.join(' — ');
    });
  }
  function brainExplain(h){
    try{
      if(window.CoachBrainExplain && typeof CoachBrainExplain.build==='function') return CoachBrainExplain.build(h||{});
    }catch(e){}
    return null;
  }
  function journalText(h){
    try{
      if(window.CoachBrainJournal && typeof CoachBrainJournal.insightForHint==='function'){
        var j=CoachBrainJournal.insightForHint(h||{});
        if(j&&j.text) return j.text;
      }
    }catch(e){}
    return '';
  }
  var PROMPT_LOG_KEY = "racine_ai_prompt_log_v1";

  function readPromptLog(){
    try{
      var raw=localStorage.getItem(PROMPT_LOG_KEY);
      var parsed=raw?JSON.parse(raw):[];
      return Array.isArray(parsed)?parsed:[];
    }catch(e){ return []; }
  }
  function writePromptLog(list){
    try{
      var safe=(Array.isArray(list)?list:[]).slice(-80);
      localStorage.setItem(PROMPT_LOG_KEY, JSON.stringify(safe));
    }catch(e){}
  }
  function rememberPrompt(meta){
    try{
      meta=meta||{};
      if(!meta.prompt_id) return;
      var list=readPromptLog().filter(function(x){ return x&&x.prompt_id!==meta.prompt_id; });
      meta.created_at=new Date().toISOString();
      list.push(meta);
      writePromptLog(list);
    }catch(e){}
  }
  function promptMetaForId(pid){
    var list=readPromptLog();
    for(var i=list.length-1;i>=0;i--){ if(list[i]&&list[i].prompt_id===pid) return list[i]; }
    return null;
  }

  function responseContract(scope, promptIdValue, movementName, meta){
    var pid = str(promptIdValue || '<copier le prompt_id reçu>');
    var sc = str(scope||'movement');
    var mov = str(movementName || (sc==='movement' ? '<nom du mouvement>' : ''));
    var actions = '["confirm_current_load", "consider_ambitious_option", "increase_confirmations", "reduce_aggressiveness", "monitor_only", "flag_possible_issue", "maintain_but_watch"]';
    var priority = (meta && Array.isArray(meta.priorityMovements)) ? meta.priorityMovements.slice(0,8) : [];
    var priorityJson = JSON.stringify(priority);
    var common = [
      'FORMAT DE RÉPONSE OBLIGATOIRE',
      '',
      '1) Commence par un avis court, lisible par un humain.',
      '2) Termine par un bloc JSON strict entre les deux marqueurs suivants.',
      '3) Ne mets aucune charge en application. Avis IA est consultatif.',
      '',
      RESPONSE_START,
      '{',
      '  "racine_ai_response_version": "1.0",',
      '  "prompt_version": "'+PROMPT_VERSION+'",',
      '  "prompt_id": "'+pid.replace(/"/g,'\\"')+'",',
      '  "scope": "'+sc+'",',
      '  "verdict": "agree|partially_agree|disagree|unclear",',
      '  "confidence": 0.0,',
      '  "summary": "résumé court",',
      '  "brain_agreement": "d’accord avec Brain / partiellement d’accord / désaccord",'
    ];
    if(sc==='cycle' || sc==='session' || sc==='global'){
      return common.concat([
        '  "global_risk_level": "low|moderate|high|unclear",',
        '  "priority_movements": '+priorityJson+',',
        '  "cycle_findings": [',
        '    {',
        '      "movement": "nom du mouvement",',
        '      "status": "reliable|watch|too_fast|too_slow|mapping_issue|unclear",',
        '      "suggested_action": "confirm_current_load|consider_ambitious_option|increase_confirmations|reduce_aggressiveness|monitor_only|flag_possible_issue|maintain_but_watch",',
        '      "reason": "raison courte et concrète"',
        '    }',
        '  ],',
        '  "allowed_actions": '+actions+',',
        '  "suggested_action": "confirm_current_load|consider_ambitious_option|increase_confirmations|reduce_aggressiveness|monitor_only|flag_possible_issue|maintain_but_watch",',
        '  "reason": "raison globale sans modifier automatiquement une charge",',
        '  "do_not_auto_apply": true',
        '}',
        RESPONSE_END
      ]);
    }
    return common.concat([
      '  "movement": "'+mov.replace(/"/g,'\\"')+'",',
      '  "allowed_actions": '+actions+',',
      '  "suggested_action": "confirm_current_load|consider_ambitious_option|increase_confirmations|reduce_aggressiveness|monitor_only|flag_possible_issue|maintain_but_watch",',
      '  "reason": "raison précise sans modifier automatiquement la charge",',
      '  "do_not_auto_apply": true',
      '}',
      RESPONSE_END
    ]);
  }
  function rules(){
    return [
      'RÈGLES IMPORTANTES',
      '- Tu es Avis IA, un conseiller externe pour Racine.',
      '- Brain est le moteur interne qui connaît l’historique. Tu analyses sa décision, tu ne le remplaces pas.',
      '- Tu peux être d’accord, partiellement d’accord ou en désaccord.',
      '- Tu ne modifies jamais automatiquement une charge.',
      '- Si tu suggères une autre charge, elle doit rester une option que l’utilisateur choisira manuellement.',
      '- Si l’utilisateur suit ton avis, Racine l’enregistrera comme décision utilisateur influencée par Avis IA, pas comme décision automatique.',
      '- Reste concret : faits, risques, action consultative.'
    ];
  }
  function trendFromRowsList(list){
    list = Array.isArray(list)?list:[];
    var ordered = list.slice().reverse();
    var loads = ordered.map(function(r){ return num(r&&r.load); }).filter(function(n){ return n>0; });
    var rpes = ordered.map(function(r){ return num(r&&r.rpe); }).filter(function(n){ return n>0; });
    var inc=0,drops=0;
    for(var i=1;i<loads.length;i++){ if(loads[i]>loads[i-1]) inc++; if(loads[i]<loads[i-1]) drops++; }
    return {loads:loads,rpes:rpes,increases:inc,drops:drops,last:loads.length?loads[loads.length-1]:0,first:loads.length?loads[0]:0,hard:rpes.filter(function(x){return x>=9;}).length};
  }
  function movementPrimaryReason(hint, ex){
    var current = str(ex&&ex.primaryReason);
    var generic = !current || /meilleure estimation|historique actuel|charge proposée/i.test(current);
    if(!generic) return current;
    var hRows = rows(hint);
    var t = trendFromRowsList(hRows);
    var name = str(hint&& (hint.name||hint.label||hint.movement)) || 'Ce mouvement';
    var load = cleanLoad(hint && (hint.load||hint.suggestedLoad));
    if(t.hard>0 && /pull|dip|strict press|front squat/i.test(name)) return 'Un effort très élevé récent demande une validation prudente.';
    if(t.loads.length>=3 && t.increases>=2 && t.drops===0){
      var seq = t.loads.slice(-5).join(' → ');
      return 'Progression régulière observée : '+seq+' lb.';
    }
    if(load) return 'Brain propose '+load+' comme meilleure estimation à confirmer.';
    return current || 'Historique insuffisant : avis consultatif seulement.';
  }
  function cleanPromptFacts(facts){
    facts = Array.isArray(facts)?facts:[];
    var out=[];
    facts.forEach(function(f){
      var x=str(f);
      if(!x) return;
      if(/Signal RPE fort détecté/i.test(x)) x='Un RPE 9+ récent invite à surveiller la stabilité.';
      if(/RPE 8 fréquent/i.test(x)) x='RPE 8 fréquent : signal moyen dans le profil de Bertin.';
      if(!out.some(function(y){return y.toLowerCase()===x.toLowerCase();})) out.push(x);
    });
    return out.slice(0,5);
  }
  function alertCategoryFor(name, message){
    var n=str(name), m=str(message), all=(n+' '+m).toLowerCase();
    if(/pull-up|weighted pull|dip/.test(all) && /rpe haut|rpe 9|difficile|hard/.test(all)) return 'Poids du corps lesté : '+n+' validé, mais confort faible / RPE haut.';
    if(/overhead rope extension|triceps/.test(all)) return 'Triceps : '+n+' suggéré au-dessus de l’historique récent, vérifier avant progression.';
    if(/lateral raise|rear delt|face pull|isolation/.test(all)) return 'Isolations épaules : '+n+' possiblement agressif, privilégier qualité et contrôle.';
    if(/db shoulder press|strict press/.test(all)) return 'Press épaules : '+n+' à valider sans compensation lombaire.';
    if(/barbell row/.test(all)) return 'Barbell Row : progression logique, mais valider avec buste stable.';
    if(/hip thrust/.test(all)) return 'Hip Thrust : progression rapide à confirmer avec pause en haut et zéro lombaire.';
    if(/front squat/.test(all)) return 'Front Squat : valider la charge avant d’accélérer.';
    if(/mapping|contexte different|écart|ecart/.test(all)) return 'Mapping/contexte : '+n+' mérite vérification, pas forcément une erreur.';
    return n+' : '+str(message).replace(/Brain V2.*$/,'').trim();
  }
  function uniquePriorityMovements(names){
    var priority = ['Weighted Pull-up','Overhead Rope Extension','Rear Delt Fly câble','DB Shoulder Press','Hip Thrust','Barbell Row','Front Squat','Lateral Raise câble','Face Pull'];
    var found=[];
    priority.forEach(function(p){ if(names.some(function(n){ return normMove(n)===normMove(p) || normMove(n).indexOf(normMove(p))>=0 || normMove(p).indexOf(normMove(n))>=0; })) found.push(p); });
    names.forEach(function(n){ if(found.length<8 && !found.some(function(x){return normMove(x)===normMove(n);})) found.push(n); });
    return found.slice(0,8);
  }
  function normMove(v){ return str(v).toLowerCase().normalize ? str(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() : str(v).toLowerCase(); }
  function compactContextReport(text, scope){
    text = str(text);
    var lines = text.split(/\r?\n/);
    var wanted = /front squat|hip thrust|barbell row|weighted pull|strict press|db shoulder press|db rdl|cable curl|face pull|overhead rope extension|lateral raise|rear delt|power clean/i;
    var byMove = {};
    function addMove(name, load, reps, rpe, suggested){
      name = str(name).replace(/^•\s*/,'').trim();
      if(!name || !wanted.test(name)) return;
      var rec = {load:cleanLoad(load), reps:str(reps), rpe:str(rpe), suggested:cleanLoad(suggested)};
      byMove[name] = byMove[name] || [];
      byMove[name].push(rec);
    }
    lines.forEach(function(line){
      var m = line.match(/^\s*•\s*([^·]+?)\s*·.*?suggéré\s+([^·\n]+).*?fait\s+([^·\n]+?)\s+·\s*reps\s+([^·\n]+)\s+·\s*RPE\s+([^·\n]+)/i);
      if(m){ addMove(m[1], m[3], m[4], m[5], m[2]); return; }
      m = line.match(/^\s*•\s*([^·]+?)\s*·.*?suggéré\s+([^·\n]+).*?reps\s+([^·\n]+)\s+·\s*RPE\s+([^·\n]+)/i);
      if(m){ addMove(m[1], '', m[3], m[4], m[2]); return; }
    });
    var alertGroups = [];
    lines.forEach(function(line){
      var m=line.match(/^\s*-\s*Alerte:\s*([^·]+)\s*·\s*([^·]+)\s*·\s*(.+)$/i);
      if(m){
        var msg = alertCategoryFor(m[1], m[3]);
        if(!alertGroups.some(function(x){return x.toLowerCase()===msg.toLowerCase();})) alertGroups.push(msg);
      }
    });
    var out=[];
    out.push('RÉSUMÉ COMPACT POUR AVIS IA');
    out.push('But : analyser la logique de Brain sans relire tout le programme brut.');
    out.push('');
    out.push('MOUVEMENTS PRIORITAIRES');
    var names=Object.keys(byMove);
    if(!names.length){
      out.push('- Aucun mouvement prioritaire extrait automatiquement. Utilise le contexte global avec prudence.');
    } else {
      names.slice(0,14).forEach(function(name){
        var recs=byMove[name];
        var loads=recs.map(function(r){return r.load;}).filter(Boolean);
        var last=recs[recs.length-1]||{};
        var hard=recs.filter(function(r){return num(r.rpe)>=9;}).length;
        var high=recs.filter(function(r){return num(r.rpe)>=8.5;}).length;
        var bits=[];
        if(loads.length) bits.push('tendance charge : '+loads.slice(-6).join(' → '));
        if(last.suggested) bits.push('dernière suggestion : '+last.suggested);
        if(last.reps || last.rpe) bits.push('dernier réel : '+(last.load||'charge n/d')+(last.reps?' × '+last.reps:'')+(last.rpe?' @RPE '+last.rpe:''));
        if(hard) bits.push('RPE 9+ observé : '+hard+' fois');
        else if(high) bits.push('RPE 8.5+ observé : '+high+' fois');
        out.push('- '+name+' — '+bits.join('; ')+'.');
      });
    }
    out.push('');
    var priorityMovements = uniquePriorityMovements(names);
    if(priorityMovements.length){
      out.push('PRIORITÉS D’ANALYSE DEMANDÉES');
      priorityMovements.forEach(function(n){ out.push('- '+n); });
      out.push('');
    }
    out.push('ALERTES PRIORITAIRES — RÉSUMÉES');
    if(alertGroups.length){ alertGroups.slice(0,10).forEach(function(a){ out.push('- '+a); }); }
    else out.push('- Aucune alerte prioritaire extraite.');
    out.push('');
    if(/deload/i.test(text) || /S6|SEMAINE 6/i.test(text)){
      out.push('NOTE DELOAD');
      out.push('- Si une semaine de deload est présente, une baisse de charge ne doit pas être traitée automatiquement comme une régression.');
      out.push('');
    }
    out.push('RÈGLES DE LECTURE');
    out.push('- RPE 8 chez Bertin = signal moyen, pas preuve absolue.');
    out.push('- RPE 9+ chez Bertin = signal fort et fiable.');
    out.push('- Avis IA doit rester consultatif : aucune charge ne doit être appliquée automatiquement.');
    return {text:out.join('\n'), priorityMovements:priorityMovements};
  }
  function buildMovementPrompt(hint, opts){
    hint = hint || {}; opts = opts || {};
    // V3.6 — sécurité mobile/UI : si le bouton appelle l'export sans contexte complet,
    // réutiliser le dernier hint exact ouvert dans le panneau (!).
    // Ça évite les prompts MOVEMENT-GLOBAL sans historique ciblé.
    try{
      var last = window.__racineLastLoadInfoHint || null;
      var hintName = hint.name || hint.label || hint.movement;
      var hintRows = hint.rows && hint.rows.length;
      if(last && (!hintName || !hintRows)){
        var merged = {};
        Object.keys(last).forEach(function(k){ merged[k]=last[k]; });
        Object.keys(hint).forEach(function(k){ if(hint[k]!==undefined && hint[k]!==null && hint[k]!=='' ) merged[k]=hint[k]; });
        hint = merged;
      }
    }catch(e){}
    var ex = brainExplain(hint) || {};
    var pid = promptId('movement', hint.name || hint.label || hint.movement);
    var lines=[];
    lines.push(PROMPT_VERSION);
    lines.push('prompt_id: '+pid);
    lines.push('scope: movement');
    lines.push('app_version: '+appVersion());
    lines.push('');
    lines = lines.concat(rules());
    lines.push('');
    lines.push('CONTEXTE MOUVEMENT');
    linesPush(lines,'Mouvement', hint.name || hint.label || hint.movement);
    linesPush(lines,'Charge proposée par Brain', cleanLoad(hint.load || hint.suggestedLoad));
    linesPush(lines,'Source', hint.source || 'Brain');
    if(ex.decision) linesPush(lines,'Décision Brain', ex.decision);
    if(ex.confidence!=null) linesPush(lines,'Confiance Brain', ex.confidence+' %');
    if(ex.precision!=null) linesPush(lines,'Précision Brain', ex.precision+' %');
    var primary = movementPrimaryReason(hint, ex);
    if(primary) linesPush(lines,'Raison principale', primary);
    if(ex.nextObservation) linesPush(lines,'Prochaine observation Brain', ex.nextObservation);
    lines.push('');
    lines.push('FAITS DOMINANTS');
    cleanPromptFacts(ex.facts&&ex.facts.length?ex.facts:['Aucun fait dominant disponible.']).forEach(function(f){ lines.push('- '+f); });
    var jt=journalText(hint);
    if(jt){ lines.push(''); lines.push('JOURNAL BRAIN'); lines.push('- '+jt); }
    lines.push('');
    lines.push('HISTORIQUE CIBLÉ');
    lines = lines.concat(recentRowsText(hint, 8));
    lines.push('');
    lines.push('QUESTION');
    lines.push('Analyse la décision de Brain pour ce mouvement. Est-ce que tu es d’accord? Si tu proposerais une autre approche, explique le risque et garde ton avis consultatif.');
    lines.push('');
    lines = lines.concat(responseContract('movement', pid, str(hint.name || hint.label || hint.movement))); 
    var text=lines.join('\n');
    rememberPrompt({prompt_id:pid, scope:'movement', movement: str(hint.name || hint.label || hint.movement), load: cleanLoad(hint.load || hint.suggestedLoad), source: hint.source || 'Brain'});
    return text;
  }
  function buildGlobalPrompt(payload){
    payload = payload || {};
    var scope = str(payload.scope||'global');
    var pid = promptId(scope, payload.title || payload.cycle || 'GLOBAL');
    var lines=[];
    lines.push(PROMPT_VERSION);
    lines.push('prompt_id: '+pid);
    lines.push('scope: '+scope);
    lines.push('app_version: '+appVersion());
    lines.push('');
    lines = lines.concat(rules());
    lines.push('');
    lines.push('CONTEXTE GLOBAL RACINE');
    linesPush(lines,'Titre', payload.title || 'Analyse globale');
    linesPush(lines,'Cycle', payload.cycle);
    linesPush(lines,'Semaine', payload.week);
    linesPush(lines,'Jour', payload.day);
    lines.push('');
    if(payload.summary){ lines.push('RÉSUMÉ BRAIN / RACINE'); lines.push(str(payload.summary)); lines.push(''); }
    var compact = compactContextReport(payload.contextText || '', scope);
    lines.push('CONTEXTE EXPORTÉ — VERSION COMPACTE');
    lines.push(compact.text || compact);
    lines.push('');
    if(payload.diagnosticJson){
      lines.push('DIAGNOSTIC TECHNIQUE RACINE — RÉSUMÉ');
      try{
        var parsed=JSON.parse(payload.diagnosticJson);
        var alerts=(parsed&&parsed.alerts&&Array.isArray(parsed.alerts))?parsed.alerts:[];
        if(alerts.length){
          alerts.slice(0,10).forEach(function(a,i){
            var name=str(a.name||a.movement||a.label||('alerte '+(i+1)));
            var msg=str(a.message||a.reason||a.alert||a.severity||'à vérifier');
            lines.push('- '+name+': '+msg.slice(0,180));
          });
        } else lines.push('- Aucun résumé technique exploitable.');
      }catch(e){ lines.push('- Diagnostic JSON présent, mais non résumé automatiquement.'); }
      lines.push('');
    }
    lines.push('QUESTION');
    if(scope==='cycle'){
      lines.push('Analyse la logique globale de Brain sur le cycle. Donne un avis consultatif : mouvements fiables, mouvements à surveiller, erreurs de mapping possibles, progression trop rapide/lente, corrections minimales.');
    }else{
      lines.push('Analyse la logique de Brain pour la séance sélectionnée. Donne un avis consultatif, concret, sans appliquer de modification automatiquement.');
    }
    lines.push('');
    lines = lines.concat(responseContract(scope, pid, '', {priorityMovements: compact.priorityMovements || []}));
    var text=lines.join('\n');
    rememberPrompt({prompt_id:pid, scope: scope, title: str(payload.title || payload.cycle || 'Analyse globale')});
    return text;
  }
  function copyText(text){
    text=str(text);
    if(!text) return Promise.reject(new Error('empty'));
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve,reject){
      try{
        var ta=document.createElement('textarea');
        ta.value=text; ta.setAttribute('readonly','');
        ta.style.position='fixed'; ta.style.left='-9999px';
        document.body.appendChild(ta); ta.select();
        var ok=document.execCommand('copy');
        document.body.removeChild(ta);
        ok?resolve():reject(new Error('copy failed'));
      }catch(e){ reject(e); }
    });
  }
  function downloadText(filename, text){
    try{
      if(typeof download==='function') return download(filename,text);
    }catch(e){}
    var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=filename||'racine-ai-prompt.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href); a.remove();},250);
  }
  function copyOrDownload(text, filename){
    return copyText(text).then(function(){ alert('Prompt Avis IA copié.'); }).catch(function(){ downloadText(filename||'racine-ai-prompt.txt',text); });
  }

  api.PROMPT_VERSION = PROMPT_VERSION;
  api.RESPONSE_START = RESPONSE_START;
  api.RESPONSE_END = RESPONSE_END;
  api.buildMovementPrompt = buildMovementPrompt;
  api.buildGlobalPrompt = buildGlobalPrompt;
  api.promptMetaForId = promptMetaForId;
  api.readPromptLog = readPromptLog;
  api.copyMovementPrompt = function(hint){ return copyOrDownload(buildMovementPrompt(hint||{}), 'racine-avis-ia-mouvement.txt'); };
  api.copyGlobalPrompt = function(payload){ return copyOrDownload(buildGlobalPrompt(payload||{}), 'racine-avis-ia-global.txt'); };
})();

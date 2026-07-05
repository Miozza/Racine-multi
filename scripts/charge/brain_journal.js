// Racine V3.0 — Brain Journal
// Journal consultatif des apprentissages Brain.
// Ne modifie jamais les charges. Ne touche pas aux fichiers data/*.json.
(function(){
  "use strict";

  var api = window.CoachBrainJournal = window.CoachBrainJournal || {};

  function str(v){ return String(v==null?'':v).trim(); }
  function num(v){ var n=Number(str(v).replace(',', '.').replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; }
  function norm(label){
    try{ if(typeof coachNormalizeMoveText==='function') return coachNormalizeMoveText(label); }catch(e){}
    return str(label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function brainMemorySummary(){
    try{
      if(window.CoachBrainMemory && typeof CoachBrainMemory.exportSummary==='function') return CoachBrainMemory.exportSummary();
    }catch(e){}
    return {profiles:[], journal:[]};
  }
  function intentFromHint(h){
    h=h||{};
    if(h.brainStats&&h.brainStats.intent) return h.brainStats.intent;
    if(h.context&&h.context.intent) return h.context.intent;
    if(h.context&&h.context.kind) return h.context.kind;
    var reason=str(h.reason);
    var m=reason.match(/Intention\s+([a-zA-Z0-9_-]+)/i);
    if(m) return m[1];
    return '';
  }
  function profileFor(label,intent){
    var mem=brainMemorySummary();
    var nl=norm(label), it=str(intent||'');
    var profiles=Array.isArray(mem.profiles)?mem.profiles:[];
    var exact=profiles.filter(function(p){ return norm(p.label)===nl && (!it || str(p.intent)===it); });
    if(exact.length) return exact.sort(function(a,b){return (b.sessions||0)-(a.sessions||0);})[0];
    var any=profiles.filter(function(p){ return norm(p.label)===nl; });
    if(any.length) return any.sort(function(a,b){return (b.sessions||0)-(a.sessions||0);})[0];
    return null;
  }
  function journalFor(label,intent,limit){
    var mem=brainMemorySummary();
    var nl=norm(label), it=str(intent||'');
    var journal=Array.isArray(mem.journal)?mem.journal:[];
    return journal.filter(function(e){
      return norm(e.movement)===nl && (!it || str(e.intent)===it);
    }).slice(-(limit||5)).reverse();
  }
  function translateLearning(code){
    code=str(code);
    if(!code) return '';
    var parts=code.split(/\s*,\s*/).filter(Boolean);
    var map={
      prediction_testee_reussie:'prédiction testée et validée',
      prediction_trop_ambitieuse:'prédiction trop ambitieuse',
      prediction_trop_prudente:'prédiction trop prudente',
      proposition_non_testee_charge_baissee:'proposition non testée : charge baissée',
      athlete_plus_ambitieux_que_brain:'athlète plus ambitieux que Brain',
      observation_enregistree:'observation enregistrée'
    };
    return parts.map(function(p){ return map[p]||p.replace(/_/g,' '); }).join(' + ');
  }
  function learningSentence(entry){
    if(!entry) return '';
    var move=str(entry.movement)||'mouvement';
    var load=entry.usedLoad!=null?num(entry.usedLoad):0;
    var reps=entry.usedReps!=null?num(entry.usedReps):0;
    var rpe=entry.rpe!=null?num(entry.rpe):0;
    var learn=translateLearning(entry.learning);
    var suffix=[];
    if(load>0) suffix.push(load+' lb');
    if(reps>0) suffix.push('× '+reps);
    if(rpe>0) suffix.push('RPE '+rpe);
    var detail=suffix.length?' ('+suffix.join(' ') +')':'';
    if(/trop ambitieuse/.test(learn)) return 'Dernier apprentissage : Brain a été trop ambitieux sur '+move+detail+'.';
    if(/trop prudente/.test(learn)) return 'Dernier apprentissage : Brain pouvait être plus ambitieux sur '+move+detail+'.';
    if(/testée et validée/.test(learn)) return 'Dernier apprentissage : la proposition a été testée et validée sur '+move+detail+'.';
    if(/charge baissée/.test(learn)) return 'Dernier apprentissage : la proposition n’a pas été testée telle quelle sur '+move+detail+'.';
    if(/plus ambitieux/.test(learn)) return 'Dernier apprentissage : l’athlète a dépassé la proposition sur '+move+detail+'.';
    return 'Dernier apprentissage : '+(learn||'observation enregistrée')+detail+'.';
  }
  function summaryFor(label,intent){
    var p=profileFor(label,intent);
    var j=journalFor(label,intent,5);
    if(!p && !j.length) return null;
    var sessions=p&&p.sessions?Number(p.sessions):j.length;
    var tested=p&&p.testedPredictions?Number(p.testedPredictions):0;
    var successful=p&&p.successfulPredictions?Number(p.successfulPredictions):0;
    var under=p&&p.underPredictions?Number(p.underPredictions):0;
    var over=p&&p.overPredictions?Number(p.overPredictions):0;
    var last=j[0]||null;
    var trend='';
    if(tested>=3 && successful>=Math.max(2, tested-1)) trend='Brain valide souvent ses prédictions sur ce mouvement.';
    else if(under>over && under>=2) trend='Brain a tendance à être trop ambitieux sur ce mouvement.';
    else if(over>under && over>=2) trend='Brain a tendance à être trop prudent sur ce mouvement.';
    else if(sessions>=3) trend='Brain accumule une base utile sur ce mouvement.';
    else trend='Brain commence à construire son journal sur ce mouvement.';
    return {
      movement:str(label),
      intent:str(intent||''),
      sessions:sessions,
      tested:tested,
      successful:successful,
      confidence:p&&p.confidence!=null?Math.round(Number(p.confidence)*100):null,
      precision:p&&p.precision!=null?Math.round(Number(p.precision)*100):null,
      lastLearning:p&&p.lastLearning?translateLearning(p.lastLearning):'',
      latestSentence:learningSentence(last),
      trend:trend,
      entries:j
    };
  }
  function insightForHint(h){
    h=h||{};
    var label=str(h.name||h.label||h.movement);
    if(!label) return null;
    var it=intentFromHint(h);
    var s=summaryFor(label,it);
    if(!s) return null;
    var line=s.trend;
    if(s.latestSentence) line += ' '+s.latestSentence;
    return {title:'Journal Brain', text:line, summary:s};
  }

  api.profileFor=profileFor;
  api.journalFor=journalFor;
  api.summaryFor=summaryFor;
  api.insightForHint=insightForHint;
  api.translateLearning=translateLearning;
})();

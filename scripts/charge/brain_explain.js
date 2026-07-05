// Racine V2.9 — Brain Explain Engine + Movement Profiles
(function(){
  "use strict";

  function str(v){ return String(v==null?'':v).trim(); }
  function num(v){ var n=Number(str(v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; }
  function rows(h){ return (h&&Array.isArray(h.rows))?h.rows:[]; }
  function cleanLoad(v){ return str(v).replace(/\s*⚠\s*/g,'').trim(); }
  function profile(h){ return (window.CoachMovementProfiles && CoachMovementProfiles.get) ? CoachMovementProfiles.get(str(h&&h.name)) : null; }
  function profileSensitivity(h, stats){
    var p=profile(h);
    if(p&&p.sensitivity) return p.sensitivity;
    return stats&&stats.sensitivity ? stats.sensitivity : '';
  }
  function sensitivityLabel(value){ return (window.CoachMovementProfiles && CoachMovementProfiles.labelSensitivity) ? CoachMovementProfiles.labelSensitivity(value) : str(value||'moyenne'); }

  function parseReason(h){
    var reason=str(h&&h.reason);
    var out={}; var m;
    m=reason.match(/Confiance de prediction faible \((\d+(?:\.\d+)?)%\)/i);
    if(m) out.confidence=Number(m[1]);
    m=reason.match(/Validation\s+(\d+)\/(\d+)\s+avant hausse/i);
    if(m){ out.validations=Number(m[1]); out.requiredConfirmations=Number(m[2]); }
    m=reason.match(/Intention\s+([a-zA-Z0-9_-]+)/i);
    if(m) out.intent=m[1];
    m=reason.match(/sensibilite\s+([a-zA-Z0-9_-]+)/i);
    if(m) out.sensitivity=m[1];
    m=reason.match(/Option ambitieuse\s*:\s*([^\.]+(?:lb|kg)?)/i);
    if(m) out.ambitiousOption=str(m[1]);
    m=reason.match(/RPE\s+(\d+(?:\.\d+)?)/i);
    if(m) out.lastRpe=Number(m[1]);
    return out;
  }

  function hydrateStats(h){
    h=h||{};
    if(h.brainStats) return h.brainStats;
    var reason=str(h.reason);
    var parsed=parseReason(h);
    if(parsed.ambitiousOption && !h.ambitiousOption) h.ambitiousOption=parsed.ambitiousOption;
    if(parsed.confidence!=null || parsed.intent || parsed.sensitivity || parsed.validations!==undefined){
      h.brainStats={
        confidence: parsed.confidence!=null?parsed.confidence:null,
        ambition: null,
        intent: parsed.intent || '',
        sensitivity: parsed.sensitivity || '',
        validations: parsed.validations!==undefined?parsed.validations:null,
        requiredConfirmations: parsed.requiredConfirmations!==undefined?parsed.requiredConfirmations:null,
        prediction: null,
        rpeReliability: null,
        memory: null,
        lastRpe: parsed.lastRpe||null,
        inferredFromReason: true
      };
      return h.brainStats;
    }
    if(/plancher de validation|plancher maitrise|plancher historique/i.test(reason)){
      var rpe=parsed.lastRpe||0;
      var hard=rpe>=9;
      h.brainStats={
        confidence: hard?68:78,
        ambition: hard?42:60,
        intent: '',
        sensitivity: /pull|dip|muscle/i.test(str(h.name).toLowerCase())?'high':'',
        validations: hard?0:1,
        requiredConfirmations: hard?2:1,
        prediction: null,
        rpeReliability:{label:'personalized'},
        comfort: hard?'low':'acceptable',
        lastRpe:rpe||null,
        memory:null,
        inferredFromReason:true
      };
      return h.brainStats;
    }
    return null;
  }

  function trend(h){
    var rs=rows(h).slice().reverse();
    var loads=rs.map(function(r){return num(r.load);}).filter(function(n){return n>0;});
    var rpes=rs.map(function(r){return num(r.rpe);}).filter(function(n){return n>0;});
    var inc=0, drops=0;
    for(var i=1;i<loads.length;i++){
      if(loads[i]>loads[i-1]) inc++;
      if(loads[i]<loads[i-1]) drops++;
    }
    var hard=rpes.filter(function(x){return x>=9;}).length;
    var rpe8=rpes.filter(function(x){return x===8;}).length;
    return {sessions:loads.length,loads:loads,rpes:rpes,increases:inc,drops:drops,hard:hard,rpe8:rpe8};
  }

  function sensitivity(h, stats){
    var p=profile(h);
    if(p&&p.sensitivity) return p.sensitivity;
    if(stats&&stats.sensitivity) return stats.sensitivity;
    var name=str(h&&h.name).toLowerCase();
    if(/weighted pull|pull-up|pull up|chin|dip|muscle/.test(name)) return 'very_high';
    if(/strict press|front squat|bench/.test(name)) return 'high';
    if(/hip thrust|curl|face pull|raise|extension|pushdown/.test(name)) return 'low';
    return 'medium';
  }

  function intent(h, stats){
    if(stats&&stats.intent) return stats.intent;
    if(h&&h.context&&h.context.intent) return h.context.intent;
    if(h&&h.context&&h.context.kind) return h.context.kind;
    return '';
  }

  function confidence(h, stats){
    if(stats&&stats.confidence!=null&&stats.confidence!=='') return Math.round(Number(stats.confidence));
    var t=trend(h), sens=sensitivity(h,stats), c=44;
    c += Math.min(30,t.sessions*7);
    c += Math.min(18,t.increases*4);
    if(t.drops) c -= Math.min(22,t.drops*10);
    if(t.hard) c -= Math.min(18,t.hard*7);
    if(sens==='very_high') c -= 12;
    else if(sens==='high') c -= 7;
    if(sens==='low') c += 8;
    var p=profile(h);
    if(p&&p.confidenceBias) c += Number(p.confidenceBias)||0;
    var reason=str(h&&h.reason).toLowerCase();
    if(reason.indexOf('validation')>=0) c -= 3;
    if(reason.indexOf('confort faible')>=0 || (stats&&stats.comfort==='low')) c -= 10;
    return Math.max(38,Math.min(94,Math.round(c)));
  }

  function confidenceText(c){
    c=Number(c)||0;
    if(c>=90) return 'Je connais très bien ce mouvement dans ce contexte.';
    if(c>=80) return 'Je connais bien ce mouvement.';
    if(c>=65) return 'Je commence à bien connaître ce mouvement.';
    if(c>=45) return 'Je suis encore en apprentissage sur ce mouvement.';
    return 'Je manque encore de données fiables.';
  }

  function precision(h, stats){
    var t=trend(h);
    var tested=(stats&&stats.prediction&&stats.prediction.tested)?Number(stats.prediction.tested):0;
    var raw=null;
    if(stats&&stats.prediction&&stats.prediction.accuracy!=null){ raw=Number(stats.prediction.accuracy); if(raw<=1) raw*=100; }
    else if(stats&&stats.memory&&stats.memory.precision!=null){ raw=Number(stats.memory.precision); }
    else { tested=t.sessions; raw=55+Math.min(24,t.sessions*5)+Math.min(14,t.increases*3)-Math.min(20,t.drops*10)-Math.min(10,t.hard*4); }
    if(!tested) tested=(stats&&stats.memory&&stats.memory.sessions)?Number(stats.memory.sessions):t.sessions;
    var cap=98;
    if(tested<=1) cap=60;
    else if(tested===2) cap=70;
    else if(tested===3) cap=78;
    else if(tested===4) cap=84;
    else if(tested<8) cap=88;
    else if(tested<15) cap=94;
    return {score:Math.max(45,Math.min(cap,Math.round(raw||55))), tested:tested};
  }

  function primaryReason(h, stats){
    var r=str(h&&h.reason).toLowerCase();
    var t=trend(h), load=cleanLoad(h&&h.load), opt=str(h&&h.ambitiousOption||parseReason(h).ambitiousOption);
    var p=profile(h);
    if(/plancher de validation/.test(r) || (stats&&stats.comfort==='low')) return 'La dernière charge est validée, mais le confort est faible.';
    if(stats&&stats.requiredConfirmations!=null&&stats.validations!=null&&stats.validations<stats.requiredConfirmations){
      if(p&&p.family==='bodyweight_heavy') return load+' est validé, mais doit devenir plus confortable.';
      return load+' n’a été validé qu’une seule fois.';
    }
    if(r.indexOf('validation')>=0) return load+' demande encore une validation avant la prochaine hausse.';
    if(t.increases>=3&&t.drops===0){
      if(p&&p.family==='posterior_chain') return 'La progression est stable et ce mouvement répond bien aux hausses.';
      return 'La progression est stable sur plusieurs séances.';
    }
    if(opt) return 'Une option ambitieuse existe, mais la charge actuelle reste la base fiable.';
    return 'La charge proposée est la meilleure estimation avec l’historique actuel.';
  }

  function decision(h, stats){
    var r=str(h&&h.reason).toLowerCase();
    var load=cleanLoad(h&&h.load)||'la charge actuelle';
    var opt=str(h&&h.ambitiousOption||parseReason(h).ambitiousOption);
    var t=trend(h), sens=sensitivity(h,stats);
    if(/plancher de validation/.test(r) || (stats&&stats.comfort==='low')) return 'Consolidation à '+load+'.';
    if(/plancher maitrise/.test(r)) return 'Maintien à '+load+'.';
    if(stats&&stats.requiredConfirmations!=null&&stats.validations!=null&&stats.validations<stats.requiredConfirmations) return 'Maintien à '+load+(opt?'. Option ambitieuse : '+opt+'.':'.');
    if(r.indexOf('validation')>=0) return 'Maintien à '+load+(opt?'. Option ambitieuse : '+opt+'.':'.');
    if(r.indexOf('deload')>=0) return 'Réduction de deload.';
    if(t.increases>=3&&t.drops===0&&sens==='low') return 'Progression normale.';
    if(r.indexOf('progression prudente')>=0 && sens==='low'&&t.hard===0) return 'Progression normale.';
    if(r.indexOf('progression prudente')>=0) return 'Progression prudente.';
    if(r.indexOf('micro')>=0) return 'Micro-progression.';
    if(r.indexOf('maintien')>=0) return 'Maintien volontaire.';
    if(r.indexOf('hausse')>=0 || r.indexOf('progression normale')>=0) return 'Progression normale.';
    return 'Meilleure estimation actuelle.';
  }

  function addFact(facts, text, weight){ facts.push({text:text, weight:weight||1}); }

  function facts(h, stats){
    var t=trend(h), r=str(h&&h.reason).toLowerCase(), sens=sensitivity(h,stats), it=intent(h,stats), out=[];
    if(stats&&stats.requiredConfirmations!=null&&stats.validations!=null&&stats.validations<stats.requiredConfirmations) addFact(out,'Une validation supplémentaire est requise avant la hausse.',100);
    if(/plancher de validation/.test(r) || (stats&&stats.comfort==='low')) addFact(out,'La charge est validée, mais le confort est faible.',98);
    if(t.increases>=3) addFact(out,'Progression régulière sur plusieurs séances.',92);
    else if(t.increases>0) addFact(out,t.increases+' augmentation(s) récente(s) validée(s).',70);
    if(t.drops===0&&t.sessions>=3) addFact(out,'Aucune baisse récente observée.',78);
    var p=profile(h);
    if(sens==='very_high') addFact(out,'Mouvement à sensibilité très élevée.',90);
    else if(sens==='high') addFact(out,'Mouvement à haute sensibilité.',85);
    if(sens==='low') addFact(out,'Mouvement à faible sensibilité.',72);
    if(p&&p.vocabulary&&p.vocabulary.risk&&sens!=='low') addFact(out,p.vocabulary.risk+'.',80);
    if(it) addFact(out,'Intention : '+it+'.',35);
    if(stats&&stats.validations!=null&&stats.requiredConfirmations!=null&&stats.validations<stats.requiredConfirmations) addFact(out,'Une validation supplémentaire est requise avant la hausse.',95);
    if((stats&&stats.lastRpe>=9)||t.hard>0) addFact(out,'Signal RPE fort détecté.',88);
    if(t.rpe8>=3 && /rpe/.test(r) && ((stats&&stats.rpeReliability))) addFact(out,'RPE 8 fréquent : signal moyen dans ton profil.',40);
    var opt=str(h&&h.ambitiousOption||parseReason(h).ambitiousOption);
    if(opt) addFact(out,'Option ambitieuse disponible : '+opt+'.',68);
    if(t.sessions) addFact(out,t.sessions+' séance(s) récentes analysées.',35);
    var seen={};
    return out.sort(function(a,b){return b.weight-a.weight;}).filter(function(x){var k=x.text.toLowerCase(); if(seen[k]) return false; seen[k]=true; return true;}).slice(0,4).map(function(x){return x.text;});
  }

  function nextObservation(h, stats){
    var load=cleanLoad(h&&h.load)||'cette charge';
    var r=str(h&&h.reason).toLowerCase();
    var p=profile(h);
    if(/plancher de validation/.test(r) || (stats&&stats.comfort==='low')) return (p&&p.explain&&p.explain.next) ? p.explain.next : 'Je veux reconfirmer '+load+' avec un meilleur confort avant toute hausse.';
    if(stats&&stats.requiredConfirmations!=null&&stats.validations!=null&&stats.validations<stats.requiredConfirmations){
      if(p&&p.family==='bodyweight_heavy') return 'Je veux confirmer que '+load+' devient confortable avant d’ajouter du lest.';
      return 'Je veux une deuxième validation à '+load+'.';
    }
    if(h&&h.ambitiousOption) return 'Si l’échauffement est excellent, l’option ambitieuse peut être testée; sinon je valide '+load+'.';
    var t=trend(h);
    if(t.increases>=3&&t.drops===0) return 'Je veux confirmer '+load+'. Si elle passe proprement, je poursuis la progression normale.';
    return 'Je veux voir si '+load+' se confirme avec des répétitions stables.';
  }

  function build(h){
    h=h||{};
    var stats=hydrateStats(h);
    var conf=confidence(h,stats);
    var prec=precision(h,stats);
    var journalInsight=null;
    try{
      if(window.CoachBrainJournal && typeof CoachBrainJournal.insightForHint==='function') journalInsight=CoachBrainJournal.insightForHint(h);
    }catch(e){ journalInsight=null; }
    return {
      confidence: conf,
      confidenceText: confidenceText(conf),
      precision: prec.score,
      precisionDetail: prec.tested ? (prec.tested+' donnée(s) utile(s), précision plafonnée selon le volume d’historique.') : '',
      primaryReason: primaryReason(h,stats),
      decision: decision(h,stats),
      facts: facts(h,stats),
      nextObservation: nextObservation(h,stats),
      journalInsight: journalInsight,
      stats: stats
    };
  }

  window.CoachBrainExplain={build:build};
})();

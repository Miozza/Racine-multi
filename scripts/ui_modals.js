// UI modals and small interactive buttons extracted from app.js.
// No business logic here: tutorial modal + charge explanation modal only.
// Loaded before app.js so existing global function names remain available.

// ─── Tutos mouvements — vue WOD + mode séance ───────────────────────────────

function escapeHtml(s){
  return String(s==null?"":s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
function tutorialButtonHtml(name){
  if(!window.findCoachBertinTutorial) return "";
  var t = window.findCoachBertinTutorial(name);
  if(!t) return "";
  return '<button type="button" class="tuto-btn" data-tuto-name="'+escapeHtml(t.key)+'">?</button>';
}
function isAmbiguousLoad(load){
  var l=String(load||"").toLowerCase().trim();
  if(!l||l==="—"||l==="-")return true;
  return /\b(léger|leger|modéré|modere|rpe|facile|difficile|selon|au choix|optionnel)\b/.test(l);
}
function loadHistoryLookupName(s){
  s=String(s||"");
  if(typeof chargeKeyFromName==="function")s=chargeKeyFromName(s);
  s=s.normalize? s.normalize("NFD").replace(/[\u0300-\u036f]/g,"") : s;
  return s.toLowerCase()
    .replace(/\b(db|dumbbell|dumbbells)\b/g,"haltere")
    .replace(/\bbarbell\b/g,"barre")
    .replace(/[’']/g," ")
    .replace(/\s*\/\s*/g," / ")
    .replace(/[^a-z0-9\/]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function loadHistoryExerciseName(exercise){
  return String((exercise&&(exercise.name||exercise.title||exercise.label||exercise.movement))||"").trim();
}

function loadHistoryEquipmentFamily(name){
  var n=loadHistoryLookupName(name);
  if(!n)return '';
  if(/cable|poulie|rope|face pull|pushdown/.test(n))return 'cable';
  if(/machine/.test(n))return 'machine';
  if(/haltere|dumbbell|db/.test(n))return 'db';
  if(/landmine/.test(n))return 'landmine';
  if(/ring row|pull up|pullup|bodyweight|poids du corps/.test(n))return 'bodyweight';
  if(/barbell|barre|bench|squat|strict press|push press|deadlift|power clean|clean/.test(n))return 'barbell';
  return '';
}
function loadHistoryEquipmentCompatible(a,b){
  var fa=loadHistoryEquipmentFamily(a), fb=loadHistoryEquipmentFamily(b);
  return !fa||!fb||fa===fb;
}
function loadHistoryNameCandidates(exercise){
  var raw=loadHistoryExerciseName(exercise);
  var names=[];
  function add(x){
    x=String(x||"").trim();
    if(x&&names.indexOf(x)<0)names.push(x);
  }
  add(raw);
  if(typeof chargeKeyFromName==="function")add(chargeKeyFromName(raw));
  if(typeof canonicalMovementLabel==="function")add(canonicalMovementLabel(raw));
  if(typeof movementLabelFromKeyOrName==="function")add(movementLabelFromKeyOrName(raw));
  // Les mouvements alternatifs sont parfois sauvegardés comme "DB Shoulder Press / Landmine Press".
  // Le bouton ! doit retrouver l'historique même si la séance affiche seulement une moitié du nom.
  raw.split(/\s*\/\s*|\s+ou\s+|\s+or\s+/i).forEach(add);
  return names;
}
function loadHistoryNamesMatch(a,b){
  var aa=loadHistoryLookupName(a), bb=loadHistoryLookupName(b);
  if(!aa||!bb)return false;
  if(!loadHistoryEquipmentCompatible(a,b))return false;
  if(aa===bb)return true;
  if(aa.length>=5&&bb.indexOf(aa)>=0)return true;
  if(bb.length>=5&&aa.indexOf(bb)>=0)return true;
  return false;
}
function loadHistoryRowFromResult(session, movementName, result){
  result=result||{};
  return {
    date:session.date||session.actualDate||"—",
    load:result.load||result.actualLoad||result.capacityLoad||"—",
    reps:result.reps||result.actualReps||result.currentReps||"—",
    rpe:result.rpe||"—",
    status:result.status||"",
    source:"historique"
  };
}
function loadHistoryRowsFromAthleteState(exercise){
  var ast=(typeof ensureAthleteState==="function")?ensureAthleteState():{movements:{}};
  var moves=(ast&&ast.movements)||{};
  var candidates=loadHistoryNameCandidates(exercise);
  var mv=null;
  for(var i=0;i<candidates.length;i++){
    if(moves[candidates[i]]){mv=moves[candidates[i]];break;}
  }
  if(!mv){
    Object.keys(moves).some(function(k){
      for(var i=0;i<candidates.length;i++){
        if(loadHistoryNamesMatch(candidates[i],k)){mv=moves[k];return true;}
      }
      return false;
    });
  }
  var rows=(mv&&Array.isArray(mv.history))?mv.history.slice(-8).reverse():[];
  return rows.map(function(r){
    return {
      date:r.date||"—",
      load:r.load||r.actualLoad||r.capacityLoad||"—",
      reps:r.reps||r.actualReps||r.currentReps||"—",
      rpe:r.rpe||"—",
      status:r.status||"",
      source:"athlete_state"
    };
  });
}
function loadHistoryRowsFromSessionHistory(exercise){
  var hist=[];
  try{hist=(state&&Array.isArray(state.history))?state.history:[];}catch(e){hist=[];}
  if(!hist.length)return [];
  var candidates=loadHistoryNameCandidates(exercise);
  var rows=[];
  hist.forEach(function(session){
    var results=session&&(session.results||session.resultats)||{};
    Object.keys(results||{}).forEach(function(k){
      if(String(k).indexOf("wod_")===0)return;
      var match=false;
      for(var i=0;i<candidates.length;i++){
        if(loadHistoryNamesMatch(candidates[i],k)){match=true;break;}
      }
      if(match){
        var r=results[k];
        if(r&&(r.load!==undefined||r.actualLoad!==undefined||r.capacityLoad!==undefined))rows.push(loadHistoryRowFromResult(session,k,r));
      }
    });
  });
  return rows.reverse();
}

function loadDecisionHintForExercise(exercise){
  try{
    var hints=window.__coachLoadHints||{};
    var candidates=loadHistoryNameCandidates(exercise);
    for(var i=0;i<candidates.length;i++){
      var key=(typeof coachNormalizeMoveText==="function")?coachNormalizeMoveText(candidates[i]):loadHistoryLookupName(candidates[i]);
      if(key&&hints[key])return hints[key];
    }
    var raw=loadHistoryExerciseName(exercise);
    var canonical=(typeof canonicalMovementLabel==="function")?canonicalMovementLabel(raw):raw;
    var k=(typeof coachNormalizeMoveText==="function")?coachNormalizeMoveText(canonical):loadHistoryLookupName(canonical);
    return k?hints[k]||null:null;
  }catch(e){return null;}
}

function loadHistoryRowsForExercise(exercise){
  if(!exercise)return [];
  var rows=loadHistoryRowsFromAthleteState(exercise).concat(loadHistoryRowsFromSessionHistory(exercise));
  var seen={};
  rows=rows.filter(function(r){
    // Une même séance peut exister à la fois dans athlete_state et dans l’historique brut
    // avec deux statuts calculés différents. Pour l’utilisateur, c’est une seule vraie entrée.
    var key=[r.date,r.load,r.reps,r.rpe].join("|");
    if(seen[key])return false;
    seen[key]=true;
    return true;
  });
  return rows.slice(0,5);
}
function loadReasonForExercise(exercise, shownLoad, rows){
  var raw=String((exercise&&exercise.load)||"").trim();
  var shown=String(shownLoad||raw||"").trim();
  var note=String((exercise&&exercise.note)||"").trim().toLowerCase();
  if(note.indexOf("charge réduite")>=0){
    return "Charge volontairement réduite parce que le mouvement principal de la séance a priorité. Objectif : garder du volume sans empiler deux efforts lourds.";
  }
  if(shown.indexOf("⚠")>=0){
    var diag=(typeof buildChargeDiagnosticForExercise==="function")?buildChargeDiagnosticForExercise(exercise, shown):null;
    if(diag&&diag.alerts&&diag.alerts.length)return diag.alerts[0].title+" : "+diag.alerts[0].detail;
    return "Charge bloquée ou réduite par l’historique/RPE récent : règle V51 de prudence active.";
  }
  if(rows&&rows.length){
    var last=rows[0];
    var rpe=Number(last.rpe)||0;
    var status=String(last.status||"");
    if(status==="recalibrating"||status==="watch")return "Basé sur les séances précédentes : maintien/réduction parce que la dernière donnée est sous surveillance.";
    if(rpe>=9)return "Règle V51 : dernier RPE réel ≥ 9, donc aucune hausse automatique.";
    if((typeof isIsolationMovement==="function")&&isIsolationMovement(exercise.name||"")&&rpe>=8.5)return "Isolation : RPE ≥ 8.5, donc maintien ou légère réduction.";
    if(rpe>0&&rpe<=6)return "Basé sur la séance précédente : RPE facile, donc petite progression possible.";
    if(rpe>=7&&rpe<=8)return "Basé sur la séance précédente : effort correct, on garde une charge semblable ou une progression légère.";
    return "Basé sur les dernières séances enregistrées pour ce mouvement.";
  }
  if(isAmbiguousLoad(raw)){
    return "Aucun historique exploitable : charge guidée par le RPE, le matériel disponible et la qualité technique du jour.";
  }
  return "Aucun historique exploitable : charge tirée du programme ou des références de base. À confirmer avec le RPE après la séance.";
}
function loadInfoPayload(exercise, shownLoad){
  if(!exercise)return null;
  var raw=String(exercise.load||"").trim();
  var shown=String(shownLoad||raw||"").trim();
  if(!shown||shown==="—"||shown==="-")return null;
  var hint=loadDecisionHintForExercise(exercise);
  var rows=(hint&&Array.isArray(hint.rows)&&hint.rows.length)?hint.rows:loadHistoryRowsForExercise(exercise);
  var finalLoad=(hint&&hint.load)?hint.load:shown;
  var diagnostic=(typeof buildChargeDiagnosticForExercise==="function")?buildChargeDiagnosticForExercise(exercise, finalLoad):null;
  var equipment=(typeof equipmentStepLabelForExercise==="function")?equipmentStepLabelForExercise(exercise.name||"", exercise.load||finalLoad):"";
  return {
    name:(hint&&hint.name)||((typeof canonicalMovementLabel==="function")?canonicalMovementLabel(loadHistoryExerciseName(exercise)||"Mouvement"):chargeKeyFromName(loadHistoryExerciseName(exercise)||"Mouvement")),
    load:finalLoad,
    equipment:equipment,
    reason:(hint&&hint.reason)||loadReasonForExercise(exercise, finalLoad, rows),
    rows:rows,
    diagnostic:diagnostic,
    source: hint && hint.source ? hint.source : null,
    context: hint && hint.context ? hint.context : null,
    brainStats: hint && hint.brainStats ? hint.brainStats : null,
    ambitiousOption: hint && hint.ambitiousOption ? hint.ambitiousOption : null
  };
}
function loadInfoText(exercise, shownLoad){
  var payload=loadInfoPayload(exercise, shownLoad);
  if(!payload)return "";
  return "AUTOLOAD_HISTORY::"+JSON.stringify(payload);
}
function loadInfoButtonHtml(exercise, shownLoad){
  var msg=loadInfoText(exercise, shownLoad);
  if(!msg)return "";
  var label=String(shownLoad||"").indexOf("⚠")>=0 ? "⚠" : "!";
  return '<button type="button" class="tuto-btn load-info-btn" data-load-info="'+encodeURIComponent(msg)+'">'+label+'</button>';
}
function renderLoadInfoModalBody(msg){
  var hint=null;
  if(msg.indexOf("AUTOLOAD_HISTORY::")===0){
    try{hint=JSON.parse(msg.slice("AUTOLOAD_HISTORY::".length));}catch(e){}
  }
  if(hint){
    // V3.4 — garder le contexte exact du panneau (!) pour l'export Avis IA ciblé.
    // Sans cette liaison, le bouton exportait parfois un prompt movement/GLOBAL sans historique,
    // même quand le panneau affichait déjà un historique réel.
    try{ window.__racineLastLoadInfoHint = hint; }catch(e){}
    var rows=(hint.rows&&hint.rows.length)?hint.rows:[];
    function loadText(v){
      var t=String(v==null?"":v).trim();
      if(!t||t==="\u2014")return "\u2014";
      return /^\d+(?:\.\d+)?$/.test(t) ? t+" lb" : t;
    }
    function pct(v, fallback){
      if(v==null||v==="")return fallback||"\u2014";
      var n=Number(v);
      if(isNaN(n))return fallback||"\u2014";
      if(n<=1)n=n*100;
      return Math.round(n)+" %";
    }
    function parseBrainExplainFromReason(h){
      var reason=String((h&&h.reason)||"");
      var out={};
      var m=reason.match(/Confiance de prediction faible \((\d+(?:\.\d+)?)%\)/i);
      if(m)out.confidence=Number(m[1]);
      m=reason.match(/Validation\s+(\d+)\/(\d+)\s+avant hausse/i);
      if(m){out.validations=Number(m[1]);out.requiredConfirmations=Number(m[2]);}
      m=reason.match(/Intention\s+([a-zA-Z0-9_-]+)/i);
      if(m)out.intent=m[1];
      m=reason.match(/sensibilite\s+([a-zA-Z0-9_-]+)/i);
      if(m)out.sensitivity=m[1];
      m=reason.match(/Option ambitieuse\s*:\s*([^\.]+(?:lb|kg)?)/i);
      if(m)out.ambitiousOption=m[1].trim();
      return out;
    }
    function hydrateBrainStatsFromReason(h){
      h=h||{};
      var reason=String((h&&h.reason)||"");
      var parsed=parseBrainExplainFromReason(h);
      if(parsed.ambitiousOption && !h.ambitiousOption)h.ambitiousOption=parsed.ambitiousOption;
      if(h.brainStats)return h.brainStats;
      if(parsed.confidence!=null||parsed.intent||parsed.sensitivity||parsed.validations!==undefined){
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
          inferredFromReason: true
        };
        return h.brainStats;
      }
      if(/plancher de validation|plancher maitrise|plancher historique/i.test(reason)){
        var rpeMatch=reason.match(/RPE\s+(\d+(?:\.\d+)?)/i);
        var hard=!!(rpeMatch && Number(rpeMatch[1])>=9);
        h.brainStats={
          confidence: hard?68:78,
          ambition: hard?42:60,
          intent: '',
          sensitivity: /pull|dip|muscle/i.test(String(h.name||''))?'high':'',
          validations: hard?0:1,
          requiredConfirmations: hard?2:1,
          prediction: null,
          rpeReliability: {label:'personalized'},
          comfort: hard?'low':'acceptable',
          lastRpe: rpeMatch?Number(rpeMatch[1]):null,
          memory: null,
          inferredFromReason: true
        };
        return h.brainStats;
      }
      return null;
    }
    function rowNum(v){
      var n=Number(String(v==null?"":v).replace(/[^0-9.\-]/g,''));
      return isNaN(n)?0:n;
    }
    function brainRows(h){return (h&&Array.isArray(h.rows))?h.rows:[];}
    function movementName(h){return String((h&&h.name)||'');}
    function inferredSensitivity(h, stats){
      if(stats&&stats.sensitivity)return stats.sensitivity;
      var name=movementName(h).toLowerCase();
      if(/pull|dip|muscle|strict press|front squat|bench/.test(name))return 'high';
      if(/hip thrust|curl|face pull|raise|extension|pushdown/.test(name))return 'low';
      return 'medium';
    }
    function inferredIntent(h, stats){
      if(stats&&stats.intent)return stats.intent;
      if(h&&h.context&&h.context.intent)return h.context.intent;
      if(h&&h.context&&h.context.kind)return h.context.kind;
      return '';
    }
    function rowsTrend(h){
      var rows=brainRows(h).slice().reverse();
      var loads=rows.map(function(r){return rowNum(r.load);}).filter(function(n){return n>0;});
      var reps=rows.map(function(r){return rowNum(r.reps);}).filter(function(n){return n>0;});
      var rpes=rows.map(function(r){return rowNum(r.rpe);}).filter(function(n){return n>0;});
      var increases=0, drops=0;
      for(var i=1;i<loads.length;i++){
        if(loads[i]>loads[i-1])increases++;
        if(loads[i]<loads[i-1])drops++;
      }
      var hard=rpes.filter(function(x){return x>=9;}).length;
      var signal8=rpes.filter(function(x){return x===8;}).length;
      var avgRpe=rpes.length?rpes.reduce(function(a,b){return a+b;},0)/rpes.length:0;
      return {loads:loads,reps:reps,rpes:rpes,increases:increases,drops:drops,hard:hard,signal8:signal8,avgRpe:avgRpe,sessions:loads.length};
    }
    function fallbackConfidence(h, stats){
      if(stats&&stats.confidence!=null&&stats.confidence!=='')return Number(stats.confidence);
      var t=rowsTrend(h);
      var c=45;
      c+=Math.min(28,t.sessions*7);
      c+=Math.min(18,t.increases*4);
      if(t.drops)c-=Math.min(18,t.drops*8);
      if(t.hard)c-=Math.min(16,t.hard*7);
      var sens=inferredSensitivity(h,stats);
      if(sens==='high')c-=8;
      if(sens==='low')c+=6;
      var r=String((h&&h.reason)||'').toLowerCase();
      if(r.indexOf('validation')>=0)c-=4;
      if(r.indexOf('confort faible')>=0)c-=10;
      if(r.indexOf('plancher')>=0)c-=4;
      c=Math.max(38,Math.min(94,Math.round(c)));
      return c;
    }
    function fallbackPrecision(h, stats){
      var t=rowsTrend(h);
      if(stats&&stats.prediction&&stats.prediction.accuracy!=null){
        var a=Number(stats.prediction.accuracy); return a<=1?Math.round(a*100):Math.round(a);
      }
      if(stats&&stats.memory&&stats.memory.precision!=null)return Math.round(Number(stats.memory.precision));
      var p=55+Math.min(24,t.sessions*5)+Math.min(16,t.increases*3)-Math.min(20,t.drops*10)-Math.min(10,t.hard*4);
      return Math.max(45,Math.min(92,Math.round(p)));
    }
    function brainConfidenceText(n){
      n=Number(n)||0;
      if(n>=90)return "Je connais très bien ce mouvement dans ce contexte.";
      if(n>=80)return "Je connais bien ce mouvement.";
      if(n>=65)return "Je connais assez ce mouvement, mais je reste prudent.";
      if(n>=45)return "Je suis encore en apprentissage sur ce mouvement.";
      return "Je manque encore de données fiables.";
    }
    function decisionText(h, stats){
      var r=String((h&&h.reason)||"");
      var rl=r.toLowerCase();
      var load=String((h&&h.load)||"").replace(/\s*⚠\s*/g,'').trim();
      var opt=h&&h.ambitiousOption?String(h.ambitiousOption).trim():'';
      var t=rowsTrend(h);
      var sens=inferredSensitivity(h,stats);
      if(rl.indexOf('plancher de validation')>=0)return "Maintien à "+(load||"la charge actuelle")+". Charge validée, mais confort faible; consolidation requise.";
      if(rl.indexOf('plancher maitrise')>=0)return "Maintien à "+(load||"la charge actuelle")+". Charge maîtrisée récemment.";
      if(rl.indexOf('validation')>=0 || (stats&&stats.requiredConfirmations!=null&&stats.validations!=null&&stats.validations<stats.requiredConfirmations)){
        return "Maintien à "+(load||"la charge actuelle")+". Validation supplémentaire requise"+(opt?"; option ambitieuse : "+opt+".":".");
      }
      if(rl.indexOf('option ambitieuse')>=0)return "Maintien à "+(load||"la charge actuelle")+(opt?". Option ambitieuse : "+opt+".":" avec option ambitieuse.");
      if(rl.indexOf('deload')>=0)return "Réduction de deload";
      if(rl.indexOf('maintien')>=0||rl.indexOf('bloque')>=0)return "Maintien volontaire";
      if(rl.indexOf('micro')>=0)return "Micro-progression";
      if(rl.indexOf('progression prudente')>=0){
        if(sens==='low'&&t.increases>=2&&t.hard===0)return "Progression normale";
        return "Progression prudente";
      }
      if(rl.indexOf('progression normale')>=0||rl.indexOf('hausse')>=0)return "Progression normale";
      if(t.increases>=3&&t.drops===0&&sens==='low')return "Progression normale";
      return "Meilleure estimation actuelle";
    }
    function reasonBullets(h, stats){
      var out=[];
      var reason=String((h&&h.reason)||"").trim();
      var t=rowsTrend(h);
      var sens=inferredSensitivity(h,stats);
      var intent=inferredIntent(h,stats);
      if(t.sessions)out.push(t.sessions+" séance(s) récentes analysées.");
      if(t.increases>=3)out.push("Progression régulière sur plusieurs séances.");
      else if(t.increases>0)out.push(t.increases+" augmentation(s) récente(s) validée(s).");
      if(t.drops===0&&t.sessions>=3)out.push("Aucune baisse récente observée.");
      if(/plancher de validation/i.test(reason))out.push("Dernière charge validée, mais avec confort faible.");
      if(/plancher maitrise/i.test(reason))out.push("Charge maîtrisée récemment avec confort acceptable.");
      if(intent)out.push("Intention analysée : "+intent+".");
      out.push("Sensibilité du mouvement : "+(sens==='high'?"élevée":(sens==='medium'?"moyenne":(sens==='low'?"faible":sens)))+".");
      if(stats){
        if(stats.validations!=null&&stats.requiredConfirmations!=null)out.push("Validations actuelles : "+stats.validations+"/"+stats.requiredConfirmations+".");
        if(stats.rpeReliability&&(stats.rpeReliability.label==='personalized'||stats.rpeReliability.label==='compressed'))out.push("Profil RPE personnalisé : RPE 8 = signal moyen, RPE 9+ = signal fort.");
        if(stats.lastRpe>=9||stats.comfort==='low')out.push("Validation obtenue avec confort faible : effort très élevé.");
        if(stats.memory&&stats.memory.sessions)out.push("Mémoire locale : "+stats.memory.sessions+" séance(s) pour ce mouvement/intention.");
      }
      if(t.hard>0)out.push("Signal RPE fort détecté sur "+t.hard+" séance(s) récente(s).");
      if(t.signal8>=3)out.push("RPE 8 fréquent : je l'interprète comme signal moyen, pas comme preuve absolue.");
      if(h&&h.ambitiousOption)out.push("Option ambitieuse disponible : "+h.ambitiousOption+".");
      var isTechnicalBrain=/brain\s*v2|brain\s+—|plancher de validation|plancher maitrise|confiance de prediction|validation\s+\d+\/\d+|intention\s+[a-z]|sensibilite|option ambitieuse|rpe\s*\d+(?:\.\d+)?\s*[—-]/i.test(reason);
      if(reason&&!isTechnicalBrain&&!out.some(function(x){return x===reason;}))out.push(reason);
      if(!out.length)out.push("Historique insuffisant : je garde une estimation prudente.");
      // dédoublonnage simple
      var seen={};
      return out.filter(function(x){var k=x.toLowerCase(); if(seen[k])return false; seen[k]=true; return true;}).slice(0,7);
    }
    function nextObservation(h, stats){
      var load=String((h&&h.load)||"").replace(/\s*⚠\s*/g,'').trim();
      var r=String((h&&h.reason)||'').toLowerCase();
      if(r.indexOf('plancher de validation')>=0)return "Je veux reconfirmer "+(load||"cette charge")+" avec un meilleur confort avant toute hausse.";
      if(stats&&stats.validations<stats.requiredConfirmations)return "Je veux confirmer "+(load||"cette charge")+". Une validation de plus augmentera ma confiance avant une hausse.";
      if(h&&h.ambitiousOption)return "Si l'échauffement est excellent, l'option ambitieuse peut être testée; sinon je préfère valider "+(load||"la charge actuelle")+".";
      var t=rowsTrend(h);
      if(t.increases>=3&&t.drops===0)return "Je veux confirmer "+(load||"cette charge")+". Si elle passe proprement, je poursuivrai la progression normale.";
      return "Je veux voir si "+(load||"cette charge")+" se confirme avec des répétitions stables.";
    }
    function aiAdviceHtml(h){
      var movement=h&& (h.name||h.label||h.movement);
      var summary=(window.RacineAIImport&&typeof RacineAIImport.renderAdviceSummaryForMovement==='function')
        ? RacineAIImport.renderAdviceSummaryForMovement(movement)
        : '<p class="ai-advice-note">Aucun avis importé.</p>';
      var influence='';
      try{
        if(window.RacineAIInfluence&&typeof RacineAIInfluence.latestInfluenceForMovement==='function'){
          var rec=RacineAIInfluence.latestInfluenceForMovement(movement);
          var txt=rec&&RacineAIInfluence.influenceSummaryText?RacineAIInfluence.influenceSummaryText(rec):'';
          if(txt) influence='<p class="ai-advice-note"><strong>Suivi</strong><br>'+escapeHtml(txt)+'</p>';
        }
      }catch(e){}
      var aiAdmin=!!(window.CoachProfiles&&CoachProfiles.isActiveAdmin&&CoachProfiles.isActiveAdmin());
      // Client (non-admin) : pas d'outils de gestion Avis IA. Un avis déjà importé
      // reste visible en lecture seule ; sinon on n'affiche pas la boîte vide.
      if(!aiAdmin && !summary && !influence) return '';
      var aiButtons=aiAdmin
        ? '<button type="button" id="copyAiAdviceMovementBtn" class="btn-accent ai-advice-btn">Copier prompt Avis IA</button>'+
          '<button type="button" id="importAiAdviceMovementBtn" class="btn-secondary ai-advice-btn">Importer réponse IA</button>'
        : '';
      return '<div class="tuto-section compact ai-advice-box"><div class="tuto-section-title">Avis IA</div>'+
        '<p class="ai-advice-note">Consultatif. Ne modifie jamais la charge automatiquement.</p>'+
        summary+influence+aiButtons+
      '</div>';
    }
    function renderBrainExplain(h){
      if(window.CoachBrainExplain && typeof window.CoachBrainExplain.build === "function"){
        var explanation=window.CoachBrainExplain.build(h||{});
        var bullets=(explanation.facts||[]).map(function(x){return '<li>✓ '+escapeHtml(x)+'</li>';}).join('');
        return '<div class="tuto-section compact brain-explain">'+
          '<div class="tuto-section-title">Analyse Brain</div>'+ 
          '<div class="brain-grid">'+
            '<div><strong>Confiance</strong><br>'+escapeHtml(pct(explanation.confidence))+ '<br><small>'+escapeHtml(explanation.confidenceText||'')+'</small></div>'+ 
            '<div><strong>Précision</strong><br>'+escapeHtml(pct(explanation.precision))+ (explanation.precisionDetail?'<br><small>'+escapeHtml(explanation.precisionDetail)+'</small>':'')+'</div>'+ 
          '</div>'+ 
          '<p><strong>Raison principale</strong><br>'+escapeHtml(explanation.primaryReason||'—')+'</p>'+ 
          '<p><strong>Décision</strong><br>'+escapeHtml(explanation.decision||'—')+'</p>'+ 
          '<p><strong>Faits dominants</strong></p><ul>'+bullets+'</ul>'+ 
          (explanation.journalInsight?'<p><strong>'+escapeHtml(explanation.journalInsight.title||'Journal Brain')+'</strong><br>'+escapeHtml(explanation.journalInsight.text||'')+'</p>':'')+
          '<p><strong>Prochaine observation</strong><br>'+escapeHtml(explanation.nextObservation||'—')+'</p>'+ 
          aiAdviceHtml(h)+
        '</div>';
      }
      var stats=hydrateBrainStatsFromReason(h)||null;
      var conf=fallbackConfidence(h,stats);
      var precision=fallbackPrecision(h,stats);
      var tested=(stats&&stats.prediction&&stats.prediction.tested)?stats.prediction.tested:(stats&&stats.memory&&stats.memory.sessions?stats.memory.sessions:rowsTrend(h).sessions);
      var bullets=reasonBullets(h,stats).map(function(x){return '<li>✓ '+escapeHtml(x)+'</li>';}).join('');
      var precisionLine=(precision!=null?escapeHtml(pct(precision)):"\u2014")+(tested?"<br><small>"+escapeHtml(String(tested))+" prédiction(s) testée(s) ou séance(s) utiles.</small>":"");
      return '<div class="tuto-section compact brain-explain">'+
        '<div class="tuto-section-title">Analyse Brain</div>'+ 
        '<div class="brain-grid">'+
          '<div><strong>Confiance</strong><br>'+escapeHtml(pct(conf))+ '<br><small>'+escapeHtml(brainConfidenceText(conf))+'</small></div>'+ 
          '<div><strong>Précision</strong><br>'+precisionLine+'</div>'+ 
        '</div>'+ 
        '<p><strong>Décision</strong><br>'+escapeHtml(decisionText(h,stats))+'</p>'+ 
        '<p><strong>Pourquoi</strong></p><ul>'+bullets+'</ul>'+ 
        '<p><strong>Prochaine observation</strong><br>'+escapeHtml(nextObservation(h,stats))+'</p>'+ 
        aiAdviceHtml(h)+
      '</div>';
    }
    hydrateBrainStatsFromReason(hint);
    var reasonCheck = String(hint.reason || '').toLowerCase();
    var computedSource = hint.source || 'moteur';
    if(hint.brainStats || reasonCheck.indexOf('brain')>=0 || reasonCheck.indexOf('validation')>=0 || reasonCheck.indexOf('plancher historique')>=0 || reasonCheck.indexOf('plancher de validation')>=0 || reasonCheck.indexOf('plancher maitrise')>=0 || reasonCheck.indexOf('option ambitieuse')>=0){
      computedSource='brain';
    }else if(computedSource === 'moteur'){
      if(reasonCheck.indexOf('rpe') >= 0 && (
         reasonCheck.indexOf('progression') >= 0 ||
         reasonCheck.indexOf('maintien') >= 0 ||
         reasonCheck.indexOf('hausse') >= 0 ||
         reasonCheck.indexOf('réduction') >= 0 ||
         reasonCheck.indexOf('reduction') >= 0 ||
         reasonCheck.indexOf('micro') >= 0
      )) computedSource = 'brain';
      else if(reasonCheck.indexOf('repere') >= 0 || reasonCheck.indexOf('aucun historique') >= 0)
        computedSource = 'reperes';
    }
    var sourceLabel="Moteur initial";
    var sourceDesc="La charge vient directement du programme, avec seulement l'arrondi équipement.";
    var sourceColor="#4CAF50";
    if(computedSource==="brain"){
      sourceLabel="Brain";
      sourceDesc="Brain a influencé ou validé la décision avec l'historique, l'intention et ses garde-fous.";
      sourceColor="#2196F3";
    } else if(computedSource==="reperes"){
      sourceLabel="Repères de base";
      sourceDesc="Pas assez d'historique fiable — l'app utilise des repères de base pour ce mouvement.";
      sourceColor="#FF9800";
    }
    var sourceHtml='<div class="tuto-section" style="margin-bottom:8px">'+
      '<div class="tuto-section-title">Source de suggestion</div>'+ 
      '<div style="display:flex;align-items:center;gap:8px;margin-top:4px">'+
        '<span style="background:'+sourceColor+';color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:.5px">'+escapeHtml(sourceLabel)+'</span>'+ 
        '<span style="font-size:12px;color:#ccc">'+escapeHtml(sourceDesc)+'</span>'+ 
      '</div></div>';
    var lis=rows.length ? rows.map(function(r){
      var origineTag=r.origine?'<span style="font-size:10px;color:#aaa;margin-left:4px">('+escapeHtml(r.origine)+')</span>':"";
      return "<li><strong>"+escapeHtml(r.date||"?")+"</strong> \u2014 "+
        escapeHtml(loadText(r.load))+" \u00d7 "+escapeHtml(r.reps||"?")+
        " \u2014 RPE "+escapeHtml(r.rpe||"?")+(r.status?" <small>"+escapeHtml(r.status)+"</small>":"")+origineTag+"</li>";
    }).join("") : "<li>Aucun historique retrouv\u00e9 pour ce mouvement. V\u00e9rifie que tu es dans le bon profil ou importe une sauvegarde JSON si l'historique existe ailleurs.</li>";
    var analysisHtml=(computedSource==="brain"||hint.brainStats)?renderBrainExplain(hint):'<div class="tuto-section compact"><div class="tuto-section-title">Analyse</div><p>'+escapeHtml(hint.reason||"\u2014")+'</p></div>';
    return '<div class="tuto-topline">HISTORIQUE DE CHARGE</div>'+ 
      '<div class="tuto-title">'+escapeHtml(hint.name||"Mouvement")+'</div>'+ 
      '<div class="tuto-goal"><strong>Charge sugg\u00e9r\u00e9e : '+escapeHtml(hint.load||"\u2014")+'</strong></div>'+ 
      sourceHtml+
      '<div class="tuto-section"><div class="tuto-section-title">Historique des poids utilis\u00e9s</div><ul>'+lis+'</ul></div>'+ 
      analysisHtml;
  }
  return '<div class="tuto-topline">EXPLICATION DE CHARGE</div>'+ 
    '<div class="tuto-title">Pourquoi cette charge?</div>'+ 
    '<div class="tuto-goal">'+escapeHtml(msg)+'</div>';
}
function showLoadInfoModal(msg){
  msg=String(msg||"").trim();
  if(!msg)return;
  var existing=document.getElementById("loadInfoModal");
  if(existing) existing.remove();
  var modal=document.createElement("div");
  modal.id="loadInfoModal";
  modal.className="tuto-modal";
  function modalBodyHtml(){
    return '<div class="tuto-modal-inner">'+
      renderLoadInfoModalBody(msg)+
      '<button id="closeLoadInfoBtn" class="btn-accent" style="width:100%;margin-top:14px">Fermer</button>'+ 
    '</div>';
  }
  function refreshLoadInfoModalBody(){
    modal.innerHTML=modalBodyHtml();
    bindLoadInfoModalActions();
  }
  var close=function(){modal.classList.remove("visible");setTimeout(function(){modal.remove();},220);};
  function bindLoadInfoModalActions(){
    var aiBtn=document.getElementById("copyAiAdviceMovementBtn");
    if(aiBtn) aiBtn.onclick=function(){
      if(window.RacineAIExport && typeof RacineAIExport.copyMovementPrompt==="function"){
        RacineAIExport.copyMovementPrompt(window.__racineLastLoadInfoHint||{});
      }else{
        alert("Export Avis IA indisponible.");
      }
    };
    var aiImportBtn=document.getElementById("importAiAdviceMovementBtn");
    if(aiImportBtn) aiImportBtn.onclick=function(){
      if(window.RacineAIImport && typeof RacineAIImport.showImportModal==="function"){
        var h=window.__racineLastLoadInfoHint||{};
        RacineAIImport.showImportModal({scope:'movement', movement:h.name||h.label||h.movement||''}, function(){
          refreshLoadInfoModalBody();
        });
      }else{
        alert("Import Avis IA indisponible.");
      }
    };
    Array.prototype.forEach.call(modal.querySelectorAll('[data-ai-clear]'),function(clearBtn){
      clearBtn.onclick=function(){
        if(!window.RacineAIImport){ alert('Gestion Avis IA indisponible.'); return; }
        var kind=clearBtn.getAttribute('data-ai-clear')||'';
        var h=window.__racineLastLoadInfoHint||{};
        var movement=h.name||h.label||h.movement||'';
        var ok=false;
        if(kind==='movement' && RacineAIImport.clearLatestMovementAdvice) ok=RacineAIImport.clearLatestMovementAdvice(movement);
        if(kind==='cycle' && RacineAIImport.clearLatestCycleAdvice) ok=RacineAIImport.clearLatestCycleAdvice();
        if(kind==='all' && RacineAIImport.clearAllAdvice) ok=RacineAIImport.clearAllAdvice();
        refreshLoadInfoModalBody();
        if(!ok){
          var box=modal.querySelector('.ai-advice-box');
          if(box) box.insertAdjacentHTML('afterbegin','<p class="ai-advice-note">Aucun avis IA à effacer.</p>');
        }
      };
    });
    var btn=document.getElementById("closeLoadInfoBtn");
    if(btn) btn.onclick=close;
  }
  modal.innerHTML=modalBodyHtml();
  document.body.appendChild(modal);
  bindLoadInfoModalActions();
  setTimeout(function(){modal.classList.add("visible");},20);
  modal.addEventListener("click",function(e){ if(e.target===modal) close(); });
}
function setupLoadInfoButtons(scope){
  (scope||document).querySelectorAll(".load-info-btn[data-load-info]").forEach(function(btn){
    btn.onclick=function(e){
      e.preventDefault(); e.stopPropagation();
      showLoadInfoModal(decodeURIComponent(btn.getAttribute("data-load-info")||""));
    };
  });
}
function showTutorialModal(name){
  if(!window.findCoachBertinTutorial) return;
  var found = window.findCoachBertinTutorial(name);
  if(!found) return;
  var t = found.item;
  var existing=document.getElementById("tutoModal");
  if(existing) existing.remove();
  function list(title, arr){
    if(!arr || !arr.length) return "";
    return '<div class="tuto-section"><div class="tuto-section-title">'+escapeHtml(title)+'</div><ul>'+arr.map(function(x){return '<li>'+escapeHtml(x)+'</li>';}).join("")+'</ul></div>';
  }
  // Lien externe volontaire (pas d'iframe embed) : le PWA reste offline-first,
  // la vidéo ne doit jamais conditionner l'affichage de la fiche.
  var videoId=(window.COACH_BERTIN_MOVEMENT_VIDEOS||{})[found.key];
  var videoHtml=videoId
    ? '<a class="tuto-video-link" href="https://www.youtube.com/watch?v='+encodeURIComponent(videoId)+'" target="_blank" rel="noopener">▶ Voir la vidéo</a>'
    : "";
  var modal=document.createElement("div");
  modal.id="tutoModal";
  modal.className="tuto-modal";
  modal.innerHTML =
    '<div class="tuto-modal-inner">'+
      '<div class="tuto-topline">TUTO MOUVEMENT</div>'+
      '<div class="tuto-title">'+escapeHtml(found.key)+'</div>'+
      '<div class="tuto-goal">'+escapeHtml(t.goal||"")+'</div>'+
      list("Setup", t.setup)+
      list("Exécution", t.execution)+
      list("Erreurs fréquentes", t.mistakes)+
      (t.cue?'<div class="tuto-cue">Repère : '+escapeHtml(t.cue)+'</div>':"")+
      videoHtml+
      '<button id="closeTutoBtn" class="btn-accent" style="width:100%;margin-top:14px">Fermer</button>'+
    '</div>';
  document.body.appendChild(modal);
  setTimeout(function(){modal.classList.add("visible");},20);
  var close=function(){modal.classList.remove("visible");setTimeout(function(){modal.remove();},220);};
  var btn=document.getElementById("closeTutoBtn"); if(btn) btn.onclick=close;
  modal.addEventListener("click",function(e){ if(e.target===modal) close(); });
}
function setupTutorialButtons(scope){
  (scope||document).querySelectorAll(".tuto-btn[data-tuto-name]").forEach(function(btn){
    btn.onclick=function(e){
      e.preventDefault(); e.stopPropagation();
      showTutorialModal(btn.getAttribute("data-tuto-name"));
    };
  });
}

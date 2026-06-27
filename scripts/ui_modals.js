// Coach Beurt V51.63
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
    diagnostic:diagnostic
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
    var rows=(hint.rows&&hint.rows.length)?hint.rows:[];
    function loadText(v){
      var t=String(v==null?"":v).trim();
      if(!t||t==="\u2014")return "\u2014";
      return /^\d+(?:\.\d+)?$/.test(t) ? t+" lb" : t;
    }
    // Source de suggestion
    // Déterminer la source — priorité au champ source, fallback sur la raison
    var reasonCheck = String(hint.reason || '').toLowerCase();
    var computedSource = hint.source || 'moteur';
    if(computedSource === 'moteur'){
      // Fallback : détecter depuis la raison si le champ source n'a pas été mis à jour
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
      sourceDesc="La charge a été ajustée selon l'historique, le RPE, les caps de progression, deload ou garde-fous.";
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
    return '<div class="tuto-topline">HISTORIQUE DE CHARGE</div>'+
      '<div class="tuto-title">'+escapeHtml(hint.name||"Mouvement")+'</div>'+
      '<div class="tuto-goal"><strong>Charge sugg\u00e9r\u00e9e : '+escapeHtml(hint.load||"\u2014")+'</strong></div>'+
      sourceHtml+
      '<div class="tuto-section"><div class="tuto-section-title">Historique des poids utilis\u00e9s</div><ul>'+lis+'</ul></div>'+
      '<div class="tuto-section compact"><div class="tuto-section-title">Pourquoi</div><p>'+escapeHtml(hint.reason||"\u2014")+'</p></div>';
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
  modal.innerHTML =
    '<div class="tuto-modal-inner">'+
      renderLoadInfoModalBody(msg)+
      '<button id="closeLoadInfoBtn" class="btn-accent" style="width:100%;margin-top:14px">Fermer</button>'+
    '</div>';
  document.body.appendChild(modal);
  setTimeout(function(){modal.classList.add("visible");},20);
  var close=function(){modal.classList.remove("visible");setTimeout(function(){modal.remove();},220);};
  var btn=document.getElementById("closeLoadInfoBtn"); if(btn) btn.onclick=close;
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

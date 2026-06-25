// Coach Beurt V51.63 — session view domain
// Vue PC pleine largeur : 1 bloc = 1 page. Le WOD a son gros timer dédié.

var guidedSessionState = { blocks: [], index: 0 };
var guidedLaunchSource = "phone"; // "wodplus" ou "phone"
var guidedResultsMode = false;

function escHtml(v){
  return String(v===undefined||v===null?"":v)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// V50.88+ — iPhone/Safari/PWA viewport fix pour la vue séance.
// V50.93 — Pinch zoom natif : ne pas changer la taille/layout de police pendant le zoom.
// Le bug venait du fait qu'on utilisait visualViewport.height et une classe de reflow
// pendant le pinch : ça faisait croire à l'app que la hauteur était plus petite, donc
// elle recompilait la vue au lieu de laisser Safari zoomer naturellement la zone.
var guidedViewportBound = false;
var guidedLastStableVh = 0;
function guidedSessionIsVisible(){
  var el = document.getElementById('guidedSession');
  return !!(el && !el.classList.contains('hidden'));
}
function guidedViewportScale(){
  return window.visualViewport && window.visualViewport.scale ? Number(window.visualViewport.scale) || 1 : 1;
}
function updateGuidedViewportHeight(){
  var scale = guidedViewportScale();
  var h = 0;

  // Important : quand l'utilisateur fait un pinch zoom, visualViewport.height diminue.
  // On ne doit PAS injecter cette hauteur dans --guided-vh, sinon la séance se recompresse
  // et donne l'impression que la police grossit/réorganise les cartes.
  if(scale <= 1.02 && window.visualViewport && window.visualViewport.height){
    h = Math.floor(window.visualViewport.height);
  }
  if(!h && window.innerHeight){ h = Math.floor(window.innerHeight); }
  if(!h && guidedLastStableVh){ h = guidedLastStableVh; }
  if(!h) return;

  if(scale <= 1.02){ guidedLastStableVh = h; }
  document.documentElement.style.setProperty('--guided-vh', (guidedLastStableVh || h) + 'px');
  document.documentElement.style.setProperty('--guided-scale', String(scale));

  // V50.93 : aucune classe spéciale pendant le pinch zoom.
  // On laisse le zoom natif de Safari faire le grossissement/pan sans reflow CSS.
  document.body.classList.remove('guided-browser-zoom');
}
function forceGuidedSessionReflow(){
  updateGuidedViewportHeight();
  var el = document.getElementById('guidedSession');
  if(!el || el.classList.contains('hidden')) return;
  el.classList.add('guided-reflow');
  void el.offsetHeight;
  requestAnimationFrame(function(){
    updateGuidedViewportHeight();
    el.classList.remove('guided-reflow');
    fitGuidedWodTimer();
  });
}
function bindGuidedViewportEvents(){
  if(guidedViewportBound) return;
  guidedViewportBound = true;
  window.addEventListener('resize', function(){ setTimeout(forceGuidedSessionReflow, 40); }, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(forceGuidedSessionReflow, 120); }, {passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', function(){ setTimeout(forceGuidedSessionReflow, 30); }, {passive:true});
    window.visualViewport.addEventListener('scroll', function(){ setTimeout(updateGuidedViewportHeight, 30); }, {passive:true});
  }
}
function scheduleGuidedViewportRefresh(){
  bindGuidedViewportEvents();
  updateGuidedViewportHeight();
  requestAnimationFrame(function(){
    forceGuidedSessionReflow();
    setTimeout(forceGuidedSessionReflow, 80);
    setTimeout(forceGuidedSessionReflow, 240);
  });
}


// Résultats saisis directement dans le mode séance.
// On garde un cache persistant tant que la page est ouverte, puis collectSessionResults()
// le fusionne aux champs de la vue PC.
var guidedResultCache = {};

function guidedExerciseKey(name){
  return chargeKeyFromName(String(name||"")).trim();
}
function findSessionInput(key, field){
  var found=null;
  Array.prototype.forEach.call(document.querySelectorAll('#sessionFields .sf-input[data-key][data-field]'), function(inp){
    if(found)return;
    if(inp.getAttribute('data-key')===key && inp.getAttribute('data-field')===field) found=inp;
  });
  return found;
}

// synchronisation immédiate mode séance → saisie iPhone.
// Quand tu modifies poids/reps/RPE dans la vue séance, les champs et chips
// correspondants dans la section résultats iPhone se mettent à jour tout de suite.
function syncSessionEntryFromGuided(key, field, value){
  var inp=findSessionInput(key, field);
  if(!inp)return;
  inp.value=String(value);
  if(field==='reps'){
    var repsBox=document.getElementById('reps_'+key);
    if(repsBox){
      Array.prototype.forEach.call(repsBox.querySelectorAll('.sf-chip'), function(b){
        b.classList.remove('active');
        if(String(b.textContent).trim()===String(value)) b.classList.add('active');
      });
    }
  }

  if(field==='rpe'){
    var rpeBox=document.getElementById('rpe_'+key);
    if(rpeBox){
      Array.prototype.forEach.call(rpeBox.querySelectorAll('.sf-chip'), function(b){
        b.classList.remove('active');
        if(String(b.textContent).trim()===String(value)) b.classList.add('active');
      });
    }
  }
}
function getGuidedResult(key, field, fallback){
  if(guidedResultCache[key] && guidedResultCache[key][field]!==undefined) return guidedResultCache[key][field];
  var inp=findSessionInput(key, field);
  if(inp && String(inp.value||'').trim()!=='') return inp.value;
  return fallback;
}
function setGuidedResult(key, field, value){
  if(!key||!field)return;
  if(!guidedResultCache[key]) guidedResultCache[key]={};
  guidedResultCache[key][field]=String(value);
  syncSessionEntryFromGuided(key, field, value);
}
function guidedNumberText(v){
  var n=Number(v);
  if(!isFinite(n)) return String(v||'');
  return (Math.round(n*10)/10).toString().replace(/\.0$/,'');
}
function guidedClampValue(v,min,max){
  var n=Number(v);
  if(!isFinite(n)) n=0;
  if(min!==undefined && min!==null && n<Number(min)) n=Number(min);
  if(max!==undefined && max!==null && n>Number(max)) n=Number(max);
  return n;
}
function guidedStepValue(v, step, min, max){
  var current=Number(v);
  if(!isFinite(current)) current=0;
  var s=Number(step)||1;
  var next=current+s;
  if(Math.abs(s)===1) next=Math.round(next);
  else next=Math.round(next*10)/10;
  return guidedClampValue(next,min,max);
}
function setupGuidedResultControls(root){
  if(!root)return;
  Array.prototype.forEach.call(root.querySelectorAll('[data-guided-field]'), function(inp){
    var key=inp.getAttribute('data-key'), field=inp.getAttribute('data-guided-field');
    inp.addEventListener('input', function(){ setGuidedResult(key, field, inp.value); });
    inp.addEventListener('change', function(){ setGuidedResult(key, field, inp.value); });
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-guided-adjust]'), function(btn){
    btn.addEventListener('click', function(){
      var key=btn.getAttribute('data-key');
      var delta=Number(btn.getAttribute('data-guided-adjust'))||0;
      var inp=root.querySelector('[data-key="'+key.replace(/"/g,'\\"')+'"][data-guided-field="load"]');
      if(!inp)return;
      var v=parseLoad(inp.value)||0;
      var exName=inp.getAttribute("data-exercise")||key;
      var next=nextLoadForExercise(exName, v, delta, inp.value);
      inp.value=next;
      setGuidedResult(key,'load',next);
    });
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-guided-step]'), function(btn){
    btn.addEventListener('click', function(){
      var key=btn.getAttribute('data-key');
      var field=btn.getAttribute('data-guided-step');
      var step=Number(btn.getAttribute('data-step'))||0;
      var min=btn.hasAttribute('data-min') ? Number(btn.getAttribute('data-min')) : null;
      var max=btn.hasAttribute('data-max') ? Number(btn.getAttribute('data-max')) : null;
      var inp=root.querySelector('[data-key="'+key.replace(/"/g,'\\"')+'"][data-guided-field="'+field+'"]');
      if(!inp)return;
      var next=guidedStepValue(inp.value, step, min, max);
      inp.value=guidedNumberText(next);
      setGuidedResult(key,field,inp.value);
    });
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-guided-reps]'), function(btn){
    btn.addEventListener('click', function(){
      var key=btn.getAttribute('data-key'), val=btn.getAttribute('data-guided-reps');
      setGuidedResult(key,'reps',val);
      var group=btn.closest('.guided-chip-row');
      if(group) Array.prototype.forEach.call(group.querySelectorAll('.guided-chip'), function(b){b.classList.remove('active');});
      btn.classList.add('active');
      var inp=root.querySelector('[data-key="'+key.replace(/"/g,'\\"')+'"][data-guided-field="reps"]');
      if(inp) inp.value=val;
    });
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-guided-rpe]'), function(btn){
    btn.addEventListener('click', function(){
      var key=btn.getAttribute('data-key'), val=btn.getAttribute('data-guided-rpe');
      setGuidedResult(key,'rpe',val);
      var group=btn.closest('.guided-chip-row');
      if(group) Array.prototype.forEach.call(group.querySelectorAll('.guided-chip'), function(b){b.classList.remove('active');});
      btn.classList.add('active');
      var inp=root.querySelector('[data-key="'+key.replace(/"/g,'\\"')+'"][data-guided-field="rpe"]');
      if(inp) inp.value=val;
    });
  });
}

function buildGuidedSessionBlocks(){
  var w = buildWorkout(state.day,state.week);
  var blocks = [];
  w.blocks.forEach(function(b,bi){
    var rk = kindRank(b.kind);
    var obj = {
      kind:b.kind,
      tag:rk.tag,
      title:b.title,
      time:b.time,
      text:b.text || "",
      blockIndex:bi,
      exercises:[],
      timer:null,
      moves:null,
      loadHints:""
    };

    if(b.exercises && b.exercises.length){
      b.exercises.forEach(function(e,ei){
        var parsedTarget=parseTargetReps(e.format,10);
        obj.exercises.push({
          key:guidedExerciseKey(e.name),
          title:e.name,
          format:e.format || "",
          targetMin:parsedTarget.min,
          targetMax:parsedTarget.max,
          load:CoachCharge.suggestLoad(e.name,e.load,(parsedTarget.min||parsedTarget.max),{kind:b.kind,blockTitle:b.title,note:e.note,text:b.text,format:e.format,day:(state&&state.day),week:(state&&state.week)}) || "",
          rest:e.rest || "",
          note:e.note || "",
          exerciseIndex:ei
        });
      });
    } else if(b.progress && b.progress.length){
      b.progress.forEach(function(mvKey,j){
        var reps=targetReps(j,b.kind);
        var baseLoad=suggestLoad(mvKey,progressionPct(j),reps);
        var adj=getRpeAdjustment(mvKey,reps);
        var finalLoad=roundLoadForExercise(movements[mvKey]?movements[mvKey].name:mvKey, baseLoad+(adj.adj||0), "nearest");
        var fmt=setScheme(b.kind,j);
        var parsedTarget2=parseTargetReps(fmt,reps);
        obj.exercises.push({
          key:mvKey,
          title:movements[mvKey].name,
          format:fmt,
          targetMin:parsedTarget2.min,
          targetMax:parsedTarget2.max,
          load:lbForExercise(movements[mvKey]?movements[mvKey].name:mvKey, finalLoad)+(adj.arrow?" "+adj.arrow:""),
          rest:restFor(b.kind),
          note:adj.msg || "",
          exerciseIndex:j
        });
      });
    }

    if(b.kind==="wod"){
      obj.timer = wodTimerConfig(b);
      obj.moves = parseWodStructure(b.text || "");
      // V51.16: pas de pastilles de charge sous le timer en mode séance.
      // Elles prennent l’espace du timer et du bas cliquable; la charge reste dans le texte/programme ailleurs.
      obj.loadHints = "";
    }

    blocks.push(obj);
  });
  return blocks;
}

function openGuidedSessionFrom(source){
  guidedLaunchSource = source === "wodplus" ? "wodplus" : "phone";
  guidedResultsMode = false;
  document.body.classList.remove("guided-results-active");
  document.body.classList.add("guided-session-active");
  openGuidedSession();
}

function openGuidedSession(){
  resumeAudio();
  // Démarrer une séance active automatiquement le maintien de l’écran.
  // Comme l’ouverture vient d’un clic utilisateur, iOS/PWA a les meilleures chances d’accepter le Wake Lock.
  guidedWakeLockAuto = !wakeLockWanted;
  requestWakeLock();
  guidedSessionState.blocks = buildGuidedSessionBlocks();
  guidedSessionState.index = 0;
  renderGuidedSession();
  scheduleGuidedViewportRefresh();
}

function closeGuidedSession(){
  stopGuidedTimer();
  var el=$("guidedSession");
  if(el){ el.classList.add("hidden"); el.innerHTML=""; }
  document.body.classList.remove("guided-session-active");
  document.body.classList.remove("guided-results-active");
  guidedResultsMode = false;
  // Si le Wake Lock a été activé seulement par le mode séance, on le relâche en quittant.
  // S’il était déjà activé manuellement avant, on le laisse actif.
  if(guidedWakeLockAuto){ releaseWakeLock(); }
  guidedWakeLockAuto=false;
  if(guidedLaunchSource === "wodplus"){
    switchView("training");
  }
  guidedLaunchSource = "phone";
}
function finishGuidedSession(){
  stopGuidedTimer();
  var el=$("guidedSession");
  if(el){ el.classList.add("hidden"); el.innerHTML=""; }
  if(guidedWakeLockAuto){ releaseWakeLock(); }
  guidedWakeLockAuto=false;
  document.body.classList.remove("guided-session-active");
  guidedResultCache = {};
  guidedResultsMode = true;
  switchView("results");
  setTimeout(function(){
    var entry=$("sessionEntry");
    if(entry&&entry.scrollIntoView)entry.scrollIntoView({behavior:"smooth",block:"start"});
  },40);
}

function guidedNext(){
  if(guidedSessionState.index < guidedSessionState.blocks.length-1){
    stopGuidedTimer();
    guidedSessionState.index++;
    renderGuidedSession();
    scheduleGuidedViewportRefresh();
  }
}
function guidedPrev(){
  if(guidedSessionState.index > 0){
    stopGuidedTimer();
    guidedSessionState.index--;
    renderGuidedSession();
    scheduleGuidedViewportRefresh();
  }
}

function renderGuidedWodMoves(moves){
  var html="";
  if(moves&&moves.length){
    html+="<div class='guided-wod-moves'>";
    moves.slice(0,4).forEach(function(mv){
      html+="<div class='guided-wod-move "+escHtml(mv.color)+"'>"+
            "<div class='guided-wod-reps'>"+escHtml(mv.reps)+"</div>"+
            "<div class='guided-wod-name'>"+escHtml(typeof displayMovementName==='function'?displayMovementName(mv.name):mv.name)+"</div>"+
            "</div>";
    });
    html+="</div>";
  }
  return html;
}
function renderGuidedResultPanel(e){
  var key=e.key || guidedExerciseKey(e.title);
  var parsed=parseTargetReps(e.format,8);
  var tmin=Number(e.targetMin||parsed.min||8), tmax=Number(e.targetMax||parsed.max||tmin);
  var defaultReps=Math.round((tmin+tmax)/2);
  var suggestedLoad=parseLoad(e.load)||0;
  suggestedLoad=suggestedLoad?roundLoadForExercise(e.title, suggestedLoad, "nearest", e.load):0;
  var loadVal=getGuidedResult(key,'load',suggestedLoad?suggestedLoad:'');
  var repsVal=Number(getGuidedResult(key,'reps',defaultReps))||defaultReps;
  var rpeVal=Number(getGuidedResult(key,'rpe',8))||8;
  if(loadVal!=='' && loadVal!==undefined) setGuidedResult(key,'load',loadVal);
  setGuidedResult(key,'reps',repsVal);
  setGuidedResult(key,'rpe',rpeVal);

  var html="<div class='guided-result-panel'>";
  html+="<div class='guided-result-title'>Résultat</div>";
  html+="<div class='guided-load-row'>"+
        "<button type='button' class='guided-adj minus' data-key='"+escHtml(key)+"' data-exercise='"+escHtml(e.title)+"' data-guided-adjust='-5'>−</button>"+
        "<input class='guided-result-input guided-load-input' data-key='"+escHtml(key)+"' data-exercise='"+escHtml(e.title)+"' data-guided-field='load' type='number' inputmode='decimal' value='"+escHtml(loadVal)+"' placeholder='lb'/>"+
        "<button type='button' class='guided-adj plus' data-key='"+escHtml(key)+"' data-exercise='"+escHtml(e.title)+"' data-guided-adjust='5'>+</button>"+
        "</div>";
  html+="<div class='guided-step-grid'>";
  html+="<div class='guided-step-control reps-step'><span>Reps</span><div class='guided-step-row'>"+
        "<button type='button' class='guided-step-btn minus' data-key='"+escHtml(key)+"' data-guided-step='reps' data-step='-1' data-min='0'>−</button>"+
        "<input class='guided-result-input guided-mini-input' data-key='"+escHtml(key)+"' data-guided-field='reps' type='number' inputmode='numeric' min='0' step='1' value='"+escHtml(guidedNumberText(repsVal))+"'/>"+
        "<button type='button' class='guided-step-btn plus' data-key='"+escHtml(key)+"' data-guided-step='reps' data-step='1' data-min='0'>+</button>"+
        "</div></div>";
  html+="<div class='guided-step-control rpe-step'><span>RPE</span><div class='guided-step-row'>"+
        "<button type='button' class='guided-step-btn minus' data-key='"+escHtml(key)+"' data-guided-step='rpe' data-step='-0.5' data-min='1' data-max='10'>−</button>"+
        "<input class='guided-result-input guided-mini-input' data-key='"+escHtml(key)+"' data-guided-field='rpe' type='number' inputmode='decimal' min='1' max='10' step='0.5' value='"+escHtml(guidedNumberText(rpeVal))+"'/>"+
        "<button type='button' class='guided-step-btn plus' data-key='"+escHtml(key)+"' data-guided-step='rpe' data-step='0.5' data-min='1' data-max='10'>+</button>"+
        "</div></div>";
  html+="</div></div>";
  return html;
}

function renderGuidedExerciseList(exercises){
  var html="";
  if(!exercises||!exercises.length)return html;
  html+="<div class='guided-ex-list'>";
  exercises.forEach(function(e,idx){
    var restSec=parseRestToSeconds(e.rest);
    html+="<div class='guided-ex-card'>"+
          "<div class='guided-ex-main'>"+
            "<div class='guided-ex-title'><span>"+escHtml(typeof displayMovementName==='function'?displayMovementName(e.title):e.title)+"</span>"+tutorialButtonHtml(e.title)+"</div>"+
            "<div class='guided-ex-grid'>";
    if(e.format)html+="<div><span>Format</span><strong>"+escHtml(e.format)+"</strong></div>";
    if(e.load){
      html+="<div class='guided-load-info-line'><span>Poids</span><strong class='accent guided-load-value'>"+escHtml(e.load)+loadInfoButtonHtml(e,e.load)+"</strong></div>";
    }
    if(e.rest&&e.rest!=="—")html+="<div class='guided-rest-info'><span>Repos</span><strong>"+escHtml(e.rest)+"</strong></div>";
    html+="</div>";
    html+=renderGuidedResultPanel(e);
    if(e.note)html+="<div class='guided-note compact'>"+escHtml(e.note)+"</div>";
    html+="</div></div>";
  });
  html+="</div>";
  return html;
}



function parseGuidedSteps(text){
  var t = cleanLine(displayChargeText(text||''));
  if(!t) return [];
  var steps = [];
  var currentPrefix = "";

  function addToken(token){
    token = String(token||"").replace(/^[\s\-–•]+/,'').replace(/[.;]+$/,'').trim();
    if(!token) return;

    // Ex.: "2 tours : Band External Rotation — elbow tucked 12/côté"
    var prefixMatch = token.match(/^((?:\d+\s*tours?|circuit\s*\d+\s*tours?|puis|then)\s*:)\s*(.+)$/i);
    if(prefixMatch){
      currentPrefix = prefixMatch[1].trim();
      token = prefixMatch[2].trim();
    }

    // Ex.: "Puis : DB Shoulder Press léger 12"
    var thenMatch = token.match(/^(puis|then)\s*:?\s*(.+)$/i);
    if(thenMatch){
      currentPrefix = "Puis :";
      token = thenMatch[2].trim();
    }

    // Name + dose. Keep the full movement name visible and put the dose separately.
    var dose = "";
    var name = token;
    var doseMatch = token.match(/^(.*?)(\s+(?:\d+\s*\/\s*côté|\d+\/côté|\d+\s*\/\s*side|\d+\/side|\d+\s*(?:reps?|sec|s|m|min)|barre à vide×\d+|empty bar×\d+|40%×\d+|\d+%×\d+|\d+×\d+))$/i);
    if(doseMatch && doseMatch[1].trim().length >= 2){
      name = doseMatch[1].trim();
      dose = doseMatch[2].trim();
    }

    steps.push({prefix: currentPrefix, name:name, dose:dose});
    currentPrefix = "";
  }

  t.split(/\s*\+\s*/).forEach(addToken);
  return steps.filter(function(x){return x && x.name && x.name.length>1;}).slice(0,10);
}

function renderGuidedStepList(text, kind){
  var steps = parseGuidedSteps(text);
  if(!steps.length) return '';
  var html = "<div class='guided-step-list kind-"+escHtml(kind||'')+"'>";
  steps.forEach(function(step,idx){
    html += "<div class='guided-step-card'>"+
            "<div class='guided-step-body'>"+
              (step.prefix?"<div class='guided-step-prefix'>"+escHtml(step.prefix)+"</div>":"")+
              "<div class='guided-step-name'><span>"+escHtml(step.name)+"</span>"+tutorialButtonHtml(step.name)+"</div>"+
              (step.dose?"<div class='guided-step-dose'>"+escHtml(step.dose)+"</div>":"")+
            "</div>"+
            "</div>";
  });
  html += "</div>";
  return html;
}

function renderGuidedSession(){
  var el=$("guidedSession"); if(!el)return;
  var blocks=guidedSessionState.blocks||[];
  if(!blocks.length){ closeGuidedSession(); return; }
  var i=guidedSessionState.index;
  var st=blocks[i];
  var pct=Math.round(((i+1)/blocks.length)*100);
  var isFirst=i===0, isLast=i===blocks.length-1;
  var text=cleanLine(displayChargeText(st.text||""));
  var cfg=st.timer;

  var html="";
  html+="<div class='guided-top'>"+
        "<button class='tb-btn' id='guidedCloseBtn'>✕</button>"+
        "<div class='guided-top-title'>Mode séance · "+escHtml(currentDayLabel())+" · S"+state.week+"</div>"+
        "<div class='guided-top-right'><div id='guidedLiveClock' class='guided-live-clock' aria-label='Heure actuelle'></div><div class='guided-count'>"+(i+1)+"/"+blocks.length+"</div></div>"+
        "</div>";
  html+="<div class='guided-progress'><div style='width:"+pct+"%'></div></div>";
  html+="<div class='guided-card kind-"+escHtml(st.kind)+"'>";
  html+="<div class='guided-tag'>"+escHtml(st.tag)+" · "+escHtml(st.time)+"</div>";

  if(st.kind==="wod"){
    html+="<div class='guided-wod-head'>"+
          "<div class='guided-wod-kicker'>"+escHtml((cfg&&cfg.label)||"WOD")+"</div>"+
          "<div class='guided-wod-title'>"+escHtml(st.title)+"</div>"+
          "</div>";
    html+=renderGuidedWodMoves(st.moves);
    html+="<div class='guided-wod-timer' data-duration='"+(cfg?cfg.seconds:0)+"' data-mode='"+(cfg?cfg.mode:"down")+"'>"+
          "<div class='guided-timer-label'>"+escHtml((cfg&&cfg.label)||"Timer")+(cfg&&cfg.isEmom?" · bip/min":"")+"</div>"+
          "<div class='guided-timer-display' id='guidedTimerDisplay'>"+formatGuidedTimerClock(cfg&&cfg.mode==="up"?0:(cfg?cfg.seconds:0))+"</div>"+
          "<div class='guided-timer-buttons'>"+
            "<button class='guided-tbtn start' id='guidedTimerStart'>▶</button>"+
            "<button class='guided-tbtn' id='guidedTimerPause'>Ⅱ</button>"+
            "<button class='guided-tbtn' id='guidedTimerReset'>↻</button>"+
          "</div>"+
          "<div class='guided-timer-hint'>Démarrage 10s · gros affichage lisible à distance</div>"+
          "</div>";
    if(text)html+="<div class='guided-wod-fulltext'>"+escHtml(text)+"</div>";
    if(st.loadHints)html+=st.loadHints.replace(/pc-wod/g,"guided-wod");
  } else {
    html+="<div class='guided-title'>"+escHtml(st.title)+"</div>";
    if(st.kind==="warmup" || st.kind==="mobility" || st.kind==="bonus"){
      html+=renderGuidedStepList(st.text, st.kind);
    } else if(st.exercises && st.exercises.length){
      // En mode séance, on retire le paragraphe d'instructions pour éviter le scroll inutile.
      html+=renderGuidedExerciseList(st.exercises);
    } else if(text){
      // Certains blocs autonomes (ex.: Optionnel / Bonus) n'ont pas d'exercises[].
      // Avant , ils s'affichaient vides en mode séance.
      html+=renderGuidedStepList(st.text, st.kind) || ("<div class='guided-note big'>"+escHtml(text)+"</div>");
    } else {
      html+="<div class='guided-note big'>Aucun contenu pour ce bloc.</div>";
    }
  }

  html+="</div>";
  html+="<div class='guided-actions'>"+
        "<button class='guided-btn' id='guidedPrevBtn' "+(isFirst?"disabled":"")+">← Précédent</button>"+
        "<button class='guided-btn primary' id='guidedNextBtn'>"+(isLast?"Terminer":"Bloc suivant →")+"</button>"+
        "</div>";
  // V50.85: lien "Voir séance complète" retiré.
  // Le bouton X en haut à gauche remplit déjà ce rôle et libère de l'espace vertical iPhone.

  el.innerHTML=html;
  el.classList.remove("hidden");
  updateGlobalClock();
  $("guidedCloseBtn").onclick=closeGuidedSession;
  $("guidedPrevBtn").onclick=guidedPrev;
  $("guidedNextBtn").onclick=function(){ if(isLast)finishGuidedSession(); else guidedNext(); };
  Array.prototype.forEach.call(el.querySelectorAll(".guided-rest[data-rest]"),function(btn){
    btn.onclick=function(){ startRestTimer(Number(btn.getAttribute("data-rest"))||0); };
  });
  setupGuidedResultControls(el);
  setupTutorialButtons(el);
  setupLoadInfoButtons(el);

  if(st.kind==="wod" && cfg){
    resetGuidedTimerState(cfg);
    var start=$("guidedTimerStart"), pause=$("guidedTimerPause"), reset=$("guidedTimerReset");
    if(start)start.onclick=startGuidedTimer;
    if(pause)pause.onclick=pauseGuidedTimer;
    if(reset)reset.onclick=function(){ resetGuidedTimerState(cfg); };
  }
}


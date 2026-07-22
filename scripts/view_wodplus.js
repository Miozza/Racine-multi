// Coach Beurt V51.63 — WOD+ render helpers
// Extraction prudente depuis app.js.
// But: alléger app.js sans changer le comportement visible de WOD+.
// Ne contient pas le moteur de charges, l'historique, le RPE storage ou la sauvegarde profil.

function kindRank(kind){
  if(kind==="wod")         return{rank:"WOD", cls:"rank-S",tag:"Conditioning",tagCls:"wod-tag"};
  if(kind==="main")        return{rank:"A",   cls:"rank-A",tag:"Principal",   tagCls:"main-tag"};
  if(kind==="secondary")   return{rank:"B",   cls:"rank-B",tag:"Secondaire",  tagCls:"acc-tag"};
  if(kind==="hypertrophy") return{rank:"H",   cls:"rank-B",tag:"Hypertrophie",tagCls:"acc-tag"};
  if(kind==="technique")   return{rank:"T",   cls:"rank-B",tag:"Technique",   tagCls:"acc-tag"};
  if(kind==="core")        return{rank:"C",   cls:"rank-B",tag:"Core",        tagCls:"acc-tag"};
  if(kind==="accessory")   return{rank:"B",   cls:"rank-B",tag:"Accessoire",  tagCls:"acc-tag"};
  if(kind==="mobility")    return{rank:"M",   cls:"rank-C",tag:"Mobilité",    tagCls:"mob-tag"};
  if(kind==="warmup")      return{rank:"W",   cls:"rank-D",tag:"Warm-up",     tagCls:""};
  return{rank:"B",cls:"rank-D",tag:"Bonus",tagCls:""};
}
function displayRankForBlock(block, mainSeen){
  var rk=kindRank(block&&block.kind);
  // Garde-fou global une séance ne doit pas afficher deux Principaux.
  // Si un vieux programme contient plusieurs kind:"main", seul le premier garde le badge Principal.
  if(block&&block.kind==="main"&&mainSeen>1){
    return{rank:"B",cls:"rank-B",tag:"Secondaire",tagCls:"acc-tag"};
  }
  return rk;
}

function rpeArrowHtml(mvKey, reps){
  var adj=getRpeAdjustment(mvKey,reps);
  if(!adj.arrow)return "";
  return ' <span style="font-size:11px;font-weight:900;color:'+adj.color+'">'+adj.arrow+' <span style="font-size:10px">'+adj.msg+'</span></span>';
}


// UI modals and small interactive buttons moved to scripts/ui_modals.js in V50.55.
// Global functions kept: escapeHtml, tutorialButtonHtml, loadInfoButtonHtml, setupLoadInfoButtons, showTutorialModal, setupTutorialButtons.



function wodPlusTotalMinutes(blocks){
  var total=0;
  (blocks||[]).forEach(function(b){
    var m=String(b.time||"").match(/(\d+)/);
    if(m)total+=Number(m[1]);
  });
  return total||0;
}
function wodPlusFatigueLabel(blocks){
  var txt=(blocks||[]).map(function(b){return [b.kind,b.title,b.text].join(" ");}).join(" ").toLowerCase();
  var score=0;
  if(/heavy|lourd|force|principal|squat|clean|press|thrust/i.test(txt))score++;
  if(/wod|amrap|for time|emom|conditioning|burpees|cal/i.test(txt))score++;
  if((blocks||[]).length>=5)score++;
  if(score>=3)return "Élevée";
  if(score===2)return "Moyenne";
  return "Contrôlée";
}
function wodPlusPriority(blocks){
  var main=(blocks||[]).filter(function(b){return b.kind==="main";})[0] || (blocks||[])[0];
  if(!main)return "Séance";
  if(main.exercises&&main.exercises.length)return chargeKeyFromName(main.exercises[0].name||main.title);
  if(main.progress&&main.progress.length&&movements[main.progress[0]])return movements[main.progress[0]].name;
  return main.title||"Séance";
}
function wodPlusStartButtonHtml(extraClass){
  return '<button type="button" class="btn-accent wodplus-start '+(extraClass||'')+'" data-action="start-guided-session">▶ Démarrer séance</button>';
}
function startGuidedSessionFromWodPlus(){
  CoachSession.openFrom("wodplus");
}
function setupWodPlusActions(root){
  root = root || document;
  Array.prototype.forEach.call(root.querySelectorAll('[data-action="start-guided-session"]'), function(btn){
    btn.onclick=function(){startGuidedSessionFromWodPlus();};
  });
}
function wodPlusExerciseHtml(e, block, isPrimary){
  block = block || {};
  var shown=CoachCharge.suggestForExercise(e, block);
  var html='';
  html+='<div class="wodplus-ex '+(isPrimary?'primary':'')+'">';
  html+='<div class="wodplus-ex-name"><span>'+e.name+'</span>'+tutorialButtonHtml(e.name)+'</div>';
  html+='<div class="wodplus-line"><span>Format</span><strong>'+e.format+'</strong></div>';
  if(isPrimary){
    html+='<div class="wodplus-loadbox"><span>Charge suggérée</span><strong>'+shown+'</strong>'+loadInfoButtonHtml(e,shown)+'</div>';
  }else{
    html+='<div class="wodplus-line"><span>Charge suggérée</span><strong>'+shown+loadInfoButtonHtml(e,shown)+'</strong></div>';
  }
  html+='<div class="wodplus-line"><span>Repos</span><strong>'+e.rest+'</strong></div>';
  if(e.note)html+='<div class="wodplus-note"><span>Note</span>'+e.note+'</div>';
  html+='</div>';
  return html;
}
function wodPlusProgressExerciseHtml(mvKey, kind, index, isPrimary){
  var reps=targetReps(index,kind);
  var baseLoad=suggestLoad(mvKey,progressionPct(index),reps);
  var adj=getRpeAdjustment(mvKey,reps);
  var name=movements[mvKey]?movements[mvKey].name:mvKey;
  var finalLoad=roundLoadForExercise(name, baseLoad+(adj.adj||0), "nearest");
  var shown=lbForExercise(name, finalLoad)+(adj.arrow?' '+adj.arrow:'');
  var html='';
  html+='<div class="wodplus-ex '+(isPrimary?'primary':'')+'">';
  html+='<div class="wodplus-ex-name"><span>'+name+'</span>'+tutorialButtonHtml(name)+'</div>';
  html+='<div class="wodplus-line"><span>Format</span><strong>'+setScheme(kind,index)+'</strong></div>';
  if(isPrimary){
    html+='<div class="wodplus-loadbox"><span>Charge suggérée</span><strong>'+shown+'</strong>'+loadInfoButtonHtml({name:name,load:shown,note:""},shown)+'</div>';
  }else{
    html+='<div class="wodplus-line"><span>Charge suggérée</span><strong>'+shown+loadInfoButtonHtml({name:name,load:shown,note:""},shown)+'</strong></div>';
  }
  html+='<div class="wodplus-line"><span>Repos</span><strong>'+restFor(kind)+'</strong></div>';
  html+='</div>';
  return html;
}

function renderWorkout(){
  var w=buildWorkout(state.day,state.week);
  var wt=$("workoutTitle"),fi=$("focusImpact"),c=$("blocks"),pa=$("progressionAdvice");
  var plan=state.cycle.goal==="shoulders3d"?shouldersWeekPlan(state.week):null;
  var wi=buildWeekInfo();
  var weekLabel=(wi[state.week]?wi[state.week].label:"S"+state.week);
  var totalMin=wodPlusTotalMinutes(w.blocks);
  var fatigue=wodPlusFatigueLabel(w.blocks);
  var priority=wodPlusPriority(w.blocks);
  var dayState=isDayCompleted(state.day)?"complétée":(isDayMissed(state.day)?"manquée":"prévue");

  if(wt){
    var p = window.CoachProfiles && CoachProfiles.getActive ? CoachProfiles.getActive() : null;
    var pname = (p && p.name) ? p.name : 'Racine';
    wt.textContent = 'WOD · ' + pname;
  }

  var deloadWarning=state.deloadAlert
    ?"<div class='wodplus-alert'>⚠ RPE élevé détecté — considère un deload</div>":"";

  if(fi)fi.innerHTML=
    "<section class='wodplus-hero'>"+
      "<div class='wodplus-hero-top'>"+
        "<div>"+
          "<div class='system-tag'>"+focus().label.toUpperCase()+" · "+weekLabel+"</div>"+
          "<h1>"+w.day.label+"</h1>"+
          "<p>"+w.day.base+" · "+w.day.focus+"</p>"+
        "</div>"+
        wodPlusStartButtonHtml("top")+
      "</div>"+
      "<div class='wodplus-intention'><span>Intention</span><strong>"+dayIntention(state.day)+"</strong></div>"+
      (plan?"<div class='wodplus-plan'>"+plan.label+" — "+plan.note+"</div>":"")+
      deloadWarning+
      "<div class='wodplus-stats'>"+
        "<div><span>Durée</span><strong>"+(totalMin?totalMin+" min":"—")+"</strong></div>"+
        "<div><span>Fatigue</span><strong>"+fatigue+"</strong></div>"+
        "<div><span>Priorité</span><strong>"+priority+"</strong></div>"+
        "<div><span>État</span><strong>"+dayState+"</strong></div>"+
      "</div>"+
    "</section>";

  if(!c)return;
  c.innerHTML="";
  c.classList.add("wodplus-blocks");
  var mainSeen=0;
  w.blocks.forEach(function(b){
    if(b.kind==="main")mainSeen++;
    var rk=displayRankForBlock(b,mainSeen);
    var div=document.createElement("div");
    div.className="wodplus-block kind-"+b.kind;
    var inner="";
    inner+="<div class='wodplus-block-head'>"+
      "<div class='block-rank "+rk.cls+" rank-badge'>"+rk.rank+"</div>"+
      "<div><div class='wodplus-block-title'>"+b.title+"</div><div class='wodplus-block-tag'>"+rk.tag+" · "+b.time+"</div></div>"+
    "</div>";

    if(b.text)inner+="<div class='wodplus-text'>"+cleanLine(displayChargeText(b.text))+"</div>";

    if(b.exercises&&b.exercises.length){
      b.exercises.forEach(function(e,idx){
        inner+=wodPlusExerciseHtml(e, b, b.kind==="main" && idx===0 && mainSeen===1);
      });
    } else if(b.progress&&b.progress.length){
      b.progress.forEach(function(mvKey,j){
        inner+=wodPlusProgressExerciseHtml(mvKey,b.kind,j,b.kind==="main" && j===0 && mainSeen===1);
      });
    } else if(!b.text){
      inner+="<div class='wodplus-text'>"+cleanLine(displayChargeText(b.text||""))+"</div>";
    }
    div.innerHTML=inner;
    c.appendChild(div);
    setupTutorialButtons(div);
    setupLoadInfoButtons(div);
  });

  if(pa){
    var canNext=state.week<totalWeeks();
    pa.classList.add("wodplus-actions");
    pa.innerHTML=
      wodPlusStartButtonHtml("bottom")+
      '<button type="button" id="markMissedBtn" class="btn-ghost wodplus-secondary-action">Marquer '+dayLabel(state.day)+' comme manqué</button>'+ 
      (canNext?' <button type="button" id="manualAdvanceWeekBtn" class="btn-ghost wodplus-secondary-action">Passer à S'+(state.week+1)+'</button>':'');
    var mb=document.getElementById("markMissedBtn"); if(mb)mb.onclick=requestMarkCurrentDayMissed;
    var aw=document.getElementById("manualAdvanceWeekBtn"); if(aw)aw.onclick=requestAdvanceWeek;
  }
  setupWodPlusActions(document);
}

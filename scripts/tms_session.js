// Coach Beurt TMS libre indépendant
// Module utilitaire : ne modifie pas le cycle, l'historique, athlete_state ni les programmes.

(function(){
  var tmsState = { session:null, index:0, wakeLockAuto:false, returnToWodPlus:false, returnView:"training" };

  var sessions = {
    full: {
      title: "TMS complet",
      subtitle: "Renforcement TMS full body · 30-40 min",
      blocks: [
        {
          tag:"BLOC 1",
          time:"8 min",
          title:"Lying Leg Raise / Elephant Walk",
          note:"3-4 rounds · 30 sec travail / 15 sec repos",
          steps:[
            "Lying Leg Raise — jambe droite",
            "Lying Leg Raise — jambe gauche",
            "Elephant Walk en appui"
          ]
        },
        {
          tag:"BLOC 1",
          time:"8 min",
          title:"Butterfly Adductor / Cossack Squat",
          note:"2-4 rounds",
          steps:[
            "5 reps Butterfly Adductor — 3 à 5 sec de contraction par rep",
            "10 reps Cossack Squat — rester en bas autant que possible"
          ]
        },
        {
          tag:"BLOC 2",
          time:"7 min",
          title:"Active Pigeon / Psoas actif",
          note:"3 rounds · 25 sec travail / 10 sec repos",
          steps:[
            "Pigeon Pose — jambe droite",
            "Pigeon Pose — jambe gauche",
            "Psoas Stretch — jambe droite",
            "Psoas Stretch — jambe gauche"
          ],
          footer:"Quand tu peux tenir 30 sec en tension, fessier actif et genou qui pousse, tu peux lester."
        },
        {
          tag:"BLOC 2",
          time:"8 min",
          title:"Good Morning to Jefferson Curl / Cyclist Squat",
          note:"3-4 rounds",
          steps:[
            "3 reps Good Morning to Jefferson Curl",
            "8 reps Cyclist Squat"
          ]
        },
        {
          tag:"BLOC 3",
          time:"8 min",
          title:"Overhead Banded Push / PVC Lats Opener",
          note:"2-4 rounds",
          steps:[
            "3 reps O/H Banded Press — bras droit",
            "3 reps O/H Banded Press — bras gauche",
            "3 reps PVC Lats Opener — 3 à 5 sec contraction par rep"
          ]
        },
        {
          tag:"BLOC 3",
          time:"8 min",
          title:"Y Raise / Active pecs-psoas stretch",
          note:"3-4 rounds",
          steps:[
            "6-8 Y Raise",
            "30 sec Active pecs / psoas stretch en fente avant — côté droit",
            "30 sec Active pecs / psoas stretch en fente avant — côté gauche"
          ]
        }
      ]
    },
    morning: {
      title: "Routine matin/soir",
      subtitle: "Mobilité régulière · repos libres",
      blocks: [
        {
          tag:"ROUTINE",
          time:"7 min",
          title:"Lying Leg Raise / Elephant Walk",
          note:"3 rounds",
          steps:[
            "6 contractions Elephant Walk en appui",
            "12 Lying Leg Raise — alterner les jambes",
            "Après les 3 tours : ajouter 6 contractions Elephant Walk"
          ]
        },
        {
          tag:"ROUTINE",
          time:"6 min",
          title:"Butterfly Adductor Hold / Pigeon Pose",
          note:"3-4 rounds · 30 sec par exercice",
          steps:[
            "Butterfly Adductor Hold — 30 sec",
            "Pigeon Pose Stretch mains en appui — 30 sec"
          ]
        },
        {
          tag:"ROUTINE",
          time:"6 min",
          title:"Couch Stretch",
          note:"3 rounds · 30 sec par jambe",
          steps:[
            "Couch Stretch jambe droite — actif, la jambe pousse dans le mur",
            "Couch Stretch jambe gauche — actif, la jambe pousse dans le mur",
            "3e série en détente — pas de contraction"
          ]
        },
        {
          tag:"ROUTINE",
          time:"6 min",
          title:"PVC Lats Opener / Pecs-Psoas Stretch",
          note:"2-4 rounds · repos libres",
          steps:[
            "30 sec Lats Opener Hold — passif, respiration profonde",
            "30 sec Pecs / Psoas Stretch en fente avant — jambe droite",
            "30 sec Pecs / Psoas Stretch en fente avant — jambe gauche"
          ],
          footer:"Étirements en fente avant passifs. Respiration calme et profonde."
        }
      ]
    }
  };

  function $(id){ return document.getElementById(id); }
  function esc(v){
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function detectActiveView(){
    var pairs = [
      ["training", "trainingView"],
      ["pc", "pcView"],
      ["session", "sessionView"],
      ["results", "resultsView"],
      ["cycle", "cycleView"],
      ["history", "historyView"],
      ["settings", "settingsView"],
      ["profile", "profileView"],
      ["references", "referencesView"],
      ["backup", "backupView"]
    ];
    for(var i=0;i<pairs.length;i++){
      var el = $(pairs[i][1]);
      if(el && el.classList && el.classList.contains("view-active")) return pairs[i][0];
    }
    var legacyPc = $("phoneView");
    if(legacyPc && legacyPc.classList && legacyPc.classList.contains("view-active")) return "pc";
    return "training";
  }

  function ensureTmsSessionHost(){
    if(typeof ensurePcViewHost === "function") ensurePcViewHost();

    var guided = $("guidedSession");
    if(!guided) return null;

    var view = $("sessionView");
    if(!view){
      view = document.createElement("main");
      view.id = "sessionView";
      view.className = "session-view";
      var pcView = $("pcView") || $("phoneView");
      var parent = pcView && pcView.parentNode ? pcView.parentNode : document.querySelector(".app");
      var before = pcView && pcView.nextSibling ? pcView.nextSibling : $("resultsView");
      if(parent) parent.insertBefore(view, before || null);
    }

    if(guided.parentNode !== view){
      view.appendChild(guided);
    }
    return view;
  }

  function showTmsHost(){
    ensureTmsSessionHost();
    if(typeof switchView === "function") switchView("session");
    document.body.classList.add("guided-session-active");
    document.body.classList.remove("guided-results-active");
    var el = $("guidedSession");
    if(el) el.classList.remove("hidden");
  }

  function openTmsChoice(options){
    options = (options && !options.type) ? options : {};
    if(!options.keepReturnView){
      tmsState.returnView = options.returnView || detectActiveView() || "training";
    }
    tmsState.returnToWodPlus = !!options.fromWodPlus;
    showTmsHost();
    var el = $("guidedSession");
    if(!el) return;
    if(typeof resumeAudio === "function") resumeAudio();

    el.innerHTML =
      "<div class='guided-top'>" +
        "<button class='tb-btn' id='tmsCloseBtn'>✕</button>" +
        "<div class='guided-top-title'>TMS · mobilité régulière</div>" +
        "<div class='guided-count'>Libre</div>" +
      "</div>" +
      "<div class='guided-card kind-mobility'>" +
        "<div class='guided-tag'>OUTIL · sans suivi</div>" +
        "<div class='guided-title'>Choisir la séance TMS</div>" +
        "<div class='guided-note big'>Ces routines ne changent pas ton cycle, ta semaine, ton historique ou athlete_state.</div>" +
        "<div class='guided-actions' style='margin-top:18px'>" +
          "<button class='guided-btn primary' id='tmsFullBtn'>TMS complet<br><span style='font-size:12px;color:var(--muted)'>3 blocs · 30-40 min</span></button>" +
          "<button class='guided-btn primary' id='tmsMorningBtn'>Routine matin/soir<br><span style='font-size:12px;color:var(--muted)'>mobilité régulière</span></button>" +
        "</div>" +
      "</div>";
    el.classList.remove("hidden");

    $("tmsCloseBtn").onclick = closeTms;
    $("tmsFullBtn").onclick = function(){ startTms("full"); };
    $("tmsMorningBtn").onclick = function(){ startTms("morning"); };
  }

  function startTms(key){
    tmsState.session = sessions[key];
    tmsState.index = 0;

    if(typeof wakeLockWanted !== "undefined"){
      tmsState.wakeLockAuto = !wakeLockWanted;
    } else {
      tmsState.wakeLockAuto = true;
    }
    if(typeof requestWakeLock === "function") requestWakeLock();

    renderTms();
  }

  function closeTms(){
    var el = $("guidedSession");
    if(el){
      el.classList.add("hidden");
      el.innerHTML = "";
    }
    if(tmsState.wakeLockAuto && typeof releaseWakeLock === "function") releaseWakeLock();
    var returnToWodPlus = !!tmsState.returnToWodPlus;
    var returnView = returnToWodPlus ? "training" : (tmsState.returnView || "training");
    tmsState.session = null;
    tmsState.index = 0;
    tmsState.wakeLockAuto = false;
    tmsState.returnToWodPlus = false;
    tmsState.returnView = "training";
    document.body.classList.remove("guided-session-active");
    document.body.classList.remove("guided-results-active");
    if(typeof switchView === "function") switchView(returnView);
  }

  function renderTms(){
    var el = $("guidedSession");
    var s = tmsState.session;
    if(!el || !s) return;

    var i = tmsState.index;
    var b = s.blocks[i];
    var pct = Math.round(((i+1)/s.blocks.length)*100);
    var isFirst = i === 0;
    var isLast = i === s.blocks.length - 1;

    var stepsHtml = "<div class='guided-step-list kind-mobility'>";
    b.steps.forEach(function(step, idx){
      stepsHtml +=
        "<div class='guided-step-card'>" +
          "<div class='guided-step-num'>" + (idx+1) + "</div>" +
          "<div class='guided-step-body'>" +
            "<div class='guided-step-name'><span>" + esc(step) + "</span></div>" +
          "</div>" +
        "</div>";
    });
    stepsHtml += "</div>";

    el.innerHTML =
      "<div class='guided-top'>" +
        "<button class='tb-btn' id='tmsCloseBtn'>✕</button>" +
        "<div class='guided-top-title'>" + esc(s.title) + "</div>" +
        "<div class='guided-top-right'><div id='guidedLiveClock' class='guided-live-clock' aria-label='Heure actuelle'></div><div class='guided-count'>" + (i+1) + "/" + s.blocks.length + "</div></div>" +
      "</div>" +
      "<div class='guided-progress'><div style='width:" + pct + "%'></div></div>" +
      "<div class='guided-card kind-mobility'>" +
        "<div class='guided-tag'>" + esc(b.tag) + " · " + esc(b.time) + "</div>" +
        "<div class='guided-title'>" + esc(b.title) + "</div>" +
        "<div class='guided-note compact'>" + esc(b.note || "") + "</div>" +
        stepsHtml +
        (b.footer ? "<div class='guided-note compact'>" + esc(b.footer) + "</div>" : "") +
      "</div>" +
      "<div class='guided-actions'>" +
        "<button class='guided-btn' id='tmsPrevBtn' " + (isFirst ? "disabled" : "") + ">← Précédent</button>" +
        "<button class='guided-btn primary' id='tmsNextBtn'>" + (isLast ? "Terminer" : "Bloc suivant →") + "</button>" +
      "</div>" +
      "<div class='guided-subactions'>" +
        "<button class='guided-link' id='tmsChoiceBtn'>Changer de routine TMS</button>" +
      "</div>";

    el.classList.remove("hidden");
    if(typeof updateGlobalClock === "function") updateGlobalClock();

    $("tmsCloseBtn").onclick = closeTms;
    $("tmsPrevBtn").onclick = function(){
      if(tmsState.index > 0){ tmsState.index--; renderTms(); }
    };
    $("tmsNextBtn").onclick = function(){
      if(isLast) closeTms();
      else { tmsState.index++; renderTms(); }
    };
    $("tmsChoiceBtn").onclick = function(){
      openTmsChoice({ keepReturnView:true, returnView:tmsState.returnView, fromWodPlus:tmsState.returnToWodPlus });
    };
  }

  function bindTmsButtons(){
    [
      { id:"tmsSessionBtn", options:{} },
      { id:"tmsGlobalBtn", options:{ fromGlobal:true } },
      { id:"wodPlusTmsBtn", options:{ fromWodPlus:true } }
    ].forEach(function(item){
      var btn = $(item.id);
      if(!btn || btn.__tmsBound) return;
      btn.__tmsBound = true;
      btn.onclick = function(){ openTmsChoice(item.options || {}); };
    });
  }

  window.openCoachBeurtTmsChoice = openTmsChoice;
  window.bindCoachBeurtTmsButtons = bindTmsButtons;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bindTmsButtons);
  } else {
    bindTmsButtons();
  }
})();

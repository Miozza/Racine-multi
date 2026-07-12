// Coach Beurt V51.63 — session timer domain
// Timer guidé AMRAP/EMOM/For Time de la vue séance.
// Aucun changement volontaire de comportement : extraction depuis scripts/session/view.js.

var guidedTimer = {duration:0,remaining:0,elapsed:0,running:false,interval:null,mode:"down",label:"",isEmom:false,countdownActive:false,countdownRemaining:10};

// ── Signaux sonores du timer guidé ───────────────────────────────────────────
// Muet = aucun helper audio appelé, donc aucun nœud Web Audio créé (pas un
// volume à zéro) et aucun AudioContext créé/repris. L'état vit dans le state
// du profil actif (state.guidedSoundMuted) : persisté par save(), il survit
// au rechargement et reste isolé par profil.
function guidedSoundMuted(){
  try{ return !!(typeof state==="object" && state && state.guidedSoundMuted); }catch(e){ return false; }
}
function setGuidedSoundMuted(muted){
  if(typeof state!=="object" || !state) return;
  state.guidedSoundMuted = !!muted;
  if(typeof save==="function") save();
  // Réactivation des sons = geste utilisateur : c'est le moment de créer ou
  // reprendre l'AudioContext (contrainte Safari iOS).
  if(!state.guidedSoundMuted && typeof resumeAudio==="function") resumeAudio();
}
function guidedBipCountdown(){ if(!guidedSoundMuted() && typeof bipCountdown==="function") bipCountdown(); }
function guidedBipStart(){ if(!guidedSoundMuted() && typeof bipStart==="function") bipStart(); }
function guidedBipEmom(){ if(!guidedSoundMuted() && typeof bipEmom==="function") bipEmom(); }
function guidedBipEnd(){ if(!guidedSoundMuted() && typeof bipEnd==="function") bipEnd(); }

function resetGuidedTimerState(cfg){
  stopGuidedTimer();
  guidedTimer.duration=Number(cfg&&cfg.seconds)||0;
  guidedTimer.remaining=guidedTimer.duration;
  guidedTimer.elapsed=0;
  guidedTimer.mode=(cfg&&cfg.mode)||"down";
  guidedTimer.label=(cfg&&cfg.label)||"Timer";
  guidedTimer.isEmom=!!(cfg&&cfg.isEmom);
  guidedTimer.countdownActive=false;
  guidedTimer.countdownRemaining=10;
  updateGuidedTimerDisplay();
}
function guidedTimerCurrentValue(){return guidedTimer.mode==="up"?guidedTimer.elapsed:guidedTimer.remaining;}

function guidedEmomMinuteState(){
  if(!guidedTimer || !guidedTimer.isEmom || guidedTimer.countdownActive || !guidedTimer.running) return null;
  var elapsed = guidedTimer.mode==="up" ? guidedTimer.elapsed : (guidedTimer.duration - guidedTimer.remaining);
  if(elapsed < 0) elapsed = 0;

  // Alerte indépendante de la durée totale : chaque minute a son cycle.
  // 30s restantes = bleu clair, 10s = jaune, 3s = rouge, 0s = flash GO.
  var secInMinute = elapsed % 60;

  if(elapsed > 0 && secInMinute === 0) return {cls:"emom-go", label:"GO"};
  var left = 60 - secInMinute;
  if(left <= 3) return {cls:"emom-red", label:String(left)};
  if(left <= 10) return {cls:"emom-yellow", label:"10s"};
  if(left <= 30) return {cls:"emom-blue", label:"30s"};
  return null;
}
function updateGuidedEmomVisualWarning(){
  var d=$("guidedTimerDisplay");
  var box=d ? d.closest(".guided-wod-timer") : null;
  if(!box) return;

  box.classList.remove("emom-blue","emom-yellow","emom-red","emom-go");
  box.removeAttribute("data-emom-warning");

  var st = guidedEmomMinuteState();
  if(!st) return;
  box.classList.add(st.cls);
  box.setAttribute("data-emom-warning", st.label);
}


function formatGuidedTimerClock(sec){
  if(typeof formatTimerDisplay === "function") return formatTimerDisplay(sec);
  sec=Math.max(0,Math.floor(sec||0));
  return String(Math.floor(sec/60))+":"+String(sec%60).padStart(2,"0");
}
function guidedTimerFitSample(text,isCountdown){
  if(typeof timerMeasureSampleForDisplay === "function") return timerMeasureSampleForDisplay(text,isCountdown);
  text=String(text||"");
  if(isCountdown) return text.length>=2 ? "88" : "8";
  var parts=text.split(":");
  var minuteDigits=(parts[0]||"0").length;
  return minuteDigits>=2 ? "88:88" : "8:88";
}

function syncGuidedTimerButtons(){
  var start=$("guidedTimerStart");
  var pause=$("guidedTimerPause");
  var reset=$("guidedTimerReset");

  if(start){
    start.disabled=false;
    start.textContent=guidedTimer.countdownActive ? "..." : "▶";
  }
  if(pause){
    pause.disabled=false;
    pause.textContent="Ⅱ";
  }
  if(reset){
    reset.disabled=false;
  }
}

// RÈGLE VERROUILLÉE — Timer WOD en vue séance.
// Format obligatoire : minutes sans zéro inutile (9:12, 8:00, 0:45, 10:00, 60:00).
// Secondes toujours à 2 chiffres.
// Taille : mesurer un gabarit stable par format (8:88 / 88:88) et viser 95 % de la largeur utile.
// Ne pas revenir à 09:12 / 08:00 / 00:45. Ne pas utiliser une taille fixe.
var guidedTimerMeasureEl = null;
function guidedGetTimerMeasureEl(){
  if(guidedTimerMeasureEl && guidedTimerMeasureEl.parentNode) return guidedTimerMeasureEl;
  guidedTimerMeasureEl = document.createElement("span");
  guidedTimerMeasureEl.setAttribute("aria-hidden","true");
  guidedTimerMeasureEl.style.position="fixed";
  guidedTimerMeasureEl.style.left="-9999px";
  guidedTimerMeasureEl.style.top="-9999px";
  guidedTimerMeasureEl.style.visibility="hidden";
  guidedTimerMeasureEl.style.whiteSpace="nowrap";
  guidedTimerMeasureEl.style.pointerEvents="none";
  document.body.appendChild(guidedTimerMeasureEl);
  return guidedTimerMeasureEl;
}
function guidedMeasureTimerTextDom(text, size, sourceStyle, letterSpacingEm){
  try{
    var m=guidedGetTimerMeasureEl();
    m.textContent=String(text || "00:00");
    m.style.fontFamily=sourceStyle ? sourceStyle.fontFamily : "Orbitron, monospace";
    m.style.fontWeight=sourceStyle ? sourceStyle.fontWeight : "900";
    m.style.fontStyle=sourceStyle ? sourceStyle.fontStyle : "normal";
    m.style.fontStretch=sourceStyle ? sourceStyle.fontStretch : "normal";
    m.style.fontVariantNumeric="tabular-nums";
    m.style.fontSize=String(size)+"px";
    m.style.lineHeight="0.82";
    m.style.letterSpacing=String(letterSpacingEm)+"em";
    var r=m.getBoundingClientRect();
    return {width:r.width || 0, height:r.height || (Number(size)*0.82)};
  }catch(e){
    if(window.CoachLog)CoachLog.warn("guided_timer_measure_failed", {message:e&&e.message?e.message:String(e)});
    return {width:String(text || "00:00").length * Number(size || 100) * 0.62, height:Number(size || 100)*0.82};
  }
}
function fitGuidedWodTimer(){
  var d=$("guidedTimerDisplay");
  if(!d) return;
  var card=d.closest && d.closest(".guided-card.kind-wod");
  if(!card) return;
  var box=d.closest(".guided-wod-timer");
  if(!box) return;

  // Ne pas reflow pendant un pinch zoom Safari : on garde le zoom natif.
  if(typeof guidedViewportScale === "function" && guidedViewportScale()>1.02) return;

  var boxStyle=window.getComputedStyle ? window.getComputedStyle(box) : null;
  var displayStyle=window.getComputedStyle ? window.getComputedStyle(d) : null;
  var padLeft=boxStyle ? parseFloat(boxStyle.paddingLeft)||0 : 0;
  var padRight=boxStyle ? parseFloat(boxStyle.paddingRight)||0 : 0;
  var boxRect=box.getBoundingClientRect ? box.getBoundingClientRect() : {width:box.clientWidth||0,height:box.clientHeight||0,top:0};
  var widthBase=Math.max(180, Math.floor((boxRect.width || box.clientWidth || 0) - padLeft - padRight));
  var targetWidth=Math.max(170, Math.floor(widthBase * 0.95));

  // Hauteur utilisable : on autorise le timer à manger l'espace vide au-dessus de sa boîte,
  // sans empiéter sur les boutons internes. C'est ce qui manquait aux versions précédentes.
  var label=box.querySelector ? box.querySelector(".guided-timer-label") : null;
  var buttons=box.querySelector ? box.querySelector(".guided-timer-buttons") : null;
  var prev=box.previousElementSibling;
  var labelH=label && label.getBoundingClientRect ? label.getBoundingClientRect().height : 0;
  var buttonsH=buttons && buttons.getBoundingClientRect ? buttons.getBoundingClientRect().height : 0;
  var gapAbove=0;
  try{
    if(prev && prev.getBoundingClientRect){
      gapAbove=Math.max(0, boxRect.top - prev.getBoundingClientRect().bottom);
    }
  }catch(e){}
  var currentDisplayH=d.getBoundingClientRect ? d.getBoundingClientRect().height : 0;
  var targetHeight=Math.max(72, Math.floor((currentDisplayH + gapAbove*0.86) * 0.95));
  // Plafond doux basé sur la carte pour éviter que le timer avale le WOD complet sur petit écran.
  var cardRect=card.getBoundingClientRect ? card.getBoundingClientRect() : {height:0};
  if(cardRect && cardRect.height){
    targetHeight=Math.min(targetHeight, Math.floor(cardRect.height * 0.34));
  }

  var isCountdown=d.classList.contains("countdown");
  var text=String(d.textContent || (isCountdown ? "10" : "0:00"));
  var measureText=guidedTimerFitSample(text,isCountdown);
  var letterSpacingEm=-0.055;
  var minSize=isCountdown ? 84 : 78;
  var maxSize=isCountdown ? 260 : 240;
  var low=minSize;
  var high=maxSize;
  var i, mid, measured;

  for(i=0;i<18;i++){
    mid=(low+high)/2;
    measured=guidedMeasureTimerTextDom(measureText, mid, displayStyle, letterSpacingEm);
    if(measured.width<=targetWidth && measured.height<=targetHeight) low=mid; else high=mid;
  }

  var size=Math.floor(low);
  d.style.setProperty("box-sizing","border-box","important");
  d.style.setProperty("display","block","important");
  d.style.setProperty("width","100%","important");
  d.style.setProperty("max-width","100%","important");
  d.style.setProperty("overflow","visible","important");
  d.style.setProperty("white-space","nowrap","important");
  d.style.setProperty("text-align","center","important");
  d.style.setProperty("letter-spacing",(letterSpacingEm)+"em","important");
  d.style.setProperty("font-size",size+"px","important");
  d.style.setProperty("line-height","0.82","important");
}
function refitGuidedWodTimerSoon(){
  requestAnimationFrame(function(){
    fitGuidedWodTimer();
    setTimeout(fitGuidedWodTimer,80);
    setTimeout(fitGuidedWodTimer,260);
  });
}
if(typeof window!=="undefined"){
  window.addEventListener("resize", refitGuidedWodTimerSoon);
  window.addEventListener("orientationchange", refitGuidedWodTimerSoon);
  if(document && document.fonts && document.fonts.ready){
    document.fonts.ready.then(refitGuidedWodTimerSoon).catch(function(){});
  }
}
function updateGuidedTimerDisplay(){
  var d=$("guidedTimerDisplay"); if(!d)return;
  if(guidedTimer.countdownActive){
    d.textContent=String(guidedTimer.countdownRemaining);
    d.classList.add("countdown");
  } else {
    d.textContent=formatGuidedTimerClock(guidedTimerCurrentValue());
    d.classList.remove("countdown");
  }
  updateGuidedEmomVisualWarning();
  syncGuidedTimerButtons();
  refitGuidedWodTimerSoon();
}
function stopGuidedTimer(){
  if(guidedTimer.interval){clearInterval(guidedTimer.interval);guidedTimer.interval=null;}
  guidedTimer.running=false;
  guidedTimer.countdownActive=false;
  syncGuidedTimerButtons();
  updateGuidedEmomVisualWarning();
}
function startGuidedTimerCountdown(onDone){
  stopGuidedTimer();
  guidedTimer.countdownActive=true;
  guidedTimer.countdownRemaining=10;
  updateGuidedTimerDisplay();
  guidedTimer.interval=setInterval(function(){
    guidedTimer.countdownRemaining--;
    if(guidedTimer.countdownRemaining<=3&&guidedTimer.countdownRemaining>0){guidedBipCountdown();vibrate([60]);}
    if(guidedTimer.countdownRemaining<=0){
      clearInterval(guidedTimer.interval);
      guidedTimer.interval=null;
      guidedTimer.countdownActive=false;
      guidedBipStart();vibrate([200,80,200]);
      onDone();
    }
    updateGuidedTimerDisplay();
  },1000);
}
function startGuidedTimer(){
  // Geste utilisateur (tap ▶) : seul endroit légitime pour créer/reprendre
  // l'AudioContext. En muet, on n'en crée aucun.
  if(!guidedSoundMuted())resumeAudio();
  if(guidedTimer.running||guidedTimer.countdownActive)return;
  startGuidedTimerCountdown(function(){
    guidedTimer.running=true;
    syncGuidedTimerButtons();
    guidedTimer.interval=setInterval(function(){
      if(guidedTimer.mode==="up"){
        guidedTimer.elapsed=Math.min(guidedTimer.duration,guidedTimer.elapsed+1);
        if(guidedTimer.isEmom&&guidedTimer.elapsed>0&&guidedTimer.elapsed%60===0){guidedBipEmom();vibrate([100,50,100]);}
        if(guidedTimer.elapsed>=guidedTimer.duration){stopGuidedTimer();guidedBipEnd();vibrate([300,100,300,100,300]);}
      } else {
        guidedTimer.remaining=Math.max(0,guidedTimer.remaining-1);
        if(guidedTimer.remaining<=3&&guidedTimer.remaining>0){guidedBipCountdown();vibrate([60]);}
        if(guidedTimer.isEmom&&guidedTimer.remaining>0&&guidedTimer.remaining%60===0){guidedBipEmom();vibrate([100,50,100]);}
        if(guidedTimer.remaining<=0){stopGuidedTimer();guidedBipEnd();vibrate([300,100,300,100,300]);}
      }
      updateGuidedTimerDisplay();
    },1000);
  });
}
function pauseGuidedTimer(){stopGuidedTimer();updateGuidedTimerDisplay();}

// Coach Beurt V51.63 — session timer domain
// Timer guidé AMRAP/EMOM/For Time de la vue séance.
// Aucun changement volontaire de comportement : extraction depuis scripts/session/view.js.

var guidedTimer = {duration:0,remaining:0,elapsed:0,running:false,interval:null,mode:"down",label:"",isEmom:false,intervalSec:60,countdownActive:false,countdownRemaining:10};

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

// ── Timer éditable — durée, intervalle de bips, sens ─────────────────────────
// L'athlète ajuste le timer du WOD sur le terrain (WOD raccourci, EMOM en 90s,
// cap qui devient chrono). L'édition vit dans l'objet `cfg` du bloc
// (`guidedSessionState.blocks[i].timer`) : elle survit à la navigation entre
// blocs et meurt avec la séance. Aucun programme n'est réécrit, aucune clé de
// stockage n'est créée — le programme reste la référence, récupérable par
// « Rétablir ».
var GUIDED_TIMER_MIN_SECONDS = 30;
var GUIDED_TIMER_MAX_SECONDS = 120 * 60;
var GUIDED_TIMER_INTERVALS = [15,20,30,45,60,75,90,120,150,180,240,300];

function guidedTimerNormalizeConfig(cfg){
  if(!cfg || typeof cfg!=="object") return cfg;
  if(cfg.baseSeconds===undefined) cfg.baseSeconds=Number(cfg.seconds)||0;
  if(cfg.baseMode===undefined) cfg.baseMode=cfg.mode||"down";
  if(cfg.baseLabel===undefined) cfg.baseLabel=cfg.label||"Timer";
  if(cfg.baseIsEmom===undefined) cfg.baseIsEmom=!!cfg.isEmom;
  if(cfg.baseIntervalSec===undefined) cfg.baseIntervalSec=60;
  if(cfg.intervalSec===undefined) cfg.intervalSec=cfg.baseIntervalSec;
  return cfg;
}
function guidedTimerClampSeconds(sec){
  sec=Math.round(Number(sec)||0);
  if(sec<GUIDED_TIMER_MIN_SECONDS) sec=GUIDED_TIMER_MIN_SECONDS;
  if(sec>GUIDED_TIMER_MAX_SECONDS) sec=GUIDED_TIMER_MAX_SECONDS;
  return sec;
}
function guidedTimerStepInterval(current, step){
  var list=GUIDED_TIMER_INTERVALS;
  var cur=Number(current)||60;
  var idx=0, best=Infinity, i, d;
  for(i=0;i<list.length;i++){
    d=Math.abs(list[i]-cur);
    if(d<best){best=d;idx=i;}
  }
  idx=Math.min(list.length-1, Math.max(0, idx+(step>0?1:-1)));
  return list[idx];
}
function guidedTimerDurationText(sec){
  sec=Math.max(0,Math.round(Number(sec)||0));
  return sec%60===0 ? String(sec/60)+" min" : formatGuidedTimerClock(sec);
}
function guidedTimerIntervalText(sec){
  sec=Math.max(0,Math.round(Number(sec)||0));
  return sec<60 ? String(sec)+"s" : formatGuidedTimerClock(sec);
}
// Le mot de tête du programme (AMRAP / EMOM / CAP / Timer) est conservé ;
// seule la durée suit l'édition. Un WOD raccourci ne doit pas continuer
// d'annoncer « AMRAP 12 min ».
function guidedTimerLabelFor(cfg){
  if(!cfg) return "Timer";
  var base=String(cfg.baseLabel||cfg.label||"Timer").trim();
  var head=base.split(/\s+/)[0]||"Timer";
  return head+" "+guidedTimerDurationText(cfg.seconds);
}
function guidedTimerEmomSuffix(cfg){
  if(!cfg || !cfg.isEmom) return "";
  return " · bip/"+guidedTimerIntervalText(cfg.intervalSec||60);
}
function guidedTimerIsEdited(cfg){
  if(!cfg) return false;
  guidedTimerNormalizeConfig(cfg);
  return (Number(cfg.seconds)||0)!==(Number(cfg.baseSeconds)||0)
      || (cfg.mode||"down")!==(cfg.baseMode||"down")
      || !!cfg.isEmom!==!!cfg.baseIsEmom
      || (Number(cfg.intervalSec)||60)!==(Number(cfg.baseIntervalSec)||60);
}
function guidedTimerIntervalTick(){
  if(!guidedTimer.isEmom) return;
  var interval=guidedTimerIntervalSeconds();
  var elapsed=guidedTimerElapsedSeconds();
  // Pas de bip d'intervalle sur le dernier tic : la fin a déjà son signal.
  if(elapsed>0 && elapsed<guidedTimer.duration && elapsed%interval===0){
    guidedBipEmom();vibrate([100,50,100]);
  }
}

function resetGuidedTimerState(cfg){
  stopGuidedTimer();
  guidedTimerNormalizeConfig(cfg);
  guidedTimer.duration=Number(cfg&&cfg.seconds)||0;
  guidedTimer.remaining=guidedTimer.duration;
  guidedTimer.elapsed=0;
  guidedTimer.mode=(cfg&&cfg.mode)||"down";
  guidedTimer.label=(cfg&&cfg.label)||"Timer";
  guidedTimer.isEmom=!!(cfg&&cfg.isEmom);
  guidedTimer.intervalSec=Number(cfg&&cfg.intervalSec)||60;
  guidedTimer.countdownActive=false;
  guidedTimer.countdownRemaining=10;
  updateGuidedTimerDisplay();
}
function guidedTimerCurrentValue(){return guidedTimer.mode==="up"?guidedTimer.elapsed:guidedTimer.remaining;}
function guidedTimerIntervalSeconds(){
  var v=Number(guidedTimer&&guidedTimer.intervalSec)||60;
  return v>0 ? v : 60;
}
// Secondes écoulées depuis le départ, quel que soit le sens d'affichage.
// Les bips d'intervalle s'y accrochent : en décompte, se caler sur `remaining`
// décalait tous les bips quand la durée n'était pas un multiple de l'intervalle.
function guidedTimerElapsedSeconds(){
  var elapsed = guidedTimer.mode==="up" ? guidedTimer.elapsed : (guidedTimer.duration - guidedTimer.remaining);
  return elapsed>0 ? elapsed : 0;
}

function guidedEmomMinuteState(){
  if(!guidedTimer || !guidedTimer.isEmom || guidedTimer.countdownActive || !guidedTimer.running) return null;
  var elapsed = guidedTimerElapsedSeconds();
  var interval = guidedTimerIntervalSeconds();

  // Alerte indépendante de la durée totale : chaque intervalle a son cycle.
  // Sur un intervalle d'une minute : 30s restantes = bleu clair, 10s = jaune,
  // 3s = rouge, 0s = flash GO. Sur un intervalle court, les paliers se
  // resserrent pour ne pas peindre tout le cycle en bleu.
  var secInCycle = elapsed % interval;
  var yellowAt = interval>=30 ? 10 : 5;
  var blueAt = interval>=60 ? 30 : Math.floor(interval/2);

  if(elapsed > 0 && secInCycle === 0) return {cls:"emom-go", label:"GO"};
  var left = interval - secInCycle;
  if(left <= 3) return {cls:"emom-red", label:String(left)};
  if(left <= yellowAt) return {cls:"emom-yellow", label:String(yellowAt)+"s"};
  if(left <= blueAt && blueAt > yellowAt) return {cls:"emom-blue", label:String(blueAt)+"s"};
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
// Largeur réelle de chaque chiffre dans la police du timer. Dans Orbitron, un
// « 1 » fait moins de la moitié d'un « 8 » (36 px contre 83 px à 107 px de
// police) : mesurer « 88:88 » pour afficher « 11:00 » calibrait le chrono sur
// une largeur qu'il n'atteindrait jamais, soit 15 % de taille perdus sur tout
// timer de 10 à 19 minutes.
// Mesuré en dix exemplaires pour diluer l'arrondi, à taille de référence — seul
// le classement compte, il ne dépend pas de la taille finale.
var GUIDED_DIGIT_PROBE_SIZE = 100;
var guidedDigitWidths = null;
var guidedDigitWidthProbe = 0;
function guidedTimerDigitWidths(style){
  // La police peut arriver après le premier rendu (document.fonts) : on
  // re-mesure quand la largeur témoin bouge, sans dépendre d'un évènement.
  var probe = guidedMeasureTimerTextDom("8888888888", GUIDED_DIGIT_PROBE_SIZE, style, -0.055).width;
  if(!(probe > 0)) return null;
  if(guidedDigitWidths && Math.abs(probe - guidedDigitWidthProbe) < 1) return guidedDigitWidths;
  var w = {}, i, c, ok = true;
  for(i=0;i<10;i++){
    c = String(i);
    w[c] = guidedMeasureTimerTextDom(new Array(11).join(c), GUIDED_DIGIT_PROBE_SIZE, style, -0.055).width;
    if(!(w[c] > 0)) ok = false;
  }
  if(!ok) return null;
  guidedDigitWidths = w;
  guidedDigitWidthProbe = probe;
  return w;
}
function guidedTimerWidestDigit(style){
  var w = guidedTimerDigitWidths(style);
  if(!w) return null;
  return function(digits){
    digits = String(digits || "8");
    var best = digits.charAt(0) || "8", i;
    for(i=1;i<digits.length;i++){
      if((w[digits.charAt(i)]||0) > (w[best]||0)) best = digits.charAt(i);
    }
    return best;
  };
}
function guidedTimerFitSample(text,isCountdown,style){
  var opts = { maxMinutes: Math.floor((Number(guidedTimer.duration)||0)/60) };
  var widest = style ? guidedTimerWidestDigit(style) : null;
  // Sans mesure fiable (police pas encore chargée), repli sur l'ancien gabarit.
  if(widest) opts.widestDigit = widest;
  if(typeof timerMeasureSampleForDisplay === "function") return timerMeasureSampleForDisplay(text,isCountdown,opts);
  text=String(text||"");
  if(isCountdown) return text.length>=2 ? "88" : "8";
  var parts=text.split(":");
  var minuteDigits=(parts[0]||"0").length;
  return minuteDigits>=2 ? "88:88" : "8:88";
}

// Chaque caractère du chrono peut recevoir sa propre boîte. Mesuré dans Orbitron
// à 120 px : les chiffres larges (0 2 3 5 6 8 9) portent 6 à 9 px d'approche de
// chaque côté, mais « 1 », « 4 » et « 7 » n'en ont AUCUNE à gauche — leur encre
// démarre au bord de leur chasse. Avec l'interlettrage négatif du chrono, ils se
// collent au caractère précédent : « 11 » se chevauchait de 6 px, « 21 » se lisait
// comme un seul bloc, et les deux-points disparaissaient dans la barre du 1
// (« 1:00 » → « 100 », soit toute la dernière minute de chaque WOD).
// On leur rend l'approche qui leur manque, glyphe par glyphe — jamais par paire :
// ça reste plus étroit que le gabarit (un « 1 » margé fait 61 px contre 100 pour
// un « 0 »), donc le chrono ne peut pas déborder. Les marges sont mesurées avec
// le reste : guidedMeasureTimerTextDom pose exactement le même balisage.
var GUIDED_TIMER_GLYPH_CLASS = {"1":"guided-timer-n1","4":"guided-timer-n4","7":"guided-timer-n7",":":"guided-timer-colon"};
function guidedTimerClockHtml(text){
  text=String(text==null?"":text);
  var out="", i, c, cls;
  for(i=0;i<text.length;i++){
    c=text.charAt(i);
    cls=GUIDED_TIMER_GLYPH_CLASS[c];
    out += cls ? ("<span class='"+cls+"'>"+guidedTimerEsc(c)+"</span>") : guidedTimerEsc(c);
  }
  return out;
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
// Taille : mesurer un GABARIT — le plus large affichage qui peut réellement
// apparaître dans ce timer (voir guidedTimerFitSample) — et viser 95 % de la
// largeur utile. Jamais la forme exacte des chiffres affichés : la taille doit
// rester stable pendant toute une phase de format, pas changer à chaque seconde.
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
    // Même balisage que l'affichage réel (deux-points dans leur propre boîte),
    // sinon la mesure ignorerait leur marge et le chrono déborderait.
    m.innerHTML=guidedTimerClockHtml(String(text || "00:00"));
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

  // Repartir SANS étirement avant toute mesure : l'étirement vertical posé à la
  // passe précédente a comblé l'espace libre, donc le mesurer tel quel ferait
  // retomber le calcul à 1 dès la deuxième passe. Reset + reflow = fonction
  // idempotente, deux appels de suite donnent le même résultat.
  guidedResetTimerStretch(d);

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
  var measureText=guidedTimerFitSample(text,isCountdown,displayStyle);
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
  // Les chiffres débordent visuellement leur boîte (line-height serré, puis
  // étirement vertical) : sans ça, ce débordement vide capterait les taps
  // destinés au libellé, aux mouvements ou aux boutons. L'affichage n'a aucun
  // contenu interactif, il n'a donc rien à recevoir.
  d.style.setProperty("pointer-events","none","important");
  d.style.setProperty("letter-spacing",(letterSpacingEm)+"em","important");
  d.style.setProperty("font-size",size+"px","important");
  d.style.setProperty("line-height",String(GUIDED_TIMER_LINE_HEIGHT),"important");
  // Taille issue de la largeur : c'est elle que guidedResetTimerStretch() doit
  // restaurer avant de mesurer, sinon la passe suivante mesurerait la police
  // déjà étirée et l'étirement s'emballerait.
  d.setAttribute("data-fit-size", String(size));

  guidedStretchTimerToFreeHeight(d, box, prev, size);
}

// ── Occupation de la hauteur libre ──────────────────────────────────────────
// La largeur reste la contrainte qui fixe la taille de police (règle verrouillée) :
// une chaîne de 5 caractères sur 402 px d'écran ne peut pas dépasser ~100 px de
// haut sans déformer les glyphes. Tout ce qui reste est de la hauteur vide — et
// comme la carte timer est collée en bas (margin-top:auto), cet espace libre est
// entièrement au-dessus d'elle. Les chiffres l'occupent en s'étirant en hauteur.
//
// Mécanique : scaleY sur les chiffres + hauteur de ligne multipliée d'autant,
// pour que la boîte de mise en page grandisse exactement comme eux (l'encre d'un
// chiffre fait 0.72em pour une ligne de 0.82em : elle reste dedans). La police,
// elle, ne bouge pas — c'est la largeur qui l'a fixée.
// Variante écartée : agrandir la police puis compresser par scaleX. Le texte
// déborde alors très largement sa boîte avant transformation, et `text-align`
// ne le recentre pas — les chiffres partaient hors écran à droite.
// Le rectangle visuel d'un élément transformé vaut k fois sa boîte : il déborde
// donc en haut et en bas. C'est du vide, mais ça capterait le tap ; d'où
// `pointer-events:none` sur l'affichage, qui n'a aucun contenu interactif.
var GUIDED_TIMER_LINE_HEIGHT = 0.82;
var GUIDED_TIMER_MAX_STRETCH = 3.5;   // garde-fou, pas une cible
var GUIDED_TIMER_STRETCH_MARGIN = 10; // air laissé sous les mouvements
function guidedResetTimerStretch(d){
  if(!d || !d.style) return;
  var base=Number(d.getAttribute("data-fit-size"))||0;
  if(base>0) d.style.setProperty("font-size",base+"px","important");
  d.style.setProperty("line-height",String(GUIDED_TIMER_LINE_HEIGHT),"important");
  d.style.setProperty("transform","none","important");
  // Force le recalcul de la mise en page avant toute mesure.
  void d.offsetHeight;
}
function guidedStretchTimerToFreeHeight(d, box, prev, size){
  if(!d || !box || !(size>0)) return;
  guidedResetTimerStretch(d);
  var naturalH=d.getBoundingClientRect ? d.getBoundingClientRect().height : 0;
  if(!(naturalH>0)) return;

  var free=0;
  try{
    if(prev && prev.getBoundingClientRect && box.getBoundingClientRect){
      free=box.getBoundingClientRect().top - prev.getBoundingClientRect().bottom - GUIDED_TIMER_STRETCH_MARGIN;
    }
  }catch(e){}
  if(!(free>0)) return;

  var stretch=(naturalH+free)/naturalH;
  if(stretch>GUIDED_TIMER_MAX_STRETCH) stretch=GUIDED_TIMER_MAX_STRETCH;
  if(stretch<=1.01) return;

  d.style.setProperty("line-height",String(GUIDED_TIMER_LINE_HEIGHT*stretch),"important");
  d.style.setProperty("transform","scaleY("+stretch.toFixed(4)+")","important");
  d.style.setProperty("transform-origin","center","important");
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
    d.innerHTML=guidedTimerClockHtml(String(guidedTimer.countdownRemaining));
    d.classList.add("countdown");
  } else {
    d.innerHTML=guidedTimerClockHtml(formatGuidedTimerClock(guidedTimerCurrentValue()));
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
        guidedTimerIntervalTick();
        if(guidedTimer.elapsed>=guidedTimer.duration){stopGuidedTimer();guidedBipEnd();vibrate([300,100,300,100,300]);}
      } else {
        guidedTimer.remaining=Math.max(0,guidedTimer.remaining-1);
        if(guidedTimer.remaining<=3&&guidedTimer.remaining>0){guidedBipCountdown();vibrate([60]);}
        guidedTimerIntervalTick();
        if(guidedTimer.remaining<=0){stopGuidedTimer();guidedBipEnd();vibrate([300,100,300,100,300]);}
      }
      updateGuidedTimerDisplay();
    },1000);
  });
}
function pauseGuidedTimer(){stopGuidedTimer();updateGuidedTimerDisplay();}

// ── Rounds AMRAP tapés sur le chrono ────────────────────────────────────────
// Un tap n'importe où sur la carte du chrono (hors boutons) = un round de plus.
// Le chrono ne stocke rien lui-même : il ne fournit que la seconde affichée et
// la durée, le comptage vit dans scripts/session/amrap_rounds.js. Le lien avec
// le WOD courant passe par une clé posée au rendu (view.js), pour que le
// domaine timer n'ait pas à connaître l'index du bloc affiché.
var guidedTimerRoundKey = null;
function setGuidedTimerRoundKey(key){ guidedTimerRoundKey = key || null; }
function clearGuidedTimerRounds(){
  if(!guidedTimerRoundKey || !window.CoachAmrapRounds) return;
  CoachAmrapRounds.reset(guidedTimerRoundKey);
  CoachAmrapRounds.refreshPanel(guidedTimerRoundKey);
}
function guidedTimerRoundTap(){
  if(!guidedTimerRoundKey || !window.CoachAmrapRounds) return null;
  // Pendant le décompte de départ, le WOD n'a pas commencé : aucun round.
  if(guidedTimer.countdownActive) return null;
  var elapsed = guidedTimerElapsedSeconds();
  // Chrono à zéro : rien à chronométrer. Un round de moins d'une seconde
  // n'existe pas, et l'accepter donnerait un split nul qui fausserait le
  // classement rapide/lent de tout le WOD.
  if(!(elapsed > 0)) return null;
  var round = CoachAmrapRounds.tap(guidedTimerRoundKey, elapsed, guidedTimer.duration);
  if(!round) return null;
  // Retour discret : rien à l'écran ne bouge sauf le bandeau, aucun son —
  // le WOD est en cours, l'athlète n'a pas à confirmer quoi que ce soit.
  vibrate([35]);
  CoachAmrapRounds.refreshPanel(guidedTimerRoundKey);
  return round;
}
function guidedTimerRoundUndo(){
  if(!guidedTimerRoundKey || !window.CoachAmrapRounds) return null;
  var removed = CoachAmrapRounds.undo(guidedTimerRoundKey);
  if(removed) vibrate([18, 40, 18]);
  CoachAmrapRounds.refreshPanel(guidedTimerRoundKey);
  return removed;
}

// ── Éditeur de timer — modale terrain ────────────────────────────────────────
// Même coquille que les autres popups (.tuto-modal) : verrou de scroll, fond
// tapable, gros contrôles utilisables fatigué. Le libellé du timer est le
// bouton d'ouverture : aucune rangée de contrôles n'est ajoutée à la carte WOD,
// donc le layout iPhone (timer géant + Start/Pause/Reset + actions de bloc)
// reste intact.
var GUIDED_TIMER_EDITOR_ID = "guidedTimerEditorModal";
var guidedTimerEditorCfg = null;

function guidedTimerEsc(s){
  return typeof escHtml==="function" ? escHtml(s) : String(s==null?"":s);
}
function guidedTimerLabelHtml(cfg){
  guidedTimerNormalizeConfig(cfg);
  return "<span class='guided-timer-label-text'>"
       + guidedTimerEsc((cfg&&cfg.label)||"Timer")
       + guidedTimerEsc(guidedTimerEmomSuffix(cfg))
       + "</span><span class='guided-timer-pencil' aria-hidden='true'>✎</span>";
}

// Toute édition remet le timer à zéro : reprendre un cycle à moitié écoulé sur
// une nouvelle durée n'a pas de sens lisible en plein WOD.
function refreshGuidedTimerCard(cfg){
  if(!cfg) return;
  resetGuidedTimerState(cfg);
  var box=document.querySelector(".guided-wod-timer");
  if(box){
    box.setAttribute("data-duration",String(cfg.seconds||0));
    box.setAttribute("data-mode",cfg.mode||"down");
  }
  var label=box&&box.querySelector ? box.querySelector(".guided-timer-label") : null;
  if(label) label.innerHTML=guidedTimerLabelHtml(cfg);
  var kicker=document.querySelector(".guided-wod-kicker");
  if(kicker) kicker.textContent=(cfg.label||"WOD");
  refitGuidedWodTimerSoon();
}
function applyGuidedTimerEdit(cfg, patch){
  if(!cfg) return;
  guidedTimerNormalizeConfig(cfg);
  patch=patch||{};
  if(patch.deltaSeconds) cfg.seconds=guidedTimerClampSeconds((Number(cfg.seconds)||0)+patch.deltaSeconds);
  if(patch.intervalStep){
    cfg.isEmom=true; // toucher l'intervalle, c'est demander les bips
    cfg.intervalSec=guidedTimerStepInterval(cfg.intervalSec, patch.intervalStep);
  }
  if(patch.toggleEmom) cfg.isEmom=!cfg.isEmom;
  if(patch.mode) cfg.mode=(patch.mode==="up"?"up":"down");
  if(patch.restore){
    cfg.seconds=cfg.baseSeconds;
    cfg.mode=cfg.baseMode;
    cfg.isEmom=cfg.baseIsEmom;
    cfg.intervalSec=cfg.baseIntervalSec;
  }
  cfg.label=guidedTimerLabelFor(cfg);
  refreshGuidedTimerCard(cfg);
  // L'édition remet le chrono à zéro : les rounds déjà tapés se rapportaient à
  // l'ancienne durée, leur temps restant ne veut plus rien dire.
  clearGuidedTimerRounds();
  refreshGuidedTimerEditor();
}

function guidedTimerEditorBodyHtml(cfg){
  guidedTimerNormalizeConfig(cfg);
  var isEmom=!!cfg.isEmom;
  var h="";
  h+="<div class='tuto-topline'>TIMER DU WOD</div>";
  h+="<div class='tuto-title'>"+guidedTimerEsc(cfg.label||"Timer")+"</div>";

  h+="<div class='gte-row'>";
  h+="<div class='gte-label'>Durée</div>";
  h+="<div class='gte-controls dur'>";
  h+="<button type='button' class='gte-btn' data-gte-dur='-300'>−5</button>";
  h+="<button type='button' class='gte-btn' data-gte-dur='-60'>−1</button>";
  h+="<div class='gte-value'>"+guidedTimerEsc(guidedTimerDurationText(cfg.seconds))+"</div>";
  h+="<button type='button' class='gte-btn' data-gte-dur='60'>+1</button>";
  h+="<button type='button' class='gte-btn' data-gte-dur='300'>+5</button>";
  h+="</div></div>";

  h+="<div class='gte-row"+(isEmom?"":" off")+"'>";
  h+="<div class='gte-label'>Bips d'intervalle</div>";
  h+="<div class='gte-controls int'>";
  h+="<button type='button' class='gte-btn' data-gte-int='-1'>−</button>";
  h+="<div class='gte-value'>"+(isEmom?guidedTimerEsc(guidedTimerIntervalText(cfg.intervalSec)):"—")+"</div>";
  h+="<button type='button' class='gte-btn' data-gte-int='1'>+</button>";
  h+="<button type='button' class='gte-btn gte-toggle"+(isEmom?" on":"")+"' data-gte-emom='1' aria-pressed='"+(isEmom?"true":"false")+"'>"+(isEmom?"🔔":"🔕")+"</button>";
  h+="</div></div>";

  h+="<div class='gte-row'>";
  h+="<div class='gte-label'>Sens</div>";
  h+="<div class='gte-chips'>";
  h+="<button type='button' class='gte-chip"+(cfg.mode!=="up"?" active":"")+"' data-gte-mode='down'>Décompte</button>";
  h+="<button type='button' class='gte-chip"+(cfg.mode==="up"?" active":"")+"' data-gte-mode='up'>Chrono</button>";
  h+="</div></div>";

  h+="<div class='gte-hint'>Chaque modification remet le timer à zéro. Le programme n'est pas modifié"
   + (guidedTimerIsEdited(cfg)?" — « Rétablir » remet "+guidedTimerEsc(guidedTimerDurationText(cfg.baseSeconds))+".":".")
   + "</div>";

  h+="<div class='gte-actions'>";
  h+="<button type='button' class='gte-action"+(guidedTimerIsEdited(cfg)?"":" disabled")+"' data-gte-restore='1'>Rétablir</button>";
  h+="<button type='button' class='gte-action primary' data-gte-close='1'>OK</button>";
  h+="</div>";
  return h;
}
function refreshGuidedTimerEditor(){
  var modal=$(GUIDED_TIMER_EDITOR_ID);
  if(!modal || !guidedTimerEditorCfg) return;
  var inner=modal.querySelector(".tuto-modal-inner");
  if(inner) inner.innerHTML=guidedTimerEditorBodyHtml(guidedTimerEditorCfg);
}
function closeGuidedTimerEditor(){
  var modal=$(GUIDED_TIMER_EDITOR_ID);
  guidedTimerEditorCfg=null;
  if(!modal) return;
  modal.classList.remove("visible");
  setTimeout(function(){
    if(modal.parentNode) modal.remove();
    try{ if(typeof unlockBodyScrollForModal==="function") unlockBodyScrollForModal(); }catch(e){}
  },200);
}
function openGuidedTimerEditor(cfg){
  if(!cfg) return;
  guidedTimerNormalizeConfig(cfg);
  var existing=$(GUIDED_TIMER_EDITOR_ID);
  if(existing) existing.remove();

  guidedTimerEditorCfg=cfg;
  var modal=document.createElement("div");
  modal.id=GUIDED_TIMER_EDITOR_ID;
  modal.className="tuto-modal guided-timer-editor";
  modal.innerHTML="<div class='tuto-modal-inner'>"+guidedTimerEditorBodyHtml(cfg)+"</div>";
  modal.addEventListener("click",function(ev){
    var t=ev&&ev.target;
    if(!t||!t.closest) return;
    if(t===modal){ closeGuidedTimerEditor(); return; }
    var btn=t.closest("button");
    if(!btn) return;
    ev.preventDefault();
    if(btn.hasAttribute("data-gte-close")){ closeGuidedTimerEditor(); return; }
    if(btn.hasAttribute("data-gte-restore")){ applyGuidedTimerEdit(guidedTimerEditorCfg,{restore:true}); return; }
    if(btn.hasAttribute("data-gte-dur")){ applyGuidedTimerEdit(guidedTimerEditorCfg,{deltaSeconds:Number(btn.getAttribute("data-gte-dur"))||0}); return; }
    if(btn.hasAttribute("data-gte-int")){ applyGuidedTimerEdit(guidedTimerEditorCfg,{intervalStep:Number(btn.getAttribute("data-gte-int"))||0}); return; }
    if(btn.hasAttribute("data-gte-emom")){ applyGuidedTimerEdit(guidedTimerEditorCfg,{toggleEmom:true}); return; }
    if(btn.hasAttribute("data-gte-mode")){ applyGuidedTimerEdit(guidedTimerEditorCfg,{mode:btn.getAttribute("data-gte-mode")}); return; }
  });
  document.body.appendChild(modal);
  try{ if(typeof lockBodyScrollForModal==="function") lockBodyScrollForModal(); }catch(e){}
  setTimeout(function(){ modal.classList.add("visible"); },20);
}

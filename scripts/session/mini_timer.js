// Racine — mini-chrono de la barre du haut (EMOM hors WOD + minuteur de repos)
//
// POURQUOI CE MODULE
// Un EMOM programmé ailleurs que dans un bloc `kind:"wod"` n'avait aucun
// chrono : `buildGuidedSessionBlocks()` ne construit `obj.timer` que pour les
// WOD, et `wodTimerConfig()` lit `block.text` + `block.time` — or sur ces blocs
// la durée réelle vit dans le `format` de l'exercice (« EMOM 8 : 2 Power
// Clean ») tandis que `block.time` est le créneau du bloc (12 min). Prendre
// `block.time` donnerait un chrono de 12 min pour un EMOM de 8.
//
// POURQUOI DANS LA BARRE DU HAUT
// Ajouter un chrono dans la carte coûterait de la hauteur aux cartes
// d'exercice, donc aux charges, reps, RPE et recommandations de poids
// (`.guided-ex-list` partage la hauteur libre entre les cartes). Le mini-chrono
// prend la place de l'HEURE, déjà présente et déjà à la bonne taille
// (`.guided-live-clock`, deux boîtes `.glc-hm` / `.glc-sec`). Coût en hauteur :
// zéro pixel, sur tous les blocs.
//
// COMMENT ÇA SE LIT
// Un EMOM ne se lit pas comme un AMRAP : ce qui compte est le temps restant
// dans la MINUTE en cours, pas le temps total. Et en action on ne lit pas des
// chiffres — on perçoit une couleur. Les chiffres du coin ne servent qu'à
// vérifier ; l'alerte réelle est la bordure de la carte, peinte par
// `minuteState()` (bleu 30 s → jaune 10 s → rouge 3 s → GO), avec bip et
// vibration. Sans ce couplage, un compteur dans un coin serait inutile.
//
// CE QUE CE MODULE NE FAIT PAS
// - Il ne touche jamais au chrono géant du WOD (`guidedTimer`, `timer.js`) :
//   sur un bloc `kind:"wod"` l'heure reste l'heure. Deux domaines séparés.
// - Il ne crée aucune clé de stockage : il meurt avec la séance.
// - Il ne réécrit aucun programme : la détection lit ce qui est déjà là.
//
// Porte publique : window.CoachMiniTimer
(function(){
  'use strict';

  var MODE_NONE = '';
  var MODE_EMOM = 'emom';
  var MODE_REST = 'rest';

  var COUNTDOWN_SECONDS = 10;   // même départ que le chrono WOD
  var MIN_EMOM_MINUTES  = 1;
  var MAX_EMOM_MINUTES  = 60;

  // Un EMOM se déclare par « EMOM » SUIVI D'UN NOMBRE. Pas par le mot AMRAP :
  // dans le catalogue, « 3×AMRAP propre » désigne une série menée à l'échec,
  // pas un bloc au chrono — 22 supersets d'accessoires et les tests
  // « AMRAP @ 205 lb » de fin de bloc se retrouveraient avec un chrono qu'ils
  // ne veulent pas. Le nombre trouvé ici est la SEULE source de durée.
  var EMOM_RX = /\bEMOM\s*(\d+)/i;

  var st = {
    mode: MODE_NONE,
    key: '',
    duration: 0,      // secondes totales
    intervalSec: 60,  // longueur d'un cycle EMOM
    elapsed: 0,
    running: false,
    countdown: 0,
    interval: null,
    finished: false
  };

  function num(v){ var n = Number(v); return isFinite(n) ? n : 0; }
  function clampMinutes(m){
    m = Math.round(num(m));
    if(m < MIN_EMOM_MINUTES || m > MAX_EMOM_MINUTES) return 0;
    return m;
  }

  // ── Détection ─────────────────────────────────────────────────────────────
  // Un bloc WOD a déjà son chrono géant : il ne passe jamais par ici.
  function detect(block){
    if(!block || typeof block !== 'object') return null;
    if(block.kind === 'wod') return null;

    var src = '', i, list = block.exercises;
    if(list && list.length){
      for(i = 0; i < list.length; i++){
        if(list[i] && EMOM_RX.test(String(list[i].format || ''))){ src = String(list[i].format); break; }
      }
    }
    if(!src && EMOM_RX.test(String(block.text || ''))) src = String(block.text);
    if(!src) return null;

    var minutes = clampMinutes(EMOM_RX.exec(src)[1]);
    if(!minutes) return null;

    return {
      mode: MODE_EMOM,
      minutes: minutes,
      seconds: minutes * 60,
      intervalSec: 60,
      label: 'EMOM ' + minutes + ' min',
      source: src
    };
  }

  // ── Boucle ────────────────────────────────────────────────────────────────
  function clearLoop(){
    if(st.interval && typeof clearInterval === 'function') clearInterval(st.interval);
    st.interval = null;
  }
  function startLoop(){
    clearLoop();
    if(typeof setInterval !== 'function') return;
    st.interval = setInterval(function(){ tick(); }, 1000);
  }

  function bip(fn, pattern){
    try{
      if(typeof guidedSoundMuted === 'function' && guidedSoundMuted()) { /* muet : aucun nœud audio */ }
      else if(typeof fn === 'function') fn();
    }catch(e){}
    try{ if(pattern && typeof vibrate === 'function') vibrate(pattern); }catch(e){}
  }

  // Un tic = une seconde. Exposé pour les garde-fous : la logique se vérifie
  // sans horloge réelle ni DOM.
  function tick(){
    if(st.mode === MODE_NONE) return;

    if(st.countdown > 0){
      st.countdown--;
      if(st.countdown > 0 && st.countdown <= 3) bip(typeof bipCountdown === 'function' ? bipCountdown : null, [60]);
      if(st.countdown === 0){
        st.running = true;
        bip(typeof bipStart === 'function' ? bipStart : null, [200, 80, 200]);
      }
      paint();
      return;
    }
    if(!st.running) return;

    st.elapsed = Math.min(st.duration, st.elapsed + 1);

    if(st.mode === MODE_EMOM){
      // Bip de changement de minute — jamais sur le dernier tic : la fin a
      // déjà son propre signal.
      if(st.elapsed > 0 && st.elapsed < st.duration && st.elapsed % st.intervalSec === 0){
        bip(typeof bipEmom === 'function' ? bipEmom : null, [100, 50, 100]);
      }
    } else if(st.mode === MODE_REST){
      var left = st.duration - st.elapsed;
      if(left > 0 && left <= 3) bip(typeof bipCountdown === 'function' ? bipCountdown : null, [60]);
    }

    if(st.elapsed >= st.duration){
      st.running = false;
      st.finished = true;
      clearLoop();
      bip(typeof bipEnd === 'function' ? bipEnd : null, [300, 100, 300, 100, 300]);
      // Le repos rend la barre à l'heure dès qu'il est terminé : il n'a plus
      // rien à dire. L'EMOM reste affiché (terminé) jusqu'au bloc suivant.
      if(st.mode === MODE_REST){ disarm(); return; }
    }
    paint();
  }

  // ── Armement ──────────────────────────────────────────────────────────────
  // Appelé à CHAQUE rendu du bloc. Ré-armer le même bloc ne redémarre rien :
  // sortir d'un bloc et y revenir ne doit pas remettre un EMOM en cours à zéro.
  function armEmom(cfg, key){
    if(!cfg) return false;
    key = String(key || '');
    if(st.mode === MODE_EMOM && st.key === key && st.duration === num(cfg.seconds)) return true;
    if(st.mode === MODE_REST && st.running) stopSilently();

    clearLoop();
    st.mode = MODE_EMOM;
    st.key = key;
    st.duration = num(cfg.seconds);
    st.intervalSec = num(cfg.intervalSec) || 60;
    st.elapsed = 0;
    st.running = false;
    st.countdown = 0;
    st.finished = false;
    return true;
  }

  // Le repos ne s'invite jamais sur un EMOM en cours : c'est l'EMOM qui donne
  // le tempo, un compte à rebours de repos par-dessus dirait deux choses
  // contradictoires au même endroit.
  function startRest(seconds, key){
    seconds = Math.round(num(seconds));
    if(!(seconds > 0)) return false;
    if(st.mode === MODE_EMOM && (st.running || st.countdown > 0)) return false;

    clearLoop();
    st.mode = MODE_REST;
    st.key = String(key || '');
    st.duration = seconds;
    st.intervalSec = seconds;
    st.elapsed = 0;
    st.running = true;      // un repos démarre tout de suite : il a commencé
    st.countdown = 0;
    st.finished = false;
    startLoop();
    paint();
    return true;
  }

  function stopSilently(){
    clearLoop();
    st.running = false;
    st.countdown = 0;
  }

  function disarm(){
    clearLoop();
    st.mode = MODE_NONE;
    st.key = '';
    st.duration = 0;
    st.elapsed = 0;
    st.running = false;
    st.countdown = 0;
    st.finished = false;
    releaseSlot();
    return true;
  }

  // Rendre le bloc courant sans tuer un repos qui tourne : on change de bloc,
  // le repos, lui, continue.
  function leaveBlock(){
    if(st.mode === MODE_REST && (st.running || st.countdown > 0)) return false;
    return disarm();
  }

  // ── Contrôles ─────────────────────────────────────────────────────────────
  function start(){
    if(st.mode === MODE_NONE) return false;
    if(st.running || st.countdown > 0) return false;
    if(st.elapsed >= st.duration){ st.elapsed = 0; st.finished = false; }
    try{ if(typeof guidedSoundMuted !== 'function' || !guidedSoundMuted()){ if(typeof resumeAudio === 'function') resumeAudio(); } }catch(e){}
    // Départ différé : on ne peut pas taper le chrono et être sous la barre
    // dans la même seconde. Même délai que le chrono WOD.
    st.countdown = st.mode === MODE_EMOM ? COUNTDOWN_SECONDS : 0;
    if(!st.countdown) st.running = true;
    startLoop();
    paint();
    return true;
  }
  function pause(){
    if(st.mode === MODE_NONE) return false;
    if(!st.running && !st.countdown) return false;
    stopSilently();
    paint();
    return true;
  }
  function toggle(){
    if(st.mode === MODE_NONE) return false;
    return (st.running || st.countdown > 0) ? pause() : start();
  }
  function reset(){
    if(st.mode === MODE_NONE) return false;
    stopSilently();
    st.elapsed = 0;
    st.finished = false;
    paint();
    return true;
  }

  // ── Lecture ───────────────────────────────────────────────────────────────
  function remaining(){ return Math.max(0, st.duration - st.elapsed); }
  function cycleIndex(){   // minute en cours, 1-based
    if(st.mode !== MODE_EMOM || !st.intervalSec) return 0;
    var total = Math.ceil(st.duration / st.intervalSec);
    var i = Math.floor(st.elapsed / st.intervalSec) + 1;
    return Math.min(total, i);
  }
  function cycleTotal(){
    if(st.mode !== MODE_EMOM || !st.intervalSec) return 0;
    return Math.ceil(st.duration / st.intervalSec);
  }
  function cycleRemaining(){
    if(st.mode !== MODE_EMOM || !st.intervalSec) return remaining();
    if(st.elapsed >= st.duration) return 0;
    return st.intervalSec - (st.elapsed % st.intervalSec);
  }

  // Même échelle d'alerte que le chrono WOD (guidedEmomMinuteState) : ce sont
  // les mêmes seuils, appris sur le même geste. Ici la couleur va sur la carte,
  // pas sur une boîte de chrono.
  function minuteState(){
    if(st.mode !== MODE_EMOM || !st.running || st.countdown > 0) return null;
    if(st.elapsed >= st.duration) return null;
    var interval = st.intervalSec || 60;
    var secInCycle = st.elapsed % interval;
    var yellowAt = interval >= 30 ? 10 : 5;
    var blueAt = interval >= 60 ? 30 : Math.floor(interval / 2);

    if(st.elapsed > 0 && secInCycle === 0) return {cls:'emom-go', label:'GO'};
    var left = interval - secInCycle;
    if(left <= 3) return {cls:'emom-red', label:String(left)};
    if(left <= yellowAt) return {cls:'emom-yellow', label:String(yellowAt) + 's'};
    if(left <= blueAt && blueAt > yellowAt) return {cls:'emom-blue', label:String(blueAt) + 's'};
    return null;
  }

  function pad2(n){ n = Math.max(0, Math.round(num(n))); return n < 10 ? '0' + n : String(n); }
  function mmss(sec){
    sec = Math.max(0, Math.round(num(sec)));
    return String(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
  }

  // Les deux boîtes de l'heure, remplies telles quelles : `.glc-hm` (le petit
  // mot) et `.glc-sec` (le grand nombre). Aucune géométrie n'est touchée, donc
  // aucun risque de débordement.
  function faceText(){
    if(st.mode === MODE_NONE) return null;
    if(st.countdown > 0) return {hm:'DÉPART', sec:String(st.countdown), tone:'countdown'};

    if(st.mode === MODE_REST){
      var r = remaining();
      return {hm:'REPOS', sec: r >= 60 ? mmss(r) : String(r), tone: r <= 3 ? 'urgent' : 'rest'};
    }
    if(!st.running && st.elapsed === 0) return {hm:'EMOM', sec:String(Math.round(st.duration / 60)), tone:'idle'};
    if(st.elapsed >= st.duration) return {hm:'FINI', sec:String(cycleTotal()), tone:'done'};
    if(!st.running) return {hm:'PAUSE', sec: mmss(cycleRemaining()).replace(/^0:/, ''), tone:'idle'};

    // En marche : minute courante / total, et secondes restantes DANS la minute.
    var left = cycleRemaining();
    return {
      hm: String(cycleIndex()) + '/' + String(cycleTotal()),
      sec: left >= 60 ? mmss(left) : String(left),
      tone: 'run'
    };
  }

  // ── DOM ───────────────────────────────────────────────────────────────────
  function clockEl(){
    try{ return document.getElementById('guidedLiveClock'); }catch(e){ return null; }
  }
  function cardEl(){
    try{
      var s = document.getElementById('guidedSession');
      return s ? s.querySelector('.guided-card') : null;
    }catch(e){ return null; }
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  // L'heure ne se repeint que si le mini-chrono ne tient pas la place :
  // c'est ce que `ownsClockSlot()` dit à `updateGlobalClock()`.
  function ownsClockSlot(){ return st.mode !== MODE_NONE; }

  function releaseSlot(){
    var el = clockEl();
    if(el){
      el.classList.remove('is-mini');
      el.removeAttribute('data-mini-tone');
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-label');
    }
    paintCard(null);
    try{ if(typeof updateGlobalClock === 'function') updateGlobalClock(); }catch(e){}
  }

  function paintCard(state){
    var card = cardEl();
    if(!card) return;
    card.classList.remove('emom-blue', 'emom-yellow', 'emom-red', 'emom-go');
    card.removeAttribute('data-emom-warning');
    if(!state) return;
    card.classList.add(state.cls);
    card.setAttribute('data-emom-warning', state.label);
  }

  function paint(){
    var el = clockEl();
    var face = faceText();
    if(!el || !face){ paintCard(null); return; }
    el.classList.add('is-mini');
    el.setAttribute('data-mini-tone', face.tone);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', st.mode === MODE_REST ? 'Minuteur de repos' : 'Chrono EMOM');
    el.innerHTML = '<span class="glc-hm">' + esc(face.hm) + '</span>'
                 + '<span class="glc-sec">' + esc(face.sec) + '</span>';
    paintCard(minuteState());
  }

  // Tap = départ / pause. Appui long = remise à zéro — un seul contrôle tient
  // dans ce coin, l'appui long est la sortie de secours.
  var LONG_PRESS_MS = 600;
  function bind(){
    var el = clockEl();
    if(!el || el.getAttribute('data-mini-bound') === '1') return;
    el.setAttribute('data-mini-bound', '1');
    var timer = null, longFired = false;

    function down(){
      if(!ownsClockSlot()) return;
      longFired = false;
      timer = setTimeout(function(){
        longFired = true;
        reset();
        try{ if(typeof vibrate === 'function') vibrate([25, 40, 25]); }catch(e){}
      }, LONG_PRESS_MS);
    }
    function up(ev){
      if(timer){ clearTimeout(timer); timer = null; }
      if(!ownsClockSlot()) return;
      if(longFired){ if(ev && ev.preventDefault) ev.preventDefault(); longFired = false; return; }
      toggle();
    }
    function cancel(){ if(timer){ clearTimeout(timer); timer = null; } longFired = false; }

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('keydown', function(ev){
      if(!ownsClockSlot()) return;
      if(ev && (ev.key === 'Enter' || ev.key === ' ')){ ev.preventDefault(); toggle(); }
    });
  }

  var api = {
    MODE_EMOM: MODE_EMOM,
    MODE_REST: MODE_REST,
    detect: detect,
    armEmom: armEmom,
    startRest: startRest,
    disarm: disarm,
    leaveBlock: leaveBlock,
    start: start,
    pause: pause,
    toggle: toggle,
    reset: reset,
    tick: tick,
    paint: paint,
    bind: bind,
    ownsClockSlot: ownsClockSlot,
    minuteState: minuteState,
    faceText: faceText,
    remaining: remaining,
    cycleIndex: cycleIndex,
    cycleTotal: cycleTotal,
    cycleRemaining: cycleRemaining,
    state: function(){
      return {mode:st.mode, key:st.key, duration:st.duration, intervalSec:st.intervalSec,
              elapsed:st.elapsed, running:st.running, countdown:st.countdown, finished:st.finished};
    }
  };

  if(typeof window !== 'undefined') window.CoachMiniTimer = api;
  else if(typeof module !== 'undefined' && module.exports) module.exports = api;
})();

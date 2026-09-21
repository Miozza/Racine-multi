// Racine — intervalles travail/repos de la séance guidée (logique pure)
//
// POURQUOI CE MODULE
// Racine savait déjà chronométrer trois formats : AMRAP (rebours), EMOM (bip
// par minute) et For Time / CAP (chrono montant). Il ne savait pas lire un
// quatrième, pourtant écrit noir sur blanc dans les programmes :
//   « 10 × (20 s fort / 40 s facile) »   « 4 × 3 min vélo, 1 min repos »
// Sans lui, ces blocs tombaient sur le chrono générique : un rebours de la
// durée du créneau, aucun changement de phase, aucun compte de rondes. Sur un
// vélo, à 20 secondes par phase, un chrono qui ne dit pas « travail / repos »
// ne sert à rien — c'est justement ce qu'on n'a pas le temps de calculer.
//
// CE QUE CE MODULE FAIT — ET RIEN D'AUTRE
// Il LIT un texte de bloc et RÉPOND à la question « où en est-on à la seconde
// N ». Aucun DOM, aucun son, aucun setInterval, aucun stockage. Le chrono
// (scripts/session/timer.js) garde la main sur l'affichage, les bips et
// l'horloge ; il se contente d'appeler phaseAt() à chaque tic.
// Conséquence utile : la logique se vérifie sans navigateur
// (dev/interval_timer_checks.js) et reste réutilisable par n'importe quelle
// vue — c'est le composant réutilisable, pas un deuxième chrono.
//
// LA DURÉE VIENT DU TEXTE, JAMAIS DU CRÉNEAU DU BLOC
// Même règle que CoachMiniTimer pour l'EMOM : `block.time` est le créneau
// prévu dans la séance (« 10 min »), pas la durée réelle du format. Sur
// « 10 × (20 s / 40 s) » la durée réelle est 10 min pile, mais sur
// « 4 × 3 min / 1 min » elle vaut 15 min pour un créneau écrit 16. Le nombre
// lu dans le texte est la seule source.
//
// LE DERNIER REPOS N'EST PAS COMPTÉ
// Un format d'intervalles se termine sur la fin du dernier effort. Compter le
// repos final ajouterait une minute d'attente devant un chrono qui ne sert
// plus à rien.
//
// Porte publique : window.CoachIntervalTimer
(function(){
  'use strict';

  // « 10 × (20 s fort / 40 s facile) », « 4 x 3 min à 80 %, 1 min repos ».
  // Le séparateur est « / » ou une virgule : les deux s'écrivent dans les
  // programmes et aucune des deux formes n'est plus juste que l'autre.
  // Tolère la parenthèse ouvrante, les qualificatifs après chaque nombre
  // (« fort », « à ~80 % ») et l'unité écrite en long.
  var RX = /(\d{1,3})\s*[x×]\s*\(?\s*(\d{1,3})\s*(s|sec|secs|seconde|secondes|min|mins|minute|minutes)\b[^/,)]*[\/,]\s*(\d{1,3})\s*(s|sec|secs|seconde|secondes|min|mins|minute|minutes)\b/i;

  var MIN_ROUNDS = 2;
  var MAX_ROUNDS = 60;
  var MIN_PHASE_SEC = 5;
  var MAX_PHASE_SEC = 20 * 60;

  function num(v){ var n = Number(v); return isFinite(n) ? n : 0; }
  function toSeconds(value, unit){
    var n = num(value);
    return /^min/i.test(String(unit || '')) ? n * 60 : n;
  }
  function pad2(n){ n = Math.max(0, Math.round(num(n))); return n < 10 ? '0' + n : String(n); }
  function mmss(sec){
    sec = Math.max(0, Math.round(num(sec)));
    return String(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
  }
  function phaseText(sec){
    sec = Math.max(0, Math.round(num(sec)));
    return sec >= 60 ? mmss(sec) : String(sec);
  }

  // ── Lecture ───────────────────────────────────────────────────────────────
  // Retourne null dès qu'un nombre sort des bornes plausibles : mieux vaut le
  // chrono générique qu'un format inventé à partir d'une phrase qui parlait
  // d'autre chose.
  function parse(text){
    var src = String(text == null ? '' : text);
    if(!src) return null;
    // Un AMRAP ou un EMOM ont déjà leur chrono : « AMRAP 12 : 12 cal vélo,
    // 10 air squats » contient bien « 12 × … , … » à l'œil d'une regex.
    if(/\bAMRAP\b|\bEMOM\b/i.test(src)) return null;
    var m = RX.exec(src);
    if(!m) return null;

    var rounds = Math.round(num(m[1]));
    var workSec = Math.round(toSeconds(m[2], m[3]));
    var restSec = Math.round(toSeconds(m[4], m[5]));
    if(rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) return null;
    if(workSec < MIN_PHASE_SEC || workSec > MAX_PHASE_SEC) return null;
    if(restSec < MIN_PHASE_SEC || restSec > MAX_PHASE_SEC) return null;

    return {
      rounds: rounds,
      workSec: workSec,
      restSec: restSec,
      // Le dernier repos ne compte pas : le format finit sur l'effort.
      totalSec: rounds * (workSec + restSec) - restSec,
      label: rounds + ' × ' + phaseText(workSec) + ' / ' + phaseText(restSec),
      source: src
    };
  }

  // ── Position dans le format ───────────────────────────────────────────────
  // `elapsed` = secondes écoulées depuis le départ réel (décompte de départ
  // exclu). Retourne toujours un objet : un chrono n'a pas d'état « inconnu ».
  function phaseAt(cfg, elapsed){
    if(!cfg) return null;
    var cycle = num(cfg.workSec) + num(cfg.restSec);
    if(!(cycle > 0)) return null;
    var e = Math.max(0, Math.floor(num(elapsed)));
    var total = num(cfg.totalSec);

    if(e >= total){
      return {phase:'done', round:num(cfg.rounds), remaining:0, elapsedInPhase:0,
              phaseSec:0, label:'FINI', isWork:false};
    }
    var idx = Math.floor(e / cycle);          // ronde en cours, 0-based
    var inCycle = e - idx * cycle;
    var isWork = inCycle < num(cfg.workSec);
    var phaseSec = isWork ? num(cfg.workSec) : num(cfg.restSec);
    var elapsedInPhase = isWork ? inCycle : inCycle - num(cfg.workSec);

    return {
      phase: isWork ? 'work' : 'rest',
      isWork: isWork,
      round: idx + 1,
      rounds: num(cfg.rounds),
      phaseSec: phaseSec,
      elapsedInPhase: elapsedInPhase,
      remaining: phaseSec - elapsedInPhase,
      label: (isWork ? 'FORT ' : 'FACILE ') + (idx + 1) + '/' + num(cfg.rounds)
    };
  }

  // Vrai quand la seconde `elapsed` est exactement un changement de phase :
  // c'est là que le chrono doit sonner. Le départ (elapsed 0) n'en est pas un —
  // il a déjà le signal du décompte de départ.
  function isTransition(cfg, elapsed){
    if(!cfg) return false;
    var e = Math.floor(num(elapsed));
    if(e <= 0) return false;
    if(e >= num(cfg.totalSec)) return false;  // la fin a son propre signal
    var cycle = num(cfg.workSec) + num(cfg.restSec);
    if(!(cycle > 0)) return false;
    var inCycle = e % cycle;
    return inCycle === 0 || inCycle === num(cfg.workSec);
  }

  // Palier d'alerte, mêmes seuils que l'EMOM (scripts/session/mini_timer.js) :
  // ce sont les mêmes gestes, appris sur le même écran.
  function alertState(cfg, elapsed){
    var p = phaseAt(cfg, elapsed);
    if(!p || p.phase === 'done') return null;
    var left = p.remaining;
    if(left <= 3) return {cls:'phase-red', label:String(left)};
    if(left <= (p.phaseSec >= 30 ? 10 : 5)) return {cls:'phase-yellow', label:p.label};
    return {cls: p.isWork ? 'phase-work' : 'phase-rest', label:p.label};
  }

  var api = {
    parse: parse,
    phaseAt: phaseAt,
    isTransition: isTransition,
    alertState: alertState,
    phaseText: phaseText
  };

  if(typeof window !== 'undefined') window.CoachIntervalTimer = api;
  else if(typeof module !== 'undefined' && module.exports) module.exports = api;
})();

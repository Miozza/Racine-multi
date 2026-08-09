// Racine — rounds AMRAP tapés sur le chrono (domaine session).
//
// Pourquoi un module : le compteur de rounds n'appartient ni au chrono
// (scripts/session/timer.js, qui ne connaît que des secondes) ni à l'écran
// résultats (scripts/session/results.js, qui ne connaît pas le chrono). Les
// deux le lisent, aucun ne le possède. Porte publique : window.CoachAmrapRounds.
//
// Données : mémoire vive uniquement, le temps d'une séance. Aucune clé de
// stockage n'est créée, aucun schéma persisté n'est modifié. Ce qui doit
// survivre part par l'écran résultats, dans la ligne du WOD, sous forme de
// champs texte ordinaires (`rounds`, `roundSplits`, `lastRoundRemaining`) —
// donc exportables et réimportables comme le reste du journal.
//
// Le temps enregistré est celui que l'athlète voit à l'écran (secondes pleines
// du chrono), jamais une horloge parallèle : un round noté « 1:12 » doit
// correspondre au chrono au moment du tap, pause comprise.
(function(){
  // key -> {duration, rounds:[{at, split, remaining}]}
  var store = {};

  function clean(v){ return String(v === undefined || v === null ? '' : v); }
  function esc(v){ return typeof escHtml === 'function' ? escHtml(v) : clean(v); }
  function clock(sec){
    sec = Math.max(0, Math.round(Number(sec) || 0));
    if(typeof formatTimerDisplay === 'function') return formatTimerDisplay(sec);
    return String(Math.floor(sec / 60)) + ':' + String(sec % 60).padStart(2, '0');
  }

  // Même clé que la ligne WOD de l'écran résultats (collectSessionExercises) :
  // c'est ce qui permet au compteur de traverser sans table de correspondance.
  function keyFor(title){ return 'wod_' + clean(title); }

  // AMRAP = le mot vient du programme, pas de l'édition terrain. On lit donc
  // `baseLabel` en priorité : raccourcir un AMRAP reste un AMRAP.
  function isAmrapConfig(cfg, text){
    var label = clean(cfg && (cfg.baseLabel || cfg.label));
    if(/amrap/i.test(label)) return true;
    if(/emom/i.test(label)) return false;
    return /\bAMRAP\b/i.test(clean(text));
  }
  function isAmrapBlock(block){
    if(!block || block.kind !== 'wod') return false;
    return isAmrapConfig(block.timer, block.text);
  }

  function entry(key, duration){
    key = clean(key);
    if(!key) return null;
    if(!store[key]) store[key] = {duration: 0, rounds: []};
    if(duration !== undefined && Number(duration) > 0) store[key].duration = Math.round(Number(duration));
    return store[key];
  }

  function resetAll(){ store = {}; }
  function reset(key){ delete store[clean(key)]; }

  // Un tap = un round terminé. Le garde-fou n'est pas un anti-rebond en
  // millisecondes mais la seconde du chrono elle-même : deux taps dans la même
  // seconde affichée ne peuvent pas être deux rounds, et un split de 0 s
  // fausserait le classement rapide/lent pour tout le WOD.
  function tap(key, elapsed, duration){
    var e = entry(key, duration);
    if(!e) return null;
    var at = Math.max(0, Math.round(Number(elapsed) || 0));
    var last = e.rounds.length ? e.rounds[e.rounds.length - 1] : null;
    if(last && at <= last.at) return null;
    var round = {
      at: at,
      split: at - (last ? last.at : 0),
      remaining: Math.max(0, (Number(e.duration) || 0) - at)
    };
    e.rounds.push(round);
    return round;
  }

  function undo(key){
    var e = store[clean(key)];
    if(!e || !e.rounds.length) return null;
    return e.rounds.pop();
  }

  function count(key){
    var e = store[clean(key)];
    return e ? e.rounds.length : 0;
  }

  // Rapide / lent : sans deux rounds il n'y a pas de classement, donc pas de
  // couleur. Colorer un round unique en or ne dirait rien.
  function stats(key){
    var e = store[clean(key)];
    if(!e || !e.rounds.length) return null;
    var rounds = e.rounds, fastest = 0, slowest = 0, i;
    for(i = 1; i < rounds.length; i++){
      if(rounds[i].split < rounds[fastest].split) fastest = i;
      if(rounds[i].split > rounds[slowest].split) slowest = i;
    }
    var ranked = rounds.length >= 2 && rounds[fastest].split !== rounds[slowest].split;
    return {
      key: clean(key),
      duration: Number(e.duration) || 0,
      count: rounds.length,
      rounds: rounds.slice(),
      fastestIndex: ranked ? fastest : -1,
      slowestIndex: ranked ? slowest : -1,
      // Temps encore au chrono après le dernier round complet : c'est le temps
      // dont l'athlète disposait pour les reps du round entamé.
      lastRemaining: rounds[rounds.length - 1].remaining
    };
  }

  function roundClass(st, i){
    if(!st) return '';
    if(i === st.fastestIndex) return ' fast';
    if(i === st.slowestIndex) return ' slow';
    return '';
  }

  // ── Panneau de la carte WOD ────────────────────────────────────────────────
  // Placé AU-DESSUS de la boîte du chrono, jamais dedans : la taille des
  // chiffres se calcule sur la largeur (règle verrouillée, docs/UI_CONSTRAINTS),
  // et l'espace vertical libre au-dessus sert d'étirement. Le fit le mesure
  // comme n'importe quel voisin (`prev` dans le calcul de hauteur).
  //
  // Grille, pas bande défilante : une ligne horizontale ne tient que ~2,6
  // splits lisibles (250 px utiles / ~95 px par pastille à 21 px). Mesuré :
  // avec 4 rounds, R1 et R2 sortaient déjà de l'écran. La grille à 4 colonnes
  // en montre 12 sans rien couper.
  //
  // La place vient des cartes de mouvement, qui se replient en une ligne dès le
  // premier round : le WOD est lancé, l'athlète connaît ses mouvements. Tant
  // qu'aucun round n'est tapé, la carte garde exactement son allure d'origine.
  var PANEL_ID = 'guidedAmrapPanel';

  function panelHtml(key){
    var st = stats(key);
    if(!st){
      return "<div class='guided-amrap-hint'>Touche le chrono → +1 round</div>";
    }
    var cells = '', i, r, tag;
    for(i = 0; i < st.rounds.length; i++){
      r = st.rounds[i];
      tag = i === st.fastestIndex ? 'le + rapide' : (i === st.slowestIndex ? 'le + lent' : '');
      cells += "<div class='guided-amrap-cell" + roundClass(st, i) + "'>"
             + "<span class='guided-amrap-no'>R" + (i + 1) + "</span>"
             + "<span class='guided-amrap-split'>" + esc(clock(r.split)) + "</span>"
             + (tag ? "<span class='guided-amrap-tag'>" + tag + "</span>" : "")
             + "</div>";
    }
    return "<div class='guided-amrap-head'>"
         + "<div class='guided-amrap-count'>" + st.count + "<span>round" + (st.count > 1 ? 's' : '') + "</span></div>"
         + "<button type='button' class='guided-amrap-undo' data-amrap-undo='1' aria-label='Retirer le dernier round'>↩</button>"
         + "</div>"
         + "<div class='guided-amrap-grid'>" + cells + "</div>";
  }

  // Le panneau se redessine seul après un tap : le reste de la carte WOD (et
  // surtout le chrono en cours) ne doit pas être re-rendu pour un compteur.
  function refreshPanel(key){
    var el = document.getElementById(PANEL_ID);
    if(!el) return;
    var st = stats(key);
    el.innerHTML = panelHtml(key);
    el.classList.toggle('has-rounds', !!st);
    // Les mouvements se replient (ou se redéplient après un ↩) en même temps :
    // c'est leur hauteur qui paie la grille.
    var moves = document.querySelector('.guided-wod-moves');
    if(moves) moves.classList.toggle('compact', !!st);
    // Au-delà de 12 rounds la grille défile : toujours montrer les derniers.
    var grid = el.querySelector('.guided-amrap-grid');
    if(grid) grid.scrollTop = grid.scrollHeight;
    if(typeof refitGuidedWodTimerSoon === 'function') refitGuidedWodTimerSoon();
  }

  // ── Écran résultats ────────────────────────────────────────────────────────
  function resultsHtml(key){
    var st = stats(key);
    if(!st) return '';
    var h = "<div class='wod-rounds-log'>";
    h += "<div class='wod-rounds-log-head'>Rounds chronométrés · <strong>" + st.count + "</strong></div>";
    h += "<div class='wod-rounds-log-list'>";
    st.rounds.forEach(function(r, i){
      var cls = roundClass(st, i);
      var tag = i === st.fastestIndex ? 'le plus rapide' : (i === st.slowestIndex ? 'le plus lent' : '');
      h += "<div class='wod-round-line" + cls + "'>"
         + "<span class='wod-round-no'>R" + (i + 1) + "</span>"
         + "<span class='wod-round-split'>" + esc(clock(r.split)) + "</span>"
         + "<span class='wod-round-tag'>" + esc(tag) + "</span>"
         + "</div>";
    });
    h += "</div>";
    if(st.lastRemaining > 0){
      h += "<div class='wod-rounds-left'>Après le round " + st.count + " il restait <strong>"
         + esc(clock(st.lastRemaining)) + "</strong> — c'est le temps des reps du dernier round entamé.</div>";
    } else {
      h += "<div class='wod-rounds-left'>Le round " + st.count + " est tombé sur la fin du chrono : aucun round entamé après.</div>";
    }
    h += "</div>";
    return h;
  }

  // Ce qui rejoint la ligne de résultat lisible (et donc l'historique) :
  // le temps restant du dernier round entamé, rien d'autre. Les splits partent
  // dans leurs propres champs, pour ne pas polluer la phrase de résultat.
  function resultSuffix(key){
    var st = stats(key);
    if(!st || !(st.lastRemaining > 0)) return '';
    return ' (dernier round : ' + clock(st.lastRemaining) + ' restant)';
  }
  function splitsText(key){
    var st = stats(key);
    if(!st) return '';
    return st.rounds.map(function(r){ return clock(r.split); }).join(' / ');
  }
  function remainingText(key){
    var st = stats(key);
    if(!st || !(st.lastRemaining > 0)) return '';
    return clock(st.lastRemaining);
  }

  window.CoachAmrapRounds = {
    keyFor: keyFor,
    isAmrapBlock: isAmrapBlock,
    isAmrapConfig: isAmrapConfig,
    resetAll: resetAll,
    reset: reset,
    tap: tap,
    undo: undo,
    count: count,
    stats: stats,
    clock: clock,
    panelId: PANEL_ID,
    panelHtml: panelHtml,
    refreshPanel: refreshPanel,
    resultsHtml: resultsHtml,
    resultSuffix: resultSuffix,
    splitsText: splitsText,
    remainingText: remainingText
  };
})();

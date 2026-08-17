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
//
// Un tap peut manquer (doigt qui glisse, coin de bouton) : le round vaut alors
// deux tours. Le module sait le repérer et le partager en deux (split), et
// garde le journal réellement tapé de côté pour pouvoir y revenir (restore).
// Il ne corrige JAMAIS de lui-même — il signale, l'athlète tranche.
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
    if(!store[key]) store[key] = {duration: 0, rounds: [], raw: null};
    if(duration !== undefined && Number(duration) > 0) store[key].duration = Math.round(Number(duration));
    return store[key];
  }

  // L'instant de chaque tap (`at`) est la seule donnée brute : `split` et
  // `remaining` s'en déduisent. Toute correction manuelle réécrit donc la liste
  // des `at`, jamais les splits — sinon deux vérités cohabiteraient.
  function rebuild(e){
    var prev = 0;
    e.rounds.forEach(function(r){
      r.split = r.at - prev;
      r.remaining = Math.max(0, (Number(e.duration) || 0) - r.at);
      prev = r.at;
    });
  }
  function copyRounds(list){
    return (list || []).map(function(r){ return {at: r.at, split: r.split, remaining: r.remaining}; });
  }
  // Le journal réellement tapé est mis de côté à la PREMIÈRE correction : c'est
  // lui que « Rétablir » ramène. Sans ça, une division approximative effacerait
  // définitivement ce que le chrono a vu.
  function snapshot(e){
    if(!e.raw) e.raw = copyRounds(e.rounds);
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
    // Le journal brut suit les taps qui arrivent après une correction, sinon
    // « Rétablir » ramènerait un WOD tronqué.
    if(e.raw){
      var lastRaw = e.raw.length ? e.raw[e.raw.length - 1] : null;
      e.raw.push({at: at, split: at - (lastRaw ? lastRaw.at : 0), remaining: round.remaining});
    }
    return round;
  }

  function undo(key){
    var e = store[clean(key)];
    if(!e || !e.rounds.length) return null;
    var removed = e.rounds.pop();
    if(e.raw && e.raw.length) e.raw.pop();
    return removed;
  }

  // ── Corriger un tap manqué ─────────────────────────────────────────────────
  // Un tap perdu donne un round qui vaut deux tours. L'instant du tap manquant
  // n'existe nulle part : il ne peut pas être retrouvé, seulement supposé. Le
  // partage égal est la seule hypothèse honnête — elle se trompe sur chacune
  // des deux moitiés, mais beaucoup moins qu'un round compté double, qui fausse
  // à la fois le compte de rounds et le classement rapide/lent de tout le WOD.
  // La somme est conservée : les rounds suivants gardent exactement leur temps.
  function split(key, index, parts){
    var e = store[clean(key)];
    if(!e) return null;
    index = Number(index);
    parts = Math.round(Number(parts) || 2);
    if(parts < 2) parts = 2;
    var r = e.rounds[index];
    if(!r) return null;
    var prev = index > 0 ? e.rounds[index - 1].at : 0;
    var total = r.at - prev;
    // Chaque part doit valoir au moins une seconde : un split nul est refusé au
    // tap, il ne peut pas entrer par la correction.
    if(total < parts) return null;
    snapshot(e);
    var pieces = [], i, at, floor;
    for(i = 1; i < parts; i++){
      at = prev + Math.round(total * i / parts);
      floor = pieces.length ? pieces[pieces.length - 1].at : prev;
      if(at <= floor) at = floor + 1;
      pieces.push({at: at});
    }
    pieces.push({at: r.at});
    e.rounds.splice.apply(e.rounds, [index, 1].concat(pieces));
    rebuild(e);
    return stats(key);
  }

  function restore(key){
    var e = store[clean(key)];
    if(!e || !e.raw) return null;
    e.rounds = copyRounds(e.raw);
    e.raw = null;
    rebuild(e);
    return stats(key);
  }
  function isEdited(key){
    var e = store[clean(key)];
    return !!(e && e.raw);
  }

  function count(key){
    var e = store[clean(key)];
    return e ? e.rounds.length : 0;
  }

  // Un tap manqué ne se devine pas, il se REPÈRE : le round vaut alors environ
  // deux fois les autres. Rien n'est corrigé tout seul — le moteur montre où
  // regarder, l'athlète tranche. Il faut au moins trois rounds : sur deux, un
  // écart du simple au double est un rythme, pas un accident.
  var SUSPECT_RATIO = 1.75;
  function median(list){
    var s = list.slice().sort(function(a, b){ return a - b; });
    if(!s.length) return 0;
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function suspectIndexOf(rounds, slowest){
    if(!rounds || rounds.length < 3 || slowest < 0) return -1;
    var others = [], i;
    for(i = 0; i < rounds.length; i++){ if(i !== slowest) others.push(rounds[i].split); }
    var ref = median(others);
    if(!(ref > 0)) return -1;
    return rounds[slowest].split >= ref * SUSPECT_RATIO ? slowest : -1;
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
    var slowIdx = ranked ? slowest : -1;
    return {
      key: clean(key),
      duration: Number(e.duration) || 0,
      count: rounds.length,
      rounds: rounds.slice(),
      fastestIndex: ranked ? fastest : -1,
      slowestIndex: slowIdx,
      // Round qui ressemble à deux tours comptés pour un (tap manqué).
      suspectIndex: suspectIndexOf(rounds, slowIdx),
      edited: !!e.raw,
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
  // Banderole d'une ligne, à pastilles hautes. Elle ne montre que ~3 rounds à
  // la fois et défile — compromis assumé : mieux vaut trois temps VRAIMENT
  // lisibles que douze illisibles, et la banderole coûte deux fois moins de
  // hauteur qu'une grille, donc les mouvements restent grands.
  //
  // Une pastille ne porte que deux choses : le numéro du round et son temps.
  // Pas d'étiquette « le + rapide » — la couleur le dit déjà — et le numéro
  // est en Inter quand le temps est en Orbitron : deux polices, donc aucune
  // confusion possible entre un numéro de round et une valeur de chrono.
  var PANEL_ID = 'guidedAmrapPanel';

  function panelHtml(key){
    var st = stats(key);
    if(!st){
      return "<div class='guided-amrap-hint'>Touche le chrono → +1 round</div>";
    }
    var cells = '', i, r;
    for(i = 0; i < st.rounds.length; i++){
      r = st.rounds[i];
      cells += "<div class='guided-amrap-cell" + roundClass(st, i) + "'>"
             + "<span class='guided-amrap-no'>" + (i + 1) + "</span>"
             + "<span class='guided-amrap-split'>" + esc(clock(r.split)) + "</span>"
             + "</div>";
    }
    return "<div class='guided-amrap-count'>" + st.count + "<span>round" + (st.count > 1 ? 's' : '') + "</span></div>"
         + "<div class='guided-amrap-cells'>" + cells + "</div>"
         + "<button type='button' class='guided-amrap-undo' data-amrap-undo='1' aria-label='Retirer le dernier round'>↩</button>";
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
    // La banderole ne montre que ~3 pastilles : toujours coller aux derniers.
    var cells = el.querySelector('.guided-amrap-cells');
    if(cells) cells.scrollLeft = cells.scrollWidth;
    if(typeof refitGuidedWodTimerSoon === 'function') refitGuidedWodTimerSoon();
  }

  // ── Écran résultats ────────────────────────────────────────────────────────
  // Seul endroit où le journal du chrono se corrige : en plein WOD l'athlète
  // n'arbitre rien, il tape. Ici, à froid, il voit la liste complète et peut
  // rendre au round manqué son tour perdu (÷2) ou revenir au brut.
  function resultsHtml(key){
    var st = stats(key);
    if(!st) return '';
    var h = "<div class='wod-rounds-log'>";
    h += "<div class='wod-rounds-log-head'>Rounds chronométrés · <strong>" + st.count + "</strong>"
       + (st.edited ? "<span class='wod-rounds-edited'>corrigé</span>" : "")
       + "</div>";
    h += "<div class='wod-rounds-log-list'>";
    st.rounds.forEach(function(r, i){
      var cls = roundClass(st, i);
      var suspect = i === st.suspectIndex;
      var tag = suspect ? '≈ 2 rounds ? tap manqué'
              : (i === st.fastestIndex ? 'le plus rapide' : (i === st.slowestIndex ? 'le plus lent' : ''));
      h += "<div class='wod-round-line" + cls + (suspect ? ' suspect' : '') + "'>"
         + "<span class='wod-round-no'>R" + (i + 1) + "</span>"
         + "<span class='wod-round-split'>" + esc(clock(r.split)) + "</span>"
         + "<span class='wod-round-tag'>" + esc(tag) + "</span>"
         + (r.split >= 2
             ? "<button type='button' class='wod-round-split-btn" + (suspect ? ' suggest' : '') + "'"
               + " data-round-split='" + i + "' data-round-parts='2'"
               + " aria-label='Diviser le round " + (i + 1) + " en deux'>÷2</button>"
             : "<span class='wod-round-split-btn empty' aria-hidden='true'></span>")
         + "</div>";
    });
    h += "</div>";
    if(st.lastRemaining > 0){
      h += "<div class='wod-rounds-left'>Après le round " + st.count + " il restait <strong>"
         + esc(clock(st.lastRemaining)) + "</strong> — c'est le temps des reps du dernier round entamé.</div>";
    } else {
      h += "<div class='wod-rounds-left'>Le round " + st.count + " est tombé sur la fin du chrono : aucun round entamé après.</div>";
    }
    h += "<div class='wod-rounds-fix'>"
       + "<span class='wod-rounds-fix-hint'>Un tap manqué ? <strong>÷2</strong> partage ce round en deux tours égaux — le total et les rounds suivants ne bougent pas.</span>"
       + (st.edited ? "<button type='button' class='wod-rounds-restore' data-rounds-restore='1'>↺ Temps du chrono</button>" : "")
       + "</div>";
    h += "</div>";
    return h;
  }

  // Le journal des rounds est monté vivant dans la carte WOD des résultats :
  // chaque correction se repeint sur place et prévient l'appelant, qui remet à
  // jour le compte sélectionné et les champs durables.
  function mountResultsLog(key, host, onChange){
    if(!host) return null;
    function paint(){ host.innerHTML = resultsHtml(key); }
    paint();
    host.addEventListener('click', function(ev){
      var t = ev && ev.target;
      var btn = t && t.closest ? t.closest('[data-round-split],[data-rounds-restore]') : null;
      if(!btn) return;
      ev.preventDefault();
      var st = btn.hasAttribute('data-rounds-restore')
        ? restore(key)
        : split(key, Number(btn.getAttribute('data-round-split')), Number(btn.getAttribute('data-round-parts')) || 2);
      if(!st) return;
      paint();
      if(typeof onChange === 'function') onChange(st);
    });
    return host;
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

  // ── Historique ─────────────────────────────────────────────────────────────
  // Le journal enregistré ne garde que du TEXTE (`roundSplits`), pas d'objets :
  // c'est ce qui rend l'export JSON relisible par une version antérieure. La
  // vue historique le relit donc, sans jamais toucher au stockage, et le rend
  // avec les mêmes couleurs que l'écran Résultats.
  function parseClock(value){
    var m = /^(\d+):([0-5]\d)$/.exec(clean(value).trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function parseSplitsText(text){
    var out = [];
    clean(text).split('/').forEach(function(part){
      var sec = parseClock(part);
      if(sec !== null && sec > 0) out.push(sec);
    });
    return out;
  }
  function historyHtml(splits, remaining){
    var list = Array.isArray(splits) ? splits.slice() : parseSplitsText(splits);
    if(!list.length) return '';
    var fastest = 0, slowest = 0, i;
    for(i = 1; i < list.length; i++){
      if(list[i] < list[fastest]) fastest = i;
      if(list[i] > list[slowest]) slowest = i;
    }
    var ranked = list.length >= 2 && list[fastest] !== list[slowest];
    var cells = '';
    for(i = 0; i < list.length; i++){
      cells += "<span class='history-round" + (ranked && i === fastest ? ' fast' : '') + (ranked && i === slowest ? ' slow' : '') + "'>"
             + "<em>" + (i + 1) + "</em>" + esc(clock(list[i]))
             + "</span>";
    }
    var rest = clean(remaining).trim();
    return "<div class='history-rounds'>"
         + "<span class='history-rounds-head'>" + list.length + " round" + (list.length > 1 ? 's' : '') + " chronométrés</span>"
         + "<span class='history-rounds-cells'>" + cells + "</span>"
         + (rest ? "<span class='history-rounds-left'>puis " + esc(rest) + " restant</span>" : "")
         + "</div>";
  }

  window.CoachAmrapRounds = {
    keyFor: keyFor,
    isAmrapBlock: isAmrapBlock,
    isAmrapConfig: isAmrapConfig,
    resetAll: resetAll,
    reset: reset,
    tap: tap,
    undo: undo,
    split: split,
    restore: restore,
    isEdited: isEdited,
    count: count,
    stats: stats,
    clock: clock,
    panelId: PANEL_ID,
    panelHtml: panelHtml,
    refreshPanel: refreshPanel,
    resultsHtml: resultsHtml,
    mountResultsLog: mountResultsLog,
    resultSuffix: resultSuffix,
    splitsText: splitsText,
    remainingText: remainingText,
    parseSplitsText: parseSplitsText,
    historyHtml: historyHtml
  };
})();

// Racine — saisie cardio des conditionnements (Bike, Row, Ski, Run)
// Porte publique : window.CoachWodCardio
//
// Le problème résolu : « 10 min Bike, 4 min Row, 10 min Bike » n'avait
// qu'un RPE et une note. Les calories finissaient en texte libre
// (« 86 calories plus 51 calories plus 74 »), donc aucune moyenne possible.
// Ici, chaque morceau machine reçoit sa valeur (calories OU mètres) et sa
// durée ; le rythme (cal/min, m/min, /500 m) se calcule à partir de là.
//
// Stockage : UN champ texte ajouté à la ligne WOD, `cardio`, lisible tel quel
// et relu par ce module :
//     "Bike 10 min 86 cal · Row 4 min 51 cal · Bike 10 min 74 cal"
// Champ purement additif (même logique que `wodText`, `roundSplits`) : aucune
// clé renommée, aucune migration, un export ancien reste importable.
//
// Ce module n'influence AUCUNE charge (CLAUDE.md § 3.2 : un résultat de WOD
// ne remplace jamais une capacité principale). Il mesure et affiche.
//
// Séances d'avant ce module : si le texte du WOD donne N morceaux machine et
// que la note contient exactement N nombres avec le mot « cal », on les lit
// pour les moyennes (`fromNote`). Lecture seule : le journal n'est pas réécrit.
// Dans l'édition d'une séance passée, ces valeurs pré-remplissent la saisie —
// c'est l'athlète qui les confirme en enregistrant.
(function(){
  var api = window.CoachWodCardio || {};

  var MACHINES = ['Bike', 'Row', 'Ski', 'Run'];
  var UNITS = ['cal', 'm'];
  var DEFAULT_UNIT = {Bike:'cal', Row:'cal', Ski:'cal', Run:'m'};
  var MACHINE_LABELS = {Bike:'Bike', Row:'Row', Ski:'Ski', Run:'Course'};

  function clean(v){ return String(v === undefined || v === null ? '' : v).trim(); }
  function esc(v){ return typeof escHtml === 'function' ? escHtml(clean(v)) : clean(v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function num(v){
    var n = parseFloat(clean(v).replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function fmt(n){ return String(Math.round(n * 10) / 10).replace('.', ','); }

  function machineOf(word){
    var w = clean(word).toLowerCase();
    if(/bike|v[ée]lo|assault|echo/.test(w)) return 'Bike';
    if(/row|rameur/.test(w)) return 'Row';
    if(/ski/.test(w)) return 'Ski';
    if(/run|course/.test(w)) return 'Run';
    return '';
  }

  // ── Morceaux machine prévus dans le texte du WOD ─────────────────────────
  // Seule la forme « <durée> min <machine> » compte : « 12 cal Row » dans un
  // AMRAP est une quantité imposée, pas un effort à mesurer.
  var SEG_RE = /(\d+(?:[.,]\d+)?)\s*(?:min(?:utes?)?)\b\.?\s*(?:de\s+|d['’]\s*|au\s+|en\s+)?(assault\s*bike|echo\s*bike|bike|v[ée]lo|rameur|row(?:er|ing)?|ski\s*-?\s*erg|ski|run|course)\b/gi;
  function parseSegments(text){
    var t = clean(text);
    var out = [];
    if(!t) return out;
    var m, lastEnd = 0;
    SEG_RE.lastIndex = 0;
    while((m = SEG_RE.exec(t))){
      var machine = machineOf(m[2]);
      if(!machine) continue;
      out.push({machine:machine, minutes:num(m[1]), unit:DEFAULT_UNIT[machine]});
      lastEnd = SEG_RE.lastIndex;
    }
    // « 5 min Bike puis 5 min Row, 2 fois » : la séquence se répète.
    if(out.length){
      var rep = /^\s*[,;]?\s*(\d)\s*fois/i.exec(t.slice(lastEnd, lastEnd + 16));
      var times = rep ? Number(rep[1]) : 1;
      if(times > 1 && times <= 6){
        var base = out.slice();
        for(var i = 1; i < times; i++) out = out.concat(base.map(function(s){ return {machine:s.machine, minutes:s.minutes, unit:s.unit}; }));
      }
    }
    return out;
  }

  // ── Texte durable ↔ morceaux ─────────────────────────────────────────────
  function serialize(rows){
    return (rows || []).filter(function(r){ return r && num(r.value) && MACHINES.indexOf(r.machine) >= 0; })
      .map(function(r){
        var unit = UNITS.indexOf(r.unit) >= 0 ? r.unit : DEFAULT_UNIT[r.machine];
        return r.machine + (num(r.minutes) ? ' ' + fmt(num(r.minutes)).replace(',', '.') + ' min' : '') + ' ' + Math.round(num(r.value)) + ' ' + unit;
      }).join(' · ');
  }
  var PIECE_RE = /^(bike|row|ski|run)\s+(?:(\d+(?:[.,]\d+)?)\s*min\s+)?(\d+(?:[.,]\d+)?)\s*(cal|m)$/i;
  function parse(text){
    var out = [];
    clean(text).split(/\s*[·;]\s*/).forEach(function(piece){
      var m = PIECE_RE.exec(clean(piece));
      if(!m) return;
      var machine = machineOf(m[1]);
      out.push({machine:machine, minutes:num(m[2]), value:num(m[3]), unit:m[4].toLowerCase()});
    });
    return out;
  }

  // Valeurs d'une séance d'avant ce module, lues dans la note (voir en-tête).
  function fromNote(row){
    if(!row) return [];
    var segs = parseSegments(row.wodText);
    var note = clean(row.note);
    if(!segs.length || !/cal/i.test(note)) return [];
    var nums = note.match(/\d+(?:[.,]\d+)?/g) || [];
    if(nums.length !== segs.length) return [];
    return segs.map(function(s, i){ return {machine:s.machine, minutes:s.minutes, value:num(nums[i]), unit:'cal'}; })
      .filter(function(r){ return r.value; });
  }

  function rowsOf(row){
    if(!row) return {rows:[], fromNote:false};
    if(clean(row.skipped) === '1') return {rows:[], fromNote:false};
    var rows = parse(row.cardio);
    if(rows.length) return {rows:rows, fromNote:false};
    rows = fromNote(row);
    return {rows:rows, fromNote:rows.length > 0};
  }

  // ── Moyennes et capacité ─────────────────────────────────────────────────
  function historyEntries(){
    try{ var st = window.state; return (st && Array.isArray(st.history)) ? st.history : []; }
    catch(e){ return []; }
  }
  // Par machine + unité : rythme moyen pondéré (total / minutes), meilleur
  // rythme (la capacité observée), dernier passage. Un morceau sans durée
  // compte dans les totaux mais pas dans les rythmes.
  function stats(history){
    var by = {};
    (history || historyEntries()).forEach(function(entry){
      var results = (entry && entry.results) || {};
      Object.keys(results).forEach(function(key){
        if(clean(key).indexOf('wod_') !== 0) return;
        var got = rowsOf(results[key]);
        got.rows.forEach(function(r){
          var id = r.machine + '|' + r.unit;
          var s = by[id] || (by[id] = {machine:r.machine, unit:r.unit, sessions:{}, value:0, minutes:0, best:0, last:null, fromNote:false, pieces:0});
          s.sessions[clean(entry.date) + '|' + key] = true;
          s.pieces++;
          if(got.fromNote) s.fromNote = true;
          if(!num(r.minutes)) return;
          var rate = r.value / r.minutes;
          s.value += r.value; s.minutes += r.minutes;
          if(rate > s.best) s.best = rate;
          s.last = {date:clean(entry.date), value:r.value, minutes:r.minutes, rate:rate};
        });
      });
    });
    return Object.keys(by).map(function(id){
      var s = by[id];
      return {machine:s.machine, unit:s.unit, sessions:Object.keys(s.sessions).length, pieces:s.pieces,
              avgRate:s.minutes ? s.value / s.minutes : 0, bestRate:s.best, last:s.last, fromNote:s.fromNote};
    });
  }
  function statFor(list, machine, unit){
    for(var i = 0; i < list.length; i++) if(list[i].machine === machine && list[i].unit === unit) return list[i];
    return null;
  }
  function split500(rate){ // m/min → temps au 500 m
    if(!rate) return '';
    var sec = Math.round(500 / rate * 60);
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2) + ' /500 m';
  }
  function rateText(rate, unit, machine){
    if(!rate) return '';
    if(unit === 'm') return Math.round(rate) + ' m/min' + ((machine === 'Row' || machine === 'Ski') ? ' (' + split500(rate) + ')' : '');
    return fmt(rate) + ' cal/min';
  }

  // Lignes pour le contexte de Coach IA (scripts/coach_ai/context.js).
  function contextLines(history){
    var list = stats(history).filter(function(s){ return s.avgRate; });
    if(!list.length) return [];
    var lines = ['', '## Repères cardio (machines)',
      'Rythme moyen = total ÷ minutes, sur les morceaux chronométrés des conditionnements. Mesure seulement : aucune charge n\'en dépend.'];
    list.forEach(function(s){
      lines.push('- ' + MACHINE_LABELS[s.machine] + ' (' + s.unit + ') : ' + rateText(s.avgRate, s.unit, s.machine) + ' en moyenne sur ' + s.sessions + ' séance' + (s.sessions > 1 ? 's' : '') +
        ', meilleur ' + rateText(s.bestRate, s.unit, s.machine) +
        (s.last ? ' ; dernier : ' + Math.round(s.last.value) + ' ' + s.unit + ' en ' + fmt(s.last.minutes) + ' min le ' + s.last.date : '') +
        (s.fromNote ? ' (en partie lu dans les notes)' : '') + '.');
    });
    return lines;
  }

  // ── Fin de collecte ──────────────────────────────────────────────────────
  // Normalise le champ, et donne un score aux WOD qui n'en avaient pas (un
  // moteur aérobie n'a ni rounds ni temps) : l'historique, le résumé et Coach
  // IA lisent `result`. Un score AMRAP / For Time existant n'est JAMAIS
  // remplacé — `cardio` reste alors à côté, dans son propre champ.
  function finalizeResults(results){
    Object.keys(results || {}).forEach(function(key){
      if(clean(key).indexOf('wod_') !== 0) return;
      var row = results[key];
      if(!row || row.cardio === undefined) return;
      var text = serialize(parse(row.cardio));
      if(!text){ delete row.cardio; return; }
      row.cardio = text;
      var res = clean(row.result);
      if(!res) row.result = text;
      else if(res === 'EMOM complété') row.result = res + ' · ' + text;
    });
    return results;
  }

  // ── Surface de saisie ────────────────────────────────────────────────────
  // Rendue sur la carte WOD de l'écran résultats et dans l'édition d'une
  // séance passée. Un champ caché `data-field="cardio"` porte le texte
  // durable : c'est le canal que lisent les deux collectes.
  var drafts = {};

  function initialRows(key, opts){
    opts = opts || {};
    var segs = parseSegments(opts.wodText);
    var saved = parse(opts.saved);
    if(!saved.length && opts.row) saved = fromNote(opts.row);
    var rows = segs.map(function(s){ return {machine:s.machine, minutes:s.minutes, value:0, unit:s.unit, planned:true}; });
    // Fusion dans l'ordre : chaque valeur enregistrée retrouve son morceau.
    var i = 0;
    saved.forEach(function(r){
      while(i < rows.length && !(rows[i].machine === r.machine && rows[i].minutes === r.minutes)) i++;
      if(i < rows.length){ rows[i].value = r.value; rows[i].unit = r.unit; i++; }
      else rows.push({machine:r.machine, minutes:r.minutes, value:r.value, unit:r.unit, planned:false});
    });
    return rows;
  }

  function hasPlan(wodText){ return parseSegments(wodText).length > 0; }

  function controlHtml(key, opts){
    opts = opts || {};
    drafts[key] = initialRows(key, opts);
    var open = drafts[key].length > 0;
    return '<div class="wcd" data-wcd-key="' + esc(key) + '">' +
      '<span class="sf-label" style="margin-top:12px">CARDIO — calories ou mètres</span>' +
      '<div class="wcd-rows"></div>' +
      '<button type="button" class="wcd-add">+ ' + (open ? 'Ajouter une machine' : 'Noter des calories / mètres') + '</button>' +
      '<div class="wcd-sum"></div>' +
      '<input class="sf-input" type="hidden" data-key="' + esc(key) + '" data-field="cardio" value="' + esc(serialize(drafts[key])) + '"/>' +
    '</div>';
  }

  function optionList(list, current, labels){
    return list.map(function(v){ return '<option value="' + v + '"' + (v === current ? ' selected' : '') + '>' + esc(labels ? labels[v] : v) + '</option>'; }).join('');
  }

  function bind(key, scope, opts){
    opts = opts || {};
    var root = null;
    Array.prototype.forEach.call((scope || document).querySelectorAll('.wcd[data-wcd-key]'), function(el){
      if(el.getAttribute('data-wcd-key') === key) root = el;
    });
    if(!root) return;
    var rowsHost = root.querySelector('.wcd-rows');
    var sumHost = root.querySelector('.wcd-sum');
    var hidden = root.querySelector('input[data-field="cardio"]');
    var known = stats();

    function commit(){
      var text = serialize(drafts[key]);
      if(hidden) hidden.value = text;
      if(opts.onChange) try{ opts.onChange(text); }catch(e){}
      renderSum();
    }

    function renderSum(){
      var rows = drafts[key] || [];
      var totals = {}, perMachine = {};
      rows.forEach(function(r){
        if(!num(r.value)) return;
        totals[r.unit] = (totals[r.unit] || 0) + num(r.value);
        if(num(r.minutes)){
          var id = r.machine + '|' + r.unit;
          var p = perMachine[id] || (perMachine[id] = {machine:r.machine, unit:r.unit, value:0, minutes:0});
          p.value += num(r.value); p.minutes += num(r.minutes);
        }
      });
      var html = '';
      var tot = Object.keys(totals).map(function(u){ return Math.round(totals[u]) + ' ' + u; });
      if(tot.length){
        html += '<div class="wcd-sum-line"><strong>Total ' + esc(tot.join(' + ')) + '</strong>';
        Object.keys(perMachine).forEach(function(id){
          var p = perMachine[id];
          html += ' · ' + esc(MACHINE_LABELS[p.machine]) + ' ' + esc(rateText(p.value / p.minutes, p.unit, p.machine));
        });
        html += '</div>';
      }
      // Repères : ce que l'athlète a déjà fait sur ces machines.
      var seen = {};
      rows.forEach(function(r){
        var id = r.machine + '|' + r.unit;
        if(seen[id]) return; seen[id] = true;
        var s = statFor(known, r.machine, r.unit);
        if(!s || !s.avgRate) return;
        html += '<div class="wcd-ref">Ta moyenne ' + esc(MACHINE_LABELS[r.machine]) + ' : <strong>' + esc(rateText(s.avgRate, s.unit, s.machine)) + '</strong>' +
          ' · meilleur ' + esc(rateText(s.bestRate, s.unit, s.machine)) +
          ' (' + s.sessions + ' séance' + (s.sessions > 1 ? 's' : '') + ')</div>';
      });
      sumHost.innerHTML = html;
    }

    function expected(r){
      var s = statFor(known, r.machine, r.unit);
      return (s && s.avgRate && num(r.minutes)) ? String(Math.round(s.avgRate * num(r.minutes))) : r.unit;
    }

    function renderRows(){
      var rows = drafts[key] || [];
      rowsHost.innerHTML = rows.map(function(r, i){
        return '<div class="wcd-row" data-i="' + i + '">' +
          '<select class="wcd-machine" aria-label="Machine">' + optionList(MACHINES, r.machine, MACHINE_LABELS) + '</select>' +
          '<input class="wcd-min" type="number" inputmode="decimal" min="0" step="0.5" aria-label="Minutes" placeholder="min" value="' + (num(r.minutes) ? esc(fmt(r.minutes).replace(',', '.')) : '') + '"/>' +
          '<span class="wcd-unit-txt">min</span>' +
          '<input class="wcd-val" type="number" inputmode="numeric" min="0" step="1" aria-label="Valeur" placeholder="' + esc(expected(r)) + '" value="' + (num(r.value) ? Math.round(num(r.value)) : '') + '"/>' +
          '<select class="wcd-unit" aria-label="Unité">' + optionList(UNITS, r.unit) + '</select>' +
          (r.planned ? '' : '<button type="button" class="wcd-del" aria-label="Retirer">✕</button>') +
        '</div>';
      }).join('');
      Array.prototype.forEach.call(rowsHost.querySelectorAll('.wcd-row'), function(el){
        var r = rows[Number(el.getAttribute('data-i'))];
        var mSel = el.querySelector('.wcd-machine'), minInp = el.querySelector('.wcd-min');
        var valInp = el.querySelector('.wcd-val'), uSel = el.querySelector('.wcd-unit');
        mSel.addEventListener('change', function(){ r.machine = mSel.value; valInp.placeholder = expected(r); commit(); });
        uSel.addEventListener('change', function(){ r.unit = uSel.value; valInp.placeholder = expected(r); commit(); });
        minInp.addEventListener('input', function(){ r.minutes = num(minInp.value); valInp.placeholder = expected(r); commit(); });
        valInp.addEventListener('input', function(){ r.value = num(valInp.value); commit(); });
        var del = el.querySelector('.wcd-del');
        if(del) del.addEventListener('click', function(){ rows.splice(rows.indexOf(r), 1); renderRows(); commit(); });
      });
    }

    root.querySelector('.wcd-add').addEventListener('click', function(){
      var rows = drafts[key] || (drafts[key] = []);
      var prev = rows[rows.length - 1];
      var machine = prev ? prev.machine : 'Bike';
      rows.push({machine:machine, minutes:0, value:0, unit:prev ? prev.unit : DEFAULT_UNIT[machine], planned:false});
      renderRows(); commit();
      var last = rowsHost.querySelector('.wcd-row:last-child .wcd-min');
      if(last) try{ last.focus(); }catch(e){}
    });

    renderRows();
    renderSum();
  }

  // « 211 cal » ou « 160 cal + 2000 m » : le total d'un texte durable.
  function totalText(text){
    var totals = {};
    parse(text).forEach(function(r){ totals[r.unit] = (totals[r.unit] || 0) + r.value; });
    return Object.keys(totals).map(function(u){ return Math.round(totals[u]) + ' ' + u; }).join(' + ');
  }

  // ── Saisie PENDANT la séance guidée ─────────────────────────────────────
  // Attendre l'écran résultats, c'est oublier les chiffres du premier morceau.
  // Petit bouton « Cardio » dans la ligne du kicker WOD (même gabarit que
  // Histo et Notes : aucune rangée ajoutée, le chrono garde sa taille). Il
  // ouvre la même saisie dans une modale et écrit dans guidedResultCache, sous
  // la clé de la ligne WOD : l'écran résultats la retrouve, pré-remplie.
  function guidedRead(key){
    try{ return typeof getGuidedResult === 'function' ? clean(getGuidedResult(key, 'cardio', '')) : ''; }
    catch(e){ return ''; }
  }
  function badgeCount(key){ return parse(guidedRead(key)).length; }

  function buttonHtml(key, wodText){
    key = clean(key);
    if(!key) return '';
    var count = badgeCount(key);
    var label = 'Calories / mètres du cardio';
    return "<button type='button' class='gvn-btn-mini wcd-btn" + (count ? " has-notes" : "") + "'"
      + " data-wcd-open='1' data-wcd-btn-key='" + esc(key) + "' data-wcd-text='" + esc(wodText) + "'"
      + " aria-label='" + esc(label) + "' title='" + esc(label) + "'>"
      + "<span class='gvn-mini-ico' aria-hidden='true'>∑</span>"
      + "<span class='gvn-mini-label'>Cardio</span>"
      + (count ? "<span class='gvn-mini-count'>" + count + "</span>" : "")
      + "</button>";
  }

  function refreshButtons(key){
    Array.prototype.forEach.call(document.querySelectorAll('[data-wcd-btn-key]'), function(btn){
      if(btn.getAttribute('data-wcd-btn-key') !== key) return;
      var count = badgeCount(key);
      btn.classList.toggle('has-notes', count > 0);
      var badge = btn.querySelector('.gvn-mini-count');
      if(count){
        if(!badge){ badge = document.createElement('span'); badge.className = 'gvn-mini-count'; btn.appendChild(badge); }
        badge.textContent = String(count);
      } else if(badge && badge.parentNode){ badge.parentNode.removeChild(badge); }
    });
  }

  function closeModal(){
    var modal = document.getElementById('wcdModal');
    if(!modal) return;
    modal.classList.remove('visible');
    setTimeout(function(){
      modal.remove();
      try{ if(typeof unlockBodyScrollForModal === 'function') unlockBodyScrollForModal(); }catch(e){}
    }, 220);
  }

  function openModal(key, wodText){
    var existing = document.getElementById('wcdModal');
    if(existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'wcdModal';
    modal.className = 'tuto-modal wcd-modal';
    modal.innerHTML = "<div class='tuto-modal-inner'>"
      + "<div class='tuto-topline'>CARDIO DE LA SÉANCE</div>"
      + controlHtml(key, {wodText: wodText, saved: guidedRead(key)})
      + "<div class='wcd-hint'>Note chaque machine en finissant ton morceau : tout se retrouve dans Résultats.</div>"
      + "<button type='button' id='wcdCloseBtn' class='btn-accent' style='width:100%;margin-top:14px'>OK</button>"
      + "</div>";
    document.body.appendChild(modal);
    try{ if(typeof lockBodyScrollForModal === 'function') lockBodyScrollForModal(); }catch(e){}
    setTimeout(function(){ modal.classList.add('visible'); }, 20);
    bind(key, modal, {onChange: function(text){
      try{ if(typeof setGuidedResult === 'function') setGuidedResult(key, 'cardio', text); }catch(e){}
      refreshButtons(key);
    }});
    document.getElementById('wcdCloseBtn').onclick = closeModal;
    modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
  }

  // Délégation globale : la carte WOD est reconstruite à chaque rendu de bloc.
  try{
    document.addEventListener('click', function(e){
      var t = e && e.target;
      if(!t || !t.closest) return;
      var btn = t.closest('[data-wcd-open]');
      if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      openModal(btn.getAttribute('data-wcd-btn-key'), btn.getAttribute('data-wcd-text') || '');
    }, false);
  }catch(e){ /* hors navigateur (suites dev/) */ }

  api.buttonHtml = buttonHtml;
  api.openModal = openModal;
  api.totalText = totalText;
  api.MACHINES = MACHINES;
  api.UNITS = UNITS;
  api.parseSegments = parseSegments;
  api.hasPlan = hasPlan;
  api.serialize = serialize;
  api.parse = parse;
  api.fromNote = fromNote;
  api.rowsOf = rowsOf;
  api.stats = stats;
  api.rateText = rateText;
  api.contextLines = contextLines;
  api.finalizeResults = finalizeResults;
  api.controlHtml = controlHtml;
  api.bind = bind;
  window.CoachWodCardio = api;
})();

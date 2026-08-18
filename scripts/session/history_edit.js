// Racine — édition d'une séance déjà enregistrée (domaine session).
//
// Le journal brut (state.history) est la source de vérité : on corrige une
// entrée existante EN PLACE, puis on reconstruit l'état dérivé complet avec
// rebuildRefsFromHistory() — jamais l'inverse. Aucune ligne n'est inventée :
// seuls les mouvements réellement enregistrés ce jour-là sont éditables.
//
// L'écran est celui des résultats (#resultsView) : mêmes cartes, mêmes
// contrôles − valeur +, même arrondi d'équipement. Seules les valeurs sont
// pré-remplies depuis l'historique au lieu de la séance du jour.
//
// Limite assumée : l'agrégat mensuel de La Saison (state.longTerm, écrit par
// CoachRetention.recordSession) est un compteur cumulatif non rejouable. Une
// correction de séance ne le réécrit pas — le rejouer entièrement ajouterait
// aussi les séances antérieures à cette couche, ce qui dépasse la correction
// demandée. Les charges, l'athlete_state et les RPE, eux, sont reconstruits.
(function(){
  var editing = null; // {index, entry, cache} — null hors mode édition

  function $id(id){ return document.getElementById(id); }
  function esc(v){ return typeof escHtml === 'function' ? escHtml(v) : String(v === undefined || v === null ? '' : v); }
  function txt(v){ return String(v === undefined || v === null ? '' : v).trim(); }
  function num(v){ var n = Number(v); return isFinite(n) ? n : 0; }

  function historyList(){
    return (window.state && Array.isArray(state.history)) ? state.history : null;
  }
  function entryAt(index){
    var list = historyList();
    index = Number(index);
    if(!list || isNaN(index) || index < 0 || index >= list.length) return null;
    return list[index];
  }
  function entryResults(entry){
    return (entry && (entry.results || entry.resultats)) || {};
  }
  function entryTitle(entry){
    if(!entry) return '';
    var dayKey = entry.day || entry.jour;
    var dayLabel = (dayKey && typeof baseDays !== 'undefined' && baseDays && baseDays[dayKey]) ? baseDays[dayKey].label : (dayKey || '');
    var week = entry.week || entry.semaine;
    return [dayLabel, week ? 'S' + week : '', entry.focus || ''].filter(Boolean).join(' — ');
  }
  function movementName(key){
    var name = key;
    try{
      if(typeof movementLabelFromKeyOrName === 'function') name = movementLabelFromKeyOrName(key) || key;
      if(typeof displayMovementName === 'function') name = displayMovementName(name);
    }catch(e){ name = key; }
    return name || key;
  }

  // Une ligne « texte » (WOD, EMOM, for time) n'a pas de charge : elle se
  // corrige avec son résultat écrit, pas avec des poids/reps.
  function isTextRow(row){
    if(!row) return false;
    if(row.isWod) return true;
    var hasLoad = row.load !== undefined && row.load !== null && String(row.load).trim() !== '';
    if(hasLoad) return false;
    return row.result !== undefined || row.reps === undefined;
  }

  function setStatus(text, kind){
    var el = $id('saveStatus');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'session-note' + (kind ? ' ' + kind : '');
  }
  function setHistoryStatus(text, kind){
    var el = $id('historyStatus');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'status-msg' + (kind ? ' ' + kind : '');
  }

  // ── Chrome de la vue résultats ────────────────────────────────────────────
  // Même écran, deux intentions : saisir la séance du jour, ou corriger une
  // séance passée. Les libellés doivent dire laquelle est en cours, sinon on
  // croit écraser aujourd'hui.
  var CHROME_DEFAULTS = null;
  function chrome(on, entry){
    var topTitle = document.querySelector('#resultsView .results-topbar-title');
    var topBack = $id('resultsBackPcTopBtn');
    var title = document.querySelector('#resultsView .session-title');
    var sub = document.querySelector('#resultsView .session-sub');
    var save = $id('saveSessionBtn');
    var back = $id('sessionBackPcBtn');
    if(!CHROME_DEFAULTS){
      CHROME_DEFAULTS = {
        topTitle: topTitle ? topTitle.textContent : '',
        topBack: topBack ? topBack.textContent : '',
        title: title ? title.textContent : '',
        sub: sub ? sub.textContent : '',
        save: save ? save.textContent : '',
        back: back ? back.textContent : ''
      };
    }
    if(on){
      var when = (entry && entry.date) ? entry.date : 'séance enregistrée';
      if(topTitle) topTitle.textContent = 'Modifier · ' + when;
      if(topBack) topBack.textContent = '← Retour Historique';
      if(title) title.textContent = '✏️ Modifier une séance passée';
      if(sub) sub.textContent = 'Corrige ce qui a été mal noté · vide un champ pour l’effacer';
      if(save) save.textContent = '💾 Mettre à jour la séance';
      if(back) back.textContent = '← Retour Historique';
    }else{
      if(topTitle) topTitle.textContent = CHROME_DEFAULTS.topTitle;
      if(topBack) topBack.textContent = CHROME_DEFAULTS.topBack;
      if(title) title.textContent = CHROME_DEFAULTS.title;
      if(sub) sub.textContent = CHROME_DEFAULTS.sub;
      if(save) save.textContent = CHROME_DEFAULTS.save;
      if(back) back.textContent = CHROME_DEFAULTS.back;
    }
    document.body.classList.toggle('history-edit-active', !!on);
  }

  // ── Rendu des cartes ──────────────────────────────────────────────────────
  function noteField(card, key, value){
    if(!card) return;
    var wrap = document.createElement('div');
    wrap.className = 'results-step-control history-edit-note';
    wrap.innerHTML =
      '<span class="sf-label">NOTE</span>' +
      '<input class="sf-input" data-key="' + esc(key) + '" data-field="note" type="text" inputmode="text" ' +
        'placeholder="ex : dos rond sur la dernière" value="' + esc(value || '') + '"/>';
    card.appendChild(wrap);
  }

  function loadItem(key, row){
    var planned = row.planned || {};
    var reps = num(row.reps) || num(planned.reps) || num(planned.targetMin);
    var min = num(planned.targetMin) || reps;
    var max = num(planned.targetMax) || min;
    if(max < min) max = min;
    return {
      key: key,
      name: movementName(key),
      suggested: planned.load || row.load || '',
      format: planned.format || '',
      kind: planned.kind || '',
      targetMin: min,
      targetMax: max,
      note: '',
      text: '',
      isWod: false,
      isExtra: false
    };
  }

  // Temps de round enregistrés par le chrono. Ils étaient conservés dans le
  // journal mais invisibles ici : une séance corrigée les gardait sans jamais
  // les montrer. Ils s'affichent avec leurs couleurs, et restent corrigeables
  // en texte — même format que le chrono (« 1:10 / 2:05 / 1:00 »), donc un tap
  // manqué se rattrape aussi des semaines plus tard.
  function roundsField(card, key, row){
    if(!card) return;
    var splits = txt(row.roundSplits);
    if(!splits) return;
    var wrap = document.createElement('div');
    wrap.className = 'results-step-control history-edit-rounds';
    var preview = '';
    try{
      if(window.CoachAmrapRounds && CoachAmrapRounds.historyHtml){
        preview = CoachAmrapRounds.historyHtml(splits, row.lastRoundRemaining);
      }
    }catch(e){ preview = ''; }
    wrap.innerHTML =
      '<span class="sf-label">TEMPS DES ROUNDS</span>' + preview +
      '<input class="sf-input" data-key="' + esc(key) + '" data-field="roundSplits" type="text" inputmode="text" ' +
        'placeholder="ex : 1:10 / 2:05 / 1:00" value="' + esc(splits) + '"/>';
    card.appendChild(wrap);
  }

  function textCard(key, row, container){
    var card = document.createElement('div');
    card.className = 'sf-card';
    card.innerHTML =
      '<div class="sf-header">' +
        '<div class="sf-name">' + esc(movementName(key)) + '</div>' +
      '</div>' +
      '<span class="sf-label">RÉSULTAT</span>' +
      '<input class="sf-input" data-key="' + esc(key) + '" data-field="result" type="text" inputmode="text" ' +
        'placeholder="ex : 5 rounds + 8 burpees" value="' + esc(row.result || '') + '"/>' +
      '<div class="results-step-control history-edit-rpe">' +
        '<span class="sf-label">RPE</span>' +
        '<input class="sf-input results-mini-input" data-key="' + esc(key) + '" data-field="rpe" ' +
          'type="number" inputmode="decimal" min="1" max="10" step="0.5" value="' + esc(row.rpe || '') + '"/>' +
      '</div>';
    container.appendChild(card);
    roundsField(card, key, row);
    noteField(card, key, row.note);
    return card;
  }

  function renderFields(){
    var container = $id('sessionFields');
    if(!container || !editing) return;
    var entry = editing.entry;
    var results = entryResults(entry);
    container.innerHTML = '';

    var banner = document.createElement('div');
    banner.className = 'history-edit-banner';
    banner.innerHTML =
      '<div class="history-edit-banner-date">' + esc(entry.date || '') + '</div>' +
      '<div class="history-edit-banner-title">' + esc(entryTitle(entry)) + '</div>' +
      '<p>Séance déjà enregistrée. Les charges suggérées seront recalculées à partir des valeurs corrigées.</p>';
    container.appendChild(banner);

    var keys = Object.keys(results);
    if(!keys.length){
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Aucun résultat enregistré pour cette séance.';
      container.appendChild(empty);
      return;
    }

    keys.forEach(function(key){
      var row = results[key] || {};
      if(isTextRow(row)){
        textCard(key, row, container);
        return;
      }
      var card = (typeof appendSessionEntryCard === 'function')
        ? appendSessionEntryCard(loadItem(key, row), container)
        : null;
      noteField(card, key, row.note);
    });
  }

  // ── Collecte + fusion ─────────────────────────────────────────────────────
  // Lecture directe du DOM : contrairement à collectSessionResults(), un champ
  // vidé doit être vu comme un effacement volontaire, pas comme une absence.
  function collectFields(){
    var out = {};
    var scope = $id('sessionFields');
    if(!scope) return out;
    Array.prototype.forEach.call(scope.querySelectorAll('.sf-input[data-key][data-field]'), function(inp){
      var key = inp.getAttribute('data-key');
      var field = inp.getAttribute('data-field');
      if(!key || !field) return;
      if(!out[key]) out[key] = {};
      out[key][field] = txt(inp.value);
    });
    return out;
  }

  function reclassify(row){
    if(!row || !row.planned) return;
    if(row.load === undefined || row.load === null || String(row.load).trim() === '') return;
    try{
      if(window.CoachCharge && typeof window.CoachCharge.classifyResult === 'function'){
        window.CoachCharge.classifyResult(row, row.planned);
      }
    }catch(e){ /* la correction du journal ne dépend pas du classement */ }
  }

  // Fusion pure (aucun DOM) : les valeurs saisies écrasent le journal ligne à
  // ligne, sans jamais toucher aux champs non édités (planned, extra, etc.).
  // Testée par dev/history_edit_checks.js.
  function mergeInto(stored, edited){
    var changed = false;
    Object.keys(edited || {}).forEach(function(key){
      var row = (stored || {})[key];
      if(!row) return; // aucune ligne inventée : on ne corrige que l'existant
      var fields = edited[key] || {};
      Object.keys(fields).forEach(function(field){
        var value = txt(fields[field]);
        if(value === ''){
          if(row[field] !== undefined && row[field] !== ''){ delete row[field]; changed = true; }
          return;
        }
        if(txt(row[field]) !== value){ row[field] = value; changed = true; }
      });
      reclassify(row);
    });
    return changed;
  }

  function applyEdits(){
    return mergeInto(entryResults(editing.entry), collectFields());
  }

  // ── Cycle de vie ──────────────────────────────────────────────────────────
  function start(index){
    var entry = entryAt(index);
    if(!entry) return false;
    if(!Object.keys(entryResults(entry)).length){
      setHistoryStatus('Cette séance ne contient aucun résultat à modifier.', 'err');
      return false;
    }
    // Le cache de la séance en cours est mis de côté, jamais mélangé à
    // l'édition d'une séance passée — il est restauré à la sortie.
    editing = { index: Number(index), entry: entry, cache: window.guidedResultCache || {} };
    window.guidedResultCache = {};

    var results = entryResults(entry);
    Object.keys(results).forEach(function(key){
      var row = results[key] || {};
      ['load', 'reps', 'rpe', 'note', 'result'].forEach(function(field){
        if(row[field] === undefined || row[field] === null) return;
        if(typeof setGuidedResult === 'function') setGuidedResult(key, field, row[field]);
      });
    });

    chrome(true, entry);
    if(typeof switchView === 'function') switchView('results');
    else renderFields();
    setStatus('');
    var host = $id('sessionEntry');
    if(host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function exit(){
    var cache = editing ? editing.cache : null;
    editing = null;
    window.guidedResultCache = cache || {};
    chrome(false, null);
  }

  function cancel(){
    if(!editing) return false;
    exit();
    if(typeof switchView === 'function') switchView('history');
    return true;
  }

  function commit(){
    if(!editing) return false;
    var entry = editing.entry;
    var when = entry.date || '';
    var changed = false;
    try{
      changed = applyEdits();
    }catch(e){
      if(typeof coachLogError === 'function') coachLogError('historyEditCommit', e);
      setStatus('Erreur inattendue : ' + (e && e.message ? e.message : String(e)), 'err');
      return false;
    }
    if(!changed){
      setStatus('Aucune modification à enregistrer.', '');
      return false;
    }
    // Journal brut corrigé → tout l'état dérivé est reconstruit depuis lui.
    if(typeof rebuildRefsFromHistory === 'function') rebuildRefsFromHistory();
    if(typeof window.save === 'function') window.save();
    exit();
    if(typeof renderHistory === 'function') renderHistory();
    if(typeof renderWorkout === 'function') renderWorkout();
    if(typeof renderReferences === 'function') renderReferences();
    if(typeof renderWeekProgress === 'function') renderWeekProgress();
    if(typeof switchView === 'function') switchView('history');
    setHistoryStatus('✅ Séance du ' + when + ' mise à jour. Charges recalculées.', 'ok');
    return true;
  }

  window.CoachHistoryEdit = Object.assign(window.CoachHistoryEdit || {}, {
    isActive: function(){ return !!editing; },
    editingIndex: function(){ return editing ? editing.index : -1; },
    start: start,
    renderFields: renderFields,
    commit: commit,
    cancel: cancel,
    mergeInto: mergeInto
  });
})();

// Racine V4.4 — La Saison : bandeau fin de cycle, écran de choix, frise.
// Bandeau persistant (jamais de popup surprise) quand le cycle est terminé ;
// écran Fin de cycle = bilan + 2-3 propositions expliquées + choix un tap ;
// frise verticale du parcours dans l'onglet Cycle.
// Dépend des globaux d'app.js à l'exécution seulement (state, focusConfigs,
// snapshotCurrentCycle, applyCycleStartDate…) — jamais au chargement.

(function(){
  var api = window.CoachSeasonUI = window.CoachSeasonUI || {};

  function esc(v){ return (window.CoachUI && CoachUI.escapeHtml) ? CoachUI.escapeHtml(v) : String(v == null ? "" : v); }
  function indexEntry(id){
    return (window.COACH_BERTIN_PROGRAM_INDEX || []).find(function(p){ return p && p.id === id; }) || null;
  }
  function programLabel(id){
    var cfg = window.focusConfigs && focusConfigs[id];
    if(cfg && cfg.label) return cfg.label;
    var entry = indexEntry(id);
    return (entry && entry.name) || id;
  }
  function activeDaysCount(){
    var cfg = (typeof focus === "function") ? focus() : null;
    return (cfg && cfg.days && cfg.days.length) || 4;
  }

  // Pure : testée par dev/season_checks (statique) et utilisée par renderBanner.
  api.shouldShowBanner = function(state, totalWeeksCount, daysCount){
    return !!(window.CoachSeason && CoachSeason.isCycleFinished(state, totalWeeksCount, daysCount));
  };

  // ── Bandeau vue WOD ────────────────────────────────────────────────────────
  api.renderBanner = function(){
    var host = document.getElementById("seasonBanner");
    if(!host || typeof state !== "object") return;
    if(!api.shouldShowBanner(state, (typeof totalWeeks === "function") ? totalWeeks() : 4, activeDaysCount())){
      host.innerHTML = "";
      host.classList.remove("season-banner-visible");
      return;
    }
    host.classList.add("season-banner-visible");
    host.innerHTML =
      '<div class="season-banner">'+
        '<div class="season-banner-text"><strong>Cycle terminé 🎉</strong><br><span>Beau travail. La suite se prépare quand tu veux.</span></div>'+
        '<button type="button" class="btn-accent season-banner-btn" id="seasonOpenBtn">Préparer la suite</button>'+
      '</div>';
    var btn = document.getElementById("seasonOpenBtn");
    if(btn) btn.onclick = function(){ api.openEndOfCycle(); };
  };

  // ── Propositions (candidats déjà filtrés par visibilité/permissions) ──────
  function buildPropositions(){
    if(!window.CoachSuggest) return [];
    var ids = (typeof programIndexIds === "function") ? programIndexIds() : [];
    var candidates = ids.map(indexEntry).filter(Boolean);
    var ended = indexEntry(state.cycle && state.cycle.goal) || { id: state.cycle && state.cycle.goal };
    return CoachSuggest.propositions({
      candidates: candidates,
      endedProgram: ended,
      trainingGoal: state.profile && state.profile.trainingGoal,
      season: state.season,
      recentAvgRpe: CoachSuggest.recentAvgRpe(state, (typeof todayIsoDate === "function") ? todayIsoDate() : "")
    });
  }

  // ── Écran Fin de cycle ─────────────────────────────────────────────────────
  function closeSeasonGate(){
    var g = document.getElementById("seasonGate");
    if(g) g.remove();
  }

  api.openEndOfCycle = function(){
    if(typeof state !== "object") return;
    closeSeasonGate();
    var today = (typeof todayIsoDate === "function") ? todayIsoDate() : "";
    var startIso = state.activeCycleStartDate || null;
    var prCount = window.CoachSeason ? CoachSeason.countPrs(state, startIso, today) : 0;
    var goalMissing = !(state.profile && state.profile.trainingGoal);
    var props = buildPropositions();

    var goals = window.CoachSeasonGoals;
    var goalHtml = "";
    if(goalMissing && goals){
      goalHtml =
        '<div class="season-goal-ask">'+
          '<label>Avant de choisir : pourquoi t\'entraînes-tu ?</label>'+
          '<select id="seasonGoalSelect" class="select-field">'+
            '<option value="" selected>— Passer cette question —</option>'+
            goals.KEYS.map(function(k){ return '<option value="'+k+'">'+esc(goals.LABELS[k])+'</option>'; }).join("")+
          '</select>'+
        '</div>';
    }

    var propsHtml = props.length
      ? props.map(function(p){
          return '<div class="season-prop">'+
            '<div class="season-prop-info"><strong>'+esc(p.name)+'</strong><br><span class="season-prop-reason">'+esc(p.reason)+'</span></div>'+
            '<button type="button" class="btn-accent season-start-btn" data-season-start="'+esc(p.id)+'">Démarrer</button>'+
          '</div>';
        }).join("")
      : '<p class="muted">Aucune proposition automatique — choisis manuellement dans l\'onglet Cycle.</p>';

    var overlay = document.createElement("div");
    overlay.id = "seasonGate";
    overlay.className = "racine-gate";
    overlay.innerHTML =
      '<div class="racine-gate-card season-gate-card">'+
        '<div class="racine-gate-eyebrow">Fin de cycle</div>'+
        '<div class="racine-gate-title">'+esc(programLabel(state.cycle && state.cycle.goal))+'</div>'+
        '<div class="season-bilan">'+
          '<span>S'+esc(String(state.week || "?"))+' complétées</span>'+
          '<span>'+esc(String(prCount))+' PR pendant le cycle</span>'+
          (startIso ? '<span>démarré le '+esc(startIso)+'</span>' : '')+
        '</div>'+
        goalHtml+
        '<div class="season-props">'+propsHtml+'</div>'+
        '<div class="btn-row" style="margin-top:12px">'+
          '<button type="button" class="btn-ghost" id="seasonManualBtn">Choisir manuellement</button>'+
          '<button type="button" class="btn-ghost" id="seasonCloseBtn">Plus tard</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);

    var goalSel = document.getElementById("seasonGoalSelect");
    if(goalSel) goalSel.onchange = function(){
      var v = goals ? goals.normalize(goalSel.value) : null;
      state.profile.trainingGoal = v;
      if(typeof save === "function") save();
      var id = window.CoachProfiles && CoachProfiles.getActiveId();
      if(id) CoachProfiles.update(id, {trainingGoal: v});
      api.openEndOfCycle(); // re-classer les propositions avec l'objectif choisi
    };
    Array.prototype.forEach.call(overlay.querySelectorAll("[data-season-start]"), function(btn){
      btn.onclick = function(){ startProgram(btn.getAttribute("data-season-start")); };
    });
    document.getElementById("seasonManualBtn").onclick = function(){
      closeSeasonGate();
      if(typeof switchView === "function") switchView("cycle");
    };
    document.getElementById("seasonCloseBtn").onclick = closeSeasonGate;
  };

  // Archive le cycle terminé puis démarre le programme choisi — mêmes
  // mutations que saveCycle()/archiveActiveCycle() d'app.js, sans confirm()
  // supplémentaire : le choix dans l'écran EST la confirmation.
  function startProgram(id){
    if(!window.focusConfigs || !focusConfigs[id]){ alert("Programme introuvable."); return; }
    var today = todayIsoDate();
    if(window.CoachSeason) CoachSeason.recordCycleEnd(state, today);
    state.archivedCycles = state.archivedCycles || [];
    state.archivedCycles.push(Object.assign(
      snapshotCurrentCycle("Cycle terminé — enchaîné via l'écran Fin de cycle"),
      {archivedAt: nowIso(), status: "archived"}
    ));
    state.cycle.goal = id;
    state.missingCycle = null;
    if(typeof previewCycleGoal !== "undefined") previewCycleGoal = id;
    state.week = 1;
    state.day = (focusConfigs[id].days || DEFAULT_PROGRAM_DAYS)[0] || "lundi";
    state.completedDays = [];
    state.missedDays = [];
    state.deloadAlert = false;
    state.activeCycleStartDate = today;
    applyCycleStartDate(today, {setDayFromToday: true, resetWeekTracking: true});
    if(typeof resetPreviewPosition === "function") resetPreviewPosition(id);
    save();
    closeSeasonGate();
    render();
    if(typeof renderCycle === "function") renderCycle();
    if(typeof switchView === "function") switchView("training");
  }

  // ── Frise Saison (onglet Cycle) ────────────────────────────────────────────
  api.renderTimeline = function(){
    var host = document.getElementById("seasonTimeline");
    if(!host || typeof state !== "object") return;
    var journal = window.CoachSeason ? CoachSeason.journal(state) : [];
    var html = '<h2>Saison</h2><p class="muted">Ton parcours de cycles, le plus récent en bas.</p><div class="season-timeline">';
    if(!journal.length){
      html += '<p class="muted">Aucun cycle terminé pour l\'instant — ta saison commence ici.</p>';
    } else {
      var shown = journal.slice(-8);
      var offset = journal.length - shown.length; // indices réels dans state.season.cycles
      shown.forEach(function(c, i){
        html += '<div class="season-tl-item season-tl-done">'+
          '<button type="button" class="season-tl-del" data-season-del="'+(offset + i)+'" aria-label="Retirer ce cycle de la saison" title="Retirer ce cycle">✕</button>'+
          '<strong>'+esc(programLabel(c.programId))+'</strong>'+
          '<span>'+esc(String(c.weeksDone || "?"))+' sem.'+(c.prCount ? ' · '+esc(String(c.prCount))+' PR' : '')+(c.endIso ? ' · fini le '+esc(c.endIso) : '')+(c.reconstructed ? ' · reconstruit' : '')+'</span>'+
        '</div>';
      });
    }
    html += '<div class="season-tl-item season-tl-current">'+
      '<strong>'+esc(programLabel(state.cycle && state.cycle.goal))+'</strong>'+
      '<span>en cours · S'+esc(String(state.week || 1))+'</span>'+
    '</div>';
    var props = buildPropositions();
    if(props.length){
      html += '<div class="season-tl-item season-tl-next">'+
        '<strong>Suggestion suivante : '+esc(props[0].name)+'</strong>'+
        '<span>'+esc(props[0].reason)+'</span>'+
      '</div>';
    }
    html += '</div>';
    host.innerHTML = html;

    Array.prototype.forEach.call(host.querySelectorAll("[data-season-del]"), function(btn){
      btn.onclick = function(){
        var idx = Number(btn.getAttribute("data-season-del"));
        if(!window.confirm("Retirer ce cycle de ta saison ? Tes séances de l'historique ne sont pas touchées.")) return;
        if(window.CoachSeason && CoachSeason.removeCycle(state, idx)){
          if(typeof save === "function") save();
          api.renderTimeline();
        }
      };
    });
  };
})();

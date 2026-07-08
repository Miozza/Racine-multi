// Racine V4.4 — La Saison : journal des cycles.
// Rôle : mémoriser chaque cycle terminé {programId, startIso, endIso, weeksDone, prCount}
// dans state.season. Journal pur : on ajoute, on ne réécrit jamais.
// Lecture seule sur le moteur de charges et le Brain.

(function(){
  var api = window.CoachSeason = window.CoachSeason || {};

  // Vocabulaire partagé des objectifs d'entraînement (profil + suggestion).
  var GOAL_KEYS = [
    "prendre_du_muscle", "devenir_plus_fort", "perdre_du_poids",
    "skill_gymnastique", "competition_crossfit", "sante_generale", "reprise"
  ];
  var GOAL_LABELS = {
    prendre_du_muscle:    "Prendre du muscle",
    devenir_plus_fort:    "Devenir plus fort",
    perdre_du_poids:      "Perdre du poids",
    skill_gymnastique:    "Réussir un skill (muscle-up…)",
    competition_crossfit: "Compétition CrossFit",
    sante_generale:       "Santé générale",
    reprise:              "Reprise après pause/blessure"
  };
  window.CoachSeasonGoals = {
    KEYS: GOAL_KEYS.slice(),
    LABELS: GOAL_LABELS,
    normalize: function(v){ return GOAL_KEYS.indexOf(v) >= 0 ? v : null; }
  };

  // Reconstruction best-effort : les weekTransitions gardent la trace des
  // semaines franchies par cycle. Chaque groupe contigu d'un même cycle devient
  // une entrée du journal ; le groupe final correspondant au cycle actif est
  // exclu (il est encore en cours).
  function rebuildFromTransitions(state){
    var out = [];
    var transitions = Array.isArray(state.weekTransitions) ? state.weekTransitions : [];
    var current = null;
    transitions.forEach(function(t){
      if(!t || !t.cycle) return;
      if(!current || current.programId !== t.cycle){
        if(current) out.push(current);
        current = { programId: t.cycle, startIso: null, endIso: null, weeksDone: 0, prCount: 0, reconstructed: true };
      }
      if(t.date) current.endIso = String(t.date).slice(0, 10);
      var wk = Number(t.toWeek);
      if(wk > current.weeksDone) current.weeksDone = wk;
    });
    if(current){
      var activeId = state.cycle && state.cycle.goal;
      if(current.programId !== activeId) out.push(current);
    }
    return out;
  }

  api.ensure = function(state){
    if(!state) return;
    if(state.season && Array.isArray(state.season.cycles)) return;
    state.season = { cycles: rebuildFromTransitions(state), deloadSuggestedAt: null };
  };

  // PR = une charge qui dépasse la meilleure charge vue jusque-là pour ce
  // mouvement dans l'historique local. Calcul autonome : aucune dépendance au
  // moteur de références.
  function countPrsBetween(state, startIso, endIso){
    var history = Array.isArray(state.history) ? state.history : [];
    var best = {};
    var count = 0;
    history.forEach(function(entry){
      if(!entry || !entry.results) return;
      var d = String(entry.date || "").slice(0, 10);
      var inRange = (!startIso || d >= startIso) && (!endIso || d <= endIso);
      Object.keys(entry.results).forEach(function(k){
        var load = Number(entry.results[k] && entry.results[k].load);
        if(!isFinite(load) || load <= 0) return;
        if(best[k] !== undefined && load > best[k] && inRange) count++;
        if(best[k] === undefined || load > best[k]) best[k] = load;
      });
    });
    return count;
  }

  api.recordCycleEnd = function(state, todayIso){
    if(!state || !state.cycle || !state.cycle.goal) return false;
    api.ensure(state);
    var endIso = String(todayIso || "").slice(0, 10);
    var programId = state.cycle.goal;
    var cycles = state.season.cycles;
    var last = cycles[cycles.length - 1];
    if(last && last.programId === programId && last.endIso === endIso) return false; // idempotent le même jour
    var startIso = state.activeCycleStartDate || null;
    cycles.push({
      programId: programId,
      startIso: startIso,
      endIso: endIso,
      weeksDone: Number(state.week) || 0,
      prCount: countPrsBetween(state, startIso, endIso)
    });
    return true;
  };

  api.isCycleFinished = function(state, totalWeeks, programDaysCount){
    if(!state) return false;
    var week = Number(state.week) || 1;
    var total = Number(totalWeeks) || 1;
    if(week > total) return true;
    if(week < total) return false;
    var done = Array.isArray(state.completedDays) ? state.completedDays.length : 0;
    return done >= (Number(programDaysCount) || 1);
  };

  api.journal = function(state){
    return (state && state.season && Array.isArray(state.season.cycles)) ? state.season.cycles.slice() : [];
  };
})();

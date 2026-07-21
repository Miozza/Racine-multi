// Racine V4.4 — La Saison : moteur de suggestion du prochain cycle.
// Règles explicables, jamais de ML. Hiérarchie (spec v2) :
//   1. l'objectif de l'utilisateur domine — l'app ne force jamais la variété ;
//   2. le graphe du catalogue (suggestedNext du programme terminé) ;
//   3. le signal de fatigue insère la semaine deload en tête, hors classement ;
//   4. la diversité n'est qu'un départage entre candidats à égalité.
// Les candidats arrivent déjà filtrés par visibilité/permissions (programIndexIds
// reste la seule source de vérité) — refiltrage défensif ici quand même.

(function(){
  var api = window.CoachSuggest = window.CoachSuggest || {};

  var FATIGUE_RPE_THRESHOLD = 8.5;
  var GOAL_TO_OBJECTIVES = {
    prendre_du_muscle:    ["hypertrophie", "recomposition", "débutant"],
    devenir_plus_fort:    ["force", "débutant"],
    perdre_du_poids:      ["recomposition", "préparation metcon", "débutant"],
    skill_gymnastique:    ["strict muscle-up", "haltéro crossfit"],
    competition_crossfit: ["performance RX", "haltéro crossfit", "préparation metcon"],
    sante_generale:       ["débutant", "recomposition"],
    reprise:              ["débutant", "recomposition", "transition"]
  };

  api.FATIGUE_RPE_THRESHOLD = FATIGUE_RPE_THRESHOLD;

  // Moyenne des RPE saisis dans les séances des 14 derniers jours.
  api.recentAvgRpe = function(state, todayIso){
    var history = (state && Array.isArray(state.history)) ? state.history : [];
    var ref = String(todayIso || "").slice(0, 10);
    if(!ref) return 0;
    var cutoff = new Date(Number(ref.slice(0,4)), Number(ref.slice(5,7)) - 1, Number(ref.slice(8,10)) - 14);
    var sum = 0, n = 0;
    history.forEach(function(entry){
      var d = String(entry && entry.date || "").slice(0, 10);
      if(!d) return;
      var dt = new Date(Number(d.slice(0,4)), Number(d.slice(5,7)) - 1, Number(d.slice(8,10)));
      if(dt < cutoff) return;
      Object.keys(entry.results || {}).forEach(function(k){
        var rpe = Number(entry.results[k] && entry.results[k].rpe);
        if(isFinite(rpe) && rpe > 0){ sum += rpe; n++; }
      });
    });
    return n ? sum / n : 0;
  };

  function goalRank(objective, trainingGoal){
    var list = GOAL_TO_OBJECTIVES[trainingGoal];
    if(!list) return -1;
    return list.indexOf(objective);
  }

  api.propositions = function(input){
    input = input || {};
    var ended = input.endedProgram || {};
    var goal = window.CoachSeasonGoals ? window.CoachSeasonGoals.normalize(input.trainingGoal) : (input.trainingGoal || null);
    var seasonCycles = (input.season && Array.isArray(input.season.cycles)) ? input.season.cycles : [];
    var lastObjective = ended.objective || null;
    var nextIds = Array.isArray(ended.suggestedNext) ? ended.suggestedNext : [];

    var candidates = (Array.isArray(input.candidates) ? input.candidates : [])
      .filter(function(p){ return p && p.id && p.visibility === "public"; })
      .filter(function(p){ return p.objective !== "transition"; }); // le deload s'insère par fatigue, jamais par classement

    var scored = candidates.map(function(p){
      var score = 0;
      var reasons = [];
      var gr = goalRank(p.objective, goal);
      if(gr >= 0){
        score += 100 - gr;
        reasons.push("aligné sur ton objectif « " + (window.CoachSeasonGoals ? window.CoachSeasonGoals.LABELS[goal] : goal) + " »");
      }
      if(nextIds.indexOf(p.id) >= 0){
        score += 50;
        reasons.push("successeur naturel de « " + (ended.name || ended.id || "ton cycle") + " »");
      }
      if(p.frequency === ended.frequency){
        score += 10;
        reasons.push(p.frequency + " jours/semaine, comme ton cycle actuel");
      }
      if(lastObjective && p.objective !== lastObjective){
        score += 1; // diversité : simple départage
      }
      if(p.id === ended.id) score -= 60; // re-proposer le même cycle reste possible, jamais en premier
      return { id: p.id, name: p.name || p.id, reason: reasons[0] || ("répond à l'objectif « " + p.objective + " »"), score: score };
    });

    scored.sort(function(a, b){ return b.score - a.score; });
    var out = scored.slice(0, 3);

    var fatigue = Number(input.recentAvgRpe) || 0;
    if(fatigue >= FATIGUE_RPE_THRESHOLD){
      var deload = (Array.isArray(input.candidates) ? input.candidates : []).find(function(p){
        return p && p.objective === "transition" && p.visibility === "public" && /deload/i.test(p.id);
      });
      if(deload){
        out = [{
          id: deload.id,
          name: deload.name || deload.id,
          reason: "tes RPE moyens des 2 dernières semaines sont à " + (Math.round(fatigue * 10) / 10) + " : une décharge d'abord",
          score: 999
        }].concat(out).slice(0, 3);
      }
    }
    return out;
  };
})();

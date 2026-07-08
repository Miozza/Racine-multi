// Racine V4.4 — La Saison : rétention long terme.
// Enregistreur silencieux : un agrégat par mouvement et par mois
// {month, bestLoad, bestReps, avgRpe, sessions}, plafonné à 36 mois glissants.
// L'historique détaillé par mouvement reste plafonné ailleurs (12 entrées) :
// sans cette couche, toute analyse long terme (« tes tractions stagnent depuis
// 9 mois ») serait impossible — les données n'existeraient plus.
// Aucune analyse ici : la collecte d'abord, l'intelligence quand les données existeront.

(function(){
  var api = window.CoachRetention = window.CoachRetention || {};
  var MAX_MONTHS = 36;

  api.recordSession = function(state, results, dateIso){
    if(!state || !results) return;
    var month = String(dateIso || "").slice(0, 7);
    if(!/^\d{4}-\d{2}$/.test(month)) return;
    if(!state.longTerm) state.longTerm = { byMovement: {} };
    if(!state.longTerm.byMovement) state.longTerm.byMovement = {};

    Object.keys(results).forEach(function(key){
      var r = results[key];
      var load = Number(r && r.load);
      if(!isFinite(load) || load <= 0) return; // mouvement sans charge : rien à retenir
      var reps = Number(r && r.reps);
      var rpe = Number(r && r.rpe);

      var rows = state.longTerm.byMovement[key] = state.longTerm.byMovement[key] || [];
      var row = rows[rows.length - 1] && rows[rows.length - 1].month === month ? rows[rows.length - 1] : null;
      if(!row){
        row = { month: month, bestLoad: 0, bestReps: null, avgRpe: null, rpeN: 0, sessions: 0 };
        rows.push(row);
        rows.sort(function(a, b){ return a.month < b.month ? -1 : a.month > b.month ? 1 : 0; });
      }
      if(load > row.bestLoad){
        row.bestLoad = load;
        row.bestReps = isFinite(reps) && reps > 0 ? reps : row.bestReps;
      }
      if(isFinite(rpe) && rpe > 0){
        // Moyenne pondérée par les seules séances qui portent un RPE.
        row.avgRpe = row.avgRpe === null ? rpe : (row.avgRpe * row.rpeN + rpe) / (row.rpeN + 1);
        row.rpeN = (row.rpeN || 0) + 1;
      }
      row.sessions += 1;
      if(rows.length > MAX_MONTHS) state.longTerm.byMovement[key] = rows.slice(-MAX_MONTHS);
    });
  };
})();

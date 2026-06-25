// Coach Beurt
// Public history boundary: raw result history and derived athlete_state become signals for the engine.
(function(){
  var api = window.CoachHistory || {};

  function fn(name){ return typeof window[name] === "function" ? window[name] : null; }
  function call(name, fallback){
    var f = fn(name);
    var args = Array.prototype.slice.call(arguments, 2);
    if(f) return f.apply(null, args);
    return typeof fallback === "function" ? fallback.apply(null, args) : fallback;
  }
  function numberValue(value){ return Number(value || 0) || 0; }
  function rowLoad(row){ return numberValue(row && (row.load || row.actualLoad || row.capacityLoad)); }
  function rowReps(row){ return numberValue(row && (row.reps || row.actualReps || row.currentReps)); }
  function normalizeRows(rows){ return Array.isArray(rows) ? rows.filter(Boolean) : []; }

  api.getMovementRecord = function(label){ return call("athleteMovementRecord", null, label); };
  api.getLatestMovementHistory = function(label){ return call("latestMovementHistory", null, label); };
  api.filterForProgression = function(history, context){ return call("coachFilterHistoryForProgression", normalizeRows(history), history, context); };
  api.buildMovementHistorySignal = function(label, history, context, targetReps){
    return call("coachBuildMovementHistorySignal", {label:label,rows:normalizeRows(history).slice(-4),status:"neutral",reason:"Historique insuffisant pour trancher."}, label, history, context, targetReps);
  };
  api.previousMovementHistoryRow = function(label, currentLoad, currentReps, currentRpe){
    var mv = api.getMovementRecord(label);
    var history = normalizeRows(mv && mv.history);
    if(history.length < 2) return null;
    for(var i = history.length - 2; i >= 0; i--){
      var row = history[i] || {};
      var load = rowLoad(row);
      var reps = rowReps(row);
      var rpe = numberValue(row.rpe);
      if(load === numberValue(currentLoad) && reps === numberValue(currentReps) && rpe === numberValue(currentRpe)) continue;
      return row;
    }
    return null;
  };
  api.rawRows = function(label){
    var mv = api.getMovementRecord(label);
    return normalizeRows(mv && mv.history).slice();
  };

  window.CoachHistory = api;
})();

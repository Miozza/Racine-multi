// Coach Beurt
// Public progression boundary: turns one movement result into progress/watch/block signals.
(function(){
  var api = window.CoachProgress || {};

  function numberValue(value){ return Number(value || 0) || 0; }
  function rowLoad(row){ return numberValue(row && (row.load || row.actualLoad || row.capacityLoad)); }
  function rowRpe(row){ return numberValue(row && row.rpe); }
  function roundDelta(value){
    if(typeof round5 === "function") return round5(value);
    return Math.round(Number(value || 0) / 5) * 5;
  }
  function movementName(value){
    var name = String(value || "Mouvement");
    if(typeof displayMovementName === "function") name = displayMovementName(name);
    return name;
  }

  api.analyzeMovementResult = function(input){
    input = input || {};
    var name = movementName(input.name || input.key);
    var result = input.result || {};
    var load = numberValue(input.load || result.load);
    var reps = numberValue(input.reps || result.reps);
    var rpe = numberValue(input.rpe || result.rpe || 8);
    var previous = input.previous || null;
    var previousLoad = rowLoad(previous);
    var previousRpe = rowRpe(previous);
    var delta = previousLoad && load ? roundDelta(load - previousLoad) : 0;
    var out = {
      name:name,
      load:load,
      reps:reps,
      rpe:rpe,
      previous:previous,
      previousLoad:previousLoad,
      previousRpe:previousRpe,
      delta:delta,
      status:"neutral",
      progressLine:"",
      watchLine:"",
      blockedLine:""
    };

    if(result.autoPr){
      out.status = "progress";
      out.progressLine = name + " : nouveau repere enregistre.";
      return out;
    }
    if(delta > 0 && rpe <= 8.5){
      out.status = "progress";
      out.progressLine = name + " : +" + delta + " lb avec RPE " + rpe + ".";
      return out;
    }
    if(result.status === "easy_success"){
      out.status = "progress";
      out.progressLine = name + " : charge maitrisee, hausse prudente possible la prochaine fois.";
      return out;
    }
    if(result.status === "major_fail" || result.status === "failed" || rpe >= 9.5){
      out.status = "blocked";
      out.blockedLine = name + " : RPE " + rpe + ", ne pas monter avant confirmation.";
      return out;
    }
    if(delta < 0){
      out.status = "blocked";
      out.blockedLine = name + " : charge en baisse vs derniere reference.";
      return out;
    }
    if(rpe >= 9){
      out.status = "watch";
      out.watchLine = name + " : RPE haut, maintenir avant de monter.";
      return out;
    }
    if(previousLoad && previousRpe >= 9 && load >= previousLoad){
      out.status = "watch";
      out.watchLine = name + " : derniere reference deja difficile, progression a confirmer.";
      return out;
    }
    if(!previousLoad){
      out.status = "watch";
      out.watchLine = name + " : premiere reference utile a accumuler.";
      return out;
    }
    return out;
  };

  api.averageRpeSignal = function(avgRpe){
    avgRpe = numberValue(avgRpe || 8);
    if(avgRpe <= 7) return "Leger";
    if(avgRpe <= 8) return "Bon";
    if(avgRpe <= 8.5) return "Solide";
    if(avgRpe <= 9) return "Intense";
    return "Tres dur";
  };

  window.CoachProgress = api;
})();

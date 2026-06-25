// Coach Beurt V51.63 - summary domain
// Resume automatique de seance : composition des signaux, sans ecrire les donnees durables.
(function(){
  var api = window.CoachSummary || {};

  function ownResults(results){
    return results && typeof results === 'object' ? results : {};
  }

  function asNumber(value, fallback){
    var n = Number(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  function parseLoadValue(value, helpers){
    if(helpers && typeof helpers.parseLoad === 'function'){
      return helpers.parseLoad(value);
    }
    var parsed = Number(String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/));
    return isFinite(parsed) ? parsed : 0;
  }

  function roundDelta(value, helpers){
    if(helpers && typeof helpers.round5 === 'function'){
      return helpers.round5(value);
    }
    var n = Number(value || 0);
    return Math.round(n * 2) / 2;
  }

  function movementName(key, helpers){
    if(helpers && typeof helpers.movementName === 'function'){
      return helpers.movementName(key);
    }
    return String(key || 'Mouvement');
  }

  function previousRow(name, load, reps, rpe, helpers){
    if(helpers && typeof helpers.previousMovementHistoryRow === 'function'){
      return helpers.previousMovementHistoryRow(name, load, reps, rpe);
    }
    if(window.CoachHistory && CoachHistory.previousMovementHistoryRow){
      return CoachHistory.previousMovementHistoryRow(name, load, reps, rpe);
    }
    return null;
  }

  function progressApi(helpers){
    if(helpers && helpers.progress) return helpers.progress;
    return window.CoachProgress || null;
  }

  function pushUnique(list, line){
    if(line && list.indexOf(line) < 0) list.push(line);
  }

  api.sessionSummaryShape = function(){
    return {
      lines: [],
      prLines: [],
      avgRpe: 8,
      rpeSignal: 'Bon',
      totalExercises: 0,
      autoPrLines: [],
      progressionLines: [],
      watchLines: [],
      blockedLines: []
    };
  };

  api.buildSessionSummary = function(results, helpers){
    var summary = api.sessionSummaryShape();
    var rpeSum = 0;
    var rpeCount = 0;
    var progress = progressApi(helpers);

    Object.keys(ownResults(results)).forEach(function(key){
      var r = results[key];
      if(r && r.isWod){
        var wodResult = r.result || r.note || '';
        if(wodResult) summary.lines.push(movementName(key, helpers) + ' : ' + wodResult + (r.rpe ? ' | RPE ' + r.rpe : ''));
        return;
      }
      if(!r || !r.load) return;

      summary.totalExercises++;
      var rpe = asNumber(r.rpe, 8);
      rpeSum += rpe;
      rpeCount++;

      var load = parseLoadValue(r.load, helpers);
      var reps = asNumber(r.reps, 8);
      var name = movementName(key, helpers);
      var prev = previousRow(name, load, reps, rpe, helpers);
      var prevLoad = prev ? asNumber(prev.load || prev.actualLoad || prev.capacityLoad, 0) : 0;
      var prevRpe = prev ? asNumber(prev.rpe, 0) : 0;
      var progressSignal = progress && progress.analyzeMovementResult
        ? progress.analyzeMovementResult({key:key, name:name, result:r, load:load, reps:reps, rpe:rpe, previous:prev})
        : null;
      var delta = progressSignal ? progressSignal.delta : (prevLoad && load ? roundDelta(load - prevLoad, helpers) : 0);
      var arrow = '';
      if(delta > 0) arrow = ' ↑ +' + delta + ' lb';
      else if(delta < 0) arrow = ' ↓ ' + delta + ' lb';

      summary.lines.push(name + ' : ' + load + ' lb × ' + reps + (arrow ? '  ' + arrow : '') + (rpe ? ' | RPE ' + rpe : ''));

      if(r.autoPr){
        summary.autoPrLines.push((r.prLabel || name) + ' : ' + (r.prOld ? r.prOld + ' → ' : '') + r.prNew + ' lb × ' + r.prReps);
      }

      if(progressSignal && progressSignal.progressLine){
        pushUnique(summary.progressionLines, progressSignal.progressLine);
        if(progressSignal.status === 'progress' && delta > 0) summary.prLines.push(name);
      }else if(delta > 0 && rpe <= 8.5){
        pushUnique(summary.progressionLines, name + ' : +' + delta + ' lb avec RPE ' + rpe + '.');
        summary.prLines.push(name);
      }else if(r.status === 'easy_success'){
        pushUnique(summary.progressionLines, name + ' : charge maîtrisée, hausse prudente possible la prochaine fois.');
      }else if(r.autoPr){
        pushUnique(summary.progressionLines, name + ' : nouveau repère enregistré.');
      }

      if(progressSignal && progressSignal.blockedLine){
        pushUnique(summary.blockedLines, progressSignal.blockedLine);
      }else if(progressSignal && progressSignal.watchLine){
        pushUnique(summary.watchLines, progressSignal.watchLine);
      }else if(r.status === 'major_fail' || r.status === 'failed' || rpe >= 9.5){
        pushUnique(summary.blockedLines, name + ' : RPE ' + rpe + ', ne pas monter avant confirmation.');
      }else if(delta < 0){
        pushUnique(summary.blockedLines, name + ' : charge en baisse vs dernière référence.');
      }else if(rpe >= 9){
        pushUnique(summary.watchLines, name + ' : RPE haut, maintenir avant de monter.');
      }else if(prevLoad && prevRpe >= 9 && load >= prevLoad){
        pushUnique(summary.watchLines, name + ' : dernière référence déjà difficile, progression à confirmer.');
      }else if(!prevLoad){
        pushUnique(summary.watchLines, name + ' : première référence utile à accumuler.');
      }
    });

    summary.avgRpe = rpeCount > 0 ? Math.round(rpeSum / rpeCount * 10) / 10 : 8;
    summary.rpeSignal = progress && progress.averageRpeSignal
      ? progress.averageRpeSignal(summary.avgRpe)
      : (summary.avgRpe <= 7 ? 'Léger' : summary.avgRpe <= 8 ? 'Bon' : summary.avgRpe <= 8.5 ? 'Solide' : summary.avgRpe <= 9 ? 'Intense' : 'Très dur');
    if(summary.avgRpe >= 8.8){
      pushUnique(summary.watchLines, 'RPE moyen ' + summary.avgRpe + ' : fatigue à surveiller sur la prochaine séance.');
    }
    return summary;
  };

  window.CoachSummary = api;
})();

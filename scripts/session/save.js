// Coach Beurt V51.63 — session save domain
// Sauvegarde de séance : payload, retour WOD et orchestration sauvegarde.

function updateCustomChargesFromResults(results){
  return false;
}

function buildSessionPayload(results){
  var now=new Date();
  return{
    version:APP_VERSION,
    date:now.toLocaleDateString("fr-CA"),
    time:now.toLocaleTimeString("fr-CA"),
    semaine:state.week,
    jour:state.day,
    plannedDay:state.day,
    actualDate:now.toLocaleDateString("fr-CA"),
    actualDayName:actualDayName(),
    cycle:state.cycle&&state.cycle.goal?state.cycle.goal:null,
    focus:focus().label,
    cycleState:buildCycleStatePayload(),
    resultats:results
  };
}

function returnFromResultsToWod(){
  guidedResultCache = {};
  guidedResultsMode=false;
  document.body.classList.remove("guided-results-active");
  document.body.classList.remove("results-view-active");
  guidedLaunchSource="wodplus";
  switchView("training");
  renderWorkout();
}

function setupSessionSave(){
  var back=$("sessionBackPcBtn");
  if(back)back.onclick=returnFromResultsToWod;
  var backTop=$("resultsBackPcTopBtn");
  if(backTop)backTop.onclick=returnFromResultsToWod;
  var btn=$("saveSessionBtn");if(!btn)return;
  btn.onclick=async function(){
    resumeAudio();
    var results=collectSessionResults();
    var hasData=Object.keys(results).length>0;
    if(!hasData){var s=$("saveStatus");if(s){s.textContent="Aucun résultat saisi.";s.className="session-note";}return;}
    try{
    btn.disabled=true;btn.textContent="Envoi en cours...";
    results=CoachCharge.enrichSessionResults(results);
    var autoPrUpdates=detectAndApplyAutomaticPr(results,todayDateString());
    var payload=buildSessionPayload(results);
    // Avis IA V3.3 — si l'utilisateur modifie manuellement une charge après un avis IA,
    // Racine documente l'influence sans jamais modifier la charge automatiquement.
    try{
      if(window.RacineAIInfluence && typeof RacineAIInfluence.annotateSessionResults==='function'){
        var aiInfluences=RacineAIInfluence.annotateSessionResults(results,payload);
        if(aiInfluences&&aiInfluences.length)payload.aiAdviceInfluences=aiInfluences;
      }
    }catch(e){ /* consultatif seulement — jamais bloquant */ }
    if(autoPrUpdates.length)payload.autoPrUpdates=autoPrUpdates;
    // 1. Mettre à jour références + historique RPE
    updateRefsFromResults(results);
    CoachCharge.updateAthleteStateFromResults(results,payload.date);
    // 2. Ne plus modifier les charges locales depuis les résultats :    // charges.js et les charges locales sont une configuration/équipement, pas une capacité réelle.
    // Les upgrades viennent de ce qui a été réellement dépassé dans l’historique/PR.
    // updateCustomChargesFromResults(results);
    // 3. Marquer le jour complété
    markDayCompleted(state.day);
    // 4. Vérifier alerte deload
    checkDeloadAlert();
    // 5. Ajouter à l'historique local
    var alreadySaved=state.history.some(function(h){
      return h.date===payload.date&&h.day===payload.jour&&h.cycle===payload.cycle;
    });
    if(!alreadySaved){
      var entry = {date:payload.date,time:payload.time,week:state.week,day:state.day,plannedDay:state.day,actualDate:payload.actualDate,actualDayName:payload.actualDayName,cycle:payload.cycle,focus:focus().label,results:results,version:APP_VERSION};
      // Rétention long terme (La Saison) : agrégat mensuel par mouvement.
      try{ if(window.CoachRetention)CoachRetention.recordSession(state, results, entry.date); }catch(e){ /* jamais bloquant */ }
      state.history.push(entry);
      save();
    }
    // Brain V2.1 — mémoire locale par mouvement + intention.
    // Apprend uniquement des résultats déjà enrichis; aucun effet réseau et aucune donnée durable statique modifiée.
    try{
      if(window.CoachBrainMemory && typeof CoachBrainMemory.updateFromSessionResults==='function'){
        CoachBrainMemory.updateFromSessionResults(results, payload);
      }
    }catch(e){ /* silencieux — jamais bloquant */ }
    // Collecte silencieuse Brain.js — aucun effet sur le moteur, jamais bloquant
    try{
      if(window.CoachML){
        var fatigueAvg = 8;
        if(window.state && Array.isArray(window.state.history) && window.state.history.length){
          var recentRpes = [];
          window.state.history.slice(-7).forEach(function(s){
            Object.keys(s.results||{}).forEach(function(k){
              var r = s.results[k]; var rpe = Number(r&&r.rpe)||0;
              if(rpe > 0) recentRpes.push(rpe);
            });
          });
          if(recentRpes.length) fatigueAvg = recentRpes.reduce(function(a,b){return a+b;},0)/recentRpes.length;
        }
        Object.keys(results).forEach(function(key){
          var r = results[key];
          var usedLoad      = Number(r&&r.load)  || 0;
          var rpeReal       = Number(r&&r.rpe)   || 8;
          var suggestedLoad = Number(r&&r.planned&&r.planned.load) || 0;
          if(!usedLoad || !suggestedLoad) return;
          var mv   = (typeof athleteMovementRecord==='function') ? athleteMovementRecord(key) : null;
          var hist = (mv&&Array.isArray(mv.history)) ? mv.history : [];
          var prev = hist.length >= 2 ? hist[hist.length-2] : null;
          var prevRpe = Number(prev&&prev.rpe)||8;
          var lastDate = prev && (prev.date||prev.actualDate);
          var daysSince = lastDate ? Math.round((Date.now()-new Date(lastDate).getTime())/(864e5)) : 3;
          var actualFactor = Math.round((usedLoad/suggestedLoad)*100)/100;
          CoachML.recordTrainingVector(key, {
            ratioUsed:   usedLoad/suggestedLoad,
            rpeReal:     rpeReal,
            rpePrev:     prevRpe,
            daysSince:   daysSince,
            systemicAvg: fatigueAvg
          }, actualFactor);
        });
      }
    }catch(e){ /* silencieux — jamais de crash */ }
    if(autoPrUpdates.length){ renderProfile(); renderReferences(); }
    // 6. Séance déjà sauvegardée localement (étape 5). Plus d'envoi réseau : tout reste sur l'appareil.
    var result={ok:true,msg:"✅ Séance sauvegardée."};
    var stateMsg="";
    var s=$("saveStatus");
    if(s){s.textContent=result.msg+stateMsg;s.className="session-note"+(result.ok?" ok":" err");}
    // 8. Construire et afficher le résumé
    var summary=buildSessionSummary(results);
    showSessionSummaryModal(summary);
    if(result.ok){
      renderHistory();renderWorkout();renderWeekProgress();
      if(guidedResultsMode){
        returnFromResultsToWod();
      }
    }
    }catch(e){
      if(typeof coachLogError==="function")coachLogError("saveSession",e);
      var s=$("saveStatus");
      if(s){s.textContent="Erreur inattendue : "+(e&&e.message?e.message:String(e));s.className="session-note err";}
    }finally{
      btn.disabled=false;btn.textContent="💾 Sauvegarder la séance";
    }
  };
}


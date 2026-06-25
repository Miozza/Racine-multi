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
      // Récupérer la dernière note WOD non-vide parmi les résultats
      var globalNote = "";
      Object.keys(results).forEach(function(key){
        var r = results[key];
        if(r && r.note && String(r.note).trim()) globalNote = String(r.note).trim();
      });
      var entry = {date:payload.date,time:payload.time,week:state.week,day:state.day,plannedDay:state.day,actualDate:payload.actualDate,actualDayName:payload.actualDayName,cycle:payload.cycle,focus:focus().label,results:results,version:APP_VERSION};
      if(globalNote) entry.note = globalNote;
      state.history.push(entry);
      save();
    }
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


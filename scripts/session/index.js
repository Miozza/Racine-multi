// Coach Beurt V51.63 — API publique du domaine session
// app.js reste chef d’orchestre; CoachSession regroupe les points d’entrée terrain.
(function(){
  function ensureSessionView(){
    if(typeof ensurePcViewHost === 'function') ensurePcViewHost();
    var guided = document.getElementById('guidedSession');
    if(!guided) return null;

    var view = document.getElementById('sessionView');
    if(!view){
      view = document.createElement('main');
      view.id = 'sessionView';
      view.className = 'session-view';
      var pcView = document.getElementById('pcView') || document.getElementById('phoneView');
      var parent = pcView && pcView.parentNode ? pcView.parentNode : document.querySelector('.app');
      var before = pcView && pcView.nextSibling ? pcView.nextSibling : document.getElementById('resultsView');
      if(parent) parent.insertBefore(view, before || null);
    }

    if(guided.parentNode !== view){
      view.appendChild(guided);
    }
    return view;
  }

  function prepareSessionView(){
    ensureSessionView();
    if(typeof switchView === 'function'){
      switchView('session');
    }
  }

  function installSessionCloseNavigation(){
    if(typeof closeGuidedSession !== 'function' || closeGuidedSession.__sessionViewAware) return;
    var originalCloseGuidedSession = closeGuidedSession;
    closeGuidedSession = function(){
      var source = typeof guidedLaunchSource !== 'undefined' ? guidedLaunchSource : 'phone';
      var result = originalCloseGuidedSession.apply(this, arguments);
      if(source !== 'wodplus' && typeof switchView === 'function'){
        switchView('phone');
      }
      return result;
    };
    closeGuidedSession.__sessionViewAware = true;
  }

  ensureSessionView();
  installSessionCloseNavigation();

  window.CoachSession = Object.assign(window.CoachSession || {}, {
    open: function(){ prepareSessionView(); return typeof openGuidedSession === 'function' ? openGuidedSession.apply(this, arguments) : null; },
    openFrom: function(source){
      prepareSessionView();
      return typeof openGuidedSessionFrom === 'function' ? openGuidedSessionFrom.apply(this, arguments) : (typeof openGuidedSession === 'function' ? openGuidedSession.apply(this, arguments) : null);
    },
    close: function(){ installSessionCloseNavigation(); return typeof closeGuidedSession === 'function' ? closeGuidedSession.apply(this, arguments) : null; },
    render: function(){ return typeof renderGuidedSession === 'function' ? renderGuidedSession.apply(this, arguments) : null; },
    renderResults: function(){ return typeof renderSessionEntry === 'function' ? renderSessionEntry.apply(this, arguments) : null; },
    collectResults: function(){ return typeof collectSessionResults === 'function' ? collectSessionResults.apply(this, arguments) : {}; },
    setupSave: function(){ return typeof setupSessionSave === 'function' ? setupSessionSave.apply(this, arguments) : null; },
    returnToWod: function(){ return typeof returnFromResultsToWod === 'function' ? returnFromResultsToWod.apply(this, arguments) : null; },
    startTimer: function(){ return typeof startGuidedTimer === 'function' ? startGuidedTimer.apply(this, arguments) : null; },
    pauseTimer: function(){ return typeof pauseGuidedTimer === 'function' ? pauseGuidedTimer.apply(this, arguments) : null; },
    stopTimer: function(){ return typeof stopGuidedTimer === 'function' ? stopGuidedTimer.apply(this, arguments) : null; }
  });
})();

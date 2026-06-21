// Coach Beurt
// Public UI boundary for modal/buttons helpers.
// Keeps existing global helpers compatible while new code can depend on CoachUI.
(function(){
  var existing = window.CoachUI || {};
  function fn(name){ return typeof window[name] === "function" ? window[name] : null; }
  function call(name, fallback){
    var f = fn(name);
    if(!f) return typeof fallback === "function" ? fallback.apply(null, Array.prototype.slice.call(arguments, 2)) : fallback;
    return f.apply(null, Array.prototype.slice.call(arguments, 2));
  }

  existing.escapeHtml = function(value){
    return call("escapeHtml", function(v){ return String(v == null ? "" : v); }, value);
  };
  existing.tutorialButtonHtml = function(name){ return call("tutorialButtonHtml", "", name); };
  existing.loadInfoButtonHtml = function(exercise, shownLoad){ return call("loadInfoButtonHtml", "", exercise, shownLoad); };
  existing.showTutorialModal = function(name){ return call("showTutorialModal", null, name); };
  existing.showLoadInfoModal = function(message){ return call("showLoadInfoModal", null, message); };
  existing.setupTutorialButtons = function(scope){ return call("setupTutorialButtons", null, scope); };
  existing.setupLoadInfoButtons = function(scope){ return call("setupLoadInfoButtons", null, scope); };

  window.CoachUI = existing;
})();

// Coach Beurt - state public API
(function(){
  var api = window.CoachState = window.CoachState || {};
  api.ready = !!(api.readState && api.writeState && api.readCustomCharges && api.writeCustomCharges);
})();

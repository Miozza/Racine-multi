// Coach Beurt - sync public API
(function(){
  var api = window.CoachSync = window.CoachSync || {};

  function removeLegacyTokenButton(){
    var legacy = document.getElementById("removeTokenBtn");
    var current = document.getElementById("clearTokenBtn");
    if(legacy && current && legacy !== current){
      legacy.remove();
    }
  }

  removeLegacyTokenButton();

  api.ready = !!(api.getToken && api.setToken && api.clearToken && api.readStatus && api.writeStatus);
  api.removeLegacyTokenButton = removeLegacyTokenButton;
})();
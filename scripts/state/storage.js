// Racine V1 multi-utilisateur - local state storage domain
// Les clés sont désormais résolues dynamiquement par profil actif (CoachProfiles).
// Conserve les anciennes clés Coach Beurt comme migration douce pour le tout
// premier profil créé sur un appareil qui avait l'ancienne version installée.
(function(){
  var api = window.CoachState = window.CoachState || {};
  var LEGACY_STATE_KEYS = ["coachBertinState", "coachBertinV46", "coachBertinV43", "coachBertinV41"];
  var LEGACY_CHARGE_KEYS = ["coachBertinCustomCharges", "coachBertinCustomChargesV46"];

  function currentKeys(){
    if(window.CoachProfiles && CoachProfiles.activeStorageKeys){
      return CoachProfiles.activeStorageKeys();
    }
    return { state: "racineState::__pending__", charges: "racineCharges::__pending__" };
  }

  function readFirst(keys){
    for(var i = 0; i < keys.length; i++){
      var key = keys[i];
      var raw = localStorage.getItem(key);
      if(raw !== null && raw !== undefined && raw !== "") return {key:key, raw:raw};
    }
    return null;
  }

  function readJson(keys){
    var found = readFirst(keys);
    if(!found) return {key:null, raw:"", data:null, migrated:false};
    try{
      return {key:found.key, raw:found.raw, data:JSON.parse(found.raw), migrated:found.key !== keys[0]};
    }catch(e){
      return {key:found.key, raw:found.raw, data:null, migrated:false, error:e};
    }
  }

  var writeFailureNotified = false;

  function writeJson(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value || {}));
      return true;
    }catch(e){
      // Quota plein ou stockage indisponible (ex. mode privé) : sans ce garde,
      // la sauvegarde échouait en silence et l'utilisateur croyait ses
      // résultats enregistrés.
      if(window.CoachLog && CoachLog.error){
        CoachLog.error("storage_write_failed", {key:key, message:e && e.message ? e.message : String(e)});
      }
      if(!writeFailureNotified){
        writeFailureNotified = true;
        alert("⚠️ Sauvegarde impossible : le stockage local est plein ou bloqué.\nExporte ton profil (Réglages → Profil → Exporter mon profil) puis libère de l'espace.");
      }
      return false;
    }
  }

  api.readState = function(){ return readJson([currentKeys().state]); };
  api.writeState = function(state){ writeJson(currentKeys().state, state); };
  api.readCustomCharges = function(){ return readJson([currentKeys().charges]); };
  api.writeCustomCharges = function(charges){ writeJson(currentKeys().charges, charges); };

  // Migration explicite uniquement (jamais automatique) : utilisée par l'écran
  // d'intégration si quelqu'un veut récupérer une ancienne installation
  // Coach Beurt à profil unique sur cet appareil.
  api.readLegacyBertinState = function(){ return readJson(LEGACY_STATE_KEYS); };
  api.readLegacyCustomCharges = function(){ return readJson(LEGACY_CHARGE_KEYS); };

  // Filet de sécurité avant un import de sauvegarde : conserve l'état écrasé
  // sous une clé de secours par profil, récupérable manuellement au besoin.
  api.writeImportRescue = function(state){
    try{
      var pid = (window.CoachProfiles && CoachProfiles.getActiveId) ? CoachProfiles.getActiveId() : "inconnu";
      localStorage.setItem("racineImportRescue::" + pid, JSON.stringify({savedAt: new Date().toISOString(), state: state || {}}));
      return true;
    }catch(e){
      return false;
    }
  };

  api.storageKeys = function(){
    var k = currentKeys();
    return {
      state: k.state,
      customCharges: k.charges,
      stateLegacy: LEGACY_STATE_KEYS.slice(),
      customChargesLegacy: LEGACY_CHARGE_KEYS.slice()
    };
  };
})();

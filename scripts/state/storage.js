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

  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value || {}));
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

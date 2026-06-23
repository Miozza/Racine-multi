// Racine — domaine profils (multi-utilisateur local)
// Registre des profils + sélection du profil actif. Aucune dépendance réseau.
// Chaque profil a ses propres données, isolées par clé localStorage.
// Ce fichier doit charger tôt (avant scripts/state/storage.js) car CoachState
// l'utilise pour savoir quelle clé localStorage lire/écrire.
(function(){
  var api = window.CoachProfiles = window.CoachProfiles || {};
  var REGISTRY_KEY = "racineProfileRegistry";

  function uid(){
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
  }

  function defaultRegistry(){
    return { version: 1, activeProfileId: null, profiles: [] };
  }

  function readRegistry(){
    try{
      var raw = localStorage.getItem(REGISTRY_KEY);
      if(!raw) return defaultRegistry();
      var parsed = JSON.parse(raw);
      if(!parsed || !Array.isArray(parsed.profiles)) return defaultRegistry();
      return parsed;
    }catch(e){ return defaultRegistry(); }
  }

  function writeRegistry(reg){
    try{ localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg)); }catch(e){}
  }

  function findIndex(reg, id){
    for(var i=0;i<reg.profiles.length;i++) if(reg.profiles[i].id===id) return i;
    return -1;
  }

  api.list = function(){
    return readRegistry().profiles.slice();
  };

  api.get = function(id){
    var reg = readRegistry();
    var idx = findIndex(reg, id);
    return idx>=0 ? reg.profiles[idx] : null;
  };

  api.getActiveId = function(){
    return readRegistry().activeProfileId;
  };

  api.getActive = function(){
    var reg = readRegistry();
    if(!reg.activeProfileId) return null;
    var idx = findIndex(reg, reg.activeProfileId);
    return idx>=0 ? reg.profiles[idx] : null;
  };

  api.hasActiveOnboardedProfile = function(){
    var p = api.getActive();
    return !!(p && p.onboarded);
  };

  // Crée un profil "brouillon" (pas encore onboarded). Devient actif immédiatement
  // pour que les écrans d'intégration puissent écrire dans son espace de stockage.
  api.create = function(meta){
    var reg = readRegistry();
    var profile = {
      id: uid(),
      name: (meta && meta.name) ? String(meta.name).trim().slice(0,40) : "Athlète",
      createdAt: new Date().toISOString(),
      experienceLevel: (meta && meta.experienceLevel) || "intermediaire",
      bodyweightLb: (meta && Number(meta.bodyweightLb)) || null,
      aggressiveness: (meta && Number(meta.aggressiveness)) || 1.0,
      onboarded: false,
      scaleRatios: null
    };
    reg.profiles.push(profile);
    reg.activeProfileId = profile.id;
    writeRegistry(reg);
    return profile.id;
  };

  api.setActive = function(id){
    var reg = readRegistry();
    if(findIndex(reg, id) < 0) return false;
    reg.activeProfileId = id;
    writeRegistry(reg);
    return true;
  };

  api.update = function(id, patch){
    var reg = readRegistry();
    var idx = findIndex(reg, id);
    if(idx < 0) return false;
    reg.profiles[idx] = Object.assign({}, reg.profiles[idx], patch||{});
    writeRegistry(reg);
    return true;
  };

  api.markOnboarded = function(id, payload){
    return api.update(id, Object.assign({onboarded:true}, payload||{}));
  };

  api.remove = function(id){
    var reg = readRegistry();
    var idx = findIndex(reg, id);
    if(idx < 0) return false;
    reg.profiles.splice(idx,1);
    if(reg.activeProfileId === id){
      reg.activeProfileId = reg.profiles.length ? reg.profiles[0].id : null;
    }
    writeRegistry(reg);
    try{
      var keys = api.storageKeysFor(id);
      localStorage.removeItem(keys.state);
      localStorage.removeItem(keys.charges);
    }catch(e){}
    return true;
  };

  api.storageKeysFor = function(id){
    return { state: "racineState::" + id, charges: "racineCharges::" + id };
  };

  // Clés dynamiques utilisées par scripts/state/storage.js. Si aucun profil
  // actif (premier lancement), on retombe sur un espace tampon neutre.
  api.activeStorageKeys = function(){
    var id = api.getActiveId();
    if(!id) return { state: "racineState::__pending__", charges: "racineCharges::__pending__" };
    return api.storageKeysFor(id);
  };

  api.exportProfileBlob = function(id){
    var profile = api.get(id);
    if(!profile) return null;
    var keys = api.storageKeysFor(id);
    var state = null, charges = null;
    try{ state = JSON.parse(localStorage.getItem(keys.state) || "null"); }catch(e){}
    try{ charges = JSON.parse(localStorage.getItem(keys.charges) || "null"); }catch(e){}
    return { schema:"racine-profile-export-v2", exportedAt:new Date().toISOString(), appVersion:(window.APP_VERSION||null), profile: profile, state: state, customCharges: charges };
  };

  api.importProfileBlob = function(blob){
    if(!blob || !blob.profile) return null;
    var reg = readRegistry();
    var incoming = Object.assign({}, blob.profile, { id: uid(), importedAt:new Date().toISOString() });
    reg.profiles.push(incoming);
    reg.activeProfileId = incoming.id;
    writeRegistry(reg);
    var keys = api.storageKeysFor(incoming.id);
    try{ if(blob.state) localStorage.setItem(keys.state, JSON.stringify(blob.state)); }catch(e){}
    try{ if(blob.customCharges) localStorage.setItem(keys.charges, JSON.stringify(blob.customCharges)); }catch(e){}
    return incoming.id;
  };

  api.ready = true;
})();

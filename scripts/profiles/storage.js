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
      scaleRatios: null,
      // Programmes privés accessibles à ce profil. [] = aucun programme private visible.
      programPermissions: (meta && Array.isArray(meta.programPermissions)) ? meta.programPermissions.slice() : []
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

  // À appeler après chaque export réussi (mono ou multi) : horodate le dernier
  // export du profil dans le registre. Sert au rappel d'export (Safari peut
  // purger le localStorage d'une PWA peu visitée — l'export JSON est la seule
  // sauvegarde).
  api.markExported = function(id){
    return api.update(id, { lastExportAt: new Date().toISOString() });
  };

  // Un profil "a de l'historique" si son state namespacé contient au moins une
  // séance sauvegardée. Lecture seule, sans toucher au state en mémoire.
  api.profileHasHistory = function(id){
    try{
      var keys = api.storageKeysFor(id);
      var st = JSON.parse(localStorage.getItem(keys.state) || "null");
      return !!(st && Array.isArray(st.history) && st.history.length);
    }catch(e){ return false; }
  };

  // ─── Permissions programmes privés ────────────────────────────────────────
  api.grantProgramPermission = function(profileId, programId){
    var p = api.get(profileId);
    if(!p) return false;
    var perms = Array.isArray(p.programPermissions) ? p.programPermissions.slice() : [];
    if(perms.indexOf(programId) === -1) perms.push(programId);
    return api.update(profileId, { programPermissions: perms });
  };

  api.revokeProgramPermission = function(profileId, programId){
    var p = api.get(profileId);
    if(!p) return false;
    var perms = Array.isArray(p.programPermissions) ? p.programPermissions.slice() : [];
    perms = perms.filter(function(id){ return id !== programId; });
    return api.update(profileId, { programPermissions: perms });
  };

  api.hasProgramPermission = function(profileId, programId){
    var p = api.get(profileId);
    if(!p) return false;
    return Array.isArray(p.programPermissions) && p.programPermissions.indexOf(programId) !== -1;
  };

  // Réconcilie les permissions d'un profil "propriétaire" (Bertin) avec le
  // catalogue courant : accorde tout programme privé ajouté au catalogue APRÈS
  // la création du profil (la migration est un one-shot qui n'accorde qu'une
  // fois). Idempotent. Le propriétaire est identifié par le marqueur
  // macrocycleOverrideKey posé à la migration — jamais par le nom, car un
  // client pourrait s'appeler Bertin. Ne touche aucun profil client.
  api.reconcileOwnerPermissions = function(){
    var ids = window.BERTIN_PRIVATE_PROGRAM_IDS;
    if(!Array.isArray(ids) || !ids.length) return false;
    var reg = readRegistry();
    var changed = false;
    reg.profiles.forEach(function(p){
      if(p.macrocycleOverrideKey !== "BERTIN_MACROCYCLE_OVERRIDE") return;
      var perms = Array.isArray(p.programPermissions) ? p.programPermissions.slice() : [];
      ids.forEach(function(id){ if(perms.indexOf(id) === -1){ perms.push(id); changed = true; } });
      p.programPermissions = perms;
    });
    if(changed) writeRegistry(reg);
    return changed;
  };

  // Admin (coach) vs client. Centralisé : toute vérification admin passe par ici.
  // Admin = flag isAdmin, sinon marqueur propriétaire posé à la migration.
  // Le nom du profil ne donne plus l'admin : créer un profil « Bertin » via
  // l'onboarding normal n'ouvre plus les outils coach — seul le PIN le fait.
  api.isActiveAdmin = function(){
    var p = api.getActive();
    if(!p) return false;
    return !!(p.isAdmin || p.macrocycleOverrideKey === "BERTIN_MACROCYCLE_OVERRIDE");
  };

  // Active un programme comme cycle courant d'un profil (même non actif), sans
  // basculer le profil actif et sans contaminer un autre profil. Écrit directement
  // dans le state du profil cible (clé racineState::<id>). On change le cycle, on
  // NE réinitialise PAS la personne : on préserve l'historique, les résultats et
  // les charges personnalisées du profil.
  api.setProfileActiveProgram = function(profileId, programId){
    var p = api.get(profileId);
    if(!p) return { ok:false, error:"Profil introuvable." };
    var catalog = window.COACH_BERTIN_PROGRAM_INDEX || [];
    var entry = null;
    for(var i=0;i<catalog.length;i++){ if(catalog[i].id === programId){ entry = catalog[i]; break; } }
    if(!entry) return { ok:false, error:"Programme inconnu dans le catalogue." };
    // Programme privé : accorder la permission au profil cible (geste attendu de l'admin).
    if(entry.visibility === "private" && !api.hasProgramPermission(profileId, programId)){
      api.grantProgramPermission(profileId, programId);
    }
    var keys = api.storageKeysFor(profileId);
    var st = {};
    try{ st = JSON.parse(localStorage.getItem(keys.state) || "{}") || {}; }catch(e){ st = {}; }
    st.cycle = st.cycle || {};
    st.cycle.goal = programId;
    st.week = 1;
    st.day = (window.COACH_BERTIN_PROGRAMS && COACH_BERTIN_PROGRAMS[programId] && COACH_BERTIN_PROGRAMS[programId].days && COACH_BERTIN_PROGRAMS[programId].days[0]) || "lundi";
    st.activeCycleStartDate = new Date().toISOString();
    // Préservés tels quels (jamais réinitialisés) : st.history, st.athleteState,
    // st.results et les charges du profil.
    try{ localStorage.setItem(keys.state, JSON.stringify(st)); }catch(e){ return { ok:false, error:"Écriture du state impossible." }; }
    // Si c'est le profil actif, resynchroniser l'UI.
    if(profileId === api.getActiveId() && typeof window.coachFullBoot === "function"){ window.coachFullBoot(); }
    return { ok:true };
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

  // Export multi-profils : un seul fichier JSON contenant tous les profils du
  // registre avec leurs données namespacées. Chaque entrée de `profiles`
  // reprend exactement le format d'export mono-profil.
  api.exportAllProfilesBlob = function(){
    var reg = readRegistry();
    var entries = [];
    reg.profiles.forEach(function(p){
      var blob = api.exportProfileBlob(p.id);
      if(blob) entries.push(blob);
    });
    if(!entries.length) return null;
    return {
      schema: "racine-profiles-export-multi-v1",
      exportedAt: new Date().toISOString(),
      appVersion: (window.APP_VERSION || null),
      profiles: entries
    };
  };

  // Détecte le format d'un fichier d'export : mono-profil ({profile,...}) ou
  // multi-profils ({profiles:[...]}). Retourne {kind, entries} ou null si le
  // fichier n'est pas un export Racine reconnaissable.
  api.parseExportPayload = function(payload){
    if(!payload || typeof payload !== "object") return null;
    if(Array.isArray(payload.profiles)){
      var entries = payload.profiles.filter(function(b){ return b && b.profile; });
      return entries.length ? { kind: "multi", entries: entries } : null;
    }
    if(payload.profile) return { kind: "single", entries: [payload] };
    return null;
  };

  // Importe un blob mono-profil. Par défaut, crée toujours un nouveau profil
  // (jamais d'écrasement implicite) et le rend actif.
  // opts.setActive === false : n'active pas le profil importé (import multi).
  // opts.replaceId : remplace ce profil existant (l'appelant doit avoir obtenu
  // une confirmation explicite de l'utilisateur avant).
  api.importProfileBlob = function(blob, opts){
    opts = opts || {};
    if(!blob || !blob.profile) return null;
    var reg = readRegistry();
    var incoming = Object.assign({}, blob.profile, { id: uid(), importedAt:new Date().toISOString() });
    var replaced = false;
    if(opts.replaceId){
      var idx = findIndex(reg, opts.replaceId);
      if(idx >= 0){
        try{
          var oldKeys = api.storageKeysFor(opts.replaceId);
          localStorage.removeItem(oldKeys.state);
          localStorage.removeItem(oldKeys.charges);
        }catch(e){}
        reg.profiles[idx] = incoming;
        if(reg.activeProfileId === opts.replaceId) reg.activeProfileId = incoming.id;
        replaced = true;
      }
    }
    if(!replaced) reg.profiles.push(incoming);
    if(opts.setActive !== false) reg.activeProfileId = incoming.id;
    writeRegistry(reg);
    var keys = api.storageKeysFor(incoming.id);
    try{ if(blob.state) localStorage.setItem(keys.state, JSON.stringify(blob.state)); }catch(e){}
    try{ if(blob.customCharges) localStorage.setItem(keys.charges, JSON.stringify(blob.customCharges)); }catch(e){}
    return incoming.id;
  };

  api.ready = true;
})();

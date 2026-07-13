// Racine — remplacements de mouvements par profil (coach → client).
// Besoin : « mon Bench Press va mal, je le fais aux haltères » → le coach pose
// « Bench Press → DB Bench Press » sur CE profil, sans toucher le programme
// template ni les autres clients. Retirer la ligne = retour au programme.
// Stockage : state du profil (racineState::<id> → movementSwaps), isolation
// par construction. Application : buildWorkout() (programs/workouts.js),
// l'entonnoir unique de toutes les vues (séance guidée, résultats, PC, WOD+).
// Le moteur de charges suit tout seul : le nom remplaçant part dans
// CoachCharge.suggestLoad. Voir docs/IDEES_FUTURES.md (idée 1).
(function(){
  var api = window.RacineMovementSwaps = window.RacineMovementSwaps || {};

  function norm(s){ return String(s||"").trim().toLowerCase(); }

  function sanitize(list){
    if(!Array.isArray(list)) return [];
    return list.filter(function(s){ return s && norm(s.from) && norm(s.to); })
      .map(function(s){ return { from:String(s.from).trim(), to:String(s.to).trim(), note:String(s.note||"").trim() }; });
  }

  // ── Lecture/écriture par profil ────────────────────────────────────────────
  // Profil actif : on passe par le state en mémoire + save(), sinon la
  // prochaine sauvegarde écraserait l'écriture directe. Autre profil :
  // écriture directe dans sa clé localStorage (même approche que
  // CoachProfiles.setProfileActiveProgram).
  api.listFor = function(profileId){
    var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
    if(profileId === activeId && typeof state === "object" && state){
      return sanitize(state.movementSwaps);
    }
    try{
      var keys = CoachProfiles.storageKeysFor(profileId);
      var st = JSON.parse(localStorage.getItem(keys.state) || "{}") || {};
      return sanitize(st.movementSwaps);
    }catch(e){ return []; }
  };

  function writeFor(profileId, list){
    list = sanitize(list);
    var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
    if(profileId === activeId && typeof state === "object" && state){
      state.movementSwaps = list;
      if(typeof save === "function") save();
      return true;
    }
    try{
      var keys = CoachProfiles.storageKeysFor(profileId);
      var st = JSON.parse(localStorage.getItem(keys.state) || "{}") || {};
      st.movementSwaps = list;
      localStorage.setItem(keys.state, JSON.stringify(st));
      return true;
    }catch(e){ return false; }
  }

  // Un seul remplacement par mouvement d'origine : ajouter remplace la ligne.
  api.add = function(profileId, from, to, note){
    from = String(from||"").trim(); to = String(to||"").trim();
    if(!from || !to) return { ok:false, error:"Mouvement d'origine et remplaçant requis." };
    if(norm(from) === norm(to)) return { ok:false, error:"Le remplaçant doit être différent du mouvement d'origine." };
    var list = api.listFor(profileId).filter(function(s){ return norm(s.from) !== norm(from); });
    list.push({ from:from, to:to, note:String(note||"").trim() });
    return writeFor(profileId, list) ? { ok:true } : { ok:false, error:"Écriture impossible." };
  };

  api.remove = function(profileId, from){
    var list = api.listFor(profileId).filter(function(s){ return norm(s.from) !== norm(from); });
    return writeFor(profileId, list) ? { ok:true } : { ok:false, error:"Écriture impossible." };
  };

  // ── Application runtime (profil actif) ─────────────────────────────────────
  function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Appliqué par buildWorkout() juste avant le return. Ne mute JAMAIS les
  // objets du programme : blocs et exercices touchés sont copiés (un programme
  // qui réutilise ses objets ne doit pas accumuler les remplacements).
  api.applyToWorkout = function(w){
    var swaps = (typeof state === "object" && state) ? sanitize(state.movementSwaps) : [];
    if(!swaps.length || !w || !Array.isArray(w.blocks)) return w;
    var byFrom = {};
    swaps.forEach(function(s){ byFrom[norm(s.from)] = s; });
    w.blocks = w.blocks.map(function(b){
      var nb = Object.assign({}, b);
      if(Array.isArray(b.exercises)){
        nb.exercises = b.exercises.map(function(e){
          var s = byFrom[norm(e.name)];
          if(!s) return e;
          var ne = Object.assign({}, e);
          ne.name = s.to;
          var mark = "Remplace « " + s.from + " »" + (s.note ? " — " + s.note : "");
          ne.note = e.note ? (e.note + " · " + mark) : mark;
          return ne;
        });
      }
      if(nb.text){
        swaps.forEach(function(s){
          nb.text = String(nb.text).replace(new RegExp(escapeRegExp(s.from), "gi"), s.to);
        });
      }
      return nb;
    });
    return w;
  };
})();

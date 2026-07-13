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

  // ── Catalogue de noms de mouvements ────────────────────────────────────────
  // La syntaxe exacte compte : le moteur de charges reconnaît un mouvement par
  // son nom. L'UI admin doit donc proposer une liste, pas un champ libre.
  // Sources réunies : mouvements du programme actif du profil ciblé (les
  // candidats naturels au remplacement), fiches vidéo/tuto (noms canoniques)
  // et mouvements principaux de config.
  function profileStateFor(profileId){
    var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
    if(profileId === activeId && typeof state === "object" && state) return state;
    try{
      var keys = CoachProfiles.storageKeysFor(profileId);
      return JSON.parse(localStorage.getItem(keys.state) || "{}") || {};
    }catch(e){ return {}; }
  }
  function programMovementNames(profileId){
    var names = [], seen = {};
    try{
      var st = profileStateFor(profileId);
      var goal = st.cycle && st.cycle.goal;
      var cfg = goal && window.focusConfigs && window.focusConfigs[goal];
      if(!cfg || typeof cfg.getBlocks !== "function") return names;
      var progs = window.COACH_BERTIN_PROGRAMS || {};
      var days = (progs[goal] && progs[goal].days) ||
                 ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
      var entry = (window.COACH_BERTIN_PROGRAM_INDEX || []).filter(function(p){ return p.id === goal; })[0];
      // Rotation hebdomadaire des accessoires : balayer toutes les semaines du cycle.
      var weeks = Math.min(Math.max(Number(entry && entry.durationWeeks) || 4, 1), 12);
      for(var wk = 1; wk <= weeks; wk++){
        days.forEach(function(day){
          var blocks = [];
          try{ blocks = cfg.getBlocks(day, wk) || []; }catch(e){}
          blocks.forEach(function(b){
            ((b && b.exercises) || []).forEach(function(e){
              var n = e && e.name ? String(e.name).trim() : "";
              if(n && !seen[norm(n)]){ seen[norm(n)] = true; names.push(n); }
            });
          });
        });
      }
    }catch(e){}
    return names;
  }
  // Retourne { program: [...], others: [...] }, chaque liste triée. `program`
  // = mouvements réellement présents dans le programme actif du profil.
  api.movementCatalog = function(profileId){
    var program = programMovementNames(profileId);
    var seen = {}, others = [];
    program.forEach(function(n){ seen[norm(n)] = true; });
    function push(n){
      n = String(n||"").trim();
      if(!n || seen[norm(n)]) return;
      seen[norm(n)] = true;
      others.push(n);
    }
    try{ Object.keys(window.COACH_BERTIN_MOVEMENT_VIDEOS || {}).forEach(push); }catch(e){}
    try{ Object.keys(window.COACH_BERTIN_TUTORIALS || {}).forEach(push); }catch(e){}
    try{
      var mv = (typeof movements === "object" && movements) || {};
      Object.keys(mv).forEach(function(k){ push(mv[k] && mv[k].name); });
    }catch(e){}
    function cmp(a,b){ return a.localeCompare(b, "fr"); }
    return { program: program.slice().sort(cmp), others: others.sort(cmp) };
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

// Racine — Coach IA : les semaines générées, stockées par profil.
//
// C'est le seul fichier du domaine qui écrit une donnée durable. Tout le
// reste est lecture ou conversation. Les règles qui le gouvernent :
//
//  - STOCKAGE : state.aiPlan, donc dans racineState::<profil>, donc isolé par
//    profil par construction — même choix que movementSwaps
//    (scripts/profiles/swaps.js). Aucun NOUVEAU chemin de persistance :
//    l'écriture passe par save(), la sauvegarde existante.
//  - SCHÉMA VERSIONNÉ (CLAUDE.md §2.1) : `schema` + migration ascendante qui
//    préserve l'existant. Jamais de suppression de clé, jamais de clear().
//  - LE MOTEUR GARDE LA MAIN SUR LES POIDS. sanitizeExercise() EFFACE toute
//    charge chiffrée venue du modèle. Ce n'est pas un filtre de politesse :
//    dans programs/, une charge chiffrée est un %1RM de l'athlète de
//    référence que scaling.js redescend ensuite au niveau réel. Un nombre
//    écrit par un modèle est ambigu entre les deux, et l'ambiguïté donne une
//    double réduction — des poids ridicules (CLAUDE.md §3.2). On laisse donc
//    `load` vide et CoachCharge.suggestForExercise() calcule, comme pour
//    n'importe quel programme.
//  - L'INTENTION, elle, passe. `technique`/`léger` sont exactement les mots
//    que coachExtractMovementIntent() lit déjà pour couper l'auto-progression.
//    C'est le canal prévu pour dire « vas-y doucement » sans écrire un poids.
(function(){
  "use strict";

  var api = window.CoachAIPlan = window.CoachAIPlan || {};

  var SCHEMA = 1;
  var VERSIONS_KEPT = 3;   // instantanés gardés pour revenir en arrière
  var MAX_WEEKS = 12;
  var MAX_BLOCKS = 10;
  var MAX_EXERCISES = 10;
  var MAX_ADJUSTMENTS = 60;  // plafonné : le stockage local n'a pas de copie serveur

  // Même liste que le contrat de bloc (CLAUDE.md §3.1). Un kind inconnu
  // casserait le rendu et la capture de résultats : on le ramène à
  // "accessory" plutôt que de laisser passer.
  var KINDS = ["warmup","main","secondary","hypertrophy","accessory","technique","core","wod","mobility","bonus"];

  // Intentions que le moteur de charges sait déjà lire dans une note.
  var INTENTS = {
    normale:    "",
    technique:  "technique",
    legere:     "léger",
    "légère":   "léger",
    facile:     "facile",
    lourde:     ""
  };

  function str(v){ return String(v==null?"":v).trim(); }
  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }

  function defaults(){ return {schema:SCHEMA, updatedAt:null, weeks:{}, adjustments:[], versions:[]}; }

  // Migration ascendante : on part du défaut et on recouvre avec l'existant.
  // Un plan écrit par une version antérieure garde ses semaines.
  function migrate(raw){
    if(!raw || typeof raw !== "object") return defaults();
    var out = defaults();
    out.updatedAt = raw.updatedAt || null;
    out.weeks = (raw.weeks && typeof raw.weeks === "object") ? raw.weeks : {};
    out.adjustments = Array.isArray(raw.adjustments) ? raw.adjustments.slice(-MAX_ADJUSTMENTS) : [];
    out.versions = Array.isArray(raw.versions) ? raw.versions.slice(-VERSIONS_KEPT) : [];
    out.schema = SCHEMA;
    return out;
  }

  function read(){
    try{ return migrate(window.state && state.aiPlan); }
    catch(e){ return defaults(); }
  }

  function write(plan){
    try{
      if(typeof state !== "object" || !state) return false;
      plan = migrate(plan);
      plan.updatedAt = nowIso();
      state.aiPlan = plan;
      if(typeof save === "function") save();
      // Le programme ai_custom tient sa liste de jours depuis le plan : sans
      // ce rafraîchissement, une semaine générée sur 5 jours resterait
      // affichée sur les 4 jours précédents.
      try{
        if(window.RacineAICustomProgram && typeof RacineAICustomProgram.refresh === "function") RacineAICustomProgram.refresh();
      }catch(e){ /* jamais bloquant */ }
      return true;
    }catch(e){ return false; }
  }

  // ── Nettoyage : c'est ici que la frontière IA / moteur est tenue ────────

  function sanitizeExercise(e){
    e = e || {};
    var name = str(e.name);
    if(!name) return null;

    var intentKey = str(e.intention).toLowerCase();
    var intentWord = Object.prototype.hasOwnProperty.call(INTENTS, intentKey) ? INTENTS[intentKey] : "";

    // La note porte l'intention, pas un chiffre. Si le modèle a quand même
    // écrit une charge, elle finit ici en texte consultatif — visible,
    // discutable, mais jamais interprétée comme une prescription de poids.
    var note = str(e.note);
    if(intentWord) note = note ? (intentWord + " · " + note) : intentWord;

    return {
      name: name,
      format: str(e.format) || "—",
      // Vide volontairement : CoachCharge.suggestForExercise() remplit.
      load: "—",
      rest: str(e.rest) || "—",
      note: note
    };
  }

  function sanitizeBlock(b){
    b = b || {};
    var title = str(b.title);
    if(!title) return null;

    var kind = str(b.kind).toLowerCase();
    if(KINDS.indexOf(kind) < 0) kind = "accessory";

    var out = {
      time: str(b.time) || "—",
      title: title,
      tag: str(b.tag) || "Coach IA",
      kind: kind
    };

    var exercises = Array.isArray(b.exercises) ? b.exercises : null;
    if(exercises && exercises.length){
      var list = [];
      exercises.slice(0, MAX_EXERCISES).forEach(function(e){
        var se = sanitizeExercise(e);
        if(se) list.push(se);
      });
      if(list.length){ out.exercises = list; return out; }
    }

    // Un bloc sans exercices doit avoir un texte, sinon il s'affiche vide.
    out.text = str(b.text);
    return out.text ? out : null;
  }

  function sanitizeDays(days){
    var out = {};
    if(!days || typeof days !== "object") return out;
    Object.keys(days).forEach(function(day){
      var d = str(day).toLowerCase();
      if(!d) return;
      var blocks = Array.isArray(days[day]) ? days[day] : [];
      var list = [];
      blocks.slice(0, MAX_BLOCKS).forEach(function(b){
        var sb = sanitizeBlock(b);
        if(sb) list.push(sb);
      });
      if(list.length) out[d] = list;
    });
    return out;
  }

  api.sanitizeWeek = function(week){
    week = week || {};
    var days = sanitizeDays(week.days);
    if(!Object.keys(days).length) return null;
    return {
      label: str(week.label) || "Semaine Coach IA",
      goal: str(week.goal),
      createdAt: nowIso(),
      days: days
    };
  };

  // ── Lecture ────────────────────────────────────────────────────────────

  api.get = read;

  api.getWeek = function(week){
    var plan = read();
    return plan.weeks[String(week)] || null;
  };

  api.hasWeek = function(week){ return !!api.getWeek(week); };

  api.blocksFor = function(day, week){
    var w = api.getWeek(week);
    if(!w) return null;
    var blocks = w.days[str(day).toLowerCase()];
    return (Array.isArray(blocks) && blocks.length) ? blocks : null;
  };

  api.weekNumbers = function(){
    return Object.keys(read().weeks).map(Number).filter(function(n){ return !isNaN(n); }).sort(function(a,b){ return a-b; });
  };

  api.summary = function(){
    var plan = read();
    var nums = api.weekNumbers();
    if(!nums.length) return "";
    return nums.map(function(n){
      var w = plan.weeks[String(n)] || {};
      var days = Object.keys(w.days || {});
      return "Semaine " + n + " — " + str(w.label) + " (" + days.join(", ") + ")"
        + (str(w.goal) ? " · objectif : " + str(w.goal) : "");
    }).join("\n");
  };

  // ── Écriture ───────────────────────────────────────────────────────────

  // Un instantané AVANT chaque écriture : c'est ce qui rend « annuler »
  // possible sans demander à l'athlète de faire confiance à une génération.
  function snapshot(plan){
    var versions = Array.isArray(plan.versions) ? plan.versions.slice() : [];
    versions.push({
      at: nowIso(),
      weeks: JSON.parse(JSON.stringify(plan.weeks || {})),
      adjustments: JSON.parse(JSON.stringify(plan.adjustments || []))
    });
    return versions.slice(-VERSIONS_KEPT);
  }

  api.setWeek = function(weekNumber, week){
    var n = Number(weekNumber);
    if(isNaN(n) || n < 1 || n > MAX_WEEKS) return {ok:false, error:"Numéro de semaine hors bornes (1–" + MAX_WEEKS + ")."};

    var clean = api.sanitizeWeek(week);
    if(!clean) return {ok:false, error:"Semaine vide après validation : aucun bloc exploitable."};

    var plan = read();
    plan.versions = snapshot(plan);
    plan.weeks[String(n)] = clean;
    if(!write(plan)) return {ok:false, error:"Écriture impossible (stockage local)."};
    return {ok:true, week:n, days:Object.keys(clean.days)};
  };

  // Retire une semaine générée. L'athlète retrouve son programme d'origine :
  // rien n'a été écrasé, la semaine générée n'était qu'une surcouche.
  api.removeWeek = function(weekNumber){
    var plan = read();
    var key = String(Number(weekNumber));
    if(!plan.weeks[key]) return {ok:false, error:"Aucune semaine générée à ce numéro."};
    plan.versions = snapshot(plan);
    delete plan.weeks[key];
    if(!write(plan)) return {ok:false, error:"Écriture impossible (stockage local)."};
    return {ok:true};
  };

  // ── Ajustements d'exercice (format / repos / note) ─────────────────────
  //
  // Ils existent pour une raison précise : « change-moi les reps » doit
  // marcher sur N'IMPORTE QUELLE semaine, pas seulement sur une semaine
  // générée. Un ajustement vise un mouvement, un jour et une semaine, et il
  // s'applique en surcouche — le programme d'origine n'est jamais muté.
  //
  // Ce qu'un ajustement ne peut PAS faire : écrire une charge. Il n'y a pas
  // de champ pour ça, volontairement (voir l'en-tête du fichier).

  function normName(v){
    var s = str(v).toLowerCase();
    try{ s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }catch(e){}
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }

  api.listAdjustments = function(){ return read().adjustments.slice(); };

  api.addAdjustment = function(adj){
    adj = adj || {};
    var movement = str(adj.movement);
    var day = str(adj.day).toLowerCase();
    var week = Number(adj.week);
    if(!movement) return {ok:false, error:"Mouvement manquant."};
    if(!day) return {ok:false, error:"Jour manquant."};
    if(isNaN(week) || week < 1) return {ok:false, error:"Numéro de semaine invalide."};
    if(!str(adj.format) && !str(adj.note) && !str(adj.rest)) return {ok:false, error:"Rien à ajuster (ni format, ni repos, ni note)."};

    var plan = read();
    // Un seul ajustement par (semaine, jour, mouvement) : ré-ajuster remplace,
    // sinon les surcouches s'empileraient sans que personne puisse les lire.
    var list = plan.adjustments.filter(function(a){
      return !(Number(a.week) === week && str(a.day).toLowerCase() === day && normName(a.movement) === normName(movement));
    });
    list.push({
      week: week,
      day: day,
      movement: movement,
      format: str(adj.format),
      rest: str(adj.rest),
      note: str(adj.note),
      createdAt: nowIso()
    });
    plan.adjustments = list.slice(-MAX_ADJUSTMENTS);
    if(!write(plan)) return {ok:false, error:"Écriture impossible (stockage local)."};
    return {ok:true};
  };

  api.removeAdjustment = function(week, day, movement){
    var plan = read();
    var before = plan.adjustments.length;
    plan.adjustments = plan.adjustments.filter(function(a){
      return !(Number(a.week) === Number(week) && str(a.day).toLowerCase() === str(day).toLowerCase() && normName(a.movement) === normName(movement));
    });
    if(plan.adjustments.length === before) return {ok:false, error:"Aucun ajustement correspondant."};
    if(!write(plan)) return {ok:false, error:"Écriture impossible (stockage local)."};
    return {ok:true};
  };

  // Appelé par buildWorkout(), APRÈS les remplacements de mouvements : on
  // vise le nom que l'athlète voit réellement à l'écran, pas le nom d'origine
  // du template. Ne mute jamais les objets du programme — copie comme
  // RacineMovementSwaps.applyToWorkout.
  api.applyToWorkout = function(w, day, week){
    var adjustments;
    try{ adjustments = read().adjustments; }catch(e){ return w; }
    if(!adjustments.length || !w || !Array.isArray(w.blocks)) return w;

    var dayKey = str(day).toLowerCase();
    var weekNum = Number(week);
    var byMovement = {};
    adjustments.forEach(function(a){
      if(Number(a.week) !== weekNum) return;
      if(str(a.day).toLowerCase() !== dayKey) return;
      byMovement[normName(a.movement)] = a;
    });
    if(!Object.keys(byMovement).length) return w;

    w.blocks = w.blocks.map(function(b){
      if(!Array.isArray(b.exercises)) return b;
      var touched = false;
      var exercises = b.exercises.map(function(e){
        var a = byMovement[normName(e && e.name)];
        if(!a) return e;
        touched = true;
        var ne = Object.assign({}, e);
        if(str(a.format)) ne.format = str(a.format);
        if(str(a.rest)) ne.rest = str(a.rest);
        var mark = "Ajusté par Coach IA" + (str(a.note) ? " — " + str(a.note) : "");
        ne.note = str(e.note) ? (str(e.note) + " · " + mark) : mark;
        return ne;
      });
      if(!touched) return b;
      var nb = Object.assign({}, b);
      nb.exercises = exercises;
      return nb;
    });
    return w;
  };

  api.undo = function(){
    var plan = read();
    var versions = Array.isArray(plan.versions) ? plan.versions.slice() : [];
    if(!versions.length) return {ok:false, error:"Aucune version précédente."};
    var last = versions.pop();
    plan.weeks = (last && last.weeks) || {};
    plan.adjustments = (last && Array.isArray(last.adjustments)) ? last.adjustments : [];
    plan.versions = versions;
    if(!write(plan)) return {ok:false, error:"Écriture impossible (stockage local)."};
    return {ok:true, at:last && last.at};
  };

  api.SCHEMA = SCHEMA;
  api.KINDS = KINDS;
  api.INTENTS = Object.keys(INTENTS);
})();

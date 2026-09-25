// Racine — Coach IA : ce que le modèle voit de l'athlète.
//
// Rôle : transformer l'état local (historique brut, état dérivé, mémoire
// Brain, notes de séance) en un texte compact que le modèle peut lire.
//
// Trois règles de fabrication :
//  1. LECTURE SEULE. Ce fichier n'écrit rien, nulle part. Il ne touche ni
//     athlete_state, ni resultats, ni charges.js (CLAUDE.md §2.2).
//  2. BORNÉ. Tout est plafonné. Un historique de deux ans ne doit pas partir
//     dans un prompt : on envoie une vue récente + des agrégats, et le modèle
//     demande le détail d'un mouvement via l'outil `consulter_mouvement`.
//  3. PAS DE SECRET. La clé API vit ailleurs (config.js) et n'entre jamais
//     dans un contexte. Rien d'identifiant non plus : un prénom de profil
//     suffit, on n'envoie ni email ni identifiant d'appareil.
(function(){
  "use strict";

  var api = window.CoachAIContext = window.CoachAIContext || {};

  var SESSIONS_LIMIT = 8;      // séances détaillées envoyées d'office
  var NOTES_LIMIT = 8;         // notes d'athlète récentes
  var MOVEMENT_ROWS_LIMIT = 12; // lignes rendues par consulter_mouvement

  function str(v){ return String(v==null?"":v).trim(); }
  function num(v){
    var n = Number(str(v).replace(",", ".").replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }
  function norm(v){
    var s = str(v).toLowerCase();
    try{ s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }catch(e){}
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }
  function hist(){
    try{ return Array.isArray(window.state && state.history) ? state.history : []; }
    catch(e){ return []; }
  }
  // Le libellé canonique du moteur fait foi : une clé de résultat brute
  // ("backSquat", "back_squat"…) ne doit pas créer un mouvement fantôme
  // dans le contexte (règle des noms, docs/STRUCTURE_CONTRACT.md).
  function label(key, result){
    if(result && result.planned && result.planned.context && result.planned.context.label){
      return str(result.planned.context.label);
    }
    try{
      if(typeof window.canonicalMovementLabel === "function"){
        var l = window.canonicalMovementLabel(key);
        if(l) return str(l);
      }
    }catch(e){}
    try{
      if(typeof window.movementLabelFromKeyOrName === "function") return str(movementLabelFromKeyOrName(key));
    }catch(e){}
    return str(key);
  }

  // ── Bloc 1 : qui est l'athlète, où il en est ────────────────────────────
  function profileLines(){
    var lines = [], p = {}, c = {};
    try{ p = (window.state && state.profile) || {}; }catch(e){}
    try{ c = (window.state && state.cycle) || {}; }catch(e){}

    lines.push("## Athlète");
    if(str(p.name)) lines.push("Prénom : " + str(p.name));
    if(num(p.aggressiveness) != null) lines.push("Agressivité de progression : " + num(p.aggressiveness) + " (1.0 = neutre, borné 0.4–1.8)");

    var ratios = p.scaleRatios || {};
    var rk = Object.keys(ratios);
    if(rk.length){
      lines.push("Ratios de charge par famille (1.0 = niveau de l'athlète de référence) :");
      rk.forEach(function(k){ lines.push("  - " + k + " : " + ratios[k]); });
    }

    var programId = "";
    try{ programId = (typeof activeProgramId === "function") ? activeProgramId() : str(c.goal); }catch(e){ programId = str(c.goal); }
    var programLabel = "";
    try{ programLabel = (typeof focus === "function" && focus()) ? str(focus().label) : ""; }catch(e){}

    lines.push("");
    lines.push("## Position dans le cycle");
    lines.push("Programme actif : " + (programLabel || programId || "inconnu") + (programId ? " (id " + programId + ")" : ""));
    try{ lines.push("Semaine " + str(state.week) + " · jour courant : " + str(state.day)); }catch(e){}
    var days = [];
    try{
      days = (typeof currentDayOrder === "function") ? (currentDayOrder() || []) : [];
      if(days.length) lines.push("Jours d'entraînement : " + days.join(", "));
    }catch(e){ days = []; }
    try{
      var done = Array.isArray(state.completedDays) ? state.completedDays : [];
      lines.push("Jours déjà complétés cette semaine : " + (done.length ? done.join(", ") : "aucun"));
      // Même filtre que isDayMissed() (app.js) : semaine courante ET programme
      // actif. Une ancienne entrée sans `cycle` est ignorée, comme l'écran
      // l'ignore déjà — le coach ne doit pas voir un « manqué » que l'athlète
      // ne voit pas. Sans `reason`, on affiche le jour seul.
      var missed = [], missedDays = [];
      (Array.isArray(state.missedDays) ? state.missedDays : []).forEach(function(x){
        if(!x || !str(x.day) || Number(x.week) !== Number(state.week)) return;
        if(!programId || str(x.cycle) !== programId) return;
        if(missedDays.indexOf(x.day) >= 0 || done.indexOf(x.day) >= 0) return;
        missedDays.push(x.day);
        missed.push(str(x.day) + (str(x.reason) ? " (" + str(x.reason) + ")" : ""));
      });
      lines.push("Jours manqués cette semaine : " + (missed.length ? missed.join(", ") : "aucun"));
      if(days.length){
        var left = days.filter(function(d){ return done.indexOf(d) < 0 && missedDays.indexOf(d) < 0; });
        lines.push("Jours restants cette semaine : " + (left.length ? left.join(", ") : "aucun"));
      }
    }catch(e){}

    return lines;
  }

  // ── Bloc 2 : les séances récentes, telles qu'elles ont été vécues ───────
  // Le journal brut prime sur l'état dérivé (docs/DATA_FLOW_CONTRACT.md) :
  // on montre ce que l'athlète a réellement inscrit, pas une reconstruction.
  function sessionLines(limit){
    var lines = ["", "## Séances récentes (la plus récente en premier)"];
    var rows = hist().slice(-(limit || SESSIONS_LIMIT)).reverse();
    if(!rows.length){ lines.push("Aucune séance enregistrée."); return lines; }

    rows.forEach(function(s){
      var head = "- " + str(s.date) + " · S" + str(s.week) + " · " + str(s.day);
      if(str(s.focus)) head += " · " + str(s.focus);
      lines.push(head);
      var results = (s && s.results) || {};
      Object.keys(results).forEach(function(key){
        var r = results[key] || {};
        var parts = [];
        var load = num(r.load), reps = num(r.reps), rpe = num(r.rpe);
        if(load != null) parts.push(load + " lb");
        if(reps != null) parts.push(reps + " reps");
        if(rpe != null) parts.push("RPE " + rpe);
        if(str(r.time)) parts.push(str(r.time));
        if(str(r.rounds)) parts.push(str(r.rounds) + " rounds");
        if(!parts.length && !str(r.note)) return;
        var line = "    · " + label(key, r) + (parts.length ? " — " + parts.join(" × ") : "");
        if(str(r.note)) line += "  [note : " + str(r.note) + "]";
        lines.push(line);
      });
    });
    return lines;
  }

  // ── Bloc 3 : les notes, séparées et datées ─────────────────────────────
  // Elles sont déjà dans les séances ci-dessus, mais les regrouper aide le
  // modèle à voir un motif qui traverse plusieurs semaines (« épaule gauche »
  // trois fois en un mois) au lieu d'une remarque isolée.
  function noteLines(limit){
    var out = [];
    hist().slice().reverse().forEach(function(s){
      var results = (s && s.results) || {};
      Object.keys(results).forEach(function(key){
        var note = str((results[key] || {}).note);
        if(!note) return;
        out.push("- " + str(s.date) + " · " + label(key, results[key]) + " : " + note);
      });
    });
    if(!out.length) return [];
    return ["", "## Notes écrites par l'athlète pendant ses séances"].concat(out.slice(0, limit || NOTES_LIMIT));
  }

  // ── Bloc 4 : ce que Brain a appris ─────────────────────────────────────
  // La précision RÉCENTE et la tendance, jamais la précision à vie : celle-ci
  // est cumulative, elle se fige avec le volume et noie le progrès récent
  // (CLAUDE.md §8).
  function brainLines(){
    var lines = [];
    var mem = null;
    try{ mem = window.CoachBrainMemory ? CoachBrainMemory.read() : null; }catch(e){}
    if(!mem) return lines;

    lines.push("", "## Ce que le moteur de charges a appris");

    try{
      var trend = CoachBrainMemory.precisionTrend ? CoachBrainMemory.precisionTrend() : null;
      if(trend && trend.length){
        lines.push("Courbe de précision (un point par mois, du plus ancien au plus récent) :");
        lines.push("  " + trend.map(function(p){
          var pct = (p && p.precision != null) ? Math.round(p.precision * 100) + " %" : "n/d";
          return str(p && (p.month || p.key)) + " " + pct;
        }).join(" · "));
      }
    }catch(e){}

    var profiles = {};
    try{
      var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
      profiles = (mem.profiles && (mem.profiles[activeId] || mem.profiles)) || {};
    }catch(e){ profiles = mem.profiles || {}; }

    var keys = Object.keys(profiles || {});
    if(keys.length){
      lines.push("Par mouvement et intention — prédictions testées / réussies / trop ambitieuses / trop prudentes :");
      keys.slice(0, 30).forEach(function(k){
        var p = profiles[k] || {};
        if(typeof p !== "object" || p.tested == null) return;
        var recent = null;
        try{ recent = CoachBrainMemory.recentPrecision ? CoachBrainMemory.recentPrecision(p) : null; }catch(e){}
        lines.push("  - " + k + " : " + num(p.tested) + " / " + num(p.succeeded) + " / " + num(p.tooAmbitious) + " / " + num(p.tooCautious)
          + (recent != null ? "  (précision récente " + Math.round(recent * 100) + " %)" : ""));
      });
    }
    return lines;
  }

  // ── Bloc 5 : les contraintes matérielles et les remplacements en cours ──
  function constraintLines(){
    var lines = ["", "## Contraintes"];

    var eq = null;
    try{ eq = window.RACINE_EQUIPMENT || null; }catch(e){}
    if(eq){
      if(eq.dumbbells && eq.dumbbells.values) lines.push("Haltères disponibles (lb) : " + eq.dumbbells.values.join(", "));
      if(eq.barbells && eq.barbells.step) lines.push("Barre : incrément de " + eq.barbells.step + " lb");
      if(eq.kettlebells && eq.kettlebells.values) lines.push("Kettlebells (lb) : " + eq.kettlebells.values.join(", "));
    }

    try{
      var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
      var swaps = window.RacineMovementSwaps ? RacineMovementSwaps.listFor(activeId) : [];
      if(swaps && swaps.length){
        lines.push("Remplacements de mouvements déjà actifs sur ce profil :");
        swaps.forEach(function(s){
          lines.push("  - " + s.from + " → " + s.to + (s.note ? " (" + s.note + ")" : ""));
        });
      }
    }catch(e){}

    return lines;
  }

  // ── Bloc 6 : la semaine générée en cours, s'il y en a une ──────────────
  function planLines(){
    try{
      if(!window.CoachAIPlan || typeof CoachAIPlan.summary !== "function") return [];
      var s = CoachAIPlan.summary();
      if(!s) return [];
      return ["", "## Semaines déjà générées par Coach IA", s];
    }catch(e){ return []; }
  }

  // ── Assemblage ─────────────────────────────────────────────────────────
  api.build = function(opts){
    opts = opts || {};
    var lines = []
      .concat(profileLines())
      .concat(sessionLines(opts.sessions))
      .concat(noteLines(opts.notes))
      .concat(brainLines())
      .concat(constraintLines())
      .concat(planLines());
    return lines.join("\n");
  };

  // ── Outil `consulter_mouvement` : le détail à la demande ────────────────
  // C'est ce qui permet de garder le contexte de base court : le modèle
  // creuse un mouvement seulement quand il en a besoin.
  api.movementDetail = function(name){
    var wanted = norm(name);
    if(!wanted) return "Nom de mouvement vide.";

    var lines = ["Historique de « " + str(name) + " » (le plus récent en premier) :"];
    var found = 0;

    var sessions = hist().slice().reverse();
    for(var i = 0; i < sessions.length && found < MOVEMENT_ROWS_LIMIT; i++){
      var s = sessions[i] || {};
      var results = s.results || {};
      var keys = Object.keys(results);
      for(var j = 0; j < keys.length && found < MOVEMENT_ROWS_LIMIT; j++){
        var r = results[keys[j]] || {};
        if(norm(label(keys[j], r)) !== wanted) continue;
        var parts = [];
        if(num(r.load) != null) parts.push(num(r.load) + " lb");
        if(num(r.reps) != null) parts.push(num(r.reps) + " reps");
        if(num(r.rpe) != null) parts.push("RPE " + num(r.rpe));
        lines.push("- " + str(s.date) + " · S" + str(s.week) + " · " + (parts.join(" × ") || "aucun chiffre")
          + (str(r.note) ? "  [note : " + str(r.note) + "]" : ""));
        found++;
      }
    }
    if(!found) lines.push("- Aucun résultat enregistré pour ce mouvement.");

    // La suggestion courante du moteur : c'est elle qui fait autorité sur le
    // poids, et le modèle doit la voir pour raisonner AUTOUR, pas contre.
    try{
      if(window.CoachCharge && typeof CoachCharge.suggestLoad === "function"){
        var sug = CoachCharge.suggestLoad({name: str(name)});
        if(sug != null) lines.push("", "Charge actuellement suggérée par le moteur : " + str(sug.load != null ? sug.load : sug));
      }
    }catch(e){}

    try{
      if(window.CoachBrainExplain && typeof CoachBrainExplain.build === "function"){
        var ex = CoachBrainExplain.build({name: str(name)});
        if(ex && str(ex.text)) lines.push("Explication du moteur : " + str(ex.text));
      }
    }catch(e){}

    return lines.join("\n");
  };

  api.SESSIONS_LIMIT = SESSIONS_LIMIT;
  api.NOTES_LIMIT = NOTES_LIMIT;
})();

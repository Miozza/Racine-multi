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
//     demande le détail via les outils de lecture (`consulter_mouvement`,
//     `consulter_seance`, `consulter_programme`).
//  3. PAS DE SECRET. La clé API vit ailleurs (config.js) et n'entre jamais
//     dans un contexte. Rien d'identifiant non plus : un prénom de profil
//     suffit, on n'envoie ni email ni identifiant d'appareil.
(function(){
  "use strict";

  var api = window.CoachAIContext = window.CoachAIContext || {};

  var SESSIONS_LIMIT = 8;      // séances détaillées envoyées d'office
  var NOTES_LIMIT = 8;         // notes d'athlète récentes
  var MOVEMENT_ROWS_LIMIT = 12; // lignes rendues par consulter_mouvement
  var BLOCK_TEXT_LIMIT = 700;   // texte d'un bloc (metcon, consigne) rendu tel quel
  var WEEKS_MAP_LIMIT = 16;     // semaines listées dans la carte du programme
  var ALL_DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];

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

  // ── Lignes WOD : clé interne `wod_<titre du bloc>` (results.js) ─────────
  // Un metcon n'a ni charge ni reps : son résultat vit dans `result` (score,
  // temps), `rounds` (repli durable de l'AMRAP) et `note`. Les "0" de load/reps
  // sont des champs vides, et RPE 0 veut dire « non saisi » — jamais une valeur.
  var WOD_PREFIX = "wod_";
  function isWodKey(key){ return str(key).indexOf(WOD_PREFIX) === 0; }
  function positive(v){ var n = num(v); return (n != null && n > 0) ? n : null; }
  function wodParts(r){
    var parts = [];
    if(str(r.skipped) === "1" || str(r.skipped).toLowerCase() === "true"){
      return ["non fait" + (str(r.skipReason) ? " (" + str(r.skipReason) + ")" : "")];
    }
    var score = str(r.result);
    if(!score && positive(r.rounds) != null) score = positive(r.rounds) + " rounds";
    if(score) parts.push("score " + score);
    if(str(r.lastRoundRemaining)) parts.push(str(r.lastRoundRemaining));
    if(positive(r.rpe) != null) parts.push("RPE " + positive(r.rpe));
    return parts;
  }
  function liftParts(r){
    var parts = [];
    if(positive(r.load) != null) parts.push(positive(r.load) + " lb");
    if(positive(r.reps) != null) parts.push(positive(r.reps) + " reps");
    if(positive(r.rpe) != null) parts.push("RPE " + positive(r.rpe));
    if(str(r.time)) parts.push(str(r.time));
    if(positive(r.rounds) != null) parts.push(positive(r.rounds) + " rounds");
    return parts;
  }
  function rowLabel(key, r){
    return isWodKey(key) ? str(key).slice(WOD_PREFIX.length) + " (metcon)" : label(key, r);
  }

  // ── Notes système vs notes de l'athlète ────────────────────────────────
  // L'app écrit certaines phrases dans `note` (app.js : détection de PR,
  // saisie de PR, recalibrage). Ce ne sont pas des mots de l'athlète : le
  // modèle les lirait comme un ressenti. On les sépare à la lecture, ce qui
  // couvre aussi tout l'historique déjà stocké, sans migration.
  var SYSTEM_NOTES = [
    "PR automatique détecté",
    "PR saisi manuellement",
    "Reference de travail saisie",
    "Reference de travail (migration)",
    "Recalibrage saisi manuellement"
  ];
  function splitNote(r){
    r = r || {};
    var athlete = [], system = [];
    str(r.note).split(" · ").forEach(function(part){
      part = str(part);
      if(!part) return;
      (SYSTEM_NOTES.indexOf(part) >= 0 ? system : athlete).push(part);
    });
    if(r.autoPr){
      var pr = "PR automatique : " + (num(r.prOld) ? num(r.prOld) + " → " : "") + num(r.prNew) + " lb"
        + (num(r.prReps) ? " (repère " + num(r.prReps) + " rep" + (num(r.prReps) > 1 ? "s" : "") + ")" : "");
      system = system.filter(function(x){ return x !== "PR automatique détecté"; });
      system.unshift(pr);
    }
    if(r.trophyPr && r.trophyPr.new){
      system.push("Record " + str(r.trophyPr.label) + " : " + (num(r.trophyPr.old) ? num(r.trophyPr.old) + " → " : "") + num(r.trophyPr.new) + " lb");
    }
    return {athlete: athlete.join(" · "), system: system.join(" · ")};
  }
  function todayInfo(){
    var iso = "", day = "";
    try{ iso = (typeof todayIsoDate === "function") ? str(todayIsoDate()) : ""; }catch(e){}
    try{ day = (typeof actualDayName === "function") ? str(actualDayName()) : ""; }catch(e){}
    if(!iso || !day){
      var d = new Date();
      if(!iso) iso = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      if(!day) day = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][d.getDay()];
    }
    return {iso: iso, day: day};
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
      // Une composante hors de la bande RATIO_COMPONENT_MAX (onboarding.js)
      // est une saisie à la mauvaise échelle, déjà exclue des moyennes : le
      // modèle doit le savoir plutôt que lire « 7× la référence ».
      var band = (window.CoachOnboarding && CoachOnboarding.RATIO_COMPONENT_MAX) || 0;
      lines.push("Ratios de charge par famille (1.0 = niveau de l'athlète de référence) :");
      rk.forEach(function(k){
        var v = num(ratios[k]);
        var out = (v == null) ? str(ratios[k]) : String(Math.round(v * 100) / 100);
        if(band && v != null && k.charAt(0) !== "_" && v > band) out += " (hors bande : valeur saisie à une autre échelle, exclue des moyennes)";
        lines.push("  - " + k + " : " + out);
      });
    }

    var programId = "";
    try{ programId = (typeof activeProgramId === "function") ? activeProgramId() : str(c.goal); }catch(e){ programId = str(c.goal); }
    var programLabel = "";
    try{ programLabel = (typeof focus === "function" && focus()) ? str(focus().label) : ""; }catch(e){}

    lines.push("");
    lines.push("## Position dans le cycle");
    lines.push("Programme actif : " + (programLabel || programId || "inconnu") + (programId ? " (id " + programId + ")" : ""));
    // state.day est le jour AFFICHÉ dans l'app (curseur de navigation, posé au
    // démarrage du cycle ou par un geste), pas la date du jour : les deux sont
    // donnés séparément, sinon le modèle croit qu'on est ce jour-là.
    try{
      var today = todayInfo();
      lines.push("Aujourd'hui : " + today.day + " " + today.iso);
      lines.push("Semaine " + str(state.week) + " · jour affiché dans l'app : " + str(state.day));
    }catch(e){}
    // Le libellé et l'objectif de semaine sont là où un deload se déclare
    // (coachIsDeloadWeekOrContext). Sans eux, le coach lisait une semaine de
    // deload comme une semaine normale et poussait la charge ou le volume.
    try{
      var wi = (typeof buildWeekInfo === "function") ? (buildWeekInfo() || {})[Number(state.week)] : null;
      var weekText = wi ? [str(wi.label), str(wi.goal)].filter(Boolean).join(" — ") : "";
      if(weekText) lines.push("Semaine courante : " + weekText);
      if(typeof coachIsDeloadWeekOrContext === "function" && coachIsDeloadWeekOrContext({week: state.week})){
        lines.push("SEMAINE DE DELOAD : les charges sont volontairement réduites. Une baisse de charge cette semaine n'est pas une régression ; ne propose ni hausse de charge ni ajout de volume.");
      }
    }catch(e){}
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

  // ── Bloc 1b : ce qui est PRÉVU ─────────────────────────────────────────
  // Sans ce bloc, le coach ne voyait que le passé : « qu'est-ce que j'ai
  // aujourd'hui ? » restait sans réponse. La séance est lue par
  // buildWorkout(), l'entonnoir unique de toutes les vues — donc avec les
  // remplacements et les ajustements déjà appliqués, exactement comme
  // l'athlète la voit. La charge affichée est celle du moteur
  // (CoachCharge.suggestForExercise), jamais un chiffre du programme brut :
  // un chiffre de programme est un %1RM de l'athlète de référence (CLAUDE.md
  // §3.1), le montrer tel quel induirait le modèle en erreur.
  function dayList(){
    try{ return (typeof currentDayOrder === "function") ? (currentDayOrder() || []) : []; }
    catch(e){ return []; }
  }
  function weekCount(){
    try{ return (typeof totalWeeks === "function") ? (Number(totalWeeks()) || 0) : 0; }catch(e){ return 0; }
  }
  function clip(text, max){
    text = str(text);
    return text.length > max ? text.slice(0, max) + " […]" : text;
  }
  function exerciseLine(ex, block, day, week){
    ex = ex || {};
    var bits = [];
    if(str(ex.format)) bits.push(str(ex.format));
    if(str(ex.rest)) bits.push("repos " + str(ex.rest));
    var load = "";
    try{
      if(window.CoachCharge && typeof CoachCharge.suggestForExercise === "function"){
        load = str(CoachCharge.suggestForExercise(ex, block, {day: day, week: week}));
      }
    }catch(e){ load = ""; }
    if(load) bits.push("charge du moteur : " + load + (/[a-z]/i.test(load) ? "" : " lb"));
    return "      · " + str(ex.name) + (bits.length ? " — " + bits.join(" · ") : "")
      + (str(ex.note) ? "  [consigne : " + clip(ex.note, 200) + "]" : "");
  }
  function workoutLines(day, week){
    day = str(day).toLowerCase();
    week = Number(week);
    if(typeof buildWorkout !== "function") return ["  (séance illisible : programme non chargé)"];
    var w = null;
    try{ w = buildWorkout(day, week); }catch(e){ return ["  (séance illisible : " + (e && e.message ? e.message : String(e)) + ")"]; }
    var lines = [];
    var meta = (w && w.day) || {};
    var head = [str(meta.label), str(meta.focus)].filter(Boolean).join(" — ");
    if(head) lines.push("  Séance : " + head);
    ((w && w.blocks) || []).forEach(function(b){
      b = b || {};
      lines.push("    - " + [str(b.title), str(b.kind) ? "(" + str(b.kind) + ")" : "", str(b.time)].filter(Boolean).join(" "));
      if(Array.isArray(b.exercises) && b.exercises.length){
        b.exercises.forEach(function(ex){ lines.push(exerciseLine(ex, b, day, week)); });
      } else if(str(b.text)){
        clip(b.text, BLOCK_TEXT_LIMIT).split(/\n+/).forEach(function(t){ if(str(t)) lines.push("      " + str(t)); });
      }
    });
    if(!lines.length) lines.push("  (aucun bloc)");
    return lines;
  }
  function dayStatus(day, week){
    var bits = [];
    try{
      if(Number(week) === Number(state.week)){
        if((state.completedDays || []).indexOf(day) >= 0) bits.push("déjà faite cette semaine");
        if((state.missedDays || []).some(function(x){ return x && x.day === day && Number(x.week) === Number(week); })) bits.push("marquée manquée");
      }
    }catch(e){}
    return bits.length ? " (" + bits.join(", ") + ")" : "";
  }

  // Version courte d'une séance : un bloc par ligne, mouvements et formats,
  // sans charge ni consigne. Sert à la semaine SUIVANTE : le coach voit où va
  // le programme sans payer le détail (et sans faire tourner le moteur de
  // charges sur des séances lointaines). Le détail reste à `consulter_seance`.
  function compactWorkoutLines(day, week){
    if(typeof buildWorkout !== "function") return [];
    var w = null;
    try{ w = buildWorkout(day, week); }catch(e){ return ["    (séance illisible)"]; }
    return ((w && w.blocks) || []).filter(function(b){ return b && b.kind !== "warmup" && b.kind !== "mobility"; }).map(function(b){
      var body = (Array.isArray(b.exercises) && b.exercises.length)
        ? b.exercises.map(function(ex){ return str(ex.name) + (str(ex.format) ? " " + str(ex.format) : ""); }).join(", ")
        : clip(str(b.text).replace(/\s+/g, " "), 140);
      return "    - " + str(b.title) + (body ? " : " + body : "");
    });
  }

  // La semaine en cours EN DÉTAIL (tous les jours d'entraînement, charge du
  // moteur comprise), puis la semaine suivante en version courte. Demande de
  // l'athlète (2026-10-08) : « la semaine au complet, et plus si ce n'est pas
  // trop lourd ». Poids mesuré sur un vrai profil (4 jours) : ≈ 9 Ko pour la
  // semaine, ≈ 2 Ko pour la suivante — dans le bloc système mis en cache, donc relu
  // presque gratuitement d'un message à l'autre.
  function plannedLines(opts){
    opts = opts || {};
    var days = dayList();
    if(!days.length) return [];
    var week = 0;
    try{ week = Number(state.week) || 1; }catch(e){ week = 1; }
    var maxWeek = weekCount();
    var today = todayInfo().day;
    var ti = ALL_DAYS.indexOf(today);
    var tomorrow = ti >= 0 ? ALL_DAYS[(ti + 1) % 7] : "";
    var lines = ["", "## Semaine en cours : S" + week + " (en détail, telle que l'athlète la voit dans l'app)"];

    if(days.indexOf(today) < 0) lines.push("Aujourd'hui (" + today + ") : jour de repos dans ce programme.");
    days.forEach(function(d){
      var tags = [];
      if(d === today) tags.push("AUJOURD'HUI");
      // La semaine du cycle avance par un geste de l'athlète, pas par le
      // calendrier : demain dimanche → lundi appartient à la semaine suivante.
      if(d === tomorrow && tomorrow !== "lundi") tags.push("DEMAIN");
      lines.push("### " + d + (tags.length ? " — " + tags.join(", ") : "") + dayStatus(d, week));
      lines = lines.concat(workoutLines(d, week));
    });
    if(tomorrow && days.indexOf(tomorrow) < 0 && tomorrow !== "lundi") lines.push("Demain (" + tomorrow + ") : jour de repos dans ce programme.");

    var next = week + 1;
    if(!maxWeek || next <= maxWeek){
      var wi = null;
      try{ wi = (typeof buildWeekInfo === "function") ? (buildWeekInfo() || {})[next] : null; }catch(e){}
      lines.push("", "## Semaine suivante : S" + next + (wi ? " — " + [str(wi.label), str(wi.goal)].filter(Boolean).join(" — ") : "") + " (aperçu : mouvements et formats, sans charge)");
      if(tomorrow === "lundi") lines.push("Demain (lundi) ouvre normalement cette semaine, si l'athlète a passé à S" + next + ".");
      days.forEach(function(d){
        lines.push("### " + d);
        lines = lines.concat(compactWorkoutLines(d, next));
      });
    } else {
      lines.push("", "S" + week + " est la dernière semaine du programme.");
    }
    if(opts.planned !== "week") lines.push("Détail complet d'une autre journée ou d'une autre semaine (charges comprises) : outil `consulter_seance`.");
    return lines;
  }

  // Carte du programme actif : une ligne par semaine. Le libellé et
  // l'objectif sont là où un deload se déclare : le coach doit voir où il va.
  function programMapLines(){
    var lines = [];
    try{
      var info = (typeof buildWeekInfo === "function") ? (buildWeekInfo() || {}) : {};
      var nums = Object.keys(info).map(Number).filter(function(n){ return !isNaN(n); }).sort(function(a, b){ return a - b; });
      if(!nums.length) return lines;
      lines.push("", "## Carte du programme actif (" + nums.length + " semaines)");
      nums.slice(0, WEEKS_MAP_LIMIT).forEach(function(n){
        var wi = info[n] || {};
        var cur = (Number(state.week) === n) ? "  ← semaine courante" : "";
        lines.push("- S" + n + " : " + [str(wi.label), str(wi.goal)].filter(Boolean).join(" — ") + cur);
      });
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
    return lines.concat(renderSessions(rows));
  }

  function renderSessions(rows){
    var lines = [];
    rows.forEach(function(s){
      var head = "- " + str(s.date) + " · S" + str(s.week) + " · " + str(s.day);
      if(str(s.focus)) head += " · " + str(s.focus);
      var results = (s && s.results) || {};
      // Marqueur posé à la sauvegarde (coachMarkDeloadResultContext) : ces
      // charges basses sont voulues, pas une baisse de niveau.
      if(Object.keys(results).some(function(k){ var r = results[k] || {}; var c = (r.planned && r.planned.context) || r.context; return !!(c && typeof c === "object" && c.isRecovery); })) head += " · deload";
      lines.push(head);
      Object.keys(results).forEach(function(key){
        var r = results[key] || {};
        var wod = isWodKey(key);
        var parts = wod ? wodParts(r) : liftParts(r);
        var notes = splitNote(r);
        if(!parts.length && !notes.athlete && !notes.system){
          if(wod) lines.push("    · " + rowLabel(key, r) + " — metcon non enregistré");
          return;
        }
        var line = "    · " + rowLabel(key, r) + (parts.length ? " — " + parts.join(wod ? " · " : " × ") : "");
        if(notes.athlete) line += "  [note de l'athlète : " + notes.athlete + "]";
        if(notes.system) line += "  [note de l'app : " + notes.system + "]";
        lines.push(line);
      });
    });
    return lines;
  }

  // ── Bloc 2a : l'étendue de l'historique ────────────────────────────────
  // Le contexte ne montre que les dernières séances. Sans ce bloc, le coach
  // croyait l'historique limité à elles (« pas de données avant
  // septembre ») alors qu'il remontait à juin.
  function historyOverviewLines(bridge){
    var all = hist();
    if(!all.length) return [];
    var byMonth = {};
    all.forEach(function(s){ var m = str(s && s.date).slice(0, 7); if(m) byMonth[m] = (byMonth[m] || 0) + 1; });
    return ["", "## Étendue de l'historique",
      all.length + " séances enregistrées, du " + str(all[0].date) + " au " + str(all[all.length - 1].date) + ".",
      "Par mois : " + Object.keys(byMonth).sort().map(function(m){ return m + " (" + byMonth[m] + ")"; }).join(", ") + ".",
      bridge ? "Seules les plus récentes sont détaillées ci-dessous. Si l'athlète a besoin d'une période plus ancienne, dis-lui laquelle : il pourra te la recoller."
             : "Seules les plus récentes sont détaillées ci-dessous ; les autres se lisent avec `consulter_historique`."];
  }

  // ── Bloc 2c : ce que le coach peut lire à la demande ───────────────────
  // Rappel explicite : un petit modèle n'infère pas toujours la portée de
  // ses outils depuis leur seule définition, et répondait « je n'ai pas
  // S2 à S7 » alors qu'il pouvait les lire.
  function accessLines(){
    return ["", "## Ce que tu peux lire à la demande (outils, sans demander la permission)",
      "- `consulter_seance` : N'IMPORTE QUELLE séance du programme, toutes semaines confondues (ex. semaine 5, mardi), en détail complet — y compris la semaine suivante, dont tu n'as ci-dessus qu'un aperçu.",
      "- `consulter_programme` : objectif, règles du cycle, intention de chaque journée, carte des semaines, programmes disponibles.",
      "- `consulter_historique` : les séances réellement faites sur une période (TOUT l'historique, pas seulement les récentes ci-dessous).",
      "- `consulter_mouvement` : l'historique complet d'un mouvement, la charge suggérée par le moteur et son explication.",
      "Ne dis jamais qu'une donnée te manque avant d'avoir appelé l'outil qui la lit."];
  }

  // ── Bloc 2b : les jours manqués, semaines passées comprises ────────────
  // Un trou dans les séances ne dit pas pourquoi. Même source que l'onglet
  // Historique (missedDayEntriesForHistory, app.js) : lecture seule.
  function missedLines(limit){
    var rows = [];
    try{ rows = (typeof missedDayEntriesForHistory === "function") ? missedDayEntriesForHistory() : []; }catch(e){ rows = []; }
    if(!rows.length) return [];
    var lines = ["", "## Jours manqués (le plus récent en premier)"];
    rows.slice(0, limit || NOTES_LIMIT).forEach(function(m){
      lines.push("- " + str(m.date) + " · S" + str(m.week) + " · " + str(m.day) + (str(m.cycle) ? " · " + str(m.cycle) : "") + (str(m.reason) ? " : " + str(m.reason) : ""));
    });
    return lines;
  }

  // ── Bloc 3 : les notes, séparées et datées ─────────────────────────────
  // Elles sont déjà dans les séances ci-dessus, mais les regrouper aide le
  // modèle à voir un motif qui traverse plusieurs semaines (« épaule gauche »
  // trois fois en un mois) au lieu d'une remarque isolée.
  function noteLines(limit){
    var athlete = [], system = [];
    hist().slice().reverse().forEach(function(s){
      var results = (s && s.results) || {};
      Object.keys(results).forEach(function(key){
        var n = splitNote(results[key]);
        var head = "- " + str(s.date) + " · " + rowLabel(key, results[key]) + " : ";
        if(n.athlete) athlete.push(head + n.athlete);
        if(n.system) system.push(head + n.system);
      });
    });
    var lines = [];
    if(athlete.length) lines = lines.concat(["", "## Notes écrites par l'athlète pendant ses séances"], athlete.slice(0, limit || NOTES_LIMIT));
    if(system.length) lines = lines.concat(["", "## Événements notés par l'app (pas par l'athlète)"], system.slice(0, limit || NOTES_LIMIT));
    return lines;
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
        // precisionTrend() rend déjà un pourcentage 0–100 (brain_memory.js) :
        // ne pas re-multiplier. n = prédictions testées du mois — un mois à
        // n=1 donne 0 % ou 100 %, le modèle doit voir l'échantillon.
        var month = todayInfo().iso.slice(0, 7);
        lines.push("Courbe de précision (un point par mois, du plus ancien au plus récent ; n = prédictions testées) :");
        lines.push("  " + trend.map(function(p){
          var pct = (p && p.precision != null) ? Math.round(num(p.precision)) + " %" : "n/d";
          var m = str(p && (p.month || p.key));
          return m + " " + pct + " (n=" + (num(p && p.tested) || 0) + (m === month ? ", mois en cours" : "") + ")";
        }).join(" · "));
      }
    }catch(e){}

    // La mémoire est déjà propre au profil actif (clé de stockage namespacée,
    // brain_memory.js) : `profiles` est indexé « mouvement::intention ».
    // Champs réels : testedPredictions, successfulPredictions,
    // underPredictions (reps manquées = trop ambitieuse), overPredictions
    // (≥ 2 reps de marge = trop prudente). Mêmes profils que la courbe.
    var profiles = mem.profiles || {};
    var rows = Object.keys(profiles).map(function(k){ return profiles[k]; }).filter(function(p){
      return p && typeof p === "object" && (num(p.testedPredictions) || 0) > 0;
    });
    rows.sort(function(a, b){ return num(b.testedPredictions) - num(a.testedPredictions); });
    if(rows.length){
      lines.push("Par mouvement et intention — prédictions testées / réussies / trop ambitieuses / trop prudentes :");
      rows.slice(0, 30).forEach(function(p){
        var recent = null;
        try{ recent = CoachBrainMemory.recentPrecision ? CoachBrainMemory.recentPrecision(p) : null; }catch(e){}
        lines.push("  - " + str(p.label) + " · " + str(p.intent || "general") + " : " + (num(p.testedPredictions) || 0) + " / " + (num(p.successfulPredictions) || 0)
          + " / " + (num(p.underPredictions) || 0) + " / " + (num(p.overPredictions) || 0)
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
    var lines = [];
    try{
      if(!window.CoachAIPlan) return lines;
      var s = (typeof CoachAIPlan.summary === "function") ? CoachAIPlan.summary() : "";
      if(s) lines = lines.concat(["", "## Semaines déjà générées par Coach IA", s]);
      var adj = (typeof CoachAIPlan.listAdjustments === "function") ? CoachAIPlan.listAdjustments() : [];
      if(adj && adj.length){
        lines.push("", "## Ajustements Coach IA actifs (acceptés par l'athlète)");
        adj.slice(-20).forEach(function(a){
          var bits = [];
          if(str(a.format)) bits.push("format " + str(a.format));
          if(str(a.rest)) bits.push("repos " + str(a.rest));
          if(str(a.note)) bits.push("note « " + clip(a.note, 120) + " »");
          lines.push("- S" + str(a.week) + " · " + str(a.day) + " · " + str(a.movement) + " : " + bits.join(" · "));
        });
      }
    }catch(e){}
    return lines;
  }

  // ── Bloc 0 : le carnet du coach ────────────────────────────────────────
  // La mémoire longue de la conversation (scripts/coach_ai/chat.js), lue ici
  // en lecture seule. Placée en tête : ce sont les faits que le coach doit
  // avoir en tête avant de lire les chiffres.
  function memoryLines(){
    try{
      var text = (window.CoachAIChat && typeof CoachAIChat.memoryText === "function") ? CoachAIChat.memoryText() : "";
      return text ? ["## Carnet du coach (faits durables retenus des conversations précédentes)", text, ""] : [];
    }catch(e){ return []; }
  }

  // ── Assemblage ─────────────────────────────────────────────────────────
  api.build = function(opts){
    opts = opts || {};
    var lines = []
      .concat(memoryLines())
      .concat(profileLines())
      .concat(plannedLines(opts))
      .concat(programMapLines())
      .concat(opts.planned === "week" ? [] : accessLines())
      .concat(historyOverviewLines(opts.planned === "week"))
      .concat(sessionLines(opts.sessions))
      .concat(missedLines(opts.notes))
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
        var parts = liftParts(r);
        var notes = splitNote(r);
        lines.push("- " + str(s.date) + " · S" + str(s.week) + " · " + (parts.join(" × ") || "aucun chiffre")
          + (notes.athlete ? "  [note de l'athlète : " + notes.athlete + "]" : "")
          + (notes.system ? "  [note de l'app : " + notes.system + "]" : ""));
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

  // ── Outil `consulter_seance` : n'importe quelle journée du programme ────
  api.sessionDetail = function(input){
    input = input || {};
    var days = dayList();
    var day = norm(input.jour);
    var week = Number(input.semaine);
    try{ if(!week || isNaN(week)) week = Number(state.week) || 1; }catch(e){ week = 1; }
    if(!day) day = todayInfo().day;
    if(ALL_DAYS.indexOf(day) < 0) return "Jour inconnu : « " + str(input.jour) + " ». Jours valides : " + ALL_DAYS.join(", ") + ".";
    var maxWeek = weekCount();
    if(week < 1 || (maxWeek && week > maxWeek)) return "Semaine hors programme : le programme actif a " + (maxWeek || "?") + " semaines.";
    if(days.indexOf(day) < 0) return day + " n'est pas un jour d'entraînement dans ce programme. Jours d'entraînement : " + days.join(", ") + ".";
    var lines = [day + " · S" + week + dayStatus(day, week)];
    try{
      var wi = (typeof buildWeekInfo === "function") ? (buildWeekInfo() || {})[week] : null;
      if(wi) lines.push("Semaine : " + [str(wi.label), str(wi.goal)].filter(Boolean).join(" — "));
    }catch(e){}
    return lines.concat(workoutLines(day, week)).join("\n");
  };

  // ── Outil `consulter_programme` : la carte et les options ──────────────
  api.programDetail = function(){
    var lines = [];
    var programId = "";
    try{ programId = (typeof activeProgramId === "function") ? activeProgramId() : ""; }catch(e){}
    try{
      var cfg = (typeof focus === "function") ? (focus() || {}) : {};
      lines.push("Programme actif : " + (str(cfg.label) || programId) + (programId ? " (id " + programId + ")" : ""));
      if(str(cfg.objective)) lines.push("Objectif : " + str(cfg.objective));
      if(Array.isArray(cfg.cycleRules) && cfg.cycleRules.length) lines.push("Règles du cycle : " + cfg.cycleRules.map(str).join(" · "));
      var days = dayList();
      if(days.length) lines.push("Jours d'entraînement : " + days.join(", "));
      if(cfg.dayIntentions && typeof cfg.dayIntentions === "object"){
        lines.push("Intention de chaque journée :");
        days.forEach(function(d){
          var it = cfg.dayIntentions[d];
          var txt = (it && typeof it === "object") ? [str(it.title || it.label), str(it.intent || it.text || it.goal)].filter(Boolean).join(" — ") : str(it);
          if(txt) lines.push("  - " + d + " : " + clip(txt, 200));
        });
      }
    }catch(e){}
    lines = lines.concat(programMapLines());
    try{
      var all = (typeof focusConfigs === "object" && focusConfigs) ? focusConfigs : {};
      var ids = Object.keys(all);
      if(ids.length){
        lines.push("", "Programmes disponibles sur ce profil (changer de programme se fait par l'athlète, dans l'onglet Cycle) :");
        ids.forEach(function(id){ lines.push("  - " + str((all[id] || {}).label || id) + " (id " + id + ")" + (id === programId ? " ← actif" : "")); });
      }
    }catch(e){}
    try{
      var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
      var swaps = window.RacineMovementSwaps ? RacineMovementSwaps.listFor(activeId) : [];
      if(swaps && swaps.length){
        lines.push("", "Remplacements actifs :");
        swaps.forEach(function(s){ lines.push("  - " + s.from + " → " + s.to); });
      }
    }catch(e){}
    return lines.join("\n") || "Programme illisible.";
  };

  // ── Outil `consulter_historique` : n'importe quelle période ────────────
  var HISTORY_ROWS_LIMIT = 20;
  api.historyDetail = function(input){
    input = input || {};
    var from = str(input.depuis), to = str(input.jusqua);
    var week = Number(input.semaine);
    var rows = hist().filter(function(s){
      var d = str(s && s.date);
      if(from && d < from) return false;
      if(to && d > to) return false;
      if(week && Number(s && s.week) !== week) return false;
      return true;
    });
    if(!rows.length) return "Aucune séance sur cette période." + (hist().length ? " L'historique va du " + str(hist()[0].date) + " au " + str(hist()[hist().length - 1].date) + "." : "");
    var shown = rows.slice(-HISTORY_ROWS_LIMIT).reverse();
    return [rows.length + " séance(s) trouvée(s)" + (rows.length > shown.length ? ", les " + shown.length + " plus récentes affichées — resserre la période pour voir les autres" : "") + " (la plus récente en premier) :"]
      .concat(renderSessions(shown)).join("\n");
  };

  // Aiguillage unique des outils de lecture : chat.js n'a pas à connaître
  // chaque outil, et aucun d'eux n'écrit quoi que ce soit.
  api.read = function(name, input){
    input = input || {};
    if(name === "consulter_mouvement") return api.movementDetail(input.mouvement);
    if(name === "consulter_seance") return api.sessionDetail(input);
    if(name === "consulter_programme") return api.programDetail();
    if(name === "consulter_historique") return api.historyDetail(input);
    return "Outil de lecture inconnu : " + str(name);
  };

  api.SESSIONS_LIMIT = SESSIONS_LIMIT;
  api.NOTES_LIMIT = NOTES_LIMIT;
})();

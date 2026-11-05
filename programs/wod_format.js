/*
  Racine — metcons structurés (window.RacineWod).

  Un metcon (`kind:"wod"`) peut s'écrire comme une STRUCTURE au lieu d'un
  texte : format, durée, mouvements chiffrés. Le texte affiché est fabriqué à
  partir de la structure (`render`), et tout le reste de l'app — pastilles,
  chrono, saisie de résultat, historique — continue de lire ce texte. C'est ce
  qui permet à Coach IA de modifier un metcon : il change la structure, le
  texte suit, et rien en aval ne change de contrat.

  Forme d'un bloc structuré (le programme écrit `wod`, jamais `text`) :

    {time, title, tag, kind:"wod", wod:{
      format : "amrap" | "emom" | "fortime" | "intervals" | "steady" | "free",
      style  : (emom) "each" | "alternate" | "sequence" | "stations",
      minutes, cap, rounds, ladder ("21-15-9"), sets, work, rest,
      moves  : [{reps, unit, name, load, detail, minute}],
      sep    : séparateur des mouvements (" + " par défaut) ; slotSep : après
               « minutes impaires » en alternance (" " par défaut),
      template : phrase du format, avec {minutes} {cap} {rounds} {ladder}
                 {sets} {work} {rest} {stations} {tours} {moves} ; absente,
                 le format a sa phrase par défaut,
      note   : consignes ajoutées après le format (stratégie, sécurité).
    }}

  `fill(blocks)` est appelé par le programme sur ce que renvoie getBlocks :
  il pose `text` sur chaque bloc structuré. Les charges d'un metcon sont des
  STANDARDS FIXES écrits (« 20 lb », « 24 po »), pas des %1RM : le moteur de
  charges ne les lit pas, et Coach IA ne peut pas en écrire (CLAUDE.md § 3.5).
  Un mouvement chargé qu'il ajoute reçoit sa charge de STANDARD_LOADS.
*/
(function(){
  "use strict";
  var root = (typeof window !== "undefined") ? window : this;

  var FORMATS = ["amrap", "emom", "fortime", "intervals", "steady", "free"];
  var EMOM_STYLES = ["each", "alternate", "sequence", "stations"];
  var NUMBER_FIELDS = ["minutes", "cap", "rounds", "sets"];
  var TEXT_FIELDS = ["ladder", "work", "rest"];

  function str(v){ return String(v == null ? "" : v).trim(); }
  function clone(o){ return JSON.parse(JSON.stringify(o || {})); }
  function norm(v){
    var s = str(v).toLowerCase();
    try{ s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }catch(e){}
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  function renderMove(m){
    m = m || {};
    var out = "";
    [m.reps, m.unit, m.name, m.load].forEach(function(p){
      p = str(p);
      if(p) out += (out ? " " : "") + p;
    });
    var d = str(m.detail);
    if(d) out += (/^[\/,]/.test(d) || !out ? "" : " ") + d;
    return out;
  }

  // Les mouvements d'un EMOM se regroupent par minute (minute 1 = minutes
  // impaires en alternance, station 1 en stations).
  function groups(spec){
    var byMin = {}, order = [];
    (spec.moves || []).forEach(function(m){
      var k = Number(m.minute) || 1;
      if(!byMin[k]){ byMin[k] = []; order.push(k); }
      byMin[k].push(m);
    });
    order.sort(function(a, b){ return a - b; });
    return order.map(function(k){ return {minute:k, moves:byMin[k]}; });
  }
  // `join` sur un mouvement remplace le séparateur qui le précède
  // (« wall balls + cal row, puis 15 power cleans »).
  function joinMoves(list, sep){
    return list.map(function(m, i){ return (i ? (m.join != null ? m.join : sep) : "") + renderMove(m); }).join("");
  }

  function movesText(spec){
    var sep = spec.sep != null ? spec.sep : " + ";
    if(spec.format !== "emom") return joinMoves(spec.moves || [], sep);
    var style = spec.style || "each";
    var g = groups(spec);
    if(style === "each") return joinMoves(spec.moves || [], sep) + " chaque minute";
    if(style === "alternate") return g.map(function(x, i){
      var slot = spec.slotSep != null ? spec.slotSep : " ";
      return (i % 2 === 0 ? "minutes impaires" : "minutes paires") + slot + joinMoves(x.moves, sep);
    }).join(" ; ");
    if(style === "sequence") return g.map(function(x){ return "min " + x.minute + " = " + joinMoves(x.moves, sep); }).join(" ; ");
    return g.map(function(x){ return x.minute + ") " + joinMoves(x.moves, sep); }).join(", ");
  }

  function defaultTemplate(spec){
    var f = spec.format;
    if(f === "amrap") return "AMRAP {minutes} : {moves}.";
    if(f === "emom"){
      var s = spec.style || "each";
      if(s === "alternate") return "EMOM {minutes} en alternance, un seul mouvement par minute : {moves}.";
      if(s === "stations") return "EMOM {minutes} en {stations} stations, une station par minute, {tours} tours : {moves}.";
      return "EMOM {minutes} : {moves}.";
    }
    if(f === "fortime"){
      return (spec.ladder ? "{ladder} pour le temps" : "Pour le temps")
        + (spec.rounds ? ", {rounds} tours" : "")
        + (spec.cap ? " (cap {cap})" : "") + " : {moves}.";
    }
    if(f === "intervals") return "{sets} × ({work} {moves} / {rest} repos).";
    if(f === "steady") return "{minutes} min : {moves}.";
    return "{moves}.";
  }

  function vars(spec){
    var g = spec.format === "emom" ? groups(spec) : [];
    var stations = g.length || 0;
    return {
      minutes: spec.minutes, cap: spec.cap, rounds: spec.rounds, ladder: spec.ladder,
      sets: spec.sets, work: spec.work, rest: spec.rest,
      stations: stations, tours: stations ? Math.round((Number(spec.minutes) || 0) / stations) : "",
      moves: movesText(spec)
    };
  }

  function render(spec){
    spec = spec || {};
    var v = vars(spec);
    var tpl = str(spec.template) ? String(spec.template) : defaultTemplate(spec);
    var text = tpl.replace(/\{(\w+)\}/g, function(all, k){ return v[k] == null ? "" : String(v[k]); });
    var note = str(spec.note);
    return note ? (text ? text + " " + note : note) : text;
  }

  // ── Validation ───────────────────────────────────────────────────────────
  function validate(spec){
    var errors = [];
    if(!spec || typeof spec !== "object") return ["Structure de metcon absente."];
    if(FORMATS.indexOf(spec.format) < 0) errors.push("Format inconnu : " + str(spec.format));
    if(spec.format === "emom" && spec.style && EMOM_STYLES.indexOf(spec.style) < 0) errors.push("Style d'EMOM inconnu : " + spec.style);
    NUMBER_FIELDS.forEach(function(k){
      if(spec[k] == null || spec[k] === "") return;
      var n = Number(spec[k]);
      if(!isFinite(n) || n < 1 || n > 90 || Math.round(n) !== n) errors.push("Valeur invalide pour " + k + " : " + spec[k]);
    });
    if(!Array.isArray(spec.moves)) errors.push("Liste de mouvements absente.");
    (spec.moves || []).forEach(function(m, i){
      if(!str(m && m.name)) errors.push("Mouvement " + (i + 1) + " sans nom.");
    });
    var tpl = str(spec.template) || defaultTemplate(spec);
    if(/\{moves\}/.test(tpl) === false && (spec.moves || []).length) errors.push("La phrase du format n'affiche pas les mouvements.");
    (tpl.match(/\{(\w+)\}/g) || []).forEach(function(t){
      var k = t.slice(1, -1);
      if(!(k in vars({format:spec.format}))) errors.push("Champ inconnu dans la phrase : " + t);
      else if(k !== "moves" && k !== "stations" && k !== "tours" && (spec[k] == null || spec[k] === "")) errors.push("La phrase utilise {" + k + "} sans valeur.");
    });
    if((spec.format === "amrap" || spec.format === "emom") && !spec.minutes) errors.push("Un " + spec.format.toUpperCase() + " a besoin d'une durée.");
    // Un EMOM à plusieurs minutes tombe juste sur son cycle (CLAUDE.md § 3.1).
    if(spec.format === "emom" && spec.style && spec.style !== "each" && spec.minutes){
      var cycle = groups(spec).length;
      if(cycle > 1 && Number(spec.minutes) % cycle !== 0) errors.push("EMOM " + spec.minutes + " : la durée ne tombe pas juste sur " + cycle + " minutes.");
      if(spec.style === "alternate" && cycle !== 2) errors.push("Un EMOM en alternance a exactement 2 minutes (impaires, paires).");
    }
    return errors;
  }

  // ── Charges standards des metcons ────────────────────────────────────────
  // Charges fixes homme/femme, pas des %1RM. Seules sources possibles d'une
  // charge pour un mouvement que Coach IA ajoute ou met à la place d'un autre :
  // le metcon lui-même (même mouvement déjà présent) ou cette table.
  var STANDARD_LOADS = [
    [/\bwall ?balls?\b/i, "20/14 lb"],
    [/\b(?:kb|kettlebell) swings?\b/i, "24/16 kg"],
    [/\bgoblet squats?\b/i, "24/16 kg"],
    [/\bthrusters?\b/i, "95/65 lb"],
    [/\bpower cleans?\b|\bhang (?:power )?cleans?\b|\bclean (?:and|&) jerks?\b/i, "135/95 lb"],
    [/\bfront squats?\b|\bfront rack lunges?\b/i, "135/95 lb"],
    [/\boverhead squats?\b|\bpush press\b/i, "95/65 lb"],
    [/\bdeadlifts?\b/i, "155/105 lb"],
    [/\bdevil press\b|\bman ?makers?\b|\bdb snatch(?:es)?\b|\bdumbbell snatch(?:es)?\b/i, "50/35 lb"],
    [/\bsnatch(?:es)?\b/i, "95/65 lb"],
    [/\bbox jumps?\b|\bbox step-?ups?\b|\bstep-?ups? sur bo[iî]te\b/i, "24/20 po"],
    [/\bsandbag\b/i, "100/70 lb"],
    [/\bfarmer carry\b/i, "2 × 53/35 lb"],
    [/\bdb [a-z]|\bdumbbell\b|\bhalt[eè]res?\b/i, "50/35 lb"]
  ];
  // Mouvement chargé par nature : même liste que dev/wod_loads_checks.js.
  var LOADED = /\b(?:wall ?balls?|kb swings?|kettlebell|goblet squats?|thrusters?|db [a-z]|dumbbell|haltères?|snatch(?:es)?|power cleans?|hang cleans?|clean and jerk|deadlifts?|sandbag|farmer carry|devil press|man ?makers?|box step-ups?|box jumps?|front squats?|overhead squats?|push press|front rack lunges?)\b/i;

  function isLoaded(name){ return LOADED.test(str(name)); }
  function standardLoad(name){
    var n = str(name);
    for(var i = 0; i < STANDARD_LOADS.length; i++) if(STANDARD_LOADS[i][0].test(n)) return STANDARD_LOADS[i][1];
    return "";
  }

  // ── Opérations (Coach IA) ────────────────────────────────────────────────
  // Une proposition de Coach IA est une liste d'opérations, jamais un texte :
  //   {op:"regler", format?, style?, minutes?, cap?, rounds?, ladder?, sets?, work?, rest?, note?}
  //   {op:"modifier", mouvement, reps?, unit?, detail?, minute?}
  //   {op:"remplacer", mouvement, vers, reps?, unit?, detail?}
  //   {op:"ajouter", nom, reps?, unit?, detail?, minute?, position?}
  //   {op:"retirer", mouvement}
  // Aucune n'a de champ de charge.
  function findMove(spec, name){
    var key = norm(name), list = spec.moves || [];
    if(!key) return -1;
    for(var i = 0; i < list.length; i++) if(norm(list[i].name) === key) return i;
    var hits = [];
    list.forEach(function(m, i){
      var n = norm(m.name);
      if(n && (n.indexOf(key) >= 0 || key.indexOf(n) >= 0)) hits.push(i);
    });
    return hits.length === 1 ? hits[0] : -1;
  }
  // Charge d'un mouvement nouveau : celle du même mouvement s'il est déjà dans
  // le metcon, sinon le standard ; un mouvement chargé sans standard est refusé.
  function loadFor(spec, name){
    var i = findMove(spec, name);
    if(i >= 0 && norm(spec.moves[i].name) === norm(name)) return {ok:true, load:str(spec.moves[i].load)};
    var std = standardLoad(name);
    if(std) return {ok:true, load:std};
    if(isLoaded(name)) return {ok:false, error:"Aucune charge standard connue pour « " + str(name) + " » : Racine ne laisse pas une charge de metcon à deviner."};
    return {ok:true, load:""};
  }
  function setMoveFields(m, op){
    if(op.reps != null && str(op.reps) !== "") m.reps = str(op.reps);
    if(op.unit != null) m.unit = str(op.unit);
    if(op.detail != null) m.detail = str(op.detail);
    if(op.minute != null && str(op.minute) !== "") m.minute = Number(op.minute);
  }

  function applyOp(spec, op){
    op = op || {};
    var kind = str(op.op);
    if(kind === "regler"){
      var changed = false;
      if(op.format != null && str(op.format) !== "" && str(op.format) !== spec.format){
        if(FORMATS.indexOf(str(op.format)) < 0) return {ok:false, error:"Format inconnu : " + str(op.format)};
        spec.format = str(op.format); delete spec.template; changed = true;
        if(spec.format !== "emom") delete spec.style;
      }
      if(op.style != null && str(op.style) !== "" && str(op.style) !== spec.style){
        spec.style = str(op.style); delete spec.template; changed = true;
      }
      NUMBER_FIELDS.forEach(function(k){
        if(op[k] == null || str(op[k]) === "") return;
        spec[k] = Number(op[k]); changed = true;
      });
      TEXT_FIELDS.forEach(function(k){
        if(op[k] == null || str(op[k]) === "") return;
        spec[k] = str(op[k]); changed = true;
      });
      if(op.note != null){ spec.note = str(op.note); changed = true; }
      return changed ? {ok:true} : {ok:false, error:"Rien à régler."};
    }
    if(kind === "modifier"){
      var i = findMove(spec, op.mouvement);
      if(i < 0) return {ok:false, skip:true, error:"Mouvement introuvable : " + str(op.mouvement)};
      setMoveFields(spec.moves[i], op);
      return {ok:true};
    }
    if(kind === "remplacer"){
      var j = findMove(spec, op.mouvement);
      if(j < 0) return {ok:false, skip:true, error:"Mouvement introuvable : " + str(op.mouvement)};
      if(!str(op.vers)) return {ok:false, error:"Mouvement de remplacement manquant."};
      var ld = loadFor(spec, op.vers);
      if(!ld.ok) return ld;
      var m = spec.moves[j];
      m.name = str(op.vers); m.load = ld.load;
      // Le détail décrivait l'ancien mouvement (« (cible 10 pi) ») : il part.
      m.detail = "";
      setMoveFields(m, op);
      return {ok:true};
    }
    if(kind === "ajouter"){
      if(!str(op.nom)) return {ok:false, error:"Mouvement à ajouter sans nom."};
      var la = loadFor(spec, op.nom);
      if(!la.ok) return la;
      var nm = {reps:"", unit:"", name:str(op.nom), load:la.load, detail:""};
      setMoveFields(nm, op);
      spec.moves = spec.moves || [];
      var pos = Number(op.position);
      if(isFinite(pos) && pos >= 1 && pos <= spec.moves.length) spec.moves.splice(pos - 1, 0, nm);
      else spec.moves.push(nm);
      return {ok:true};
    }
    if(kind === "retirer"){
      var k = findMove(spec, op.mouvement);
      if(k < 0) return {ok:false, skip:true, error:"Mouvement introuvable : " + str(op.mouvement)};
      spec.moves.splice(k, 1);
      if(!spec.moves.length) return {ok:false, error:"Un metcon garde au moins un mouvement."};
      return {ok:true};
    }
    return {ok:false, error:"Opération inconnue : " + kind};
  }

  // Applique toutes les opérations sur une COPIE. Une opération qui vise un
  // mouvement absent de ce metcon est sautée (portée « cycle » : la semaine
  // suivante n'a pas forcément le même mouvement) ; toute autre erreur annule.
  function applyOps(spec, ops){
    var next = clone(spec), applied = 0, skipped = [];
    for(var i = 0; i < (ops || []).length; i++){
      var r = applyOp(next, ops[i]);
      if(r.ok){ applied++; continue; }
      if(r.skip){ skipped.push(r.error); continue; }
      return {ok:false, error:r.error};
    }
    if(!applied) return {ok:false, error:skipped[0] || "Aucune opération applicable.", skipped:skipped};
    var errors = validate(next);
    if(errors.length) return {ok:false, error:errors[0]};
    return {ok:true, spec:next, applied:applied, skipped:skipped};
  }

  // ── Lecture pour Coach IA ────────────────────────────────────────────────
  function summary(spec){
    spec = spec || {};
    var head = [spec.format];
    if(spec.style) head.push(spec.style);
    NUMBER_FIELDS.concat(TEXT_FIELDS).forEach(function(k){ if(spec[k] != null && spec[k] !== "") head.push(k + "=" + spec[k]); });
    return {
      format: head.join(" · "),
      mouvements: (spec.moves || []).map(function(m){
        return {
          nom: str(m.name), reps: str(m.reps), unite: str(m.unit),
          charge_fixe: str(m.load), detail: str(m.detail),
          minute: spec.format === "emom" ? (Number(m.minute) || 1) : undefined
        };
      }),
      note: str(spec.note)
    };
  }

  // ── Programmes ───────────────────────────────────────────────────────────
  // Ajoute une consigne à une structure (copie) : le programme garde ses
  // phrases communes (« Aucune poussée au-dessus de la tête. ») hors des tables.
  function withNote(spec, extra){
    var s = clone(spec);
    s.note = [str(s.note), str(extra)].filter(Boolean).join(" ");
    return s;
  }

  function block(b){
    if(b && b.wod){ b.text = render(b.wod); }
    return b;
  }
  function fill(blocks){
    (blocks || []).forEach(block);
    return blocks;
  }

  root.RacineWod = {
    FORMATS: FORMATS.slice(), EMOM_STYLES: EMOM_STYLES.slice(),
    render: render, validate: validate, fill: fill, block: block, withNote: withNote,
    applyOps: applyOps, summary: summary, clone: clone,
    isLoaded: isLoaded, standardLoad: standardLoad, findMove: findMove, norm: norm
  };
})();

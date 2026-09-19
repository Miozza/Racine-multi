// Racine — Ce que tes données disent : analyse locale, déterministe, hors-ligne.
//
// POURQUOI CE DOMAINE EXISTE. « Lire mon historique, ma progression, mes
// faiblesses » n'est pas une tâche de langage : c'est de l'arithmétique sur des
// données déjà présentes. Un modèle n'y ajoute rien, coûte de l'argent et ne se
// teste pas. Ce module fait donc le travail mesurable, gratuitement et sans
// réseau ; le LLM (pont copier-coller) garde ce qu'il est seul à savoir faire —
// juger une situation nouvelle et comprendre une phrase.
//
// C'est la même doctrine que scripts/season/suggest.js, qui porte en en-tête
// « Règles explicables, jamais de ML » et choisit le prochain CYCLE. Ce module
// travaille un cran plus fin : le mouvement et la semaine.
//
// CONTRAT :
//  - LECTURE SEULE. Aucune écriture, nulle part. Ni state, ni localStorage.
//  - Le journal brut (state.history) fait foi, pas l'état dérivé
//    (docs/DATA_FLOW_CONTRACT.md).
//  - Ne touche pas au domaine charge. Il lit epley1RM — une identité
//    mathématique, pas un réglage — et rien d'autre.
//  - Tout constat porte ses chiffres. Un diagnostic sans le compte qui le
//    soutient n'est pas vérifiable, donc pas affichable.
(function(){
  "use strict";

  var api = window.CoachInsights = window.CoachInsights || {};

  var WINDOW_DAYS = 90;          // fenêtre d'analyse
  var PLATEAU_MIN_SESSIONS = 6;  // 3 séances récentes comparées aux 3 d'avant
  var GAP_DAYS = 21;             // un mouvement du programme non fait depuis…
  var NOTE_MIN_HITS = 3;         // un motif de note se dit à partir de 3
  var BALANCE_MIN_PAIR = 8;      // en dessous, un ratio ne veut rien dire
  var BALANCE_RATIO = 1.6;       // déséquilibre déclaré au-delà

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

  // e1RM : rend comparables 5×3 à 225 et 3×8 à 185. Sans ça, « la charge
  // stagne » se déclencherait à chaque changement de format de séries.
  function e1rm(load, reps){
    if(typeof window.epley1RM === "function") return window.epley1RM(load, reps);
    load = Number(load) || 0; reps = Number(reps) || 0;
    return (!load || !reps) ? 0 : load * (1 + reps / 30);
  }

  function dateOf(v){
    var s = str(v).slice(0, 10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return new Date(Number(s.slice(0,4)), Number(s.slice(5,7)) - 1, Number(s.slice(8,10)));
  }
  function daysAgo(d, ref){
    if(!d) return 9999;
    return Math.round((ref - d) / 864e5);
  }

  // Même chaîne de résolution que le reste de l'app : le libellé canonique du
  // moteur fait foi, sinon une clé brute créerait un mouvement fantôme.
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
      if(typeof window.movementLabelFromKeyOrName === "function") return str(window.movementLabelFromKeyOrName(key));
    }catch(e){}
    return str(key);
  }

  // ── Patrons de mouvement ───────────────────────────────────────────────
  //
  // Axe DIFFÉRENT des familles de scripts/charge/movement_profiles.js, qui
  // décrivent un comportement de CHARGE (vertical_press, bodyweight_heavy…).
  // Ici on classe par patron moteur, pour compter l'équilibre du volume. Ne
  // pas fusionner les deux : élargir les familles de charge pour servir une
  // analyse de volume ferait bouger le domaine prioritaire pour une raison qui
  // ne le concerne pas.
  //
  // Table approximative et assumée comme telle : elle sert à repérer un
  // déséquilibre grossier, pas à classer finement. Ordre significatif — le
  // plus spécifique d'abord.
  var PATTERNS = [
    [/muscle\s*up/i,                                                        "tirage_vertical"],
    [/pull\s*up|chin\s*up|lat\s*pulldown|pulldown|pullover/i,               "tirage_vertical"],
    [/row|face\s*pull/i,                                                    "tirage_horizontal"],
    [/handstand|strict\s*press|push\s*press|shoulder\s*press|overhead\s*press|jerk/i, "poussee_verticale"],
    [/bench|floor\s*press|chest\s*press|push\s*up|dip/i,                    "poussee_horizontale"],
    [/deadlift|rdl|romanian|good\s*morning|hip\s*thrust|swing|clean|snatch|back\s*extension|glute\s*ham/i, "charniere"],
    [/squat|lunge|leg\s*press|step\s*up|thruster|wall\s*ball/i,             "squat"],
    [/plank|hollow|sit\s*up|toes\s*to\s*bar|ab\s*wheel|russian|l\s*sit|core/i, "gainage"]
  ];

  var PATTERN_LABELS = {
    poussee_horizontale: "poussée horizontale",
    poussee_verticale:   "poussée verticale",
    tirage_horizontal:   "tirage horizontal",
    tirage_vertical:     "tirage vertical",
    squat:               "squat",
    charniere:           "charnière",
    gainage:             "gainage",
    autre:               "autre"
  };

  api.patternOf = function(name){
    // Normaliser AVANT de classer : « Push-Up », « Push Up » et « push-up »
    // doivent tomber sur la même règle. Sans ça, un trait d'union suffit à
    // faire sortir un mouvement du comptage — et le déséquilibre calculé est
    // alors faux sans que rien ne le signale.
    var n = norm(name);
    if(!n) return "autre";
    for(var i = 0; i < PATTERNS.length; i++){
      if(PATTERNS[i][0].test(n)) return PATTERNS[i][1];
    }
    return "autre";
  };
  api.patternLabel = function(key){ return PATTERN_LABELS[key] || key; };

  // ── Vocabulaire des notes ──────────────────────────────────────────────
  //
  // Cinquante mots couvrent l'essentiel de ce qu'un athlète écrit réellement
  // entre deux séries. Ce n'est pas de la compréhension du langage — c'est un
  // compteur de mots, et c'est annoncé comme tel à l'écran.
  var THEMES = [
    {key:"epaule",    label:"épaule",            re:/epaule|deltoide|coiffe/},
    {key:"genou",     label:"genou",             re:/genou|rotule/},
    {key:"dos",       label:"dos / lombaires",   re:/\bdos\b|lombaire|rein/},
    {key:"coude",     label:"coude",             re:/coude|tendon|epicondyl/},
    {key:"poignet",   label:"poignet",           re:/poignet/},
    {key:"hanche",    label:"hanche",            re:/hanche|psoas|aine/},
    {key:"douleur",   label:"douleur",           re:/douleur|mal\b|ca fait mal|blessure|pincement/},
    {key:"instable",  label:"instabilité",       re:/instab|pas stable|tremble|deseq|desequilibre/},
    {key:"fatigue",   label:"fatigue",           re:/fatigue|epuise|vide|pas de jus|creve/},
    {key:"facile",    label:"trop facile",       re:/trop facile|\bfacile\b|leger pour moi|trop leger/},
    {key:"dur",       label:"trop dur",          re:/trop dur|trop lourd|grind|dur a finir|rate/}
  ];

  // ── Lecture de l'historique ────────────────────────────────────────────

  function rows(refDate){
    var out = [];
    var h = [];
    try{ h = (window.state && Array.isArray(window.state.history)) ? window.state.history : []; }catch(e){ return out; }

    h.forEach(function(s){
      var d = dateOf(s && s.date);
      if(!d || daysAgo(d, refDate) > WINDOW_DAYS) return;
      var results = (s && s.results) || {};
      Object.keys(results).forEach(function(key){
        var r = results[key] || {};
        var load = num(r.load), reps = num(r.reps), rpe = num(r.rpe);
        out.push({
          date: d,
          label: label(key, r),
          load: load, reps: reps, rpe: rpe,
          note: str(r.note),
          e1rm: (load && reps) ? e1rm(load, reps) : 0
        });
      });
    });
    out.sort(function(a, b){ return a.date - b.date; });
    return out;
  }

  function groupByMovement(list){
    var by = {};
    list.forEach(function(r){
      var k = norm(r.label);
      if(!k) return;
      (by[k] = by[k] || {label: r.label, rows: []}).rows.push(r);
    });
    return by;
  }

  function mean(arr){
    var v = arr.filter(function(x){ return typeof x === "number" && isFinite(x) && x > 0; });
    if(!v.length) return 0;
    return v.reduce(function(a, b){ return a + b; }, 0) / v.length;
  }

  // ── Plateaux et forces ─────────────────────────────────────────────────
  //
  // Un plateau, ce n'est pas « la charge n'a pas monté ». C'est « la charge
  // n'a pas monté ALORS QUE l'effort ressenti monte » — le premier cas peut
  // être un choix de programmation, le second est un signal.
  function trends(byMovement){
    var plateaus = [], strengths = [];

    Object.keys(byMovement).forEach(function(k){
      var m = byMovement[k];
      var withLoad = m.rows.filter(function(r){ return r.e1rm > 0; });
      if(withLoad.length < PLATEAU_MIN_SESSIONS) return;

      var recent = withLoad.slice(-3);
      var older  = withLoad.slice(-6, -3);
      var e1Recent = mean(recent.map(function(r){ return r.e1rm; }));
      var e1Older  = mean(older.map(function(r){ return r.e1rm; }));
      if(!e1Recent || !e1Older) return;

      var gain = (e1Recent - e1Older) / e1Older;
      var rpeRecent = mean(recent.map(function(r){ return r.rpe; }));
      var rpeOlder  = mean(older.map(function(r){ return r.rpe; }));
      var rpeDelta  = (rpeRecent && rpeOlder) ? (rpeRecent - rpeOlder) : 0;

      var entry = {
        label: m.label,
        sessions: withLoad.length,
        gainPct: Math.round(gain * 1000) / 10,
        rpeDelta: Math.round(rpeDelta * 10) / 10,
        lastLoad: withLoad[withLoad.length - 1].load,
        lastDate: withLoad[withLoad.length - 1].date
      };

      if(gain < 0.01 && rpeDelta >= 0.3) plateaus.push(entry);
      else if(gain >= 0.03 && rpeDelta <= 0.2) strengths.push(entry);
    });

    // Le plateau le plus marqué d'abord : RPE qui monte le plus pour le moins
    // de gain.
    plateaus.sort(function(a, b){ return (b.rpeDelta - b.gainPct/100) - (a.rpeDelta - a.gainPct/100); });
    strengths.sort(function(a, b){ return b.gainPct - a.gainPct; });
    return {plateaus: plateaus, strengths: strengths};
  }

  // ── Équilibre du volume ────────────────────────────────────────────────
  //
  // L'historique enregistre UNE ligne par mouvement et par séance, pas une
  // ligne par série : on compte donc des EXPOSITIONS, pas des séries. C'est
  // une limite réelle de la donnée, elle est dite telle quelle à l'écran
  // plutôt que maquillée en volume.
  function balance(list){
    var counts = {};
    list.forEach(function(r){
      var p = api.patternOf(r.label);
      counts[p] = (counts[p] || 0) + 1;
    });

    function pair(aKey, bKey, aLabel, bLabel){
      var a = (counts[aKey] || 0), b = (counts[bKey] || 0);
      if(a + b < BALANCE_MIN_PAIR) return null;
      var hi = Math.max(a, b), lo = Math.min(a, b);
      var ratio = lo ? hi / lo : hi;
      if(ratio < BALANCE_RATIO) return null;
      return {
        more: (a > b) ? aLabel : bLabel,
        less: (a > b) ? bLabel : aLabel,
        moreCount: hi, lessCount: lo,
        ratio: Math.round(ratio * 10) / 10
      };
    }

    var push = (counts.poussee_horizontale || 0) + (counts.poussee_verticale || 0);
    var pull = (counts.tirage_horizontal || 0) + (counts.tirage_vertical || 0);
    var pushPull = null;
    if(push + pull >= BALANCE_MIN_PAIR){
      var hi = Math.max(push, pull), lo = Math.min(push, pull);
      var ratio = lo ? hi / lo : hi;
      if(ratio >= BALANCE_RATIO){
        pushPull = {
          more: push > pull ? "poussée" : "tirage",
          less: push > pull ? "tirage" : "poussée",
          moreCount: hi, lessCount: lo,
          ratio: Math.round(ratio * 10) / 10
        };
      }
    }

    return {
      counts: counts,
      pushPull: pushPull,
      squatHinge: pair("squat", "charniere", "squat", "charnière"),
      verticalHorizontalPull: pair("tirage_vertical", "tirage_horizontal", "tirage vertical", "tirage horizontal")
    };
  }

  // ── Trous de fréquence ─────────────────────────────────────────────────
  // Un mouvement que le programme actif prévoit, mais que l'athlète n'a pas
  // fait depuis longtemps. Silencieux si le programme n'est pas lisible.
  function gaps(list, refDate){
    var planned = {};
    try{
      if(typeof window.buildWorkout !== "function" || typeof window.currentDayOrder !== "function") return [];
      var week = (window.state && window.state.week) || 1;
      currentDayOrder().forEach(function(day){
        var w = buildWorkout(day, week);
        (w && w.blocks || []).forEach(function(b){
          (b.exercises || []).forEach(function(e){
            var n = str(e && e.name);
            if(n) planned[norm(n)] = n;
          });
        });
      });
    }catch(e){ return []; }

    var lastSeen = {};
    list.forEach(function(r){ lastSeen[norm(r.label)] = r.date; });

    var out = [];
    Object.keys(planned).forEach(function(k){
      var d = lastSeen[k];
      var since = d ? daysAgo(d, refDate) : null;
      if(since === null || since >= GAP_DAYS){
        out.push({label: planned[k], days: since});
      }
    });
    out.sort(function(a, b){ return (b.days === null ? 9999 : b.days) - (a.days === null ? 9999 : a.days); });
    return out.slice(0, 8);
  }

  // ── Motifs dans les notes ──────────────────────────────────────────────
  function noteThemes(list){
    var found = {};
    list.forEach(function(r){
      if(!r.note) return;
      var n = norm(r.note);
      THEMES.forEach(function(t){
        if(!t.re.test(n)) return;
        var f = found[t.key] = found[t.key] || {label: t.label, hits: 0, movements: {}};
        f.hits++;
        f.movements[r.label] = (f.movements[r.label] || 0) + 1;
      });
    });

    return Object.keys(found)
      .map(function(k){
        var f = found[k];
        var moves = Object.keys(f.movements).sort(function(a, b){ return f.movements[b] - f.movements[a]; });
        return {key: k, label: f.label, hits: f.hits, movements: moves.slice(0, 3)};
      })
      .filter(function(t){ return t.hits >= NOTE_MIN_HITS; })
      .sort(function(a, b){ return b.hits - a.hits; });
  }

  // ── Assemblage ─────────────────────────────────────────────────────────

  api.build = function(refIso){
    var refDate = dateOf(refIso) || new Date();
    var list = rows(refDate);

    if(!list.length){
      return {empty: true, windowDays: WINDOW_DAYS, sessions: 0,
              plateaus: [], strengths: [], gaps: [], noteThemes: [], balance: {counts: {}}};
    }

    var distinctDates = {};
    list.forEach(function(r){ distinctDates[r.date.getTime()] = true; });

    var t = trends(groupByMovement(list));
    return {
      empty: false,
      windowDays: WINDOW_DAYS,
      sessions: Object.keys(distinctDates).length,
      exposures: list.length,
      plateaus: t.plateaus,
      strengths: t.strengths,
      balance: balance(list),
      gaps: gaps(list, refDate),
      noteThemes: noteThemes(list)
    };
  };

  // Rendu texte compact — sert l'écran ET le prompt du pont Coach IA, pour
  // qu'une seule analyse alimente les deux. Pas de second calcul.
  api.toText = function(insights){
    insights = insights || api.build();
    if(insights.empty) return "";
    var L = [];
    L.push("Analyse locale sur " + insights.windowDays + " jours (" + insights.sessions + " séances).");

    if(insights.plateaus.length){
      L.push("Plateaux (charge stable pendant que le RPE monte) :");
      insights.plateaus.slice(0, 5).forEach(function(p){
        L.push("  - " + p.label + " : " + p.gainPct + " % d'e1RM sur " + p.sessions
             + " séances, RPE " + (p.rpeDelta > 0 ? "+" : "") + p.rpeDelta);
      });
    }
    if(insights.strengths.length){
      L.push("Progresse bien :");
      insights.strengths.slice(0, 5).forEach(function(p){
        L.push("  - " + p.label + " : +" + p.gainPct + " % d'e1RM, RPE " + (p.rpeDelta > 0 ? "+" : "") + p.rpeDelta);
      });
    }
    var b = insights.balance;
    if(b.pushPull) L.push("Déséquilibre : " + b.pushPull.more + " " + b.pushPull.moreCount + " expositions contre " + b.pushPull.lessCount + " en " + b.pushPull.less + " (×" + b.pushPull.ratio + ").");
    if(b.squatHinge) L.push("Déséquilibre : " + b.squatHinge.more + " " + b.squatHinge.moreCount + " contre " + b.squatHinge.lessCount + " en " + b.squatHinge.less + " (×" + b.squatHinge.ratio + ").");
    if(b.verticalHorizontalPull) L.push("Déséquilibre : " + b.verticalHorizontalPull.more + " " + b.verticalHorizontalPull.moreCount + " contre " + b.verticalHorizontalPull.lessCount + " en " + b.verticalHorizontalPull.less + ".");

    if(insights.gaps.length){
      L.push("Prévus au programme mais pas faits récemment :");
      insights.gaps.slice(0, 5).forEach(function(g){
        L.push("  - " + g.label + " : " + (g.days === null ? "jamais sur la fenêtre" : "il y a " + g.days + " jours"));
      });
    }
    if(insights.noteThemes.length){
      L.push("Revient dans tes notes :");
      insights.noteThemes.slice(0, 5).forEach(function(t){
        L.push("  - " + t.label + " : " + t.hits + " fois" + (t.movements.length ? " (" + t.movements.join(", ") + ")" : ""));
      });
    }
    return L.join("\n");
  };

  api.WINDOW_DAYS = WINDOW_DAYS;
  api.GAP_DAYS = GAP_DAYS;
  api.THEMES = THEMES;
})();

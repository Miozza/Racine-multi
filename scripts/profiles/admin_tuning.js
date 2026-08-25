// Racine — Panneau admin « Calibration du moteur » (Réglages, admin seulement).
//
// V4.6.7 — ce panneau ne configure plus rien. Il LIT.
//
// Il exposait 23 paramètres scalaires du moteur. Trois d'entre eux mentaient :
// « Confiance minimale du portail » n'était lu par personne (le seuil est en dur
// dans brain_stats.js), « Saut maximal de base » ne s'appliquait à aucun
// mouvement d'isolation (historique.js reprend le cran d'équipement), et
// « Convergence du surplus (defaut) » ne se déclenchait que si aucune intention
// ne matchait — presque jamais sur un programme étiqueté. Trente-trois autres
// constantes du moteur n'étaient pas exposées du tout. Ce n'était pas un
// panneau sous-réglé, c'était un panneau incohérent : le champ affiché n'était
// pas le champ qui agissait.
//
// Le raisonnement de remplacement, en une ligne : le moteur MESURE déjà sa
// propre erreur, mouvement par mouvement (scripts/charge/brain_memory.js), et
// personne ne pouvait la voir. Demander un nombre à un humain pour piloter ce
// que le moteur mesure mieux que lui est l'inverse du travail à faire.
//
// Ce panneau montre donc ce que Brain sait déjà, et n'offre que les gestes
// qu'aucune mesure ne peut remplacer — ceux qui portent une information que
// l'historique ne contient pas :
//   · un plafond que le comportement ne révélera pas (articulation, rack, choix
//     assumé) — en livres, jamais en pourcentage;
//   · un point de départ pour un mouvement que le moteur n'a jamais vu.
//
// DEUX RÈGLES DE LECTURE, non négociables (elles viennent du créateur) :
//
//  1. « S'il veut progresser, il doit pouvoir essayer. » Une prédiction testée
//     qui rate ses reps (`underPredictions`) est un APPRENTISSAGE : Brain a
//     reçu la donnée et corrige déjà la suivante. Ce cas n'apparaît JAMAIS dans
//     la liste. L'y mettre pousserait à brider le moteur, et c'est exactement la
//     boucle auto-bloquante documentée dans movement_tuning.js §brainGate — le
//     portail gelait les charges, donc plus d'observations, donc la confiance ne
//     remontait jamais.
//
//  2. « On n'accuse pas le moteur pour un faible historique. » Rien ne
//     s'affiche sous les seuils de RULES. Un mouvement à deux séances n'est pas
//     dans la liste, même s'il s'est trompé deux fois sur deux.
//
// Conséquence : le seul vrai blocage signalé est `humanOverrideDown` — le
// moteur propose, l'athlète met moins, et `testedPredictions` n'augmente pas
// (brain_memory.js:227-228). Là il ne reçoit AUCUNE donnée et reproposera la
// même chose indéfiniment. C'est le seul cas où un plafond posé à la main vaut
// mieux que d'attendre.
//
// Lecture seule côté moteur : ce fichier n'appelle que des lectures publiques
// (CoachBrainMemory.exportSummary / recentPrecision / precisionTrend) et
// n'écrit que par CoachTuningOverride.setCeiling() et le chemin de charge
// personnalisée déjà utilisé par le panneau « Charges personnalisées ».
window.RacineAdminTuning = window.RacineAdminTuning || {};

(function(){
  var api = window.RacineAdminTuning;

  // ─── Seuils de lecture ────────────────────────────────────────────────────
  // Ils ne règlent PAS le moteur : ils décident seulement de ce dont on ose
  // parler. Les changer ne change aucune charge suggérée.
  var RULES = {
    minTested:        6,     // prédictions testées avant de juger le moteur
    minRecentSample:  5,     // = MIN_RECENT_OUTCOMES (brain_memory.js:23)
    weakPrecision:    0.60,  // sous ça, plus de 4 prédictions sur 10 ratent
    improvingMargin:  0.05,  // récent > à vie + marge = la courbe descend encore
    minOverrideDown:  3,     // propositions refusées sans jamais être testées
    overrideDominance: 0.60  // ... et qui dominent ce qui s'est passé ici
  };

  function esc(s){
    if(typeof escapeHtml === "function") return escapeHtml(s);
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c];
    });
  }
  function host(){ return document.getElementById("adminTuningBody"); }
  function isAdmin(){ return !!(window.CoachProfiles && CoachProfiles.isActiveAdmin && CoachProfiles.isActiveAdmin()); }
  function override(){ return window.CoachTuningOverride || null; }
  function memory(){ return window.CoachBrainMemory || null; }
  function status(msg, ok){
    var s = document.getElementById("adminTuningStatus");
    if(s){ s.textContent = msg || ""; s.className = "status-msg" + (ok ? " ok" : (msg ? " err" : "")); }
  }
  function activeName(){
    var p = (window.CoachProfiles && CoachProfiles.getActive) ? CoachProfiles.getActive() : null;
    return (p && p.name) || "profil actif";
  }
  function num(v){ var n = Number(v); return isNaN(n) ? 0 : n; }
  function pct(v){ return Math.round(num(v) * 100); }
  function lb(v){
    var n = Number(v);
    if(isNaN(n)) return "—";
    return (Math.abs(n - Math.round(n)) < 1e-9) ? String(Math.round(n)) : String(Math.round(n*10)/10);
  }
  // Nom canonique du moteur : deux intentions du même mouvement doivent se
  // regrouper, et un plafond se pose sur le mouvement, pas sur l'intention.
  function canon(name){
    try{
      if(typeof canonicalMovementLabel === "function"){
        var l = canonicalMovementLabel(name);
        if(l) return String(l).trim();
      }
    }catch(e){}
    return String(name == null ? "" : name).trim();
  }
  function normKey(name){
    try{
      if(typeof coachNormalizeMoveText === "function") return coachNormalizeMoveText(name);
    }catch(e){}
    return String(name == null ? "" : name).trim().toLowerCase();
  }

  // ─── Agrégation Brain, par mouvement ──────────────────────────────────────
  // exportSummary() renvoie un profil par (mouvement × intention). Un plafond
  // ne connaît pas l'intention : on somme.
  function aggregate(){
    var mem = memory();
    if(!mem || typeof mem.exportSummary !== "function") return null;
    var summary = null;
    try{ summary = mem.exportSummary(); }catch(e){ return null; }
    var profiles = (summary && Array.isArray(summary.profiles)) ? summary.profiles : [];
    var byMove = {};
    profiles.forEach(function(p){
      if(!p || !p.label) return;
      var label = canon(p.label);
      var k = normKey(label);
      if(!k) return;
      var m = byMove[k] || (byMove[k] = {
        label: label, sessions: 0, tested: 0, ok: 0,
        under: 0, over: 0, down: 0, up: 0,
        recentSum: 0, recentLen: 0, lastDate: ""
      });
      m.sessions += num(p.sessions);
      m.tested   += num(p.testedPredictions);
      m.ok       += num(p.successfulPredictions);
      m.under    += num(p.underPredictions);
      m.over     += num(p.overPredictions);
      m.down     += num(p.humanOverrideDown);
      m.up       += num(p.humanOverrideUp);
      var out = Array.isArray(p.recentOutcomes) ? p.recentOutcomes : [];
      for(var i = 0; i < out.length; i++){ m.recentSum += num(out[i]) ? 1 : 0; }
      m.recentLen += out.length;
      var d = String(p.lastDate || "");
      if(d > m.lastDate) m.lastDate = d;
    });
    return byMove;
  }

  // Précision globale, mise en commun sur toutes les fenêtres glissantes.
  // `null` tant que l'échantillon ne veut rien dire — mieux vaut pas de chiffre
  // qu'un chiffre sur deux points (même règle que brain_memory.js).
  function globalPrecision(byMove){
    var sum = 0, len = 0;
    Object.keys(byMove || {}).forEach(function(k){
      sum += byMove[k].recentSum;
      len += byMove[k].recentLen;
    });
    if(len < RULES.minRecentSample) return null;
    return { pct: Math.round((sum / len) * 100), sample: len };
  }

  // Tendance mensuelle : le dernier mois clos comparé au précédent. C'est la
  // seule mesure qui montre une amélioration ; la précision à vie est un ratio
  // cumulatif, elle se fige avec le volume (CLAUDE.md §8).
  function trendDelta(){
    var mem = memory();
    if(!mem || typeof mem.precisionTrend !== "function") return null;
    var pts = [];
    try{ pts = mem.precisionTrend() || []; }catch(e){ return null; }
    var usable = pts.filter(function(p){ return p && p.precision !== null && num(p.tested) > 0; });
    if(usable.length < 2) return null;
    var last = usable[usable.length - 1], prev = usable[usable.length - 2];
    return { delta: num(last.precision) - num(prev.precision), month: last.month, tested: num(last.tested) };
  }

  // ─── Les trois cas, et rien d'autre ───────────────────────────────────────
  // Aucun n'est déclenché par un compteur d'erreurs. `under` n'entre nulle part.
  function findings(byMove){
    var out = [];
    var caps = {};
    var eng = override();
    if(eng){
      try{
        var c = eng.ceilings() || {};
        Object.keys(c).forEach(function(n){ caps[normKey(n)] = true; });
      }catch(e){}
    }

    Object.keys(byMove || {}).forEach(function(k){
      var m = byMove[k];
      if(caps[k]) return;                       // déjà traité : tu lui as dit

      // A. Il propose, tu refuses — et il n'apprend rien.
      var attempts = m.down + m.tested;
      if(m.down >= RULES.minOverrideDown && attempts > 0 && (m.down / attempts) >= RULES.overrideDominance){
        out.push({
          kind: "untested",
          label: m.label,
          title: m.down + " propositions refusées sans être testées",
          why: "Tu descends la charge à chaque fois, donc " + (m.tested ? "il ne teste presque jamais" : "il n'a jamais été testé")
             + ". Sans essai, il ne reçoit aucune donnée et reproposera la même chose."
        });
        return;
      }

      // B. Il se trompe ET la courbe ne descend plus.
      if(m.tested >= RULES.minTested && m.recentLen >= RULES.minRecentSample){
        var recent = m.recentSum / m.recentLen;
        var life = m.tested ? (m.ok / m.tested) : 0;
        if(recent < RULES.weakPrecision && recent <= life + RULES.improvingMargin){
          out.push({
            kind: "stuck",
            label: m.label,
            title: pct(recent) + " % de réussite sur les " + m.recentLen + " dernières",
            why: "Précision à vie " + pct(life) + " % : la courbe ne descend plus sur ce mouvement. "
               + "Ce n'est plus de l'apprentissage."
          });
        }
      }
    });

    out.sort(function(a, b){ return a.label.localeCompare(b.label, "fr"); });
    return out;
  }

  // C. Mouvements du programme actif sans aucun repère de charge.
  // Un seed à 0 est un choix délibéré (poids du corps) : on ne le signale pas.
  // Sans règle d'équipement ET sans seed, c'est probablement du cardio ou de la
  // mobilité — le catalogue ne porte aucun attribut « chargeable », c'est le
  // meilleur filtre disponible aujourd'hui.
  function seedless(){
    var out = [];
    if(typeof coachDefaultLoadSeedForMovement !== "function") return out;
    var cat = null;
    try{
      if(window.RacineMovementSwaps && RacineMovementSwaps.movementCatalog){
        var pid = (window.CoachProfiles && CoachProfiles.getActiveId) ? CoachProfiles.getActiveId() : null;
        cat = RacineMovementSwaps.movementCatalog(pid);
      }
    }catch(e){}
    var names = (cat && Array.isArray(cat.program)) ? cat.program : [];
    names.forEach(function(name){
      var seed = null;
      try{ seed = coachDefaultLoadSeedForMovement(name); }catch(e){ return; }
      if(seed !== null && seed !== undefined) return;      // 0 compris : repère assumé
      var rule = null;
      try{
        if(typeof equipmentRuleForExercise === "function") rule = equipmentRuleForExercise(name, "");
      }catch(e){}
      if(!rule) return;                                     // ni charge ni équipement : pas notre affaire
      var rec = null;
      try{ if(typeof athleteMovementRecord === "function") rec = athleteMovementRecord(name); }catch(e){}
      if(rec && rec.history && rec.history.length) return;  // il a déjà vu quelque chose
      out.push({ kind: "seedless", label: canon(name), title: "Aucun repère de charge",
                 why: "Ni charge de départ, ni historique. Le moteur avance à l'aveugle sur ce mouvement." });
    });
    out.sort(function(a, b){ return a.label.localeCompare(b.label, "fr"); });
    return out;
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  function headerHtml(byMove){
    var g = globalPrecision(byMove);
    var t = trendDelta();
    if(!g){
      return '<div class="calib-hero calib-hero-empty">'
        + '<div class="calib-hero-label">Précision récente</div>'
        + '<div class="calib-hero-value">—</div>'
        + '<div class="calib-hero-note">Pas encore assez de prédictions testées pour dire quoi que ce soit.</div>'
        + '</div>';
    }
    var arrow = "";
    if(t){
      var d = Math.round(t.delta);
      if(d > 0) arrow = '<span class="calib-trend up">↗ +' + d + ' pts</span>';
      else if(d < 0) arrow = '<span class="calib-trend down">↘ ' + d + ' pts</span>';
      else arrow = '<span class="calib-trend flat">→ stable</span>';
    }
    return '<div class="calib-hero">'
      + '<div class="calib-hero-label">Précision récente</div>'
      + '<div class="calib-hero-value">' + g.pct + ' %' + arrow + '</div>'
      + '<div class="calib-hero-note">Sur les ' + g.sample + ' dernières prédictions testées'
      + (t ? ', comparé au mois précédent' : '') + '.</div>'
      + '</div>';
  }

  function findingHtml(f){
    var action = (f.kind === "seedless")
      ? '<button type="button" class="btn-ghost calib-act" data-calib-seed="' + esc(f.label) + '">Donner un point de départ</button>'
      : '<button type="button" class="btn-ghost calib-act" data-calib-cap="' + esc(f.label) + '">Poser un plafond</button>';
    return '<div class="calib-item calib-item-' + esc(f.kind) + '">'
      + '<div class="calib-item-name">' + esc(f.label) + '</div>'
      + '<div class="calib-item-title">' + esc(f.title) + '</div>'
      + '<p class="calib-item-why">' + esc(f.why) + '</p>'
      + action
      + '</div>';
  }

  function ceilingsHtml(){
    var eng = override();
    var caps = {};
    if(eng){ try{ caps = eng.ceilings() || {}; }catch(e){ caps = {}; } }
    var names = Object.keys(caps).sort(function(a,b){ return a.localeCompare(b, "fr"); });
    var h = '<h3>Ce que tu lui as dit</h3>';
    if(!names.length){
      h += '<p class="muted">Aucun plafond posé. Tous les mouvements sont déduits du comportement — '
        + 'pointe stable <em>et</em> effort élevé, jamais un chiffre écrit à l\'avance.</p>';
    }else{
      names.forEach(function(name){
        h += '<div class="calib-cap-row">'
          + '<span class="calib-cap-name">' + esc(name) + '</span>'
          + '<span class="calib-cap-load">' + esc(lb(caps[name])) + ' lb</span>'
          + '<button type="button" class="btn-ghost" data-cap-remove="' + esc(name) + '">Retirer</button>'
          + '</div>';
      });
    }
    h += '<div class="calib-actions">'
      + '<button type="button" class="btn-ghost" id="adminCalibAddCap">Poser un plafond sur un autre mouvement</button>'
      + '</div>';
    return h;
  }

  api.render = function(){
    var h = host();
    if(!h) return;
    if(!isAdmin()){ h.innerHTML = ""; return; }
    if(!memory()){
      h.innerHTML = '<p class="muted">Mémoire du moteur indisponible.</p>';
      return;
    }

    var byMove = aggregate() || {};
    var list = findings(byMove).concat(seedless());

    var html = headerHtml(byMove);

    html += '<h3>Ce qu\'il n\'arrive pas à apprendre</h3>';
    if(!list.length){
      html += '<p class="muted">Rien à signaler. Quand une charge proposée rate ses répétitions, '
        + 'le moteur enregistre et corrige la suivante — c\'est son travail, pas un défaut. '
        + 'Un mouvement n\'apparaît ici que s\'il ne progresse plus, ou si tu refuses ses propositions '
        + 'sans jamais les tester.</p>';
    }else{
      html += list.map(findingHtml).join("");
    }

    html += ceilingsHtml();
    html += '<p id="adminTuningStatus" class="status-msg"></p>';
    h.innerHTML = html;

    bind(h);
  };

  // ─── Gestes ───────────────────────────────────────────────────────────────
  function askCeiling(label){
    var eng = override();
    if(!eng) return;
    var raw = prompt("Plafond de charge pour « " + label + " » (en livres).\n\n"
      + "Le moteur ne proposera plus au-dessus. La progression passera par les "
      + "répétitions, le tempo ou le volume.", "");
    if(raw === null) return;
    if(!eng.setCeiling(label, raw)){
      status("Il faut une charge entre 1 et 2000 lb.", false);
      return;
    }
    api.render();
    status("Plafond fixé à " + lb(raw) + " lb pour « " + label + " ».", true);
  }

  // Point de départ : exactement le chemin du panneau « Charges personnalisées »
  // (app.js renderChargeSettings) — customCharges + report dans athlete_state.
  // Aucun stockage nouveau, aucune clé nouvelle.
  function askSeed(label){
    var raw = prompt("Charge de départ pour « " + label + " » (en livres).\n\n"
      + "Ce que tu utiliserais aujourd'hui pour une série de travail propre. "
      + "Le moteur repart de là et ajuste dès la première séance loggée.", "");
    if(raw === null) return;
    var value = String(raw).trim();
    var loadNum = (typeof parseLoad === "function") ? parseLoad(value) : Number(value);
    if(!(loadNum > 0)){
      status("Il faut une charge en livres, supérieure à zéro.", false);
      return;
    }
    try{
      if(typeof customCharges === "object" && customCharges){
        customCharges[label] = value;
        if(typeof applyChargeOverrideToAthleteState === "function"){
          applyChargeOverrideToAthleteState(label, loadNum,
            (typeof todayDateString === "function") ? todayDateString() : null);
        }
        if(typeof saveCustomCharges === "function") saveCustomCharges();
        if(typeof save === "function") save();
        if(typeof renderWorkout === "function") renderWorkout();
      }
    }catch(e){
      status("Impossible d'enregistrer cette charge.", false);
      return;
    }
    api.render();
    status("« " + label + " » part de " + value + ".", true);
  }

  function openCeilingPicker(){
    var eng = override();
    if(!eng || !(window.RacineMovementPicker && RacineMovementPicker.open)) return;
    var caps = {};
    try{
      var c = eng.ceilings() || {};
      Object.keys(c).forEach(function(n){ caps[normKey(n)] = n; });
    }catch(e){}
    RacineMovementPicker.open({
      eyebrow: "Plafond manuel",
      title: "Sur quel mouvement ?",
      confirmLabel: "Choisir",
      footNote: "Nom du catalogue — le moteur ne reconnaît que le nom exact.",
      multi: false,
      // Même nom : « plafond déjà posé » suffit. Nom différent qui retombe sur
      // le même mouvement pour le moteur : on nomme celui qui occupe la place,
      // sinon le grisé ressemble à un bug.
      blocked: function(name){
        var owner = caps[normKey(name)];
        if(!owner) return "";
        return (normKey(owner) === normKey(name)) ? "plafond déjà posé" : ("plafond sur « " + owner + " »");
      },
      onPick: function(names){
        if(names && names.length) askCeiling(canon(names[0]));
      }
    });
  }

  function bind(h){
    Array.prototype.forEach.call(h.querySelectorAll("[data-calib-cap]"), function(btn){
      btn.onclick = function(){ askCeiling(btn.getAttribute("data-calib-cap")); };
    });
    Array.prototype.forEach.call(h.querySelectorAll("[data-calib-seed]"), function(btn){
      btn.onclick = function(){ askSeed(btn.getAttribute("data-calib-seed")); };
    });
    Array.prototype.forEach.call(h.querySelectorAll("[data-cap-remove]"), function(btn){
      btn.onclick = function(){
        var eng = override();
        if(!eng) return;
        eng.removeCeiling(btn.getAttribute("data-cap-remove"));
        api.render();
        status("Plafond retiré — le moteur redéduit ce mouvement de lui-même.", true);
      };
    });
    var add = document.getElementById("adminCalibAddCap");
    if(add) add.onclick = openCeilingPicker;
  }

  // Exposé pour les garde-fous : la logique de lecture doit être vérifiable
  // sans DOM (dev/calibration_readout_checks.js).
  api.RULES = RULES;
  api.analyze = function(){
    var byMove = aggregate() || {};
    return { byMove: byMove, precision: globalPrecision(byMove), findings: findings(byMove) };
  };
  api.activeProfileName = activeName;
})();

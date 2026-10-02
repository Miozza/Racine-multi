// @ts-check
// scripts/charge/kalman.js
// Racine — capacite estimee par filtre de Kalman (window.CoachKalman).
//
// Le moteur a regles decide QUOI faire : intention, reps, format, deload,
// plafonds, freins RPE. Il ne tenait aucune estimation de ce dont l'athlete
// est CAPABLE, avec une marge d'erreur — et le Brain ne pouvait que freiner
// (coachBrainApplyStatsGate n'agit que sur une hausse, pour l'amortir).
// Ce module tient cette estimation. Il travaille AVEC le moteur, pas a sa
// place.
//
// Cas qui l'a motive (rejeu de l'export reel, 53 seances) : Strict Press,
// historique arrete au 17 sept 2026, e1RM estime 176 lb. Le test du 1er oct a
// donne 175 reussi, 185 rate. Le moteur affichait 140 : la conversion Epley de
// coachRuleLastSetGuards ne peut que BAISSER une charge, et un jour de test a
// 1 rep apres 140 x 6 restait a 140.
//
// Quatre regles de conception, chacune contre un piege precis :
//
//  1. ETAT DERIVE, JAMAIS STOCKE. Aucune cle de stockage, aucun changement de
//     schema : l'etat se reconstruit en memoire depuis le journal brut
//     (state.history), de facon pure et deterministe, des que ce journal
//     change (empreinte). Le format d'export/import ne bouge pas.
//
//  2. FILTRE DE CONTEXTE REUTILISE. Un resultat WOD, technique, leger,
//     vitesse, recuperation ou deload ne met jamais l'etat a jour. Le
//     verdict vient des detecteurs existants (coachHistoryContextIsLimited,
//     coachBrainIsDeloadRow, coachIsNonPerformanceSeed) — aucune copie ici.
//
//  3. TOUT REGLAGE DANS LA TABLE. Bruits, poids, a priori, motifs de jour de
//     test : COACH_MOVEMENT_TUNING.kalman (movement_tuning.js), surchargeables
//     par profil pour les scalaires (tuning_override.js).
//
//  4. CONSULTATIF PAR DEFAUT. Mode `shadow` en usine : on observe, on
//     explique dans le (!), on journalise — la charge affichee reste
//     identique bit a bit. Le mode `blend` melange l'estimation AVANT les
//     garde-fous (saut max, plafonds, freins RPE, arrondi), qui gardent le
//     dernier mot. L'integration dans suggestion.js est defensive : module
//     absent ou en erreur = moteur d'avant, exactement.
//
// Etat tenu en ESPACE LOG (x = ln e1RM, variance P) : une erreur de mesure
// est proportionnelle a la charge (3 % de 300 lb n'est pas 3 % de 30 lb).
//
//   Observation : y = ln(epley1RM(load, reps + RIR)), RIR = clamp(10 - RPE, 0, maxRir)
//   Processus   : P += processSdPerWeek^2 x jours / 7
//   Mise a jour : K = P / (P + R) ; x += K (y - x) ; P = (1 - K) P
//   Jour de test: borne basse — mise a jour seulement si y > x.
(function(){
  var api = window.CoachKalman = window.CoachKalman || {};
  var Z95 = 1.96;

  function tuning(){
    var T = window.COACH_MOVEMENT_TUNING;
    return (T && T.kalman) || null;
  }
  function num(v, fallback){
    var n = Number(v);
    return (isFinite(n) && !isNaN(n)) ? n : fallback;
  }
  function cfg(){
    var K = tuning() || {};
    var M = K.measurementSd || {};
    return {
      mode: num(K.mode, 0),
      q: num(K.processSdPerWeek, 0.015),
      rClean: num(M.clean, 0.03),
      rHard: num(M.hard, 0.045),
      rFailed: num(M.failed, 0.07),
      rTest: num(K.testLowerBoundSd, 0.02),
      priorSd: num(K.priorSd, 0.10),
      defaultRpe: num(K.defaultRpe, 8),
      maxRir: num(K.maxRir, 4),
      targetRpe: num(K.targetRpe, 8),
      wMax: num(K.wMax, 0.5),
      sdMax: num(K.sdMax, 0.08),
      minObs: num(K.minObservations, 2),
      gateSd: num(K.gateSd, 0.04),
      gatePct: num(K.gatePct, 0.90),
      testPatterns: Array.isArray(K.testFormatPatterns) ? K.testFormatPatterns : [],
      oneRmPatterns: Array.isArray(K.oneRmFormatPatterns) ? K.oneRmFormatPatterns : [],
      related: Array.isArray(K.related) ? K.related : []
    };
  }

  // 0 = off, 1 = shadow, 2 = blend. Table absente = off : sans reglage, le
  // module n'a pas d'avis.
  function mode(){
    var m = cfg().mode;
    if(m >= 2) return 'blend';
    if(m >= 1) return 'shadow';
    return 'off';
  }
  api.mode = mode;
  // Ecrit le mode par la seule porte de surcharge de profil — jamais une cle
  // a part. Sans ce module de surcharge, le mode reste celui de la table.
  api.setMode = function(name){
    var v = name === 'blend' ? 2 : (name === 'shadow' ? 1 : (name === 'off' ? 0 : null));
    if(v === null) return null;
    if(window.CoachTuningOverride && typeof CoachTuningOverride.set === 'function'){
      CoachTuningOverride.set('kalman.mode', v);
    }
    return mode();
  };

  // ─── Utilitaires ─────────────────────────────────────────────────────────
  function norm(s){
    if(typeof coachNormalizeMoveText === 'function') return coachNormalizeMoveText(s);
    return String(s || '').toLowerCase().trim();
  }
  function labelOf(keyOrName){
    if(typeof movementLabelFromKeyOrName === 'function') return movementLabelFromKeyOrName(keyOrName);
    if(typeof canonicalMovementLabel === 'function') return canonicalMovementLabel(keyOrName);
    return String(keyOrName || '');
  }
  function keyOf(label){ return norm(labelOf(label)); }
  function loadNum(v){
    var n = (typeof parseLoad === 'function') ? parseLoad(v) : Number(v);
    if(n === null || n === undefined) n = Number(v);
    return num(n, 0);
  }
  function epley(load, reps){
    if(typeof epley1RM === 'function') return epley1RM(load, reps);
    load = Number(load) || 0; reps = Number(reps) || 0;
    return (load && reps) ? load * (1 + reps / 30) : 0;
  }
  // Jour civil en nombre de jours, depuis « AAAA-MM-JJ ». Calcul UTC : aucun
  // fuseau ni heure d'ete ne doit changer le resultat d'un rebuild.
  function dayNum(date){
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
    if(!m) return null;
    return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5);
  }
  function todayStr(){
    var d = api.clock ? api.clock() : new Date();
    if(typeof d === 'string') return d.slice(0, 10);
    var mm = String(d.getMonth() + 1), dd = String(d.getDate());
    return d.getFullYear() + '-' + (mm.length < 2 ? '0' + mm : mm) + '-' + (dd.length < 2 ? '0' + dd : dd);
  }
  function rirOf(rpe, C){
    var r = Number(rpe) || C.defaultRpe;
    return Math.max(0, Math.min(C.maxRir, 10 - r));
  }
  function matchesAny(text, patterns){
    if(!text) return false;
    if(typeof coachMatchesAnyTuningPattern === 'function') return coachMatchesAnyTuningPattern(text, patterns);
    return (patterns || []).some(function(re){ return re && typeof re.test === 'function' && re.test(text); });
  }

  // ─── Jour de test ────────────────────────────────────────────────────────
  // Lu sur le FORMAT prescrit (« montee vers 3RM », « 1RM test »), le seul
  // champ ou un programme declare un test. La note n'est pas lue : elle
  // contient des consignes (« stop si la vitesse meurt »), pas un format.
  function formatOf(context){
    return norm(context && (context.format || '') || '');
  }
  function isTestContext(context){
    return matchesAny(formatOf(context), cfg().testPatterns);
  }
  function isOneRmTestContext(context){
    return matchesAny(formatOf(context), cfg().oneRmPatterns);
  }
  api.isTestContext = isTestContext;
  api.isOneRmTestContext = isOneRmTestContext;

  // ─── Observation : une ligne de resultat → une mesure, ou rien ───────────
  // Retourne {skip:'raison'} quand la ligne ne doit pas toucher l'etat. Les
  // raisons sont exposees par explainRow() : un filtre qu'on ne peut pas
  // auditer est un filtre qu'on ne peut pas corriger.
  function rowContext(row, label){
    var planned = row.planned || {};
    if(planned.context) return planned.context;
    if(row.context && typeof row.context === 'object') return row.context;
    // Ligne sans contexte recopie : on le reconstruit comme la sauvegarde
    // l'aurait fait (updateAthleteStateFromResults), a partir du prescrit.
    if((planned.kind || planned.format) && typeof coachBuildMovementContext === 'function'){
      try{ return coachBuildMovementContext(label, {kind: planned.kind, format: planned.format}); }catch(e){}
    }
    return null;
  }
  function measurementSd(row, rpe, C){
    var status = String(row.status || '');
    if(!status && typeof classifyPerformance === 'function' && row.planned){
      try{ status = classifyPerformance(row, row.planned).status; }catch(e){ status = ''; }
    }
    if(status === 'failed' || status === 'major_fail' || status === 'recalibrating') return C.rFailed;
    if(status === 'hard_success' || status === 'hard' || (!status && rpe >= 9)) return C.rHard;
    return C.rClean;
  }
  function observationFromRow(key, r, C){
    if(!r || typeof r !== 'object') return {skip:'vide'};
    if(r.isWod) return {skip:'wod'};
    var label = labelOf(key);
    var load = loadNum(r.load), reps = Number(r.reps) || 0, rpe = Number(r.rpe) || 0;
    if(!(load > 0)) return {skip:'sans charge'};
    if(!(reps > 0)) return {skip:'sans reps'};
    var context = rowContext(r, label);
    // Ligne au format historique (ce que lisent les detecteurs existants).
    var row = {load:load, reps:reps, rpe:rpe, status:r.status, planned:r.planned || null,
      context:context, implausible:!!r.implausible};
    if(row.implausible) return {skip:'invraisemblable'};
    try{
      if(typeof coachIsBodyweightExternalLoadMovement === 'function' && coachIsBodyweightExternalLoadMovement(label, context)){
        // Un lest n'est pas une charge totale : Epley n'y a pas de sens.
        return {skip:'lest sur poids du corps'};
      }
    }catch(e){}
    if(typeof coachIsNonPerformanceSeed === 'function' && coachIsNonPerformanceSeed(row)) return {skip:'calibrage'};
    if(typeof coachBrainIsDeloadRow === 'function' && coachBrainIsDeloadRow(row)) return {skip:'deload'};
    if(typeof coachHistoryContextIsLimited === 'function' && coachHistoryContextIsLimited(row)) return {skip:'contexte limite'};
    var e = epley(load, reps + rirOf(rpe, C));
    if(!(e > 0)) return {skip:'epley nul'};
    var ctxForTest = (typeof coachHistoryContext === 'function') ? (coachHistoryContext(row) || context) : context;
    return {
      label: label, key: norm(label), load: load, reps: reps, rpe: rpe,
      y: Math.log(e), sd: measurementSd(row, rpe, C), test: isTestContext(ctxForTest)
    };
  }

  // Journal brut → sessions. Accepte state.history (le cas reel), un export de
  // profil, ou une liste plate de lignes {date, name|label, load, reps, rpe}.
  function sessionsFrom(input){
    if(!input) return [];
    if(Array.isArray(input)){
      if(!input.length) return [];
      var flat = input.every(function(x){ return x && !x.results && !x.resultats && (x.name || x.label); });
      if(!flat) return input;
      return input.map(function(x){
        var res = {}; res[x.label || x.name] = x;
        return {date: x.date, results: res};
      });
    }
    if(Array.isArray(input.history)) return input.history;
    if(input.state && Array.isArray(input.state.history)) return input.state.history;
    return [];
  }

  function collect(input, beforeDay, C){
    var obs = [], skipped = {};
    sessionsFrom(input).forEach(function(s, si){
      if(!s || typeof s !== 'object') return;
      var date = String(s.actualDate || s.date || '').slice(0, 10);
      var day = dayNum(date);
      if(day === null) return;
      if(beforeDay !== null && beforeDay !== undefined && day >= beforeDay) return;
      var res = s.results || s.resultats || {};
      Object.keys(res).forEach(function(key, ki){
        var o = observationFromRow(key, res[key], C);
        if(o.skip){ skipped[o.skip] = (skipped[o.skip] || 0) + 1; return; }
        o.day = day; o.date = date; o.order = si * 10000 + ki;
        obs.push(o);
      });
    });
    // Tri stable et total : meme journal = meme ordre = meme etat.
    obs.sort(function(a, b){ return (a.day - b.day) || (a.order - b.order); });
    return {obs: obs, skipped: skipped};
  }

  // ─── A priori ────────────────────────────────────────────────────────────
  // 1. mouvement apparente qui a deja un etat (table `related`) ;
  // 2. ratios de profil (scaling.js) sur un mouvement de reference DIRECT —
  //    jamais un emprunt de famille, trop lache pour une capacite ;
  // 3. sinon rien : le moteur garde seul la main.
  // Toujours avec une variance large (priorSd) : l'a priori oriente la
  // premiere mesure, il ne la remplace pas.
  function relatedPrior(key, states, C){
    for(var i = 0; i < C.related.length; i++){
      var e = C.related[i];
      if(!e || norm(e.name) !== key) continue;
      var st = states[norm(e.from)];
      var ratio = Number(e.ratio);
      if(st && st.n > 0 && ratio > 0){
        return {x: st.x + Math.log(ratio), P: C.priorSd * C.priorSd, source: 'related', from: st.label, ratio: ratio};
      }
    }
    return null;
  }
  function scalingPrior(label, C){
    try{
      if(typeof PR_FIELD_MAP !== 'object' || typeof prCfgMatchesResult !== 'function') return null;
      var ref = (window.RacineProfileReference && typeof RacineProfileReference.profile === 'function')
        ? RacineProfileReference.profile() : null;
      if(!ref) return null;
      if(typeof coachIsBodyweightExternalLoadMovement === 'function' && coachIsBodyweightExternalLoadMovement(label, null)) return null;
      var src = (typeof coachUserLoadRatioSource === 'function') ? coachUserLoadRatioSource(label) : null;
      if(!src || src.borrowed || !(src.ratio > 0)) return null;
      var ids = Object.keys(PR_FIELD_MAP);
      for(var i = 0; i < ids.length; i++){
        var p = PR_FIELD_MAP[ids[i]];
        if(!p || !p.profile || !prCfgMatchesResult(p, label)) continue;
        var base = epley(Number(ref[p.profile]) || 0, Number(p.reps) || 1);
        if(!(base > 0)) return null;
        return {x: Math.log(base * src.ratio), P: C.priorSd * C.priorSd, source: 'scaling', from: p.profile, ratio: src.ratio};
      }
    }catch(e){}
    return null;
  }
  function priorFor(label, states, C){
    var key = norm(label);
    return relatedPrior(key, states, C) || scalingPrior(label, C);
  }

  // ─── Le filtre ───────────────────────────────────────────────────────────
  function predictP(st, day, C){
    var dt = Math.max(0, day - st.day);
    return st.P + C.q * C.q * dt / 7;
  }
  function build(input, beforeDay){
    var C = cfg();
    var col = collect(input, beforeDay, C);
    var states = {};
    col.obs.forEach(function(o){
      var st = states[o.key];
      if(!st){
        var prior = priorFor(o.label, states, C);
        if(!prior){
          // Premiere mesure, aucun a priori : elle EST l'etat, avec son bruit.
          var s0 = o.test ? C.rTest : o.sd;
          states[o.key] = {label:o.label, x:o.y, P:s0 * s0, day:o.day, lastDate:o.date, n:1, tests:o.test ? 1 : 0, ignoredTests:0, prior:null};
          return;
        }
        st = states[o.key] = {label:o.label, x:prior.x, P:prior.P, day:o.day, lastDate:o.date, n:0, tests:0, ignoredTests:0,
          prior:{source:prior.source, from:prior.from, ratio:prior.ratio, e1RM:Math.exp(prior.x)}};
      }
      st.P = predictP(st, o.day, C);
      st.day = o.day;
      var sd = o.sd;
      if(o.test){
        // Borne basse : la meilleure rep reussie dit « au moins ». Sous
        // l'estimation, elle n'apprend rien — l'echec qui a suivi n'est pas
        // dans le journal.
        if(!(o.y > st.x)){ st.ignoredTests++; st.lastDate = o.date; return; }
        sd = C.rTest;
        st.tests++;
      }
      var R = sd * sd;
      var K = st.P / (st.P + R);
      st.x = st.x + K * (o.y - st.x);
      st.P = (1 - K) * st.P;
      st.n++;
      st.lastDate = o.date;
    });
    return {states: states, observations: col.obs.length, skipped: col.skipped};
  }

  // ─── Cache : reconstruit seulement quand le journal change ───────────────
  var cache = {fp: null, built: null, pinned: false, source: null, serial: 0};
  var cutoff = null;

  function liveHistory(){
    try{
      if(window.state && Array.isArray(window.state.history)) return window.state.history;
    }catch(e){}
    try{
      // eslint-disable-next-line no-undef
      if(typeof state !== 'undefined' && state && Array.isArray(state.history)) return state.history;
    }catch(e){}
    return [];
  }
  // Empreinte du journal et de tout ce qui change le resultat : reglages et
  // ratios de profil (a priori). Une edition de seance passee en place change
  // l'empreinte ; une simple relecture, non.
  function fingerprint(history){
    var parts = [];
    var K = tuning() || {};
    Object.keys(K).forEach(function(k){
      var v = K[k];
      if(typeof v === 'number') parts.push(k + '=' + v);
      else if(v && typeof v === 'object' && !Array.isArray(v)) Object.keys(v).forEach(function(s){ parts.push(k + '.' + s + '=' + v[s]); });
    });
    try{
      var prof = (window.state && window.state.profile) || null;
      if(prof && prof.scaleRatios) parts.push(JSON.stringify(prof.scaleRatios));
    }catch(e){}
    var h = 2166136261;
    function mix(str){
      for(var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; }
    }
    mix(parts.join('|'));
    (history || []).forEach(function(s){
      if(!s) return;
      mix('#' + (s.actualDate || s.date || ''));
      var res = s.results || s.resultats || {};
      Object.keys(res).forEach(function(k){
        var r = res[k] || {};
        var p = r.planned || {};
        var c = p.context || {};
        mix(k + ':' + r.load + 'x' + r.reps + '@' + r.rpe + ':' + (r.status || '') + ':' + (r.isWod ? 1 : 0)
          + ':' + (p.source || '') + ':' + (p.format || c.format || '') + ':' + (c.isRecovery ? 1 : 0));
      });
    });
    return (history ? history.length : 0) + ':' + (h >>> 0) + ':' + (cutoff || '');
  }
  var cutoffCache = {fp: null, built: null};
  function ensure(){
    if(cutoff){
      // Rejeu : cache a part, pour ne pas jeter l'etat courant a chaque ligne.
      var src = cache.pinned ? cache.source : liveHistory();
      var cfp = (cache.pinned ? 'pinned:' + cache.serial : '') + fingerprint(src);
      if(cutoffCache.fp !== cfp || !cutoffCache.built){
        cutoffCache.built = build(src, dayNum(cutoff));
        cutoffCache.fp = cfp;
      }
      return cutoffCache.built;
    }
    if(cache.pinned && cache.built) return cache.built;
    var history = liveHistory();
    var fp = fingerprint(history);
    if(cache.fp === fp && cache.built) return cache.built;
    cache.built = build(history, null);
    cache.fp = fp;
    return cache.built;
  }

  // rebuild(results) : reconstruit TOUT l'etat, de facon pure et deterministe.
  // Sans argument : depuis le journal vivant (state.history). Avec un
  // argument (rejeu, test) : depuis ce journal-la, et l'etat y reste epingle
  // jusqu'au prochain rebuild() sans argument.
  api.rebuild = function(results){
    if(results === undefined){
      cache.pinned = false; cache.fp = null; cache.source = null;
      return summary(ensure());
    }
    cache.built = build(results, null);
    cache.fp = null;
    cache.pinned = true;
    cache.source = results;
    cache.serial++;
    return summary(cache.built);
  };
  // Construction pure, sans toucher au cache : sert au rejeu et aux tests.
  api.buildFrom = function(results, opts){
    opts = opts || {};
    var before = opts.before ? dayNum(opts.before) : null;
    var b = build(results, before);
    return {
      estimate: function(label, o){ return estimateFrom(b, label, o); },
      summary: function(){ return summary(b); }
    };
  };
  // Rejeu d'une suggestion passee (trace.js) : seules les mesures STRICTEMENT
  // anterieures a cette date comptent.
  api.withCutoff = function(date, fn){
    var prev = cutoff;
    cutoff = date ? String(date).slice(0, 10) : null;
    try{ return fn(); }
    finally{ cutoff = prev; }
  };

  function summary(b){
    var out = {observations: b.observations, skipped: b.skipped, movements: {}};
    Object.keys(b.states).sort().forEach(function(k){
      var st = b.states[k];
      out.movements[st.label] = {e1RM: Math.exp(st.x), sd: Math.sqrt(st.P), n: st.n, lastDate: st.lastDate};
    });
    return out;
  }

  // ─── Lecture ─────────────────────────────────────────────────────────────
  function estimateFrom(b, label, opts){
    opts = opts || {};
    var C = cfg();
    var key = keyOf(label);
    if(!key) return null;
    var asOf = dayNum(opts.asOf || todayStr());
    var st = b.states[key];
    var x, P, n, source, lastDate = null, prior = null;
    if(st && st.n > 0){
      x = st.x; P = (asOf !== null && asOf > st.day) ? predictP(st, asOf, C) : st.P;
      n = st.n; source = 'history'; lastDate = st.lastDate; prior = st.prior;
    }else{
      var pr = priorFor(labelOf(label), b.states, C);
      if(!pr) return null;
      x = pr.x; P = pr.P; n = 0; source = 'prior';
      prior = {source: pr.source, from: pr.from, ratio: pr.ratio, e1RM: Math.exp(pr.x)};
    }
    var sd = Math.sqrt(P);
    return {
      label: st ? st.label : labelOf(label),
      e1RM: Math.exp(x),
      low: Math.exp(x - Z95 * sd),
      high: Math.exp(x + Z95 * sd),
      sd: sd, n: n, source: source, lastDate: lastDate, prior: prior
    };
  }
  api.estimate = function(label, opts){
    try{ return estimateFrom(ensure(), label, opts); }catch(e){ return null; }
  };
  function loadForEstimate(est, reps, rpeTarget){
    if(!est || !(est.e1RM > 0)) return null;
    var C = cfg();
    var r = Math.max(1, Number(reps) || 1);
    var rpe = (rpeTarget === undefined || rpeTarget === null) ? C.targetRpe : Number(rpeTarget);
    return est.e1RM / (1 + (r + rirOf(rpe, C)) / 30);
  }
  // Charge NON arrondie pour `reps` a `rpeTarget` (8 par defaut). L'arrondi
  // reste le travail de data/equipment.js, en aval.
  api.loadFor = function(label, reps, rpeTarget, opts){
    return loadForEstimate(api.estimate(label, opts), reps, rpeTarget);
  };
  function weightForEstimate(est){
    var C = cfg();
    if(!est || est.source !== 'history' || est.n < C.minObs) return 0;
    if(!(C.sdMax > 0) || !(C.wMax > 0)) return 0;
    var w = C.wMax * (1 - est.sd / C.sdMax);
    return Math.max(0, Math.min(C.wMax, w));
  }
  // Poids du melange dans [0, wMax] : decroissant avec l'incertitude, nul
  // au-dela de sdMax, nul sous minObservations mesures, nul pour un a priori.
  api.weight = function(label, opts){
    return weightForEstimate(api.estimate(label, opts));
  };

  // ─── Pour la cascade de suggestion.js ────────────────────────────────────
  // Une seule lecture par suggestion, attachee a ctx.kalman. Tout est calcule
  // ici ; la cascade n'applique que ce qu'on lui donne.
  function round1(v){ return Math.round(v * 10) / 10; }
  api.forSuggestion = function(ctx){
    var m = mode();
    if(m === 'off' || !ctx || !ctx.label) return null;
    var est = api.estimate(ctx.label);
    if(!est) return {mode: m, estimate: null, target: null, weight: 0, testDay: false, gate: null};
    var C = cfg();
    var target = loadForEstimate(est, ctx.target, C.targetRpe);
    var weight = weightForEstimate(est);
    var oneRm = isOneRmTestContext(ctx.moveContext);
    return {
      mode: m,
      estimate: est,
      target: target,
      targetReps: Number(ctx.target) || 0,
      targetRpe: C.targetRpe,
      weight: weight,
      testDay: oneRm,
      gateLoad: (oneRm && weight > 0) ? C.gatePct * est.e1RM : null,
      gatePct: C.gatePct,
      // Lu par coachBrainApplyStatsGate en blend : la confiance vient de sd.
      gate: (est.source === 'history' && est.n >= C.minObs)
        ? {uncertain: est.sd > C.gateSd, sd: est.sd, target: target}
        : null
    };
  };

  // Melange d'une seance normale : suggested += w x (cible - suggested).
  // Place AVANT le saut max, les freins RPE, les plafonds et l'arrondi, qui
  // gardent le dernier mot. Calcule d'abord, ecrit ensuite : une exception
  // ne laisse jamais ctx a moitie modifie.
  function coachRuleKalmanBlend(ctx){
    var k = ctx && ctx.kalman;
    if(!k || k.mode !== 'blend' || k.testDay) return;
    if(ctx.contextLimited || ctx.isDeload) return;
    if(typeof isTechnicalMovementInContext === 'function' && isTechnicalMovementInContext(ctx.label, ctx.moveContext)) return;
    if(!(k.weight > 0) || !(k.target > 0) || !(ctx.suggested > 0)) return;
    var before = Number(ctx.suggested);
    var after = before + k.weight * (k.target - before);
    if(!isFinite(after) || Math.abs(after - before) < 0.5) return;
    var e = k.estimate;
    var reason = 'Kalman — capacite estimee ' + Math.round(e.e1RM) + ' lb (' + Math.round(e.low) + '-' + Math.round(e.high)
      + ') : ' + Math.round(k.target) + ' lb pour ' + k.targetReps + ' reps @RPE ' + k.targetRpe
      + ', melange a ' + Math.round(k.weight * 100) + ' % (' + Math.round(before) + ' → ' + Math.round(after) + ' lb). Les garde-fous gardent le dernier mot.';
    ctx.suggested = after;
    ctx.mode = 'nearest';
    ctx.reason = reason;
    ctx.brainAdjusted = true;
    k.applied = {kind: 'blend', before: before, after: after};
  }

  // Jour de test 1RM : porte = gatePct x e1RM. Placee APRES les freins de
  // derniere serie et le frein RPE recent — qui raisonnent sur des series de
  // meme plage de reps et tiendraient la porte d'un single a une charge de
  // travail — et AVANT le plancher, le plafond, les caps de surveillance et
  // de deload et l'arrondi, qui gardent le dernier mot. Un dernier RPE >= 9
  // continue d'interdire toute hausse (coachRuleRoundingAndMovementCap).
  // Les paliers et la consigne de montee au RPE restent ceux du programme.
  function coachRuleKalmanTestGate(ctx){
    var k = ctx && ctx.kalman;
    if(!k || k.mode !== 'blend' || !k.testDay || !(k.gateLoad > 0)) return;
    if(ctx.contextLimited || ctx.isDeload) return;
    var gate = Number(k.gateLoad);
    if(!isFinite(gate)) return;
    // Regle V51 conservee telle quelle : dernier RPE >= 9 = aucune hausse
    // automatique, porte comprise. Le frein deja pose garde sa raison.
    if(ctx.lastHasValidLoad && ctx.lastRpe >= 9 && gate > ctx.lastLoad) return;
    var e = k.estimate;
    var before = Number(ctx.suggested);
    var reason = 'Jour de test — 1RM estime ' + Math.round(e.e1RM) + ' (' + Math.round(e.low) + '-' + Math.round(e.high)
      + ') : porte a ' + Math.round(k.gatePct * 100) + ' %, soit ~' + Math.round(gate) + ' lb. Paliers et montee au RPE selon le programme.';
    ctx.suggested = gate;
    ctx.mode = 'down';
    ctx.reason = reason;
    // Une porte est une estimation, pas un frein : surveillance, sauf si une
    // regle a deja pose un niveau critique.
    ctx.severity = (ctx.severity === 'critical') ? ctx.severity : 'watch';
    ctx.brainAdjusted = true;
    k.applied = {kind: 'testGate', before: before, after: gate};
  }

  // ─── Explication (bouton (!)) ────────────────────────────────────────────
  // Une ligne, jamais un recalcul : elle relit ce que la suggestion a attache.
  api.explainLine = function(k){
    if(!k || !k.estimate) return '';
    var e = k.estimate;
    var pm = Math.round((e.high - e.low) / 2);
    var tag = e.source === 'prior'
      ? ' (a priori' + (e.prior && e.prior.from ? ' depuis ' + e.prior.from : '') + ', aucune mesure)'
      : ' (' + e.n + ' mesure' + (e.n > 1 ? 's' : '') + ')';
    if(k.mode === 'shadow'){
      return 'Capacite estimee (observation) : ' + Math.round(e.e1RM) + ' lb ± ' + pm + tag + '.';
    }
    var line = 'Capacite estimee : ' + Math.round(e.e1RM) + ' lb ± ' + pm + tag;
    if(k.applied && k.applied.kind === 'testGate') line += ' — porte du test a ' + Math.round(k.gatePct * 100) + ' %';
    else if(k.weight > 0) line += ' — poids du melange ' + Math.round(k.weight * 100) + ' %';
    else line += ' — trop incertaine pour peser sur la charge';
    return line + '.';
  };
  // Version serialisable, pour le journal et la trace.
  api.snapshot = function(k){
    if(!k) return null;
    var e = k.estimate;
    return {
      mode: k.mode,
      e1RM: e ? round1(e.e1RM) : null, low: e ? round1(e.low) : null, high: e ? round1(e.high) : null,
      sd: e ? Math.round(e.sd * 10000) / 10000 : null, n: e ? e.n : 0, source: e ? e.source : null,
      cible: (k.target > 0) ? round1(k.target) : null, repsCibles: k.targetReps || null,
      poids: Math.round((k.weight || 0) * 1000) / 1000, jourDeTest: !!k.testDay,
      porte: (k.gateLoad > 0) ? round1(k.gateLoad) : null,
      applique: k.applied ? {type: k.applied.kind, avant: round1(k.applied.before), apres: round1(k.applied.after)} : null
    };
  };

  // Audit d'une ligne : pourquoi elle compte, ou pas.
  api.explainRow = function(key, row){
    var o = observationFromRow(key, row, cfg());
    if(o.skip) return {retenue: false, raison: o.skip};
    return {retenue: true, e1RM: Math.exp(o.y), sd: o.sd, borneBasse: o.test};
  };

  window.coachRuleKalmanBlend = coachRuleKalmanBlend;
  window.coachRuleKalmanTestGate = coachRuleKalmanTestGate;
  api.ruleBlend = coachRuleKalmanBlend;
  api.ruleTestGate = coachRuleKalmanTestGate;
  api.ready = true;
})();

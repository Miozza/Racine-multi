// @ts-check
// Racine — Brain V2.1 mémoire locale.
// Objectif : Brain accumule une expérience par mouvement + intention, sans API externe.
// Stockage : localStorage isolé par profil actif. Aucun fichier data/*.json n'est modifié.

(function(){
  /** @type {any} — porte publique construite par assignations successives. */
  var api = window.CoachBrainMemory = window.CoachBrainMemory || {};
  // ATTENTION : VERSION fait partie de la CLE de stockage (voir storageKey()).
  // La changer orphelinerait toute la memoire deja accumulee. Le schema du
  // CONTENU evolue donc separement, via SCHEMA + migrateMemory() (CLAUDE.md §2.1).
  var VERSION = 'brain-memory-v1';
  var SCHEMA = 2;
  var MAX_JOURNAL = 120;
  // Fenetre glissante d'issues de prediction : c'est elle qui montre si Brain se
  // trompe DE MOINS EN MOINS. La precision a vie, elle, se fige avec le volume —
  // apres 200 predictions, dix bonnes seances recentes ne la deplacent plus.
  // 10 predictions testees ~= 1,5 a 2,5 mois sur un mouvement fait 1-2x/semaine.
  // A 20 la fenetre couvrait 3 a 5 mois : elle noyait le progres qu'elle est
  // censee montrer. Elle reste bruitee a ce volume, d'ou `precisionSample`
  // expose a cote pour qu'on lise le chiffre avec sa taille d'echantillon.
  var MAX_RECENT_OUTCOMES = 10;
  var MIN_RECENT_OUTCOMES = 5;   // en dessous, la fenetre ne veut rien dire
  var MAX_TREND_MONTHS = 24;

  function nowIso(){ try{return new Date().toISOString();}catch(e){return String(Date.now());} }
  function clamp(v,min,max){ v=Number(v); if(isNaN(v))v=min; return Math.max(min,Math.min(max,v)); }
  function num(v){ if(typeof v==='string'){ var m=v.replace(',', '.').match(/-?\d+(?:\.\d+)?/); return m?Number(m[0]):0; } var n=Number(v); return isNaN(n)?0:n; }
  function norm(label){
    try{ if(typeof coachNormalizeMoveText==='function') return coachNormalizeMoveText(label); }catch(e){}
    return String(label||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function storageKey(){
    try{
      if(window.CoachState && typeof CoachState.storageKeys==='function'){
        var k = CoachState.storageKeys();
        if(k && k.state) return k.state + '::' + VERSION;
      }
    }catch(e){}
    try{
      if(window.CoachProfiles && typeof CoachProfiles.activeStorageKeys==='function'){
        var pk = CoachProfiles.activeStorageKeys();
        if(pk && pk.state) return pk.state + '::' + VERSION;
      }
    }catch(e){}
    return 'racine::__pending__::' + VERSION;
  }
  function defaultMemory(){ return { version: VERSION, schema: SCHEMA, updatedAt: null, profiles: {}, journal: [] }; }
  // Migration ascendante, non destructive. Les profils d'avant le schema 2 n'ont
  // ni fenetre glissante ni courbe mensuelle : on les initialise VIDES plutot que
  // d'inventer un passe. La courbe demarre donc au premier resultat qui suit la
  // mise a jour — on ne peut pas la reconstruire, les issues par prediction
  // n'etaient pas stockees, seulement leurs totaux.
  function migrateMemory(data){
    if(!data || typeof data !== 'object') return data;
    var profiles = data.profiles || {};
    Object.keys(profiles).forEach(function(k){
      var p = profiles[k];
      if(!p || typeof p !== 'object') return;
      if(!Array.isArray(p.recentOutcomes)) p.recentOutcomes = [];
      if(!Array.isArray(p.precisionTrend)) p.precisionTrend = [];
    });
    data.schema = SCHEMA;
    return data;
  }
  function read(){
    try{
      var raw = localStorage.getItem(storageKey());
      if(!raw) return defaultMemory();
      var data = JSON.parse(raw);
      if(!data || typeof data !== 'object') return defaultMemory();
      data.version = data.version || VERSION;
      data.profiles = data.profiles || {};
      data.journal = Array.isArray(data.journal) ? data.journal : [];
      return migrateMemory(data);
    }catch(e){ return defaultMemory(); }
  }
  function write(mem){
    try{
      mem = mem || defaultMemory();
      mem.updatedAt = nowIso();
      localStorage.setItem(storageKey(), JSON.stringify(mem));
      return true;
    }catch(e){ return false; }
  }
  function keyFor(label,intent){ return norm(label) + '::' + String(intent || 'general'); }
  function profileTemplate(label,intent,sensitivity){
    return {
      label: String(label||''),
      intent: String(intent||'general'),
      sensitivity: sensitivity || 'medium',
      sessions: 0,
      testedPredictions: 0,
      successfulPredictions: 0,
      underPredictions: 0,
      overPredictions: 0,
      humanOverrideDown: 0,
      humanOverrideUp: 0,
      lastLoad: null,
      lastReps: null,
      lastRpe: null,
      lastDate: null,
      loadSteps: [],
      rpeValues: [],
      // Issues des MAX_RECENT_OUTCOMES dernieres predictions testees : 1 = reussie,
      // 0 = ratee. Donne la precision recente, celle qui bouge encore.
      recentOutcomes: [],
      // Un point par mois : {m:'2026-07', t:testees, s:reussies}. La precision du
      // mois vaut s/t — mesure propre a la periode, non diluee par le passe.
      precisionTrend: [],
      confidence: 0.50,
      precision: 0.60,
      ambition: 0.60,
      rpeReliability: 0.65,
      knowledge: 0.10,
      lastLearning: ''
    };
  }
  function monthKey(dateStr){
    var s = String(dateStr || '');
    var m = s.match(/^(\d{4})-(\d{2})/);
    if(m) return m[1] + '-' + m[2];
    try{
      var d = new Date();
      var mm = String(d.getMonth() + 1); if(mm.length < 2) mm = '0' + mm;
      return d.getFullYear() + '-' + mm;
    }catch(e){ return '0000-00'; }
  }
  function recordMonthlyPoint(p, dateStr, ok){
    var key = monthKey(dateStr);
    var trend = Array.isArray(p.precisionTrend) ? p.precisionTrend : [];
    var last = trend.length ? trend[trend.length - 1] : null;
    if(last && last.m === key){
      last.t = (last.t || 0) + 1;
      if(ok) last.s = (last.s || 0) + 1;
    }else{
      trend.push({ m: key, t: 1, s: ok ? 1 : 0 });
    }
    p.precisionTrend = trend.slice(-MAX_TREND_MONTHS);
  }
  // Precision de la fenetre glissante. `null` tant qu'il n'y a pas assez de
  // predictions testees : mieux vaut pas de chiffre qu'un chiffre sur deux points.
  function recentPrecision(p){
    var out = (p && Array.isArray(p.recentOutcomes)) ? p.recentOutcomes : [];
    if(out.length < MIN_RECENT_OUTCOMES) return null;
    var sum = 0;
    for(var i = 0; i < out.length; i++) sum += Number(out[i]) ? 1 : 0;
    return Math.round((sum / out.length) * 100) / 100;
  }
  function getProfile(label,intent){
    var mem = read();
    return mem.profiles[keyFor(label,intent)] || null;
  }
  function computeDerived(p){
    var precision = p.testedPredictions ? (p.successfulPredictions / p.testedPredictions) : 0.60;
    var knowledge = clamp((p.sessions || 0) / 12, 0.10, 1);
    var rpeRel = 0.65;
    try{
      if(typeof coachBrainRpeReliability === 'function'){
        var rows = (p.rpeValues || []).map(function(r){ return {rpe:r}; });
        rpeRel = coachBrainRpeReliability(rows).score;
      }
    }catch(e){}
    var confidence = 0.45 + knowledge * 0.25 + (precision - 0.60) * 0.30;
    if(p.sensitivity === 'high') confidence -= 0.10;
    if(p.underPredictions > p.overPredictions) confidence -= 0.04;
    confidence = clamp(confidence, 0.25, 0.96);

    var ambition = 0.60;
    if(p.overPredictions > 0) ambition += Math.min(0.16, p.overPredictions * 0.035);
    if(p.humanOverrideUp > 0) ambition += Math.min(0.14, p.humanOverrideUp * 0.035);
    if(p.underPredictions > 0) ambition -= Math.min(0.18, p.underPredictions * 0.05);
    if(p.humanOverrideDown > 1) ambition -= Math.min(0.10, (p.humanOverrideDown-1) * 0.025);
    if(p.sensitivity === 'high') ambition -= 0.06;
    ambition = clamp(ambition, 0.25, 0.95);

    p.precision = Math.round(precision * 100) / 100;
    p.knowledge = Math.round(knowledge * 100) / 100;
    p.rpeReliability = Math.round(rpeRel * 100) / 100;
    p.confidence = Math.round(confidence * 100) / 100;
    p.ambition = Math.round(ambition * 100) / 100;
    return p;
  }
  function updateFromResult(label,result,sessionMeta){
    result = result || {};
    var planned = result.planned || {};
    var context = planned.context || result.context || {};
    var targetReps = num(planned.reps || planned.targetMin || result.reps);
    var intent = (typeof coachBrainIntentKey === 'function') ? coachBrainIntentKey(context,targetReps) : 'general';
    var sensitivity = (typeof coachBrainSensitivity === 'function') ? coachBrainSensitivity(label,context) : 'medium';
    var usedLoad = num(result.load);
    var usedReps = num(result.reps);
    var usedRpe = num(result.rpe);
    var plannedLoad = num(planned.load);
    var plannedReps = num(planned.reps || planned.targetMin || targetReps);
    if(!usedReps && !(usedLoad>0)) return null;
    // Les WOD texte, core sans charge, etc. ne nourrissent pas la mémoire de charge.
    if(!(usedLoad>0 || (planned && planned.bodyweightMovement))) return null;

    var mem = read();
    var k = keyFor(label,intent);
    var p = mem.profiles[k] || profileTemplate(label,intent,sensitivity);
    p.label = p.label || String(label||'');
    p.intent = intent;
    p.sensitivity = sensitivity;
    p.sessions += 1;

    var learning = [];
    if(p.lastLoad !== null && usedLoad > 0 && usedLoad !== p.lastLoad){
      var step = Math.round((usedLoad - p.lastLoad) * 10) / 10;
      p.loadSteps = (p.loadSteps || []).concat([step]).slice(-12);
    }
    if(usedRpe > 0) p.rpeValues = (p.rpeValues || []).concat([usedRpe]).slice(-24);

    if(plannedLoad > 0 && usedLoad > 0){
      if(Math.abs(usedLoad - plannedLoad) <= 0.01){
        p.testedPredictions += 1;
        var predictionOk = (!plannedReps || usedReps >= plannedReps);
        if(predictionOk){ p.successfulPredictions += 1; learning.push('prediction_testee_reussie'); }
        if(plannedReps && usedReps < plannedReps){ p.underPredictions += 1; learning.push('prediction_trop_ambitieuse'); }
        if(plannedReps && usedReps >= plannedReps + 2){ p.overPredictions += 1; learning.push('prediction_trop_prudente'); }
        // Fenetre glissante + point du mois : les deux seules mesures qui
        // montrent une amelioration. Elles n'entrent PAS dans la decision de
        // charge — ce sont des instruments, pas une nouvelle regle de moteur.
        p.recentOutcomes = (p.recentOutcomes || []).concat([predictionOk ? 1 : 0]).slice(-MAX_RECENT_OUTCOMES);
        recordMonthlyPoint(p, sessionMeta && sessionMeta.date, predictionOk);
      }else if(usedLoad < plannedLoad){
        p.humanOverrideDown += 1; learning.push('proposition_non_testee_charge_baissee');
      }else if(usedLoad > plannedLoad){
        p.humanOverrideUp += 1; learning.push('athlete_plus_ambitieux_que_brain');
      }
    }

    p.lastLoad = usedLoad;
    p.lastReps = usedReps || null;
    p.lastRpe = usedRpe || null;
    p.lastDate = (sessionMeta && (sessionMeta.date || sessionMeta.actualDate)) || nowIso().slice(0,10);
    p.lastLearning = learning.join(', ') || 'observation_enregistree';
    computeDerived(p);
    mem.profiles[k] = p;
    mem.journal = (mem.journal || []).concat([{date: nowIso(), movement: String(label||''), intent: intent, plannedLoad: plannedLoad || null, plannedReps: plannedReps || null, usedLoad: usedLoad || null, usedReps: usedReps || null, rpe: usedRpe || null, learning: p.lastLearning, confidence: p.confidence, precision: p.precision, ambition: p.ambition}]).slice(-MAX_JOURNAL);
    write(mem);
    return p;
  }
  function updateFromSessionResults(results,sessionMeta){
    var updated = [];
    Object.keys(results || {}).forEach(function(label){
      var p = updateFromResult(label, results[label], sessionMeta || {});
      if(p) updated.push(p);
    });
    return updated;
  }
  function enrichStats(stats){
    if(!stats) return stats;
    var p = getProfile(stats.label, stats.intent);
    if(!p) return stats;
    stats.memory = {
      sessions: p.sessions,
      confidence: Math.round((p.confidence || 0) * 100),
      precision: Math.round((p.precision || 0) * 100),
      ambition: Math.round((p.ambition || 0) * 100),
      knowledge: Math.round((p.knowledge || 0) * 100),
      rpeReliability: Math.round((p.rpeReliability || 0) * 100),
      lastLearning: p.lastLearning || '',
      // Instruments de suivi, jamais d'entree dans le calcul de charge :
      // precisionRecent = fenetre glissante (null tant qu'elle n'est pas
      // significative), trend = un point par mois.
      precisionRecent: (function(){ var r = recentPrecision(p); return r === null ? null : Math.round(r * 100); })(),
      precisionSample: (p.recentOutcomes || []).length,
      precisionTrend: (p.precisionTrend || []).map(function(pt){
        return { month: pt.m, tested: pt.t || 0, precision: pt.t ? Math.round((pt.s / pt.t) * 100) : null };
      })
    };
    // Fusion prudente : la mémoire influence, mais ne remplace pas l'analyse immédiate.
    stats.confidenceRaw = clamp((stats.confidenceRaw * 0.70) + ((p.confidence || 0.50) * 0.30), 0.25, 0.96);
    stats.ambitionRaw = clamp((stats.ambitionRaw * 0.70) + ((p.ambition || 0.60) * 0.30), 0.25, 0.95);
    stats.confidence = Math.round(stats.confidenceRaw * 100);
    stats.ambition = Math.round(stats.ambitionRaw * 100);
    if((p.precision || 0.60) < 0.55) stats.requiredConfirmations = Math.max(stats.requiredConfirmations || 1, 3);
    if((p.knowledge || 0) >= 0.75 && (p.precision || 0) >= 0.85 && stats.sensitivity !== 'high'){
      stats.requiredConfirmations = Math.max(1, (stats.requiredConfirmations || 1) - 1);
    }
    return stats;
  }
  function exportSummary(){
    var mem = read();
    var profiles = Object.keys(mem.profiles || {}).map(function(k){ return mem.profiles[k]; });
    profiles.sort(function(a,b){ return (b.sessions||0)-(a.sessions||0); });
    return { version: mem.version, updatedAt: mem.updatedAt, count: profiles.length, profiles: profiles, journal: mem.journal || [] };
  }
  function clear(){ return write(defaultMemory()); }

  api.read = read;
  api.write = write;
  api.getProfile = getProfile;
  api.updateFromResult = updateFromResult;
  api.updateFromSessionResults = updateFromSessionResults;
  api.enrichStats = enrichStats;
  api.recentPrecision = recentPrecision;
  // Courbe d'apprentissage tous mouvements confondus : « est-ce que Brain se
  // trompe moins qu'il y a deux mois ? ». Agrege les points mensuels de tous les
  // profils, du plus ancien au plus recent.
  api.precisionTrend = function(){
    var mem = read();
    var byMonth = {};
    Object.keys(mem.profiles || {}).forEach(function(k){
      ((mem.profiles[k] || {}).precisionTrend || []).forEach(function(pt){
        if(!pt || !pt.m) return;
        var b = byMonth[pt.m] || (byMonth[pt.m] = { month: pt.m, tested: 0, success: 0 });
        b.tested += Number(pt.t) || 0;
        b.success += Number(pt.s) || 0;
      });
    });
    return Object.keys(byMonth).sort().map(function(m){
      var b = byMonth[m];
      return { month: m, tested: b.tested, precision: b.tested ? Math.round((b.success / b.tested) * 100) : null };
    });
  };
  api.exportSummary = exportSummary;
  api.clear = clear;
})();

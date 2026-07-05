// Racine V1.11 — CoachML
// Étape 1 : collecte silencieuse uniquement.
// Le moteur de charges N'EST PAS modifié.
// getCorrectionFactor() retourne toujours 1.0 — aucun effet sur les suggestions.
// L'entraînement brain.js est préparé mais pas activé.
// Activation réelle : étape future après validation terrain.

(function(){
  var api = {};
  var MIN_SESSIONS_TO_TRAIN = 30;
  var trainingData = []; // vecteurs accumulés

  // ─── Encodage groupe musculaire 0.0–1.0 ──────────────────────────────────
  var MUSCLE_MAP = {
    'chest': 0.1, 'pec': 0.1,
    'back': 0.2, 'row': 0.2, 'pull': 0.2,
    'shoulder': 0.3, 'press': 0.3, 'delt': 0.3,
    'squat': 0.4, 'leg': 0.4, 'lunge': 0.4, 'split': 0.4,
    'hinge': 0.5, 'deadlift': 0.5, 'rdl': 0.5,
    'arm': 0.6, 'curl': 0.6, 'tricep': 0.6, 'bicep': 0.6,
    'core': 0.7, 'carry': 0.7,
    'wod': 0.8, 'cardio': 0.8
  };

  function encodeMuscle(label){
    var n = String(label || '').toLowerCase();
    var keys = Object.keys(MUSCLE_MAP);
    for(var i = 0; i < keys.length; i++){
      if(n.indexOf(keys[i]) >= 0) return MUSCLE_MAP[keys[i]];
    }
    return 0.5;
  }

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function num(v){ return Number(v) || 0; }

  // ─── Compter séances dans l'historique actif ─────────────────────────────
  function sessionCount(){
    return (window.state && Array.isArray(window.state.history))
      ? window.state.history.length : 0;
  }

  // ─── Construire le vecteur d'entrée normalisé ─────────────────────────────
  // Tous les inputs entre 0 et 1.
  function buildVector(movementLabel, opts){
    opts = opts || {};
    return {
      ratioUsed:   clamp((num(opts.ratioUsed)   || 1.0) - 0.5, 0, 1),   // 0.5–1.5 → 0–1
      rpeReal:     clamp((num(opts.rpeReal)      || 8)   / 10,  0, 1),
      rpePrev:     clamp((num(opts.rpePrev)      || 8)   / 10,  0, 1),
      daysSince:   clamp((num(opts.daysSince)    || 3)   / 14,  0, 1),
      systemicAvg: clamp((num(opts.systemicAvg)  || 8)   / 10,  0, 1),
      muscle:      encodeMuscle(movementLabel)
    };
  }

  // ─── API publique ─────────────────────────────────────────────────────────

  // Toujours 1.0 pour l'instant — moteur inchangé.
  api.getCorrectionFactor = function(){ return 1.0; };

  // Enregistrer un vecteur après chaque séance sauvegardée.
  // Le facteur réel = ce que l'athlète a vraiment fait vs ce qui était suggéré.
  api.recordTrainingVector = function(movementLabel, opts, actualFactor){
    if(!window.brain) return; // brain.js pas chargé = silencieux
    var input  = buildVector(movementLabel, opts);
    // Normalise le facteur réel 0.7–1.3 → 0–1
    var output = { 0: clamp((num(actualFactor) - 0.7) / 0.6, 0, 1) };
    trainingData.push({ input: input, output: output });
    // Entraîner en batch silencieux si assez de données
    if(trainingData.length >= 20 && sessionCount() >= MIN_SESSIONS_TO_TRAIN){
      api.trainSilent();
    }
  };

  // Entraînement silencieux — ne bloque jamais l'UI.
  api.trainSilent = function(){
    if(!window.brain || trainingData.length < 10) return;
    try{
      if(!api._net){
        api._net = new brain.NeuralNetwork({
          hiddenLayers: [4, 4],
          activation: 'sigmoid',
          learningRate: 0.1
        });
      }
      api._net.train(trainingData, {
        iterations: 300,
        errorThresh: 0.01,
        log: false,
        silent: true
      });
      trainingData = [];
      if(window.CoachLog) CoachLog.log('ml_train', 'Modele entraine silencieusement. Sessions: ' + sessionCount());
    }catch(e){
      // silencieux — jamais de crash
    }
  };

  // Sérialiser pour export profil.
  api.exportModel = function(){
    if(!api._net) return null;
    try{ return api._net.toJSON(); }catch(e){ return null; }
  };

  // Restaurer depuis import profil.
  api.loadModel = function(json){
    if(!json || !window.brain) return;
    try{
      api._net = new brain.NeuralNetwork({ hiddenLayers:[4,4], activation:'sigmoid' });
      api._net.fromJSON(json);
    }catch(e){ api._net = null; }
  };

  // Statut lisible — affiché dans vue PC plus tard.
  api.status = function(){
    var count = sessionCount();
    if(!window.brain){
      return { active: false, label: 'Brain.js non chargé', sessionCount: count };
    }
    if(count < MIN_SESSIONS_TO_TRAIN){
      return {
        active: false,
        label: 'Collecte — ' + count + '/' + MIN_SESSIONS_TO_TRAIN + ' séances',
        sessionCount: count,
        threshold: MIN_SESSIONS_TO_TRAIN
      };
    }
    if(!api._net){
      return { active: false, label: 'Données collectées, modèle en attente', sessionCount: count };
    }
    return { active: true, label: 'Modèle actif — ' + count + ' séances', sessionCount: count };
  };

  window.CoachML = api;
})();

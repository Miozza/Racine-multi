// Coach Beurt V51.63 — extraction prudente moteur de charges.
// Script global volontaire : pas de ES modules, pas de changement de comportement.

function chargeKeyFromName(n){return String(n||"").replace(/^[A-Z][0-9]?\.\s*/,"").trim();}

function officialCharges(){return window.DEFAULT_CHARGES||{};}

function charge(name,fallback){
  var key=chargeKeyFromName(name);
  var c=customCharges[key];
  if(c!==undefined&&String(c).trim()!=="")return String(c).trim();
  var o=officialCharges()[key];
  if(o!==undefined&&String(o).trim()!=="")return String(o).trim();
  return fallback||"—";
}

function displayChargeText(t){
  t=String(t||"");
  t=t.replace(/Wall Ball 14 lb/g,"Wall Ball "+charge("Wall Ball","14 lb"));
  t=t.replace(/wall balls 14 lb/g,"wall balls "+charge("Wall Ball","14 lb"));
  t=t.replace(/Wall balls 14 lb/g,"Wall balls "+charge("Wall Ball","14 lb"));
  return t;
}

function chargeList(){
  var defs=officialCharges(),order=window.CHARGE_ORDER||Object.keys(defs),seen={},list=[];
  order.forEach(function(k){if(defs[k]!==undefined&&!seen[k]){seen[k]=true;list.push(k);}});
  Object.keys(defs).forEach(function(k){if(!seen[k]){seen[k]=true;list.push(k);}});
  return list;
}


// ─── Athlete State : force actuelle durable par mouvement ─────────────────────

// ─── Nettoyage charges invraisemblables ───────────────────────────────────────
// Appelé une fois au boot. Retire de state.history et state.movementRefs
// toutes les charges < 15 lb ET < 20% du seed par défaut du mouvement.
// Protège contre les erreurs de saisie (ex: 5 lb au lieu de 50 lb).
// Ne modifie jamais data/resultats.json — seulement la copie state en mémoire.
function coachSanitizeImplausibleLoads(){
  if(!window.state) return;
  var cleaned = 0;

  // 1. Nettoyer state.history — retire les charges aberrantes des résultats
  if(Array.isArray(state.history)){
    state.history.forEach(function(session){
      var results = session.results || {};
      Object.keys(results).forEach(function(key){
        var r = results[key];
        var load = Number(r && r.load) || 0;
        if(!load || load <= 0) return;
        var seed = (typeof coachDefaultLoadSeedForMovement === 'function')
          ? coachDefaultLoadSeedForMovement(key, 8) : null;
        if(load < 15 && seed && load < seed * 0.20){
          if(typeof coachLogWarn === 'function') coachLogWarn('sanitize', key + ' : ' + load + ' lb supprime (seed=' + seed + ')');
          delete r.load;
          cleaned++;
        }
      });
    });
  }

  // 2. Nettoyer state.movementRefs — retire les références aberrantes
  if(state.movementRefs && typeof state.movementRefs === 'object'){
    Object.keys(state.movementRefs).forEach(function(refKey){
      var ref = state.movementRefs[refKey];
      var load = Number(ref && ref.load) || 0;
      if(!load || load <= 0) return;
      var movName = (ref && ref.movement) || refKey;
      var seed = (typeof coachDefaultLoadSeedForMovement === 'function')
        ? coachDefaultLoadSeedForMovement(movName, 8) : null;
      if(load < 15 && seed && load < seed * 0.20){
        if(typeof coachLogWarn === 'function') coachLogWarn('sanitize_ref', movName + ' ref : ' + load + ' lb supprimee (seed=' + seed + ')');
        delete state.movementRefs[refKey];
        cleaned++;
      }
    });
  }

  if(cleaned > 0){
    if(typeof save === 'function') save();
    if(typeof coachLogWarn === 'function') coachLogWarn('sanitize_total', cleaned + ' entree(s) invraisemblable(s) nettoyee(s) au boot.');
  }
}
window.coachSanitizeImplausibleLoads = coachSanitizeImplausibleLoads;

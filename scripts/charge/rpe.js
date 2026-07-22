// Coach Beurt V51.63 — extraction prudente moteur de charges.
// Script global volontaire : pas de ES modules, pas de changement de comportement.

function repRange(reps){reps=Number(reps)||0;if(reps<=5)return"strength";if(reps<=12)return"hypertrophy";return"endurance";}

function repRangeLabel(r){return r==="strength"?"1–5 reps":r==="hypertrophy"?"6–12 reps":"13+ reps";}

function getRpeAdjustment(mvKey, reps){
  var rpeKey = refKey(mvKey, reps);
  var hist = state.rpeHistory[rpeKey];
  var name=(movements[mvKey]&&movements[mvKey].name)||mvKey;
  if(isTechnicalMovement(name))return {adj:0,signal:"technique",arrow:"",color:"var(--yellow)",msg:"Technique : pas d’auto-progression."};
  if(!hist||!hist.length) return { adj:0, signal:"normal", arrow:"" };
  var last=Number(hist[hist.length-1])||0;
  if(last>=9.5)return { adj:0, signal:"deload", arrow:"⚠", color:"var(--red)", msg:"RPE très élevé : hausse bloquée." };
  if(last>=9)return { adj:0, signal:"hard", arrow:"→", color:"var(--yellow)", msg:"Maintien : dernier RPE ≥ 9." };
  if(isIsolationMovement(name)&&last>=8.5)return { adj:0, signal:"isolation_hard", arrow:"→", color:"var(--yellow)", msg:"Isolation RPE ≥ 8.5 : maintien." };
  if(hist.length<2) return { adj:0, signal:"normal", arrow:"" };
  var last2 = hist.slice(-2);
  var avg = (last2[0]+last2[1])/2;
  if(avg<=7)  return { adj:+5,  signal:"easy",    arrow:"↑", color:"var(--green)",  msg:"+5 lb possible (RPE facile)" };
  return              { adj:0,   signal:"normal",  arrow:"",  color:"",              msg:"" };
}

function checkDeloadAlert(){
  // Si 3+ mouvements principaux ont RPE ≥ 9 sur 2 séances consécutives → alerte globale
  var mainMvKeys = Object.keys(movements).filter(function(k){ return movements[k].profile; });
  var highRpeCount = 0;
  // Certains programmes (exercices structurés, ou cycle indisponible → focus()
  // renvoie {}) n'ont pas de tableau targetReps : garder l'accès défensif pour
  // ne pas planter la sauvegarde de séance. rng est le même à chaque itération.
  var tr = focus().targetReps;
  var rng = repRange((tr && tr[weekIdx()]) || 8);
  mainMvKeys.forEach(function(k){
    var rpeKey = k+"__"+rng;
    var hist = state.rpeHistory[rpeKey];
    if(hist&&hist.length>=2&&hist.slice(-2).every(function(r){return r>=9;})) highRpeCount++;
  });
  state.deloadAlert = highRpeCount >= 2;
  save();
}

// ─── Résumé post-séance ───────────────────────────────────────────────────────

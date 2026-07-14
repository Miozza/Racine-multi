// Racine séances détaillées extraites de app.js
// app.js doit rester le moteur; ce fichier contient la construction des workouts.

// Racine moteur générique de construction des workouts
// Les programmes autonomes peuvent exposer cfg.getBlocks(day, week).

function ex(name,format,load,rest,note){return{name:name,format:format,load:charge(name,load||"—"),rest:rest||"—",note:note||""};}
function exFixed(name,format,load,rest,note){return{name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

// Libellé de jour variable par semaine (cycles où un même jour porte une
// séance différente selon la semaine) : le programme peut fournir
// getDayLabel(day, week). Point d'accès unique — app.js (currentDayMeta,
// previewDayMeta, programDetailsHtml) et buildWorkout() partagent cette
// résolution pour ne pas diverger sur ce qu'affiche chaque vue.
function resolveDayLabel(cfg, day, week, fallbackLabel){
  if(cfg && typeof cfg.getDayLabel === "function"){
    var wl = cfg.getDayLabel(day, Number(week) || 1);
    if(wl) return wl;
  }
  return fallbackLabel;
}

// ─── Construction WOD ────────────────────────────────────────────────────────

function buildWorkout(day,week){
  var cfg=focus();
  var d=baseDays[day] || {label:day,base:"",focus:""};
  if(cfg && cfg.dayMeta && cfg.dayMeta[day]) d = Object.assign({}, d, cfg.dayMeta[day]);
  d = Object.assign({}, d, {label: resolveDayLabel(cfg, day, week, d.label)});

  // aucun fallback PPL silencieux.
  // Si un programme actif ne fournit pas getBlocks(), on affiche une erreur claire
  // au lieu d'inventer une séance Push/Pull/Legs générique.
  if(cfg && typeof cfg.getBlocks === "function"){
    var blocks=[];
    try{ blocks = cfg.getBlocks(day,week) || []; }
    catch(e){
      blocks = [{
        time:"—",title:"Erreur programme",tag:"Erreur",kind:"error",
        text:"Le programme actif a planté pendant la construction de la séance : "+(e&&e.message?e.message:e)
      }];
    }
    if(!blocks.length){
      blocks = [{time:"—",title:"Programme vide",tag:"Erreur",kind:"error",text:"Aucun bloc retourné par le programme actif."}];
    }
    var w = {day:d, blocks:blocks, progress:[]};
    // Remplacements de mouvements du profil actif (scripts/profiles/swaps.js),
    // appliqués ici — l'entonnoir unique de toutes les vues. La logique vit
    // dans le domaine profils, pas dans programs/.
    if(window.RacineMovementSwaps && RacineMovementSwaps.applyToWorkout) w = RacineMovementSwaps.applyToWorkout(w);
    return w;
  }

  return {
    day:d,
    blocks:[{
      time:"—",
      title:"Programme incomplet ou non chargé",
      tag:"Erreur",
      kind:"error",
      text:"Le cycle actif ne fournit pas de getBlocks(day, week). L'app refuse maintenant le fallback Push/Pull/Legs pour éviter de te faire suivre le mauvais entraînement. Vérifie que le fichier du programme est bien chargé et que le cache iPhone est à jour."
    }],
    progress:[]
  };
}

function cycleRules(){
  var cfg = focus();
  if(cfg && cfg.cycleRules && cfg.cycleRules.length) return cfg.cycleRules;
  return["Aucun échec sur les mouvements principaux.","Technique propre avant intensité.","Si douleur articulaire : baisse la charge, garde l'amplitude propre."];
}
function dayIntention(day){
  var cfg = focus();
  if(cfg && cfg.dayIntentions && cfg.dayIntentions[day]) return cfg.dayIntentions[day];
  return"Qualité avant intensité.";
}

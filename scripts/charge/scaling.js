// Racine — mise à l'échelle des charges par utilisateur.
// Script global volontaire : pas de ES modules. Charge après mouvements.js et
// avant suggestion.js. N'altère jamais le moteur lui-même : il transforme
// uniquement le nombre brut déclaré par un programme (ex. "235 lb") avant que
// guardedSuggestedLoadDecision() ne s'en empare. Tout l'historique réel d'un
// utilisateur (ses propres séries loggées) n'est jamais re-multiplié : c'est
// déjà sa réalité, pas une référence générique de programme.

// Trouve le ratio personnel pour un mouvement donné. Retourne 1 si aucun
// profil calibré n'est actif (ex. migration d'un ancien historique brut).
function coachProfileNeedsCalibration(){
  var profile = (typeof state !== 'undefined' && state) ? state.profile : null;
  if(!profile) return false;
  return !profile.onboarded || !profile.scaleRatios;
}

function coachUserLoadRatio(label){
  var profile = (typeof state !== 'undefined' && state) ? state.profile : null;
  var ratios = profile && profile.scaleRatios;
  if(!ratios) return 1;

  // 1. Correspondance directe avec l'un des 12 mouvements de référence
  //    (mêmes clés que defaultProfile / PR_FIELD_MAP, définis dans app.js).
  if(typeof PR_FIELD_MAP === 'object' && typeof prCfgMatchesResult === 'function'){
    var ids = Object.keys(PR_FIELD_MAP);
    for(var i=0;i<ids.length;i++){
      var cfg = PR_FIELD_MAP[ids[i]];
      if(cfg && cfg.profile && prCfgMatchesResult(cfg, label)){
        var direct = ratios[cfg.profile];
        if(direct || direct === 0) return direct;
      }
    }
  }

  // 2. Repli par famille de mouvement pour tout ce qui n'est pas un des 12
  //    mouvements de référence (accessoires, variantes, isolation...).
  var n = coachNormalizeMoveText(label);
  var fam = null;
  if(/clean|snatch|jerk/.test(n)) fam = ratios._olympic;
  else if(/rdl|romanian|deadlift|hip thrust|good morning|hyperextension|hip abduction|pull through/.test(n)) fam = ratios._hinge;
  else if(/squat|lunge|step up|leg press|calf|bulgarian/.test(n)) fam = ratios._lowerBody;
  else if(/row|pull up|pulldown|curl|face pull|rear delt|lat |shrug/.test(n)) fam = ratios._upperPull;
  else if(/press|push up|pushup|dip|fly|chest/.test(n)) fam = ratios._upperPush;
  if(fam || fam === 0) return fam;
  return (ratios._overall || ratios._overall === 0) ? ratios._overall : 1;
}

// Applique le ratio personnel à une charge générique (programme ou repère
// d'équipement), puis arrondit au pas d'équipement le plus proche.
function coachApplyUserLoadScale(label, value){
  var num = Number(value);
  if(isNaN(num)) return value;
  var ratio = (typeof coachUserLoadRatio === 'function') ? coachUserLoadRatio(label) : 1;
  if(!ratio || ratio === 1) return num;
  var scaled = num * ratio;
  var rounded = (typeof roundLoadForExercise === 'function') ? roundLoadForExercise(label, scaled, 'nearest') : Math.round(scaled);
  return (rounded || rounded === 0) ? rounded : Math.round(scaled);
}

// Facteur d'agressivité de progression du profil actif (0.4–1.8, 1 = comportement
// historique de l'app). N'affecte JAMAIS les freins de
// sécurité RPE >= 9 : seulement la taille des sauts de charge proposés.
function coachAggressivenessFactor(){
  var profile = (typeof state !== 'undefined' && state) ? state.profile : null;
  var a = profile && Number(profile.aggressiveness);
  if(!a || isNaN(a)) return 1;
  return Math.max(0.4, Math.min(1.8, a));
}


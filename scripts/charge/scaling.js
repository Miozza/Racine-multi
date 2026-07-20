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
  var registered = (typeof CoachProfiles !== 'undefined' && CoachProfiles && typeof CoachProfiles.getActive === 'function')
    ? CoachProfiles.getActive()
    : null;
  if(registered && registered.onboarded === false) return true;
  if(!registered && profile.onboarded === false) return true;
  // Un profil onboardé (registre ou state) peut avoir perdu sa copie locale de
  // scaleRatios (migration partielle, state namespacé désynchronisé du registre).
  // Le registre reste la source qui a survécu à l'onboarding réel : on
  // resynchronise au lieu de bloquer un profil déjà calibré une fois.
  if(!profile.scaleRatios && registered && registered.scaleRatios){
    profile.scaleRatios = registered.scaleRatios;
    if(typeof save === 'function'){ try{ save(); }catch(e){} }
  }
  return !profile.scaleRatios;
}

// Bande de vraisemblance d'un ratio appliqué à une charge de programme.
// Les clés de profil mélangent des échelles absolues différentes (barre,
// haltère « par main », lest de traction) : une valeur saisie à la mauvaise
// échelle produit un ratio énorme qui multiplie ensuite toutes les charges
// de programme concernées (cas réel : dbRdl saisi à l'échelle barre → _hinge
// ≈ 2.45 → Deadlift 245 lb suggéré à 600 lb). Aucun client réel ne vaut plus
// de ~1.6× l'athlète de référence ni moins de ~0.25× sur un mouvement : hors
// bande, on borne et on journalise. Le clamp peut sous-suggérer un cas
// extrême légitime (ex. traction très lestée) : direction sûre — l'historique
// loggé reprend la main dès les premières séances. Protège aussi les ratios
// déjà STOCKÉS corrompus (profils calibrés avant ce garde-fou).
var COACH_SCALE_RATIO_MIN = 0.25;
var COACH_SCALE_RATIO_MAX = 1.6;
function coachClampScaleRatio(ratio, label, sourceKey){
  ratio = Number(ratio);
  if(!(ratio > 0)) return 1;
  if(ratio >= COACH_SCALE_RATIO_MIN && ratio <= COACH_SCALE_RATIO_MAX) return ratio;
  var clamped = Math.max(COACH_SCALE_RATIO_MIN, Math.min(COACH_SCALE_RATIO_MAX, ratio));
  try{
    if(typeof window !== 'undefined' && window.CoachLog && CoachLog.warn){
      CoachLog.warn('scale_ratio_clamped', {movement:String(label||''), source:String(sourceKey||''), ratio:ratio, clamped:clamped});
    }
  }catch(e){}
  return clamped;
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
        // direct > 0 : un ratio 0 stocké (donnée corrompue d'une version
        // antérieure) n'est pas « ne pas scaler » — on le traite comme absent
        // et on retombe sur la famille puis _overall.
        if(direct > 0) return coachClampScaleRatio(direct, label, cfg.profile);
        break;
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
  if(fam > 0) return coachClampScaleRatio(fam, label, 'famille');
  return (ratios._overall > 0) ? coachClampScaleRatio(ratios._overall, label, '_overall') : 1;
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



// @ts-check
// scripts/charge/ceiling.js
// Racine — plafond de progression DEDUIT, par famille de mouvement.
//
// Le moteur savait ralentir une progression ; il ne savait pas l'arreter.
// Chaque reglage existant porte une VITESSE (saut maximal prudent, barreaux
// RPE, amortissement du portail Brain, biais de vitesse du profil) et aucun
// ne porte d'ASYMPTOTE. Consequence : un mouvement d'isolation joue a RPE
// bas gagne un cran par seance sans fin, alors qu'il plafonne pour de bon
// bien avant une barre lourde. Une progression lente et une progression
// terminee ne sont pas la meme chose.
//
// Principe, non negociable : le plafond ne se DECLARE pas en livres. Ce
// chiffre appartient a l'athlete, pas au code — ecrire « Lateral Raise : 45
// lb » ici, ce serait livrer le plafond du createur a tout le monde. Il se
// DEDUIT de deux signaux qui doivent tenir ensemble :
//   1. la pointe ne bouge plus depuis assez de seances comparables ;
//   2. elle coute cher (assez de series au palier a RPE eleve).
// Une pointe stable sans effort eleve n'est pas un plafond, c'est un
// programme qui n'a pas encore demande plus. Un effort eleve sans stagnation
// non plus, c'est une seance dure — les freins RPE s'en occupent deja.
//
// Ce qui se deduit d'un comportement doit se defaire quand le comportement
// change : des que la derniere serie au palier redescend nettement en RPE,
// le plafond tombe (`releaseRpeDrop`). Un plafond manuel, lui, est un geste
// explicite de l'admin (panneau Calibration du moteur) et s'applique sans
// historique.
//
// Tous les seuils vivent dans COACH_MOVEMENT_TUNING.ceiling
// (scripts/charge/movement_tuning.js) — jamais en dur ici. La famille est
// lue par les detecteurs qui existent deja (isIsolationMovement,
// coachIsMainLoadContext) : aucune nouvelle regex de nom de mouvement.

function coachCeilingConfig(){
  var T=window.COACH_MOVEMENT_TUNING||{};
  var C=T.ceiling;
  if(!C||C.enabled===false)return null;
  return C;
}

function coachCeilingNormalizeName(name){
  if(typeof coachNormalizeMoveText==='function')return coachNormalizeMoveText(name);
  return String(name||'').toLowerCase().trim();
}

// isolation | main | accessory. Volontairement construite sur les detecteurs
// existants : une famille de plafond n'est pas une nouvelle taxonomie, c'est
// une lecture de celle qui gouverne deja le saut et les barreaux RPE.
function coachCeilingFamilyForMovement(label,context){
  try{
    if(typeof isIsolationMovement==='function'&&isIsolationMovement(label))return 'isolation';
  }catch(e){}
  try{
    if(typeof coachIsMainLoadContext==='function'&&coachIsMainLoadContext(label,context))return 'main';
  }catch(e){}
  return 'accessory';
}

function coachCeilingFamilyRule(family){
  var C=coachCeilingConfig();
  var fams=(C&&C.families)||{};
  return fams[family]||fams.accessory||null;
}

// Plafond pose a la main sur ce mouvement (surcharge de profil). Prioritaire
// sur toute deduction : l'athlete ou son coach en sait plus que la fenetre
// d'historique, et le dit explicitement.
function coachCeilingManualLoad(label){
  var C=coachCeilingConfig();
  var table=(C&&C.manual)||null;
  if(!table)return null;
  var wanted=coachCeilingNormalizeName(label);
  if(!wanted)return null;
  var keys=Object.keys(table);
  for(var i=0;i<keys.length;i++){
    if(coachCeilingNormalizeName(keys[i])!==wanted)continue;
    var v=Number(table[keys[i]]);
    if(v>0)return v;
  }
  return null;
}

// Lignes d'historique exploitables pour un plafond : une charge reelle et
// une seance vraiment jouee. Une ligne sans charge valide ne dit rien d'un
// palier.
function coachCeilingUsableRows(label,history,context){
  var rows=[];
  (Array.isArray(history)?history:[]).forEach(function(row){
    if(!row)return;
    var valid=(typeof coachHistoryHasValidLoad==='function')
      ? coachHistoryHasValidLoad(row,label,context)
      : (Number(row.load)>0);
    if(!valid)return;
    var load=(typeof coachHistoryLoadNumber==='function')?coachHistoryLoadNumber(row):Number(row.load)||0;
    if(!(load>0))return;
    var rpe=(typeof coachHistoryRpeNumber==='function')?coachHistoryRpeNumber(row):Number(row.rpe)||0;
    rows.push({load:load,rpe:rpe,row:row});
  });
  return rows;
}

// Le coeur de la deduction. Retourne null tant que les deux signaux ne
// tiennent pas ensemble — « je ne sais pas » est la reponse par defaut.
function coachDeduceCeiling(label,history,context){
  var C=coachCeilingConfig();
  if(!C)return null;
  var family=coachCeilingFamilyForMovement(label,context);
  var rule=coachCeilingFamilyRule(family);
  if(!rule)return null;

  var all=coachCeilingUsableRows(label,history,context);
  var win=Number(C.window)||8;
  var rows=all.slice(Math.max(0,all.length-win));
  var minStagnant=Number(rule.minStagnant)||0;
  if(!minStagnant||rows.length<minStagnant)return null;

  var peak=0;
  rows.forEach(function(r){ if(r.load>peak)peak=r.load; });
  if(!(peak>0))return null;

  var tol=Number(C.plateauTolerance)||0;
  var floor=peak*(1-tol);
  var isPlateau=function(r){ return r.load>=floor; };

  // Stagnation = seances loggees depuis la PREMIERE atteinte du palier, elles
  // comprises. Une seance plus legere depuis compte aussi : elle n'a pas fait
  // avancer la pointe non plus.
  var firstPlateau=-1;
  for(var i=0;i<rows.length;i++){ if(isPlateau(rows[i])){ firstPlateau=i; break; } }
  if(firstPlateau<0)return null;
  var stagnant=rows.length-firstPlateau;
  if(stagnant<minStagnant)return null;

  var minRpe=Number(rule.minRpe)||0;
  var minHardRows=Number(rule.minHardRows)||1;
  var plateauRows=rows.slice(firstPlateau).filter(isPlateau);
  var hardRows=plateauRows.filter(function(r){ return r.rpe>=minRpe; }).length;
  if(hardRows<minHardRows)return null;

  // Sortie de plafond : la derniere serie AU PALIER est redevenue nettement
  // moins chere — l'athlete a repris de la marge, le plafond n'en est plus un.
  var lastPlateau=plateauRows[plateauRows.length-1];
  var drop=Number(C.releaseRpeDrop)||0;
  if(lastPlateau&&lastPlateau.rpe>0&&drop>0&&lastPlateau.rpe<=minRpe-drop)return null;

  return {
    load:peak, family:family, manual:false,
    stagnant:stagnant, hardRows:hardRows, minRpe:minRpe, minStagnant:minStagnant,
    lastPlateauRpe:lastPlateau?lastPlateau.rpe:0
  };
}

// Plafond effectif : manuel d'abord, deduit ensuite.
function coachCeilingForMovement(label,history,context){
  var C=coachCeilingConfig();
  if(!C)return null;
  var manual=coachCeilingManualLoad(label);
  if(manual>0){
    return {load:manual, family:coachCeilingFamilyForMovement(label,context), manual:true};
  }
  return coachDeduceCeiling(label,history,context);
}

function coachCeilingReason(info,label){
  if(!info)return '';
  if(info.manual){
    return "Plafond manuel : "+Math.round(info.load)+" lb fixes pour "+label
      +" (Calibration du moteur). Aucune hausse automatique au-dessus — la progression passe par les repetitions, le tempo ou le volume.";
  }
  return "Brain — Plafond deduit : "+Math.round(info.load)+" lb tiennent depuis "+info.stagnant
    +" seances comparables et coutent RPE "+info.minRpe+" ou plus ("+info.hardRows+" series). "
    +"Ce mouvement ne monte plus en charge pour l'instant — la progression passe par les repetitions, pas par la barre. "
    +"Une serie nettement moins chere au meme poids rouvre le plafond.";
}

// ─── Regle de pipeline ─────────────────────────────────────────────────────
// Appelee par guardedSuggestedLoadDecision() (scripts/charge/suggestion.js),
// apres le plancher de validation et avant les caps de surveillance/deload :
// le plafond borne une hausse, il ne doit jamais faire redescendre sous une
// charge deja validee (peak >= derniere charge par construction), ni se
// substituer a un frein plus severe place apres lui.
//
// Contexte limite (technique, WOD, leger) et semaine de deload : le plafond
// ne s'applique pas. Ces chemins ne montent deja pas tout seuls, et un
// plafond affiche a leur place volerait l'explication du (!) a la vraie
// raison.
function coachRuleCeilingCap(ctx){
  if(!ctx)return;
  if(ctx.contextLimited||ctx.isDeload)return;
  var info=coachCeilingForMovement(ctx.label,ctx.hist,ctx.moveContext);
  if(!info||!(info.load>0))return;
  if(!(ctx.suggested>info.load))return;
  ctx.suggested=info.load;
  ctx.mode='down';
  ctx.severity=(ctx.severity==='ok')?'watch':ctx.severity;
  ctx.reason=coachCeilingReason(info,ctx.label);
  ctx.ceilingApplied=info;
  ctx.brainAdjusted=true;
}

window.CoachCeiling={
  config:coachCeilingConfig,
  familyFor:coachCeilingFamilyForMovement,
  manualFor:coachCeilingManualLoad,
  deduce:coachDeduceCeiling,
  ceilingFor:coachCeilingForMovement,
  reason:coachCeilingReason,
  rule:coachRuleCeilingCap
};

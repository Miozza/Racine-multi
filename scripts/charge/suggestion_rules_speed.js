// @ts-check
// Coach Beurt - moteur de suggestions de charges : ancre de force et regle du bloc vitesse.
// Script global volontaire : pas de ES modules. Extrait de suggestion_rules.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

// ── Bloc vitesse : preserver le stimulus, pas la charge absolue ────────────
// Un bloc vitesse est prescrit en POURCENTAGE du 1RM. Une charge absolue
// ecrite dans un programme devient trop legere des que l'athlete progresse :
// « ~60 % » ecrit 145 lb pour l'athlete de reference finit a 47 % pour un
// athlete plus fort. Le moteur doit ramener la charge dans la bande declaree,
// LENTEMENT et dans les deux sens — jamais transformer un bloc vitesse en
// bloc lourd, jamais monter jusqu'a ce que le RPE grimpe.
//
// Ancre = capacite de force REELLE du mouvement, pas l'e1RM du set de vitesse
// lui-meme : une serie a RPE 7 sur un bloc vitesse n'est pas proche de
// l'echec, son e1RM sous-estime enormement. Sans ancre fiable, la regle ne
// fait rien : un historique incomplet garde le comportement d'avant.
// Sert aussi a resoudre une charge de programme ecrite en pourcentage
// (coachBuildSuggestionContext) : meme question, meme reponse.
function coachStrengthAnchorOneRm(label,mv){
  // 1. Capacite mesuree par le travail lourd reel (athlete_state). Les
  //    contextes limites n'ecrivent jamais `ranges` : ce qu'on lit ici vient
  //    donc bien d'un bloc principal, jamais du bloc vitesse lui-meme.
  var best=0,source='';
  var ranges=(mv&&mv.ranges)||null;
  if(ranges){
    Object.keys(ranges).forEach(function(rg){
      var r=ranges[rg];if(!r)return;
      var est=Number(r.estimated1RM)||0;
      if(!est){
        var l=parseLoad(r.currentLoad);if(l===null||l===undefined)l=Number(r.currentLoad)||0;
        est=epley1RM(l,Number(r.currentReps)||Number(r.actualReps)||0);
      }
      if(est>best){best=est;source='athlete_state';}
    });
  }
  // 2. References de travail saisies (state.movementRefs). Un trophee 1RM y
  //    est ici LEGITIME : on cherche une ancre de pourcentage, pas une charge
  //    de travail — contrairement a coachDeclaredRangeReference().
  if(!(best>0)&&typeof state!=='undefined'&&state&&state.movementRefs){
    var wanted=(typeof coachMovementLookupLabels==='function')
      ? coachMovementLookupLabels(label).map(coachNormalizeMoveText)
      : [coachNormalizeMoveText(label)];
    var mvCfg=(typeof movements!=='undefined'&&movements)?movements:{};
    Object.keys(state.movementRefs).forEach(function(k){
      var e=state.movementRefs[k];
      if(!e||e.implausible)return;
      var mvKey=e.movement||k.split('__')[0];
      var nm=mvCfg[mvKey]&&mvCfg[mvKey].name;
      if(!nm||wanted.indexOf(coachNormalizeMoveText(nm))<0)return;
      var l=parseLoad(e.load);if(l===null||l===undefined)l=Number(e.load)||0;
      var est=epley1RM(l,Number(e.reps)||1);
      if(est>best){best=est;source='reference';}
    });
  }
  // 3. Tests de calibration du profil (PR_FIELD_MAP). Deja des entrees du
  //    moteur (elles alimentent scaleRatios) : les relire ici n'ouvre aucune
  //    nouvelle source de donnees.
  if(!(best>0)&&typeof PR_FIELD_MAP==='object'&&typeof prCfgMatchesResult==='function'){
    var profile=(typeof state!=='undefined'&&state)?state.profile:null;
    if(profile){
      // Une valeur dont le ratio est hors bande est à une autre échelle :
      // 140 lb de poulie lus comme un 10RM de lest donnaient ~187 lb de
      // « 1RM » de traction lestée. Même seuil que scaling.js.
      var bandMax=(typeof coachRatioComponentMax==='function')?coachRatioComponentMax():0;
      var ratios=profile.scaleRatios||{};
      Object.keys(PR_FIELD_MAP).forEach(function(id){
        var cfg=PR_FIELD_MAP[id];
        if(!cfg||!cfg.profile||!prCfgMatchesResult(cfg,label))return;
        if(bandMax&&Number(ratios[cfg.profile])>bandMax)return;
        var v=Number(profile[cfg.profile])||0;
        if(!(v>0))return;
        var est=epley1RM(v,Number(cfg.reps)||1);
        if(est>best){best=est;source='profil';}
      });
    }
  }
  return best>0?{oneRm:best,source:source}:null;
}

// Part du saut maximal debloquee par ce que la derniere serie a montre.
// Cible juste atteinte = derive minimale ; reps depassees = marge complete.
// C'est ce qui separe 135 x 2 @7 de 135 x 5 @7 dans un bloc vitesse, ou la
// bande seule donnerait exactement la meme reponse aux deux.
function coachSpeedDriftFactor(T,lastReps,target){
  var D=(T&&T.drift)||{};
  var base=Number(D.base);
  if(!(base>0))base=0.5;
  if(!(lastReps>0)||!(target>0))return base;
  var ratio=lastReps/target;
  var ladder=D.surplus||[];
  for(var i=0;i<ladder.length;i++){
    if(ratio>=Number(ladder[i].minRatio)){
      var f=Number(ladder[i].factor);
      return (f>base)?f:base;
    }
  }
  return base;
}

// Une serie sortie proprement dans le bloc (RPE dans la cible, reps faites,
// statut sain) est un fait, pas une estimation : reproposer MOINS que ca,
// c'est exactement la charge figee qu'on corrige. Ce plancher ne demande donc
// aucune ancre de force — il ne fait que refuser de redescendre sous ce que
// l'athlete vient de faire. Sans lui, un athlete sans capacite de force
// connue restait bloque sur le nombre du programme meme apres l'avoir
// depasse proprement pendant des semaines.
function coachSpeedCleanFloor(ctx,T){
  if(!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return false;
  if(!(ctx.suggested<ctx.lastLoad))return false;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var blocking=(T&&T.blockingStatuses)||[];
  if(ctx.last&&ctx.last.status&&blocking.indexOf(ctx.last.status)!==-1)return false;
  if(!(ctx.lastRpe>0)||ctx.lastRpe>(Number(T&&T.maxRpe)||7.5))return false;
  if(ctx.target&&!(lastReps>=ctx.target))return false;
  ctx.suggested=ctx.lastLoad;
  ctx.mode="nearest";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Stimulus vitesse : "+ctx.lastLoad+" lb x "+lastReps+" @RPE "+ctx.lastRpe
    +" deja sorti proprement dans ce bloc. Le moteur ne redescend pas sous cette charge.";
  ctx.brainAdjusted=true;
  ctx.speedBandApplied=true;
  return true;
}

function coachRuleSpeedStimulusBand(ctx){
  var mc=ctx.moveContext;
  if(!mc||!mc.isSpeed||!mc.speedBand)return;
  // Un deload ne recalibre rien : sa charge basse est voulue.
  if(ctx.isDeload)return;
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.speedStimulus)||null;
  if(!T)return;
  // Plancher d'abord : il vaut AVEC comme SANS ancre.
  coachSpeedCleanFloor(ctx,T);
  var anchor=coachStrengthAnchorOneRm(ctx.label,ctx.mv);
  if(!anchor||!(anchor.oneRm>0))return; // aucune capacite connue : rien de plus.
  var band=mc.speedBand;
  // `aim` = le pourcentage que le bloc annonce (« ~60 % »). C'est vers lui que
  // la charge derive, pas vers le bas de la bande : s'arreter au plancher
  // laisserait le stimulus sous ce que le coach a ecrit. `ceil` reste le
  // garde-fou dur — au-dela, ce n'est plus un bloc vitesse.
  var aim=anchor.oneRm*(Number(band.aim)||band.min);
  var ceil=anchor.oneRm*band.max;
  var maxJump=coachMaxJumpForExercise(ctx.label,ctx.lastHasValidLoad?ctx.lastLoad:ctx.suggested);
  var pctOf=function(v){return Math.round((v/anchor.oneRm)*100);};

  // ── Sens BAS : un bloc vitesse ne devient jamais un bloc lourd. ──────────
  // Protection, donc pas conditionnee a l'historique — mais bornee au meme
  // saut maximal pour ne jamais s'effondrer d'un coup.
  if(ctx.suggested>ceil){
    // Reduire une charge que l'athlete a REELLEMENT portee se fait par
    // paliers : un effondrement brutal casse la confiance dans la suggestion.
    // Mais une charge jamais portee n'est qu'un nombre ecrit dans un
    // programme : la ramener d'un coup dans la bande ne coute rien, et la
    // faire descendre de 10 lb par seance laissait le bloc lourd pendant des
    // semaines — une protection qui protege trop tard n'en est pas une.
    var dejaPortee=(Array.isArray(ctx.hist)?ctx.hist:[]).some(function(r){
      return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext)&&coachHistoryLoadNumber(r)>=ctx.suggested;
    });
    var down=dejaPortee?Math.max(ceil,ctx.suggested-maxJump):ceil;
    if(down<ctx.suggested){
      ctx.suggested=down;
      ctx.mode="down";
      ctx.severity=ctx.severity==="critical"?ctx.severity:"watch";
      ctx.reason="Stimulus vitesse : "+pctOf(down)+" % du 1RM estime ("+Math.round(anchor.oneRm)
        +" lb). Au-dela de "+Math.round(band.max*100)+" % ce n'est plus de la vitesse — charge ramenee dans la bande.";
      ctx.brainAdjusted=true;
      ctx.speedBandApplied=true;
    }
    return;
  }

  if(!(ctx.suggested<aim))return; // deja a la cible du bloc : rien a faire.

  // ── Sens HAUT : uniquement sur preuve loggee dans CE contexte. ───────────
  var rows=(Array.isArray(ctx.hist)?ctx.hist:[]).filter(function(r){
    return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext)&&coachHistoryRepsNumber(r)>0;
  });
  if(rows.length<(Number(T.minHistoryRows)||1))return;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var blocking=T.blockingStatuses||[];
  var statusOk=!(ctx.last&&ctx.last.status&&blocking.indexOf(ctx.last.status)!==-1);
  var rpeOk=ctx.lastRpe>0&&ctx.lastRpe<=(Number(T.maxRpe)||7.5);
  var repsOk=!ctx.target||lastReps>=ctx.target;

  // Protection du stimulus : barre lente, technique degradee ou reps non
  // sorties = on ne monte plus, et on plafonne a la charge qui vient d'etre
  // portee. C'est la limite qui separe « charge trop facile pour produire le
  // stimulus » de « monter jusqu'a ce que le RPE devienne eleve » : sous la
  // bande cible ou pas, un bloc vitesse qui grince ne monte pas.
  if(!ctx.lastHasValidLoad||!statusOk||!rpeOk||!repsOk){
    if(ctx.lastHasValidLoad&&ctx.lastLoad>0){
      if(ctx.suggested>ctx.lastLoad){ctx.suggested=ctx.lastLoad;ctx.mode="down";}
      ctx.severity=(ctx.severity==="critical")?ctx.severity:"warning";
      ctx.reason="Stimulus vitesse protege : derniere serie "+ctx.lastLoad+" lb x "+(lastReps||0)
        +" @RPE "+(ctx.lastRpe||"?")+" — barre plus assez rapide ou cible non sortie. Aucune hausse vers la bande "
        +Math.round(band.min*100)+"-"+Math.round(band.max*100)+" % tant que ce n'est pas propre.";
      ctx.brainAdjusted=true;
      ctx.speedBandApplied=true;
    }
    return;
  }

  // Jamais moins que ce que l'athlete vient de faire proprement dans ce bloc :
  // c'est exactement la charge figee que le programme reproposait.
  var base=Math.max(ctx.suggested,ctx.lastLoad);
  if(base>=aim){
    if(base>ctx.suggested){
      ctx.suggested=base;ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Stimulus vitesse : "+ctx.lastLoad+" lb deja sorti proprement ("+pctOf(base)+" % du 1RM estime). Le moteur ne redescend pas sous cette charge.";
      ctx.brainAdjusted=true;ctx.speedBandApplied=true;
    }
    return;
  }
  var converge=Number(T.converge)||0.5;
  var allowed=maxJump*coachSpeedDriftFactor(T,lastReps,ctx.target);
  var stepUp=Math.min((aim-base)*converge,allowed);
  var next=Math.min(base+stepUp,aim);
  if(!(next>ctx.suggested))return;
  ctx.suggested=next;
  ctx.mode="nearest";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Stimulus vitesse sous-charge : "+Math.round(base)+" lb = "+pctOf(base)+" % du 1RM estime ("
    +Math.round(anchor.oneRm)+" lb, source "+anchor.source+"), le bloc vise "+Math.round(band.min*100)+"-"
    +Math.round(band.max*100)+" %. Rapprochement progressif vers "+Math.round(aim)+" lb"
    +(lastReps>ctx.target?" — "+lastReps+" reps pour "+ctx.target+" demandees":"")+".";
  ctx.brainAdjusted=true;
  ctx.speedBandApplied=true;
}

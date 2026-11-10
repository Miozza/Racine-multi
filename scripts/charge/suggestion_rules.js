// @ts-check
// Coach Beurt - moteur de suggestions de charges : les regles, une fonction chacune, et la finalisation.
// Script global volontaire : pas de ES modules. Extrait de suggestion.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

// Un ratio emprunte et borne n'est pas une capacite mesuree : il ne sort
// jamais en « ok » silencieux. Meme traitement que le profil non calibre.
function coachRuleUnprovenScaleWatch(ctx){
  if(ctx.scaleInfo&&ctx.scaleInfo.clamped&&ctx.severity==="ok"){
    ctx.severity="watch";
    ctx.brainAdjusted=true;
  }
}

// Historique admis par PONDERATION : aucune ligne de meme nature n'existait, et
// le moteur travaille sur des seances d'un autre contexte. Mieux que d'etre
// aveugle, moins bien qu'une reference propre — et l'athlete doit le savoir.
function coachRuleWeightedHistoryWatch(ctx){
  if(!ctx.historyWeighted)return;
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  if(ctx.limitedOnlyEvidence){
    ctx.reason=(ctx.reason?ctx.reason+" ":"")
      +"Seules des seances technique, legeres ou de WOD existent sur ce mouvement : elles comptent comme plancher, "
      +"jamais comme plafond d'un travail principal. La charge part du programme mis a ton echelle.";
    ctx.brainAdjusted=true;
    return;
  }
  ctx.reason=(ctx.reason?ctx.reason+" ":"")
    +"Aucune seance de meme nature que celle du jour : le moteur s'appuie sur "
    +ctx.hist.length+" seance"+(ctx.hist.length>1?"s":"")
    +" d'un autre contexte, comptee"+(ctx.hist.length>1?"s":"")+" a poids reduit.";
  ctx.brainAdjusted=true;
}

// ── Le programme propose, l'evidence de l'athlete dispose ──────────────────
// Sur un mouvement DEJA travaille, la charge du programme reste un nombre
// generique passe par un ratio. Elle n'a aucune autorite pour depasser ce que
// l'athlete a reellement demontre — et le moteur n'avait aucun moyen de faire
// la difference entre « il a merite 100 » et « le ratio a invente 100 ».
//
// Cas mesure (phase2_fable5) : Face Pull, 12 seances loggees entre 70 et 90 lb,
// derniere a 90 x 20 @ RPE 7. Le programme ecrit 60 lb, le ratio de famille
// _upperPull (1,60) en fait 100 lb, et le saut maximal prudent autorisait
// justement 100 : aucune regle ne se declenchait, la suggestion sortait a
// 100 lb avec la raison « Charge du programme, arrondie selon l'equipement ».
// Le ratio parlait plus fort que douze seances.
//
// Le plafond est ce que l'evidence MERITE — dernier poids plus l'echelon du
// barreau RPE (coachRpeEarnedLoad), jamais moins que la meilleure reference
// controlee. Les regles suivantes peuvent toujours monter au-dessus : un
// surplus de reps ou une reference plus haute restent des faits mesures, pas
// un emprunt. Cette regle ne rabote que la SUPPOSITION.
function coachRuleProgramScaleGuard(ctx){
  if(!ctx.hasRealHistory||ctx.contextLimited||ctx.isDeload)return;
  if(!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return;
  if(!ctx.hist||coachHistoryConfirmationWeight(ctx.hist)<2)return;
  // Ne vise QUE l'inflation par le ratio. Un ratio de 1 n'a rien invente : la
  // charge est celle que le programme a ecrite, et c'est aux regles de
  // progression — et au portail Brain — de la traiter, avec leur propre
  // explication. Sans cette porte, cette regle volait le mot de la fin a
  // Brain sur des cas ou elle ne changeait meme pas le nombre.
  if(!ctx.scaleInfo||!(Number(ctx.scaleInfo.ratio)>1))return;
  var earned=(typeof coachRpeEarnedLoad==='function')?coachRpeEarnedLoad(ctx):0;
  var controlled=(ctx.bestControlled&&ctx.bestControlled.load)||0;
  var evidence=Math.max(Number(earned)||0,Number(controlled)||0,ctx.lastLoad);
  if(!(evidence>0)||!(ctx.suggested>evidence))return;
  var asked=ctx.suggested;
  ctx.suggested=evidence;
  ctx.mode="down";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Charge du programme ramenee a ton evidence reelle : "+Math.round(asked)
    +" lb demandes apres mise a l'echelle, mais ton travail loggé merite "+Math.round(evidence)
    +" lb (dernier "+ctx.lastLoad+" lb @RPE "+ctx.lastRpe+"). Le ratio de programme ne depasse pas tes seances.";
  ctx.brainAdjusted=true;
  ctx.programScaleCapped={asked:asked,evidence:evidence};
}

function coachRuleContextLimited(ctx){
  if(ctx.contextLimited || isTechnicalMovement(ctx.label)){
    ctx.suggested=ctx.programNum;ctx.mode="nearest";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason=ctx.contextLimitReason || "Mouvement technique : pas d'auto-progression comme un mouvement principal.";
    ctx.brainAdjusted=true;
  }
}

// Sans aucune seance reelle, on ne part PAS du defaut programme x ratio (qui
// vise ~100% d'une capacite theorique, souvent issue d'un vieux max) : on part
// d'une reference de travail declaree pour la plage cible, periodisee SOUS le
// RM (rampe planifiee). Des qu'une seance reelle est loggée, hasRealHistory
// devient vrai et l'autoregulation (priorite 1, blocs ci-dessous) reprend la
// main. Les PR (manual_pr) sont exclus de la reference : jamais une charge de
// travail.
function coachRuleReferenceDeTravail(ctx){
  var hasRealHistory=ctx.hist.some(function(r){return coachHistoryHasValidLoad(r,ctx.label,ctx.moveContext);});
  ctx.hasRealHistory=hasRealHistory;
  if(!hasRealHistory&&!ctx.contextLimited&&!isTechnicalMovement(ctx.label)&&!ctx.isDeload){
    var declaredRef=coachDeclaredRangeReference(ctx.mv,ctx.range,ctx.target,ctx.label);
    var refSeed=declaredRef?coachReferenceSeedWorkingLoad(declaredRef,ctx.range):null;
    if(refSeed&&refSeed.load>0){
      ctx.suggested=refSeed.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Reference de travail "+Math.round(declaredRef.load)+" lb"
        +(declaredRef.from?" (convertie depuis "+Math.round(declaredRef.from.load)+" lb x "+declaredRef.from.reps+")":(declaredRef.exact?"":" (derivee)"))
        +" : semaine "+(refSeed.wIdx+1)+"/"+refSeed.loadingWeeks+" a ~"+Math.round(refSeed.pct*100)+"% ("
        +Math.round(refSeed.load)+" lb), sous le RM. Rampe planifiee : pas de charge proche du RM pour un travail en "+ctx.range+".";
      ctx.brainAdjusted=true;
    }
  }
}

function coachLiftFromHistoryThreshold(label){
  var n=coachNormalizeMoveText(label);
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.liftFromHistoryThresholds)||{default:{gap:20,maxRpe:8},overrides:[]};
  for(var i=0;i<T.overrides.length;i++){
    if(T.overrides[i].pattern.test(n))return T.overrides[i];
  }
  return T.default;
}

// Exige au moins 2 entrees d'historique : un point unique (ex. le seed de calibrage/onboarding)
// n'est pas encore une "reference prouvee" — il ne doit pas a lui seul justifier de suggerer
// plus que ce que l'utilisateur vient juste d'etablir comme sa propre charge de depart.
function coachRuleLiftFromControlledHistory(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&coachHistoryConfirmationWeight(ctx.hist)>=2){
    var gap=ctx.bestControlled.load-ctx.suggested;
    var thr=coachLiftFromHistoryThreshold(ctx.label);
    var allowLiftFromHistory=gap>=thr.gap
      && (thr.maxRpe==null || ctx.bestControlled.rpe<=thr.maxRpe)
      && !isIsolationMovement(ctx.label)
      && !isTechnicalMovementInContext(ctx.label,ctx.moveContext);
    if(allowLiftFromHistory){
      // Se poser SUR la reference controlee, pas au-dessus. La hausse est
      // ensuite decidee par l'echelon RPE dans coachRuleLastSetGuards, comme
      // sur le chemin voisin coachRuleReferenceReelleValidee.
      // Avant V4.5.56 cette regle ajoutait +10 lb ici alors que le chemin
      // voisin repartait de la reference seche : les deux regles couvrent la
      // meme situation et ne se departageaient que par le seuil d'ecart
      // (liftFromHistoryThresholds.gap). Resultat, franchir ce seuil VERS LE
      // BAS faisait MONTER la suggestion — une charge de programme plus lourde
      // sortait une suggestion plus legere. Les deux chemins convergent
      // desormais sur la meme valeur.
      ctx.suggested=ctx.bestControlled.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Historique reel controle detecte : "+ctx.bestControlled.load+" lb x "+ctx.bestControlled.reps+" @RPE "+ctx.bestControlled.rpe+". Le moteur evite de sous-suggerer sous une reference facile.";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleReferenceReelleValidee(ctx){
  if(!ctx.contextLimited && !ctx.isDeload && ctx.bestControlled&&ctx.bestControlled.load>ctx.suggested&&ctx.bestControlled.rpe<=8&&coachHistoryConfirmationWeight(ctx.hist)>=2){
    var bestReps=Number(ctx.bestControlled.reps)||0;
    if(!ctx.target||!bestReps||bestReps>=ctx.target||repRange(bestReps)===repRange(ctx.target)){
      ctx.suggested=ctx.bestControlled.load;
      ctx.mode="nearest";
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Reference reelle plus haute validee : "+ctx.bestControlled.load+" lb x "+(bestReps||ctx.target)+" @RPE "+ctx.bestControlled.rpe+". La prochaine suggestion repart de cette charge, pas de l'ancienne suggestion.";
      ctx.brainAdjusted=true;
    }
  }
}

function coachRuleHistorySignalAdjustment(ctx){
  if(ctx.historySignal&&(ctx.historySignal.status==='blocked'||ctx.historySignal.status==='stalled')&&ctx.lastHasValidLoad&&ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastLoad;ctx.mode='down';ctx.severity='warning';
    ctx.reason=ctx.historySignal.reason;
    ctx.brainAdjusted=true;
  }else if(ctx.historySignal&&ctx.historySignal.status==='watch'&&ctx.suggested>ctx.programNum){
    ctx.severity=ctx.severity==='ok'?'watch':ctx.severity;
    ctx.reason=ctx.historySignal.reason;
    ctx.brainAdjusted=true;
  }
}

// Charge que l'evidence RPE de l'athlete MERITE : dernier poids + echelon du
// barreau, corrige par la reactivite, borne par le saut maximal prudent.
// Retourne lastLoad quand rien n'est merite. Une seule definition, utilisee a
// la fois par coachRuleLastSetGuards (qui la propose) et par le portail Brain
// (qui ne doit jamais descendre en dessous).
function coachRpeEarnedLoad(ctx){
  if(!ctx||!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return 0;
  if(ctx.contextLimited||ctx.isDeload)return ctx.lastLoad;
  var rung=coachRpeProgressionRung(ctx.label,ctx.lastRpe);
  if(!rung)return ctx.lastLoad;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  // Zero rep sorti n'est PAS « cible atteinte » : `!lastReps` est vrai pour 0
  // comme pour une ligne sans reps, et laisserait un echec total meriter une
  // hausse. On exige une serie reellement sortie.
  if(!(lastReps>0))return ctx.lastLoad;
  if(ctx.target&&lastReps<ctx.target)return ctx.lastLoad;
  // Un mouvement en recalibrage ou sous surveillance n'a rien merite non plus :
  // meme liste que le plancher de validation (coachRuleFloorValidation).
  var badStatuses=['recalibrating','watch','failed','major_fail','context_logged'];
  if(ctx.last.status&&badStatuses.indexOf(ctx.last.status)!==-1)return ctx.lastLoad;
  if(ctx.cap&&ctx.cap.status&&badStatuses.indexOf(ctx.cap.status)!==-1)return ctx.lastLoad;
  if(!ctx.hist||coachHistoryConfirmationWeight(ctx.hist)<2)return ctx.lastLoad;
  if(isTechnicalMovementInContext(ctx.label,ctx.moveContext))return ctx.lastLoad;
  var react=coachRpeReactivityShift(ctx.hist,ctx.lastLoad,lastReps,ctx.target);
  var steps=Math.max(0,rung.steps+react.shift);
  if(steps<=0)return ctx.lastLoad;
  var maxAllowed=coachRpeMaxAllowedLoad(ctx.label,ctx.lastLoad,rung,ctx.currentLoad);
  var next=coachNextLoadSteps(ctx.label,ctx.lastLoad,steps,ctx.currentLoad);
  while(next>maxAllowed){
    var back=nextLoadForExercise(ctx.label,next,-1,ctx.currentLoad);
    if(!(back>ctx.lastLoad)||back>=next)break;
    next=back;
  }
  return (next>ctx.lastLoad&&next<=maxAllowed)?next:ctx.lastLoad;
}

function coachRuleLastSetGuards(ctx){
  if(!ctx.last)return;
  // Le saut maximal prudent devient fonction du RPE reel : une seance vecue
  // facile autorise un saut plus large, une seance limite garde le saut de
  // base. Les freins RPE >= 8.5 / >= 9 plus bas ne sont pas concernes.
  var rung=coachRpeProgressionRung(ctx.label,ctx.lastRpe);
  var lastReps=coachHistoryRepsNumber(ctx.last);
  var repsReached=!ctx.target || !lastReps || lastReps>=ctx.target;
  // Meme plafond que la charge meritee : les crans du barreau passent, le reste
  // est rabote. Sans ce partage, une charge de programme egale aux crans merites
  // etait d'abord ecrasee ici, puis relevee vingt lignes plus bas — meme
  // resultat, mais l'explication affichee etait celle du frein, pas celle du
  // merite.
  var maxAllowed=coachRpeMaxAllowedLoad(ctx.label,ctx.lastLoad,rung,ctx.currentLoad);
  if(ctx.lastHasValidLoad&&ctx.lastRpe<=8&&ctx.suggested>maxAllowed){
    ctx.suggested=maxAllowed;ctx.mode="down";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason="Progression limitee : derniere reference "+ctx.lastLoad+" lb @RPE "+ctx.lastRpe+". Saut maximal prudent jusqu'a "+maxAllowed+" lb.";
    ctx.brainAdjusted=true;
  }
  if(ctx.lastHasValidLoad&&ctx.lastRpe>0&&rung&&repsReached&&!ctx.contextLimited&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)&&!ctx.isDeload&&coachHistoryConfirmationWeight(ctx.hist)>=2){
    // Un plafond prudent plus petit que le plus petit cran disponible sur le
    // rack n'est pas de la prudence : il interdit la seule progression
    // possible. Cas reel (anterieur a V4.5.56) : Lateral Raise DB a 20 lb,
    // saut isolation 2 lb, haltere suivant 22,5 lb — le mouvement etait fige
    // definitivement. Le plafond ne descend donc jamais sous un cran.
    // Le barreau RPE donne l'ambition de base, la reactivite la corrige d'un
    // cran selon la tendance recente, puis le saut maximal rabote. Ordre
    // volontaire : le garde-fou passe toujours en dernier — mais il ne descend
    // jamais sous les crans que le barreau lui-meme annonce (maxAllowed).
    var react=coachRpeReactivityShift(ctx.hist,ctx.lastLoad,lastReps,ctx.target);
    var steps=Math.max(0,rung.steps+react.shift);
    var next=steps>0?coachNextLoadSteps(ctx.label,ctx.lastLoad,steps,ctx.currentLoad):ctx.lastLoad;
    while(next>maxAllowed){
      var back=nextLoadForExercise(ctx.label,next,-1,ctx.currentLoad);
      if(!(back>ctx.lastLoad)||back>=next)break;
      next=back;
    }
    if(steps>0&&next&&next>ctx.lastLoad&&next<=maxAllowed){
      // Condition elargie : la charge meritee est un PLANCHER, pas seulement
      // un rattrapage quand le programme demande moins que la derniere seance.
      // Avant, la regle n'agissait que si `suggested <= lastLoad` : un
      // programme demandant 230 quand l'athlete avait merite 240 ne declenchait
      // rien, et le portail Brain redescendait ensuite a 225 — une charge de
      // programme plus lourde sortait une suggestion plus legere.
      if(ctx.suggested<next){
        ctx.suggested=next;ctx.mode="up";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
        ctx.reason="Progression prete : dernier "+ctx.lastLoad+" lb x "+(lastReps||ctx.target)+" @RPE "+ctx.lastRpe+". Hausse de "+steps+" cran"+(steps>1?"s":"")+" vers "+next+" lb"
          +(react.notes.length?" — "+react.notes.join(", "):"")+".";
        ctx.brainAdjusted=true;
      }
    }else if(steps<=0&&ctx.suggested<=ctx.lastLoad){
      // Barreau a zero cran (RPE 8, ou tendance qui durcit) : on maintient et
      // on le DIT, au lieu de laisser une zone morte silencieuse.
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Maintien a "+ctx.lastLoad+" lb : RPE "+ctx.lastRpe+" sur la derniere serie"
        +(react.notes.length?" — "+react.notes.join(", "):"")+". Confirme cette charge avant de monter.";
      ctx.brainAdjusted=true;
    }else if(ctx.suggested<=ctx.lastLoad){
      ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      ctx.reason="Progression prete, mais aucune charge superieure disponible/configuree dans le saut prudent autorise.";
      ctx.brainAdjusted=true;
    }
  }
  if(ctx.lastHasValidLoad&&ctx.lastRpe>=9 && ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastLoad;ctx.mode="down";ctx.severity="warning";
    ctx.reason="Bloque : dernier RPE reel "+ctx.lastRpe+" a "+ctx.lastLoad+" lb. Regle V51 : RPE >= 9 = aucune hausse automatique.";
    ctx.brainAdjusted=true;
  }else if(ctx.lastHasValidLoad&&ctx.lastRpe>=8.5 && coachLastSetIsSimilarOrHarder(ctx.target,lastReps) && ctx.suggested>ctx.lastLoad){
    ctx.suggested=ctx.lastRpe>=9.5?Math.max(0,ctx.lastLoad-coachLoadStepForExercise(ctx.label,ctx.currentLoad)):ctx.lastLoad;ctx.mode="down";ctx.severity="warning";
    ctx.reason="Frein RPE : dernier RPE "+ctx.lastRpe+" sur une cible similaire ou plus dure. Maintenir ou reduire, pas augmenter.";
    ctx.brainAdjusted=true;
  }
  if(ctx.lastHasValidLoad&&lastReps>0&&ctx.target&&!ctx.contextLimited&&!isTechnicalMovementInContext(ctx.label,ctx.moveContext)){
    var gapSignal=coachRepGapSignal(ctx);
    ctx.repGapSignal=gapSignal;
    var repGap=ctx.target-lastReps;

    // ── Deux situations que le meme « ecart de reps » recouvrait ───────────
    // 1. CONVERSION. La derniere reference a ete faite sur un AUTRE format :
    //    un simple a 210 lb un jour de 1RM, alors qu'on demande aujourd'hui
    //    5x5. L'athlete n'a rien rate — il a fait exactement ce qui etait
    //    prescrit ce jour-la. Epley est ici une conversion d'unites et
    //    s'applique tout de suite : un single a 210 n'est pas un 5RM a 210, et
    //    attendre une confirmation reviendrait a proposer 210 lb en 5x5.
    // 2. DEFICIT. L'athlete est reste SOUS ce qui etait prescrit ce jour-la.
    //    La, l'ecart parle de la charge, et la regle (c) s'applique : un
    //    deficit ne veut dire « trop lourd » que si le RPE le confirme et que
    //    ca se repete. Une seance ecourtee a RPE 6 ne conclut rien — c'est
    //    exactement ce que faisait la version precedente, qui ne regardait que
    //    l'ecart de reps.
    //
    // Une ligne qui ne porte AUCUNE prescription (historique ancien) ne permet
    // pas de trancher : on garde le comportement de conversion, qui va dans la
    // direction sure — il abaisse la suggestion.
    var ownRange=coachRowOwnTargetRange(ctx.last);
    var isShortfall=!!(ownRange&&lastReps<ownRange.min);
    // Seuil d'amplitude pour une conversion ; inutile pour un deficit deja
    // confirme par le RPE et la repetition, ou « trois reps de moins » n'etait
    // qu'un proxy grossier pour « la charge est trop lourde ».
    var wideEnough=(repGap>=3||ctx.target>=lastReps*2);
    if((!isShortfall&&wideEnough)||gapSignal.effet==='baisse'){
      var projOneRM=epley1RM(ctx.lastLoad,lastReps);
      var projCapacity=projOneRM?estimateLoadForRepsFrom1RM(projOneRM,ctx.target):0;
      if(projCapacity>0&&ctx.suggested>projCapacity){
        ctx.suggested=projCapacity;ctx.mode="down";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
        var cibleTxt=gapSignal.fourchette.min
          +(gapSignal.fourchette.max>gapSignal.fourchette.min?"-"+gapSignal.fourchette.max:"");
        ctx.reason=isShortfall
          ? "Reps sous la cible : "+lastReps+" reps pour "+cibleTxt+" demandees a "+ctx.lastLoad
            +" lb @RPE "+ctx.lastRpe+", "+gapSignal.sessions+" seances de suite. Charge trop lourde : "
            +"reference de travail ramenee a ~"+Math.round(projCapacity)+" lb (projection Epley)."
          : "Ecart de reps : dernier "+ctx.lastLoad+" lb x "+lastReps+" ne se traduit pas directement en "
            +ctx.target+" reps. Capacite estimee ~"+Math.round(projCapacity)+" lb (projection Epley).";
        ctx.brainAdjusted=true;
      }
    }
  }
}

// ── Surplus de reps : la capacite revelee, pas seulement l'ambition ────────
// Le moteur savait deja projeter Epley vers le BAS (fin de
// coachRuleLastSetGuards) : « dernier 135 x 2 pour 5 reps demandees » reduit
// la suggestion. La projection vers le HAUT n'existait pas. Consequence
// directe du bug signale : 135 x 2 @7 et 135 x 5 @7 sur une cible de 2 reps
// ne se separaient que par un cran forfaitaire de reactivite, alors qu'Epley
// dit 135 lb d'un cote et ~148 lb de l'autre pour la meme cible.
//
// La projection ne devient JAMAIS la suggestion telle quelle : on en franchit
// une part par seance (`converge`, reglee par intention), et le saut maximal
// prudent garde le dernier mot. Une seule performance ne fait pas bondir la
// barre — c'est un plancher qui monte, pas un bond.
// ── Signal d'ecart de reps ─────────────────────────────────────────────────
// « Je fais 4 reps au lieu de 2 et le moteur ne monte pas. »
//
// Quatre choses manquaient pour repondre a ca honnetement :
//   1. la FOURCHETTE. `repsCibles` n'etait que la borne basse : 18 reps sur
//      « 15-20 » etaient lues comme 3 reps de trop. L'ecart se mesure contre
//      targetMax vers le haut et targetMin vers le bas, jamais contre un
//      nombre unique ;
//   2. le SENS du RPE. La projection Epley vers le bas se declenchait sur le
//      seul ecart de reps : une seance ecourtee a RPE 6 faisait baisser la
//      charge comme un echec ;
//   3. la PERSISTANCE. Le moteur ne lisait que la derniere serie — une bonne
//      journee suffisait a bouger la barre, une mauvaise aussi ;
//   4. la TRACABILITE. Rien ne disait a l'athlete que ses reps avaient parle.
//
// Ce bloc calcule le signal ; les regles plus bas decident quoi en faire. Il
// ne modifie rien et n'ecrit rien : c'est une lecture de l'historique.

// Fourchette prescrite : les deux bornes, jamais un nombre seul. `ctx.target`
// reste la borne basse (c'est ce que tout le moteur appelle « la cible »).
function coachRepTargetRange(ctx){
  var c=ctx&&ctx.moveContext;
  var min=Number(c&&c.targetMin)||Number(ctx&&ctx.target)||0;
  var max=Number(c&&c.targetMax)||min;
  if(max<min)max=min;
  return {min:min,max:max};
}

// Fourchette telle qu'elle etait prescrite LE JOUR de cette ligne. Une seance
// gardee sous « 15-20 » ne doit pas etre relue contre la cible d'aujourd'hui.
//
// Mais la cible STOCKEE peut etre fausse. `planned.targetMin` a ete ecrit par
// le parseur de format de l'epoque, et ce parseur ne savait pas lire un
// intervalle : toutes les lignes de Power Clean loggees sous « EMOM 8 : 2
// Power Clean » portent une cible de 10 reps, jamais 2. Les lire telles quelles
// garderait le mouvement casse pour tout l'historique deja ecrit.
//
// On RELIT donc le format stocke avec le parseur d'aujourd'hui — exactement ce
// que coachRederiveStoredContext (historique.js) fait deja pour les intentions,
// et pour la meme raison. La ligne n'est jamais reecrite : rien ne part dans le
// localStorage, et une future correction du parseur beneficiera
// retroactivement de la meme facon. Une ligne sans format stocke n'est pas
// relisible : elle garde ce qu'elle porte.
// Ce que CETTE ligne avait elle-meme comme prescription, ou null si elle ne le
// dit pas. Distinguer « la ligne ne dit rien » de « la ligne dit autre chose
// qu'aujourd'hui » est ce qui separe une conversion d'unites d'un echec.
function coachRowOwnTargetRange(row){
  var p=row&&row.planned;
  var fmt=(p&&p.format)||(p&&p.context&&p.context.format)||(row&&row.context&&row.context.format)||'';
  if(fmt&&typeof parseTargetReps==='function'){
    var reread=parseTargetReps(fmt,0);
    var rmin=Number(reread&&reread.min)||0, rmax=Number(reread&&reread.max)||rmin;
    if(rmin>0)return {min:rmin,max:(rmax<rmin?rmin:rmax)};
  }
  var min=Number(p&&p.targetMin)||Number(p&&p.reps)||0;
  var max=Number(p&&p.targetMax)||min;
  if(!(min>0))return null;
  if(max<min)max=min;
  return {min:min,max:max};
}

function coachRepTargetRangeForRow(row,fallback){
  return coachRowOwnTargetRange(row)||fallback;
}

// Ecart d'une ligne : positif au-dessus de targetMax, negatif sous targetMin,
// zero DANS la fourchette. C'est toute la regle (a).
function coachRepGapForRow(row,range){
  var reps=coachHistoryRepsNumber(row);
  if(!(reps>0)||!range||!(range.min>0))return null;
  var r=coachRepTargetRangeForRow(row,range);
  if(reps>r.max)return {reps:reps,gap:reps-r.max,direction:'surplus',range:r};
  if(reps<r.min)return {reps:reps,gap:reps-r.min,direction:'deficit',range:r};
  return {reps:reps,gap:0,direction:'none',range:r};
}

// Combien de seances CONSECUTIVES, en remontant, sortent de la fourchette dans
// le meme sens ? Une ligne dans la cible arrete le decompte : la serie est
// rompue, il n'y a plus de tendance a lire.
function coachRepGapStreak(ctx){
  var range=coachRepTargetRange(ctx);
  var rows=Array.isArray(ctx.hist)?ctx.hist:[];
  var out={direction:'none',sessions:0,rows:[],range:range};
  for(var i=rows.length-1;i>=0;i--){
    var row=rows[i];
    if(!coachHistoryHasValidLoad(row,ctx.label,ctx.moveContext))continue;
    var g=coachRepGapForRow(row,range);
    if(!g||g.direction==='none')break;
    if(out.direction==='none')out.direction=g.direction;
    else if(g.direction!==out.direction)break;
    out.sessions++;
    out.rows.unshift({date:(row.date||''),load:coachHistoryLoadNumber(row),reps:g.reps,rpe:coachHistoryRpeNumber(row),ecart:g.gap});
  }
  return out;
}

// Le signal complet, pret a etre lu par une regle OU par la trace.
// `effet` applique la regle (c) : le RPE decide de ce que l'ecart veut dire.
function coachRepGapSignal(ctx){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.repsSurplus)||{};
  var streak=coachRepGapStreak(ctx);
  var need=Math.max(1,Number(T.minConsecutive)||2);
  var hardRpe=Number(T.hardRpe)||9;
  var shortRpe=Number(T.shortSessionRpe)||7;
  var rpe=Number(ctx.lastRpe)||0;
  var signal={
    direction:streak.direction, sessions:streak.sessions, seances:streak.rows,
    fourchette:streak.range, rpe:rpe, requises:need,
    effet:'aucun', pourquoi:''
  };
  if(streak.direction==='none'||!streak.sessions){
    signal.pourquoi='Reps dans la fourchette prescrite.';
    return signal;
  }
  if(streak.direction==='surplus'){
    if(rpe>=hardRpe){
      signal.effet='maintien';
      signal.pourquoi='Reps au-dessus de la cible mais RPE '+rpe+' : serie menee a l\'echec, la charge est deja au bon niveau.';
      return signal;
    }
    if(streak.sessions<need){
      signal.effet='attente';
      signal.pourquoi='Reps au-dessus de la cible sur '+streak.sessions+' seance'+(streak.sessions>1?'s':'')
        +' : il en faut '+need+' de suite avant d\'y reagir.';
      return signal;
    }
    signal.effet='hausse';
    return signal;
  }
  // Deficit
  if(rpe>0&&rpe<=shortRpe){
    signal.effet='aucun';
    signal.pourquoi='Reps sous la cible mais RPE '+rpe+' : seance ecourtee, pas un signal de charge. Le moteur n\'en conclut rien.';
    return signal;
  }
  if(rpe>=hardRpe){
    if(streak.sessions<need){
      signal.effet='attente';
      signal.pourquoi='Reps sous la cible a RPE '+rpe+' sur '+streak.sessions+' seance'+(streak.sessions>1?'s':'')
        +' : il en faut '+need+' de suite avant de descendre.';
      return signal;
    }
    signal.effet='baisse';
    return signal;
  }
  signal.effet='aucun';
  signal.pourquoi='Reps sous la cible a RPE '+(rpe||'?')+' : ni assez dur pour accuser la charge, ni assez facile pour l\'excuser.';
  return signal;
}

function coachRepSurplusTuning(ctx){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.repsSurplus)||null;
  if(!T)return null;
  var byIntent=T.byIntent||{};
  var intents=(ctx&&ctx.moveContext&&Array.isArray(ctx.moveContext.intents))?ctx.moveContext.intents:[];
  for(var i=0;i<intents.length;i++){
    if(byIntent[intents[i]])return {tuning:byIntent[intents[i]],intent:intents[i],table:T};
  }
  return T.fallback?{tuning:T.fallback,intent:'',table:T}:null;
}

// Capacite projetee a la cible de reps depuis une serie qui a DEPASSE la cible.
// Retourne null quand il n'y a pas de surplus affirme, quand le RPE est trop
// haut pour croire la marge, ou quand le statut de la ligne l'interdit.
function coachRepSurplusProjection(ctx){
  if(!ctx||!ctx.last||!ctx.lastHasValidLoad||!(ctx.lastLoad>0))return null;
  var picked=coachRepSurplusTuning(ctx);
  if(!picked)return null;
  var T=picked.table, tuning=picked.tuning;
  var lastReps=coachHistoryRepsNumber(ctx.last);
  // La borne HAUTE de la fourchette, pas la cible seule : sur « 15-20 », faire
  // 18 n'est pas un depassement, c'est la cible. Comparer a 15 inventait un
  // surplus de 3 reps sur chaque serie normale.
  var signal=ctx.repGapSignal||coachRepGapSignal(ctx);
  var target=Number(signal.fourchette&&signal.fourchette.max)||Number(ctx.target)||0;
  if(!(lastReps>0)||!(target>0)||lastReps<=target)return null;
  var ratio=lastReps/target;
  if(ratio<(Number(T.minRatio)||1.25))return null;
  if(!(ctx.lastRpe>0)||ctx.lastRpe>(Number(tuning.maxRpe)||8))return null;
  // Persistance : un depassement isole ne bouge rien.
  if(signal.effet!=='hausse')return null;
  var blocking=T.blockingStatuses||[];
  if(ctx.last.status&&blocking.indexOf(ctx.last.status)!==-1)return null;
  if(ctx.cap&&ctx.cap.status&&blocking.indexOf(ctx.cap.status)!==-1)return null;
  var oneRm=epley1RM(ctx.lastLoad,lastReps);
  var capacity=oneRm?estimateLoadForRepsFrom1RM(oneRm,target):0;
  if(!(capacity>ctx.lastLoad))return null;
  var converge=Number(tuning.converge);
  if(!(converge>0))return null;
  return {
    capacity:capacity,
    ratio:ratio,
    lastReps:lastReps,
    intent:picked.intent,
    proposed:ctx.lastLoad+(capacity-ctx.lastLoad)*converge
  };
}

function coachRuleRepSurplusLift(ctx){
  // Le contexte limite (technique/WOD/light/vitesse) a sa propre porte :
  // coachRuleSpeedStimulusBand pour la vitesse, rien pour les autres. Un drill
  // technique ne merite pas de charge parce qu'il a fait des reps en plus.
  if(ctx.contextLimited||ctx.isDeload)return;
  if(isTechnicalMovementInContext(ctx.label,ctx.moveContext))return;
  if(!ctx.hist||coachHistoryConfirmationWeight(ctx.hist)<2)return;
  var proj=coachRepSurplusProjection(ctx);
  if(!proj)return;
  // Meme plafond que la hausse ordinaire : le saut maximal prudent, elargi au
  // plus par le barreau RPE. Un surplus de reps rend le moteur plus prompt a
  // utiliser la marge existante, il ne l'elargit pas (contrat de progression).
  var rung=coachRpeProgressionRung(ctx.label,ctx.lastRpe);
  var baseMaxJump=coachMaxJumpForExercise(ctx.label,ctx.lastLoad);
  var maxJump=rung?Math.max(baseMaxJump,Math.round(baseMaxJump*rung.jumpFactor)):baseMaxJump;
  var oneStep=nextLoadForExercise(ctx.label,ctx.lastLoad,1,ctx.currentLoad);
  var maxAllowed=Math.max(ctx.lastLoad+maxJump,(oneStep>ctx.lastLoad)?oneStep:0);
  var next=Math.min(proj.proposed,maxAllowed);
  if(!(next>ctx.suggested))return;
  ctx.suggested=next;
  ctx.mode="nearest";
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  var sig=ctx.repGapSignal||coachRepGapSignal(ctx);
  var cible=sig.fourchette.min+(sig.fourchette.max>sig.fourchette.min?"-"+sig.fourchette.max:"");
  ctx.reason="Reps au-dessus de la cible : "+proj.lastReps+" reps pour "+cible+" demandees a "+ctx.lastLoad
    +" lb @RPE "+ctx.lastRpe+", "+sig.sessions+" seances de suite. Capacite projetee ~"
    +Math.round(proj.capacity)+" lb (Epley) : reference de travail relevee a "+Math.round(next)+" lb.";
  ctx.brainAdjusted=true;
  ctx.repGapApplied={direction:'surplus',from:ctx.lastLoad,to:next,capacity:proj.capacity};
}

// Les reps ont parle, et la charge n'a pas bouge pour autant. Trois cas :
//   · RPE eleve — serie menee a l'echec, la charge est deja au bon niveau ;
//   · une seule seance — pas encore une tendance ;
//   · l'echelon RPE ordinaire donnait deja autant ou plus que la projection.
// Dans les trois, le silence serait le pire choix : l'athlete qui sort le
// double des reps demandees doit LIRE que le moteur l'a vu, sinon il conclut
// que ses reps ne comptent pas. C'est toute la regle (e).
function coachRuleRepSurplusHold(ctx){
  if(ctx.contextLimited||ctx.isDeload)return;
  if(ctx.repGapApplied)return;
  var sig=ctx.repGapSignal||coachRepGapSignal(ctx);
  if(sig.direction!=='surplus')return;
  var phrase=sig.pourquoi;
  if(sig.effet==='hausse'){
    // Le signal etait valide, mais la projection ne depassait pas ce que le
    // barreau RPE proposait deja. Rien a ajouter au nombre, tout a dire.
    var derniere=sig.seances.length?sig.seances[sig.seances.length-1]:null;
    var cible=sig.fourchette.min+(sig.fourchette.max>sig.fourchette.min?"-"+sig.fourchette.max:"");
    phrase="Reps au-dessus de la cible : "+((derniere&&derniere.reps)||"?")+" reps pour "+cible
      +" demandees @RPE "+sig.rpe+", "+sig.sessions+" seances de suite. La hausse deja proposee couvre ce signal.";
  }else if(sig.effet!=='maintien'&&sig.effet!=='attente')return;
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason=(ctx.reason?ctx.reason+" ":"")+phrase;
  ctx.brainAdjusted=true;
}

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

function coachRuleRecentHardBrake(ctx){
  if(!ctx.contextLimited&&!ctx.isDeload&&!ctx.limitedOnlyEvidence){
    var recentHardBrake=coachRecentUnresolvedHighRpeBrake(ctx.hist,ctx.label,ctx.moveContext,ctx.target,ctx.suggested);
    if(recentHardBrake&&ctx.suggested>recentHardBrake.load){
      ctx.suggested=recentHardBrake.rpe>=9.5?Math.max(0,recentHardBrake.load-coachLoadStepForExercise(ctx.label,ctx.currentLoad)):recentHardBrake.load;
      ctx.mode="down";ctx.severity="warning";
      ctx.reason="Frein RPE recent : "+recentHardBrake.load+" lb a deja coute RPE "+recentHardBrake.rpe+" sans reference plus haute controlee depuis. Pas de hausse automatique vers "+ctx.programNum+" lb.";
    }
  }
}

// Plancher historique : un dernier set reellement reussi (reps cibles atteintes,
// pas un echec/recalibrage) ne doit jamais etre sous-suggere, meme apres les
// freins RPE generiques ci-dessus (qui ne plafonnent qu'une hausse). Place en
// dernier pour avoir le dernier mot : un frein peut traiter un poids plus
// lourd reussi au meme RPE comme "non resolu" et faire retomber suggested
// sous ce plancher, ce qui doit etre corrige ici.
function coachRuleFloorValidation(ctx){
  // Evidence de contexte limite seulement : plancher, jamais plafond.
  if(ctx.limitedOnlyEvidence&&ctx.bestControlled&&ctx.suggested<ctx.bestControlled.load){
    ctx.suggested=ctx.bestControlled.load;ctx.mode="nearest";
    return;
  }
  if(!ctx.contextLimited&&!ctx.isDeload&&!isTechnicalMovement(ctx.label)&&ctx.last&&ctx.lastHasValidLoad){
    var floorReps=coachHistoryRepsNumber(ctx.last);
    var floorRepsReached=!ctx.target||!floorReps||floorReps>=ctx.target;
    var floorBadStatuses=['recalibrating','watch','failed','major_fail','context_logged'];
    var floorStatusOk=!ctx.last.status||floorBadStatuses.indexOf(ctx.last.status)===-1;
    var lastRpeFloor=coachHistoryRpeNumber(ctx.last);
    var histForFloor=Array.isArray(ctx.hist)?ctx.hist:[];
    var prevForFloor=histForFloor.length>=2?histForFloor[histForFloor.length-2]:null;
    var prevRpeFloor=coachHistoryRpeNumber(prevForFloor);
    var prevLoadFloor=coachHistoryLoadNumber(prevForFloor);
    var consecutiveHardOnSameLoad=lastRpeFloor>=9&&prevRpeFloor>=9&&prevLoadFloor>=ctx.lastLoad;
    if(floorRepsReached&&floorStatusOk&&ctx.suggested<ctx.lastLoad&&!consecutiveHardOnSameLoad){
      ctx.suggested=ctx.lastLoad;ctx.mode="nearest";ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
      if(lastRpeFloor>=9){
        ctx.reason="Brain — Plancher de validation : "+ctx.lastLoad+" lb x "+(floorReps||ctx.target)+" valide, mais confort faible (RPE "+lastRpeFloor+"). Maintien pour consolidation; aucune hausse automatique.";
      }else{
        ctx.reason="Brain — Plancher maitrise : "+ctx.lastLoad+" lb x "+(floorReps||ctx.target)+" valide avec confort acceptable. Brain evite de redescendre sans signal durable.";
      }
    }
  }
}

function coachRuleAthleteStateCap(ctx){
  if(ctx.cap&&(ctx.cap.status==="recalibrating"||ctx.cap.status==="watch"||Number(ctx.cap.confidence||1)<0.55)){
    var capLoadRaw=(ctx.cap.currentLoad!==undefined&&ctx.cap.currentLoad!==null)?ctx.cap.currentLoad:ctx.cap.actualLoad;
    var capLoad=parseLoad(capLoadRaw);
    if(capLoad===null||capLoad===undefined)capLoad=Number(capLoadRaw)||0;
    var hasCapLoad=(capLoad||capLoad===0);
    // Ne pas laisser un cap faible ecraser une reference reelle controlee clairement superieure.
    // La reference doit etre PLUS RECENTE que le cap — ce que la raison affichee
    // affirmait deja sans que la condition le verifie. Sans ce test, un echec
    // total (0 rep) posait bien un cap "recalibrating", mais une seance
    // controlee ANTERIEURE le faisait ignorer : le moteur reproposait la charge
    // qui venait d'echouer. Une reference d'avant l'echec ne prouve plus rien.
    var capDate=String((ctx.cap&&ctx.cap.lastUpdated)||"");
    var controlledDate=String((ctx.bestControlled&&ctx.bestControlled.row&&ctx.bestControlled.row.date)||"");
    var controlledIsNewer=!capDate||!controlledDate||controlledDate>capDate;
    // Ecart exige pour ignorer un cap faible : le plus petit de l'absolu et du
    // relatif, plancher a un cran d'equipement. Table : COACH_MOVEMENT_TUNING.
    // athleteStateCap (un +15 lb en dur rendait cette porte inatteignable sur
    // un mouvement dont la plage de travail tient dans 20-40 lb).
    var capT=((window.COACH_MOVEMENT_TUNING||{}).athleteStateCap||{}).ignoreLowCap||{absoluteGap:15,relativeGap:0.15,maxRpe:8.5};
    var capStep=(typeof coachLoadStepForExercise==='function')?coachLoadStepForExercise(ctx.label,ctx.currentLoad):5;
    // Plancher a un cran : sur une charge minuscule, 15 % ne valent presque
    // rien et n'importe quelle seance franchirait la porte — le cap ne
    // protegerait plus personne.
    var capGap=Math.max(capStep, Math.min(Number(capT.absoluteGap)||15, capLoad*(Number(capT.relativeGap)||0.15)));
    var ignoreLowCap=ctx.bestControlled&&hasCapLoad&&ctx.bestControlled.load>=capLoad+capGap&&ctx.bestControlled.rpe<=(Number(capT.maxRpe)||8.5)&&controlledIsNewer;
    if(hasCapLoad&&capLoad>0&&ctx.suggested>capLoad&&!ignoreLowCap){ctx.suggested=capLoad;ctx.mode="down";ctx.severity="warning";ctx.reason="Mouvement sous surveillance dans athlete_state : charge cappee jusqu'a confirmation.";}
    else if(ignoreLowCap&&!ctx.isDeload){ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;ctx.reason="Cap athlete_state ignore : historique reel controle plus recent/plus fiable que le cap faible.";}
  }
}

function coachRuleDeloadCap(ctx){
  var deloadDecision=coachApplyDeloadCap(ctx.suggested,ctx.label,ctx.moveContext,ctx.hist,ctx.lastHasValidLoad?ctx.lastLoad:null,ctx.bestControlled,ctx.programNum);
  if(deloadDecision.changed){
    ctx.suggested=deloadDecision.value;
    ctx.mode="nearest";
    ctx.severity=ctx.severity==="critical"?ctx.severity:"watch";
    ctx.reason=deloadDecision.reason;
  }
}

function coachRuleRoundingAndMovementCap(ctx){
  ctx.rounded=roundLoadForExercise(ctx.label,ctx.suggested,ctx.mode,ctx.currentLoad);
  var mvProgCap=(typeof coachGetMovementProgressionCap==="function")?coachGetMovementProgressionCap(ctx.label):null;
  ctx.mvProgCap=mvProgCap;

  if(mvProgCap && ctx.last && ctx.lastHasValidLoad){
    var isFridayCtx=(typeof coachIsFridayContext==="function") && coachIsFridayContext();
    var baseForCap=ctx.lastLoad;

    if(mvProgCap.fridayUsesWeekBest && isFridayCtx){
      var eb=coachRecentBestControlledLoad(ctx.hist, 8, ctx.label, ctx.moveContext);
      if(eb && eb.load>baseForCap && eb.rpe<=8) baseForCap=eb.load;
    }

    var maxJumpCap=(ctx.lastRpe<=8) ? (mvProgCap.maxJumpWhenEasy||0) : (mvProgCap.maxJumpWhenHard||0);
    var cappedByMv=roundLoadForExercise(ctx.label, baseForCap+maxJumpCap, "down", ctx.currentLoad);
    if(!cappedByMv && cappedByMv!==0) cappedByMv=baseForCap+maxJumpCap;

    if(ctx.rounded>cappedByMv){
      ctx.rounded=cappedByMv;
      if(ctx.rounded>ctx.lastLoad && ctx.lastRpe>=9) ctx.rounded=ctx.lastLoad; // sécurité RPE
      ctx.severity="warning";
      ctx.reason=ctx.label+" : cap de progression +"+maxJumpCap+" lb"
        +(isFridayCtx && mvProgCap.fridayUsesWeekBest ? " (référence semaine vendredi)" : "")
        +".";
    }
  }
  if(ctx.last&&ctx.lastHasValidLoad&&ctx.lastRpe>=9&&ctx.rounded>ctx.lastLoad&&!(mvProgCap&&coachIsFridayContext())){
    ctx.rounded=roundLoadForExercise(ctx.label,ctx.lastLoad,"down",ctx.currentLoad)||ctx.lastLoad;
    ctx.brainAdjusted=true;
  }
}

// ── Une consigne ecrite tient jusqu'au nombre affiche ──────────────────────
// Plafonner la seule GRAINE ne servait a rien : les regles d'historique
// passent au-dessus. Mesure sur le cas Pallof Press — graine ramenee a 40 lb
// par le repere d'equipement, puis « Progression prete : dernier 70 lb x 10
// @RPE 7 » la remontait a 80 lb, soit le double de ce que le programme decrit
// comme leger.
//
// « Leger » est une prescription du jour, pas un plafond de capacite : le
// mouvement est la pour le gainage, pas pour la charge. L'historique a donc
// raison sur ce que l'athlete PEUT faire, et tort sur ce qu'on lui demande
// aujourd'hui. Placee apres l'arrondi, comme le re-clamp des contextes
// limites, dont c'est le meme raisonnement.
function coachRuleWrittenCeilingCap(ctx){
  if(!(ctx.writtenLoadCeiling>0))return;
  var shown=(ctx.rounded||ctx.rounded===0)?ctx.rounded:ctx.suggested;
  if(!(shown>ctx.writtenLoadCeiling))return;
  ctx.rounded=roundLoadForExercise(ctx.label,ctx.writtenLoadCeiling,'down',ctx.currentLoad)||ctx.writtenLoadCeiling;
  ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
  ctx.reason="Consigne ecrite « leger » : plafonne a "+ctx.rounded
    +" lb par le repere d'equipement du programme, pas par ton profil ni par ton historique ("
    +Math.round(shown)+" lb sinon). Ce bloc cherche le gainage, pas la charge.";
  ctx.brainAdjusted=true;
}

function coachRuleContextLimitedRounding(ctx){
  // Un bloc vitesse est un contexte limite, mais sa charge suit un
  // pourcentage cible : re-clamper sur le nombre du programme annulerait
  // exactement la recalibration de coachRuleSpeedStimulusBand.
  if(ctx.speedBandApplied)return;
  if(ctx.contextLimited&&ctx.rounded>ctx.programNum){
    ctx.rounded=roundLoadForExercise(ctx.label,ctx.programNum,"nearest",ctx.currentLoad)||ctx.programNum;
    ctx.severity=ctx.severity==="ok"?"watch":ctx.severity;
    ctx.reason=ctx.contextLimitReason||ctx.reason;
    ctx.brainAdjusted=true;
  }
}

// ── La rampe ecrite est un plancher MOBILE, pas un decor ───────────────────
// Le programme ecrit une progression semaine apres semaine. Une fois l'ancre
// historique posee, plus rien ne la relit : `programNum` ne sert qu'a des
// comparaisons de severite et au re-clamp des contextes limites. Aucune regle
// ne dit « ne reste pas sous la progression ecrite ». Au dernier barreau du
// RPE (RPE 8 = zero cran), un athlete regulier reste donc immobile pendant que
// la rampe monte, et l'ecran n'en dit rien.
//
// Ce signal ne TOUCHE PAS la charge, volontairement. Faire monter un poids
// parce qu'un calendrier le demande — et non parce qu'une seance l'a merite —
// est exactement ce que le contrat de progression interdit. Il leve une
// surveillance et nomme l'ecart : la decision reste a l'athlete.
//
// Place apres l'arrondi pour juger le nombre REELLEMENT affiche, et il
// n'ecrase jamais une raison existante — il s'y ajoute. Un frein dur
// ('warning'/'critical') a deja son explication : on n'en empile pas une
// seconde.
function coachRuleProgramRampFloor(ctx){
  if(ctx.contextLimited||ctx.isDeload||!ctx.hasRealHistory)return;
  if(ctx.severity==='warning'||ctx.severity==='critical')return;
  if(isTechnicalMovementInContext(ctx.label,ctx.moveContext))return;
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.programRampFloor)
    ||{minSessions:3,maxRpe:8,minShortfallPct:0.05};
  var shown=(ctx.rounded||ctx.rounded===0)?ctx.rounded:ctx.suggested;
  if(!(ctx.programNum>0)||!(shown>0)||shown>=ctx.programNum)return;
  var shortfall=(ctx.programNum-shown)/ctx.programNum;
  if(!(shortfall>=(Number(T.minShortfallPct)||0.05)))return;

  // Combien de seances recentes se sont deja tenues sous ce que le programme
  // demande aujourd'hui, SANS motif RPE ? Un RPE eleve, un echec ou un
  // recalibrage sont des raisons legitimes de rester dessous : ils portent
  // deja leur explication, l'athlete n'a pas besoin d'un second avertissement.
  var need=Math.max(1,Number(T.minSessions)||3);
  var maxRpe=Number(T.maxRpe)||8;
  var bad=['recalibrating','watch','failed','major_fail','context_logged'];
  var rows=Array.isArray(ctx.hist)?ctx.hist:[];
  var streak=0;
  for(var i=rows.length-1;i>=0&&streak<need;i--){
    var row=rows[i];
    if(!coachHistoryHasValidLoad(row,ctx.label,ctx.moveContext))continue;
    if(row.status&&bad.indexOf(row.status)!==-1)return;
    if(coachHistoryRpeNumber(row)>maxRpe)return;
    if(coachHistoryLoadNumber(row)>=ctx.programNum)return;
    streak++;
  }
  if(streak<need)return;

  ctx.severity='warning';
  ctx.reason=(ctx.reason?ctx.reason+' ':'')
    +'Retard sur la progression ecrite : le programme demande '+Math.round(ctx.programNum)
    +' lb et la suggestion tient '+Math.round(shown)+' lb, apres '+streak
    +' seances sous ce niveau sans motif RPE (dernier RPE '+ctx.lastRpe
    +'). Le moteur ne monte pas tout seul — a toi de decider si tu tentes la charge du programme.';
  ctx.brainAdjusted=true;
  ctx.programRampLag={program:ctx.programNum,shown:shown,sessions:streak};
}

function coachFinalizeSuggestionDecision(ctx){
  // Estimation de niveau : jamais présentée comme une capacité mesurée. La
  // sévérité ne peut plus redescendre à « ok » tant que le profil n'est pas
  // calibré, et la raison le dit — c'est ce que lit le bouton (!).
  if(ctx.uncalibrated){
    ctx.severity=(ctx.severity==="ok")?"watch":ctx.severity;
    ctx.reason="Estimation d'après le niveau déclaré : profil non calibré. Calibre pour des charges à ta mesure.";
    ctx.uncalibratedApplied=true;
  }
  var text=coachFormatSuggestedLoad(ctx.label,ctx.rounded,ctx.originalText,'');
  if(ctx.severity==="warning"||ctx.severity==="critical")text += " ⚠";
  var decision={label:ctx.label,loadText:text,loadNum:ctx.rounded,severity:ctx.severity,reason:ctx.reason,last:ctx.last,cap:ctx.cap,historySignal:ctx.historySignal};
  // Le portail Brain s'applique aussi quand une regle a pose un « watch ».
  // Avant, la condition etait severity === 'ok' seule : toute regle levant une
  // simple surveillance court-circuitait le portail, si bien qu'une charge de
  // programme PLUS LOURDE pouvait sortir une suggestion PLUS LEGERE (programme
  // 225 -> 230 donnait 230 puis 225). Le chemin le plus confiant recevait le
  // traitement le plus prudent, l'inverse de l'intention.
  // 'warning' et 'critical' restent exclus : un frein dur a deja reduit la
  // charge, le portail n'a rien a y ajouter.
  var gateOpen = (ctx.severity==='ok' || ctx.severity==='watch');
  var earnedFloor = (typeof coachRpeEarnedLoad==='function') ? coachRpeEarnedLoad(ctx) : 0;
  if(typeof coachBrainApplyStatsGate==='function' && ctx.lastHasValidLoad && ctx.rounded>ctx.lastLoad && gateOpen && !ctx.contextLimited && !ctx.isDeload){
    // En blend, le portail lit l'incertitude du filtre au lieu de ses stats
    // heuristiques. Hors blend, rien n'est transmis : portail d'avant.
    var kalmanGate=(ctx.kalman&&ctx.kalman.mode==='blend'&&ctx.kalman.gate)?ctx.kalman.gate:null;
    decision=coachBrainApplyStatsGate(decision,ctx.label,ctx.hist,ctx.moveContext,ctx.target,ctx.lastLoad,earnedFloor,kalmanGate);
    decision.loadText=coachFormatSuggestedLoad(ctx.label,decision.loadNum,ctx.originalText,'');
    if((decision.severity==='warning'||decision.severity==='critical')&&decision.loadText.indexOf('⚠')<0)decision.loadText+=' ⚠';
    ctx.brainAdjusted=true;
  }
  var explicitSource=ctx.brainAdjusted?'brain':'moteur';
  storeLoadDecisionHint(ctx.label,decision.loadText,decision.reason,decision.severity,ctx.hist,ctx.moveContext,explicitSource);
  try{
    if(decision.brainStats && window.__coachLoadHints && typeof coachNormalizeMoveText==='function'){
      var bk=coachNormalizeMoveText(ctx.label);
      if(window.__coachLoadHints[bk])window.__coachLoadHints[bk].brainStats=decision.brainStats;
    }
  }catch(e){}
  // Capacite estimee : attachee a l'indice du (!) et au journal Brain, jamais
  // a la decision — c'est ce qui garde le mode shadow identique bit a bit.
  try{
    if(ctx.kalman&&window.__coachLoadHints&&typeof coachNormalizeMoveText==='function'){
      var kk=coachNormalizeMoveText(ctx.label);
      if(window.__coachLoadHints[kk])window.__coachLoadHints[kk].kalman=ctx.kalman;
      if(window.CoachBrainJournal&&typeof CoachBrainJournal.recordKalman==='function')CoachBrainJournal.recordKalman(ctx.label,ctx.kalman,decision.loadNum);
    }
  }catch(e){}
  return decision;
}

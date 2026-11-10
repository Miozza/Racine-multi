// @ts-check
// Coach Beurt - moteur de suggestions de charges : echelle RPE, pas de charge et freins RPE.
// Script global volontaire : pas de ES modules. Extrait de suggestion.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

// Echelon de progression correspondant au RPE reel de la derniere serie.
// Retourne null au-dela du dernier barreau : pas de hausse automatique.
// Table : COACH_MOVEMENT_TUNING.rpeProgression (movement_tuning.js).
function coachRpeProgressionRung(label,rpe){
  var r=Number(rpe)||0;
  if(!(r>0))return null;
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.rpeProgression)||null;
  if(!T)return (r<=7)?{steps:1,jumpFactor:1}:null;
  var n=(typeof coachNormalizeMoveText==='function')?coachNormalizeMoveText(label):String(label||'');
  var table=null;
  var ov=T.overrides||[];
  for(var i=0;i<ov.length;i++){ if(ov[i].pattern.test(n)){ table=ov[i]; break; } }
  if(!table && T.isolation && typeof isIsolationMovement==='function' && isIsolationMovement(label)) table=T.isolation;
  if(!table) table=T.default;
  var ladder=(table&&table.ladder)||[];
  for(var j=0;j<ladder.length;j++){
    if(r<=Number(ladder[j].maxRpe)){
      // steps peut valoir 0 (barreau de maintien) : ne pas passer par
      // "|| 1", qui transformerait ce zero en une hausse d'un cran.
      var st=Number(ladder[j].steps);
      if(!isFinite(st)||st<0)st=1;
      var jf=Number(ladder[j].jumpFactor);
      if(!isFinite(jf)||jf<=0)jf=1;
      return {steps:st,jumpFactor:jf};
    }
  }
  return null;
}

// Decalage de reactivite : ce que raconte l'historique recent, en plus du
// seul RPE de la derniere seance. Retourne un entier (-1, 0 ou +1 par
// modificateur, cumules) applique au nombre de crans du barreau RPE.
// Ne touche jamais au saut maximal prudent : voir COACH_MOVEMENT_TUNING.
function coachRpeReactivityShift(hist,lastLoad,lastReps,target){
  var M=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.rpeProgression&&window.COACH_MOVEMENT_TUNING.rpeProgression.modifiers)||null;
  if(!M)return {shift:0,notes:[]};
  var shift=0,notes=[];

  // 1. Tendance du RPE a charge egale.
  var T=M.trend;
  if(T&&Array.isArray(hist)&&lastLoad>0){
    var same=hist.filter(function(row){
      return coachHistoryLoadNumber(row)===lastLoad && coachHistoryRpeNumber(row)>0;
    }).slice(-(Number(T.window)||3));
    if(same.length>=(Number(T.minRows)||3)){
      var first=coachHistoryRpeNumber(same[0]);
      var latest=coachHistoryRpeNumber(same[same.length-1]);
      var d=Number(T.delta)||0.5;
      if(latest<=first-d){ shift+=Number(T.shiftEasier)||0; notes.push("meme charge de moins en moins couteuse (RPE "+first+" -> "+latest+")"); }
      else if(latest>=first+d){ shift+=Number(T.shiftHarder)||0; notes.push("meme charge de plus en plus couteuse (RPE "+first+" -> "+latest+")"); }
    }
  }

  // 2. Reps depassees sur la derniere serie.
  // Deux lectures du meme fait, la plus severe gagne :
  //   - l'ecart ABSOLU (minExtra), qui parle bien des cibles longues ;
  //   - le RATIO reps/cible, seul a distinguer « 4 reps pour 2 » (un
  //     doublement) de « 10 reps pour 8 » (un debordement mineur). Sans lui,
  //     une cible de 2 reps donnait le meme credit forfaitaire quel que soit
  //     le depassement — l'angle mort a l'origine du defaut Squat vitesse de
  //     phase2_fable5.
  var R=M.repsOvershoot;
  if(R&&target>0&&lastReps>0){
    var shiftFromReps=0;
    if((lastReps-target)>=(Number(R.minExtra)||2))shiftFromReps=Number(R.shift)||0;
    var ratio=lastReps/target;
    (R.ladder||[]).some(function(rung){
      if(ratio<Number(rung.minRatio))return false;
      var st=Number(rung.shift)||0;
      if(st>shiftFromReps)shiftFromReps=st;
      return true;
    });
    if(shiftFromReps>0){
      shift+=shiftFromReps;
      notes.push(lastReps+" reps pour "+target+" demandees");
    }
  }

  return {shift:shift,notes:notes};
}

// Applique N crans d'equipement vers le haut a partir d'une charge.
// nextLoadForExercise() ne connait qu'une direction : on itere, en s'arretant
// des que le rack ne propose plus rien de superieur.
function coachNextLoadSteps(label,from,steps,loadText){
  var cur=Number(from)||0;
  var n=Math.max(1,Number(steps)||1);
  for(var i=0;i<n;i++){
    var nx=nextLoadForExercise(label,cur,1,loadText);
    if(!(nx>cur))break;
    cur=nx;
  }
  return cur;
}

// Plafond de hausse d'une seance, pour un barreau RPE donne.
//
// V4.6.8 — le barreau annoncait des crans qu'il ne pouvait pas donner. Sur une
// isolation, `maxJumpBase` vaut UN cran nominal et `jumpFactor` vaut toujours 1 :
// le rung « 2 crans a RPE <= 6 » etait donc systematiquement rabote a un seul.
// Mesure avant correctif sur Lateral Raise DB a 20 lb : RPE 6 et RPE 7,5
// donnaient tous deux +2,5 lb. C'est mot pour mot le defaut que V4.5.56 avait
// corrige pour les barres — « le RPE portait presque aucune information » — et
// laisse intact sur l'isolation.
//
// Regle posee : LES CRANS DU BARREAU PASSENT TOUJOURS. Le rack fait loi, parce
// qu'un cran d'equipement est la plus petite progression qui existe reellement :
// un plafond en pourcentage qui l'interdit n'est pas de la prudence, il fige le
// mouvement. Deux crans d'haltere font toujours plus de 15 % (20 -> 25 = +25 %),
// donc le plafond relatif interdisait ce rung a TOUTES les charges.
//
// Ce que la regle ne fait PAS : elargir les crans BONUS de la reactivite
// (tendance, reps depassees). Ceux-la restent sous le saut maximal prudent —
// sinon trois signaux positifs se multiplieraient et 20 lb menerait a 40 lb en
// une seance sur la foi d'un seul RPE 6.
function coachRpeMaxAllowedLoad(label,lastLoad,rung,loadText){
  var last=Number(lastLoad);
  // Zero est une charge VALIDE : sur un Weighted Pull-up ou un Weighted Dip, le
  // poids du corps seul est le point de depart legitime, et l'appelant l'a deja
  // valide (ctx.lastHasValidLoad, cf. coachIsBodyweightExternalLoadMovement).
  // Refuser 0 ici gelait le lest a 0 lb pour toujours — regression relevee par
  // dev/simulate_multi_users.js sur le profil strict_mu_candidate, ou une
  // suggestion de 10 lb retombait a 0.
  if(!(last>=0)||!isFinite(last))return 0;
  var baseMaxJump=coachMaxJumpForExercise(label,last);
  var jumpFactor=(rung&&Number(rung.jumpFactor))||1;
  var maxJump=Math.max(baseMaxJump,Math.round(baseMaxJump*jumpFactor));
  var oneStep=nextLoadForExercise(label,last,1,loadText);
  // Plancher garanti : la charge atteinte par les crans du barreau seul.
  var rungSteps=(rung&&Number(rung.steps))||0;
  var earned=(rungSteps>0)?coachNextLoadSteps(label,last,rungSteps,loadText):0;
  return Math.max(
    last+maxJump,
    (oneStep>last)?oneStep:0,
    (earned>last)?earned:0
  );
}

function coachLastSetIsSimilarOrHarder(target,lastReps){
  target=Number(target)||0;lastReps=Number(lastReps)||0;
  if(!target||!lastReps)return true;
  if(target>=lastReps)return true;
  return repRange(target)===repRange(lastReps);
}


function coachRecentUnresolvedHighRpeBrake(history,label,context,target,suggested){
  var rows=Array.isArray(history)?history.slice(-6):[];
  var brake=null;
  rows.forEach(function(row,idx){
    if(!coachHistoryHasValidLoad(row,label,context))return;
    var load=coachHistoryLoadNumber(row);
    var rpe=coachHistoryRpeNumber(row);
    var reps=coachHistoryRepsNumber(row);
    if(!(load||load===0)||!(rpe>=8.5))return;
    if(!coachLastSetIsSimilarOrHarder(target,reps))return;
    if(!(Number(suggested)>load))return;
    var resolved=false;
    for(var j=idx+1;j<rows.length;j++){
      var later=rows[j];
      if(!coachHistoryHasValidLoad(later,label,context))continue;
      var laterLoad=coachHistoryLoadNumber(later);
      var laterRpe=coachHistoryRpeNumber(later);
      var laterReps=coachHistoryRepsNumber(later);
      if(laterLoad>=load&&laterRpe>0&&laterRpe<=8.5&&coachLastSetIsSimilarOrHarder(target,laterReps)){
        resolved=true;break;
      }
    }
    if(resolved)return;
    if(!brake||load>brake.load||rpe>brake.rpe)brake={load:load,rpe:rpe,reps:reps,date:row.date||'',status:row.status||''};
  });
  return brake;
}

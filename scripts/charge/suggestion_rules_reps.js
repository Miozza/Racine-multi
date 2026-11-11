// @ts-check
// Coach Beurt - moteur de suggestions de charges : regles de l'ecart de reps (signal, hausse, maintien).
// Script global volontaire : pas de ES modules. Extrait de suggestion_rules.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

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

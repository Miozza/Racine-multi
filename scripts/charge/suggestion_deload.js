// @ts-check
// Coach Beurt - moteur de suggestions de charges : detection et plafond de deload.
// Script global volontaire : pas de ES modules. Extrait de suggestion.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

function coachIsDeloadWeekOrContext(context){
  var weekNum=Number((context&&context.week)||(state&&state.week)||0)||0;
  // La semaine 6 n'est PAS un deload en soi. `if(weekNum===6)return true;`
  // datait de l'epoque ou l'app ne portait qu'un seul cycle de 6 semaines ;
  // le catalogue en compte 42, de 1 a 16 semaines. Le hardcode declenchait un
  // deload fantome en S6 sur 14 programmes — dont « S6 Rotation B max » de
  // phase2_fable5 (semaine de 3RM, la plus lourde du bloc), cappee a 85 % de
  // la derniere reference : 175 lb au lieu de 210. Les 19 programmes dont la
  // S6 est un VRAI deload la declarent tous dans weekLabels/weekGoals et sont
  // donc couverts par la lecture de libelle plus bas, qui est arrivee apres
  // ce hardcode et le rend redondant.
  //
  // Une semaine de deload se DECLARE (libelle ou objectif de semaine, note du
  // bloc, contexte recuperation) ; elle ne se deduit jamais d'un numero.
  //
  // V4.6.10 — `isLight` a ete retire de cette ligne. Un bloc LEGER n'est pas
  // une semaine de DELOAD : ce sont deux notions differentes, et les confondre
  // coutait 20 % de charge a un exercice sur cinq du catalogue.
  //
  // Un bloc leger ne doit pas AUTO-PROGRESSER — c'est deja garanti ailleurs par
  // coachIsLimitedProgressionContext(), qui lit toujours isLight et n'a pas
  // change. Mais il ne doit pas non plus etre AMPUTE a chaque seance : rien
  // dans « leger » ne dit « reduis ce que l'athlete souleve deja ».
  //
  // Mesure sur le catalogue au moment du correctif : 2 189 exercices etaient
  // mis en deload, dont 122 par un vrai mot (deload, recuperation) et 2 067
  // par le seul isLight — un faux positif 17 fois plus frequent que le vrai
  // cas. Le mot n'a souvent meme pas valeur de consigne de charge : « coudes
  // LEGEREMENT flechis » (DB Fly, arnold_split_beurt) normalise en `leger` et
  // suffisait a declencher la reduction.
  //
  // Cas reel qui a fait remonter le defaut, trace complete de phase2_fable5 :
  // Cuban Press, bloc « socle fixe », note « Leger et lent. Rotation externe
  // complete a chaque rep. » L'athlete faisait 15 lb x 10 @ RPE 7,5 depuis
  // trois semaines, le programme ecrivait 15-25 lb, le moteur proposait 10 lb
  // — sous le minimum ecrit ET sous ce qu'il soulevait — pendant les huit
  // semaines du cycle. Sur ces huit semaines, AUCUN des deloads appliques
  // n'etait un vrai deload.
  //
  // Aucun deload legitime n'est perdu : ils se declarent tous par le mot
  // (ligne ci-dessous) ou par le libelle de semaine (plus bas).
  if(context&&context.isRecovery)return true;
  var raw=[context&&context.primaryIntent,context&&context.kind,context&&context.blockTitle,context&&context.note,context&&context.text,context&&context.format].filter(Boolean).join(' ');
  var n=(typeof coachNormalizeMoveText==='function')?coachNormalizeMoveText(raw):String(raw||'').toLowerCase();
  if(/deload|recuperation|recovery|reset/.test(n))return true;
  try{
    var wi=(typeof buildWeekInfo==='function'&&weekNum)?buildWeekInfo()[weekNum]:null;
    var weekText=(wi&&((wi.label||'')+' '+(wi.goal||'')))||'';
    var wn=coachNormalizeMoveText(weekText);
    if(/deload|facile|easy|recuperation|recovery|reset/.test(wn))return true;
  }catch(e){}
  return false;
}

// Une semaine de deload se declare dans son libelle ou son objectif
// (buildWeekInfo), pas dans le texte de l'exercice. Le contexte enregistre
// avec un resultat ne lisait que l'exercice : une seance de semaine deload
// partait donc dans l'historique comme une seance normale, remplacait la
// capacite du mouvement et faisait redescendre la reprise. On pose ici,
// A LA SAUVEGARDE, le marqueur recuperation deja lu partout (isRecovery,
// intention 'recovery') : aucun champ nouveau, aucun format change.
function coachMarkDeloadResultContext(ctx){
  if(!ctx||ctx.isRecovery)return ctx;
  if(!coachIsDeloadWeekOrContext(ctx))return ctx;
  ctx.isRecovery=true;
  ctx.intents=Array.isArray(ctx.intents)?ctx.intents.slice():[];
  if(ctx.intents.indexOf('recovery')<0)ctx.intents.unshift('recovery');
  ctx.primaryIntent='recovery';
  return ctx;
}

function coachIsMainLoadContext(label,context){
  var raw=[label,context&&context.kind,context&&context.primaryIntent,context&&context.blockTitle].filter(Boolean).join(' ');
  var n=coachNormalizeMoveText(raw);
  var T=window.COACH_MOVEMENT_TUNING||{};
  if(coachMatchesAnyTuningPattern(n, T.mainLoadKeywordPatterns))return true;
  if(coachMatchesAnyTuningPattern(coachNormalizeMoveText(label), T.mainLoadMovementPatterns)&&!isIsolationMovement(label))return true;
  return false;
}

function coachDeloadMultiplierForContext(label,context){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.deloadMultiplier)||{main:0.85,other:0.80};
  return coachIsMainLoadContext(label,context)?T.main:T.other;
}

function coachRecentPeakLoad(history,label,context){
  var peak=0;
  (Array.isArray(history)?history:[]).forEach(function(row){
    if(!coachHistoryHasValidLoad(row,label,context))return;
    var load=coachHistoryLoadNumber(row);
    if(load>peak)peak=load;
  });
  return peak||0;
}

function coachApplyDeloadCap(suggested,label,context,history,lastLoad,bestControlled,programNum){
  if(!coachIsDeloadWeekOrContext(context))return {value:suggested,changed:false,reason:''};
  var base=0;
  if(lastLoad||lastLoad===0)base=lastLoad;
  if(!(base>0)&&bestControlled&&bestControlled.load)base=bestControlled.load;
  if(!(base>0)&&programNum)base=programNum;
  if(!(base>0))return {value:suggested,changed:false,reason:''};
  var mult=coachDeloadMultiplierForContext(label,context);
  var cap=base*mult;
  var peak=coachRecentPeakLoad(history,label,context);
  if(peak&&cap>=peak)cap=peak*mult;
  var next=Math.min(Number(suggested)||0,cap);
  if(next<suggested){
    return {value:next,changed:true,reason:'Deload actif : charge finale reduite a environ '+Math.round(mult*100)+'% de la derniere reference fiable, sous le peak recent.'};
  }
  return {value:suggested,changed:false,reason:''};
}

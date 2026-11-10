// @ts-check
// Coach Beurt - moteur de suggestions de charges : construction du contexte de decision.
// Script global volontaire : pas de ES modules. Extrait de suggestion.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

function coachBuildSuggestionContext(nameOrKey,currentLoad,targetReps,context){
  var moveContext=(context&&context.label)?context:((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(nameOrKey,context||{}):null);
  var label=moveContext&&moveContext.label?moveContext.label:canonicalMovementLabel(nameOrKey);
  // Profil sans calibration : on ne bloque plus si son NIVEAU permet une
  // estimation bornée (cf. coachUncalibratedLevelRatio dans scaling.js). La
  // suggestion suit alors le chemin normal — mise à l'échelle, plancher
  // historique, prudence RPE, arrondi équipement — et ressort marquée
  // « surveillance » : c'est une estimation, pas une capacité mesurée.
  // Le blocage reste pour le seul cas où aucun repère n'existe.
  var uncalibrated=(typeof coachProfileNeedsCalibration==='function')&&coachProfileNeedsCalibration();
  if(uncalibrated){
    var levelRatio=(typeof coachUncalibratedLevelRatio==='function')?coachUncalibratedLevelRatio():0;
    if(!(levelRatio>0)){
      var calibrationMessage='Profil non calibré : complète la calibration avant d’utiliser les charges suggérées.';
      return {early:true,decision:{label:label,loadNum:null,loadText:calibrationMessage,blocked:true,severity:'watch',reason:'Profil client sans calibration.'}};
    }
  }
  var target=Number(targetReps)||8;
  var mv=athleteMovementRecord(label);
  var range=repRange(target);
  var cap=mv&&mv.ranges?(mv.ranges[range]||null):null;
  var histAll=(mv&&Array.isArray(mv.history))?mv.history:[];
  var hist=(typeof coachFilterHistoryForProgression==='function')?coachFilterHistoryForProgression(histAll,moveContext):histAll;

  hist=hist.filter(function(row){
    if(coachIsImplausibleLoadRow(label,row,target)){
      if(typeof coachLogWarn==='function')coachLogWarn('plausibility_filter', label+' : charge ignoree ('+coachHistoryLoadNumber(row)+' lb) — invraisemblable vs seed profil');
      return false;
    }
    return true;
  });

  var last=hist.length?hist[hist.length-1]:null;
  var lastLoad=coachHistoryLoadNumber(last);
  var lastHasValidLoad=last?coachHistoryHasValidLoad(last,label,moveContext):false;
  var lastRpe=last?coachHistoryRpeNumber(last):0;
  var bestControlled=coachRecentBestControlledLoad(hist,8.5,label,moveContext);
  var historySignal=(typeof coachBuildMovementHistorySignal==='function')?coachBuildMovementHistorySignal(label,hist,moveContext,target):null;
  // Charge ecrite en POURCENTAGE du 1RM (« 60-65 % », « ~60 % ») : ce ne sont
  // pas des livres. parseLoad() y attrape le premier nombre — « 75-82 % »
  // devenait 75 lb pour un Push Press a 75-82 % du 1RM, puis etait encore
  // multiplie par le ratio de profil. Un pourcentage se resout contre la
  // capacite reelle de l'athlete ; sans ancre fiable il ne vaut RIEN, et la
  // charge repart du chemin « non numerique » (historique, puis reperes) —
  // strictement mieux qu'un nombre de livres invente.
  var percentTarget=(typeof coachPercentTargetFromText==='function')
    ? ((moveContext&&moveContext.percentTarget)||coachPercentTargetFromText(currentLoad))
    : null;
  var percentAnchor=null;
  var programNum;
  // Plafond pose par le TEXTE du programme (« bande ou cable leger »). Zero
  // quand le programme ecrit un nombre : ce nombre EST la prescription.
  var writtenLoadCeiling=0;
  // L'historique reel decide, le ratio ne fait que combler son absence. Un
  // mouvement deja travaille n'a pas besoin d'un emprunt a ses voisins pour
  // savoir ce que l'athlete souleve : il le sait. Un mouvement vierge, lui,
  // n'a que l'emprunt — et c'est la que la bande resserree protege.
  var hasRealHistoryForScale=hist.some(function(r){return coachHistoryHasValidLoad(r,label,moveContext);});
  var scaleInfo=null;
  if(percentTarget){
    percentAnchor=coachStrengthAnchorOneRm(label,mv);
    programNum=(percentAnchor&&percentAnchor.oneRm>0)
      ? roundLoadForExercise(label,percentAnchor.oneRm*percentTarget.aim,'nearest',currentLoad)
      : null;
  }else{
    programNum=parseLoad(currentLoad);
    if(programNum!==null&&programNum!==undefined){
      if(typeof coachScaleProgramLoad==='function'){
        scaleInfo=coachScaleProgramLoad(label,programNum,hasRealHistoryForScale);
        programNum=scaleInfo.load;
      }else{
        programNum=coachApplyUserLoadScale(label,programNum);
      }
    }
  }
  var originalText=displayLoadForEquipment(label,currentLoad);
  var contextLimited=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(moveContext):false;
  var contextLimitReason=(typeof coachContextProgressionReason==='function')?coachContextProgressionReason(moveContext):'';
  var isDeload=coachIsDeloadWeekOrContext(moveContext);
  var seedReason="Charge du programme, arrondie selon l'equipement.";
  // Une serie technique, legere ou de WOD dit « au moins ce poids », jamais
  // « au plus ». Quand elle est la SEULE evidence d'un mouvement principal
  // (admise a poids reduit par le repli de coachFilterHistoryForProgression),
  // elle ne sert plus d'ancre au saut maximal, aux freins ni au portail Brain :
  // le programme mis a l'echelle du profil reprend la main, comme pour un
  // mouvement vierge. Cas mesure : Bench Press 5x3 de Pont Peak S4, programme
  // 195 lb x ratio 1,22 = 238 lb, ramene a 155 lb par l'unique serie loggee —
  // 155 x 5 d'un bloc technique « ≈65-70 % de tes charges habituelles ».
  var limitedOnlyEvidence=!contextLimited&&!isDeload&&hist.length>0&&hist.every(function(r){
    return coachHistoryWeight(r)<1&&coachHistoryContextIsLimited(r);
  });
  // Un emprunt reste un emprunt, et l'athlete a le droit de le savoir : sans
  // cette phrase, 250 lb tires d'une moyenne de famille sortaient avec le meme
  // libelle qu'une charge mesuree sur lui.
  if(scaleInfo&&scaleInfo.borrowed&&scaleInfo.ratio!==1&&programNum!==null&&programNum!==undefined){
    seedReason="Charge du programme mise a ton echelle par emprunt ("+scaleInfo.source
      +") : aucune seance loggee sur ce mouvement.";
    if(scaleInfo.clamped){
      seedReason+=" Ratio emprunte "+scaleInfo.rawRatio.toFixed(2)+" ramene a "
        +scaleInfo.ratio.toFixed(2)+" — hors de la bande de confiance d'un ratio non prouve.";
    }
    seedReason+=" Ta premiere seance reelle reprend la main.";
  }
  if(percentTarget&&programNum!==null&&programNum!==undefined){
    seedReason="Charge du programme en pourcentage ("+Math.round(percentTarget.aim*100)+" % du 1RM) resolue sur ta capacite reelle : "
      +Math.round(percentAnchor.oneRm)+" lb estimes (source "+percentAnchor.source+").";
  }
  if(programNum===null||programNum===undefined){
    // Déclaration rétablie : le refactor du filtre de vraisemblance
    // (coachIsImplausibleLoadRow) avait supprimé ce var mais laissé son usage
    // ci-dessous — ReferenceError pour tout profil sans historique sur un
    // mouvement à charge texte (« Poids du corps »…), vue de séance cassée.
    var genericSeedForFilter=coachDefaultLoadSeedForMovement(label,target);
    var seedFromReal=lastHasValidLoad?lastLoad:(((bestControlled&&bestControlled.load)||bestControlled&&bestControlled.load===0)?bestControlled.load:null);
    var seed;
    if(seedFromReal||seedFromReal===0){
      seed=seedFromReal;
    }else{
      seed=(genericSeedForFilter||genericSeedForFilter===0)?coachApplyUserLoadScale(label,genericSeedForFilter):null;
    }
    if(seed||seed===0){
      programNum=seed;
      seedReason=lastHasValidLoad
        ? "Charge de programme non numerique : suggestion basee sur la derniere charge historique."
        : ((bestControlled&&(bestControlled.load||bestControlled.load===0))
          ? "Charge de programme non numerique : suggestion basee sur l'historique controle."
          : "Charge de programme non numerique : suggestion basee sur les reperes d'equipement, ajustee a ton profil.");
      // Le programme n'a pas ecrit un nombre, mais il a ecrit quelque chose :
      // « bande ou cable leger ». Rien ne le lisait, et le moteur retombait sur
      // la derniere charge loggee — 70 lb pour un Pallof Press decrit comme
      // leger. Le plafond vient de l'EQUIPEMENT ECRIT, pas du profil : un
      // athlete fort ne rend pas une bande plus lourde, et une consigne
      // « leger » reste une consigne meme quand l'historique dit plus.
      var writtenCeiling=(typeof coachWrittenLoadCeiling==='function')
        ? coachWrittenLoadCeiling(label,currentLoad,moveContext&&moveContext.note)
        : null;
      if(writtenCeiling>0&&programNum>writtenCeiling){
        seedReason="Charge de programme non numerique et declaree legere : plafonnee a "
          +writtenCeiling+" lb par le repere d'equipement ecrit ("
          +(displayLoadForEquipment(label,currentLoad)||String(currentLoad||'').trim())
          +"), pas par ton profil.";
        programNum=roundLoadForExercise(label,writtenCeiling,'down',currentLoad)||writtenCeiling;
      }
      if(writtenCeiling>0)writtenLoadCeiling=writtenCeiling;
    }else{
      storeLoadDecisionHint(label,originalText,"Charge non numerique et aucun historique/repere fiable trouve.","watch",hist,moveContext,'reperes');
      return {early:true,decision:{label:label,loadText:originalText,loadNum:null,severity:"watch",reason:"Charge non numerique et aucun historique/repere fiable trouve.",last:last,cap:cap}};
    }
  }

  return {early:false, ctx:{
    nameOrKey:nameOrKey, currentLoad:currentLoad, moveContext:moveContext, label:label,
    target:target, mv:mv, range:range, cap:cap, histAll:histAll, hist:hist,
    last:last, lastLoad:lastLoad, lastHasValidLoad:lastHasValidLoad&&!limitedOnlyEvidence, lastRpe:lastRpe,
    limitedOnlyEvidence:limitedOnlyEvidence,
    bestControlled:bestControlled, historySignal:historySignal, programNum:programNum,
    originalText:originalText, contextLimited:contextLimited, contextLimitReason:contextLimitReason,
    isDeload:isDeload, suggested:programNum, severity:"ok", reason:seedReason, mode:"nearest",
    // Provenance de la mise a l'echelle : emprunt ou mesure, bornee ou non.
    // Nul quand l'historique reel a decide — c'est justement l'information.
    scaleInfo:scaleInfo, hasRealHistory:hasRealHistoryForScale,
    // Plafond pose par le TEXTE du programme (« bande ou cable leger »), pas
    // par le profil : une consigne ecrite reste une consigne.
    writtenLoadCeiling:writtenLoadCeiling,
    // Vrai quand aucune ligne de meme nature n'existait et que le moteur
    // travaille sur des seances admises a poids reduit.
    historyWeighted:hist.some(function(r){return coachHistoryWeight(r)<1;}),
    // brainAdjusted — Trace explicite : passe a true chaque fois qu'une regle
    // depassant le simple arrondi equipement intervient (historique, RPE,
    // deload, cap contextuel). Remplace la detection par mots-cles sur
    // `reason` faite plus loin dans storeLoadDecisionHint : la source est ici
    // un fait connu, pas une supposition.
    brainAdjusted:false,
    // Profil sans calibration ayant reçu une estimation de niveau. La
    // suggestion sort du moteur normalement, mais elle ne doit jamais se
    // présenter comme une capacité mesurée : marquée en finalisation.
    uncalibrated:uncalibrated
  }};
}

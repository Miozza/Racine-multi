// @ts-check
// Coach Beurt - moteur de suggestions de charges : classement des resultats et mise a jour d'athlete_state.
// Script global volontaire : pas de ES modules. Extrait de suggestion.js
// sans changement de logique (voir docs/STRUCTURE_CONTRACT.md, Domaine charge).

function plannedMapFromSessionExercises(){
  var map={};
  try{
    collectSessionExercises().forEach(function(it){
      if(!it||it.isWod)return;
      var label=movementLabelFromKeyOrName(it.key||it.name);
      var plannedLoad=parseLoad(it.suggested);
      var targetMin=Number(it.targetMin)||0;
      var targetMax=Number(it.targetMax)||targetMin||0;
      var ctx=(typeof coachBuildMovementContext==='function'?coachBuildMovementContext(it.name||it.key,{kind:it.kind,format:it.format,note:it.note,text:it.text,blockTitle:it.blockTitle,load:it.load,pctOf1RM:it.pctOf1RM,day:(state&&state.day),week:(state&&state.week)}):null);
      coachMarkDeloadResultContext(ctx);
      map[it.key]={name:label,load:plannedLoad,reps:targetMin||targetMax, targetMin:targetMin, targetMax:targetMax, format:it.format||"", kind:it.kind||"", context:ctx, bodyweightMovement:(typeof coachIsBodyweightExternalLoadMovement==='function'?coachIsBodyweightExternalLoadMovement(label,ctx):false)};
      map[label]=map[it.key];
      map[normalizeExerciseName(label)]=map[it.key];
    });
  }catch(e){}
  return map;
}

function classifyPerformance(actual, planned){
  var load=parseLoad(actual.load), reps=Number(actual.reps)||0, rpe=Number(actual.rpe)||0;
  var label=(planned&&planned.name)||(actual&&actual.name)||'';
  var bodyweightMovement=!!(planned&&planned.bodyweightMovement) || (typeof coachIsBodyweightExternalLoadMovement==='function'&&coachIsBodyweightExternalLoadMovement(label,planned&&planned.context));
  var hasLoad=(load>0)||(load===0&&bodyweightMovement);
  var targetReps=Number((planned&&planned.reps)||actual.targetMin||actual.targetMax)||reps||1;
  var ratio=targetReps?reps/targetReps:1;
  var status="logged";
  // Echec total : la charge a ete engagee et aucune rep n'est sortie. C'est le
  // signal d'echec le plus fort qui existe, et il ne depend pas du RPE saisi —
  // l'athlete qui repose la barre ne pense pas toujours a noter 10. Sans cette
  // branche, un 0 rep restait "logged", donc non memorise par
  // updateAthleteStateFromResults(), et le moteur reproposait la charge exacte
  // qui venait d'echouer.
  if(hasLoad&&!reps)status="major_fail";
  else if(hasLoad&&reps&&rpe>=9.5&&ratio<0.60)status="major_fail";
  else if(hasLoad&&reps&&rpe>=9&&ratio<1)status="failed";
  else if(hasLoad&&reps&&rpe<=7&&ratio>=1)status="easy_success";
  else if(hasLoad&&reps&&rpe>=9)status="hard_success";
  else if(hasLoad&&reps)status="success";
  return {status:status,ratio:Math.round(ratio*100)/100,targetReps:targetReps};
}

// Classement d'une ligne de resultat par rapport a ce qui etait prescrit.
// Extrait de enrichSessionResults() pour rester la seule ecriture de status /
// performanceRatio / coachNote : une correction de seance passee
// (scripts/session/history_edit.js) doit reclasser exactement comme la saisie
// du jour, sans recopier ces regles ailleurs.
// Ligne marquee « Non fait » (scripts/session/wod_skip.js, V5.4.0). Lue ici
// par son seul champ, sans dependre du domaine session : le moteur doit rester
// testable seul. Meme lecture que CoachWodSkip.rowIsSkipped.
function coachResultRowIsSkipped(r){
  if(!r)return false;
  var v=String(r.skipped===undefined||r.skipped===null?'':r.skipped).toLowerCase();
  return v==='1'||v==='true'||v==='oui';
}
// Un mouvement saute n'est PAS un echec : il n'est jamais classe. Sans cette
// garde, la charge suggeree pre-remplie + 0 rep donnait major_fail
// (classifyPerformance), donc recalibrage et progression bloquee.
function coachClearPerformanceClassification(r){
  if(!r)return r;
  delete r.status;delete r.performanceRatio;delete r.coachNote;
  return r;
}

function applyPerformanceClassification(r, planned){
  if(!r||!planned)return r;
  if(coachResultRowIsSkipped(r))return coachClearPerformanceClassification(r);
  var c=classifyPerformance(r,planned);
  r.status=c.status;r.performanceRatio=c.ratio;
  if(c.status==="major_fail")r.coachNote="Echec majeur : niveau probablement surestime aujourd'hui. Recalibrage requis.";
  else if(c.status==="failed")r.coachNote="Echec partiel : ne pas monter la charge avant confirmation.";
  else if(r.coachNote!==undefined)delete r.coachNote;
  return r;
}

function enrichSessionResults(results){
  var plan=plannedMapFromSessionExercises();
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod)return;
    var skipped=coachResultRowIsSkipped(r);
    if(!skipped&&(r.load===undefined||r.load===null||r.load===''))return;
    var lookup=plan[key]||plan[movementLabelFromKeyOrName(key)]||plan[normalizeExerciseName(key)]||null;
    if(skipped){
      // La ligne garde ce qui ETAIT prevu (on doit savoir lequel n'a pas ete
      // fait), jamais un classement.
      if(lookup&&String(key).indexOf('wod_')!==0)r.planned={load:lookup.load||null,reps:lookup.reps||null,targetMin:lookup.targetMin||null,targetMax:lookup.targetMax||null,format:lookup.format||"",kind:lookup.kind||"",context:lookup.context||null,bodyweightMovement:lookup.bodyweightMovement||false};
      coachClearPerformanceClassification(r);
      return;
    }
    if(lookup){
      r.planned={load:lookup.load||null,reps:lookup.reps||null,targetMin:lookup.targetMin||null,targetMax:lookup.targetMax||null,format:lookup.format||"",kind:lookup.kind||"",context:lookup.context||null,bodyweightMovement:lookup.bodyweightMovement||false};
      applyPerformanceClassification(r,lookup);
    }
  });
  return results;
}

function updateAthleteStateFromResults(results,dateStr){
  var ast=ensureAthleteState();
  dateStr=dateStr||new Date().toLocaleDateString("fr-CA");
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod||r.load===undefined||r.load===null||r.load==='')return;
    // Non fait : aucune capacite a apprendre, rien a recalibrer.
    if(coachResultRowIsSkipped(r))return;
    var load=parseLoad(r.load), reps=Number(r.reps)||0, rpe=Number(r.rpe)||0;
    var label=movementLabelFromKeyOrName(key);
    var planned=r.planned||{};
    var resultContext=planned.context||((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(label,{kind:planned.kind,format:planned.format,day:(state&&state.day),week:(state&&state.week)}):null);
    coachMarkDeloadResultContext(resultContext);
    var bodyweightMovement=!!planned.bodyweightMovement || (typeof coachIsBodyweightExternalLoadMovement==='function'&&coachIsBodyweightExternalLoadMovement(label,resultContext));
    var hasValidLoad=(load>0)||(load===0&&bodyweightMovement);
    // Un 0 rep n'est un echec que s'il a ete SAISI. Un champ reps absent est une
    // ligne incomplete, pas une tentative ratee : on continue de l'ignorer.
    var repsProvided=(r.reps!==undefined&&r.reps!==null&&String(r.reps).trim()!=='');
    var failedAttempt=hasValidLoad&&!reps&&repsProvided;
    if(!hasValidLoad||(!reps&&!failedAttempt))return;
    var limitedResultContext=(typeof coachIsLimitedProgressionContext==='function')?coachIsLimitedProgressionContext(resultContext):false;
    var targetReps=Number(planned.reps||planned.targetMin)||reps;
    // La plage vient des reps PRESCRITES quand rien n'est sorti : repRange(0)
    // renverrait "strength" et classerait un 8-reps rate dans la mauvaise plage.
    // Sans prescription connue (mouvement hors programme, resultat non enrichi),
    // on classe dans la plage ou le mouvement est REELLEMENT travaille — sa fiche
    // la plus recente. Une plage par defaut ferait atterrir le cap a cote : un
    // Back Squat travaille en force verrait son echec classe en hypertrophie, et
    // la suggestion des 5 reps ignorerait le cap.
    var range;
    if(reps||targetReps){
      range=repRange(reps||targetReps);
    }else{
      var knownRanges=(ast.movements[label]&&ast.movements[label].ranges)||{};
      var newestRange="",newestRangeDate="";
      Object.keys(knownRanges).forEach(function(rk){
        var d=String((knownRanges[rk]&&knownRanges[rk].lastUpdated)||"");
        if(!newestRange||d>newestRangeDate){newestRange=rk;newestRangeDate=d;}
      });
      range=newestRange||repRange(8);
    }
    var cls=classifyPerformance(r,{name:label,context:resultContext,bodyweightMovement:bodyweightMovement,reps:targetReps,targetMin:planned.targetMin,targetMax:planned.targetMax});
    var oneRM=epley1RM(load,reps);
    var capacityLoad=load;
    var confidence=0.65;
    var status=cls.status;
    if(failedAttempt){
      // Epley n'a aucun signal ici (epley1RM(load,0)=0) : le laisser piloter la
      // recalibration ecrirait une capacite de 0 lb dans athlete_state. On
      // repart de la meilleure charge recente REELLEMENT maitrisee sous la
      // charge echouee ; sans historique exploitable, repli prudent sur un
      // pourcentage de la charge tentee (COACH_MOVEMENT_TUNING).
      var prevMv=ast.movements[label];
      var controlled=(typeof coachRecentBestControlledLoad==='function')
        ? coachRecentBestControlledLoad((prevMv&&prevMv.history)||[], 8.5, label, resultContext)
        : null;
      var fallbackPct=((window.COACH_MOVEMENT_TUNING||{}).failedAttemptMultiplier)||0.80;
      var recovered=(controlled&&controlled.load>0&&controlled.load<load)?controlled.load:(load*fallbackPct);
      capacityLoad=roundLoadForExercise(label, recovered, "down")||roundLoadForExercise(label, recovered, "nearest")||load;
      confidence=0.30;
      status="recalibrating";
    }else if(cls.status==="major_fail"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.35;
      status="recalibrating";
    }else if(cls.status==="failed"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.50;
      status="watch";
    }else if(cls.status==="easy_success"){
      // Symetrie avec les branches d'echec ci-dessus : elles projettent deja
      // Epley vers le BAS quand les reps manquent. Une serie qui DEPASSE la
      // cible a RPE bas prouve, avec le meme calcul, une capacite superieure
      // a la charge portee — 135 lb x 5 pour 2 reps demandees vaut ~148 lb
      // sur 2 reps. Ecrire `load` tel quel effacait cette preuve : la memoire
      // de capacite restait a 135 lb et la seance suivante repartait de la.
      // Bornee au saut maximal prudent : une seule seance ne redefinit pas
      // une capacite d'un bond.
      capacityLoad=load;
      if(reps>targetReps&&targetReps>0&&oneRM){
        var surplusCapacity=estimateLoadForRepsFrom1RM(oneRM,targetReps);
        var surplusCeiling=load+((typeof coachMaxJumpForExercise==='function')?coachMaxJumpForExercise(label,load):10);
        if(surplusCapacity>load){
          var boundedCapacity=Math.min(surplusCapacity,surplusCeiling);
          capacityLoad=roundLoadForExercise(label,boundedCapacity,"down")||load;
          if(capacityLoad<load)capacityLoad=load;
        }
      }
      confidence=0.85;
      status="upgrade_ready";
    }else if(cls.status==="hard_success"){
      capacityLoad=load;
      confidence=0.70;
      status="hard";
    }
    if(!ast.movements[label]){
      ast.movements[label]={ranges:{},history:[],lastUpdated:null,status:"new"};
    }
    var mv=ast.movements[label];
    mv.ranges=mv.ranges||{};mv.history=mv.history||[];
    var prev=mv.ranges[range]||{};
    var prevMissing=!(prev.currentLoad||prev.currentLoad===0);
    var shouldReplace = prevMissing || cls.status==="major_fail" || cls.status==="failed" || load>=Number(prev.currentLoad||0) || confidence>Number(prev.confidence||0);
    if(shouldReplace && !limitedResultContext){
      mv.ranges[range]={
        currentLoad:capacityLoad,
        currentReps:targetReps,
        actualLoad:load,
        actualReps:reps,
        externalLoad:load,
        bodyweightMovement:bodyweightMovement,
        hasValidLoad:true,
        rpe:rpe,
        confidence:confidence,
        status:status,
        // Un echec total donne oneRM=0 : ne pas ecraser la derniere estimation
        // valide par un zero, qui ferait passer le mouvement pour inconnu. A
        // defaut d'estimation stockee (fiche ancienne ou migree), on la reconstruit
        // depuis la derniere performance reelle de la plage.
        estimated1RM:oneRM
          ?Math.round(oneRM)
          :(Number(prev.estimated1RM)||Math.round(epley1RM(Number(prev.actualLoad)||0,Number(prev.actualReps)||0))||0),
        lastUpdated:dateStr,
        planned:planned||null
      };
    }
    mv.status=status;
    mv.upgradedAt = (cls.status==="easy_success"||cls.status==="success"||cls.status==="hard_success") ? dateStr : (mv.upgradedAt||null);
    mv.lastUpdated=dateStr;
    mv.history.push({date:dateStr,load:load,externalLoad:load,bodyweightMovement:bodyweightMovement,hasValidLoad:true,reps:reps,rpe:rpe,range:range,status:limitedResultContext?'context_logged':status,capacityLoad:capacityLoad,planned:planned||null,context:resultContext||null});
    if(mv.history.length>12)mv.history=mv.history.slice(-12);
  });
  ast.updatedAt=nowIso();ast.version=APP_VERSION;
}

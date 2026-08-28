// @ts-check
// scripts/charge/trace.js
// Racine — extraction de l'historique AVEC ce que le moteur en a fait.
//
// POURQUOI CE FICHIER EXISTE
// « Je retrouve toutes mes seances dans Historique, mais le (!) n'en montre
// qu'une, et le moteur propose encore la charge du programme. » Ce symptome
// n'est pas diagnosticable depuis l'exterieur : entre la seance loggee et la
// charge proposee, plusieurs filtres peuvent ecarter une ligne — sans jamais
// le dire. Le panneau (!) explique la DECISION ; il ne dit pas ce qui n'a
// jamais atteint la decision.
//
// La trace repond a une seule question, ligne par ligne :
//   « cette seance a-t-elle compte dans la suggestion, et sinon, POURQUOI ? »
//
// Quatre couches peuvent ecarter une ligne, dans cet ordre :
//   1. ligne marquee invraisemblable (`row.implausible`) ;
//   2. seed manuel (PR, recalibration, override) — stocke mais jamais lu
//      comme une seance (coachIsNonPerformanceSeed) ;
//   3. NATURE DE CONTEXTE differente : le filtre de progression ne compare
//      que des lignes de meme nature (contexte limite vs non limite). Une
//      semaine dont la note declenche « technique » ecarte donc TOUT
//      l'historique des semaines normales — c'est le cas qui a motive ce
//      fichier ;
//   4. cle de contexte differente, quand le mouvement exige un contexte
//      identique (coachShouldPreferContextMatch).
//   5. charge jugee invraisemblable face au repere du profil.
//
// RECONSTITUTION
// Racine ne stocke pas la suggestion faite le jour meme. La trace la
// RECONSTITUE : pour chaque seance, elle rejoue le moteur avec les seules
// lignes anterieures. C'est une reconstitution, pas un enregistrement — le
// numero de semaine et le profil sont ceux d'aujourd'hui — et elle est
// etiquetee comme telle. Lecture seule : aucun etat, aucune memoire Brain,
// aucun fichier data/ n'est touche.

(function(){
  var api = window.CoachChargeTrace = window.CoachChargeTrace || {};
  var MAX_ROWS = 20;

  function norm(s){
    if(typeof coachNormalizeMoveText==='function')return coachNormalizeMoveText(s);
    return String(s||'').toLowerCase().trim();
  }
  function rowContext(row){
    if(typeof coachHistoryContext==='function')return coachHistoryContext(row);
    return (row&&(row.context||(row.planned&&row.planned.context)))||null;
  }
  function limited(ctx){
    return (typeof coachIsLimitedProgressionContext==='function')?!!coachIsLimitedProgressionContext(ctx):false;
  }
  function intentsOf(ctx){
    return (ctx&&Array.isArray(ctx.intents))?ctx.intents.slice():[];
  }
  function num(v){
    var n=(typeof parseLoad==='function')?parseLoad(v):Number(v);
    return (n||n===0)?Number(n):null;
  }

  // Ce que le moteur RETIENT vraiment, demande au moteur lui-meme.
  //
  // rowVerdict ci-dessous re-implemente les regles d'ecart pour pouvoir les
  // NOMMER — c'est la raison d'etre de la trace. Mais deux implementations
  // d'une meme regle derivent : depuis que le filtre admet les lignes d'un
  // autre contexte a poids reduit quand aucune ligne de meme nature n'existe,
  // la copie locale annoncait encore « 0 ligne retenue » la ou le moteur en
  // lisait six. Le verdict de retenue vient donc desormais du filtre reel, et
  // rowVerdict ne sert plus qu'a expliquer POURQUOI une ligne pese moins.
  function keptSetFor(hist,label,ctx){
    var set=(typeof Set==='function')?new Set():null;
    var weights=(typeof Map==='function')?new Map():null;
    if(typeof coachFilterHistoryForProgression!=='function')return {set:null,weights:null};
    var kept=coachFilterHistoryForProgression(hist,ctx)||[];
    kept.forEach(function(r){
      // Une ligne admise a poids reduit est une COPIE (Object.create) : la
      // ligne stockee est son prototype.
      var origin=(r&&Object.prototype.hasOwnProperty.call(r,'__coachWeight'))?Object.getPrototypeOf(r):r;
      if(set)set.add(origin);
      if(weights)weights.set(origin,(typeof coachHistoryWeight==='function')?coachHistoryWeight(r):1);
    });
    return {set:set,weights:weights};
  }

  // Le coeur : pourquoi cette ligne est-elle retenue, ou ecartee ?
  function rowVerdict(row,label,currentCtx,targetReps){
    if(row&&row.implausible)return {kept:false,reason:'Ligne marquee invraisemblable a la sauvegarde.'};
    if(typeof coachIsNonPerformanceSeed==='function'&&coachIsNonPerformanceSeed(row)){
      return {kept:false,reason:'Seed manuel ('+((row.planned&&row.planned.source)||'manuel')+') : garde pour l\'affichage, jamais lu comme une seance.'};
    }
    if(typeof coachIsImplausibleLoadRow==='function'&&coachIsImplausibleLoadRow(label,row,targetReps)){
      return {kept:false,reason:'Charge jugee invraisemblable face au repere du profil pour ce mouvement.'};
    }
    var rCtx=rowContext(row);
    if(rCtx&&currentCtx){
      var rLim=limited(rCtx), cLim=limited(currentCtx);
      if(rLim!==cLim){
        return {kept:false,reason:'Nature de contexte differente : la ligne est '
          +(rLim?'limitee ['+intentsOf(rCtx).join(',')+']':'normale')
          +' et la seance du jour est '
          +(cLim?'limitee ['+intentsOf(currentCtx).join(',')+']':'normale')
          +'. Le filtre de progression ne melange pas les deux.'};
      }
      if(typeof coachContextMatches==='function'&&!coachContextMatches(rCtx,currentCtx,label)){
        return {kept:false,reason:'Cle de contexte differente pour un mouvement qui exige un contexte identique.'};
      }
    }
    return {kept:true,reason:''};
  }

  // Rejoue le moteur avec les seules lignes anterieures a `index`.
  // Lecture seule : l'historique est remis en place et les indices du panneau
  // (!) sont restaures, quoi qu'il arrive.
  function replayAt(mv,index,label,ctx,targetReps,programLoad){
    if(!mv||typeof guardedSuggestedLoadDecision!=='function')return null;
    var full=mv.history;
    try{
      mv.history=full.slice(0,index);
      var d=guardedSuggestedLoadDecision(label,programLoad,targetReps,ctx);
      return {propose:(d&&(d.loadNum||d.loadNum===0))?d.loadNum:null, texte:(d&&d.loadText)||'', severite:(d&&d.severity)||'', raison:(d&&d.reason)||''};
    }catch(e){
      return {propose:null, texte:'', severite:'', raison:'Reconstitution impossible : '+(e&&e.message)};
    }finally{
      mv.history=full;
    }
  }

  // Les indices du panneau (!) sont ecrits EN PLACE par storeLoadDecisionHint,
  // et sous tous les alias du mouvement. Garder la reference de l'objet ne
  // protege donc rien : il faut en copier le contenu avant, et le reposer
  // apres. Sans ca, une reconstitution — calculee sur un historique tronque —
  // resterait affichee dans le (!) si la suggestion finale echouait.
  function snapshotHints(){
    var h=window.__coachLoadHints;
    return h?Object.assign({},h):h;
  }
  function restoreHints(snap){
    window.__coachLoadHints=snap;
  }

  // Trace complete d'un mouvement dans le contexte ou il est prescrit.
  api.movement = function(nameOrLabel, opts){
    opts=opts||{};
    var label=(typeof canonicalMovementLabel==='function')?canonicalMovementLabel(nameOrLabel):String(nameOrLabel||'');
    var ctx=opts.context||((typeof coachBuildMovementContext==='function')?coachBuildMovementContext(nameOrLabel,opts):null);
    var target=Number(opts.targetReps)||8;
    var programLoad=(opts.programLoad!==undefined&&opts.programLoad!==null)?opts.programLoad:'';
    var mv=(typeof athleteMovementRecord==='function')?athleteMovementRecord(label):null;
    var hist=(mv&&Array.isArray(mv.history))?mv.history:[];
    var start=Math.max(0,hist.length-MAX_ROWS);

    var rows=[], kept=0, drops={};
    var real=keptSetFor(hist,label,ctx);
    var hintsBefore=snapshotHints();
    for(var i=start;i<hist.length;i++){
      var row=hist[i];
      var v=rowVerdict(row,label,ctx,target);
      // Le filtre reel a le dernier mot sur la RETENUE ; rowVerdict garde le
      // dernier mot sur l'EXPLICATION.
      var reallyKept=real.set?real.set.has(row):v.kept;
      var rowWeight=(real.weights&&real.weights.has(row))?real.weights.get(row):(reallyKept?1:0);
      if(reallyKept)kept++;
      else drops[v.reason]=(drops[v.reason]||0)+1;
      var rCtx=rowContext(row);
      rows.push({
        date:(row&&row.date)||'',
        charge:(typeof coachHistoryLoadNumber==='function')?coachHistoryLoadNumber(row):(Number(row&&row.load)||0),
        reps:(typeof coachHistoryRepsNumber==='function')?coachHistoryRepsNumber(row):(Number(row&&row.reps)||0),
        rpe:(typeof coachHistoryRpeNumber==='function')?coachHistoryRpeNumber(row):(Number(row&&row.rpe)||0),
        statut:(row&&row.status)||'',
        source:(row&&row.planned&&row.planned.source)||'',
        contexteLigne:{intentions:intentsOf(rCtx), limite:rCtx?limited(rCtx):null, equipement:(rCtx&&rCtx.equipment)||''},
        retenue:reallyKept,
        poids:rowWeight,
        pourquoiEcartee:reallyKept?'':v.reason,
        pourquoiPoidsReduit:(reallyKept&&rowWeight<1)?v.reason:'',
        reconstitutionAvantCetteSeance:opts.skipReplay?null:replayAt(mv,i,label,ctx,target,programLoad)
      });
    }

    // Les reconstitutions sont finies : le panneau (!) repart de l'etat d'avant,
    // et c'est la suggestion REELLE ci-dessous qui l'ecrira.
    restoreHints(hintsBefore);

    // ── Ecart de reps, expose tel que le moteur le lit ────────────────────
    // Sans ce bloc, impossible de mesurer si la correction fonctionne : la
    // trace montrait la charge proposee et les reps de chaque ligne, mais
    // jamais le RAISONNEMENT qui relie les deux.
    var gap=null;
    try{
      if(typeof coachRepGapSignal==='function'&&typeof coachBuildSuggestionContext==='function'){
        var built=coachBuildSuggestionContext(nameOrLabel,programLoad,target,ctx);
        if(built&&!built.early&&built.ctx){
          var sig=coachRepGapSignal(built.ctx);
          gap={
            repsPrescrites:sig.fourchette.min,
            fourchette:{min:sig.fourchette.min,max:sig.fourchette.max},
            seances:sig.seances,
            sens:sig.direction,
            seancesConsecutives:sig.sessions,
            seancesRequises:sig.requises,
            rpeDernier:sig.rpe,
            effet:sig.effet,
            pourquoi:sig.pourquoi
          };
        }
      }
    }catch(e){ gap={effet:'illisible',pourquoi:String(e&&e.message)}; }

    var decision=null;
    try{
      var d=guardedSuggestedLoadDecision(label,programLoad,target,ctx);
      decision={propose:(d&&(d.loadNum||d.loadNum===0))?d.loadNum:null, texte:(d&&d.loadText)||'', severite:(d&&d.severity)||'', raison:(d&&d.reason)||''};
    }catch(e){ decision={propose:null,texte:'',severite:'',raison:'Suggestion impossible : '+(e&&e.message)}; }

    var programNum=num(programLoad);
    // La trace passe par la MEME porte que le moteur. Tant qu'elle appelait
    // coachApplyUserLoadScale en direct, elle affichait 250 lb la ou le moteur
    // en proposait 185 : elle decrivait un calcul que personne ne faisait, et
    // c'est precisement ce qu'une trace ne doit jamais faire.
    var histHasReal=hist.some(function(r){
      return (typeof coachHistoryHasValidLoad==='function')?coachHistoryHasValidLoad(r,label,ctx):false;
    });
    var scaled=programNum;
    var scaleDetail=null;
    if(programNum!==null&&typeof coachScaleProgramLoad==='function'){
      scaleDetail=coachScaleProgramLoad(label,programNum,histHasReal);
      scaled=scaleDetail.load;
    }else if(programNum!==null&&typeof coachApplyUserLoadScale==='function'){
      scaled=coachApplyUserLoadScale(label,programNum);
    }
    return {
      mouvement:label,
      nomPrescrit:String(nameOrLabel||''),
      bloc:opts.blockTitle||'',
      jour:opts.day||'', semaine:opts.week||null,
      programme:{
        chargeEcrite:String(programLoad||''),
        chargeLue:programNum,
        chargeMiseAEchelle:scaled,
        echelle:scaleDetail?{
          ratioApplique:scaleDetail.ratio,
          ratioBrut:scaleDetail.rawRatio,
          emprunte:scaleDetail.borrowed,
          borne:scaleDetail.clamped,
          source:scaleDetail.source
        }:null,
        format:opts.format||'', note:opts.note||'', repsCibles:target,
        repsCiblesMin:(opts.targetMin||opts.targetMin===0)?opts.targetMin:target,
        repsCiblesMax:(opts.targetMax||opts.targetMax===0)?opts.targetMax:target
      },
      contexteDuJour:{
        intentions:intentsOf(ctx),
        limite:ctx?limited(ctx):null,
        raisonLimite:(typeof coachContextProgressionReason==='function'&&ctx)?coachContextProgressionReason(ctx):'',
        equipement:(ctx&&ctx.equipment)||''
      },
      suggestion:decision,
      ecartReps:gap,
      capacites:(mv&&mv.ranges)?mv.ranges:null,
      historique:{
        lignesStockees:hist.length,
        lignesTracees:rows.length,
        retenues:kept,
        ecartees:rows.length-kept,
        poidsCumule:Math.round(rows.reduce(function(a,r){return a+(r.poids||0);},0)*100)/100,
        motifsDEcart:drops,
        lignes:rows
      }
    };
  };

  // Une ligne de resume par mouvement : lisible sans deplier le JSON.
  function summaryLine(t){
    var h=t.historique;
    return t.mouvement+' — propose '+(t.suggestion&&t.suggestion.propose!==null?t.suggestion.propose+' lb':'—')
      +' | programme '+(t.programme.chargeEcrite||'—')+' (lu '+(t.programme.chargeLue===null?'—':t.programme.chargeLue)+')'
      +' | historique '+h.retenues+'/'+h.lignesTracees+' retenu'
      +(h.ecartees?' — '+Object.keys(h.motifsDEcart)[0]:'')
      +' | contexte '+(t.contexteDuJour.limite?'LIMITE ['+t.contexteDuJour.intentions.join(',')+']':'normal');
  }

  // Trace de tous les exercices chargés d'une journée du cycle actif.
  // `seen` (optionnel) : ensemble des mouvements deja reconstitues. Sur une
  // trace de cycle complet, un mouvement revient a chaque semaine ou il est
  // programme — son historique, lui, ne change pas. Rejouer le moteur sur les
  // memes lignes dix fois couterait dix fois le prix pour dix fois le meme
  // resultat. La reconstitution se fait donc a la PREMIERE rencontre ; les
  // occurrences suivantes gardent tout le reste — contexte de la semaine,
  // charge prescrite, suggestion, lignes retenues ou ecartees — qui, lui,
  // change bel et bien d'une semaine a l'autre. C'est meme tout l'interet
  // d'une trace de cycle : voir OU l'etiquette d'un mouvement bascule.
  api.day = function(day,week,seen){
    day=day||(typeof state!=='undefined'&&state?state.day:'');
    week=week||(typeof state!=='undefined'&&state?state.week:1);
    var out=[];
    if(typeof buildWorkout!=='function')return out;
    var w;
    try{ w=buildWorkout(day,week); }catch(e){ return out; }
    (w&&w.blocks||[]).forEach(function(b){
      (b.exercises||[]).forEach(function(ex){
        var parsed=(typeof parseTargetReps==='function')?parseTargetReps(ex.format,8):{min:8,max:8};
        var already=false;
        if(seen){
          var seenKey=norm(ex.name);
          already=seen[seenKey]===true;
          seen[seenKey]=true;
        }
        out.push(api.movement(ex.name,{
          kind:b.kind, blockTitle:b.title, format:ex.format, note:ex.note, text:b.text,
          load:ex.load, pctOf1RM:ex.pctOf1RM, programLoad:ex.load,
          targetReps:parsed.min||parsed.max||8, day:day, week:week,
          // La FOURCHETTE, pas seulement sa borne basse : « 15-20 » ne demande
          // pas 15 reps, il en demande entre 15 et 20. Sans les deux bornes, un
          // ecart de reps ne peut pas etre mesure honnetement.
          targetMin:parsed.min||parsed.max||8, targetMax:parsed.max||parsed.min||8,
          skipReplay:already
        }));
      });
    });
    return out;
  };

  // Rapport complet, prêt à être copié dans le chat de dev.
  // Portees : 'day' (la seance affichee), 'week' (la semaine en cours),
  // 'cycle' (tout le programme actif, semaine par semaine). Le cycle est la
  // portee qui montre le CHEMIN : un mouvement y apparait sous le contexte de
  // chaque semaine, et c'est la qu'on voit une etiquette basculer d'une
  // semaine a l'autre — la cause exacte du cas Pause Back Squat.
  api.report = function(scope){
    if(scope!=='day'&&scope!=='cycle')scope='week';
    var week=(typeof state!=='undefined'&&state)?state.week:1;
    var cycleWeeks=0;
    var traces=[];
    if(scope==='cycle'){
      var weeks=(typeof totalWeeks==='function')?(Number(totalWeeks())||1):1;
      var cycleDays=(typeof currentDayOrder==='function')?(currentDayOrder()||[]):[];
      var seen={};
      for(var w=1;w<=weeks;w++){
        for(var di=0;di<cycleDays.length;di++){
          traces=traces.concat(api.day(cycleDays[di],w,seen));
        }
      }
      cycleWeeks=weeks;
    }else{
      var days=[];
      if(scope==='day'){ days=[(typeof state!=='undefined'&&state)?state.day:'']; }
      else if(typeof currentDayOrder==='function'){ days=currentDayOrder()||[]; }
      days.forEach(function(d){ traces=traces.concat(api.day(d,week)); });
    }
    // Un mouvement peut revenir plusieurs fois dans la semaine : on garde
    // chaque occurrence (le contexte differe, c'est justement le sujet).
    return {
      type:'racine_charge_trace',
      version:(typeof APP_VERSION!=='undefined')?APP_VERSION:'',
      genereLe:new Date().toISOString(),
      portee:scope,
      semainesTracees:cycleWeeks||null,
      cycle:(typeof state!=='undefined'&&state&&state.cycle)?state.cycle.goal:'',
      semaine:week,
      profil:(window.CoachProfiles&&CoachProfiles.getActive&&CoachProfiles.getActive())?CoachProfiles.getActive().name:'',
      note:'Lecture seule. « reconstitutionAvantCetteSeance » rejoue le moteur avec les seules lignes anterieures : c\'est une reconstitution avec le profil et la semaine d\'aujourd\'hui, pas la suggestion enregistree le jour meme.',
      resume:traces.map(summaryLine),
      mouvements:traces
    };
  };

  api.text = function(report){
    var r=report||api.report('week');
    return [r.type+' · '+r.version+' · '+(r.cycle||'cycle')+' S'+r.semaine+' · '+r.genereLe]
      .concat(r.resume||[]).join('\n');
  };

  api.ready = true;
})();

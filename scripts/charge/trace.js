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
    var hintsBefore=snapshotHints();
    for(var i=start;i<hist.length;i++){
      var row=hist[i];
      var v=rowVerdict(row,label,ctx,target);
      if(v.kept)kept++;
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
        retenue:v.kept,
        pourquoiEcartee:v.reason,
        reconstitutionAvantCetteSeance:replayAt(mv,i,label,ctx,target,programLoad)
      });
    }

    // Les reconstitutions sont finies : le panneau (!) repart de l'etat d'avant,
    // et c'est la suggestion REELLE ci-dessous qui l'ecrira.
    restoreHints(hintsBefore);

    var decision=null;
    try{
      var d=guardedSuggestedLoadDecision(label,programLoad,target,ctx);
      decision={propose:(d&&(d.loadNum||d.loadNum===0))?d.loadNum:null, texte:(d&&d.loadText)||'', severite:(d&&d.severity)||'', raison:(d&&d.reason)||''};
    }catch(e){ decision={propose:null,texte:'',severite:'',raison:'Suggestion impossible : '+(e&&e.message)}; }

    var programNum=num(programLoad);
    return {
      mouvement:label,
      nomPrescrit:String(nameOrLabel||''),
      bloc:opts.blockTitle||'',
      jour:opts.day||'', semaine:opts.week||null,
      programme:{
        chargeEcrite:String(programLoad||''),
        chargeLue:programNum,
        chargeMiseAEchelle:(programNum!==null&&typeof coachApplyUserLoadScale==='function')?coachApplyUserLoadScale(label,programNum):programNum,
        format:opts.format||'', note:opts.note||'', repsCibles:target
      },
      contexteDuJour:{
        intentions:intentsOf(ctx),
        limite:ctx?limited(ctx):null,
        raisonLimite:(typeof coachContextProgressionReason==='function'&&ctx)?coachContextProgressionReason(ctx):'',
        equipement:(ctx&&ctx.equipment)||''
      },
      suggestion:decision,
      capacites:(mv&&mv.ranges)?mv.ranges:null,
      historique:{
        lignesStockees:hist.length,
        lignesTracees:rows.length,
        retenues:kept,
        ecartees:rows.length-kept,
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
  api.day = function(day,week){
    day=day||(typeof state!=='undefined'&&state?state.day:'');
    week=week||(typeof state!=='undefined'&&state?state.week:1);
    var out=[];
    if(typeof buildWorkout!=='function')return out;
    var w;
    try{ w=buildWorkout(day,week); }catch(e){ return out; }
    (w&&w.blocks||[]).forEach(function(b){
      (b.exercises||[]).forEach(function(ex){
        var parsed=(typeof parseTargetReps==='function')?parseTargetReps(ex.format,8):{min:8,max:8};
        out.push(api.movement(ex.name,{
          kind:b.kind, blockTitle:b.title, format:ex.format, note:ex.note, text:b.text,
          load:ex.load, pctOf1RM:ex.pctOf1RM, programLoad:ex.load,
          targetReps:parsed.min||parsed.max||8, day:day, week:week
        }));
      });
    });
    return out;
  };

  // Rapport complet, prêt à être copié dans le chat de dev.
  api.report = function(scope){
    scope=(scope==='day')?'day':'week';
    var week=(typeof state!=='undefined'&&state)?state.week:1;
    var days=[];
    if(scope==='day'){ days=[(typeof state!=='undefined'&&state)?state.day:'']; }
    else if(typeof currentDayOrder==='function'){ days=currentDayOrder()||[]; }
    var traces=[];
    days.forEach(function(d){ traces=traces.concat(api.day(d,week)); });
    // Un mouvement peut revenir plusieurs fois dans la semaine : on garde
    // chaque occurrence (le contexte differe, c'est justement le sujet).
    return {
      type:'racine_charge_trace',
      version:(typeof APP_VERSION!=='undefined')?APP_VERSION:'',
      genereLe:new Date().toISOString(),
      portee:scope,
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

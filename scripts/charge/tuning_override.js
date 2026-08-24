// @ts-check
// scripts/charge/tuning_override.js
// Racine — surcharge de tuning PAR PROFIL du moteur de charges.
//
// COACH_MOVEMENT_TUNING est une constante en dur : un seul jeu de reglages
// pour tous les profils. Un `damping` unique applique au Back Squat d'un
// avance et au Lateral Raise d'une debutante est faux par construction — ce
// ne sont pas les memes gestes, ni les memes athletes. Ce module laisse un
// profil porter SES valeurs, sans toucher au moteur.
//
// Trois regles de conception, chacune contre un piege precis :
//
//  1. SCALAIRES DECLARES SEULEMENT. La surcharge n'atteint que les chemins
//     listes dans PARAMS, tous numeriques. Jamais une regex (non
//     serialisable en JSON : /curl/ ressort en {} apres un aller-retour),
//     jamais un tableau (fusionner deux listes d'overrides n'a pas de sens
//     univoque : remplacer ? concatener ? dedupliquer ?). Un chemin absent
//     de PARAMS est ignore, meme s'il est present dans le stockage.
//
//  2. BORNES COTE APP. Chaque parametre porte un min/max verifie a
//     l'ecriture ET a l'application. Un stockage edite a la main, un import
//     d'un autre appareil ou un futur bug d'UI ne peuvent pas injecter un
//     amortissement de 40 ou un multiplicateur de deload negatif dans le
//     moteur.
//
//  3. RETOUR A L'USINE TOUJOURS POSSIBLE. Les valeurs d'usine sont
//     capturees au chargement, AVANT toute application, et servent de base
//     a chaque `apply()` : la surcharge est un calque, jamais une ecriture
//     destructrice. Retirer un parametre du calque restaure exactement la
//     valeur livree.
//
// Stockage : `racineState::<id>::tuning-override-v1`. Ce prefixe est celui
// que balaie exportProfileBlob() (scripts/profiles/storage.js) et que
// reecrit importProfileBlob() : la calibration voyage avec l'export du
// profil sans une ligne de code de plus. Corollaire a ne jamais oublier :
// aucun secret ne doit vivre sous ce prefixe, tout y est exporte.
(function(){
  var api = window.CoachTuningOverride = window.CoachTuningOverride || {};
  var VERSION = 'tuning-override-v1';
  var SCHEMA = 1;

  // ─── Les 23 parametres surchargeables ────────────────────────────────────
  // `path` pointe dans COACH_MOVEMENT_TUNING. `min`/`max` sont les bornes de
  // l'app (regle 2 ci-dessus) : elles encadrent la valeur d'usine sans jamais
  // pretendre remplacer le jugement — au-dela, ce n'est plus un reglage,
  // c'est un autre moteur.
  var PARAMS = [
    {path:'maxJumpBase.default',                    group:'Saut de charge',   label:'Saut maximal de base (lb)',            min:2.5,  max:50,   step:2.5},
    {path:'maxJumpBase.relativeCeiling',            group:'Saut de charge',   label:'Saut maximal relatif (part)',          min:0.05, max:0.50, step:0.01},
    {path:'brainGate.confidenceFloor',              group:'Brain',            label:'Confiance minimale du portail',        min:0.30, max:0.95, step:0.05},
    {path:'brainGate.damping',                      group:'Brain',            label:'Part de hausse gardee (portail)',      min:0,    max:1,    step:0.05},
    {path:'deloadMultiplier.main',                  group:'Deload et echec',  label:'Deload — mouvement principal',         min:0.60, max:0.95, step:0.05},
    {path:'deloadMultiplier.other',                 group:'Deload et echec',  label:'Deload — autres mouvements',           min:0.55, max:0.95, step:0.05},
    {path:'failedAttemptMultiplier',                group:'Deload et echec',  label:'Retour apres echec total',             min:0.50, max:0.95, step:0.05},
    {path:'progressionSpeed.bias.prudent',          group:'Vitesse',          label:'Biais « prudent »',                    min:0.40, max:1.00, step:0.05},
    {path:'progressionSpeed.bias.ambitieux',        group:'Vitesse',          label:'Biais « ambitieux »',                  min:1.00, max:1.80, step:0.05},
    {path:'progressionSpeed.observed.amplitude',    group:'Vitesse',          label:'Amplitude de l’ambition mesuree',      min:0,    max:0.60, step:0.05},
    {path:'progressionSpeed.observed.minObservations', group:'Vitesse',       label:'Predictions avant de faire confiance', min:1,    max:30,   step:1},
    {path:'progressionSpeed.clamp.min',             group:'Vitesse',          label:'Facteur de saut — plancher',           min:0.20, max:1.00, step:0.05},
    {path:'progressionSpeed.clamp.max',             group:'Vitesse',          label:'Facteur de saut — plafond',            min:1.00, max:3.00, step:0.05},
    {path:'repsSurplus.minRatio',                   group:'Reps et vitesse',  label:'Ratio reps/cible avant surplus',       min:1.05, max:2.00, step:0.05},
    {path:'repsSurplus.fallback.converge',          group:'Reps et vitesse',  label:'Convergence du surplus (defaut)',      min:0,    max:1,    step:0.05},
    {path:'speedStimulus.converge',                 group:'Reps et vitesse',  label:'Convergence bloc vitesse',             min:0.10, max:1,    step:0.05},
    {path:'speedStimulus.maxRpe',                   group:'Reps et vitesse',  label:'RPE maximal d’un bloc vitesse',        min:6,    max:9,    step:0.5},
    {path:'ceiling.families.isolation.minStagnant', group:'Plafond',          label:'Isolation — seances sans progres',     min:2,    max:12,   step:1},
    {path:'ceiling.families.isolation.minRpe',      group:'Plafond',          label:'Isolation — RPE de plafond',           min:6,    max:10,   step:0.5},
    {path:'ceiling.families.accessory.minStagnant', group:'Plafond',          label:'Accessoire — seances sans progres',    min:2,    max:15,   step:1},
    {path:'ceiling.families.accessory.minRpe',      group:'Plafond',          label:'Accessoire — RPE de plafond',          min:6,    max:10,   step:0.5},
    {path:'ceiling.families.main.minStagnant',      group:'Plafond',          label:'Principal — seances sans progres',     min:3,    max:20,   step:1},
    {path:'ceiling.families.main.minRpe',           group:'Plafond',          label:'Principal — RPE de plafond',           min:6,    max:10,   step:0.5}
  ];
  api.PARAMS = PARAMS;
  api.VERSION = VERSION;

  function paramFor(path){
    for(var i=0;i<PARAMS.length;i++){ if(PARAMS[i].path===path)return PARAMS[i]; }
    return null;
  }
  function tuning(){ return window.COACH_MOVEMENT_TUNING||null; }
  function readPath(root,path){
    var node=root, parts=String(path||'').split('.');
    for(var i=0;i<parts.length;i++){
      if(!node||typeof node!=='object')return undefined;
      node=node[parts[i]];
    }
    return node;
  }
  function writePath(root,path,value){
    var node=root, parts=String(path||'').split('.');
    for(var i=0;i<parts.length-1;i++){
      if(!node||typeof node!=='object')return false;
      node=node[parts[i]];
    }
    if(!node||typeof node!=='object')return false;
    node[parts[parts.length-1]]=value;
    return true;
  }
  function clampParam(p,value){
    var v=Number(value);
    if(isNaN(v))return null;
    if(v<p.min)v=p.min;
    if(v>p.max)v=p.max;
    // Le pas evite les valeurs a douze decimales venues d'un input libre ;
    // il n'invente aucune contrainte, il arrondit ce que l'UI propose deja.
    var step=Number(p.step)||0;
    if(step>0)v=Math.round(v/step)*step;
    return Math.round(v*1e6)/1e6;
  }

  // Valeurs d'usine, capturees UNE fois, avant toute application.
  var FACTORY = (function(){
    var snap={}, T=tuning();
    if(!T)return snap;
    PARAMS.forEach(function(p){
      var v=readPath(T,p.path);
      if(typeof v==='number')snap[p.path]=v;
    });
    return snap;
  })();
  api.factory = function(){ var out={}; Object.keys(FACTORY).forEach(function(k){ out[k]=FACTORY[k]; }); return out; };
  api.factoryValue = function(path){ return Object.prototype.hasOwnProperty.call(FACTORY,path)?FACTORY[path]:null; };

  function storageKey(){
    try{
      if(window.CoachState&&typeof CoachState.storageKeys==='function'){
        var k=CoachState.storageKeys();
        if(k&&k.state)return k.state+'::'+VERSION;
      }
    }catch(e){}
    try{
      if(window.CoachProfiles&&typeof CoachProfiles.activeStorageKeys==='function'){
        var pk=CoachProfiles.activeStorageKeys();
        if(pk&&pk.state)return pk.state+'::'+VERSION;
      }
    }catch(e){}
    return 'racine::__pending__::'+VERSION;
  }
  api.storageKey = storageKey;

  function empty(){ return {version:VERSION, schema:SCHEMA, updatedAt:null, params:{}, ceilings:{}}; }

  // Lecture defensive : tout ce qui n'est pas un parametre declare et
  // numerique est ignore, jamais recopie dans le moteur.
  function read(){
    var data=empty();
    var raw=null;
    try{ raw=localStorage.getItem(storageKey()); }catch(e){ raw=null; }
    if(!raw)return data;
    var parsed=null;
    try{ parsed=JSON.parse(raw); }catch(e){ return data; }
    if(!parsed||typeof parsed!=='object')return data;
    var params=(parsed.params&&typeof parsed.params==='object')?parsed.params:{};
    Object.keys(params).forEach(function(path){
      var p=paramFor(path);
      if(!p)return;
      var v=clampParam(p,params[path]);
      if(v===null)return;
      data.params[path]=v;
    });
    var caps=(parsed.ceilings&&typeof parsed.ceilings==='object')?parsed.ceilings:{};
    Object.keys(caps).forEach(function(name){
      var load=Number(caps[name]);
      if(!(load>0)||load>2000)return;
      data.ceilings[String(name).slice(0,60)]=Math.round(load*100)/100;
    });
    data.updatedAt=parsed.updatedAt||null;
    return data;
  }
  api.read = read;

  function write(data){
    var payload={version:VERSION, schema:SCHEMA, updatedAt:new Date().toISOString(),
      params:(data&&data.params)||{}, ceilings:(data&&data.ceilings)||{}};
    try{ localStorage.setItem(storageKey(),JSON.stringify(payload)); }catch(e){ return false; }
    return true;
  }

  // Applique le calque sur le moteur vivant. Idempotent : chaque parametre
  // repart de sa valeur d'usine, donc retirer une entree la restaure.
  api.apply = function(){
    var T=tuning();
    if(!T)return false;
    var data=read();
    PARAMS.forEach(function(p){
      if(!Object.prototype.hasOwnProperty.call(FACTORY,p.path))return;
      var v=Object.prototype.hasOwnProperty.call(data.params,p.path)?clampParam(p,data.params[p.path]):FACTORY[p.path];
      if(v===null)v=FACTORY[p.path];
      writePath(T,p.path,v);
    });
    if(T.ceiling){
      var caps={};
      Object.keys(data.ceilings).forEach(function(name){ caps[name]=data.ceilings[name]; });
      T.ceiling.manual=caps;
    }
    return true;
  };

  api.value = function(path){
    var T=tuning();
    var v=T?readPath(T,path):undefined;
    return (typeof v==='number')?v:null;
  };
  api.isChanged = function(path){
    var f=api.factoryValue(path);
    var v=api.value(path);
    if(f===null||v===null)return false;
    return Math.abs(f-v)>1e-9;
  };
  api.isActive = function(){
    var data=read();
    return Object.keys(data.params).length>0||Object.keys(data.ceilings).length>0;
  };

  api.set = function(path,value){
    var p=paramFor(path);
    if(!p)return null;
    var v=clampParam(p,value);
    if(v===null)return null;
    var data=read();
    var factoryValue=api.factoryValue(path);
    if(factoryValue!==null&&Math.abs(v-factoryValue)<1e-9){
      delete data.params[path];   // revenu a l'usine : on ne stocke pas un calque vide
    }else{
      data.params[path]=v;
    }
    write(data);
    api.apply();
    return v;
  };
  api.clear = function(path){
    var data=read();
    delete data.params[path];
    write(data);
    api.apply();
    return true;
  };

  api.ceilings = function(){ return read().ceilings; };
  api.setCeiling = function(name,load){
    var key=String(name||'').trim().slice(0,60);
    var v=Number(load);
    if(!key||!(v>0)||v>2000)return false;
    var data=read();
    data.ceilings[key]=Math.round(v*100)/100;
    write(data);
    api.apply();
    return true;
  };
  api.removeCeiling = function(name){
    var data=read();
    delete data.ceilings[String(name||'')];
    write(data);
    api.apply();
    return true;
  };

  api.reset = function(){
    write(empty());
    api.apply();
    return true;
  };

  // Application au chargement : le profil actif est deja connu ici
  // (scripts/profiles/storage.js charge bien avant le domaine charge).
  // Le changement de profil, lui, rappelle apply() depuis setActive().
  try{ api.apply(); }catch(e){}
  api.ready = true;
})();

// Racine — référentiel neutre de calibration multi-profil.
// Ce fichier ne contient aucune donnée vivante d'utilisateur.
// Il définit seulement l'ancre mathématique utilisée pour transformer les
// charges historiques des programmes en charges réalistes pour un profil actif.
(function(){
  var api = window.RacineProfileReference = window.RacineProfileReference || {};

  var referenceProfile = {
    bench:300,
    frontSquat:215,
    strictPress:185,
    powerClean:225,
    backSquat5RM:235,
    hipThrust8RM:315,
    bulgarianDb:50,
    dbRdl:70,
    row8RM:185,
    chestRow8RM:160,
    latPulldown10RM:140,
    inclineDb10RM:55
  };

  var referenceRefs = {
    "bench__strength":        {movement:"bench",      range:"strength",   load:265,reps:5, date:"référence",lastActual:265,status:"reference",quality:"clean",rpe:8},
    "bench__hypertrophy":     {movement:"bench",      range:"hypertrophy",load:215,reps:8, date:"référence",lastActual:215,status:"reference",quality:"clean",rpe:8},
    "bench__endurance":       {movement:"bench",      range:"endurance",  load:185,reps:15,date:"référence",lastActual:185,status:"reference",quality:"clean",rpe:8},
    "inclineDb__strength":    {movement:"inclineDb",  range:"strength",   load:85, reps:5, date:"référence",lastActual:85, status:"reference",quality:"clean",rpe:8},
    "inclineDb__hypertrophy": {movement:"inclineDb",  range:"hypertrophy",load:60, reps:8, date:"référence",lastActual:60, status:"reference",quality:"clean",rpe:8},
    "strictPress__strength":  {movement:"strictPress",range:"strength",   load:155,reps:5, date:"référence",lastActual:155,status:"reference",quality:"clean",rpe:8},
    "strictPress__hypertrophy":{movement:"strictPress",range:"hypertrophy",load:135,reps:8,date:"référence",lastActual:135,status:"reference",quality:"clean",rpe:8},
    "chestRow__strength":     {movement:"chestRow",   range:"strength",   load:155,reps:5, date:"référence",lastActual:155,status:"reference",quality:"clean",rpe:8},
    "chestRow__hypertrophy":  {movement:"chestRow",   range:"hypertrophy",load:115,reps:8, date:"référence",lastActual:115,status:"reference",quality:"clean",rpe:8},
    "latPulldown__hypertrophy":{movement:"latPulldown",range:"hypertrophy",load:20,reps:8, date:"référence",lastActual:20, status:"reference",quality:"clean",rpe:8},
    "frontSquat__strength":   {movement:"frontSquat", range:"strength",   load:224,reps:5, date:"référence",lastActual:224,status:"reference",quality:"acceptable",rpe:8},
    "frontSquat__hypertrophy":{movement:"frontSquat", range:"hypertrophy",load:185,reps:8, date:"référence",lastActual:185,status:"reference",quality:"acceptable",rpe:8},
    "hipThrust__strength":    {movement:"hipThrust",  range:"strength",   load:315,reps:5, date:"référence",lastActual:315,status:"reference",quality:"clean",rpe:8},
    "hipThrust__hypertrophy": {movement:"hipThrust",  range:"hypertrophy",load:315,reps:8, date:"référence",lastActual:315,status:"reference",quality:"clean",rpe:8},
    "bulgarian__strength":    {movement:"bulgarian",  range:"strength",   load:60, reps:5, date:"référence",lastActual:60, status:"reference",quality:"clean",rpe:8},
    "bulgarian__hypertrophy": {movement:"bulgarian",  range:"hypertrophy",load:40, reps:8, date:"référence",lastActual:40, status:"reference",quality:"clean",rpe:8},
    "powerClean__strength":   {movement:"powerClean", range:"strength",   load:215,reps:5, date:"référence",lastActual:215,status:"reference",quality:"clean",rpe:8},
    "powerClean__hypertrophy":{movement:"powerClean", range:"hypertrophy",load:185,reps:8, date:"référence",lastActual:185,status:"reference",quality:"clean",rpe:8},
    "dbSnatch__hypertrophy":  {movement:"dbSnatch",   range:"hypertrophy",load:50, reps:8, date:"référence",lastActual:50, status:"reference",quality:"clean",rpe:8},
    "farmerCarry__hypertrophy":{movement:"farmerCarry",range:"hypertrophy",load:28,reps:8, date:"référence",lastActual:28,status:"reference",quality:"clean",rpe:8}
  };

  function clone(obj){ return JSON.parse(JSON.stringify(obj || {})); }

  api.profile = function(){ return clone(referenceProfile); };
  api.refs = function(){ return clone(referenceRefs); };
  api.blankProfile = function(){
    var out = {};
    Object.keys(referenceProfile).forEach(function(k){ out[k] = null; });
    out.name = "";
    out.experienceLevel = null;
    out.bodyweightLb = null;
    out.aggressiveness = 1;
    out.competitionDateIso = null;
    out.scaleRatios = null;
    return out;
  };

  window.RACINE_REFERENCE_PROFILE = api.profile();
  window.RACINE_REFERENCE_REFS = api.refs();
})();

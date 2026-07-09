// Racine — référentiel neutre de calibration multi-profil.
// Ce fichier ne contient aucune donnée vivante d'utilisateur.
// Il définit seulement l'ancre mathématique utilisée pour transformer les
// charges génériques des programmes en charges réalistes pour un profil actif.
//
// V2 « Athlète X » : référence VERSATILE aux ratios physiologiques standards,
// équilibrée haut/bas du corps (l'ancienne référence portait la dominance
// haut du corps du coach : bench 1RM 300 > squat 1RM ~274, l'inverse d'un
// athlète type — ça déformait les dérivations pour tous les autres profils).
// Ratios retenus (ancre : back squat 1RM 315) :
//   bench = squat/1,3 ≈ 245 · front squat = 0,85×squat ≈ 265 · press = 0,63×bench ≈ 155
//   power clean = 0,65×squat ≈ 205 · deadlift ≈ 1,2×squat (catalogues) · hip thrust 8RM 315
// IMPORTANT : tout changement ici doit être répercuté dans les BASE_LOADS des
// catalogues et dans dev/program_calibration_checks.js (même convention), et
// s'accompagner d'un bump de referenceVersion (migration des ratios stockés).

(function(){
  var api = window.RacineProfileReference = window.RacineProfileReference || {};

  api.REFERENCE_VERSION = 2;

  var referenceProfile = {
    bench:245,
    frontSquat:265,
    strictPress:155,
    powerClean:205,
    backSquat5RM:270,
    hipThrust8RM:315,
    bulgarianDb:55,
    dbRdl:75,
    row8RM:155,
    chestRow8RM:135,
    latPulldown10RM:20,
    inclineDb10RM:50
  };

  // Repères de travail par plage (RPE 8 ≈ 2 reps en réserve), dérivés des 1RM
  // ci-dessus : load = 1RM / (1 + (reps + 2) / 30).
  var referenceRefs = {
    "bench__strength":        {movement:"bench",      range:"strength",   load:200,reps:5, date:"référence",lastActual:200,status:"reference",quality:"clean",rpe:8},
    "bench__hypertrophy":     {movement:"bench",      range:"hypertrophy",load:185,reps:8, date:"référence",lastActual:185,status:"reference",quality:"clean",rpe:8},
    "bench__endurance":       {movement:"bench",      range:"endurance",  load:155,reps:15,date:"référence",lastActual:155,status:"reference",quality:"clean",rpe:8},
    "inclineDb__strength":    {movement:"inclineDb",  range:"strength",   load:55, reps:5, date:"référence",lastActual:55, status:"reference",quality:"clean",rpe:8},
    "inclineDb__hypertrophy": {movement:"inclineDb",  range:"hypertrophy",load:50, reps:8, date:"référence",lastActual:50, status:"reference",quality:"clean",rpe:8},
    "strictPress__strength":  {movement:"strictPress",range:"strength",   load:125,reps:5, date:"référence",lastActual:125,status:"reference",quality:"clean",rpe:8},
    "strictPress__hypertrophy":{movement:"strictPress",range:"hypertrophy",load:115,reps:8,date:"référence",lastActual:115,status:"reference",quality:"clean",rpe:8},
    "chestRow__strength":     {movement:"chestRow",   range:"strength",   load:140,reps:5, date:"référence",lastActual:140,status:"reference",quality:"clean",rpe:8},
    "chestRow__hypertrophy":  {movement:"chestRow",   range:"hypertrophy",load:125,reps:8, date:"référence",lastActual:125,status:"reference",quality:"clean",rpe:8},
    "latPulldown__hypertrophy":{movement:"latPulldown",range:"hypertrophy",load:20,reps:8, date:"référence",lastActual:20, status:"reference",quality:"clean",rpe:8},
    "frontSquat__strength":   {movement:"frontSquat", range:"strength",   load:215,reps:5, date:"référence",lastActual:215,status:"reference",quality:"acceptable",rpe:8},
    "frontSquat__hypertrophy":{movement:"frontSquat", range:"hypertrophy",load:200,reps:8, date:"référence",lastActual:200,status:"reference",quality:"acceptable",rpe:8},
    "hipThrust__strength":    {movement:"hipThrust",  range:"strength",   load:325,reps:5, date:"référence",lastActual:325,status:"reference",quality:"clean",rpe:8},
    "hipThrust__hypertrophy": {movement:"hipThrust",  range:"hypertrophy",load:300,reps:8, date:"référence",lastActual:300,status:"reference",quality:"clean",rpe:8},
    "bulgarian__strength":    {movement:"bulgarian",  range:"strength",   load:65, reps:5, date:"référence",lastActual:65, status:"reference",quality:"clean",rpe:8},
    "bulgarian__hypertrophy": {movement:"bulgarian",  range:"hypertrophy",load:50, reps:8, date:"référence",lastActual:50, status:"reference",quality:"clean",rpe:8},
    "powerClean__strength":   {movement:"powerClean", range:"strength",   load:165,reps:5, date:"référence",lastActual:165,status:"reference",quality:"clean",rpe:8},
    "powerClean__hypertrophy":{movement:"powerClean", range:"hypertrophy",load:155,reps:8, date:"référence",lastActual:155,status:"reference",quality:"clean",rpe:8},
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

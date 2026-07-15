// Racine — configuration statique des programmes.
// defaultProfile est une ancre de calibration mathématique, pas un profil utilisateur.
// Les profils réels vivent dans scripts/profiles/ et dans le stockage local namespacé.

var defaultProfile = (window.RacineProfileReference && RacineProfileReference.profile)
  ? RacineProfileReference.profile()
  : {bench:300,frontSquat:215,strictPress:185,powerClean:225,backSquat5RM:235,hipThrust8RM:315,bulgarianDb:50,dbRdl:70,row8RM:185,chestRow8RM:160,latPulldown10RM:140,inclineDb10RM:55};

var movements = {
  bench:        {name:"Bench Press",           profile:"bench"},
  inclineDb:    {name:"Incline DB Press",       profile:"inclineDb10RM"},
  strictPress:  {name:"Strict press",           profile:"strictPress"},
  // aucun Chest Supported Row dans l'app. Alias conservé pour ne pas casser les anciennes données.
  chestRow:     {name:"Barbell Row",            profile:"row8RM"},
  barbellRow:   {name:"Barbell Row",            profile:"row8RM"},
  latPulldown:     {name:"Weighted pull-up",       profile:null},
  latPulldownWide: {name:"Lat Pulldown",           profile:null},
  frontSquat:   {name:"Front Squat",            profile:"frontSquat"},
  backSquat:    {name:"Back Squat",             profile:"backSquat5RM"},
  hipThrust:    {name:"Hip Thrust",             profile:"hipThrust8RM"},
  bulgarian:    {name:"Bulgarian Split Squat",  profile:"bulgarianDb"},
  powerClean:   {name:"Power clean",            profile:"powerClean"},
  dbSnatch:     {name:"DB snatch",              profile:null},
  farmerCarry:  {name:"Farmer carry",           profile:null},
  lateralRaise: {name:"Lateral Raise DB",          profile:null},
  rearDeltFly:  {name:"Rear Delt Fly DB",          profile:null},
  ropePushdown: {name:"Triceps Rope Pushdown",  profile:null},
  facePull:     {name:"Face pull",              profile:null},
  pushPress:    {name:"Push Press",        profile:"strictPress"}
};

var estimatedDailyLoads = {lateralRaise:25,rearDeltFly:25,ropePushdown:70,facePull:70,latPulldown:20,dbSnatch:50,farmerCarry:50};

var baseDays = {
  lundi:   {label:"Lundi",   base:"Push",      focus:"Pectoraux, épaules, triceps, serratus.", progress:["bench","inclineDb"],       warmup:"Bike 3 min + band pull-aparts + wall slides + activation serratus.", accessory:"Incline DB Press + lateral raise + serratus cable punch.", wod:"10 cal row + 10 DB push press léger + 8 burpees"},
  mardi:   {label:"Mardi",   base:"Pull",      focus:"Dos, biceps, scapula, posture.",         progress:["barbellRow","latPulldown"], warmup:"Row 3 min + dead hang + scap pull-ups + band rows.", accessory:"Weighted pull-up + face pull + DB curls.", wod:"12 cal SkiErg + 12 ring rows stricts"},
  mercredi:{label:"Mercredi",base:"Jour optionnel", focus:"Utilisé seulement par les programmes qui déclarent mercredi.", progress:[], warmup:"Préparation légère.", accessory:"Accessoires légers.", wod:"Conditioning facile"},
  jeudi:   {label:"Jeudi",   base:"Legs",      focus:"Jambes, fessiers, chaîne postérieure.",  progress:["frontSquat","bulgarian"], warmup:"Bike 3 min + air squats + glute bridge + mobilité hanches.", accessory:"Bulgarian Split Squat + DB RDL.", wod:"12 cal bike + 12 KB swings + 10 box step-ups"},
  vendredi:{label:"Vendredi",base:"Full body", focus:"Moteur, transitions, puissance.",         progress:["powerClean","strictPress"],warmup:"Row 3 min + mobilité hanches/épaules + ramp-up technique.", accessory:"Farmer carry + reverse fly + hollow hold.", wod:"30 wall balls + 30 cal row + 30 DB snatch alternés"},
  samedi:  {label:"Samedi",  base:"Jour optionnel", focus:"Utilisé seulement par les programmes qui déclarent samedi.", progress:[], warmup:"Préparation légère.", accessory:"Accessoires légers.", wod:"Conditioning facile"},
  dimanche:{label:"Dimanche",base:"Jour optionnel", focus:"Utilisé seulement par les programmes qui déclarent dimanche.", progress:[], warmup:"Préparation légère.", accessory:"Mobilité ou récupération.", wod:"Récupération active"}
};

var wodBanks = {
  push:         ["10 cal row + 10 DB push press + 8 burpees","12 cal row + 10 push-ups + 12 sit-ups","10 cal bike + 8 DB thrusters + 8 burpees"],
  pull:         ["12 cal SkiErg + 12 ring rows","10 cal row + 10 KB high pulls + 10 ring rows","40 cal row + 30 ring rows + 20 DB snatch"],
  legs:         ["12 cal bike + 12 KB swings + 10 box step-ups","14 cal bike + 12 goblet squats","50 cal bike + 40 KB swings + 30 step-ups"],
  weightlifting:["EMOM 10 : 2 power cleans légers","10 min qualité : 3 hang power clean + 6 burpees","8 min technique : clean pull + front squat léger"],
  engine:       ["AMRAP 14 : 10 wall balls + 12 cal row + 8 DB snatch","EMOM 16 : row/bike/ski/bodyweight","12 min pacing : bike + step-ups + ring rows"],
  lowimpact:    ["10 min bike zone 2","10 min row zone 2","AMRAP facile : 8 cal row + 8 air squats + 8 ring rows"]
};

// V51.39 : ce fichier doit rester une configuration statique.
// La logique runtime de charges, d'alias, de modale ! et de patch programme vit maintenant dans scripts/*.

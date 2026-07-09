// Racine Phase 1 : Épaules 3D + Triceps (6 semaines)
// Objectif : spécialisation épaules/triceps crédible, 4 jours/semaine, 55-60 min.
// Structure : lundi push + épaules session 1, mardi pull/rear delt, jeudi legs zéro épaules, vendredi épaules session 2 angles différents + power clean technique APRÈS les épaules.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
window.COACH_BERTIN_PROGRAMS.shoulders3d = {
  id: "shoulders3d",
  label: "Épaules 3D + Triceps — Phase 1",
  phase: 1,
  phaseName: "Esthétique / Récupération",
  phaseEnd: "fin août 2025",
  nextPhase: "hypertrophy_base",
  impact: "Spécialisation épaules rondes et triceps avec récupération locale protégée. Lundi = push/latéral/triceps, mardi = pull/rear delt/biceps, jeudi = jambes/core sans épaules, vendredi = épaules complètes avec angles différents + power clean technique léger après les épaules.",
  days: ["lundi", "mardi", "jeudi", "vendredi"],
  weekLabels: ["S1 Base","S2 Technique","S3 Volume","S4 Surcharge","S5 Intensité","S6 Deload"],
  weekGoals: [
    "Repères techniques, amplitude complète, RPE 7-8, aucune série à l'échec.",
    "Même qualité, légère densité en plus. Contrôle strict sur les isolations.",
    "Volume haut. Plus de séries utiles, mais aucun doublon inutile de mouvements similaires.",
    "Semaine la plus chargée. Densité forte, technique parfaite, RPE 8-9 max.",
    "Intensité contrôlée. Un peu moins de volume, charges plus sérieuses, aucune rep laide.",
    "Deload actif. Volume réduit, charges réduites, récupérer coudes/épaules/tendons."
  ],
  sets: ["4 x 10","5 x 8-10","5 x 10","5 x 8","4 x 8 lourd","3 x 10 léger"],
  targetReps: [10,10,10,8,8,10],
  mult: [0.55,0.58,0.62,0.66,0.70,0.50],
  rest: "0:45–2:30",
  tag: "épaules 3D",
  versionDate: "2026-06-09",
  versionLabel: "2026-06-13 — V51.31 noms mouvements propres + mapping transition"
};

function shouldersWeekPlan(week){
  return({
    1:{label:"S1 Base",note:"Qualité et repères. RPE 7-8. Aucun échec.",
       incline:"3×10",inclineLoad:"45-50 lb / main",press:"3×8-10",pressLoad:"110 lb",lat:"4×15-20",triOh:"4×10-15",triPush:"3×12-20",
       row:"4×10",pull:"3×8",rear:"4×15-20",face:"2×15-20",trap:"2×12",curl:"3×10-15",
       squat:"5×5",squatLoad:"165 lb",hip:"3×10",hinge:"3×10",
       shPress:"3×10",shPressLoad:"léger",lat2:"3×15-20",rear2:"3×15-20",face2:"3×15-20",serratus:"2×12/côté",triFri:"2×12-15",clean:"5×2 léger",cleanLoad:"115-135 lb",wodNote:"pacing propre"},
    2:{label:"S2 Technique",note:"Même qualité, transitions plus courtes. Toujours 1-2 reps en réserve.",
       incline:"4×8-10",inclineLoad:"50 lb / main",press:"4×8",pressLoad:"115 lb",lat:"5×12-20",triOh:"4×10-15",triPush:"3×12-20",
       row:"5×8-10",pull:"4×6-8",rear:"4×15-20",face:"3×15-20",trap:"2×12-15",curl:"3×10-15",
       squat:"5×5",squatLoad:"175 lb",hip:"3×10",hinge:"3×10",
       shPress:"3×8-10",shPressLoad:"léger à modéré",lat2:"3×15-20",rear2:"3×15-20",face2:"3×15-20",serratus:"2×12-15/côté",triFri:"2×12-15",clean:"5×2 léger",cleanLoad:"125-145 lb",wodNote:"contrôlé"},
    3:{label:"S3 Volume",note:"Volume utile plus élevé. Pas de mouvement redondant juste pour remplir.",
       incline:"4×8-10",inclineLoad:"50-55 lb / main",press:"4×8-10",pressLoad:"120 lb",lat:"5×15-20",triOh:"4×12-15",triPush:"3×15-20",
       row:"4×8",pull:"4×6-8",rear:"5×15-20",face:"3×15-20",trap:"3×12-15",curl:"3×10-15",
       squat:"5×4",squatLoad:"185 lb",hip:"4×8-10",hinge:"3×10",
       shPress:"4×8-10",shPressLoad:"modéré",lat2:"4×12-20",rear2:"4×15-20",face2:"3×15-20",serratus:"3×12-15/côté",triFri:"3×12-15",clean:"5×2 technique",cleanLoad:"135-155 lb",wodNote:"modéré"},
    4:{label:"S4 Surcharge",note:"Semaine la plus dense. RPE 8-9 max, aucune compensation.",
       incline:"4×8",inclineLoad:"50-55 lb / main",press:"4×8",pressLoad:"125 lb",lat:"5×12-20",triOh:"4×10-15",triPush:"3×12-20",
       row:"5×8",pull:"4×6",rear:"5×15-20",face:"3×15-20",trap:"3×12-15",curl:"3×10-12",
       squat:"5×4",squatLoad:"190 lb",hip:"4×8",hinge:"3×8-10",
       shPress:"4×8",shPressLoad:"modéré",lat2:"4×12-20",rear2:"4×15-20",face2:"3×15-20",serratus:"3×12-15/côté",triFri:"3×12-15",clean:"5×2 technique",cleanLoad:"145-165 lb",wodNote:"fort mais pas redline"},
    5:{label:"S5 Intensité",note:"Charges les plus sérieuses. Volume légèrement réduit, qualité avant ego.",
       incline:"3×8 contrôlé",inclineLoad:"55 lb / main",press:"3×8",pressLoad:"130 lb",lat:"4×12-18",triOh:"4×8-12",triPush:"2×12-15",
       row:"4×6",pull:"4×5-6",rear:"4×12-20",face:"2×15-20",trap:"2×12",curl:"3×8-12",
       squat:"5×3",squatLoad:"195 lb",hip:"3×8",hinge:"3×8",
       shPress:"3×8",shPressLoad:"modéré",lat2:"3×12-18",rear2:"3×12-20",face2:"2×15-20",serratus:"2×12/côté",triFri:"2×12",clean:"4×2 technique",cleanLoad:"145-165 lb",wodNote:"court et propre"},
    6:{label:"S6 Deload",note:"Deload actif. Réduire volume et charge. Sortir plus frais.",
       incline:"2×10 léger",inclineLoad:"40-45 lb / main",press:"2×10 léger",pressLoad:"95 lb",lat:"2×15",triOh:"2×12",triPush:"2×12",
       row:"3×10 léger",pull:"2×6 facile",rear:"2×15",face:"2×15",trap:"2×10",curl:"2×12",
       squat:"3×5 léger",squatLoad:"140 lb",hip:"2×10 léger",hinge:"2×10 léger",
       shPress:"2×10 léger",shPressLoad:"très léger",lat2:"2×15",rear2:"2×15",face2:"2×15",serratus:"2×10/côté",triFri:"2×12",clean:"3×2 facile",cleanLoad:"95-115 lb",wodNote:"facile"}
  })[week] || {label:"S1",note:"",incline:"3×10",inclineLoad:"45-50 lb / main",press:"3×8-10",pressLoad:"110 lb",lat:"4×15-20",triOh:"4×10-15",triPush:"3×12-20",row:"4×10",pull:"3×8",rear:"4×15-20",face:"2×15-20",trap:"2×12",curl:"3×10-15",squat:"5×5",squatLoad:"165 lb",hip:"3×10",hinge:"3×10",shPress:"3×10",shPressLoad:"léger",lat2:"3×15-20",rear2:"3×15-20",face2:"3×15-20",serratus:"2×12/côté",triFri:"2×12-15",clean:"5×2 léger",cleanLoad:"115-135 lb",wodNote:"contrôlé"};
}
function shouldersEx(name,format,load,rest,note){return{name:name,format:format,load:charge(name,load||"—"),rest:rest||"—",note:note||""};}
function shouldersExFixed(name,format,load,rest,note){return{name:name,format:format,load:load||"—",rest:rest||"—",note:note||""};}

function shouldersBlocks(day,week){
  var p=shouldersWeekPlan(week);
  var isDeload=week===6;

  // LUNDI — Push + épaules session 1. Version 2026-06-09 : push strict, aucun pull avant le mardi.
  if(day==="lundi")return[
    {time:"7 min",title:"Échauffement push + coiffe des rotateurs",tag:"Préparation",kind:"warmup",
     text:"2 tours : Band External Rotation — elbow tucked 12/côté + Band Internal Rotation — elbow tucked 12/côté + Scap Push-up 8 + Wall Slide 8. Puis : montée Strict Press : barre à vide×8, 40%×5, 60%×3."},

    {time:"10 min",title:"A. Strict Press",tag:"Force",kind:"main",
     exercises:[shouldersExFixed("Strict Press",p.press,p.pressLoad,"2:00","Principal du jour : force overhead sous-maximale, liée à la progression Héritage 225. RPE 7-8. Stop si compensation lombaire.")]},

    {time:"13 min",title:"B. Superset Incline DB Press + deltoïde latéral",tag:"Superset hypertrophie",kind:"hypertrophy",
     text:"Push strict : haut de pec, deltoïde antérieur et deltoïde latéral. Aucun row, aucun band pull-apart, aucun rear delt direct avant le mardi.",
     exercises:[
       shouldersExFixed("Incline DB Press",p.incline,p.inclineLoad,"0:20 avant B2","Accessoire hypertrophie : haut de pec + deltoïde antérieur. Charge réduite parce que le Strict Press est prioritaire aujourd'hui. RPE 7-8, pas d'échec."),
       shouldersExFixed("B2. Lateral Raise câble",p.lat,"15-20 lb","1:15 après B2","Session 1 : câble bas = tension constante. Épaule basse, aucun élan. RPE 8 max, surtout après le press.")
     ]},

    {time:"12 min",title:"C. Triceps push",tag:"Hypertrophie",kind:"hypertrophy",
     text:"Bloc triceps principal du lundi. Weighted Dips = mouvement officiel; utiliser 0 lb si aucun poids ajouté, pour éviter les doublons Dips / Bodyweight Dips.",
     exercises:[
       shouldersEx("Weighted Dips",isDeload?"2×6-8 facile":"3×6-10",isDeload?"0 lb":"0-45 lb","0:45 avant C2","Poussée lourde triceps/lockout. Amplitude contrôlée, épaules basses. Ajouter du poids seulement si les reps restent propres."),
       shouldersEx("Overhead Rope Extension",p.triOh,"50-60 lb","1:00 après C2","Longue portion triceps. Coudes stables. Étirement contrôlé, pas agressif.")
     ]},

    {time:"8 min",title:"D. WOD court push",tag:"Conditioning",kind:"wod",
     text:"AMRAP 8 : 8 burpees contrôlés + 10 cal row + 12 sit-ups. "+p.wodNote+". Ce n'est pas un test : garder le moteur sans tuer les épaules."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Doorway pec stretch 1 min/côté + lat stretch sur rig 1 min/côté + triceps overhead stretch 1 min + respiration 1 min."}
  ];

  // MARDI — Pull / dos / arrière d'épaule / biceps. Pas de triceps, pas de press.
  if(day==="mardi")return[
    {time:"7 min",title:"Échauffement pull + scapula",tag:"Préparation",kind:"warmup",
     text:"Row facile 2 min + Band External Rotation — elbow tucked 15/côté + Band Pull Apart 15 + Scap Ring Row 8 + Face Pull léger 20 + montée Barbell Row : 1-2 séries progressives."},

    {time:"11 min",title:"A. Row principal",tag:"Dos",kind:"main",
     exercises:[shouldersEx("Barbell Row",p.row,week>=3&&week<=5?"125 lb":"115 lb","1:45-2:00","Tirage strict, buste solide, pas de swing. RPE 8.")]},

    {time:"12 min",title:"B. Superset tirage + biceps",tag:"Dos / Biceps",kind:"accessory",
     exercises:[
       shouldersExFixed("B1. Weighted Pull-up",p.pull,week>=4&&!isDeload?"+15 à +30 lb":"poids du corps","0:20 avant B2","B1 du superset. Si remplacé, inscrire Ring Row comme mouvement distinct (angle plus difficile), pas comme Weighted Pull-up."),
       shouldersExFixed("B2. Cable Curl",p.curl,"modéré","1:30 après B2","B2 du superset. Contrôle complet, pas d'élan du dos.")
     ]},

    {time:"12 min",title:"C. Rear delts / posture",tag:"Arrière épaule",kind:"accessory",
     exercises:[
       shouldersExFixed("C1. Rear Delt Fly câble",p.rear,"15-20 lb","0:30 avant C2","Session 1 arrière d'épaule : câble bas, bras long, épaule basse. Ne pas transformer en rowing."),
       shouldersEx("Face Pull",p.face,"60-70 lb","0:30 avant C3","Santé scapulaire. Rotation externe, cou relâché. RPE 7-8."),
       shouldersEx("Trap-3 Raise",p.trap,"léger","1:00 après C3","Trap inférieur. Pouce vers le haut, zéro shrug.")
     ]},

    {time:"10 min",title:"D. WOD pull / engine",tag:"Conditioning",kind:"wod",
     text:"EMOM 10 : min 1 = 12 cal row ; min 2 = 8-10 ring rows stricts. "+p.wodNote+". RPE global 7-8, pas de sprint."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Child pose lat stretch 1 min/côté + open book lent 1 min/côté + neck/trap stretch léger 1 min + respiration 1 min."}
  ];

  // JEUDI — jambes / core seulement. Aucune épaule directe, aucun bras direct.
  if(day==="jeudi")return[
    {time:"8 min",title:"Warm-up jambes",tag:"Préparation",kind:"warmup",
     text:"Bike 3 min + ankle rocks 10/côté + world's greatest stretch 5/côté + glute bridge 2×15 + goblet squat léger 2×10 + montée squat."},

    {time:"14 min",title:"A. Squat principal",tag:"Jambes",kind:"main",
     exercises:[shouldersExFixed("Front Squat",p.squat,p.squatLoad,"2:00","RPE 7-8. Dos protégé, aucune tentative héroïque.")]},

    {time:"12 min",title:"B. Unilatéral + core",tag:"Jambes / Core",kind:"accessory",
     text:"Structure terrain : Bulgarian Split Squat jumelé avec core pour récupérer les jambes sans courir entre deux stations lourdes.",
     exercises:[
       shouldersEx("Bulgarian Split Squat",isDeload?"2×8/jambe":"3×8-10/jambe","45-55 lb / main","0:45 avant B2","Amplitude propre, genou stable."),
       shouldersExFixed("Dead Bug",isDeload?"1 série facile":"2 séries","poids du corps","0:30 après B2","Côtes basses, respiration contrôlée."),
       shouldersExFixed("Hollow Hold",isDeload?"1 tenue facile":"1 tenue max propre","poids du corps","0:45 après B2","Gainage global, lombaires collés au sol.")
     ]},

    {time:"10 min",title:"C. Chaîne postérieure",tag:"Fessiers / Ischios",kind:"accessory",
     text:"Bloc plus fluide : deux mouvements de chaîne postérieure ensemble, sans mélanger unilatéral lourd et hip thrust.",
     exercises:[
       shouldersEx("Hip Thrust",isDeload?"2×10 léger":p.hip,"225-275 lb","0:45 avant C2","Pause en haut. Fessiers, pas lombaires."),
       shouldersEx("DB RDL",isDeload?"2×10 léger":p.hinge,"60-70 lb / main","1:00 après C2","Ischios. Dos neutre. Aucun ego.")
     ]},

    {time:"8 min",title:"D. WOD jambes / engine",tag:"Conditioning",kind:"wod",
     text:"For time 21-15-9 : Cal Bike + Box Step-ups. "+p.wodNote+". Cap 8 min. Zéro épaules directes, zéro bras direct."},

    {time:"5 min",title:"E. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Couch stretch 1 min/côté + ankle stretch 1 min/côté + hamstring stretch 1 min/côté + respiration 1 min."}
  ];

  // VENDREDI — Épaules session 2 angles différents + Power Clean technique APRÈS les épaules.
  return[
    {time:"7 min",title:"Échauffement épaules 3D + coiffe des rotateurs",tag:"Préparation",kind:"warmup",
     text:"2 tours : Band External Rotation — elbow tucked 12/côté + Band Internal Rotation — elbow tucked 12/côté + Serratus Wall Slide 8 + PVC Pass-through 10. Puis : DB Shoulder Press léger 12 + Lateral Raise très léger 15."},

    {time:"10 min",title:"A. Press contrôlé",tag:"Épaules",kind:"main",
     exercises:[shouldersExFixed("DB Shoulder Press",p.shPress,p.shPressLoad,"1:15-1:30","Session 2 : press contrôlé, pas strict press lourd. Si Landmine Press est utilisé, le noter comme Landmine Press distinct. RPE 7-8.")]},

    {time:"12 min",title:"B. Giant set épaules 3D — angle différent",tag:"Giant set",kind:"accessory",
     text:"Vendredi = angle différent du lundi/mardi. Utiliser haltères ou machine si possible, pas juste refaire câble bas identique.",
     exercises:[
       shouldersExFixed("B1. Lateral Raise DB",p.lat2,"modéré","—","Deltoïde latéral. Variante différente du câble bas de lundi. Si machine utilisée, noter Lateral Raise machine."),
       shouldersExFixed("B2. Rear Delt Fly DB",p.rear2,"modéré","—","Arrière d'épaule. Variante différente du câble bas de mardi. Si machine utilisée, noter Rear Delt Fly machine."),
       shouldersEx("Face Pull câble",p.face2,"50-70 lb","1:15 après B3","Posture/scapulas. RPE 7-8, cou relâché.")
     ]},

    {time:"10 min",title:"C. Delts/triceps rappel",tag:"Hypertrophie",kind:"accessory",
     text:"Remplace le serratus punch : bloc plus cohérent avec l'objectif hypertrophie. Upright row prise large à la poulie = deltoïde latéral/haut d'épaule, sans tirer vers le menton.",
     exercises:[
       shouldersEx("Wide-Grip Cable Upright Row",isDeload?"2×10 léger":"3×10-15","modéré","0:30 avant C2","Prise large, coudes ouverts. Tirer vers bas de poitrine/haut du sternum, pas vers le menton. Stop si pincement d'épaule."),
       shouldersEx("Overhead Rope Extension",p.triFri,"60-70 lb","1:00 après C2","Rappel triceps longue portion. Contexte distinct du lundi après press. RPE 8 max, coudes propres.")
     ]},

    {time:"6 min",title:"D. Power Clean technique",tag:"Haltéro",kind:"accessory",
     exercises:[shouldersExFixed("Power Clean",p.clean,p.cleanLoad,"1:00-1:30","Travail technique — après les épaules : maintien du pattern seulement. Léger/modéré, vitesse propre, aucune rep grindée.")]},

    {time:"8 min",title:"E. WOD full body court",tag:"Conditioning",kind:"wod",
     text:"AMRAP 8 : 5 power cleans légers + 8 wall balls 14 lb + 10 cal row. "+p.wodNote+". Modéré, pas redline."},

    {time:"5 min",title:"F. Mobilité",tag:"Mobilité",kind:"mobility",
     text:"Lat stretch 1 min/côté + front rack stretch 1 min + pec stretch 1 min + wrist stretch 1 min."}
  ];
}

window.COACH_BERTIN_PROGRAMS.shoulders3d.getBlocks = function(day, week){
  return shouldersBlocks(day, week);
};

window.COACH_BERTIN_PROGRAMS.shoulders3d.getWodText = function(day, week){
  var b = shouldersBlocks(day, week).filter(function(x){ return x.kind === "wod"; })[0];
  return b ? b.text : "";
};

window.COACH_BERTIN_PROGRAMS.shoulders3d.cycleRules = [
  "Structure stricte : lundi push strict/triceps, mardi pull/rear delts/biceps, jeudi jambes/core en blocs terrain, vendredi épaules angles différents + rappel delts/triceps + haltéro technique.",
  "Aucun travail direct du même muscle deux jours consécutifs.",
  "Vendredi : Power Clean APRÈS les épaules, léger/modéré, technique seulement.",
  "Lundi et vendredi ne doivent pas répéter exactement le même angle : câble bas lundi, haltères/machine vendredi.",
  "Aucun échec sur press, squat, power clean ou isolations.",
  "Deltoïde latéral : strict, pas d'élan, pas de trap supérieur.",
  "Triceps : lundi Weighted Dips + overhead extension; vendredi rappel overhead extension seulement, jamais au prix des coudes.",
  "WODs courts et cohérents avec le jour : push lundi, pull mardi, jambes jeudi, full body vendredi."
];

window.COACH_BERTIN_PROGRAMS.shoulders3d.dayIntentions = {
  lundi: "Push + épaules session 1 : strict press, incline DB, câble latéral, weighted dips, overhead triceps. Aucun pull, aucun biceps, aucun rear delt direct.",
  mardi: "Pull + arrière d'épaule + biceps : dos, rear delt, face pull, trap-3, curl. Aucun triceps, aucun press.",
  jeudi: "Jambes + core seulement : front squat, Bulgarian + core, hip thrust + DB RDL. Aucune épaule directe, aucun bras direct.",
  vendredi: "Épaules session 2 angles différents + rappel delts/triceps + power clean technique après les épaules. Objectif hypertrophie avant haltéro."
};

window.COACH_BERTIN_PROGRAMS.shoulders3d.dayMeta = {
  lundi:   {label:"Lundi",   base:"Push strict + delts/triceps", focus:"Strict press, incline DB press + lateral raise câble, weighted dips + overhead triceps, WOD court."},
  mardi:   {label:"Mardi",   base:"Pull + rear delts/biceps", focus:"Row, pull-up/ring row, rear delt, face pull, trap-3, curls."},
  jeudi:   {label:"Jeudi",   base:"Jambes + core",            focus:"Front Squat, Bulgarian + core, hip thrust + DB RDL, WOD jambes."},
  vendredi:{label:"Vendredi",base:"Épaules 3D + technique",   focus:"Press contrôlé, giant set angle différent, wide-grip cable upright row + overhead triceps, power clean technique après épaules."}
};

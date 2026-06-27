// Coach Bertin — Strict Muscle-Up Personnel (12 semaines)
// Objectif réel : passer d'une base solide en strict pull-up/dip à un strict ring muscle-up
// propre, puis transférer vers le bar muscle-up sans douleur d'épaule.
// Le vrai problème n'est pas la force de tirage (déjà là) mais la stabilité aux anneaux,
// la profondeur du ring dip, la raideur du triceps long, le contrôle scapulaire et la
// transition stricte. Cycle hybride : priorité MU, mais jambes et conditioning réels chaque semaine.
// Aucun mécanisme de suivi de douleur/validation n'existe dans l'app : les critères et seuils
// de douleur sont du texte descriptif (cycleRules, dayIntentions, notes de bloc), à appliquer
// par l'athlète pendant la séance — pas une logique de moteur.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function wk(i){ return Math.max(1, Math.min(12, Number(i)||1)); }
  function blockOf(week){ week=wk(week); if(week<=4)return 1; if(week<=8)return 2; return 3; }
  function isValidWeek(week){ return week===4 || week===8; }
  function isTestWeek(week){ return week===12; }
  function ridx(week,n){ return (wk(week)-1)%n; }

  function smuMeta(meta){
    meta=meta||{};
    return {
      intent:meta.intent||"",
      assistance:meta.assistance||null,
      tempo:meta.tempo||"",
      variation:meta.variation||""
    };
  }
  function smuEx(name,format,load,rest,note,meta){
    var exercise={name:name, format:format, load:charge(name,load||"—"), rest:rest||"—", note:note||""};
    return Object.assign(exercise,smuMeta(meta));
  }
  function smuExFixed(name,format,load,rest,note,meta){
    var exercise={name:name, format:format, load:load||"—", rest:rest||"—", note:note||""};
    return Object.assign(exercise,smuMeta(meta));
  }

  var weekLabels = [
    "S1 Fondations", "S2 Fondations", "S3 Fondations", "S4 Deload + Validation",
    "S5 Force spécifique", "S6 Force spécifique", "S7 Transition chargée", "S8 Deload + Validation",
    "S9 Intégration", "S10 Intégration", "S11 Transfert bar", "S12 Test conditionnel"
  ];
  var weekGoals = [
    "Tissus, amplitude, tolérance false grip. Aucune tentative complète.",
    "Solidité scapulaire et support aux anneaux. Toujours aucune tentative complète.",
    "Profondeur de ring dip sans pincement, transition basse isolée.",
    "Deload + validation bloc 1 : false grip, support, turnout, ROM dip, transition basse.",
    "Force spécifique : tirage chargé, ring dip strict, négatives contrôlées.",
    "Négatives plus profondes, premier strict MU assisté en bande forte.",
    "Transition chargée : assistance réduite, ring dip strict consolidé.",
    "Deload + validation bloc 2 : négative complète, MU assisté propre, zéro douleur.",
    "Intégration : assistance minimale, premières tentatives contrôlées.",
    "Intégration : tentatives strict MU + introduction drill bar MU (sol, sans tentative).",
    "Transfert bar : drill + tentatives basses assistées si zéro douleur.",
    "Test conditionnel (jamais obligatoire) + consolidation."
  ];

  function mission(week){
    var b=blockOf(week);
    if(b===1) return "Bloc 1 — Base/tissus/amplitude/stabilité : construire sans forcer, aucune tentative agressive.";
    if(b===2) return "Bloc 2 — Force spécifique/transition/contrôle profond : charger les bons tissus, contrôler la négative.";
    return "Bloc 3 — Intégration/tentatives contrôlées/transfert bar : seulement si les feux sont verts.";
  }

  var LEG_A = ["Front Squat","Back Squat","Bulgarian Split Squat","RDL"];
  var LEG_B = ["Hip Thrust","Step-up","RDL"];
  var SCAP_EX = [
    {name:"Scap Pull-up",defaultLoad:"poids du corps"},
    {name:"Serratus Wall Slide",defaultLoad:"poids du corps"},
    {name:"Scap Push-up",defaultLoad:"poids du corps"},
    {name:"Trap-3 Raise",defaultLoad:"10 lb / main"},
    {name:"External Rotation Band",defaultLoad:"10 lb"}
  ];
  var TRI_EX = [
    {name:"Overhead Cable Extension", defaultLoad:"50 lb"},
    {name:"Cable Pressdown", defaultLoad:"60 lb"},
    {name:"Cable Pressdown", defaultLoad:"50 lb", variation:"long-head stretch first"}
  ];
  var COND_A = ["Row facile","Ski Erg facile","Air Bike facile"];
  var COND_B = ["Row intervalles courts","Ski Erg intervalles courts","Air Bike intervalles courts"];
  var PUSH_MAINT = [
    {name:"Bench Press", defaultLoad:"185 lb", intent:"light", note:"Maintien léger/modéré à RPE 6-7."},
    {name:"Strict Press", defaultLoad:"95 lb", intent:"technique", note:"Technique légère à RPE 6, sans fatigue résiduelle."},
    {name:"DB Bench Press", defaultLoad:"50 lb / main", intent:"light", tempo:"3-1-1", note:"Tempo contrôlé, RPE 6-7."},
    {name:"Push-up", defaultLoad:"poids du corps", intent:"light", tempo:"3-1-1", note:"Tempo contrôlé, arrêter avec 3 reps en réserve."}
  ];
  var METCON = [
    {f:"AMRAP 8", t:"10 cal row + 8 box step-up + 10 sit-up. RPE 7-8, rien d'overhead lourd."},
    {f:"EMOM 10", t:"min 1 = 12 cal ski erg ; min 2 = 8 KB swing léger. Pas de pression overhead."},
    {f:"For Time (12 min cap)", t:"4 tours : 200 m row + 10 air squat + 8 sit-up. Contrôlé, aucun sprint final."},
    {f:"Intervalles 3×4 min", t:"Bike ou row, effort soutenu mais conversationnel, 2 min repos. Aucun mouvement d'épaule."}
  ];

  function legAFormat(week){
    if(isValidWeek(week)||isTestWeek(week)) return {format:"3×5 léger", load:"60-65%", note:"Deload jambes."};
    var b=blockOf(week);
    if(b===1) return {format:"4×6", load:"RPE 7-7.5", note:"Technique propre, aucun échec."};
    if(b===2) return {format:"4×5", load:"RPE 8", note:"Plus lourd, toujours 1-2 reps en réserve."};
    return {format:"3×5", load:"RPE 7-8", note:"Maintenance — priorité de la semaine va au MU."};
  }
  function legBFormat(week){
    if(isValidWeek(week)||isTestWeek(week)) return {format:"2×10 léger", load:"léger"};
    var b=blockOf(week);
    if(b===1) return {format:"3×10", load:"RPE 7"};
    if(b===2) return {format:"3×8", load:"RPE 7-8"};
    return {format:"3×8", load:"RPE 7"};
  }

  function pullPlan(week){
    week=wk(week);
    if(week===1) return {name:"Weighted Strict Pull-up", format:"4×6", load:"poids du corps", note:"Repère technique. ROM complète, strict, aucun kip."};
    if(week===2) return {name:"Chest-to-Sternum Pull-up", format:"4×5", load:"poids du corps", note:"Contrôle du haut, omoplates engagées avant de tirer."};
    if(week===3) return {name:"High Ring Row False Grip", format:"4×8", load:"poids du corps", intent:"strength", note:"RPE 7-8. False grip sous tension tirée, pieds avancés pour charger."};
    if(week===4) return {name:"Weighted Strict Pull-up", format:"3×5 léger", load:"poids du corps", note:"Deload. Qualité seulement."};
    if(week===5) return {name:"Weighted Strict Pull-up", format:"5×5", load:"+10-15 lb", note:"Force spécifique. Stop si l'amplitude raccourcit."};
    if(week===6) return {name:"Chest-to-Sternum Pull-up", format:"5×4", load:"poids du corps", note:"Tempo 3 s à la descente, contrôle total."};
    if(week===7) return {name:"Weighted Strict Pull-up", format:"5×4", load:"+15-20 lb", note:"Plus lourd, toujours strict."};
    if(week===8) return {name:"Weighted Strict Pull-up", format:"3×5 léger", load:"poids du corps", note:"Deload."};
    if(week===9) return {name:"Weighted Strict Pull-up", format:"4×4", load:"+15-25 lb", note:"Maintenance — la priorité de la semaine est le MU."};
    if(week===10) return {name:"Chest-to-Sternum Pull-up", format:"4×4", load:"poids du corps", note:"Explosif en montée, contrôlé en descente."};
    if(week===11) return {name:"Weighted Strict Pull-up", format:"4×4", load:"+15-25 lb", note:"Maintenance de force."};
    return {name:"Weighted Strict Pull-up", format:"3×4 léger", load:"poids du corps", note:"Semaine de test — ne pas griller le système nerveux avant la tentative."};
  }
  function fgPlan(week){
    week=wk(week);
    if(week===1) return {format:"4×10-15 sec", note:"Active hang false grip, repos complet entre séries."};
    if(week===2) return {format:"4×15-20 sec", note:"Même prise, un peu plus long."};
    if(week===3) return {format:"5×15-20 sec", note:"Ajoute une légère bascule de poids d'avant en arrière."};
    if(week===4) return {format:"Validation : 2×20 sec propre", note:"Sans douleur poignet/coude. Si échec, reste à ce palier la semaine prochaine."};
    if(week===5) return {format:"4×20-25 sec", note:"Ajoute Ring Row false grip 3×6 après le hang."};
    if(week===6) return {format:"4×25-30 sec", note:"Prise haute, épaules basses."};
    if(week===7) return {format:"5×20-25 sec", note:"Léger lest 5-10 lb si zéro douleur."};
    if(week===8) return {format:"Validation : 25-30 sec propre", note:"Transition vers prise haute sans douleur."};
    if(week===9||week===10||week===11) return {format:"3×20 sec", note:"Maintenance — la prise est acquise, l'attention va à la transition."};
    return {format:"2×20 sec", note:"Rappel léger avant test."};
  }
  function supPlan(week){
    week=wk(week);
    if(week===1) return {format:"3×15-20 sec", note:"Ring support de base, épaules basses."};
    if(week===2) return {format:"3×20-25 sec", note:"Garder les hanches sous les épaules."};
    if(week===3) return {format:"4×20-25 sec", note:"Légère instabilité des anneaux, dos plat."};
    if(week===4) return {format:"Validation : 25 sec stable", note:"Sans hausser les épaules."};
    if(week===5) return {format:"3×25-30 sec", note:"Ajoute turnout en fin de série."};
    if(week===6) return {format:"3×30 sec", note:"Respiration calme maintenue."};
    if(week===7) return {format:"4×25-30 sec", note:"Fait après une série de dip — support post-fatigue."};
    if(week===8) return {format:"Validation : 25 sec stable post-fatigue", note:"Si instable, retire le post-fatigue la semaine prochaine."};
    return {format:"3×20-25 sec", note:"Maintenance."};
  }
  function turnPlan(week){
    week=wk(week);
    if(week===1) return {format:"3×8-10 sec", note:"Turnout assisté, pieds touchent légèrement le sol."};
    if(week===2) return {format:"3×10-12 sec", note:"Coudes hauts, pas de pincement à l'épaule."};
    if(week===3) return {format:"4×10-15 sec", note:"Réduit l'assistance des pieds."};
    if(week===4) return {format:"Validation : 12-15 sec contrôlé", note:"Sans pincement ni douleur."};
    if(week===5) return {format:"3×15-20 sec", note:"Sans assistance des pieds."};
    if(week===6) return {format:"3×15-20 sec", note:"Léger lest si parfaitement propre."};
    if(week===7) return {format:"4×15-20 sec", note:"Enchaîné après le ring dip."};
    if(week===8) return {format:"Validation : 20 sec stable", note:"Critère pour débloquer le bloc 3."};
    return {format:"3×15 sec", note:"Maintenance."};
  }
  function dipPlan(week){
    week=wk(week);
    if(week===1) return {format:"4×5", load:"poids du corps", assistance:{type:"band",level:"strong"}, note:"Bande forte. ROM partielle contrôlée. Zéro pincement à l'épaule."};
    if(week===2) return {format:"4×5", load:"poids du corps", assistance:{type:"band",level:"medium"}, note:"Bande moyenne. Ajoute un peu de profondeur."};
    if(week===3) return {format:"4×6", load:"poids du corps", assistance:{type:"band",level:"light"}, note:"Bande légère. Vise la profondeur complète, contrôlée."};
    if(week===4) return {format:"Validation : 2 reps propres", load:"poids du corps", assistance:{type:"band",level:"light"}, note:"Bande légère. Profondeur acceptable, aucun pincement."};
    if(week===5) return {format:"3-4 reps strict + 3×4 assisté", load:"poids du corps", assistance:{type:"band",level:"light",optional:true}, note:"Premières reps strictes sans bande, puis bande légère pour le volume."};
    if(week===6) return {format:"4-5 reps strict", load:"poids du corps", note:"Tempo 2 sec à la descente."};
    if(week===7) return {format:"5-6 reps strict", load:"poids du corps", note:"Pause 2 sec en bas, lockout propre en haut."};
    if(week===8) return {format:"Validation : 5-6 reps strict propres", load:"poids du corps", note:"Profondeur stable, zéro douleur."};
    if(week===9) return {format:"6-8 reps strict", load:"poids du corps", note:"Retrouver le niveau dip classique, mais aux anneaux."};
    if(week===10) return {format:"6-8 reps + 1-2 lestées", load:"poids du corps", variation:"optional external load", note:"Ajouter un léger lest concret suggéré par le moteur seulement si zéro douleur."};
    if(week===11) return {format:"5-6 reps", load:"poids du corps", note:"Maintenance — la priorité va à la transition/MU."};
    return {format:"5-6 reps de consolidation", load:"poids du corps", note:"Qualité avant quantité cette semaine."};
  }
  function dipNegPlan(week){
    week=wk(week);
    if(week===1) return {format:"3×3", note:"Négative 3 sec depuis le haut, contrôlée."};
    if(week===2) return {format:"3×3", note:"Négative 4 sec."};
    if(week===3) return {format:"4×3", note:"Négative 4-5 sec, profondeur complète si possible."};
    if(week===4) return {format:"2×3 léger", note:"Deload — qualité seulement."};
    if(week===5) return {format:"3×4", note:"Négative 5 sec avec pause 1 sec en bas."};
    if(week===6) return {format:"4×3", note:"Négative 5-6 sec."};
    if(week===7) return {format:"3×3", note:"Négative 6 sec, léger lest si zéro douleur."};
    if(week===8) return {format:"2×3 léger", note:"Deload."};
    return {format:"2-3×3", note:"Maintenance 5 sec."};
  }
  function transPlan(week){
    week=wk(week);
    if(week===1) return {name:"Low Ring Transition", format:"4×3", assistance:{type:"feet",level:"floor"}, note:"Pieds au sol. Focus coude/poignet qui tournent ensemble. Aucune tentative complète."};
    if(week===2) return {name:"Low Ring Transition", format:"4×4", assistance:{type:"feet",level:"floor"}, note:"Pieds au sol. Amplitude un peu plus grande."};
    if(week===3) return {name:"Seated Strict MU Transition", format:"4×4", assistance:{type:"box",level:"seated"}, note:"Assis sur box. Isoler la rotation du poignet sans le tirage complet."};
    if(week===4) return {name:"Low Ring Transition", format:"Validation : 3 reps propres", assistance:{type:"feet",level:"floor"}, note:"Sans chicken wing. C'est le critère qui débloque le bloc 2."};
    if(week===5) return {name:"Slow Negative Muscle-Up", format:"3×2", note:"Du haut vers la transition vers le bas, entièrement contrôlé."};
    if(week===6) return {name:"Strict Ring Muscle-Up", format:"2×1", assistance:{type:"band",level:"strong"}, note:"Après 3×3 Slow Negative Muscle-Up dans le même bloc. Première exposition assistée, bande forte."};
    if(week===7) return {name:"Strict Ring Muscle-Up", format:"3×2", assistance:{type:"band",level:"medium"}, note:"Bande moyenne. Réduis l'assistance, garde le mouvement strict."};
    if(week===8) return {name:"Strict Ring Muscle-Up", format:"Validation : 1 rep propre", assistance:{type:"band",level:"medium"}, note:"Après une négative complète. Zéro douleur pendant ou le lendemain. Débloque le bloc 3."};
    if(week===9) return {name:"Strict Ring Muscle-Up", format:"3×2-3", assistance:{type:"band",level:"light"}, note:"Bande légère. Tentatives contrôlées, arrêt immédiat si douleur."};
    if(week===10) return {name:"Strict Ring Muscle-Up", format:"3×1-2", assistance:{type:"spot",level:"minimal",optional:true}, note:"Spot minimal possible, seulement si la semaine précédente était propre."};
    if(week===11) return {name:"Strict Ring Muscle-Up", format:"3×2-3", assistance:{type:"band_or_spot",level:"minimal",optional:true}, note:"Vise sans assistance si prêt; sinon assistance minimale."};
    return {name:"Strict Ring Muscle-Up", format:"Test conditionnel", note:"1) minimal-assisté propre, 2) complet si prêt, 3) jamais si critères non remplis — voir cycleRules."};
  }
  function barmuPlan(week){
    week=wk(week);
    if(week<=9) return null;
    if(week===10) return {format:"3×3", note:"Drill au sol seulement (jumping transition lente). Zéro tentative complète à la barre."};
    if(week===11) return {format:"Drill 3×3 + 1-2 tentatives basses assistées", note:"Seulement si zéro douleur cette semaine et la précédente."};
    return {format:"Test conditionnel — 1-2 tentatives max", note:"Seulement si le strict ring MU est propre ET zéro douleur. Sinon : drill seulement, pas de tentative."};
  }

  function rules(){
    return [
      "Priorité technique : 1) strict ring muscle-up propre, 2) transfert bar muscle-up sans douleur. Le bar MU n'est jamais utilisé comme test fréquent.",
      "Douleur épaule/coude/triceps : 0-2/10 acceptable. Au-delà de 2/10 pendant ou le lendemain : ne pas progresser, régresser immédiatement (ROM réduite, assistance augmentée, volume réduit), et abandonner la tentative complète ce jour-là.",
      "Interdits formels : ego reps, chicken wing, kipping, élan, transition forcée, tentative complète sans prérequis validés.",
      "Construction obligatoire avant toute tentative complète : false grip, tirage sternum, solidité scapulaire, contrôle hollow/arch, support aux anneaux, turnout, ring dip profond sans pincement, transition basse sans chicken wing, négatives contrôlées, MU assisté strict.",
      "Semaines 4 et 8 : deload + validation. Si un critère échoue, répéter la semaine ou utiliser la variante de régression — ne pas avancer à l'étape suivante.",
      "Semaine 12 : test conditionnel, jamais obligatoire. Si les critères ne sont pas remplis : sortir avec des recommandations (répéter le bloc 3, prolonger 2-4 semaines, corriger le point faible identifié) plutôt que de forcer le test.",
      "Aucune répétition identique semaine après semaine : l'angle de tirage, le type d'assistance, le tempo, l'amplitude, le support, l'accessoire triceps, l'exercice scapulaire et le conditionnement varient chaque semaine.",
      "Jambes et conditionnement réels chaque semaine — ce cycle ne remplace pas le bas du corps, il remplace une partie du volume haut du corps générique.",
      "Maintien poussée léger/modéré (bench/press/push-up tempo) sans gros volume les semaines où dips ou transition sont déjà lourds.",
      "Si fatigue généralisée ou douleur diffuse : réduire le volume/l'intensité avant de couper une séance complète."
    ];
  }

  window.COACH_BERTIN_PROGRAMS.strict_muscle_up_personnel = {
    id: "strict_muscle_up_personnel",
    label: "Strict Muscle-Up Personnel",
    phase: 0,
    phaseName: "Spécialité gymnastique personnelle",
    phaseEnd: "12 semaines fixes — pas de prolongation automatique.",
    nextPhase: null,
    impact: "Cycle personnel de 12 semaines : strict ring muscle-up propre puis transfert bar muscle-up sans douleur. Hybride — pas un programme 100% haut du corps : jambes et conditionnement réels chaque semaine, maintien poussée léger.",
    days: ["lundi", "mardi", "jeudi", "vendredi"],
    weekLabels: weekLabels,
    weekGoals: weekGoals,
    sets: weekLabels,
    targetReps: [6,5,8,5,5,4,4,5,4,4,4,4],
    mult: [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
    rest: "0:30-2:00 selon bloc",
    tag: "muscle-up",
    versionDate: "2026-06-23",
    versionLabel: "V51.89 — Identités stables, charges concrètes et assistance historisée",
    cycleRules: rules(),

    dayIntentions: {
      lundi: "Tirage spécifique + force haute + vrai stimulus jambes. Le pull lourd et le squat/hinge de la semaine, pas de travail MU à haute fatigue ici.",
      mardi: "Technique transition/false grip/scapula/préhab + maintien poussée léger. Séance de qualité, jamais de tentative complète.",
      jeudi: "Ring dip profond + support + triceps long + intégration stricte + jambes/conditionnement. Le ring dip est la priorité du jour.",
      vendredi: "Validation/intégration/transfert bar progressif/metcon contrôlé. Pas de tentative complète si les critères de la semaine ne sont pas validés."
    },
    dayMeta: {
      lundi:    {label:"Lundi",    base:"Tirage + Jambes",        focus:"Tirage chargé prioritaire, jambes réelles, aucune fatigue MU."},
      mardi:    {label:"Mardi",    base:"Technique + Scapula",    focus:"False grip, support, turnout, scapula, maintien poussée léger."},
      jeudi:    {label:"Jeudi",    base:"Ring Dip + Triceps",     focus:"Ring dip profond, négatives, triceps long, jambes secondaires."},
      vendredi: {label:"Vendredi", base:"Transition + Transfert", focus:"Transition stricte, transfert bar conditionnel, metcon contrôlé."}
    },

    getBlocks: function(day, week){
      week=wk(week);
      var deload=isValidWeek(week);
      var test=isTestWeek(week);
      var note=mission(week);
      var pull=pullPlan(week);
      var legA=LEG_A[ridx(week,4)], legAf=legAFormat(week);
      var legB=LEG_B[ridx(week,3)], legBf=legBFormat(week);
      var scap=SCAP_EX[ridx(week,5)];
      var tri=TRI_EX[ridx(week,3)];
      var condA=COND_A[ridx(week,3)];
      var condB=COND_B[ridx(week,3)];
      var pushMaint=PUSH_MAINT[ridx(week,4)];
      var metcon=METCON[ridx(week,4)];
      var fg=fgPlan(week), sup=supPlan(week), turn=turnPlan(week);
      var dip=dipPlan(week), dipNeg=dipNegPlan(week);
      var trans=transPlan(week), barmu=barmuPlan(week);

      if(day==="lundi") return [
        {time:"6 min", title:"Échauffement tirage + jambes", tag:"Préparation", kind:"warmup",
          text:"Row facile 2 min + band pull-apart 15 + scap push-up 8 + goblet squat léger 10."},
        {time:"18 min", title:"A. Tirage strict priorité", tag:"Force", kind:"main",
          exercises:[smuEx(pull.name, pull.format, pull.load, "2:00", pull.note,{intent:pull.intent})]},
        {time:"16 min", title:"B. Jambes priorité", tag:"Jambes", kind:"main",
          exercises:[smuEx(legA, legAf.format, legAf.load, "2:00", legAf.note||"Stimulus jambes réel — ce cycle ne sacrifie pas le bas du corps.")]},
        {time:"12 min", title:"C. Superset grip + tronc", tag:"Accessoire", kind:"accessory",
          exercises:[
            smuExFixed("Ring Row False Grip", deload?"2×8":"3×8-10", "poids du corps", "0:30 avant C2", "Renforce la prise sans fatiguer le tirage principal.",{intent:"light"}),
            smuExFixed("Hollow Hold", deload?"2×20 sec":"3×20-30 sec", "poids du corps", "0:45 après C2", "Contrôle tronc utile pour la transition.")
          ]},
        {time:"5 min", title:"D. Conditioning court", tag:"Conditioning", kind:"wod",
          text:condA+" 5 min, RPE 6-7, conversationnel."},
        {time:"3 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Lat stretch 45 sec/côté + pec stretch 45 sec/côté + respiration."}
      ];

      if(day==="mardi") return [
        {time:"6 min", title:"Échauffement épaules/scapula", tag:"Préparation", kind:"warmup",
          text:"Bike léger 2 min + band external rotation 12/côté + wall slide 8 + arm circles 1 min."},
        {time:"16 min", title:"A. False grip + ring support", tag:"Technique", kind:"accessory",
          text:"Bloc technique pur : false grip hang puis ring support. Aucune tentative complète aujourd'hui.",
          exercises:[
            smuExFixed("False Grip Hang", fg.format, "poids du corps", "1:00 avant A2", fg.note),
            smuExFixed("Ring Support Hold", sup.format, "poids du corps", "1:00 après A2", sup.note)
          ]},
        {time:"14 min", title:"B. Ring turnout + scapula", tag:"Technique", kind:"accessory",
          text:"Drill de stabilité scapulaire et turnout. Skill, pas force.",
          exercises:[
            smuExFixed("Ring Turnout Support", turn.format, "poids du corps", "0:45 avant B2", turn.note),
            smuEx(scap.name, deload?"2×10":"3×10-15", scap.defaultLoad, "0:45 après B2", "Rotation externe/scapula — varie chaque semaine pour éviter la monotonie.",{intent:deload?"recovery":"technique"})
          ]},
        {time:"12 min", title:"C. Maintien poussée légère", tag:"Poussée", kind:"hypertrophy",
          exercises:[smuEx(pushMaint.name, deload?"2×8":"3×8-10", pushMaint.defaultLoad, "1:00", pushMaint.note+" Maintien seulement — pas de volume lourd cette semaine.",{intent:pushMaint.intent,tempo:pushMaint.tempo})]},
        {time:"8 min", title:"D. Conditioning", tag:"Conditioning", kind:"wod",
          text:condB+" 8 min, RPE 7. Aucun mouvement d'épaule sollicitant le dip/transition."},
        {time:"4 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Triceps long head stretch 1 min/côté + doorway pec stretch 1 min/côté."}
      ];

      if(day==="jeudi") return [
        {time:"6 min", title:"Échauffement anneaux", tag:"Préparation", kind:"warmup",
          text:"Row facile 2 min + scap push-up 10 + active hang léger 2×10 sec + band external rotation 10/côté."},
        {time:"16 min", title:"A. Ring dip profond", tag:"Skill", kind:"main",
          text:"Priorité de la séance. Arrêter immédiatement si pincement ou douleur à l'épaule.",
          exercises:[smuExFixed("Ring Dip", dip.format, dip.load, "1:30-2:00", dip.note,{assistance:dip.assistance,variation:dip.variation})]},
        {time:"14 min", title:"B. Superset négative + triceps long", tag:"Accessoire", kind:"accessory",
          exercises:[
            smuExFixed("Dip Eccentric", dipNeg.format, "poids du corps", "0:45 avant B2", dipNeg.note),
            smuEx(tri.name, deload?"2×10":"3×10-15", tri.defaultLoad, "1:00 après B2", "Triceps long head — varie chaque semaine.",{intent:"hypertrophy",variation:tri.variation})
          ]},
        {time:"14 min", title:"C. Jambes secondaire + chaîne postérieure", tag:"Jambes", kind:"accessory",
          exercises:[smuEx(legB, legBf.format, legBf.load, "1:00", "Jambes réelles, jamais sautées même en semaine MU chargée.")]},
        {time:"7 min", title:"D. Conditioning", tag:"Conditioning", kind:"wod",
          text:condA+" 7 min, RPE 6-7."},
        {time:"3 min", title:"E. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Triceps overhead stretch 1 min/côté + lat stretch 1 min/côté."}
      ];

      var blockB = barmu
        ? {time:"12 min", title:"B. Transfert bar muscle-up", tag:"Transfert", kind:"accessory",
            text:"Conditionnel — uniquement si la semaine précédente était propre et sans douleur. Sinon : drill seulement, aucune tentative.",
            exercises:[smuExFixed("Bar Muscle-up Transition Drill", barmu.format, "poids du corps", "1:30", barmu.note)]}
        : {time:"12 min", title:"B. Maintenance false grip + scapula", tag:"Maintenance", kind:"accessory",
            text:"Bloc technique. Pas encore de travail bar — priorité au strict ring MU.",
            exercises:[
              smuExFixed("False Grip Hang", "2×20 sec", "poids du corps", "0:45 avant B2", "Maintenance courte."),
              smuEx(scap.name, "2×10", scap.defaultLoad, "0:45 après B2", "Maintenance scapulaire.",{intent:"light"})
            ]};

      return [
        {time:"8 min", title:"Échauffement transition", tag:"Préparation", kind:"warmup",
          text:"Row facile 2 min + active hang 2×10 sec + ring support 2×10 sec + scap push-up 8."},
        {time:"18 min", title:"A. Transition stricte", tag:"Skill", kind:"main",
          text:"Cœur de la séance. "+(test?"Test conditionnel — voir cycleRules avant de tenter.":"Aucune tentative complète sans validation de la semaine."),
          exercises:(week===6||week===8)
            ? [
                smuExFixed("Slow Negative Muscle-Up",week===6?"3×3":"Validation : 1 négative complète","poids du corps","1:30","Contrôle complet avant le travail assisté.",{intent:"technique",tempo:"slow eccentric"}),
                smuExFixed(trans.name,trans.format,"poids du corps","2:00",trans.note,{intent:"progression",assistance:trans.assistance})
              ]
            : [smuExFixed(trans.name, trans.format, "poids du corps", "2:00", trans.note,{intent:test?"test":"progression",assistance:trans.assistance})]},
        blockB,
        {time:"16 min", title:"C. Metcon contrôlé", tag:"Conditioning", kind:"wod",
          text:metcon.f+" : "+metcon.t},
        {time:"4 min", title:"D. Mobilité", tag:"Mobilité", kind:"mobility",
          text:"Pec/lat/triceps stretch 45 sec chacun + respiration. "+note}
      ];
    },

    getWodText: function(day, week){
      var b=this.getBlocks(day, week).filter(function(x){ return x.kind==="wod"; })[0];
      return b ? b.text : "";
    }
  };
})();

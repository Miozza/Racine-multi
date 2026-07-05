// Racine Programme autonome : Arnold Split Strict
// 6 séances nommées par objectif d'entraînement (jamais par jour de semaine).
// Les clés lundi→samedi sont des identifiants internes moteur uniquement ;
// l'affichage passe par dayMeta[day].label. Aucune logique de charge ici :
// les suggestions viennent du moteur scripts/charge/ (Epley + historique).

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function ex(name, format, load, rest, note){
    return { name:name, format:format, load:load || "RPE 7–8", rest:rest || "—", note:note || "" };
  }

  var globalRules = "Repos : 90–150 sec sur les gros mouvements, 60–90 sec sur l’isolation. RPE 7–8 au début, 8–9 max en fin de cycle. Pas d’échec sur squat/deadlift/RDL/mouvements lourds. AMRAP seulement sur pull-ups/dips/ring rows, arrêt RPE 9 max. Progression : si toutes les séries atteignent le haut de plage avec bonne forme, augmenter légèrement la prochaine fois. Les séances se font dans l’ordre, peu importe le jour réel de la semaine — saute ou répète librement.";

  function strictBlocks(day, week){
    if(day==="lundi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"48–58 min",title:"A. Pecs + Dos A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Bench Press","4×8-12","RPE 7–8","90-150 sec","Garde les omoplates serrées, barre contrôlée, pas de rebond."),
        ex("Incline DB Press","4×8-12","RPE 7–8","90-150 sec","Inclinaison modérée, descente lente, pousse sans verrouiller brutalement."),
        ex("Pull-Up","4×AMRAP propre","RPE 9 max","90-150 sec","Option : Ring Row si les pull-ups ne sont pas propres. Arrête avant de perdre la forme."),
        ex("Barbell Row","4×8-12","RPE 7–8","90-150 sec","Dos gainé, tire les coudes vers les hanches."),
        ex("DB Fly","3×10-15","Léger","60-90 sec","Grand étirement, aucune douleur d’épaule."),
        ex("Tirage élastique","4×10-12","RPE 7–8","60-90 sec","Option : Ring Row wide. Remplacement du lat pulldown. Mouvement contrôlé.")
      ]},
      {time:"5–8 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Mobilité pecs/lats légère + respiration. Stopper si épaules irritées."}
    ];

    if(day==="mardi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"50–60 min",title:"A. Épaules + Bras A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Seated DB Press","4×8-12","RPE 7–8","90-150 sec","Tronc solide, haltères contrôlés, pas d’élan."),
        ex("Cable Lateral Raise","4×10-15","RPE 8","60-90 sec","Monte jusqu’à l’épaule, contrôle la descente."),
        ex("Barbell Curl","4×8-12","RPE 7–8","60-90 sec","Coudes fixes, pas de swing du dos."),
        ex("Dips","4×AMRAP propre","RPE 9 max","90-150 sec","Si épaules sensibles, amplitude réduite."),
        ex("Preacher Curl","3×10-12","RPE 8","60-90 sec","Option : Curl incliné. Mouvement strict, étirement contrôlé."),
        ex("Skull Crusher","3×8-12","Charge modérée","60-90 sec","Coudes stables, charge modérée.")
      ]},
      {time:"5 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Décompression épaules/coudes. Aucun set forcé."}
    ];

    if(day==="mercredi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"48–58 min",title:"A. Jambes A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Back Squat","4×8-12","RPE 7–8","90-150 sec","Option : Front Squat si plus naturel. Descente contrôlée, gainage fort, profondeur stable."),
        ex("Lunges","3×10-15/jambe","RPE 7–8","90-150 sec","Pas long, genou stable, contrôle complet."),
        ex("Stiff-Leg Deadlift","4×10-12","RPE 7–8","90-150 sec","Hanches vers l’arrière, dos neutre, étirement ischios."),
        ex("Standing Calf Raise","4×15-20","RPE 8","60-90 sec","Pause en haut, descente complète.")
      ]},
      {time:"5–8 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Mobilité hanches/ischios/mollets. Si le bas du dos parle, réduire la prochaine séance."}
    ];

    if(day==="jeudi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"50–62 min",title:"A. Pecs + Dos B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Deadlift","3×6-10","RPE 8 max","90-150 sec","Technique propre seulement. Pas d’échec."),
        ex("Decline Bench Press","4×8-12","RPE 7–8","90-150 sec","Option : DB Press plat si decline non disponible. Contrôle la descente, pousse fort sans rebond."),
        ex("Chest Dips","4×AMRAP propre","RPE 9 max","90-150 sec","Penche légèrement le torse."),
        ex("One-Arm DB Row","4×8-12/côté","RPE 7–8","90-150 sec","Tire le coude vers la hanche, pause en haut."),
        ex("Seated Cable Row","4×10-12","RPE 7–8","60-90 sec","Option : Ring Row si cable row non disponible. Dos droit, scapulas serrées."),
        ex("Cable Fly","3×10-15","Léger","60-90 sec","Option : DB Fly si cable non disponible. Contraction pecs, pas de douleur.")
      ]},
      {time:"5 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Respiration + mobilité lats/pecs. Noter toute fatigue lombaire."}
    ];

    if(day==="vendredi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"48–58 min",title:"A. Épaules + Bras B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Arnold Press","4×8-12","RPE 7–8","90-150 sec","Rotation contrôlée, ne force pas l’amplitude si douleur."),
        ex("Front Raise","4×10-12","Léger","60-90 sec","Pas d’élan, arrêt hauteur épaule."),
        ex("Reverse Curl","4×8-12","RPE 7–8","60-90 sec","Poignets neutres, contrôle complet."),
        ex("Overhead Tricep Extension","4×8-12","RPE 7–8","60-90 sec","Étire les triceps, coudes serrés."),
        ex("Concentration Curl","3×10-12","RPE 8","60-90 sec","Strict, contraction forte en haut."),
        ex("Tricep Pushdown","3×10-12","RPE 8","60-90 sec","Coudes collés au corps, extension complète.")
      ]},
      {time:"5 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Pompage léger seulement si les coudes sont OK. Sinon mobilité et fin."}
    ];

    return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"52–62 min",title:"A. Jambes B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Front Squat","4×10-15","RPE 7–8","90-150 sec","Option : Goblet Squat avec tempo si front squat non souhaité. Remplace la leg press. Tempo contrôlé, posture droite."),
        ex("Romanian Deadlift","4×8-12","RPE 7–8","90-150 sec","Hanches loin derrière, dos neutre, charge maîtrisée."),
        ex("Bulgarian Split Squat","3×10-12/jambe","RPE 7–8","90-150 sec","Descente stable, pousse par le talon avant."),
        ex("Hamstring Walkout","4×10-12","RPE 8","60-90 sec","Option : Sliding Leg Curl. Remplace le leg curl machine. Garde les hanches hautes."),
        ex("Standing Calf Raise","4×15-20","RPE 8","60-90 sec","Amplitude complète, pause en haut.")
      ]},
      {time:"5–8 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Retour au calme hanches/ischios/mollets. Repos ou mobilité légère avant de reprendre le cycle."}
    ];
  }

  window.COACH_BERTIN_PROGRAMS.arnold_split_strict = {
    id: "arnold_split_strict",
    label: "Arnold Split Strict",
    phase: 0,
    phaseName: "Hors-saison hypertrophie",
    impact: "6 séances bodybuilding nommées par objectif, sans attache au calendrier : enchaîne les séances dans l’ordre à ta fréquence réelle. Volume élevé, RPE contrôlé, aucun échec sur les mouvements lourds.",
    days: ["lundi","mardi","mercredi","jeudi","vendredi","samedi"],
    rest: "90–150 sec gros mouvements / 60–90 sec isolation",
    tag: "hypertrophie",
    trainingStyle: "bodybuilding",
    conditioning: "none",
    cycleRules: [
      "Les séances se suivent dans l’ordre, peu importe le jour réel — saute ou répète librement.",
      "RPE 7–8 au début du cycle, 8–9 max en fin de cycle.",
      "Aucun échec sur squat, deadlift, RDL et mouvements lourds.",
      "AMRAP seulement sur pull-ups/dips/ring rows, arrêt RPE 9 max.",
      "Si toutes les séries atteignent le haut de plage avec bonne forme, augmenter légèrement la prochaine fois."
    ],
    dayIntentions: {
      lundi:    "Accumuler du volume pecs/dos en gardant les épaules propres et le tirage solide.",
      mardi:    "Construire deltoïdes et bras avec contrôle, sans élan ni surcharge articulaire.",
      mercredi: "Construire une base jambes solide sans aller à l’échec sur les mouvements lourds.",
      jeudi:    "Travailler pecs/dos sous d’autres angles, avec deadlift technique et sans échec.",
      vendredi: "Ajouter du volume propre épaules/bras sans chercher les charges maximales.",
      samedi:   "Deuxième stimulation jambes sans machine obligatoire, avec tempo et contrôle."
    },
    dayMeta: {
      lundi:    {label:"Pecs + Dos A",     base:"Poussée/tirage volume", focus:"Bench, incline, pull-ups, rows, flys. Alternance poussée/tirage."},
      mardi:    {label:"Épaules + Bras A", base:"Delts + bras lourds",   focus:"Presses épaules, latéraux, curls, dips, triceps."},
      mercredi: {label:"Jambes A",         base:"Squat + ischios",       focus:"Squat, lunges, stiff-leg deadlift, mollets."},
      jeudi:    {label:"Pecs + Dos B",     base:"Deadlift + angles",     focus:"Deadlift technique, decline, chest dips, rows horizontaux."},
      vendredi: {label:"Épaules + Bras B", base:"Finition/congestion",   focus:"Arnold press, raises, isolation biceps/triceps."},
      samedi:   {label:"Jambes B",         base:"Quads + fessiers",      focus:"Front squat tempo, RDL, bulgarian split squat, ischios, mollets."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getBlocks = function(day, week){ return strictBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getWodText = function(day, week){
    var b = strictBlocks(day, week).filter(function(x){ return x.kind==="wod"; })[0];
    return b ? b.text : "Aucun WOD — bloc hypertrophie.";
  };
})();

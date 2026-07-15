// Racine Programme autonome : Arnold Split Strict
// 6 sÃ©ances nommÃ©es par objectif d'entraÃ®nement (jamais par jour de semaine).
// Les clÃ©s lundiâ†’samedi sont des identifiants internes moteur uniquement ;
// l'affichage passe par dayMeta[day].label.
//
// Charges : chaque exercice porte une charge de BASE numÃ©rique (poids de
// travail hypertrophie 8-12 reps pour l'athlÃ¨te de rÃ©fÃ©rence), comme force.js.
// Le moteur scripts/charge/ la met Ã  l'Ã©chelle du profil actif (scaleRatios),
// l'arrondit Ã  l'Ã©quipement, puis progresse via l'historique (Epley). Aucune
// progression de charge codÃ©e en dur ici (pas de table mult[] par semaine).
// Mouvements au poids du corps / bande : libellÃ© texte, pas de charge chiffrÃ©e.

window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

(function(){
  function ex(name, format, load, rest, note){
    return { name:name, format:format, load:load || "RPE 7â€“8", rest:rest || "â€”", note:note || "" };
  }

  var globalRules = "Repos : 90â€“150 sec sur les gros mouvements, 60â€“90 sec sur lâ€™isolation. RPE 7â€“8 au dÃ©but, 8â€“9 max en fin de cycle. Pas dâ€™Ã©chec sur squat/deadlift/RDL/mouvements lourds. AMRAP seulement sur pull-ups/dips/ring rows, arrÃªt RPE 9 max. Progression : si toutes les sÃ©ries atteignent le haut de plage avec bonne forme, augmenter lÃ©gÃ¨rement la prochaine fois. Les sÃ©ances se font dans lâ€™ordre, peu importe le jour rÃ©el de la semaine â€” saute ou rÃ©pÃ¨te librement.";

  function strictBlocks(day, week){
    if(day==="lundi") return [
      {time:"2 min",title:"RÃ¨gles du bloc",tag:"PrÃ©paration",kind:"warmup",text:globalRules},
      {time:"48â€“58 min",title:"A. Pecs + Dos A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Bench Press","4Ã—8-12","205 lb","90-150 sec","Garde les omoplates serrÃ©es, barre contrÃ´lÃ©e, pas de rebond."),
        ex("Incline DB Press","4Ã—8-12","70 lb","90-150 sec","Inclinaison modÃ©rÃ©e, descente lente, pousse sans verrouiller brutalement."),
        ex("Pull-Up","4Ã—AMRAP propre","Poids du corps","90-150 sec","Option : Ring Row si les pull-ups ne sont pas propres. ArrÃªte avant de perdre la forme."),
        ex("Barbell Row","4Ã—8-12","165 lb","90-150 sec","Dos gainÃ©, tire les coudes vers les hanches."),
        ex("DB Fly","3Ã—10-15","35 lb","60-90 sec","Grand Ã©tirement, aucune douleur dâ€™Ã©paule."),
        ex("Lat Pulldown","4Ã—10-12","140 lb","60-90 sec","Prise large, tire les coudes vers le bas et garde le torse stable.")
      ]},
      {time:"5â€“8 min",title:"Sortie",tag:"MobilitÃ©",kind:"mobility",text:"MobilitÃ© pecs/lats lÃ©gÃ¨re + respiration. Stopper si Ã©paules irritÃ©es."}
    ];

    if(day==="mardi") return [
      {time:"2 min",title:"RÃ¨gles du bloc",tag:"PrÃ©paration",kind:"warmup",text:globalRules},
      {time:"50â€“60 min",title:"A. Ã‰paules + Bras A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Seated DB Press","4Ã—8-12","60 lb","90-150 sec","Tronc solide, haltÃ¨res contrÃ´lÃ©s, pas dâ€™Ã©lan."),
        ex("Cable Lateral Raise","4Ã—10-15","25 lb","60-90 sec","Monte jusquâ€™Ã  lâ€™Ã©paule, contrÃ´le la descente."),
        ex("Barbell Curl","4Ã—8-12","75 lb","60-90 sec","Coudes fixes, pas de swing du dos."),
        ex("Dips","4Ã—AMRAP propre","Poids du corps","90-150 sec","Si Ã©paules sensibles, amplitude rÃ©duite."),
        ex("Hammer Curls","3Ã—10-12","40 lb","60-90 sec","Prise marteau (neutre), coudes fixes, contrÃ´le la descente."),
        ex("Skull Crusher","3Ã—8-12","70 lb","60-90 sec","Coudes stables, charge modÃ©rÃ©e.")
      ]},
      {time:"5 min",title:"Sortie",tag:"MobilitÃ©",kind:"mobility",text:"DÃ©compression Ã©paules/coudes. Aucun set forcÃ©."}
    ];

    if(day==="mercredi") return [
      {time:"2 min",title:"RÃ¨gles du bloc",tag:"PrÃ©paration",kind:"warmup",text:globalRules},
      {time:"48â€“58 min",title:"A. Jambes A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Back Squat","4Ã—8-12","205 lb","90-150 sec","Option : Front Squat si plus naturel. Descente contrÃ´lÃ©e, gainage fort, profondeur stable."),
        ex("Lunges","3Ã—10-15/jambe","45 lb","90-150 sec","Pas long, genou stable, contrÃ´le complet."),
        ex("Stiff-Leg Deadlift","4Ã—10-12","165 lb","90-150 sec","Hanches vers lâ€™arriÃ¨re, dos neutre, Ã©tirement ischios."),
        ex("Standing Calf Raise","4Ã—15-20","180 lb","60-90 sec","Pause en haut, descente complÃ¨te.")
      ]},
      {time:"5â€“8 min",title:"Sortie",tag:"MobilitÃ©",kind:"mobility",text:"MobilitÃ© hanches/ischios/mollets. Si le bas du dos parle, rÃ©duire la prochaine sÃ©ance."}
    ];

    if(day==="jeudi") return [
      {time:"2 min",title:"RÃ¨gles du bloc",tag:"PrÃ©paration",kind:"warmup",text:globalRules},
      {time:"50â€“62 min",title:"A. Pecs + Dos B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Deadlift","3Ã—6-10","245 lb","90-150 sec","Technique propre seulement. Pas dâ€™Ã©chec."),
        ex("Decline Bench Press","4Ã—8-12","195 lb","90-150 sec","Option : DB Press plat si decline non disponible. ContrÃ´le la descente, pousse fort sans rebond."),
        ex("Chest Dips","4Ã—AMRAP propre","Poids du corps","90-150 sec","Penche lÃ©gÃ¨rement le torse."),
        ex("One-Arm DB Row","4Ã—8-12/cÃ´tÃ©","80 lb","90-150 sec","Tire le coude vers la hanche, pause en haut."),
        ex("Seated Cable Row","4Ã—10-12","150 lb","60-90 sec","Option : Ring Row si cable row non disponible. Dos droit, scapulas serrÃ©es."),
        ex("Cable Fly","3Ã—10-15","35 lb","60-90 sec","Option : DB Fly si cable non disponible. Contraction pecs, pas de douleur.")
      ]},
      {time:"5 min",title:"Sortie",tag:"MobilitÃ©",kind:"mobility",text:"Respiration + mobilitÃ© lats/pecs. Noter toute fatigue lombaire."}
    ];

    if(day==="vendredi") return [
      {time:"2 min",title:"RÃ¨gles du bloc",tag:"PrÃ©paration",kind:"warmup",text:globalRules},
      {time:"48â€“58 min",title:"A. Ã‰paules + Bras B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Arnold Press","4Ã—8-12","50 lb","90-150 sec","Rotation contrÃ´lÃ©e, ne force pas lâ€™amplitude si douleur."),
        ex("Front Raise","4Ã—10-12","25 lb","60-90 sec","Pas dâ€™Ã©lan, arrÃªt hauteur Ã©paule."),
        ex("Reverse Curl","4Ã—8-12","55 lb","60-90 sec","Poignets neutres, contrÃ´le complet."),
        ex("Overhead Tricep Extension","4Ã—8-12","70 lb","60-90 sec","Ã‰tire les triceps, coudes serrÃ©s."),
        ex("Concentration Curl","3Ã—10-12","35 lb","60-90 sec","Strict, contraction forte en haut."),
        ex("Tricep Pushdown","3Ã—10-12","60 lb","60-90 sec","Coudes collÃ©s au corps, extension complÃ¨te.")
      ]},
      {time:"5 min",title:"Sortie",tag:"MobilitÃ©",kind:"mobility",text:"Pompage lÃ©ger seulement si les coudes sont OK. Sinon mobilitÃ© et fin."}
    ];

    return [
      {time:"2 min",title:"RÃ¨gles du bloc",tag:"PrÃ©paration",kind:"warmup",text:globalRules},
      {time:"52â€“62 min",title:"A. Jambes B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Front Squat","4Ã—10-15","155 lb","90-150 sec","Option : Goblet Squat avec tempo si front squat non souhaitÃ©. Remplace la leg press. Tempo contrÃ´lÃ©, posture droite."),
        ex("Romanian Deadlift","4Ã—8-12","175 lb","90-150 sec","Hanches loin derriÃ¨re, dos neutre, charge maÃ®trisÃ©e."),
        ex("Bulgarian Split Squat","3Ã—10-12/jambe","50 lb","90-150 sec","Descente stable, pousse par le talon avant."),
        ex("Hamstring Walkout","4Ã—10-12","Poids du corps","60-90 sec","Option : Sliding Leg Curl. Remplace le leg curl machine. Garde les hanches hautes."),
        ex("Standing Calf Raise","4Ã—15-20","180 lb","60-90 sec","Amplitude complÃ¨te, pause en haut.")
      ]},
      {time:"5â€“8 min",title:"Sortie",tag:"MobilitÃ©",kind:"mobility",text:"Retour au calme hanches/ischios/mollets. Repos ou mobilitÃ© lÃ©gÃ¨re avant de reprendre le cycle."}
    ];
  }

  window.COACH_BERTIN_PROGRAMS.arnold_split_strict = {
    id: "arnold_split_strict",
    label: "Arnold Split Strict",
    phase: 0,
    phaseName: "Hors-saison hypertrophie",
    impact: "6 sÃ©ances bodybuilding nommÃ©es par objectif, sans attache au calendrier : enchaÃ®ne les sÃ©ances dans lâ€™ordre Ã  ta frÃ©quence rÃ©elle. Volume Ã©levÃ©, RPE contrÃ´lÃ©, aucun Ã©chec sur les mouvements lourds.",
    days: ["lundi","mardi","mercredi","jeudi","vendredi","samedi"],
    rest: "90â€“150 sec gros mouvements / 60â€“90 sec isolation",
    tag: "hypertrophie",
    trainingStyle: "bodybuilding",
    conditioning: "none",
    cycleRules: [
      "Les sÃ©ances se suivent dans lâ€™ordre, peu importe le jour rÃ©el â€” saute ou rÃ©pÃ¨te librement.",
      "RPE 7â€“8 au dÃ©but du cycle, 8â€“9 max en fin de cycle.",
      "Aucun Ã©chec sur squat, deadlift, RDL et mouvements lourds.",
      "AMRAP seulement sur pull-ups/dips/ring rows, arrÃªt RPE 9 max.",
      "Si toutes les sÃ©ries atteignent le haut de plage avec bonne forme, augmenter lÃ©gÃ¨rement la prochaine fois."
    ],
    dayIntentions: {
      lundi:    "Accumuler du volume pecs/dos en gardant les Ã©paules propres et le tirage solide.",
      mardi:    "Construire deltoÃ¯des et bras avec contrÃ´le, sans Ã©lan ni surcharge articulaire.",
      mercredi: "Construire une base jambes solide sans aller Ã  lâ€™Ã©chec sur les mouvements lourds.",
      jeudi:    "Travailler pecs/dos sous dâ€™autres angles, avec deadlift technique et sans Ã©chec.",
      vendredi: "Ajouter du volume propre Ã©paules/bras sans chercher les charges maximales.",
      samedi:   "DeuxiÃ¨me stimulation jambes sans machine obligatoire, avec tempo et contrÃ´le."
    },
    dayMeta: {
      lundi:    {label:"Pecs + Dos A",     base:"PoussÃ©e/tirage volume", focus:"Bench, incline, pull-ups, rows, flys. Alternance poussÃ©e/tirage."},
      mardi:    {label:"Ã‰paules + Bras A", base:"Delts + bras lourds",   focus:"Presses Ã©paules, latÃ©raux, curls, dips, triceps."},
      mercredi: {label:"Jambes A",         base:"Squat + ischios",       focus:"Squat, lunges, stiff-leg deadlift, mollets."},
      jeudi:    {label:"Pecs + Dos B",     base:"Deadlift + angles",     focus:"Deadlift technique, decline, chest dips, rows horizontaux."},
      vendredi: {label:"Ã‰paules + Bras B", base:"Finition/congestion",   focus:"Arnold press, raises, isolation biceps/triceps."},
      samedi:   {label:"Jambes B",         base:"Quads + fessiers",      focus:"Front squat tempo, RDL, bulgarian split squat, ischios, mollets."}
    }
  };

  window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getBlocks = function(day, week){ return strictBlocks(day, week); };
  window.COACH_BERTIN_PROGRAMS.arnold_split_strict.getWodText = function(day, week){
    var b = strictBlocks(day, week).filter(function(x){ return x.kind==="wod"; })[0];
    return b ? b.text : "Aucun WOD â€” bloc hypertrophie.";
  };
})();


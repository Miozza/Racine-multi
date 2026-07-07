// Racine Programme autonome : Arnold Split Strict
// 6 séances nommées par objectif d'entraînement (jamais par jour de semaine).
// Les clés lundi→samedi sont des identifiants internes moteur uniquement ;
// l'affichage passe par dayMeta[day].label.
//
// Charges : chaque exercice porte une charge de BASE numérique (poids de
// travail hypertrophie 8-12 reps pour l'athlète de référence), comme force.js.
// Le moteur scripts/charge/ la met à l'échelle du profil actif (scaleRatios),
// l'arrondit à l'équipement, puis progresse via l'historique (Epley). Aucune
// progression de charge codée en dur ici (pas de table mult[] par semaine).
// Mouvements au poids du corps / bande : libellé texte, pas de charge chiffrée.

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
        ex("Bench Press","4×8-12","205 lb","90-150 sec","Garde les omoplates serrées, barre contrôlée, pas de rebond."),
        ex("Incline DB Press","4×8-12","70 lb","90-150 sec","Inclinaison modérée, descente lente, pousse sans verrouiller brutalement."),
        ex("Pull-Up","4×AMRAP propre","Poids du corps","90-150 sec","Option : Ring Row si les pull-ups ne sont pas propres. Arrête avant de perdre la forme."),
        ex("Barbell Row","4×8-12","165 lb","90-150 sec","Dos gainé, tire les coudes vers les hanches."),
        ex("DB Fly","3×10-15","35 lb","60-90 sec","Grand étirement, aucune douleur d’épaule."),
        ex("Weighted Pull-up","4×10-12","25 lb","60-90 sec","Prise large, cible le dos. Commence au poids du corps si besoin ; ajoute du poids (ceinture/haltère) quand 12 reps propres deviennent faciles.")
      ]},
      {time:"5–8 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Mobilité pecs/lats légère + respiration. Stopper si épaules irritées."}
    ];

    if(day==="mardi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"50–60 min",title:"A. Épaules + Bras A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Seated DB Press","4×8-12","60 lb","90-150 sec","Tronc solide, haltères contrôlés, pas d’élan."),
        ex("Cable Lateral Raise","4×10-15","25 lb","60-90 sec","Monte jusqu’à l’épaule, contrôle la descente."),
        ex("Barbell Curl","4×8-12","75 lb","60-90 sec","Coudes fixes, pas de swing du dos."),
        ex("Dips","4×AMRAP propre","Poids du corps","90-150 sec","Si épaules sensibles, amplitude réduite."),
        ex("Hammer Curls","3×10-12","40 lb","60-90 sec","Prise marteau (neutre), coudes fixes, contrôle la descente."),
        ex("Skull Crusher","3×8-12","70 lb","60-90 sec","Coudes stables, charge modérée.")
      ]},
      {time:"5 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Décompression épaules/coudes. Aucun set forcé."}
    ];

    if(day==="mercredi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"48–58 min",title:"A. Jambes A",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Back Squat","4×8-12","205 lb","90-150 sec","Option : Front Squat si plus naturel. Descente contrôlée, gainage fort, profondeur stable."),
        ex("Lunges","3×10-15/jambe","45 lb","90-150 sec","Pas long, genou stable, contrôle complet."),
        ex("Stiff-Leg Deadlift","4×10-12","165 lb","90-150 sec","Hanches vers l’arrière, dos neutre, étirement ischios."),
        ex("Standing Calf Raise","4×15-20","180 lb","60-90 sec","Pause en haut, descente complète.")
      ]},
      {time:"5–8 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Mobilité hanches/ischios/mollets. Si le bas du dos parle, réduire la prochaine séance."}
    ];

    if(day==="jeudi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"50–62 min",title:"A. Pecs + Dos B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Deadlift","3×6-10","245 lb","90-150 sec","Technique propre seulement. Pas d’échec."),
        ex("Decline Bench Press","4×8-12","195 lb","90-150 sec","Option : DB Press plat si decline non disponible. Contrôle la descente, pousse fort sans rebond."),
        ex("Chest Dips","4×AMRAP propre","Poids du corps","90-150 sec","Penche légèrement le torse."),
        ex("One-Arm DB Row","4×8-12/côté","80 lb","90-150 sec","Tire le coude vers la hanche, pause en haut."),
        ex("Seated Cable Row","4×10-12","150 lb","60-90 sec","Option : Ring Row si cable row non disponible. Dos droit, scapulas serrées."),
        ex("Cable Fly","3×10-15","35 lb","60-90 sec","Option : DB Fly si cable non disponible. Contraction pecs, pas de douleur.")
      ]},
      {time:"5 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Respiration + mobilité lats/pecs. Noter toute fatigue lombaire."}
    ];

    if(day==="vendredi") return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"48–58 min",title:"A. Épaules + Bras B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Arnold Press","4×8-12","50 lb","90-150 sec","Rotation contrôlée, ne force pas l’amplitude si douleur."),
        ex("Front Raise","4×10-12","25 lb","60-90 sec","Pas d’élan, arrêt hauteur épaule."),
        ex("Reverse Curl","4×8-12","55 lb","60-90 sec","Poignets neutres, contrôle complet."),
        ex("Overhead Tricep Extension","4×8-12","70 lb","60-90 sec","Étire les triceps, coudes serrés."),
        ex("Concentration Curl","3×10-12","35 lb","60-90 sec","Strict, contraction forte en haut."),
        ex("Tricep Pushdown","3×10-12","60 lb","60-90 sec","Coudes collés au corps, extension complète.")
      ]},
      {time:"5 min",title:"Sortie",tag:"Mobilité",kind:"mobility",text:"Pompage léger seulement si les coudes sont OK. Sinon mobilité et fin."}
    ];

    return [
      {time:"2 min",title:"Règles du bloc",tag:"Préparation",kind:"warmup",text:globalRules},
      {time:"52–62 min",title:"A. Jambes B",tag:"Hypertrophie",kind:"main",exercises:[
        ex("Front Squat","4×10-15","155 lb","90-150 sec","Option : Goblet Squat avec tempo si front squat non souhaité. Remplace la leg press. Tempo contrôlé, posture droite."),
        ex("Romanian Deadlift","4×8-12","175 lb","90-150 sec","Hanches loin derrière, dos neutre, charge maîtrisée."),
        ex("Bulgarian Split Squat","3×10-12/jambe","50 lb","90-150 sec","Descente stable, pousse par le talon avant."),
        ex("Hamstring Walkout","4×10-12","Poids du corps","60-90 sec","Option : Sliding Leg Curl. Remplace le leg curl machine. Garde les hanches hautes."),
        ex("Standing Calf Raise","4×15-20","180 lb","60-90 sec","Amplitude complète, pause en haut.")
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

  function installArnoldStrictTutorials(){
    var tutorials = {
      "Bench Press": {
        goal: "Pecs, triceps et stabilité scapulaire avec barre.",
        setup: ["Pieds solides au sol.", "Omoplates serrées et abaissées.", "Barre au-dessus du bas des pecs.", "Poignets empilés sous la barre."],
        execution: ["Descends la barre sous contrôle.", "Garde les omoplates serrées.", "Pousse fort sans rebondir.", "Termine bras verrouillés sans perdre les épaules."],
        mistakes: ["Rebondir sur la poitrine.", "Décoller les épaules du banc.", "Laisser les coudes partir trop large.", "Lever les pieds."],
        cue: "Omoplates serrées, barre contrôlée."
      },
      "Incline DB Press": {
        goal: "Haut de pec et deltoïde antérieur avec amplitude contrôlée.",
        setup: ["Banc incliné modéré.", "Haltères aux épaules.", "Pieds stables.", "Omoplates fixées au banc."],
        execution: ["Descends lentement.", "Garde les avant-bras presque verticaux.", "Pousse les haltères vers le haut sans les cogner.", "Garde 1-2 reps en réserve."],
        mistakes: ["Inclinaison trop haute qui transforme en shoulder press.", "Descente trop courte.", "Cogner les haltères.", "Cambrer fort."],
        cue: "Haut de pec, contrôle complet."
      },
      "Pull-Up": {
        goal: "Tirage vertical au poids du corps, dos et biceps.",
        setup: ["Prise solide sur la barre.", "Corps gainé.", "Épaules actives avant de tirer.", "Jambes contrôlées."],
        execution: ["Tire les coudes vers les côtes.", "Monte le menton au-dessus de la barre si possible.", "Descends complet sans tomber.", "Arrête avant de perdre la forme."],
        mistakes: ["Kipper ou balancer.", "Raccourcir l’amplitude.", "Hausser les épaules aux oreilles.", "Tourner le corps."],
        cue: "Coudes vers les côtes, corps solide."
      },
      "Barbell Row": {
        goal: "Épaisseur du dos avec charnière solide.",
        setup: ["Buste penché, dos neutre.", "Barre proche du corps.", "Gainage actif.", "Poids au milieu du pied."],
        execution: ["Tire les coudes vers les hanches.", "Garde le buste stable.", "Pause courte en haut.", "Redescends contrôlé."],
        mistakes: ["Donner de l’élan avec le bas du dos.", "Arrondir la colonne.", "Tirer seulement avec les bras.", "Monter les épaules."],
        cue: "Dos gainé, coudes vers les hanches."
      },
      "DB Fly": {
        goal: "Étirement et contraction des pecs sans charger les épaules.",
        setup: ["Haltères légers à modérés.", "Omoplates posées au banc.", "Coudes légèrement fléchis.", "Poignets neutres."],
        execution: ["Ouvre les bras lentement.", "Arrête avant toute douleur d’épaule.", "Ramène les haltères en serrant les pecs.", "Garde la même flexion de coude."],
        mistakes: ["Descendre trop bas.", "Transformer en press.", "Prendre trop lourd.", "Perdre les omoplates."],
        cue: "Grand étirement, zéro pincement."
      },
      "Weighted Pull-up": {
        goal: "Force et hypertrophie du tirage vertical avec charge additionnelle.",
        setup: ["Charge stable à la ceinture ou entre les pieds.", "Prise ferme.", "Épaules actives.", "Corps gainé."],
        execution: ["Tire en gardant la charge silencieuse.", "Monte proprement sans torsion.", "Descends sous contrôle.", "Coupe la série avant le grind laid."],
        mistakes: ["Ajouter du poids trop tôt.", "Perdre l’amplitude.", "Balancer la charge.", "Hausser les épaules."],
        cue: "Même forme que poids du corps, juste plus lourd."
      },
      "Seated DB Press": {
        goal: "Deltoïdes avec haltères et tronc stabilisé par le banc.",
        setup: ["Assis, dos appuyé si possible.", "Haltères aux épaules.", "Cage basse.", "Poignets empilés."],
        execution: ["Presse verticalement.", "Contrôle la descente aux épaules.", "Garde les épaules loin des oreilles.", "Ne cogne pas les haltères."],
        mistakes: ["Cambrer pour finir les reps.", "Raccourcir la descente.", "Cogner en haut.", "Tourner les poignets."],
        cue: "Presse propre, cage basse."
      },
      "Cable Lateral Raise": {
        goal: "Deltoïde latéral avec tension constante au câble.",
        setup: ["Câble au plus bas.", "Épaule basse.", "Poignet neutre.", "Légère inclinaison possible."],
        execution: ["Monte dans le plan de l’omoplate.", "Arrête autour de la hauteur d’épaule.", "Contrôle la descente.", "Garde la tension en bas."],
        mistakes: ["Hausser le trapèze.", "Balancer le corps.", "Monter trop haut.", "Plier le bras pour tricher."],
        cue: "Côté de l’épaule, pas le cou."
      },
      "Barbell Curl": {
        goal: "Biceps avec barre, charge stable et amplitude complète.",
        setup: ["Debout grand.", "Coudes près du corps.", "Poignets neutres.", "Barre tenue sans casser les poignets."],
        execution: ["Monte la barre sans balancer.", "Serre les biceps en haut.", "Descends contrôlé jusqu’en bas.", "Garde les coudes fixes."],
        mistakes: ["Swing du dos.", "Coudes qui avancent.", "Demi-reps.", "Poignets cassés."],
        cue: "Coudes fixes, pas de swing."
      },
      "Dips": {
        goal: "Pecs, triceps et épaules avec poids du corps.",
        setup: ["Mains solides sur les barres.", "Épaules basses.", "Corps gainé.", "Amplitude adaptée aux épaules."],
        execution: ["Descends sous contrôle.", "Garde les épaules basses.", "Pousse jusqu’à extension solide.", "Arrête avant la douleur."],
        mistakes: ["Descendre trop bas si ça pince.", "Épaules aux oreilles.", "Rebondir en bas.", "Tordre les coudes."],
        cue: "Bas contrôlé, épaules basses."
      },
      "Hammer Curls": {
        goal: "Brachial, brachio-radial et biceps avec prise neutre.",
        setup: ["Haltères de chaque côté.", "Pouces vers le haut.", "Coudes près du corps.", "Tronc stable."],
        execution: ["Monte sans tourner le poignet.", "Garde les coudes fixes.", "Serre en haut.", "Descends lentement."],
        mistakes: ["Balancer le dos.", "Avancer les coudes.", "Tourner en curl classique.", "Couper la descente."],
        cue: "Prise marteau, coude fixe."
      },
      "Skull Crusher": {
        goal: "Triceps, surtout longue portion, avec contrôle des coudes.",
        setup: ["Allongé sur banc.", "Barre ou haltères au-dessus des épaules.", "Coudes pointés vers le plafond.", "Charge modérée."],
        execution: ["Descends vers le front ou derrière la tête.", "Garde les coudes stables.", "Étends sans verrouiller brutalement.", "Contrôle chaque rep."],
        mistakes: ["Écarter les coudes.", "Aller trop lourd.", "Cogner en bas.", "Bouger les épaules à chaque rep."],
        cue: "Coudes stables, triceps travaille."
      },
      "Back Squat": {
        goal: "Jambes complètes et gainage sous barre.",
        setup: ["Barre stable sur le haut du dos.", "Pieds stance squat.", "Respiration et gainage avant descente.", "Regard stable."],
        execution: ["Descends entre les jambes.", "Garde les genoux alignés.", "Maintiens le tronc fort.", "Remonte en poussant le sol."],
        mistakes: ["S’effondrer en bas.", "Genoux qui rentrent.", "Dos qui arrondit.", "Chercher l’échec."],
        cue: "Gainage fort, profondeur propre."
      },
      "Lunges": {
        goal: "Jambes unilatérales, stabilité genou et fessiers.",
        setup: ["Pas assez long pour rester stable.", "Torse haut.", "Pied avant bien ancré.", "Charge contrôlée."],
        execution: ["Descends droit et contrôlé.", "Garde le genou aligné.", "Pousse dans le pied avant.", "Change de jambe sans précipiter."],
        mistakes: ["Pas trop court.", "Genou qui rentre.", "Rebondir au sol.", "Perdre l’équilibre."],
        cue: "Pas stable, genou propre."
      },
      "Stiff-Leg Deadlift": {
        goal: "Ischios et chaîne postérieure avec genoux peu fléchis.",
        setup: ["Pieds sous les hanches.", "Genoux légèrement fléchis.", "Dos neutre.", "Barre proche des jambes."],
        execution: ["Pousse les hanches vers l’arrière.", "Descends jusqu’à l’étirement ischios.", "Garde la barre proche.", "Remonte en serrant fessiers/ischios."],
        mistakes: ["Arrondir le dos.", "Descendre trop bas.", "Plier comme un squat.", "Éloigner la barre."],
        cue: "Hanches arrière, ischios tendus."
      },
      "Deadlift": {
        goal: "Force chaîne postérieure avec technique stricte.",
        setup: ["Barre au-dessus du milieu du pied.", "Dos gainé.", "Lats engagés.", "Hanches placées sans s’asseoir trop bas."],
        execution: ["Pousse le sol.", "Garde la barre proche.", "Monte épaules et hanches ensemble.", "Verrouille debout sans hyperextension."],
        mistakes: ["Arrondir le dos.", "Tirer avec les bras.", "Barre qui s’éloigne.", "Grinder à l’échec."],
        cue: "Pousse le sol, barre collée."
      },
      "Decline Bench Press": {
        goal: "Pecs avec angle décliné, charge contrôlée.",
        setup: ["Banc décliné sécurisé.", "Omoplates serrées.", "Pieds ou jambes verrouillés.", "Barre au-dessus du bas des pecs."],
        execution: ["Descends en contrôle.", "Touche sans rebond.", "Pousse fort en gardant les épaules fixées.", "Garde la trajectoire stable."],
        mistakes: ["Rebondir.", "Perdre les omoplates.", "Descendre trop haut sur la poitrine.", "Surcambrer."],
        cue: "Angle décliné, même contrôle que bench."
      },
      "Chest Dips": {
        goal: "Pecs avec dips inclinés légèrement vers l’avant.",
        setup: ["Mains solides.", "Torse légèrement penché.", "Épaules basses.", "Jambes contrôlées."],
        execution: ["Descends jusqu’à amplitude tolérée.", "Garde le torse orienté pecs.", "Pousse sans rebond.", "Arrête avant pincement."],
        mistakes: ["Descente douloureuse.", "Épaules qui montent.", "Rebondir.", "Transformer en ego AMRAP."],
        cue: "Torse légèrement penché, pecs actifs."
      },
      "One-Arm DB Row": {
        goal: "Dos unilatéral avec coude vers la hanche.",
        setup: ["Main ou genou appuyé si possible.", "Dos neutre.", "Haltère sous l’épaule.", "Épaule basse."],
        execution: ["Tire le coude vers la hanche.", "Pause courte en haut.", "Garde le buste stable.", "Descends jusqu’à étirement contrôlé."],
        mistakes: ["Tourner tout le tronc.", "Hausser l’épaule.", "Tirer avec le biceps seulement.", "Donner de l’élan."],
        cue: "Coude à la hanche, dos stable."
      },
      "Seated Cable Row": {
        goal: "Tirage horizontal contrôlé, milieu du dos.",
        setup: ["Assis grand.", "Pieds calés.", "Poitrine ouverte.", "Épaules basses."],
        execution: ["Tire vers le bas des côtes.", "Serre les omoplates.", "Garde le buste stable.", "Retour lent jusqu’à étirement."],
        mistakes: ["Balancer le tronc.", "Arrondir le dos.", "Hausser les épaules.", "Tirer trop haut."],
        cue: "Dos droit, omoplates serrées."
      },
      "Cable Fly": {
        goal: "Contraction des pecs avec tension continue au câble.",
        setup: ["Câbles réglés selon angle voulu.", "Un pied légèrement devant.", "Coudes souples.", "Épaules basses."],
        execution: ["Ramène les mains devant toi.", "Serre les pecs sans cogner les poignées.", "Retour lent jusqu’à étirement.", "Garde la cage stable."],
        mistakes: ["Prendre trop lourd.", "Transformer en press.", "Épaules qui roulent vers l’avant.", "Perdre la tension."],
        cue: "Pecs serrent, épaules calmes."
      },
      "Arnold Press": {
        goal: "Deltoïdes avec rotation contrôlée des haltères.",
        setup: ["Haltères devant les épaules.", "Cage basse.", "Tronc solide.", "Charge modérée."],
        execution: ["Ouvre progressivement en pressant.", "Termine au-dessus de la tête.", "Redescends en contrôlant la rotation.", "Réduis l’amplitude si ça pince."],
        mistakes: ["Forcer la rotation.", "Cambrer.", "Cogner en haut.", "Aller trop lourd."],
        cue: "Rotation fluide, aucune douleur."
      },
      "Front Raise": {
        goal: "Deltoïde antérieur avec mouvement strict.",
        setup: ["Charge légère à modérée.", "Bras presque longs.", "Cage basse.", "Épaules basses."],
        execution: ["Monte jusqu’à hauteur d’épaule.", "Garde le tronc immobile.", "Pause courte.", "Descends lentement."],
        mistakes: ["Balancer le dos.", "Monter trop haut.", "Hausser les épaules.", "Plier les bras pour tricher."],
        cue: "Hauteur épaule, pas d’élan."
      },
      "Reverse Curl": {
        goal: "Avant-bras, brachio-radial et biceps avec prise pronation.",
        setup: ["Barre tenue paumes vers le bas.", "Coudes près du corps.", "Poignets neutres.", "Charge contrôlée."],
        execution: ["Monte sans casser les poignets.", "Garde les coudes fixes.", "Serre en haut.", "Descends lentement."],
        mistakes: ["Poignets qui plient.", "Swing du dos.", "Coudes qui avancent.", "Charge trop lourde."],
        cue: "Poignets solides, coudes fixes."
      },
      "Overhead Tricep Extension": {
        goal: "Longue portion du triceps avec étirement overhead.",
        setup: ["Charge tenue au-dessus/derrière la tête.", "Coudes serrés.", "Cage basse.", "Tronc gainé."],
        execution: ["Descends derrière la tête.", "Sens l’étirement triceps.", "Étends les coudes sans cambrer.", "Contrôle le retour."],
        mistakes: ["Coudes trop ouverts.", "Cambrer.", "Descendre dans une douleur coude/épaule.", "Aller trop lourd."],
        cue: "Étirement triceps, côtes basses."
      },
      "Concentration Curl": {
        goal: "Biceps strict avec isolement maximal.",
        setup: ["Assis ou penché stable.", "Coude appuyé contre l’intérieur de la cuisse ou fixe.", "Épaule basse.", "Charge modérée."],
        execution: ["Monte sans bouger le bras.", "Serre fort en haut.", "Descends complet et lent.", "Garde le poignet solide."],
        mistakes: ["Balancer l’épaule.", "Demi-amplitude.", "Tourner le tronc.", "Prendre trop lourd."],
        cue: "Strict, contraction en haut."
      },
      "Tricep Pushdown": {
        goal: "Triceps au câble avec coudes fixes.",
        setup: ["Câble haut.", "Coudes collés au corps.", "Poitrine stable.", "Poignets neutres."],
        execution: ["Pousse jusqu’à extension complète.", "Garde les coudes immobiles.", "Contrôle la remontée.", "Ne perds pas la posture."],
        mistakes: ["Avancer les coudes.", "Balancer le torse.", "Couper l’amplitude.", "Casser les poignets."],
        cue: "Coudes collés, extension complète."
      },
      "Romanian Deadlift": {
        goal: "Ischios/fessiers avec charnière de hanche contrôlée.",
        setup: ["Pieds sous les hanches.", "Genoux légèrement fléchis.", "Dos neutre.", "Barre ou haltères proches des jambes."],
        execution: ["Pousse les hanches loin derrière.", "Descends jusqu’à étirement ischios.", "Garde les lats engagés.", "Remonte en serrant les fessiers."],
        mistakes: ["Arrondir le dos.", "Squatter le mouvement.", "Descendre trop bas.", "Éloigner la charge."],
        cue: "Hanches arrière, dos neutre."
      },
      "Hamstring Walkout": {
        goal: "Ischios au poids du corps avec hanches hautes.",
        setup: ["Dos au sol.", "Pont fessier haut.", "Talons au sol.", "Côtes basses."],
        execution: ["Marche les talons lentement vers l’avant.", "Garde les hanches hautes.", "Reviens talon par talon.", "Arrête avant de cambrer."],
        mistakes: ["Laisser tomber les hanches.", "Aller trop vite.", "Cambrer.", "Perdre la tension ischios."],
        cue: "Hanches hautes, talons contrôlés."
      }
    };

    function mergeTutorials(target){
      if(!target) return;
      Object.keys(tutorials).forEach(function(k){ target[k] = tutorials[k]; });
    }

    if(window.COACH_BERTIN_TUTORIALS){
      mergeTutorials(window.COACH_BERTIN_TUTORIALS);
      return;
    }

    var currentDescriptor = Object.getOwnPropertyDescriptor(window, "COACH_BERTIN_TUTORIALS");
    if(currentDescriptor && currentDescriptor.configurable === false) return;

    var storedTutorials;
    Object.defineProperty(window, "COACH_BERTIN_TUTORIALS", {
      configurable: true,
      get: function(){ return storedTutorials; },
      set: function(value){
        storedTutorials = value;
        mergeTutorials(storedTutorials);
      }
    });
  }

  installArnoldStrictTutorials();
})();

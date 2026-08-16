// @ts-check
// scripts/charge/movement_tuning.js
// Racine — table de tuning centralisee par mouvement pour le moteur de charges.
// Regroupe les seuils et motifs de noms de mouvements que suggestion.js et
// historique.js consultaient jusqu'ici via des regex inline dispersees dans
// plusieurs fonctions. Meme principe que MOVEMENT_PROGRESSION_CAPS
// (scripts/charge/mouvements.js), etendu a l'ensemble du moteur.
//
// Regle : tout nouveau seuil ou cas particulier par mouvement va ICI, jamais
// comme un nouveau regex/if inline dans une fonction de decision. Voir
// docs/STRUCTURE_CONTRACT.md — Domaine charge — Regle de tuning par mouvement.
(function(){
  window.COACH_MOVEMENT_TUNING = {
    // isIsolationMovement() — historique.js
    isolationPatterns: [
      /lateral raise/, /rear delt/, /curl/, /rope extension/, /pushdown/,
      /face pull/, /trap 3/, /serratus/, /calf/, /fly/
    ],
    // isTechnicalMovement() — historique.js
    technicalPatterns: [
      /technique/, /leger/, /light/, /warm up/, /warmup/
    ],
    // coachIsMainLoadContext() — suggestion.js (mots-cles de contexte)
    mainLoadKeywordPatterns: [
      /main/, /principal/, /prioritaire/, /force/, /strength/
    ],
    // coachIsMainLoadContext() — suggestion.js (mouvements principaux nommes)
    mainLoadMovementPatterns: [
      /strict press/, /front squat/, /back squat/, /bench press/,
      /barbell row/, /deadlift/, /power clean/, /hip thrust/
    ],
    // coachShouldPreferContextMatch() — historique.js
    contextPreferenceMovementPatterns: [
      /overhead rope extension/, /face pull/, /power clean/
    ],
    // coachLimitedContextFamilyMatches() — historique.js
    limitedContextFamilyPatterns: [
      /power clean/
    ],
    // coachMaxJumpForExercise() — historique.js
    // "default" s'applique si aucun override ne matche ET si le mouvement
    // n'est pas une isolation (auquel cas coachLoadStepForExercise decide).
    maxJumpBase: {
      default: 10,
      overrides: [
        {pattern:/hip thrust/, base:30}
      ]
    },
    // coachRpeProgressionRung() — suggestion.js
    // Reponse graduee au RPE de la derniere serie reussie.
    // Avant V4.5.56 le moteur n'avait qu'un seul palier (RPE <= 7 => un cran) :
    // RPE 5, 6 et 7 donnaient exactement la meme suggestion, et RPE 7.5 n'en
    // donnait aucune. Le RPE portait donc presque aucune information.
    // L'echelle est lue de haut en bas : la premiere ligne dont maxRpe est >=
    // au RPE reel gagne. Au-dela de la derniere ligne, aucune hausse
    // automatique — les freins RPE >= 8.5 et >= 9 restent inchanges et ont
    // toujours le dernier mot (contrat de progression).
    //   steps      = nombre de crans d'equipement proposes
    //   jumpFactor = multiplicateur du saut maximal prudent (maxJumpBase)
    // jumpFactor > 1 n'est PAS un contournement du garde-fou : le saut reste
    // borne, il devient seulement fonction de l'effort reellement ressenti,
    // ce que le contrat demande ("progression limitee par le RPE reel").
    rpeProgression: {
      default: {
        ladder: [
          {maxRpe:6,   steps:3, jumpFactor:1.5},
          {maxRpe:6.5, steps:2, jumpFactor:1.25},
          {maxRpe:7,   steps:1, jumpFactor:1},
          {maxRpe:7.5, steps:1, jumpFactor:1},
          // RPE 8 etait une zone morte : 7,5 progressait, 8,5 freinait, et 8
          // ne faisait rien du tout sans jamais le dire. Barreau a zero cran :
          // meme resultat qu'avant par defaut, mais la tendance peut
          // desormais le promouvoir a un cran quand le meme poids devient
          // regulierement moins cher.
          {maxRpe:8,   steps:0, jumpFactor:1}
        ]
      },
      // Isolation : le cran d'equipement est deja petit et le geste est plus
      // sensible a la fatigue. Progression plus fine, jamais de saut elargi.
      isolation: {
        ladder: [
          {maxRpe:6,   steps:2, jumpFactor:1},
          {maxRpe:7.5, steps:1, jumpFactor:1},
          {maxRpe:8,   steps:0, jumpFactor:1}
        ]
      },
      overrides: [
        // Hip thrust : saut de base deja large (30 lb), inutile de l'elargir.
        {pattern:/hip thrust/, ladder:[
          {maxRpe:6.5, steps:2, jumpFactor:1},
          {maxRpe:7.5, steps:1, jumpFactor:1},
          {maxRpe:8,   steps:0, jumpFactor:1}
        ]}
      ],
      // ─── Reactivite (V4.5.57) ───────────────────────────────────────────
      // Un barreau seul ne lit qu'UNE valeur : le RPE de la derniere seance.
      // Deux athletes a RPE 7 n'ont pourtant pas le meme elan si l'un descend
      // de 8 a 7 pendant que l'autre monte de 6 a 7. Les modificateurs
      // ci-dessous decalent le barreau d'un cran selon ce que raconte
      // l'historique recent — la finesse que l'athlete saisit (7,5 · 7,8 ·
      // 8,5) sert enfin a quelque chose.
      //
      // Limite volontaire : un modificateur ne touche JAMAIS au saut maximal
      // prudent (jumpFactor reste celui du barreau RPE). Il peut rendre le
      // moteur plus prompt a utiliser la marge existante, jamais l'elargir.
      modifiers: {
        // Tendance du RPE a charge egale. Si le meme poids coute de moins en
        // moins cher, l'athlete progresse plus vite que le moteur : on avance
        // d'un barreau. S'il coute de plus en plus cher, on recule — avant
        // d'arriver au frein 8,5, pas apres.
        trend: {
          window: 3,        // seances comparables regardees
          minRows: 3,       // en dessous, aucune tendance n'est affirmee
          delta: 0.5,       // ecart de RPE minimal pour parler de tendance
          shiftEasier: 1,
          shiftHarder: -1
        },
        // Reps depassees sur la derniere serie : 10 reps la ou 8 etaient
        // demandees, au meme RPE, est un signal fort et deja enregistre.
        repsOvershoot: { minExtra: 2, shift: 1 }
      }
    },
    // coachAggressivenessFactor() / coachObservedAggressiveness() — scaling.js
    // La vitesse de progression etait DECLAREE par l'athlete (curseur libre
    // 0,4-1,8) alors que Brain la MESURE deja, mouvement par mouvement :
    // `ambition` monte quand les predictions se revelent trop prudentes,
    // descend quand elles se revelent trop ambitieuses. Deux notions de la
    // meme chose, qui ne se parlaient pas.
    //
    // Desormais : le moteur mesure, le profil incline. Le curseur ne choisit
    // plus la vitesse, il choisit un BIAIS sur la vitesse observee.
    progressionSpeed: {
      // Trois positions declarables. Un profil existant porte un nombre libre
      // dans [0,4 ; 1,8] : il est ramene A LA LECTURE a la position la plus
      // proche — aucune reecriture du stockage, donc aucune migration.
      bias: {
        prudent:   0.75,
        normal:    1.00,
        ambitieux: 1.20
      },
      defaultBias: 'normal',
      // Traduction de l'ambition mesuree par Brain en facteur de saut.
      // center    : valeur neutre d'`ambition` (cf. brain_memory.js)
      // span      : demi-amplitude d'`ambition` autour du centre
      // amplitude : ecart de facteur atteint aux bornes de `span`
      // minObservations : nombre de predictions testees avant de faire
      //   pleinement confiance a la mesure. En dessous, le facteur est tire
      //   vers 1 au prorata — on ne deduit pas une vitesse de deux seances.
      observed: { center: 0.60, span: 0.35, amplitude: 0.30, minObservations: 6 },
      // Bornes finales, inchangees depuis l'origine.
      clamp: { min: 0.4, max: 1.8 }
    },
    // coachDeloadMultiplierForContext() — suggestion.js
    deloadMultiplier: { main: 0.85, other: 0.80 },
    // updateAthleteStateFromResults() — suggestion.js
    // Echec total (charge engagee, 0 rep sortie). Epley n'a aucun signal a
    // 0 rep : epley1RM(load,0) vaut 0. Quand aucune charge recente maitrisee
    // n'existe sous la charge echouee, la capacite retombe a ce pourcentage de
    // la charge tentee. Cale sur le cas voisin deja teste (1 rep sur 8 a RPE 10
    // ramene 135 lb a 110 lb, soit ~0.81).
    failedAttemptMultiplier: 0.80,
    // Bloc "allowLiftFromHistory" de guardedSuggestedLoadDecision() — suggestion.js
    liftFromHistoryThresholds: {
      default: {gap:20, maxRpe:8},
      overrides: [
        {pattern:/barbell row/, gap:15, maxRpe:null}
      ]
    },
    // coachDefaultLoadSeedForMovement() — historique.js
    // Repere de charge par defaut quand aucune donnee officielle
    // (data/charges.js) ni historique n'est disponible. Ordre volontaire :
    // la premiere entree qui matche gagne (ex. "lateral raise.*cable" doit
    // etre testee avant "lateral raise" seul, sinon ce dernier gagnerait
    // toujours en premier).
    defaultLoadSeeds: [
      {pattern:/weighted pull up|weighted pullup|weighted dip|weighted dips/, load:0},
      {pattern:/db shoulder press/, load:35},
      {pattern:/lateral raise.*(cable|poulie)/, load:30},
      {pattern:/lateral raise.*(haltere|dumbbell|db)/, load:20},
      {pattern:/lateral raise/, load:20},
      {pattern:/rear delt fly.*(cable|poulie)/, load:30},
      {pattern:/rear delt fly.*(haltere|dumbbell|db)/, load:20},
      {pattern:/rear delt fly/, load:20},
      {pattern:/wide grip cable upright row|upright row/, load:50},
      {pattern:/overhead rope extension/, load:50},
      {pattern:/face pull/, load:60},
      {pattern:/cable curl/, load:40},
      {pattern:/power clean technique|power clean/, load:115},
      {pattern:/db fly|dumbbell fly/, load:30},
      {pattern:/db pullover|dumbbell pullover/, load:45},
      // V4.5 — reperes ajoutes : mouvements des programmes publics qui
      // n'avaient aucun seed (le moteur restait aveugle sur charge textuelle
      // sans historique).
      {pattern:/single leg hip thrust/, load:95},
      {pattern:/hip thrust/, load:225},
      {pattern:/db rdl|romanian deadlift|stiff leg deadlift/, load:60},
      {pattern:/goblet/, load:70},
      {pattern:/front foot elevated|split squat|bulgarian/, load:40},
      {pattern:/pull through/, load:70},
      {pattern:/hip abduction/, load:25},
      {pattern:/kb swing|kettlebell swing/, load:53},
      {pattern:/step up|box step/, load:35},
      {pattern:/farmer carry|farmer walk/, load:70},
      {pattern:/db snatch/, load:50},
      {pattern:/db thruster/, load:35},
      {pattern:/thruster/, load:95},
      {pattern:/wall ball/, load:20},
      {pattern:/walking lunge|lunge/, load:35},
      {pattern:/landmine/, load:70},
      {pattern:/seated cable row/, load:120},
      {pattern:/one arm db row|db row/, load:65},
      // Mouvements au poids du corps : seed 0 = pas de charge externe.
      {pattern:/dead bug|hollow|plank|bird dog|band |mini band|glute bridge|dead hang/, load:0},
      {pattern:/pull up|pullup|chin up|chest to bar|toes to bar|knee raise|muscle up/, load:0},
      {pattern:/ring dip|dips|dip$|push up|pushup|air squat|sit up|situp|burpee|pistol|double under|handstand|wall walk|rope climb|ring row|scap/, load:0}
    ],
    // coachIsBodyweightExternalLoadMovement() — historique.js
    bodyweightExternalLoadPatterns: [
      /weighted pull up|weighted pullup|weighted dip|weighted dips/
    ]
  };

  window.coachMatchesAnyTuningPattern = function(text, patterns){
    return (patterns||[]).some(function(re){ return re.test(text); });
  };

  window.coachFirstMatchingTuningLoad = function(text, orderedEntries){
    for(var i=0;i<(orderedEntries||[]).length;i++){
      if(orderedEntries[i].pattern.test(text))return orderedEntries[i].load;
    }
    return null;
  };
})();

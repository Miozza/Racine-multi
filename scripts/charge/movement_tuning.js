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
    // coachDeloadMultiplierForContext() — suggestion.js
    deloadMultiplier: { main: 0.85, other: 0.80 },
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

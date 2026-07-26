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
    }
  };

  window.coachMatchesAnyTuningPattern = function(text, patterns){
    return (patterns||[]).some(function(re){ return re.test(text); });
  };
})();

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
      ],
      // Un plafond purement ABSOLU n'a pas de sens aux deux extremites de
      // l'echelle. A 225 lb, +10 lb est prudent ; a 2,5 lb, le meme +10 lb
      // autorise un bond de 400 % — cas reel releve par dev/simulate_multi_users
      // sur un Incline DB Press parti de 2,5 lb. Le saut est donc aussi borne
      // en RELATIF, sans jamais tomber sous un cran d'equipement (ce qui
      // figerait le mouvement, l'erreur symetrique).
      // Le plafond relatif ne mord que sur les charges legeres : au-dessus de
      // ~65 lb, c'est le plafond absolu qui gouverne, comme avant.
      relativeCeiling: 0.15
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
      // sensible a la fatigue. Progression plus fine, jamais de saut elargi
      // (jumpFactor reste a 1 partout ici).
      //
      // V4.6.8 — le rung « 2 crans a RPE <= 6 » etait INATTEIGNABLE : sur une
      // isolation, maxJumpBase vaut un cran nominal et jumpFactor vaut 1, donc
      // le saut maximal prudent le rabotait systematiquement a un seul cran.
      // Mesure : Lateral Raise DB a 20 lb donnait +2,5 lb a RPE 6 comme a
      // RPE 7,5 — le RPE ne portait aucune information, exactement le defaut
      // que ce barreau existe pour corriger. Les crans ANNONCES ici passent
      // desormais toujours (coachRpeMaxAllowedLoad, suggestion.js) ; seuls les
      // crans bonus de `modifiers` restent soumis au saut maximal.
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
        //
        // V4.5.67 — le seuil etait ABSOLU (« au moins 2 reps de plus ») et le
        // credit FORFAITAIRE (un cran). Sur une cible de 2 reps, 4 reps et
        // 8 reps valaient donc exactement la meme chose, alors que le second
        // dit quatre fois plus fort que la charge est sous-estimee. Le ratio
        // reps/cible porte cette information, l'ecart absolu non : sur une
        // cible de 8, +2 reps est un debordement mineur ; sur une cible de 2,
        // +2 reps est un doublement. Les deux lectures sont conservees, et la
        // plus severe des deux gagne (`minExtra` reste un plancher absolu).
        repsOvershoot: {
          minExtra: 2,
          shift: 1,
          // Lu de haut en bas : la premiere ligne dont minRatio est atteint
          // gagne. Le saut maximal prudent rabote ensuite, comme toujours.
          ladder: [
            {minRatio: 2.00, shift: 2},
            {minRatio: 1.50, shift: 2},
            {minRatio: 1.25, shift: 1}
          ]
        }
      }
    },
    // coachRuleRepSurplusLift() — suggestion.js
    // Le surplus de reps comme CAPACITE, pas seulement comme ambition.
    //
    // Le moteur savait deja projeter Epley vers le BAS : « dernier 135 x 2
    // pour 5 reps demandees » declenchait une reduction. La projection vers
    // le HAUT n'existait pas : « dernier 135 x 5 pour 2 reps demandees »
    // n'ecrivait aucune capacite superieure a 135, alors que le meme calcul
    // dit 148 lb. Cette asymetrie est la raison pour laquelle 135x2@7 et
    // 135x5@7 se ressemblaient trop.
    //
    // La projection ne devient JAMAIS la suggestion telle quelle : on en
    // franchit une part par seance (`converge`), et le saut maximal prudent
    // garde le dernier mot. Une seule performance ne fait pas bondir la barre.
    repsSurplus: {
      // Part de l'ecart (charge faite -> capacite projetee) franchie par
      // seance, par intention. Une intention absente de la table n'a pas de
      // projection : la regle ne fait rien.
      // force : la reserve revelee est directement exploitable.
      // hypertrophie : le surplus vient souvent du volume, pas de la force.
      // vitesse : le stimulus prime, la charge suit lentement (bande § speedStimulus).
      byIntent: {
        strength:    {converge: 0.50, maxRpe: 8},
        hypertrophy: {converge: 0.30, maxRpe: 8},
        speed:       {converge: 0.25, maxRpe: 7.5}
      },
      fallback: {converge: 0.40, maxRpe: 8},
      // En dessous de ce ratio reps/cible, aucun surplus n'est affirme.
      minRatio: 1.25,
      // Statuts qui interdisent tout credit de surplus (meme liste que le
      // plancher de validation).
      blockingStatuses: ['recalibrating', 'watch', 'failed', 'major_fail']
    },
    // coachSpeedStimulusBand() / coachExtractMovementIntent() — mouvements.js + suggestion.js
    //
    // Un bloc VITESSE (effort dynamique) n'est pas un drill technique : c'est
    // un stimulus defini par un POURCENTAGE du 1RM, pas par une charge
    // absolue. Une charge absolue figee devient triviale des que l'athlete
    // progresse — cas reel : « Squat vitesse ~60 % » de phase2_fable5, gele a
    // ~130-135 lb pour un Back Squat de ~275 lb, soit 47-49 % au lieu de 60 %.
    //
    // Detection volontairement ETROITE. Le mot « vitesse » traverse tout le
    // catalogue comme simple consigne d'arret (« Stop si la vitesse meurt »,
    // « Vitesse avant ego ») : le lire comme une declaration d'intention
    // changerait le comportement de la moitie des programmes. Un bloc n'est
    // reconnu comme bloc vitesse que s'il declare AUSSI une cible en
    // pourcentage — la seule information qui rend la recalibration possible,
    // et qu'aucune consigne d'avertissement ne porte.
    speedStimulus: {
      keywordPatterns: [
        /vitesse/, /speed/, /explosif/, /explosive/,
        /effort dynamique/, /dynamic effort/, /balistique/
      ],
      // Testes en premier : ici le mot « vitesse » est un critere d'arret.
      cuePatterns: [
        /si la vitesse/, /vitesse (tombe|meurt|chute|ralentit|baisse)/,
        /vitesse de barre comme juge/, /vitesse avant/, /noter charge vitesse/
      ],
      // Cible en % lue dans la charge ou la note, sur le texte BRUT (la
      // normalisation de mouvement retire le signe %). Une seule valeur =>
      // bande centree ; deux valeurs => bande telle quelle.
      pctPattern: /(\d{2})\s*(?:[-–a\u00e0]\s*(\d{2}))?\s*%/,
      // Au-dela, ce n'est plus de la vitesse : c'est du lourd. Un « AMRAP a
      // ~85 % » ne doit jamais entrer ici.
      maxDeclaredPct: 0.80,
      minDeclaredPct: 0.30,
      // Demi-largeur ajoutee autour d'un pourcentage unique (« ~60 % » =>
      // 55-65 %).
      singlePctSpread: 0.05,
      // Part de l'ecart jusqu'a la bande franchie par seance. Le saut maximal
      // prudent rabote ensuite : la derive est lente et repetee, jamais un bond.
      converge: 0.50,
      // Part du saut maximal utilisable selon ce que la derniere serie a
      // montre. Cible juste atteinte = derive minimale ; reps depassees =
      // marge complete. C'est ce qui separe 135x2@7 de 135x5@7 dans un bloc
      // vitesse, ou la bande seule donnerait la meme reponse aux deux.
      drift: {
        base: 0.50,
        surplus: [
          {minRatio: 1.50, factor: 1.00},
          {minRatio: 1.25, factor: 0.75}
        ]
      },
      // Au-dessus de ce RPE la barre n'est plus rapide : le stimulus est deja
      // perdu, on ne monte plus. C'est la protection demandee du bloc vitesse
      // — « barre rapide et propre », pas « monter jusqu'a ce que ca grince ».
      maxRpe: 7.5,
      // Series loggees dans le contexte vitesse exigees avant toute derive
      // vers le haut. Sans historique, la charge du programme fait foi : un
      // programme jamais joue ne change pas de comportement.
      minHistoryRows: 1,
      // Statuts qui coupent la derive haute.
      blockingStatuses: ['recalibrating', 'watch', 'failed', 'major_fail']
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
    // coachFormatSuggestedLoad() — suggestion.js
    // Famille « db » ⇒ charge par main, sauf ces mouvements-là : un seul
    // implement tenu à deux mains. Sans cette liste, un Goblet Squat suggéré
    // à 10 lb s'afficherait « 10 lb / main », soit le double du poids voulu.
    singleImplementPatterns: [
      /goblet/, /db pullover/, /dumbbell pullover/, /db swing/
    ],
    // coachBrainApplyStatsGate() — brain_stats.js
    // Le portail de confiance ANNULAIT la hausse : il ramenait la suggestion a
    // la derniere charge faite, quel que soit l'ecart. Consequence mesuree sur
    // les dix profils simules : les athletes legers ne progressaient jamais.
    // Leur confiance plafonne sous le seuil (61 % contre 65 % requis) parce
    // qu'elle grandit avec le nombre de seances — et une charge gelee ne
    // produit pas les observations qui la feraient monter. Le garde-fou se
    // refermait sur lui-meme.
    //
    // Il AMORTIT desormais au lieu de geler : une hausse non confirmee est
    // reduite, pas annulee, et jamais en dessous d'un cran d'equipement quand
    // le moteur en proposait un. Les freins RPE (>= 8,5 et >= 9) sont en
    // amont et ne sont pas concernes : le portail ne voit que des hausses.
    brainGate: {
      // Lu par coachBrainConfidenceFloor() — scripts/charge/brain_stats.js.
      // UN seuil pour les trois prudences qu'il declenche ensemble : exiger plus
      // de confirmations, afficher « incertain », amortir la hausse. Jusqu'a
      // V4.6.7 cette ligne etait declarative : les trois etaient en dur.
      confidenceFloor: 0.65,
      // Part de la hausse proposee qui survit au portail. 0 = ancien
      // comportement (gel complet), 1 = portail sans effet.
      damping: 0.35,
      // Le plancher d'une hausse meritee n'est PAS defini ici : il vient de
      // coachRpeEarnedLoad(), qui relit l'echelon RPE reel de l'athlete.
    },
    // coachCeilingForMovement() / coachRuleCeilingCap() — scripts/charge/ceiling.js
    //
    // Tous les reglages ci-dessus portent une VITESSE de progression
    // (maxJumpBase, rpeProgression, brainGate.damping, progressionSpeed) ;
    // aucun ne porte d'ASYMPTOTE. Un Lateral Raise a RPE 7 monte donc d'un
    // cran par seance indefiniment, alors qu'il plafonne pour de bon bien
    // avant une barre lourde : la fin de la progression n'est pas la meme
    // chose qu'une progression lente.
    //
    // Le plafond est DEDUIT du comportement, jamais declare en livres : un
    // chiffre ecrit ici serait le plafond du createur, pas celui de
    // l'athlete. Deux signaux doivent tenir ensemble sur la meme fenetre :
    //   1. la pointe ne bouge plus depuis `minStagnant` seances comparables ;
    //   2. elle coute cher — au moins `minHardRows` series au palier a RPE
    //      >= `minRpe`.
    // Une pointe stable SANS effort eleve n'est pas un plafond : c'est un
    // programme qui n'a pas encore demande plus. Un effort eleve SANS
    // stagnation non plus : c'est une seance dure, deja traitee par les
    // freins RPE.
    //
    // Trois familles, trois vitesses de plafonnement. Une isolation se
    // declare plafonnee vite (le cran est petit, la fenetre utile est
    // courte) ; un mouvement principal exige beaucoup plus de preuves —
    // se tromper la couterait des mois de progression. La famille est lue
    // par les detecteurs qui existent deja (isIsolationMovement,
    // coachIsMainLoadContext) : aucune nouvelle regex de nom de mouvement.
    ceiling: {
      enabled: true,
      // Seances comparables regardees. Au-dela, un vieux palier n'a plus
      // valeur de preuve — l'athlete d'il y a six mois n'est pas celui-ci.
      window: 8,
      // Deux charges au meme palier a ce ratio pres. Une plaque de 2,5 lb
      // ajoutee a 200 lb ne relance pas le compteur de stagnation ; +10 lb
      // sur 200 lb, si.
      plateauTolerance: 0.02,
      // Sortie de plafond : si la derniere serie AU PALIER redescend d'au
      // moins ce RPE sous le seuil de la famille, le plafond tombe
      // immediatement. C'est la contrepartie indispensable de la deduction :
      // ce qui se deduit d'un comportement doit se defaire quand le
      // comportement change.
      releaseRpeDrop: 1,
      families: {
        isolation: {minStagnant: 3, minRpe: 8,   minHardRows: 2},
        accessory: {minStagnant: 4, minRpe: 8.5, minHardRows: 2},
        main:      {minStagnant: 6, minRpe: 9,   minHardRows: 2}
      },
      // Plafonds manuels, par nom de mouvement normalise. VIDE en usine et
      // jamais ecrit par le moteur : c'est la surcharge de profil
      // (scripts/charge/tuning_override.js) qui le remplit, sur geste
      // explicite de l'admin. Un plafond manuel s'applique sans historique.
      manual: {}
    },
    // coachRuleAthleteStateCap() — suggestion.js
    //
    // Un cap de surveillance protege un mouvement tant que sa capacite n'est
    // pas confirmee. Il doit pouvoir etre IGNORE quand une seance reelle,
    // PLUS RECENTE et controlee, prouve nettement mieux — sinon une vieille
    // capacite basse gele le mouvement indefiniment.
    //
    // Le seuil de « nettement mieux » etait ABSOLU (+15 lb), en dur dans
    // suggestion.js. Calibre pour une barre, il est inatteignable sur un
    // mouvement dont toute la plage de travail tient dans 20-40 lb — Weighted
    // Pull-up, haltere leger, bande. Cas reel releve par un athlete : 30 lb
    // x 3 @ RPE 8, plus recent et propre, ne pouvait pas depasser un cap a
    // 25 lb, parce qu'il aurait fallu 40 lb (+60 %). La porte de sortie
    // existait, elle etait juste hors d'atteinte.
    //
    // Meme raisonnement que maxJumpBase.relativeCeiling : un seuil purement
    // absolu n'a pas de sens aux deux extremites de l'echelle. Le plus PETIT
    // des deux gagne — l'absolu gouverne les charges lourdes, le relatif les
    // charges legeres — sans jamais tomber sous un cran d'equipement, ce qui
    // rendrait la porte trop facile a franchir.
    athleteStateCap: {
      ignoreLowCap: {absoluteGap: 15, relativeGap: 0.15, maxRpe: 8.5}
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

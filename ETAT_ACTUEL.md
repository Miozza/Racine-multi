# ETAT ACTUEL — V4.6.9

Version actuelle : V4.6.9

## État courant

Racine est un prototype multi-utilisateur local. Cette version réconcilie deux définitions de « principal » qui ne se parlaient pas.

**Le `kind` d'un bloc déclare enfin son intention.** `coachIsMainLoadContext()` matche `/main/` : un bloc `kind:"main"` était donc traité comme principal pour le deload et le plafond. Mais `coachExtractMovementIntent()` ne lisait que des mots — *lourd*, *force*, *principal*, *hypertrophie* — et le même bloc ne déclarait aucune intention, retombant sur le repli générique. Mesure sur le catalogue : **1 643 exercices** de bloc `main` et **1 720** de bloc `hypertrophy` étaient dans ce cas.

L'effet n'est pas symétrique, et c'est le point. Côté force, 0,40 → 0,50 vaut +0,7 à +3,4 lb avant arrondi ; le cran du rack fait 5 lb sur une barre, donc l'écart disparaît presque toujours (1 cas sur 11 mesurés). Cette moitié corrige une incohérence, pas une charge. Côté hypertrophie, 0,40 → 0,30 est un écart qui **survit à l'arrondi** (5 cas sur 11) : le moteur rattrapait plus vite que ce que la programmation demande, alors que sur un bloc d'hypertrophie des répétitions en plus viennent souvent du volume, pas d'une réserve de force.

Un mot explicite l'emporte toujours, dans les deux sens : un bloc `main` qui écrit « hypertrophie » est traité comme tel, un bloc `hypertrophy` qui écrit « force » aussi. Les autres `kind` — `accessory` en tête — ne sont pas devinés : « accessoire » n'est pas synonyme d'hypertrophie, c'est une décision de programmation.

**L'emplacement de la règle n'est pas négociable.** Elle vit dans `coachExtractMovementIntent()` parce que `coachRederiveStoredContext()` relit les lignes déjà loggées avec ce même détecteur : les deux côtés de la comparaison de contexte bougent ensemble. Placée dans le constructeur de contexte, elle changerait la clé du jour sans changer celle des lignes stockées, et les 28 blocs Power Clean principaux du catalogue perdraient tout leur historique — le bug « vitesse » réintroduit. `dev/intent_from_kind_checks.js` en fait son test central.

Golden master inchangé, aucune des 51 courbes de `dev/simulate_multi_users.js` ne bouge : le changement est correct sans être spectaculaire, et c'est ce que la mesure annonçait.

**Le barreau RPE annonçait des crans qu'il ne pouvait pas donner.** Sur un mouvement d'isolation, `maxJumpBase` vaut un cran nominal et `jumpFactor` vaut 1 : le barreau « 2 crans à RPE ≤ 6 » était systématiquement raboté à un seul. Mesure avant correctif, Lateral Raise DB à 20 lb : RPE 6 et RPE 7,5 donnaient tous deux +2,5 lb — et l'explication à l'écran disait pourtant « Hausse de 2 crans vers 22,5 lb ». C'est mot pour mot le défaut déjà corrigé pour les barres — « le RPE portait presque aucune information » — laissé intact sur l'isolation.

**Le rack fait loi.** Un cran d'équipement est la plus petite progression qui existe réellement : un plafond en pourcentage qui l'interdit ne protège pas, il fige. Deux crans d'haltère font toujours plus de 15 % (20 → 25 = +25 %), donc le plafond relatif interdisait ce barreau à *toutes* les charges. Les crans annoncés par le barreau passent désormais toujours. La contrepartie est stricte : les crans **bonus** de la réactivité (tendance, reps dépassées) restent sous le saut maximal prudent — sinon trois signaux positifs se multiplient et 20 lb mène à 40 lb en une séance sur la foi d'un seul RPE 6.

Résultat : isolation à RPE 6 → 25 lb, à RPE 7 → 22,5 lb, à RPE 8 → pas de hausse. Les barres ne bougent pas, le frein n'y mordait déjà pas. Un seul scénario du golden master a changé, et aucune des 51 courbes de `dev/simulate_multi_users.js`.

**Un seul seuil de confiance.** `brainGate.confidenceFloor` était déclaré dans la table et lu par personne : les trois prudences qu'il déclenche ensemble — exiger plus de confirmations, afficher « incertain », amortir la hausse au portail — portaient chacune leur 0,65 en dur. Les quatre valeurs étant identiques, aucun comportement n'était faux ; mais le fichier dont le contrat est « tout seuil vit ici » mentait. Les trois lisent maintenant la table. Zéro changement de comportement aujourd'hui.

Garde-fou : `dev/rpe_ladder_checks.js`, vérifié par mutation dans les deux sens.

**La calibration du moteur ne se règle plus, elle se lit.** Le panneau ⚙ Réglages → Calibration du moteur exposait 23 paramètres scalaires. Trois mentaient : « Confiance minimale du portail » n'était lu par personne (le seuil est en dur dans `brain_stats.js:252`), « Saut maximal de base » ne s'appliquait à aucun mouvement d'isolation (`historique.js:351` reprend le cran d'équipement), « Convergence du surplus (defaut) » ne se déclenchait que si aucune intention ne matchait — presque jamais. Trente-trois autres constantes du moteur n'étaient pas exposées du tout. Le champ affiché n'était pas le champ qui agissait.

Or le moteur **mesure déjà sa propre erreur**, mouvement par mouvement : `brain_memory.js:215-231` compare la charge proposée à celle réellement faite et étiquette tout seul. `precisionRecent` et `precisionTrend()` existaient depuis des mois et n'étaient lus par **aucune vue** — seulement par un script de test. Le panneau montre désormais ça, et n'offre que les deux gestes qu'aucune mesure ne remplace : poser un plafond en livres, donner une charge de départ. Aucun curseur, aucun pourcentage.

Deux règles de lecture, tenues par `dev/calibration_readout_checks.js` : une prédiction testée qui rate ses répétitions est un **apprentissage** et ne signale jamais rien — l'y mettre pousserait à brider le moteur, la boucle auto-bloquante déjà corrigée sur `brainGate` ; et rien ne s'affiche sous les seuils de prudence. Le seul blocage signalé est celui où Brain n'apprend **rien** : la proposition refusée sans jamais être testée (`humanOverrideDown`), qui n'incrémente pas `testedPredictions` et se reproposera indéfiniment.

Le sélecteur de mouvement plein écran du bouton « + Ajouter un mouvement » est devenu un composant (`scripts/ui/movement_picker.js`) : les deux gestes du panneau passent par lui, donc par des noms exacts du catalogue. L'ancien champ texte libre acceptait « lateral raise db » et stockait un plafond qui ne s'appliquait jamais.

Rappel : `scripts/charge/tuning_override.js` **reste** — outil de dev, borné, testé, emporté par l'export. Les calibrations déjà posées continuent de s'appliquer ; elles ne sont simplement plus modifiables depuis un écran.

**Une preuve récente passe devant une vieille capacité sous surveillance.** Le cap d'`athlete_state` gèle un mouvement tant que sa capacité n'est pas confirmée, avec une porte de sortie : une séance plus récente et contrôlée qui prouve nettement mieux. Cette porte exigeait **+15 lb absolus**, seuil calibré pour une barre et inatteignable sur un mouvement dont toute la plage de travail tient dans 20-40 lb. Cas mesuré : Weighted Pull-up, 30 lb × 3 @ RPE 8 le 18 août, plus récent et propre, incapable de dépasser un cap à 25 lb — il aurait fallu 40 lb, soit +60 %. L'écart exigé est désormais **le plus petit de l'absolu et du relatif** (15 % de la capacité), plancher à un cran d'équipement : l'absolu continue de gouverner les barres lourdes, le relatif débloque les charges légères. Un cap **plus récent** que la dernière séance protège toujours — c'est son rôle.

**Une consigne d'arrêt n'est pas une intention de programmation.** Le mot « vitesse » sert partout dans le catalogue à dire quand s'arrêter — « si la vitesse meurt, c'est fini », « vitesse de barre comme juge ». Le détecteur d'intention le lisait comme une déclaration technique. Deux dégâts, dont le second est le vrai : l'auto-progression était coupée sur un mouvement principal, et surtout **tout l'historique des semaines voisines disparaissait**, parce que le filtre de progression ne compare que des contextes de même nature. Cas mesuré : Pause Back Squat en S3 de `phase2_fable5`, deux semaines à 170 lb × 3 @ RPE 7 ne pesant rien, le moteur reproposant indéfiniment la charge écrite dans le programme. Balayage du catalogue complet : 10 378 contextes analysés, **76 libérés** (Bench Press ×30, Power Clean ×30, Strict Press ×11, Close-Grip Bench Press ×3, Pause Back Squat, DB Shoulder Press), **zéro nouvellement limité**. Un vrai bloc vitesse — celui qui déclare un pourcentage cible — reste un contexte à progression limitée.

**Trace du moteur** (⚙ Réglages → Diagnostic charges). Le panneau `(!)` explique la décision ; il ne dit rien de ce qui n'a jamais atteint la décision. La trace répond ligne par ligne : cette séance a-t-elle compté, et sinon **par quel filtre** a-t-elle été écartée — nature de contexte différente, seed manuel, ligne invraisemblable, clé de contexte. Elle reconstitue aussi ce que le moteur aurait proposé avant chaque séance, en rejouant la cascade sur les seules lignes antérieures. Lecture seule, exportable en JSON ou copiable d'un bouton depuis l'iPhone. C'est l'export à envoyer quand une charge proposée ne colle pas à ce qui a été réellement soulevé.

Rappel des livraisons précédentes, toujours d'actualité : le moteur a une **asymptote** — plafond déduit du comportement (pointe stable **et** effort élevé, jamais déclaré en livres), sortie automatique dès qu'une série redevient moins chère, trois familles de vitesse de plafonnement. Les plafonds **manuels** restent posables par profil et sont stockés sous la clé d'état du profil, donc emportés par l'export. Une preuve récente passe devant une vieille capacité sous surveillance (écart exigé = le plus petit de l'absolu et du relatif). Et une consigne d'arrêt (« si la vitesse meurt ») n'est plus lue comme une intention de programmation.

## La Saison — portée active

- `scripts/season/index.js` : journal `state.season.cycles` (programme, dates, semaines, PR) alimenté à l'archivage/remplacement d'un cycle ; vocabulaire d'objectifs `CoachSeasonGoals`.
- `scripts/season/retention.js` : agrégats mensuels par mouvement (`state.longTerm.byMovement`), 36 mois glissants — collecte silencieuse, aucune analyse.
- `scripts/season/suggest.js` : suggestions de prochain cycle — objectif de l'utilisateur dominant, graphe `suggestedNext`, deload inséré si RPE moyen 14 j ≥ 8,5, diversité en simple départage.
- `scripts/season/ui.js` : bandeau fin de cycle, écran bilan + propositions, frise Saison dans l'onglet Cycle.
- Catalogue : `objective`/`frequency`/`suggestedNext` obligatoires sur tout programme public (matrice : `docs/CATALOGUE_MATRICE.md`) ; semaines de transition deload/tests dans `programs/transition_weeks.js`, reprise après pause dans `programs/retour_au_travail.js`.
- Profil : `state.profile.trainingGoal` posé à l'onboarding et éditable dans Réglages.

## Brain — portée active

- Statistiques locales par mouvement + intention.
- Confiance de prédiction.
- Ambition.
- Sensibilité des mouvements, incluant poids de corps et poids de corps lesté.
- RPE interprété par profil utilisateur : chez Bertin, RPE 8 = signal moyen et RPE 9+ = signal fort.
- Validations multiples adaptatives.
- Option ambitieuse dans le diagnostic lorsque Brain hésite.
- Validation/confort : une charge peut être validée sans être maîtrisée si le coût est très élevé.

## Profils de mouvements

- Nouveau module : `scripts/charge/movement_profiles.js`.
- Les profils décrivent la famille, la sensibilité, le style de progression et le vocabulaire Brain Explain.
- Brain Explain doit utiliser ces profils pour éviter les explications génériques.
- `app.js` ne contient aucune logique de profil.

## Données protégées

Ne pas modifier ni écraser :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`
- `data/charges.js`

## Validations à lancer avant livraison

```bash
node dev/multi_profile_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/regression_checks.js --full
node dev/structure_checks.js --full
node dev/program_catalog_checks.js
node dev/season_checks.js
node dev/program_calibration_checks.js
node dev/crossfit_quality_checks.js
node dev/strict_muscle_up_checks.js
```

## Documents de référence

- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_AUDIT.md`
- `docs/STRUCTURE_CONTRACT.md`
- `docs/UI_CONSTRAINTS.md`
- `docs/DATA_FLOW_CONTRACT.md`
- `docs/CHARGE_CONTEXT.md`
- `docs/CHARGE_ENGINE.md`
- `docs/CHARGE_ENGINE_TESTS.md`
- `docs/CHARGE_PROGRESSION_AUDIT.md`
- `docs/CHARGE_PROGRESSION_CONTRACT.md`
- `docs/ERROR_LOGGING.md`
- `docs/PHASE_2_EXTRACTION_REPORT.md`
- `docs/CATALOGUE_MATRICE.md`
- `docs/IDEES_FUTURES.md`
- `docs/PROMPT_REFONTE_SYSTEM.md`
- `docs/superpowers/specs/2026-07-08-la-saison-design.md`
- `docs/superpowers/plans/2026-07-08-la-saison-etapes-1-4.md`


## RPE Profile + Validation Comfort
- Profil RPE personnalisé : RPE 8 = signal moyen, RPE 9+ = signal fort.
- Distinction validation/confort dans Brain Explain.
- Plancher historique traité comme décision Brain quand il agit comme garde-fou.
- Aucune donnée durable modifiée.

- Document officiel : `docs/BRAIN.md`.


## Brain Explain Engine

- `scripts/charge/brain_explain.js` devient la source unique du langage Brain dans le panneau `(!)`.
- Le calcul de charge est gelé; cette passe améliore seulement l’explication.

## Brain Journal

- `scripts/charge/brain_journal.js` est ajouté comme couche consultative.
- Le journal lit la mémoire Brain locale et produit un apprentissage court par mouvement + intention.
- Le panneau `(!)` peut afficher `Journal Brain` lorsque l'information existe.
- Cette version ne modifie pas les charges et ne touche pas aux données durables.



## Avis IA Export

- `scripts/ai/ai_export.js` génère des prompts universels sans API ni abonnement imposé.
- Les exports Avis IA sont consultatifs. Ils ne modifient jamais les charges.
- Le panneau `(!)` peut copier un prompt ciblé sur le mouvement affiché.
- La vue PC peut copier un prompt global pour la séance / cycle sélectionné.


## Avis IA Import

- Import mobile-first dans le panneau `(!)`.
- L’utilisateur colle la réponse IA dans Racine; l’app extrait seulement le bloc structuré avec marqueurs.
- Sauvegarde locale sur l’iPhone via localStorage.
- Avis IA consultatif seulement; Brain garde la décision et aucune charge n’est changée automatiquement.


## Correctif DOM Avis IA

- Le panneau `(!)` regénère maintenant le contenu Avis IA après un import ou un effacement.
- Un avis mouvement et un avis cycle empilés ne peuvent plus laisser un bloc obsolète affiché après effacement.
- Le bouton Fermer dupliqué dans la modale d'import Avis IA a été retiré.
- Aucune donnée durable modifiée.

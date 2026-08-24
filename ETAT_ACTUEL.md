# ETAT ACTUEL — V4.6.5

Version actuelle : V4.6.5

## État courant

Racine est un prototype multi-utilisateur local. Cette version corrige deux défauts signalés sur données réelles et livre l'outil qui permet d'en diagnostiquer d'autres.

**Une preuve récente passe devant une vieille capacité sous surveillance.** Le cap d'`athlete_state` gèle un mouvement tant que sa capacité n'est pas confirmée, avec une porte de sortie : une séance plus récente et contrôlée qui prouve nettement mieux. Cette porte exigeait **+15 lb absolus**, seuil calibré pour une barre et inatteignable sur un mouvement dont toute la plage de travail tient dans 20-40 lb. Cas mesuré : Weighted Pull-up, 30 lb × 3 @ RPE 8 le 18 août, plus récent et propre, incapable de dépasser un cap à 25 lb — il aurait fallu 40 lb, soit +60 %. L'écart exigé est désormais **le plus petit de l'absolu et du relatif** (15 % de la capacité), plancher à un cran d'équipement : l'absolu continue de gouverner les barres lourdes, le relatif débloque les charges légères. Un cap **plus récent** que la dernière séance protège toujours — c'est son rôle.

**Une consigne d'arrêt n'est pas une intention de programmation.** Le mot « vitesse » sert partout dans le catalogue à dire quand s'arrêter — « si la vitesse meurt, c'est fini », « vitesse de barre comme juge ». Le détecteur d'intention le lisait comme une déclaration technique. Deux dégâts, dont le second est le vrai : l'auto-progression était coupée sur un mouvement principal, et surtout **tout l'historique des semaines voisines disparaissait**, parce que le filtre de progression ne compare que des contextes de même nature. Cas mesuré : Pause Back Squat en S3 de `phase2_fable5`, deux semaines à 170 lb × 3 @ RPE 7 ne pesant rien, le moteur reproposant indéfiniment la charge écrite dans le programme. Balayage du catalogue complet : 10 378 contextes analysés, **76 libérés** (Bench Press ×30, Power Clean ×30, Strict Press ×11, Close-Grip Bench Press ×3, Pause Back Squat, DB Shoulder Press), **zéro nouvellement limité**. Un vrai bloc vitesse — celui qui déclare un pourcentage cible — reste un contexte à progression limitée.

**Trace du moteur** (⚙ Réglages → Diagnostic charges). Le panneau `(!)` explique la décision ; il ne dit rien de ce qui n'a jamais atteint la décision. La trace répond ligne par ligne : cette séance a-t-elle compté, et sinon **par quel filtre** a-t-elle été écartée — nature de contexte différente, seed manuel, ligne invraisemblable, clé de contexte. Elle reconstitue aussi ce que le moteur aurait proposé avant chaque séance, en rejouant la cascade sur les seules lignes antérieures. Lecture seule, exportable en JSON ou copiable d'un bouton depuis l'iPhone. C'est l'export à envoyer quand une charge proposée ne colle pas à ce qui a été réellement soulevé.

Rappel de la livraison précédente, toujours d'actualité : le moteur a désormais une **asymptote**. Le plafond de progression est déduit du comportement — pointe stable **et** effort élevé, jamais déclaré en livres — avec sortie automatique dès qu'une série redevient moins chère, et trois familles de vitesse de plafonnement. Et ses 23 paramètres scalaires se règlent **par profil** (⚙ Réglages → Calibration du moteur), stockés sous la clé d'état du profil, donc emportés par l'export.

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

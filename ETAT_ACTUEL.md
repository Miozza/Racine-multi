# ETAT ACTUEL — V4.5.65

Version actuelle : V4.5.65

## État courant

Racine est un prototype multi-utilisateur local. La version courante corrige le **moteur de charges**, sur un défaut signalé dans Phase 2 — Fable 5. **Le bloc « Squat vitesse » était gelé, pas prudent** : sa note dit `~60 %, … intention de vitesse`, et le mot *vitesse* tombait dans la regex `technique` de `coachExtractMovementIntent()`. Le bloc devenait un contexte à progression limitée, toutes les règles d'autorégulation étaient sautées, et la charge proposée valait *toujours* le nombre écrit dans le programme mis à l'échelle du profil — ~130-135 lb pour un Back Squat de ~275 lb, soit **47-49 % au lieu des 60 % annoncés**. `speed` est désormais une intention à part entière : elle **s'ajoute** à `technique` sans la remplacer (le bloc ne remplace toujours jamais une capacité principale dans `athlete_state`), et `coachRuleSpeedStimulusBand()` ramène la charge vers la cible déclarée par paliers — chacun sous le saut maximal prudent, chacun conditionné à un RPE ≤ 7,5 et aux reps sorties. L'ancre est la capacité de force **réelle** du mouvement, jamais l'e1RM du set de vitesse lui-même ; sans ancre fiable, rien ne bouge. La détection exige un pourcentage cible déclaré : sur les 4 137 exercices × semaine × jour du catalogue, **un seul bloc** est reconnu. Second défaut, global celui-là : **les répétitions en plus n'étaient lues qu'à moitié**. Le moteur projetait déjà Epley vers le bas quand les reps manquaient, jamais vers le haut quand elles débordaient, et le crédit de réactivité était forfaitaire — 4 reps pour 2 et 8 reps pour 2 valaient la même chose. `coachRuleRepSurplusLift()` projette désormais vers le haut, en franchissant une part par séance réglée par intention (force 50 %, hypertrophie 30 %, vitesse 25 %), et `easy_success` mémorise la capacité projetée au lieu de la charge portée. Les freins RPE ≥ 8,5 et ≥ 9 restent hors de portée de tout cela. Aucune charge de programme n'a été retouchée. Portée : `scripts/charge/movement_tuning.js`, `scripts/charge/mouvements.js`, `scripts/charge/suggestion.js`. Nouveau garde-fou `dev/phase2_fable5_checks.js`.

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

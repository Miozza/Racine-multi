# ETAT ACTUEL — V4.5.66

Version actuelle : V4.5.66

## État courant

Racine est un prototype multi-utilisateur local. La version courante corrige les cinq risques relevés à la livraison précédente ; deux se sont révélés bien plus larges que leur description. **La semaine 6 n'est pas un deload** : `coachIsDeloadWeekOrContext()` ouvrait sur `if(weekNum===6) return true;`, vestige de l'époque où l'app ne portait qu'un cycle de six semaines. Sur un catalogue de 42 programmes, **14** subissaient un deload fantôme en S6 — dont « S6 Rotation B max » de phase2_fable5, semaine de 3RM, cappée à 175 lb au lieu de 210. Les 19 programmes dont la S6 est un vrai deload le déclarent tous dans leur libellé : le hardcode était redondant. **« 75-82 % » n'est pas 75 lb** : `parseLoad()` attrape le premier nombre d'un texte de charge, et 39 charges du catalogue sont écrites en pourcentage. Un pourcentage est désormais résolu sur la capacité réelle de l'athlète ; sans ancre fiable il ne vaut rien et la charge repart du chemin « non numérique », strictement mieux qu'un nombre inventé. Trois correctifs plus ciblés complètent : le plancher « déjà sorti proprement » ne dépend plus d'une ancre, une charge au-dessus de la bande vitesse mais jamais portée revient dedans immédiatement au lieu de descendre de 10 lb par séance, et une cible peut se poser en clair (`pctOf1RM: 0.60`) au lieu d'être devinée dans une phrase. La détection reste étroite : sans cible déclarée ni pourcentage écrit, aucun bloc vitesse. Portée : `scripts/charge/mouvements.js`, `scripts/charge/suggestion.js`. 14 assertions ajoutées, plus un contrôle d'hygiène qui vérifie qu'aucune des 39 charges en pourcentage du dépôt ne retombe sur `parseLoad()`.

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

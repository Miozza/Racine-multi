# ETAT ACTUEL — V4.5.32

Version actuelle : V4.5.32

## État courant

Racine est un prototype multi-utilisateur local. La version courante corrige la taille du chrono : le bouton d'édition introduit à la version précédente était dessiné en pastille bordée, ce qui ajoutait 13 px à la carte timer — et comme `fitGuidedWodTimer()` calcule la taille des chiffres à partir de la place restante, ils tombaient de 140 px à 129 px sur une carte dense. Le libellé reprend exactement la boîte de l'ancien `<div>` (aucune bordure, aucun padding vertical, aucune hauteur minimale) et la zone tactile est agrandie par un `::after` absolu, qui n'occupe aucune place dans le flux. **La taille des chiffres du chrono prime sur tout élément ajouté à la carte timer** — règle inscrite dans le CSS et dans `docs/UI_CONSTRAINTS.md`. La version précédente rend **le timer du WOD éditable en pleine séance** : le libellé du timer (« AMRAP 12 min ») devient un bouton qui ouvre une modale terrain — durée en ±1 / ±5 min, intervalle des bips (15 s → 5 min, activable sur n'importe quel WOD, pas seulement ceux détectés comme EMOM) et sens décompte/chrono. L'édition vit dans l'objet timer du bloc (`guidedSessionState.blocks[i].timer`) : elle survit à la navigation entre blocs et meurt avec la séance. **Aucun programme n'est réécrit et aucune clé de stockage n'est créée** — le programme reste la référence, récupérable par « Rétablir », et la capture de résultats continue de lire la durée programmée. Deux corrections viennent avec : les bips d'intervalle se calent désormais sur le temps écoulé (en décompte, `remaining % 60` décalait tous les bips quand la durée n'était pas un multiple de l'intervalle) et le dernier bip d'intervalle ne double plus le signal de fin. Le libellé étant devenu cliquable, il fallait aussi le sortir du débordement visuel des chiffres géants (`line-height: 0.82`), qui capturait le tap. La version précédente ajoute le programme public **« Retour au travail »** (`programs/retour_au_travail.js`) : une semaine de transition, quatre séances, pour reprendre après 2 à 4 semaines d'arrêt. Même contrat que les semaines de transition déjà en place (`durationWeeks:1`, `objective:"transition"`), donc il se choisit à la main et ne sort jamais du classement automatique de La Saison ; rien n'est relancé à la fin, la reprise du cycle précédent est une recommandation affichée en fin de séance 4. Les charges valent ≈55 % du 1RM de l'athlète de référence — soit ≈65-70 % d'une charge de travail normale — et deux verrous empêchent toute auto-progression : le libellé de semaine porte « récupération » (contexte deload du moteur) et chaque note d'exercice porte la consigne technique (intention limitante). Un résultat de cette semaine ne remplace donc jamais une capacité principale. La version précédente rend **mesurable le fait que Brain se trompe de moins en moins**. La boucle d'apprentissage existait déjà : `scripts/charge/brain_memory.js` accumule par mouvement et par intention des compteurs à vie (prédictions testées, réussies, trop ambitieuses, trop prudentes, corrections manuelles de l'athlète) qui repartent dans la décision suivante à 30 % de poids. Ce qui manquait, c'était de pouvoir voir la courbe — et un défaut de forme : `precision = réussies / testées` est un ratio **cumulatif**, donc après 200 prédictions dix bonnes séances récentes ne le déplacent presque plus, et le progrès réel se noyait dans le passé de débutant. Deux instruments s'ajoutent : une **précision glissante** sur les 10 dernières prédictions testées (`null` sous 5, pour ne pas afficher un chiffre sur deux points), et une **courbe mensuelle** où chaque point mesure son propre mois sans dilution — `CoachBrainMemory.precisionTrend()` agrège tous les mouvements. Vérifié : dix prédictions ratées puis dix réussies donnent 50 % à vie mais **100 % en fenêtre**, et une courbe 0 % en mars, 100 % en mai. Ces deux mesures sont des **instruments et n'entrent jamais dans le calcul de charge** ; le golden master reste byte-identique. Changement de schéma persistant, donc migration ascendante (`CLAUDE.md §2.1`) : `VERSION` fait partie de la **clé** de stockage et n'a surtout pas bougé — la changer aurait orphelin toute la mémoire accumulée. Le schéma du contenu évolue séparément (`SCHEMA = 2`, `migrateMemory()`), les compteurs, le journal et les champs inconnus sont préservés, et les profils migrés démarrent leur fenêtre **vide** : les issues par prédiction n'étaient pas stockées, seulement leurs totaux, donc la courbe ne peut pas être reconstruite et commence aujourd'hui. Cela donne aussi le vrai critère pour Brain.js, meilleur qu'une date au calendrier : si la courbe plafonne trop haut en erreur, une couche ML a un travail ; si elle continue de descendre, elle n'en a pas. La version précédente fait en sorte qu'**un frein de sécurité survive à la couche Brain**, et corrige le classement d'un échec sans prescription connue. En triant les alertes du simulateur, `guardedSuggestedLoadDecision()` décidait correctement 175 lb après un échec total à 220 lb — mais `coachSafeSuggestedLoad()`, qui applique la couche Brain par-dessus, ressortait 220 lb : exactement la charge qui venait d'échouer. Brain raffine une progression normale ; il ne doit jamais défaire un frein. Quand la pile de règles a posé un avertissement (cap `recalibrating`/`watch`, RPE haut répété, échec), sa décision fait désormais foi. Second correctif : le repli de plage introduit à la version précédente était une constante (8 reps), ce qui classait l'échec d'un Back Squat travaillé en **force** dans la plage **hypertrophie** — le cap atterrissait à côté et la suggestion l'ignorait. Sans prescription connue, l'échec est maintenant classé dans la plage où le mouvement est réellement travaillé, d'après sa fiche la plus récente. Côté outillage, `dev/simulate_multi_users.js` porte maintenant la trace semaine par semaine dans son JSON, son détecteur de tendance ne confond plus une baisse assumée sous RPE élevé avec une baisse suspecte, ni une variation de reps à charge constante avec une baisse, et un profil cohérent produit un échec total délibéré — un test de mutation avait montré que la suite y était aveugle. Verdict : **10 PASS / 0 WARN / 0 FAIL**. La version précédente ferme un angle mort du moteur de charges : **un échec total est désormais mémorisé et freine la suggestion suivante**. Une charge engagée dont aucune répétition ne sort (`reps = 0`) restait classée `logged`, donc ignorée par `updateAthleteStateFromResults()` (`if(!hasValidLoad||!reps)return;`) — le moteur reproposait ensuite la charge exacte qui venait d'échouer. Mesuré : après trois séances propres à 135×8 @RPE 7,5, un 0 rep à 135 lb redonnait 135 lb. Dès 1 rep, en revanche, `major_fail` se déclenchait déjà correctement : la falaise était entre 1 et 0. Trois pièges traités. `classifyPerformance()` classe maintenant en `major_fail` toute charge engagée à 0 rep, **sans dépendre du RPE saisi** — l'athlète qui repose la barre ne pense pas toujours à noter 10. La plage vient des reps **prescrites** : `repRange(0)` renvoyait `strength` et aurait classé un 8-reps raté dans la mauvaise plage. Et la capacité ne vient pas d'Epley, qui n'a aucun signal ici (`epley1RM(load, 0) = 0`, ce qui aurait écrit une capacité de 0 lb) : elle repart de la meilleure charge récente réellement maîtrisée sous la charge échouée (`coachRecentBestControlledLoad()`), avec repli sur `COACH_MOVEMENT_TUNING.failedAttemptMultiplier` (0,80) faute d'historique exploitable. La dernière estimation 1RM n'est jamais écrasée par un zéro. Enfin, `coachRuleAthleteStateCap()` exigeait qu'une référence contrôlée soit « plus récente » que le cap — ce que sa raison affichée affirmait déjà sans que la condition le vérifie : une séance **antérieure** à l'échec neutralisait le cap. La comparaison de dates est maintenant faite, et une séance contrôlée postérieure redonne bien la main à la référence réelle (contre-épreuve couverte). Résultat mesuré : 0 rep → 105 lb au lieu de 135 lb, 1 rep → 110 lb, 8 reps propres → 135 lb inchangé. Couverture ajoutée dans `dev/charge_engine_checks.js` (scénario 14, 9 assertions) ; le golden master reste byte-identique. La version précédente ajoute la note par mouvement dans la séance guidée : une pastille `✎ Notes` dans la ligne du titre du mouvement, à côté du `?` du tuto. Sa hauteur est celle du `?` à chaque palier de densité (24 px, 20 px dans les blocs à 3-4 mouvements) — c'est elle qui fixe la hauteur de la ligne du titre — donc seule la largeur grandit et aucun champ poids/reps/RPE n'est déplacé. Un compteur apparaît dans la pastille dès qu'une note existe, et la pastille se remplit en cyan plein. Elle ouvre une modale plein écran (`.tuto-modal`, la même que le tuto et l'explication de charge) qui porte la liste des observations déjà saisies, un champ court et les actions. « Ajouter » referme complètement la modale ; un ✕ par observation permet d'en effacer une seule, « Tout effacer » vide la note du mouvement après confirmation. **Une note appartient à UNE séance** — un programme, une semaine, un jour : `guidedResultCache` n'est indexé que par nom de mouvement et survit tant que la page est ouverte, donc sans garde-fou une note écrite lundi S1 réapparaissait sous le même mouvement mercredi ou en S2, et restait là après avoir abandonné la séance. Le module compare le contexte de séance à chaque rendu et retire les notes du contexte précédent, et `closeGuidedSession()` (le ✕ d'abandon) les retire aussi ; les poids/reps/RPE gardent leur comportement d'origine, le cache leur survit volontairement. Un retrait écrit une chaîne vide, ignorée par `collectSessionResults()`, donc rien ne part dans la séance sauvegardée. Saisie par le clavier iOS : le champ prend le focus à l'ouverture, et son micro suffit sans qu'aucune permission ne soit demandée par l'app. **Aucune API de reconnaissance vocale n'est utilisée** — dans une PWA standalone iOS, `webkitSpeechRecognition` existe mais reste inerte. Texte uniquement, aucun audio enregistré ni stocké, aucun `MediaRecorder` : le stockage local est la seule source de vérité et des blobs audio satureraient le quota au détriment de l'historique (`CLAUDE.md §2.1`). Deux observations sur le même mouvement s'ajoutent à la suite (séparateur ` · `, le même que le marqueur « PR automatique détecté » avec lequel elles coexistent) au lieu de se remplacer, la note restant UNE SEULE CHAÎNE — le format que `renderHistory()` et l'export attendent déjà. Aucun nouveau chemin de persistance et aucun changement de schéma : l'écriture passe par `setGuidedResult(key,'note',…)`, donc `guidedResultCache` → `collectSessionResults()` → `state.history` fait le reste. Avis IA lit ces notes directement dans `state.history` (`sessionNotesFor()`, section `NOTES DE SÉANCE` du prompt par mouvement, au plus 6 notes appariées via `canonicalMovementLabel`) : ni `athlete_state` ni le moteur de charges ne reçoivent un champ de plus pour un besoin purement consultatif (`CLAUDE.md §3.2`). Toute la logique vit dans `scripts/session/voice_note.js` (`window.CoachVoiceNote`) avec écoute déléguée au `document` ; `scripts/session/view.js` ne porte que deux points d'accroche défensifs. Visible pour tous les profils, clients compris. La version précédente a ajouté la saisie d'un mouvement fait hors programme depuis l'écran Résultats : un bouton `+ Ajouter un mouvement` en fin de liste ouvre un sélecteur plein écran (recherche intégrée, sélection multiple, fermeture par Confirmer ou ✕ seulement) alimenté uniquement par le catalogue fermé `RacineMovementSwaps.movementCatalog(profileId)`. Le mouvement choisi reçoit exactement la carte des mouvements programmés — mêmes contrôles − / valeur / +, même arrondi d'équipement, même suggestion de charge — avec un ✕ pour le retirer avant sauvegarde. Sa clé de résultat est le nom exact du catalogue — comme les blocs `exercises` — donc le journal brut garde la variante choisie et `updateAthleteStateFromResults()`, `movementRefs` et `CoachBrainMemory` s'en nourrissent par le chemin normal, le regroupement par capacité restant fait en aval par le moteur. Un mouvement déjà dans la séance du jour est grisé et non sélectionnable, la ligne nommant le mouvement qui occupe la place quand ce n'est pas le même nom (sa clé écraserait la saisie programmée). Ces séries ne reçoivent aucune cible (`enrichSessionResults()` ne leur attache aucun `planned`, le vecteur `CoachML` n'est pas pollué) et aucun contexte limitant : elles comptent comme de la capacité réelle, avec un marqueur `extra:"1"` dans les résultats. La liste vit le temps de l'écran Résultats et est vidée au retour WOD comme après sauvegarde, `guidedResultCache` purgé avec elle. Toute la logique vit dans un nouveau module `scripts/session/extra_movements.js` (`window.CoachExtraMovements`) ; moteur de charges, Brain, Avis IA et cartes WOD ne sont pas touchés. Une version antérieure corrige un bug de suivi hebdomadaire : `buildWeekTrackingForWeek()` reconstruisait `completedDays` depuis `state.history` en filtrant seulement par numéro de semaine, pas par programme (`cycle`) — contrairement à la boucle `weekTransitions` juste au-dessus, qui filtrait déjà correctement. Résultat : après un changement de programme, les séances loggées sous un ancien programme à la même semaine (typiquement S1) réapparaissaient comme complétées (carreaux verts) dans le nouveau cycle, alors qu’aucun entraînement n’avait été fait. Le filtre `cycle` a été ajouté sur cette boucle, symétrique à l’existant. `dev/regression_checks.js` porte désormais une assertion qui aurait détecté ce trou. Une version antérieure a restructuré en interne le pipeline de suggestion de charges : `guardedSuggestedLoadDecision()` (`scripts/charge/suggestion.js`) est découpé en douze règles nommées et documentées (`coachRuleXxx`), et les seuils/regex de noms de mouvement dispersés dans `suggestion.js`/`historique.js` sont centralisés dans une nouvelle table `scripts/charge/movement_tuning.js` (`window.COACH_MOVEMENT_TUNING`). Refactor pur : comportement du moteur strictement identique, prouvé par un golden master de caractérisation (`dev/charge_suggestion_golden_master.js`, 15 scénarios) qui doit rester byte-identique à chaque évolution future de ce pipeline. Un garde-fou automatisé (`dev/movement_tuning_boundary_checks.js`) bloque désormais toute nouvelle regex de mouvement écrite en dur hors de cette table. Le scroll des popups `(!)` (explication de charge) et `(?)` (tuto mouvement) reste verrouillé : la page derrière est verrouillée tant que le popup est ouvert, donc le geste de scroll agit sur le popup et non plus sur l’interface du fond (fin du « scroll chaining »). Verrou fiable même sur iOS ancien (`lockBodyScrollForModal`), plus `overscroll-behavior: contain` pour les navigateurs récents. La frise Saison (onglet Cycle) offre un bouton ✕ sur chaque cycle terminé du journal : retrait d’un tap avec confirmation, pour effacer un cycle démarré par accident ou un doublon. Le retrait n’affecte que la fiche de saison (`state.season.cycles`) — jamais les séances de l’historique, les charges ni le Brain. Porte manuelle `CoachSeason.removeCycle(state, index)`. Les 32 programmes de base restent accessibles à tous, « Hypertrophie Fessier Femme » est privé et tout futur programme sans `visibility:"public"` est traité comme privé, via une migration idempotente qui préserve les profils utilisant déjà ce cycle. La vue Gear admin ne prétend pas connaître l’état d’un appareil hors ligne : elle sert uniquement à sélectionner un client, chercher un programme spécialisé et copier un lien de prescription permanent. Le moteur de charges (hors ce fix) et le Brain ne sont pas modifiés.

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

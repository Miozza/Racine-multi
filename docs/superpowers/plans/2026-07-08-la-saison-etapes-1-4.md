# La Saison — étapes 1-4 : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations « La Saison » : métadonnées + graphe du catalogue, micro-cycles de transition, journal de saison, rétention long terme, objectif utilisateur, écran fin de cycle avec suggestions.

**Architecture:** Nouveaux modules `scripts/season/{index,retention,suggest,ui}.js` en lecture seule sur moteur/Brain ; métadonnées ajoutées à `programs/index.js` ; deux nouveaux fichiers programmes ; hooks minimaux (1 ligne chacun) dans les flux existants. Validation par `dev/season_checks.js` + extension de `dev/program_catalog_checks.js`.

**Tech Stack:** JavaScript vanilla (ES5, IIFE + globaux `window.Coach*`), zéro build, checks Node (fs + regex + vm), pattern des checks existants.

## Global Constraints (du spec)

- Aucune logique nouvelle dans `app.js` (contrat structure — vérifié par `structure_checks`), seulement des appels de modules.
- `localStorage` uniquement via `CoachState`/modules dédiés ; jamais depuis `app.js`.
- Moteur de charges et Brain : lecture seule.
- Programmes d'entraînement nouveaux : NON publiés sans validation coach — exceptions prévues : semaine deload et semaine de tests.
- Seuil fatigue : RPE moyen 2 dernières semaines ≥ 8,5 (constante nommée `FATIGUE_RPE_THRESHOLD`).
- Rétention : agrégats mensuels par mouvement, plafond 36 mois glissants.
- Version release : V4.4 (APP_VERSION, `?v=4.4` partout, `CACHE_NAME="racine-v4.4"`, CHANGELOG, ETAT_ACTUEL).
- Chaque tâche se termine par : checks concernés verts + commit.

---

### Task 1 — Métadonnées catalogue + matrice de couverture

**Files:**
- Modify: `programs/index.js` (entrées `legacyPrograms` publiques + `clientPrograms` + `specializedPrograms`)
- Modify: `dev/program_catalog_checks.js`
- Create: `docs/CATALOGUE_MATRICE.md`

**Interfaces:**
- Produces: chaque entrée **publique** de `window.COACH_BERTIN_PROGRAM_INDEX` porte `objective` (string), `frequency` (int 2-5), `suggestedNext` (array d'ids). Consommé par Task 6.

- [ ] **Step 1 : Étendre `dev/program_catalog_checks.js`** — nouvelles assertions (pattern `assert(cond,msg)` existant) :

```js
// Métadonnées de suggestion obligatoires sur tout programme public
index.filter(p => (p.visibility||"public")==="public").forEach(p => {
  assert(typeof p.objective==="string" && p.objective.length>0, p.id+" : objective présent.");
  assert(p.frequency>=1 && p.frequency<=6, p.id+" : frequency valide.");
  assert(Array.isArray(p.suggestedNext), p.id+" : suggestedNext présent (peut être vide).");
  (p.suggestedNext||[]).forEach(nid => {
    var target = index.find(t => t.id===nid);
    assert(!!target, p.id+" : suggestedNext '"+nid+"' référence un id existant.");
    assert(target && (target.visibility||"public")==="public", p.id+" : suggestedNext '"+nid+"' est public.");
  });
});
```

- [ ] **Step 2 : lancer le check → il échoue** (les champs manquent sur les legacy publics).
- [ ] **Step 3 : compléter `programs/index.js`** — legacy publics reçoivent `objective`/`frequency`/`suggestedNext` ; client/specialized reçoivent `suggestedNext`. Graphe (successeurs naturels, 1-3 par programme) :
  - `hypertrophy_base(objective:"hypertrophie",freq:4)` → `["force_performance","client_strength_4d"]`
  - `force_performance(objective:"force",freq:4)` → `["competition_peak","client_hybrid_performance_4d"]` (reprend `branchAfter` public)
  - `competition_peak(objective:"performance RX",freq:5)` → `["client_rx_crossfit_5d"]`
  - `hypertrophie_fesse(objective:"hypertrophie",freq:3)` → `["general_hypertrophy_3d","client_hypertrophy_4d"]`
  - `strength(objective:"force",freq:3)` → `["general_strength_3d","client_strength_4d"]`
  - `general_strength_3d(objective:"force",freq:3)` → `["client_strength_4d","client_hybrid_performance_3d"]`
  - `general_hypertrophy_2d(objective:"hypertrophie",freq:2)` → `["client_strength_2d","client_recomposition_2d"]`
  - `general_hypertrophy_3d(objective:"hypertrophie",freq:3)` → `["general_strength_3d","client_hypertrophy_4d"]`
  - `arnold_split_strict(objective:"hypertrophie",freq:4)` → `["client_strength_4d","client_hybrid_performance_4d"]`
  - clients : beginner_2d→[general_hypertrophy_2d,client_strength_2d,client_recomposition_2d] ; beginner_3d→[general_hypertrophy_3d,general_strength_3d,client_recomposition_3d] ; hypertrophy_4d→[client_strength_4d,arnold_split_strict] ; hypertrophy_5d→[client_hybrid_performance_5d] ; strength_2d→[general_hypertrophy_2d,client_recomposition_2d] ; strength_4d→[client_hybrid_performance_4d,client_hypertrophy_4d] ; recomposition_2d→[client_strength_2d,general_hypertrophy_2d] ; recomposition_3d→[general_hypertrophy_3d,client_hybrid_performance_3d] ; recomposition_4d→[client_hypertrophy_4d,client_strength_4d] ; hybrid_3d→[client_haltero_crossfit_3d,client_strength_4d] ; hybrid_4d→[client_haltero_crossfit_4d,client_rx_crossfit_4d] ; hybrid_5d→[client_haltero_crossfit_5d,client_rx_crossfit_5d] ; haltero_3d→[client_rx_crossfit_4d,client_hybrid_performance_4d] ; haltero_4d→[client_rx_crossfit_4d] ; haltero_5d→[client_rx_crossfit_5d,competition_peak] ; rx_4d→[competition_peak,client_rx_crossfit_5d] ; rx_5d→[competition_peak] ; metcon_2d→[client_haltero_crossfit_3d,client_hybrid_performance_3d] ; metcon_3d→[client_haltero_crossfit_3d,client_rx_crossfit_4d] ; metcon_4d→[client_haltero_crossfit_4d,client_rx_crossfit_4d] ; strict_muscle_up_10w→[client_haltero_crossfit_4d,client_hybrid_performance_4d]
- [ ] **Step 4 : `node dev/program_catalog_checks.js` → OK.**
- [ ] **Step 5 : écrire `docs/CATALOGUE_MATRICE.md`** — tableau objectif × fréquence (2-5 j) rempli avec les ids ; cases vides marquées « TROU — programme à créer, validation coach requise ».
- [ ] **Step 6 : commit** `Ajoute les métadonnées de suggestion et le graphe au catalogue`.

### Task 2 — Micro-cycles : semaine deload + semaine de tests

**Files:**
- Create: `programs/transition_weeks.js` (les deux programmes, format identique aux configs de `programs/racine_client_programs.js` — inspecter sa structure exacte avant d'écrire)
- Modify: `programs/index.js` (2 entrées publiques `objective:"transition"`), `index.html` (balise script)

**Interfaces:**
- Produces: ids `transition_deload_3d` (freq 3, durationWeeks 1, `suggestedNext:[]`) et `transition_tests_3d` (freq 3, durationWeeks 1). Consommés par Task 6 (le deload est proposé sur signal de fatigue ; la semaine de tests est proposée en successeur universel optionnel).

- [ ] **Step 1 : lire la structure d'un programme client** (`client_beginner_foundation_3d` dans `programs/racine_client_programs.js`) et reproduire exactement le format (label, weekLabels, weekGoals, days/blocks, entries avec name/format/load/note).
- [ ] **Step 2 : écrire `transition_deload_3d`** — 3 séances full-body légères : squat/hinge/poussée/tirage à ~60 % des charges habituelles (note « −40 % vs cycle précédent »), volume réduit (2×8), mobilité en finisher, RPE cible ≤ 6.
- [ ] **Step 3 : écrire `transition_tests_3d`** — les 5 tests de calibration de l'onboarding répartis sur 3 séances (J1 squat+tirage horizontal, J2 bench+strict press, J3 hinge), échauffement progressif détaillé, note « inscris le résultat, il recalibre tes charges ».
- [ ] **Step 4 : enregistrer dans `programs/index.js` + `index.html`**, `node dev/program_catalog_checks.js && node dev/structure_checks.js --full` → OK.
- [ ] **Step 5 : commit** `Ajoute les semaines de transition deload et tests`.

### Task 3 — Journal de saison (`CoachSeason`)

**Files:**
- Create: `scripts/season/index.js`
- Create: `dev/season_checks.js`
- Modify: `index.html` (script après `scripts/state/index.js`), `app.js` (2 appels d'une ligne)

**Interfaces:**
- Produces (globaux `window.CoachSeason`):
  - `ensure(state)` → initialise `state.season={cycles:[],deloadSuggestedAt:null}` si absent ; reconstruction best-effort depuis `state.weekTransitions` (une entrée par changement de `cycle`).
  - `recordCycleEnd(state, todayIso)` → pousse `{programId, startIso, endIso, weeksDone, prCount}` (programId=`state.cycle.goal`, startIso=`state.activeCycleStartDate||null`, weeksDone=`Number(state.week)||0`, prCount = nb d'entrées d'historique depuis startIso dont un résultat dépasse la référence — réutiliser la comparaison existante si exportée, sinon compter les entrées `history` marquées PR). Idempotent : ne double pas une fin déjà enregistrée (même programId+endIso).
  - `isCycleFinished(state, totalWeeks, programDaysCount)` → `state.week>totalWeeks || (state.week===totalWeeks && (state.completedDays||[]).length>=programDaysCount)`.
- Consumes: `state` global existant.

- [ ] **Step 1 : écrire `dev/season_checks.js`** (pattern vm + stubs comme `charge_engine_checks`) — asserts : ensure crée le journal vide ; reconstruction depuis weekTransitions produit N entrées ; recordCycleEnd ajoute sans réécrire ; double appel = 1 entrée ; isCycleFinished vrai/faux sur cas limites (semaine < total, = total incomplète, = total complète, > total).
- [ ] **Step 2 : le check échoue** (module absent).
- [ ] **Step 3 : implémenter `scripts/season/index.js`**, brancher : `CoachSeason.ensure(state)` dans le boot (à côté des autres ensure existants), `CoachSeason.recordCycleEnd(state, todayIsoDate())` dans le flux d'archivage existant (`archivedCycles`).
- [ ] **Step 4 : `node dev/season_checks.js && node dev/structure_checks.js --full && node dev/regression_checks.js --full` → OK.**
- [ ] **Step 5 : commit** `Ajoute le journal de saison`.

### Task 4 — Rétention long terme (`CoachRetention`)

**Files:**
- Create: `scripts/season/retention.js`
- Modify: `dev/season_checks.js` (section rétention), `index.html`, `scripts/session/save.js` (1 appel) + le flux de sauvegarde legacy d'`app.js` s'il existe encore (`state.history.push` à app.js:1889 → même hook)

**Interfaces:**
- Produces: `window.CoachRetention.recordSession(state, results, dateIso)` — pour chaque `results[k]` avec `load` numérique : `month=dateIso.slice(0,7)` ; upsert dans `state.longTerm.byMovement[k]` l'entrée `{month, bestLoad, bestReps, avgRpe, sessions}` (bestLoad=max, avgRpe incrémental `(avg*n+rpe)/(n+1)`, sessions++) ; tableau trié par mois, plafonné aux 36 dernières entrées (`slice(-36)`).
- Consumes: `results` au format de sauvegarde de séance existant (`{load, reps, rpe, result, note}` par mouvement).

- [ ] **Step 1 : asserts dans `dev/season_checks.js`** — 2 séances même mois fusionnent (sessions=2, bestLoad=max, avgRpe correct à ±0,01) ; mois différents = entrées distinctes ; 40 mois simulés → 36 conservés (les plus récents) ; mouvement sans load ignoré ; state sans `longTerm` initialisé sans erreur.
- [ ] **Step 2 : échec → Step 3 : implémenter + brancher dans `scripts/session/save.js`** juste avant `state.history.push(entry)` : `if(window.CoachRetention)CoachRetention.recordSession(state, entry.results||{}, entry.date);` (même hook dans le flux app.js legacy si distinct).
- [ ] **Step 4 : checks complets → OK. Step 5 : commit** `Ajoute la rétention long terme par mouvement`.

### Task 5 — Objectif utilisateur (`trainingGoal`)

**Files:**
- Modify: `scripts/profiles/onboarding.js` (persistance meta→profil), `scripts/profiles/ui.js` (étape wizard + éditeur dans le panneau profil), `dev/season_checks.js` (section objectif)

**Interfaces:**
- Produces: `profile.trainingGoal` ∈ `["prendre_du_muscle","devenir_plus_fort","perdre_du_poids","skill_gymnastique","competition_crossfit","sante_generale","reprise", null]` + libellés FR `window.CoachSeasonGoals.LABELS`. Consommé par Task 6.
- Décision auto documentée : pas de prompt intrusif à la première ouverture pour les profils existants — l'objectif est éditable dans Réglages→Profil et demandé dans l'écran Fin de cycle s'il est absent (moment naturel).

- [ ] **Step 1 : asserts** — onboarding.js contient `trainingGoal` ; ui.js propose les 7 options ; une valeur hors vocabulaire est normalisée à null.
- [ ] **Step 2 → 3 : implémenter** — constante partagée `GOALS` dans `scripts/season/index.js` (`window.CoachSeasonGoals={KEYS:[...],LABELS:{...}}`) ; nouvelle étape wizard (même pattern que les questions existantes, choix par boutons) ; select dans le panneau profil (Réglages) qui écrit `CoachProfiles.update(id,{trainingGoal:v})`.
- [ ] **Step 4 : checks + `node dev/multi_profile_checks.js` → OK. Step 5 : commit** `Ajoute l'objectif d'entraînement au profil`.

### Task 6 — Moteur de suggestion (`CoachSuggest`)

**Files:**
- Create: `scripts/season/suggest.js`
- Modify: `dev/season_checks.js` (section suggestion), `index.html`

**Interfaces:**
- Produces: `window.CoachSuggest.propositions(input)` avec `input={candidates, endedProgram, trainingGoal, season, recentAvgRpe}` → tableau trié de max 3 `{id, name, reason, score}`.
  - `candidates` : entrées d'index **déjà filtrées par visibilité/permissions par l'appelant** (la logique de visibilité reste dans `programIndexIds()` — pas de duplication).
  - `recentAvgRpe` : moyenne des RPE des séances des 2 dernières semaines (helper `CoachSuggest.recentAvgRpe(state)` fourni, lit `state.history`).
- Règles (score additif, raisons en une phrase) :

```js
var FATIGUE_RPE_THRESHOLD = 8.5;
var GOAL_TO_OBJECTIVES = {
  prendre_du_muscle:   ["hypertrophie","recomposition","débutant"],
  devenir_plus_fort:   ["force","débutant"],
  perdre_du_poids:     ["recomposition","préparation metcon","débutant"],
  skill_gymnastique:   ["strict muscle-up","haltéro crossfit"],
  competition_crossfit:["performance RX","haltéro crossfit","préparation metcon"],
  sante_generale:      ["débutant","recomposition"],
  reprise:             ["débutant","recomposition","transition"]
};
// score = (objectif aligné ? 100 - rang dans la liste : 0)
//       + (id ∈ endedProgram.suggestedNext ? 50 : 0)
//       + (frequency === endedProgram.frequency ? 10 : 0)
//       + (objective !== dernier cycle.objective ? 1 : 0)   // diversité = départage seulement
// fatigue : si recentAvgRpe >= FATIGUE_RPE_THRESHOLD, la semaine deload (objective "transition",
// fréquence la plus proche) est INSÉRÉE en tête avec sa raison, hors classement.
```

- [ ] **Step 1 : asserts** — l'objectif domine le graphe (programme aligné objectif sans lien graphe > programme graphe sans objectif) ; fatigue 8,6 → deload en tête ; fatigue 8,4 → pas de deload forcé ; jamais plus de 3 ; chaque proposition a une `reason` non vide ; un candidat privé passé par erreur est ignoré (`visibility!=="public"` refiltré par sécurité) ; goal null → graphe puis fréquence décident.
- [ ] **Step 2 → 3 : implémenter. Step 4 : checks → OK. Step 5 : commit** `Ajoute le moteur de suggestion de cycle`.

### Task 7 — UI fin de cycle + frise Saison (`CoachSeasonUI`)

**Files:**
- Create: `scripts/season/ui.js`
- Modify: `index.html` (script + conteneurs : `<div id="seasonBanner"></div>` en tête de `#trainingView`, `<div id="seasonTimeline"></div>` dans `#cycleView`), `styles.css` (classes `.season-banner`, `.season-modal`, `.season-timeline`, ton HUD existant), `app.js` (2 appels : `CoachSeasonUI.renderBanner()` dans `render()`, `CoachSeasonUI.renderTimeline()` dans le rendu Cycle)

**Interfaces:**
- Consumes: `CoachSeason.isCycleFinished`, `CoachSuggest.propositions`, `programIndexIds()`/`focusConfigs` globaux, flux d'archivage + démarrage de cycle existants (mêmes fonctions que les boutons `newCycleBtn`/`saveCycleBtn`).
- Produces: bandeau persistant (pas de popup) ; écran fin de cycle (modale plein écran pattern `racineGate`) : bilan (séances, PR via journal, semaines), 2-3 propositions avec raison, bouton par proposition → archive + démarre + date du jour ; lien « choisir manuellement » → onglet Cycle ; si `trainingGoal` absent, la question objectif s'affiche en tête de l'écran (7 boutons, skippable).

- [ ] **Step 1 : asserts (statiques)** — ui.js n'accède pas à `localStorage` ; ne modifie pas `movementRefs` ; bandeau absent du DOM quand cycle non fini (fonction pure `shouldShowBanner(state,totalWeeks,days)` testée en vm).
- [ ] **Step 2 → 3 : implémenter** (échapper toute donnée via `CoachUI.escapeHtml`).
- [ ] **Step 4 : la checklist RELEASE complète** (les 17 commandes de RELEASE_CHECKLIST.md) → tout vert.
- [ ] **Step 5 : commit** `Ajoute l'écran fin de cycle et la frise Saison`.

### Task 8 — Release V4.4

**Files:**
- Modify: `app.js` (APP_VERSION), `index.html` (`?v=4.4` partout + title), `service-worker.js` (CACHE_NAME `racine-v4.4`), `CHANGELOG.md`, `ETAT_ACTUEL.md`, `dev/*` si un check référence la version.

- [ ] **Step 1 : bump partout, grep `v=4.3` → 0 résultat dans index.html.**
- [ ] **Step 2 : checklist RELEASE complète → tout vert.**
- [ ] **Step 3 : smoke navigateur** (scratchpad/smoke.js) : boot, hors ligne, aucune erreur console + parcours : profil test → cycle 1 semaine simulée → bandeau fin de cycle → propositions affichées avec raisons.
- [ ] **Step 4 : commit + push** `Release V4.4 — La Saison, fondations (étapes 1-4)`.

## Self-review du plan

- Couverture spec étapes 1-4 : matrice+métadonnées+graphe (T1), deload/tests (T2), journal (T3), rétention (T4), objectif (T5), suggestions (T6), écran+frise (T7). Récap hebdo/pont coach/streaks : hors périmètre, conformes au spec (étapes 5-7).
- Écart documenté vs spec : pas de prompt « première ouverture » pour l'objectif des profils existants — remplacé par Réglages + question dans l'écran fin de cycle (décision auto, moins intrusive, réversible).
- Types cohérents : `state.season.cycles[]`, `state.longTerm.byMovement`, `profile.trainingGoal`, signatures `CoachSeason/CoachRetention/CoachSuggest/CoachSeasonUI` définies une fois dans leurs tasks.

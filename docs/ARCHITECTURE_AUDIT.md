# ARCHITECTURE — Racine (audit)

> Livrable A de l'audit d'architecture. Généré le **2026-07-23** contre la
> branche `claude/racine-architecture-audit-fx4cr9`.
>
> **Non destructif.** Ce document n'a supprimé ni modifié aucun fichier existant
> du runtime. Il accompagne deux autres livrables :
> `dev/architecture.json` (manifeste machine) et `dev/verify-architecture.js`
> (vérificateur CI).
>
> Ce fichier **ne remplace pas** `docs/ARCHITECTURE.md` (carte curée à la main,
> référencée par `CLAUDE.md`). Il le complète par un inventaire exhaustif fondé
> sur le graphe de chargement réel.

---

## Emplacement des livrables — respect du contrat de structure

Le prompt d'audit proposait des chemins (`ARCHITECTURE.md` + `architecture.json`
à la racine, `tools/verify-architecture.js`) qui **entraient en conflit** avec
`dev/structure_checks.js` : le dossier `tools/` y est explicitement interdit
(`:64`, et `docs/ARCHITECTURE.md:113`) et la racine a une allowlist stricte
(`:48-59`). Pour garder une structure saine, les livrables ont été **placés
dans les dossiers déjà autorisés** plutôt que d'affaiblir les garde-fous :

| Livrable | Emplacement retenu | Intégration contrat |
|---|---|---|
| Carte lisible | `docs/ARCHITECTURE_AUDIT.md` | référencé depuis `ETAT_ACTUEL.md` (exigé par `structure_checks:104-106`) |
| Manifeste machine | `dev/architecture.json` | à côté de son vérificateur |
| Vérificateur | `dev/verify-architecture.js` | cité dans `RELEASE_CHECKLIST.md` (exigé par `structure_checks:97-100`) |

Nom `ARCHITECTURE_AUDIT.md` distinct pour ne pas écraser le `docs/ARCHITECTURE.md`
curé à la main.

> **Reste à traiter (indépendant de cet audit) :**
> `node dev/structure_checks.js` échoue **déjà** avant tout ajout, car
> `PROMPT_REFONTE_SYSTEM.md` est un fichier racine hors `allowedRootFiles`
> (voir § SUSPECT). Ce point est laissé à ta décision.

---

## 1. Mode de chargement

**`script-tags` (variables globales). Aucun module ES.**

Preuves :

- Recherche `^\s*(import|export)\s` sur tout `**/*.js` → **zéro occurrence**.
  Il n'y a ni `import`/`export` statiques, ni `import()` dynamiques dans le code
  runtime.
- `index.html` charge **manuellement** chaque script via `<script src="…?v=4.5.20" defer>`
  (lignes 288-367). L'ordre est figé volontairement (stabilité Safari/iPhone).
- Chaque module s'expose via une **globale `window.*`** (majoritairement
  `window.Coach*` / `window.Racine*`) et consomme ses dépendances en lisant
  ces globales — pas d'injection.
- Les programmes s'enregistrent dans `window.COACH_BERTIN_PROGRAMS[<id>]` puis
  `programs/index.js` construit l'index `window.COACH_BERTIN_PROGRAM_INDEX`
  **sans charger** de script (les `<script>` restent dans `index.html`).
- Les suites `dev/*.js` sont du **Node** (`require` / `module.exports`,
  34 fichiers) exécutées hors navigateur via `RELEASE_CHECKLIST.md`.

**Vecteurs de référence recherchés (Phase 2) et verdict :**

| # | Vecteur | Présent ? | Détail |
|---|---|---|---|
| 1 | `import`/`export` statiques | ❌ | zéro |
| 2 | `import()` dynamiques | ❌ | zéro |
| 3 | `<script src>` HTML | ✅ | `index.html` 288-367 — vecteur principal runtime |
| 4 | **précache service worker** | ❌ **(important)** | `service-worker.js` n'a **aucune liste de précache** : stratégie réseau-d'abord, cache dynamique. Aucun fichier n'est référencé par nom. |
| 5 | `manifest.json` | ✅ | icônes 180/192/512, `start_url ./index.html` |
| 6 | chemins construits | ⚠️ | `programs/index.js` porte des `file:"programs/…"` en **données** (index), pas des chargements. `structure_checks` les valide comme « indexés ». |
| 7 | `fetch()` local | ❌ | Les seuls `fetch('data/*.json')` (`scripts/migrate_bertin.js:129-131`) sont **en commentaire**. Aucune donnée n'est chargée par réseau au runtime. |
| 8 | identifiants globaux | ✅ | vecteur de couplage réel entre modules (voir § modules) |
| 9 | CSS `@font-face`/`url()` | ✅ | `styles.css` → 3 woff2 ; pas de `@import` |
| 10 | GitHub Actions | ✅ | `.github/workflows/deploy-pages.yml` publie le dossier **entier** (`path: '.'`) sur Pages ; **n'exécute aucun** `dev/*.js`. |

Conséquence méthodologique : le service worker n'étant **pas** un vecteur de
référence ici (pas de précache), la preuve d'« inutilité » repose sur
`index.html`, `manifest.json`, `styles.css`, `RELEASE_CHECKLIST.md`, les
fixtures `dev/` et la recherche d'identifiants globaux.

---

## 2. Décompte par catégorie

| Catégorie | Nombre |
|---|---|
| `ACTIF` | 161 |
| `POINT_ENTREE` | 3 |
| `SUSPECT_NON_VERIFIE` | 1 |
| `INUTILISE_PROUVE` | 0 |
| **Total** | **165** (162 fichiers suivis + 3 livrables d'audit) |

`POINT_ENTREE` = `index.html`, `service-worker.js`, `manifest.json`.

---

## 3. Graphe de dépendances (haut niveau)

```mermaid
graph TD
  subgraph Entrees[Points d'entree]
    HTML[index.html]
    SW[service-worker.js]
    MAN[manifest.json]
  end

  HTML -->|link stylesheet| CSS[styles.css]
  CSS -->|@font-face| FONTS[assets/fonts/*.woff2]
  HTML -->|preload/img| SPLASH[assets/splash-racine.webp]
  HTML -->|link icon| ICONS[icon-*.png / apple-touch-*]
  MAN --> ICONS
  HTML -->|script defer x80| APP[app.js orchestrateur]
  APP -->|serviceWorker.register| SW

  subgraph Data[data/ config]
    CHARGES[charges.js DEFAULT_CHARGES]
    EQUIP[equipment.js EQUIPMENT_LOAD_RULES]
    MEDIA[movements_media.js]
    JSON[(athlete_state / cycle_state / resultats .json — squelettes)]
  end

  subgraph Programs[programs/ autonomes]
    PIDX[index.js -> COACH_BERTIN_PROGRAM_INDEX]
    PFILES[28 programmes -> COACH_BERTIN_PROGRAMS]
    CFG[config.js defaultProfile/movements]
    WK[workouts.js buildWorkout helpers]
    TUT[tutorials.js findCoachBertinTutorial]
  end
  PFILES --> PIDX

  subgraph Charge[scripts/charge/ moteur — window.CoachCharge]
    CIDX[index.js porte publique]
    HIS[historique.js Epley]
    RPE[rpe.js]
    MOU[mouvements.js contexte]
    SCA[scaling.js par profil]
    SUG[suggestion.js]
    EQP[equipement.js arrondi]
    ML[ml_refinement.js CoachML]
    BRAIN[brain_*.js + movement_profiles.js]
  end
  EQP --> EQUIP
  SUG --> HIS & RPE & MOU & SCA & BRAIN
  CIDX --> SUG

  subgraph Domaines[Domaines runtime window.Coach*]
    STATE[state/ CoachState]
    PROF[profiles/ CoachProfiles + Racine*]
    SESS[session/ CoachSession]
    HIST[history/ CoachHistory]
    PROG[progression/ CoachProgress]
    SUM[summary/ CoachSummary]
    SEASON[season/ CoachSeason*]
    UI[ui/ CoachUI + ui_modals]
    AI[ai/ RacineAI*]
    LOG[core/logger CoachLog]
    TMS[tms_session.js]
  end

  APP --> STATE & PROF & SESS & HIST & PROG & SUM & SEASON & UI & CIDX
  APP --> PIDX & WK & CFG
  SESS --> SUM & ML
  SUM --> PROG & HIST
  SCA --> PROF
  UI --> TUT
  PROF --> CHARGES & EQUIP

  subgraph Dev[dev/ — Node, hors navigateur]
    CHECKS[34 suites require/assert]
  end
  RC[RELEASE_CHECKLIST.md] --> CHECKS
  CHECKS -.lit/valide.-> APP & Charge & Programs & JSON

  CI[.github/workflows/deploy-pages.yml] -->|upload path=.| HTML
```

> Le graphe est simplifié : le couplage exact fichier→fichier (vecteur + ligne)
> est dans `dev/architecture.json` (`consumedBy` / `consumes`).

---

## 4. Modules par domaine

Format : **rôle** · *expose* · **consommé par** (vecteur) · *consomme*.
Les numéros de ligne complets sont dans `dev/architecture.json`.

### Points d'entrée

- **`index.html`** *(POINT_ENTREE)* — Coquille unique : déclare toutes les vues,
  charge les ~80 scripts en ordre figé (l. 288-367), précharge polices/splash.
  *Consomme* : styles.css, app.js, tous les scripts/programs/data.js.
- **`service-worker.js`** *(POINT_ENTREE)* — Réseau-d'abord, cache dynamique,
  **sans précache**. · *Consommé par* `app.js:2510` (`serviceWorker.register`).
- **`manifest.json`** *(POINT_ENTREE)* — Métadonnées PWA + icônes. · *Consommé
  par* `index.html:7`.

### Noyau

- **`app.js`** — Orchestrateur (~2525 l.). Détient `state`, choisit la vue,
  calcule cycle/semaine/jour, appelle les API `window.Coach*`. **Contient les 3
  fonctions gelées** (§ zones fragiles) et `APP_VERSION`. · *Expose* `APP_VERSION`,
  `state`, `buildWorkout`, les 3 fonctions gelées. · *Consommé par* `index.html:366`.
- **`styles.css`** — Design system dark HUD (Orbitron/Inter, scanlines, couleurs).
  *Consomme* les 3 woff2. · *Consommé par* `index.html:19`.
- **`scripts/app_helpers.js`** — `copy`, `$`, `findFirstStored`, `nowIso`.
- **`scripts/app_navigation.js`** — Navigation vues (alias `phone→pc`).
- **`scripts/core/logger.js`** — `CoachLog` (journal d'erreurs, `docs/ERROR_LOGGING.md`).
- **`scripts/export_file.js`** — Téléchargement fichier navigateur.
- **`scripts/migrate_bertin.js`** — `migrateBertin` (appelé par `profiles/ui.js:189`)
  + `migrateBertinFromFiles` (**outil console manuel — orphelin runtime**, voir § fonctions).

### `data/` (deux natures — voir `docs/DATA_FLOW_CONTRACT.md`)

- **`data/charges.js`** — `DEFAULT_CHARGES` (charges de **départ**, éditable
  humain), `CHARGE_ORDER`. *Config vivante.*
- **`data/equipment.js`** — **Autorité d'arrondi** : `RACINE_EQUIPMENT`,
  `EQUIPMENT_LOAD_RULES`. Consommé par `scripts/charge/equipement.js`.
- **`data/movements_media.js`** — `COACH_BERTIN_MOVEMENT_VIDEOS`.
- **`data/athlete_state.json` · `cycle_state.json` · `resultats.json`** —
  **squelettes vides** (§2.2 CLAUDE.md). Jamais `fetch` au runtime ; **requis
  présents** par `dev/regression_checks.js:76` et `dev/structure_checks.js:78`
  en mode `--full`. Classés `ACTIF` (fixtures de contrat), pas comme data runtime.

### `programs/` (autonomes)

- **`programs/index.js`** — Registre : `COACH_BERTIN_PROGRAM_INDEX`,
  `BERTIN_PRIVATE_PROGRAM_IDS`, `COACH_BERTIN_MACROCYCLE`,
  `BERTIN_MACROCYCLE_OVERRIDE`. Ne charge aucun script.
- **28 fichiers programme** — chacun s'enregistre dans
  `window.COACH_BERTIN_PROGRAMS[<id>]` (`getBlocks`/`getWodText`/`dayMeta`/
  `cycleRules`), chargé par `index.html` **et** indexé par `programs/index.js`.
- **`programs/config.js`** — `defaultProfile` (ancre de calibration), table
  `movements`. Statique, ne patche pas le runtime.
- **`programs/workouts.js`** — Moteur générique de construction (`ex`,
  `resolveDayLabel`).
- **`programs/tutorials.js`** — `COACH_BERTIN_TUTORIALS` +
  `findCoachBertinTutorial` (consommé par `ui_modals.js:38`, `profiles/swaps.js:124`).

### `scripts/charge/` — moteur (porte unique `window.CoachCharge`)

Symbiose en couches (cf. `CLAUDE.md §3.2`). Ordre logique : math (`historique.js`,
Epley) → prudence RPE (`rpe.js`) → contexte/intention (`mouvements.js`) → échelle
profil (`scaling.js`) → apprentissage (`brain_*.js`, `movement_profiles.js`) →
arrondi (`equipement.js` via `data/equipment.js`) → assemblage (`suggestion.js`)
→ porte (`index.js` = `CoachCharge`). `ml_refinement.js` (`CoachML`) collecte
silencieusement (`session/save.js:91`). Voir `dev/architecture.json` pour l'expose
détaillé de chaque fichier.

### Domaines runtime (une porte publique chacun)

| Fichier | Porte | Rôle |
|---|---|---|
| `scripts/state/storage.js` + `index.js` | `CoachState` | lecture/écriture locale state + charges perso |
| `scripts/profiles/storage.js` | `CoachProfiles` | registre multi-profils namespacé |
| `scripts/profiles/reference.js` | `RacineProfileReference` | calibration profil |
| `scripts/profiles/onboarding.js` | `CoachOnboarding` | éval 5 mouvements |
| `scripts/profiles/ui.js` | (UI profil) | consomme `migrateBertin` |
| `scripts/profiles/admin_programs.js` | `RacineAdminPrograms` | permissions programmes |
| `scripts/profiles/swaps.js` | `RacineMovementSwaps` | remplacements coach→client |
| `scripts/profiles/prescription.js` | `RacinePrescription` | prescription par lien `#rx=` |
| `scripts/session/index.js` (+view/timer/results/save) | `CoachSession` | séance terrain |
| `scripts/history/index.js` | `CoachHistory` | signaux historiques |
| `scripts/progression/index.js` | `CoachProgress` | progression/surveillance/blocage |
| `scripts/summary/index.js` | `CoachSummary` | résumé auto de séance |
| `scripts/season/*` | `CoachSeason(UI)`, `CoachRetention`, `CoachSuggest` | « La Saison » |
| `scripts/ui/index.js` (+`ui_modals.js`, `ui/help_guide.js`) | `CoachUI`, `RacineHelp` | helpers UI + modales |
| `scripts/ai/*` | `RacineAIExport/Import/Influence` | Avis IA (consultatif) |
| `scripts/view_pc.js` | `pcRenderProgressInto` | vue PC + montage graphiques |
| `scripts/view_wodplus.js` | (rendu WOD+) | séance active |
| `scripts/charge_diagnostic_ui.js` | (UI admin) | diagnostic charges lecture seule |
| `scripts/tms_session.js` | `openCoachBeurtTmsChoice`, `bindCoachBeurtTmsButtons` | TMS (consommé `app.js:2323`) |

### `dev/` (34 suites Node)

Validation hors navigateur, `require`/`assert`, exécutées via
`RELEASE_CHECKLIST.md`. **Non exécutées par le CI** (le workflow ne fait que
publier). `dev/simulate_multi_users.js` **écrit** `dev/simulation_report.{md,json}`
(artefacts générés, non relus). `dev/structure_checks.js` est cité comme
exception dans sa propre logique (l. 98).

### `docs/` + docs racine

Tous référencés (par `CLAUDE.md`, `README.md`, `ETAT_ACTUEL.md`,
`RELEASE_CHECKLIST.md` ou entre eux) — `dev/structure_checks.js:104-106`
impose cette référence, donc aucun doc n'est orphelin **sauf**
`PROMPT_REFONTE_SYSTEM.md` (§ SUSPECT).

---

## 5. Carte des flux de données — où vit l'état, qui l'écrit, qui le lit

| État | Où il vit | Écrit par | Lu par |
|---|---|---|---|
| **Profils** (registre, profil actif) | `localStorage` (namespacé) | `CoachProfiles` (`profiles/storage.js`) | app.js, tous les domaines |
| **`resultats`** (journal brut) | `localStorage` (par profil) | `session/save.js` via `CoachState` | `CoachHistory`, reconstruction `athlete_state` |
| **`athlete_state`** (état dérivé) | mémoire + `localStorage` | dérivé de `resultats` | moteur `CoachCharge` (source primaire) |
| **`cycle_state`** (cycle actif) | `localStorage` | app.js / cycle | app.js, PC, saison |
| **Charges perso forcées** | `localStorage` (`customCharges`) | `CoachState.writeCustomCharges` | moteur charges |
| **Charges de départ** | `data/charges.js` (`DEFAULT_CHARGES`) | **humain uniquement** | fallback moteur |
| **Règles d'arrondi** | `data/equipment.js` | humain | `charge/equipement.js` |
| **Avis IA importé** | `localStorage` | `RacineAIImport` | affichage `(!)` — **n'applique aucune charge** |
| **Brain (mémoire/journal)** | `localStorage` (par profil) | `brain_memory.js`, `brain_journal.js` | `brain_explain.js`, moteur |

**Invariants** (cf. `CLAUDE.md §2`, `docs/DATA_FLOW_CONTRACT.md`) :

- Source de vérité = **stockage local**, aucune copie serveur, aucune sync
  distante (le flux GitHub a été retiré).
- Le journal brut `resultats` **prime** ; `athlete_state` est reconstructible.
- L'app ne réécrit **jamais** `data/charges.js` lors d'une sauvegarde.
- L'Avis IA et le bouton `(!)` sont **strictement consultatifs**.

---

## 6. Zones fragiles

| Zone | Fichier(s) | Pourquoi fragile | Garde-fou |
|---|---|---|---|
| **Fonctions gelées de scoping semaine** | `app.js` : `setActiveWeek()`, `applyWeekTrackingForWeek()`, `buildWeekTrackingForWeek()` | Un bug de `completedDays` inter-semaines déjà corrigé par cette centralisation ; toute retouche non concertée le réintroduit. **Ne pas modifier sans accord écrit** (`CLAUDE.md §2.3`). | relecture humaine obligatoire |
| **Persistance stockage local** | `scripts/state/storage.js`, `scripts/profiles/storage.js` | Aucune copie serveur → toute perte est définitive. Interdits : `localStorage.clear()`, renommage de clés sans migration versionnée, seed par-dessus l'existant. Export/import JSON = seul backup, compat ascendante à préserver. | `dev/multi_profile_checks.js`, `dev/json_export_ios_checks.js`, `dev/profile_backup_ui_checks.js` |
| **Moteur de charges (symbiose)** | `scripts/charge/*`, `data/equipment.js` | 5 couches devant rester cohérentes ; arrondi = `equipment.js` (pas `charges.js`) ; haltères = échelle proportionnelle (pas Epley direct) ; WOD/technique ne remplace jamais une capacité principale. | `dev/charge_engine_checks.js`, `dev/client_charge_safety_checks.js`, `dev/progression_contract_checks.js`, `dev/deload_guard_checks.js`, `dev/suggest_helper_checks.js` |
| **Ordre de chargement `index.html`** | `index.html` 288-367 | Ordre manuel figé (Safari/iPhone) ; un domaine chargé trop tôt casse une dépendance globale. | `dev/structure_checks.js:169-180` (assertions d'ordre) |
| **Frontières de fichiers / version** | racine, `programs/index.js` | Allowlist racine stricte, `tools/` interdit, contrat de version multi-fichiers. | `dev/structure_checks.js`, `dev/regression_checks.js` |

---

## 7. `SUSPECT_NON_VERIFIE` (1)

### `PROMPT_REFONTE_SYSTEM.md`

- **Constat :** aucune référence entrante trouvée dans le code, les docs, les
  suites `dev/`, `RELEASE_CHECKLIST.md` ni le workflow CI
  (`grep -rl "PROMPT_REFONTE"` → seulement le fichier lui-même). De plus il est
  **absent de `allowedRootFiles`** dans `dev/structure_checks.js`, qui le
  signale déjà en échec (`Fichier racine autorisé : PROMPT_REFONTE_SYSTEM.md`).
- **Pourquoi pas `INUTILISE_PROUVE` :** c'est un document **destiné à un lecteur
  humain** (prompt de refonte système). L'absence de référence machine ne prouve
  pas qu'il est inutile — un humain peut l'ouvrir délibérément. La norme de
  preuve d'inutilité ne s'applique pas proprement à de la documentation.
- **Vérification manuelle requise pour trancher :** demander au mainteneur si ce
  document est encore une référence de travail. Si **oui** → l'ajouter à
  `allowedRootFiles` (sinon `structure_checks` reste rouge) ou le déplacer sous
  `docs/` + le référencer depuis `ETAT_ACTUEL.md`. Si **non** → candidat à
  archivage (hors périmètre de cet audit : rien n'est supprimé).

Aucun autre fichier n'est `SUSPECT` : le contrat `dev/structure_checks.js`
impose déjà que chaque `scripts/`, `programs/`, `dev/`, `docs/` et asset PWA
soit référencé, ce que l'audit a re-vérifié indépendamment (index.html,
RELEASE_CHECKLIST, manifest, styles.css, fixtures dev).

---

## 8. `INUTILISE_PROUVE` (0)

**Aucun fichier** ne satisfait la norme de preuve complète (recherche nom de
fichier = 0, recherche de chaque identifiant exposé = 0, absence de tous les
points d'entrée, aucun chemin dynamique résoluble). Conforme à l'avertissement
du prompt : sur un projet JS vanilla à balises `<script>` + globales, les angles
morts de l'analyse statique interdisent une conclusion d'inutilité ferme.

---

## 9. Fonctions orphelines (analyse intra-fichier — partielle)

Norme identique appliquée aux identifiants exposés. Résultat vérifié :

| Symbole | Fichier | Statut | Détail |
|---|---|---|---|
| `migrateBertinFromFiles` | `scripts/migrate_bertin.js:135` | **SUSPECT (outil manuel)** | Exposé sur `window`, appelé **nulle part** dans le code (seules occurrences : sa définition + `CHANGELOG.md`). Conçu comme utilitaire console de migration depuis fichiers JSON. À conserver : suppression = perte d'un outil de récupération. |
| `bindCoachBeurtTmsButtons` | `scripts/tms_session.js:335` | **ACTIF** | Alias global de `bindTmsButtons`, elle-même appelée en interne (`DOMContentLoaded`/immédiat, l. 338-340). L'alias global est un point d'extension, pas un orphelin dur. |

> **Limite déclarée (angle mort assumé) :** une analyse orpheline **exhaustive**
> des fonctions **internes** de `app.js` (~2525 l.), `scripts/view_pc.js`
> (~1300 l.) et `styles.css` (classes CSS non utilisées) **n'a pas été menée à
> la norme de preuve `INUTILISE`**. Beaucoup de fonctions sont locales (non
> exposées) et appelées par référence directe ; les prouver orphelines
> demanderait un parseur AST par fichier. À traiter comme travail de suivi,
> jamais comme un verdict de suppression.

---

## 10. Reproduire l'audit

```bash
node dev/verify-architecture.js            # cohérence manifeste ↔ dépôt
node dev/verify-architecture.js --json     # sortie machine
node dev/verify-architecture.js --drift 0.30
```

`dev/architecture.json` est à **régénérer à chaque version majeure** (pas aux
incréments `.x`), puis à revérifier. `INUTILISE_PROUVE` reste une **hypothèse à
vérifier**, jamais un ordre de suppression.

# Accès aux programmes Gear Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les nouveaux programmes privés par défaut, protéger les cycles Stéphanie existants et transformer Gear en outil de prescription par lien sans faux état distant.

**Architecture:** Le champ existant `visibility` reste l’unique source de vérité : seule la valeur explicite `"public"` ouvre un programme à tous. `CoachProfiles` effectue une migration locale idempotente des cycles actifs devenus privés avant que `app.js` reconstruise le catalogue visible. Le panneau `RacineAdminPrograms` ne modifie plus les permissions ni les cycles; il filtre les programmes non publics et produit seulement des liens via `RacinePrescription`.

**Tech Stack:** JavaScript global vanilla (sans modules), DOM HTML/CSS, localStorage multi-profils, scripts Node `dev/*.js`, Playwright/Chromium pour le contrôle mobile.

## Global Constraints

- Aucun ES module; conserver l’ordre global des scripts dans `index.html`.
- Version cible : V4.5.18 dans tous les fichiers imposés par `dev/regression_checks.js`; `service-worker.js` reste déversionné et `CACHE_NAME` reste `"racine-v4.5"`.
- Tout nouveau script `dev/*.js` doit apparaître sous la forme `node dev/xxx.js` dans `RELEASE_CHECKLIST.md`.
- Ne jamais supprimer une permission existante, ni réinitialiser cycle, semaine, jour, historique, résultats ou charges.
- Un programme reçu par prescription reste accessible définitivement sur l’appareil.
- Gear ne doit afficher aucun état distant « Actif », « Accordé » ou « Retiré ».
- Vérifier les largeurs 393 × 852 DPR 3 et 375 px sans débordement horizontal.
- Partir de `origin/main` sur une nouvelle branche `codex/gear-program-access`; ne pas poursuivre sur la branche de PR #3 déjà fusionnée.

---

### Task 1: Contrat d’accès privé par défaut et migration des cycles actifs

**Files:**
- Modify: `programs/index.js`
- Modify: `app.js`
- Modify: `scripts/profiles/storage.js`
- Modify: `dev/multi_profile_checks.js`
- Modify: `dev/program_catalog_checks.js`

**Interfaces:**
- Consumes: `CoachProfiles.list()`, `CoachProfiles.storageKeysFor(id)`, registre `COACH_BERTIN_PROGRAM_INDEX`.
- Produces: `CoachProfiles.reconcileActivePrivateProgramPermissions(): boolean`; règle `visibility === "public"` pour l’accès universel.

- [ ] **Step 1: Écrire les tests en échec pour le défaut privé et la migration**

Dans `dev/program_catalog_checks.js`, ajouter un catalogue synthétique contenant une entrée sans `visibility` et vérifier qu’elle n’appartient pas aux entrées publiques. Ajouter aussi les assertions réelles :

```js
const source = read('app.js');
const stephanie = index.find(p => p.id === 'hypertrophie_fesse_stephanie');
assert(stephanie && stephanie.visibility === 'private', 'Hypertrophie Fessier Femme doit être privé.');
assert(index.filter(p => p.id !== 'hypertrophie_fesse_stephanie' && p.visibility === 'public').length === 32,
  'Les 32 programmes actuellement publics doivent rester publics.');
assert(!source.includes("item.visibility || \"public\""), 'Une visibilité absente ne doit plus devenir publique.');
```

Dans `dev/multi_profile_checks.js`, charger `storage.js` dans le contexte VM existant, créer un profil dont `state.cycle.goal` vaut `hypertrophie_fesse_stephanie`, appeler le nouveau helper, puis vérifier :

```js
assert(CoachProfiles.reconcileActivePrivateProgramPermissions() === true,
  'La migration doit ajouter la permission du cycle actif devenu privé.');
assert(CoachProfiles.hasProgramPermission(profileId, 'hypertrophie_fesse_stephanie'),
  'Le profil conserve son programme Stéphanie actif.');
assert(CoachProfiles.reconcileActivePrivateProgramPermissions() === false,
  'La migration doit être idempotente.');
assert(savedState.cycle.goal === 'hypertrophie_fesse_stephanie' && savedState.week === 4,
  'La migration ne modifie pas le cycle ni la semaine.');
```

- [ ] **Step 2: Exécuter les tests ciblés et constater l’échec**

Run:

```powershell
node dev/program_catalog_checks.js
node dev/multi_profile_checks.js
```

Expected: FAIL sur la visibilité Stéphanie, le fallback public et l’absence de `reconcileActivePrivateProgramPermissions`.

- [ ] **Step 3: Implémenter la règle et la migration minimale**

Dans `programs/index.js`, passer uniquement `hypertrophie_fesse_stephanie` à `visibility: "private"` et documenter qu’une visibilité absente est privée.

Dans `app.js`, remplacer le fallback public du catalogue par :

```js
var isPublic = item.visibility === "public";
if(isPublic || activePerms.indexOf(item.id) !== -1 || isAdmin){
  ids.push(item.id);
}
```

Dans `scripts/profiles/storage.js`, ajouter :

```js
api.reconcileActivePrivateProgramPermissions = function(){
  var reg = readRegistry();
  var catalog = window.COACH_BERTIN_PROGRAM_INDEX || [];
  var visibilityById = {};
  catalog.forEach(function(item){ if(item && item.id) visibilityById[item.id] = item.visibility; });
  var changed = false;
  reg.profiles.forEach(function(profile){
    var keys = api.storageKeysFor(profile.id);
    var st = {};
    try{ st = JSON.parse(localStorage.getItem(keys.state) || "{}") || {}; }catch(e){ st = {}; }
    var goal = st.cycle && st.cycle.goal;
    if(!goal || !Object.prototype.hasOwnProperty.call(visibilityById, goal) || visibilityById[goal] === "public") return;
    var perms = Array.isArray(profile.programPermissions) ? profile.programPermissions.slice() : [];
    if(perms.indexOf(goal) === -1){ perms.push(goal); profile.programPermissions = perms; changed = true; }
  });
  if(changed) writeRegistry(reg);
  return changed;
};
```

Appeler ce helper dans `coachFullBoot()` avant `rebuildFocusConfigs()`.

- [ ] **Step 4: Rendre les autres consommateurs stricts sur `public`**

Dans `scripts/season/suggest.js` et les contrôles de catalogue, remplacer les expressions `(p.visibility || "public") === "public"` par `p.visibility === "public"`. Vérifier avec `rg` qu’aucun chemin de visibilité ne traite encore une valeur absente comme publique.

- [ ] **Step 5: Exécuter les tests ciblés**

Run:

```powershell
node dev/program_catalog_checks.js
node dev/multi_profile_checks.js
node dev/season_checks.js
node dev/prescription_checks.js
```

Expected: quatre scripts avec sortie `OK` et code 0.

- [ ] **Step 6: Commit fonctionnel isolé**

```powershell
git add programs/index.js app.js scripts/profiles/storage.js scripts/season/suggest.js dev/program_catalog_checks.js dev/multi_profile_checks.js
git commit -m "Rendre les nouveaux programmes privés par défaut"
```

---

### Task 2: Simplifier Gear en panneau de prescription uniquement

**Files:**
- Modify: `index.html`
- Modify: `scripts/profiles/admin_programs.js`
- Modify: `styles.css`
- Modify: `dev/prescription_checks.js`
- Modify: `dev/client_view_checks.js`

**Interfaces:**
- Consumes: `RacinePrescription.buildPatch(opts)`, `RacinePrescription.buildLink(patch)`, `RacineMovementSwaps.listFor(profileId)`.
- Produces: cartes privées avec attribut `data-share-program`; aucun appel Gear à `grantProgramPermission`, `revokeProgramPermission` ou `setProfileActiveProgram`.

- [ ] **Step 1: Écrire les assertions UI en échec**

Dans `dev/prescription_checks.js`, lire `scripts/profiles/admin_programs.js` et ajouter :

```js
assert(adminPrograms.includes('data-share-program'), 'Gear doit exposer une action de copie par programme privé.');
assert(!adminPrograms.includes('data-grant='), 'Gear ne doit plus accorder localement une permission distante.');
assert(!adminPrograms.includes('data-revoke='), 'Gear ne doit plus prétendre retirer un accès distant.');
assert(!adminPrograms.includes('data-activate='), 'Gear ne doit plus activer le cycle distant.');
assert(!adminPrograms.includes('setProfileActiveProgram'), 'Gear ne doit plus changer le cycle actif.');
```

Dans `dev/client_view_checks.js`, vérifier les textes du panneau :

```js
assert(indexHtml.includes('Envoyer un programme spécialisé'), 'Gear doit nommer clairement le flux de prescription.');
assert(indexHtml.includes('programmes de base'), 'Gear doit rappeler que la base est déjà disponible.');
```

- [ ] **Step 2: Exécuter les tests et constater l’échec**

```powershell
node dev/prescription_checks.js
node dev/client_view_checks.js
```

Expected: FAIL sur les anciennes actions et les nouveaux libellés absents.

- [ ] **Step 3: Réduire le rendu du catalogue Gear aux programmes privés**

Dans `scripts/profiles/admin_programs.js` :

- conserver sélection du profil, filtre, création de lien et section remplacements;
- supprimer `currentGoal`, `perms`, groupes publics, badges d’état, handlers grant/revoke/activate;
- filtrer avec `p.visibility !== "public"` pour inclure aussi les futurs programmes sans champ;
- rendre chaque carte ainsi :

```js
function card(p){
  return '<div class="admin-prog-card">'+
    '<div class="admin-prog-head"><strong>'+esc(p.name)+'</strong></div>'+
    '<div class="admin-prog-actions">'+
      '<button type="button" class="btn-accent admin-prog-btn" data-share-program="'+esc(p.id)+'">Copier le lien</button>'+
    '</div>'+
  '</div>';
}
```

Brancher `[data-share-program]` sur `sharePrescription(programId)` et conserver le fallback `prompt` existant. Le message de succès devient :

```js
status('Lien copié — envoie-le à '+target.name+'.', true);
```

- [ ] **Step 4: Mettre à jour la structure et les styles**

Dans `index.html`, remplacer le titre et l’aide par :

```html
<h2>Envoyer un programme spécialisé</h2>
<p class="muted">Les programmes de base sont déjà accessibles à tous. Choisis un client, puis copie le lien du programme spécialisé à lui envoyer.</p>
```

Dans `styles.css`, conserver les cartes existantes et ajouter seulement les règles nécessaires à une liste compacte mono-colonne, avec boutons d’au moins 44 px et texte sans débordement.

- [ ] **Step 5: Exécuter les tests ciblés**

```powershell
node dev/prescription_checks.js
node dev/client_view_checks.js
node dev/movement_swaps_checks.js
```

Expected: trois scripts `OK`, code 0.

- [ ] **Step 6: Commit UI isolé**

```powershell
git add index.html scripts/profiles/admin_programs.js styles.css dev/prescription_checks.js dev/client_view_checks.js
git commit -m "Simplifier Gear autour des prescriptions privées"
```

---

### Task 3: Version V4.5.18 et documentation de livraison

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `ETAT_ACTUEL.md`
- Modify: `CHANGELOG.md`
- Verify unchanged: `service-worker.js`

**Interfaces:**
- Consumes: contrat de version validé par `dev/regression_checks.js`.
- Produces: version cohérente V4.5.18 dans tous les porteurs autorisés.

- [ ] **Step 1: Ajouter l’entrée CHANGELOG**

Ajouter en tête de `CHANGELOG.md` une entrée V4.5.18 décrivant : visibilité privée par défaut, migration Stéphanie, Gear prescription uniquement, compatibilité hors ligne et tests.

- [ ] **Step 2: Mettre à jour tous les porteurs de version**

Remplacer V4.5.17/4.5.17 par V4.5.18/4.5.18 dans l’en-tête et `APP_VERSION` de `app.js`, `<title>`, footer et paramètres `?v=` de `index.html`, `README.md` et `ETAT_ACTUEL.md`.

- [ ] **Step 3: Vérifier le contrat de version**

```powershell
node dev/regression_checks.js
```

Expected: `OK regression_checks.js`. Si Windows CRLF fait échouer uniquement la regex historique de suivi hebdomadaire, exécuter le contrôle depuis un checkout LF et ne pas modifier la logique applicative pour contourner le test.

- [ ] **Step 4: Vérifier que le service worker reste déversionné**

```powershell
rg -n "V4\.5\.18|4\.5\.18" service-worker.js
rg -n "CACHE_NAME" service-worker.js
```

Expected: première commande sans résultat; seconde affiche `racine-v4.5`.

- [ ] **Step 5: Commit de version**

```powershell
git add app.js index.html README.md ETAT_ACTUEL.md CHANGELOG.md
git commit -m "Publier la gestion Gear en V4.5.18"
```

---

### Task 4: Validation mobile, régression complète et publication

**Files:**
- Verify: tous les fichiers modifiés des Tasks 1–3
- Do not stage: `.superpowers/`

**Interfaces:**
- Consumes: application complète V4.5.18.
- Produces: preuves de tests, branche poussée et nouvelle PR prête à fusionner.

- [ ] **Step 1: Exécuter les 18 suites de référence**

```powershell
$testFiles = @(Get-ChildItem '.\dev\*checks*.js' | Sort-Object Name) + @(Get-Item '.\dev\repro_bug1_charges_client.js', '.\dev\reference_seed_checks.js', '.\dev\reference_seed_stress.js')
foreach ($testFile in $testFiles) { & node $testFile.FullName; if ($LASTEXITCODE -ne 0) { throw "FAIL $($testFile.Name)" } }
```

Expected: 18 suites vertes; `reference_seed_stress.js` confirme 270 combinaisons.

- [ ] **Step 2: Contrôler Gear en mobile**

Servir la racine localement, ouvrir `index.html` avec Chromium/Playwright, émuler iPhone 393 × 852 DPR 3, retirer `#racineGate`, activer un profil admin et appeler `switchView('settings')`. Capturer la vue et vérifier :

```js
document.documentElement.scrollWidth === window.innerWidth
```

Répéter à 375 px. Vérifier visuellement : titre, rappel des programmes de base, sélection client, recherche, cartes privées « Copier le lien » et section remplacements séparée.

- [ ] **Step 3: Vérifier le diff final**

```powershell
git status --short
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
```

Expected: aucun fichier inattendu; `.superpowers/` non suivi reste exclu; aucune erreur `diff --check`.

- [ ] **Step 4: Demander une revue de code**

Utiliser `superpowers:requesting-code-review`, corriger uniquement les problèmes confirmés, puis relancer les tests concernés.

- [ ] **Step 5: Pousser et ouvrir une nouvelle PR**

```powershell
git push -u origin codex/gear-program-access
```

Créer une PR vers `main` avec un résumé des règles hors ligne, de la migration et des validations. Ne pas fusionner automatiquement : laisser l’utilisateur examiner puis fusionner la PR.

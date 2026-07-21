# Phases 2 à 4 privées — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre privés `hypertrophy_base`, `force_performance` et `competition_peak` sans retirer l'accès aux clients qui les utilisent déjà.

**Architecture:** La visibilité demeure pilotée uniquement par `programs/index.js`. Le contrôle de catalogue fixe explicitement les trois statuts attendus et accepte qu'un graphe `suggestedNext` historique référence un programme privé, puisque le moteur de suggestion filtre déjà ses candidats sur les programmes publics autorisés.

**Tech Stack:** JavaScript navigateur, Node.js pour les contrôles de régression.

## Global Constraints

- Seuls `hypertrophy_base`, `force_performance` et `competition_peak` passent de `public` à `private`.
- Aucun contenu d'entraînement ni mécanisme de prescription ne change.
- La réconciliation existante conserve l'accès au programme actif sans modifier semaine, historique ou charges.

---

### Task 1: Verrouiller et appliquer les trois visibilités privées

**Files:**
- Modify: `dev/program_catalog_checks.js`
- Modify: `programs/index.js:16-18`

**Interfaces:**
- Consumes: `window.COACH_BERTIN_PROGRAM_INDEX`, dont chaque entrée expose `id`, `visibility` et `suggestedNext`.
- Produces: trois entrées dont `visibility === "private"`; le moteur existant de permissions les traite alors comme des prescriptions privées.

- [ ] **Step 1: Write the failing test**

Ajouter dans `dev/program_catalog_checks.js` :

```js
const newlyPrivateIds = ['hypertrophy_base', 'force_performance', 'competition_peak'];
newlyPrivateIds.forEach(id => {
  const entry = index.find(p => p && p.id === id) || {};
  assert(entry.visibility === 'private', id + ' est privé.');
});
assert(index.filter(p => p && p.visibility === 'public').length === 29, 'Les 29 programmes publics restants demeurent accessibles à tous.');
```

Remplacer l'assertion qui oblige chaque `suggestedNext` à être public par une assertion documentant que tout successeur existe; la visibilité finale est filtrée dans `scripts/season/suggest.js`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node dev/program_catalog_checks.js`

Expected: FAIL sur `hypertrophy_base est privé.` parce que sa visibilité vaut encore `public`.

- [ ] **Step 3: Write minimal implementation**

Dans `programs/index.js`, remplacer uniquement :

```js
visibility: "public"
```

par :

```js
visibility: "private"
```

sur les entrées `hypertrophy_base`, `force_performance` et `competition_peak`.

- [ ] **Step 4: Run targeted and regression tests**

Run: `node dev/program_catalog_checks.js`

Expected: PASS et message final `Catalogue client/sportif V1.5 : OK`.

Run: `node dev/multi_profile_checks.js; node dev/prescription_checks.js; node dev/regression_checks.js; node dev/structure_checks.js`

Expected: quatre suites terminées avec `OK` et code de sortie 0.

- [ ] **Step 5: Commit**

```bash
git add dev/program_catalog_checks.js programs/index.js
git commit -m "Rendre privées les phases 2 à 4"
```

### Task 2: Vérifier et publier la branche

**Files:**
- Verify: `programs/index.js`
- Verify: `dev/program_catalog_checks.js`

**Interfaces:**
- Consumes: le commit de Task 1.
- Produces: une branche GitHub `codex/private-phases-2-4` prête pour une PR vers `main`.

- [ ] **Step 1: Verify the complete diff**

Run: `git diff --check main...HEAD` et `git diff --stat main...HEAD`.

Expected: aucune erreur d'espacement; seuls la spécification, le plan, le test et le registre sont modifiés.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin codex/private-phases-2-4
```

- [ ] **Step 3: Open the pull request**

Créer une PR vers `main` avec le résumé des trois programmes privés et les résultats de test. Ne pas fusionner automatiquement.

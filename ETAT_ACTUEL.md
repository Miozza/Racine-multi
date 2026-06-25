# État courant — Racine multi-utilisateur

Version actuelle : V1.7-multi

Statut : fusion mono → multi complète. Programmes perso Bertin intégrés avec système de visibilité. Panneau admin programmes dans vue PC. Migration des données Bertin scriptée.

## Décisions actives

- Les données vivantes sont isolées par profil dans `localStorage`.
- `scripts/profiles/reference.js` contient seulement l'ancre de calibration des programmes.
- `PRELOADED_REFS` n'est plus injecté automatiquement dans `state.movementRefs`.
- `freshState()` démarre avec un profil vide et aucune référence de mouvement vivante.
- L'onboarding écrit les charges calculées dans `state.profile`, `athleteState`, `movementRefs` et les ratios dans le registre de profil.
- La sauvegarde est locale : export/import JSON, pas de sync GitHub.
- Les programmes privés (Bertin) sont filtrés par `profile.programPermissions` — invisibles aux autres profils.
- Le macrocycle Bertin est surchargé via `profile.macrocycleOverrideKey` → `BERTIN_MACROCYCLE_OVERRIDE`.

## Fusion mono → multi (V1.7)

### Programmes privés ajoutés
- `programs/epaules_3d_press225_phase2.js` — Phase 2 Épaules 3D + Press 225 (Bertin)
- `programs/posture_cyphose.js` — Posture / Cyphose (Bertin)
- `programs/strict_muscle_up_personnel.js` — Strict Muscle-Up Personnel 12 semaines (Bertin)
- `programs/arnold_split_2026_adapte.js` — Arnold Split 2026 adapté (Bertin)
- `programs/hypertrophie_fesse_stephanie.js` — Hypertrophie Fessiers Stéphanie (Bertin)

### Système visibility
Chaque programme dans `programs/index.js` porte `visibility: "public"` ou `"private"`. `programIndexIds()` dans `app.js` filtre selon `profile.programPermissions`. Les programmes privés sont chargés en mémoire mais invisibles aux profils sans permission.

### Mini bouton switch profil
Bouton `·` dans la topnav (gauche du logo), `opacity: 0.25`, visible seulement si 2+ profils onboardés. Ouvre le picker de profil directement.

### Panneau Admin dans vue PC
Onglet `Admin` visible seulement si `profile.isAdmin === true` ou `profile.name === "Bertin"`. Tableau croisé profils × programmes privés. Toggle immédiat via `CoachProfiles.grantProgramPermission()` / `revokeProgramPermission()`.

### Migration données Bertin
`scripts/migrate_bertin.js` expose deux fonctions :
- `migrateBertin()` — lit le localStorage legacy Coach-Beurt et migre automatiquement
- `migrateBertinFromFiles(athleteState, cycleState, resultats, customCharges)` — voie de secours si pas de localStorage legacy

## Validations à lancer avant livraison

```bash
node dev/multi_profile_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/regression_checks.js --full
node dev/structure_checks.js --full
node dev/program_catalog_checks.js
node dev/crossfit_quality_checks.js
node dev/strict_muscle_up_checks.js
```

## Documents de référence

- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `docs/ARCHITECTURE.md`
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

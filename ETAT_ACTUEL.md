# ETAT ACTUEL — V2

## Correctif TMS

TMS est maintenant rendu dans `sessionView`, le même hôte que le mode Séance. Le bug venait du fait que `guidedSession` avait été déplacé hors de `phoneView/pcView` par `scripts/session/index.js`; ouvrir seulement PC ne suffisait donc pas.

# État courant — Racine multi-utilisateur

Version actuelle : V2

### Correctif V1.15-multi — TMS visible partout
- TMS reste un outil global, mais il force maintenant l’ouverture de l’hôte PC/Séance avant de rendre le choix de routine.
- Les accès topnav, WOD+ et PC ont le même comportement visible.
- La fermeture retourne à la vue précédente, sauf WOD+ qui revient au WOD.


### Correctif V1.15-multi — Topnav nettoyée

- Retrait du mini bouton discret à côté de la version en haut à gauche (`profileSwitchDot`).
- Le raccourci permanent de changement de profil n’est plus affiché dans la topnav.
- Le changement de profil reste disponible depuis les réglages, ce qui évite un bouton ambigu pour revenir vers Coach Beurt/Bertin.
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
- Vue PC : onglet `Progression` en lecture seule pour les mouvements principaux trackables, avec graphiques détaillés : échelle graduée, grille, min/max, pas de graduation, labels de valeurs, points Dernier/Meilleur, filtres 4 semaines / 8 semaines / tout, clic sur les points, panneau de détail, comparaison de deux mouvements et alerte de tendance. Les points sont condensés par mouvement/date pour éviter les dates doublées quand plusieurs sets existent dans la même séance.

## Fusion mono → multi

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


### Correctif V1.15-multi — Écran actif automatique

Les boutons visibles `Écran` ont été retirés de WOD+ et de la toolbar PC. Le mode Séance demande automatiquement le maintien de l’écran actif au démarrage. Si l’activation échoue ou n’est pas supportée, un statut discret apparaît dans Séance. Le fallback manuel est déplacé dans Gear / Diagnostic app via `Réactiver écran actif`.

### Correctif actif — TMS global

TMS est restauré comme outil global permanent après la fusion multi-profil. Il reste une routine libre (`scripts/tms_session.js`) et non un cycle du catalogue. Accès : bouton `TMS` dans la topnav, plus boutons existants WOD+/PC quand visibles.



# Release checklist — Racine

Avant d'importer dans DEV ou de publier une version de test :

```bash
node dev/multi_profile_checks.js
node dev/ai_import_fallback_smoke.js
node dev/ai_cycle_movement_bridge_smoke.js
node dev/ai_advice_clear_smoke.js
node dev/ai_advice_modal_refresh_smoke.js
node dev/ai_influence_smoke.js
node dev/ai_export_movement_context_smoke.js
node dev/simulate_multi_users.js
node dev/simulate_users.js
node dev/charge_engine_checks.js
node dev/client_charge_safety_checks.js
node dev/progression_contract_checks.js
node dev/regression_checks.js --full
node dev/structure_checks.js --full
node dev/client_view_checks.js
node dev/program_catalog_checks.js
node dev/season_checks.js
node dev/program_calibration_checks.js
node dev/crossfit_quality_checks.js
node dev/strict_muscle_up_checks.js
node dev/movement_swaps_checks.js
node dev/prescription_checks.js
node dev/repro_bug1_charges_client.js
node dev/reference_seed_checks.js
```

Documents d’implémentation associés à la sécurité des charges client :

- `docs/superpowers/specs/2026-07-15-client-charge-safety-design.md`
- `docs/superpowers/plans/2026-07-15-client-charge-safety.md`
- `docs/DIAGNOSTIC_CHARGES_CLIENT_PWA_IOS.md` (diagnostic 2026-07-20 : ratios de
  scaling corrompus + installation PWA iOS ; reproduction exécutable :
  `dev/repro_bug1_charges_client.js`)

Contrôles manuels minimum :

1. Créer un profil débutant avec bench modeste et vérifier que les suggestions ne ressemblent pas à un profil avancé.
2. Créer un deuxième profil et vérifier que l'historique du premier n'apparaît pas.
3. Sauvegarder une séance localement.
4. Exporter puis importer un profil JSON.
5. Recharger la page et confirmer que le profil actif revient correctement.
6. Ouvrir au moins un programme Haltéro CrossFit, un Performance RX CrossFit et un Préparation Metcon.
7. Vérifier qu'un profil débutant ne reçoit pas automatiquement un programme RX comme choix naturel.
8. Ouvrir `Cycle Strict Muscle-Up — 10 semaines / 4 jours` et vérifier S1, S4, S8 et S10.
9. Confirmer que le cycle strict muscle-up mentionne clairement : aucun kipping, déloads, critères de feu vert et protection coude/épaule.

Règle de sécurité : les données vivantes d'un utilisateur réel doivent rester dans le cellulaire/localStorage ou dans un export JSON manuel. Le dossier `data/` du repo peut être inclus, mais il doit rester neutre et sans historique réel.

- [x] `scripts/charge/brain_memory.js` inclus dans `index.html` et exposé via `CoachCharge.brainMemory`.

## Documentation Brain
- `docs/BRAIN.md` doit rester cohérent avec le comportement Brain Explain.

- Vérifier `data/equipment.js` : DB, KB, bumper plates et incréments câbles.


## Brain / IA

- [x] `scripts/charge/movement_profiles.js` chargé avant `brain_explain.js`.
- [x] `app.js` limité au bump de version.
- [x] Checks dev lancés.

- [x] `scripts/charge/brain_journal.js` inclus dans `index.html`.
- [x] `scripts/ai/ai_export.js` inclus dans `index.html`.
- [x] Brain Journal ne modifie pas les charges.


## Avis IA

- Vérifier `scripts/ai/ai_import.js`.
- Vérifier que le panneau `(!)` affiche Copier/Importer Avis IA.
- Vérifier qu’un avis importé est sauvegardé en localStorage et n’applique aucune charge.


## V4.2 — DOM

- Vérifier que le panneau `(!)` se met à jour immédiatement après effacement d’un avis mouvement ou cycle.
- Vérifier qu’un avis cycle effacé ne reste pas affiché sous l’avis mouvement.

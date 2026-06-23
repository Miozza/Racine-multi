# Release checklist — Racine

Avant d'importer dans DEV ou de publier une version de test :

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

# Tests ciblés — moteur de charges

## But

Depuis V51.42, Racine possède un test de validation ciblé pour le moteur de charges extrait.

Commande :

```bash
node dev/charge_engine_checks.js
```

Ce test ne lit pas les données durables réelles. Il crée un contexte Node isolé et charge les scripts runtime du moteur dans l’ordre de `index.html`.

## Ce qui est vérifié

- Les fonctions critiques du moteur restent disponibles.
- Les alias de transition ne fusionnent pas les équipements incompatibles : DB ≠ câble.
- `Lateral Raise DB` ne lit pas l’historique câble, et inversement.
- `Rear Delt Fly DB` ne lit pas l’historique câble, et inversement.
- Un nom simple peut garder une intention séparée : `Power Clean` + `technique`, `wod` ou `strength`.
- L’historique est filtré selon le contexte quand l’information existe.
- Un mouvement technique/WOD ne remplace pas une capacité principale dans `athlete_state`.
- Les anciennes entrées sans contexte restent compatibles pendant la transition.

## Frontière importante

Ce test ne remplace pas le test manuel sur iPhone. Il protège seulement les calculs qui ont déjà cassé ou qui sont sensibles depuis les changements de noms et l’extraction du moteur.

Tests manuels à garder :

```txt
Épaules 3D v2 S3 lundi/vendredi
Lateral Raise DB vs Lateral Raise câble
Rear Delt Fly DB vs Rear Delt Fly câble
Power Clean WOD vs Power Clean principal
Bouton jaune ! avec historique
Résultats + sauvegarde locale (localStorage, aucun réseau)
```

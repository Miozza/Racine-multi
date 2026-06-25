# Contrat de progression des charges — Racine

## Objectif

La progression des charges est un pilier égal au choix des mouvements. Un bon mouvement mal suivi ne donne pas une bonne progression. Un mouvement simple, stable et bien contextualisé donne au moteur une base fiable pour proposer les charges.

Ce document fixe le contrat à respecter pour les prochaines phases.

## Principe central

```txt
Nom du mouvement simple
+
équipement clair quand il change la charge
+
intention séparée du nom
+
historique filtré par contexte
=
progression fiable
```

## Rôles séparés

### Programme

Le programme choisit les mouvements, les formats, les reps, les notes et l’intention de la séance.

Il doit éviter de mettre dans le nom du mouvement :

```txt
technique
progression
rappel
léger
modéré
tempo
pump
A1. / B1. / C1.
/ ou "ou"
```

### Nom du mouvement

Le nom doit être court et stable.

Exemples valides :

```txt
Strict Press
Bench Press
Lateral Raise DB
Lateral Raise câble
Rear Delt Fly DB
Rear Delt Fly câble
Power Clean
Knee Raise
```

L’équipement reste dans le nom seulement s’il change la charge ou le mapping historique.

### Contexte

L’intention doit vivre dans le contexte : note, bloc, kind, format, jour, semaine.

Exemples :

```txt
Power Clean
intent: technique
kind: accessory
```

```txt
Power Clean
intent: wod
format: AMRAP 8
```

```txt
Power Clean
intent: strength
kind: main
```

## Règles de progression

### 1. Principal vs WOD vs technique

Un résultat WOD ou technique peut être gardé dans l’historique, mais ne doit pas remplacer automatiquement la capacité principale.

Exemple :

```txt
Power Clean WOD 135 lb @RPE 7
```

ne doit pas écraser :

```txt
Power Clean principal 185 lb @RPE 8
```

### 2. Équipement non compatible

Le moteur ne doit pas mélanger :

```txt
DB ≠ câble
DB ≠ machine
câble ≠ barre
poids du corps ≠ charge ajoutée
```

Exemples critiques :

```txt
Lateral Raise DB ≠ Lateral Raise câble
Rear Delt Fly DB ≠ Rear Delt Fly câble
Weighted Pull-Up ≠ Ring Row
DB Shoulder Press ≠ Landmine Press
```

### 3. Historique ancien

Les anciens noms restent lisibles comme alias de transition, mais ils ne doivent pas fusionner des équipements incompatibles.

Exemples :

```txt
Lateral Raise haltères → Lateral Raise DB
Lateral Raise câble bas → Lateral Raise câble
Rear Delt Fly haltères → Rear Delt Fly DB
Rear Delt Fly câble bas → Rear Delt Fly câble
```

### 4. Progression prudente

La progression doit rester limitée par :

```txt
RPE réel
saut maximal prudent
statut de surveillance
contexte technique/WOD/récupération
équipement disponible
```

Le moteur ne doit pas chercher à battre un PR à chaque séance. Il doit construire une progression répétable.

## Garde-fous obligatoires

Avant une release qui touche aux charges, exécuter :

```bash
node dev/regression_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
```

Pour un ZIP update :

```bash
node dev/regression_checks.js --update-package
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
```

## Interdictions

Pendant une phase de refactor ou de contrat :

```txt
ne pas changer data/
ne pas modifier data/charges.js
ne pas modifier les programmes sans demande explicite
ne pas modifier la logique de suggestion en même temps qu’un nettoyage structurel
```

## Verdict

Le moteur de charges n’est pas seulement une fonction de calcul. C’est le lien entre programme, historique, RPE, équipement et progression réelle. Le choix de mouvement et la progression des poids doivent être traités au même niveau de priorité.

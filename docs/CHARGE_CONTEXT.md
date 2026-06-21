# Contexte mouvement — moteur de charges

## But

Depuis V51.40, Racine prépare une séparation entre le nom affiché du mouvement et son intention réelle.

Règle :

```txt
Nom du mouvement = simple + équipement utile
Intention = contexte séparé
```

## Pourquoi

Les noms de mouvements ont été simplifiés pour éviter les conflits de mapping. Exemple :

```txt
Power Clean technique -> Power Clean
Hanging Knee Raise progression -> Knee Raise
```

Mais l’intention ne doit pas disparaître. Elle doit être lisible par le moteur sans revenir polluer le nom du mouvement.

## Champs captés

`coachBuildMovementContext()` peut retourner :

```txt
label
equipment
intents
primaryIntent
kind
blockTitle
note
text
format
day
week
```

Intentions possibles :

```txt
wod
technique
progression
light
strength
hypertrophy
recovery
recall
```

## V51.41 — utilisation prudente du contexte

Le contexte influence maintenant les garde-fous prudents :

```txt
technique
wod
light
progression
recovery
```

Ces contextes ne sont pas auto-progressés comme des mouvements principaux.

L’historique futur peut conserver le contexte. Quand le contexte existe, le moteur filtre les entrées pour éviter qu’une référence technique/WOD influence une progression principale. Les anciennes entrées sans contexte restent compatibles par transition.

## Exemple visé

Utiliser ce contexte pour éviter que certains mouvements simples soient interprétés hors intention, par exemple :

```txt
Power Clean + intent technique
Power Clean + intent wod
Power Clean + intent strength
```

Cette étape garde les noms simples et recentre la prudence dans le moteur.


## V51.42 — validation ciblée

Le contexte mouvement est maintenant protégé par `dev/charge_engine_checks.js`. Le test vérifie notamment que :

```txt
Power Clean + intent technique ne se comporte pas comme Power Clean principal
Power Clean + intent wod est loggé sans écraser la capacité principale
Lateral Raise DB reste séparé de Lateral Raise câble
Rear Delt Fly DB reste séparé de Rear Delt Fly câble
```

Cette étape ne change pas la logique de suggestion; elle rend le moteur plus sûr à modifier plus tard.

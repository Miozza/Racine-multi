# ERROR_LOGGING.md — Journal d’erreurs Racine

## Objectif

Le logger sert à diagnostiquer les erreurs qui arrivent pendant l’utilisation réelle de l’app, surtout sur iPhone où la console JavaScript n’est pas pratique.

Il ne remplace pas les tests `dev/*`. Il complète les tests avec un journal local exportable.

## Fichier runtime

```txt
scripts/core/logger.js
```

API publique :

```txt
window.CoachLog
```

Fonctions principales :

```txt
CoachLog.info(code, meta)
CoachLog.warn(code, meta)
CoachLog.error(code, error, meta)
CoachLog.getReport()
CoachLog.copyReport()
CoachLog.clear()
CoachLog.count()
```

## Stockage

Le journal est local uniquement :

```txt
localStorage.coachBeurtErrorLog
```

Il ne modifie aucun fichier `data/` et n’écrit pas directement dans GitHub.

## Capture automatique

Le logger capte :

```txt
window error
unhandled promise rejection
resource/script load failed
```

## Logs volontaires

Les domaines peuvent appeler `CoachLog` pour des erreurs importantes qui ne cassent pas toujours l’app :

```txt
GitHub read/write failed
sync failed
session save failed
wake lock failed
timer measure fallback
backup import invalid
```

## Interface

Dans ⚙ Paramètres :

```txt
Diagnostic app
- Copier rapport erreurs
- Effacer erreurs
```

Le rapport copié peut être envoyé dans le chat de développement.

## Règles

- Le logger doit rester dans `scripts/core/`.
- Le logger ne doit pas contenir de logique de charge, de session ou de programme.
- Les modules peuvent appeler `CoachLog`, mais ne doivent pas dépendre du logger pour fonctionner.
- Le ZIP update ne doit pas contenir `data/`, même si des erreurs ont été enregistrées localement.

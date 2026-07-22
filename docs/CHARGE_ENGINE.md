# Moteur de charges Racine

## Hiérarchie de suggestion

La suggestion de charge suit cette logique générale :

1. `athlete_state` (état dérivé)
2. reconstruction depuis `resultats` (journal brut)
3. `data/charges.js` (`DEFAULT_CHARGES` : charges de départ)
4. fallback du programme

> Note : `athlete_state` et `resultats` désignent des **rôles logiques** vivant en
> mémoire / `localStorage`. Les fichiers `data/athlete_state.json` et
> `data/resultats.json` du dépôt sont des **squelettes vides** (voir
> `docs/DATA_FLOW_CONTRACT.md`) — pas des sources à lire/écrire directement.

## Règles de prudence

- Après un RPE réel `>= 9`, aucune hausse automatique.
- RPE `>= 9` deux séances consécutives sur la même charge → baisse contrôlée autorisée (V1.16). Le plancher historique ne bloque pas cette baisse. Plancher sécuritaire : `lastLoad - 2×maxJump`.
- Pour les isolations à RPE `>= 8.5`, maintenir ou réduire légèrement.
- Les mouvements techniques ne doivent pas progresser comme les mouvements principaux.
- Le deload doit réduire/maintenir la charge, pas seulement le volume.
- Le bouton `!` explique la suggestion; il ne doit pas recalculer silencieusement une autre charge.

## Mapping sensible

Ces mouvements doivent rester distincts :

- Weighted Pull-up
- Ring Row lourd
- DB Shoulder Press
- Landmine Press
- Power Clean technique
- Power Clean lourd
- Overhead Rope Extension lourd vs rappel

## Équipement

Autorité de l'arrondi : **`data/equipment.js`** (`EQUIPMENT_LOAD_RULES`), source
unique des tailles réelles du rack. `data/charges.js` ne fournit que les charges de
**départ** (`DEFAULT_CHARGES`), jamais l'arrondi.

- Câble : incrément réel de 10 lb.
- Barbell : incrément standard de 5 lb.
- Dumbbells : arrondi vers les tailles disponibles dans `data/equipment.js`.
- Kettlebell : seule famille en kg (voir `data/equipment.js`).


## Transition Épaules 3D v2

`shoulders3d_v2` réutilise des noms de mouvements compatibles avec les alias de transition existants afin que l’historique de `shoulders3d` continue de servir aux suggestions.


## V51.42 — Tests ciblés

Le moteur extrait est validé par `node dev/charge_engine_checks.js`, en plus des garde-fous généraux de `dev/regression_checks.js`.

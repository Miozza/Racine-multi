# Audit du moteur de charge — 28 août 2026

Portée : les 5 constats issus de la trace `racine_charge_trace` (V4.6.10,
portée `cycle`, programme `phase2_fable5`, 8 semaines, 112 mouvements).

Chaque verdict est appuyé sur le **code réel** (`fichier:ligne`) et, quand
c'est possible, sur un **replay mesuré** du moteur. Aucune modification de
code n'accompagne ce document.

---

## 0. Deux réserves de méthode, à lire avant les constats

### 0.1 La fixture — absente à l'audit, fournie depuis

> **Mise à jour du 30 août.** La trace réelle a été fournie et se trouve
> désormais dans `docs/fixtures/racine-trace-charges-phase2_fable5-cycle-complet.json`.
> **Tous les constats ci-dessous ont été revérifiés contre elle** — ils tiennent,
> aux arrondis près. Le détail chiffré est dans
> `docs/audit/2026-08-28-trace-diff.md` § 1.
>
> | Constat | Annoncé ici | Mesuré sur la trace réelle |
> |---|---|---|
> | Facteur d'échelle | 0,81 → 1,67 | **0,815 → 1,667** |
> | « clé de contexte différente » | 55 | **54** |
> | « seed manuel » | 43 | **43** |
> | « nature limitée [wod] » | 32 | **32** |
> | Front Squat retenu | 0/7 | **0/7** |
> | Close-Grip Bench retenu | 0/4 | **0/4** |
> | Pendlay Row en 5×5 | 250 lb | **250 lb** |
>
> Ce qui suit décrit l'état de la session au moment de l'audit, et pourquoi un
> replay a été construit. Il reste utile : c'est lui qui rend la comparaison
> avant/après exécutable, et il est aujourd'hui alimenté par les vraies données.

Au moment de l'audit, `racine-trace-charges-phase2_fable5-cycle-complet.json`
n'était présent nulle part — ni dans le dépôt, ni dans la session, ni sur le
disque (`find / -iname '*racine-trace*'` → vide). `docs/fixtures/` n'existait
pas.

Impossible, donc, de comparer ligne à ligne contre *la* trace de Bertin. D'où un
**replay reproductible** du moteur réel (`dev/charge_replay_phase2.js`, ajouté
en Phase 4) : moteur `scripts/charge/` non modifié, programme
`programs/phase2_fable5.js` non modifié, `CoachChargeTrace.report('cycle')` réel,
sur un athlète dont les ratios étaient alors **reconstitués depuis les rapports
`chargeMiseAEchelle / chargeLue` cités dans les constats**.

Ce replay reproduisait déjà les symptômes signalés — facteur d'échelle
0,846 → 1,667, Face Pull 100 lb, Pendlay Row 250 lb, Power Clean figé — ce qui
valait validation croisée. **Il est désormais alimenté par les 109 séances
réelles de la trace**, et reproduit à l'identique ses 46 couples
`chargeLue → chargeMiseAEchelle` ainsi que sa MAPE de backtest (16,7 %).

### 0.2 Une trace de cycle rejoue le même historique 8 fois

`CoachChargeTrace.day()` appelle `guardedSuggestedLoadDecision` avec
**l'historique d'aujourd'hui** pour chaque semaine tracée
(`scripts/charge/trace.js:210-235`). Et `coachCycleProgress01()` lit le
**`weekIdx()` global de l'app**, pas la semaine tracée
(`scripts/charge/suggestion.js:331-345`).

Donc, sur une trace de cycle, la seule chose qui varie d'une semaine à l'autre
est **la charge écrite au programme et le contexte du bloc**. Si la suggestion
ne bouge pas, cela prouve exactement une chose — mais c'est la chose qui nous
intéresse : **la rampe hebdomadaire du programme n'a aucun effet sur la
sortie.** C'est le constat 1, et la trace le démontre bien.

---

## Constat 1 — La suggestion est gelée sur le cycle → **CONFIRMÉ**

**Mécanisme réel.** La charge du programme entre dans le moteur une seule
fois, comme **valeur de départ** :

- `scripts/charge/suggestion.js:518` — `programNum = parseLoad(currentLoad)`
  puis `coachApplyUserLoadScale`.
- `scripts/charge/suggestion.js:571` — `ctx.suggested = programNum` (graine).

Elle est ensuite **écrasée sans condition** dès qu'une ancre historique
existe, par deux règles qui ne regardent jamais `programNum` :

- `coachRuleLiftFromControlledHistory` — `suggestion.js:624-649` :
  `if (bestControlled.load > ctx.suggested) ctx.suggested = bestControlled.load`
- `coachRuleReferenceReelleValidee` — `suggestion.js:652-664` : idem.
- `coachRuleFloorValidation` — `suggestion.js:1118-1140` : plancher
  `ctx.suggested = ctx.lastLoad`, placé en fin de cascade pour avoir le
  dernier mot.

**Il n'existe aucune règle symétrique** : rien dans les 15 règles de
`guardedSuggestedLoadDecision` (`suggestion.js:439-461`) ne dit « ne reste pas
sous la progression écrite ». `ctx.programNum` n'est relu que pour des
comparaisons de sévérité (`:668`), pour le re-clamp des contextes limités
(`:1215-1226`) et comme repli du deload (`:83-101`). **Jamais comme plancher.**

**Pourquoi le gel, et pas une simple divergence.** Une fois l'ancre posée, la
hausse dépend du seul barreau RPE. Or le dernier barreau de la table par
défaut est `{maxRpe:8, steps:0}` (`scripts/charge/movement_tuning.js:84`) :
**à RPE 8, la progression méritée vaut zéro cran.** Un athlète régulier qui
note 8 reste immobile indéfiniment, quoi qu'écrive le programme.

Replay, raison affichée mot pour mot :

```
DB RDL   S1 : écrit "65-70 lb / main" → échelle 55 → propose 85
   « Maintien a 85 lb : RPE 8 sur la derniere serie. Confirme cette charge
     avant de monter. »
```

La rampe 55 → 60 → 55 → 45 du programme n'apparaît nulle part dans la
décision.

---

## Constat 2 — Le facteur d'échelle par mouvement est incohérent → **CONFIRMÉ**

**Où il est produit.** `coachApplyUserLoadScale`
(`scripts/charge/scaling.js:128-136`) → `coachUserLoadRatio`
(`scaling.js:85-124`).

**Le calcul réel, dans l'ordre :**

1. **Correspondance directe** avec l'un des 12 mouvements de référence
   (`scaling.js:98-111`) : ratio = capacité testée de l'athlète / valeur de
   l'athlète de référence (`scripts/profiles/reference.js:24-35`).
2. **Sinon, repli par famille** (`scaling.js:115-122`), par simple regex sur
   le nom : `_olympic`, `_hinge`, `_lowerBody`, `_upperPull`, `_upperPush`.
3. **Sinon `_overall`**, sinon 1.
4. **Clamp** `[0,25 – 1,60]` (`scaling.js:42-55`), avec log
   `scale_ratio_clamped`.

**Il y a donc bien une borne — et c'est elle que la trace a mesurée.** Le 1,67
observé n'est pas un ratio : c'est le **rapport après arrondi équipement**.
`coachApplyUserLoadScale` arrondit au cran de rack (`scaling.js:134`) :
60 lb × 1,60 = 96 → **100 lb** → rapport apparent **1,667**. La borne existe,
elle est simplement franchie par l'arrondi. Mesuré au replay :
Face Pull `60 → 100` = 1,667, Pendlay Row `155 → 250` = 1,613.

**D'où vient l'emprunt.** Un mouvement hors des 12 référence emprunte **la
moyenne de sa famille**, construite dans
`scripts/profiles/onboarding.js:240-274` :

```js
ratios._upperPull = avg(["row8RM","chestRow8RM","latPulldown10RM"]);
```

Et voici le défaut structurel : la référence `latPulldown10RM` vaut **20**
(`reference.js:32`) — un numéro de plaque machine, pas des livres comparables.
Une valeur d'athlète de 40 produit un ratio composant de **2,0**, tout juste
sous le garde-fou `RATIO_COMPONENT_MAX = 2.0` (`onboarding.js:259`) qui
l'aurait exclu. Il **entre donc dans la moyenne** et tire tout `_upperPull`
vers le haut. Tout ce que la regex `/row|pull up|pulldown|curl|face pull|rear
delt|lat |shrug/` attrape hérite de cette contamination : Pendlay Row, Face
Pull, Rear Delt Fly, Weighted Pull-up.

**Nulle part** l'emprunt de famille n'est nommé dans `suggestion.raison` : la
suggestion sort avec « Charge du programme, arrondie selon l'equipement. »

Distribution mesurée sur les 17 mouvements chargés du cycle :

```
0.846 DB RDL      0.848 Pause Back Squat   0.852 Front Squat
0.862 Back Squat  0.865 Box Squat          1.000 Cuban Press
1.036 Strict Press  1.049 Close-Grip Bench  1.091 Incline DB Press
1.094 Power Clean   1.214 One-Arm DB Row    1.333 Rear Delt Fly
1.500 Weighted Pull-up   1.613 Pendlay Row  1.667 Face Pull
```

**Le squat descend de 15 %, le tirage monte de 66 %, chez le même athlète, le
même jour.**

---

## Constat 3 — Sans historique, l'échelle passe sans filet → **CONFIRMÉ**

**Chemin de repli.** Il en existe un : `coachRuleReferenceDeTravail`
(`suggestion.js:594-610`), qui pose une rampe périodisée **sous le RM**. Mais
il ne se déclenche que si `coachDeclaredRangeReference` trouve une référence
déclarée (`suggestion.js:346-404`) — dans `mv.ranges` ou `state.movementRefs`.
Pour un mouvement jamais fait et jamais testé, il ne retourne rien.

Toutes les règles suivantes exigent alors une donnée absente :
`coachRuleLastSetGuards` sort à la première ligne si `!ctx.last`
(`:713`) ; `coachRuleRepSurplusLift` idem (`:857`) ;
`coachRuleFloorValidation` exige `ctx.last` (`:1119`) ;
`coachRuleCeilingCap` déduit son plafond de l'historique et sort si rien
(`scripts/charge/ceiling.js:190-192`).

Il ne reste que l'arrondi. **`propose == chargeMiseAEchelle`, par
construction.** Mesuré : **27 occurrences sur 27**, toutes identiques.

```
Pendlay Row      : échelle 250 → propose 250   [IDENTIQUE]
Box Squat        : échelle 160 → propose 160   [IDENTIQUE]
One-Arm DB Row   : échelle  85 → propose  85   [IDENTIQUE]
Weighted Pull-up : échelle  30 → propose  30   [IDENTIQUE]
```

**Aucun plafond de plausibilité absolue, aucune cohérence avec les mouvements
voisins.** 250 lb en 5×5 sur un Pendlay Row sort avec la sévérité `ok` et la
raison « Charge du programme, arrondie selon l'equipement. »

---

## Constat 4 — Le filtre de contexte mange l'historique → **CONFIRMÉ**

**Le filtre.** `coachFilterHistoryForProgression`
(`scripts/charge/historique.js:282-294`), appelé une seule fois
(`suggestion.js:485`), **avant** toute règle.

Ses règles réelles, dans l'ordre, **toutes binaires** :

| Règle | Ligne | Effet |
|---|---|---|
| `row.implausible` | `historique.js:283` | rejet |
| `coachIsNonPerformanceSeed` (`manual_recalibration`, `manual_charge_override`, `manual_pr`) | `historique.js:242-250` | rejet |
| nature limitée ≠ nature du jour | `historique.js:290-291` | **rejet** |
| `coachContextMatches` — clé de contexte | `historique.js:232-240` | **rejet** |
| charge invraisemblable vs seed profil | `suggestion.js:488-494` | rejet |

`coachIsLimitedProgressionContext` (`mouvements.js:460-462`) déclare limité
tout contexte portant `technique`, `light`, `progression`, `wod` ou
`recovery`. La comparaison est un `!==` sur un booléen : **toute semaine légère
ou technique se coupe intégralement des semaines normales, et réciproquement.**

Et quand un mouvement « exige un contexte identique »
(`coachShouldPreferContextMatch`, `historique.js:214-221` — vrai dès que le
contexte du jour est limité), la clé comparée est
`label|équipement|intention|kind|titre de bloc|jour`
(`coachMovementContextKey`, `historique.js:202-212`). **Un titre de bloc
reformulé suffit à effacer l'historique.**

**Aucune pondération nulle part.** Le filtre retourne un `Array` : une ligne y
est, ou n'y est pas. Aucun poids n'existe dans le moteur.

Replay avec contextes stockés réalistes — trois occurrences à **0 ligne
retenue alors que 6 sont stockées** :

```
Back Squat   S8 : 0/6 retenu → propose 175  « Cle de contexte differente… »
DB RDL       S8 : 0/6 retenu → propose  45  « …la seance du jour est limitee [light] »
Strict Press S8 : 0/6 retenu → propose 165  « …la seance du jour est limitee [wod,strength] »
```

**Le diagnostic du prompt est exact et mérite d'être répété :** le Brain n'a
pas un problème d'algorithme, il a un problème de **données admises**. Il
apprend correctement sur ce qu'on lui donne ; on lui en donne zéro.

---

## Constat 5 — Biais directionnel → **PARTIEL**

**Confirmé :** le biais est **structurel et prévisible**, pas aléatoire. Il ne
vient pas d'un traitement « accessoires vs principaux » — cette distinction
n'existe pas dans le calcul de charge. Elle n'apparaît que dans
`isIsolationMovement` (portée du barreau RPE) et
`coachIsMainLoadContext` (multiplicateur de deload,
`suggestion.js:59-71`) ; **ni l'une ni l'autre ne touche l'échelle**.

Les deux moitiés du biais ont **deux causes distinctes**, et c'est le point
important pour l'ordre des corrections :

- **Accessoires surcotés = constat 2 puis constat 3.** Ils ne sont presque
  jamais dans les 12 mouvements de référence, donc ils prennent le ratio de
  famille contaminé (`_upperPull` ≈ 1,6). Et comme beaucoup n'ont pas
  d'historique exploitable, rien ne les rattrape : `propose ==
  chargeMiseAEchelle`. **Corriger le constat 2 corrige cette moitié.**

- **Gros mouvements sous-cotés = constat 4 puis constat 1.** Front Squat 0/7
  lignes retenues : privé d'historique, il retombe sur `programNum` scalé à
  0,85 — soit **45 % sous ce que l'athlète soulève réellement**. Et quand
  l'historique passe, l'ancre le fige sous la rampe écrite (constat 1).
  **Corriger le constat 4 corrige cette moitié ; le constat 2 n'y peut rien.**

**Mesuré depuis, sur la trace réelle :** MAPE **16,7 %**, médiane **8,3 %**,
**13/63** dans la fourchette écrite, **29 au-dessus / 39 en dessous** sur
108 points de backtest. Les chiffres du prompt (18,1 %, médiane 9,1 %, 29/90)
sont du même ordre sans être identiques — dénominateurs et version du moteur
diffèrent (la trace est en V4.6.9). Le **sens** du biais est confirmé : plus de
sous-estimations que de sur-estimations, et les deux familles de causes
identifiées ci-dessus se retrouvent telles quelles.

---

## Ce que l'audit a trouvé et que les 5 constats ne disaient pas

Trois défauts mesurés qui pèsent plus lourd que ce qui était demandé.

### A. `EMOM 8 : 2 Power Clean` est lu comme une cible de **8 reps**

`parseTargetReps` (`app.js:796-829`) essaie, dans l'ordre : une plage `X-Y`,
un `×N`, un `NRM`, un « N reps ». **Aucun ne matche « EMOM 8 : 2 Power
Clean ».** Le repli s'applique — `repsHint`, qui vaut `8` côté trace
(`trace.js:219`) et `10` côté séance (`suggestion.js:1768`).

Mesuré :

```
parseTargetReps('EMOM 8 : 2 Power Clean', 8)  →  {min: 8, max: 8}
parseTargetReps('5×3', 8)                     →  {min: 3, max: 3}
parseTargetReps('6×2', 8)                     →  {min: 2, max: 2}
```

**Le prompt annonce `repsCibles = 2` pour ce format. Le code produit 8.**

Ce n'est pas un détail : cela **inverse le signe du cas de référence**. Un
athlète qui sort 4 reps là où le programme en demande 2 est, pour le moteur,
un athlète qui sort 4 reps là où il en fallait 8 — c'est-à-dire un **déficit**
de reps, pas un surplus. `coachRuleRepSurplusLift` (`suggestion.js:853-893`)
exige `lastReps > target` : il ne se déclenche **jamais**. Et la branche de
projection Epley **vers le bas** de `coachRuleLastSetGuards`
(`suggestion.js:786-798`) se déclenche, elle, à `repGap >= 3` — donc `8-4 = 4`,
elle tire la suggestion **vers le bas**.

Ajouter un signal d'écart de reps sans corriger ça le brancherait à l'envers.

### B. Le bloc principal du vendredi est classé « WOD » **et** « technique »

`coachExtractMovementIntent` (`mouvements.js:322-398`) fait, ligne 327 :

```js
if(/amrap|emom|for time|wod|cap|time cap/.test(n)) add('wod');
```

Le texte testé inclut le **format de l'exercice** (`mouvements.js:402`). Donc
`EMOM` dans le format d'un bloc `kind:"main"` déclare un contexte WOD. La note
« Vitesse maximale à charge sous-maximale » ajoute `technique` (ligne 344).

Mesuré au replay :

```
Power Clean S1 : intentions ["wod","technique","strength"] — limite = true
```

`coachRuleContextLimited` (`suggestion.js:579-585`) coupe alors toute
auto-progression, et `coachRuleContextLimitedRounding` (`:1215-1226`)
re-clampe la sortie. **Power Clean est figé à 125 lb sur les 8 semaines**, sans
rapport avec les reps. Le fichier `movement_tuning.js:194-207` documente
précisément ce piège pour le mot « vitesse » — mais le mot `EMOM`, lui, n'a
jamais reçu le même traitement.

### C. `Pallof Press` n'a aucun repère et ressort **sans charge**

Charge écrite : `"bande ou câble léger"` (`programs/phase2_fable5.js:126`).
`parseLoad` ne rend rien, `coachDefaultLoadSeedForMovement`
(`historique.js:45-59`) ne trouve ni entrée `DEFAULT_CHARGES` ni motif dans
`defaultLoadSeeds` (`movement_tuning.js:413-454`). Sans historique, le moteur
sort en `early` avec `propose: null` (`suggestion.js:551-554`).

**Avec** historique, en revanche, `programNum` devient la dernière charge
loggée (`suggestion.js:539-548`) — ce qui explique le « 70 lb » signalé. Le
texte « **léger** », lui, n'est lu par personne : aucun code ne fait descendre
une charge parce que le programme a écrit « léger » ou « bande ». Le
qualificatif est écrit, stocké, et ignoré.

---

## Synthèse

| # | Constat | Verdict | Cause première |
|---|---|---|---|
| 1 | Suggestion gelée sur le cycle | **CONFIRMÉ** | Aucun plancher de rampe + barreau RPE 8 à 0 cran |
| 2 | Facteur d'échelle incohérent | **CONFIRMÉ** | Ratio de famille contaminé par `latPulldown10RM` ; clamp 1,60 franchi par l'arrondi |
| 3 | Sans historique, pas de filet | **CONFIRMÉ** | Aucun plafond de plausibilité sur ce chemin |
| 4 | Filtre de contexte binaire | **CONFIRMÉ** | Exclusion `!==`, jamais de pondération |
| 5 | Biais directionnel | **PARTIEL** | Mécanisme confirmé (= 2 pour le haut, = 4 pour le bas) ; chiffres non revérifiés |
| A | `EMOM … : 2` lu comme 8 reps | **NOUVEAU** | `parseTargetReps` sans motif EMOM |
| B | Bloc principal classé WOD+technique | **NOUVEAU** | `EMOM` dans le détecteur d'intention |
| C | « bande ou câble léger » ignoré | **NOUVEAU** | Aucun repère, aucun plafond textuel |

### Conséquence sur l'ordre des corrections

Les corrections **A** et **B** doivent passer **avant** la Phase 3. Sans elles,
le signal d'écart de reps est branché à l'envers sur son propre cas de
référence, et Power Clean reste figé quoi qu'on ajoute.

---

*Phase 1 — vérification seule. Aucun fichier de `scripts/` ni de `programs/`
n'a été modifié pour produire ce rapport.*

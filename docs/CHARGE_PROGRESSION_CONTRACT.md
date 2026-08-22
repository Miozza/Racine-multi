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

Le nom doit être court et stable. **Autorité unique : `docs/STRUCTURE_CONTRACT.md`
§ « Règle des noms de mouvements »** (liste des interdits, exemples valides). Ne pas
dupliquer la règle ici — s'y référer.

Point spécifique au moteur : l'équipement reste dans le nom **seulement** s'il change
la charge ou le mapping historique (`Lateral Raise DB` ≠ `Lateral Raise câble`).

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

#### Échelon RPE (depuis V4.5.56)

« Limitée par le RPE réel » veut dire **graduée**, pas binaire. Le moteur n'a plus
un seul palier (`RPE <= 7` → un cran) : il lit une échelle déclarée dans
`scripts/charge/movement_tuning.js` (`rpeProgression`), qui donne pour un RPE
donné un **nombre de crans** d'équipement et un **multiplicateur du saut maximal**.

| RPE de la dernière série réussie | Crans proposés | Saut maximal |
|---|---|---|
| ≤ 6 | 3 | ×1,5 |
| 6,5 | 2 | ×1,25 |
| 7 – 7,5 | 1 | ×1 |
| 8 | aucune hausse automatique | — |
| ≥ 8,5 | maintien ou réduction | — |
| ≥ 9 | **hausse bloquée** | — |

Trois règles encadrent cette table et ne se négocient pas :

- Le RPE choisit **l'ambition** ; le saut maximal prudent garde le **dernier mot**.
  Un multiplicateur n'est pas un contournement du garde-fou : le saut reste borné,
  il devient seulement fonction de l'effort réellement ressenti.
- Les freins hauts (≥ 8,5 et ≥ 9) sont **hors de portée** de l'échelle.
- Un plafond prudent ne descend **jamais** sous un cran d'équipement. Un plafond
  plus petit que le plus petit pas disponible fige le mouvement définitivement —
  ce n'est pas de la prudence, c'est une impasse.

Tout ajustement de cette réponse se fait **dans la table**, jamais par un `if` sur
le RPE dans une fonction de décision.

#### Réactivité — la tendance, pas seulement la dernière valeur (depuis V4.5.57)

Un barreau seul ne lit **qu'un chiffre** : le RPE de la dernière séance. Deux
athlètes à RPE 7 n'ont pourtant pas le même élan si l'un descend de 8 à 7 pendant
que l'autre monte de 6 à 7. Et sur une barre, la sortie est quantifiée à 5 lb :
ajouter des barreaux ne crée aucune finesse supplémentaire — seule la **direction**
en crée.

Les modificateurs de `rpeProgression.modifiers` décalent le barreau d'un cran :

| Signal | Lu sur | Effet |
|---|---|---|
| Même charge de moins en moins coûteuse (RPE −0,5 sur 3 séances) | historique récent | +1 cran |
| Même charge de plus en plus coûteuse (RPE +0,5 sur 3 séances) | historique récent | −1 cran |
| Reps dépassées d'au moins 2 | dernière série | +1 cran |

Trois limites tiennent ce mécanisme :

- Un modificateur ne touche **jamais** au saut maximal prudent. Il rend le moteur
  plus prompt à utiliser la marge existante, il ne l'élargit pas.
- Les freins ≥ 8,5 et ≥ 9 sont **hors de portée** des modificateurs.
- En dessous de 3 séances comparables, **aucune tendance n'est affirmée**.

Le barreau RPE 8 vaut zéro cran : par défaut, un **maintien annoncé** — pas la
zone morte silencieuse d'avant, où 7,5 progressait, 8,5 freinait et 8 ne faisait
rien sans jamais le dire. Une tendance qui s'allège peut le promouvoir à un cran.

#### Les répétitions en plus sont une capacité, pas un bonus (depuis V4.5.67)

Le moteur savait projeter Epley vers le **bas** : « dernier 135 × 2 pour 5 reps
demandées » réduit la suggestion (`coachRuleLastSetGuards`, écart de reps). La
projection vers le **haut** n'existait pas — un `135 × 5` sur une cible de 2 reps
ne laissait aucune trace, alors que le même calcul dit ~148 lb sur 2 reps.

Deux conséquences réparées ensemble :

| Ce qui manquait | Où | Depuis V4.5.67 |
|---|---|---|
| Le crédit de reps était **forfaitaire** (+1 cran dès 2 reps de plus) | `rpeProgression.modifiers.repsOvershoot` | lit aussi le **ratio** reps/cible ; la lecture la plus sévère des deux gagne |
| Aucune projection Epley vers le haut | `coachRuleRepSurplusLift()` | franchit une part de l'écart par séance, réglée par intention (`repsSurplus`) |
| `easy_success` mémorisait `capacityLoad = load` | `updateAthleteStateFromResults()` | mémorise la capacité projetée à la cible, bornée au saut maximal |

L'écart absolu seul ne dit rien : sur une cible de 8, +2 reps est un débordement
mineur ; sur une cible de 2, +2 reps est un **doublement**. Le ratio porte cette
information.

La part franchie par séance dépend de l'intention, parce que le surplus ne dit
pas la même chose partout — **force 50 %**, **hypertrophie 30 %** (le surplus
vient souvent du volume, pas de la force), **vitesse 25 %**. Les règles ne
s'appliquent jamais telles quelles :

- Le saut maximal prudent garde le **dernier mot**, comme toujours.
- Au-dessus de RPE 8 (7,5 en vitesse), le surplus ne vaut **rien**.
- Les freins ≥ 8,5 et ≥ 9 sont **hors de portée**.
- Un contexte technique / WOD / léger n'a **aucun** crédit de surplus.

#### Un bloc vitesse suit un pourcentage, pas une charge absolue (depuis V4.5.67)

Un bloc d'effort dynamique est prescrit en **% du 1RM**. Une charge absolue
écrite dans un programme est un pourcentage de l'**athlète de référence** : elle
dérive dès que l'athlète s'en écarte, et une charge gelée cesse de produire le
stimulus prévu. Cas réel : « Squat vitesse ~60 % » de `phase2_fable5`, figé à
~130-135 lb pour un Back Squat de ~275 lb — **47-49 %**.

`speed` est une intention à part entière. Elle **s'ajoute** à `technique`, elle
ne la remplace pas : un bloc vitesse reste un contexte à progression limitée et
ne remplace jamais une capacité principale dans `athlete_state` (règle 1). Ce
qu'elle change, c'est qu'une règle dédiée — `coachRuleSpeedStimulusBand()` — peut
ramener la charge vers la cible déclarée.

La détection est **volontairement étroite**, et c'est le contrat :

```txt
aucune tournure d'avertissement   (« stop si la vitesse meurt », « vitesse avant ego »)
+ un mot-clé d'explosivité        (vitesse · speed · explosif · effort dynamique)
+ une cible en % sous-maximale    (« ~60 % », « 60-65 % », 30 % ≤ p ≤ 80 %)
= bloc vitesse
```

Sans les trois, rien ne change. Le mot « vitesse » sert partout dans le catalogue
de simple consigne d'arrêt ; le lire comme une intention re-tariferait la moitié
des programmes. Le pourcentage déclaré est aussi ce qui rend la recalibration
possible : sans lui, il n'y a rien vers quoi converger.

La dérive est gardée sur cinq points, et aucun ne se négocie :

- **Ancre** = la capacité de force **réelle** du mouvement (`athlete_state` →
  références de travail → tests de calibration), jamais l'e1RM du set de vitesse
  lui-même — à RPE 7 sur un bloc vitesse, il sous-estime énormément.
  **Sans ancre fiable, la règle ne fait rien** : un historique incomplet garde le
  comportement d'avant.
- **Preuve** : au moins une série loggée dans ce contexte. Une première séance ne
  change jamais la charge du programme.
- **Stimulus** : RPE ≤ 7,5 **et** reps sorties. Au-delà, la barre n'est plus
  rapide — on plafonne à la charge portée et on le dit. C'est la limite entre
  « charge trop facile pour produire le stimulus » et « monter jusqu'à ce que le
  RPE devienne élevé ».
- **Palier** : chaque séance reste sous le saut maximal prudent. Jamais un bond
  sur une seule performance.
- **Plafond** : au-dessus de la bande, la charge est ramenée dedans. Un bloc
  vitesse ne devient jamais un bloc lourd.

Tout le réglage vit dans `COACH_MOVEMENT_TUNING.speedStimulus`. Garde-fou :
`dev/phase2_fable5_checks.js`.

#### Vitesse de progression — mesurée, pas déclarée (depuis V4.5.58)

La vitesse de progression **ne se déclare plus**. Elle se mesure, parce que le
moteur l'observe déjà : Brain tient une `ambition` par mouvement et intention,
qui monte quand ses prédictions se révèlent trop prudentes et descend quand elles
se révèlent trop ambitieuses. Un curseur libre qui ignorait cette mesure était un
second avis sur la même question.

```txt
facteur de saut = vitesse MESURÉE  ×  biais DÉCLARÉ
```

- **Mesurée** — `coachObservedAggressiveness(label)` agrège l'`ambition` de toutes
  les intentions du mouvement, pondérée par le nombre de prédictions testées. En
  dessous de `minObservations`, le facteur est tiré vers 1 au prorata : **on ne
  déduit pas une vitesse de deux séances**, et sans aucune observation il vaut
  exactement 1 — jamais de vitesse inventée.
- **Déclaré** — trois positions seulement : `prudent` · `normal` · `ambitieux`.
  Le choix n'est plus « à quelle vitesse je progresse » mais « penche plutôt d'un
  côté ou de l'autre de ce que tu observes ».

Deux invariants :

- Un profil antérieur porte un nombre libre dans [0,4 ; 1,8]. Il est ramené **à la
  lecture** à la position la plus proche. Le stockage n'est jamais réécrit, donc
  **aucune migration** n'est requise et un export ancien reste importable.
- Les bornes finales [0,4 ; 1,8] s'appliquent au **produit**, inchangées.

Tout réglage de cette traduction vit dans `progressionSpeed`
(`scripts/charge/movement_tuning.js`), jamais en dur dans une fonction.

#### Le portail Brain amortit, il ne gèle pas (depuis V4.5.59)

Le portail de confiance (`coachBrainApplyStatsGate`) retient une hausse que Brain
ne sait pas encore justifier. Deux règles l'encadrent :

- **Il amortit, il n'annule pas.** Un gel complet enferme les charges légères :
  la confiance grandit avec les observations, et une charge gelée n'en produit
  aucune. Le garde-fou se refermait sur lui-même — mesuré sur les dix profils
  simulés, 10 courbes sur 51 restaient figées, toutes chez les trois athlètes
  les plus légers.
- **Il ne descend jamais sous ce que le RPE a mérité.** `coachRpeEarnedLoad()`
  définit ce plancher une seule fois : dernière charge + échelon RPE, corrigé
  par la réactivité, borné par le saut maximal. La règle qui propose et le
  portail qui arbitre lisent la même définition. Sans ce plancher, la confiance
  statistique effacerait le signal le plus direct dont dispose le moteur.

Le portail s'applique aux décisions `ok` **et** `watch`. Il est exclu sur
`warning` et `critical` : un frein dur a déjà réduit la charge.

Un plancher mérité n'existe pas après un échec (0 rep sorti) ni sur un mouvement
en `recalibrating` / `watch` / `failed` : la liste est celle du plancher de
validation.

#### Le saut maximal est borné deux fois (depuis V4.5.59)

Un plafond purement absolu se trompe aux deux extrémités :

```txt
+10 lb à 225 lb  →  prudent
+10 lb à 2,5 lb  →  +400 %
```

Le saut est donc borné en absolu (`maxJumpBase`) **et** en relatif
(`relativeCeiling`, 15 %), avec un plancher égal à l'écart **réel** jusqu'au cran
suivant du rack — jamais au pas nominal. Un plafond plus petit que le plus petit
mouvement possible fige le mouvement au lieu de le protéger ; c'est l'erreur
symétrique et elle est tout aussi grave.

### 5. Une semaine de deload se déclare (depuis V4.5.68)

Un deload ne se déduit **jamais** d'un numéro de semaine. Il se déclare, dans
l'un de ces trois endroits, et le moteur les lit tous les trois :

```txt
weekLabels / weekGoals du programme   → « S7 Deload », « récupération », « facile »
note / titre / kind du bloc           → intention `recovery` ou `light`
contexte de la séance                 → ctx.isRecovery · ctx.isLight
```

`coachIsDeloadWeekOrContext()` ouvrait sur `if(weekNum===6) return true;` —
vestige de l'époque où l'app ne portait qu'un seul cycle de six semaines. Sur un
catalogue de 42 programmes de 1 à 16 semaines, ce raccourci déclenchait un
**deload fantôme en S6 sur 14 programmes**, dont « S6 Rotation B max » de
`phase2_fable5` (semaine de 3RM) cappée à 85 % de la dernière référence.

Les 19 programmes dont la S6 est un vrai deload le déclarent tous dans leur
libellé : la lecture de libellé rendait le hardcode redondant **et** nuisible.

### 6. Un pourcentage n'est pas une charge (depuis V4.5.68)

`parseLoad()` attrape le premier nombre d'un texte de charge. Une charge écrite
`"75-82 %"` valait donc **75 lb** — puis était encore multipliée par le ratio de
profil. 39 charges du catalogue sont écrites en pourcentage.

Un pourcentage est une **cible relative** ; il ne devient une charge qu'une fois
résolu contre la capacité réelle de l'athlète :

```txt
athlete_state (ranges.estimated1RM)   ← le travail lourd réel
  → state.movementRefs                ← références de travail saisies
    → PR_FIELD_MAP / profil           ← tests de calibration
      → sinon : RIEN
```

« Sinon : rien » est la partie importante. Sans ancre fiable, la charge repart du
chemin « non numérique » (historique, puis repères d'équipement) — strictement
mieux qu'un nombre de livres inventé, qui deviendrait la première référence
loggée de l'athlète et empoisonnerait tout son historique.

Une charge portant une **unité explicite** (« 60 % (135 lb) ») reste une charge
en livres et suit le chemin habituel.

Un programme peut aussi poser sa cible **en clair** sur l'exercice, ce qui
dispense de toute lecture de phrase :

```js
{ name:"Back Squat", format:"6×2", load:"—", pctOf1RM: 0.60, note:"…" }
```

C'est la forme à préférer pour tout nouveau programme. La lecture par regex reste
le repli pour les programmes existants.

Garde-fou d'hygiène : `dev/phase2_fable5_checks.js` balaie le catalogue entier et
échoue si **une seule** charge en pourcentage retombe sur `parseLoad()`.

## Garde-fous obligatoires

Avant une release qui touche aux charges, exécuter :

```bash
node dev/regression_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/phase2_fable5_checks.js
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

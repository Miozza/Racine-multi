# Trace avant / après — 28 août 2026

Comparaison des deux traces de cycle produites par `dev/charge_replay_phase2.js`
sur **la même fixture** (`dev/fixtures/charge_replay_athlete.json`), programme
`phase2_fable5`, 8 semaines, 112 occurrences :

- `docs/audit/2026-08-28-trace-avant.json` — moteur au commit d'audit `0c1a268`
- `docs/audit/2026-08-28-trace-apres.json` — moteur après les Phases 2 et 3

Le script est le même des deux côtés (copié dans un worktree du commit de base).
Il **échoue** sur le moteur d'avant, il **passe** sur celui d'après.

> **Rappel de méthode.** La trace réelle de Bertin n'a jamais été fournie à la
> session (introuvable sur tout le disque). Les ratios de la fixture sont
> **reconstitués** depuis les rapports `chargeMiseAEchelle / chargeLue` cités
> dans les constats, et l'historique reproduit les charges, reps et RPE que ces
> constats résument. Les chiffres ci-dessous valent **pour cette fixture**, pas
> pour les données de l'athlète.

---

## 1. Ce qui change

**19 occurrences sur 112** voient leur suggestion changer.

| Mouvement | Occ. | Avant → après | Pourquoi |
|---|---|---|---|
| Power Clean | 6 | **125 → 135** | `EMOM` ne déclare plus un contexte WOD ; la cible passe de 8 à 2 reps |
| Pendlay Row | 3 | **250 → 185** (S6 : 210) | ratio emprunté 1,60 borné à 1,20 |
| Close-Grip Bench Press | 3 | **215 → 185** | plafonné par l'évidence loggée |
| Weighted Pull-up | 4 | **30 → 25** (S8 : 35) | ratio emprunté borné |
| One-Arm DB Row | 2 | **85 → 65** | ratio emprunté borné |
| Strict Press | 1 | **165 → 120** | plafonné par l'évidence loggée |

Aucune de ces baisses n'est silencieuse : chacune sort en sévérité `watch` ou
`warning` avec une raison qui nomme l'emprunt ou l'évidence.

## 2. Les six indicateurs

| Indicateur | Avant | Après |
|---|---|---|
| Figés sur le cycle | 5 mouvements, **dont Power Clean = 125 lb** | 4, **Power Clean n'y est plus** |
| 0 ligne retenue malgré un historique stocké | **3 / 64** | **0 / 64** |
| Écart de reps détecté et exposé | **0** | **16 occurrences** |
| Deux bornes de fourchette dans la trace | absentes | présentes |
| Face Pull 18-20 reps sur cible 15-20 | lu comme un dépassement | **lu « dans la cible »** |
| Pendlay Row en 5×5 | **250 lb** | **185 lb** |

## 3. Le cas de référence — Power Clean

Simulation **séquentielle** (`dev/charge_replay_phase2.js`), 4 reps @ RPE 7 là
où le programme en demande 2 :

```
                          S1     S2     S3     S4     S5     S6
il SUIT la suggestion    135 -> 145 -> 155 -> 165 -> 175 -> 185     (identique avant/après)
il GARDE ses 125 lb
   AVANT                 135 -> 125 -> 125 -> 125 -> 125 -> 125
   APRÈS                 135 -> 135 -> 135 -> 135 -> 135 -> 135
```

**C'est la ligne du bas qui compte, et c'est la seule qui sépare les deux
moteurs.** Quand l'athlète suit la suggestion, l'échelon RPE suffisait déjà : les
deux versions montent pareil, et prétendre le contraire serait malhonnête.

Le vrai défaut était ailleurs : quand l'athlète **garde sa charge** — le cas
réel — l'ancien moteur proposait 135 une fois, puis **retombait à 125 et y
restait**. Le nouveau tient sa proposition semaine après semaine.

Il plafonne à 135 et n'ira pas à 145 : le saut maximal prudent depuis 125 vaut
un cran, et l'athlète n'a jamais validé 135. C'est le contrat de progression, et
c'est voulu — la suggestion est une invitation, pas une extrapolation.

---

## 4. Les attendus NON tenus

Quatre attendus de la Phase 4 ne sont pas atteints. Aucun seuil n'a été ajusté
pour les faire passer.

### 4.1 « Pause Back Squat, Back Squat, DB RDL ne restent plus figés » — **NON, et c'est structurel**

Mesuré : Pause Back Squat reste figé ; Back Squat et DB RDL ne « varient » qu'à
la semaine 8, parce que leur contexte change (test / deload), pas parce que la
suggestion progresse.

**Une trace de cycle ne peut pas montrer ça.** Elle rejoue le même historique
pour les 8 semaines (`trace.js:210-235`) : la seule chose qui y varie est la
charge écrite et le contexte. Une suggestion qui grimpe semaine après semaine
demande que les séances soient **loggées** — c'est ce que montre la simulation
séquentielle du § 3, et c'est là qu'il faut regarder.

L'attendu était donc formulé contre un artefact de la trace. Je ne l'ai pas
contourné en changeant la mesure : je le signale.

### 4.2 « La proportion dans la fourchette écrite dépasse nettement 29/90 » — **NON : 33/58 → 30/58, en baisse**

Elle a **baissé**, et c'est cohérent avec ce qui a été corrigé.

Les 28 occurrences hors fourchette portent toutes une raison nommée. Elles se
répartissent en deux familles, et **aucune n'est un défaut** :

- **l'historique de l'athlète est au-dessus de la fourchette** — Pause Back Squat
  175 lb contre une bande 140-148, DB RDL 85 contre 55-59, Back Squat 160 contre
  125-134. Le suivre ferait *baisser* des charges qu'il sort déjà proprement ;
- **le moteur refuse un ratio gonflé** — Strict Press 130 contre 145-155,
  Close-Grip Bench 185 contre 215-225. C'est exactement
  `coachRuleProgramScaleGuard`, et c'est la correction demandée.

Cet indicateur mesure la **conformité à la rampe écrite**. Ce n'est pas
l'objectif : sur un athlète dont les charges réelles sont loin de la rampe, une
proportion plus haute signifierait un moteur *moins* fidèle à ses données. Je le
laisse dans le rapport parce qu'il était demandé, mais je ne le considère pas
comme un critère de qualité, et je ne l'ai pas optimisé.

Le retard sur la rampe, lui, est désormais **signalé** (§ Phase 2.2) : 8
occurrences passent en `warning` avec l'écart nommé.

### 4.3 « MAPE du backtest inférieur à 18,1 % » — **non évaluable, et non améliorée ici**

Le 18,1 % vient de la trace absente. Sur cette fixture : **13,0 % avant, 13,0 %
après**, médiane 6,7 % → 8,0 %.

La MAPE n'a donc **pas bougé**, et la médiane s'est légèrement dégradée. Deux
raisons, et je n'en tire pas de victoire :

- le backtest compare la suggestion reconstituée à **la charge que l'athlète a
  effectivement mise**. Or plusieurs corrections font délibérément diverger le
  moteur de cette charge — quand la fixture logge 70 lb sur un Pallof Press
  décrit comme léger, proposer 40 lb *augmente* l'erreur du backtest tout en
  étant le bon comportement ;
- 66 points sur une fixture reconstituée ne suffisent pas à départager deux
  moteurs à 1 point de MAPE près.

**Conclusion honnête : cette métrique ne mesure pas ce qu'on veut ici.** Pour la
juger, il faut rejouer la vraie trace de Bertin — `dev/charge_replay_phase2.js`
est prêt à le faire dès que le fichier existe.

### 4.4 Le libellé exact attendu par la consigne

La consigne donnait comme raison attendue :

> « Reps au-dessus de la cible : 4 reps pour 2 demandées à 125 lb @RPE 7, deux
> séances de suite. Référence de travail relevée à 145 lb. »

Le moteur produit la même phrase, **mais relève à 135 lb, pas 145**. Le saut
maximal prudent depuis 125 lb vaut un cran de barre. Le contrat existant est
explicite : un surplus de reps rend le moteur *plus prompt à utiliser la marge
existante, il ne l'élargit pas*. Je ne l'ai pas élargi pour atteindre le chiffre
de l'exemple.

---

## 5. Reproduire

```bash
node dev/charge_replay_phase2.js                    # vérifie les six attendus
node dev/charge_replay_phase2.js --out trace.json   # écrit la trace complète
```

Pour rejouer contre la vraie trace exportée de l'app, quand elle sera
disponible : la déposer dans `docs/fixtures/` et comparer mouvement par
mouvement les champs `suggestion.propose`, `programme.echelle` et `ecartReps`.

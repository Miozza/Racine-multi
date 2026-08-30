# Trace avant / après — données réelles

**La trace réelle a été fournie le 30 août** et remplace la reconstitution
utilisée jusque-là. Tout ce document repose désormais sur les données de
l'athlète.

Source : `racine_charge_trace`, V4.6.9, portée `cycle`, programme
`phase2_fable5`, 8 semaines, 112 occurrences, profil Bertin, exportée le
2026-08-27. Extraite dans `dev/fixtures/charge_replay_athlete.json` —
109 séances réelles sur 16 mouvements, avec leurs dates, charges, reps, RPE,
statuts et sources.

## Fidélité du replay

Le replay **reproduit à l'identique les 46 couples `chargeLue → chargeMiseAEchelle`**
de la trace réelle (46/46), et retrouve sa MAPE de backtest au dixième près
(**16,7 % mesuré sur la trace, 16,7 % au replay avant correction**). Il parle
donc bien du même athlète.

**Ce qui ne peut pas être reproduit** : la trace exporte les intentions et
l'équipement du contexte de chaque ligne, mais pas son `blockTitle`, son `kind`
ni son `day` — or `coachMovementContextKey` les utilise. Les contextes sont
reconstruits depuis les blocs réels du programme, comme le fait l'app le jour
de la séance. Les 54 écarts « clé de contexte différente » ne sont donc pas
reproduits un pour un.

---

## 1. L'audit se vérifie sur les vraies données

| Constat (Phase 1) | Annoncé | Mesuré sur la trace réelle |
|---|---|---|
| Facteur d'échelle | 0,81 → 1,67 | **0,815 → 1,667** |
| Face Pull | 1,67 | **1,667** (60 → 100 lb) |
| Pendlay Row en 5×5 | 250 lb | **250 lb** |
| « clé de contexte différente » | 55 | **54** |
| « seed manuel » | 43 | **43** |
| « nature limitée [wod] » | 32 | **32** |
| Front Squat retenu | 0/7 | **0/7** |
| Close-Grip Bench retenu | 0/4 | **0/4** |

Les cinq constats sont confirmés sur les données réelles, aux arrondis près.

---

## 2. Avant / après, mesuré

Même fixture des deux côtés ; le moteur « avant » est celui du commit d'audit
`0c1a268`, exécuté dans un worktree.

| Indicateur | Avant | Après |
|---|---|---|
| 0 ligne retenue malgré un historique stocké | **4 / 94** | **0 / 94** |
| Écart de reps détecté et exposé | **0** | **36 occurrences** |
| Deux bornes de fourchette dans la trace | absentes | présentes |
| Mouvements figés sur le cycle | 9 | 8 |
| MAPE du backtest | 16,7 % | **16,5 %** |
| Médiane | 11,1 % | 11,1 % |
| Dans la fourchette écrite | 22 / 58 | 20 / 58 |

**19 occurrences sur 112** changent de suggestion :

| Mouvement | Occ. | Avant → après | Pourquoi |
|---|---|---|---|
| **Pallof Press** | 6 | **70 → 40 lb** | consigne écrite « léger » enfin lue |
| **Pendlay Row** | 3 | **250 → 185**, 265 → 200, 280 → 210 | ratio emprunté 1,60 borné à 1,20 |
| One-Arm DB Row | 5 | 85 → 75 (S8 : 65) | plafonné par l'évidence loggée |
| Strict Press | 4 | 140 → 145/150, S8 185 → 155 | cible de reps corrigée, évidence |
| Back Squat | 1 | S8 180 → 170 | rampe de référence de travail |

Le cas Pallof Press est exactement celui de la consigne : « bande ou câble
léger » produisait **70 lb**. Il produit maintenant **40 lb**, et la raison le
dit : *« plafonné à 40 lb par le repère d'équipement du programme, pas par ton
profil ni par ton historique (70 lb sinon) »*.

---

## 3. Power Clean — corrigé à moitié, et il faut le dire

C'est le cas qui a ouvert le chantier. Voici l'état exact.

**Ce qui est réparé :**

| | Trace réelle (V4.6.9) | Après |
|---|---|---|
| Contexte | `[wod, technique, strength]` | `[technique, strength]` — **le WOD a disparu** |
| Cible de reps | **8** (repli) | **2** (la vraie) |
| Écart de reps | invisible | **surplus, 5 séances de suite, RPE 8, effet « hausse »** |

**Ce qui ne l'est pas :** la charge du cycle **ne bouge pas** (115 lb avant et
après).

Le bloc reste étiqueté `technique`, parce que sa note dit « **Vitesse** maximale
à charge sous-maximale ». Or un contexte limité coupe `coachRuleRepSurplusLift` :
le signal est **détecté et affiché, mais pas appliqué**.

C'est la même famille de piège que celui déjà documenté dans
`movement_tuning.js` pour le mot « vitesse ». Le détecteur de bloc vitesse est
volontairement étroit — il exige un pourcentage cible écrit, que ce bloc n'a
pas. La table de réglage porte pourtant déjà une entrée
`repsSurplus.byIntent.speed` (converge 0,25) qui est aujourd'hui **inatteignable**,
signe que l'intention d'origine était bien de créditer lentement un bloc
d'effort dynamique.

**Je n'ai pas élargi ce détecteur de ma propre initiative** : le fichier
avertit qu'il « changerait le comportement de la moitié des programmes ».
C'est une décision de programmation, elle revient à l'athlète.

En revanche, la trajectoire séquentielle bouge, parce que la cible de reps est
maintenant juste :

```
tu gardes tes 125 lb, 4 reps là où 2 sont demandées
  AVANT   155 -> 135 -> 135 -> 125 -> 125 -> 125
  APRÈS   155 -> 135 -> 135 -> 135 -> 135 -> 135
```

Avant, le moteur retombait à 125 et y restait. Il tient maintenant sa
proposition.

---

## 4. Les attendus, honnêtement

**Atteints :**

- aucun mouvement à 0 ligne retenue alors que des lignes sont stockées : **4 → 0** ;
- MAPE du backtest **sous 18,1 %** : 16,5 % (mais le point de départ réel était
  déjà 16,7 % — le gain est de **0,2 point**, pas une transformation) ;
- Pendlay Row et Pallof Press corrigés, écart de reps lu et exposé.

**Non atteints :**

- **« Pause Back Squat, Back Squat, DB RDL ne restent plus figés »** — Pause
  Back Squat reste figé ; les deux autres ne varient qu'aux semaines de test et
  de deload. Une trace de cycle rejoue le même historique 8 fois : elle ne peut
  pas montrer une progression semaine après semaine. C'est la simulation
  séquentielle qu'il faut lire.
- **« La proportion dans la fourchette écrite dépasse nettement 29/90 »** — elle
  **baisse** (22/58 → 20/58). Les occurrences hors fourchette portent toutes une
  raison nommée : soit l'historique de l'athlète est au-dessus de la bande, soit
  le moteur refuse un ratio gonflé. Cet indicateur mesure la conformité à la
  rampe écrite, pas la qualité de la suggestion. Non optimisé.
- **Power Clean** — corrigé à moitié, voir § 3.

Aucun seuil n'a été ajusté pour faire passer un chiffre.

---

## 5. Reproduire

```bash
node dev/charge_replay_phase2.js                    # vérifie tous les attendus
node dev/charge_replay_phase2.js --out trace.json   # écrit la trace complète
```

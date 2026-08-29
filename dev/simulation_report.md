# Rapport simulation multi-utilisateurs — Racine V1.16-multi

## Verdict global

- Profils simulés: **10**
- PASS: **7**
- WARN: **3**
- FAIL: **0**
- Programmes couverts: `client_beginner_foundation_2d`, `client_recomposition_3d`, `hypertrophie_fesse_stephanie`, `client_strength_2d`, `client_strength_4d`, `client_rx_crossfit_5d`, `client_metcon_prep_3d`, `strict_muscle_up_10w`, `client_hybrid_performance_3d`, `client_hypertrophy_5d`

Verdict: **WARN contrôlé** — logique exploitable, mais certains profils méritent une surveillance terrain.

## Ce que le simulateur vérifie

**Les suggestions viennent du VRAI moteur** (`scripts/charge/`, via
`coachSafeSuggestedLoad`), et chaque séance simulée lui est renvoyée par
`updateAthleteStateFromResults()` — le flux de production
(`docs/DATA_FLOW_CONTRACT.md`). Ce rapport mesure donc le moteur, pas une
heuristique de test.

- Création de profils très différents via l’onboarding réel.
- Mise à l’échelle des charges de départ par profil.
- Visibilité des programmes publics/privés.
- Construction minimale des blocs de programme.
- Plusieurs semaines de boucle fermée suggestion → séance → athlete_state.
- Freins après RPE élevé ou échec (garde « pas de hausse après RPE ≥ 9 »).
- Respect par le moteur de son propre saut max (`coachMaxJumpForExercise`).
- Regroupement Progression: un mouvement + une date = un point.

## Résultats par profil

### PASS — Débutant très léger

- Profil: `beginner_light`, niveau `debutant`, agressivité `0.65`
- Programme: `client_beginner_foundation_2d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 75 lb · front squat 75 lb · strict press 45 lb · row 70 lb · hinge 125 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Goblet Squat | 5×8 | 20×10 | 7.3 | progression propre (321.1%) |
| Incline DB Press | 3×10 | 8×9 | 7.6 | progression propre (192.5%) |
| Ring Row | 20×8 | 35×8 | 7.7 | progression propre (75%) |
| Hip Thrust | 30×9 | 45×10 | 7.4 | progression propre (53.8%) |
| Strict Press | 5×9 | 5×8 | 6.4 | stable (-2.6%) |

### PASS — Recomposition 3j irrégulier

- Profil: `recomp_intermittent`, niveau `debutant`, agressivité `0.75`
- Programme: `client_recomposition_3d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 110 lb · front squat 100 lb · strict press 70 lb · row 90 lb · hinge 190 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 25×6 | 40×7 | 7.5 | progression propre (64.4%) |
| Incline DB Press | 5×9 | 8×8 | 7.3 | progression propre (46.2%) |
| Hip Thrust | 75×9 | 90×10 | 7.8 | progression propre (23.1%) |
| Ring Row | 35×9 | 50×9 | 7.6 | progression propre (42.9%) |
| DB RDL | 18×8 | 23×9 | 7.7 | progression propre (32%) |

### WARN — Profil fessiers privé

- Profil: `steph_glutes`, niveau `intermediaire`, agressivité `0.9`
- Programme: `hypertrophie_fesse_stephanie`
- Programmes visibles: 32, blocs S1: 8
- Points Progression après dédup: 30
- Charges de départ clés: bench 100 lb · front squat 115 lb · strict press 60 lb · row 95 lb · hinge 230 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Hip Thrust | 120×8 | 130×10 | 7.8 | progression propre (14%) |
| DB RDL | 30×9 | 30×9 | 7.9 | stable (0%) |
| Bulgarian Split Squat | 8×9 | 10×9 | 7.3 | progression propre (33.3%) |
| Goblet Squat | 15×10 | 30×9 | 7.6 | progression propre (95%) |
| Cable Pull Through | 60×10 | 70×10 | 7.8 | progression propre (16.7%) |

**Alertes**
- Bulgarian Split Squat: le moteur dépasse son propre saut max (2.5 lb > 1.1 lb)

### PASS — Force 2j emploi chargé

- Profil: `strength_2d_busy`, niveau `intermediaire`, agressivité `0.95`
- Programme: `client_strength_2d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 185 lb · front squat 165 lb · strict press 115 lb · row 155 lb · hinge 335 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 90×5 | 105×6 | 7.7 | progression propre (20%) |
| Bench Press | 115×5 | 115×7 | 8 | progression propre (5.7%) |
| Deadlift | 180×5 | 180×6 | 8.4 | stable (2.9%) |
| Strict Press | 75×7 | 85×7 | 7.9 | progression propre (13.3%) |
| Barbell Row | 120×8 | 120×9 | 8.4 | stable (2.6%) |

### WARN — Avancé force 4j

- Profil: `advanced_force`, niveau `avance`, agressivité `1.15`
- Programme: `client_strength_4d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 280 lb · front squat 260 lb · strict press 175 lb · row 215 lb · hinge 460 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 220×6 | 175×5 | 8.6 | baisse suspecte (-22.7%) |
| Bench Press | 260×5 | 260×5 | 8.7 | stable (0%) |
| Deadlift | 320×6 | 315×5 | 8.8 | baisse assumée (RPE élevé) (-4.3%) |
| Strict Press | 165×5 | 165×5 | 8.8 | stable lourd (0%) |
| Barbell Row | 210×8 | 210×8 | 8.8 | stable lourd (0%) |

**Alertes**
- Back Squat: baisse suspecte non attendue

### PASS — CrossFit RX 5j

- Profil: `rx_crossfit`, niveau `avance`, agressivité `1.05`
- Programme: `client_rx_crossfit_5d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 245 lb · front squat 230 lb · strict press 150 lb · row 195 lb · hinge 420 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 100×3 | 100×4 | 8.2 | stable (3%) |
| Front Squat | 140×7 | 140×5 | 8.4 | stable (reps variables) (-5.4%) |
| Push Press | 100×6 | 100×5 | 8.4 | stable (-2.8%) |
| Deadlift | 235×4 | 225×6 | 8.9 | stable lourd (1.4%) |
| Pull-Up | 6 reps | 7 reps | 7.9 | stable (16.7%) |

### PASS — Préparation Metcon 3j

- Profil: `metcon_prep`, niveau `intermediaire`, agressivité `0.9`
- Programme: `client_metcon_prep_3d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 165 lb · strict press 110 lb · row 140 lb · hinge 315 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 50×5 | 50×3 | 7.5 | stable (reps variables) (-5.7%) |
| Front Squat | 70×6 | 80×6 | 7.8 | progression propre (14.3%) |
| Push Press | 55×6 | 70×6 | 7.8 | progression propre (27.3%) |
| Deadlift | 145×6 | 150×6 | 8.6 | stable (3.4%) |
| Pull-Up | 7 reps | 6 reps | 8.6 | stable (-14.3%) |

### PASS — Candidat strict muscle-up

- Profil: `strict_mu_candidate`, niveau `avance`, agressivité `0.85`
- Programme: `strict_muscle_up_10w`
- Programmes visibles: 31, blocs S1: 5
- Points Progression après dédup: 50
- Charges de départ clés: bench 220 lb · front squat 190 lb · strict press 135 lb · row 185 lb · hinge 380 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Strict Pull-Up | 6 reps | 7 reps | 8.2 | stable (16.7%) |
| Weighted Pull-Up | 6 reps | 8 reps | 8 | progression propre (33.3%) |
| Ring Dip | 7 reps | 6 reps | 8 | stable (-14.3%) |
| False Grip Row | 9 reps | 9 reps | 8.7 | stable (0%) |
| Transition Drill | 9 reps | 9 reps | 8.7 | stable lourd (0%) |

### PASS — Retour blessure prudent

- Profil: `return_injury`, niveau `intermediaire`, agressivité `0.6`
- Programme: `client_hybrid_performance_3d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 150 lb · strict press 110 lb · row 140 lb · hinge 295 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 60×7 | 70×5 | 8.3 | progression propre (10.4%) |
| Push Press | 55×5 | 65×4 | 8.6 | progression propre (14.8%) |
| Power Clean | 50×4 | 50×4 | 7.9 | stable (0%) |
| Barbell Row | 90×8 | 85×8 | 8.9 | baisse assumée (RPE élevé) (-5.6%) |
| Weighted Pull-up | 7 reps | 5 reps | 9.1 | stable (reps variables) (-28.6%) |

### WARN — Utilisateur données incohérentes

- Profil: `chaos_donnees`, niveau `intermediaire`, agressivité `1.25`
- Programme: `client_hypertrophy_5d`
- Programmes visibles: 31, blocs S1: 6
- Points Progression après dédup: 36
- Charges de départ clés: bench 45 lb · front squat 200 lb · strict press 115 lb · row 320 lb · hinge 335 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Bench Press | 10×10 | 25×9 | 7.6 | progression propre (143.8%) |
| Front Squat | 125×9 | 155×9 | 8 | progression propre (24%) |
| Barbell Row | 120×8 | 245×9 | 8.2 | progression propre (109.5%) |
| Hip Thrust | 390×8 | 395×7 | 9.5 | stable lourd (-1.4%) |
| DB RDL | 35×10 | 15×9 | 7.5 | baisse suspecte (-58.2%) |
| Incline DB Press | 3×10 | 8×8 | 8.3 | progression propre (185%) |

**Alertes**
- Incline DB Press: suggestion au-dessus de la charge échouée à 0 rep (7.5 -> 8) — historique incohérent, à vérifier

## Limites

- Simulation logique seulement: ne remplace pas Safari/iPhone, un vrai cache PWA ni la compréhension d’un utilisateur réel.
- Le moteur est réel, **l’athlète est synthétique**: son adaptation, son bruit de compliance et son RPE sont un modèle. Une tendance douteuse peut venir de l’athlète simulé autant que du moteur — vérifier avant de conclure.
- La “vélocité” simulée correspond à la vitesse de progression charge/e1RM, pas à une vraie mesure VBT en m/s.
- Les résultats générés ne doivent jamais être importés dans `data/` comme historique réel.
- Angle mort connu: une série à 0 rep n’est pas mémorisée par `updateAthleteStateFromResults()` (`if(!hasValidLoad||!reps)return;`), donc la garde « pas de hausse après RPE ≥ 9 » ne peut pas se déclencher sur un échec total.

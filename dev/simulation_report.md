# Rapport simulation multi-utilisateurs — Racine V1.16-multi

## Verdict global

- Profils simulés: **10**
- PASS: **4**
- WARN: **6**
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
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 75 lb · front squat 75 lb · strict press 45 lb · row 70 lb · hinge 125 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Goblet Squat | 5×9 | 5×10 | 6.7 | stable (0%) |
| Incline DB Press | 3×10 | 3×10 | 7 | stable (-2.5%) |
| Ring Row | 20×9 | 15×10 | 7.3 | stable (0%) |
| Hip Thrust | 30×9 | 25×8 | 7.1 | stable (0%) |
| Strict Press | 5×10 | 5×8 | 6.6 | stable (0%) |

### WARN — Recomposition 3j irrégulier

- Profil: `recomp_intermittent`, niveau `debutant`, agressivité `0.75`
- Programme: `client_recomposition_3d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 110 lb · front squat 100 lb · strict press 70 lb · row 90 lb · hinge 190 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 25×5 | 20×7 | 7.3 | progression propre (5.7%) |
| Incline DB Press | 5×9 | 5×9 | 7 | stable (-2.6%) |
| Hip Thrust | 75×10 | 50×10 | 7.5 | baisse suspecte (-11.3%) |
| Ring Row | 35×10 | 30×9 | 7.6 | stable (-2.5%) |
| DB RDL | 18×9 | 15×10 | 7.6 | stable (0%) |

**Alertes**
- Hip Thrust: baisse suspecte non attendue

### PASS — Profil fessiers privé

- Profil: `steph_glutes`, niveau `intermediaire`, agressivité `0.9`
- Programme: `hypertrophie_fesse_stephanie`
- Programmes visibles: 30, blocs S1: 8
- Points Progression après dédup: 30
- Charges de départ clés: bench 100 lb · front squat 115 lb · strict press 60 lb · row 95 lb · hinge 230 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Hip Thrust | 125×8 | 110×10 | 7.8 | progression propre (12%) |
| DB RDL | 30×8 | 25×9 | 7.7 | stable (2.6%) |
| Bulgarian Split Squat | 8×9 | 5×9 | 7.1 | stable (0%) |
| Goblet Squat | 15×9 | 10×10 | 7.2 | stable (0%) |
| Cable Pull Through | 60×9 | 50×9 | 7.7 | stable (2.6%) |

### PASS — Force 2j emploi chargé

- Profil: `strength_2d_busy`, niveau `intermediaire`, agressivité `0.95`
- Programme: `client_strength_2d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 185 lb · front squat 165 lb · strict press 115 lb · row 155 lb · hinge 335 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 95×7 | 85×7 | 7.6 | stable (4.6%) |
| Bench Press | 115×7 | 95×6 | 7.9 | progression propre (5.8%) |
| Deadlift | 185×4 | 145×6 | 8.5 | progression propre (8.7%) |
| Strict Press | 75×6 | 60×6 | 7.7 | stable (0%) |
| Barbell Row | 115×9 | 95×10 | 8.2 | stable (1.7%) |

### WARN — Avancé force 4j

- Profil: `advanced_force`, niveau `avance`, agressivité `1.15`
- Programme: `client_strength_4d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 280 lb · front squat 260 lb · strict press 175 lb · row 215 lb · hinge 460 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 215×6 | 165×5 | 8.4 | baisse suspecte (-4.4%) |
| Bench Press | 255×6 | 220×6 | 8.6 | stable (4.8%) |
| Deadlift | 380×4 | 315×5 | 9.3 | stable lourd (0%) |
| Strict Press | 170×5 | 125×6 | 8.8 | stable lourd (-3.2%) |
| Barbell Row | 225×8 | 170×9 | 8.8 | baisse suspecte (-8.9%) |

**Alertes**
- Back Squat: baisse suspecte non attendue
- Barbell Row: baisse suspecte non attendue

### WARN — CrossFit RX 5j

- Profil: `rx_crossfit`, niveau `avance`, agressivité `1.05`
- Programme: `client_rx_crossfit_5d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 245 lb · front squat 230 lb · strict press 150 lb · row 195 lb · hinge 420 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 100×5 | 70×4 | 7.8 | baisse suspecte (-12.6%) |
| Front Squat | 145×5 | 125×7 | 8.5 | progression propre (6.4%) |
| Push Press | 100×6 | 65×6 | 8.3 | baisse suspecte (-10%) |
| Deadlift | 260×5 | 200×6 | 9 | stable lourd (3.8%) |
| Pull-Up | 6 reps | 6 reps | 8 | progression propre (16.7%) |

**Alertes**
- Power Clean: baisse suspecte non attendue
- Push Press: baisse suspecte non attendue

### WARN — Préparation Metcon 3j

- Profil: `metcon_prep`, niveau `intermediaire`, agressivité `0.9`
- Programme: `client_metcon_prep_3d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 165 lb · strict press 110 lb · row 140 lb · hinge 315 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 55×3 | 40×4 | 7.6 | baisse suspecte (-6.3%) |
| Front Squat | 70×6 | 50×7 | 7.6 | baisse suspecte (-7.1%) |
| Push Press | 50×6 | 40×6 | 7.4 | stable (0%) |
| Deadlift | 140×6 | 130×5 | 8.5 | progression propre (11.3%) |
| Pull-Up | 6 reps | 7 reps | 8.3 | stable (0%) |

**Alertes**
- Power Clean: baisse suspecte non attendue
- Front Squat: baisse suspecte non attendue

### WARN — Candidat strict muscle-up

- Profil: `strict_mu_candidate`, niveau `avance`, agressivité `0.85`
- Programme: `strict_muscle_up_10w`
- Programmes visibles: 29, blocs S1: 5
- Points Progression après dédup: 50
- Charges de départ clés: bench 220 lb · front squat 190 lb · strict press 135 lb · row 185 lb · hinge 380 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Strict Pull-Up | 8 reps | 7 reps | 8 | baisse suspecte (-12.5%) |
| Weighted Pull-Up | 6 reps | 6 reps | 8 | stable (0%) |
| Ring Dip | 7 reps | 7 reps | 8.1 | stable (0%) |
| False Grip Row | 9 reps | 9 reps | 8.6 | stable (0%) |
| Transition Drill | 8 reps | 9 reps | 8.7 | monte cher (12.5%) |

**Alertes**
- Strict Pull-Up: baisse suspecte non attendue
- Transition Drill: progresse mais RPE coûteux (12.5%)

### PASS — Retour blessure prudent

- Profil: `return_injury`, niveau `intermediaire`, agressivité `0.6`
- Programme: `client_hybrid_performance_3d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 150 lb · strict press 110 lb · row 140 lb · hinge 295 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 60×6 | 50×4 | 7.8 | stable (0%) |
| Push Press | 55×5 | 45×6 | 8.1 | stable (-2.9%) |
| Power Clean | 50×4 | 40×3 | 8.1 | stable (0%) |
| Barbell Row | 90×8 | 70×7 | 8.8 | stable lourd (0%) |
| Weighted Pull-up | 6 reps | 6 reps | 9.1 | baisse suspecte (-16.7%) |

### WARN — Utilisateur données incohérentes

- Profil: `chaos_donnees`, niveau `intermediaire`, agressivité `1.25`
- Programme: `client_hypertrophy_5d`
- Programmes visibles: 29, blocs S1: 6
- Points Progression après dédup: 36
- Charges de départ clés: bench 45 lb · front squat 200 lb · strict press 115 lb · row 320 lb · hinge 335 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Bench Press | 15×10 | 25×9 | 8.2 | progression propre (58.3%) |
| Front Squat | 75×9 | 10×10 | 7.1 | baisse suspecte (-72.6%) |
| Barbell Row | 230×9 | 355×7 | 9.3 | monte cher (122.4%) |
| Hip Thrust | 295×8 | 180×10 | 9.3 | baisse suspecte (-23.5%) |
| DB RDL | 90×8 | 23×8 | 8.4 | baisse suspecte (-80.6%) |
| Incline DB Press | 3×8 | 3×8 | 7.7 | progression propre (110.5%) |

**Alertes**
- Barbell Row: progresse mais RPE coûteux (122.4%)

## Limites

- Simulation logique seulement: ne remplace pas Safari/iPhone, un vrai cache PWA ni la compréhension d’un utilisateur réel.
- Le moteur est réel, **l’athlète est synthétique**: son adaptation, son bruit de compliance et son RPE sont un modèle. Une tendance douteuse peut venir de l’athlète simulé autant que du moteur — vérifier avant de conclure.
- La “vélocité” simulée correspond à la vitesse de progression charge/e1RM, pas à une vraie mesure VBT en m/s.
- Les résultats générés ne doivent jamais être importés dans `data/` comme historique réel.
- Angle mort connu: une série à 0 rep n’est pas mémorisée par `updateAthleteStateFromResults()` (`if(!hasValidLoad||!reps)return;`), donc la garde « pas de hausse après RPE ≥ 9 » ne peut pas se déclencher sur un échec total.

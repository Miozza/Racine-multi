# Rapport simulation multi-utilisateurs — Racine V1.16-multi

Généré: 2026-07-08T10:28:47.215Z

## Verdict global

- Profils simulés: **10**
- PASS: **1**
- WARN: **9**
- FAIL: **0**
- Programmes couverts: `client_beginner_foundation_2d`, `client_recomposition_3d`, `hypertrophie_fesse_stephanie`, `client_strength_2d`, `client_strength_4d`, `client_rx_crossfit_5d`, `client_metcon_prep_3d`, `strict_muscle_up_10w`, `client_hybrid_performance_3d`, `client_hypertrophy_5d`

Verdict: **WARN contrôlé** — logique exploitable, mais certains profils méritent une surveillance terrain.

## Ce que le simulateur vérifie

- Création de profils très différents via l’onboarding.
- Mise à l’échelle des charges de départ par profil.
- Visibilité des programmes publics/privés.
- Construction minimale des blocs de programme.
- Plusieurs semaines de résultats simulés avec RPE, charge, reps et e1RM.
- Freins après RPE élevé ou échec.
- Détection des sauts de charge suspects.
- Regroupement Progression: un mouvement + une date = un point.

## Résultats par profil

### PASS — Débutant très léger

- Profil: `beginner_light`, niveau `debutant`, agressivité `0.65`
- Programme: `client_beginner_foundation_2d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 65 lb · front squat 70 lb · strict press 45 lb · row 65 lb · hinge 380 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Goblet Squat | 20×9 | 15×11 | 8.4 | stable (0%) |
| Incline DB Press | 5×10 | 5×10 | 8.4 | stable (0%) |
| Ring Row | 35×8 | 30×10 | 8.4 | stable (2.6%) |
| Hip Thrust | 210×8 | 175×8 | 8.3 | stable (2.8%) |
| Strict Press | 25×9 | 20×8 | 8.3 | stable (2.6%) |

### WARN — Recomposition 3j irrégulier

- Profil: `recomp_intermittent`, niveau `debutant`, agressivité `0.75`
- Programme: `client_recomposition_3d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 135 lb · front squat 95 lb · strict press 65 lb · row 85 lb · hinge 540 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 55×4 | 45×8 | 8.3 | stable (1.6%) |
| Incline DB Press | 18×8 | 20×9 | 8.6 | progression propre (25.2%) |
| Hip Thrust | 350×10 | 270×11 | 8.4 | baisse suspecte (-10.1%) |
| Ring Row | 55×9 | 45×9 | 8.5 | stable (-2.6%) |
| DB RDL | 75×9 | 70×10 | 8.5 | stable (0.7%) |

**Alertes**
- Hip Thrust: saut possiblement agressif 25 lb
- Hip Thrust: baisse suspecte non attendue

### WARN — Profil fessiers privé

- Profil: `steph_glutes`, niveau `intermediaire`, agressivité `0.9`
- Programme: `hypertrophie_fesse_stephanie`
- Programmes visibles: 33, blocs S1: 7
- Points Progression après dédup: 30
- Charges de départ clés: bench 90 lb · front squat 110 lb · strict press 55 lb · row 90 lb · hinge 700 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Hip Thrust | 520×7 | 490×10 | 8.4 | progression propre (8.7%) |
| DB RDL | 115×8 | 98×9 | 8.3 | stable (2.6%) |
| Bulgarian Split Squat | 18×9 | 15×10 | 8.3 | stable (0%) |
| Goblet Squat | 35×8 | 30×10 | 8.5 | stable (2.6%) |
| Cable Pull Through | 80×9 | 70×9 | 8.3 | stable (2.6%) |

**Alertes**
- Hip Thrust: saut possiblement agressif 15 lb
- Hip Thrust: saut possiblement agressif 15 lb
- Hip Thrust: saut possiblement agressif 15 lb

### WARN — Force 2j emploi chargé

- Profil: `strength_2d_busy`, niveau `intermediaire`, agressivité `0.95`
- Programme: `client_strength_2d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 160 lb · strict press 105 lb · row 145 lb · hinge 970 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 140×7 | 125×7 | 8.4 | stable (1.7%) |
| Bench Press | 145×7 | 125×6 | 8.4 | stable (4%) |
| Deadlift | 825×4 | 705×5 | 8.5 | progression propre (12.1%) |
| Strict Press | 85×6 | 70×7 | 8.1 | baisse suspecte (-5.9%) |
| Barbell Row | 115×9 | 100×11 | 8.3 | stable (1.7%) |

**Alertes**
- Deadlift: saut possiblement agressif 25 lb
- Deadlift: saut possiblement agressif 25 lb
- Strict Press: baisse suspecte non attendue

### WARN — Avancé force 4j

- Profil: `advanced_force`, niveau `avance`, agressivité `1.15`
- Programme: `client_strength_4d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 265 lb · front squat 245 lb · strict press 165 lb · row 205 lb · hinge 1350 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 205×7 | 165×5 | 8.4 | baisse suspecte (-4.8%) |
| Bench Press | 210×7 | 190×6 | 8.3 | stable (1.4%) |
| Deadlift | 1075×4 | 980×5 | 8.3 | progression propre (6.8%) |
| Strict Press | 135×5 | 105×6 | 8.5 | stable (1.8%) |
| Barbell Row | 165×9 | 135×11 | 8.2 | baisse suspecte (-11.4%) |

**Alertes**
- Back Squat: baisse suspecte non attendue
- Deadlift: saut possiblement agressif 35 lb
- Deadlift: saut possiblement agressif 30 lb
- Barbell Row: baisse suspecte non attendue

### WARN — CrossFit RX 5j

- Profil: `rx_crossfit`, niveau `avance`, agressivité `1.05`
- Programme: `client_rx_crossfit_5d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 230 lb · front squat 215 lb · strict press 140 lb · row 185 lb · hinge 1215 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 110×5 | 80×4 | 8.1 | baisse suspecte (-14.3%) |
| Front Squat | 150×4 | 135×7 | 8.8 | monte cher (9.4%) |
| Push Press | 95×7 | 65×6 | 8.3 | baisse suspecte (-10.5%) |
| Deadlift | 825×6 | 675×7 | 8.3 | stable (3%) |
| Pull-Up | 6 reps | 5 reps | 8 | progression propre (16.7%) |

**Alertes**
- Power Clean: baisse suspecte non attendue
- Front Squat: progresse mais RPE coûteux (9.4%)
- Push Press: baisse suspecte non attendue
- Deadlift: saut possiblement agressif 45 lb

### WARN — Préparation Metcon 3j

- Profil: `metcon_prep`, niveau `intermediaire`, agressivité `0.9`
- Programme: `client_metcon_prep_3d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 165 lb · front squat 155 lb · strict press 105 lb · row 135 lb · hinge 920 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 85×2 | 75×4 | 8.5 | stable (3.1%) |
| Front Squat | 105×6 | 75×8 | 8.3 | baisse suspecte (-11.9%) |
| Push Press | 65×6 | 65×6 | 8.2 | progression propre (12.2%) |
| Deadlift | 600×7 | 605×5 | 8.5 | progression propre (8%) |
| Pull-Up | 5 reps | 8 reps | 8.3 | stable (0%) |

**Alertes**
- Front Squat: baisse suspecte non attendue
- Deadlift: saut possiblement agressif 35 lb
- Deadlift: saut possiblement agressif 20 lb
- Deadlift: saut possiblement agressif 25 lb
- Deadlift: saut possiblement agressif 25 lb

### WARN — Candidat strict muscle-up

- Profil: `strict_mu_candidate`, niveau `avance`, agressivité `0.85`
- Programme: `strict_muscle_up_10w`
- Programmes visibles: 32, blocs S1: 5
- Points Progression après dédup: 50
- Charges de départ clés: bench 210 lb · front squat 180 lb · strict press 130 lb · row 175 lb · hinge 1105 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Strict Pull-Up | 8 reps | 7 reps | 8 | baisse suspecte (-12.5%) |
| Weighted Pull-Up | 5 reps | 6 reps | 8 | progression propre (20%) |
| Ring Dip | 8 reps | 7 reps | 8.1 | baisse suspecte (-12.5%) |
| False Grip Row | 9 reps | 10 reps | 8.6 | progression propre (11.1%) |
| Transition Drill | 8 reps | 10 reps | 8.7 | monte cher (25%) |

**Alertes**
- Strict Pull-Up: baisse suspecte non attendue
- Ring Dip: baisse suspecte non attendue
- Transition Drill: progresse mais RPE coûteux (25%)

### WARN — Retour blessure prudent

- Profil: `return_injury`, niveau `intermediaire`, agressivité `0.6`
- Programme: `client_hybrid_performance_3d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 165 lb · front squat 145 lb · strict press 105 lb · row 135 lb · hinge 835 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 105×6 | 95×4 | 8.9 | stable lourd (0%) |
| Push Press | 75×4 | 70×6 | 8.9 | monte cher (6.7%) |
| Power Clean | 80×3 | 70×3 | 9.1 | stable lourd (3%) |
| Barbell Row | 95×8 | 75×7 | 9 | stable lourd (-2.8%) |
| Weighted Pull-up | 6 reps | 7 reps | 9.1 | baisse suspecte (-16.7%) |

**Alertes**
- Push Press: progresse mais RPE coûteux (6.7%)
- Power Clean: saut possiblement agressif 5 lb

### WARN — Utilisateur données incohérentes

- Profil: `chaos_donnees`, niveau `intermediaire`, agressivité `1.25`
- Programme: `client_hypertrophy_5d`
- Programmes visibles: 32, blocs S1: 6
- Points Progression après dédup: 36
- Charges de départ clés: bench 45 lb · front squat 185 lb · strict press 140 lb · row 295 lb · hinge 360 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Bench Press | 45×9 | 75×5 | 9.6 | monte cher (29.6%) |
| Front Squat | 90×10 | 15×12 | 7.2 | baisse suspecte (-65%) |
| Barbell Row | 275×9 | 430×5 | 9.5 | monte cher (97.4%) |
| Hip Thrust | 300×9 | 210×10 | 9.2 | baisse suspecte (-20%) |
| DB RDL | 88×8 | 28×8 | 8.5 | baisse suspecte (-73.6%) |
| Incline DB Press | 8×8 | 5×8 | 8.7 | monte cher (5.3%) |

**Alertes**
- Bench Press: saut possiblement agressif 25 lb
- Bench Press: saut possiblement agressif 25 lb
- Bench Press: progresse mais RPE coûteux (29.6%)
- Front Squat: saut possiblement agressif 15 lb
- Barbell Row: saut possiblement agressif 110 lb
- Barbell Row: saut possiblement agressif 125 lb
- Barbell Row: saut possiblement agressif 145 lb
- Barbell Row: progresse mais RPE coûteux (97.4%)
- … 2 autres alertes

## Limites

- Simulation logique seulement: ne remplace pas Safari/iPhone, un vrai cache PWA ni la compréhension d’un utilisateur réel.
- La “vélocité” simulée correspond à la vitesse de progression charge/e1RM, pas à une vraie mesure VBT en m/s.
- Les résultats générés ne doivent jamais être importés dans `data/` comme historique réel.

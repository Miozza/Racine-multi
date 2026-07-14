# Rapport simulation multi-utilisateurs — Racine V1.16-multi

Généré: 2026-07-14T22:05:29.741Z

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
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 75 lb · front squat 75 lb · strict press 45 lb · row 70 lb · hinge 380 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Goblet Squat | 25×9 | 20×11 | 8.4 | stable (0%) |
| Incline DB Press | 8×10 | 8×10 | 8.4 | stable (0%) |
| Ring Row | 40×8 | 35×10 | 8.4 | stable (2.6%) |
| Hip Thrust | 210×8 | 175×8 | 8.3 | stable (2.8%) |
| Strict Press | 25×9 | 20×8 | 8.3 | stable (2.6%) |

### WARN — Recomposition 3j irrégulier

- Profil: `recomp_intermittent`, niveau `debutant`, agressivité `0.75`
- Programme: `client_recomposition_3d`
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 110 lb · front squat 100 lb · strict press 70 lb · row 90 lb · hinge 525 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 60×4 | 45×8 | 8.3 | stable (2.5%) |
| Incline DB Press | 13×8 | 10×10 | 8.3 | stable (-2.6%) |
| Hip Thrust | 340×10 | 260×11 | 8.4 | baisse suspecte (-7.8%) |
| Ring Row | 55×10 | 45×9 | 8.4 | stable (-2.5%) |
| DB RDL | 80×9 | 75×10 | 8.5 | stable (0.5%) |

**Alertes**
- Hip Thrust: saut possiblement agressif 25 lb
- Hip Thrust: baisse suspecte non attendue

### WARN — Profil fessiers privé

- Profil: `steph_glutes`, niveau `intermediaire`, agressivité `0.9`
- Programme: `hypertrophie_fesse_stephanie`
- Programmes visibles: 33, blocs S1: 8
- Points Progression après dédup: 30
- Charges de départ clés: bench 100 lb · front squat 115 lb · strict press 60 lb · row 95 lb · hinge 695 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Hip Thrust | 515×7 | 485×10 | 8.4 | progression propre (8.7%) |
| DB RDL | 123×8 | 110×9 | 8.3 | stable (4.7%) |
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
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 185 lb · front squat 165 lb · strict press 115 lb · row 155 lb · hinge 945 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 150×7 | 135×7 | 8.4 | stable (1.1%) |
| Bench Press | 150×7 | 130×6 | 8.4 | stable (3.8%) |
| Deadlift | 805×4 | 685×5 | 8.5 | progression propre (12.2%) |
| Strict Press | 95×6 | 75×7 | 8.1 | baisse suspecte (-5.3%) |
| Barbell Row | 120×9 | 105×11 | 8.3 | stable (1.5%) |

**Alertes**
- Deadlift: saut possiblement agressif 25 lb
- Deadlift: saut possiblement agressif 25 lb
- Strict Press: baisse suspecte non attendue

### WARN — Avancé force 4j

- Profil: `advanced_force`, niveau `avance`, agressivité `1.15`
- Programme: `client_strength_4d`
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 280 lb · front squat 260 lb · strict press 175 lb · row 215 lb · hinge 1325 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Back Squat | 215×7 | 175×5 | 8.4 | baisse suspecte (-4.5%) |
| Bench Press | 225×7 | 205×6 | 8.3 | stable (0.9%) |
| Deadlift | 1055×4 | 955×5 | 8.3 | progression propre (6.4%) |
| Strict Press | 150×5 | 115×6 | 8.5 | stable (-1.3%) |
| Barbell Row | 170×9 | 135×11 | 8.2 | baisse suspecte (-11.2%) |

**Alertes**
- Back Squat: baisse suspecte non attendue
- Deadlift: saut possiblement agressif 30 lb
- Deadlift: saut possiblement agressif 30 lb
- Barbell Row: baisse suspecte non attendue

### WARN — CrossFit RX 5j

- Profil: `rx_crossfit`, niveau `avance`, agressivité `1.05`
- Programme: `client_rx_crossfit_5d`
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 245 lb · front squat 230 lb · strict press 150 lb · row 195 lb · hinge 1195 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 120×5 | 90×4 | 8.1 | baisse suspecte (-13.6%) |
| Front Squat | 160×4 | 145×7 | 8.8 | monte cher (9.2%) |
| Push Press | 100×7 | 70×6 | 8.3 | baisse suspecte (-10%) |
| Deadlift | 815×6 | 660×7 | 8.3 | stable (2.5%) |
| Pull-Up | 6 reps | 5 reps | 8 | progression propre (16.7%) |

**Alertes**
- Power Clean: baisse suspecte non attendue
- Front Squat: progresse mais RPE coûteux (9.2%)
- Push Press: baisse suspecte non attendue
- Deadlift: saut possiblement agressif 40 lb

### WARN — Préparation Metcon 3j

- Profil: `metcon_prep`, niveau `intermediaire`, agressivité `0.9`
- Programme: `client_metcon_prep_3d`
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 165 lb · strict press 110 lb · row 140 lb · hinge 905 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Power Clean | 90×2 | 80×4 | 8.5 | stable (3.1%) |
| Front Squat | 110×6 | 80×7 | 8.3 | baisse suspecte (-11.2%) |
| Push Press | 70×6 | 70×6 | 8.2 | progression propre (11.1%) |
| Deadlift | 595×7 | 600×4 | 8.5 | progression propre (8.1%) |
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
- Programmes visibles: 33, blocs S1: 5
- Points Progression après dédup: 50
- Charges de départ clés: bench 220 lb · front squat 190 lb · strict press 135 lb · row 185 lb · hinge 1090 lb

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
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 30
- Charges de départ clés: bench 175 lb · front squat 150 lb · strict press 110 lb · row 140 lb · hinge 820 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Front Squat | 110×6 | 100×4 | 8.9 | stable lourd (0%) |
| Push Press | 80×4 | 70×6 | 8.9 | monte cher (6.3%) |
| Power Clean | 85×3 | 70×3 | 9.1 | stable lourd (3%) |
| Barbell Row | 100×8 | 80×7 | 9 | stable lourd (-2.5%) |
| Weighted Pull-up | 6 reps | 7 reps | 9.1 | baisse suspecte (-16.7%) |

**Alertes**
- Push Press: progresse mais RPE coûteux (6.3%)
- Power Clean: saut possiblement agressif 5 lb

### WARN — Utilisateur données incohérentes

- Profil: `chaos_donnees`, niveau `intermediaire`, agressivité `1.25`
- Programme: `client_hypertrophy_5d`
- Programmes visibles: 33, blocs S1: 6
- Points Progression après dédup: 36
- Charges de départ clés: bench 45 lb · front squat 200 lb · strict press 115 lb · row 320 lb · hinge 335 lb

| Mouvement | Début | Fin | RPE moy. | Tendance |
|---|---:|---:|---:|---|
| Bench Press | 45×9 | 75×5 | 9.6 | monte cher (29.6%) |
| Front Squat | 95×10 | 15×12 | 7.2 | baisse suspecte (-66.8%) |
| Barbell Row | 300×9 | 475×5 | 9.5 | monte cher (98.9%) |
| Hip Thrust | 275×9 | 190×10 | 9.2 | baisse suspecte (-20%) |
| DB RDL | 88×8 | 28×8 | 8.5 | baisse suspecte (-73.6%) |
| Incline DB Press | 8×8 | 5×8 | 8.7 | monte cher (5.3%) |

**Alertes**
- Bench Press: saut possiblement agressif 25 lb
- Bench Press: saut possiblement agressif 25 lb
- Bench Press: progresse mais RPE coûteux (29.6%)
- Front Squat: saut possiblement agressif 15 lb
- Barbell Row: saut possiblement agressif 120 lb
- Barbell Row: saut possiblement agressif 140 lb
- Barbell Row: saut possiblement agressif 160 lb
- Barbell Row: progresse mais RPE coûteux (98.9%)
- … 2 autres alertes

## Limites

- Simulation logique seulement: ne remplace pas Safari/iPhone, un vrai cache PWA ni la compréhension d’un utilisateur réel.
- La “vélocité” simulée correspond à la vitesse de progression charge/e1RM, pas à une vraie mesure VBT en m/s.
- Les résultats générés ne doivent jamais être importés dans `data/` comme historique réel.

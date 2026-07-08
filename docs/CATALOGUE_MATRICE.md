# Matrice de couverture du catalogue public

Générée avec V4.4 (La Saison, étape 1). Cases = ids de programmes publics par
objectif × jours/semaine. Les trous restent vides volontairement (spec v2 :
« les cases sans utilisateur réel restent vides et documentées ») — tout
nouveau programme exige la validation du coach avant publication.

| Objectif | 2 j | 3 j | 4 j | 5 j+ |
| --- | --- | --- | --- | --- |
| débutant | client_beginner_foundation_2d | client_beginner_foundation_3d | — | — |
| hypertrophie | general_hypertrophy_2d | general_hypertrophy_3d, hypertrophie_fesse¹ | client_hypertrophy_4d, hypertrophy_base | client_hypertrophy_5d, arnold_split_strict (6 j) |
| force | client_strength_2d | general_strength_3d | client_strength_4d, strength, force_performance | — |
| recomposition | client_recomposition_2d | client_recomposition_3d | client_recomposition_4d | — |
| force + moteur (hybride) | — | client_hybrid_performance_3d | client_hybrid_performance_4d | client_hybrid_performance_5d |
| haltéro crossfit | — | client_haltero_crossfit_3d | client_haltero_crossfit_4d | client_haltero_crossfit_5d |
| performance RX | — | — | client_rx_crossfit_4d, competition_peak | client_rx_crossfit_5d |
| préparation metcon | client_metcon_prep_2d | client_metcon_prep_3d | client_metcon_prep_4d | — |
| strict muscle-up | — | — | strict_muscle_up_10w | — |
| transition (deload / tests) | — | transition_deload_3d, transition_tests_3d² | — | — |

¹ `hypertrophie_fesse` est un bloc de 4 jours ciblé fessiers (spécialisation, pas un généraliste).
² Ajoutés par l'étape 1 de La Saison (micro-cycles structurels prévus par le spec).

## Trous identifiés (à combler seulement si un utilisateur réel s'y trouve)

- **Débutant 4-5 j** : rare (un débutant devrait commencer à 2-3 j) — trou assumé, non prioritaire.
- **Force 5 j** : pertinent pour un utilisateur force avancé — candidat n°1 à la création si un ami est dans ce cas.
- **Recomposition 5 j** : possible mais inhabituel — attendre la demande.
- **Hybride 2 j** : demande plausible (temps très limité + envie de variété) — candidat n°2.
- **Haltéro crossfit 2 j** : peu cohérent avec l'objectif — trou assumé.

## Graphe `suggestedNext` (résumé des chemins principaux)

- Débutant → Hypertrophie/Force/Recomposition (même fréquence)
- Hypertrophie → Force (même fréquence) → Hybride → Haltéro CrossFit → RX → competition_peak
- Recomposition ⇄ Hypertrophie/Force (même fréquence)
- Metcon prep → Haltéro CrossFit → RX
- strict_muscle_up_10w → Haltéro CrossFit / Hybride 4 j
- La semaine deload n'est jamais un successeur : elle est insérée par le signal de fatigue du moteur de suggestion.

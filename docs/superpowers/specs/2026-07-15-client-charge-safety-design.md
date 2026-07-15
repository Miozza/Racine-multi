# SÃ©curisation des charges client avant distribution

## Objectif

EmpÃªcher qu'un profil client non calibrÃ©, une donnÃ©e invraisemblable ou un rÃ©glage manuel soit interprÃ©tÃ© comme une charge personnalisÃ©e fiable par CoachCharge ou Brain. La correction reste ciblÃ©e : elle ne crÃ©e pas un nouveau moteur, ne rend pas Brain plus agressif et ne modifie aucun fichier de donnÃ©es durable.

## PortÃ©e

- Ajouter une garde explicite `coachProfileNeedsCalibration()` dans le chemin central de suggestion. Un profil client existant mais non onboardÃ© ou sans `scaleRatios` reÃ§oit un blocage explicite : Â« Profil non calibrÃ© : complÃ¨te la calibration avant dâ€™utiliser les charges suggÃ©rÃ©es. Â» Les migrations sans profil continuent Ã  utiliser le comportement compatible existant.
- Centraliser `coachIsNonPerformanceSeed(row)` afin d'exclure `manual_recalibration` et `manual_charge_override` de tous les historiques qui pilotent une progression, une moyenne, une tendance ou un signal Brain. Les overrides restent une configuration locale et ne deviennent jamais une sÃ©ance rÃ©elle.
- Appliquer le ratio utilisateur au seed utilisÃ© par le filtre de vraisemblance, puis marquer les donnÃ©es rÃ©ellement aberrantes avec `implausible` et `implausibleReason` au lieu de supprimer leur charge ou leur rÃ©fÃ©rence. Les filtres de progression ignorent ce marquage, l'historique reste rÃ©cupÃ©rable.
- Introduire un formatteur de sortie final unique pour les suggestions numÃ©riques, utilisÃ© par la dÃ©cision gardÃ©e et par le chemin Brain. Il prÃ©serve unitÃ©, `/ main`, poids du corps, avertissements et suggestion de rÃ©pÃ©titions.
- Lors de la rÃ©initialisation des charges personnalisÃ©es, retirer uniquement les lignes d'historique et les Ã©tats de capacitÃ© ayant `planned.source === "manual_charge_override"`; les sÃ©ances rÃ©elles restent intactes.
- Ajouter un test dÃ©diÃ© couvrant les cinq scÃ©narios de sÃ©curitÃ©, dont une exÃ©cution de `client_hypertrophy_5d` garantissant que `racine_client_programs.js` prÃ©serve sa pÃ©riodisation sans appeler `charge()` dans `ex()`.

## Limites et compatibilitÃ©

- Aucun changement Ã  `data/resultats.json`, `data/athlete_state.json`, `data/cycle_state.json` ou `data/charges.js`.
- Aucun changement aux programmes client Ã  part un test statique/de non-rÃ©gression.
- Le chemin legacy `b.progress` est seulement recherchÃ© et documentÃ© s'il n'alimente pas les programmes client. Une refonte n'est autorisÃ©e que s'il est effectivement utilisÃ© et ne respecte pas les gardes de CoachCharge.
- Les vues PC, WOD+, diagnostic, export et saisie rÃ©utilisent dÃ©jÃ  `CoachCharge.suggestLoad`; la garde centrale Ã©vite des correctifs d'affichage dispersÃ©s. Les chemins legacy Ã©ventuels restent explicitement signalÃ©s par le test.

## Ajustement approuvÃ© du programme Arnold Split Strict

- Dans `programs/arnold_split_strict.js`, le lundi `A. Pecs + Dos A` conserve le `Pull-Up` au poids du corps.
- Son deuxiÃ¨me tirage vertical, `Weighted Pull-up`, est remplacÃ© par `Lat Pulldown` avec l'instruction explicite `prise large`.
- `Weighted Pull-up` reste un mouvement distinct et ne doit Ãªtre ni renommÃ© ni retirÃ© des autres programmes, des configurations ou de la calibration existante.
- Ajouter une entrÃ©e de mouvement distincte `Lat Pulldown` dans `programs/config.js`, sans modifier l'entrÃ©e existante de `Weighted Pull-up`.
- Ajouter le tutoriel `Lat Pulldown` et son profil de mouvement cÃ¢ble, sans modifier les tutoriels ni le profil Brain de `Weighted Pull-up`.
- Ajouter ou ajuster un test de programme pour garantir que ce jour contient exactement un Pull-Up et un Lat Pulldown prise large, sans Weighted Pull-up, tout en vÃ©rifiant que Weighted Pull-up reste enregistrÃ© comme mouvement indÃ©pendant.

## VÃ©rification

- Nouveau `node dev/client_charge_safety_checks.js` : profil non calibrÃ©, seed lÃ©ger mis Ã  l'Ã©chelle, donnÃ©es invraisemblables non dÃ©truites, override manuel exclu de Brain et neutralisÃ© par reset, format DB `/ main`, pÃ©riodisation client non Ã©crasÃ©e.
- ExÃ©cuter les validations demandÃ©es disponibles : `charge_engine_checks`, `progression_contract_checks`, `simulate_users`, `simulate_multi_users`, `prescription_checks` et `crossfit_quality_checks`.
- ExÃ©cuter aussi les garde-fous multi-profil et catalogue pertinents si leur surface touche les changements.

## Risque restant assumÃ©

Si aucun programme rÃ©el ne contient `b.progress`, ce chemin n'est pas modifiÃ© : un garde-fou documentera qu'il ne doit pas servir aux programmes client sans passer par CoachCharge. Ce risque restera mentionnÃ© dans la PR.


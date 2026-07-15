# Sécurisation des charges client avant distribution

## Objectif

Empêcher qu'un profil client non calibré, une donnée invraisemblable ou un réglage manuel soit interprété comme une charge personnalisée fiable par CoachCharge ou Brain. La correction reste ciblée : elle ne crée pas un nouveau moteur, ne rend pas Brain plus agressif et ne modifie aucun fichier de données durable.

## Portée

- Ajouter une garde explicite `coachProfileNeedsCalibration()` dans le chemin central de suggestion. Un profil client existant mais non onboardé ou sans `scaleRatios` reçoit un blocage explicite : « Profil non calibré : complète la calibration avant d’utiliser les charges suggérées. » Les migrations sans profil continuent à utiliser le comportement compatible existant.
- Centraliser `coachIsNonPerformanceSeed(row)` afin d'exclure `manual_recalibration` et `manual_charge_override` de tous les historiques qui pilotent une progression, une moyenne, une tendance ou un signal Brain. Les overrides restent une configuration locale et ne deviennent jamais une séance réelle.
- Appliquer le ratio utilisateur au seed utilisé par le filtre de vraisemblance, puis marquer les données réellement aberrantes avec `implausible` et `implausibleReason` au lieu de supprimer leur charge ou leur référence. Les filtres de progression ignorent ce marquage, l'historique reste récupérable.
- Introduire un formatteur de sortie final unique pour les suggestions numériques, utilisé par la décision gardée et par le chemin Brain. Il préserve unité, `/ main`, poids du corps, avertissements et suggestion de répétitions.
- Lors de la réinitialisation des charges personnalisées, retirer uniquement les lignes d'historique et les états de capacité ayant `planned.source === "manual_charge_override"`; les séances réelles restent intactes.
- Ajouter un test dédié couvrant les cinq scénarios de sécurité, dont une exécution de `client_hypertrophy_5d` garantissant que `racine_client_programs.js` préserve sa périodisation sans appeler `charge()` dans `ex()`.

## Limites et compatibilité

- Aucun changement à `data/resultats.json`, `data/athlete_state.json`, `data/cycle_state.json` ou `data/charges.js`.
- Aucun changement aux programmes client à part un test statique/de non-régression.
- Le chemin legacy `b.progress` est seulement recherché et documenté s'il n'alimente pas les programmes client. Une refonte n'est autorisée que s'il est effectivement utilisé et ne respecte pas les gardes de CoachCharge.
- Les vues PC, WOD+, diagnostic, export et saisie réutilisent déjà `CoachCharge.suggestLoad`; la garde centrale évite des correctifs d'affichage dispersés. Les chemins legacy éventuels restent explicitement signalés par le test.

## Ajustement approuvé du programme Arnold Split Strict

- Dans `programs/arnold_split_strict.js`, le lundi `A. Pecs + Dos A` conserve le `Pull-Up` au poids du corps.
- Son deuxième tirage vertical, `Weighted Pull-up`, est remplacé par `Lat Pulldown` avec l'instruction explicite `prise large`.
- Ajouter ou ajuster un test de programme pour garantir que ce jour contient exactement un Pull-Up et un Lat Pulldown prise large, sans Weighted Pull-up.

## Vérification

- Nouveau `node dev/client_charge_safety_checks.js` : profil non calibré, seed léger mis à l'échelle, données invraisemblables non détruites, override manuel exclu de Brain et neutralisé par reset, format DB `/ main`, périodisation client non écrasée.
- Exécuter les validations demandées disponibles : `charge_engine_checks`, `progression_contract_checks`, `simulate_users`, `simulate_multi_users`, `prescription_checks` et `crossfit_quality_checks`.
- Exécuter aussi les garde-fous multi-profil et catalogue pertinents si leur surface touche les changements.

## Risque restant assumé

Si aucun programme réel ne contient `b.progress`, ce chemin n'est pas modifié : un garde-fou documentera qu'il ne doit pas servir aux programmes client sans passer par CoachCharge. Ce risque restera mentionné dans la PR.

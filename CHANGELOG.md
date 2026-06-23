# Changelog — Racine multi-utilisateur

## V1.6-multi

Ajout d'un cycle spécialisé sérieux pour strict muscle-up.

- Ajout de `programs/strict_muscle_up_cycle.js`.
- Nouveau programme : `Cycle Strict Muscle-Up — 10 semaines / 4 jours`.
- Objectif : passer d'environ 10 strict pull-ups à un strict muscle-up aux anneaux sans kipping.
- Structure : tirage strict, false grip, transition anneaux, ring dip/support, préhab épaules/coudes, checkpoints et test final.
- Semaines 4 et 8 : déload/checkpoint obligatoires pour réduire le risque tendons/coudes/épaules.
- Semaine 10 : test strict seulement si les critères sont verts; sinon test assisté propre.
- Ajout de `dev/strict_muscle_up_checks.js` pour valider durée, fréquence, règles anti-kipping, variation et présence des blocs indispensables.
- Version harmonisée en `V1.6-multi`.

## V1.5-multi

Correction qualité de la branche sportive CrossFit.

- Refonte de `programs/racine_crossfit_programs.js` pour éviter les séances copiées/collées semaine après semaine.
- Performance RX CrossFit contient maintenant de vrais mouvements RX : chest-to-bar, toes-to-bar, handstand push-up/walk progressions, muscle-up progressions, rope climb, double-under, wall ball, thruster, clean/snatch/jerk cycling, bar-facing burpees et GHD/sit-up selon les semaines.
- Performance RX CrossFit intègre exactement un benchmark connu par semaine : Fran, Grace, Helen, DT, Fight Gone Bad, Cindy.
- Préparation Metcon intègre exactement un metcon connu par semaine : Cindy, Annie, Jackie, Helen, Fight Gone Bad, Christine.
- Les journées de construction varient maintenant par semaine : mouvements, skills, stimulus et WOD changent de S1 à S6.
- Ajout de `dev/crossfit_quality_checks.js` pour vérifier la présence d'un seul benchmark connu par semaine, la variation hebdomadaire et les mouvements RX.
- Version harmonisée en `V1.5-multi`.

## V1.4-multi
## V1.4-multi

Expansion du catalogue client vers les objectifs sportifs.

- Ajout de `programs/racine_crossfit_programs.js`.
- Nouveaux programmes Haltéro CrossFit : 3, 4 et 5 jours/semaine.
- Nouveaux programmes Performance RX CrossFit : 4 et 5 jours/semaine.
- Nouveaux programmes Préparation Metcon : 2, 3 et 4 jours/semaine.
- Mise à jour de `programs/index.js` pour exposer les programmes sportifs dans le catalogue.
- Mise à jour de `index.html` pour charger le nouveau catalogue.
- Mise à jour de `dev/program_catalog_checks.js` : validation des objectifs CrossFit/haltéro/metcon et minimum 20 programmes catalogue.

## V1.3-multi

Refonte prototype viable : durcissement multi-profil et anti-contamination.

- Ajout de `scripts/profiles/reference.js` : les anciens repères deviennent une ancre de calibration, pas des données utilisateur vivantes.
- Nouveau `freshState()` neutre : profil vide et `movementRefs` vide au départ.
- Chargement d'un profil : les références de mouvement viennent du profil sauvegardé ou de l'historique, jamais d'une banque préchargée globale.
- Reconstruction historique : ne réinjecte plus `PRELOADED_REFS`.
- Onboarding : écrit aussi les ratios dans le registre du profil actif.
- Interface : version harmonisée, texte de sauvegarde GitHub retiré, exports renommés `racine-*`.
- Dev : ajout de `dev/multi_profile_checks.js` et adaptation des tests au format `Vx.y-multi`.
- Documentation : README, ETAT_ACTUEL et checklist alignés sur la branche multi.

## V1.0-multi (fork initial)

Fork expérimental créé à partir de Racine V51.82 (Coach Beurt, mono-utilisateur).
Voir README.md pour le détail complet des changements.

Résumé :
- Ajout du système de profils locaux multi-utilisateur (`scripts/profiles/`).
- Ajout de la mise à l'échelle des charges par profil (`scripts/charge/scaling.js`).
- Ajout de l'agressivité de progression réglable par profil.
- Retrait de la synchronisation GitHub (tout devient local).
- Retrait des modes spéciaux codés en dur "Stéphanie" / "Arnold".
- Correction d'un bug préexistant : appel orphelin à une fonction jamais
  définie (`setupGithubTokenRemovalControl`) en fin de `scripts/app_helpers.js`.
- `data/` repart vide (plus de données personnelles de Bertin dans ce repo).

L'historique détaillé des versions V39 à V51.82 (avant ce fork) reste
disponible dans le repo de production original `Miozza/Coach-Beurt`.

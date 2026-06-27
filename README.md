# Racine — prototype multi-utilisateur

- Version : `V1.16-multi`

Racine est une PWA d'entraînement en JavaScript vanilla, sans framework et sans serveur. Cette branche transforme l'ancien outil personnel en prototype multi-utilisateur local : plusieurs profils peuvent utiliser la même app sur un appareil, avec des charges calibrées à leur niveau.

## Direction produit

- Un profil = un espace local isolé : historique, charges personnalisées, progression et état de cycle.
- L'onboarding calibre les charges avec cinq tests contrôlés : squat, bench, strict press, tirage horizontal et hinge.
- Les programmes restent partageables : leurs charges génériques sont mises à l'échelle par le profil actif avant le moteur RPE.
- L'agressivité de progression est réglable par profil, mais les freins de sécurité RPE restent communs.
- Aucune synchronisation GitHub ni compte utilisateur : export/import JSON manuel par profil.

## Changement majeur de cette branche

Les anciens repères de force ne sont plus injectés comme données vivantes dans un nouveau profil. Ils servent seulement d'ancre de calibration mathématique dans `scripts/profiles/reference.js`. Un utilisateur neuf démarre avec ses tests d'intégration et son historique réel, pas avec des références héritées.

## Structure utile

- `scripts/profiles/storage.js` : registre des profils locaux et clés `localStorage` par profil.
- `scripts/profiles/reference.js` : référentiel neutre de calibration, non vivant.
- `scripts/profiles/onboarding.js` : calcul des charges de départ et ratios.
- `scripts/profiles/ui.js` : interface profil/onboarding/export/import.
- `scripts/charge/scaling.js` : application des ratios au moteur de charge.
- `dev/multi_profile_checks.js` : garde-fous anti-contamination profil.

## Progression PC

L’onglet Progression lit seulement les données locales du profil actif. Les mouvements principaux sont regroupés et les points sont condensés par mouvement/date : une séance = un point représentatif, même si plusieurs sets existent dans l’historique.

## Wake Lock / écran actif

Le bouton visible a été retiré. Le mode Séance active automatiquement le maintien de l’écran quand la plateforme le permet. En cas de refus ou de navigateur non compatible, un statut discret apparaît dans Séance et un fallback manuel existe dans Gear / Diagnostic app.

## Validation

Voir `RELEASE_CHECKLIST.md`. Les validations principales sont dans `dev/`.


## Catalogue client

Racine inclut maintenant un catalogue de programmes multi-objectifs pour tester l'app avec plusieurs types d'utilisateurs :

- Débutant Fondation : 2 ou 3 jours/semaine.
- Hypertrophie générale : 2, 3, 4 ou 5 jours/semaine.
- Force générale : 2, 3 ou 4 jours/semaine.
- Recomposition : 2, 3 ou 4 jours/semaine.
- Performance hybride : 3, 4 ou 5 jours/semaine.
- Haltéro CrossFit : 3, 4 ou 5 jours/semaine.
- Performance RX CrossFit : 4 ou 5 jours/semaine.
- Préparation Metcon : 2, 3 ou 4 jours/semaine.

Les programmes client de base sont enregistrés dans `programs/racine_client_programs.js`.
Les programmes sportifs sont enregistrés dans `programs/racine_crossfit_programs.js`.

Cette version corrige la branche sportive :

- Performance RX CrossFit utilise de vrais mouvements RX et un benchmark connu par semaine.
- Préparation Metcon utilise un metcon connu par semaine.
- Les semaines varient réellement au lieu de répéter le même squelette.
- `dev/crossfit_quality_checks.js` valide ces règles.

Les charges restent neutres et sont mises à l'échelle par le profil actif.

## Cycle spécialisé Strict Muscle-Up

Racine inclut maintenant un cycle spécialisé unique :

- `Cycle Strict Muscle-Up — 10 semaines / 4 jours`
- Fichier : `programs/strict_muscle_up_cycle.js`
- Public visé : utilisateur intermédiaire/avancé capable d'environ 10 strict pull-ups propres.
- Objectif : construire un strict muscle-up aux anneaux sans kipping, avec progression de force, false grip, transition stricte, ring dip/support et préhab.
- Semaines 4 et 8 : déload/checkpoint pour protéger coudes et épaules.
- Semaine 10 : test strict seulement si les critères sont verts.

Ce cycle n'est pas un WOD CrossFit général. C'est un bloc technique/force spécialisé qui peut être intégré à une planification plus large si la récupération est respectée.

### TMS

TMS est disponible comme outil global permanent via le bouton `TMS` de la topnav. Il n’est pas filtré par les permissions de programmes, parce que ce n’est pas un cycle client : c’est une routine libre de mobilité/renforcement.


## Topnav

Le mini bouton de retour/changement de profil à côté de la version a été retiré. Le changement de profil reste disponible dans Gear/réglages.

## Note courante
- TMS visible partout : topnav, WOD+ et PC ouvrent le même hôte Séance, avec retour à la vue précédente.

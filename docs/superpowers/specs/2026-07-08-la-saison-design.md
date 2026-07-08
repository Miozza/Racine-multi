# La Saison — design de l'avenir de Racine

Date : 2026-07-08 · Validé en brainstorming avec le propriétaire · Base : V4.3.3

## Vision

Racine devient deux choses à la fois :

1. **L'outil du coach** : suivre 5-15 proches, recevoir leurs semaines, renvoyer des ajustements — sans backend.
2. **Une app autonome** : un ami progresse seul pendant des mois, le Brain et le catalogue remplacent l'œil du coach au quotidien.

Les deux maillons faibles identifiés pour l'autonomie : **l'enchaînement des cycles** (que faire quand un programme de 4-6 semaines se termine) et **l'adhérence** (ce qui fait revenir quelqu'un au gym semaine après semaine).

## Contraintes non négociables

- JavaScript vanilla, zéro framework, zéro étape de build, hébergement statique.
- Toutes les données restent en `localStorage` par profil. Aucun serveur, aucun compte, aucune sync automatique.
- Le moteur de charges et le Brain ne sont pas modifiés : les nouveaux modules les **consultent en lecture seule**.
- Contrat de structure respecté : aucune logique nouvelle dans `app.js`, chaque chantier a son module dans `scripts/` et son script de validation dans `dev/`.
- Échelle cible : cercle proche (5-15 utilisateurs connus personnellement).

## Ordre de livraison

**A′ (catalogue) → A (enchaînement des cycles) → B (adhérence) → C (pont coach)**

Chaque chantier est utile seul et livrable indépendamment. A′ précède A parce que le moteur de suggestion ne vaut que ce que le catalogue lui offre.

---

## Chantier A′ — Solidifier et étendre le catalogue

### Audit de couverture

Construire la matrice **objectif × jours/semaine** (force, hypertrophie, recomposition, hybride, haltéro-CrossFit × 2-5 jours) et identifier les trous. Règle de complétude : à chaque case où un utilisateur peut se trouver, il doit exister au moins un programme public de la **famille opposée** avec le même nombre de jours — sinon la règle d'alternance du chantier A tombe à plat.

### Métadonnées de suggestion

Chaque entrée de `programs/index.js` reçoit :

- `family` : `"force" | "hypertrophie" | "mixte"`
- `level` : `"debutant" | "intermediaire" | "avance"`
- `followsWellAfter` : familles recommandées en amont (tableau)

`dev/program_catalog_checks.js` est étendu : ces champs deviennent obligatoires pour tout programme public.

### Micro-cycles de transition

Nouveaux programmes courts :

- **Semaine deload** générique, une variante par nombre de jours (2-5).
- **Semaine de tests** : recalibrage des 5 mouvements de référence de l'onboarding — redonne des données fraîches au Brain entre deux cycles.

### Solidification des programmes existants

Passe de qualité sur chaque programme public : progression cohérente semaine à semaine, deload réellement plus léger, notes d'exécution sur les mouvements techniques, tutoriel lié pour chaque mouvement qui n'en a pas (`programs/tutorials.js`).

### Création de nouveaux programmes

L'assistant rédige des programmes complets (structure, progression, charges relatives, notes d'exécution) ; **le coach les valide un par un** avant entrée au catalogue. Aucun programme n'est publié sans validation coach.

---

## Chantier A — Enchaînement des cycles

### Détection de fin de cycle

Quand la dernière semaine du programme est complétée (ou dépassée par la date — `state.week`, `totalWeeks()`, `state.completedDays` existants), la vue WOD affiche un **bandeau persistant** « Cycle terminé — préparer la suite ». Pas de popup : l'utilisateur ouvre l'écran quand il veut.

### Écran Fin de cycle

1. **Bilan** : séances complétées/prévues, PR du cycle, mouvements en progression (lecture seule de l'historique et de la mémoire Brain).
2. **Propositions** : 2-3 programmes candidats tirés du catalogue, filtrés par jours/semaine du profil et visibilité (jamais un programme privé sans permission), classés par règles explicables.
3. **Choix** : un tap → archivage du cycle actif (mécanisme existant), démarrage du nouveau avec sa date de départ.

### Règles de suggestion — rule-based lisible, pas de ML

- **Alternance des familles** : après 2 cycles de même famille, l'autre famille passe en tête.
- **Signal de fatigue** : RPE moyen des 2 dernières semaines ≥ 8,5 (constante nommée dans `suggest.js`, ajustable) → proposer la semaine deload d'abord.
- **Continuité d'objectif** : le focus déclaré à l'onboarding pèse dans le classement.
- Chaque proposition affiche **sa raison en une phrase**, même vocabulaire que Brain Explain.

### Données

`state.season = { cycles: [{programId, startIso, endIso, weeksDone, prCount}], deloadSuggestedAt }`

- Alimenté à l'archivage d'un cycle. C'est un **journal, jamais réécrit**.
- Profils existants sans `state.season` : reconstruction best-effort depuis `state.weekTransitions`, sinon démarrage vide.

### Vue Saison

Frise verticale **dans l'onglet Cycle** (pas de nouvel onglet) : cycles passés avec bilan une-ligne, cycle en cours avec progression, prochaine suggestion en bas.

### Modules et validation

- `scripts/season/index.js` — détection + journal
- `scripts/season/suggest.js` — règles de suggestion
- `scripts/season/ui.js` — écran Fin de cycle + frise
- `dev/season_checks.js` — suggestions cohérentes avec le catalogue ; jamais de programme privé proposé sans permission ; journal jamais tronqué ; alternance et deload déclenchés aux bons seuils.

---

## Chantier B — Adhérence

Trois mécanismes sobres, dans le ton HUD existant. Pas de gamification criarde.

### Streak de semaines

- Une semaine compte si le nombre de séances prévues par le programme est complété (`state.missedDays` existant).
- Affiché discrètement dans l'en-tête WOD (« 🔥 6 semaines »).
- **Ne se brise pas** pour une semaine deload ou une semaine de tests : casser un streak pour de la récupération programmée serait un contresens d'entraînement.

### Célébration des PR

- À la sauvegarde de séance, si une charge dépasse la référence connue (comparaison d'upgrade existante) : écran bref — mouvement, ancienne vs nouvelle marque, place dans le cycle (« S5 · 3e PR de la saison »).
- Un seul écran même si plusieurs PR. Jamais bloquant. Respecte `prefers-reduced-motion`.

### Récap hebdo

- Généré localement à la première ouverture après la fin d'une semaine : séances faites, tonnage total, PR, streak, phrase d'apprentissage Brain Journal la plus pertinente.
- Affiché comme carte refermable dans la vue WOD.
- **Même format que le rapport coach du chantier C** — un seul format, deux usages.

### Données, modules, validation

- `state.adherence = { weekStreak, bestStreak, lastRecapWeekIso }` (les PR restent dans l'historique).
- `scripts/adherence/index.js` (calculs), `scripts/adherence/ui.js` (streak, célébration, récap).
- `dev/adherence_checks.js` — le deload ne casse pas le streak ; une semaine incomplète le casse ; le récap n'est généré qu'une fois par semaine.

---

## Chantier C — Pont coach

### Côté athlète

- Bouton « Envoyer au coach » dans le récap hebdo et dans Réglages.
- Message en deux couches : texte lisible (« Semaine S5 — 3/3 séances · Bench 225×5 RPE 8 · PR squat 265 ») + **bloc JSON compact entre marqueurs** — même pattern éprouvé que l'import Avis IA.
- Partage via `navigator.share` (feuille native iOS), repli copier-coller.

### Côté coach

- Tableau de bord clients : « Importer un rapport » — coller le message, extraction du bloc entre marqueurs, rattachement à l'athlète (nom de profil inclus dans le rapport, confirmation si inconnu).
- Fil chronologique par athlète : semaines, tendance RPE, PR, dernière activité.
- **Espace de stockage séparé** : `racineCoachReports::<athlète>` — jamais mélangé aux profils locaux ni aux données d'entraînement du coach (esprit anti-contamination des checks existants).

### Retour du coach

- Commentaires par le canal Avis IA existant (bloc structuré collable par l'athlète).
- Activation de programmes à distance : panneau admin existant, inchangé.

### Modules et validation

- `scripts/coach_bridge/report.js` (génération), `scripts/coach_bridge/inbox.js` (import + fil).
- UI intégrée au tableau de bord clients existant.
- `dev/coach_bridge_checks.js` — un rapport importé n'écrit jamais dans un profil local ; round-trip génération→import fidèle ; rapport malformé rejeté proprement.

---

## Hors périmètre (explicite)

- **Aucun backend**, même serverless. Si l'échange manuel du pont coach devient réellement agaçant à l'usage, un micro-endpoint pourra se greffer plus tard sur le même format de rapport — décision reportée jusqu'à preuve du besoin.
- **Aucune modification du moteur de charges ni du Brain** (calculs, mémoire, explications).
- **Pas de sync GitHub/Gist**, conformément à la décision de design du README.
- **Pas de refonte UI** : les nouveaux écrans adoptent les composants et le ton existants.

## Risques et mitigations

| Risque | Mitigation |
| --- | --- |
| Catalogue A′ : trous impossibles à combler rapidement | La matrice de couverture est produite en premier ; les cases vides sont comblées par les nouveaux programmes proposés par l'assistant et validés par le coach, en priorisant les cases où de vrais utilisateurs se trouvent. |
| Suggestion de cycle perçue comme arbitraire | Chaque proposition porte sa raison en une phrase ; l'utilisateur garde toujours le choix manuel complet dans l'onglet Cycle. |
| Streak vécu comme punitif | Deload et tests n'y touchent pas ; le streak est discret (pas de notification, pas de culpabilisation). |
| Rapport coach collé dans le mauvais profil | Le nom du profil source est dans le rapport ; confirmation obligatoire si le nom ne correspond à aucun athlète connu. |
| Croissance de `racineCoachReports::*` | Même vigilance quota que V4.3.1 (alerte d'écriture) ; fil limité aux 26 derniers rapports par athlète (~6 mois de semaines). |

## Critères de succès

- Un utilisateur du cercle proche enchaîne **deux cycles sans intervention du coach**, suggestion comprise et acceptée.
- Le coach reçoit et importe un rapport hebdo en **moins de 30 secondes** de manipulation totale (athlète + coach cumulés).
- Les 9 checks existants + les 3 nouveaux (`season`, `adherence`, `coach_bridge`) passent à chaque livraison.
- Aucune régression du contrat de structure (`app.js` sans logique nouvelle).

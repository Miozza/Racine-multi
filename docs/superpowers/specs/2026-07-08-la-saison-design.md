# La Saison — design de l'avenir de Racine (v2)

Date : 2026-07-08 · Validé en brainstorming avec le propriétaire · Révisé après revue externe · Base : V4.3.3

## Vision

Racine devient deux choses à la fois :

1. **L'outil du coach** : suivre 5-15 proches, recevoir leurs rapports, renvoyer des ajustements — sans backend.
2. **Une app autonome** : un ami progresse seul pendant des mois, guidé par son objectif, le catalogue et le Brain.

## Principe directeur (ajouté en v2)

**Distribuer tôt, observer, itérer.** V4.3.3 est distribuable aujourd'hui : elle part aux amis dès maintenant. Les étapes 1-4 ci-dessous sont des fondations sûres (données et catalogue) construites pendant l'observation. Les étapes 5-7 ne sont lancées que si l'usage réel des 5-10 premiers utilisateurs le justifie — on fait évoluer l'app d'après leurs comportements, pas d'après la vision initiale.

## Contraintes non négociables

- JavaScript vanilla, zéro framework, zéro étape de build, hébergement statique.
- Toutes les données restent en `localStorage` par profil. Aucun serveur, aucun compte, aucune sync automatique.
- Le moteur de charges et le Brain ne sont pas modifiés : les nouveaux modules les **consultent en lecture seule**.
- Contrat de structure respecté : aucune logique nouvelle dans `app.js`, chaque chantier a son module dans `scripts/` et son script de validation dans `dev/`.
- Échelle cible : cercle proche (5-15 utilisateurs connus personnellement).

## Ordre de livraison (révisé en v2)

| # | Étape | Statut |
| --- | --- | --- |
| 0 | Distribuer V4.3.3 aux amis, observer | immédiat |
| 1 | Catalogue minimal excellent (10-15 programmes) + métadonnées objectif/graphe | fondation |
| 2 | Mémoire : journal de saison + rétention long terme | fondation |
| 3 | Objectif utilisateur dans l'onboarding et le profil | fondation |
| 4 | Fin de cycle + suggestions (objectif d'abord, graphe ensuite) | cœur |
| 5 | Pont coach à cadence configurable | selon usage observé |
| 6 | Récap hebdo | selon usage observé |
| 7 | Adhérence optionnelle (streak opt-in, célébration PR) | seulement si l'observation le réclame |

---

## Étape 1 — Catalogue minimal excellent

**Philosophie : 10-15 programmes excellents plutôt que 40 moyens.**

### Matrice de couverture

Construire la matrice **objectif × jours/semaine** et n'y combler que les cases où de vrais utilisateurs se trouvent (les amis réels du cercle proche, pas des personas). Les cases vides restantes sont documentées, pas comblées préventivement.

### Métadonnées — formaliser l'existant, pas inventer

`programs/index.js` contient déjà `objective`, `frequency`, `macroRole`, `fillsGap`, `branchAfter`, `branchFrom`. On **généralise** ces champs à tout programme public au lieu d'introduire un enum de familles :

- `objective` : objectif principal servi (voir Étape 3 pour le vocabulaire commun).
- `frequency` : jours/semaine.
- `suggestedNext` : ids des successeurs naturels (formalisation de `branchAfter`) — c'est le **graphe du catalogue**. Exemple : Débutant Fondation → Hypertrophie générale → Force générale ; ou Hypertrophie → Épaules 3D → Muscle-Up → CrossFit.
- `fillsGap` : tags libres existants, conservés pour la recherche de variations.

`dev/program_catalog_checks.js` étendu : ces champs obligatoires sur tout programme public ; chaque `suggestedNext` doit référencer un id existant et visible.

### Solidification et création

- Passe de qualité sur les programmes publics existants : progression cohérente, deload réellement plus léger, notes d'exécution, tutoriel lié pour chaque mouvement technique.
- **Semaine deload générique** (une variante par nombre de jours réellement utilisé) et **semaine de tests** (recalibrage des 5 mouvements de référence) : les deux seuls micro-cycles créés d'office, car les suggestions de l'étape 4 en dépendent.
- Nouveaux programmes : l'assistant rédige des programmes complets (structure, progression, charges relatives, notes d'exécution) ; **le coach valide un par un** avant entrée au catalogue.

---

## Étape 2 — Mémoire : journal de saison + rétention long terme

### Journal de saison

`state.season = { cycles: [{programId, startIso, endIso, weeksDone, prCount}], deloadSuggestedAt }`

- Alimenté à l'archivage d'un cycle. Journal, jamais réécrit.
- Profils existants : reconstruction best-effort depuis `state.weekTransitions`, sinon démarrage vide.

### Rétention long terme (ajouté en v2)

Constat vérifié dans le code : l'historique par mouvement est plafonné à 12 entrées (`app.js`), les RPE Brain à 24 valeurs, le journal Brain à 120 entrées. **Toute intelligence long terme (« tes tractions stagnent depuis 9 mois ») est donc impossible aujourd'hui : les données sont détruites au fil de l'eau.**

Décision : on ne construit **pas** l'analyse maintenant — on commence la **collecte** :

- `state.longTerm.byMovement[cle] = [{month: "2026-07", bestLoad, bestReps, avgRpe, sessions}]` — un agrégat par mouvement et par mois, calculé à la sauvegarde de séance.
- Taille maîtrisée : ~40 mouvements × 36 mois maximum × ~60 octets ≈ 85 Ko au pire, plafonné à 36 mois glissants.
- Aucune donnée existante supprimée, aucun comportement modifié : c'est un enregistreur silencieux.
- L'analyse (tendances, stagnations, réponse aux plages de reps) est un chantier futur explicite, activé quand 6-12 mois de données existeront.

### Modules et validation

- `scripts/season/index.js` (journal de saison), `scripts/season/retention.js` (agrégats mensuels).
- `dev/season_checks.js` — journal jamais tronqué ; agrégats corrects sur des séances simulées ; plafond 36 mois respecté ; aucune écriture dans les données Brain existantes.

---

## Étape 3 — L'objectif utilisateur au centre

Constat vérifié : l'onboarding actuel demande les jours, l'équipement et les tests — jamais **pourquoi** la personne s'entraîne.

- Nouvelle question d'onboarding (et éditable dans le profil) : « Pourquoi t'entraînes-tu ? » — vocabulaire aligné sur les `objective` du catalogue : perdre du poids, prendre du muscle, devenir plus fort, réussir un skill (muscle-up…), compétition CrossFit, santé générale, reprise après pause/blessure.
- `state.profile.trainingGoal` : une valeur principale, optionnellement une secondaire.
- L'objectif devient le **premier critère** de classement des suggestions (étape 4) et le fil conducteur du bilan de fin de cycle (« où en es-tu par rapport à ton objectif »).
- Profils existants : question posée à la première ouverture après mise à jour, refusable (objectif = non défini, comportement actuel conservé).

---

## Étape 4 — Fin de cycle + suggestions

### Détection et écran

Inchangé depuis v1 : bandeau persistant « Cycle terminé — préparer la suite » quand la dernière semaine est complétée ou dépassée ; écran en trois blocs (bilan, propositions, choix un-tap avec archivage existant).

### Classement des propositions (révisé en v2)

Priorité des critères, dans l'ordre :

1. **Objectif de l'utilisateur** (`trainingGoal` ↔ `objective` du programme) — critère dominant. Un futur culturiste peut enchaîner trois cycles hypertrophie ; un powerlifter, quatre cycles force. L'app ne force jamais la variété.
2. **Graphe du catalogue** (`suggestedNext` du programme qui se termine) — les successeurs naturels passent devant.
3. **Signal de fatigue** : RPE moyen des 2 dernières semaines ≥ 8,5 (constante nommée, ajustable) → la semaine deload est proposée en premier, quel que soit le reste.
4. **Diversité** (ex-« alternance », rétrogradée) : simple départage entre candidats à égalité — jamais une raison de déclasser un programme aligné sur l'objectif.

Chaque proposition affiche sa raison en une phrase, même vocabulaire que Brain Explain. Le choix manuel complet reste toujours accessible dans l'onglet Cycle.

### Vue Saison

Frise verticale dans l'onglet Cycle : cycles passés (bilan une-ligne), cycle en cours, prochaine suggestion.

### Modules et validation

- `scripts/season/suggest.js` (classement), `scripts/season/ui.js` (écran + frise).
- `dev/season_checks.js` étendu — l'objectif domine le classement ; jamais de programme privé sans permission ; deload déclenché au bon seuil ; le graphe ne propose que des ids existants.

---

## Étape 5 — Pont coach (cadence configurable, révisé en v2)

### Côté athlète

- Rapport en deux couches : texte lisible + bloc JSON compact entre marqueurs (pattern Avis IA existant), partagé via `navigator.share` (repli copier-coller).
- **Cadence choisie par l'athlète** (défaut : **fin de cycle**) : fin de cycle / chaque semaine / quand ça ne va pas (proposé si séances manquées ou RPE anormaux) / à la demande du coach. Aucun envoi automatique — l'app propose, l'athlète envoie.

### Côté coach

- Tableau de bord clients : « Importer un rapport » — extraction du bloc entre marqueurs, rattachement par nom de profil (confirmation si inconnu), fil chronologique par athlète (semaines, tendance RPE, PR, dernière activité).
- Stockage séparé `racineCoachReports::<athlète>`, limité aux 26 derniers rapports par athlète, jamais mélangé aux profils locaux.

### Retour du coach

Canal Avis IA existant (bloc structuré collable) ; activation de programmes à distance via le panneau admin existant.

### Modules et validation

- `scripts/coach_bridge/report.js`, `scripts/coach_bridge/inbox.js`, UI intégrée au tableau de bord.
- `dev/coach_bridge_checks.js` — un rapport importé n'écrit jamais dans un profil local ; round-trip fidèle ; rapport malformé rejeté proprement.

---

## Étape 6 — Récap hebdo (selon usage observé)

Généré localement à la première ouverture après la fin d'une semaine : séances, tonnage, PR, phrase Brain Journal pertinente. Carte refermable dans la vue WOD. Même format que le rapport coach — un seul format, deux usages. Livré après le pont coach, si les premiers utilisateurs consultent réellement leurs bilans.

## Étape 7 — Adhérence optionnelle (seulement si l'observation le réclame)

- **Streak de semaines : opt-in** (désactivé par défaut), ne se brise jamais pour un deload ou une semaine de tests, purement informatif.
- **Célébration des PR** : écran bref à la sauvegarde, jamais bloquant, respecte `prefers-reduced-motion`.
- Décision de construire prise **après** quelques semaines d'observation des amis — si personne ne décroche, ce chantier peut ne jamais exister.

---

## Hors périmètre (explicite)

- **Aucun backend**, même serverless. Si l'échange manuel du pont coach devient réellement agaçant, un micro-endpoint pourra se greffer plus tard sur le même format de rapport — décision reportée jusqu'à preuve du besoin.
- **Aucune modification du moteur de charges ni du Brain.** L'**analyse** long terme (tendances, stagnations, réponse aux plages de reps) est explicitement différée : l'étape 2 ne fait que collecter.
- **Pas de sync GitHub/Gist**, conformément au README.
- **Pas de refonte UI** : les nouveaux écrans adoptent les composants et le ton existants.
- **Pas de grand catalogue** : les cases de la matrice sans utilisateur réel restent vides et documentées.

## Risques et mitigations

| Risque | Mitigation |
| --- | --- |
| Construire des modules peu utilisés | Étapes 5-7 conditionnées à l'observation réelle des 5-10 premiers utilisateurs ; V4.3.3 distribuée dès maintenant. |
| Suggestion perçue comme arbitraire | Objectif de l'utilisateur en critère dominant ; raison affichée en une phrase ; choix manuel toujours complet. |
| Graphe incohérent avec le catalogue | Check dédié : tout `suggestedNext` référence un id existant et visible. |
| Rapport collé dans le mauvais profil | Nom du profil source dans le rapport ; confirmation si inconnu. |
| Croissance du stockage (rétention + rapports) | Agrégats plafonnés à 36 mois (~85 Ko max) ; rapports limités à 26 par athlète ; alerte quota V4.3.1 en place. |
| Streak culpabilisant | Opt-in, informatif, insensible aux deloads — et construit seulement si nécessaire. |

## Critères de succès

- 5-10 amis utilisent V4.3.3 pendant plusieurs semaines ; leurs usages réels décident des étapes 5-7.
- Un utilisateur enchaîne **deux cycles sans intervention du coach**, suggestion comprise et acceptée.
- La rétention long terme accumule des agrégats corrects pendant 6 mois sans incident de quota.
- Le coach importe un rapport en **moins de 30 secondes** de manipulation totale.
- Les 9 checks existants + les nouveaux (`season`, `coach_bridge`) passent à chaque livraison ; contrat de structure intact.

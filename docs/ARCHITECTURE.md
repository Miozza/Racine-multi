# Architecture Racine

## Type d’application

PWA personnelle d’entraînement en JavaScript vanilla, sans framework.

## Vues principales

- **WOD+** : vue mobile-first pour choisir et lire la séance.
- **Séance** : exécution terrain iPhone, gros texte, saisie rapide.
- **Résultats** : saisie finale des poids/reps/RPE, séparée de PC.
- **PC** : inspection, semaine, route, analyse, export IA. Ce n’est pas un Builder.
- **Historique** : résultats réels sauvegardés dans les données durables.

## Contrat UI

Objectif : éviter qu'un écran appelle un autre écran sans propriétaire clair. Les vues peuvent partager des helpers, mais chaque rendu visible doit avoir un domaine responsable.

### Identifiants de vues PC

- `pcView` est le conteneur officiel de la vue PC.
- `phoneView` est un hôte hérité conservé à l’intérieur de `pcView` pour les anciens sélecteurs CSS et appels historiques `phone*`.
- Toute nouvelle logique PC doit viser `pcView`; `phoneView` ne doit pas redevenir une vue principale ni recevoir de nouveau comportement.

- **WOD+** (`scripts/view_wodplus.js`) possède le rendu de la séance active dans l’onglet WOD : blocs, focus du jour, navigation semaine/jour courante et entrée vers la séance.
- **PC** (`scripts/view_pc.js`) possède l’inspection multi-jours : prévisualisation d’un autre jour que le jour actif, export, diagnostics et vue large. Ses wrappers `pcDay*` sont légitimes s’ils délèguent aux fonctions de jour/semaine de `app.js`.
- **Session guidée** (`scripts/session/view.js` et `scripts/session/timer.js`) possède le mode plein écran terrain : blocs guidés, timer AMRAP/EMOM/For Time et progression pendant l’exécution.
- **Résultats** (`scripts/session/results.js`) possède la saisie finale : champs poids/reps/RPE, collecte de résultats, résumé affiché après sauvegarde.
- **App** (`app.js`) choisit la vue, tient l’état courant et appelle les API publiques. Il ne doit pas redevenir propriétaire du rendu détaillé d’un écran.

État actuel : certaines fonctions de rendu historiques se croisent encore entre WOD+, PC et Session. Ce contrat décrit la destination avant tout déplacement de code; il ne justifie pas une nouvelle couche ou un nouveau fichier.

Règles pour les prochains changements UI :

- Ne pas créer un nouveau fichier de rendu sans ajouter son propriétaire dans ce contrat.
- Ne pas déplacer une fonction de rendu tant que son écran propriétaire n’est pas clair.
- Ne pas mélanger une refonte UI avec une modification de `scripts/charge/`, `data/` ou `programs/`.
- Si une vue appelle temporairement une fonction d’une autre vue, documenter ce lien avant de le nettoyer.

## Dossiers

- `programs/` : programmes prévus.
- `scripts/` : vues et modules runtime extraits du noyau, incluant TMS.
- `dev/` : scripts de validation/développement hors application.
- `docs/` : documentation stable, non versionnée.
- `data/` : données/configuration.

## Données durables

Ne jamais écraser :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

`data/charges.js` reste une configuration d’équipement et de fallback. Il ne remplace pas l’historique réel.

## Chargement JS

`index.html` charge les scripts directement, avec cache-bust de version. Ce choix est volontaire pour la stabilité GitHub Pages + Safari/iPhone.

`programs/index.js` est le registre central des programmes, mais ne charge pas les scripts dynamiquement.


## Cycle Épaules 3D v2

`programs/epaules_3d_v2.js` est un programme runtime standard. Il ne remplace pas `programs/epaules_3d.js`; il ajoute une variante sélectionnable plus dense pour les séances du midi.


## Domaine charges

Le moteur de charges est regroupé dans `scripts/charge/` avec une porte d’entrée publique `scripts/charge/index.js` (`window.CoachCharge`). Aucun ES module, aucun build system. Voir `docs/PHASE_2_EXTRACTION_REPORT.md` et `docs/STRUCTURE_CONTRACT.md`.

## Domaine session

La séance terrain est regroupée dans `scripts/session/` avec `scripts/session/index.js` comme porte d’entrée publique (`window.CoachSession`). `app.js` orchestre, mais ne doit plus appeler directement les fonctions internes de session hors domaine.

## Frontière config / moteur charges — V51.39

`programs/config.js` doit rester statique : profil par défaut, mouvements, journées de base et banques WOD. Il ne doit pas patcher le runtime ni remplacer des fonctions de charges. La logique de charge vit dans `scripts/charge/` et la modale dans `scripts/ui_modals.js`.



## V51.50 — Structure durable

La structure durable est définie dans `docs/STRUCTURE_CONTRACT.md`.

Règle de base :

- `app.js` orchestre;
- `scripts/` contient le runtime;
- `programs/` contient seulement les programmes;
- `data/` contient les données et charges de base;
- `dev/` valide;
- `docs/` documente les contrats stables;
- `tools/` est interdit.

Le script `dev/structure_checks.js` vérifie que les fichiers servent à quelque chose et que les frontières restent propres.


### V51.50 — Domaine session

`session/` contient `view.js`, `timer.js`, `results.js`, `save.js`, `index.js`. Le timer guidé appartient à `scripts/session/timer.js`; le rendu de séance appartient à `scripts/session/view.js`.


## Domaine state

- `scripts/state/storage.js` isole la lecture/ecriture locale du state et des charges personnalisees.
- `scripts/state/index.js` expose `window.CoachState` comme API publique.
- `app.js` reste responsable de fusionner les valeurs chargees avec les valeurs par defaut runtime.

## Domaine profiles (multi-utilisateur)

- `scripts/profiles/storage.js` expose `window.CoachProfiles` comme API publique : registre des profils locaux et stockage namespacé par profil (pas de compte, pas de serveur).
- `scripts/profiles/onboarding.js` porte l'évaluation initiale en 5 mouvements qui calibre `profile.scaleRatios` (ratios de charge par famille de mouvement) et `profile.aggressiveness` (facteur de progression, borné 0.4–1.8).
- `scripts/profiles/ui.js` rend la sélection/gestion de profil ; il ne possède aucune logique de charge.
- Le profil actif (`state.profile`) est lu par `scripts/charge/scaling.js` (`coachUserLoadRatio`, `coachApplyUserLoadScale`, `coachAggressivenessFactor`), branché dans `scripts/charge/suggestion.js` et `scripts/charge/historique.js` — jamais dans `app.js` ni dans `programs/`.
- La synchronisation distante (GitHub) a été retirée : Racine fonctionne en local uniquement, un profil ne voyage pas (encore) entre appareils.


## Domaine UI

- scripts/ui_modals.js garde les helpers UI existants pour compatibilite.
- scripts/ui/index.js expose window.CoachUI comme API publique.
- app.js doit passer par CoachUI pour les helpers de rendu UI partages.


## Domaine history

- scripts/history/index.js expose window.CoachHistory comme API publique de lecture historique.
- resultats reste le journal brut reconstructible; athlete_state reste l etat derive utilise par le moteur.
- CoachHistory ne modifie pas les donnees durables; il transforme l historique disponible en signaux pour CoachCharge et le resume de seance.


## Domaine progression

- scripts/progression/index.js expose window.CoachProgress comme API publique de lecture progression.
- CoachProgress classe les resultats en progression, surveillance et blocage a partir du resultat courant et de l historique precedent.
- Il ne modifie pas les donnees durables; il sert au resume de seance et aux futurs affichages intelligents.


## Domaine summary

- scripts/summary/index.js expose window.CoachSummary comme API publique du resume automatique.
- CoachSummary compose les lignes de seance, PR automatiques, progression, surveillance et blocage a partir des signaux CoachProgress et CoachHistory.
- Il ne modifie pas les donnees durables; il rend le resume reutilisable hors de la vue Resultats.

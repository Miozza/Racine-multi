# CLAUDE.md — Racine-multi

Instructions permanentes pour tout agent IA travaillant sur ce dépôt.

Ce fichier est le **condensé opérationnel** : les règles à ne jamais casser et les
réflexes attendus. Il ne décrit pas le code en détail — il **renvoie** vers les
contrats qui font autorité :

- `docs/STRUCTURE_CONTRACT.md` — frontières de fichiers, règle de nommage, contrat de version.
- `docs/ARCHITECTURE.md` — carte des vues, domaines et portes publiques (`window.Coach*`).
- `docs/DATA_FLOW_CONTRACT.md` — qui écrit quoi, priorité journal brut vs état dérivé.

En cas de contradiction, ces documents priment sur ce fichier.

---

## 1. Le projet

Racine est une PWA CrossFit en **JavaScript vanilla** — pas de framework, pas de
build step, pas de bundler. Développée en solo. Version multi-utilisateurs.

- `Miozza/Racine-multi` → **production**
- `Miozza/Coach-Beurt-Dev` → **staging uniquement**

Le code est livré dans Coach-Beurt-Dev, puis répliqué manuellement vers la
production. **Le code est répliqué, jamais les données.**

Ancien nom du projet : Coach-Beurt. Des références résiduelles peuvent subsister.

---

## 2. Règles absolues

### 2.1 Données d'athlètes — stockage local

La source de vérité est le **stockage local du navigateur**. Il n'existe **aucune
copie serveur**. Toute perte est définitive et non récupérable.

Interdictions :

- **Jamais** de `localStorage.clear()`, ni de suppression en masse de clés — y
  compris dans du code de debug, de reset, de démo ou de test.
- **Jamais** de renommage, de ré-indexation ou de changement de format des clés
  de stockage sans plan de migration explicite, écrit et validé au préalable.
- **Jamais** de valeurs factices ou de seed écrites par-dessus des clés existantes.

Exigences :

- Tout changement de schéma des objets persistés requiert : un **numéro de version
  de schéma**, une **migration ascendante** qui préserve les données existantes,
  et une vérification sur un jeu de données réel avant livraison.
- L'**export/import JSON est le seul mécanisme de sauvegarde**. Sa compatibilité
  ascendante ne doit jamais être cassée : un export produit par une version
  antérieure doit rester importable.

### 2.2 Fichiers `data/` — deux natures distinctes

Ne pas les traiter comme un bloc unique. Voir `docs/DATA_FLOW_CONTRACT.md`.

- `data/charges.js` — **config vivante**, chargée par `index.html`
  (`window.DEFAULT_CHARGES` : charges de départ + équipement). Un humain peut
  l'éditer **délibérément** pour changer une charge de base. Le code de l'app ne
  doit **jamais** la réécrire automatiquement lors d'une sauvegarde de séance.
  Elle ne représente pas la capacité réelle de l'athlète.
- `data/resultats.json`, `data/athlete_state.json`, `data/cycle_state.json` —
  dans le dépôt, ce sont des **squelettes vides** ; la vraie donnée vit dans le
  `localStorage`. `cycle_state.json` fige aussi le **schéma de référence**. Le
  danger n'est pas le fichier du dépôt : c'est l'**écrasement** par une version
  peuplée (ZIP, déploiement). Un agent ne pouvant pas savoir si un checkout
  contient un squelette ou des données seedées, la règle opérationnelle reste :
  **ne jamais les modifier ni les inclure dans un ZIP sans demande explicite**.

Les suites `dev/` imposent la présence et la forme de ces quatre fichiers en mode
`--full`. Ne pas casser ce contrat.

### 2.3 Fonctions gelées

Ne jamais modifier sans confirmation explicite et écrite :

- `setActiveWeek()`
- `applyWeekTrackingForWeek()`
- `buildWeekTrackingForWeek()`

Ces trois fonctions centralisent le scoping par semaine. Un bug de `completedDays`
inter-semaines a déjà été corrigé par cette centralisation. Toute retouche
non concertée risque de le réintroduire.

Si une tâche semble exiger de les toucher : **s'arrêter et demander**, proposer
l'approche, ne pas coder.

---

## 3. Architecture (forme générale)

Carte détaillée, domaines et portes publiques : `docs/ARCHITECTURE.md`. Ici,
seulement la forme à garder en tête.

### 3.1 Programmes autonomes modulaires

Chaque programme vit dans `programs/*.js` et est **auto-suffisant**. Contrat :

| Élément | Rôle |
|---|---|
| `getBlocks(day, week)` | Retourne les blocs d'entraînement |
| `getWodText(day, week)` | Texte du metcon |
| `dayMeta` | Étiquettes de séance (nommage agnostique du jour de la semaine) |
| `dayIntentions` | Intention/objectif de chaque journée |
| `cycleRules` | Règles de progression du cycle |

Un nouveau programme = **un nouveau fichier** + une entrée dans `programs/index.js`
+ une balise `<script defer>` dans `index.html` (les scripts restent listés
manuellement pour la stabilité Safari/iPhone ; `programs/index.js` ne charge rien).
Aucune logique de programme ne doit fuir dans le cœur applicatif.

Visibilité des programmes : `profile.programPermissions`. Tout nouveau programme
est **privé** tant qu'il n'est pas publié explicitement.

Noms de mouvements : uniquement le nom réel, stable et distinct. Aucune intention,
intensité ou qualificatif de programmation dans `name` — ça vit dans `format`,
`load`, `rest`, `note`. Voir la règle des noms dans `docs/STRUCTURE_CONTRACT.md`.

### 3.2 Moteur de suggestion de charges

Regroupé dans `scripts/charge/` (porte publique `window.CoachCharge`).

- Source de vérité primaire : `athlete_state` (état dérivé), reconstructible depuis `resultats`.
- Méthode : **Epley + RPE**, avec profils RPE personnalisés par athlète.
- **Haltères** : mise à l'échelle **proportionnelle** à partir des ratios de test.
  Ne **pas** appliquer une conversion Epley directe — les échelles absolues sont
  incompatibles.

### 3.3 Cerveau statistique / Avis IA

- Suivi de confiance, ambition, sensibilité ; profils de mouvements ; Brain Journal ;
  Influence Tracker (détection des overrides manuels).
- L'**Avis IA est strictement consultatif**. Aucune modification automatique de
  charge, jamais. L'athlète décide.

### 3.4 Données et synchronisation

- Pas de module de sync GitHub — retiré délibérément. Racine fonctionne en local.
- Export/import JSON local uniquement.
- Ne pas réintroduire de sync distante sans décision explicite.

### 3.5 Admin

- Panneau admin (vue PC paysage) : accessible via le flag `profile.isAdmin`
  (`CoachProfiles.isActiveAdmin()`). Le profil nommé `Bertin` reçoit ce flag au
  passage de la porte admin.
- Sélecteur de profil protégé par PIN.

---

## 4. Conventions de version

Version courante : **`V4.5.18`** (format `Vmajor.mineur.patch`). Autorité :
`docs/STRUCTURE_CONTRACT.md` § « Contrat de version ».

| Type de changement | Incrément |
|---|---|
| Changement livré visible ou correction comportementale | patch → `V4.5.19`, `V4.5.20` |
| Refonte structurelle visible / nouvelle architecture | version majeure → `V5.0.0` |
| Doc seule, contrat, garde-fou CI, nettoyage sans runtime | pas d'incrément (sauf décision explicite) |

À chaque incrémentation, mettre à jour **ensemble** : `app.js` (`APP_VERSION`),
`index.html` (titre, topnav, footer, cache-bust `?v=`), `README.md`,
`ETAT_ACTUEL.md`, `CHANGELOG.md`. Ne pas mettre à jour les en-têtes de modules
juste pour suivre la version. Toujours annoncer la version visée avant de livrer.

---

## 5. Design system

```css
--bg:   #04060f;
--blue: #1e90ff;
--cyan: #00d4ff;
```

- **Inter** (`--font-main`) → contenu et texte courant.
- **Orbitron** (`--font-hud`) → valeurs numériques (charges, reps, chronos).

Ne pas introduire de nouvelles polices ou couleurs d'accent sans validation.

---

## 6. Livraison

- Livraison par ZIP dans le repo staging.
- Le ZIP contient **soit** les fichiers modifiés uniquement, **soit** le codebase
  complet — selon le contexte. Demander si ambigu.
- Traiter les quatre fichiers `data/` selon § 2.2 : ne pas les écraser, ne pas les
  inclure dans un ZIP sans demande explicite.
- Une pipeline GitHub Actions (CI) existe : ne pas casser sa configuration.
- Validations `dev/` à faire passer avant livraison : liste de référence dans
  `RELEASE_CHECKLIST.md` (a minima `node dev/structure_checks.js`,
  `node dev/regression_checks.js`, `node dev/charge_engine_checks.js`,
  `node dev/progression_contract_checks.js`).

---

## 7. Style de collaboration attendu

- Livrer un **jet complet** plutôt que valider élément par élément. Les corrections
  se font sur la version terminée.
- Développement fréquent **depuis un iPhone** : privilégier les changements
  compacts et copiables, éviter les diffs éparpillés sur douze fichiers quand
  trois suffisent.
- Français.
- En cas de doute sur une règle de ce fichier : demander avant d'agir. Ne jamais
  supposer une autorisation.

---

## 8. Roadmap (contexte, pas instruction)

- V2 B2C commercial : Supabase + Stripe.
- Brain.js (~100 Ko) comme couche de raffinement ML au-dessus du moteur Epley + RPE —
  **différé** jusqu'à 3–6 mois d'historique utilisateur. Ne pas l'implémenter d'ici là.

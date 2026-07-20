# Diagnostic — charges client aberrantes + installation PWA iOS

Date : 2026-07-20 · Branche : `claude/diagnostic-charge-pwa-ios-kketw3`
Méthode : systematic-debugging 4 phases (reproduction → isolement → cause racine → correctif vérifié).
Statut : **diagnostic livré, correctifs proposés NON appliqués** (en attente de feu vert).
Aucun fichier de données protégé n'a été modifié ; `setActiveWeek()` / `applyWeekTrackingForWeek()` / `buildWeekTrackingForWeek()` non touchés.

---

## Bug 1 — Moteur de charge : valeurs farfelues pour un client ≠ Bertin

### Verdict

Le moteur lui-même est sain : résolution du profil actif correcte, garde-fous
d'historique corrects, brain borné. La cause racine est **un ratio de scaling
corrompu dans `profile.scaleRatios` du client**, produit par la chaîne
onboarding → ratios, puis **silencieusement neutralisé ou amplifié** par le
moteur de scaling. Deux chemins prouvés, reproduits avec le vrai moteur
(`dev/repro_bug1_charges_client.js`) :

| Scénario | Bench Press (prog 205 lb) | DB Fly (prog 35 lb) | Lat Pulldown (prog 140 lb) |
|---|---|---|---|
| Profil client sain (débutant) | **105 lb** ✓ | 17.5 lb ✓ | 80 lb ✓ |
| A — champ vidé à l'écran de revue | **205 lb** (trop haut ×2) | **10 lb** (trop bas) | 80 lb |
| B — `latPulldown10RM` à l'échelle machine | 105 lb | 17.5 lb | **340 lb** (Barbell Curl : **180 lb**) |

Le symptôme « trop haut ET trop bas en même temps » correspond au scénario A ;
« explosion sur les tirages/curls » au scénario B. Les deux peuvent coexister.

### Chaîne de cause racine (fichier + ligne + preuve)

**Chemin A — valeur 0 acceptée à l'écran de revue → ratio 0 → scaling désactivé.**

1. `scripts/profiles/ui.js:489-490` — handler « Suivant » de l'écran
   « Mouvements calculés » :
   ```js
   var v = Number(inp.value);
   if(!isNaN(v)) computed.values[key] = v;
   ```
   Un champ **vidé** donne `Number("") === 0`, `!isNaN(0)` est vrai → la valeur
   `0` est enregistrée comme charge de départ du mouvement.
2. `scripts/profiles/onboarding.js:246` — `ratiosFromValues` :
   `ratios[key] = ((v||v===0) && d) ? (v/d) : fallback` → `0/245 = 0`. Le ratio
   du mouvement vaut 0 (le `v===0` est explicitement accepté).
3. `scripts/profiles/onboarding.js:249` et `:258` — les moyennes de famille et
   `_overall` **gardent les zéros** (`filter(v => v || v === 0)`) : la moyenne
   `_upperPush` passe de 0.487 à 0.317 → toute la famille est tirée vers le bas
   (DB Fly 17.5 → 10 lb).
4. `scripts/charge/scaling.js:43` (et `:57-58`) — `coachUserLoadRatio` retourne
   délibérément un ratio 0 (`if(direct || direct === 0) return direct;`).
5. `scripts/charge/scaling.js:67` — `coachApplyUserLoadScale` :
   ```js
   if(!ratio || ratio === 1) return num;
   ```
   `!0` est vrai → **ratio 0 = scaling silencieusement désactivé** : le client
   reçoit la charge brute du programme calibrée athlète de référence
   (Bench Press 205 lb au lieu de ~105).

**Chemin B — clé `latPulldown10RM` à cheval sur deux échelles absolues.**

6. `scripts/profiles/reference.js:33` — référence V2 : `latPulldown10RM: 20`
   = **20 lb de LEST en traction lestée** (label PR « Weighted Pull-up »,
   `app.js:1731`). L'ancienne échelle était la machine : `latPulldown10RM: 140`
   (`programs/config.js:7`, fallback legacy encore présent).
7. Une valeur à l'échelle machine (ex. 120 lb) dans le profil → ratio
   `120/20 = 6` → moyenne `_upperPull` (`onboarding.js:254`) passe à ~2.42 →
   tout mouvement résolu en famille « tirage » (`scaling.js:55` :
   `/row|pull up|pulldown|curl|face pull|rear delt|lat |shrug/`) est multiplié :
   Lat Pulldown 140 → **340 lb**, Barbell Curl 75 → **180 lb**. Les câbles/barres
   n'ont pas de liste bornée (`equipement.js:6-8,18-21` : `step` seulement),
   donc aucune borne haute ne rattrape la valeur — contrairement aux haltères
   (liste 2.5–85, `equipement.js:16`).
   Deux portes d'entrée pour cette valeur : édition du champ « Weighted
   Pull-up » à l'écran de revue (`ui.js:492-494` recalcule les ratios), ou
   `migrateReferenceVersion` (`onboarding.js:269-294`) qui recalcule les ratios
   depuis `state.profile.latPulldown10RM` stocké sous l'ancienne signification.

### Hypothèses vérifiées et écartées (preuves)

- **Résolution du profil actif** : correcte. `state` est chargé depuis la clé
  namespacée `racineState::<profileId>` (`scripts/profiles/storage.js:228-238`,
  `scripts/state/storage.js:10-15,57`) ; `ensureAthleteState()` lit
  `state.athleteState` du profil actif (`scripts/charge/historique.js:4-8`).
  Pas de fuite vers l'état de Bertin.
- **Correspondance des clés programme ↔ athlete_state** : robuste. Lookup par
  labels canoniques + normalisation + garde de compatibilité d'équipement
  (`historique.js:16-42`). Un miss retourne `null` → le moteur repart de la
  charge programme *mise à l'échelle* : pas de valeur par défaut aberrante.
- **Profil sans calibration** : bloqué proprement (« Profil non calibré »,
  `suggestion.js:134-137`), pas de valeur farfelue — et le resync registre a
  été corrigé le 15/07 (`b8b9442`, `scaling.js:23-27`).
- **Brain / cerveau statistique** : borné. `confidence` clampé 0.25–0.96,
  `ambition` incréments bornés (`brain_stats.js:161-175`), dérivés de
  l'historique, identiques pour tous les profils. Pas de multiplicateur libre.
- **`cycleRules` Arnold Split Strict** : texte de consignes uniquement
  (`programs/arnold_split_strict.js:110-117`), aucune table de progression en %.
- **Scaling haltères / division par ratio** : aucune division dans le moteur
  (`coachApplyUserLoadScale` multiplie) ; la seule division par référence est
  dans `ratiosFromValues` (chemin B ci-dessus). Arrondi haltères borné 2.5–85.
- **Typos d'historique** : déjà couvert par `coachIsImplausibleLoadRow`
  (partagé depuis `b8b9442`).

### Données à vérifier côté Christian (correction data, par toi)

Dans l'export JSON du profil (Réglages → Sauvegarde) ou en console :
`JSON.parse(localStorage.getItem('racineProfileRegistry'))` puis
`JSON.parse(localStorage.getItem('racineState::<idProfil>'))`.

1. `state.profile.scaleRatios` (ET la copie `profiles[i].scaleRatios` du
   registre — le moteur resynchronise depuis le registre) :
   - toute clé à **0** → chemin A confirmé ;
   - `latPulldown10RM` **> ~1.3** → chemin B confirmé ;
   - `_upperPull`, `_upperPush`, `_lowerBody`, `_hinge`, `_olympic`, `_overall`
     hors de ~0.3–1.3 pour un client = suspect.
2. Valeurs brutes `state.profile.bench / strictPress / backSquat5RM / row8RM /
   chestRow8RM / dbRdl / hipThrust8RM / bulgarianDb / inclineDb10RM /
   frontSquat / powerClean` : un **0**, une valeur en **kg**, ou
   `latPulldown10RM` **> ~60** (= valeur machine, pas un lest) sont à corriger.
3. Correction immédiate sans code : relancer la calibration du profil (ou
   corriger les valeurs puis re-valider l'écran de revue, qui recalcule les
   ratios via `ratiosFromValues`) — en s'assurant qu'aucun champ n'est vide.

### Correctifs minimaux proposés (NON appliqués — attente de ton feu vert)

**Diff 1 — `scripts/profiles/ui.js` (écran de revue : rejeter vide/0/négatif)**
```diff
-        var v = Number(inp.value);
-        if(!isNaN(v)) computed.values[key] = v;
+        var v = Number(inp.value);
+        if(String(inp.value).trim() !== "" && isFinite(v) && v > 0) computed.values[key] = v;
```

**Diff 2 — `scripts/profiles/onboarding.js` (`ratiosFromValues` : jamais de ratio ≤ 0, moyennes sans zéros)**
```diff
-      ratios[key] = ((v||v===0) && d) ? (v/d) : lvl.fallbackRatio;
+      ratios[key] = (v > 0 && d) ? (v/d) : lvl.fallbackRatio;
```
```diff
-      var present = keys.map(function(k){ return ratios[k]; }).filter(function(v){ return v||v===0; });
+      var present = keys.map(function(k){ return ratios[k]; }).filter(function(v){ return v > 0; });
```
```diff
-    var allVals = Object.keys(ref).map(function(k){ return ratios[k]; }).filter(function(v){ return v||v===0; });
+    var allVals = Object.keys(ref).map(function(k){ return ratios[k]; }).filter(function(v){ return v > 0; });
```

**Diff 3 — `scripts/charge/scaling.js` (défense en profondeur : un ratio ≤ 0 est « absent », pas « ne pas scaler »)**
```diff
-        var direct = ratios[cfg.profile];
-        if(direct || direct === 0) return direct;
+        var direct = ratios[cfg.profile];
+        if(direct > 0) return direct;
```
```diff
-  if(fam || fam === 0) return fam;
-  return (ratios._overall || ratios._overall === 0) ? ratios._overall : 1;
+  if(fam > 0) return fam;
+  return (ratios._overall > 0) ? ratios._overall : 1;
```

Option (à discuter, non incluse) : borner le ratio individuel dans
`coachUserLoadRatio` à une bande saine (ex. 0.2–2.5) pour contenir une future
valeur trans-échelle type `latPulldown10RM` sans dépendre de la qualité de la
donnée. Et à plus long terme : renommer la clé `latPulldown10RM` (ex.
`weightedPullup10RM`) avec migration, pour éliminer l'ambiguïté d'échelle.

Vérification prévue après feu vert : `node dev/repro_bug1_charges_client.js`
(les scénarios A et B doivent retomber sur les valeurs saines) + suite
`RELEASE_CHECKLIST.md` (22 scripts, incl. `dev/client_charge_safety_checks.js`).

---

## Bug 2 — « Ajouter à l'écran d'accueil » impossible sur l'iPhone de Christian

### Verdict : pas de régression code — problème d'usage (lien ouvert hors Safari)

Le shell PWA est **entièrement sain à HEAD**, vérifié point par point :

- `manifest.json` : JSON valide (`python3 -m json.tool` OK), `start_url:
  "./index.html"`, `display: "standalone"`, icônes 180/192/512 déclarées et
  présentes. Dernière modification : V4.3.1 (`63e7494`) — ancienne.
- `index.html` `<head>` (lignes 7-15) : `<link rel="manifest">` correct,
  `apple-touch-icon` 180×180 présent, `apple-mobile-web-app-capable` +
  `apple-mobile-web-app-status-bar-style` bien formés. Aucun commit récent sur
  le head hormis des bumps de version (`git log --follow index.html`).
- Icônes : les 5 fichiers PNG existent aux tailles exactes déclarées
  (vérifié avec `file`).
- Service worker : network-first sans liste de précache qui pourrait 404 ;
  l'échec d'enregistrement est attrapé (`app.js:2217` `.catch(...)`) et ne peut
  pas casser le chargement. De toute façon, iOS n'exige pas de SW pour
  « Sur l'écran d'accueil ».
- Erreur JS précoce : `node --check` passe sur **tous** les fichiers JS du
  repo — aucune erreur de syntaxe qui casserait le premier chargement.

**Ce qui a réellement changé récemment** : la V4.5.11 (13 juillet, commit
`ae8803e`) a introduit la **prescription coach → client par lien envoyé par
texto/WhatsApp** (`scripts/profiles/prescription.js`, fragment `#rx=`). Un lien
reçu dans Messages/WhatsApp/Instagram/Gmail s'ouvre dans un **navigateur
in-app**, et sur iOS la feuille de partage d'un navigateur in-app **ne propose
pas** « Sur l'écran d'accueil ». Seul **Safari** (et quelques navigateurs
complets récents type Chrome iOS) l'offre. La coïncidence temporelle
(« récemment cassé » = depuis qu'on envoie des liens) + l'absence totale de
régression dans le shell rendent ce scénario quasi certain.

**Confirmation demandée** : oui — sur iOS, « Ajouter à l'écran d'accueil »
n'apparaît que dans Safari. C'est un souci d'usage, pas un bug code :
Christian ouvrait très probablement le lien dans la vue in-app de Messages/
WhatsApp. Procédure à lui donner : ouvrir le lien, puis « Ouvrir dans Safari »
(ou copier l'URL dans Safari), puis Partager → « Sur l'écran d'accueil ».

### Correctif minimal optionnel proposé (NON appliqué — attente de confirmation)

Ajouter dans la carte de prescription (`scripts/profiles/prescription.js`) et/ou
au premier lancement non-installé une aide contextuelle quand on détecte un
navigateur in-app (heuristique user-agent `FBAN|FBAV|Instagram|Line|GSA|
wv\)` ou absence de `navigator.standalone` combinée à un viewport in-app) :

> « Pour installer Racine : ouvre cette page dans Safari (⋯ → Ouvrir dans
> Safari), puis Partager → Sur l'écran d'accueil. »

avec un bouton « Copier le lien ». Diff réel à rédiger après ton feu vert sur
le principe (aucune fonction protégée concernée).

---

## Annexe — reproduction

`dev/repro_bug1_charges_client.js` : charge les vrais fichiers du moteur
(reference, config, onboarding, scaling, suggestion…) + les lignes verbatim
d'`app.js` (PR_FIELD_MAP, prCfgMatchesResult) dans un contexte `vm` Node, et
rejoue les scénarios sain / A / B ci-dessus. Lecture seule : ne modifie ni ne
committe aucune donnée.

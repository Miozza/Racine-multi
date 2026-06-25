# Audit progression des charges — Racine

## Statut

- Version auditée : `V51.37`
- Version livrée avec le rapport : `V51.38`
- Nature : audit structurel seulement
- Comportement volontairement changé : non
- Données `data/` modifiées : non
- Programmes `programs/` modifiés : non
- `data/charges.js` modifié : non

## Verdict court

Le moteur de charges extrait en V51.37 fonctionne comme une étape de transition utile, mais il n'est pas encore un moteur pleinement centré et indépendant.

La logique de progression est maintenant mieux répartie dans des modules dédiés, ce qui rend le code plus lisible. Le risque principal n'est pas l'extraction elle-même; le risque principal est la coexistence de plusieurs endroits capables d'influencer les charges : modules `scripts/*`, vieux patch runtime dans `programs/config.js`, vues qui appellent directement les suggestions, et `app.js` qui orchestre encore la sauvegarde/résultats.

La prochaine priorité ne devrait pas être d'extraire davantage. Elle devrait être de stabiliser la frontière du moteur de charges et de retirer progressivement les doublons dangereux, sans changer la logique de suggestion.

---

## 1. Carte actuelle du calcul de charge

### 1.1 Affichage d'une charge suggérée

Flux principal observé :

```txt
Vue WOD / PC / Séance / Diagnostic
→ athleteSuggestedLoad(name, load, targetReps)
→ guardedSuggestedLoadDecision(name, load, targetReps)
→ canonicalMovementLabel(name)
→ athleteMovementRecord(label)
→ repRange(targetReps)
→ historique / ranges athlete_state
→ arrondi équipement
→ storeLoadDecisionHint(...)
→ texte de charge affiché
```

Points d'appel connus :

```txt
app.js
scripts/view_wodplus.js
scripts/view_pc.js
scripts/view_session.js
scripts/charge_diagnostic_ui.js
```

### 1.2 Sauvegarde et mise à jour de progression

Flux principal observé :

```txt
Résultats séance
→ enrichSessionResults(results)
→ plannedMapFromSessionExercises()
→ classifyPerformance(actual, planned)
→ updateAthleteStateFromResults(results, date)
→ state.athleteState.movements[label].ranges[repRange]
→ state.athleteState.movements[label].history
```

Points d'appel connus :

```txt
app.js : sauvegarde séance locale/GitHub
app.js : reconstruction / enrichissement résultats
```

### 1.3 Bouton jaune `!`

Flux principal observé :

```txt
guardedSuggestedLoadDecision(...)
→ storeLoadDecisionHint(...)
→ window.__coachLoadHints
→ loadInfoButtonHtml(...)
→ showLoadInfoModal(...)
```

Note importante : `scripts/ui_modals.js` contient une logique de modale, mais `programs/config.js` contient encore un vieux patch runtime qui remplace aussi `window.loadInfoText`, `window.loadInfoButtonHtml` et `window.showLoadInfoModal`. C'est une zone à nettoyer.

---

## 2. Responsabilités par fichier

### `scripts/charge/equipement.js`

Rôle actuel :

```txt
- règles d'équipement;
- arrondi DB / câble / barre;
- liste DB disponible;
- prochain poids avec + / -;
- affichage de charge selon équipement.
```

Verdict : bon module. C'est probablement le module le plus clair.

Risque : la détection se fait par texte. Si un mouvement n'indique pas son équipement mais devrait le faire, l'arrondi peut devenir approximatif.

### `scripts/charge/utilitaires.js`

Rôle actuel :

```txt
- accès à window.DEFAULT_CHARGES;
- accès à customCharges;
- fonction charge(...);
- formatage texte de certaines charges.
```

Verdict : utile, mais dépend encore de `customCharges` défini dans `app.js`.

Risque : module chargé avant `app.js`, mais appelé après. Cela fonctionne, mais la dépendance doit rester documentée.

### `scripts/charge/mouvements.js`

Rôle actuel :

```txt
- normalisation des noms;
- famille d'équipement;
- compatibilité d'alias;
- clé canonique;
- anciens noms comme alias de transition.
```

Verdict : module essentiel et sensible.

Risque principal : un alias trop large peut récupérer le mauvais historique. Les garde-fous DB/câble/machine/barre réduisent beaucoup ce risque, mais la logique doit être surveillée.

### `scripts/charge/historique.js`

Rôle actuel :

```txt
- accès / création athleteState;
- récupération d'un mouvement dans athlete_state;
- historique récent;
- seed de charge si programme textuel;
- max jump;
- isolation / technique;
- hints pour bouton !.
```

Verdict : module utile, mais encore très lié à `state`.

Risque : `isTechnicalMovement(name)` dépend encore fortement du texte du nom. Comme les noms ont été simplifiés, l'intention technique peut être perdue si elle n'est pas transmise autrement.

### `scripts/charge/rpe.js`

Rôle actuel :

```txt
- repRange;
- messages RPE;
- alerte deload globale.
```

Verdict : logique encore liée à `state.rpeHistory`, `movements`, `focus()` et `weekIdx()`.

Risque : ce fichier mélange utilitaire pur (`repRange`) et logique app globale (`checkDeloadAlert`). À stabiliser plus tard, pas urgent.

### `scripts/charge/suggestion.js`

Rôle actuel :

```txt
- décision finale de charge;
- enrichissement des résultats;
- classification réussite/échec;
- mise à jour athlete_state;
- exposition athleteSuggestedLoad / coachSafeSuggestedLoad.
```

Verdict : c'est le centre du moteur extrait.

Risque : le fichier fait encore trois responsabilités différentes : suggestion avant séance, interprétation des résultats après séance, écriture dans athlete_state. C'est acceptable temporairement, mais il faudra éventuellement séparer lecture/suggestion et écriture/progression.

### `programs/config.js`

Rôle attendu : configuration programme.

Rôle réel observé :

```txt
- configuration de base;
- vieux patch runtime V50.18;
- normalisation de noms;
- fallback de suggestion de charges;
- patch de blocs du programme shoulders3d;
- remplacement de loadInfoText / loadInfoButtonHtml / showLoadInfoModal;
- appel render / renderPhoneWod / renderSessionEntry.
```

Verdict : c'est la zone la plus problématique.

Ce fichier ne devrait pas influencer le moteur de charges ni l'UI du bouton `!`. Il devrait redevenir un fichier de configuration seulement.

---

## 3. Fonctions critiques recensées

### Suggestion / décision

```txt
guardedSuggestedLoadDecision
athleteSuggestedLoad
window.coachSafeSuggestedLoad
coachDefaultLoadSeedForMovement
coachMaxJumpForExercise
coachLoadStepForExercise
```

### Historique / athlete_state

```txt
ensureAthleteState
athleteMovementRecord
latestMovementHistory
coachRecentBestControlledLoad
updateAthleteStateFromResults
```

### Résultats / progression

```txt
plannedMapFromSessionExercises
classifyPerformance
enrichSessionResults
updateAthleteStateFromResults
```

### Mapping mouvement

```txt
chargeKeyFromName
normalizeExerciseName
coachNormalizeMoveText
coachMovementEquipmentFamily
coachEquipmentCompatibleForAlias
canonicalMovementLabel
athleteMoveId
movementLabelFromKeyOrName
coachMovementLookupLabels
```

### Équipement / arrondi

```txt
defaultEquipmentLoadRules
effectiveEquipmentLoadRules
equipmentRuleForExercise
roundLoadForExercise
lbForExercise
displayLoadForEquipment
nextLoadForExercise
equipmentStepLabelForExercise
```

### RPE

```txt
repRange
repRangeLabel
getRpeAdjustment
checkDeloadAlert
```

### Anciennes fonctions encore présentes dans `programs/config.js`

```txt
canonName
findAthleteMovement
bestRange
smartSuggestedLoad
storeAutoLoadHint
findAutoLoadHint
```

Ces anciennes fonctions ne devraient pas être le moteur principal. Aujourd'hui elles sont surtout un filet de transition parce que `smartSuggestedLoad` délègue à `window.coachSafeSuggestedLoad` quand il existe. Mais leur présence reste source de confusion.

---

## 4. Risques de progression identifiés

### Risque A — Doublon historique entre moteur extrait et patch config

`programs/config.js` peut encore remplacer `window.athleteSuggestedLoad`, `window.loadInfoText`, `window.loadInfoButtonHtml` et `window.showLoadInfoModal` après le chargement général.

Même si le remplacement appelle généralement `window.coachSafeSuggestedLoad`, cela veut dire que le comportement final dépend aussi du `setTimeout` du patch.

Impact potentiel : moyen.

Correction recommandée : retirer progressivement la logique de suggestion et de modale de `programs/config.js`, mais dans une version dédiée et testée.

### Risque B — Intention perdue après simplification des noms

Les noms de mouvements sont maintenant plus simples, ce qui est bon.

Mais certaines intentions ne sont plus dans le nom :

```txt
technique
progression
léger
rappel
WOD
```

Le moteur détecte encore certains cas techniques via le texte du nom.

Impact potentiel : moyen à élevé pour les mouvements comme `Power Clean`.

Correction recommandée : créer plus tard un contexte de mouvement :

```txt
name + equipment + intent + blockKind + day + week
```

Pas à faire dans la phase d'audit.

### Risque C — Alias trop tolérants

`athleteMovementRecord` fait :

```txt
1. match exact sur alias;
2. match normalisé;
3. match partiel tolérant.
```

La compatibilité d'équipement réduit le danger, mais un match partiel peut encore être trop généreux si deux mouvements partagent un nom très court.

Impact potentiel : moyen.

Correction recommandée : garder les alias explicites, réduire plus tard le match partiel aux cas whitelistés.

### Risque D — WOD non intégré à la progression de charge

`plannedMapFromSessionExercises()` ignore les éléments `isWod`.

C'est probablement volontaire, mais Bertin considère les WOD courts comme du travail de fonte productif. Les WOD benchmarks ont donc une valeur de progression, mais pas nécessairement dans `athlete_state`.

Impact potentiel : faible à moyen, selon l'objectif.

Correction recommandée : ne pas changer maintenant. Plus tard, décider si certains WOD chargés doivent créer une référence séparée de performance plutôt qu'une progression de charge classique.

### Risque E — Source des charges fallback dispersée

Le moteur utilise :

```txt
program load
historique athlete_state
data/charges.js
fallbacks internes dans coachDefaultLoadSeedForMovement
```

Les fallbacks internes ont été utiles pour éviter les charges textuelles sans suggestion, mais ils ne sont pas visibles dans `data/charges.js`.

Impact potentiel : moyen.

Correction recommandée : documenter ces fallbacks ou les rendre plus explicites dans un module de règles, sans modifier `data/charges.js` pour l'instant.

---

## 5. Ce qui est stable et devrait être conservé

```txt
- app.js reste chef d'orchestre.
- scripts/* contiennent les fonctions spécialisées.
- data/charges.js reste source de fallback statique officielle.
- Les alias de transition protègent l'historique.
- DB, câble, machine, barre et poids du corps ne doivent pas être fusionnés.
- Les noms de mouvements restent simples.
- L'ancien historique doit rester lisible même si les noms de programmes ont été nettoyés.
```

---

## 6. Corrections recommandées, sans les faire dans cette phase

### Priorité 1 — Nettoyer `programs/config.js`

Objectif : que `programs/config.js` redevienne une configuration.

À retirer ou déplacer plus tard :

```txt
canonName
findAthleteMovement
bestRange
smartSuggestedLoad
storeAutoLoadHint
findAutoLoadHint
overrides loadInfoText / loadInfoButtonHtml / showLoadInfoModal
patch d'affichage shoulders3d si encore nécessaire
```

À faire dans une version dédiée : `V51.39` ou autre.

### Priorité 2 — Formaliser un `movementContext`

Objectif : ne plus cacher l'intention dans le nom.

Forme cible éventuelle :

```txt
{
  name: "Power Clean",
  equipment: "barbell",
  intent: "technique",
  kind: "skill",
  day: "vendredi",
  week: 3
}
```

Pas à faire avant d'avoir stabilisé l'extraction.

### Priorité 3 — Réduire les matchs partiels dans les alias

Objectif : limiter les récupérations historiques approximatives.

Règle cible :

```txt
exact alias > ancien nom explicite > fallback whitelisté
```

Éviter les matchs partiels généraux sauf cas validés.

### Priorité 4 — Séparer suggestion et écriture athlete_state

Plus tard, `moteur_charges.js` pourrait être divisé en :

```txt
moteur_charges.js = suggestion avant séance
progression_resultats.js = interprétation/résultats/athlete_state
```

Pas maintenant.

---

## 7. Tests manuels à faire avant toute correction

### Cycle principal

```txt
Épaules 3D v2 — Semaine 3
- Lundi
- Mardi
- Jeudi
- Vendredi
```

À vérifier :

```txt
- charges suggérées présentes;
- bouton jaune ! présent quand pertinent;
- historique affiché;
- pas de conflit DB/câble;
- WODs benchmarks restaurés mardi/jeudi/vendredi;
- WOD lundi fonte présent.
```

### Mouvements critiques

```txt
Strict Press
Incline DB Press
Lateral Raise DB
Lateral Raise câble
Rear Delt Fly DB
Rear Delt Fly câble
Overhead Rope Extension
Weighted Dips
Power Clean
Ring Row
Pull-Up
Knee Raise
DB Bench
KB Swing
```

### Résultats

```txt
- entrer un résultat fictif sans sauvegarder;
- vérifier boutons - / + charge;
- vérifier RPE par 0.5;
- vérifier For Time 00:00 à 60:00;
- vérifier que le champ charge reste cohérent DB/câble.
```

### Sauvegarde prudente

Si test avec vraie sauvegarde :

```txt
- un seul mouvement;
- vérifier que la sauvegarde ne plante pas;
- vérifier que l'historique de ce mouvement revient dans le bouton !.
```

---

## 8. Décision recommandée

Ne pas extraire plus de `app.js` maintenant.

La prochaine action utile est :

```txt
Stabiliser le moteur de charges extrait.
```

Ordre recommandé :

```txt
1. Tester V51.37/V51.38 en DEV.
2. Nettoyer le vieux patch charges dans programs/config.js.
3. Ajouter des garde-fous de dépendances.
4. Créer ensuite seulement un contexte de mouvement/intention.
```

## Conclusion

Le moteur de charges est sorti au bon endroit, mais il n'est pas encore recentré.

Le plus gros point à corriger n'est pas une formule mathématique de progression. C'est la frontière entre :

```txt
configuration
mapping mouvement
suggestion de charge
historique
résultat
UI bouton !
```

Tant que `programs/config.js` contient encore des patchs runtime et que le moteur dépend d'intentions cachées dans les noms, il faut éviter les nouvelles améliorations de progression.

Le bon objectif immédiat est de sécuriser ce qui existe, pas de rendre le moteur plus intelligent.

## Mise à jour V51.39 — Étape 2 effectuée

Le vieux patch runtime dans `programs/config.js` a été retiré. Ce fichier ne doit plus influencer directement les suggestions de charges, les alias, la modale `!` ou le patch de programme Épaules 3D.

Nouvelle frontière :

```txt
programs/config.js = configuration statique
scripts/charge/mouvements.js = alias / noms canoniques / compatibilité équipement
scripts/charge/suggestion.js = décision de charge suggérée
scripts/ui_modals.js = modale jaune ! et historique visible
app.js = orchestration
```

Point à vérifier manuellement : les programmes qui contiennent encore des mouvements non disponibles, comme `Chest Supported Row`, ne sont pas modifiés par cette étape. Cette étape nettoie la frontière du moteur, elle ne réécrit pas les programmes.


# Contrat de flux de donnees - Racine

## Objectif

Ce document fixe qui ecrit quoi, quand, et quelle source doit etre consideree comme prioritaire entre le journal brut des seances et l etat derive utilise par le moteur.

## Regle centrale

```txt
resultats = journal brut reconstructible
state.history = copie locale de lecture rapide
athlete_state = etat derive pour le moteur
data/charges.js = configuration equipement, jamais reecrite par une seance
```

Le journal brut gagne sur l etat derive quand il faut reconstruire ou auditer. L etat derive gagne pour les decisions rapides du moteur pendant l usage normal.

## Flux de sauvegarde

```txt
collectSessionResults()
  -> CoachCharge.enrichSessionResults(results)
  -> payload.resultats
  -> updateRefsFromResults(results)
  -> CoachCharge.updateAthleteStateFromResults(results, date)
  -> state.history.push(session)
  -> save()   // CoachState.writeState(state) -> localStorage
```

Persistance **locale uniquement** : `save()` écrit dans `localStorage` via
`CoachState`. La sync GitHub (`saveToGitHub` / `savePersistentStateToGitHub`) a été
retirée du code — aucun envoi réseau lors d'une sauvegarde de séance.

## Roles

### resultats

- Source brute de ce qui a ete saisi pendant une seance.
- Sert a auditer une seance exacte.
- Doit permettre de reconstruire athlete_state si l etat derive devient incoherent.
- Ne doit pas etre modifie apres coup pour corriger une decision moteur.

### state.history

- Copie locale pratique du journal des seances.
- Sert aux vues rapides, au resume et aux fallbacks locaux.
- Ne doit pas devenir une deuxieme logique concurrente du moteur.

### athlete_state

- Etat derive optimise pour le moteur de charges.
- Contient les capacites, ranges, historique recent par mouvement, RPE et statuts utiles.
- Peut etre reconstruit depuis resultats si necessaire.
- Peut refuser de remplacer une capacite principale quand le contexte est technique, WOD, recovery ou autre contexte limite.

### Reconstruction de l etat derive (rebuildRefsFromHistory)

- Rejoue `state.history` pour reconstruire movementRefs, rpeHistory et athlete_state (correction d une seance passee).
- V5.4.0 : les saisies manuelles qui ne viennent pas du journal (references de l onglet Charge, sources `manual_recalibration`, `manual_pr`, `manual_charge_override`) sont mises de cote puis rejouees a leur date, entre les seances. Une seance plus recente peut toujours les remplacer. Rien n est perdu par une reconstruction.
- Une ligne `skipped` (« Non fait ») n a ni charge ni reps ni RPE : elle ne nourrit ni le moteur, ni athlete_state, ni les moyennes.

### state.profile.records (trophees)

- Records personnels dates, `{cle: {value, date, unit, source}}`. Jamais lus par le moteur de charges.
- Ecrits par la saisie manuelle (onglet Charge) et, pour les champs `single` de `TROPHY_FIELDS` (app.js), par un VRAI single plus lourd que le record a la sauvegarde d une seance.
- Migration unique `profile.recordsBackfill` : remplit les champs vides depuis `state.history`, ne modifie jamais un record existant.
- N ecrivent jamais athlete_state, movementRefs ni une cle de calibration du profil.

### state.profile.calibrationLog (V5.3.3, optionnel)

- `{cle: {date, value, previous, previousRatio, source, prior?}}` : date de la derniere saisie d une cle de calibration, et ce qu elle remplace.
- Ecrit uniquement par `CoachOnboarding.setCalibrationValue` / `undoCalibrationValue`. Absent d un ancien profil ou export : rien ne casse, la date retombe sur la creation du profil.
- Lu par `CoachOnboarding.calibrationGaps()` (lecture seule) : une calibration n est « depassee » que par une preuve plus recente qu elle. Le signal ne reecrit jamais une calibration ; seul un geste confirme de l athlete le fait.

### data/charges.js

- Configuration stable des charges et de l equipement.
- Ne doit jamais etre reecrit automatiquement par une sauvegarde de seance.
- Ne represente pas la capacite reelle de l athlete.

## Priorite en cas de conflit

1. Pour comprendre ce qui a vraiment ete fait: lire resultats.
2. Pour proposer une charge pendant la seance: lire athlete_state.
3. Si athlete_state contredit clairement le journal brut: reconstruire athlete_state depuis resultats plutot que modifier resultats.
4. Si une entree est contextuelle, le moteur doit filtrer par contexte avant de l utiliser comme progression principale.

## Interdictions

- Ne pas ajouter une nouvelle source de verite durable sans documenter son role ici.
- Ne pas faire ecrire data/charges.js par une seance.
- Ne pas laisser state.history et athlete_state prendre deux decisions concurrentes.
- Ne pas utiliser un resultat WOD ou technique pour ecraser une capacite principale sans filtre de contexte.

## Verdict

L historique est un outil du moteur, mais le journal brut et l etat derive n ont pas le meme role. Le moteur lit une synthese derivee; l app conserve le journal brut pour audit, affichage et reconstruction.


## Ce que l'export doit emporter (depuis V4.5.59)

L'export JSON est le **seul** mécanisme de sauvegarde : aucune copie serveur,
perte définitive. Il ne suffit donc pas qu'un export se relise lui-même — il doit
emporter **tout ce qui vit sous la clé d'état du profil**.

```txt
racineState::<id>                     → bloc `state`
racineCharges::<id>                   → bloc `customCharges`
racineState::<id>::<suffixe>          → bloc `stateExtras` (mémoire Brain…)
```

`customCharges` n'est plus lu par le moteur depuis V5.2.4 (charges forcées désactivées) mais reste exporté et réimporté tel quel : désactiver n'est pas effacer.

`stateExtras` est balayé **par préfixe**, jamais par nom de clé : le suffixe
porte une version (`brain-memory-v1`) et une version future doit être emportée
sans que `storage.js` ait à la connaître.

Contrôle à refaire à chaque ajout d'une clé de stockage : écrire sur un appareil,
exporter, importer sur un stockage vierge, comparer. Un aller-retour qui perd une
clé en silence est un défaut de sauvegarde, pas un détail de format.

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

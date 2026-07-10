# Idées futures — Racine

Idées discutées mais volontairement pas encore construites. À relire avant
d'entamer un nouveau chantier. Aucune n'est un engagement.

## 1. Remplacements de mouvements par client (priorité naturelle)

**Besoin d'origine** : un client dit « mon Bench Press va mal, je veux le faire
aux haltères ». Le coach doit pouvoir ajuster SON app sans toucher le programme
template ni les autres clients.

**Version minimale retenue** (après brainstorm, on a rejeté le système complet
de patchs coach→client comme trop gros pour commencer) :

- Une petite liste « remplacements » propre à chaque profil :
  `Bench Press → DB Bench Press` (+ note optionnelle).
- Partout où la séance du client affiche le mouvement d'origine, l'app montre
  le remplaçant. Retirer la ligne = retour au programme original.
- Un seul écran admin : choisir le client, voir les remplacements actifs,
  « + Ajouter » avec deux champs.

**Point d'implémentation identifié** : `buildWorkout(day, week)` dans
`programs/workouts.js` est l'entonnoir unique par lequel passent toutes les
vues (séance guidée, résultats, PC, WOD+, diagnostic). La couche de
remplacements s'applique sur les blocs retournés, juste avant le `return`.
Stockage dans le state du profil (`racineState::<id>`) → isolation par client
garantie par construction. Le moteur de charges suit tout seul (le nouveau nom
passe dans `CoachCharge.suggestLoad`, seeds en filet).

**Garde-fous** : jamais muter `focusConfigs`/templates ; matching par nom
normalisé (la règle des noms de mouvements du STRUCTURE_CONTRACT protège) ;
check dev dédié avant toute release.

**Signal pour démarrer** : le coach se retrouve à répéter souvent le même
ajustement verbal à ses clients. En attendant, solution à zéro code : le dire
en personne, le client loggue le mouvement de remplacement et le moteur suggère
une charge via les seeds.

## 2. Communication coach → client complète (plus tard, seulement si besoin)

Le brainstorm complet existe dans l'historique de session (2026-07-10) :
patchs déclaratifs (`replace_movement`, `adjust_entry`, `remove_entry`,
`add_note`), portée séance/semaines restantes/cycle, statuts
proposé/accepté/refusé, export texte avec marqueurs
`RACINE_COACH_PATCH_START/END` sur le modèle d'Avis IA (`scripts/ai/ai_import.js`),
bandeau « Ton coach propose… » avec Accepter/Refuser, historique des
modifications. L'idée 1 est conçue pour pouvoir évoluer vers ceci sans
migration : un remplacement est un patch minimal.

## 3. Divers

- Bannière d'installation : ajouter des captures d'écran illustrées dans le
  guide si des clients bloquent encore sur les étapes Safari.

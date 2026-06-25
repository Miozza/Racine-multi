# Contraintes UI Racine

## Priorité

Racine est utilisé en entraînement réel. La priorité est :

1. lisibilité;
2. rapidité d’action;
3. stabilité iPhone/PWA;
4. absence de débordement horizontal.

## Mobile

- WOD+ et Séance restent mobile-first.
- Les vues doivent rester lisibles autour de 402 px CSS de largeur.
- Les actions critiques doivent être faciles à toucher avec le pouce.
- Ne pas dépendre d’une hauteur fixe.
- Respecter les safe areas iOS.
- Garder le zoom natif accessible; ne pas bloquer l’accessibilité pour masquer un problème UI.

## Séance guidée

- Timer visible.
- Start/Pause/Reset faciles à toucher.
- Poids/Reps/RPE utilisables fatigué.
- Éviter les petits contrôles précis.
- Les contrôles Reps/RPE compacts `− valeur +` doivent rester sur une ligne autant que possible.

## Résultats

- Résultats reste séparé de PC.
- Retour WOD visible.
- Sauvegarde claire.

## PC

PC sert à inspecter, comprendre et exporter. Il ne doit pas devenir un Builder et ne doit pas modifier directement les programmes.

## Vue séance — règles verrouillées

Ces règles sont obligatoires à partir de V51.24.

### Timer WOD

- Format : minutes sans zéro inutile.
  - OK : `9:12`, `8:00`, `0:45`, `10:00`, `60:00`.
  - Interdit : `09:12`, `08:00`, `00:45`.
- Les secondes restent toujours à deux chiffres.
- La taille du timer ne doit pas être fixe.
- La taille doit viser environ 95 % de la largeur interne disponible.
- La taille doit rester stable par format : utiliser un gabarit de mesure (`8:88` ou `88:88`) plutôt que la forme exacte des chiffres affichés.
- Le timer ne doit jamais dépasser horizontalement.
- Les boutons du timer doivent rester accessibles.

### Accessibilité vue séance

- Les boutons `Précédent` et `Bloc suivant` doivent toujours rester accessibles en portrait iPhone.
- Les boutons internes du timer doivent toujours rester accessibles.
- Le contenu d’un bloc long doit scroller à l’intérieur de la vue au lieu de pousser les actions hors écran.
- La vue séance est prioritaire sur les autres vues mobiles : ne pas casser son layout pour corriger PC, Historique ou WOD+.

## Socle anti-régression — règles courtes

Ces règles ne doivent pas devenir une longue liste. Elles protègent seulement les acquis sensibles.

1. **Vue séance iPhone** : tout élément d’action doit rester accessible en portrait.
2. **Timer WOD** : minutes sans zéro inutile, secondes à deux chiffres, viser environ 95 % de la largeur utile, jamais coupé.
3. **Résultats** : poids, reps et RPE utilisent les contrôles compacts `− valeur +`.
4. **Charges haltères** : aucune vue ne doit recréer sa propre liste; utiliser les helpers d’équipement communs.
5. **Historique** : `CHANGELOG.md` reste le seul historique de version.

Les règles de format timer, de charges disponibles, de RPE et de résultats doivent vivre dans des helpers communs lorsque possible. Une vue ne doit pas recopier une logique déjà existante dans une autre vue.

## Contrat charge / avertissement séance

- Le bouton jaune `!` / `⚠` de la vue séance doit afficher l’historique des poids utilisés quand une charge est suggérée ou surveillée.
- La source ne doit pas dépendre uniquement de `athlete_state`; `state.history` doit servir de fallback.

## Bouton jaune `!` / `⚠` — historique de charge

Contrat court : la modale doit rester utile et courte. Elle doit afficher d’abord `Historique des poids utilisés`, puis seulement une raison courte.

Sources obligatoires : `athlete_state` et `state.history`.

Correspondance obligatoire : le mouvement peut arriver sous `name`, `title`, `label` ou `movement`; les noms alternatifs/partiels doivent matcher, par exemple `DB Shoulder Press` avec `DB Shoulder Press / Landmine Press`.

## Contrat suggestions de charges accessoires

- Les vues Séance / Résultats / PC ne doivent pas perdre une suggestion parce que le programme écrit `léger`, `modéré` ou une variante de nom.
- Les alias de mouvements doivent passer par les helpers communs : `DB Shoulder Press`, `DB Shoulder Press / Landmine Press`, `Lateral Raise haltères`, `Rear Delt Fly haltères`, `Overhead Rope Extension — rappel vendredi`, `Wide-Grip Cable Upright Row`.
- Le vendredi Épaules 3D est un cas de validation obligatoire : press DB, giant set épaules, upright row câble, overhead rope extension et power clean technique doivent afficher une charge utile si historique ou repère existe.


### Contrat mapping charges par équipement

- Les alias de charge ne doivent pas fusionner deux équipements différents : DB ≠ câble ≠ machine ≠ barre ≠ poids du corps.
- `Lateral Raise haltères`, `Lateral Raise câble bas` et `Lateral Raise machine` sont des historiques distincts.
- `Rear Delt Fly haltères`, `Rear Delt Fly câble bas` et `Rear Delt Fly machine` sont des historiques distincts.
- `DB Shoulder Press` et `Landmine Press` sont distincts; le nom combiné reste un contexte séparé s’il existe.
- Les suffixes internes comme `— rappel vendredi` peuvent exister dans un programme, mais ne doivent pas apparaître dans l’interface utilisateur.


## Noms de mouvements simples

- Le nom affiché d’un mouvement doit rester simple.
- Interdit dans un nom de mouvement : préfixes `A1.`, `B1.`, `C2.`, commentaires comme `technique`, `progression`, `tempo`, `pump`, `rappel`, `léger`, `modéré`, `contrôlé`.
- L’équipement reste dans le nom quand il influence la charge : DB, câble, barre, machine, KB, poids du corps.
- Les anciens noms restent seulement comme alias de transition dans le moteur.


## Format midi dense

Pour les cycles construits autour du midi, le WOD court est un bloc productif obligatoire. Le temps se récupère sur les transitions, les blocs redondants et la mobilité longue, pas sur les minutes de fonte utile.

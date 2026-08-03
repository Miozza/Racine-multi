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
- La taille doit rester stable par format : mesurer un **gabarit**, jamais la forme
  exacte des chiffres affichés — sinon le chrono change de taille à chaque seconde.
- Le gabarit est le plus large affichage **qui peut réellement apparaître dans ce
  timer**, pas `88:88` par défaut. Dans Orbitron un `1` fait moins de la moitié
  d'un `8` : un timer de 11 min mesuré sur `88:88` perdait 15 % de taille pour une
  largeur qu'il n'atteindrait jamais. Le gabarit reste constant pendant toute une
  phase de format (`10:00` → `10:00`, puis `0:00` sous la barre des 10 minutes).
- Le gabarit doit rester un **majorant** de tout affichage possible du timer :
  jamais plus étroit que le pire cas, sinon le chrono déborde.
- Les deux-points ont leur propre boîte (`.guided-timer-colon`) avec une marge :
  l'interlettrage négatif du chrono les fondait dans la barre du `1`, et `1:00`
  se lisait `100`. Cette marge doit être incluse dans la mesure de taille.
- Le timer ne doit jamais dépasser horizontalement.
- Les boutons du timer doivent rester accessibles.

### Timer éditable

- **La taille des chiffres du chrono prime sur tout.** `fitGuidedWodTimer()` la
  calcule à partir de la place restante : tout élément ajouté à la carte timer qui
  occupe de la hauteur dans le flux la fait baisser. Une pastille bordée autour du
  libellé a coûté 13 px de carte, soit 11 px de police sur une carte dense. Ce qui
  s'ajoute là doit être en position absolue ou reprendre exactement la boîte
  existante.
- Le libellé du timer est le bouton d'édition (durée, intervalle des bips, sens).
  L'édition vit dans une modale : aucune rangée de contrôles ne doit être ajoutée
  à la carte WOD, sous peine de reprendre l'espace du timer ou des boutons de bloc.
- L'édition ne modifie ni le programme ni les résultats : elle vit dans le bloc de
  séance et « Rétablir » revient aux valeurs du programme.
- Les chiffres géants du timer débordent visuellement au-dessus de leur boîte
  (`line-height` < 1) et capturent le tap. Tout contrôle placé dans cette zone doit
  être positionné au-dessus de ce débordement.

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

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
- `1`, `4` et `7` n'ont aucune approche à gauche dans Orbitron : ils reçoivent la
  leur (`.guided-timer-n1/n4/n7`), sinon ils se collent au caractère précédent.
- **La largeur fixe la police, la hauteur libre est occupée par un étirement
  vertical.** Cinq caractères sur 402 px ne peuvent pas dépasser ~100 px de haut
  sans déformer : le vide restant sous les mouvements est comblé en étirant les
  chiffres, jamais en changeant leur largeur. Le calcul doit rester idempotent —
  remettre l'étirement à zéro avant toute mesure, sinon il mesure un espace déjà
  comblé et retombe à 1.
- L'affichage du chrono est en `pointer-events:none` : ses chiffres débordent
  visuellement leur boîte et captaient les taps destinés au libellé et aux
  contrôles. Ne rien y mettre d'interactif.
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

### Pastilles de mouvements du WOD (`guided-wod-moves`)

- **Une pastille = UN mouvement**, jamais une phrase. Le texte du WOD se découpe
  sur `+`, `;` et « puis » ; une étiquette de position (« minutes paires : »,
  « station 3 : ») est retirée **seulement si un nombre la suit**, sinon on
  couperait un vrai texte.
- **Un nombre suivi d'une unité de temps est une durée, pas des répétitions.**
  Quand le temps mesure l'effort entier (« 10 à 15 min **de** marche inclinée »),
  le segment ne produit **aucune** pastille : le bloc affiche son texte complet,
  c'est le rendu juste. Quand le temps est la dose d'un vrai mouvement
  (« 20 sec side plank/côté »), la pastille reste et l'unité quitte le nom.
- **Le nom est borné** : il s'arrête au premier connecteur de consigne
  (`,` `.` `—` « puis » « si ») et ne dépasse jamais `WOD_NAME_MAX` caractères.
  `.guided-wod-name` ne tronque pas — sans borne, un texte de programme mal formé
  déborde de la pastille. « avec » n'est **pas** un connecteur : il appartient à
  de vrais noms (« Marche avec haltères »).
- Les plages et pyramides restent entières comme libellé de reps (`8–10`,
  `21-15-9`). Tout code qui calcule sur `mv.reps` doit donc en extraire un nombre
  (`wodMoveMaxReps()`), jamais faire d'arithmétique directe sur la chaîne.
- Ces règles vivent dans `parseWodStructure()` (`app.js`), qui alimente **aussi**
  la capture de résultats : une erreur d'analyse se voit à deux écrans.
  Garde-fou : `dev/wod_moves_checks.js`.

### Rounds AMRAP tapés sur le chrono

- Sur un WOD AMRAP, toute la carte du chrono est le compteur : un tap ajoute un
  round. Les boutons (▶ Ⅱ ↻, libellé d'édition, toggle son) en sont exclus —
  sans cette exclusion, chaque action du chrono ajouterait un round au passage.
- Le panneau des rounds vit **au-dessus** de la boîte du chrono, jamais dedans.
  La police du chrono se calcule sur la largeur : elle n'est donc pas touchée.
- Les splits sont en **grille à 4 colonnes**, pas en bande défilante. Mesuré sur
  402 px : après le compteur et le `↩`, une ligne horizontale ne tient que
  ~2,6 temps lisibles à 21 px — dès 4 rounds, R1 et R2 sortaient de l'écran.
  La grille en montre 12, puis défile verticalement.
- La place vient des **cartes de mouvement, repliées sur une ligne**, et
  seulement à partir du premier round tapé : avant, l'athlète doit lire ses
  mouvements en grand. Tant qu'aucun round n'est compté, la carte WOD garde
  exactement son allure d'origine.
- Le retour d'un tap reste discret : vibration courte, aucun son, aucune
  modale. Le WOD est en cours, l'athlète n'a rien à confirmer.

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

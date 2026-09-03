# ETAT ACTUEL — V5.0.5

Version actuelle : V5.0.5

## État courant

### Le conditionnement non fait entre dans le journal

Le metcon de fin sauté est un cas réel et récurrent : il manque du temps, il fait
trop chaud, quelque chose fait mal. L'athlète n'avait que deux issues, et les deux
mentent au journal — écrire « pas fait » dans la note, qui est du texte libre que
rien ne relit, ou ne rien saisir, ce qui est indistinguable d'une séance jamais
ouverte. Dans les deux cas l'historique ne **savait** pas.

Un lien discret en bas de la carte WOD de l'écran Résultats — « Conditionnement
non fait » — déplie trois motifs : **manque de temps**, **chaleur extrême**,
**blessure**. La ligne de résultat existe alors, dit qu'elle n'a pas été faite,
et dit pourquoi. Réversible : « Finalement je l'ai fait » remet tout en place.

Volontairement discret, parce que c'est une porte de sortie rare : un lien texte
en retrait, aucune chrome de bouton, aucune couleur d'alerte, et les motifs ne se
déplient qu'après une première intention. Aucun jugement non plus — sauter un
metcon parce qu'il fait 34 °C est une décision d'athlète, pas un échec à
signaler.

**La règle qui compte : une ligne annulée ne porte aucune donnée de
performance.** Pas de RPE, pas de rounds, pas de temps, pas de splits. C'est ce
qui la rend inoffensive pour le reste du moteur : les moyennes de fatigue
(`scripts/season/suggest.js`, la collecte ML de `scripts/session/save.js`) lisent
le champ `rpe` de **chaque** ligne sans distinction de nature. Un RPE laissé sur
un metcon non fait entrerait donc dans la moyenne avec l'effort d'une séance qui
n'a pas eu lieu. Le nettoyage est fait à la **collecte**, après le cache de
séance : l'athlète peut avoir saisi un RPE avant de changer d'avis.

La note, elle, survit — « genou droit, arrêté après 2 rounds » est exactement ce
qu'un motif de trois mots ne peut pas dire.

Deux champs **ajoutés** à la ligne de résultat, `skipped` et `skipReason`, en
texte ordinaire comme le reste du journal : donc exportables et réimportables,
sans clé renommée et sans migration. Un export d'une version antérieure reste
importable ; une version antérieure qui relirait un export récent ignore deux
clés qu'elle ne connaît pas.

Domaine : `scripts/session/wod_skip.js`, porte publique `window.CoachWodSkip`.

### Un lest sur le poids du corps n'emprunte le ratio de personne

Le ratio d'une famille dit « cet athlète soulève X fois la référence » sur une
charge **totale**. Un `Weighted Pull-up` et un `Weighted Dip` ne portent pas une
charge totale : ils portent le supplément posé sur un corps qui pèse déjà. Les
deux échelles n'ont aucune commune mesure.

L'onboarding le dit déjà : le test de tractions est « reps seulement », justement
parce qu'« une traction lestée ne s'estime pas au 1RM à partir d'un autre
mouvement ». Le repli par famille de `scaling.js` contredisait cette décision
juste après.

Mesuré sur un profil réel : ratio de tirage **1,60** (borne haute du clamp)
appliqué à un lest de traction, alors que le rapport entre son lest mesuré et
celui de la référence vaut environ **0,43**. Un 30 lb écrit sortait à 48 lb — sur
le mouvement où la marge d'erreur est la plus faible.

Sans emprunt, la charge écrite passe telle quelle et l'historique reprend la main
dès la première séance loggée. Direction sûre, conforme au commentaire déjà en
place dans `scaling.js` : sous-suggérer coûte une série trop légère, sur-suggérer
coûte une épaule.

Le périmètre s'arrête aux deux mouvements déclarés dans
`COACH_MOVEMENT_TUNING.bodyweightExternalLoadPatterns`. Tout le reste — `Pull-Up`
sans lest, `Barbell Row`, `Cable Curl`, `Face Pull`, `Lat Pulldown`, `Bench
Press`, `Ring Dip`, `Push-Up`, `Back Squat` — garde son ratio de famille. C'est le
**lest** qui déclenche la règle, pas le nom du mouvement.

**Ce qui n'a pas été fait.** Le double comptage de `chestRow8RM` dans
`_upperPull` reste en place : le test de rowing écrit la même mesure dans deux
clés aux références différentes (155 et 135), si bien qu'une seule série compte
deux fois, la seconde 15 % plus haut. Le corriger déplacerait le ratio de tirage
de **sept** mouvements (rowing, curl, face pull, rear delt, lat pulldown,
tractions non lestées…) sur tous les profils déjà calibrés — et ne toucherait pas
du tout les dips lestés, qui sont dans la famille poussée. C'est une décision
séparée, pas un correctif de passage.

### Barbell RDL dans la bibliothèque

La charnière postérieure du lundi de `Phase 2 — Fable 5` passe des haltères à la
barre, à la demande de l'athlète : plus de charge disponible, et plus pratique à
charger. `Barbell RDL` est un **mouvement à part entière**, pas un alias du
`DB RDL` — un total à la barre et une charge par main ne sont pas la même échelle,
et les lier ferait exactement ce que `docs/CHARGE_PROGRESSION_CONTRACT.md` § 2
interdit. L'historique du DB RDL reste intact sous son nom ; le Barbell RDL part
de son propre repère, **170 lb**, l'équivalent des 2 × 85 lb travaillés aux
haltères.

Le mouvement est déclaré partout où le moteur en a besoin : repère de charge
(`defaultLoadSeeds`), libellé canonique, famille d'équipement `barbell` (pas de
pas de 5 lb par main), profil Brain `hinge_barbell` — la charnière aux haltères
porte un vocabulaire de « progression limitée par les haltères disponibles » qui
est faux sur une barre —, sensibilité, export IA et lien vidéo.

Un piège mérite d'être noté, parce qu'il se re-tendra :
`coachDefaultLoadSeedForMovement()` ne teste pas le nom du mouvement, il
**concatène tous ses alias** et cherche dans la chaîne entière. Les alias de
`DB RDL` contiennent l'ancien nom ambigu `DB RDL ou Barbell RDL`. Un motif
`/barbell rdl/` placé au-dessus de `/db rdl/` capturait donc le DB RDL et lui
donnait 170 lb **par main** au lieu de 60. L'ordre dans `defaultLoadSeeds` est le
correctif ; un test le tient.

### La mémoire d'un mouvement ne se confond plus avec celle d'un voisin

`athleteMovementRecord()` a un dernier recours : quand un mouvement n'a aucun
enregistrement à son nom, il cherche un nom voisin. Ce repli existe pour rattraper
une variante d'**écriture** — tiret, casse, pluriel, ordre des mots. Il comparait
des sous-chaînes, dans les deux sens, avec pour seul garde-fou une longueur
minimale sur le nom *demandé* ; le nom *stocké*, lui, pouvait être aussi court
qu'on veut. Or « close grip bench press » contient « bench press ».

Mesuré sur le catalogue (188 mouvements) : **137 paires se lisaient l'une pour
l'autre**, dont `Bench Press` → `Close-Grip Bench Press`, `Deadlift` →
`Romanian / Stiff-Leg / Sumo`, `Row` → `Pendlay / Barbell / Seated Cable`, et
`Pull-Up` → `Weighted Pull-up` — ce dernier en contradiction directe avec
`docs/CHARGE_PROGRESSION_CONTRACT.md` § 2 (« poids du corps ≠ charge ajoutée »).

Effet mesuré bout en bout : un historique de Bench Press à 245 lb × 3 @ RPE 8
faisait proposer **245 lb pour un Close-Grip Bench Press jamais travaillé**, avec
une raison qui disait « RPE 8 sur la dernière série » comme si la séance était la
sienne. Un prise serrée vaut ~10 % de moins qu'un couché large : la confusion
partait du mauvais côté.

La règle est maintenant : **mêmes mots, quel que soit leur ordre et leur
ponctuation**. Un mot en plus est un mouvement différent. Restent couverts —
`Band Pull-Apart` / `Band Pull Apart`, `Hammer Curl` / `Hammer Curls`,
`False Grip Ring Row` / `Ring Row False Grip`. Le déclenchement n'a de toute façon
lieu que si le mouvement demandé n'a **aucun** historique propre : une seule séance
loggée, et il lit la sienne.

Restent 36 rapprochements, tous **déclarés explicitement** dans
`coachMovementLookupLabels()` et `canonicalMovementLabel()` — `Step-Up` ≡
`DB Step-up`, `Ring Row` ≡ `Ring Row Strict`, `Transitions` ≡
`Wall Ball to Burpee Transitions`… Ce sont des ponts d'historique voulus, écrits à
la main. Certains mériteraient d'être rediscutés (`Step-Up` ≡ `DB Step-up` mêle
poids du corps et haltère), mais les modifier déplacerait de l'historique déjà
stocké : ça se décide, ça ne se corrige pas au passage.

### La mémoire ne dépend plus du titre d'un bloc

Trois corrections, toutes parties d'une trace de cycle réelle de `phase2_fable5`
(112 entrées, 8 semaines, générée le 2026-09-02).

**La clé de contexte lisait le titre du bloc et le jour.** `coachMovementContextKey()`
mélangeait deux choses : l'identité d'exécution d'un mouvement (nom, équipement,
intention, kind) et son emballage de programmation (titre du bloc, jour). Renommer
une section du programme suffisait donc à effacer le passé d'un mouvement. Mesuré
sur la trace : 9 des 12 séances de Face Pull écartées — même nom, même câble, même
intention, même kind, seul le titre différait (« C. Rear delt / posture » contre
« C. Posture + coiffe »). Deux mois de progression 60 → 90 lb invisibles, sur le
motif d'écart le plus fréquent de tout le fichier (80 occurrences cumulées). Le
titre et le jour restent lus par `coachExtractMovementIntent()` : c'est leur bon
usage — l'intention extraite entre dans la clé, le texte brut n'y entre plus.

**Les charges de Fable 5 étaient écrites à l'échelle d'un athlète réel.** Une charge
chiffrée dans un programme est un %1RM de l'athlète de référence ; `scaling.js` la
ramène ensuite au niveau du profil actif. Le fichier portait les charges de travail
d'un athlète, qui passaient donc deux fois à l'échelle. Le sens de l'erreur suit le
ratio : il écrase le bas du corps et gonfle le haut. Mesuré, en % du 1RM estimé de
l'athlète — Strict Press 96 / 105 / 108 % pour un 5×3, un 4×3 et un 3RM ; Weighted
Pull-up 77 / 103 / 128 % ; et à l'inverse Box Squat 57 / 60 / 62 % là où la vague
RPE 7→8→9 demande 76 / 83 / 92 %. Les huit semaines sont réécrites à l'échelle de
référence. Les trois tests d'ancre de S8, le Weighted Pull-up et le squat vitesse
passent en pourcentage : un pourcentage se résout sur la capacité mesurée et ne
traverse pas le ratio de profil.

**Deux trous de volume comblés dans Fable 5.** Sur trois mois d'historique réel :
15 répétitions lourdes de quadriceps par semaine, et aucun travail direct de bras.
Un Bulgarian Split Squat le lundi, un Cable Curl le mardi, une Overhead Rope
Extension le jeudi — en accessoires, à 1-2 reps de l'échec. Les mouvements A et les
tests de S8 ne bougent pas. Ce qui n'a **pas** été ajouté : de la poussée horizontale
en rotation A, parce que l'historique dit que le Close-Grip Bench est le meilleur
lift de cet athlète (e1RM 275 lb contre 235 au Back Squat) — c'est le quadriceps qui
manque de volume, pas le pectoral.

Racine est un prototype multi-utilisateur local. Cette version corrige un défaut remonté par une trace de cycle réelle : le moteur amputait des charges qu'il n'avait aucune raison de toucher.

**Un bloc léger n'est pas une semaine de deload.** `coachIsDeloadWeekOrContext()` retournait vrai dès que le contexte portait `isLight`. Un mouvement étiqueté léger était donc traité comme une semaine de deload et sa charge réduite à 80 % de la dernière référence — à chaque séance, indéfiniment.

Deux notions confondues. Un bloc léger ne doit pas **auto-progresser** : c'est déjà garanti par `coachIsLimitedProgressionContext()`, qui lit toujours `isLight` et n'a pas changé. Mais il ne doit pas non plus être **amputé** : rien dans « léger » ne dit « enlève 20 % à ce que l'athlète soulève déjà ».

Mesure sur le catalogue au moment du correctif : 2 189 exercices étaient mis en deload, dont **122 par un vrai mot** (*deload*, *récupération*) et **2 067 par le seul `isLight`** — un faux positif dix-sept fois plus fréquent que le vrai cas. Le mot déclencheur n'avait souvent aucune valeur de consigne de charge : « coudes **légèrement** fléchis » suffisait.

Le cas qui a fait remonter le défaut vient d'une trace complète de `phase2_fable5`. Cuban Press, bloc « socle fixe », note « Léger et lent. Rotation externe complète à chaque rep. » L'athlète faisait 15 lb × 10 @ RPE 7,5 depuis trois semaines, le programme écrivait 15-25 lb, et le moteur proposait **10 lb** — sous le minimum écrit *et* sous ce qu'il soulevait — pendant les huit semaines du cycle. Sur ces huit semaines, aucun des deloads appliqués n'était un vrai deload.

Effet mesuré sur ce cycle : 9 suggestions changent (Cuban Press 10 → 15 sur huit semaines, Front Squat 115 → 135 en S7), 12 entrées cessent d'être en deload, aucune n'était légitime. Golden master inchangé, aucune des 51 courbes de `dev/simulate_multi_users.js` ne bouge. Aucun deload réel n'est perdu : ils se déclarent tous par le mot ou par le libellé de semaine.

Reste ouvert, non traité ici : « léger » employé comme **consigne d'exécution** produit toujours un contexte léger, donc coupe l'auto-progression. C'est la cause racine, de la même famille que le mot « vitesse » corrigé précédemment, et elle demande un détecteur de consigne. Sur un bloc dont la note dit « ce bloc ne tourne jamais : c'est le socle », l'absence d'auto-progression est d'ailleurs le comportement voulu.

**Le `kind` d'un bloc déclare enfin son intention.** `coachIsMainLoadContext()` matche `/main/` : un bloc `kind:"main"` était donc traité comme principal pour le deload et le plafond. Mais `coachExtractMovementIntent()` ne lisait que des mots — *lourd*, *force*, *principal*, *hypertrophie* — et le même bloc ne déclarait aucune intention, retombant sur le repli générique. Mesure sur le catalogue : **1 643 exercices** de bloc `main` et **1 720** de bloc `hypertrophy` étaient dans ce cas.

L'effet n'est pas symétrique, et c'est le point. Côté force, 0,40 → 0,50 vaut +0,7 à +3,4 lb avant arrondi ; le cran du rack fait 5 lb sur une barre, donc l'écart disparaît presque toujours (1 cas sur 11 mesurés). Cette moitié corrige une incohérence, pas une charge. Côté hypertrophie, 0,40 → 0,30 est un écart qui **survit à l'arrondi** (5 cas sur 11) : le moteur rattrapait plus vite que ce que la programmation demande, alors que sur un bloc d'hypertrophie des répétitions en plus viennent souvent du volume, pas d'une réserve de force.

Un mot explicite l'emporte toujours, dans les deux sens : un bloc `main` qui écrit « hypertrophie » est traité comme tel, un bloc `hypertrophy` qui écrit « force » aussi. Les autres `kind` — `accessory` en tête — ne sont pas devinés : « accessoire » n'est pas synonyme d'hypertrophie, c'est une décision de programmation.

**L'emplacement de la règle n'est pas négociable.** Elle vit dans `coachExtractMovementIntent()` parce que `coachRederiveStoredContext()` relit les lignes déjà loggées avec ce même détecteur : les deux côtés de la comparaison de contexte bougent ensemble. Placée dans le constructeur de contexte, elle changerait la clé du jour sans changer celle des lignes stockées, et les 28 blocs Power Clean principaux du catalogue perdraient tout leur historique — le bug « vitesse » réintroduit. `dev/intent_from_kind_checks.js` en fait son test central.

Golden master inchangé, aucune des 51 courbes de `dev/simulate_multi_users.js` ne bouge : le changement est correct sans être spectaculaire, et c'est ce que la mesure annonçait.

**Le barreau RPE annonçait des crans qu'il ne pouvait pas donner.** Sur un mouvement d'isolation, `maxJumpBase` vaut un cran nominal et `jumpFactor` vaut 1 : le barreau « 2 crans à RPE ≤ 6 » était systématiquement raboté à un seul. Mesure avant correctif, Lateral Raise DB à 20 lb : RPE 6 et RPE 7,5 donnaient tous deux +2,5 lb — et l'explication à l'écran disait pourtant « Hausse de 2 crans vers 22,5 lb ». C'est mot pour mot le défaut déjà corrigé pour les barres — « le RPE portait presque aucune information » — laissé intact sur l'isolation.

**Le rack fait loi.** Un cran d'équipement est la plus petite progression qui existe réellement : un plafond en pourcentage qui l'interdit ne protège pas, il fige. Deux crans d'haltère font toujours plus de 15 % (20 → 25 = +25 %), donc le plafond relatif interdisait ce barreau à *toutes* les charges. Les crans annoncés par le barreau passent désormais toujours. La contrepartie est stricte : les crans **bonus** de la réactivité (tendance, reps dépassées) restent sous le saut maximal prudent — sinon trois signaux positifs se multiplient et 20 lb mène à 40 lb en une séance sur la foi d'un seul RPE 6.

Résultat : isolation à RPE 6 → 25 lb, à RPE 7 → 22,5 lb, à RPE 8 → pas de hausse. Les barres ne bougent pas, le frein n'y mordait déjà pas. Un seul scénario du golden master a changé, et aucune des 51 courbes de `dev/simulate_multi_users.js`.

**Un seul seuil de confiance.** `brainGate.confidenceFloor` était déclaré dans la table et lu par personne : les trois prudences qu'il déclenche ensemble — exiger plus de confirmations, afficher « incertain », amortir la hausse au portail — portaient chacune leur 0,65 en dur. Les quatre valeurs étant identiques, aucun comportement n'était faux ; mais le fichier dont le contrat est « tout seuil vit ici » mentait. Les trois lisent maintenant la table. Zéro changement de comportement aujourd'hui.

Garde-fou : `dev/rpe_ladder_checks.js`, vérifié par mutation dans les deux sens.

**La calibration du moteur ne se règle plus, elle se lit.** Le panneau ⚙ Réglages → Calibration du moteur exposait 23 paramètres scalaires. Trois mentaient : « Confiance minimale du portail » n'était lu par personne (le seuil est en dur dans `brain_stats.js:252`), « Saut maximal de base » ne s'appliquait à aucun mouvement d'isolation (`historique.js:351` reprend le cran d'équipement), « Convergence du surplus (defaut) » ne se déclenchait que si aucune intention ne matchait — presque jamais. Trente-trois autres constantes du moteur n'étaient pas exposées du tout. Le champ affiché n'était pas le champ qui agissait.

Or le moteur **mesure déjà sa propre erreur**, mouvement par mouvement : `brain_memory.js:215-231` compare la charge proposée à celle réellement faite et étiquette tout seul. `precisionRecent` et `precisionTrend()` existaient depuis des mois et n'étaient lus par **aucune vue** — seulement par un script de test. Le panneau montre désormais ça, et n'offre que les deux gestes qu'aucune mesure ne remplace : poser un plafond en livres, donner une charge de départ. Aucun curseur, aucun pourcentage.

Deux règles de lecture, tenues par `dev/calibration_readout_checks.js` : une prédiction testée qui rate ses répétitions est un **apprentissage** et ne signale jamais rien — l'y mettre pousserait à brider le moteur, la boucle auto-bloquante déjà corrigée sur `brainGate` ; et rien ne s'affiche sous les seuils de prudence. Le seul blocage signalé est celui où Brain n'apprend **rien** : la proposition refusée sans jamais être testée (`humanOverrideDown`), qui n'incrémente pas `testedPredictions` et se reproposera indéfiniment.

Le sélecteur de mouvement plein écran du bouton « + Ajouter un mouvement » est devenu un composant (`scripts/ui/movement_picker.js`) : les deux gestes du panneau passent par lui, donc par des noms exacts du catalogue. L'ancien champ texte libre acceptait « lateral raise db » et stockait un plafond qui ne s'appliquait jamais.

Rappel : `scripts/charge/tuning_override.js` **reste** — outil de dev, borné, testé, emporté par l'export. Les calibrations déjà posées continuent de s'appliquer ; elles ne sont simplement plus modifiables depuis un écran.

**Une preuve récente passe devant une vieille capacité sous surveillance.** Le cap d'`athlete_state` gèle un mouvement tant que sa capacité n'est pas confirmée, avec une porte de sortie : une séance plus récente et contrôlée qui prouve nettement mieux. Cette porte exigeait **+15 lb absolus**, seuil calibré pour une barre et inatteignable sur un mouvement dont toute la plage de travail tient dans 20-40 lb. Cas mesuré : Weighted Pull-up, 30 lb × 3 @ RPE 8 le 18 août, plus récent et propre, incapable de dépasser un cap à 25 lb — il aurait fallu 40 lb, soit +60 %. L'écart exigé est désormais **le plus petit de l'absolu et du relatif** (15 % de la capacité), plancher à un cran d'équipement : l'absolu continue de gouverner les barres lourdes, le relatif débloque les charges légères. Un cap **plus récent** que la dernière séance protège toujours — c'est son rôle.

**Une consigne d'arrêt n'est pas une intention de programmation.** Le mot « vitesse » sert partout dans le catalogue à dire quand s'arrêter — « si la vitesse meurt, c'est fini », « vitesse de barre comme juge ». Le détecteur d'intention le lisait comme une déclaration technique. Deux dégâts, dont le second est le vrai : l'auto-progression était coupée sur un mouvement principal, et surtout **tout l'historique des semaines voisines disparaissait**, parce que le filtre de progression ne compare que des contextes de même nature. Cas mesuré : Pause Back Squat en S3 de `phase2_fable5`, deux semaines à 170 lb × 3 @ RPE 7 ne pesant rien, le moteur reproposant indéfiniment la charge écrite dans le programme. Balayage du catalogue complet : 10 378 contextes analysés, **76 libérés** (Bench Press ×30, Power Clean ×30, Strict Press ×11, Close-Grip Bench Press ×3, Pause Back Squat, DB Shoulder Press), **zéro nouvellement limité**. Un vrai bloc vitesse — celui qui déclare un pourcentage cible — reste un contexte à progression limitée.

**Trace du moteur** (⚙ Réglages → Diagnostic charges). Le panneau `(!)` explique la décision ; il ne dit rien de ce qui n'a jamais atteint la décision. La trace répond ligne par ligne : cette séance a-t-elle compté, et sinon **par quel filtre** a-t-elle été écartée — nature de contexte différente, seed manuel, ligne invraisemblable, clé de contexte. Elle reconstitue aussi ce que le moteur aurait proposé avant chaque séance, en rejouant la cascade sur les seules lignes antérieures. Lecture seule, exportable en JSON ou copiable d'un bouton depuis l'iPhone. C'est l'export à envoyer quand une charge proposée ne colle pas à ce qui a été réellement soulevé.

Rappel des livraisons précédentes, toujours d'actualité : le moteur a une **asymptote** — plafond déduit du comportement (pointe stable **et** effort élevé, jamais déclaré en livres), sortie automatique dès qu'une série redevient moins chère, trois familles de vitesse de plafonnement. Les plafonds **manuels** restent posables par profil et sont stockés sous la clé d'état du profil, donc emportés par l'export. Une preuve récente passe devant une vieille capacité sous surveillance (écart exigé = le plus petit de l'absolu et du relatif). Et une consigne d'arrêt (« si la vitesse meurt ») n'est plus lue comme une intention de programmation.

## La Saison — portée active

- `scripts/season/index.js` : journal `state.season.cycles` (programme, dates, semaines, PR) alimenté à l'archivage/remplacement d'un cycle ; vocabulaire d'objectifs `CoachSeasonGoals`.
- `scripts/season/retention.js` : agrégats mensuels par mouvement (`state.longTerm.byMovement`), 36 mois glissants — collecte silencieuse, aucune analyse.
- `scripts/season/suggest.js` : suggestions de prochain cycle — objectif de l'utilisateur dominant, graphe `suggestedNext`, deload inséré si RPE moyen 14 j ≥ 8,5, diversité en simple départage.
- `scripts/season/ui.js` : bandeau fin de cycle, écran bilan + propositions, frise Saison dans l'onglet Cycle.
- Catalogue : `objective`/`frequency`/`suggestedNext` obligatoires sur tout programme public (matrice : `docs/CATALOGUE_MATRICE.md`) ; semaines de transition deload/tests dans `programs/transition_weeks.js`, reprise après pause dans `programs/retour_au_travail.js`.
- Profil : `state.profile.trainingGoal` posé à l'onboarding et éditable dans Réglages.

## Brain — portée active

- Statistiques locales par mouvement + intention.
- Confiance de prédiction.
- Ambition.
- Sensibilité des mouvements, incluant poids de corps et poids de corps lesté.
- RPE interprété par profil utilisateur : chez Bertin, RPE 8 = signal moyen et RPE 9+ = signal fort.
- Validations multiples adaptatives.
- Option ambitieuse dans le diagnostic lorsque Brain hésite.
- Validation/confort : une charge peut être validée sans être maîtrisée si le coût est très élevé.

## Profils de mouvements

- Nouveau module : `scripts/charge/movement_profiles.js`.
- Les profils décrivent la famille, la sensibilité, le style de progression et le vocabulaire Brain Explain.
- Brain Explain doit utiliser ces profils pour éviter les explications génériques.
- `app.js` ne contient aucune logique de profil.

## Données protégées

Ne pas modifier ni écraser :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`
- `data/charges.js`

## Validations à lancer avant livraison

```bash
node dev/multi_profile_checks.js
node dev/charge_engine_checks.js
node dev/progression_contract_checks.js
node dev/regression_checks.js --full
node dev/structure_checks.js --full
node dev/program_catalog_checks.js
node dev/season_checks.js
node dev/program_calibration_checks.js
node dev/crossfit_quality_checks.js
node dev/strict_muscle_up_checks.js
```

## Documents de référence

- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_AUDIT.md`
- `docs/STRUCTURE_CONTRACT.md`
- `docs/UI_CONSTRAINTS.md`
- `docs/DATA_FLOW_CONTRACT.md`
- `docs/CHARGE_CONTEXT.md`
- `docs/CHARGE_ENGINE.md`
- `docs/CHARGE_ENGINE_TESTS.md`
- `docs/CHARGE_PROGRESSION_AUDIT.md`
- `docs/CHARGE_PROGRESSION_CONTRACT.md`
- `docs/ERROR_LOGGING.md`
- `docs/PHASE_2_EXTRACTION_REPORT.md`
- `docs/CATALOGUE_MATRICE.md`
- `docs/IDEES_FUTURES.md`
- `docs/PROMPT_REFONTE_SYSTEM.md`
- `docs/audit/2026-08-28-moteur-charge-audit.md`
- `docs/audit/2026-08-28-trace-diff.md` (+ traces `-avant.json` / `-apres.json`)
- `docs/superpowers/specs/2026-07-08-la-saison-design.md`
- `docs/superpowers/plans/2026-07-08-la-saison-etapes-1-4.md`


## RPE Profile + Validation Comfort
- Profil RPE personnalisé : RPE 8 = signal moyen, RPE 9+ = signal fort.
- Distinction validation/confort dans Brain Explain.
- Plancher historique traité comme décision Brain quand il agit comme garde-fou.
- Aucune donnée durable modifiée.

- Document officiel : `docs/BRAIN.md`.


## Brain Explain Engine

- `scripts/charge/brain_explain.js` devient la source unique du langage Brain dans le panneau `(!)`.
- Le calcul de charge est gelé; cette passe améliore seulement l’explication.

## Brain Journal

- `scripts/charge/brain_journal.js` est ajouté comme couche consultative.
- Le journal lit la mémoire Brain locale et produit un apprentissage court par mouvement + intention.
- Le panneau `(!)` peut afficher `Journal Brain` lorsque l'information existe.
- Cette version ne modifie pas les charges et ne touche pas aux données durables.



## Avis IA Export

- `scripts/ai/ai_export.js` génère des prompts universels sans API ni abonnement imposé.
- Les exports Avis IA sont consultatifs. Ils ne modifient jamais les charges.
- Le panneau `(!)` peut copier un prompt ciblé sur le mouvement affiché.
- La vue PC peut copier un prompt global pour la séance / cycle sélectionné.


## Avis IA Import

- Import mobile-first dans le panneau `(!)`.
- L’utilisateur colle la réponse IA dans Racine; l’app extrait seulement le bloc structuré avec marqueurs.
- Sauvegarde locale sur l’iPhone via localStorage.
- Avis IA consultatif seulement; Brain garde la décision et aucune charge n’est changée automatiquement.


## Correctif DOM Avis IA

- Le panneau `(!)` regénère maintenant le contenu Avis IA après un import ou un effacement.
- Un avis mouvement et un avis cycle empilés ne peuvent plus laisser un bloc obsolète affiché après effacement.
- Le bouton Fermer dupliqué dans la modale d'import Avis IA a été retiré.
- Aucune donnée durable modifiée.

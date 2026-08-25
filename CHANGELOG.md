## V4.6.7 — La calibration du moteur ne se règle plus, elle se lit

- **Un écran de 23 champs numériques, dont trois qui ne faisaient rien.** ⚙ Réglages → **Calibration du moteur** exposait 23 paramètres scalaires du moteur de charges. `brainGate.confidenceFloor` n'était lu par personne — le seuil est en dur à `scripts/charge/brain_stats.js:252`. `maxJumpBase.default` ne s'appliquait à aucun mouvement d'isolation : `scripts/charge/historique.js:351` reprend le cran d'équipement à sa place. `repsSurplus.fallback.converge`, libellé « défaut », ne se déclenchait que si aucune intention ne matchait — jamais sur un programme étiqueté, et les trois valeurs qui décidaient vraiment n'étaient pas exposées. Trente-trois autres constantes du moteur ne l'étaient pas non plus. Le panneau n'était ni complet ni minimal : le champ affiché n'était pas le champ qui agissait.
- **Le moteur mesurait déjà son erreur, et personne ne pouvait la voir.** `scripts/charge/brain_memory.js:215-231` compare depuis des mois la charge proposée à la charge réellement faite, par mouvement et par intention, et étiquette tout seul : prédiction testée réussie, trop ambitieuse, trop prudente, proposition non testée. `precisionRecent` et `precisionTrend()` étaient calculés et lus par **un seul endroit du dépôt** : un script de test. Aucune vue. Demander un nombre à un humain pour piloter ce que le moteur mesure mieux que lui était l'inverse du travail à faire.
- **Le panneau lit désormais, il ne configure plus.** Précision récente et sa tendance, les mouvements sur lesquels le moteur n'apprend rien, ceux qui n'ont aucun repère de charge. Deux gestes seulement, tous deux **en livres sur un mouvement précis** : poser un plafond, donner une charge de départ. Aucun curseur, aucun pourcentage.
- **Deux règles de lecture, tenues par un garde-fou** (`dev/calibration_readout_checks.js`). Une prédiction **testée** qui rate ses répétitions est un apprentissage : Brain a reçu la donnée et corrige déjà la suivante — elle ne signale jamais un mouvement. L'y mettre pousserait à brider le moteur, exactement la boucle auto-bloquante corrigée sur `brainGate` (le portail gelait les charges, donc plus d'observations, donc la confiance ne remontait jamais). Et rien ne s'affiche sous les seuils : un mouvement à deux séances n'apparaît pas, même trompé deux fois sur deux.
- **Le seul blocage signalé est celui où Brain n'apprend rien.** Quand le moteur propose 145 et que l'athlète met 135, `humanOverrideDown` s'incrémente mais **pas** `testedPredictions` : aucune donnée reçue, la même proposition reviendra indéfiniment. C'est le seul cas où un plafond posé à la main vaut mieux qu'attendre. Second cas : une précision faible dont la courbe **ne descend plus** — la règle de CLAUDE.md §8 appliquée par mouvement. Se tromper en s'améliorant, c'est apprendre.
- **Le sélecteur de mouvement devient un composant.** `scripts/ui/movement_picker.js` — extrait sans changement de comportement de `scripts/session/extra_movements.js` (bouton « + Ajouter un mouvement »), plus la mono-sélection. Les deux gestes du panneau passent par lui : le moteur de charges ne reconnaît un mouvement que par son **nom exact**, et l'ancien champ texte libre acceptait « lateral raise db » puis stockait un plafond qui ne s'appliquait jamais.
- `scripts/charge/tuning_override.js` **reste** : outil de dev, borné, testé, emporté par l'export de profil. Les calibrations déjà posées continuent de s'appliquer, elles ne sont simplement plus modifiables depuis un écran. `dev/tuning_override_checks.js` n'épingle plus le compte exact de paramètres — il épinglait une promesse d'interface retirée ; tout le reste de son contrat est intact.

## V4.6.6 — Les séances mal étiquetées par une ancienne version comptent à nouveau

Résidu du correctif V4.6.1, mesuré dans la trace de cycle de l'athlète : **18 lignes d'historique écartées**, dont sa séance la plus récente.

- **Le problème.** Une ligne d'historique ne stocke pas seulement le texte du bloc : elle stocke les **intentions déjà résolues**, telles que le détecteur les a lues le jour de la séance. Quand le détecteur est corrigé, les lignes déjà écrites gardent leur ancienne étiquette — pour toujours. Le filtre de progression ne mélangeant pas contextes limités et normaux, ces séances restaient invisibles pour le moteur alors même que le bug était réparé. Mesuré : Face Pull en perdait 4, Strict Press 3, Pause Back Squat sa séance du 24 août.
- **La correction.** La ligne stocke aussi son **texte brut** (note, titre de bloc, format, `kind`). Les intentions sont donc **relues à la lecture** avec le détecteur d'aujourd'hui. Rien n'est réécrit : la donnée de l'athlète n'est pas touchée, rien de nouveau ne part dans le `localStorage`, et une future correction du détecteur bénéficiera rétroactivement de la même façon. La relecture est mise en cache par `WeakMap` — donc jamais sérialisée.
- **Le marqueur `context_logged`** posé à la sauvegarde portait le verdict du même détecteur. Il ne fait plus autorité quand la ligne est relisible et que la relecture le contredit ; il garde le dernier mot quand il n'y a rien à relire.
- **Ce qui ne change pas.** Une ligne dont la note dit vraiment « technique » reste un contexte limité — elle est confirmée, pas « réparée ». Une ligne ancienne sans texte brut garde ses intentions et son marqueur : on n'invente pas ce qu'on ne peut pas relire.
- **Vérifié sur les données réelles de l'athlète** : ses trois séances de Pause Back Squat comptent à nouveau (3/3 au lieu de 2/3).
- **Garde-fous** : 8 assertions ajoutées à `dev/charge_engine_checks.js`, dont une qui vérifie que la ligne stockée ressort **octet pour octet identique** après relecture. Validées par mutation (4 mutations, toutes attrapées). Golden master identique sur ses 20 scénarios.
- **Reste ouvert** : le `status` de ces lignes vaut toujours `context_logged`, ce qui les empêche de servir de **plancher de validation**. Elles comptent pour l'échelle RPE, la tendance et la meilleure charge contrôlée — mais pas comme preuve qu'une charge est acquise. Corriger ça demanderait de réécrire le statut stocké, donc une migration : pas fait sans décision explicite.
- **Portée** : `scripts/charge/historique.js`. Aucun fichier `data/`, aucun programme retouché, aucune écriture de stockage ajoutée.

## V4.6.5 — « montée vers 3RM » demande trois reps, pas huit

Trouvé dans la trace de cycle envoyée par l'athlète — exactement ce pour quoi la trace a été construite.

- **Le symptôme.** Le jour le plus lourd du bloc, le moteur proposait **moins** que la dernière série réussie. Pause Back Squat : 145 lb après un 170 × 3 @ RPE 8. Weighted Pull-up : 25 lb après un 30 × 3 @ RPE 8.
- **La cause.** `parseTargetReps()` lit une plage (`8-12`), un schéma de séries (`5×3`) ou un compte écrit (`100 reps`). Le format **`montée vers 3RM` ne matchait rien** et retombait sur la valeur par défaut — 8 ou 10 reps selon l'appelant. Le moteur croyait donc qu'on demandait 8 répétitions un jour de 3RM, constatait que la dernière série de 3 « ne se traduit pas directement en 8 reps », et projetait Epley **vers le bas**. La baisse était logique une fois la cible fausse : c'est la cible qui était fausse.
- **La correction.** Un rep-max **est** une cible de répétitions : `3RM` veut dire trois reps, au maximum de ce qui sort proprement. La lecture est placée après la règle `N×M` (« 5×3 @ 85 % du 1RM » vaut 3 reps, pas 1) et ignorée si le format contient un `%` — « 80 % du 1RM » ne demande pas UNE répétition.
- **Mesuré sur le catalogue** : 7 formats concernés, tous de la forme `montée vers NRM`, et **aucun format du dépôt ne contient de `%`** — le correctif ne peut rien casser ailleurs. Sur le cycle réel de l'athlète (`phase2_fable5`), les 7 séances touchées sont toutes des jours de test : Pause Back Squat, Weighted Pull-up, Strict Press, Box Squat, Pendlay Row, Close-Grip Bench Press.
- **Vérifié sur ses données réelles**, avant/après : Weighted Pull-up 25 → **30 lb**, Pause Back Squat 145 → **170 lb**.
- **Garde-fous** : 6 assertions ajoutées à `dev/regression_checks.js`, propriétaire du contrat `parseTargetReps`. Validées par mutation (retrait de la lecture, retrait du garde-fou pourcentage).
- **Portée** : `app.js` (`parseTargetReps`). Aucun programme retouché, aucune donnée touchée, aucun autre comportement modifié.

## V4.6.4 — La trace du moteur couvre le cycle complet

Demandé par l'utilisateur : « pourquoi pas le cycle complet, ça te ferait mieux connaître le chemin fait et l'historique depuis le début. » Bonne intuition, et pour une raison précise : c'est le **contexte de chaque semaine** qui l'avait piégé sur le Pause Back Squat. Une trace de cycle montre exactement où l'étiquette d'un mouvement bascule d'une semaine à l'autre.

- **Nouvelle portée `cycle`.** `CoachChargeTrace.report('cycle')` parcourt toutes les semaines du programme actif, jour par jour. Un mouvement y apparaît sous le contexte de **chaque** semaine où il est programmé, avec sa charge prescrite, ses intentions lues, sa suggestion et ses séances retenues ou écartées — c'est-à-dire tout ce qui change d'une semaine à l'autre.
- **Le rejeu n'est payé qu'une fois par mouvement.** L'historique d'un mouvement ne dépend pas de la semaine où il est listé : le reconstituer à chaque occurrence coûterait N fois le prix pour N fois le même résultat. La reconstitution se fait donc à la première rencontre, tout le reste est conservé sur chaque occurrence.
- **Mesuré avant de promettre**, sur le programme le plus lourd du catalogue (`heritage225`, 16 semaines × 4 jours) : **259 ms et 443 Ko** pour 288 entrées, contre 27 ms et 32 Ko pour une semaine. Utilisable, mais impossible à coller confortablement dans un message.
- **D'où le partage des deux boutons de la trace** : **Copier la semaine** pour ce qui se colle dans un message, **Fichier — cycle complet** pour le chemin entier. Chaque bouton dit sa portée, le titre du groupe dit déjà le contenu. Le nom du fichier suit : `racine-trace-charges-<cycle>-cycle-complet.json`.
- **Garde-fous** : 12 assertions ajoutées à `dev/charge_trace_checks.js` (50 au total) — toutes les semaines parcourues, tous les jours, une entrée par séance, rejeu unique par mouvement, contexte et suggestion présents sur chaque occurrence, portée semaine inchangée. Validées par mutation.
- **Portée** : `scripts/charge/trace.js`, `index.html`, `scripts/charge_diagnostic_ui.js`. Aucun changement de comportement du moteur, aucune donnée touchée.

## V4.6.3 — Le panneau Diagnostic dit ce que chaque bouton donne

Signalé par l'utilisateur : « j'ai l'impression que ça veut tout dire la même chose. » Il avait raison — j'avais ajouté trois boutons à un panneau qui en comptait déjà quatre, sans jamais réorganiser.

- **Le problème.** Sept actions alignées, nommées par leur *format* et leur *portée* (« Copier JSON séance », « Exporter JSON semaine », « Copier trace semaine », « Exporter trace du jour »…), jamais par ce qu'elles donnent. Rien ne disait laquelle utiliser, ni en quoi un « JSON séance » diffère d'une « trace semaine ». Deux outils réellement différents étaient noyés dans une liste indifférenciée.
- **La correction.** Deux groupes, chacun sous une question en clair — *Les charges d'aujourd'hui ont-elles l'air normales ?* et *Pourquoi le moteur propose cette charge ?* Le premier compare la séance affichée à l'historique et signale les incohérences ; le second sort la trace du moteur à envoyer au dev. À l'intérieur d'un groupe, les boutons ne portent plus que le moyen de sortie — **Copier** ou **Fichier** — puisque le contenu est déjà annoncé par le titre.
- **Deux boutons retirés**, tous deux redondants par leur seule portée : « Exporter JSON semaine » (l'analyse existe déjà pour la séance affichée) et « Exporter trace du jour » (la trace semaine contient le jour). Sept boutons, cinq restent.
- **Les fichiers se distinguent aussi.** L'analyse sort désormais en `racine-analyse-seance-*.json`, la trace en `racine-trace-charges-*.json` — au lieu d'un vieux `coach-beurt-charge-diagnostic-*.json` qu'on ne pouvait pas différencier dans le dossier Téléchargements. La confirmation de copie annonce ce qui a été copié et combien de mouvements.
- **Portée** : `index.html` (le panneau), `scripts/charge_diagnostic_ui.js` (branchements et noms de fichiers). Aucun changement de comportement du moteur, aucune donnée touchée.

## V4.6.2 — Une preuve récente passe devant une vieille capacité sous surveillance

Second défaut signalé par l'athlète sur le même cycle, reproduit à partir de son historique réel.

- **Le symptôme.** Weighted Pull-up : 30 lb × 3 @ RPE 8 le 18 août, propre, et le moteur reproposait 25 lb la semaine suivante.
- **La cause.** Le cap d'`athlete_state` gèle un mouvement tant que sa capacité n'est pas confirmée (statut `watch`/`recalibrating`, ou confiance sous 55 %). Il a une porte de sortie : une séance **plus récente et contrôlée** qui prouve nettement mieux. Cette porte exigeait `bestControlled.load >= capLoad + 15` — quinze livres **absolues**, en dur dans `suggestion.js`. Calibré pour une barre, ce seuil est inatteignable sur un mouvement dont toute la plage de travail tient dans 20-40 lb : dépasser un cap à 25 lb aurait demandé 40 lb, soit +60 %. La porte existait, elle était hors d'atteinte.
- **La correction.** L'écart exigé est le **plus petit** de l'absolu (15 lb) et du relatif (15 % de la capacité), avec un plancher à un cran d'équipement. Même raisonnement que `maxJumpBase.relativeCeiling`, écrit noir sur blanc dans la table depuis V4.5 : un seuil purement absolu n'a pas de sens aux deux extrémités de l'échelle. Le seuil vit maintenant dans `COACH_MOVEMENT_TUNING.athleteStateCap`, pas en dur dans la logique de décision — comme l'exige la règle de tuning par mouvement.
- **Ce qui ne change pas.** Sur une barre lourde, l'absolu continue de gouverner : +10 lb ne balaient toujours pas un cap de surveillance. Et un cap **plus récent** que la dernière séance protège toujours — une capacité écrite après la séance est un signal plus frais que la séance elle-même.
- **Garde-fous** : 3 assertions ajoutées à `dev/charge_engine_checks.js`, rejouant l'historique réel de l'athlète (5 séances du 23 juin au 18 août) plus le cas barre lourde et le cas cap récent. Validées par mutation. Golden master identique sur ses 20 scénarios.
- **Portée** : `scripts/charge/movement_tuning.js` (nouveau bloc `athleteStateCap`), `scripts/charge/suggestion.js` (le seuil lu dans la table au lieu d'être en dur). Aucune fonction gelée touchée, aucun fichier `data/`, aucun programme retouché.

## V4.6.1 — Une consigne d'arrêt n'est pas une intention technique

Défaut signalé sur données réelles, reproduit, corrigé — et l'outil qui manquait pour diagnostiquer les suivants.

- **Le symptôme.** Trois semaines de Pause Back Squat, deux séances à 170 lb × 3 @ RPE 7, et le moteur qui repropose la charge du programme. Le panneau `(!)` ne montrait qu'une seule séance alors que l'Historique les contenait toutes.
- **La cause.** Le mot « vitesse » sert partout dans le catalogue de **consigne d'arrêt** — « Aucune bataille : si la vitesse meurt, c'est fini », « Vitesse de barre comme juge ». Le détecteur d'intention le lisait comme une déclaration **technique**. Le premier dégât est connu : pas d'auto-progression dans un contexte technique. Le second est bien plus grave et invisible : le filtre de progression ne compare que des lignes de **même nature** (contexte limité vs normal), donc une semaine ainsi mal étiquetée **écarte tout l'historique des semaines normales**. Le moteur ne voyait plus qu'une séance — celle du jour — et repartait du nombre écrit dans le programme.
- **La correction.** Les tournures d'arrêt étaient **déjà listées** dans `speedStimulus.cuePatterns`, mais un seul lecteur s'en servait (la détection de bloc vitesse). Le détecteur d'intention les lit maintenant aussi : une liste, deux lecteurs. Un mot technique franc (`technique`, `drill`, `qualité`…) déclare toujours un contexte technique ; un **vrai** bloc vitesse — celui qui déclare un pourcentage cible — reste un contexte à progression limitée, y compris quand il se déclare en clair par `pctOf1RM` sans écrire le mot.
- **Mesuré sur tout le catalogue**, pas sur le cas signalé : 10 378 contextes (42 programmes × semaines × jours × exercices) analysés avant/après. **76 libérés** — Bench Press ×30, Power Clean ×30, Strict Press ×11, Close-Grip Bench Press ×3, Pause Back Squat, DB Shoulder Press — et **zéro** nouvellement limité. Tous sont des mouvements principaux dont la note parle de vitesse de barre comme critère d'arrêt.
- **Trace du moteur** (⚙ Réglages → Diagnostic charges → Copier / Exporter la trace). Le `(!)` explique la décision ; rien n'expliquait ce qui n'atteignait jamais la décision. La trace donne, pour chaque séance de l'historique : retenue ou écartée, et **par quel filtre** — nature de contexte, seed manuel (PR, recalibration, override), ligne invraisemblable, clé de contexte. Elle ajoute la charge écrite dans le programme, le nombre qu'en lit le moteur, la mise à l'échelle du profil, les intentions lues, la suggestion du jour avec sa raison, et une **reconstitution** de ce que le moteur aurait proposé avant chaque séance (rejeu sur les seules lignes antérieures — reconstitution, pas enregistrement : c'est dit dans le fichier).
- **Lecture seule, vraiment.** L'historique est rendu intact et les indices du panneau `(!)` sont reposés tels quels. La première version ne le faisait pas : restaurer la *référence* de l'objet n'annule pas les écritures faites **dedans** — `storeLoadDecisionHint` écrit en place, et sous tous les alias du mouvement. Le garde-fou l'a attrapé en simulant une panne de la suggestion finale.
- **Garde-fous** : `dev/charge_trace_checks.js` (38 contrôles) et 8 assertions ajoutées à `dev/charge_engine_checks.js`, dont celle qui rejoue le cas signalé bout en bout. Les deux validés par mutation. Golden master identique sur ses 20 scénarios.
- **Portée** : `scripts/charge/mouvements.js` (le détecteur d'intention), nouveau `scripts/charge/trace.js`, trois boutons dans `scripts/charge_diagnostic_ui.js`. Aucune fonction gelée touchée, aucun fichier `data/`, aucun programme retouché, aucune clé de stockage créée.

## V4.6.0 — Le moteur sait s'arrêter, et se règle par athlète

Deux manques structurels, pas deux correctifs.

- **Le moteur n'avait pas d'asymptote.** Tous ses réglages portent une *vitesse* de progression — `maxJumpBase`, `rpeProgression`, `brainGate.damping`, `progressionSpeed` — et aucun ne dit quand une progression est **terminée**. Conséquence : un mouvement d'isolation joué à RPE bas gagne un cran par séance indéfiniment, alors qu'il plafonne pour de bon bien avant une barre lourde. Ralentir une progression et la finir ne sont pas la même opération : amortir toujours plus fort, c'est approcher l'asymptote sans jamais l'atteindre, en continuant à proposer des hausses qui ne se réaliseront pas.
- **Le plafond se déduit, il ne se déclare pas.** Aucun chiffre en livres n'est écrit dans le code — ce nombre appartient à l'athlète, pas au créateur. Deux signaux doivent tenir **ensemble** : la pointe n'a pas bougé depuis assez de séances comparables, **et** au moins deux séries à ce palier coûtent le RPE de la famille ou plus. Un seul ne suffit pas, volontairement : pointe stable sans effort élevé = un programme qui n'a pas encore demandé plus ; effort élevé sans stagnation = une séance dure, déjà traitée par les freins RPE ≥ 8,5 et ≥ 9.
- **Ce qui se déduit d'un comportement se défait quand il change.** Dès que la dernière série au palier redevient nettement moins chère, le plafond tombe. Sans cette sortie, une déduction devient une condamnation.
- **Trois familles, trois vitesses de plafonnement.** Une isolation se déclare plafonnée vite (le cran est petit, la fenêtre utile est courte) ; un accessoire demande plus ; un mouvement principal beaucoup plus — s'y tromper coûterait des mois. La famille est lue par les détecteurs qui existent déjà (`isIsolationMovement`, `coachIsMainLoadContext`) : **aucune nouvelle regex de nom de mouvement**.
- **Un plafond n'agit jamais en silence.** Le panneau `(!)` donne la charge, le nombre de séances, le RPE, et dit **par où passe la progression maintenant** : les répétitions, pas la barre. Le plafond ne s'applique ni en contexte limité (technique, WOD, léger) ni en semaine de deload — ces chemins ne montent déjà pas seuls et gardent leur propre explication — et il ne fait jamais redescendre sous une charge déjà validée.
- **Les réglages du moteur étaient les mêmes pour tout le monde.** `COACH_MOVEMENT_TUNING` est une constante en dur : un amortissement unique appliqué au Back Squat d'un avancé et au Lateral Raise d'une débutante est faux par construction. **23 paramètres scalaires** se règlent désormais **par profil**, plus les plafonds manuels par mouvement, depuis ⚙ Réglages → **Calibration du moteur** (admin). Chaque champ affiche sa valeur d'usine et ses bornes, tout écart est marqué, et « remettre à l'usine » restaure exactement la valeur livrée.
- **Aucun fichier de décision n'a été modifié pour ça.** Les sites de lecture consultent `window.COACH_MOVEMENT_TUNING` **à l'exécution** (`suggestion.js:35`, `scaling.js:143`, `brain_stats.js:229`) : écrire dans la table vivante suffit. Trois verrous encadrent ce pouvoir — seuls des **scalaires déclarés** sont surchargeables (jamais une regex, non sérialisable en JSON ; jamais un tableau, fusion ambiguë), les **bornes sont côté app** et vérifiées à la lecture comme à l'écriture et à l'application, et les valeurs d'usine sont capturées **avant** toute application : la surcharge est un calque, pas une écriture destructrice.
- **La calibration voyage avec le profil.** Clé `racineState::<id>::tuning-override-v1` — le préfixe déjà balayé par `exportProfileBlob()` et réécrit par `importProfileBlob()`. Un export de profil emporte donc la calibration et les plafonds manuels sans une ligne de code de plus. Elle se réapplique au changement de profil : un client n'hérite jamais de la calibration de l'admin.
- **Garde-fous** : `dev/ceiling_checks.js` (71 contrôles) et `dev/tuning_override_checks.js` (461 contrôles) — chaque paramètre vérifié un par un : chemin vivant et numérique, bornes encadrant l'usine, clamp haut et bas, refus du non-numérique, retour exact à l'usine. Les deux suites ont été validées par mutation du code qu'elles surveillent. Le golden master reste **identique** sur ses 20 scénarios avec les deux nouveaux modules chargés : le comportement livré ne bouge pas d'un gramme sans réglage explicite.
- **Portée** : nouveaux `scripts/charge/ceiling.js`, `scripts/charge/tuning_override.js`, `scripts/profiles/admin_tuning.js` ; une ligne ajoutée à la cascade de `suggestion.js` (appel défensif) et une à `CoachProfiles.setActive()`. Aucune fonction gelée touchée, aucun fichier `data/`, aucune clé de stockage existante renommée. Plan et décisions : `docs/superpowers/plans/2026-08-24-plafond-et-surcharge-tuning.md`.

## V4.5.68 — Un deload se déclare, un pourcentage se résout

Les cinq risques signalés à la livraison de V4.5.67, corrigés. Deux étaient bien plus larges que leur description.

- **La semaine 6 n'est pas un deload.** `coachIsDeloadWeekOrContext()` ouvrait sur `if(weekNum===6) return true;` — un vestige de l'époque où l'app ne portait qu'un seul cycle de six semaines. Le catalogue en compte **42**, de 1 à 16 semaines. Mesuré : **14 programmes** subissaient un deload fantôme en S6, dont « S6 Rotation B max » de `phase2_fable5` — semaine de 3RM, la plus lourde du bloc — **cappée à 175 lb au lieu de 210**, et « S6 Simulation » de `competition_peak`. Les **19** programmes dont la S6 est un vrai deload le déclarent tous dans `weekLabels`/`weekGoals` : la lecture de libellé, arrivée après ce hardcode, le rendait déjà redondant. Une semaine de deload se **déclare** ; elle ne se déduit jamais d'un numéro.
- **« 75-82 % » n'est pas 75 lb.** `parseLoad()` attrape le premier nombre d'un texte de charge : un Push Press prescrit à 75-82 % du 1RM sortait à **75 lb**, ensuite encore multiplié par le ratio de profil. 39 charges du catalogue sont écrites en pourcentage (`heritage225`, `strict_muscle_up_personnel`, `transition_weeks`). Un pourcentage est désormais **résolu sur la capacité réelle** de l'athlète (`athlete_state` → références de travail → tests de calibration) ; sans ancre fiable il ne vaut **rien** et la charge repart du chemin « non numérique » (historique, puis repères) — strictement mieux qu'un nombre de livres inventé. Une charge portant une unité explicite (« 60 % (135 lb) ») reste une charge en livres.
- **Une série sortie proprement n'est jamais sous-suggérée.** Le plancher du bloc vitesse était enfermé derrière l'exigence d'ancre : un athlète sans capacité de force connue restait bloqué sur le nombre du programme même après l'avoir dépassé proprement pendant des semaines. Le plancher ne demande plus d'ancre — il ne fait que refuser de redescendre sous ce que l'athlète vient de faire, aux mêmes conditions de propreté (RPE dans la cible, reps sorties, statut sain).
- **Une protection qui protège dans six semaines n'en est pas une.** Le retour dans la bande vitesse descendait de 10 lb par séance, même pour une charge que l'athlète n'avait **jamais portée** — un simple nombre écrit dans un programme. Réduire par paliers a du sens sur une charge réellement soulevée ; sur un nombre jamais touché, ça ne protège rien et laisse le bloc lourd pendant des semaines. Le retour est désormais immédiat quand rien d'aussi lourd n'a été logué, et reste borné au saut maximal sinon.
- **Une cible peut se poser en clair.** `pctOf1RM: 0.60` sur l'exercice vaut déclaration d'intention, au même titre qu'un « ~60 % » écrit dans la note — sinon un programme qui fait les choses proprement serait le seul à ne pas être reconnu. La lecture par regex reste le repli pour les programmes existants. La détection reste étroite : sans cible déclarée **ni** pourcentage écrit, aucun bloc vitesse.
- **Garde-fous** : 14 assertions ajoutées (`dev/charge_engine_checks.js` pour le deload déclaré et la résolution des pourcentages, `dev/phase2_fable5_checks.js` pour le plancher sans ancre, le retour immédiat et la cible en clair). Nouveau contrôle d'hygiène du catalogue : **aucune** des 39 charges en pourcentage du dépôt ne retombe sur `parseLoad()`.
- **Portée** : `scripts/charge/mouvements.js`, `scripts/charge/suggestion.js`. Aucune clé de stockage créée, aucun schéma modifié, aucune vue touchée, aucun programme retouché. Checklist de livraison complète au vert.

## V4.5.67 — Les répétitions en plus comptent, et le bloc vitesse suit son pourcentage

- **Le « Squat vitesse » de Phase 2 — Fable 5 était gelé, pas prudent.** Sa note dit `~60 %, descente contrôlée, remontée explosive. Intention de vitesse, pas de charge.` Le mot **vitesse** tombait dans la regex `technique` de `coachExtractMovementIntent()` : le bloc devenait un contexte à progression limitée, `coachRuleContextLimited()` reposait la charge du programme, toutes les règles d'autorégulation étaient sautées (`!ctx.contextLimited`), et `coachRuleContextLimitedRounding()` re-verrouillait le résultat à la fin. La charge proposée valait donc *toujours* le nombre écrit dans le programme, mis à l'échelle du profil — ~130-135 lb pour un Back Squat de ~275 lb, soit **47-49 % au lieu des 60 % annoncés**. Aucune performance, si facile soit-elle, ne pouvait la faire bouger.
- **Un bloc vitesse est prescrit en pourcentage, pas en livres.** Une charge absolue écrite dans un programme est un pourcentage de l'**athlète de référence** ; elle dérive dès que l'athlète s'en écarte, et une charge gelée ne produit plus le stimulus prévu. `speed` est désormais une intention à part entière (`COACH_MOVEMENT_TUNING.speedStimulus`), qui **s'ajoute** à `technique` sans la remplacer : le bloc reste un contexte limité — il ne remplace jamais une capacité principale dans `athlete_state` — mais `coachRuleSpeedStimulusBand()` lui rend sa dérive vers la cible déclarée.
- **La détection est volontairement étroite, et c'est le point.** Le mot « vitesse » traverse tout le catalogue comme simple consigne d'arrêt (« Stop si la vitesse meurt », « Vitesse avant ego ») : le lire comme une intention aurait re-tarifé la moitié des programmes. Trois conditions cumulatives — aucune tournure d'avertissement, un mot-clé d'explosivité, **et une cible en pourcentage sous-maximale déclarée**. Balayage des 4 137 exercices × semaine × jour du catalogue : **un seul bloc** est reconnu, celui qui était signalé.
- **La dérive est lente, gardée, et réversible.** Elle exige une série loggée dans ce contexte, un RPE ≤ 7,5 et les reps sorties ; chaque palier reste sous le saut maximal prudent ; l'ancre est la capacité de force **réelle** du mouvement (`athlete_state` → références de travail → tests de calibration), jamais l'e1RM du set de vitesse lui-même, qui sous-estime énormément à RPE 7. Sans ancre fiable, **rien ne bouge** : un historique incomplet garde le comportement d'avant. Dans le sens inverse, une charge au-dessus de la bande est ramenée dedans — un bloc vitesse ne devient jamais un bloc lourd. Sur le cas signalé : 135 → 140 → 145 → 150 → 155 → 160 → **165 lb (60 %)**, puis stabilisation.
- **Les répétitions en plus étaient un signal réel, lu à moitié.** Le moteur savait déjà projeter Epley vers le **bas** (« dernier 135 × 2 pour 5 reps demandées » réduit la suggestion) ; la projection vers le **haut** n'existait pas. `135 × 5 @7` sur une cible de 2 reps vaut ~148 lb sur 2 reps par le même calcul, et le moteur n'en gardait rien : `updateAthleteStateFromResults()` écrivait `capacityLoad = load` pour un `easy_success`, effaçant la preuve. Le crédit de réactivité, lui, était **forfaitaire** (`+1 cran dès 2 reps de plus`) : 4 reps pour 2 et 8 reps pour 2 valaient exactement la même chose.
- **Trois corrections symétriques, pas une exception de plus.** (1) `coachRuleRepSurplusLift()` projette Epley vers le haut et en franchit une part par séance, réglée **par intention** — force 50 %, hypertrophie 30 %, vitesse 25 % : le surplus d'un bloc d'hypertrophie vient souvent du volume, pas de la force. (2) `repsOvershoot` lit maintenant aussi le **ratio** reps/cible, seul à distinguer un doublement d'un débordement mineur ; la lecture la plus sévère des deux gagne. (3) `easy_success` mémorise la capacité projetée au lieu de la charge portée. Le RPE reste le signal majeur : au-dessus de 8 (7,5 en vitesse) le surplus ne vaut rien, et les freins ≥ 8,5 / ≥ 9 sont hors de portée de tout ça — comme le veut `docs/CHARGE_PROGRESSION_CONTRACT.md`.
- **Aucune charge de programme n'a été retouchée.** `programs/phase2_fable5.js` est inchangé : c'est la logique qui est corrigée, pour que le programme continue de s'adapter quand le niveau de l'athlète évolue.
- **Portée** : `scripts/charge/movement_tuning.js`, `scripts/charge/mouvements.js`, `scripts/charge/suggestion.js`. Aucune clé de stockage créée, aucun schéma modifié, aucune vue touchée. Nouveau garde-fou `dev/phase2_fable5_checks.js` (les cinq cas demandés), plus quatre contrats de surplus de reps dans `dev/charge_engine_checks.js`. Checklist de livraison complète au vert.

## V4.5.66 — La courbe porte ses répétitions, et sait se lire en e1RM

- **Le défaut.** La courbe de progression traçait la **charge nue**. Trois séances à 195×3, 195×5 et 195×8 formaient donc une **ligne parfaitement plate à 195** — trois performances très différentes affichées comme identiques. Une charge sans ses répétitions ne dit pas ce qu'elle vaut.
- **Chaque point porte maintenant ses répétitions** : `195 lb` devient `195×3`. L'unité était déjà écrite deux fois (titre d'axe et graduations) ; c'est exactement la place que les répétitions occupent désormais. Aucun réglage à faire, aucun mode à choisir — c'est vrai par défaut.
- **Une seconde lecture, e1RM.** Un bouton **Charge / e1RM** au-dessus des courbes. En e1RM (Epley — `epley1RM`, la math de base du moteur, `CLAUDE.md § 3.2`), les mêmes trois séances deviennent **215 → 228 → 247** : une progression réelle qui était invisible. L'étiquette garde la série sous la valeur estimée (`247 · 195×8`) — l'estimation ne remplace jamais ce qui a été fait.
- **Les limites sont dites, pas cachées.** Epley cesse d'être une mesure au-delà d'une douzaine de répétitions : c'est une extrapolation. Ces points sont cerclés d'orange et l'infobulle le nomme. Un mouvement au poids du corps garde sa lecture en répétitions : il n'a pas de charge à convertir.
- **Ce qui n'était PAS cassé.** Le *verdict* tenait déjà compte des répétitions — la règle de tendance déclenche sur `deltaE1rm >= 10` **ou** `deltaLoad >= 10`, donc une progression à charge constante était déjà lue comme « up ». C'est le **tracé** qui ignorait les répétitions, pas la conclusion. Le garde-fou épingle les deux, pour qu'on ne « corrige » pas un jour une règle qui n'a jamais été fautive.
- **Pas besoin d'une IA pour ça.** C'est de l'arithmétique connue depuis 1985, déjà présente dans le dépôt : `pcProgE1rm()` calculait le e1RM de chaque point depuis toujours — il servait au verdict et à l'infobulle, mais n'était jamais tracé. Le travail était fait, il n'était pas montré.
- **Portée** : `scripts/view_pc.js`, `styles.css`. Aucune donnée touchée, aucun calcul de charge modifié ; moteur et Brain non concernés. Garde-fous dans `dev/history_progress_checks.js` : les deux lectures y sont **exécutées** sur le cas signalé.

## V4.5.65 — Une charge réduite volontairement n'est pas une baisse

- **Le défaut.** Une semaine « Retour au travail » (charges à ≈55 % du 1RM de référence, RPE 6-7 imposé, aucun échec) faisait passer chaque mouvement en **« BAISSE SUSPECTE »** dans la courbe de progression — « possible fatigue, deload, douleur ou mauvais mapping » — alors que c'est le programme qui avait demandé moins, et que l'athlète avait fait exactement ce qui était demandé. Le défaut touchait **tous** les mouvements chargés de la semaine, pas un seul.
- **Le moteur de charges, lui, n'a jamais été trompé.** `updateAthleteStateFromResults()` marque ces lignes `context_logged` et `coachFilterHistoryForProgression()` les écarte : les suggestions de la semaine suivante repartent des vraies charges, pas des 135 lb de reprise. Le marqueur existait donc déjà, persisté depuis toujours. Ce sont les **lectures en aval** qui l'ignoraient.
- **La courbe de progression** calculait sa tendance en comparant le **premier** et le **dernier** point, sans regarder ce qu'ils étaient : un seul point de reprise en fin de cycle suffisait à retourner le verdict de six séances propres. Elle sépare désormais les points de **capacité** des points de **contexte**. Les points de contexte restent tracés — la séance a bien eu lieu — mais en pastille creuse, et ils ne pèsent ni sur la tendance, ni sur le meilleur, ni sur le **RPE moyen** : un RPE 6-7 délibéré faisait passer un cycle dur pour un cycle facile. Le verdict dit ce qu'il a écarté (« 1 séance à charge allégée voulue est écartée de la tendance ») au lieu de le faire en silence, et un mouvement vu **uniquement** en semaine allégée affiche « Semaine allégée » plutôt qu'une conclusion inventée.
- **Le résumé de fin de séance avait le même angle mort**, et il aurait été plus bruyant encore : `analyzeMovementResult()` classait toute charge inférieure à la dernière référence en « charge en baisse vs dernière référence », donc **chaque mouvement de la semaine de reprise** atterrissait dans « Ce qui bloque ». Une baisse voulue y devient une information, pas un blocage.
- **L'exception est étroite, volontairement.** Seules les branches « charge en baisse » et « première référence » deviennent contextuelles. Un **échec réel pendant** une semaine allégée reste signalé : les tests d'échec (`major_fail`, `failed`, RPE ≥ 9,5) sont évalués **avant** l'exception, et le garde-fou vérifie cet ordre. Une vraie baisse hors contexte reste « Baisse suspecte ».
- **Une seule définition, pas trois.** `coachIsContextualLoadRow()` vit dans le domaine charge (`scripts/charge/historique.js`) et sort par la porte publique `CoachCharge.isContextualLoadRow` ; la courbe, le signal de progression et le résumé la lisent tous au lieu d'en écrire chacun une version. Elle reconnaît le marqueur `context_logged` **et** le contexte lui-même (`isRecovery`, `isTechnical`, `isLight`…), donc elle fonctionne aussi bien sur une ligne d'`athlete_state` que sur une ligne de séance.
- **Portée** : `scripts/charge/historique.js`, `scripts/charge/index.js`, `scripts/view_pc.js`, `scripts/progression/index.js`, `scripts/summary/index.js`, `styles.css`. **Aucune donnée n'est réécrite** : le marqueur était déjà dans le journal, seule sa lecture change — les semaines de reprise déjà enregistrées sont donc corrigées rétroactivement, sans migration. Moteur de charges et Brain non touchés (golden master inchangé). Garde-fous dans `dev/history_progress_checks.js` : la logique de tendance y est **exécutée**, pas relue.

## V4.5.64 — Lisibilité de la séance : quatre défauts vus à l'entraînement

- **Deux exercices étaient compressés comme quatre.** Le palier de densité écrivait `:nth-child(2)`, `(3)` et `(4)` dans le même sélecteur — or `:has(:nth-child(2))` matche déjà toute liste de 2 ou plus, donc les deux autres étaient redondants et un bloc de **deux** mouvements recevait la compression d'un bloc de quatre, alors qu'il dispose du double de hauteur. La carte se terminait sur un grand vide. Ce sont les **libellés** qui payaient le plus : Format / Poids / Repos à 12 px au lieu de 15, REPS et RPE à 9 px. Les valeurs, elles, avaient à peine bougé — d'où l'impression de ne plus savoir quel chiffre lisait quoi. Le palier « deux exercices » rend les tailles du mouvement seul (libellés +26 %, valeurs +9 %, contrôles à 40 px) ; le palier serré redevient ce qu'il aurait dû être — **trois exercices ou plus**, déclaré juste après pour l'emporter à spécificité égale. Un écran court garde sa variante réduite, et la liste défile, donc rien n'est jamais coupé.
- **« cumul 100 reps » proposait 10 répétitions.** `parseTargetReps()` ne lisait qu'une plage (`15-20`) ou un format `N×M` ; une cible écrite en toutes lettres retombait sur le repli `repsHint` = 10. L'athlète notait un **dixième** de son travail réel, et c'est cette valeur qui partait dans le journal. Le nombre collé au mot est maintenant lu (`100 reps` → 100, `1 rep` → 1), mais il doit **toucher** le mot : « 3 rounds for reps » ne déclare pas 3 répétitions et continue de retomber sur le repli. Vérifié sur les formats réels du catalogue — plages, `N×M`, secondes et validations sont inchangés.
- **Le rouge du kicker WOD était illisible.** Il y avait bien une raison : rouge = code couleur du bloc WOD, la barre en haut de la carte utilise le même `--red`. Mais `#ff2244` sur `#080d1a` ne donne que **5,1:1** de contraste, et un rouge saturé sur fond noir bave — l'œil ne met pas le rouge au point dans le même plan que le fond. Le **texte** passe sur une teinte éclaircie de la même famille (`--red-hud`, **7,1:1**) et gagne un point de taille ; la barre de la carte garde `--red` tel quel, donc le code couleur des blocs ne change pas. C'est le seul point de cette version qui touche au design system — un jeton dérivé d'un accent existant, pas un nouvel accent, et réversible en une ligne.
- **Le WOD n'avait pas de champ note.** Tous les autres mouvements portent un bouton « Notes » dans leur ligne de titre ; le bloc WOD était le seul sans — alors que c'est là qu'il y a le plus à dire. Il en a un, posé au bout de la ligne du kicker : **aucune rangée ajoutée**, donc la taille des chiffres du chrono ne bouge pas (`docs/UI_CONSTRAINTS.md`). Sa clé est celle de la ligne WOD des résultats (`wod_<titre>`), donc la note écrite pendant le WOD et le champ NOTE de l'écran Résultats sont **le même champ** : le champ est pré-rempli et écrit dans le même cache. Sans cette liaison, une note tapée dans Résultats aurait été silencieusement écrasée par celle du WOD — `guidedResultCache` est prioritaire à la collecte.
- **Portée** : `app.js`, `styles.css`, `scripts/session/view.js`, `scripts/session/results.js`. Aucune clé de stockage créée, aucun schéma modifié ; moteur de charges, Brain et Avis IA non touchés. Garde-fous ajoutés dans `dev/regression_checks.js` (les quatre défauts). Checklist de livraison complète au vert.

## V4.5.63 — Dans les limites du chrono, tout contact compte un round

- **Le suivi manuel du geste annulait encore des taps.** La version précédente avait remplacé le `click` (qu'iOS annule au moindre glissement) par un suivi à la main, tolérant jusqu'à 14 px. Le seuil était plus large, mais le principe restait le même : il fallait départager un tap d'un début de scroll, puisque la carte de séance défile — donc un doigt qui glisse un peu trop perdait quand même son round. Signalé à l'usage : « si mon doigt glisse, c'est là qu'il ne compte pas de round ».
- **Le départage n'est plus fait en JavaScript, il est rendu impossible.** `.guided-wod-timer` porte désormais `touch-action` sans panoramique. Le navigateur ne peut plus démarrer un scroll depuis le chrono, donc un doigt qui glisse **dans** le chrono n'est jamais un scroll : c'est un round. Le JS n'a plus qu'une seule décision à prendre — le tap est-il sur un bouton du chrono (▶ Ⅱ ↻, libellé, son) ? — et le round part au contact, sans attendre le relâchement.
- **Deux déclarations, pas une.** `touch-action: none` puis `touch-action: pinch-zoom` : là où `pinch-zoom` est connu, le zoom à deux doigts est conservé ; là où il ne l'est pas, la déclaration est ignorée et `none` s'applique. Dans les deux cas le panoramique est retiré, ce qui est la seule chose dont dépend le comportement du tap.
- **Contrepartie assumée, et demandée : le chrono n'est plus une surface de défilement.** Faire glisser la fenêtre de séance se fait partout ailleurs sur la carte — mouvements, texte du WOD, bandeau des rounds — qui gardent leur scroll entier.
- **Le code perd une couche au lieu d'en gagner une.** `pointermove`, `pointercancel`, `touchmove`, `touchcancel` et le seuil de glissement disparaissent : la fiabilité vient d'une règle CSS, pas d'une heuristique. Le garde-fou vérifie explicitement qu'aucune annulation au glissement ne revienne, et que `none` reste déclaré avant `pinch-zoom`.
- **Portée** : `scripts/session/timer.js`, `styles.css`. Aucun changement de données, aucun schéma touché. Garde-fou `dev/amrap_rounds_checks.js` (contrat 8 réécrit). Checklist de livraison complète au vert.

## V4.5.62 — Le tap de round ne se perd plus, et les temps de round se relisent

- **Le tap était annulé par le navigateur, pas par le code.** Le round était compté sur un `click`, et iOS n'en émet un que si l'appui **et** le relâchement sont quasi immobiles sur le même élément. En plein WOD le doigt glisse : le tap disparaissait avant d'atteindre l'app, et le round suivant absorbait le temps du round perdu — un round valait deux tours. Le geste est passé en suivi manuel : seconde prise au **posé du doigt** (l'instant que l'athlète a en tête quand il finit son tour), round validé au relever si le doigt n'avait pas dérivé de plus de 14 px, et abandon sur `pointercancel`. Cette tolérance de glissement s'est révélée insuffisante à l'usage et a été **retirée en V4.5.63** — voir l'entrée ci-dessus. Les boutons du chrono (▶ Ⅱ ↻, libellé, son) gardent leur exclusion.
- **Rien ne disait si le tap avait compté.** `navigator.vibrate` **n'existe pas sur Safari iOS** : sur iPhone, le seul retour prévu ne partait jamais. La banderole des splits est au-dessus du chrono, hors du regard fixé sur les chiffres, et le silence est volontaire pendant le WOD. Un tap pris et un tap perdu se ressemblaient donc **exactement**. La carte du chrono confirme désormais elle-même : **vert + numéro du round** quand il est compté, **rouge bref** quand il est refusé (chrono à zéro, deuxième tap dans la même seconde). Le refus n'est pas un détail à taire — c'est justement ce qu'il fallait voir.
- **Un tap manqué se répare, à froid.** À l'écran Résultats, le round qui vaut ≈ 2 fois la médiane des autres est signalé (`≈ 2 rounds ? tap manqué`, orange) et un bouton **÷2** le partage en deux tours égaux. Le seuil demande **au moins trois rounds** : sur deux, un écart du simple au double est un rythme, pas un accident.
- **Le partage égal est une hypothèse assumée, pas une reconstitution.** L'instant du tap perdu n'existe nulle part et ne peut pas être retrouvé. Le partage se trompe donc sur chacune des deux moitiés — mais beaucoup moins qu'un round compté double, qui fausse à la fois le compte de rounds et le classement rapide/lent de tout le WOD. La **somme est conservée** : les rounds suivants gardent exactement leur temps, et le temps restant du dernier round entamé ne bouge pas.
- **Rien n'est corrigé tout seul.** Le moteur signale, l'athlète tranche. Le journal réellement tapé est mis de côté à la première correction et reste récupérable par **« ↺ Temps du chrono »**. La correction met à jour le compte de rounds sélectionné (en fabriquant les pastilles manquantes) et les champs durables : sans ça l'écran aurait affiché 5 rounds et enregistré les 4 d'avant.
- **Les temps de round étaient enregistrés et affichés nulle part.** `roundSplits` et `lastRoundRemaining` partaient dans le journal depuis leur première séance, mais l'Historique ne montrait que le résultat et la note — et une note ne dit pas le rythme. Chaque séance affiche maintenant ses splits en pastilles, **or** pour le plus rapide et **bronze** pour le plus lent, suivis du temps restant. La lecture part du **texte** du journal, jamais d'un objet persisté : une séance exportée puis réimportée retrouve ses temps, et un export reste lisible par une version antérieure.
- **Corrigeables des semaines plus tard.** « Modifier » une séance passée affiche les temps de round et les rend éditables au format du chrono (`1:10 / 2:05 / 1:00`). Le journal brut reste la source de vérité, comme pour tout le reste de cet écran.
- **Portée** : `scripts/session/amrap_rounds.js`, `scripts/session/timer.js`, `scripts/session/view.js`, `scripts/session/results.js`, `scripts/session/history_edit.js`, `app.js`, `styles.css`. Aucune clé de stockage créée, aucun schéma persisté modifié ; moteur de charges, Brain et Avis IA non touchés. Le geste de tap descend de la vue vers le domaine chrono (`bindGuidedTimerRoundTap`), le rendu et les corrections de rounds restent dans `CoachAmrapRounds`. Garde-fou `dev/amrap_rounds_checks.js` étendu (contrats 8, 9 et 10). Checklist de livraison complète au vert.

## V4.5.61 — `competition_peak` publié, le parcours RX ne se termine plus dans le vide

- **Un seul vrai cul-de-sac, pas trois.** Le catalogue signalait trois programmes publics pointant vers un programme privé. Vérification faite, deux d'entre eux (`client_haltero_crossfit_5d`, `client_rx_crossfit_4d`) proposent **aussi** une suite publique : le lien privé y est du bruit, pas un blocage. Le seul vrai cul-de-sac était `client_rx_crossfit_5d`, dont l'unique suite déclarée était `competition_peak`, privé — un client terminait son cycle RX 5 jours sans recevoir aucune proposition.
- **`competition_peak` devient public.** Il portait déjà tout ce qu'un programme public exige (`objective`, `frequency`, `suggestedNext`) et il est la culmination naturelle du parcours RX. Le catalogue passe de 30 à 31 programmes publics, compteur mis à jour explicitement dans `dev/program_catalog_checks.js` — c'est le rôle de ce tripwire, et il a joué : un second garde-fou verrouillait aussi sa privauté et a dû être décidé, pas contourné.
- **Le défaut ne peut plus revenir.** Un contrôle permanent est ajouté : tout programme public déclarant des suites doit en avoir **au moins une publique**. Un futur programme qui ne pointerait que vers du privé fera échouer la livraison au lieu de laisser un athlète sans successeur.
- **Les deux liens non bloquants sont laissés en place** : ils redeviennent corrects d'eux-mêmes maintenant que leur cible est publique.
- **Portée** : `programs/index.js`, `dev/program_catalog_checks.js`. Aucun fichier de programme touché, aucun changement de moteur. Checklist de livraison complète au vert.

## V4.5.60 — La charge méritée devient un plancher

- **Une règle qui ne se déclenchait qu'à moitié.** `coachRuleLastSetGuards` ne relevait la suggestion que si elle tombait **sous** la dernière charge faite (`suggested <= lastLoad`). Conséquence : un programme demandant 230 lb quand le RPE de l'athlète en avait mérité 240 ne déclenchait aucune règle — et le portail Brain, ne voyant qu'une hausse non justifiée de 225 à 230, la ramenait à 225. Une charge de programme **plus lourde** sortait donc une suggestion **plus légère**.
- **La valeur méritée est maintenant un plancher**, pas un rattrapage : la règle agit dès que la suggestion est sous elle, quelle que soit la charge du programme. C'est la sémantique correcte de « l'athlète a mérité cette charge ».
- **Le portail se retire quand l'évidence couvre la hausse.** Si le plancher mérité atteint ou dépasse la proposition, le portail de confiance n'a plus rien à retenir : il rend la décision intacte au lieu de l'amortir.
- **Vérification** : **0 inversion sur 288 000 évaluations** du banc d'essai — 8 mouvements × 5 contextes × 3 trajectoires × RPE 6→9 × 4 cibles de reps × 5 valeurs d'historique × 3 biais. Avant cette série de correctifs : 864. La classe de défaut est éliminée, pas seulement le cas signalé.
- **Portée** : `scripts/charge/suggestion.js`, `scripts/charge/brain_stats.js`. Golden master inchangé sur les 20 scénarios. Dix profils simulés : progressions 21, figées 3. Checklist de livraison complète au vert.

## V4.5.59 — La sauvegarde emporte Brain, le portail amortit au lieu de geler

- **L'export ne sauvegardait pas Brain.** La mémoire d'apprentissage vit dans sa propre clé (`racineState::<id>::brain-memory-v1`) et `exportProfileBlob()` n'en lisait que deux. Aller-retour vérifié appareil A → export → appareil B : historique retrouvé, charges retrouvées, **mémoire Brain perdue** — ambition mesurée, précision, journal, et la courbe d'erreur du § 8 reconstituée à `[]`. Sans copie serveur, la perte était définitive. L'export porte maintenant `stateExtras`, balayé par préfixe pour emporter aussi les versions futures de cette clé, et réécrit à l'import sous l'identifiant du nouveau profil. **Aucune migration** : le champ est optionnel dans les deux sens, un export récent reste importable par une version ancienne qui l'ignore.
- **Le portail de confiance Brain gelait au lieu d'amortir.** Sous 65 % de confiance il ramenait la suggestion à la dernière charge faite. Or la confiance grandit avec les observations, et une charge gelée n'en produit pas : le garde-fou se refermait sur lui-même. Il conserve désormais 35 % de la hausse proposée, et surtout ne descend **jamais** sous ce que l'échelon RPE de l'athlète a mérité — une nouvelle fonction `coachRpeEarnedLoad()` définit ce plancher une seule fois, partagée par la règle qui propose et par le portail qui arbitre.
- **La même correction supprime l'inversion signalée.** Le portail ne s'appliquait que si aucune règle n'avait levé « watch », si bien qu'une charge de programme **plus lourde** pouvait sortir une suggestion **plus légère** (225 → 230 donnait 230 puis 225). Il s'applique maintenant aussi aux « watch ». Les freins durs (`warning`, `critical`) restent exclus : ils ont déjà réduit la charge.
- **Le saut maximal prudent était purement absolu.** +10 lb est prudent à 225 lb ; à 2,5 lb il autorise +400 %. Cas réel relevé par le simulateur sur un Incline DB Press. Le saut est désormais borné aussi en **relatif** (15 %), avec un plancher égal à l'écart **réel** jusqu'au cran suivant du rack — pas au pas nominal, qui vaut 2 lb là où l'haltère suivant est à +2,5 et qui aurait figé le mouvement.
- **`Goblet Squat` était classé barre** : il contient « squat » et tombait dans la branche barre, avec un pas de 5 lb au lieu de 2,5. Reclassé haltère, et exclu du suffixe « / main » — un goblet squat se tient à deux mains sur un seul implement, l'afficher par main doublait le poids demandé.
- **Effet mesuré sur les dix profils simulés** : courbes qui progressent **2 → 20** sur 51, courbes figées malgré des séances faciles **10 → 3**. Le simulateur passe de 10 PASS à 9 PASS / 1 WARN : l'avertissement restant porte sur le profil « données incohérentes » et n'était pas atteignable avant, le mouvement concerné étant figé. Il n'est **pas** résolu — je ne le reproduis pas hors du simulateur.
- **Portée** : `scripts/profiles/storage.js`, `scripts/charge/brain_stats.js`, `scripts/charge/suggestion.js`, `scripts/charge/historique.js`, `scripts/charge/mouvements.js`, `scripts/charge/movement_tuning.js` (`brainGate`, `maxJumpBase.relativeCeiling`, `singleImplementPatterns`). Golden master : **1 valeur changée sur 20** — un Bench Press à 135×8 @RPE 7 trois fois de suite passe enfin de 135 à 140.

## V4.5.58 — La vitesse de progression se mesure, elle ne se déclare plus

- **Deux avis sur la même question.** Brain tient depuis le début une `ambition` par mouvement et intention (0,25–0,95) : elle monte quand ses prédictions se révèlent trop prudentes, descend quand elles se révèlent trop ambitieuses, et intègre les corrections manuelles de l'athlète. Pendant ce temps, un curseur libre de 0,4 à 1,8 décidait seul du saut maximal — sans jamais consulter cette mesure. Le moteur observait la bonne chose et ne s'en servait pas.
- **Le facteur devient `mesure × biais`.** `coachObservedAggressiveness(label)` agrège l'ambition de toutes les intentions du mouvement et la traduit en facteur de saut. Le curseur ne fixe plus la vitesse : il l'incline.
- **Trois positions au lieu d'un curseur libre** : `prudent` (0,75) · `normal` (1,00) · `ambitieux` (1,20). La question posée à l'athlète change de nature — ce n'est plus « à quelle vitesse progresses-tu », à quoi personne ne peut répondre honnêtement, mais « penche plutôt d'un côté ou de l'autre de ce que le moteur observe ».
- **On ne déduit pas une vitesse de deux séances.** La mesure est pondérée par le nombre de prédictions testées : sous `minObservations` (6), le facteur est tiré vers le neutre au prorata ; sans aucune observation il vaut exactement 1. Jamais de vitesse inventée sur des données minces.
- **Aucune migration.** Un profil existant porte un nombre libre dans [0,4 ; 1,8] : il est ramené **à la lecture** à la position la plus proche, sans que son stockage soit réécrit. Un export antérieur reste importable, et les valeurs héritées gardent leur sens (0,7 → prudent, 1,25 → ambitieux).
- **Les bornes finales [0,4 ; 1,8] sont inchangées** et s'appliquent désormais au produit. Les freins de sécurité ne sont pas concernés : ils n'ont jamais dépendu de ce facteur.
- **Portée** : `scripts/charge/movement_tuning.js` (`progressionSpeed`), `scripts/charge/scaling.js`, `scripts/charge/historique.js` (le mouvement est maintenant transmis au facteur), `scripts/profiles/ui.js` (deux curseurs → deux sélecteurs à trois positions), `scripts/profiles/onboarding.js` (défauts alignés). Garde-fous : `dev/charge_engine_checks.js` (rapprochement des valeurs héritées, pilotage par la mesure, pondération par le volume, biais qui incline sans remplacer, bornes finales). Golden master : **aucun changement**.

## V4.5.57 — Le RPE lit la tendance, plus seulement la dernière séance

- **Le problème n'était pas le nombre de paliers.** Le moteur ne lisait qu'**un seul chiffre** — le RPE de la dernière séance — et sur une barre le rack quantifie la sortie à 5 lb. Ajouter des barreaux ne pouvait rien donner de plus : la finesse saisie (7,5 · 7,8 · 8,5) était jetée. En pratique le RPE se réduisait à trois états : facile, ok, trop dur.
- **La réactivité vient de la direction.** `coachBuildMovementHistorySignal` gardait déjà les 4 dernières séances avec leurs RPE, mais `direction` ne suivait que la charge — jamais le RPE. Le moteur lit maintenant cette tendance : à charge égale, un RPE qui **descend** de 0,5 sur trois séances avance d'un cran, un RPE qui **monte** recule d'un cran. Des reps dépassées d'au moins 2 avancent d'un cran.
- **Ce que ça change, concrètement.** À RPE 7 final identique : trajectoire 8 → 7,5 → 7 propose **235 lb**, trajectoire plate **230 lb**, trajectoire 6 → 6,5 → 7 **maintient à 225 lb**. Trois réponses là où il n'y en avait qu'une.
- **Le RPE 8 n'est plus une zone morte.** 7,5 progressait, 8,5 freinait, et 8 ne faisait rien sans jamais le dire. C'est désormais un barreau à zéro cran qui **annonce le maintien** — et qu'une tendance qui s'allège promeut à un cran.
- **Trois limites tiennent le mécanisme** : un modificateur ne touche jamais au saut maximal prudent (il rend le moteur plus prompt à utiliser la marge, il ne l'élargit pas) ; les freins ≥ 8,5 et ≥ 9 sont hors de leur portée ; en dessous de 3 séances comparables, aucune tendance n'est affirmée.
- **Un bug attrapé au passage** : l'accesseur de barreau faisait `Number(steps) || 1`, ce qui transformait silencieusement un barreau de maintien (0 cran) en une hausse d'un cran. Le RPE 8 progressait donc au lieu de maintenir.
- **Portée** : `scripts/charge/movement_tuning.js`, `scripts/charge/suggestion.js`. Garde-fous étendus : `dev/charge_engine_checks.js` (séparation des trois trajectoires, zone morte nommée, reps dépassées, non-contournement du saut maximal et des freins hauts). Golden master : **zéro valeur changée** sur 20 scénarios, seuls 5 textes d'explication évoluent.

## V4.5.56 — Le RPE reprend du pouvoir sur la charge

- **Un seul palier, c'était presque aucune information.** Le moteur ne connaissait qu'une porte : `lastRpe <= 7` → un cran d'équipement. RPE 5, 6 et 7 donnaient rigoureusement la même suggestion, et RPE 7,5 n'en donnait aucune. Une séance vécue très facile et une séance vécue juste correcte sortaient le même poids.
- **Une échelle graduée la remplace**, déclarée dans `scripts/charge/movement_tuning.js` (`rpeProgression`) et nulle part ailleurs — la règle de tuning par mouvement s'applique : trois crans et saut prudent élargi ×1,5 sous RPE 6, deux crans ×1,25 à 6,5, un cran jusqu'à 7,5. Le RPE choisit l'ambition, le saut maximal garde le dernier mot.
- **Les freins hauts ne bougent pas d'un cheveu** : RPE ≥ 8,5 maintient ou réduit, RPE ≥ 9 bloque toute hausse automatique. C'est le contrat de progression, il n'était pas en cause.
- **Deux règles se disputaient la même situation.** `coachRuleLiftFromControlledHistory` se posait 10 lb au-dessus de la référence contrôlée, `coachRuleReferenceReelleValidee` se posait dessus. Elles ne se départageaient que par un seuil d'écart (`liftFromHistoryThresholds.gap` = 20 lb), donc franchir ce seuil **vers le bas** faisait **monter** la suggestion : Deadlift historique 225, programme 205 → 235 lb, mais programme 210 → 230 lb. Les deux chemins convergent désormais sur la référence, et la hausse est décidée une seule fois, par l'échelon RPE.
- **Un mouvement d'isolation pouvait rester figé pour toujours.** Le saut prudent d'une isolation vaut un pas de charge (2 lb sur un Lateral Raise DB), mais l'haltère suivant du rack est à +2,5 lb : le plafond interdisait mathématiquement la seule progression disponible. Le plafond ne descend plus sous un cran d'équipement — une prudence qui interdit le plus petit pas possible n'est pas de la prudence.
- **Portée** : `scripts/charge/movement_tuning.js`, `scripts/charge/suggestion.js`. Garde-fous étendus : `dev/charge_engine_checks.js` (échelon, freins inchangés, isolation débloquée, non-régression du seuil de relance). Golden master ré-enregistré : 5 scénarios sur 20 changent, tous voulus ; les 15 autres — verrous RPE ≥ 9, deload, technique, WOD — sont intacts.

## V4.5.55 — Une seule cloche, sélecteur de son retiré

- **Onze voix essayées, une retenue.** La palette avait un but — comparer à l'écoute — et ce but est atteint. Bols tibétains, cloches de temple, gongs, marimba, onde carrée : tout est supprimé. Reste la **Cloche**, modulation de fréquence à rapport inharmonique 1:1,41.
- **Le sélecteur part avec elles**, en entier : la table des voix, les fonctions de choix et d'écoute, les boutons de Réglages, leur style. Une préférence arrêtée n'a plus besoin d'être un réglage — et un demi-sélecteur qui ne choisit plus rien serait pire que pas de sélecteur du tout.
- **Le son ne change pas d'un iota** : registre ×0,55, gain ×1,25, plancher 240 Hz. Ce sont exactement les valeurs sous lesquelles la Cloche a été choisie.
- **Ce que le garde-fou protège maintenant** n'est plus la cohérence d'une palette mais l'identité de ce son précis : le rapport **non entier** (un rapport entier donnerait un orgue, pas une cloche), le fait que le modulateur soit **branché sur la fréquence** de la porteuse (créé mais non câblé, il ne resterait qu'un sinus), et qu'aucun mode ne **gonfle** après l'attaque (ce serait un gong).
- **Deux trous comblés au passage.** Le plancher de fréquence n'était éprouvé que sur une note qui ne l'atteint pas ; il l'est désormais sur la plus grave des cinq signaux — la fin de séance tomberait à **181 Hz** sans lui, sous ce qu'un haut-parleur de téléphone restitue. Et le câblage du modulateur n'était pas vérifié du tout.
- **Portée** : `app.js`, `scripts/profiles/ui.js`, `styles.css`, `index.html`. Garde-fou réécrit : `dev/sound_checks.js`. 18 mutations testées, 18 attrapées.

## V4.5.54 — Quatre gongs pour les chronos

- **Un gong n'est pas une grosse cloche**, et ce qui les sépare se construit, ça ne s'imite pas :
  - un spectre **dense et inharmonique** — sept à dix modes aux rapports irréguliers, là où une cloche en a trois ou quatre ;
  - une **frappe de maillet** : un bruit court et sourd au moment de l'impact. Sans lui, les modes surgissent du silence et on entend un synthé, pas un objet frappé ;
  - le **gonflement**. Dans un disque de bronze mince, la frappe met en mouvement les modes graves, qui transfèrent ensuite leur énergie aux modes aigus : le son **enfle** pendant quelques centaines de millisecondes avant de retomber. C'est ce déferlement montant qu'on reconnaît — aucune cloche ne le fait, ses partiels sont au maximum dès l'attaque.
- **Quatre gongs**, mesurés sur l'instant où l'énergie aiguë culmine :
  - **Dora** — le gong japonais du début de combat. Gonflement rapide (**0,20 s**), traîne nette, 1,4 s.
  - **Gong** — le gong chinois à bosse. Hauteur nette, gonflement franc (**0,45 s**), 1,9 s de traîne.
  - **Tam-tam** — le grand disque plat, sans hauteur définie. Spectre le plus dense (9 modes), gonflement **0,70 s**, 2,7 s.
  - **Massue** — le plus gros et le plus lent. Fondamentale au plancher (251 Hz), gonflement **0,70 s**, **3,2 s** de traîne.
- **Onze voix au choix** désormais : 4 gongs, 4 cloches acoustiques, la Cloche FM, Bois et Carré. Aucune ne sature — crêtes mesurées 0,73 à 0,97.
- **Une règle de garde-fou reformulée, pas contournée.** « Le défaut est la voix la plus grave » était un proxy commode tant que la palette montait ; depuis que les gongs descendent volontairement plus bas que la voix par défaut, il casserait pour une bonne raison. Ce qui compte reste vérifié : le défaut est dans la **moitié basse** du registre.
- **Portée** : `app.js`, `index.html`. Garde-fou étendu : `dev/sound_checks.js` lit désormais les **enveloppes de gain**, pas seulement les fréquences — c'est là, et nulle part ailleurs, que se voit la différence entre un gong et une cloche. Les familles se **déduisent** de ce que les voix font au lieu d'être listées à la main, donc retirer un gong de la palette se voit. 24 mutations testées, 23 attrapées, 1 prouvée inerte (une cloche ne peut pas gonfler par accident : il faut lui donner des valeurs de gonflement explicites, et là c'est attrapé).

## V4.5.53 — Quatre cloches de temple pour les chronos

- **Quatre cloches acoustiques s'ajoutent à la palette**, construites sur les rapports de partiels d'instruments réels — pas sur des valeurs choisies à l'oreille :
  - **Bol** *(nouveau défaut)* — bol chantant tibétain : partiels 1 / 2,7 / 5,4, attaque de 60 ms (un maillet garni, pas un choc), résonance **1,2 s**.
  - **Temple** — cloche japonaise *bonshō* : un bourdon tenu, surmonté d'un coup deux fois plus haut qui domine à l'impact puis s'efface. La plus grave et la plus longue — **2,1 s** de queue.
  - **Rin** — bol de méditation japonais, plus petit et plus brillant : partiels 1 / 2,75 / 5,4 / 8,9.
  - **Tingsha** — les deux petites cymbales tibétaines : presque une seule note, jamais tout à fait. **2,45 s** de résonance.
- **Le battement, c'est ce qui manquait.** Une cloche de temple n'est pas un bip métallique : deux modes très légèrement désaccordés (0,25 à 0,55 %) font onduler lentement le volume. Mesuré : **1,4 Hz** pour Bol, **12 ondulations** sur une frappe de Tingsha. La version FM précédente n'en avait aucune — d'où son côté synthétique.
- **Trois ingrédients font le temple plutôt que le bip** : attaque douce, longue résonance où les partiels aigus s'éteignent bien avant la fondamentale, et ce battement.
- **Registre encore abaissé** : le défaut passe de ×0,50 à **×0,40**, soit 264 Hz pour un signal écrit à 660. Toutes les cloches sonnent entre 264 et 317 Hz.
- **Tingsha garde le registre commun** au lieu de doubler sa fréquence en interne, comme le feraient de vraies tingsha : sinon une voix échapperait au réglage de hauteur et le « plus grave » demandé ne vaudrait plus pour elle. C'est le battement, pas la hauteur, qui fait son caractère.
- **Sept voix au total** — les quatre cloches, plus Cloche (la version FM, gardée pour comparaison), Bois et Carré. Aucune ne sature : crêtes mesurées **0,77 à 0,96**.
- **Portée** : `app.js`, `index.html`. Garde-fou étendu : `dev/sound_checks.js` vérifie que les sept voix ont des **empreintes de partiels distinctes** — deux fonctions différentes peuvent produire le même son, seule l'empreinte le prouve — et que le **battement** de la voix par défaut existe réellement, tout en s'assurant que toutes ne l'ont pas : le choix doit rester un vrai choix. 20 mutations testées, 20 attrapées.

## V4.5.52 — Cinq familles de sons au choix pour les chronos

- **Ce n'étaient pas trois sons, c'étaient trois hauteurs du même son.** La V4.5.51 transposait une seule onde carrée : forcément monotone. Chaque voix a maintenant sa **propre synthèse**.
- **Cinq voix, toutes plus graves qu'avant**, à écouter dans ⚙ Réglages — un tap sélectionne et joue :
  - **Bois** *(défaut)* — maillet de marimba : partiels réels d'une lame (1, 4, 9,2), attaque nette, extinction rapide. Chaud, grave, jamais criard.
  - **Duo** — deux triangles à la quinte, attaque douce. Le plus discret : une notification, pas une alarme.
  - **Cloche** — modulation de fréquence à rapport **inharmonique** (1:1,41), l'indice retombe pendant la tenue. C'est ce qui fait le scintillement métallique.
  - **Carré** — l'onde franche de la V4.5.51, passe-bas compris. Celle qui porte le plus loin.
  - **Bloc** — bruit filtré très court plus un corps qui donne la hauteur. Il perce le bruit ambiant par son **attaque**, pas par des harmoniques aigus.
- **Registre abaissé sur toute la palette** : de ×0,50 à ×0,62 de la note d'origine, contre ×0,62 à ×1,00 avant. Plancher à **240 Hz** — sous cette limite un haut-parleur de téléphone ne restitue presque rien, et le bip deviendrait inaudible au lieu de discret.
- **Toutes bien moins agressives** : le rapport énergie criarde / énergie utile tombe à **0,33–0,38** selon la voix, contre **0,56** pour la V4.5.49.
- **La mélodie n'appartient pas à la voix.** Le départ monte (660 → 880), la fin descend (440 → 330) : changer de voix change le timbre et le registre, jamais le sens d'un signal.
- **Les gains sont calibrés sur la crête, pas sur l'énergie** — et c'est une conclusion mesurée, pas un choix de confort. Viser une énergie égale entre voix est inatteignable : un maillet qui s'éteint en 0,3 s ne peut pas porter autant qu'une onde tenue, et pousser le gain pour y arriver ne fait que saturer le limiteur (**×30 sur Bloc pour 0 dB de plus**). Ce qu'on entend d'un son percussif, c'est son attaque : chaque voix est donc calée juste sous l'écrêtage, crêtes mesurées à **0,82–0,97**.
- Tout ce qui existait reste vrai : le bouton 🔇 coupe sans créer un seul nœud audio, et le déblocage muet du premier chargement est inchangé.
- **Portée** : `app.js`, `styles.css`, `index.html`. Garde-fou étendu : `dev/sound_checks.js` vérifie notamment que **deux voix ne partagent jamais leur synthèse** — sans quoi on serait revenu à la même onde transposée. 18 mutations testées, 18 attrapées.

## V4.5.51 — Son des chronos : trois voix au choix, et le bip du premier chargement

- **Le bip manquant au premier chargement est un vrai bug, corrigé.** `ctx.resume()` est **asynchrone** : au tout premier démarrage de chrono, le geste créait le contexte audio à l'état « suspended », demandait la reprise, et les bips programmés juste après tombaient dans le vide avant l'ouverture de la sortie. Aux chargements suivants le contexte était déjà en marche, d'où un silence qui ne se reproduisait qu'une fois et paraissait inexplicable. Remède standard iOS : un tampon d'**un échantillon muet** joué à l'intérieur même du geste, qui ouvre réellement la sortie. Vérifié : joué une seule fois, et il ne produit aucun son.
- **Trois voix, choisies dans Réglages, et le tap les fait entendre.** « Doux » (grave et discret), « Moyen », « Clair » (perce le bruit). Décrire un son avec des mots ne dit rien : le tap **sélectionne et joue** immédiatement les deux signaux les plus fréquents — le départ et le changement de minute.
- **Le défaut est la plus grave.** On n'impose pas le réglage le plus agressif à quelqu'un qui n'a rien demandé. En « Doux », le rebours passe de 880 à **546 Hz**, la minute EMOM de 1047 à **649 Hz**, la fin de 440/330 à **273/260 Hz**.
- **La transposition garde les mélodies.** Toutes les notes bougent du même facteur : le départ monte toujours, la fin descend toujours — seul le registre change.
- **Plancher à 260 Hz.** Un haut-parleur de téléphone ne restitue presque rien en dessous : transposer plus bas rendrait le bip **inaudible** au lieu de discret.
- **Ce qui agressait, c'était le timbre, pas le volume.** Une onde carrée emporte tous ses harmoniques impairs jusqu'à l'aigu. Un passe-bas réglé en multiple de la fondamentale garde les deux ou trois premiers — ceux qui donnent la puissance — et coupe le reste. Mesuré sur un rendu hors ligne : en « Doux », l'énergie au-dessus de 2 kHz (ce qui rend un son criard) retombe de **×5,1 à ×2,7** par rapport à l'ancien sinus, tandis que la puissance utile dans la bande du haut-parleur reste à **×3,2**. Le gain d'audibilité de la V4.5.49 est donc conservé, l'agression est divisée par deux.
- **Portée** : `app.js`, `scripts/profiles/ui.js`, `styles.css`, `index.html`. Nouveau garde-fou : `dev/sound_checks.js` — exécute le vrai domaine audio d'`app.js` dans un contexte Web Audio simulé qui enregistre ce qui est créé, joué et **câblé** (un filtre créé puis contourné ne passerait pas). 13 mutations testées, 13 attrapées.

## V4.5.50 — Le repos se décompte dans sa ligne, chrono du haut sans cadre

- **Le chiffre du repos EST le minuteur.** Toucher `2:30` le fait décompter sur place, dans la ligne « Repos », à côté du mouvement qu'il concerne. C'est mieux que de prendre l'heure du haut : le chiffre est déjà écrit là, déjà à la bonne taille, et on n'a pas à regarder ailleurs pendant qu'on souffle.
- **Le décompte recouvre la consigne, il ne l'écrase jamais.** Annuler ou finir rend `1:00-2:30` tel quel.
- **Sur une plage, chaque borne est sa propre cible.** On choisit, et l'autre disparaît pendant le décompte. Toucher ailleurs sur la ligne prend la **borne la plus longue** : « 1:00-2:30 » veut dire « au moins une minute, jusqu'à deux et demie » — partir sur la borne basse pousse à reprendre trop tôt, et c'était exactement ce que faisait `parseRestToSeconds`, qui retenait le premier nombre rencontré.
- **380 consignes en secondes étaient tout simplement ignorées.** `90 sec`, `60-90 sec`, `90–120 sec` (avec un tiret demi-cadratin) n'ont pas de `:` — aucune n'était lançable. Le nouveau lecteur `coachRestPicks()` couvre les trois formes du catalogue : **79 des 83 consignes distinctes** sont maintenant lançables, contre ~45. Les quatre autres — « au besoin », « le reste de la minute », « qualité », « — » — n'ont rien à décompter, et c'est juste.
- **Plus de règle de priorité entre les deux chronos.** Elle n'existait que tant qu'ils se partageaient la boîte de l'heure. Un EMOM dans la bande et un repos dans sa ligne tournent maintenant ensemble.
- **Un repos survit au re-rendu de son bloc** et s'arrête quand on change de bloc : il appartient au mouvement en face duquel il est écrit.
- **Le cadre du mini-chrono est retiré.** Encadrement, fond et rembourrage coûtaient 22 px de largeur pour rien : il est déjà seul dans la bande, et l'alerte est portée par la couleur des chiffres.
- **Et les faces transitoires ne rapetissent plus l'affichage courant.** « PAUSE 0:00 » faisait 9 caractères de gabarit contre 7 pour un EMOM 8 en marche : **29 % de taille perdus en permanence** pour un état qui dure trois secondes. La pause n'a plus de libellé du tout — c'est le ton qui l'éteint, la face ne change pas. Résultat cumulé : **46 → 55 px**.
- **Une nouvelle règle verrouillée : la hauteur de la bande est un budget.** La largeur seule ne borne pas la police — à 69 px la bande grandissait de 12 px, poussait la carte et reprenait la hauteur promise aux charges et aux reps (carte 721 → 709). La taille est désormais plafonnée par `hauteur de bande / interligne`, mesurée de façon idempotente. Vérifié : **carte 648 px avec et sans chrono**, valeur de poids 41 px, titre 36 px — identiques.
- **Portée** : `scripts/app_helpers.js`, `scripts/session/mini_timer.js`, `scripts/session/view.js`, `styles.css`, `index.html`, `docs/UI_CONSTRAINTS.md`. Garde-fou étendu : `dev/mini_timer_checks.js` — lecture des consignes vérifiée sur les **83 consignes réelles** du catalogue, budget de hauteur épinglé sur une géométrie où c'est la hauteur qui borne. 12 mutations sur le repos (12 attrapées), 9 sur l'affichage (8 attrapées, 1 prouvée inerte).

## V4.5.49 — Mini-chrono plein format, alerte plus franche, bips audibles

- **Le compteur de minutes passe à la taille du chrono.** `1/12` et les secondes sont désormais à la **même dimension** ; c'est la **couleur** qui les sépare — blanc pour « où j'en suis », cyan pour « combien il reste ». Les deux en Orbitron : ce sont deux valeurs numériques, pas une étiquette et une valeur.
- **La police n'est plus figée, elle est mesurée.** Elle se calcule sur la largeur réelle de la bande, rembourrage réduit au minimum, boîte étirée sur **100 % de la largeur disponible**. Sur iPhone 390 px : **30-38 px → 46 px**. La mise en page ne bouge pas — la carte fait toujours 721 px, la carte d'exercice 622 px, avec et sans chrono.
- **La taille reste stable pendant tout le bloc.** Elle se mesure sur un **gabarit** — le plus large affichage que ce bloc peut produire (`12/12` + `1:00`) — jamais sur le texte du moment. Sans ça, les chiffres changeraient de taille à chaque seconde. C'est la même règle verrouillée que le chrono WOD, écrite pour la même raison.
- **L'alerte de carte devient franche, et monte avec l'urgence.** L'anneau passe de **3 px** (bleu, 30 s) à **4 px** (jaune, 10 s) à **6 px** (rouge, 3 s), avec un fond teinté et une lueur qui double à chaque palier. Les **3 dernières secondes pulsent** en plus.
- **Les chiffres virent AVEC la carte.** Le compteur restait cyan pendant que la carte passait au rouge : deux signaux contradictoires pour un seul évènement, et c'est le petit — celui qu'on regarde en dernier — qui mentait. Il suit maintenant le même état, palier par palier.
- **Aucune dimension ne bouge.** L'anneau est posé en `box-shadow`, jamais en `border-width`, et la pulsation ne touche que la lueur : rien ne remue pendant qu'on saisit un poids. `prefers-reduced-motion` coupe l'animation.
- **Les bips étaient inaudibles pour deux raisons, corrigées toutes les deux.** Onde **sinus** — aucune harmonique, donc rien qui perce le bruit d'un gym à travers un haut-parleur de téléphone : elle passe en **carrée**. Et surtout l'**enveloppe** : le gain partait du maximum et retombait immédiatement, si bien qu'un bip déclaré à 0,18 s n'était réellement audible que ~30 ms. Il tient maintenant son palier sur **65 %** de sa durée, avec une attaque de 8 ms pour éviter le clic. Gain global ×2,4, et un **limiteur** en sortie pour que deux bips superposés (départ, fin, minute EMOM) n'écrêtent pas.
- Tous les bips de l'app en profitent, y compris ceux du chrono WOD. Le bouton 🔇 coupe toujours tout sans créer un seul nœud audio.
- **Portée** : `scripts/session/mini_timer.js`, `styles.css`, `app.js`, `index.html`, `docs/UI_CONSTRAINTS.md`. Garde-fou étendu : `dev/mini_timer_checks.js` — le coût zéro pixel est désormais vérifié **en exécution** (DOM espion) au lieu d'une interdiction textuelle de `createElement`, et la stabilité de la taille est épinglée. 6 mutations testées, 6 attrapées.

## V4.5.48 — Un profil non calibré reçoit une charge, plus un refus

- **Le blocage disparaît.** Un profil sans ratios de test recevait une phrase à la place de chaque charge. Il reçoit maintenant une **estimation d'après son niveau déclaré**.
- **Le matériel existait déjà.** `CoachOnboarding.EXPERIENCE_LEVELS.fallbackRatio` vaut **0,45 / 0,75 / 1,00** (débutant / intermédiaire / avancé), et l'onboarding s'en sert déjà pour chaque mouvement non testé. Le moteur refusait simplement de s'en servir quand `scaleRatios` était absent. Rien n'est inventé, rien n'est persisté : le ratio se calcule à la volée.
- **C'est le repli, pas l'absence de calibration, qui était dangereux.** L'ancien `coachUserLoadRatio()` retournait **1** sans ratios — soit la charge de l'athlète de référence servie telle quelle à un débutant. C'est ça que le blocage protégeait. Le repère de niveau le remplace : sur un Back Squat de programme à 165 lb, un débutant reçoit **75 lb**, pas 165.
- **Le clamp de bande [0,25 – 1,60] couvre aussi ce chemin.** Vérifié avec un seuil aberrant injecté (ratio 4,0) : **265 lb au lieu de 660** — le scénario du Deadlift à 600 lb ne peut pas repasser par là.
- **Une estimation ne se présente jamais comme une mesure.** La décision sort en `severity: watch` et sa raison, lue par le bouton `(!)`, dit « Estimation d'après le niveau déclaré : profil non calibré. » Le profil **reste compté comme non calibré** : l'app peut toujours inviter à calibrer, et l'historique reprend la main dès la première série loggée.
- **Le blocage subsiste pour le seul cas sans repère** : aucune table de niveaux disponible. Le moteur n'invente jamais un ratio.
- **Un profil sans niveau déclaré est traité comme intermédiaire** (0,75), comme le fait déjà `ratiosFromValues()`. **Un profil calibré n'est pas touché** : ses ratios de test priment, vérifié.
- **Correction du critère d'affichage de la V4.5.47.** Il demandait `coachProfileNeedsCalibration()` — juste tant qu'un profil non calibré ne recevait qu'une phrase, faux depuis qu'il reçoit 75 lb : il écartait cette vraie charge de sa fente. Seule la **longueur** décide désormais (> 40 caractères), ce qui a toujours été la vraie différence entre une charge et un message.
- **Ce que ça change dans le garde-fou** : `dev/client_charge_safety_checks.js` affirmait « un profil client non calibré est **bloqué** ». Il affirme maintenant qu'il reçoit une charge **bornée par son niveau**, ordonnée entre les trois niveaux, jamais celle de l'athlète de référence — et que le blocage reste quand aucun repère n'existe. La table des niveaux garde **un seul propriétaire** : le moteur la lit, il ne recopie pas ses seuils.
- **Portée** : `scripts/charge/scaling.js`, `scripts/charge/suggestion.js`, `scripts/app_helpers.js`, `index.html`. Garde-fou étendu : `dev/client_charge_safety_checks.js`, 10 mutations testées, 10 attrapées. Vérifié dans le navigateur aux trois niveaux : 70 / 115 / 150 lb.

## V4.5.47 — Un profil non calibré ne recouvre plus la carte de séance

- **Le moteur peut renvoyer une phrase à la place d'une charge.** Un profil non calibré reçoit « Profil non calibré : complète la calibration avant d'utiliser les charges suggérées. » — 88 caractères — **pour chaque mouvement**.
- **Cette phrase atterrissait dans la fente de la charge**, dimensionnée pour « 185 lb » : **41 px** en séance guidée, **31 px** sur WOD+. Elle s'enroulait sur huit lignes en Orbitron et recouvrait le reste de la carte, jusqu'à **masquer les champs poids / reps / RPE**. L'écran était inutilisable tant que la calibration n'était pas faite.
- **Le message se lit maintenant comme ce qu'il est** : un avertissement encadré, en texte courant (13-16 px), dans sa propre fente. La carte garde sa hauteur (648 px), le panneau Résultat reste visible, aucun débordement horizontal.
- **Le texte du moteur est conservé mot pour mot** : les vues ne le recopient pas, il change juste de fente. **Aucune décision de charge n'est touchée** — c'est de l'affichage seulement.
- **Le test interroge le moteur, il ne devine pas sur le texte.** `coachLoadIsMessage()` demande `coachProfileNeedsCalibration()` : tant que le profil n'est pas calibré, **rien** ne prend la fente de la charge de référence, même une valeur courte. Un filet de longueur (> 40 caractères) couvre tout futur message — la plus longue charge réelle du catalogue fait 33 caractères (« 185 → 205 → 215 → 225 si autorisé »), le seuil est posé au-dessus.
- **Une seule règle, un seul propriétaire** : le test vit dans `scripts/app_helpers.js` et sert aux deux vues touchées par le même défaut. Un profil calibré ne change en rien — valeur cyan à 47 px, vérifiée.
- **Portée** : `scripts/app_helpers.js`, `scripts/session/view.js`, `scripts/view_wodplus.js`, `styles.css`, `index.html`. Garde-fou étendu : `dev/client_charge_safety_checks.js` (côté affichage du contrat de calibration, exécuté sur le vrai code), 9 mutations testées, 9 attrapées.

## V4.5.46 — Chrono EMOM hors WOD et minuteur de repos, sans un pixel pris aux charges

- **Un EMOM programmé ailleurs qu'en bloc WOD n'avait aucun chrono.** Le vendredi de `phase2_fable5`, « A. Power Clean vitesse » est un bloc `kind:"main"` — or `buildGuidedSessionBlocks()` ne construisait `obj.timer` que pour les blocs `kind:"wod"`.
- **Deux blocages, pas un.** Même en levant le filtre, `wodTimerConfig()` aurait donné un chrono de **12 min** au lieu de 8 : il lit `block.text` (vide sur ce bloc) et `block.time`, qui est le créneau du bloc. La durée réelle vit dans le **`format` de l'exercice** — « EMOM 8 : 2 Power Clean ». C'est ce nombre, et lui seul, qui fait la durée.
- **Le chrono prend la place de l'heure, pas de l'espace.** Ajouter un chrono dans la carte aurait coûté de la hauteur aux cartes d'exercice, donc aux **charges, reps, RPE et recommandations de poids** — `.guided-ex-list` partage la hauteur libre entre ses cartes. Le mini-chrono occupe la boîte de `.guided-live-clock`, déjà présente et déjà à la bonne taille (`clamp(30px, 8.4vw, 38px)`), avec ses deux fentes `.glc-hm` / `.glc-sec`. **Coût en hauteur : zéro pixel, sur tous les blocs.**
- **Ce qui s'affiche, c'est la minute — pas le temps total.** Un EMOM ne se lit pas comme un AMRAP : `3/8` (minute courante sur total) et les **secondes restantes dans la minute**. L'étiquette passe en Inter, le nombre reste en Orbitron : même distinction de police que les rounds AMRAP.
- **L'alerte n'est pas dans le coin, elle est sur la carte.** En action on ne lit pas des chiffres — la **bordure de la carte** se peint aux mêmes paliers que le chrono WOD : bleu à 30 s, jaune à 10 s, rouge à 3 s, flash GO, avec bip et vibration. Sans ce couplage, un compteur à 38 px dans un coin serait inutile.
- **La ligne « Repos » devient le minuteur de pause.** Une consigne chiffrée (« 1:00 ») se tape et décompte dans la même boîte ; une consigne non chiffrée (« le reste de la minute ») reste un simple texte. **L'EMOM est prioritaire** : pendant un EMOM en cours, un repos ne peut pas prendre la barre — deux comptes à rebours au même endroit se contrediraient.
- **Sortir d'un bloc EMOM et y revenir ne remet rien à zéro** ; un repos qui tourne survit au changement de bloc ; tout meurt avec la séance, sans aucune clé de stockage.
- **Le bloc WOD ne change pas.** Il garde son chrono géant et son heure : le mini-chrono ne s'y arme jamais.
- **Portée dans le catalogue** : 32 blocs, 6 programmes (`phase2_fable5`, `client_rx_crossfit_4d`/`_5d`, `client_metcon_prep_3d`/`_4d`, `strict_muscle_up_10w`). La détection exige **« EMOM » suivi d'un nombre** : les 22 supersets en `3×AMRAP propre` et les tests `AMRAP @ 205 lb` sont des séries menées à l'échec, pas des blocs au chrono — aucun ne reçoit de chrono. Aucun programme n'est modifié.
- **Portée** : `scripts/session/mini_timer.js` (nouveau), `scripts/session/view.js`, `app.js`, `styles.css`, `index.html`. Garde-fou : `dev/mini_timer_checks.js` (nouveau) — détection vérifiée sur les vrais programmes, 24 mutations testées, 21 attrapées et 3 prouvées inertes.

## V4.5.45 — Le chrono ne grossit plus au premier round

- **Les mouvements étaient bien trop réduits.** Ils tombaient de 185 à 31 px alors que la banderole n'a besoin que de ~52 px. Ils descendent maintenant à 150 px : reps 44 → **38 px**, nom 30 → **26 px**, et la mise en page reste **empilée** — la carte garde exactement la même allure, juste un peu plus serrée.
- **C'est ce qui faisait grossir le chrono.** Les 133 px libérés en trop ne disparaissaient pas : ils partaient dans l'étirement vertical des chiffres, si bien que taper un premier round faisait bondir le chrono sans que personne ne l'ait demandé. En ne rendant que la hauteur réellement nécessaire, le chrono **ne bouge plus du tout**.
- **Vérifié à temps affiché égal** — la comparaison n'a de sens qu'à format constant, `10:00` et `5:05` n'ayant pas le même gabarit (règle verrouillée). À `10:50` : police **118 px**, étirement **×3,5**, hauteur des chiffres **1185 px**, boîte timer **435 px** — quatre valeurs strictement identiques avec 0, 4, 8 et 14 rounds.
- **Règle écrite** dans `docs/UI_CONSTRAINTS.md` : les mouvements rendent la hauteur de la banderole, pas un pixel de plus, et la vérification se fait à temps affiché égal.
- Testé aussi sur un AMRAP à 4 mouvements : aucun débordement horizontal, aucune erreur console.
- **Portée** : `styles.css`, `docs/UI_CONSTRAINTS.md`. Garde-fou mis à jour : `dev/amrap_rounds_checks.js`.

## V4.5.44 — Banderole des rounds : temps plus gros, mouvements récupérés

- **Retour à une banderole d'une ligne**, mais à pastilles hautes (52 px, la taille des rectangles de la grille). ~3 temps visibles, puis défilement collé aux derniers. Compromis assumé : trois temps **vraiment** lisibles valent mieux que douze illisibles, et une ligne coûte deux fois moins de hauteur qu'une grille — 52 px contre 97 à 215 px selon le nombre de rounds.
- **Une pastille ne porte plus que le numéro et le temps.** L'étiquette « le + rapide » / « le + lent » disparaît : la couleur or et bronze le dit déjà. Le « R » de « R1 » aussi — il reste `1`, `2`, `3`.
- **Deux polices pour deux natures.** Le numéro de round passe en **Inter**, le temps reste en **Orbitron** : impossible de confondre un numéro de round avec une valeur de chrono, même du coin de l'œil en plein effort.
- **Le temps de round passe de 22 à 27 px** — c'est exactement la place libérée par l'étiquette et le préfixe.
- **Les mouvements récupèrent la hauteur.** Ils étaient trop écrasés : reps de 19 → **30 px**, nom de 15 → **19 px** (contre 44/30 à pleine taille). 19 px et pas 21 : à 21, « WALL BALLS » repassait sur deux lignes et déséquilibrait les cartes. Bloc de 31 → 52 px à deux mouvements, 110 px à quatre.
- **Le chrono ne bouge pas** : 137 px, sa police se calculant sur la largeur (règle verrouillée). Vérifié à 0, 4, 8 et 14 rounds, et sur un AMRAP à 4 mouvements, sans débordement horizontal ni erreur console.
- L'écran Résultats garde ses étiquettes « le plus rapide » / « le plus lent » : la place y est disponible et le tableau se lit à froid, pas en plein WOD.
- **Portée** : `scripts/session/amrap_rounds.js`, `styles.css`, `docs/UI_CONSTRAINTS.md`. Garde-fou mis à jour : `dev/amrap_rounds_checks.js`.

## V4.5.43 — Podium des rounds : or et bronze

- **Le round le plus rapide passe en or de médaille** (`#f2c14e`) au lieu du jaune, et **le plus lent en bronze** (`#c87137`) au lieu du rouge — sur la grille de la séance comme sur l'écran Résultats.
- **Les deux teintes sont volontairement écartées, et l'or seul brille.** Premier essai à `#e3b341` / `#cd7f32` : sur fond sombre, or et bronze se confondaient à distance. L'or est éclairci et reçoit une lueur, le bronze est ramené vers le cuivre — c'est la brillance qui sépare les deux métaux sur un podium, pas la teinte.
- **`--gold` n'est pas touché** : il sert à 37 endroits ailleurs dans l'app. Deux jetons dédiés sont ajoutés, `--medal-gold` et `--medal-bronze`.
- Changement de couleurs seulement : aucune logique, aucune mesure, aucun autre écran modifié. Portée : `styles.css`.

## V4.5.42 — Les temps de round passent en grille lisible

- **Le problème n'était pas la hauteur, c'était la largeur.** La bande de pastilles introduite en V4.5.37 affichait les splits à 12 px. L'agrandir ne suffit pas : mesuré sur iPhone 402 px, il ne reste que ~250 px utiles après le compteur et le `↩`, soit **2,6 pastilles lisibles à 21 px**. Sur maquette, dès 4 rounds, R1 et R2 sortaient déjà de l'écran.
- **Grille à 4 colonnes** à la place de la bande défilante : temps de round à **22 px** (au lieu de 12), **12 rounds visibles d'un coup**, puis défilement vertical qui reste collé aux derniers. Les cellules or et rouge portent leur étiquette — « le + rapide », « le + lent » — au lieu d'une simple couleur.
- **La place vient des cartes de mouvement, repliées sur une ligne** (185 px → 31 px), et **seulement à partir du premier round tapé** : une fois le WOD lancé, l'athlète connaît ses mouvements ; avant, il doit les lire en grand. Tant qu'aucun round n'est compté, la carte WOD garde **exactement** son allure d'origine. Un `↩` qui ramène à zéro round les redéplie.
- **Boutons Précédent / Bloc suivant à 42 px** (au lieu de 48), rangée 54 → 48 px. Il fallait baisser la rangée en même temps : les boutons sont des éléments de grille, donc étirés à la hauteur de `.guided-actions` quelle que soit leur propre `min-height` — en changer un seul ne fait rien. Ils restent confortablement tapables au pouce (`docs/UI_CONSTRAINTS.md`).
- **La police du chrono n'est jamais touchée.** Elle se calcule sur la largeur (règle verrouillée) : mesurée à 137 px avec 4, 8 et 14 rounds, aucun débordement horizontal, aucune erreur console. La carte à 0 round est identique au pixel près à la version précédente.
- **Portée** : `scripts/session/amrap_rounds.js` (`stripHtml`/`refreshStrip` → `panelHtml`/`refreshPanel`), `scripts/session/view.js`, `scripts/session/timer.js`, `styles.css`. Garde-fou étendu : `dev/amrap_rounds_checks.js`.
- Note de version : ces changements étaient numérotés V4.5.40/V4.5.41 sur leur branche. `main` a livré ces deux numéros entre-temps (pastilles de WOD, carrés de jours) ; ils sont décalés en V4.5.42/V4.5.43 à la fusion, sans rien changer au contenu.

## V4.5.41 — Les carrés de jours sélectionnent le jour

- **Les pips de la barre de semaine ne faisaient rien au tap.** Ils affichent l'état de chaque journée (complétée, manquée, en cours) et sont la cible naturelle pour changer de jour, mais c'étaient de simples `<span>` décoratifs : il fallait descendre aux onglets de jour ou aux flèches ‹ ›.
- **Ce sont maintenant des boutons de sélection**, avec exactement l'action des onglets de jour (`state.day`, `save()`, `render()`) — aucune seconde voie de sélection, aucun état à tenir d'accord. Toutes les journées sont sélectionnables, pas seulement les complétées.
- **Zone tactile agrandie sans bouger la mise en page.** La pastille mesure 32×26 px, sous le seuil confortable iPhone, et l'agrandir décalerait la barre de semaine : un `::after` en position absolue porte la zone tapable à 44 px de haut sans occuper de place dans le flux (`docs/UI_CONSTRAINTS.md` — éviter les petits contrôles précis). Le débordement latéral (2 px) reste sous l'écart entre deux pastilles, donc aucune ne vole le tap de sa voisine.
- **Accessibilité** : `aria-label` annonçant la destination et l'état (« Aller à Jour 2 — complété »), `aria-current` sur la journée affichée. Retour tactile visuel au `:active`.
- **Portée** : `app.js` (`renderWeekProgress`), `styles.css`. Aucune donnée touchée, aucun schéma modifié.

## V4.5.40 — Une pastille de WOD = un mouvement

- **Une seule pastille avalait tout le WOD.** `parseWodStructure()` ne découpait le texte que sur « + ». Sur « EMOM 10 min — minutes impaires : 8 calories vélo ou rameur **;** minutes paires : 6 burpees contrôlés », le nom du premier mouvement prenait toute la fin de la phrase — quatre lignes de texte collées au chiffre 8 — et le burpee, qui est la moitié du WOD, n'avait aucune pastille. Le découpage se fait maintenant aussi sur « ; » et « puis ».
- **Une étiquette de position n'est pas un nom de mouvement.** « minutes paires : », « station 3 : » sont retirées, mais **seulement si un nombre suit** : sinon on couperait un vrai texte (« Row : rythme facile » reste entier).
- **Un nombre suivi d'une unité de temps est une durée, pas des répétitions.** « 10 à 15 min de marche inclinée ou de vélo facile » donnait une pastille « 10 » nommée « à 15 min de marche… ». Elle ne produit plus aucune pastille : le bloc affiche son texte complet sous le chrono, ce qui est le rendu juste pour un retour au calme.
- **Nuance qui évite de perdre un mouvement** : le rejet ne vaut que si le temps mesure l'effort entier (« 10 min **de** marche »). « 20 sec side plank/côté » garde sa pastille — l'unité quitte le nom, le 20 reste le chiffre.
- **Plages et pyramides lues en entier** : « 8-10 ring rows » et « 2-3 ramp-up sets » donnaient « 8 » suivi d'un nom commençant par « -10 ». La branche EMOM (`min 1 = …`) passe maintenant par la même lecture du nombre de tête que les autres.
- **Filet de sécurité sur le nom** : il s'arrête au premier connecteur de consigne (`,` `.` `—` « puis » « si ») et ne dépasse jamais 34 caractères, ellipse à l'appui. `.guided-wod-name` ne tronque pas : sans borne, un texte de programme mal formé déborde de la pastille (`docs/UI_CONSTRAINTS.md`). **« avec » n'est volontairement pas un connecteur** — il appartient à de vrais noms (« Marche avec haltères »).
- **Piège corrigé au passage** : `^s\b` matchait « séries », parce que « é » n'est pas un caractère de mot en JS. « 2 séries progressives de front squat » était lu comme une durée en secondes et disparaissait.
- **Vérifié par comparaison ancienne/nouvelle analyse sur les 217 textes de blocs de tous les programmes** : 11 différences, toutes des corrections ou des troncatures voulues, aucune régression.
- **Écran Résultats** : `parseWodStructure()` alimente aussi la capture de résultats, donc les mouvements d'un AMRAP y arrivent corrigés. Les pastilles de reps du dernier round passent par `wodMoveMaxReps()` et ne tombent plus à NaN sur un libellé non numérique (« 21-15-9 »), qui ne produisait alors aucune pastille.
- **Portée** : `app.js` (`parseWodStructure` et ses quatre helpers), `scripts/session/results.js`. Aucun texte de programme réécrit, aucune clé de stockage touchée, moteur de charges et Brain non concernés. Garde-fou `dev/wod_moves_checks.js`.

## V4.5.39 — Corriger la date de fin d'un cycle

- **Racine inscrivait la date du jour où on classe le cycle, pas celle où on l'a terminé.** Un cycle fini le 10 juillet et rangé en août portait la date d'août, sans aucun moyen de la corriger : « Changer le statut » ne touchait que terminé / archivé / abandonné.
- **Un bouton « 📅 Changer la date » à deux endroits** — sur la fiche de cycle (onglet Cycle) et sur chaque entrée de la frise Saison. Ce sont les deux endroits qui affichent cette date, et **corriger l'un corrige l'autre** : plus jamais deux dates différentes pour un même cycle.
- **Le compte de PR suit.** Le journal de Saison borne les PR d'un cycle par ses dates de début et de fin : déplacer la fin sans recalculer laisserait un chiffre qui ne correspond plus à la fenêtre affichée. `CoachSeason.setCycleEnd()` recalcule. Vérifié : ramener une fin du 7 août au 10 juillet fait passer la frise de « 2 PR » à « 1 PR », le PR du 20 juillet sortant de la fenêtre.
- **Une roue de date, pas une chaîne à taper.** La modale utilise un `<input type="date">` : sur iPhone, ça ouvre le sélecteur natif au lieu d'obliger à écrire « 2026-07-10 » au clavier texte (`docs/UI_CONSTRAINTS.md` — éviter les petits contrôles précis). Boutons à 52 px, fond tapable, verrou de scroll, même coquille que les autres popups.
- **Bornes et refus explicites** : pas plus tôt que le début du cycle, pas plus tard qu'aujourd'hui, jamais vide (une date vide effacerait l'information corrigée). Une fin antérieure au début est refusée plutôt qu'écrite — une fenêtre inversée donnerait 0 PR sans que personne ne comprenne pourquoi.
- **Rien n'est effacé** : la date de rangement est conservée dans `filedAt`. On corrige la date de fin sans perdre le fait qu'elle a été saisie plus tard.
- **Portée** : `scripts/ui_modals.js` (modale de date générique `openDatePickerModal`, aucune logique métier), `scripts/season/index.js` (`setCycleEnd`, `findCycleIndex`), `scripts/season/ui.js` (frise), `app.js` (fiches), `styles.css`. Garde-fou étendu : `dev/cycle_finish_checks.js`.

## V4.5.38 — Un cycle terminé se classe « terminé », pas « en pause »

- **Il manquait une sortie.** Racine n'en avait que trois : pause (récupérable), archivé, abandonné. Un cycle mené jusqu'au bout n'est aucune des trois — d'où l'absence de bouton pour terminer un cycle, et la proposition de « mettre en pause » ou « archiver » un programme pourtant fini au moment d'en démarrer un autre. Le vocabulaire existait déjà à moitié : `cycleStatusLabel()` savait dire « Terminé », mais rien n'écrivait jamais ce statut.
- **Une carte « ✓ Terminer ce cycle » dans l'onglet Cycle**, présente en permanence. Elle ne dépend pas du détecteur de fin : le bandeau « Cycle terminé 🎉 » de la vue WOD exige un compte de séances exact (`state.week > totalWeeks()`, ou dernière semaine avec toutes les séances complétées), et s'il ne se déclenche pas il ne devait plus rester un seul chemin où finir un cycle passe par « archiver ». La carte affiche la progression réelle — `S1 sur 1 · 4 séances sur 4 cette semaine` — pour qu'on voie tout de suite où on en est.
- **Trois états lisibles** : cycle en cours (carte neutre, bouton discret) ; cycle allé au bout (carte verte, « 🎉 Ce cycle est allé au bout », bouton en action principale) ; cycle déjà classé (« ✓ Cycle terminé le 2026-08-07 · Voir le bilan »).
- **Terminer un cycle** le journalise dans la Saison, crée une fiche au statut `completed` (carte verte, pastille « TERMINÉ », `terminé <date>` dans le détail) puis ouvre l'écran Fin de cycle — bilan et propositions de suite. Les séances complétées ne sont pas effacées : le bandeau de fin reste visible jusqu'au choix du programme suivant.
- **Une seule porte de fermeture.** `closeActiveCycleBefore()` choisit la sortie et remplace tous les appels directs à `pauseCurrentCycle()` dans les flux de changement de cycle : déjà classé terminé → on ne refile rien (sinon une fiche fantôme « en pause » pour un cycle qu'on vient de finir) ; détecté terminé → classé terminé ; sinon → pause récupérable, **comportement d'origine strictement préservé**. `saveCycle()`, `resumeSavedCycle()`, `resumeArchivedCycle()` et l'écran Fin de cycle y passent tous.
- **Les textes suivent la sortie réellement appliquée** : « Le cycle actuel est terminé : il sera classé comme terminé dans ta saison » au lieu de « sera mis en pause ». Archiver un cycle déjà terminé est refusé et le dit — sinon deux fiches pour un même cycle.
- **L'écran Fin de cycle ne range plus un cycle fini dans les archives.** Enchaîner sur un programme depuis cet écran le classait `archived`, donc dans « Cycles archivés / abandonnés » : il le classe maintenant `completed`.
- **Vocabulaire** : la liste devient « Cycles terminés / archivés / abandonnés », et « Changer le statut » fait tourner terminé → archivé → abandonné → terminé, pour corriger un classement sans passer par « abandonné ».
- **Persistance** : un seul champ additif, `activeCycleFinishedAt` (`YYYY-MM-DD` ou null). Absent d'un ancien profil = null, donc **aucune migration** ; il voyage dans le payload de cycle et donc dans l'export JSON. Aucune clé de stockage créée, aucune séance, charge ni référence touchée.
- **Vérifié en navigateur** sur les quatre cas : cycle terminé → 0 en pause et 1 fiche `completed` ; cycle en cours (S2 sur 6) → toujours une pause récupérable ; cycle déjà classé puis démarrage d'un autre → toujours exactement 1 fiche, pas de doublon ; archivage d'un cycle terminé → refusé.
- **Portée** : `app.js` (machine à états des cycles), `scripts/season/ui.js`, `index.html`, `styles.css`. Garde-fou `dev/cycle_finish_checks.js`.

## V4.5.37 — Rounds d'AMRAP comptés au doigt sur le chrono

- **Un tap n'importe où sur la carte du chrono = un round de plus.** En séance guidée, sur un WOD AMRAP, toute la surface du chrono devient le compteur : pas de bouton à viser, pas de confirmation, pas de son — une vibration courte et le WOD continue. Les boutons gardent leur rôle (▶, Ⅱ, ↻, le libellé d'édition et le toggle son n'ajoutent jamais de round), et l'affichage des chiffres étant en `pointer-events:none`, un tap sur les chiffres eux-mêmes arrive bien au compteur.
- **Le temps enregistré est celui affiché à l'écran**, pause comprise, jamais une horloge parallèle : un round noté « 1:12 » correspond au chrono au moment du tap. Aucun round pendant le décompte de départ ni tant que le chrono n'a pas avancé d'une seconde — et **deux taps dans la même seconde affichée ne peuvent pas être deux rounds**. Le garde-fou est la seconde du chrono, pas un anti-rebond en millisecondes : un split nul fausserait le classement rapide/lent de tout le WOD.
- **Le plus rapide en or, le plus lent en rouge.** Un bandeau d'une ligne au-dessus du chrono porte le compte et le split de chaque round, défilant horizontalement pour qu'un AMRAP de 15 rounds ne passe jamais sur deux lignes. Le classement n'apparaît qu'à partir de deux splits distincts — colorer un round unique en or ne dirait rien. Un `↩` retire le dernier round en cas de tap de trop.
- **La taille des chiffres du chrono n'est pas touchée.** Le bandeau est **au-dessus** de la boîte du chrono, jamais dedans : la police se calcule sur la largeur disponible (règle verrouillée, `docs/UI_CONSTRAINTS.md`), et le bandeau ne prend qu'une part de la hauteur libre qui servait à étirer les chiffres verticalement. Le calcul de fit le mesure comme n'importe quel voisin.
- **Le compte se transfère tout seul dans Résultats** : la pastille ROUNDS COMPLÉTÉS arrive pré-sélectionnée sur le nombre tapé (l'estimation du programme ne sert plus que de repli), et la borne haute des pastilles s'étend quand le compte réel la dépasse — sinon le transfert automatique aurait proposé un round non cliquable.
- **Le temps qui restait pour le dernier round entamé.** Un AMRAP se finit rarement sur un round complet : l'écran Résultats reprend le journal des rounds (un split par ligne, or et rouge aux mêmes endroits) puis annonce ce qu'il restait au chrono après le dernier round complet — le temps dont l'athlète disposait pour ses reps partielles. « 6 burpees » ne veut rien dire sans « il restait 0:42 ». Cette information suit le résultat jusque dans l'historique et le résumé de séance.
- **Aucune donnée durable créée par le module** : le comptage vit en mémoire vive le temps d'une séance, aucune clé de stockage n'est créée, aucun schéma persisté n'est modifié. Ce qui survit part par la ligne WOD de l'écran Résultats, en champs texte ordinaires (`rounds`, `roundSplits`, `lastRoundRemaining`) — donc exportables et réimportables comme le reste du journal, et préservés par la correction d'une séance passée.
- **Remises à zéro volontaires** : ouverture d'une séance, abandon (✕), ↻ du chrono, et toute édition du chrono — des rounds mesurés sur une autre durée n'ont plus de temps restant valable.
- **Portée** : nouveau module `scripts/session/amrap_rounds.js` (`window.CoachAmrapRounds`), points d'accroche dans `scripts/session/timer.js`, `view.js`, `results.js`, `save.js`, plus `styles.css`. Garde-fou `dev/amrap_rounds_checks.js` (statique + exécution réelle du comptage, sans DOM). Moteur de charges, Brain et Avis IA non touchés.

## V4.5.36 — Corriger une séance déjà enregistrée

- **Un bouton « Modifier » sur chaque séance de l'Historique**, à côté de « Supprimer », qui retombe dans l'onglet Résultats pré-rempli avec cette journée-là. Jusqu'ici une charge mal notée ne se corrigeait qu'en supprimant toute la séance et en la ressaisissant — ou pas du tout, une fois la journée passée. L'écran est celui des résultats de fin de séance : mêmes cartes, mêmes contrôles − valeur +, même arrondi d'équipement, plus un champ NOTE par mouvement. Un bandeau rappelle la date et la séance corrigée, les libellés changent (« Modifier · <date> », « Mettre à jour la séance », « ← Retour Historique ») pour qu'on ne croie jamais écraser aujourd'hui.
- **L'entrée d'historique est modifiée en place** : aucune séance n'est ajoutée ni supprimée, et rien n'est inventé — seuls les mouvements réellement enregistrés ce jour-là sont éditables. Une clé absente du journal est ignorée, les champs non édités (`planned`, `extra`, `time`…) survivent intacts, et un champ vidé est traité comme un effacement volontaire (contrairement à `collectSessionResults()`, où un champ vide veut dire « non saisi »).
- **Le journal brut reste la source de vérité.** Une fois l'entrée corrigée, `rebuildRefsFromHistory()` reconstruit intégralement `movementRefs`, `athleteState` et l'historique RPE depuis l'historique complet — jamais l'inverse. Les charges suggérées repartent donc des vraies valeurs dès la séance suivante, et la reconstruction précède la persistance.
- **Une seule règle de classement, partagée avec la saisie du jour.** Les quatre lignes qui écrivent `status` / `performanceRatio` / `coachNote` sont extraites de `enrichSessionResults()` dans `applyPerformanceClassification()` et exposées sur la porte publique du moteur (`CoachCharge.classifyResult`) : la correction reclasse exactement comme la saisie initiale, sans recopier une règle de charge hors de `scripts/charge/`. Refactor pur côté moteur — le golden master reste byte-identique.
- **Le cache de la séance en cours n'est jamais mélangé à l'édition** : `guidedResultCache` est mis de côté à l'entrée et restauré à la sortie (sauvegarde comme retour), donc ouvrir une correction en plein entraînement ne perd aucune saisie. `setActiveWeek()`, `applyWeekTrackingForWeek()`, `buildWeekTrackingForWeek()` et le scoping semaine/jour ne sont pas touchés : l'édition ne change ni `state.week` ni `state.day`.
- **Limite assumée** : l'agrégat mensuel de La Saison (`state.longTerm`, écrit par `CoachRetention.recordSession`) est un compteur cumulatif non rejouable. Une correction ne le réécrit pas — le rejouer entièrement ajouterait aussi les séances antérieures à cette couche, ce qui dépasse la correction demandée. Charges, `athlete_state` et RPE, eux, sont bien reconstruits.
- **Portée** : nouveau module `scripts/session/history_edit.js` (`window.CoachHistoryEdit`), trois points d'accroche défensifs (`results.js`, `save.js`, `app.js`), `scripts/charge/suggestion.js` + `scripts/charge/index.js` pour la règle de classement partagée, `styles.css`. Garde-fou `dev/history_edit_checks.js` (statique + test réel de la fusion, sans DOM).

## V4.5.35 — Le chrono occupe toute la hauteur libre

- **La largeur reste la contrainte qui fixe la police, la hauteur vide est enfin utilisée.** Une chaîne de 5 caractères sur 402 px d'écran ne peut pas dépasser ~100 px de haut sans déformer les glyphes — mesuré, il restait jusqu'à **230 px de vide** entre les mouvements et la carte timer. Les chiffres s'étirent maintenant verticalement pour l'occuper : sur un WOD à deux mouvements, l'étirement atteint 3,4× et le trou disparaît complètement.
- **La largeur ne bouge pas d'un pixel** : l'étirement est purement vertical, la police reste celle calculée par la largeur. Vérifié seconde par seconde sur 7 durées (8 à 60 min) : remplissage maximal 94 % de la largeur utile, aucun débordement.
- **Effet de bord bienvenu** : la hauteur du chrono ne change plus au passage sous les 10 minutes. Les deux phases de format remplissent le même espace, seule la largeur des chiffres change.
- **Calcul idempotent** : l'étirement est remis à zéro avant chaque mesure (`guidedResetTimerStretch`, la taille issue de la largeur étant mémorisée dans `data-fit-size`), sinon la passe suivante mesurerait un espace déjà comblé et l'étirement retomberait à 1. Vérifié : trois passes consécutives donnent exactement le même résultat.
- **`pointer-events:none` sur l'affichage.** Les chiffres débordent visuellement leur boîte (interlettrage serré, puis étirement) et ce débordement vide captait les taps du libellé. C'était corrigé au coup par coup avec un `z-index` ; c'est maintenant traité à la racine, l'affichage n'ayant aucun contenu interactif. Vérifié : libellé, toggle son, ▶, Ⅱ, ↻, Précédent, Bloc suivant et les cartes de mouvement reçoivent tous leur tap.
- **Variante écartée** : agrandir la police puis compresser par `scaleX`. Le texte débordait alors très largement sa boîte avant transformation et `text-align:center` ne le recentrait pas — les chiffres partaient hors écran à droite. Documenté dans le code pour ne pas y revenir.
- Garde-fou `GUIDED_TIMER_MAX_STRETCH` à 3,5 : une seule constante à baisser (2 ou 2,5) pour un étirement plus sage.

## V4.5.34 — Les chiffres étroits ne se collent plus à leur voisin

- **`1`, `4` et `7` n'ont aucune approche à gauche dans Orbitron.** Mesuré glyphe par glyphe à 120 px : les chiffres larges (`0 2 3 5 6 8 9`) portent 6 à 9 px d'approche de chaque côté, mais l'encre du `1` occupe toute sa chasse (`0→46` sur 47), celle du `4` (`0→82` sur 88) et du `7` (`0→72` sur 79) démarre au bord. Avec l'interlettrage négatif du chrono, **20 paires sur 100 se chevauchaient** : `11` de 6 px, `14`, `17`, puis `41 44 47 61 64 67 71 74 77 37` et tous les `1x`. « 21:00 » se lisait comme un bloc.
- **Chaque glyphe étroit récupère l'approche qui lui manque**, jamais par paire : `1` (+.050em / +.066em), `4` (+.050em / +.025em), `7` (+.050em / +.017em). L'écart retombe sur les ~8 px naturels des autres chiffres, ni plus ni moins.
- **Aucun risque de débordement** : un `1` margé fait 61 px contre 100 pour un `0`, donc le texte réel reste toujours plus étroit que le gabarit, qui est construit sur les chiffres les plus larges. Vérifié seconde par seconde sur 7 durées (8 à 60 min) : remplissage maximal 94 % de la largeur utile, aucun dépassement.
- **Coût mesuré : 122 px → 117 px** sur un timer de 11 min. C'est le prix d'un `11:00` lisible plutôt que d'un bloc unique.
- Le balisage par caractère est partagé entre l'affichage et la mesure (`guidedTimerClockHtml`), donc les marges sont comptées dans le calcul de taille.

## V4.5.33 — Chrono plus gros sur les minutes étroites, deux-points enfin visibles

- **Le gabarit de mesure n'invente plus des chiffres impossibles.** La taille du chrono se calcule sur un gabarit (jamais la forme exacte affichée, sinon elle changerait à chaque seconde) — mais ce gabarit était `88:88` en dur. Dans Orbitron, un `1` fait **36 px là où un `8` en fait 83** : un timer de 11 min était donc calibré pour une largeur qu'il n'atteindrait jamais. Le gabarit est maintenant le plus large affichage **qui peut réellement apparaître dans ce timer** (`10:00` pour un timer de 10 à 19 min, `20:00` au-delà, inchangé quand les chiffres larges sont possibles).
- **Mesuré : 107 px → 122 px** sur un timer de 11 min, soit **+14 %**, sans rien changer aux minutes à un chiffre. Aucun gain artificiel : pour un timer de 20 min ou plus, le gabarit reste aussi large qu'avant parce que les chiffres larges y sont réellement possibles.
- **La taille reste stable**, vérifié seconde par seconde : 122 px de 11:00 à 10:00, puis 138 px de 9:59 à 0:00 — le seul changement est celui qui existait déjà au passage sous la barre des 10 minutes. Contrôle exhaustif sur 7 durées (8 à 60 min) : le gabarit est toujours un majorant du pire affichage réel, remplissage maximal 94 % de la largeur utile, **aucun débordement**.
- **Correction — les deux-points disparaissaient après un `1`.** Le `1` d'Orbitron est collé à droite de sa chasse ; avec l'interlettrage négatif du chrono, les deux-points se fondaient dans sa barre. `1:00` se lisait `100` et `11:00` se lisait `1100` — donc **toute la dernière minute de chaque WOD**. Bug pré-existant, indépendant du timer éditable. Les deux-points ont maintenant leur propre boîte avec une marge de `.03em`, incluse dans la mesure de taille (le gabarit et l'affichage partagent le même balisage), donc le chrono ne déborde pas. Coût : 1 à 2 px de police, pour un affichage lisible.
- **Portée** : `scripts/app_helpers.js` (gabarit partagé, repli identique à l'ancien comportement sans mesureur), `scripts/session/timer.js`, `scripts/session/view.js`, `styles.css`, `docs/UI_CONSTRAINTS.md`.

## V4.5.32 — Le chrono retrouve sa taille exacte

- **Correction de V4.5.31.** Le bouton d'édition avait été dessiné en pastille bordée (bordure + padding + `min-height:32px`), ce qui ajoutait **13 px** à la carte timer. `fitGuidedWodTimer()` calcule la taille des chiffres à partir de la place restante : sur une carte dense, les chiffres tombaient de **140 px à 129 px**. Mesuré avant/après sur quatre hauteurs d'écran (874, 760, 667, 600 px).
- **Le libellé reprend exactement la boîte de l'ancien `<div>`** : aucune bordure, aucun padding vertical, aucune hauteur minimale, aucune marge. Les chiffres retrouvent **140 px partout**, et la position du chrono redevient identique au pixel près à V4.5.30.
- **La zone tactile reste confortable** sans coûter un pixel : un `::after` en position absolue déborde de 15 px vers le haut (l'espace vide au-dessus du libellé) et de 6 px vers le bas, donc il n'occupe aucune place dans le flux. Vérifié : tap au-dessus du texte, sur le texte et juste sous le texte ouvrent tous la modale.
- **Le toggle son garde son coin** (`z-index:3`) : il reste cliquable sous la zone tactile élargie du libellé.
- **Règle inscrite dans le CSS et dans `docs/UI_CONSTRAINTS.md`** : la taille des chiffres du chrono prime sur tout élément ajouté à la carte timer. Rien de ce qui est ajouté ne doit occuper de hauteur dans le flux.

## V4.5.31 — Timer du WOD éditable en séance

- **Le timer se règle sur le terrain.** Le libellé du timer de la vue séance (« AMRAP 12 min », « EMOM 8 min · bip/1:00 ») devient un bouton `✎` qui ouvre une modale : **durée** (−5 / −1 / +1 / +5 min, bornes 30 s → 120 min), **intervalle des bips** (15 s, 20, 30, 45, 1:00, 1:15, 1:30, 2:00, 2:30, 3:00, 4:00, 5:00) et **sens** (décompte / chrono). Les bips d'intervalle s'activent sur n'importe quel WOD, pas seulement sur ceux dont le texte contient « EMOM ».
- **Le programme n'est jamais réécrit.** L'édition vit dans l'objet `cfg` du bloc (`guidedSessionState.blocks[i].timer`) : elle survit à la navigation entre blocs et disparaît à la fermeture de la séance. Les valeurs du programme sont conservées (`baseSeconds`, `baseMode`, `baseIsEmom`, `baseIntervalSec`) et « Rétablir » y revient d'un tap. **Aucune clé de stockage n'est créée, aucun schéma persisté ne change** (`CLAUDE.md §2.1`).
- **La capture de résultats n'est pas touchée** : `collectSessionExercises()` continue de lire la durée du programme (`b.time`) pour estimer les rounds. Un timer raccourci sur le terrain ne modifie donc ni l'historique, ni `athlete_state`, ni le moteur de charges.
- **Libellé et kicker suivent l'édition** : le mot de tête du programme est conservé (AMRAP / EMOM / CAP / Timer), seule la durée change — un WOD raccourci n'annonce plus « AMRAP 12 min ».
- **Correction — bips d'intervalle décalés en décompte.** Ils se calaient sur `remaining % 60`, ce qui décalait tous les bips quand la durée n'était pas un multiple de l'intervalle (un cap de 10:30 bipait à 30 s, 1:30, 2:30…). Ils se calent maintenant sur le temps écoulé, dans les deux sens.
- **Correction — double signal en fin de WOD** : le dernier bip d'intervalle tombait en même temps que le signal de fin quand la durée était un multiple de l'intervalle. Le bip d'intervalle s'arrête avant le dernier tic.
- **Correction — le libellé du timer n'était pas cliquable.** Les chiffres géants (`line-height: 0.82`) débordent visuellement vers le haut et capturaient le tap sur la zone du libellé ; le bouton est repositionné au-dessus de ce débordement.
- **Layout séance intact** : aucune rangée de contrôles n'est ajoutée à la carte WOD (l'édition vit dans une modale `.tuto-modal`, comme le tuto et l'explication de charge), donc le timer géant, Start/Pause/Reset et les boutons de bloc gardent leur place en portrait iPhone (`docs/UI_CONSTRAINTS.md`).
- **Alerte visuelle EMOM adaptée à l'intervalle** : les paliers 30 s / 10 s / 3 s / GO restent identiques à une minute, et se resserrent (moitié du cycle / 5 s / 3 s) sur les intervalles courts pour ne pas peindre tout le cycle en bleu.
- **Portée** : `scripts/session/timer.js` (domaine timer), `scripts/session/view.js` (deux points d'accroche), `styles.css`. Moteur de charges, Brain, Avis IA et sauvegarde ne sont pas touchés.

## V4.5.30 — Programme de transition « Retour au travail »

- **Nouveau programme public `retour_au_travail`** (`programs/retour_au_travail.js`) : une semaine, quatre séances, pour les athlètes qui reprennent après 2 à 4 semaines d'arrêt ou d'activité très réduite. Full body / technique + conditionnement / bas du corps / haut du corps + WOD court.
- **Rien de neuf dans l'architecture** : même contrat que `programs/transition_weeks.js` (`durationWeeks:1`, `objective:"transition"`, `macroRole:"transition_cycle"`). Un fichier, une entrée dans `programs/index.js`, une balise `<script defer>` dans `index.html`.
- **Il ne s'auto-propose jamais.** `objective:"transition"` le sort du classement de La Saison (`scripts/season/suggest.js:62`) : il se choisit à la main. Rien n'est relancé automatiquement à la fin — la recommandation de reprise du cycle précédent est un bloc `kind:"bonus"` en fin de séance 4, informatif, ignoré par la capture de résultats.
- **Charges à ≈65-70 % des charges habituelles**, exprimées dans l'unité que le moteur comprend : l'échelle du 1RM de l'athlète de référence (≈55 % de ce 1RM), remise au niveau réel de chaque athlète par `scripts/charge/scaling.js`.
- **Deux verrous anti-progression, volontaires** : le libellé de semaine porte « récupération » (contexte deload de `coachIsDeloadWeekOrContext()` → pas de reprise depuis l'historique, plafond sous la dernière référence), et chaque note d'exercice porte la consigne technique (intention « technique » de `coachExtractMovementIntent()` → la charge affichée reste celle du programme). Un résultat de cette semaine ne remplace donc jamais une capacité principale.
- **Règle des noms respectée** : les libellés à options de la demande (« row avec haltères ou barre », « pull-ups ou lat pulldown », « fentes marchées ou arrière », « power clean technique ») deviennent un nom de mouvement réel + l'alternative dans `note`, conformément à `docs/STRUCTURE_CONTRACT.md`.
- **Moteur** : un seul ajout, le repère de charge par défaut de `Seated Cable Row` dans `scripts/charge/movement_tuning.js` — seul mouvement du programme qui n'en avait pas. Aucun autre programme ne l'utilise ; `dev/charge_suggestion_golden_master.js` reste identique.
- **Tests** : `dev/retour_au_travail_checks.js` (structure, ordre des séances, plafonds RPE, absence d'échec/test de max, présence de la description, de l'avertissement et de la recommandation de fin). `dev/program_calibration_checks.js` couvre désormais aussi ce fichier pour la règle des noms ; le compteur de programmes publics de `dev/program_catalog_checks.js` passe de 29 à 30.
- **Aucune migration** : rien de persisté ne change, l'ajout est purement additif.

## V4.5.29 — Mesurer si Brain se trompe de moins en moins
- **L'objectif n'est pas d'implanter Brain.js quand il sera parfait, c'est que Brain se trompe de moins en moins.** La boucle existait déjà : `scripts/charge/brain_memory.js` accumule par mouvement + intention des compteurs à vie (prédictions testées, réussies, trop ambitieuses, trop prudentes, corrections manuelles de l'athlète), qui repartent dans la décision suivante à 30 % de poids (`confidenceRaw × 0,70 + mémoire × 0,30`). Ce qui manquait, c'était de pouvoir **voir la courbe**.
- **Défaut de forme corrigé** : `precision = réussies / testées` est un ratio **cumulatif**. Après 200 prédictions, dix bonnes séances récentes ne le déplacent presque plus — le progrès réel se noyait dans le passé de débutant. C'est exactement le mauvais outil pour mesurer une amélioration.
- **Précision glissante** sur les 10 dernières prédictions testées. 10 ≈ 1,5 à 2,5 mois sur un mouvement fait 1-2×/semaine ; à 20, la fenêtre couvrait 3 à 5 mois et noyait le progrès qu'elle est censée montrer. Elle vaut `null` sous 5 prédictions — mieux vaut pas de chiffre qu'un chiffre sur deux points — et `precisionSample` expose la taille d'échantillon à côté, parce qu'à ce volume elle reste bruitée.
- **Courbe mensuelle** : un point par mois, `{mois, testées, précision}`, 24 mois glissants. Chaque point mesure **son** mois, sans dilution par les précédents. `CoachBrainMemory.precisionTrend()` agrège tous les mouvements pour répondre à « est-ce que je me trompe moins qu'il y a deux mois ».
- **Vérifié** : dix prédictions ratées puis dix réussies donnent **50 % à vie mais 100 % en fenêtre**, et une courbe **0 % en mars → 100 % en mai**. C'est précisément l'écart entre les deux mesures qui est la courbe d'apprentissage.
- **Ce sont des instruments, pas des règles** : ni la fenêtre ni la courbe n'entrent dans le calcul de charge. `dev/charge_suggestion_golden_master.js` reste byte-identique.

### Migration (`CLAUDE.md §2.1`)
- `VERSION` fait partie de la **clé de stockage** (`storageKey()`) et n'a **pas** été touchée : la changer aurait orphelin toute la mémoire déjà accumulée. Le schéma du **contenu** évolue séparément — `SCHEMA = 2` + `migrateMemory()`, appliqué à la lecture.
- La migration est **non destructive** : compteurs à vie, journal et champs inconnus sont préservés. Vérifié par assertion sur un profil écrit au format d'avant.
- Les profils migrés démarrent leur fenêtre **vide**. Les issues par prédiction n'étaient pas stockées, seulement leurs totaux : la courbe ne peut pas être reconstruite, elle commence au premier résultat qui suit la mise à jour. Aucun passé inventé.

### Effet de bord utile
Cela donne le vrai critère pour Brain.js, meilleur que les « 3-6 mois » écrits dans la roadmap — un chiffre qu'aucun document ne justifiait : **si la courbe plafonne trop haut en erreur, une couche ML a un travail à faire ; si elle continue de descendre, elle n'en a pas.** La décision se prendra sur une mesure, pas sur une date.

- **Couverture** : `dev/charge_engine_checks.js` scénario 15, 10 assertions (migration + fenêtre + courbe).

## V4.5.28 — Un frein de sécurité survit à la couche Brain
- **Découvert en triant les alertes du simulateur.** Après un échec total à 220 lb, `guardedSuggestedLoadDecision()` décidait correctement **175 lb** (« charge cappée jusqu'à confirmation ») — mais `coachSafeSuggestedLoad()`, qui applique Brain V1.16 par-dessus, ressortait **220 lb** : exactement la charge qui venait d'échouer. Le correctif de la version précédente était donc défait une couche plus haut.
- **Brain ne peut plus défaire un frein** : il raffine une progression normale, il ne remonte plus une décision que la pile de règles a déjà flaggée `warning`/`critical` (cap `recalibrating`/`watch`, RPE haut répété, échec). Le garde-fou est général — il ne vise pas que le cas 0 rep — et suit le précédent déjà présent dans cette couche (`if(isLimited) return base.loadText;`).
- **Plage d'un échec sans prescription connue** : le repli introduit à la version précédente était une constante (8 reps), donc l'échec d'un Back Squat travaillé en **force** atterrissait dans la plage **hypertrophie**. Le cap tombait à côté et la suggestion des 5 reps l'ignorait. Sans `planned`, l'échec est maintenant classé dans la plage où le mouvement est réellement travaillé, d'après sa fiche la plus récente.
- **Comportement mesuré** : `guardedSuggestedLoadDecision` 175 lb → `coachSafeSuggestedLoad` **175 lb ⚠** (au lieu de 220 lb).

### Outillage — `dev/simulate_multi_users.js`
- **Trace semaine par semaine dans le JSON** (suggéré / réalisé / RPE / raison / deload). Sans elle, trier une alerte obligeait à rejouer chaque profil à la main.
- **Détecteur de tendance corrigé** sur trois points : une baisse sous RPE ≥ 8,7 devient « baisse assumée (RPE élevé) » — c'est la prudence RPE qui fait son travail, pas une anomalie ; une variation de reps à **charge constante** n'est plus une baisse (à charge fixe, deux reps d'écart font ~7 % d'e1RM) ; et sur les mouvements au poids du corps, où `e1rm` vaut le nombre de reps, il faut au moins 2 reps d'écart avant de parler de tendance.
- **Modèle d'athlète** : seul le profil « données incohérentes » dévie sur la charge. Un bruit de charge hebdomadaire faisait cliquet — le moteur repart à juste titre de ce qui a été soulevé, donc chaque tirage négatif devenait définitif, et `detectTrend()` imputait au moteur une dérive fabriquée par le simulateur.
- **Fidélité** : `feedEngine()` transmet la prescription (`planned`), comme `save.js` qui enrichit les résultats avant de les écrire.
- **Trou de couverture fermé** : un profil cohérent produit désormais un échec total délibéré (`failWeek`), avec l'assertion que la suggestion suivante descende sous la charge échouée. Un test de mutation avait montré que neutraliser `coachRuleAthleteStateCap()` passait cette suite au vert.
- **Verdict** : 10 PASS / 0 WARN / 0 FAIL, contre 4 PASS / 6 WARN avant ce tri.

### Validation par mutation
Trois régressions injectées volontairement, puis annulées : cap `athlete_state` neutralisé → **attrapé** par le simulateur et par les tests unitaires ; classification 0 rep retirée → attrapée par les tests unitaires ; frein Brain retiré → attrapé par le simulateur. Les deux suites sont **complémentaires**, aucune ne couvre tout.

- **Inchangé** : `dev/charge_suggestion_golden_master.js` reste byte-identique, arrondi d'équipement, scaling par profil, Avis IA, fonctions gelées (`CLAUDE.md §2.3`), et tout le comportement des séries réussies.

## V4.5.27 — Un échec total (0 rep) est mémorisé et freine la suggestion
- **Angle mort fermé** : une charge engagée dont aucune répétition ne sortait (`reps = 0`) restait classée `logged`, donc jamais mémorisée par `updateAthleteStateFromResults()` (`if(!hasValidLoad||!reps)return;`). Le moteur reproposait ensuite **la charge exacte qui venait d'échouer**. Mesuré avant correctif : après trois séances propres à 135×8 @RPE 7,5, un 0 rep à 135 lb redonnait 135 lb.
- **La falaise était entre 1 et 0** : dès 1 rep, `major_fail` se déclenchait déjà et ramenait 135 lb à 110 lb. Le « ou proche de zéro » était donc bien traité ; seul le zéro strict était invisible.
- **Classification** : `classifyPerformance()` classe désormais en `major_fail` toute charge engagée à 0 rep, **sans dépendre du RPE saisi**. L'athlète qui repose la barre ne pense pas toujours à noter 10, et un échec ne doit pas dépendre de ça.
- **Plage prise sur les reps prescrites** : `repRange(0)` renvoie `strength` et aurait classé un 8-reps raté dans la mauvaise plage. La plage vient maintenant des reps prescrites, avec repli neutre quand rien n'est connu (mouvement hors programme sans `planned`).
- **Capacité sans Epley** : `epley1RM(load, 0)` vaut 0, donc la recalibration standard aurait écrit une capacité de **0 lb** dans `athlete_state` — c'est précisément ce que la garde d'origine protégeait. La capacité repart de la meilleure charge récente réellement maîtrisée sous la charge échouée (`coachRecentBestControlledLoad()`), avec repli sur `COACH_MOVEMENT_TUNING.failedAttemptMultiplier` (0,80) faute d'historique exploitable. Le seuil vit dans la table de tuning, pas en dur (`docs/STRUCTURE_CONTRACT.md`).
- **L'estimation 1RM n'est jamais écrasée par un zéro** : à défaut d'estimation stockée, elle est reconstruite depuis la dernière performance réelle de la plage.
- **`coachRuleAthleteStateCap()` vérifie enfin la date** : la règle ignorait un cap faible au profit d'une référence contrôlée « plus récente », mais sa condition ne comparait aucune date. Une séance contrôlée **antérieure** à l'échec neutralisait donc le cap, et la charge remontait. La comparaison est faite ; le code correspond maintenant à la raison qu'il affiche.
- **Comportement mesuré après correctif** : 0 rep → 105 lb (« charge cappée jusqu'à confirmation »), 1 rep → 110 lb, 2 reps/8 → 110 lb, 4 reps/8 → 120 lb, 8 reps propres → **135 lb inchangé**. Aucune régression sur le chemin sain.
- **Couverture ajoutée** : `dev/charge_engine_checks.js` scénario 14, 9 assertions, incluant la contre-épreuve qu'une séance contrôlée **postérieure** à l'échec redonne bien la main à la référence réelle. `dev/charge_suggestion_golden_master.js` reste byte-identique — la correction est additive sur le chemin d'échec.
- **Inchangé** : arrondi d'équipement, scaling par profil, Brain, Avis IA, fonctions gelées (`CLAUDE.md §2.3`), et tout le comportement des séries réussies.

## V4.5.26 — Bouton Notes élargi + la note ne suit plus le mouvement d'une séance à l'autre
- **Bouton plus lisible** : le rond `✎` devient une pastille `✎ Notes` avec un compteur dès qu'une note existe. Seule la largeur grandit — la hauteur reste exactement celle du `?` du tuto à chaque palier de densité (24 px, 20 px dans les blocs à 3-4 mouvements), et c'est elle qui fixe la hauteur de la ligne du titre. Aucun champ poids/reps/RPE n'est déplacé.
- **Bug corrigé — la note survivait à l'abandon de séance** : sortir par le ✕ laissait la note en place, et elle revenait au prochain entraînement. `closeGuidedSession()` retire désormais les notes de la séance abandonnée.
- **Bug corrigé — la note suivait le nom du mouvement partout dans le cycle** : la même note réapparaissait sous « Front Squat » quel que soit le jour ou la semaine.
- **Cause racine commune** : `guidedResultCache` n'est indexé que par **nom de mouvement**, sans jour ni semaine, et il survit volontairement tant que la page est ouverte (c'est ce qui permet de fermer puis rouvrir la séance sans perdre ses charges). Une note écrite lundi S1 retombait donc sur la même clé mercredi ou en S2.
- **Fix** : une note appartient à UNE séance — programme + semaine + jour. Le module compare ce contexte à chaque rendu de bouton et retire les notes du contexte précédent ; il tient le registre des seules clés dont il a écrit la note, donc **poids, reps et RPE gardent leur comportement d'origine** et ne sont jamais touchés. Un retrait écrit une chaîne vide, ignorée par `collectSessionResults()` : rien ne part dans la séance sauvegardée.
- **Inchangé** : modale d'ajout et d'effacement (✕ par observation, « Tout effacer » sous confirmation), fermeture complète après « Ajouter », saisie par le micro du clavier iOS sans reconnaissance vocale, texte uniquement sans audio (`CLAUDE.md §2.1`), note en UNE SEULE CHAÎNE écrite par `setGuidedResult(key,'note',…)` sans nouveau chemin de persistance ni changement de schéma, section `NOTES DE SÉANCE` du prompt Avis IA, moteur de charges / `athlete_state` / Brain / fonctions gelées non touchés.

## V4.5.25 — Note par mouvement : petit bouton + modale, avec effacement
- **Mise en page rendue** : le champ de note en clair sous chaque mouvement poussait les cartes et faisait passer les mouvements suivants sous le pli. Il est remplacé par un petit bouton rond `✎` dans la ligne du titre, à côté du `?` du tuto — même gabarit (24 px en séance, 20 px dans les blocs à 3-4 mouvements), donc aucune hauteur ajoutée et aucun champ poids/reps/RPE déplacé. Le bouton se remplit en cyan quand une note existe, sans changer de taille.
- **Tout passe par une modale** : le bouton ouvre le popup plein écran déjà utilisé par le tuto et l'explication de charge (`.tuto-modal`, verrou de scroll `lockBodyScrollForModal`, fermeture au tap sur le fond). Elle porte la liste des observations déjà saisies, un champ court et les actions.
- **La modale se referme complètement après l'ajout** : « Ajouter » enregistre et ferme. Fermer autrement (bouton Fermer ou tap sur le fond) enregistre aussi le brouillon en cours plutôt que de le perdre.
- **Effacement, qui manquait** : un ✕ par observation pour en retirer une seule, et « Tout effacer » (avec confirmation) pour vider la note du mouvement. Un effacement écrit une chaîne vide, que `collectSessionResults()` ignore — la note disparaît donc aussi de la séance sauvegardée, y compris après être sorti puis revenu dans la séance guidée (le `guidedResultCache` survit à la sortie, comme les poids/reps/RPE ; ce qui manquait n'était pas la purge mais le moyen d'effacer).
- **Reconnaissance vocale retirée** : plus de bouton « Dicter », plus de sonde de démarrage, plus aucune API `SpeechRecognition` / `webkitSpeechRecognition` dans le code. Le chemin retenu est le micro du clavier iOS : le champ prend le focus à l'ouverture de la modale, ce qui suffit — aucune permission n'est demandée par l'app.
- **Inchangé depuis V4.5.24** : texte uniquement (aucun audio enregistré ni stocké, aucun `MediaRecorder` — `CLAUDE.md §2.1`) ; note en UNE SEULE CHAÎNE, observations successives concaténées avec ` · ` ; écriture par `setGuidedResult(key,'note',…)` puis `guidedResultCache` → `collectSessionResults()` → `state.history`, sans nouveau chemin de persistance ni changement de schéma ; section `NOTES DE SÉANCE` du prompt Avis IA (`RacineAIExport.sessionNotesFor()`, lecture directe de `state.history`) ; moteur de charges, `athlete_state`, Brain et fonctions gelées non touchés.

## V4.5.24 — Note dictée par mouvement dans la séance guidée
- **Besoin** : pendant la séance, une observation qui ne rentre pas dans un chiffre — « la 3e série était plus difficile que la 4e », « appui gauche instable ». Le RPE unique par mouvement ne peut pas porter cette information.
- **Bouton `🎙 Note` sous chaque mouvement de la séance guidée** (pas à l'écran Résultats). Il ouvre un champ court ; le récapitulatif des notes reste visible même panneau fermé, avec un compteur sur le bouton. Visible pour tous les profils, clients compris.
- **Texte uniquement** : aucun audio enregistré ni stocké, aucun `MediaRecorder`, aucune permission micro demandée par l'app. Le stockage local est la seule source de vérité et n'a aucune copie serveur (`CLAUDE.md §2.1`) : des blobs audio satureraient le quota au détriment de l'historique.
- **Chemin fiable = micro du clavier iOS**. Ce n'est pas une API web mais une fonction du clavier : il suffit qu'un `<textarea>` prenne le focus, ce que fait l'ouverture du panneau (focus synchrone dans le geste utilisateur). `font-size: 16px` sur le champ, sinon iOS zoome tout seul à la mise au point.
- **Reconnaissance vocale jamais présumée fonctionnelle** : `webkitSpeechRecognition` est connue pour être présente mais inerte en PWA standalone iOS — l'objet existe, la détection de fonctionnalité réussit, et rien ne se produit. Un bouton basé sur `if (window.webkitSpeechRecognition)` ferait donc semblant de marcher. Le bouton `Dicter` exige un évènement de démarrage réel (`onstart` / `onaudiostart` / `onspeechstart`) sous 1,6 s ; sinon il disparaît définitivement pour la session (`body.gvn-reco-dead`), le champ prend le focus et l'athlète lit « Reconnaissance vocale inactive ici. Micro du clavier seulement. ».
- **Dictées successives cumulatives** : après la 3e série puis après la 5e, les notes s'ajoutent à la suite avec le séparateur ` · ` au lieu de se remplacer. La note reste **UNE SEULE CHAÎNE** — pas un tableau : c'est le format que `renderHistory()` et l'export attendent déjà. Bornes de sécurité quota : 240 caractères par saisie, 1200 par mouvement.
- **Aucun nouveau chemin de persistance, aucun changement de schéma** : l'écriture passe par `setGuidedResult(key,'note',…)` avec la clé déjà calculée pour les champs poids/reps/RPE. Le reste existait (`guidedResultCache` → `collectSessionResults()` → `state.history`), et `renderHistory()` affichait déjà `r.note` sous le mouvement — rien à ajouter côté historique.
- **Rien n'est perdu** : le brouillon est enregistré au bouton `Ajouter`, à la perte de focus (« Bloc suivant → » détruit le `<textarea>`), à la fermeture du panneau et à la fin d'une dictée. L'enregistrement est idempotent, donc aucun doublon quand deux de ces évènements s'enchaînent.
- **Avis IA enrichi** : `RacineAIExport.sessionNotesFor(label)` balaie `state.history` à l'envers et retourne au plus 6 notes du mouvement (les plus récentes d'abord), appariées via `canonicalMovementLabel`. Nouvelle section `NOTES DE SÉANCE` dans `buildMovementPrompt()`, après `HISTORIQUE CIBLÉ`, omise si le mouvement n'a aucune note ; le prompt précise que la transcription est automatique et non relue et que l'intention prime sur la formulation.
- **Moteur de charges intact** : ni `athlete_state` ni `scripts/charge/` ne reçoivent un champ de plus. Faire remonter la note par le moteur ajouterait un champ au domaine prioritaire pour un besoin purement consultatif (`CLAUDE.md §3.2`) ; Avis IA lit donc `state.history` directement.
- **Nouveau module** : `scripts/session/voice_note.js` (`window.CoachVoiceNote`) — lecture/écriture, concaténation, sonde de reconnaissance, rendu du bouton et du panneau, écoute déléguée au `document` (la séance guidée se re-rend souvent : des écouteurs posés sur les boutons seraient perdus à chaque rendu). `scripts/session/view.js` ne porte qu'un point d'accroche défensif dans `renderGuidedResultPanel()` : si le module manque, la saisie chiffrée reste parfaitement intacte.
- **Inchangé** : moteur de charges, Brain, fonctions gelées (`CLAUDE.md §2.3`), écran Résultats, cartes WOD, design system (palette et polices existantes uniquement).

## V4.5.23 — Ajouter un mouvement fait hors programme
- **Besoin** : un mouvement fait aujourd'hui mais absent du programme n'avait nulle part où atterrir — soit il était oublié, soit noté à côté, et dans les deux cas le moteur de charges et l'historique ne le voyaient jamais.
- **Bouton `+ Ajouter un mouvement`** en fin de liste de l'écran Résultats. Il ouvre un sélecteur plein écran avec champ de recherche intégré ; sélection multiple dans une même ouverture, réouverture autant de fois que voulu. L'écran ne se ferme que par Confirmer ou ✕ (aucune fermeture au tap sur le fond, pour ne pas perdre une sélection en cours).
- **Même carte que les mouvements programmés** : contrôles − / valeur / + pour poids, reps et RPE, même arrondi d'équipement (`data/equipment.js`), même suggestion de charge. Un ✕ sur la carte la retire avant sauvegarde. Le rendu de carte est désormais partagé (`appendSessionEntryCard()`), pas dupliqué.
- **Catalogue fermé** : les noms viennent uniquement de `RacineMovementSwaps.movementCatalog(profileId)` — mouvements du programme actif d'abord, puis la bibliothèque. Aucune saisie libre : le moteur ne reconnaît un mouvement que par son nom exact.
- **Clé de résultat = nom exact du catalogue**, comme les blocs `exercises` de `collectSessionExercises()`. Le journal brut garde donc la variante réellement choisie (« Cable Lateral Raise » reste écrit tel quel) et c'est le moteur qui la classe en aval sous sa capacité (`Lateral Raise`). `updateAthleteStateFromResults()`, `movementRefs` et `CoachBrainMemory` se nourrissent de ces séries par le chemin normal, sans une ligne de code supplémentaire.
- **Anti-collision** : un mouvement déjà présent dans la séance du jour apparaît grisé et non sélectionnable — sa clé de résultat écraserait la saisie programmée. La comparaison passe par le libellé du moteur, donc deux noms différents qui retombent sur la même capacité collisionnent aussi ; la ligne nomme alors le mouvement qui occupe la place (« déjà : Barbell Hip Thrust » plutôt qu'un grisé sans explication).
- **Pas de cible, contexte neutre** : ces séries n'étaient pas prévues, donc `enrichSessionResults()` ne leur attache aucun `planned` (la mesure prévu-vs-réalisé et le vecteur `CoachML` ne sont pas pollués) et aucune intention limitante (`technique`/`light`/`progression`/`wod`/`recovery`) n'est transmise : elles comptent comme de la capacité réelle. Marqueur `extra:"1"` dans les résultats pour que l'historique sache que c'était hors programme.
- **Durée de vie** : la liste vit le temps de l'écran Résultats. Rien n'est persisté hors `state.history` ; elle est vidée au retour WOD et après sauvegarde, en purgeant aussi `guidedResultCache` (sinon `collectSessionResults()`, qui donne la priorité maximale à ce cache, ressusciterait une série retirée).
- **Nouveau module** : `scripts/session/extra_movements.js` (`window.CoachExtraMovements`) — toute la logique y vit ; `scripts/session/results.js` et `scripts/session/save.js` ne portent que des points d'accroche défensifs.
- **Inchangé** : moteur de charges, Brain, Avis IA, cartes WOD et fonctions gelées (`CLAUDE.md §2.3`).

## V4.5.22 — completedDays ne mélange plus les programmes
- **Bug corrigé** : après un changement de programme, des carreaux de jour apparaissaient déjà verts (« complété ») alors qu'aucune séance n'avait été faite dans le nouveau cycle — l'app réutilisait par erreur des séances loggées sous un ancien programme à la même semaine.
- **Cause racine** : `buildWeekTrackingForWeek()` reconstruit `state.completedDays` depuis deux sources — `state.weekTransitions` (filtrée par programme, correcte) et `state.history` (filtrée seulement par numéro de semaine, sans vérifier le programme). N'importe quelle séance d'un ancien cycle à la semaine 1, par exemple, ressortait donc comme « complétée » dès la première navigation de semaine (bouton, onglet ou swipe) sur le nouveau cycle.
- **Fix** : la boucle sur `state.history` filtre désormais aussi par `cycle`, symétrique à la boucle `weekTransitions`. Chaque séance de l'historique porte déjà ce champ (`scripts/session/save.js`) — aucun changement de schéma.
- **Garde-fou** : `dev/regression_checks.js` porte une nouvelle assertion qui aurait détecté ce trou, pour éviter une régression future sur ces fonctions gelées (`CLAUDE.md §2.3`).
- **Inchangé** : `state.history`/`weekTransitions` restent le journal d'audit durable, jamais vidés au changement de programme ; moteur de charges et Brain non touchés.

## V4.5.21 — Refactor structurel du pipeline de suggestion de charges
- **Aucun changement de comportement** : `guardedSuggestedLoadDecision()` (`scripts/charge/suggestion.js`) produit une sortie strictement identique avant/après, prouvé par un golden master de caractérisation (`dev/charge_suggestion_golden_master.js`, 15 scénarios) qui doit rester byte-identique à chaque évolution future de ce pipeline.
- **Pipeline de règles nommées** : la fonction monolithique est découpée en douze règles (`coachRuleContextLimited`, `coachRuleReferenceDeTravail`, `coachRuleLiftFromControlledHistory`, `coachRuleReferenceReelleValidee`, `coachRuleHistorySignalAdjustment`, `coachRuleLastSetGuards`, `coachRuleRecentHardBrake`, `coachRuleFloorValidation`, `coachRuleAthleteStateCap`, `coachRuleDeloadCap`, `coachRuleRoundingAndMovementCap`, `coachRuleContextLimitedRounding`), appelées dans le même ordre exact que l'ancien code.
- **Table de tuning centralisée** : les seuils et regex de noms de mouvement (isolation, technique, mouvement principal, saut max, deload, seuils de remontée d'historique, charges de départ par défaut) sortent de `suggestion.js`/`historique.js` vers `scripts/charge/movement_tuning.js` (`window.COACH_MOVEMENT_TUNING`).
- **Garde-fou durable** : `dev/movement_tuning_boundary_checks.js` bloque désormais toute nouvelle regex de mouvement écrite en dur hors de cette table (voir `docs/STRUCTURE_CONTRACT.md` — Domaine charge — Règle de tuning par mouvement).
- **Inchangé** : toute suggestion de charge produite pour l'athlète, l'Avis IA, le Brain.

## V4.5.20 — Scroll des popups (!) et (?) : plus de défilement du fond
- **Bug corrigé** : dans les popups `(!)` (explication de charge) et `(?)` (tuto mouvement), le scroll partait parfois vers la page derrière au lieu du contenu du popup — surtout quand le contenu tenait dans l’écran ou quand on touchait le fond sombre du bottom-sheet (« scroll chaining »).
- **Verrou de scroll du corps** : `lockBodyScrollForModal` / `unlockBodyScrollForModal` figent la page (`position:fixed` + restauration de la position) tant qu’un popup est ouvert. Fiable sur tout iOS, y compris les Safari anciens où `overscroll-behavior` n’existe pas. Idempotent et compté correctement quand un popup en remplace un autre.
- **Renfort navigateurs récents** : `.tuto-modal-inner` reçoit `overscroll-behavior: contain` et `-webkit-overflow-scrolling: touch`.
- **Inchangé** : contenu des popups, boutons, Avis IA, logique métier.

## V4.5.19 — Retirer un cycle de la Saison
- **Bouton ✕ sur la frise Saison** (onglet Cycle) : chaque cycle terminé du journal peut désormais être retiré d'un tap, avec confirmation. Utile pour effacer un cycle démarré par accident ou un doublon qui polluait le parcours.
- **Portée limitée à la fiche** : le retrait n'affecte que l'entrée du journal de saison (`state.season.cycles`). Les séances de l'historique (`state.history`), les charges et le Brain ne sont **jamais** touchés.
- **Action manuelle uniquement** : nouvelle porte `CoachSeason.removeCycle(state, index)` déclenchée par l'athlète — le journal continue de ne jamais s'écraser tout seul. La suppression est persistante (aucune reconstruction depuis `weekTransitions` une fois le journal matérialisé).
- **Inchangé** : reconstruction best-effort, enregistrement de fin de cycle, propositions, rétention long terme.

## Non publié — Export JSON fiable sur Safari iOS ancien
- **Vrai fichier `.json`** : l'export du profil et de l'historique génère désormais un fichier `application/json` encodé UTF-8, avec un nom clair et unique (horodaté). L'export d'historique n'est plus un `.txt` avec en-tête texte.
- **Cause corrigée** : sur les anciens Safari iOS (iPhone SE 2019-2020, iOS 13-14) l'attribut `download` d'une ancre n'est pas honoré — le clic naviguait vers l'URL `blob:` et Safari affichait le JSON en texte brut dans une nouvelle page, sans option « Enregistrer dans Fichiers ».
- **Partage natif prioritaire** : nouveau module `scripts/export_file.js` (`window.RacineExport.saveJson`) qui utilise `navigator.share({files:[File]})` — vérifié via `navigator.canShare({files})` — pour exposer « Enregistrer dans Fichiers ».
- **Repli compatible** : sinon `Blob` + `URL.createObjectURL()` + `<a download>` + `URL.revokeObjectURL()` (desktop/Android). En dernier recours sur iOS ancien sans partage de fichiers : message clair invitant à utiliser la feuille de partage ou à mettre Safari à jour. Le JSON n'est **jamais** ouvert dans un nouvel onglet.
- **Inchangé** : structure des données JSON, import, logique métier et calculs d'entraînement.
- Tests : nouveau `dev/json_export_ios_checks.js` (fichier, nom, MIME, partage natif, repli, message, absence d'ouverture de page).

### Ménage export/import de profil — 2 boutons
- **5 boutons → 2** : l'export/import de profil se résume à « Exporter mon profil (JSON) » + « Importer un profil » dans **Réglages → Profil**. Suppression du panneau « Sauvegarde locale » (« Sauvegarder / Restaurer mes données », doublon de l'export d'état brut) et de la vue « Backup » dédiée (orpheline, sans entrée de navigation).
- **Plus de gestion de profil par l'admin** : suppression du bouton « Exporter tous les profils (JSON) » (multi-profils) dans les Réglages **et** dans le sélecteur de profil, ainsi que du code mort associé.
- **Aucune perte de restauration** : l'unique « Importer un profil » lit le format profil et retombe automatiquement sur l'ancien format de sauvegarde « état brut » (`restoreLegacyStateBackup`) — les anciens fichiers restent restaurables.
- **Inchangé** : l'export/import d'un profil (format, données), le sélecteur de profil (import toujours dispo pour restaurer sur appareil vierge), le bouton « ↓ Sauvegarder profil » du résumé de séance, les programmes clients et le PIN admin.
- Tests : nouveau `dev/profile_backup_ui_checks.js`.

### Progression pour tous — déménagée dans l'Historique
- **La Progression riche est désormais dans l'onglet Historique**, visible par tous les profils (clients inclus) : graphiques SVG par mouvement, filtres de période (4 sem. / 8 sem. / Tout), comparaison de deux mouvements, points cliquables. Elle remplace les mini-barres rudimentaires de `#progressCharts` (conservées en repli si `view_pc.js` n'est pas chargé).
- **L'onglet « Progression » disparaît de la vue PC** (admin inclus) : même moteur (`pcRenderProgressTab`), un seul point de montage (`pcRenderProgressInto`, `scripts/view_pc.js`). Les interactions ne re-rendent que le conteneur progression, pas la liste des séances.
- **Aucune nouvelle vue ni nouvel onglet** ; lecture seule (`state.athleteState` + `state.history` du profil actif), aucune modification de la logique métier ni des calculs.
- Tests : nouveau `dev/history_progress_checks.js`.

### Correctif : crash « Sauvegarder la séance » sur programme sans périodisation
- **Cause** : `checkDeloadAlert()` (appelé à chaque sauvegarde de séance) lisait `focus().targetReps[weekIdx()]` sans garde. Quand le programme actif n'a pas de tableau `targetReps` (programmes à exercices structurés) ou que le cycle actif est indisponible (`focus()` retombe sur `{}`), l'app plantait avec « undefined is not an object (evaluating 'focus().targetReps[weekIdx()]') » — visible sur iPhone SE.
- **Fix** : accès défensifs à `focus().targetReps`, `focus().sets` et `focus().mult` (dans `checkDeloadAlert`, `targetReps()`, `setScheme()`, `profileMultiplier()`), avec repli neutre. Aucune perte de comportement pour les programmes périodisés.
- Tests : nouveau `dev/deload_guard_checks.js` (reproduit le crash puis vérifie qu'il ne se produit plus).

### Progression : comparaison multi-mouvements (boutons toggle)
- La comparaison de l'onglet Progression n'est plus limitée à deux menus déroulants (Mouvement A / B). **Chaque mouvement disponible devient un bouton toggle** : on en active autant qu'on veut et toutes les courbes se superposent.
- **Une couleur par mouvement**, reprise dans la légende avec le delta ; compteur « N / total actifs ». Graphique toujours normalisé en % depuis le premier point pour comparer charges et reps sur la même échelle.
- Tests : nouveau `dev/pc_progress_compare_checks.js` (statique + smoke runtime).

### Vue PC : nouvel onglet « Cycle complet » + toolbar allégée
- **Nouvel onglet « Cycle » (par défaut)** : grille de tout le cycle, semaines en lignes × jours en colonnes, ne montrant **que le nom du mouvement et les séries×reps** (aucune charge, aucune alerte). Pensée pour évaluer et construire des programmes logiques sur écran large (paysage 1080p+). Les blocs WOD/texte libre apparaissent en ligne courte « WOD : … ».
- **Clic sur une journée** → ouvre l'inspection Séance détaillée de cette journée précise, avec un bouton **« ← Retour au cycle »**.
- **Toolbar PC allégée** : suppression de « ▶ Séance » et « TMS » en haut de la vue. « Démarrer séance » reste dans l'inspection d'une journée ; TMS reste dans la barre de navigation principale.
- Lecture seule, aucune écriture ni changement de logique métier.
- Tests : nouveau `dev/pc_cycle_view_checks.js` (statique + smoke runtime de la grille).

### Historique : sous-onglets Séances / Progression + invitation paysage
- **Les séances redeviennent prioritaires** : l'onglet Historique s'ouvre sur la liste des séances ; les graphiques de progression passent dans un **sous-onglet « Progression »** affiché sur demande explicite (plus d'empilement au-dessus de la liste).
- **Invitation au mode paysage** : dans le sous-onglet Progression, un bandeau (CSS pur, `@media (orientation: portrait)`) invite à tourner l'iPhone en paysage pour mieux lire les graphiques — il disparaît automatiquement en paysage ou sur grand écran.
- Bonus perf : la Progression n'est rendue que quand son sous-onglet est ouvert.
- Tests : `dev/history_progress_checks.js` étendu (sous-onglets, défaut « Séances », bandeau portrait).

### Gestion des programmes : un seul endroit (Gear), fin de l'onglet Admin de la vue PC
- **La grille d'accès aux programmes privés** (profils en lignes × programmes spécialisés en colonnes, bascule ✓/· à effet immédiat) **déménage de l'onglet Admin de la vue PC vers Gear** (Réglages → « Programmes spécialisés »). Tous les profils étant locaux (sur l'appareil), aucun sélecteur de profil n'est nécessaire pour donner ou retirer un programme : tout le monde est visible d'un coup.
- **L'onglet « Admin » disparaît de la vue PC**, qui redevient purement de l'inspection en lecture seule (Séance, Semaine, Route, Analyse, Export). L'accès à la vue reste gardé admin par la navigation.
- **Gear simplifié** : suppression du flux « choisir un client → copier le lien du programme » (remplacé par la grille directe) et du filtre de recherche associé. Le sélecteur de profil restant est scopé aux **remplacements de mouvements** (par nature propres à un profil), dont le partage par lien est conservé.
- **Inchangé** : le système de prescription par lien (côté client, « J'ai reçu un lien du coach »), les permissions elles-mêmes (`grant/revokeProgramPermission`), les remplacements de mouvements, le moteur.
- Tests : nouveau `dev/gear_permissions_checks.js` (statique + smoke runtime du rendu de la grille) ; `dev/prescription_checks.js` et `dev/client_view_checks.js` mis à jour vers le nouveau contrat.

## V4.5.18 — Accès programmes hors ligne et Gear simplifié
- **Base préservée** : les 32 programmes actuellement publics restent accessibles à tous. « Hypertrophie Fessier Femme » devient privé.
- **Privé par défaut** : tout programme nouveau ou sans `visibility:"public"` exige désormais une permission explicite.
- **Migration sûre** : un profil dont le cycle actif devient privé reçoit automatiquement la permission correspondante, sans modification de sa semaine, son historique, ses résultats ou ses charges.
- **Gear fidèle au hors-ligne** : suppression des faux états « Actif », « Accordé », « Retirer » et de l’activation distante. L’admin sélectionne un client, recherche un programme spécialisé et copie son lien de prescription.
- **Compatibilité** : les permissions existantes sont conservées; une prescription acceptée reste accessible sur l’appareil.
- Tests : catalogue, migration multi-profils, prescription, vue client, saison, structure et régression; contrôle mobile 393 px et 375 px.

## V4.5.17 — Moteur de charge : PR découplé, seed via référence de travail, onglet « Charge » unifié
- **Découplage du PR** : un record 1RM (`manual_pr`) n'influence plus jamais la charge de travail proposée. Il reste un trophée daté. Corrige la sur-évaluation des mouvements sans historique (un vieux 1RM était projeté via Epley → ~8RM maximal proposé pour du 8-12 reps, impossible au jour 1).
- **Seed via référence de travail (priorité 2)** : pour un mouvement sans séance réelle loggée, le moteur part d'une référence de travail déclarée pour la plage cible, périodisée **sous** le RM (rampe planifiée sur le cycle : ~93 % en S1 → ~105 % en dernière semaine de charge), au lieu du défaut programme × ratio. Priorité : 1) séances réelles, 2) références déclarées, 3) défaut programme. Réglable via `COACH_REF_RAMP` (scripts/charge/suggestion.js). Le moteur lit `athleteState` puis `movementRefs` (références d'onboarding incluses).
- **Saisie trophée vs référence** : `savePrProfile`/PR auto distinguent désormais `reps===1` (trophée `manual_pr`, ignoré du moteur) de `reps>1` (référence de travail `manual_recalibration`, lue et périodisée).
- **Onglet « Charge » unifié** : fusion des onglets « PR » et « Réfs » et de la section « Charges ajustables » des réglages. Contient : références de travail éditables par mouvement et par plage (Force 5 / Hypertro 8-12 / Endurance 15+), trophées 1RM, références vivantes (reflet des séances), ajustements ponctuels. La grille éditable alimente directement le moteur.
- **Migration V4.5.17** : re-tague au boot les références de plage (reps>1) stockées par erreur comme trophée 1RM par l'ancien formulaire, pour qu'elles redeviennent visibles du moteur (idempotent, `coachMigratePrTrophyReferences`).
- Tests : nouveau `dev/reference_seed_checks.js` (PR ignoré, seed sous le RM, rampe croissante, cas onboarding) + `dev/reference_seed_stress.js` (270 combinaisons client × mouvement sur le vrai moteur). 17 suites vertes.
- **Tableau de trophées** : la section « Records personnels » de l'onglet Charge devient un vrai tableau daté, découplé du moteur (`state.profile.records`, aucune écriture dans `athleteState`/`movementRefs`). Records existants conservés (Bench, Front Squat, Strict Press, Power Clean 1RM) + ajout de **Back Squat 1RM**, **Deadlift 1RM** et **Max tractions (reps)**, chacun avec sa **date éditable**.
- **Typographie de la vue Charge** uniformisée et agrandie : une seule police (`--font-main`) et une échelle de tailles cohérente sur tout l'onglet (texte, libellés, champs), scopée à `#profileView`.

## V4.5.16 — Hypertrophie Fessier Femme : reconstruction sur le patron Arnold + correctifs
- Reconstruction complète de `programs/hypertrophie_fesse_stephanie.js` sur le patron `arnold_split_strict.js` : séquence fixe en cycle de 2 semaines (`weekLabels`, `durationWeeks: 2`), 5 jours réels (lundi→vendredi), un seul objet `window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse_stephanie` auto-suffisant. Suppression de l'ancienne bibliothèque de cartes (`COACH_STEPHANIE_PROGRAMS`, rotation calculée, `sessionDetails` greffé après coup).
- Renommé « Hypertrophie Fessier Femme » et rendu public (`visibility: "public"` dans `programs/index.js`, métadonnées `objective`/`frequency`/`suggestedNext` ajoutées).
- Correctif charges : le champ `load` contenait des chaînes « RPE N », or le moteur (`parseLoad`) lit le premier nombre d'une charge — « RPE 7 » était lu comme 7 lb puis arrondi au minimum équipement (~5 lb) sur presque tous les mouvements. Remplacé par des qualificatifs sans chiffre (« modéré », « léger », « poids du corps ») ; le moteur applique alors le repère numérique réel du mouvement (Hip Thrust 225 lb, Goblet Squat 45 lb, DB RDL 60 lb, etc.), mis à l'échelle du profil.
- Correctif WOD jour 1 : le finisher lundi/S1 nommait le mouvement avant le « : », que `parseWodStructure` (app.js) supprime — le WOD s'affichait sans exercice reconnu. Reformaté en « reps + mouvement » (format parseable), même correctif appliqué aux autres textes WOD du programme.
- Fiches techniques ajoutées dans `programs/tutorials.js` pour les mouvements sans tuto/vidéo : Cable Kickback, Reverse Lunge (couvre aussi DB/bodyweight reverse lunge), Slider Curl, Hip Abduction (couvre side-lying/banded/seated), Hip CARs, Frog Pump, Clamshell, Bird Dog, Band Pull-Apart, Wall Sit, Couch Stretch, Figure-4 Stretch, Supine Hamstring Stretch, Box Breathing — avec IDs vidéo correspondants dans `data/movements_media.js`.
- Nouveau point d'extension opt-in `getDayLabel(day, week)` sur un programme : honoré par `currentDayMeta`/`previewDayLabel` (app.js) et `buildWorkout` (programs/workouts.js). Permet à un même jour de porter un nom différent selon la semaine ; les programmes qui ne le définissent pas ne changent pas de comportement. Utilisé par Hypertrophie Fessier Femme pour distinguer les libellés S1/S2.
- Aucune donnée durable modifiée, moteur de charges/Brain non touché en profondeur (seul le point d'extension `getDayLabel` est ajouté à app.js/workouts.js).

## V4.5.15 — Programme Stéphanie : enregistrement runtime (il tourne dans le WOD)
- Cause réelle du « programme absent » qui persistait : `programs/hypertrophie_fesse_stephanie.js` créait seulement une bibliothèque de séances (`COACH_STEPHANIE_PROGRAMS`, mode `simple_sessions`) sans jamais s'enregistrer dans `COACH_BERTIN_PROGRAMS` ni fournir `getBlocks()` — déclaré au catalogue mais invisible du moteur de séances, donc l'activer ne changeait rien dans la vue WOD.
- Enregistrement runtime standard ajouté : plan 4 jours/semaine (lundi, mardi, jeudi, vendredi), les 10 séances tournent de semaine en semaine dans l'ordre du tableau. Chaque jour ouvre sur un bloc « Séance : … » (objectif + prudence) et les finishers AMRAP/EMOM reçoivent `kind:"wod"` — le timer guidé (et ses bips) les reconnaît. Contenu des séances intouché.
- Garde-fou dans `dev/program_catalog_checks.js` : le programme déclaré doit être enregistré, fournir `getBlocks()` et retourner une séance complète pour chaque jour de chaque semaine.
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.14 — Correctif : faux « programme absent » sur les programmes privés
- Le catalogue de programmes filtré par permissions (`focusConfigs`) n'était construit qu'une fois, au chargement de la page : un programme privé accordé ensuite (prescription acceptée, activation via le panneau admin, bascule de profil sans rechargement) restait invisible et le boot affichait à tort « ⚠️ Programme absent détecté » en forçant le retour au premier programme disponible.
- `coachFullBoot()` reconstruit maintenant le catalogue avec les permissions du profil réellement actif avant de vérifier le cycle.
- Auto-guérison : la trace laissée par un ancien fallback (`state.missingCycle`, jamais nettoyée jusqu'ici) restaure le cycle dès que son programme redevient disponible — sauf si un autre programme a été activé entre-temps — puis s'efface.
- Garde-fous statiques ajoutés à `dev/prescription_checks.js`.
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.13 — Remplacements : sélection des mouvements par liste avec recherche
- Les champs « Mouvement d'origine » et « Remplaçant » du panneau admin deviennent des sélecteurs avec recherche : taper filtre la liste, taper une option la choisit. Le nom exact du catalogue est exigé (le moteur de charges reconnaît un mouvement par sa syntaxe) — un texte libre est refusé avec message.
- La liste montre d'abord « Programme actuel de <client> » (mouvements réellement présents dans son cycle, toutes les semaines balayées — la rotation hebdo est couverte), puis « Tous les mouvements » (fiches vidéo, fiches tuto, mouvements de config), dédupliqué et trié.
- `dev/movement_swaps_checks.js` étendu (catalogue, rotation hebdo, nom exact exigé côté UI).
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.12 — Prescription coach → client par lien (sans serveur)
- **Fini le geste « prendre le cell du client + PIN admin »** : dans Réglages → Programmes clients, chaque programme a un bouton « Partager le lien » (et « Partager les remplacements (lien) » sous la section remplacements). Le lien copié s'envoie par texto/WhatsApp.
- Le client tape sur le lien : son app affiche « Ton coach te propose : … » avec **Accepter / Refuser**. Rien ne s'applique sans son accord ; son historique et ses résultats sont toujours conservés. Avertissement si la prescription vise un autre prénom que le profil actif.
- La prescription (programme + remplacements de mouvements) voyage dans le fragment `#rx=` de l'URL, encodée en base64url — aucun serveur, aucune donnée envoyée. Expiration 30 jours, format versionné (v1) avec refus clair des versions futures et des programmes inconnus (app pas à jour).
- Secours iPhone : si le lien s'ouvre dans Safari alors que l'app installée a son propre stockage, bouton « J'ai reçu un lien du coach » dans Réglages → Profil pour coller le lien ou le code.
- Indépendant d'Avis IA : rien à réactiver côté client. Nouveau module `scripts/profiles/prescription.js`, garde-fou `dev/prescription_checks.js` ajouté à la checklist.
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.11 — Remplacements de mouvements par client + restauration facilitée
- **Remplacements de mouvements par client** (idée 1 de `docs/IDEES_FUTURES.md`) : le coach pose « Bench Press → DB Bench Press » (+ note optionnelle) sur UN profil, sans toucher le programme template ni les autres clients. Partout où la séance affiche le mouvement d'origine, l'app montre le remplaçant, et le moteur de charges suit le nouveau nom. Retirer la ligne = retour au programme original.
  - Nouveau module `scripts/profiles/swaps.js` (`window.RacineMovementSwaps`), stockage dans le state du profil (isolation par construction), application par un hook unique dans `buildWorkout()` — les templates ne sont jamais mutés.
  - Écran admin : section « Remplacements de mouvements » dans Réglages → Programmes clients (choisir le client, voir les remplacements actifs, Retirer, + Ajouter).
  - Garde-fou `dev/movement_swaps_checks.js` ajouté à la checklist de release.
- Import JSON depuis l'écran d'accueil des profils : restaurer un export sur un appareil vierge (après purge Safari) sans créer de profil temporaire.
- Le bouton Sauvegarde de la vue Résultats horodate maintenant `lastExportAt` (rappel d'export cohérent).
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.10 — Vue séance : toggle mute des signaux sonores du timer
- Bouton 🔊/🔇 dans la carte timer de la vue séance (coin gauche, en absolu — le badge EMOM garde le coin droit ; aucun contrôle existant déplacé ni rétréci). État persisté dans le state du profil actif (`state.guidedSoundMuted`) : il survit au rechargement et reste isolé par profil.
- Muet = aucun nœud Web Audio créé (les helpers audio ne sont pas appelés), et aucun AudioContext créé ni repris. L'AudioContext n'est créé/repris que sur geste utilisateur (tap ▶ du timer, ouverture de séance ou réactivation du son) — contrainte Safari iOS.
- Constat d'audit : le Screen Wake Lock de la vue séance (acquisition à l'entrée, libération à la sortie, ré-acquisition sur visibilitychange, détection `'wakeLock' in navigator`) et les signaux sonores du timer (décompte 3-2-1 + bip de départ, bip EMOM chaque minute, bip de fin AMRAP/For Time, oscillateurs sans fichier audio) existaient déjà — inchangés.
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.9 — Fiabilité des exports (rappel, multi-profils, versionnage)
- Rappel d'export : `lastExportAt` horodaté par profil dans le registre à chaque export réussi ; bannière discrète en haut de l'app (fermable pour la session, jamais bloquante) si le profil actif a de l'historique et n'a pas été exporté depuis plus de 7 jours (ou jamais).
- Export « tous les profils » : un bouton (sélecteur de profils et panneau Profil des réglages) génère un seul fichier JSON contenant tous les profils du registre avec leurs données namespacées ; l'import détecte ce format et propose l'import de chaque profil un par un.
- Versionnage du format d'export : champ `exportVersion` (= 1) dans tout export mono et multi ; un export sans `exportVersion` est traité comme version 0 et migré silencieusement (une fonction de migration par version, enchaînées) ; un fichier d'une version future est refusé.
- Un import n'écrase plus jamais un profil existant sans confirmation explicite : même nom → proposer le remplacement ou l'import en profil séparé ; rechargement de la page si le profil actif est remplacé.
- `docs/ARCHITECTURE.md` : listing complet de `scripts/charge/` (fichiers Brain inclus) et checklist de validation obligatoire alignée sur `dev/` et `RELEASE_CHECKLIST.md`.
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.8 — Fiches tuto : 5e passe (27 mouvements — couverture complète)
- **Fessiers** (`hypertrophie_fesse`, 7) : Frog Bridge, Cable Pull-Through, Cable Hip Abduction, Mini-Band Lateral Walk, Hip Switch (90/90), Front-Foot Elevated Split Squat, Step-Up (couvre aussi Box Step-Up par matching).
- **Famille front rack + divers** (8) : Front Rack Lunge/Hold/Carry, Overhead Hold (fiche sans vidéo — pas de bonne démo barre), Bar-Facing Burpee, Cable Curl, DB Pullover, Cable External Rotation.
- **Drills muscle-up** (cycle strict 10 semaines, 11) : Strict Muscle-Up (couvre les variantes assistées par matching), False Grip Hang / Ring Row / Pull to Sternum, Ring Support Hold, Ring Turnout Support, Arch Hold, Wrist Strength, Transition Drill, Low Ring Transition Pause, Slow Negative Muscle-Up.
- **Push-Up** : fiche créée ; le drill « Push Up » du cycle muscle-up renommé « Push-Up ».
- Vidéos Central Athlete (false grip/muscle-up), Marcus Filly/Functional Bodybuilding, CrossFit officiel, et fallback spécialisés (Bret Contreras/Glute Lab pour les fessiers, Antranik pour le RTO, GMB pour les poignets). Mapping à 123 entrées, IDs vérifiés via oEmbed.
- **Couverture terminée** : tous les mouvements affichés par les 39 programmes ont maintenant une fiche (?), sauf exclusions volontaires (cardio Row/Run/Bike/Single-under, bloc « Transitions », Chest Supported Row).
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.7 — Fiches tuto : 4e passe (16 mouvements — skills gym RX + basiques metcon)
- **Skills gym CrossFit RX** (9) : Bar Muscle-up, Ring Muscle-up, Handstand Push-up, Handstand Walk, Pistol, Toes-to-Bar, Ring Dip, Rope Climb, Double-under.
- **Basiques metcon** (7) : Air Squat, Box Jump, Sit-Up, GHD Sit-Up, Side Plank, Push-Up lesté, Walking Lunge DB.
- Vidéos : CrossFit officiel pour les skills et basiques, Marcus Filly (Ring Muscle-up, Pistol, Toes-to-Bar, Side Plank, Push-Up lesté), Central Athlete (Ring Dip), RP en fallback (Walking Lunge DB). Mapping à 97 entrées, IDs vérifiés via oEmbed.
- Retombées du matching flou assumées : les variantes (Box Jump Over, Burpee Box Jump, Strict Ring Dip, Bar Muscle-up Transition Drill, Strict Ring Muscle-Up…) affichent la fiche générique correspondante.
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.6 — Fiches tuto : 3e passe (13 mouvements prioritaires, avec vidéos)
- 13 nouvelles fiches dans `programs/tutorials.js`, chacune avec sa vidéo (mapping à 81 entrées) :
  - **Fort trafic catalogue client** : Hip Thrust (22 programmes), DB RDL (23), Push Press (20), KB Swing (19), Hanging Knee Raise (8).
  - **Haltéro technique** (catalogue haltéro/CrossFit, priorité sécurité) : Clean and Jerk, Power Snatch, Hang Power Snatch, Snatch Pull, Split Jerk, Push Jerk, Overhead Squat, Thruster.
- Vidéos : Catalyst Athletics (Exercise Library) pour toute l'haltéro, Marcus Filly/Functional Bodybuilding pour le reste, CrossFit officiel pour le Thruster, Renaissance Periodization en fallback (Hanging Knee Raise). IDs vérifiés via oEmbed.
- Effet de bord assumé : « Barbell Hip Thrust » et « Single-Leg Hip Thrust » (hypertrophie_fesse) retombent par matching flou sur la fiche générique « Hip Thrust ».
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.5 — Correctifs fiches tuto : anomalies du matching
- « Row » (le rameur) affichait la fiche « Chest Supported Row » via le matching par sous-chaîne : `findCoachBertinTutorial` exclut maintenant les machines cardio (Row, Run, Bike, Ski Erg, Swim) — plus jamais de bouton (?) sur du cardio.
- Fiche « Chest Supported Row » supprimée à la demande du coach (le mouvement reste dans les programmes, il n'a simplement plus de fiche).
- « Hollow Body Hold » (cycle strict muscle-up) renommé « Hollow Hold » : le drill utilise maintenant la fiche existante et sa vidéo.
- « Close-Grip Bench Press » et « DB Bench Press » retombaient sur la fiche générique « Bench Press » : deux vraies fiches distinctes créées, chacune avec sa vidéo Marcus Filly (mapping passe à 68 entrées).
- Aucune donnée durable modifiée, moteur de charges intouché.

## V4.5.4 — Vidéos tuto : 2e passe (40 mouvements)
- `data/movements_media.js` passe de 26 à 66 entrées : polyarticulaires chargés (presses, tirages, dips, squats goblet), tirages unilatéraux et jambes, épaules ciblées (lateral/rear delt/front raise, face pull), isolation bras/pecs (curls, extensions triceps, flys), échauffement/gainage (Dead Hang, Cat-Cow, Hollow Hold).
- Liste validée par le coach : Bench Press, Chest Supported Row, PVC Pass Through, Band Pull Apart, Wall Ball et Burpees contrôlés volontairement exclus de cette passe.
- Mêmes sources prioritaires que la 1re passe (Central Athlete, Marcus Filly — y compris sa chaîne Functional Bodybuilding) ; fallback génériques de qualité (Renaissance Periodization, OPEX, PureGym, Buff Dudes…) quand aucune ne couvrait le mouvement. Les 40 IDs vérifiés un à un via l'API oEmbed YouTube (titre + chaîne).
- Aucun autre fichier touché : le lien « ▶ Voir la vidéo » apparaît automatiquement dans les fiches concernées.

## V4.5.3 — Lien vidéo YouTube dans les fiches tuto
- Portage depuis Coach-Beurt (PR #17, V51.96) : nouveau fichier `data/movements_media.js` — mapping mouvement → ID YouTube (26 mouvements : technique/olympique, mobilité kyphose, moins communs). Sources prioritaires Central Athlete / Marcus Filly / Le Box La Sarre, fallback Catalyst Athletics ou CrossFit officiel.
- La fiche tuto (`showTutorialModal`) affiche un lien « ▶ Voir la vidéo » quand le mouvement a une vidéo — lien externe `target="_blank"` volontaire, pas d'iframe : le PWA reste offline-first et la fiche ne dépend jamais de la vidéo. Aucun bloc si le mouvement n'est pas mappé.
- Adaptation à la divergence Racine : la clé du lookup est la clé canonique de la fiche (`found.key`) et le mapping utilise `"Romanian Deadlift"` (clé de `tutorials.js` ici, là où Coach-Beurt utilise `"RDL"`). Les 26 entrées du mapping ont toutes une fiche tuto dans ce dépôt.
- Nouvelle classe `.tuto-video-link` dans `styles.css` (accent cyan, gabarit de `.tuto-cue`).
- Aucune donnée durable modifiée, aucun programme touché.

## V4.5.2 — Guide rapide + bannière d'installation iPhone
- Nouveau module `scripts/ui/help_guide.js` : modale « Guide rapide » (installer sur iPhone, séance du jour, noter ses résultats, comprendre les charges proposées, suivre sa progression, données locales). Accessible depuis un panneau dans Réglages.
- Bannière d'installation : sur iOS, quand Racine tourne dans Safari sans être installée sur l'écran d'accueil, une bannière propose les 3 étapes d'installation. Masquable définitivement, jamais affichée en mode installé ni sur desktop.
- Marqueurs de version alignés (le CHANGELOG était en V4.5.1, l'app affichait encore V4.5) ; les checks de version acceptent maintenant un niveau patch (Vx.y.z). Service worker et manifest restent déversionnés, conformément au contrat.
- Aucune donnée durable modifiée, aucun programme touché.

## V4.5.1 — Legacy publics recalibrés à l'échelle Athlète X
- Correctif post-revue coach : les Front Squats d'`hypertrophy_base` avaient reçu le facteur back squat (jusqu'à 98 %1RM pour 5×3 — RPE impossible). Recalés sur le 1RM front 265 à RPE ≤ 8 (S1 205 → S5 235, deload 170). Cas limites `force_performance`/`general_strength_3d` redescendus sous la ligne.
- **Plafond RPE gravé dans le check 4b** : à r reps, aucune charge legacy ne peut dépasser la limite Epley RPE 9,5 (`1RM/(1+(r+0,5)/30)`) hors deload/taper. Le plancher 52 %1RM et ce plafond encadrent désormais chaque prescription.
- Les 7 programmes manuels publics (`hypertrophy_base`, `force_performance`, `competition_peak`, `strength`, `general_strength_3d`, `general_hypertrophy_2d/3d`) passent à l'échelle Athlète X : ~280 conversions de charges (squat ×1,15, bench ×0,82, press ×0,84, clean ×0,91, row ×0,83-1,25, front squat ×1,23, deadlift ×1,10, hip thrust ajusté). Deux passes : facteur de famille, puis correction ciblée des rows/hip thrusts/press encore bas.
- Résultat mesuré : mains barbell à 65-90 %1RM en semaines de travail (avant : 45-70 %). Cleans volontairement à 57-75 % (technique olympique), deloads/tapers sous 66 %.
- Nouveau plancher permanent dans `program_calibration_checks` (section 4b) : aucun main barbell legacy sous 52 %1RM hors deload/taper (2 dernières semaines exemptées).
- Toujours intouchés : programmes privés du coach et `arnold_split_strict`.

## V4.5 — Catalogue recalibré : Athlète X + convention 1RM + rotation hebdomadaire
- **Règle des noms de mouvements appliquée** (contrat `docs/STRUCTURE_CONTRACT.md`) : plus de `/`, « ou », « + » combinant deux mouvements ni de faux qualificatif dans `name`. Séparés en vraies entrées : Wall Ball + Burpee (competition_peak), Run/Row, Pistol/Bar/Ring Muscle-up « Progression » (crossfit), Dead Bug / Hollow Hold et Power Clean « technique » (epaules_3d), complexe False Grip Pull-Up + Transition Drill + Ring Dip (strict muscle-up). Les mentions « Ring Row lourd » des notes deviennent « Ring Row (angle plus difficile) ». Alias moteur marqués TEMPORAIRES (pont historique seulement). Règle gravée dans `program_calibration_checks` (section 5b).
- **Référence V2 « Athlète X »** : le référentiel de calibration devient un athlète versatile aux ratios physiologiques standards (squat 1RM 315, bench = squat/1,3 ≈ 245, press 155, clean 205…). L'ancienne référence portait la dominance haut du corps du coach (bench 300 > squat ~274, l'inverse d'un athlète type) et déformait les dérivations de tous les autres profils.
- Migration automatique au boot (`referenceVersion`) : les `scaleRatios` de chaque profil sont recalculés contre la nouvelle référence à partir de SES valeurs (inchangées). Vérifié : profil fort du haut → bench ratio 1,22 / squat 0,87 — l'asymétrie est enfin dans les ratios, pas dans la référence. Couvre aussi les profils legacy sans ratios.
- Nouvelle convention gravée : les `BASE_LOADS` des catalogues client et CrossFit sont les 1RM estimés de l'athlète de référence (`reference.js`), les multiplicateurs de semaine des %1RM réels. Fini la double réduction qui donnait des poids ridiculement bas (Goblet 18 %, Hip Thrust 46 % du max de référence).
- Rotation hebdomadaire dans le catalogue client : le mouvement PRINCIPAL reste identique tout le cycle (progression visible chaque semaine, « surprise » de fin de cycle), les blocs B/C tournent chaque semaine dans des banques de variantes du même pattern. Ex. : Hypertrophie 4 j passe de 7 mouvements figés à 22 distincts par jour de cycle.
- `hypertrophie_fesse` : les deux mouvements principaux (Hip Thrust, RDL) ont maintenant des charges numériques par semaine (68/71/77/55 %1RM réf.) — le moteur n'est plus aveugle.
- ~25 repères moteur ajoutés (`coachDefaultLoadSeedForMovement`) : hip thrust, DB RDL, goblet, pull-through, KB swing, farmer carry, landmine, mouvements au poids du corps… Plus aucun mouvement du catalogue sans filet.
- Nouveau check permanent `dev/program_calibration_checks.js` (504 assertions) : bases = 1RM référence, intensités des mains dans la fenêtre 42-90 %1RM (deload ≤ 66 %), principal fixe par cycle, accessoires qui tournent, seeds présents.
- Non touchés volontairement : les programmes privés du coach et `arnold_split_strict` (calibrés sur son niveau réel) ; les legacy publics (hypertrophy_base, force_performance, strength, general_*) sont une passe suivante avec revue coach.

## V4.4.1 — Onboarding : tests à 8 répétitions fixes, RPE intégré, bases affichées
- Les 5 tests de calibration se font maintenant à 8 répétitions fixes (plus de fourchette 5-10) : chiffre plus précis, protocole identique pour tous.
- Le RPE ressenti entre enfin dans l'estimation : les répétitions en réserve (10 − RPE, bornées à 4) s'ajoutent avant Epley. RPE non saisi = RPE 8 supposé (la consigne). Avant, le champ RPE était collecté mais ignoré.
- L'écran « Mouvements calculés » affiche la base de chaque valeur (1RM estimé, 5RM, 8RM, lb par main…) — mêmes conventions que les onglets PR/Réfs.
- Garde-fou débutant de multi_profile_checks ajusté à la nouvelle estimation (l'intention est inchangée : proche du test réel, jamais la référence avancée).

## V4.4 — La Saison : fondations (étapes 1-4 du design)
- Catalogue : `objective`, `frequency` et graphe `suggestedNext` obligatoires sur tout programme public (assertions dans `program_catalog_checks`). Matrice de couverture objectif × fréquence : `docs/CATALOGUE_MATRICE.md`, trous documentés et assumés.
- Nouveaux micro-cycles publics `programs/transition_weeks.js` : semaine deload (3 j, ~60 %) et semaine de tests (recalibrage des 5 mouvements de référence à RPE 8).
- Journal de saison `state.season` (`scripts/season/index.js`) : chaque cycle terminé est consigné (programme, dates, semaines, PR) à l'archivage ou au remplacement ; reconstruction best-effort depuis `weekTransitions` pour les profils existants.
- Rétention long terme `state.longTerm` (`scripts/season/retention.js`) : agrégat mensuel par mouvement (bestLoad, bestReps, avgRpe, sessions), plafond 36 mois. Collecte seulement — l'analyse viendra quand les données existeront.
- Objectif d'entraînement : question « Pourquoi t'entraînes-tu ? » à l'onboarding (7 choix, vocabulaire fermé), éditable dans Réglages → Profil.
- Fin de cycle : bandeau persistant dans la vue WOD, écran bilan (semaines, PR) + 2-3 propositions avec raison en une phrase, démarrage un tap. Classement : objectif dominant, graphe ensuite, deload inséré si RPE moyen 14 j ≥ 8,5, diversité en départage. Choix manuel toujours accessible.
- Frise Saison dans l'onglet Cycle : cycles passés, cycle en cours, suggestion suivante.
- Nouveau check `dev/season_checks.js` (journal, rétention, suggestion, objectif, UI) ajouté à la checklist de release.
- Moteur de charges et Brain inchangés (lecture seule).

## V4.3.3 — Durcissement admin + dédoublonnage
- Le PIN admin n'apparaît plus en clair dans le source : vérification par empreinte SHA-256 (`verifyAdminPin` dans `scripts/profiles/ui.js`, commande pour changer le code en commentaire). Limite assumée : côté client, cela décourage la lecture casuelle, pas un utilisateur outillé.
- La porte dérobée « profil nommé Bertin = admin » est fermée dans `isActiveAdmin()` et dans le fallback de `pcIsAdmin()`. Seuls comptent le flag `isAdmin` et le marqueur de migration ; le PIN pose maintenant `isAdmin: true` au passage, ce qui répare aussi les anciens profils Bertin sans flag.
- `escHtml` (vue séance) délègue à l'implémentation canonique `escapeHtml` de `scripts/ui_modals.js`.
- Testé en navigateur : mauvais PIN refusé, bon PIN → profil admin, profil homonyme sans flag → client normal.

## V4.3.2 — Intégrité des données : import, profils, dates
- Import de sauvegarde sécurisé : validation de structure, confirmation affichant profil source/date/version de l'export, remplacement complet au lieu d'une fusion (plus d'état hybride), copie de secours de l'état écrasé (`racineImportRescue::<profil>` via `CoachState.writeImportRescue`), puis redémarrage propre de l'app.
- Changement de profil : rechargement complet de la page quand l'app tournait déjà sur un autre profil. Évite qu'un timer ou une closure d'une séance active écrive les données de l'ancien profil sous les clés du nouveau.
- Date de compétition parsée en heure locale (`parseLocalIsoDate`) : plus de décalage d'un jour possible sur le compte à rebours.
- Onglet Historique paginé : 30 séances affichées, bouton « Voir plus » par tranches de 50. Affichage seulement — aucune donnée supprimée.
- Traces de `migrate_bertin.js` routées vers le journal CoachLog au lieu de la console.
- Aucune modification au moteur de charges.

## V4.3.1 — Hors ligne réel + démarrage plus rapide
- Service worker : cache versionné `racine-v4.3` en mode réseau d'abord. En ligne, chaque fichier est revalidé auprès du serveur (304 si inchangé, plus de re-téléchargement complet de ~1,2 Mo à chaque ouverture). Hors ligne, l'app s'ouvre depuis le cache — utilisable au gym sans réseau.
- Polices Inter et Orbitron auto-hébergées dans `assets/fonts/` (fontes variables, 145 Ko). Plus aucune requête vers Google Fonts ; suppression du double chargement (`@import` CSS + `<link>` HTML).
- Tous les scripts chargés avec `defer` : le rendu HTML n'est plus bloqué par 67 requêtes JS séquentielles. Ordre d'exécution inchangé.
- Détecteur « app.js n'a pas démarré » accroché à l'évènement `load` pour éviter un faux positif sur réseau lent avec `defer`.
- Écriture `localStorage` protégée : quota plein ou stockage bloqué affiche maintenant une alerte et journalise l'erreur au lieu d'échouer en silence.
- `navigator.storage.persist()` demandé au démarrage pour réduire le risque d'éviction des données locales par le navigateur.
- Manifest PWA : `description`, `lang`, icône `maskable` ajoutés.
- Accessibilité : `aria-label` sur les boutons symboles (⚙, ⎘, ⛶, flèches semaine/jour).
- Aucune modification au moteur de charges ni aux données durables.

## V4.3 — Vue client allégée + panneau admin d'activation de programmes
- Vue client (non-admin) : masque les outils coach — onglet PC, bouton TMS global, panneaux Diagnostic charges/app, gestion Avis IA dans le panneau (!), tableau de bord clients. Conserve recalibrage, changer/nouveau profil, export/import JSON, agressivité et « Réactiver écran actif ».
- Helper admin centralisé `CoachProfiles.isActiveAdmin()` ; `pcIsAdmin()` y délègue ; `switchView` protège la vue PC.
- Nouveau panneau admin « Programmes clients » (Réglages) : active un programme public ou privé comme cycle courant de n'importe quel profil sans basculer, via `CoachProfiles.setProfileActiveProgram()`. L'historique du profil est conservé.
- `dev/client_view_checks.js` ajouté.

## V4.2 — Correctif DOM Avis IA dans le panneau (!)
- Après effacement d’un avis mouvement ou cycle dans le panneau (!), le contenu Avis IA est maintenant regénéré au complet.
- Corrige le cas où `querySelector` mettait à jour le mauvais bloc quand avis mouvement + avis cycle étaient empilés.
- Retire un bouton Fermer dupliqué dans la modale d’import Avis IA.
- Aucune modification aux données durables.

## V4.1 — Avis IA gestion et nettoyage
- Ajout de la mention “Avis IA actif” avec date d’import.
- Ajout d’un bouton pour effacer l’avis mouvement actif dans le panneau (!).
- Ajout d’un bouton pour effacer l’avis cycle actif depuis le panneau (!) et la vue PC.
- Ajout d’un bouton “Effacer tous les avis IA” dans la vue PC.
- Les avis restent consultatifs : aucune charge n’est modifiée automatiquement.

## V4.0 — Avis IA cycle visible dans les mouvements
- Les imports `scope: cycle` avec `cycle_findings[]` sont maintenant reliés aux panneaux `(!)` des mouvements.
- `renderAdviceSummaryForMovement()` affiche l’avis mouvement puis l’avis cycle correspondant.
- Ajout du test `dev/ai_cycle_movement_bridge_smoke.js`.
- Aucune charge appliquée automatiquement.


## V3.9 — Import Avis IA cycle en vue PC
- Ajout du bouton Importer réponse Avis IA cycle dans IA / Export.
- Import scope=cycle avec sauvegarde locale.
- Affichage résumé global : verdict, risque, action, confiance et cycle_findings.
- Aucune charge appliquée automatiquement.


## V3.8 — Lisibilité panneau historique de charge
- Police augmentée dans la fenêtre (!) / loadInfoModal.
- Boutons Avis IA et Fermer agrandis.
- Texte, cartes Brain et Avis IA plus lisibles sur iPhone sans débordement.

## V3.7 — Avis IA Import Fallback JSON

- Import Avis IA accepte maintenant un JSON valide collé sans marqueurs `RACINE_AI_RESPONSE_START/END`.
- Les marqueurs restent le format idéal, mais un JSON seul devient un import structuré avec avertissement.
- Support du JSON dans un bloc ```json.
- Ajout du test `dev/ai_import_fallback_smoke.js`.
- Aucune charge appliquée automatiquement; Avis IA reste consultatif.

## V3.6 — Avis IA Cycle Schema

- Export global compact amélioré : alertes regroupées, pas de phrases tronquées.
- Schéma JSON cycle adapté : `priority_movements`, `cycle_findings[]`, `global_risk_level`.
- Retrait de `movement: ""` dans les réponses cycle.
- Import Avis IA accepte et conserve `maintain_but_watch`, `priority_movements` et `cycle_findings`.
- Avis IA reste consultatif : aucune charge n’est modifiée automatiquement.
- Dossier interne ZIP versionné `Racine-multi-V3.6/`.

## V3.5 — Avis IA Influence Tracker

- Ajout `scripts/ai/ai_influence.js`.
- Détection des charges modifiées manuellement après Avis IA importé.
- Annotation des résultats avec `source: user_override` et `influencedBy: ai_advice`.
- Journal local `racine_ai_influence_log_v1`.
- Avis IA demeure consultatif : aucune charge n’est modifiée automatiquement.

## V3.5 — Brain Journal

- Ajout de `scripts/charge/brain_journal.js`.
- Brain Journal résume les apprentissages par mouvement + intention à partir de la mémoire locale.
- Brain Explain peut afficher un court apprentissage récent dans le panneau `(!)`.
- Aucun changement aux règles de charge.
- `app.js` non sali : version seulement.
- Dossier interne ZIP versionné `Racine-multi-V3.5/`.

## V3.5 — Brain Movement Profiles

- Ajout de `scripts/charge/movement_profiles.js` : profils par famille de mouvement.
- Brain Explain utilise maintenant les profils pour adapter la sensibilité, le vocabulaire et la prochaine observation.
- Weighted Pull-up / Dips : sensibilité très élevée, consolidation avant hausse.
- Front Squat / Strict Press : mouvements de force sensibles, validation avant hausse.
- Hip Thrust : sensibilité faible relative, progression normale quand l'historique est stable.
- Accessoires : priorité qualité/répétitions avant charge.
- `app.js` reste propre : version seulement, aucune logique de profil ajoutée.

## V3.5 — Brain Explain Engine

- Ajout de `scripts/charge/brain_explain.js` : module dédié aux explications Brain.
- Aucune nouvelle règle de charge dans `app.js`.
- Les explications du `(!)` utilisent une raison principale, des faits dominants et une prochaine observation spécifique.
- Réduction des textes génériques et des listes trop longues.
- Précision plafonnée selon le nombre de prédictions/séances utiles pour éviter les faux 100 %.

## V3.5 — Brain Explain action hotfix

- Supprime les sorties génériques dans le panneau `(!)` : plus de `Confiance non calculée`, plus de précision vide.
- Ajoute une confiance/précision de secours calculée avec les séances récentes quand la mémoire Brain n'est pas encore complète.
- Rend les explications Brain factuelles : séances analysées, progressions validées, baisse récente, sensibilité, profil RPE.
- Corrige la transmission des champs `brainStats`, `source`, `context` et `ambitiousOption` vers la modale historique.
- Maintient la convention ZIP : dossier interne versionné.

## V3.5 — RPE Profile + Validation Comfort

- Ajoute une interprétation RPE personnalisée : RPE 8 = signal moyen, RPE 9+ = signal fort.
- Ajoute la distinction validation / confort dans Brain Explain.
- Convertit le plancher historique en décision Brain quand il agit comme garde-fou.
- Weighted Pull-up 25 lb @9.5 est maintenant lu comme « validé mais confort faible », donc consolidation avant hausse.
- Met à jour `docs/BRAIN.md` avec le profil RPE et le concept validation/confort.

# V2 — Topnav épurée

## V3.5 — Equipment + Brain Explain polish

- Ajout de `data/equipment.js` comme source unique de vérité pour l’équipement local.
- Correction des haltères : ajout 8 lb, 12.5 lb et 75 lb.
- Correction des bumper plates : 2.5, 5, 10, 25, 45 lb.
- Correction des kettlebells : 4, 8, 10, 12, 16, 18, 24, 28, 32 kg.
- Finition Brain Explain : les phrases techniques Brain V2 sont découpées en confiance, intention, sensibilité, validations et option ambitieuse.
- Le panneau `(!)` n’affiche plus `Confiance —` quand le pourcentage est disponible dans la raison Brain.


## V3.5 — RPE Profile + Brain Explain

- Ajout de `BRAIN.md` : philosophie officielle de Brain pour Racine.
- Refonte du panneau Historique de charge : remplacement du bloc générique `Pourquoi` par `Analyse Brain`.
- Affichage de la confiance, précision, décision, raisons concrètes et prochaine observation lorsque Brain intervient.
- Correction de la détection de source : les décisions Brain ne sont plus étiquetées `Moteur initial`.
- Ajout de styles légers pour le bloc d'analyse Brain.
- Aucun changement aux données durables.


## V2.1 — Brain V2 statistiques locales

- Ajout `scripts/charge/brain_stats.js` : statistiques locales par mouvement + intention (`strength`, `hypertrophy`, `endurance`, `power`, `technique`, etc.).
- Brain calcule maintenant une confiance de prédiction, une ambition, une sensibilité de mouvement et un nombre de validations requises.
- Les mouvements poids de corps / lestés sont traités comme haute sensibilité.
- Le RPE peut être détecté comme peu discriminant; il reste utile mais moins dominant.
- Brain peut freiner une hausse risquée tout en gardant une option ambitieuse dans le diagnostic `(!)`.
- Ajout de tests ciblés dans `dev/charge_engine_checks.js`.


- Topnav réduite aux onglets uniquement : retrait du brand (R + version), retrait du rond de statut profil (syncStatusDot).
- Le rond dupliquait Gear sans valeur ajoutée.
- Titre onglet browser : `Racine` (sans version).
- Footer : `Racine V2 · local`.
- APP_VERSION : `V2`, cache-bust : `?v=2.0`.
- CSS nettoyé : `.topnav-brand`, `.topnav-mark`, `.topnav-v`, `.sync-dot`, `.profile-dot` retirés.
- Docs : 2 rapports d'audit temporaires supprimés (`PHASE_2_EXTRACTION_REPORT.md`, `CHARGE_PROGRESSION_AUDIT.md`).

# V1.16-multi — Moteur Brain : corrections logique de charge

- **Bug corrigé** : le plancher `Math.max(rawLoad, lastLoad)` bloquait les baisses justifiées. Une baisse contrôlée est maintenant autorisée quand `delta < 0` (RPE ≥ 9 × 2 séances, RPE ≥ 9.5, échec), avec plancher sécuritaire à `lastLoad - 2×maxJump`.
- **Couche 2 refaite** : la moyenne mobile ne remplace plus `lastLoad` comme base de calcul. Elle sert uniquement à détecter une progression rapide (moyenne > 10% sous lastLoad) et réduit légèrement le delta dans ce cas. Base = toujours `lastLoad`.
- **Renommage** : "Vélocité de progression" → "Tendance récente de progression" dans le code et les commentaires. Ce n'est pas de la vélocité VBT (vitesse de barre), c'est la pente de charge sur 3 séances.
- Aucun fichier data/ ni programs/ modifié.

# V1.15-multi — TMS session host réel

- Correction TMS: ouverture forcée dans `sessionView`, pas dans la vue PC.
- Cause: depuis l’extraction du mode Séance, `guidedSession` est déplacé dans `sessionView`; l’ancien correctif ouvrait PC, donc le rendu TMS pouvait rester dans un `main` caché.
- TMS topnav, WOD+ et PC utilisent maintenant le même hôte `sessionView`.
- Retour à la vue d’origine conservé à la fermeture.


## V1.15-multi

- Topnav nettoyée : retrait du mini bouton `profileSwitchDot` près de la version.
- Le changement de profil reste disponible dans les réglages/Gear, pas comme raccourci permanent en haut à gauche.
- Aucun impact sur les données durables ni sur le catalogue de programmes.

# Changelog — Racine multi-utilisateur

## V1.15-multi

- Retire les boutons visibles `Écran` de WOD+ et de la toolbar PC : le Wake Lock est maintenant automatique au démarrage du mode Séance.
- Ajoute un statut discret en mode Séance seulement si l’écran actif est refusé ou non supporté.
- Ajoute un fallback dans Gear / Diagnostic app : bouton `Réactiver écran actif`.
- Conserve la logique de réacquisition quand l’app revient au premier plan.

## V1.10-multi

- Restaure TMS comme outil global visible après la fusion multi-profil.
- Ajoute un bouton `TMS` permanent dans la topnav, indépendant du profil actif et des permissions de programmes.
- Renforce le binding de `scripts/tms_session.js` pour connecter `tmsSessionBtn`, `wodPlusTmsBtn` et `tmsGlobalBtn`.
- Garde TMS hors du catalogue de cycles : c’est une routine libre, pas un programme périodisé.

## V1.9-multi

- Correctif lecture graphique : les points sont maintenant condensés par mouvement/date pour éviter deux fois la même date de suite quand plusieurs sets ou sources existent le même jour.
- Le point retenu par séance est représentatif : meilleur e1RM pour les mouvements chargés, meilleur nombre de reps pour les mouvements au poids du corps.
- Le détail au clic indique le nombre d’entrées regroupées et liste les sets condensés.
- Ajout des filtres `4 sem.`, `8 sem.` et `Tout` pour contrôler la période affichée.
- Ajout du clic sur les points du graphique : date, mouvement lu, charge/reps/RPE, e1RM, source, prévu et contexte.
- Ajout d’un mode comparaison entre deux mouvements, normalisé en % depuis le premier point pour comparer des mouvements de charges différentes.
- Ajout d’une alerte de tendance par mouvement : progression propre, monte cher, stable lourd, baisse suspecte ou données insuffisantes.
- Graphiques légèrement agrandis pour améliorer la lecture des axes et des labels.

## V1.7-multi

Fusion mono → multi : programmes privés Bertin, système de visibilité programmes, panneau admin PC, migration données.

- Ajout de 5 programmes privés depuis Coach-Beurt mono : `epaules_3d_press225_phase2`, `posture_cyphose`, `strict_muscle_up_personnel`, `arnold_split_2026_adapte`, `hypertrophie_fesse_stephanie`.
- Système `visibility` dans `programs/index.js` : `"public"` pour tous, `"private"` pour profils avec permission explicite.
- `profile.programPermissions[]` dans `scripts/profiles/storage.js` : `grantProgramPermission()`, `revokeProgramPermission()`, `hasProgramPermission()`.
- `programIndexIds()` dans `app.js` filtre selon visibility + permissions du profil actif.
- `BERTIN_MACROCYCLE_OVERRIDE` dans `programs/index.js` : route personnelle Bertin (`shoulders3d_press225_phase2` en phase 2).
- Mini bouton `·` dans topnav : switch profil discret, visible seulement si 2+ profils onboardés.
- Onglet Admin dans vue PC : tableau croisé profils × programmes privés, toggle immédiat des permissions.
- `pcIsAdmin()` : visible si `profile.isAdmin` ou `profile.name === "Bertin"`.
- `scripts/migrate_bertin.js` : `migrateBertin()` depuis localStorage legacy + `migrateBertinFromFiles()` depuis fichiers JSON.
- Onglet Progression dans la vue PC : graphiques lecture seule pour les mouvements principaux trackables, sans toucher aux données durables.
- Graphiques Progression enrichis : échelle graduée, grille horizontale, labels de valeurs, min/max réels, pas de graduation, points Dernier/Meilleur visuellement distincts et métriques de variation.
- Correction cache-bust V1.7-multi et chargement explicite de `scripts/charge/ml_refinement.js`.

## V1.6-multi

Ajout d'un cycle spécialisé sérieux pour strict muscle-up.

- Ajout de `programs/strict_muscle_up_cycle.js`.
- Nouveau programme : `Cycle Strict Muscle-Up — 10 semaines / 4 jours`.
- Objectif : passer d'environ 10 strict pull-ups à un strict muscle-up aux anneaux sans kipping.
- Structure : tirage strict, false grip, transition anneaux, ring dip/support, préhab épaules/coudes, checkpoints et test final.
- Semaines 4 et 8 : déload/checkpoint obligatoires pour réduire le risque tendons/coudes/épaules.
- Semaine 10 : test strict seulement si les critères sont verts; sinon test assisté propre.
- Ajout de `dev/strict_muscle_up_checks.js` pour valider durée, fréquence, règles anti-kipping, variation et présence des blocs indispensables.
- Version harmonisée en `V1.6-multi`.

## V1.5-multi

Correction qualité de la branche sportive CrossFit.

- Refonte de `programs/racine_crossfit_programs.js` pour éviter les séances copiées/collées semaine après semaine.
- Performance RX CrossFit contient maintenant de vrais mouvements RX : chest-to-bar, toes-to-bar, handstand push-up/walk progressions, muscle-up progressions, rope climb, double-under, wall ball, thruster, clean/snatch/jerk cycling, bar-facing burpees et GHD/sit-up selon les semaines.
- Performance RX CrossFit intègre exactement un benchmark connu par semaine : Fran, Grace, Helen, DT, Fight Gone Bad, Cindy.
- Préparation Metcon intègre exactement un metcon connu par semaine : Cindy, Annie, Jackie, Helen, Fight Gone Bad, Christine.
- Les journées de construction varient maintenant par semaine : mouvements, skills, stimulus et WOD changent de S1 à S6.
- Ajout de `dev/crossfit_quality_checks.js` pour vérifier la présence d'un seul benchmark connu par semaine, la variation hebdomadaire et les mouvements RX.
- Version harmonisée en `V1.5-multi`.

## V1.4-multi
## V1.4-multi

Expansion du catalogue client vers les objectifs sportifs.

- Ajout de `programs/racine_crossfit_programs.js`.
- Nouveaux programmes Haltéro CrossFit : 3, 4 et 5 jours/semaine.
- Nouveaux programmes Performance RX CrossFit : 4 et 5 jours/semaine.
- Nouveaux programmes Préparation Metcon : 2, 3 et 4 jours/semaine.
- Mise à jour de `programs/index.js` pour exposer les programmes sportifs dans le catalogue.
- Mise à jour de `index.html` pour charger le nouveau catalogue.
- Mise à jour de `dev/program_catalog_checks.js` : validation des objectifs CrossFit/haltéro/metcon et minimum 20 programmes catalogue.

## V1.3-multi

Refonte prototype viable : durcissement multi-profil et anti-contamination.

- Ajout de `scripts/profiles/reference.js` : les anciens repères deviennent une ancre de calibration, pas des données utilisateur vivantes.
- Nouveau `freshState()` neutre : profil vide et `movementRefs` vide au départ.
- Chargement d'un profil : les références de mouvement viennent du profil sauvegardé ou de l'historique, jamais d'une banque préchargée globale.
- Reconstruction historique : ne réinjecte plus `PRELOADED_REFS`.
- Onboarding : écrit aussi les ratios dans le registre du profil actif.
- Interface : version harmonisée, texte de sauvegarde GitHub retiré, exports renommés `racine-*`.
- Dev : ajout de `dev/multi_profile_checks.js` et adaptation des tests au format `Vx.y-multi`.
- Documentation : README, ETAT_ACTUEL et checklist alignés sur la branche multi.

## V1.0-multi (fork initial)

Fork expérimental créé à partir de Racine V51.82 (Coach Beurt, mono-utilisateur).
Voir README.md pour le détail complet des changements.

Résumé :
- Ajout du système de profils locaux multi-utilisateur (`scripts/profiles/`).
- Ajout de la mise à l'échelle des charges par profil (`scripts/charge/scaling.js`).
- Ajout de l'agressivité de progression réglable par profil.
- Retrait de la synchronisation GitHub (tout devient local).
- Retrait des modes spéciaux codés en dur "Stéphanie" / "Arnold".
- Correction d'un bug préexistant : appel orphelin à une fonction jamais
  définie (`setupGithubTokenRemovalControl`) en fin de `scripts/app_helpers.js`.
- `data/` repart vide (plus de données personnelles de Bertin dans ce repo).

L'historique détaillé des versions V39 à V51.82 (avant ce fork) reste
disponible dans le repo de production original `Miozza/Coach-Beurt`.

## V2.2 — Brain mémoire locale
- Ajout `scripts/charge/brain_memory.js`.
- Brain garde une mémoire locale par mouvement + intention : sessions, précision, ambition, connaissance, fiabilité RPE et journal interne.
- Les diagnostics `(!)` affichent maintenant les signaux mémoire quand ils existent.
- La mémoire est isolée par profil via `localStorage`; aucun fichier durable `data/*.json` n'est modifié.

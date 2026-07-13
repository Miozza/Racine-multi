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

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

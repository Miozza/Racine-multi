# Racine — fork multi-utilisateur (V1.0, expérimental)

Racine est une PWA d'entraînement en JavaScript vanilla, sans framework, sans
build, hébergeable telle quelle sur GitHub Pages.

Ce dépôt est un **fork expérimental** de la version personnelle de Bertin
(Coach Beurt / Racine V51.82). L'objectif : permettre à **plusieurs personnes,
du débutant à l'avancé**, d'utiliser la même app avec des charges calibrées à
leur niveau, sans toucher au repo de production original.

## Ce qui a changé par rapport à la version personnelle

- **Multi-profil local.** Chaque personne crée un profil sur son propre
  appareil (`scripts/profiles/`). Aucun compte, aucun serveur : tout reste
  dans le `localStorage` du navigateur, namespacé par profil.
- **Portail d'intégration.** Un nouveau profil passe par un mini-test guidé
  (5 mouvements clés : squat, bench, press, tirage, hinge) qui calcule, via
  la même formule Epley que le moteur de charge utilise déjà, des charges de
  départ réalistes — au lieu d'hériter des poids de Bertin.
- **Moteur de charge inchangé, mais ajustable.** Le moteur (`scripts/charge/`)
  n'a presque pas bougé : deux points d'injection ont été ajoutés.
  - `scripts/charge/scaling.js` met à l'échelle les charges *déclarées par les
    programmes* (ex. `"235 lb"`) selon le ratio personnel de l'utilisateur
    actif, avant que le moteur ne les traite. L'historique réel d'un
    utilisateur n'est jamais re-multiplié : seules les valeurs génériques de
    référence le sont.
  - `coachMaxJumpForExercise` (dans `scripts/charge/historique.js`) applique
    un facteur d'agressivité (0.5–1.5×, réglable par profil) à la taille des
    sauts de charge proposés. **Les freins de sécurité RPE restent
    identiques pour tout le monde, peu importe ce réglage.**
  - Avec ratio = 1 et agressivité = 1 (cas de Bertin lui-même), le
    comportement est strictement identique à la version originale — testé
    via un harnais Node (`coachMaxJumpForExercise`, `guardedSuggestedLoadDecision`).
- **Plus de synchronisation GitHub.** L'ancienne sauvegarde automatique vers
  `Miozza/Coach-Beurt` a été retirée (tout reste local, par choix). Une
  sauvegarde/restauration JSON manuelle par profil est disponible dans
  Réglages → Profil.
- **Les anciens modes spéciaux "Stéphanie" / "Arnold"** (profils codés en dur
  par URL) ont été remplacés par le système de profils générique.

## Ce qui n'a pas changé

- Les 14 programmes (`programs/*.js`), leur structure et leur contenu.
- Les vues WOD+, Session, Résultats, PC, Historique.
- La logique de calcul du moteur de charge elle-même (Epley, RPE, deload,
  caps de progression par mouvement).

## Limitations connues de cette V1 expérimentale

- Pas de migration automatique de l'historique réel de Bertin (resultats.json
  / athlete_state.json) depuis l'ancien repo — `data/` part vide ici.
  `CoachState.readLegacyBertinState()` existe comme point d'ancrage pour un
  futur outil de migration.
- Les suites `dev/*.js` (regression, charge engine, structure...) n'ont pas
  encore été mises à jour pour la nouvelle architecture multi-profil ; elles
  datent de la version mono-utilisateur et peuvent échouer sur des
  vérifications qui ne s'appliquent plus (clés GitHub, structure de profil).
- Le tableau de bord "Route compétition" (vue PC) reste affiché même sans
  objectif défini (repli neutre à 180 jours), faute de temps pour le rendre
  entièrement optionnel dans l'UI complexe de `view_pc.js`.

## Démarrage

Ouvrir `index.html` (ou héberger le dossier sur GitHub Pages). Au premier
lancement, le portail d'intégration s'affiche automatiquement.

## Structure

Identique à la version originale — voir `docs/ARCHITECTURE.md` — avec
l'ajout de `scripts/profiles/` (registre de profils, logique d'intégration,
interface) et `scripts/charge/scaling.js` (mise à l'échelle par profil).

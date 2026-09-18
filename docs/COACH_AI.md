# Coach IA — contrat

Domaine `scripts/coach_ai/`, porte publique `window.CoachAI`
(`scripts/coach_ai/index.js`). Ce document fait autorité sur les frontières du
domaine. En cas de désaccord avec un rapport daté, c'est le **code** qui
tranche, puis ce fichier, puis `docs/STRUCTURE_CONTRACT.md`.

À lire avec : `docs/DATA_FLOW_CONTRACT.md` (qui écrit quoi),
`docs/CHARGE_ENGINE.md` + `docs/CHARGE_PROGRESSION_CONTRACT.md` (pourquoi les
charges ne lui appartiennent pas), `docs/ARCHITECTURE.md` (propriété des vues).

---

## 1. Ce que c'est

Une conversation avec un modèle de langage, qui lit l'état réel de l'athlète et
peut **proposer** des changements d'entraînement. L'athlète accepte ou refuse.

Trois capacités, et pas une de plus :

| Il peut | Il ne peut pas |
|---|---|
| Lire l'historique, les notes, la progression, la mémoire Brain | Écrire une charge |
| Proposer un remplacement de mouvement | Appliquer quoi que ce soit lui-même |
| Proposer un changement de format / repos / consigne | Toucher `resultats`, `athlete_state`, `charges.js` |
| Proposer une semaine complète | Modifier un programme de `programs/` |

---

## 2. La règle qui gouverne tout : le moteur garde la main sur les poids

**Aucun outil exposé au modèle n'a de champ de charge.** Ce n'est pas une
consigne de prompt — c'est le schéma JSON lui-même
(`scripts/coach_ai/patch.js`), et `dev/coach_ai_checks.js` échoue si un champ
de poids y réapparaît.

Deux raisons, dans cet ordre :

1. **L'ambiguïté du chiffre.** Dans `programs/`, une charge chiffrée est un
   **%1RM de l'athlète de référence** (`scripts/profiles/reference.js`), que
   `scripts/charge/scaling.js` redescend ensuite au niveau réel. Un nombre
   écrit par un modèle est indécidable entre « %référence » et « poids réel de
   Bertin ». Pris pour l'un quand c'est l'autre, ça donne une double réduction
   et des charges ridicules (CLAUDE.md §3.2).
2. **Le moteur est meilleur.** Il connaît les e1RM réels, la fiabilité du RPE
   par mouvement, le frein RPE récent, les ratios du profil, et les tailles du
   rack (`data/equipment.js`). Un modèle ne connaît rien de tout ça de façon
   fiable depuis une conversation.

**Comment le modèle exprime quand même une intensité** : le champ `intention`
(`technique`, `legere`, `facile`) est reporté dans la note de l'exercice, et
ce sont exactement les mots que `coachExtractMovementIntent()` lit déjà pour
couper l'auto-progression. C'est le canal prévu, et il suffit.

**Si l'athlète demande un poids précis** : le modèle répond dans la
conversation — c'est un conseil, l'athlète reste libre de le saisir. Ce qui
arrive ensuite est déjà couvert : `scripts/ai/ai_influence.js` documente un
écart manuel entre la charge saisie et celle du moteur. Aucune charge n'est
jamais modifiée automatiquement (règle inchangée depuis V3.3).

---

## 3. Rien ne s'applique sans un geste de l'athlète

Les outils sont de deux natures :

- **Lecture** (`consulter_mouvement`) — exécuté immédiatement, la boucle
  continue. Lire ne change rien.
- **Proposition** (`proposer_*`) — **jamais** exécuté par le modèle. On lui
  rend un `tool_result` qui dit « affiché, en attente de décision », la boucle
  s'arrête, et une carte Accepter / Refuser apparaît.

`scripts/coach_ai/chat.js` ne référence jamais `CoachAIPatch.apply` — seul
`scripts/coach_ai/ui.js` l'appelle, depuis le bouton. Vérifié par
`dev/coach_ai_checks.js`.

Même posture que `scripts/profiles/prescription.js` (carte Accepter/Refuser)
et que l'Avis IA existant (`do_not_auto_apply`).

---

## 4. Où vont les données

| Donnée | Où | Pourquoi là |
|---|---|---|
| Clé API | `racine_coach_ai_device_v1`, **hors** state de profil | Ne doit pas partir dans un export JSON ni un lien `#rx=`. C'est un secret d'appareil, pas une donnée d'athlète. |
| Semaines générées + ajustements | `state.aiPlan` (donc `racineState::<profil>`) | Isolation par profil **par construction**, même choix que `movementSwaps`. Aucun nouveau chemin de persistance : l'écriture passe par `save()`. |
| Conversation | `racine_coach_ai_chat_v1::<profil>`, plafonnée | Hors du state : l'export sert à restaurer un athlète, pas à archiver un chat. Le quota local n'a **aucune copie serveur** — entre une séance de 2024 et une conversation de la semaine dernière, la séance gagne. |
| Journal des propositions | `racine_coach_ai_patch_log_v1`, plafonné | Consultatif. Perdu sans bruit si le quota sature. |

`state.aiPlan` porte un numéro de **schéma** et une migration ascendante
(CLAUDE.md §2.1). Un plan écrit par une version antérieure garde ses semaines.

**Aucun `localStorage.clear()`, aucune suppression en masse**, nulle part dans
le domaine. `CoachAIChat.clear()` fait un `removeItem` sur la seule clé de
conversation.

---

## 5. Comment une semaine générée arrive dans l'app

Par un **programme normal**, `programs/ai_custom.js` (id `ai_custom`, privé).

Il expose `getBlocks(day, week)` comme n'importe quel programme, mais lit ses
blocs dans `CoachAIPlan` au lieu de les coder en dur. Conséquence voulue :
`buildWorkout()` est l'entonnoir unique de **toutes** les vues (séance guidée,
Résultats, PC, WOD+) — un programme le traverse gratuitement. Un mécanisme
parallèle aurait dû être rebranché dans chaque vue, et aurait divergé.

Le tableau `days` du programme est **muté sur place**, jamais réassigné :
`registerProgramsFromIndex()` en fait un `Object.assign({}, programme)` au
chargement, et la copie partage la référence du tableau. Réassigner la
variable ne mettrait rien à jour.

Une semaine générée n'écrase rien : la retirer rend le programme d'origine
intact. `CoachAIPlan.undo()` garde les 3 derniers instantanés.

Les **ajustements** (format / repos / note) s'appliquent à n'importe quelle
semaine, générée ou non, par une surcouche dans `buildWorkout()` — juste après
les remplacements de mouvements, donc sur le nom que l'athlète voit
réellement. Les blocs sont copiés, jamais mutés (même règle que
`RacineMovementSwaps.applyToWorkout`).

---

## 6. Le réseau

C'est la seule partie de Racine qui sort de l'appareil. Décision explicite du
2026-09-18, qui lève la règle « pas de distant » de CLAUDE.md §3.4 pour ce
domaine **seulement**.

- Un seul fichier appelle `fetch()` : `scripts/coach_ai/client.js`. Vérifié.
- `fetch` brut, pas le SDK npm : Racine n'a ni bundler ni étape de build, et
  `dev/architecture.json` fige ce choix (« Zéro import/export ES »). L'API
  Messages est un seul POST JSON ; la dépendance ne paierait pas son coût.
- En-tête `anthropic-dangerous-direct-browser-access: true` requis, sinon CORS
  refuse. Il assume que la clé est exposée côté client — acceptable ici :
  application personnelle, clé locale, profil admin seulement. **Ce n'est pas
  transposable à un déploiement client** ; une version B2C demanderait un
  relais serveur.
- **Hors-ligne, Coach IA est muet et le reste de Racine fonctionne
  normalement.** C'est non négociable : l'app est une PWA de terrain.
- La boucle d'outils est bornée (`MAX_TOOL_ROUNDS`) — garde-fou de coût.

Le contexte athlète est envoyé dans un bloc système **mis en cache**
(`cache_control`) : il est long et stable d'un message à l'autre, et se place
donc avant tout ce qui varie.

---

## 7. Accès

Admin uniquement (`CoachProfiles.isActiveAdmin()`), comme la vue PC. L'onglet
porte `admin-only`, et `switchView("coachai")` redirige un profil client vers
l'entraînement.

---

## 8. Garde-fous

`node dev/coach_ai_checks.js` — cité dans `RELEASE_CHECKLIST.md`.

Il vérifie notamment : aucun champ de charge dans les schémas d'outils ; le
nettoyage efface une charge même si le modèle en écrit une ; les ajustements ne
mutent pas les templates ; `chat.js` n'applique jamais un patch ; aucune
suppression de clé non ciblée ; tous les plafonds présents ; la clé API absente
du state de profil et inaccessible à l'export et à la prescription ;
`context.js` en lecture seule ; un seul fichier avec `fetch()`.

---

## 9. Ce qui n'est pas construit, et pourquoi

- **Streaming de la réponse.** Non-streaming pour l'instant : une réponse de
  coaching tient largement dans le budget, et le SSE à la main coûterait plus
  qu'il ne rapporte. À reconsidérer si la génération de semaine devient longue
  à l'usage.
- **Coach IA pour les profils clients.** Demanderait un relais serveur (la clé
  ne peut pas voyager) et une décision de coût. Hors périmètre.
- **Le modèle qui lit un résultat pendant la séance.** Volontairement absent :
  la séance guidée doit rester utilisable sans réseau, et une latence réseau
  entre deux séries est inacceptable.

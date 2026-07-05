# Brain — philosophie officielle

> **Je ne devine pas. J'apprends.**

Brain n'est pas seulement un calculateur de charges. Brain est le moteur interne de Racine qui apprend progressivement à connaître l'athlète. Les charges proposées sont une conséquence de cette connaissance.

## Mission

Brain doit comprendre l'athlète afin de justifier ses décisions. Il doit proposer des charges, mais aussi expliquer son niveau de confiance, ce qu'il connaît, ce qu'il ignore encore et ce qu'il surveille à la prochaine séance.

## Principes

1. **Brain apprend.** Chaque séance doit pouvoir améliorer sa connaissance d'un mouvement.
2. **Brain explique.** Une décision ne doit jamais se limiter à « progression prudente »; elle doit dire pourquoi.
3. **Brain connaît sa confiance.** Une proposition doit pouvoir être accompagnée d'un niveau de confiance.
4. **Brain connaît sa précision.** Il compare ses prédictions aux résultats réellement testés.
5. **Brain connaît ses limites.** Un mouvement peu documenté ne doit pas être traité comme un mouvement maîtrisé.
6. **Brain distingue l'intention.** Un Front Squat force, hypertrophie, endurance ou technique n'est pas la même situation physiologique.
7. **Brain apprend des performances testées.** Une seule mauvaise journée n'est pas une preuve. Une prédiction réellement testée vaut plus qu'une charge modifiée avant de commencer.

## Mouvement + intention

Brain mémorise les profils par couple :

```text
Mouvement + intention
```

Exemples :

```text
Front Squat + strength
Front Squat + hypertrophy
Weighted Pull-up + strength
Hip Thrust + hypertrophy
```

Le mouvement garde une identité commune, mais la prédiction dépend de l'intention du bloc.

## Données apprises

Pour chaque mouvement + intention, Brain peut suivre :

- confiance de prédiction;
- précision des prédictions testées;
- ambition;
- connaissance;
- sensibilité du mouvement;
- fiabilité du RPE;
- validations récentes;
- écarts entre charge prévue et charge réalisée;
- tendance de progression.

## Interprétation du RPE

Brain ne doit pas imposer une interprétation universelle du RPE. Il doit apprendre comment chaque utilisateur utilise l'échelle.

Pour Bertin, le profil actuel est asymétrique :

- **RPE 7 ou moins** : signal fiable d'une séance facile ou maîtrisée;
- **RPE 8** : signal moyen, souvent utilisé comme cible volontaire d'entraînement;
- **RPE 8.5** : signal utile;
- **RPE 9, 9.5 ou 10** : signal fort à maximal, considéré comme fiable.

Donc Brain ne doit plus afficher « RPE peu discriminant » comme un jugement global. Il doit plutôt dire que le **profil RPE est personnalisé** : RPE 8 est interprété prudemment, alors que RPE 9+ est respecté comme message fort.

Les données plus solides restent :

- la charge réellement utilisée;
- les répétitions réellement réussies;
- les prédictions réellement testées;
- la stabilité des validations dans le temps.


## Validation et confort

Brain doit distinguer deux concepts :

```text
Validation = l'objectif de charge/répétitions a été atteint.
Confort = le coût réel de cette validation.
```

Exemple :

```text
Weighted Pull-up 25 lb × 5 @ RPE 9.5
```

Interprétation :

- validation : oui;
- confort : faible;
- décision : maintenir pour consolidation;
- erreur à éviter : considérer cette charge comme pleinement maîtrisée.

Une charge peut donc être **validée sans être maîtrisée**. Brain doit demander une consolidation avant de proposer une hausse lorsque l'effort est très élevé.

## Mouvements sensibles

Les mouvements poids de corps, lestés au poids de corps et les mouvements lourds de force doivent être traités avec plus de prudence.

Exemples :

- Pull-up;
- Weighted Pull-up;
- Dips;
- Ring Dips;
- Strict Press;
- Front Squat lourd;
- Bench lourd.

Pour ces mouvements, Brain peut demander plus de validations, afficher plus souvent une option prudente/ambitieuse, et augmenter sa confiance plus lentement.

## Brain Explain

Le panneau `(!)` ne doit pas seulement répondre à :

```text
Pourquoi cette charge ?
```

Il doit répondre à :

```text
Que pense Brain de ce mouvement aujourd'hui ?
```

Structure attendue :

```text
Analyse Brain

Confiance
xx %
Je connais bien ce mouvement. / Je suis encore en apprentissage.

Précision
xx %
N prédictions testées.

Décision
Maintien / hausse normale / hausse prudente / validation supplémentaire requise.

Pourquoi
✓ raison concrète
✓ raison concrète
✓ raison concrète

Prochaine observation
Ce que Brain veut confirmer à la prochaine séance.
```

## Avis IA

Avis IA est une couche future, optionnelle et consultative. Elle ne doit pas remplacer Brain. Elle pourra fournir des recommandations externes structurées, mais Brain reste le moteur décisionnel local de Racine.

## Règle d'or

> Une nouvelle fonctionnalité Brain doit répondre à la question : qu'est-ce que Brain apprend aujourd'hui qu'il ne savait pas hier ?


## Équipement local

Brain doit utiliser `data/equipment.js` comme source unique de vérité pour arrondir les charges et comprendre les contraintes matérielles. Les règles de progression ne doivent pas réinventer les haltères, kettlebells, plaques ou incréments câble ailleurs.


## V2.9 — Profils de mouvements

Brain ne traite plus tous les mouvements comme une même catégorie. Il utilise un profil par famille de mouvement afin d'adapter le vocabulaire, la sensibilité et les explications.

Exemples :

- **Weighted Pull-up / Dips** : sensibilité très élevée, consolidation avant hausse, RPE 9+ interprété comme signal fort.
- **Front Squat / Strict Press** : mouvements de force sensibles; une nouvelle charge demande généralement une validation supplémentaire.
- **Hip Thrust** : mouvement à faible sensibilité relative; si la progression est stable, Brain parle de progression normale plutôt que de prudence.
- **Accessoires** : qualité et répétitions avant charge.

Règle de développement : les profils vivent dans `scripts/charge/movement_profiles.js`. Aucune logique de profil ne doit être ajoutée dans `app.js`.


## Brain Journal

Brain Journal conserve et résume les apprentissages internes : prédictions testées, propositions trop prudentes, propositions trop ambitieuses, et décisions non testées. Il sert à expliquer ce que Brain apprend; il ne modifie jamais directement les charges.

## V3.1 / V3.3 — Avis IA Export + Import

Avis IA est optionnel, universel et consultatif.

Racine ne dépend d'aucune IA externe : aucun abonnement imposé, aucune clé API, aucun appel réseau. L'app génère seulement un prompt que l'utilisateur copie dans l'IA de son choix.

Règle stricte :

```text
Brain décide.
Avis IA conseille.
L'utilisateur choisit manuellement.
```

Avis IA ne modifie jamais :

- la charge proposée par Brain;
- l'historique;
- la confiance Brain;
- le programme;
- les fichiers `data/`.

Si l'utilisateur suit une suggestion IA, Racine devra plus tard l'enregistrer comme :

```text
Décision utilisateur influencée par Avis IA
```

et non comme une décision automatique.

### Format d'échange

Les prompts Avis IA commencent par :

```text
RACINE_AI_PROMPT_V1
```

La réponse structurée demandée doit être encadrée par :

```text
RACINE_AI_RESPONSE_START
{ ... }
RACINE_AI_RESPONSE_END
```

Racine V3.1 exporte les prompts. Racine V3.3 importe une réponse collée localement sur iPhone : l'app cherche uniquement le bloc entre `RACINE_AI_RESPONSE_START` et `RACINE_AI_RESPONSE_END`, sauvegarde l'avis dans `localStorage`, puis l'affiche comme avis consultatif. Aucune charge n'est modifiée automatiquement.

## V3.3 — Suivi des décisions influencées par Avis IA

Avis IA ne modifie toujours jamais les charges. Si l'utilisateur modifie manuellement une charge après avoir importé un avis IA pour le même mouvement, Racine peut maintenant documenter ce choix comme une décision utilisateur influencée par Avis IA.

Principe :

```text
Brain propose une charge.
Avis IA donne un avis consultatif.
L'utilisateur choisit manuellement une charge différente.
Racine conserve la proposition Brain et note l'influence de l'avis IA.
```

Exemple de trace :

```json
{
  "source": "user_override",
  "influencedBy": "ai_advice",
  "brainSuggestion": 195,
  "userLoad": 200,
  "consultative_only": true
}
```

Cette trace sert à comprendre l'origine du changement sans transformer Avis IA en moteur de charge. Brain reste décisionnel. L'utilisateur reste responsable du choix final.

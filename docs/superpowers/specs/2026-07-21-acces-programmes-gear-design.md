# Accès aux programmes et simplification de Gear

## Contexte

Racine fonctionne hors ligne et ne synchronise pas l’état des appareils clients. La vue Gear de l’admin ne peut donc pas connaître de façon fiable le programme actif d’un client, ni confirmer qu’une permission a été reçue ou retirée sur son téléphone.

L’interface actuelle mélange quatre actions : accorder une permission, la retirer, activer un cycle et partager une prescription. Cette présentation donne l’impression que l’admin contrôle un état distant alors que les données restent locales à chaque appareil.

## Objectifs

- Conserver une bibliothèque de programmes actuels accessible sans gestion individuelle.
- Rendre privé le programme `hypertrophie_fesse_stephanie`.
- Rendre privé par défaut tout programme ajouté ultérieurement.
- Distribuer les programmes privés par lien de prescription permanent.
- Simplifier Gear pour qu’il représente seulement les actions réellement possibles hors ligne.
- Préserver les cycles et permissions déjà utilisés.

## Hors portée

- Synchronisation distante des appareils.
- Révocation à distance d’un programme déjà reçu.
- Consultation ou changement du programme actif d’un client depuis Gear.
- Expiration des prescriptions.
- Création de packs ou de groupes de programmes.

## Modèle d’accès

Le catalogue réutilise le champ existant `visibility`; aucun nouveau schéma parallèle n’est créé :

- `visibility: "public"` signifie programme de base, visible pour tous les profils sans permission individuelle;
- `visibility: "private"` signifie programme visible seulement si son identifiant figure dans `profile.programPermissions` ou si le profil admin possède les droits propriétaire;
- une valeur absente ou inconnue est traitée comme `private` par sécurité.

Tous les programmes présents dans le catalogue au moment de cette modification restent `public`, sauf :

- `hypertrophie_fesse_stephanie`, reclassé `private`;
- les huit programmes déjà privés, qui restent `private`.

Lorsqu’un nouvel enregistrement du catalogue omet `visibility`, le système le traite comme `private`. Il faut donc écrire explicitement `visibility: "public"` pour publier un nouveau programme à tous.

Une permission privée acceptée est permanente sur l’appareil. Gear ne propose aucune révocation, car il ne peut pas l’appliquer à distance.

## Migration et compatibilité

La migration est locale, idempotente et exécutée avant le filtrage du catalogue.

Pour chaque profil local dont le cycle actif est `hypertrophie_fesse_stephanie`, elle ajoute cet identifiant à `profile.programPermissions` s’il n’y est pas déjà. Le cycle, la semaine, le jour, l’historique, les résultats et les charges sont conservés.

Aucune permission existante n’est supprimée. Les profils qui n’utilisent pas ce programme comme cycle actif cessent de le voir, sauf s’ils possèdent déjà une permission explicite.

## Vue Gear admin

Le panneau devient « Envoyer un programme spécialisé » et suit une disposition à deux zones :

1. Un résumé compact indique que les programmes de base sont déjà accessibles à tous.
2. Une liste recherchable affiche uniquement les programmes privés pouvant être prescrits.

Le sélecteur de client est conservé pour personnaliser le nom dans la prescription et joindre les remplacements de mouvements de ce profil. Il ne sert pas à afficher un état d’accès supposé.

Chaque programme privé offre une seule action principale : « Copier le lien ». Après copie, l’interface confirme : « Lien copié — envoyez-le à [client] ».

Les libellés et actions « Actif », « Accordé », « Activer comme cycle », « Accorder » et « Retirer » disparaissent du panneau. Les remplacements de mouvements demeurent dans une section distincte sous la prescription de programme.

## Parcours de prescription

1. L’admin choisit un client dans Gear.
2. Il recherche un programme privé.
3. Il copie le lien et l’envoie au client.
4. Le client ouvre le lien sur son appareil et voit le programme proposé.
5. Il accepte ou refuse.
6. En cas d’acceptation, l’identifiant est ajouté à ses permissions locales et reste accessible définitivement.

L’admin ne reçoit pas d’accusé de réception et Gear n’affiche pas de statut distant.

## Erreurs et messages

- Si la création du lien échoue, Gear affiche une erreur sans modifier les données locales.
- Si le presse-papier est indisponible, le lien est présenté dans le mécanisme de copie de secours existant.
- Si le client ouvre une prescription inconnue ou invalide, le flux d’acceptation la refuse sans ajouter de permission.
- Accepter plusieurs fois la même prescription reste idempotent.

## Validation

Les tests automatisés doivent vérifier :

- tous les programmes actuellement publics sauf `hypertrophie_fesse_stephanie` restent accessibles sans permission;
- les huit programmes déjà privés restent privés;
- `hypertrophie_fesse_stephanie` est invisible sans permission;
- un profil dont ce programme est le cycle actif reçoit automatiquement la permission, sans perdre son état;
- les permissions existantes sont préservées;
- une prescription acceptée ajoute durablement la permission;
- un programme sans `visibility` explicite est privé;
- Gear ne rend plus les actions d’activation, d’accord ou de retrait;
- le filtrage et la copie du lien fonctionnent pour le client sélectionné;
- la vue Gear ne déborde pas horizontalement à 393 × 852 et 375 px de largeur.

La suite de régression complète et les contrôles de structure doivent rester verts. Toute modification fonctionnelle doit respecter le contrat de version du dépôt.

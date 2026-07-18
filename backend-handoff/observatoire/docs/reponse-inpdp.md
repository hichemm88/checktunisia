# Réponse type INPDP — « Où sont traitées les données ? »

Réponse préparée aux questions attendues de l'INPDP et du Ministère sur le
recours à l'IA et la localisation des traitements.

## Q1. Le module Observatoire accède-t-il aux données personnelles des voyageurs ?

Non. Le module n'accède qu'à une base d'agrégats **physiquement distincte** de
la base opérationnelle. Cette base ne contient que des compteurs (arrivées,
nuitées, durées) par dimensions larges (jour, zone au niveau délégation,
nationalité ISO, type d'établissement), tous soumis au seuil k = 10. Elle ne
contient aucun nom, numéro de document, date de naissance, adresse, ni
identifiant individuel. Le rôle PostgreSQL utilisé par le module ne dispose que
d'un droit de lecture sur ce schéma et **ne peut pas même nommer** les tables
nominatives.

## Q2. L'IA (Claude) reçoit-elle des données personnelles ?

Non. Deux usages de l'IA existent, et aucun ne transmet de donnée personnelle :

1. **Interrogation en langage naturel (NL→SQL).** L'appel transmet : le schéma
   de la base *agrégée* (trois tables de compteurs), les définitions métier, la
   date du jour, la liste des zones et la question de l'utilisateur. L'IA renvoie
   une proposition de requête SQL. **Elle ne calcule aucun chiffre.** La requête
   est validée côté serveur (SELECT-only, liste blanche de tables, timeout) puis
   exécutée par la base via un rôle en lecture seule. Le seuil k = 10 est
   ré-appliqué au résultat. Un second appel rédige la réponse **à partir des
   chiffres retournés** — jamais inventés.

2. **Rapports mensuels.** Le serveur calcule un pack de chiffres déjà agrégés
   (respectant k = 10). L'IA rédige le rapport **à partir de ce seul pack**, en
   arabe puis en français. Elle ne cite aucun chiffre absent du pack.

Dans les deux cas, ce qui transite vers l'API Claude se limite à des agrégats
anonymes et à la question de l'utilisateur.

## Q3. Où sont hébergées les données ?

- **Données opérationnelles et agrégats** : infrastructure Qayed (backend
  Railway / base PostgreSQL). La base d'agrégats est un schéma distinct de la
  même instance, isolé par un rôle en lecture seule.
- **Appels IA** : l'API Claude (Anthropic) reçoit uniquement des agrégats
  anonymes et la question. Aucune donnée personnelle ne quitte l'infrastructure
  Qayed, puisque le module n'en manipule pas.

## Q4. Comment garantir qu'un chiffre affiché est exact et non « halluciné » ?

L'IA ne produit jamais un chiffre. Elle formule une requête ; la **base** calcule.
Chaque requête et chaque réponse sont journalisées avec un identifiant unique
(`query_id`) et le SQL exécuté, consultables par l'administrateur. L'interface
affiche un bouton « Voir la requête » et l'identifiant, pour une traçabilité
complète.

## Q5. Que se passe-t-il pour une statistique portant sur peu de séjours ?

Elle n'est ni calculée, ni affichée, ni exportable. En dessous de dix séjours,
la valeur est masquée (« < seuil »). Cette règle s'applique à toutes les
combinaisons de dimensions, ce qui empêche toute ré-identification par
recoupement.

## Q6. Le module peut-il servir à surveiller des personnes ?

Non. L'Observatoire est strictement consultatif et statistique. Il ne comporte
aucune fonction opérationnelle (pas de watchlist, pas de signalement, pas de
recherche nominative). Ces fonctions restent exclusivement dans le périmètre du
Ministère de l'Intérieur, sous convention distincte.

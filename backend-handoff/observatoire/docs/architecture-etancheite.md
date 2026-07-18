# Architecture d'étanchéité — Observatoire du Tourisme

Document technique destiné au dossier ministériel et à l'INPDP. Il décrit
comment le module Observatoire garantit qu'il **ne voit jamais** de donnée
nominative (règle non négociable #1).

## Schéma de flux (sens unique)

```
┌─────────────────────────────────────────────┐
│  BASE OPÉRATIONNELLE QAYED (schéma public)    │
│  fiches de police nominatives                 │
│  nom, prénom, n° document, date naissance...  │
└───────────────────┬───────────────────────────┘
                    │  LECTURE SEULE
                    │  AggregationService (le SEUL pont)
                    │  - lit les fiches VALIDÉES
                    │  - agrège par jour × zone × nationalité × type
                    │  - applique le seuil k=10 (supprime les cellules < 10)
                    │  - n'écrit AUCUN identifiant, AUCUN n° de document
                    ▼  ÉCRITURE
┌─────────────────────────────────────────────┐
│  BASE D'AGRÉGATS (schéma observatoire)         │
│  agg_sejours, dim_zones, agg_couverture        │
│  UNIQUEMENT des compteurs >= 10                │
└───────────────────┬───────────────────────────┘
                    │  rôle PostgreSQL LECTURE SEULE
                    │  (observatoire_ro — ne voit pas `public`)
                    ▼
┌─────────────────────────────────────────────┐
│  API Observatoire  +  Modules IA               │
│  Dashboard (TOURISME_LECTEUR)                  │
└─────────────────────────────────────────────┘
```

## Barrières successives

| # | Barrière | Mise en œuvre |
|---|----------|---------------|
| 1 | Schéma physiquement distinct | `observatoire` ≠ `public` ; aucune FK ne traverse (`create_observatoire_schema.php`) |
| 2 | Un seul composant lecteur du nominatif | `AggregationService` — jamais exposé, tourne en tâche planifiée serveur |
| 3 | Sens unique | rien n'est jamais recopié depuis `observatoire` vers `public` |
| 4 | Aucun identifiant écrit | l'ETL n'INSÈRE que des compteurs et des dimensions larges (zone, nationalité ISO, type) |
| 5 | Seuil k=10 en amont | `AggregationService::appliquerSeuil()` supprime toute cellule < 10 avant écriture |
| 6 | Seuil k=10 en aval | `Seuil` + `StatsService` + `IaQueryService` re-masquent toute agrégation à la demande retombée sous 10 |
| 7 | Rôle PostgreSQL en lecture seule | `observatoire_ro` : `SELECT` sur `observatoire` uniquement ; aucun droit sur `public`, aucune écriture |
| 8 | Liste blanche SQL pour l'IA | `SqlGuard` : SELECT-only, 3 tables autorisées, pas de schéma `public` nommable |

Les barrières 5 et 6 sont redondantes **volontairement** : même si une nouvelle
agrégation combinait des dimensions au point de retomber sous le seuil, la couche
aval la masquerait.

## Ce qui n'existe pas dans la base d'agrégats

- Aucune colonne : nom, prénom, numéro de document, date de naissance, adresse,
  téléphone, e-mail.
- Aucun identifiant d'établissement individuel dans la table de faits (seule la
  zone agrégée — délégation — est stockée).
- Aucune géolocalisation fine (grain maximal : délégation).

## Traçabilité

- Chaque exécution de l'ETL est journalisée (`agg_run_log` : horodatage,
  volumes, cellules supprimées par le seuil).
- Chaque requête IA est journalisée (`ia_query_log` : question, SQL généré,
  validité, nombre de lignes, `query_id`). Tout chiffre affiché par l'IA est
  ainsi traçable jusqu'à sa requête source.

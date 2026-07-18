# Handoff backend — Observatoire du Tourisme (Qayed)

Code **backend Laravel** du module Observatoire, a appliquer sur le depot Railway
(`checktunisia-backend`). Comme le handoff « couts IA », ces fichiers ne tournent
pas dans le depot frontend : copiez-les aux emplacements miroirs du backend.

L'Observatoire est un dashboard statistique **agrege et anonyme** pour le
Ministere du Tourisme, construit sur les fiches de police Qayed. Les 8 regles
non negociables du cahier des charges sont cablees dans le code ; ce README
indique OU chacune est appliquee.

## Architecture d'etancheite (regle #1)

```
[Base nominative Qayed — schema public]
        |
        |  AggregateObservatoireJob (cron horaire) — SEUL pont, sens unique
        |  AggregationService : lit public, calcule, applique k=10, ecrit observatoire
        |  N'ECRIT aucun identifiant personnel, aucun numero de document
        v
[Base d'agregats — schema observatoire]  <-- role PostgreSQL LECTURE SEULE -->  API + IA
```

- Schema PostgreSQL **physiquement distinct** `observatoire` (migration
  `..._create_observatoire_schema.php`). Aucune FK ne traverse la frontiere.
- L'API et l'IA lisent via une connexion dediee `pgsql_observatoire_ro`, mappee
  sur un role PostgreSQL qui n'a **que** `SELECT` sur `observatoire` (voir plus
  bas). Meme si une requete IA etait malveillante, la base refuse toute ecriture
  et ne voit meme pas le schema `public`.

## Fichiers

| Fichier | Emplacement backend |
|---|---|
| `database/migrations/2026_07_20_000001_create_observatoire_schema.php` | `database/migrations/` |
| `database/migrations/2026_07_20_000002_create_observatoire_tables.php` | `database/migrations/` |
| `database/seeders/ObservatoireDemoSeeder.php` | `database/seeders/` (+ appel conditionnel dans `DatabaseSeeder`) |
| `app/Services/Observatoire/*.php` | `app/Services/Observatoire/` |
| `app/Jobs/AggregateObservatoireJob.php` | `app/Jobs/` |
| `app/Console/Commands/ObservatoireAggregateCommand.php` | `app/Console/Commands/` |
| `app/Http/Controllers/Observatoire/*.php` | `app/Http/Controllers/Observatoire/` |
| `app/Http/Middleware/EnsureTourismeLecteur.php` | `app/Http/Middleware/` |
| `routes/observatoire.php` | inclure depuis `routes/api.php` |
| `resources/views/observatoire/rapport_pdf.blade.php` | `resources/views/observatoire/` |

## Regles cablees — table de correspondance

| Regle | Ou |
|---|---|
| #1 Etancheite absolue | schema distinct `observatoire` ; `AggregationService` seul lecteur du nominatif ; connexion RO |
| #2 Seuil k=10 | `AggregationService::appliquerSeuil()` (ETL) **et** `Seuil` + `StatsService` (a la demande) **et** `IaQueryService::appliquerSeuilResultat()` |
| #3 L'IA ne calcule jamais | `IaQueryService` : Claude propose le SQL, la base calcule, Claude redige a partir des chiffres ; tout logge dans `ia_query_log` (query_id) |
| #4 IA -> base agregats seule | `SqlGuard` (liste blanche 3 tables, SELECT only) + connexion RO + prompt `Prompts::SCHEMA_EXPOSE` sans table nominative |
| #5 Aucun emoji | prompts + gabarit PDF |
| #6 Bilinguisme AR/FR | `RapportService::rediger()` : 2 appels natifs (ar puis fr), pas de traduction |
| #7 Conformite INPDP | middleware `tourisme_lecteur`, log `ia_query_log`, doc `docs/` |
| #8 Lecture seule | `routes/observatoire.php` : aucune route mutante (hors generation de rapport, qui n'ecrit que dans les agregats) |

## Connexion PostgreSQL lecture seule (`pgsql_observatoire_ro`)

Ajouter dans `config/database.php` une connexion **distincte** pointant sur un
**role PostgreSQL en lecture seule** :

```php
'pgsql_observatoire_ro' => [
    'driver'   => 'pgsql',
    'host'     => env('DB_HOST'),
    'port'     => env('DB_PORT', 5432),
    'database' => env('DB_DATABASE'),
    'username' => env('OBSERVATOIRE_RO_USER'),      // role dedie
    'password' => env('OBSERVATOIRE_RO_PASSWORD'),
    'charset'  => 'utf8',
    'search_path' => 'observatoire',                 // ne voit pas `public`
    'sslmode'  => 'prefer',
],
```

Provisionner le role (une fois, via migration SQL ou psql admin) :

```sql
CREATE ROLE observatoire_ro LOGIN PASSWORD '...';
REVOKE ALL ON SCHEMA public FROM observatoire_ro;
GRANT USAGE ON SCHEMA observatoire TO observatoire_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA observatoire TO observatoire_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA observatoire GRANT SELECT ON TABLES TO observatoire_ro;
-- Aucune ecriture, aucun acces au schema public.
```

La connexion applicative par defaut (`pgsql`) garde ses droits d'ecriture : elle
sert a l'ETL et aux logs. L'IA et les lectures dashboard passent **exclusivement**
par `pgsql_observatoire_ro`.

## Enregistrement du middleware

`app/Http/Kernel.php` (Laravel 10) ou `bootstrap/app.php` (Laravel 11) :

```php
// Kernel.php
protected $middlewareAliases = [
    // ...
    'tourisme_lecteur' => \App\Http\Middleware\EnsureTourismeLecteur::class,
];
```

Adapter `EnsureTourismeLecteur` au systeme de roles reel (le fichier gere
`$user->hasRole('tourisme_lecteur')` ou `$user->role === 'tourisme_lecteur'`).
Le role `TOURISME_LECTEUR` doit etre **distinct** de `authority_user` (MI) et des
roles operateurs, avec MFA et session 15 min (§7) geres par la couche auth
existante.

## Planification de l'ETL (cron horaire)

`app/Console/Kernel.php` :

```php
protected function schedule(Schedule $schedule): void
{
    $schedule->job(new \App\Jobs\AggregateObservatoireJob())
             ->hourly()
             ->withoutOverlapping();
}
```

Backfill initial / recette : `php artisan observatoire:aggregate --debut=2025-01-01 --fin=2025-12-31`.

## Appels Claude (modules IA)

`ClaudeClient` utilise `ANTHROPIC_API_KEY` (meme secret que les scans) et
`OBSERVATOIRE_IA_MODEL` (defaut `claude-sonnet-5`). Les appels ne transmettent
que le schema agrege, les definitions, le pack de chiffres et la question — jamais
de donnee nominative (elle n'existe pas dans ce module). Voir `docs/reponse-inpdp.md`.

## Variables d'environnement

```
OBSERVATOIRE_RO_USER=observatoire_ro
OBSERVATOIRE_RO_PASSWORD=...
OBSERVATOIRE_IA_MODEL=claude-sonnet-5
ANTHROPIC_API_KEY=...            # deja present pour les scans
```

## Mise en service

```bash
php artisan migrate
php artisan db:seed --class=Database\\Seeders\\ObservatoireDemoSeeder   # MODE DEMO
php artisan observatoire:aggregate                                       # premier run reel
```

## Compte de test (recette du dashboard)

Pour tester le dashboard Observatoire avec le role `TOURISME_LECTEUR` :

```bash
php artisan migrate
php artisan db:seed --class=Database\\Seeders\\ObservatoireDemoSeeder      # donnees MODE DEMO
php artisan db:seed --class=Database\\Seeders\\ObservatoireTestUserSeeder   # compte de test
```

Identifiants par defaut (a changer, cf. `OBSERVATOIRE_TEST_EMAIL` /
`OBSERVATOIRE_TEST_PASSWORD`) :

| Champ | Valeur |
|---|---|
| e-mail | `tourisme.demo@qayed.tn` |
| mot de passe | `Observatoire2026!` |
| role | `tourisme_lecteur` |

Apres connexion, l'utilisateur est redirige vers `/observatoire/apercu`. Le
compte est cree **sans MFA** pour la recette ; en production, exiger l'enrolement
MFA au premier login et ne pas laisser ce compte actif.

> Ces identifiants ne fonctionnent QUE lorsque ce handoff backend a ete applique,
> migre et seede sur l'instance Railway, et que le middleware `tourisme_lecteur`
> est enregistre. Tant que le backend n'expose pas `/api/observatoire/v1/*`, le
> dashboard s'affiche mais les appels de donnees restent vides.

## A adapter au schema nominatif reel

`AggregationService` suppose `check_ins` (establishment_id, check_in_date,
check_out_date, status='validated'), `guests` (check_in_id, nationality_code) et
`establishments` (type, gouvernorat, delegation). Ajuster noms de tables/colonnes
si le backend differe — **la logique de seuil ne change jamais**.

# Handoff backend — Tracking des coûts IA (Claude vision)

Ce dossier contient le code **backend Laravel** à appliquer sur le dépôt Railway
(`checktunisia-backend`). Il n'est **pas** exécuté dans le dépôt frontend : ce
dernier ne contient ni ORM ni base. Les fichiers ci-dessous respectent les
conventions Laravel/Eloquent existantes (enveloppes `{ data: ... }`, guards admin
du MRR). Copiez-les aux emplacements miroirs du dépôt backend.

## Architecture retenue

```
[Web / Mobile] --scan--> [Fonction Vercel api/scan/cin.ts | mrz.ts]  (dépôt frontend)
                                   |  appelle Anthropic, mesure latence + tokens
                                   |  trackAiUsage() : POST metadata-only
                                   v
                         POST /internal/ai-usage  (secret de service)   (backend Laravel)
                                   |  AiUsageRecorder : calcule cost_usd au tarif ACTIF
                                   v
                         table ai_usage_events  (cost figé à l'insert)
                                   ^
[Admin dashboard] --GET--> /admin/ai-costs/*  +  /admin/ai-pricing   (mêmes guards que MRR)
```

- **Règle #4** : les tarifs vivent en base (`ai_pricing`), édités depuis l'admin,
  jamais hardcodés. Le coût est calculé côté backend au moment de l'insert.
- **Règle #3** : `ai_usage_events` ne contient aucune donnée voyageur. Le corps
  reçu par `/internal/ai-usage` est une liste blanche stricte de métadonnées.
- **Règle #5** : le tracking se déclenche dans la fonction qui appelle Anthropic ;
  le client web/mobile n'envoie rien de plus. `user_id` (l'opérateur hôtelier) est
  résolu côté serveur depuis le token porteur, jamais le voyageur.
- **Coût figé** : `cost_usd` est un snapshot du tarif du moment ; un changement de
  tarif ultérieur ne réécrit pas l'historique (les endpoints ne recalculent jamais).

## Fichiers

| Fichier | Emplacement backend |
|---|---|
| `database/migrations/..._create_ai_pricing_table.php` | `database/migrations/` |
| `database/migrations/..._create_ai_usage_events_table.php` | `database/migrations/` |
| `database/seeders/AiPricingSeeder.php` | `database/seeders/` (+ appel dans `DatabaseSeeder`) |
| `app/Models/AiPricing.php`, `AiUsageEvent.php` | `app/Models/` |
| `app/Services/AiUsageRecorder.php` | `app/Services/` |
| `app/Http/Controllers/Internal/AiUsageIngestController.php` | `app/Http/Controllers/Internal/` |
| `app/Http/Controllers/Admin/AiCostController.php`, `AiPricingController.php` | `app/Http/Controllers/Admin/` |
| `routes/ai-costs.php` | inclure depuis `routes/api.php` |

## À adapter selon le backend réel

1. **Types de clés étrangères** : la migration `ai_usage_events` suppose des PK
   `bigint` et des tables `establishments` / `users`. Si ce sont des UUID ou des
   noms différents, ajuster `foreignId`/`constrained`.
2. **Middlewares de rôle** : remplacer `role:platform_admin` / `role:super_admin`
   par les guards réellement utilisés pour le MRR et pour « l'admin le plus élevé ».
3. **Résolution `user_id`** : `AiUsageIngestController::resolveUserId()` suppose
   Sanctum (`PersonalAccessToken::findToken`). Adapter si JWT maison.
4. **Middleware `ai-tracking-secret`** : à créer — compare en `hash_equals` le
   bearer reçu avec `config('services.ai_tracking.secret')`.
5. **Audit** : `AiPricingController::update` appelle `activity()` (spatie) si
   disponible ; sinon retirer le bloc.
6. **SQL date** : les contrôleurs utilisent `created_at::date` (PostgreSQL). Sur
   MySQL, remplacer par `DATE(created_at)`.

## Variables d'environnement

**Backend Laravel** (`config/services.php` → `ai_tracking.secret`) :
- `INTERNAL_AI_TRACKING_SECRET` — secret partagé avec la fonction Vercel.

**Fonction Vercel** (dépôt frontend, déjà instrumenté) :
- `INTERNAL_AI_TRACKING_URL` — ex. `https://api.qayed.tn/api/v1/internal/ai-usage`
- `INTERNAL_AI_TRACKING_SECRET` — même valeur que côté backend.

Tant que ces deux variables ne sont pas définies côté Vercel, le tracking est un
**no-op silencieux** (aucun appel, zéro latence) : les scans fonctionnent
exactement comme avant. Le tracking s'active dès qu'elles sont renseignées.

## Mise en service

```bash
php artisan migrate
php artisan db:seed --class=Database\\Seeders\\AiPricingSeeder
```

Le seed crée une ligne pour le modèle courant (`CIN_SCAN_MODEL`, défaut
`claude-sonnet-5`) avec des **prix à 0**. Voir la section « Saisie des tarifs ».

## Saisie des tarifs — À FAIRE AVANT DE SE FIER AUX CHIFFRES

Les prix sont à **0** par défaut (placeholder). Tant qu'ils y restent :
- le widget dashboard et la page `/admin/ai-costs` affichent le bandeau ambre
  **« Tarifs non configurés — les coûts affichés sont faux »** ;
- tous les `cost_usd` valent 0.

Rendez-vous sur **/admin/ai-costs → section Tarifs**, saisissez les prix officiels
(USD par million de tokens, input et output) depuis la page pricing Anthropic pour
le modèle utilisé, confirmez. Seuls les **nouveaux** événements utiliseront le
nouveau tarif ; l'historique déjà enregistré n'est pas réécrit.

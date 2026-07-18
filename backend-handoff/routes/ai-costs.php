<?php

use App\Http\Controllers\Admin\AiCostController;
use App\Http\Controllers\Admin\AiPricingController;
use App\Http\Controllers\Internal\AiUsageIngestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes du tracking des couts IA — a inclure depuis routes/api.php
|--------------------------------------------------------------------------
|
| require __DIR__.'/ai-costs.php';   // dans routes/api.php, ou coller ces blocs.
|
| Adapter les noms de middleware a ceux deja utilises pour le MRR
| (ex. 'auth:sanctum', 'role:platform_admin', 'role:super_admin').
*/

// ── Admin : lecture des couts + tarifs. MEMES guards que les metriques MRR. ──
Route::middleware(['auth:sanctum', 'role:platform_admin'])
    ->prefix('admin')
    ->group(function () {
        Route::get('ai-costs/summary', [AiCostController::class, 'summary']);
        Route::get('ai-costs/by-establishment', [AiCostController::class, 'byEstablishment']);
        Route::get('ai-costs/daily', [AiCostController::class, 'daily']);

        Route::get('ai-pricing', [AiPricingController::class, 'index']);

        // Edition reservee au role admin le plus eleve.
        Route::middleware('role:super_admin')
            ->put('ai-pricing/{aiPricing}', [AiPricingController::class, 'update']);
    });

// ── Interne : ingestion depuis la fonction serverless Vercel. ──
// Auth par secret de service, PAS de session utilisateur. Le middleware
// 'ai-tracking-secret' doit comparer (hash_equals) le bearer avec
// config('services.ai_tracking.secret') === env('INTERNAL_AI_TRACKING_SECRET').
Route::middleware('ai-tracking-secret')
    ->post('internal/ai-usage', [AiUsageIngestController::class, 'store']);

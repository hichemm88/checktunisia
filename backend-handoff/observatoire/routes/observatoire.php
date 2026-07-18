<?php

use App\Http\Controllers\Observatoire\DashboardController;
use App\Http\Controllers\Observatoire\ExportController;
use App\Http\Controllers\Observatoire\IaController;
use App\Http\Controllers\Observatoire\RapportController;
use Illuminate\Support\Facades\Route;

/**
 * Routes API Observatoire — a inclure depuis routes/api.php :
 *   require __DIR__.'/observatoire.php';
 *
 * Toutes protegees par :
 *   - auth (sanctum / guard institutionnel Qayed),
 *   - middleware `tourisme_lecteur` (EnsureTourismeLecteur) — role DISTINCT,
 *   - session 15 min d'inactivite (§7, aligne portail autorite) geree cote auth.
 *
 * LECTURE SEULE (§8) : aucune route mutante hormis la generation de rapport
 * (qui n'ecrit que dans la base d'agregats, jamais dans le nominatif).
 */
Route::prefix('observatoire/v1')
    ->middleware(['auth:sanctum', 'tourisme_lecteur'])
    ->group(function () {

        // ── Dashboard (ecrans 1-3, 6) ──────────────────────────────────────────
        Route::get('kpis',               [DashboardController::class, 'kpis']);
        Route::get('series/arrivees',    [DashboardController::class, 'series']);
        Route::get('nationalites/top',   [DashboardController::class, 'topNationalites']);
        Route::get('types',              [DashboardController::class, 'types']);
        Route::get('zones/comparaison',  [DashboardController::class, 'comparaisonZones']);
        Route::get('zones',              [DashboardController::class, 'zones']);
        Route::get('saisonnalite',       [DashboardController::class, 'saisonnalite']);
        Route::get('couverture',         [DashboardController::class, 'couverture']);

        // ── Module IA 1 : NL -> SQL (ecran 4) ──────────────────────────────────
        Route::post('ia/question',       [IaController::class, 'question']);

        // ── Module IA 2 : rapports mensuels (ecran 5) ──────────────────────────
        Route::get('rapports',           [RapportController::class, 'index']);
        Route::post('rapports/generer',  [RapportController::class, 'generer']);
        Route::get('rapports/{mois}/pdf',[RapportController::class, 'pdf']);

        // ── Export (respecte le seuil) ─────────────────────────────────────────
        Route::get('export/csv',         [ExportController::class, 'csv']);
    });

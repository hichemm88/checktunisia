<?php

namespace App\Console\Commands;

use App\Services\Observatoire\AggregationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Lancement manuel de l'ETL Observatoire (backfill, recette).
 *
 *   php artisan observatoire:aggregate
 *   php artisan observatoire:aggregate --debut=2025-01-01 --fin=2025-12-31
 */
class ObservatoireAggregateCommand extends Command
{
    protected $signature = 'observatoire:aggregate {--debut=} {--fin=}';
    protected $description = "Agrege les fiches validees dans la base d'agregats (seuil k=10)";

    public function handle(AggregationService $service): int
    {
        $debut = $this->option('debut') ? Carbon::parse($this->option('debut')) : null;
        $fin   = $this->option('fin')   ? Carbon::parse($this->option('fin'))   : null;

        $this->info('Agregation Observatoire en cours...');
        $res = $service->run($debut, $fin);

        $this->table(
            ['run_id', 'cellules ecrites', 'cellules supprimees (< seuil)'],
            [[$res['run_id'], $res['cellules_ecrites'], $res['cellules_supprimees']]]
        );
        $this->info('Termine. Seuil k='.AggregationService::SEUIL_K.' applique.');

        return self::SUCCESS;
    }
}

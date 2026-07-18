<?php

namespace App\Jobs;

use App\Services\Observatoire\AggregationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

/**
 * Job d'agregation de l'Observatoire. Planifie toutes les heures (voir
 * routes/console.php / app/Console/Kernel.php dans le README). Idempotent :
 * re-executable sans doublon (UPSERT dans AggregationService).
 *
 * Le job ne recoit AUCUNE donnee en entree : il lit lui-meme la base nominative
 * cote serveur. Il n'expose rien, ne renvoie rien au client.
 */
class AggregateObservatoireJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 1; // le run se re-lance a l'heure suivante ; pas de retry agressif

    public function __construct(
        private ?string $debut = null,
        private ?string $fin = null,
    ) {}

    public function handle(AggregationService $service): void
    {
        $service->run(
            $this->debut ? Carbon::parse($this->debut) : null,
            $this->fin ? Carbon::parse($this->fin) : null,
        );
    }
}

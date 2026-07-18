<?php

namespace App\Http\Controllers\Observatoire;

use App\Http\Controllers\Controller;
use App\Services\Observatoire\Seuil;
use App\Services\Observatoire\StatsService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * GET /export/csv — export des agregats AFFICHES uniquement (regle #2 : respecte
 * le seuil). Aucune cellule « <seuil » n'est exportable : elle est ecartee.
 */
class ExportController extends Controller
{
    public function __construct(private StatsService $stats) {}

    public function csv(Request $r): StreamedResponse
    {
        $fin   = $r->query('fin')   ? Carbon::parse($r->query('fin'))   : Carbon::today();
        $debut = $r->query('debut') ? Carbon::parse($r->query('debut')) : $fin->copy()->subDays(29);
        $f = [
            'debut' => $debut->toDateString(), 'fin' => $fin->toDateString(),
            'zone'  => $r->query('zone'), 'nationalite' => $r->query('nationalite'),
        ];

        $lignes = $this->stats->topNationalites($f, 50);

        return response()->streamDownload(function () use ($lignes) {
            $out = fopen('php://output', 'w');
            // BOM UTF-8 pour Excel + accents/arabe.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['nationalite', 'arrivees', 'nuitees', 'duree_moyenne', 'variation_pct']);
            foreach ($lignes as $l) {
                // Une valeur masquee n'est jamais exportee : on saute la cellule.
                if (Seuil::estMasque($l['arrivees'])) continue;
                fputcsv($out, [
                    $l['nationalite_iso'],
                    $l['arrivees'],
                    Seuil::estMasque($l['nuitees']) ? '' : $l['nuitees'],
                    Seuil::estMasque($l['duree_moyenne']) ? '' : $l['duree_moyenne'],
                    $l['variation_pct'] ?? '',
                ]);
            }
            fclose($out);
        }, 'observatoire-nationalites.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}

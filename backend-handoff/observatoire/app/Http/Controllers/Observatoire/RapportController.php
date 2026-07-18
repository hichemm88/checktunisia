<?php

namespace App\Http\Controllers\Observatoire;

use App\Http\Controllers\Controller;
use App\Services\Observatoire\RapportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Module IA 2 — rapports narratifs mensuels (ecran 5).
 *
 * GET  /rapports?mois=YYYY-MM   — recupere un rapport deja genere (HTML AR+FR)
 * POST /rapports/generer        — declenche la generation (ou re-generation)
 * GET  /rapports/{mois}/pdf     — export PDF (meme moteur que les exports Qayed)
 *
 * Les rapports generes sont persistes (table observatoire.rapports, migration
 * fournie a part si besoin — ici stockage simple JSON+HTML).
 */
class RapportController extends Controller
{
    public function __construct(private RapportService $service) {}

    public function index(Request $r): JsonResponse
    {
        $mois = $r->query('mois', now()->subMonth()->format('Y-m'));

        $rapport = DB::connection('pgsql')->table('observatoire.rapports')
            ->where('mois', $mois)->first();

        if (!$rapport) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => [
            'mois'      => $rapport->mois,
            'html_ar'   => $rapport->html_ar,
            'html_fr'   => $rapport->html_fr,
            'pack'      => json_decode($rapport->pack, true),
            'genere_le' => $rapport->genere_le,
        ]]);
    }

    public function generer(Request $r): JsonResponse
    {
        $mois = $r->input('mois', now()->subMonth()->format('Y-m'));

        $res = $this->service->rediger($mois);

        DB::connection('pgsql')->table('observatoire.rapports')->upsert([[
            'mois'      => $mois,
            'html_ar'   => $res['ar'],
            'html_fr'   => $res['fr'],
            'pack'      => json_encode($res['pack'], JSON_UNESCAPED_UNICODE),
            'genere_le' => now(),
        ]], ['mois'], ['html_ar', 'html_fr', 'pack', 'genere_le']);

        return response()->json(['data' => [
            'mois'    => $mois,
            'html_ar' => $res['ar'],
            'html_fr' => $res['fr'],
            'pack'    => $res['pack'],
        ]]);
    }

    /**
     * Export PDF. Reutiliser le meme moteur PDF que les exports existants de
     * Qayed (§8) — ex. barryvdh/laravel-dompdf. En-tete encre nuit, sceau قيد a
     * -6deg, pied de page « Statistiques agregees anonymes — Observatoire Qayed ».
     */
    public function pdf(Request $r, string $mois)
    {
        $rapport = DB::connection('pgsql')->table('observatoire.rapports')
            ->where('mois', $mois)->firstOrFail();

        $pack = json_decode($rapport->pack, true);

        // Adapter au moteur PDF reel du backend Qayed :
        //   $pdf = Pdf::loadView('observatoire.rapport_pdf', compact('rapport', 'pack'));
        //   return $pdf->download("observatoire-$mois.pdf");
        return view('observatoire.rapport_pdf', [
            'rapport' => $rapport,
            'pack'    => $pack,
        ]);
    }
}

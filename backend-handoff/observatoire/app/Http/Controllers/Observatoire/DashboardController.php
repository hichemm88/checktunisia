<?php

namespace App\Http\Controllers\Observatoire;

use App\Http\Controllers\Controller;
use App\Services\Observatoire\Seuil;
use App\Services\Observatoire\StatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * API Observatoire — endpoints de lecture du dashboard (ecrans 1-3, 6).
 * Prefixe /api/observatoire/v1, role TOURISME_LECTEUR (voir routes/observatoire.php).
 *
 * Enveloppe { data: ... } conforme au reste du backend Qayed. Le seuil k=10 est
 * TOUJOURS applique cote serveur (StatsService), jamais cote client.
 */
class DashboardController extends Controller
{
    public function __construct(private StatsService $stats) {}

    private function filtres(Request $r): array
    {
        $fin   = $r->query('fin')   ? Carbon::parse($r->query('fin'))   : Carbon::today();
        $debut = $r->query('debut') ? Carbon::parse($r->query('debut')) : $fin->copy()->subDays(29);

        return [
            'debut'       => $debut->toDateString(),
            'fin'         => $fin->toDateString(),
            'zone'        => $r->query('zone'),
            'nationalite' => $r->query('nationalite') ? strtoupper($r->query('nationalite')) : null,
        ];
    }

    /** GET /kpis */
    public function kpis(Request $r): JsonResponse
    {
        $f = $this->filtres($r);
        $courant = $this->stats->kpis($f);
        $precedent = $this->stats->kpis($this->stats->periodePrecedente($f));

        return response()->json(['data' => [
            'periode'   => ['debut' => $f['debut'], 'fin' => $f['fin']],
            'kpis'      => $courant,
            'precedent' => $precedent,
            'seuil_k'   => Seuil::K,
        ]]);
    }

    /** GET /series/arrivees?granularite=jour|semaine|mois */
    public function series(Request $r): JsonResponse
    {
        $f = $this->filtres($r);
        $gran = in_array($r->query('granularite'), ['jour', 'semaine', 'mois'], true)
            ? $r->query('granularite')
            : $this->granulariteAuto($f);

        return response()->json(['data' => [
            'granularite' => $gran,
            'points'      => $this->stats->serie($f, $gran),
        ]]);
    }

    /** GET /nationalites/top?limit= */
    public function topNationalites(Request $r): JsonResponse
    {
        $f = $this->filtres($r);
        $limit = min((int) $r->query('limit', 10), 50);
        return response()->json(['data' => $this->stats->topNationalites($f, $limit)]);
    }

    /** GET /types — repartition par type d'etablissement */
    public function types(Request $r): JsonResponse
    {
        return response()->json(['data' => $this->stats->parType($this->filtres($r))]);
    }

    /** GET /zones/comparaison */
    public function comparaisonZones(Request $r): JsonResponse
    {
        return response()->json(['data' => $this->stats->comparaisonZones($this->filtres($r))]);
    }

    /** GET /saisonnalite?annee= */
    public function saisonnalite(Request $r): JsonResponse
    {
        $annee = (int) $r->query('annee', now()->year);
        return response()->json(['data' => [
            'annee'  => $annee,
            'zones'  => $this->stats->saisonnalite($annee),
        ]]);
    }

    /** GET /couverture — a afficher en permanence */
    public function couverture(): JsonResponse
    {
        return response()->json(['data' => $this->stats->couverture()]);
    }

    /** GET /zones — liste des zones (selecteurs) */
    public function zones(): JsonResponse
    {
        return response()->json(['data' => $this->stats->zones()]);
    }

    private function granulariteAuto(array $f): string
    {
        $jours = Carbon::parse($f['debut'])->diffInDays(Carbon::parse($f['fin']));
        if ($jours <= 31)  return 'jour';
        if ($jours <= 120) return 'semaine';
        return 'mois';
    }
}

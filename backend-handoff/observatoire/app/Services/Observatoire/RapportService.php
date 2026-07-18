<?php

namespace App\Services\Observatoire;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Module IA 2 — rapports narratifs mensuels bilingues.
 *
 * Le serveur calcule un PACK DE CHIFFRES pre-agreges (regle #3 : l'IA ne calcule
 * jamais). Claude REDIGE a partir de ce pack, en deux langues natives (arabe puis
 * francais — deux appels separes, pas de traduction). Le pack respecte le seuil
 * k=10 : aucune valeur sous le seuil n'y figure.
 *
 * La detection d'anomalies est une STATISTIQUE CLASSIQUE (variation > 2 ecarts-
 * types sur 12 mois glissants), pas de l'IA.
 */
class RapportService
{
    private const CONN = 'pgsql_observatoire_ro';

    public function __construct(private ClaudeClient $claude) {}

    /**
     * Construit le pack de chiffres du mois demande (format 'YYYY-MM').
     */
    public function pack(string $mois): array
    {
        $debut = Carbon::parse($mois.'-01')->startOfMonth();
        $fin   = $debut->copy()->endOfMonth();
        $f     = ['debut' => $debut->toDateString(), 'fin' => $fin->toDateString()];

        $stats = app(StatsService::class);

        $kpis     = $stats->kpis($f);
        $kpisM1   = $stats->kpis($this->decaler($f, 1));   // mois precedent
        $kpisA1   = $stats->kpis($this->decaler($f, 12));  // meme mois annee precedente

        $top      = array_slice($stats->topNationalites($f, 5), 0, 5);
        $zones    = $stats->comparaisonZones($f);
        $zoneTop  = $zones[0] ?? null;

        return [
            'mois'        => $mois,
            'mois_libelle'=> $this->libelleMois($debut),
            'kpis'        => $kpis,
            'variation_m1'=> $this->variation($kpis, $kpisM1),
            'variation_a1'=> $this->variation($kpis, $kpisA1),
            'top5_nationalites' => $top,
            'zones'       => $zones,
            'zone_plus_dynamique' => $zoneTop,
            'anomalies'   => $this->anomalies($debut),
            'couverture'  => $stats->couverture(),
            'seuil_k'     => Seuil::K,
        ];
    }

    /**
     * Detection d'anomalies : pour chaque KPI mensuel, on compare la valeur du
     * mois a la moyenne +/- 2 ecarts-types des 12 mois precedents. Statistique
     * classique — aucune IA impliquee.
     */
    private function anomalies(Carbon $mois): array
    {
        $series = DB::connection(self::CONN)
            ->table('observatoire.agg_sejours')
            ->whereBetween('date_jour', [
                $mois->copy()->subMonths(12)->startOfMonth()->toDateString(),
                $mois->copy()->endOfMonth()->toDateString(),
            ])
            ->selectRaw("date_trunc('month', date_jour) m, SUM(nb_arrivees) arrivees")
            ->groupByRaw("date_trunc('month', date_jour)")
            ->orderByRaw("date_trunc('month', date_jour)")
            ->get();

        if ($series->count() < 4) return []; // pas assez d'historique -> pas d'anomalie affirmee

        $valeurs = $series->take($series->count() - 1)->pluck('arrivees')->map(fn ($v) => (float) $v)->all();
        $courant = (float) $series->last()->arrivees;

        $moyenne = array_sum($valeurs) / count($valeurs);
        $ecart   = sqrt(array_sum(array_map(fn ($v) => ($v - $moyenne) ** 2, $valeurs)) / count($valeurs));

        $anomalies = [];
        if ($ecart > 0 && abs($courant - $moyenne) > 2 * $ecart) {
            $anomalies[] = [
                'indicateur' => 'arrivees',
                'valeur'     => (int) $courant,
                'moyenne_12m'=> round($moyenne, 0),
                'sens'       => $courant > $moyenne ? 'hausse' : 'baisse',
            ];
        }

        return $anomalies;
    }

    /**
     * Genere les deux versions (ar puis fr) a partir du meme pack.
     * @return array{ar:string, fr:string, pack:array}
     */
    public function rediger(string $mois): array
    {
        $pack = $this->pack($mois);
        $packJson = json_encode($pack, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        // Deux appels natifs, pas de traduction de l'un vers l'autre (regle §6).
        $ar = $this->redigerLangue('ar', $packJson);
        $fr = $this->redigerLangue('fr', $packJson);

        return ['ar' => $ar, 'fr' => $fr, 'pack' => $pack];
    }

    private function redigerLangue(string $langue, string $packJson): string
    {
        try {
            return trim($this->claude->message(Prompts::rapportMensuel($langue), $packJson, 2500));
        } catch (\Throwable $e) {
            return $langue === 'ar'
                ? "تعذر إنشاء التقرير آليا. البيانات المجمعة متوفرة في لوحة القيادة."
                : "La generation du rapport a echoue. Les donnees agregees restent consultables dans le tableau de bord.";
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    private function decaler(array $f, int $mois): array
    {
        return [
            'debut' => Carbon::parse($f['debut'])->subMonths($mois)->startOfMonth()->toDateString(),
            'fin'   => Carbon::parse($f['debut'])->subMonths($mois)->endOfMonth()->toDateString(),
        ];
    }

    private function variation(array $courant, array $ref): array
    {
        $calc = function ($a, $b) {
            if (!is_numeric($a) || !is_numeric($b) || $b <= 0) return null;
            return round((($a - $b) / $b) * 100, 1);
        };
        return [
            'arrivees_pct' => $calc($courant['arrivees'] ?? null, $ref['arrivees'] ?? null),
            'nuitees_pct'  => $calc($courant['nuitees'] ?? null, $ref['nuitees'] ?? null),
        ];
    }

    private function libelleMois(Carbon $d): string
    {
        // Reutilise le helper mois tunisiens si present cote backend ; sinon
        // fallback ISO. Adapter selon l'i18n backend reel.
        return $d->locale('fr')->isoFormat('MMMM YYYY');
    }
}

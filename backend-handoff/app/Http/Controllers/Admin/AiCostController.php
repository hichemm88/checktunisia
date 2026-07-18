<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiPricing;
use App\Models\AiUsageEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Endpoints admin de lecture des couts IA (etape 3). A placer sous le namespace
 * admin existant, avec les MEMES guards que les metriques MRR (auth:sanctum +
 * middleware role platform_admin). Montants en USD, en chaine decimale comme le MRR.
 *
 * Note SQL : les fragments de date ci-dessous sont ecrits pour PostgreSQL
 * (created_at::date). Sur MySQL, remplacer par DATE(created_at).
 */
class AiCostController extends Controller
{
    private const FEATURES = ['cin_scan', 'passport_scan'];

    /** GET /admin/ai-costs/summary?period=current_month|last_month|last_30d */
    public function summary(Request $request): JsonResponse
    {
        $period = $this->period($request);
        [$from, $to] = $this->range($period);

        $rows = AiUsageEvent::query()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('feature, status,
                COUNT(*) as n,
                COALESCE(SUM(input_tokens),0) as in_tok,
                COALESCE(SUM(output_tokens),0) as out_tok,
                COALESCE(SUM(cost_usd),0) as cost')
            ->groupBy('feature', 'status')
            ->get();

        $features = [];
        $totalCost = 0.0;
        foreach (self::FEATURES as $feature) {
            $sub = $rows->where('feature', $feature);
            $success = (int) $sub->where('status', 'success')->sum('n');
            $apiErr = (int) $sub->where('status', 'api_error')->sum('n');
            $parseErr = (int) $sub->where('status', 'parse_error')->sum('n');
            $cost = (float) $sub->sum('cost');
            $inTok = (int) $sub->sum('in_tok');
            $outTok = (int) $sub->sum('out_tok');
            $totalCost += $cost;

            $features[] = [
                'feature' => $feature,
                'success_count' => $success,
                'api_error_count' => $apiErr,
                'parse_error_count' => $parseErr,
                'cost_usd' => number_format($cost, 6, '.', ''),
                'avg_cost_per_success_usd' => number_format($success > 0 ? $cost / $success : 0, 6, '.', ''),
                'input_tokens' => $inTok,
                'output_tokens' => $outTok,
            ];
        }

        return response()->json([
            'data' => [
                'period' => $period,
                'total_cost_usd' => number_format($totalCost, 6, '.', ''),
                'features' => $features,
                'pricing_configured' => $this->pricingConfigured(),
            ],
        ]);
    }

    /** GET /admin/ai-costs/by-establishment?period=...&feature=all|cin_scan|passport_scan */
    public function byEstablishment(Request $request): JsonResponse
    {
        $period = $this->period($request);
        [$from, $to] = $this->range($period);
        $feature = $this->feature($request);

        $q = AiUsageEvent::query()
            ->from('ai_usage_events as e')
            ->leftJoin('establishments as est', 'est.id', '=', 'e.establishment_id')
            ->whereBetween('e.created_at', [$from, $to]);

        if ($feature !== 'all') {
            $q->where('e.feature', $feature);
        }

        $rows = $q->selectRaw("
                e.establishment_id,
                est.name as establishment_name,
                COALESCE(SUM(CASE WHEN e.feature = 'cin_scan'      AND e.status = 'success' THEN 1 ELSE 0 END),0) as cin_scans,
                COALESCE(SUM(CASE WHEN e.feature = 'passport_scan' AND e.status = 'success' THEN 1 ELSE 0 END),0) as passport_scans,
                COALESCE(SUM(e.input_tokens),0)  as input_tokens,
                COALESCE(SUM(e.output_tokens),0) as output_tokens,
                COALESCE(SUM(e.cost_usd),0)      as cost_usd
            ")
            ->groupBy('e.establishment_id', 'est.name')
            ->orderByDesc('cost_usd')
            ->get()
            ->map(function ($r) {
                $scans = (int) $r->cin_scans + (int) $r->passport_scans;
                $cost = (float) $r->cost_usd;
                return [
                    'establishment_id' => (string) $r->establishment_id,
                    'establishment_name' => $r->establishment_name,
                    'cin_scans' => (int) $r->cin_scans,
                    'passport_scans' => (int) $r->passport_scans,
                    'input_tokens' => (int) $r->input_tokens,
                    'output_tokens' => (int) $r->output_tokens,
                    'cost_usd' => number_format($cost, 6, '.', ''),
                    'avg_cost_per_scan_usd' => number_format($scans > 0 ? $cost / $scans : 0, 6, '.', ''),
                ];
            });

        return response()->json(['data' => $rows]);
    }

    /** GET /admin/ai-costs/daily?days=30&feature=all|cin_scan|passport_scan */
    public function daily(Request $request): JsonResponse
    {
        $days = max(1, min(90, (int) $request->query('days', 30)));
        $feature = $this->feature($request);
        $from = now()->subDays($days - 1)->startOfDay();
        $to = now()->endOfDay();

        $q = AiUsageEvent::query()
            ->whereBetween('created_at', [$from, $to])
            ->where('status', 'success');
        if ($feature !== 'all') {
            $q->where('feature', $feature);
        }

        $rows = $q->selectRaw("
                created_at::date as d,
                feature,
                COUNT(*) as n,
                COALESCE(SUM(cost_usd),0) as cost
            ")
            ->groupByRaw('created_at::date, feature')
            ->get();

        // Serie continue jour par jour (0 pour les jours sans donnee).
        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $date = now()->subDays($days - 1 - $i)->toDateString();
            $slice = $rows->filter(fn ($r) => Carbon::parse($r->d)->toDateString() === $date);
            $cin = $slice->firstWhere('feature', 'cin_scan');
            $pass = $slice->firstWhere('feature', 'passport_scan');
            $out[] = [
                'date' => $date,
                'cin_cost_usd' => number_format((float) ($cin->cost ?? 0), 6, '.', ''),
                'passport_cost_usd' => number_format((float) ($pass->cost ?? 0), 6, '.', ''),
                'cin_count' => (int) ($cin->n ?? 0),
                'passport_count' => (int) ($pass->n ?? 0),
            ];
        }

        return response()->json(['data' => $out]);
    }

    private function period(Request $request): string
    {
        $p = (string) $request->query('period', 'current_month');
        return in_array($p, ['current_month', 'last_month', 'last_30d'], true) ? $p : 'current_month';
    }

    private function feature(Request $request): string
    {
        $f = (string) $request->query('feature', 'all');
        return in_array($f, ['all', 'cin_scan', 'passport_scan'], true) ? $f : 'all';
    }

    /** @return array{0:Carbon,1:Carbon} */
    private function range(string $period): array
    {
        return match ($period) {
            'last_month' => [now()->subMonthNoOverflow()->startOfMonth(), now()->subMonthNoOverflow()->endOfMonth()],
            'last_30d' => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }

    /** true seulement si au moins un tarif actif existe et aucun n'est a 0. */
    private function pricingConfigured(): bool
    {
        $activeCount = AiPricing::where('active', true)->count();
        if ($activeCount === 0) {
            return false;
        }
        $zeroCount = AiPricing::where('active', true)
            ->where(function ($q) {
                $q->where('input_price_per_mtok_usd', '<=', 0)
                  ->orWhere('output_price_per_mtok_usd', '<=', 0);
            })
            ->count();

        return $zeroCount === 0;
    }
}

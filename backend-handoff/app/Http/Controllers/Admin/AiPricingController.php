<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiPricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lecture et edition des tarifs IA (etape 3, endpoints 4).
 *
 * - index  : lisible par tout admin (memes guards que le MRR).
 * - update : reserve au role admin le PLUS ELEVE. Voir le middleware sur la route
 *            (routes/ai-costs.php). Un log d'audit est ecrit si un systeme d'audit
 *            existe deja (ex. spatie/activitylog) — adapter l'appel `activity()`.
 */
class AiPricingController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = AiPricing::orderBy('model')->get()->map(fn (AiPricing $p) => $this->present($p));

        return response()->json(['data' => $rows]);
    }

    public function update(Request $request, AiPricing $aiPricing): JsonResponse
    {
        $validated = $request->validate([
            'input_price_per_mtok_usd' => ['required', 'numeric', 'min:0'],
            'output_price_per_mtok_usd' => ['required', 'numeric', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $before = $aiPricing->only(['input_price_per_mtok_usd', 'output_price_per_mtok_usd', 'active']);

        $aiPricing->fill($validated);
        $aiPricing->updated_at = now();
        $aiPricing->save();

        // Log d'audit si disponible. Le tracking cout etant sensible (impacte la
        // facturation interne), on trace qui a change quoi. Commenter si absent.
        if (function_exists('activity')) {
            activity('ai_pricing')
                ->causedBy($request->user())
                ->performedOn($aiPricing)
                ->withProperties(['before' => $before, 'after' => $validated])
                ->log('ai_pricing_updated');
        }

        return response()->json(['data' => $this->present($aiPricing->refresh())]);
    }

    private function present(AiPricing $p): array
    {
        return [
            'id' => (string) $p->id,
            'model' => $p->model,
            'input_price_per_mtok_usd' => number_format((float) $p->input_price_per_mtok_usd, 4, '.', ''),
            'output_price_per_mtok_usd' => number_format((float) $p->output_price_per_mtok_usd, 4, '.', ''),
            'active' => (bool) $p->active,
            'updated_at' => optional($p->updated_at)->toIso8601String(),
        ];
    }
}

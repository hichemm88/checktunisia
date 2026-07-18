<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\AiUsageEvent;
use App\Models\PersonalAccessToken; // Sanctum ; adapter si JWT
use App\Services\AiUsageRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * POST /internal/ai-usage
 *
 * Endpoint interne appele par la fonction serverless Vercel (scan CIN / repli
 * passeport) apres chaque appel a Anthropic. Authentifie par un secret de service
 * partage (INTERNAL_AI_TRACKING_SECRET), PAS par une session utilisateur.
 *
 * Le corps ne contient QUE des metadonnees (regle #3). L'operateur (user_id) est
 * resolu ici, cote serveur, depuis le token porteur transmis dans X-Actor-Token
 * (jamais le voyageur). Le client web/mobile n'envoie rien de plus (regle #5).
 *
 * Protection a brancher via middleware sur la route (voir routes/ai-costs.php) :
 * comparaison hash_equals du bearer avec config('services.ai_tracking.secret').
 */
class AiUsageIngestController extends Controller
{
    public function store(Request $request, AiUsageRecorder $recorder): JsonResponse
    {
        $validated = $request->validate([
            'feature' => ['required', Rule::in(AiUsageEvent::FEATURES)],
            'establishment_id' => ['required'],
            'model' => ['required', 'string', 'max:120'],
            'input_tokens' => ['required', 'integer', 'min:0'],
            'output_tokens' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in(AiUsageEvent::STATUSES)],
            'latency_ms' => ['required', 'integer', 'min:0'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        // Resolution best-effort de l'operateur depuis le token porteur (Sanctum).
        // Aucune erreur ne doit remonter : si non resoluble -> user_id null.
        $validated['user_id'] = $this->resolveUserId($request->header('X-Actor-Token'));

        // Verrou d'integrite : l'etablissement doit exister ; sinon on ignore
        // silencieusement (l'insert ne doit jamais faire echouer le scan cote Vercel).
        try {
            $recorder->record($validated);
        } catch (\Throwable $e) {
            Log::warning('ai_usage_ingest_failed', ['error' => $e->getMessage()]);
            // 202 : accepte mais non enregistre. Le cote Vercel avale de toute facon.
            return response()->json(['data' => ['recorded' => false]], 202);
        }

        return response()->json(['data' => ['recorded' => true]], 201);
    }

    private function resolveUserId(?string $actorToken): ?int
    {
        if (! $actorToken) {
            return null;
        }
        try {
            $token = PersonalAccessToken::findToken($actorToken);
            return $token?->tokenable_id ? (int) $token->tokenable_id : null;
        } catch (\Throwable) {
            return null;
        }
    }
}

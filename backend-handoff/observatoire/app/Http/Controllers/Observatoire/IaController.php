<?php

namespace App\Http\Controllers\Observatoire;

use App\Http\Controllers\Controller;
use App\Services\Observatoire\IaQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Module IA 1 — interrogation en langage naturel (ecran 4).
 * POST /api/observatoire/v1/ia/question
 */
class IaController extends Controller
{
    public function __construct(private IaQueryService $service) {}

    public function question(Request $r): JsonResponse
    {
        $data = $r->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        $uid = optional($r->user())->id;

        $res = $this->service->poser($data['question'], $uid ? (int) $uid : null);

        return response()->json(['data' => $res]);
    }
}

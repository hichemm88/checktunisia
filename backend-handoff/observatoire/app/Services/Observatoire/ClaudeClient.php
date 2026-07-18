<?php

namespace App\Services\Observatoire;

use Illuminate\Support\Facades\Http;

/**
 * Enveloppe minimale des appels a l'API Claude pour l'Observatoire.
 *
 * Regle #5 : les appels ne transmettent QUE des agregats anonymes (schema,
 * definitions, pack de chiffres) et la question utilisateur. Jamais de donnee
 * nominative — par construction, elle n'existe pas dans ce module.
 *
 * A brancher sur le meme secret Anthropic que les fonctions de scan
 * (ANTHROPIC_API_KEY). Modele par defaut alignable via OBSERVATOIRE_IA_MODEL.
 */
class ClaudeClient
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = (string) config('services.anthropic.key', env('ANTHROPIC_API_KEY', ''));
        $this->model  = (string) env('OBSERVATOIRE_IA_MODEL', 'claude-sonnet-5');
    }

    /**
     * Un appel simple systeme + utilisateur, retour texte brut.
     */
    public function message(string $systemPrompt, string $userText, int $maxTokens = 1500): string
    {
        $resp = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
            'model'      => $this->model,
            'max_tokens' => $maxTokens,
            'system'     => $systemPrompt,
            'messages'   => [
                ['role' => 'user', 'content' => $userText],
            ],
        ]);

        $resp->throw();

        // Concatene les blocs texte de la reponse.
        return collect($resp->json('content', []))
            ->where('type', 'text')
            ->pluck('text')
            ->implode('');
    }
}

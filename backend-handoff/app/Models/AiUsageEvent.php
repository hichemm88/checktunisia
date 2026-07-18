<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiUsageEvent extends Model
{
    protected $table = 'ai_usage_events';

    // Seule created_at existe (pas de updated_at).
    const UPDATED_AT = null;

    protected $fillable = [
        'establishment_id',
        'user_id',
        'feature',
        'model',
        'input_tokens',
        'output_tokens',
        'cost_usd',
        'status',
        'latency_ms',
        'created_at',
    ];

    protected $casts = [
        'input_tokens' => 'integer',
        'output_tokens' => 'integer',
        'cost_usd' => 'decimal:6',
        'latency_ms' => 'integer',
        'created_at' => 'datetime',
    ];

    public const FEATURES = ['cin_scan', 'passport_scan'];
    public const STATUSES = ['success', 'api_error', 'parse_error'];
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tarifs IA editables par modele (etape 1). Meme principe que les prix des plans :
 * les tarifs vivent en base et sont edites depuis l'admin, jamais hardcodes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_pricing', function (Blueprint $table) {
            $table->id();
            $table->string('model')->unique();                       // ex. claude-sonnet-5
            $table->decimal('input_price_per_mtok_usd', 10, 4)->default(0);  // USD / million tokens input
            $table->decimal('output_price_per_mtok_usd', 10, 4)->default(0); // USD / million tokens output
            $table->boolean('active')->default(true);
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_pricing');
    }
};

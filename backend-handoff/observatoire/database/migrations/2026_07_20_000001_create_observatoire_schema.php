<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Regle NON NEGOCIABLE #1 — Etancheite absolue.
 *
 * L'Observatoire du Tourisme vit dans un SCHEMA PostgreSQL physiquement distinct
 * (`observatoire`) du schema operationnel nominatif (`public`). Aucune cle
 * etrangere, aucune vue, aucun trigger ne traverse la frontiere : le seul pont
 * autorise est le job d'agregation (AggregationService), qui lit `public` et
 * ecrit `observatoire` en SENS UNIQUE, sans jamais recopier le moindre
 * identifiant personnel.
 *
 * Le role PostgreSQL utilise par l'API et par le module IA (voir README, section
 * « Utilisateur lecteur ») n'a le droit de SELECT que sur ce schema — il ne peut
 * pas meme nommer une table du schema `public`.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS observatoire');
    }

    public function down(): void
    {
        // CASCADE volontairement omis : on refuse de detruire des donnees par megarde.
        DB::statement('DROP SCHEMA IF EXISTS observatoire RESTRICT');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modele de donnees de la base d'agregats (schema `observatoire`).
 *
 * Regle NON NEGOCIABLE #2 (seuil k=10) : ce schema ne stocke QUE des cellules
 * dont le volume de sejours est >= 10. Les cellules sous le seuil ne sont pas
 * ecrites (l'ETL les supprime avant insertion) — elles n'existent donc jamais,
 * ni en base ni a l'export.
 *
 * INTERDICTION ABSOLUE : aucune colonne nom, prenom, numero de document, date de
 * naissance, adresse, telephone, e-mail. Le grain le plus fin est la delegation
 * (jamais de geolocalisation), la nationalite (code ISO) et le type
 * d'etablissement. Aucun identifiant d'etablissement individuel n'est stocke
 * dans la table de faits (seule la zone agregee l'est).
 */
return new class extends Migration {
    // Toutes les tables vivent dans le schema `observatoire`.
    private string $schema = 'observatoire';

    public function up(): void
    {
        // ── Dimension zones (delegation = grain geographique le plus fin) ──────
        Schema::create("{$this->schema}.dim_zones", function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('nom_fr', 100);
            $table->string('nom_ar', 100);
            $table->string('gouvernorat', 50);
            $table->string('delegation', 50);
            $table->boolean('demo')->default(false); // zone synthetique MODE DEMO
            $table->unique(['gouvernorat', 'delegation']);
        });

        // ── Table de faits : jour x zone x nationalite x type d'etablissement ──
        Schema::create("{$this->schema}.agg_sejours", function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->date('date_jour');
            $table->unsignedSmallInteger('zone_id');
            $table->char('nationalite_iso', 2);          // ISO 3166-1 alpha-2
            $table->string('type_etablissement', 30);    // maison_hotes, dar, location, hotel...

            $table->unsignedInteger('nb_arrivees');
            $table->unsignedInteger('nb_departs');
            $table->unsignedInteger('nb_presents');       // nuitees (voyageurs presents ce jour)
            $table->decimal('somme_duree_sejour_terminee', 12, 2)->nullable();
            $table->unsignedInteger('nb_sejours_termines')->nullable();

            // Cle metier idempotente (regle stack #8 : UPSERT, jamais de doublon).
            $table->unique(
                ['date_jour', 'zone_id', 'nationalite_iso', 'type_etablissement'],
                'agg_sejours_grain_unique'
            );

            // FK interne au schema observatoire uniquement — jamais vers `public`.
            $table->foreign('zone_id')->references('id')->on("{$this->schema}.dim_zones");

            $table->index('date_jour');
            $table->index(['nationalite_iso', 'date_jour']);
            $table->index(['zone_id', 'date_jour']);
        });

        // ── Couverture / representativite (affichee en permanence) ─────────────
        Schema::create("{$this->schema}.agg_couverture", function (Blueprint $table) {
            $table->date('date_jour')->primary();
            $table->unsignedInteger('nb_etablissements_actifs'); // >= 1 fiche sur 30j glissants
            $table->unsignedInteger('nb_etablissements_total');  // inscrits sur la plateforme
            $table->unsignedInteger('nb_zones_couvertes');
        });

        // ── Journal des executions de l'ETL (tracabilite du seuil) ─────────────
        Schema::create("{$this->schema}.agg_run_log", function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->timestampTz('demarre_le');
            $table->timestampTz('termine_le')->nullable();
            $table->date('date_debut_traitee')->nullable();
            $table->date('date_fin_traitee')->nullable();
            $table->unsignedInteger('lignes_source_lues')->default(0);
            $table->unsignedInteger('cellules_ecrites')->default(0);
            $table->unsignedInteger('cellules_supprimees_seuil')->default(0);
            $table->string('statut', 20)->default('ok'); // ok | erreur
            $table->text('message')->nullable();
        });

        // ── Rapports mensuels generes (module IA 2, HTML AR+FR + pack fige) ────
        Schema::create("{$this->schema}.rapports", function (Blueprint $table) {
            $table->string('mois', 7)->primary(); // 'YYYY-MM'
            $table->longText('html_ar')->nullable();
            $table->longText('html_fr')->nullable();
            $table->jsonb('pack');                 // pack de chiffres fige a la generation
            $table->timestampTz('genere_le');
        });

        // ── Journal des requetes IA (regle #3 : chaque chiffre est tracable) ──
        Schema::create("{$this->schema}.ia_query_log", function (Blueprint $table) {
            $table->uuid('query_id')->primary();
            $table->timestampTz('timestamp');
            $table->text('question_utilisateur');
            $table->text('sql_genere')->nullable();
            $table->boolean('sql_valide');
            $table->string('refus_motif', 60)->nullable(); // nominatif | hors_perimetre | sous_seuil | sql_invalide
            $table->unsignedInteger('resultat_lignes')->nullable();
            $table->unsignedInteger('duree_ms')->nullable();
            $table->unsignedBigInteger('utilisateur_id')->nullable(); // compte TOURISME_LECTEUR, jamais un voyageur
            $table->index('timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("{$this->schema}.rapports");
        Schema::dropIfExists("{$this->schema}.ia_query_log");
        Schema::dropIfExists("{$this->schema}.agg_run_log");
        Schema::dropIfExists("{$this->schema}.agg_couverture");
        Schema::dropIfExists("{$this->schema}.agg_sejours");
        Schema::dropIfExists("{$this->schema}.dim_zones");
    }
};

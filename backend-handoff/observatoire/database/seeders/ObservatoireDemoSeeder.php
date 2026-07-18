<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seed de DEMONSTRATION (§8) — 12 mois, ~5 zones, 15 nationalites, plusieurs
 * types d'etablissement. Genere directement dans la base d'agregats, TOUJOURS
 * >= seuil k=10 (donnees synthetiques realistes, jamais nominatives).
 *
 * IMPORTANT : ces donnees sont marquees MODE DEMO. Le frontend affiche un
 * bandeau explicite tant que le MODE DEMO est actif. A ne jamais confondre avec
 * les agregats reels produits par l'ETL.
 *
 * Deterministe : pas d'aleatoire non borne, seed fixe -> resultats reproductibles
 * pour les presentations ministerielles.
 */
class ObservatoireDemoSeeder extends Seeder
{
    private const TYPES = ['maison_hotes', 'dar', 'location', 'hotel'];

    private const NATIONALITES = ['FR', 'DE', 'IT', 'GB', 'BE', 'NL', 'ES', 'US', 'CA', 'DZ', 'LY', 'CH', 'SE', 'PL', 'RU'];

    /** Zones fictives (Medina de Tunis reelle + 4 synthetiques). */
    private const ZONES = [
        ['nom_fr' => 'Medina de Tunis', 'nom_ar' => 'مدينة تونس العتيقة', 'gouvernorat' => 'Tunis',     'delegation' => 'Medina',       'demo' => false],
        ['nom_fr' => 'Sidi Bou Said',   'nom_ar' => 'سيدي بوسعيد',        'gouvernorat' => 'Tunis',     'delegation' => 'Carthage',     'demo' => true],
        ['nom_fr' => 'Hammamet',        'nom_ar' => 'الحمامات',           'gouvernorat' => 'Nabeul',    'delegation' => 'Hammamet',     'demo' => true],
        ['nom_fr' => 'Djerba',          'nom_ar' => 'جربة',               'gouvernorat' => 'Medenine',  'delegation' => 'Houmt Souk',   'demo' => true],
        ['nom_fr' => 'Tozeur',          'nom_ar' => 'توزر',               'gouvernorat' => 'Tozeur',    'delegation' => 'Tozeur',       'demo' => true],
    ];

    public function run(): void
    {
        // PRNG deterministe (mulberry-like) pour des volumes reproductibles.
        $seed = 424242;
        $rand = function (int $min, int $max) use (&$seed): int {
            $seed = ($seed * 1103515245 + 12345) & 0x7fffffff;
            return $min + (int) ($seed / 0x7fffffff * ($max - $min + 1));
        };

        // Zones
        $zoneIds = [];
        foreach (self::ZONES as $z) {
            DB::connection('pgsql')->table('observatoire.dim_zones')->updateOrInsert(
                ['gouvernorat' => $z['gouvernorat'], 'delegation' => $z['delegation']],
                $z
            );
            $zoneIds[] = DB::connection('pgsql')->table('observatoire.dim_zones')
                ->where('delegation', $z['delegation'])->value('id');
        }

        $debut = Carbon::today()->subMonths(12)->startOfMonth();
        $fin   = Carbon::today();

        $batch = [];
        for ($d = $debut->copy(); $d->lte($fin); $d->addDay()) {
            // Saisonnalite : coefficient estival (juin-septembre) plus fort.
            $mois = (int) $d->format('n');
            $saison = in_array($mois, [6, 7, 8, 9], true) ? 2.4 : ($mois === 12 ? 1.4 : 1.0);

            foreach ($zoneIds as $zi => $zoneId) {
                $poidsZone = [1.0, 1.3, 1.6, 1.4, 0.8][$zi] ?? 1.0;

                foreach (self::TYPES as $type) {
                    foreach (self::NATIONALITES as $nat) {
                        // Volume de base ; on ne conserve que >= seuil k=10.
                        $base = $rand(0, 14);
                        $arrivees = (int) round($base * $saison * $poidsZone);
                        if ($arrivees < 10) continue; // respecte le seuil, comme l'ETL

                        $presents = $arrivees + $rand(8, 30);       // nuitees > arrivees
                        $termines = max(10, $arrivees - $rand(0, 3));
                        $dureeMoy = $rand(2, 6);

                        $batch[] = [
                            'date_jour'                   => $d->toDateString(),
                            'zone_id'                     => $zoneId,
                            'nationalite_iso'             => $nat,
                            'type_etablissement'          => $type,
                            'nb_arrivees'                 => $arrivees,
                            'nb_departs'                  => max(10, $arrivees - $rand(0, 4)),
                            'nb_presents'                 => $presents,
                            'somme_duree_sejour_terminee' => $termines * $dureeMoy,
                            'nb_sejours_termines'         => $termines,
                        ];

                        if (count($batch) >= 500) {
                            $this->flush($batch);
                            $batch = [];
                        }
                    }
                }
            }
        }
        if ($batch) $this->flush($batch);

        // Couverture (MODE DEMO : quelques etablissements, representativite partielle).
        for ($d = $debut->copy(); $d->lte($fin); $d->addDay()) {
            DB::connection('pgsql')->table('observatoire.agg_couverture')->upsert([[
                'date_jour'                => $d->toDateString(),
                'nb_etablissements_actifs' => 6,
                'nb_etablissements_total'  => 6,
                'nb_zones_couvertes'       => count($zoneIds),
            ]], ['date_jour'], ['nb_etablissements_actifs', 'nb_etablissements_total', 'nb_zones_couvertes']);
        }

        $this->command?->info('Seed MODE DEMO Observatoire genere (12 mois, '.count(self::ZONES).' zones, '.count(self::NATIONALITES).' nationalites).');
    }

    private function flush(array $batch): void
    {
        DB::connection('pgsql')->table('observatoire.agg_sejours')->upsert(
            $batch,
            ['date_jour', 'zone_id', 'nationalite_iso', 'type_etablissement'],
            ['nb_arrivees', 'nb_departs', 'nb_presents', 'somme_duree_sejour_terminee', 'nb_sejours_termines']
        );
    }
}

<?php

namespace App\Services\Observatoire;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * ETL de l'Observatoire du Tourisme — le SEUL composant autorise a lire la base
 * nominative (`public`) et a ecrire la base d'agregats (`observatoire`).
 *
 * Regles appliquees ici, dans l'ordre :
 *   #1  Etancheite  : lecture `public` -> calcul en memoire -> ecriture
 *                     `observatoire`. Aucun identifiant personnel n'est copie.
 *   #2  Seuil k=10  : toute cellule (jour x zone x nationalite x type) portant
 *                     moins de SEUIL_K sejours est SUPPRIMEE avant insertion et
 *                     comptee dans `cellules_supprimees_seuil`.
 *   stack#8         : UPSERT sur la cle metier -> job idempotent, re-executable
 *                     sans doublon.
 *
 * ================== A ADAPTER AU SCHEMA NOMINATIF REEL ==================
 * Les requetes source ci-dessous supposent la structure operationnelle Qayed
 * suivante (a verifier / ajuster) :
 *   - table `check_ins`      : id, establishment_id, check_in_date (date),
 *                              check_out_date (date, nullable), status
 *                              ('validated' | ...).
 *   - table `guests`         : check_in_id, nationality_code (char2).
 *   - table `establishments` : id, type (maison_hotes|dar|location|hotel),
 *                              delegation, gouvernorat.
 * Seules les fiches VALIDEES sont agregees. Adapter les noms de colonnes/tables
 * si le backend reel differe ; la logique de seuil ne change jamais.
 */
class AggregationService
{
    /** Regle NON NEGOCIABLE #2 : seuil d'agregation. Ne jamais abaisser. */
    public const SEUIL_K = 10;

    private const CONN = 'pgsql'; // connexion applicative (droits d'ecriture ETL)

    /**
     * Agrege une fenetre de jours [debut, fin] (bornes incluses).
     * Par defaut : les 35 derniers jours (recouvre les sejours a cheval).
     *
     * @return array{run_id:int, lignes_source:int, cellules_ecrites:int, cellules_supprimees:int}
     */
    public function run(?Carbon $debut = null, ?Carbon $fin = null): array
    {
        $fin   = ($fin   ?? Carbon::today())->toImmutable();
        $debut = ($debut ?? Carbon::today()->subDays(35))->toImmutable();

        $runId = DB::connection(self::CONN)->table('observatoire.agg_run_log')->insertGetId([
            'demarre_le'         => now(),
            'date_debut_traitee' => $debut->toDateString(),
            'date_fin_traitee'   => $fin->toDateString(),
            'statut'             => 'ok',
        ]);

        try {
            $this->syncZones();

            $presence  = $this->collectPresence($debut, $fin);   // jour x zone x nat x type -> nb_presents
            $mouvement = $this->collectMouvements($debut, $fin);  // arrivees / departs
            $termines  = $this->collectSejoursTermines($debut, $fin);

            // Fusion des trois collectes sur la cle metier.
            $cellules = $this->fusionner($presence, $mouvement, $termines);

            [$aGarder, $supprimees] = $this->appliquerSeuil($cellules);

            $this->upsert($aGarder);
            $this->purgerSousSeuil($debut, $fin, $aGarder);
            $this->rafraichirCouverture($debut, $fin);

            DB::connection(self::CONN)->table('observatoire.agg_run_log')
                ->where('id', $runId)->update([
                    'termine_le'                => now(),
                    'lignes_source_lues'        => array_sum(array_map(fn ($c) => $c['nb_presents'], $cellules)),
                    'cellules_ecrites'          => count($aGarder),
                    'cellules_supprimees_seuil' => $supprimees,
                    'statut'                    => 'ok',
                ]);

            return [
                'run_id'              => $runId,
                'lignes_source'      => count($cellules),
                'cellules_ecrites'   => count($aGarder),
                'cellules_supprimees'=> $supprimees,
            ];
        } catch (\Throwable $e) {
            DB::connection(self::CONN)->table('observatoire.agg_run_log')
                ->where('id', $runId)->update([
                    'termine_le' => now(),
                    'statut'     => 'erreur',
                    'message'    => substr($e->getMessage(), 0, 2000),
                ]);
            throw $e;
        }
    }

    // ── Zones : projeter les etablissements sur des zones anonymes ────────────
    // On ne stocke JAMAIS l'etablissement, seulement la zone (gouvernorat +
    // delegation). C'est la brique d'anonymisation geographique.
    private function syncZones(): void
    {
        $zones = DB::connection(self::CONN)->table('establishments')
            ->select('gouvernorat', 'delegation')
            ->whereNotNull('delegation')
            ->distinct()
            ->get();

        foreach ($zones as $z) {
            DB::connection(self::CONN)->table('observatoire.dim_zones')->updateOrInsert(
                ['gouvernorat' => $z->gouvernorat, 'delegation' => $z->delegation],
                ['nom_fr' => $z->delegation, 'nom_ar' => $z->delegation]
            );
        }
    }

    private function zoneMap(): array
    {
        return DB::connection(self::CONN)->table('observatoire.dim_zones')
            ->get()
            ->keyBy(fn ($z) => $z->gouvernorat.'|'.$z->delegation)
            ->map(fn ($z) => $z->id)
            ->all();
    }

    /**
     * Nuitees : un voyageur present un jour J s'il est arrive <= J et pas encore
     * reparti (ou reparti apres J). Genere une ligne par jour de presence.
     */
    private function collectPresence(Carbon $debut, Carbon $fin): array
    {
        $zoneMap = $this->zoneMap();
        $cells = [];

        // generate_series cote PostgreSQL : une ligne par (sejour x jour present).
        $rows = DB::connection(self::CONN)->select(<<<SQL
            SELECT
                d::date                              AS date_jour,
                e.gouvernorat                        AS gouvernorat,
                e.delegation                         AS delegation,
                g.nationality_code                   AS nationalite_iso,
                e.type                               AS type_etablissement,
                COUNT(*)                             AS nb
            FROM check_ins ci
            JOIN establishments e ON e.id = ci.establishment_id
            JOIN guests g         ON g.check_in_id = ci.id
            CROSS JOIN LATERAL generate_series(
                GREATEST(ci.check_in_date, ?::date),
                LEAST(COALESCE(ci.check_out_date, ?::date), ?::date),
                interval '1 day'
            ) AS d
            WHERE ci.status = 'validated'
              AND ci.check_in_date <= ?::date
              AND (ci.check_out_date IS NULL OR ci.check_out_date >= ?::date)
              AND g.nationality_code IS NOT NULL
              AND e.delegation IS NOT NULL
            GROUP BY 1,2,3,4,5
        SQL, [
            $debut->toDateString(), $fin->toDateString(), $fin->toDateString(),
            $fin->toDateString(), $debut->toDateString(),
        ]);

        foreach ($rows as $r) {
            $zid = $zoneMap[$r->gouvernorat.'|'.$r->delegation] ?? null;
            if ($zid === null) continue;
            $key = $this->key($r->date_jour, $zid, $r->nationalite_iso, $r->type_etablissement);
            $cells[$key] = $this->blank($r->date_jour, $zid, $r->nationalite_iso, $r->type_etablissement);
            $cells[$key]['nb_presents'] = (int) $r->nb;
        }

        return $cells;
    }

    private function collectMouvements(Carbon $debut, Carbon $fin): array
    {
        $zoneMap = $this->zoneMap();
        $out = ['arrivees' => [], 'departs' => []];

        $arr = DB::connection(self::CONN)->select(<<<SQL
            SELECT ci.check_in_date AS date_jour, e.gouvernorat, e.delegation,
                   g.nationality_code AS nationalite_iso, e.type AS type_etablissement,
                   COUNT(*) AS nb
            FROM check_ins ci
            JOIN establishments e ON e.id = ci.establishment_id
            JOIN guests g ON g.check_in_id = ci.id
            WHERE ci.status = 'validated'
              AND ci.check_in_date BETWEEN ?::date AND ?::date
              AND g.nationality_code IS NOT NULL AND e.delegation IS NOT NULL
            GROUP BY 1,2,3,4,5
        SQL, [$debut->toDateString(), $fin->toDateString()]);

        $dep = DB::connection(self::CONN)->select(<<<SQL
            SELECT ci.check_out_date AS date_jour, e.gouvernorat, e.delegation,
                   g.nationality_code AS nationalite_iso, e.type AS type_etablissement,
                   COUNT(*) AS nb
            FROM check_ins ci
            JOIN establishments e ON e.id = ci.establishment_id
            JOIN guests g ON g.check_in_id = ci.id
            WHERE ci.status = 'validated'
              AND ci.check_out_date BETWEEN ?::date AND ?::date
              AND g.nationality_code IS NOT NULL AND e.delegation IS NOT NULL
            GROUP BY 1,2,3,4,5
        SQL, [$debut->toDateString(), $fin->toDateString()]);

        foreach (['arrivees' => $arr, 'departs' => $dep] as $bucket => $rows) {
            foreach ($rows as $r) {
                $zid = $zoneMap[$r->gouvernorat.'|'.$r->delegation] ?? null;
                if ($zid === null) continue;
                $out[$bucket][$this->key($r->date_jour, $zid, $r->nationalite_iso, $r->type_etablissement)] = (int) $r->nb;
            }
        }

        return $out;
    }

    /** Sejours clos un jour J : alimente la duree moyenne. */
    private function collectSejoursTermines(Carbon $debut, Carbon $fin): array
    {
        $zoneMap = $this->zoneMap();
        $out = [];

        $rows = DB::connection(self::CONN)->select(<<<SQL
            SELECT ci.check_out_date AS date_jour, e.gouvernorat, e.delegation,
                   g.nationality_code AS nationalite_iso, e.type AS type_etablissement,
                   COUNT(*) AS nb,
                   SUM((ci.check_out_date - ci.check_in_date)) AS somme_duree
            FROM check_ins ci
            JOIN establishments e ON e.id = ci.establishment_id
            JOIN guests g ON g.check_in_id = ci.id
            WHERE ci.status = 'validated'
              AND ci.check_out_date IS NOT NULL
              AND ci.check_out_date BETWEEN ?::date AND ?::date
              AND g.nationality_code IS NOT NULL AND e.delegation IS NOT NULL
            GROUP BY 1,2,3,4,5
        SQL, [$debut->toDateString(), $fin->toDateString()]);

        foreach ($rows as $r) {
            $zid = $zoneMap[$r->gouvernorat.'|'.$r->delegation] ?? null;
            if ($zid === null) continue;
            $out[$this->key($r->date_jour, $zid, $r->nationalite_iso, $r->type_etablissement)] = [
                'nb'          => (int) $r->nb,
                'somme_duree' => (float) $r->somme_duree,
            ];
        }

        return $out;
    }

    private function fusionner(array $presence, array $mouvement, array $termines): array
    {
        $cells = $presence;

        foreach ($mouvement['arrivees'] as $key => $nb) {
            $cells[$key] ??= $this->blankFromKey($key);
            $cells[$key]['nb_arrivees'] = $nb;
        }
        foreach ($mouvement['departs'] as $key => $nb) {
            $cells[$key] ??= $this->blankFromKey($key);
            $cells[$key]['nb_departs'] = $nb;
        }
        foreach ($termines as $key => $t) {
            $cells[$key] ??= $this->blankFromKey($key);
            $cells[$key]['nb_sejours_termines'] = $t['nb'];
            $cells[$key]['somme_duree_sejour_terminee'] = $t['somme_duree'];
        }

        return $cells;
    }

    /**
     * Regle #2 — coeur du dispositif. Volume d'une cellule = max(nb_presents,
     * nb_arrivees, nb_sejours_termines) : si AUCUNE de ces mesures n'atteint le
     * seuil, la cellule entiere est ecartee (rien ne fuit par une mesure
     * annexe). Conservateur par construction.
     *
     * @return array{0: array<int,array>, 1: int}  [cellules a garder, nb supprimees]
     */
    private function appliquerSeuil(array $cells): array
    {
        $garder = [];
        $supprimees = 0;

        foreach ($cells as $c) {
            $volume = max(
                (int) $c['nb_presents'],
                (int) $c['nb_arrivees'],
                (int) ($c['nb_sejours_termines'] ?? 0)
            );
            if ($volume < self::SEUIL_K) {
                $supprimees++;
                continue;
            }
            $garder[] = $c;
        }

        return [$garder, $supprimees];
    }

    private function upsert(array $cells): void
    {
        if (empty($cells)) return;

        foreach (array_chunk($cells, 500) as $chunk) {
            DB::connection(self::CONN)->table('observatoire.agg_sejours')->upsert(
                $chunk,
                ['date_jour', 'zone_id', 'nationalite_iso', 'type_etablissement'],
                ['nb_arrivees', 'nb_departs', 'nb_presents', 'somme_duree_sejour_terminee', 'nb_sejours_termines']
            );
        }
    }

    /**
     * Retire les cellules devenues sous le seuil depuis un run precedent (ex.
     * une correction a fait chuter le volume). Sans ca, une cellule passee sous
     * k=10 resterait publiee. On ne touche qu'a la fenetre [debut, fin].
     */
    private function purgerSousSeuil(Carbon $debut, Carbon $fin, array $garder): void
    {
        $clesGardees = array_map(
            fn ($c) => $c['date_jour'].'|'.$c['zone_id'].'|'.$c['nationalite_iso'].'|'.$c['type_etablissement'],
            $garder
        );

        $existants = DB::connection(self::CONN)->table('observatoire.agg_sejours')
            ->whereBetween('date_jour', [$debut->toDateString(), $fin->toDateString()])
            ->get(['id', 'date_jour', 'zone_id', 'nationalite_iso', 'type_etablissement']);

        $aSupprimer = [];
        $set = array_flip($clesGardees);
        foreach ($existants as $e) {
            $k = $e->date_jour.'|'.$e->zone_id.'|'.$e->nationalite_iso.'|'.$e->type_etablissement;
            if (!isset($set[$k])) $aSupprimer[] = $e->id;
        }

        if ($aSupprimer) {
            DB::connection(self::CONN)->table('observatoire.agg_sejours')
                ->whereIn('id', $aSupprimer)->delete();
        }
    }

    private function rafraichirCouverture(Carbon $debut, Carbon $fin): void
    {
        $total = (int) DB::connection(self::CONN)->table('establishments')->count();

        for ($d = $debut; $d->lte($fin); $d = $d->addDay()) {
            $jour = $d->toDateString();

            $actifs = (int) DB::connection(self::CONN)->table('check_ins')
                ->where('status', 'validated')
                ->whereBetween('check_in_date', [$d->copy()->subDays(30)->toDateString(), $jour])
                ->distinct()->count('establishment_id');

            $zones = (int) DB::connection(self::CONN)->table('observatoire.agg_sejours')
                ->where('date_jour', $jour)->distinct()->count('zone_id');

            DB::connection(self::CONN)->table('observatoire.agg_couverture')->upsert(
                [[
                    'date_jour'                => $jour,
                    'nb_etablissements_actifs' => $actifs,
                    'nb_etablissements_total'  => $total,
                    'nb_zones_couvertes'       => $zones,
                ]],
                ['date_jour'],
                ['nb_etablissements_actifs', 'nb_etablissements_total', 'nb_zones_couvertes']
            );
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private function key(string $date, int $zid, string $nat, string $type): string
    {
        return "$date|$zid|$nat|$type";
    }

    private function blank(string $date, int $zid, string $nat, string $type): array
    {
        return [
            'date_jour'                   => $date,
            'zone_id'                     => $zid,
            'nationalite_iso'             => $nat,
            'type_etablissement'          => $type,
            'nb_arrivees'                 => 0,
            'nb_departs'                  => 0,
            'nb_presents'                 => 0,
            'somme_duree_sejour_terminee' => null,
            'nb_sejours_termines'         => null,
        ];
    }

    private function blankFromKey(string $key): array
    {
        [$date, $zid, $nat, $type] = explode('|', $key);
        return $this->blank($date, (int) $zid, $nat, $type);
    }
}

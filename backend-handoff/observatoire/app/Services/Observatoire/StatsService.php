<?php

namespace App\Services\Observatoire;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Calculs agreges du dashboard (ecrans 1-3). Toute methode :
 *   - lit via la connexion LECTURE SEULE `pgsql_observatoire_ro` ;
 *   - applique le seuil k=10 sur les totaux agreges A LA DEMANDE (regle #2) ;
 *   - ne renvoie jamais de valeur en dessous du seuil (masquee « <seuil »).
 */
class StatsService
{
    private const CONN = 'pgsql_observatoire_ro';

    private function q()
    {
        return DB::connection(self::CONN)->table('observatoire.agg_sejours');
    }

    private function appliquerFiltres($query, array $f)
    {
        $query->whereBetween('date_jour', [$f['debut'], $f['fin']]);
        if (!empty($f['zone']))        $query->where('zone_id', $f['zone']);
        if (!empty($f['nationalite'])) $query->where('nationalite_iso', $f['nationalite']);
        return $query;
    }

    /** KPIs : arrivees, nuitees, duree moyenne, nb nationalites actives. */
    public function kpis(array $f): array
    {
        $row = $this->appliquerFiltres($this->q(), $f)
            ->selectRaw('COALESCE(SUM(nb_arrivees),0) arrivees,
                         COALESCE(SUM(nb_presents),0) nuitees,
                         COALESCE(SUM(somme_duree_sejour_terminee),0) somme_duree,
                         COALESCE(SUM(nb_sejours_termines),0) nb_termines,
                         COUNT(DISTINCT nationalite_iso) nb_nat')
            ->first();

        $duree = $row->nb_termines > 0 ? round($row->somme_duree / $row->nb_termines, 1) : null;

        return [
            'arrivees'              => Seuil::masquer((int) $row->arrivees),
            'nuitees'               => Seuil::masquer((int) $row->nuitees),
            'duree_moyenne_sejour'  => $row->nb_termines >= Seuil::K ? $duree : Seuil::MASQUE,
            'nationalites_actives'  => (int) $row->nb_nat,
        ];
    }

    /** Serie temporelle arrivees + nuitees. */
    public function serie(array $f, string $granularite): array
    {
        $bucket = match ($granularite) {
            'mois'    => "date_trunc('month', date_jour)",
            'semaine' => "date_trunc('week', date_jour)",
            default   => 'date_jour',
        };

        $rows = $this->appliquerFiltres($this->q(), $f)
            ->selectRaw("$bucket AS periode,
                         SUM(nb_arrivees) arrivees,
                         SUM(nb_presents) nuitees")
            ->groupByRaw($bucket)
            ->orderByRaw($bucket)
            ->get();

        return $rows->map(fn ($r) => [
            'periode'  => Carbon::parse($r->periode)->toDateString(),
            'arrivees' => Seuil::masquer((int) $r->arrivees),
            'nuitees'  => Seuil::masquer((int) $r->nuitees),
        ])->all();
    }

    /** Top nationalites + variation vs periode precedente. */
    public function topNationalites(array $f, int $limit = 10): array
    {
        $courant = $this->parNationalite($f);
        $precedent = $this->parNationalite($this->periodePrecedente($f));

        $lignes = [];
        foreach ($courant as $iso => $c) {
            if ($c['arrivees'] < Seuil::K) continue; // seuil de publication
            $prec = $precedent[$iso]['arrivees'] ?? 0;
            $lignes[] = [
                'nationalite_iso' => $iso,
                'arrivees'        => $c['arrivees'],
                'nuitees'         => Seuil::masquer($c['nuitees']),
                'duree_moyenne'   => $c['nb_termines'] >= Seuil::K ? round($c['somme_duree'] / max($c['nb_termines'], 1), 1) : Seuil::MASQUE,
                'variation_pct'   => $prec >= Seuil::K ? round((($c['arrivees'] - $prec) / $prec) * 100, 1) : null,
            ];
        }

        usort($lignes, fn ($a, $b) => $b['arrivees'] <=> $a['arrivees']);
        return array_slice($lignes, 0, $limit);
    }

    private function parNationalite(array $f): array
    {
        return $this->appliquerFiltres($this->q(), $f)
            ->selectRaw('nationalite_iso,
                         SUM(nb_arrivees) arrivees, SUM(nb_presents) nuitees,
                         SUM(somme_duree_sejour_terminee) somme_duree,
                         SUM(nb_sejours_termines) nb_termines')
            ->groupBy('nationalite_iso')
            ->get()
            ->keyBy('nationalite_iso')
            ->map(fn ($r) => [
                'arrivees'    => (int) $r->arrivees,
                'nuitees'     => (int) $r->nuitees,
                'somme_duree' => (float) $r->somme_duree,
                'nb_termines' => (int) $r->nb_termines,
            ])->all();
    }

    /** Repartition par type d'etablissement (donut). */
    public function parType(array $f): array
    {
        $rows = $this->appliquerFiltres($this->q(), $f)
            ->selectRaw('type_etablissement, SUM(nb_arrivees) arrivees')
            ->groupBy('type_etablissement')
            ->get();

        return $rows->filter(fn ($r) => (int) $r->arrivees >= Seuil::K)
            ->map(fn ($r) => ['type' => $r->type_etablissement, 'arrivees' => (int) $r->arrivees])
            ->values()->all();
    }

    /** Comparaison inter-zones. */
    public function comparaisonZones(array $f): array
    {
        $rows = DB::connection(self::CONN)
            ->table('observatoire.agg_sejours as s')
            ->join('observatoire.dim_zones as z', 'z.id', '=', 's.zone_id')
            ->whereBetween('s.date_jour', [$f['debut'], $f['fin']])
            ->selectRaw('z.id, z.nom_fr, z.nom_ar,
                         SUM(s.nb_arrivees) arrivees, SUM(s.nb_presents) nuitees')
            ->groupBy('z.id', 'z.nom_fr', 'z.nom_ar')
            ->get();

        return $rows->filter(fn ($r) => (int) $r->arrivees >= Seuil::K)
            ->map(fn ($r) => [
                'zone_id'  => (int) $r->id,
                'nom_fr'   => $r->nom_fr,
                'nom_ar'   => $r->nom_ar,
                'arrivees' => (int) $r->arrivees,
                'nuitees'  => Seuil::masquer((int) $r->nuitees),
            ])->values()->all();
    }

    /** Matrice mois x zone (heatmap). Valeur = nuitees, masquee sous le seuil. */
    public function saisonnalite(int $annee): array
    {
        $rows = DB::connection(self::CONN)
            ->table('observatoire.agg_sejours as s')
            ->join('observatoire.dim_zones as z', 'z.id', '=', 's.zone_id')
            ->whereRaw('EXTRACT(YEAR FROM s.date_jour) = ?', [$annee])
            ->selectRaw("z.id zone_id, z.nom_fr, z.nom_ar,
                         EXTRACT(MONTH FROM s.date_jour)::int mois,
                         SUM(s.nb_presents) nuitees")
            ->groupBy('z.id', 'z.nom_fr', 'z.nom_ar')
            ->groupByRaw('EXTRACT(MONTH FROM s.date_jour)')
            ->get();

        $zones = [];
        foreach ($rows as $r) {
            $zones[$r->zone_id] ??= [
                'zone_id' => (int) $r->zone_id, 'nom_fr' => $r->nom_fr, 'nom_ar' => $r->nom_ar,
                'mois'    => array_fill(1, 12, 0),
            ];
            $zones[$r->zone_id]['mois'][(int) $r->mois] = Seuil::masquer((int) $r->nuitees);
        }

        return array_values($zones);
    }

    /** Couverture / representativite du jour le plus recent. */
    public function couverture(): array
    {
        $row = DB::connection(self::CONN)->table('observatoire.agg_couverture')
            ->orderByDesc('date_jour')->first();

        if (!$row) {
            return ['nb_etablissements_actifs' => 0, 'nb_etablissements_total' => 0,
                    'nb_zones_couvertes' => 0, 'taux_couverture_pct' => 0, 'date_jour' => null];
        }

        $taux = $row->nb_etablissements_total > 0
            ? round($row->nb_etablissements_actifs / $row->nb_etablissements_total * 100, 1) : 0;

        return [
            'date_jour'                => $row->date_jour,
            'nb_etablissements_actifs' => (int) $row->nb_etablissements_actifs,
            'nb_etablissements_total'  => (int) $row->nb_etablissements_total,
            'nb_zones_couvertes'       => (int) $row->nb_zones_couvertes,
            'taux_couverture_pct'      => $taux,
        ];
    }

    public function zones(): array
    {
        return DB::connection(self::CONN)->table('observatoire.dim_zones')
            ->orderBy('nom_fr')->get(['id', 'nom_fr', 'nom_ar', 'gouvernorat', 'delegation'])
            ->map(fn ($z) => (array) $z)->all();
    }

    // ── Helpers periode ────────────────────────────────────────────────────────
    public function periodePrecedente(array $f): array
    {
        $debut = Carbon::parse($f['debut']);
        $fin   = Carbon::parse($f['fin']);
        $jours = $debut->diffInDays($fin) + 1;
        return array_merge($f, [
            'debut' => $debut->copy()->subDays($jours)->toDateString(),
            'fin'   => $debut->copy()->subDay()->toDateString(),
        ]);
    }
}

<?php

namespace App\Services\Observatoire;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Orchestrateur du module IA 1 (interrogation en langage naturel).
 *
 * Flux (regle #3 : l'IA ne calcule JAMAIS un chiffre) :
 *   1. Claude PROPOSE un SQL (jamais executable en l'etat).
 *   2. SqlGuard valide (fail-closed).
 *   3. La BASE calcule, via un role PostgreSQL LECTURE SEULE (connexion
 *      `pgsql_observatoire_ro`) — timeout 5 s.
 *   4. Seuil k=10 applique sur le resultat.
 *   5. Claude REDIGE a partir des chiffres retournes (jamais inventes).
 *   6. Tout est logge dans observatoire.ia_query_log (query_id tracable).
 */
class IaQueryService
{
    /** Connexion PostgreSQL en lecture seule sur le schema observatoire. */
    private const CONN_RO = 'pgsql_observatoire_ro';
    private const TIMEOUT_MS = 5000;

    public function __construct(
        private ClaudeClient $claude,
        private SqlGuard $guard,
    ) {}

    /**
     * @return array<string,mixed> reponse structuree destinee au frontend
     */
    public function poser(string $question, ?int $utilisateurId): array
    {
        $queryId = (string) Str::uuid();
        $t0 = microtime(true);

        // ── Etape 1 : NL -> SQL ────────────────────────────────────────────────
        $raw = $this->claude->message(Prompts::nlVersSql(), $question, 1200);
        $plan = $this->parseJson($raw);

        // Refus explicite du modele (nominatif / hors perimetre / inexistant).
        if ($plan === null || ($plan['sql'] ?? null) === null) {
            $motif = $this->classifierRefus($question, $plan['explication'] ?? null);
            return $this->refus($queryId, $question, $motif, $utilisateurId, $t0);
        }

        // ── Etape 2 : validation (derniere ligne de defense) ───────────────────
        $verdict = $this->guard->valider($plan['sql']);
        if (!$verdict['ok']) {
            $this->log($queryId, $question, $plan['sql'], false, 'sql_invalide', null, $utilisateurId, $t0);
            return [
                'query_id'   => $queryId,
                'ok'         => false,
                'motif'      => 'sql_invalide',
                'reponse'    => "La question n'a pas pu etre traduite en une requete valide. Reformulez-la.",
                'sql'        => null,
            ];
        }
        $sql = $verdict['sql'];

        // ── Etape 3 : la BASE calcule (role lecture seule, timeout court) ──────
        try {
            DB::connection(self::CONN_RO)->statement('SET statement_timeout = '.self::TIMEOUT_MS);
            $lignes = DB::connection(self::CONN_RO)->select($sql);
        } catch (\Throwable $e) {
            $this->log($queryId, $question, $sql, false, 'sql_invalide', null, $utilisateurId, $t0);
            return [
                'query_id' => $queryId,
                'ok'       => false,
                'motif'    => 'sql_invalide',
                'reponse'  => "La requete n'a pas pu etre executee.",
                'sql'      => $sql,
            ];
        }

        $lignes = array_map(fn ($r) => (array) $r, $lignes);

        // ── Etape 4 : seuil k=10 sur le resultat ───────────────────────────────
        [$lignesPubliees, $sousSeuil] = $this->appliquerSeuilResultat($lignes);

        // ── Etape 5 : redaction NL a partir des chiffres retournes ─────────────
        $reponse = $this->rediger($question, $lignesPubliees, $sousSeuil);

        // ── Etape 6 : log ──────────────────────────────────────────────────────
        $this->log($queryId, $question, $sql, true, null, count($lignesPubliees), $utilisateurId, $t0);

        return [
            'query_id'      => $queryId,
            'ok'            => true,
            'reponse'       => $reponse,
            'sql'           => $sql,
            'explication'   => $plan['explication'] ?? null,
            'visualisation' => in_array($plan['visualisation'] ?? '', ['ligne', 'barres', 'kpi', 'tableau'], true)
                                ? $plan['visualisation'] : 'tableau',
            'donnees'       => $lignesPubliees,
            'sous_seuil'    => $sousSeuil,
        ];
    }

    /**
     * Applique le seuil sur toute colonne numerique de comptage. Toute valeur
     * strictement < k est masquee (« <seuil »). Si TOUTES les mesures d'une ligne
     * sont sous le seuil, la ligne est retiree.
     *
     * @return array{0: array, 1: bool} [lignes publiees, au moins une valeur masquee]
     */
    private function appliquerSeuilResultat(array $lignes): array
    {
        $mesures = ['nb_arrivees', 'nb_departs', 'nb_presents', 'nb_sejours_termines',
                    'arrivees', 'nuitees', 'nb', 'total', 'count'];
        $sousSeuilRencontre = false;
        $publiees = [];

        foreach ($lignes as $ligne) {
            $auMoinsUnePubliee = false;
            $mesurePresente = false;
            foreach ($ligne as $col => $val) {
                if (in_array(strtolower($col), $mesures, true) && is_numeric($val)) {
                    $mesurePresente = true;
                    if ((int) $val < Seuil::K) {
                        $ligne[$col] = Seuil::MASQUE;
                        $sousSeuilRencontre = true;
                    } else {
                        $auMoinsUnePubliee = true;
                    }
                }
            }
            // Ligne conservee si elle porte au moins une mesure publiable, ou si
            // elle ne contient aucune mesure de comptage (ex. dimension pure).
            if (!$mesurePresente || $auMoinsUnePubliee) {
                $publiees[] = $ligne;
            } else {
                $sousSeuilRencontre = true;
            }
        }

        return [$publiees, $sousSeuilRencontre];
    }

    private function rediger(string $question, array $lignes, bool $sousSeuil): string
    {
        if (empty($lignes)) {
            return $sousSeuil
                ? "Le volume de sejours est insuffisant pour publier cette statistique (seuil de confidentialite)."
                : "Aucune donnee disponible pour cette question sur la periode consideree.";
        }

        $bloc = json_encode(
            ['question' => $question, 'resultats' => array_slice($lignes, 0, 50), 'donnees_partielles_sous_seuil' => $sousSeuil],
            JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
        );

        try {
            return trim($this->claude->message(Prompts::redactionReponse(), $bloc, 500));
        } catch (\Throwable) {
            // Repli sans IA : on ne bloque jamais l'affichage des chiffres verifies.
            return "Resultats disponibles ci-dessous.";
        }
    }

    private function classifierRefus(string $question, ?string $explication): string
    {
        $q = Str::lower($question.' '.($explication ?? ''));
        $nominatif = ['nom', 'prenom', 'qui a', 'identite', 'passeport', 'numero', 'الاسم', 'من هو', 'هوية'];
        foreach ($nominatif as $m) {
            if (str_contains($q, $m)) return 'nominatif';
        }
        return 'hors_perimetre';
    }

    private function refus(string $queryId, string $question, string $motif, ?int $uid, float $t0): array
    {
        $this->log($queryId, $question, null, false, $motif, null, $uid, $t0);

        $reponse = match ($motif) {
            'nominatif' => "L'observatoire ne traite aucune donnee personnelle. Seules des statistiques agregees sont disponibles.",
            default     => "Cette question sort du perimetre de l'observatoire. Reformulez-la sur les arrivees, nuitees, durees de sejour, nationalites ou zones.",
        };

        return [
            'query_id' => $queryId,
            'ok'       => false,
            'motif'    => $motif,
            'reponse'  => $reponse,
            'sql'      => null,
        ];
    }

    private function parseJson(string $raw): ?array
    {
        // Le modele peut entourer le JSON de texte : on extrait le premier objet.
        if (preg_match('/\{.*\}/s', $raw, $m)) {
            $data = json_decode($m[0], true);
            return is_array($data) ? $data : null;
        }
        return null;
    }

    private function log(string $queryId, string $question, ?string $sql, bool $valide, ?string $motif, ?int $lignes, ?int $uid, float $t0): void
    {
        DB::connection('pgsql')->table('observatoire.ia_query_log')->insert([
            'query_id'            => $queryId,
            'timestamp'           => now(),
            'question_utilisateur'=> $question,
            'sql_genere'          => $sql,
            'sql_valide'          => $valide,
            'refus_motif'         => $motif,
            'resultat_lignes'     => $lignes,
            'duree_ms'            => (int) round((microtime(true) - $t0) * 1000),
            'utilisateur_id'      => $uid,
        ]);
    }
}

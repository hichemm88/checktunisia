<?php

namespace App\Services\Observatoire;

/**
 * Garde-fou SQL du module IA (NL->SQL), regle NON NEGOCIABLE #3/#4.
 *
 * Claude PROPOSE une requete ; ce garde-fou est la DERNIERE ligne de defense
 * avant execution. Il ne fait JAMAIS confiance a la sortie du modele. En cas de
 * doute, il refuse (fail-closed).
 *
 * Defense en profondeur (chaque couche est independante) :
 *   1. Une seule instruction (pas de `;` multiples, pas de commentaire).
 *   2. SELECT / WITH uniquement.
 *   3. Liste noire de mots-cles de modification / DDL / droits.
 *   4. Liste BLANCHE stricte des tables autorisees.
 *   5. LIMIT force <= MAX_ROWS.
 * La couche ultime reste PostgreSQL : la requete s'execute avec un role en
 * LECTURE SEULE sur le seul schema `observatoire` (voir README). Meme si ce
 * garde-fou etait contourne, la base refuserait toute ecriture.
 */
class SqlGuard
{
    public const MAX_ROWS = 1000;

    /** Regle #4 : liste blanche stricte. Aucune autre table n'est atteignable. */
    private const TABLES_AUTORISEES = [
        'agg_sejours',
        'dim_zones',
        'agg_couverture',
    ];

    private const MOTS_INTERDITS = [
        'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate',
        'grant', 'revoke', 'copy', 'merge', 'call', 'do', 'vacuum', 'analyze',
        'comment', 'reindex', 'cluster', 'lock', 'set', 'reset', 'begin',
        'commit', 'rollback', 'savepoint', 'listen', 'notify', 'pg_sleep',
        'pg_read_file', 'pg_ls_dir', 'lo_import', 'lo_export', 'dblink',
        'information_schema', 'pg_catalog', 'pg_class', 'pg_tables', 'current_setting',
    ];

    /**
     * @return array{ok:bool, sql?:string, motif?:string, raison?:string}
     */
    public function valider(?string $sql): array
    {
        if ($sql === null || trim($sql) === '') {
            return $this->refus('sql_invalide', 'Aucune requete generee.');
        }

        $sql = trim($sql);

        // 1. Une seule instruction. On retire un unique `;` final tolere.
        $sansPointVirguleFinal = rtrim($sql, "; \t\n\r");
        if (str_contains($sansPointVirguleFinal, ';')) {
            return $this->refus('sql_invalide', 'Instructions multiples interdites.');
        }
        $sql = $sansPointVirguleFinal;

        // Pas de commentaires (vecteur d'evasion classique).
        if (preg_match('/(--|\/\*|\*\/|#)/', $sql)) {
            return $this->refus('sql_invalide', 'Commentaires SQL interdits.');
        }

        // 2. Doit commencer par SELECT ou WITH.
        if (!preg_match('/^\s*(select|with)\s/i', $sql)) {
            return $this->refus('sql_invalide', 'Seules les requetes SELECT sont autorisees.');
        }

        // 3. Liste noire (recherche par frontieres de mots, insensible a la casse).
        $lower = strtolower($sql);
        foreach (self::MOTS_INTERDITS as $mot) {
            if (preg_match('/\b'.preg_quote($mot, '/').'\b/', $lower)) {
                return $this->refus('sql_invalide', "Mot-cle interdit detecte : $mot.");
            }
        }

        // 4. Liste blanche des tables. On extrait tous les identifiants suivant
        //    FROM / JOIN et on verifie qu'ils sont autorises (avec ou sans le
        //    prefixe de schema `observatoire.`).
        if (preg_match_all('/\b(?:from|join)\s+([a-z0-9_\.]+)/i', $lower, $m)) {
            foreach ($m[1] as $ref) {
                $table = str_contains($ref, '.') ? substr($ref, strrpos($ref, '.') + 1) : $ref;
                // Un prefixe de schema, s'il existe, doit etre `observatoire`.
                if (str_contains($ref, '.') && !str_starts_with($ref, 'observatoire.')) {
                    return $this->refus('sql_invalide', "Schema non autorise : $ref.");
                }
                if (!in_array($table, self::TABLES_AUTORISEES, true)) {
                    return $this->refus('sql_invalide', "Table non autorisee : $table.");
                }
            }
        }

        // 5. LIMIT force. Si absent, on l'ajoute ; si present et trop grand, on le
        //    plafonne.
        $sql = $this->forcerLimit($sql);

        return ['ok' => true, 'sql' => $sql];
    }

    private function forcerLimit(string $sql): string
    {
        if (preg_match('/\blimit\s+(\d+)\b/i', $sql, $m)) {
            $n = (int) $m[1];
            if ($n > self::MAX_ROWS) {
                return preg_replace('/\blimit\s+\d+\b/i', 'LIMIT '.self::MAX_ROWS, $sql, 1);
            }
            return $sql;
        }
        return $sql.' LIMIT '.self::MAX_ROWS;
    }

    private function refus(string $motif, string $raison): array
    {
        return ['ok' => false, 'motif' => $motif, 'raison' => $raison];
    }
}

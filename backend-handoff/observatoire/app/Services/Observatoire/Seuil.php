<?php

namespace App\Services\Observatoire;

/**
 * Application du seuil k=10 SUR LES RESULTATS (regle NON NEGOCIABLE #2, cote
 * serveur — jamais cote client).
 *
 * Deux niveaux de defense se cumulent :
 *   - En amont, l'ETL n'ecrit deja aucune cellule < 10 (AggregationService).
 *   - En aval, toute reponse API/IA repasse ici : une combinaison de dimensions
 *     agregee a la demande (ex. nationalite x zone x semaine) peut retomber sous
 *     le seuil meme si chaque cellule stockee le respectait. On masque alors la
 *     valeur (« < seuil ») et on la rend non exportable.
 */
class Seuil
{
    public const K = 10;
    public const MASQUE = '<seuil';

    /**
     * Masque un total agrege s'il est strictement inferieur au seuil.
     * Un total nul est traite comme sous le seuil (aucune donnee a publier).
     *
     * @return int|string  la valeur, ou self::MASQUE
     */
    public static function masquer(?int $valeur): int|string
    {
        if ($valeur === null || $valeur < self::K) {
            return self::MASQUE;
        }
        return $valeur;
    }

    public static function estMasque(int|string|null $valeur): bool
    {
        return $valeur === self::MASQUE || $valeur === null;
    }

    /**
     * Filtre une collection de lignes agregees : toute ligne dont le volume de
     * reference (`$champVolume`) est sous le seuil est ECARTEE (pas seulement
     * masquee — elle disparait de la liste, seuil de publication).
     *
     * @param  array<int,array<string,mixed>> $lignes
     * @return array{lignes: array<int,array<string,mixed>>, supprimees: int}
     */
    public static function filtrer(array $lignes, string $champVolume): array
    {
        $garde = [];
        $supprimees = 0;
        foreach ($lignes as $ligne) {
            $v = (int) ($ligne[$champVolume] ?? 0);
            if ($v < self::K) { $supprimees++; continue; }
            $garde[] = $ligne;
        }
        return ['lignes' => $garde, 'supprimees' => $supprimees];
    }
}

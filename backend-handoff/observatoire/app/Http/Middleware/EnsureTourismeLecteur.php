<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Regle #4 / §7 : l'API Observatoire n'est accessible qu'aux comptes
 * institutionnels dedies, role `TOURISME_LECTEUR`, DISTINCT des roles MI
 * (authority_user) et operateurs. Lecture seule (§8) : aucune route mutante.
 *
 * A adapter au systeme de roles reel du backend. Ici on suppose que
 * $user->role (ou $user->hasRole()) porte la valeur 'tourisme_lecteur'.
 */
class EnsureTourismeLecteur
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $autorise = $user && (
            (method_exists($user, 'hasRole') && $user->hasRole('tourisme_lecteur'))
            || ($user->role ?? null) === 'tourisme_lecteur'
        );

        if (!$autorise) {
            return response()->json([
                'errors' => [['code' => 'forbidden', 'message' => "Acces reserve au role TOURISME_LECTEUR."]],
            ], 403);
        }

        return $next($request);
    }
}

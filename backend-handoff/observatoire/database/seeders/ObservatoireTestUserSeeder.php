<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

/**
 * Cree un COMPTE DE TEST pour le role TOURISME_LECTEUR, afin de tester le
 * dashboard Observatoire de bout en bout.
 *
 * A APPLIQUER SUR LE BACKEND (depot Railway), puis :
 *   php artisan db:seed --class=Database\\Seeders\\ObservatoireTestUserSeeder
 *
 * ATTENTION — a adapter au modele User reel :
 *  - Nom des colonnes (`role`, `first_name`, `last_name`, `email`, `password`).
 *  - Si les roles sont geres par une table pivot / spatie/permission, remplacer
 *    le champ `role` par $user->assignRole('tourisme_lecteur').
 *  - MFA (§7) : ce compte de test est cree SANS MFA pour faciliter la recette.
 *    En production, exiger l'enrolement MFA au premier login (comme le portail
 *    autorite). Ne pas laisser ce compte actif en production.
 *
 * Identifiants de test (a communiquer de maniere securisee, jamais en clair
 * dans un canal partage) :
 *   e-mail        : tourisme.demo@qayed.tn
 *   mot de passe  : voir la variable d'environnement OBSERVATOIRE_TEST_PASSWORD
 *                   (defaut ci-dessous UNIQUEMENT pour un environnement de
 *                   recette isole — a changer imperativement).
 */
class ObservatoireTestUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('OBSERVATOIRE_TEST_EMAIL', 'tourisme.demo@qayed.tn');
        $password = env('OBSERVATOIRE_TEST_PASSWORD', 'Observatoire2026!');

        // updateOrInsert : idempotent, ne cree pas de doublon si relance.
        DB::table('users')->updateOrInsert(
            ['email' => $email],
            [
                'first_name' => 'Observatoire',
                'last_name'  => 'Demo',
                'role'       => 'tourisme_lecteur',
                'password'   => Hash::make($password),
                'email_verified_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        // Si spatie/permission est utilise, decommenter et adapter :
        // $user = \App\Models\User::where('email', $email)->first();
        // $user->syncRoles(['tourisme_lecteur']);

        $this->command?->warn("Compte de test TOURISME_LECTEUR cree : $email");
        $this->command?->warn('Changez le mot de passe avant toute mise en production.');
    }
}

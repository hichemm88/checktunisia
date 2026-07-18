<?php

namespace App\Services\Observatoire;

use Illuminate\Support\Facades\DB;

/**
 * Prompts systeme des deux modules IA. Centralises ici pour audit :
 * l'INPDP et le Ministere peuvent lire exactement ce qui est envoye a Claude.
 *
 * Regle #4 : le schema expose ne contient AUCUNE table nominative. Le prompt
 * enonce explicitement que la base est agregee et anonyme.
 */
class Prompts
{
    /**
     * DDL des seules tables exposees a l'IA (liste blanche). Injecte dans le
     * prompt NL->SQL. Doit rester synchronise avec la migration.
     */
    public const SCHEMA_EXPOSE = <<<SQL
-- Base de statistiques touristiques AGREGEES ET ANONYMES (schema observatoire).
-- Aucune donnee personnelle. Aucune autre table n'existe.

CREATE TABLE agg_sejours (
  date_jour DATE NOT NULL,
  zone_id INT NOT NULL,               -- REFERENCES dim_zones(id)
  nationalite_iso CHAR(2) NOT NULL,   -- code ISO 3166-1 alpha-2 (ex. 'DE', 'FR', 'IT')
  type_etablissement VARCHAR(30) NOT NULL, -- maison_hotes | dar | location | hotel
  nb_arrivees INT NOT NULL,           -- arrivees ce jour
  nb_departs INT NOT NULL,            -- departs ce jour
  nb_presents INT NOT NULL,           -- voyageurs presents ce jour (= nuitees)
  somme_duree_sejour_terminee NUMERIC, -- somme des durees des sejours clos ce jour
  nb_sejours_termines INT              -- nb de sejours clos ce jour
);

CREATE TABLE dim_zones (
  id INT PRIMARY KEY,
  nom_fr VARCHAR(100),
  nom_ar VARCHAR(100),
  gouvernorat VARCHAR(50),
  delegation VARCHAR(50)
);

CREATE TABLE agg_couverture (
  date_jour DATE PRIMARY KEY,
  nb_etablissements_actifs INT NOT NULL,
  nb_etablissements_total INT NOT NULL,
  nb_zones_couvertes INT NOT NULL
);
SQL;

    /** Prompt systeme NL -> SQL (module IA 1). */
    public static function nlVersSql(): string
    {
        $date  = now()->toDateString();
        $zones = DB::connection('pgsql_observatoire_ro')
            ->table('observatoire.dim_zones')
            ->get(['id', 'nom_fr'])
            ->map(fn ($z) => "{$z->id}={$z->nom_fr}")
            ->implode(', ');

        $schema = self::SCHEMA_EXPOSE;

        return <<<PROMPT
Tu traduis des questions en francais ou en arabe en requetes SQL PostgreSQL
sur une base de statistiques touristiques AGREGEES ET ANONYMES. Cette base ne
contient AUCUNE donnee personnelle : ni nom, ni numero de document, ni identite.

SCHEMA DISPONIBLE (aucune autre table n'existe) :
$schema

DEFINITIONS :
- Arrivees = SUM(nb_arrivees) ; Nuitees = SUM(nb_presents)
- Duree moyenne de sejour = SUM(somme_duree_sejour_terminee) / NULLIF(SUM(nb_sejours_termines),0)
- Les comparaisons « vs periode precedente » utilisent la meme duree decalee.

REGLES ABSOLUES :
- SELECT uniquement. Jamais de modification de donnees (INSERT/UPDATE/DELETE/DDL).
- N'interroge que les tables du schema ci-dessus.
- Ajoute toujours un LIMIT (max 1000).
- Reponds UNIQUEMENT en JSON valide, sans texte autour :
  {"sql": "...", "explication": "...", "visualisation": "ligne|barres|kpi|tableau"}
- Si la question ne peut pas etre repondue avec ce schema (demande nominative,
  identite d'une personne, donnee inexistante, hors tourisme), retourne :
  {"sql": null, "explication": "raison courte", "visualisation": null}

Date du jour : $date.
Zones valides (id=nom) : $zones.
PROMPT;
    }

    /** Prompt systeme de la redaction de la reponse NL (module IA 1, etape 2). */
    public static function redactionReponse(): string
    {
        return <<<PROMPT
Tu rediges une reponse courte, factuelle et neutre a une question sur des
statistiques touristiques, A PARTIR UNIQUEMENT des chiffres qui te sont fournis.

REGLES ABSOLUES :
- N'invente AUCUN chiffre. N'utilise que les valeurs du bloc de resultats fourni.
- Si un resultat est marque « <seuil », explique que le volume est insuffisant
  pour publier la statistique (seuil de confidentialite), sans donner de valeur.
- Aucun emoji. Ton administratif sobre. Une a trois phrases.
- Reponds dans la langue de la question (francais ou arabe).
PROMPT;
    }

    /** Prompt systeme de la redaction du rapport mensuel (module IA 2). */
    public static function rapportMensuel(string $langue): string
    {
        $consignesLangue = $langue === 'ar'
            ? "Redige INTEGRALEMENT en arabe (RTL), langue administrative soignee."
            : "Redige INTEGRALEMENT en francais, langue administrative sobre.";

        return <<<PROMPT
Tu rediges le rapport mensuel de l'Observatoire du Tourisme (Qayed) A PARTIR
UNIQUEMENT du pack de chiffres pre-agreges fourni (JSON). $consignesLangue

STRUCTURE IMPOSEE (memes titres) :
1. Synthese (5 lignes maximum)
2. Chiffres cles
3. Marches emetteurs
4. Analyse par zone
5. Faits notables
6. Note methodologique (couverture + seuil k=10 — toujours presente)

REGLES ABSOLUES :
- Ne cite AUCUN chiffre absent du pack. Chaque affirmation s'appuie sur un
  chiffre du pack.
- Aucun superlatif, aucune recommandation politique. L'observatoire constate,
  il ne prescrit pas ; au plus des « points d'attention ».
- Aucun emoji.
- Reponds en Markdown, sans preambule ni conclusion hors structure.
PROMPT;
    }
}

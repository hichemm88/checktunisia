# Registre de traitement — Observatoire du Tourisme

Fiche de registre au sens de la loi organique n° 2004-63 et des exigences de
l'INPDP. Le module Observatoire est documenté comme un **traitement distinct**
de la fiche de police opérationnelle.

## Identification du traitement

| Rubrique | Valeur |
|---|---|
| Intitulé | Observatoire du Tourisme — statistiques agrégées anonymes |
| Responsable de traitement | Qayed (à préciser : raison sociale, matricule fiscal) |
| Bénéficiaire institutionnel | Ministère du Tourisme (et, à terme, ONTT) |
| Finalité | Production de statistiques touristiques agrégées et anonymes sur l'hébergement (para-hôtellerie incluse) |
| Base légale | Convention / mise à disposition à l'État ; intérêt statistique public |

## Nature des données traitées par ce module

**Aucune donnée à caractère personnel n'est traitée par ce module.**

L'anonymisation est réalisée **en amont** du module, par le pipeline
d'agrégation Qayed :

1. Agrégation par dimensions larges (jour, zone au niveau délégation,
   nationalité au format ISO, type d'établissement).
2. Application d'un **seuil d'agrégation k = 10** : aucune statistique portant
   sur moins de dix séjours n'est calculée, stockée ni affichée.

Le résultat est une base de **compteurs** ne contenant ni nom, ni numéro de
document, ni date de naissance, ni adresse, ni identifiant individuel
d'établissement. Il n'existe aucun moyen de ré-identifier une personne ou un
établissement à partir de cette base, y compris par croisement de dimensions
(le seuil k = 10 s'applique à toutes les combinaisons).

> Position INPDP retenue : par l'effet combiné de l'agrégation et du seuil k=10
> réalisés **avant** ce module, les données manipulées par l'Observatoire ne
> sont plus des données à caractère personnel. Le module relève du régime des
> données anonymes.

## Données personnelles en amont (rappel, hors périmètre de ce module)

Le pipeline d'agrégation lit la base opérationnelle nominative (fiches de
police), qui fait l'objet de son **propre** traitement déclaré. Le présent
registre ne couvre que l'Observatoire ; le pont entre les deux est décrit dans
`architecture-etancheite.md` (lecture seule, sens unique, aucun identifiant
recopié).

## Destinataires

- Comptes institutionnels du Ministère du Tourisme, rôle `TOURISME_LECTEUR`
  (lecture seule, MFA, session 15 min d'inactivité).
- Administrateur Qayed, pour le journal d'accès.
- Aucune donnée n'est vendue ni cédée à des tiers. Aucun tracking tiers, aucun
  CDN externe pour les données.

## Sous-traitants / flux transfrontières

- **API Claude (Anthropic)** : utilisée par les deux modules IA. Les requêtes
  transmettent **uniquement** le schéma agrégé, les définitions métier, un pack
  de chiffres déjà agrégés (respectant k=10) et la question de l'utilisateur.
  **Aucune donnée personnelle** n'est transmise (elle n'existe pas dans ce
  module). Voir `reponse-inpdp.md`.

## Durées de conservation

- Agrégats (`agg_sejours`, `agg_couverture`) : conservation statistique longue
  (paramétrable) — données anonymes.
- Journaux (`ia_query_log`, `agg_run_log`, journal d'accès) : durée alignée sur
  la politique de logs Qayed.

## Mesures de sécurité

- Schéma PostgreSQL distinct + rôle en lecture seule (aucun accès au nominatif).
- Validation SQL stricte pour l'IA (SELECT-only, liste blanche, timeout).
- Authentification forte (MFA), rôle dédié, session courte.
- Journal d'accès complet (qui a consulté quoi, quand).
- Module strictement consultatif (aucune action opérationnelle).

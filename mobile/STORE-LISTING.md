# STORE-LISTING.md — Fiches App Store / Google Play (v1)

Contenu prêt à copier pour la soumission. Tout en français (marché tunisien). Éditeur :
**Kasbahost SARL**. Catégorie : **Professionnel / Voyages**.

## Identité

| Champ | Valeur |
|---|---|
| Nom de l'app | **Qayed** |
| Sous-titre (iOS, 30 car.) | Fiches de police numériques |
| Titre court (Android, 30 car.) | Qayed — Fiches voyageurs |
| Bundle ID iOS | `tn.qayed.mobile` |
| Package Android | `tn.qayed.mobile` |
| Site | https://qayed.tn |
| Support | support@qayed.tn |
| Politique de confidentialité | https://qayed.tn/confidentialite |

## Description (FR)

**Accroche (promotional text, 170 car.)**
> Enregistrez vos voyageurs en moins de deux minutes : scan du passeport, fiches de police prêtes à imprimer, supervision en temps réel de vos établissements.

**Description complète**
> Qayed est la solution tunisienne de gestion numérique des fiches de police pour les hébergeurs : maisons d'hôtes, hôtels et locations courte durée.
>
> **Un check-in en moins de 2 minutes**
> Scannez la bande MRZ du passeport : les informations du voyageur sont extraites et vérifiées automatiquement (contrôle des chiffres de contrôle ICAO). Saisie manuelle pour les CIN tunisiennes. Vous validez chaque champ avant d'enregistrer.
>
> **Ne perdez jamais une saisie**
> Réseau instable ? Le check-in est enregistré localement et envoyé automatiquement dès le retour de la connexion.
>
> **Supervisez en temps réel**
> Les responsables reçoivent une notification à chaque check-in, check-out et action de leurs réceptionnistes, sur chacun de leurs établissements. Un centre de notifications garde l'historique complet.
>
> **Multi-établissements**
> Gérez plusieurs biens et basculez de l'un à l'autre sans vous reconnecter. Tableau de bord, historique et check-in sont contextualisés sur l'établissement actif.
>
> **Fiches de police prêtes**
> Générez et partagez des fiches conformes au format `QYD-AAAAMMJJ-NNNN`.
>
> Qayed est opéré par Kasbahost SARL. Un compte Qayed est nécessaire (création sur qayed.tn).

**Mots-clés (iOS, 100 car.)**
> fiche police,check-in,hôtel,maison d'hôtes,passeport,MRZ,voyageurs,hébergement,tunisie,réception

## Captures d'écran (à produire sur appareil / build)

Tailles requises : iPhone 6.7" (1290×2796) et 6.5" ; Android téléphone (min 1080×1920).
Plan de 6 captures, avec bandeau titre FR :

1. **Tableau de bord** — « Toute votre réception en un coup d'œil »
2. **Scan MRZ** — « Scannez le passeport en une seconde »
3. **Check-in en 3 étapes** — « Réservation → Documents → Validation »
4. **Historique & recherche** — « Retrouvez chaque fiche instantanément »
5. **Notifications** — « Supervisez vos établissements en temps réel »
6. **Mes biens** — « Gérez plusieurs établissements »

## Confidentialité — données collectées (App Privacy / Data safety)

Qayed traite des **documents d'identité** (données sensibles). Points à déclarer :

| Donnée | Collectée | Usage | Partage tiers | Stockée sur l'appareil |
|---|---|---|---|---|
| Identité voyageur (nom, DDN, nationalité, n° doc) | Oui | Fonctionnement (fiche de police légale) | Non (hors autorités légales) | Non — traitée en mémoire puis envoyée à l'API ; aucune image de document conservée |
| Email / compte utilisateur | Oui | Authentification | Non | Token en stockage sécurisé (Keychain/Keystore) |
| Jeton push (notifications) | Oui | Notifications | Expo Push (sous-traitant de livraison) | Oui (token opaque) |
| Localisation | Non | — | — | — |

Points clés à cocher :
- **Aucune image de document d'identité n'est stockée** sur l'appareil (traitement en mémoire).
- **Aucun paiement in-app** (la gestion d'abonnement se fait sur qayed.tn).
- **Aucun tracking publicitaire / SDK analytics tiers**.
- Chiffrement en transit (HTTPS) et jetons en stockage sécurisé.
- Compte requis ; suppression de compte via support@qayed.tn (à documenter côté web).

## Permissions déclarées

| Permission | Justification (visible utilisateur) |
|---|---|
| Caméra | Scanner la bande MRZ des passeports |
| Notifications | Alerter les responsables des activités de leurs établissements |

## Notes de version (1.0.0)

> Première version : check-in avec scan MRZ natif, historique, multi-établissements,
> notifications temps réel et mode hors ligne.

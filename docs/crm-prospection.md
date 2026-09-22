# CRM de prospection Qayed (`crm.qayed.tn`)

Outil interne, réservé à l'équipe Qayed, pour démarcher les maisons d'hôtes et hôtels de la médina de Tunis (puis d'autres zones). **Aucun rapport avec l'app cliente `qayed.tn`** : ni les mêmes comptes, ni les mêmes données, ni la même base au sens applicatif — voir « Isolation des données » ci-dessous.

Pour les étapes concrètes de mise en ligne (Railway, DNS, variables), voir `docs/deploiement-crm.md`. Ce document décrit ce que l'outil fait et comment l'exploiter au quotidien.

## Isolation des données

Le registre de prospection (établissements démarchés, statut du pipeline, journal des relances) ne doit **jamais** pouvoir se retrouver mélangé à une fiche voyageur — l'un est un registre commercial interne sans enjeu réglementaire, l'autre est couvert par les obligations fiche de police.

Concrètement :
- Connexion Eloquent Laravel **dédiée** (`prospection`, voir `config/database.php` côté `checktunisia-backend`) : aucun modèle `App\Models\Prospection\*` ne peut lire ou écrire une table de production, même par erreur de code.
- Schéma Postgres séparé (`prospection`, via `search_path`) — même base physique par défaut (aucune ressource Railway supplémentaire au démarrage), bascule vers une base entièrement distincte possible sans changer une ligne de code applicatif (`PROSPECTION_DB_*`).
- Comptes utilisateurs dédiés (`prospection.users`), guard d'authentification dédié (`prospection-token`, `Auth::viaRequest`), jamais le guard Sanctum de production — un jeton client ne peut pas ouvrir le CRM et réciproquement.

## Accès

Deux comptes sont créés au premier déploiement par variables d'environnement (voir `docs/deploiement-crm.md`) : un admin et, optionnellement, un second compte membre. Pas d'inscription publique — la création de compte se fait uniquement :
- au déploiement, par `ProspectionUserSeeder` (rejouable sans écraser un mot de passe déjà changé) ;
- ensuite, depuis l'app, par un admin : Réglages ne l'expose pas encore en UI dans cette version — utiliser `POST /api/v1/prospection/users` (admin uniquement, voir `UserController`).

Session longue durée (jeton valable 1 an) : un outil consulté plusieurs fois par jour pendant une tournée ne doit pas déloger son utilisateur en cours de route. Révocation possible à tout moment (déconnexion, ou désactivation du compte par un admin).

## Écrans

| Écran | Route frontend | Rôle |
|---|---|---|
| Connexion | `/connexion` | E-mail + mot de passe, aucune inscription |
| Aujourd'hui | `/` | Relances dues/en retard + démos du jour, actions rapides (WhatsApp, Fait, Reporter) |
| Pipeline | `/pipeline` | Liste filtrable (statut, zone, priorité, recherche), compteurs par statut |
| Fiche prospect | `/etablissements/:id` | Édition complète, changement de statut, journal, ajout rapide d'action, bouton WhatsApp, suppression RGPD-like (admin) |
| Dashboard | `/dashboard` | Entonnoir du pipeline, taux de réponse, répartition zone/priorité, top objections |
| Modèles de message | `/modeles` | CRUD des modèles WhatsApp (écriture réservée aux admins) |
| Import | `/import` | Assistant en 2 passes (aperçu, puis confirmation) pour le fichier existant (CSV/XLSX) |
| Réglages | `/reglages` | Compte, liens Modèles/Import, export CSV, notifications push, installation PWA, déconnexion |

## Pipeline

```
à contacter → contacté → relancé → démo planifiée → démo faite → essai en cours → client
                                                                 ↘ refus / sans réponse / hors périmètre
```

Pas de machine à états stricte : un commercial peut revenir en arrière (une démo annulée repasse en « contacté ») ou sauter une étape. Deux effets de bord automatiques (voir `EstablishmentStatusUpdater` côté backend) :
- passer en **contacté** ou **relancé** propose une prochaine action à J+4 si aucune date n'est fournie ;
- passer en **démo planifiée** exige une date (celle de la démo).

Tout changement de statut journalise une action `changement_statut` — le pipeline garde toujours une trace de qui a fait quoi, quand.

## Modèles de message et bouton WhatsApp

Le bouton WhatsApp (Fiche prospect, ou icône compacte sur Aujourd'hui) construit un lien `wa.me` pré-rempli à partir d'un modèle actif (variables `{prenom}`/`{etablissement}`) et **n'envoie jamais rien automatiquement** — c'est l'agent qui relit et appuie sur envoyer dans WhatsApp. Une confirmation explicite est ensuite demandée pour journaliser le message comme envoyé.

**Règle métier impérative, rappelée en plusieurs endroits du code** (`ProspectionMessageTemplateSeeder`, `MessageTemplateController`, écran Modèles) : aucun modèle ne doit laisser entendre une transmission automatique des fiches de police aux autorités. Qayed archive et permet d'exporter le registre ; la retransmission reste un geste de l'exploitant client. Le dire autrement en prospection créerait une attente commerciale que le produit ne tient pas.

## Import / Export

- **Import** (`/import`) : CSV ou XLSX, mapping tolérant des en-têtes (accents/casse/ponctuation ignorés, synonymes reconnus), aperçu sans écriture avant toute validation humaine, doublons détectés par nom avec résolution par ligne (créer / fusionner / ignorer). Idempotent : rejouer le même import ne crée jamais de doublon.
- **Export** (Réglages → « Exporter en CSV ») : l'intégralité du registre, mêmes colonnes que l'import, disponible à tout moment.

## Notifications push

Web Push standard (RFC 8030) signé VAPID — pas de SDK propriétaire, pas de compte externe. Voir `docs/deploiement-crm.md` pour générer et poser les clés VAPID.

Trois déclencheurs exacts, **jamais d'auto-notification** (sauf le bouton de test, volontaire) :
1. **Récap du matin** — relances dues + démos du jour, à l'heure choisie par chaque utilisateur (Réglages, grille 15 minutes : la commande planifiée tourne toutes les 15 minutes, une heure hors de cette grille ne serait jamais atteinte exactement).
2. **Rappel de démo** — moins d'une heure avant une démo planifiée, envoyé à toute l'équipe (le modèle de données n'a pas de notion de « responsable » par prospect).
3. **Activité de l'équipe** — quand un collègue journalise une bonne nouvelle (réponse reçue, essai activé, avancée notable du pipeline vers démo planifiée/essai en cours/client) — jamais pour un simple appel ou une note, et jamais vers l'auteur de l'action lui-même.

Chacun règle ses préférences dans Réglages (activer/désactiver par déclencheur, heure du récap) sans droits admin nécessaires.

## Garde-fous

- **RGPD-like** : suppression définitive d'un prospect et de tout son journal, réservée aux admins (Fiche prospect, section rouge en bas).
- **Non indexé** : `robots.txt` (`Disallow: /`) et `<meta name="robots" content="noindex, nofollow, noarchive">` sur toutes les pages — outil interne, jamais dans un moteur de recherche.
- **Pas d'envoi WhatsApp automatique** : toujours un lien `wa.me` ouvert par un geste explicite, jamais un envoi programmatique.
- **Isolation des données** : voir en tête de ce document.
- **Aucune inscription publique** : les comptes se créent uniquement par seed ou par un admin.

## Variables d'environnement

### Backend (`checktunisia-backend`)

| Variable | Rôle |
|---|---|
| `PROSPECTION_ADMIN_NAME` / `_EMAIL` / `_PASSWORD` | Compte admin seedé — vide = compte non créé (déploiement non bloquant) |
| `PROSPECTION_MEMBER_NAME` / `_EMAIL` / `_PASSWORD` | Second compte seedé (optionnel) |
| `PROSPECTION_DB_HOST` / `_PORT` / `_DATABASE` / `_USERNAME` / `_PASSWORD` | Vide = même base Postgres que la production, schéma séparé. Posées = base entièrement distincte |
| `PROSPECTION_DB_SCHEMA` | Nom du schéma Postgres (défaut `prospection`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Notifications push — voir `docs/deploiement-crm.md` pour les générer |
| `VAPID_SUBJECT` | Contact administratif VAPID (défaut `mailto:contact@qayed.tn`) |
| `CORS_ALLOWED_ORIGINS` | Doit inclure `https://crm.qayed.tn` (additive à la liste existante) |

### Frontend (`checktunisia`, build `Dockerfile.crm`)

| Variable | Rôle |
|---|---|
| `VITE_CRM_API_URL` | URL complète de l'API (`https://api.qayed.tn/api/v1/prospection` en production) — figée au build, pas à l'exécution |
| `VITE_VAPID_PUBLIC_KEY` | Même valeur que `VAPID_PUBLIC_KEY` côté backend — clé publique, sans risque à embarquer dans le bundle |

## Développement local

Deux serveurs distincts, comme en production :

```bash
# Backend (depuis checktunisia-backend/)
php artisan serve --port=8000

# Frontend CRM (depuis checktunisia/)
npm run dev:crm
```

`vite.crm.config.ts` proxifie `/api` vers `http://localhost:8000` en dev — `VITE_CRM_API_URL` peut rester vide en local.

## Tests

- Backend : `php artisan test --filter=Prospection` (ou la suite complète). Modèles de test notables : rendu des templates + encodage `wa.me` côté frontend, normalisation E.164 des numéros tunisiens, transitions de statut, idempotence de l'import, les 3 déclencheurs de notification avec leurs cas limites.
- Frontend : `npx vitest run` (dont `src/crm/lib/whatsapp.test.ts`, `src/crm/lib/push.test.ts`).

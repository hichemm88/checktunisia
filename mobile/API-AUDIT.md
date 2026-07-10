# API-AUDIT.md — Audit de l'API Qayed (Phase 0)

> Objectif : lister les endpoints réellement disponibles côté backend AVANT de coder l'app
> mobile, et identifier ce qui manque (notifications push).
>
> **Méthode.** Le backend Qayed est déployé séparément (Railway) et n'est **pas** présent
> dans ce dépôt (qui contient le frontend web). La source d'autorité utilisée pour cet audit
> est donc la **couche client API du frontend web** (`src/api/*.ts`, `src/lib/api.ts`), qui
> consomme déjà l'intégralité des endpoints en production. Chaque endpoint ci-dessous est
> tiré du code web réellement en service — l'app mobile réutilise ces contrats **tels quels**.

## 1. Configuration & conventions

| Élément | Valeur |
|---|---|
| Base URL (prod) | `https://checktunisia-backend-production.up.railway.app/api/v1` |
| Base URL (dev)  | `VITE_API_URL` côté web ; `extra.apiUrl` dans `app.json` côté mobile |
| Auth | `Authorization: Bearer <token>` (JWT, expiration ~8 h) |
| Établissement actif | En-tête `X-Property-Id: <uuid>` sur chaque requête |
| Enveloppe succès | `{ "data": ... , "meta"?: {...} }` |
| Enveloppe erreur | `{ "errors": [{ "code": "...", "message": "..." }] }` |
| Pagination | `?page=`, `?per_page=` → `meta.total / current_page / last_page` |
| Refresh token | `POST /auth/refresh` → `{ data: { token, expires_at } }` |

**Style Laravel** : verbes REST, soft-deletes côté serveur, réponses enveloppées.

## 2. Authentification

| Méthode | Endpoint | Usage | Statut mobile |
|---|---|---|---|
| POST | `/auth/login` | email + password → `{ token, expires_at, user }` ou `{ requires_2fa, partial_token }` | ✅ Utilisé (login) |
| POST | `/auth/logout` | Invalide la session | ✅ Utilisé |
| GET  | `/auth/me` | Utilisateur courant | ⏳ Dispo (refresh silencieux) |
| POST | `/auth/refresh` | Renouvelle le token | ⏳ Dispo (à câbler Phase 1.5) |
| POST | `/auth/2fa/verify` | TOTP (comptes autorité) | ⛔ Hors périmètre mobile (autorités = web) |
| POST | `/auth/password/forgot` | Lien de réinitialisation | ⏳ Dispo |
| POST | `/auth/password/reset` | Définir/réinitialiser mot de passe | ⏳ Dispo |

> **Rôles** (`user.role`) : `platform_admin`, `hotel_admin`, `receptionist`, `authority_user`.
> Mapping mobile (§4 du cadrage) : `receptionist` → **réceptionniste**, `hotel_admin`/
> `platform_admin` → **manager**. `authority_user` = hors périmètre (renvoyer vers le web).

## 3. Tableau de bord

| Méthode | Endpoint | Retour |
|---|---|---|
| GET | `/hotel/dashboard` | `today{arrivals_expected, arrivals_done, currently_present, departures_today, occupancy_rate}`, `month{check_ins_total}`, `weekly_trend[]`, `recent_check_ins[]`, `subscription`, `expiry_alerts[]`, `pending_watchlist_hits` |

✅ Couvre 100 % de l'écran Accueil natif (bandeau, KPI, tendance 7 j, récents).

## 4. Check-ins / fiches

| Méthode | Endpoint | Usage |
|---|---|---|
| GET | `/hotel/check-ins` | Liste (filtres/pagination) → Historique |
| GET | `/hotel/check-ins/:id` | Détail d'une fiche |
| POST | `/hotel/check-ins` | Créer (brouillon) — Réservation |
| PATCH | `/hotel/check-ins/:id` | Modifier |
| POST | `/hotel/check-ins/:id/complete` | Terminer un brouillon |
| POST | `/hotel/check-ins/:id/checkout` | Check-out (`actual_check_out_date`) |
| POST | `/hotel/check-ins/:id/guests` | Ajouter un voyageur (document nesté sous `document{}`) |
| DELETE | `/hotel/check-ins/:id/guests/:guestId` | Retirer un voyageur |
| DELETE | `/hotel/check-ins/:id` | Supprimer (admin, soft-delete) |

Statuts : `draft` (Brouillon) · `active` (Actif) · `completed` (Terminé) · `cancelled` · `no_show`.

## 5. Scan / OCR document

| Méthode | Endpoint | Usage |
|---|---|---|
| POST | `/hotel/check-ins/:id/scans` | Upload image (`multipart`, `passport_image`, `document_side`) → OCR serveur |
| GET | `/hotel/scans/:scanId/status` | Polling OCR → `{ status, confidence, extracted{...} }` |

> ⚠️ En natif (Phase 2), le MRZ est décodé **sur l'appareil** (ML Kit + checksums ICAO 9303).
> Cet endpoint serveur reste disponible en secours / pour la CIN. Décision Phase 2 : envoyer
> les champs MRZ validés via `POST /guests` (contrat existant) plutôt que l'image brute —
> à confirmer avec l'équipe backend.

## 6. Organisation, biens & chambres

| Méthode | Endpoint | Usage |
|---|---|---|
| GET | `/hotel/organization` | Société + `properties[]` + `total_rooms` → Mes biens |
| PATCH | `/hotel/organization` | Modifier la société |
| GET | `/hotel/my-properties` | Biens rattachés au compte → sélecteur d'établissement actif |
| GET | `/hotel/organization/properties` | Liste des biens |
| POST/PATCH/DELETE | `/hotel/organization/properties[/:id]` | CRUD bien (manager) |
| GET | `/hotel/organization/properties/:id/rooms` | Chambres d'un bien |
| POST | `.../rooms` · `.../rooms/bulk` | Ajout unitaire / en masse |
| PATCH/DELETE | `.../rooms/:roomId` | Modifier / supprimer |
| GET | `/hotel/rooms` | Chambres du bien actif (pour le check-in) |

## 7. Paramètres / équipe / activité / abonnement

| Méthode | Endpoint | Usage |
|---|---|---|
| PATCH | `/profile` · POST `/profile/password` | Profil, mot de passe |
| GET/POST/PATCH/DELETE | `/hotel/users[...]` | Équipe (manager) |
| GET | `/hotel/subscription` | Abonnement (lecture seule mobile) |
| GET | `/hotel/profile` · PATCH | Fiche établissement |
| GET | `/hotel/activity` | **Journal d'activité** — source du centre de notifications |
| GET | `/hotel/invoices[...]` | Factures (web-first) |
| GET | `/hotel/watchlist-hits` · POST `.../acknowledge` | Alertes watchlist |

> `/hotel/activity` existe déjà et journalise les actions du personnel : c'est la base
> naturelle du **centre de notifications** mobile (§5.8), à compléter en Phase 3.

## 8. Endpoints MANQUANTS — à ajouter en Phase 3 (Notifications push)

Ces routes n'existent pas encore et devront être créées côté backend, en respectant les
conventions ci-dessus (enveloppe `data`, `X-Property-Id`, style Laravel) :

| Méthode | Endpoint proposé | Rôle |
|---|---|---|
| POST | `/devices` | Enregistrer/rafraîchir un token push (FCM/Expo) — table `device_tokens` |
| DELETE | `/devices/:token` | Supprimer un token à la déconnexion |
| GET | `/notifications?property=&type=&page=` | Historique paginé (table `notifications`) |
| POST | `/notifications/:id/read` | Marquer une notification comme lue |

**Déclencheurs côté serveur** (à greffer, non bloquant, envoi async) sur : check-in
enregistré, check-out, fiche modifiée, fiche annulée, fiche en attente > 30 min.
**Ciblage** : topics FCM `property_{id}` — le manager s'y abonne, la réceptionniste non.

## 9. Conclusion Phase 0

- **Tous** les endpoints nécessaires aux écrans v1 (Accueil, Check-in, Historique, Détail,
  Mes biens, Paramètres) **existent déjà** et sont réutilisés tels quels.
- Le seul chantier backend est le **système de notifications** (tables + 4 endpoints +
  publication FCM), planifié en Phase 3.
- Aucun blocage identifié pour démarrer les Phases 1–2 côté app.

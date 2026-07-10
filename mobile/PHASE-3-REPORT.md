# PHASE-3-REPORT.md — Notifications push

Phase 3 couvre **deux dépôts** : le backend (`checktunisia-backend`) et l'app mobile
(`checktunisia/mobile`). Choix d'architecture clé : **Expo Push** (tokens `ExponentPushToken`)
plutôt que FCM brut — Expo relaie vers FCM (Android) et APNs (iOS) sans compte de service
Firebase, ce qui convient à une app Expo et simplifie l'ops. Le ciblage se fait **par
destinataire** (les managers d'un bien), pas par topic FCM — équivalent fonctionnel de
« topic `property_{id}` », et cohérent avec le modèle de rôles existant.

## Backend (`checktunisia-backend`)

Branche : `claude/qayed-mobile-native-b6mefx`. Conventions Laravel 12 respectées (UUID,
enveloppe `{data}`/`{errors}`, Sanctum, Spatie, migrations `gen_random_uuid()`).

### Nouveau schéma
- `device_tokens` — `user_id`, `token` (unique), `platform`, `last_used_at`.
- `app_notifications` — une ligne **par destinataire** : `user_id`, `hotel_id`,
  `check_in_id`, `actor_id`, `type`, `title`, `body`, `data` (jsonb), `read_at`. (Nommée
  `app_notifications` pour ne pas entrer en conflit avec la table `notifications` du canal
  database de Laravel.)

### Endpoints (préfixe `api/v1`)
- `POST /devices` — enregistrer/rafraîchir un token (tout utilisateur authentifié)
- `DELETE /devices/{token}` — supprimer à la déconnexion
- `GET /notifications?type=&property=&page=` — historique paginé (manager)
- `GET /notifications/unread-count` — compteur non-lus (badge)
- `POST /notifications/{id}/read` — marquer lu
- `POST /notifications/read-all` — tout marquer lu

### Déclenchement (§6.1)
`PushNotificationService::notifyCheckInEvent()` est appelé depuis `CheckInService`
(`complete` → `check_in`, `checkout` → `check_out`, `cancel` → `fiche_cancelled`) et depuis
`CheckInController::update()` (`fiche_updated`), **juste après l'`AuditLogger::log`**. Il :
1. résout les destinataires = managers (`hotel_admin`) attachés au bien, **hors acteur** ;
2. insère une `AppNotification` par destinataire (synchrone, dans la transaction — garantit
   que le centre reflète l'événement même si le push échoue) ;
3. dispatche `SendExpoPushJob` (**queue Redis**, `afterCommit`) qui poste les messages à
   l'API Expo Push par lots de 100.

Le tout est **enveloppé dans un try/catch qui journalise et n'échoue jamais** — un push ne
peut pas bloquer ni faire échouer un check-in (§6.3, critère 3/6).

### Vérifié
- `php -l` sur les 11 fichiers créés/modifiés → aucun erreur de syntaxe (PHP 8.4).

### `fiche_pending` — fait
- Commande `checkins:notify-pending` (`app/Console/Commands/NotifyPendingCheckIns.php`),
  planifiée **toutes les 10 min** (`routes/console.php`, `withoutOverlapping`). Alerte les
  managers d'un brouillon avec voyageurs saisis mais non validé depuis > 30 min ; notifié une
  seule fois (une ligne `fiche_pending` existante inhibe le ré-envoi).

### Reste à faire (backend, ops)
- Exécuter `php artisan migrate` sur l'environnement cible, s'assurer qu'un **worker de queue**
  tourne (`php artisan queue:work`) pour l'envoi des push, et que le **scheduler** est actif
  (`php artisan schedule:work` / cron) pour `checkins:notify-pending`.

## App mobile (`checktunisia/mobile`)

- **`src/lib/push.ts`** — `configureNotifications` (handler foreground + canal Android),
  `registerPushToken` (permission → token Expo → `POST /devices`), `unregisterPushToken`
  (déconnexion), listeners + **deep linking** (tap → `/fiche/{check_in_id}` sinon `/notifications`).
- **`src/api/notifications.ts`** — client des 6 endpoints ci-dessus.
- **Écran explicatif** (`app/notifications-permission.tsx`) affiché **avant** le prompt système
  (§6.4), une seule fois, pour les managers.
- **Centre de notifications** (`app/notifications.tsx`) — historique **serveur** (source de
  vérité), filtres par type, marquage lu / tout lu, tap → détail de la fiche.
- **Cloche + badge non-lus** dans le header (manager uniquement, §5.2), rafraîchi toutes les 60 s.
- **Cycle de vie** câblé dans `app/_layout.tsx` (configure + listeners + invalidation à la
  réception) et `app/(tabs)/_layout.tsx` (bootstrap manager : explainer puis enregistrement du
  token). Déconnexion → `unregisterPushToken` (header + Paramètres).
- Réceptionnistes : ne reçoivent rien (pas de cloche, pas d'enregistrement) — conforme §4.

### Vérifié
- `npm run typecheck` → **0 erreur**. `npx expo config` → plugins (dont `expo-notifications`)
  résolus.

### Reste à faire (app)
- **`eas.json` + projectId EAS** : le token Expo de production requiert un `projectId`
  (`extra.eas.projectId`). En dev il fonctionne via Expo Go/dev build. À renseigner en Phase 4.
- Les push réels nécessitent une **development/production build** (permissions natives) — pas
  testable dans Expo Go pour APNs.

## Critères d'acceptation v1 couverts
- **#3** (push manager < 10 s) : envoi async via Expo dès la validation — à mesurer en réel.
- **#6** (centre reflète 100 % des événements) : les lignes `app_notifications` sont écrites
  **synchroniquement** dans la transaction du check-in, indépendamment du succès du push.

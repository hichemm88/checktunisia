# Qayed Mobile (app native)

Application mobile native de Qayed (qayed.tn) — React Native + Expo. Elle **réplique l'UX de
l'app web** (mêmes écrans, libellés FR, logique d'établissement actif) et y ajoute le natif :
scan MRZ, notifications push, mode offline.

> Cadrage complet : `PROMPT-CLAUDE-CODE-QAYED-MOBILE.md` (racine du dépôt).
> Audit backend : [`API-AUDIT.md`](./API-AUDIT.md). Avancement : [`PHASE-0-REPORT.md`](./PHASE-0-REPORT.md).

## Stack

- **Expo SDK 52** + **Expo Router** (routes typées, navigation fichier)
- **TanStack Query** (cache/retry) · **Zustand** (état auth)
- **expo-secure-store** (token) · **AsyncStorage** (préférences)
- **axios** vers l'API Qayed existante (source de vérité — non recréée)

## Démarrer

```bash
cd mobile
npm install
npx expo start          # QR code → Expo Go (iOS/Android)
npm run typecheck       # vérification TypeScript
```

L'URL de l'API se configure via `expo.extra.apiUrl` dans `app.json`
(défaut : backend de production Railway).

## Structure

```
mobile/
├─ app/                    # routes (Expo Router)
│  ├─ _layout.tsx          # providers + garde d'auth + hydratation
│  ├─ index.tsx            # redirection login/tabs
│  ├─ login.tsx            # connexion
│  ├─ (tabs)/              # 5 onglets : Accueil, Check-in, Historique, Mes biens, Paramètres
│  └─ fiche/[id].tsx       # détail d'une fiche (deep-link cible des notifications)
├─ src/
│  ├─ theme/theme.ts       # tokens de marque (« l'encre du cachet officiel »)
│  ├─ i18n/fr.ts           # libellés FR (miroir du web)
│  ├─ api/                 # clients par domaine (auth, dashboard, check-ins, organization)
│  ├─ lib/                 # axios, stockage sécurisé, formatage
│  ├─ stores/authStore.ts  # session + établissement actif
│  └─ components/          # Avatar, StatusBadge, AppHeader, QayedSeal, StateView
```

## État d'avancement

| Phase | Périmètre | Statut |
|---|---|---|
| 0 | Audit API + fondations (thème, auth, login) | ✅ |
| 1 | Auth + navigation 5 onglets + Mes biens (établissement actif) | ✅ |
| 2 | Dashboard, **Check-in + scan MRZ natif (checksums ICAO 9303)**, Historique, file offline | ✅ (test terrain à faire) |
| 3 | Notifications push (backend + app) | ⛔ à faire |
| 4 | Polish + soumission stores | ⛔ à faire |

> **Scan MRZ** : nécessite une *development build* (`eas build --profile development` ou
> `expo run:android`), pas Expo Go. Le noyau de validation MRZ (`src/lib/mrz.ts`) est vérifié
> contre l'échantillon ICAO. `npm run typecheck` passe sans erreur.

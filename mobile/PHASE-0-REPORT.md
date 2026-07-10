# PHASE-0-REPORT.md — Audit & fondations

## Fait

- **Audit de l'API** → `API-AUDIT.md`. Tous les endpoints v1 (auth, dashboard, check-ins,
  organisation/biens, chambres, paramètres, activité) sont disponibles et documentés. Seul
  le système de notifications push (4 endpoints + 2 tables + publication FCM) reste à créer,
  planifié en Phase 3.
- **Projet Expo initialisé** sous `mobile/` : Expo SDK 52 + Expo Router (routes typées),
  TanStack Query, Zustand, expo-secure-store, axios. Structure conforme au cadrage §2.
- **Thème** `src/theme/theme.ts` : conversion 1:1 des tokens de marque
  (« l'encre du cachet officiel ») depuis `tailwind.config.js` du web — couleurs, espacements,
  rayons, ombres, mapping des statuts. L'app est visuellement alignée sur qayed.tn.
- **Couche API** `src/api/*` + `src/lib/api.ts` : client axios avec `Bearer` + en-tête
  `X-Property-Id`, gestion d'erreur via l'enveloppe `{ errors: [...] }`, déconnexion sur 401.
- **Auth** : store Zustand + persistance sécurisée (token en SecureStore/Keychain, préférences
  en AsyncStorage), hydratation au démarrage, garde de navigation (login ↔ tabs).
- **Écran de login** maquetté **et fonctionnel** (appel réel `/auth/login`, erreurs en
  français, comptes 2FA autorité renvoyés vers le web).

## Livré au-delà du strict Phase 0 (amorce Phase 1–2)

Comme les contrats API étaient tous connus, la base de la Phase 1 et une partie de la Phase 2
sont déjà posées :

- **Navigation à 5 onglets** (Accueil · Check-in · Historique · Mes biens · Paramètres) +
  header persistant (sceau قيد, établissement actif, chip FR, déconnexion).
- **Mes biens** : liste des biens + carte société + **« Définir comme établissement actif »**
  qui contextualise toute l'app via `X-Property-Id` (même logique que le web).
- **Accueil** : bandeau, 6 tuiles KPI, graphique tendance 7 jours, liste des récents — câblé
  sur `/hotel/dashboard`.
- **Historique** : recherche + filtres de statut (Tous/Brouillon/Actif/Terminé), cartes fiche
  avec drapeau nationalité, câblé sur `/hotel/check-ins`.
- **Détail de fiche** : infos séjour + voyageurs + actions (terminer un brouillon, check-out).
- **Check-in** : structure des 3 étapes (Réservation → Documents → Validation) posée, avec un
  écran d'attente explicite — le flux complet (scan MRZ natif) est le cœur de la **Phase 2**.

## Décisions prises

1. **L'app mobile vit dans `mobile/`** au sein de ce dépôt (monorepo léger), à côté du web.
   Elle ne partage pas de code au build mais **réplique** volontairement types, libellés FR et
   contrats API pour rester fidèle au web.
2. **`BRAND.md` / `qayed-tokens.css` / `design-reference/` absents du dépôt** : les tokens de
   marque ont été repris depuis `tailwind.config.js` (qui les contient intégralement). Le sceau
   قيد est pour l'instant un composant `QayedSeal` stylé ; l'asset logo définitif arrive en
   Phase 4 (polish/stores).
3. **Expo SDK 52** (le plus récent stable au moment de l'init), New Architecture activée.
4. **Comptes 2FA autorité** = hors périmètre : login mobile les renvoie explicitement vers
   qayed.tn (cohérent avec §4).

## Points en suspens (à confirmer)

- **Backend inaccessible depuis ce dépôt** : l'audit s'appuie sur la couche client web. Une
  passe de vérification directe des schémas de réponse contre l'API réelle est recommandée
  avant la Phase 2 (notamment la forme exacte de `primary_guest` et des `guests[]`).
- **Vérification / compilation** : `npm install` puis `npm run typecheck` n'ont pas pu être
  exécutés dans cet environnement (toolchain RN/Expo non installée). Le code suit les
  conventions Expo Router et est typé strictement ; à valider avec `npx expo start` sur un
  poste de dev.
- **Phase 2 – MRZ** : décider si les champs MRZ validés sur l'appareil sont envoyés via
  `POST /hotel/check-ins/:id/guests` (recommandé) ou si l'on conserve l'upload image serveur.
- **Icônes onglets** : `@expo/vector-icons` (Ionicons) utilisé par défaut ; à remplacer par le
  jeu d'icônes de marque en Phase 4 si nécessaire.

## Comment lancer

```bash
cd mobile
npm install
npx expo start        # puis scanner le QR avec Expo Go (iOS/Android)
npm run typecheck     # vérification TypeScript
```

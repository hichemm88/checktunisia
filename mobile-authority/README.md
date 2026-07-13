# Qayed — Application mobile Autorité (الداخلية)

Application mobile **côté autorités** (Ministère de l'Intérieur) de la plateforme
Qayed — destinée aux **agents de terrain** : contrôle, vérification, alerte.
Elle complète le dashboard web autorités (bureau/analyse) : **le mobile, c'est le terrain**.

> Statut : **prototype de démo ministérielle**. La qualité perçue de la démo prime
> sur l'exhaustivité fonctionnelle. Le scan de QR code établissement est **hors périmètre**.

---

## Stack

- **React Native + Expo (SDK 51)** — EAS builds pour les tests
- **React Navigation** (bottom-tabs + native-stack) — 4 onglets, pas de hamburger
- **i18next / react-i18next** — AR (défaut) / FR / EN, **RTL complet** (`I18nManager`)
- **expo-local-authentication** (biométrie) + **expo-secure-store** (session)
- **expo-location** (géolocalisation des contrôles) + **expo-notifications** (FCM)
- Design system Qayed partagé (tokens inchangés — `src/theme/tokens.ts`)

## Démarrage

```bash
cd mobile-authority
npm install
npm start          # puis 'a' (Android) / 'i' (iOS) / QR Expo Go ou dev build
npm run typecheck  # tsc --noEmit
```

En **mode démo** (`app.json → extra.demoMode: true`), l'app fonctionne sans
backend : la couche `src/api/services.ts` renvoie le jeu seedé (`src/api/seed.ts`).
Passer `demoMode` à `false` bascule sur l'API réelle (mêmes endpoints que le web).

## Les 10 écrans (§7)

| # | Écran | Fichier |
|---|---|---|
| 1 | Splash (قيد + الداخلية) | `screens/SplashScreen.tsx` |
| 2 | Connexion (identifiant + biométrie) | `screens/LoginScreen.tsx` (+ `LockScreen`) |
| 3 | Accueil (alertes → stats → vérifs) | `screens/HomeScreen.tsx` |
| 4 | Vérifier — caméra MRZ | `screens/MrzScanScreen.tsx` |
| 5 | Vérifier — saisie manuelle | `screens/ManualEntryScreen.tsx` |
| 6 | Résultat 3 états (vert/ambre/rouge) | `screens/ResultScreen.tsx` |
| 7 | Établissements — liste + recherche | `screens/EstablishmentsScreen.tsx` |
| 8 | Établissement — détail + voyageurs | `screens/EstablishmentDetailScreen.tsx` |
| 9 | Alerte watchlist — détail | `screens/AlertDetailScreen.tsx` |
| 10 | Paramètres + Mon activité | `screens/SettingsScreen.tsx` (+ `ActivityScreen`) |

## Fonctionnalités → code

- **F1 Sécurité** — `auth/AuthContext.tsx` : biométrie obligatoire à chaque
  ouverture, fallback PIN 6 chiffres (`LockScreen`), session courte (15 min
  d'inactivité), **aucune donnée watchlist en cache** (tout en réseau temps réel,
  `services.ts` + `OfflineNotice`).
- **F2 Vérification** — `mrz/` + `ResultScreen` : scan MRZ, saisie manuelle,
  écran de résultat à 3 états, animation du cachet (`ResultStamp`, < 600 ms),
  chaque vérification tracée avec géolocalisation (`runVerification.ts`).
- **F3 Accueil** — alertes d'abord, 3 stats, 5 dernières vérifications.
- **F4 Établissements** — liste zone (tri proximité/alpha), fiche + voyageurs
  présents, indicateur de fraîcheur, `tel:` responsable, « contrôle effectué ».
- **F5 Push FCM** — `notifications/push.ts` + `navigation/navigationRef.ts` :
  alerte critique → push sobre (sans emoji), deep-link robuste vers le détail.
- **F6 Audit** — `api/auditStore.ts` + `ActivityScreen` : journal lecture seule.
- **F7 Paramètres** — langue, notifications par sévérité, central, déconnexion.

## Points de vigilance implémentés (§9)

1. **Deep-links push** — géré proprement : une alerte disparue / hors zone
   affiche un message clair, jamais « Ressource not found » (`AlertDetailScreen`).
2. **Libellés jamais tronqués** — `DataRow`, `StatCard` n'ont pas de troncature
   des libellés (bug web évité).
3. **Aucun cache watchlist** — jamais, même « pour la performance ».
4. **RTL** — testable sur chaque écran (`textStart`/`textEnd`, chevrons inversés
   `components/icons.ts`, données MRZ en mono LTR).
5. **Géolocalisation** — permission demandée **au premier scan** avec explication,
   jamais au lancement (`lib/geo.ts` : `ensureLocationPermission` vs
   `getLocationIfGranted`).
6. **Aucun emoji** — nulle part (push comprise). Icônes vectorielles + badge couleur.

## Intégration du module MRZ réel

`src/mrz/MrzScannerView.tsx` contient un viewfinder **simulé** (mode démo). Pour
la production, remplacer son contenu par le module **`react-native-vision-camera`
+ frame processor MRZ réutilisé tel quel depuis l'app hébergeur** (parsing déjà
nettoyé/validé). Le contrat reste identique : appeler `onDetected(mrz: MrzData)`.
Le reste de l'app est agnostique de la source du scan.

## Distribution iOS (§9.5)

App gouvernementale à **distribution restreinte** : viser **Apple Business
Manager / distribution custom** (hors App Store publique). Pour la phase démo,
**EAS internal distribution** suffit.

## Assets

`assets/*.png` sont des **placeholders de marque** (fond encre nuit + keycap
violet) générés pour que l'app build. À remplacer par les assets finaux (logo
قيد + badge الداخلية) avant livraison.

Voir **[DEMO.md](./DEMO.md)** pour le scénario scripté de la démonstration.

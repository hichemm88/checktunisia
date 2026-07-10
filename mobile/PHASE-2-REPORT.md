# PHASE-2-REPORT.md — Dashboard, Check-in + scan MRZ, Historique, Offline

## Fait

### Scan MRZ natif (§7) — le cœur du projet
- **`src/lib/mrz.ts`** : parseur TD3 (passeports, 2×44) + validation des check digits ICAO 9303
  (pondération 7-3-1, chiffres de contrôle numéro/naissance/expiration + **check digit
  composite**). Un résultat n'est accepté **que si tous les contrôles passent** — le meilleur
  filtre anti-erreur OCR. Pur TypeScript, sans dépendance native.
  - **Vérifié** contre l'échantillon canonique ICAO (UTO / ERIKSSON ANNA MARIA) : parsing
    correct (noms, dates avec inférence de siècle, sexe, nationalité) **et** rejet d'une MRZ
    au chiffre de contrôle corrompu.
- **`app/scan-mrz.tsx`** : caméra `react-native-vision-camera` + OCR temps réel ML Kit
  (`react-native-vision-camera-text-recognition`), passage worklet→JS via `useRunOnJS`
  (`react-native-worklets-core`). Cadre de guidage, **torche** (bouton + auto-activation après
  4 s sans lecture — basse lumière), **vibration de succès** (`expo-haptics`). Aucune image de
  document n'est stockée : les frames sont traitées en mémoire, seul le résultat validé transite.
  - Dégradation gracieuse : sans permission caméra / hors development build (Expo Go) → écran
    de repli qui bascule vers la saisie manuelle.
- **Écran de validation obligatoire après scan** (`app/checkin-manual.tsx`) : le résultat MRZ
  pré-remplit un formulaire où **chaque champ est modifiable**, avec l'avertissement explicite
  « Vérifiez l'orthographe des noms (translittération arabe/latin) ». Impossible d'enregistrer
  un voyageur sans passer par cet écran.

### Flux de check-in 3 étapes (§5.3)
- **`app/(tabs)/check-in.tsx`** : wizard **Réservation → Documents → Validation** avec
  libellés FR identiques au web.
  - Étape 1 : sélecteur de chambre (optionnel, « Sans chambre assignée »), référence
    réservation, dates arrivée/départ, compteurs Adultes/Enfants.
  - Étape 2 : boutons **Scanner passeport (MRZ)** et **Saisie manuelle (CIN)**, liste des
    voyageurs ajoutés (plusieurs par fiche), retrait possible.
  - Étape 3 : récapitulatif + relecture voyageur par voyageur, puis **Finaliser**.
- **CIN tunisienne** : saisie manuelle du numéro à **8 chiffres** (validation `^\d{8}$`),
  nationalité TUN par défaut — pas d'OCR CIN promis (conforme au hors-périmètre v1).

### File d'attente offline (§8)
- **`src/stores/queueStore.ts`** : à la finalisation, si le réseau échoue (**aucune réponse
  serveur**), l'unité complète (création → ajout de chaque voyageur → complétion) est
  persistée localement (AsyncStorage) avec statut « en attente », et **rejouée automatiquement**.
  Le contexte d'établissement (`X-Property-Id`) est capturé à l'enregistrement pour que les
  renvois ciblent le bon bien.
- **Renvoi automatique** au retour de connexion via `@react-native-community/netinfo`
  (écouteur dans `app/_layout.tsx`) + tentative immédiate à l'enregistrement.
- **Indicateur visuel** `PendingBanner` (bannière « N check-ins en attente d'envoi » +
  Réessayer), affiché sur le check-in.
- Une erreur **serveur** (réponse 4xx/5xx) n'est pas mise en file : elle est affichée à
  l'utilisateur — seuls les échecs réseau sont mis en attente.

### Divers
- **`src/lib/countries.ts`** : mapping alpha-3 → alpha-2 (ISO 3166) porté du web — le backend
  et la MRZ utilisent l'alpha-3 (« TUN »), les drapeaux emoji sont dérivés en alpha-2. `flagEmoji`
  gère désormais les deux formats.
- API check-ins étendue (`create`, `addGuest` avec `document{}` nesté, `rooms.list`) — contrats
  **identiques au web**, envoi des champs MRZ validés via `POST /guests` (décision confirmée).

## Vérification effectuée dans cet environnement
- `npm install` (992 paquets, Expo SDK 52) → OK.
- `npm run typecheck` (**`tsc --noEmit`**) → **0 erreur** sur tout le projet (Phases 0–2).
- `npx expo config` → app.json + config plugins (vision-camera) résolus.
- Logique MRZ exécutée sous Node contre l'échantillon ICAO → parsing correct + rejet des
  MRZ corrompues.

## Décisions prises
1. **MRZ validé côté appareil → `POST /hotel/check-ins/:id/guests`** (document nesté), plutôt
   que l'upload d'image serveur. L'endpoint image reste dispo en secours (documenté dans l'audit).
2. **Draft local jusqu'à la finalisation** (pas de brouillon serveur créé à l'étape 1) : rend
   tout le flux résistant au réseau (§8). Compromis : un abandon en cours de saisie ne laisse
   pas de brouillon côté serveur — acceptable v1, à revoir si le suivi des brouillons devient
   nécessaire.
3. **Saisie de dates au format `AAAA-MM-JJ`** (champs texte) pour v1 — un date-picker natif
   (`@react-native-community/datetimepicker`) est un ajout de confort en Phase 4.

## Points en suspens / à valider sur un poste de dev
- **Build de développement requis** : `react-native-vision-camera` + frame processors ne
  fonctionnent pas dans Expo Go → `eas build --profile development` (ou `expo run:android/ios`).
  Le wiring du frame processor (API du plugin ML Kit) est correct au niveau des types, à
  valider en conditions réelles.
- **Test terrain (jalon Phase 2)** : à Dar Majoul avec Achwak/Ranim sur de vrais passeports —
  mesurer le taux de réussite MRZ (> 80 % visé) et le temps de check-in (< 2 min visé).
- **Chiffrement au repos de la file offline** : la file contient des données personnelles ;
  v1 stocke en AsyncStorage. Durcissement recommandé avant soumission stores (Phase 4) :
  clé dans SecureStore + chiffrement du payload.
- **Question produit** : la date de départ doit-elle être strictement postérieure à l'arrivée
  (contrôle bloquant) ? Actuellement non contraint côté app.

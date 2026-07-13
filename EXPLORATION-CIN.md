# EXPLORATION-CIN.md — Audit de l'existant (Phase 0)

> Produit **avant** l'implémentation du scan CIN par Claude vision, conformément au
> prompt d'implémentation. Sert de référence pour brancher le préremplissage sur le
> formulaire client **existant** sans rien casser.

---

## 0. Nature du dépôt

`hichemm88/checktunisia` est le **frontend Qayed** uniquement (Vite + React 18 +
TypeScript + Tailwind, déployé sur Vercel). Le backend métier est un service
**séparé** (Railway : `https://checktunisia-backend-production.up.railway.app/api/v1`,
alias `https://api.qayed.tn/api/v1`), non présent dans ce dépôt.

**Conséquence d'architecture pour le scan CIN** : l'endpoint `/api/scan/cin` est
implémenté comme une **fonction serverless Vercel** co-localisée dans ce dépôt
(`api/scan/cin.ts`). C'est le seul « backend » que ce dépôt peut réellement
déployer, et c'est le bon choix pour la conformité :

- l'image CIN n'atteint **jamais** le backend Railway ni sa base — elle est traitée
  en mémoire dans la fonction, jamais persistée, jamais loggée ;
- même origine que le web app → couverte par `connect-src 'self'` de la CSP ;
- réutilisable telle quelle par le mobile (POST multipart vers la même URL).

---

## 1. Formulaire client actuel

| Élément | Détail |
|---|---|
| Composant | `src/components/hotel/GuestScanPanel.tsx` |
| Utilisé par | `src/pages/hotel/CheckInWizardPage.tsx` (étape 2 « Documents » et étape 3 pour les voyageurs additionnels) |
| Gestion d'état | **State local** `useState<Partial<AddGuestPayload>>` — *pas* de React Hook Form |
| Prise de vue actuelle | OCR MRZ **client-side** (tesseract.js) via `scanMrz` → préremplit le state |
| Soumission | `useMutation` → `checkInsApi.addGuest(checkIn.id, guestForm)` |
| Machine à états | `scanState: 'idle' | 'scanning' | 'done' | 'error'` |
| Saisie manuelle | Bouton « Saisie manuelle » qui passe directement à `done` avec un formulaire vide → **flux à préserver intact** |

### Champs du formulaire (state `guestForm`, type `AddGuestPayload`)

| Champ | Type | Requis (bouton) | Notes |
|---|---|---|---|
| `document_type` | `'passport' | 'national_id'` | — | Select existant avec ces 2 options |
| `first_name` | string | ✅ | |
| `last_name` | string | ✅ | |
| `date_of_birth` | string `YYYY-MM-DD` | ✅ | input `type=date` |
| `sex` | `'M' | 'F' | 'X'` | — | Select |
| `nationality_code` | string(3) | — | ex. `TUN` |
| `document_number` | string | — | |
| `issuing_country_code` | string(3) | — | |
| `expiry_date` | string | — | (CIN legacy : pas de date d'expiration) |
| `is_primary` | boolean | — | |
| `scan_id` | string | — | module WhatsApp provisoire |

Le bouton « Confirmer le voyageur » est actif dès que `first_name && last_name &&
date_of_birth` sont remplis.

---

## 2. Modèle de données client

Types dans `src/types/index.ts` :

- `Guest` : `first_name, last_name, date_of_birth, sex, nationality_code, is_primary, document?`
- `TravelDocument` : `type, document_number, issuing_country_code, issue_date?, expiry_date?, is_verified`
- `AddGuestPayload` (dans `src/api/checkIns.ts`) : champs plats ; `checkInsApi.addGuest`
  ré-imbrique les champs document sous une clé `document` avant l'appel API.

### Champs arabes → **absents**

Le modèle actuel ne contient **aucun** champ arabe (`lastNameAr`, `firstNameAr`,
`filiationAr`, `spouseAr`, `birthPlaceAr`). Décision :

- Côté **frontend**, on **ajoute** ces champs au state du formulaire et à
  `AddGuestPayload` (optionnels), en `dir="rtl"` / IBM Plex Sans Arabic, préremplis
  par le scan et librement éditables.
- Côté **backend Railway** : ces champs partent dans le payload `addGuest`. Le
  backend actuel les ignorera silencieusement s'il ne les connaît pas (pas de
  régression). Une migration backend (colonnes `last_name_ar`, etc.) est à prévoir
  côté Railway pour les persister — **hors périmètre de ce dépôt frontend**, noté ici
  pour l'équipe backend.
- `cardFormat: 'legacy' | 'biometric'` : renvoyé par le scan, transmis dans le
  payload ; support MRZ biométrique non implémenté (P2).

---

## 3. Type de document (passeport vs CIN)

Géré aujourd'hui par le `Select` `document_type` du formulaire, avec les options
`passport` / `national_id`. Il **n'y a pas** de sélecteur de type *en amont* du
formulaire ; le type est un champ *dans* le formulaire.

→ On n'ajoute donc **pas** de restructuration : le scan CIN est un **bouton/carte
en tête du panneau** (« Scanner la CIN — مسح البطاقة ») à côté des boutons
« Prendre une photo » (MRZ passeport) / « Importer » / « Saisie manuelle »
existants. Le scan force `document_type = 'national_id'` au préremplissage.

---

## 4. Endpoints existants & conventions

| Besoin | État |
|---|---|
| Création client | `POST /hotel/check-ins/{id}/guests` (via `checkInsApi.addGuest`) |
| Recherche client par n° document (côté hôtel) | **N'existe pas.** Seule l'autorité (`src/api/authority.ts`) a une recherche ; rien côté hôtel/réception. |
| Auth | JWT Bearer (Railway) + header `X-Property-Id`, injectés par `src/lib/api.ts` (axios) |
| Erreurs | `{ errors: [{ code, message }] }`, extraites par `extractErrors` |

### Lookup « client déjà enregistré » (`existingClient`)

Aucun endpoint de lookup hôtel par `document_number`. Options :

- La fonction `/api/scan/cin` fait un lookup **best-effort** vers le backend Railway
  en réutilisant le Bearer token transmis, **uniquement si** la variable d'env
  serveur `QAYED_GUEST_LOOKUP_PATH` est définie (ex.
  `/hotel/guests/lookup?document_number={cin}&document_type=national_id`).
- Si la variable n'est pas définie → **aucun appel** (zéro latence gaspillée,
  aucun 404 en boucle) et `existingClient: null`.

→ Le contrat `existingClient` est donc **prêt** côté frontend et fonction ; il
suffira à l'équipe backend d'exposer l'endpoint de lookup et de renseigner
`QAYED_GUEST_LOOKUP_PATH` pour l'activer, **sans toucher au frontend**.

---

## 5. Conventions UI / design

| Élément | Existant réutilisé |
|---|---|
| Boutons | `src/components/ui/Button.tsx` (variants primary/secondary/ghost) |
| Inputs / Select | `src/components/ui/Input.tsx`, `Select.tsx` (classe `.input-field`) |
| Toasts | `useToast()` |
| Tokens couleur | `--qayed-cachet #5346A8` (Violet cachet), `--qayed-conforme #1F9D6B` (vert), `--qayed-vigilance #E3A008` (ambre), `--qayed-ligne #DDD9CF` |
| RTL | `applyDocumentDirection` bascule `html[dir]` ; CSS `index.css` force IBM Plex Sans Arabic sur `[dir=rtl]`. Pour un champ arabe isolé en interface FR, on met `dir="rtl"` + `font-arabic` localement. |
| Icônes | `lucide-react` (pas d'emoji dans le code final) |
| i18n | `react-i18next`, clés dans `src/i18n/locales/{fr,en,ar}.json` (namespace `guestScan`, `checkinWizard`, `common`) |

---

## 6. Mapping champs extraits → champs du formulaire existant

| Champ extrait (`/api/scan/cin`) | Champ du formulaire (`guestForm`) | Confiance / règle |
|---|---|---|
| `cinNumber` (8 chiffres) | `document_number` | `confidence.cinNumber` |
| `firstNameLatin` | `first_name` | plafonnée `medium` (translittération) |
| `lastNameLatin` | `last_name` | plafonnée `medium` |
| `firstNameAr` | `first_name_ar` *(nouveau, RTL)* | `confidence.names` |
| `lastNameAr` | `last_name_ar` *(nouveau, RTL)* | `confidence.names` |
| `filiationAr` | `filiation_ar` *(nouveau, RTL)* | `confidence.names` |
| `spouseAr` | `spouse_ar` *(nouveau, RTL)* | `confidence.names` |
| `birthDate` | `date_of_birth` | `confidence.birthDate` |
| `birthPlaceAr` | `birth_place_ar` *(nouveau, RTL)* | — |
| `birthPlaceLatin` | (info) | — |
| — (déduit du particule بنت/بن ou de حرم) | `sex` (`F`/`M`) | prefill `low`, à confirmer |
| constante | `nationality_code = 'TUN'` | high |
| constante | `issuing_country_code = 'TUN'` | high |
| constante | `document_type = 'national_id'` | high |
| `cardFormat` | `card_format` *(nouveau, caché)* | — |

**Règles de confiance UI** : pastille verte (`high`), ambre (`medium`), rouge
(`low` → champ **vidé** + requis, bloque la validation tant que non rempli). Focus
auto sur le premier champ non-`high`. Les champs saisis manuellement (flux actuel)
n'affichent **aucune** pastille.

---

## 7. Impacts / fichiers touchés

**Nouveaux**
- `api/scan/cin.ts` — fonction serverless (Claude vision, zod, no-persistence, rate limit, lookup best-effort)
- `api/_lib/tunisianMonths.ts` — mapping des 12 mois tunisiens + parse date
- `api/_lib/cinExtraction.ts` — prompt système + schéma zod + parsing réponse
- `api/_lib/tunisianMonths.test.ts` — tests unitaires (12 mois)
- `src/api/scanCin.ts` — client API (POST multipart same-origin)
- `src/lib/cinImagePrep.ts` — conversion HEIC + compression ≤1600px q0.7
- `src/components/hotel/CINCapture.tsx` — capture caméra plein écran + fallbacks

**Modifiés (sans régression)**
- `src/components/hotel/GuestScanPanel.tsx` — ajout entrée « Scanner la CIN », mode préremplissage, pastilles de confiance, champs arabes, bandeau client existant
- `src/api/checkIns.ts` — extension `AddGuestPayload` (champs arabes optionnels)
- `src/types/index.ts` — types `CinScanResult` / `CinScanResponse`
- `src/i18n/locales/{fr,en,ar}.json` — namespace `cinScan`
- `vercel.json` — `Permissions-Policy: camera=(self)` (était `camera=()`, ce qui **bloquait** getUserMedia)
- `package.json` — deps : `heic2any` (client), `@anthropic-ai/sdk`, `zod`, `busboy` (fonction), `@vercel/node`, `vitest`, `@types/busboy` (dev)

**Variables d'environnement (fonction Vercel)**
- `ANTHROPIC_API_KEY` (requis)
- `CIN_SCAN_MODEL` (optionnel, défaut `claude-sonnet-5`)
- `QAYED_API_URL` (optionnel, défaut URL Railway) + `QAYED_GUEST_LOOKUP_PATH` (optionnel, active le lookup client existant)
- `CIN_SCAN_RATE_PER_MIN` (optionnel, défaut 30)

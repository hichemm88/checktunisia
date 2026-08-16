# Préparation technique — Qayed

Document de révision avant un entretien, un comité technique, une due diligence ou
une démo. Chaque question donne **une réponse courte** (ce qu'on dit à l'oral) puis
**le détail** (ce qu'on sort si on creuse), avec les fichiers à citer.

Périmètre : dépôt `hichemm88/checktunisia` — le **frontend Qayed** et ses fonctions
serverless. Le backend métier est un service Laravel séparé, hors de ce dépôt.

Chiffres au 16 août 2026 : 174 fichiers source, ~30 400 lignes TS/TSX,
80 commits, 9 fichiers de tests, CI bloquante à 5 étapes.

---

## 1. Architecture

### « Décris-moi l'architecture. »

**Réponse courte.** Trois briques : une application React déployée sur Vercel,
un backend Laravel séparé sur Railway, et deux fonctions serverless co-localisées
avec le frontend qui portent le scan de documents par IA. Une application mobile
consomme les mêmes contrats.

**Le détail.**

```
[Web React/Vite — Vercel]        [Mobile]
        |                            |
        |  JWT Bearer + X-Property-Id|
        v                            v
[Backend Laravel — Railway]  api.qayed.tn/api/v1
        ^
        |  POST /internal/ai-usage (secret de service, metadata seule)
        |
[Fonctions Vercel  /api/scan/cin  et  /api/scan/mrz]  --->  API Anthropic (Claude vision)
```

- Frontend : Vite 5, React 18, TypeScript 5.5, Tailwind 3, React Router 6.
- État serveur : TanStack Query. État client : Zustand (persisté).
- Backend métier : hors dépôt. On ne voit ici que les contrats d'API (`src/api/*`).
- `backend-handoff/` contient le code Laravel à appliquer côté Railway pour le
  suivi des coûts IA — livré comme un dossier de passation, pas exécuté ici.

### « Pourquoi le scan est-il une fonction Vercel et pas un endpoint du backend ? »

**Réponse courte.** Pour que l'image d'une pièce d'identité n'atteigne jamais la
base de données, et pour que la clé Anthropic reste côté serveur.

**Le détail.** Quatre raisons, décidées avant l'implémentation
(`EXPLORATION-CIN.md`) :

1. **Conformité.** L'image est traitée en mémoire dans la fonction, jamais
   persistée, jamais écrite sur disque, jamais loggée. Elle ne touche ni le
   backend Railway ni sa base.
2. **Même origine.** La CSP de production autorise `connect-src 'self'` : pas
   d'exception à ouvrir pour le scan.
3. **Secret.** `ANTHROPIC_API_KEY` vit dans l'environnement de la fonction. Une
   clé d'IA dans un bundle navigateur serait immédiatement exploitable par un tiers.
4. **Réutilisation mobile.** Contrat multipart standard : l'app mobile poste sur
   la même URL sans une ligne de code spécifique.

### « Pourquoi une SPA et pas Next.js / du rendu serveur ? »

**Réponse courte.** L'essentiel du produit est derrière authentification — trois
portails privés. Le SEO ne concerne que le site vitrine, qui est servi par un CMS
et un sitemap proxifié.

**Le détail et la limite assumée.** `vercel.json` réécrit `/sitemap.xml` vers le
backend, `index.html` porte les balises Open Graph et le canonical, et
`src/cms/useSeoMeta.ts` pose le titre et la description par page CMS. Mais les
pages CMS sont rendues côté client : un moteur qui n'exécute pas JavaScript ne
voit que le HTML d'amorçage. Si l'acquisition organique devient un enjeu, la
suite logique est le prérendu des pages publiques — pas une migration complète.

### « Comment le frontend parle-t-il au backend ? »

**Réponse courte.** Un client axios unique, `src/lib/api.ts`, qui injecte le
token et l'établissement actif, rafraîchit le token avant expiration et gère
globalement 401 et « 2FA obligatoire ».

**Le détail.**

- Requête : `Authorization: Bearer <token>` + `X-Property-Id` si un établissement
  est actif. Un `Authorization` explicitement fourni par l'appelant n'est **jamais**
  écrasé — c'est ce qui permet de vérifier la 2FA d'un compte avec un token partiel
  alors qu'une autre session est déjà ouverte.
- Rafraîchissement : si le token expire dans moins de 30 minutes, `POST /auth/refresh`
  avant l'appel. Une seule promesse partagée (`refreshPromise`) : dix requêtes
  simultanées déclenchent un seul rafraîchissement.
- Réponse : 401 → déconnexion et retour au login. 403 avec le code
  `2FA_SETUP_REQUIRED` → redirection vers l'écran de configuration correspondant au rôle.
- Erreurs : format `{ errors: [{ code, message, detail? }] }`, extrait par
  `extractErrors` / `extractErrorDetail`.

---

## 2. Sécurité et conformité

C'est la section la plus scrutée : le produit est un registre d'identité.

### « Comment authentifiez-vous les utilisateurs ? »

**Réponse courte.** JWT porteur émis par le backend, avec trois couches en
plus : 2FA TOTP obligatoire pour les rôles sensibles, passkeys WebAuthn, et
déconnexion automatique sur inactivité.

**Le détail.**

| Mécanisme | Où | Comportement |
|---|---|---|
| Mot de passe + JWT | `src/api/auth.ts` | Réponse `{ token, expires_at, user }` |
| 2FA TOTP | `src/pages/auth/TwoFactorVerifyPage.tsx` | Login renvoie `requires_2fa` + `partial_token` ; le code TOTP échange ce jeton partiel contre le jeton complet |
| 2FA obligatoire | `src/lib/api.ts` | Un 403 `2FA_SETUP_REQUIRED` force l'écran de configuration — imposé par le serveur, pas par le client |
| Passkeys | `src/lib/webauthn.ts`, `src/api/passkeys.ts` | Enregistrement et connexion sans mot de passe |
| Inactivité | `src/hooks/useIdleTimeout.ts` | 15 min → avertissement, 2 min de plus → déconnexion serveur puis locale |

### « Vous avez implémenté Face ID ? »

**Réponse courte.** Non — et c'est volontaire. On appelle `navigator.credentials`,
c'est le système d'exploitation qui décide d'afficher Face ID, Touch ID, Windows
Hello, une empreinte ou un code PIN.

**Le détail.** Aucune API propriétaire, aucune donnée biométrique ne traverse le
code : la clé privée reste dans l'enclave sécurisée de l'appareil, seul le
credential public part au serveur. Le libellé « Face ID » n'est affiché que si
`isUserVerifyingPlatformAuthenticatorAvailable()` le justifie ; ailleurs on dit
« passkey ». Promettre Face ID à un utilisateur d'Android serait un mensonge
d'interface. L'encodage base64url ↔ ArrayBuffer est isolé et testé
(`src/lib/webauthn.test.ts`).

### « Quelles protections navigateur avez-vous mises ? »

**Réponse courte.** Une CSP stricte, HSTS, `X-Frame-Options: DENY`, `nosniff`, et
une `Permissions-Policy` qui n'ouvre que la caméra et WebAuthn.

**Le détail** (`vercel.json`) :

- `frame-ancestors 'none'` + `X-Frame-Options: DENY` : pas de clickjacking sur un
  écran qui affiche des pièces d'identité.
- `connect-src` en liste blanche : soi-même, l'API, jsDelivr (moteur OCR), Sentry.
- `font-src 'self'` : polices auto-hébergées — c'est d'ailleurs cette règle qui a
  révélé que le site tournait en police système quand elles venaient de Google Fonts.
- `Permissions-Policy: camera=(self)` : le micro et la géolocalisation sont fermés.
  La caméra a dû être **rouverte** explicitement, sa fermeture bloquait `getUserMedia`
  et donc tout le scan.
- **Nuance à assumer** : `script-src` contient encore `'unsafe-inline'`. Le
  durcissement (nonce ou hash) est identifié, non fait.

### « Que remontez-vous à votre outil de suivi d'erreurs ? »

**Réponse courte.** De quoi diagnostiquer — route, rôle, identifiant opaque —
jamais de quoi identifier une personne. Et surtout : pas de session replay.

**Le détail** (`src/lib/sentry.ts`, testé dans `sentry.test.ts`) :

- Sans DSN, le SDK est totalement inerte (état par défaut en local).
- `sendDefaultPii: false` : pas d'IP, pas de cookies, pas d'en-têtes.
- **Pas de Replay** : un replay rejouerait littéralement l'écran d'un agent en
  train de saisir un passeport. Le filtrage se fait en retirant les intégrations
  `Replay` et `BrowserTracing` de la liste par défaut — pas en passant
  `integrations: []`, qui aurait aussi désactivé la capture automatique des erreurs.
- `scrubEvent` supprime la query string (elle peut contenir un critère de recherche
  autorité : nom, numéro de document), le corps de requête, les cookies et les extras.
- `scrubBreadcrumb` supprime les saisies clavier (`ui.input`) et les corps de requête.
- L'utilisateur envoyé à Sentry est `{ id, role }`, et il est effacé à la déconnexion.

### « Où est stocké le jeton ? Ce n'est pas dangereux ? »

**Réponse courte.** Dans `localStorage`, via le store persisté Zustand. C'est un
compromis assumé, mitigé par la CSP, l'expiration courte avec rafraîchissement et
la déconnexion sur inactivité. Le cookie `httpOnly` est la piste d'amélioration.

**Le détail à donner sans se défendre.** Un jeton en `localStorage` est lisible par
un script injecté ; c'est le risque XSS. Ce qui le contient aujourd'hui : `script-src`
en liste blanche, pas de contenu utilisateur rendu en HTML brut, jeton à durée
limitée rafraîchi côté client, déconnexion automatique à 17 minutes d'inactivité.
Le passage à un cookie `httpOnly` + `SameSite` implique du CSRF à gérer et un
backend sur une autre origine — c'est un chantier, pas une case à cocher.

### « Vos gardes de routes sont côté client : ça ne se contourne pas ? »

**Réponse courte.** Si, et ce n'est pas grave : les gardes du frontend sont de
l'ergonomie. L'autorité, c'est l'API.

**Le détail.** `RequireAuth`, `RequireRole`, `RequireOrgOwner` et
`HotelOnboardingGuard` évitent d'afficher un écran vide ou interdit. Le code le
dit explicitement : *« l'API reste l'autorité »*. Un utilisateur qui force
`/hotel/onboarding` par URL est bloqué côté serveur par le middleware `org.owner`.
Un rôle falsifié dans `localStorage` change l'affichage, pas les droits :
chaque appel repart avec le jeton signé, et le backend re-décide.

### « Comment respectez-vous la loi tunisienne sur les données personnelles ? »

**Réponse courte.** L'image d'une pièce d'identité n'est jamais persistée, les
journaux ne contiennent que des métadonnées, et le suivi de coûts IA ne transporte
aucune donnée voyageur.

**Le détail.** Loi 2004-63 / INPDP. Trois garanties vérifiables dans le code :

1. `api/scan/cin.ts` — la fonction remet `form.image = null` dès la réponse du
   modèle. Le log ne contient que : horodatage, établissement, succès/échec,
   latence, niveaux de confiance.
2. `api/_lib/aiUsageTracking.ts` — `buildUsageEvent` est une fonction **pure** qui
   ne recopie qu'une liste blanche de champs. Même si l'appelant passe un champ de
   trop, il ne part pas. C'est testé.
3. Les scans MRZ classiques ne quittent même pas l'appareil : l'OCR tourne dans le
   navigateur.

---

## 3. Le scan de documents — le cœur technique

### « Comment marche le scan ? »

**Réponse courte.** Deux documents, deux chemins. Le passeport a une zone lisible
par machine : on la lit gratuitement dans le navigateur. La carte d'identité
tunisienne n'en a pas : elle passe par Claude vision côté serveur.

**Le détail.**

```
PASSEPORT                             CIN TUNISIENNE
   |                                     |
   v                                     v
OCR local (tesseract, modèle OCRB)    Pas de MRZ, texte arabe
   |  parsing ICAO 9303 (paquet mrz)     |  police décorative, pas de voyelles
   |  check digits ISO 7501              |
   +-- succès --> préremplissage         v
   |                                  Claude vision  /api/scan/cin
   +-- échec ---> Claude vision           |  JSON strict + validation zod
                  /api/scan/mrz           |  1 retry sur erreur de parsing
                                          v
                                    Préremplissage + pastilles de confiance
                                          |
                                    L'agent valide ou corrige — toujours
```

**Toujours disponible** : la saisie manuelle. Aucun échec de scan ne bloque un
enregistrement.

### « Pourquoi ne pas tout envoyer à Claude ? Ce serait plus simple. »

**Réponse courte.** Parce que la MRZ est lisible localement, gratuitement, hors
ligne — et que l'image ne quitte alors jamais l'appareil. Claude est le filet, pas
le premier réflexe.

**Le détail.** Trois arguments : le coût (un appel vision par voyageur, sur un
hôtel qui enregistre 200 arrivées par semaine, ça se chiffre), la latence (l'OCR
local répond sans aller-retour réseau), et la confidentialité (le meilleur endroit
pour une photo de passeport, c'est nulle part). L'usage réel est mesuré : un
beacon `reportLocalMrzScan` compte les scans locaux pour alimenter le graphe
comparatif « OCR local vs Claude vision » du tableau de bord admin.

### « Pourquoi la CIN tunisienne ne peut-elle pas être lue par un OCR classique ? »

**Réponse courte.** Pas de MRZ, donc rien de normalisé à lire. Le texte est en
arabe, dans une police décorative, sans voyelles courtes — et un OCR générique
rend une bouillie.

**Le détail utile à connaître.** Une première version faisait de l'OCR client
(`src/lib/cinScanner.ts`) : détection de la carte dans la photo par OpenCV,
redressement en rectangle canonique, recadrage à position fixe sur la mise en page
officielle, puis translittération arabe → latin. Ça marchait pour le numéro et la
date ; les noms restaient approximatifs. D'où le passage à Claude vision pour la
CIN — le code d'OCR local reste, il documente le chemin parcouru.

Détail qui prouve qu'on connaît le terrain : les mois **tunisiens** ne sont pas les
mois arabes standard. جانفي, فيفري, جوان, جويلية, أوت — hérités du français, pas
de l'arabe classique. Le mapping des douze mois est isolé dans
`api/_lib/tunisianMonths.ts` et testé unitairement.

### « Et si le modèle hallucine une donnée ? »

**Réponse courte.** Trois filets successifs, et une règle : on préfère un champ
vide à une valeur fausse.

**Le détail.**

1. **Le prompt.** « Si un champ est illisible : null, jamais d'invention. » et
   « Si l'image n'est pas une CIN tunisienne : tous les champs null. »
2. **La validation serveur** (`api/_lib/cinExtraction.ts`). Réponse parsée en JSON
   (avec récupération si le modèle a mis des fences markdown), validée par un
   schéma zod, puis **renormalisée** : un numéro de CIN n'est retenu que s'il fait
   exactement 8 chiffres, sinon `null` ; la date est reparsée depuis les mois
   tunisiens, sinon `null`. Une valeur non normalisable fait tomber sa confiance à
   `low`, quoi qu'en dise le modèle.
3. **L'interface.** Chaque champ porte une pastille : verte (`high`), ambre
   (`medium`), rouge (`low`). Un champ `low` est **vidé** et rendu obligatoire — il
   bloque la validation tant que l'agent ne l'a pas rempli. Le focus se pose
   automatiquement sur le premier champ non fiable.

Et une règle de conception qu'on peut citer telle quelle : **la translittération
latine est plafonnée à `medium`, par construction**. Translittérer un nom arabe est
une interprétation, jamais une certitude — le code force ce plafond
(`capMedium`), même quand le modèle se dit sûr.

### « Que se passe-t-il si l'appel échoue ? »

**Réponse courte.** Chaque mode d'échec a son code et son message ; aucun ne
bloque l'enregistrement.

**Le détail** (`api/scan/cin.ts`) :

| Situation | Code | Comportement |
|---|---|---|
| Pas de `Bearer` | 401 | Refus immédiat |
| Image > 10 Mo | 413 | Refusée au streaming, jamais bufferisée entièrement |
| Type non autorisé | 415 | Liste blanche JPEG / PNG / WebP |
| Plus de 30 scans/min | 429 | Fenêtre glissante par établissement |
| Réponse non parsable | 422 | **Après un retry** — un parse raté peut être un aléa |
| Timeout | 504 | Butoir dur à 15 s |
| Erreur API | 502 | Repli sur la saisie manuelle |

`thinking: disabled` sur les appels : c'est de l'extraction structurée, pas du
raisonnement — on paie et on attend le minimum.

### « Comment gérez-vous les photos prises par un iPhone ? »

**Réponse courte.** Conversion HEIC → JPEG et compression dans le navigateur avant
l'envoi : au plus 1600 px, qualité 0,7.

**Le détail.** `src/lib/cinImagePrep.ts`. Trois bénéfices : les fonctions ne
voient qu'un format qu'elles savent traiter, la facture Anthropic dépend du nombre
de pixels, et un agent sur un réseau 3G tunisien envoie 300 Ko au lieu de 4 Mo.

### « Votre limite de débit tient-elle vraiment ? »

**Réponse courte.** Non, pas au sens strict : elle est en mémoire, donc par
instance serverless. C'est un garde-fou best-effort, documenté comme tel.

**Le détail à donner spontanément.** `rateBuckets` est une `Map` dans le processus.
Vercel peut lancer plusieurs instances en parallèle : un attaquant déterminé
dépasse les 30/min. La correction est identifiée dans `EXPLORATION-CIN.md` : un
magasin durable partagé (Upstash Redis ou équivalent). Point voisin, plus
important, à ne pas cacher : **les fonctions vérifient la présence d'un en-tête
`Bearer`, pas sa validité cryptographique**. Un jeton syntaxiquement valide
consomme donc un appel payant. Les deux se corrigent ensemble : validation du
jeton auprès du backend et compteur partagé.

---

## 4. Le suivi des coûts IA

### « Vous savez ce que l'IA vous coûte ? »

**Réponse courte.** Oui, par scan, par établissement et par jour — avec les tarifs
en base de données, pas dans le code, et un coût figé au moment de l'écriture.

**Le détail.** La chaîne (`backend-handoff/README.md`) :

```
Fonction Vercel : mesure tokens + latence + modèle réellement servi
   |
   v  POST /internal/ai-usage — metadata seule, secret de service
Backend Laravel : AiUsageRecorder calcule cost_usd au tarif ACTIF
   |
   v  table ai_usage_events (coût figé à l'insert)
Admin : /admin/ai-costs — graphes, tarifs éditables
```

Cinq règles, toutes vérifiables :

1. **Le suivi ne casse jamais un scan.** `trackAiUsage` avale toute exception et
   la journalise côté serveur. Un backend de facturation en panne ne fait pas
   échouer l'enregistrement d'un voyageur.
2. **Zéro donnée voyageur.** Liste blanche stricte, construite par une fonction pure.
3. **Aucun tarif en dur.** Les prix vivent en base, éditables depuis l'admin.
4. **Coût figé.** Changer un tarif ne réécrit pas l'historique.
5. **`user_id` résolu côté serveur** depuis le jeton de l'opérateur transmis en
   `X-Actor-Token` — jamais depuis le client, et jamais le voyageur.

**Détail d'honnêteté produit** : les tarifs sont à zéro par défaut, et tant qu'ils
y sont, l'admin affiche un bandeau ambre « Tarifs non configurés — les coûts
affichés sont faux ». Un tableau de bord qui ment sur ses chiffres est pire que
pas de tableau de bord.

### « Et si les variables d'environnement ne sont pas posées ? »

**Réponse courte.** Le suivi est un no-op silencieux : aucun appel, zéro latence.
Les scans fonctionnent exactement comme avant.

**Le détail.** Même motif que le lookup « client déjà enregistré » : la
fonctionnalité est câblée de bout en bout, elle s'active en renseignant une
variable, sans redéploiement du frontend. C'est ce qui a permis de livrer le
frontend avant que le backend correspondant n'existe.

---

## 5. Rôles, multi-établissement, métier

### « Qui utilise Qayed, et avec quels droits ? »

**Réponse courte.** Quatre rôles plateforme, plus un rôle interne à l'organisation
hôtelière.

| Rôle | Portail | Fait quoi |
|---|---|---|
| `receptionist` | Hôtel | Enregistre les arrivées, scanne, imprime la fiche |
| `hotel_admin` | Hôtel | Idem + paramètres, abonnement, établissements |
| `authority_user` | Autorité | Recherche, profils voyageurs, liste de surveillance, journal |
| `platform_admin` | Admin | Hôtels, utilisateurs, facturation, coûts IA, CMS |

Et `role_org` (`owner` / `admin`) distingue, à l'intérieur d'une organisation
hôtelière, le propriétaire du compte des administrateurs qu'il a invités. Seul le
propriétaire crée un établissement et modifie l'abonnement.

### « Comment gérez-vous un groupe qui a plusieurs hôtels ? »

**Réponse courte.** Un établissement actif dans le store, envoyé en `X-Property-Id`
sur chaque requête. Le backend cloisonne.

**Le détail.** `activePropertyId` / `activePropertyName` sont dans le store persisté ;
l'intercepteur axios les injecte. La bascule d'établissement est une action du store,
pas une navigation — pas de rechargement, les requêtes suivantes changent de portée.

### « Que se passe-t-il à la première connexion d'un hôtelier ? »

**Réponse courte.** Une porte d'entrée qui dépend de l'**organisation**, jamais de
l'utilisateur.

**Le détail** (`HotelOnboardingGuard` dans `src/App.tsx`) :

- Au moins un établissement → tableau de bord, quel que soit le rôle.
- Zéro établissement + propriétaire → parcours d'installation.
- Zéro établissement + administrateur invité → écran « Configuration en attente ».
  Il ne peut rien créer, inutile de lui montrer un formulaire qu'il n'a pas le
  droit de soumettre.

Les comptes créés avant la migration ont `role_org` à `null` : ils sont traités
comme propriétaires, et la valeur est propagée dans le store persisté au premier
chargement — sans forcer personne à se reconnecter.

### « Décris le parcours d'enregistrement. »

**Réponse courte.** Trois étapes — réservation, documents, validation — reprenables
en cours de route.

**Le détail** (`src/pages/hotel/CheckInWizardPage.tsx`) :

1. **Réservation** : dates, chambre, nombre d'adultes et d'enfants, référence.
   La plateforme de réservation est **devinée** au format de la référence
   (`HM…` → Airbnb, 10 chiffres → Booking, 9 → Agoda, 8 → Expedia). Purement
   informatif, jamais bloquant, et les règles sont partagées avec l'application mobile.
2. **Documents** : un panneau de scan par voyageur. Autant d'emplacements que
   d'occupants annoncés ; les adultes sont obligatoires.
3. **Validation** : récapitulatif, puis clôture. Une arrivée non terminée se
   reprend via `?resume=<id>`.

### « Qu'est-ce qui empêche d'enregistrer un voyageur incomplet ? »

**Réponse courte.** Une liste de blocages, extraite du JSX dans un module testable,
parce que c'est une règle métier — pas de l'affichage.

**Le détail** (`src/lib/guestFormGuards.ts`). Bloquent : nom, prénom, date de
naissance, numéro de document, pays de délivrance, plus tout champ lu avec une
confiance faible et resté vide, plus l'absence de photo du document non confirmée.
La raison d'être du module est instructive : tant que la règle vivait en ligne
dans le composant, le bouton restait actif alors que le backend exigeait déjà un
numéro de document — la soumission partait puis revenait en 422 avec un message de
validation brut. La règle est désormais vérifiable sans navigateur.

### « La fiche de police, elle sort comment ? »

**Réponse courte.** Une page A4 imprimable, rendue hors de l'arbre React principal,
jusqu'à cinq voyageurs par feuille.

**Le détail** (`src/components/PoliceFiche.tsx`). Le composant est monté par
`createPortal` dans `document.body`. À l'écran il est en `position: fixed` hors
cadre ; à l'impression, une règle masque tout sauf lui, et la fiche s'imprime seule
depuis le haut de page. Le piège documenté dans le fichier : **ne jamais** mettre
`display: none` sur la racine — l'élément sort du flux et le navigateur ne
l'imprime plus, même avec `@media print`.

### « Et ce module WhatsApp dans l'admin ? »

**Réponse courte.** Un relais provisoire, marqué comme tel dans le code, à retirer
après homologation par le ministère.

**Le détail.** En attendant l'intégration officielle, la fiche part par WhatsApp au
destinataire configuré par l'établissement. L'écran d'administration montre la
santé de la session, un journal filtrable, le renvoi, un message test et une pause
d'urgence. Anecdote qui montre le soin porté aux états d'erreur : l'état
`logged_out` — WhatsApp a révoqué l'appareil, plus une seule fiche ne part — était
absent du typage et s'affichait en pastille ambre « Initialisation… ». *La panne la
plus alarmante se présentait sous les traits de la plus rassurante.* Corrigé.

---

## 6. Facturation et abonnements

### « Qui calcule les montants ? »

**Réponse courte.** Le backend. Toujours. Le frontend ne dérive que de l'affichage.

**Le détail.** `src/lib/billing.ts` le dit en commentaire : `overage_amount` et
`estimated_total` **arrivent calculés**. Le frontend décide seulement du palier de
couleur d'une jauge (`warning` à 80 %, `reached` au quota, `over` au-delà — les
mêmes seuils que les alertes serveur) et de la formulation. Un montant recalculé
côté client est un montant qui finira par diverger.

### « Comment se passe un paiement ? »

**Réponse courte.** Flouci, en redirection : le backend crée l'intention, on
redirige, on vérifie au retour.

**Le détail.** `POST /hotel/payments/initiate` → `payment_url` → redirection →
retour sur `/hotel/payment/success` ou `/failed` → `GET /hotel/payments/{id}/verify`.
Le frontend ne voit jamais de données de carte.

### « Un changement de plan, ça se passe comment ? »

**Réponse courte.** Simulation côté serveur, puis confirmation avec une clé
d'idempotence générée à l'ouverture de l'écran.

**Le détail** (`src/lib/planChange.ts`, testé) :

- Une montée en gamme s'applique au paiement ; une descente au cycle suivant.
- Une montée entièrement couverte par le crédit **ne demande pas de paiement** —
  il ne faut pas promettre un règlement qui n'aura pas lieu.
- Si le client perd des conditions négociées, une case à cocher explicite s'impose.
- La clé d'idempotence est créée **une fois** et conservée tout le parcours : double
  clic, second onglet ou rejeu après timeout retombent sur la même demande côté
  serveur. Changer de plan cible génère une nouvelle clé.

---

## 7. Performance et front

### « Le site était lent : qu'avez-vous fait ? »

**Réponse courte.** Un visiteur de la page d'accueil téléchargeait environ 1 Mo
dont il n'avait aucun usage. Seule la page publique est désormais dans le bundle
d'entrée ; les trois portails sont chargés à la demande.

**Le détail** (`src/App.tsx`, `vite.config.ts`) :

- Toutes les routes privées sont en `React.lazy`, sous une seule frontière `Suspense`.
- Les grosses bibliothèques stables sont isolées en chunks manuels (React, i18next,
  tesseract, mrz, SDK Anthropic) : elles restent en cache d'un déploiement à l'autre.
- OpenCV (≈ 9 Mo de WASM) est chargé dynamiquement, uniquement au premier scan.
- Polices et drapeaux auto-hébergés — plus aucune requête vers un CDN tiers pour
  l'affichage.

**Deux leçons à raconter** :

1. Nommer `@measured/puck` dans `manualChunks` le transformait en import statique
   de l'entrée — donc en `modulepreload` dans `index.html`, donc téléchargé par
   *tout* visiteur, y compris ceux qui ne verront jamais l'éditeur CMS. Laissé à
   Rollup, il part correctement dans le chunk différé.
2. Le découpage CSS par chunk provoquait en production des « Unable to preload CSS
   for… » sur les routes différées. `cssCodeSplit: false` : une feuille pour toute
   l'application, l'erreur ne peut plus se produire.

### « C'est une application installable ? »

**Réponse courte.** Oui, PWA installable, avec un service worker volontairement
**sans cache**.

**Le détail.** L'intérêt de l'installation est ailleurs que dans le hors-ligne :
mode plein écran, et surtout autorisation caméra accordée une fois pour toutes —
ce qui change tout pour un réceptionniste qui scanne cinquante documents par jour.
Le service worker fait `skipWaiting` + `clients.claim` et ne répond à aucune
requête : aucun risque de servir un écran périmé après un déploiement.

### « Vous gérez l'arabe ? »

**Réponse courte.** Français, anglais, arabe, avec bascule complète en RTL.

**Le détail.** `i18next` + détection par `localStorage` puis navigateur, repli
français. `applyDocumentDirection` pose `dir` et `lang` sur `<html>` au changement
de langue. IBM Plex Sans Arabic est appliquée sous `[dir=rtl]`, et les champs
arabes isolés dans une interface française portent `dir="rtl"` localement — les
noms d'une CIN, par exemple, s'affichent correctement au milieu d'un formulaire
français.

### « Comment tenez-vous la cohérence visuelle ? »

**Réponse courte.** Un fichier de tokens comme source unique, et un script de CI
qui refuse la dérive.

**Le détail.** `src/styles/tokens.css` définit toutes les couleurs, avec leurs
ratios de contraste annotés, et une règle explicite : les couleurs pleines
`vigilance` (2,3:1) et `conforme` (3,5:1) sont des couleurs d'aplat, jamais de
texte — leurs variantes `-texte` existent pour ça. Le code avait accumulé environ
1 400 classes de couleur hors charte et 700 valeurs hexadécimales en dur ;
`npm run check:design` empêche que ça recommence, en refusant un hex littéral, une
taille de police hors échelle, ou un `outline-none` sans anneau de remplacement.

---

## 8. Qualité, tests, livraison

### « Comment savez-vous que vous ne cassez rien ? »

**Réponse courte.** Une CI à cinq étapes, toutes bloquantes.

**Le détail** (`.github/workflows/ci.yml`) : lint (oxlint) → typecheck
(`tsc --noEmit`, zéro erreur, `verbatimModuleSyntax`) → tests (vitest) → build →
audit de vulnérabilités. Chaque étape a sa justification écrite dans le fichier.
Le build est dans la liste parce qu'il échoue sur des choses que ni le linter ni le
compilateur ne voient : imports cassés à la résolution, plugins Vite, budgets de chunk.

### « Pourquoi `npm audit --omit=dev` ? Ce n'est pas se cacher les yeux ? »

**Réponse courte.** Non : on bloque sur ce qui atteint réellement le navigateur.
Les failles de l'outillage de build ne sont pas livrées.

**Le détail.** Le seuil est `high`. État constaté au 7 août 2026 : zéro
haute/critique en production, quatre modérées via l'éditeur CMS, suivies mais non
bloquantes. Auditer les dépendances de développement au même niveau imposerait des
montées de version cassantes pour un risque qui n'existe pas côté utilisateur.

### « Que testez-vous, exactement ? »

**Réponse courte.** La logique pure et vérifiable sans navigateur — en priorité
celle dont une erreur serait grave ou invisible.

**Le détail.** Neuf fichiers de tests, choisis :

| Test | Ce qu'il protège |
|---|---|
| `sentry.test.ts` | Le filtrage des données personnelles avant envoi — la garantie la plus importante du fichier |
| `aiUsageTracking.test.ts` | Qu'aucune donnée voyageur ne parte au suivi de coûts |
| `tunisianMonths.test.ts` | Les douze mois tunisiens |
| `webauthn.test.ts` | L'encodage base64url ↔ ArrayBuffer |
| `guestFormGuards.test.ts` | Ce qui bloque un enregistrement |
| `billing.test.ts`, `planChange.test.ts`, `invoiceStatus.test.ts` | Les décisions de facturation |
| `pricingLabels.test.ts` | Les libellés de la grille tarifaire publique |

### « Et les tests d'interface ? »

**Réponse courte.** Il n'y en a pas, et c'est une lacune reconnue, pas un oubli.

**Le détail à assumer.** La stratégie a été : d'abord extraire la logique métier
hors des composants, puis la tester. `guestFormGuards` et `planChange` existent
précisément parce que cette extraction a eu lieu. La suite logique est Testing
Library sur les composants critiques et un parcours de bout en bout sur
l'enregistrement complet, y compris le scan — c'est le chantier suivant, et le
dire vaut mieux que de le maquiller.

### « Comment déployez-vous ? »

**Réponse courte.** Vercel sur `main`, avec prévisualisation par pull request. Le
backend est déployé séparément sur Railway.

**Le détail à ne pas cacher.** Le frontend et le backend sont dans deux dépôts et
deux pipelines. Aucune CI ne vérifie que les contrats correspondent : un champ
renommé côté Laravel se découvre à l'exécution. Ce qui limite la casse aujourd'hui :
les types d'API sont concentrés dans `src/api/*` et `src/types/index.ts`, et les
champs inconnus sont ignorés silencieusement par les deux côtés. Ce qui le
résoudrait : un schéma partagé (OpenAPI) et des types générés.

---

## 9. Les questions qui piquent

À préparer mot pour mot : mieux vaut les amener soi-même que les subir.

| Question | Réponse à donner |
|---|---|
| « Le README, c'est le template Vite par défaut. » | Exact. La vraie documentation est ailleurs : `EXPLORATION-CIN.md` (audit d'architecture avant implémentation du scan) et `backend-handoff/README.md` (dossier de passation). Le README doit être réécrit. |
| « Vous dépendez d'un seul fournisseur d'IA. » | Oui, et le repli est prévu : le modèle est une variable d'environnement (`CIN_SCAN_MODEL`), le contrat est du JSON strict validé par zod — pas du texte libre —, et surtout la saisie manuelle reste toujours accessible. Une panne Anthropic ralentit le travail, elle ne l'arrête pas. |
| « Vercel, c'est un enfermement. » | Les fonctions sont deux handlers HTTP `(req, res)` en Node standard, qui lisent du multipart et rendent du JSON. Les porter sur Railway ou ailleurs est une journée, pas un trimestre. |
| « Vos fonctions de scan ne valident pas le jeton. » | Vrai. Elles vérifient la présence de l'en-tête `Bearer`, pas sa signature. Corrigé en même temps que la limite de débit distribuée : validation auprès du backend, compteur partagé. C'est le premier point de la liste. |
| « Il y a du `any` dans le code. » | Sur OpenCV.js, qui n'a pas de types de première classe, et c'est encadré et commenté. Le reste du dépôt passe `tsc --noEmit` sans erreur, en CI bloquante. |
| « Le scan est-il fiable à 100 % ? » | Non, et le produit est conçu pour ne pas le prétendre. Confiance par champ, champ vidé quand elle est faible, focus automatique dessus, validation humaine obligatoire. La bonne question n'est pas « le scan est-il parfait » mais « que se passe-t-il quand il se trompe » — et la réponse est : l'agent le voit. |
| « Combien coûte un scan ? » | La mesure existe (tokens, latence, modèle, par établissement et par jour), les tarifs se saisissent en admin. Tant qu'ils ne sont pas saisis, l'écran affiche que les chiffres sont faux plutôt que de les présenter comme vrais. |
| « Pourquoi le backend n'est-il pas dans ce dépôt ? » | Séparation historique et opérationnelle : le frontend est sur Vercel, le backend Laravel sur Railway, avec des cycles de déploiement distincts. `backend-handoff/` montre comment la passation se fait quand le frontend a besoin d'une contrepartie serveur. |

---

## 10. Chiffres et repères à avoir en tête

| | |
|---|---|
| Taille du dépôt | 174 fichiers source, ~30 400 lignes, 80 commits |
| Rôles | 4 plateforme + 2 intra-organisation (`owner` / `admin`) |
| Langues | 3 (fr, en, ar) dont une RTL |
| Déconnexion sur inactivité | 15 min + 2 min d'avertissement |
| Rafraîchissement du jeton | À moins de 30 min de l'expiration |
| Limite de scan | 30 par minute et par établissement (best-effort) |
| Butoir des fonctions de scan | 15 s ; image max 10 Mo ; ≤ 1600 px après compression client |
| Modèle OCR local | OCRB, 1,4 Mo, servi en même origine depuis `public/tessdata/` |
| Niveaux de confiance | `high` / `medium` / `low` — translittération plafonnée à `medium` |
| Étapes de CI bloquantes | 5 (lint, types, tests, build, audit) |
| Fichiers de tests | 9, sur la logique pure |

### Les cinq fichiers à ouvrir si on demande à voir du code

1. `api/scan/cin.ts` — la fonction de scan : validation, limites, extraction,
   suivi de coûts, journalisation sans données personnelles.
2. `src/lib/api.ts` — la couche réseau : jeton, établissement actif,
   rafraîchissement, 401 et 2FA.
3. `src/lib/sentry.ts` — le filtrage des données personnelles, et pourquoi il n'y
   a pas de session replay.
4. `src/App.tsx` — routage, chargement différé, gardes de rôle et porte d'entrée
   d'installation.
5. `api/_lib/aiUsageTracking.ts` — le suivi de coûts : liste blanche, jamais
   bloquant, aucun tarif en dur.

# Déploiement de crm.qayed.tn (CRM de prospection)

Deux services Railway distincts sont nécessaires : le backend existant (déjà en place, `api.qayed.tn`) ne bouge pas — il faut juste poser quelques variables d'environnement — et un **nouveau** service Railway pour servir le frontend statique du CRM.

## 1. Backend (`checktunisia-backend`, service Railway existant)

Rien à créer : le module `prospection` fait partie du même déploiement que le reste de l'API (voir checktunisia-backend#84 pour le pourquoi). Poser ces variables sur le service Railway existant, puis redéployer (ou attendre le prochain déploiement automatique si le service suit déjà la branche `main`) :

| Variable | Valeur |
|---|---|
| `PROSPECTION_ADMIN_EMAIL` | l'e-mail du compte admin (Hichem) |
| `PROSPECTION_ADMIN_PASSWORD` | un mot de passe fort — changeable ensuite depuis l'app |
| `PROSPECTION_MEMBER_EMAIL` | e-mail du second compte (optionnel au démarrage) |
| `PROSPECTION_MEMBER_PASSWORD` | mot de passe du second compte (optionnel) |
| `CORS_ALLOWED_ORIGINS` | **ajouter** `https://crm.qayed.tn` à la liste existante (variable additive, ne remplace rien — voir `App\Support\CorsOrigins`) |

Au déploiement, `docker/start.sh` fait tourner les migrations (crée le schéma Postgres `prospection`, isolé du reste — voir `config/database.php`) et les 3 seeders du module (comptes, templates de message, référentiel d'objections). Aucune autre variable n'est obligatoire : `PROSPECTION_DB_*` restent vides et le module partage alors la même base Postgres que la production, dans son propre schéma.

Vérification une fois déployé :
```
curl -i https://api.qayed.tn/api/v1/prospection/auth/login \
  -H "Content-Type: application/json" -d '{"email":"x","password":"x"}'
```
Une réponse `422` (identifiants invalides) confirme que les routes sont bien en place — un `404` voudrait dire que le déploiement n'a pas encore pris la nouvelle branche.

## 2. Frontend (nouveau service Railway, dépôt `checktunisia`)

1. Sur le dashboard Railway, dans le **même projet** que le backend (pour rester sur la même org/facturation, pas obligatoire techniquement) : **New → GitHub Repo** → sélectionner `hichemm88/checktunisia`.
2. Dans les paramètres du service créé :
   - **Root Directory** : `.` (racine du dépôt — le build a besoin de `tailwind.config.js`, `tsconfig.json`, etc. à la racine, ce n'est pas un sous-dossier isolé).
   - **Builder** : Dockerfile.
   - **Dockerfile Path** : `Dockerfile.crm`.
3. **Variables du service** (obligatoire) : `VITE_CRM_API_URL=https://api.qayed.tn/api/v1/prospection`. `crm.qayed.tn` et `api.qayed.tn` sont deux services Railway différents — pas de chemin relatif possible. Vite fige cette URL dans le bundle **au moment du build** (le `Dockerfile.crm` la reçoit comme build-arg, voir son commentaire) ; la poser seulement après coup et redéployer sans rebuild n'aurait aucun effet. `$PORT`, lui, est fourni automatiquement par Railway et n'a rien à configurer. Vérifier aussi que `CORS_ALLOWED_ORIGINS` côté backend inclut bien `https://crm.qayed.tn` (étape 1) — sinon le navigateur bloque les requêtes malgré une URL correcte.
4. **Settings → Networking → Custom Domain** : ajouter `crm.qayed.tn`. Railway indique un enregistrement DNS (CNAME, généralement `xxxx.up.railway.app`) à créer chez le fournisseur DNS du domaine `qayed.tn`.
5. Chez le fournisseur DNS : créer le CNAME `crm` → la valeur donnée par Railway. La propagation prend généralement quelques minutes à quelques heures.
6. Railway émet automatiquement le certificat TLS une fois le CNAME propagé — HTTPS actif sans étape supplémentaire.

## Vérification finale

- `https://crm.qayed.tn/` affiche l'écran de connexion (charte Qayed : encre/papier/cachet, Archivo pour le titre).
- Le fichier `https://crm.qayed.tn/robots.txt` renvoie `Disallow: /` et la page porte `<meta name="robots" content="noindex">` — non indexé par construction (garde-fou explicite du prompt).
- Se connecter avec le compte admin seedé → l'écran "Aujourd'hui" doit charger (vide au départ, avant tout import).

## Ce qui reste à construire (pas encore dans cette PR)

Écrans complets (fiche prospect, actions rapides, bouton WhatsApp), Templates/Dashboard/Import, notifications push — voir le suivi dans les PR de ce dépôt et de `checktunisia-backend`.

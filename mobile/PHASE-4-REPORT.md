# PHASE-4-REPORT.md — Finitions & stores

## Fait

### Assets de marque
- Générés dans `mobile/assets/` : `icon.png` (1024²), `adaptive-icon.png` (foreground Android,
  zone de sécurité respectée), `splash-icon.png` (sceau + wordmark « Qayed »),
  `notification-icon.png` (silhouette blanche 96², pour la barre de statut Android),
  `favicon.png`.
- Mark : **cachet géométrique** (« l'encre du cachet officiel ») — sceau violet `#5346A8` avec
  motif « registre/fiche » sur fond encre `#10222E`, dérivé des tokens de `BRAND.md`.
- Le script reproductible est versionné hors dépôt (scratchpad) ; les PNG sont commités.

> ⚠️ **Placeholder assumé** : ces assets sont un placeholder soigné et cohérent avec la marque,
> mais **ne contiennent pas le glyphe قيد** (aucune police arabe disponible dans l'environnement
> de génération). À remplacer par le logo قيد définitif fourni par l'équipe design avant la
> soumission finale. Formats et tailles sont déjà corrects → aucune reconfiguration nécessaire.

### Configuration app
- `app.json` : `icon`, `splash.image`, `android.adaptiveIcon.foregroundImage`, `web.favicon`,
  et l'icône de notification (`expo-notifications` plugin) branchés sur les nouveaux assets.
- `eas.json` : profils **development** (dev client — requis pour le scan MRZ natif), **preview**
  (APK interne) et **production** (auto-increment), + squelette `submit` iOS/Android (valeurs à
  renseigner).

### Fiches stores
- `STORE-LISTING.md` : nom, sous-titres, description FR complète, mots-clés, plan de 6 captures,
  **déclaration de confidentialité / data-safety** (documents d'identité, aucune image stockée,
  aucun paiement in-app, aucun SDK de tracking), permissions justifiées, notes de version.

## Vérifié
- `npx expo config` résout la configuration et tous les plugins avec les nouveaux assets.
- Les 5 fichiers d'assets référencés existent et ont les bonnes dimensions/format (RGBA PNG).
- `npm run typecheck` reste à 0 erreur (aucun code applicatif modifié en Phase 4).

## Reste à faire (actions humaines — hors code)
Ces étapes exigent des comptes/identifiants et un poste avec le CLI EAS ; elles ne peuvent pas
être automatisées ici :

1. **Comptes** : Apple Developer Program (99 $/an) et Google Play Console (25 $ une fois).
2. **EAS** : `npm i -g eas-cli`, `eas login`, `eas init` (crée `extra.eas.projectId` — nécessaire
   pour les push de production), puis :
   - `eas build --profile development` → build de test (scan MRZ, notifications réelles)
   - `eas build --profile production --platform all`
3. **Remplacer les assets placeholder** par le logo قيد définitif (mêmes noms de fichiers).
4. **Renseigner `eas.json` › submit** (Apple ID, ascAppId, appleTeamId ; service account Google).
5. **Créer les fiches** App Store Connect / Play Console à partir de `STORE-LISTING.md`, générer
   les captures sur un vrai appareil, soumettre. Prévoir 1–2 semaines de review Apple la 1re fois.
6. **Backend prod** : `php artisan migrate`, worker de queue + scheduler actifs (cf. PHASE-3).

## Bilan v1
Les phases 0 → 4 (hors actions humaines de soumission) sont livrées et vérifiées
(`typecheck` = 0 erreur, `php -l` OK, `expo config` OK, logique MRZ prouvée). Restent : le test
terrain à Dar Majoul (jalon Phase 2), le remplacement des assets par le logo final, et les
étapes de comptes/soumission ci-dessus.

# Scénario de démonstration ministérielle

Jeu de données seedé : `src/api/seed.ts` (établissements fictifs, watchlist mixte,
3 comptes agents). **Aucun vrai nom de propriété Kasbahost.**

## Préparation

1. `npm install && npm start` → ouvrir sur un appareil (biométrie enrôlée idéale).
2. Idéalement **deux téléphones** connectés au même compte de démo pour illustrer
   la push (§8). Un seul appareil suffit pour tout le reste.

## Déroulé (3 scans : vert → ambre → rouge)

Le bouton **« Scanner un document »** avance dans une séquence scriptée. Chaque
appui sur *« simuler la lecture »* (viewfinder de démo) produit le résultat suivant :

1. **Connexion** — saisir un identifiant (ex. `INT-4821`) → biométrie → Accueil.
   - Accueil : bandeau **rouge** en tête (1 match critique non traité dans la zone
     Sousse), puis 3 stats, puis les dernières vérifications.

2. **Scan 1 — VERT (Conforme)** — onglet *Vérifier* → *Scanner*.
   - Résultat vert, cachet animé. Voyageur **Marco Rossi (ITA)**, établissement
     **Riad Al Warda**, chambre 4, date de check-in. Vérification tracée (audit).

3. **Scan 2 — AMBRE (Non déclarée)** — *Vérifier* → *Scanner* à nouveau.
   - Résultat ambre : **Robert Klein (AUT)**, aucun enregistrement. Bouton
     **« Signaler »** → entrée d'audit géolocalisée.

4. **Scan 3 — ROUGE (Match watchlist)** — *Vérifier* → *Scanner* une 3ᵉ fois.
   - Plein écran **rouge** : **Viktor Kovac (SRB)**, sévérité **Critique**, source
     **Interpol/ONU**, consigne « Ne pas intervenir seul — contacter le central »,
     bouton d'appel direct.
   - **Push** : une notification critique sobre (sans emoji) est déclenchée vers
     l'agent de garde de la zone. Sur le **second téléphone**, un tap ouvre
     directement l'écran **Détail de l'alerte** (deep-link).

5. **Établissements** — onglet *Établissements*.
   - Liste triée (alphabétique, ou par proximité si la localisation est active).
   - **Résidence Dar Yasmine** montre « silencieux depuis 3 j — à surveiller » ;
     **Auberge El Manar** « aucune fiche reçue » (signaux de fraîcheur).
   - Ouvrir **Hôtel Nour El Bahr** → voyageurs présents → *« Marquer un contrôle
     effectué »* (audit géolocalisé + horodaté).

6. **Paramètres → Mon activité** — le journal d'audit reflète en direct les
   vérifications, le signalement et le contrôle effectués pendant la démo
   (argument de **transparence** pour le Ministère).

7. **Langue / RTL** — *Paramètres → Langue → العربية* : bascule en arabe, interface
   en miroir (RTL). Les données MRZ / numéros restent en monospace LTR.

## Saisie manuelle (fallback)

*Vérifier → Saisie manuelle* : saisir un numéro connu pour cibler un état —
`YA1234567` (vert), `RS9021144` (rouge), tout autre numéro (ambre).

## Réinitialiser la séquence

Relancer l'app remet la séquence de scan à zéro (`resetDemoScan`) et ré-amorce le
journal d'audit de démo.

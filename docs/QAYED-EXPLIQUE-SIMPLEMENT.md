# Qayed expliqué simplement

Les mêmes questions techniques que dans `PREPARATION-TECHNIQUE-QAYED.md`, mais
en langage de tous les jours. À lire avant de parler à quelqu'un qui n'est pas
développeur — ou pour retrouver ses mots quand la question tombe.

---

## D'abord, le projet en trois phrases

Qayed remplace la fiche de police en papier des hébergements tunisiens.

Le réceptionniste photographie le passeport ou la carte d'identité du client. Les
informations se remplissent toutes seules. La fiche est prête, imprimable, et
transmise à qui de droit.

Trois publics l'utilisent : les hôtels, les autorités, et l'équipe Qayed.

---

## 1. « C'est fait avec quoi ? »

Trois morceaux, comme un commerce :

- **La vitrine** — le site web que les gens voient et utilisent. Il tourne dans
  leur navigateur.
- **L'arrière-boutique** — un serveur qui garde les données et applique les
  règles. C'est lui qui décide de tout.
- **Un atelier spécialisé** — deux petits programmes à part, qui ne font qu'une
  chose : lire les documents d'identité avec l'intelligence artificielle.

Il y a aussi une application mobile, qui parle exactement au même serveur.

---

## 2. « Pourquoi la lecture des documents est-elle à part ? »

**Pour que la photo du passeport ne soit enregistrée nulle part.**

Elle arrive, elle est lue, elle disparaît. Elle n'entre jamais dans la base de
données. C'est ce qui permet de dire, en regardant quelqu'un dans les yeux, que
la photo de sa pièce d'identité n'est pas stockée chez nous.

Deuxième raison : la clé qui donne accès à l'intelligence artificielle reste sur
nos serveurs. Si elle était dans le site web, n'importe qui pourrait la recopier
et l'utiliser à nos frais.

---

## 3. « Comment marche le scan, concrètement ? »

Deux cas, deux méthodes.

**Le passeport.** En bas de la page photo, il y a deux lignes de caractères un
peu bizarres. Elles existent précisément pour être lues par une machine : c'est
une norme internationale. Le téléphone les lit tout seul, gratuitement, sans rien
envoyer nulle part.

**La carte d'identité tunisienne.** Elle n'a pas ces lignes. Tout est écrit en
arabe, dans une écriture décorative, sans les signes qui aident à la lecture. Là,
on envoie la photo à l'intelligence artificielle, qui nous renvoie les
informations.

Dans les deux cas, **une personne relit et valide** avant que ce soit enregistré.

---

## 4. « Et si l'intelligence artificielle se trompe ? »

> **La phrase à retenir : mieux vaut une case vide qu'une fausse information.**

Trois protections, l'une après l'autre :

1. **On lui interdit d'inventer.** La consigne est écrite noir sur blanc : si un
   champ est illisible, elle doit répondre « rien », jamais deviner.
2. **On vérifie ce qu'elle renvoie.** Un numéro de carte d'identité tunisienne
   fait exactement huit chiffres. S'il n'en fait pas huit, on le jette, même si
   l'IA affirme être sûre d'elle.
3. **On le montre à l'écran.** Chaque information a une pastille de couleur :
   verte, orange ou rouge. **Un champ rouge est effacé et devient obligatoire** —
   le réceptionniste ne peut pas valider sans l'avoir rempli lui-même.

Autrement dit : la bonne question n'est pas « est-ce que le scan est parfait »
mais « qu'est-ce qui se passe quand il se trompe ». Et la réponse est : ça se
voit tout de suite.

---

## 5. « Pourquoi ne pas tout faire avec l'IA ? Ce serait plus simple. »

Trois raisons, dans l'ordre d'importance :

- **La confidentialité.** Le meilleur endroit pour une photo de passeport, c'est
  nulle part. Quand le téléphone lit le passeport tout seul, la photo ne sort
  même pas de l'appareil.
- **Le prix.** Un hôtel qui enregistre deux cents arrivées par semaine, ça fait
  deux cents appels payants. Sur un an, ça compte.
- **La rapidité.** Lire sur place est plus rapide qu'envoyer une photo et
  attendre la réponse.

L'intelligence artificielle est le **filet de sécurité**, pas le premier réflexe.

---

## 6. « Et si le scan ne marche pas du tout ? »

On tape à la main. C'est toujours possible, à tout moment.

Aucune panne — mauvaise photo, réseau coupé, service d'IA indisponible — ne
bloque un client qui attend à la réception.

---

## 7. « Est-ce que c'est sécurisé ? »

- **Mot de passe**, plus un **code à six chiffres** obligatoire pour les comptes
  sensibles : les autorités et l'équipe Qayed.
- **Connexion par empreinte ou reconnaissance faciale** possible. Important : on
  ne stocke aucune empreinte ni aucun visage. On demande simplement au téléphone
  de vérifier que c'est bien son propriétaire ; le téléphone répond oui ou non.
- **Déconnexion automatique** après un quart d'heure sans activité, avec un
  avertissement deux minutes avant. Un poste de réception laissé sans surveillance
  se referme tout seul.
- **La photo du document n'est jamais conservée.**
- **L'outil qui nous signale les bugs** ne retient pas ce que les gens tapent, et
  surtout ne filme pas les écrans — ce serait filmer des passeports.

---

## 8. « Qui peut voir quoi ? »

Quatre profils, quatre espaces séparés :

| Profil | Ce qu'il voit |
|---|---|
| Réceptionniste | Les arrivées de son établissement : enregistrer, scanner, imprimer |
| Responsable d'hôtel | La même chose, plus les réglages et l'abonnement |
| Autorité | La recherche, les profils voyageurs, la surveillance |
| Équipe Qayed | L'administration de la plateforme |

Un hôtelier ne voit que ses établissements. Un groupe qui possède cinq hôtels
bascule de l'un à l'autre, et tout suit.

---

## 9. « Et si quelqu'un triche en bidouillant son navigateur ? »

Il change ce qu'il **voit**, pas ce qu'il a le **droit de faire**.

L'affichage est décidé par le navigateur, mais chaque action repart au serveur
avec le badge de la personne, et le serveur revérifie systématiquement. Quelqu'un
qui se déclarerait « chef » sur son propre ordinateur verrait peut-être un bouton
de plus, et se ferait refuser à la seconde où il clique dessus.

---

## 10. « Combien coûte l'intelligence artificielle ? »

Chaque lecture est comptée : quel établissement, quel jour, combien de temps.
Les prix se saisissent dans l'administration, ils ne sont pas figés dans le code.

Et tant qu'ils ne sont pas saisis, l'écran affiche en toutes lettres que **les
chiffres ne sont pas fiables**, au lieu de faire semblant. Un tableau de bord qui
ment est pire que pas de tableau de bord.

---

## 11. « Ça marche avec une mauvaise connexion ? »

Oui, et c'est travaillé :

- La photo est **réduite avant l'envoi** : environ 300 Ko au lieu de 4 Mo.
- Le site ne télécharge que la partie dont on se sert. Avant, un simple visiteur
  de la page d'accueil chargeait tout, y compris des écrans qu'il ne verrait
  jamais.
- L'application **s'installe** sur le téléphone comme une vraie application.
  L'intérêt principal : l'autorisation d'utiliser la caméra est donnée une fois
  pour toutes, au lieu d'être redemandée à chaque scan.

---

## 12. « Et l'arabe ? »

Trois langues : français, anglais, arabe.

En arabe, toute l'interface bascule de droite à gauche, avec la bonne police.
Et un nom arabe lu sur une carte d'identité s'affiche correctement même au milieu
d'un formulaire en français.

---

## 13. « Comment êtes-vous sûrs de ne rien casser ? »

À chaque modification, une machine vérifie automatiquement cinq choses avant que
ça parte en ligne : la qualité du code, la cohérence, les tests, la fabrication
du site, et les failles de sécurité connues.

**Si une seule échoue, la modification ne part pas.** Ce n'est pas une
recommandation, c'est un barrage.

---

## 14. « Qui calcule les factures ? »

Le serveur. Jamais le site web.

Le site affiche des chiffres, il n'en invente aucun. C'est ce qui évite le pire
des problèmes de facturation : deux endroits qui calculent chacun de leur côté et
finissent par ne plus être d'accord.

---

## 15. « Et le paiement ? »

Par Flouci. Le client est redirigé vers leur page, il paie chez eux, et on
vérifie au retour que le paiement est bien passé.

**Aucun numéro de carte ne passe par nous.** On ne les voit jamais, donc on ne
peut pas les perdre.

---

## 16. « C'est quoi ce module WhatsApp ? »

Une solution de transition, assumée comme telle.

En attendant l'agrément officiel du ministère, la fiche part par WhatsApp au
destinataire choisi par l'établissement. C'est écrit dans le code que ce module
est provisoire et devra être retiré. Ce n'est pas la cible, c'est ce qui permet
de fonctionner en attendant.

---

## Ce qu'il reste à améliorer

Cinq points à annoncer soi-même. Les dire avant qu'on les trouve, c'est de la
maîtrise ; se les faire sortir, c'est de la mauvaise surprise.

1. **Les deux programmes de lecture vérifient qu'on présente un badge, pas que le
   badge est vrai.** Quelqu'un qui présenterait un faux badge bien formé pourrait
   nous faire payer des lectures. C'est le premier chantier.
2. **La limite de trente lectures par minute n'est pas garantie.** Elle
   fonctionne, mais elle peut être contournée par quelqu'un qui sait comment.
3. **Il n'y a pas encore de tests automatiques sur les écrans.** Ce qui est testé
   aujourd'hui, ce sont les règles de calcul et les protections de données —
   c'est-à-dire ce qui serait le plus grave à casser sans s'en apercevoir.
4. **Le site et le serveur sont deux projets séparés**, et rien ne vérifie
   automatiquement qu'ils parlent bien la même langue. Si le serveur renomme une
   information, on s'en aperçoit en marchant dessus.
5. **Le fichier de présentation du projet est resté celui d'un modèle vide.** La
   vraie documentation existe, elle est ailleurs. Ce fichier doit être réécrit.

---

## Cinq phrases à avoir en bouche

1. « La photo de la pièce d'identité n'est jamais enregistrée. Elle est lue, puis
   elle disparaît. »
2. « Mieux vaut une case vide qu'une fausse information — et c'est le
   comportement réel du produit, pas une intention. »
3. « L'intelligence artificielle est le filet de sécurité, pas le premier
   réflexe : le passeport se lit gratuitement sur l'appareil. »
4. « L'affichage est décidé par le navigateur, les droits par le serveur. Tricher
   sur son ordinateur ne donne aucun droit supplémentaire. »
5. « Rien ne bloque une réception : si le scan échoue, on tape à la main. »

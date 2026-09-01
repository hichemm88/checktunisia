/**
 * Règles de saisie de la connexion par code WhatsApp.
 *
 * Isolées du composant pour une raison précise : ce sont elles qui décident si
 * une requête part vers le serveur, et elles doivent se vérifier sans monter un
 * écran. Le composant, lui, n'a plus qu'à afficher.
 *
 * Aucune de ces fonctions ne remplace un contrôle serveur : la normalisation
 * refaite ici est celle que le backend applique de toute façon (chiffres seuls,
 * international, sans « + »). Elle sert à ne pas envoyer une saisie
 * manifestement incomplète, pas à décider de sa validité.
 */

/** Indicatif présélectionné : la quasi-totalité des agents sont en Tunisie. */
export const DEFAULT_DIAL_CODE = '+216';

/**
 * Indicatifs proposés. Volontairement court — la liste complète des indicatifs
 * mondiaux dans un menu déroulant sur téléphone est plus coûteuse à parcourir
 * que le clavier. Un agent hors liste tape son numéro au format international
 * complet, que `normalizePhone` accepte.
 */
export const DIAL_CODES = ['+216', '+33', '+213', '+212', '+218', '+1', '+44', '+49'] as const;

/**
 * Numéro prêt pour l'API : chiffres seuls, indicatif compris, sans « + ».
 *
 * Même règle que `WhatsAppCloudChannel::formatRecipient()` côté serveur. Si les
 * deux divergeaient, un agent parfaitement enregistré se verrait refuser un
 * code sans que rien ne l'explique — le pire mode de panne pour quelqu'un qui
 * n'a aucun autre moyen de se connecter.
 */
export const normalizePhone = (dialCode: string, local: string): string => {
  const prefix = digitsOnly(dialCode);
  let rest = digitsOnly(local);

  // Le zéro de tête est une convention NATIONALE : « 020 123 456 » composé
  // depuis la Tunisie vaut « 20 123 456 » à l'international. Le garder
  // produirait un numéro que Meta rejette, sur une saisie pourtant correcte.
  while (rest.startsWith('0')) rest = rest.slice(1);

  // Numéro déjà saisi au format international complet : on ne préfixe pas deux
  // fois. Colle-t-on « +21620123456 » dans le champ, on veut ce numéro-là.
  if (prefix && rest.startsWith(prefix)) return rest;

  return prefix + rest;
};

/**
 * Le numéro a-t-il une longueur plausible ?
 *
 * 8 chiffres est le plancher du serveur ; 15 est le maximum de la norme E.164.
 * Ce contrôle n'existe que pour éviter un aller-retour réseau sur une saisie
 * visiblement inachevée — il ne dit rien de l'existence du numéro, et la
 * réponse du serveur n'en dira rien non plus.
 */
export const isPlausiblePhone = (dialCode: string, local: string): boolean => {
  const full = normalizePhone(dialCode, local);

  return full.length >= 8 && full.length <= 15;
};

/**
 * Extrait un code à 6 chiffres d'une saisie ou d'un collage.
 *
 * Le bouton « Copier le code » de WhatsApp place le code dans le
 * presse-papiers, mais ce qui arrive dans le champ dépend de ce que
 * l'utilisateur a réellement sélectionné : le code seul, une espace en trop, ou
 * la phrase entière du message. On ne garde donc que les chiffres, et au plus
 * six — sans quoi un collage un peu large donnerait un « code invalide » sur un
 * code parfaitement bon, ce que personne ne peut diagnostiquer.
 */
export const sanitizeCode = (raw: string): string => digitsOnly(raw).slice(0, 6);

export const isCompleteCode = (code: string): boolean => /^\d{6}$/.test(code);

/** Minutes:secondes, pour le compte à rebours de validité. */
export const formatCountdown = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const digitsOnly = (value: string): string => (value ?? '').replace(/\D+/g, '');

/*
 * Proposition de passkey après une connexion par code : écartée une fois, elle
 * ne revient pas.
 *
 * Ici plutôt que dans le composant, pour deux raisons : la lecture et
 * l'écriture doivent partager la même clé — deux constantes qui divergent
 * feraient réapparaître la proposition à chaque connexion —, et un composant
 * qui exporte autre chose que des composants casse le rafraîchissement à chaud.
 */
const PASSKEY_OFFER_DISMISSED_KEY = 'qayed-otp-passkey-offer-dismissed';

export const passkeyOfferDismissed = (): boolean => {
  try {
    return localStorage.getItem(PASSKEY_OFFER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

export const dismissPasskeyOffer = (): void => {
  try {
    localStorage.setItem(PASSKEY_OFFER_DISMISSED_KEY, '1');
  } catch {
    // Navigation privée : la proposition réapparaîtra à la prochaine connexion
    // par code, sans plus de conséquence.
  }
};

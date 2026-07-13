/**
 * Design system Qayed — tokens partagés avec le dashboard web (BRAND.md v1.0).
 * Ne pas dériver de nouvelles couleurs : ces valeurs sont la source de vérité.
 */

export const colors = {
  encre: '#10222E', // Encre nuit — texte, fonds sombres
  papier: '#F6F5F1', // Papier registre — fond principal
  papierChaud: '#FAFAF7',

  cachet: '#5346A8', // Violet cachet — accent principal, actions
  cachetFonce: '#443896',
  cachetSombre: '#8B7FE0',
  cachetDilue: '#EEEBFA',

  conforme: '#1F9D6B', // Vert conforme — résultat OK
  conformeFond: '#E4F5EC',
  conformeTexte: '#137453',

  vigilance: '#E3A008', // Ambre vigilance — anomalie non critique
  vigilanceFond: '#FBF0D7',
  vigilanceTexte: '#8A6206',

  critique: '#C0392B', // Rouge critique — match watchlist
  critiqueFond: '#FBE9E7',
  critiqueSombre: '#7E1F14',

  fiche: '#8A94A0', // Texte secondaire
  ligne: '#DDD9CF', // Bordures / séparateurs
  blanc: '#FFFFFF',
} as const;

/** Couleurs par état de résultat de vérification (le code couleur porte l'info). */
export const resultPalette = {
  vert: { fond: colors.conforme, fondDoux: colors.conformeFond, texte: colors.conformeTexte },
  ambre: { fond: colors.vigilance, fondDoux: colors.vigilanceFond, texte: colors.vigilanceTexte },
  rouge: { fond: colors.critique, fondDoux: colors.critiqueFond, texte: colors.critiqueSombre },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  input: 12,
  btn: 14,
  card: 20,
  pill: 999,
} as const;

/**
 * Familles de polices — chargées via expo-font au démarrage.
 * Fallback système si la police n'est pas encore chargée (démo tolérante).
 */
export const fonts = {
  display: 'Archivo-Black', // titres display (قيد, grands chiffres)
  sans: 'IBMPlexSans', // corps latin
  sansBold: 'IBMPlexSans-Bold',
  sansMedium: 'IBMPlexSans-Medium',
  arabic: 'IBMPlexSansArabic', // corps arabe
  arabicBold: 'IBMPlexSansArabic-Bold',
  mono: 'IBMPlexMono', // données : MRZ, n° documents, IDs (toujours LTR)
} as const;

/** Tailles typographiques — gros textes : l'agent est debout, dehors, de nuit. */
export const type = {
  displayXL: 40,
  displayL: 30,
  title: 24,
  heading: 20,
  body: 17,
  bodyStrong: 17,
  label: 15,
  caption: 13,
} as const;

export const shadow = {
  card: {
    shadowColor: colors.encre,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  float: {
    shadowColor: colors.encre,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

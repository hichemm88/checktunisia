/**
 * Qayed design tokens — « l'encre du cachet officiel »
 * Converted 1:1 from the web app's tailwind.config.js brand palette so the native
 * app stays visually identical to qayed.tn. Do not invent new colours here — mirror
 * the web tokens. (Ref: BRAND.md / qayed-tokens.css → tailwind.config.js `qayed.*`.)
 */

export const colors = {
  // Core brand — the official-seal ink
  encre: '#10222E', // deep ink — primary text / headers / splash
  papier: '#F6F5F1', // paper — app background
  cachet: '#5346A8', // seal violet — primary action
  cachetFonce: '#443896', // pressed / darker violet
  cachetSombre: '#8B7FE0', // light violet accent
  cachetDilue: '#EEEBFA', // diluted violet — tints / chart tracks

  // Semantic
  conforme: '#1F9D6B', // success green
  conformeFond: '#E4F5EC',
  conformeTexte: '#137453',
  vigilance: '#E3A008', // warning amber
  vigilanceFond: '#FBF0D7',
  vigilanceTexte: '#8A6206',
  danger: '#C0392B',
  dangerFond: '#FBE9E7',

  // Neutrals
  fiche: '#8A94A0', // muted grey — secondary text
  ligne: '#DDD9CF', // hairline / borders
  blanc: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#FAFAF7',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radius = {
  card: 20,
  btn: 14,
  input: 12,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
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
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// Status → colour mapping, identical to the web status badges.
export const statusColors: Record<string, { fg: string; bg: string }> = {
  draft: { fg: colors.fiche, bg: '#EEEDE9' },
  active: { fg: colors.conformeTexte, bg: colors.conformeFond },
  completed: { fg: colors.cachet, bg: colors.cachetDilue },
  cancelled: { fg: colors.danger, bg: colors.dangerFond },
  no_show: { fg: colors.vigilanceTexte, bg: colors.vigilanceFond },
};

export const theme = {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
  statusColors,
};

export default theme;

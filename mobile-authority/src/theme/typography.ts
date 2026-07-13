import { I18nManager, TextStyle } from 'react-native';
import { fonts, colors, type } from './tokens';

/**
 * Sélection de la famille de police selon la direction courante.
 * En arabe (RTL), le corps de texte utilise IBM Plex Sans Arabic.
 * Les données (MRZ, n° document, IDs) restent TOUJOURS en IBM Plex Mono, LTR.
 */
export const bodyFont = (weight: 'regular' | 'medium' | 'bold' = 'regular'): string => {
  if (I18nManager.isRTL) {
    return weight === 'bold' ? fonts.arabicBold : fonts.arabic;
  }
  if (weight === 'bold') return fonts.sansBold;
  if (weight === 'medium') return fonts.sansMedium;
  return fonts.sans;
};

/** Style pour les données monospace — LTR forcé même en contexte RTL. */
export const monoStyle: TextStyle = {
  fontFamily: fonts.mono,
  writingDirection: 'ltr',
  textAlign: 'left',
  letterSpacing: 0.5,
  color: colors.encre,
};

/** Alignement de texte qui suit la direction (début de ligne logique). */
export const textStart: TextStyle['textAlign'] = I18nManager.isRTL ? 'right' : 'left';
export const textEnd: TextStyle['textAlign'] = I18nManager.isRTL ? 'left' : 'right';

export const heading = (size: number = type.heading): TextStyle => ({
  fontFamily: bodyFont('bold'),
  fontSize: size,
  color: colors.encre,
  textAlign: textStart,
});

export const bodyText = (size: number = type.body): TextStyle => ({
  fontFamily: bodyFont('regular'),
  fontSize: size,
  color: colors.encre,
  textAlign: textStart,
});

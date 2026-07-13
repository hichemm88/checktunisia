import { I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Icônes directionnelles inversées en RTL (§6). Le chevron « suivant » pointe
 * vers la fin de ligne logique : droite en LTR, gauche en RTL.
 */
export const CHEVRON_FORWARD: keyof typeof Ionicons.glyphMap = I18nManager.isRTL
  ? 'chevron-back'
  : 'chevron-forward';

export const CHEVRON_BACK: keyof typeof Ionicons.glyphMap = I18nManager.isRTL
  ? 'chevron-forward'
  : 'chevron-back';

export const ARROW_BACK: keyof typeof Ionicons.glyphMap = I18nManager.isRTL
  ? 'arrow-forward'
  : 'arrow-back';

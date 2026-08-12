import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RTL_LANGUAGES } from '@/i18n';

interface Props {
  className?: string;
  strokeWidth?: number;
}

/**
 * Flèches conscientes du sens de lecture.
 *
 * En arabe, l'interface se lit de droite à gauche mais toutes les flèches
 * continuaient de pointer à gauche pour « précédent » et à droite pour
 * « suivant » — l'inverse du sens de lecture. `ArrowNext` et `ArrowPrev`
 * désignent une INTENTION (avancer, reculer) et non une direction physique :
 * elles choisissent le glyphe selon la langue active.
 */
const useIsRtl = () => {
  const { i18n } = useTranslation();
  return RTL_LANGUAGES.includes(i18n.resolvedLanguage ?? 'fr');
};

export const ArrowNext = (p: Props) => {
  const Icon = useIsRtl() ? ArrowLeft : ArrowRight;
  return <Icon {...p} aria-hidden="true" />;
};

export const ArrowPrev = (p: Props) => {
  const Icon = useIsRtl() ? ArrowRight : ArrowLeft;
  return <Icon {...p} aria-hidden="true" />;
};

export const ChevronNext = (p: Props) => {
  const Icon = useIsRtl() ? ChevronLeft : ChevronRight;
  return <Icon {...p} aria-hidden="true" />;
};

export const ChevronPrev = (p: Props) => {
  const Icon = useIsRtl() ? ChevronRight : ChevronLeft;
  return <Icon {...p} aria-hidden="true" />;
};

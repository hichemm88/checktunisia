import { useTranslation } from 'react-i18next';

/** Ancre posée sur le <main> de chaque gabarit ; cible de ce lien. */
export const MAIN_CONTENT_ID = 'contenu-principal';

/**
 * Lien d'évitement — « Aller au contenu ».
 *
 * ── Ce qu'il corrige ─────────────────────────────────────────────────────
 *
 * Chaque écran répète le même en-tête (établissement, notifications, langue,
 * profil, déconnexion) avant d'arriver au contenu. Mesuré sur l'assistant de
 * check-in : 69 éléments atteignables au clavier, dont la même dizaine en tête
 * de PAGE APRÈS PAGE.
 *
 * Un utilisateur à la souris n'en voit rien. Un utilisateur au clavier — y
 * compris quelqu'un qui a simplement une main occupée par un passeport, ce qui
 * est le quotidien d'une réception — les retraverse à chaque navigation.
 *
 * C'est le critère WCAG 2.4.1 « Contourner des blocs », niveau A.
 *
 * ── Pourquoi il est invisible jusqu'au focus ─────────────────────────────
 *
 * `sr-only` le retire de l'affichage sans le retirer de l'ordre de tabulation ;
 * `focus:not-sr-only` le fait réapparaître dès qu'il reçoit le focus. Il est
 * donc gratuit visuellement, et c'est la toute première chose qu'atteint la
 * touche Tab.
 *
 * Il ne remplace pas les repères ARIA (`main`, `nav`, `banner`) déjà en place :
 * ceux-ci servent aux lecteurs d'écran, qui savent sauter de repère en repère.
 * Ce lien-ci sert à qui voit l'écran mais n'a pas de souris — et que les
 * repères n'aident pas.
 */
export const SkipToContent = () => {
  const { t } = useTranslation();

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50
                 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm
                 focus:font-semibold focus:text-qayed-encre focus:shadow-float"
    >
      {t('common.skipToContent')}
    </a>
  );
};

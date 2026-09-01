import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publisherFooterLine } from '@/config/publisher';

/**
 * Mention de l'éditeur pour les pages publiques SANS l'habillage du site
 * (connexion, inscription, mot de passe oublié…). Ces écrans sont autonomes :
 * ils n'ont pas le pied de page de SiteChrome, et se retrouvaient donc être les
 * seules pages publiques où l'entité juridique n'apparaissait nulle part.
 *
 * Se place sous la ligne de copyright existante, dans le même registre visuel —
 * discret, mais en texte sélectionnable et indexable.
 */
export const PublisherNotice = () => {
  const { i18n, t } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'fr';

  return (
    <p className="mt-1 text-center text-[11px] leading-relaxed text-gray-400">
      {publisherFooterLine(lang)}
      {' · '}
      <Link to={`/${lang}/mentions-legales`} className="underline hover:text-gray-600">
        {t('site.legalNotice')}
      </Link>
    </p>
  );
};

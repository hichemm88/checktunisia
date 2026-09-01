import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SectionHeadingBlock, ProseBlock } from '@/cms/blocks';
import { SiteChrome } from '@/cms/SiteChrome';
import { useSeoMeta } from '@/cms/useSeoMeta';
import type { CmsLang } from '@/api/cms';
import { MENTIONS_LEGALES } from './mentionsLegalesContent';

/**
 * Mentions légales — page portée par le CODE, pas par le CMS.
 *
 * C'est la seule page du site public dont le contenu est une obligation
 * d'affichage : elle doit être exacte et présente en permanence. Une page CMS
 * ne donne pas cette garantie — son contenu vit en base, peut être dépublié ou
 * vidé depuis l'admin, et un redéploiement ne le restaure pas. Elle est donc
 * figée dans le dépôt, versionnée et relue en revue de code.
 *
 * Conséquence assumée : contrairement aux CGV et à la politique de
 * confidentialité, cette page-ci n'est plus modifiable depuis l'admin. Sa route
 * est déclarée AVANT la route CMS `/:locale/:slug` dans App.tsx et prend donc le
 * pas sur la page `mentions-legales` restée en base.
 *
 * Le rendu réutilise les blocs du CMS (SectionHeading, Prose) : même
 * typographie et mêmes espacements que les autres pages légales, aucun style
 * nouveau.
 */

const VALID_LANGS: CmsLang[] = ['fr', 'en', 'ar'];

export const MentionsLegalesPage = ({ localeOverride }: { localeOverride?: CmsLang }) => {
  const params = useParams<{ locale?: string }>();
  const { i18n } = useTranslation();

  // Une langue inconnue dans l'URL ne doit pas faire disparaître une page
  // obligatoire : on retombe sur le français, langue source.
  const requested = (localeOverride ?? params.locale ?? i18n.resolvedLanguage ?? 'fr') as CmsLang;
  const locale: CmsLang = VALID_LANGS.includes(requested) ? requested : 'fr';

  useEffect(() => {
    if (i18n.resolvedLanguage !== locale) i18n.changeLanguage(locale);
  }, [locale, i18n]);

  const content = MENTIONS_LEGALES[locale];

  useSeoMeta({
    title: content.metaTitle,
    description: content.metaDescription,
    slug: 'mentions-legales',
    lang: locale,
  });

  return (
    <SiteChrome>
      <SectionHeadingBlock title={content.pageTitle} centered={false} background="default" />
      {content.sections.map((s) => (
        <ProseBlock key={s.title} title={s.title} text={s.text} background="default" />
      ))}
    </SiteChrome>
  );
};

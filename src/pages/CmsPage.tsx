import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchCmsPage, type CmsLang } from '@/api/cms';
import { RenderContent } from '@/cms/RenderContent';
import { SiteChrome } from '@/cms/SiteChrome';
import { useSeoMeta } from '@/cms/useSeoMeta';

const VALID_LANGS: CmsLang[] = ['fr', 'en', 'ar'];

/**
 * Donnée structurée schema.org de la page d'accueil (éditeur + application).
 * Statique : décrit le produit Qayed pour les résultats enrichis Google.
 */
const HOME_STRUCTURED_DATA: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://qayed.tn/#organization',
      name: 'Qayed',
      url: 'https://qayed.tn',
      logo: 'https://qayed.tn/icon-512.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://qayed.tn/#website',
      url: 'https://qayed.tn',
      name: 'Qayed',
      publisher: { '@id': 'https://qayed.tn/#organization' },
      inLanguage: ['fr', 'en', 'ar'],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Qayed',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: { '@type': 'Offer', priceCurrency: 'TND' },
      description:
        "Qayed remplace la fiche de police papier : scan du passeport ou de la CIN, extraction automatique des données et transmission aux autorités en temps réel.",
    },
  ],
};

const NotFoundView = () => (
  <div style={{ padding: '120px 24px', textAlign: 'center' }}>
    <p style={{ fontFamily: 'var(--font-d)', fontSize: 40, fontWeight: 900 }}>404</p>
    <p style={{ color: 'var(--fiche)', marginTop: 8 }}>Cette page n'existe pas ou n'est plus publiée.</p>
    <Link to="/" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>Retour à l'accueil</Link>
  </div>
);

/**
 * Route publique des pages CMS : /:locale/:slug (+ /:locale seul → home).
 * La langue de l'URL pilote i18next (et donc dir RTL) ; le contenu Puck de
 * la langue active est rendu, avec fallback sur le français.
 */
export const CmsPage = ({ slugOverride, localeOverride }: { slugOverride?: string; localeOverride?: CmsLang }) => {
  const params = useParams<{ locale?: string; slug?: string }>();
  const { i18n } = useTranslation();

  const locale = (localeOverride ?? params.locale ?? i18n.resolvedLanguage ?? 'fr') as CmsLang;
  const slug = slugOverride ?? params.slug ?? 'home';
  const validLocale = VALID_LANGS.includes(locale);

  useEffect(() => {
    if (validLocale && i18n.resolvedLanguage !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, validLocale, i18n]);

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: () => fetchCmsPage(slug),
    staleTime: 60 * 1000,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      return status !== 404 && failureCount < 2;
    },
    enabled: validLocale,
  });

  const meta = page?.meta?.[locale] ?? page?.meta?.fr;
  const isHome = slug === 'home';
  useSeoMeta({
    title: meta?.title ?? (page ? `${slug} — Qayed` : 'Qayed'),
    description: meta?.description,
    slug: isHome ? '' : slug,
    lang: locale,
    // Donnée structurée schema.org sur la page d'accueil : aide aux résultats
    // enrichis (nom, logo, application, éditeur).
    structuredData: isHome ? HOME_STRUCTURED_DATA : undefined,
  });

  const data = page?.content?.[locale] ?? page?.content?.fr;

  return (
    <SiteChrome>
      {!validLocale || isError ? (
        <NotFoundView />
      ) : isLoading ? (
        <div style={{ minHeight: '60vh' }} />
      ) : data ? (
        <RenderContent data={data} />
      ) : (
        <NotFoundView />
      )}
    </SiteChrome>
  );
};

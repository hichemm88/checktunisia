import { useEffect } from 'react';

const SITE_URL = 'https://qayed.tn';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.svg`;
const LANGS = ['fr', 'en', 'ar'] as const;

/** og:locale par langue d'interface. */
const OG_LOCALE: Record<string, string> = { fr: 'fr_FR', en: 'en_US', ar: 'ar_TN' };

interface SeoMeta {
  title?: string | null;
  description?: string | null;
  /** Slug de la page CMS — '' pour la homepage. Ignoré si canonicalPath est fourni. */
  slug?: string;
  lang: string;
  /** Image de partage (og:image / twitter:image). Défaut : og-image du site. */
  image?: string | null;
  /** og:type (website, article...). Défaut : website. */
  type?: string;
  /**
   * Chemin canonique explicite (ex. '/register') pour les routes applicatives
   * hors CMS : pose canonical + og:url directement et n'émet PAS de hreflang
   * (ces pages ont une URL unique, pas de variantes par langue).
   */
  canonicalPath?: string;
  /** Donnée structurée JSON-LD (schema.org) injectée dans un <script>. */
  structuredData?: Record<string, unknown> | null;
}

const upsert = (selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void): HTMLElement => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    el.setAttribute('data-cms-seo', '1');
    document.head.appendChild(el);
  }
  set(el);
  return el;
};

const meta = (attr: 'name' | 'property', key: string, content: string) =>
  upsert(`meta[${attr}="${key}"][data-cms-seo]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(attr, key);
    return m;
  }, (el) => el.setAttribute('content', content));

/**
 * Méta SEO des pages : title/description, canonical, hreflang FR/AR/EN (pages
 * CMS), balises Open Graph + Twitter et JSON-LD optionnel.
 *
 * SPA : les balises sont posées côté client. Google exécute le JS et les prend
 * en compte ; le partage social (crawlers sans JS) reste servi par le HTML
 * initial — limite acceptée tant qu'il n'y a pas de SSR/prerender (décision
 * produit).
 */
export const useSeoMeta = ({
  title, description, slug, lang, image, type = 'website', canonicalPath, structuredData,
}: SeoMeta) => {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    const cmsPath = (l: string) => (slug ? `/${l}/${slug}` : (l === 'fr' ? '/' : `/${l}`));
    const canonical = canonicalPath ?? cmsPath(lang);
    const desc = description ?? '';
    const img = image ?? DEFAULT_IMAGE;

    // Description standard.
    meta('name', 'description', desc);

    // Canonical.
    upsert('link[rel="canonical"][data-cms-seo]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }, (el) => el.setAttribute('href', SITE_URL + canonical));

    // hreflang — uniquement pour les pages CMS (URL par langue), pas les routes app.
    if (!canonicalPath) {
      for (const l of LANGS) {
        upsert(`link[rel="alternate"][hreflang="${l}"][data-cms-seo]`, () => {
          const link = document.createElement('link');
          link.setAttribute('rel', 'alternate');
          link.setAttribute('hreflang', l);
          return link;
        }, (el) => el.setAttribute('href', SITE_URL + cmsPath(l)));
      }
      upsert('link[rel="alternate"][hreflang="x-default"][data-cms-seo]', () => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', 'x-default');
        return link;
      }, (el) => el.setAttribute('href', SITE_URL + cmsPath('fr')));
    }

    // Open Graph.
    if (title) meta('property', 'og:title', title);
    meta('property', 'og:description', desc);
    meta('property', 'og:type', type);
    meta('property', 'og:url', SITE_URL + canonical);
    meta('property', 'og:image', img);
    meta('property', 'og:locale', OG_LOCALE[lang] ?? 'fr_FR');
    for (const l of LANGS) {
      if (l !== lang) {
        upsert(`meta[property="og:locale:alternate"][data-og-alt="${l}"]`, () => {
          const m = document.createElement('meta');
          m.setAttribute('property', 'og:locale:alternate');
          m.setAttribute('data-og-alt', l);
          m.setAttribute('data-cms-seo', '1');
          return m;
        }, (el) => el.setAttribute('content', OG_LOCALE[l] ?? l));
      }
    }

    // Twitter.
    if (title) meta('name', 'twitter:title', title);
    meta('name', 'twitter:description', desc);
    meta('name', 'twitter:image', img);

    // JSON-LD structuré.
    if (structuredData) {
      upsert('script[type="application/ld+json"][data-cms-seo]', () => {
        const s = document.createElement('script');
        s.setAttribute('type', 'application/ld+json');
        return s;
      }, (el) => { el.textContent = JSON.stringify(structuredData); });
    }

    return () => {
      document.title = prevTitle;
      document.head.querySelectorAll('[data-cms-seo]').forEach((el) => el.remove());
    };
  }, [title, description, slug, lang, image, type, canonicalPath, structuredData]);
};

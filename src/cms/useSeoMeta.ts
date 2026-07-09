import { useEffect } from 'react';

const SITE_URL = 'https://qayed.tn';
const LANGS = ['fr', 'en', 'ar'] as const;

interface SeoMeta {
  title?: string | null;
  description?: string | null;
  /** Slug de la page CMS — '' pour la homepage. */
  slug: string;
  lang: string;
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

/**
 * Méta SEO des pages CMS : title/description par langue, canonical et
 * hreflang FR/AR/EN (+ x-default → fr). SPA : les balises sont posées côté
 * client — Google exécute le JS, mais ce n'est pas équivalent à du SSR
 * (limite acceptée, cf. décision produit).
 */
export const useSeoMeta = ({ title, description, slug, lang }: SeoMeta) => {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    const path = (l: string) => (slug ? `/${l}/${slug}` : (l === 'fr' ? '/' : `/${l}`));

    upsert('meta[name="description"][data-cms-seo]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      return m;
    }, (el) => el.setAttribute('content', description ?? ''));

    upsert('link[rel="canonical"][data-cms-seo]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }, (el) => el.setAttribute('href', SITE_URL + path(lang)));

    const alternates: HTMLElement[] = [];
    for (const l of LANGS) {
      alternates.push(upsert(`link[rel="alternate"][hreflang="${l}"][data-cms-seo]`, () => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', l);
        return link;
      }, (el) => el.setAttribute('href', SITE_URL + path(l))));
    }
    alternates.push(upsert('link[rel="alternate"][hreflang="x-default"][data-cms-seo]', () => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', 'x-default');
      return link;
    }, (el) => el.setAttribute('href', SITE_URL + path('fr'))));

    return () => {
      document.title = prevTitle;
      document.head.querySelectorAll('[data-cms-seo]').forEach((el) => el.remove());
    };
  }, [title, description, slug, lang]);
};

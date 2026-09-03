import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const RTL_LANGUAGES = ['ar'];

export const applyDocumentDirection = (lng: string) => {
  const isRtl = RTL_LANGUAGES.includes(lng);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

const SUPPORTED = ['fr', 'en', 'ar'] as const;
type Lang = (typeof SUPPORTED)[number];

/*
 * Les trois langues étaient importées en statique, donc présentes dans le
 * chunk d'entrée de chaque visite : 296 Ko bruts, 81 Ko gzippés, dont un
 * visiteur n'en lit jamais qu'un tiers.
 *
 * `import()` par langue les sort du chemin critique. Vite en fait trois chunks
 * séparés, et le navigateur ne télécharge que celui dont il a besoin.
 */
const loaders: Record<Lang, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import('./locales/fr.json'),
  en: () => import('./locales/en.json'),
  ar: () => import('./locales/ar.json'),
};

/*
 * Greffon de chargement, plutôt qu'un `import()` posé au démarrage.
 *
 * La langue ne change pas qu'au lancement : cinq endroits appellent
 * `i18n.changeLanguage()` (sélecteur d'en-tête, pages CMS, mentions légales).
 * Charger « la langue détectée » une bonne fois laisserait tous ces appels
 * basculer vers une langue dont les traductions ne sont pas là — l'écran
 * afficherait ses clefs brutes.
 *
 * En passant par l'interface de chargement d'i18next, c'est LUI qui réclame les
 * ressources quand il en a besoin : à l'amorçage, à chaque changement de
 * langue, et pour la langue de repli. Les appelants n'ont rien à savoir, et un
 * futur point de bascule fonctionne sans qu'on y pense.
 *
 * Ce dernier point n'est pas théorique : `ar.json` n'a pas les 22 formes
 * plurielles `_one` que porte `fr.json`. Sans chargement du repli, ces
 * libellés-là s'afficheraient en clef brute dans l'interface arabe. i18next
 * charge `fallbackLng` de lui-même — la correction tient donc, y compris sur ce
 * cas qu'on n'aurait pas pensé à traiter à la main.
 */
const lazyBackend = {
  type: 'backend' as const,
  init: () => {},
  read(
    language: string,
    _namespace: string,
    callback: (error: unknown, data?: Record<string, unknown>) => void,
  ) {
    const load = loaders[language as Lang];

    // Langue hors liste : on rend un jeu vide plutôt qu'une erreur. i18next
    // bascule alors sur le repli, ce qui vaut mieux qu'une interface cassée.
    if (!load) {
      callback(null, {});

      return;
    }

    load()
      .then((module) => callback(null, module.default))
      .catch((error) => callback(error));
  },
};

/**
 * Résolu quand la langue de départ est disponible.
 *
 * `main.tsx` l'attend avant le premier rendu. Sans cela, React afficherait un
 * écran de clefs brutes le temps du chargement — un défaut bien plus visible
 * que les quelques dizaines de kilo-octets que ce découpage fait gagner.
 */
export const i18nReady = i18n
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'qayed-lang',
    },
    // Le rendu est retenu jusqu'à `i18nReady` : react-i18next n'a donc pas à
    // suspendre de son côté, ce qui éviterait un second mécanisme d'attente
    // pour le même chargement.
    react: { useSuspense: false },
  })
  .then(() => {
    applyDocumentDirection(i18n.resolvedLanguage ?? 'fr');
  });

i18n.on('languageChanged', applyDocumentDirection);

export default i18n;

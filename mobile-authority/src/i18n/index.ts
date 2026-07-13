import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import ar from './locales/ar.json';
import fr from './locales/fr.json';
import en from './locales/en.json';

export const SUPPORTED_LANGS = ['ar', 'fr', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const RTL_LANGUAGES: Lang[] = ['ar'];
export const isRtlLang = (lng: string) => RTL_LANGUAGES.includes(lng as Lang);

const STORAGE_KEY = 'qayed-auth-lang';

/**
 * Détermine la langue de démarrage.
 * L'arabe est la langue par défaut (app du Ministère) — on ne retombe sur
 * la langue de l'appareil que si elle fait partie des langues supportées.
 */
export async function resolveInitialLanguage(): Promise<Lang> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored as Lang)) return stored as Lang;
  } catch {
    /* AsyncStorage indisponible — on continue */
  }
  const device = Localization.getLocales()[0]?.languageCode;
  if (device && SUPPORTED_LANGS.includes(device as Lang)) return device as Lang;
  return 'ar';
}

export async function initI18n() {
  const lng = await resolveInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: ar },
      fr: { translation: fr },
      en: { translation: en },
    },
    lng,
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  // Aligner la direction native sur la langue résolue au démarrage.
  syncNativeDirection(lng);
  return i18n;
}

/**
 * Force la direction native (I18nManager) à correspondre à la langue.
 * Retourne true si un changement de direction a eu lieu — dans ce cas un
 * redémarrage de l'app est nécessaire pour que le miroir RTL s'applique.
 */
export function syncNativeDirection(lng: string): boolean {
  const shouldBeRtl = isRtlLang(lng);
  I18nManager.allowRTL(shouldBeRtl);
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.forceRTL(shouldBeRtl);
    return true;
  }
  return false;
}

/**
 * Change la langue. Persiste le choix, applique la traduction immédiatement.
 * Retourne { needsRestart } : true si le flip de direction RTL/LTR impose
 * un redémarrage (à annoncer à l'utilisateur — cf. §6 du cahier des charges).
 */
export async function changeLanguage(lng: Lang): Promise<{ needsRestart: boolean }> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* best effort */
  }
  await i18n.changeLanguage(lng);
  const needsRestart = syncNativeDirection(lng);
  return { needsRestart };
}

export default i18n;

import type { I18nText } from '@/api/admin/subscriptions';

/**
 * Resolve a trilingual text for the active language, falling back to French
 * (the required source language) when the translation is missing or empty.
 */
export const pickI18n = (text: I18nText | null | undefined, lang: string): string => {
  if (!text) return '';
  const value = text[lang as keyof I18nText];
  return (typeof value === 'string' && value.trim() !== '') ? value : text.fr ?? '';
};

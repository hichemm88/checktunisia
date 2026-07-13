/** Libellés de nationalité pour les codes ISO présents en démo (fallback : code brut). */
const NAMES: Record<string, { fr: string; en: string; ar: string }> = {
  TUN: { fr: 'Tunisie', en: 'Tunisia', ar: 'تونس' },
  ITA: { fr: 'Italie', en: 'Italy', ar: 'إيطاليا' },
  FRA: { fr: 'France', en: 'France', ar: 'فرنسا' },
  DEU: { fr: 'Allemagne', en: 'Germany', ar: 'ألمانيا' },
  GBR: { fr: 'Royaume-Uni', en: 'United Kingdom', ar: 'المملكة المتّحدة' },
  RUS: { fr: 'Russie', en: 'Russia', ar: 'روسيا' },
  JPN: { fr: 'Japon', en: 'Japan', ar: 'اليابان' },
  DZA: { fr: 'Algérie', en: 'Algeria', ar: 'الجزائر' },
  LBY: { fr: 'Libye', en: 'Libya', ar: 'ليبيا' },
  SRB: { fr: 'Serbie', en: 'Serbia', ar: 'صربيا' },
  AUT: { fr: 'Autriche', en: 'Austria', ar: 'النمسا' },
};

export function nationalityName(code: string | null | undefined, lang: string): string {
  if (!code) return '—';
  const entry = NAMES[code.toUpperCase()];
  if (!entry) return code;
  const label = entry[(lang as 'fr' | 'en' | 'ar') ?? 'fr'] ?? entry.fr;
  // Code ISO en mono à côté du nom (référence administrative).
  return `${label} (${code.toUpperCase()})`;
}

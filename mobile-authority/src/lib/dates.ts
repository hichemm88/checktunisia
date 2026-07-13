/**
 * Formatage de dates localisé.
 * - Chiffres occidentaux (0-9) partout, y compris en arabe (usage administratif tunisien).
 * - Mois tunisiens en arabe (جانفي… et non يناير du Machrek).
 */

const MONTHS: Record<string, string[]> = {
  ar: [
    'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
    'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
  fr: [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Ex. « 13 جويلية 2026 » / « 13 juillet 2026 » / « July 13, 2026 ». */
export function formatDate(iso: string | null | undefined, lang: string): string {
  const d = parse(iso);
  if (!d) return '—';
  const months = MONTHS[lang] ?? MONTHS.fr;
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  if (lang === 'en') return `${month} ${day}, ${year}`;
  return `${day} ${month} ${year}`;
}

/** Heure locale HH:MM (chiffres occidentaux). */
export function formatTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Durée écoulée en libellé compact (fraîcheur de fiche). */
export function formatElapsed(iso: string | null | undefined, lang: string, nowMs: number): string {
  const d = parse(iso);
  if (!d) return '—';
  const diffMin = Math.max(0, Math.round((nowMs - d.getTime()) / 60000));
  const hours = Math.floor(diffMin / 60);
  const days = Math.floor(hours / 24);

  const unit = (n: number, key: 'min' | 'h' | 'd') => {
    const labels: Record<string, Record<string, string>> = {
      ar: { min: 'دقيقة', h: 'ساعة', d: 'يوم' },
      fr: { min: 'min', h: 'h', d: 'j' },
      en: { min: 'min', h: 'h', d: 'd' },
    };
    return `${n} ${(labels[lang] ?? labels.fr)[key]}`;
  };

  if (days >= 1) return unit(days, 'd');
  if (hours >= 1) return unit(hours, 'h');
  return unit(diffMin, 'min');
}

/** Un établissement silencieux depuis > 48h est un signal (cf. F4). */
export const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

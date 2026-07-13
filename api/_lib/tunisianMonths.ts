/**
 * Mois tunisiens (graphie dérivée du français, pas les mois arabes orientaux) et
 * parsing d'une date de naissance de CIN vers le format ISO `YYYY-MM-DD`.
 *
 * La CIN tunisienne imprime la date au format « JJ MOIS AAAA » avec le nom du mois
 * en toutes lettres (ex. « 21 فيفري 1962 »). Claude renvoie déjà, dans le cas
 * nominal, une date ISO — mais on garde ici une couche de secours/normalisation qui
 * tolère aussi la forme « JJ MOIS AAAA » renvoyée telle quelle, et qui est testée
 * unitairement sur les 12 mois (critère d'acceptation).
 */

/** Graphie tunisienne officielle → numéro de mois (01–12). */
export const TUNISIAN_MONTHS: Record<string, number> = {
  جانفي: 1,
  فيفري: 2,
  مارس: 3,
  أفريل: 4,
  ماي: 5,
  جوان: 6,
  جويلية: 7,
  أوت: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

// Variantes orthographiques (alef hamza omis, formes MSA parfois vues) → même numéro.
const MONTH_ALIASES: Record<string, number> = {
  افريل: 4,
  اوت: 8,
  اكتوبر: 10,
  // Formes MSA (au cas où une carte ou l'OCR les produit) :
  يناير: 1,
  فبراير: 2,
  إبريل: 4,
  ابريل: 4,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  اغسطس: 8,
};

const ALL_MONTHS: Record<string, number> = { ...TUNISIAN_MONTHS, ...MONTH_ALIASES };

// Retire les diacritiques (harakat) et le tatweel pour un appariement robuste.
function stripArabicMarks(s: string): string {
  return s.replace(/[ً-ْٰـ]/g, '');
}

function isPlausibleYear(y: number): boolean {
  return y >= 1900 && y <= new Date().getFullYear();
}

/** Numéro de mois (1–12) pour un nom de mois tunisien, ou `null` si inconnu. */
export function tunisianMonthToNumber(name: string): number | null {
  const clean = stripArabicMarks(name.trim());
  return ALL_MONTHS[clean] ?? null;
}

/**
 * Normalise une date de naissance vers `YYYY-MM-DD`.
 *
 * Accepte :
 *  - une date déjà ISO `YYYY-MM-DD` (validée),
 *  - la forme tunisienne « JJ MOIS AAAA » (ex. « 21 فيفري 1962 »),
 *  - la forme numérique JJ/MM/AAAA (ou séparée par `-` / `.`).
 *
 * Renvoie `null` si la date est illisible ou invraisemblable (année hors 1900..présent,
 * jour hors 1..31, mois hors 1..12) — jamais d'invention.
 */
export function parseTunisianBirthDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = stripArabicMarks(String(raw)).trim();

  // 1) Déjà ISO ?
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, mo, d] = iso;
    return validate(+y, +mo, +d);
  }

  // 2) « JJ MOIS AAAA » avec mois en lettres arabes.
  const tokens = text.split(/\s+/).filter(Boolean);
  const monthIdx = tokens.findIndex((t) => tunisianMonthToNumber(t) !== null);
  if (monthIdx !== -1) {
    const month = tunisianMonthToNumber(tokens[monthIdx])!;
    const day = tokens
      .slice(0, monthIdx)
      .reverse()
      .map((t) => t.replace(/\D/g, ''))
      .find((t) => /^\d{1,2}$/.test(t));
    const year = tokens
      .slice(monthIdx + 1)
      .map((t) => t.replace(/\D/g, ''))
      .find((t) => t.length >= 4)
      ?.slice(0, 4);
    if (day && year) return validate(+year, month, +day);
  }

  // 3) Forme numérique JJ/MM/AAAA.
  const numeric = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (numeric) {
    const [, d, mo, y] = numeric;
    return validate(+y, +mo, +d);
  }

  return null;
}

function validate(year: number, month: number, day: number): string | null {
  if (!isPlausibleYear(year)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

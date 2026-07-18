import type { Mesure } from '@/api/observatoire';

/**
 * Utilitaires du dashboard Observatoire.
 *
 * Regle #5 : aucun emoji. Les drapeaux eventuels passent par des images flagcdn
 * (autorisees par la CSP), jamais par des emoji drapeaux.
 */

/** Formate une mesure agregee. Le marqueur de seuil devient « < seuil ». */
export function formatMesure(v: Mesure | null | undefined, locale = 'fr'): string {
  if (v === null || v === undefined || v === '<seuil') return '< seuil';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : 'fr-FR').format(v);
}

/** Formate une variation en pourcentage (+/-), ou tiret si indisponible. */
export function formatVariation(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '—';
  const signe = pct > 0 ? '+' : '';
  return `${signe}${pct.toFixed(1)} %`;
}

/** URL du drapeau (image, pas emoji) depuis un code ISO alpha-2. */
export function flagUrl(iso2: string): string {
  return `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`;
}

/**
 * Nom de pays depuis un code ISO 3166-1 alpha-2, en FR ou AR.
 * Couvre les nationalites du seed de demonstration + marches courants ;
 * repli sur le code brut pour les autres.
 */
const NOMS: Record<string, { fr: string; ar: string }> = {
  FR: { fr: 'France', ar: 'فرنسا' },
  DE: { fr: 'Allemagne', ar: 'ألمانيا' },
  IT: { fr: 'Italie', ar: 'إيطاليا' },
  GB: { fr: 'Royaume-Uni', ar: 'المملكة المتحدة' },
  BE: { fr: 'Belgique', ar: 'بلجيكا' },
  NL: { fr: 'Pays-Bas', ar: 'هولندا' },
  ES: { fr: 'Espagne', ar: 'إسبانيا' },
  US: { fr: 'États-Unis', ar: 'الولايات المتحدة' },
  CA: { fr: 'Canada', ar: 'كندا' },
  DZ: { fr: 'Algérie', ar: 'الجزائر' },
  LY: { fr: 'Libye', ar: 'ليبيا' },
  CH: { fr: 'Suisse', ar: 'سويسرا' },
  SE: { fr: 'Suède', ar: 'السويد' },
  PL: { fr: 'Pologne', ar: 'بولندا' },
  RU: { fr: 'Russie', ar: 'روسيا' },
  TN: { fr: 'Tunisie', ar: 'تونس' },
  MA: { fr: 'Maroc', ar: 'المغرب' },
  PT: { fr: 'Portugal', ar: 'البرتغال' },
  AT: { fr: 'Autriche', ar: 'النمسا' },
  DK: { fr: 'Danemark', ar: 'الدنمارك' },
  CN: { fr: 'Chine', ar: 'الصين' },
  JP: { fr: 'Japon', ar: 'اليابان' },
};

export function nomPays(iso2: string, langue = 'fr'): string {
  const e = NOMS[iso2?.toUpperCase()];
  if (!e) return iso2;
  return langue === 'ar' ? e.ar : e.fr;
}

/** Libelle FR/AR d'un type d'etablissement. */
const TYPES: Record<string, { fr: string; ar: string }> = {
  maison_hotes: { fr: "Maison d'hôtes", ar: 'دار ضيافة' },
  dar: { fr: 'Dar', ar: 'دار' },
  location: { fr: 'Location', ar: 'كراء' },
  hotel: { fr: 'Hôtel', ar: 'نزل' },
};

export function nomType(type: string, langue = 'fr'): string {
  const e = TYPES[type];
  if (!e) return type;
  return langue === 'ar' ? e.ar : e.fr;
}

// ── Presets de periode ──────────────────────────────────────────────────────
export type PeriodePreset = '7j' | '30j' | 'trimestre' | 'annee' | 'perso';

/** Renvoie [debut, fin] au format ISO (YYYY-MM-DD) pour un preset. */
export function bornesPreset(preset: PeriodePreset, ref = new Date()): { debut: string; fin: string } {
  const fin = new Date(ref);
  const debut = new Date(ref);
  switch (preset) {
    case '7j':        debut.setDate(fin.getDate() - 6); break;
    case '30j':       debut.setDate(fin.getDate() - 29); break;
    case 'trimestre': debut.setDate(fin.getDate() - 89); break;
    case 'annee':     debut.setDate(fin.getDate() - 364); break;
    default:          debut.setDate(fin.getDate() - 29);
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { debut: iso(debut), fin: iso(fin) };
}

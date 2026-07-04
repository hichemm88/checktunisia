/**
 * Translittération arabe → latin, style français/tunisien.
 *
 * Objectif : produire une forme latine "à la passeport tunisien" (ex. محمد → MOHAMED,
 * بن علي → BEN ALI) à partir d'un nom/prénom lu en arabe sur une CIN (pas de zone MRZ
 * sur la CIN, donc pas de forme latine officielle imprimée sur le document).
 *
 * Limite intrinsèque : l'arabe non vocalisé (sans harakat) ne code pas les voyelles
 * brèves. Une translittération lettre-à-lettre générique ne peut donc pas deviner la
 * graphie française conventionnelle (ex. هشام se lit littéralement "H-CH-A-M" mais
 * s'écrit "HICHEM" sur les documents officiels tunisiens). On mitige ça avec un
 * dictionnaire des prénoms/particules les plus courants ; tout le reste retombe sur
 * un mapping lettre-à-lettre approximatif. Le résultat DOIT rester corrigeable par
 * l'utilisateur — il n'y a pas de solution automatique fiable à 100 % ici.
 */

function normalizeForLookup(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, '') // harakat / diacritiques
    .replace(/ـ/g, '') // tatweel
    .replace(/[إأٱآ]/g, 'ا') // formes du alef → alef nu
    .replace(/ى/g, 'ي') // alef maksura → ya
    .replace(/ة/g, 'ه') // ta marbuta → ha
    .replace(/[^؀-ۿ\s]/g, '') // retire tout ce qui n'est pas arabe (bruit OCR)
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Dictionnaire des prénoms/particules tunisiens les plus courants ───────────
// Clés en arabe "naturel" (normalisées automatiquement à l'init) → forme latine
// conventionnelle (celle qu'on retrouve typiquement sur un passeport tunisien).
const NAME_DICTIONARY_RAW: Record<string, string> = {
  // Prénoms masculins
  'محمد': 'MOHAMED', 'أحمد': 'AHMED', 'احمد': 'AHMED', 'علي': 'ALI', 'حسين': 'HOUSSINE',
  'هشام': 'HICHEM', 'سامي': 'SAMI', 'كريم': 'KARIM', 'وليد': 'WALID', 'نزار': 'NIZAR',
  'أنيس': 'ANIS', 'انيس': 'ANIS', 'أمين': 'AMINE', 'امين': 'AMINE', 'ياسين': 'YASSINE',
  'وسيم': 'WASSIM', 'شكري': 'CHOKRI', 'المنصف': 'MONCEF', 'منصف': 'MONCEF', 'حبيب': 'HABIB',
  'البشير': 'BECHIR', 'بشير': 'BECHIR', 'الطاهر': 'TAHER', 'طاهر': 'TAHER', 'سليم': 'SLIM',
  'رياض': 'RIADH', 'منير': 'MOUNIR', 'فتحي': 'FATHI', 'نبيل': 'NABIL', 'عادل': 'ADEL',
  'عماد': 'IMED', 'زياد': 'ZIED', 'مروان': 'MARWANE', 'إسلام': 'ISLEM', 'اسلام': 'ISLEM',
  'ريان': 'RAYEN', 'يوسف': 'YOUSSEF', 'إبراهيم': 'IBRAHIM', 'ابراهيم': 'IBRAHIM', 'عمر': 'OMAR',
  'حمزة': 'HAMZA', 'أيمن': 'AYMEN', 'ايمن': 'AYMEN', 'المهدي': 'MEHDI', 'مهدي': 'MEHDI',
  'إسكندر': 'SKANDER', 'اسكندر': 'SKANDER', 'وائل': 'WAEL', 'سيف': 'SEIF', 'مالك': 'MALEK',
  'نجيب': 'NAJIB', 'خالد': 'KHALED', 'طارق': 'TAREK', 'رضا': 'RIDHA', 'صالح': 'SALAH',
  'جمال': 'JAMEL', 'فوزي': 'FAOUZI', 'منصور': 'MANSOUR', 'إلياس': 'ILYES', 'الياس': 'ILYES',
  // Prénoms féminins
  'فاطمة': 'FATMA', 'أميرة': 'AMIRA', 'اميرة': 'AMIRA', 'سلمى': 'SALMA', 'سارة': 'SARRA',
  'ريم': 'RIM', 'ياسمين': 'YASMINE', 'إيناس': 'INES', 'ايناس': 'INES', 'آمنة': 'EMNA', 'امنة': 'EMNA',
  'أمل': 'AMEL', 'امل': 'AMEL', 'سعاد': 'SOUAD', 'ليلى': 'LEILA', 'أحلام': 'AHLEM', 'احلام': 'AHLEM',
  'نادية': 'NADIA', 'سنية': 'SONIA', 'منى': 'MOUNA', 'أسماء': 'ASMA', 'اسماء': 'ASMA',
  'هالة': 'HELA', 'رانيا': 'RANIA', 'يسرى': 'YOSRA', 'مريم': 'MARIEM', 'منال': 'MANEL',
  'صابرين': 'SABRINE', 'رحمة': 'RAHMA', 'مروى': 'MARWA', 'وفاء': 'WAFA', 'حياة': 'HAYET',
  // Particules de patronymes
  'بن': 'BEN', 'بنت': 'BENT', 'بو': 'BOU', 'آل': 'AL',
};

const DICTIONARY = new Map<string, string>();
for (const [ar, latin] of Object.entries(NAME_DICTIONARY_RAW)) {
  DICTIONARY.set(normalizeForLookup(ar), latin);
}

// ─── Fallback lettre-à-lettre (approximatif — pas de voyelles brèves) ──────────
const LETTER_MAP: Record<string, string> = {
  'ا': 'A', 'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'J', 'ح': 'H', 'خ': 'KH', 'د': 'D', 'ذ': 'DH',
  'ر': 'R', 'ز': 'Z', 'س': 'S', 'ش': 'CH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'DH', 'ع': 'A',
  'غ': 'GH', 'ف': 'F', 'ق': 'K', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H', 'و': 'OU',
  'ي': 'I', 'ء': '',
};

function fallbackTransliterate(word: string): string {
  let norm = normalizeForLookup(word);
  // Convention tunisienne courante : l'article défini "ال" en tête d'un patronyme
  // est généralement omis à la translittération (ex. الطرابلسي → TRABELSI).
  if (norm.length > 4 && norm.startsWith('ال')) norm = norm.slice(2);
  let out = '';
  for (const ch of norm) {
    if (ch === ' ') { out += ' '; continue; }
    out += LETTER_MAP[ch] ?? '';
  }
  return out;
}

/**
 * Translittère un nom/prénom arabe (tel que lu par l'OCR, non vocalisé) vers une
 * forme latine approximative. Chaque mot est cherché dans le dictionnaire des noms
 * tunisiens courants ; à défaut, retombe sur un mapping lettre-à-lettre.
 *
 * Toujours imparfait sur des noms hors dictionnaire — le champ résultant doit
 * rester éditable par l'utilisateur.
 */
export function transliterateArabicName(raw: string | null | undefined): string {
  if (!raw) return '';
  const words = raw.split(/\s+/).filter(Boolean);
  const out = words
    .map((w) => {
      const key = normalizeForLookup(w);
      if (!key) return '';
      return DICTIONARY.get(key) ?? fallbackTransliterate(w);
    })
    .filter(Boolean);
  return out.join(' ').toUpperCase();
}

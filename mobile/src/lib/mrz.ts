/**
 * MRZ reading — ported from the web app's src/lib/mrzScanner.ts so behaviour matches
 * qayed.tn. Uses the same `mrz` npm package (with autocorrect) for robust parsing, the same
 * structural line detection (TD3 / TD1 / TD2), and the same OCR digit-fix fallback for dates.
 *
 * The OCR text comes from ML Kit on the phone (the web uses Tesseract + an OCR-B model), but
 * the parsing/validation is identical. A best-effort result is returned for the human to
 * validate on the next screen (§7).
 */
import { parse as mrzParse } from 'mrz';

export interface MrzResult {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO YYYY-MM-DD, or '' if unreadable
  sex: 'M' | 'F' | 'X';
  nationality_code: string; // ISO 3166 alpha-3
  document_type: string; // 'passport' | 'national_id' | 'visa' | 'travel_document'
  document_number: string;
  issuing_country_code: string;
  expiry_date: string; // ISO YYYY-MM-DD, or ''
  mrz_line1?: string;
  mrz_line2?: string;
}

export interface MrzValidation {
  /** True when the `mrz` package considered the whole document valid (all checks pass). */
  ok: boolean;
  /** Number of key check digits that passed (0–3) — ranks reads across image regions. */
  confidence?: number;
  result?: MrzResult;
  error?: string;
}

function mrzDateToISO(yymmdd: string | null | undefined, isBirth: boolean): string {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  let century: number;
  if (isBirth) {
    const nowYY = new Date().getFullYear() % 100;
    century = yy > nowYY + 1 ? 1900 : 2000;
  } else {
    century = 2000; // expiry is always in the future / 2000s
  }
  return `${century + yy}-${mm}-${dd}`;
}

// Letter→digit fixes for date windows (same set the web uses). The `mrz` autocorrect only
// covers O↔0 / I↔1 in numeric fields, so B/G/S/Z residue in a date can still null a field.
const OCR_DIGIT_FIX: Record<string, string> = { O: '0', I: '1', B: '8', G: '6', S: '5', Z: '2' };

function fixDigits(s: string): string {
  return s
    .split('')
    .map((c) => (/[0-9]/.test(c) ? c : OCR_DIGIT_FIX[c] ?? c))
    .join('');
}

function fallbackTd3Date(line2: string, start: number): string | null {
  const digits = fixDigits(line2.slice(start, start + 6));
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** A TD3 data row (line 2) has 6-digit date windows at [13-19] and [21-27] (digit-fixed). */
function isTd3DataLine(l: string): boolean {
  return /^\d{6}$/.test(fixDigits(l.slice(13, 19))) && /^\d{6}$/.test(fixDigits(l.slice(21, 27)));
}

type Extracted = { lines: string[]; format: 'TD3' | 'TD1' | 'TD2' };

/**
 * Extract candidate MRZ lines from raw OCR text (ported from the web extractMrzLines).
 * Structural constraints (6-digit date windows on line 2) make false positives near-impossible.
 */
function extractMrzLines(rawText: string): Extracted | null {
  const candidates: string[] = [];
  for (const raw of rawText.split('\n')) {
    const clean = raw
      .toUpperCase()
      .replace(/[«»‹›|]/g, '<')
      .replace(/[ \t]{2,}/g, '<<')
      .replace(/[ \t]/g, '')
      .replace(/[^A-Z0-9<]/g, '');
    if (clean.length >= 20) candidates.push(clean);
  }

  // TD3 — 2 lines of 44. The data row (line 2) is the anchor: ML Kit often drops the trailing
  // filler run of an empty personal-number field, so line 2 can arrive much shorter than 44 —
  // we pad it back. Line 1 (names) is best-effort: preferred if it starts with P/I/V/A, else
  // any other candidate, else synthesised so the `mrz` package still gets a valid-length pair.
  {
    const td3 = candidates
      .filter((l) => l.length >= 20 && l.length <= 52)
      .map((l) => (l.length >= 44 ? l.slice(0, 44) : l.padEnd(44, '<')));
    const line2 = td3.find(isTd3DataLine);
    if (line2) {
      const line1 =
        td3.find((l) => /^[PIVA]/.test(l) && l !== line2 && !isTd3DataLine(l)) ??
        td3.find((l) => l !== line2 && !isTd3DataLine(l)) ??
        `P<${line2.slice(10, 13)}`.padEnd(44, '<'); // synthesise from the nationality field
      return { lines: [line1, line2], format: 'TD3' };
    }
  }

  // TD1 — 3 lines of 30
  {
    const td1 = candidates
      .filter((l) => l.length >= 26 && l.length <= 36)
      .map((l) => (l.length >= 30 ? l.slice(0, 30) : l.padEnd(30, '<')));
    const td1L2 = td1.filter((l) => /^\d{6}/.test(l) && /^\d{6}$/.test(l.slice(8, 14)));
    if (td1L2.length >= 1 && td1.length >= 3) return { lines: td1.slice(0, 3), format: 'TD1' };
  }

  // TD2 — 2 lines of 36
  {
    const td2 = candidates
      .filter((l) => l.length >= 32 && l.length <= 42)
      .map((l) => (l.length >= 36 ? l.slice(0, 36) : l.padEnd(36, '<')));
    const td2L1 = td2.filter((l) => /^[PIV]/.test(l));
    const td2L2 = td2.filter((l) => /^\d{6}$/.test(l.slice(13, 19)));
    if (td2L1.length >= 1 && td2L2.length >= 1) return { lines: [td2L1[0], td2L2[0]], format: 'TD2' };
  }

  // Fallback — the two rows concatenated into one ~88-char string.
  {
    const all = rawText.toUpperCase().replace(/[«»‹›|]/g, '<').replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '');
    if (all.length >= 72 && all.length <= 96) {
      const mid = Math.floor(all.length / 2);
      for (const cut of [44, mid, 43, 45, 42, 46]) {
        if (cut < 28 || cut > all.length - 20) continue;
        const h1 = all.slice(0, cut).padEnd(44, '<');
        const h2 = all.slice(cut, cut + 44).padEnd(44, '<');
        if (isTd3DataLine(h2)) return { lines: [h1, h2], format: 'TD3' };
      }
    }
  }

  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toMrzResult(result: any, td3Line2: string | null): MrzResult {
  const f = result.fields ?? {};

  let sex: MrzResult['sex'] = 'X';
  if (f.sex === 'male') sex = 'M';
  else if (f.sex === 'female') sex = 'F';

  const code = String(f.documentCode ?? '').toUpperCase();
  let document_type = 'travel_document';
  if (code.startsWith('P')) document_type = 'passport';
  else if (/^[IAC]/.test(code)) document_type = 'national_id';
  else if (code.startsWith('V')) document_type = 'visa';

  // ML Kit reads the MRZ '<' filler as a trailing 'K'/'C'. Strip the clearly-filler cases
  // (a space-separated trailing letter, or a run of 2+) without touching real names. A lone
  // attached trailing 'K' is deliberately kept (ambiguous with names like TAREK / MALEK).
  const cleanName = (s: string | null | undefined): string => {
    if (!s) return '';
    return s
      .replace(/<+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+[KC]$/, '') // 'FERIEL K' -> 'FERIEL'
      .replace(/[KC]{2,}$/, '') // 'NAMEKK'  -> 'NAME'
      .trim();
  };

  const birthRaw = f.birthDate ?? (td3Line2 ? fallbackTd3Date(td3Line2, 13) : null);
  const expiryRaw = f.expirationDate ?? (td3Line2 ? fallbackTd3Date(td3Line2, 21) : null);

  return {
    first_name: cleanName(f.firstName),
    last_name: cleanName(f.lastName),
    date_of_birth: mrzDateToISO(birthRaw, true),
    sex,
    nationality_code: f.nationality || f.issuingState || '',
    document_type,
    document_number: f.documentNumber || '',
    issuing_country_code: f.issuingState || '',
    expiry_date: mrzDateToISO(expiryRaw, false),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Parse a blob of OCR text into a best-effort MRZ result (ported from web parseOcrText).
 * Returns ok=true only when the `mrz` package validates the whole document; otherwise a
 * best-effort result is still returned for human validation.
 */
export function parseMrzFromText(text: string): MrzValidation {
  const extracted = extractMrzLines(text);
  if (!extracted) return { ok: false, error: 'Bande MRZ introuvable.' };

  let result: ReturnType<typeof mrzParse>;
  try {
    result = mrzParse(extracted.lines, { autocorrect: true });
  } catch {
    return { ok: false, error: 'Bande MRZ illisible.' };
  }

  const td3Line2 = extracted.format === 'TD3' ? extracted.lines[1] : null;
  const data = toMrzResult(result, td3Line2);

  // Need at least a document number or a name to be worth showing.
  if (!data.document_number && !data.last_name && !data.first_name) {
    return { ok: false, error: 'Bande MRZ non détectée.' };
  }

  // Confidence = how many key check digits the `mrz` package validated. Used to rank reads
  // from different image regions so a clean read beats a garbled one.
  const keyFields = ['documentNumber', 'birthDate', 'expirationDate'];
  const details =
    (result as { details?: Array<{ field: string; valid: boolean }> }).details ?? [];
  const confidence = details.filter((d) => keyFields.includes(d.field) && d.valid).length;

  return {
    ok: Boolean(result.valid),
    confidence,
    result: { ...data, mrz_line1: extracted.lines[0], mrz_line2: extracted.lines[1] },
  };
}

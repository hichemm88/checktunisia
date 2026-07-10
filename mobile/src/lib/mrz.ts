/**
 * MRZ (Machine Readable Zone) parsing + check-digit validation — ICAO 9303, TD3.
 *
 * TD3 = passports: 2 lines of 44 characters. The check digits (7-3-1 weighting) are the
 * strongest filter against OCR errors (§7 of the cadrage) — a result is only accepted when
 * ALL required check digits pass. Pure TypeScript, no native deps → unit-testable.
 *
 * Verified against the canonical ICAO sample (UTO / ERIKSSON ANNA MARIA).
 */

export interface MrzResult {
  first_name: string;
  last_name: string;
  /** ISO date YYYY-MM-DD (with century inference). */
  date_of_birth: string;
  sex: 'M' | 'F' | 'X';
  /** ISO 3166 alpha-3 as printed in the MRZ (e.g. "TUN", "FRA"). */
  nationality_code: string;
  document_type: 'passport';
  document_number: string;
  issuing_country_code: string;
  /** ISO date YYYY-MM-DD. */
  expiry_date: string;
  mrz_line1: string;
  mrz_line2: string;
}

export interface MrzValidation {
  ok: boolean;
  result?: MrzResult;
  /** Per-field checksum outcomes — useful to highlight a suspect field to the user. */
  checks: {
    documentNumber: boolean;
    dateOfBirth: boolean;
    expiryDate: boolean;
    composite: boolean;
  };
  error?: string;
}

/** Character → numeric value for the check-digit sum. Returns -1 for invalid chars. */
function charValue(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55; // 'A' → 10
  if (c === '<') return 0;
  return -1;
}

/** ICAO 9303 check digit over a string, weights cycling 7-3-1. -1 on invalid input. */
export function checkDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const v = charValue(input[i]);
    if (v < 0) return -1;
    sum += v * weights[i % 3];
  }
  return sum % 10;
}

/** "<"-padded field → trimmed string; internal "<" become spaces. */
function cleanField(raw: string): string {
  return raw.replace(/<+$/g, '').replace(/</g, ' ').trim();
}

/** YYMMDD → YYYY-MM-DD. Century inferred: years > (currentYY + 20) → 19xx, else 20xx. */
function mrzDateToIso(yymmdd: string, kind: 'birth' | 'expiry'): string {
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  let century: number;
  if (kind === 'expiry') {
    century = 2000; // passports don't expire in the 1900s
  } else {
    const nowYY = new Date().getFullYear() % 100;
    century = yy > nowYY + 1 ? 1900 : 2000; // birthdays are in the past
  }
  return `${century + yy}-${mm}-${dd}`;
}

/** Normalise raw OCR lines: uppercase, strip non-MRZ chars, keep only 44-char lines. */
export function normalizeMrzLines(raw: string): string[] {
  return raw
    .toUpperCase()
    .split(/\r?\n/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 40);
}

/**
 * Parse & validate a TD3 MRZ. Accepts the two raw lines (any surrounding OCR noise is
 * tolerated as long as two ~44-char lines can be recovered). Returns ok=false unless every
 * required check digit passes.
 */
export function parseTD3(rawLine1: string, rawLine2: string): MrzValidation {
  const fail = (error: string): MrzValidation => ({
    ok: false,
    checks: { documentNumber: false, dateOfBirth: false, expiryDate: false, composite: false },
    error,
  });

  const l1 = rawLine1.toUpperCase().replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
  const l2 = rawLine2.toUpperCase().replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);

  if (l1[0] !== 'P') return fail('Ce n\'est pas un passeport (MRZ TD3 attendue).');

  // ── Line 1: issuing state + name ──
  const issuing = cleanField(l1.slice(2, 5)).replace(/\s/g, '');
  const nameField = l1.slice(5, 44);
  const [surnameRaw, givenRaw = ''] = nameField.split('<<');
  const last_name = cleanField(surnameRaw);
  const first_name = cleanField(givenRaw);

  // ── Line 2: document data + check digits ──
  const documentNumber = l2.slice(0, 9);
  const docChk = l2[9];
  const nationality = cleanField(l2.slice(10, 13)).replace(/\s/g, '');
  const dob = l2.slice(13, 19);
  const dobChk = l2[19];
  const sexChar = l2[20];
  const expiry = l2.slice(21, 27);
  const expChk = l2[27];
  const personal = l2.slice(28, 42);
  const personalChk = l2[42];
  const compositeChk = l2[43];

  const compositeInput = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);

  const checks = {
    documentNumber: checkDigit(documentNumber) === Number(docChk),
    dateOfBirth: checkDigit(dob) === Number(dobChk),
    expiryDate: checkDigit(expiry) === Number(expChk),
    composite: checkDigit(compositeInput) === Number(compositeChk),
  };
  // Personal-number check digit is optional in the composite; validated implicitly there.
  void personal;
  void personalChk;

  const ok = checks.documentNumber && checks.dateOfBirth && checks.expiryDate && checks.composite;

  const sex: MrzResult['sex'] = sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : 'X';

  const result: MrzResult = {
    first_name,
    last_name,
    date_of_birth: mrzDateToIso(dob, 'birth'),
    sex,
    nationality_code: nationality,
    document_type: 'passport',
    document_number: cleanField(documentNumber).replace(/\s/g, ''),
    issuing_country_code: issuing,
    expiry_date: mrzDateToIso(expiry, 'expiry'),
    mrz_line1: l1,
    mrz_line2: l2,
  };

  return {
    ok,
    result,
    checks,
    error: ok ? undefined : 'Échec de validation MRZ — rapprochez le document et réessayez.',
  };
}

/** Try to recover a TD3 MRZ from a blob of OCR text (unknown line order/noise). */
export function parseMrzFromText(text: string): MrzValidation {
  const lines = normalizeMrzLines(text);
  // Find two consecutive ~44-char lines where the first starts with 'P'.
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i][0] === 'P') {
      const res = parseTD3(lines[i], lines[i + 1]);
      if (res.ok) return res;
    }
  }
  // Fallback: try the last two long lines as-is.
  if (lines.length >= 2) return parseTD3(lines[lines.length - 2], lines[lines.length - 1]);
  return {
    ok: false,
    checks: { documentNumber: false, dateOfBirth: false, expiryDate: false, composite: false },
    error: 'Bande MRZ introuvable.',
  };
}

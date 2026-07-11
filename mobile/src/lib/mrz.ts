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
  /** Number of core check digits that passed (0–4) — ranks best-effort candidates. */
  score?: number;
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

/**
 * Normalise raw OCR lines into MRZ-candidate strings. Real ML Kit output is noisy:
 * the filler '<' is often read as guillemets/pipes, and runs of fillers come back as spaces.
 * We recover those, strip everything else, and keep lines long enough to be an MRZ row.
 */
export function normalizeMrzLines(raw: string): string[] {
  return raw
    .toUpperCase()
    .replace(/[«»‹›|]/g, '<') // common '<' misreads
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, '<').replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 20);
}

/**
 * Parse & validate a TD3 MRZ. Accepts the two raw lines (any surrounding OCR noise is
 * tolerated as long as two ~44-char lines can be recovered). Returns ok=false unless every
 * required check digit passes.
 */
export function parseTD3(rawLine1: string, rawLine2: string): MrzValidation {
  const l1 = rawLine1.toUpperCase().replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
  const l2 = rawLine2.toUpperCase().replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);

  // A TD3 passport line 1 starts with 'P'. We don't hard-fail if it doesn't (OCR noise) —
  // we still extract a best-effort result for the human to validate, but mark it not-ok.
  const isPassport = l1[0] === 'P';

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

  const ok =
    isPassport &&
    checks.documentNumber &&
    checks.dateOfBirth &&
    checks.expiryDate &&
    checks.composite;

  /** How many core check digits passed — used to rank best-effort candidates. */
  const score =
    (checks.documentNumber ? 1 : 0) +
    (checks.dateOfBirth ? 1 : 0) +
    (checks.expiryDate ? 1 : 0) +
    (checks.composite ? 1 : 0);

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
    score,
    error: ok ? undefined : 'Échec de validation MRZ — rapprochez le document et réessayez.',
  };
}

/**
 * Recover a TD3 MRZ from a blob of OCR text (unknown line order / OCR noise).
 * Tries several line pairings and returns the BEST candidate (most check digits passing),
 * even if not all checks pass — the human validates on the next screen (§7). Only returns
 * "not found" when no plausible MRZ pair exists at all.
 */
export function parseMrzFromText(text: string): MrzValidation {
  const lines = normalizeMrzLines(text);
  const candidates: MrzValidation[] = [];

  // Gate on the DATA row (line 2 — where all the check digits and key fields live). The name
  // row (line 1) can be short/garbled if OCR drops its filler run; names are corrected by the
  // human anyway, so we still extract as long as a plausible data row is present.
  const consider = (a: string, b: string) => {
    if (b.length < 38 || a.length < 5) return;
    const res = parseTD3(a, b);
    if (res.result) candidates.push(res);
  };

  // 1) Any adjacent pair (covers the normal two-line MRZ, in order).
  for (let i = 0; i < lines.length - 1; i++) consider(lines[i], lines[i + 1]);

  // 2) A single merged ~88-char line split in half (ML Kit sometimes joins the two rows).
  for (const l of lines) {
    if (l.length >= 80) consider(l.slice(0, 44), l.slice(44, 88));
  }

  // 3) The two longest lines, both orders (MRZ rows may arrive out of order).
  const longest = [...lines].sort((a, b) => b.length - a.length).slice(0, 3);
  for (let i = 0; i < longest.length; i++) {
    for (let j = 0; j < longest.length; j++) {
      if (i !== j) consider(longest[i], longest[j]);
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      checks: { documentNumber: false, dateOfBirth: false, expiryDate: false, composite: false },
      error: 'Bande MRZ introuvable.',
    };
  }

  // Prefer a fully-valid read; otherwise the highest-scoring best-effort candidate.
  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = candidates.find((c) => c.ok) ?? candidates[0];
  return best;
}

/**
 * Client-side MRZ Scanner — ISO 7501 positional parsing
 *
 * Design principles:
 * 1. Tight image crop so only the MRZ zone reaches tesseract
 * 2. Structural validation before accepting any line as MRZ
 *    – TD3 line 1 MUST start with P / I / V
 *    – TD3 line 2 MUST have 6 digits at DOB positions (13-18) and expiry (21-26)
 *    These digit checks are virtually impossible to satisfy by accident
 * 3. Positional parsing (ISO 7501 byte offsets) so '<' misreads don't break extraction
 * 4. Automatic filler detection from line 1 (many fillers → easy to detect)
 *    then apply the same filler to line 2 cleanup
 */

import { createWorker } from 'tesseract.js';

// ─── Public interface ──────────────────────────────────────────────────────────

export interface MrzData {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  sex: 'M' | 'F' | 'X' | null;
  nationality_code: string | null;
  document_number: string | null;
  issuing_country_code: string | null;
  expiry_date: string | null;
  document_type: string;
}

// ─── Date conversion ───────────────────────────────────────────────────────────

function mrzDateToISO(yymmdd: string, isBirth: boolean): string | null {
  const d = yymmdd.replace(/\D/g, '');
  if (d.length < 6) return null;
  const yy = parseInt(d.slice(0, 2), 10);
  const mm = d.slice(2, 4);
  const dd = d.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const century   = isBirth && yy > currentYY ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

// ─── Filler detection ──────────────────────────────────────────────────────────

/**
 * Detect the top-2 most likely filler characters from the TAIL of the name field.
 *
 * The last 16 chars of the TD3 name field are almost always pure filler.
 * We return a Set of candidate filler chars so the separator search can try
 * every combination (LL, KK, KL, LK, K<, <K …) rather than one fixed pair.
 */
function detectFillerSet(nameField: string): Set<string> {
  const fillers = new Set<string>(['<']); // '<' is always a candidate
  for (const tailLen of [16, 12, 8]) {
    if (nameField.length < tailLen) continue;
    const tail = nameField.slice(-tailLen);
    const freq: Record<string, number> = {};
    for (const c of tail) freq[c] = (freq[c] ?? 0) + 1;
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    // Top-2 chars that each represent ≥15 % of the tail are filler candidates
    for (const [char, count] of sorted.slice(0, 2)) {
      if (count / tailLen >= 0.15) fillers.add(char);
    }
    if (fillers.size >= 2) break; // found enough
  }
  return fillers;
}

// ─── Name field parsing ────────────────────────────────────────────────────────

/**
 * Split the 39-char name field into surname and given-names sections.
 *
 * The MRZ structure is:  SURNAME << GIVEN1 < GIVEN2 < GIVEN3 << padding
 * Tesseract may map the `<` char to L, K, or leave it as `<` — inconsistently
 * even within the same line.  So `<<` may appear as: <<, LL, KK, KL, LK, L<,
 * <L, K<, <K.
 *
 * Strategy: try EVERY pair from the detected filler-set × filler-set (including
 * all combinations with literal `<`).  Take the EARLIEST match that is preceded
 * by ≥ 3 alpha characters (= minimum plausible surname).
 */
function splitNameField(
  field: string,
  fillerSet: Set<string>,
): { last: string; first: string } {
  // Build all 2-char separator candidates from the cross-product of fillerSet
  const candidates = new Set<string>();
  for (const a of fillerSet) {
    for (const b of fillerSet) {
      candidates.add(a + b);
    }
  }

  let bestIdx = -1;
  let bestSepLen = 2;

  for (const sep of candidates) {
    let searchFrom = 0;
    while (true) {
      const i = field.indexOf(sep, searchFrom);
      if (i < 0) break;
      // Require ≥ 3 alpha chars before the separator (minimum surname length)
      const alphasBefore = field.slice(0, i).replace(/[^A-Z]/g, '').length;
      if (alphasBefore >= 3 && (bestIdx < 0 || i < bestIdx)) {
        bestIdx   = i;
        bestSepLen = sep.length;
        break; // earliest valid occurrence of this sep; try others
      }
      searchFrom = i + 1;
    }
  }

  const primaryFiller = [...fillerSet].find(c => c !== '<') ?? '<';

  if (bestIdx < 0) {
    // No separator found — treat whole field as surname, no given name
    return { last: cleanSurname(field, fillerSet), first: '' };
  }

  console.log('[MRZ] separator found at idx', bestIdx, 'sep:', JSON.stringify(field.slice(bestIdx, bestIdx + bestSepLen)));

  return {
    last:  cleanSurname(field.slice(0, bestIdx), fillerSet),
    first: cleanGivenNames(field.slice(bestIdx + bestSepLen), primaryFiller, fillerSet),
  };
}

/**
 * Clean the SURNAME section.
 * Surname = ONE word — we do NOT split on the internal filler because the filler
 * char (L, K …) may be a real letter in the name (MATHLOUTHI, KAOUACH…).
 * We only strip chars that are definitively not part of an alpha name.
 *
 * IMPORTANT: we require ≥ 2 consecutive filler chars before stripping.
 * A single leading/trailing K could be a real letter (KAOUACH, KARIM…).
 * Only "KK", "LLL"… at the boundary are safe to strip as OCR noise.
 */
function cleanSurname(section: string, fillerSet: Set<string>): string {
  // Keep only alpha chars from the section
  const alpha = section.replace(/[^A-Z]/g, '');
  // Strip runs of ≥ 2 consecutive filler chars at the start/end only
  let s = alpha;
  for (const f of fillerSet) {
    if (f === '<') continue; // already removed by replace above
    // Require 2+ consecutive filler chars — a single K/L might be part of the name
    const re = new RegExp(`^${f}{2,}|${f}{2,}$`, 'g');
    s = s.replace(re, '');
  }
  return s;
}

/**
 * Trim a spurious trailing "K + 1 char" from a given-name token.
 *
 * Tesseract commonly maps `<` to K.  In a sequence like NOUR<EL<HOUDA, when the
 * filler is L the parser splits at L, giving the token "NOURKE":
 *   NOUR + K (misread `<`) + E (from EL, whose L is the split-point)
 * The real name is just "NOUR".  We detect this pattern:
 *   – K appears at position ≥ 4 (so the prefix is a plausible ≥4-char name)
 *   – Exactly ONE alpha char follows K (the orphaned letter from the cut-off particle)
 * We strip K + the trailing char, returning the clean prefix.
 *
 * This avoids stripping K from names that START with K (KARIM → K at pos 0 < 4)
 * and avoids stripping when K is truly embedded (BELKHEIR → K at pos 3 < 4).
 */
function trimOrphanedSuffix(token: string): string {
  const k = token.lastIndexOf('K');
  if (k >= 4) {
    const suffix = token.slice(k + 1);
    if (suffix.length === 1) return token.slice(0, k);
  }
  return token;
}

/**
 * Clean the GIVEN-NAMES section.
 * Given names are separated by single `<` in MRZ (→ single filler char in OCR).
 * We split on filler chars and keep parts ≥ 2 chars.
 * Extra filter: drop tokens that are all the same character (KK, LL …) — these
 * are filler bleed-through that happen to be ≥ 2 chars long.
 */
function cleanGivenNames(section: string, primaryFiller: string, fillerSet: Set<string>): string {
  const result: string[] = [];
  let part = '';
  for (const c of section) {
    if (fillerSet.has(c)) {
      if (part) result.push(part);
      part = '';
    } else {
      part += c;
    }
  }
  if (part) result.push(part);

  return result
    .map(p => p.replace(/[^A-Z]/g, ''))
    .map(p => trimOrphanedSuffix(p))  // "NOURKE" → "NOUR"
    .filter(p =>
      p.length >= 2 &&              // drop 1-char garbage
      !/^(.)\1+$/.test(p)           // drop repeated-char tokens (KK, LL, KKK…)
    )
    .join(' ')
    .trim();
}

// Keep cleanNameSection for backwards compatibility with TD1 parser
function cleanNameSection(section: string, filler: string): string {
  return cleanGivenNames(section, filler, new Set([filler, '<']));
}

/**
 * Remove filler chars from a short fixed-length field (doc number, nationality,
 * issuing country).  We strip BOTH the detected filler AND literal '<' because
 * tesseract may map '<' inconsistently within the same line.
 */
function cleanField(raw: string, filler: string): string {
  return raw
    .split(filler).join('')
    .split('<').join('')   // also remove literal '<' regardless of filler
    .trim();
}

// ─── MRZ check-digit validation ───────────────────────────────────────────────

/**
 * MRZ character values: A-Z → 10-35, 0-9 → 0-9, < → 0  (ISO 7501-1 §A.2)
 */
const MRZ_CHAR_VALUE: Record<string, number> = {};
for (let i = 0; i < 26; i++) MRZ_CHAR_VALUE[String.fromCharCode(65 + i)] = i + 10;
for (let i = 0; i < 10; i++) MRZ_CHAR_VALUE[String(i)] = i;
MRZ_CHAR_VALUE['<'] = 0;

function mrzCheckDigit(s: string): number {
  const W = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += (MRZ_CHAR_VALUE[s[i]] ?? 0) * W[i % 3];
  return sum % 10;
}

/**
 * Common single-char OCR substitutions for the document-number field.
 * Key = what tesseract misread; Values = what it might actually be.
 * We try ONE substitution at a time and accept the first candidate that
 * makes the check digit match.
 */
const DOC_OCR_SUBS: Record<string, string[]> = {
  '1': ['I', 'J', 'L'],
  '0': ['O', 'D'],
  '5': ['S'],
  '6': ['G'],
  '8': ['B'],
  'O': ['0'],
  'I': ['1'],
  'B': ['8'],
  'S': ['5'],
  'G': ['6'],
};

/**
 * If the raw 9-char document-number field fails the check digit, try single-char
 * OCR substitutions until one passes.  Returns the corrected field (with padding
 * `<` intact) or the original if no fix is found.
 */
function fixDocNumber(raw9: string, checkChar: string): string {
  const expected = parseInt(checkChar, 10);
  if (isNaN(expected)) return raw9;
  if (mrzCheckDigit(raw9) === expected) return raw9; // already correct

  const chars = raw9.split('');
  for (let pos = 0; pos < chars.length; pos++) {
    const orig = chars[pos];
    const subs = DOC_OCR_SUBS[orig];
    if (!subs) continue;
    for (const sub of subs) {
      chars[pos] = sub;
      if (mrzCheckDigit(chars.join('')) === expected) {
        console.log(`[MRZ] doc# fixed pos ${pos}: ${orig}→${sub}  (${raw9} → ${chars.join('')})`);
        return chars.join('');
      }
      chars[pos] = orig;
    }
  }
  return raw9; // no single-char fix found
}

// ─── TD3 parser (passport) ─────────────────────────────────────────────────────
//
// Line 1 (44 chars):
//   [0]     doc type  (P / I / V)
//   [1]     subtype
//   [2-4]   issuing state (3 chars)
//   [5-43]  name: SURNAME<<GIVEN<<<<...
//
// Line 2 (44 chars):
//   [0-8]   document number (right-padded with <)
//   [9]     check digit
//   [10-12] nationality
//   [13-18] DOB (YYMMDD)  ← ALWAYS 6 digits
//   [19]    DOB check digit
//   [20]    sex (M/F/<)
//   [21-26] expiry (YYMMDD)  ← ALWAYS 6 digits
//   [27]    expiry check digit
//   [28-41] optional
//   [42-43] check digits

function parseTD3(line1: string, line2: string): MrzData {
  const issuingState = line1.slice(2, 5);
  const docType      = line1[0];
  const nameField    = line1.slice(5, 44);

  // Detect filler set from the TAIL of the name field
  const fillerSet    = detectFillerSet(nameField);
  const primaryFiller = [...fillerSet].find(c => c !== '<') ?? '<';

  console.log('[MRZ] TD3 line1:', line1);
  console.log('[MRZ] TD3 line2:', line2);
  console.log('[MRZ] nameField:', nameField);
  console.log('[MRZ] fillerSet:', [...fillerSet]);

  const { last: lastName, first: firstName } = splitNameField(nameField, fillerSet);

  // Line 2: use positional parsing (ISO 7501) — filler-independent
  const rawDoc9     = fixDocNumber(line2.slice(0, 9), line2[9]);  // check-digit correction
  const docNumber   = cleanField(rawDoc9,             primaryFiller);
  const nationality = cleanField(line2.slice(10, 13), primaryFiller);
  const dob         = line2.slice(13, 19); // 6 digits
  const sexChar     = line2[20];
  const expiry      = line2.slice(21, 27); // 6 digits

  const sex: 'M' | 'F' | 'X' =
    sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : 'X';

  return {
    last_name:            lastName  || null,
    first_name:           firstName || null,
    date_of_birth:        mrzDateToISO(dob,    true),
    sex,
    nationality_code:     nationality                       || null,
    document_number:      docNumber                         || null,
    issuing_country_code: cleanField(issuingState, primaryFiller) || null,
    expiry_date:          mrzDateToISO(expiry, false),
    document_type:        docType === 'P' ? 'passport' : 'travel_document',
  };
}

// ─── TD1 parser (ID card) ──────────────────────────────────────────────────────
//
// Line 1 (30): doctype(2)+state(3)+docnum(9)+check+optional(15)
// Line 2 (30): DOB(6)+check+sex+expiry(6)+check+nationality(3)+optional(11)+check
// Line 3 (30): name field SURNAME<<GIVEN<...

function parseTD1(lines: string[]): MrzData {
  const [line1, line2, line3] = lines;
  const issuingState  = line1.slice(2, 5);
  const docType       = line1[0];
  const fillerSet     = detectFillerSet(line3);           // line3 = name field
  const primaryFiller = [...fillerSet].find(c => c !== '<') ?? '<';
  const rawDoc9      = fixDocNumber(line1.slice(5, 14), line1[14]);  // check-digit correction
  const docNumber    = cleanField(rawDoc9,              primaryFiller);
  const dob          = line2.slice(0, 6);
  const sexChar      = line2[7];
  const expiry       = line2.slice(8, 14);
  const nationality  = cleanField(line2.slice(15, 18), primaryFiller);
  const sex: 'M' | 'F' | 'X' =
    sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : 'X';
  const { last: lastName, first: firstName } = splitNameField(line3, fillerSet);
  return {
    last_name:            lastName  || null,
    first_name:           firstName || null,
    date_of_birth:        mrzDateToISO(dob,    true),
    sex,
    nationality_code:     nationality                       || null,
    document_number:      docNumber                         || null,
    issuing_country_code: cleanField(issuingState, primaryFiller) || null,
    expiry_date:          mrzDateToISO(expiry, false),
    document_type:        docType === 'I' ? 'national_id' : 'travel_document',
  };
}

// ─── Structural line validation ────────────────────────────────────────────────

/**
 * A TD3 line 1 MUST start with P, I, or V.
 * Rejects any biographical-data text that accidentally reached the right length.
 */
function isTD3Line1(line: string): boolean {
  if (line.length < 44) return false;
  return /^[PIV]/.test(line);
}

/**
 * A TD3 line 2 MUST have 6 digits at the DOB field (positions 13-18)
 * and 6 digits at the expiry field (positions 21-26).
 * These two windows being all-digits is virtually impossible by accident.
 */
function isTD3Line2(line: string): boolean {
  if (line.length < 28) return false;
  const dobZone    = line.slice(13, 19);
  const expiryZone = line.slice(21, 27);
  return /^\d{6}$/.test(dobZone) && /^\d{6}$/.test(expiryZone);
}

function isTD1Line2(line: string): boolean {
  if (line.length < 14) return false;
  return /^\d{6}/.test(line) && /^\d{6}/.test(line.slice(8, 14));
}

// ─── Image preprocessing ───────────────────────────────────────────────────────

/**
 * Crop the bottom 22 % of the image — this is the MRZ zone for a standard
 * TD3 passport photographed at full page.  The MRZ (2 lines × ~4 mm) sits
 * at the very bottom of the 88-mm page, roughly the last 14-18 %.
 * We use 22 % to give a generous margin for angled shots.
 *
 * If the initial tight crop fails to produce MRZ, the caller retries with a
 * wider 42 % crop (for close-up shots where the MRZ fills more of the frame).
 */
/**
 * Compute an optimal binarisation threshold using Otsu's method.
 *
 * Otsu finds the luminance value that maximises the between-class variance
 * (i.e. best separates the histogram into "ink" and "paper"). This adapts to
 * the actual lighting of the image instead of a fixed cut-off, which is critical
 * for dark / unevenly-lit passport photos.
 *
 * @param histogram 256-bin luminance histogram (index = luminance 0-255)
 * @param total     total number of sampled pixels
 * @returns the threshold in [0, 255]
 */
function otsuThreshold(histogram: number[], total: number): number {
  // Sum of (intensity * count) across the whole histogram
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * histogram[t];

  let sumBackground = 0;   // weighted sum of the background class
  let weightBackground = 0; // pixel count of the background class
  let maxVariance = -1;
  let threshold = 127;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * histogram[t];

    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;

    // Between-class variance
    const diff = meanBackground - meanForeground;
    const variance = weightBackground * weightForeground * diff * diff;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

// Maximum canvas width after scaling — large enough for tesseract accuracy but
// not so large that pixel processing bogs down a mobile CPU.
// A 12MP phone photo at 2.5× would be ~10 000 px wide; we cap at 2 000 px.
const MAX_CANVAS_W = 2000;

async function cropAndBinarise(file: File, cropFromBottom: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const cropTop = Math.floor(img.height * (1 - cropFromBottom));
        const cropH   = img.height - cropTop;

        // Scale up to improve OCR, but cap at MAX_CANVAS_W (performance on mobile).
        const scale = Math.min(2.5, MAX_CANVAS_W / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(cropH    * scale);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, cropTop, img.width, cropH, 0, 0, w, h);

        const imgData    = ctx.getImageData(0, 0, w, h);
        const d          = imgData.data;
        const pixelCount = w * h;

        // ── Grayscale → Otsu adaptive threshold → binarise ──────────────────
        // No Laplacian sharpening — the pixel loop alone is O(w×h) and on a
        // high-res phone crop can take several seconds without meaningful gain.
        const histogram = new Array<number>(256).fill(0);
        for (let i = 0; i < d.length; i += 4) {
          histogram[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) & 255]++;
        }
        const threshold = otsuThreshold(histogram, pixelCount);
        console.log('[MRZ] Otsu threshold:', threshold, '  crop:', cropFromBottom, '  canvas:', w, '×', h);

        for (let i = 0; i < d.length; i += 4) {
          const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = l < threshold ? 0 : 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ─── MRZ line extraction ───────────────────────────────────────────────────────

/**
 * Extract valid MRZ lines from raw tesseract output.
 *
 * For each raw line:
 *   1. Strip spaces (tesseract inserts word-break spaces in OCR-B runs)
 *   2. Keep only MRZ chars [A-Z0-9<]
 *   3. Normalise length to 44 (TD3) or 30 (TD1)
 *   4. Apply STRUCTURAL checks — these are the critical filters:
 *      - TD3 L1: must start with P / I / V
 *      - TD3 L2: positions 13-18 AND 21-26 must each be 6 digits
 *      Biographical-data text virtually never satisfies these.
 */
function extractMrzLines(rawText: string): { lines: string[]; format: 'TD3' | 'TD1' } {
  console.log('[MRZ] raw OCR text:\n', rawText);

  const td3Line1s: string[] = [];
  const td3Line2s: string[] = [];
  const td1Lines:  string[] = [];

  for (const raw of rawText.split('\n')) {
    // Normalise:
    // 1. Two or more consecutive spaces → '<<'  (tesseract outputs 2 spaces where
    //    OCR-B has '<<' between words; preserving this is critical for name parsing)
    // 2. Single spaces → removed (word-wrap artefacts)
    // 3. Keep only MRZ chars [A-Z0-9<]
    const clean = raw
      .toUpperCase()
      .replace(/[ \t]{2,}/g, '<<') // preserve double-space as double-filler
      .replace(/[ \t]/g, '')        // remove remaining single spaces
      .replace(/[^A-Z0-9<]/g, ''); // keep only MRZ chars

    if (clean.length >= 28) console.log('[MRZ] candidate line:', clean);

    if (clean.length < 28) continue;

    // TD3 candidates (44 chars)
    if (clean.length >= 38 && clean.length <= 52) {
      const norm = clean.length >= 44
        ? clean.slice(0, 44)
        : clean.padEnd(44, '<');

      if (isTD3Line1(norm)) td3Line1s.push(norm);
      if (isTD3Line2(norm)) td3Line2s.push(norm);
    }

    // TD1 candidates (30 chars)
    if (clean.length >= 28 && clean.length <= 36) {
      const norm = clean.length >= 30
        ? clean.slice(0, 30)
        : clean.padEnd(30, '<');
      td1Lines.push(norm);
    }
  }

  // TD3: need at least 1 line-1 AND 1 line-2
  // A line that passes BOTH checks is treated as line 2 (the stronger structural test)
  // so we exclude it from the line-1 pool to avoid using it in the wrong slot.
  const uniqLine2s = [...new Set(td3Line2s)];
  const uniqLine1s = [...new Set(td3Line1s)].filter(l => !uniqLine2s.includes(l));

  if (uniqLine1s.length >= 1 && uniqLine2s.length >= 1) {
    return { lines: [uniqLine1s[0], uniqLine2s[0]], format: 'TD3' };
  }

  // TD1: need 3 lines; apply line-2 structural check
  const validTD1L2 = td1Lines.filter(isTD1Line2);
  if (validTD1L2.length >= 1 && td1Lines.length >= 3) {
    return { lines: td1Lines.slice(0, 3), format: 'TD1' };
  }

  // ── Last resort: if we got 2 long lines, try as TD3 even without strict check ──
  // (handles passports where DOB digits get slightly mangled but names are OK)
  const longLines = [...new Set(
    rawText.split('\n')
      .map(l => l.toUpperCase()
        .replace(/[ \t]{2,}/g, '<<') // preserve double-space as '<<' (same as main path)
        .replace(/[ \t]/g, '')
        .replace(/[^A-Z0-9<]/g, ''))
      .filter(l => l.length >= 40)
      .map(l => l.slice(0, 44).padEnd(44, '<'))
  )];

  if (longLines.length >= 2) {
    // REQUIRE a plausible doc-type line (starts with P / I / V). Without one,
    // these are just two long biographical-zone lines — NOT an MRZ. Accepting
    // them would surface confident garbage to the user, so we bail instead.
    const pivLines   = longLines.filter(l => /^[PIV]/.test(l));
    const otherLines = longLines.filter(l => !/^[PIV]/.test(l));

    if (pivLines.length >= 1 && otherLines.length >= 1) {
      console.log('[MRZ] last-resort: using PIV line + best other line');
      return { lines: [pivLines[0], otherLines[0]], format: 'TD3' };
    }
    // No PIV line found → the OCR output is not an MRZ. Fall through to the
    // error below rather than returning garbage.
  }

  throw new Error(
    'Zone MRZ non détectée.\n\nConseils :\n' +
    '• Photographiez la PAGE ENTIÈRE du passeport\n' +
    '• Les 2 lignes de caractères en bas doivent être bien visibles\n' +
    '• Évitez les reflets et les ombres'
  );
}

// ─── OCR ───────────────────────────────────────────────────────────────────────

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

/**
 * Run OCR with an ALREADY-CREATED worker.
 *
 * The worker is created once in scanMrz() and reused for every crop attempt.
 * Creating a new worker per attempt caused 3× the init cost (WebAssembly boot +
 * trained-data download) which pushed total scan time to 10+ minutes on mobile.
 */
async function runOcrWithWorker(
  worker: TesseractWorker,
  image: string | File,
  psm: string = '6',
): Promise<string> {
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    tessedit_pageseg_mode: psm as never,
  });
  const { data: { text, confidence } } = await worker.recognize(image as string);
  console.log('[MRZ] OCR confidence:', confidence);
  // Gate: very low confidence means the image is unreadable — fail fast so the
  // next crop attempt runs, rather than trying to parse garbage as MRZ data.
  if ((confidence as number) < 30) {
    throw new Error(
      'Qualité du scan insuffisante.\n\n' +
      'Conseils :\n' +
      '• Photographiez la PAGE ENTIÈRE du passeport\n' +
      '• Éclairage suffisant, pas de reflets\n' +
      '• Tenez l\'appareil stable — image bien nette'
    );
  }
  return text;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzData> {
  // Two crop sizes — tight (full-page shot) then wider (close-up shot).
  // The 0.60 third attempt was removed: it rarely helped and tripled latency.
  const cropPercentages = [0.22, 0.42];

  // ── Create ONE worker for ALL crop attempts ──────────────────────────────────
  // Worker init (WebAssembly boot + ~10 MB trained-data download) took 5-10 s
  // per attempt on mobile. One shared worker cuts total init cost to a single hit.
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100));
    },
  });

  let lastError: Error | null = null;

  try {
    for (const crop of cropPercentages) {
      try {
        let image: string | File = file;
        try {
          image = await cropAndBinarise(file, crop);
        } catch {
          // preprocessing failed — fall back to original file
        }

        const text = await runOcrWithWorker(worker, image, '6');
        const { lines, format } = extractMrzLines(text);

        if (format === 'TD3' && lines.length >= 2) return parseTD3(lines[0], lines[1]);
        if (format === 'TD1' && lines.length >= 3) return parseTD1(lines);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // continue to next crop
      }
    }
  } finally {
    // Always release the worker, even if we're about to throw
    await worker.terminate();
  }

  throw lastError ?? new Error('Scan échoué. Utilisez la saisie manuelle.');
}

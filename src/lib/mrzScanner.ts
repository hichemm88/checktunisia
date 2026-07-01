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
 * Detect the filler character from the TAIL of the name field.
 *
 * The last 12 characters of a TD3 39-char name field are almost always pure
 * filler (a name would need to be 27+ chars to reach them).  The dominant
 * character in that tail is the filler, regardless of what tesseract mapped
 * '<' to (K, L, space-then-removed, etc.).
 *
 * Trying progressively shorter tails handles the rare very-long names.
 */
function detectFiller(nameField: string): string {
  for (const tailLen of [12, 8, 6]) {
    if (nameField.length < tailLen) continue;
    const tail = nameField.slice(-tailLen);
    const freq: Record<string, number> = {};
    for (const c of tail) freq[c] = (freq[c] ?? 0) + 1;
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    // Require ≥60% of tail to be the same char to call it filler
    if (sorted[0] && sorted[0][1] / tailLen >= 0.6) return sorted[0][0];
  }
  return '<'; // fallback
}

// ─── Name field parsing ────────────────────────────────────────────────────────

/**
 * Clean a name section (surname or given-names string) by:
 *  1. Splitting on the detected filler
 *  2. Further stripping any residual non-alpha chars (e.g. literal '<' that
 *     wasn't the filler, stray digits from OCR noise)
 *  3. Discarding tokens that are a single character (almost always a misread filler)
 *  4. Joining surviving tokens with a space
 */
function cleanNameSection(section: string, filler: string): string {
  return section
    .split(filler)
    .map(part => part.replace(/[^A-Z]/g, '')) // strip non-alpha residue
    .filter(part => part.length >= 2)          // drop single-char garbage
    .join(' ')
    .trim();
}

function splitNameField(field: string, filler: string): { last: string; first: string } {
  const sep = filler + filler;
  const idx = field.indexOf(sep);
  if (idx < 0) {
    return { last: cleanNameSection(field, filler), first: '' };
  }
  return {
    last:  cleanNameSection(field.slice(0, idx),       filler),
    first: cleanNameSection(field.slice(idx + sep.length), filler),
  };
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

  // Detect filler from the TAIL of the name field (last 12 chars are pure filler)
  const filler = detectFiller(nameField);

  const { last: lastName, first: firstName } = splitNameField(nameField, filler);

  // Line 2 uses the same filler (tesseract maps '<' consistently)
  const docNumber   = cleanField(line2.slice(0, 9),  filler);
  const nationality = cleanField(line2.slice(10, 13), filler);
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
    issuing_country_code: cleanField(issuingState, filler) || null,
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
  const issuingState = line1.slice(2, 5);
  const docType      = line1[0];
  const filler       = detectFiller(line3);               // line3 = name, most fillers
  const docNumber    = cleanField(line1.slice(5, 14), filler);
  const dob          = line2.slice(0, 6);
  const sexChar      = line2[7];
  const expiry       = line2.slice(8, 14);
  const nationality  = cleanField(line2.slice(15, 18), filler);
  const sex: 'M' | 'F' | 'X' =
    sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : 'X';
  const { last: lastName, first: firstName } = splitNameField(line3, filler);
  return {
    last_name:            lastName  || null,
    first_name:           firstName || null,
    date_of_birth:        mrzDateToISO(dob,    true),
    sex,
    nationality_code:     nationality                       || null,
    document_number:      docNumber                         || null,
    issuing_country_code: cleanField(issuingState, filler) || null,
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
async function cropAndBinarise(file: File, cropFromBottom: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const cropTop = Math.floor(img.height * (1 - cropFromBottom));
        const cropH   = img.height - cropTop;
        const SCALE   = 2.5;

        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * SCALE);
        canvas.height = Math.round(cropH * SCALE);

        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, cropTop, img.width, cropH, 0, 0, canvas.width, canvas.height);

        // Grayscale → auto-level → threshold
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        let minL = 255, maxL = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (l < minL) minL = l;
          if (l > maxL) maxL = l;
        }
        const range = maxL - minL || 1;
        for (let i = 0; i < d.length; i += 4) {
          const l  = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v  = ((l - minL) / range) * 255 < 148 ? 0 : 255;
          d[i] = d[i + 1] = d[i + 2] = v;
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
  const td3Line1s: string[] = [];
  const td3Line2s: string[] = [];
  const td1Lines:  string[] = [];

  for (const raw of rawText.split('\n')) {
    // Normalise
    const clean = raw
      .toUpperCase()
      .replace(/\s+/g, '')          // collapse spaces tesseract inserts
      .replace(/[^A-Z0-9<]/g, ''); // keep only MRZ chars

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
      .map(l => l.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''))
      .filter(l => l.length >= 40)
      .map(l => l.slice(0, 44).padEnd(44, '<'))
  )];

  if (longLines.length >= 2) {
    // Sort: P/I/V lines first
    longLines.sort((a) => /^[PIV]/.test(a) ? -1 : 1);
    return { lines: longLines.slice(0, 2), format: 'TD3' };
  }

  throw new Error(
    'Zone MRZ non détectée.\n\nConseils :\n' +
    '• Photographiez la PAGE ENTIÈRE du passeport\n' +
    '• Les 2 lignes de caractères en bas doivent être bien visibles\n' +
    '• Évitez les reflets et les ombres'
  );
}

// ─── OCR ───────────────────────────────────────────────────────────────────────

async function runOcr(image: string | File, onProgress?: (n: number) => void): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100));
    },
  });
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    tessedit_pageseg_mode: '6' as never, // single uniform block
  });
  const { data: { text } } = await worker.recognize(image as string);
  await worker.terminate();
  return text;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzData> {
  // Try tight crop first (bottom 22 %) — optimal for full-page passport photos
  // If structural validation fails, retry with wider crop (bottom 42 %)
  const cropPercentages = [0.22, 0.42, 0.60];

  let lastError: Error | null = null;

  for (const crop of cropPercentages) {
    try {
      let image: string | File = file;
      try {
        image = await cropAndBinarise(file, crop);
      } catch {
        // preprocessing failed, use original
      }

      const text = await runOcr(image, onProgress);
      const { lines, format } = extractMrzLines(text);

      if (format === 'TD3' && lines.length >= 2) return parseTD3(lines[0], lines[1]);
      if (format === 'TD1' && lines.length >= 3) return parseTD1(lines);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next crop percentage
    }
  }

  throw lastError ?? new Error('Scan échoué. Utilisez la saisie manuelle.');
}

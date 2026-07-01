/**
 * Client-side MRZ Scanner — ISO 7501 positional parsing
 *
 * Core insight: tesseract.js with the `eng` model misreads the OCR-B filler
 * character '<' as K, L, space, or other glyphs.  Instead of relying on '<'
 * being recognised correctly, we:
 *   1. Detect whichever character is MOST FREQUENT in line 1's name field
 *      (that character is the filler — a typical TD3 line 1 has 20+ fillers)
 *   2. Apply the same filler to parse BOTH lines by fixed byte-offsets (ISO 7501)
 *
 * This works regardless of what '<' is misread as, as long as it is
 * misread CONSISTENTLY (which tesseract does — same glyph, same mapping).
 *
 * Supports:
 *   TD3 – 2 lines × 44 chars  (passport, travel document)
 *   TD1 – 3 lines × 30 chars  (national ID card, residence permit)
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
  if (!yymmdd) return null;
  // Keep only digits
  const d = yymmdd.replace(/\D/g, '');
  if (d.length < 6) return null;

  const yy = parseInt(d.slice(0, 2), 10);
  const mm = d.slice(2, 4);
  const dd = d.slice(4, 6);

  // Expiry dates are always in the 21st century for a valid travel document.
  // Birth years: if yy > current 2-digit year, the person was born last century.
  const currentYY = new Date().getFullYear() % 100;
  const century = isBirth && yy > currentYY ? 1900 : 2000;
  const yyyy = century + yy;

  return `${yyyy}-${mm}-${dd}`;
}

// ─── Filler detection ──────────────────────────────────────────────────────────

/**
 * Returns the most-frequent character in `text`, ignoring chars in
 * `exclude`.  In a TD3 line-1 name field (39 chars), the filler '<'
 * typically appears 15–25 times — far more than any real letter.
 * Requires at least `minCount` occurrences to be meaningful (default 5).
 */
function detectFiller(text: string, exclude: string[] = [], minCount = 5): string {
  const freq: Record<string, number> = {};
  for (const c of text) {
    if (!exclude.includes(c)) freq[c] = (freq[c] ?? 0) + 1;
  }
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= minCount ? top[0] : '<';
}

// ─── Name field splitting ──────────────────────────────────────────────────────

/**
 * Split a raw name field into surname / given-names.
 * The double-filler (e.g. '<<', 'KK', 'LL') separates surname from given names.
 * A single filler separates multiple given names.
 *
 * Examples:
 *   filler='K'  "MATHLOUTHIKKHICHEM..."  → last="MATHLOUTHI"  first="HICHEM"
 *   filler='<'  "MATHLOUTHI<<HICHEM..."  → last="MATHLOUTHI"  first="HICHEM"
 *   filler='L'  "DOE<<JOHN<PAUL..."     → last="DOE"          first="JOHN PAUL"
 */
function splitNameField(field: string, filler: string): { last: string; first: string } {
  const sep2 = filler + filler; // double-filler = surname/givenname separator
  const idx  = field.indexOf(sep2);

  if (idx < 0) {
    // No separator — whole field treated as last name
    return { last: field.split(filler).filter(Boolean).join(' '), first: '' };
  }

  const last  = field.slice(0, idx).split(filler).filter(Boolean).join(' ');
  const first = field.slice(idx + sep2.length).split(filler).filter(Boolean).join(' ');
  return { last, first };
}

/**
 * Remove all occurrences of `filler` from a short fixed field
 * (document number, nationality, country code).
 */
function cleanField(raw: string, filler: string): string {
  return raw.split(filler).join('').trim();
}

// ─── TD3 parser (passport) ─────────────────────────────────────────────────────
//
// Line 1 (44 chars):
//   [0]     document type  (usually 'P')
//   [1]     document subtype ('<' = none)
//   [2-4]   issuing state / organisation (3 chars, e.g. 'TUN')
//   [5-43]  name field: SURNAME<<GIVENNAME1<GIVENNAME2<<...
//
// Line 2 (44 chars):
//   [0-8]   document number (right-padded with '<')
//   [9]     check digit
//   [10-12] nationality
//   [13-18] date of birth (YYMMDD)
//   [19]    check digit
//   [20]    sex (M / F / '<')
//   [21-26] expiry date (YYMMDD)
//   [27]    check digit
//   [28-41] optional / personal number
//   [42]    check digit
//   [43]    composite check digit

function parseTD3(line1: string, line2: string): MrzData {
  // ── Line 1: detect filler & parse name ──────────────────────────────────────
  const issuingState = line1.slice(2, 5);
  const docType      = line1[0];
  const nameField    = line1.slice(5, 44); // 39 chars

  // Exclude doc type and country letters so they don't skew filler detection
  const knownChars = Array.from(new Set(['P', ...Array.from(issuingState)]));
  const filler     = detectFiller(nameField, knownChars);

  const { last: lastName, first: firstName } = splitNameField(nameField, filler);

  // ── Line 2: use SAME filler (OCR maps '<' consistently within a document) ──
  const docNumber   = cleanField(line2.slice(0, 9),  filler);
  const nationality = cleanField(line2.slice(10, 13), filler);
  const dob         = line2.slice(13, 19); // YYMMDD
  const sexChar     = line2[20];           // M / F or filler
  const expiry      = line2.slice(21, 27); // YYMMDD

  const sex: 'M' | 'F' | 'X' = sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : 'X';

  return {
    last_name:            lastName  || null,
    first_name:           firstName || null,
    date_of_birth:        mrzDateToISO(dob,    true),
    sex,
    nationality_code:     nationality                           || null,
    document_number:      docNumber                             || null,
    issuing_country_code: cleanField(issuingState, filler)     || null,
    expiry_date:          mrzDateToISO(expiry, false),
    document_type:        docType === 'P' ? 'passport' : 'travel_document',
  };
}

// ─── TD1 parser (national ID / residence permit) ───────────────────────────────
//
// Line 1 (30 chars):
//   [0-1]  document type (e.g. 'I<', 'ID', 'A<')
//   [2-4]  issuing state
//   [5-13] document number (right-padded with '<')
//   [14]   check digit
//   [15-29] optional
//
// Line 2 (30 chars):
//   [0-5]  date of birth (YYMMDD)
//   [6]    check digit
//   [7]    sex
//   [8-13] expiry date (YYMMDD)
//   [14]   check digit
//   [15-17] nationality
//   [18-28] optional
//   [29]   composite check digit
//
// Line 3 (30 chars):
//   [0-29] name field: SURNAME<<GIVENNAME1<...

function parseTD1(lines: string[]): MrzData {
  const [line1, line2, line3] = lines;

  // ── Line 1 ──────────────────────────────────────────────────────────────────
  const issuingState = line1.slice(2, 5);
  const docType      = line1[0];

  // Detect filler from line 3 (name field: longest run of fillers → easy detection)
  const filler3 = detectFiller(line3, [], 3);

  const docNumber = cleanField(line1.slice(5, 14), filler3);

  // ── Line 2 ──────────────────────────────────────────────────────────────────
  const dob        = line2.slice(0, 6);  // YYMMDD
  const sexChar    = line2[7];
  const expiry     = line2.slice(8, 14); // YYMMDD
  const nationality = cleanField(line2.slice(15, 18), filler3);

  const sex: 'M' | 'F' | 'X' = sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : 'X';

  // ── Line 3 ──────────────────────────────────────────────────────────────────
  const { last: lastName, first: firstName } = splitNameField(line3, filler3);

  return {
    last_name:            lastName  || null,
    first_name:           firstName || null,
    date_of_birth:        mrzDateToISO(dob,    true),
    sex,
    nationality_code:     nationality                           || null,
    document_number:      docNumber                             || null,
    issuing_country_code: cleanField(issuingState, filler3)    || null,
    expiry_date:          mrzDateToISO(expiry, false),
    document_type:        docType === 'I' ? 'national_id' : 'travel_document',
  };
}

// ─── Image preprocessing ───────────────────────────────────────────────────────

/**
 * Crop the bottom 38 % of the image (MRZ zone), enlarge 2.5×, and binarise.
 * Better image → better OCR accuracy on the OCR-B monospace font.
 */
async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const cropTop = Math.floor(img.height * 0.62);
        const cropH   = img.height - cropTop;
        const SCALE   = 2.5;

        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * SCALE);
        canvas.height = Math.round(cropH * SCALE);

        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, cropTop, img.width, cropH, 0, 0, canvas.width, canvas.height);

        // Grayscale → auto-level → binary threshold
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
          const nl = ((l - minL) / range) * 255;
          const v  = nl < 148 ? 0 : 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          // alpha stays at 255
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
 * Extract valid MRZ candidate lines from raw tesseract output.
 *
 * Tesseract may:
 *   - Insert spaces between OCR-B characters → remove them
 *   - Output the 2 MRZ lines as one long string → split at midpoint
 *   - Break each MRZ line into multiple word-chunks → join them
 *
 * A valid MRZ candidate line:
 *   - Contains only [A-Z0-9<] after normalisation
 *   - Has length close to 44 (TD3) or 30 (TD1)
 *   - Has a high ratio of a single repeated character (the filler)
 */
function extractMrzLines(rawText: string): { lines: string[]; format: 'TD3' | 'TD1' } {
  // Normalise: uppercase, collapse whitespace within lines
  const rawLines = rawText
    .split('\n')
    .map(l => l.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''));

  const td3Candidates: string[] = [];
  const td1Candidates: string[] = [];

  for (const line of rawLines) {
    if (line.length < 28) continue;

    // Try TD3 (44-char): accept lines 35-50 chars, normalise to 44
    if (line.length >= 35 && line.length <= 52) {
      const norm = line.length >= 44 ? line.slice(0, 44) : line.padEnd(44, '<');
      td3Candidates.push(norm);
    }

    // Try TD1 (30-char): accept lines 28-34 chars, normalise to 30
    if (line.length >= 28 && line.length <= 36) {
      const norm = line.length >= 30 ? line.slice(0, 30) : line.padEnd(30, '<');
      td1Candidates.push(norm);
    }
  }

  // Deduplicate
  const uniqTD3 = [...new Set(td3Candidates)];
  const uniqTD1 = [...new Set(td1Candidates)];

  // Filter: MRZ lines must have at least one char appearing ≥3 times (any filler)
  // Threshold is low (7%) because line 2 of a TD3 passport can have as few as
  // 2-3 filler chars (e.g. for a 9-char document number — only the check digits
  // and the trailing optional field carry filler).
  function hasMrzRatio(line: string): boolean {
    const freq: Record<string, number> = {};
    for (const c of line) freq[c] = (freq[c] ?? 0) + 1;
    const maxF = Math.max(...Object.values(freq));
    return maxF >= 3; // absolute minimum: filler appears at least 3 times
  }

  // Among TD3 candidates, sort so that lines starting with P/I/V (document type)
  // come first — those are line 1 of a passport/ID/visa.
  const docTypeFirst = (a: string) => /^[PIV]/.test(a) ? 0 : 1;
  const sortedTD3 = [...new Set(uniqTD3)].sort((a, b) => docTypeFirst(a) - docTypeFirst(b));

  const validTD3 = sortedTD3.filter(hasMrzRatio);
  const validTD1 = uniqTD1.filter(hasMrzRatio);

  if (validTD3.length >= 2) return { lines: validTD3.slice(0, 2), format: 'TD3' };
  if (validTD1.length >= 3) return { lines: validTD1.slice(0, 3), format: 'TD1' };

  // ── Fallback: maybe tesseract ran lines together into one long string ────────
  const joined = rawLines.join('').replace(/[^A-Z0-9<]/g, '');
  if (joined.length >= 80) {
    // Try splitting at midpoint for TD3
    const mid = Math.floor(joined.length / 2);
    const half1 = joined.slice(0,   mid).padEnd(44, '<').slice(0, 44);
    const half2 = joined.slice(mid).padEnd(44, '<').slice(0, 44);
    if (hasMrzRatio(half1) && hasMrzRatio(half2)) {
      return { lines: [half1, half2], format: 'TD3' };
    }
  }

  // ── Fallback: accept even without filler-ratio check if we have enough lines ─
  if (sortedTD3.length >= 2) return { lines: sortedTD3.slice(0, 2), format: 'TD3' };
  if (uniqTD1.length >= 3)   return { lines: uniqTD1.slice(0, 3),   format: 'TD1' };

  throw new Error(
    'Zone MRZ non détectée.\n\n' +
    'Conseils :\n' +
    '• Posez le document à plat sur une surface sombre\n' +
    '• Cadrez la PAGE ENTIÈRE (les 2 lignes en bas doivent être visibles)\n' +
    '• Assurez-vous qu\'il n\'y a pas d\'ombre ni de reflet'
  );
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzData> {
  // 1. Preprocess: crop MRZ zone, scale up, binarise
  let image: string | File = file;
  try {
    image = await preprocessImage(file);
  } catch {
    // Fall back to original image if preprocessing fails
  }

  // 2. OCR with MRZ character whitelist
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });

  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    tessedit_pageseg_mode: '6' as never, // PSM_SINGLE_BLOCK
  });

  const { data: { text } } = await worker.recognize(image as string);
  await worker.terminate();

  // 3. Find MRZ lines in OCR output
  const { lines, format } = extractMrzLines(text);

  // 4. Parse positionally — no check-digit validation, no '<' dependency
  if (format === 'TD3' && lines.length >= 2) return parseTD3(lines[0], lines[1]);
  if (format === 'TD1' && lines.length >= 3) return parseTD1(lines);

  throw new Error('Format MRZ non reconnu. Essayez la saisie manuelle.');
}

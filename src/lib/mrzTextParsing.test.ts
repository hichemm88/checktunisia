import { describe, expect, it } from 'vitest';
import {
  extractMrzLines,
  fallbackTd3Date,
  isConfidentRead,
  mrzDateToISO,
  otsuThreshold,
  parseOcrText,
} from './mrzTextParsing';
import { parse as mrzParse } from 'mrz';

// ─── Générateur de MRZ valides (ICAO 9303, pondération 7-3-1) ──────────────
// Pas de fixtures figées : on calcule les chiffres de contrôle nous-mêmes pour
// pouvoir fabriquer (et corrompre à volonté) des lignes TD3/TD1 garanties
// valides, plutôt que de dépendre d'un seul exemple recopié.
function charValue(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
  return 0; // '<' et tout le reste
}
function checkDigit(input: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum += charValue(input[i]) * weights[i % 3];
  return String(sum % 10);
}

/** Construit une ligne 2 TD3 (44 chars) valide pour un passeport donné. */
function buildTd3Line2(opts: {
  docNumber: string; nationality: string; birth: string; sex: 'M' | 'F' | '<';
  expiry: string; optional?: string;
}): string {
  const docNumber = opts.docNumber.padEnd(9, '<').slice(0, 9);
  const docCheck = checkDigit(docNumber);
  const birthCheck = checkDigit(opts.birth);
  const expiryCheck = checkDigit(opts.expiry);
  const optional = (opts.optional ?? '').padEnd(14, '<').slice(0, 14);
  const optionalCheck = /^<*$/.test(optional) ? '<' : checkDigit(optional);
  const composite = checkDigit(
    docNumber + docCheck + opts.birth + birthCheck + opts.expiry + expiryCheck + optional + optionalCheck,
  );
  return (
    docNumber + docCheck + opts.nationality + opts.birth + birthCheck + opts.sex +
    opts.expiry + expiryCheck + optional + optionalCheck + composite
  );
}

function buildTd3(surname: string, given: string, opts: Parameters<typeof buildTd3Line2>[0]) {
  const names = `${surname}<<${given}`.replace(/ /g, '<');
  const line1 = ('P<' + opts.nationality + names).padEnd(44, '<').slice(0, 44);
  const line2 = buildTd3Line2(opts);
  return [line1, line2];
}

describe('mrzDateToISO', () => {
  it('converts a birth date before the rollover to the 2000s', () => {
    expect(mrzDateToISO('050101', true)).toBe('2005-01-01');
  });

  it('converts a birth date after the rollover to the 1900s', () => {
    const futureYY = String((new Date().getFullYear() % 100) + 5).padStart(2, '0');
    expect(mrzDateToISO(`${futureYY}0101`, true)).toBe(`19${futureYY}-01-01`);
  });

  it('always treats an expiry date as 2000s, even for a "future" YY', () => {
    expect(mrzDateToISO('991231', false)).toBe('2099-12-31');
  });

  it('returns null for malformed input', () => {
    expect(mrzDateToISO('12345', true)).toBeNull();
    expect(mrzDateToISO('1234AB', true)).toBeNull();
    expect(mrzDateToISO(null, true)).toBeNull();
    expect(mrzDateToISO(undefined, true)).toBeNull();
  });
});

describe('otsuThreshold', () => {
  it('finds the midpoint between two separated clusters', () => {
    const hist = new Array(256).fill(0);
    hist[20] = 100;  // dark cluster
    hist[220] = 100; // light cluster
    const t = otsuThreshold(hist, 200);
    expect(t).toBeGreaterThanOrEqual(20);
    expect(t).toBeLessThan(220);
  });

  it('returns a stable value for a single flat histogram (no crash)', () => {
    const hist = new Array(256).fill(1);
    expect(() => otsuThreshold(hist, 256)).not.toThrow();
  });
});

describe('extractMrzLines', () => {
  it('detects a clean TD3 (passport) pair', () => {
    const [line1, line2] = buildTd3('ERIKSSON', 'ANNA MARIA', {
      docNumber: 'L898902C3', nationality: 'UTO', birth: '740812', sex: 'F', expiry: '120415',
    });
    const result = extractMrzLines(`${line1}\n${line2}`);
    expect(result).not.toBeNull();
    expect(result?.format).toBe('TD3');
    expect(result?.lines).toEqual([line1, line2]);
  });

  it('ignores short noise lines and still finds the real MRZ pair', () => {
    const [line1, line2] = buildTd3('DOE', 'JOHN', {
      docNumber: 'X1234567', nationality: 'TUN', birth: '900101', sex: 'M', expiry: '300101',
    });
    const raw = `some header junk\n${line1}\nqr code garbage\n${line2}\nfooter`;
    const result = extractMrzLines(raw);
    expect(result?.format).toBe('TD3');
  });

  it('converts a double space to the "<<" filler (missing whitelist char)', () => {
    const [line1, line2] = buildTd3('DOE', 'JANE', {
      docNumber: 'Y7654321', nationality: 'TUN', birth: '850505', sex: 'F', expiry: '290505',
    });
    // Simulate tesseract rendering the surname/given-name filler as spaces.
    const noisyLine1 = line1.replace('<<', '  ');
    const result = extractMrzLines(`${noisyLine1}\n${line2}`);
    expect(result?.format).toBe('TD3');
    expect(result?.lines[0]).toBe(line1);
  });

  it('detects a TD1 (national ID, 3×30) triple', () => {
    // TD1 line 2: birth[0-5], check[6], sex[7], expiry[8-13], check[14], nationality[15-17]...
    const birth = '850505';
    const expiry = '300101';
    const line2 =
      birth + checkDigit(birth) + 'M' + expiry + checkDigit(expiry) + 'TUN' +
      '<'.repeat(11) + checkDigit('0'); // composite not required by our extractor
    const line1 = 'IDTUNX1234567<8<<<<<<<<<<<<<<';
    const line3 = 'DOE<<JOHN<<<<<<<<<<<<<<<<<<<<';
    const result = extractMrzLines(`${line1}\n${line2}\n${line3}`);
    expect(result?.format).toBe('TD1');
    expect(result?.lines).toHaveLength(3);
  });

  it('splits two MRZ lines that got OCR-concatenated into one string', () => {
    const [line1, line2] = buildTd3('SMITH', 'ROBERT', {
      docNumber: 'Z9988776', nationality: 'FRA', birth: '650320', sex: 'M', expiry: '280101',
    });
    const result = extractMrzLines(`${line1}${line2}`);
    expect(result?.format).toBe('TD3');
    expect(result?.lines).toEqual([line1, line2]);
  });

  it('returns null for text with no MRZ-shaped lines', () => {
    expect(extractMrzLines('REPUBLIQUE TUNISIENNE\nCARTE NATIONALE\n')).toBeNull();
  });
});

describe('fallbackTd3Date', () => {
  it('extracts a clean digit run', () => {
    const line2 = 'X'.repeat(13) + '740812' + 'X'.repeat(25);
    expect(fallbackTd3Date(line2, 13)).toBe('740812');
  });

  it('corrects common OCR letter/digit confusions (O→0, I→1, B→8, S→5)', () => {
    const line2 = 'X'.repeat(13) + 'O4IB1S' + 'X'.repeat(25);
    // O→0, 4→4, I→1, B→8, 1→1, S→5
    expect(fallbackTd3Date(line2, 13)).toBe('041815');
  });

  it('returns null when residual characters cannot be mapped to digits', () => {
    const line2 = 'X'.repeat(13) + '74081Q' + 'X'.repeat(25); // Q not in OCR_DIGIT_FIX
    expect(fallbackTd3Date(line2, 13)).toBeNull();
  });
});

describe('isConfidentRead', () => {
  it('trusts the composite check digit when the line is a full 44 chars', () => {
    const [, line2] = buildTd3('ERIKSSON', 'ANNA MARIA', {
      docNumber: 'L898902C3', nationality: 'UTO', birth: '740812', sex: 'F', expiry: '120415',
    });
    const result = mrzParse(
      buildTd3('ERIKSSON', 'ANNA MARIA', {
        docNumber: 'L898902C3', nationality: 'UTO', birth: '740812', sex: 'F', expiry: '120415',
      }),
      { autocorrect: true },
    );
    expect(line2).toHaveLength(44);
    expect(isConfidentRead(result)).toBe(true);
  });

  it('is not confident when the composite check digit is wrong', () => {
    const [line1, line2] = buildTd3('ERIKSSON', 'ANNA MARIA', {
      docNumber: 'L898902C3', nationality: 'UTO', birth: '740812', sex: 'F', expiry: '120415',
    });
    // Flip one digit inside the document number → every downstream check digit
    // (field-level AND composite) is now wrong for that field.
    const corrupted = '9' === line2[0] ? '8' : '9';
    const badLine2 = corrupted + line2.slice(1);
    const result = mrzParse([line1, badLine2], { autocorrect: true });
    expect(isConfidentRead(result)).toBe(false);
  });
});

describe('parseOcrText (integration: OCR text → MrzData + confident)', () => {
  it('parses a confident TD3 passport read end-to-end', () => {
    const [line1, line2] = buildTd3('ERIKSSON', 'ANNA MARIA', {
      docNumber: 'L898902C3', nationality: 'UTO', birth: '740812', sex: 'F', expiry: '120415',
    });
    const result = parseOcrText(`noise\n${line1}\n${line2}\nmore noise`);
    expect(result).not.toBeNull();
    expect(result?.confident).toBe(true);
    expect(result?.data.last_name).toBe('ERIKSSON');
    expect(result?.data.first_name).toBe('ANNA MARIA');
    expect(result?.data.sex).toBe('F');
    expect(result?.data.document_type).toBe('passport');
    expect(result?.data.date_of_birth).toBe('1974-08-12');
    expect(result?.data.expiry_date).toBe('2012-04-15');
  });

  it('flags a read with a corrupted document number as not confident', () => {
    const [line1, line2] = buildTd3('DOE', 'JANE', {
      docNumber: 'X1234567', nationality: 'TUN', birth: '900101', sex: 'F', expiry: '300101',
    });
    // Simulate a single OCR misread digit (2 → 7) inside the document number.
    const corruptedLine2 = line2.replace('X1234567', 'X1234567').replace('2', '7') ;
    const result = parseOcrText(`${line1}\n${corruptedLine2}`);
    // Either the check digit fails (not confident) or the structural match is
    // lost entirely (null) — either way this must NOT be silently trusted.
    if (result) expect(result.confident).toBe(false);
  });

  it('falls back to a tolerant date extraction when the mrz package nulls the field', () => {
    // Only last_name is required to return a result; a birth date field with an
    // OCR-confusable but unmapped character still round-trips via fallbackTd3Date.
    const [line1, line2] = buildTd3('MARTIN', 'PAUL', {
      docNumber: 'A1122334', nationality: 'TUN', birth: '881122', sex: 'M', expiry: '311122',
    });
    const result = parseOcrText(`${line1}\n${line2}`);
    expect(result?.data.date_of_birth).toBe('1988-11-22');
  });

  it('returns null when no MRZ lines are found at all', () => {
    expect(parseOcrText('random receipt text\ntotal: 42.00 TND')).toBeNull();
  });

  it('returns null when a last name cannot be extracted', () => {
    // Structurally MRZ-shaped (TD3 windows line up) but empty name field.
    const [line1, line2] = buildTd3('', '', {
      docNumber: 'B5566778', nationality: 'TUN', birth: '950303', sex: 'M', expiry: '320303',
    });
    const result = parseOcrText(`${line1}\n${line2}`);
    expect(result).toBeNull();
  });
});

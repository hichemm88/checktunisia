import { createWorker } from 'tesseract.js';
import { parse } from 'mrz';

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

// MRZ YYMMDD → YYYY-MM-DD
function mrzDateToISO(yymmdd: string | null | undefined, isBirth = false): string | null {
  if (!yymmdd || yymmdd.length !== 6 || /[^0-9]/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const fullYear = isBirth
    ? (yy > currentYY ? `19${String(yy).padStart(2, '0')}` : `20${String(yy).padStart(2, '0')}`)
    : `20${String(yy).padStart(2, '0')}`;
  return `${fullYear}-${mm}-${dd}`;
}

/**
 * Preprocess image:
 * - Crop bottom 33% (MRZ zone in passports)
 * - Scale up 2x for better OCR resolution
 * - Grayscale + binary threshold
 */
async function preprocessForMrz(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Crop bottom third
      const srcY = Math.floor(img.height * 0.65);
      const srcH = img.height - srcY;
      const scale = 2;

      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = srcH * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, canvas.width, canvas.height);

      // Grayscale + threshold
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
        const bin = gray < 140 ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = bin;
      }
      ctx.putImageData(imgData, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/** Fix common OCR misreads in MRZ context */
function fixMrzOcrErrors(line: string): string {
  // Characters that look like '<' in OCR-B
  return line
    .replace(/[-_–—~\.·,;]/g, '<')  // dash/dot variants → <
    .replace(/\s+/g, '')             // remove all spaces
    .toUpperCase();
}

/** Extract 44-char MRZ lines from OCR text */
function extractMrzLines(rawText: string): string[] {
  const candidates = rawText
    .split('\n')
    .map(fixMrzOcrErrors)
    .filter(l => l.length >= 30 && /^[A-Z0-9<]{30,}$/.test(l))
    .map(l => l.padEnd(44, '<').substring(0, 44));

  // Prefer exactly-44-char lines; sort by length desc
  return candidates
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzData> {
  // Preprocess
  let image: string;
  try {
    image = await preprocessForMrz(file);
  } catch {
    image = URL.createObjectURL(file);
  }

  // Create worker with character whitelist for MRZ
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  await worker.setParameters({
    // Only output chars found in MRZ
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    // PSM 6 = single uniform block of text
    tessedit_pageseg_mode: '6' as never,
  });

  const { data: { text } } = await worker.recognize(image);
  await worker.terminate();

  const lines = extractMrzLines(text);

  if (lines.length < 2) {
    throw new Error(
      'MRZ non lisible. Conseil : posez le passeport à plat, éclairez bien, et cadrez la page entière avec les 2 lignes de caractères en bas.'
    );
  }

  let parsed;
  try {
    parsed = parse(lines.slice(0, 2));
  } catch {
    throw new Error('Impossible de parser le MRZ. Réessayez ou saisissez manuellement.');
  }

  const f = parsed.fields;
  const sex = (f.sex as string) === 'M' ? 'M' : (f.sex as string) === 'F' ? 'F' : 'X';

  return {
    first_name: (f.firstName as string | null) ?? null,
    last_name: (f.lastName as string | null) ?? null,
    date_of_birth: mrzDateToISO(f.birthDate as string, true),
    sex: sex as 'M' | 'F' | 'X',
    nationality_code: (f.nationality as string | null) ?? null,
    document_number: (f.documentNumber as string | null) ?? null,
    issuing_country_code: (f.issuingState as string | null) ?? null,
    expiry_date: mrzDateToISO(f.expirationDate as string, false),
    document_type: 'passport',
  };
}

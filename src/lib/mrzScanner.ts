import Tesseract from 'tesseract.js';
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

// Convert MRZ YYMMDD to YYYY-MM-DD
function mrzDateToISO(yymmdd: string | null | undefined, isBirth = false): string | null {
  if (!yymmdd || yymmdd.length !== 6 || yymmdd.includes('<')) return null;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  let fullYear: string;
  if (isBirth) {
    // Birth: yy > currentYear → 19xx, else 20xx
    fullYear = yy > currentYY ? `19${String(yy).padStart(2, '0')}` : `20${String(yy).padStart(2, '0')}`;
  } else {
    // Expiry: always 20xx (all current passports expire after 2000)
    fullYear = `20${String(yy).padStart(2, '0')}`;
  }
  return `${fullYear}-${mm}-${dd}`;
}

// Preprocess image: grayscale + contrast for better OCR on MRZ zone
async function preprocessForMrz(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Grayscale + increase contrast for MRZ font
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
        // Simple contrast stretch
        const contrasted = Math.min(255, Math.max(0, (gray - 100) * 2));
        d[i] = d[i + 1] = d[i + 2] = contrasted;
      }
      ctx.putImageData(imgData, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// Extract MRZ lines from raw OCR text
function extractMrzLines(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.replace(/\s+/g, '').toUpperCase())
    // Keep only lines that look like MRZ (all A-Z, 0-9, <, length 30-44)
    .filter(l => /^[A-Z0-9<]{30,50}$/.test(l))
    // Normalize to exactly 44 chars
    .map(l => l.padEnd(44, '<').substring(0, 44));
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

  // Run OCR
  const { data: { text } } = await Tesseract.recognize(image, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const lines = extractMrzLines(text);

  if (lines.length < 2) {
    throw new Error('MRZ non détecté. Vérifiez que la zone MRZ (lignes en bas du passeport) est bien visible.');
  }

  let parsed;
  try {
    parsed = parse(lines.slice(0, 2));
  } catch {
    throw new Error('Impossible de lire le MRZ. Réessayez avec une meilleure photo.');
  }

  if (!parsed.valid) {
    throw new Error('MRZ invalide (check digit incorrect). Réessayez ou saisissez manuellement.');
  }

  const f = parsed.fields;
  const sex = f.sex === 'M' ? 'M' : f.sex === 'F' ? 'F' : 'X';

  return {
    first_name: (f.firstName as string | null) ?? null,
    last_name: (f.lastName as string | null) ?? null,
    date_of_birth: mrzDateToISO(f.birthDate as string | null, true),
    sex: sex as 'M' | 'F' | 'X',
    nationality_code: (f.nationality as string | null) ?? null,
    document_number: (f.documentNumber as string | null) ?? null,
    issuing_country_code: (f.issuingState as string | null) ?? null,
    expiry_date: mrzDateToISO(f.expirationDate as string | null, false),
    document_type: 'passport',
  };
}

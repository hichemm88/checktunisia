/**
 * Scanner CIN (Carte d'Identité Nationale tunisienne) — OCR client-side.
 *
 * Contrairement au passeport, la CIN tunisienne n'a pas de zone MRZ : les champs
 * (nom, prénom, numéro, date de naissance) sont imprimés en arabe, à extraire par
 * OCR "texte libre" puis à translittérer en latin (voir arabicTransliteration.ts).
 *
 * Approche mesurée empiriquement sur une vraie CIN (voir notes d'implémentation) :
 * - Le numéro CIN (8 chiffres) est en police imprimée nette → un recadrage ciblé
 *   sur la ligne du numéro + modèle 'eng' + whitelist chiffres donne un résultat
 *   quasi parfait (~95% confiance), largement meilleur qu'une lecture 'ara' brute.
 * - La date de naissance ("JJ MOIS AAAA" en arabe) bénéficie aussi d'un recadrage
 *   ciblé (moins de bruit inter-colonnes) + un matching flou du nom de mois.
 * - Le nom/prénom (police décorative arabe) ne bénéficie PAS systématiquement d'un
 *   recadrage ciblé (le contexte plus large aide parfois le modèle 'ara') → on garde
 *   la lecture pleine-page, avec une heuristique positionnelle basée sur la mise en
 *   page fixe de la CIN (اللقب puis الاسم juste après le numéro, avant la filiation).
 *
 * Conclusion pratique : le numéro et la date sont assez fiables ; nom/prénom
 * restent approximatifs et DOIVENT être vérifiés/corrigés par l'utilisateur — la
 * saisie manuelle corrigeable est le vrai filet de sécurité, pas l'OCR.
 */

import { createWorker } from 'tesseract.js';
import { transliterateArabicName } from './arabicTransliteration';
import { WORKER_PATH, CORE_PATH, langDataPath } from './mrzScanner';

export interface CinData {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  document_number: string | null;
  document_type: 'national_id';
  nationality_code: 'TUN';
  issuing_country_code: 'TUN';
  // Texte arabe brut détecté — utile pour que l'utilisateur juge/corrige la translittération.
  raw_first_name_ar: string | null;
  raw_last_name_ar: string | null;
}

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;
type Line = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };

// px — mesuré empiriquement : la CIN occupe rarement tout le cadre (fond visible
// autour de la carte sur une vraie photo), donc le texte a une résolution effective
// bien plus basse qu'un recadrage serré. 1800px s'est révélé insuffisant pour le
// numéro/la date en test réel → relevé à 2600px.
const MAX_W = 2600;

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function loadCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = MAX_W / img.width;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image non lisible')); };
    img.src = url;
  });
}

/** Recadre une zone du canvas source (avec marge) et l'agrandit — pour un OCR ciblé. */
function cropToDataUrl(
  src: HTMLCanvasElement,
  bbox: { x0: number; y0: number; x1: number; y1: number },
  padX: number, padY: number, upscale: number,
): string {
  const x = Math.max(0, bbox.x0 - padX);
  const y = Math.max(0, bbox.y0 - padY);
  const w = Math.min(src.width - x, (bbox.x1 - bbox.x0) + padX * 2);
  const h = Math.min(src.height - y, (bbox.y1 - bbox.y0) + padY * 2);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * upscale));
  canvas.height = Math.max(1, Math.round(h * upscale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

// ─── Mois arabes (graphie tunisienne d'origine française + variantes MSA) ──────

const ARABIC_MONTHS: Record<string, number> = {
  'جانفي': 1, 'فيفري': 2, 'مارس': 3, 'أفريل': 4, 'افريل': 4, 'ماي': 5, 'جوان': 6,
  'جويلية': 7, 'أوت': 8, 'اوت': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10,
  'نوفمبر': 11, 'ديسمبر': 12,
  'يناير': 1, 'فبراير': 2, 'إبريل': 4, 'ابريل': 4, 'يونيو': 6, 'يوليو': 7,
  'أغسطس': 8, 'اغسطس': 8,
};

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Cherche "JJ MOIS AAAA" dans le texte (tolérant aux erreurs OCR sur le nom de mois
 * via distance de Levenshtein — ex. 'اكتوير' matche 'اكتوبر' à distance 1).
 * Fallback : format numérique JJ/MM/AAAA.
 */
function parseDob(rawText: string): string | null {
  const cleaned = rawText.replace(/[ً-ٰٟ]/g, '');
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  let monthIdx = -1;
  let monthNum: number | null = null;
  let bestDist = 3;
  tokens.forEach((tok, i) => {
    const clean = tok.replace(/[^؀-ۿ]/g, '');
    if (clean.length < 3) return;
    for (const [name, num] of Object.entries(ARABIC_MONTHS)) {
      const d = levenshtein(clean, name);
      if (d < bestDist) { bestDist = d; monthNum = num; monthIdx = i; }
    }
  });

  if (monthIdx === -1 || monthNum === null) {
    const numeric = cleaned.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (numeric) {
      const [, d, mo, y] = numeric;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
  }

  let day: string | null = null;
  for (let i = monthIdx - 1; i >= Math.max(0, monthIdx - 3); i--) {
    if (/^\d{1,2}$/.test(tokens[i])) { day = tokens[i]; break; }
  }
  let year: string | null = null;
  for (let i = monthIdx + 1; i <= Math.min(tokens.length - 1, monthIdx + 3); i++) {
    const digits = tokens[i].replace(/\D/g, '');
    if (digits.length >= 4) { year = digits.slice(0, 4); break; }
  }
  if (!day || !year) return null;

  const yearNum = parseInt(year, 10);
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) return null;

  return `${year}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// ─── Extraction du numéro CIN (8 chiffres) depuis le texte brut ────────────────

function extractDocNumber(text: string): string | null {
  const exact = text.match(/\b\d{8}\b/);
  if (exact) return exact[0];
  const runs = text.match(/\d{6,10}/g);
  if (runs && runs.length) return runs.sort((a, b) => b.length - a.length)[0];
  return null;
}

// ─── Extraction nom/prénom par position (mise en page fixe de la CIN) ──────────
// Ordre imprimé constant : [en-tête] [numéro] اللقب [nom] الاسم [prénom]
// [filiation "بن ... بن ..."] تاريخ الولادة [date] [lieu de naissance]

const HEADER_RE = /الجمهورية|بطاقة|التعريف|الوطني/;
const DOB_KEYWORD_RE = /تاريخ|ولادة/;

function stripLabel(text: string, labelRe: RegExp): string {
  return text
    .replace(labelRe, ' ')
    .replace(/[^؀-ۿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNameFields(lines: Line[]): {
  lastNameAr: string | null; firstNameAr: string | null;
  lastNameLine: Line | null; firstNameLine: Line | null;
  dobLine: Line | null; numLine: Line | null;
} {
  const numLine = lines.find((l) => (l.text.match(/\d/g)?.length ?? 0) >= 4) ?? null;
  const dobLine = lines.find((l) => DOB_KEYWORD_RE.test(l.text)) ?? null;

  // Tentative "propre" : la ligne contient littéralement le mot-label.
  let lastNameLine = lines.find((l) => /اللقب/.test(l.text)) ?? null;
  let firstNameLine = lines.find((l) => /الاسم/.test(l.text) && !/الأب/.test(l.text)) ?? null;

  // Fallback positionnel : lignes arabes hors en-tête/numéro/date, dans l'ordre
  // d'impression (nom de famille avant prénom).
  if (!lastNameLine || !firstNameLine) {
    const candidates = lines.filter((l) =>
      /[؀-ۿ]/.test(l.text) &&
      !HEADER_RE.test(l.text) &&
      (l.text.match(/\d/g)?.length ?? 0) < 4 &&
      l !== dobLine,
    );
    if (!lastNameLine) lastNameLine = candidates[0] ?? null;
    if (!firstNameLine) firstNameLine = candidates[1] ?? null;
  }

  const lastNameAr = lastNameLine ? stripLabel(lastNameLine.text, /اللقب/) || null : null;
  const firstNameAr = firstNameLine ? stripLabel(firstNameLine.text, /الاسم/) || null : null;

  return { lastNameAr, firstNameAr, lastNameLine, firstNameLine, dobLine, numLine };
}

// ─── OCR ────────────────────────────────────────────────────────────────────

export async function scanCin(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CinData> {
  const report = (pct: number) => onProgress?.(Math.min(99, Math.max(0, Math.round(pct))));

  report(5);
  const canvas = await loadCanvas(file);
  report(15);

  const workerAra: TesseractWorker = await createWorker('ara', 1, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: langDataPath('ara'),
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading language traineddata') report(15 + m.progress * 30);
      else if (m.status === 'recognizing text') report(45 + m.progress * 15);
    },
  });

  let lines: Line[] = [];
  let fullText = '';

  try {
    await workerAra.setParameters({ tessedit_pageseg_mode: '6' as never });
    const { data } = await workerAra.recognize(canvas.toDataURL('image/png'));
    lines = (data.lines ?? []) as Line[];
    fullText = data.text;
    console.log('[CIN] OCR brut (pleine page):\n', fullText);

    const { lastNameAr, firstNameAr, lastNameLine, firstNameLine, dobLine, numLine } = extractNameFields(lines);
    report(60);

    // ── Nom/prénom : recadrage ciblé accepté seulement s'il n'appauvrit pas le
    // signal (le contexte pleine-page aide parfois plus le modèle 'ara' qu'un
    // recadrage serré — mesuré empiriquement : bénéfique pour le nom, pas
    // toujours pour le prénom) ──────────────────────────────────────────────
    const arabicCharCount = (s: string) => (s.match(/[؀-ۿ]/g) ?? []).length;

    async function refineNameCandidate(line: Line | null, raw: string | null, labelRe: RegExp): Promise<string | null> {
      if (!line) return raw;
      try {
        const cropUrl = cropToDataUrl(canvas, line.bbox, 25, 15, 3);
        const { data } = await workerAra.recognize(cropUrl);
        const cleaned = stripLabel(data.text, labelRe);
        if (cleaned && arabicCharCount(cleaned) >= arabicCharCount(raw ?? '') - 1) {
          return cleaned;
        }
      } catch (e) {
        console.warn('[CIN] Recadrage nom échoué, fallback texte pleine page:', e);
      }
      return raw;
    }

    const lastNameArRefined = await refineNameCandidate(lastNameLine, lastNameAr, /اللقب/);
    report(65);
    const firstNameArRefined = await refineNameCandidate(firstNameLine, firstNameAr, /الاسم/);
    report(70);

    // ── Date de naissance : recadrage ciblé (réduit le bruit inter-colonnes) ──
    let dobText = dobLine?.text ?? fullText;
    if (dobLine) {
      try {
        const cropUrl = cropToDataUrl(canvas, dobLine.bbox, 20, 12, 2);
        const { data: dobData } = await workerAra.recognize(cropUrl);
        if (dobData.text.trim()) dobText = dobData.text;
      } catch (e) {
        console.warn('[CIN] Recadrage date échoué, fallback texte pleine page:', e);
      }
    }
    const date_of_birth = parseDob(dobText) ?? parseDob(fullText);
    report(78);

    // ── Numéro CIN : recadrage ciblé + modèle 'eng' + whitelist chiffres ──────
    let document_number = extractDocNumber(fullText);
    if (numLine) {
      let workerEng: TesseractWorker | null = null;
      try {
        workerEng = await createWorker('eng', 1, {
          workerPath: WORKER_PATH,
          corePath: CORE_PATH,
          langPath: langDataPath('eng'),
          workerBlobURL: false,
        });
        await workerEng.setParameters({
          tessedit_pageseg_mode: '7' as never,
          tessedit_char_whitelist: '0123456789',
        });
        const cropUrl = cropToDataUrl(canvas, numLine.bbox, 15, 8, 3);
        const { data: numData } = await workerEng.recognize(cropUrl);
        const digits = numData.text.replace(/\D/g, '');
        if (digits.length === 8) document_number = digits;
        else if (digits.length >= 6 && !document_number) document_number = digits;
      } catch (e) {
        console.warn('[CIN] Recadrage numéro échoué, fallback regex pleine page:', e);
      } finally {
        if (workerEng) await workerEng.terminate();
      }
    }
    report(92);

    const first_name = firstNameArRefined ? transliterateArabicName(firstNameArRefined) : null;
    const last_name = lastNameArRefined ? transliterateArabicName(lastNameArRefined) : null;

    if (!first_name && !last_name && !document_number) {
      throw new Error('Aucune donnée exploitable détectée sur la CIN');
    }

    report(100);
    return {
      first_name: first_name || null,
      last_name: last_name || null,
      date_of_birth,
      document_number,
      document_type: 'national_id',
      nationality_code: 'TUN',
      issuing_country_code: 'TUN',
      raw_first_name_ar: firstNameArRefined,
      raw_last_name_ar: lastNameArRefined,
    };
  } finally {
    await workerAra.terminate();
  }
}

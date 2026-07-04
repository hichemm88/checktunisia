/**
 * Scanner CIN (Carte d'Identité Nationale tunisienne) — OCR client-side.
 *
 * Contrairement au passeport, la CIN tunisienne n'a pas de zone MRZ : les champs
 * (nom, prénom, numéro, date de naissance) sont imprimés en arabe, à extraire par
 * OCR "texte libre" puis à translittérer en latin (voir arabicTransliteration.ts).
 *
 * Pipeline (v2 — prétraitement réel, voir imagePreprocess.ts) :
 * 1. Détection + recadrage automatique de la carte dans la photo (isole la CIN
 *    du fond — indispensable sur une vraie photo de téléphone, le fond
 *    (siège de voiture, table...) polluait complètement l'OCR sinon).
 * 2. Redressement (deskew) : la carte est ramenée à un rectangle canonique,
 *    quelle que soit l'inclinaison/orientation de la photo d'origine.
 * 3. Amélioration de contraste sur la carte redressée.
 * 4. Une fois la carte redressée à un format canonique connu, le numéro et la
 *    date sont lus via un recadrage à POSITION FIXE (fractions de la carte,
 *    calibrées sur la mise en page officielle de la CIN) — bien plus fiable
 *    qu'une détection de ligne sur un OCR pleine-page bruité. Le nom/prénom
 *    utilisent la même zone fixe mais restent approximatifs (police décorative
 *    arabe, pas de voyelles courtes à l'écrit) → à corriger manuellement.
 * 5. Si la détection de carte échoue (fond trop proche en luminosité, carte
 *    hors cadre...), on retombe sur l'ancienne heuristique pleine-image
 *    (moins fiable mais on ne bloque pas l'utilisateur).
 * 6. Validation stricte : le numéro n'est renvoyé que s'il fait EXACTEMENT 8
 *    chiffres ; la date n'est renvoyée que si l'année est plausible. Sinon on
 *    renvoie null plutôt qu'une valeur fausse, avec des indicateurs de fiabilité.
 */

import { createWorker } from 'tesseract.js';
import { transliterateArabicName } from './arabicTransliteration';
import { WORKER_PATH, CORE_PATH, langDataPath } from './mrzScanner';
import { toGrayscale, detectCard, rotateCropToCanvas, contrastStretch, type CardDetection } from './imagePreprocess';

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
  // Indicateurs de fiabilité — l'UI doit avertir l'utilisateur quand ils sont à false.
  card_detected: boolean;
  document_number_reliable: boolean;
  date_of_birth_reliable: boolean;
}

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;
type Line = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };

// px — plafond de l'image pleine résolution chargée en mémoire (avant détection/recadrage).
const MAX_SOURCE_W = 3200;
// px — copie réduite utilisée uniquement pour la détection de carte (rapidité).
const DETECT_W = 640;
// px — largeur de sortie de la carte redressée/recadrée.
const CANONICAL_W = 2200;

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image non lisible')); };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Recadre une zone (bbox en pixels) du canvas source et l'agrandit — pour un OCR ciblé. */
function cropBboxToDataUrl(
  src: HTMLCanvasElement,
  bbox: { x0: number; y0: number; x1: number; y1: number },
  padX: number, padY: number, upscale: number,
): string {
  const x = Math.max(0, bbox.x0 - padX);
  const y = Math.max(0, bbox.y0 - padY);
  const w = Math.min(src.width - x, (bbox.x1 - bbox.x0) + padX * 2);
  const h = Math.min(src.height - y, (bbox.y1 - bbox.y0) + padY * 2);
  return cropRectToDataUrl(src, x, y, w, h, upscale);
}

function cropRectToDataUrl(
  src: HTMLCanvasElement, x: number, y: number, w: number, h: number, upscale: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * upscale));
  canvas.height = Math.max(1, Math.round(h * upscale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Recadre une zone de la carte CANONIQUE exprimée en fractions (0..1) de largeur/hauteur. */
function cropFractionToDataUrl(
  canonical: HTMLCanvasElement,
  xFrac: [number, number], yFrac: [number, number],
  upscale: number,
): string {
  const x = Math.round(xFrac[0] * canonical.width);
  const w = Math.round((xFrac[1] - xFrac[0]) * canonical.width);
  const y = Math.round(yFrac[0] * canonical.height);
  const h = Math.round((yFrac[1] - yFrac[0]) * canonical.height);
  return cropRectToDataUrl(canonical, x, y, w, h, upscale);
}

/**
 * Comme cropFractionToDataUrl, mais retourne en plus l'offset/échelle permettant
 * de remapper une bbox de ligne (obtenue par l'OCR sur ce recadrage) vers les
 * coordonnées de la carte CANONIQUE — pour un recadrage ciblé de 2e passe, plus
 * net qu'une zone large diluée sur plusieurs lignes.
 */
function cropFractionZone(
  canonical: HTMLCanvasElement,
  xFrac: [number, number], yFrac: [number, number],
  upscale: number,
): { dataUrl: string; offsetX: number; offsetY: number; scale: number } {
  const offsetX = Math.round(xFrac[0] * canonical.width);
  const w = Math.round((xFrac[1] - xFrac[0]) * canonical.width);
  const offsetY = Math.round(yFrac[0] * canonical.height);
  const h = Math.round((yFrac[1] - yFrac[0]) * canonical.height);
  return { dataUrl: cropRectToDataUrl(canonical, offsetX, offsetY, w, h, upscale), offsetX, offsetY, scale: upscale };
}

/** Remappe une bbox (obtenue sur l'image recadrée par cropFractionZone) vers les coordonnées canoniques. */
function mapZoneBboxToCanonical(
  bbox: { x0: number; y0: number; x1: number; y1: number },
  zone: { offsetX: number; offsetY: number; scale: number },
): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: zone.offsetX + bbox.x0 / zone.scale,
    y0: zone.offsetY + bbox.y0 / zone.scale,
    x1: zone.offsetX + bbox.x1 / zone.scale,
    y1: zone.offsetY + bbox.y1 / zone.scale,
  };
}

// ─── Zones fixes sur la carte redressée (calibrées sur la mise en page CIN) ────
// Ordre imprimé constant : [en-tête] [numéro] اللقب [nom] الاسم [prénom]
// [filiation "بن ... بن ..."] تاريخ الولادة [date] [lieu de naissance]
// Marges volontairement généreuses (mesuré empiriquement : un zonage trop
// serré rogne le haut/bas des lignes utiles, ce qui abîme la lecture bien
// plus qu'un peu de contenu voisin en trop dans la zone).
const ZONE_NUMBER: { x: [number, number]; y: [number, number] } = { x: [0, 1], y: [0.18, 0.46] };
const ZONE_NAME:   { x: [number, number]; y: [number, number] } = { x: [0, 1], y: [0.42, 0.66] };
const ZONE_DOB:    { x: [number, number]; y: [number, number] } = { x: [0, 1], y: [0.60, 0.88] };

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

function isPlausibleYear(y: number): boolean {
  return y >= 1900 && y <= new Date().getFullYear();
}

/** Repère, parmi des lignes, celle qui contient probablement un nom de mois arabe (tolérant aux fautes d'OCR). */
function findMonthLine(lines: Line[]): Line | null {
  let best: Line | null = null;
  let bestDist = 3;
  for (const line of lines) {
    for (const tok of line.text.split(/\s+/)) {
      const clean = tok.replace(/[^؀-ۿ]/g, '');
      if (clean.length < 3) continue;
      for (const name of Object.keys(ARABIC_MONTHS)) {
        const d = levenshtein(clean, name);
        if (d < bestDist) { bestDist = d; best = line; }
      }
    }
  }
  return best;
}

/**
 * Cherche "JJ MOIS AAAA" dans le texte (tolérant aux erreurs OCR sur le nom de mois
 * via distance de Levenshtein — ex. 'اكتوير' matche 'اكتوبر' à distance 1).
 * Fallback : format numérique JJ/MM/AAAA. Rejette les années non plausibles.
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
      if (!isPlausibleYear(parseInt(y, 10))) return null;
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
  if (!isPlausibleYear(yearNum)) return null;
  const dayNum = parseInt(day, 10);
  if (dayNum < 1 || dayNum > 31) return null;

  return `${year}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// ─── Extraction du numéro CIN (exactement 8 chiffres, sinon rejeté) ────────────

function extractExact8Digits(text: string): string | null {
  const exact = text.match(/\b\d{8}\b/);
  return exact ? exact[0] : null;
}

// ─── Extraction nom/prénom par position (fallback pleine-image, sans détection) ─

const HEADER_RE = /الجمهورية|بطاقة|التعريف|الوطني/;
const DOB_KEYWORD_RE = /تاريخ|ولادة/;

function stripLabel(text: string, labelRe: RegExp): string {
  return text
    .replace(labelRe, ' ')
    .replace(/[^؀-ۿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNameFieldsFallback(lines: Line[]): {
  lastNameAr: string | null; firstNameAr: string | null;
  dobLine: Line | null; numLine: Line | null;
} {
  const numLine = lines.find((l) => (l.text.match(/\d/g)?.length ?? 0) >= 4) ?? null;
  const dobLine = lines.find((l) => DOB_KEYWORD_RE.test(l.text)) ?? null;

  let lastNameLine = lines.find((l) => /اللقب/.test(l.text)) ?? null;
  let firstNameLine = lines.find((l) => /الاسم/.test(l.text) && !/الأب/.test(l.text)) ?? null;

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

  return {
    lastNameAr: lastNameLine ? stripLabel(lastNameLine.text, /اللقب/) || null : null,
    firstNameAr: firstNameLine ? stripLabel(firstNameLine.text, /الاسم/) || null : null,
    dobLine, numLine,
  };
}

/** Sépare les lignes d'une zone nom/prénom recadrée en (nom, prénom) par position. */
function splitNameZoneLines(lines: Line[]): { lastNameAr: string | null; firstNameAr: string | null } {
  const candidates = lines.filter((l) => /[؀-ۿ]/.test(l.text) && !HEADER_RE.test(l.text));
  const sorted = candidates.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const lastNameAr = sorted[0] ? stripLabel(sorted[0].text, /اللقب/) || null : null;
  const firstNameAr = sorted[1] ? stripLabel(sorted[1].text, /الاسم/) || null : null;
  return { lastNameAr, firstNameAr };
}

// ─── OCR ────────────────────────────────────────────────────────────────────

export async function scanCin(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CinData> {
  const report = (pct: number) => onProgress?.(Math.min(99, Math.max(0, Math.round(pct))));

  report(3);
  const img = await loadImage(file);
  const srcScale = Math.min(1, MAX_SOURCE_W / img.width) || 1;
  const fullResCanvas = drawToCanvas(img, Math.round(img.width * srcScale), Math.round(img.height * srcScale));
  report(8);

  // ── Détection de carte : cherche le plus grand blob quadrangulaire plausible
  // sur une copie réduite, isole/redresse la carte sur l'image pleine résolution ──
  const detectScale = Math.min(1, DETECT_W / fullResCanvas.width) || 1;
  const detectCanvas = drawToCanvas(img, Math.round(fullResCanvas.width * detectScale), Math.round(fullResCanvas.height * detectScale));
  const detectCtx = detectCanvas.getContext('2d')!;
  const detectImgData = detectCtx.getImageData(0, 0, detectCanvas.width, detectCanvas.height);
  const gray = toGrayscale(detectImgData);
  const detection: CardDetection | null = detectCard(gray, detectCanvas.width, detectCanvas.height);

  let canonical: HTMLCanvasElement;
  const cardDetected = detection !== null;

  if (detection) {
    const scaleToFullRes = fullResCanvas.width / detectCanvas.width;
    canonical = rotateCropToCanvas(fullResCanvas, detection, scaleToFullRes, CANONICAL_W);
    console.log(`[CIN] Carte détectée — aire=${(detection.areaRatio * 100).toFixed(1)}% angle=${(detection.angleRad * 180 / Math.PI).toFixed(1)}°`);
  } else {
    canonical = fullResCanvas;
    console.warn('[CIN] Carte non détectée — utilisation de l\'image entière (fond compris), fiabilité réduite.');
  }
  report(15);

  // Amélioration de contraste sur la carte redressée (aide toutes les lectures suivantes).
  const canonCtx = canonical.getContext('2d')!;
  const canonImgData = canonCtx.getImageData(0, 0, canonical.width, canonical.height);
  contrastStretch(canonImgData);
  canonCtx.putImageData(canonImgData, 0, 0);
  report(20);

  const workerAra: TesseractWorker = await createWorker('ara', 1, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: langDataPath('ara'),
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading language traineddata') report(20 + m.progress * 25);
      else if (m.status === 'recognizing text') report(45 + m.progress * 10);
    },
  });

  try {
    await workerAra.setParameters({ tessedit_pageseg_mode: '6' as never });

    // ── Nom/prénom : zone fixe si carte détectée, sinon heuristique pleine-image ──
    let lastNameAr: string | null = null;
    let firstNameAr: string | null = null;
    let fullText = '';
    let fallbackLines: Line[] = [];
    let fallbackDobLine: Line | null = null;
    let fallbackNumLine: Line | null = null;

    if (cardDetected) {
      const nameZoneUrl = cropFractionToDataUrl(canonical, ZONE_NAME.x, ZONE_NAME.y, 1.4);
      const { data: nameData } = await workerAra.recognize(nameZoneUrl);
      const nameLines = (nameData.lines ?? []) as Line[];
      const split = splitNameZoneLines(nameLines);
      lastNameAr = split.lastNameAr;
      firstNameAr = split.firstNameAr;
      fullText = nameData.text;
      console.log('[CIN] Zone nom — texte brut:', JSON.stringify(nameData.text));
    } else {
      const { data } = await workerAra.recognize(canonical.toDataURL('image/png'));
      fallbackLines = (data.lines ?? []) as Line[];
      fullText = data.text;
      console.log('[CIN] OCR brut (pleine page, sans détection):\n', fullText);
      const fb = extractNameFieldsFallback(fallbackLines);
      lastNameAr = fb.lastNameAr;
      firstNameAr = fb.firstNameAr;
      fallbackDobLine = fb.dobLine;
      fallbackNumLine = fb.numLine;
    }
    report(65);

    // ── Date de naissance : zone fixe, affinée sur la ligne précise repérée dans
    // la zone (2e recadrage plus serré — la zone seule est souvent diluée sur
    // 2-3 lignes, ce qui abîme la résolution effective de la ligne utile) ──────
    let date_of_birth: string | null = null;
    if (cardDetected) {
      const dobZone = cropFractionZone(canonical, ZONE_DOB.x, ZONE_DOB.y, 1.6);
      const { data: dobData } = await workerAra.recognize(dobZone.dataUrl);
      const dobLines = (dobData.lines ?? []) as Line[];
      console.log('[CIN] Zone date — texte brut:', JSON.stringify(dobData.text));

      date_of_birth = parseDob(dobData.text);
      const dobLine = dobLines.find((l) => DOB_KEYWORD_RE.test(l.text)) ?? findMonthLine(dobLines);
      if (dobLine) {
        const canonBbox = mapZoneBboxToCanonical(dobLine.bbox, dobZone);
        const refineUrl = cropBboxToDataUrl(canonical, canonBbox, 25, 15, 2.2);
        const { data: refined } = await workerAra.recognize(refineUrl);
        console.log('[CIN] Date affinée — texte brut:', JSON.stringify(refined.text));
        date_of_birth = parseDob(refined.text) ?? date_of_birth;
      }
    } else if (fallbackDobLine) {
      const cropUrl = cropBboxToDataUrl(canonical, fallbackDobLine.bbox, 20, 12, 2);
      const { data: dobData } = await workerAra.recognize(cropUrl);
      date_of_birth = parseDob(dobData.text) ?? parseDob(fullText);
    } else {
      date_of_birth = parseDob(fullText);
    }
    const date_of_birth_reliable = date_of_birth !== null;
    report(78);

    // ── Numéro CIN : zone fixe, affinée sur la ligne précise repérée dans la
    // zone (même logique que la date — la ligne exacte, une fois isolée et
    // ré-agrandie depuis l'image canonique, donne un résultat bien plus net) ──
    let document_number: string | null = null;
    {
      let workerEng: TesseractWorker | null = null;
      try {
        workerEng = await createWorker('eng', 1, {
          workerPath: WORKER_PATH,
          corePath: CORE_PATH,
          langPath: langDataPath('eng'),
          workerBlobURL: false,
        });
        await workerEng.setParameters({
          tessedit_pageseg_mode: '6' as never,
          tessedit_char_whitelist: '0123456789',
        });

        if (cardDetected) {
          const numZone = cropFractionZone(canonical, ZONE_NUMBER.x, ZONE_NUMBER.y, 1.6);
          const { data: numData } = await workerEng.recognize(numZone.dataUrl);
          console.log('[CIN] Zone numéro — texte brut:', JSON.stringify(numData.text));
          document_number = extractExact8Digits(numData.text.replace(/[^\d\n]/g, ''));

          const numLines = (numData.lines ?? []) as Line[];
          const bestDigitLine = numLines
            .slice()
            .sort((a, b) => (b.text.match(/\d/g)?.length ?? 0) - (a.text.match(/\d/g)?.length ?? 0))[0];
          if (bestDigitLine && (bestDigitLine.text.match(/\d/g)?.length ?? 0) >= 3) {
            const canonBbox = mapZoneBboxToCanonical(bestDigitLine.bbox, numZone);
            await workerEng.setParameters({ tessedit_pageseg_mode: '7' as never });
            const refineUrl = cropBboxToDataUrl(canonical, canonBbox, 25, 20, 3);
            const { data: refined } = await workerEng.recognize(refineUrl);
            console.log('[CIN] Numéro affiné — texte brut:', JSON.stringify(refined.text));
            const refinedDigits = extractExact8Digits(refined.text.replace(/\D/g, ''));
            if (refinedDigits) document_number = refinedDigits;
          }
        } else if (fallbackNumLine) {
          const cropUrl = cropBboxToDataUrl(canonical, fallbackNumLine.bbox, 15, 8, 3);
          const { data: numData } = await workerEng.recognize(cropUrl);
          document_number = extractExact8Digits(numData.text.replace(/\D/g, ''));
        }
        if (!document_number) {
          // Dernier recours : regex sur le texte pleine page/zone déjà lu (rare).
          document_number = extractExact8Digits(fullText);
        }
      } catch (e) {
        console.warn('[CIN] Lecture numéro échouée:', e);
      } finally {
        if (workerEng) await workerEng.terminate();
      }
    }
    const document_number_reliable = document_number !== null;
    report(92);

    const first_name = firstNameAr ? transliterateArabicName(firstNameAr) : null;
    const last_name = lastNameAr ? transliterateArabicName(lastNameAr) : null;

    if (!first_name && !last_name && !document_number && !date_of_birth) {
      throw new Error('Aucune donnée exploitable détectée sur la CIN — reprenez la photo (carte bien à plat, cadrée, lumière suffisante).');
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
      raw_first_name_ar: firstNameAr,
      raw_last_name_ar: lastNameAr,
      card_detected: cardDetected,
      document_number_reliable,
      date_of_birth_reliable,
    };
  } finally {
    await workerAra.terminate();
  }
}

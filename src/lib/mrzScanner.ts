/**
 * MRZ Scanner — réécriture complète (v3)
 *
 * Améliorations clés vs version précédente :
 *
 * 1. Modèle OCRB (OCR-B dédié MRZ) au lieu du modèle générique 'eng'
 *    → Reconnaît correctement le caractère '<' (filler ISO 7501)
 *      sans le confondre avec K ou L comme le fait 'eng'.
 *    → Plus léger : ~1.4 MB vs ~10 MB pour 'eng' → chargement plus rapide.
 *    → Source : cdn.jsdelivr.net (jsDelivr) — chargé par le navigateur, mis en cache.
 *
 * 2. Package 'mrz' pour le parsing (déjà installé v3.3.0)
 *    → Gère TD1 / TD2 / TD3 (ICAO Doc 9303)
 *    → Valide les check digits ISO 7501
 *    → autocorrect: true corrige O↔0, I↔1 dans les champs numériques
 *    → Découpe correctement SURNAME<<GIVEN en lastName / firstName
 *    → Plus besoin des heuristiques de détection de filler (cleanSurname, detectFillerSet…)
 *
 * 3. Architecture
 *    → Single worker partagé entre toutes les tentatives (performance mobile)
 *    → Preprocessing Otsu + cap 2000px (qualité / vitesse mobile)
 *    → Fallback 'eng' automatique si OCRB indisponible (dégradation gracieuse)
 */

import { createWorker } from 'tesseract.js';
import { parse as mrzParse } from 'mrz';
import { detectMrzCandidates } from './mrzZoneDetect';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Conversion date ────────────────────────────────────────────────────────────

/**
 * YYMMDD (format MRZ) → ISO YYYY-MM-DD
 * Pour les dates de naissance : YY > année courante → siècle précédent (1900).
 */
function mrzDateToISO(yymmdd: string | null | undefined, isBirth: boolean): string | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const century = isBirth && yy > currentYY ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

// ─── Preprocessing image ────────────────────────────────────────────────────────

const MAX_CANVAS_W = 1300; // px — la MRZ reste lisible et l'OCR est bien plus rapide

/** Seuil Otsu — s'adapte à l'éclairage réel sans valeur fixe arbitraire */
function otsuThreshold(histogram: number[], total: number): number {
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * histogram[t];

  let sumBg = 0, wBg = 0, maxVar = -1, threshold = 127;
  for (let t = 0; t < 256; t++) {
    wBg += histogram[t];
    if (wBg === 0) continue;
    const wFg = total - wBg;
    if (wFg === 0) break;
    sumBg += t * histogram[t];
    const mBg = sumBg / wBg;
    const mFg = (sumAll - sumBg) / wFg;
    const v = wBg * wFg * (mBg - mFg) ** 2;
    if (v > maxVar) { maxVar = v; threshold = t; }
  }
  return threshold;
}

/**
 * Charge un File en image bitmap, EN APPLIQUANT l'orientation EXIF.
 *
 * Crucial : les photos de téléphone (iPhone surtout) stockent souvent les pixels
 * en paysage + un tag EXIF « pivoter ». `createImageBitmap(..., {imageOrientation:
 * 'from-image'})` applique ce tag → l'image « à l'endroit » l'est vraiment côté
 * pixels, donc la rotation 0° la lit du premier coup (rapide). Sans ça, une photo
 * droite paraissait pivotée et enchaînait 10+ passes OCR inutiles.
 * Repli sur HTMLImageElement si l'API n'est pas dispo (rotations brute-force alors).
 */
async function loadImage(file: File): Promise<HTMLImageElement> {
  // Chargement via <img> : les navigateurs modernes (Chrome 81+, Safari 13.4+)
  // APPLIQUENT l'orientation EXIF par défaut au rendu ET au drawImage. Une photo
  // « droite » a donc des pixels droits → lue dès la rotation 0 (1 passe, rapide).
  // (createImageBitmap, lui, n'applique PAS l'EXIF → cassait ce cas.)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image non lisible')); };
    img.src = url;
  });
}

/**
 * Fait pivoter l'image entière de `rotationDeg` (0/90/180/270), recadre la bande
 * du bas (là où atterrit la MRZ une fois le document droit) et binarise (Otsu).
 * Retourne un data URL PNG prêt pour tesseract.
 *
 * En essayant les 4 rotations, on couvre : document droit (0), à l'envers (180)
 * et paysage/portrait pivoté (90/270) — sans aucune dépendance externe.
 */
function renderRotatedCrop(img: ImageBitmap | HTMLImageElement, rotationDeg: number, cropFromBottom: number): string {
  const swap = rotationDeg === 90 || rotationDeg === 270;
  const srcW = img.width, srcH = img.height;
  const rotW = swap ? srcH : srcW;
  const rotH = swap ? srcW : srcH;

  // 1) Image entière pivotée sur un canvas hors-écran
  const rot = document.createElement('canvas');
  rot.width = rotW; rot.height = rotH;
  const rctx = rot.getContext('2d')!;
  rctx.translate(rotW / 2, rotH / 2);
  rctx.rotate((rotationDeg * Math.PI) / 180);
  rctx.drawImage(img, -srcW / 2, -srcH / 2);

  // 2) Recadrage de la bande du bas + mise à l'échelle (plafond largeur)
  const cropTop = Math.floor(rotH * (1 - cropFromBottom));
  const cropH   = rotH - cropTop;
  const scale = Math.min(2.5, MAX_CANVAS_W / rotW);
  const w = Math.round(rotW * scale);
  const h = Math.round(cropH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rot, 0, cropTop, rotW, cropH, 0, 0, w, h);

  // 3) Binarisation Otsu
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) & 255]++;
  }
  const thresh = otsuThreshold(hist, w * h);
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum < thresh ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ─── Extraction des lignes MRZ ──────────────────────────────────────────────────

/**
 * Extrait les lignes MRZ depuis le texte brut OCR.
 *
 * Avec le modèle OCRB, le '<' est correctement lu. L'extraction est simple :
 * trouver des lignes de la longueur attendue (44 pour TD3, 30 pour TD1, 36 pour TD2)
 * et vérifier les contraintes structurelles minimales.
 *
 * Contraintes structurelles :
 * - TD3 ligne 1 : commence par P / I / V / A
 * - TD3 ligne 2 : 6 chiffres en [13-18] (DOB) ET 6 chiffres en [21-26] (expiry)
 *   → Ces deux fenêtres en chiffres sont quasi impossibles à satisfaire par hasard.
 */
function extractMrzLines(
  rawText: string,
): { lines: string[]; format: 'TD3' | 'TD1' | 'TD2' } | null {
  console.log('[MRZ] OCR brut:\n', rawText);

  const candidates: string[] = [];

  for (const raw of rawText.split('\n')) {
    // 2+ espaces consécutifs → '<<' (le double-filler MRZ peut être rendu par tesseract
    // comme 2 espaces quand le whitelist ne contient pas d'espace)
    // espace simple restant → supprimé (artefact de séparation de mots)
    // chars non-MRZ → supprimés
    const clean = raw
      .toUpperCase()
      .replace(/[ \t]{2,}/g, '<<')
      .replace(/[ \t]/g, '')
      .replace(/[^A-Z0-9<]/g, '');

    if (clean.length >= 28) {
      candidates.push(clean);
      console.log('[MRZ] candidat ligne:', clean, `(${clean.length} chars)`);
    }
  }

  // ── TD3 : 2 lignes de 44 chars ──────────────────────────────────────────
  {
    const td3 = candidates
      .filter(l => l.length >= 38 && l.length <= 52)
      .map(l => l.length >= 44 ? l.slice(0, 44) : l.padEnd(44, '<'));

    const l1Candidates = td3.filter(l => /^[PIVA]/.test(l));
    const l2Candidates = td3.filter(
      l => /^\d{6}$/.test(l.slice(13, 19)) && /^\d{6}$/.test(l.slice(21, 27)),
    );

    if (l1Candidates.length >= 1 && l2Candidates.length >= 1) {
      const line2 = l2Candidates[0];
      const line1 = l1Candidates.find(l => l !== line2) ?? l1Candidates[0];
      console.log('[MRZ] TD3 détecté');
      return { lines: [line1, line2], format: 'TD3' };
    }
  }

  // ── TD1 : 3 lignes de 30 chars ──────────────────────────────────────────
  {
    const td1 = candidates
      .filter(l => l.length >= 26 && l.length <= 36)
      .map(l => l.length >= 30 ? l.slice(0, 30) : l.padEnd(30, '<'));

    // TD1 ligne 2 : DOB en [0-5], expiry en [8-13]
    const td1L2 = td1.filter(l => /^\d{6}/.test(l) && /^\d{6}$/.test(l.slice(8, 14)));

    if (td1L2.length >= 1 && td1.length >= 3) {
      console.log('[MRZ] TD1 détecté');
      return { lines: td1.slice(0, 3), format: 'TD1' };
    }
  }

  // ── TD2 : 2 lignes de 36 chars ──────────────────────────────────────────
  {
    const td2 = candidates
      .filter(l => l.length >= 32 && l.length <= 42)
      .map(l => l.length >= 36 ? l.slice(0, 36) : l.padEnd(36, '<'));

    const td2L1 = td2.filter(l => /^[PIV]/.test(l));
    const td2L2 = td2.filter(l => /^\d{6}$/.test(l.slice(13, 19)));

    if (td2L1.length >= 1 && td2L2.length >= 1) {
      console.log('[MRZ] TD2 détecté');
      return { lines: [td2L1[0], td2L2[0]], format: 'TD2' };
    }
  }

  // ── Fallback : lignes MRZ concaténées en une seule chaîne ───────────────
  // Certains modèles ou PSM retournent les 2 lignes MRZ collées l'une à l'autre.
  // On essaie de découper une ligne de ~88 chars en deux moitiés de 44.
  {
    const allText = rawText
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9<]/g, '');

    if (allText.length >= 80 && allText.length <= 96) {
      const mid = Math.floor(allText.length / 2);
      for (const cut of [44, mid, 43, 45]) {
        if (cut < 30 || cut > allText.length - 30) continue;
        const h1 = allText.slice(0, cut).padEnd(44, '<');
        const h2 = allText.slice(cut, cut + 44).padEnd(44, '<');
        if (
          /^[PIVA]/.test(h1) &&
          /^\d{6}$/.test(h2.slice(13, 19)) &&
          /^\d{6}$/.test(h2.slice(21, 27))
        ) {
          console.log('[MRZ] TD3 détecté via ligne concaténée, coupure à', cut);
          return { lines: [h1, h2], format: 'TD3' };
        }
      }
    }
  }

  console.warn('[MRZ] Aucun format MRZ reconnu dans le texte OCR');
  return null;
}

// ─── Secours extraction directe des dates (TD3) ────────────────────────────────
//
// Le package 'mrz' met un champ à `null` dès que son propre parseur `throw` —
// notamment si un caractère résiduel non couvert par son autocorrect (B/G/O/I/S/Z
// uniquement) traîne dans la zone date après OCR. Résultat observé en prod : nom,
// prénom et nationalité correctement extraits, mais date de naissance/expiration
// vides alors que la zone MRZ elle-même contient bien 6 chiffres à cet endroit.
//
// On retente donc une extraction tolérante directement depuis la ligne brute
// (même correspondances lettre→chiffre que le package) plutôt que d'abandonner
// dès que son parseur interne échoue.
const OCR_DIGIT_FIX: Record<string, string> = { O: '0', I: '1', B: '8', G: '6', S: '5', Z: '2' };

function fallbackTd3Date(line2: string, start: number): string | null {
  const raw = line2.slice(start, start + 6);
  const digits = raw.split('').map(c => (/[0-9]/.test(c) ? c : (OCR_DIGIT_FIX[c] ?? c))).join('');
  return /^\d{6}$/.test(digits) ? digits : null;
}

// ─── Conversion résultat mrz → MrzData ─────────────────────────────────────────

function toMrzData(result: ReturnType<typeof mrzParse>, td3Line2: string | null): MrzData {
  const f = result.fields;

  // Sex : le package mrz v3 retourne 'male' | 'female' | null (pas 'M'/'F')
  let sex: 'M' | 'F' | 'X' = 'X';
  if (f.sex === 'male')        sex = 'M';
  else if (f.sex === 'female') sex = 'F';

  // Document type
  const code = (f.documentCode ?? '').toUpperCase();
  let document_type = 'travel_document';
  if (code.startsWith('P')) document_type = 'passport';
  else if (/^[IAC]/.test(code)) document_type = 'national_id';
  else if (code.startsWith('V')) document_type = 'visa';

  // Nettoyage des noms (le package retire déjà les '<' mais on sanitise par sécurité)
  const cleanName = (s: string | null | undefined): string | null =>
    s ? s.replace(/<+/g, ' ').replace(/\s+/g, ' ').trim() || null : null;

  // Si le champ mrz est vide (parseur interne ayant `throw`) et qu'on a la ligne
  // brute TD3 sous la main, on retente une extraction tolérante avant d'abandonner.
  const birthRaw  = f.birthDate      ?? (td3Line2 ? fallbackTd3Date(td3Line2, 13) : null);
  const expiryRaw = f.expirationDate ?? (td3Line2 ? fallbackTd3Date(td3Line2, 21) : null);

  return {
    last_name:            cleanName(f.lastName),
    first_name:           cleanName(f.firstName),
    date_of_birth:        mrzDateToISO(birthRaw,  true),
    sex,
    // f.nationality peut être null si ce champ MRZ n'est pas reconnu par l'OCR.
    // Fallback sur issuingState (même pays dans la quasi-totalité des cas).
    nationality_code:     f.nationality || f.issuingState || null,
    document_number:      f.documentNumber   || null,
    issuing_country_code: f.issuingState     || null,
    expiry_date:          mrzDateToISO(expiryRaw, false),
    document_type,
  };
}

// ─── OCR ───────────────────────────────────────────────────────────────────────

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

async function runOcr(
  worker: TesseractWorker,
  image: string,
  psm: '6' | '11',
): Promise<string> {
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    tessedit_pageseg_mode: psm as never,
  });
  const { data: { text, confidence } } = await worker.recognize(image);
  // Log uniquement — pas de seuil bloquant.
  // Le modèle OCRB est entraîné sur des chars parfaits et retourne une confiance
  // plus basse que 'eng' sur des photos mobiles, même quand les lignes MRZ sont
  // parfaitement lisibles. La validation structurelle dans extractMrzLines est
  // le vrai filtre qualité (longueur 44, chiffres aux positions DOB/expiry…).
  console.log(`[MRZ] OCR PSM=${psm}  confiance=${(confidence as number).toFixed(1)}%`);
  return text;
}

// ─── Parsing d'un texte OCR → MrzData ──────────────────────────────────────────

/**
 * Tente d'extraire une fiche MrzData depuis un texte OCR brut.
 * Retourne null si aucune ligne MRZ exploitable (nom de famille au minimum).
 * Partagé par les deux pipelines (OpenCV et crop bas classique).
 */
function parseOcrText(text: string): MrzData | null {
  const extracted = extractMrzLines(text);
  if (!extracted) return null;

  const result   = mrzParse(extracted.lines, { autocorrect: true });
  const td3Line2 = extracted.format === 'TD3' ? extracted.lines[1] : null;
  const data     = toMrzData(result, td3Line2);

  // Validation minimale : au moins le nom de famille (un check digit faux ne
  // doit pas bloquer la saisie si les champs clés sont corrects).
  return data.last_name ? data : null;
}

// ─── API publique ───────────────────────────────────────────────────────────────

/**
 * Chemins CDN explicites — nécessaire en production Vite.
 *
 * Vite ne copie PAS worker.min.js ni les WASM de tesseract.js dans dist/.
 * Sans workerPath/corePath explicites, Tesseract cherche ces fichiers de façon
 * relative au bundle → introuvables → createWorker() rejette avec un objet non-Error
 * → le catch remonte 'Scan échoué'.
 *
 * Solution : pointer vers jsDelivr pour le worker, le core WASM et les modèles.
 * La CSP vercel.json autorise cdn.jsdelivr.net dans connect-src ET worker-src.
 */
export const TESSERACT_VER  = '5.1.1';
export const CDN            = 'https://cdn.jsdelivr.net/npm';
// worker.min.js est copié dans public/ → servi en same-origin → pas de contrainte worker-src
export const WORKER_PATH    = '/worker.min.js';
export const CORE_PATH      = `${CDN}/tesseract.js-core@${TESSERACT_VER}`;
/**
 * Dossier CDN par langue pour les modèles tesseract.js standards (eng, ara, ...).
 *
 * ATTENTION : le package npm générique "tesseract.js-data" n'existe PAS
 * (vérifié sur le registre npm — 404). Le vrai schéma, repris du code source de
 * tesseract.js (worker-script/index.js), est un package scope PAR LANGUE :
 *   https://cdn.jsdelivr.net/npm/@tesseract.js-data/<lang>/4.0.0_best_int/<lang>.traineddata.gz
 * `langPath` doit pointer sur le dossier (sans le nom de fichier) — tesseract
 * ajoute lui-même `/${lang}.traineddata(.gz)`.
 */
export const langDataPath = (lang: string) => `${CDN}/@tesseract.js-data/${lang}/4.0.0_best_int`;
const ENG_LANG_PATH  = langDataPath('eng');
// Modèle bundlé dans public/tessdata/ — servi en same-origin, pas de CDN GitHub.
// Fichier à placer : frontend/public/tessdata/ocrb_int.traineddata (1.4 MB)
// Source : https://cdn.jsdelivr.net/gh/Shreeshrii/tessdata_ocrb@master/ocrb_int.traineddata
const OCRB_LANG_PATH = '/tessdata';
const OCRB_LANG      = 'ocrb_int';

/**
 * Worker OCR mis en cache au niveau module.
 *
 * Le chargement du modèle (~1,4 Mo) + du core WASM prend 3-5 s : le refaire à
 * chaque scan rendait l'opération très lente. On le crée donc UNE fois et on le
 * réutilise (jamais terminé). En cas d'échec de chargement, le cache est vidé
 * pour permettre une nouvelle tentative au scan suivant.
 */
let cachedWorker: Promise<TesseractWorker> | null = null;

function getWorker(report: (pct: number) => void): Promise<TesseractWorker> {
  if (cachedWorker) return cachedWorker;

  cachedWorker = (async () => {
    const logger = (m: { status: string; progress: number }) => {
      if (m.status === 'loading tesseract core')            report(5  + m.progress * 15);
      else if (m.status === 'loading language traineddata') report(20 + m.progress * 20);
      else if (m.status === 'initializing api')             report(40 + m.progress * 8);
    };
    try {
      const w = await createWorker(OCRB_LANG, 3, {
        workerPath: WORKER_PATH, corePath: CORE_PATH, langPath: OCRB_LANG_PATH,
        workerBlobURL: false, gzip: false, logger,
      });
      console.log('[MRZ] Modèle OCRB chargé (mis en cache)');
      return w;
    } catch (e) {
      console.warn('[MRZ] Modèle OCRB indisponible, fallback eng:', e);
      const w = await createWorker('eng', 1, {
        workerPath: WORKER_PATH, corePath: CORE_PATH, langPath: ENG_LANG_PATH,
        workerBlobURL: false, logger,
      });
      console.log('[MRZ] Modèle eng chargé (fallback, mis en cache)');
      return w;
    }
  })();

  cachedWorker.catch(() => { cachedWorker = null; });
  return cachedWorker;
}

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzData> {
  const report = (pct: number) => onProgress?.(Math.min(99, Math.max(0, Math.round(pct))));

  report(5);

  // Worker chargé une seule fois puis réutilisé (voir getWorker).
  const worker = await getWorker(report);

  report(50);

  const img = await loadImage(file);
  // Ordre : droit d'abord (cas courant, EXIF déjà appliqué par <img>), puis à
  // l'envers, puis pivoté. Les 4 orientations couvrent bas/haut/gauche/droite.
  const order = [0, 180, 90, 270];
  let lastError: Error | null = null;

  // Une passe = crop bas de l'image pivotée de `deg`, puis OCR éprouvé.
  const tryOrientations = async (orients: number[], base: number, span: number): Promise<MrzData | null> => {
    const fractions = [0.28, 0.48]; // bande du bas : serrée puis large
    let k = 0;
    const total = orients.length * fractions.length;
    for (const deg of orients) {
      for (const fraction of fractions) {
        report(base + Math.round((k++ / total) * span));
        try {
          const image = renderRotatedCrop(img, deg, fraction);
          const text  = await runOcr(worker, image, '6');
          const data  = parseOcrText(text);
          if (data) {
            console.log(`[MRZ] Succès rotation=${deg}° crop=${fraction}`);
            return data;
          }
          lastError = new Error('Lignes MRZ non détectées dans cette zone');
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[MRZ] rotation=${deg}° crop=${fraction} échoué:`, lastError.message);
        }
      }
    }
    return null;
  };

  {
    // 1) Cas courant : document droit → lu en 1-2 passes.
    let data = await tryOrientations([order[0]], 52, 16);       // 52 → 68
    // 2) Document à l'envers / pivoté.
    if (!data) data = await tryOrientations(order.slice(1), 68, 22); // 68 → 90
    if (data) { report(100); return data; }

    // 3) SECOURS OpenCV — uniquement si toutes les rotations ont raté. Validation
    //    STRICTE (nom + numéro + date de naissance) pour ne jamais renvoyer une
    //    lecture douteuse à la place d'un échec propre (→ saisie manuelle).
    try {
      const candidates = await detectMrzCandidates(file, 6);
      for (let i = 0; i < candidates.length; i++) {
        report(91 + i);
        try {
          const text = await runOcr(worker, candidates[i], '6');
          const d = parseOcrText(text);
          if (d && d.last_name && d.document_number && d.date_of_birth) {
            console.log('[MRZ] Succès via secours OpenCV, candidat', i);
            report(100);
            return d;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }
    } catch (err) {
      console.warn('[MRZ] Secours OpenCV indisponible:', err);
    }
  }
  // NE PAS terminer le worker : il est mis en cache et réutilisé d'un scan à
  // l'autre (c'était le principal coût). L'<img> est libéré par le GC.

  // Toutes tentatives échouées
  const baseMsg = lastError?.message ?? 'Zone MRZ non détectée';
  // Garder seulement la première ligne du message d'erreur (sans les bullets \n)
  const firstLine = baseMsg.split('\n')[0];
  throw new Error(`${firstLine} — reprenez la photo cadrée sur la page du passeport, sans reflet ni marge autour.`);
}

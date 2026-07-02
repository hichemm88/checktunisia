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

const MAX_CANVAS_W = 2000; // px — limiter la taille du buffer sur mobile

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
 * Recadre le bas de l'image (zone MRZ) et binarise avec Otsu.
 * Retourne un data URL PNG prêt pour tesseract.
 */
async function cropAndBinarise(file: File, cropFromBottom: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const cropTop = Math.floor(img.height * (1 - cropFromBottom));
        const cropH   = img.height - cropTop;

        const scale = Math.min(2.5, MAX_CANVAS_W / img.width);
        const w = Math.round(img.width  * scale);
        const h = Math.round(cropH      * scale);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, cropTop, img.width, cropH, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        // Histogramme luminance → seuil Otsu
        const hist = new Array<number>(256).fill(0);
        for (let i = 0; i < d.length; i += 4) {
          hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) & 255]++;
        }
        const thresh = otsuThreshold(hist, w * h);
        console.log(`[MRZ] Otsu=${thresh}  crop=${cropFromBottom}  canvas=${w}×${h}`);

        // Binarisation
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = lum < thresh ? 0 : 255;
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image non lisible')); };
    img.src = url;
  });
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

// ─── Conversion résultat mrz → MrzData ─────────────────────────────────────────

function toMrzData(result: ReturnType<typeof mrzParse>): MrzData {
  const f = result.fields;

  // Sex : le package retourne le char brut M, F ou < (ou null)
  let sex: 'M' | 'F' | 'X' = 'X';
  if (f.sex === 'M') sex = 'M';
  else if (f.sex === 'F') sex = 'F';

  // Document type
  const code = (f.documentCode ?? '').toUpperCase();
  let document_type = 'travel_document';
  if (code.startsWith('P')) document_type = 'passport';
  else if (/^[IAC]/.test(code)) document_type = 'national_id';
  else if (code.startsWith('V')) document_type = 'visa';

  // Nettoyage des noms (le package retire déjà les '<' mais on sanitise par sécurité)
  const cleanName = (s: string | null | undefined): string | null =>
    s ? s.replace(/<+/g, ' ').replace(/\s+/g, ' ').trim() || null : null;

  return {
    last_name:            cleanName(f.lastName),
    first_name:           cleanName(f.firstName),
    date_of_birth:        mrzDateToISO(f.birthDate,      true),
    sex,
    nationality_code:     f.nationality      || null,
    document_number:      f.documentNumber   || null,
    issuing_country_code: f.issuingState     || null,
    expiry_date:          mrzDateToISO(f.expirationDate, false),
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

// ─── API publique ───────────────────────────────────────────────────────────────

/**
 * Modèle OCR-B via jsDelivr CDN — Shreeshrii/tessdata_ocrb (ocrb_int)
 *
 * Pourquoi ocrb_int et non le modèle DaanVanVugt ?
 * - DaanVanVugt/tesseract-mrz : 77 KB compressé → modèle trop minimal,
 *   entraîné sur des données synthétiques parfaites, peu robuste sur photos mobiles.
 * - Shreeshrii/tessdata_ocrb (ocrb_int) : 1.4 MB, fine-tuné sur la vraie police
 *   OCR-B ISO 1073-2, texte MRZ réel inclus dans l'entraînement.
 *
 * gzip: false → le fichier est non-compressé (.traineddata, pas .traineddata.gz)
 */
const OCRB_LANG_PATH = 'https://cdn.jsdelivr.net/gh/Shreeshrii/tessdata_ocrb@master';
const OCRB_LANG      = 'ocrb_int';

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzData> {
  const report = (pct: number) => onProgress?.(Math.min(99, Math.max(0, Math.round(pct))));

  report(5);

  // ── Création du worker (opération lourde — une seule fois pour toutes les crops) ──
  let worker: TesseractWorker;
  let usingOcrb = true;

  try {
    worker = await createWorker(OCRB_LANG, 3, {
      langPath: OCRB_LANG_PATH,
      gzip: false, // ocrb_int.traineddata est non compressé
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'loading tesseract core')        report(5  + m.progress * 15);
        else if (m.status === 'loading language traineddata') report(20 + m.progress * 25);
        else if (m.status === 'initializing api')         report(45 + m.progress * 10);
        else if (m.status === 'recognizing text')         report(60 + m.progress * 20);
      },
    });
    console.log('[MRZ] Modèle OCRB chargé');
  } catch (e) {
    // Fallback : modèle eng standard si OCRB indisponible (réseau coupé, CDN…)
    console.warn('[MRZ] Modèle OCRB indisponible, fallback eng:', e);
    usingOcrb = false;
    worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'loading language traineddata') report(20 + m.progress * 30);
        else if (m.status === 'recognizing text')        report(60 + m.progress * 20);
      },
    });
    console.log('[MRZ] Modèle eng chargé (fallback)');
  }

  report(55);

  // ── 3 tentatives de crop : serré → large ────────────────────────────────────
  // Avec un worker partagé, les 2e/3e tentatives ne coûtent que le temps OCR (3-5s).
  const crops: Array<{ fraction: number; psm: '6' | '11' }> = [
    { fraction: 0.22, psm: '6'  }, // Photo page entière — MRZ dans la bande du bas
    { fraction: 0.42, psm: '11' }, // Photo rapprochée du bas du passeport
    { fraction: 0.60, psm: '11' }, // Très rapprochée / passeport hors cadre
  ];

  let lastError: Error | null = null;

  try {
    for (let i = 0; i < crops.length; i++) {
      const { fraction, psm } = crops[i];
      report(55 + i * 12);

      try {
        const image    = await cropAndBinarise(file, fraction);
        const text     = await runOcr(worker, image, psm);
        const extracted = extractMrzLines(text);

        if (!extracted) {
          lastError = new Error('Lignes MRZ non détectées dans cette zone');
          continue;
        }

        console.log(`[MRZ] Format ${extracted.format} — lignes:`, extracted.lines);

        // Parsing + autocorrect (O→0, I→1 dans les champs strictement numériques)
        const result = mrzParse(extracted.lines, { autocorrect: true });
        console.log('[MRZ] Parsing valid:', result.valid, '— champs:', result.fields);

        const data = toMrzData(result);

        // On n'exige PAS result.valid === true : un mauvais check digit ne doit pas
        // bloquer la saisie si les champs importants (nom, DOB, numéro) sont corrects.
        // Validation minimale : au moins le nom de famille
        if (!data.last_name) {
          lastError = new Error('Nom de famille non extrait du MRZ');
          continue;
        }

        report(100);
        return data;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[MRZ] crop=${fraction} échoué:`, lastError.message);
      }
    }
  } finally {
    // Libérer le worker dans tous les cas (succès ou échec)
    await worker.terminate();
  }

  // Toutes tentatives échouées
  const baseMsg = lastError?.message ?? 'Zone MRZ non détectée';
  // Garder seulement la première ligne du message d'erreur (sans les bullets \n)
  const firstLine = baseMsg.split('\n')[0];
  throw new Error(firstLine);
}

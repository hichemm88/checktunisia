/**
 * MRZ Scanner — réécriture complète (v3), passe perf/robustesse ultérieure (v4)
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
 *
 * 4. v4 — vitesse et taux de repli vision :
 *    → Le texte OCR brut → MrzData vit désormais dans mrzTextParsing.ts, pur et
 *      testé unitairement (aucune dépendance navigateur) — c'est la partie qui
 *      décide « confiant » ou « repli vision », donc la plus sensible.
 *    → La source est redimensionnée UNE fois avant les rotations (au lieu de
 *      pivoter/recadrer une photo 12 Mpx à chaque tentative) : même qualité
 *      OCR (le crop final est de toute façon plafonné à MAX_CANVAS_W), 4-5×
 *      moins de pixels à manipuler par tentative sur un téléphone récent.
 *    → OpenCV (déskew + CLAHE, gère les 4 orientations en un seul appel, sans
 *      OCR) est préchargé en tâche de fond dès le lancement du scan et essayé
 *      JUSTE APRÈS la passe rapide (rotation 0°), avant les 3 rotations à
 *      l'aveugle — il traite la vraie cause d'échec la plus fréquente
 *      (reflet/contraste/inclinaison) au lieu de la contourner par force brute.
 *    → Budget de temps global sur la boucle de tentatives : au-delà, on rend
 *      la main (lecture partielle ou échec) plutôt que d'épuiser les ~14 passes
 *      possibles — la vision prend le relais plus vite dans le pire cas.
 */

import { createWorker } from 'tesseract.js';
import { detectMrzCandidates } from './mrzZoneDetect';
import { loadOpenCv } from './opencvLoader';
import { type MrzData, otsuThreshold, parseOcrText } from './mrzTextParsing';

export type { MrzData };

// ─── Preprocessing image ────────────────────────────────────────────────────────

const MAX_CANVAS_W = 1300; // px — la MRZ reste lisible et l'OCR est bien plus rapide
// Plafond de la SOURCE avant rotations. Généreux au-dessus de MAX_CANVAS_W : le
// crop final downscale de toute façon à MAX_CANVAS_W, donc aucune perte de
// qualité OCR, mais chaque rotation/recadrage manipule ~4-5× moins de pixels
// qu'une photo de téléphone brute (souvent 3000-4000 px de long côté).
const SOURCE_MAX_EDGE = 1800;

type ImageSource = HTMLImageElement | HTMLCanvasElement;

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
 * Plafonne le grand côté de la source à `maxEdge` (aucun agrandissement).
 *
 * Fait UNE fois, avant les rotations : sans ça, une photo 3000-4000 px de
 * téléphone était repivotée + recadrée en entier à CHAQUE tentative (jusqu'à
 * 8 fois côté OCR local, une 9e côté détection OpenCV) — pour un gain de
 * qualité nul, le crop final étant de toute façon plafonné à MAX_CANVAS_W.
 */
function capSourceEdge(img: HTMLImageElement, maxEdge: number): ImageSource {
  const longEdge = Math.max(img.width, img.height);
  if (longEdge <= maxEdge) return img;

  const scale = maxEdge / longEdge;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Fait pivoter l'image entière de `rotationDeg` (0/90/180/270), recadre la bande
 * du bas (là où atterrit la MRZ une fois le document droit) et binarise (Otsu).
 * Retourne un data URL PNG prêt pour tesseract.
 *
 * En essayant les 4 rotations, on couvre : document droit (0), à l'envers (180)
 * et paysage/portrait pivoté (90/270) — sans aucune dépendance externe.
 */
function renderRotatedCrop(img: ImageSource, rotationDeg: number, cropFromBottom: number): string {
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
  // parfaitement lisibles. La validation structurelle + les check digits sont
  // le vrai filtre qualité (voir mrzTextParsing.ts).
  console.log(`[MRZ] OCR PSM=${psm}  confiance=${(confidence as number).toFixed(1)}%`);
  return text;
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

export type MrzScanResult = MrzData & {
  /** Les chiffres de contrôle MRZ passent → lecture fiable (pas besoin de vision). */
  confident: boolean;
};

// Budget de temps pour la boucle de tentatives OCR (hors chargement du worker,
// déjà compté à part). Passé ce délai, on arrête d'essayer D'AUTRES
// rotations/candidats et on rend la main — mieux vaut basculer plus tôt sur
// Claude vision (qui a son propre timeout serveur) que de laisser l'appareil
// enchaîner jusqu'à ~14 passes OCR sans limite.
//
// 12s, pas 6.5s : le chunk OpenCV (~3,9 Mo gzippés) doit être TÉLÉCHARGÉ sur le
// réseau réel de l'appareil avant que `detectMrzCandidates` puisse tourner —
// un test en Node local (npm déjà sur disque, aucune latence réseau) ne peut
// pas voir ce coût. Avec 6.5s, ce téléchargement suffisait à lui seul à
// dépasser le budget en 4G moyenne, et le secours OpenCV — la partie qui
// corrige vraiment les photos difficiles — n'obtenait alors JAMAIS sa chance
// de passer un seul candidat par l'OCR, malgré le préchargement en tâche de
// fond dès le lancement du scan.
const ATTEMPT_BUDGET_MS = 12_000;

export async function scanMrz(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MrzScanResult> {
  const report = (pct: number) => onProgress?.(Math.min(99, Math.max(0, Math.round(pct))));

  report(5);

  // Précharge OpenCV en tâche de fond dès le lancement du scan : son WASM
  // (~9 Mo) était jusqu'ici demandé seulement en tout dernier recours, ce qui
  // ajoutait un téléchargement + une init au moment où l'utilisateur attendait
  // déjà le plus longtemps. En le lançant ici (en parallèle du chargement du
  // worker Tesseract, réseau non-bloquant pour le CPU), il a de bonnes chances
  // d'être prêt quand on en a besoin. Best-effort : une erreur ici ne doit
  // jamais faire échouer le scan, `detectMrzCandidates` gère l'absence d'OpenCV.
  void loadOpenCv().catch(() => {});

  // Worker chargé une seule fois puis réutilisé (voir getWorker).
  const worker = await getWorker(report);

  report(50);

  const img = capSourceEdge(await loadImage(file), SOURCE_MAX_EDGE);
  // Ordre : droit d'abord (cas courant, EXIF déjà appliqué par <img>), puis à
  // l'envers, puis pivoté. Les 4 orientations couvrent bas/haut/gauche/droite.
  const order = [0, 180, 90, 270];
  let lastError: Error | null = null;
  // Meilleure lecture PARSABLE mais dont les check digits échouent : on la garde
  // en dernier recours (renvoyée avec confident=false → l'appelant tentera la
  // vision, et retombera dessus si la vision est indisponible).
  let partial: MrzData | null = null;

  const attemptDeadline = Date.now() + ATTEMPT_BUDGET_MS;
  const budgetExpired = () => Date.now() > attemptDeadline;

  // Une passe = crop bas de l'image pivotée de `deg`, puis OCR éprouvé.
  // Renvoie une lecture CONFIANTE (check digits OK), sinon null en mémorisant
  // la première lecture douteuse dans `partial`.
  const tryOrientations = async (orients: number[], base: number, span: number): Promise<MrzData | null> => {
    const fractions = [0.28, 0.48]; // bande du bas : serrée puis large
    let k = 0;
    const total = orients.length * fractions.length;
    for (const deg of orients) {
      for (const fraction of fractions) {
        if (budgetExpired()) {
          console.warn('[MRZ] budget de temps dépassé, arrêt des tentatives');
          return null;
        }
        report(base + Math.round((k++ / total) * span));
        try {
          const image = renderRotatedCrop(img, deg, fraction);
          const text  = await runOcr(worker, image, '6');
          const parsed = parseOcrText(text);
          if (parsed?.confident) {
            console.log(`[MRZ] Lecture fiable rotation=${deg}° crop=${fraction}`);
            return parsed.data;
          }
          if (parsed && !partial) partial = parsed.data; // lecture douteuse mémorisée
          lastError = new Error('Lignes MRZ non détectées dans cette zone');
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[MRZ] rotation=${deg}° crop=${fraction} échoué:`, lastError.message);
        }
      }
    }
    return null;
  };

  // Secours OpenCV : déskew + CLAHE, couvre les 4 orientations en un seul appel
  // (pas d'OCR dans la détection elle-même, donc bien moins coûteux que des
  // rotations à l'aveugle). On n'accepte qu'une lecture FIABLE (check digits OK)
  // avec numéro de document ET date de naissance présents.
  //
  // PAS de re-vérification du budget dans la boucle ci-dessous (seulement
  // avant de LANCER detectMrzCandidates) : une fois le chargement WASM et la
  // détection payés — le plus gros du coût, et réseau, donc hors de notre
  // contrôle — jeter les candidats déjà obtenus sans même tenter l'OCR dessus
  // gâcherait ce travail pour rien. On va au bout des candidats trouvés.
  const tryOpenCv = async (base: number, span: number, maxCandidates: number): Promise<MrzData | null> => {
    if (budgetExpired()) return null;
    try {
      const candidates = await detectMrzCandidates(file, maxCandidates);
      for (let i = 0; i < candidates.length; i++) {
        report(base + Math.round((i / Math.max(1, candidates.length)) * span));
        try {
          const text = await runOcr(worker, candidates[i], '6');
          const parsed = parseOcrText(text);
          if (parsed?.confident && parsed.data.document_number && parsed.data.date_of_birth) {
            console.log('[MRZ] Lecture fiable via secours OpenCV, candidat', i);
            return parsed.data;
          }
          if (parsed && !partial) partial = parsed.data;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }
    } catch (err) {
      console.warn('[MRZ] Secours OpenCV indisponible:', err);
    }
    return null;
  };

  {
    // 1) Cas courant : document droit → lu en 1-2 passes.
    let data = await tryOrientations([order[0]], 52, 12);       // 52 → 64

    // 2) Secours OpenCV — déskew + contraste, avant de pivoter à l'aveugle :
    //    traite directement la cause d'échec la plus fréquente (reflet,
    //    inclinaison, faible contraste) plutôt que de la contourner par force
    //    brute. Positionné ici (plutôt qu'en tout dernier recours) parce que
    //    l'acceptation exige déjà une lecture confiante — aucun risque de
    //    préférer une lecture de moins bonne qualité à celle des rotations.
    // 6, not 4: each detected band now yields 2 crop variants (tight +
    // upward-extended, see mrzZoneDetect.ts) — need enough headroom for both
    // variants of the winning band to survive the maxCandidates cut.
    if (!data) data = await tryOpenCv(64, 14, 6);               // 64 → 78

    // 3) Document à l'envers / pivoté — dernier recours pour les cas que la
    //    détection de bande OpenCV aurait manqués (contours non exploitables).
    if (!data) data = await tryOrientations(order.slice(1), 78, 18); // 78 → 96

    if (data) { report(100); return { ...data, confident: true }; }
  }
  // NE PAS terminer le worker : il est mis en cache et réutilisé d'un scan à
  // l'autre (c'était le principal coût). L'<img> est libéré par le GC.

  // Aucune lecture fiable, mais une lecture douteuse existe → on la renvoie
  // marquée non confiante (l'appelant tentera la vision d'abord).
  if (partial) { report(100); return { ...partial, confident: false }; }

  // Rien de parsable du tout → échec (l'appelant bascule sur la vision).
  const baseMsg = lastError?.message ?? 'Zone MRZ non détectée';
  const firstLine = baseMsg.split('\n')[0];
  throw new Error(`${firstLine} — reprenez la photo cadrée sur la page du passeport, sans reflet ni marge autour.`);
}

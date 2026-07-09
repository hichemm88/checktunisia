/**
 * MRZ zone detection & normalisation with OpenCV.js.
 *
 * The legacy scanner assumed the MRZ band sat at the bottom of an upright photo.
 * This module removes that assumption: it locates the machine-readable band
 * wherever it is (top / bottom / left / right), at any 90° orientation, deskews
 * it, boosts contrast (CLAHE), binarises it (Otsu) and hands OCR a clean, level,
 * correctly-oriented strip — dramatically improving read rates on real photos.
 *
 * Pipeline (classic MRZ localisation, adapted from ICAO/9303 OCR practice):
 *   1. Try 4 whole-image rotations (0/90/180/270). MRZ text is horizontal in
 *      exactly one (or two, for 180°) of them; the morphology below only fires
 *      on horizontal character rows, so the right orientation self-selects.
 *   2. Grayscale → blackhat (dark glyphs on light page) → Sobel-x → close →
 *      Otsu → close with a wide kernel to merge the 2–3 MRZ lines into one blob.
 *   3. Contour whose bounding box is very wide (aspect ≫ 1) and spans most of the
 *      width is the MRZ band. `minAreaRect` gives its skew → warpAffine deskews.
 *   4. CLAHE + Otsu on the deskewed strip → PNG data URL for tesseract.
 *
 * Everything is defensive: any failure returns fewer/no candidates and the
 * caller falls back to the proven bottom-crop pipeline. All Mats are freed.
 */

import { loadOpenCv } from './opencvLoader';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cv = any;
type Mat = any;

interface Candidate { score: number; url: string }

// Detection runs on a downscaled copy for speed; crops are taken from this too
// (upscaled for OCR). 900px is plenty to localise the band on a phone photo.
const DETECT_WIDTH = 900;
// Upscale factor applied to the final MRZ strip before OCR — OCR-B likes big glyphs.
const OCR_UPSCALE = 2.0;

/** Load a File into a canvas, capping the long edge to `maxEdge` px. */
function fileToCanvas(file: File, maxEdge: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image non lisible')); };
    img.src = url;
  });
}

/** Deskew + crop the given (skewed) bounding rect from a grayscale Mat. */
function extractDeskewedStrip(cv: Cv, gray: Mat, rotatedRect: any): HTMLCanvasElement | null {
  const angleRaw = rotatedRect.angle;
  const size = rotatedRect.size;
  let w = size.width;
  let h = size.height;

  // OpenCV's minAreaRect angle convention: normalise so the strip ends up wide.
  let angle = angleRaw;
  if (w < h) { [w, h] = [h, w]; angle = angleRaw + 90; }
  if (w < 1 || h < 1) return null;

  const center = new cv.Point(rotatedRect.center.x, rotatedRect.center.y);
  const M = cv.getRotationMatrix2D(center, angle, 1);
  const rotated = new cv.Mat();
  const dsize = new cv.Size(gray.cols, gray.rows);
  cv.warpAffine(gray, rotated, M, dsize, cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar());

  // Pad the crop a little so no glyph edge is clipped.
  const padX = Math.round(h * 0.15);
  const padY = Math.round(h * 0.25);
  const cw = Math.min(gray.cols, Math.round(w) + padX * 2);
  const ch = Math.min(gray.rows, Math.round(h) + padY * 2);
  const x = Math.max(0, Math.round(center.x - cw / 2));
  const y = Math.max(0, Math.round(center.y - ch / 2));
  const rw = Math.min(cw, gray.cols - x);
  const rh = Math.min(ch, gray.rows - y);

  let out: HTMLCanvasElement | null = null;
  if (rw > 10 && rh > 6) {
    const roi = rotated.roi(new cv.Rect(x, y, rw, rh));

    // Upscale for OCR.
    const big = new cv.Mat();
    cv.resize(roi, big, new cv.Size(0, 0), OCR_UPSCALE, OCR_UPSCALE, cv.INTER_CUBIC);

    // CLAHE (adaptive contrast) then Otsu binarisation.
    const clahe = cv.createCLAHE(2.0, new cv.Size(8, 8));
    const eq = new cv.Mat();
    clahe.apply(big, eq);
    const bin = new cv.Mat();
    cv.threshold(eq, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    const canvas = document.createElement('canvas');
    cv.imshow(canvas, bin);
    out = canvas;

    roi.delete(); big.delete(); eq.delete(); bin.delete(); clahe.delete();
  }

  rotated.delete(); M.delete();
  return out;
}

/** Detect MRZ-band candidates inside one (already-oriented) BGR/RGBA Mat. */
function detectBandsInMat(cv: Cv, src: Mat, limit: number): Candidate[] {
  const out: Candidate[] = [];

  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blur = new cv.Mat();
  cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0);

  const rectKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(13, 5));
  const sqKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(21, 21));

  const blackhat = new cv.Mat();
  cv.morphologyEx(blur, blackhat, cv.MORPH_BLACKHAT, rectKernel);

  const gradX = new cv.Mat();
  cv.Sobel(blackhat, gradX, cv.CV_32F, 1, 0, -1);
  cv.convertScaleAbs(gradX, gradX);
  cv.normalize(gradX, gradX, 0, 255, cv.NORM_MINMAX);
  gradX.convertTo(gradX, cv.CV_8U);

  const closed = new cv.Mat();
  cv.morphologyEx(gradX, closed, cv.MORPH_CLOSE, rectKernel);
  const thresh = new cv.Mat();
  cv.threshold(closed, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, sqKernel);
  cv.erode(thresh, thresh, cv.Mat.ones(3, 3, cv.CV_8U), new cv.Point(-1, -1), 2);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const imgW = src.cols;
  const imgH = src.rows;

  const scored: { score: number; rect: any }[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const br = cv.boundingRect(c);
    const ar = br.width / Math.max(1, br.height);
    const coverage = br.width / imgW;
    const bandHeightRatio = br.height / imgH;

    // MRZ band: a wide, short blob spanning most of the width.
    if (ar >= 4 && coverage >= 0.55 && bandHeightRatio <= 0.35 && br.height >= 8) {
      const rr = cv.minAreaRect(c);
      // Prefer bands nearer the top or bottom edge (typical MRZ placement),
      // but don't hard-exclude the middle.
      const cy = br.y + br.height / 2;
      const edgeBias = 1 + Math.abs(cy - imgH / 2) / (imgH / 2) * 0.25;
      const score = coverage * ar * edgeBias;
      scored.push({ score, rect: rr });
    }
    c.delete();
  }

  scored.sort((a, b) => b.score - a.score);
  for (const s of scored.slice(0, limit)) {
    const canvas = extractDeskewedStrip(cv, gray, s.rect);
    if (canvas) out.push({ score: s.score, url: canvas.toDataURL('image/png') });
  }

  gray.delete(); blur.delete(); rectKernel.delete(); sqKernel.delete();
  blackhat.delete(); gradX.delete(); closed.delete(); thresh.delete();
  contours.delete(); hierarchy.delete();

  return out;
}

/**
 * Return up to `maxCandidates` normalised MRZ-strip data URLs, best first,
 * gathered across all four 90° orientations. Empty array on any failure.
 */
export async function detectMrzCandidates(file: File, maxCandidates = 6): Promise<string[]> {
  let cv: Cv;
  try {
    cv = await loadOpenCv();
  } catch (e) {
    console.warn('[MRZ] OpenCV indisponible, fallback pipeline classique:', e);
    return [];
  }

  let baseCanvas: HTMLCanvasElement;
  try {
    baseCanvas = await fileToCanvas(file, DETECT_WIDTH * 1.6);
  } catch {
    return [];
  }

  const orientations: Array<number | null> = [
    null,
    cv.ROTATE_90_CLOCKWISE,
    cv.ROTATE_180,
    cv.ROTATE_90_COUNTERCLOCKWISE,
  ];

  const all: Candidate[] = [];

  for (const rot of orientations) {
    let src: Mat | null = null;
    try {
      src = cv.imread(baseCanvas);
      if (rot !== null) {
        const r = new cv.Mat();
        cv.rotate(src, r, rot);
        src.delete();
        src = r;
      }
      all.push(...detectBandsInMat(cv, src, 2));
    } catch (e) {
      console.warn('[MRZ] détection orientation échouée:', e);
    } finally {
      if (src) src.delete();
    }
  }

  all.sort((a, b) => b.score - a.score);
  const urls = all.slice(0, maxCandidates).map((c) => c.url);
  console.log(`[MRZ] OpenCV: ${urls.length} bande(s) MRZ candidate(s) détectée(s)`);
  return urls;
}

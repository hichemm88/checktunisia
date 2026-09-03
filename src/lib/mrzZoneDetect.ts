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
import { dlog, dwarn } from './mrzDebug';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cv = any;
type Mat = any;

interface Candidate { score: number; url: string }

// Detection runs on a downscaled copy for speed; crops are taken from this too
// (upscaled for OCR). 900px is plenty to localise the band on a phone photo.
const DETECT_WIDTH = 900;
// Upscale factor applied to the final MRZ strip before OCR — OCR-B likes big glyphs.
const OCR_UPSCALE = 2.0;
// The positional fallback strip (see extractPositionalStrip) covers a taller
// band than a tight single-line crop — its glyphs are relatively smaller in
// the source pixels, and 2.0× wasn't enough: verified against a real photo
// that exhibits this fallback's exact trigger condition, only 3.0× (not 2.0×)
// reached a confident, check-digit-verified read; 2.0× stayed structurally
// close but never passed.
const POSITIONAL_UPSCALE = 3.0;

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

/**
 * Deskew + crop the given (skewed) bounding rect from a grayscale Mat, offset
 * vertically by `verticalOffsetPx` in the source image's pixel space (0 = the
 * detected band itself; negative = that many pixels above it — the caller
 * derives this from the band's `boundingRect` height, NOT from this rect's
 * own — see the comment at the call site for why that distinction matters).
 *
 * The contour finder isolates ONE MRZ line reliably (almost always the
 * bottom one — a passport's upper text/photo/security print tends to melt
 * the top line into one big undifferentiated blob that the wide-short-band
 * filter correctly rejects, leaving only the bottom line as its own contour).
 * Verified against real passport photos: a SINGLE crop trying to cover both
 * the detected band and the adjacent line above it (wider padding, or an
 * asymmetric bottom-anchored crop — both tried) reliably degrades that
 * adjacent line's OCR quality, even though it reads perfectly when cropped
 * on its own with the exact same tight, proven parameters used for the
 * anchor band. So each candidate line gets the SAME simple, tight crop,
 * just repositioned — no crop ever tries to cover more than one line — and
 * the caller (mrzScanner.ts) recombines whichever candidates' texts pair up
 * into a full MRZ record.
 */
function extractDeskewedStrip(cv: Cv, gray: Mat, rotatedRect: any, verticalOffsetPx: number): HTMLCanvasElement | null {
  const angleRaw = rotatedRect.angle;
  const size = rotatedRect.size;
  let w = size.width;
  let h = size.height;

  // OpenCV's minAreaRect angle convention: normalise so the strip ends up wide.
  let angle = angleRaw;
  if (w < h) { [w, h] = [h, w]; angle = angleRaw + 90; }
  if (w < 1 || h < 1) return null;

  const center = new cv.Point(rotatedRect.center.x, rotatedRect.center.y + verticalOffsetPx);
  const M = cv.getRotationMatrix2D(center, angle, 1);
  const rotated = new cv.Mat();
  const dsize = new cv.Size(gray.cols, gray.rows);
  cv.warpAffine(gray, rotated, M, dsize, cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar());

  // Pad the crop a little so no glyph edge is clipped — same tight padding
  // regardless of offset, since that's what reads cleanly (see above).
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
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
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

/**
 * Positional fallback crop: a horizontal band taken directly from `gray` by
 * position ([topFrac, botFrac] of its height), no contour, no deskew — the
 * band is assumed already axis-aligned within this (already-oriented) Mat.
 *
 * Exists for a real failure mode found on dense bio-page passport scans
 * (multiple printed fields, portrait, hologram all close together): the
 * blackhat/close morphology in `detectBandsInMat` merges the ENTIRE printed
 * page into one blob — correctly rejected by the wide/short band-shape
 * filter since it spans nearly the full page — and the MRZ line inside it
 * never gets its own contour, so zero candidates come out at all. Verified
 * against two real French passport photos exhibiting exactly this (both had
 * `scored.length === 0` in every orientation). MRZ is always the bottom of
 * an upright document page (ICAO 9303); each orientation already tried here
 * covers what "bottom" means for that rotation, so a plain positional crop
 * near the bottom edge recovers it without needing a contour at all.
 */
function extractPositionalStrip(cv: Cv, gray: Mat, topFrac: number, botFrac: number): HTMLCanvasElement | null {
  const imgH = gray.rows;
  const imgW = gray.cols;
  const y = Math.max(0, Math.round(imgH * topFrac));
  const y2 = Math.min(imgH, Math.round(imgH * botFrac));
  const rh = y2 - y;
  if (rh < 10) return null;

  const roi = gray.roi(new cv.Rect(0, y, imgW, rh));

  const big = new cv.Mat();
  cv.resize(roi, big, new cv.Size(0, 0), POSITIONAL_UPSCALE, POSITIONAL_UPSCALE, cv.INTER_CUBIC);

  const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
  const eq = new cv.Mat();
  clahe.apply(big, eq);
  const bin = new cv.Mat();
  cv.threshold(eq, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

  const canvas = document.createElement('canvas');
  cv.imshow(canvas, bin);

  roi.delete(); big.delete(); eq.delete(); bin.delete(); clahe.delete();
  return canvas;
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

  const scored: { score: number; rect: any; pitchPx: number }[] = [];
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
      // Line-to-line pitch estimate for the "above" crop: `minAreaRect`'s
      // height is a TIGHT fit around the ink itself (~half of boundingRect's
      // here, verified on a real photo: 23px vs 45px for the same line) — a
      // pitch offset scaled from it undershoots by roughly half and lands
      // the crop on a mix of blank space and glyph edges instead of the
      // adjacent line, degrading OCR badly. `boundingRect`'s height already
      // includes the usual glyph margin and is what the working pitch
      // (empirically ~0.9× it) was actually measured against.
      scored.push({ score, rect: rr, pitchPx: br.height });
    }
    c.delete();
  }

  scored.sort((a, b) => b.score - a.score);
  for (const s of scored.slice(0, limit)) {
    // The detected band itself (almost always the digit line, TD3 line 2)
    // AND a second, equally tight crop one full line-pitch above it (almost
    // always the name line, TD3 line 1) — verified against a real photo to
    // read PERFECTLY on its own at exactly 1× the line pitch (0.9× and 0.85×
    // were tried and measurably worse — under-shooting the pitch mixes in
    // trailing pixels of line 2, degrading the back half of the reading).
    // The caller pairs whichever candidates' texts together complete a full
    // MRZ record.
    const atBand = extractDeskewedStrip(cv, gray, s.rect, 0);
    if (atBand) out.push({ score: s.score, url: atBand.toDataURL('image/png') });
    const above = extractDeskewedStrip(cv, gray, s.rect, -s.pitchPx);
    if (above) out.push({ score: s.score, url: above.toDataURL('image/png') });
  }

  // Zero real bands survived the shape filter for this orientation → try the
  // positional fallback (see extractPositionalStrip). Two overlapping bottom
  // windows: neither alone generalised across the two real photos that
  // exposed this (0.72 gave a byte-perfect single-candidate read on one,
  // 0.78 the other) — the caller's existing multi-candidate combine already
  // recombines whichever one actually pairs with a confident line 1 + line 2.
  if (scored.length === 0) {
    for (const topFrac of [0.72, 0.78]) {
      const strip = extractPositionalStrip(cv, gray, topFrac, 1.0);
      if (strip) out.push({ score: 0, url: strip.toDataURL('image/png') });
    }
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
    dwarn('[MRZ] OpenCV indisponible, fallback pipeline classique:', e instanceof Error ? e.message : String(e));
    return [];
  }

  let baseCanvas: HTMLCanvasElement;
  try {
    baseCanvas = await fileToCanvas(file, DETECT_WIDTH * 1.6);
  } catch {
    return [];
  }

  const orientations: Array<{ name: string; rot: number | null }> = [
    { name: '0°',   rot: null },
    { name: '90°',  rot: cv.ROTATE_90_CLOCKWISE },
    { name: '180°', rot: cv.ROTATE_180 },
    { name: '270°', rot: cv.ROTATE_90_COUNTERCLOCKWISE },
  ];

  const all: Candidate[] = [];

  for (const { name, rot } of orientations) {
    let src: Mat | null = null;
    try {
      src = cv.imread(baseCanvas);
      if (rot !== null) {
        const r = new cv.Mat();
        cv.rotate(src, r, rot);
        src.delete();
        src = r;
      }
      const found = detectBandsInMat(cv, src, 2);
      dlog(`[MRZ] OpenCV orientation=${name}: ${found.length} candidat(s)`);
      all.push(...found);
    } catch (e) {
      dwarn(`[MRZ] détection orientation=${name} échouée:`, e instanceof Error ? e.message : String(e));
    } finally {
      if (src) src.delete();
    }
  }

  all.sort((a, b) => b.score - a.score);
  const urls = all.slice(0, maxCandidates).map((c) => c.url);
  dlog(`[MRZ] OpenCV: ${urls.length} bande(s) MRZ candidate(s) retenue(s) (sur ${all.length} au total)`);
  return urls;
}

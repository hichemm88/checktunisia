/**
 * Prétraitement image pour le scan CIN — détection/recadrage de la carte,
 * redressement (deskew), amélioration de contraste.
 *
 * Pas de dépendance lourde (pas d'opencv.js) : tout est fait à la main sur
 * ImageData/Canvas, en pur JS, pour rester gratuit et léger côté client.
 *
 * Technique de détection de carte :
 * 1. Sous-échantillonnage (rapide) + niveaux de gris + seuil d'Otsu.
 * 2. Composantes connexes (flood fill) sur le masque clair ET sur le masque
 *    sombre (on ne sait pas a priori si la carte est plus claire ou plus
 *    sombre que le fond) → on garde la plus grande composante plausible.
 * 3. Orientation de la composante via les moments d'image (axe principal),
 *    équivalent simplifié d'un minAreaRect — beaucoup plus simple à
 *    implémenter qu'un convex hull + rotating calipers, suffisant pour un
 *    blob globalement rectangulaire comme une carte.
 * 4. Rotation + recadrage appliqués à l'image PLEINE RÉSOLUTION (la détection
 *    tourne sur une copie réduite pour la vitesse, le résultat est remis à
 *    l'échelle avant application).
 */

export interface CardDetection {
  cx: number; cy: number;       // centre de la carte, coordonnées image source (pleine résolution)
  angleRad: number;             // angle à corriger (rotation à appliquer = -angleRad)
  width: number; height: number; // dimensions de la carte redressée, pleine résolution
  areaRatio: number;             // fraction de l'image occupée par la carte détectée (diagnostic)
}

// ─── Gris + histogramme ─────────────────────────────────────────────────────

export function toGrayscale(imgData: ImageData): Uint8ClampedArray {
  const { data, width, height } = imgData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

export function otsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;

  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];

  let sumBg = 0, wBg = 0, maxVar = -1, threshold = 127;
  for (let t = 0; t < 256; t++) {
    wBg += hist[t];
    if (wBg === 0) continue;
    const wFg = total - wBg;
    if (wFg === 0) break;
    sumBg += t * hist[t];
    const mBg = sumBg / wBg;
    const mFg = (sumAll - sumBg) / wFg;
    const v = wBg * wFg * (mBg - mFg) ** 2;
    if (v > maxVar) { maxVar = v; threshold = t; }
  }
  return threshold;
}

// ─── Composantes connexes + moments (flood fill itératif, avec labels) ─────

interface ComponentMoments {
  label: number;
  count: number;
  sumX: number; sumY: number; sumXX: number; sumYY: number; sumXY: number;
}

/**
 * Étiquette (flood fill 4-connexe) toutes les composantes du masque foreground
 * (gray[i] > threshold si brighterIsForeground, sinon gray[i] <= threshold) et
 * retourne leurs moments + le tableau de labels (0 = pas foreground, sinon
 * numéro de composante). Le tableau de labels permet un 2e passage précis
 * (étendue tournée réelle) sur la composante gagnante, sans avoir à stocker
 * la liste de tous ses pixels.
 */
function labelComponents(
  gray: Uint8ClampedArray, width: number, height: number,
  threshold: number, brighterIsForeground: boolean,
): { labels: Int32Array; components: ComponentMoments[] } {
  const total = width * height;
  const labels = new Int32Array(total); // 0 = non assigné
  const isFg = (idx: number) => (brighterIsForeground ? gray[idx] > threshold : gray[idx] <= threshold);

  const components: ComponentMoments[] = [];
  const stack = new Int32Array(total);
  let nextLabel = 1;

  for (let start = 0; start < total; start++) {
    if (labels[start] !== 0 || !isFg(start)) continue;

    const label = nextLabel++;
    let count = 0, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = label;

    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % width;
      const y = (idx / width) | 0;

      count++; sumX += x; sumY += y; sumXX += x * x; sumYY += y * y; sumXY += x * y;

      if (x > 0)          { const n = idx - 1;     if (labels[n] === 0 && isFg(n)) { labels[n] = label; stack[sp++] = n; } }
      if (x < width - 1)  { const n = idx + 1;     if (labels[n] === 0 && isFg(n)) { labels[n] = label; stack[sp++] = n; } }
      if (y > 0)          { const n = idx - width; if (labels[n] === 0 && isFg(n)) { labels[n] = label; stack[sp++] = n; } }
      if (y < height - 1) { const n = idx + width; if (labels[n] === 0 && isFg(n)) { labels[n] = label; stack[sp++] = n; } }
    }

    components.push({ label, count, sumX, sumY, sumXX, sumYY, sumXY });
  }

  return { labels, components };
}

/** Angle de l'axe principal (radians) via les moments centraux de la composante. */
function orientationAngle(c: ComponentMoments): number {
  const n = c.count;
  const muXX = c.sumXX / n - (c.sumX / n) ** 2;
  const muYY = c.sumYY / n - (c.sumY / n) ** 2;
  const muXY = c.sumXY / n - (c.sumX / n) * (c.sumY / n);
  return 0.5 * Math.atan2(2 * muXY, muXX - muYY);
}

/**
 * Étendue RÉELLE (pas une approximation) de la composante `label` dans le
 * repère tourné à `angle` — parcourt tous les pixels du masque, précis mais
 * ne coûte qu'un passage supplémentaire sur l'image réduite.
 */
function realRotatedExtent(
  labels: Int32Array, width: number, height: number, label: number,
  cx: number, cy: number, angle: number,
): { w: number; h: number } {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (labels[y * width + x] !== label) continue;
      const dx = x - cx, dy = y - cy;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
  }
  return { w: maxU - minU, h: maxV - minV };
}

const CARD_RATIO = 85.6 / 53.98; // format ID-1 (CIN, carte bancaire...) ≈ 1.586
const MIN_AREA_RATIO = 0.08;      // la carte doit occuper au moins 8% de l'image
const MAX_AREA_RATIO = 0.85;      // au-delà, c'est probablement le fond, pas la carte
const MAX_ASPECT_DEVIATION = 0.30; // tolérance autour de CARD_RATIO (perspective, marge de detection)
const MIN_FILL_RATIO = 0.55;      // pixels de la composante / aire de son rectangle tourné
                                   // — un rectangle plein (carte) est proche de 1 ;
                                   // un fond irrégulier/texturé est nettement plus bas.

interface CardCandidate {
  label: number; labels: Int32Array; count: number;
  cx: number; cy: number; angle: number; w: number; h: number; fillRatio: number;
  bright: boolean;
}

function evaluateCandidates(
  gray: Uint8ClampedArray, width: number, height: number,
  threshold: number, brighterIsForeground: boolean,
): CardCandidate[] {
  const { labels, components } = labelComponents(gray, width, height, threshold, brighterIsForeground);
  const totalArea = width * height;
  const out: CardCandidate[] = [];

  // On ne garde que les composantes assez grandes pour être candidates (évite
  // de calculer l'étendue tournée — coûteuse — sur du bruit).
  const sizeable = components
    .filter((c) => c.count / totalArea >= MIN_AREA_RATIO && c.count / totalArea <= MAX_AREA_RATIO)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // au plus les 3 plus grandes, largement suffisant

  for (const c of sizeable) {
    const cx = c.sumX / c.count, cy = c.sumY / c.count;
    const angle = orientationAngle(c);
    const { w, h } = realRotatedExtent(labels, width, height, c.label, cx, cy, angle);
    if (w <= 0 || h <= 0) continue;
    const fillRatio = c.count / (w * h);
    out.push({ label: c.label, labels, count: c.count, cx, cy, angle, w, h, fillRatio, bright: brighterIsForeground });
  }
  return out;
}

/**
 * Détecte la carte dans une image réduite (rapide) et retourne sa position/angle
 * en coordonnées de CETTE image réduite (à remettre à l'échelle par l'appelant).
 * Retourne null si aucune région plausible n'est trouvée (l'appelant doit alors
 * garder l'image telle quelle plutôt que de bloquer l'utilisateur).
 */
export function detectCard(gray: Uint8ClampedArray, width: number, height: number): CardDetection | null {
  const threshold = otsuThreshold(gray);

  const candidates = [
    ...evaluateCandidates(gray, width, height, threshold, true),
    ...evaluateCandidates(gray, width, height, threshold, false),
  ];
  if (candidates.length === 0) return null;

  const plausible = candidates.filter((cand) => {
    const long = Math.max(cand.w, cand.h);
    const short = Math.min(cand.w, cand.h);
    if (short <= 0) return false;
    const ratio = long / short;
    const deviation = Math.abs(ratio - CARD_RATIO) / CARD_RATIO;
    return deviation <= MAX_ASPECT_DEVIATION && cand.fillRatio >= MIN_FILL_RATIO;
  });

  // Une carte tunisienne est blanche/claire dans l'immense majorité des cas :
  // à candidats plausibles multiples, on préfère celui détecté sur le masque
  // clair. Entre plusieurs candidats plausibles de même polarité, le plus grand.
  let best: CardCandidate | null = null;
  if (plausible.length > 0) {
    const brightOnes = plausible.filter((c) => c.bright);
    const pool = brightOnes.length > 0 ? brightOnes : plausible;
    best = pool.sort((a, b) => b.count - a.count)[0];
  }

  // Rien de plausible en forme/densité : on n'invente pas un recadrage — mieux
  // vaut retomber sur l'image entière (fiabilité réduite mais pas de crop faux).
  if (!best) return null;

  let { angle, w, h } = best;
  const { cx, cy } = best;

  // Normalise en paysage (la CIN est toujours plus large que haute)
  if (h > w) {
    angle += Math.PI / 2;
    [w, h] = [h, w];
  }

  return { cx, cy, angleRad: angle, width: w, height: h, areaRatio: best.count / (width * height) };
}

// ─── Rotation + recadrage sur l'image pleine résolution ────────────────────

/**
 * Applique la détection (faite sur une image réduite) à `sourceCanvas` (pleine
 * résolution) et retourne un nouveau canvas contenant la carte redressée et
 * recadrée, mis à l'échelle à `outputWidth`.
 */
export function rotateCropToCanvas(
  sourceCanvas: HTMLCanvasElement,
  detection: CardDetection,
  scaleToFullRes: number, // (largeur image pleine résolution) / (largeur image réduite utilisée pour la détection)
  outputWidth: number,
  paddingFrac = 0.06,
): HTMLCanvasElement {
  const cx = detection.cx * scaleToFullRes;
  const cy = detection.cy * scaleToFullRes;
  const w = detection.width * scaleToFullRes * (1 + paddingFrac * 2);
  const h = detection.height * scaleToFullRes * (1 + paddingFrac * 2);

  const outputHeight = Math.round(outputWidth * (h / w));

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.translate(outputWidth / 2, outputHeight / 2);
  ctx.rotate(-detection.angleRad);
  ctx.scale(outputWidth / w, outputHeight / h);
  ctx.translate(-cx, -cy);
  ctx.drawImage(sourceCanvas, 0, 0);

  return canvas;
}

// ─── Amélioration de contraste ──────────────────────────────────────────────

/** Étirement de contraste par percentile (clip 1%/99% par défaut) — en place. */
export function contrastStretch(imgData: ImageData, lowPct = 1, highPct = 99): void {
  const gray = toGrayscale(imgData);
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  const lowCount = total * (lowPct / 100);
  const highCount = total * (highPct / 100);

  let cum = 0, lo = 0, hi = 255;
  for (let t = 0; t < 256; t++) { cum += hist[t]; if (cum >= lowCount) { lo = t; break; } }
  cum = 0;
  for (let t = 255; t >= 0; t--) { cum += hist[t]; if (cum >= total - highCount) { hi = t; break; } }
  if (hi <= lo) return;

  const scale = 255 / (hi - lo);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      d[i + c] = Math.max(0, Math.min(255, (d[i + c] - lo) * scale));
    }
  }
}

/**
 * Seuillage adaptatif (moyenne locale) — pour les zones à binariser franchement
 * (chiffres). Utilise une image intégrale pour calculer la moyenne locale en
 * O(1) par pixel. En place, produit une image noir/blanc.
 */
export function adaptiveThreshold(imgData: ImageData, blockSize = 25, C = 8): void {
  const { width, height } = imgData;
  const gray = toGrayscale(imgData);

  // Image intégrale (summed-area table)
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  const half = Math.floor(blockSize / 2);
  const d = imgData.data;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half), y1 = Math.min(height - 1, y + half);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half), x1 = Math.min(width - 1, x + half);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = integral[(y1 + 1) * (width + 1) + (x1 + 1)]
        - integral[y0 * (width + 1) + (x1 + 1)]
        - integral[(y1 + 1) * (width + 1) + x0]
        + integral[y0 * (width + 1) + x0];
      const localMean = sum / area;
      const idx = (y * width + x) * 4;
      const v = gray[y * width + x] > localMean - C ? 255 : 0;
      d[idx] = d[idx + 1] = d[idx + 2] = v;
    }
  }
}

/**
 * Prétraitement client avant envoi au scan CIN :
 *  - conversion HEIC → JPEG (heic2any) pour les photos iPhone/WhatsApp,
 *  - compression : largeur max 1600 px, JPEG qualité 0.7.
 *
 * L'image reste en mémoire ; aucun stockage (localStorage/IndexedDB) — conformité
 * INPDP (voir §6 du document d'implémentation).
 */

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.7;

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif');
}

async function heicToJpeg(file: File): Promise<Blob> {
  // Import dynamique : heic2any est lourd, on ne le charge que si nécessaire.
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY });
  return Array.isArray(out) ? out[0] : out;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_unreadable'));
    };
    img.src = url;
  });
}

/**
 * Convertit (si HEIC) puis compresse l'image en un `Blob` JPEG ≤ 1600 px de large,
 * qualité 0.7. Lève `Error('image_unreadable')` si le fichier n'est pas une image.
 */
export async function prepareCinImage(file: File | Blob): Promise<Blob> {
  let source: Blob = file;
  if (file instanceof File && isHeic(file)) {
    source = await heicToJpeg(file);
  }

  const img = await loadImage(source);
  const scale = Math.min(1, MAX_WIDTH / img.width) || 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('image_unreadable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('image_unreadable');
  return blob;
}

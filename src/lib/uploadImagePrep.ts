/**
 * MODULE PROVISOIRE — relais WhatsApp (à retirer après homologation MI).
 * Voir PROMPT-CLAUDE-CODE-QAYED-AUTORITE.md
 *
 * Réduit l'image du document AVANT téléversement : max 1600 px, JPEG q80
 * (~300 Ko). Une photo de téléphone brute (3-12 Mo) dépassait la limite
 * d'upload PHP du backend (rejet silencieux → fiche de police sans photo,
 * cas « RUSTUM ») et ralentissait l'envoi sur le Wi-Fi d'hôtel. 1600 px reste
 * parfaitement lisible pour une pièce d'identité — même cible que la copie
 * compressée stockée côté backend.
 *
 * Best-effort : si le navigateur ne sait pas décoder le format (HEIC hors
 * Safari…), on renvoie l'original tel quel — le backend a son propre filet.
 */
export async function downscaleForUpload(input: Blob, maxDim = 1600, quality = 0.8): Promise<File> {
  const asFile = (b: Blob) =>
    b instanceof File ? b : new File([b], 'document.jpg', { type: b.type || 'image/jpeg' });

  try {
    const bitmap = await createImageBitmap(input);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));

    // Déjà petite et dans un format sûr : rien à faire.
    if (scale >= 1 && input.size <= 1_500_000 && (input.type === 'image/jpeg' || input.type === 'image/png')) {
      bitmap.close();
      return asFile(input);
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality),
    );

    return new File([blob], 'document.jpg', { type: 'image/jpeg' });
  } catch {
    return asFile(input);
  }
}

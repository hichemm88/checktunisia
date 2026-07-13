/**
 * Client du scan CIN — POST multipart **même origine** vers la fonction serverless
 * Vercel `/api/scan/cin` (et non le backend Railway ; l'image ne transite jamais
 * par le backend métier). L'auth réutilise le Bearer token Qayed.
 */

import { useAuthStore } from '@/stores/authStore';
import { CinScanResponse } from '@/types';

export class CinScanError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'CinScanError';
  }
}

/**
 * Envoie l'image (déjà compressée) à `/api/scan/cin` et renvoie l'extraction.
 * `propertyId` scope le rate limit et le lookup client existant côté serveur.
 */
export async function scanCin(image: Blob, propertyId: string): Promise<CinScanResponse> {
  const { token } = useAuthStore.getState();
  if (!token) throw new CinScanError('Non authentifié', 'unauthorized', 401);

  const form = new FormData();
  form.append('image', image, 'cin.jpg');
  form.append('propertyId', propertyId);

  let res: Response;
  try {
    res = await fetch('/api/scan/cin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new CinScanError('Réseau indisponible', 'network_error');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const code = (body && body.error) || 'extraction_failed';
    throw new CinScanError(code, code, res.status);
  }

  return (await res.json()) as CinScanResponse;
}

/**
 * Repli Claude vision pour la MRZ passeport — appelé uniquement quand l'OCR
 * local (tesseract) échoue. POST multipart même origine vers /api/scan/mrz.
 */

import { useAuthStore } from '@/stores/authStore';
import { CinScanError } from '@/api/scanCin';

export interface MrzVisionResult {
  document_type: 'passport';
  document_number: string | null;
  last_name: string | null;
  first_name: string | null;
  date_of_birth: string | null;
  expiry_date: string | null;
  sex: 'M' | 'F' | 'X' | null;
  nationality_code: string | null;
  issuing_country_code: string | null;
  latencyMs: number;
}

export async function scanMrzVision(image: Blob, propertyId: string): Promise<MrzVisionResult> {
  const { token } = useAuthStore.getState();
  if (!token) throw new CinScanError('Non authentifié', 'unauthorized', 401);

  const form = new FormData();
  form.append('image', image, 'passport.jpg');
  form.append('propertyId', propertyId);

  let res: Response;
  try {
    res = await fetch('/api/scan/mrz', {
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

  return (await res.json()) as MrzVisionResult;
}

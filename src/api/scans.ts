import { api } from '@/lib/api';
import { type ScanStatus } from '@/types';

export const scansApi = {
  upload: (checkInId: string, file: File, side: 'front' | 'back' = 'front') => {
    const form = new FormData();
    form.append('passport_image', file);
    form.append('document_side', side);
    return api.post<{ data: ScanStatus }>(`/hotel/check-ins/${checkInId}/scans`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data);
  },

  status: (_checkInId: string, scanId: string) =>
    api.get<{ data: ScanStatus }>(`/hotel/scans/${scanId}/status`)
      .then((r) => r.data.data),
};

import { api } from '@/lib/api';

/**
 * Telemetrie best-effort des scans OCR MRZ locaux (tesseract, cote navigateur).
 *
 * L'OCR MRZ local est gratuit et ne passe jamais par le serveur : ce beacon sert
 * uniquement a le compter pour le graphe comparatif "OCR MRZ local vs Claude
 * vision" du dashboard admin. Metadata-only (etablissement + operateur cote
 * backend) : aucune donnee voyageur n'est envoyee. Fire-and-forget, erreurs
 * avalees : ne doit jamais bloquer ni casser un scan.
 */
export function reportLocalMrzScan(latencyMs?: number): void {
  const body = latencyMs != null && Number.isFinite(latencyMs) ? { latency_ms: Math.round(latencyMs) } : {};
  api.post('/hotel/scan-events/mrz-local', body).catch(() => {
    /* telemetrie best-effort — jamais bloquant */
  });
}

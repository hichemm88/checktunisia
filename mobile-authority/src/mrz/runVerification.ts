import { MrzData, VerificationResult } from '../api/types';
import { verifyIdentity, verifyByDocument } from '../api/services';
import { captureLocation } from '../lib/geo';
import { recordAudit } from '../api/auditStore';
import { OfflineError, DEMO_MODE } from '../api/client';
import { ACTIVE_ALERTS } from '../api/seed';
import { simulateCriticalAlert } from '../notifications/push';

export interface VerificationOutcome {
  result?: VerificationResult;
  offline?: boolean;
  hasLocation: boolean;
}

function fullName(r: VerificationResult): string {
  return [r.person.first_name, r.person.last_name].filter(Boolean).join(' ') || '—';
}

/**
 * Exécute une vérification (scan MRZ ou saisie manuelle) :
 * 1. appel réseau temps réel (aucun cache watchlist),
 * 2. capture de la géolocalisation (permission demandée au 1er scan — §9.4),
 * 3. trace dans le journal d'audit (F2 / F6).
 * Hors connexion → { offline: true }, jamais de résultat périmé.
 */
export async function runVerification(input: MrzData | { documentNumber: string }): Promise<VerificationOutcome> {
  try {
    const result =
      'documentNumber' in input
        ? await verifyByDocument(input.documentNumber)
        : await verifyIdentity(input);

    // Géolocalisation de la vérification (traçabilité).
    const loc = await captureLocation();

    recordAudit({
      action: 'verify',
      result: result.state,
      subject: fullName(result),
      has_location: loc != null,
      place_label: loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : null,
    });

    // Scénario de démo (§8) : un match rouge déclenche la push critique envoyée
    // à l'agent de garde de la zone (F5). En prod, c'est le serveur qui la pousse.
    if (DEMO_MODE && result.state === 'rouge') {
      const alert = ACTIVE_ALERTS.find((a) => a.severity === 'critique');
      if (alert) {
        simulateCriticalAlert(alert.id, alert.establishment_name).catch(() => {});
      }
    }

    return { result, hasLocation: loc != null };
  } catch (e) {
    if (e instanceof OfflineError) return { offline: true, hasLocation: false };
    throw e;
  }
}

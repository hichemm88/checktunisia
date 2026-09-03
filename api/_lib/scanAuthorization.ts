/**
 * Autorisation d'un scan IA — la porte devant l'appel payant.
 *
 * ── Ce qui n'allait pas ─────────────────────────────────────────────────
 *
 * `/api/scan/cin` et `/api/scan/mrz` appellent Claude vision, facturé à
 * l'appel. Elles ne vérifiaient que la FORME du jeton porteur :
 *
 *     if (!/^Bearer\s+.+/i.test(authorization)) { 401 }
 *
 * `Bearer x` passait. Le jeton n'était réellement utilisé qu'APRÈS l'appel,
 * pour attribuer le coût. Trois conséquences, toutes payantes :
 *
 *  1. l'URL est publique, sur le domaine de l'application : n'importe qui
 *     pouvait consommer le budget Anthropic sans posséder de compte ;
 *  2. `propertyId` étant choisi par l'appelant, la dépense était imputée à
 *     l'établissement de son choix — l'écran « Coûts IA » aurait affiché ces
 *     montants comme la consommation réelle d'un client ;
 *  3. le plafond de débit vit en mémoire de l'instance serverless ET se
 *     décline par `propertyId` : en faire varier la valeur suffisait à le
 *     contourner. Il protégeait donc exactement rien.
 *
 * ── Pourquoi ce contrôle échoue FERMÉ ───────────────────────────────────
 *
 * Backend injoignable, mal configuré, en erreur : on refuse. C'est un choix,
 * et il coûte quelque chose — une panne du backend suspend le scan assisté.
 *
 * L'alternative coûterait davantage. Un contrôle d'authentification qui
 * s'efface quand le vérificateur ne répond pas n'est pas un contrôle : il
 * suffirait de saturer le backend pour rouvrir un budget sans plafond. Et une
 * variable d'environnement oubliée au déploiement rouvrirait la porte en
 * silence, ce qui est précisément la façon dont ce trou est né.
 *
 * La saisie manuelle reste disponible dans tous les cas : l'enregistrement
 * d'un voyageur ne dépend jamais du scan.
 */

const DEFAULT_API_URL = 'https://checktunisia-backend-production.up.railway.app/api/v1';
const TIMEOUT_MS = 4_000;

export type ScanAuthorizationOutcome =
  | { ok: true; userId: string | null }
  | { ok: false; status: 401 | 403 | 503; reason: string };

export interface ScanAuthorizationParams {
  /** En-tête `Authorization` complet, tel que reçu (« Bearer … »). */
  authorization: string;
  /** Établissement revendiqué par l'appelant. */
  propertyId: string;
  /** Injection pour les tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Le compte porteur de ce jeton peut-il scanner pour cet établissement ?
 *
 * Ne lève jamais : toute anomalie devient un refus typé, pour que l'appelant
 * n'ait aucun moyen de « rater » l'erreur et de poursuivre.
 */
export async function authorizeScan(
  params: ScanAuthorizationParams,
): Promise<ScanAuthorizationOutcome> {
  const { authorization, propertyId } = params;

  if (!/^Bearer\s+.+/i.test(authorization)) {
    return { ok: false, status: 401, reason: 'malformed_authorization' };
  }
  if (!propertyId) {
    return { ok: false, status: 403, reason: 'missing_property_id' };
  }

  const base = (process.env.QAYED_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
  const url = `${base}/hotel/scan-authorization?property_id=${encodeURIComponent(propertyId)}`;
  const doFetch = params.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await doFetch(url, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        // Le backend résout le locataire depuis cet en-tête ; le fournir
        // évite qu'il retombe sur un autre établissement du même compte.
        'X-Property-Id': propertyId,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.status === 401) {
      return { ok: false, status: 401, reason: 'invalid_token' };
    }
    // 403 (rôle, ou établissement hors périmètre), 404, 422 : dans tous les
    // cas l'appelant n'a pas démontré son droit à dépenser.
    if (!response.ok) {
      return { ok: false, status: 403, reason: `denied_${response.status}` };
    }

    const body = (await response.json().catch(() => null)) as
      | { data?: { user_id?: string | null } }
      | null;

    return { ok: true, userId: body?.data?.user_id ?? null };
  } catch (error) {
    // Réseau, délai dépassé, DNS : on ne sait pas si l'appelant a le droit,
    // donc on refuse. Voir l'en-tête de ce fichier.
    const reason = (error as Error)?.name === 'AbortError' ? 'verifier_timeout' : 'verifier_unreachable';
    return { ok: false, status: 503, reason };
  } finally {
    clearTimeout(timer);
  }
}

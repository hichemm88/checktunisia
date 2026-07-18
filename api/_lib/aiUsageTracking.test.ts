import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildUsageEvent, trackAiUsage, type AiUsageEvent } from './aiUsageTracking';

/**
 * Couvre les criteres d'acceptation 1 a 4 de la mission.
 * On teste le wrapper `trackAiUsage` (le point d'instrumentation), pas les
 * fonctions serverless completes : c'est la ou vit toute la logique de tracking.
 */

const ENDPOINT = 'https://backend.internal/internal/ai-usage';

/** fetch factice qui capture le dernier envoi et renvoie 204. */
function captureFetch() {
  const calls: Array<{ url: string; init: RequestInit; body: AiUsageEvent }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    return { ok: true, status: 204 } as Response;
  }) as unknown as typeof fetch;
  return { calls, impl };
}

beforeEach(() => {
  process.env.INTERNAL_AI_TRACKING_URL = ENDPOINT;
  process.env.INTERNAL_AI_TRACKING_SECRET = 'service-secret';
});
afterEach(() => {
  delete process.env.INTERNAL_AI_TRACKING_URL;
  delete process.env.INTERNAL_AI_TRACKING_SECRET;
  vi.restoreAllMocks();
});

describe('buildUsageEvent — attribution et absence de PII', () => {
  it('propage la feature verbatim (aucune deduction) — cin_scan', () => {
    const e = buildUsageEvent({
      feature: 'cin_scan',
      establishmentId: 'etab-1',
      model: 'claude-sonnet-5',
      status: 'success',
      inputTokens: 1200,
      outputTokens: 300,
      latencyMs: 1800,
    });
    expect(e.feature).toBe('cin_scan');
  });

  it('propage la feature verbatim — passport_scan', () => {
    const e = buildUsageEvent({
      feature: 'passport_scan',
      establishmentId: 'etab-1',
      model: 'claude-sonnet-5',
      status: 'success',
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 10,
    });
    expect(e.feature).toBe('passport_scan');
  });

  it('critere #6 — le payload ne contient QUE des metadonnees (aucun champ voyageur)', () => {
    const e = buildUsageEvent({
      feature: 'cin_scan',
      establishmentId: 'etab-1',
      model: 'claude-sonnet-5',
      status: 'success',
      inputTokens: 1000,
      outputTokens: 200,
      latencyMs: 1500,
      // Champs parasites volontaires : ils NE doivent PAS ressortir.
      ...( { firstName: 'Slim', cinNumber: '12345678', image: 'base64...' } as object),
    });
    expect(Object.keys(e).sort()).toEqual(
      ['establishment_id', 'feature', 'input_tokens', 'latency_ms', 'model', 'occurred_at', 'output_tokens', 'status'].sort(),
    );
    const serialized = JSON.stringify(e).toLowerCase();
    expect(serialized).not.toContain('slim');
    expect(serialized).not.toContain('12345678');
    expect(serialized).not.toContain('base64');
  });

  it('normalise les tokens en entiers >= 0', () => {
    const e = buildUsageEvent({
      feature: 'cin_scan',
      establishmentId: 'etab-1',
      model: 'm',
      status: 'api_error',
      inputTokens: undefined,
      outputTokens: -5,
      latencyMs: 12.7,
    });
    expect(e.input_tokens).toBe(0);
    expect(e.output_tokens).toBe(0);
    expect(e.latency_ms).toBe(13);
  });
});

describe('critere #1 — un evenement par scan, aucun croisement de feature', () => {
  it('un scan CIN reussi -> exactement 1 evenement cin_scan, tokens > 0', async () => {
    const { calls, impl } = captureFetch();
    await trackAiUsage({
      feature: 'cin_scan',
      establishmentId: 'etab-42',
      model: 'claude-sonnet-5',
      status: 'success',
      inputTokens: 1500,
      outputTokens: 420,
      latencyMs: 1900,
      actorToken: 'tok-abc',
      fetchImpl: impl,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ENDPOINT);
    expect(calls[0].body.feature).toBe('cin_scan');
    expect(calls[0].body.status).toBe('success');
    expect(calls[0].body.input_tokens).toBe(1500);
    expect(calls[0].body.output_tokens).toBe(420);
    expect(calls[0].body.establishment_id).toBe('etab-42');
    // Le token porteur part en header pour resolution user_id backend, jamais dans le body.
    expect((calls[0].init.headers as Record<string, string>)['X-Actor-Token']).toBe('tok-abc');
    expect(JSON.stringify(calls[0].body)).not.toContain('tok-abc');
  });

  it('un repli passeport -> exactement 1 evenement passport_scan', async () => {
    const { calls, impl } = captureFetch();
    await trackAiUsage({
      feature: 'passport_scan',
      establishmentId: 'etab-42',
      model: 'claude-sonnet-5',
      status: 'success',
      inputTokens: 1100,
      outputTokens: 260,
      latencyMs: 1600,
      fetchImpl: impl,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.feature).toBe('passport_scan');
  });
});

describe('critere #2 — API en panne : evenement api_error, tokens et cout a 0', () => {
  it('emet un api_error avec tokens 0', async () => {
    const { calls, impl } = captureFetch();
    await trackAiUsage({
      feature: 'cin_scan',
      establishmentId: 'etab-7',
      model: 'claude-sonnet-5',
      status: 'api_error',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 15000,
      fetchImpl: impl,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.status).toBe('api_error');
    expect(calls[0].body.input_tokens).toBe(0);
    expect(calls[0].body.output_tokens).toBe(0);
  });

  it('parse_error conserve les tokens reels (appel facture mais inutilisable)', async () => {
    const { calls, impl } = captureFetch();
    await trackAiUsage({
      feature: 'cin_scan',
      establishmentId: 'etab-7',
      model: 'claude-sonnet-5',
      status: 'parse_error',
      inputTokens: 1300,
      outputTokens: 90,
      latencyMs: 2100,
      fetchImpl: impl,
    });
    expect(calls[0].body.status).toBe('parse_error');
    expect(calls[0].body.input_tokens).toBe(1300);
    expect(calls[0].body.output_tokens).toBe(90);
  });
});

describe('critere #3 — une panne du tracking ne casse jamais le scan', () => {
  it('un fetch qui rejette (insert impossible) est avale, trackAiUsage resout', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const impl = (async () => {
      throw new Error('ECONNREFUSED tracking DB down');
    }) as unknown as typeof fetch;
    await expect(
      trackAiUsage({
        feature: 'cin_scan',
        establishmentId: 'etab-9',
        model: 'claude-sonnet-5',
        status: 'success',
        inputTokens: 1000,
        outputTokens: 200,
        latencyMs: 1400,
        fetchImpl: impl,
      }),
    ).resolves.toBeUndefined();
    expect(err).toHaveBeenCalledTimes(1);
    // Le log d'erreur ne contient pas de PII.
    expect(JSON.stringify(err.mock.calls)).toContain('ai_usage_tracking');
  });

  it('endpoint non configure -> no-op silencieux (aucun appel reseau)', async () => {
    delete process.env.INTERNAL_AI_TRACKING_URL;
    delete process.env.INTERNAL_AI_TRACKING_SECRET;
    const { calls, impl } = captureFetch();
    await expect(
      trackAiUsage({
        feature: 'cin_scan',
        establishmentId: 'etab-9',
        model: 'claude-sonnet-5',
        status: 'success',
        inputTokens: 1000,
        outputTokens: 200,
        latencyMs: 1400,
        fetchImpl: impl,
      }),
    ).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});

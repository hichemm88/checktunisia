import { describe, it, expect, vi } from 'vitest';
import { authorizeScan } from './scanAuthorization';

/**
 * La porte devant l'appel payé.
 *
 * Ce qui est vérifié ici n'est pas « la fonction appelle bien le backend »,
 * mais les quatre façons dont elle pourrait laisser passer quelqu'un qui n'a
 * pas le droit de dépenser.
 */

const ok = (body: unknown = { data: { user_id: 'u-1' } }) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

const status = (code: number) =>
  vi.fn(async () => new Response('{}', { status: code })) as unknown as typeof fetch;

describe('autorisation de scan', () => {
  it('laisse passer un jeton valide sur son propre établissement', async () => {
    const result = await authorizeScan({
      authorization: 'Bearer vrai-jeton',
      propertyId: 'p-1',
      fetchImpl: ok(),
    });

    expect(result).toEqual({ ok: true, userId: 'u-1' });
  });

  it('refuse un jeton que le backend ne reconnaît pas', async () => {
    // C'est le cas qui était grand ouvert : « Bearer x » déclenchait un appel
    // Claude facturé.
    const result = await authorizeScan({
      authorization: 'Bearer x',
      propertyId: 'p-1',
      fetchImpl: status(401),
    });

    expect(result).toEqual({ ok: false, status: 401, reason: 'invalid_token' });
  });

  it('refuse un établissement qui n\'appartient pas à l\'appelant', async () => {
    // Sans cela, la dépense restait imputable à l'établissement de son choix :
    // l'écran « Coûts IA » aurait présenté ces montants comme la consommation
    // réelle d'un client.
    const result = await authorizeScan({
      authorization: 'Bearer vrai-jeton',
      propertyId: 'etablissement-du-voisin',
      fetchImpl: status(403),
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ status: 403 });
  });

  it('refuse sans même appeler le backend quand l\'en-tête est malformé', async () => {
    const spy = vi.fn();
    const result = await authorizeScan({
      authorization: 'Basic abc',
      propertyId: 'p-1',
      fetchImpl: spy as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: false, status: 401, reason: 'malformed_authorization' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('échoue FERMÉ quand le vérificateur est injoignable', async () => {
    /*
     * Le choix qui compte. Un contrôle d'authentification qui s'efface quand
     * le vérificateur ne répond pas n'est pas un contrôle : il suffirait de
     * saturer le backend pour rouvrir un budget sans plafond.
     */
    const result = await authorizeScan({
      authorization: 'Bearer vrai-jeton',
      propertyId: 'p-1',
      fetchImpl: vi.fn(async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: false, status: 503, reason: 'verifier_unreachable' });
  });

  it('transmet le jeton et l\'établissement au vérificateur', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));

    await authorizeScan({
      authorization: 'Bearer jeton-42',
      propertyId: 'p-9',
      fetchImpl: spy as unknown as typeof fetch,
    });

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('property_id=p-9');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-42');
    // L'en-tête de locataire évite que le backend retombe sur un autre
    // établissement du même compte.
    expect((init.headers as Record<string, string>)['X-Property-Id']).toBe('p-9');
  });

  it('accepte une réponse sans user_id plutôt que de la rejeter', async () => {
    // Le champ sert au suivi des coûts, pas à l'autorisation : son absence ne
    // doit pas bloquer un scan légitime.
    const result = await authorizeScan({
      authorization: 'Bearer vrai-jeton',
      propertyId: 'p-1',
      fetchImpl: ok({ data: {} }),
    });

    expect(result).toEqual({ ok: true, userId: null });
  });
});

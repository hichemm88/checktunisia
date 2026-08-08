import { describe, it, expect } from 'vitest';
import { scrubEvent, scrubBreadcrumb } from './sentry';

/**
 * Ces tests protègent une garantie, pas une fonctionnalité : rien de ce qui
 * identifie un voyageur ne doit sortir du navigateur vers le suivi d'erreurs.
 *
 * Les écrans de saisie de fiche sont ceux qui plantent le plus — ce sont aussi
 * ceux qui ont un nom, une date de naissance et un numéro de document à
 * l'écran au moment du plantage.
 */
describe('filtrage des événements Sentry', () => {
  it("supprime le corps de requête, les cookies et la query string", () => {
    const event = scrubEvent({
      request: {
        url: 'https://qayed.tn/authority/search?last_name=Mathlouthi&document_number=12345678',
        query_string: 'last_name=Mathlouthi&document_number=12345678',
        data: { first_name: 'Mohamed', document_number: '12345678' },
        cookies: { session: 'abc' },
      },
      extra: { formValues: { last_name: 'Mathlouthi' } },
    });

    const serialized = JSON.stringify(event);

    expect(serialized).not.toContain('Mathlouthi');
    expect(serialized).not.toContain('12345678');
    expect(event.request?.url).toBe('https://qayed.tn/authority/search');
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.extra).toBeUndefined();
  });

  it('ne casse pas sur un événement sans requête', () => {
    expect(() => scrubEvent({})).not.toThrow();
  });

  it("conserve l'URL quand elle n'a pas de paramètres", () => {
    const event = scrubEvent({ request: { url: 'https://qayed.tn/hotel/dashboard' } });
    expect(event.request?.url).toBe('https://qayed.tn/hotel/dashboard');
  });
});

describe("filtrage des fils d'Ariane", () => {
  it('rejette entièrement les saisies clavier', () => {
    // Sinon chaque caractère tapé dans le formulaire voyageur serait envoyé.
    expect(scrubBreadcrumb({ category: 'ui.input', data: { value: 'Mohamed' } })).toBeNull();
  });

  it('retire le corps et les paramètres des requêtes réseau', () => {
    const crumb = scrubBreadcrumb({
      category: 'fetch',
      data: {
        url: 'https://api.qayed.tn/api/v1/authority/search?last_name=Mathlouthi',
        body: '{"document_number":"12345678"}',
        method: 'GET',
        status_code: 200,
      },
    });

    const serialized = JSON.stringify(crumb);

    expect(serialized).not.toContain('Mathlouthi');
    expect(serialized).not.toContain('12345678');
    expect(crumb?.data?.url).toBe('https://api.qayed.tn/api/v1/authority/search');
    // Ce qui sert au diagnostic est conservé.
    expect(crumb?.data?.method).toBe('GET');
    expect(crumb?.data?.status_code).toBe(200);
  });

  it('laisse passer les fils de navigation', () => {
    const crumb = scrubBreadcrumb({ category: 'navigation', data: { to: '/hotel/dashboard' } });
    expect(crumb).not.toBeNull();
  });
});

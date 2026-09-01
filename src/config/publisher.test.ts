import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ORGANIZATION_LD, PUBLISHER, publisherAddressLine, publisherFooterLine } from './publisher';

/**
 * L'identité de l'éditeur est une obligation d'affichage : ce qui compte n'est
 * pas qu'elle « s'affiche », c'est qu'elle soit EXACTE. Ces tests figent donc
 * les valeurs telles qu'immatriculées — un caractère qui change ici doit être
 * un choix, pas un effet de bord.
 */
describe('identité de l\'éditeur', () => {
  it('porte la raison sociale, la forme et le RNE immatriculés', () => {
    expect(PUBLISHER.legalName).toBe('SOCIETE UW AGENCY');
    expect(PUBLISHER.legalForm).toBe('SUARL');
    expect(PUBLISHER.rne).toBe('1715656S');
    expect(PUBLISHER.publicationDirector).toBe('Hichem Mathlouthi');
  });

  it('compose le siège social sur une ligne', () => {
    expect(publisherAddressLine()).toBe(
      '02 Rue Abdallah El Mahdi, Carthage Byrsa, 2016 Carthage, Tunisie',
    );
  });

  it('donne un contact de société, jamais une adresse personnelle', () => {
    expect(PUBLISHER.email).toBe('contact@qayed.tn');
    expect(PUBLISHER.email.endsWith('@qayed.tn')).toBe(true);
    expect(PUBLISHER.phone).toBe('+216 93 116 000');
  });
});

describe('ligne de pied de page', () => {
  it('nomme la société, sa forme, son RNE et son siège', () => {
    const fr = publisherFooterLine('fr');
    expect(fr).toBe(
      'Qayed est édité par SOCIETE UW AGENCY (SUARL) — RNE 1715656S — 02 Rue Abdallah El Mahdi, Carthage Byrsa, 2016 Carthage, Tunisie',
    );
  });

  it('reste complète dans les trois langues du site', () => {
    for (const lang of ['fr', 'en', 'ar']) {
      const line = publisherFooterLine(lang);
      expect(line).toContain('SOCIETE UW AGENCY');
      expect(line).toContain('SUARL');
      expect(line).toContain('RNE 1715656S');
      expect(line).toContain('2016 Carthage');
    }
  });

  // Une langue inconnue (détection navigateur exotique, URL bricolée) ne doit
  // pas vider la mention : elle retombe sur le français, langue source.
  it('retombe sur le français pour une langue inconnue', () => {
    expect(publisherFooterLine('de')).toBe(publisherFooterLine('fr'));
  });
});

describe('JSON-LD Organization', () => {
  it('déclare exactement les champs attendus, sans donnée personnelle', () => {
    expect(ORGANIZATION_LD).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://qayed.tn/#organization',
      name: 'Qayed',
      legalName: 'SOCIETE UW AGENCY',
      url: 'https://qayed.tn',
      logo: 'https://qayed.tn/icon-512.png',
      email: 'contact@qayed.tn',
      telephone: '+216 93 116 000',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '02 Rue Abdallah El Mahdi, Carthage Byrsa',
        addressLocality: 'Carthage',
        postalCode: '2016',
        addressCountry: 'TN',
      },
    });
  });

  /**
   * Le <head> de index.html sert le même bloc, à la main : c'est la seule
   * version qu'un robot sans JavaScript peut lire. Deux copies, donc deux
   * risques de dérive — ce test est ce qui les tient ensemble.
   */
  it('est identique à celui servi dans le <head> de index.html', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    const match = html.match(
      /<script type="application\/ld\+json" data-publisher-ld>([\s\S]*?)<\/script>/,
    );

    expect(match, 'aucun <script data-publisher-ld> dans index.html').not.toBeNull();
    expect(JSON.parse(match![1])).toEqual(ORGANIZATION_LD);
  });
});

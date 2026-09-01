import { describe, it, expect } from 'vitest';
import { MENTIONS_LEGALES } from './mentionsLegalesContent';
import { PUBLISHER } from '@/config/publisher';

/**
 * Les mentions légales ne sont pas du contenu marketing : les champs ci-dessous
 * sont exigés, et leur absence est un défaut de conformité, pas un détail
 * éditorial. Le test les vérifie DANS LES TROIS LANGUES — le site est servi en
 * fr, en et ar, et un examinateur peut ouvrir n'importe laquelle.
 */
const LANGS = ['fr', 'en', 'ar'] as const;

describe('page Mentions légales', () => {
  it.each(LANGS)('porte le bloc Éditeur au complet en %s', (lang) => {
    const content = MENTIONS_LEGALES[lang];
    const editor = content.sections[0];

    // Le bloc Éditeur vient EN PREMIER : c'est l'information cherchée.
    expect(editor.title).not.toBe('');

    for (const value of [
      PUBLISHER.legalName,
      PUBLISHER.legalForm,
      PUBLISHER.rne,
      PUBLISHER.address.street,
      PUBLISHER.address.postalCode,
      PUBLISHER.address.locality,
      PUBLISHER.email,
      PUBLISHER.phone,
      PUBLISHER.publicationDirector,
    ]) {
      expect(editor.text).toContain(value);
    }
  });

  it.each(LANGS)('ne translittère jamais la raison sociale (%s)', (lang) => {
    // « SOCIETE UW AGENCY » est l'entité immatriculée : traduite ou
    // translittérée, elle n'est plus recoupable avec le registre.
    expect(MENTIONS_LEGALES[lang].sections[0].text).toContain('SOCIETE UW AGENCY');
  });

  it.each(LANGS)('annonce l\'éditeur jusque dans la méta description (%s)', (lang) => {
    const { metaTitle, metaDescription } = MENTIONS_LEGALES[lang];
    expect(metaTitle).not.toBe('');
    expect(metaDescription).toContain(PUBLISHER.legalName);
    expect(metaDescription).toContain(PUBLISHER.rne);
  });

  it.each(LANGS)('conserve hébergement et propriété intellectuelle (%s)', (lang) => {
    const titles = MENTIONS_LEGALES[lang].sections.map((s) => s.title);
    expect(titles).toHaveLength(3);
    // Les deux sections héritées de l'ancienne page CMS ne doivent pas
    // disparaître au passage au code.
    expect(MENTIONS_LEGALES[lang].sections[1].text).toContain('Vercel');
    expect(MENTIONS_LEGALES[lang].sections[2].text).toContain(PUBLISHER.legalName);
  });
});

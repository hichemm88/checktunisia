import { describe, expect, it } from 'vitest';
import { activeTemplatesForSegment, buildWaMeUrl, renderTemplate, templateVariablesFor } from './whatsapp';

describe('renderTemplate', () => {
  it('replaces known variables with their values', () => {
    expect(renderTemplate('Bonjour {prenom}, je vous contacte pour {etablissement}.', {
      prenom: 'Amine',
      etablissement: 'Dar El Medina',
    })).toBe('Bonjour Amine, je vous contacte pour Dar El Medina.');
  });

  it('replaces every occurrence of a repeated variable', () => {
    expect(renderTemplate('{prenom}, bonjour {prenom} !', { prenom: 'Sami' })).toBe('Sami, bonjour Sami !');
  });

  it('leaves an unrecognized variable visible instead of silently dropping it', () => {
    expect(renderTemplate('Bonjour {prenomm} !', { prenom: 'Amine' })).toBe('Bonjour {prenomm} !');
  });

  it('leaves the text untouched when no variables are provided', () => {
    expect(renderTemplate('Message fixe sans variable.', {})).toBe('Message fixe sans variable.');
  });
});

describe('templateVariablesFor', () => {
  it('falls back to an empty first name when the establishment has none', () => {
    expect(templateVariablesFor({ name: 'Dar El Medina', decision_maker_name: null })).toEqual({
      etablissement: 'Dar El Medina',
      prenom: '',
    });
  });

  it('uses the decision maker first name when present', () => {
    expect(templateVariablesFor({ name: 'Dar El Medina', decision_maker_name: 'Sami' })).toEqual({
      etablissement: 'Dar El Medina',
      prenom: 'Sami',
    });
  });
});

describe('buildWaMeUrl', () => {
  it('strips the leading + and any separators from an E.164 number', () => {
    expect(buildWaMeUrl('+216 20 123 456', 'Bonjour')).toBe('https://wa.me/21620123456?text=Bonjour');
  });

  it('URL-encodes accented characters', () => {
    const url = buildWaMeUrl('+21620123456', 'Bonjour, une démo est possible ?');
    expect(url).toBe('https://wa.me/21620123456?text=Bonjour%2C%20une%20d%C3%A9mo%20est%20possible%20%3F');
  });

  it('keeps a message with apostrophes decodable back to the original text', () => {
    const message = "Bonjour, c'est Amine, pour aujourd'hui ?";
    const url = buildWaMeUrl('+21620123456', message);
    const [, encoded] = url.split('?text=');
    expect(decodeURIComponent(encoded)).toBe(message);
  });

  it('round-trips through decodeURIComponent back to the original message', () => {
    const message = "Bonjour {prenom}, c'est Qayed — êtes-vous libre à 15h ?";
    const url = buildWaMeUrl('+21620123456', message);
    const [, encoded] = url.split('?text=');
    expect(decodeURIComponent(encoded)).toBe(message);
  });
});

describe('activeTemplatesForSegment', () => {
  const templates = [
    { id: '1', name: 'Générique', body: 'x', segment: null, active: true },
    { id: '2', name: 'Maison d\'hôtes', body: 'x', segment: 'maison_hotes' as const, active: true },
    { id: '3', name: 'Hôtel', body: 'x', segment: 'hotel' as const, active: true },
    { id: '4', name: 'Archivé', body: 'x', segment: null, active: false },
  ];

  it('keeps templates without a segment plus those matching the establishment segment', () => {
    const result = activeTemplatesForSegment(templates, 'maison_hotes');
    expect(result.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('excludes inactive templates', () => {
    expect(activeTemplatesForSegment(templates, null).map((t) => t.id)).toEqual(['1']);
  });
});

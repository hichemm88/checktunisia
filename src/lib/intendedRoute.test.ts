import { describe, it, expect } from 'vitest';
import { safeIntendedPath, loginPathFor, readIntendedPath } from './intendedRoute';

/**
 * La destination visée traverse l'authentification : un agent qui suit le lien
 * « Consulter la fiche » d'un message WhatsApp doit atterrir sur la fiche, pas
 * sur l'accueil. Le paramètre venant de l'URL, il est aussi une surface
 * d'attaque — d'où ces deux familles de cas.
 */
describe('safeIntendedPath', () => {
  it('accepte un chemin interne', () => {
    expect(safeIntendedPath('/authority/guests/abc')).toBe('/authority/guests/abc');
    expect(safeIntendedPath(encodeURIComponent('/authority/guests/abc'))).toBe('/authority/guests/abc');
  });

  it('refuse tout ce qui sort du site', () => {
    // Sans ce filtre, la page de connexion du portail des forces de l'ordre
    // deviendrait un tremplin de hameçonnage affichant le bon domaine.
    expect(safeIntendedPath('https://exemple.invalid')).toBeNull();
    expect(safeIntendedPath('//exemple.invalid')).toBeNull();
    expect(safeIntendedPath(String.raw`/\exemple.invalid`)).toBeNull();
    expect(safeIntendedPath('javascript:alert(1)')).toBeNull();
  });

  it('refuse une absence ou un échappement invalide', () => {
    expect(safeIntendedPath(null)).toBeNull();
    expect(safeIntendedPath('')).toBeNull();
    expect(safeIntendedPath('%E0%A4%A')).toBeNull();
  });
});

describe('loginPathFor / readIntendedPath', () => {
  it('fait l’aller-retour sans perdre la destination', () => {
    const path = loginPathFor('/authority/guests/abc', '?onglet=fiche');
    expect(readIntendedPath(path.slice(path.indexOf('?')))).toBe('/authority/guests/abc?onglet=fiche');
  });

  it('ignore une destination externe glissée dans l’URL', () => {
    expect(readIntendedPath('?next=https%3A%2F%2Fexemple.invalid')).toBeNull();
  });
});

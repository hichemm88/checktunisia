// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';

import { HotelLayout } from './HotelLayout';
import { MAIN_CONTENT_ID } from './SkipToContent';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

/**
 * Deux garanties du gabarit hôtelier, mesurées dans le navigateur avant d'être
 * corrigées.
 *
 * ── Le lien d'évitement ─────────────────────────────────────────────────
 *
 * Chaque écran répète le même en-tête avant d'arriver au contenu : 69 éléments
 * atteignables au clavier sur l'assistant de check-in, dont la même dizaine en
 * tête de page après page. Rien ne permettait de les sauter — critère WCAG
 * 2.4.1 « Contourner des blocs », niveau A.
 *
 * ── Le titre de l'onglet ────────────────────────────────────────────────
 *
 * Aucun écran applicatif ne posait `document.title` : le tableau de bord,
 * l'assistant et l'historique affichaient tous « Qayed — Enregistrez vos
 * voyageurs en 30 secondes », l'accroche commerciale de la page d'accueil. Une
 * réception avec plusieurs onglets ouverts ne pouvait pas les distinguer, et un
 * lecteur d'écran annonçait le même titre à chaque changement de page.
 */
describe('gabarit hôtelier — accès clavier et titre', () => {
  beforeEach(() => {
    document.title = 'titre initial';
  });

  it("place le lien d'évitement en tout premier élément focalisable", () => {
    wrap(<HotelLayout title="Tableau de bord"><p>contenu</p></HotelLayout>);

    const focalisables = Array.from(
      document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]'),
    );

    // Le tout premier, sans quoi il faudrait traverser l'en-tête pour
    // l'atteindre — ce qui le rendrait inutile.
    expect(focalisables[0]).toBe(screen.getByRole('link', { name: 'Aller au contenu' }));
  });

  it('pointe vers une ancre qui existe réellement dans la page', () => {
    // Un lien d'évitement dont la cible manque ne déplace pas le focus : il
    // passerait tous les contrôles de surface tout en ne servant à rien.
    wrap(<HotelLayout title="Tableau de bord"><p>contenu</p></HotelLayout>);

    const lien = screen.getByRole('link', { name: 'Aller au contenu' });

    expect(lien).toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
    expect(document.getElementById(MAIN_CONTENT_ID)).not.toBeNull();
    expect(document.getElementById(MAIN_CONTENT_ID)?.tagName).toBe('MAIN');
  });

  it("nomme l'onglet d'après l'écran affiché", () => {
    wrap(<HotelLayout title="Historique"><p>contenu</p></HotelLayout>);

    expect(document.title).toBe('Historique — Qayed');
  });

  it("laisse l'onglet tranquille quand l'écran n'a pas de titre", () => {
    // Certains écrans n'en passent pas. Mieux vaut garder le titre précédent
    // qu'afficher un « — Qayed » orphelin.
    wrap(<HotelLayout><p>contenu</p></HotelLayout>);

    expect(document.title).toBe('titre initial');
  });

  it('rend le titre visible aussi, pas seulement dans l’onglet', () => {
    // L'en-tête et l'onglet lisent la même valeur : ils ne peuvent pas se
    // contredire.
    wrap(<HotelLayout title="Mes biens"><p>contenu</p></HotelLayout>);

    expect(screen.getByRole('heading', { name: 'Mes biens', level: 1 })).toBeTruthy();
    expect(document.title).toBe('Mes biens — Qayed');
  });
});

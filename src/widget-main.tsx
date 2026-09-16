import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './i18n/locales/fr.json';
import './index.css';
import { FicheWidgetPage } from './pages/widget/FicheWidgetPage';

/*
 * Bundle SÉPARÉ de l'app principale (voir API-V1-DECISIONS.md) : pas de
 * router, pas de store d'auth, pas de react-query — le widget n'a besoin
 * d'aucun de ces trois pour son unique écran.
 *
 * i18n statique (français uniquement, pas de détection/lazy-loading) : le
 * widget est mono-langue pour l'instant (français d'abord, comme le reste du
 * contrat API), et ce choix évite d'embarquer le mécanisme de langue de l'app
 * principale (détecteur de navigateur, chargement paresseux par langue) pour
 * un seul écran.
 */
i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

const root = document.getElementById('qayed-widget-root');
const token = root?.dataset.widgetToken ?? new URLSearchParams(window.location.search).get('token') ?? '';

createRoot(root!).render(
  <StrictMode>
    <FicheWidgetPage token={token} />
  </StrictMode>,
);

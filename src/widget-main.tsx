import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Imports nommés : Vite n'embarque que ces trois sections de chaque fichier
// de langue, pas les traductions de toute l'application.
import { widget as frWidget, cinScan as frCinScan, common as frCommon } from './i18n/locales/fr.json';
import { widget as enWidget, cinScan as enCinScan, common as enCommon } from './i18n/locales/en.json';
import { widget as arWidget, cinScan as arCinScan, common as arCommon } from './i18n/locales/ar.json';
import './index.css';
import { FicheWidgetPage } from './pages/widget/FicheWidgetPage';

/*
 * Bundle SÉPARÉ de l'app principale (voir API-V1-DECISIONS.md) : pas de
 * router, pas de store d'auth, pas de react-query — le widget n'a besoin
 * d'aucun de ces trois pour son unique écran.
 *
 * i18n statique : les trois langues sont embarquées (pas de détection ni de
 * chargement paresseux), le français s'affiche pendant le bootstrap puis la
 * page bascule sur `bootstrap.locale` (et `dir="rtl"` pour l'arabe).
 */
i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: { widget: frWidget, cinScan: frCinScan, common: frCommon } },
    en: { translation: { widget: enWidget, cinScan: enCinScan, common: enCommon } },
    ar: { translation: { widget: arWidget, cinScan: arCinScan, common: arCommon } },
  },
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

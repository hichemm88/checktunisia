import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { fetchCmsMenus, type CmsMenuItem } from '@/api/cms';
import { pickI18n } from '@/lib/i18nContent';
import { SITE_CSS } from './siteCss';

const SITE_LANGS = [
  { code: 'fr', name: 'Français', label: 'FR' },
  { code: 'en', name: 'English', label: 'EN' },
  { code: 'ar', name: 'العربية', label: 'AR' },
];

/** Libellés fixes du footer (hors contenu CMS) — trilingues. */
const FOOTER_T = {
  desc: {
    fr: 'Plateforme de fiche de police digitale pour les hébergements en Tunisie — simple, rapide, conforme.',
    en: 'Digital police form platform for accommodations in Tunisia — simple, fast, compliant.',
    ar: 'منصة بطاقة الشرطة الرقمية لمؤسسات الإقامة في تونس — بسيطة وسريعة ومطابقة.',
  },
  product: { fr: 'Produit', en: 'Product', ar: 'المنتج' },
  legal: { fr: 'Légal', en: 'Legal', ar: 'قانوني' },
  mentions: { fr: 'Mentions légales', en: 'Legal notice', ar: 'إشعار قانوني' },
  cgv: { fr: 'Conditions générales de vente', en: 'Terms of sale', ar: 'الشروط العامة للبيع' },
  privacy: { fr: 'Politique de confidentialité', en: 'Privacy policy', ar: 'سياسة الخصوصية' },
  securePay: { fr: 'Paiement sécurisé', en: 'Secure payment', ar: 'دفع آمن' },
};

/** Sélecteur de langue dans le langage visuel de la navbar publique
    (pilule cachet + dropdown carte papier) — pas le composant des portails. */
const SiteLanguageSwitcher = ({ current, onSelect }: { current: string; onSelect: (code: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const active = SITE_LANGS.find((l) => l.code === current) ?? SITE_LANGS[0];

  return (
    <div className="lang-switch" ref={ref}>
      <button type="button" className="lang-btn" onClick={() => setOpen((o) => !o)} aria-label="Choisir la langue">
        <Globe size={14} strokeWidth={2.2} />
        {active.label}
        <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.6, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="lang-menu">
          {SITE_LANGS.map((l) => (
            <button key={l.code} type="button"
              className={`lang-opt${l.code === active.code ? ' active' : ''}`}
              onClick={() => { onSelect(l.code); setOpen(false); }}>
              <span>{l.name}</span>
              <span className="lang-code">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Habillage des pages CMS publiques : navbar + footer pilotés par
 * GET /public/menus, CSS du site, et interactions (ombre au scroll, burger,
 * fade-in) — même comportement que la landing.
 */
export const SiteChrome = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'fr';
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: menus } = useQuery({ queryKey: ['cms-menus'], queryFn: fetchCmsMenus, staleTime: 5 * 60 * 1000 });

  // Changer de langue sur le site public : change la langue i18n ET synchronise
  // l'URL quand elle est localisée (/fr/xxx → /en/xxx) — sur « / » (langue
  // active), le contenu suit tout seul, pas de navigation nécessaire.
  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    const m = location.pathname.match(/^\/(fr|en|ar)(\/.*)?$/);
    if (m) navigate(`/${code}${m[2] ?? ''}`, { replace: true });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nav = root.querySelector('#navbar');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll);

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    root.querySelectorAll('.fade-in').forEach((el) => obs.observe(el));

    // Bloc Steps : clic sur une étape → écran produit correspondant (mockup figé)
    const flowSteps = root.querySelectorAll<HTMLElement>('[data-flow-step]');
    const onFlowStepClick = (el: HTMLElement) => {
      const n = el.dataset.flowStep;
      root.querySelectorAll('.flow-step').forEach((s) => s.classList.remove('active'));
      root.querySelectorAll('.flow-screen').forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
      root.querySelector(`#screen-${n}`)?.classList.add('active');
    };
    const flowHandlers = new Map<HTMLElement, () => void>();
    flowSteps.forEach((el) => {
      const h = () => onFlowStepClick(el);
      flowHandlers.set(el, h);
      el.addEventListener('click', h);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      obs.disconnect();
      flowHandlers.forEach((h, el) => el.removeEventListener('click', h));
    };
  }, [children]);

  const itemHref = (item: CmsMenuItem) => item.url ?? `/${lang}/${item.slug}`;
  const NavLink = ({ item, onClick }: { item: CmsMenuItem; onClick?: () => void }) => {
    const label = pickI18n(item.label, lang);
    return item.url
      ? <a href={item.url} onClick={onClick}>{label}</a>
      : <Link to={itemHref(item)} onClick={onClick}>{label}</Link>;
  };

  return (
    <div className="qayed-landing" ref={rootRef}>
      <style>{SITE_CSS}</style>

      <nav id="navbar">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <div className="nav-stamp"><span>قيد</span></div>
            <span className="nav-wordmark">QAYED</span>
          </Link>
          <ul className="nav-links">
            {(menus?.navbar ?? []).map((item) => <li key={item.id}><NavLink item={item} /></li>)}
            <li><SiteLanguageSwitcher current={lang} onSelect={changeLanguage} /></li>
            <li><Link to="/login" className="nav-login">Se connecter</Link></li>
            <li><Link to="/register" className="nav-cta">Essayer gratuitement</Link></li>
          </ul>
          <button className={`burger${menuOpen ? ' open' : ''}`} aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            <span></span><span></span><span></span>
          </button>
        </div>
        <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
          {(menus?.navbar ?? []).map((item) => <NavLink key={item.id} item={item} onClick={() => setMenuOpen(false)} />)}
          <div className="mobile-menu-actions">
            <SiteLanguageSwitcher current={lang} onSelect={(code) => { changeLanguage(code); setMenuOpen(false); }} />
            <Link to="/login" className="btn btn-ghost btn-full" onClick={() => setMenuOpen(false)}>Se connecter</Link>
            <Link to="/register" className="btn btn-primary btn-full" onClick={() => setMenuOpen(false)}>Essayer gratuitement</Link>
          </div>
        </div>
      </nav>

      {children}

      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-logo-row">
                <div className="footer-stamp"><span>قيد</span></div>
                <span className="footer-wm">QAYED</span>
              </div>
              <p className="footer-tagline">منصة تسجيل النزلاء الرقمية للفنادق التونسية</p>
              <p className="footer-desc">{FOOTER_T.desc[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.desc.fr}</p>
            </div>
            <div className="footer-col">
              <h4>{FOOTER_T.product[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.product.fr}</h4>
              <ul>
                {(menus?.footer ?? []).map((item) => <li key={item.id}><NavLink item={item} /></li>)}
              </ul>
            </div>
            <div className="footer-col">
              <h4>{FOOTER_T.legal[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.legal.fr}</h4>
              <ul>
                <li><Link to={`/${lang}/mentions-legales`}>{FOOTER_T.mentions[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.mentions.fr}</Link></li>
                <li><Link to={`/${lang}/cgv`}>{FOOTER_T.cgv[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.cgv.fr}</Link></li>
                <li><Link to={`/${lang}/politique-confidentialite`}>{FOOTER_T.privacy[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.privacy.fr}</Link></li>
                <li><a href="mailto:contact@qayed.tn">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-legal">© {new Date().getFullYear()} QAYED · UW AGENCY SUARL · TUNIS, TUNISIE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="footer-legal" style={{ marginInlineEnd: 6 }}>{FOOTER_T.securePay[lang as 'fr' | 'en' | 'ar'] ?? FOOTER_T.securePay.fr}</span>
              <svg width="42" height="26" viewBox="0 0 42 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.45 }}>
                <rect width="42" height="26" rx="4" fill="#1A1F71" />
                <text x="21" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="10" fontWeight="700" fill="#FFFFFF" letterSpacing="1">VISA</text>
              </svg>
              <svg width="42" height="26" viewBox="0 0 42 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.45 }}>
                <rect width="42" height="26" rx="4" fill="#252525" />
                <circle cx="16" cy="13" r="8" fill="#EB001B" />
                <circle cx="26" cy="13" r="8" fill="#F79E1B" />
                <path d="M21 7.2a8 8 0 0 1 0 11.6A8 8 0 0 1 21 7.2z" fill="#FF5F00" />
              </svg>
              <svg width="42" height="26" viewBox="0 0 42 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.45 }}>
                <rect width="42" height="26" rx="4" fill="#2D6DB5" />
                <text x="21" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="700" fill="#FFFFFF">CB</text>
              </svg>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

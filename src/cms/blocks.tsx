import { Link } from 'react-router-dom';
import { PricingSection } from '@/components/landing/PricingSection';
import { MOCKUPS } from './mockups';

/**
 * Composants des blocs Puck — rendus avec les classes exactes du CSS scopé
 * .qayed-landing (src/cms/siteCss.ts) pour une fidélité 1:1 avec la landing
 * d'origine. Le RTL est géré par le dir global posé sur <html> par i18n.
 */

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

const sectionClass = (background?: string) => cx('section', background === 'alt' && 'section-alt');

/** Texte multi-lignes : \n → <br>. */
const withBreaks = (text: string) =>
  text.split('\n').map((line, i, arr) => (
    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
  ));

/** Lien interne (React Router) si href commence par / ou #, sinon <a>. */
const SmartLink = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return <Link to={href} className={className}>{children}</Link>;
  }
  return <a href={href} className={className}>{children}</a>;
};

// ── Hero ────────────────────────────────────────────────────────────────────────

export interface HeroProps {
  eyebrow: string;
  titleLines: { text: string; accent: boolean }[];
  arabicLine?: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  mockup: string; // clé MOCKUPS ou 'none'
  showWave: boolean;
}

export const HeroBlock = (p: HeroProps) => (
  <>
    <section className="hero">
      <div className="reg-lines"></div>
      <div className="hero-glow"></div>
      <div className="hero-inner">
        <div>
          {p.eyebrow && <p className="hero-eyebrow">{p.eyebrow}</p>}
          <h1 className="hero-h1">
            {p.titleLines.map((l, i) => (
              <span key={i}>
                {l.accent ? <em>{l.text}</em> : l.text}
                {i < p.titleLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          {p.arabicLine && <p className="hero-ar">{p.arabicLine}</p>}
          <p className="hero-desc">{p.description}</p>
          <div className="hero-actions">
            <SmartLink href={p.primaryHref} className="btn btn-primary">
              {p.primaryLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </SmartLink>
            {p.secondaryLabel && p.secondaryHref && (
              <SmartLink href={p.secondaryHref} className="btn btn-ghost-dark">{p.secondaryLabel}</SmartLink>
            )}
          </div>
        </div>
        {p.mockup !== 'none' && MOCKUPS[p.mockup] && (
          <div dangerouslySetInnerHTML={{ __html: MOCKUPS[p.mockup] }} />
        )}
      </div>
    </section>
    {p.showWave && (
      <div className="wave">
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 C480 56 960 0 1440 56 L1440 0 Z" fill="#10222E" /></svg>
      </div>
    )}
  </>
);

// ── Bande de confiance ──────────────────────────────────────────────────────────

export interface TrustBarProps {
  items: { text: string }[];
}

export const TrustBarBlock = (p: TrustBarProps) => (
  <div className="trust-bar">
    {p.items.map((it, i) => (
      <span key={i} style={{ display: 'contents' }}>
        <div className="trust-item"><div className="trust-dot"></div>{it.text}</div>
        {i < p.items.length - 1 && <div className="trust-divider"></div>}
      </span>
    ))}
  </div>
);

// ── Bandeau de stats ────────────────────────────────────────────────────────────

export interface StatsBarProps {
  items: { num: string; sup?: string; label: string }[];
  background: 'default' | 'alt';
}

export const StatsBarBlock = (p: StatsBarProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 64, paddingBottom: 64 }}>
    <div className="wrap">
      <div className="stats-bar fade-in">
        {p.items.map((it, i) => (
          <div key={i} className="stat-cell">
            <div className="stat-num">{it.num}{it.sup && <sup>{it.sup}</sup>}</div>
            <div className="stat-label">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── Titre de section ────────────────────────────────────────────────────────────

export interface SectionHeadingProps {
  anchor?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  centered: boolean;
  background: 'default' | 'alt';
}

export const SectionHeadingBlock = (p: SectionHeadingProps) => (
  <section className={sectionClass(p.background)} id={p.anchor || undefined} style={{ paddingBottom: 0 }}>
    <div className="wrap">
      {p.eyebrow && <div className="eyebrow fade-in" style={p.centered ? { justifyContent: 'center' } : undefined}>{p.eyebrow}</div>}
      <h2 className="section-h2 fade-in" style={p.centered ? { textAlign: 'center' } : undefined}>{withBreaks(p.title)}</h2>
      {p.lead && (
        <p className="section-lead fade-in" style={p.centered ? { textAlign: 'center', margin: '0 auto', maxWidth: 560 } : undefined}>{p.lead}</p>
      )}
    </div>
  </section>
);

// ── Texte ───────────────────────────────────────────────────────────────────────

export interface RichTextProps {
  text: string;
  centered: boolean;
  background: 'default' | 'alt';
}

export const RichTextBlock = (p: RichTextProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 32, paddingBottom: 32 }}>
    <div className="wrap" style={{ maxWidth: 760 }}>
      {p.text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="section-lead" style={{ textAlign: p.centered ? 'center' : 'start', marginBottom: 16 }}>{para}</p>
      ))}
    </div>
  </section>
);

// ── Image ───────────────────────────────────────────────────────────────────────

export interface ImageProps {
  url: string;
  alt: string;
  maxWidth: number;
  background: 'default' | 'alt';
}

export const ImageBlock = (p: ImageProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 32, paddingBottom: 32 }}>
    <div className="wrap" style={{ textAlign: 'center' }}>
      {p.url
        ? <img src={p.url} alt={p.alt} style={{ maxWidth: Math.min(p.maxWidth || 800, 1100), width: '100%', borderRadius: 'var(--r-lg)' }} loading="lazy" />
        : <div style={{ padding: 40, border: '2px dashed var(--ligne)', borderRadius: 'var(--r-lg)', color: 'var(--fiche)' }}>Image — renseignez une URL (bibliothèque de médias)</div>}
    </div>
  </section>
);

// ── Grille de cartes (fonctionnalités / pour qui) ───────────────────────────────

export interface FeaturesGridProps {
  items: { emoji: string; title: string; text: string }[];
  variant: 'feature' | 'audience';
  note?: string;
  background: 'default' | 'alt';
}

export const FeaturesGridBlock = (p: FeaturesGridProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 40 }}>
    <div className="wrap">
      <div className={cx('fade-in', p.variant === 'audience' ? 'forqui-grid' : 'feat-grid')}>
        {p.items.map((it, i) => (
          <div key={i} className={p.variant === 'audience' ? 'forqui-card' : 'feat-card'}>
            <div className={p.variant === 'audience' ? 'forqui-icon' : 'feat-icon'}>{it.emoji}</div>
            <h3>{it.title}</h3>
            <p>{it.text}</p>
          </div>
        ))}
      </div>
      {p.note && (
        <div className="forqui-note fade-in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--cachet)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span>{p.note}</span>
        </div>
      )}
    </div>
  </section>
);

// ── Étapes (comment ça marche) ─────────────────────────────────────────────────

export interface StepsProps {
  items: { title: string; text: string }[];
  showScreens: boolean;
  background: 'default' | 'alt';
}

export const StepsBlock = (p: StepsProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 40 }}>
    <div className="wrap">
      <div className="flow-grid">
        <div className="flow-steps">
          {p.items.map((it, i) => (
            <div key={i} className={cx('flow-step', i === 0 && 'active')} data-flow-step={i + 1}>
              <div className="fs-num">{i + 1}</div>
              <div className="fs-body">
                <div className="fs-title">{it.title}</div>
                <div className="fs-desc">{it.text}</div>
              </div>
            </div>
          ))}
        </div>
        {p.showScreens && MOCKUPS['flow-screens'] && (
          <div dangerouslySetInnerHTML={{ __html: MOCKUPS['flow-screens'] }} />
        )}
      </div>
    </div>
  </section>
);

// ── Vitrine fiche (texte + visuel figé) ────────────────────────────────────────

export interface FicheShowcaseProps {
  eyebrow: string;
  title: string;
  text: string;
  background: 'default' | 'alt';
}

export const FicheShowcaseBlock = (p: FicheShowcaseProps) => (
  <section className={sectionClass(p.background)}>
    <div className="wrap">
      <div className="fiche-grid fade-in">
        <div>
          <div className="eyebrow">{p.eyebrow}</div>
          <h2 className="section-h2">{p.title}</h2>
          {p.text.split(/\n{2,}/).map((para, i) => (
            <p key={i} style={{ fontSize: 16, color: 'var(--texte-sec)', lineHeight: 1.65, marginBottom: 24 }}>{para}</p>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge b-ok"><span className="dot"></span>Actif</span>
            <span className="badge" style={{ background: '#F3F4F6', color: '#374151' }}><span className="dot" style={{ background: '#9CA3AF' }}></span>Terminé</span>
          </div>
        </div>
        <div dangerouslySetInnerHTML={{ __html: MOCKUPS['fiche-visual'] ?? '' }} />
      </div>
    </div>
  </section>
);

// ── Sécurité / conformité (section sombre) ─────────────────────────────────────

export interface SecurityProps {
  anchor?: string;
  eyebrow: string;
  title: string;
  lead: string;
  items: { emoji: string; title: string; text: string }[];
  showMockup: boolean;
}

export const SecurityBlock = (p: SecurityProps) => (
  <section className="section" id={p.anchor || undefined} style={{ background: 'var(--encre)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%,rgba(83,70,168,.18) 0%,transparent 65%)', pointerEvents: 'none' }}></div>
    <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
      <div className="sec-grid">
        <div>
          <div className="eyebrow fade-in" style={{ color: 'var(--cachet-sombre)' }}>{p.eyebrow}</div>
          <h2 className="section-h2 fade-in" style={{ color: 'var(--papier)' }}>{withBreaks(p.title)}</h2>
          <p className="fade-in" style={{ fontSize: 17, color: '#9BA8B3', lineHeight: 1.65, marginBottom: 32 }}>{p.lead}</p>
          <ul className="sec-list fade-in">
            {p.items.map((it, i) => (
              <li key={i}>
                <div className="sec-icon">{it.emoji}</div>
                <div>
                  <strong>{it.title}</strong>
                  <p>{it.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {p.showMockup && MOCKUPS['authority-dashboard'] && (
          <div className="fade-in" dangerouslySetInnerHTML={{ __html: MOCKUPS['authority-dashboard'] }} />
        )}
      </div>
    </div>
  </section>
);

// ── Tarifs (data-driven) ────────────────────────────────────────────────────────

export interface PricingBlockProps {
  eyebrow: string;
  title: string;
  lead: string;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyBadge: string;
  footnote: string;
}

export const PricingBlock = (p: PricingBlockProps) => <PricingSection {...p} />;

// ── Témoignages ─────────────────────────────────────────────────────────────────

export interface TestimonialsProps {
  items: { quote: string; name: string; role: string; initials: string }[];
  background: 'default' | 'alt';
}

export const TestimonialsBlock = (p: TestimonialsProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 40 }}>
    <div className="wrap">
      <div className="testi-grid fade-in">
        {p.items.map((it, i) => (
          <div key={i} className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-quote">{it.quote}</p>
            <div className="testi-author">
              <div className="testi-av">{it.initials}</div>
              <div>
                <p className="testi-name">{it.name}</p>
                <p className="testi-role">{it.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── FAQ ─────────────────────────────────────────────────────────────────────────

export interface FaqProps {
  items: { question: string; answer: string }[];
  background: 'default' | 'alt';
}

export const FaqBlock = (p: FaqProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 40 }}>
    <div className="wrap" style={{ maxWidth: 760 }}>
      {p.items.map((it, i) => (
        <details key={i} style={{ borderBottom: '1px solid var(--ligne)', padding: '18px 4px' }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 16 }}>{it.question}</summary>
          <p style={{ marginTop: 10, fontSize: 14, color: 'var(--texte-sec)', lineHeight: 1.7 }}>{it.answer}</p>
        </details>
      ))}
    </div>
  </section>
);

// ── Bande CTA ───────────────────────────────────────────────────────────────────

export interface CtaBandProps {
  anchor?: string;
  title: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
  note?: string;
}

export const CtaBandBlock = (p: CtaBandProps) => (
  <div className="cta-band" id={p.anchor || undefined}>
    <div className="wrap">
      <h2 className="cta-h2">{withBreaks(p.title)}</h2>
      {p.text && <p className="cta-sub">{p.text}</p>}
      <SmartLink href={p.buttonHref} className="btn btn-white">
        {p.buttonLabel}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </SmartLink>
      {p.note && <p className="cta-meta">{p.note}</p>}
    </div>
  </div>
);

// ── Mockup produit ──────────────────────────────────────────────────────────────

export interface MockupProps {
  mockup: string;
  background: 'default' | 'alt' | 'dark';
}

export const MockupBlock = (p: MockupProps) => (
  <section
    className={cx('section', p.background === 'alt' && 'section-alt')}
    style={p.background === 'dark' ? { background: 'var(--encre)', paddingTop: 48, paddingBottom: 48 } : { paddingTop: 40, paddingBottom: 40 }}
  >
    <div className="wrap fade-in" dangerouslySetInnerHTML={{ __html: MOCKUPS[p.mockup] ?? '' }} />
  </section>
);

// ── Espaceur ────────────────────────────────────────────────────────────────────

export const SpacerBlock = ({ height }: { height: number }) => <div style={{ height: height || 40 }} />;

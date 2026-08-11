import { Link } from 'react-router-dom';
import { PricingSection } from '@/components/landing/PricingSection';
import { MOCKUPS } from './mockups';

/**
 * Composants des blocs Puck — rendus avec les classes du CSS scopé
 * .qayed-landing (src/cms/siteCss.ts). Le RTL est géré par le dir global posé
 * sur <html> par i18n.
 *
 * Règle de la refonte : aucun emoji, aucun pictogramme par défaut. La
 * hiérarchie passe par la typographie (numérotation 01/02/03, petites
 * capitales monospace) et par des filets de 1px.
 */

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

const sectionClass = (background?: string) => cx('section', background === 'alt' && 'section-alt');

/** Numérotation typographique : 1 → « 01 ». */
const ordinal = (i: number) => String(i + 1).padStart(2, '0');

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
}

export const HeroBlock = (p: HeroProps) => (
  <section className="hero on-encre">
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
        {p.arabicLine && <p className="hero-ar" lang="ar" dir="rtl">{p.arabicLine}</p>}
        <p className="hero-desc">{p.description}</p>
        <div className="hero-actions">
          <SmartLink href={p.primaryHref} className="btn btn-primary">{p.primaryLabel}</SmartLink>
          {p.secondaryLabel && p.secondaryHref && (
            <SmartLink href={p.secondaryHref} className="btn btn-ghost-dark">{p.secondaryLabel}</SmartLink>
          )}
        </div>
      </div>
      {p.mockup !== 'none' && MOCKUPS[p.mockup] && (
        <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOCKUPS[p.mockup] }} />
      )}
    </div>
  </section>
);

// ── Bande de confiance ──────────────────────────────────────────────────────────

export interface TrustBarProps {
  items: { text: string }[];
}

export const TrustBarBlock = (p: TrustBarProps) => (
  <div className="trust-bar">
    {p.items.map((it, i) => (
      <span key={i} style={{ display: 'contents' }}>
        <div className="trust-item">{it.text}</div>
        {i < p.items.length - 1 && <div className="trust-divider"></div>}
      </span>
    ))}
  </div>
);

// ── Bandeau de chiffres ─────────────────────────────────────────────────────────

export interface StatsBarProps {
  items: { num: string; sup?: string; label: string }[];
  background: 'default' | 'alt';
}

export const StatsBarBlock = (p: StatsBarProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 56, paddingBottom: 56 }}>
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
      <h2 className="section-h2 fade-in" style={p.centered ? { textAlign: 'center', marginInline: 'auto' } : undefined}>{withBreaks(p.title)}</h2>
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
    <div className="wrap wrap-text">
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
        ? <img src={p.url} alt={p.alt} style={{ maxWidth: Math.min(p.maxWidth || 800, 1100), width: '100%' }} loading="lazy" />
        : <div style={{ padding: 40, border: '1px dashed var(--ligne)', color: 'var(--fiche)' }}>Image — renseignez une URL (bibliothèque de médias)</div>}
    </div>
  </section>
);

// ── Liste de définitions (fonctionnalités / cibles) ─────────────────────────────

export interface DefinitionListProps {
  items: { title: string; text: string }[];
  columns: 'one' | 'two';
  note?: string;
  background: 'default' | 'alt';
}

export const DefinitionListBlock = (p: DefinitionListProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 24 }}>
    <div className="wrap">
      <dl className={cx('def-grid fade-in', p.columns === 'one' && 'one-col')}>
        {p.items.map((it, i) => (
          <div key={i} className="def-item">
            <dt className="def-title">{it.title}</dt>
            <dd className="def-text">{it.text}</dd>
          </div>
        ))}
      </dl>
      {p.note && <p className="def-note fade-in">{p.note}</p>}
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
  <section className={sectionClass(p.background)} style={{ paddingTop: 24 }}>
    <div className="wrap">
      <div className={cx(p.showScreens && 'flow-grid')}>
        <ol className="num-list fade-in">
          {p.items.map((it, i) => (
            <li key={i} className="num-item">
              <span className="num-idx" aria-hidden="true">{ordinal(i)}</span>
              <div>
                <div className="num-title">{it.title}</div>
                <p className="num-text">{it.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {p.showScreens && MOCKUPS['flow-validation'] && (
          <div className="fade-in" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOCKUPS['flow-validation'] }} />
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
            <p key={i} style={{ fontSize: 16, color: 'var(--texte-sec)', lineHeight: 1.7, marginBottom: 20 }}>{para}</p>
          ))}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <span className="badge b-ok"><span className="dot"></span>Actif</span>
            <span className="badge b-done"><span className="dot"></span>Terminé</span>
          </div>
        </div>
        <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOCKUPS['fiche-visual'] ?? '' }} />
      </div>
    </div>
  </section>
);

// ── Conformité (section encre, points numérotés) ───────────────────────────────

export interface ComplianceProps {
  anchor?: string;
  eyebrow: string;
  title: string;
  lead: string;
  items: { title: string; text: string }[];
  note?: string;
}

export const ComplianceBlock = (p: ComplianceProps) => (
  <section className="conf on-encre" id={p.anchor || undefined}>
    <div className="wrap">
      <div className="conf-grid">
        <div>
          <div className="eyebrow fade-in" style={{ color: 'var(--cachet-sombre)' }}>{p.eyebrow}</div>
          <h2 className="section-h2 fade-in">{withBreaks(p.title)}</h2>
          {p.lead && <p className="conf-lead fade-in">{p.lead}</p>}
        </div>
        <div>
          <ol className="conf-list fade-in">
            {p.items.map((it, i) => (
              <li key={i} className="conf-item">
                <span className="conf-idx" aria-hidden="true">{ordinal(i)}</span>
                <div>
                  <div className="conf-title">{it.title}</div>
                  <p className="conf-text">{it.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {p.note && <p className="conf-note fade-in">{p.note}</p>}
        </div>
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

// ── FAQ ─────────────────────────────────────────────────────────────────────────

export interface FaqProps {
  items: { question: string; answer: string }[];
  background: 'default' | 'alt';
}

export const FaqBlock = (p: FaqProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 24 }}>
    <div className="wrap wrap-text">
      {p.items.map((it, i) => (
        <details key={i} className="faq-item">
          <summary>{it.question}</summary>
          <p>{it.answer}</p>
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
  <div className="cta-band on-encre" id={p.anchor || undefined}>
    <div className="wrap">
      <h2 className="cta-h2">{withBreaks(p.title)}</h2>
      {p.text && <p className="cta-sub">{p.text}</p>}
      <SmartLink href={p.buttonHref} className="btn btn-white">{p.buttonLabel}</SmartLink>
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
    className={cx('section', p.background === 'alt' && 'section-alt', p.background === 'dark' && 'on-encre')}
    style={p.background === 'dark' ? { background: 'var(--encre)', paddingTop: 48, paddingBottom: 48 } : { paddingTop: 40, paddingBottom: 40 }}
  >
    <div className="wrap fade-in" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOCKUPS[p.mockup] ?? '' }} />
  </section>
);

// ── Prose (pages légales / contenu long) ───────────────────────────────────────

export interface ProseProps {
  title?: string;
  text: string;
  background: 'default' | 'alt';
}

export const ProseBlock = (p: ProseProps) => (
  <section className={sectionClass(p.background)} style={{ paddingTop: 18, paddingBottom: 18 }}>
    <div className="wrap wrap-text">
      {p.title && (
        <h3 style={{ fontFamily: 'var(--font-d)', fontVariationSettings: "'wdth' 112", fontWeight: 800, fontSize: 20, color: 'var(--encre)', marginBottom: 10 }}>
          {p.title}
        </h3>
      )}
      {p.text.split(/\n{2,}/).map((para, i) => (
        para.startsWith('- ')
          ? (
            <ul key={i} style={{ margin: '0 0 12px', paddingInlineStart: 22, display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'disc' }}>
              {para.split('\n').map((line, j) => (
                <li key={j} style={{ fontSize: 15, color: 'var(--texte-sec)', lineHeight: 1.7 }}>{line.replace(/^- /, '')}</li>
              ))}
            </ul>
          )
          : <p key={i} style={{ fontSize: 15, color: 'var(--texte-sec)', lineHeight: 1.7, marginBottom: 12 }}>{para}</p>
      ))}
    </div>
  </section>
);

// ── Espaceur ────────────────────────────────────────────────────────────────────

export const SpacerBlock = ({ height }: { height: number }) => <div style={{ height: height || 40 }} />;

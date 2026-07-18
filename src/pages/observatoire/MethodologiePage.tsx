import { useTranslation } from 'react-i18next';
import { ShieldCheck, Database, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import { TourismeLayout } from '@/components/layout/TourismeLayout';
import { Card } from '@/components/ui/Card';
import i18n from '@/i18n';

/**
 * Ecran 6 — Methodologie. Page statique bilingue (FR/AR) : sources, definitions,
 * seuil k=10 et son pourquoi, frequence de mise a jour, limites de
 * representativite. Transparence = argument institutionnel (§4, ecran 6) —
 * traitee comme un contenu de premier plan, pas une annexe. Aucun emoji.
 */
export function MethodologiePage() {
  const { t } = useTranslation();
  const rtl = (i18n.resolvedLanguage ?? 'fr') === 'ar';

  const Section = ({ icon: Icon, titleKey, children }: { icon: React.ElementType; titleKey: string; children: React.ReactNode }) => (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--qayed-cachet-dilue)' }}>
          <Icon className="h-4.5 w-4.5" style={{ color: 'var(--qayed-cachet)' }} />
        </div>
        <h2 className="qayed-display text-sm" style={{ color: 'var(--qayed-cachet)' }}>{t(titleKey)}</h2>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--qayed-encre)' }}>{children}</div>
    </Card>
  );

  return (
    <TourismeLayout title={t('observatoire.nav.methodology')}>
      <div className={`flex flex-col gap-4 ${rtl ? 'text-right' : ''}`}>
        <div className="rounded-card px-5 py-4" style={{ background: 'var(--qayed-encre)' }}>
          <p className="qayed-display text-white" style={{ fontSize: 16 }}>{t('observatoire.methodology.intro')}</p>
        </div>

        <Section icon={Database} titleKey="observatoire.methodology.sources.title">
          {t('observatoire.methodology.sources.body')}
        </Section>

        <Section icon={BookOpen} titleKey="observatoire.methodology.definitions.title">
          <ul className="list-disc space-y-1.5 ps-5">
            <li><b>{t('observatoire.methodology.definitions.arrivee')}</b></li>
            <li><b>{t('observatoire.methodology.definitions.nuitee')}</b></li>
            <li><b>{t('observatoire.methodology.definitions.sejourTermine')}</b></li>
            <li><b>{t('observatoire.methodology.definitions.dureeMoyenne')}</b></li>
          </ul>
        </Section>

        <Section icon={ShieldCheck} titleKey="observatoire.methodology.threshold.title">
          <p className="mb-2">{t('observatoire.methodology.threshold.body')}</p>
          <div className="rounded-input px-3 py-2" style={{ background: 'var(--qayed-cachet-dilue)' }}>
            <p className="text-xs" style={{ color: 'var(--qayed-cachet-fonce)' }}>
              {t('observatoire.methodology.threshold.why')}
            </p>
          </div>
        </Section>

        <Section icon={ShieldCheck} titleKey="observatoire.methodology.anonymity.title">
          {t('observatoire.methodology.anonymity.body')}
        </Section>

        <Section icon={Clock} titleKey="observatoire.methodology.frequency.title">
          {t('observatoire.methodology.frequency.body')}
        </Section>

        <Section icon={AlertTriangle} titleKey="observatoire.methodology.limits.title">
          {t('observatoire.methodology.limits.body')}
        </Section>
      </div>
    </TourismeLayout>
  );
}

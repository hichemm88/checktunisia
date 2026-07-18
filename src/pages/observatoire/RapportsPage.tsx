import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { TourismeLayout } from '@/components/layout/TourismeLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { observatoireApi } from '@/api/observatoire';
import { api } from '@/lib/api';

/** Liste des 12 derniers mois (format YYYY-MM). */
function derniersMois(n = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function RapportsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const moisDispo = derniersMois();
  const [mois, setMois] = useState(moisDispo[1]); // mois precedent par defaut

  const rapport = useQuery({
    queryKey: ['obs', 'rapport', mois],
    queryFn: () => observatoireApi.rapport(mois),
  });

  const generer = useMutation({
    mutationFn: () => observatoireApi.genererRapport(mois),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obs', 'rapport', mois] }),
  });

  const data = rapport.data;

  const telechargerPdf = async () => {
    // Via le client authentifie (en-tete Bearer) : une navigation directe ne
    // porterait pas le token.
    const res = await api.get(`/observatoire/v1/rapports/${mois}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <TourismeLayout title={t('observatoire.nav.reports')}>
      <div className="flex flex-col gap-5">
        {/* Selecteur + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select value={mois} onChange={(e) => setMois(e.target.value)}
                  className="input-field h-10 appearance-none bg-white pe-8 text-sm" style={{ maxWidth: 220 }}>
            {moisDispo.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <div className="flex items-center gap-2">
            {data && (
              <button onClick={telechargerPdf}
                      className="flex items-center gap-1.5 rounded-btn px-3 py-2 text-sm font-medium"
                      style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
                <Download className="h-4 w-4" /> {t('observatoire.reports.pdf')}
              </button>
            )}
            <Button variant="primary" loading={generer.isPending} onClick={() => generer.mutate()}>
              <RefreshCw className="me-1.5 h-4 w-4" />
              {data ? t('observatoire.reports.regenerate') : t('observatoire.reports.generate')}
            </Button>
          </div>
        </div>

        {rapport.isLoading && (
          <Card><p className="text-sm" style={{ color: 'var(--qayed-fiche)' }}>{t('common.loading')}</p></Card>
        )}

        {!rapport.isLoading && !data && (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10" style={{ color: 'var(--qayed-fiche)' }} />
            <p className="text-sm" style={{ color: 'var(--qayed-encre)' }}>{t('observatoire.reports.notYet')}</p>
            <p className="text-xs" style={{ color: 'var(--qayed-fiche)' }}>{t('observatoire.reports.notYetHint')}</p>
          </Card>
        )}

        {/* Rapport genere : arabe (premier, RTL) puis francais */}
        {data && (
          <>
            <Card>
              <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--qayed-ligne)' }}>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
                  العربية
                </span>
              </div>
              <article dir="rtl" className="prose-observatoire whitespace-pre-wrap text-sm leading-relaxed"
                       style={{ color: 'var(--qayed-encre)', fontFamily: 'var(--qayed-font-arabic)' }}>
                {data.html_ar}
              </article>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--qayed-ligne)' }}>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
                  Français
                </span>
              </div>
              <article className="prose-observatoire whitespace-pre-wrap text-sm leading-relaxed"
                       style={{ color: 'var(--qayed-encre)' }}>
                {data.html_fr}
              </article>
            </Card>
          </>
        )}
      </div>
    </TourismeLayout>
  );
}

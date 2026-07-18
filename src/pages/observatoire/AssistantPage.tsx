import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Send, Code2, ShieldCheck, Info } from 'lucide-react';
import { TourismeLayout } from '@/components/layout/TourismeLayout';
import { Card } from '@/components/ui/Card';
import { LineChart, HBarChart } from '@/components/observatoire/Charts';
import { observatoireApi, type IaReponse } from '@/api/observatoire';
import i18n from '@/i18n';

interface Echange { question: string; reponse?: IaReponse; erreur?: boolean }

const EXEMPLES_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];

export function AssistantPage() {
  const { t } = useTranslation();
  const langue = i18n.resolvedLanguage ?? 'fr';
  const [question, setQuestion] = useState('');
  const [echanges, setEchanges] = useState<Echange[]>([]);

  const mut = useMutation({
    mutationFn: (q: string) => observatoireApi.question(q),
    onSuccess: (rep, q) => {
      setEchanges((e) => e.map((x) => (x.question === q && !x.reponse ? { ...x, reponse: rep } : x)));
    },
    onError: (_e, q) => {
      setEchanges((e) => e.map((x) => (x.question === q && !x.reponse ? { ...x, erreur: true } : x)));
    },
  });

  const poser = (q: string) => {
    const question = q.trim();
    if (!question || mut.isPending) return;
    setEchanges((e) => [...e, { question }]);
    setQuestion('');
    mut.mutate(question);
  };

  return (
    <TourismeLayout title={t('observatoire.nav.assistant')}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {/* Bandeau de garanties */}
        <div className="flex items-start gap-3 rounded-card border px-4 py-3"
             style={{ background: 'var(--qayed-cachet-dilue)', borderColor: 'var(--qayed-ligne)' }}>
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--qayed-cachet)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--qayed-encre)' }}>
            {t('observatoire.assistant.guarantee')}
          </p>
        </div>

        {/* Exemples (si aucun echange) */}
        {echanges.length === 0 && (
          <Card>
            <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('observatoire.assistant.examplesTitle')}
            </p>
            <div className="flex flex-col gap-2">
              {EXEMPLES_KEYS.map((k) => (
                <button key={k} onClick={() => poser(t(`observatoire.assistant.examples.${k}`))}
                        className="rounded-btn border px-3 py-2 text-start text-sm transition-colors hover:bg-[var(--qayed-cachet-dilue)]"
                        style={{ borderColor: 'var(--qayed-ligne)', color: 'var(--qayed-encre)' }}>
                  {t(`observatoire.assistant.examples.${k}`)}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Fil de discussion */}
        <div className="flex flex-col gap-4">
          {echanges.map((ech, i) => (
            <div key={i} className="flex flex-col gap-2">
              {/* Question */}
              <div className="self-end rounded-card rounded-te-sm px-4 py-2 text-sm text-white"
                   style={{ background: 'var(--qayed-cachet)', maxWidth: '85%' }}>
                {ech.question}
              </div>
              {/* Reponse */}
              {ech.reponse ? <ReponseBloc rep={ech.reponse} langue={langue} />
                : ech.erreur ? (
                  <div className="self-start rounded-card px-4 py-2 text-sm"
                       style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}>
                    {t('observatoire.assistant.error')}
                  </div>
                ) : (
                  <div className="self-start rounded-card px-4 py-2 text-sm"
                       style={{ background: 'white', color: 'var(--qayed-fiche)' }}>
                    {t('common.loading')}
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* Saisie */}
        <form onSubmit={(e) => { e.preventDefault(); poser(question); }}
              className="sticky bottom-4 flex items-center gap-2 rounded-card border bg-white p-2 shadow-card"
              style={{ borderColor: 'var(--qayed-ligne)' }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('observatoire.assistant.placeholder')}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            style={{ color: 'var(--qayed-encre)' }}
          />
          <button type="submit" disabled={mut.isPending || !question.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-btn disabled:opacity-40"
                  style={{ background: 'var(--qayed-cachet)' }} aria-label={t('observatoire.assistant.send')}>
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>
    </TourismeLayout>
  );
}

// ─── Bloc reponse ───────────────────────────────────────────────────────────
function ReponseBloc({ rep, langue }: { rep: IaReponse; langue: string }) {
  const { t } = useTranslation();
  const [voirSql, setVoirSql] = useState(false);

  return (
    <div className="self-start rounded-card bg-white px-4 py-3 shadow-card" style={{ maxWidth: '95%' }}>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--qayed-encre)' }}>{rep.reponse}</p>

      {/* Visualisation auto si donnees disponibles */}
      {rep.ok && rep.donnees && rep.donnees.length > 0 && (
        <div className="mt-3">
          <IaVisualisation rep={rep} langue={langue} />
        </div>
      )}

      {/* Donnees partielles sous le seuil */}
      {rep.sous_seuil && (
        <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--qayed-vigilance-texte)' }}>
          <Info className="h-3.5 w-3.5" /> {t('observatoire.assistant.partialThreshold')}
        </p>
      )}

      {/* Tracabilite : voir la requete + query_id */}
      <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--qayed-ligne)' }}>
        {rep.sql ? (
          <button onClick={() => setVoirSql((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--qayed-cachet)' }}>
            <Code2 className="h-3.5 w-3.5" /> {t('observatoire.assistant.showQuery')}
          </button>
        ) : <span />}
        <span className="font-mono text-[10px]" style={{ color: 'var(--qayed-fiche)' }} title={t('observatoire.assistant.queryId')}>
          {rep.query_id.slice(0, 8)}
        </span>
      </div>

      {voirSql && rep.sql && (
        <pre className="mt-2 overflow-x-auto rounded-input p-3 text-[11px]"
             style={{ background: 'var(--qayed-encre)', color: '#C4BFB4' }}>
          <code>{rep.sql}</code>
        </pre>
      )}
    </div>
  );
}

// ─── Visualisation auto ─────────────────────────────────────────────────────
function IaVisualisation({ rep, langue }: { rep: IaReponse; langue: string }) {
  const donnees = rep.donnees ?? [];
  const cols = Object.keys(donnees[0] ?? {});

  // Detecte une colonne temporelle et une mesure pour les graphiques.
  const colTemps = cols.find((c) => /date|periode|jour|mois|semaine/i.test(c));
  const colMesure = cols.find((c) => /arriv|nuit|present|nb|total|count|duree/i.test(c));
  const colLabel = cols.find((c) => /nat|zone|type|nom|label/i.test(c)) ?? cols[0];

  if (rep.visualisation === 'ligne' && colTemps && colMesure) {
    return <LineChart height={180} points={donnees.map((d) => ({
      periode: String(d[colTemps]),
      arrivees: Number(d[colMesure]) || 0,
      nuitees: 0,
    }))} />;
  }

  if ((rep.visualisation === 'barres') && colLabel && colMesure) {
    return <HBarChart langue={langue} items={donnees.slice(0, 15).map((d) => ({
      label: String(d[colLabel]), value: Number(d[colMesure]) || 0,
    }))} />;
  }

  if (rep.visualisation === 'kpi' && colMesure) {
    return (
      <p className="text-2xl font-bold" style={{ color: 'var(--qayed-cachet)' }}>
        {String(donnees[0]?.[colMesure] ?? '—')}
      </p>
    );
  }

  // Tableau par defaut.
  return (
    <div className="overflow-x-auto rounded-input border" style={{ borderColor: 'var(--qayed-ligne)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--qayed-papier)' }}>
            {cols.map((c) => <th key={c} className="px-2 py-1.5 text-start font-medium" style={{ color: 'var(--qayed-fiche)' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {donnees.slice(0, 20).map((d, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'var(--qayed-ligne)' }}>
              {cols.map((c) => <td key={c} className="px-2 py-1.5" style={{ color: 'var(--qayed-encre)' }}>{String(d[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

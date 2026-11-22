import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CINCapture } from '@/components/hotel/CINCapture';
import { GuestForm } from '@/components/widget/GuestForm';
import { ficheWidgetApi, setWidgetToken, extractWidgetError } from '@/api/widget/ficheWidget';
import type { BootstrapResponse, GuestInput } from '@/api/widget/ficheWidget';
import { cn } from '@/lib/cn';
import { defaultScanType, flowProgress, guestFromPrefill, mergeExtracted, safeSession } from './widgetFlow';

/**
 * Widget « scanner et valider » : la réception ouvre directement l'écran de
 * scan du premier voyageur restant, vérifie les champs lus, puis passe au
 * suivant ; le dernier voyageur attendu valide la fiche. Un seul bouton plein
 * par écran, dans une barre basse qui suit la zone visible (clavier compris).
 */

interface DeclaredGuest {
  id: string;
  first_name: string;
  last_name: string;
  removable: boolean;
}

type ScanType = 'cin' | 'passport';

/** Session mise en cache le temps de l'onglet : un rechargement ne redemande jamais le JWT (usage unique). */
const sessionCacheKey = (jwt: string) => `qayed-widget-session:${jwt}`;
const FORM_ID = 'qayed-widget-guest';

const postToParent = (message: Record<string, unknown>) => {
  try {
    window.parent.postMessage(message, '*');
  } catch {
    /* pas de parent (widget ouvert seul) */
  }
};

/** Hauteur réellement visible (clavier virtuel déduit) exposée en variable CSS. */
const useVisibleHeight = () => {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => document.documentElement.style.setProperty('--qw-vh', `${vv.height}px`);
    apply();
    vv.addEventListener('resize', apply);
    return () => vv.removeEventListener('resize', apply);
  }, []);
};

const formatDay = (iso: string | null, locale: string) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
};

const withDocType = (g: GuestInput, scanType: ScanType): GuestInput => ({
  ...g,
  document: { ...g.document, type: scanType === 'cin' ? 'national_id' : 'passport' },
});

export const FicheWidgetPage = ({ token }: { token: string }) => {
  const { t, i18n } = useTranslation();
  useVisibleHeight();

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error' | 'submitted'>('loading');
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [guests, setGuests] = useState<DeclaredGuest[]>([]);
  const [target, setTarget] = useState(1);
  const [dates, setDates] = useState({ arrival: '', departure: '' });
  const [editingDates, setEditingDates] = useState(false);

  const [step, setStep] = useState<'scan' | 'reading' | 'review'>('scan');
  const [scanType, setScanType] = useState<ScanType>('passport');
  const [capturing, setCapturing] = useState(false);
  const [draft, setDraft] = useState<GuestInput | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ session_id: string; fiche_id: string; guest_count: number } | null>(null);

  const prefillAt = (n: number) => bootstrap?.prefill_guests[n];

  /** Ouvre l'écran de scan du voyageur de rang n (0-based). */
  const startGuest = (n: number, data: BootstrapResponse | null = bootstrap) => {
    setStep('scan');
    setScanType(defaultScanType(data?.prefill_guests[n]));
    setDraft(null);
    setScanId(null);
    setNotice(null);
  };

  useEffect(() => {
    if (!token) {
      setFatalError(t('widget.genericError'));
      setPhase('error');
      return;
    }
    const cacheKey = sessionCacheKey(token);
    const boot = async () => {
      try {
        const cached = safeSession.get(cacheKey);
        let data: BootstrapResponse;
        if (cached) {
          data = JSON.parse(cached) as BootstrapResponse;
        } else {
          data = await ficheWidgetApi.bootstrap(token);
          safeSession.set(cacheKey, JSON.stringify(data));
        }
        setWidgetToken(data.widget_token);
        const locale = ['fr', 'ar', 'en'].includes(data.locale) ? data.locale : 'fr';
        void i18n.changeLanguage(locale);
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

        const existing = data.mode === 'amend'
          ? data.existing_guests.map((g) => ({ id: g.id, first_name: g.first_name, last_name: g.last_name, removable: false }))
          : [];
        setGuests(existing);
        // En amend, on vient toujours ajouter au moins un voyageur.
        setTarget(Math.max(data.expected_guest_count || 1, data.mode === 'amend' ? existing.length + 1 : 1));
        setDates({ arrival: data.arrival_date ?? '', departure: data.departure_date ?? '' });
        setBootstrap(data);
        startGuest(existing.length, data);
        setPhase('ready');
      } catch (err) {
        const { code, message } = extractWidgetError(err);
        setFatalError(message);
        setPhase('error');
        postToParent({ type: 'qayed:error', code });
      }
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Confirmation visible environ une seconde avant de prévenir le parent.
  useEffect(() => {
    if (phase !== 'submitted' || !result) return;
    const timer = window.setTimeout(() => postToParent({ type: 'qayed:submitted', ...result }), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, result]);

  const declared = guests.length;
  const addedHere = guests.filter((g) => g.removable).length;
  const progress = flowProgress(declared, addedHere, target);
  const allDeclared = declared >= target;

  const handleCapture = async (blob: Blob) => {
    setCapturing(false);
    setStep('reading');
    setNotice(null);
    const base = withDocType(guestFromPrefill(prefillAt(declared), scanType), scanType);
    try {
      const read = await ficheWidgetApi.readDocument(blob, scanType);
      if (read.status === 'completed') {
        setDraft(mergeExtracted(base, read.extracted));
        setScanId(read.scan_id);
        setNotice({ text: t('widget.checkFields'), tone: 'info' });
      } else {
        setDraft(base);
        setNotice({ text: t('widget.scanFailed'), tone: 'error' });
      }
    } catch {
      setDraft(base);
      setNotice({ text: t('widget.scanFailed'), tone: 'error' });
    }
    setStep('review');
  };

  const openManual = () => {
    setDraft(guestFromPrefill(prefillAt(declared), scanType));
    setScanId(null);
    setNotice(null);
    setStep('review');
  };

  const submitFiche = async () => {
    if (!bootstrap) return;
    setBusy(true);
    setNotice(null);
    try {
      const body: { arrival_date?: string; departure_date?: string } = {};
      if (bootstrap.mode === 'create') {
        if (dates.arrival && dates.arrival !== bootstrap.arrival_date) body.arrival_date = dates.arrival;
        if (dates.departure && dates.departure !== bootstrap.departure_date) body.departure_date = dates.departure;
      }
      const res = await ficheWidgetApi.submit(body);
      safeSession.remove(sessionCacheKey(token));
      setResult(res);
      setPhase('submitted');
    } catch (err) {
      setNotice({ text: extractWidgetError(err).message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const addCurrentGuest = async () => {
    if (!draft) return;
    setBusy(true);
    setNotice(null);
    let added;
    try {
      added = await ficheWidgetApi.addGuest(scanId ? { ...draft, scan_id: scanId } : draft);
    } catch (err) {
      setNotice({ text: extractWidgetError(err).message, tone: 'error' });
      setBusy(false);
      return;
    }
    setGuests((g) => [...g, { id: added.id, first_name: added.first_name, last_name: added.last_name, removable: true }]);
    startGuest(declared + 1);
    setBusy(false);
    if (progress.isLast) await submitFiche();
  };

  const removeGuest = async (id: string) => {
    try {
      await ficheWidgetApi.removeGuest(id);
      setGuests((g) => g.filter((x) => x.id !== id));
      if (step === 'scan') startGuest(declared - 1);
    } catch (err) {
      setNotice({ text: extractWidgetError(err).message, tone: 'error' });
    }
  };

  const close = () => postToParent({ type: 'qayed:closed', session_id: bootstrap?.session_id });

  const shell = 'flex flex-col overflow-x-hidden bg-qayed-papier';
  const shellStyle = {
    height: 'var(--qw-vh, 100dvh)',
    paddingTop: 'env(safe-area-inset-top)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  };

  if (phase === 'loading') {
    return (
      <div className={cn(shell, 'items-center justify-center')} style={shellStyle}>
        <Loader2 className="h-6 w-6 animate-spin text-qayed-cachet" aria-hidden="true" />
        <p className="mt-2 text-sm text-qayed-fiche">{t('widget.loading')}</p>
      </div>
    );
  }

  if (phase === 'error' || phase === 'submitted') {
    const ok = phase === 'submitted';
    return (
      <div className={cn(shell, 'items-center justify-center gap-3 px-6 text-center')} style={shellStyle} role={ok ? 'status' : 'alert'}>
        {ok && (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-qayed-conforme-fond">
            <Check className="h-7 w-7 text-qayed-conforme-texte" aria-hidden="true" />
          </div>
        )}
        <h1 className="font-display text-lg font-bold text-qayed-encre">{ok ? t('widget.submitted') : t('widget.errorTitle')}</h1>
        <p className="text-sm text-qayed-fiche">{ok ? t('widget.submittedBody') : fatalError}</p>
        <Button variant="link" onClick={close}>{t('widget.close')}</Button>
      </div>
    );
  }

  if (!bootstrap) return null;

  const locale = i18n.language;
  const arrival = formatDay(dates.arrival || null, locale);
  const departure = formatDay(dates.departure || null, locale);
  const slots = Array.from({ length: Math.max(target, declared) }, (_, i) => {
    const g = guests[i];
    const p = bootstrap.prefill_guests[i];
    const name = g ? `${g.first_name} ${g.last_name}` : [p?.first_name, p?.last_name].filter(Boolean).join(' ');
    return { key: g?.id ?? `slot-${i}`, guest: g, name: name || t('widget.guestN', { n: i + 1 }), current: !g && i === declared };
  });
  const currentPrefill = prefillAt(declared);
  const currentName = [currentPrefill?.first_name, currentPrefill?.last_name].filter(Boolean).join(' ');

  return (
    <div className={shell} style={shellStyle}>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {/* Bandeau compact : séjour, chambre, voyageurs attendus */}
        <header className="space-y-2 border-b border-qayed-ligne bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-qayed-fiche">{bootstrap.establishment_name}</p>
            <span className="shrink-0 rounded-full bg-qayed-cachet-dilue px-2.5 py-1 text-xs font-bold text-qayed-cachet">
              {t('widget.counter', { current: Math.min(progress.current, target), total: target })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 text-sm text-qayed-encre">
            <span>
              {arrival || departure ? <>{arrival ?? '?'} <span aria-hidden="true">-</span> {departure ?? '?'}</> : t('widget.noDates')}
            </span>
            {bootstrap.room && <span>{t('widget.room')} {bootstrap.room}</span>}
            {bootstrap.mode === 'create' && (
              <Button variant="link" size="sm" className="!px-0" onClick={() => setEditingDates((v) => !v)} aria-expanded={editingDates}>
                {editingDates ? t('widget.doneDates') : t('widget.editDates')}
              </Button>
            )}
          </div>
          {editingDates && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" label={t('widget.arrival')} value={dates.arrival} onChange={(e) => setDates((d) => ({ ...d, arrival: e.target.value }))} />
              <Input type="date" label={t('widget.departure')} value={dates.departure} min={dates.arrival || undefined} onChange={(e) => setDates((d) => ({ ...d, departure: e.target.value }))} />
            </div>
          )}
          {bootstrap.mode === 'amend' && <p className="text-xs font-medium text-qayed-vigilance-texte">{t('widget.amendBanner')}</p>}
          <ul className="flex flex-wrap items-center gap-1.5">
            {slots.map((s) => (
              <li
                key={s.key}
                className={cn(
                  'flex min-h-[32px] max-w-full items-center gap-1 rounded-full border px-2.5 text-xs',
                  s.guest ? 'border-qayed-conforme-texte/30 bg-qayed-conforme-fond text-qayed-conforme-texte'
                    : s.current ? 'border-qayed-cachet text-qayed-cachet' : 'border-qayed-ligne text-qayed-fiche',
                )}
              >
                {s.guest && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                <span className="truncate">{s.name}</span>
                {s.guest?.removable && (
                  <button
                    type="button"
                    onClick={() => removeGuest(s.guest!.id)}
                    aria-label={t('widget.remove', { name: s.name })}
                    className="-me-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
            <li>
              <Button variant="link" size="sm" onClick={() => setTarget((n) => n + 1)}>{t('widget.addGuest')}</Button>
            </li>
          </ul>
        </header>

        <section className="space-y-4 px-4 py-4">
          {allDeclared && step === 'scan' ? (
            <p className="text-sm text-qayed-encre">{t('widget.allDeclared')}</p>
          ) : (
            <h1 className="font-display text-lg font-bold text-qayed-encre">
              {t('widget.guestN', { n: progress.current })}
              {currentName && <span className="ms-2 font-normal text-qayed-fiche">{currentName}</span>}
            </h1>
          )}

          {notice && (
            <p
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm',
                notice.tone === 'error'
                  ? 'border-qayed-erreur bg-white text-qayed-erreur-texte'
                  : 'border-qayed-ligne bg-white text-qayed-fiche',
              )}
            >
              {notice.text}
            </p>
          )}

          {step === 'scan' && !allDeclared && (
            <div className="space-y-3">
              <div role="group" aria-label={t('widget.documentKind')} className="inline-flex rounded-btn border border-qayed-ligne bg-white p-1">
                {(['cin', 'passport'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={scanType === type}
                    onClick={() => setScanType(type)}
                    className={cn(
                      'min-h-[44px] rounded-btn px-4 text-sm font-semibold',
                      scanType === type ? 'bg-qayed-encre text-white' : 'text-qayed-fiche',
                    )}
                  >
                    {type === 'cin' ? t('widget.docCin') : t('widget.docPassport')}
                  </button>
                ))}
              </div>
              <p className="text-sm text-qayed-fiche">{t('widget.scanHint')}</p>
            </div>
          )}

          {step === 'reading' && (
            <p className="flex items-center gap-2 text-sm text-qayed-fiche" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('widget.reading')}
            </p>
          )}

          {step === 'review' && draft && (
            <GuestForm formId={FORM_ID} guest={draft} onChange={setDraft} onSubmit={addCurrentGuest} />
          )}
        </section>
      </main>

      {/* Barre basse : un seul bouton plein, toujours visible au-dessus du clavier */}
      <footer
        className="border-t border-qayed-ligne bg-white px-4 pt-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {step === 'review' ? (
          <Button type="submit" form={FORM_ID} fullWidth loading={busy}>
            {busy ? t('widget.submitting') : progress.isLast ? t('widget.submit') : t('widget.nextGuest')}
          </Button>
        ) : allDeclared ? (
          <Button fullWidth loading={busy} onClick={submitFiche}>
            {busy ? t('widget.submitting') : t('widget.submit')}
          </Button>
        ) : (
          <Button fullWidth loading={step === 'reading'} onClick={() => setCapturing(true)}>
            {scanType === 'cin' ? t('widget.scanCin') : t('widget.scanPassport')}
          </Button>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4">
          {step === 'scan' && !allDeclared && (
            <Button variant="link" size="sm" onClick={openManual}>{t('widget.manualEntry')}</Button>
          )}
          {step === 'review' && (
            <Button variant="link" size="sm" disabled={busy} onClick={() => startGuest(declared)}>{t('widget.rescan')}</Button>
          )}
          {step === 'scan' && progress.canSubmitPartial && (
            <Button variant="link" size="sm" disabled={busy} onClick={submitFiche}>
              {t('widget.submitPartial', { count: declared, total: target })}
            </Button>
          )}
        </div>
      </footer>

      {capturing && (
        <CINCapture
          variant={scanType === 'passport' ? 'mrz' : 'cin'}
          onCapture={handleCapture}
          onClose={() => setCapturing(false)}
        />
      )}
    </div>
  );
};

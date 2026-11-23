import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CINCapture } from '@/components/hotel/CINCapture';
import { GuestFields, ScanEntryCards, ScanReading, type FieldConfidence, type GuestForm } from '@/components/hotel/GuestScanParts';
import { ficheWidgetApi, setWidgetToken, extractWidgetError } from '@/api/widget/ficheWidget';
import type { BootstrapResponse } from '@/api/widget/ficheWidget';
import { cn } from '@/lib/cn';
import {
  READING_TIMEOUT_MS, applyExtracted, formFromPrefill, initialTarget, openingStep, safeSession,
  toGuestInput, widgetBlockers, type Extracted, type ScanKind,
} from './widgetFlow';

/**
 * Widget partenaire : même parcours que l'écran Check-in de l'application.
 * Il s'ouvre sur le scan du prochain voyageur à déclarer (compteur « 2 sur
 * 3 », voyageurs déjà saisis repliés au-dessus), que la fiche soit neuve, un
 * brouillon repris ou une fiche déjà transmise que l'on complète. Un seul
 * bouton plein par écran : « Enregistrer ce voyageur » pendant la saisie,
 * « Valider la fiche » sur la liste.
 */

interface DeclaredGuest {
  id: string;
  first_name: string;
  last_name: string;
  is_primary: boolean;
  removable: boolean;
}

type Step = 'scan' | 'reading' | 'slow' | 'review' | 'list';

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
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
};

const fullName = (g: { first_name?: string; last_name?: string } | undefined) =>
  [g?.first_name, g?.last_name].filter(Boolean).join(' ');

export const FicheWidgetPage = ({ token }: { token: string }) => {
  const { t, i18n } = useTranslation();
  useVisibleHeight();

  const [phase, setPhase] = useState<'loading' | 'locked' | 'takenOver' | 'ready' | 'error' | 'submitted'>('loading');
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [lockedBy, setLockedBy] = useState<string>('');
  const [takenOverBy, setTakenOverBy] = useState<string>('');
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [guests, setGuests] = useState<DeclaredGuest[]>([]);
  const [target, setTarget] = useState(1);
  const [dates, setDates] = useState({ arrival: '', departure: '' });
  const [editingDates, setEditingDates] = useState(false);

  const [step, setStep] = useState<Step>('scan');
  const [capture, setCapture] = useState<ScanKind | null>(null);
  const [scanKind, setScanKind] = useState<ScanKind | 'manual'>('manual');
  const [form, setForm] = useState<GuestForm>({});
  const [conf, setConf] = useState<FieldConfidence | null>(null);
  const [mrz, setMrz] = useState<Extracted['mrz']>({});
  const [scanId, setScanId] = useState<string | null>(null);
  const [readOk, setReadOk] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ session_id: string; fiche_id: string; guest_count: number } | null>(null);

  // Lecture en cours : identifiant de la requête valable (une réponse tardive
  // d'une lecture abandonnée est ignorée) et dernière photo, pour « Réessayer ».
  const readRequest = useRef(0);
  const lastCapture = useRef<{ blob: Blob; kind: ScanKind } | null>(null);

  const declared = guests.length;
  const addedHere = guests.filter((g) => g.removable).length;
  const prefillAt = (n: number) => bootstrap?.prefill_guests[n];

  /** Écran de scan du voyageur de rang n (0-based). */
  const startGuest = () => {
    readRequest.current += 1;
    setStep('scan');
    setScanKind('manual');
    setForm({});
    setConf(null);
    setMrz({});
    setScanId(null);
    setReadOk(null);
    setNotice(null);
  };

  /** Saisie reprise par un collègue : plus aucune action possible ici. */
  const showError = (err: unknown) => {
    const e = extractWidgetError(err);
    if (e.code === 'session_taken_over') {
      setTakenOverBy(e.takenOverBy ?? '');
      setPhase('takenOver');
      return;
    }
    setNotice(e.message);
  };

  const boot = async (takeover = false) => {
    if (!token) {
      setFatalError(t('widget.genericError'));
      setPhase('error');
      return;
    }
    const cacheKey = sessionCacheKey(token);
    setPhase('loading');
    try {
      const cached = takeover ? null : safeSession.get(cacheKey);
      let data: BootstrapResponse;
      if (cached) {
        data = JSON.parse(cached) as BootstrapResponse;
      } else {
        data = await ficheWidgetApi.bootstrap(token, takeover);
        // Une fiche verrouillée n'a rien consommé : on pourra réessayer avec ce lien.
        if (data.widget_token) safeSession.set(cacheKey, JSON.stringify(data));
      }
      const locale = ['fr', 'ar', 'en'].includes(data.locale) ? data.locale : 'fr';
      void i18n.changeLanguage(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      setBootstrap(data);
      setDates({ arrival: data.arrival_date ?? '', departure: data.departure_date ?? '' });

      if (!data.widget_token) {
        setLockedBy(data.locked_by ?? '');
        setPhase('locked');
        return;
      }
      setWidgetToken(data.widget_token);
      // Page rechargée : on reprend le verrou (libéré à la fermeture), ou on
      // apprend qu'un collègue a repris la saisie entre-temps.
      if (cached) await ficheWidgetApi.touchLock();

      const existing = data.existing_guests.map((g) => ({
        id: g.id, first_name: g.first_name, last_name: g.last_name, is_primary: g.is_primary, removable: g.removable,
      }));
      const tgt = initialTarget(data.expected_guest_count, existing.length, data.mode);
      setGuests(existing);
      setTarget(tgt);
      startGuest();
      setStep(openingStep(existing.length, tgt));
      setPhase('ready');
    } catch (err) {
      const { code, message, takenOverBy: by } = extractWidgetError(err);
      if (code === 'session_taken_over') {
        setTakenOverBy(by ?? '');
        setPhase('takenOver');
        return;
      }
      setFatalError(message);
      setPhase('error');
      postToParent({ type: 'qayed:error', code });
    }
  };

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Verrou de saisie vivant pendant la saisie : renouvelé par les actions
  // réelles (au plus une fois toutes les 30 s), vérifié sans le renouveler
  // toutes les 20 s pour voir une reprise par un collègue, libéré dès que la
  // page disparaît (iframe retirée, onglet fermé).
  useEffect(() => {
    if (phase !== 'ready') return;
    let last = Date.now();
    const onActivity = () => {
      if (Date.now() - last < 30_000) return;
      last = Date.now();
      ficheWidgetApi.touchLock().catch(showError);
    };
    const check = () => {
      if (document.visibilityState === 'visible') ficheWidgetApi.checkLock().catch(showError);
    };
    const release = () => ficheWidgetApi.releaseLock();
    const events = ['pointerdown', 'keydown', 'input'] as const;
    events.forEach((e) => document.addEventListener(e, onActivity, true));
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pagehide', release);
    const timer = window.setInterval(check, 20_000);
    return () => {
      events.forEach((e) => document.removeEventListener(e, onActivity, true));
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pagehide', release);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Navigation entre les écrans de saisie = action réelle.
  useEffect(() => {
    if (phase === 'ready') ficheWidgetApi.touchLock().catch(showError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Confirmation visible environ une seconde avant de prévenir le parent.
  useEffect(() => {
    if (phase !== 'submitted' || !result) return;
    const timer = window.setTimeout(() => postToParent({ type: 'qayed:submitted', ...result }), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, result]);

  const readDocument = async (blob: Blob, kind: ScanKind) => {
    lastCapture.current = { blob, kind };
    const id = ++readRequest.current;
    setScanKind(kind);
    setStep('reading');
    setNotice(null);
    const timer = window.setTimeout(() => {
      if (readRequest.current === id) setStep('slow');
    }, READING_TIMEOUT_MS);

    const base = formFromPrefill(prefillAt(declared), kind);
    let next: Extracted = { form: base, conf: null, mrz: {} };
    let ok = false;
    let sid: string | null = null;
    try {
      const read = await ficheWidgetApi.readDocument(blob, kind === 'cin' ? 'cin' : 'passport');
      sid = read.scan_id;
      if (read.status === 'completed') {
        next = applyExtracted(base, read.extracted);
        ok = true;
      }
    } catch {
      /* lecture impossible : formulaire de base, à compléter à la main */
    } finally {
      window.clearTimeout(timer);
    }
    if (readRequest.current !== id) return; // abandonnée entre-temps
    setForm(next.form);
    setConf(next.conf);
    setMrz(next.mrz);
    setScanId(sid);
    setReadOk(ok);
    if (!ok) setScanKind('manual');
    setStep('review');
  };

  const handleCapture = (blob: Blob) => {
    const kind = capture ?? 'mrz';
    setCapture(null);
    void readDocument(blob, kind);
  };

  const openManual = () => {
    readRequest.current += 1;
    setScanKind('manual');
    setForm(formFromPrefill(prefillAt(declared), 'manual'));
    setConf(null);
    setMrz({});
    setReadOk(null);
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
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const saveGuest = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const added = await ficheWidgetApi.addGuest(toGuestInput(form, mrz, scanId));
      const next = [...guests, {
        id: added.id, first_name: added.first_name, last_name: added.last_name,
        is_primary: guests.length === 0, removable: true,
      }];
      setGuests(next);
      startGuest();
      setStep(openingStep(next.length, target));
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const removeGuest = async (id: string) => {
    try {
      await ficheWidgetApi.removeGuest(id);
      setGuests((g) => g.filter((x) => x.id !== id));
    } catch (err) {
      showError(err);
    }
  };

  const addAnother = () => {
    setTarget((n) => Math.max(n, declared + 1));
    startGuest();
  };

  const close = () => {
    // Fermé sans valider : la fiche se libère tout de suite pour les collègues.
    if (phase === 'ready') ficheWidgetApi.releaseLock();
    postToParent({ type: 'qayed:closed', session_id: bootstrap?.session_id });
  };

  // Plein cadre : l'iframe entière, sans marge ni cadre.
  const shell = 'flex w-full flex-col overflow-x-hidden bg-qayed-papier';
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

  if (phase === 'locked') {
    return (
      <div className={cn(shell, 'items-center justify-center gap-3 px-6 text-center')} style={shellStyle} role="status">
        <h1 className="font-display text-lg font-bold text-qayed-encre">
          {lockedBy ? t('widget.lockedTitle', { name: lockedBy }) : t('widget.lockedTitleUnknown')}
        </h1>
        <p className="text-sm text-qayed-fiche">{t('widget.lockedBody')}</p>
        <Button onClick={() => void boot(true)}>{t('widget.takeOver')}</Button>
        <Button variant="link" onClick={close}>{t('widget.close')}</Button>
      </div>
    );
  }

  if (phase === 'takenOver') {
    return (
      <div className={cn(shell, 'items-center justify-center gap-3 px-6 text-center')} style={shellStyle} role="alert">
        <h1 className="font-display text-lg font-bold text-qayed-encre">
          {takenOverBy ? t('widget.takenOverTitle', { name: takenOverBy }) : t('widget.takenOverTitleUnknown')}
        </h1>
        <p className="text-sm text-qayed-fiche">{t('widget.takenOverBody')}</p>
        <Button variant="link" onClick={close}>{t('widget.close')}</Button>
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
  const primary = guests.find((g) => g.is_primary) ?? guests[0];
  const primaryName = fullName(primary) || fullName(bootstrap.prefill_guests[0]);
  const current = Math.min(declared + 1, Math.max(target, declared + 1));
  const total = Math.max(target, declared + 1);
  const inGuestEntry = step !== 'list';
  const canValidate = bootstrap.mode === 'amend' ? addedHere > 0 : declared > 0;
  const blockers = widgetBlockers(form, conf);
  const isCin = scanKind === 'cin';
  const focusKey = conf?.names === 'low' ? 'last_name' as const : null;
  const currentPrefillName = fullName(prefillAt(declared));
  const remaining = Math.max(0, target - declared);

  return (
    <div className={shell} style={shellStyle}>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {/* En-tête : maison, chambre, dates, voyageur principal — aucun identifiant technique */}
        <header className="space-y-1 border-b border-qayed-ligne bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate font-display text-base font-bold text-qayed-encre">{bootstrap.establishment_name}</p>
            {inGuestEntry && (
              <span className="shrink-0 rounded-full bg-qayed-cachet-dilue px-2.5 py-1 text-xs font-bold text-qayed-cachet">
                {t('widget.counter', { current, total })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-qayed-gris-700">
            {bootstrap.room && (
              // Libellé partenaire souvent déjà préfixé (« Chambre Turquoise »).
              <span>{bootstrap.room.trim().toLowerCase().startsWith(t('widget.room').toLowerCase()) ? bootstrap.room : `${t('widget.room')} ${bootstrap.room}`}</span>
            )}
            <span>
              {arrival || departure ? <>{arrival ?? '?'} <span aria-hidden="true">-</span> {departure ?? '?'}</> : t('widget.noDates')}
            </span>
            {bootstrap.mode === 'create' && step === 'list' && (
              <Button variant="link" size="sm" className="!px-0" onClick={() => setEditingDates((v) => !v)} aria-expanded={editingDates}>
                {editingDates ? t('widget.doneDates') : t('widget.editDates')}
              </Button>
            )}
          </div>
          {primaryName && (
            <p className="text-sm text-qayed-fiche">{t('widget.primaryGuest')} : <span className="font-semibold text-qayed-encre">{primaryName}</span></p>
          )}
          {editingDates && step === 'list' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input type="date" label={t('widget.arrival')} value={dates.arrival} onChange={(e) => setDates((d) => ({ ...d, arrival: e.target.value }))} />
              <Input type="date" label={t('widget.departure')} value={dates.departure} min={dates.arrival || undefined} onChange={(e) => setDates((d) => ({ ...d, departure: e.target.value }))} />
            </div>
          )}
          {bootstrap.mode === 'amend' && <p className="text-xs font-medium text-qayed-vigilance-texte">{t('widget.amendBanner')}</p>}
        </header>

        <section className="flex flex-col gap-4 px-4 py-4">
          {/* Voyageurs déjà saisis, repliés au-dessus du voyageur en cours */}
          {inGuestEntry && declared > 0 && (
            <ul className="flex flex-wrap items-center gap-1.5" aria-label={t('widget.guestsTitle')}>
              {guests.map((g) => (
                <li key={g.id} className="flex min-h-[32px] max-w-full items-center gap-1 rounded-full border border-qayed-conforme-texte/30 bg-qayed-conforme-fond px-2.5 text-xs text-qayed-conforme-texte">
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{fullName(g)}</span>
                </li>
              ))}
            </ul>
          )}

          {inGuestEntry && (
            <h1 className="font-display text-lg font-bold text-qayed-encre">
              {t('widget.guestN', { n: current })}
              {currentPrefillName && step !== 'review' && <span className="ms-2 font-normal text-qayed-fiche">{currentPrefillName}</span>}
            </h1>
          )}

          {notice && (
            <p role="alert" className="rounded-xl border border-qayed-erreur bg-white px-3 py-2.5 text-sm text-qayed-erreur-texte">{notice}</p>
          )}

          {step === 'scan' && (
            <ScanEntryCards onCin={() => setCapture('cin')} onPassport={() => setCapture('mrz')} onManual={openManual} />
          )}

          {step === 'reading' && (
            isCin
              ? <ScanReading title={t('widget.reading')} subtitleAr={t('cinScan.readingAr')} />
              : <ScanReading title={t('widget.reading')} />
          )}

          {step === 'slow' && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-8 text-center" role="alert">
              <p className="text-sm font-semibold text-qayed-encre">{t('widget.readingSlow')}</p>
              <p className="text-xs text-qayed-fiche">{t('widget.readingSlowHint')}</p>
            </div>
          )}

          {step === 'review' && (
            <form id={FORM_ID} className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (blockers.length === 0) void saveGuest(); }}>
              {readOk === true && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-qayed-conforme-fond px-3 py-2.5">
                  <CheckCircle className="h-4 w-4 shrink-0 text-qayed-conforme-texte" aria-hidden="true" />
                  <p className="text-xs font-semibold text-qayed-conforme-texte">{isCin ? t('cinScan.verifyHint') : t('guestScan.readSuccess')}</p>
                </div>
              )}
              {readOk === false && (
                <p role="alert" className="rounded-xl border border-red-200 bg-qayed-erreur-fond px-3 py-2.5 text-center text-sm font-medium text-qayed-erreur-texte">
                  {t('widget.scanFailed')}
                </p>
              )}
              <GuestFields form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} conf={conf} isCin={isCin} focusKey={focusKey} />
              {conf?.names === 'low' && blockers.some((b) => b === 'first_name' || b === 'last_name') && (
                <p className="text-xs font-medium text-qayed-erreur-texte" role="alert">{t('cinScan.lowFieldRequired')}</p>
              )}
              {(blockers.includes('document_number') || blockers.includes('issuing_country_code')) && (
                <p className="text-xs font-medium text-qayed-erreur-texte">{t('guestScan.documentFieldsRequired')}</p>
              )}
              {blockers.includes('sex') && <p className="text-xs font-medium text-qayed-erreur-texte">{t('widget.sexRequired')}</p>}
            </form>
          )}

          {step === 'list' && (
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-lg font-bold text-qayed-encre">{t('widget.guestsTitle')}</h1>
              <ul className="flex flex-col divide-y divide-qayed-ligne rounded-2xl border border-qayed-ligne bg-white">
                {guests.map((g) => (
                  <li key={g.id} className="flex min-h-[52px] items-center gap-2 ps-3">
                    <Check className="h-4 w-4 shrink-0 text-qayed-conforme-texte" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-qayed-encre">{fullName(g)}</span>
                    {g.is_primary && <span className="shrink-0 text-xs text-qayed-fiche">{t('widget.primaryGuest')}</span>}
                    {g.removable ? (
                      <button
                        type="button"
                        onClick={() => void removeGuest(g.id)}
                        aria-label={t('widget.remove', { name: fullName(g) })}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-qayed-fiche"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : <span className="w-3" aria-hidden="true" />}
                  </li>
                ))}
              </ul>
              {remaining > 0 && (
                <p className="text-sm text-qayed-vigilance-texte">{t('widget.remainingGuests', { count: remaining })}</p>
              )}
              <Button variant="link" className="self-start !px-0" onClick={addAnother}>{t('widget.addAnother')}</Button>
            </div>
          )}
        </section>
      </main>

      {/* Barre basse : au plus un bouton plein, toujours visible au-dessus du clavier */}
      {(step !== 'scan' || canValidate) && <footer
        className="border-t border-qayed-ligne bg-white px-4 pt-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {step === 'review' && (
          <Button type="submit" form={FORM_ID} fullWidth size="lg" loading={busy} disabled={blockers.length > 0}>
            {t('widget.saveGuest')}
          </Button>
        )}
        {step === 'list' && (
          <Button fullWidth size="lg" loading={busy} disabled={!canValidate} onClick={() => void submitFiche()}>
            {busy ? t('widget.submitting') : t('widget.submit')}
          </Button>
        )}
        {step === 'slow' && (
          <Button fullWidth size="lg" onClick={() => lastCapture.current && void readDocument(lastCapture.current.blob, lastCapture.current.kind)}>
            {t('widget.retry')}
          </Button>
        )}
        <div className="mt-1 flex min-h-[44px] flex-wrap items-center justify-center gap-x-4">
          {step === 'review' && (
            <Button variant="link" size="sm" disabled={busy} onClick={startGuest}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t('widget.rescan')}
            </Button>
          )}
          {step === 'slow' && (
            <Button variant="link" size="sm" onClick={openManual}>{t('widget.manualEntry')}</Button>
          )}
          {step === 'scan' && canValidate && (
            <Button variant="link" size="sm" onClick={() => setStep('list')}>
              {t('widget.reviewList', { count: declared, total: target })}
            </Button>
          )}
        </div>
      </footer>}

      {capture && (
        <CINCapture variant={capture} onCapture={handleCapture} onClose={() => setCapture(null)} />
      )}
    </div>
  );
};

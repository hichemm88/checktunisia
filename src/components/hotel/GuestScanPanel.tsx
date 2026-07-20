import { useState, useRef, ChangeEvent, ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ScanLine, CheckCircle, Loader2, Upload, ArrowRight,
  CreditCard, UserCheck, RotateCw, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { checkInsApi, AddGuestPayload } from '@/api/checkIns';
import { scansApi } from '@/api/scans';
import { useToast } from '@/components/ui/Toast';
import { api, extractErrors } from '@/lib/api';
import { scanMrz } from '@/lib/mrzScanner';
import { CINCapture } from '@/components/hotel/CINCapture';
import { prepareCinImage } from '@/lib/cinImagePrep';
import { scanCin } from '@/api/scanCin';
import { scanMrzVision } from '@/api/scanMrz';
import { reportLocalMrzScan } from '@/api/scanEvents';
import { useAuthStore } from '@/stores/authStore';
import { CheckIn, CinConfidence, CinScanResponse } from '@/types';

// ─── Pastille de confiance (scan CIN uniquement) ──────────────────────────────
const CONF_STYLE: Record<CinConfidence, { bg: string; fg: string; key: string }> = {
  high:   { bg: '#E4F5EC', fg: '#137453', key: 'cinScan.confHigh' },
  medium: { bg: '#FBF0D7', fg: '#8A6206', key: 'cinScan.confMedium' },
  low:    { bg: '#FEE2E2', fg: '#B91C1C', key: 'cinScan.confLow' },
};

const ConfPill = ({ level }: { level: CinConfidence }) => {
  const { t } = useTranslation();
  const s = CONF_STYLE[level];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: s.bg, color: s.fg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.fg }} />
      {t(s.key)}
    </span>
  );
};

/** Champ avec label + pastille de confiance optionnelle (préremplissage CIN). */
const Field = ({ label, level, children }: { label: string; level?: CinConfidence | null; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="label mb-0">{label}</span>
      {level && <ConfPill level={level} />}
    </div>
    {children}
  </div>
);

// Déduit le sexe à partir de la filiation (بنت/بن) ou de la mention épouse (حرم).
const inferSex = (filiationAr: string | null, spouseAr: string | null): 'M' | 'F' | '' => {
  if (spouseAr) return 'F';
  if (filiationAr?.includes('بنت')) return 'F';
  if (filiationAr && /(^|\s)بن(\s|$)/.test(filiationAr)) return 'M';
  return '';
};

export const GuestScanPanel = ({
  checkIn, isPrimary, label, onSuccess, onCancel,
}: {
  checkIn: CheckIn; isPrimary: boolean; label: string;
  onSuccess: () => void; onCancel?: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const SEX_OPTIONS = [
    { value: '',  label: t('common.sex')    },
    { value: 'M', label: t('common.male')   },
    { value: 'F', label: t('common.female') },
    { value: 'X', label: t('common.other')  },
  ];
  const { toast } = useToast();
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const hotelId = useAuthStore((s) => s.user?.hotel?.id);
  const propertyId = activePropertyId || hotelId || '';

  // MODULE PROVISOIRE — relais WhatsApp : l'image du document n'est stockée que
  // si le relais est actif (sinon aucune raison de conserver une pièce d'identité).
  // On ne rabat PAS une erreur réseau sur `false` : sinon un simple incident de
  // connexion faisait croire le relais éteint et l'image du passeport n'était
  // jamais téléversée (silencieusement, 5 min durant) — la fiche de police
  // partait alors sans sa photo. En cas d'échec la valeur reste `undefined`
  // (« inconnu ») et le téléversement a lieu ; seul un `enabled: false` explicite
  // le bloque.
  const { data: waEnabled } = useQuery({
    queryKey: ['whatsapp-enabled'],
    queryFn: () => api.get('/health/whatsapp').then((r) => !!r.data?.data?.enabled),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const fileRef       = useRef<HTMLInputElement>(null); // caméra (MRZ)
  const uploadRef     = useRef<HTMLInputElement>(null); // galerie / fichier (MRZ)
  // MODULE PROVISOIRE — relais WhatsApp : promesse du téléversement d'image en
  // cours (résout vers le scan_id). L'ajout du voyageur l'attend pour toujours
  // relier l'image, même si l'utilisateur clique avant la fin de l'upload.
  const pendingScanUpload = useRef<Promise<string | undefined> | null>(null);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [scanKind, setScanKind] = useState<'mrz' | 'cin'>('mrz');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedOk, setExtractedOk] = useState(false);
  const [guestForm, setGuestForm] = useState<Partial<AddGuestPayload>>({ is_primary: isPrimary });

  // ── Capture caméra in-app (partagée CIN / MRZ) ─────────────────────────────
  const [capture, setCapture] = useState<null | 'cin' | 'mrz'>(null);
  const [cinScan, setCinScan] = useState<CinScanResponse | null>(null);
  const [conf, setConf] = useState<{ cinNumber: CinConfidence; names: CinConfidence; birthDate: CinConfidence } | null>(null);
  const [cinImageUrl, setCinImageUrl] = useState<string | null>(null);
  const [cinError, setCinError] = useState<string | null>(null);
  const [usedExisting, setUsedExisting] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  // Repli Claude vision passeport en cours (après échec de l'OCR local).
  const [mrzFallback, setMrzFallback] = useState(false);

  // Remplit le formulaire à partir d'une lecture MRZ (locale OU Claude vision).
  const applyMrz = (mrz: {
    first_name?: string | null; last_name?: string | null; date_of_birth?: string | null;
    sex?: string | null; nationality_code?: string | null; document_type?: string;
    document_number?: string | null; issuing_country_code?: string | null; expiry_date?: string | null;
  }, file: File) => {
    setGuestForm({
      first_name: mrz.first_name ?? '',
      last_name: mrz.last_name ?? '',
      date_of_birth: mrz.date_of_birth ?? '',
      sex: mrz.sex ?? '',
      nationality_code: mrz.nationality_code ?? '',
      document_type: mrz.document_type ?? 'passport',
      document_number: mrz.document_number ?? '',
      issuing_country_code: mrz.issuing_country_code ?? '',
      expiry_date: mrz.expiry_date ?? '',
      is_primary: isPrimary,
    });
    setExtractedOk(true);
    setScanState('done');

    // MODULE PROVISOIRE — relais WhatsApp : téléverse l'image du document et
    // mémorise son scan_id pour le relier à CE voyageur (multi-voyageurs).
    // Non bloquant (l'ajout du voyageur ne doit jamais être empêché) ; l'image
    // est purgée après 24 h côté backend. En cas d'échec on PRÉVIENT : sans ça,
    // la fiche de police partait sans sa photo sans que personne ne le sache.
    if (waEnabled !== false) {
      pendingScanUpload.current = scansApi.upload(checkIn.id, file)
        .then((scan) => { setGuestForm((f) => ({ ...f, scan_id: scan.scan_id })); return scan.scan_id; })
        .catch(() => { toast(t('guestScan.photoUploadFailed'), 'error'); return undefined; });
    }
  };

  // ── MRZ (passeport) — OCR local d'abord (gratuit/hors-ligne) ; repli Claude
  // vision seulement si l'OCR local échoue (reflets, hologramme sur le texte).
  const runMrzScan = async (file: File) => {
    setScanKind('mrz');
    setScanState('scanning');
    setOcrProgress(0);
    setMrzFallback(false);
    try {
      const startedAt = performance.now();
      const mrz = await scanMrz(file, setOcrProgress);
      // OCR MRZ local réussi (gratuit) : beacon best-effort pour le graphe
      // comparatif admin. N'impacte jamais le préremplissage ci-dessous.
      reportLocalMrzScan(performance.now() - startedAt);
      applyMrz(mrz, file);
    } catch {
      // OCR local KO → repli Claude vision (fiable sur reflets/hologramme).
      try {
        setMrzFallback(true);
        const prepared = await prepareCinImage(file);
        const mrz = await scanMrzVision(prepared, propertyId);
        applyMrz(mrz, file);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        const msg = code === 'timeout' ? t('cinScan.timeoutHint') : t('guestScan.scanFailed');
        toast(msg, 'error');
        setScanState('error');
        if (fileRef.current) fileRef.current.value = '';
      } finally {
        setMrzFallback(false);
      }
    }
  };

  // Upload / galerie MRZ (input fichier) → même pipeline.
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runMrzScan(file);
  };

  // Capture caméra in-app MRZ → wrap le Blob en File pour le pipeline existant.
  const handleMrzCapture = (blob: Blob) => {
    setCapture(null);
    runMrzScan(new File([blob], 'mrz.jpg', { type: 'image/jpeg' }));
  };

  // ── Scan CIN (Claude vision, backend /api/scan/cin) ─────────────────────────
  const handleCinCapture = async (blob: Blob) => {
    setCapture(null);
    setScanKind('cin');
    setCinError(null);
    setScanState('scanning');
    try {
      const prepared = await prepareCinImage(blob);
      const res = await scanCin(prepared, propertyId);

      // Vignette de vérification (objectURL révoqué au reset).
      setCinImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(prepared);
      });

      if (res.side === 'unknown') {
        setCinError(t('cinScan.notCin'));
        setScanState('error');
        return;
      }
      if (res.side === 'back') {
        setCinError(t('cinScan.backSide'));
        setScanState('error');
        return;
      }

      const c = res.confidence;
      // Règle : un champ `low` est vidé (→ requis, bloque la soumission).
      setGuestForm({
        document_type: 'national_id',
        document_number: c.cinNumber === 'low' ? '' : res.cinNumber ?? '',
        first_name: c.names === 'low' ? '' : res.firstNameLatin ?? '',
        last_name: c.names === 'low' ? '' : res.lastNameLatin ?? '',
        first_name_ar: res.firstNameAr ?? '',
        last_name_ar: res.lastNameAr ?? '',
        filiation_ar: res.filiationAr ?? '',
        spouse_ar: res.spouseAr ?? '',
        birth_place_ar: res.birthPlaceAr ?? '',
        date_of_birth: c.birthDate === 'low' ? '' : res.birthDate ?? '',
        sex: inferSex(res.filiationAr, res.spouseAr),
        nationality_code: 'TUN',
        issuing_country_code: 'TUN',
        card_format: res.cardFormat,
        is_primary: isPrimary,
      });
      setConf(c);
      setCinScan(res);
      setUsedExisting(false);
      setExtractedOk(true);
      setScanState('done');

      // MODULE PROVISOIRE — relais WhatsApp : téléverse l'image de la CIN (recto,
      // celle affichée en vignette) et mémorise son scan_id pour la relier à CE
      // voyageur, afin que sa fiche parte avec sa photo. Best-effort, non
      // bloquant ; l'image est purgée après 24 h côté backend.
      if (waEnabled !== false) {
        const cinFile = new File([prepared], 'cin.jpg', { type: prepared.type || 'image/jpeg' });
        pendingScanUpload.current = scansApi.upload(checkIn.id, cinFile, 'front')
          .then((scan) => { setGuestForm((f) => ({ ...f, scan_id: scan.scan_id })); return scan.scan_id; })
          .catch(() => { toast(t('guestScan.photoUploadFailed'), 'error'); return undefined; });
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg =
        code === 'parse_error' ? t('cinScan.scanFailed')
        : code === 'timeout' ? t('cinScan.timeoutHint')
        : code === 'rate_limited' ? t('cinScan.scanFailed')
        : t('cinScan.scanFailed');
      setCinError(msg);
      setScanState('error');
    }
  };

  // « Utiliser cette fiche » — préremplit depuis la base, sans re-saisie (conf. high).
  const applyExisting = () => {
    const ex = cinScan?.existingClient;
    if (!ex) return;
    setGuestForm((f) => ({
      ...f,
      first_name: (ex.first_name as string) ?? f.first_name ?? '',
      last_name: (ex.last_name as string) ?? f.last_name ?? '',
      date_of_birth: (ex.date_of_birth as string) ?? f.date_of_birth ?? '',
      nationality_code: (ex.nationality_code as string) ?? f.nationality_code ?? 'TUN',
      document_number: (ex.document_number as string) ?? f.document_number ?? '',
    }));
    setConf(null); // valeurs issues de la base → plus de pastilles
    setUsedExisting(true);
  };

  const addGuestMutation = useMutation({
    mutationFn: async () => {
      // MODULE PROVISOIRE — relais WhatsApp : attendre la fin du téléversement de
      // l'image (asynchrone) pour toujours envoyer le scan_id. Sinon, en cas de
      // clic rapide (import de plusieurs passeports), l'image n'est pas reliée au
      // voyageur → pas de photo, surtout en multi-voyageurs.
      let scan_id = guestForm.scan_id;
      if (!scan_id && pendingScanUpload.current) {
        scan_id = await pendingScanUpload.current;
      }
      return checkInsApi.addGuest(checkIn.id, { ...guestForm, scan_id } as AddGuestPayload);
    },
    onSuccess,
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const setG = (k: string, v: string) => setGuestForm((f) => ({ ...f, [k]: v }));

  // Expiry check — réalité terrain : on enregistre quand même, le bouton reste actif.
  const today = new Date().toISOString().slice(0, 10);
  const soonLimit = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const docExpired      = !!guestForm.expiry_date && guestForm.expiry_date < today;
  const docExpiresSoon  = !!guestForm.expiry_date && !docExpired && guestForm.expiry_date < soonLimit;

  // Un champ `low` non rempli bloque la soumission (en plus des champs requis).
  const hasUnfilledLow = !!conf && (
    (conf.cinNumber === 'low' && !guestForm.document_number) ||
    (conf.names === 'low' && (!guestForm.first_name || !guestForm.last_name)) ||
    (conf.birthDate === 'low' && !guestForm.date_of_birth)
  );

  const isCin = scanKind === 'cin' && !!cinScan;
  // Focus auto sur le premier champ non-`high` (ordre : numéro, nom, prénom, date).
  const focusKey =
    !conf ? null
    : conf.cinNumber !== 'high' ? 'document_number'
    : conf.names !== 'high' ? 'last_name'
    : conf.birthDate !== 'high' ? 'date_of_birth'
    : null;

  const reset = () => {
    setScanState('idle'); setExtractedOk(false);
    setGuestForm({ is_primary: isPrimary });
    pendingScanUpload.current = null;
    setScanKind('mrz');
    setCinScan(null); setConf(null); setUsedExisting(false); setCinError(null);
    if (cinImageUrl) { URL.revokeObjectURL(cinImageUrl); setCinImageUrl(null); }
    if (fileRef.current)   fileRef.current.value = '';
    if (uploadRef.current) uploadRef.current.value = '';
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-4"
      style={{ background: '#F6F5F1', border: '1.5px solid #DDD9CF' }}
    >
      {/* Overlay caméra in-app (CIN ou passeport MRZ) */}
      {capture && (
        <CINCapture
          variant={capture}
          onCapture={capture === 'mrz' ? handleMrzCapture : handleCinCapture}
          onClose={() => setCapture(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        {onCancel && (
          <button className="text-xs text-gray-400 hover:text-gray-600 font-medium" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
      </div>

      {/* Caméra MRZ — capture directe */}
      <input ref={fileRef}   type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      {/* Upload MRZ — galerie ou fichier existant */}
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* ── Idle / Error ── */}
      {(scanState === 'idle' || scanState === 'error') && (
        <div className="flex flex-col gap-2.5">
          {scanState === 'error' && (
            <div
              className="rounded-xl px-3 py-2.5 text-center text-sm font-medium"
              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}
            >
              {cinError ?? t('guestScan.scanFailedRetry')}
            </div>
          )}

          {/* Carte 1 — CIN tunisienne (OCR Claude vision) */}
          <button
            onClick={() => { setCinError(null); setCapture('cin'); }}
            className="group flex w-full items-center gap-3.5 rounded-2xl p-4 text-start shadow-card transition-all active:scale-[0.99]"
            style={{ background: 'var(--qayed-cachet)', color: '#fff' }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">{t('cinScan.entryCinTitle')}</p>
              <p className="mt-0.5 text-xs text-white/80">{t('cinScan.scanCinSubtitle')}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Carte 2 — Passeport / CIN étrangère avec MRZ (même importance) */}
          <button
            onClick={() => { setCinError(null); setCapture('mrz'); }}
            className="group flex w-full items-center gap-3.5 rounded-2xl p-4 text-start shadow-card transition-all active:scale-[0.99]"
            style={{ background: 'var(--qayed-encre)', color: '#fff' }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <ScanLine className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">{t('cinScan.entryPassportTitle')}</p>
              <p className="mt-0.5 text-xs text-white/70">{t('cinScan.entryPassportSubtitle')}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Actions secondaires, discrètes */}
          <div className="mt-1 flex items-center justify-center gap-4 text-xs font-medium text-gray-500">
            <button onClick={() => uploadRef.current?.click()} className="flex items-center gap-1.5 hover:text-gray-700">
              <Upload className="h-3.5 w-3.5" /> {t('guestScan.importPhoto')}
            </button>
            <span className="h-3 w-px bg-gray-300" />
            <button onClick={() => { setExtractedOk(false); setScanKind('mrz'); setScanState('done'); }} className="hover:text-gray-700">
              {t('guestScan.manualEntry')}
            </button>
          </div>
        </div>
      )}

      {/* ── Scanning ── */}
      {scanState === 'scanning' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-9">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl animate-pulse"
            style={{ background: '#EEEBFA' }}
          >
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: '#5346A8' }} />
          </div>
          {scanKind === 'cin' ? (
            <>
              <p className="text-sm font-semibold text-gray-700">{t('cinScan.reading')}</p>
              <p className="text-xs qayed-arabic text-gray-400" dir="rtl">{t('cinScan.readingAr')}</p>
            </>
          ) : mrzFallback ? (
            // Repli Claude vision après échec de l'OCR local (barre indéterminée).
            <>
              <p className="text-sm font-semibold text-gray-700">{t('cinScan.mrzFallback')}</p>
              <p className="text-xs text-gray-400">{t('cinScan.mrzFallbackHint')}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700">{t('guestScan.readingMrz')}</p>
              <div className="w-full max-w-xs rounded-full bg-gray-100 h-2">
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%`, background: 'var(--qayed-cachet)' }} />
              </div>
              <p className="text-xs text-gray-400">{ocrProgress}%</p>
            </>
          )}
        </div>
      )}

      {/* ── Done — form ── */}
      {scanState === 'done' && (
        <>
          {/* Vignette de la carte scannée (vérification visuelle) */}
          {isCin && cinImageUrl && (
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="relative overflow-hidden rounded-xl border"
              style={{ borderColor: '#DDD9CF' }}
            >
              <img src={cinImageUrl} alt={t('cinScan.cardImage')} className="max-h-40 w-full object-contain bg-white" />
              <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{t('cinScan.zoom')}</span>
            </button>
          )}

          {/* Bandeau « Client déjà enregistré » */}
          {isCin && cinScan?.existingClient && !usedExisting && (
            <div className="flex flex-col gap-2 rounded-xl px-3 py-3" style={{ background: '#E4F5EC', border: '1px solid #1F9D6B' }}>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 shrink-0" style={{ color: '#137453' }} />
                <p className="text-xs font-bold" style={{ color: '#137453' }}>{t('cinScan.existingClientTitle')}</p>
              </div>
              <p className="text-xs text-gray-600">
                {cinScan.existingClient.first_name} {cinScan.existingClient.last_name}
                {cinScan.existingClient.date_of_birth ? ` · ${cinScan.existingClient.date_of_birth}` : ''}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyExisting}>{t('cinScan.useExisting')}</Button>
                <Button size="sm" variant="secondary" onClick={() => setUsedExisting(true)}>{t('cinScan.createNew')}</Button>
              </div>
            </div>
          )}

          {extractedOk && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-emerald-50 border border-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800">
                {isCin ? t('cinScan.verifyHint') : t('guestScan.readSuccess')}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Select
              label={t('guestScan.documentType')}
              options={[
                { value: 'passport', label: t('guestScan.passport') },
                { value: 'national_id', label: t('guestScan.nationalId') },
              ]}
              value={guestForm.document_type ?? 'passport'}
              onChange={(e) => setG('document_type', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('guestScan.firstName')} level={conf?.names}>
                <Input value={guestForm.first_name ?? ''} onChange={(e) => setG('first_name', e.target.value)} autoFocus={focusKey === 'last_name'} required />
              </Field>
              <Field label={t('guestScan.lastName')} level={conf?.names}>
                <Input value={guestForm.last_name ?? ''} onChange={(e) => setG('last_name', e.target.value)} required />
              </Field>
            </div>

            {/* Champs arabes (RTL, IBM Plex Sans Arabic) — scan CIN uniquement */}
            {isCin && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('cinScan.lastNameAr')} level={conf?.names}>
                  <Input dir="rtl" className="qayed-arabic text-right" value={guestForm.last_name_ar ?? ''} onChange={(e) => setG('last_name_ar', e.target.value)} />
                </Field>
                <Field label={t('cinScan.firstNameAr')} level={conf?.names}>
                  <Input dir="rtl" className="qayed-arabic text-right" value={guestForm.first_name_ar ?? ''} onChange={(e) => setG('first_name_ar', e.target.value)} />
                </Field>
                <div className="col-span-2">
                  <Field label={t('cinScan.filiationAr')}>
                    <Input dir="rtl" className="qayed-arabic text-right" value={guestForm.filiation_ar ?? ''} onChange={(e) => setG('filiation_ar', e.target.value)} />
                  </Field>
                </div>
                {(guestForm.spouse_ar || cinScan?.spouseAr) && (
                  <div className="col-span-2">
                    <Field label={t('cinScan.spouseAr')}>
                      <Input dir="rtl" className="qayed-arabic text-right" value={guestForm.spouse_ar ?? ''} onChange={(e) => setG('spouse_ar', e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>
            )}

            <Field label={t('guestScan.dateOfBirth')} level={conf?.birthDate}>
              <Input type="date" value={guestForm.date_of_birth ?? ''} onChange={(e) => setG('date_of_birth', e.target.value)} autoFocus={focusKey === 'date_of_birth'} required />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Select label={t('common.sex')} options={SEX_OPTIONS} value={guestForm.sex ?? ''} onChange={(e) => setG('sex', e.target.value)} />
              <Input label={t('guestScan.nationality')} placeholder="TUN" value={guestForm.nationality_code ?? ''} onChange={(e) => setG('nationality_code', e.target.value.toUpperCase())} maxLength={3} />
            </div>

            <Field label={isCin ? t('cinScan.cinNumber') : t('guestScan.documentNumber')} level={conf?.cinNumber}>
              <Input value={guestForm.document_number ?? ''} onChange={(e) => setG('document_number', e.target.value)} autoFocus={focusKey === 'document_number'} />
            </Field>

            {isCin && guestForm.birth_place_ar !== undefined && (
              <Field label={t('cinScan.birthPlaceAr')}>
                <Input dir="rtl" className="qayed-arabic text-right" value={guestForm.birth_place_ar ?? ''} onChange={(e) => setG('birth_place_ar', e.target.value)} />
              </Field>
            )}

            {/* Pays de délivrance + expiration : masqués pour la CIN (pas d'expiration) */}
            {!isCin && (
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('guestScan.issuingCountry')} placeholder="TUN" value={guestForm.issuing_country_code ?? ''} onChange={(e) => setG('issuing_country_code', e.target.value.toUpperCase())} maxLength={3} />
                <div className="flex flex-col gap-1">
                  <Input label={t('guestScan.expiry')} type="date" value={guestForm.expiry_date ?? ''} onChange={(e) => setG('expiry_date', e.target.value)} />
                  {docExpiresSoon && (
                    <p className="text-[11px] font-medium" style={{ color: '#8A6206' }}>{t('guestScan.docExpiresSoon')}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasUnfilledLow && (
            <p className="text-[11px] font-medium text-red-600">{t('cinScan.lowFieldRequired')}</p>
          )}

          {docExpired && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: '#FBF0D7', border: '1px solid #E3A008' }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#8A6206' }} />
              <p className="text-xs font-semibold" style={{ color: '#8A6206' }}>
                {t('guestScan.docExpiredSince', {
                  date: new Date(guestForm.expiry_date!).toLocaleDateString(
                    i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN',
                    { day: 'numeric', month: 'long', year: 'numeric' },
                  ),
                })}
              </p>
            </div>
          )}

          <Button
            fullWidth size="lg"
            loading={addGuestMutation.isPending}
            onClick={() => addGuestMutation.mutate()}
            disabled={!guestForm.first_name || !guestForm.last_name || !guestForm.date_of_birth || hasUnfilledLow}
          >
            {t('guestScan.confirmGuest')} <ArrowRight className="h-4 w-4" />
          </Button>

          <button className="text-center text-sm font-medium" style={{ color: '#5346A8' }} onClick={reset}>
            ↩ {t('guestScan.rescan')}
          </button>
        </>
      )}

      {/* Zoom vignette CIN */}
      {zoomOpen && cinImageUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setZoomOpen(false)}>
          <div className="flex justify-end gap-2 p-4">
            <button onClick={(e) => { e.stopPropagation(); setRotation((r) => (r + 90) % 360); }} className="rounded-full bg-white/15 p-3 text-white" aria-label={t('cinScan.rotate')}>
              <RotateCw className="h-5 w-5" />
            </button>
            <button onClick={() => setZoomOpen(false)} className="rounded-full bg-white/15 p-3 text-white" aria-label={t('common.close')}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <img src={cinImageUrl} alt={t('cinScan.cardImage')} className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `rotate(${rotation}deg)` }} />
          </div>
        </div>
      )}
    </div>
  );
};

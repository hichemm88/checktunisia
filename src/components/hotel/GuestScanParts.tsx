import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CreditCard, Loader2, ScanLine, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ArrowNext } from '@/components/ui/DirectionalIcon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { countryOptions } from '@/lib/flags';
import type { AddGuestPayload } from '@/api/checkIns';
import type { CinConfidence } from '@/types';

/*
 * Briques du parcours Check-in (GuestScanPanel), partagées avec le widget
 * partenaire (pages/widget/FicheWidgetPage) pour que les deux écrans soient
 * identiques : mêmes cartes de scan, même état de lecture, mêmes champs et
 * mêmes contrôles. Aucune dépendance réseau ni store ici : ces composants ne
 * font qu'afficher et remonter les saisies.
 */

export type GuestForm = Partial<AddGuestPayload>;
export type FieldConfidence = {
  cinNumber: CinConfidence | null; names: CinConfidence | null; birthDate: CinConfidence | null;
};

// ─── Pastille de confiance ────────────────────────────────────────────────────
const CONF_STYLE: Record<CinConfidence, { bg: string; fg: string; key: string }> = {
  high:   { bg: 'var(--qayed-conforme-fond)', fg: 'var(--qayed-conforme-texte)', key: 'cinScan.confHigh' },
  medium: { bg: 'var(--qayed-vigilance-fond)', fg: 'var(--qayed-vigilance-texte)', key: 'cinScan.confMedium' },
  low:    { bg: 'var(--qayed-erreur-fond)', fg: 'var(--qayed-erreur-texte)', key: 'cinScan.confLow' },
};

const ConfPill = ({ level }: { level: CinConfidence }) => {
  const { t } = useTranslation();
  const s = CONF_STYLE[level];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: s.bg, color: s.fg }}>
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

/** Pays lisible (« Tunisie ») ; un code inconnu de la liste reste sélectionné tel quel. */
const CountrySelect = ({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const base = useMemo(() => countryOptions(i18n.language), [i18n.language]);
  const v = value.toUpperCase();
  const options = [
    { value: '', label: t('guestScan.chooseCountry') },
    ...(v && !base.some((o) => o.value === v) ? [{ value: v, label: v }] : []),
    ...base,
  ];
  return <Select label={label} options={options} value={v} onChange={(e) => onChange(e.target.value)} required={required} />;
};

// ─── Écran d'entrée : les deux cartes de scan ────────────────────────────────
export const ScanEntryCards = ({ onCin, onPassport, onImport, onManual }: {
  onCin: () => void; onPassport: () => void; onImport?: () => void; onManual: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2.5">
      {/* Carte 1 — CIN tunisienne */}
      <button
        type="button"
        onClick={onCin}
        className="group flex w-full items-center gap-3.5 rounded-2xl p-4 text-start shadow-card transition-all active:scale-[0.99]"
        style={{ background: 'var(--qayed-cachet)', color: '#fff' }}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden="true">
          <CreditCard className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">{t('cinScan.entryCinTitle')}</p>
          <p className="mt-0.5 text-xs text-white/80">{t('cinScan.scanCinSubtitle')}</p>
        </div>
        <ArrowNext className="h-5 w-5 shrink-0 opacity-70" />
      </button>

      {/* Carte 2 — Passeport / CIN étrangère avec MRZ (même importance) */}
      <button
        type="button"
        onClick={onPassport}
        className="group flex w-full items-center gap-3.5 rounded-2xl p-4 text-start shadow-card transition-all active:scale-[0.99]"
        style={{ background: 'var(--qayed-encre)', color: '#fff' }}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10" aria-hidden="true">
          <ScanLine className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">{t('cinScan.entryPassportTitle')}</p>
          <p className="mt-0.5 text-xs text-white/70">{t('cinScan.entryPassportSubtitle')}</p>
        </div>
        <ArrowNext className="h-5 w-5 shrink-0 opacity-70" />
      </button>

      {/* Actions secondaires, discrètes — cibles tactiles de 44px. */}
      <div className="mt-1 flex items-center justify-center gap-2">
        {onImport && (
          <>
            <Button variant="link" size="sm" className="text-qayed-fiche hover:text-qayed-encre" onClick={onImport}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> {t('guestScan.importPhoto')}
            </Button>
            <span className="h-3 w-px bg-qayed-ligne" aria-hidden="true" />
          </>
        )}
        <Button variant="link" size="sm" className="text-qayed-fiche hover:text-qayed-encre" onClick={onManual}>
          {t('guestScan.manualEntry')}
        </Button>
      </div>
    </div>
  );
};

// ─── Lecture en cours ────────────────────────────────────────────────────────
/**
 * `progress` (0-100) : barre déterminée (OCR local du passeport). Sans
 * progression connue, animation et texte seuls.
 */
export const ScanReading = ({ title, subtitle, subtitleAr, progress }: {
  title: string; subtitle?: string; subtitleAr?: string; progress?: number;
}) => (
  <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-9" role="status" aria-live="polite">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-qayed-cachet-dilue animate-pulse" aria-hidden="true">
      <Loader2 className="h-7 w-7 animate-spin text-qayed-cachet" />
    </div>
    <p className="text-sm font-semibold text-qayed-gris-700">{title}</p>
    {subtitleAr && <p className="text-xs qayed-arabic text-qayed-fiche" dir="rtl">{subtitleAr}</p>}
    {subtitle && <p className="text-xs text-qayed-fiche">{subtitle}</p>}
    {progress !== undefined && (
      <>
        <div
          className="h-2 w-full max-w-xs rounded-full bg-qayed-gris-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={title}
        >
          <div className="h-2 rounded-full bg-qayed-cachet transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-qayed-fiche">{progress}%</p>
      </>
    )}
  </div>
);

// ─── Champs du voyageur ──────────────────────────────────────────────────────
export const GuestFields = ({ form, set, conf, isCin, showArabic, focusKey }: {
  form: GuestForm;
  set: (key: keyof AddGuestPayload, value: string) => void;
  conf?: FieldConfidence | null;
  /** Document lu = CIN tunisienne : numéro « CIN », pas de pays ni d'expiration. */
  isCin: boolean;
  /** Champs arabes lus sur la CIN (parcours natif uniquement). */
  showArabic?: boolean;
  focusKey?: 'document_number' | 'last_name' | 'date_of_birth' | null;
}) => {
  const { t, i18n } = useTranslation();
  const SEX_OPTIONS = [
    { value: '',  label: t('common.sex')    },
    { value: 'M', label: t('common.male')   },
    { value: 'F', label: t('common.female') },
    { value: 'X', label: t('common.other')  },
  ];

  // Expiration — réalité terrain : on enregistre quand même, on prévient.
  const today = new Date().toISOString().slice(0, 10);
  const soonLimit = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const docExpired = !!form.expiry_date && form.expiry_date < today;
  const docExpiresSoon = !!form.expiry_date && !docExpired && form.expiry_date < soonLimit;

  return (
    <div className="flex flex-col gap-3">
      <Select
        label={t('guestScan.documentType')}
        options={[
          { value: 'passport', label: t('guestScan.passport') },
          { value: 'national_id', label: t('guestScan.nationalId') },
        ]}
        value={form.document_type ?? 'passport'}
        onChange={(e) => set('document_type', e.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('guestScan.firstName')} level={conf?.names}>
          <Input value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} autoFocus={focusKey === 'last_name'} autoComplete="off" required />
        </Field>
        <Field label={t('guestScan.lastName')} level={conf?.names}>
          <Input value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} autoComplete="off" required />
        </Field>
      </div>

      {/* Champs arabes (RTL, IBM Plex Sans Arabic) — scan CIN natif uniquement */}
      {showArabic && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('cinScan.lastNameAr')} level={conf?.names}>
            <Input dir="rtl" className="qayed-arabic text-right" value={form.last_name_ar ?? ''} onChange={(e) => set('last_name_ar', e.target.value)} />
          </Field>
          <Field label={t('cinScan.firstNameAr')} level={conf?.names}>
            <Input dir="rtl" className="qayed-arabic text-right" value={form.first_name_ar ?? ''} onChange={(e) => set('first_name_ar', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('cinScan.filiationAr')}>
              <Input dir="rtl" className="qayed-arabic text-right" value={form.filiation_ar ?? ''} onChange={(e) => set('filiation_ar', e.target.value)} />
            </Field>
          </div>
          {form.spouse_ar !== undefined && form.spouse_ar !== '' && (
            <div className="sm:col-span-2">
              <Field label={t('cinScan.spouseAr')}>
                <Input dir="rtl" className="qayed-arabic text-right" value={form.spouse_ar ?? ''} onChange={(e) => set('spouse_ar', e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      )}

      <Field label={t('guestScan.dateOfBirth')} level={conf?.birthDate}>
        <Input type="date" value={form.date_of_birth ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} autoFocus={focusKey === 'date_of_birth'} required />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label={t('common.sex')} options={SEX_OPTIONS} value={form.sex ?? ''} onChange={(e) => set('sex', e.target.value)} />
        <CountrySelect label={t('guestScan.nationality')} value={form.nationality_code ?? ''} onChange={(v) => set('nationality_code', v)} />
      </div>

      <Field label={isCin ? t('cinScan.cinNumber') : t('guestScan.documentNumber')} level={conf?.cinNumber}>
        <Input value={form.document_number ?? ''} onChange={(e) => set('document_number', e.target.value)} autoFocus={focusKey === 'document_number'} autoComplete="off" required />
      </Field>

      {showArabic && form.birth_place_ar !== undefined && (
        <Field label={t('cinScan.birthPlaceAr')}>
          <Input dir="rtl" className="qayed-arabic text-right" value={form.birth_place_ar ?? ''} onChange={(e) => set('birth_place_ar', e.target.value)} />
        </Field>
      )}

      {/* Pays de délivrance + expiration : masqués pour la CIN (pas d'expiration) */}
      {!isCin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CountrySelect label={t('guestScan.issuingCountry')} value={form.issuing_country_code ?? ''} onChange={(v) => set('issuing_country_code', v)} required />
          <div className="flex flex-col gap-1">
            <Input label={t('guestScan.expiry')} type="date" value={form.expiry_date ?? ''} onChange={(e) => set('expiry_date', e.target.value)} />
            {docExpiresSoon && (
              <p className="text-xs font-medium text-qayed-vigilance-texte">{t('guestScan.docExpiresSoon')}</p>
            )}
          </div>
        </div>
      )}

      {docExpired && (
        <div className="flex items-start gap-2 rounded-xl border border-qayed-vigilance bg-qayed-vigilance-fond px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-qayed-vigilance-texte" aria-hidden="true" />
          <p className="text-xs font-semibold text-qayed-vigilance-texte">
            {t('guestScan.docExpiredSince', {
              date: new Date(form.expiry_date!).toLocaleDateString(
                i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN',
                { day: 'numeric', month: 'long', year: 'numeric' },
              ),
            })}
          </p>
        </div>
      )}
    </div>
  );
};

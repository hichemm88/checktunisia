import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';

/**
 * Grille d'édition des fonctionnalités RÉELLES d'un pack (celles que le
 * backend applique via PlanEntitlements) — par opposition au contenu
 * marketing des cartes publiques.
 *
 * Convention : champ vide = illimité / hérité. `asOverrides` assouplit le
 * libellé (fiche client : vide = valeur du pack, -1 = illimité).
 */
export interface FeatureValues {
  max_properties: string;
  max_users: string;
  ocr_scans_per_month: string;
  whatsapp_relay: boolean | null; // null (overrides) = hériter du pack
}

export const featureValuesFrom = (features: Record<string, unknown> | null | undefined, asOverrides = false): FeatureValues => ({
  max_properties: features?.max_properties != null ? String(features.max_properties) : '',
  max_users: features?.max_users != null ? String(features.max_users) : '',
  ocr_scans_per_month: features?.ocr_scans_per_month != null ? String(features.ocr_scans_per_month) : '',
  whatsapp_relay: features && 'whatsapp_relay' in features
    ? Boolean(features.whatsapp_relay)
    : (asOverrides ? null : true),
});

/** Payload API : clés omises quand « hérité », null quand illimité explicite. */
export const featureValuesToPayload = (v: FeatureValues, asOverrides = false): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const num = (raw: string, key: string) => {
    if (raw.trim() === '') {
      if (!asOverrides) out[key] = null; // pack : vide = illimité
      return; // overrides : vide = hériter → clé absente
    }
    out[key] = parseInt(raw, 10);
  };
  num(v.max_properties, 'max_properties');
  num(v.max_users, 'max_users');
  num(v.ocr_scans_per_month, 'ocr_scans_per_month');
  if (v.whatsapp_relay !== null) out.whatsapp_relay = v.whatsapp_relay;
  return out;
};

export const PlanFeaturesEditor = ({ value, onChange, asOverrides = false, usage }: {
  value: FeatureValues;
  onChange: (v: FeatureValues) => void;
  asOverrides?: boolean;
  /** Usage réel { max_users: 3, ... } — affiché en aide sous chaque champ. */
  usage?: Record<string, number>;
}) => {
  const { t } = useTranslation();
  const set = (k: keyof FeatureValues, v: string | boolean | null) => onChange({ ...value, [k]: v });
  const emptyHint = asOverrides ? t('planFeatures.inheritHint') : t('planFeatures.unlimitedHint');
  const usedHint = (key: string) => usage?.[key] != null ? t('planFeatures.currentUsage', { n: usage[key] }) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('planFeatures.title')}</p>
      <div className="grid grid-cols-3 gap-2">
        <Input label={t('planFeatures.maxProperties')} type="number" min={asOverrides ? '-1' : '0'} value={value.max_properties}
          placeholder="∞" hint={usedHint('max_properties')}
          onChange={(e) => set('max_properties', e.target.value)} />
        <Input label={t('planFeatures.maxUsers')} type="number" min={asOverrides ? '-1' : '0'} value={value.max_users}
          placeholder="∞" hint={usedHint('max_users')}
          onChange={(e) => set('max_users', e.target.value)} />
        <Input label={t('planFeatures.ocrScans')} type="number" min={asOverrides ? '-1' : '0'} value={value.ocr_scans_per_month}
          placeholder="∞" hint={usedHint('ocr_scans_per_month')}
          onChange={(e) => set('ocr_scans_per_month', e.target.value)} />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            ref={(el) => { if (el) el.indeterminate = value.whatsapp_relay === null; }}
            checked={value.whatsapp_relay === true}
            onChange={(e) => set('whatsapp_relay', e.target.checked)}
          />
          {t('planFeatures.whatsappRelay')}
        </label>
        {asOverrides && value.whatsapp_relay !== null && (
          <button type="button" className="text-xs text-gray-400 underline hover:text-gray-600" onClick={() => set('whatsapp_relay', null)}>
            {t('planFeatures.inherit')}
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-400">{emptyHint}</p>
    </div>
  );
};

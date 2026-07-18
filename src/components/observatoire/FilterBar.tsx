import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { observatoireApi } from '@/api/observatoire';
import { bornesPreset, type PeriodePreset } from '@/lib/observatoire';

/**
 * Etat partage des filtres du dashboard (periode, zone, nationalite). Zustand,
 * comme le reste de l'app. Les ecrans lisent ces filtres et rechargent leurs
 * donnees a chaque changement.
 */
interface FiltresState {
  preset: PeriodePreset;
  debut: string;
  fin: string;
  zone: string;         // '' = toutes
  nationalite: string;  // '' = toutes
  setPreset: (p: PeriodePreset) => void;
  setBornes: (debut: string, fin: string) => void;
  setZone: (z: string) => void;
  setNationalite: (n: string) => void;
}

const init = bornesPreset('30j');

export const useFiltres = create<FiltresState>((set) => ({
  preset: '30j',
  debut: init.debut,
  fin: init.fin,
  zone: '',
  nationalite: '',
  setPreset: (preset) => {
    if (preset === 'perso') { set({ preset }); return; }
    const b = bornesPreset(preset);
    set({ preset, debut: b.debut, fin: b.fin });
  },
  setBornes: (debut, fin) => set({ debut, fin, preset: 'perso' }),
  setZone: (zone) => set({ zone }),
  setNationalite: (nationalite) => set({ nationalite }),
}));

/** Filtres serialisables pour les appels API. */
export function useFiltresApi() {
  const { debut, fin, zone, nationalite } = useFiltres();
  return {
    debut, fin,
    zone: zone || undefined,
    nationalite: nationalite || undefined,
  };
}

const PRESETS: PeriodePreset[] = ['7j', '30j', 'trimestre', 'annee'];

export function FilterBar({ showZone = true }: { showZone?: boolean }) {
  const { t } = useTranslation();
  const f = useFiltres();

  const { data: zones } = useQuery({
    queryKey: ['observatoire', 'zones'],
    queryFn: observatoireApi.zones,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Presets de periode */}
      <div className="inline-flex overflow-hidden rounded-btn border" style={{ borderColor: 'var(--qayed-ligne)' }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => f.setPreset(p)}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: f.preset === p ? 'var(--qayed-cachet)' : 'white',
              color: f.preset === p ? 'white' : 'var(--qayed-encre)',
            }}
          >
            {t(`observatoire.filters.preset.${p}`)}
          </button>
        ))}
      </div>

      {/* Bornes personnalisees */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={f.debut}
          max={f.fin}
          onChange={(e) => f.setBornes(e.target.value, f.fin)}
          className="input-field h-9 py-1 text-xs"
          style={{ width: 140 }}
        />
        <span className="text-xs" style={{ color: 'var(--qayed-fiche)' }}>—</span>
        <input
          type="date"
          value={f.fin}
          min={f.debut}
          onChange={(e) => f.setBornes(f.debut, e.target.value)}
          className="input-field h-9 py-1 text-xs"
          style={{ width: 140 }}
        />
      </div>

      {/* Zone */}
      {showZone && (
        <select
          value={f.zone}
          onChange={(e) => f.setZone(e.target.value)}
          className="input-field h-9 appearance-none bg-white py-1 pe-8 text-xs"
        >
          <option value="">{t('observatoire.filters.allZones')}</option>
          {zones?.map((z) => (
            <option key={z.id} value={z.id}>{z.nom_fr}</option>
          ))}
        </select>
      )}
    </div>
  );
}

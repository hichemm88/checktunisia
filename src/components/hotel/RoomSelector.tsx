import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react';
import { roomsApi, RoomAvailability } from '@/api/rooms';

/** Explicit choice: a room, or consciously "no room". null = not chosen yet (blocks the step). */
export type RoomChoice = { kind: 'room'; id: string } | { kind: 'none' };

/** Above this many units: live-search bar + collapsible grouping by floor (same threshold as mobile). */
const SEARCH_THRESHOLD = 8;

const TYPE_LABEL_KEY: Record<string, string> = {
  single: 'propertiesPage.roomTypeSingle',
  double: 'propertiesPage.roomTypeDouble',
  twin: 'propertiesPage.roomTypeTwin',
  triple: 'propertiesPage.roomTypeTriple',
  quadruple: 'propertiesPage.roomTypeQuadruple',
  suite: 'propertiesPage.roomTypeSuite',
  junior_suite: 'propertiesPage.roomTypeJuniorSuite',
  apartment: 'propertiesPage.typeApartment',
  studio: 'propertiesPage.roomTypeStudio',
  family: 'propertiesPage.roomTypeFamily',
  villa: 'propertiesPage.typeVilla',
  dormitory: 'propertiesPage.roomTypeDormitory',
  standard: 'propertiesPage.roomTypeStandard',
};

const DOT: Record<string, string> = {
  free: '#1F9D6B',        // vert conforme
  departing: '#E3A008',   // ambre vigilance — se libère le jour d'arrivée
  occupied: '#9CA3AF',
  unavailable: '#D1D5DB',
};

const RoomRow = ({
  room, selected, onSelect, locale, forceSelectable,
}: {
  room: RoomAvailability; selected: boolean; onSelect: () => void; locale: string;
  /** En édition : la chambre déjà assignée reste sélectionnable malgré le conflit qu'elle a avec son propre séjour. */
  forceSelectable?: boolean;
}) => {
  const { t } = useTranslation();
  const [showReason, setShowReason] = useState(false);

  // « current » = la chambre actuellement assignée, rendue sélectionnable en
  // édition alors que l'API la voit occupée (par le séjour qu'on est en train
  // d'éditer). On la présente comme disponible plutôt qu'occupée.
  const isCurrent = !!forceSelectable && room.state !== 'free';
  const selectable = room.state === 'free' || !!forceSelectable;
  const dotColor = room.state === 'free'
    ? (room.departing_same_day ? DOT.departing : DOT.free)
    : isCurrent ? DOT.free : DOT[room.state];

  const fmtD = (d: string) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  const stateLabel = isCurrent ? t('checkinWizard.roomCurrent')
    : room.state === 'occupied' ? t('checkinWizard.roomOccupied')
    : room.state === 'unavailable' ? t('checkinWizard.roomUnavailable')
    : room.departing_same_day ? t('checkinWizard.roomFreesToday')
    : t('checkinWizard.roomFree');

  const reason = room.conflict
    ? t('checkinWizard.roomConflictMsg', {
        guest: room.conflict.guest_name ?? room.conflict.reference,
        from: fmtD(room.conflict.check_in_date),
        to: fmtD(room.conflict.departure_date),
      })
    : t('checkinWizard.roomUnavailableMsg');

  return (
    <div>
      <button
        type="button"
        onClick={() => (selectable ? onSelect() : setShowReason((s) => !s))}
        title={selectable ? undefined : reason}
        aria-disabled={!selectable}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-all"
        style={{
          border: selected ? '2px solid #5346A8' : '1.5px solid #DDD9CF',
          background: selected ? 'rgba(83,70,168,0.05)' : '#fff',
          opacity: selectable ? 1 : 0.55,
          cursor: selectable ? 'pointer' : 'help',
        }}
      >
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-gray-900 truncate">
            {t('checkinWizard.roomN', { number: room.number })}
          </span>
          <span className="block text-xs text-gray-400 truncate">
            {t(TYPE_LABEL_KEY[room.type] ?? 'propertiesPage.roomTypeStandard')} · {t('checkinWizard.capacityN', { count: room.capacity })}
          </span>
        </span>
        <span
          className="text-[11px] font-semibold shrink-0"
          style={{ color: isCurrent ? '#137453' : room.state === 'free' ? (room.departing_same_day ? '#8A6206' : '#137453') : '#9CA3AF' }}
        >
          {stateLabel}
        </span>
        {selected && <Check className="h-4 w-4 shrink-0" style={{ color: '#5346A8' }} />}
      </button>
      {!selectable && showReason && (
        <p className="text-xs px-3 py-1.5 rounded-lg mt-1" style={{ background: '#FBF0D7', color: '#8A6206' }}>
          {reason}
        </p>
      )}
    </div>
  );
};

export const RoomSelector = ({
  from, to, value, onChange, allowRoomId,
}: {
  from: string; to: string;
  value: RoomChoice | null;
  onChange: (choice: RoomChoice) => void;
  /** Id de la chambre déjà assignée (édition) : reste sélectionnable malgré le conflit avec son propre séjour. */
  allowRoomId?: string;
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN';
  const [search, setSearch] = useState('');
  const [closedFloors, setClosedFloors] = useState<Record<string, boolean>>({});

  const datesOk = !!from && !!to && to > from;

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms-availability', from, to],
    queryFn: () => roomsApi.availability(from, to),
    enabled: datesOk,
  });

  const filtered = useMemo(() => {
    if (!rooms) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      r.number.toLowerCase().includes(q)
      || t(TYPE_LABEL_KEY[r.type] ?? '').toLowerCase().includes(q));
  }, [rooms, search, t]);

  const useSections = (rooms?.length ?? 0) > SEARCH_THRESHOLD;

  /** floor → rooms, floors sorted ascending, null floor last. */
  const sections = useMemo(() => {
    if (!useSections) return null;
    const map = new Map<number | null, RoomAvailability[]>();
    for (const r of filtered) {
      const key = r.floor ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return a[0] - b[0];
    });
  }, [filtered, useSections]);

  const floorLabel = (floor: number | null) =>
    floor === null ? t('checkinWizard.noFloor')
    : floor === 0 ? t('checkinWizard.groundFloor')
    : t('checkinWizard.floorN', { n: floor });

  if (!datesOk) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="label">{t('checkinWizard.roomLabel')}</label>
        <p className="text-sm text-gray-400 rounded-xl px-4 py-5 text-center" style={{ background: '#F6F5F1', border: '1.5px dashed #DDD9CF' }}>
          {t('checkinWizard.roomSelectorHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="label">{t('checkinWizard.roomLabel')}</label>

      {useSections && (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input w-full ps-9"
            placeholder={t('checkinWizard.searchRoomPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {isLoading && <div className="h-24 animate-pulse rounded-xl bg-gray-100" />}

      {!isLoading && !rooms?.length && (
        <p className="text-sm text-gray-400 rounded-xl px-4 py-5 text-center" style={{ background: '#F6F5F1' }}>
          {t('checkinWizard.noRoomConfigured')}
        </p>
      )}

      {!isLoading && !useSections && (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <RoomRow key={r.id} room={r} locale={locale}
              forceSelectable={!!allowRoomId && r.id === allowRoomId}
              selected={value?.kind === 'room' && value.id === r.id}
              onSelect={() => onChange({ kind: 'room', id: r.id })} />
          ))}
        </div>
      )}

      {!isLoading && useSections && sections?.map(([floor, list]) => {
        const key = String(floor);
        const closed = closedFloors[key];
        return (
          <div key={key} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setClosedFloors((s) => ({ ...s, [key]: !s[key] }))}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 mt-1"
            >
              <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: closed ? 'rotate(-90deg)' : 'none' }} />
              {floorLabel(floor)} · {list.length}
            </button>
            {!closed && list.map((r) => (
              <RoomRow key={r.id} room={r} locale={locale}
                forceSelectable={!!allowRoomId && r.id === allowRoomId}
                selected={value?.kind === 'room' && value.id === r.id}
                onSelect={() => onChange({ kind: 'room', id: r.id })} />
            ))}
          </div>
        );
      })}

      {/* « Sans chambre » — lien discret, jamais l'option par défaut */}
      <button
        type="button"
        onClick={() => onChange({ kind: 'none' })}
        className="text-xs mt-1 self-center underline-offset-2"
        style={{
          color: value?.kind === 'none' ? '#5346A8' : '#9CA3AF',
          fontWeight: value?.kind === 'none' ? 700 : 400,
          textDecoration: value?.kind === 'none' ? 'none' : 'underline',
        }}
      >
        {value?.kind === 'none' ? t('checkinWizard.noRoomSelectedConfirm') : t('checkinWizard.continueWithoutRoom')}
      </button>
    </div>
  );
};

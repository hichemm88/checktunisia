import { useState, useEffect, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Building2, MapPin, CheckCircle2, Layers, ChevronDown, ChevronUp,
  BedDouble, Pencil, Trash2, Save, X, Star, Rows3,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  organizationApi,
  buildBulkRoomNumbers,
  type Property,
  type PropertyRoom,
} from '@/api/organization';
import { useAuthStore } from '@/stores/authStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'hotel',        labelKey: 'propertiesPage.typeHotel' },
  { value: 'appartement',  labelKey: 'propertiesPage.typeApartment' },
  { value: 'villa',        labelKey: 'propertiesPage.typeVilla' },
  { value: 'riad',         labelKey: 'propertiesPage.typeRiad' },
  { value: 'maison_hotes', labelKey: 'propertiesPage.typeGuesthouseFr' },
  { value: 'guesthouse',   labelKey: 'propertiesPage.typeGuesthouse' },
  { value: 'hostel',       labelKey: 'propertiesPage.typeHostel' },
  { value: 'resort',       labelKey: 'propertiesPage.typeResort' },
  { value: 'bungalow',     labelKey: 'propertiesPage.typeBungalow' },
  { value: 'rental',       labelKey: 'propertiesPage.typeRental' },
];

const PROPERTY_TYPE_KEYS: Record<string, string> = {
  hotel: 'propertiesPage.typeHotel', appartement: 'propertiesPage.typeApartment',
  villa: 'propertiesPage.typeVilla', riad: 'propertiesPage.typeRiad',
  maison_hotes: 'propertiesPage.typeGuesthouseFr', guesthouse: 'propertiesPage.typeGuesthouse',
  hostel: 'propertiesPage.typeHostel', resort: 'propertiesPage.typeResort',
  bungalow: 'propertiesPage.typeBungalow', rental: 'propertiesPage.typeRental',
  residence: 'propertiesPage.typeResidence',
};

const ROOM_TYPES = [
  { value: 'single',       labelKey: 'propertiesPage.roomTypeSingle' },
  { value: 'double',       labelKey: 'propertiesPage.roomTypeDouble' },
  { value: 'twin',         labelKey: 'propertiesPage.roomTypeTwin' },
  { value: 'triple',       labelKey: 'propertiesPage.roomTypeTriple' },
  { value: 'quadruple',    labelKey: 'propertiesPage.roomTypeQuadruple' },
  { value: 'suite',        labelKey: 'propertiesPage.roomTypeSuite' },
  { value: 'junior_suite', labelKey: 'propertiesPage.roomTypeJuniorSuite' },
  { value: 'apartment',    labelKey: 'propertiesPage.typeApartment' },
  { value: 'studio',       labelKey: 'propertiesPage.roomTypeStudio' },
  { value: 'family',       labelKey: 'propertiesPage.roomTypeFamily' },
  { value: 'villa',        labelKey: 'propertiesPage.typeVilla' },
  { value: 'dormitory',    labelKey: 'propertiesPage.roomTypeDormitory' },
  { value: 'standard',     labelKey: 'propertiesPage.roomTypeStandard' },
];

const ROOM_TYPE_KEYS: Record<string, string> = Object.fromEntries(ROOM_TYPES.map((r) => [r.value, r.labelKey]));

const ROOM_STATUSES = [
  { value: 'available',   labelKey: 'propertiesPage.statusAvailable',   color: 'text-green-600' },
  { value: 'occupied',    labelKey: 'propertiesPage.statusOccupied',    color: 'text-blue-600' },
  { value: 'maintenance', labelKey: 'propertiesPage.statusMaintenance', color: 'text-orange-500' },
  { value: 'inactive',    labelKey: 'propertiesPage.statusInactive',    color: 'text-gray-400' },
];

const GOVERNORATES = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

const STATUS_COLOR: Record<string, string> = {
  active:    '#1F9D6B',
  pending:   '#E3A008',
  suspended: '#ef4444',
  closed:    '#9ca3af',
};

const PROP_INIT = {
  name: '', type: 'appartement', room_count: 1, stars: '', registration_number: '',
  address: { line1: '', city: '', governorate: 'Tunis', postal_code: '' },
};

const ROOM_INIT = { number: '', floor: '', type: 'standard', capacity: 1, status: 'available' };

// ── Room form ─────────────────────────────────────────────────────────────────

const RoomForm = ({
  initial, onSave, onCancel, saving,
}: {
  initial: typeof ROOM_INIT;
  onSave: (d: typeof ROOM_INIT) => void;
  onCancel: () => void;
  saving: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('propertiesPage.numberOrNameRequired')} value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="101" />
        <Input label={t('onboarding.floor')} type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('onboarding.typeRequired')}</label>
          <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {ROOM_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{t(rt.labelKey)}</option>)}
          </select>
        </div>
        <Input label={t('onboarding.capacity')} type="number" min={1} max={20} value={form.capacity}
          onChange={(e) => set('capacity', Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('propertiesPage.status')}</label>
        <select className="input w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
          {ROOM_STATUSES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={saving} disabled={!form.number || !form.type} onClick={() => onSave(form)}
          className="gap-1.5"><Save className="h-3.5 w-3.5" /> {t('common.save')}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ── Bulk room form (range creation) ────────────────────────────────────────────

const BULK_INIT = {
  start: '', end: '', prefix: '', suffix: '', pad: false,
  floor: '', building: '', type: 'standard', capacity: 2,
};

const BulkRoomForm = ({
  existingNumbers, onSave, onCancel, saving,
}: {
  existingNumbers: string[];
  onSave: (d: typeof BULK_INIT) => void;
  onCancel: () => void;
  saving: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(BULK_INIT);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const start = parseInt(form.start, 10);
  const end   = parseInt(form.end, 10);

  const { numbers, duplicates, invalidRange, tooMany } = useMemo(() => {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return { numbers: [] as string[], duplicates: [] as string[], invalidRange: false, tooMany: false };
    }
    if (end < start) return { numbers: [], duplicates: [], invalidRange: true, tooMany: false };
    if (end - start + 1 > 500) return { numbers: [], duplicates: [], invalidRange: false, tooMany: true };
    const nums = buildBulkRoomNumbers({
      start, end, prefix: form.prefix, suffix: form.suffix, pad: form.pad,
    });
    const existingSet = new Set(existingNumbers);
    const dups = nums.filter((n) => existingSet.has(n));
    return { numbers: nums, duplicates: dups, invalidRange: false, tooMany: false };
  }, [start, end, form.prefix, form.suffix, form.pad, existingNumbers]);

  const toCreate = numbers.length - duplicates.length;
  const canSubmit = numbers.length > 0 && toCreate > 0 && !saving;

  const previewSample = numbers.slice(0, 60);

  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <Rows3 className="h-3.5 w-3.5" /> {t('propertiesPage.bulkTitle')}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Input label={t('propertiesPage.bulkStart')} type="number" inputMode="numeric" value={form.start}
          onChange={(e) => set('start', e.target.value)} placeholder="100" />
        <Input label={t('propertiesPage.bulkEnd')} type="number" inputMode="numeric" value={form.end}
          onChange={(e) => set('end', e.target.value)} placeholder="145" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label={t('propertiesPage.bulkPrefix')} value={form.prefix}
          onChange={(e) => set('prefix', e.target.value)} placeholder="A-" maxLength={10} />
        <Input label={t('propertiesPage.bulkSuffix')} value={form.suffix}
          onChange={(e) => set('suffix', e.target.value)} placeholder="" maxLength={10} />
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 select-none">
        <input type="checkbox" checked={form.pad} onChange={(e) => set('pad', e.target.checked)} />
        {t('propertiesPage.bulkZeroPad')}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Input label={t('onboarding.floor')} type="number" value={form.floor}
          onChange={(e) => set('floor', e.target.value)} placeholder="1" />
        <Input label={t('propertiesPage.bulkBuilding')} value={form.building}
          onChange={(e) => set('building', e.target.value)} placeholder="" maxLength={50} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('onboarding.typeRequired')}</label>
          <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {ROOM_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{t(rt.labelKey)}</option>)}
          </select>
        </div>
        <Input label={t('onboarding.capacity')} type="number" min={1} max={20} value={form.capacity}
          onChange={(e) => set('capacity', Math.max(1, parseInt(e.target.value) || 1))} />
      </div>

      {/* ── Live preview ── */}
      {invalidRange && <p className="text-xs text-red-500">{t('propertiesPage.bulkInvalidRange')}</p>}
      {tooMany && <p className="text-xs text-red-500">{t('propertiesPage.bulkTooMany')}</p>}

      {numbers.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">
              {t('propertiesPage.bulkWillCreate', { count: toCreate })}
            </span>
            {duplicates.length > 0 && (
              <span className="text-orange-500 font-medium">
                {t('propertiesPage.bulkWillSkip', { count: duplicates.length })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {previewSample.map((n) => {
              const dup = duplicates.includes(n);
              return (
                <span key={n}
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${dup ? 'bg-orange-50 text-orange-400 line-through' : 'bg-violet-50 text-violet-600'}`}>
                  {n}
                </span>
              );
            })}
            {numbers.length > previewSample.length && (
              <span className="text-[11px] text-gray-400 px-1.5 py-0.5">
                +{numbers.length - previewSample.length}…
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" loading={saving} disabled={!canSubmit} onClick={() => onSave(form)} className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> {t('propertiesPage.bulkCreateCta', { count: toCreate })}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ── Rooms panel (per property) ────────────────────────────────────────────────

const RoomsPanel = ({ property }: { property: Property }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showAdd, setShowAdd]     = useState(false);
  const [showBulk, setShowBulk]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [bulkMsg, setBulkMsg] = useState('');

  const qKey = ['property-rooms', property.id];

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => organizationApi.rooms(property.id),
    enabled: !!property.id,
  });

  const inv = () => qc.invalidateQueries({ queryKey: qKey });

  const addMut = useMutation({
    mutationFn: (d: typeof ROOM_INIT) => organizationApi.addRoom(property.id, {
      number:   d.number,
      floor:    d.floor !== '' ? parseInt(d.floor) : null,
      type:     d.type,
      capacity: d.capacity,
      status:   d.status,
    }),
    onSuccess: () => { inv(); setShowAdd(false); setError(''); },
    onError: (e: any) => setError(e?.response?.data?.message ?? t('common.error')),
  });

  const editMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: typeof ROOM_INIT }) =>
      organizationApi.updateRoom(property.id, id, {
        number:   d.number,
        floor:    d.floor !== '' ? parseInt(d.floor) : null,
        type:     d.type,
        capacity: d.capacity,
        status:   d.status,
      }),
    onSuccess: () => { inv(); setEditingId(null); setError(''); },
    onError: (e: any) => setError(e?.response?.data?.message ?? t('common.error')),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => organizationApi.deleteRoom(property.id, id),
    onSuccess: () => { inv(); setDeletingId(null); },
    onError: (e: any) => setError(e?.response?.data?.message ?? t('common.error')),
  });

  const bulkMut = useMutation({
    mutationFn: (d: typeof BULK_INIT) => organizationApi.bulkAddRooms(property.id, {
      start:    parseInt(d.start, 10),
      end:      parseInt(d.end, 10),
      prefix:   d.prefix || undefined,
      suffix:   d.suffix || undefined,
      pad:      d.pad,
      floor:    d.floor !== '' ? parseInt(d.floor, 10) : null,
      building: d.building || null,
      type:     d.type,
      capacity: d.capacity,
    }),
    onSuccess: (res) => {
      inv();
      setShowBulk(false);
      setError('');
      setBulkMsg(t('propertiesPage.bulkResult', { created: res.created_count, skipped: res.skipped_count }));
    },
    onError: (e: any) => setError(e?.response?.data?.errors?.[0]?.message ?? e?.response?.data?.message ?? t('common.error')),
  });

  const statusInfo = (s: string) => ROOM_STATUSES.find((r) => r.value === s) ?? ROOM_STATUSES[0];

  // Group by floor
  const grouped = rooms.reduce<Record<string | number, PropertyRoom[]>>((acc, r) => {
    const key = r.floor != null ? r.floor : '—';
    (acc[key] ??= []).push(r);
    return acc;
  }, {});
  const floors = Object.keys(grouped).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    if (isNaN(na) && isNaN(nb)) return 0;
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  });

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5" />
          {t('propertiesPage.unitsRooms')} {rooms.length > 0 && <span className="font-normal">({rooms.length})</span>}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowBulk((s) => !s); setShowAdd(false); setEditingId(null); setError(''); setBulkMsg(''); }}
            className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#5346A8' }}
          >
            <Rows3 className="h-3.5 w-3.5" /> {t('propertiesPage.bulkAdd')}
          </button>
          <button
            onClick={() => { setShowAdd((s) => !s); setShowBulk(false); setEditingId(null); setError(''); setBulkMsg(''); }}
            className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#5346A8' }}
          >
            <Plus className="h-3.5 w-3.5" /> {t('onboarding.addUnit')}
          </button>
        </div>
      </div>

      {showBulk && (
        <div className="mb-3">
          <BulkRoomForm
            existingNumbers={rooms.map((r) => r.number)}
            onSave={(d) => bulkMut.mutate(d)}
            onCancel={() => { setShowBulk(false); setError(''); }}
            saving={bulkMut.isPending}
          />
        </div>
      )}

      {showAdd && (
        <div className="mb-3">
          <RoomForm
            initial={ROOM_INIT}
            onSave={(d) => addMut.mutate(d)}
            onCancel={() => { setShowAdd(false); setError(''); }}
            saving={addMut.isPending}
          />
        </div>
      )}

      {bulkMsg && <p className="text-xs text-green-600 mb-2">{bulkMsg}</p>}
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      )}

      {!isLoading && rooms.length === 0 && !showAdd && (
        <p className="py-3 text-center text-xs text-gray-400">
          {t('propertiesPage.noRoomsForProperty')}
        </p>
      )}

      {floors.map((floor) => (
        <div key={floor} className="mb-2">
          {floors.length > 1 && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {floor === '—' ? t('propertiesPage.floorUnspecified') : t('propertiesPage.floorN', { floor })}
            </p>
          )}
          <div className="flex flex-col divide-y divide-gray-50">
            {grouped[floor as any].map((room) => (
              <div key={room.id}>
                {editingId === room.id ? (
                  <div className="py-2">
                    <RoomForm
                      initial={{
                        number:   room.number,
                        floor:    room.floor != null ? String(room.floor) : '',
                        type:     room.type,
                        capacity: room.capacity,
                        status:   room.status,
                      }}
                      onSave={(d) => editMut.mutate({ id: room.id, d })}
                      onCancel={() => { setEditingId(null); setError(''); }}
                      saving={editMut.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{room.number}</span>
                        <span className={`text-xs font-medium ${statusInfo(room.status).color}`}>
                          ● {t(statusInfo(room.status).labelKey)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {room.type in ROOM_TYPE_KEYS ? t(ROOM_TYPE_KEYS[room.type]) : room.type} · {t('propertiesPage.peopleCount', { count: room.capacity })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(room.id); setShowAdd(false); }}
                        className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deletingId === room.id ? (
                        <div className="flex items-center gap-1.5 ms-1">
                          <button onClick={() => delMut.mutate(room.id)}
                            className="text-xs text-red-600 font-semibold">{t('common.delete')}</button>
                          <button onClick={() => setDeletingId(null)} className="text-xs text-gray-400">{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(room.id)}
                          className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Edit property form ────────────────────────────────────────────────────────

const EditPropertyForm = ({
  property, onSave, onCancel, saving,
}: {
  property: Property;
  onSave: (d: object) => void;
  onCancel: () => void;
  saving: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name:                property.name,
    type:                property.type,
    room_count:          String(property.room_count),
    stars:               String(property.stars ?? ''),
    registration_number: property.registration_number ?? '',
    address: {
      line1:       property.address?.line1 ?? '',
      city:        property.address?.city ?? '',
      governorate: property.address?.governorate ?? 'Tunis',
    },
  });
  const set     = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string) => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  return (
    <div className="flex flex-col gap-3 mt-3 border-t border-gray-100 pt-3">
      <Input label={t('onboarding.nameRequired')} value={form.name} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('onboarding.type')}</label>
          <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {PROPERTY_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>)}
          </select>
        </div>
        <Input label={t('propertiesPage.units')} type="number" min={1} value={form.room_count}
          onChange={(e) => set('room_count', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('propertiesPage.stars')} type="number" min={1} max={5} value={form.stars}
          onChange={(e) => set('stars', e.target.value)} />
        <Input label={t('propertiesPage.rcNumber')} value={form.registration_number}
          onChange={(e) => set('registration_number', e.target.value)} />
      </div>
      <Input label={t('onboarding.address')} value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('propertiesPage.city')} value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} />
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('propertiesPage.governorate')}</label>
          <select className="input w-full" value={form.address.governorate} onChange={(e) => setAddr('governorate', e.target.value)}>
            {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" loading={saving} disabled={!form.name}
          onClick={() => onSave({
            name:                form.name,
            type:                form.type,
            room_count:          parseInt(form.room_count) || 1,
            stars:               form.stars ? parseInt(form.stars) : null,
            registration_number: form.registration_number || null,
            address:             form.address,
          })}
          className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ── Property card ─────────────────────────────────────────────────────────────

const PropertyCard = ({
  property,
  isDefault,
  isOnly,
}: {
  property: Property;
  isDefault: boolean;
  isOnly: boolean;
}) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { activePropertyId, setActiveProperty } = useAuthStore();
  const [expanded, setExpanded]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]         = useState('');

  // isActive: either explicitly selected OR it's the first property and nothing is selected (default)
  const isActive = activePropertyId ? activePropertyId === property.id : isDefault;

  const editMut = useMutation({
    mutationFn: (data: object) => organizationApi.updateProperty(property.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-info'] });
      setEditing(false);
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? t('propertiesPage.errorUpdate')),
  });

  const deleteMut = useMutation({
    mutationFn: () => organizationApi.deleteProperty(property.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-info'] });
      setConfirmDelete(false);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? t('propertiesPage.errorDelete')),
  });

  return (
    <div
      className="card overflow-hidden transition-all duration-200"
      style={{ outline: isActive ? '2px solid #5346A8' : 'none' }}
    >
      {/* ── Header ── */}
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 mt-0.5 transition-colors"
          style={{ background: isActive ? '#5346A8' : '#F6F5F1' }}
        >
          <Building2 className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`} />
        </div>

        {/* Main content — prend tout l'espace disponible */}
        <div className="flex-1 min-w-0">
          {/* Ligne 1 : nom + badges + actions icon */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Nom — toujours visible */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-gray-900 leading-snug break-words">{property.name}</p>
                {isActive && (
                  <span className="inline-flex shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#5346A818', color: '#5346A8' }}>
                    {t('propertiesPage.activeBadge')}
                  </span>
                )}
              </div>
              {/* Infos secondaires */}
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="font-medium" style={{ color: STATUS_COLOR[property.status] ?? '#9ca3af' }}>
                  ●
                </span>
                {' '}
                {property.type in PROPERTY_TYPE_KEYS ? t(PROPERTY_TYPE_KEYS[property.type]) : property.type}
                {' · '}
                {t('propertiesPage.unitsCount', { count: property.room_count })}
                {property.address?.city && ` · ${property.address.city}`}
              </p>
              {/* Étoiles */}
              {property.stars ? (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: property.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => { setEditing((e) => !e); setExpanded(false); setConfirmDelete(false); setError(''); }}
                className="rounded-lg p-2 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                title={t('common.edit')}
              >
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              {!isOnly && (
                <button
                  onClick={() => { setConfirmDelete((s) => !s); setEditing(false); setExpanded(false); setError(''); }}
                  className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title={t('propertiesPage.deleteThisProperty')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => { setExpanded((e) => !e); setEditing(false); setConfirmDelete(false); }}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-700 transition-colors"
                title={expanded ? t('propertiesPage.collapse') : t('propertiesPage.viewRooms')}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Ligne 2 : bouton Sélectionner pleine largeur (si pas actif) */}
          {!isActive ? (
            <button
              onClick={() => {
                setActiveProperty(property.id, property.name);
                qc.invalidateQueries({ queryKey: ['dashboard'] });
                qc.invalidateQueries({ queryKey: ['onboarding-status'] });
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl border transition-all hover:bg-blue-50 active:scale-[0.98]"
              style={{ borderColor: '#5346A8', color: '#5346A8' }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('propertiesPage.setAsActive')}
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#5346A8' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('propertiesPage.propertySelected')}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="mx-4 mb-4 rounded-xl border border-red-100 bg-red-50 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-red-800">
            {t('propertiesPage.confirmDeleteTitle', { name: property.name })}
          </p>
          <p className="text-xs text-red-600">
            {t('propertiesPage.confirmDeleteBody')}
          </p>
          {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
              className="!bg-red-600 hover:!bg-red-700 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('propertiesPage.confirmDeleteAction')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setConfirmDelete(false); setError(''); }}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Edit form ── */}
      {editing && (
        <div className="px-4 pb-4">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <EditPropertyForm
            property={property}
            onSave={(d) => editMut.mutate(d)}
            onCancel={() => { setEditing(false); setError(''); }}
            saving={editMut.isPending}
          />
        </div>
      )}

      {/* ── Rooms panel ── */}
      {expanded && !editing && (
        <div className="px-4 pb-4">
          <RoomsPanel property={property} />
        </div>
      )}
    </div>
  );
};

// ── Add property form ─────────────────────────────────────────────────────────

const AddPropertyForm = ({
  onSuccess, onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState(PROP_INIT);
  const [error, setError] = useState('');
  const set     = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string)  => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const addMut = useMutation({
    mutationFn: () => organizationApi.addProperty({
      ...form,
      room_count: parseInt(String(form.room_count)) || 1,
      stars:      form.stars ? parseInt(String(form.stars)) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-info'] });
      onSuccess();
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? t('propertiesPage.errorAdd')),
  });

  return (
    <div className="card p-6">
      <h3 className="font-bold text-gray-900 mb-4">{t('propertiesPage.newProperty')}</h3>
      <div className="flex flex-col gap-4">
        <Input label={t('onboarding.nameRequired')} value={form.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('onboarding.typeRequired')}</label>
            <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {PROPERTY_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>)}
            </select>
          </div>
          <Input label={t('onboarding.roomsCountRequired')} type="number" min={1}
            value={form.room_count} onChange={(e) => set('room_count', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('onboarding.starsOptional')} type="number" min={1} max={5}
            value={form.stars} onChange={(e) => set('stars', e.target.value)} />
          <Input label={t('propertiesPage.rcNumberOptional')} value={form.registration_number}
            onChange={(e) => set('registration_number', e.target.value)} />
        </div>
        <div className="h-px bg-gray-100" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('onboarding.address')}</p>
        <Input label={t('onboarding.addressRequired')} value={form.address.line1}
          onChange={(e) => setAddr('line1', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('onboarding.cityRequired')} value={form.address.city}
            onChange={(e) => setAddr('city', e.target.value)} />
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('propertiesPage.governorate')}</label>
            <select className="input w-full" value={form.address.governorate}
              onChange={(e) => setAddr('governorate', e.target.value)}>
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button fullWidth loading={addMut.isPending}
            disabled={!form.name || !form.address.line1 || !form.address.city}
            onClick={() => addMut.mutate()}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Receptionist view (read-only switcher — no add/edit/delete) ────────────────

const ReceptionistPropertiesView = () => {
  const { t } = useTranslation();
  const { activePropertyId, setActiveProperty } = useAuthStore();
  const qc = useQueryClient();

  const { data: properties, isLoading } = useQuery({
    queryKey: ['my-properties'],
    queryFn: organizationApi.myProperties,
  });

  useEffect(() => {
    if (!activePropertyId && properties?.length) {
      setActiveProperty(properties[0].id, properties[0].name);
    }
  }, [properties, activePropertyId]);

  return (
    <HotelLayout title={t('propertiesPage.myProperties')}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500">
          {t('propertiesPage.selectActiveProperty')}
        </p>
        {isLoading && [1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}
        {(properties ?? []).map((p) => {
          const isActive = activePropertyId ? activePropertyId === p.id : properties?.[0]?.id === p.id;
          return (
            <div key={p.id} className="card p-4 flex items-center justify-between"
              style={{ outline: isActive ? '2px solid #5346A8' : 'none' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: isActive ? '#5346A8' : '#F6F5F1' }}>
                  <Building2 className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <p className="font-semibold text-gray-900 truncate">{p.name}</p>
              </div>
              {isActive ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold shrink-0" style={{ color: '#5346A8' }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('propertiesPage.activeBadge')}
                </span>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => {
                  setActiveProperty(p.id, p.name);
                  qc.invalidateQueries({ queryKey: ['dashboard'] });
                }}>
                  {t('propertiesPage.select')}
                </Button>
              )}
            </div>
          );
        })}
        {!isLoading && !properties?.length && (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
            <Building2 className="h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium">{t('propertiesPage.noPropertyAssigned')}</p>
          </div>
        )}
      </div>
    </HotelLayout>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const PropertiesPage = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const { user, activePropertyId, setActiveProperty } = useAuthStore();
  const isAdmin = user?.role === 'hotel_admin';

  const { data: org, isLoading, isError, refetch } = useQuery({
    queryKey: ['org-info'],
    queryFn: organizationApi.get,
    retry: 2,
    enabled: isAdmin,
  });

  // Auto-initialize activePropertyId to the first property when not yet set.
  // This keeps the UI in sync with what ResolveTenant uses as the default.
  // Doit rester AVANT le retour anticipé ci-dessous : un hook appelé après un
  // return conditionnel change l'ordre des hooks entre rôles (rules-of-hooks).
  // Pour un réceptionniste, la requête `org` est désactivée → l'effet no-op.
  useEffect(() => {
    if (!activePropertyId && org?.properties?.length) {
      const first = org.properties[0];
      setActiveProperty(first.id, first.name);
    }
  }, [org?.properties, activePropertyId, setActiveProperty]);

  if (!isAdmin) {
    return <ReceptionistPropertiesView />;
  }

  // Derive display name: prefer org name, fallback to hotel name from auth store
  const displayName = org?.name ?? user?.hotel?.name ?? t('propertiesPage.myOrganization');

  return (
    <HotelLayout title={t('propertiesPage.myProperties')}>
      <div className="p-4 flex flex-col gap-4">

        {/* ── Org header ── */}
        <div className="card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0"
            style={{ background: '#5346A818' }}>
            <Layers className="h-6 w-6" style={{ color: '#5346A8' }} />
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100 mb-1" />
            ) : (
              <h2 className="font-bold text-gray-900 truncate">{displayName}</h2>
            )}
            <p className="text-sm text-gray-400">
              {org ? (
                <>
                  {org.entity_type === 'company' ? t('policeFiche.company') : t('policeFiche.individual')}
                  {' · '}
                  {t('propertiesPage.propertiesCount', { count: org.properties.length })}
                  {' · '}
                  {t('propertiesPage.unitsTotalCount', { count: org.total_rooms })}
                </>
              ) : isLoading ? (
                t('common.loading')
              ) : isError ? (
                <button onClick={() => refetch()} className="underline hover:text-gray-600">
                  {t('propertiesPage.errorRetry')}
                </button>
              ) : (
                t('propertiesPage.noPropertyRegistered')
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 flex-shrink-0">
            <Plus className="h-4 w-4" /> {t('propertiesPage.addProperty')}
          </Button>
        </div>

        {/* ── Add property form ── */}
        {showForm && (
          <AddPropertyForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* ── Properties list ── */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(org?.properties ?? []).map((p: Property, idx: number) => (
              <PropertyCard key={p.id} property={p} isDefault={idx === 0} isOnly={(org?.properties ?? []).length === 1} />
            ))}
            {!isLoading && (org?.properties ?? []).length === 0 && !showForm && (
              <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
                <Building2 className="h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium">{t('propertiesPage.noPropertyRegistered')}</p>
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> {t('propertiesPage.addFirstProperty')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Info notice ── */}
        <div className="flex items-start gap-3 rounded-xl p-4 text-sm text-gray-500" style={{ background: '#F6F5F1' }}>
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <p>
            <Trans t={t} i18nKey="propertiesPage.infoNotice" components={{ strong: <strong /> }} />
          </p>
        </div>

      </div>
    </HotelLayout>
  );
};

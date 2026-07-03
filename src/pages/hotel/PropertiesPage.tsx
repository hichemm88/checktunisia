import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Building2, MapPin, CheckCircle2, Layers, ChevronDown, ChevronUp,
  BedDouble, Pencil, Trash2, Save, X, Star,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  organizationApi,
  PROPERTY_TYPE_LABELS,
  ROOM_TYPE_LABELS,
  Property,
  PropertyRoom,
} from '@/api/organization';
import { useAuthStore } from '@/stores/authStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'hotel',        label: 'Hôtel' },
  { value: 'appartement',  label: 'Appartement' },
  { value: 'villa',        label: 'Villa' },
  { value: 'riad',         label: 'Riad' },
  { value: 'maison_hotes', label: "Maison d'hôtes" },
  { value: 'guesthouse',   label: 'Guesthouse' },
  { value: 'hostel',       label: 'Auberge de jeunesse' },
  { value: 'resort',       label: 'Resort' },
  { value: 'bungalow',     label: 'Bungalow' },
  { value: 'rental',       label: 'Location saisonnière' },
];

const ROOM_TYPES = [
  { value: 'single',       label: 'Chambre simple' },
  { value: 'double',       label: 'Chambre double' },
  { value: 'twin',         label: 'Chambre twin' },
  { value: 'triple',       label: 'Chambre triple' },
  { value: 'quadruple',    label: 'Chambre quadruple' },
  { value: 'suite',        label: 'Suite' },
  { value: 'junior_suite', label: 'Suite junior' },
  { value: 'apartment',    label: 'Appartement' },
  { value: 'studio',       label: 'Studio' },
  { value: 'family',       label: 'Familiale' },
  { value: 'villa',        label: 'Villa' },
  { value: 'dormitory',    label: 'Dortoir' },
  { value: 'standard',     label: 'Standard' },
];

const ROOM_STATUSES = [
  { value: 'available',   label: 'Disponible',  color: 'text-green-600' },
  { value: 'occupied',    label: 'Occupée',     color: 'text-blue-600' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-orange-500' },
  { value: 'inactive',    label: 'Inactive',    color: 'text-gray-400' },
];

const GOVERNORATES = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

const STATUS_COLOR: Record<string, string> = {
  active:    '#22c55e',
  pending:   '#f59e0b',
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
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="N° / Nom *" value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="101" />
        <Input label="Étage" type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type *</label>
          <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Input label="Capacité" type="number" min={1} max={20} value={form.capacity}
          onChange={(e) => set('capacity', Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Statut</label>
        <select className="input w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
          {ROOM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={saving} disabled={!form.number || !form.type} onClick={() => onSave(form)}
          className="gap-1.5"><Save className="h-3.5 w-3.5" /> Enregistrer</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
};

// ── Rooms panel (per property) ────────────────────────────────────────────────

const RoomsPanel = ({ property }: { property: Property }) => {
  const qc = useQueryClient();
  const [showAdd, setShowAdd]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

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
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erreur'),
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
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erreur'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => organizationApi.deleteRoom(property.id, id),
    onSuccess: () => { inv(); setDeletingId(null); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erreur'),
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
          Unités / Chambres {rooms.length > 0 && <span className="font-normal">({rooms.length})</span>}
        </p>
        <button
          onClick={() => { setShowAdd((s) => !s); setEditingId(null); setError(''); }}
          className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
          style={{ color: '#1B3A5F' }}
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une unité
        </button>
      </div>

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

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      )}

      {!isLoading && rooms.length === 0 && !showAdd && (
        <p className="py-3 text-center text-xs text-gray-400">
          Aucune unité enregistrée pour ce bien.
        </p>
      )}

      {floors.map((floor) => (
        <div key={floor} className="mb-2">
          {floors.length > 1 && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {floor === '—' ? 'Étage non précisé' : `Étage ${floor}`}
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
                          ● {statusInfo(room.status).label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {ROOM_TYPE_LABELS[room.type] ?? room.type} · {room.capacity} pers.
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
                        <div className="flex items-center gap-1.5 ml-1">
                          <button onClick={() => delMut.mutate(room.id)}
                            className="text-xs text-red-600 font-semibold">Supprimer</button>
                          <button onClick={() => setDeletingId(null)} className="text-xs text-gray-400">Annuler</button>
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
      <Input label="Nom *" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
          <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Input label="Unités" type="number" min={1} value={form.room_count}
          onChange={(e) => set('room_count', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Étoiles" type="number" min={1} max={5} value={form.stars}
          onChange={(e) => set('stars', e.target.value)} />
        <Input label="N° RC" value={form.registration_number}
          onChange={(e) => set('registration_number', e.target.value)} />
      </div>
      <Input label="Adresse" value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Ville" value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} />
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gouvernorat</label>
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
          <Save className="h-3.5 w-3.5" /> Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
};

// ── Property card ─────────────────────────────────────────────────────────────

const PropertyCard = ({ property }: { property: Property }) => {
  const qc = useQueryClient();
  const { activePropertyId, setActiveProperty } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [error, setError]       = useState('');

  const isActive = activePropertyId === property.id;

  const editMut = useMutation({
    mutationFn: (data: object) => organizationApi.updateProperty(property.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-info'] });
      setEditing(false);
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erreur lors de la mise à jour.'),
  });

  return (
    <div
      className="card overflow-hidden transition-all duration-200"
      style={{ outline: isActive ? '2px solid #1B3A5F' : 'none' }}
    >
      {/* ── Header ── */}
      <div className="p-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors"
          style={{ background: isActive ? '#1B3A5F' : '#F5F4EF' }}
        >
          <Building2 className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{property.name}</p>
            {isActive && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#1B3A5F18', color: '#1B3A5F' }}>
                Actif
              </span>
            )}
            {property.stars && (
              <div className="flex gap-0.5">
                {Array.from({ length: property.stars }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
            {' · '}
            {property.room_count} unité{property.room_count !== 1 ? 's' : ''}
            {property.address && ` · ${property.address.city}, ${property.address.governorate}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold" style={{ color: STATUS_COLOR[property.status] ?? '#9ca3af' }}>
            ● {property.status}
          </span>

          {/* Modifier */}
          <button
            onClick={() => { setEditing((e) => !e); setExpanded(false); setError(''); }}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
            title="Modifier"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>

          {/* Sélectionner / Actif */}
          {!isActive ? (
            <button
              onClick={() => setActiveProperty(property.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
              style={{ borderColor: '#1B3A5F', color: '#1B3A5F' }}
            >
              Sélectionner
            </button>
          ) : (
            <CheckCircle2 className="h-5 w-5" style={{ color: '#1B3A5F' }} />
          )}

          {/* Expand rooms */}
          <button
            onClick={() => { setExpanded((e) => !e); setEditing(false); }}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            title={expanded ? 'Réduire' : 'Voir les chambres'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

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
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erreur lors de l\'ajout.'),
  });

  return (
    <div className="card p-6">
      <h3 className="font-bold text-gray-900 mb-4">Nouveau bien</h3>
      <div className="flex flex-col gap-4">
        <Input label="Nom *" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type *</label>
            <select className="input w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Input label="Unités/chambres *" type="number" min={1}
            value={form.room_count} onChange={(e) => set('room_count', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Étoiles (optionnel)" type="number" min={1} max={5}
            value={form.stars} onChange={(e) => set('stars', e.target.value)} />
          <Input label="N° RC (optionnel)" value={form.registration_number}
            onChange={(e) => set('registration_number', e.target.value)} />
        </div>
        <div className="h-px bg-gray-100" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</p>
        <Input label="Adresse *" value={form.address.line1}
          onChange={(e) => setAddr('line1', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ville *" value={form.address.city}
            onChange={(e) => setAddr('city', e.target.value)} />
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gouvernorat</label>
            <select className="input w-full" value={form.address.governorate}
              onChange={(e) => setAddr('governorate', e.target.value)}>
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button fullWidth loading={addMut.isPending}
            disabled={!form.name || !form.address.line1 || !form.address.city}
            onClick={() => addMut.mutate()}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const PropertiesPage = () => {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuthStore();

  const { data: org, isLoading, isError, refetch } = useQuery({
    queryKey: ['org-info'],
    queryFn: organizationApi.get,
    retry: 2,
  });

  // Derive display name: prefer org name, fallback to hotel name from auth store
  const displayName = org?.name ?? user?.hotel?.name ?? 'Mon organisation';

  return (
    <HotelLayout title="Mes biens">
      <div className="p-4 flex flex-col gap-4">

        {/* ── Org header ── */}
        <div className="card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0"
            style={{ background: '#1B3A5F18' }}>
            <Layers className="h-6 w-6" style={{ color: '#1B3A5F' }} />
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
                  {org.entity_type === 'company' ? 'Société' : 'Particulier'}
                  {' · '}
                  {org.properties.length} bien{org.properties.length !== 1 ? 's' : ''}
                  {' · '}
                  {org.total_rooms} unité{org.total_rooms !== 1 ? 's' : ''} au total
                </>
              ) : isLoading ? (
                'Chargement…'
              ) : isError ? (
                <button onClick={() => refetch()} className="underline hover:text-gray-600">
                  Erreur — cliquer pour réessayer
                </button>
              ) : (
                'Aucun bien enregistré'
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 flex-shrink-0">
            <Plus className="h-4 w-4" /> Ajouter un bien
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
            {(org?.properties ?? []).map((p: Property) => (
              <PropertyCard key={p.id} property={p} />
            ))}
            {!isLoading && (org?.properties ?? []).length === 0 && !showForm && (
              <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
                <Building2 className="h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium">Aucun bien enregistré</p>
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Ajouter mon premier bien
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Info notice ── */}
        <div className="flex items-start gap-3 rounded-xl p-4 text-sm text-gray-500" style={{ background: '#F5F4EF' }}>
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <p>
            Le bien <strong>sélectionné</strong> est votre contexte actif pour les check-ins et le tableau de bord.
            Développez un bien pour gérer ses unités. Basculez à tout moment sans vous déconnecter.
          </p>
        </div>

      </div>
    </HotelLayout>
  );
};

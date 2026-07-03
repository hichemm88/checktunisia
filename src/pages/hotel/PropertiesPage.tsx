import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, MapPin, CheckCircle2, Layers } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { organizationApi, PROPERTY_TYPE_LABELS, Property } from '@/api/organization';
import { useAuthStore } from '@/stores/authStore';

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

const GOVERNORATES = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

const INIT = {
  name: '', type: 'appartement', room_count: 1, stars: '', registration_number: '',
  address: { line1: '', city: '', governorate: 'Tunis', postal_code: '' },
};

export const PropertiesPage = () => {
  const qc = useQueryClient();
  const { activePropertyId, setActiveProperty } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INIT);
  const set     = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string)  => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-info'],
    queryFn: organizationApi.get,
  });

  const addMut = useMutation({
    mutationFn: () => organizationApi.addProperty({
      ...form,
      room_count: parseInt(String(form.room_count)) || 1,
      stars: form.stars ? parseInt(String(form.stars)) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-info'] });
      setShowForm(false);
      setForm(INIT);
    },
  });

  const STATUS_COLOR: Record<string, string> = {
    active:    '#22c55e',
    pending:   '#f59e0b',
    suspended: '#ef4444',
    closed:    '#9ca3af',
  };

  return (
    <HotelLayout title="Mes propriétés">
      <div className="flex flex-col gap-5">

        {/* Org header */}
        {org && (
          <div className="card p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: '#1B3A5F18' }}>
              <Layers className="h-6 w-6" style={{ color: '#1B3A5F' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900">{org.name}</h2>
              <p className="text-sm text-gray-400">
                {org.entity_type === 'company' ? 'Société' : 'Particulier'}
                {' · '}
                {org.properties.length} bien{org.properties.length !== 1 ? 's' : ''}
                {' · '}
                {org.total_rooms} unités au total
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 flex-shrink-0">
              <Plus className="h-4 w-4" /> Ajouter un bien
            </Button>
          </div>
        )}

        {/* Add property form */}
        {showForm && (
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
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button fullWidth loading={addMut.isPending}
                  disabled={!form.name || !form.address.line1 || !form.address.city}
                  onClick={() => addMut.mutate()}>
                  Enregistrer
                </Button>
              </div>
              {addMut.error && (
                <p className="text-xs text-red-500">
                  {(addMut.error as any)?.response?.data?.message ?? 'Erreur lors de l\'ajout.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Properties list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {org?.properties.map((p: Property) => {
              const isActive = activePropertyId === p.id;
              return (
                <div key={p.id} className="card p-4 flex items-center gap-4"
                  style={{ outline: isActive ? '2px solid #1B3A5F' : 'none' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ background: isActive ? '#1B3A5F' : '#F5F4EF' }}>
                    <Building2 className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      {isActive && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#1B3A5F18', color: '#1B3A5F' }}>Actif</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {PROPERTY_TYPE_LABELS[p.type] ?? p.type}
                      {' · '}
                      {p.room_count} unité{p.room_count !== 1 ? 's' : ''}
                      {p.address && ` · ${p.address.city}, ${p.address.governorate}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold" style={{ color: STATUS_COLOR[p.status] ?? '#9ca3af' }}>
                      ● {p.status}
                    </span>
                    {!isActive && (
                      <button onClick={() => setActiveProperty(p.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                        style={{ borderColor: '#1B3A5F', color: '#1B3A5F' }}>
                        Sélectionner
                      </button>
                    )}
                    {isActive && (
                      <CheckCircle2 className="h-5 w-5" style={{ color: '#1B3A5F' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Location notice */}
        <div className="flex items-start gap-3 rounded-xl p-4 text-sm text-gray-500" style={{ background: '#F5F4EF' }}>
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <p>
            Le bien sélectionné est votre contexte actif pour les check-ins et le tableau de bord.
            Vous pouvez basculer à tout moment sans vous déconnecter.
          </p>
        </div>
      </div>
    </HotelLayout>
  );
};

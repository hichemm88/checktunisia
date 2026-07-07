import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, CheckCircle2, Building2, BedDouble, ArrowRight, Plus, Trash2, Home,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ── Constants ──────────────────────────────────────────────────────────────────

const ROOM_TYPES = [
  'standard', 'double', 'suite', 'twin', 'family',
  'single', 'junior_suite', 'apartment', 'studio', 'dormitory',
];

const PROPERTY_TYPES = [
  { value: 'hotel',        labelKey: 'onboarding.typeHotel' },
  { value: 'appartement',  labelKey: 'onboarding.typeApartment' },
  { value: 'villa',        labelKey: 'onboarding.typeVilla' },
  { value: 'riad',         labelKey: 'onboarding.typeRiad' },
  { value: 'maison_hotes', labelKey: 'onboarding.typeGuesthouseFr' },
  { value: 'guesthouse',   labelKey: 'onboarding.typeGuesthouse' },
  { value: 'hostel',       labelKey: 'onboarding.typeHostel' },
  { value: 'resort',       labelKey: 'onboarding.typeResort' },
  { value: 'bungalow',     labelKey: 'onboarding.typeBungalow' },
  { value: 'rental',       labelKey: 'onboarding.typeRental' },
  { value: 'residence',    labelKey: 'onboarding.typeResidence' },
];

const GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kébili', 'Kef', 'Mahdia', 'Manouba', 'Médenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

interface RoomDraft { type: string; room_number: string; floor: string; capacity: number }

const INIT_ROOM: RoomDraft = { type: 'standard', room_number: '', floor: '', capacity: 2 };

interface PropertyDraft {
  name: string;
  type: string;
  room_count: number;
  stars: string;
  address: { line1: string; city: string; governorate: string };
}

const INIT_PROPERTY: PropertyDraft = {
  name: '', type: 'hotel', room_count: 1, stars: '',
  address: { line1: '', city: '', governorate: 'Tunis' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const OnboardingPage = () => {
  const { t } = useTranslation();
  const navigate            = useNavigate();
  const qc                  = useQueryClient();
  const setActiveProperty   = useAuthStore((s) => s.setActiveProperty);
  const [step, setStep]     = useState(0);
  const [rooms, setRooms]   = useState<RoomDraft[]>([{ ...INIT_ROOM }]);
  const [property, setProperty] = useState<PropertyDraft>({ ...INIT_PROPERTY });
  const [propErrors, setPropErrors] = useState<Record<string, string>>({});

  // Fetch onboarding status to know if org already has a property
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn:  () => api.get('/hotel/onboarding/status').then((r) => r.data.data),
    staleTime: 0,
  });

  // Fetch hotel profile (only meaningful once a property exists)
  const { data: profile } = useQuery({
    queryKey: ['hotel-profile'],
    queryFn:  () => api.get('/hotel/profile').then((r) => r.data.data),
    enabled:  status?.has_property === true,
  });

  // ── Determine wizard shape based on whether property already exists ──────────
  //  • hasProperty = false → 4 steps: Bienvenue, Premier établissement, Unités, C'est parti
  //  • hasProperty = true  → 3 steps: Bienvenue, Unités, C'est parti
  //
  // IMPORTANT: Freeze hasProperty once the initial status is loaded.
  // If we let it change mid-wizard (e.g. after creating a property), the STEPS
  // array shrinks from 4 to 3, STEP_DONE changes from 3 to 2, and the current
  // step (2) accidentally matches the done screen — skipping the rooms step entirely.
  const hasPropertyRef = useRef<boolean | null>(null);
  if (hasPropertyRef.current === null && status !== undefined) {
    hasPropertyRef.current = status.has_property ?? false;
  }
  const hasProperty = hasPropertyRef.current ?? false;

  const STEPS = hasProperty
    ? [
        { label: t('onboarding.stepWelcome'),  icon: ShieldCheck },
        { label: t('onboarding.stepRooms'),    icon: BedDouble },
        { label: t('onboarding.stepDone'),     icon: CheckCircle2 },
      ]
    : [
        { label: t('onboarding.stepWelcome'),   icon: ShieldCheck },
        { label: t('onboarding.stepProperty'),  icon: Home },
        { label: t('onboarding.stepRooms'),     icon: BedDouble },
        { label: t('onboarding.stepDone'),      icon: CheckCircle2 },
      ];

  // Step indices vary depending on flow
  const STEP_PROPERTY = hasProperty ? -1 : 1; // step for property creation (no-property flow only)
  const STEP_ROOMS    = hasProperty ? 1 : 2;
  const STEP_DONE     = hasProperty ? 2 : 3;

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createPropertyMut = useMutation({
    mutationFn: (data: object) =>
      api.post<{ data: { id: string; name: string; type: string } }>('/hotel/organization/properties', data)
        .then((r) => r.data.data),
    onSuccess: (newProp) => {
      // Make the new property the active one immediately so subsequent
      // tenant-scoped requests (e.g. POST /hotel/rooms) send X-Property-Id.
      // Do NOT invalidate onboarding-status here — that would flip hasProperty
      // from false to true mid-wizard, collapsing STEPS from 4 to 3 items and
      // making step 2 match STEP_DONE (skipping the rooms step entirely).
      setActiveProperty(newProp.id, newProp.name);
      setStep(STEP_ROOMS);
    },
    onError: (err: any) => {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      if (typeof apiErrors === 'object' && !Array.isArray(apiErrors)) {
        Object.entries(apiErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
        });
      }
      setPropErrors(flat);
    },
  });

  const addRoomMut = useMutation({
    mutationFn: (room: RoomDraft) =>
      api.post('/hotel/rooms', {
        number:   room.room_number,
        floor:    room.floor || null,
        type:     room.type,
        capacity: room.capacity,
      }),
  });

  const completeMut = useMutation({
    mutationFn: () => api.post('/hotel/onboarding/complete'),
    onSuccess: () => {
      // Invalidate everything so HotelOnboardingGuard refetches with fresh data.
      // Use removeQueries (not just setQueriesData) so both cache key variants
      // (['onboarding-status'] and ['onboarding-status', activePropertyId]) are
      // cleared — the next read will refetch and see setup_completed: true.
      qc.removeQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['hotel-profile'] });
      navigate('/hotel/dashboard');
    },
  });

  // ── Room helpers ─────────────────────────────────────────────────────────────

  const addRoom    = () => setRooms((r) => [...r, { ...INIT_ROOM }]);
  const removeRoom = (i: number) => setRooms((r) => r.filter((_, idx) => idx !== i));
  const updateRoom = (i: number, k: keyof RoomDraft, v: string | number) =>
    setRooms((r) => r.map((room, idx) => idx === i ? { ...room, [k]: v } : room));

  const handleRoomsNext = async () => {
    const validRooms = rooms.filter((r) => r.room_number.trim());
    for (const room of validRooms) {
      try { await addRoomMut.mutateAsync(room); } catch { /* ignore individual failures */ }
    }
    setStep(STEP_DONE);
  };

  // ── Property creation ────────────────────────────────────────────────────────

  const setProp = (k: keyof PropertyDraft, v: unknown) =>
    setProperty((p) => ({ ...p, [k]: v }));
  const setPropAddr = (k: string, v: string) =>
    setProperty((p) => ({ ...p, address: { ...p.address, [k]: v } }));

  const handleCreateProperty = () => {
    const errors: Record<string, string> = {};
    if (!property.name.trim())            errors['name']             = t('onboarding.errorNameRequired');
    if (!property.address.line1.trim())   errors['address.line1']    = t('onboarding.errorAddressRequired');
    if (!property.address.city.trim())    errors['address.city']     = t('onboarding.errorCityRequired');
    if (!property.room_count || property.room_count < 1) errors['room_count'] = t('onboarding.errorRequired');

    if (Object.keys(errors).length > 0) { setPropErrors(errors); return; }
    setPropErrors({});

    createPropertyMut.mutate({
      name:       property.name.trim(),
      type:       property.type,
      room_count: property.room_count,
      stars:      property.stars ? parseInt(property.stars) : undefined,
      address:    property.address,
    });
  };

  // ── Loading state ────────────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F5F1' }}>
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#F6F5F1' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#5346A8' }}>
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg" style={{ color: '#5346A8' }}>Qayed</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{ background: i <= step ? '#5346A8' : '#DDD9CF', color: i <= step ? '#fff' : '#9ca3af' }}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-gray-700' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="card w-full max-w-md p-8">

        {/* ── Step 0: Welcome ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: 'var(--qayed-cachet)' }}
            >
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="qayed-display text-xl text-gray-900 mb-2">
                {hasProperty && profile ? t('onboarding.welcomeBackTitle', { name: profile.name }) : t('onboarding.welcomeTitle')}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {hasProperty ? t('onboarding.welcomeBodyExisting') : t('onboarding.welcomeBodyNew')}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2 text-start p-4 rounded-xl" style={{ background: '#F6F5F1' }}>
              {(hasProperty
                ? [t('onboarding.checklistAddRooms'), t('onboarding.checklistScanPassport'), t('onboarding.checklistManageCheckins')]
                : [t('onboarding.checklistCreateProperty'), t('onboarding.checklistAddRooms'), t('onboarding.checklistManageCheckins')]
              ).map((item, i) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: '#5346A8' }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <Button fullWidth size="lg" className="gap-2" onClick={() => setStep(1)}>
              {t('onboarding.start')} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Step 1 (no-property flow): Create first property ────────── */}
        {step === STEP_PROPERTY && STEP_PROPERTY > 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="qayed-display text-lg text-gray-900 mb-1">{t('onboarding.firstPropertyTitle')}</h2>
              <p className="text-sm text-gray-400">
                {t('onboarding.firstPropertyBody')}
              </p>
            </div>

            <Input
              label={t('onboarding.nameRequired')}
              placeholder={t('onboarding.namePlaceholder')}
              value={property.name}
              onChange={(e) => setProp('name', e.target.value)}
              error={propErrors['name']}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('onboarding.typeRequired')}
                </label>
                <select
                  className="input w-full"
                  value={property.type}
                  onChange={(e) => setProp('type', e.target.value)}
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>
                  ))}
                </select>
              </div>
              <Input
                label={t('onboarding.roomsCountRequired')}
                type="number"
                min={1}
                value={property.room_count}
                onChange={(e) => setProp('room_count', parseInt(e.target.value) || 1)}
                error={propErrors['room_count']}
              />
            </div>

            <Input
              label={t('onboarding.starsOptional')}
              type="number"
              min={1}
              max={5}
              placeholder="1 – 5"
              value={property.stars}
              onChange={(e) => setProp('stars', e.target.value)}
            />

            <div className="h-px bg-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('onboarding.address')}</p>

            <Input
              label={t('onboarding.addressRequired')}
              placeholder={t('onboarding.addressPlaceholder')}
              value={property.address.line1}
              onChange={(e) => setPropAddr('line1', e.target.value)}
              error={propErrors['address.line1']}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('onboarding.cityRequired')}
                placeholder={t('onboarding.cityPlaceholder')}
                value={property.address.city}
                onChange={(e) => setPropAddr('city', e.target.value)}
                error={propErrors['address.city']}
              />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('onboarding.governorateRequired')}
                </label>
                <select
                  className="input w-full"
                  value={property.address.governorate}
                  onChange={(e) => setPropAddr('governorate', e.target.value)}
                >
                  {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {createPropertyMut.error && (
              <p className="text-xs text-red-500 text-center">
                {(createPropertyMut.error as any)?.response?.data?.message ?? t('onboarding.genericError')}
              </p>
            )}

            <Button
              fullWidth
              loading={createPropertyMut.isPending}
              onClick={handleCreateProperty}
            >
              {t('onboarding.createAndContinue')}
            </Button>
          </div>
        )}

        {/* ── Step: Add rooms ─────────────────────────────────────────── */}
        {step === STEP_ROOMS && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="qayed-display text-lg text-gray-900 mb-1">{t('onboarding.roomsTitle')}</h2>
              <p className="text-sm text-gray-400">
                {t('onboarding.roomsBody')}
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pe-1">
              {rooms.map((room, i) => (
                <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#F6F5F1' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500">{t('onboarding.unitLabel', { number: i + 1 })}</span>
                    {rooms.length > 1 && (
                      <button onClick={() => removeRoom(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label={t('onboarding.numberOrName')}
                      value={room.room_number}
                      onChange={(e) => updateRoom(i, 'room_number', e.target.value)}
                    />
                    <Input
                      label={t('onboarding.floor')}
                      value={room.floor}
                      onChange={(e) => updateRoom(i, 'floor', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {t('onboarding.type')}
                      </label>
                      <select
                        className="input w-full"
                        value={room.type}
                        onChange={(e) => updateRoom(i, 'type', e.target.value)}
                      >
                        {ROOM_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
                      </select>
                    </div>
                    <Input
                      label={t('onboarding.capacity')}
                      type="number"
                      min={1}
                      max={10}
                      value={room.capacity}
                      onChange={(e) => updateRoom(i, 'capacity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addRoom}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#5346A8' }}
            >
              <Plus className="h-4 w-4" /> {t('onboarding.addUnit')}
            </button>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep(STEP_DONE)}>{t('onboarding.skip')}</Button>
              <Button fullWidth loading={addRoomMut.isPending} onClick={handleRoomsNext}>
                {t('onboarding.saveAndContinue')}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ──────────────────────────────────────────────── */}
        {step === STEP_DONE && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="qayed-display text-xl text-gray-900 mb-2">{t('onboarding.doneTitle')}</h2>
              <p className="text-sm text-gray-500">
                {t('onboarding.doneBody')}
              </p>
            </div>
            <Button
              fullWidth
              size="lg"
              loading={completeMut.isPending}
              onClick={() => completeMut.mutate()}
            >
              {t('onboarding.goToDashboard')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

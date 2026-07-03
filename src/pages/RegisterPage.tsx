import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2, Building2, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchPlans, registerHotel, RegisterPayload } from '@/api/public';

const HOTEL_TYPES = [
  { value: 'hotel',      label: 'Hôtel' },
  { value: 'guesthouse', label: 'Maison d\'hôtes' },
  { value: 'rental',     label: 'Location saisonnière' },
  { value: 'hostel',     label: 'Auberge de jeunesse' },
  { value: 'resort',     label: 'Resort' },
];

const GOVERNORATES = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

const STEPS = [
  { label: 'Établissement', icon: Building2 },
  { label: 'Compte admin',  icon: User },
  { label: 'Abonnement',   icon: CreditCard },
];

type FormData = Omit<RegisterPayload, 'password_confirmation'> & { password_confirmation: string };

const INIT: FormData = {
  hotel_name: '', hotel_type: 'hotel', room_count: 10, stars: null, registration_number: '',
  address: { line1: '', city: '', governorate: 'Tunis', postal_code: '' },
  first_name: '', last_name: '', email: '', phone: '',
  password: '', password_confirmation: '',
  plan_slug: '',
};

export const RegisterPage = () => {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...INIT, plan_slug: params.get('plan') ?? '' });
  const [done, setDone] = useState<{ hotelName: string; email: string; trialEnds: string } | null>(null);

  const set   = (k: keyof FormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string) => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: fetchPlans });

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => registerHotel(form as RegisterPayload),
    onSuccess: (res) => {
      setDone({
        hotelName: res.data.hotel.name,
        email:     res.data.user.email,
        trialEnds: new Date(res.data.trial_ends_at).toLocaleDateString('fr-FR'),
      });
    },
  });

  const errors = (error as any)?.response?.data?.errors ?? [];
  const fieldErr = (field: string) => errors.find((e: any) => e.field === field)?.message ?? '';

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F4EF' }}>
        <div className="card w-full max-w-md p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Inscription réussie !</h2>
          <p className="text-gray-500 text-sm mb-1">
            <strong>{done.hotelName}</strong> est maintenant sur CheckTunisia.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Votre essai gratuit est actif jusqu'au <strong>{done.trialEnds}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Connectez-vous avec <strong>{done.email}</strong> pour commencer.
          </p>
          <Button fullWidth size="lg" onClick={() => navigate('/login')}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: '#F5F4EF' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 max-w-lg mx-auto">
        <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: '#1B3A5F' }}>
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: '#1B3A5F' }}>CheckTunisia</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{
                  background: i <= step ? '#1B3A5F' : '#E0DDD7',
                  color: i <= step ? '#fff' : '#9ca3af',
                }}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="card w-full max-w-lg mx-auto p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{STEPS[step].label}</h1>
        <p className="text-sm text-gray-400 mb-6">Étape {step + 1} sur {STEPS.length}</p>

        {/* ── Step 0: Hotel info ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Input label="Nom de l'établissement *" value={form.hotel_name}
              onChange={(e) => set('hotel_name', e.target.value)} error={fieldErr('hotel_name')} />

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type d'établissement *</label>
              <select className="input w-full" value={form.hotel_type} onChange={(e) => set('hotel_type', e.target.value)}>
                {HOTEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre de chambres *" type="number" min={1} value={form.room_count}
                onChange={(e) => set('room_count', parseInt(e.target.value) || 1)} error={fieldErr('room_count')} />
              <Input label="Étoiles (optionnel)" type="number" min={1} max={5} value={form.stars ?? ''}
                onChange={(e) => set('stars', e.target.value ? parseInt(e.target.value) : null)} />
            </div>

            <Input label="N° Registre du commerce (optionnel)" value={form.registration_number ?? ''}
              onChange={(e) => set('registration_number', e.target.value)} />

            <div className="h-px bg-gray-100 my-1" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</p>

            <Input label="Adresse *" value={form.address.line1}
              onChange={(e) => setAddr('line1', e.target.value)} error={fieldErr('address.line1')} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Ville *" value={form.address.city}
                onChange={(e) => setAddr('city', e.target.value)} error={fieldErr('address.city')} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gouvernorat *</label>
                <select className="input w-full" value={form.address.governorate}
                  onChange={(e) => setAddr('governorate', e.target.value)}>
                  {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Admin account ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom *" value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)} error={fieldErr('first_name')} />
              <Input label="Nom *" value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)} error={fieldErr('last_name')} />
            </div>
            <Input label="Email professionnel *" type="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} error={fieldErr('email')} />
            <Input label="Téléphone (optionnel)" type="tel" value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)} />
            <Input label="Mot de passe *" type="password" value={form.password}
              onChange={(e) => set('password', e.target.value)} error={fieldErr('password')}
              hint="12 caractères min. · majuscule · chiffre · symbole" />
            <Input label="Confirmer le mot de passe *" type="password" value={form.password_confirmation}
              onChange={(e) => set('password_confirmation', e.target.value)} />
          </div>
        )}

        {/* ── Step 2: Plan selection ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 mb-2">
              Choisissez le plan qui correspond au nombre de chambres de votre établissement.
              <br /><strong>30 jours d'essai gratuit</strong> inclus.
            </p>
            {plans.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => set('plan_slug', p.slug)}
                className="flex items-start gap-4 rounded-2xl p-4 text-left transition-all"
                style={{
                  border: form.plan_slug === p.slug ? '2px solid #1B3A5F' : '1.5px solid #E0DDD7',
                  background: form.plan_slug === p.slug ? 'rgba(27,58,95,0.04)' : '#fff',
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: form.plan_slug === p.slug ? '#1B3A5F' : '#F5F4EF' }}
                >
                  <Building2 className={`h-5 w-5 ${form.plan_slug === p.slug ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{p.name}</span>
                    <span className="text-lg font-extrabold" style={{ color: '#1B3A5F' }}>{p.price_monthly} TND<span className="text-xs font-normal text-gray-400">/mois</span></span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.max_rooms ? `${p.min_rooms}–${p.max_rooms} chambres` : `${p.min_rooms}+ chambres`}
                    {' · '}
                    {p.features.max_users === -1 ? 'Utilisateurs illimités' : `${p.features.max_users} utilisateurs`}
                  </p>
                </div>
                {form.plan_slug === p.slug && (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#1B3A5F' }} />
                )}
              </button>
            ))}
            {errors.find((e: any) => e.field === 'plan_slug') && (
              <p className="text-xs text-red-500">{fieldErr('plan_slug')}</p>
            )}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              fullWidth
              className="gap-2"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && (!form.hotel_name || !form.address.line1 || !form.address.city)) ||
                (step === 1 && (!form.first_name || !form.last_name || !form.email || !form.password))
              }
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button fullWidth loading={isPending} disabled={!form.plan_slug} onClick={() => mutate()}>
              Créer mon compte
            </Button>
          )}
        </div>

        {errors.filter((e: any) => !e.field).map((e: any, i: number) => (
          <p key={i} className="mt-3 text-xs text-center text-red-500">{e.message}</p>
        ))}

        <p className="mt-5 text-center text-xs text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#1B3A5F' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

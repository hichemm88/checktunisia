import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2,
  Building2, User, CreditCard, Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchPlans, registerOrganization, RegisterPayload } from '@/api/public';

const STEPS = [
  { label: 'Type de compte',      icon: Briefcase },
  { label: 'Votre organisation',  icon: Building2 },
  { label: 'Compte admin',        icon: User },
  { label: 'Abonnement',          icon: CreditCard },
];

type FormData = RegisterPayload & { password_confirmation: string };

const INIT: FormData = {
  entity_type: 'company',
  org_name: '', org_registration_number: '', org_phone: '',
  first_name: '', last_name: '', email: '', phone: '',
  password: '', password_confirmation: '',
  plan_slug: '',
};

export const RegisterPage = () => {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...INIT, plan_slug: params.get('plan') ?? '' });
  const [done, setDone] = useState<{ orgName: string; email: string; trialEnds: string } | null>(null);

  const set = (k: keyof FormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: fetchPlans });

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => registerOrganization(form as RegisterPayload),
    onSuccess: (res) => {
      setDone({
        orgName:   res.data.organization.name,
        email:     res.data.user.email,
        trialEnds: new Date(res.data.trial_ends_at).toLocaleDateString('fr-FR'),
      });
    },
  });

  const apiErrors = (error as any)?.response?.data?.errors ?? {};
  const fieldErr  = (field: string): string => {
    if (Array.isArray(apiErrors)) return apiErrors.find((e: any) => e.field === field)?.message ?? '';
    return apiErrors[field]?.[0] ?? '';
  };

  const canNext = [
    true,                                                                  // step 0: type
    !!form.org_name,                                                       // step 1: organisation
    !!(form.first_name && form.last_name && form.email && form.password),  // step 2: compte
    !!form.plan_slug,                                                      // step 3: abonnement
  ];

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F6F5F1' }}>
      <div className="card w-full max-w-md p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Inscription réussie !</h2>
        <p className="text-gray-500 text-sm mb-1">
          <strong>{done.orgName}</strong> est maintenant sur Qayed.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Essai gratuit actif jusqu'au <strong>{done.trialEnds}</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-2">
          Connectez-vous avec <strong>{done.email}</strong>.
        </p>
        <p className="text-xs text-gray-400 mb-8">
          Vous pourrez ajouter vos établissements juste après la connexion.
        </p>
        <Button fullWidth size="lg" onClick={() => navigate('/login')}>Se connecter</Button>
      </div>
    </div>
  );

  // ── Wizard ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-10" style={{ background: '#F6F5F1' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 max-w-xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: '#5346A8' }}>
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: '#5346A8' }}>Qayed</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{ background: i <= step ? '#5346A8' : '#DDD9CF', color: i <= step ? '#fff' : '#9ca3af' }}
              >
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden md:block ${i <= step ? 'text-gray-800' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-5 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="card w-full max-w-xl mx-auto p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{STEPS[step].label}</h1>
        <p className="text-sm text-gray-400 mb-6">Étape {step + 1} sur {STEPS.length}</p>

        {/* ── Étape 0 : Type de compte ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Inscrivez une <strong>société</strong> (SARL, SA…) ou un <strong>particulier</strong>.
              Un seul compte gère tous vos hébergements.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {([
                ['company',    'Société',      Briefcase, 'SARL, SA, STE, SUARL…'],
                ['individual', 'Particulier',  User,      'Propriétaire en nom propre'],
              ] as const).map(([val, label, Icon, sub]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('entity_type', val)}
                  className="flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition-all"
                  style={{
                    border: form.entity_type === val ? '2px solid #5346A8' : '1.5px solid #DDD9CF',
                    background: form.entity_type === val ? 'rgba(83,70,168,0.05)' : '#fff',
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: form.entity_type === val ? '#5346A8' : '#F6F5F1' }}
                  >
                    <Icon className={`h-6 w-6 ${form.entity_type === val ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </div>
                  {form.entity_type === val && <CheckCircle2 className="h-4 w-4" style={{ color: '#5346A8' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Étape 1 : Votre organisation ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Input
              label={form.entity_type === 'company' ? 'Raison sociale *' : 'Nom complet *'}
              placeholder={form.entity_type === 'company' ? 'Ex: Kasbahost SARL' : 'Ex: Mohammed Ben Ali'}
              value={form.org_name}
              onChange={(e) => set('org_name', e.target.value)}
              error={fieldErr('org_name')}
            />
            <Input
              label={form.entity_type === 'company' ? 'N° Registre du commerce (optionnel)' : 'N° CIN (optionnel)'}
              value={form.org_registration_number ?? ''}
              onChange={(e) => set('org_registration_number', e.target.value)}
            />
            <Input
              label="Téléphone de contact (optionnel)"
              type="tel"
              value={form.org_phone ?? ''}
              onChange={(e) => set('org_phone', e.target.value)}
            />
            <div className="rounded-xl p-4 text-sm text-gray-500" style={{ background: '#F6F5F1' }}>
              Vous pourrez ajouter vos établissements (appartements, villas, hôtels…)
              directement après la connexion.
            </div>
          </div>
        )}

        {/* ── Étape 2 : Compte admin ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom *"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                error={fieldErr('first_name')}
              />
              <Input
                label="Nom *"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                error={fieldErr('last_name')}
              />
            </div>
            <Input
              label="Email professionnel *"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={fieldErr('email')}
            />
            <Input
              label="Téléphone (optionnel)"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              label="Mot de passe *"
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              error={fieldErr('password')}
              hint="12 car. min · majuscule · chiffre · symbole"
            />
            <Input
              label="Confirmer le mot de passe *"
              type="password"
              value={form.password_confirmation}
              onChange={(e) => set('password_confirmation', e.target.value)}
            />
          </div>
        )}

        {/* ── Étape 3 : Abonnement ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 -mt-2">
              Plan appliqué à <strong>l'ensemble de vos hébergements</strong>.
              <strong> 30 jours d'essai gratuit</strong> inclus — aucun paiement maintenant.
            </p>
            {plans.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => set('plan_slug', p.slug)}
                className="flex items-start gap-4 rounded-2xl p-4 text-left transition-all"
                style={{
                  border: form.plan_slug === p.slug ? '2px solid #5346A8' : '1.5px solid #DDD9CF',
                  background: form.plan_slug === p.slug ? 'rgba(83,70,168,0.05)' : '#fff',
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: form.plan_slug === p.slug ? '#5346A8' : '#F6F5F1' }}
                >
                  <Building2 className={`h-5 w-5 ${form.plan_slug === p.slug ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{p.name}</span>
                    <span className="text-lg font-extrabold" style={{ color: '#5346A8' }}>
                      {p.price_monthly} TND<span className="text-xs font-normal text-gray-400">/mois</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.max_rooms ? `jusqu'à ${p.max_rooms} unités au total` : `${p.min_rooms}+ unités`}
                    {' · '}
                    {p.features.max_users === -1 ? 'Utilisateurs illimités' : `${p.features.max_users} utilisateurs`}
                  </p>
                </div>
                {form.plan_slug === p.slug && (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#5346A8' }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button fullWidth className="gap-2" onClick={() => setStep((s) => s + 1)} disabled={!canNext[step]}>
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button fullWidth loading={isPending} disabled={!form.plan_slug} onClick={() => mutate()}>
              Créer mon compte
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs text-center text-red-500">
            {(error as any)?.response?.data?.message ?? 'Une erreur est survenue.'}
          </p>
        )}

        <p className="mt-5 text-center text-xs text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#5346A8' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, CheckCircle2,
  Building2, User, CreditCard, Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { fetchPlans, registerOrganization, RegisterPayload } from '@/api/public';
import { effectiveYearlyPrice } from '@/lib/billing';
import { formatTNDAmount } from '@/lib/money';
import { track } from '@/lib/analytics';

type FormData = RegisterPayload & { password_confirmation: string };

/** Noms stables des étapes (indépendants de la langue) pour l'analytics. */
const STEP_NAMES = ['type', 'organisation', 'account', 'plan'] as const;

const INIT: FormData = {
  entity_type: 'company',
  org_name: '', org_registration_number: '', org_phone: '',
  first_name: '', last_name: '', email: '', phone: '',
  password: '', password_confirmation: '',
  plan_slug: '',
  billing_cycle: 'monthly',
};

export const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...INIT, plan_slug: params.get('plan') ?? '' });
  const [done, setDone] = useState<{ orgName: string; email: string; trialEnds: string } | null>(null);

  const STEPS = [
    { label: t('register.step0Label'), icon: Briefcase },
    { label: t('register.step1Label'), icon: Building2 },
    { label: t('register.step2Label'), icon: User },
    { label: t('register.step3Label'), icon: CreditCard },
  ];

  const set = (k: keyof FormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  // Tunnel d'inscription — mesure du drop-off par étape (attribution jointe).
  useEffect(() => {
    track('register_step_view', { step, step_name: STEP_NAMES[step] });
  }, [step]);

  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: fetchPlans });

  // Langue de communication = langue de l'interface au moment de l'inscription
  // (fr/en/ar), pour que les emails partent dans la bonne langue.
  const uiLocale = (['fr', 'en', 'ar'].includes(i18n.language) ? i18n.language : 'fr') as 'fr' | 'en' | 'ar';

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => registerOrganization({ ...form, locale: uiLocale } as RegisterPayload),
    onSuccess: (res) => {
      track('register_success', { plan: form.plan_slug, entity_type: form.entity_type });
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--qayed-papier)' }}>
      <div className="card w-full max-w-md p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-5" style={{ background: 'var(--qayed-conforme-fond)' }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--qayed-conforme)' }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('register.successTitle')}</h2>
        <p className="text-gray-500 text-sm mb-1">
          <Trans t={t} i18nKey="register.successOrgLine" values={{ orgName: done.orgName }} components={{ strong: <strong /> }} />
        </p>
        <p className="text-gray-400 text-sm mb-6">
          <Trans t={t} i18nKey="register.successTrialLine" values={{ trialEnds: done.trialEnds }} components={{ strong: <strong /> }} />
        </p>
        <p className="text-sm text-gray-500 mb-2">
          <Trans t={t} i18nKey="register.successLoginLine" values={{ email: done.email }} components={{ strong: <strong /> }} />
        </p>
        <p className="text-xs text-gray-400 mb-8">
          {t('register.successHint')}
        </p>
        <Button fullWidth size="lg" onClick={() => navigate('/login')}>{t('auth.loginButton')}</Button>
      </div>
    </div>
  );

  // ── Wizard ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--qayed-papier)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 max-w-xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Link>
        <div className="flex items-center gap-3 ms-auto">
          <LanguageSwitcher />
          <div className="flex items-center gap-2">
            <QayedStamp size={26} />
            <span className="qayed-display text-sm text-qayed-cachet">QAYED</span>
          </div>
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
        <h1 className="qayed-display text-xl text-gray-900 mb-1">{STEPS[step].label}</h1>
        <p className="text-sm text-gray-400 mb-6">{t('register.stepOf', { current: step + 1, total: STEPS.length })}</p>

        {/* ── Étape 0 : Type de compte ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              <Trans t={t} i18nKey="register.entityTypeHint" components={{ strong: <strong /> }} />
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {([
                ['company',    t('register.entityCompany'),    Briefcase, t('register.entityCompanyHint')],
                ['individual', t('register.entityIndividual'), User,      t('register.entityIndividualHint')],
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
              label={form.entity_type === 'company' ? t('register.orgNameCompanyLabel') : t('register.orgNameIndividualLabel')}
              placeholder={form.entity_type === 'company' ? t('register.orgNameCompanyPlaceholder') : t('register.orgNameIndividualPlaceholder')}
              value={form.org_name}
              onChange={(e) => set('org_name', e.target.value)}
              error={fieldErr('org_name')}
            />
            <Input
              label={form.entity_type === 'company' ? t('register.orgRegistrationCompanyLabel') : t('register.orgRegistrationIndividualLabel')}
              value={form.org_registration_number ?? ''}
              onChange={(e) => set('org_registration_number', e.target.value)}
            />
            <Input
              label={t('register.orgPhoneLabel')}
              type="tel"
              value={form.org_phone ?? ''}
              onChange={(e) => set('org_phone', e.target.value)}
            />
            <div className="rounded-xl p-4 text-sm text-gray-500" style={{ background: '#F6F5F1' }}>
              {t('register.orgHint')}
            </div>
          </div>
        )}

        {/* ── Étape 2 : Compte admin ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('register.firstNameLabel')}
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                error={fieldErr('first_name')}
              />
              <Input
                label={t('register.lastNameLabel')}
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                error={fieldErr('last_name')}
              />
            </div>
            <Input
              label={t('register.workEmailLabel')}
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={fieldErr('email')}
            />
            <Input
              label={t('register.phoneLabel')}
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              label={t('register.passwordLabel')}
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              error={fieldErr('password')}
              hint={t('register.passwordHint')}
            />
            <Input
              label={t('register.passwordConfirmLabel')}
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
              <Trans t={t} i18nKey="register.planHint" components={{ strong: <strong /> }} />
            </p>

            {/* Cycle de facturation */}
            <div className="flex items-center gap-2 rounded-xl p-1 w-fit mx-auto" style={{ background: '#F6F5F1' }}>
              {(['monthly', 'yearly'] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => set('billing_cycle', cycle)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={form.billing_cycle === cycle
                    ? { background: '#fff', color: '#5346A8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { color: '#9ca3af' }}
                >
                  {t(cycle === 'monthly' ? 'register.billingMonthly' : 'register.billingYearly')}
                  {cycle === 'yearly' && (
                    <span className="ms-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                      {t('register.oneMonthFree')}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {plans.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => set('plan_slug', p.slug)}
                className="flex items-start gap-4 rounded-2xl p-4 text-start transition-all"
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
                    {form.billing_cycle === 'yearly' ? (
                      <span className="text-end">
                        <span className="block text-lg font-extrabold" style={{ color: '#5346A8' }}>
                          {formatTNDAmount(effectiveYearlyPrice(p))} TND<span className="text-xs font-normal text-gray-400">/{t('register.perYear')}</span>
                        </span>
                        <span className="block text-[11px] text-gray-400 line-through">
                          {formatTNDAmount(Number(p.price_monthly) * 12)} TND
                        </span>
                      </span>
                    ) : (
                      <span className="text-lg font-extrabold" style={{ color: '#5346A8' }}>
                        {p.price_monthly} TND<span className="text-xs font-normal text-gray-400">/{t('register.perMonth')}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.max_rooms ? t('register.upToUnits', { count: p.max_rooms }) : t('register.plusUnits', { count: p.min_rooms })}
                    {' · '}
                    {p.features.max_users === -1 ? t('register.unlimitedUsers') : t('register.nUsers', { count: p.features.max_users })}
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
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button fullWidth className="gap-2" onClick={() => setStep((s) => s + 1)} disabled={!canNext[step]}>
              {t('common.next')} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button fullWidth loading={isPending} disabled={!form.plan_slug} onClick={() => { track('register_submit', { plan: form.plan_slug, entity_type: form.entity_type }); mutate(); }}>
              {t('register.createAccount')}
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs text-center text-red-500">
            {(error as any)?.response?.data?.message ?? t('common.error')}
          </p>
        )}

        <p className="mt-5 text-center text-xs text-gray-400">
          {t('register.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#5346A8' }}>{t('auth.loginButton')}</Link>
        </p>
      </div>
    </div>
  );
};

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowRight, Building2, CalendarClock, CheckCircle, CreditCard,
  Gauge, History, Landmark, ShieldAlert, X,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { settingsApi } from '@/api/settings';
import { paymentApi } from '@/api/payment';
import { fetchPlatformSettings } from '@/api/public';
import { subscriptionApi, type PlanChangePreview, type SelectablePlan } from '@/api/subscription';
import { extractErrors } from '@/lib/api';
import { formatTND } from '@/lib/money';
import { isPerUnitOverage, quotaLevel, quotaPercent } from '@/lib/billing';
import {
  isImmediate, newIdempotencyKey, planChangeLabelKey, requiresHistoricConfirmation, requiresPayment,
} from '@/lib/planChange';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-TN');

const useLongDate = () => {
  const { i18n } = useTranslation();

  return (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleDateString(dateLocaleFor(i18n.language), {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '—';
};

// ─── Plan actuel : prix, quota, usage, dépassement, total estimé ──────────────

const CurrentPlanCard = ({
  sub, hideMoney = false,
}: {
  sub: NonNullable<Awaited<ReturnType<typeof settingsApi.getSubscription>>>;
  /** Compte interne : la consommation reste utile, son coût n'existe pas. */
  hideMoney?: boolean;
}) => {
  const { t } = useTranslation();
  const longDate = useLongDate();
  const quota = sub.quota;
  const planName = typeof sub.plan === 'string' ? sub.plan : (sub.plan?.name ?? '—');

  const level = quota ? quotaLevel(quota) : 'unlimited';
  const pct = quota ? quotaPercent(quota) : 0;
  const over = level === 'over';
  const perUnit = quota ? isPerUnitOverage(quota) : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" /> {t('subscriptionPage.currentPlan')}
          </div>
        </CardTitle>
      </CardHeader>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xl font-bold" style={{ color: '#5346A8' }}>{planName}</p>
        {!hideMoney && (
          <p className="font-mono text-lg font-semibold text-gray-900">
            {formatTND(quota?.monthly_base ?? sub.pricing?.monthly_total ?? 0)}
            <span className="ml-1 text-xs font-normal text-gray-500">{t('subscriptionPage.perMonth')}</span>
          </p>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Badge variant={sub.status === 'active' ? 'active' : 'suspended'}>
          {t(`settingsPage.subscriptionStatus.${sub.status}`, sub.status)}
        </Badge>
        {!hideMoney && (
          <span className="text-xs text-gray-500">
            {t('subscriptionPage.periodUntil', { date: longDate(sub.expires_at) })}
          </span>
        )}
      </div>

      {quota && !quota.unlimited && quota.quota != null && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: over || level === 'reached' ? '#E3A008' : level === 'warning' ? '#5346A8' : '#1F9D6B',
                }}
              />
            </div>
            <span className="font-mono text-sm font-semibold text-gray-700">
              {quota.used}/{quota.quota}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {!over && quota.remaining != null && (
              <span>{t('settingsPage.quotaRemaining', { count: quota.remaining })}</span>
            )}
            {!hideMoney && quota.billable && quota.unit_price != null && (
              <span>{t('settingsPage.quotaUnitPrice', { price: formatTND(quota.unit_price) })}</span>
            )}
          </div>

          {!hideMoney && over && quota.billable && quota.overage_amount != null && quota.overage_amount > 0 && (
            <div className="rounded-xl p-3" style={{ background: '#FBF0D7' }}>
              <p className="text-sm font-semibold" style={{ color: '#8A6206' }}>
                {t('settingsPage.quotaOverage', { count: quota.overage_count })}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: '#8A6206' }}>
                {perUnit
                  ? t('settingsPage.quotaOverageBilledUnit', {
                      count: quota.bundle_count,
                      price: formatTND(quota.unit_price ?? 0),
                      amount: formatTND(quota.overage_amount),
                    })
                  : t('settingsPage.quotaOverageBilled', {
                      bundles: quota.bundle_count, size: quota.bundle_size ?? 0,
                      amount: formatTND(quota.overage_amount),
                    })}
              </p>
            </div>
          )}

          {!hideMoney && quota.estimated_total != null && (
            <div className="mt-1 flex items-baseline justify-between border-t border-gray-100 pt-2">
              <span className="text-xs text-gray-500">{t('settingsPage.quotaEstimatedTotal')}</span>
              <span className="font-mono text-sm font-semibold text-gray-800">{formatTND(quota.estimated_total)}</span>
            </div>
          )}
        </div>
      )}

      {quota?.unlimited && (
        <p className="mt-4 text-sm text-gray-600">
          {t('subscriptionPage.unlimitedUsage', { count: quota.used })}
        </p>
      )}
    </Card>
  );
};

/**
 * Prochaine échéance + pilotage de la reconduction.
 *
 * Le mot « prélèvement » est banni de cet écran : Flouci ne fait que des
 * paiements ponctuels. Ce que Qayed automatise, c'est l'émission de la
 * facture et la notification — le règlement reste une action du client, et
 * l'interface le dit noir sur blanc plutôt que de laisser croire à un débit
 * de carte qui n'aura jamais lieu.
 */
const NextRenewalCard = ({
  renewal, autoRenew, cancellationScheduled, onStop, onResume, working,
}: {
  renewal: NonNullable<NonNullable<Awaited<ReturnType<typeof settingsApi.getSubscription>>>['next_renewal']>;
  autoRenew: boolean;
  cancellationScheduled: boolean;
  onStop: () => void;
  onResume: () => void;
  working: boolean;
}) => {
  const { t } = useTranslation();
  const longDate = useLongDate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-gray-400" /> {t('subscriptionPage.nextDueTitle')}
          </div>
        </CardTitle>
      </CardHeader>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 border-b border-gray-50 py-1.5">
          <span className="text-sm text-gray-500">{t('subscriptionPage.nextDueDate')}</span>
          <span className="text-sm font-medium text-gray-900">{longDate(renewal.due_at)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-gray-50 py-1.5">
          <span className="text-sm text-gray-500">
            {t('subscriptionPage.nextDueAmount', { plan: renewal.plan_name ?? '—' })}
          </span>
          <span className="font-mono text-sm font-bold text-gray-900">{formatTND(renewal.amount)}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{t('subscriptionPage.renewalLabel')}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {autoRenew && !cancellationScheduled
                ? t('subscriptionPage.renewalOnHint', { days: renewal.invoice_lead_days })
                : t('subscriptionPage.renewalOffHint')}
            </p>
          </div>
          <Badge variant={autoRenew && !cancellationScheduled ? 'active' : 'suspended'}>
            {autoRenew && !cancellationScheduled
              ? t('subscriptionPage.renewalOn')
              : t('subscriptionPage.renewalOff')}
          </Badge>
        </div>

        <Button
          size="sm"
          variant={autoRenew && !cancellationScheduled ? 'ghost' : 'primary'}
          className="mt-1 self-start"
          loading={working}
          onClick={autoRenew && !cancellationScheduled ? onStop : onResume}
        >
          {autoRenew && !cancellationScheduled
            ? t('subscriptionPage.cancelRenewal')
            : t('subscriptionPage.resumeRenewal')}
        </Button>

        {/* Ce que Qayed fait — et ne fait pas — à l'échéance. */}
        <p className="mt-1 text-xs text-gray-400">{t('subscriptionPage.noAutoDebit')}</p>
      </div>
    </Card>
  );
};

/**
 * Compte en essai, expiré ou suspendu : la seule chose à faire est de payer
 * sa formule. On met cet appel à l'action au-dessus de tout le reste plutôt
 * que de le noyer dans une comparaison d'offres.
 */
const ActivateBanner = ({
  status, planName, amount, onActivate, working,
}: {
  status: string; planName: string; amount: number | null;
  onActivate: () => void; working: boolean;
}) => {
  const { t } = useTranslation();
  const blocked = status !== 'trial';

  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4"
      style={blocked
        ? { background: '#FEF2F2', border: '1px solid #FECACA' }
        : { background: '#EEEBFA', border: '1px solid #C9C1EE' }}
    >
      {blocked
        ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#5346A8' }} />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: blocked ? '#991B1B' : '#443896' }}>
          {blocked ? t('subscriptionPage.activateBlockedTitle') : t('subscriptionPage.activateTrialTitle')}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: blocked ? '#991B1B' : '#5346A8' }}>
          {blocked ? t('subscriptionPage.activateBlockedHint') : t('subscriptionPage.activateTrialHint')}
        </p>
        <Button size="sm" className="mt-2" loading={working} onClick={onActivate}>
          {amount != null
            ? t('subscriptionPage.activateCtaWithAmount', { plan: planName, amount: formatTND(amount) })
            : t('subscriptionPage.activateCta', { plan: planName })}
        </Button>
      </div>
    </div>
  );
};

/**
 * Compte interne : le produit sans le commerce.
 *
 * Tout ce qui parle d'argent disparaît — prix à payer, facture à régler,
 * changement de plan, dépassement facturable. Ce qui reste est
 * opérationnel : la formule en cours et la consommation, qui restent utiles
 * à qui exploite le compte.
 */
const InternalAccountCard = ({ planName }: { planName: string }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" /> {t('subscriptionPage.internalTitle')}
          </div>
        </CardTitle>
      </CardHeader>
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-sm text-gray-600">{t('subscriptionPage.internalHint')}</p>
        <div className="flex items-baseline justify-between gap-3 border-t border-gray-50 pt-2">
          <span className="text-sm text-gray-500">{t('subscriptionPage.internalPlan')}</span>
          <span className="text-sm font-bold" style={{ color: '#5346A8' }}>{planName}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-gray-500">{t('subscriptionPage.internalBilling')}</span>
          <Badge variant="active">{t('subscriptionPage.internalBillingValue')}</Badge>
        </div>
      </div>
    </Card>
  );
};

// ─── Bandeaux d'état : changement en cours, résiliation programmée ────────────

const PendingChangeBanner = ({
  change, onCancel, cancelling, onlinePayment, onGoToInvoices,
}: {
  change: NonNullable<Awaited<ReturnType<typeof settingsApi.getSubscription>>['pending_change']>;
  onCancel: () => void;
  cancelling: boolean;
  /** Le paiement en ligne est-il réellement ouvert ? (même drapeau que l'écran Factures) */
  onlinePayment: boolean;
  onGoToInvoices: () => void;
}) => {
  const { t } = useTranslation();
  const longDate = useLongDate();
  const { toast } = useToast();

  const payMut = useMutation({
    mutationFn: (invoiceId: string) => paymentApi.initiate(invoiceId),
    onSuccess: (result) => { window.location.href = result.payment_url; },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const awaitingPayment = change.status === 'pending_payment';

  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4"
      style={awaitingPayment
        ? { background: '#FBF0D7', border: '1px solid #E3A008' }
        : { background: '#EEEBFA', border: '1px solid #C9C1EE' }}
    >
      {awaitingPayment
        ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#E3A008' }} />
        : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#5346A8' }} />}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: awaitingPayment ? '#8A6206' : '#443896' }}>
          {awaitingPayment
            ? t(planChangeLabelKey('pendingPaymentTitle', change.kind), { plan: change.to_plan?.name ?? '—' })
            : t('subscriptionPage.scheduledTitle', {
                plan: change.to_plan?.name ?? '—', date: longDate(change.effective_at),
              })}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: awaitingPayment ? '#8A6206' : '#5346A8' }}>
          {awaitingPayment
            ? t(planChangeLabelKey('pendingPaymentHint', change.kind), { amount: formatTND(change.amount_due) })
            : t('subscriptionPage.scheduledHint')}
        </p>

        {/* Le paiement en ligne n'est pas toujours ouvert. Proposer un bouton
            qui échoue systématiquement laissait le client devant un « service
            indisponible, réessayez » qui ne se résoudrait jamais — alors que
            la facture est réglable par virement depuis l'écran Factures. */}
        {awaitingPayment && !onlinePayment && (
          <p className="mt-1 text-xs" style={{ color: '#8A6206' }}>
            {t('subscriptionPage.payOfflineHint')}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {awaitingPayment && change.invoice && (
            onlinePayment ? (
              <Button
                size="sm"
                loading={payMut.isPending}
                onClick={() => payMut.mutate(change.invoice!.id)}
              >
                {t('subscriptionPage.payNow')}
              </Button>
            ) : (
              <Button size="sm" onClick={onGoToInvoices}>
                {t('subscriptionPage.payByTransfer')}
              </Button>
            )
          )}
          <Button size="sm" variant="secondary" loading={cancelling} onClick={onCancel}>
            {t(planChangeLabelKey('cancelChange', change.kind))}
          </Button>
        </div>
      </div>
    </div>
  );
};

const CancellationBanner = ({
  endsAt, onReactivate, working,
}: { endsAt: string | null; onReactivate: () => void; working: boolean }) => {
  const { t } = useTranslation();
  const longDate = useLongDate();

  return (
    <div className="flex items-start gap-3 rounded-2xl p-4" style={{ background: '#FBF0D7', border: '1px solid #E3A008' }}>
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#E3A008' }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: '#8A6206' }}>
          {t('subscriptionPage.cancelledTitle', { date: longDate(endsAt) })}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: '#8A6206' }}>{t('subscriptionPage.cancelledHint')}</p>
        <Button size="sm" className="mt-2" loading={working} onClick={onReactivate}>
          {t('subscriptionPage.keepSubscription')}
        </Button>
      </div>
    </div>
  );
};

// ─── Choix du plan ────────────────────────────────────────────────────────────

const PlanOption = ({ plan, onChoose }: { plan: SelectablePlan; onChoose: (p: SelectablePlan) => void }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'fr';
  const change = plan.change;
  const quota = plan.features?.checkins_per_month;
  const displayName = plan.marketing?.display_name?.[lang] ?? plan.name;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${plan.is_current ? 'border-transparent' : 'border-gray-100'}`}
      style={plan.is_current ? { background: 'var(--qayed-papier)' } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{displayName}</p>
          <p className="mt-0.5 font-mono text-base font-semibold" style={{ color: '#5346A8' }}>
            {formatTND(plan.price_monthly)}
            <span className="ml-1 font-sans text-xs font-normal text-gray-500">{t('subscriptionPage.perMonth')}</span>
          </p>
        </div>
        {plan.is_current
          ? <Badge variant="active">{t('subscriptionPage.yourPlan')}</Badge>
          : (
            <Button size="sm" variant="secondary" disabled={!change?.allowed} onClick={() => onChoose(plan)}>
              {change?.kind === 'downgrade' ? t('subscriptionPage.switchDown') : t('subscriptionPage.switchUp')}
            </Button>
          )}
      </div>

      <ul className="flex flex-col gap-1 text-xs text-gray-600">
        <li>
          {quota === null || quota === undefined || Number(quota) < 0
            ? t('subscriptionPage.unlimitedCheckins')
            : t('subscriptionPage.includedCheckins', { count: Number(quota) })}
        </li>
        {plan.overage_price != null && (
          <li>{t('subscriptionPage.overagePerCheckin', { price: formatTND(plan.overage_price) })}</li>
        )}
      </ul>

      {/* Effet et coût — calculés par le backend pour CE client. */}
      {change && (
        <p className="text-xs" style={{ color: change.allowed ? '#5346A8' : '#B45309' }}>
          {!change.allowed
            ? change.reason
            : change.effective === 'next_cycle'
              ? t('subscriptionPage.effectNextCycle')
              : change.amount_due_now > 0
                ? t('subscriptionPage.effectNowWithPayment', { amount: formatTND(change.amount_due_now) })
                : t('subscriptionPage.effectNowFree')}
        </p>
      )}
    </div>
  );
};

/**
 * Écran de confirmation — le résumé exact de ce qui va se passer.
 *
 * Tous les montants proviennent de la simulation serveur : le front ne fait
 * aucune arithmétique de facturation ici.
 */
const ConfirmChange = ({
  plan, preview, onClose, onConfirm, working,
}: {
  plan: SelectablePlan;
  preview: PlanChangePreview;
  onClose: () => void;
  onConfirm: (acceptConditions: boolean) => void;
  working: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'fr';
  const longDate = useLongDate();
  const [accepted, setAccepted] = useState(false);

  const needsHistoric = requiresHistoricConfirmation(preview);
  const displayName = plan.marketing?.display_name?.[lang] ?? plan.name;

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${strong ? 'font-mono font-bold text-gray-900' : 'font-medium text-gray-900'}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">
            {t(preview.kind === 'subscribe'
              ? 'subscriptionPage.confirmSubscribeTitle'
              : planChangeLabelKey('confirmTitle', preview.kind))}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col divide-y divide-gray-50">
          <Row
            label={t(preview.kind === 'subscribe' ? 'subscriptionPage.confirmPlan' : 'subscriptionPage.confirmNewPlan')}
            value={displayName}
          />
          <Row
            label={t('subscriptionPage.confirmEffect')}
            value={isImmediate(preview) ? t('subscriptionPage.effectImmediate') : t('subscriptionPage.effectScheduled')}
          />
          {preview.effective_at && (
            <Row label={t('subscriptionPage.confirmDate')} value={longDate(preview.effective_at)} />
          )}
          <Row
            label={t('subscriptionPage.confirmQuota')}
            value={preview.quota_to === null
              ? t('subscriptionPage.unlimitedCheckins')
              : t('subscriptionPage.includedCheckins', { count: preview.quota_to })}
          />
          {preview.overage_unit_price_to != null && (
            <Row
              label={t('subscriptionPage.confirmOverage')}
              value={t('subscriptionPage.overagePerCheckin', { price: formatTND(preview.overage_unit_price_to) })}
            />
          )}
          {preview.credit_applied > 0 && (
            <Row label={t('subscriptionPage.confirmCredit')} value={`− ${formatTND(preview.credit_applied)}`} />
          )}
          <Row label={t('subscriptionPage.confirmDueNow')} value={formatTND(preview.amount_due_now)} strong />
          <Row label={t('subscriptionPage.confirmNextRenewal')} value={formatTND(preview.next_renewal_amount)} />
        </div>

        {/* L'usage déjà déclaré dépasse le quota du nouveau plan : on le dit
            avant, pas après. L'historique n'est jamais réécrit. */}
        {preview.usage_exceeds_new_quota && (
          <div className="mt-3 flex items-start gap-2 rounded-xl p-3" style={{ background: '#FBF0D7' }}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#E3A008' }} />
            <p className="text-xs" style={{ color: '#8A6206' }}>
              {t('subscriptionPage.usageExceedsWarning', {
                usage: preview.usage,
                quota: preview.quota_to ?? 0,
              })}
            </p>
          </div>
        )}

        {/* Conditions historiques : jamais retirées sur un simple clic. */}
        {needsHistoric && (
          <div className="mt-3 rounded-xl p-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs text-red-800">
                {t('subscriptionPage.historicWarning', {
                  current: preview.historic_conditions?.checkins_label
                    ?? t('subscriptionPage.historicConditionsGeneric'),
                  next: preview.quota_to === null
                    ? t('subscriptionPage.unlimitedCheckins')
                    : t('subscriptionPage.includedCheckins', { count: preview.quota_to }),
                })}
              </p>
            </div>
            <label className="mt-2 flex items-start gap-2 text-xs text-red-800">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>{t('subscriptionPage.historicAccept')}</span>
            </label>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          {requiresPayment(preview) ? t('subscriptionPage.confirmPaymentHint') : t('subscriptionPage.confirmNoPaymentHint')}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="sm:flex-1"
            loading={working}
            disabled={needsHistoric && !accepted}
            onClick={() => onConfirm(accepted)}
          >
            {t(planChangeLabelKey('confirmCta', preview.kind))}
          </Button>
          <Button className="sm:flex-1" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Résiliation ──────────────────────────────────────────────────────────────

const CancelSubscriptionDialog = ({
  endsAt, onClose, onConfirm, working,
}: { endsAt: string | null; onClose: () => void; onConfirm: (reason: string) => void; working: boolean }) => {
  const { t } = useTranslation();
  const longDate = useLongDate();
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <h2 className="text-lg font-bold text-gray-900">{t('subscriptionPage.cancelTitle')}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {t('subscriptionPage.cancelExplain', { date: longDate(endsAt) })}
        </p>
        <ul className="mt-3 flex flex-col gap-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            {t('subscriptionPage.cancelKeepAccess')}
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            {t('subscriptionPage.cancelKeepData')}
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            {t('subscriptionPage.cancelReversible')}
          </li>
        </ul>

        <div className="mt-4">
          <Input
            label={t('subscriptionPage.cancelReason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('subscriptionPage.cancelReasonPlaceholder')}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <Button className="sm:flex-1" variant="danger" loading={working} onClick={() => onConfirm(reason)}>
            {t('subscriptionPage.cancelConfirm')}
          </Button>
          <Button className="sm:flex-1" variant="secondary" onClick={onClose}>{t('subscriptionPage.cancelKeep')}</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Historique ───────────────────────────────────────────────────────────────

const HistorySection = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['subscription-history'], queryFn: subscriptionApi.getHistory });

  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />;
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" /> {t('subscriptionPage.historyTitle')}
          </div>
        </CardTitle>
      </CardHeader>
      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {data.map((e) => (
          <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {/* Un type d'évènement inconnu du dictionnaire reste lisible
                    (repli sur sa clé technique) plutôt que d'afficher un vide. */}
                {t(`subscriptionPage.events.${e.event_type}`, { defaultValue: e.event_type }) as string}
              </p>
              {(e.previous_plan || e.new_plan) && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  {e.previous_plan ?? '—'} <ArrowRight className="h-3 w-3" /> {e.new_plan ?? '—'}
                </p>
              )}
              {e.notes && <p className="mt-0.5 text-xs text-gray-400">{e.notes}</p>}
            </div>
            <span className="shrink-0 font-mono text-xs text-gray-400">
              {new Date(e.created_at).toLocaleDateString(dateLocaleFor(i18n.language), {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const SubscriptionPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [choosing, setChoosing] = useState(false);
  const [confirming, setConfirming] = useState<{ plan: SelectablePlan; key: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);

  const { data: sub, isLoading } = useQuery({ queryKey: ['subscription'], queryFn: settingsApi.getSubscription });
  // Même source que l'écran Factures : les deux surfaces doivent proposer le
  // paiement en ligne exactement quand il est ouvert, jamais l'une sans l'autre.
  const { data: platformSettings } = useQuery({
    queryKey: ['public-platform-settings'],
    queryFn: fetchPlatformSettings,
  });
  const { data: catalog } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
    enabled: choosing,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['subscription'] });
    qc.invalidateQueries({ queryKey: ['subscription-plans'] });
    qc.invalidateQueries({ queryKey: ['subscription-history'] });
    qc.invalidateQueries({ queryKey: ['hotel-invoices'] });
  };

  const changeMut = useMutation({
    mutationFn: (payload: { plan_id: number; idempotency_key: string; accept_conditions_change: boolean }) =>
      subscriptionApi.changePlan(payload),
    onSuccess: (result: Awaited<ReturnType<typeof subscriptionApi.changePlan>>) => {
      setConfirming(null);
      setChoosing(false);
      refresh();
      toast(
        result.kind === 'downgrade'
          ? t('subscriptionPage.toastScheduled')
          : result.invoice
            ? t(result.kind === 'subscribe'
                ? 'subscriptionPage.toastSubscribeInvoiceIssued'
                : 'subscriptionPage.toastInvoiceIssued')
            : t('subscriptionPage.toastApplied'),
        'success',
      );
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const cancelChangeMut = useMutation({
    mutationFn: subscriptionApi.cancelChange,
    onSuccess: () => { refresh(); toast(t('subscriptionPage.toastChangeCancelled'), 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const cancelSubMut = useMutation({
    mutationFn: (reason: string) => subscriptionApi.cancelSubscription(reason || undefined),
    onSuccess: () => { setCancelDialog(false); refresh(); toast(t('subscriptionPage.toastCancelled'), 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const reactivateMut = useMutation({
    mutationFn: subscriptionApi.reactivate,
    onSuccess: () => { refresh(); toast(t('subscriptionPage.toastReactivated'), 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const confirmingPreview = useMemo(
    () => confirming?.plan.change ?? null,
    [confirming],
  );

  const pendingChange = sub?.pending_change ?? null;
  const cancellation = sub?.cancellation;
  const nextRenewal = sub?.next_renewal ?? null;
  const longDate = useLongDate();

  // Un compte en essai, expiré ou suspendu n'a qu'une chose à faire : régler
  // sa formule. C'est le backend qui le dit, et le catalogue qui fournit le
  // montant exact — l'écran ne décide ni de l'un ni de l'autre.
  const awaitsPayment = sub?.awaiting_payment === true;
  // Compte interne : il exploite Qayed sans l'acheter. Aucune surface
  // commerciale ne le concerne — c'est le backend qui le dit.
  const isInternal = sub?.is_internal === true;
  const { data: activationCatalog } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
    enabled: awaitsPayment && !pendingChange && !isInternal,
  });
  const currentPlanOffer = (activationCatalog?.plans ?? []).find((p) => p.is_current) ?? null;

  return (
    <HotelLayout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('subscriptionPage.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t(isInternal ? 'subscriptionPage.internalSubtitle' : 'subscriptionPage.subtitle')}
          </p>
        </div>

        {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />}

        {/* Compte interne : la formule et la consommation, rien de commercial. */}
        {sub && sub.status !== 'none' && isInternal && (
          <>
            <InternalAccountCard
              planName={typeof sub.plan === 'string' ? sub.plan : (sub.plan?.name ?? '—')}
            />
            <CurrentPlanCard sub={sub} hideMoney />
          </>
        )}

        {sub && sub.status !== 'none' && !isInternal && (
          <>
            {/* Échéance dépassée, service maintenu : le client doit lire
                jusqu'à quand. Un statut « actif » avec une date d'échéance
                passée ne dit rien de la date de coupure réelle. */}
            {sub.grace?.active && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  {t('subscriptionPage.graceTitle')}
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {t('subscriptionPage.graceBody', {
                    date: longDate(sub.grace.ends_at),
                    count: sub.grace.days_left ?? 0,
                  })}
                </p>
              </div>
            )}

            {pendingChange && (
              <PendingChangeBanner
                change={pendingChange}
                cancelling={cancelChangeMut.isPending}
                onCancel={() => cancelChangeMut.mutate()}
                onlinePayment={platformSettings?.flouci_enabled === true}
                onGoToInvoices={() => navigate('/hotel/settings?tab=abonnement')}
              />
            )}

            {!pendingChange && awaitsPayment && currentPlanOffer && (
              <ActivateBanner
                status={sub.status}
                planName={currentPlanOffer.name}
                amount={currentPlanOffer.change?.amount_due_now ?? null}
                working={changeMut.isPending}
                onActivate={() => setConfirming({ plan: currentPlanOffer, key: newIdempotencyKey() })}
              />
            )}

            {!pendingChange && !awaitsPayment && cancellation?.scheduled && (
              <CancellationBanner
                endsAt={cancellation.ends_at}
                working={reactivateMut.isPending}
                onReactivate={() => reactivateMut.mutate()}
              />
            )}

            <CurrentPlanCard sub={sub} />

            {/* Prochaine échéance + reconduction — uniquement quand il y a
                réellement une échéance à venir (un compte à activer n'en a
                pas encore). */}
            {!awaitsPayment && nextRenewal && (
              <NextRenewalCard
                renewal={nextRenewal}
                autoRenew={!!sub.auto_renew}
                cancellationScheduled={!!cancellation?.scheduled}
                working={cancelSubMut.isPending || reactivateMut.isPending}
                onStop={() => setCancelDialog(true)}
                onResume={() => reactivateMut.mutate()}
              />
            )}

            {/* Actions principales — tout est self-service, aucun contact requis. */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setChoosing((v) => !v)} disabled={!!pendingChange}>
                {t('subscriptionPage.changePlan')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/hotel/settings?tab=abonnement')}>
                <Landmark className="mr-1.5 h-4 w-4" /> {t('subscriptionPage.viewInvoices')}
              </Button>
            </div>

            {pendingChange && (
              <p className="-mt-2 text-xs text-gray-400">{t('subscriptionPage.changeBlockedHint')}</p>
            )}

            {choosing && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-gray-400" /> {t('subscriptionPage.choosePlan')}
                    </div>
                  </CardTitle>
                </CardHeader>
                <div className="mt-3 flex flex-col gap-3">
                  {(catalog?.plans ?? []).map((p) => (
                    <PlanOption
                      key={p.id}
                      plan={p}
                      onChoose={(plan) => setConfirming({ plan, key: newIdempotencyKey() })}
                    />
                  ))}
                  {!catalog && <div className="h-32 animate-pulse rounded-xl bg-gray-100" />}
                </div>
              </Card>
            )}

            <HistorySection />
          </>
        )}

        {sub?.status === 'none' && (
          <Card>
            <p className="text-sm text-gray-600">{t('subscriptionPage.noSubscription')}</p>
          </Card>
        )}
      </div>

      {confirming && confirmingPreview && (
        <ConfirmChange
          plan={confirming.plan}
          preview={confirmingPreview}
          working={changeMut.isPending}
          onClose={() => setConfirming(null)}
          onConfirm={(acceptConditions) => changeMut.mutate({
            plan_id: confirming.plan.id,
            // La clé est figée à l'ouverture de l'écran : un double clic sur
            // « Confirmer » renvoie la même intention, jamais une seconde.
            idempotency_key: confirming.key,
            accept_conditions_change: acceptConditions,
          })}
        />
      )}

      {cancelDialog && (
        <CancelSubscriptionDialog
          endsAt={sub?.expires_at ?? null}
          working={cancelSubMut.isPending}
          onClose={() => setCancelDialog(false)}
          onConfirm={(reason) => cancelSubMut.mutate(reason)}
        />
      )}
    </HotelLayout>
  );
};

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Save, CreditCard, Landmark, Package, Pencil, X, Check } from 'lucide-react';

const C = { navy: '#1B3A5F', gold: '#C8943A' };

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
      style={{ background: checked ? C.navy : '#d1d5db' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'none' }}
      />
    </div>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </label>
);

// ── Plan row (inline-editable) ─────────────────────────────────────────────────
const PlanRow = ({ plan, onSave }: { plan: any; onSave: (id: number, data: object) => Promise<void> }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    price_monthly: plan.price_monthly,
    price_yearly:  plan.price_yearly ?? '',
    max_rooms:     plan.max_rooms ?? '',
    is_active:     plan.is_active,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(plan.id, {
        price_monthly: parseFloat(form.price_monthly),
        price_yearly:  form.price_yearly ? parseFloat(form.price_yearly) : null,
        max_rooms:     form.max_rooms ? parseInt(String(form.max_rooms)) : null,
        is_active:     form.is_active,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: plan.is_active ? `${C.navy}18` : '#f3f4f6' }}
          >
            <Package className="h-4 w-4" style={{ color: plan.is_active ? C.navy : '#9ca3af' }} />
          </div>
          <div>
            <p className="font-bold text-gray-900">{plan.name}</p>
            <p className="text-xs text-gray-400">
              {plan.min_rooms} – {plan.max_rooms ?? '∞'} chambres · {plan.slug}
            </p>
          </div>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-2 rounded-lg text-white transition-colors"
              style={{ background: C.navy }}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setEditing(false); setForm({ price_monthly: plan.price_monthly, price_yearly: plan.price_yearly ?? '', max_rooms: plan.max_rooms ?? '', is_active: plan.is_active }); }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="flex gap-4 text-sm">
          <span><span className="text-gray-400">Mensuel : </span><strong>{parseFloat(plan.price_monthly).toFixed(0)} TND</strong></span>
          {plan.price_yearly && <span><span className="text-gray-400">Annuel : </span><strong>{parseFloat(plan.price_yearly).toFixed(0)} TND</strong></span>}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {plan.is_active ? 'Actif' : 'Inactif'}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prix mensuel (TND)"
            type="number"
            value={form.price_monthly}
            onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value }))}
          />
          <Input
            label="Prix annuel (TND)"
            type="number"
            value={form.price_yearly}
            onChange={(e) => setForm((f) => ({ ...f, price_yearly: e.target.value }))}
            placeholder="Laisser vide = sur devis"
          />
          <Input
            label="Max chambres"
            type="number"
            value={form.max_rooms}
            onChange={(e) => setForm((f) => ({ ...f, max_rooms: e.target.value }))}
            placeholder="Vide = illimité"
          />
          <div className="flex items-end pb-1">
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              label="Plan actif"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export const AdminPlatformSettingsPage = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn:  adminApi.getPlatformSettings,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  adminApi.plans,
  });

  const [form, setForm] = useState<Record<string, any>>({});

  // Merge settings into local form when loaded
  const merged = { ...settings, ...form };

  const updateMutation = useMutation({
    mutationFn: (data: object) => adminApi.updatePlatformSettings(data),
    onSuccess: () => {
      toast('Paramètres enregistrés', 'success');
      qc.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      setForm({});
    },
    onError: () => toast('Erreur lors de la sauvegarde', 'error'),
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => adminApi.updatePlan(id, data),
    onSuccess: () => {
      toast('Plan mis à jour', 'success');
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: () => toast('Erreur lors de la mise à jour du plan', 'error'),
  });

  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const isDirty = Object.keys(form).length > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Paramètres plateforme</h1>
        <p className="text-sm text-gray-400 mt-1">Méthodes de paiement et tarifs des plans</p>
      </div>

      {/* ── Flouci ── */}
      <Card className="flex flex-col gap-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${C.gold}18` }}>
            <CreditCard className="h-5 w-5" style={{ color: C.gold }} />
          </div>
          <div>
            <p className="font-bold text-gray-900">Paiement en ligne — Flouci</p>
            <p className="text-xs text-gray-400">Carte bancaire tunisienne, D17, wallet Flouci</p>
          </div>
        </div>

        {settingsLoading
          ? <div className="h-8 animate-pulse rounded-lg bg-gray-100" />
          : (
            <>
              <Toggle
                checked={merged.flouci_enabled ?? false}
                onChange={(v) => setField('flouci_enabled', v)}
                label="Activer le paiement Flouci"
              />
              {merged.flouci_enabled && (
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    label="App Token Flouci"
                    value={merged.flouci_app_token ?? ''}
                    onChange={(e) => setField('flouci_app_token', e.target.value)}
                    placeholder="Votre app_token Flouci"
                  />
                  <Input
                    label="App Secret Flouci"
                    type="password"
                    value={merged.flouci_app_secret ?? ''}
                    onChange={(e) => setField('flouci_app_secret', e.target.value)}
                    placeholder="Votre app_secret Flouci"
                  />
                </div>
              )}
            </>
          )}
      </Card>

      {/* ── Virement ── */}
      <Card className="flex flex-col gap-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${C.navy}0f` }}>
            <Landmark className="h-5 w-5" style={{ color: C.navy }} />
          </div>
          <div>
            <p className="font-bold text-gray-900">Virement bancaire</p>
            <p className="text-xs text-gray-400">Paiement manuel, activation sous 24-48h</p>
          </div>
        </div>

        {settingsLoading
          ? <div className="h-8 animate-pulse rounded-lg bg-gray-100" />
          : (
            <>
              <Toggle
                checked={merged.virement_enabled ?? true}
                onChange={(v) => setField('virement_enabled', v)}
                label="Activer le virement bancaire"
              />
              {merged.virement_enabled && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Banque"
                      value={merged.virement_bank_name ?? ''}
                      onChange={(e) => setField('virement_bank_name', e.target.value)}
                      placeholder="ex. Banque de Tunisie"
                    />
                    <Input
                      label="Bénéficiaire"
                      value={merged.virement_beneficiary ?? ''}
                      onChange={(e) => setField('virement_beneficiary', e.target.value)}
                      placeholder="ex. CHECKTUNISIA SARL"
                    />
                  </div>
                  <Input
                    label="RIB"
                    value={merged.virement_rib ?? ''}
                    onChange={(e) => setField('virement_rib', e.target.value)}
                    placeholder="RIB 20 chiffres"
                  />
                  <Input
                    label="IBAN (optionnel)"
                    value={merged.virement_iban ?? ''}
                    onChange={(e) => setField('virement_iban', e.target.value)}
                    placeholder="TN59 ..."
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Informations complémentaires (optionnel)</label>
                    <textarea
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
                      style={{ minHeight: 72, focusRingColor: C.navy } as any}
                      value={merged.virement_details ?? ''}
                      onChange={(e) => setField('virement_details', e.target.value)}
                      placeholder="Instructions supplémentaires (objet du virement, délai, etc.)"
                    />
                  </div>
                </div>
              )}
            </>
          )}
      </Card>

      {/* Save button */}
      {isDirty && (
        <Button
          fullWidth
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate(form)}
          style={{ background: `linear-gradient(135deg,${C.navy},#2A5090)` }}
        >
          <Save className="h-4 w-4" /> Enregistrer les paramètres
        </Button>
      )}

      {/* ── Plans ── */}
      <div className="mt-2">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-5 w-5" style={{ color: C.navy }} />
          <h2 className="text-lg font-black text-gray-900">Plans d'abonnement</h2>
        </div>

        {plansLoading
          ? [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 mb-3" />)
          : (
            <div className="flex flex-col gap-3">
              {plans.map((plan: any) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  onSave={(id, data) => updatePlanMutation.mutateAsync({ id, data })}
                />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
};

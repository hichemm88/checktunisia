import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Upload, Download, Trash2, ToggleLeft, ToggleRight, Search, AlertTriangle, X } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { authorityApi } from '@/api/authority';
import { WatchlistEntry, WatchlistSeverity, WatchlistReasonCode } from '@/types';
import { extractErrors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ─── Severity helpers ─────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<WatchlistSeverity, { label: string; color: string; bg: string; border: string }> = {
  critique: { label: 'CRITIQUE', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  eleve:    { label: 'ÉLEVÉ',    color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  moyen:    { label: 'MOYEN',    color: '#1E3A5F', bg: '#EFF6FF', border: '#BFDBFE' },
};

const REASON_LABELS: Record<WatchlistReasonCode, string> = {
  MANDAT_ARRET: "Mandat d'arrêt",
  FRAUDE:       'Fraude documentaire',
  MIGRATION:    'Contrôle migration',
  AUTRE:        'Autre',
};

// ─── Add Entry Modal ──────────────────────────────────────────────────────────
const AddEntryModal = ({ onClose, isMinistry }: { onClose: () => void; isMinistry: boolean }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    document_number: '', document_type: 'passport',
    first_name: '', last_name: '', date_of_birth: '', nationality_code: '',
    severity: 'moyen' as WatchlistSeverity, reason_code: 'AUTRE' as WatchlistReasonCode,
    reason: '', expires_at: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => authorityApi.addWatchlistEntry({
      ...form,
      document_number: form.document_number || undefined,
      first_name: form.first_name || undefined,
      last_name: form.last_name || undefined,
      date_of_birth: form.date_of_birth || undefined,
      nationality_code: form.nationality_code || undefined,
      expires_at: form.expires_at || undefined,
      reason: form.reason || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); onClose(); },
    onError: (e) => setError(extractErrors(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: '#1B3A5F' }} /> Ajouter une personne surveillée
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500">Au moins un critère d'identification est requis (numéro de document <strong>ou</strong> nom de famille).</p>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Numéro de document" placeholder="Passeport / CIN" value={form.document_number} onChange={e => set('document_number', e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Type de document</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.document_type} onChange={e => set('document_type', e.target.value)}>
                <option value="passport">Passeport</option>
                <option value="national_id">Carte nationale</option>
                <option value="any">Tout type</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            <Input label="Nom de famille" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Date de naissance" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            <Input label="Nationalité (code)" placeholder="TUN" maxLength={3} value={form.nationality_code} onChange={e => set('nationality_code', e.target.value.toUpperCase())} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Degré d'alerte</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.severity} onChange={e => set('severity', e.target.value)}>
                <option value="critique">🔴 Critique</option>
                <option value="eleve">🟠 Élevé</option>
                <option value="moyen">🟡 Moyen</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Motif (code)</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.reason_code} onChange={e => set('reason_code', e.target.value)}>
                {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <Input label="Expire le (optionnel)" type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} hint="Laisser vide = pas d'expiration" />

          {isMinistry && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Note confidentielle (Ministère seulement)</label>
              <textarea
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                rows={2} placeholder="Détails du dossier..." value={form.reason} onChange={e => set('reason', e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} style={{ background: '#1B3A5F', color: '#fff' }}>
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Import Modal ─────────────────────────────────────────────────────────────
const ImportModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const mutation = useMutation({
    mutationFn: () => authorityApi.importWatchlist(file!),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const downloadTemplate = async () => {
    const res = await authorityApi.downloadTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'watchlist_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importer depuis CSV
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm underline" style={{ color: '#1B3A5F' }}>
                <Download className="h-4 w-4" /> Télécharger le modèle CSV
              </button>
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                {file
                  ? <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  : <p className="text-sm text-gray-400">Glissez un fichier CSV ou cliquez</p>
                }
                <input type="file" accept=".csv,.txt" className="hidden" id="csv-upload"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <label htmlFor="csv-upload" className="mt-3 inline-block cursor-pointer rounded-lg px-4 py-2 text-sm font-medium" style={{ background: '#EEF3FC', color: '#1B3A5F' }}>
                  Choisir un fichier
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: '#F0FDF4' }}>
                <p className="text-sm font-semibold text-green-800">{result.created} enregistrement(s) importé(s)</p>
                {result.skipped > 0 && <p className="text-xs text-green-700 mt-1">{result.skipped} ligne(s) ignorées (doublons ou données manquantes)</p>}
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#FEF2F2' }}>
                  <p className="text-xs font-semibold text-red-800 mb-1">Erreurs :</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>{result ? 'Fermer' : 'Annuler'}</Button>
          {!result && (
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!file} style={{ background: '#1B3A5F', color: '#fff' }}>
              Importer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const WatchlistPage = () => {
  const { user } = useAuthStore();
  const isMinistry = user?.authority_profile?.org_type === 'ministry';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['watchlist', search, severity],
    queryFn: () => authorityApi.getWatchlist({ search: search || undefined, severity: severity || undefined }),
  });

  const toggleMutation = useMutation({
    mutationFn: (entry: WatchlistEntry) =>
      authorityApi.updateWatchlistEntry(entry.id, { status: entry.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authorityApi.deleteWatchlistEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  return (
    <AuthorityLayout title="Personnes surveillées">
      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} isMinistry={isMinistry} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <div className="flex flex-col gap-6">
        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {data?.meta.total ?? 0} personne{(data?.meta.total ?? 0) !== 1 ? 's' : ''} surveillée{(data?.meta.total ?? 0) !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" /> Importer CSV
            </Button>
            <Button className="gap-2" onClick={() => setShowAdd(true)} style={{ background: '#1B3A5F', color: '#fff' }}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Input
                label="Rechercher"
                placeholder="Nom, prénom, numéro de document..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-gray-400" />}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Degré</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none" value={severity} onChange={e => setSeverity(e.target.value)}>
                <option value="">Tous</option>
                <option value="critique">🔴 Critique</option>
                <option value="eleve">🟠 Élevé</option>
                <option value="moyen">🟡 Moyen</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Entries list */}
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Chargement...</div>
        ) : data?.data.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-500">Aucune personne surveillée</p>
            <p className="text-sm text-gray-400 mt-1">Ajoutez des personnes manuellement ou importez un fichier CSV.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.data.map((entry) => {
              const cfg = SEVERITY_CONFIG[entry.severity];
              return (
                <div key={entry.id} className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm border" style={{ borderColor: cfg.border, borderLeftWidth: 4, borderLeftColor: cfg.color }}>
                  {/* Severity badge */}
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {entry.last_name || '—'}{entry.first_name ? `, ${entry.first_name}` : ''}
                      {entry.nationality_code && <span className="ml-2 text-xs font-normal text-gray-400">· {entry.nationality_code}</span>}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      {entry.document_number && (
                        <span className="text-xs text-gray-500">📄 {entry.document_number}</span>
                      )}
                      {entry.date_of_birth && (
                        <span className="text-xs text-gray-500">🎂 {entry.date_of_birth}</span>
                      )}
                      <span className="text-xs text-gray-400">{REASON_LABELS[entry.reason_code]}</span>
                      {isMinistry && entry.reason && (
                        <span className="text-xs italic text-gray-400">"…{entry.reason.slice(0, 40)}{entry.reason.length > 40 ? '…' : ''}"</span>
                      )}
                    </div>
                    {entry.expires_at && (
                      <p className="text-xs text-orange-500 mt-0.5">Expire le {entry.expires_at}</p>
                    )}
                    {isMinistry && entry.organization_name && (
                      <p className="text-xs text-gray-300 mt-0.5">Ajouté par {entry.organization_name}</p>
                    )}
                  </div>

                  {/* Source */}
                  <span className="text-xs text-gray-300 shrink-0">
                    {entry.source === 'import' ? 'Import' : 'Manuel'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate(entry)}
                      title={entry.status === 'active' ? 'Désactiver' : 'Activer'}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      {entry.status === 'active'
                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                        : <ToggleLeft className="h-5 w-5" />
                      }
                    </button>
                    <button
                      onClick={() => { if (confirm('Supprimer cette entrée ?')) deleteMutation.mutate(entry.id); }}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-2">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block"></span> Critique — action immédiate requise</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block"></span> Élevé — surveiller de près</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block"></span> Moyen — signalement à vérifier</span>
        </div>
      </div>
    </AuthorityLayout>
  );
};

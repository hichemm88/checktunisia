import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, LogOut, CheckCircle } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { checkInsApi } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between py-2.5 text-sm border-b border-gray-50 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value ?? '—'}</span>
  </div>
);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const HistoryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: ci, isLoading } = useQuery({
    queryKey: ['check-in', id],
    queryFn: () => checkInsApi.get(id!),
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: () => checkInsApi.complete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['check-in', id] }); toast('Check-in complété', 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => checkInsApi.checkout(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['check-in', id] }); toast('Check-out enregistré', 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  if (isLoading) return (
    <HotelLayout title="Détail check-in">
      <div className="p-4 flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-card bg-gray-100" />)}
      </div>
    </HotelLayout>
  );

  if (!ci) return null;

  return (
    <HotelLayout title="Détail check-in">
      <div className="p-4 flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-gray-400">{ci.reference}</p>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">
              {(() => {
                // primary_guest is only in list endpoint; fallback to guests array
                const pg = ci.primary_guest
                  ?? ci.guests?.find(g => g.is_primary)
                  ?? ci.guests?.[0];
                return pg
                  ? `${pg.first_name} ${pg.last_name}`
                  : 'Sans voyageur principal';
              })()}
            </h2>
          </div>
          <Badge variant={ci.status as any}>{ci.status}</Badge>
        </div>

        {/* Booking details */}
        <Card>
          <DetailRow label="Chambre" value={ci.room?.number} />
          <DetailRow label="Arrivée" value={fmtDate(ci.check_in_date)} />
          <DetailRow label="Départ prévu" value={fmtDate(ci.expected_check_out_date)} />
          <DetailRow label="Départ réel" value={fmtDate(ci.actual_check_out_date)} />
          <DetailRow label="Adultes" value={ci.adults_count} />
          <DetailRow label="Enfants" value={ci.children_count} />
          {ci.booking_reference && <DetailRow label="Réf. réservation" value={ci.booking_reference} />}
          {ci.created_by && (
            <DetailRow
              label="Enregistré par"
              value={`${ci.created_by.first_name} ${ci.created_by.last_name}`}
            />
          )}
          {ci.notes && <DetailRow label="Notes" value={ci.notes} />}
        </Card>

        {/* Guests */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-700">Voyageurs</p>
          {ci.guests?.map((g) => (
            <Card key={g.id} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{g.first_name} {g.last_name}</p>
                  {g.is_primary && <Badge variant="active">Principal</Badge>}
                </div>
                <p className="text-xs text-gray-500">{fmtDate(g.date_of_birth)} · {g.sex} · {g.nationality_code}</p>
                {g.document && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.document.type} {g.document.document_number} · expire {fmtDate(g.document.expiry_date)}
                  </p>
                )}
              </div>
            </Card>
          ))}
          {!ci.guests?.length && <p className="text-sm text-gray-400">Aucun voyageur enregistré</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {ci.status === 'draft' && (
            <Button fullWidth onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
              <CheckCircle className="h-4 w-4" /> Finaliser le check-in
            </Button>
          )}
          {ci.status === 'active' && (
            <Button variant="secondary" fullWidth onClick={() => checkoutMutation.mutate()} loading={checkoutMutation.isPending}>
              <LogOut className="h-4 w-4" /> Enregistrer le check-out
            </Button>
          )}
        </div>
      </div>
    </HotelLayout>
  );
};

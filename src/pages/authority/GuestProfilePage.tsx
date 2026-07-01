import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, FileText, MapPin } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { authorityApi } from '@/api/authority';

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900">{value ?? '—'}</span>
  </div>
);

export const GuestProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['authority-guest', id],
    queryFn: () => authorityApi.getProfile(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <AuthorityLayout title="Profil voyageur">
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-card bg-gray-100" />)}
      </div>
    </AuthorityLayout>
  );

  if (!profile) return null;

  return (
    <AuthorityLayout title="Profil voyageur">
      <div className="flex flex-col gap-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la recherche
        </button>

        {/* Identity card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-white">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{profile.first_name} {profile.last_name}</h2>
                <p className="text-sm text-gray-500">{profile.nationality_code}</p>
              </div>
            </div>
          </CardHeader>
          <DetailRow label="Date de naissance" value={profile.date_of_birth} />
          <DetailRow label="Sexe" value={profile.sex === 'M' ? 'Masculin' : profile.sex === 'F' ? 'Féminin' : 'Autre'} />
          <DetailRow label="Nationalité" value={profile.nationality_code} />
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                Documents de voyage
              </div>
            </CardTitle>
            <span className="text-xs text-gray-400">{profile.documents.length} document{profile.documents.length !== 1 ? 's' : ''}</span>
          </CardHeader>
          {profile.documents.map((doc) => (
            <div key={doc.id} className="mb-3 last:mb-0 rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">{doc.type}</span>
                <Badge variant={doc.is_verified ? 'active' : 'draft'}>
                  {doc.is_verified ? 'Vérifié' : 'Non vérifié'}
                </Badge>
              </div>
              <DetailRow label="N° document" value={doc.document_number} />
              <DetailRow label="Pays délivrance" value={doc.issuing_country_code} />
              <DetailRow label="Date émission" value={doc.issue_date} />
              <DetailRow label="Date expiration" value={doc.expiry_date} />
            </div>
          ))}
          {!profile.documents.length && <p className="text-sm text-gray-400">Aucun document enregistré</p>}
        </Card>

        {/* Stays */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                Historique des séjours
              </div>
            </CardTitle>
            <span className="text-xs text-gray-400">{profile.stays.length} séjour{profile.stays.length !== 1 ? 's' : ''}</span>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {profile.stays.map((stay) => (
              <div key={stay.check_in_id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{stay.hotel.name}</p>
                  <Badge variant={stay.status as any}>{stay.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {stay.hotel.city}{stay.hotel.governorate ? `, ${stay.hotel.governorate}` : ''}
                  {stay.hotel.registration_number && ` · Rég. ${stay.hotel.registration_number}`}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>Arrivée: <strong className="text-gray-700">{stay.check_in_date}</strong></span>
                  <span>Départ: <strong className="text-gray-700">{stay.actual_check_out_date ?? stay.expected_check_out_date}</strong></span>
                  {stay.room_number && <span>Ch. <strong className="text-gray-700">{stay.room_number}</strong></span>}
                </div>
              </div>
            ))}
            {!profile.stays.length && <p className="text-sm text-gray-400">Aucun séjour enregistré</p>}
          </div>
        </Card>
      </div>
    </AuthorityLayout>
  );
};

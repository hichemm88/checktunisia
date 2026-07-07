import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, FileText, MapPin, Download } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { authorityApi } from '@/api/authority';
import { api } from '@/lib/api';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');
const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const DetailRow = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className={`font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

export const GuestProfilePage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const exportPdf = async () => {
    if (!id) return;
    setExporting('pdf');
    try {
      const res = await api.get(`/guests/${id}/export/pdf`, { responseType: 'blob' });
      const html = await res.data.text();
      const win  = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); win.print(); }
    } finally { setExporting(null); }
  };

  const exportCsv = async () => {
    if (!id) return;
    setExporting('csv');
    try {
      const res = await api.get('/export/stays', { responseType: 'blob' });
      downloadBlob(res.data, `sejours-${new Date().toISOString().split('T')[0]}.csv`);
    } finally { setExporting(null); }
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ['authority-guest', id],
    queryFn: () => authorityApi.getProfile(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <AuthorityLayout title={t('guestProfile.title')}>
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-card bg-gray-100" />)}
      </div>
    </AuthorityLayout>
  );

  if (!profile) return null;

  return (
    <AuthorityLayout title={t('guestProfile.title')}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500"
          >
            <ArrowLeft className="h-4 w-4" /> {t('guestProfile.backToSearch')}
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" loading={exporting === 'pdf'} onClick={exportPdf} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> {t('guestProfile.pdfSheet')}
            </Button>
            <Button variant="secondary" size="sm" loading={exporting === 'csv'} onClick={exportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> {t('guestProfile.csvStays')}
            </Button>
          </div>
        </div>

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
          <DetailRow label={t('guestScan.dateOfBirth')} value={fmtDate(profile.date_of_birth, locale)} />
          <DetailRow label={t('common.sex')} value={profile.sex === 'M' ? t('common.male') : profile.sex === 'F' ? t('common.female') : t('common.other')} />
          <DetailRow label={t('guestScan.nationality')} value={profile.nationality_code} />
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                {t('guestProfile.travelDocuments')}
              </div>
            </CardTitle>
            <span className="text-xs text-gray-400">{t('guestProfile.documentsCount', { count: profile.documents.length })}</span>
          </CardHeader>
          {profile.documents.map((doc) => (
            <div key={doc.id} className="mb-3 last:mb-0 rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">{doc.type}</span>
                <Badge variant={doc.is_verified ? 'active' : 'draft'}>
                  {doc.is_verified ? t('guestProfile.verified') : t('guestProfile.notVerified')}
                </Badge>
              </div>
              <DetailRow label={t('guestScan.documentNumber')} value={doc.document_number} mono />
              <DetailRow label={t('guestScan.issuingCountry')} value={doc.issuing_country_code} />
              <DetailRow label={t('guestProfile.issueDate')} value={fmtDate(doc.issue_date, locale)} />
              <DetailRow label={t('guestProfile.expiryDate')} value={fmtDate(doc.expiry_date, locale)} />
            </div>
          ))}
          {!profile.documents.length && <p className="text-sm text-gray-400">{t('guestProfile.noDocument')}</p>}
        </Card>

        {/* Stays */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {t('guestProfile.stayHistory')}
              </div>
            </CardTitle>
            <span className="text-xs text-gray-400">{t('guestProfile.staysCount', { count: profile.stays.length })}</span>
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
                  {stay.hotel.registration_number && ` · ${t('guestProfile.registrationAbbrev')} ${stay.hotel.registration_number}`}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>{t('checkinWizard.arrivalLabel')}: <strong className="text-gray-700">{fmtDate(stay.check_in_date, locale)}</strong></span>
                  <span>{t('hotelHistoryDetail.departure')}: <strong className="text-gray-700">{fmtDate(stay.actual_check_out_date ?? stay.expected_check_out_date, locale)}</strong></span>
                  {stay.room_number && <span>{t('checkinWizard.roomShort')} <strong className="text-gray-700">{stay.room_number}</strong></span>}
                </div>
              </div>
            ))}
            {!profile.stays.length && <p className="text-sm text-gray-400">{t('guestProfile.noStay')}</p>}
          </div>
        </Card>
      </div>
    </AuthorityLayout>
  );
};

/**
 * PoliceFiche — Print-only component for the "Fiche de Police" document.
 *
 * Rendered invisibly in the DOM at all times.
 * When window.print() is called, @media print CSS makes this the only
 * visible element on the page (body * visibility:hidden, this visible).
 *
 * Usage:
 *   <PoliceFiche id="police-fiche-root" checkIn={ci} hotel={hotel} />
 *   <button onClick={() => window.print()}>Imprimer</button>
 */

import type { CheckIn, HotelProfile } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const SEX_LABELS: Record<string, string> = { M: 'Masculin', F: 'Féminin', X: 'Autre' };

const DOC_TYPE_LABELS: Record<string, string> = {
  passport:         'Passeport',
  national_id:      'Carte nationale',
  residence_permit: 'Titre de séjour',
  driving_license:  'Permis de conduire',
  other:            'Autre',
};

const HOTEL_TYPE_LABELS: Record<string, string> = {
  hotel:       'Hôtel',
  guesthouse:  'Maison d\'hôtes',
  apartment:   'Appartement',
  villa:       'Villa',
  hostel:      'Auberge de jeunesse',
  riad:        'Riad',
  motel:       'Motel',
  residence:   'Résidence',
  studio:      'Studio',
  maison_hote: 'Maison d\'hôtes',
  autre:       'Autre',
};

const stars = (n?: number | null) =>
  n ? '★'.repeat(n) : '';

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  id?: string;
  checkIn: CheckIn;
  hotel: HotelProfile;
}

export const PoliceFiche = ({ id = 'police-fiche-root', checkIn: ci, hotel }: Props) => {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const hotelTypeLabel = hotel.type ? (HOTEL_TYPE_LABELS[hotel.type] ?? hotel.type) : '';
  const hotelStars     = stars(hotel.stars);

  const addrParts = [
    hotel.address?.line1,
    hotel.address?.postal_code && hotel.address?.city
      ? `${hotel.address.postal_code} ${hotel.address.city}`
      : hotel.address?.city,
    hotel.address?.governorate,
  ].filter(Boolean);

  return (
    <>
      {/* ── Print-only CSS injected inline ── */}
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 15mm; }
          body * { visibility: hidden !important; }
          #${id}, #${id} * { visibility: visible !important; }
          #${id} { position: fixed !important; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* ── Hidden in screen view, shown on print ── */}
      <div
        id={id}
        style={{
          display: 'none',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '11pt',
          color: '#111',
          lineHeight: 1.5,
        }}
        className="print:block"
      >

        {/* ══ LETTERHEAD ══════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderBottom: '3px solid #1B3A5F', paddingBottom: '10px', marginBottom: '14px' }}>
          <tbody>
            <tr>
              {/* Left: establishment details */}
              <td style={{ verticalAlign: 'top', width: '60%' }}>
                <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#1B3A5F', letterSpacing: '0.5px' }}>
                  {hotel.name}
                </div>
                {(hotelTypeLabel || hotelStars) && (
                  <div style={{ fontSize: '10pt', color: '#555', marginTop: '2px' }}>
                    {hotelTypeLabel}{hotelStars ? ` · ${hotelStars}` : ''}
                  </div>
                )}
                {addrParts.length > 0 && (
                  <div style={{ fontSize: '9.5pt', color: '#444', marginTop: '6px', lineHeight: 1.6 }}>
                    {addrParts.join(' · ')}
                  </div>
                )}
                <div style={{ fontSize: '9.5pt', color: '#444', marginTop: '4px', lineHeight: 1.6 }}>
                  {hotel.phone && <span>{hotel.phone}</span>}
                  {hotel.phone && hotel.email && <span> · </span>}
                  {hotel.email && <span>{hotel.email}</span>}
                </div>
                {hotel.registration_number && (
                  <div style={{ fontSize: '9pt', color: '#777', marginTop: '4px' }}>
                    Matricule fiscal / RC : {hotel.registration_number}
                  </div>
                )}
              </td>

              {/* Right: CheckTunisia logo area */}
              <td style={{ verticalAlign: 'top', textAlign: 'right', width: '40%' }}>
                <div style={{ fontSize: '9pt', color: '#aaa', marginTop: '4px' }}>
                  Système CheckTunisia
                </div>
                <div style={{ fontSize: '9pt', color: '#aaa' }}>
                  Imprimé le {now}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ TITLE ═══════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', margin: '10px 0 16px' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '14pt',
            fontWeight: 'bold',
            letterSpacing: '3px',
            textTransform: 'uppercase' as const,
            color: '#1B3A5F',
            borderBottom: '2px solid #1B3A5F',
            paddingBottom: '4px',
          }}>
            Fiche de Police
          </div>
        </div>

        {/* ══ SÉJOUR ══════════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={5} cellSpacing={0} style={{
          border: '1px solid #ccc',
          borderCollapse: 'collapse',
          marginBottom: '18px',
          fontSize: '10pt',
        }}>
          <thead>
            <tr style={{ background: '#1B3A5F', color: '#fff' }}>
              <th colSpan={4} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10pt', letterSpacing: '1px' }}>
                INFORMATIONS DU SÉJOUR
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#f8f8f8' }}>
              <td style={{ padding: '6px 10px', width: '25%', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Référence
              </td>
              <td style={{ padding: '6px 10px', width: '25%', fontFamily: 'monospace', fontSize: '10pt' }}>
                {ci.reference}
              </td>
              <td style={{ padding: '6px 10px', width: '25%', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Unité / Chambre
              </td>
              <td style={{ padding: '6px 10px', width: '25%' }}>
                {ci.room?.number ?? '—'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Date d'arrivée
              </td>
              <td style={{ padding: '6px 10px' }}>
                {fmtDate(ci.check_in_date)}
              </td>
              <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Date de départ prévue
              </td>
              <td style={{ padding: '6px 10px' }}>
                {fmtDate(ci.expected_check_out_date)}
              </td>
            </tr>
            {ci.actual_check_out_date && (
              <tr style={{ background: '#f8f8f8' }}>
                <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  Date de départ réelle
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {fmtDate(ci.actual_check_out_date)}
                </td>
                <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  Statut
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {ci.status === 'completed' ? 'Terminé' : ci.status === 'active' ? 'En cours' : ci.status}
                </td>
              </tr>
            )}
            <tr style={{ background: ci.actual_check_out_date ? undefined : '#f8f8f8' }}>
              <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Adultes
              </td>
              <td style={{ padding: '6px 10px' }}>
                {ci.adults_count}
              </td>
              <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Enfants
              </td>
              <td style={{ padding: '6px 10px' }}>
                {ci.children_count}
              </td>
            </tr>
            {ci.booking_reference && (
              <tr>
                <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#555', fontSize: '9pt', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  Réf. réservation
                </td>
                <td colSpan={3} style={{ padding: '6px 10px' }}>
                  {ci.booking_reference}
                  {ci.booking_source ? ` (${ci.booking_source})` : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ VOYAGEURS ═══════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{
          border: '1px solid #ccc',
          borderCollapse: 'collapse',
          fontSize: '9.5pt',
        }}>
          <thead>
            <tr style={{ background: '#1B3A5F', color: '#fff' }}>
              <th colSpan={8} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10pt', letterSpacing: '1px' }}>
                VOYAGEURS · {ci.guests?.length ?? 0} personne{(ci.guests?.length ?? 0) > 1 ? 's' : ''}
              </th>
            </tr>
            <tr style={{ background: '#E8EEFB', color: '#1B3A5F', fontSize: '8.5pt' }}>
              {[
                'Nom & Prénom',
                'Né(e) le',
                'Sexe',
                'Nationalité',
                'Type pièce d\'identité',
                'N° document',
                'Pays émetteur',
                'Expire le',
              ].map((h) => (
                <th key={h} style={{
                  padding: '5px 7px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderTop: '1px solid #ccc',
                  borderRight: '1px solid #ddd',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ci.guests && ci.guests.length > 0 ? (
              ci.guests.map((g, idx) => (
                <tr
                  key={g.id}
                  style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                >
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', fontWeight: g.is_primary ? 'bold' : 'normal', borderBottom: '1px solid #eee' }}>
                    {g.last_name.toUpperCase()} {g.first_name}
                    {g.is_primary && (
                      <span style={{ fontSize: '8pt', color: '#1B3A5F', marginLeft: '4px' }}>(Principal)</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', whiteSpace: 'nowrap' as const, borderBottom: '1px solid #eee' }}>
                    {fmtDate(g.date_of_birth)}
                  </td>
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                    {SEX_LABELS[g.sex] ?? g.sex}
                  </td>
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                    {g.nationality_code}
                  </td>
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                    {g.document ? (DOC_TYPE_LABELS[g.document.type] ?? g.document.type) : '—'}
                  </td>
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', fontFamily: 'monospace', fontSize: '9pt', borderBottom: '1px solid #eee' }}>
                    {g.document?.document_number ?? '—'}
                  </td>
                  <td style={{ padding: '6px 7px', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                    {g.document?.issuing_country_code ?? '—'}
                  </td>
                  <td style={{ padding: '6px 7px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' as const }}>
                    {g.document?.expiry_date ? fmtDate(g.document.expiry_date) : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '12px 10px', textAlign: 'center', color: '#aaa', fontStyle: 'italic' }}>
                  Aucun voyageur enregistré
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ SIGNATURE BLOCK ══════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: '32px', fontSize: '10pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ borderTop: '1px solid #ccc', paddingTop: '6px', marginRight: '20px' }}>
                  <div style={{ fontSize: '9pt', color: '#555', marginBottom: '30px' }}>
                    Signature & cachet de l'établissement
                  </div>
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ borderTop: '1px solid #ccc', paddingTop: '6px', marginLeft: '20px' }}>
                  <div style={{ fontSize: '9pt', color: '#555', marginBottom: '30px' }}>
                    Signature du client principal
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '8px', textAlign: 'center', fontSize: '8pt', color: '#aaa' }}>
          Document généré automatiquement par CheckTunisia · {hotel.name} · Réf. {ci.reference}
        </div>

      </div>
    </>
  );
};

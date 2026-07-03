/**
 * PoliceFiche — Fiche de police imprimable.
 *
 * Caché hors-écran en mode normal (position: absolute; left: -9999px).
 * NE PAS utiliser display:none — ça empêche le navigateur de l'inclure à
 * l'impression. L'élément doit être dans le layout pour que la visibilité
 * @media print fonctionne.
 *
 * window.print() → @media print masque tout sauf #police-fiche-root.
 * Contenu optimisé pour tenir sur 1 page A4 avec jusqu'à 5 voyageurs.
 */

import type { CheckIn, HotelProfile } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const SEX_LABELS: Record<string, string> = { M: 'M', F: 'F', X: 'X' };

const DOC_TYPE_LABELS: Record<string, string> = {
  passport:         'Passeport',
  national_id:      'Carte nat.',
  residence_permit: 'Titre séjour',
  driving_license:  'Permis',
  other:            'Autre',
};

const HOTEL_TYPE_LABELS: Record<string, string> = {
  hotel:       'Hôtel',
  guesthouse:  "Maison d'hôtes",
  appartement: 'Appartement',
  villa:       'Villa',
  hostel:      'Auberge',
  riad:        'Riad',
  motel:       'Motel',
  residence:   'Résidence',
  studio:      'Studio',
  maison_hote: "Maison d'hôtes",
  autre:       'Autre',
};

// ── styles partagés ───────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '4px 6px',
  textAlign: 'left',
  fontWeight: 'bold',
  fontSize: '7.5pt',
  background: '#E8EEFB',
  color: '#1B3A5F',
  borderBottom: '1px solid #ccc',
  borderRight: '1px solid #ddd',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: '8pt',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid #eee',
  verticalAlign: 'middle',
};

const LABEL: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: '7.5pt',
  fontWeight: 'bold',
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  background: '#f8f8f8',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid #eee',
  whiteSpace: 'nowrap',
};

const VALUE: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: '8.5pt',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid #eee',
};

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  id?: string;
  checkIn: CheckIn;
  hotel: HotelProfile;
}

export const PoliceFiche = ({ id = 'police-fiche-root', checkIn: ci, hotel }: Props) => {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const typeLabel = hotel.type ? (HOTEL_TYPE_LABELS[hotel.type] ?? hotel.type) : '';
  const stars     = hotel.stars ? '★'.repeat(hotel.stars) : '';

  const addr = [
    hotel.address?.line1,
    hotel.address?.city,
    hotel.address?.governorate,
  ].filter(Boolean).join(', ');

  // Limit to 5 guests max per page constraint
  const guests = (ci.guests ?? []).slice(0, 5);

  return (
    <>
      {/* ── CSS print ─────────────────────────────────────────────────────── */}
      <style>{`
        @media screen {
          /* Hors-écran mais dans le layout — JAMAIS display:none */
          #${id} { position: absolute; left: -9999px; top: 0; width: 210mm; }
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          /* Masquer tout le reste de la page */
          body > * { visibility: hidden !important; }
          /* Afficher uniquement la fiche */
          #${id} { visibility: visible !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; }
          #${id} * { visibility: visible !important; }
        }
      `}</style>

      {/* ── Fiche ─────────────────────────────────────────────────────────── */}
      <div
        id={id}
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '9pt',
          color: '#111',
          lineHeight: 1.3,
          background: '#fff',
        }}
      >

        {/* ══ EN-TÊTE ══════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0}
          style={{ borderBottom: '2.5px solid #1B3A5F', paddingBottom: '6px', marginBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', width: '65%' }}>
                <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#1B3A5F' }}>
                  {hotel.name}
                </div>
                {(typeLabel || stars) && (
                  <div style={{ fontSize: '8.5pt', color: '#555' }}>
                    {typeLabel}{stars ? ` · ${stars}` : ''}
                  </div>
                )}
                {addr && (
                  <div style={{ fontSize: '8pt', color: '#444', marginTop: '2px' }}>{addr}</div>
                )}
                {(hotel.phone || hotel.email) && (
                  <div style={{ fontSize: '8pt', color: '#444' }}>
                    {[hotel.phone, hotel.email].filter(Boolean).join(' · ')}
                  </div>
                )}
                {hotel.registration_number && (
                  <div style={{ fontSize: '7.5pt', color: '#777' }}>
                    RC / Matricule : {hotel.registration_number}
                  </div>
                )}
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'right', width: '35%' }}>
                <div style={{ fontSize: '7.5pt', color: '#aaa' }}>CheckTunisia</div>
                <div style={{ fontSize: '7.5pt', color: '#aaa' }}>Imprimé le {now}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ TITRE ═════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            letterSpacing: '3px',
            textTransform: 'uppercase' as const,
            color: '#1B3A5F',
            borderBottom: '1.5px solid #1B3A5F',
            paddingBottom: '2px',
          }}>
            Fiche de Police
          </span>
        </div>

        {/* ══ SÉJOUR ════════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0}
          style={{ border: '1px solid #ccc', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr style={{ background: '#1B3A5F' }}>
              <th colSpan={6} style={{ padding: '4px 8px', color: '#fff', fontSize: '8.5pt', textAlign: 'left', letterSpacing: '1px' }}>
                SÉJOUR
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={LABEL}>Référence</td>
              <td style={{ ...VALUE, fontFamily: 'monospace' }}>{ci.reference}</td>
              <td style={LABEL}>Unité</td>
              <td style={VALUE}>{ci.room?.number ?? '—'}</td>
              <td style={LABEL}>Adultes / Enfants</td>
              <td style={VALUE}>{ci.adults_count} / {ci.children_count}</td>
            </tr>
            <tr>
              <td style={LABEL}>Arrivée</td>
              <td style={VALUE}>{fmtDate(ci.check_in_date)}</td>
              <td style={LABEL}>Départ prévu</td>
              <td style={VALUE}>{fmtDate(ci.expected_check_out_date)}</td>
              <td style={LABEL}>Départ réel</td>
              <td style={VALUE}>{ci.actual_check_out_date ? fmtDate(ci.actual_check_out_date) : '—'}</td>
            </tr>
            {ci.booking_reference && (
              <tr>
                <td style={LABEL}>Réf. réservation</td>
                <td colSpan={5} style={VALUE}>{ci.booking_reference}{ci.booking_source ? ` (${ci.booking_source})` : ''}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ VOYAGEURS ═════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0}
          style={{ border: '1px solid #ccc', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr style={{ background: '#1B3A5F' }}>
              <th colSpan={8} style={{ padding: '4px 8px', color: '#fff', fontSize: '8.5pt', textAlign: 'left', letterSpacing: '1px' }}>
                VOYAGEURS — {ci.guests?.length ?? 0} personne{(ci.guests?.length ?? 0) > 1 ? 's' : ''}
                {(ci.guests?.length ?? 0) > 5 && ' (5 premiers affichés)'}
              </th>
            </tr>
            <tr>
              <th style={TH}>Nom & Prénom</th>
              <th style={TH}>Naissance</th>
              <th style={TH}>Sexe</th>
              <th style={TH}>Nationalité</th>
              <th style={TH}>Type pièce</th>
              <th style={TH}>N° document</th>
              <th style={TH}>Pays émet.</th>
              <th style={{ ...TH, borderRight: 'none' }}>Expiration</th>
            </tr>
          </thead>
          <tbody>
            {guests.length > 0 ? guests.map((g, idx) => (
              <tr key={g.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...TD, fontWeight: g.is_primary ? 'bold' : 'normal' }}>
                  {g.last_name.toUpperCase()} {g.first_name}
                  {g.is_primary && <span style={{ fontSize: '7pt', color: '#1B3A5F' }}> ★</span>}
                </td>
                <td style={{ ...TD, whiteSpace: 'nowrap' as const }}>{fmtDate(g.date_of_birth)}</td>
                <td style={TD}>{SEX_LABELS[g.sex] ?? g.sex}</td>
                <td style={TD}>{g.nationality_code}</td>
                <td style={TD}>{g.document ? (DOC_TYPE_LABELS[g.document.type] ?? g.document.type) : '—'}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: '7.5pt' }}>{g.document?.document_number ?? '—'}</td>
                <td style={TD}>{g.document?.issuing_country_code ?? '—'}</td>
                <td style={{ ...TD, borderRight: 'none', whiteSpace: 'nowrap' as const }}>
                  {g.document?.expiry_date ? fmtDate(g.document.expiry_date) : '—'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{ padding: '8px', textAlign: 'center', color: '#aaa', fontStyle: 'italic', fontSize: '8pt' }}>
                  Aucun voyageur enregistré
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ SIGNATURES ════════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: '14px' }}>
          <tbody>
            <tr>
              <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '8px' }}>
                <div style={{ borderTop: '1px solid #bbb', paddingTop: '4px' }}>
                  <span style={{ fontSize: '7.5pt', color: '#666' }}>Signature & cachet de l'établissement</span>
                  <div style={{ height: '28px' }} />
                </div>
              </td>
              <td style={{ width: '4%' }} />
              <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: '8px' }}>
                <div style={{ borderTop: '1px solid #bbb', paddingTop: '4px' }}>
                  <span style={{ fontSize: '7.5pt', color: '#666' }}>Signature du client principal (★)</span>
                  <div style={{ height: '28px' }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ PIED DE PAGE ══════════════════════════════════════════════════ */}
        <div style={{
          marginTop: '6px',
          borderTop: '1px solid #ddd',
          paddingTop: '4px',
          textAlign: 'center',
          fontSize: '7pt',
          color: '#aaa',
        }}>
          Document généré par CheckTunisia · {hotel.name} · Réf. {ci.reference}
        </div>

      </div>
    </>
  );
};

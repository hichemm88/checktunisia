/**
 * PoliceFiche — Fiche de police imprimable (1 page A4, max 5 voyageurs).
 *
 * ARCHITECTURE PRINT :
 * - Ce composant est rendu via createPortal dans document.body (pas dans #root)
 * - En mode écran : caché avec position:fixed hors viewport
 * - En impression : body > *:not(#police-fiche-root) { display:none } supprime
 *   le layout de toute l'app React, la fiche s'imprime seule depuis le haut de page
 *
 * ⚠️  NE JAMAIS utiliser display:none sur l'élément racine — ça l'exclut du layout
 *     et le navigateur ne peut plus l'imprimer même avec @media print.
 */

import type { CSSProperties } from 'react';
import type { CheckIn, HotelProfile, OrganizationInfo } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const SEX_LABELS: Record<string, string> = { M: 'M', F: 'F', X: 'X' };

const DOC_LABELS: Record<string, string> = {
  passport:         'Passeport',
  national_id:      'Carte nat.',
  residence_permit: 'Titre séjour',
  driving_license:  'Permis',
  other:            'Autre',
};

const TYPE_LABELS: Record<string, string> = {
  hotel:       'Hôtel',
  guesthouse:  "Maison d'hôtes",
  appartement: 'Appartement',
  villa:       'Villa',
  hostel:      'Auberge',
  riad:        'Riad',
  motel:       'Motel',
  residence:   'Résidence',
  studio:      'Studio',
  resort:      'Resort',
  bungalow:    'Bungalow',
  rental:      'Location saisonnière',
  maison_hotes:"Maison d'hôtes",
  maison_hote: "Maison d'hôtes",
  autre:       'Autre',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const C = '#1B3A5F'; // bleu principal

const cell = (extra?: CSSProperties): CSSProperties => ({
  padding: '3px 7px',
  fontSize: '8pt',
  borderBottom: '1px solid #e5e7eb',
  borderRight: '1px solid #e5e7eb',
  verticalAlign: 'middle',
  ...extra,
});

const lbl = (extra?: CSSProperties): CSSProperties => ({
  ...cell(),
  fontSize: '7.5pt',
  fontWeight: 'bold',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
  background: '#f9fafb',
  whiteSpace: 'nowrap' as const,
  ...extra,
});

const th = (extra?: CSSProperties): CSSProperties => ({
  padding: '4px 7px',
  fontSize: '7.5pt',
  fontWeight: 'bold',
  textAlign: 'left' as const,
  background: '#f0f4fb',
  color: C,
  borderBottom: `1.5px solid ${C}`,
  borderRight: '1px solid #dde4f0',
  whiteSpace: 'nowrap' as const,
  ...extra,
});

const td = (extra?: CSSProperties): CSSProperties => ({
  padding: '3px 7px',
  fontSize: '8pt',
  borderBottom: '1px solid #f0f0f0',
  borderRight: '1px solid #f0f0f0',
  verticalAlign: 'middle' as const,
  ...extra,
});

// ── Composant ─────────────────────────────────────────────────────────────────

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

  const typeLabel = hotel.type ? (TYPE_LABELS[hotel.type] ?? hotel.type) : '';
  const stars     = hotel.stars ? '★'.repeat(hotel.stars) : '';
  const addr      = [hotel.address?.line1, hotel.address?.city, hotel.address?.governorate]
                      .filter(Boolean).join(', ');
  const contacts  = [hotel.phone, hotel.email].filter(Boolean).join(' · ');

  const org: OrganizationInfo | null | undefined = hotel.organization;
  const orgAddr = org?.address
    ? [org.address.line1, org.address.city, org.address.governorate].filter(Boolean).join(', ')
    : '';
  const orgContacts = org ? [org.contact_phone, org.contact_email].filter(Boolean).join(' · ') : '';

  // Max 5 voyageurs sur 1 page
  const guests = (ci.guests ?? []).slice(0, 5);
  const extra  = (ci.guests?.length ?? 0) - guests.length;

  return (
    <>
      {/* ── CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        /* Écran : caché hors-viewport, jamais display:none */
        @media screen {
          #${id} {
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 210mm;
            height: auto;
            pointer-events: none;
            visibility: hidden;
          }
        }

        /* Impression : cacher TOUT sauf la fiche (display:none supprime le layout) */
        @media print {
          @page { size: A4 portrait; margin: 7mm 9mm; }
          body { margin: 0 !important; padding: 0 !important; }
          body > *:not(#${id}) { display: none !important; }
          #${id} {
            visibility: visible !important;
            position: static !important;
            top: auto !important; left: auto !important;
            width: 100% !important;
            height: auto !important;
            pointer-events: auto !important;
          }
        }
      `}</style>

      {/* ── Fiche ───────────────────────────────────────────────────── */}
      <div
        id={id}
        style={{
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          fontSize: '8.5pt',
          color: '#111',
          lineHeight: 1.35,
          background: '#fff',
        }}
      >

        {/* ══ EN-TÊTE ════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '9px' }}>
          <tbody>
            <tr>
              {/* Bandeau bleu gauche */}
              <td style={{ width: '4px', background: C, borderRadius: '2px' }} />
              <td style={{ width: '12px' }} />
              {/* Infos établissement */}
              <td style={{ verticalAlign: 'top', paddingTop: '2px' }}>
                <div style={{ fontSize: '13pt', fontWeight: '700', color: C, letterSpacing: '0.3px' }}>
                  {hotel.name}
                </div>
                {(typeLabel || stars) && (
                  <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '1px' }}>
                    {typeLabel}{stars ? ` · ${stars}` : ''}
                  </div>
                )}
                {addr && (
                  <div style={{ fontSize: '7.5pt', color: '#374151', marginTop: '2px' }}>{addr}</div>
                )}
                {contacts && (
                  <div style={{ fontSize: '7.5pt', color: '#374151' }}>{contacts}</div>
                )}
                {hotel.registration_number && (
                  <div style={{ fontSize: '7pt', color: '#9ca3af' }}>
                    RC / Matricule : {hotel.registration_number}
                  </div>
                )}
              </td>
              {/* Infos société / particulier */}
              <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '2px' }}>
                {org ? (
                  <>
                    <div style={{ fontSize: '7.5pt', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                      {org.entity_type === 'individual' ? 'Particulier' : 'Société'}
                    </div>
                    <div style={{ fontSize: '10.5pt', fontWeight: '700', color: C, marginTop: '1px' }}>
                      {org.name}
                    </div>
                    {orgAddr && (
                      <div style={{ fontSize: '7.5pt', color: '#374151', marginTop: '2px' }}>{orgAddr}</div>
                    )}
                    {orgContacts && (
                      <div style={{ fontSize: '7.5pt', color: '#374151' }}>{orgContacts}</div>
                    )}
                    {org.registration_number && (
                      <div style={{ fontSize: '7pt', color: '#9ca3af' }}>
                        {org.entity_type === 'individual' ? 'CIN' : 'RC / Matricule'} : {org.registration_number}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    display: 'inline-block',
                    background: C,
                    color: '#fff',
                    fontSize: '7pt',
                    fontWeight: '600',
                    letterSpacing: '1.5px',
                    padding: '2px 8px',
                    borderRadius: '3px',
                  }}>
                    QAYED
                  </div>
                )}
                <div style={{ fontSize: '7pt', color: '#9ca3af', marginTop: '4px' }}>Imprimé le {now}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ TITRE ══════════════════════════════════════════════════ */}
        <div style={{
          textAlign: 'center',
          margin: '0 0 9px 0',
          padding: '5px 0',
          background: C,
          color: '#fff',
          fontSize: '10pt',
          fontWeight: '700',
          letterSpacing: '4px',
          textTransform: 'uppercase' as const,
          borderRadius: '2px',
        }}>
          Fiche de Police
        </div>

        {/* ══ SÉJOUR ═════════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0}
          style={{ border: '1px solid #e5e7eb', borderCollapse: 'collapse', marginBottom: '9px', borderRadius: '3px', overflow: 'hidden' }}>
          <thead>
            <tr>
              <th colSpan={6} style={{
                padding: '4px 8px',
                background: '#f9fafb',
                color: C,
                fontSize: '7.5pt',
                fontWeight: '700',
                textAlign: 'left',
                borderBottom: '1px solid #e5e7eb',
                letterSpacing: '1px',
                textTransform: 'uppercase' as const,
              }}>
                Séjour
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={lbl()}>Référence</td>
              <td style={cell({ fontFamily: 'monospace', fontWeight: 'bold', color: C, fontSize: '8pt', whiteSpace: 'nowrap' })}>
                {ci.reference}
              </td>
              <td style={lbl()}>Unité</td>
              <td style={cell()}>{ci.room?.number ?? '—'}</td>
              <td style={lbl()}>Adultes / Enfants</td>
              <td style={cell({ borderRight: 'none' })}>{ci.adults_count} / {ci.children_count}</td>
            </tr>
            <tr>
              <td style={lbl()}>Arrivée</td>
              <td style={cell()}>{fmtDate(ci.check_in_date)}</td>
              <td style={lbl()}>Départ prévu</td>
              <td style={cell()}>{fmtDate(ci.expected_check_out_date)}</td>
              <td style={lbl()}>Départ réel</td>
              <td style={cell({ borderRight: 'none' })}>
                {ci.actual_check_out_date ? fmtDate(ci.actual_check_out_date) : '—'}
              </td>
            </tr>
            {ci.booking_reference && (
              <tr>
                <td style={lbl()}>Réf. réservation</td>
                <td colSpan={5} style={cell({ borderRight: 'none' })}>
                  {ci.booking_reference}{ci.booking_source ? ` · ${ci.booking_source}` : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ VOYAGEURS ══════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0}
          style={{ border: '1px solid #e5e7eb', borderCollapse: 'collapse', marginBottom: '10px', borderRadius: '3px', overflow: 'hidden' }}>
          <thead>
            <tr>
              <th colSpan={8} style={{
                padding: '4px 8px',
                background: '#f9fafb',
                color: C,
                fontSize: '7.5pt',
                fontWeight: '700',
                textAlign: 'left',
                borderBottom: '1px solid #e5e7eb',
                letterSpacing: '1px',
                textTransform: 'uppercase' as const,
              }}>
                Voyageurs — {ci.guests?.length ?? 0} personne{(ci.guests?.length ?? 0) > 1 ? 's' : ''}
                {extra > 0 && <span style={{ fontWeight: 'normal', fontSize: '7pt' }}> (5 premiers · {extra} non affich{extra > 1 ? 'és' : 'é'})</span>}
              </th>
            </tr>
            <tr>
              <th style={th()}>Nom &amp; Prénom</th>
              <th style={th()}>Naissance</th>
              <th style={th()}>Sexe</th>
              <th style={th()}>Nationalité</th>
              <th style={th()}>Type pièce</th>
              <th style={th()}>N° document</th>
              <th style={th()}>Pays émet.</th>
              <th style={th({ borderRight: 'none' })}>Expiration</th>
            </tr>
          </thead>
          <tbody>
            {guests.length > 0 ? guests.map((g, i) => (
              <tr key={g.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={td({ fontWeight: g.is_primary ? '700' : '400' })}>
                  {g.last_name.toUpperCase()} {g.first_name}
                  {g.is_primary && (
                    <span style={{ marginLeft: '4px', fontSize: '7pt', color: C }}>★</span>
                  )}
                </td>
                <td style={td({ whiteSpace: 'nowrap' as const })}>{fmtDate(g.date_of_birth)}</td>
                <td style={td({ textAlign: 'center' as const })}>{SEX_LABELS[g.sex] ?? g.sex}</td>
                <td style={td({ textAlign: 'center' as const })}>{g.nationality_code}</td>
                <td style={td()}>{g.document ? (DOC_LABELS[g.document.type] ?? g.document.type) : '—'}</td>
                <td style={td({ fontFamily: 'monospace', fontSize: '7.5pt', whiteSpace: 'nowrap' as const })}>
                  {g.document?.document_number ?? '—'}
                </td>
                <td style={td({ textAlign: 'center' as const })}>{g.document?.issuing_country_code ?? '—'}</td>
                <td style={td({ borderRight: 'none', whiteSpace: 'nowrap' as const })}>
                  {g.document?.expiry_date ? fmtDate(g.document.expiry_date) : '—'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', fontSize: '8pt' }}>
                  Aucun voyageur enregistré
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ SIGNATURES ═════════════════════════════════════════════ */}
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={{ width: '47%', verticalAlign: 'top' }}>
                <div style={{ borderTop: `1px solid #d1d5db`, paddingTop: '4px' }}>
                  <div style={{ fontSize: '7.5pt', color: '#6b7280', marginBottom: '22px' }}>
                    Signature &amp; cachet de l'établissement
                  </div>
                </div>
              </td>
              <td style={{ width: '6%' }} />
              <td style={{ width: '47%', verticalAlign: 'top' }}>
                <div style={{ borderTop: `1px solid #d1d5db`, paddingTop: '4px' }}>
                  <div style={{ fontSize: '7.5pt', color: '#6b7280', marginBottom: '22px' }}>
                    Signature du client principal (★)
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ PIED DE PAGE ═══════════════════════════════════════════ */}
        <div style={{
          marginTop: '5px',
          borderTop: '1px solid #f3f4f6',
          paddingTop: '3px',
          textAlign: 'center',
          fontSize: '6.5pt',
          color: '#d1d5db',
          letterSpacing: '0.5px',
        }}>
          Qayed · {hotel.name} · {ci.reference}
        </div>

      </div>
    </>
  );
};

/**
 * Mockups produit préservés de la landing v3 (HTML figé, non éditable dans
 * Puck au-delà du choix du mockup) : décomposer ces visuels art-directed en
 * blocs génériques serait long et fragile — décision produit validée.
 */
export const MOCKUPS: Record<string, string> = {
  'pwa-checkin': `<div class="hero-right">
      <div class="phone-wrap">
        <div class="float-badge">
          <div class="fb-label">Check-in enregistré</div>
          <div class="fb-val">✓ Conforme</div>
        </div>
        <div class="float-badge2">
          <div class="fb-label">Document lu</div>
          <div style="font-size:13px;font-weight:700;color:var(--encre)">Passeport · MRZ ✓</div>
        </div>

        <div class="phone-frame">
          <div class="phone-screen">
            <div class="phone-topbar">
              <div class="phone-logo"><span>قيد</span></div>
              <div>
                <div class="phone-property">Riad Al Warda</div>
                <div class="phone-sub">Nouveau check-in</div>
              </div>
            </div>
            <div style="background:#fff;padding:12px 16px;border-bottom:1px solid var(--ligne)">
              <div style="display:flex;align-items:center;gap:0;width:100%">
                <div style="display:flex;flex-direction:column;align-items:center;flex:1">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--cachet);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">✓</div>
                  <div style="font-size:8px;color:var(--fiche);margin-top:3px;font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em">Réservation</div>
                </div>
                <div style="flex:1;height:2px;background:var(--cachet);margin-bottom:14px"></div>
                <div style="display:flex;flex-direction:column;align-items:center;flex:1">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--cachet);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;box-shadow:0 0 0 3px var(--cachet-dilue)">2</div>
                  <div style="font-size:8px;color:var(--cachet);margin-top:3px;font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Documents</div>
                </div>
                <div style="flex:1;height:2px;background:var(--ligne);margin-bottom:14px"></div>
                <div style="display:flex;flex-direction:column;align-items:center;flex:1">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--ligne);color:var(--fiche);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">3</div>
                  <div style="font-size:8px;color:var(--fiche);margin-top:3px;font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em">Validation</div>
                </div>
              </div>
            </div>
            <div style="padding:14px">
              <div style="font-size:11px;font-weight:700;color:var(--encre);margin-bottom:10px">Voyageur principal (adulte)</div>
              <div style="background:var(--conforme-fond);border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:7px;margin-bottom:12px">
                <span style="font-size:14px">✓</span>
                <span style="font-size:10px;color:var(--conforme-txt);font-weight:600">Document lu avec succès — vérifiez les données</span>
              </div>
              <div style="font-size:9px;color:var(--fiche);font-family:var(--font-m);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Type de document</div>
              <div style="background:var(--papier);border-radius:7px;padding:8px 10px;margin-bottom:10px;font-size:12px;color:var(--encre);font-weight:500">Passeport</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div>
                  <div style="font-size:9px;color:var(--fiche);font-family:var(--font-m);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px">Prénom</div>
                  <div style="background:var(--papier);border-radius:7px;padding:7px 9px;font-size:11px;font-weight:600;color:var(--encre)">KRISTY JOAN</div>
                </div>
                <div>
                  <div style="font-size:9px;color:var(--fiche);font-family:var(--font-m);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px">Nom</div>
                  <div style="background:var(--papier);border-radius:7px;padding:7px 9px;font-size:11px;font-weight:600;color:var(--encre)">DAVEY</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                <div>
                  <div style="font-size:9px;color:var(--fiche);font-family:var(--font-m);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px">Nationalité</div>
                  <div style="background:var(--papier);border-radius:7px;padding:7px 9px;font-size:11px;font-weight:600;color:var(--encre)">NZL</div>
                </div>
                <div>
                  <div style="font-size:9px;color:var(--fiche);font-family:var(--font-m);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px">N° document</div>
                  <div style="background:var(--papier);border-radius:7px;padding:7px 9px;font-size:11px;font-weight:600;color:var(--encre);font-family:var(--font-m)">RE133407</div>
                </div>
              </div>
              <div style="background:var(--cachet);color:#fff;border-radius:8px;padding:11px;text-align:center;font-size:11px;font-weight:700">Confirmer le voyageur →</div>
            </div>
            <div style="background:#fff;border-top:1px solid var(--ligne);padding:8px 0 10px;display:flex;justify-content:space-around">
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:7px;color:var(--fiche);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.04em">
                <div style="font-size:14px">⊞</div>Accueil
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:7px;color:var(--cachet);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.04em;font-weight:700">
                <div style="width:22px;height:22px;background:var(--cachet);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px">✓</div>Check-in
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:7px;color:var(--fiche);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.04em">
                <div style="font-size:14px">↺</div>Historique
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:7px;color:var(--fiche);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.04em">
                <div style="font-size:14px">⊗</div>Paramètres
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  'flow-screens': `<div class="flow-visual fade-in">
        <div class="flow-screen active" id="screen-1">
          <div class="flow-screen-head">
            <span class="fsh-title">Nouveau check-in — Riad Al Warda</span>
            <span class="fsh-step">Étape 1 / 3</span>
          </div>
          <div class="flow-screen-body">
            <div class="fs-form-row">
              <div class="fs-field fs-field-full">
                <div class="fs-field-label">Chambre</div>
                <div class="fs-field-val">Chambre Bleue</div>
              </div>
            </div>
            <div class="fs-form-row">
              <div class="fs-field">
                <div class="fs-field-label">Arrivée</div>
                <div class="fs-field-val mono">07/07/2026</div>
              </div>
              <div class="fs-field">
                <div class="fs-field-label">Départ prévu</div>
                <div class="fs-field-val mono">11/07/2026</div>
              </div>
            </div>
            <div class="fs-form-row">
              <div class="fs-field">
                <div class="fs-field-label">Adultes</div>
                <div class="counter-row">
                  <div class="counter-btn">−</div>
                  <div class="counter-val">2</div>
                  <div class="counter-btn">+</div>
                </div>
              </div>
              <div class="fs-field">
                <div class="fs-field-label">Enfants</div>
                <div class="counter-row">
                  <div class="counter-btn">−</div>
                  <div class="counter-val">0</div>
                  <div class="counter-btn">+</div>
                </div>
              </div>
            </div>
            <div class="fs-field" style="margin-bottom:16px">
              <div class="fs-field-label">Réf. réservation (optionnel)</div>
              <div class="fs-field-val" style="color:var(--fiche)">ex. BOOKING-123</div>
            </div>
            <div style="background:var(--cachet);color:#fff;border-radius:var(--r-sm);padding:12px;text-align:center;font-size:14px;font-weight:600;cursor:pointer">Suivant →</div>
          </div>
        </div>

        <div class="flow-screen" id="screen-2">
          <div class="flow-screen-head">
            <span class="fsh-title">Documents voyageurs</span>
            <span class="fsh-step">Étape 2 / 3 · Voyageur 1/2</span>
          </div>
          <div class="flow-screen-body">
            <div style="font-size:14px;font-weight:700;color:var(--encre);margin-bottom:16px">Voyageur principal (adulte)</div>
            <div class="mrz-zone">
              <div class="mrz-icon">📷</div>
              <div class="mrz-hint">Photographiez la page du passeport avec la zone MRZ (deux lignes de codes) bien visible.</div>
            </div>
            <div class="mrz-btns">
              <div class="mrz-btn mrz-btn-primary">📷 Prendre une photo</div>
              <div class="mrz-btn mrz-btn-secondary">↑ Importer une photo</div>
              <div class="mrz-btn mrz-btn-ghost">Saisie manuelle</div>
            </div>
            <div style="text-align:center;margin-top:14px;font-size:13px;color:var(--cachet);cursor:pointer">Passer →</div>
          </div>
        </div>

        <div class="flow-screen" id="screen-3">
          <div class="flow-screen-head">
            <span class="fsh-title">Validation</span>
            <span class="fsh-step">Étape 3 / 3</span>
          </div>
          <div class="flow-screen-body">
            <div class="val-success">
              <div class="val-success-icon">✓</div>
              <div class="val-success-text">2 voyageurs enregistrés · Fiche de police prête</div>
            </div>
            <div class="val-traveler">
              <div class="val-t-head">
                <span class="val-t-name">EMMA JANE M.</span>
                <span class="val-t-role">Principal</span>
              </div>
              <div class="val-t-row"><span class="val-t-k">Document</span><span class="val-t-v mono">Passeport · AUS</span></div>
              <div class="val-t-row"><span class="val-t-k">Chambre</span><span class="val-t-v">Chambre Bleue</span></div>
              <div class="val-t-row"><span class="val-t-k">Séjour</span><span class="val-t-v mono">07/07 → 11/07</span></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:14px">
              <div style="flex:1;background:var(--cachet);color:#fff;border-radius:var(--r-sm);padding:11px;text-align:center;font-size:13px;font-weight:600;cursor:pointer">Confirmer</div>
              <div style="background:var(--papier);border:1px solid var(--ligne);border-radius:var(--r-sm);padding:11px;text-align:center;font-size:13px;font-weight:600;cursor:pointer;color:var(--encre)">🖨 Imprimer fiche</div>
            </div>
          </div>
        </div>
      </div>`,
  'fiche-police': `<div class="fiche-grid fade-in">
      <div>
        <div class="eyebrow">Ce que ça donne</div>
        <h2 class="section-h2">Un check-in enregistré ressemble à ça.</h2>
        <p style="font-size:16px;color:var(--texte-sec);line-height:1.65;margin-bottom:24px">Chaque séjour est archivé avec l'identité complète de chaque voyageur, la chambre, les dates, la source de réservation et la personne qui a effectué le check-in.</p>
        <p style="font-size:16px;color:var(--texte-sec);line-height:1.65;margin-bottom:24px">À tout moment, vous pouvez consulter l'historique, imprimer la fiche ou enregistrer le départ.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge b-ok"><span class="dot"></span>Actif</span>
          <span class="badge" style="background:#F3F4F6;color:#374151"><span class="dot" style="background:#9CA3AF"></span>Terminé</span>
        </div>
      </div>
      <div>
        <div class="fiche-card">
          <div class="fiche-head">
            <span class="fiche-head-title">Détail check-in</span>
            <span class="fiche-head-num">QYD-20260707-0002</span>
          </div>
          <div>
            <div class="fiche-row"><span class="fiche-k">Établissement</span><span class="fiche-v">Riad Al Warda — Chambre Bleue</span></div>
            <div class="fiche-row"><span class="fiche-k">Arrivée</span><span class="fiche-v mono">07/07/2026</span></div>
            <div class="fiche-row"><span class="fiche-k">Départ prévu</span><span class="fiche-v mono">11/07/2026</span></div>
            <div class="fiche-row"><span class="fiche-k">Voyageurs</span><span class="fiche-v">2 adultes · 0 enfant</span></div>
            <div class="fiche-row"><span class="fiche-k">Source</span><span class="fiche-v">Direct</span></div>
            <div class="fiche-row"><span class="fiche-k">Enregistré par</span><span class="fiche-v">H. Aouadi (Réceptionniste)</span></div>
            <div class="fiche-row"><span class="fiche-k">Statut</span><span class="fiche-v"><span class="badge b-ok"><span class="dot"></span>Actif</span></span></div>
          </div>
        </div>
        <div style="margin-top:14px;background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid var(--ligne);display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:13px;font-weight:700;color:var(--encre)">Voyageurs · 2/2</span>
          </div>
          <div style="padding:12px 18px;border-bottom:1px solid var(--ligne);display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--cachet);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">EM</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--encre)">EMMA JANE M. <span class="badge b-ok" style="font-size:10px;padding:2px 8px"><span class="dot"></span>Principal</span></div>
              <div style="font-size:11px;color:var(--fiche);font-family:var(--font-m)">Passeport AUS · expire 02/04/2029</div>
            </div>
          </div>
          <div style="padding:12px 18px;display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--cachet-dilue);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--cachet);flex-shrink:0">LF</div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--encre)">LILA JEAN F.</div>
              <div style="font-size:11px;color:var(--fiche);font-family:var(--font-m)">Passeport USA · expire 19/03/2036</div>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  'fiche-visual': `<div>
        <div class="fiche-card">
          <div class="fiche-head">
            <span class="fiche-head-title">Détail check-in</span>
            <span class="fiche-head-num">QYD-20260707-0002</span>
          </div>
          <div>
            <div class="fiche-row"><span class="fiche-k">Établissement</span><span class="fiche-v">Riad Al Warda — Chambre Bleue</span></div>
            <div class="fiche-row"><span class="fiche-k">Arrivée</span><span class="fiche-v mono">07/07/2026</span></div>
            <div class="fiche-row"><span class="fiche-k">Départ prévu</span><span class="fiche-v mono">11/07/2026</span></div>
            <div class="fiche-row"><span class="fiche-k">Voyageurs</span><span class="fiche-v">2 adultes · 0 enfant</span></div>
            <div class="fiche-row"><span class="fiche-k">Source</span><span class="fiche-v">Direct</span></div>
            <div class="fiche-row"><span class="fiche-k">Enregistré par</span><span class="fiche-v">H. Aouadi (Réceptionniste)</span></div>
            <div class="fiche-row"><span class="fiche-k">Statut</span><span class="fiche-v"><span class="badge b-ok"><span class="dot"></span>Actif</span></span></div>
          </div>
        </div>
        <div style="margin-top:14px;background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid var(--ligne);display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:13px;font-weight:700;color:var(--encre)">Voyageurs · 2/2</span>
          </div>
          <div style="padding:12px 18px;border-bottom:1px solid var(--ligne);display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--cachet);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">EM</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--encre)">EMMA JANE M. <span class="badge b-ok" style="font-size:10px;padding:2px 8px"><span class="dot"></span>Principal</span></div>
              <div style="font-size:11px;color:var(--fiche);font-family:var(--font-m)">Passeport AUS · expire 02/04/2029</div>
            </div>
          </div>
          <div style="padding:12px 18px;display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--cachet-dilue);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--cachet);flex-shrink:0">LF</div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--encre)">LILA JEAN F.</div>
              <div style="font-size:11px;color:var(--fiche);font-family:var(--font-m)">Passeport USA · expire 19/03/2036</div>
            </div>
          </div>
        </div>
      </div>`,
  'authority-dashboard': `<div style="background:rgba(246,245,241,.04);border:1px solid rgba(246,245,241,.1);border-radius:var(--r-lg);overflow:hidden">
          <div style="background:rgba(83,70,168,.25);border-bottom:1px solid rgba(246,245,241,.08);padding:14px 20px;display:flex;align-items:center;gap:10px">
            <div style="width:28px;height:28px;border:2px solid var(--cachet-sombre);border-radius:7px;display:flex;align-items:center;justify-content:center">
              <span style="font-family:var(--font-ar);font-weight:700;font-size:12px;color:var(--cachet-sombre)">ق</span>
            </div>
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--papier)">Ministère de l'Intérieur</div>
              <div style="font-family:var(--font-m);font-size:10px;color:var(--cachet-sombre);letter-spacing:.1em;text-transform:uppercase">Tableau de bord national</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid rgba(246,245,241,.06)">
            <div style="padding:16px 18px;border-right:1px solid rgba(246,245,241,.06);text-align:center">
              <div style="font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:28px;color:var(--cachet-sombre);letter-spacing:-.02em">24</div>
              <div style="font-size:11px;color:rgba(246,245,241,.4);margin-top:2px">Voyageurs présents</div>
            </div>
            <div style="padding:16px 18px;border-right:1px solid rgba(246,245,241,.06);text-align:center">
              <div style="font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:28px;color:var(--cachet-sombre);letter-spacing:-.02em">8</div>
              <div style="font-size:11px;color:rgba(246,245,241,.4);margin-top:2px">Arrivées aujourd'hui</div>
            </div>
            <div style="padding:16px 18px;text-align:center">
              <div style="font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:28px;color:var(--cachet-sombre);letter-spacing:-.02em">6</div>
              <div style="font-size:11px;color:rgba(246,245,241,.4);margin-top:2px">Établissements actifs</div>
            </div>
          </div>
          <div style="padding:16px 20px;border-bottom:1px solid rgba(246,245,241,.06)">
            <div style="font-family:var(--font-m);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,245,241,.35);margin-bottom:12px">Surveillance — alertes actives</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:var(--r-sm)">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:8px;height:8px;border-radius:50%;background:#EF4444;flex-shrink:0"></div>
                  <div>
                    <div style="font-size:12px;font-weight:600;color:var(--papier)">Alerte Interpol — Red Notice</div>
                    <div style="font-size:11px;color:rgba(246,245,241,.4);font-family:var(--font-m)">Correspondance passeport détectée</div>
                  </div>
                </div>
                <div style="font-size:10px;font-weight:700;color:#F87171;font-family:var(--font-m);text-transform:uppercase;letter-spacing:.08em">Critique</div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(232,184,75,.06);border:1px solid rgba(232,184,75,.18);border-radius:var(--r-sm)">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:8px;height:8px;border-radius:50%;background:var(--vigilance);flex-shrink:0"></div>
                  <div>
                    <div style="font-size:12px;font-weight:600;color:var(--papier)">Document expiré signalé</div>
                    <div style="font-size:11px;color:rgba(246,245,241,.4);font-family:var(--font-m)">À vérifier auprès de l'établissement</div>
                  </div>
                </div>
                <div style="font-size:10px;font-weight:700;color:var(--vigilance);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.08em">Élevé</div>
              </div>
            </div>
          </div>
          <div style="padding:16px 20px">
            <div style="font-family:var(--font-m);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,245,241,.35);margin-bottom:12px">Nationalités présentes</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(246,245,241,.6)">
                <span style="width:28px;font-family:var(--font-m)">ITA</span>
                <div style="flex:1;height:5px;background:rgba(246,245,241,.08);border-radius:3px"><div style="width:60%;height:100%;background:var(--cachet-sombre);border-radius:3px"></div></div>
                <span style="font-family:var(--font-m);font-size:11px">7</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(246,245,241,.6)">
                <span style="width:28px;font-family:var(--font-m)">FRA</span>
                <div style="flex:1;height:5px;background:rgba(246,245,241,.08);border-radius:3px"><div style="width:45%;height:100%;background:var(--cachet-sombre);border-radius:3px"></div></div>
                <span style="font-family:var(--font-m);font-size:11px">5</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(246,245,241,.6)">
                <span style="width:28px;font-family:var(--font-m)">GBR</span>
                <div style="flex:1;height:5px;background:rgba(246,245,241,.08);border-radius:3px"><div style="width:28%;height:100%;background:var(--cachet-sombre);border-radius:3px"></div></div>
                <span style="font-family:var(--font-m);font-size:11px">3</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(246,245,241,.6)">
                <span style="width:28px;font-family:var(--font-m)">TUN</span>
                <div style="flex:1;height:5px;background:rgba(246,245,241,.08);border-radius:3px"><div style="width:25%;height:100%;background:var(--cachet-sombre);border-radius:3px"></div></div>
                <span style="font-family:var(--font-m);font-size:11px">3</span>
              </div>
            </div>
          </div>
        </div>
<p style="font-size:12px;color:rgba(246,245,241,.25);margin-top:12px;text-align:center;font-family:var(--font-m);letter-spacing:.06em">INTERFACE MINISTÈRE DE L'INTÉRIEUR — DONNÉES FICTIVES</p>`,
};

export const MOCKUP_CHOICES = [
  { label: 'PWA — check-in (téléphone)', value: 'pwa-checkin' },
  { label: 'Écrans du flux (3 étapes)', value: 'flow-screens' },
  { label: 'Fiche de police (grille complète FR)', value: 'fiche-police' },
  { label: 'Fiche de police (visuel seul)', value: 'fiche-visual' },
  { label: 'Dashboard autorités', value: 'authority-dashboard' },
] as const;

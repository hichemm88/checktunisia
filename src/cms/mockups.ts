/**
 * Maquettes produit de la landing (HTML figé, non éditable dans Puck au-delà
 * du choix du visuel). Décomposer ces visuels art-directed en blocs génériques
 * serait long et fragile — décision produit validée.
 *
 * Refonte août 2026 : trois maquettes au lieu de cinq, aucun emoji ni glyphe
 * décoratif (les états sont dits en toutes lettres, en petites capitales
 * monospace), et plus aucune interface d'autorité. Le tableau de bord
 * « Ministère de l'Intérieur » et ses données fictives ont été retirés.
 */
export const MOCKUPS: Record<string, string> = {
  // Écran de saisie sur mobile — visuel du hero.
  'pwa-checkin': `<div class="hero-right">
      <div class="phone-wrap">
        <div class="phone-frame">
          <div class="phone-screen">
            <div class="phone-topbar">
              <div class="phone-logo"><span>قيد</span></div>
              <div>
                <div class="phone-property">Riad Al Warda</div>
                <div class="phone-sub">Nouveau check-in</div>
              </div>
            </div>
            <div class="phone-body">
              <div class="phone-steps">
                <span class="done"></span><span class="done"></span><span></span>
              </div>
              <div class="phone-read">Document lu — vérifiez les données</div>
              <div class="phone-label">Type de document</div>
              <div class="phone-value">Passeport</div>
              <div class="phone-row">
                <div>
                  <div class="phone-label">Prénom</div>
                  <div class="phone-value">KRISTY JOAN</div>
                </div>
                <div>
                  <div class="phone-label">Nom</div>
                  <div class="phone-value">DAVEY</div>
                </div>
              </div>
              <div class="phone-row">
                <div>
                  <div class="phone-label">Nationalité</div>
                  <div class="phone-value mono">NZL</div>
                </div>
                <div>
                  <div class="phone-label">N° document</div>
                  <div class="phone-value mono">RE133407</div>
                </div>
              </div>
              <div class="phone-cta">Confirmer le voyageur</div>
            </div>
          </div>
        </div>
      </div>
    </div>`,

  // Une seule maquette pour « comment ça marche » : le résultat de l'étape 3.
  'flow-validation': `<div class="flow-screen">
        <div class="flow-screen-head">
          <span class="fsh-title">Validation</span>
          <span class="fsh-step">Étape 03 / 03</span>
        </div>
        <div class="flow-screen-body">
          <div class="val-success">2 voyageurs enregistrés — fiche de police prête</div>
          <div class="val-traveler">
            <div class="val-t-head">
              <span class="val-t-name">EMMA JANE M.</span>
              <span class="val-t-role">Principal</span>
            </div>
            <div class="val-t-row"><span class="val-t-k">Document</span><span class="val-t-v mono">Passeport · AUS</span></div>
            <div class="val-t-row"><span class="val-t-k">Chambre</span><span class="val-t-v">Chambre Bleue</span></div>
            <div class="val-t-row"><span class="val-t-k">Séjour</span><span class="val-t-v mono">07/07 — 11/07</span></div>
          </div>
          <div class="val-traveler">
            <div class="val-t-head">
              <span class="val-t-name">LILA JEAN F.</span>
              <span class="val-t-role">Accompagnant</span>
            </div>
            <div class="val-t-row"><span class="val-t-k">Document</span><span class="val-t-v mono">Passeport · USA</span></div>
          </div>
        </div>
      </div>`,

  // Détail d'un séjour archivé — visuel de la section « ce que ça donne ».
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
      </div>`,
};

export const MOCKUP_CHOICES = [
  { label: 'Check-in sur mobile (téléphone)', value: 'pwa-checkin' },
  { label: 'Écran de validation', value: 'flow-validation' },
  { label: 'Détail de check-in archivé', value: 'fiche-visual' },
] as const;

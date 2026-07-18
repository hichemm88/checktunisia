{{--
  Gabarit PDF du rapport mensuel de l'Observatoire (module IA 2).
  Couleurs Qayed : en-tete encre nuit, sceau قيد a -6deg, pied de page normalise.
  Aucun emoji. Arabe (RTL) en premier, francais en second (§6).

  A rendre avec le meme moteur PDF que les exports Qayed existants
  (ex. barryvdh/laravel-dompdf). Les styles sont volontairement inline/simples
  pour compatibilite domppdf.
--}}
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 90px 40px 70px 40px; }
  body { font-family: 'DejaVu Sans', sans-serif; color: #10222E; font-size: 12px; line-height: 1.5; }
  header { position: fixed; top: -70px; left: 0; right: 0; height: 60px;
           background: #10222E; color: #F6F5F1; padding: 12px 20px; }
  header .titre { font-size: 15px; font-weight: bold; }
  header .sceau { float: right; transform: rotate(-6deg); font-size: 20px; }
  footer { position: fixed; bottom: -50px; left: 0; right: 0; height: 40px;
           text-align: center; font-size: 9px; color: #8A94A0;
           border-top: 1px solid #DDD9CF; padding-top: 8px; }
  h2 { color: #5346A8; font-size: 14px; border-bottom: 2px solid #EEEBFA; padding-bottom: 4px; }
  .rtl { direction: rtl; text-align: right; }
  .kpi { display: inline-block; width: 22%; padding: 8px; margin: 4px 0;
         background: #F6F5F1; border-radius: 8px; text-align: center; }
  .kpi .v { font-size: 18px; font-weight: bold; color: #5346A8; }
  .kpi .l { font-size: 9px; color: #8A94A0; text-transform: uppercase; }
  .note { background: #FBF0D7; color: #8A6206; padding: 10px; border-radius: 8px; font-size: 10px; }
</style>
</head>
<body>
  <header>
    <span class="sceau">قيد</span>
    <div class="titre">Observatoire du Tourisme — Rapport {{ $pack['mois_libelle'] ?? $rapport->mois }}</div>
  </header>

  <footer>
    Statistiques agregees anonymes — Observatoire Qayed. Seuil de confidentialite k={{ $pack['seuil_k'] ?? 10 }}.
  </footer>

  {{-- Chiffres cles (communs aux deux langues) --}}
  <h2>Chiffres cles / أرقام رئيسية</h2>
  <div>
    <div class="kpi"><div class="v">{{ $pack['kpis']['arrivees'] ?? '—' }}</div><div class="l">Arrivees</div></div>
    <div class="kpi"><div class="v">{{ $pack['kpis']['nuitees'] ?? '—' }}</div><div class="l">Nuitees</div></div>
    <div class="kpi"><div class="v">{{ $pack['kpis']['duree_moyenne_sejour'] ?? '—' }}</div><div class="l">Duree moyenne</div></div>
    <div class="kpi"><div class="v">{{ $pack['kpis']['nationalites_actives'] ?? '—' }}</div><div class="l">Nationalites</div></div>
  </div>

  {{-- Version arabe (premier, RTL) --}}
  <div class="rtl">
    {!! nl2br(e($rapport->html_ar)) !!}
  </div>

  <div style="page-break-before: always;"></div>

  {{-- Version francaise (second) --}}
  <div>
    {!! nl2br(e($rapport->html_fr)) !!}
  </div>

  <div class="note">
    Note methodologique : donnees issues de {{ $pack['couverture']['nb_etablissements_actifs'] ?? 0 }}
    etablissement(s) actif(s) sur {{ $pack['couverture']['nb_zones_couvertes'] ?? 0 }} zone(s).
    Representativite partielle. Aucune statistique portant sur moins de {{ $pack['seuil_k'] ?? 10 }}
    sejours n'est publiee (seuil de confidentialite).
  </div>
</body>
</html>

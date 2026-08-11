/**
 * Feuille de style du site public (landing + pages CMS) — scopée sous
 * .qayed-landing pour ne jamais fuir dans les portails applicatifs.
 * Injectée via <style> JSX (pas un import .css) pour être démontée avec les
 * composants qui la consomment.
 *
 * Direction (refonte août 2026) : registre officiel — encre et papier,
 * hiérarchie typographique, séparations par filets. Pas de carte arrondie
 * par défaut, pas d'ombre portée décorative, pas de pictogramme.
 */
export const SITE_CSS = `
:root {
  --encre:        #10222E;
  --papier:       #F6F5F1;
  --cachet:       #5346A8;
  --cachet-fonce: #443896;
  --cachet-sombre:#8B7FE0;
  --cachet-dilue: #EEEBFA;
  --conforme:     #1F9D6B;
  --conforme-fond:#E4F5EC;
  --conforme-txt: #137453;
  --vigilance:    #E3A008;
  --vigi-fond:    #FBF0D7;
  --vigi-txt:     #8A6206;
  /* Gris de la fiche — remonté de #8A94A0 (2,9:1) à 4,8:1 sur papier : AA. */
  --fiche:        #616B75;
  --ligne:        #DDD9CF;
  --blanc:        #FFFFFF;
  --texte-sec:    #3D4A55;
  /* Sur fond encre — 7,9:1 et 5,3:1, AA tous deux (les rgba() précédentes
     tombaient à 2,5:1). */
  --sur-encre:      #A8B4BE;
  --sur-encre-bas:  #8794A0;
  --filet-encre:    rgba(246,245,241,.16);
  --font-d: 'Archivo', sans-serif;
  --font-b: 'IBM Plex Sans', sans-serif;
  --font-ar: 'IBM Plex Sans Arabic', sans-serif;
  --font-m: 'IBM Plex Mono', monospace;
  --r-sm:10px; --r-md:14px; --r-lg:18px;
}
.qayed-landing,.qayed-landing *,.qayed-landing *::before,.qayed-landing *::after{box-sizing:border-box;margin:0;padding:0}
.qayed-landing{font-family:var(--font-b);background:var(--papier);color:var(--encre);font-size:16px;line-height:1.6;overflow-x:hidden}

/* FOCUS — visible partout, y compris sur les sections encre. */
.qayed-landing a:focus-visible,.qayed-landing button:focus-visible,.qayed-landing summary:focus-visible{outline:2px solid var(--cachet);outline-offset:3px;border-radius:3px}
.qayed-landing .on-encre a:focus-visible,.qayed-landing .on-encre button:focus-visible{outline-color:var(--cachet-sombre)}

/* NAV */
.qayed-landing nav{position:fixed;top:0;width:100%;z-index:200;background:rgba(246,245,241,0.94);backdrop-filter:blur(14px);border-bottom:1px solid transparent;transition:border-color .3s}
.qayed-landing nav.scrolled{border-color:var(--ligne)}
.qayed-landing .nav-inner{max-width:1100px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
.qayed-landing .nav-logo{display:flex;align-items:center;gap:14px;text-decoration:none}
.qayed-landing .nav-stamp{width:38px;height:38px;border:2.5px solid var(--cachet);border-radius:9px;display:flex;align-items:center;justify-content:center;transform:rotate(-6deg)}
.qayed-landing .nav-stamp span{font-family:var(--font-ar);font-weight:700;font-size:18px;color:var(--cachet);line-height:1}
.qayed-landing .nav-wordmark{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:22px;letter-spacing:-.01em;color:var(--encre)}
/* nowrap + libellés compacts : à 1440 px, « Comment ça marche » repassait à la
   ligne et la barre se chevauchait. */
.qayed-landing .nav-links{display:flex;align-items:center;gap:22px;list-style:none;flex-wrap:nowrap}
.qayed-landing .nav-links a{font-size:14px;font-weight:500;color:var(--texte-sec);text-decoration:none;white-space:nowrap;transition:color .2s}
.qayed-landing .nav-links a:hover{color:var(--cachet)}
.qayed-landing .nav-login{background:transparent;color:var(--cachet)!important;padding:9px 15px;border-radius:var(--r-sm);font-weight:600!important;border:1.5px solid var(--cachet-dilue)!important;transition:border-color .2s!important,background .2s!important}
.qayed-landing .nav-login:hover{background:var(--cachet-dilue)!important;border-color:var(--cachet)!important}
.qayed-landing .nav-cta{background:var(--cachet)!important;color:#fff!important;padding:9px 17px;border-radius:var(--r-sm);font-weight:600!important}
.qayed-landing .nav-cta:hover{background:var(--cachet-fonce)!important}

/* BURGER + MOBILE MENU */
.qayed-landing .burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:40px;height:40px;background:transparent;border:none;cursor:pointer;padding:8px;z-index:300}
.qayed-landing .burger span{display:block;width:100%;height:2px;background:var(--encre);border-radius:2px;transition:transform .25s,opacity .25s}
.qayed-landing .burger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.qayed-landing .burger.open span:nth-child(2){opacity:0}
.qayed-landing .burger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.qayed-landing .mobile-menu{display:none;flex-direction:column;background:var(--papier);border-bottom:1px solid var(--ligne);padding:12px 20px 20px}
.qayed-landing .mobile-menu.open{display:flex}
/* :not(.btn) — sinon cette règle l'emportait sur .btn-primary et le bouton
   « Essayer gratuitement » du menu mobile s'affichait en encre sur violet
   (2,2:1). */
.qayed-landing .mobile-menu a:not(.btn){padding:14px 4px;font-size:16px;font-weight:500;color:var(--encre);text-decoration:none;border-bottom:1px solid var(--ligne)}
.qayed-landing .mobile-menu a:not(.btn):last-of-type{border-bottom:none}
.qayed-landing .mobile-menu-actions{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.qayed-landing .mobile-menu-actions a{border-bottom:none!important;padding:12px!important}

/* HERO — plein papier d'en-tête : encre, filet, beaucoup d'air. */
.qayed-landing .hero{background:var(--encre);position:relative;overflow:hidden;padding:148px 40px 96px}
.qayed-landing .hero-inner{max-width:1100px;margin:0 auto;width:100%;position:relative;z-index:2;display:grid;grid-template-columns:1.28fr .72fr;gap:64px;align-items:center}
.qayed-landing .hero-eyebrow{font-family:var(--font-m);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--cachet-sombre);display:flex;align-items:center;gap:12px;margin-bottom:30px}
.qayed-landing .hero-eyebrow::before{content:'';width:26px;height:1px;background:var(--cachet-sombre);flex-shrink:0}
.qayed-landing .hero-h1{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:clamp(40px,4.5vw,62px);line-height:1;letter-spacing:-.025em;color:var(--papier);margin-bottom:24px}
.qayed-landing .hero-h1 em{font-style:normal;color:var(--cachet-sombre)}
/* dir=rtl porté par l'élément : sans cette règle, text-align:start le
   plaquerait à droite au milieu d'une page française. */
.qayed-landing .hero-ar{font-family:var(--font-ar);font-weight:500;font-size:18px;text-align:left;color:var(--sur-encre-bas);margin-bottom:26px}
[dir='rtl'] .qayed-landing .hero-ar{text-align:right}
.qayed-landing .hero-desc{font-size:17px;color:var(--sur-encre);max-width:46ch;line-height:1.7;margin-bottom:38px}
.qayed-landing .hero-actions{display:flex;gap:14px;flex-wrap:wrap}

/* Boutons */
.qayed-landing .btn{display:inline-flex;align-items:center;gap:8px;border-radius:var(--r-sm);font-family:var(--font-b);font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
.qayed-landing .btn-primary{background:var(--cachet);color:#fff;padding:13px 26px;font-size:15px}
.qayed-landing .btn-primary:hover{background:var(--cachet-fonce)}
.qayed-landing .btn-ghost-dark{background:transparent;color:var(--papier);padding:13px 26px;font-size:15px;border:1.5px solid rgba(246,245,241,.28)}
.qayed-landing .btn-ghost-dark:hover{border-color:var(--papier)}
.qayed-landing .btn-ghost{background:transparent;color:var(--cachet);padding:12px 22px;font-size:15px;border:1.5px solid var(--cachet-dilue)}
.qayed-landing .btn-ghost:hover{border-color:var(--cachet)}
.qayed-landing .btn-white{background:var(--papier);color:var(--cachet);padding:14px 30px;font-size:16px}
.qayed-landing .btn-white:hover{background:#fff}
.qayed-landing .btn-full{width:100%;justify-content:center}

/* SECTIONS */
.qayed-landing .section{padding:104px 40px}
.qayed-landing .section-alt{background:var(--blanc)}
.qayed-landing .wrap{max-width:1100px;margin:0 auto}
.qayed-landing .wrap-text{max-width:760px}
.qayed-landing .eyebrow{font-family:var(--font-m);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--cachet);margin-bottom:16px;display:flex;align-items:center;gap:12px}
.qayed-landing .eyebrow::before{content:'';width:26px;height:1px;background:var(--cachet);flex-shrink:0}
.qayed-landing .section-h2{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:800;font-size:clamp(28px,3.6vw,42px);line-height:1.06;letter-spacing:-.02em;margin-bottom:16px;max-width:20ch}
.qayed-landing .section-lead{font-size:17px;color:var(--texte-sec);max-width:62ch;line-height:1.7;margin-bottom:44px}

/* BANDE DE CONFIANCE — mentions au filet, pas de pastille. */
.qayed-landing .trust-bar{border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne);background:var(--blanc);padding:16px 40px;display:flex;align-items:stretch;justify-content:center;flex-wrap:wrap}
.qayed-landing .trust-item{font-family:var(--font-m);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--texte-sec);padding:6px 20px;display:flex;align-items:center}
.qayed-landing .trust-divider{width:1px;background:var(--ligne);margin:4px 0}

/* CHIFFRES (bloc conservé pour l'éditeur — filets, pas de carte) */
.qayed-landing .stats-bar{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne)}
.qayed-landing .stat-cell{padding:32px 24px;border-inline-end:1px solid var(--ligne)}
.qayed-landing .stat-cell:last-child{border-inline-end:none}
.qayed-landing .stat-num{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:44px;line-height:1;letter-spacing:-.02em;color:var(--encre);margin-bottom:10px}
.qayed-landing .stat-num sup{font-size:20px;color:var(--cachet)}
.qayed-landing .stat-label{font-size:13px;color:var(--texte-sec);line-height:1.5}

/* LISTE NUMÉROTÉE — « comment ça marche » : 01 / 02 / 03 au filet. */
.qayed-landing .num-list{border-top:1px solid var(--ligne)}
.qayed-landing .num-item{display:grid;grid-template-columns:auto 1fr;gap:28px;padding:26px 0;border-bottom:1px solid var(--ligne)}
.qayed-landing .num-idx{font-family:var(--font-m);font-size:12px;font-weight:500;letter-spacing:.14em;color:var(--cachet);padding-top:5px}
.qayed-landing .num-title{font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:18px;line-height:1.3;margin-bottom:7px}
.qayed-landing .num-text{font-size:15px;color:var(--texte-sec);line-height:1.7;max-width:56ch}
.qayed-landing .flow-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:72px;align-items:start}

/* LISTE DÉFINITIONS — fonctionnalités / cibles, deux colonnes, sans carte. */
.qayed-landing .def-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:56px;border-top:1px solid var(--ligne)}
.qayed-landing .def-grid.one-col{grid-template-columns:1fr}
.qayed-landing .def-item{padding:20px 0;border-bottom:1px solid var(--ligne)}
.qayed-landing .def-title{font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:16px;margin-bottom:5px}
.qayed-landing .def-text{font-size:14px;color:var(--texte-sec);line-height:1.65}
.qayed-landing .def-note{margin-top:26px;font-size:14px;color:var(--texte-sec);line-height:1.7;border-inline-start:2px solid var(--cachet);padding-inline-start:16px;max-width:68ch}

/* CONFORMITÉ — section encre, deux points numérotés, aucune maquette. */
.qayed-landing .conf{background:var(--encre);padding:104px 40px}
.qayed-landing .conf-grid{display:grid;grid-template-columns:minmax(0,.85fr) 1.15fr;gap:72px;align-items:start}
.qayed-landing .conf h2{color:var(--papier)}
.qayed-landing .conf-lead{font-size:16px;color:var(--sur-encre);line-height:1.7;max-width:44ch}
.qayed-landing .conf-list{border-top:1px solid var(--filet-encre)}
.qayed-landing .conf-item{display:grid;grid-template-columns:auto 1fr;gap:26px;padding:28px 0;border-bottom:1px solid var(--filet-encre)}
.qayed-landing .conf-idx{font-family:var(--font-m);font-size:12px;font-weight:500;letter-spacing:.14em;color:var(--cachet-sombre);padding-top:4px}
.qayed-landing .conf-title{font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:18px;color:var(--papier);margin-bottom:8px}
.qayed-landing .conf-text{font-size:15px;color:var(--sur-encre);line-height:1.75}
.qayed-landing .conf-note{margin-top:28px;font-size:14px;color:var(--sur-encre-bas);line-height:1.7;border-inline-start:2px solid var(--cachet-sombre);padding-inline-start:16px}

/* VITRINE FICHE */
.qayed-landing .fiche-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.qayed-landing .fiche-card{background:var(--blanc);border:1px solid var(--ligne);overflow:hidden}
.qayed-landing .fiche-head{background:var(--encre);padding:15px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.qayed-landing .fiche-head-title{font-family:var(--font-d);font-weight:800;font-variation-settings:'wdth' 115;font-size:14px;color:var(--papier)}
.qayed-landing .fiche-head-num{font-family:var(--font-m);font-size:12px;color:var(--cachet-sombre)}
.qayed-landing .fiche-row{display:flex;border-bottom:1px solid var(--ligne);font-size:14px}
.qayed-landing .fiche-row:last-child{border-bottom:none}
.qayed-landing .fiche-k{width:150px;flex-shrink:0;padding:11px 18px;color:var(--fiche);font-family:var(--font-m);font-size:11px;letter-spacing:.06em;text-transform:uppercase;border-inline-end:1px solid var(--ligne)}
.qayed-landing .fiche-v{padding:11px 18px;color:var(--encre);font-weight:500;flex:1}
.qayed-landing .fiche-v.mono{font-family:var(--font-m);font-size:12px}
.qayed-landing .badge{display:inline-flex;align-items:center;gap:7px;padding:3px 10px;font-family:var(--font-m);font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;border:1px solid currentColor}
.qayed-landing .badge .dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
.qayed-landing .b-ok{color:var(--conforme-txt)}
.qayed-landing .b-wait{color:var(--cachet)}
.qayed-landing .b-done{color:var(--fiche)}

/* MAQUETTE TÉLÉPHONE (hero) */
.qayed-landing .hero-right{display:flex;align-items:center;justify-content:center}
.qayed-landing .phone-wrap{position:relative;width:264px}
.qayed-landing .phone-frame{background:#0A1720;border:1px solid rgba(246,245,241,.14);border-radius:26px;padding:10px}
.qayed-landing .phone-screen{background:var(--papier);border-radius:18px;overflow:hidden}
.qayed-landing .phone-topbar{background:var(--blanc);padding:11px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--ligne)}
.qayed-landing .phone-logo{width:26px;height:26px;border:2px solid var(--cachet);border-radius:6px;display:flex;align-items:center;justify-content:center;transform:rotate(-6deg);flex-shrink:0}
.qayed-landing .phone-logo span{font-family:var(--font-ar);font-weight:700;font-size:11px;color:var(--cachet)}
.qayed-landing .phone-property{font-size:12px;font-weight:600;color:var(--encre)}
.qayed-landing .phone-sub{font-family:var(--font-m);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--fiche);margin-top:2px}
.qayed-landing .phone-body{padding:14px}
.qayed-landing .phone-steps{display:flex;gap:6px;margin-bottom:16px}
.qayed-landing .phone-steps span{flex:1;height:2px;background:var(--ligne)}
.qayed-landing .phone-steps span.done{background:var(--cachet)}
.qayed-landing .phone-label{font-family:var(--font-m);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--fiche);margin-bottom:4px}
.qayed-landing .phone-value{background:var(--blanc);border:1px solid var(--ligne);padding:7px 10px;font-size:12px;font-weight:600;color:var(--encre);margin-bottom:10px}
.qayed-landing .phone-value.mono{font-family:var(--font-m);font-weight:500}
.qayed-landing .phone-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.qayed-landing .phone-read{font-family:var(--font-m);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--conforme-txt);border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne);padding:8px 0;margin-bottom:14px}
.qayed-landing .phone-cta{background:var(--cachet);color:#fff;padding:10px;text-align:center;font-size:12px;font-weight:600}

/* ÉCRAN DE VALIDATION (une seule maquette pour « comment ça marche ») */
.qayed-landing .flow-screen{background:var(--blanc);border:1px solid var(--ligne)}
.qayed-landing .flow-screen-head{background:var(--encre);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.qayed-landing .fsh-title{font-family:var(--font-d);font-weight:800;font-variation-settings:'wdth' 115;font-size:13px;color:var(--papier)}
.qayed-landing .fsh-step{font-family:var(--font-m);font-size:11px;color:var(--cachet-sombre);white-space:nowrap}
.qayed-landing .flow-screen-body{padding:18px}
.qayed-landing .val-success{border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne);padding:12px 0;margin-bottom:16px;font-family:var(--font-m);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--conforme-txt)}
.qayed-landing .val-traveler{border:1px solid var(--ligne);margin-bottom:10px}
.qayed-landing .val-t-head{background:var(--papier);padding:9px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--ligne)}
.qayed-landing .val-t-name{font-size:13px;font-weight:700;color:var(--encre)}
.qayed-landing .val-t-role{font-size:10px;color:var(--cachet);font-family:var(--font-m);letter-spacing:.1em;text-transform:uppercase}
.qayed-landing .val-t-row{display:flex;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px solid var(--ligne);font-size:12px}
.qayed-landing .val-t-row:last-child{border-bottom:none}
.qayed-landing .val-t-k{color:var(--fiche)}
.qayed-landing .val-t-v{font-weight:600;color:var(--encre)}
.qayed-landing .val-t-v.mono{font-family:var(--font-m);font-size:11px}

/* TARIFS */
.qayed-landing .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne)}
.qayed-landing .pricing-card{background:transparent;border-inline-end:1px solid var(--ligne);padding:34px 30px;position:relative;display:flex;flex-direction:column}
.qayed-landing .pricing-card:last-child{border-inline-end:none}
.qayed-landing .pricing-card.featured{background:var(--blanc)}
.qayed-landing .pricing-pill{font-family:var(--font-m);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--cachet);margin-bottom:12px}
.qayed-landing .pricing-tier{font-family:var(--font-m);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--fiche);margin-bottom:8px}
.qayed-landing .pricing-name{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:24px;margin-bottom:8px}
.qayed-landing .pricing-tagline{font-size:14px;color:var(--texte-sec);margin-bottom:22px;line-height:1.6;min-height:44px}
.qayed-landing .pricing-sep{height:1px;background:var(--ligne);margin-bottom:20px}
.qayed-landing .price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}
.qayed-landing .price-num{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:40px;letter-spacing:-.02em;line-height:1}
.qayed-landing .price-cur{font-size:16px;color:var(--fiche)}
.qayed-landing .price-per{font-size:13px;color:var(--fiche);margin-bottom:20px}
.qayed-landing .price-was{font-size:13px;color:var(--fiche);text-decoration:line-through;margin-inline-start:6px}
.qayed-landing .pricing-toggle{display:flex;justify-content:center;gap:0;margin:0 auto 44px;border:1px solid var(--ligne);width:fit-content}
.qayed-landing .pt-btn{border:0;background:transparent;font-family:var(--font-b);font-size:14px;font-weight:600;color:var(--texte-sec);padding:10px 22px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .2s,color .2s}
.qayed-landing .pt-btn.active{background:var(--encre);color:var(--papier)}
.qayed-landing .pt-badge{font-family:var(--font-m);font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--conforme-txt)}
.qayed-landing .pt-btn.active .pt-badge{color:var(--cachet-sombre)}
/* Puce « inclus » : filet fin, jamais un glyphe. */
.qayed-landing .feat-list{list-style:none;display:flex;flex-direction:column;gap:11px;margin-bottom:26px;flex:1}
.qayed-landing .feat-list li{display:flex;align-items:flex-start;gap:12px;font-size:14px;color:var(--texte-sec);line-height:1.5}
.qayed-landing .feat-list li::before{content:'';width:12px;height:1px;background:var(--conforme);flex-shrink:0;margin-top:11px}
.qayed-landing .feat-list li.off{color:var(--fiche)}
.qayed-landing .feat-list li.off::before{background:var(--ligne)}

/* BANDE CTA */
.qayed-landing .cta-band{background:var(--encre);padding:96px 40px;text-align:center}
.qayed-landing .cta-h2{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:clamp(30px,4.4vw,52px);line-height:1.04;letter-spacing:-.025em;color:var(--papier);margin-bottom:18px}
.qayed-landing .cta-sub{font-size:17px;color:var(--sur-encre);margin:0 auto 36px;max-width:52ch}
.qayed-landing .cta-meta{margin-top:22px;font-family:var(--font-m);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--sur-encre-bas)}

/* FAQ */
.qayed-landing .faq-item{border-bottom:1px solid var(--ligne);padding:18px 2px}
.qayed-landing .faq-item summary{cursor:pointer;font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:16px;list-style:none}
.qayed-landing .faq-item summary::-webkit-details-marker{display:none}
.qayed-landing .faq-item p{margin-top:10px;font-size:15px;color:var(--texte-sec);line-height:1.7;max-width:70ch}

/* FOOTER */
.qayed-landing footer{background:var(--encre);padding:64px 40px 36px}
.qayed-landing .footer-inner{max-width:1100px;margin:0 auto}
.qayed-landing .footer-top{display:grid;grid-template-columns:2fr 1fr 1fr;gap:56px;padding-bottom:44px;border-bottom:1px solid var(--filet-encre)}
.qayed-landing .footer-logo-row{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.qayed-landing .footer-stamp{width:40px;height:40px;border:2.5px solid var(--cachet-sombre);border-radius:9px;display:flex;align-items:center;justify-content:center;transform:rotate(-6deg);flex-shrink:0}
.qayed-landing .footer-stamp span{font-family:var(--font-ar);font-weight:700;font-size:19px;color:var(--cachet-sombre)}
.qayed-landing .footer-wm{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:24px;color:var(--papier);letter-spacing:-.01em}
.qayed-landing .footer-tagline{font-family:var(--font-ar);font-size:13px;direction:rtl;text-align:left;color:var(--sur-encre-bas);margin-bottom:16px}
[dir='rtl'] .qayed-landing .footer-tagline{text-align:right}
.qayed-landing .footer-desc{font-size:14px;color:var(--sur-encre);line-height:1.7;max-width:34ch}
.qayed-landing .footer-col h4{font-family:var(--font-m);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--sur-encre-bas);margin-bottom:16px}
.qayed-landing .footer-col ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.qayed-landing .footer-col ul a{font-size:14px;color:var(--sur-encre);text-decoration:none;transition:color .2s}
.qayed-landing .footer-col ul a:hover{color:var(--papier)}
.qayed-landing .footer-bottom{padding-top:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.qayed-landing .footer-legal{font-family:var(--font-m);font-size:11px;letter-spacing:.12em;color:var(--sur-encre-bas)}

/* APPARITION AU DÉFILEMENT — CSS seul, aucune librairie.
   L'état masqué n'est appliqué QUE si le script a posé .anim-ready : sans JS,
   ou si l'IntersectionObserver ne démarre pas, le contenu reste lisible au
   lieu de disparaître. */
.qayed-landing.anim-ready .fade-in{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}
.qayed-landing.anim-ready .fade-in.visible{opacity:1;transform:none}

/* RESPONSIVE */
@media(max-width:960px){
  .qayed-landing .nav-links{display:none}
  .qayed-landing .burger{display:flex}
  .qayed-landing .nav-inner{padding:0 20px}
  .qayed-landing .hero{padding:116px 20px 72px}
  .qayed-landing .hero-inner{grid-template-columns:1fr;gap:48px}
  .qayed-landing .hero-right{display:none}
  .qayed-landing .trust-bar{padding:12px 20px;flex-direction:column;align-items:flex-start}
  .qayed-landing .trust-item{padding:6px 0}
  .qayed-landing .trust-divider{display:none}
  .qayed-landing .stats-bar{grid-template-columns:repeat(2,1fr)}
  .qayed-landing .stat-cell:nth-child(2n){border-inline-end:none}
  .qayed-landing .stat-cell:nth-child(n+3){border-top:1px solid var(--ligne)}
  .qayed-landing .section,.qayed-landing .conf{padding:72px 20px}
  .qayed-landing .flow-grid,.qayed-landing .conf-grid,.qayed-landing .fiche-grid{grid-template-columns:1fr;gap:44px}
  .qayed-landing .def-grid{grid-template-columns:1fr}
  .qayed-landing .pricing-grid{grid-template-columns:1fr;max-width:480px;margin:0 auto}
  .qayed-landing .pricing-card{border-inline-end:none;border-bottom:1px solid var(--ligne)}
  .qayed-landing .pricing-card:last-child{border-bottom:none}
  .qayed-landing .pricing-card.featured{order:-1}
  .qayed-landing .pricing-tagline{min-height:0}
  .qayed-landing .footer-top{grid-template-columns:1fr 1fr;gap:32px}
  .qayed-landing .footer-bottom{flex-direction:column;align-items:flex-start;gap:16px}
}

@media(max-width:600px){
  .qayed-landing .nav-inner{padding:0 16px}
  .qayed-landing .nav-logo .nav-wordmark{font-size:18px}
  .qayed-landing .hero{padding:104px 16px 64px}
  .qayed-landing .hero-desc{font-size:16px}
  .qayed-landing .hero-actions{flex-direction:column;align-items:stretch}
  .qayed-landing .hero-actions a{justify-content:center}
  .qayed-landing .section,.qayed-landing .conf{padding:64px 16px}
  .qayed-landing .num-item,.qayed-landing .conf-item{gap:18px}
  .qayed-landing .stats-bar{grid-template-columns:1fr 1fr}
  .qayed-landing .stat-num{font-size:34px}
  .qayed-landing .fiche-k{width:112px;font-size:10px;padding:10px 12px}
  .qayed-landing .fiche-v{padding:10px 12px;font-size:13px}
  .qayed-landing .pricing-grid{max-width:100%}
  .qayed-landing .pricing-card{padding:26px 20px}
  .qayed-landing .footer-top{grid-template-columns:1fr}
  .qayed-landing .footer-desc{max-width:100%}
  .qayed-landing footer{padding:48px 16px 32px}
  .qayed-landing .cta-band{padding:64px 16px}
  .qayed-landing .btn-white{width:100%;justify-content:center}
}

@media(prefers-reduced-motion:reduce){
  .qayed-landing *,.qayed-landing *::before,.qayed-landing *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
  .qayed-landing.anim-ready .fade-in{opacity:1;transform:none}
}

/* ── Sélecteur de langue (navbar publique) ─────────────────────────────── */
.qayed-landing .lang-switch{position:relative}
.qayed-landing .lang-btn{display:flex;align-items:center;gap:7px;background:transparent;border:1.5px solid var(--cachet-dilue);color:var(--cachet);font-family:var(--font-b);font-size:13px;font-weight:600;letter-spacing:.02em;padding:9px 13px;border-radius:var(--r-sm);cursor:pointer;transition:border-color .2s,background .2s;line-height:1}
.qayed-landing .lang-btn:hover{background:var(--cachet-dilue);border-color:var(--cachet)}
.qayed-landing .lang-btn svg{display:block}
.qayed-landing .lang-menu{position:absolute;top:calc(100% + 10px);inset-inline-end:0;background:var(--blanc);border:1px solid var(--ligne);box-shadow:0 12px 40px rgba(16,34,46,.14);padding:6px;min-width:168px;z-index:300}
.qayed-landing .lang-opt{display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%;background:transparent;border:0;padding:9px 12px;font-family:var(--font-b);font-size:14px;font-weight:500;color:var(--texte-sec);cursor:pointer;text-align:start;transition:background .15s}
.qayed-landing .lang-opt:hover{background:var(--papier)}
.qayed-landing .lang-opt.active{color:var(--cachet);font-weight:700;background:var(--cachet-dilue)}
.qayed-landing .lang-code{font-family:var(--font-m);font-size:10px;color:var(--fiche);letter-spacing:.1em}
.qayed-landing .lang-opt.active .lang-code{color:var(--cachet)}
.qayed-landing .mobile-menu .lang-switch{display:flex;justify-content:center;padding:4px 0 10px}
.qayed-landing .mobile-menu .lang-menu{inset-inline-end:auto;inset-inline-start:50%;transform:translateX(-50%)}
[dir='rtl'] .qayed-landing .mobile-menu .lang-menu{transform:translateX(50%)}
`;

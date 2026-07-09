/**
 * Feuille de style du site public (landing + pages CMS) — scopée sous
 * .qayed-landing pour ne jamais fuir dans les portails applicatifs.
 * Injectée via <style> JSX (pas un import .css) pour être démontée avec les
 * composants qui la consomment.
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
  --fiche:        #8A94A0;
  --ligne:        #DDD9CF;
  --blanc:        #FFFFFF;
  --texte-sec:    #3d4a55;
  --font-d: 'Archivo', sans-serif;
  --font-b: 'IBM Plex Sans', sans-serif;
  --font-ar: 'IBM Plex Sans Arabic', sans-serif;
  --font-m: 'IBM Plex Mono', monospace;
  --r-sm:10px; --r-md:14px; --r-lg:18px;
}
.qayed-landing,.qayed-landing *,.qayed-landing *::before,.qayed-landing *::after{box-sizing:border-box;margin:0;padding:0}
.qayed-landing{font-family:var(--font-b);background:var(--papier);color:var(--encre);font-size:16px;line-height:1.6;overflow-x:hidden}

/* NAV */
.qayed-landing nav{position:fixed;top:0;width:100%;z-index:200;background:rgba(246,245,241,0.94);backdrop-filter:blur(14px);border-bottom:1px solid transparent;transition:border-color .3s}
.qayed-landing nav.scrolled{border-color:var(--ligne)}
.qayed-landing .nav-inner{max-width:1100px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
.qayed-landing .nav-logo{display:flex;align-items:center;gap:14px;text-decoration:none}
.qayed-landing .nav-stamp{width:38px;height:38px;border:2.5px solid var(--cachet);border-radius:9px;display:flex;align-items:center;justify-content:center;transform:rotate(-6deg);transition:transform .3s}
.qayed-landing .nav-logo:hover .nav-stamp{transform:rotate(-6deg) scale(1.1)}
.qayed-landing .nav-stamp span{font-family:var(--font-ar);font-weight:700;font-size:18px;color:var(--cachet);line-height:1}
.qayed-landing .nav-wordmark{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:22px;letter-spacing:-.01em;color:var(--encre)}
.qayed-landing .nav-links{display:flex;align-items:center;gap:28px;list-style:none}
.qayed-landing .nav-links a{font-size:14px;font-weight:500;color:var(--texte-sec);text-decoration:none;transition:color .2s}
.qayed-landing .nav-links a:hover{color:var(--cachet)}
.qayed-landing .nav-login{background:transparent;color:var(--cachet)!important;padding:10px 18px;border-radius:var(--r-sm);font-weight:600!important;border:1.5px solid var(--cachet-dilue)!important;transition:border-color .2s!important,background .2s!important}
.qayed-landing .nav-login:hover{background:var(--cachet-dilue)!important;border-color:var(--cachet)!important}
.qayed-landing .nav-cta{background:var(--cachet)!important;color:#fff!important;padding:10px 22px;border-radius:var(--r-sm);font-weight:600!important}
.qayed-landing .nav-cta:hover{background:var(--cachet-fonce)!important}

/* BURGER + MOBILE MENU */
.qayed-landing .burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:40px;height:40px;background:transparent;border:none;cursor:pointer;padding:8px;z-index:300}
.qayed-landing .burger span{display:block;width:100%;height:2px;background:var(--encre);border-radius:2px;transition:transform .25s,opacity .25s}
.qayed-landing .burger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.qayed-landing .burger.open span:nth-child(2){opacity:0}
.qayed-landing .burger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.qayed-landing .mobile-menu{display:none;flex-direction:column;background:var(--papier);border-bottom:1px solid var(--ligne);padding:12px 20px 20px}
.qayed-landing .mobile-menu.open{display:flex}
.qayed-landing .mobile-menu a{padding:14px 4px;font-size:16px;font-weight:500;color:var(--encre);text-decoration:none;border-bottom:1px solid var(--ligne)}
.qayed-landing .mobile-menu a:last-of-type{border-bottom:none}
.qayed-landing .mobile-menu-actions{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.qayed-landing .mobile-menu-actions a{border-bottom:none!important;padding:12px!important}

/* HERO */
.qayed-landing .hero{min-height:100vh;background:var(--encre);position:relative;overflow:hidden;display:flex;align-items:center;padding:80px 40px 0}
.qayed-landing .reg-lines{display:none}
.qayed-landing .hero-glow{position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(83,70,168,.22) 0%,transparent 65%);pointer-events:none}
.qayed-landing .hero-inner{max-width:1100px;margin:0 auto;width:100%;position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;padding-bottom:100px}

.qayed-landing .hero-eyebrow{font-family:var(--font-m);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--cachet-sombre);display:flex;align-items:center;gap:12px;margin-bottom:28px;opacity:0;animation:qLandFadeUp .6s .3s forwards}
.qayed-landing .hero-eyebrow::before{content:'';width:26px;height:1px;background:var(--cachet-sombre)}
.qayed-landing .hero-h1{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:clamp(46px,6vw,82px);line-height:.95;letter-spacing:-.025em;color:var(--papier);margin-bottom:28px;opacity:0;animation:qLandFadeUp .7s .5s forwards}
.qayed-landing .hero-h1 em{font-style:normal;color:var(--cachet-sombre)}
.qayed-landing .hero-ar{font-family:var(--font-ar);font-weight:700;font-size:19px;direction:rtl;text-align:right;color:rgba(246,245,241,.38);margin-bottom:28px;opacity:0;animation:qLandFadeUp .6s .7s forwards}
.qayed-landing .hero-desc{font-size:17px;color:#9BA8B3;max-width:480px;line-height:1.65;margin-bottom:40px;opacity:0;animation:qLandFadeUp .6s .8s forwards}
.qayed-landing .hero-actions{display:flex;gap:14px;flex-wrap:wrap;opacity:0;animation:qLandFadeUp .6s 1s forwards}

/* Buttons */
.qayed-landing .btn{display:inline-flex;align-items:center;gap:8px;border-radius:var(--r-sm);font-family:var(--font-b);font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:background .2s,transform .15s,border-color .2s}
.qayed-landing .btn-primary{background:var(--cachet);color:#fff;padding:13px 26px;font-size:15px}
.qayed-landing .btn-primary:hover{background:var(--cachet-fonce);transform:translateY(-1px)}
.qayed-landing .btn-ghost-dark{background:transparent;color:var(--papier);padding:13px 26px;font-size:15px;border:1.5px solid rgba(246,245,241,.2)}
.qayed-landing .btn-ghost-dark:hover{border-color:rgba(246,245,241,.5)}
.qayed-landing .btn-ghost{background:var(--cachet-dilue);color:var(--cachet);padding:12px 22px;font-size:15px}
.qayed-landing .btn-ghost:hover{background:#ddd8f5}
.qayed-landing .btn-white{background:#fff;color:var(--cachet);padding:14px 30px;font-size:16px}
.qayed-landing .btn-white:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,34,46,.2)}
.qayed-landing .btn-full{width:100%;justify-content:center}

/* Hero right — phone mockup */
.qayed-landing .hero-right{display:flex;align-items:center;justify-content:center;opacity:0;animation:qLandFadeIn .8s 1.2s forwards}
.qayed-landing .phone-wrap{position:relative;width:260px}
.qayed-landing .phone-frame{background:#1a1a2e;border-radius:36px;padding:12px;box-shadow:0 40px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06);position:relative;overflow:hidden}
.qayed-landing .phone-screen{background:var(--papier);border-radius:26px;overflow:hidden;min-height:520px;position:relative}
.qayed-landing .phone-topbar{background:var(--blanc);padding:10px 16px 8px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--ligne)}
.qayed-landing .phone-logo{width:26px;height:26px;border:2px solid var(--cachet);border-radius:6px;display:flex;align-items:center;justify-content:center;transform:rotate(-6deg)}
.qayed-landing .phone-logo span{font-family:var(--font-ar);font-weight:700;font-size:11px;color:var(--cachet)}
.qayed-landing .phone-property{font-size:11px;font-weight:600;color:var(--encre)}
.qayed-landing .phone-sub{font-size:9px;color:var(--fiche)}

/* Floating badge */
.qayed-landing .float-badge{position:absolute;right:-30px;top:80px;background:#fff;border:1px solid var(--ligne);border-radius:12px;padding:10px 14px;box-shadow:0 4px 24px rgba(16,34,46,.15);white-space:nowrap}
.qayed-landing .fb-label{font-family:var(--font-m);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--fiche);margin-bottom:4px}
.qayed-landing .fb-val{font-size:13px;font-weight:700;color:var(--conforme)}
.qayed-landing .float-badge2{position:absolute;left:-40px;bottom:120px;background:#fff;border:1px solid var(--ligne);border-radius:12px;padding:10px 14px;box-shadow:0 4px 24px rgba(16,34,46,.15);white-space:nowrap}

/* WAVE */
.qayed-landing .wave{display:block;width:100%;background:var(--encre);line-height:0}
.qayed-landing .wave svg{display:block;width:100%}

/* SECTIONS */
.qayed-landing .section{padding:96px 40px}
.qayed-landing .section-alt{background:var(--blanc)}
.qayed-landing .wrap{max-width:1100px;margin:0 auto}
.qayed-landing .eyebrow{font-family:var(--font-m);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--cachet);margin-bottom:14px;display:flex;align-items:center;gap:12px}
.qayed-landing .eyebrow::before{content:'';width:26px;height:1px;background:var(--cachet)}
.qayed-landing .section-h2{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:800;font-size:clamp(28px,4vw,44px);line-height:1.05;letter-spacing:-.015em;margin-bottom:14px}
.qayed-landing .section-lead{font-size:17px;color:var(--texte-sec);max-width:600px;line-height:1.65;margin-bottom:48px}

/* TRUST BAR */
.qayed-landing .trust-bar{border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne);padding:22px 40px;display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;background:var(--blanc)}
.qayed-landing .trust-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--texte-sec);font-weight:500}
.qayed-landing .trust-dot{width:6px;height:6px;border-radius:50%;background:var(--cachet-sombre);flex-shrink:0}
.qayed-landing .trust-divider{width:1px;height:18px;background:var(--ligne)}

/* STATS */
.qayed-landing .stats-bar{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--ligne);border-radius:var(--r-lg);overflow:hidden;background:var(--blanc)}
.qayed-landing .stat-cell{padding:36px 24px;text-align:center;border-right:1px solid var(--ligne);transition:background .2s}
.qayed-landing .stat-cell:last-child{border-right:none}
.qayed-landing .stat-cell:hover{background:var(--cachet-dilue)}
.qayed-landing .stat-num{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:52px;line-height:1;letter-spacing:-.02em;color:var(--cachet);margin-bottom:10px}
.qayed-landing .stat-num sup{font-size:22px}
.qayed-landing .stat-label{font-size:14px;color:var(--texte-sec);line-height:1.4}

/* FLOW */
.qayed-landing .flow-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.qayed-landing .flow-steps{display:flex;flex-direction:column;gap:0}
.qayed-landing .flow-step{display:flex;gap:20px;cursor:pointer;padding:20px 0;border-bottom:1px solid var(--ligne);transition:opacity .2s}
.qayed-landing .flow-step:last-child{border-bottom:none}
.qayed-landing .flow-step.active .fs-num{background:var(--cachet);color:#fff;border-color:var(--cachet)}
.qayed-landing .flow-step.active .fs-title{color:var(--cachet)}
.qayed-landing .fs-num{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--ligne);display:flex;align-items:center;justify-content:center;font-family:var(--font-m);font-size:13px;font-weight:500;color:var(--fiche);flex-shrink:0;transition:background .2s,color .2s,border-color .2s}
.qayed-landing .fs-body{flex:1}
.qayed-landing .fs-title{font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:17px;margin-bottom:6px;transition:color .2s}
.qayed-landing .fs-desc{font-size:14px;color:var(--texte-sec);line-height:1.6}

.qayed-landing .flow-visual{position:relative}
.qayed-landing .flow-screen{display:none;background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);overflow:hidden;box-shadow:0 8px 32px rgba(16,34,46,.08)}
.qayed-landing .flow-screen.active{display:block}
.qayed-landing .flow-screen-head{background:var(--encre);padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
.qayed-landing .fsh-title{font-family:var(--font-d);font-weight:800;font-variation-settings:'wdth' 115;font-size:13px;color:var(--papier)}
.qayed-landing .fsh-step{font-family:var(--font-m);font-size:11px;color:var(--cachet-sombre)}
.qayed-landing .flow-screen-body{padding:20px}
.qayed-landing .fs-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.qayed-landing .fs-field{background:var(--papier);border:1px solid var(--ligne);border-radius:var(--r-sm);padding:10px 14px}
.qayed-landing .fs-field-label{font-family:var(--font-m);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--fiche);margin-bottom:4px}
.qayed-landing .fs-field-val{font-size:14px;color:var(--encre);font-weight:500}
.qayed-landing .fs-field-val.mono{font-family:var(--font-m);font-size:13px}
.qayed-landing .fs-field-full{grid-column:1/-1}
.qayed-landing .counter-row{display:flex;align-items:center;gap:12px}
.qayed-landing .counter-btn{width:28px;height:28px;border-radius:50%;border:1px solid var(--ligne);background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--encre);cursor:pointer}
.qayed-landing .counter-val{font-size:18px;font-weight:700;color:var(--encre);min-width:24px;text-align:center}
.qayed-landing .mrz-zone{border:2px dashed var(--cachet-dilue);border-radius:12px;padding:28px 20px;text-align:center;margin-bottom:16px}
.qayed-landing .mrz-icon{width:52px;height:52px;background:var(--cachet);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px}
.qayed-landing .mrz-hint{font-size:13px;color:var(--fiche);line-height:1.5}
.qayed-landing .mrz-btns{display:flex;flex-direction:column;gap:8px}
.qayed-landing .mrz-btn{padding:12px;border-radius:var(--r-sm);text-align:center;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-b)}
.qayed-landing .mrz-btn-primary{background:var(--cachet);color:#fff}
.qayed-landing .mrz-btn-secondary{background:transparent;border:1.5px solid var(--encre);color:var(--encre)}
.qayed-landing .mrz-btn-ghost{background:transparent;border:1.5px solid var(--ligne);color:var(--texte-sec)}
.qayed-landing .val-success{background:var(--conforme-fond);border-radius:var(--r-sm);padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px}
.qayed-landing .val-success-icon{font-size:20px}
.qayed-landing .val-success-text{font-size:13px;color:var(--conforme-txt);font-weight:600;line-height:1.4}
.qayed-landing .val-traveler{background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-md);overflow:hidden;margin-bottom:10px}
.qayed-landing .val-t-head{background:var(--encre);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
.qayed-landing .val-t-name{font-size:13px;font-weight:700;color:var(--papier)}
.qayed-landing .val-t-role{font-size:10px;color:var(--cachet-sombre);font-family:var(--font-m);letter-spacing:.08em;text-transform:uppercase}
.qayed-landing .val-t-row{display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--ligne);font-size:12px}
.qayed-landing .val-t-row:last-child{border-bottom:none}
.qayed-landing .val-t-k{color:var(--fiche)}
.qayed-landing .val-t-v{font-weight:600;color:var(--encre)}
.qayed-landing .val-t-v.mono{font-family:var(--font-m);font-size:11px}

/* FOR WHO */
.qayed-landing .forqui-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:24px}
.qayed-landing .forqui-card{background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);padding:28px 26px;transition:border-color .2s,transform .2s}
.qayed-landing .forqui-card:hover{border-color:rgba(83,70,168,.3);transform:translateY(-3px)}
.qayed-landing .forqui-icon{font-size:28px;margin-bottom:14px}
.qayed-landing .forqui-card h3{font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:18px;margin-bottom:10px}
.qayed-landing .forqui-card p{font-size:14px;color:var(--texte-sec);line-height:1.6}
.qayed-landing .forqui-note{display:flex;align-items:flex-start;gap:12px;background:var(--cachet-dilue);border-radius:var(--r-md);padding:16px 20px;font-size:14px;color:var(--texte-sec);line-height:1.6}

/* SECURITY BLOCK */
.qayed-landing .sec-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.qayed-landing .fiche-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.qayed-landing .sec-list{list-style:none;display:flex;flex-direction:column;gap:20px}
.qayed-landing .sec-list li{display:flex;align-items:flex-start;gap:14px}
.qayed-landing .sec-icon{font-size:22px;flex-shrink:0;margin-top:2px}
.qayed-landing .sec-list li strong{display:block;font-size:15px;font-weight:600;color:var(--papier);margin-bottom:4px}
.qayed-landing .sec-list li p{font-size:14px;color:#9BA8B3;line-height:1.55}

/* FEATURES */
.qayed-landing .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border:1px solid var(--ligne);border-radius:var(--r-lg);overflow:hidden}
.qayed-landing .feat-card{padding:30px 26px;background:var(--blanc);border-right:1px solid var(--ligne);border-bottom:1px solid var(--ligne);transition:background .2s}
.qayed-landing .feat-card:hover{background:#faf9f8}
.qayed-landing .feat-card:nth-child(3n){border-right:none}
.qayed-landing .feat-card:nth-last-child(-n+3){border-bottom:none}
.qayed-landing .feat-icon{width:46px;height:46px;border-radius:var(--r-sm);background:var(--cachet-dilue);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:18px}
.qayed-landing .feat-card h3{font-family:var(--font-d);font-variation-settings:'wdth' 115;font-weight:800;font-size:17px;margin-bottom:8px}
.qayed-landing .feat-card p{font-size:14px;color:var(--texte-sec);line-height:1.6}

/* FICHE CARD */
.qayed-landing .fiche-card{background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);overflow:hidden;box-shadow:0 2px 0 var(--ligne)}
.qayed-landing .fiche-head{background:var(--encre);padding:16px 22px;display:flex;align-items:center;justify-content:space-between}
.qayed-landing .fiche-head-title{font-family:var(--font-d);font-weight:800;font-variation-settings:'wdth' 115;font-size:15px;color:var(--papier)}
.qayed-landing .fiche-head-num{font-family:var(--font-m);font-size:12px;color:var(--cachet-sombre)}
.qayed-landing .fiche-row{display:flex;border-bottom:1px solid var(--ligne);font-size:14px}
.qayed-landing .fiche-row:last-child{border-bottom:none}
.qayed-landing .fiche-k{width:155px;flex-shrink:0;padding:12px 18px;color:var(--fiche);font-size:12px;background:#faf9f7;border-right:1px solid var(--ligne)}
.qayed-landing .fiche-v{padding:12px 18px;color:var(--encre);font-weight:500;flex:1}
.qayed-landing .fiche-v.mono{font-family:var(--font-m);font-size:12px}
.qayed-landing .badge{display:inline-flex;align-items:center;gap:6px;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600}
.qayed-landing .badge .dot{width:6px;height:6px;border-radius:50%}
.qayed-landing .b-ok{background:var(--conforme-fond);color:var(--conforme-txt)}
.qayed-landing .b-ok .dot{background:var(--conforme)}
.qayed-landing .b-wait{background:var(--cachet-dilue);color:var(--cachet)}
.qayed-landing .b-wait .dot{background:var(--cachet)}

/* PRICING */
.qayed-landing .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.qayed-landing .pricing-card{background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);padding:32px;position:relative;transition:box-shadow .2s,transform .2s}
.qayed-landing .pricing-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(16,34,46,.1)}
.qayed-landing .pricing-card.featured{border-color:var(--cachet);border-width:1.5px;box-shadow:0 0 0 4px var(--cachet-dilue)}
.qayed-landing .pricing-pill{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--cachet);color:#fff;font-size:11px;font-weight:600;padding:5px 14px;border-radius:100px;white-space:nowrap;font-family:var(--font-b)}
.qayed-landing .pricing-tier{font-family:var(--font-m);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--cachet);margin-bottom:8px}
.qayed-landing .pricing-name{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:26px;margin-bottom:8px}
.qayed-landing .pricing-tagline{font-size:14px;color:var(--fiche);margin-bottom:22px;line-height:1.5}
.qayed-landing .pricing-sep{height:1px;background:var(--ligne);margin-bottom:22px}
.qayed-landing .price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}
.qayed-landing .price-num{font-family:var(--font-d);font-variation-settings:'wdth' 118;font-weight:900;font-size:44px;letter-spacing:-.02em;line-height:1}
.qayed-landing .price-cur{font-size:18px;color:var(--fiche)}
.qayed-landing .price-per{font-size:13px;color:var(--fiche);margin-bottom:24px}
.qayed-landing .pricing-toggle{display:flex;justify-content:center;gap:4px;margin:0 auto 40px;background:var(--blanc);border:1px solid var(--ligne);border-radius:100px;padding:5px;width:fit-content}
.qayed-landing .pt-btn{border:0;background:transparent;font-family:var(--font-b);font-size:14px;font-weight:600;color:var(--fiche);padding:9px 20px;border-radius:100px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .2s,color .2s}
.qayed-landing .pt-btn.active{background:var(--cachet);color:#fff}
.qayed-landing .pt-badge{font-size:11px;font-weight:700;background:var(--conforme-fond);color:var(--conforme-txt);padding:3px 8px;border-radius:100px;white-space:nowrap}
.qayed-landing .pt-btn.active .pt-badge{background:rgba(255,255,255,.18);color:#fff}
.qayed-landing .price-was{font-size:14px;color:var(--fiche);text-decoration:line-through;margin-inline-start:6px}
.qayed-landing .feat-list{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
.qayed-landing .feat-list li{display:flex;align-items:flex-start;gap:9px;font-size:14px;color:var(--texte-sec)}
.qayed-landing .feat-list li::before{content:'✓';color:var(--conforme);font-weight:700;flex-shrink:0}
.qayed-landing .feat-list li.off{opacity:.35}
.qayed-landing .feat-list li.off::before{content:'–';color:var(--fiche)}

/* TESTIMONIALS */
.qayed-landing .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.qayed-landing .testi-card{background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-lg);padding:28px}
.qayed-landing .testi-stars{display:flex;gap:2px;margin-bottom:14px}
.qayed-landing .testi-star{color:var(--vigilance);font-size:14px}
.qayed-landing .testi-quote{font-size:15px;color:var(--encre);line-height:1.65;margin-bottom:22px;font-style:italic}
.qayed-landing .testi-quote::before{content:'«\\00a0';color:var(--cachet);font-style:normal}
.qayed-landing .testi-quote::after{content:'\\00a0»';color:var(--cachet);font-style:normal}
.qayed-landing .testi-author{display:flex;align-items:center;gap:12px}
.qayed-landing .testi-av{width:40px;height:40px;border-radius:50%;background:var(--cachet-dilue);display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:900;font-size:15px;color:var(--cachet);flex-shrink:0}
.qayed-landing .testi-name{font-size:14px;font-weight:600;color:var(--encre)}
.qayed-landing .testi-role{font-size:12px;color:var(--fiche);margin-top:2px}

/* CTA BAND */
.qayed-landing .cta-band{background:var(--cachet);padding:80px 40px;text-align:center;position:relative;overflow:hidden}
.qayed-landing .cta-band .wrap{position:relative;z-index:1}
.qayed-landing .cta-h2{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:clamp(32px,5vw,58px);line-height:1;letter-spacing:-.025em;color:#fff;margin-bottom:16px}
.qayed-landing .cta-sub{font-size:17px;color:rgba(255,255,255,.72);margin-bottom:36px;max-width:500px;margin-left:auto;margin-right:auto}
.qayed-landing .cta-meta{margin-top:20px;font-size:12px;color:rgba(255,255,255,.4);font-family:var(--font-m);letter-spacing:.1em}

/* FOOTER */
.qayed-landing footer{background:var(--encre);padding:64px 40px 40px;position:relative;overflow:hidden}
.qayed-landing .footer-inner{max-width:1100px;margin:0 auto;position:relative;z-index:1}
.qayed-landing .footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:56px;padding-bottom:48px;border-bottom:1px solid rgba(246,245,241,.08)}
.qayed-landing .footer-logo-row{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.qayed-landing .footer-stamp{width:40px;height:40px;border:2.5px solid var(--cachet);border-radius:9px;display:flex;align-items:center;justify-content:center;transform:rotate(-6deg);flex-shrink:0}
.qayed-landing .footer-stamp span{font-family:var(--font-ar);font-weight:700;font-size:19px;color:var(--cachet-sombre)}
.qayed-landing .footer-wm{font-family:var(--font-d);font-variation-settings:'wdth' 120;font-weight:900;font-size:24px;color:var(--papier);letter-spacing:-.01em}
.qayed-landing .footer-tagline{font-family:var(--font-ar);font-size:13px;direction:rtl;color:rgba(246,245,241,.32);margin-bottom:16px}
.qayed-landing .footer-desc{font-size:14px;color:rgba(246,245,241,.4);line-height:1.6;max-width:270px}
.qayed-landing .footer-col h4{font-family:var(--font-m);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,245,241,.32);margin-bottom:16px}
.qayed-landing .footer-col ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.qayed-landing .footer-col ul a{font-size:14px;color:rgba(246,245,241,.52);text-decoration:none;transition:color .2s}
.qayed-landing .footer-col ul a:hover{color:var(--papier)}
.qayed-landing .footer-bottom{padding-top:26px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.qayed-landing .footer-legal{font-family:var(--font-m);font-size:11px;letter-spacing:.1em;color:rgba(246,245,241,.26)}

/* ANIMATIONS */
@keyframes qLandFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes qLandFadeIn{from{opacity:0}to{opacity:1}}
.qayed-landing .fade-in{opacity:0;transform:translateY(24px);transition:opacity .65s ease,transform .65s ease}
.qayed-landing .fade-in.visible{opacity:1;transform:none}

/* RESPONSIVE */
@media(max-width:960px){
  .qayed-landing .nav-links{display:none}
  .qayed-landing .burger{display:flex}
  .qayed-landing .nav-inner{padding:0 20px}
  .qayed-landing .hero{padding:80px 20px 0}
  .qayed-landing .hero-inner{grid-template-columns:1fr;gap:40px;padding-bottom:60px}
  .qayed-landing .hero-right{display:none}
  .qayed-landing .hero-h1{font-size:clamp(40px,10vw,60px)}
  .qayed-landing .wave svg{height:32px}
  .qayed-landing .trust-bar{padding:16px 20px;gap:16px;flex-direction:column;align-items:flex-start}
  .qayed-landing .trust-divider{display:none}
  .qayed-landing .stats-bar{grid-template-columns:repeat(2,1fr)}
  .qayed-landing .stat-cell:nth-child(2){border-right:none}
  .qayed-landing .stat-cell:nth-child(3){border-top:1px solid var(--ligne)}
  .qayed-landing .stat-cell:nth-child(4){border-top:1px solid var(--ligne);border-right:none}
  .qayed-landing .stat-num{font-size:40px}
  .qayed-landing .section{padding:64px 20px}
  .qayed-landing .flow-grid{grid-template-columns:1fr;gap:40px}
  .qayed-landing .forqui-grid{grid-template-columns:1fr}
  .qayed-landing .sec-grid{grid-template-columns:1fr;gap:40px}
  .qayed-landing .fiche-grid{grid-template-columns:1fr;gap:32px}
  .qayed-landing .feat-grid{grid-template-columns:1fr}
  .qayed-landing .feat-card{border-right:none!important;border-bottom:1px solid var(--ligne)!important}
  .qayed-landing .feat-card:last-child{border-bottom:none!important}
  .qayed-landing .pricing-grid{grid-template-columns:1fr;max-width:480px;margin-left:auto;margin-right:auto}
  .qayed-landing .pricing-card.featured{order:-1}
  .qayed-landing .testi-grid{grid-template-columns:1fr}
  .qayed-landing .footer-top{grid-template-columns:1fr 1fr;gap:32px}
  .qayed-landing .footer-bottom{flex-direction:column;align-items:flex-start;gap:16px}
}

@media(max-width:600px){
  .qayed-landing .nav-inner{padding:0 16px}
  .qayed-landing .nav-logo .nav-wordmark{font-size:18px}
  .qayed-landing .hero{padding:72px 16px 0}
  .qayed-landing .hero-h1{font-size:clamp(36px,11vw,52px)}
  .qayed-landing .hero-desc{font-size:15px}
  .qayed-landing .hero-actions{flex-direction:column}
  .qayed-landing .hero-actions a{width:100%;justify-content:center}
  .qayed-landing .section{padding:56px 16px}
  .qayed-landing .trust-bar{padding:14px 16px}
  .qayed-landing .stats-bar{grid-template-columns:1fr 1fr}
  .qayed-landing .stat-num{font-size:34px}
  .qayed-landing .stat-cell{padding:24px 14px}
  .qayed-landing .flow-screen-body{padding:14px}
  .qayed-landing .forqui-note{flex-direction:column;gap:8px}
  .qayed-landing .fiche-k{width:110px;font-size:11px;padding:10px 12px}
  .qayed-landing .fiche-v{padding:10px 12px;font-size:13px}
  .qayed-landing .pricing-grid{max-width:100%}
  .qayed-landing .pricing-card{padding:24px 20px}
  .qayed-landing .sec-list li strong{font-size:14px}
  .qayed-landing .footer-top{grid-template-columns:1fr}
  .qayed-landing .footer-desc{max-width:100%}
  .qayed-landing .footer-bottom{gap:12px}
  .qayed-landing footer{padding:48px 16px 32px}
  .qayed-landing .cta-band{padding:60px 16px}
  .qayed-landing .cta-h2{font-size:clamp(28px,8vw,44px)}
  .qayed-landing .btn-white{width:100%;justify-content:center}
}

@media(prefers-reduced-motion:reduce){.qayed-landing *,.qayed-landing *::before,.qayed-landing *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}

/* ── Sélecteur de langue (navbar publique) ─────────────────────────────── */
.qayed-landing .lang-switch{position:relative}
.qayed-landing .lang-btn{display:flex;align-items:center;gap:7px;background:transparent;border:1.5px solid var(--cachet-dilue);color:var(--cachet);font-family:var(--font-b);font-size:13px;font-weight:600;letter-spacing:.02em;padding:9px 13px;border-radius:var(--r-sm);cursor:pointer;transition:border-color .2s,background .2s;line-height:1}
.qayed-landing .lang-btn:hover{background:var(--cachet-dilue);border-color:var(--cachet)}
.qayed-landing .lang-btn svg{display:block}
.qayed-landing .lang-menu{position:absolute;top:calc(100% + 10px);inset-inline-end:0;background:var(--blanc);border:1px solid var(--ligne);border-radius:var(--r-md);box-shadow:0 12px 40px rgba(16,34,46,.14);padding:6px;min-width:168px;z-index:300}
.qayed-landing .lang-opt{display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%;background:transparent;border:0;padding:9px 12px;border-radius:9px;font-family:var(--font-b);font-size:14px;font-weight:500;color:var(--texte-sec);cursor:pointer;text-align:start;transition:background .15s}
.qayed-landing .lang-opt:hover{background:var(--papier)}
.qayed-landing .lang-opt.active{color:var(--cachet);font-weight:700;background:var(--cachet-dilue)}
.qayed-landing .lang-code{font-family:var(--font-m);font-size:10px;color:var(--fiche);letter-spacing:.1em}
.qayed-landing .lang-opt.active .lang-code{color:var(--cachet)}
.qayed-landing .mobile-menu .lang-switch{display:flex;justify-content:center;padding:4px 0 10px}
.qayed-landing .mobile-menu .lang-menu{inset-inline-end:auto;inset-inline-start:50%;transform:translateX(-50%)}
[dir='rtl'] .qayed-landing .mobile-menu .lang-menu{transform:translateX(50%)}
`;

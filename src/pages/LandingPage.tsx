import { useEffect, useRef } from 'react';
import { PricingSection } from '@/components/landing/PricingSection';

/**
 * Marketing landing page — ported from the standalone qayed-site-v3.html
 * mockup. Kept as near-verbatim static markup (rendered via
 * dangerouslySetInnerHTML) rather than decomposed into components: the
 * content has no data binding and no reuse elsewhere, so a mechanical
 * componentization would only add risk without benefit. Exception: the
 * pricing section is a real React component (PricingSection) fed by
 * GET /public/plans — single source of truth with the admin Packs editor.
 * Interactivity (nav shadow, burger menu, fade-ins, pricing/flow tab
 * switchers) is reimplemented in the effect below, mirroring the original
 * vanilla <script> block 1:1.
 *
 * The stylesheet is injected via a JSX <style> element (not a `.css`
 * import) so it unmounts with the component — the original file relies on
 * raw tag selectors (`nav`, `body`, `footer`, `*`) that would otherwise
 * leak into every other route for the lifetime of the app.
 */

const LANDING_CSS = `
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
`;

const LANDING_BODY_TOP = `
<nav id="navbar">
  <div class="nav-inner">
    <a href="#" class="nav-logo">
      <div class="nav-stamp"><span>قيد</span></div>
      <span class="nav-wordmark">QAYED</span>
    </a>
    <ul class="nav-links">
      <li><a href="#comment">Comment ça marche</a></li>
      <li><a href="#fonctionnalites">Fonctionnalités</a></li>
      <li><a href="#securite">Sécurité</a></li>
      <li><a href="#tarifs">Tarifs</a></li>
      <li><a href="/login" class="nav-login">Se connecter</a></li>
      <li><a href="/register" class="nav-cta">Essayer gratuitement</a></li>
    </ul>
    <button class="burger" id="burgerBtn" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    <a href="#comment" data-close-menu="1">Comment ça marche</a>
    <a href="#fonctionnalites" data-close-menu="1">Fonctionnalités</a>
    <a href="#securite" data-close-menu="1">Sécurité</a>
    <a href="#tarifs" data-close-menu="1">Tarifs</a>
    <div class="mobile-menu-actions">
      <a href="/login" class="btn btn-ghost btn-full">Se connecter</a>
      <a href="/register" class="btn btn-primary btn-full" data-close-menu="1">Essayer gratuitement</a>
    </div>
  </div>
</nav>

<section class="hero">
  <div class="reg-lines"></div>
  <div class="hero-glow"></div>
  <div class="hero-inner">
    <div>
      <p class="hero-eyebrow">Hébergements tunisiens · Fiche de police digitale</p>
      <h1 class="hero-h1">Enregistrez<br>vos voyageurs<br><em>en 30 secondes.</em></h1>
      <p class="hero-ar">سجّل نزلاءك رقمياً، بسرعة وبدون أوراق.</p>
      <p class="hero-desc">Qayed remplace la fiche de police papier. Votre équipe photographie le passeport ou la CIN — les données sont extraites automatiquement, la fiche est prête.</p>
      <div class="hero-actions">
        <a href="#contact" class="btn btn-primary">
          Demander une démo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <a href="#comment" class="btn btn-ghost-dark">Voir comment ça marche</a>
      </div>
    </div>

    <div class="hero-right">
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
    </div>
  </div>
</section>

<div class="wave"><svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 C480 56 960 0 1440 56 L1440 0 Z" fill="#10222E"/></svg></div>

<div class="trust-bar">
  <div class="trust-item"><div class="trust-dot"></div>Passeport & CIN — lecture MRZ automatique</div>
  <div class="trust-divider"></div>
  <div class="trust-item"><div class="trust-dot"></div>Multi-établissements, un seul compte</div>
  <div class="trust-divider"></div>
  <div class="trust-item"><div class="trust-dot"></div>Fiche de police imprimable en 1 clic</div>
  <div class="trust-divider"></div>
  <div class="trust-item"><div class="trust-dot"></div>Interface arabe / français</div>
  <div class="trust-divider"></div>
  <div class="trust-item"><div class="trust-dot"></div>Aucune installation — fonctionne sur mobile</div>
</div>

<section class="section" style="padding-top:64px;padding-bottom:64px">
  <div class="wrap">
    <div class="stats-bar fade-in">
      <div class="stat-cell"><div class="stat-num">30<sup>s</sup></div><div class="stat-label">Du scan du document à la fiche prête</div></div>
      <div class="stat-cell"><div class="stat-num">0</div><div class="stat-label">Installation requise — navigateur mobile suffit</div></div>
      <div class="stat-cell"><div class="stat-num">3</div><div class="stat-label">Étapes : Réservation · Documents · Validation</div></div>
      <div class="stat-cell"><div class="stat-num">AR+FR</div><div class="stat-label">Bilingue pour toutes vos équipes</div></div>
    </div>
  </div>
</section>

<section class="section section-alt" id="comment">
  <div class="wrap">
    <div class="eyebrow fade-in">Comment ça marche</div>
    <h2 class="section-h2 fade-in">Trois étapes. Trente secondes.<br>Zéro paperasse.</h2>
    <p class="section-lead fade-in" style="margin-bottom:48px">Votre réceptionniste ouvre Qayed sur son mobile ou tablette. En trois étapes guidées, le check-in est enregistré et la fiche de police est prête à imprimer.</p>

    <div class="flow-grid">
      <div class="flow-steps">
        <div class="flow-step active" data-flow-step="1">
          <div class="fs-num">1</div>
          <div class="fs-body">
            <div class="fs-title">Informations de réservation</div>
            <div class="fs-desc">Chambre, dates d'arrivée et de départ, nombre de voyageurs. La référence de réservation (Booking, Airbnb, direct…) est optionnelle.</div>
          </div>
        </div>
        <div class="flow-step" data-flow-step="2">
          <div class="fs-num">2</div>
          <div class="fs-body">
            <div class="fs-title">Scan des documents</div>
            <div class="fs-desc">Photographiez le passeport (zone MRZ) ou la CIN. Les données sont extraites automatiquement — prénom, nom, nationalité, numéro, expiration. Répété pour chaque voyageur.</div>
          </div>
        </div>
        <div class="flow-step" data-flow-step="3">
          <div class="fs-num">3</div>
          <div class="fs-body">
            <div class="fs-title">Validation & fiche de police</div>
            <div class="fs-desc">Vérifiez les données, confirmez. La fiche de police est générée, archivée, et disponible à l'impression ou en consultation à tout moment.</div>
          </div>
        </div>
      </div>

      <div class="flow-visual fade-in">
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
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="eyebrow fade-in">Pour qui ?</div>
    <h2 class="section-h2 fade-in">Tout hébergement qui accueille des voyageurs.</h2>
    <p class="section-lead fade-in" style="margin-bottom:40px">Hôtels, maisons d'hôtes, auberges, résidences touristiques — Qayed s'adapte à tous les types d'hébergements soumis à l'obligation de la fiche de police en Tunisie.</p>
    <div class="forqui-grid fade-in">
      <div class="forqui-card">
        <div class="forqui-icon">🏨</div>
        <h3>Hôtels & maisons d'hôtes</h3>
        <p>Votre réceptionniste scanne le document, les données arrivent automatiquement. Fini la saisie à la main et les fiches illisibles.</p>
      </div>
      <div class="forqui-card">
        <div class="forqui-icon">🏡</div>
        <h3>Auberges & résidences</h3>
        <p>Que vous gériez 3 chambres ou 30, Qayed s'adapte. Chaque membre d'équipe a son propre accès, l'activité est tracée en temps réel.</p>
      </div>
      <div class="forqui-card">
        <div class="forqui-icon">🏢</div>
        <h3>Groupes multi-établissements</h3>
        <p>Plusieurs propriétés, un seul compte. Basculez entre vos établissements en un tap, consultez tout l'historique depuis un tableau de bord central.</p>
      </div>
    </div>
    <div class="forqui-note fade-in">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:var(--cachet)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>Les fiches de police enregistrées dans Qayed sont directement accessibles par les services du Ministère de l'Intérieur, en conformité totale avec la réglementation tunisienne — sans aucune démarche supplémentaire de votre part.</span>
    </div>
  </div>
</section>

<section class="section section-alt" id="fonctionnalites">
  <div class="wrap">
    <div class="eyebrow fade-in">Fonctionnalités</div>
    <h2 class="section-h2 fade-in">Tout ce dont votre équipe a besoin.</h2>
    <p class="section-lead fade-in" style="margin-bottom:40px">Conçu pour la réalité opérationnelle des hébergements tunisiens — simple, rapide, fiable.</p>
    <div class="feat-grid fade-in">
      <div class="feat-card">
        <div class="feat-icon">📷</div>
        <h3>Scan MRZ automatique</h3>
        <p>Photographiez le passeport ou la CIN. La zone MRZ est lue instantanément : prénom, nom, nationalité, numéro de document, date d'expiration.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">👥</div>
        <h3>Groupes & voyageurs multiples</h3>
        <p>Enregistrez autant de voyageurs que nécessaire pour un même check-in. Chaque document est scanné et confirmé individuellement.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🏨</div>
        <h3>Multi-établissements</h3>
        <p>Gérez tous vos hébergements depuis un seul compte. Basculez entre établissements en un tap, sans vous reconnecter.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🖨️</div>
        <h3>Impression fiche de police</h3>
        <p>La fiche de police est générée au format réglementaire et imprimable en 1 clic depuis n'importe quel appareil connecté à une imprimante.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">↺</div>
        <h3>Historique & check-out</h3>
        <p>Consultez tous les séjours passés et actifs. Enregistrez les départs en un tap. Filtrez par statut : Actif, Terminé, Brouillon.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">👤</div>
        <h3>Équipe & rôles</h3>
        <p>Ajoutez vos réceptionnistes et managers. Chaque action est horodatée et attribuée — vous savez qui a enregistré quoi et quand.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="fiche-grid fade-in">
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
    </div>
  </div>
</section>

<section class="section" id="securite" style="background:var(--encre);position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 50%,rgba(83,70,168,.18) 0%,transparent 65%);pointer-events:none"></div>
  <div class="wrap" style="position:relative;z-index:1">
    <div class="sec-grid">
      <div>
        <div class="eyebrow fade-in" style="color:var(--cachet-sombre)">Conformité & sécurité</div>
        <h2 class="section-h2 fade-in" style="color:var(--papier)">Les autorités informées.<br>Vous, tranquille.</h2>
        <p class="fade-in" style="font-size:17px;color:#9BA8B3;line-height:1.65;margin-bottom:32px">En enregistrant vos voyageurs sur Qayed, vous n'envoyez pas une fiche dans un tiroir. Les données arrivent en temps réel sur le tableau de bord national du Ministère de l'Intérieur — chaque check-in, chaque passeport, chaque départ.</p>
        <ul class="sec-list fade-in">
          <li>
            <div class="sec-icon">🛡️</div>
            <div>
              <strong>Vérification automatique watchlist</strong>
              <p>Chaque document scanné est automatiquement confronté à la base de surveillance nationale. En cas d'alerte, les autorités sont notifiées immédiatement.</p>
            </div>
          </li>
          <li>
            <div class="sec-icon">📡</div>
            <div>
              <strong>Remontée en temps réel</strong>
              <p>Arrivées et départs apparaissent instantanément sur le tableau de bord du Ministère — voyageurs présents, nationalités, établissements actifs.</p>
            </div>
          </li>
          <li>
            <div class="sec-icon">📋</div>
            <div>
              <strong>Zéro démarche supplémentaire</strong>
              <p>Votre réceptionniste fait son check-in normalement. La conformité réglementaire est assurée automatiquement, en arrière-plan.</p>
            </div>
          </li>
        </ul>
      </div>

      <div class="fade-in">
        <div style="background:rgba(246,245,241,.04);border:1px solid rgba(246,245,241,.1);border-radius:var(--r-lg);overflow:hidden">
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
        <p style="font-size:12px;color:rgba(246,245,241,.25);margin-top:12px;text-align:center;font-family:var(--font-m);letter-spacing:.06em">INTERFACE MINISTÈRE DE L'INTÉRIEUR — DONNÉES FICTIVES</p>
      </div>
    </div>
  </div>
</section>
`;

const LANDING_BODY_BOTTOM = `
<section class="section">
  <div class="wrap">
    <div class="eyebrow fade-in">Témoignages</div>
    <h2 class="section-h2 fade-in">Ce que disent les hôteliers.</h2>
    <div class="testi-grid fade-in">
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">En deux semaines, on a totalement éliminé les fiches papier. La réception gagne un temps fou à chaque check-in, et je retrouve n'importe quelle fiche en 10 secondes.</p>
        <div class="testi-author"><div class="testi-av">MK</div><div><p class="testi-name">Mohamed Karray</p><p class="testi-role">Directeur · Hôtel Médina, Tunis</p></div></div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">Avec plusieurs maisons d'hôtes à gérer, Qayed m'a permis de tout centraliser. Je vois les arrivées du jour sur toutes mes propriétés depuis mon téléphone.</p>
        <div class="testi-author"><div class="testi-av">SB</div><div><p class="testi-name">Sarra Ben Amor</p><p class="testi-role">Gérante · Groupe Dars Médina, Tunis</p></div></div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">Le scan du passeport est bluffant — 10 secondes et tous les champs sont remplis. Déploiement en une journée, mes réceptionnistes ont pris en main en 15 minutes.</p>
        <div class="testi-author"><div class="testi-av">RA</div><div><p class="testi-name">Riadh Ayari</p><p class="testi-role">Responsable ops · Résidence Jasmin, Hammamet</p></div></div>
      </div>
    </div>
  </div>
</section>

<div class="cta-band" id="contact">
  <div class="wrap">
    <h2 class="cta-h2">Votre premier check-in<br>en moins de 5 minutes.</h2>
    <p class="cta-sub">Démo sur demande. Déploiement en une journée. Sans engagement.</p>
    <a href="mailto:contact@qayed.tn" class="btn btn-white">
      Écrire à contact@qayed.tn
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
    <p class="cta-meta">QAYED.TN · KASBAHOST SARL · TUNIS</p>
  </div>
</div>

<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <div>
        <div class="footer-logo-row">
          <div class="footer-stamp"><span>قيد</span></div>
          <span class="footer-wm">QAYED</span>
        </div>
        <p class="footer-tagline">منصة تسجيل النزلاء الرقمية للفنادق التونسية</p>
        <p class="footer-desc">Plateforme de fiche de police digitale pour les hébergements en Tunisie — simple, rapide, conforme.</p>
      </div>
      <div class="footer-col">
        <h4>Produit</h4>
        <ul>
          <li><a href="#comment">Comment ça marche</a></li>
          <li><a href="#fonctionnalites">Fonctionnalités</a></li>
          <li><a href="#tarifs">Tarifs</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Ressources</h4>
        <ul>
          <li><a href="#">Guide de démarrage</a></li>
          <li><a href="#">FAQ</a></li>
          <li><a href="#">Support</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Légal</h4>
        <ul>
          <li><a href="#">Mentions légales</a></li>
          <li><a href="#">Confidentialité</a></li>
          <li><a href="mailto:contact@qayed.tn">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-legal">© 2026 QAYED · KASBAHOST SARL · TUNIS, TUNISIE</span>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="footer-legal" style="margin-right:6px">Paiement sécurisé</span>
        <svg width="42" height="26" viewBox="0 0 42 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:.45">
          <rect width="42" height="26" rx="4" fill="#1A1F71"/>
          <text x="21" y="17" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#FFFFFF" letter-spacing="1">VISA</text>
        </svg>
        <svg width="42" height="26" viewBox="0 0 42 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:.45">
          <rect width="42" height="26" rx="4" fill="#252525"/>
          <circle cx="16" cy="13" r="8" fill="#EB001B"/>
          <circle cx="26" cy="13" r="8" fill="#F79E1B"/>
          <path d="M21 7.2a8 8 0 0 1 0 11.6A8 8 0 0 1 21 7.2z" fill="#FF5F00"/>
        </svg>
        <svg width="42" height="26" viewBox="0 0 42 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:.45">
          <rect width="42" height="26" rx="4" fill="#2D6DB5"/>
          <text x="21" y="17" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#FFFFFF">CB</text>
        </svg>
      </div>
    </div>
  </div>
</footer>
`;

export const LandingPage = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prevTitle = document.title;
    document.title = 'Qayed — Enregistrez vos voyageurs en 30 secondes';

    const nav = root.querySelector('#navbar');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll);

    const burgerBtn = root.querySelector('#burgerBtn');
    const mobileMenu = root.querySelector('#mobileMenu');
    const toggleMenu = () => {
      burgerBtn?.classList.toggle('open');
      mobileMenu?.classList.toggle('open');
    };
    const closeMenu = () => {
      burgerBtn?.classList.remove('open');
      mobileMenu?.classList.remove('open');
    };
    burgerBtn?.addEventListener('click', toggleMenu);
    root.querySelectorAll('[data-close-menu]').forEach((el) => el.addEventListener('click', closeMenu));

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    root.querySelectorAll('.fade-in').forEach((el) => obs.observe(el));

    const flowSteps = root.querySelectorAll<HTMLElement>('[data-flow-step]');
    const onFlowStepClick = (el: HTMLElement) => {
      const n = el.dataset.flowStep;
      root.querySelectorAll('.flow-step').forEach((s) => s.classList.remove('active'));
      root.querySelectorAll('.flow-screen').forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
      root.querySelector(`#screen-${n}`)?.classList.add('active');
    };
    flowSteps.forEach((el) => el.addEventListener('click', () => onFlowStepClick(el)));

    // NOTE : la bascule Mensuel/Annuel vit dans PricingSection (état React) —
    // le DOM des cartes tarifs appartient à React, pas à ce script vanilla.

    return () => {
      document.title = prevTitle;
      window.removeEventListener('scroll', onScroll);
      burgerBtn?.removeEventListener('click', toggleMenu);
      root.querySelectorAll('[data-close-menu]').forEach((el) => el.removeEventListener('click', closeMenu));
      obs.disconnect();
    };
  }, []);

  return (
    <div className="qayed-landing" ref={rootRef}>
      <style>{LANDING_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: LANDING_BODY_TOP }} />
      <PricingSection />
      <div dangerouslySetInnerHTML={{ __html: LANDING_BODY_BOTTOM }} />
    </div>
  );
};

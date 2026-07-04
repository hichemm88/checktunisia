import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ScanLine, Archive, Building2, BarChart3, Bell,
  Users, Upload, Smartphone, Zap, AlertTriangle, Search, FileCheck,
  Home, Lock, Map, ArrowRight, CheckCircle2, Menu, X,
  CreditCard, Landmark, Clock, Star, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1B3A5F',
  navyMid: '#2A5090',
  gold:    '#C8943A',
  goldLt:  '#E0A040',
  cream:   '#F5F4EF',
  border:  '#E0DDD7',
  text:    '#1a1a2e',
  muted:   '#6b7280',
  mutedLt: '#9ca3af',
};

// ── Data — hébergeurs ─────────────────────────────────────────────────────────
const HEBERGEURS = [
  {
    icon: ScanLine,
    title: 'Scan passeport & CIN en 3 secondes',
    desc: "L'OCR lit le code MRZ et remplit la fiche automatiquement. Fini de recopier à la main chaque voyageur un soir d'arrivées multiples.",
  },
  {
    icon: Archive,
    title: 'Fin de la corvée papier',
    desc: "Plus de classeurs de fiches de police, plus de fiches perdues ou illisibles. Tout est archivé numériquement et imprimable à la demande si les autorités passent.",
  },
  {
    icon: ShieldCheck,
    title: 'Conformité légale garantie',
    desc: "L'hébergeur est sûr d'être en règle, avec un historique complet et horodaté en cas de contrôle. Zéro risque d'amende pour fiche manquante.",
  },
  {
    icon: Building2,
    title: 'Multi-établissements',
    desc: "Un seul tableau de bord pour toutes vos propriétés et unités — idéal si vous gérez plusieurs dars, appartements ou villas en même temps.",
  },
  {
    icon: BarChart3,
    title: 'Vision opérationnelle en temps réel',
    desc: "Arrivées du jour, voyageurs présents, check-ins/check-outs, statistiques d'activité — tout visible d'un coup d'œil depuis votre téléphone.",
  },
  {
    icon: Bell,
    title: 'Alertes documents expirants',
    desc: "Séjours dépassés, pièces d'identité périmées, rien ne passe entre les mailles. Les alertes remontent automatiquement avant que ce soit un problème.",
  },
  {
    icon: Users,
    title: 'Délégation sécurisée',
    desc: "Les réceptionnistes font les check-ins avec leurs propres accès, le gérant garde la supervision complète. Chaque action est tracée et horodatée.",
  },
  {
    icon: Upload,
    title: 'Import CSV',
    desc: "Intégration des réservations existantes sans ressaisie. Importez en masse depuis votre logiciel de réservation actuel.",
  },
  {
    icon: Smartphone,
    title: 'Image moderne & premium',
    desc: "Un check-in fluide au smartphone plutôt qu'un formulaire papier à remplir en triple exemplaire. Ça change l'impression dès l'arrivée.",
  },
];

// ── Data — autorités ──────────────────────────────────────────────────────────
const AUTORITES = [
  {
    icon: Zap,
    title: 'Données en temps réel',
    desc: "Les informations remontent instantanément, sans attendre le passage physique d'un agent pour collecter les fiches papier des classeurs.",
  },
  {
    icon: AlertTriangle,
    title: 'Croisement automatique watchlists',
    desc: "Chaque check-in est vérifié instantanément contre les listes de surveillance, avec notification immédiate. Impossible à faire manuellement à l'échelle.",
  },
  {
    icon: Search,
    title: 'Recherche instantanée d\'un individu',
    desc: "Localiser un voyageur recherché sur tout le territoire couvert en quelques secondes, au lieu d'appeler les établissements un par un.",
  },
  {
    icon: FileCheck,
    title: 'Données structurées et fiables',
    desc: "Fini les fiches manuscrites illisibles ou incomplètes. L'OCR garantit des données normalisées et exploitables directement.",
  },
  {
    icon: Home,
    title: 'Couverture du parc informel',
    desc: "Les locations Airbnb et maisons d'hôtes, aujourd'hui largement hors radar de la fiche papier, entrent dans le système de contrôle.",
  },
  {
    icon: Lock,
    title: 'Traçabilité et audit',
    desc: "Chaque consultation et chaque enregistrement est horodaté, avec accès sécurisé par 2FA pour la plateforme autorité.",
  },
  {
    icon: Map,
    title: 'Statistiques territoriales',
    desc: "Flux touristiques par zone, nationalités, durées de séjour — utile au-delà de la sécurité pour la planification touristique.",
  },
  {
    icon: Star,
    title: 'Zéro coût d\'infrastructure',
    desc: "La plateforme existe déjà. Les hébergeurs la financent par abonnement. L'État bénéficie du système sans avoir à le construire ni le maintenir.",
  },
];

// ── Data — plans ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    slug:      'starter',
    name:      'Essentiel',
    rooms:     'Jusqu'à 10 chambres',
    badge:     null,
    price:     39,
    yearPrice: 390,
    perRoom:   '3,9 TND / chambre',
    highlight: false,
    features: [
      '3 utilisateurs inclus',
      'Scan OCR passeport & CIN',
      'Fiche de police imprimable',
      'Historique illimité',
      'Support email',
    ],
  },
  {
    slug:      'pro',
    name:      'Professionnel',
    rooms:     '11 à 30 chambres',
    badge:     'Le plus populaire',
    price:     79,
    yearPrice: 790,
    perRoom:   '2,6 TND / chambre',
    highlight: true,
    features: [
      '10 utilisateurs inclus',
      'Scan OCR passeport & CIN',
      'Fiche de police imprimable',
      'Multi-établissements',
      'Export CSV & rapports',
      'Alertes watchlist',
      'Support prioritaire',
    ],
  },
  {
    slug:      'business',
    name:      'Entreprise',
    rooms:     '31 chambres et plus',
    badge:     null,
    price:     149,
    yearPrice: null,
    perRoom:   '< 2 TND / chambre',
    highlight: false,
    features: [
      'Utilisateurs illimités',
      'Toutes les fonctionnalités Pro',
      'Plusieurs sociétés & groupes',
      'Onboarding assisté',
      'SLA & support dédié',
      'Tarif annuel sur devis',
    ],
  },
];

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Créez votre compte',
    desc: "Inscription en 2 minutes. Renseignez votre établissement et choisissez votre plan. 30 jours d'essai offerts, sans carte bancaire.",
  },
  {
    n: '02',
    title: 'Scannez les documents',
    desc: "À l'arrivée d'un voyageur, pointez la caméra sur le passeport ou la CIN. La fiche se remplit toute seule en moins de 5 secondes.",
  },
  {
    n: '03',
    title: 'Restez conforme',
    desc: 'Vos fiches de police sont archivées, imprimables et consultables à tout moment. En cas de contrôle, vous êtes prêt en 30 secondes.',
  },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '89',    label: 'Établissements', icon: '🏨' },
  { value: '12 k+', label: 'Scans MRZ',      icon: '🛂' },
  { value: '247',   label: 'Check-ins / jour', icon: '📋' },
  { value: '< 5 s', label: 'Par voyageur',   icon: '⚡' },
];

// ─────────────────────────────────────────────────────────────────────────────
export const LandingPage = () => {
  const [audience,  setAudience]  = useState<'hebergeurs' | 'autorites'>('hebergeurs');
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const [billing,   setBilling]   = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const items = audience === 'hebergeurs' ? HEBERGEURS : AUTORITES;

  return (
    <div style={{ background: C.cream, color: C.text, fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav
        style={{
          position:     'fixed',
          top:          0,
          left:         0,
          right:        0,
          zIndex:       50,
          height:       64,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          padding:      '0 24px',
          background:   scrolled ? 'rgba(245,244,239,0.96)' : 'rgba(245,244,239,0.80)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
          transition:   'all .25s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 34, width: 34, borderRadius: 10, background: `linear-gradient(135deg,${C.navy},${C.navyMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck style={{ height: 18, width: 18, color: '#fff' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: C.navy, letterSpacing: '-0.3px' }}>CheckTunisia</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
          {[
            { label: 'Hébergeurs', id: 'hebergeurs' },
            { label: 'Autorités',  id: 'autorites'  },
            { label: 'Tarifs',     id: 'tarifs'      },
            { label: 'Contact',    id: 'contact'     },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: C.muted, padding: 0, transition: 'color .15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.navy)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 12 }}>
          <Link to="/login">
            <Button variant="ghost" size="sm">Connexion</Button>
          </Link>
          <Link to="/register">
            <Button size="sm" style={{ background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, border: 'none' }}>
              Essai gratuit
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          {menuOpen
            ? <X style={{ height: 22, width: 22, color: C.navy }} />
            : <Menu style={{ height: 22, width: 22, color: C.navy }} />
          }
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position:   'fixed',
            top:        64,
            left:       0,
            right:      0,
            zIndex:     49,
            background: C.cream,
            borderBottom: `1px solid ${C.border}`,
            padding:    '16px 24px 24px',
            display:    'flex',
            flexDirection: 'column',
            gap:        16,
          }}
        >
          {[
            { label: 'Hébergeurs', id: 'hebergeurs' },
            { label: 'Autorités',  id: 'autorites'  },
            { label: 'Tarifs',     id: 'tarifs'      },
            { label: 'Contact',    id: 'contact'     },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: C.navy, textAlign: 'left', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}
            >
              {label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <Link to="/login" style={{ flex: 1 }}>
              <Button variant="secondary" fullWidth>Connexion</Button>
            </Link>
            <Link to="/register" style={{ flex: 1 }}>
              <Button fullWidth>S'abonner</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight:      '100vh',
          paddingTop:     144,
          paddingBottom:  80,
          paddingLeft:    24,
          paddingRight:   24,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          textAlign:      'center',
        }}
      >
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(27,58,95,0.08)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 28, letterSpacing: '0.3px' }}>
          <ShieldCheck style={{ height: 14, width: 14 }} />
          Plateforme officielle · Made in Tunisia 🇹🇳
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, color: C.navy, maxWidth: 760, marginBottom: 24, letterSpacing: '-1.5px' }}>
          La fiche de police,{' '}
          <span style={{ background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            enfin numérique.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: C.muted, maxWidth: 560, marginBottom: 40, lineHeight: 1.7 }}>
          CheckTunisia permet aux hébergements tunisiens de gérer les check-ins, scanner les
          documents de voyage et rester en conformité — le tout depuis un smartphone, en moins
          de 5 secondes par voyageur.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          <Link to="/register">
            <Button size="lg" style={{ background: `linear-gradient(135deg,${C.navy},${C.navyMid})`, gap: 8 }}>
              Démarrer l'essai gratuit <ArrowRight style={{ height: 16, width: 16 }} />
            </Button>
          </Link>
          <button
            onClick={() => scrollTo('tarifs')}
            style={{ height: 48, padding: '0 24px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fff', color: C.navy, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color .15s' }}
          >
            Voir les tarifs <ChevronRight style={{ height: 16, width: 16, color: C.muted }} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: C.mutedLt, marginBottom: 64 }}>
          30 jours d'essai gratuit · Sans carte bancaire · Activation immédiate
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: '100%', maxWidth: 560 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: `linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius: 20, padding: '20px 24px', textAlign: 'left' }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ AVANTAGES ═══════════════════════════════════════════════════════ */}
      <section
        id="hebergeurs"
        style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: C.navy, marginBottom: 12, letterSpacing: '-0.5px' }}>
            Conçu pour deux publics, indispensable pour les deux.
          </h2>
          <p style={{ color: C.muted, fontSize: 16, marginBottom: 32 }}>
            CheckTunisia sert à la fois les hébergeurs qui cherchent la simplicité,
            et les autorités qui ont besoin de données fiables.
          </p>

          {/* Audience toggle */}
          <div style={{ display: 'inline-flex', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 4, gap: 4 }}>
            {(['hebergeurs', 'autorites'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                style={{
                  padding:      '10px 24px',
                  borderRadius: 10,
                  border:       'none',
                  cursor:       'pointer',
                  fontWeight:   700,
                  fontSize:     14,
                  transition:   'all .2s ease',
                  background:   audience === a ? `linear-gradient(135deg,${C.navy},${C.navyMid})` : 'transparent',
                  color:        audience === a ? '#fff' : C.muted,
                  letterSpacing: '0.2px',
                }}
              >
                {a === 'hebergeurs' ? '🏨 Hébergeurs' : '🔍 Autorités'}
              </button>
            ))}
          </div>
        </div>

        {/* Advantages grid */}
        <div
          id="autorites"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}
        >
          {items.map((item, i) => (
            <div
              key={item.title}
              style={{
                background:   '#fff',
                border:       `1.5px solid ${C.border}`,
                borderRadius: 20,
                padding:      '28px 24px',
                transition:   'box-shadow .2s, border-color .2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(27,58,95,0.10)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(27,58,95,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
              }}
            >
              <div style={{ height: 44, width: 44, borderRadius: 14, background: i % 3 === 0 ? `rgba(27,58,95,0.08)` : i % 3 === 1 ? `rgba(200,148,58,0.10)` : `rgba(27,58,95,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <item.icon style={{ height: 22, width: 22, color: i % 3 === 1 ? C.gold : C.navy }} />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 10, letterSpacing: '-0.2px' }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ COMMENT ÇA MARCHE ═══════════════════════════════════════════════ */}
      <section style={{ background: `linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 100%)`, padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-0.5px' }}>
              Opérationnel en 5 minutes
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
              Pas de formation. Pas d'installation. Ça marche sur n'importe quel smartphone.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ position: 'relative' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.08)', marginBottom: 4, letterSpacing: '-3px', lineHeight: 1 }}>{s.n}</div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(200,148,58,0.25)`, border: `1.5px solid rgba(200,148,58,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, marginTop: -8 }}>
                  <span style={{ fontWeight: 900, color: C.goldLt, fontSize: 15 }}>{i + 1}</span>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 17, color: '#fff', marginBottom: 12, letterSpacing: '-0.3px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TARIFS ══════════════════════════════════════════════════════════ */}
      <section id="tarifs" style={{ padding: '96px 24px', maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: C.navy, marginBottom: 12, letterSpacing: '-0.5px' }}>
            Tarifs dégressifs selon votre capacité
          </h2>
          <p style={{ color: C.muted, fontSize: 16, marginBottom: 32 }}>
            Plus vous avez de chambres, moins vous payez par unité. 30 jours d'essai inclus sur tous les plans.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 4, gap: 4 }}>
            {(['monthly', 'yearly'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding:      '8px 20px',
                  borderRadius: 10,
                  border:       'none',
                  cursor:       'pointer',
                  fontWeight:   700,
                  fontSize:     13,
                  background:   billing === b ? C.navy : 'transparent',
                  color:        billing === b ? '#fff' : C.muted,
                  transition:   'all .2s',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                }}
              >
                {b === 'monthly' ? 'Mensuel' : (
                  <>
                    Annuel
                    <span style={{ background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99 }}>−17%</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginBottom: 64 }}>
          {PLANS.map((p) => {
            const displayPrice = billing === 'monthly'
              ? `${p.price} TND`
              : p.yearPrice
                ? `${p.yearPrice} TND`
                : 'Sur devis';
            const priceLabel = billing === 'monthly' ? '/mois' : p.yearPrice ? '/an' : '';
            const saving = p.yearPrice ? `Économisez ${(p.price * 12 - p.yearPrice)} TND/an` : null;

            return (
              <div
                key={p.slug}
                style={{
                  position:     'relative',
                  borderRadius: 24,
                  padding:      '32px 28px',
                  display:      'flex',
                  flexDirection:'column',
                  background:   p.highlight ? `linear-gradient(145deg,${C.navy} 0%,#1e4a7a 100%)` : '#fff',
                  border:       p.highlight ? 'none' : `1.5px solid ${C.border}`,
                  boxShadow:    p.highlight ? `0 20px 60px rgba(27,58,95,0.30)` : 'none',
                  transform:    p.highlight ? 'scale(1.03)' : 'none',
                  color:        p.highlight ? '#fff' : C.text,
                }}
              >
                {p.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                    {p.badge}
                  </div>
                )}

                {/* Plan name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Building2 style={{ height: 18, width: 18, color: p.highlight ? 'rgba(255,255,255,0.6)' : C.navy }} />
                  <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>{p.name}</span>
                </div>
                <p style={{ fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.55)' : C.muted, marginBottom: 8 }}>{p.rooms}</p>

                {/* Per-room badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: p.highlight ? 'rgba(255,255,255,0.10)' : 'rgba(27,58,95,0.06)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: p.highlight ? 'rgba(255,255,255,0.75)' : C.navy, marginBottom: 24, width: 'fit-content' }}>
                  <Clock style={{ height: 11, width: 11 }} /> {p.perRoom}/mois
                </div>

                {/* Price */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px' }}>{displayPrice}</span>
                    {priceLabel && <span style={{ fontSize: 14, color: p.highlight ? 'rgba(255,255,255,0.55)' : C.mutedLt, fontWeight: 600 }}>{priceLabel}</span>}
                  </div>
                  {billing === 'yearly' && saving && (
                    <p style={{ fontSize: 12, color: p.highlight ? 'rgba(200,148,58,0.9)' : C.gold, fontWeight: 700, marginTop: 4 }}>
                      🎉 {saving}
                    </p>
                  )}
                  {billing === 'yearly' && !p.yearPrice && (
                    <p style={{ fontSize: 12, color: p.highlight ? 'rgba(255,255,255,0.5)' : C.mutedLt, marginTop: 4 }}>Contactez-nous pour un devis personnalisé</p>
                  )}
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {p.features.map((feat) => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
                      <CheckCircle2 style={{ height: 16, width: 16, flexShrink: 0, marginTop: 1, color: p.highlight ? '#86efac' : '#22c55e' }} />
                      <span style={{ color: p.highlight ? 'rgba(255,255,255,0.85)' : '#374151' }}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link to={`/register?plan=${p.slug}`}>
                  <button style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: p.highlight ? `linear-gradient(135deg,${C.gold},${C.goldLt})` : `rgba(27,58,95,0.08)`, color: p.highlight ? '#fff' : C.navy, transition: 'opacity .15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    Choisir {p.name}
                  </button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* ── Payment methods ── */}
        <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 24, padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: C.navy, marginBottom: 8, letterSpacing: '-0.3px' }}>Comment régler votre abonnement ?</h3>
            <p style={{ color: C.muted, fontSize: 15 }}>Deux modes de paiement acceptés. Vous choisissez à la fin de votre essai gratuit.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>

            {/* Flouci */}
            <div style={{ border: `2px solid rgba(27,58,95,0.15)`, borderRadius: 20, padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: '0 20px 0 12px', letterSpacing: '0.5px' }}>
                RECOMMANDÉ
              </div>
              <div style={{ height: 52, width: 52, borderRadius: 16, background: `rgba(200,148,58,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CreditCard style={{ height: 26, width: 26, color: C.gold }} />
              </div>
              <h4 style={{ fontWeight: 800, fontSize: 17, color: C.navy, marginBottom: 8 }}>Paiement en ligne — Flouci</h4>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 20 }}>
                Paiement immédiat et sécurisé par carte bancaire tunisienne, D17 ou wallet Flouci.
                Votre abonnement est activé instantanément après confirmation.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Activation immédiate', 'Reçu par email automatique', 'Renouvellement automatique possible'].map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    <CheckCircle2 style={{ height: 14, width: 14, color: '#22c55e', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Virement */}
            <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 20, padding: '28px 24px' }}>
              <div style={{ height: 52, width: 52, borderRadius: 16, background: `rgba(27,58,95,0.07)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Landmark style={{ height: 26, width: 26, color: C.navy }} />
              </div>
              <h4 style={{ fontWeight: 800, fontSize: 17, color: C.navy, marginBottom: 8 }}>Virement bancaire</h4>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 20 }}>
                Effectuez un virement sur notre compte bancaire. Votre abonnement est activé manuellement
                sous 24 à 48h ouvrées après réception et vérification du virement.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['RIB communiqué après inscription', 'Confirmation par email', 'Facturation sur 30 jours'].map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    <CheckCircle2 style={{ height: 14, width: 14, color: '#6b7280', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: C.mutedLt }}>
            💡 Aucune carte bancaire requise pendant les 30 jours d'essai. Vous choisissez votre mode de paiement uniquement si vous souhaitez continuer.
          </p>
        </div>
      </section>

      {/* ══ CTA BANNER ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 96px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ borderRadius: 28, padding: '64px 48px', textAlign: 'center', background: `linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 100%)`, position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(200,148,58,0.10)' }} />

          <h2 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: 900, color: '#fff', marginBottom: 16, letterSpacing: '-0.5px', position: 'relative' }}>
            Prêt à moderniser vos check-ins ?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6, position: 'relative' }}>
            Rejoignez les établissements tunisiens qui ont dit adieu aux fiches de police papier.
            30 jours gratuits, sans engagement.
          </p>
          <Link to="/register">
            <button style={{ height: 52, padding: '0 32px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 16, background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 10, position: 'relative', transition: 'opacity .15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Créer mon compte gratuitement <ArrowRight style={{ height: 18, width: 18 }} />
            </button>
          </Link>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer
        id="contact"
        style={{ borderTop: `1px solid ${C.border}`, padding: '48px 24px 32px', background: C.cream }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 48, marginBottom: 48 }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ height: 32, width: 32, borderRadius: 10, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck style={{ height: 16, width: 16, color: '#fff' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>CheckTunisia</span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                Plateforme de conformité hôtelière pour les établissements tunisiens.
              </p>
            </div>

            {/* Product */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Produit</p>
              {['Fonctionnalités', 'Tarifs', 'Sécurité', 'Conformité légale'].map((l) => (
                <button key={l} onClick={() => scrollTo('hebergeurs')} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted, marginBottom: 10, padding: 0, textAlign: 'left', transition: 'color .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.navy)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >{l}</button>
              ))}
            </div>

            {/* Contact */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Contact</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
                <a href="mailto:contact@checktunisia.com" style={{ color: C.navy, textDecoration: 'none', fontWeight: 600 }}>contact@checktunisia.com</a>
              </p>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                Tunis, Tunisie<br />
                Lun–Ven, 9h–18h
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: C.mutedLt }}>© {new Date().getFullYear()} CheckTunisia. Tous droits réservés.</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Mentions légales', 'Politique de confidentialité', 'CGU'].map((l) => (
                <a key={l} href="#" style={{ fontSize: 13, color: C.mutedLt, textDecoration: 'none', transition: 'color .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.navy)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.mutedLt)}
                >{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

import { Link } from 'react-router-dom';
import { ShieldCheck, ScanLine, Bell, Users, BarChart3, Lock, CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const NAV_H = 64;

const FEATURES = [
  {
    icon: ScanLine,
    title: 'Scan MRZ instantané',
    desc: 'Lecture automatique des passeports et CIN par reconnaissance optique. Saisie manuelle en fallback.',
  },
  {
    icon: ShieldCheck,
    title: 'Conformité légale',
    desc: 'Répondez aux obligations du décret n°2005-1214 sur le contrôle hôtelier tunisien.',
  },
  {
    icon: Bell,
    title: 'Alertes watchlist',
    desc: 'Croisement en temps réel avec les listes de surveillance des autorités. Notification immédiate.',
  },
  {
    icon: Users,
    title: 'Multi-utilisateurs',
    desc: 'Rôles distincts : administrateur hôtel et réceptionniste. Accès cloisonné par établissement.',
  },
  {
    icon: BarChart3,
    title: 'Statistiques en direct',
    desc: "Taux d'occupation, check-ins du jour, alertes actives — tout visible sur un seul tableau de bord.",
  },
  {
    icon: Lock,
    title: 'Sécurité maximale',
    desc: 'Authentification 2FA, chiffrement des données, audit log complet de chaque action.',
  },
];

const PLANS = [
  {
    slug: 'small',
    name: 'Small',
    rooms: '1–5 chambres',
    price: '25',
    yearPrice: '250',
    features: ['3 utilisateurs', '200 scans/mois', 'Support email'],
    highlight: false,
  },
  {
    slug: 'medium',
    name: 'Medium',
    rooms: '6–20 chambres',
    price: '85',
    yearPrice: '850',
    features: ['10 utilisateurs', '1 000 scans/mois', 'Support prioritaire', 'Export CSV'],
    highlight: true,
  },
  {
    slug: 'large',
    name: 'Large',
    rooms: '21+ chambres',
    price: '250',
    yearPrice: 'Sur devis',
    features: ['Utilisateurs illimités', 'Scans illimités', 'Support dédié', 'Export + rapports', 'Onboarding assisté'],
    highlight: false,
  },
];

export const LandingPage = () => (
  <div className="min-h-screen" style={{ background: '#F5F4EF', color: '#1a1a2e' }}>

    {/* ── Navbar ── */}
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
      style={{ height: NAV_H, background: 'rgba(245,244,239,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E0DDD7' }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg,#1B3A5F,#2A5090)' }}>
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold" style={{ color: '#1B3A5F' }}>CheckTunisia</span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm">Connexion</Button>
        </Link>
        <Link to="/register">
          <Button size="sm">Commencer</Button>
        </Link>
      </div>
    </nav>

    {/* ── Hero ── */}
    <section
      className="flex flex-col items-center justify-center text-center px-6 pt-32 pb-20"
      style={{ minHeight: '100vh', paddingTop: NAV_H + 80 }}
    >
      <span
        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-6"
        style={{ background: 'rgba(27,58,95,0.08)', color: '#1B3A5F' }}
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Plateforme officielle de contrôle hôtelier
      </span>

      <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 max-w-3xl" style={{ color: '#1B3A5F' }}>
        Le contrôle des voyageurs,{' '}
        <span style={{ background: 'linear-gradient(135deg,#C8943A,#E0A040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          simplifié.
        </span>
      </h1>

      <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
        CheckTunisia permet aux hôtels tunisiens de gérer les check-ins, scanner les documents
        de voyage et rester en conformité avec la législation — le tout depuis un smartphone.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link to="/register">
          <Button size="lg" className="gap-2">
            Démarrer gratuitement <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <a href="#tarifs">
          <Button size="lg" variant="secondary">Voir les tarifs</Button>
        </a>
      </div>

      <p className="mt-6 text-sm text-gray-400">30 jours d'essai gratuit · Sans carte bancaire</p>

      {/* Hero visual */}
      <div
        className="mt-16 w-full max-w-2xl rounded-3xl p-8 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#1B3A5F 0%,#2A5090 100%)', minHeight: 280 }}
      >
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {[
            { label: 'Check-ins aujourd\'hui', value: '247', icon: '📋' },
            { label: 'Alertes actives', value: '3', icon: '🔔' },
            { label: 'Hôtels connectés', value: '89', icon: '🏨' },
            { label: 'Scans MRZ', value: '12 450', icon: '🛂' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4 text-left" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-blue-200 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Features ── */}
    <section className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-bold mb-3" style={{ color: '#1B3A5F' }}>Tout ce qu'il faut pour rester conforme</h2>
        <p className="text-gray-500">Une plateforme pensée pour les hôteliers, pas pour les informaticiens.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid #E0DDD7' }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4" style={{ background: 'rgba(27,58,95,0.08)' }}>
              <f.icon className="h-5 w-5" style={{ color: '#1B3A5F' }} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── Pricing ── */}
    <section id="tarifs" className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-bold mb-3" style={{ color: '#1B3A5F' }}>Tarifs transparents</h2>
        <p className="text-gray-500">30 jours d'essai inclus sur tous les plans. Aucun engagement.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((p) => (
          <div
            key={p.slug}
            className="rounded-2xl p-7 flex flex-col relative"
            style={{
              background: p.highlight ? 'linear-gradient(135deg,#1B3A5F,#2A5090)' : '#fff',
              border: p.highlight ? 'none' : '1.5px solid #E0DDD7',
              color: p.highlight ? '#fff' : '#1a1a2e',
            }}
          >
            {p.highlight && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg,#C8943A,#E0A040)', color: '#fff' }}
              >
                Le plus populaire
              </span>
            )}
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4" style={{ color: p.highlight ? 'rgba(255,255,255,0.7)' : '#1B3A5F' }} />
              <span className="font-bold text-lg">{p.name}</span>
            </div>
            <p className="text-sm mb-5" style={{ color: p.highlight ? 'rgba(255,255,255,0.6)' : '#6b7280' }}>{p.rooms}</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">{p.price}</span>
              <span className="text-sm ml-1" style={{ color: p.highlight ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>TND/mois</span>
              <p className="text-xs mt-1" style={{ color: p.highlight ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
                {p.yearPrice !== 'Sur devis' ? `${p.yearPrice} TND/an` : 'Tarif annuel sur devis'}
              </p>
            </div>
            <ul className="space-y-2 mb-8 flex-1">
              {p.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: p.highlight ? '#86efac' : '#22c55e' }} />
                  <span style={{ color: p.highlight ? 'rgba(255,255,255,0.85)' : '#374151' }}>{feat}</span>
                </li>
              ))}
            </ul>
            <Link to={`/register?plan=${p.slug}`}>
              <Button
                fullWidth
                variant={p.highlight ? 'gold' : 'secondary'}
                size="lg"
              >
                Choisir {p.name}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>

    {/* ── CTA Banner ── */}
    <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
      <div
        className="rounded-3xl p-10 text-center"
        style={{ background: 'linear-gradient(135deg,#1B3A5F,#2A5090)' }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Prêt à simplifier vos check-ins ?
        </h2>
        <p className="text-blue-200 mb-8">Rejoignez les hôtels tunisiens déjà conformes et connectés.</p>
        <Link to="/register">
          <Button variant="gold" size="lg" className="gap-2">
            Créer mon compte gratuitement <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>

    {/* ── Footer ── */}
    <footer className="px-6 py-10 border-t text-center text-sm text-gray-400" style={{ borderColor: '#E0DDD7' }}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: '#1B3A5F' }}>
          <ShieldCheck className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-gray-600">CheckTunisia</span>
      </div>
      <p>© {new Date().getFullYear()} CheckTunisia. Tous droits réservés.</p>
      <p className="mt-1">Plateforme de conformité hôtelière — Tunis, Tunisie</p>
    </footer>

  </div>
);

import { useTranslation } from 'react-i18next';
import type { Mesure } from '@/api/observatoire';
import { formatMesure } from '@/lib/observatoire';

/**
 * Kit graphique de l'Observatoire — SVG pur, sans dependance externe (coherent
 * avec le reste du dashboard Qayed, qui trace ses graphiques a la main, et avec
 * la CSP stricte : aucun CDN, aucun script tiers). Palette = tokens Qayed.
 * Aucun emoji.
 */

const CACHET = '#5346A8';
const CACHET_CLAIR = '#8B7FE0';
const CONFORME = '#1F9D6B';
const ENCRE = '#10222E';
const LIGNE = '#DDD9CF';
const FICHE = '#8A94A0';

const num = (v: Mesure | null | undefined): number =>
  v === null || v === undefined || v === '<seuil' ? 0 : v;

// ── Serie temporelle double (arrivees + nuitees) ──────────────────────────────
export function LineChart({
  points,
  height = 220,
}: {
  points: Array<{ periode: string; arrivees: Mesure; nuitees: Mesure }>;
  height?: number;
}) {
  const { t } = useTranslation();
  const W = 640;
  const H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  if (points.length === 0) return <EmptyChart />;

  const maxA = Math.max(...points.map((p) => num(p.arrivees)), 1);
  const maxN = Math.max(...points.map((p) => num(p.nuitees)), 1);
  const max = Math.max(maxA, maxN);

  const x = (i: number) => pad.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.top + ih - (v / max) * ih;

  const path = (key: 'arrivees' | 'nuitees') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(num(p[key])).toFixed(1)}`).join(' ');

  const ticks = 4;
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }} role="img"
           aria-label={t('observatoire.charts.timeSeries')}>
        {/* grille horizontale */}
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = pad.top + (i / ticks) * ih;
          const val = Math.round(max * (1 - i / ticks));
          return (
            <g key={i}>
              <line x1={pad.left} y1={gy} x2={W - pad.right} y2={gy} stroke={LIGNE} strokeWidth={1} />
              <text x={pad.left - 6} y={gy + 3} textAnchor="end" fontSize={9} fill={FICHE}>{val}</text>
            </g>
          );
        })}
        {/* nuitees (aire douce) */}
        <path d={`${path('nuitees')} L ${x(points.length - 1)} ${pad.top + ih} L ${x(0)} ${pad.top + ih} Z`}
              fill={CACHET_CLAIR} opacity={0.12} />
        <path d={path('nuitees')} fill="none" stroke={CACHET_CLAIR} strokeWidth={2} />
        {/* arrivees */}
        <path d={path('arrivees')} fill="none" stroke={CACHET} strokeWidth={2.4} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(num(p.arrivees))} r={2.4} fill={CACHET} />
        ))}
        {/* labels X */}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill={FICHE}>
              {p.periode.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
      <ChartLegend items={[
        { color: CACHET, label: t('observatoire.kpi.arrivees') },
        { color: CACHET_CLAIR, label: t('observatoire.kpi.nuitees') },
      ]} />
    </div>
  );
}

// ── Barres horizontales (top nationalites) ────────────────────────────────────
export function HBarChart({
  items,
  langue = 'fr',
}: {
  items: Array<{ label: string; value: Mesure; variation?: number | null; iso?: string }>;
  langue?: string;
}) {
  if (items.length === 0) return <EmptyChart />;
  const max = Math.max(...items.map((i) => num(i.value)), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs font-medium" style={{ color: ENCRE }}>
            {it.label}
          </span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full" style={{ background: '#EEEBFA' }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${(num(it.value) / max) * 100}%`, background: CACHET }} />
          </div>
          <span className="w-16 shrink-0 text-end text-xs font-semibold" style={{ color: ENCRE }}>
            {formatMesure(it.value, langue)}
          </span>
          {it.variation !== undefined && (
            <span className="w-12 shrink-0 text-end text-[11px] font-medium"
                  style={{ color: (it.variation ?? 0) >= 0 ? CONFORME : ENCRE }}>
              {it.variation === null ? '—' : `${it.variation > 0 ? '+' : ''}${it.variation}%`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Donut (repartition par type) ──────────────────────────────────────────────
export function Donut({
  segments,
}: {
  segments: Array<{ label: string; value: number }>;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <EmptyChart />;

  const palette = [CACHET, CACHET_CLAIR, CONFORME, '#E3A008'];
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" width={140} height={140} role="img">
        <g transform="rotate(-90 70 70)">
          {segments.map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * C;
            const el = (
              <circle key={i} cx={70} cy={70} r={R} fill="none"
                      stroke={palette[i % palette.length]} strokeWidth={16}
                      strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} />
            );
            offset += dash;
            return el;
          })}
        </g>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: palette[i % palette.length] }} />
            <span style={{ color: ENCRE }}>{seg.label}</span>
            <span className="font-semibold" style={{ color: FICHE }}>
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heatmap mois x zone ───────────────────────────────────────────────────────
export function Heatmap({
  rows,
  moisLabels,
  langue = 'fr',
}: {
  rows: Array<{ label: string; valeurs: Mesure[] }>;
  moisLabels: string[];
  langue?: string;
}) {
  if (rows.length === 0) return <EmptyChart />;
  const max = Math.max(...rows.flatMap((r) => r.valeurs.map(num)), 1);

  // Papier registre -> violet cachet
  const couleur = (v: Mesure) => {
    if (v === '<seuil') return 'repeating-linear-gradient(45deg,#F6F5F1,#F6F5F1 3px,#EEEBFA 3px,#EEEBFA 6px)';
    const t = num(v) / max;
    // interpolation F6F5F1 -> 5346A8
    const from = [246, 245, 241];
    const to = [83, 70, 168];
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th />
            {moisLabels.map((m) => (
              <th key={m} className="pb-1 text-[10px] font-medium" style={{ color: FICHE, minWidth: 26 }}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="pe-2 text-end text-xs font-medium whitespace-nowrap" style={{ color: ENCRE }}>{r.label}</td>
              {r.valeurs.map((v, i) => (
                <td key={i}>
                  <div className="h-6 w-6 rounded" title={`${r.label} · ${moisLabels[i]}: ${formatMesure(v, langue)}`}
                       style={{ background: couleur(v) }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sparkline (12 mois) ───────────────────────────────────────────────────────
export function Sparkline({ values, width = 90, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-xs" style={{ color: FICHE }}>—</span>;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={CACHET} strokeWidth={1.5} />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function ChartLegend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="mt-2 flex items-center gap-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: FICHE }}>
          <span className="h-2 w-4 rounded-full" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  const { t } = useTranslation();
  return (
    <div className="flex h-32 items-center justify-center text-sm" style={{ color: FICHE }}>
      {t('observatoire.charts.empty')}
    </div>
  );
}

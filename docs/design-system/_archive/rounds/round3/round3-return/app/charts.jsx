/* ============================================================
   Zoetrop — round 3 chart language (Part B) — BAKED
   Decisions settled this round (do not relitigate without a
   new round): direction = "frames", tooltip = frame card,
   grid = sparse horizontal hairlines, band intensity 50%,
   status mapping = standard, ring sweep = --dur-ring (1600ms).

   RULES (the language):
   1. Structure is neutral — grids, tracks, axes use n-100/150.
      Horizontal hairlines only; never vertical gridlines.
   2. The data itself is Ink. Lines and value markers draw in
      var(--ink); judgment is never encoded in the line.
   3. Status (judgment) maps through the canonical tokens
      --optimal / --borderline / --deficient / --excess and is
      applied ONLY to bands, dots, badges and band tags.
   4. Axis labels are Space Mono, 10px, uppercase, muted.
      Units appear once (readout + tooltip), never on ticks.
   5. One tooltip pattern app-wide: the frame card.
   6. Empty = dot-grain + mono caption. Loading = hairline pulse.
   7. Rings/progress sweep ONCE on mount: --dur-ring, --ease-out,
      60ms stagger in grids. Updates transition at --dur-base.
   8. Every reading is a "frame": ringed dot + hairline frame
      tick to the baseline.
   9. The x-axis counts MILESTONES (M1, M2 …), not dates. Future
      milestones are trend projections: dashed ink line, hollow
      "ghost" frames, faint neutral wash + PROJECTED tag. A
      projection is never colored by status — judgment waits for
      a real reading.
   ============================================================ */

/* ---- Preview context (review-only: lets the Tweaks panel
   preview empty/loading states; 'data' in production) -------- */
const CHART_DEFAULTS = { chartState: 'data' };
const ChartTweaksCtx = React.createContext(CHART_DEFAULTS);
function useChartTweaks() { return React.useContext(ChartTweaksCtx); }

/* ---- Status helpers ---------------------------------------- */
function statusColor(status) {
  return {
    optimal: 'var(--optimal)',
    borderline: 'var(--borderline)',
    deficient: 'var(--deficient)',
    excess: 'var(--excess)',
  }[status] || 'var(--ink)';
}
function statusOf(value, m) {
  if (value < m.ref[0]) return 'deficient';
  if (value > m.ref[1]) return 'excess';
  if (value < m.opt[0] || value > m.opt[1]) return 'borderline';
  return 'optimal';
}

/* ============================================================
   Tooltip — the frame card (baked)
   ============================================================ */
function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload || {};
  const projected = row.kind === 'projected';
  const v = projected ? row.proj : row.value;
  if (v == null) return null;
  const st = statusOf(v, metric);
  return (
    <div className="zt-tip-frame">
      <div className="zt-tip-date">{label}{row.date ? ' · ' + row.date : projected ? ' · projected' : ''}</div>
      <div className="zt-tip-val">{projected ? '~' : ''}{v} <span className="zt-tip-unit">{metric.unit}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {projected ? (
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1px dashed var(--n-400)', display: 'inline-block', boxSizing: 'border-box' }}></span>
        ) : (
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(st), display: 'inline-block' }}></span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{projected ? 'trend · ' + st : st}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Empty / loading states
   ============================================================ */
function ChartEmpty({ height = 240, title = 'No readings yet', body = 'Your first frame starts with your next lab draw.' }) {
  return (
    <div className="zt-chart-empty" style={{ height }}>
      <div className="zt-eyebrow">{title}</div>
      <p>{body}</p>
    </div>
  );
}
function ChartLoading({ height = 240 }) {
  return (
    <div style={{ height, position: 'relative' }}>
      <div className="zt-chart-skel" style={{ position: 'absolute', inset: '12% 4%' }}>
        <span></span><span></span><span></span>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="zt-eyebrow" style={{ color: 'var(--text-faint)' }}>Loading frames…</span>
      </div>
    </div>
  );
}

/* ============================================================
   TrendChart — "frames" direction (baked)
   Every reading is a frame: ringed dot + hairline frame tick
   to the baseline. Optimal band as quiet tint with mono tag;
   reference bounds as dashed hairlines.
   ============================================================ */
const BAND_K = 0.5;   /* baked band intensity */
const PROJ_COUNT = 2; /* future milestones projected from trend */

/* linear trend fit over the last (up to) 4 readings */
function trendSlope(vals) {
  const k = Math.min(4, vals.length);
  const recent = vals.slice(-k);
  if (k < 2) return 0;
  const xm = (k - 1) / 2;
  const ym = recent.reduce((a, b) => a + b, 0) / k;
  let num = 0, den = 0;
  recent.forEach((v, x) => { num += (x - xm) * (v - ym); den += (x - xm) * (x - xm); });
  return den ? num / den : 0;
}

function TrendChart({ metric, height = 300 }) {
  const RC = window.Recharts;
  const tw = useChartTweaks();
  if (tw.chartState === 'empty') return <ChartEmpty height={height} />;
  if (tw.chartState === 'loading') return <ChartLoading height={height} />;
  if (!RC) return <ChartLoading height={height} />;

  const { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip: RCTooltip, ReferenceArea, ReferenceLine, ResponsiveContainer } = RC;

  const hist = metric.history || [];
  if (hist.length < 2) return <ChartEmpty height={height} />;
  const n = hist.length;

  /* milestone rows: actuals M1..Mn, then PROJ_COUNT projected
     milestones extrapolated from the recent trend. `proj` bridges
     at the last actual so the dashed line continues the solid one. */
  const histVals = hist.map(h => h.value);
  const dec = Math.min(2, Math.max(...histVals.map(v => (String(v).split('.')[1] || '').length)));
  const slope = trendSlope(histVals);
  const data = hist.map((h, i) => ({
    label: 'M' + (i + 1), date: h.date, kind: 'actual',
    value: h.value, proj: i === n - 1 ? h.value : null,
  }));
  for (let i = 1; i <= PROJ_COUNT; i++) {
    data.push({ label: 'M' + (n + i), date: null, kind: 'projected', value: null, proj: +(histVals[n - 1] + slope * i).toFixed(dec) });
  }

  const vals = data.map(d => (d.kind === 'projected' ? d.proj : d.value));
  const rawLo = Math.min(metric.opt[0], metric.ref[0], ...vals) * 0.93;
  const rawHi = Math.max(metric.opt[1], metric.ref[1], ...vals) * 1.07;
  /* nice axis bounds — round to a clean step so ticks read clean */
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(rawHi - rawLo, 0.001)))) / 2;
  const lo = Math.floor(rawLo / step) * step;
  const hi = Math.ceil(rawHi / step) * step;
  const plotBottom = height - 32; /* x-axis height ≈ 30 + 2 */

  const monoTick = { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)', letterSpacing: '0.06em' };
  const bandTag = (text, fill) => ({
    value: text, position: 'insideRight', fill,
    fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
  });

  const FrameDot = (props) => {
    const { cx, cy, index, payload } = props;
    if (!payload || payload.kind !== 'actual') return <g key={'d' + index}></g>;
    return (
      <g key={'d' + index}>
        <line x1={cx} y1={cy + 6} x2={cx} y2={plotBottom} stroke="var(--n-200)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={4.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={1.6} fill="var(--ink)" />
      </g>
    );
  };

  /* ghost frame: a future milestone — dashed ring, dashed tick */
  const GhostDot = (props) => {
    const { cx, cy, index, payload } = props;
    if (!payload || payload.kind !== 'projected') return <g key={'g' + index}></g>;
    return (
      <g key={'g' + index}>
        <line x1={cx} y1={cy + 6} x2={cx} y2={plotBottom} stroke="var(--n-200)" strokeWidth={1} strokeDasharray="2 3" />
        <circle cx={cx} cy={cy} r={4.5} fill="var(--surface)" stroke="var(--n-400)" strokeWidth={1.2} strokeDasharray="2.5 2.2" />
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 14, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--n-100)" vertical={false} />

        <ReferenceArea y1={metric.opt[0]} y2={metric.opt[1]} fill="var(--vital-200)" fillOpacity={0.3 * BAND_K} label={bandTag(`OPT ${metric.opt[0]}–${metric.opt[1]}`, 'var(--vital-500)')} />
        <ReferenceLine y={metric.ref[0]} stroke="var(--n-300)" strokeDasharray="4 4" strokeWidth={1} />
        <ReferenceLine y={metric.ref[1]} stroke="var(--n-300)" strokeDasharray="4 4" strokeWidth={1} label={bandTag(`REF ${metric.ref[0]}–${metric.ref[1]}`, 'var(--text-faint)')} />

        {/* projection zone: faint neutral wash from the last actual frame */}
        <ReferenceArea x1={'M' + n} x2={'M' + (n + PROJ_COUNT)} fill="var(--n-200)" fillOpacity={0.16}
          label={{ value: 'PROJECTED', position: 'insideTop', fill: 'var(--text-faint)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', dy: 4 }} />
        <ReferenceLine x={'M' + n} stroke="var(--n-300)" strokeDasharray="3 3" strokeWidth={1} />

        <XAxis dataKey="label" tick={monoTick} tickFormatter={(v) => String(v).toUpperCase()}
          axisLine={false} tickLine={false} dy={6} />
        <YAxis domain={[lo, hi]} tick={monoTick} axisLine={false} tickLine={false}
          width={44} tickCount={4}
          tickFormatter={(v) => ((hi - lo) >= 20 ? Math.round(v) : Math.round(v * 10) / 10)} />

        <RCTooltip
          content={<ChartTooltip metric={metric} />}
          cursor={{ stroke: 'var(--n-300)', strokeDasharray: '3 3' }}
          wrapperStyle={{ outline: 'none', zIndex: 10 }}
        />

        <Line type="monotone" dataKey="value"
          stroke="var(--ink)" strokeWidth={1.25}
          dot={FrameDot}
          activeDot={{ r: 5.5, fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 2 }}
          animationDuration={700} animationEasing="ease-out"
        />
        {/* projected trend — dashed continuation, ghost frames */}
        <Line type="monotone" dataKey="proj"
          stroke="var(--ink)" strokeWidth={1.25} strokeDasharray="5 4" strokeOpacity={0.45}
          dot={GhostDot}
          activeDot={{ r: 5, fill: 'var(--surface)', stroke: 'var(--n-400)', strokeWidth: 1.5 }}
          animationDuration={700} animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   Sparkline — ink line, last reading carries the status dot
   ============================================================ */
function Sparkline({ data, width = 46, height = 16, status }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => (typeof d === 'object' ? d.value : d));
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * (width - 4) + 2,
    height - 2 - ((v - min) / span) * (height - 4),
  ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"></path>
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={status ? statusColor(status) : 'var(--ink)'}></circle>
    </svg>
  );
}

/* ============================================================
   RangeBar — neutral track, tinted optimal band, ink marker
   ============================================================ */
function RangeBar({ m, height = 6, showEndpoints = false }) {
  const lo = Math.min(m.opt[0], m.ref[0], m.value) * 0.9;
  const hi = Math.max(m.opt[1], m.ref[1], m.value) * 1.1;
  const span = hi - lo || 1;
  const frac = (x) => Math.max(0, Math.min(1, (x - lo) / span));
  const refL = frac(m.ref[0]) * 100, refR = frac(m.ref[1]) * 100;
  const optL = frac(m.opt[0]) * 100, optR = frac(m.opt[1]) * 100;
  const vx = frac(m.value) * 100;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height, borderRadius: 'var(--radius-pill)', background: 'var(--n-100)' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: refL + '%', width: (refR - refL) + '%', background: 'var(--n-150)', borderRadius: 'var(--radius-pill)' }}></div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: optL + '%', width: (optR - optL) + '%', background: 'var(--vital-100)', borderRadius: 'var(--radius-pill)', boxShadow: 'inset 0 0 0 1px var(--vital-200)' }}></div>
        <div style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${vx}% - 1px)`, width: 2, borderRadius: 1, background: 'var(--ink)', boxShadow: '0 0 0 2px var(--surface)' }}></div>
      </div>
      {showEndpoints && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>
          <span>{m.ref[0]} {m.unit}</span><span>{m.ref[1]} {m.unit}</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PhaseBar — segmented timeline + optional current-day marker
   ============================================================ */
function PhaseBar({ phases, height = 14, showLabels = true, compact = false, day }) {
  const totalDays = phases.reduce((a, p) => a + (p.days || 1), 0);
  const dayPct = day != null ? Math.min(100, (day / totalDays) * 100) : null;
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 3, height }}>
          {phases.map((p) => {
            const completed = p.state === 'completed';
            const current = p.state === 'current';
            const bg = completed ? 'var(--vital-200)' : current ? 'var(--focus-100)' : 'var(--n-100)';
            return (
              <div key={p.id || p.name} title={p.name} style={{ flex: (p.days || 1) + ' 0 0', minWidth: 0 }}>
                <div style={{
                  height: '100%', background: bg, borderRadius: 'var(--radius-xs)',
                  boxShadow: current ? 'inset 0 0 0 1.5px var(--ink)' : 'none',
                  transition: 'background var(--dur-base) var(--ease-out)',
                }}></div>
              </div>
            );
          })}
        </div>
        {dayPct != null && (
          <div style={{ position: 'absolute', top: -4, bottom: -4, left: `calc(${dayPct}% - 1px)`, width: 2, borderRadius: 1, background: 'var(--ink)', boxShadow: '0 0 0 2px var(--surface)' }}></div>
        )}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
          {phases.map((p) => (
            <div key={(p.id || p.name) + '-l'} style={{ flex: (p.days || 1) + ' 0 0', minWidth: 0 }}>
              <div className="zt-eyebrow" style={{
                color: p.state === 'current' ? 'var(--ink)' : 'var(--text-faint)',
                fontWeight: p.state === 'current' ? 700 : 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontSize: compact ? '0.625rem' : 'var(--text-2xs)',
              }}>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MetricRing — sweeps once on mount (--dur-ring, --ease-out),
   60ms stagger via `delay` index. Updates transition at base.
   ============================================================ */
function MetricRing({ value, max = 100, status = 'optimal', size = 80, label, sublabel, delay = 0 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const [swept, setSwept] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setSwept(true), 30 + delay * 60);
    return () => clearTimeout(t);
  }, []);
  const dash = (swept ? pct : 0) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-100)" strokeWidth="5"></circle>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={statusColor(status)} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: `stroke-dasharray var(--dur-ring) var(--ease-out)` }}></circle>
      </svg>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="zt-tnum" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size > 64 ? 'var(--text-sm)' : 'var(--text-xs)', color: 'var(--text)', lineHeight: 1 }}>{label}</span>
          {sublabel && <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, letterSpacing: '0.06em' }}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ProgressBar — linear progress, same sweep rules as the ring
   ============================================================ */
function ProgressBar({ value, max = 100, status, height = 6, showReadout = false }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const [swept, setSwept] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setSwept(true), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height, borderRadius: 'var(--radius-pill)', background: 'var(--n-100)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: (swept ? pct * 100 : 0) + '%',
          background: status ? statusColor(status) : 'var(--ink)',
          borderRadius: 'var(--radius-pill)',
          transition: 'width var(--dur-ring) var(--ease-out)',
        }}></div>
      </div>
      {showReadout && (
        <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', flex: '0 0 auto' }}>{Math.round(pct * 100)}%</span>
      )}
    </div>
  );
}

/* ---- exports ------------------------------------------------ */
Object.assign(window, {
  CHART_DEFAULTS, ChartTweaksCtx, useChartTweaks,
  statusColor, statusOf,
  TrendChart, ChartTooltip, ChartEmpty, ChartLoading,
  Sparkline, RangeBar, PhaseBar, MetricRing, ProgressBar,
});

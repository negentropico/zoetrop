/* ============================================================
   Zoetrop redesign — shared lib: shell, router, primitives
   Exposes everything on window for the screen scripts.
   ============================================================ */
const { useState, useEffect, useRef, useMemo } = React;

/* ---------- status system (Q2 resolution) ------------------ */
const STATUS = {
  optimal:    { label: 'optimal',    color: 'var(--success)', bg: 'var(--vital-50)',  glyph: '✓', badge: 'success' },
  borderline: { label: 'borderline', color: 'var(--warning)', bg: 'var(--energy-50)', glyph: '~', badge: 'energy' },
  deficient:  { label: 'deficient',  color: 'var(--danger)',  bg: 'var(--danger-bg)', glyph: '↓', badge: 'danger' },
  excess:     { label: 'excess',     color: 'var(--excess)',  bg: 'var(--excess-bg)', glyph: '↑', badge: 'excess' },
};
const FAMILY_COLOR = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };

/* ---------- Lucide icon (built from icon data, React-safe) -- */
function lucideSvg(name, { size = 20, stroke = 2, color = 'currentColor' } = {}) {
  const L = window.lucide;
  if (!L) return '';
  const pascal = String(name).split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  let node = (L.icons && (L.icons[pascal] || L.icons[name])) || L[pascal];
  if (!node) return '';
  // lucide UMD shapes: a node may be [tag, attrs, children], or a bare list of
  // child nodes [[tag, attrs], ...], or an object with .children.
  let children;
  if (Array.isArray(node) && Array.isArray(node[0])) children = node;
  else if (Array.isArray(node) && typeof node[0] === 'string') children = node[2] || [];
  else if (node && node.children) children = node.children;
  else children = [];
  const body = (children || []).map(ch => {
    const tag = ch[0]; const attrs = ch[1] || {};
    const a = Object.keys(attrs).map(k => `${k}="${attrs[k]}"`).join(' ');
    return `<${tag} ${a} />`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
function Icon({ name, size = 20, stroke = 2, color = 'currentColor', style = {} }) {
  const html = useMemo(() => lucideSvg(name, { size, stroke, color }), [name, size, stroke, color]);
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flex: '0 0 auto', ...style }}
    dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- viewport hook ---------------------------------- */
function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { w, isMobile: w <= 760 };
}

/* ---------- hash router ------------------------------------ */
function useRoute() {
  const get = () => (window.location.hash.replace(/^#/, '') || '/');
  const [path, setPath] = useState(get());
  useEffect(() => {
    const on = () => { setPath(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
function navigate(to) { window.location.hash = to; }
function Link({ to, children, style = {}, className, ...rest }) {
  return <a href={'#' + to} className={className} style={{ textDecoration: 'none', color: 'inherit', ...style }} {...rest}>{children}</a>;
}

/* ---------- brand mark: Fibonacci spiral ------------------- */
function SpiralMark({ size = 26, color = 'var(--ink)' }) {
  // golden (φ) logarithmic spiral, anchored by an eye dot
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'block' }}>
      <path d="M44.49,63.16 L44.60,63.16 L44.71,63.17 L44.82,63.20 L44.93,63.23 L45.04,63.28 L45.15,63.34 L45.26,63.42 L45.36,63.50 L45.45,63.60 L45.54,63.72 L45.61,63.84 L45.68,63.97 L45.73,64.12 L45.77,64.27 L45.80,64.43 L45.81,64.60 L45.80,64.78 L45.77,64.96 L45.73,65.14 L45.66,65.32 L45.58,65.49 L45.47,65.67 L45.35,65.83 L45.20,65.99 L45.04,66.14 L44.85,66.28 L44.64,66.40 L44.42,66.50 L44.18,66.58 L43.93,66.64 L43.66,66.67 L43.39,66.68 L43.10,66.66 L42.82,66.61 L42.52,66.52 L42.23,66.41 L41.95,66.26 L41.67,66.08 L41.40,65.87 L41.15,65.62 L40.91,65.35 L40.70,65.04 L40.52,64.70 L40.36,64.33 L40.24,63.93 L40.16,63.52 L40.12,63.08 L40.12,62.63 L40.17,62.17 L40.26,61.70 L40.41,61.23 L40.61,60.76 L40.86,60.30 L41.17,59.85 L41.53,59.43 L41.94,59.02 L42.41,58.66 L42.93,58.33 L43.49,58.04 L44.10,57.81 L44.75,57.63 L45.43,57.51 L46.14,57.46 L46.88,57.49 L47.63,57.59 L48.39,57.77 L49.15,58.03 L49.91,58.38 L50.65,58.81 L51.36,59.33 L52.04,59.94 L52.68,60.64 L53.25,61.42 L53.77,62.28 L54.21,63.21 L54.56,64.21 L54.82,65.28 L54.98,66.40 L55.02,67.56 L54.95,68.76 L54.75,69.98 L54.42,71.22 L53.96,72.45 L53.35,73.67 L52.61,74.85 L51.72,76.00 L50.69,77.07 L49.53,78.07 L48.23,78.98 L46.81,79.78 L45.26,80.45 L43.61,80.98 L41.86,81.35 L40.02,81.56 L38.12,81.57 L36.17,81.40 L34.18,81.02 L32.18,80.42 L30.19,79.60 L28.23,78.56 L26.33,77.29 L24.52,75.78 L22.80,74.06 L21.23,72.11 L19.81,69.95 L18.58,67.58 L17.55,65.03 L16.77,62.31 L16.24,59.44 L16.00,56.43 L16.06,53.33 L16.44,50.15 L17.16,46.92 L18.23,43.69 L19.66,40.48 L21.45,37.34 L23.62,34.30 L26.16,31.40 L29.06,28.69 L32.31,26.21 L35.91,24.00 L39.82,22.10 L44.03,20.55 L48.51,19.40 L53.23,18.68 L58.14,18.43 L63.21,18.67 L68.38,19.44 L73.61,20.77 L78.83,22.67 L84.00,25.15"
        stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="44.49" cy="63.16" r="5.4" fill={color} />
    </svg>
  );
}

/* ---------- typographic helpers ---------------------------- */
function Eyebrow({ children, color = 'var(--text-muted)', style = {} }) {
  return <div className="zt-eyebrow" style={{ color, ...style }}>{children}</div>;
}
function PageHeader({ eyebrow, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--gap-lg)', flexWrap: 'wrap', marginBottom: 'var(--gap-2xl)' }}>
      <div>
        {eyebrow && <Eyebrow style={{ marginBottom: 10 }}>{eyebrow}</Eyebrow>}
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h1>
        {sub && <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-md)', maxWidth: 620 }}>{sub}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
function SectionLabel({ children, count, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--gap-lg)' }}>
      <Eyebrow>{children}{count != null && <span style={{ color: 'var(--text-faint)' }}>  ·  {count}</span>}</Eyebrow>
      {action}
    </div>
  );
}

/* ---------- status atoms ----------------------------------- */
function StatusDot({ status, size = 9 }) {
  const s = STATUS[status] || STATUS.optimal;
  return <span style={{ width: size, height: size, borderRadius: '50%', background: s.color, flex: '0 0 auto', display: 'inline-block' }} />;
}
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.optimal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
      letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 'var(--radius-pill)',
      color: s.color, background: s.bg, lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      <span aria-hidden style={{ fontSize: '1.05em' }}>{s.glyph}</span>{s.label}
    </span>
  );
}
// compact per-category status counts (dots + numbers)
function CountDots({ counts }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {ZD.statusOrder.filter(k => counts[k]).map(k => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          <StatusDot status={k} size={7} />{counts[k]}
        </span>
      ))}
    </div>
  );
}

/* ---------- category icon chip ----------------------------- */
function CatChip({ cat, size = 40, active = false }) {
  // neutral ink chip by default; brand family tint only where it belongs (Q1)
  const fam = cat.family ? FAMILY_COLOR[cat.family] : null;
  return (
    <span style={{
      width: size, height: size, borderRadius: 'var(--radius-md)', flex: '0 0 auto',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--ink)' : (fam ? cat.family && `var(--${cat.family}-50)` : 'var(--surface-2)'),
      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--border)'),
      color: active ? 'var(--n-50)' : (fam || 'var(--ink)'),
    }}>
      <Icon name={cat.icon} size={Math.round(size * 0.5)} stroke={1.9} />
    </span>
  );
}

/* ---------- sparkline -------------------------------------- */
function Sparkline({ data, width = 46, height = 16, color = 'var(--ink)' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => [ (i / (data.length - 1)) * (width - 2) + 1, height - 1 - ((v - min) / span) * (height - 2) ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} />
    </svg>
  );
}

/* ---------- range bar (NEW component) ---------------------- */
function RangeBar({ m, height = 8, showEndpoints = false }) {
  const frac = (x) => Math.max(0, Math.min(1, (x - m.min) / (m.max - m.min)));
  const refL = frac(m.ref[0]) * 100, refR = frac(m.ref[1]) * 100;
  const optL = frac(m.opt[0]) * 100, optR = frac(m.opt[1]) * 100;
  const vx = frac(m.value) * 100;
  const tick = (STATUS[m.status] || STATUS.optimal).color;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height, borderRadius: 'var(--radius-pill)', background: 'var(--n-100)', overflow: 'visible' }}>
        {/* reference band (warm mist) */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: refL + '%', width: (refR - refL) + '%', background: 'var(--n-150)', borderRadius: 'var(--radius-pill)' }} />
        {/* optimal band (soft teal) */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: optL + '%', width: (optR - optL) + '%', background: 'var(--vital-100)', borderRadius: 'var(--radius-pill)' }} />
        {/* value tick */}
        <div style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${vx}% - 1.5px)`, width: 3, borderRadius: 2, background: 'var(--ink)', boxShadow: '0 0 0 2px var(--surface)' }} />
        <div style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${vx}% - 1.5px)`, width: 3, borderRadius: 2, background: tick, opacity: 0.0 }} />
      </div>
      {showEndpoints && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          <span>{m.min} {m.unit}</span><span>{m.max} {m.unit}</span>
        </div>
      )}
    </div>
  );
}
function RangeLegend() {
  const sw = (c) => <span style={{ width: 14, height: 8, borderRadius: 4, background: c, display: 'inline-block' }} />;
  return (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
      <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>{sw('var(--vital-100)')} Optimal</span>
      <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>{sw('var(--n-150)')} Reference</span>
      <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ width: 3, height: 12, background: 'var(--ink)', borderRadius: 2, display: 'inline-block' }} /> Value</span>
    </div>
  );
}

/* ---------- segmented phase bar (NEW, shared 01/05/06) ----- */
function PhaseBar({ phases, height = 14, showLabels = true, compact = false }) {
  const total = phases.reduce((a, p) => a + (p.days || 1), 0);
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, height }}>
        {phases.map((p) => {
          const completed = p.state === 'completed';
          const current = p.state === 'current';
          const bg = completed ? 'var(--vital)' : current ? 'var(--focus-50)' : 'var(--n-150)';
          const border = current ? '2px solid var(--ink)' : '2px solid transparent';
          return (
            <div key={p.id || p.name} title={p.name} style={{ flex: (p.days || 1) + ' 0 0', position: 'relative' }}>
              <div style={{ height: '100%', background: bg, border, borderRadius: 'var(--radius-xs)', transition: 'background var(--dur-base) var(--ease-out)' }} />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {phases.map((p) => (
            <div key={(p.id || p.name) + '-l'} style={{ flex: (p.days || 1) + ' 0 0', minWidth: 0 }}>
              <div className="zt-eyebrow" style={{
                color: p.state === 'current' ? 'var(--ink)' : 'var(--text-muted)',
                fontWeight: p.state === 'current' ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontSize: compact ? '0.625rem' : 'var(--text-2xs)',
              }}>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- trend chart (NEW, brand-tokened) --------------- */
function TrendChart({ metric, width = 760, height = 300 }) {
  const m = metric;
  const hist = (m.history ? m.history.slice().reverse() : m.spark.map((v, i) => ({ date: 'M' + (i + 1), value: v })));
  const pad = { l: 46, r: 64, t: 24, b: 34 };
  const innerW = width - pad.l - pad.r, innerH = height - pad.t - pad.b;
  const vals = hist.map(h => h.value);
  const lo = Math.min(m.opt[0], m.ref[0], ...vals) * 0.92;
  const hi = Math.max(m.opt[1], ...vals, (m.targets ? Math.max(m.targets.q1, m.targets.q2) : 0)) * 1.06;
  const span = hi - lo || 1;
  const x = (i) => pad.l + (hist.length === 1 ? innerW / 2 : (i / (hist.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - ((v - lo) / span) * innerH;
  const linePts = hist.map((h, i) => [x(i), y(h.value)]);
  const lineD = linePts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  // line draws via CSS keyframe (definite visible end-state); dots/labels always visible
  const [grow, setGrow] = useState(1);
  const yticks = [lo + span * 0.08, lo + span * 0.5, hi - span * 0.04];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible', fontFamily: 'var(--font-mono)' }}>
      {/* optimal band */}
      <rect x={pad.l} y={y(m.opt[1])} width={innerW} height={Math.max(0, y(m.opt[0]) - y(m.opt[1]))} fill="var(--vital-50)" />
      <text x={pad.l + innerW - 4} y={y(m.opt[1]) + 13} textAnchor="end" fontSize="10" fill="var(--vital-500)" style={{ letterSpacing: '0.08em' }}>OPTIMAL</text>
      {/* reference band outline */}
      <rect x={pad.l} y={y(m.ref[1])} width={innerW} height={Math.max(0, y(m.ref[0]) - y(m.ref[1]))} fill="none" stroke="var(--n-200)" strokeWidth="1" strokeDasharray="3 4" />
      {/* y grid + labels */}
      {yticks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={pad.l + innerW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={pad.l - 10} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">{v.toFixed(1)}</text>
        </g>
      ))}
      {/* targets (dashed amber) */}
      {m.targets && (
        <g>
          {[['q1', m.targets.q1], ['q2', m.targets.q2]].map(([k, tv], i) => (
            <g key={k}>
              <circle cx={pad.l + innerW + (i === 0 ? 20 : 44)} cy={y(tv)} r="3.5" fill="var(--energy-400)" />
              <text x={pad.l + innerW + (i === 0 ? 20 : 44)} y={y(tv) - 9} textAnchor="middle" fontSize="10" fill="var(--energy-600)">{tv}</text>
            </g>
          ))}
          <line x1={linePts[linePts.length - 1][0]} y1={linePts[linePts.length - 1][1]} x2={pad.l + innerW + 20} y2={y(m.targets.q1)} stroke="var(--energy-400)" strokeWidth="1.5" strokeDasharray="4 4" />
        </g>
      )}
      {/* actual line — CSS keyframe sweep, rests fully drawn */}
      <path d={lineD} fill="none" stroke="var(--ink)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" className="zt-draw" />
      {linePts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
          <text x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize="11" fill="var(--ink)">{hist[i].value}</text>
        </g>
      ))}
      {/* x labels */}
      {hist.map((h, i) => (
        <text key={i} x={x(i)} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{h.date.replace(',', '')}</text>
      ))}
    </svg>
  );
}

/* ---------- data table (NEW component) --------------------- */
function DataTable({ columns, rows, rowKey }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                textAlign: c.align || 'left', padding: '0 16px 12px', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 400, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={rowKey ? rowKey(r, ri) : ri} className="zt-trow">
              {columns.map(c => (
                <td key={c.key} style={{
                  textAlign: c.align || 'left', padding: '15px 16px', borderBottom: '1px solid var(--border)',
                  fontFamily: c.mono ? 'var(--font-mono)' : 'var(--font-text)',
                  fontVariantNumeric: c.mono ? 'tabular-nums' : 'normal',
                  fontSize: 'var(--text-sm)', color: 'var(--text)', whiteSpace: c.wrap ? 'normal' : 'nowrap',
                  width: c.width,
                }}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- nav / shell ------------------------------------ */
const NAV = [
  { to: '/', label: 'Dashboard', icon: 'layout-grid', match: (p) => p === '/' },
  { to: '/metrics', label: 'Metrics', icon: 'activity', match: (p) => p.startsWith('/metrics') },
  { to: '/protocol', label: 'Protocol', icon: 'list-checks', match: (p) => p.startsWith('/protocol') },
  { to: '/insights/correlations', label: 'Insights', icon: 'git-compare', match: (p) => p.startsWith('/insights') },
  { to: '/import/whoop', label: 'Import', icon: 'download', match: (p) => p.startsWith('/import') },
];

function Wordmark() {
  return (
    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <SpiralMark size={26} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        zoetrop<span style={{ color: 'var(--accent)' }}>.</span>
      </span>
    </Link>
  );
}

/* ---------- theme toggle ----------------------------------- */
function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const toggle = () => setTheme(prev => {
    const next = prev === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('zt-theme', next); } catch (e) {}
    return next;
  });
  return { theme, toggle };
}
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button type="button" className="zt-theme-toggle" onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}>
      <Icon name={dark ? 'sun' : 'moon'} size={19} stroke={1.9} />
    </button>
  );
}

function TopNav({ path }) {
  return (
    <header className="zt-topnav">
      <div className="zt-topnav-inner">
        <Wordmark />
        <div className="zt-topnav-right">
          <nav className="zt-topnav-links">
            {NAV.map(n => {
              const active = n.match(path);
              return (
                <Link key={n.to} to={n.to} className="zt-navlink" style={{
                  color: active ? 'var(--ink)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 500,
                }}>
                  {n.label}
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: -19, height: 2, borderRadius: 2, background: active ? 'var(--ink)' : 'transparent' }} />
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
function BottomTab({ path }) {
  return (
    <nav className="zt-bottomtab">
      {NAV.map(n => {
        const active = n.match(path);
        return (
          <Link key={n.to} to={n.to} className="zt-tabitem" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
            <Icon name={n.icon} size={22} stroke={active ? 2.3 : 1.9} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
function AppShell({ path, children, wide = false }) {
  return (
    <div>
      <TopNav path={path} />
      <main className="zt-main" style={{ maxWidth: wide ? 1280 : 1180 }}>{children}</main>
      <footer style={{ borderTop: '1px solid var(--border)', marginTop: 24 }}>
        <div style={{ maxWidth: wide ? 1280 : 1180, margin: '0 auto', padding: '22px var(--gap-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' }}>
            <SpiralMark size={16} color="var(--text-faint)" /> zoetrop · brand roundtrip
          </span>
          <Link to="/about" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Redesign decisions →</Link>
        </div>
      </footer>
      <BottomTab path={path} />
      <div className="zt-bottompad" />
    </div>
  );
}

/* ---------- misc ------------------------------------------- */
function Crumb({ items }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--gap-lg)' }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: 'var(--text-faint)' }}>/</span>}
          {it.to ? <Link to={it.to} style={{ color: 'var(--text-secondary)' }}>{it.label}</Link> : <span style={{ color: 'var(--ink)' }}>{it.label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

const _DS = window.ZoetropDesignSystem_48aebc || {};
Object.assign(window, {
  useState, useEffect, useRef, useMemo, useViewport, useRoute, navigate, Link,
  STATUS, FAMILY_COLOR, Icon, lucideSvg, SpiralMark, Eyebrow, PageHeader, SectionLabel,
  StatusDot, StatusBadge, CountDots, CatChip, Sparkline, RangeBar, RangeLegend, PhaseBar,
  TrendChart, DataTable, TopNav, BottomTab, AppShell, Wordmark, Crumb, NAV,
  ZCard: _DS.Card,
});

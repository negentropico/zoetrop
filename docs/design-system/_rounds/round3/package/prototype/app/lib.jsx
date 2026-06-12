/* ============================================================
   Zoetrop — round 3 prototype shared lib
   Left-nav chrome (zn-* classes), hash router, primitives.
   Mirrors the real app idioms — do NOT import TSX or remix.
   All exports attached to window for the screen scripts.
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============================================================
   Status system
   ============================================================ */
const STATUS = {
  optimal:    { label: 'optimal',    color: 'var(--success)', bg: 'var(--vital-50)',  glyph: '✓', badge: 'success' },
  borderline: { label: 'borderline', color: 'var(--warning)', bg: 'var(--energy-50)', glyph: '~', badge: 'energy' },
  deficient:  { label: 'deficient',  color: 'var(--danger)',  bg: 'var(--danger-bg)', glyph: '↓', badge: 'danger' },
  excess:     { label: 'excess',     color: 'var(--excess)',  bg: 'var(--excess-bg)', glyph: '↑', badge: 'excess' },
};

/* ============================================================
   Lucide icon helper (UMD → SVG via dangerouslySetInnerHTML)
   ============================================================ */
function lucideSvg(name, { size = 20, stroke = 2, color = 'currentColor' } = {}) {
  const L = window.lucide;
  if (!L) return '';
  const pascal = String(name).split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  let node = (L.icons && (L.icons[pascal] || L.icons[name])) || L[pascal];
  if (!node) return '';
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
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flex: '0 0 auto', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ============================================================
   Viewport hook
   ============================================================ */
function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { w, isMobile: w <= 760 };
}

/* ============================================================
   Hash router
   ============================================================ */
function useRoute() {
  const get = () => (window.location.hash.replace(/^#/, '') || '/dashboard');
  const [path, setPath] = useState(get());
  useEffect(() => {
    const on = () => { setPath(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
function navigate(to) { window.location.hash = to; }
function Link({ to, children, className, style = {}, ...rest }) {
  return (
    <a href={'#' + to} className={className} style={{ textDecoration: 'none', color: 'inherit', ...style }} {...rest}>
      {children}
    </a>
  );
}

/* ============================================================
   Theme toggle (mirrors app ThemeToggle + localStorage key)
   ============================================================ */
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

/* ============================================================
   Brand mark — Fibonacci spiral (same as real SpiralMark.tsx)
   ============================================================ */
function SpiralMark({ size = 24, color = 'var(--ink)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'block', flex: '0 0 auto' }}>
      <path d="M44.49,63.16 L44.60,63.16 L44.71,63.17 L44.82,63.20 L44.93,63.23 L45.04,63.28 L45.15,63.34 L45.26,63.42 L45.36,63.50 L45.45,63.60 L45.54,63.72 L45.61,63.84 L45.68,63.97 L45.73,64.12 L45.77,64.27 L45.80,64.43 L45.81,64.60 L45.80,64.78 L45.77,64.96 L45.73,65.14 L45.66,65.32 L45.58,65.49 L45.47,65.67 L45.35,65.83 L45.20,65.99 L45.04,66.14 L44.85,66.28 L44.64,66.40 L44.42,66.50 L44.18,66.58 L43.93,66.64 L43.66,66.67 L43.39,66.68 L43.10,66.66 L42.82,66.61 L42.52,66.52 L42.23,66.41 L41.95,66.26 L41.67,66.08 L41.40,65.87 L41.15,65.62 L40.91,65.35 L40.70,65.04 L40.52,64.70 L40.36,64.33 L40.24,63.93 L40.16,63.52 L40.12,63.08 L40.12,62.63 L40.17,62.17 L40.26,61.70 L40.41,61.23 L40.61,60.76 L40.86,60.30 L41.17,59.85 L41.53,59.43 L41.94,59.02 L42.41,58.66 L42.93,58.33 L43.49,58.04 L44.10,57.81 L44.75,57.63 L45.43,57.51 L46.14,57.46 L46.88,57.49 L47.63,57.59 L48.39,57.77 L49.15,58.03 L49.91,58.38 L50.65,58.81 L51.36,59.33 L52.04,59.94 L52.68,60.64 L53.25,61.42 L53.77,62.28 L54.21,63.21 L54.56,64.21 L54.82,65.28 L54.98,66.40 L55.02,67.56 L54.95,68.76 L54.75,69.98 L54.42,71.22 L53.96,72.45 L53.35,73.67 L52.61,74.85 L51.72,76.00 L50.69,77.07 L49.53,78.07 L48.23,78.98 L46.81,79.78 L45.26,80.45 L43.61,80.98 L41.86,81.35 L40.02,81.56 L38.12,81.57 L36.17,81.40 L34.18,81.02 L32.18,80.42 L30.19,79.60 L28.23,78.56 L26.33,77.29 L24.52,75.78 L22.80,74.06 L21.23,72.11 L19.81,69.95 L18.58,67.58 L17.55,65.03 L16.77,62.31 L16.24,59.44 L16.00,56.43 L16.06,53.33 L16.44,50.15 L17.16,46.92 L18.23,43.69 L19.66,40.48 L21.45,37.34 L23.62,34.30 L26.16,31.40 L29.06,28.69 L32.31,26.21 L35.91,24.00 L39.82,22.10 L44.03,20.55 L48.51,19.40 L53.23,18.68 L58.14,18.43 L63.21,18.67 L68.38,19.44 L73.61,20.77 L78.83,22.67 L84.00,25.15"
        stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="44.49" cy="63.16" r="5.4" fill={color} />
    </svg>
  );
}

/* ============================================================
   NAV_TREE — mirrors nav-tree.ts, inline for the prototype
   ============================================================ */
const NAV_TREE = [
  {
    id: 'dashboard', label: 'Dashboard', icon: 'layout-grid',
    base: '/dashboard', exact: true, children: [],
  },
  {
    id: 'metrics', label: 'Metrics', icon: 'activity', base: '/metrics',
    children: [
      { label: 'All categories', to: '/metrics', end: true },
      { label: 'Vitamins',        to: '/metrics/vitamins' },
      { label: 'Minerals',        to: '/metrics/minerals' },
      { label: 'Inflammatory',    to: '/metrics/inflammatory' },
      { label: 'Metabolic',       to: '/metrics/metabolic' },
      { label: 'Hormones',        to: '/metrics/hormones' },
      { label: 'Autonomic',       to: '/metrics/autonomic' },
      { label: 'Body Composition',to: '/metrics/bodyComposition' },
      { label: 'Lipids',          to: '/metrics/lipids' },
      { label: 'Hematology',      to: '/metrics/hematology' },
    ],
  },
  {
    id: 'protocol', label: 'Protocol', icon: 'list-checks', base: '/protocol',
    children: [
      { label: 'Overview',     to: '/protocol', end: true },
      { label: 'Versions',     to: '/protocol/versions' },
      { label: 'Supplements',  to: '/protocol/supplements' },
      { label: 'Cessation',    to: '/protocol/cessation' },
      { label: 'Compare',      to: '/protocol/compare' },
    ],
  },
  {
    id: 'insights', label: 'Insights', icon: 'git-compare', base: '/insights',
    children: [
      { label: 'Overview',     to: '/insights', end: true },
      { label: 'Correlations', to: '/insights/correlations' },
      { label: 'Genetics',     to: '/insights/genetics' },
    ],
  },
  {
    id: 'import', label: 'Import', icon: 'download', base: '/import',
    children: [
      { label: 'Overview', to: '/import', end: true },
      { label: 'WHOOP',    to: '/import/whoop' },
      { label: 'Vault',    to: '/import/vault' },
    ],
  },
  {
    id: 'ingest', label: 'Ingest', icon: 'file-up', base: '/ingest',
    children: [
      { label: 'Overview', to: '/ingest', end: true },
      { label: 'Upload',   to: '/ingest/upload' },
      { label: 'Review',   to: '/ingest/review' },
    ],
  },
];

function groupOfPath(path) {
  return NAV_TREE.find(g => path === g.base || path.startsWith(g.base + '/')) || null;
}
function isChildActive(path, ch) {
  if (ch.end) return path === ch.to;
  return path === ch.to || path.startsWith(ch.to + '/');
}

/* ============================================================
   Sidebar (left-nav, zn-* classes from app.css)
   ============================================================ */
function Sidebar({ path, collapsed, onToggleCollapsed, mobileOpen, onMobileClose }) {
  const activeGroup = groupOfPath(path);
  const [open, setOpen] = useState(() => activeGroup ? { [activeGroup.id]: true } : {});

  // Re-open the active group on navigation
  useEffect(() => {
    if (activeGroup) setOpen({ [activeGroup.id]: true });
    else setOpen({});
  }, [path]);

  const toggleGroup = (id) => setOpen(prev => prev[id] ? {} : { [id]: true });

  /* flyout for collapsed rail */
  const [fly, setFly] = useState(null);
  const flyTimer = useRef(null);
  const cancelClose = () => { if (flyTimer.current) { clearTimeout(flyTimer.current); flyTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); flyTimer.current = setTimeout(() => setFly(null), 180); };
  const openFly = (g, e) => { cancelClose(); const r = e.currentTarget.getBoundingClientRect(); setFly({ id: g.id, top: r.top - 8 }); };
  useEffect(() => { setFly(null); }, [collapsed, path]);

  const { isMobile } = useViewport();
  const railMode = collapsed && !isMobile;

  /* Expanded accordion item */
  const renderExpandedGroup = (g) => {
    const kids = (g.children || []).filter(c => !c.hidden);
    const sectionActive = path === g.base || path.startsWith(g.base + '/');
    const isOpen = !!open[g.id];

    if (kids.length === 0) {
      const active = g.exact ? path === g.base : sectionActive;
      return (
        <Link key={g.id} to={g.base}
          className={'zn-row' + (active ? ' is-active' : '')}
          onClick={isMobile ? onMobileClose : undefined}
        >
          <Icon name={g.icon} size={19} stroke={active ? 2.1 : 1.8} />
          <span className="zn-label">{g.label}</span>
        </Link>
      );
    }
    return (
      <div key={g.id} className="zn-group">
        <button
          type="button"
          onClick={() => toggleGroup(g.id)}
          className={'zn-row' + (sectionActive ? ' is-section' : '')}
        >
          <Icon name={g.icon} size={19} stroke={sectionActive ? 2.1 : 1.8} />
          <span className="zn-label">{g.label}</span>
          <span className="zn-chev" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <Icon name="chevron-down" size={15} stroke={2} />
          </span>
        </button>
        <div className="zn-kids" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
          <div className="zn-kids-inner">
            {kids.map(ch => (
              <Link
                key={ch.to}
                to={ch.to}
                className={'zn-child' + (isChildActive(path, ch) ? ' is-active' : '')}
                tabIndex={isOpen ? 0 : -1}
                onClick={isMobile ? onMobileClose : undefined}
              >
                {ch.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* Collapsed rail item */
  const renderRailItem = (g) => {
    const kids = (g.children || []).filter(c => !c.hidden);
    const sectionActive = path === g.base || path.startsWith(g.base + '/');
    const isFly = fly && fly.id === g.id;
    const cls = 'zn-rail-item' + (sectionActive ? ' is-active' : '') + (isFly ? ' is-fly' : '');
    if (kids.length === 0) {
      return <Link key={g.id} to={g.base} className={cls} title={g.label}><Icon name={g.icon} size={20} stroke={sectionActive ? 2.2 : 1.8} /></Link>;
    }
    return (
      <button key={g.id} type="button" className={cls} title={g.label}
        onMouseEnter={(e) => openFly(g, e)} onMouseLeave={scheduleClose}
        onClick={(e) => { if (isFly) setFly(null); else openFly(g, e); }}
      >
        <Icon name={g.icon} size={20} stroke={sectionActive ? 2.2 : 1.8} />
      </button>
    );
  };

  const flyGroup = fly ? (NAV_TREE.find(g => g.id === fly.id) || null) : null;
  const { theme, toggle } = useTheme();

  return (
    <>
      <aside
        className={'zn-side' + (railMode ? ' is-collapsed' : '') + (mobileOpen ? ' is-mobile-open' : '')}
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="zn-head">
          <Link to="/dashboard" className="zn-brand" aria-label="Zoetrop home">
            <SpiralMark size={24} />
            <span className="zn-label zn-wordmark">
              zoetrop<span style={{ color: 'var(--accent)' }}>.</span>
            </span>
          </Link>
          <button type="button" className="zn-collapse" onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Icon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={17} stroke={1.8} />
          </button>
        </div>

        {/* Nav */}
        <nav className="zn-nav" aria-label="Primary">
          {railMode ? NAV_TREE.map(renderRailItem) : NAV_TREE.map(renderExpandedGroup)}
        </nav>

        {/* Footer — theme toggle + account stub */}
        <div className="zn-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px' }}>
            <div className="zn-avatar" style={{ flexShrink: 0 }}>M</div>
            {!railMode && (
              <div className="zn-account-name" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Owner</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>owner@example.com</div>
              </div>
            )}
            <button type="button" className="zt-theme-toggle" onClick={toggle}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} stroke={1.8} />
            </button>
          </div>
        </div>

        {/* Flyout (rail mode) */}
        {railMode && flyGroup && fly && (
          <div className="zn-flyout" style={{ top: fly.top }}
            onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
            <div className="zn-flyout-title">{flyGroup.label}</div>
            {(flyGroup.children || []).filter(c => !c.hidden).map(ch => (
              <Link key={ch.to} to={ch.to}
                className={'zn-flyout-item' + (isChildActive(path, ch) ? ' is-active' : '')}
                onClick={() => setFly(null)}>
                {ch.label}
              </Link>
            ))}
          </div>
        )}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && <div className="zn-mobile-backdrop" onClick={onMobileClose} />}
    </>
  );
}

/* ============================================================
   AppShell — wraps sidebar + main content
   ============================================================ */
function AppShell({ path, children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('zn-collapsed') === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isMobile } = useViewport();

  const onToggleCollapsed = () => setCollapsed(prev => {
    const next = !prev;
    try { localStorage.setItem('zn-collapsed', next ? '1' : '0'); } catch {}
    return next;
  });

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  return (
    <div className={'zn-app' + (collapsed && !isMobile ? ' is-collapsed' : '')}>
      {/* Mobile top bar */}
      <div className="zn-topbar">
        <button type="button" onClick={() => setMobileOpen(true)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Icon name="menu" size={22} stroke={1.8} />
        </button>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SpiralMark size={22} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            zoetrop<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </Link>
      </div>

      <Sidebar
        path={path}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="zn-main">
        <div className="zn-page">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PageHeader — mirrors PageHeader.tsx exactly
   eyebrow row (left) + breadcrumb (right) above the h1
   ============================================================ */
function PageHeader({ eyebrow, crumb, title, sub, right }) {
  return (
    <div style={{ marginBottom: 'var(--gap-2xl)' }}>
      {(eyebrow || crumb) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gap-lg)', marginBottom: 8 }}>
          {eyebrow
            ? <div className="zt-eyebrow">{eyebrow}</div>
            : <div />}
          {crumb && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {crumb.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color: 'var(--text-faint)' }}>/</span>}
                  {c.to ? <Link to={c.to} style={{ color: 'var(--text-secondary)' }}>{c.label}</Link> : <span style={{ color: 'var(--ink)' }}>{c.label}</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--gap-lg)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
          {sub && <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-md)', maxWidth: 620 }}>{sub}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Status atoms
   ============================================================ */
function StatusDot({ status, size = 9 }) {
  const s = STATUS[status] || STATUS.optimal;
  return <span style={{ width: size, height: size, borderRadius: '50%', background: s.color, flex: '0 0 auto', display: 'inline-block' }} />;
}
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.optimal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 'var(--radius-pill)',
      color: s.color, background: s.bg, lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      <span aria-hidden style={{ fontSize: '1.05em' }}>{s.glyph}</span>{s.label}
    </span>
  );
}
function CountDots({ counts }) {
  const order = ['optimal','borderline','deficient','excess'];
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {order.filter(k => counts[k]).map(k => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          <StatusDot status={k} size={7} />{counts[k]}
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   Sparkline
   ============================================================ */
function Sparkline({ data, width = 46, height = 16, color = 'var(--ink)' }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => (typeof d === 'object' ? d.value : d));
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * (width - 2) + 1,
    height - 1 - ((v - min) / span) * (height - 2),
  ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} />
    </svg>
  );
}

/* ============================================================
   RangeBar — value marker on reference/optimal range track
   ============================================================ */
function RangeBar({ m, height = 8, showEndpoints = false }) {
  const lo = Math.min(m.opt[0], m.ref[0], m.value) * 0.9;
  const hi = Math.max(m.opt[1], m.ref[1], m.value) * 1.1;
  const span = hi - lo || 1;
  const frac = (x) => Math.max(0, Math.min(1, (x - lo) / span));
  const refL = frac(m.ref[0]) * 100, refR = frac(m.ref[1]) * 100;
  const optL = frac(m.opt[0]) * 100, optR = frac(m.opt[1]) * 100;
  const vx = frac(m.value) * 100;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height, borderRadius: 'var(--radius-pill)', background: 'var(--n-100)', overflow: 'visible' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: refL + '%', width: (refR - refL) + '%', background: 'var(--n-150)', borderRadius: 'var(--radius-pill)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: optL + '%', width: (optR - optL) + '%', background: 'var(--vital-100)', borderRadius: 'var(--radius-pill)' }} />
        <div style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${vx}% - 1.5px)`, width: 3, borderRadius: 2, background: 'var(--ink)', boxShadow: '0 0 0 2px var(--surface)' }} />
      </div>
      {showEndpoints && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          <span>{m.ref[0]} {m.unit}</span><span>{m.ref[1]} {m.unit}</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PhaseBar — segmented timeline (cessation phases)
   ============================================================ */
function PhaseBar({ phases, height = 14, showLabels = true, compact = false }) {
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
   MetricRing — radial progress ring with center label
   ============================================================ */
function MetricRing({ value, max = 100, status = 'optimal', size = 80, label, sublabel }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = pct * circ;
  const s = STATUS[status] || STATUS.optimal;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--n-150)" strokeWidth="6" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`} />
        </svg>
        {label && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size > 64 ? 'var(--text-sm)' : 'var(--text-xs)', color: 'var(--text)', lineHeight: 1 }}>{label}</span>
            {sublabel && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   DataTable — sortable typed data table (mirrors DataTable.tsx)
   ============================================================ */
function DataTable({ columns, rows, rowKey }) {
  const [sort, setSort] = useState(null); // { key, dir: 'asc'|'desc' }
  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key];
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort]);

  const onSort = (key) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return null;
    });
  };

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key}
                onClick={c.sortable !== false ? () => onSort(c.key) : undefined}
                style={{
                  textAlign: c.align || 'left', padding: '0 16px 12px', whiteSpace: 'nowrap', cursor: c.sortable !== false ? 'pointer' : 'default',
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 400, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                  userSelect: 'none',
                }}>
                {c.label}
                {sort && sort.key === c.key && <span style={{ marginLeft: 4 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, ri) => (
            <tr key={rowKey ? rowKey(r, ri) : ri} className="zt-trow">
              {columns.map(c => (
                <td key={c.key} style={{
                  textAlign: c.align || 'left', padding: '14px 16px', borderBottom: '1px solid var(--border)',
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

/* ============================================================
   Recharts TrendChart — mirrors TrendChart.tsx idiom
   Uses window.Recharts UMD: LineChart, ReferenceArea, Tooltip, etc.
   ============================================================ */
function TrendChart({ metric, height = 300 }) {
  const RC = window.Recharts;
  if (!RC) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Recharts loading…</div>;

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip: RCTooltip, ReferenceArea, ResponsiveContainer, ReferenceLine } = RC;

  const data = (metric.history || []).map(h => ({ date: h.date, value: h.value }));
  const vals = data.map(d => d.value);
  const lo = Math.min(metric.opt[0], metric.ref[0], ...vals) * 0.93;
  const hi = Math.max(metric.opt[1], metric.ref[1], ...vals) * 1.07;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const v = payload[0].value;
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '8px 12px',
        boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{v} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{metric.unit}</span></div>
      </div>
    );
  };

  const CustomDot = (props) => {
    const { cx, cy } = props;
    return <circle cx={cx} cy={cy} r={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        {/* Reference range band */}
        <ReferenceArea y1={metric.ref[0]} y2={metric.ref[1]} fill="var(--n-150)" fillOpacity={0.25} />
        {/* Optimal range band */}
        <ReferenceArea y1={metric.opt[0]} y2={metric.opt[1]} fill="var(--vital-100)" fillOpacity={0.5} label={{ value: 'optimal', position: 'insideTopRight', fontSize: 10, fill: 'var(--vital-500)', fontFamily: 'var(--font-mono)' }} />
        <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis domain={[lo, hi]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={44} />
        <RCTooltip content={<CustomTooltip />} />
        <Line
          type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={2.25}
          dot={<CustomDot />} activeDot={{ r: 6, fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 2 }}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   Export all primitives to window
   ============================================================ */
Object.assign(window, {
  // React hooks
  useState, useEffect, useRef, useMemo, useCallback,
  // Viewport + router
  useViewport, useRoute, navigate, Link,
  // Status
  STATUS, StatusDot, StatusBadge, CountDots,
  // Primitives
  Icon, lucideSvg, SpiralMark,
  // Layout
  PageHeader, AppShell, Sidebar,
  // Charts + data components
  Sparkline, RangeBar, PhaseBar, MetricRing, DataTable, TrendChart,
  // Nav tree
  NAV_TREE, groupOfPath, isChildActive,
});

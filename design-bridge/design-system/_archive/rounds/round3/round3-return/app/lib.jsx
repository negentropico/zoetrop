/* ============================================================
   Zoetrop — round 3 return: shared lib
   Left-nav chrome (zn-* classes), hash router, primitives.
   Shell + nav are BAKED (round 2) — visuals untouched.
   Chart components live in charts.jsx (Part B).
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============================================================
   Status system — reads the canonical status tokens (new.css)
   ============================================================ */
const STATUS = {
  optimal:    { label: 'optimal',    color: 'var(--optimal)',    bg: 'var(--optimal-bg)',    glyph: '✓' },
  borderline: { label: 'borderline', color: 'var(--borderline)', bg: 'var(--borderline-bg)', glyph: '~' },
  deficient:  { label: 'deficient',  color: 'var(--deficient)',  bg: 'var(--deficient-bg)',  glyph: '↓' },
  excess:     { label: 'excess',     color: 'var(--excess)',     bg: 'var(--excess-bg)',     glyph: '↑' },
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
    ></span>
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
      { label: 'Phasing',      to: '/protocol/cessation' },
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
    id: 'ingest', label: 'Ingest', icon: 'file-up', base: '/ingest',
    children: [
      { label: 'Overview', to: '/ingest', end: true },
      { label: 'Lab PDFs', to: '/ingest/upload' },
      { label: 'WHOOP',    to: '/import/whoop' },
      { label: 'Vault',    to: '/import/vault' },
      { label: 'Review',   to: '/ingest/review' },
    ],
  },
];

function groupOfPath(path) {
  /* /import/* routes are aliases that live under the combined
     Ingest group (round 3 consolidation) */
  if (path === '/import' || path.startsWith('/import/')) {
    return NAV_TREE.find(g => g.id === 'ingest') || null;
  }
  return NAV_TREE.find(g => path === g.base || path.startsWith(g.base + '/')) || null;
}
function isChildActive(path, ch) {
  if (ch.end) return path === ch.to;
  return path === ch.to || path.startsWith(ch.to + '/');
}

/* ============================================================
   Sidebar (left-nav, zn-* classes from app.css) — BAKED, as-is
   ============================================================ */
function Sidebar({ path, collapsed, onToggleCollapsed, mobileOpen, onMobileClose }) {
  const activeGroup = groupOfPath(path);
  const [open, setOpen] = useState(() => activeGroup ? { [activeGroup.id]: true } : {});

  useEffect(() => {
    if (activeGroup) setOpen({ [activeGroup.id]: true });
    else setOpen({});
  }, [path]);

  const toggleGroup = (id) => setOpen(prev => prev[id] ? {} : { [id]: true });

  const [fly, setFly] = useState(null);
  const flyTimer = useRef(null);
  const cancelClose = () => { if (flyTimer.current) { clearTimeout(flyTimer.current); flyTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); flyTimer.current = setTimeout(() => setFly(null), 180); };
  const openFly = (g, e) => { cancelClose(); const r = e.currentTarget.getBoundingClientRect(); setFly({ id: g.id, top: r.top - 8 }); };
  useEffect(() => { setFly(null); }, [collapsed, path]);

  const { isMobile } = useViewport();
  const railMode = collapsed && !isMobile;

  const renderExpandedGroup = (g) => {
    const kids = (g.children || []).filter(c => !c.hidden);
    const sectionActive = activeGroup && activeGroup.id === g.id;
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

  const renderRailItem = (g) => {
    const kids = (g.children || []).filter(c => !c.hidden);
    const sectionActive = activeGroup && activeGroup.id === g.id;
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

        <nav className="zn-nav" aria-label="Primary">
          {railMode ? NAV_TREE.map(renderRailItem) : NAV_TREE.map(renderExpandedGroup)}
        </nav>

        <div className="zn-foot">
          {/* round 5 (closing): the review-only PUBLIC links were
              stripped — public routes live outside the app shell.
              For review, reach them directly: #/ and #/login. */}
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

      {mobileOpen && <div className="zn-mobile-backdrop" onClick={onMobileClose}></div>}
    </>
  );
}

/* ============================================================
   AppShell — wraps sidebar + main content (BAKED)
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

  useEffect(() => { setMobileOpen(false); }, [path]);

  return (
    <div className={'zn-app' + (collapsed && !isMobile ? ' is-collapsed' : '')}>
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
   PageHeader — FIXED pattern (meta row: eyebrow left / crumb
   right, then the title row). Round 3 condensed masthead:
   eyebrow row top-aligns with the sidebar logo row (new.css
   page padding); sub sits inline on the title baseline; the
   right slot shares the title row.
   ============================================================ */
function PageHeader({ eyebrow, crumb, title, sub, right }) {
  return (
    <header style={{ marginBottom: 'var(--gap-section)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gap-lg)', marginBottom: 14, minHeight: 17 }}>
        {eyebrow
          ? <div className="zt-eyebrow">{eyebrow}</div>
          : <div></div>}
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--gap-lg)', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>{title}</h1>
        {sub && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)', flex: '1 1 auto', minWidth: 0, textWrap: 'pretty' }}>{sub}</p>}
        {right && <div style={{ marginLeft: 'auto', alignSelf: 'center', flex: '0 1 auto', minWidth: 0 }}>{right}</div>}
      </div>
    </header>
  );
}

/* ============================================================
   Status atoms
   ============================================================ */
function StatusDot({ status, size = 9, style = {} }) {
  const s = STATUS[status] || STATUS.optimal;
  return <span style={{ width: size, height: size, borderRadius: '50%', background: s.color, flex: '0 0 auto', display: 'inline-block', ...style }}></span>;
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
      <span aria-hidden="true" style={{ fontSize: '1.05em' }}>{s.glyph}</span>{s.label}
    </span>
  );
}
function CountDots({ counts }) {
  const order = ['optimal','borderline','deficient','excess'];
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {order.filter(k => counts[k]).map(k => (
        <span key={k} className="zt-tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          <StatusDot status={k} size={7} />{counts[k]}
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   DataTable — sortable typed data table (mirrors DataTable.tsx)
   Round 3: row padding rides the density scale; header hairline.
   ============================================================ */
function DataTable({ columns, rows, rowKey }) {
  const [sort, setSort] = useState(null);
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
                  textAlign: c.align || 'left', padding: 'var(--gap-row) 16px', whiteSpace: 'nowrap', cursor: c.sortable !== false ? 'pointer' : 'default',
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
                  textAlign: c.align || 'left', padding: 'var(--gap-row) 16px',
                  borderBottom: ri < sorted.length - 1 ? '1px solid var(--border)' : 'none',
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
   Export all primitives to window
   ============================================================ */
Object.assign(window, {
  useState, useEffect, useRef, useMemo, useCallback,
  useViewport, useRoute, navigate, Link, useTheme,
  STATUS, StatusDot, StatusBadge, CountDots,
  Icon, lucideSvg, SpiralMark,
  PageHeader, AppShell, Sidebar,
  DataTable,
  NAV_TREE, groupOfPath, isChildActive,
});

/* ============================================================
   Zoetrop — left navigation prototype
   Sidebar: expanded tiers, collapsed icon rail, flyout submenus.
   Interaction model (baked): single open group, parent click
   expands, flyout on hover, comfortable density, metric
   categories shown in nav.
   Depends on app/lib.jsx (Icon, SpiralMark, navigate) and
   app/data.js (ZD.categories).
   ============================================================ */

/* ---------- nav model (tier 1 → tier 2) -------------------- */
function buildNavTree() {
  const cats = (window.ZD && window.ZD.categories) || [];
  return [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', base: '/', exact: true },
    {
      id: 'metrics', label: 'Metrics', icon: 'activity', base: '/metrics',
      children: [
        { label: 'All categories', to: '/metrics' },
        ...cats.map(c => ({ label: c.name, to: '/metrics/' + c.id })),
      ],
    },
    {
      id: 'protocol', label: 'Protocol', icon: 'list-checks', base: '/protocol',
      children: [
        { label: 'Overview', to: '/protocol' },
        { label: 'Versions', to: '/protocol/versions' },
        { label: 'Supplements', to: '/protocol/supplements' },
        { label: 'Cessation', to: '/protocol/cessation' },
        { label: 'Compare', to: '/protocol/compare' },
      ],
    },
    {
      id: 'insights', label: 'Insights', icon: 'git-compare', base: '/insights',
      children: [
        { label: 'Overview', to: '/insights' },
        { label: 'Correlations', to: '/insights/correlations' },
        { label: 'Genetics', to: '/insights/genetics' },
      ],
    },
    {
      id: 'import', label: 'Import', icon: 'download', base: '/import',
      children: [
        { label: 'Overview', to: '/import' },
        { label: 'WHOOP', to: '/import/whoop' },
        { label: 'Vault', to: '/import/vault' },
      ],
    },
  ];
}

function groupOfPath(tree, path) {
  if (path === '/' || path === '') return tree[0];
  return tree.find(g => !g.exact && path.startsWith(g.base)) || tree[0];
}

/* ---------- plain link (no inline color override) ----------- */
function NLink({ to, className, children, onClick, ...rest }) {
  return <a href={'#' + to} className={className} onClick={onClick} {...rest}>{children}</a>;
}

/* ---------- theme ------------------------------------------ */
function useThemeLocal() {
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
   Flyout panel (collapsed rail) — fixed-positioned, clamped.
   ============================================================ */
function Flyout({ group, top, path, onEnter, onLeave, onNavigate }) {
  const ref = useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vh = window.innerHeight;
    const h = el.offsetHeight;
    const t = Math.max(10, Math.min(top, vh - h - 10));
    el.style.top = t + 'px';
  }, [group, top]);
  return (
    <div ref={ref} className="zn-flyout" style={{ top }} onMouseEnter={onEnter} onMouseLeave={onLeave}
      role="menu" aria-label={group.label}>
      <div className="zn-flyout-title">{group.label}</div>
      {(group.children || []).map(ch => {
        const active = path === ch.to;
        return (
          <NLink key={ch.to} to={ch.to} className={'zn-flyout-item' + (active ? ' is-active' : '')}
            onClick={onNavigate} role="menuitem">
            {ch.label}
          </NLink>
        );
      })}
    </div>
  );
}

/* ============================================================
   Account popover (footer) — owns the theme control.
   ============================================================ */
function AccountMenu({ collapsed, onClose, theme, onTheme }) {
  return (
    <div className={'zn-account-menu' + (collapsed ? ' is-rail' : '')}>
      <div className="zn-account-head">
        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>test</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>test@test.com</div>
        <span className="zn-role">Practitioner</span>
      </div>
      <div className="zn-account-sep"></div>
      <button type="button" className="zn-menu-item" onClick={onClose}>
        <Icon name="user" size={16} stroke={1.9} /> Account settings
      </button>
      <button type="button" className="zn-menu-item" onClick={() => { onTheme(); }}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} stroke={1.9} />
        {theme === 'dark' ? 'Light theme' : 'Dark theme'}
      </button>
      <div className="zn-account-sep"></div>
      <button type="button" className="zn-menu-item is-danger" onClick={onClose}>
        <Icon name="log-out" size={16} stroke={1.9} /> Sign out
      </button>
    </div>
  );
}

/* ============================================================
   Sidebar
   ============================================================ */
function Sidebar({ path, collapsed, setCollapsed }) {
  const tree = useMemo(() => buildNavTree(), []);
  const activeGroup = groupOfPath(tree, path);

  /* open group (single-open accordion) */
  const [open, setOpen] = useState(() => ({ [activeGroup.id]: true }));
  useEffect(() => { setOpen({ [activeGroup.id]: true }); }, [path, activeGroup.id]);
  const toggleGroup = (id) => setOpen(prev => (prev[id] ? {} : { [id]: true }));

  /* flyout state (collapsed rail, opens on hover) */
  const [fly, setFly] = useState(null); // { id, top }
  const flyTimer = useRef(null);
  const cancelClose = () => { if (flyTimer.current) { clearTimeout(flyTimer.current); flyTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); flyTimer.current = setTimeout(() => setFly(null), 180); };
  const openFly = (g, e) => {
    cancelClose();
    const r = e.currentTarget.getBoundingClientRect();
    setFly({ id: g.id, top: r.top - 8 });
  };
  useEffect(() => { setFly(null); }, [collapsed, path]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setFly(null); setAccount(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* account popover */
  const [account, setAccount] = useState(false);
  useEffect(() => { setAccount(false); }, [collapsed]);
  const { theme, toggle: toggleTheme } = useThemeLocal();

  /* ---------- expanded row ---------- */
  const renderExpandedGroup = (g) => {
    const hasKids = !!(g.children && g.children.length);
    const sectionActive = g === activeGroup;
    const isOpen = !!open[g.id];

    if (!hasKids) {
      const active = path === g.base || (g.exact && path === '/');
      return (
        <NLink key={g.id} to={g.base}
          className={'zn-row' + (active ? ' is-active' : '')}>
          <Icon name={g.icon} size={19} stroke={active ? 2.1 : 1.8} />
          <span className="zn-label">{g.label}</span>
        </NLink>
      );
    }
    return (
      <div key={g.id} className="zn-group">
        <button type="button" onClick={() => toggleGroup(g.id)}
          className={'zn-row' + (sectionActive ? ' is-section' : '')}
          aria-expanded={isOpen}>
          <Icon name={g.icon} size={19} stroke={sectionActive ? 2.1 : 1.8} />
          <span className="zn-label">{g.label}</span>
          <span className="zn-chev" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <Icon name="chevron-down" size={15} stroke={2} />
          </span>
        </button>
        <div className="zn-kids" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }} aria-hidden={!isOpen}>
          <div className="zn-kids-inner">
            {g.children.map(ch => {
              const active = path === ch.to;
              return (
                <NLink key={ch.to} to={ch.to} className={'zn-child' + (active ? ' is-active' : '')} tabIndex={isOpen ? 0 : -1}>
                  {ch.label}
                </NLink>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ---------- collapsed rail item ---------- */
  const renderRailItem = (g) => {
    const hasKids = !!(g.children && g.children.length);
    const sectionActive = g === activeGroup;
    const cls = 'zn-rail-item' + (sectionActive ? ' is-active' : '') + (fly && fly.id === g.id ? ' is-fly' : '');

    if (!hasKids) {
      return (
        <NLink key={g.id} to={g.base} className={cls} title={g.label} aria-label={g.label}>
          <Icon name={g.icon} size={20} stroke={sectionActive ? 2.2 : 1.8} />
        </NLink>
      );
    }
    return (
      <button key={g.id} type="button" className={cls} aria-label={g.label} aria-haspopup="menu"
        onMouseEnter={(e) => openFly(g, e)} onMouseLeave={scheduleClose}
        onClick={(e) => { (fly && fly.id === g.id) ? setFly(null) : openFly(g, e); }}>
        <Icon name={g.icon} size={20} stroke={sectionActive ? 2.2 : 1.8} />
      </button>
    );
  };

  const flyGroup = fly ? tree.find(g => g.id === fly.id) : null;

  return (
    <aside className={'zn-side' + (collapsed ? ' is-collapsed' : '')}>
      {/* header */}
      <div className="zn-head">
        <NLink to="/" className="zn-brand" aria-label="Zoetrop home">
          <SpiralMark size={24} />
          <span className="zn-label zn-wordmark">zoetrop<span style={{ color: 'var(--accent)' }}>.</span></span>
        </NLink>
        <button type="button" className="zn-collapse" onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}>
          <Icon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={17} stroke={1.8} />
        </button>
      </div>

      {/* nav */}
      <nav className="zn-nav" aria-label="Primary">
        {collapsed ? tree.map(renderRailItem) : tree.map(renderExpandedGroup)}
      </nav>

      {/* footer — account only; theme lives inside the menu */}
      <div className="zn-foot">
        <div className="zn-account-wrap">
          <button type="button" className={'zn-account' + (account ? ' is-open' : '')} onClick={() => setAccount(a => !a)}
            aria-expanded={account} aria-haspopup="menu" title="Account">
            <span className="zn-avatar">T</span>
            <span className="zn-label zn-account-name">
              <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--text-sm)', lineHeight: 1.2 }}>test</span>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Practitioner</span>
            </span>
            <span className="zn-account-chev">
              <Icon name="chevrons-up-down" size={15} stroke={1.8} />
            </span>
          </button>
          {account && <AccountMenu collapsed={collapsed} theme={theme} onTheme={toggleTheme} onClose={() => setAccount(false)} />}
        </div>
      </div>

      {/* flyout */}
      {collapsed && flyGroup && (
        <Flyout group={flyGroup} top={fly.top} path={path}
          onEnter={cancelClose} onLeave={scheduleClose}
          onNavigate={() => setFly(null)} />
      )}
      {account && <div className="zn-fly-backdrop" onClick={() => setAccount(false)}></div>}
    </aside>
  );
}

Object.assign(window, { Sidebar, buildNavTree, groupOfPath });

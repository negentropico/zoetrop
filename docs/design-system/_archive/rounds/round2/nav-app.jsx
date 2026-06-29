/* ============================================================
   Zoetrope — left-nav prototype: shell, placeholder pages, mount
   Interaction model is baked in (see nav/sidebar.jsx):
   single open group · parent click expands · hover flyout ·
   comfortable density · metric categories in nav.
   ============================================================ */

/* ---------- placeholder page ------------------------------- */
function GhostBlock({ h = 120, label }) {
  return (
    <div className="zn-ghost" style={{ minHeight: h }}>
      {label && <span className="zn-ghost-label">{label}</span>}
    </div>
  );
}

function PlaceholderPage({ group, child, path }) {
  const isOverview = !child || child.to === group.base;
  const title = isOverview ? group.label : child.label;
  const crumb = [{ label: 'zoetrope', to: '/' }, { label: group.label, to: group.base }];
  if (!isOverview) crumb.push({ label: child.label });
  const routeTag = (path === '/' ? '/dashboard' : path);
  return (
    <div data-screen-label={title}>
      {group.id !== 'dashboard' && <Crumb items={crumb} />}
      <PageHeader
        eyebrow={group.id === 'dashboard' ? "Today's frame · Jun 10, 2026" : group.label}
        title={title}
        sub={'Placeholder frame — content unchanged from the current design. This prototype evaluates the navigation only.'}
      />
      <div className="zn-grid-4">
        <GhostBlock h={110} /><GhostBlock h={110} /><GhostBlock h={110} /><GhostBlock h={110} />
      </div>
      <GhostBlock h={340} label={'PLACEHOLDER · ' + routeTag.toUpperCase()} />
    </div>
  );
}

/* ---------- app -------------------------------------------- */
function NavProtoApp() {
  const path = useRoute();

  const [collapsed, setCollapsedRaw] = useState(() => {
    try { return localStorage.getItem('zt-navproto-collapsed') === '1'; } catch (e) { return false; }
  });
  const setCollapsed = (v) => {
    setCollapsedRaw(v);
    try { localStorage.setItem('zt-navproto-collapsed', v ? '1' : '0'); } catch (e) {}
  };

  const tree = useMemo(() => buildNavTree(), []);
  const group = groupOfPath(tree, path);
  let child = null;
  if (group.children) {
    child = group.children.find(c => c.to === path) || null;
    if (!child && path !== group.base) child = { label: prettySeg(path), to: path };
  }

  return (
    <div className="zn-app">
      <Sidebar path={path} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="zn-main" style={{ marginLeft: collapsed ? 'var(--zn-rail-w)' : 'var(--zn-side-w)' }}>
        <div className="zn-page">
          <PlaceholderPage group={group} child={child} path={path} />
        </div>
      </main>
    </div>
  );
}

function prettySeg(path) {
  const seg = path.split('/').filter(Boolean).pop() || '';
  return seg.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

ReactDOM.createRoot(document.getElementById('root')).render(<NavProtoApp />);

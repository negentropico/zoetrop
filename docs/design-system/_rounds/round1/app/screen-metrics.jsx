/* Screens 02 + 03 — Metrics overview & Category (shared left nav) */
const { Card: ZCard } = window.ZoetropeDesignSystem_48aebc;

/* left section nav — reused by category + detail (Q4: scrolls horizontally on mobile) */
function CategoryNav({ activeCat }) {
  const { isMobile } = useViewport();
  const items = [{ id: null, name: 'All categories', icon: 'layout-grid' }].concat(ZD.categories);
  if (isMobile) {
    return (
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 10px', margin: '0 0 16px', WebkitOverflowScrolling: 'touch' }}>
        {items.map(c => {
          const active = activeCat === (c.id || null);
          const to = c.id ? '/metrics/' + c.id : '/metrics';
          return (
            <Link key={c.id || 'all'} to={to} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 'var(--radius-pill)',
              whiteSpace: 'nowrap', flex: '0 0 auto', fontSize: 'var(--text-sm)', fontWeight: 600,
              background: active ? 'var(--ink)' : 'var(--surface)', color: active ? 'var(--n-50)' : 'var(--text-secondary)',
              border: '1px solid ' + (active ? 'var(--ink)' : 'var(--border)'),
            }}>
              <Icon name={c.icon} size={16} stroke={1.9} />{c.name}
            </Link>
          );
        })}
      </div>
    );
  }
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 92 }}>
      {items.map(c => {
        const active = activeCat === (c.id || null);
        const to = c.id ? '/metrics/' + c.id : '/metrics';
        return (
          <Link key={c.id || 'all'} to={to} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-base)', fontWeight: active ? 600 : 500,
            background: active ? 'var(--surface)' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--text-secondary)',
            border: '1px solid ' + (active ? 'var(--border)' : 'transparent'),
            boxShadow: active ? 'var(--shadow-xs)' : 'none',
          }} className="zt-navrow">
            <Icon name={c.icon} size={18} stroke={1.9} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}

/* one metric row — links to detail */
function MetricRow({ m }) {
  const { isMobile } = useViewport();
  const to = '/metrics/' + m.category + '/' + m.id;
  if (isMobile) {
    return (
      <Link to={to}>
        <div className="zt-mrow" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusDot status={m.status} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{m.name}</span>
            <span className="zt-tnum" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)' }}>{m.value.toLocaleString()}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.unit}</span>
          </div>
          <RangeBar m={m} />
        </div>
      </Link>
    );
  }
  return (
    <Link to={to}>
      <div className="zt-mrow" style={{ display: 'grid', gridTemplateColumns: '18px minmax(120px,1.4fr) 46px minmax(120px,1.6fr) 132px', alignItems: 'center', gap: 16, padding: '12px 12px' }}>
        <StatusDot status={m.status} />
        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
        <Sparkline data={m.spark} />
        <RangeBar m={m} />
        <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)' }}>{m.value.toLocaleString()}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginLeft: 6, textTransform: 'uppercase' }}>{m.unit}</span>
        </span>
      </div>
    </Link>
  );
}

function FilterPill({ active, label, count, status, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--radius-pill)',
      cursor: 'pointer', fontFamily: 'var(--font-text)', fontSize: 'var(--text-sm)', fontWeight: 600,
      background: active ? 'var(--ink)' : 'var(--surface)', color: active ? 'var(--n-50)' : 'var(--text-secondary)',
      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--border)'), transition: 'all var(--dur-fast) var(--ease-out)',
    }}>
      {status && <StatusDot status={status} size={8} />}
      {label}
      <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', opacity: active ? 0.85 : 0.6 }}>{count}</span>
    </button>
  );
}

function CategorySection({ cat, filter }) {
  const rows = cat.metrics.filter(m => filter === 'all' || m.status === filter);
  if (!rows.length) return null;
  return (
    <ZCard padding="md" style={{ marginBottom: 'var(--gap-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <CatChip cat={cat} size={34} />
        <Link to={'/metrics/' + cat.id} style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'var(--text-lg)' }}>{cat.name}</Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{cat.tracked}</span>
        <div style={{ marginLeft: 'auto' }}><CountDots counts={cat.counts} /></div>
      </div>
      {rows.map(m => <MetricRow key={m.id} m={m} />)}
    </ZCard>
  );
}

function MetricsLayout({ path, activeCat, children }) {
  const { isMobile } = useViewport();
  return (
    <AppShell path={path}>
      {isMobile ? (
        <>
          {children.header}
          <CategoryNav activeCat={activeCat} />
          {children.body}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: 'var(--gap-2xl)', alignItems: 'start' }}>
          <CategoryNav activeCat={activeCat} />
          <div style={{ minWidth: 0 }}>
            {children.header}
            {children.body}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MetricsScreen({ path }) {
  const [filter, setFilter] = useState('all');
  const t = ZD.statusTotals;
  const header = (
    <PageHeader eyebrow="Your last lab frame" title="All metrics" sub={ZD.metricsCount + ' metrics across ' + ZD.categoryCount + ' categories.'} />
  );
  const body = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--gap-xl)' }}>
        <FilterPill active={filter === 'all'} label="All" count={ZD.metricsCount} onClick={() => setFilter('all')} />
        {ZD.statusOrder.map(k => <FilterPill key={k} active={filter === k} label={STATUS[k].label} status={k} count={t[k]} onClick={() => setFilter(k)} />)}
      </div>
      {ZD.categories.map(cat => <CategorySection key={cat.id} cat={cat} filter={filter} />)}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginTop: 'var(--gap-lg)', padding: '0 8px' }}>
        <RangeLegend />
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          <Sparkline data={[2, 3, 2.4, 3.6, 4]} width={32} height={12} /> Recent trend
        </span>
      </div>
    </>
  );
  return <MetricsLayout path={path} activeCat={null}>{{ header, body }}</MetricsLayout>;
}

function CategoryScreen({ path, catId }) {
  const cat = ZD.findCategory(catId);
  if (!cat) return <MetricsScreen path={path} />;
  const [filter, setFilter] = useState('all');
  const header = (
    <>
      <Crumb items={[{ label: 'Metrics', to: '/metrics' }, { label: cat.name }]} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--gap-xl)' }}>
        <CatChip cat={cat} size={52} />
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600 }}>{cat.name}</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{cat.desc}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }} className="zt-hide-mobile">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.tracked} tracked</span>
          <CountDots counts={cat.counts} />
        </div>
      </div>
    </>
  );
  const body = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--gap-lg)' }}>
        <FilterPill active={filter === 'all'} label="All" count={cat.tracked} onClick={() => setFilter('all')} />
        {ZD.statusOrder.filter(k => cat.counts[k]).map(k => <FilterPill key={k} active={filter === k} label={STATUS[k].label} status={k} count={cat.counts[k]} onClick={() => setFilter(k)} />)}
      </div>
      <ZCard padding="md">
        {cat.metrics.filter(m => filter === 'all' || m.status === filter).map(m => <MetricRow key={m.id} m={m} />)}
      </ZCard>
      <div style={{ marginTop: 'var(--gap-lg)', padding: '0 8px' }}><RangeLegend /></div>
    </>
  );
  return <MetricsLayout path={path} activeCat={catId}>{{ header, body }}</MetricsLayout>;
}

Object.assign(window, { MetricsScreen, CategoryScreen, CategoryNav, MetricRow });

/* ============================================================
   Zoetrop — round 3 return: screens
   One component per Part A route, all using AppShell + PageHeader.
   Polish pass: airier rhythm (density-scaled), frame cards
   (.zt-card), pills, mono micro-labels, chart language from
   charts.jsx applied consistently.
   ============================================================ */

/* ---- Frame card helper (maps to app Card.tsx) -------------- */
function Card({ children, style = {}, pad = true, hover = false }) {
  return (
    <div className={'zt-card' + (hover ? ' zt-card-hover' : '')}
      style={{ ...(pad ? {} : { padding: 0, overflow: 'hidden' }), ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, count, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--gap-lg)' }}>
      <div className="zt-eyebrow">
        {children}
        {count != null && <span style={{ color: 'var(--text-faint)' }}>  ·  {count}</span>}
      </div>
      {action}
    </div>
  );
}

function IconTile({ name, size = 40, bg = 'var(--surface-sunken)', color = 'currentColor' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
      <Icon name={name} size={Math.round(size / 2)} stroke={1.8} color={color} />
    </div>
  );
}

/* Mono delta readout vs previous reading */
function Delta({ m }) {
  const h = m.history || [];
  if (h.length < 2) return null;
  const d = +(h[h.length - 1].value - h[h.length - 2].value).toFixed(2);
  const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→';
  return (
    <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
      {arrow} {d > 0 ? '+' : ''}{d} since M{h.length - 1}
    </span>
  );
}

/* ============================================================
   Dashboard (/dashboard)
   ============================================================ */
function DashboardScreen({ path }) {
  const { cessationPhases, cessationDay, cessationTarget, categories } = window.ZD;
  const currentPhase = cessationPhases.find(p => p.state === 'current') || cessationPhases[0];
  const pastTarget = cessationDay - cessationTarget;

  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Overview" title="Dashboard" sub={`Phasing day ${cessationDay} · 46 markers across 9 categories`} />

      {/* Cessation hero */}
      <section className="zt-section">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: 'var(--gap-2xl)', alignItems: 'center' }} className="zt-hero-grid">
            <div>
              <div className="zt-eyebrow" style={{ marginBottom: 12 }}>Phasing · P4</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="zt-readout" style={{ fontSize: 'var(--text-4xl)', color: 'var(--ink)' }}>{cessationDay}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>/ {cessationTarget} DAYS</span>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 12 }}>
                <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{currentPhase.name}</strong> — {currentPhase.description}
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {pastTarget > 0 ? `${pastTarget} days past target` : `${-pastTarget} days to target`}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <PhaseBar phases={cessationPhases} height={16} day={cessationDay} />
              <div style={{ marginTop: 14, textAlign: 'right' }}>
                <Link to="/protocol/cessation" className="zt-link">Full timeline <Icon name="arrow-right" size={14} stroke={2} /></Link>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Metric categories */}
      <section className="zt-section">
        <SectionLabel count={9}>Metric categories</SectionLabel>
        <div className="zt-grid-3">
          {categories.map(cat => {
            const markers = window.ZD.metrics[cat.id] || [];
            const optimal = cat.counts.optimal || 0;
            return (
              <Link key={cat.id} to={`/metrics/${cat.id}`} style={{ display: 'flex' }}>
                <Card hover style={{ cursor: 'pointer', flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)' }}>
                  <IconTile name={cat.icon} size={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{cat.label}</div>
                    <div className="zt-tnum" style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{markers.length} markers · {optimal} optimal</div>
                  </div>
                  {/* frame strip (round 4, matches /metrics): one dot per marker */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 110 }}>
                    {markers.map(m => <StatusDot key={m.id} status={m.status} size={10} />)}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent highlights */}
      <section className="zt-section">
        <SectionLabel>Recent highlights</SectionLabel>
        <div className="zt-grid-4">
          {[
            window.ZD.metrics.autonomic[0],
            window.ZD.metrics.vitamins[0],
            window.ZD.metrics.lipids[1],
            window.ZD.metrics.hormones[0],
          ].map(m => (
            <Card key={m.id}>
              <div className="zt-eyebrow" style={{ marginBottom: 10 }}>{m.name}</div>
              <div className="zt-readout" style={{ fontSize: 'var(--text-xl)', color: 'var(--ink)', marginBottom: 8 }}>
                {m.value} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{m.unit}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                <Delta m={m} />
                <Sparkline data={m.history} width={64} height={18} status={m.status} />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

/* ============================================================
   Metrics overview (/metrics)
   ============================================================ */
/* Round 4 (owner pick, exploration A "frame strip"): the % ring
   implied progress toward a 100% that never comes and sat frozen
   between draws. Replaced with one status dot PER MARKER — every
   marker a frame; reads composition, not completion. */
function MetricsScreen({ path }) {
  const { categories } = window.ZD;
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Health metrics" title="Metrics" sub="9 categories · 46 tracked markers" />
      <div className="zt-grid-3">
        {categories.map((cat) => {
          const markers = window.ZD.metrics[cat.id] || [];
          const optimal = cat.counts.optimal || 0;
          return (
            <Link key={cat.id} to={`/metrics/${cat.id}`} style={{ display: 'flex' }}>
              <Card hover style={{ cursor: 'pointer', flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{cat.label}</div>
                  <div className="zt-tnum" style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{markers.length} markers · {optimal} optimal</div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 110 }}>
                  {markers.map(m => <StatusDot key={m.id} status={m.status} size={10} />)}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Category detail (/metrics/:category)
   ============================================================ */
function CategoryScreen({ path, catId }) {
  const cat = window.ZD.categories.find(c => c.id === catId) || window.ZD.categories[0];
  const metrics = window.ZD.metrics[cat.id] || [];
  return (
    <AppShell path={path}>
      <PageHeader
        crumb={[{ label: 'Metrics', to: '/metrics' }, { label: cat.label }]}
        title={cat.label}
        sub={`${metrics.length} markers tracked`}
        right={<CountDots counts={cat.counts} />}
      />
      <Card pad={false}>
        {metrics.map((m, i) => (
          <Link key={m.id} to={`/metrics/${cat.id}/${m.id}`}>
            <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xl)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < metrics.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <StatusDot status={m.status} size={9} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)', marginBottom: 7 }}>{m.name}</div>
                <RangeBar m={m} height={5} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>{m.value}</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{m.unit}</div>
              </div>
              <Sparkline data={m.history} width={52} height={16} status={m.status} />
              <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" />
            </div>
          </Link>
        ))}
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Metric detail (/metrics/:category/:metricId)
   THE chart-bearing screen — chart language showcase
   ============================================================ */
function DetailScreen({ path, catId, metricId }) {
  const cat = window.ZD.categories.find(c => c.id === catId) || window.ZD.categories[0];
  const metrics = window.ZD.metrics[cat.id] || [];
  const m = metrics.find(x => x.id === metricId) || metrics[0];
  if (!m) return <AppShell path={path}><PageHeader title="Metric not found" /></AppShell>;
  const last = m.history[m.history.length - 1];

  return (
    <AppShell path={path}>
      <PageHeader
        crumb={[{ label: 'Metrics', to: '/metrics' }, { label: cat.label, to: `/metrics/${cat.id}` }, { label: m.name }]}
        title={m.name}
        right={<StatusBadge status={m.status} />}
      />

      {/* Trend chart */}
      <section className="zt-section">
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--gap-lg)', marginBottom: 'var(--gap-xl)' }}>
            <div>
              <div className="zt-readout" style={{ fontSize: 'var(--text-3xl)', color: 'var(--ink)' }}>
                {m.value} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{m.unit.toUpperCase()}</span>
              </div>
              <div style={{ marginTop: 8 }}><Delta m={m} /></div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
                <span style={{ width: 12, height: 8, borderRadius: 3, background: 'var(--vital-100)', boxShadow: 'inset 0 0 0 1px var(--vital-200)', display: 'inline-block' }}></span> Optimal
              </span>
              <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
                <span style={{ width: 12, height: 0, borderTop: '1px dashed var(--n-300)', display: 'inline-block' }}></span> Reference
              </span>
              <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', border: '1.2px dashed var(--n-400)', display: 'inline-block', boxSizing: 'border-box' }}></span> Projected
              </span>
            </div>
          </div>
          <TrendChart metric={m} height={300} />
        </Card>
      </section>

      {/* Ranges */}
      <section className="zt-section">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--gap-2xl)', alignItems: 'center' }} className="zt-ranges-grid">
            <div>
              <div className="zt-eyebrow" style={{ marginBottom: 14 }}>Where you sit</div>
              <RangeBar m={m} height={8} showEndpoints />
            </div>
            <div>
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Optimal</div>
              <div className="zt-tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--vital-500)' }}>
                {m.opt[0]}–{m.opt[1]} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.unit}</span>
              </div>
            </div>
            <div>
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Reference</div>
              <div className="zt-tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text)' }}>
                {m.ref[0]}–{m.ref[1]} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.unit}</span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* History */}
      <section className="zt-section">
        <SectionLabel count={m.history.length}>Measurement history</SectionLabel>
        <Card pad={false}>
          <DataTable
            columns={[
              { key: 'date', label: 'Date', mono: true, width: 100 },
              { key: 'value', label: 'Value', mono: true, align: 'right', width: 120, render: r => `${r.value} ${m.unit}` },
              { key: 'status', label: 'Status', sortable: false, render: r => <StatusBadge status={statusOf(r.value, m)} /> },
            ]}
            rows={[...m.history].reverse()}
            rowKey={(r, i) => i}
          />
        </Card>
      </section>
    </AppShell>
  );
}

/* ============================================================
   Protocol overview (/protocol)
   ============================================================ */
function ProtocolScreen({ path }) {
  const { protocolVersions, cessationPhases, cessationDay } = window.ZD;
  const active = protocolVersions.find(p => p.status === 'active') || protocolVersions[protocolVersions.length - 1];
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Protocol" title="Protocol overview" sub="Your supplement and phasing protocol, one frame at a time" />

      <section className="zt-section">
        <div className="zt-grid-2">
          <Card>
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>Active protocol</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--accent)', background: 'var(--focus-50)', borderRadius: 'var(--radius-sm)', padding: '3px 8px' }}>{active.id}</span>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--ink)' }}>{active.name.replace(/^P\d+ — /, '')}</div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--gap-xl)', textWrap: 'pretty' }}>{active.description}</div>
            <Link to="/protocol/versions" className="zt-link">Version history <Icon name="arrow-right" size={14} stroke={2} /></Link>
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="zt-eyebrow">Phasing</div>
              <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>DAY {cessationDay}</span>
            </div>
            <div style={{ marginBottom: 'var(--gap-xl)' }}><PhaseBar phases={cessationPhases} height={12} compact day={cessationDay} /></div>
            <Link to="/protocol/cessation" className="zt-link">Full timeline <Icon name="arrow-right" size={14} stroke={2} /></Link>
          </Card>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 'var(--gap-md)', flexWrap: 'wrap' }}>
        {[
          { label: 'Versions', to: '/protocol/versions', icon: 'git-branch' },
          { label: 'Supplements', to: '/protocol/supplements', icon: 'pill' },
          { label: 'Phasing', to: '/protocol/cessation', icon: 'timer' },
          { label: 'Compare', to: '/protocol/compare', icon: 'git-compare' },
        ].map(n => (
          <Link key={n.to} to={n.to} className="zt-pill">
            <Icon name={n.icon} size={14} stroke={1.8} />{n.label}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Protocol versions (/protocol/versions)
   ============================================================ */
function VersionsScreen({ path }) {
  const { protocolVersions } = window.ZD;
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Versions' }]} title="Protocol versions" sub={`${protocolVersions.length} versions logged`} />
      <Card pad={false}>
        {[...protocolVersions].reverse().map((v, i, arr) => {
          const isActive = v.status === 'active';
          return (
            <Link key={v.id} to={'/protocol/versions/' + v.id}>
            <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xl)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', background: isActive ? 'var(--surface-2)' : 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: isActive ? 'var(--focus-50)' : 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>{v.id}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)', marginBottom: 3 }}>{v.name.replace(/^P\d+ — /, '')}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>{v.description}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{v.date}</div>
                {isActive && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--focus-50)', padding: '3px 9px', borderRadius: 'var(--radius-pill)' }}>active</span>}
              </div>
              <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" />
            </div>
            </Link>
          );
        })}
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Supplements (/protocol/supplements)
   ============================================================ */
function SupplementsScreen({ path }) {
  const { supplements } = window.ZD;
  const tiers = [
    { key: 'tier1', label: 'Tier 1 — Core', color: 'var(--vital)' },
    { key: 'tier2', label: 'Tier 2 — Targeted', color: 'var(--focus)' },
    { key: 'tier3', label: 'Tier 3 — Conditional', color: 'var(--energy)' },
  ];
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Supplements' }]} title="Supplement tiers" sub="Protocol-graded supplement stack" />
      {tiers.map(tier => (
        <section key={tier.key} className="zt-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--gap-lg)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, flex: '0 0 auto' }}></span>
            <div className="zt-eyebrow" style={{ color: 'var(--text-secondary)' }}>{tier.label}</div>
          </div>
          <Card pad={false}>
            {supplements[tier.key].map((s, i, arr) => (
              <div key={s.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.8fr)', gap: 'var(--gap-xl)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 'var(--text-sm)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3, textWrap: 'pretty' }}>{s.rationale}</div>
                </div>
                <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text)' }}>{s.dose}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.timing}</div>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </AppShell>
  );
}

/* ============================================================
   Phasing (/protocol/cessation) — signature screen
   Phases stacked sequentially (timeline list), not a grid.
   ============================================================ */
function CessationScreen({ path }) {
  const { cessationPhases, cessationDay } = window.ZD;
  const stateStyle = {
    completed: { dot: 'var(--optimal)',  bg: 'var(--optimal-bg)', fg: 'var(--vital-500)' },
    current:   { dot: 'var(--ink)',      bg: 'var(--focus-50)',   fg: 'var(--accent)' },
    upcoming:  { dot: 'var(--n-300)',    bg: 'var(--n-100)',      fg: 'var(--text-muted)' },
  };
  return (
    <AppShell path={path}>
      <PageHeader
        crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Phasing' }]}
        title="Phasing"
        sub="FAAH-informed protocol — 4 phases, 150 days total"
        right={
          <div style={{ textAlign: 'right' }}>
            <div className="zt-eyebrow" style={{ marginBottom: 4 }}>Current day</div>
            <div className="zt-readout" style={{ fontSize: 'var(--text-xl)', color: 'var(--ink)' }}>{cessationDay}</div>
          </div>
        }
      />

      <section className="zt-section">
        <Card>
          <PhaseBar phases={cessationPhases} height={20} day={cessationDay} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', letterSpacing: '0.06em' }}>
            <span>{cessationPhases[0].start.toUpperCase()}</span>
            <span>{cessationPhases[cessationPhases.length - 1].end.toUpperCase()}</span>
          </div>
        </Card>
      </section>

      {/* Sequential phase list */}
      <Card pad={false}>
        {cessationPhases.map((p, i) => {
          const d0 = cessationPhases.slice(0, i).reduce((a, x) => a + x.days, 1);
          const d1 = cessationPhases.slice(0, i + 1).reduce((a, x) => a + x.days, 0);
          const isCurrent = p.state === 'current';
          const s = stateStyle[p.state] || stateStyle.upcoming;
          const last = i === cessationPhases.length - 1;
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: 'var(--gap-lg)', padding: 'var(--gap-lg) var(--gap-card)', borderBottom: !last ? '1px solid var(--border)' : 'none', background: isCurrent ? 'var(--surface-2)' : 'transparent' }}>
              {/* timeline rail */}
              <div style={{ position: 'relative' }}>
                {i > 0 && <span style={{ position: 'absolute', left: 9, top: -17, height: 16, width: 1, background: 'var(--border)' }}></span>}
                {!last && <span style={{ position: 'absolute', left: 9, top: 21, bottom: -17, width: 1, background: 'var(--border)' }}></span>}
                <span style={{ position: 'absolute', left: 4, top: 5, width: 11, height: 11, borderRadius: '50%', background: isCurrent ? 'var(--surface)' : s.dot, border: isCurrent ? '2.5px solid var(--ink)' : 'none', boxSizing: 'border-box' }}></span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--gap-lg)', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text)' }}>{p.name}</span>
                  <span className="zt-eyebrow">Days {d0}–{d1}</span>
                  <span style={{
                    marginLeft: 'auto', padding: '3px 9px', borderRadius: 'var(--radius-pill)', flex: '0 0 auto',
                    background: s.bg, color: s.fg,
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>{p.state}</span>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 6, textWrap: 'pretty' }}>{p.description}</div>
                <div className="zt-tnum" style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', letterSpacing: '0.06em' }}>{p.start} → {p.end} · {p.days} days</div>
              </div>
            </div>
          );
        })}
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Protocol compare (/protocol/compare)
   ============================================================ */
function CompareScreen({ path }) {
  const { protocolVersions, versionStacks } = window.ZD;
  const ids = protocolVersions.map(v => v.id);
  const [a, setA] = useState('P3');
  const [b, setB] = useState('P4');

  const stackA = versionStacks[a] || [];
  const stackB = versionStacks[b] || [];
  const names = [...new Set([...stackA.map(s => s.name), ...stackB.map(s => s.name)])];
  const rows = names.map(name => {
    const inA = stackA.find(s => s.name === name);
    const inB = stackB.find(s => s.name === name);
    const state = !inA ? 'added' : !inB ? 'removed' : inA.dose !== inB.dose ? 'changed' : 'same';
    return { name, inA, inB, state };
  });
  const counts = rows.reduce((acc, r) => { acc[r.state] = (acc[r.state] || 0) + 1; return acc; }, {});
  const glyphs = {
    added:   { g: '+', color: 'var(--vital-500)',  bg: 'var(--optimal-bg)' },
    removed: { g: '−', color: 'var(--deficient)',  bg: 'var(--deficient-bg)' },
    changed: { g: '~', color: 'var(--energy-500)', bg: 'var(--borderline-bg)' },
    same:    { g: '·', color: 'var(--text-faint)', bg: 'transparent' },
  };

  const Picker = ({ value, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="zt-eyebrow">{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {ids.map(id => (
          <button key={id} type="button" onClick={() => onChange(id)}
            className={'zt-pill' + (value === id ? ' is-active' : '')}
            style={{ padding: '5px 11px' }}>{id}</button>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Compare' }]} title="Version comparison"
        sub="Supplement stack diff between two protocol versions" />

      <section className="zt-section">
        <div style={{ display: 'flex', gap: 'var(--gap-2xl)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Picker label="Base" value={a} onChange={setA} />
          <Icon name="arrow-right" size={15} stroke={1.8} color="var(--text-faint)" />
          <Picker label="Compare" value={b} onChange={setB} />
        </div>
      </section>

      <section className="zt-section">
        <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--gap-lg)' }}>
          <span style={{ color: 'var(--vital-500)' }}>+{counts.added || 0} added</span>
          <span style={{ color: 'var(--deficient)' }}>−{counts.removed || 0} removed</span>
          <span style={{ color: 'var(--energy-500)' }}>~{counts.changed || 0} changed</span>
          <span>·{counts.same || 0} unchanged</span>
        </div>
        <Card pad={false}>
          {rows.length === 0 ? (
            <ChartEmpty height={200} title="Nothing to compare" body={`Neither ${a} nor ${b} carries a supplement stack.`} />
          ) : rows.map((r, i) => {
            const s = glyphs[r.state];
            return (
              <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--gap-lg)', alignItems: 'center', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{s.g}</span>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: r.state === 'removed' ? 'var(--text-muted)' : 'var(--text)', textDecoration: r.state === 'removed' ? 'line-through' : 'none' }}>{r.name}</div>
                <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{r.inA ? r.inA.dose : '—'}</div>
                <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: r.state === 'changed' ? 'var(--energy-500)' : 'var(--text)' }}>{r.inB ? r.inB.dose : '—'}</div>
              </div>
            );
          })}
        </Card>
      </section>
    </AppShell>
  );
}

/* ============================================================
   Insights overview (/insights) — ROUND 4: the link-hub was
   replaced by a section dashboard (owner pick: fold headline
   stats in, no redirect). See screens-r4.jsx → InsightsScreen.
   ============================================================ */

/* ============================================================
   Correlations (/insights/correlations)
   Data-table + filters + stat strip — chart language applied
   ============================================================ */
function CorrelationsScreen({ path }) {
  const { correlations } = window.ZD;
  const [sigFilter, setSigFilter] = useState('all');

  const filtered = sigFilter === 'all' ? correlations : correlations.filter(c => c.significance === sigFilter);
  const sigCounts = { all: correlations.length };
  correlations.forEach(c => { sigCounts[c.significance] = (sigCounts[c.significance] || 0) + 1; });

  const highSig = correlations.filter(c => c.significance === 'high').length;
  const avgR = (correlations.reduce((a, c) => a + Math.abs(c.r), 0) / correlations.length).toFixed(2);
  const strongPos = correlations.filter(c => c.r >= 0.6).length;

  /* diverging r bar — structure neutral, sign carries status color */
  const RBar = ({ r }) => {
    const w = Math.abs(r) * 28;
    const pos = r >= 0;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <span style={{ position: 'relative', width: 60, height: 4, background: 'var(--n-100)', borderRadius: 2, display: 'inline-block' }}>
          <span style={{ position: 'absolute', top: 0, bottom: 0, left: pos ? '50%' : `calc(50% - ${w}px)`, width: w, background: pos ? 'var(--optimal)' : 'var(--deficient)', borderRadius: 2 }}></span>
          <span style={{ position: 'absolute', top: -2, bottom: -2, left: 'calc(50% - 0.5px)', width: 1, background: 'var(--n-300)' }}></span>
        </span>
        <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--ink)', minWidth: 52, textAlign: 'right' }}>{r >= 0 ? '+' : ''}{r.toFixed(2)}</span>
      </span>
    );
  };

  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Insights', to: '/insights' }, { label: 'Correlations' }]}
        title="Metric correlations" sub="Statistical relationships between tracked markers" />

      <section className="zt-section">
        <Card>
          <div className="zt-stat-strip">
            {[
              { label: 'Total pairs', value: correlations.length },
              { label: 'High significance', value: highSig },
              { label: 'Avg |r|', value: avgR },
              { label: 'Strong positive', value: strongPos },
            ].map(s => (
              <div key={s.label} className="zt-stat">
                <div className="zt-eyebrow" style={{ marginBottom: 8 }}>{s.label}</div>
                <div className="zt-readout" style={{ fontSize: 'var(--text-xl)', color: 'var(--ink)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--gap-lg)', flexWrap: 'wrap' }}>
        {['all', 'high', 'medium', 'low'].map(f => (
          <button key={f} type="button" onClick={() => setSigFilter(f)}
            className={'zt-pill' + (sigFilter === f ? ' is-active' : '')}>
            {f}{sigCounts[f] ? ` (${sigCounts[f]})` : ''}
          </button>
        ))}
      </div>

      <Card pad={false}>
        <DataTable
          columns={[
            { key: 'metric_a', label: 'Metric A', width: 150 },
            { key: 'metric_b', label: 'Metric B', width: 150 },
            { key: 'r', label: 'r', align: 'right', width: 150, render: row => <RBar r={row.r} /> },
            { key: 'n', label: 'n', mono: true, align: 'right', width: 50 },
            { key: 'p', label: 'p-value', mono: true, align: 'right', width: 80,
              render: row => <span style={{ fontFamily: 'var(--font-mono)', color: row.p < 0.05 ? 'var(--ink)' : 'var(--text-muted)' }}>{row.p.toFixed(3)}</span>
            },
            { key: 'significance', label: 'Significance', sortable: false,
              render: row => {
                const colors = { high: 'var(--vital-500)', medium: 'var(--energy-500)', low: 'var(--text-muted)' };
                return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: colors[row.significance] || 'var(--text-muted)' }}>{row.significance}</span>;
              }
            },
          ]}
          rows={filtered}
          rowKey={(r, i) => i}
        />
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Genetics (/insights/genetics)
   ============================================================ */
function GeneticsScreen({ path }) {
  const { genetics } = window.ZD;
  const statusColors = { mitigated: 'var(--vital-500)', nominal: 'var(--text-muted)', monitoring: 'var(--energy-500)' };
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Insights', to: '/insights' }, { label: 'Genetics' }]}
        title="Genetic variants" sub="Pharmacogenomics and nutrigenomics variants influencing the protocol" />
      <Card pad={false}>
        {genetics.map((g, i) => (
          <div key={g.gene} className="zt-gene-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--gap-xl)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < genetics.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="zt-gene-id" style={{ flex: '0 0 200px', minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--ink)', marginBottom: 4 }}>{g.gene}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{g.variant}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6, textWrap: 'pretty' }}>{g.impact}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', textWrap: 'pretty' }}>{g.response}</div>
            </div>
            <span style={{
              flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: statusColors[g.status] || 'var(--text-muted)',
            }}>{g.status}</span>
          </div>
        ))}
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Ingest overview (/ingest, also serves /import) — COMBINED
   round 3: Import + Ingest merged into one section. The two
   old link-hub overviews are replaced by one sources + review
   surface.
   ============================================================ */
function IngestScreen({ path }) {
  /* round 4: gate counts flow live from the review state */
  const doc = window.ZD.ingest && window.ZD.ingest.documents[0];
  const rc = doc && window.reviewCounts ? reviewCounts(doc.id) : null;
  const sources = [
    { icon: 'file-up',     to: '/ingest/upload', name: 'Lab PDFs',  desc: 'AI-assisted extraction from lab report PDFs', status: rc && rc.pending > 0 ? '1 doc pending' : '0 pending' },
    { icon: 'heart-pulse', to: '/import/whoop',  name: 'WHOOP',     desc: 'HRV, recovery, sleep → Autonomic',            status: 'JSON export' },
    { icon: 'folder-open', to: '/import/vault',  name: 'Vault',     desc: 'Protocol notes and targets from Obsidian',     status: 'not connected' },
  ];
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Data ingest" title="Ingest" sub="Every source that writes to your metrics, and the review gate in front of them" />

      <section className="zt-section">
        <SectionLabel count={3}>Sources</SectionLabel>
        <Card pad={false}>
          {sources.map((s, i, arr) => (
            <Link key={s.to} to={s.to}>
              <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                <IconTile name={s.icon} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, textWrap: 'pretty' }}>{s.desc}</div>
                </div>
                <span className="zt-eyebrow" style={{ flex: '0 0 auto' }}>{s.status}</span>
                <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" />
              </div>
            </Link>
          ))}
        </Card>
      </section>

      <section className="zt-section">
        <SectionLabel>Review gate</SectionLabel>
        <Card pad={false}>
          <Link to="/ingest/review">
            <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', cursor: 'pointer' }}>
              <IconTile name="clipboard-check" size={36} bg="var(--energy-50)" color="var(--energy-500)" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>Extraction review</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, textWrap: 'pretty' }}>Approve, edit, or reject each field before metrics are written</div>
              </div>
              <span className="zt-eyebrow zt-tnum" style={{ flex: '0 0 auto', color: rc && rc.pending > 0 ? 'var(--borderline)' : 'var(--text-muted)' }}>{rc ? (rc.pending > 0 ? rc.pending + ' fields pending' : 'reviewed') : '0 pending'}</span>
              <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" />
            </div>
          </Link>
          {doc && (
            <Link to={'/ingest/documents/' + doc.id}>
              <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                <IconTile name="file-text" size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{doc.filename}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{doc.source} · drawn {doc.drawDate} · {doc.pages} pages</div>
                </div>
                <span className="zt-eyebrow" style={{ flex: '0 0 auto' }}>{doc.status.replace('-', ' ')}</span>
                <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" />
              </div>
            </Link>
          )}
        </Card>
      </section>
    </AppShell>
  );
}

/* ============================================================
   WHOOP import (/import/whoop)
   ============================================================ */
function WhoopScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'WHOOP' }]} title="WHOOP import" sub="Load the WHOOP Analyzer JSON export" />
      <div className="zt-grid-split">
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-lg)' }}>Upload file</div>
          <div className="zt-dropzone">
            <Icon name="upload-cloud" size={32} stroke={1.5} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 'var(--text-sm)', marginBottom: 6, color: 'var(--text-secondary)' }}>Drop <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>whoop_analysis_report.json</code> here</div>
            <div className="zt-eyebrow" style={{ color: 'var(--text-faint)' }}>or click to browse</div>
          </div>
        </Card>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Expected fields</div>
          {['hrv_rmssd', 'recovery_score', 'rhr', 'sleep_performance', 'tdee'].map((f, i, arr) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <Icon name="check" size={14} stroke={2} color="var(--optimal)" /> {f}
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Vault import (/import/vault)
   ============================================================ */
function VaultScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Vault' }]} title="Vault import" sub="Import from the Obsidian vault" />
      <Card>
        <ChartEmpty height={220} title="Not connected"
          body="Connect the vault path to sync protocol notes and metric targets." />
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Ingest upload (/ingest/upload)
   ============================================================ */
function IngestUploadScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Lab PDFs' }]} title="Upload lab PDF" sub="Extractions are AI-assisted and owner-reviewed"
        right={<Link to="/ingest/consent" className="zt-pill" style={{ color: 'var(--text-secondary)' }}><Icon name="shield-check" size={14} stroke={1.8} />Consent</Link>} />
      <Card>
        <div className="zt-dropzone" style={{ padding: 'var(--gap-3xl) var(--gap-xl)' }}>
          <Icon name="file-up" size={36} stroke={1.5} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 'var(--text-md)', marginBottom: 6, color: 'var(--text)' }}>Drop a lab report PDF here</div>
          <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--gap-xl)' }}>Text-extractable PDFs only (LabCorp, Quest, Ulta Lab Tests)</div>
          <button type="button" style={{ padding: '10px 24px', background: 'var(--surface-inverse)', color: 'var(--text-on-ink)', border: 'none', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500, fontFamily: 'var(--font-text)' }}>Choose file</button>
        </div>
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Ingest review (/ingest/review) — ROUND 4: populated state
   designed in screens-ingest.jsx → IngestReviewScreen. The
   round-3 empty state (ChartEmpty + link to upload) remains the
   zero-pending design; render it when no document is in review.
   ============================================================ */

/* ============================================================
   Settings (/settings)
   ============================================================ */
function SettingsScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Account" title="Settings" />
      <div className="zt-grid-2">
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-lg)' }}>Account</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-lg)' }}>
            <div className="zn-avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-lg)' }}>M</div>
            <div>
              <div style={{ fontWeight: 600 }}>Owner</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>owner@example.com</div>
            </div>
          </div>
          <span style={{ padding: '4px 11px', background: 'var(--focus-50)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-block' }}>Owner</span>
        </Card>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-lg)' }}>Invites</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No pending invitations.</div>
        </Card>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Expose all screens on window for main.jsx routing
   ============================================================ */
Object.assign(window, {
  Card, SectionLabel, IconTile, Delta,
  DashboardScreen,
  MetricsScreen,
  CategoryScreen,
  DetailScreen,
  ProtocolScreen,
  VersionsScreen,
  SupplementsScreen,
  CessationScreen,
  CompareScreen,
  CorrelationsScreen,
  GeneticsScreen,
  WhoopScreen,
  VaultScreen,
  IngestScreen,
  IngestUploadScreen,
  SettingsScreen,
});
/* InsightsScreen + IngestReviewScreen now ship from
   screens-r4.jsx / screens-ingest.jsx (round 4). */

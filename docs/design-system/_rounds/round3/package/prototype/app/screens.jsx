/* ============================================================
   Zoetrop — round 3 prototype screens
   One component per Part A route, all using AppShell + PageHeader.
   All data from window.ZD. Exposes each screen on window.
   ============================================================ */

/* ============================================================
   Card helper (consistent frame)
   ============================================================ */
function Card({ children, style = {}, pad = true }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)',
      padding: pad ? 'var(--gap-xl)' : 0, ...style,
    }}>
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

/* ============================================================
   Dashboard (/dashboard)
   ============================================================ */
function DashboardScreen({ path }) {
  const { cessationPhases, cessationDay, cessationTarget, categories } = window.ZD;
  const currentPhase = cessationPhases.find(p => p.state === 'current') || cessationPhases[0];
  const daysLeft = cessationTarget - cessationDay;

  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Overview" title="Dashboard" sub="Personal wellness instrument — cessation day 171 / 150 target" />

      {/* Cessation tracker card */}
      <Card style={{ marginBottom: 'var(--gap-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--gap-lg)', marginBottom: 'var(--gap-xl)' }}>
          <div>
            <div className="zt-eyebrow" style={{ marginBottom: 6 }}>Cessation Protocol</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Day {cessationDay}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
              Phase: <strong style={{ color: 'var(--ink)' }}>{currentPhase.name}</strong> — {currentPhase.description}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {daysLeft > 0 ? `${daysLeft} days past target` : `${-daysLeft} days to target`}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
              <StatusBadge status="optimal" />
            </div>
          </div>
        </div>
        <PhaseBar phases={cessationPhases} height={16} />
      </Card>

      {/* Metric family summary grid */}
      <SectionLabel count={9}>Metric categories</SectionLabel>
      <div className="zt-grid-3" style={{ marginBottom: 'var(--gap-xl)' }}>
        {categories.map(cat => {
          const total = Object.values(cat.counts).reduce((a,b) => a+b, 0);
          const worstStatus = cat.counts.deficient ? 'deficient' : cat.counts.excess ? 'excess' : cat.counts.borderline ? 'borderline' : 'optimal';
          return (
            <Link key={cat.id} to={`/metrics/${cat.id}`}>
              <Card style={{ cursor: 'pointer', transition: 'box-shadow var(--dur-fast) var(--ease-out)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--gap-md)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <Icon name={cat.icon} size={20} stroke={1.9} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{cat.label}</div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{total} metrics</div>
                  </div>
                  <StatusBadge status={worstStatus} />
                </div>
                <CountDots counts={cat.counts} />
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent readings */}
      <SectionLabel>Recent highlights</SectionLabel>
      <div className="zt-grid-2">
        {[
          window.ZD.metrics.autonomic[0],
          window.ZD.metrics.vitamins[0],
          window.ZD.metrics.lipids[1],
          window.ZD.metrics.hormones[0],
        ].map(m => (
          <Card key={m.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--gap-md)' }}>
              <div>
                <div className="zt-eyebrow" style={{ marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                  {m.value} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-muted)' }}>{m.unit}</span>
                </div>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <Sparkline data={m.history} width={80} height={18} color={STATUS[m.status]?.color || 'var(--ink)'} />
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Metrics overview (/metrics)
   ============================================================ */
function MetricsScreen({ path }) {
  const { categories } = window.ZD;
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Health metrics" title="Metrics" sub="9 categories · 46 tracked markers" />
      <div className="zt-grid-3">
        {categories.map(cat => {
          const total = Object.values(cat.counts).reduce((a,b) => a+b, 0);
          const optimal = cat.counts.optimal || 0;
          return (
            <Link key={cat.id} to={`/metrics/${cat.id}`}>
              <Card style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-lg)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <Icon name={cat.icon} size={22} stroke={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)' }}>{cat.label}</div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{total} markers</div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--n-100)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (optimal/total*100) + '%', background: 'var(--vital)', borderRadius: 'var(--radius-pill)', transition: 'width 0.4s var(--ease-out)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                    <span>{optimal}/{total} optimal</span>
                    <span>{Math.round(optimal/total*100)}%</span>
                  </div>
                </div>
                <CountDots counts={cat.counts} />
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
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name={cat.icon} size={24} stroke={1.8} /><CountDots counts={cat.counts} /></div>}
      />
      <Card pad={false}>
        {metrics.map((m, i) => (
          <Link key={m.id} to={`/metrics/${cat.id}/${m.id}`}>
            <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: '14px var(--gap-xl)', borderBottom: i < metrics.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <StatusDot status={m.status} size={10} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{m.name}</div>
                <RangeBar m={m} height={5} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{m.value}</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.unit}</div>
              </div>
              <Sparkline data={m.history} width={46} height={16} color={STATUS[m.status]?.color || 'var(--ink)'} />
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
   THE chart-bearing screen — Recharts TrendChart with bands
   ============================================================ */
function DetailScreen({ path, catId, metricId }) {
  const cat = window.ZD.categories.find(c => c.id === catId) || window.ZD.categories[0];
  const metrics = window.ZD.metrics[cat.id] || [];
  const m = metrics.find(x => x.id === metricId) || metrics[0];
  if (!m) return <AppShell path={path}><PageHeader title="Metric not found" /></AppShell>;

  return (
    <AppShell path={path}>
      <PageHeader
        crumb={[{ label: 'Metrics', to: '/metrics' }, { label: cat.label, to: `/metrics/${cat.id}` }, { label: m.name }]}
        title={m.name}
        right={<StatusBadge status={m.status} />}
      />

      {/* Trend chart */}
      <Card style={{ marginBottom: 'var(--gap-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--gap-md)', marginBottom: 'var(--gap-lg)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
              {m.value} <span style={{ fontSize: 'var(--text-md)', fontWeight: 400, color: 'var(--text-secondary)' }}>{m.unit}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
              <span style={{ width: 12, height: 8, borderRadius: 3, background: 'var(--vital-100)', display: 'inline-block' }} /> Optimal
            </span>
            <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
              <span style={{ width: 12, height: 8, borderRadius: 3, background: 'var(--n-150)', display: 'inline-block' }} /> Reference
            </span>
          </div>
        </div>
        <TrendChart metric={m} height={280} />
      </Card>

      {/* Reference ranges */}
      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-xl)' }}>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Optimal range</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--vital-400)' }}>
            {m.opt[0]}–{m.opt[1]} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-muted)' }}>{m.unit}</span>
          </div>
          <div style={{ marginTop: 'var(--gap-md)' }}><RangeBar m={m} height={8} showEndpoints={false} /></div>
        </Card>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Reference range</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text)' }}>
            {m.ref[0]}–{m.ref[1]} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-muted)' }}>{m.unit}</span>
          </div>
          <div style={{ marginTop: 'var(--gap-md)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Current: {m.value} {m.unit}</div>
          </div>
        </Card>
      </div>

      {/* History table */}
      <SectionLabel count={m.history.length}>Measurement history</SectionLabel>
      <Card pad={false}>
        <DataTable
          columns={[
            { key: 'date', label: 'Date', mono: true, width: 100 },
            { key: 'value', label: 'Value', mono: true, align: 'right', width: 120, render: r => `${r.value} ${m.unit}` },
            { key: 'status', label: 'Status', sortable: false, render: r => {
              const vs = r.value < m.opt[0] ? (r.value < m.ref[0] ? 'deficient' : 'borderline') : r.value > m.opt[1] ? (r.value > m.ref[1] ? 'excess' : 'borderline') : 'optimal';
              return <StatusBadge status={vs} />;
            }},
          ]}
          rows={[...m.history].reverse()}
          rowKey={(r, i) => i}
        />
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Protocol overview (/protocol)
   ============================================================ */
function ProtocolScreen({ path }) {
  const { protocolVersions, cessationPhases } = window.ZD;
  const active = protocolVersions.find(p => p.status === 'active') || protocolVersions[protocolVersions.length - 1];
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Protocol" title="Protocol Overview" sub="Personalized supplement + cessation protocol tracking" />

      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-xl)' }}>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Active protocol</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{active.name}</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--gap-lg)' }}>{active.description}</div>
          <Link to="/protocol/versions"><span style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>View version history →</span></Link>
        </Card>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Cessation phase</div>
          <div style={{ marginBottom: 'var(--gap-lg)' }}><PhaseBar phases={cessationPhases} height={12} compact={true} /></div>
          <Link to="/protocol/cessation"><span style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>Full cessation timeline →</span></Link>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 'var(--gap-lg)', flexWrap: 'wrap', marginBottom: 'var(--gap-xl)' }}>
        {[
          { label: 'Versions', to: '/protocol/versions', icon: 'git-branch' },
          { label: 'Supplements', to: '/protocol/supplements', icon: 'pill' },
          { label: 'Cessation', to: '/protocol/cessation', icon: 'timer' },
          { label: 'Compare', to: '/protocol/compare', icon: 'git-compare' },
        ].map(n => (
          <Link key={n.to} to={n.to}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
              <Icon name={n.icon} size={18} stroke={1.8} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{n.label}</span>
            </div>
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
      <PageHeader crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Versions' }]} title="Protocol Versions" sub={`${protocolVersions.length} versions logged`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
        {protocolVersions.map((v, i) => (
          <Card key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xl)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: v.status === 'active' ? 'var(--focus-50)' : 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: v.status === 'active' ? 'var(--accent)' : 'var(--text-muted)' }}>{v.id}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{v.name}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{v.description}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.date}</div>
              {v.status === 'active' && <StatusBadge status="optimal" />}
            </div>
          </Card>
        ))}
      </div>
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
      <PageHeader crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Supplements' }]} title="Supplement Tiers" sub="Protocol-graded supplement stack" />
      {tiers.map(tier => (
        <div key={tier.key} style={{ marginBottom: 'var(--gap-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--gap-md)' }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: tier.color, flex: '0 0 auto' }} />
            <div className="zt-eyebrow">{tier.label}</div>
          </div>
          <Card pad={false}>
            {supplements[tier.key].map((s, i, arr) => (
              <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--gap-lg)', padding: '14px var(--gap-xl)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 'var(--text-sm)' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{s.dose}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.timing}</div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </AppShell>
  );
}

/* ============================================================
   Cessation timeline (/protocol/cessation)
   THE signature protocol screen
   ============================================================ */
function CessationScreen({ path }) {
  const { cessationPhases, cessationDay } = window.ZD;
  const current = cessationPhases.find(p => p.state === 'current');
  return (
    <AppShell path={path}>
      <PageHeader
        crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Cessation' }]}
        title="Cessation Timeline"
        sub="FAAH-informed 120+ day protocol — 4 phases, 150 days total"
        right={
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current day</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.04em' }}>{cessationDay}</div>
          </div>
        }
      />

      {/* Full-width phase bar */}
      <Card style={{ marginBottom: 'var(--gap-xl)' }}>
        <PhaseBar phases={cessationPhases} height={20} />
      </Card>

      {/* Phase cards */}
      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-xl)' }}>
        {cessationPhases.map(p => (
          <Card key={p.id} style={{ borderLeft: p.state === 'current' ? '3px solid var(--ink)' : '3px solid transparent' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div className="zt-eyebrow" style={{ marginBottom: 4 }}>Days {
                  cessationPhases.slice(0, cessationPhases.indexOf(p)).reduce((a,x) => a+x.days, 1) }–{
                  cessationPhases.slice(0, cessationPhases.indexOf(p)+1).reduce((a,x) => a+x.days, 0)
                }</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text)' }}>{p.name}</div>
              </div>
              <div style={{
                padding: '3px 9px', borderRadius: 'var(--radius-pill)',
                background: p.state === 'completed' ? 'var(--vital-50)' : p.state === 'current' ? 'var(--focus-50)' : 'var(--n-100)',
                color: p.state === 'completed' ? 'var(--vital-400)' : p.state === 'current' ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{p.state}</div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{p.description}</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{p.start} → {p.end} · {p.days} days</div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Protocol compare (/protocol/compare)
   ============================================================ */
function CompareScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Compare' }]} title="Version Comparison"
        sub="Side-by-side supplement stack diff across protocol versions" />
      <Card>
        <div style={{ padding: 'var(--gap-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="git-compare" size={40} stroke={1.5} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>Comparison view</div>
          <div style={{ fontSize: 'var(--text-sm)' }}>Select two protocol versions to compare their supplement stacks.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 'var(--gap-xl)' }}>
            {window.ZD.protocolVersions.map(v => (
              <button key={v.id} type="button" style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>{v.id}</button>
            ))}
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Insights overview (/insights)
   ============================================================ */
function InsightsScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Insights" title="Insights Overview" sub="Statistical correlations + genetic variants" />
      <div className="zt-grid-2">
        <Link to="/insights/correlations">
          <Card style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-md)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--focus-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="git-compare" size={22} stroke={1.8} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>Correlations</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{window.ZD.correlations.length} pairs analyzed</div>
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Statistical relationships between tracked metrics from your history.</div>
          </Card>
        </Link>
        <Link to="/insights/genetics">
          <Card style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-md)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--energy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="dna" size={22} stroke={1.8} color="var(--energy-500)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>Genetics</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{window.ZD.genetics.length} relevant variants</div>
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Pharmacogenomics and nutrigenomics variants affecting the protocol.</div>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Correlations (/insights/correlations)
   THE data-table + chart-language screen
   ============================================================ */
function CorrelationsScreen({ path }) {
  const { correlations } = window.ZD;
  const [sigFilter, setSigFilter] = useState('all');

  const filtered = sigFilter === 'all' ? correlations : correlations.filter(c => c.significance === sigFilter);

  const sigCounts = { all: correlations.length };
  correlations.forEach(c => { sigCounts[c.significance] = (sigCounts[c.significance] || 0) + 1; });

  // Summary stats
  const highSig = correlations.filter(c => c.significance === 'high').length;
  const avgR = (correlations.reduce((a, c) => a + Math.abs(c.r), 0) / correlations.length).toFixed(2);
  const strongPos = correlations.filter(c => c.r >= 0.6).length;

  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Insights', to: '/insights' }, { label: 'Correlations' }]}
        title="Metric Correlations" sub="Statistical relationships between tracked markers" />

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 'var(--gap-lg)', marginBottom: 'var(--gap-xl)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total pairs', value: correlations.length },
          { label: 'High sig.', value: highSig },
          { label: 'Avg |r|', value: avgR },
          { label: 'Strong positive', value: strongPos },
        ].map(s => (
          <Card key={s.label} style={{ flex: '1 1 140px', minWidth: 120 }}>
            <div className="zt-eyebrow" style={{ marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--ink)' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--gap-lg)', flexWrap: 'wrap' }}>
        {['all', 'high', 'medium', 'low'].map(f => (
          <button key={f} type="button" onClick={() => setSigFilter(f)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            border: sigFilter === f ? '1px solid var(--ink)' : '1px solid var(--border)',
            background: sigFilter === f ? 'var(--ink)' : 'var(--surface)',
            color: sigFilter === f ? 'var(--n-50)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {f} {sigCounts[f] ? `(${sigCounts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Correlations table */}
      <Card pad={false}>
        <DataTable
          columns={[
            { key: 'metric_a', label: 'Metric A', width: 160 },
            { key: 'metric_b', label: 'Metric B', width: 160 },
            { key: 'r', label: 'r', mono: true, align: 'right', width: 70,
              render: row => {
                const color = row.r >= 0.6 ? 'var(--vital-400)' : row.r <= -0.6 ? 'var(--danger)' : row.r >= 0.3 ? 'var(--focus-400)' : 'var(--text-muted)';
                return <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.r >= 0 ? '+' : ''}{row.r.toFixed(2)}</span>;
              }
            },
            { key: 'n', label: 'n', mono: true, align: 'right', width: 50 },
            { key: 'p', label: 'p-value', mono: true, align: 'right', width: 80,
              render: row => <span style={{ fontFamily: 'var(--font-mono)', color: row.p < 0.05 ? 'var(--ink)' : 'var(--text-muted)' }}>{row.p.toFixed(3)}</span>
            },
            { key: 'significance', label: 'Significance', sortable: false,
              render: row => {
                const colors = { high: 'var(--vital-400)', medium: 'var(--energy-400)', low: 'var(--text-muted)' };
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
  const statusColors = { mitigated: 'var(--vital-400)', nominal: 'var(--text-muted)', monitoring: 'var(--energy-400)' };
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Insights', to: '/insights' }, { label: 'Genetics' }]}
        title="Genetic Variants" sub="Pharmacogenomics &amp; nutrigenomics variants influencing the protocol" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
        {genetics.map(g => (
          <Card key={g.gene}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--gap-lg)' }}>
              <div style={{ flex: '0 0 220px', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)', marginBottom: 4 }}>{g.gene}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)' }}>{g.variant}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 8 }}>{g.impact}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{g.response}</div>
              </div>
              <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: statusColors[g.status] || 'var(--text-muted)',
                }}>{g.status}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Import overview (/import)
   ============================================================ */
function ImportScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Data import" title="Import" sub="Load external data into the platform" />
      <div className="zt-grid-2">
        <Link to="/import/whoop">
          <Card style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-md)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="heart-pulse" size={22} stroke={1.8} />
              </div>
              <div><div style={{ fontWeight: 600 }}>WHOOP</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>HRV, recovery, sleep</div></div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Import JSON export from WHOOP Analyzer. Maps to Autonomic category.</div>
          </Card>
        </Link>
        <Link to="/import/vault">
          <Card style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-md)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="folder-open" size={22} stroke={1.8} />
              </div>
              <div><div style={{ fontWeight: 600 }}>Vault</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Obsidian vault import</div></div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Import protocol logs and notes from the Obsidian vault.</div>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}

/* ============================================================
   WHOOP import (/import/whoop)
   ============================================================ */
function WhoopScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Import', to: '/import' }, { label: 'WHOOP' }]} title="WHOOP Import" sub="Load the Whoop Analyzer JSON export" />
      <div className="zt-grid-split">
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-lg)' }}>Upload file</div>
          <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--gap-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="upload-cloud" size={36} stroke={1.5} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 'var(--text-sm)', marginBottom: 8 }}>Drop <code>whoop_analysis_report.json</code> here</div>
            <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>or click to browse</div>
          </div>
        </Card>
        <div>
          <Card>
            <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Expected fields</div>
            {['hrv_rmssd', 'recovery_score', 'rhr', 'sleep_performance', 'tdee'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <Icon name="check" size={14} stroke={2} color="var(--vital)" /> {f}
              </div>
            ))}
          </Card>
        </div>
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
      <PageHeader crumb={[{ label: 'Import', to: '/import' }, { label: 'Vault' }]} title="Vault Import" sub="Import from Obsidian vault" />
      <Card>
        <div style={{ padding: 'var(--gap-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="folder-open" size={40} stroke={1.5} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>Obsidian vault import</div>
          <div style={{ fontSize: 'var(--text-sm)' }}>Connect the <code>#Bwell/602/</code> vault path to sync protocol notes and metric targets.</div>
        </div>
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Ingest overview (/ingest)
   ============================================================ */
function IngestScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Lab ingest" title="Ingest" sub="Upload and review lab PDF extractions" />
      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-xl)' }}>
        <Link to="/ingest/upload">
          <Card style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-md)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--focus-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="file-up" size={22} stroke={1.8} color="var(--accent)" />
              </div>
              <div><div style={{ fontWeight: 600 }}>Upload</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Lab PDF upload</div></div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Upload lab report PDFs for AI-assisted extraction and review.</div>
          </Card>
        </Link>
        <Link to="/ingest/review">
          <Card style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-md)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--energy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="clipboard-check" size={22} stroke={1.8} color="var(--energy-500)" />
              </div>
              <div><div style={{ fontWeight: 600 }}>Review</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Extraction review</div></div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Approve, edit, or reject per-field extractions before they enter the metrics store.</div>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Ingest upload (/ingest/upload)
   ============================================================ */
function IngestUploadScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Upload' }]} title="Upload Lab PDF" sub="Consent required — extractions are AI-assisted and owner-reviewed" />
      <Card>
        <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--gap-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="file-up" size={40} stroke={1.5} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>Drop a lab report PDF here</div>
          <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--gap-lg)' }}>Text-extractable PDFs only (LabCorp, Quest, Ulta Lab Tests)</div>
          <button type="button" style={{ padding: '10px 24px', background: 'var(--ink)', color: 'var(--n-50)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Choose file</button>
        </div>
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Ingest review (/ingest/review)
   ============================================================ */
function IngestReviewScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Review' }]} title="Review Extractions" sub="Per-field approve, edit, or reject before metrics are written" />
      <Card>
        <div style={{ padding: 'var(--gap-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="clipboard-check" size={40} stroke={1.5} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>No pending extractions</div>
          <div style={{ fontSize: 'var(--text-sm)' }}>Upload a lab PDF to start the extraction pipeline.</div>
          <Link to="/ingest/upload"><span style={{ display: 'inline-block', marginTop: 'var(--gap-lg)', color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>Go to upload →</span></Link>
        </div>
      </Card>
    </AppShell>
  );
}

/* ============================================================
   Settings (/settings)
   ============================================================ */
function SettingsScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Account" title="Settings" />
      <div className="zt-grid-2">
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Account</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--gap-lg)' }}>
            <div className="zn-avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-lg)' }}>M</div>
            <div>
              <div style={{ fontWeight: 600 }}>Owner</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>owner@example.com</div>
            </div>
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--focus-50)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-block' }}>Owner</div>
        </Card>
        <Card>
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Invites</div>
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
  DashboardScreen,
  MetricsScreen,
  CategoryScreen,
  DetailScreen,
  ProtocolScreen,
  VersionsScreen,
  SupplementsScreen,
  CessationScreen,
  CompareScreen,
  InsightsScreen,
  CorrelationsScreen,
  GeneticsScreen,
  ImportScreen,
  WhoopScreen,
  VaultScreen,
  IngestScreen,
  IngestUploadScreen,
  IngestReviewScreen,
  SettingsScreen,
});

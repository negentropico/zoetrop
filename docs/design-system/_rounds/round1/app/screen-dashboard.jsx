/* Screen 01 — Dashboard */
const { Card, MetricRing, Badge, Button } = window.ZoetropeDesignSystem_48aebc;

function StatTile({ label, value, unit, accent, hint }) {
  return (
    <Card padding="md" style={{ minHeight: 104, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
        <span className="zt-readout" style={{ fontSize: 'var(--text-2xl)', color: accent || 'var(--ink)' }}>{value}</span>
        {unit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{unit}</span>}
        {hint && <span style={{ marginLeft: 'auto', alignSelf: 'center' }}>{hint}</span>}
      </div>
    </Card>
  );
}

function CorrRow({ c, last }) {
  const neg = c.r < 0;
  const col = neg ? 'var(--danger)' : 'var(--vital-500)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{c.supp}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>→ {c.metric} · {c.lag}d lag</div>
      </div>
      <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: col }}>{c.r > 0 ? '+' : ''}{c.r.toFixed(2)}</span>
    </div>
  );
}

function GeneRow({ g, last }) {
  const conf = g.confidence === 'Confirmed' ? 'vital' : 'energy';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{g.gene}</span>
          <Badge tone={conf}>{g.confidence}</Badge>
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{g.note}</div>
      </div>
      <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'right', paddingTop: 2 }}>{g.detail}</span>
    </div>
  );
}

function CategoryCard({ cat }) {
  return (
    <Link to={'/metrics/' + cat.id}>
      <Card interactive padding="lg" style={{ height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
          <CatChip cat={cat} size={42} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'var(--text-lg)', letterSpacing: '-0.01em' }}>{cat.name}</div>
          </div>
          <Icon name="arrow-up-right" size={18} color="var(--text-faint)" style={{ marginLeft: 'auto' }} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', minHeight: 40 }}>{cat.desc}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.tracked} tracked</span>
          <CountDots counts={cat.counts} />
        </div>
      </Card>
    </Link>
  );
}

function DashboardScreen({ path }) {
  const { isMobile } = useViewport();
  const t = ZD.statusTotals;
  const ces = ZD.cessation;
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Today's frame · Jan 15, 2026" title="Dashboard" sub={ZD.hero.title + ' ' + ZD.hero.sub} />

      {/* stat tiles */}
      <div className="zt-grid-4" style={{ marginBottom: 'var(--gap-2xl)' }}>
        <StatTile label="Metrics tracked" value={ZD.metricsCount} />
        <StatTile label="Need a look" value={ZD.needLook} hint={<StatusBadge status="borderline" />} />
        <StatTile label="Active supplements" value={ZD.activeSupplements} />
        <StatTile label="Protocol version" value={ZD.protocolVersion} unit="7 versions" />
      </div>

      {/* cessation + correlations */}
      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-xl)' }}>
        <Card padding="lg">
          <SectionLabel action={<Link to="/protocol/cessation" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>View details →</Link>}>Cessation protocol</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="zt-readout" style={{ fontSize: 'var(--text-3xl)' }}>Day {ces.day}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>of {ces.target}</span>
          </div>
          <p style={{ margin: '8px 0 22px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Optimization phase — Tier 1 supplements only.</p>
          <PhaseBar phases={ces.phases} compact />
        </Card>

        <Card padding="lg">
          <SectionLabel action={<Link to="/insights/correlations" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>View all · 10 →</Link>}>Top correlations</SectionLabel>
          <div>
            {ZD.correlations.slice(0, 3).map((c, i) => <CorrRow key={i} c={c} last={i === 2} />)}
          </div>
          <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>3 strong correlations (|r| ≥ 0.7)</div>
        </Card>
      </div>

      {/* genetics + status */}
      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-3xl)' }}>
        <Card padding="lg">
          <SectionLabel action={<Link to="/insights/correlations" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>View all · 16 →</Link>}>Genetic insights</SectionLabel>
          {ZD.genetics.map((g, i) => <GeneRow key={i} g={g} last={i === ZD.genetics.length - 1} />)}
          <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--warning)' }}>2 K3 variants need verification</div>
        </Card>

        <Card padding="lg">
          <SectionLabel>Metric status</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <MetricRing value={t.optimal} max={ZD.metricsCount} tone="vital" size={132} thickness={13} label={t.optimal} sublabel="optimal" />
            <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ZD.statusOrder.map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <StatusDot status={k} />
                  <span style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{k}</span>
                  <span className="zt-tnum" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-md)' }}>{t[k]}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* category grid */}
      <SectionLabel count={ZD.categoryCount}>Metric categories</SectionLabel>
      <div className="zt-grid-3">
        {ZD.categories.map(cat => <CategoryCard key={cat.id} cat={cat} />)}
      </div>
    </AppShell>
  );
}
window.DashboardScreen = DashboardScreen;

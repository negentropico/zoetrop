/* Screen 04 — Metric detail (chart language for the whole product) */
const { Card: DCard, MetricRing: DRing, Badge: DBadge } = window.ZoetropDesignSystem_48aebc;

function detailHistory(m) {
  if (m.history) return m.history;
  // synthesize from spark for non-WHOOP metrics
  const labels = ['Jan 2026', 'Oct 2025', 'Jul 2025', 'Apr 2025', 'Jan 2025'];
  return m.spark.slice().reverse().map((v, i) => ({ date: labels[i] || ('M' + i), value: v }));
}

function DetailScreen({ path, catId, metricId }) {
  const { isMobile } = useViewport();
  const cat = ZD.findCategory(catId);
  const m = ZD.findMetric(catId, metricId);
  if (!m) return <CategoryScreen path={path} catId={catId} />;
  const s = STATUS[m.status];
  const hist = detailHistory(m);
  const ringPct = Math.max(0.04, Math.min(1, m.value / m.opt[1]));
  const ringTone = m.status === 'optimal' ? 'vital' : 'energy';
  const dirLabel = { higher: 'Higher is better', lower: 'Lower is better', target: 'Target range' }[m.dir] || 'Target range';

  const content = (
    <div style={{ minWidth: 0 }}>
      <Crumb items={[{ label: 'Metrics', to: '/metrics' }, { label: cat.name, to: '/metrics/' + cat.id }, { label: m.name }]} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 'var(--gap-2xl)' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{m.name}</h1>
            <StatusBadge status={m.status} />
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Last updated {m.updated || 'Jan 15, 2026'}{m.src ? ' · ' + m.src : ''}
          </p>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ textAlign: 'right' }}>
            <span className="zt-readout" style={{ fontSize: 'var(--text-3xl)' }}>{m.value.toLocaleString()}</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{m.unit}</div>
          </div>
          <DRing value={ringPct} tone={ringTone} size={92} thickness={10} label={Math.round(ringPct * 100)} sublabel="of optimal" />
        </div>
      </div>

      {/* range status */}
      <DCard padding="lg" style={{ marginBottom: 'var(--gap-lg)' }}>
        <SectionLabel>Range status</SectionLabel>
        <div style={{ padding: '14px 4px 4px' }}>
          <RangeBar m={m} height={14} showEndpoints />
        </div>
        <div style={{ marginTop: 18 }}><RangeLegend /></div>
      </DCard>

      {/* trend */}
      <DCard padding="lg" style={{ marginBottom: 'var(--gap-lg)' }}>
        <SectionLabel action={m.targets ? <DBadge tone="focus">With 2026 targets</DBadge> : null}>Trend over time</SectionLabel>
        <TrendChart metric={m} />
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ width: 16, height: 2.5, background: 'var(--ink)', borderRadius: 2 }} /> Actual</span>
          {m.targets && <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ width: 16, height: 0, borderTop: '2.5px dashed var(--energy-400)' }} /> Target</span>}
          <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ width: 16, height: 9, background: 'var(--vital-50)', border: '1px solid var(--vital-200)', borderRadius: 2 }} /> Optimal band</span>
          <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ width: 16, height: 9, border: '1px dashed var(--n-200)', borderRadius: 2 }} /> Reference</span>
        </div>
      </DCard>

      {/* targets */}
      {m.targets && (
        <DCard tone="focus" padding="lg" style={{ marginBottom: 'var(--gap-lg)' }}>
          <Eyebrow style={{ color: 'var(--focus-500)', marginBottom: 16 }}>2026 targets</Eyebrow>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--focus-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Q1 target · Apr</div>
              <div className="zt-readout" style={{ fontSize: 'var(--text-2xl)', marginTop: 6 }}>{m.targets.q1} <span style={{ fontSize: 'var(--text-md)', color: 'var(--text-muted)' }}>{m.unit}</span></div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--focus-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Q2 stretch · Jul</div>
              <div className="zt-readout" style={{ fontSize: 'var(--text-2xl)', marginTop: 6 }}>{m.targets.q2} <span style={{ fontSize: 'var(--text-md)', color: 'var(--text-muted)' }}>{m.unit}</span></div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--focus-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Direction</div>
              <div style={{ marginTop: 10, fontWeight: 600 }}>{m.targets.dir}</div>
            </div>
          </div>
        </DCard>
      )}

      {/* measurements + details */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: 'var(--gap-lg)' }}>
        <DCard padding="md">
          <div style={{ padding: '4px 8px 14px' }}><SectionLabel count={hist.length}>Measurements</SectionLabel></div>
          <DataTable
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'value', label: m.unit, align: 'right', mono: true, render: (r) => r.value.toFixed(2) + ' ' + m.unit },
            ]}
            rows={hist}
            rowKey={(r) => r.date}
          />
        </DCard>
        <DCard padding="lg">
          <SectionLabel>Details</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Source</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{m.src || 'Bloodwork'}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Improvement direction</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{dirLabel}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reference range</div>
              <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 4 }}>{m.ref[0]}–{m.ref[1]} {m.unit}  ·  optimal {m.opt[0]}–{m.opt[1]}</div>
            </div>
          </div>
        </DCard>
      </div>
    </div>
  );

  return (
    <AppShell path={path}>
      {isMobile ? (
        <>
          <CategoryNav activeCat={catId} />
          {content}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: 'var(--gap-2xl)', alignItems: 'start' }}>
          <CategoryNav activeCat={catId} />
          {content}
        </div>
      )}
    </AppShell>
  );
}
window.DetailScreen = DetailScreen;

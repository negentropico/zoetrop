/* Screen 07 — Insights · correlations (defines the data-table pattern) */
const CD = window.ZoetropeDesignSystem_48aebc;
const SIG_TONE = { strong: 'vital', moderate: 'focus', weak: 'energy', none: 'neutral' };

function CorrBar({ r }) {
  const neg = r < 0;
  const mag = Math.min(1, Math.abs(r));
  const col = neg ? 'var(--danger)' : 'var(--vital)';
  return (
    <div style={{ position: 'relative', width: 120, height: 12, background: 'var(--n-100)', borderRadius: 'var(--radius-pill)' }}>
      <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--border-strong)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 'var(--radius-pill)', background: col,
        width: (mag * 50) + '%', left: neg ? (50 - mag * 50) + '%' : '50%' }} />
    </div>
  );
}

function InsightsTabs({ active, onChange }) {
  const tabs = [['overview', 'Overview'], ['correlations', 'Correlations'], ['genetics', 'Genetics']];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 'var(--gap-2xl)', overflowX: 'auto' }}>
      {tabs.map(([id, label]) => {
        const on = id === active;
        return (
          <button key={id} onClick={() => onChange(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', marginBottom: -1,
            fontFamily: 'var(--font-text)', fontWeight: on ? 600 : 500, fontSize: 'var(--text-base)', color: on ? 'var(--ink)' : 'var(--text-muted)',
            borderBottom: '2px solid ' + (on ? 'var(--ink)' : 'transparent') }}>{label}</button>
        );
      })}
    </div>
  );
}

function StatTileSm({ label, value, tone }) {
  const col = tone ? `var(--${tone}-500)` : 'var(--ink)';
  return (
    <ZCard padding="md" style={{ textAlign: 'center', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
      <span className="zt-readout" style={{ fontSize: 'var(--text-2xl)', color: col }}>{value}</span>
      <Eyebrow style={{ textAlign: 'center' }}>{label}</Eyebrow>
    </ZCard>
  );
}

function brandSelect(value, onChange, options) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      appearance: 'none', WebkitAppearance: 'none', fontFamily: 'var(--font-text)', fontSize: 'var(--text-sm)', fontWeight: 600,
      padding: '9px 36px 9px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--surface)',
      color: 'var(--text)', cursor: 'pointer',
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23756d70\' stroke-width=\'2.2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function CorrelationsScreen({ path }) {
  const { isMobile } = useViewport();
  const [tab, setTab] = useState('correlations');
  const [sig, setSig] = useState('all');
  const [supp, setSupp] = useState('all');
  const [sort, setSort] = useState('r');
  const cs = ZD.corrStats;

  const supps = ['all'].concat(Array.from(new Set(ZD.correlations.map(c => c.supp))));
  let rows = ZD.correlations.filter(c => (sig === 'all' || c.sig === sig) && (supp === 'all' || c.supp === supp));
  rows = rows.slice().sort((a, b) => sort === 'r' ? Math.abs(b.r) - Math.abs(a.r) : sort === 'p' ? a.p - b.p : b.n - a.n);

  const sigPill = (id, label, count) => {
    const on = sig === id;
    return <button key={id} onClick={() => setSig(id)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: 'var(--text-sm)',
      border: '1px solid ' + (on ? 'var(--ink)' : 'var(--border)'), background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--n-50)' : 'var(--text-secondary)' }}>{label}{count != null && <span className="zt-tnum" style={{ marginLeft: 7, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', opacity: 0.7 }}>{count}</span>}</button>;
  };

  let body;
  if (tab === 'overview') {
    body = (
      <>
        <div className="zt-grid-4" style={{ marginBottom: 'var(--gap-xl)' }}>
          <StatTileSm label="Total" value={cs.total} />
          <StatTileSm label="Strong" value={cs.strong} tone="vital" />
          <StatTileSm label="Moderate" value={cs.moderate} tone="focus" />
          <StatTileSm label="Significant · p<0.05" value={cs.sig} tone="energy" />
        </div>
        <ZCard padding="lg">
          <Eyebrow style={{ marginBottom: 10 }}>What this tells you</Eyebrow>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 'var(--leading-relaxed)' }}>You have {cs.total} supplement-to-metric relationships tracked. {cs.strong} are strong (|r| ≥ 0.7) and {cs.sig} are statistically significant. Open the Correlations tab to read the full evidence table.</p>
          <div style={{ marginTop: 18 }}><CD.Button variant="primary" onClick={() => setTab('correlations')} iconRight={<Icon name="arrow-right" size={16} />}>Open correlations</CD.Button></div>
        </ZCard>
      </>
    );
  } else if (tab === 'genetics') {
    body = (
      <ZCard padding="md">
        <div style={{ padding: '4px 8px 8px' }}><SectionLabel count={16}>Genetic profile</SectionLabel></div>
        {ZD.genetics.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{g.gene}</span>
                <CD.Badge tone={g.confidence === 'Confirmed' ? 'vital' : 'energy'}>{g.confidence}</CD.Badge>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{g.note}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{g.detail}</span>
          </div>
        ))}
        <div style={{ padding: '14px 12px 4px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--warning)' }}>2 K3 variants need verification</div>
      </ZCard>
    );
  } else {
    const table = isMobile ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((c, i) => (
          <ZCard key={i} padding="md">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.supp}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>→ {c.metric}</div>
              </div>
              <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-lg)', color: c.r < 0 ? 'var(--danger)' : 'var(--vital-500)' }}>{c.r > 0 ? '+' : ''}{c.r.toFixed(2)}</span>
            </div>
            <CorrBar r={c.r} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <CD.Badge tone={SIG_TONE[c.sig]}>{c.sig}</CD.Badge>
              <span>{c.lag}d lag</span>
              <span style={{ color: c.p < 0.05 ? 'var(--vital-500)' : 'var(--text-muted)' }}>p={c.p.toFixed(3)}{c.p < 0.05 ? ' *' : ''}</span>
              <span>n={c.n}</span>
            </div>
          </ZCard>
        ))}
      </div>
    ) : (
      <ZCard padding="md">
        <DataTable
          rowKey={(r, i) => i}
          columns={[
            { key: 'supp', label: 'Supplement', render: (c) => <span style={{ fontWeight: 600 }}>{c.supp}</span> },
            { key: 'metric', label: 'Metric', render: (c) => <span style={{ color: 'var(--text-secondary)' }}>{c.metric}</span> },
            { key: 'bar', label: 'Correlation', render: (c) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <CorrBar r={c.r} />
                <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.r < 0 ? 'var(--danger)' : 'var(--vital-500)' }}>{c.r > 0 ? '+' : ''}{c.r.toFixed(2)}</span>
              </span>
            ) },
            { key: 'sig', label: 'Significance', render: (c) => <CD.Badge tone={SIG_TONE[c.sig]}>{c.sig}</CD.Badge> },
            { key: 'lag', label: 'Lag', align: 'right', mono: true, render: (c) => c.lag + 'd' },
            { key: 'p', label: 'p-value', align: 'right', mono: true, render: (c) => <span style={{ color: c.p < 0.05 ? 'var(--vital-500)' : 'var(--text-muted)' }}>{c.p.toFixed(3)}{c.p < 0.05 ? ' *' : ''}</span> },
            { key: 'n', label: 'n', align: 'right', mono: true },
          ]}
          rows={rows}
        />
      </ZCard>
    );
    body = (
      <>
        <div className="zt-grid-4" style={{ marginBottom: 'var(--gap-xl)' }}>
          <StatTileSm label="Total" value={cs.total} />
          <StatTileSm label="Strong" value={cs.strong} tone="vital" />
          <StatTileSm label="Moderate" value={cs.moderate} tone="focus" />
          <StatTileSm label="Significant · p<0.05" value={cs.sig} tone="energy" />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--gap-lg)' }}>
          {sigPill('all', 'All', cs.total)}{sigPill('strong', 'Strong', cs.strong)}{sigPill('moderate', 'Moderate', cs.moderate)}{sigPill('weak', 'Weak', cs.weak)}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {brandSelect(supp, setSupp, supps.map(s => ({ value: s, label: s === 'all' ? 'All supplements' : s })))}
            {brandSelect(sort, setSort, [{ value: 'r', label: 'Sort by |r|' }, { value: 'p', label: 'Sort by p-value' }, { value: 'n', label: 'Sort by n' }])}
          </div>
        </div>
        {table}
        <ZCard padding="lg" style={{ marginTop: 'var(--gap-lg)' }}>
          <Eyebrow style={{ marginBottom: 16 }}>Interpretation guide</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Correlation strength</div>
              {[['Strong', '|r| ≥ 0.7 — reliable relationship', 'vital'], ['Moderate', '|r| 0.4–0.7 — meaningful but variable', 'focus'], ['Weak', '|r| 0.2–0.4 — may be influenced by other factors', 'energy']].map(([t, d, tone]) => (
                <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0' }}>
                  <span style={{ fontWeight: 700, color: `var(--${tone}-500)`, width: 76, flex: '0 0 auto' }}>{t}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{d}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Statistical significance</div>
              {[['p < 0.05', 'Statistically significant (*)'], ['Lag days', 'Time offset for correlation analysis'], ['n', 'Sample size — more is better']].map(([t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, width: 76, flex: '0 0 auto' }}>{t}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </ZCard>
      </>
    );
  }

  return (
    <AppShell path={path} wide>
      <PageHeader eyebrow="Insights" title="Insights" sub="See which supplements move which metrics — strength, significance, and lag." />
      <InsightsTabs active={tab} onChange={setTab} />
      {body}
    </AppShell>
  );
}
window.CorrelationsScreen = CorrelationsScreen;

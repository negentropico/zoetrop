/* ============================================================
   Zoetrop — round 4: version detail, insights overview
   (section dashboard).
   Loaded AFTER screens.jsx — InsightsScreen here replaces the
   round-3 link-hub (owner pick: fold stats in, no redirect).
   ============================================================ */

/* shared diff-glyph map (same language as the Compare screen) */
const DIFF_GLYPHS = {
  added:   { g: '+', color: 'var(--vital-500)',  bg: 'var(--optimal-bg)' },
  removed: { g: '−', color: 'var(--deficient)',  bg: 'var(--deficient-bg)' },
  changed: { g: '~', color: 'var(--energy-500)', bg: 'var(--borderline-bg)' },
  same:    { g: '·', color: 'var(--text-faint)', bg: 'transparent' },
};
function diffStacks(stackA, stackB) {
  const names = [...new Set([...stackA.map(s => s.name), ...stackB.map(s => s.name)])];
  return names.map(name => {
    const inA = stackA.find(s => s.name === name);
    const inB = stackB.find(s => s.name === name);
    const state = !inA ? 'added' : !inB ? 'removed' : inA.dose !== inB.dose ? 'changed' : 'same';
    return { name, inA, inB, state };
  });
}

/* ============================================================
   Version detail (/protocol/versions/:version)
   Masthead (chip + date + status) · stack at version ·
   diff-vs-previous reusing the Compare glyph rows.
   ============================================================ */
function VersionDetailScreen({ path, versionId }) {
  const { protocolVersions, versionStacks } = window.ZD;
  const idx = Math.max(0, protocolVersions.findIndex(v => v.id === versionId));
  const v = protocolVersions[idx];
  const prev = idx > 0 ? protocolVersions[idx - 1] : null;
  const stack = versionStacks[v.id] || [];
  const diff = prev ? diffStacks(versionStacks[prev.id] || [], stack).filter(r => r.state !== 'same') : [];
  const isActive = v.status === 'active';

  return (
    <AppShell path={path}>
      <div data-screen-label={'Version ' + v.id}>
        <PageHeader
          crumb={[{ label: 'Protocol', to: '/protocol' }, { label: 'Versions', to: '/protocol/versions' }, { label: v.id }]}
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: isActive ? 'var(--accent)' : 'var(--text-muted)', background: isActive ? 'var(--focus-50)' : 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', padding: '3px 8px' }}>{v.id}</span>
              {v.name.replace(/^P\d+ — /, '')}
            </span>
          }
          sub={v.date + ' · ' + v.description}
          right={
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive ? 'var(--accent)' : 'var(--text-muted)', background: isActive ? 'var(--focus-50)' : 'var(--surface-sunken)', padding: '4px 11px', borderRadius: 'var(--radius-pill)' }}>{v.status}</span>
          }
        />

        <section className="zt-section">
          <SectionLabel count={stack.length}>Stack at {v.id}</SectionLabel>
          <Card pad={false}>
            {stack.length === 0 ? (
              <ChartEmpty height={160} title="No supplement stack" body={v.id + ' is the bloodwork baseline — no interventions yet.'} />
            ) : stack.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xl)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < stack.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)' }}>{s.name}</div>
                <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{s.dose}</div>
              </div>
            ))}
          </Card>
        </section>

        {prev && (
          <section className="zt-section">
            <SectionLabel
              count={diff.length}
              action={<Link to="/protocol/compare" className="zt-link" style={{ fontSize: 'var(--text-xs)' }}>Full compare <Icon name="arrow-right" size={13} stroke={2} /></Link>}
            >Changes vs {prev.id}</SectionLabel>
            <Card pad={false}>
              {diff.length === 0 ? (
                <ChartEmpty height={140} title="No changes" body={'The stack is identical to ' + prev.id + '.'} />
              ) : diff.map((r, i) => {
                const s = DIFF_GLYPHS[r.state];
                return (
                  <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--gap-lg)', alignItems: 'center', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < diff.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{s.g}</span>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: r.state === 'removed' ? 'var(--text-muted)' : 'var(--text)', textDecoration: r.state === 'removed' ? 'line-through' : 'none' }}>{r.name}</div>
                    <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{r.inA ? r.inA.dose : '—'}</div>
                    <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: r.state === 'changed' ? 'var(--energy-500)' : 'var(--text)' }}>{r.inB ? r.inB.dose : '—'}</div>
                  </div>
                );
              })}
            </Card>
          </section>
        )}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Insights overview (/insights) — now a real section dashboard
   (owner pick): headline correlation stats + top pairs +
   genetics counts. Replaces the round-3 link hub.
   ============================================================ */
function InsightsScreen({ path }) {
  const { correlations, genetics } = window.ZD;
  const highSig = correlations.filter(c => c.significance === 'high').length;
  const strongest = [...correlations].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];
  const top = [...correlations].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 4);
  const geneCounts = genetics.reduce((acc, g) => { acc[g.status] = (acc[g.status] || 0) + 1; return acc; }, {});
  const geneColors = { mitigated: 'var(--vital-500)', monitoring: 'var(--energy-500)', nominal: 'var(--text-muted)' };

  return (
    <AppShell path={path}>
      <div data-screen-label="Insights overview">
        <PageHeader eyebrow="Insights" title="Insights" sub="What your markers say about each other — and what your genes say about the protocol" />

        <section className="zt-section">
          <Card>
            <div className="zt-stat-strip">
              {[
                { label: 'Pairs analyzed', value: correlations.length },
                { label: 'High significance', value: highSig },
                { label: 'Strongest pair', value: (strongest.r > 0 ? '+' : '') + strongest.r.toFixed(2), sub: strongest.metric_a + ' ↔ ' + strongest.metric_b },
                { label: 'Variants tracked', value: genetics.length },
              ].map(s => (
                <div key={s.label} className="zt-stat">
                  <div className="zt-eyebrow" style={{ marginBottom: 8 }}>{s.label}</div>
                  <div className="zt-readout" style={{ fontSize: 'var(--text-xl)', color: 'var(--ink)' }}>{s.value}</div>
                  {s.sub && <div className="zt-eyebrow" style={{ marginTop: 5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <div className="zt-grid-2">
          <section>
            <SectionLabel action={<Link to="/insights/correlations" className="zt-link" style={{ fontSize: 'var(--text-xs)' }}>All correlations <Icon name="arrow-right" size={13} stroke={2} /></Link>}>Strongest correlations</SectionLabel>
            <Card pad={false}>
              {top.map((c, i) => (
                <Link key={c.metric_a + c.metric_b} to="/insights/correlations">
                  <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)' }}>
                      {c.metric_a} <span style={{ color: 'var(--text-faint)' }}>↔</span> {c.metric_b}
                    </div>
                    <span className="zt-eyebrow" style={{ color: c.significance === 'high' ? 'var(--vital-500)' : c.significance === 'medium' ? 'var(--energy-500)' : 'var(--text-muted)' }}>{c.significance}</span>
                    <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--ink)', minWidth: 52, textAlign: 'right' }}>{c.r > 0 ? '+' : ''}{c.r.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </Card>
          </section>

          <section>
            <SectionLabel action={<Link to="/insights/genetics" className="zt-link" style={{ fontSize: 'var(--text-xs)' }}>All variants <Icon name="arrow-right" size={13} stroke={2} /></Link>}>Genetics</SectionLabel>
            <Card pad={false}>
              <div style={{ display: 'flex', gap: 'var(--gap-xl)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: '1px solid var(--border)' }}>
                {['mitigated', 'monitoring', 'nominal'].map(k => (
                  <span key={k} className="zt-tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: geneColors[k], display: 'inline-block' }}></span>
                    {geneCounts[k] || 0} {k}
                  </span>
                ))}
              </div>
              {window.ZD.genetics.map((g, i, arr) => (
                <Link key={g.gene} to="/insights/genetics">
                  <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--ink)', flex: '0 0 132px' }}>{g.gene}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.variant}</span>
                    <span className="zt-eyebrow" style={{ color: geneColors[g.status] }}>{g.status}</span>
                  </div>
                </Link>
              ))}
            </Card>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

/* CorrHeatmap was explored here and DROPPED (owner, round-4
   session): not useful enough to keep. The correlations table
   remains the only view. */

Object.assign(window, { VersionDetailScreen, InsightsScreen, diffStacks, DIFF_GLYPHS });

/* Screens 05 + 06 — Protocol overview & Cessation tracker */
const PD = window.ZoetropDesignSystem_48aebc;

function ProtocolTabs({ active }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'versions', label: 'Versions' },
    { id: 'supplements', label: 'Supplements' },
    { id: 'cessation', label: 'Cessation', to: '/protocol/cessation' },
    { id: 'compare', label: 'Compare' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 'var(--gap-2xl)', overflowX: 'auto' }}>
      {tabs.map(t => {
        const on = t.id === active;
        const inner = (
          <span style={{
            display: 'inline-block', padding: '12px 16px', fontFamily: 'var(--font-text)', fontWeight: on ? 600 : 500,
            fontSize: 'var(--text-base)', color: on ? 'var(--ink)' : 'var(--text-muted)', whiteSpace: 'nowrap',
            borderBottom: '2px solid ' + (on ? 'var(--ink)' : 'transparent'), marginBottom: -1,
          }}>{t.label}</span>
        );
        return t.to ? <Link key={t.id} to={t.to}>{inner}</Link> : <a key={t.id} href="#/protocol" onClick={(e) => { e.preventDefault(); window.__setProtocolTab && window.__setProtocolTab(t.id); }}>{inner}</a>;
      })}
    </div>
  );
}

function ProtoStat({ label, value, unit, sub }) {
  return (
    <ZCard padding="md" style={{ minHeight: 116, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Eyebrow>{label}</Eyebrow>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="zt-readout" style={{ fontSize: 'var(--text-2xl)' }}>{value}</span>
          {unit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
      </div>
    </ZCard>
  );
}

function ProtocolScreen({ path, tab }) {
  const [t, setT] = useState(tab || 'overview');
  useEffect(() => { window.__setProtocolTab = (x) => setT(x); return () => { window.__setProtocolTab = null; }; }, []);
  const ces = ZD.cessation;

  let body;
  if (t === 'versions') {
    body = (
      <ZCard padding="md">
        <div style={{ padding: '4px 8px 8px' }}><SectionLabel count={ZD.versions.length}>Version history</SectionLabel></div>
        {ZD.versions.map((v, i) => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-lg)', width: 44 }}>{v.id}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{v.note}</span>
                {v.current && <PD.Badge tone="success">Current</PD.Badge>}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.date}</span>
          </div>
        ))}
      </ZCard>
    );
  } else if (t === 'supplements') {
    body = (
      <div className="zt-grid-2">
        {ZD.tiers.map(tier => (
          <ZCard key={tier.id} padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <PD.Badge tone={tier.tone}>{tier.name}</PD.Badge>
              <span className="zt-readout" style={{ fontSize: 'var(--text-2xl)' }}>{tier.count}</span>
            </div>
            <p style={{ margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{tier.sub}</p>
          </ZCard>
        ))}
      </div>
    );
  } else if (t === 'compare') {
    body = (
      <ZCard padding="lg">
        <Eyebrow style={{ marginBottom: 10 }}>Compare versions</Eyebrow>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 520 }}>Pick two protocol versions to see what changed — dose deltas, added and retired supplements, and the metrics that moved across the window between them.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <PD.Button variant="secondary">P6 · current</PD.Button>
          <span style={{ alignSelf: 'center', color: 'var(--text-faint)' }}>vs</span>
          <PD.Button variant="secondary">P3 · Jul 2025</PD.Button>
          <PD.Button variant="primary">Compare</PD.Button>
        </div>
      </ZCard>
    );
  } else {
    body = (
      <>
        <div className="zt-grid-4" style={{ marginBottom: 'var(--gap-2xl)' }}>
          <ProtoStat label="Current protocol" value="P6" unit="7 versions" sub="Active since Jan 2" />
          <ProtoStat label="Active supplements" value="15" sub="6 core · 5 targeted · 4 other" />
          <ProtoStat label="Cessation" value="Day 167" sub="Optimization phase" />
          <ProtoStat label="Latest milestone" value="Clearing" unit="complete" sub="Day 120 · FAAH" />
        </div>

        <ZCard padding="lg" style={{ marginBottom: 'var(--gap-xl)' }}>
          <SectionLabel action={<Link to="/protocol/cessation" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>View tracker →</Link>}>FAAH cessation timeline</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
            <span className="zt-readout" style={{ fontSize: 'var(--text-xl)' }}>167</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>/ 150 days</span>
          </div>
          <PhaseBar phases={ces.phases} />
        </ZCard>

        <div className="zt-grid-2">
          <ZCard padding="md">
            <div style={{ padding: '4px 8px 8px' }}><SectionLabel action={<a href="#/protocol" onClick={(e) => { e.preventDefault(); setT('versions'); }} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>All →</a>}>Version history</SectionLabel></div>
            {ZD.versions.slice(0, 4).map((v, i) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, width: 38 }}>{v.id}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.note}</span>
                {v.current && <PD.Badge tone="success">Current</PD.Badge>}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.date}</span>
              </div>
            ))}
          </ZCard>
          <ZCard padding="md">
            <div style={{ padding: '4px 8px 8px' }}><SectionLabel action={<a href="#/protocol" onClick={(e) => { e.preventDefault(); setT('supplements'); }} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>Manage →</a>}>Supplements by tier</SectionLabel></div>
            {ZD.tiers.map((tier, i) => (
              <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <PD.Badge tone={tier.tone}>{tier.name}</PD.Badge>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{tier.sub}</span>
                <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-md)' }}>{tier.count}</span>
              </div>
            ))}
          </ZCard>
        </div>
      </>
    );
  }

  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Protocol" title="Protocol" sub="Manage supplement protocols, track version evolution, and monitor cessation progress." />
      <ProtocolTabs active={t} />
      {body}
    </AppShell>
  );
}

/* ---------- Cessation (signature) ---------- */
function PhaseCard({ p }) {
  const completed = p.state === 'completed';
  const current = p.state === 'current';
  const famColor = FAMILY_COLOR[p.family];
  return (
    <ZCard padding="lg" style={{ border: current ? '2px solid var(--ink)' : '1px solid var(--border)', background: current ? 'var(--focus-50)' : 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: completed ? 'var(--vital)' : current ? 'var(--ink)' : 'var(--n-150)', color: completed ? '#fff' : current ? 'var(--n-50)' : 'var(--text-muted)' }}>
            <Icon name={completed ? 'check' : current ? 'play' : 'circle'} size={15} stroke={2.4} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>{p.name}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{p.range}</span>
      </div>
      <p style={{ margin: '12px 0 14px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{p.focus}</p>
      <PD.ProgressBar value={1} max={1} tone={p.family} height={7} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        <span>{completed ? 'Completed' : current ? 'In progress' : 'Upcoming'}</span>
        <span>{p.days} days</span>
      </div>
      <p style={{ margin: '14px 0 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{p.desc}</p>
    </ZCard>
  );
}

function CessationScreen({ path }) {
  const { isMobile } = useViewport();
  const ces = ZD.cessation;
  const st = ces.stats;
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Protocol · cessation" title="Cessation tracker" sub="Your FAAH-informed 150-day protocol, one phase at a time." right={<Link to="/protocol"><PD.Button variant="secondary" iconLeft={<Icon name="arrow-left" size={16} />}>Protocol</PD.Button></Link>} />

      {/* hero */}
      <ZCard padding="lg" style={{ marginBottom: 'var(--gap-xl)' }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <PD.MetricRing value={st.complete} max={100} tone="vital" size={150} thickness={15} label="100%" sublabel="complete" />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className="zt-readout" style={{ fontSize: 'var(--text-3xl)' }}>Day {ces.day}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{ces.phaseName} phase · {ces.daysIn} days in · target {ces.target}</span>
            </div>
            <div style={{ marginTop: 22 }}><PhaseBar phases={ces.phases} height={16} /></div>
          </div>
        </div>
      </ZCard>

      {/* stat tiles */}
      <div className="zt-grid-4" style={{ marginBottom: 'var(--gap-2xl)' }}>
        <ProtoStat label="Current day" value={st.currentDay} />
        <ProtoStat label="Days remaining" value={st.daysRemaining} sub="Past target" />
        <ProtoStat label="Until next phase" value={st.untilNextPhase} />
        <ProtoStat label="Complete" value={st.complete + '%'} />
      </div>

      {/* phase cards */}
      <SectionLabel count={4}>Phases</SectionLabel>
      <div className="zt-grid-2" style={{ marginBottom: 'var(--gap-2xl)' }}>
        {ces.phases.map(p => <PhaseCard key={p.id} p={p} />)}
      </div>

      {/* timeline + why */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', gap: 'var(--gap-lg)', marginBottom: 'var(--gap-lg)' }}>
        <ZCard padding="lg">
          <SectionLabel>Timeline</SectionLabel>
          {ces.timeline.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < ces.timeline.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-sm)', color: r.tone === 'vital' ? 'var(--vital-500)' : 'var(--ink)' }}>{r.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '14px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{ces.notes}</div>
        </ZCard>
        <ZCard tone="focus" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Icon name="info" size={20} color="var(--focus-500)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>Why 150 days?</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{ces.why}</p>
        </ZCard>
      </div>
    </AppShell>
  );
}

Object.assign(window, { ProtocolScreen, CessationScreen });

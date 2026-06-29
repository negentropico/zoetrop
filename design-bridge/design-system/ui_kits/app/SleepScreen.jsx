/* Sleep — last night's stages, duration, and weekly rhythm. */

function SleepScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const { Card, Stat, Badge, ProgressBar } = NS;
  const { ZBarChart } = window.ZApp;

  // Sleep stage hypnogram segments (rem/deep/light/awake) as a stacked timeline
  const stages = [
    { k: 'Light', c: 'var(--focus-200)', pct: 46 },
    { k: 'Deep', c: 'var(--focus)', pct: 23 },
    { k: 'REM', c: 'var(--focus-400)', pct: 26 },
    { k: 'Awake', c: 'var(--n-200)', pct: 5 },
  ];
  const week = [
    { label: 'M', value: 6.5 }, { label: 'T', value: 7.1 }, { label: 'W', value: 5.9 },
    { label: 'T', value: 7.8 }, { label: 'F', value: 6.7 }, { label: 'S', value: 8.2 },
    { label: 'S', value: 7.7 },
  ];

  return (
    <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card accent="focus" elevation="sm" padding="lg">
        <div className="zt-eyebrow" style={{ marginBottom: 6 }}>Last night · 23:18 → 07:00</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="zt-readout" style={{ fontSize: 52, color: 'var(--focus-500)' }}>7:42</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>asleep</span>
          <Badge tone="focus" style={{ marginLeft: 'auto' }}>91% of goal</Badge>
        </div>

        {/* stacked stage bar */}
        <div style={{ display: 'flex', height: 16, borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginTop: 18, gap: 2 }}>
          {stages.map(s => (
            <div key={s.k} style={{ width: `${s.pct}%`, background: s.c }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {stages.map(s => (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.c }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{s.k} {s.pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card accent="focus" elevation="sm" padding="md"><Stat label="Deep" value="1:48" size="sm" tone="focus" /></Card>
        <Card accent="focus" elevation="sm" padding="md"><Stat label="Resting HR" value="54" unit="bpm" size="sm" tone="focus" /></Card>
        <Card accent="focus" elevation="sm" padding="md"><Stat label="Restfulness" value="88" size="sm" tone="focus" /></Card>
      </div>

      <Card elevation="sm" padding="lg">
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Sleep this week</h3>
        <ZBarChart data={week} tone="focus" goal={8} height={120} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Stat label="Avg duration" value="7.1" unit="hrs" size="sm" />
          <Stat label="Consistency" value="Good" size="sm" tone="focus" />
        </div>
      </Card>
    </div>
  );
}

window.ZApp = Object.assign(window.ZApp || {}, { SleepScreen });

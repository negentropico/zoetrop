/* Today — the home dashboard: three metric rings + summary cards. */

function TodayScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const { MetricRing, Card, Stat, Badge, ProgressBar } = NS;
  const { ZSparkline } = window.ZApp;

  return (
    <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Rings hero */}
      <Card elevation="sm" padding="lg">
        <div className="zt-eyebrow" style={{ marginBottom: 14 }}>Today · in motion</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <MetricRing value={6418} max={8000} tone="energy" size={104} thickness={11} label="80%" sublabel="Move" />
          <MetricRing value={42} max={60} tone="vital" size={104} thickness={11} label="42" sublabel="Recover" />
          <MetricRing value={0.91} tone="focus" size={104} thickness={11} label="91%" sublabel="Sleep" />
        </div>
      </Card>

      {/* Move summary */}
      <Card accent="energy" elevation="sm" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Stat label="Steps" value="6,418" tone="energy" trend={{ dir: 'up', value: '12%' }} />
          <Badge tone="energy">1,582 to goal</Badge>
        </div>
        <ProgressBar value={6418} max={8000} tone="energy" />
      </Card>

      {/* Vital + Sleep row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card accent="vital" elevation="sm" padding="md">
          <Stat label="Resting HR" value="58" unit="bpm" tone="vital" trend={{ dir: 'down', value: '3' }} />
          <div style={{ marginTop: 10, marginInline: -4 }}>
            <ZSparkline points={[64, 62, 63, 60, 61, 59, 58]} tone="vital" height={44} />
          </div>
        </Card>
        <Card accent="focus" elevation="sm" padding="md">
          <Stat label="Last night" value="7:42" unit="hrs" tone="focus" />
          <div style={{ marginTop: 10 }}>
            <Badge tone="focus" variant="soft">Deep 1:48</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Best sleep this week.</div>
        </Card>
      </div>

      {/* Coach nudge */}
      <Card tone="mist" elevation="flat" padding="md">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: 'var(--ink)', flex: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i data-lucide="wind" style={{ width: 20, height: 20, color: 'var(--energy)' }}></i>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>You usually wind down around now.</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try 4 minutes of breathing. Lights low?</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

window.ZApp = Object.assign(window.ZApp || {}, { TodayScreen });

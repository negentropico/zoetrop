/* Trends — the "moving picture": longer-range view across all three families. */

function TrendsScreen() {
  const NS = window.ZoetropeDesignSystem_48aebc;
  const { Card, Stat, SegmentedControl, Badge } = NS;
  const { ZSparkline } = window.ZApp;
  const [range, setRange] = React.useState('30d');

  const rows = [
    { tone: 'energy', label: 'Avg steps', value: '7,772', unit: '/day', trend: { dir: 'up', value: '8%' }, pts: [6.8, 7.1, 6.9, 7.4, 7.2, 7.6, 7.8] },
    { tone: 'vital', label: 'Resting HR', value: '57', unit: 'bpm', trend: { dir: 'down', value: '4%' }, pts: [61, 60, 60, 59, 58, 58, 57] },
    { tone: 'focus', label: 'Sleep', value: '7.1', unit: 'hrs', trend: { dir: 'up', value: '6%' }, pts: [6.5, 6.7, 6.6, 6.9, 7.0, 7.0, 7.1] },
  ];

  return (
    <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
        <SegmentedControl options={['7d', '30d', '90d', '1y']} value={range} onChange={setRange} />
      </div>

      <Card tone="focus" elevation="sm" padding="lg">
        <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Wellness score · trending up</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="zt-readout" style={{ fontSize: 56, color: 'var(--focus-600)' }}>82</span>
          <Badge tone="success">↑ 7 pts this month</Badge>
        </div>
        <div style={{ marginTop: 8, marginInline: -6 }}>
          <ZSparkline points={[71, 73, 72, 75, 74, 78, 77, 80, 79, 82]} tone="focus" height={64} />
        </div>
      </Card>

      {rows.map(r => (
        <Card key={r.label} accent={r.tone} elevation="sm" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ flex: 'none', minWidth: 120 }}>
              <Stat label={r.label} value={r.value} unit={r.unit} tone={r.tone} trend={r.trend} size="md" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ZSparkline points={r.pts} tone={r.tone} height={48} fill={false} />
            </div>
          </div>
        </Card>
      ))}

      <Card tone="mist" elevation="flat" padding="md">
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>Your last 30 days, in motion.</strong> More sleep is pulling
          your resting heart rate down. Keep the wind-down routine going.
        </div>
      </Card>
    </div>
  );
}

window.ZApp = Object.assign(window.ZApp || {}, { TrendsScreen });

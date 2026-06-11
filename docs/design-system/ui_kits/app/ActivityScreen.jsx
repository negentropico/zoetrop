/* Move — activity detail: hero ring, weekly bars, breakdown stats. */

function ActivityScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const { MetricRing, Card, Stat, SegmentedControl, Badge } = NS;
  const { ZBarChart } = window.ZApp;
  const [range, setRange] = React.useState('Week');

  const week = [
    { label: 'M', value: 7200 }, { label: 'T', value: 9100 }, { label: 'W', value: 5400 },
    { label: 'T', value: 8300 }, { label: 'F', value: 6800 }, { label: 'S', value: 11200 },
    { label: 'S', value: 6418 },
  ];

  return (
    <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MetricRing value={6418} max={8000} tone="energy" size={168} thickness={16}>
          <span className="zt-readout" style={{ fontSize: 44 }}>6,418</span>
          <span className="zt-eyebrow" style={{ marginTop: 4 }}>of 8,000 steps</span>
        </MetricRing>
      </div>

      <Card elevation="sm" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18 }}>This week</h3>
          <SegmentedControl size="sm" options={['Week', 'Month', 'Year']} value={range} onChange={setRange} />
        </div>
        <ZBarChart data={week} tone="energy" goal={8000} height={130} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Stat label="Daily avg" value="7,772" size="sm" />
          <Stat label="Best · Sat" value="11,200" size="sm" tone="energy" />
          <Stat label="Streak" value="6" unit="days" size="sm" />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card accent="energy" elevation="sm" padding="md">
          <Stat label="Active min" value="42" unit="min" tone="energy" />
        </Card>
        <Card accent="energy" elevation="sm" padding="md">
          <Stat label="Distance" value="4.6" unit="km" tone="energy" />
        </Card>
        <Card accent="energy" elevation="sm" padding="md">
          <Stat label="Calories" value="2,140" unit="kcal" tone="energy" />
        </Card>
        <Card accent="energy" elevation="sm" padding="md">
          <Stat label="Flights" value="12" tone="energy" />
        </Card>
      </div>

      <Card tone="mist" elevation="flat" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge tone="energy" variant="solid">Frame</Badge>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You move most on weekends — Saturday is your peak.</span>
        </div>
      </Card>
    </div>
  );
}

window.ZApp = Object.assign(window.ZApp || {}, { ActivityScreen });

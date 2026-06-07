/* App root — tab navigation, header, floating add button + entry sheet. */

function ZApp_Root() {
  const NS = window.ZoetropeDesignSystem_48aebc;
  const { Button, IconButton } = NS;
  const { ZHeader, ZTabBar, TodayScreen, ActivityScreen, SleepScreen, TrendsScreen } = window.ZApp;
  const [tab, setTab] = React.useState('today');
  const [sheet, setSheet] = React.useState(false);

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });

  const meta = {
    today: { eyebrow: 'Thursday · June 4', title: 'Today' },
    activity: { eyebrow: 'Move', title: 'Activity' },
    sleep: { eyebrow: 'Focus', title: 'Sleep' },
    trends: { eyebrow: 'In motion', title: 'Trends' },
  }[tab];

  const Screen = { today: TodayScreen, activity: ActivityScreen, sleep: SleepScreen, trends: TrendsScreen }[tab];

  const entries = [
    { icon: 'footprints', label: 'Workout', tone: 'energy' },
    { icon: 'heart-pulse', label: 'Heart check', tone: 'vital' },
    { icon: 'moon', label: 'Sleep', tone: 'focus' },
    { icon: 'wind', label: 'Breathe', tone: 'vital' },
    { icon: 'scale', label: 'Weight', tone: 'energy' },
    { icon: 'notebook-pen', label: 'Note', tone: 'focus' },
  ];
  const toneColor = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      {/* scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <ZHeader eyebrow={meta.eyebrow} title={meta.title} />
        <Screen />
        <div style={{ height: 8 }} />
      </div>

      {/* floating add */}
      <button onClick={() => setSheet(true)} aria-label="Add entry" style={{
        position: 'absolute', right: 18, bottom: 86, width: 56, height: 56, borderRadius: '50%',
        border: 'none', background: 'var(--ink)', color: '#fff', cursor: 'pointer',
        boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 5,
      }}>
        <i data-lucide="plus" style={{ width: 26, height: 26 }}></i>
      </button>

      <ZTabBar active={tab} onChange={(t) => { setTab(t); setSheet(false); }} />

      {/* add sheet */}
      {sheet && (
        <div onClick={() => setSheet(false)} style={{
          position: 'absolute', inset: 0, background: 'rgba(39,35,36,0.38)', zIndex: 10,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: 'var(--surface)', borderRadius: '28px 28px 0 0',
            padding: '14px 20px calc(20px + env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--n-200)', margin: '2px auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20 }}>Log a frame</h3>
              <IconButton label="Close" variant="soft" onClick={() => setSheet(false)}><i data-lucide="x" style={{ width: 18, height: 18 }}></i></IconButton>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
              {entries.map(e => (
                <button key={e.label} onClick={() => setSheet(false)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '18px 8px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)',
                  cursor: 'pointer',
                }}>
                  <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i data-lucide={e.icon} style={{ width: 22, height: 22, color: toneColor[e.tone] }}></i>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</span>
                </button>
              ))}
            </div>
            <Button variant="primary" fullWidth onClick={() => setSheet(false)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}

window.ZApp = Object.assign(window.ZApp || {}, { ZApp_Root });

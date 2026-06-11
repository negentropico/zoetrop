/* Zoetrop app — shared parts: Header, TabBar, BarChart, Sparkline, AddSheet.
   Primitives are read from the DS namespace INSIDE component bodies so this
   file is safe whether loaded directly or via the compiled bundle. */

function ZHeader({ title, eyebrow, right = null }) {
  const NS = window.ZoetropDesignSystem_48aebc;
  const { Avatar } = NS;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px' }}>
      <div>
        {eyebrow && <div className="zt-eyebrow" style={{ marginBottom: 3 }}>{eyebrow}</div>}
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
      </div>
      {right !== null ? right : <Avatar name="Maya Okafor" ring="vital" size={40} />}
    </div>
  );
}

function ZTabBar({ active, onChange }) {
  const tabs = [
    { id: 'today', icon: 'sun', label: 'Today' },
    { id: 'activity', icon: 'activity', label: 'Move' },
    { id: 'sleep', icon: 'moon', label: 'Sleep' },
    { id: 'trends', icon: 'chart-no-axes-column', label: 'Trends' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', alignItems: 'center',
      padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
      background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(18px)',
      borderTop: '1px solid var(--border)',
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0',
            color: on ? 'var(--focus)' : 'var(--text-faint)',
            transition: 'color var(--dur-fast) var(--ease-out)',
          }}>
            <i data-lucide={t.icon} style={{ width: 22, height: 22 }}></i>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Simple vertical bar chart (7 days). data: [{label, value}], max optional */
function ZBarChart({ data, max, tone = 'energy', height = 120, goal = null }) {
  const colors = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };
  const mx = max || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, position: 'relative' }}>
      {goal != null && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(goal / mx) * 100}%`, borderTop: '1.5px dashed var(--n-300)' }} />
      )}
      {data.map((d, i) => {
        const h = Math.max(3, (d.value / mx) * 100);
        const today = i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%', height: `${h}%`, borderRadius: 'var(--radius-sm)',
              background: today ? colors[tone] : 'var(--n-150)',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: today ? 'var(--text)' : 'var(--text-faint)' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Smooth sparkline */
function ZSparkline({ points, tone = 'vital', width = 300, height = 56, fill = true }) {
  const colors = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const pts = points.map((p, i) => [i * step, height - 6 - ((p - min) / range) * (height - 12)]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const id = 'spark' + tone;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors[tone]} stopOpacity="0.22" />
          <stop offset="100%" stopColor={colors[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={colors[tone]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={colors[tone]} />
    </svg>
  );
}

window.ZApp = Object.assign(window.ZApp || {}, { ZHeader, ZTabBar, ZBarChart, ZSparkline });

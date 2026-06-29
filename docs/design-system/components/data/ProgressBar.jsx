import React from 'react';

/**
 * Zoetrope ProgressBar — linear track. Sweeps on mount; tone maps to metric family.
 */
export function ProgressBar({ value = 0, max = 1, tone = 'focus', height = 8, showValue = false, label = null, style = {}, ...rest }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : value));
  const tones = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };
  const fill = tones[tone] || tones.focus;
  const [draw, setDraw] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }} {...rest}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          {label && <span style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>}
          {showValue && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Math.round(pct * 100)}%</span>}
        </div>
      )}
      <div style={{ height, borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunken)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${draw * 100}%`, background: fill, borderRadius: 'var(--radius-pill)',
          transition: 'width var(--dur-ring) var(--ease-out)',
        }} />
      </div>
    </div>
  );
}

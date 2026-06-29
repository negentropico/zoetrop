import React from 'react';

/**
 * Zoetrope MetricRing — the signature progress ring. Sweeps on mount.
 * `tone` maps to a metric family; supports a center label/value.
 */
export function MetricRing({
  value = 0,            // 0..1 (or 0..100 if max provided)
  max = 1,
  tone = 'focus',
  size = 120,
  thickness = 12,
  trackColor = 'var(--surface-sunken)',
  label = null,
  sublabel = null,
  children = null,
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, max ? value / max : value));
  const tones = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };
  const stroke = tones[tone] || tones.focus;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const [draw, setDraw] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }} {...rest}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - draw)}
          style={{ transition: 'stroke-dashoffset var(--dur-ring) var(--ease-out)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1,
      }}>
        {children ? children : (
          <>
            {label != null && (
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-medium)',
                fontVariantNumeric: 'tabular-nums', fontSize: size * 0.26, lineHeight: 1, color: 'var(--text)',
              }}>{label}</span>
            )}
            {sublabel && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: Math.max(9, size * 0.085), textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)',
              }}>{sublabel}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

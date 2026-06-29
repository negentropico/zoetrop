import React from 'react';

/**
 * Zoetrope Stat — a metric readout: eyebrow label, big value+unit, optional trend.
 */
export function Stat({
  label,
  value,
  unit = null,
  tone = 'neutral',
  trend = null,        // { dir: 'up'|'down', value: '12%' }
  align = 'left',
  size = 'md',
  style = {},
  ...rest
}) {
  const tones = { energy: 'var(--energy-600)', vital: 'var(--vital-500)', focus: 'var(--focus-500)', neutral: 'var(--text)' };
  const valColor = tones[tone] || tones.neutral;
  const valSize = { sm: 24, md: 34, lg: 48 }[size] || 34;
  const trendUp = trend && trend.dir === 'up';
  const trendColor = trend ? (trend.dir === 'up' ? 'var(--vital-500)' : 'var(--danger)') : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: align === 'center' ? 'center' : 'flex-start', ...style }} {...rest}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'var(--text-muted)',
      }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-medium)', fontVariantNumeric: 'tabular-nums',
          fontSize: valSize, lineHeight: 1, letterSpacing: '-0.01em', color: valColor,
        }}>{value}</span>
        {unit && <span style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{unit}</span>}
      </span>
      {trend && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: trendColor,
        }}>
          <span style={{ fontSize: '1.1em', lineHeight: 1 }}>{trendUp ? '\u2191' : '\u2193'}</span>{trend.value}
        </span>
      )}
    </div>
  );
}

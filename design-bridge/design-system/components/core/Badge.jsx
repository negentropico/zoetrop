import React from 'react';

/**
 * Zoetrop Badge — small status/metric pill. `tone` maps to a metric family.
 */
export function Badge({ tone = 'neutral', variant = 'soft', children, style = {}, ...rest }) {
  const tones = {
    energy: { c: 'var(--energy-600)', bg: 'var(--energy-50)', solid: 'var(--energy)', solidText: 'var(--ink)' },
    vital: { c: 'var(--vital-500)', bg: 'var(--vital-50)', solid: 'var(--vital)', solidText: '#fff' },
    focus: { c: 'var(--focus-500)', bg: 'var(--focus-50)', solid: 'var(--focus)', solidText: '#fff' },
    neutral: { c: 'var(--text-secondary)', bg: 'var(--surface-sunken)', solid: 'var(--ink)', solidText: 'var(--n-50)' },
    success: { c: 'var(--vital-500)', bg: 'var(--vital-50)', solid: 'var(--success)', solidText: '#fff' },
    danger: { c: 'var(--danger)', bg: 'var(--danger-bg)', solid: 'var(--danger)', solidText: '#fff' },
  };
  const t = tones[tone] || tones.neutral;
  const styles = variant === 'solid'
    ? { background: t.solid, color: t.solidText }
    : variant === 'outline'
    ? { background: 'transparent', color: t.c, boxShadow: `inset 0 0 0 1.5px ${t.c}` }
    : { background: t.bg, color: t.c };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-regular)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '4px 9px', borderRadius: 'var(--radius-pill)', lineHeight: 1, whiteSpace: 'nowrap',
      ...styles, ...style,
    }} {...rest}>
      {children}
    </span>
  );
}

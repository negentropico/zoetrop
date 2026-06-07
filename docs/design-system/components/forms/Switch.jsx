import React from 'react';

/**
 * Zoetrope Switch — on/off toggle. On-color maps to a metric family.
 */
export function Switch({ checked = false, onChange, tone = 'focus', size = 'md', disabled = false, label = null, style = {}, ...rest }) {
  const dims = size === 'sm' ? { w: 38, h: 22, k: 16 } : { w: 48, h: 28, k: 22 };
  const tones = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--accent)' };
  const onColor = tones[tone] || tones.focus;
  const toggle = () => !disabled && onChange && onChange(!checked);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, opacity: disabled ? 0.5 : 1, ...style }}>
      <button
        type="button" role="switch" aria-checked={checked} onClick={toggle} disabled={disabled}
        style={{
          position: 'relative', width: dims.w, height: dims.h, flex: 'none', padding: 0, border: 'none',
          borderRadius: 'var(--radius-pill)', cursor: disabled ? 'not-allowed' : 'pointer',
          background: checked ? onColor : 'var(--n-300)',
          transition: 'background var(--dur-base) var(--ease-out)',
        }}
        {...rest}
      >
        <span style={{
          position: 'absolute', top: (dims.h - dims.k) / 2, left: checked ? dims.w - dims.k - (dims.h - dims.k) / 2 : (dims.h - dims.k) / 2,
          width: dims.k, height: dims.k, borderRadius: '50%', background: '#fff',
          boxShadow: 'var(--shadow-sm)', transition: 'left var(--dur-base) var(--ease-out)',
        }} />
      </button>
      {label && <span style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{label}</span>}
    </span>
  );
}

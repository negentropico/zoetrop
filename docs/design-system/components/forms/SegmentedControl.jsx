import React from 'react';

/**
 * Zoetrope SegmentedControl — compact tab switch for ranges/views (Day/Week/Month).
 */
export function SegmentedControl({ options = [], value, onChange, size = 'md', style = {}, ...rest }) {
  const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const h = size === 'sm' ? 32 : 40;
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex', padding: 3, gap: 2, background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-pill)', height: h, ...style,
      }}
      {...rest}
    >
      {opts.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value} role="tab" aria-selected={active} onClick={() => onChange && onChange(o.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '0 16px', height: h - 6, border: 'none', cursor: 'pointer',
              borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-text)', fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
              fontWeight: 'var(--fw-semibold)',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

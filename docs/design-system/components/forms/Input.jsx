import React from 'react';

/**
 * Zoetrop Input — text field with optional label, leading icon, and hint/error.
 */
export function Input({
  label = null,
  hint = null,
  error = null,
  iconLeft = null,
  type = 'text',
  size = 'md',
  value,
  onChange,
  placeholder,
  disabled = false,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = { sm: 38, md: 46, lg: 54 }[size] || 46;
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-strong)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <span style={{
          fontFamily: 'var(--font-text)', fontSize: 'var(--text-sm)',
          fontWeight: 'var(--fw-medium)', color: 'var(--text-secondary)',
        }}>{label}</span>
      )}
      <span style={{
        display: 'flex', alignItems: 'center', gap: 9, height: h, padding: '0 14px',
        background: disabled ? 'var(--surface-sunken)' : 'var(--surface)',
        border: `1.5px solid ${borderColor}`, borderRadius: 'var(--radius-md)',
        boxShadow: focus ? 'var(--shadow-ring)' : 'none',
        transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      }}>
        {iconLeft && <span style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>{iconLeft}</span>}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-text)', fontSize: 'var(--text-base)', color: 'var(--text)',
          }}
          {...rest}
        />
      </span>
      {(hint || error) && (
        <span style={{
          fontFamily: 'var(--font-text)', fontSize: 'var(--text-xs)',
          color: error ? 'var(--danger)' : 'var(--text-muted)',
        }}>{error || hint}</span>
      )}
    </label>
  );
}

import React from 'react';

/**
 * Zoetrop Button — the primary action primitive.
 * Self-contained: styling via CSS custom properties from styles.css.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  onClick,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '0 14px', height: 34, fontSize: 'var(--text-sm)', gap: 7 },
    md: { padding: '0 20px', height: 44, fontSize: 'var(--text-base)', gap: 8 },
    lg: { padding: '0 28px', height: 54, fontSize: 'var(--text-md)', gap: 10 },
  };
  const variants = {
    primary: {
      background: 'var(--accent)', color: 'var(--accent-on)', border: '1.5px solid transparent',
    },
    secondary: {
      background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border-strong)',
    },
    ghost: {
      background: 'transparent', color: 'var(--text)', border: '1.5px solid transparent',
    },
    ink: {
      background: 'var(--ink)', color: 'var(--text-on-ink)', border: '1.5px solid transparent',
    },
    danger: {
      background: 'var(--danger)', color: '#fff', border: '1.5px solid transparent',
    },
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;

  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const hoverFx = !disabled && hover ? (
    variant === 'primary' ? { background: 'var(--accent-hover)' } :
    variant === 'ink' ? { background: 'var(--n-800)' } :
    variant === 'danger' ? { filter: 'brightness(0.94)' } :
    { background: 'var(--surface-sunken)' }
  ) : {};

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, height: s.height, padding: s.padding, width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-text)', fontSize: s.fontSize, fontWeight: 'var(--fw-semibold)',
        letterSpacing: '0.005em', lineHeight: 1, whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-pill)', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out)',
        transform: !disabled && press ? 'scale(0.97)' : 'scale(1)',
        opacity: disabled ? 0.45 : 1,
        ...v, ...hoverFx, ...style,
      }}
      {...rest}
    >
      {iconLeft && <span style={{ display: 'inline-flex' }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex' }}>{iconRight}</span>}
    </button>
  );
}

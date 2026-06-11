import React from 'react';

/**
 * Zoetrop IconButton — square/circular control wrapping a single icon.
 * Pass the icon as children (e.g. a Lucide <i> or SVG).
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  round = false,
  disabled = false,
  label,
  onClick,
  children,
  style = {},
  ...rest
}) {
  const dims = { sm: 32, md: 40, lg: 48 }[size] || 40;
  const variants = {
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid transparent' },
    soft: { background: 'var(--surface-sunken)', color: 'var(--text)', border: '1.5px solid transparent' },
    outline: { background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border-strong)' },
    ink: { background: 'var(--ink)', color: 'var(--text-on-ink)', border: '1.5px solid transparent' },
  };
  const v = variants[variant] || variants.ghost;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const hoverFx = !disabled && hover ? (
    variant === 'ink' ? { background: 'var(--n-800)' } :
    variant === 'ghost' ? { background: 'var(--surface-sunken)', color: 'var(--text)' } :
    { background: 'var(--n-100)' }
  ) : {};

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dims, height: dims, padding: 0,
        borderRadius: round ? 'var(--radius-pill)' : 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
        transform: !disabled && press ? 'scale(0.92)' : 'scale(1)',
        ...v, ...hoverFx, ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

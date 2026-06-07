import React from 'react';

/**
 * Zoetrope Card — the base surface "frame". Soft warm shadow, gentle radius.
 * `accent` paints a metric-colored top hairline; `tone` tints the whole surface.
 */
export function Card({
  elevation = 'sm',
  accent = null,
  tone = null,
  padding = 'lg',
  interactive = false,
  onClick,
  children,
  style = {},
  ...rest
}) {
  const shadows = {
    flat: 'none', xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)', lg: 'var(--shadow-lg)',
  };
  const pads = { none: 0, sm: 'var(--gap-md)', md: 'var(--gap-lg)', lg: 'var(--gap-xl)' };
  const accents = {
    energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)', ink: 'var(--ink)',
  };
  const tones = {
    energy: 'var(--energy-50)', vital: 'var(--vital-50)', focus: 'var(--focus-50)', mist: 'var(--surface-sunken)',
  };
  const [hover, setHover] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        position: 'relative',
        background: tone ? tones[tone] : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: pads[padding] ?? pads.lg,
        boxShadow: hover ? 'var(--shadow-md)' : shadows[elevation],
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        cursor: interactive ? 'pointer' : 'default',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {accent && (
        <span style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: accents[accent] || accent,
        }} />
      )}
      {children}
    </div>
  );
}

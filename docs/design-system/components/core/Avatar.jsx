import React from 'react';

/**
 * Zoetrope Avatar — initials or image, with optional metric ring + status dot.
 */
export function Avatar({
  src = null,
  name = '',
  size = 40,
  ring = null,
  status = null,
  style = {},
  ...rest
}) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const rings = { energy: 'var(--energy)', vital: 'var(--vital)', focus: 'var(--focus)' };
  const statusColors = { online: 'var(--vital)', away: 'var(--energy)', off: 'var(--n-400)' };
  const pad = ring ? 3 : 0;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', ...style }} {...rest}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: 'var(--radius-pill)',
        background: ring ? rings[ring] : 'transparent', padding: pad, boxSizing: 'content-box',
      }}>
        <span style={{
          width: size, height: size, borderRadius: 'var(--radius-pill)', overflow: 'hidden',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: src ? 'var(--surface-sunken)' : 'var(--ink)',
          color: 'var(--n-50)', fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-medium)',
          fontSize: size * 0.38, border: ring ? '2px solid var(--surface)' : 'none',
        }}>
          {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </span>
      </span>
      {status && (
        <span style={{
          position: 'absolute', right: 0, bottom: 0, width: size * 0.28, height: size * 0.28,
          minWidth: 9, minHeight: 9, borderRadius: '50%', background: statusColors[status],
          border: '2px solid var(--surface)',
        }} />
      )}
    </span>
  );
}

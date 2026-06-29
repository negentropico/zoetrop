/* ============================================================
   Zoetrop — round 5 · LINE-signature
   The expressive layer, as discrete components. Pairs with
   new.css (zt-sig-* rules). Activates the locked spiral +
   phyllotaxis motif, the "settle" motion gesture, branded
   empty/loading states, and the frame-dot icon signature.
   No new tokens; all colour resolves to --ink / --n-* / --border.
   ============================================================ */

/* The golden spiral path — identical curve to SpiralMark / the
   brand mark-spiral.svg. pathLength=1 lets the draw-on animation
   in new.css unspool it along --ease-frame. */
const ZT_SPIRAL_D = "M44.49,63.16 L44.60,63.16 L44.71,63.17 L44.82,63.20 L44.93,63.23 L45.04,63.28 L45.15,63.34 L45.26,63.42 L45.36,63.50 L45.45,63.60 L45.54,63.72 L45.61,63.84 L45.68,63.97 L45.73,64.12 L45.77,64.27 L45.80,64.43 L45.81,64.60 L45.80,64.78 L45.77,64.96 L45.73,65.14 L45.66,65.32 L45.58,65.49 L45.47,65.67 L45.35,65.83 L45.20,65.99 L45.04,66.14 L44.85,66.28 L44.64,66.40 L44.42,66.50 L44.18,66.58 L43.93,66.64 L43.66,66.67 L43.39,66.68 L43.10,66.66 L42.82,66.61 L42.52,66.52 L42.23,66.41 L41.95,66.26 L41.67,66.08 L41.40,65.87 L41.15,65.62 L40.91,65.35 L40.70,65.04 L40.52,64.70 L40.36,64.33 L40.24,63.93 L40.16,63.52 L40.12,63.08 L40.12,62.63 L40.17,62.17 L40.26,61.70 L40.41,61.23 L40.61,60.76 L40.86,60.30 L41.17,59.85 L41.53,59.43 L41.94,59.02 L42.41,58.66 L42.93,58.33 L43.49,58.04 L44.10,57.81 L44.75,57.63 L45.43,57.51 L46.14,57.46 L46.88,57.49 L47.63,57.59 L48.39,57.77 L49.15,58.03 L49.91,58.38 L50.65,58.81 L51.36,59.33 L52.04,59.94 L52.68,60.64 L53.25,61.42 L53.77,62.28 L54.21,63.21 L54.56,64.21 L54.82,65.28 L54.98,66.40 L55.02,67.56 L54.95,68.76 L54.75,69.98 L54.42,71.22 L53.96,72.45 L53.35,73.67 L52.61,74.85 L51.72,76.00 L50.69,77.07 L49.53,78.07 L48.23,78.98 L46.81,79.78 L45.26,80.45 L43.61,80.98 L41.86,81.35 L40.02,81.56 L38.12,81.57 L36.17,81.40 L34.18,81.02 L32.18,80.42 L30.19,79.60 L28.23,78.56 L26.33,77.29 L24.52,75.78 L22.80,74.06 L21.23,72.11 L19.81,69.95 L18.58,67.58 L17.55,65.03 L16.77,62.31 L16.24,59.44 L16.00,56.43 L16.06,53.33 L16.44,50.15 L17.16,46.92 L18.23,43.69 L19.66,40.48 L21.45,37.34 L23.62,34.30 L26.16,31.40 L29.06,28.69 L32.31,26.21 L35.91,24.00 L39.82,22.10 L44.03,20.55 L48.51,19.40 L53.23,18.68 L58.14,18.43 L63.21,18.67 L68.38,19.44 L73.61,20.77 L78.83,22.67 L84.00,25.15";

/* ------------------------------------------------------------
   SigGhost — the spiral watermark. Ink hairline, opacity owned
   by .zt-sig-ghost in new.css. `draw` triggers the once-on-mount
   unspool. Decorative → aria-hidden.
   ------------------------------------------------------------ */
function SigGhost({ size = 120, strokeWidth = 4, draw = false, withEye = true, className = '', style = {} }) {
  return (
    <svg
      className={'zt-sig-ghost' + (draw ? ' zt-sig-ghost--draw' : '') + (className ? ' ' + className : '')}
      width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={style} aria-hidden="true"
    >
      <path d={ZT_SPIRAL_D} pathLength="1" stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" />
      {withEye && <circle cx="44.49" cy="63.16" r={strokeWidth * 0.62} fill="currentColor" />}
    </svg>
  );
}

/* ------------------------------------------------------------
   Phyllotaxis geometry — golden-angle (137.507°) seed placement,
   r = c·√k. Used for the loading seed-head and as the ordering
   principle for the mount stagger.
   ------------------------------------------------------------ */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); /* ≈ 2.39996 rad */
function phyllotaxis(n, c = 6) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const r = c * Math.sqrt(k);
    const a = k * GOLDEN_ANGLE;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), k });
  }
  return pts;
}

/* φ low-discrepancy ordering: rank each index by (i·φ mod 1) so a
   grid settles in golden order rather than strict top-to-bottom.
   Returns an array where ranks[i] = appearance position of item i. */
const PHI = 0.6180339887498949;
function goldenRanks(n) {
  const idx = Array.from({ length: n }, (_, i) => i);
  const keyed = idx.map(i => ({ i, key: (i * PHI) % 1 }));
  keyed.sort((a, b) => a.key - b.key);
  const ranks = new Array(n);
  keyed.forEach((o, pos) => { ranks[o.i] = pos; });
  return ranks;
}
/* convenience: inline style carrying the stagger index */
function sigDelay(i) { return { '--sig-i': i }; }

/* ------------------------------------------------------------
   SigSeed — phyllotaxis loading head; dots breathe in golden
   order (animation owned by new.css). Reduced motion → static.
   ------------------------------------------------------------ */
function SigSeed({ count = 34, size = 76 }) {
  const pts = phyllotaxis(count, (size / 2) / Math.sqrt(count));
  const cx = size / 2, cy = size / 2;
  const ranks = goldenRanks(count);
  return (
    <svg className="zt-sig-seed" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {pts.map(p => (
        <circle key={p.k} cx={cx + p.x} cy={cy + p.y} r={1.1 + (p.k / count) * 2.1}
          style={sigDelay(ranks[p.k])} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------
   SigEmpty — branded calm empty state inside the frames idiom.
   Reuses the locked .zt-chart-empty (dot-grain + mono caption)
   and unspools a spiral ghost behind it.
   ------------------------------------------------------------ */
function SigEmpty({ height = 240, title = 'No readings yet', body = 'Your first frame starts with your next lab draw.' }) {
  return (
    <div className="zt-chart-empty zt-sig-empty" style={{ height }}>
      <div className="zt-sig-empty-mark">
        <SigGhost size={108} strokeWidth={3.4} draw withEye />
      </div>
      <div className="zt-sig-empty-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className="zt-eyebrow">{title}</div>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 320 }}>{body}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   SigLoading — phyllotaxis seed-head + mono caption.
   ------------------------------------------------------------ */
function SigLoading({ height = 240, caption = 'Loading frames…' }) {
  return (
    <div className="zt-sig-empty" style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <SigSeed count={34} size={84} />
      <span className="zt-eyebrow" style={{ color: 'var(--text-faint)' }}>{caption}</span>
    </div>
  );
}

/* ------------------------------------------------------------
   FrameDot — the ringed-ink frame-dot glyph (icon signature).
   ------------------------------------------------------------ */
function FrameDot({ style = {} }) {
  return <span className="zt-sig-dot" style={style} aria-hidden="true"></span>;
}

/* SigEyebrow — mono eyebrow led by the frame-dot glyph. */
function SigEyebrow({ children, style = {} }) {
  return (
    <span className="zt-eyebrow zt-sig-eyebrow" style={style}>
      <FrameDot /> {children}
    </span>
  );
}

/* ------------------------------------------------------------
   useSignature — wires the root .zt-sig-on (enables grain +
   motion under the honesty gate) and the three review toggles.
   Call once at the app root.
   ------------------------------------------------------------ */
function useSignature({ grain = true, motif = true, motion = true } = {}) {
  React.useEffect(() => {
    document.documentElement.classList.add('zt-sig-on');
  }, []);
  React.useEffect(() => {
    const r = document.documentElement.classList;
    r.toggle('zt-sig-grain-off', !grain);
    r.toggle('zt-sig-motif-off', !motif);
    r.toggle('zt-sig-motion-off', !motion);
  }, [grain, motif, motion]);
}

/* ---- exports ---------------------------------------------- */
Object.assign(window, {
  ZT_SPIRAL_D, SigGhost, phyllotaxis, goldenRanks, sigDelay,
  SigSeed, SigEmpty, SigLoading, FrameDot, SigEyebrow, useSignature,
});

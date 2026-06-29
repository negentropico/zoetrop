/* @ds-bundle: {"format":3,"namespace":"ZoetropDesignSystem_48aebc","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MetricRing","sourcePath":"components/data/MetricRing.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"Stat","sourcePath":"components/data/Stat.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"4a04aee0dab4","components/core/Badge.jsx":"398a32d9ac32","components/core/Button.jsx":"afb64fc5ecdc","components/core/Card.jsx":"0e4f45382795","components/core/IconButton.jsx":"2502b61f3e7d","components/data/MetricRing.jsx":"e13a18a5da1c","components/data/ProgressBar.jsx":"1b79101c5428","components/data/Stat.jsx":"d488d43dd655","components/forms/Input.jsx":"e6583b047103","components/forms/SegmentedControl.jsx":"8d88f8523ae3","components/forms/Switch.jsx":"0915bbf4329c","ui_kits/app/ActivityScreen.jsx":"a9119b4e142b","ui_kits/app/App.jsx":"33c0d6a61d11","ui_kits/app/SleepScreen.jsx":"0ee3d6daef06","ui_kits/app/TodayScreen.jsx":"7c460b66913b","ui_kits/app/TrendsScreen.jsx":"34c0f5ba51a5","ui_kits/app/parts.jsx":"e7e55ee8cb5f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ZoetropDesignSystem_48aebc = window.ZoetropDesignSystem_48aebc || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Avatar — initials or image, with optional metric ring + status dot.
 */
function Avatar({
  src = null,
  name = '',
  size = 40,
  ring = null,
  status = null,
  style = {},
  ...rest
}) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const rings = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)'
  };
  const statusColors = {
    online: 'var(--vital)',
    away: 'var(--energy)',
    off: 'var(--n-400)'
  };
  const pad = ring ? 3 : 0;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      background: ring ? rings[ring] : 'transparent',
      padding: pad,
      boxSizing: 'content-box'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: src ? 'var(--surface-sunken)' : 'var(--ink)',
      color: 'var(--n-50)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-medium)',
      fontSize: size * 0.38,
      border: ring ? '2px solid var(--surface)' : 'none'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials)), status && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: size * 0.28,
      height: size * 0.28,
      minWidth: 9,
      minHeight: 9,
      borderRadius: '50%',
      background: statusColors[status],
      border: '2px solid var(--surface)'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Badge — small status/metric pill. `tone` maps to a metric family.
 */
function Badge({
  tone = 'neutral',
  variant = 'soft',
  children,
  style = {},
  ...rest
}) {
  const tones = {
    energy: {
      c: 'var(--energy-600)',
      bg: 'var(--energy-50)',
      solid: 'var(--energy)',
      solidText: 'var(--ink)'
    },
    vital: {
      c: 'var(--vital-500)',
      bg: 'var(--vital-50)',
      solid: 'var(--vital)',
      solidText: '#fff'
    },
    focus: {
      c: 'var(--focus-500)',
      bg: 'var(--focus-50)',
      solid: 'var(--focus)',
      solidText: '#fff'
    },
    neutral: {
      c: 'var(--text-secondary)',
      bg: 'var(--surface-sunken)',
      solid: 'var(--ink)',
      solidText: 'var(--n-50)'
    },
    success: {
      c: 'var(--vital-500)',
      bg: 'var(--vital-50)',
      solid: 'var(--success)',
      solidText: '#fff'
    },
    danger: {
      c: 'var(--danger)',
      bg: 'var(--danger-bg)',
      solid: 'var(--danger)',
      solidText: '#fff'
    }
  };
  const t = tones[tone] || tones.neutral;
  const styles = variant === 'solid' ? {
    background: t.solid,
    color: t.solidText
  } : variant === 'outline' ? {
    background: 'transparent',
    color: t.c,
    boxShadow: `inset 0 0 0 1.5px ${t.c}`
  } : {
    background: t.bg,
    color: t.c
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--fw-regular)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '4px 9px',
      borderRadius: 'var(--radius-pill)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...styles,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Button — the primary action primitive.
 * Self-contained: styling via CSS custom properties from styles.css.
 */
function Button({
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
    sm: {
      padding: '0 14px',
      height: 34,
      fontSize: 'var(--text-sm)',
      gap: 7
    },
    md: {
      padding: '0 20px',
      height: 44,
      fontSize: 'var(--text-base)',
      gap: 8
    },
    lg: {
      padding: '0 28px',
      height: 54,
      fontSize: 'var(--text-md)',
      gap: 10
    }
  };
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--accent-on)',
      border: '1.5px solid transparent'
    },
    secondary: {
      background: 'var(--surface)',
      color: 'var(--text)',
      border: '1.5px solid var(--border-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1.5px solid transparent'
    },
    ink: {
      background: 'var(--ink)',
      color: 'var(--text-on-ink)',
      border: '1.5px solid transparent'
    },
    danger: {
      background: 'var(--danger)',
      color: '#fff',
      border: '1.5px solid transparent'
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const hoverFx = !disabled && hover ? variant === 'primary' ? {
    background: 'var(--accent-hover)'
  } : variant === 'ink' ? {
    background: 'var(--n-800)'
  } : variant === 'danger' ? {
    filter: 'brightness(0.94)'
  } : {
    background: 'var(--surface-sunken)'
  } : {};
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'var(--font-text)',
      fontSize: s.fontSize,
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: '0.005em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out)',
      transform: !disabled && press ? 'scale(0.97)' : 'scale(1)',
      opacity: disabled ? 0.45 : 1,
      ...v,
      ...hoverFx,
      ...style
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, iconLeft), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Card — the base surface "frame". Soft warm shadow, gentle radius.
 * `accent` paints a metric-colored top hairline; `tone` tints the whole surface.
 */
function Card({
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
    flat: 'none',
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)'
  };
  const pads = {
    none: 0,
    sm: 'var(--gap-md)',
    md: 'var(--gap-lg)',
    lg: 'var(--gap-xl)'
  };
  const accents = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)',
    ink: 'var(--ink)'
  };
  const tones = {
    energy: 'var(--energy-50)',
    vital: 'var(--vital-50)',
    focus: 'var(--focus-50)',
    mist: 'var(--surface-sunken)'
  };
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
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
      ...style
    }
  }, rest), accent && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: accents[accent] || accent
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop IconButton — square/circular control wrapping a single icon.
 * Pass the icon as children (e.g. a Lucide <i> or SVG).
 */
function IconButton({
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
  const dims = {
    sm: 32,
    md: 40,
    lg: 48
  }[size] || 40;
  const variants = {
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1.5px solid transparent'
    },
    soft: {
      background: 'var(--surface-sunken)',
      color: 'var(--text)',
      border: '1.5px solid transparent'
    },
    outline: {
      background: 'var(--surface)',
      color: 'var(--text)',
      border: '1.5px solid var(--border-strong)'
    },
    ink: {
      background: 'var(--ink)',
      color: 'var(--text-on-ink)',
      border: '1.5px solid transparent'
    }
  };
  const v = variants[variant] || variants.ghost;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const hoverFx = !disabled && hover ? variant === 'ink' ? {
    background: 'var(--n-800)'
  } : variant === 'ghost' ? {
    background: 'var(--surface-sunken)',
    color: 'var(--text)'
  } : {
    background: 'var(--n-100)'
  } : {};
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dims,
      height: dims,
      padding: 0,
      borderRadius: round ? 'var(--radius-pill)' : 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
      transform: !disabled && press ? 'scale(0.92)' : 'scale(1)',
      ...v,
      ...hoverFx,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/MetricRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop MetricRing — the signature progress ring. Sweeps on mount.
 * `tone` maps to a metric family; supports a center label/value.
 */
function MetricRing({
  value = 0,
  // 0..1 (or 0..100 if max provided)
  max = 1,
  tone = 'focus',
  size = 120,
  thickness = 12,
  trackColor = 'var(--surface-sunken)',
  label = null,
  sublabel = null,
  children = null,
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, max ? value / max : value));
  const tones = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)'
  };
  const stroke = tones[tone] || tones.focus;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const [draw, setDraw] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      width: size,
      height: size,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: trackColor,
    strokeWidth: thickness
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: stroke,
    strokeWidth: thickness,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - draw),
    style: {
      transition: 'stroke-dashoffset var(--dur-ring) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1
    }
  }, children ? children : /*#__PURE__*/React.createElement(React.Fragment, null, label != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-medium)',
      fontVariantNumeric: 'tabular-nums',
      fontSize: size * 0.26,
      lineHeight: 1,
      color: 'var(--text)'
    }
  }, label), sublabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: Math.max(9, size * 0.085),
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--text-muted)'
    }
  }, sublabel))));
}
Object.assign(__ds_scope, { MetricRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MetricRing.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop ProgressBar — linear track. Sweeps on mount; tone maps to metric family.
 */
function ProgressBar({
  value = 0,
  max = 1,
  tone = 'focus',
  height = 8,
  showValue = false,
  label = null,
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, max ? value / max : value));
  const tones = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)'
  };
  const fill = tones[tone] || tones.focus;
  const [draw, setDraw] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, rest), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)'
    }
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, Math.round(pct * 100), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunken)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${draw * 100}%`,
      background: fill,
      borderRadius: 'var(--radius-pill)',
      transition: 'width var(--dur-ring) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Stat — a metric readout: eyebrow label, big value+unit, optional trend.
 */
function Stat({
  label,
  value,
  unit = null,
  tone = 'neutral',
  trend = null,
  // { dir: 'up'|'down', value: '12%' }
  align = 'left',
  size = 'md',
  style = {},
  ...rest
}) {
  const tones = {
    energy: 'var(--energy-600)',
    vital: 'var(--vital-500)',
    focus: 'var(--focus-500)',
    neutral: 'var(--text)'
  };
  const valColor = tones[tone] || tones.neutral;
  const valSize = {
    sm: 24,
    md: 34,
    lg: 48
  }[size] || 34;
  const trendUp = trend && trend.dir === 'up';
  const trendColor = trend ? trend.dir === 'up' ? 'var(--vital-500)' : 'var(--danger)' : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: align === 'center' ? 'center' : 'flex-start',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-medium)',
      fontVariantNumeric: 'tabular-nums',
      fontSize: valSize,
      lineHeight: 1,
      letterSpacing: '-0.01em',
      color: valColor
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, unit)), trend && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: trendColor
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.1em',
      lineHeight: 1
    }
  }, trendUp ? '\u2191' : '\u2193'), trend.value));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Stat.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Input — text field with optional label, leading icon, and hint/error.
 */
function Input({
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
  const h = {
    sm: 38,
    md: 46,
    lg: 54
  }[size] || 46;
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      height: h,
      padding: '0 14px',
      background: disabled ? 'var(--surface-sunken)' : 'var(--surface)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? 'var(--shadow-ring)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)'
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--text-muted)'
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--text-base)',
      color: 'var(--text)'
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--text-xs)',
      color: error ? 'var(--danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop SegmentedControl — compact tab switch for ranges/views (Day/Week/Month).
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  style = {},
  ...rest
}) {
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  const h = size === 'sm' ? 32 : 40;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'inline-flex',
      padding: 3,
      gap: 2,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-pill)',
      height: h,
      ...style
    }
  }, rest), opts.map(o => {
    const active = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(o.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 16px',
        height: h - 6,
        border: 'none',
        cursor: 'pointer',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-text)',
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 'var(--fw-semibold)',
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)'
      }
    }, o.label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zoetrop Switch — on/off toggle. On-color maps to a metric family.
 */
function Switch({
  checked = false,
  onChange,
  tone = 'focus',
  size = 'md',
  disabled = false,
  label = null,
  style = {},
  ...rest
}) {
  const dims = size === 'sm' ? {
    w: 38,
    h: 22,
    k: 16
  } : {
    w: 48,
    h: 28,
    k: 22
  };
  const tones = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--accent)'
  };
  const onColor = tones[tone] || tones.focus;
  const toggle = () => !disabled && onChange && onChange(!checked);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    onClick: toggle,
    disabled: disabled,
    style: {
      position: 'relative',
      width: dims.w,
      height: dims.h,
      flex: 'none',
      padding: 0,
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: checked ? onColor : 'var(--n-300)',
      transition: 'background var(--dur-base) var(--ease-out)'
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: (dims.h - dims.k) / 2,
      left: checked ? dims.w - dims.k - (dims.h - dims.k) / 2 : (dims.h - dims.k) / 2,
      width: dims.k,
      height: dims.k,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur-base) var(--ease-out)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ActivityScreen.jsx
try { (() => {
/* Move — activity detail: hero ring, weekly bars, breakdown stats. */

function ActivityScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const {
    MetricRing,
    Card,
    Stat,
    SegmentedControl,
    Badge
  } = NS;
  const {
    ZBarChart
  } = window.ZApp;
  const [range, setRange] = React.useState('Week');
  const week = [{
    label: 'M',
    value: 7200
  }, {
    label: 'T',
    value: 9100
  }, {
    label: 'W',
    value: 5400
  }, {
    label: 'T',
    value: 8300
  }, {
    label: 'F',
    value: 6800
  }, {
    label: 'S',
    value: 11200
  }, {
    label: 'S',
    value: 6418
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(MetricRing, {
    value: 6418,
    max: 8000,
    tone: "energy",
    size: 168,
    thickness: 16
  }, /*#__PURE__*/React.createElement("span", {
    className: "zt-readout",
    style: {
      fontSize: 44
    }
  }, "6,418"), /*#__PURE__*/React.createElement("span", {
    className: "zt-eyebrow",
    style: {
      marginTop: 4
    }
  }, "of 8,000 steps"))), /*#__PURE__*/React.createElement(Card, {
    elevation: "sm",
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18
    }
  }, "This week"), /*#__PURE__*/React.createElement(SegmentedControl, {
    size: "sm",
    options: ['Week', 'Month', 'Year'],
    value: range,
    onChange: setRange
  })), /*#__PURE__*/React.createElement(ZBarChart, {
    data: week,
    tone: "energy",
    goal: 8000,
    height: 130
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Daily avg",
    value: "7,772",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Best \xB7 Sat",
    value: "11,200",
    size: "sm",
    tone: "energy"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Streak",
    value: "6",
    unit: "days",
    size: "sm"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    accent: "energy",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Active min",
    value: "42",
    unit: "min",
    tone: "energy"
  })), /*#__PURE__*/React.createElement(Card, {
    accent: "energy",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Distance",
    value: "4.6",
    unit: "km",
    tone: "energy"
  })), /*#__PURE__*/React.createElement(Card, {
    accent: "energy",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Calories",
    value: "2,140",
    unit: "kcal",
    tone: "energy"
  })), /*#__PURE__*/React.createElement(Card, {
    accent: "energy",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Flights",
    value: "12",
    tone: "energy"
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "mist",
    elevation: "flat",
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "energy",
    variant: "solid"
  }, "Frame"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, "You move most on weekends \u2014 Saturday is your peak."))));
}
window.ZApp = Object.assign(window.ZApp || {}, {
  ActivityScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ActivityScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/App.jsx
try { (() => {
/* App root — tab navigation, header, floating add button + entry sheet. */

function ZApp_Root() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const {
    Button,
    IconButton
  } = NS;
  const {
    ZHeader,
    ZTabBar,
    TodayScreen,
    ActivityScreen,
    SleepScreen,
    TrendsScreen
  } = window.ZApp;
  const [tab, setTab] = React.useState('today');
  const [sheet, setSheet] = React.useState(false);
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  const meta = {
    today: {
      eyebrow: 'Thursday · June 4',
      title: 'Today'
    },
    activity: {
      eyebrow: 'Move',
      title: 'Activity'
    },
    sleep: {
      eyebrow: 'Focus',
      title: 'Sleep'
    },
    trends: {
      eyebrow: 'In motion',
      title: 'Trends'
    }
  }[tab];
  const Screen = {
    today: TodayScreen,
    activity: ActivityScreen,
    sleep: SleepScreen,
    trends: TrendsScreen
  }[tab];
  const entries = [{
    icon: 'footprints',
    label: 'Workout',
    tone: 'energy'
  }, {
    icon: 'heart-pulse',
    label: 'Heart check',
    tone: 'vital'
  }, {
    icon: 'moon',
    label: 'Sleep',
    tone: 'focus'
  }, {
    icon: 'wind',
    label: 'Breathe',
    tone: 'vital'
  }, {
    icon: 'scale',
    label: 'Weight',
    tone: 'energy'
  }, {
    icon: 'notebook-pen',
    label: 'Note',
    tone: 'focus'
  }];
  const toneColor = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      paddingTop: 'calc(env(safe-area-inset-top) + 8px)'
    }
  }, /*#__PURE__*/React.createElement(ZHeader, {
    eyebrow: meta.eyebrow,
    title: meta.title
  }), /*#__PURE__*/React.createElement(Screen, null), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSheet(true),
    "aria-label": "Add entry",
    style: {
      position: 'absolute',
      right: 18,
      bottom: 86,
      width: 56,
      height: 56,
      borderRadius: '50%',
      border: 'none',
      background: 'var(--ink)',
      color: '#fff',
      cursor: 'pointer',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus",
    style: {
      width: 26,
      height: 26
    }
  })), /*#__PURE__*/React.createElement(ZTabBar, {
    active: tab,
    onChange: t => {
      setTab(t);
      setSheet(false);
    }
  }), sheet && /*#__PURE__*/React.createElement("div", {
    onClick: () => setSheet(false),
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(39,35,36,0.38)',
      zIndex: 10,
      display: 'flex',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      background: 'var(--surface)',
      borderRadius: '28px 28px 0 0',
      padding: '14px 20px calc(20px + env(safe-area-inset-bottom))',
      boxShadow: 'var(--shadow-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 99,
      background: 'var(--n-200)',
      margin: '2px auto 16px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 20
    }
  }, "Log a frame"), /*#__PURE__*/React.createElement(IconButton, {
    label: "Close",
    variant: "soft",
    onClick: () => setSheet(false)
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    style: {
      width: 18,
      height: 18
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12,
      marginBottom: 18
    }
  }, entries.map(e => /*#__PURE__*/React.createElement("button", {
    key: e.label,
    onClick: () => setSheet(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 9,
      padding: '18px 8px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: 'var(--surface-sunken)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": e.icon,
    style: {
      width: 22,
      height: 22,
      color: toneColor[e.tone]
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, e.label)))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: () => setSheet(false)
  }, "Done"))));
}
window.ZApp = Object.assign(window.ZApp || {}, {
  ZApp_Root
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SleepScreen.jsx
try { (() => {
/* Sleep — last night's stages, duration, and weekly rhythm. */

function SleepScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const {
    Card,
    Stat,
    Badge,
    ProgressBar
  } = NS;
  const {
    ZBarChart
  } = window.ZApp;

  // Sleep stage hypnogram segments (rem/deep/light/awake) as a stacked timeline
  const stages = [{
    k: 'Light',
    c: 'var(--focus-200)',
    pct: 46
  }, {
    k: 'Deep',
    c: 'var(--focus)',
    pct: 23
  }, {
    k: 'REM',
    c: 'var(--focus-400)',
    pct: 26
  }, {
    k: 'Awake',
    c: 'var(--n-200)',
    pct: 5
  }];
  const week = [{
    label: 'M',
    value: 6.5
  }, {
    label: 'T',
    value: 7.1
  }, {
    label: 'W',
    value: 5.9
  }, {
    label: 'T',
    value: 7.8
  }, {
    label: 'F',
    value: 6.7
  }, {
    label: 'S',
    value: 8.2
  }, {
    label: 'S',
    value: 7.7
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    accent: "focus",
    elevation: "sm",
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zt-eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Last night \xB7 23:18 \u2192 07:00"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "zt-readout",
    style: {
      fontSize: 52,
      color: 'var(--focus-500)'
    }
  }, "7:42"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 15
    }
  }, "asleep"), /*#__PURE__*/React.createElement(Badge, {
    tone: "focus",
    style: {
      marginLeft: 'auto'
    }
  }, "91% of goal")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: 16,
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden',
      marginTop: 18,
      gap: 2
    }
  }, stages.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.k,
    style: {
      width: `${s.pct}%`,
      background: s.c
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 12,
      flexWrap: 'wrap'
    }
  }, stages.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 3,
      background: s.c
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-secondary)'
    }
  }, s.k, " ", s.pct, "%"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Card, {
    accent: "focus",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Deep",
    value: "1:48",
    size: "sm",
    tone: "focus"
  })), /*#__PURE__*/React.createElement(Card, {
    accent: "focus",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Resting HR",
    value: "54",
    unit: "bpm",
    size: "sm",
    tone: "focus"
  })), /*#__PURE__*/React.createElement(Card, {
    accent: "focus",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Restfulness",
    value: "88",
    size: "sm",
    tone: "focus"
  }))), /*#__PURE__*/React.createElement(Card, {
    elevation: "sm",
    padding: "lg"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18,
      marginBottom: 16
    }
  }, "Sleep this week"), /*#__PURE__*/React.createElement(ZBarChart, {
    data: week,
    tone: "focus",
    goal: 8,
    height: 120
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Avg duration",
    value: "7.1",
    unit: "hrs",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Consistency",
    value: "Good",
    size: "sm",
    tone: "focus"
  }))));
}
window.ZApp = Object.assign(window.ZApp || {}, {
  SleepScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SleepScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TodayScreen.jsx
try { (() => {
/* Today — the home dashboard: three metric rings + summary cards. */

function TodayScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const {
    MetricRing,
    Card,
    Stat,
    Badge,
    ProgressBar
  } = NS;
  const {
    ZSparkline
  } = window.ZApp;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "sm",
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zt-eyebrow",
    style: {
      marginBottom: 14
    }
  }, "Today \xB7 in motion"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(MetricRing, {
    value: 6418,
    max: 8000,
    tone: "energy",
    size: 104,
    thickness: 11,
    label: "80%",
    sublabel: "Move"
  }), /*#__PURE__*/React.createElement(MetricRing, {
    value: 42,
    max: 60,
    tone: "vital",
    size: 104,
    thickness: 11,
    label: "42",
    sublabel: "Recover"
  }), /*#__PURE__*/React.createElement(MetricRing, {
    value: 0.91,
    tone: "focus",
    size: 104,
    thickness: 11,
    label: "91%",
    sublabel: "Sleep"
  }))), /*#__PURE__*/React.createElement(Card, {
    accent: "energy",
    elevation: "sm",
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Steps",
    value: "6,418",
    tone: "energy",
    trend: {
      dir: 'up',
      value: '12%'
    }
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "energy"
  }, "1,582 to goal")), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 6418,
    max: 8000,
    tone: "energy"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    accent: "vital",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Resting HR",
    value: "58",
    unit: "bpm",
    tone: "vital",
    trend: {
      dir: 'down',
      value: '3'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      marginInline: -4
    }
  }, /*#__PURE__*/React.createElement(ZSparkline, {
    points: [64, 62, 63, 60, 61, 59, 58],
    tone: "vital",
    height: 44
  }))), /*#__PURE__*/React.createElement(Card, {
    accent: "focus",
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Last night",
    value: "7:42",
    unit: "hrs",
    tone: "focus"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "focus",
    variant: "soft"
  }, "Deep 1:48")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 8
    }
  }, "Best sleep this week."))), /*#__PURE__*/React.createElement(Card, {
    tone: "mist",
    elevation: "flat",
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: 'var(--ink)',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "wind",
    style: {
      width: 20,
      height: 20,
      color: 'var(--energy)'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "You usually wind down around now."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "Try 4 minutes of breathing. Lights low?")))));
}
window.ZApp = Object.assign(window.ZApp || {}, {
  TodayScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TodayScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TrendsScreen.jsx
try { (() => {
/* Trends — the "moving picture": longer-range view across all three families. */

function TrendsScreen() {
  const NS = window.ZoetropDesignSystem_48aebc;
  const {
    Card,
    Stat,
    SegmentedControl,
    Badge
  } = NS;
  const {
    ZSparkline
  } = window.ZApp;
  const [range, setRange] = React.useState('30d');
  const rows = [{
    tone: 'energy',
    label: 'Avg steps',
    value: '7,772',
    unit: '/day',
    trend: {
      dir: 'up',
      value: '8%'
    },
    pts: [6.8, 7.1, 6.9, 7.4, 7.2, 7.6, 7.8]
  }, {
    tone: 'vital',
    label: 'Resting HR',
    value: '57',
    unit: 'bpm',
    trend: {
      dir: 'down',
      value: '4%'
    },
    pts: [61, 60, 60, 59, 58, 58, 57]
  }, {
    tone: 'focus',
    label: 'Sleep',
    value: '7.1',
    unit: 'hrs',
    trend: {
      dir: 'up',
      value: '6%'
    },
    pts: [6.5, 6.7, 6.6, 6.9, 7.0, 7.0, 7.1]
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['7d', '30d', '90d', '1y'],
    value: range,
    onChange: setRange
  })), /*#__PURE__*/React.createElement(Card, {
    tone: "focus",
    elevation: "sm",
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zt-eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Wellness score \xB7 trending up"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "zt-readout",
    style: {
      fontSize: 56,
      color: 'var(--focus-600)'
    }
  }, "82"), /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, "\u2191 7 pts this month")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      marginInline: -6
    }
  }, /*#__PURE__*/React.createElement(ZSparkline, {
    points: [71, 73, 72, 75, 74, 78, 77, 80, 79, 82],
    tone: "focus",
    height: 64
  }))), rows.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r.label,
    accent: r.tone,
    elevation: "sm",
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: r.label,
    value: r.value,
    unit: r.unit,
    tone: r.tone,
    trend: r.trend,
    size: "md"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(ZSparkline, {
    points: r.pts,
    tone: r.tone,
    height: 48,
    fill: false
  }))))), /*#__PURE__*/React.createElement(Card, {
    tone: "mist",
    elevation: "flat",
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "Your last 30 days, in motion."), " More sleep is pulling your resting heart rate down. Keep the wind-down routine going.")));
}
window.ZApp = Object.assign(window.ZApp || {}, {
  TrendsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TrendsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/parts.jsx
try { (() => {
/* Zoetrop app — shared parts: Header, TabBar, BarChart, Sparkline, AddSheet.
   Primitives are read from the DS namespace INSIDE component bodies so this
   file is safe whether loaded directly or via the compiled bundle. */

function ZHeader({
  title,
  eyebrow,
  right = null
}) {
  const NS = window.ZoetropDesignSystem_48aebc;
  const {
    Avatar
  } = NS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 20px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "zt-eyebrow",
    style: {
      marginBottom: 3
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 28,
      letterSpacing: '-0.02em',
      margin: 0
    }
  }, title)), right !== null ? right : /*#__PURE__*/React.createElement(Avatar, {
    name: "Maya Okafor",
    ring: "vital",
    size: 40
  }));
}
function ZTabBar({
  active,
  onChange
}) {
  const tabs = [{
    id: 'today',
    icon: 'sun',
    label: 'Today'
  }, {
    id: 'activity',
    icon: 'activity',
    label: 'Move'
  }, {
    id: 'sleep',
    icon: 'moon',
    label: 'Sleep'
  }, {
    id: 'trends',
    icon: 'chart-no-axes-column',
    label: 'Trends'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      alignItems: 'center',
      padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(18px)',
      borderTop: '1px solid var(--border)'
    }
  }, tabs.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onChange(t.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '6px 0',
        color: on ? 'var(--focus)' : 'var(--text-faint)',
        transition: 'color var(--dur-fast) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": t.icon,
      style: {
        width: 22,
        height: 22
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
      }
    }, t.label));
  }));
}

/* Simple vertical bar chart (7 days). data: [{label, value}], max optional */
function ZBarChart({
  data,
  max,
  tone = 'energy',
  height = 120,
  goal = null
}) {
  const colors = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)'
  };
  const mx = max || Math.max(...data.map(d => d.value), 1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      height,
      position: 'relative'
    }
  }, goal != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: `${goal / mx * 100}%`,
      borderTop: '1.5px dashed var(--n-300)'
    }
  }), data.map((d, i) => {
    const h = Math.max(3, d.value / mx * 100);
    const today = i === data.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        height: '100%',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        height: `${h}%`,
        borderRadius: 'var(--radius-sm)',
        background: today ? colors[tone] : 'var(--n-150)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: today ? 'var(--text)' : 'var(--text-faint)'
      }
    }, d.label));
  }));
}

/* Smooth sparkline */
function ZSparkline({
  points,
  tone = 'vital',
  width = 300,
  height = 56,
  fill = true
}) {
  const colors = {
    energy: 'var(--energy)',
    vital: 'var(--vital)',
    focus: 'var(--focus)'
  };
  const min = Math.min(...points),
    max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const pts = points.map((p, i) => [i * step, height - 6 - (p - min) / range * (height - 12)]);
  const d = pts.map((p, i) => i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const id = 'spark' + tone;
  return /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: height,
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: id,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: colors[tone],
    stopOpacity: "0.22"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: colors[tone],
    stopOpacity: "0"
  }))), fill && /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: `url(#${id})`
  }), /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: "none",
    stroke: colors[tone],
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: pts[pts.length - 1][0],
    cy: pts[pts.length - 1][1],
    r: "3.5",
    fill: colors[tone]
  }));
}
window.ZApp = Object.assign(window.ZApp || {}, {
  ZHeader,
  ZTabBar,
  ZBarChart,
  ZSparkline
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/parts.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.MetricRing = __ds_scope.MetricRing;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

})();

// MetricRing — signature animated tone ring
// Sweeps on mount over 900ms (--dur-ring), tone maps to metric family
// SVG stroke uses CSS var string — dark remap works via cascade (NOT Tailwind class)

import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

export interface MetricRingProps {
  value?: number;
  max?: number;
  tone?: "energy" | "vital" | "focus";
  size?: number;
  thickness?: number;
  trackColor?: string;
  label?: ReactNode;
  sublabel?: string | null;
  children?: ReactNode;
  style?: CSSProperties;
}

const TONE_COLOR: Record<string, string> = {
  energy: "var(--energy)",
  vital:  "var(--vital)",
  focus:  "var(--focus)",
};

export function MetricRing({
  value = 0,
  max = 1,
  tone = "focus",
  size = 120,
  thickness = 12,
  trackColor = "var(--surface-sunken)",
  label = null,
  sublabel = null,
  children = null,
  style = {},
}: MetricRingProps) {
  const pct = Math.max(0, Math.min(1, max ? value / max : value));
  const stroke = TONE_COLOR[tone] ?? TONE_COLOR.focus;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const [draw, setDraw] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div style={{ position: "relative", width: size, height: size, ...style }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - draw)}
          style={{ transition: "stroke-dashoffset var(--dur-ring) var(--ease-out)" }}
        />
      </svg>
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        {children ?? (
          <>
            {label != null && (
              <span
                className="zt-readout"
                style={{ fontSize: size * 0.26, color: "var(--text)" }}
              >
                {label}
              </span>
            )}
            {sublabel && (
              <span
                className="zt-eyebrow"
                style={{ fontSize: Math.max(9, size * 0.085) }}
              >
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

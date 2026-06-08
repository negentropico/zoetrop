// Stat — metric readout: mono eyebrow + large display value + unit + optional trend chip
// Value uses .zt-readout (Space Grotesk, tabular-nums, tight leading)
// Tone maps to metric family for value color.

import type { CSSProperties, ReactNode } from "react";

export interface StatTrend {
  dir: "up" | "down";
  value: string;
}

export interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string | null;
  /** Colors the value. @default "neutral" */
  tone?: "energy" | "vital" | "focus" | "neutral";
  /** Trend chip, e.g. { dir: 'up', value: '12%' }. */
  trend?: StatTrend | null;
  /** @default "left" */
  align?: "left" | "center";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
}

const TONE_COLOR: Record<string, string> = {
  energy:  "var(--energy-600)",
  vital:   "var(--vital-500,var(--vital))",
  focus:   "var(--focus-500,var(--focus))",
  neutral: "var(--text)",
};

const VAL_SIZE: Record<string, number> = { sm: 24, md: 34, lg: 48 };

export function Stat({
  label,
  value,
  unit = null,
  tone = "neutral",
  trend = null,
  align = "left",
  size = "md",
  style,
}: StatProps) {
  const valColor = TONE_COLOR[tone] ?? TONE_COLOR.neutral;
  const valPx = VAL_SIZE[size] ?? 34;
  const trendColor =
    trend
      ? trend.dir === "up"
        ? "var(--vital-400,var(--vital))"
        : "var(--danger)"
      : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: align === "center" ? "center" : "flex-start",
        ...style,
      }}
    >
      {/* Eyebrow label — Space Mono, ALL-CAPS, muted */}
      <span className="zt-eyebrow">{label}</span>

      {/* Value + unit row */}
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="zt-readout"
          style={{
            fontSize: valPx,
            color: valColor,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            {unit}
          </span>
        )}
      </span>

      {/* Trend chip */}
      {trend && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: trendColor,
          }}
        >
          <span style={{ fontSize: "1.1em", lineHeight: 1 }}>
            {trend.dir === "up" ? "↑" : "↓"}
          </span>
          {trend.value}
        </span>
      )}
    </div>
  );
}

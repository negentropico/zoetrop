// ProgressBar — horizontal fill bar with tone (energy/vital/focus → var(--token) fill)
// Solid fill only (NOT gradient — UI-SPEC drift note: gradient variant rejected).
// Sweeps on mount via CSS transition matching MetricRing animation pattern.

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";

export interface ProgressBarProps {
  value?: number;
  /** @default 1 */
  max?: number;
  /** @default "focus" */
  tone?: "energy" | "vital" | "focus";
  /** Track height in px. @default 8 */
  height?: number;
  /** Show a % readout on the right. @default false */
  showValue?: boolean;
  label?: string | null;
  style?: CSSProperties;
}

const TONE_FILL: Record<string, string> = {
  energy: "var(--energy)",
  vital:  "var(--vital)",
  focus:  "var(--focus)",
};

export function ProgressBar({
  value = 0,
  max = 1,
  tone = "focus",
  height = 8,
  showValue = false,
  label = null,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, max ? value / max : value));
  const fill = TONE_FILL[tone] ?? TONE_FILL.focus;

  // Animate fill on mount (matches MetricRing sweep pattern)
  const [draw, setDraw] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {(label || showValue) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          {label && (
            <span
              style={{
                fontFamily: "var(--font-text)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              {Math.round(pct * 100)}%
            </span>
          )}
        </div>
      )}
      {/* Track */}
      <div
        style={{
          height,
          borderRadius: "var(--radius-pill)",
          background: "var(--surface-sunken)",
          overflow: "hidden",
        }}
      >
        {/* Solid fill — no gradient (UI-SPEC: solid only) */}
        <div
          style={{
            height: "100%",
            width: `${draw * 100}%`,
            background: fill,
            borderRadius: "var(--radius-pill)",
            transition: "width var(--dur-ring) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

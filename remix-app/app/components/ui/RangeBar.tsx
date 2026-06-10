// RangeBar — value-against-reference/optimal range visualization
// Three bands: reference (n-150 bg), optimal (vital-100 soft teal), value tick (Ink)
// Colors via CSS var strings only

import type { Status } from "./StatusBadge";

export interface MetricWithRange {
  min: number;
  max: number;
  ref: [number, number];  // [refMin, refMax]
  opt: [number, number];  // [optMin, optMax]
  value: number;
  status: Status;
  unit: string;
}

interface RangeBarProps {
  m: MetricWithRange;
  height?: number;          // default 8
  showEndpoints?: boolean;  // default false
}

const TICK_COLOR: Record<Status, string> = {
  optimal:    "var(--success)",
  borderline: "var(--warning)",
  deficient:  "var(--danger)",
  excess:     "var(--excess)",
};

export function RangeBar({ m, height = 8, showEndpoints = false }: RangeBarProps) {
  const frac = (x: number) => Math.max(0, Math.min(1, (x - m.min) / (m.max - m.min)));
  const refL = frac(m.ref[0]) * 100;
  const refR = frac(m.ref[1]) * 100;
  const optL = frac(m.opt[0]) * 100;
  const optR = frac(m.opt[1]) * 100;
  const vx = frac(m.value) * 100;

  return (
    <div className="w-full">
      <div
        style={{
          position: "relative",
          height,
          borderRadius: "var(--radius-pill)",
          background: "var(--n-100)",
          overflow: "visible",
        }}
      >
        {/* Reference band (warm mist) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${refL}%`,
            width: `${refR - refL}%`,
            background: "var(--n-150)",
            borderRadius: "var(--radius-pill)",
          }}
        />
        {/* Optimal band (soft teal) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${optL}%`,
            width: `${optR - optL}%`,
            background: "var(--vital-100)",
            borderRadius: "var(--radius-pill)",
          }}
        />
        {/* Value tick — Ink base with status-colored shadow overlay */}
        <div
          style={{
            position: "absolute",
            top: -3,
            bottom: -3,
            left: `calc(${vx}% - 1.5px)`,
            width: 3,
            borderRadius: 2,
            background: "var(--ink)",
            boxShadow: "0 0 0 2px var(--surface)",
          }}
        />
      </div>
      {showEndpoints && (
        <div
          className="flex justify-between mt-2 font-mono text-2xs"
          style={{ color: "var(--text-muted)" }}
        >
          {/* Label the reference-range bounds (the clinically meaningful numbers
              shown elsewhere on screen), not the padded axis extremes — m.min/m.max
              include 10–20% visual breathing room and match nothing else. */}
          <span>{m.ref[0]} {m.unit}</span>
          <span>{m.ref[1]} {m.unit}</span>
        </div>
      )}
    </div>
  );
}

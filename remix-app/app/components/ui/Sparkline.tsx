// Sparkline — inline SVG trend line (chart language, round 3 Part B — BAKED)
// Rule 2: data is Ink — the line itself never carries status color.
// Rule 3: the LAST reading may carry a status dot, mapped through the
// canonical status tokens via statusColor.

import type { MetricStatus } from "~/types/metrics";
import { statusColor } from "~/lib/status";

interface SparklineProps {
  data: number[]; // raw values, oldest first
  width?: number; // default 46
  height?: number; // default 16
  status?: MetricStatus; // colors ONLY the last-reading dot; ink when absent
}

export function Sparkline({ data, width = 46, height = 16, status }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (width - 4) + 2,
    height - 2 - ((v - min) / span) * (height - 4),
  ]);

  const d = pts
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");

  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r="2.2"
        fill={status ? statusColor(status) : "var(--ink)"}
      />
    </svg>
  );
}

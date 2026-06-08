// Sparkline — 46×16 inline SVG trend line for metric rows
// Default color: var(--ink) at opacity 0.7 (brand style — not status-colored)

interface SparklineProps {
  data: number[];       // raw values (not timestamps)
  width?: number;       // default 46
  height?: number;      // default 16
  color?: string;       // default "var(--ink)"
}

export function Sparkline({ data, width = 46, height = 16, color = "var(--ink)" }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (width - 2) + 1,
    height - 1 - ((v - min) / span) * (height - 2),
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
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} />
    </svg>
  );
}

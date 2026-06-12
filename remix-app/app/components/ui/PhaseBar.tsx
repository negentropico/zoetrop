// PhaseBar — segmented 4-phase timeline bar
// completed → var(--vital); current → var(--focus-50) + 2px var(--ink) border; upcoming → var(--n-150)
// Shared: dashboard cessation card, protocol overview, cessation tracker
// Round-3 hero rebuild: optional `day` renders a current-day marker tick
// inside the segment that contains it (Ink tick + surface ring, same idiom
// as the RangeBar value tick).

export interface Phase {
  id?: string;
  name: string;
  days: number;
  state: "completed" | "current" | "upcoming";
}

interface PhaseBarProps {
  phases: Phase[];
  height?: number;       // default 14
  showLabels?: boolean;  // default true
  compact?: boolean;     // default false
  /** Current protocol day (1-based) — draws the day marker. */
  day?: number;
}

export function PhaseBar({ phases, height = 14, showLabels = true, compact = false, day }: PhaseBarProps) {
  // Cumulative day offsets so the marker lands inside the right segment.
  let cum = 0;
  const ranges = phases.map((p) => {
    const start = cum + 1;
    cum += p.days;
    return { start, end: cum };
  });
  const totalDays = cum;

  return (
    <div>
      {/* Segment bar */}
      <div className="flex gap-1" style={{ height }}>
        {phases.map((p, i) => {
          const bg =
            p.state === "completed"
              ? "var(--vital)"
              : p.state === "current"
              ? "var(--focus-50)"
              : "var(--n-150)";
          const border =
            p.state === "current"
              ? "2px solid var(--ink)"
              : "2px solid transparent";
          const r = ranges[i];
          // Marker renders in the segment containing the day; a day past the
          // protocol end pins to the final segment edge.
          const hasMarker =
            day != null &&
            day >= r.start &&
            (day <= r.end || (i === phases.length - 1 && day > totalDays));
          const markerPct = hasMarker
            ? Math.min(1, (Math.min(day!, r.end) - r.start + 1) / p.days) * 100
            : 0;
          return (
            <div
              key={p.id ?? p.name}
              title={p.name}
              style={{ flex: `${p.days} 0 0`, position: "relative" }}
            >
              <div
                style={{
                  height: "100%",
                  background: bg,
                  border,
                  borderRadius: "var(--radius-xs)",
                  transition: "background var(--dur-base) var(--ease-out)",
                }}
              />
              {hasMarker && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -3,
                    bottom: -3,
                    left: `calc(${markerPct}% - 1.5px)`,
                    width: 3,
                    borderRadius: 2,
                    background: "var(--ink)",
                    boxShadow: "0 0 0 2px var(--surface)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Label row */}
      {showLabels && (
        <div className="flex gap-1 mt-[10px]">
          {phases.map((p) => (
            <div
              key={`${p.id ?? p.name}-l`}
              style={{ flex: `${p.days} 0 0`, minWidth: 0 }}
            >
              <div
                className="zt-eyebrow"
                style={{
                  color: p.state === "current" ? "var(--ink)" : "var(--text-muted)",
                  fontWeight: p.state === "current" ? 700 : 400,
                  // Wrap long single-word labels (e.g. "Optimization") on narrow
                  // segments instead of truncating to "OPTIMIZAT…".
                  overflowWrap: "anywhere",
                  lineHeight: 1.2,
                  fontSize: compact ? "0.625rem" : "var(--text-2xs)",
                }}
              >
                {p.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

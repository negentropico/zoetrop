// PhaseBar — segmented 4-phase timeline bar
// completed → var(--vital); current → var(--focus-50) + 2px var(--ink) border; upcoming → var(--n-150)
// Shared: dashboard cessation card, protocol overview, cessation tracker

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
}

export function PhaseBar({ phases, height = 14, showLabels = true, compact = false }: PhaseBarProps) {
  return (
    <div>
      {/* Segment bar */}
      <div className="flex gap-1" style={{ height }}>
        {phases.map((p) => {
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

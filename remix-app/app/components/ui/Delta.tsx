// Delta — mono micro-readout of the change since the previous reading.
// Round-3 screens.jsx `Delta` ported to the real Metric history idiom:
// arrow + signed delta + "since M{n-1}" (milestone counting, chart language
// rule 5 — milestones, not dates).

interface DeltaProps {
  /** Raw values, oldest first. Needs ≥2 points to render. */
  values: number[];
}

export function Delta({ values }: DeltaProps) {
  if (!values || values.length < 2) return null;
  const d = +(values[values.length - 1] - values[values.length - 2]).toFixed(2);
  const arrow = d > 0 ? "↑" : d < 0 ? "↓" : "→";
  return (
    <span
      className="zt-tnum"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        color: "var(--text-muted)",
        letterSpacing: "0.04em",
      }}
    >
      {arrow} {d > 0 ? "+" : ""}
      {d} since M{values.length - 1}
    </span>
  );
}

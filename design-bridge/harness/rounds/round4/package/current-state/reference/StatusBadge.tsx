// StatusBadge — 4-status pill with glyph + mono label
// Status system (Q2): optimal/borderline/deficient/excess
// Colors: CSS var strings only (dark remap works via cascade)

export type Status = "optimal" | "borderline" | "deficient" | "excess";

// Canonical status tokens (round 3, W0): every status atom reads
// --optimal/--borderline/--deficient/--excess (+ -bg) so a future
// remap is one edit. Values currently alias success/warning/danger.
const STATUS_CONFIG: Record<Status, { color: string; bg: string; glyph: string; label: string }> = {
  optimal:    { color: "var(--optimal)",    bg: "var(--optimal-bg)",    glyph: "✓", label: "OPTIMAL" },
  borderline: { color: "var(--borderline)", bg: "var(--borderline-bg)", glyph: "~", label: "BORDERLINE" },
  deficient:  { color: "var(--deficient)",  bg: "var(--deficient-bg)",  glyph: "↓", label: "DEFICIENT" },
  excess:     { color: "var(--excess)",     bg: "var(--excess-bg)",     glyph: "↑", label: "EXCESS" },
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.optimal;
  return (
    <span
      className="inline-flex items-center gap-[5px] font-mono text-2xs uppercase tracking-[0.06em] px-[10px] py-[4px] rounded-pill leading-none whitespace-nowrap"
      style={{ color: s.color, background: s.bg }}
    >
      <span aria-hidden="true" className="text-[1.05em]">{s.glyph}</span>
      {s.label}
    </span>
  );
}

// StatusBadge — 4-status pill with glyph + mono label
// Status system (Q2): optimal/borderline/deficient/excess
// Colors: CSS var strings only (dark remap works via cascade)

export type Status = "optimal" | "borderline" | "deficient" | "excess";

const STATUS_CONFIG: Record<Status, { color: string; bg: string; glyph: string; label: string }> = {
  optimal:    { color: "var(--success)",  bg: "var(--vital-50)",   glyph: "✓", label: "OPTIMAL" },
  borderline: { color: "var(--warning)",  bg: "var(--energy-50)",  glyph: "~", label: "BORDERLINE" },
  deficient:  { color: "var(--danger)",   bg: "var(--danger-bg)",  glyph: "↓", label: "DEFICIENT" },
  excess:     { color: "var(--excess)",   bg: "var(--excess-bg)",  glyph: "↑", label: "EXCESS" },
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

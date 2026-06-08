// CatChip — Category icon chip
// Neutral Ink chip by default; family tint (vital/energy) where it belongs (Q1)
// Active state: Ink bg + n-50 text (inverted)

import type { LucideIcon } from "lucide-react";

interface CatChipProps {
  icon: LucideIcon;
  family?: "vital" | "energy" | "focus" | null;
  active?: boolean;
  size?: number;
}

export function CatChip({ icon: Icon, family = null, active = false, size = 40 }: CatChipProps) {
  const bg = active
    ? "var(--ink)"
    : family
    ? `var(--${family}-50)`
    : "var(--surface-2)";

  const border = `1px solid ${active ? "var(--ink)" : "var(--border)"}`;

  const color = active
    ? "var(--n-50)"
    : family
    ? `var(--${family})`
    : "var(--ink)";

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        border,
        color,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} color="currentColor" />
    </span>
  );
}

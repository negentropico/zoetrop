// Badge — mono pill label for metric/status chips
// tone × variant matrix (soft/solid/outline) × 6 tones (energy/vital/focus/neutral/success/danger)
// Colors via CSS var strings only (dark remap works via cascade).

import type { CSSProperties, ReactNode } from "react";

export interface BadgeProps {
  /** Metric/status color family. @default "neutral" */
  tone?: "energy" | "vital" | "focus" | "neutral" | "success" | "danger";
  /** Fill style. @default "soft" */
  variant?: "soft" | "solid" | "outline";
  children?: ReactNode;
  style?: CSSProperties;
}

type ToneConfig = {
  color: string;
  bg: string;
  solid: string;
  solidText: string;
};

const TONES: Record<string, ToneConfig> = {
  energy:  { color: "var(--energy-600)",     bg: "var(--energy-50)",      solid: "var(--energy)",  solidText: "var(--ink)" },
  vital:   { color: "var(--vital-500)",      bg: "var(--vital-50)",       solid: "var(--vital)",   solidText: "var(--n-0)" },
  focus:   { color: "var(--focus-500)",      bg: "var(--focus-50)",       solid: "var(--focus)",   solidText: "var(--n-0)" },
  neutral: { color: "var(--text-secondary)", bg: "var(--surface-sunken)", solid: "var(--ink)",     solidText: "var(--n-50)" },
  success: { color: "var(--success)",        bg: "var(--vital-50)",       solid: "var(--success)", solidText: "var(--n-0)" },
  danger:  { color: "var(--danger)",         bg: "var(--danger-bg)",      solid: "var(--danger)",  solidText: "var(--n-0)" },
};

export function Badge({ tone = "neutral", variant = "soft", children, style }: BadgeProps) {
  const t = TONES[tone] ?? TONES.neutral;

  const variantStyle: CSSProperties =
    variant === "solid"
      ? { background: t.solid, color: t.solidText }
      : variant === "outline"
      ? { background: "transparent", color: t.color, boxShadow: `inset 0 0 0 1.5px ${t.color}` }
      : { background: t.bg, color: t.color };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        fontWeight: 400,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "4px 9px",
        borderRadius: "var(--radius-pill)",
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

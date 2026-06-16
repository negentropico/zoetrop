// KGradeBadge — evidence-tier K1–K4 pill.
// Evidence tier is DISTINCT from status (optimal/borderline/deficient/excess).
// Colors via CSS vars only — dark remap is automatic via cascade.
// UI-SPEC Pattern 1 (Phase 6).

import type { CSSProperties } from "react";

export type KLevel = "K1" | "K2" | "K3" | "K4";

// CSS vars only — dark remap automatic via cascade (no Tailwind color classes)
const K_CONFIG: Record<KLevel, { color: string; bg: string; label: string }> = {
  K1: { color: "var(--ink)",       bg: "var(--n-100)",          label: "Established" },
  K2: { color: "var(--focus-500)", bg: "var(--focus-50)",       label: "Probable"    },
  K3: { color: "var(--n-600)",     bg: "var(--surface-sunken)", label: "Emerging"    },
  K4: { color: "var(--n-500)",     bg: "var(--n-100)",          label: "Speculative" },
};

export interface KGradeBadgeProps {
  level: KLevel;
  /** "chip" = standalone pill with parenthetical label; "inline" = tighter, inline-flow. Default: "chip" */
  variant?: "chip" | "inline";
}

const CHIP_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-2xs)",
  fontWeight: 400,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderRadius: "var(--radius-pill)",
  lineHeight: 1,
  padding: "4px 8px",
  display: "inline-block",
  whiteSpace: "nowrap",
};

const INLINE_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-2xs)",
  fontWeight: 400,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderRadius: "var(--radius-pill)",
  lineHeight: 1,
  padding: "2px 4px",
  display: "inline-block",
  whiteSpace: "nowrap",
};

export function KGradeBadge({ level, variant = "chip" }: KGradeBadgeProps) {
  const cfg = K_CONFIG[level];

  if (variant === "inline") {
    return (
      <span
        style={{
          ...INLINE_STYLE,
          color: cfg.color,
          background: cfg.bg,
        }}
      >
        {level}
      </span>
    );
  }

  // chip variant: badge + sibling muted mono label after (not inside)
  return (
    <>
      <span
        aria-label={`Evidence tier: ${level} — ${cfg.label}`}
        style={{
          ...CHIP_STYLE,
          color: cfg.color,
          background: cfg.bg,
        }}
      >
        {level}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          fontWeight: 400,
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginLeft: 4,
          whiteSpace: "nowrap",
        }}
      >
        ({cfg.label})
      </span>
    </>
  );
}

// Card — the "frame" surface container every Zoetrop module sits in.
// ELEVATION/PADDING/TONE_BG/ACCENT_COLOR maps — implementation per PATTERNS.md § Card.tsx.
// bg-surface rounded-xl border-border is the brand frame signature.

import type { CSSProperties, MouseEvent, ReactNode } from "react";

export interface CardProps {
  /** Drop shadow depth. @default "sm" */
  elevation?: "flat" | "xs" | "sm" | "md" | "lg";
  /** Metric-colored top hairline accent, or any CSS color. */
  accent?: "energy" | "vital" | "focus" | "ink" | string | null;
  /** Tint the whole surface with a metric-50 wash. */
  tone?: "energy" | "vital" | "focus" | "mist" | null;
  /** Inner padding. @default "lg" */
  padding?: "none" | "sm" | "md" | "lg";
  /** Adds hover lift + pointer. @default false */
  interactive?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const ELEVATION: Record<string, string> = {
  flat: "",
  xs:   "shadow-xs",
  sm:   "shadow-sm",
  md:   "shadow-md",
  lg:   "shadow-lg",
};

const PADDING: Record<string, string> = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

const TONE_BG: Record<string, string> = {
  energy: "bg-energy-50",
  vital:  "bg-vital-50",
  focus:  "bg-focus-50",
  mist:   "bg-surface-sunken",
};

const ACCENT_COLOR: Record<string, string> = {
  energy: "var(--energy)",
  vital:  "var(--vital)",
  focus:  "var(--focus)",
  ink:    "var(--ink)",
};

export function Card({
  elevation = "sm",
  accent = null,
  tone = null,
  padding = "lg",
  interactive = false,
  onClick,
  children,
  className = "",
  style,
}: CardProps) {
  const accentColor = accent
    ? (ACCENT_COLOR[accent] ?? accent)
    : null;

  return (
    <div
      onClick={onClick}
      className={[
        // zt-frame: style-free structural hook — binds the W0 rule
        // ".zt-frame .zt-mrow { border-radius: 0 }" (rows inside a frame
        // card keep straight corners; round-3 "card separation").
        // zt-card itself isn't adopted: it's unlayered CSS (beats Tailwind
        // utilities) and would override the padding/elevation props.
        "zt-frame bg-surface rounded-xl border border-border",
        ELEVATION[elevation] ?? "",
        PADDING[padding] ?? "",
        tone ? (TONE_BG[tone] ?? "") : "",
        interactive
          ? "cursor-pointer transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...(accentColor ? { borderTop: `2px solid ${accentColor}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

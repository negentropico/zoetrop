// IconButton — square/round icon-only control
// 40px default (md), ≥44px touch target on lg. Press animates scale(0.92).
// Always pass `label` for accessibility (aria-label).

import type { CSSProperties, MouseEvent, ReactNode } from "react";

export interface IconButtonProps {
  /** @default "ghost" */
  variant?: "ghost" | "soft" | "outline" | "ink";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Fully rounded (circle) instead of squircle. @default false */
  round?: boolean;
  disabled?: boolean;
  /** Accessible label (aria-label). Required for icon-only buttons. */
  label: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const DIMS: Record<"sm" | "md" | "lg", number> = { sm: 32, md: 40, lg: 48 };

const VARIANT_STYLES: Record<
  "ghost" | "soft" | "outline" | "ink",
  CSSProperties
> = {
  ghost:   { background: "transparent",          color: "var(--text-secondary)", border: "1.5px solid transparent" },
  soft:    { background: "var(--surface-sunken)", color: "var(--text)",           border: "1.5px solid transparent" },
  outline: { background: "var(--surface)",        color: "var(--text)",           border: "1.5px solid var(--border-strong)" },
  ink:     { background: "var(--ink)",            color: "var(--n-50)",           border: "1.5px solid transparent" },
};

export function IconButton({
  variant = "ghost",
  size = "md",
  round = false,
  disabled = false,
  label,
  onClick,
  children,
  className,
  style,
}: IconButtonProps) {
  const dim = DIMS[size] ?? 40;
  const v = VARIANT_STYLES[variant] ?? VARIANT_STYLES.ghost;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        minWidth: dim >= 44 ? dim : 44, // touch target ≥44px
        minHeight: dim >= 44 ? dim : 44,
        padding: 0,
        borderRadius: round ? "var(--radius-pill)" : "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition:
          "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
        ...v,
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

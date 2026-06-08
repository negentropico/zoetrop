// Button — pill-shaped action button
// Primary variant uses reserved periwinkle accent (var(--accent)) per the 60/30/10 color contract.
// All colors via CSS var strings (dark remap works automatically).

import type { CSSProperties, MouseEvent, ReactNode } from "react";

export interface ButtonProps {
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "ink" | "danger";
  /** Control height. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  disabled?: boolean;
  /** Icon element rendered before the label. */
  iconLeft?: ReactNode;
  /** Icon element rendered after the label. */
  iconRight?: ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const SIZE_STYLES: Record<
  "sm" | "md" | "lg",
  { padding: string; height: number; fontSize: string; gap: number }
> = {
  sm: { padding: "0 14px", height: 34, fontSize: "var(--text-sm)", gap: 7 },
  md: { padding: "0 20px", height: 44, fontSize: "var(--text-base)", gap: 8 },
  lg: { padding: "0 28px", height: 54, fontSize: "var(--text-md)", gap: 10 },
};

const VARIANT_STYLES: Record<
  "primary" | "secondary" | "ghost" | "ink" | "danger",
  CSSProperties
> = {
  // Accent reservation: primary CTA is the ONLY place var(--accent) fills a button
  primary:   { background: "var(--accent)",   color: "var(--accent-on, #fff)",  border: "1.5px solid transparent" },
  secondary: { background: "var(--surface)",  color: "var(--text)",             border: "1.5px solid var(--border-strong)" },
  ghost:     { background: "transparent",     color: "var(--text)",             border: "1.5px solid transparent" },
  ink:       { background: "var(--ink)",      color: "var(--n-50)",             border: "1.5px solid transparent" },
  danger:    { background: "var(--danger)",   color: "#fff",                    border: "1.5px solid transparent" },
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  onClick,
  children,
  className,
  style,
}: ButtonProps) {
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const v = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        width: fullWidth ? "100%" : "auto",
        fontFamily: "var(--font-text)",
        fontSize: s.fontSize,
        fontWeight: 600,
        letterSpacing: "0.005em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition:
          "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out)",
        opacity: disabled ? 0.45 : 1,
        ...v,
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {iconLeft && <span style={{ display: "inline-flex" }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ display: "inline-flex" }}>{iconRight}</span>}
    </button>
  );
}

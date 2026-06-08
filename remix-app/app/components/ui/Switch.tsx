// Switch — on/off toggle control
// Track color when on maps to a metric family (energy/vital/focus).
// Controlled component: caller manages checked state via onChange.

import type { CSSProperties } from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** On-state color. @default "focus" */
  tone?: "energy" | "vital" | "focus";
  /** @default "md" */
  size?: "sm" | "md";
  disabled?: boolean;
  /** Optional trailing label. */
  label?: string | null;
  style?: CSSProperties;
}

const TONE_COLOR: Record<string, string> = {
  energy: "var(--energy)",
  vital:  "var(--vital)",
  focus:  "var(--focus)",
};

const SIZE_CONFIG = {
  sm: { trackW: 32, trackH: 18, thumbSize: 14, thumbOffset: 2 },
  md: { trackW: 44, trackH: 24, thumbSize: 20, thumbOffset: 2 },
};

export function Switch({
  checked = false,
  onChange,
  tone = "focus",
  size = "md",
  disabled = false,
  label,
  style,
}: SwitchProps) {
  const sc = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const trackColor = checked ? (TONE_COLOR[tone] ?? TONE_COLOR.focus) : "var(--n-200)";
  const thumbTranslate = checked ? sc.trackW - sc.thumbSize - sc.thumbOffset : sc.thumbOffset;

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        userSelect: "none",
        ...style,
      }}
    >
      {/* Hidden native checkbox for accessibility */}
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />
      {/* Visual track */}
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange?.(!checked)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            onChange?.(!checked);
          }
        }}
        style={{
          position: "relative",
          display: "inline-flex",
          width: sc.trackW,
          height: sc.trackH,
          borderRadius: "var(--radius-pill)",
          background: trackColor,
          flexShrink: 0,
          transition: "background var(--dur-fast) var(--ease-out)",
        }}
      >
        {/* Thumb */}
        <span
          style={{
            position: "absolute",
            top: sc.thumbOffset,
            width: sc.thumbSize,
            height: sc.thumbSize,
            borderRadius: "50%",
            background: "var(--n-0)",
            boxShadow: "0 1px 3px rgba(39,35,36,0.18)",
            transition: "transform var(--dur-fast) var(--ease-out)",
            transform: `translateX(${thumbTranslate}px)`,
          }}
        />
      </span>
      {label && (
        <span
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-sm)",
            color: "var(--text)",
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}

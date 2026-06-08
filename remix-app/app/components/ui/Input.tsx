// Input — text input with optional label, leading icon, hint, and error states
// Brand warm focus ring via focus-visible: box-shadow var(--shadow-ring)
// All colors via CSS var strings (dark remap works automatically).

import type { ChangeEvent, CSSProperties, ReactNode } from "react";

export interface InputProps {
  label?: string | null;
  hint?: string | null;
  /** Error message — also turns the border danger. */
  error?: string | null;
  iconLeft?: ReactNode;
  type?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  style?: CSSProperties;
}

const SIZE_STYLES: Record<"sm" | "md" | "lg", { height: number; fontSize: string; padding: string }> = {
  sm: { height: 34, fontSize: "var(--text-sm)",   padding: "0 10px" },
  md: { height: 44, fontSize: "var(--text-base)",  padding: "0 14px" },
  lg: { height: 52, fontSize: "var(--text-md)",   padding: "0 16px" },
};

export function Input({
  label,
  hint,
  error,
  iconLeft,
  type = "text",
  size = "md",
  value,
  onChange,
  placeholder,
  disabled = false,
  name,
  id,
  style,
}: InputProps) {
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const hasError = Boolean(error);
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {iconLeft && (
          <span
            style={{
              position: "absolute",
              left: 12,
              display: "inline-flex",
              alignItems: "center",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          >
            {iconLeft}
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          style={{
            width: "100%",
            height: s.height,
            padding: s.padding,
            paddingLeft: iconLeft ? `calc(${s.padding.split(" ")[1]} + 28px)` : undefined,
            fontFamily: "var(--font-text)",
            fontSize: s.fontSize,
            color: "var(--text)",
            background: disabled ? "var(--surface-sunken)" : "var(--surface)",
            border: `1.5px solid ${hasError ? "var(--danger)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius-md)",
            outline: "none",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.6 : 1,
            transition:
              "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-ring)";
            e.currentTarget.style.borderColor = hasError ? "var(--danger)" : "var(--accent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = hasError ? "var(--danger)" : "var(--border-strong)";
          }}
        />
      </div>

      {error && (
        <span
          id={`${inputId}-error`}
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
          }}
        >
          {error}
        </span>
      )}
      {!error && hint && (
        <span
          id={`${inputId}-hint`}
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

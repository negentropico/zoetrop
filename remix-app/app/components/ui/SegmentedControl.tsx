// SegmentedControl — compact pill tab switch for ranges/views (Day / Week / Month)
// Controlled: caller owns value + onChange. Active segment uses Ink fill.

import type { CSSProperties } from "react";

export interface SegOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Options as strings or {value, label}. */
  options: (string | SegOption)[];
  value: string;
  onChange?: (value: string) => void;
  /** @default "md" */
  size?: "sm" | "md";
  style?: CSSProperties;
}

const SIZE_CONFIG = {
  sm: { height: 30, fontSize: "var(--text-xs)",  padding: "0 12px" },
  md: { height: 36, fontSize: "var(--text-sm)",  padding: "0 16px" },
};

function normalize(opt: string | SegOption): SegOption {
  return typeof opt === "string" ? { value: opt, label: opt } : opt;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  style,
}: SegmentedControlProps) {
  const sc = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const items = options.map(normalize);

  return (
    <div
      role="group"
      style={{
        display: "inline-flex",
        background: "var(--surface-sunken)",
        borderRadius: "var(--radius-pill)",
        padding: 3,
        gap: 2,
        ...style,
      }}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(item.value)}
            style={{
              height: sc.height,
              padding: sc.padding,
              fontFamily: "var(--font-text)",
              fontSize: sc.fontSize,
              fontWeight: active ? 600 : 500,
              color: active ? "var(--n-50)" : "var(--text-secondary)",
              background: active ? "var(--ink)" : "transparent",
              border: "none",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              lineHeight: 1,
              transition:
                "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

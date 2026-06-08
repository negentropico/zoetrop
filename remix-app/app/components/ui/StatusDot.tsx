// StatusDot — small status indicator circle, no label
// Used in metric rows (size 9), correlation section (size 7-8)

import type { Status } from "./StatusBadge";

const DOT_COLOR: Record<Status, string> = {
  optimal:    "var(--success)",
  borderline: "var(--warning)",
  deficient:  "var(--danger)",
  excess:     "var(--excess)",
};

interface StatusDotProps {
  status: Status;
  size?: number;
}

export function StatusDot({ status, size = 9 }: StatusDotProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: DOT_COLOR[status] ?? "var(--success)",
        flex: "0 0 auto",
        display: "inline-block",
      }}
    />
  );
}

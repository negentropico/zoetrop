// Avatar — user circle with optional metric ring and status dot
// Image falls back to auto-initials from `name`. Ring tone maps to metric family.

import type { CSSProperties } from "react";

export interface AvatarProps {
  /** Image URL. Falls back to initials from `name`. */
  src?: string | null;
  /** Full name — used for initials + alt text. */
  name?: string;
  /** Pixel diameter. @default 40 */
  size?: number;
  /** Metric-colored ring around the avatar. */
  ring?: "energy" | "vital" | "focus" | null;
  /** Presence dot. */
  status?: "online" | "away" | "off" | null;
  style?: CSSProperties;
}

const RING_COLOR: Record<string, string> = {
  energy: "var(--energy)",
  vital:  "var(--vital)",
  focus:  "var(--focus)",
};

const STATUS_COLOR: Record<string, string> = {
  online: "var(--vital)",
  away:   "var(--energy)",
  off:    "var(--n-400)",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  src = null,
  name = "",
  size = 40,
  ring = null,
  status = null,
  style,
}: AvatarProps) {
  const pad = ring ? 3 : 0;

  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "var(--radius-pill)",
          background: ring ? RING_COLOR[ring] : "transparent",
          padding: pad,
          boxSizing: "content-box",
        }}
      >
        <span
          style={{
            width: size,
            height: size,
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: src ? "var(--surface-sunken)" : "var(--ink)",
            color: "var(--n-50)",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: size * 0.38,
            border: ring ? "2px solid var(--surface)" : "none",
          }}
        >
          {src ? (
            <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials(name)
          )}
        </span>
      </span>
      {status && (
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: size * 0.28,
            height: size * 0.28,
            minWidth: 9,
            minHeight: 9,
            borderRadius: "50%",
            background: STATUS_COLOR[status] ?? "var(--n-400)",
            border: "2px solid var(--surface)",
          }}
        />
      )}
    </span>
  );
}

// Zoetrop brand wordmark: SpiralMark + "zoetrop." with periwinkle period
// shell (MobileTopBar), so it links to /dashboard (WR-03 — `/` is the public landing).
// Source: docs/design-system/_rounds/round1/app/lib.jsx Wordmark (lines 346–355)
import { Link } from "react-router";
import { SpiralMark } from "./SpiralMark";

export function Wordmark() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2.5 no-underline"
      style={{ textDecoration: "none" }}
    >
      <SpiralMark size={26} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "1.25rem",
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          display: "inline-flex",
          alignItems: "baseline",
          gap: "6px",
        }}
      >
        <span>
          zoetrop
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-faint)",
            alignSelf: "center",
          }}
        >
        </span>
      </span>
    </Link>
  );
}

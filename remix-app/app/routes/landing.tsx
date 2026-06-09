import { Link } from "react-router";

// Public landing page — no loader, no AppShell (public surface, D-02).
// AppShell lives in routes/_app/layout.tsx (authenticated routes only).

export function meta() {
  return [
    { title: "Zoetrop" },
    { name: "description", content: "Your signals, one frame at a time." },
  ];
}

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--gap-2xl)",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        {/* Wordmark */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "var(--text-3xl)",
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            marginBottom: "var(--gap-sm)",
          }}
        >
          Zoetrop
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "var(--gap-2xl)",
          }}
        >
          Your signals, one frame at a time.
        </p>

        {/* Value statement */}
        <p
          style={{
            fontSize: "var(--text-base)",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            marginBottom: "var(--gap-2xl)",
          }}
        >
          Confidence-graded functional-health protocol decisions —
          heterogeneous diagnostics, wearables, and genetics into an
          evidence-weighted, personalized protocol.
        </p>

        {/* CTA */}
        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 32px",
            borderRadius: "var(--radius-md)",
            background: "var(--ink)",
            color: "var(--n-50)",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "var(--text-base)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

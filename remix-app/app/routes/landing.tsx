import { Link } from "react-router";
import { SpiralMark } from "~/components/ui/SpiralMark";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { Card } from "~/components/ui/Card";
import { TrendChart } from "~/components/ui/TrendChart";

// Public landing page — no loader, no AppShell (public surface, D-02).
// AppShell lives in routes/_app/layout.tsx (authenticated routes only).
//
// design-r35/W5: restyled from screens-public.jsx (round-4 public register).
// Marketing register at brand scale: dot-grain paper, spiral mark, mono
// eyebrows, frame-card language. ONE real frame card (TrendChart).
//
// COPY = PLACEHOLDER. No owner marketing copy exists yet (outstanding owner
// input #1, logged in round3/deferred-items.md). The hero headline, sub,
// stat labels and capability rows below are the design's placeholder copy —
// the STRUCTURE is what W5 integrates, NOT the words.
//
// HERO CHART DATA = ILLUSTRATIVE SAMPLE, not owner PHI. This route is PUBLIC
// (unauthenticated); it MUST NOT load or render the owner's real metric data.
// `SAMPLE_VITD` below is a hand-authored, plausible-but-fake Vitamin D series
// purely to demonstrate the instrument's chart language on the landing.

export function meta() {
  return [
    { title: "Zoetrop" },
    { name: "description", content: "Your bloodwork, one frame at a time." },
  ];
}

// ── Illustrative sample (NOT owner PHI) ──────────────────────────────────────
// A fabricated Vitamin D trend, shown only to demonstrate the frame-card chart
// language on the public landing. Do not present as real data. Replace nothing
// in the real data layer — this constant lives only on the public route.
const SAMPLE_VITD = {
  name: "Vitamin D",
  unit: "ng/mL",
  value: 52,
  status: "optimal" as const,
  optimalRange: { min: 40, max: 60 },
  referenceRange: { min: 30, max: 100 },
  history: [
    { timestamp: "2025-02-15", value: 28 },
    { timestamp: "2025-05-20", value: 36 },
    { timestamp: "2025-08-18", value: 44 },
    { timestamp: "2025-11-22", value: 49 },
    { timestamp: "2026-02-14", value: 52 },
  ],
};

// Placeholder stat row — illustrative figures matching the app's real scale
// (9 categories is real; the rest are placeholder until owner copy lands).
const STATS = [
  { label: "Markers tracked", value: "46" },
  { label: "Categories", value: "9" },
  { label: "Protocol versions", value: "5" },
  { label: "Correlated pairs", value: "12" },
];

// Placeholder capability rows (design copy — owner owes real copy).
const ROWS = [
  {
    n: "01",
    title: "Ingest with a review gate",
    body: "Lab PDFs are AI-extracted, then every field is approved, edited or rejected by you before it touches a metric.",
  },
  {
    n: "02",
    title: "Protocol as versions",
    body: "Supplement stacks are versioned and diffable — what changed between P3 and P4 is one glyph row away.",
  },
  {
    n: "03",
    title: "Signals, not alarms",
    body: "Trends draw in ink; judgment lives only in the four status colors. The instrument states, you decide.",
  },
];

function PublicTopbar() {
  return (
    <header className="zt-pub-top">
      <Link
        to="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
      >
        <SpiralMark size={24} />
        <span className="zn-wordmark">
          zoetrop<span style={{ color: "var(--accent)" }}>.</span>
        </span>
      </Link>
      <Link to="/login" className="zt-pill">
        Sign in
      </Link>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="zt-pub-foot">
      <SpiralMark size={16} color="var(--text-faint)" />
      <span className="zt-eyebrow" style={{ color: "var(--text-faint)" }}>
        Zoetrop · a personal instrument · single-owner
      </span>
    </footer>
  );
}

export default function LandingPage() {
  const m = SAMPLE_VITD;
  return (
    <div className="zt-public">
      <PublicTopbar />

      <main className="zt-pub-main">
        <section className="zt-pub-hero">
          <div
            className="zt-eyebrow"
            style={{ marginBottom: "var(--gap-lg)" }}
          >
            Personal health protocol instrument
          </div>
          {/* PLACEHOLDER headline — design copy, not final marketing copy */}
          <h1 className="zt-pub-h1">
            Your bloodwork,
            <br />
            one frame at a time.
          </h1>
          <p className="zt-pub-sub">
            Zoetrop stitches labs, wearables and protocol notes into one calm
            picture — every marker read against its optimal range, every
            reading a frame in the sequence.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--gap-md)",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/login"
              className="zt-btn-ink"
              style={{
                textDecoration: "none",
                color: "var(--text-on-ink)",
              }}
            >
              Sign in
            </Link>
            <span
              className="zt-eyebrow"
              style={{ color: "var(--text-faint)" }}
            >
              Owner-only · invites from inside
            </span>
          </div>
        </section>

        {/* the instrument, not a brochure — one real frame card.
            The series is an ILLUSTRATIVE SAMPLE (not owner PHI) — this
            route is public/unauthenticated. */}
        <section className="zt-pub-frame">
          <Card elevation="lg">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "var(--gap-lg)",
                flexWrap: "wrap",
                marginBottom: "var(--gap-lg)",
              }}
            >
              <div>
                <div
                  className="zt-eyebrow"
                  style={{ marginBottom: 8 }}
                >
                  {m.name}
                  <span style={{ color: "var(--text-faint)" }}>
                    {" · illustrative sample"}
                  </span>
                </div>
                <span
                  className="zt-readout"
                  style={{ fontSize: "var(--text-2xl)", color: "var(--ink)" }}
                >
                  {m.value}{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 400,
                      color: "var(--text-muted)",
                    }}
                  >
                    {m.unit.toUpperCase()}
                  </span>
                </span>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <TrendChart
              data={m.history}
              unit={m.unit}
              optimalRange={m.optimalRange}
              referenceRange={m.referenceRange}
              height={260}
            />
          </Card>
          <div className="zt-pub-statrow">
            {STATS.map((s) => (
              <div key={s.label}>
                <div
                  className="zt-readout zt-tnum"
                  style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}
                >
                  {s.value}
                </div>
                <div className="zt-eyebrow" style={{ marginTop: 6 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="zt-pub-rows">
          {ROWS.map((r, i, arr) => (
            <div
              key={r.n}
              className="zt-pub-row"
              style={{
                borderBottom:
                  i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                className="zt-eyebrow zt-tnum"
                style={{ color: "var(--text-faint)" }}
              >
                {r.n}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "var(--text-md)",
                  color: "var(--ink)",
                }}
              >
                {r.title}
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  textWrap: "pretty",
                }}
              >
                {r.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

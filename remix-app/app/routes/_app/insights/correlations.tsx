import { useState } from "react";
import type { Route } from "./+types/correlations";
import {
  seedCorrelations,
  seedSupplements,
  type SupplementCorrelation,
} from "~/lib/seed-data";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { DataTable } from "~/components/ui/DataTable";
import { PageHeader } from "~/components/ui/PageHeader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Correlations - Zoetrop" },
    { name: "description", content: "Supplement-metric correlation analysis" },
  ];
}

export function loader() {
  const correlations = seedCorrelations;
  const supplements = seedSupplements;

  // Group by supplement
  const bySuplement = correlations.reduce((acc, corr) => {
    if (!acc[corr.supplementName]) {
      acc[corr.supplementName] = [];
    }
    acc[corr.supplementName].push(corr);
    return acc;
  }, {} as Record<string, SupplementCorrelation[]>);

  // Stats
  const avgCorrelation =
    correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) /
    correlations.length;

  return {
    correlations,
    supplements,
    bySuplement,
    stats: {
      total: correlations.length,
      strong: correlations.filter((c) => c.significance === "strong").length,
      moderate: correlations.filter((c) => c.significance === "moderate").length,
      weak: correlations.filter((c) => c.significance === "weak").length,
      avgCorrelation: avgCorrelation.toFixed(2),
      significant: correlations.filter((c) => c.pValue < 0.05).length,
    },
  };
}

// Diverging correlation bar — vital positive, danger negative, center line absolute
function CorrBar({ r }: { r: number }) {
  const neg = r < 0;
  const mag = Math.min(1, Math.abs(r));
  const col = neg ? "var(--danger)" : "var(--vital)";
  return (
    <div
      style={{
        position: "relative",
        width: 120,
        height: 12,
        background: "var(--n-100)",
        borderRadius: "var(--radius-pill)",
        flexShrink: 0,
      }}
    >
      {/* Center divider */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -2,
          bottom: -2,
          width: 1,
          background: "var(--border-strong)",
        }}
      />
      {/* Fill bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          height: "100%",
          borderRadius: "var(--radius-pill)",
          background: col,
          width: mag * 50 + "%",
          left: neg ? 50 - mag * 50 + "%" : "50%",
        }}
      />
    </div>
  );
}

// Significance tone mapping
const SIG_TONE: Record<string, "vital" | "focus" | "energy" | "neutral"> = {
  strong: "vital",
  moderate: "focus",
  weak: "energy",
  none: "neutral",
};

// Brand-styled select
function BrandSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        padding: "9px 36px 9px 14px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        cursor: "pointer",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23756d70' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function Correlations({ loaderData }: Route.ComponentProps) {
  const { correlations, stats } = loaderData;

  const [filterSignificance, setFilterSignificance] = useState<string>("all");
  const [filterSupplement, setFilterSupplement] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("r");

  // Filter correlations
  let filtered = [...correlations];
  if (filterSignificance !== "all") {
    filtered = filtered.filter((c) => c.significance === filterSignificance);
  }
  if (filterSupplement !== "all") {
    filtered = filtered.filter((c) => c.supplementName === filterSupplement);
  }

  // Sort correlations
  if (sortBy === "r") {
    filtered.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  } else if (sortBy === "p") {
    filtered.sort((a, b) => a.pValue - b.pValue);
  } else if (sortBy === "n") {
    filtered.sort((a, b) => b.sampleSize - a.sampleSize);
  }

  const supplementNames = [...new Set(correlations.map((c) => c.supplementName))];

  // Ink-active filter pill
  const SigPill = ({
    id,
    label,
    count,
  }: {
    id: string;
    label: string;
    count?: number;
  }) => {
    const on = filterSignificance === id;
    return (
      <button
        key={id}
        onClick={() => setFilterSignificance(id)}
        style={{
          padding: "8px 14px",
          borderRadius: "var(--radius-pill)",
          cursor: "pointer",
          fontFamily: "var(--font-text)",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          border: `1px solid ${on ? "var(--ink)" : "var(--border)"}`,
          background: on ? "var(--ink)" : "var(--surface)",
          color: on ? "var(--n-50)" : "var(--text-secondary)",
          transition:
            "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        {count != null && (
          <span
            className="zt-tnum"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              opacity: 0.7,
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  // Desktop DataTable columns
  type CorrRow = {
    id: number;
    supplementName: string;
    metricName: string;
    correlation: number;
    significance: string;
    lagDays: number;
    pValue: number;
    sampleSize: number;
  };

  const columns = [
    {
      key: "supplementName" as keyof CorrRow & string,
      label: "Supplement",
      render: (c: CorrRow) => (
        <span style={{ fontWeight: 600 }}>{c.supplementName}</span>
      ),
    },
    {
      key: "metricName" as keyof CorrRow & string,
      label: "Metric",
      render: (c: CorrRow) => (
        <span style={{ color: "var(--text-secondary)" }}>{c.metricName}</span>
      ),
    },
    {
      key: "correlation" as keyof CorrRow & string,
      label: "Correlation",
      render: (c: CorrRow) => (
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
        >
          <CorrBar r={c.correlation} />
          <span
            className="zt-tnum"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color:
                c.correlation < 0 ? "var(--danger)" : "var(--vital-500)",
            }}
          >
            {c.correlation > 0 ? "+" : ""}
            {c.correlation.toFixed(2)}
          </span>
        </span>
      ),
    },
    {
      key: "significance" as keyof CorrRow & string,
      label: "Significance",
      render: (c: CorrRow) => (
        <Badge tone={SIG_TONE[c.significance] ?? "neutral"}>
          {c.significance}
        </Badge>
      ),
    },
    {
      key: "lagDays" as keyof CorrRow & string,
      label: "Lag",
      align: "right" as const,
      mono: true,
      render: (c: CorrRow) => `${c.lagDays}d`,
    },
    {
      key: "pValue" as keyof CorrRow & string,
      label: "p-value",
      align: "right" as const,
      mono: true,
      render: (c: CorrRow) => (
        <span
          style={{
            color:
              c.pValue < 0.05
                ? "var(--vital-500)"
                : "var(--text-muted)",
          }}
        >
          {c.pValue.toFixed(3)}
          {c.pValue < 0.05 ? " *" : ""}
        </span>
      ),
    },
    {
      key: "sampleSize" as keyof CorrRow & string,
      label: "n",
      align: "right" as const,
      mono: true,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="TOP CORRELATIONS"
        title="Correlations"
        sub="See which supplements move which metrics — strength, significance, and lag."
      />

      {/* Stats row */}
      <div className="zt-grid-4" style={{ marginBottom: "var(--gap-xl)" }}>
        {[
          { label: "TOTAL", value: stats.total, tone: null },
          { label: "STRONG", value: stats.strong, tone: "var(--vital)" },
          { label: "MODERATE", value: stats.moderate, tone: "var(--focus)" },
          { label: "p < 0.05", value: stats.significant, tone: "var(--energy)" },
        ].map(({ label, value, tone }) => (
          <Card key={label} padding="md" style={{ textAlign: "center" }}>
            <span
              className="zt-readout"
              style={{
                fontSize: "var(--text-2xl)",
                display: "block",
                color: tone ?? "var(--ink)",
              }}
            >
              {value}
            </span>
            <span className="zt-eyebrow" style={{ display: "block", marginTop: 6 }}>
              {label}
            </span>
          </Card>
        ))}
      </div>

      {/* Filter pills + selects */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "var(--gap-lg)",
        }}
      >
        <SigPill id="all" label="All" count={stats.total} />
        <SigPill id="strong" label="Strong" count={stats.strong} />
        <SigPill id="moderate" label="Moderate" count={stats.moderate} />
        <SigPill id="weak" label="Weak" count={stats.weak} />
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <BrandSelect
            value={filterSupplement}
            onChange={setFilterSupplement}
            options={[
              { value: "all", label: "All supplements" },
              ...supplementNames.map((s) => ({ value: s, label: s })),
            ]}
          />
          <BrandSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "r", label: "Sort by |r|" },
              { value: "p", label: "Sort by p-value" },
              { value: "n", label: "Sort by n" },
            ]}
          />
        </div>
      </div>

      {/* Desktop table — hidden at <=760px via media */}
      <div className="corr-desktop">
        <Card padding="md">
          <DataTable<CorrRow>
            columns={columns}
            rows={filtered as CorrRow[]}
            rowKey={(r) => r.id}
          />
        </Card>
      </div>

      {/* Mobile cards — card-per-row at <=760px.
          Do NOT set `display` inline here: an inline `display:flex` overrides the
          `.corr-mobile { display:none }` rule + the media query below, so this list
          renders alongside the desktop table at ALL widths (duplicate rows).
          `display` is owned by the .corr-mobile class. */}
      <div className="corr-mobile" style={{ flexDirection: "column", gap: 10 }}>
        {filtered.map((c) => (
          <Card key={c.id} padding="md">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.supplementName}</div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {c.metricName}
                </div>
              </div>
              <span
                className="zt-tnum"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "var(--text-lg)",
                  color: c.correlation < 0 ? "var(--danger)" : "var(--vital-500)",
                  flexShrink: 0,
                }}
              >
                {c.correlation > 0 ? "+" : ""}
                {c.correlation.toFixed(2)}
              </span>
            </div>
            <CorrBar r={c.correlation} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 12,
                flexWrap: "wrap",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              <Badge tone={SIG_TONE[c.significance] ?? "neutral"}>
                {c.significance}
              </Badge>
              <span>{c.lagDays}d lag</span>
              <span
                style={{
                  color: c.pValue < 0.05 ? "var(--vital-500)" : "var(--text-muted)",
                }}
              >
                p={c.pValue.toFixed(3)}
                {c.pValue < 0.05 ? " *" : ""}
              </span>
              <span>n={c.sampleSize}</span>
            </div>
          </Card>
        ))}
      </div>

      <style>{`
        .corr-desktop { display: block; }
        .corr-mobile  { display: none; }
        @media (max-width: 760px) {
          .corr-desktop { display: none; }
          .corr-mobile  { display: flex; }
        }
      `}</style>

      {filtered.length === 0 && (
        <Card padding="lg" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          No correlations tracked yet. Import your first dataset to see supplement–metric relationships.
        </Card>
      )}

      {/* Interpretation guide */}
      <Card padding="lg" style={{ marginTop: "var(--gap-lg)" }}>
        <div className="zt-eyebrow" style={{ marginBottom: 16 }}>
          Interpretation guide
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 24,
          }}
        >
          <div>
            <div
              className="zt-eyebrow"
              style={{ color: "var(--text-muted)", marginBottom: 10 }}
            >
              Correlation strength
            </div>
            {(
              [
                ["Strong", "|r| ≥ 0.7 — reliable relationship", "vital"],
                ["Moderate", "|r| 0.4–0.7 — meaningful but variable", "focus"],
                ["Weak", "|r| 0.2–0.4 — may be influenced by other factors", "energy"],
              ] as [string, string, string][]
            ).map(([t, d, tone]) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "5px 0",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: `var(--${tone})`,
                    width: 76,
                    flexShrink: 0,
                  }}
                >
                  {t}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div
              className="zt-eyebrow"
              style={{ color: "var(--text-muted)", marginBottom: 10 }}
            >
              Statistical significance
            </div>
            {(
              [
                ["p < 0.05", "Statistically significant (*)"],
                ["Lag days", "Time offset for correlation analysis"],
                ["n", "Sample size — more is better"],
              ] as [string, string][]
            ).map(([t, d]) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "5px 0",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    width: 76,
                    flexShrink: 0,
                  }}
                >
                  {t}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useState } from "react";
import type { Route } from "./+types/correlations";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getCorrelations, getSupplements } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { Card } from "~/components/ui/Card";
import { DataTable } from "~/components/ui/DataTable";
import { PageHeader } from "~/components/ui/PageHeader";

// Significance derivation — survivor presentation helper (non-PHI)
function getCorrelationSignificance(r: number): "strong" | "moderate" | "weak" | "none" {
  const absR = Math.abs(r);
  if (absR >= 0.7) return "strong";
  if (absR >= 0.4) return "moderate";
  if (absR >= 0.2) return "weak";
  return "none";
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Correlations - Zoetrop" },
    { name: "description", content: "Supplement-metric correlation analysis" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  const [correlationsRows, supplementsRows] = await Promise.all([
    getCorrelations(ctx),
    getSupplements(ctx),
  ]);

  // Build supplement id → name map
  const suppNameMap = new Map(supplementsRows.map((s) => [s.id, s.name]));

  // Derive correlations with supplementName, significance, direction
  const correlations = correlationsRows.map((c) => ({
    id: c.id,
    supplementId: c.supplementId,
    supplementName: suppNameMap.get(c.supplementId) ?? `Supplement #${c.supplementId}`,
    metricName: c.metricName,
    correlation: c.correlation,
    lagDays: c.lagDays,
    sampleSize: c.sampleSize,
    pValue: c.pValue ?? null,
    significance: getCorrelationSignificance(c.correlation),
    direction: (c.correlation >= 0 ? "positive" : "negative") as "positive" | "negative",
  }));

  const supplements = supplementsRows;

  // Group by supplement
  const bySuplement = correlations.reduce((acc, corr) => {
    if (!acc[corr.supplementName]) {
      acc[corr.supplementName] = [];
    }
    acc[corr.supplementName].push(corr);
    return acc;
  }, {} as Record<string, typeof correlations>);

  // Stats
  const avgCorrelation =
    correlations.length > 0
      ? correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlations.length
      : 0;

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
      significant: correlations.filter((c) => (c.pValue ?? 1) < 0.05).length,
    },
  };
}

// Diverging r micro-bar (round 3) — structure is NEUTRAL (n-100 track,
// n-300 center hairline); only the SIGN carries status color
// (positive → --optimal, negative → --deficient). The figure stays Ink.
function CorrBar({ r }: { r: number }) {
  const neg = r < 0;
  const w = Math.min(1, Math.abs(r)) * 28;
  return (
    <span
      style={{
        position: "relative",
        width: 60,
        height: 4,
        background: "var(--n-100)",
        borderRadius: 2,
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: neg ? `calc(50% - ${w}px)` : "50%",
          width: w,
          background: neg ? "var(--deficient)" : "var(--optimal)",
          borderRadius: 2,
        }}
      />
      <span
        style={{
          position: "absolute",
          top: -2,
          bottom: -2,
          left: "calc(50% - 0.5px)",
          width: 1,
          background: "var(--n-300)",
        }}
      />
    </span>
  );
}

// Significance vocabulary — mono colored word (round 3; Badge dropped)
const SIG_COLOR: Record<string, string> = {
  strong: "var(--vital-500, var(--vital))",
  moderate: "var(--energy-500, var(--energy))",
  weak: "var(--text-muted)",
  none: "var(--text-faint)",
};

function SigWord({ significance }: { significance: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: SIG_COLOR[significance] ?? "var(--text-muted)",
      }}
    >
      {significance}
    </span>
  );
}

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
    filtered.sort((a, b) => (a.pValue ?? 1) - (b.pValue ?? 1));
  } else if (sortBy === "n") {
    filtered.sort((a, b) => b.sampleSize - a.sampleSize);
  }

  const supplementNames = [...new Set(correlations.map((c) => c.supplementName))];

  // Filter pill — shared zt-pill atom (round 3)
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
        type="button"
        onClick={() => setFilterSignificance(id)}
        className={"zt-pill" + (on ? " is-active" : "")}
      >
        {label}
        {count != null && (
          <span className="zt-tnum" style={{ opacity: 0.7 }}>
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
    pValue: number | null;
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
      label: "r",
      render: (c: CorrRow) => (
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          <CorrBar r={c.correlation} />
          <span
            className="zt-tnum"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "var(--ink)",
              minWidth: 52,
              textAlign: "right",
              display: "inline-block",
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
      render: (c: CorrRow) => <SigWord significance={c.significance} />,
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
      render: (c: CorrRow) => {
        const p = c.pValue;
        if (p == null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
        return (
          <span
            style={{
              color: p < 0.05 ? "var(--vital-500)" : "var(--text-muted)",
            }}
          >
            {p.toFixed(3)}
            {p < 0.05 ? " *" : ""}
          </span>
        );
      },
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

      {/* Stats — merged into ONE stat-strip card (round 3) */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-xl)" }}>
        <div className="zt-stat-strip">
          {[
            { label: "Total pairs", value: stats.total },
            { label: "Strong", value: stats.strong },
            { label: "Moderate", value: stats.moderate },
            { label: "p < 0.05", value: stats.significant },
          ].map(({ label, value }) => (
            <div key={label} className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>{label}</div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

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

      {/* Mobile cards — card-per-row at <=760px */}
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
                  color: "var(--ink)",
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
              <SigWord significance={c.significance} />
              <span>{c.lagDays}d lag</span>
              {c.pValue != null && (
                <span
                  style={{
                    color: c.pValue < 0.05 ? "var(--vital-500)" : "var(--text-muted)",
                  }}
                >
                  p={c.pValue.toFixed(3)}
                  {c.pValue < 0.05 ? " *" : ""}
                </span>
              )}
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
                ["Strong", "|r| ≥ 0.7 — reliable relationship", SIG_COLOR.strong],
                ["Moderate", "|r| 0.4–0.7 — meaningful but variable", SIG_COLOR.moderate],
                ["Weak", "|r| 0.2–0.4 — may be influenced by other factors", SIG_COLOR.weak],
              ] as [string, string, string][]
            ).map(([t, d, color]) => (
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
                    color,
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

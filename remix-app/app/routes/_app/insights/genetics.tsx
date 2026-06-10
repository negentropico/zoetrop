import { useState } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/genetics";
import { seedGeneticVariants } from "~/lib/seed-data";
import {
  CONFIDENCE_LEVELS,
  VARIANT_CATEGORIES,
  type ConfidenceLevel,
  type VariantCategory,
  type GeneticVariant,
} from "~/types/genetics";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { DataTable } from "~/components/ui/DataTable";
import { PageHeader } from "~/components/ui/PageHeader";

// One tone per confidence level — shared by the stat tiles, the table badges,
// and the guide so the confidence vocabulary is identical everywhere it appears.
const CONF_TONE: Record<ConfidenceLevel, "vital" | "focus" | "energy" | "neutral"> = {
  K1: "vital",
  K2: "focus",
  K3: "energy",
  K4: "neutral",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Genetic Profile - Zoetrop" },
    { name: "description", content: "Genetic variants informing supplement protocol" },
  ];
}

export function loader() {
  const variants = seedGeneticVariants;

  // Group by category
  const byCategory = variants.reduce((acc, v) => {
    if (!acc[v.category]) {
      acc[v.category] = [];
    }
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, GeneticVariant[]>);

  // Stats
  const byConfidence = variants.reduce((acc, v) => {
    acc[v.confidence] = (acc[v.confidence] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byImpact = variants.reduce((acc, v) => {
    acc[v.impact] = (acc[v.impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    variants,
    byCategory,
    stats: {
      total: variants.length,
      byConfidence,
      byImpact,
      highImpact: variants.filter((v) => v.impact === "high").length,
      k1Confirmed: byConfidence["K1"] || 0,
    },
  };
}

export default function Genetics({ loaderData }: Route.ComponentProps) {
  const { variants, byCategory, stats } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const filterCategory = searchParams.get("category") as VariantCategory | null;
  const filterConfidence = searchParams.get("confidence") as ConfidenceLevel | null;
  const filterImpact = searchParams.get("impact");

  // Filter variants
  let filtered = [...variants];
  if (filterCategory) {
    filtered = filtered.filter((v) => v.category === filterCategory);
  }
  if (filterConfidence) {
    filtered = filtered.filter((v) => v.confidence === filterConfidence);
  }
  if (filterImpact) {
    filtered = filtered.filter((v) => v.impact === filterImpact);
  }

  const categories = Object.keys(VARIANT_CATEGORIES) as VariantCategory[];
  const confidenceLevels = Object.keys(CONFIDENCE_LEVELS) as ConfidenceLevel[];

  // DataTable columns
  type VRow = {
    id: string;
    gene: string;
    rsid?: string | null;
    genotype: string;
    confidence: ConfidenceLevel;
    impact: string;
    category: VariantCategory;
    clinicalImplication: string;
    protocolAction: string;
  };

  const columns = [
    {
      key: "gene" as keyof VRow & string,
      label: "Gene",
      render: (v: VRow) => (
        <div>
          <span style={{ fontWeight: 600 }}>{v.gene}</span>
          {v.rsid && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {v.rsid}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "genotype" as keyof VRow & string,
      label: "Genotype",
      mono: true,
    },
    {
      key: "confidence" as keyof VRow & string,
      label: "Confidence",
      // K-number + label so the badge reads the same as the tiles and guide,
      // and carries a colorblind-safe text channel beyond color alone.
      render: (v: VRow) => (
        <Badge tone={CONF_TONE[v.confidence]}>
          {v.confidence} · {CONFIDENCE_LEVELS[v.confidence].label}
        </Badge>
      ),
    },
    {
      key: "category" as keyof VRow & string,
      label: "Category",
      render: (v: VRow) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          {VARIANT_CATEGORIES[v.category].label}
        </span>
      ),
    },
    {
      key: "clinicalImplication" as keyof VRow & string,
      label: "Implication",
      wrap: true,
      render: (v: VRow) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          {v.clinicalImplication}
        </span>
      ),
    },
    {
      key: "protocolAction" as keyof VRow & string,
      label: "Protocol action",
      wrap: true,
      render: (v: VRow) => (
        <span style={{ fontWeight: 500, fontSize: "var(--text-sm)" }}>
          {v.protocolAction}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="GENETIC INSIGHTS"
        title="Genetic profile"
        sub="Genetic variants informing supplement protocol — methylation, detox, and metabolic pathways."
      />

      {/* Stats — tiles use the canonical CONFIDENCE_LEVELS labels (not ad-hoc
          "HIGH"/"INFERRED") so tiles, table badges, and guide speak one
          vocabulary. Auto-fit grid fits TOTAL + all four K-levels. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--gap-md)",
          marginBottom: "var(--gap-xl)",
        }}
      >
        {[
          { label: "TOTAL VARIANTS", value: stats.total },
          ...confidenceLevels.map((level) => ({
            label: `${level} ${CONFIDENCE_LEVELS[level].label}`,
            value: stats.byConfidence[level] || 0,
          })),
        ].map(({ label, value }) => (
          <Card key={label} padding="md" style={{ textAlign: "center" }}>
            <span
              className="zt-readout"
              style={{ fontSize: "var(--text-2xl)", display: "block" }}
            >
              {value}
            </span>
            <span className="zt-eyebrow" style={{ display: "block", marginTop: 6 }}>
              {label}
            </span>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          marginBottom: "var(--gap-lg)",
        }}
      >
        {/* Category select */}
        <select
          value={filterCategory || ""}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            if (e.target.value) {
              newParams.set("category", e.target.value);
            } else {
              newParams.delete("category");
            }
            setSearchParams(newParams);
          }}
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
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {VARIANT_CATEGORIES[cat].label}
            </option>
          ))}
        </select>

        {/* Confidence pills */}
        {["all", ...confidenceLevels].map((conf) => {
          const on =
            conf === "all" ? !filterConfidence : filterConfidence === conf;
          return (
            <button
              key={conf}
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                if (conf === "all") {
                  newParams.delete("confidence");
                } else {
                  newParams.set("confidence", conf);
                }
                setSearchParams(newParams);
              }}
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
              }}
            >
              {conf === "all"
                ? "All"
                : CONFIDENCE_LEVELS[conf as ConfidenceLevel].label}
            </button>
          );
        })}

        {/* Clear */}
        {(filterCategory || filterConfidence || filterImpact) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Count */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: "var(--gap-md)",
        }}
      >
        {filtered.length} of {stats.total} variants
      </div>

      {/* DataTable — minWidth:0 lets the inner scroll container shrink so the
          640px-min table scrolls within the card instead of widening the page
          at mobile (04.1-09 R2). */}
      <Card padding="md" style={{ minWidth: 0 }}>
        <DataTable<VRow>
          columns={columns}
          rows={filtered as VRow[]}
          rowKey={(r) => r.id}
        />
      </Card>

      {filtered.length === 0 && (
        <Card padding="lg" style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "var(--gap-md)" }}>
          No variants found matching the current filters.
        </Card>
      )}

      {/* Confidence guide */}
      <Card padding="lg" style={{ marginTop: "var(--gap-lg)" }}>
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-md)" }}>
          Confidence level guide
        </div>
        <div className="zt-grid-2">
          {confidenceLevels.map((level) => {
            const info = CONFIDENCE_LEVELS[level];
            return (
              <div
                key={level}
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <Badge tone={CONF_TONE[level]}>
                  {level} · {info.label}
                </Badge>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {info.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* K3 verification prompt */}
      <Card
        padding="lg"
        accent="energy"
        style={{ marginTop: "var(--gap-lg)" }}
      >
        <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
          K3 verification needed
        </div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            margin: "0 0 12px",
          }}
        >
          The following variants are K3 (inferred from protocol) and should be
          verified through SelfDecode or genetic testing:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {variants
            .filter((v) => v.confidence === "K3")
            .map((v) => (
              <div
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{ color: "var(--energy)", flexShrink: 0 }}
                >
                  ·
                </span>
                <strong style={{ color: "var(--text)" }}>{v.gene}</strong>
                <span>— {v.clinicalImplication}</span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

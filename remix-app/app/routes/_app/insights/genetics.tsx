import { useState } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/genetics";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getSubjectGenotypes } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { getGeneticKnowledgeByGene } from "~/lib/corpus.server";
import {
  CONFIDENCE_LEVELS,
  VARIANT_CATEGORIES,
  type ConfidenceLevel,
  type VariantCategory,
} from "~/types/genetics";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";

// One tone per confidence level — shared by the stat tiles, the table badges,
// and the guide so the confidence vocabulary is identical everywhere it appears.
const CONF_TONE: Record<ConfidenceLevel, "vital" | "focus" | "energy" | "neutral"> = {
  K1: "vital",
  K2: "focus",
  K3: "energy",
  K4: "neutral",
};

// Mono-word color per confidence level (gene-row right column; the round-4
// dark remaps keep vital/energy-500 readable as text on dark cards).
const CONF_COLOR: Record<ConfidenceLevel, string> = {
  K1: "var(--vital-500, var(--vital))",
  K2: "var(--accent)",
  K3: "var(--energy-500, var(--energy))",
  K4: "var(--text-muted)",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Genetic Profile - Zoetrop" },
    { name: "description", content: "Genetic variants informing supplement protocol" },
  ];
}

// Derived variant shape (DB PHI + knowledge plane join)
type DerivedVariant = {
  id: number;
  gene: string;
  rsid: string | null;
  genotype: string;
  confidence: ConfidenceLevel;
  category: VariantCategory;
  impact: string;
  clinicalImplication: string;
  protocolAction: string;
  notes?: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  const [genotypeRows, geneticKnowledge] = await Promise.all([
    getSubjectGenotypes(ctx),
    getGeneticKnowledgeByGene(),
  ]);

  // Shape C join: DB rows + corpus genetic knowledge by gene
  const variants: DerivedVariant[] = genotypeRows.flatMap((row) => {
    const knowledge = geneticKnowledge[row.gene];
    if (!knowledge) return [];
    const variant: DerivedVariant = {
      id: row.id,
      gene: row.gene,
      rsid: row.rsid ?? null,
      genotype: row.genotype,
      confidence: knowledge.confidence as ConfidenceLevel,
      category: knowledge.category as VariantCategory,
      impact: knowledge.impact,
      clinicalImplication: knowledge.clinicalImplication,
      protocolAction: knowledge.protocolAction,
      notes: knowledge.notes,
    };
    return [variant];
  });

  // Group by category
  const byCategory = variants.reduce((acc, v) => {
    if (!acc[v.category]) {
      acc[v.category] = [];
    }
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, DerivedVariant[]>);

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

  return (
    <div>
      <PageHeader
        eyebrow="GENETIC INSIGHTS"
        title="Genetic profile"
        sub="Genetic variants informing supplement protocol — methylation, detox, and metabolic pathways."
      />

      {/* Stats */}
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

      {/* Variant list — round 3: per-variant cards merged into ONE
          frame-card list. Round-5 mobile fix: zt-gene-row/zt-gene-id stack
          the gene id above the impact text at 390px (W0 CSS). */}
      <Card padding="none" style={{ minWidth: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--gap-3xl) var(--gap-card)", fontSize: "var(--text-sm)" }}>
            No variants found matching the current filters.
          </div>
        ) : (
          filtered.map((g, i) => (
            <div
              key={g.id}
              className="zt-gene-row"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--gap-xl)",
                padding: "var(--gap-row) var(--gap-card)",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {/* flex-basis lives in app.css (.zt-gene-id) so the ≤760px
                  stack rule can override it — never inline here. */}
              <div className="zt-gene-id" style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--ink)", marginBottom: 4 }}>
                  {g.gene}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
                  {[g.rsid, g.genotype].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", marginTop: 2 }}>
                  {VARIANT_CATEGORIES[g.category]?.label ?? g.category}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 6, textWrap: "pretty" }}>
                  {g.clinicalImplication}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text)", textWrap: "pretty" }}>
                  {g.protocolAction}
                </div>
              </div>
              <span
                style={{
                  flex: "0 0 auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: CONF_COLOR[g.confidence] ?? "var(--text-muted)",
                }}
              >
                {g.confidence} · {CONFIDENCE_LEVELS[g.confidence].label}
              </span>
            </div>
          ))
        )}
      </Card>

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

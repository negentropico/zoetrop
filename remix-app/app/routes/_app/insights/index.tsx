import { Link } from "react-router";
import type { Route } from "./+types/index";
import { requireUser } from "~/lib/authz.server";
import {
  getOwnerSubject,
  getCorrelations,
  getSubjectGenotypes,
  getSupplements,
} from "~/lib/data.server";
import { GENETIC_KNOWLEDGE } from "~/lib/genetics-knowledge.server";
import { CONFIDENCE_LEVELS, VARIANT_CATEGORIES } from "~/types/genetics";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";

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
    { title: "Insights Overview - Zoetrop" },
    { name: "description", content: "Data-driven insights from your wellness data" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const tenantId = user.tenantId!;
  const subjectId = subject.id;

  const [correlationsRows, supplementsRows, genotypeRows] = await Promise.all([
    getCorrelations(tenantId, subjectId),
    getSupplements(tenantId, subjectId),
    getSubjectGenotypes(tenantId, subjectId),
  ]);

  // Build supplement id → name map
  const suppNameMap = new Map(supplementsRows.map((s) => [s.id, s.name]));

  // Derive correlations with supplementName + significance
  const allCorrelations = correlationsRows.map((c) => ({
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

  // Top correlations
  const topCorrelations = [...allCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 5);

  // Join genotypes with GENETIC_KNOWLEDGE
  const allVariants = genotypeRows.flatMap((row) => {
    const knowledge = GENETIC_KNOWLEDGE[row.gene];
    if (!knowledge) return [];
    return [{
      id: row.id,
      gene: row.gene,
      rsid: row.rsid ?? null,
      genotype: row.genotype,
      confidence: knowledge.confidence,
      category: knowledge.category,
      impact: knowledge.impact,
      clinicalImplication: knowledge.clinicalImplication,
      protocolAction: knowledge.protocolAction,
    }];
  });

  // High-impact genetic variants
  const highImpactVariants = allVariants.filter((v) => v.impact === "high");

  // Variant counts by category
  const variantsByCategory = allVariants.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Correlation stats
  const strongCorrelations = allCorrelations.filter((c) => c.significance === "strong");
  const significantCorrelations = allCorrelations.filter((c) => (c.pValue ?? 1) < 0.05);

  return {
    topCorrelations,
    highImpactVariants,
    variantsByCategory,
    stats: {
      totalCorrelations: allCorrelations.length,
      strongCorrelations: strongCorrelations.length,
      significantCorrelations: significantCorrelations.length,
      totalVariants: allVariants.length,
      confirmedVariants: allVariants.filter((v) => v.confidence === "K1").length,
    },
  };
}

export default function InsightsIndex({ loaderData }: Route.ComponentProps) {
  const { topCorrelations, highImpactVariants, variantsByCategory, stats } =
    loaderData;

  return (
    <div>
      <PageHeader
        eyebrow="INSIGHTS"
        title="Insights"
        sub="See which supplements move which metrics, and how your genetics shape your protocol."
      />

      {/* Stats overview */}
      <div className="zt-grid-4" style={{ marginBottom: "var(--gap-xl)" }}>
        {[
          { label: "CORRELATIONS", value: stats.totalCorrelations },
          { label: "STRONG", value: stats.strongCorrelations },
          { label: "GENETIC VARIANTS", value: stats.totalVariants },
          { label: "K1 CONFIRMED", value: stats.confirmedVariants },
        ].map(({ label, value }) => (
          <Card key={label} padding="md" style={{ textAlign: "center" }}>
            <span
              className="zt-readout"
              style={{ fontSize: "var(--text-2xl)", display: "block" }}
            >
              {value}
            </span>
            <span
              className="zt-eyebrow"
              style={{ display: "block", marginTop: 6 }}
            >
              {label}
            </span>
          </Card>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "var(--gap-xl)",
        }}
      >
        {/* Top correlations */}
        <Card padding="lg">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--gap-lg)",
            }}
          >
            <div className="zt-eyebrow">Top correlations</div>
            <Link
              to="/insights/correlations"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              View all
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {topCorrelations.map((corr) => (
              <div
                key={corr.id}
                className="zt-trow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {corr.supplementName}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {corr.metricName} · {corr.lagDays}d lag
                  </div>
                </div>
                <span
                  className="zt-tnum"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color:
                      corr.correlation < 0
                        ? "var(--danger)"
                        : "var(--vital-500)",
                  }}
                >
                  {corr.correlation > 0 ? "+" : ""}
                  {corr.correlation.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "var(--gap-lg)" }}>
            <Link to="/insights/correlations">
              <Button variant="primary" size="sm">
                Open correlations
              </Button>
            </Link>
          </div>
        </Card>

        {/* High-impact variants */}
        <Card padding="lg">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--gap-lg)",
            }}
          >
            <div className="zt-eyebrow">Protocol-defining variants</div>
            <Link
              to="/insights/genetics"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              View all
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {highImpactVariants.slice(0, 5).map((variant) => {
              const confidence = CONFIDENCE_LEVELS[variant.confidence];
              return (
                <div
                  key={variant.id}
                  className="zt-trow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border)",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        {variant.gene}
                      </span>
                      <Badge
                        tone={
                          variant.confidence === "K1" ? "vital" : "energy"
                        }
                      >
                        {confidence.label}
                      </Badge>
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {variant.protocolAction}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {variant.genotype}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Key insights — derived from loader data; no hardcoded health facts */}
      <Card
        padding="lg"
        tone="focus"
        style={{ marginTop: "var(--gap-xl)" }}
      >
        <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
          Key insights
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(() => {
            const items: Array<{ head: string; body: string }> = [];

            // Strongest correlation insight — derived from topCorrelations (sorted by |r| desc)
            if (topCorrelations.length > 0) {
              const corr = topCorrelations[0];
              const sign = corr.correlation >= 0 ? "+" : "";
              items.push({
                head: `${corr.supplementName} → ${corr.metricName}`,
                body: `shows a ${corr.significance} ${corr.direction} correlation (r=${sign}${corr.correlation.toFixed(2)}).`,
              });
            }

            // Second correlation insight if available
            if (topCorrelations.length > 1) {
              const corr2 = topCorrelations[1];
              const sign2 = corr2.correlation >= 0 ? "+" : "";
              items.push({
                head: corr2.supplementName,
                body: `shows a ${corr2.significance} ${corr2.direction} association with ${corr2.metricName} (r=${sign2}${corr2.correlation.toFixed(2)}).`,
              });
            }

            // Genetic narrative — gated on actual DB variant rows; no gene names hardcoded
            if (highImpactVariants.length > 0) {
              const variant = highImpactVariants[0];
              items.push({
                head: variant.gene,
                body: highImpactVariants.length === 1
                  ? `1 protocol-defining variant identified. ${variant.protocolAction}`
                  : `${highImpactVariants.length} protocol-defining variants identified. ${variant.protocolAction}`,
              });
            }

            if (items.length === 0) {
              return (
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  No correlation or variant data yet. Import data to generate insights.
                </div>
              );
            }

            return items.map(({ head, body }) => (
              <div
                key={head}
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>·</span>
                <span>
                  <strong style={{ color: "var(--text)" }}>{head}</strong> {body}
                </span>
              </div>
            ));
          })()}
        </div>
      </Card>

      {/* Variants by category */}
      <Card padding="lg" style={{ marginTop: "var(--gap-lg)" }}>
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-lg)" }}>
          Variants by category
        </div>
        <div className="zt-grid-4">
          {Object.entries(variantsByCategory).map(([category, count]) => {
            const info = VARIANT_CATEGORIES[category as keyof typeof VARIANT_CATEGORIES];
            return (
              <div key={category} style={{ textAlign: "center" }}>
                <span
                  className="zt-readout"
                  style={{ fontSize: "var(--text-xl)", display: "block" }}
                >
                  {count}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: 4,
                  }}
                >
                  {info?.label || category}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

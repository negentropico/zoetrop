import { Link } from "react-router";
import type { Route } from "./+types/index";
import {
  seedCorrelations,
  seedGeneticVariants,
} from "~/lib/seed-data";
import { CONFIDENCE_LEVELS, VARIANT_CATEGORIES } from "~/types/genetics";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Insights Overview - Zoetrop" },
    { name: "description", content: "Data-driven insights from your wellness data" },
  ];
}

export function loader() {
  // Top correlations
  const topCorrelations = [...seedCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 5);

  // High-impact genetic variants
  const highImpactVariants = seedGeneticVariants.filter(
    (v) => v.impact === "high"
  );

  // Variant counts by category
  const variantsByCategory = seedGeneticVariants.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Correlation stats
  const strongCorrelations = seedCorrelations.filter(
    (c) => c.significance === "strong"
  );
  const significantCorrelations = seedCorrelations.filter((c) => c.pValue < 0.05);

  return {
    topCorrelations,
    highImpactVariants,
    variantsByCategory,
    stats: {
      totalCorrelations: seedCorrelations.length,
      strongCorrelations: strongCorrelations.length,
      significantCorrelations: significantCorrelations.length,
      totalVariants: seedGeneticVariants.length,
      confirmedVariants: seedGeneticVariants.filter((v) => v.confidence === "K1")
        .length,
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

      {/* Key insights */}
      <Card
        padding="lg"
        tone="focus"
        style={{ marginTop: "var(--gap-xl)" }}
      >
        <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
          Key insights
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              head: "Methylfolate → Homocysteine",
              body: "shows a strong negative correlation (r=−0.71), supporting the MTHFR protocol action.",
            },
            {
              head: "Magnesium",
              body: "correlates positively with both HRV and sleep performance, suggesting autonomic benefits.",
            },
            {
              head: "FAAH and CYP1A2",
              body: "variants are K3 (inferred) — consider SelfDecode verification.",
            },
          ].map(({ head, body }) => (
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
          ))}
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

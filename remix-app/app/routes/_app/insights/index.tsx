import { Link } from "react-router";
import type { Route } from "./+types/index";
import { requireSubjectCtx } from "~/lib/authz.server";
import {
  getCorrelations,
  getSubjectGenotypes,
  getSupplements,
} from "~/lib/data.server";
import { getGeneticKnowledgeByGene } from "~/lib/corpus.server";
import { type ConfidenceLevel } from "~/types/genetics";
import { ArrowRight } from "lucide-react";
import { Card } from "~/components/ui/Card";
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
    { title: "Insights Overview - Zoetrop" },
    { name: "description", content: "Data-driven insights from your wellness data" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { ctx } = await requireSubjectCtx(request);

  const [correlationsRows, supplementsRows, genotypeRows, geneticKnowledge] = await Promise.all([
    getCorrelations(ctx),
    getSupplements(ctx),
    getSubjectGenotypes(ctx),
    getGeneticKnowledgeByGene(),
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

  // Join genotypes with corpus genetic knowledge
  const allVariants = genotypeRows.flatMap((row) => {
    const knowledge = geneticKnowledge[row.gene];
    if (!knowledge) return [];
    return [{
      id: row.id,
      gene: row.gene,
      rsid: row.rsid ?? null,
      genotype: row.genotype,
      confidence: knowledge.confidence as ConfidenceLevel,
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

  // Variant counts by confidence + compact rows for the genetics card
  // (round-4 insights section dashboard)
  const variantsByConfidence = allVariants.reduce((acc, v) => {
    acc[v.confidence] = (acc[v.confidence] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const variantRows = allVariants.slice(0, 6).map((v) => ({
    id: v.id,
    gene: v.gene,
    rsid: v.rsid,
    genotype: v.genotype,
    confidence: v.confidence,
  }));

  // Correlation stats
  const strongCorrelations = allCorrelations.filter((c) => c.significance === "strong");
  const significantCorrelations = allCorrelations.filter((c) => (c.pValue ?? 1) < 0.05);

  return {
    topCorrelations,
    highImpactVariants,
    variantsByCategory,
    variantsByConfidence,
    variantRows,
    stats: {
      totalCorrelations: allCorrelations.length,
      strongCorrelations: strongCorrelations.length,
      significantCorrelations: significantCorrelations.length,
      totalVariants: allVariants.length,
      confirmedVariants: allVariants.filter((v) => v.confidence === "K1").length,
    },
  };
}

// Confidence-level mono colors (shared vocabulary with /insights/genetics)
const CONF_COLOR: Record<string, string> = {
  K1: "var(--vital-500, var(--vital))",
  K2: "var(--accent)",
  K3: "var(--energy-500, var(--energy))",
  K4: "var(--text-muted)",
};

// Significance mono colors (shared vocabulary with /insights/correlations)
const SIG_COLOR: Record<string, string> = {
  strong: "var(--vital-500, var(--vital))",
  moderate: "var(--energy-500, var(--energy))",
  weak: "var(--text-muted)",
  none: "var(--text-faint)",
};

export default function InsightsIndex({ loaderData }: Route.ComponentProps) {
  const { topCorrelations, highImpactVariants, variantsByConfidence, variantRows, stats } =
    loaderData;

  const strongest = topCorrelations[0];
  const top4 = topCorrelations.slice(0, 4);
  const confidenceLevels: ConfidenceLevel[] = ["K1", "K2", "K3", "K4"];

  return (
    <div>
      <PageHeader
        eyebrow="INSIGHTS"
        title="Insights"
        sub="What your markers say about each other — and what your genes say about the protocol."
      />

      {/* Stat strip — round-4 section dashboard */}
      <section className="zt-section">
        <Card padding="lg">
          <div className="zt-stat-strip">
            <div className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Pairs analyzed</div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {stats.totalCorrelations}
              </div>
            </div>
            <div className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Strong</div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {stats.strongCorrelations}
              </div>
            </div>
            <div className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Strongest pair</div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {strongest
                  ? `${strongest.correlation > 0 ? "+" : ""}${strongest.correlation.toFixed(2)}`
                  : "—"}
              </div>
              {strongest && (
                <div className="zt-eyebrow" style={{ marginTop: 5, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                  {strongest.supplementName} ↔ {strongest.metricName}
                </div>
              )}
            </div>
            <div className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Variants tracked</div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {stats.totalVariants}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <div className="zt-grid-2">
        {/* Strongest correlations — top 4 by |r|, rows link through */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-lg)" }}>
            <div className="zt-eyebrow">Strongest correlations</div>
            <Link to="/insights/correlations" className="zt-link" style={{ fontSize: "var(--text-xs)" }}>
              All correlations <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
          <Card padding="none">
            {top4.map((corr, i) => (
              <Link key={corr.id} to="/insights/correlations" style={{ textDecoration: "none", display: "block" }}>
                <div
                  className="zt-mrow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--gap-lg)",
                    padding: "var(--gap-row) var(--gap-card)",
                    borderBottom: i < top4.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {corr.supplementName} <span style={{ color: "var(--text-faint)" }}>↔</span> {corr.metricName}
                  </div>
                  <span className="zt-eyebrow" style={{ color: SIG_COLOR[corr.significance] ?? "var(--text-muted)" }}>
                    {corr.significance}
                  </span>
                  <span className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--ink)", minWidth: 52, textAlign: "right" }}>
                    {corr.correlation > 0 ? "+" : ""}
                    {corr.correlation.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </Card>
        </section>

        {/* Genetics — confidence-dot counts header + per-gene rows */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-lg)" }}>
            <div className="zt-eyebrow">Genetics</div>
            <Link to="/insights/genetics" className="zt-link" style={{ fontSize: "var(--text-xs)" }}>
              All variants <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
          <Card padding="none">
            <div style={{ display: "flex", gap: "var(--gap-xl)", flexWrap: "wrap", padding: "var(--gap-row) var(--gap-card)", borderBottom: "1px solid var(--border)" }}>
              {confidenceLevels.map((k) =>
                (variantsByConfidence[k] || 0) > 0 ? (
                  <span key={k} className="zt-tnum" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: CONF_COLOR[k], display: "inline-block" }} />
                    {variantsByConfidence[k]} {k}
                  </span>
                ) : null
              )}
            </div>
            {variantRows.map((g, i) => (
              <Link key={g.id} to="/insights/genetics" style={{ textDecoration: "none", display: "block" }}>
                <div
                  className="zt-mrow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--gap-lg)",
                    padding: "var(--gap-row) var(--gap-card)",
                    borderBottom: i < variantRows.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--ink)", flex: "0 0 110px" }}>
                    {g.gene}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[g.rsid, g.genotype].filter(Boolean).join(" · ")}
                  </span>
                  <span className="zt-eyebrow" style={{ color: CONF_COLOR[g.confidence] ?? "var(--text-muted)" }}>
                    {g.confidence}
                  </span>
                </div>
              </Link>
            ))}
            {stats.totalVariants > variantRows.length && (
              <div style={{ padding: "var(--gap-row) var(--gap-card)", borderTop: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                +{stats.totalVariants - variantRows.length} MORE VARIANTS
              </div>
            )}
          </Card>
        </section>
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

      {/* Variants-by-category breakdown moved to /insights/genetics (the
          category filter there carries the same counts) — round-4 fold-in
          keeps this overview to the stat strip + two link-through cards. */}
    </div>
  );
}

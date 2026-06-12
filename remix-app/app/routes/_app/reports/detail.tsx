/**
 * detail.tsx — Frozen-snapshot report render (/reports/:reportId)
 *
 * Security:
 *   T-06-IDOR/D-18: assertSubjectAccess gates the read — cross-tenant → 403 (CR-01)
 *
 * D-14: Recommendations grouped by body system/category (CATEGORY_INFO + VARIANT_CATEGORIES).
 * D-15: Flagged actionable items surfaced in body; full panel available in AppendixDisclosure.
 * D-17: Frozen snapshot rendered unchanged — no mutation.
 * RPT-02: K-level inline in the visible body via RecommendationBlock.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Route } from "./+types/detail";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getReport } from "~/lib/data.server";
import { CATEGORY_INFO } from "~/types/metrics";
import { VARIANT_CATEGORIES } from "~/types/genetics";
import type { GradedRecommendation, ReportSnapshot } from "~/types/report";
import type { KLevel } from "~/components/ui/KGradeBadge";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { KGradeBadge } from "~/components/ui/KGradeBadge";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { RecommendationBlock } from "~/components/ui/RecommendationBlock";
import type { Status } from "~/components/ui/StatusBadge";

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
  const generatedAt = data?.report?.createdAt
    ? new Date(data.report.createdAt as string | Date).toLocaleDateString()
    : "";
  return [
    { title: `Report${generatedAt ? ` — ${generatedAt}` : ""} - Zoetrop` },
    { name: "description", content: "Confidence-graded protocol report" },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  // D-18/T-06-IDOR: Authentication required
  const { user } = await requireUser(request);

  const reportId = params.reportId;
  if (!reportId) throw new Response("Not found", { status: 404 });

  const report = await getReport(reportId);
  if (!report) throw new Response("Not found", { status: 404 });

  // D-18/T-06-IDOR: assertSubjectAccess — 403 for cross-tenant report read (CR-01)
  assertSubjectAccess(user, { tenantId: report.tenantId }, user.tenantId!);

  return { report };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convert evidenceTier lowercase ('k1'–'k4') to KLevel ('K1'–'K4') */
function toKLevel(tier: string): KLevel {
  return tier.toUpperCase() as KLevel;
}

/** Group recommendations by category */
function groupByCategory(
  recs: GradedRecommendation[]
): Record<string, GradedRecommendation[]> {
  return recs.reduce(
    (acc, rec) => {
      const cat = rec.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(rec);
      return acc;
    },
    {} as Record<string, GradedRecommendation[]>
  );
}

/** Count recommendations by K-level */
function kBreakdown(
  recs: GradedRecommendation[]
): Record<KLevel, number> {
  const counts: Record<KLevel, number> = { K1: 0, K2: 0, K3: 0, K4: 0 };
  for (const rec of recs) {
    const k = toKLevel(rec.evidenceTier);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ReportDetail({ loaderData }: Route.ComponentProps) {
  const { report } = loaderData;
  const snapshot = report.snapshot as unknown as ReportSnapshot;
  const [appendixOpen, setAppendixOpen] = useState(false);

  const generatedDate = report.createdAt
    ? new Date(report.createdAt as string | Date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown date";

  const recommendations = snapshot.recommendations;
  const byCategory = groupByCategory(recommendations);
  const kCounts = kBreakdown(recommendations);
  const categories = Object.keys(byCategory);

  const appendixMetrics = snapshot.appendix.metricStatuses;
  const appendixGenotypes = snapshot.appendix.genotypeList;

  return (
    <div>
      <PageHeader
        eyebrow="CONFIDENCE-GRADED REPORT"
        title="Protocol report"
        sub={`Generated ${generatedDate}`}
      />

      {/* ReportSummaryCard (Pattern 7) */}
      <Card
        elevation="sm"
        padding="md"
        style={{ marginBottom: "var(--gap-xl)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "var(--gap-md)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="zt-readout"
              style={{
                fontSize: "var(--text-2xl)",
                display: "block",
                marginBottom: 4,
              }}
            >
              {recommendations.length}
            </div>
            <div className="zt-eyebrow">FINDINGS</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              className="zt-readout"
              style={{
                fontSize: "var(--text-2xl)",
                display: "block",
                marginBottom: 4,
              }}
            >
              {categories.length}
            </div>
            <div className="zt-eyebrow">CATEGORIES</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              className="zt-readout"
              style={{
                fontSize: "var(--text-2xl)",
                display: "block",
                marginBottom: 4,
              }}
            >
              {snapshot.inputSummary.metricCount}
            </div>
            <div className="zt-eyebrow">METRICS</div>
          </div>
        </div>

        {/* K breakdown row */}
        {recommendations.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            {(["K1", "K2", "K3", "K4"] as KLevel[]).map((k) => {
              const count = kCounts[k];
              if (!count) return null;
              return (
                <div
                  key={k}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <KGradeBadge level={k} variant="chip" />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Flagged findings body (Pattern 6) */}
      <div className="zt-eyebrow" style={{ marginBottom: 24 }}>
        FINDINGS THAT NEED A LOOK
      </div>

      {recommendations.length === 0 ? (
        <Card padding="lg" style={{ marginBottom: "var(--gap-xl)" }}>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-base)",
              margin: 0,
            }}
          >
            All measured values are within optimal range. No recommendations at
            this time.
          </p>
        </Card>
      ) : (
        <div style={{ marginBottom: "var(--gap-xl)" }}>
          {categories.map((cat) => {
            const recs = byCategory[cat];
            // Try to find category label from CATEGORY_INFO or VARIANT_CATEGORIES
            const metricCat =
              cat in CATEGORY_INFO
                ? CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO]
                : null;
            const variantCat =
              cat in VARIANT_CATEGORIES
                ? VARIANT_CATEGORIES[cat as keyof typeof VARIANT_CATEGORIES]
                : null;
            const catLabel =
              metricCat?.label ?? variantCat?.label ?? cat;

            return (
              <div key={cat} style={{ marginBottom: 32 }}>
                {/* Category section header (Pattern 5) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <span className="zt-eyebrow">
                    {catLabel.toUpperCase()}
                  </span>
                </div>

                {/* RecommendationBlocks (RPT-02: inline K body) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  {recs.map((rec) => (
                    <RecommendationBlock
                      key={rec.id}
                      kLevel={toKLevel(rec.evidenceTier)}
                      recommendationText={rec.recommendationText}
                      source={rec.source}
                      metricName={rec.sourceContext.metricName}
                      metricStatus={
                        rec.sourceContext.metricStatus
                          ? (rec.sourceContext.metricStatus as Status)
                          : undefined
                      }
                      geneName={rec.sourceContext.gene}
                      genotype={rec.sourceContext.genotype}
                      detectionConfidence={rec.sourceContext.detectionConfidence}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AppendixDisclosure (Pattern 6 / D-15) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 24,
          marginBottom: "var(--gap-xl)",
        }}
      >
        <Button
          variant="ghost"
          onClick={() => setAppendixOpen((o) => !o)}
          aria-expanded={appendixOpen}
          aria-controls="appendix-panel"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          {appendixOpen ? (
            <>
              Hide full panel <ChevronUp size={16} aria-hidden="true" />
            </>
          ) : (
            <>
              Show full panel <ChevronDown size={16} aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      {/* AppendixPanel — full metric list + all variants */}
      {appendixOpen && (
        <div
          id="appendix-panel"
          style={{ marginBottom: "var(--gap-xl)" }}
        >
          <Card padding="md">
            {/* Metrics section */}
            <div
              className="zt-eyebrow"
              style={{ marginBottom: 16 }}
            >
              ALL METRICS · {appendixMetrics.length} TOTAL
            </div>

            {appendixMetrics.length === 0 ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  margin: "0 0 24px",
                }}
              >
                All metrics are within optimal range.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr auto auto",
                    gap: "8px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    paddingBottom: 8,
                    borderBottom: "1px solid var(--border)",
                    marginBottom: 4,
                  }}
                >
                  <span>Metric</span>
                  <span>Category</span>
                  <span>Value</span>
                  <span>Status</span>
                </div>
                {appendixMetrics.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto auto",
                      gap: "8px 16px",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--surface-sunken)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-text)",
                        fontSize: "var(--text-sm)",
                        color: "var(--ink)",
                        fontWeight: 500,
                      }}
                    >
                      {m.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-text)",
                        fontSize: "var(--text-sm)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {m.category}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-sm)",
                        color: "var(--ink)",
                      }}
                    >
                      {m.value} {m.unit}
                    </span>
                    <StatusBadge status={m.status as Status} />
                  </div>
                ))}
              </div>
            )}

            {/* Genotypes section */}
            {appendixGenotypes.length > 0 && (
              <>
                <div
                  className="zt-eyebrow"
                  style={{ marginBottom: 16, marginTop: 8 }}
                >
                  ALL VARIANTS · {appendixGenotypes.length} TOTAL
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto auto 1fr",
                      gap: "8px 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--border)",
                      marginBottom: 4,
                    }}
                  >
                    <span>Gene</span>
                    <span>Genotype</span>
                    <span>Source</span>
                  </div>
                  {appendixGenotypes.map((g, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto auto 1fr",
                        gap: "8px 16px",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--surface-sunken)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-text)",
                          fontSize: "var(--text-sm)",
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {g.gene}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-sm)",
                          color: "var(--ink)",
                        }}
                      >
                        {g.genotype}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-text)",
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {g.assaySource ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Corpus version footnote */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: "var(--gap-xl)",
        }}
      >
        Corpus version: {snapshot.corpusVersion} · Generated {generatedDate}
      </div>
    </div>
  );
}

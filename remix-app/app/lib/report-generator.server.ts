/**
 * report-generator.server.ts — Deterministic report generation (RPT-01/D-13/D-17).
 *
 * Reads committed subject metrics + genotypes (via data.server),
 * evaluates the pure engine (classifyMetricStatus + mapVariantToProtocol)
 * against corpus rules (corpus.server), assembles a typed ReportSnapshot,
 * freezes it with CORPUS_VERSION, and writes a tenant/subject-scoped reports row.
 *
 * D-13: NO LLM in this path. Deterministic assembly from corpus text only.
 * D-17: Frozen snapshot — never mutated. Re-generation = NEW row.
 * D-18: assertSubjectAccess is enforced by the calling route (generate.tsx + detail.tsx).
 * D-19: strict TypeScript, no `any`.
 * ENG-03: metric-rule evaluation path lives inline here and is unit-tested in
 *          tests/lib/report-generator.test.ts.
 */

import { getDb } from "~/lib/db.server";
import { reports } from "../../db/schema";
import {
  classifyMetricStatus,
  mapVariantToProtocol,
} from "~/lib/engine.server";
import {
  CORPUS_VERSION,
  getVariantMaps,
  getMetricRules,
} from "~/lib/corpus.server";
import {
  getMetrics,
  getSubjectGenotypes,
} from "~/lib/data.server";
import type { GradedRecommendation, ReportSnapshot } from "~/types/report";

// ── Metric rule → GradedRecommendation mapper ────────────────────────────────

/**
 * Maps a metricProtocolMap rule row + the triggering metric to a GradedRecommendation.
 * ENG-03: source = 'metric', evidenceTier from rule, sourceContext carries metricName/status/value/unit.
 */
function toMetricGradedRec(
  rule: {
    id: number;
    metricName: string;
    conditionStatus: string;
    category: string;
    evidenceTier: "k1" | "k2" | "k3" | "k4";
    recommendationText: string;
    evidenceCitation: string | null | undefined;
    actionDetail?: string | null;
    corpusVersion: string;
  },
  metric: {
    name: string;
    value: number;
    unit: string;
  },
  status: "optimal" | "borderline" | "deficient" | "excess"
): GradedRecommendation {
  return {
    id: String(rule.id),
    source: "metric",
    category: rule.category,
    evidenceTier: rule.evidenceTier,
    recommendationText: rule.recommendationText,
    ...(rule.evidenceCitation != null && { evidenceCitation: rule.evidenceCitation }),
    sourceContext: {
      metricName: metric.name,
      metricStatus: status,
      metricValue: metric.value,
      metricUnit: metric.unit,
    },
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Deterministically assembles a confidence-graded report snapshot from the
 * subject's committed metrics + genotypes and the corpus rules, then writes
 * a frozen, versioned reports row.
 *
 * D-16: reads ALL committed metric categories (bloodwork, autonomic/WHOOP,
 *        body-comp/DEXA, etc.) — getMetrics with no category filter.
 * D-17: never mutates existing rows; re-generation = NEW row.
 * D-13: no LLM call; pure engine + corpus text assembly.
 *
 * @param tenantId   - The tenant scoping all reads/writes
 * @param subjectId  - The subject whose data is evaluated
 * @param generatedBy - The user.id who triggered generation (for audit trail)
 * @returns          - The UUID of the newly-written reports row
 */
export async function generateReport(
  tenantId: string,
  subjectId: string,
  generatedBy: string
): Promise<string> {
  // 1. Read subject data (PHI-adjacent — scoped by tenant/subject)
  //    D-16: all committed metric categories, no category filter
  const [allMetrics, genotypes, variantMaps, metricRules] = await Promise.all([
    getMetrics(tenantId, subjectId),
    getSubjectGenotypes(tenantId, subjectId),
    getVariantMaps(),
    getMetricRules(),
  ]);

  // 2. Engine evaluation — metric-rule path (ENG-03)
  //    For each metric: classify status; if non-optimal, find matching rules.
  const metricRecommendations: GradedRecommendation[] = [];
  let flaggedMetricCount = 0;

  for (const metric of allMetrics) {
    // Build the Metric shape expected by classifyMetricStatus
    const engineMetric = {
      value: metric.value,
      optimalRange:
        metric.optimalMin != null && metric.optimalMax != null
          ? { min: metric.optimalMin, max: metric.optimalMax }
          : undefined,
      referenceRange:
        metric.referenceMin != null && metric.referenceMax != null
          ? { min: metric.referenceMin, max: metric.referenceMax }
          : undefined,
    } as Parameters<typeof classifyMetricStatus>[0];

    const status = classifyMetricStatus(engineMetric);

    if (status !== "optimal") {
      // Find all metricProtocolMap rules that match this metric + status
      const matchingRules = metricRules.filter(
        (r) =>
          r.metricName === metric.name &&
          (r.conditionStatus === status || r.conditionStatus === "any_non_optimal")
      );

      if (matchingRules.length > 0) {
        flaggedMetricCount++;
        metricRecommendations.push(
          ...matchingRules.map((rule) =>
            toMetricGradedRec(rule, metric, status)
          )
        );
      }
    }
  }

  // 3. Engine evaluation — variant path (mapVariantToProtocol)
  //    Transform the DB genotype rows to SubjectGenotype shape for the engine.
  const subjectGenotypes = genotypes.map((g) => ({
    gene: g.gene,
    genotype: g.genotype,
    assaySource: g.assaySource,
  }));

  //    Transform the corpus variant map rows to VariantMap shape for the engine.
  //    getVariantMaps() returns joined rows: { variant_protocol_map, genetic_variants }
  const engineVariantMaps = variantMaps.map((row) => ({
    id: row.variant_protocol_map.id,
    gene: row.genetic_variants.gene,
    genotypePattern: row.genetic_variants.genotypePattern ?? null,
    category: row.genetic_variants.category,
    evidenceTier: row.variant_protocol_map.evidenceTier,
    recommendationText: row.variant_protocol_map.recommendationText,
    evidenceCitation: row.variant_protocol_map.evidenceCitation,
  }));

  const variantRecommendations = mapVariantToProtocol(
    subjectGenotypes,
    engineVariantMaps
  );

  // 4. Assemble frozen snapshot (D-17)
  const snapshot: ReportSnapshot = {
    schemaVersion: 1,
    corpusVersion: CORPUS_VERSION,
    generatedAt: new Date().toISOString(),
    subjectId,
    tenantId,
    inputSummary: {
      metricCount: allMetrics.length,
      genotypeCount: genotypes.length,
      flaggedMetricCount,
    },
    recommendations: [...metricRecommendations, ...variantRecommendations],
    appendix: {
      metricStatuses: allMetrics.map((m) => {
        const mEngineMetric = {
          value: m.value,
          optimalRange:
            m.optimalMin != null && m.optimalMax != null
              ? { min: m.optimalMin, max: m.optimalMax }
              : undefined,
          referenceRange:
            m.referenceMin != null && m.referenceMax != null
              ? { min: m.referenceMin, max: m.referenceMax }
              : undefined,
        } as Parameters<typeof classifyMetricStatus>[0];
        return {
          name: m.name,
          category: m.category,
          status: classifyMetricStatus(mEngineMetric),
          value: m.value,
          unit: m.unit,
        };
      }),
      genotypeList: genotypes.map((g) => ({
        gene: g.gene,
        genotype: g.genotype,
        assaySource: g.assaySource,
      })),
    },
  };

  // 5. Write reports row — D-17: INSERT only, never UPDATE
  const reportId = crypto.randomUUID();
  const db = getDb();
  await db.insert(reports).values({
    id: reportId,
    tenantId,
    subjectId,
    generatedBy,
    corpusVersion: CORPUS_VERSION,
    snapshot,
    createdAt: new Date(),
  });

  return reportId;
}

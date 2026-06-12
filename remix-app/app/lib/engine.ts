/**
 * engine.ts — Pure, dependency-free decision engine (ENG-01, D-01).
 *
 * The .server.ts suffix is bundle-hygiene only (Vite client-bundle convention).
 * This module imports nothing server-only and is callable from a bare Node/vitest
 * context (D-01 / ROADMAP SC2: "callable from a Node.js script with no server context").
 *
 * date-fns is a pure computation library with no server or framework dependencies.
 * Its presence is consistent with D-01 which prohibits Drizzle/Remix imports
 * specifically (see RESEARCH.md Pitfall 6).
 *
 * Zero imports from: drizzle-orm, react-router, @react-router/*, @neondatabase/*
 */

import { differenceInDays, parseISO } from "date-fns";
import type { Metric, MetricStatus } from "~/types/metrics";
import { CESSATION_PHASES } from "~/types/protocol";
import type { SubjectGenotype, VariantMap, GradedRecommendation } from "~/types/report";

// =============================================================================
// METRIC STATUS CLASSIFICATION
// Extracted from app/lib/metrics.ts:72-81 (renamed from getMetricStatus)
// =============================================================================

/**
 * Classify a metric's value against its optimal and reference ranges.
 * Returns "optimal" | "borderline" | "deficient" | "excess".
 * Falls back to "optimal" when no referenceRange is defined (defensive quirk —
 * even if the value sits outside optimalRange).
 */
export function classifyMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange } = metric;
  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) return "optimal";
  if (referenceRange) {
    if (value < referenceRange.min) return "deficient";
    if (value > referenceRange.max) return "excess";
    return "borderline";
  }
  return "optimal";
}

// =============================================================================
// CESSATION ENGINE FUNCTIONS
// Extracted from app/lib/protocol-data.ts:35-51 (getCessationPhase renamed from getCurrentCessationPhase)
// =============================================================================

/**
 * Calculate current cessation day from the given start date ISO string.
 * @param startDateIso - The cessation start date as an ISO 8601 string
 * @param now - The reference "now" date (defaults to current date; injectable for testing)
 */
export function getCessationDay(startDateIso: string, now: Date = new Date()): number {
  return differenceInDays(now, parseISO(startDateIso));
}

/**
 * Get the cessation phase for the given day count.
 * Clamps to first phase before start, last phase past final range.
 */
export function getCessationPhase(day: number): typeof CESSATION_PHASES[0] {
  const phase = CESSATION_PHASES.find(
    (p) => day >= p.dayRange.start && day <= p.dayRange.end
  );
  if (phase) return phase;
  return day < CESSATION_PHASES[0].dayRange.start
    ? CESSATION_PHASES[0]
    : CESSATION_PHASES[CESSATION_PHASES.length - 1];
}

// =============================================================================
// PEARSON CORRELATION
// Extracted from app/lib/correlations.ts:15-32 (renamed from calculatePearsonCorrelation)
// =============================================================================

/**
 * Compute the Pearson correlation coefficient for two equal-length numeric arrays.
 * Returns 0 for empty, mismatched-length, or zero-variance inputs.
 */
export function computePearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// =============================================================================
// VARIANT → PROTOCOL MAPPING (new in Phase 6)
// Consumes non-PHI corpus data (VariantMap[]) and PHI-adjacent subject genotypes
// =============================================================================

/**
 * Normalize genotype notation: sort alleles alphabetically within slash (Pitfall 7).
 * Ensures "A/G" and "G/A" are treated as identical heterozygous variants.
 */
function normalizeGenotype(g: string): string {
  const parts = g.split('/');
  if (parts.length === 2) return parts.sort().join('/');
  return g;
}

/**
 * Derive detection confidence from assay source annotation (D-09).
 * - 23andMe → 'verified'
 * - SelfDecode / 'inferred' → 'inferred'
 * - null → undefined (no SubBadge rendered in UI)
 */
function inferDetectionConfidence(
  assaySource: string | null
): 'verified' | 'inferred' | undefined {
  if (!assaySource) return undefined;
  const lower = assaySource.toLowerCase();
  if (lower.includes('23andme')) return 'verified';
  if (lower.includes('selfdecode') || lower.includes('inferred')) return 'inferred';
  // Default for other known assay sources
  return 'verified';
}

/**
 * Map a subject's genotypes against the corpus variant protocol map to produce
 * a graded recommendation set.
 *
 * Matching rules:
 *   1. Gene must match exactly.
 *   2. If genotypePattern is null → gene-level fallback (match any genotype for that gene).
 *   3. If genotypePattern is set → normalize both sides before comparing (Pitfall 7).
 *
 * @param genotypes - Subject's reported genotypes (PHI-adjacent, scoped by caller)
 * @param variantMaps - Corpus variant protocol map rows (non-PHI population knowledge)
 */
export function mapVariantToProtocol(
  genotypes: SubjectGenotype[],
  variantMaps: VariantMap[]
): GradedRecommendation[] {
  const recommendations: GradedRecommendation[] = [];

  for (const genotype of genotypes) {
    const normalizedSubjectGt = normalizeGenotype(genotype.genotype);

    const matches = variantMaps.filter(
      (vm) =>
        vm.gene === genotype.gene &&
        (vm.genotypePattern === null ||
          normalizeGenotype(vm.genotypePattern) === normalizedSubjectGt)
    );

    for (const match of matches) {
      const detectionConfidence = inferDetectionConfidence(genotype.assaySource);

      recommendations.push({
        id: String(match.id),
        source: 'variant',
        category: match.category,
        evidenceTier: match.evidenceTier,
        recommendationText: match.recommendationText,
        ...(match.evidenceCitation != null && { evidenceCitation: match.evidenceCitation }),
        sourceContext: {
          gene: genotype.gene,
          genotype: genotype.genotype,
          ...(detectionConfidence !== undefined && { detectionConfidence }),
        },
      });
    }
  }

  return recommendations;
}

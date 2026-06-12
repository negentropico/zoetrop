// Phase 6: Confidence-Graded Report Type Contracts
// ENG-01 / D-19: strict TypeScript, no `any`, no Drizzle/Remix imports.
//
// These interfaces define the shape consumed by the corpus, generator, and UI plans.
// All union members are lowercase string literals.

/**
 * Evidence tier for a finding-to-action link.
 * Visible K value: external/published evidence strength (D-07).
 * Distinct from detection-confidence (verified/inferred) in GradedRecommendation.sourceContext.
 */
export type EvidenceTier = 'k1' | 'k2' | 'k3' | 'k4';

/**
 * Subject genotype input — PHI-adjacent, scoped by tenant/subject at the call site.
 * Mirrors a row from subject_genotypes joined to its context.
 */
export interface SubjectGenotype {
  /** Gene symbol, e.g. "COMT", "MTHFR" */
  gene: string;
  /** Slash-notation genotype, e.g. "A/G", "C/T" */
  genotype: string;
  /** Assay source string (e.g. "23andMe", "SelfDecode") or null */
  assaySource: string | null;
}

/**
 * Variant protocol map entry — non-PHI corpus row (variantProtocolMap joined to geneticVariants).
 * Input to mapVariantToProtocol in engine.ts.
 */
export interface VariantMap {
  /** variantProtocolMap row ID */
  id: number;
  /** Gene symbol from geneticVariants parent */
  gene: string;
  /**
   * Genotype pattern for this mapping, e.g. "G/A" or null for gene-level fallback.
   * Engine normalizes allele order before matching (Pitfall 7).
   */
  genotypePattern: string | null;
  /** Body system category for grouping in report */
  category: string;
  /** Evidence tier for this finding-to-action link */
  evidenceTier: EvidenceTier;
  /** Corpus recommendation text (non-PHI; no subject-specific values) */
  recommendationText: string;
  /** Optional citation / reference */
  evidenceCitation?: string | null;
}

/**
 * A single graded recommendation in the report body.
 * Assembled by the engine; stored in ReportSnapshot.recommendations[].
 */
export interface GradedRecommendation {
  /** Source row ID (variantProtocolMap.id or metricProtocolMap.id as string) */
  id: string;
  /** Originating rule type */
  source: 'variant' | 'metric';
  /** Body system category for grouping (from corpus) */
  category: string;
  /** Evidence tier of this finding-to-action link */
  evidenceTier: EvidenceTier;
  /** Corpus recommendation text — UI assembles the K-grade prefix */
  recommendationText: string;
  /** Optional evidence citation */
  evidenceCitation?: string;
  /**
   * Source context for the RecommendationBlock header.
   * Variant-sourced fields: gene, genotype, detectionConfidence.
   * Metric-sourced fields: metricName, metricStatus, metricValue, metricUnit.
   */
  sourceContext: {
    // Variant-sourced (D-09)
    gene?: string;
    genotype?: string;
    /** Secondary annotation — NOT the headline evidence tier (D-09) */
    detectionConfidence?: 'verified' | 'inferred';
    // Metric-sourced
    metricName?: string;
    metricStatus?: 'optimal' | 'borderline' | 'deficient' | 'excess';
    metricValue?: number;
    metricUnit?: string;
  };
}

/**
 * Frozen versioned report snapshot.
 * Stored as JSONB in the reports table. Never mutated after write (D-17).
 * schemaVersion is a literal — bump when the shape changes.
 */
export interface ReportSnapshot {
  /** Snapshot schema version — literal 1 (bump on breaking shape change) */
  schemaVersion: 1;
  /** Corpus version stamp, e.g. "v1.0-owner-2026-06" */
  corpusVersion: string;
  /** ISO 8601 generation timestamp */
  generatedAt: string;
  /** Subject reference ID (not display name) */
  subjectId: string;
  /** Tenant reference ID */
  tenantId: string;
  /** Summary of inputs used to generate the report */
  inputSummary: {
    metricCount: number;
    genotypeCount: number;
    flaggedMetricCount: number;
  };
  /** Graded recommendations in report body (D-15: flagged-in-body, full-data-available) */
  recommendations: GradedRecommendation[];
  /** Complete panel data for appendix (D-15) */
  appendix: {
    metricStatuses: Array<{
      name: string;
      category: string;
      status: 'optimal' | 'borderline' | 'deficient' | 'excess';
      value: number;
      unit: string;
    }>;
    genotypeList: Array<{
      gene: string;
      genotype: string;
      assaySource: string | null;
    }>;
  };
}

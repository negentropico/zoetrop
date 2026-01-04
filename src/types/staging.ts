/**
 * Staging Format Types
 *
 * Defines the intermediate format for importing health metrics from various sources.
 * This format serves as the canonical import schema - all parsers output this format,
 * and the importer consumes it to create Metric records.
 */

import type { MetricCategory, MetricStatus } from './metrics';

/**
 * Source information for imported data
 */
export interface StagingSource {
  /** Original file or data source */
  file: string;
  /** Type of source: vault, csv, json, manual */
  type: 'vault' | 'csv' | 'json' | 'manual' | 'api';
  /** When the source data was collected/measured */
  collectedAt: string;
  /** When this staging file was generated */
  generatedAt: string;
  /** Optional version or milestone identifier */
  version?: string;
  /** Notes about data currency or gaps */
  notes?: string[];
}

/**
 * Range specification for a metric
 */
export interface StagingRange {
  min?: number;
  max?: number;
  /** For asymmetric ranges like "< 100" or "> 40" */
  operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  value?: number;
}

/**
 * Individual metric in staging format
 */
export interface StagingMetric {
  /** Metric name (e.g., "Vitamin D", "HRV", "Total Cholesterol") */
  name: string;
  /** Numeric value */
  value: number;
  /** Unit of measurement (e.g., "ng/mL", "mg/dL", "ms", "%") */
  unit: string;
  /** Primary category */
  category: MetricCategory;
  /** Optional subcategory for finer classification */
  subcategory?: string;
  /** Status assessment from source */
  status: MetricStatus | 'unknown';
  /** Reference range (normal clinical range) */
  referenceRange?: StagingRange;
  /** Optimal range (health optimization target) */
  optimalRange?: StagingRange;
  /** Whether higher or lower values are better */
  improvement?: 'higher is better' | 'lower is better' | 'target range';
  /** Priority level from source (e.g., "CRITICAL", "High", "Medium", "Low") */
  priority?: string;
  /** Additional context or notes */
  notes?: string[];
  /** Previous value for trend comparison */
  previousValue?: number;
  /** Previous measurement date */
  previousDate?: string;
  /** Change from previous (absolute or percentage) */
  change?: {
    absolute?: number;
    percent?: number;
    direction: 'up' | 'down' | 'stable';
  };
  /** Target values from protocol */
  targets?: {
    q1?: number;
    q2?: number;
    annual?: number;
  };
}

/**
 * Category section in staging format
 */
export interface StagingCategory {
  /** Category identifier */
  category: MetricCategory;
  /** Human-readable category name */
  label: string;
  /** Description of this category's data */
  description?: string;
  /** Source file section (e.g., "## Metabolic Panel") */
  sourceSection?: string;
  /** All metrics in this category */
  metrics: StagingMetric[];
}

/**
 * Complete staging file format
 */
export interface StagingFile {
  /** Schema version for forward compatibility */
  schemaVersion: '1.0';
  /** Source information */
  source: StagingSource;
  /** Summary statistics */
  summary: {
    totalMetrics: number;
    byCategory: Record<MetricCategory, number>;
    byStatus: Record<MetricStatus | 'unknown', number>;
  };
  /** Validation results */
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  /** Categories with their metrics */
  categories: StagingCategory[];
}

/**
 * Result of parsing source data into staging format
 */
export interface StagingParseResult {
  success: boolean;
  data?: StagingFile;
  errors: string[];
  warnings: string[];
}

/**
 * Result of importing staging data into metrics
 */
export interface StagingImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Status mapping from common source formats
 */
export const STATUS_MAPPINGS: Record<string, MetricStatus> = {
  // Emoji-based (from vault)
  '✅': 'optimal',
  '⚠️': 'borderline',
  '🔴': 'deficient',
  '🟠': 'excess',
  // Text-based
  'optimal': 'optimal',
  'good': 'optimal',
  'excellent': 'optimal',
  'normal': 'optimal',
  'adequate': 'optimal',
  'target met': 'optimal',
  'exceeded': 'optimal',
  'borderline': 'borderline',
  'above': 'borderline',
  'below': 'borderline',
  'elevated': 'borderline',
  'low': 'deficient',
  'high': 'excess',
  'deficient': 'deficient',
  'critical': 'deficient',
};

/**
 * Category mappings from source section names
 */
export const CATEGORY_MAPPINGS: Record<string, MetricCategory> = {
  // Blood work sections
  'metabolic panel': 'metabolic',
  'metabolic': 'metabolic',
  'lipid panel': 'lipids',
  'lipids': 'lipids',
  'nutrient status': 'vitamins', // Split between vitamins/minerals
  'nutrients': 'vitamins',
  'hormonal panel': 'hormones',
  'hormones': 'hormones',
  'hematology': 'hematology',
  // Body composition
  'body composition': 'bodyComposition',
  'dexa': 'bodyComposition',
  'adipose': 'bodyComposition',
  'lean': 'bodyComposition',
  // Physiological
  'physiological': 'autonomic',
  'whoop': 'autonomic',
  'hrv': 'autonomic',
  'recovery': 'autonomic',
  // Inflammatory markers
  'inflammatory': 'inflammatory',
  'inflammation': 'inflammatory',
};

/**
 * Unit normalization mappings
 */
export const UNIT_MAPPINGS: Record<string, string> = {
  'ng/ml': 'ng/mL',
  'mg/dl': 'mg/dL',
  'μg/dl': 'μg/dL',
  'ug/dl': 'μg/dL',
  'μiu/ml': 'μIU/mL',
  'uiu/ml': 'μIU/mL',
  'pg/ml': 'pg/mL',
  'μmol/l': 'μmol/L',
  'umol/l': 'μmol/L',
  'μg/l': 'μg/L',
  'ug/l': 'μg/L',
  'k/ul': 'K/uL',
  'm/ul': 'M/uL',
  'g/dl': 'g/dL',
  'fl': 'fL',
  'bpm': 'bpm',
  'ms': 'ms',
  '%': '%',
  'lbs': 'lbs',
  'kg': 'kg',
  'g': 'g',
  'hrs': 'hours',
  'hours': 'hours',
  'min': 'min',
  'cm': 'cm',
  'cm²': 'cm²',
  'cm³': 'cm³',
  'kg/m²': 'kg/m²',
};

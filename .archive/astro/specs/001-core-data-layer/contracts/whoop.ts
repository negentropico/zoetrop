/**
 * WHOOP Parser and Mapper Contract
 *
 * Defines interfaces for parsing WHOOP JSON exports
 * and mapping them to the unified Metric schema.
 */

import type { AutonomicMetric } from '../../../src/types/metrics';
import type { WhoopAnalysisReport } from '../../../src/types/whoop';

/**
 * Result of parsing WHOOP JSON
 */
export interface WhoopParseResult {
  success: boolean;
  data?: WhoopAnalysisReport;
  errors: string[];
  warnings: string[];
}

/**
 * Result of mapping WHOOP data to metrics
 */
export interface WhoopMapResult {
  metrics: AutonomicMetric[];
  skipped: string[];
  warnings: string[];
}

/**
 * Configuration for WHOOP mapping
 */
export interface WhoopMapConfig {
  /**
   * Whether to import HRV data
   * @default true
   */
  includeHrv?: boolean;

  /**
   * Whether to import recovery score
   * @default true
   */
  includeRecovery?: boolean;

  /**
   * Whether to import resting heart rate
   * @default true
   */
  includeRhr?: boolean;

  /**
   * Whether to import sleep duration
   * @default true
   */
  includeSleep?: boolean;

  /**
   * Whether to import strain data
   * @default true
   */
  includeStrain?: boolean;

  /**
   * Custom timestamp for imported metrics
   * If not provided, uses generated_at from report
   */
  timestamp?: string;
}

/**
 * Parse raw JSON input into WhoopAnalysisReport
 *
 * @param input - Raw JSON string or object
 * @returns Parse result with data, errors, and warnings
 *
 * Validation:
 * - Required fields: generated_at, key_metrics
 * - Required key_metrics: avg_hrv_rmssd, avg_recovery_score, avg_resting_heart_rate, avg_asleep
 * - Unknown fields are ignored (graceful degradation)
 * - Missing optional fields generate warnings, not errors
 */
export type ParseWhoopJson = (input: string | unknown) => WhoopParseResult;

/**
 * Map parsed WHOOP data to AutonomicMetric array
 *
 * @param report - Parsed WHOOP analysis report
 * @param config - Optional mapping configuration
 * @returns Mapped metrics with skipped fields and warnings
 *
 * Mapping:
 * - avg_hrv_rmssd → AutonomicMetric (subcategory: 'hrv')
 * - avg_recovery_score → AutonomicMetric (subcategory: 'recovery')
 * - avg_resting_heart_rate → AutonomicMetric (subcategory: 'hrv', name: 'Resting Heart Rate')
 * - avg_asleep → AutonomicMetric (subcategory: 'sleep')
 * - avg_day_strain → AutonomicMetric (subcategory: 'recovery', name: 'Daily Strain')
 */
export type MapWhoopToMetrics = (
  report: WhoopAnalysisReport,
  config?: WhoopMapConfig
) => WhoopMapResult;

/**
 * Validate WHOOP JSON has required structure
 *
 * @param input - Unknown input to validate
 * @returns Whether input has valid WHOOP structure
 */
export type ValidateWhoopJson = (input: unknown) => {
  valid: boolean;
  missingFields: string[];
};

/**
 * WHOOP utilities module interface
 */
export interface WhoopUtils {
  parseWhoopJson: ParseWhoopJson;
  mapWhoopToMetrics: MapWhoopToMetrics;
  validateWhoopJson: ValidateWhoopJson;
}

/**
 * Default reference ranges for WHOOP metrics
 */
export const WHOOP_REFERENCE_RANGES = {
  hrv: { min: 20, max: 100 },
  recovery: { min: 0, max: 100 },
  rhr: { min: 40, max: 80 },
  sleep: { min: 6, max: 9 }, // hours
  strain: { min: 0, max: 21 },
} as const;

/**
 * Default optimal ranges for WHOOP metrics
 */
export const WHOOP_OPTIMAL_RANGES = {
  hrv: { min: 50, max: 100 },
  recovery: { min: 67, max: 100 },
  rhr: { min: 45, max: 60 },
  sleep: { min: 7, max: 9 }, // hours
  strain: { min: 10, max: 18 },
} as const;

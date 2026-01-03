/**
 * WHOOP Parser
 *
 * Parses and validates WHOOP JSON exports.
 */

import type { WhoopAnalysisReport, WhoopKeyMetrics } from '@/types/whoop';

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
 * Required fields in key_metrics
 */
const REQUIRED_KEY_METRICS: (keyof WhoopKeyMetrics)[] = [
  'avg_hrv_rmssd',
  'avg_recovery_score',
  'avg_resting_heart_rate',
  'avg_asleep',
];

/**
 * Validate WHOOP JSON has required structure
 */
export function validateWhoopJson(input: unknown): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  // Check root is an object
  if (!input || typeof input !== 'object') {
    return { valid: false, missingFields: ['root'] };
  }

  const obj = input as Record<string, unknown>;

  // Check required root fields
  if (!obj.generated_at || typeof obj.generated_at !== 'string') {
    missingFields.push('generated_at');
  }

  if (!obj.key_metrics || typeof obj.key_metrics !== 'object') {
    missingFields.push('key_metrics');
    return { valid: false, missingFields };
  }

  // Check required key_metrics fields
  const keyMetrics = obj.key_metrics as Record<string, unknown>;
  for (const field of REQUIRED_KEY_METRICS) {
    if (typeof keyMetrics[field] !== 'number') {
      missingFields.push(`key_metrics.${field}`);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Parse WHOOP datetime string to ISO format
 */
function parseWhoopDatetime(datetime: string): string {
  // WHOOP uses format "YYYY-MM-DD HH:MM:SS"
  // Convert to ISO 8601
  try {
    // Try parsing as-is first (might already be ISO)
    const date = new Date(datetime);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Try replacing space with T for ISO format
    const isoFormat = datetime.replace(' ', 'T');
    const isoDate = new Date(isoFormat);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString();
    }

    // Fallback to current time
    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Parse raw JSON input into WhoopAnalysisReport
 */
export function parseWhoopJson(input: string | unknown): WhoopParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle string input
  let parsed: unknown;
  if (typeof input === 'string') {
    if (!input.trim()) {
      return {
        success: false,
        errors: ['Empty input string'],
        warnings: [],
      };
    }

    try {
      parsed = JSON.parse(input);
    } catch (error) {
      return {
        success: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`],
        warnings: [],
      };
    }
  } else {
    parsed = input;
  }

  // Validate structure
  const validation = validateWhoopJson(parsed);
  if (!validation.valid) {
    for (const field of validation.missingFields) {
      errors.push(`Missing required field: ${field}`);
    }
    return { success: false, errors, warnings };
  }

  const obj = parsed as Record<string, unknown>;

  // Extract warnings from source data
  if (Array.isArray(obj.warnings)) {
    warnings.push(...obj.warnings.filter((w): w is string => typeof w === 'string'));
  }

  // Build the report object with defaults for optional fields
  const keyMetrics = obj.key_metrics as WhoopKeyMetrics;
  const report: WhoopAnalysisReport = {
    generated_at: obj.generated_at as string,
    data_period: (obj.data_period as { start: string; end: string }) || {
      start: 'Unknown',
      end: 'Unknown',
    },
    key_metrics: {
      avg_hrv_rmssd: keyMetrics.avg_hrv_rmssd,
      avg_resting_heart_rate: keyMetrics.avg_resting_heart_rate,
      avg_recovery_score: keyMetrics.avg_recovery_score,
      avg_day_strain: keyMetrics.avg_day_strain ?? 0,
      avg_calories_burned: keyMetrics.avg_calories_burned ?? 0,
      avg_asleep: keyMetrics.avg_asleep,
      avg_in_bed: keyMetrics.avg_in_bed ?? 0,
      avg_light_sleep: keyMetrics.avg_light_sleep ?? 0,
      avg_deep_sws: keyMetrics.avg_deep_sws ?? 0,
      avg_rem: keyMetrics.avg_rem ?? 0,
      avg_workout_strain: keyMetrics.avg_workout_strain ?? 0,
      avg_workout_calories: keyMetrics.avg_workout_calories ?? 0,
      avg_workout_heart_rate: keyMetrics.avg_workout_heart_rate ?? 0,
      avg_workout_duration: keyMetrics.avg_workout_duration ?? 0,
    },
    recovery_analysis: (obj.recovery_analysis as WhoopAnalysisReport['recovery_analysis']) || {
      recent_recovery_avg: 0,
      previous_recovery_avg: 0,
      recovery_trend: 'Unknown',
      recovery_change_pct: 0,
      recent_hrv_avg: 0,
      previous_hrv_avg: 0,
      hrv_trend: 'Unknown',
      hrv_change_pct: 0,
      actual_tdee: 0,
      adjusted_macros: {
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        total_calories: 0,
      },
    },
    workout_analysis: (obj.workout_analysis as WhoopAnalysisReport['workout_analysis']) || {
      peak_performance_hours: [],
      optimal_pre_workout_windows: [],
      workout_days: {},
    },
    protocol_recommendations: Array.isArray(obj.protocol_recommendations)
      ? (obj.protocol_recommendations as string[])
      : [],
    errors: Array.isArray(obj.errors) ? (obj.errors as string[]) : [],
    warnings: Array.isArray(obj.warnings) ? (obj.warnings as string[]) : [],
  };

  return {
    success: true,
    data: report,
    errors: [],
    warnings,
  };
}

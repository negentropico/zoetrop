/**
 * Tests for WHOOP Parser
 *
 * Tests parsing and validation of WHOOP JSON exports.
 */

import { describe, it, expect } from 'vitest';
import { parseWhoopJson, validateWhoopJson } from '@/lib/whoop/parser';
import type { WhoopAnalysisReport } from '@/types/whoop';

// Valid WHOOP report fixture
const validWhoopReport: WhoopAnalysisReport = {
  generated_at: '2025-04-30 20:59:48',
  data_period: {
    start: '2024-01-01',
    end: '2024-04-30',
  },
  key_metrics: {
    avg_hrv_rmssd: 35.83,
    avg_resting_heart_rate: 56.24,
    avg_recovery_score: 63.29,
    avg_day_strain: 10.63,
    avg_calories_burned: 2446.38,
    avg_asleep: 6.58,
    avg_in_bed: 7.22,
    avg_light_sleep: 3.67,
    avg_deep_sws: 1.64,
    avg_rem: 1.27,
    avg_workout_strain: 9.46,
    avg_workout_calories: 389.17,
    avg_workout_heart_rate: 118.21,
    avg_workout_duration: 0.91,
  },
  recovery_analysis: {
    recent_recovery_avg: 67.0,
    previous_recovery_avg: 75.14,
    recovery_trend: 'Declining',
    recovery_change_pct: -10.84,
    recent_hrv_avg: 31.29,
    previous_hrv_avg: 32.14,
    hrv_trend: 'Declining',
    hrv_change_pct: -2.67,
    actual_tdee: 2446.38,
    adjusted_macros: {
      protein_g: 202,
      carbs_g: 214,
      fat_g: 87,
      total_calories: 2447,
    },
  },
  workout_analysis: {
    peak_performance_hours: [16, 18, 14],
    optimal_pre_workout_windows: [[14, 16], [16, 18]],
    workout_days: { Friday: 35, Saturday: 29 },
  },
  protocol_recommendations: ['Increase protein intake'],
  errors: [],
  warnings: [],
};

describe('validateWhoopJson', () => {
  it('should validate a valid WHOOP report', () => {
    const result = validateWhoopJson(validWhoopReport);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it('should reject null input', () => {
    const result = validateWhoopJson(null);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('root');
  });

  it('should reject non-object input', () => {
    const result = validateWhoopJson('string input');
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('root');
  });

  it('should detect missing generated_at', () => {
    const invalid = { ...validWhoopReport, generated_at: undefined };
    const result = validateWhoopJson(invalid);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('generated_at');
  });

  it('should detect missing key_metrics', () => {
    const invalid = { ...validWhoopReport, key_metrics: undefined };
    const result = validateWhoopJson(invalid);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('key_metrics');
  });

  it('should detect missing required key_metrics fields', () => {
    const invalid = {
      ...validWhoopReport,
      key_metrics: {
        avg_hrv_rmssd: 35.0,
        // Missing other required fields
      },
    };
    const result = validateWhoopJson(invalid);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('key_metrics.avg_recovery_score');
    expect(result.missingFields).toContain('key_metrics.avg_resting_heart_rate');
    expect(result.missingFields).toContain('key_metrics.avg_asleep');
  });

  it('should accept report with only required key_metrics', () => {
    const minimal = {
      generated_at: '2025-01-01',
      key_metrics: {
        avg_hrv_rmssd: 40,
        avg_recovery_score: 70,
        avg_resting_heart_rate: 55,
        avg_asleep: 7,
      },
    };
    const result = validateWhoopJson(minimal);
    expect(result.valid).toBe(true);
  });
});

describe('parseWhoopJson', () => {
  it('should parse valid JSON string', () => {
    const jsonString = JSON.stringify(validWhoopReport);
    const result = parseWhoopJson(jsonString);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.key_metrics.avg_hrv_rmssd).toBe(35.83);
    expect(result.errors).toEqual([]);
  });

  it('should parse valid object directly', () => {
    const result = parseWhoopJson(validWhoopReport);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.generated_at).toBe('2025-04-30 20:59:48');
  });

  it('should fail on invalid JSON string', () => {
    const result = parseWhoopJson('not valid json');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should fail on missing required fields', () => {
    const invalid = { generated_at: '2025-01-01' }; // Missing key_metrics
    const result = parseWhoopJson(invalid);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing required field: key_metrics');
  });

  it('should warn about unknown fields but not fail', () => {
    const withExtra = {
      ...validWhoopReport,
      some_unknown_field: 'value',
    };
    const result = parseWhoopJson(withExtra);

    expect(result.success).toBe(true);
    // Unknown fields are gracefully ignored
  });

  it('should handle empty string input', () => {
    const result = parseWhoopJson('');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should preserve warnings from source data', () => {
    const withWarnings = {
      ...validWhoopReport,
      warnings: ['Some warning from WHOOP'],
    };
    const result = parseWhoopJson(withWarnings);

    expect(result.success).toBe(true);
    expect(result.warnings).toContain('Some warning from WHOOP');
  });
});

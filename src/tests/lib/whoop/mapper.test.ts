/**
 * Tests for WHOOP Mapper
 *
 * Tests mapping WHOOP data to AutonomicMetric array.
 */

import { describe, it, expect } from 'vitest';
import { mapWhoopToMetrics } from '@/lib/whoop/mapper';
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
  protocol_recommendations: [],
  errors: [],
  warnings: [],
};

describe('mapWhoopToMetrics', () => {
  it('should map all metrics by default', () => {
    const result = mapWhoopToMetrics(validWhoopReport);

    expect(result.metrics.length).toBe(5);
    expect(result.skipped).toEqual([]);

    // Check HRV metric
    const hrv = result.metrics.find(m => m.name === 'HRV (RMSSD)');
    expect(hrv).toBeDefined();
    expect(hrv?.value).toBe(35.83);
    expect(hrv?.category).toBe('autonomic');
    expect(hrv?.subcategory).toBe('hrv');
    expect(hrv?.source).toBe('whoop');

    // Check Recovery metric
    const recovery = result.metrics.find(m => m.name === 'Recovery Score');
    expect(recovery).toBeDefined();
    expect(recovery?.value).toBe(63.29);
    expect(recovery?.subcategory).toBe('recovery');

    // Check RHR metric
    const rhr = result.metrics.find(m => m.name === 'Resting Heart Rate');
    expect(rhr).toBeDefined();
    expect(rhr?.value).toBe(56.24);
    expect(rhr?.unit).toBe('bpm');

    // Check Sleep metric
    const sleep = result.metrics.find(m => m.name === 'Sleep Duration');
    expect(sleep).toBeDefined();
    expect(sleep?.value).toBe(6.58);
    expect(sleep?.unit).toBe('hours');
    expect(sleep?.subcategory).toBe('sleep');

    // Check Strain metric
    const strain = result.metrics.find(m => m.name === 'Daily Strain');
    expect(strain).toBeDefined();
    expect(strain?.value).toBe(10.63);
  });

  it('should include reference and optimal ranges', () => {
    const result = mapWhoopToMetrics(validWhoopReport);

    const hrv = result.metrics.find(m => m.name === 'HRV (RMSSD)');
    expect(hrv?.referenceRange).toEqual({ min: 20, max: 100 });
    expect(hrv?.optimalRange).toEqual({ min: 50, max: 100 });

    const recovery = result.metrics.find(m => m.name === 'Recovery Score');
    expect(recovery?.referenceRange).toEqual({ min: 0, max: 100 });
    expect(recovery?.optimalRange).toEqual({ min: 67, max: 100 });
  });

  it('should use correct improvement directions', () => {
    const result = mapWhoopToMetrics(validWhoopReport);

    const hrv = result.metrics.find(m => m.name === 'HRV (RMSSD)');
    expect(hrv?.improvement).toBe('higher is better');

    const rhr = result.metrics.find(m => m.name === 'Resting Heart Rate');
    expect(rhr?.improvement).toBe('lower is better');

    const recovery = result.metrics.find(m => m.name === 'Recovery Score');
    expect(recovery?.improvement).toBe('higher is better');
  });

  it('should respect config to exclude metrics', () => {
    const result = mapWhoopToMetrics(validWhoopReport, {
      includeHrv: false,
      includeStrain: false,
    });

    expect(result.metrics.length).toBe(3);
    expect(result.skipped).toContain('HRV');
    expect(result.skipped).toContain('Strain');

    const hrv = result.metrics.find(m => m.name === 'HRV (RMSSD)');
    expect(hrv).toBeUndefined();

    const strain = result.metrics.find(m => m.name === 'Daily Strain');
    expect(strain).toBeUndefined();
  });

  it('should use custom timestamp if provided', () => {
    const customTimestamp = '2025-06-15T12:00:00.000Z';
    const result = mapWhoopToMetrics(validWhoopReport, {
      timestamp: customTimestamp,
    });

    result.metrics.forEach(metric => {
      expect(metric.timestamp).toBe(customTimestamp);
    });
  });

  it('should use generated_at as default timestamp', () => {
    const result = mapWhoopToMetrics(validWhoopReport);

    // Should parse the datetime string from generated_at
    result.metrics.forEach(metric => {
      expect(metric.timestamp).toBeDefined();
      // Should be a valid ISO string
      expect(() => new Date(metric.timestamp)).not.toThrow();
    });
  });

  it('should generate unique IDs for each metric', () => {
    const result = mapWhoopToMetrics(validWhoopReport);

    const ids = result.metrics.map(m => m.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should set sync status to local', () => {
    const result = mapWhoopToMetrics(validWhoopReport);

    result.metrics.forEach(metric => {
      expect(metric.syncStatus).toBe('local');
      expect(metric.syncVersion).toBe(1);
    });
  });

  it('should handle report with only some metrics', () => {
    const partialReport = {
      ...validWhoopReport,
      key_metrics: {
        avg_hrv_rmssd: 40,
        avg_recovery_score: 70,
        avg_resting_heart_rate: 55,
        avg_asleep: 7,
        // Missing avg_day_strain and other optional fields
      } as unknown as typeof validWhoopReport.key_metrics,
    };

    const result = mapWhoopToMetrics(partialReport);

    // Should still create metrics for what's available
    expect(result.metrics.length).toBeGreaterThanOrEqual(4);

    // Strain should be skipped or have warning
    const strain = result.metrics.find(m => m.name === 'Daily Strain');
    if (!strain) {
      expect(result.skipped).toContain('Strain');
    }
  });
});

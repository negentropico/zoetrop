/**
 * Tests for Statistics Functions
 *
 * Tests statistical analysis utilities for metrics.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSignificance,
  normalizeValue,
  detectOutliers,
  calculateRateOfChange,
} from '@/lib/calculations/statistics';
import type { Metric, MetricRange } from '@/types/metrics';

// Helper to create mock metrics
function createMockMetric(value: number, timestamp: string): Metric {
  return {
    id: `metric-${value}-${timestamp}`,
    name: 'Test Metric',
    value,
    unit: 'mg/dL',
    category: 'vitamins',
    subcategory: 'b-vitamins',
    timestamp,
    improvement: 'higher is better',
    source: 'manual',
    syncStatus: 'local',
    syncVersion: 1,
  } as Metric;
}

describe('calculateSignificance', () => {
  it('should return 0 for no deviation', () => {
    const result = calculateSignificance(0);
    expect(result).toBeCloseTo(0.5); // Sigmoid(0) = 0.5
  });

  it('should return higher values for positive deviations', () => {
    const small = calculateSignificance(1);
    const large = calculateSignificance(3);

    expect(large).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(0.5);
  });

  it('should return lower values for negative deviations', () => {
    const result = calculateSignificance(-2);
    expect(result).toBeLessThan(0.5);
  });

  it('should be bounded between 0 and 1', () => {
    const veryLarge = calculateSignificance(100);
    const verySmall = calculateSignificance(-100);

    expect(veryLarge).toBeLessThanOrEqual(1);
    expect(veryLarge).toBeGreaterThan(0.99);
    expect(verySmall).toBeGreaterThanOrEqual(0);
    expect(verySmall).toBeLessThan(0.01);
  });
});

describe('normalizeValue', () => {
  const range: MetricRange = { min: 0, max: 100 };

  it('should normalize to 0 at min', () => {
    const result = normalizeValue(0, range);
    expect(result).toBe(0);
  });

  it('should normalize to 1 at max', () => {
    const result = normalizeValue(100, range);
    expect(result).toBe(1);
  });

  it('should normalize to 0.5 at midpoint', () => {
    const result = normalizeValue(50, range);
    expect(result).toBe(0.5);
  });

  it('should handle values below min', () => {
    const result = normalizeValue(-20, range);
    expect(result).toBe(-0.2);
  });

  it('should handle values above max', () => {
    const result = normalizeValue(150, range);
    expect(result).toBe(1.5);
  });

  it('should handle negative ranges', () => {
    const negRange: MetricRange = { min: -100, max: 0 };
    const result = normalizeValue(-50, negRange);
    expect(result).toBe(0.5);
  });

  it('should handle very small ranges', () => {
    const smallRange: MetricRange = { min: 99, max: 101 };
    const result = normalizeValue(100, smallRange);
    expect(result).toBe(0.5);
  });
});

describe('detectOutliers', () => {
  it('should return empty array for insufficient data', () => {
    const metrics = [
      createMockMetric(100, '2024-01-01T00:00:00.000Z'),
    ];

    const result = detectOutliers(metrics);
    expect(result).toEqual([]);
  });

  it('should detect outliers beyond 2 standard deviations', () => {
    const metrics = [
      createMockMetric(100, '2024-01-01T00:00:00.000Z'),
      createMockMetric(102, '2024-01-02T00:00:00.000Z'),
      createMockMetric(98, '2024-01-03T00:00:00.000Z'),
      createMockMetric(101, '2024-01-04T00:00:00.000Z'),
      createMockMetric(99, '2024-01-05T00:00:00.000Z'),
      createMockMetric(200, '2024-01-06T00:00:00.000Z'), // Outlier!
    ];

    const result = detectOutliers(metrics);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(200);
  });

  it('should not flag values within threshold', () => {
    const metrics = [
      createMockMetric(100, '2024-01-01T00:00:00.000Z'),
      createMockMetric(105, '2024-01-02T00:00:00.000Z'),
      createMockMetric(95, '2024-01-03T00:00:00.000Z'),
      createMockMetric(103, '2024-01-04T00:00:00.000Z'),
      createMockMetric(97, '2024-01-05T00:00:00.000Z'),
    ];

    const result = detectOutliers(metrics);
    expect(result).toEqual([]);
  });

  it('should use custom threshold', () => {
    const metrics = [
      createMockMetric(100, '2024-01-01T00:00:00.000Z'),
      createMockMetric(100, '2024-01-02T00:00:00.000Z'),
      createMockMetric(100, '2024-01-03T00:00:00.000Z'),
      createMockMetric(110, '2024-01-04T00:00:00.000Z'), // Not outlier at 2 SD, but is at 1 SD
    ];

    const defaultResult = detectOutliers(metrics);
    expect(defaultResult).toEqual([]);

    const strictResult = detectOutliers(metrics, 1);
    expect(strictResult).toHaveLength(1);
    expect(strictResult[0].value).toBe(110);
  });
});

describe('calculateRateOfChange', () => {
  it('should calculate rate of change per day', () => {
    const metric1 = createMockMetric(100, '2024-01-01T00:00:00.000Z');
    const metric2 = createMockMetric(110, '2024-01-11T00:00:00.000Z'); // 10 days later

    const result = calculateRateOfChange(metric1, metric2);
    expect(result).toBe(1); // 10 units over 10 days = 1 per day
  });

  it('should handle decreasing values', () => {
    const metric1 = createMockMetric(100, '2024-01-01T00:00:00.000Z');
    const metric2 = createMockMetric(80, '2024-01-11T00:00:00.000Z');

    const result = calculateRateOfChange(metric1, metric2);
    expect(result).toBe(-2); // -20 units over 10 days = -2 per day
  });

  it('should handle same day readings', () => {
    const metric1 = createMockMetric(100, '2024-01-01T00:00:00.000Z');
    const metric2 = createMockMetric(110, '2024-01-01T00:00:00.000Z');

    const result = calculateRateOfChange(metric1, metric2);
    expect(result).toBe(Infinity); // Instantaneous change
  });

  it('should handle fractional days', () => {
    const metric1 = createMockMetric(100, '2024-01-01T00:00:00.000Z');
    const metric2 = createMockMetric(106, '2024-01-01T12:00:00.000Z'); // 12 hours = 0.5 days

    const result = calculateRateOfChange(metric1, metric2);
    expect(result).toBe(12); // 6 units over 0.5 days = 12 per day
  });

  it('should handle zero change', () => {
    const metric1 = createMockMetric(100, '2024-01-01T00:00:00.000Z');
    const metric2 = createMockMetric(100, '2024-01-10T00:00:00.000Z');

    const result = calculateRateOfChange(metric1, metric2);
    expect(result).toBe(0);
  });
});

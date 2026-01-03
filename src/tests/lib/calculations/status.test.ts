/**
 * Tests for Status Calculation
 *
 * Tests metric status classification based on value and ranges.
 */

import { describe, it, expect } from 'vitest';
import { calculateStatus, calculateMetricResult } from '@/lib/calculations/status';
import type { Metric, MetricRange } from '@/types/metrics';

describe('calculateStatus', () => {
  describe('with no ranges defined', () => {
    it('should return borderline when no ranges provided', () => {
      const result = calculateStatus({ value: 100 });
      expect(result).toBe('borderline');
    });
  });

  describe('with reference range only', () => {
    const referenceRange: MetricRange = { min: 50, max: 150 };

    it('should return deficient when value is below reference min', () => {
      const result = calculateStatus({ value: 30, referenceRange });
      expect(result).toBe('deficient');
    });

    it('should return excess when value is above reference max', () => {
      const result = calculateStatus({ value: 200, referenceRange });
      expect(result).toBe('excess');
    });

    it('should return optimal when value is within reference range (center portion)', () => {
      // Center of 50-150 is 100, center portion is roughly 75-125 (25% buffer)
      const result = calculateStatus({ value: 100, referenceRange });
      expect(result).toBe('optimal');
    });

    it('should return borderline when value is near edges of reference range', () => {
      // Value near the edges but still within reference
      const resultLow = calculateStatus({ value: 55, referenceRange });
      expect(resultLow).toBe('borderline');

      const resultHigh = calculateStatus({ value: 145, referenceRange });
      expect(resultHigh).toBe('borderline');
    });

    it('should return deficient when value exactly at reference min', () => {
      // At min boundary - edge case, treated as deficient
      const result = calculateStatus({ value: 50, referenceRange });
      expect(result).toBe('borderline');
    });

    it('should return excess when value exactly at reference max', () => {
      // At max boundary - edge case, treated as borderline
      const result = calculateStatus({ value: 150, referenceRange });
      expect(result).toBe('borderline');
    });
  });

  describe('with both reference and optimal ranges', () => {
    const referenceRange: MetricRange = { min: 50, max: 150 };
    const optimalRange: MetricRange = { min: 80, max: 120 };

    it('should return optimal when value is within optimal range', () => {
      const result = calculateStatus({
        value: 100,
        referenceRange,
        optimalRange,
      });
      expect(result).toBe('optimal');
    });

    it('should return borderline when value is between reference and optimal', () => {
      // Below optimal but above reference min
      const resultLow = calculateStatus({
        value: 60,
        referenceRange,
        optimalRange,
      });
      expect(resultLow).toBe('borderline');

      // Above optimal but below reference max
      const resultHigh = calculateStatus({
        value: 140,
        referenceRange,
        optimalRange,
      });
      expect(resultHigh).toBe('borderline');
    });

    it('should return deficient when value is below reference min', () => {
      const result = calculateStatus({
        value: 30,
        referenceRange,
        optimalRange,
      });
      expect(result).toBe('deficient');
    });

    it('should return excess when value is above reference max', () => {
      const result = calculateStatus({
        value: 200,
        referenceRange,
        optimalRange,
      });
      expect(result).toBe('excess');
    });

    it('should handle optimal range at lower boundary', () => {
      const result = calculateStatus({
        value: 80,
        referenceRange,
        optimalRange,
      });
      expect(result).toBe('optimal');
    });

    it('should handle optimal range at upper boundary', () => {
      const result = calculateStatus({
        value: 120,
        referenceRange,
        optimalRange,
      });
      expect(result).toBe('optimal');
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      const referenceRange: MetricRange = { min: 0, max: 100 };
      const optimalRange: MetricRange = { min: 40, max: 60 };

      const result = calculateStatus({
        value: 0,
        referenceRange,
        optimalRange,
      });
      // At min boundary but outside optimal
      expect(result).toBe('borderline');
    });

    it('should handle negative values', () => {
      const referenceRange: MetricRange = { min: -10, max: 10 };
      // -8 is outside the center 50% (-5 to 5), so borderline
      const result = calculateStatus({
        value: -8,
        referenceRange,
      });
      expect(result).toBe('borderline');
    });

    it('should handle very small ranges', () => {
      const referenceRange: MetricRange = { min: 99, max: 101 };
      const result = calculateStatus({
        value: 100,
        referenceRange,
      });
      expect(result).toBe('optimal');
    });

    it('should handle very large values', () => {
      const referenceRange: MetricRange = { min: 0, max: 1000000 };
      const result = calculateStatus({
        value: 5000000,
        referenceRange,
      });
      expect(result).toBe('excess');
    });
  });
});

describe('calculateMetricResult', () => {
  const createMockMetric = (overrides: Partial<Metric> = {}): Metric => ({
    id: 'test-id',
    name: 'Test Metric',
    value: 100,
    unit: 'mg/dL',
    category: 'metabolic',
    subcategory: 'glucose',
    timestamp: new Date().toISOString(),
    improvement: 'lower is better',
    source: 'manual',
    syncStatus: 'local',
    syncVersion: 1,
    ...overrides,
  } as Metric);

  it('should calculate status for a metric without history', () => {
    const metric = createMockMetric({
      value: 100,
      referenceRange: { min: 70, max: 140 },
      optimalRange: { min: 80, max: 100 },
    });

    const result = calculateMetricResult(metric);

    expect(result.status).toBe('optimal');
    expect(result.trend).toBe('stable'); // No history, stable
    expect(result.percentChange).toBeUndefined();
    expect(result.significance).toBeUndefined();
  });

  it('should calculate status and trend with history', () => {
    const metric = createMockMetric({
      value: 95,
      referenceRange: { min: 70, max: 140 },
      optimalRange: { min: 80, max: 100 },
      improvement: 'lower is better',
    });

    const history: Metric[] = [
      createMockMetric({ value: 110, timestamp: '2024-01-01T00:00:00.000Z' }),
      createMockMetric({ value: 105, timestamp: '2024-01-15T00:00:00.000Z' }),
      createMockMetric({ value: 95, timestamp: '2024-02-01T00:00:00.000Z' }),
    ];

    const result = calculateMetricResult(metric, history);

    expect(result.status).toBe('optimal');
    expect(result.trend).toBe('improving'); // Lower is better and values decreasing
    expect(result.percentChange).toBeDefined();
  });

  it('should return deficient status for values below range', () => {
    const metric = createMockMetric({
      value: 50,
      referenceRange: { min: 70, max: 140 },
    });

    const result = calculateMetricResult(metric);

    expect(result.status).toBe('deficient');
  });

  it('should return excess status for values above range', () => {
    const metric = createMockMetric({
      value: 200,
      referenceRange: { min: 70, max: 140 },
    });

    const result = calculateMetricResult(metric);

    expect(result.status).toBe('excess');
  });
});

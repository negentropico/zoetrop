/**
 * Tests for Trend Analysis
 *
 * Tests metric trend calculation based on historical readings.
 */

import { describe, it, expect } from 'vitest';
import { analyzeTrend, calculatePercentChange } from '@/lib/calculations/trend';
import type { Metric, MetricTrend } from '@/types/metrics';

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

describe('analyzeTrend', () => {
  describe('insufficient data', () => {
    it('should return stable with zero readings', () => {
      const result = analyzeTrend({
        metrics: [],
        improvementDirection: 'higher is better',
      });
      expect(result).toBe('stable');
    });

    it('should return stable with one reading', () => {
      const result = analyzeTrend({
        metrics: [createMockMetric(100, '2024-01-01T00:00:00.000Z')],
        improvementDirection: 'higher is better',
      });
      expect(result).toBe('stable');
    });
  });

  describe('higher is better', () => {
    it('should return improving when values increase', () => {
      const metrics = [
        createMockMetric(80, '2024-01-01T00:00:00.000Z'),
        createMockMetric(90, '2024-01-15T00:00:00.000Z'),
        createMockMetric(100, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      expect(result).toBe('improving');
    });

    it('should return declining when values decrease', () => {
      const metrics = [
        createMockMetric(100, '2024-01-01T00:00:00.000Z'),
        createMockMetric(90, '2024-01-15T00:00:00.000Z'),
        createMockMetric(80, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      expect(result).toBe('declining');
    });

    it('should return stable when values fluctuate within threshold', () => {
      const metrics = [
        createMockMetric(100, '2024-01-01T00:00:00.000Z'),
        createMockMetric(102, '2024-01-15T00:00:00.000Z'),
        createMockMetric(99, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      expect(result).toBe('stable');
    });
  });

  describe('lower is better', () => {
    it('should return improving when values decrease', () => {
      const metrics = [
        createMockMetric(100, '2024-01-01T00:00:00.000Z'),
        createMockMetric(90, '2024-01-15T00:00:00.000Z'),
        createMockMetric(80, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'lower is better',
      });

      expect(result).toBe('improving');
    });

    it('should return declining when values increase', () => {
      const metrics = [
        createMockMetric(80, '2024-01-01T00:00:00.000Z'),
        createMockMetric(90, '2024-01-15T00:00:00.000Z'),
        createMockMetric(100, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'lower is better',
      });

      expect(result).toBe('declining');
    });
  });

  describe('edge cases', () => {
    it('should handle unsorted metrics', () => {
      // Metrics are out of order by timestamp
      const metrics = [
        createMockMetric(90, '2024-01-15T00:00:00.000Z'),
        createMockMetric(80, '2024-01-01T00:00:00.000Z'),
        createMockMetric(100, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      // Should still correctly identify the trend (80 -> 90 -> 100)
      expect(result).toBe('improving');
    });

    it('should handle zero values', () => {
      const metrics = [
        createMockMetric(0, '2024-01-01T00:00:00.000Z'),
        createMockMetric(10, '2024-01-15T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      expect(result).toBe('improving');
    });

    it('should handle negative values', () => {
      const metrics = [
        createMockMetric(-10, '2024-01-01T00:00:00.000Z'),
        createMockMetric(-5, '2024-01-15T00:00:00.000Z'),
        createMockMetric(0, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      expect(result).toBe('improving');
    });

    it('should handle two readings', () => {
      const metrics = [
        createMockMetric(80, '2024-01-01T00:00:00.000Z'),
        createMockMetric(100, '2024-02-01T00:00:00.000Z'),
      ];

      const result = analyzeTrend({
        metrics,
        improvementDirection: 'higher is better',
      });

      expect(result).toBe('improving');
    });
  });
});

describe('calculatePercentChange', () => {
  it('should calculate positive percent change', () => {
    const result = calculatePercentChange(100, 120);
    expect(result).toBe(20);
  });

  it('should calculate negative percent change', () => {
    const result = calculatePercentChange(100, 80);
    expect(result).toBe(-20);
  });

  it('should return 0 for no change', () => {
    const result = calculatePercentChange(100, 100);
    expect(result).toBe(0);
  });

  it('should handle small values', () => {
    const result = calculatePercentChange(0.1, 0.2);
    expect(result).toBeCloseTo(100);
  });

  it('should handle zero previous value', () => {
    // When previous is 0, return Infinity for increase
    const result = calculatePercentChange(0, 100);
    expect(result).toBe(Infinity);
  });

  it('should handle negative values', () => {
    const result = calculatePercentChange(-100, -80);
    // From -100 to -80 is an increase of 20%
    expect(result).toBe(20);
  });
});

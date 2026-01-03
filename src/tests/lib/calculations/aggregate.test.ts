/**
 * Tests for Category Aggregation
 *
 * Tests aggregating metrics by category for dashboard display.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateByCategory,
  determineOverallStatus,
  enrichMetric,
  getCategorySummary,
  ALL_CATEGORIES,
} from '@/lib/calculations/aggregate';
import { seedMetrics, emptyMetrics } from '@/tests/fixtures/dashboard-fixtures';
import type { Metric, MetricStatus } from '@/types/metrics';

describe('determineOverallStatus', () => {
  it('should return empty for no statuses', () => {
    expect(determineOverallStatus([])).toBe('empty');
  });

  it('should return empty for all null statuses', () => {
    expect(determineOverallStatus([null, null])).toBe('empty');
  });

  it('should return single status', () => {
    expect(determineOverallStatus(['optimal'])).toBe('optimal');
  });

  it('should prioritize deficient over all', () => {
    expect(determineOverallStatus(['optimal', 'deficient', 'borderline'])).toBe('deficient');
  });

  it('should prioritize excess over borderline and optimal', () => {
    expect(determineOverallStatus(['optimal', 'excess', 'borderline'])).toBe('excess');
  });

  it('should prioritize borderline over optimal', () => {
    expect(determineOverallStatus(['optimal', 'borderline'])).toBe('borderline');
  });

  it('should return optimal when all optimal', () => {
    expect(determineOverallStatus(['optimal', 'optimal', 'optimal'])).toBe('optimal');
  });
});

describe('enrichMetric', () => {
  it('should calculate status for metric with ranges', () => {
    const metric = seedMetrics.find((m) => m.name === 'HRV (RMSSD)')!;
    const enriched = enrichMetric(metric, seedMetrics);

    expect(enriched.calculatedStatus).toBe('optimal'); // 55 is within 50-100 optimal
    expect(enriched.calculatedTrend).toBe('stable'); // Only one reading
    expect(enriched.percentChange).toBeNull(); // No history
  });

  it('should return null status for metric without ranges', () => {
    const metricWithoutRanges: Metric = {
      ...seedMetrics[0],
      id: 'no-ranges',
      referenceRange: undefined,
      optimalRange: undefined,
    };
    const enriched = enrichMetric(metricWithoutRanges, [metricWithoutRanges]);

    expect(enriched.calculatedStatus).toBeNull();
  });

  it('should calculate trend for metric with history', () => {
    const history: Metric[] = [
      {
        ...seedMetrics[0],
        id: 'hrv-1',
        value: 40,
        timestamp: '2026-01-01T08:00:00.000Z',
      },
      {
        ...seedMetrics[0],
        id: 'hrv-2',
        value: 50,
        timestamp: '2026-01-02T08:00:00.000Z',
      },
      {
        ...seedMetrics[0],
        id: 'hrv-3',
        value: 60,
        timestamp: '2026-01-03T08:00:00.000Z',
      },
    ];

    const enriched = enrichMetric(history[2], history);

    expect(enriched.calculatedTrend).toBe('improving'); // Higher is better, values increasing
    expect(enriched.percentChange).toBeCloseTo(50); // 40 -> 60 = 50%
    expect(enriched.historicalValues).toHaveLength(3);
  });

  it('should handle declining trends correctly', () => {
    const history: Metric[] = [
      {
        ...seedMetrics[2], // RHR - lower is better
        id: 'rhr-1',
        value: 70,
        timestamp: '2026-01-01T08:00:00.000Z',
      },
      {
        ...seedMetrics[2],
        id: 'rhr-2',
        value: 58,
        timestamp: '2026-01-03T08:00:00.000Z',
      },
    ];

    const enriched = enrichMetric(history[1], history);

    expect(enriched.calculatedTrend).toBe('improving'); // Lower is better, value decreased
  });
});

describe('aggregateByCategory', () => {
  it('should return all 9 categories', () => {
    const result = aggregateByCategory(seedMetrics);
    expect(result).toHaveLength(9);
  });

  it('should include all category info', () => {
    const result = aggregateByCategory(seedMetrics);

    for (const category of ALL_CATEGORIES) {
      const summary = result.find((s) => s.category === category);
      expect(summary).toBeDefined();
      expect(summary?.info).toBeDefined();
      expect(summary?.info.label).toBeTruthy();
    }
  });

  it('should count metrics correctly', () => {
    const result = aggregateByCategory(seedMetrics);

    const autonomic = result.find((s) => s.category === 'autonomic');
    expect(autonomic?.metricCount).toBe(3);

    const vitamins = result.find((s) => s.category === 'vitamins');
    expect(vitamins?.metricCount).toBe(1);

    const minerals = result.find((s) => s.category === 'minerals');
    expect(minerals?.metricCount).toBe(0);
  });

  it('should determine overall status correctly', () => {
    const result = aggregateByCategory(seedMetrics);

    const autonomic = result.find((s) => s.category === 'autonomic');
    expect(autonomic?.overallStatus).toBe('optimal');

    const inflammatory = result.find((s) => s.category === 'inflammatory');
    expect(inflammatory?.overallStatus).toBe('borderline');

    const metabolic = result.find((s) => s.category === 'metabolic');
    expect(metabolic?.overallStatus).toBe('deficient');
  });

  it('should return empty status for categories without metrics', () => {
    const result = aggregateByCategory(seedMetrics);

    const minerals = result.find((s) => s.category === 'minerals');
    expect(minerals?.overallStatus).toBe('empty');
    expect(minerals?.lastUpdated).toBeNull();
  });

  it('should set lastUpdated to most recent timestamp', () => {
    const result = aggregateByCategory(seedMetrics);

    const autonomic = result.find((s) => s.category === 'autonomic');
    expect(autonomic?.lastUpdated).toBe('2026-01-03T08:00:00.000Z');
  });

  it('should handle empty metrics array', () => {
    const result = aggregateByCategory(emptyMetrics);

    expect(result).toHaveLength(9);
    result.forEach((summary) => {
      expect(summary.metricCount).toBe(0);
      expect(summary.overallStatus).toBe('empty');
      expect(summary.lastUpdated).toBeNull();
    });
  });

  it('should deduplicate metrics by name (most recent)', () => {
    const duplicateMetrics: Metric[] = [
      {
        ...seedMetrics[0],
        id: 'hrv-old',
        value: 40,
        timestamp: '2026-01-01T08:00:00.000Z',
      },
      {
        ...seedMetrics[0],
        id: 'hrv-new',
        value: 60,
        timestamp: '2026-01-03T08:00:00.000Z',
      },
    ];

    const result = aggregateByCategory(duplicateMetrics);
    const autonomic = result.find((s) => s.category === 'autonomic');

    // Should have 1 unique metric (by name)
    expect(autonomic?.metricCount).toBe(1);
    // Should use the most recent value
    expect(autonomic?.metrics[0].value).toBe(60);
  });
});

describe('getCategorySummary', () => {
  it('should return summary for specific category', () => {
    const result = getCategorySummary('autonomic', seedMetrics);

    expect(result.category).toBe('autonomic');
    expect(result.metricCount).toBe(3);
    expect(result.overallStatus).toBe('optimal');
  });

  it('should return empty summary for category with no metrics', () => {
    const result = getCategorySummary('minerals', seedMetrics);

    expect(result.category).toBe('minerals');
    expect(result.metricCount).toBe(0);
    expect(result.overallStatus).toBe('empty');
  });
});

/**
 * Statistics Utilities
 *
 * Statistical analysis functions for metrics.
 */

import type { Metric, MetricRange } from '@/types/metrics';

/**
 * Calculate statistical significance using sigmoid normalization
 *
 * @param deviation - How far value deviates from center of range
 * @returns Significance score (0-1, sigmoid-normalized)
 */
export function calculateSignificance(deviation: number): number {
  // Sigmoid function: 1 / (1 + e^(-x))
  return 1 / (1 + Math.exp(-deviation));
}

/**
 * Normalize a metric value to 0-1 scale
 *
 * @param value - Raw metric value
 * @param range - Reference range for normalization
 * @returns Normalized value (0 = min, 1 = max, can exceed bounds)
 */
export function normalizeValue(value: number, range: MetricRange): number {
  const rangeSize = range.max - range.min;

  if (rangeSize === 0) {
    return 0.5; // If min === max, return midpoint
  }

  return (value - range.min) / rangeSize;
}

/**
 * Calculate mean of an array of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const avg = mean(values);
  const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquaredDiff = mean(squaredDiffs);

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Detect statistical outliers in a metric series
 *
 * @param metrics - Array of metric readings
 * @param threshold - Standard deviations for outlier detection (default: 2)
 * @returns Metrics identified as outliers
 */
export function detectOutliers(metrics: Metric[], threshold: number = 2): Metric[] {
  if (metrics.length < 3) {
    return []; // Need at least 3 data points for meaningful outlier detection
  }

  const values = metrics.map(m => m.value);
  const avg = mean(values);
  const stdDev = standardDeviation(values);

  if (stdDev === 0) {
    return []; // All values are the same, no outliers
  }

  return metrics.filter(metric => {
    const zScore = Math.abs((metric.value - avg) / stdDev);
    return zScore > threshold;
  });
}

/**
 * Calculate rate of change between two readings
 *
 * @param metric1 - Earlier reading
 * @param metric2 - Later reading
 * @returns Rate of change per day
 */
export function calculateRateOfChange(metric1: Metric, metric2: Metric): number {
  const time1 = new Date(metric1.timestamp).getTime();
  const time2 = new Date(metric2.timestamp).getTime();

  const daysDiff = (time2 - time1) / (1000 * 60 * 60 * 24);

  if (daysDiff === 0) {
    return metric2.value === metric1.value ? 0 : Infinity;
  }

  const valueDiff = metric2.value - metric1.value;
  return valueDiff / daysDiff;
}

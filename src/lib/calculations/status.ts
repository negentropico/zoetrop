/**
 * Status Calculation Utilities
 *
 * Calculates metric status based on value and reference/optimal ranges.
 */

import type {
  Metric,
  MetricStatus,
  MetricTrend,
  MetricRange,
  MetricCalculationResult,
} from '@/types/metrics';

/**
 * Input for status calculation
 */
export interface StatusInput {
  value: number;
  referenceRange?: MetricRange;
  optimalRange?: MetricRange;
}

/**
 * Calculate metric status based on value and ranges
 *
 * Classification logic:
 * - optimal: value within optimalRange (if defined) or center of referenceRange
 * - borderline: value within referenceRange but outside optimalRange
 * - deficient: value below referenceRange.min
 * - excess: value above referenceRange.max
 * - borderline (default): no ranges defined
 */
export function calculateStatus(input: StatusInput): MetricStatus {
  const { value, referenceRange, optimalRange } = input;

  // No ranges defined - cannot classify accurately
  if (!referenceRange) {
    return 'borderline';
  }

  // Check if outside reference range first
  if (value < referenceRange.min) {
    return 'deficient';
  }
  if (value > referenceRange.max) {
    return 'excess';
  }

  // Within reference range - now check optimal
  if (optimalRange) {
    // Has optimal range defined
    if (value >= optimalRange.min && value <= optimalRange.max) {
      return 'optimal';
    }
    // Within reference but outside optimal
    return 'borderline';
  }

  // No optimal range - use center portion of reference as "optimal"
  // Calculate the center 50% of the reference range as optimal
  const rangeSize = referenceRange.max - referenceRange.min;
  const center = (referenceRange.min + referenceRange.max) / 2;
  const optimalBuffer = rangeSize * 0.25; // 25% buffer on each side

  const implicitOptimalMin = center - optimalBuffer;
  const implicitOptimalMax = center + optimalBuffer;

  if (value >= implicitOptimalMin && value <= implicitOptimalMax) {
    return 'optimal';
  }

  return 'borderline';
}

/**
 * Simple trend analysis for a metric series
 * (Full implementation in trend.ts for US3)
 */
function calculateSimpleTrend(
  metrics: Metric[],
  improvementDirection: 'higher is better' | 'lower is better'
): MetricTrend {
  if (metrics.length < 2) {
    return 'stable';
  }

  // Sort by timestamp
  const sorted = [...metrics].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const percentChange = ((last - first) / Math.abs(first)) * 100;

  // Threshold for significance (5%)
  const threshold = 5;

  if (Math.abs(percentChange) < threshold) {
    return 'stable';
  }

  const isIncreasing = percentChange > 0;
  const higherIsBetter = improvementDirection === 'higher is better';

  if ((isIncreasing && higherIsBetter) || (!isIncreasing && !higherIsBetter)) {
    return 'improving';
  }

  return 'declining';
}

/**
 * Calculate percent change between first and last readings
 */
function calculatePercentChangeFromHistory(metrics: Metric[]): number | undefined {
  if (metrics.length < 2) {
    return undefined;
  }

  const sorted = [...metrics].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;

  if (first === 0) {
    return undefined;
  }

  return ((last - first) / Math.abs(first)) * 100;
}

/**
 * Calculate full metric result including status, trend, and percent change
 */
export function calculateMetricResult(
  metric: Metric,
  history?: Metric[]
): MetricCalculationResult {
  const status = calculateStatus({
    value: metric.value,
    referenceRange: metric.referenceRange,
    optimalRange: metric.optimalRange,
  });

  let trend: MetricTrend = 'stable';
  let percentChange: number | undefined;
  let significance: number | undefined;

  if (history && history.length > 0) {
    trend = calculateSimpleTrend(history, metric.improvement);
    percentChange = calculatePercentChangeFromHistory(history);

    // Calculate significance if we have ranges and percent change
    if (percentChange !== undefined && metric.referenceRange) {
      // Simple significance based on percent change magnitude
      // Values closer to 1 indicate more significant changes
      significance = Math.min(1, Math.abs(percentChange) / 20);
    }
  }

  return {
    status,
    trend,
    percentChange,
    significance,
  };
}

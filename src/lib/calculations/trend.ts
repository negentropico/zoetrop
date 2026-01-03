/**
 * Trend Analysis Utilities
 *
 * Analyzes metric trends over time.
 */

import type { Metric, MetricTrend, ImprovementDirection } from '@/types/metrics';

/**
 * Input for trend analysis
 */
export interface TrendInput {
  metrics: Metric[];
  improvementDirection: ImprovementDirection;
}

/**
 * Threshold for considering a change significant (5%)
 */
const TREND_THRESHOLD = 5;

/**
 * Analyze trend from a series of metric readings
 *
 * Analysis logic:
 * - stable: < 2 readings OR variance within 5% threshold
 * - improving: trend direction matches improvement direction
 * - declining: trend direction opposes improvement direction
 */
export function analyzeTrend(input: TrendInput): MetricTrend {
  const { metrics, improvementDirection } = input;

  // Need at least 2 readings to determine a trend
  if (metrics.length < 2) {
    return 'stable';
  }

  // Sort by timestamp (oldest first)
  const sorted = [...metrics].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;

  // Handle zero first value
  if (first === 0) {
    // If starting from 0 and now positive, that's an increase
    // If starting from 0 and now negative, that's a decrease
    if (last > 0) {
      return improvementDirection === 'higher is better' ? 'improving' : 'declining';
    } else if (last < 0) {
      return improvementDirection === 'lower is better' ? 'improving' : 'declining';
    }
    return 'stable';
  }

  const percentChange = calculatePercentChange(first, last);

  // Check if change is significant
  if (Math.abs(percentChange) < TREND_THRESHOLD) {
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
 * Calculate percent change between two values
 *
 * @param previous - Earlier value
 * @param current - Later value
 * @returns Percent change (positive = increase, negative = decrease)
 */
export function calculatePercentChange(previous: number, current: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : Infinity;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

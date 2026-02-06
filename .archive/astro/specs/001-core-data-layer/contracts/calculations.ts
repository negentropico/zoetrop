/**
 * Calculation Utilities Contract
 *
 * Defines interfaces for metric analysis functions.
 * Pure functions with no side effects.
 */

import type {
  Metric,
  MetricStatus,
  MetricTrend,
  MetricRange,
  MetricCalculationResult,
} from '../../../src/types/metrics';

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
 * @param input - Value and range information
 * @returns Status classification
 *
 * Classification logic:
 * - optimal: value within optimalRange (if defined) or center of referenceRange
 * - borderline: value within referenceRange but outside optimalRange
 * - deficient: value below referenceRange.min
 * - excess: value above referenceRange.max
 * - borderline (default): no ranges defined
 */
export type CalculateStatus = (input: StatusInput) => MetricStatus;

/**
 * Input for trend analysis
 */
export interface TrendInput {
  metrics: Metric[];
  improvementDirection: 'higher is better' | 'lower is better';
}

/**
 * Analyze trend from a series of metric readings
 *
 * @param input - Historical metrics and improvement direction
 * @returns Trend classification
 *
 * Analysis logic:
 * - stable: < 2 readings OR variance within 5% threshold
 * - improving: trend direction matches improvement direction
 * - declining: trend direction opposes improvement direction
 */
export type AnalyzeTrend = (input: TrendInput) => MetricTrend;

/**
 * Calculate percent change between two values
 *
 * @param previous - Earlier value
 * @param current - Later value
 * @returns Percent change (positive = increase, negative = decrease)
 */
export type CalculatePercentChange = (previous: number, current: number) => number;

/**
 * Calculate statistical significance of a deviation
 *
 * @param deviation - How far value deviates from center of range
 * @returns Significance score (0-1, sigmoid-normalized)
 */
export type CalculateSignificance = (deviation: number) => number;

/**
 * Normalize a metric value to 0-1 scale
 *
 * @param value - Raw metric value
 * @param range - Reference range for normalization
 * @returns Normalized value (0 = min, 1 = max, can exceed bounds)
 */
export type NormalizeValue = (value: number, range: MetricRange) => number;

/**
 * Detect statistical outliers in a metric series
 *
 * @param metrics - Array of metric readings
 * @param threshold - Standard deviations for outlier detection (default: 2)
 * @returns Metrics identified as outliers
 */
export type DetectOutliers = (metrics: Metric[], threshold?: number) => Metric[];

/**
 * Calculate rate of change between two readings
 *
 * @param metric1 - Earlier reading
 * @param metric2 - Later reading
 * @returns Rate of change per day
 */
export type CalculateRateOfChange = (metric1: Metric, metric2: Metric) => number;

/**
 * Full calculation result for a metric
 *
 * @param metric - Current metric
 * @param history - Optional historical readings for trend
 * @returns Complete calculation result
 */
export type CalculateMetricResult = (
  metric: Metric,
  history?: Metric[]
) => MetricCalculationResult;

/**
 * Calculation utilities module interface
 */
export interface CalculationUtils {
  calculateStatus: CalculateStatus;
  analyzeTrend: AnalyzeTrend;
  calculatePercentChange: CalculatePercentChange;
  calculateSignificance: CalculateSignificance;
  normalizeValue: NormalizeValue;
  detectOutliers: DetectOutliers;
  calculateRateOfChange: CalculateRateOfChange;
  calculateMetricResult: CalculateMetricResult;
}

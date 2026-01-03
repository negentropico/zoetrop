/**
 * Calculations Module
 *
 * Exports metric calculation utilities.
 */

// Status calculation
export { calculateStatus, calculateMetricResult } from './status';
export type { StatusInput } from './status';

// Trend analysis
export { analyzeTrend, calculatePercentChange } from './trend';
export type { TrendInput } from './trend';

// Statistics
export {
  calculateSignificance,
  normalizeValue,
  detectOutliers,
  calculateRateOfChange,
} from './statistics';

/**
 * Category Aggregation Utilities
 *
 * Aggregates metrics by category for dashboard display.
 */

import type { Metric, MetricCategory, MetricStatus } from '@/types/metrics';
import type { CategorySummary, MetricWithCalculations } from '@/types/components';
import { CATEGORY_INFO } from '@/types/metrics';
import { calculateStatus } from './status';
import { analyzeTrend, calculatePercentChange } from './trend';

/**
 * All valid metric categories in display order
 */
export const ALL_CATEGORIES: MetricCategory[] = [
  'vitamins',
  'minerals',
  'inflammatory',
  'metabolic',
  'hormones',
  'autonomic',
  'bodyComposition',
  'lipids',
  'hematology',
];

/**
 * Status priority for determining overall category status
 * Lower number = worse status = takes priority
 */
const STATUS_PRIORITY: Record<MetricStatus | 'empty', number> = {
  deficient: 1,
  excess: 2,
  borderline: 3,
  optimal: 4,
  empty: 5,
};

/**
 * Determine overall category status from multiple metrics
 * Uses "worst status wins" logic
 */
export function determineOverallStatus(
  statuses: (MetricStatus | null)[]
): MetricStatus | 'empty' {
  if (statuses.length === 0) {
    return 'empty';
  }

  const validStatuses = statuses.filter((s): s is MetricStatus => s !== null);

  if (validStatuses.length === 0) {
    return 'empty';
  }

  // Find worst status (lowest priority number)
  return validStatuses.reduce((worst, current) => {
    return STATUS_PRIORITY[current] < STATUS_PRIORITY[worst] ? current : worst;
  }, validStatuses[0]);
}

/**
 * Enrich a metric with calculated status, trend, and history
 */
export function enrichMetric(
  metric: Metric,
  allMetrics: Metric[]
): MetricWithCalculations {
  // Get history for this metric (same name)
  const history = allMetrics
    .filter((m) => m.name === metric.name)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate status
  const calculatedStatus = metric.referenceRange
    ? calculateStatus({
        value: metric.value,
        referenceRange: metric.referenceRange,
        optimalRange: metric.optimalRange,
      })
    : null;

  // Calculate trend
  const calculatedTrend = analyzeTrend({
    metrics: history,
    improvementDirection: metric.improvement,
  });

  // Calculate percent change
  let percentChange: number | null = null;
  if (history.length >= 2) {
    const first = history[0].value;
    const last = history[history.length - 1].value;
    const change = calculatePercentChange(first, last);
    percentChange = Number.isFinite(change) ? change : null;
  }

  // Build historical values array
  const historicalValues = history.map((m) => ({
    value: m.value,
    timestamp: m.timestamp,
  }));

  return {
    ...metric,
    calculatedStatus,
    calculatedTrend,
    percentChange,
    historicalValues,
  };
}

/**
 * Aggregate metrics into category summaries for dashboard
 */
export function aggregateByCategory(metrics: Metric[]): CategorySummary[] {
  // Group metrics by category
  const byCategory = new Map<MetricCategory, Metric[]>();

  for (const metric of metrics) {
    const existing = byCategory.get(metric.category) || [];
    byCategory.set(metric.category, [...existing, metric]);
  }

  // Build summaries for all categories (including empty ones)
  return ALL_CATEGORIES.map((category) => {
    const categoryMetrics = byCategory.get(category) || [];
    const info = CATEGORY_INFO[category];

    // Get unique metrics by name (most recent of each)
    const uniqueMetrics = getUniqueMetrics(categoryMetrics);

    // Enrich each metric with calculations
    const enrichedMetrics = uniqueMetrics.map((m) => enrichMetric(m, metrics));

    // Get all statuses
    const statuses = enrichedMetrics.map((m) => m.calculatedStatus);
    const overallStatus = determineOverallStatus(statuses);

    // Find most recent timestamp
    const lastUpdated =
      categoryMetrics.length > 0
        ? categoryMetrics.reduce((latest, m) => {
            const mDate = new Date(m.timestamp);
            return mDate > new Date(latest) ? m.timestamp : latest;
          }, categoryMetrics[0].timestamp)
        : null;

    return {
      category,
      info,
      metricCount: uniqueMetrics.length,
      overallStatus,
      metrics: enrichedMetrics,
      lastUpdated,
    };
  });
}

/**
 * Get unique metrics by name (keeping most recent of each)
 */
function getUniqueMetrics(metrics: Metric[]): Metric[] {
  const byName = new Map<string, Metric>();

  // Sort by timestamp descending to get most recent first
  const sorted = [...metrics].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const metric of sorted) {
    if (!byName.has(metric.name)) {
      byName.set(metric.name, metric);
    }
  }

  return Array.from(byName.values());
}

/**
 * Get summary for a single category
 */
export function getCategorySummary(
  category: MetricCategory,
  metrics: Metric[]
): CategorySummary {
  const allSummaries = aggregateByCategory(metrics);
  return allSummaries.find((s) => s.category === category) || {
    category,
    info: CATEGORY_INFO[category],
    metricCount: 0,
    overallStatus: 'empty',
    metrics: [],
    lastUpdated: null,
  };
}

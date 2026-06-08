import type { Metric, MetricStatus } from "~/types/metrics";

/**
 * Classify a metric's value against its optimal and reference ranges.
 * Returns "optimal" | "borderline" | "deficient" | "excess".
 * Falls back to "optimal" when no referenceRange is defined (defensive quirk —
 * even if the value sits outside optimalRange).
 */
export function getMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange } = metric;
  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) return "optimal";
  if (referenceRange) {
    if (value < referenceRange.min) return "deficient";
    if (value > referenceRange.max) return "excess";
    return "borderline";
  }
  return "optimal";
}

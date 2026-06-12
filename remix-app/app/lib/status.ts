// status.ts — shared status helpers for the chart language (design round 3, Part B)
//
// Chart-language rule 3 (BAKED): status (judgment) maps ONLY through the
// canonical tokens --optimal / --borderline / --deficient / --excess and is
// applied ONLY to bands, dots, badges and band tags — never to data lines.
//
// `statusOf` is the value-against-ranges form used by charts (classify any
// reading — historical or hovered — against a metric's ranges).
// `classifyMetricStatus` in ~/lib/engine remains the canonical Metric-object
// classifier; the two agree whenever both ranges are present (opt ⊆ ref).

import type { MetricStatus } from "~/types/metrics";

export interface StatusRanges {
  /** Reference (lab) range — below reads deficient, above reads excess */
  ref?: { min: number; max: number };
  /** Optimal band — inside ref but outside opt reads borderline */
  opt?: { min: number; max: number };
}

export function statusOf(value: number, ranges: StatusRanges): MetricStatus {
  const { ref, opt } = ranges;
  if (ref) {
    if (value < ref.min) return "deficient";
    if (value > ref.max) return "excess";
  }
  if (opt && (value < opt.min || value > opt.max)) return "borderline";
  return "optimal";
}

/** Canonical status token for a status word; ink when no judgment applies. */
export function statusColor(status?: MetricStatus | null): string {
  switch (status) {
    case "optimal":
      return "var(--optimal)";
    case "borderline":
      return "var(--borderline)";
    case "deficient":
      return "var(--deficient)";
    case "excess":
      return "var(--excess)";
    default:
      return "var(--ink)";
  }
}

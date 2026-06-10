/**
 * metric-targets.ts — Non-PHI target/goal constants for 2026 Q1/Q2.
 *
 * These are re-exports from ~/lib/metrics where the canonical definitions live.
 * This file satisfies the D-06 artifact contract (04-05 PLAN.md must_haves.artifacts)
 * and provides a stable import path for consumers that expect this module path.
 *
 * No PHI (no measured values, genotypes, appointment dates, or biometric snapshots).
 * All values are forward-looking targets / goals.
 */

export type { MetricTarget } from "./metrics";
export { METRIC_TARGETS, getMetricTargets, getProjections } from "./metrics";

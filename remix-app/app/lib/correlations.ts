/**
 * correlations.ts — Pure (non-PHI) correlation utility helpers.
 *
 * These functions are extracted from the former app/lib/seed-data.ts
 * as part of the D-06 non-PHI survivor relocation (Phase 4, Plan 05).
 *
 * No PHI — no measured values, health records, or per-subject data.
 * Safe for import from any module (routes, tests, loaders).
 *
 * Phase 6 (ENG-01): computePearson moved to engine.ts (D-01).
 * Re-exported here under the legacy name for backward compatibility.
 */

// computePearson now lives in engine.ts (ENG-01, D-01).
// Re-exported here under the legacy calculatePearsonCorrelation name.
export { computePearson as calculatePearsonCorrelation } from "./engine";

/**
 * Classify a Pearson r value into a qualitative significance label.
 */
export function getCorrelationSignificance(
  r: number
): "strong" | "moderate" | "weak" | "none" {
  const absR = Math.abs(r);
  if (absR >= 0.7) return "strong";
  if (absR >= 0.4) return "moderate";
  if (absR >= 0.2) return "weak";
  return "none";
}

/**
 * Map a significance label to a Tailwind CSS color class for display.
 */
export function getCorrelationColor(significance: string): string {
  switch (significance) {
    case "strong":
      return "text-green-600 dark:text-green-400";
    case "moderate":
      return "text-blue-600 dark:text-blue-400";
    case "weak":
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "text-gray-500";
  }
}

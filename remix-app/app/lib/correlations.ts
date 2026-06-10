/**
 * correlations.ts — Pure (non-PHI) correlation utility helpers.
 *
 * These functions are extracted from the former app/lib/seed-data.ts
 * as part of the D-06 non-PHI survivor relocation (Phase 4, Plan 05).
 *
 * No PHI — no measured values, health records, or per-subject data.
 * Safe for import from any module (routes, tests, loaders).
 */

/**
 * Compute the Pearson correlation coefficient for two equal-length numeric arrays.
 * Returns 0 for empty, mismatched-length, or zero-variance inputs.
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

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

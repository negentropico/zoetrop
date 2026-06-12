// classifyMetricStatus lives in engine.ts (ENG-01, D-01).
// Re-exported here under the legacy name for backward compatibility.
// Routes and components that import getMetricStatus from ~/lib/metrics continue to work.
export { classifyMetricStatus as getMetricStatus } from "./engine";

// ---------------------------------------------------------------------------
// Metric targets — 2026 Q1 / Q2 goals (non-PHI, static definitions)
// Extracted here so routes can import from ~/lib/metrics instead of
// the blocked ~/lib/real-data (DATA-01 ESLint gate).
// ---------------------------------------------------------------------------

// Milestone timestamps used in projection data points
const MILESTONES = {
  M5: "2026-04-01T12:00:00.000Z",
  M6: "2026-07-01T12:00:00.000Z",
} as const;

export interface MetricTarget {
  metricName: string;
  q1Target: number;
  q2Stretch: number;
  unit: string;
  direction: "higher" | "lower" | "target";
}

export const METRIC_TARGETS: MetricTarget[] = [
  { metricName: "Body Fat", q1Target: 21.5, q2Stretch: 19.5, unit: "%", direction: "lower" },
  { metricName: "Lean Mass", q1Target: 168, q2Stretch: 170, unit: "lbs", direction: "higher" },
  { metricName: "Visceral Fat (VAT)", q1Target: 650, q2Stretch: 600, unit: "g", direction: "lower" },
  { metricName: "Weight", q1Target: 205, q2Stretch: 200, unit: "lbs", direction: "target" },
  { metricName: "Total Testosterone", q1Target: 550, q2Stretch: 600, unit: "ng/dL", direction: "higher" },
  { metricName: "Vitamin B6 (P5P)", q1Target: 40, q2Stretch: 35, unit: "μg/L", direction: "lower" },
  { metricName: "Biotin", q1Target: 3, q2Stretch: 2, unit: "ng/mL", direction: "lower" },
  { metricName: "LDL-C", q1Target: 100, q2Stretch: 90, unit: "mg/dL", direction: "lower" },
  { metricName: "HDL-C", q1Target: 50, q2Stretch: 55, unit: "mg/dL", direction: "higher" },
  { metricName: "Homocysteine", q1Target: 8, q2Stretch: 7, unit: "μmol/L", direction: "lower" },
  { metricName: "eGFR", q1Target: 85, q2Stretch: 90, unit: "mL/min", direction: "higher" },
  { metricName: "Glucose", q1Target: 82, q2Stretch: 80, unit: "mg/dL", direction: "target" },
  { metricName: "Creatinine", q1Target: 1.0, q2Stretch: 0.95, unit: "mg/dL", direction: "lower" },
  { metricName: "Vitamin D", q1Target: 50, q2Stretch: 55, unit: "ng/mL", direction: "target" },
  { metricName: "Zinc", q1Target: 85, q2Stretch: 90, unit: "μg/dL", direction: "target" },
  { metricName: "Total Cholesterol", q1Target: 170, q2Stretch: 165, unit: "mg/dL", direction: "target" },
  { metricName: "Triglycerides", q1Target: 75, q2Stretch: 70, unit: "mg/dL", direction: "lower" },
  { metricName: "Cortisol (AM)", q1Target: 12, q2Stretch: 14, unit: "μg/dL", direction: "target" },
  { metricName: "TSH", q1Target: 2.0, q2Stretch: 1.8, unit: "μIU/mL", direction: "target" },
  { metricName: "Hemoglobin", q1Target: 14.5, q2Stretch: 15.0, unit: "g/dL", direction: "higher" },
  { metricName: "Hematocrit", q1Target: 43, q2Stretch: 44, unit: "%", direction: "higher" },
  { metricName: "HRV (RMSSD)", q1Target: 45, q2Stretch: 48, unit: "ms", direction: "higher" },
  { metricName: "Recovery Score", q1Target: 75, q2Stretch: 80, unit: "%", direction: "higher" },
  { metricName: "Resting Heart Rate", q1Target: 54, q2Stretch: 53, unit: "BPM", direction: "lower" },
  { metricName: "Sleep Duration", q1Target: 7.5, q2Stretch: 7.75, unit: "hrs", direction: "higher" },
];

export function getMetricTargets(metricName: string): MetricTarget | undefined {
  return METRIC_TARGETS.find((t) => t.metricName === metricName);
}

export function getProjections(
  metricName: string
): Array<{ timestamp: string; value: number; isProjection: true; label: string }> {
  const target = getMetricTargets(metricName);
  if (!target) return [];
  return [
    { timestamp: MILESTONES.M5, value: target.q1Target, isProjection: true, label: "M5" },
    { timestamp: MILESTONES.M6, value: target.q2Stretch, isProjection: true, label: "M6" },
  ];
}


// Development seed data for local testing
// This data is used when database is not available

import type { MetricCategory, Metric } from "../types/metrics";
import type {
  ProtocolVersion,
  ProtocolChange,
  Supplement,
  CessationLog,
  Milestone,
} from "../types/protocol";

// Metric templates by category
const metricTemplates: Record<
  MetricCategory,
  Array<{
    name: string;
    unit: string;
    refMin: number;
    refMax: number;
    optMin: number;
    optMax: number;
    improvement: "higher is better" | "lower is better" | "target range";
  }>
> = {
  vitamins: [
    { name: "Vitamin D", unit: "ng/mL", refMin: 30, refMax: 100, optMin: 50, optMax: 80, improvement: "target range" },
    { name: "Vitamin B12", unit: "pg/mL", refMin: 200, refMax: 900, optMin: 400, optMax: 800, improvement: "higher is better" },
    { name: "Folate", unit: "ng/mL", refMin: 3, refMax: 20, optMin: 10, optMax: 20, improvement: "higher is better" },
    { name: "Vitamin B6", unit: "μg/L", refMin: 5, refMax: 50, optMin: 10, optMax: 40, improvement: "target range" },
    { name: "Vitamin E", unit: "mg/L", refMin: 5.5, refMax: 17, optMin: 10, optMax: 15, improvement: "target range" },
    { name: "Vitamin A", unit: "μg/dL", refMin: 30, refMax: 120, optMin: 50, optMax: 100, improvement: "target range" },
    { name: "Vitamin K", unit: "ng/mL", refMin: 0.1, refMax: 2.2, optMin: 0.5, optMax: 1.5, improvement: "target range" },
    { name: "Biotin", unit: "ng/mL", refMin: 0.1, refMax: 1.0, optMin: 0.2, optMax: 0.8, improvement: "target range" },
  ],
  minerals: [
    { name: "Zinc", unit: "μg/dL", refMin: 60, refMax: 120, optMin: 80, optMax: 100, improvement: "target range" },
    { name: "Magnesium (RBC)", unit: "mg/dL", refMin: 4.2, refMax: 6.8, optMin: 5.5, optMax: 6.5, improvement: "higher is better" },
    { name: "Serum Iron", unit: "μg/dL", refMin: 60, refMax: 170, optMin: 80, optMax: 140, improvement: "target range" },
    { name: "Selenium", unit: "μg/L", refMin: 70, refMax: 150, optMin: 100, optMax: 130, improvement: "target range" },
    { name: "Copper", unit: "μg/dL", refMin: 70, refMax: 175, optMin: 90, optMax: 140, improvement: "target range" },
    { name: "Ferritin", unit: "ng/mL", refMin: 30, refMax: 400, optMin: 50, optMax: 200, improvement: "target range" },
  ],
  inflammatory: [
    { name: "hs-CRP", unit: "mg/L", refMin: 0, refMax: 3, optMin: 0, optMax: 1, improvement: "lower is better" },
    { name: "Homocysteine", unit: "μmol/L", refMin: 5, refMax: 15, optMin: 5, optMax: 10, improvement: "lower is better" },
    { name: "ESR", unit: "mm/hr", refMin: 0, refMax: 20, optMin: 0, optMax: 10, improvement: "lower is better" },
    { name: "Fibrinogen", unit: "mg/dL", refMin: 200, refMax: 400, optMin: 200, optMax: 300, improvement: "target range" },
  ],
  metabolic: [
    { name: "Fasting Glucose", unit: "mg/dL", refMin: 70, refMax: 100, optMin: 75, optMax: 90, improvement: "target range" },
    { name: "HbA1c", unit: "%", refMin: 4, refMax: 5.7, optMin: 4.5, optMax: 5.3, improvement: "lower is better" },
    { name: "Fasting Insulin", unit: "μIU/mL", refMin: 2, refMax: 20, optMin: 2, optMax: 8, improvement: "lower is better" },
    { name: "eGFR", unit: "mL/min", refMin: 90, refMax: 120, optMin: 100, optMax: 120, improvement: "higher is better" },
    { name: "BUN", unit: "mg/dL", refMin: 7, refMax: 20, optMin: 10, optMax: 18, improvement: "target range" },
    { name: "Creatinine", unit: "mg/dL", refMin: 0.7, refMax: 1.3, optMin: 0.8, optMax: 1.1, improvement: "target range" },
    { name: "Uric Acid", unit: "mg/dL", refMin: 3.5, refMax: 7.2, optMin: 4, optMax: 6, improvement: "target range" },
  ],
  hormones: [
    { name: "Free Testosterone", unit: "pg/mL", refMin: 5, refMax: 21, optMin: 12, optMax: 20, improvement: "higher is better" },
    { name: "Total Testosterone", unit: "ng/dL", refMin: 300, refMax: 1000, optMin: 500, optMax: 900, improvement: "higher is better" },
    { name: "TSH", unit: "mIU/L", refMin: 0.5, refMax: 4.5, optMin: 1, optMax: 2.5, improvement: "target range" },
    { name: "Free T4", unit: "ng/dL", refMin: 0.8, refMax: 1.8, optMin: 1, optMax: 1.5, improvement: "target range" },
    { name: "Free T3", unit: "pg/mL", refMin: 2.3, refMax: 4.2, optMin: 2.8, optMax: 3.8, improvement: "target range" },
    { name: "Cortisol (AM)", unit: "μg/dL", refMin: 6, refMax: 23, optMin: 10, optMax: 18, improvement: "target range" },
    { name: "DHEA-S", unit: "μg/dL", refMin: 100, refMax: 500, optMin: 200, optMax: 400, improvement: "target range" },
  ],
  autonomic: [
    { name: "HRV (RMSSD)", unit: "ms", refMin: 20, refMax: 120, optMin: 50, optMax: 100, improvement: "higher is better" },
    { name: "Resting Heart Rate", unit: "bpm", refMin: 50, refMax: 80, optMin: 50, optMax: 65, improvement: "lower is better" },
    { name: "Recovery Score", unit: "%", refMin: 0, refMax: 100, optMin: 66, optMax: 100, improvement: "higher is better" },
    { name: "Sleep Performance", unit: "%", refMin: 0, refMax: 100, optMin: 70, optMax: 100, improvement: "higher is better" },
  ],
  bodyComposition: [
    { name: "Body Fat", unit: "%", refMin: 8, refMax: 25, optMin: 10, optMax: 18, improvement: "lower is better" },
    { name: "Lean Mass", unit: "kg", refMin: 50, refMax: 80, optMin: 60, optMax: 75, improvement: "higher is better" },
    { name: "BMI", unit: "kg/m²", refMin: 18.5, refMax: 25, optMin: 20, optMax: 24, improvement: "target range" },
    { name: "Visceral Fat", unit: "cm²", refMin: 0, refMax: 100, optMin: 0, optMax: 50, improvement: "lower is better" },
    { name: "Bone Mineral Density", unit: "g/cm²", refMin: 1, refMax: 1.4, optMin: 1.1, optMax: 1.3, improvement: "higher is better" },
  ],
  lipids: [
    { name: "Total Cholesterol", unit: "mg/dL", refMin: 125, refMax: 200, optMin: 140, optMax: 180, improvement: "target range" },
    { name: "LDL-C", unit: "mg/dL", refMin: 0, refMax: 100, optMin: 0, optMax: 70, improvement: "lower is better" },
    { name: "HDL-C", unit: "mg/dL", refMin: 40, refMax: 100, optMin: 55, optMax: 80, improvement: "higher is better" },
    { name: "Triglycerides", unit: "mg/dL", refMin: 0, refMax: 150, optMin: 0, optMax: 100, improvement: "lower is better" },
    { name: "ApoB", unit: "mg/dL", refMin: 0, refMax: 100, optMin: 0, optMax: 70, improvement: "lower is better" },
  ],
  hematology: [
    { name: "Hemoglobin", unit: "g/dL", refMin: 13.5, refMax: 17.5, optMin: 14, optMax: 16, improvement: "target range" },
    { name: "Hematocrit", unit: "%", refMin: 38, refMax: 50, optMin: 42, optMax: 48, improvement: "target range" },
    { name: "WBC", unit: "K/uL", refMin: 4.5, refMax: 11, optMin: 5, optMax: 8, improvement: "target range" },
    { name: "Platelets", unit: "K/uL", refMin: 150, refMax: 400, optMin: 200, optMax: 350, improvement: "target range" },
    { name: "RBC", unit: "M/uL", refMin: 4.5, refMax: 5.9, optMin: 4.8, optMax: 5.5, improvement: "target range" },
  ],
};

// Generate metrics with realistic values
export function generateSeedMetrics(): Metric[] {
  const metrics: Metric[] = [];
  const categories = Object.keys(metricTemplates) as MetricCategory[];

  categories.forEach((category) => {
    const templates = metricTemplates[category];
    templates.forEach((template, index) => {
      // Generate 4 historical data points over 12 months
      for (let month = 0; month < 4; month++) {
        const monthsAgo = month * 3;
        const date = new Date();
        date.setMonth(date.getMonth() - monthsAgo);

        // Add some variance to make it realistic
        const midpoint = (template.optMin + template.optMax) / 2;
        const range = template.optMax - template.optMin;
        const variance = (Math.random() - 0.5) * range * 1.5;
        const value = Number((midpoint + variance).toFixed(2));

        metrics.push({
          id: `${category}-${index}-${month}`,
          name: template.name,
          value,
          unit: template.unit,
          category,
          subcategory: "default" as any,
          timestamp: date.toISOString(),
          improvement: template.improvement,
          referenceRange: { min: template.refMin, max: template.refMax },
          optimalRange: { min: template.optMin, max: template.optMax },
          source: category === "autonomic" ? "whoop" : "bloodwork",
          syncStatus: "local",
          syncVersion: 1,
        });
      }
    });
  });

  return metrics;
}

// Seed protocol versions
export const seedProtocolVersions: ProtocolVersion[] = [
  {
    id: 1,
    version: "601",
    effectiveDate: "2025-01-01T00:00:00.000Z",
    notes: "Initial protocol based on baseline bloodwork and genetic testing",
  },
  {
    id: 2,
    version: "602",
    effectiveDate: "2025-06-01T00:00:00.000Z",
    notes: "Adjusted for B6 toxicity, removed AG1, refined methylation support",
  },
  {
    id: 3,
    version: "603",
    effectiveDate: "2025-10-01T00:00:00.000Z",
    notes: "Current protocol with FAAH-based cessation timeline",
  },
];

// Seed protocol changes
export const seedProtocolChanges: ProtocolChange[] = [
  // 601 → 602 changes
  { id: 1, versionId: 2, supplementName: "AG1", changeType: "removed", oldDosage: "1 scoop", rationale: "B6/Biotin toxicity" },
  { id: 2, versionId: 2, supplementName: "Methylfolate", changeType: "dosage_changed", oldDosage: "400 mcg", newDosage: "800 mcg", rationale: "MTHFR support" },
  { id: 3, versionId: 2, supplementName: "Vitamin E", changeType: "added", newDosage: "800 IU", rationale: "NAFLD protection" },
  // 602 → 603 changes
  { id: 4, versionId: 3, supplementName: "Creatine", changeType: "timing_changed", oldDosage: "5g AM", newDosage: "5g post-workout", rationale: "Better absorption" },
  { id: 5, versionId: 3, supplementName: "Caffeine", changeType: "dosage_changed", oldDosage: "300 mg", newDosage: "200 mg", rationale: "CYP1A2 slow metabolizer" },
];

// Seed supplements (current protocol 603)
export const seedSupplements: Supplement[] = [
  { id: 1, name: "Vitamin D3", dosage: 5000, unit: "IU", frequency: "daily", tier: "tier1", geneticBasis: "Standard", timing: "with meal", isActive: true },
  { id: 2, name: "Omega-3 (EPA/DHA)", dosage: 2000, unit: "mg", frequency: "daily", tier: "tier1", geneticBasis: "Standard responder", timing: "with meal", isActive: true },
  { id: 3, name: "Magnesium Glycinate", dosage: 400, unit: "mg", frequency: "daily", tier: "tier1", geneticBasis: "Common deficiency", timing: "evening", isActive: true },
  { id: 4, name: "Vitamin E", dosage: 800, unit: "IU", frequency: "daily", tier: "tier1", geneticBasis: "NAFLD 98th percentile", timing: "with meal", isActive: true },
  { id: 5, name: "Methylfolate", dosage: 800, unit: "mcg", frequency: "daily", tier: "tier1", geneticBasis: "MTHFR A1298C", timing: "AM", isActive: true },
  { id: 6, name: "Creatine", dosage: 5, unit: "g", frequency: "daily", tier: "tier2", geneticBasis: "Typical responder", timing: "post-workout", isActive: true },
  { id: 7, name: "Selenium", dosage: 200, unit: "mcg", frequency: "daily", tier: "tier2", geneticBasis: "GPX1 A/G", timing: "with meal", isActive: true },
  { id: 8, name: "CoQ10", dosage: 100, unit: "mg", frequency: "daily", tier: "tier2", timing: "with meal", isActive: true },
  { id: 9, name: "Melatonin", dosage: 0.5, unit: "mg", frequency: "as needed", tier: "as_needed", timing: "30 min before bed", notes: "Cessation sleep support", isActive: true },
];

// Seed cessation log
export const seedCessationLog: CessationLog[] = [
  {
    id: 1,
    startDate: "2025-11-01T00:00:00.000Z",
    currentPhase: "clearing",
    notes: "FAAH variant requires 120+ day minimum. Previous 76-day attempt insufficient.",
  },
];

// Seed milestones
export const seedMilestones: Milestone[] = [
  {
    id: 1,
    date: "2025-01-15T00:00:00.000Z",
    description: "Baseline bloodwork complete",
    protocolVersion: "601",
    biometricSnapshot: { hrv: 45, rhr: 62, recoveryAvg: 55 },
  },
  {
    id: 2,
    date: "2025-06-01T00:00:00.000Z",
    description: "B6 toxicity identified, protocol adjusted",
    protocolVersion: "602",
    biometricSnapshot: { hrv: 52, rhr: 58, recoveryAvg: 62 },
  },
  {
    id: 3,
    date: "2025-10-01T00:00:00.000Z",
    description: "Genetic verification complete, cessation initiated",
    protocolVersion: "603",
    biometricSnapshot: { hrv: 58, rhr: 56, recoveryAvg: 68 },
  },
];

// Helper to get metrics count by category
export function getMetricsCountByCategory(metrics: Metric[]): Record<MetricCategory, number> {
  const counts: Record<MetricCategory, number> = {
    vitamins: 0,
    minerals: 0,
    inflammatory: 0,
    metabolic: 0,
    hormones: 0,
    autonomic: 0,
    bodyComposition: 0,
    lipids: 0,
    hematology: 0,
  };

  metrics.forEach((metric) => {
    counts[metric.category]++;
  });

  return counts;
}

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
import type { GeneticVariant } from "../types/genetics";

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

// Genetic variants based on 01_Profile.md
export const seedGeneticVariants: GeneticVariant[] = [
  // High-Priority Variants (Protocol-Defining)
  {
    id: "nafld",
    gene: "NAFLD Risk",
    genotype: "98th percentile",
    confidence: "K1",
    category: "metabolism",
    impact: "high",
    clinicalImplication: "Liver protection essential",
    protocolAction: "Vitamin E 800 IU, hepatotoxin avoidance",
  },
  {
    id: "faah",
    gene: "FAAH",
    rsid: "rs324420",
    genotype: "Lower activity",
    confidence: "K3",
    category: "metabolism",
    impact: "high",
    clinicalImplication: "Cannabis sensitivity, slower clearance",
    protocolAction: "120+ day cessation minimum",
    notes: "Not in 23andMe array, inferred from SelfDecode",
  },
  {
    id: "cyp1a2",
    gene: "CYP1A2",
    rsid: "rs762551",
    genotype: "Lower activity",
    confidence: "K3",
    category: "metabolism",
    impact: "high",
    clinicalImplication: "Slow caffeine metabolism",
    protocolAction: "<200mg caffeine, AM only",
    notes: "Not in 23andMe array, inferred from SelfDecode",
  },
  {
    id: "mthfr",
    gene: "MTHFR",
    rsid: "rs1801131",
    genotype: "A1298C (G/T)",
    confidence: "K1",
    category: "methylation",
    impact: "high",
    clinicalImplication: "Reduced methylation capacity",
    protocolAction: "Methylfolate 800mcg",
  },
  {
    id: "comt",
    gene: "COMT",
    rsid: "rs4680",
    genotype: "V158M A/G",
    confidence: "K1",
    category: "neurotransmitter",
    impact: "high",
    clinicalImplication: "Intermediate activity, catecholamines 40% slower",
    protocolAction: "Avoid methyl donors, tyrosine",
  },
  {
    id: "apoe",
    gene: "APOE",
    genotype: "E3/E4 (C/T + C/C)",
    confidence: "K1",
    category: "cardiovascular",
    impact: "high",
    clinicalImplication: "Elevated cardiovascular risk",
    protocolAction: "LDL management priority",
  },
  {
    id: "bdnf",
    gene: "BDNF",
    rsid: "rs6265",
    genotype: "C/T Val66Met",
    confidence: "K1",
    category: "neurotransmitter",
    impact: "high",
    clinicalImplication: "Altered neuroplasticity",
    protocolAction: "Exercise non-negotiable",
  },
  // Detoxification & Inflammation
  {
    id: "gpx1",
    gene: "GPX1",
    genotype: "A/G",
    confidence: "K1",
    category: "detoxification",
    impact: "moderate",
    clinicalImplication: "Heterozygous",
    protocolAction: "Selenium 200mcg",
  },
  {
    id: "sod2",
    gene: "SOD2",
    genotype: "A/G",
    confidence: "K1",
    category: "detoxification",
    impact: "moderate",
    clinicalImplication: "Moderate oxidative risk",
    protocolAction: "Antioxidant support",
  },
  {
    id: "nat2",
    gene: "NAT2",
    genotype: "G/G + G/G + A/G",
    confidence: "K1",
    category: "detoxification",
    impact: "moderate",
    clinicalImplication: "Slow acetylator (3 SNPs)",
    protocolAction: "Slower drug/toxin clearance",
  },
  {
    id: "il6",
    gene: "IL-6",
    genotype: "C/G",
    confidence: "K1",
    category: "inflammation",
    impact: "moderate",
    clinicalImplication: "Moderate inflammatory signaling",
    protocolAction: "Anti-inflammatory protocol",
  },
  // Neurotransmitter Extended
  {
    id: "maoa",
    gene: "MAOA",
    rsid: "rs6323",
    genotype: "T (hemizygous)",
    confidence: "K1",
    category: "neurotransmitter",
    impact: "moderate",
    clinicalImplication: "Higher activity (faster breakdown)",
    protocolAction: "Normal monoamine clearance",
    notes: "SelfDecode 'lower activity' claim was incorrect",
  },
  {
    id: "drd2",
    gene: "DRD2/ANKK1",
    genotype: "A/G",
    confidence: "K1",
    category: "neurotransmitter",
    impact: "moderate",
    clinicalImplication: "Taq1A heterozygous",
    protocolAction: "Reduced D2 receptor density",
  },
  // Nutritional
  {
    id: "hfe-h63d",
    gene: "HFE H63D",
    genotype: "C/G",
    confidence: "K1",
    category: "nutritional",
    impact: "low",
    clinicalImplication: "Heterozygous carrier (30% clinical impact)",
    protocolAction: "Monitor iron - markers currently normal",
  },
  {
    id: "bcmo1",
    gene: "BCMO1",
    rsid: "rs12934922",
    genotype: "A/T",
    confidence: "K1",
    category: "nutritional",
    impact: "low",
    clinicalImplication: "Reduced beta-carotene conversion",
    protocolAction: "Consider preformed vitamin A",
  },
  {
    id: "fut2",
    gene: "FUT2",
    genotype: "A/A",
    confidence: "K1",
    category: "nutritional",
    impact: "informational",
    clinicalImplication: "Non-secretor variant",
    protocolAction: "B12/gut microbiome implications",
  },
];

// Supplement-metric correlations (mock calculated data)
export interface SupplementCorrelation {
  id: number;
  supplementId: number;
  supplementName: string;
  metricName: string;
  correlation: number; // -1 to 1 Pearson
  lagDays: number;
  sampleSize: number;
  pValue: number;
  significance: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
}

export const seedCorrelations: SupplementCorrelation[] = [
  // Vitamin D → Vitamin D level
  {
    id: 1,
    supplementId: 1,
    supplementName: "Vitamin D3",
    metricName: "Vitamin D",
    correlation: 0.78,
    lagDays: 30,
    sampleSize: 12,
    pValue: 0.003,
    significance: "strong",
    direction: "positive",
  },
  // Omega-3 → Triglycerides
  {
    id: 2,
    supplementId: 2,
    supplementName: "Omega-3 (EPA/DHA)",
    metricName: "Triglycerides",
    correlation: -0.65,
    lagDays: 60,
    sampleSize: 8,
    pValue: 0.012,
    significance: "moderate",
    direction: "negative",
  },
  // Omega-3 → hs-CRP
  {
    id: 3,
    supplementId: 2,
    supplementName: "Omega-3 (EPA/DHA)",
    metricName: "hs-CRP",
    correlation: -0.52,
    lagDays: 90,
    sampleSize: 8,
    pValue: 0.045,
    significance: "moderate",
    direction: "negative",
  },
  // Magnesium → HRV
  {
    id: 4,
    supplementId: 3,
    supplementName: "Magnesium Glycinate",
    metricName: "HRV (RMSSD)",
    correlation: 0.45,
    lagDays: 14,
    sampleSize: 30,
    pValue: 0.02,
    significance: "moderate",
    direction: "positive",
  },
  // Magnesium → Sleep
  {
    id: 5,
    supplementId: 3,
    supplementName: "Magnesium Glycinate",
    metricName: "Sleep Performance",
    correlation: 0.38,
    lagDays: 7,
    sampleSize: 30,
    pValue: 0.04,
    significance: "weak",
    direction: "positive",
  },
  // Vitamin E → NAFLD markers (ALT)
  {
    id: 6,
    supplementId: 4,
    supplementName: "Vitamin E",
    metricName: "ALT",
    correlation: -0.42,
    lagDays: 90,
    sampleSize: 6,
    pValue: 0.08,
    significance: "weak",
    direction: "negative",
  },
  // Methylfolate → Homocysteine
  {
    id: 7,
    supplementId: 5,
    supplementName: "Methylfolate",
    metricName: "Homocysteine",
    correlation: -0.71,
    lagDays: 60,
    sampleSize: 8,
    pValue: 0.005,
    significance: "strong",
    direction: "negative",
  },
  // Creatine → Lean Mass
  {
    id: 8,
    supplementId: 6,
    supplementName: "Creatine",
    metricName: "Lean Mass",
    correlation: 0.55,
    lagDays: 90,
    sampleSize: 4,
    pValue: 0.09,
    significance: "moderate",
    direction: "positive",
  },
  // Selenium → GPX activity (proxy)
  {
    id: 9,
    supplementId: 7,
    supplementName: "Selenium",
    metricName: "Selenium",
    correlation: 0.82,
    lagDays: 30,
    sampleSize: 6,
    pValue: 0.001,
    significance: "strong",
    direction: "positive",
  },
  // CoQ10 → Recovery
  {
    id: 10,
    supplementId: 8,
    supplementName: "CoQ10",
    metricName: "Recovery Score",
    correlation: 0.32,
    lagDays: 30,
    sampleSize: 20,
    pValue: 0.12,
    significance: "weak",
    direction: "positive",
  },
];

// Correlation calculation utilities
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

export function getCorrelationSignificance(
  r: number
): "strong" | "moderate" | "weak" | "none" {
  const absR = Math.abs(r);
  if (absR >= 0.7) return "strong";
  if (absR >= 0.4) return "moderate";
  if (absR >= 0.2) return "weak";
  return "none";
}

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

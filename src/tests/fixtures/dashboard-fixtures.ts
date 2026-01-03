/**
 * Test Fixtures for Dashboard Components
 *
 * Provides seed data for testing dashboard, categories, and metrics.
 */

import type { Metric, MetricCategory } from '@/types/metrics';
import type {
  MetricWithCalculations,
  CategorySummary,
  ImportPreview,
} from '@/types/components';
import { CATEGORY_INFO } from '@/types/metrics';

// =============================================================================
// SEED METRICS
// =============================================================================

export const seedMetrics: Metric[] = [
  // Autonomic - from WHOOP (optimal)
  {
    id: 'hrv-001',
    name: 'HRV (RMSSD)',
    value: 55,
    unit: 'ms',
    category: 'autonomic',
    subcategory: 'hrv',
    timestamp: '2026-01-03T08:00:00.000Z',
    improvement: 'higher is better',
    referenceRange: { min: 20, max: 100 },
    optimalRange: { min: 50, max: 100 },
    source: 'whoop',
    syncStatus: 'local',
    syncVersion: 1,
  },
  {
    id: 'recovery-001',
    name: 'Recovery Score',
    value: 72,
    unit: '%',
    category: 'autonomic',
    subcategory: 'recovery',
    timestamp: '2026-01-03T08:00:00.000Z',
    improvement: 'higher is better',
    referenceRange: { min: 0, max: 100 },
    optimalRange: { min: 67, max: 100 },
    source: 'whoop',
    syncStatus: 'local',
    syncVersion: 1,
  },
  {
    id: 'rhr-001',
    name: 'Resting Heart Rate',
    value: 58,
    unit: 'bpm',
    category: 'autonomic',
    subcategory: 'hrv',
    timestamp: '2026-01-03T08:00:00.000Z',
    improvement: 'lower is better',
    referenceRange: { min: 40, max: 100 },
    optimalRange: { min: 40, max: 60 },
    source: 'whoop',
    syncStatus: 'local',
    syncVersion: 1,
  },
  // Vitamins - bloodwork (optimal)
  {
    id: 'vitd-001',
    name: 'Vitamin D',
    value: 55,
    unit: 'ng/mL',
    category: 'vitamins',
    subcategory: 'fat-soluble',
    timestamp: '2026-01-01T12:00:00.000Z',
    improvement: 'higher is better',
    referenceRange: { min: 30, max: 100 },
    optimalRange: { min: 50, max: 80 },
    source: 'bloodwork',
    syncStatus: 'local',
    syncVersion: 1,
  },
  // Inflammatory - borderline status
  {
    id: 'crp-001',
    name: 'hs-CRP',
    value: 1.8,
    unit: 'mg/L',
    category: 'inflammatory',
    subcategory: 'crp',
    timestamp: '2026-01-01T12:00:00.000Z',
    improvement: 'lower is better',
    referenceRange: { min: 0, max: 3 },
    optimalRange: { min: 0, max: 1 },
    source: 'bloodwork',
    syncStatus: 'local',
    syncVersion: 1,
  },
  // Metabolic - deficient status
  {
    id: 'glucose-001',
    name: 'Fasting Glucose',
    value: 65,
    unit: 'mg/dL',
    category: 'metabolic',
    subcategory: 'glucose',
    timestamp: '2026-01-01T12:00:00.000Z',
    improvement: 'lower is better',
    referenceRange: { min: 70, max: 100 },
    optimalRange: { min: 70, max: 85 },
    source: 'bloodwork',
    syncStatus: 'local',
    syncVersion: 1,
  },
];

export const emptyMetrics: Metric[] = [];

export const singleCategoryMetrics: Metric[] = seedMetrics.filter(
  (m) => m.category === 'autonomic'
);

// =============================================================================
// METRICS WITH CALCULATIONS
// =============================================================================

export const optimalMetricWithCalc: MetricWithCalculations = {
  ...seedMetrics[0],
  calculatedStatus: 'optimal',
  calculatedTrend: 'stable',
  percentChange: 0,
  historicalValues: [{ value: 55, timestamp: '2026-01-03T08:00:00.000Z' }],
};

export const borderlineMetricWithCalc: MetricWithCalculations = {
  ...seedMetrics[4], // hs-CRP
  calculatedStatus: 'borderline',
  calculatedTrend: 'declining',
  percentChange: 20,
  historicalValues: [
    { value: 1.5, timestamp: '2025-12-01T12:00:00.000Z' },
    { value: 1.8, timestamp: '2026-01-01T12:00:00.000Z' },
  ],
};

export const deficientMetricWithCalc: MetricWithCalculations = {
  ...seedMetrics[5], // Fasting Glucose
  calculatedStatus: 'deficient',
  calculatedTrend: 'stable',
  percentChange: -2,
  historicalValues: [
    { value: 66, timestamp: '2025-12-01T12:00:00.000Z' },
    { value: 65, timestamp: '2026-01-01T12:00:00.000Z' },
  ],
};

export const improvingMetricWithCalc: MetricWithCalculations = {
  id: 'hrv-trend',
  name: 'HRV (RMSSD)',
  value: 60,
  unit: 'ms',
  category: 'autonomic',
  subcategory: 'hrv',
  timestamp: '2026-01-03T08:00:00.000Z',
  improvement: 'higher is better',
  referenceRange: { min: 20, max: 100 },
  optimalRange: { min: 50, max: 100 },
  source: 'whoop',
  syncStatus: 'local',
  syncVersion: 1,
  calculatedStatus: 'optimal',
  calculatedTrend: 'improving',
  percentChange: 15,
  historicalValues: [
    { value: 52, timestamp: '2025-12-15T08:00:00.000Z' },
    { value: 55, timestamp: '2026-01-01T08:00:00.000Z' },
    { value: 60, timestamp: '2026-01-03T08:00:00.000Z' },
  ],
};

// =============================================================================
// CATEGORY SUMMARIES
// =============================================================================

export const autonomicSummary: CategorySummary = {
  category: 'autonomic',
  info: CATEGORY_INFO.autonomic,
  metricCount: 3,
  overallStatus: 'optimal',
  metrics: [
    { ...seedMetrics[0], calculatedStatus: 'optimal', calculatedTrend: 'stable', percentChange: 0, historicalValues: [] },
    { ...seedMetrics[1], calculatedStatus: 'optimal', calculatedTrend: 'stable', percentChange: 0, historicalValues: [] },
    { ...seedMetrics[2], calculatedStatus: 'optimal', calculatedTrend: 'stable', percentChange: 0, historicalValues: [] },
  ] as MetricWithCalculations[],
  lastUpdated: '2026-01-03T08:00:00.000Z',
};

export const inflammatorySummary: CategorySummary = {
  category: 'inflammatory',
  info: CATEGORY_INFO.inflammatory,
  metricCount: 1,
  overallStatus: 'borderline',
  metrics: [borderlineMetricWithCalc],
  lastUpdated: '2026-01-01T12:00:00.000Z',
};

export const emptyCategorySummary: CategorySummary = {
  category: 'minerals',
  info: CATEGORY_INFO.minerals,
  metricCount: 0,
  overallStatus: 'empty',
  metrics: [],
  lastUpdated: null,
};

export const allCategorySummaries: CategorySummary[] = [
  { ...autonomicSummary },
  {
    category: 'vitamins',
    info: CATEGORY_INFO.vitamins,
    metricCount: 1,
    overallStatus: 'optimal',
    metrics: [{ ...seedMetrics[3], calculatedStatus: 'optimal', calculatedTrend: 'stable', percentChange: 0, historicalValues: [] }] as MetricWithCalculations[],
    lastUpdated: '2026-01-01T12:00:00.000Z',
  },
  { ...inflammatorySummary },
  {
    category: 'metabolic',
    info: CATEGORY_INFO.metabolic,
    metricCount: 1,
    overallStatus: 'deficient',
    metrics: [deficientMetricWithCalc],
    lastUpdated: '2026-01-01T12:00:00.000Z',
  },
  { ...emptyCategorySummary },
  {
    category: 'hormones',
    info: CATEGORY_INFO.hormones,
    metricCount: 0,
    overallStatus: 'empty',
    metrics: [],
    lastUpdated: null,
  },
  {
    category: 'bodyComposition',
    info: CATEGORY_INFO.bodyComposition,
    metricCount: 0,
    overallStatus: 'empty',
    metrics: [],
    lastUpdated: null,
  },
  {
    category: 'lipids',
    info: CATEGORY_INFO.lipids,
    metricCount: 0,
    overallStatus: 'empty',
    metrics: [],
    lastUpdated: null,
  },
  {
    category: 'hematology',
    info: CATEGORY_INFO.hematology,
    metricCount: 0,
    overallStatus: 'empty',
    metrics: [],
    lastUpdated: null,
  },
];

// =============================================================================
// IMPORT PREVIEW
// =============================================================================

export const validImportPreview: ImportPreview = {
  source: 'whoop',
  filename: 'whoop_analysis_report.json',
  dataPeriod: { start: '2025-12-01', end: '2026-01-03' },
  metrics: [
    { name: 'HRV (RMSSD)', value: 45, unit: 'ms', subcategory: 'hrv', willReplace: false },
    { name: 'Recovery Score', value: 72, unit: '%', subcategory: 'recovery', willReplace: false },
    { name: 'Resting Heart Rate', value: 58, unit: 'bpm', subcategory: 'hrv', willReplace: false },
    { name: 'Sleep Duration', value: 7.2, unit: 'hours', subcategory: 'sleep', willReplace: false },
    { name: 'Daily Strain', value: 12.5, unit: '', subcategory: 'recovery', willReplace: false },
  ],
  warnings: [],
  errors: [],
};

export const importPreviewWithWarnings: ImportPreview = {
  ...validImportPreview,
  warnings: ['Some optional fields were missing from the report'],
};

export const importPreviewWithErrors: ImportPreview = {
  ...validImportPreview,
  metrics: [],
  errors: ['Missing required field: key_metrics'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Seed localStorage with test metrics
 */
export function seedLocalStorage(): void {
  localStorage.setItem(
    'wellness-metrics',
    JSON.stringify({
      metrics: seedMetrics,
      lastUpdated: new Date().toISOString(),
      syncVersion: 1,
    })
  );
}

/**
 * Clear localStorage
 */
export function clearLocalStorage(): void {
  localStorage.clear();
}

/**
 * Create a metric with specific status for testing
 */
export function createMetricWithStatus(
  status: 'optimal' | 'borderline' | 'deficient' | 'excess',
  category: MetricCategory = 'vitamins'
): MetricWithCalculations {
  const base = seedMetrics[3]; // Vitamin D as template
  return {
    ...base,
    id: `test-${status}-${Date.now()}`,
    category,
    calculatedStatus: status,
    calculatedTrend: 'stable',
    percentChange: 0,
    historicalValues: [],
  };
}

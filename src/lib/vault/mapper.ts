/**
 * Staging to Metrics Mapper
 *
 * Converts staging format data into Metric records for storage.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StagingFile, StagingMetric, StagingImportResult } from '@/types/staging';
import type { Metric, MetricRange } from '@/types/metrics';

/**
 * Configuration for staging import
 */
export interface StagingMapConfig {
  /** Categories to include (default: all) */
  includeCategories?: string[];
  /** Categories to exclude */
  excludeCategories?: string[];
  /** Only import metrics with specific statuses */
  filterByStatus?: string[];
  /** Override timestamp for all metrics */
  timestamp?: string;
}

/**
 * Result of mapping staging data
 */
export interface StagingMapResult {
  metrics: Metric[];
  skipped: string[];
  warnings: string[];
}

/**
 * Convert staging range to metric range
 */
function convertRange(stagingRange?: { min?: number; max?: number; operator?: string; value?: number }): MetricRange | undefined {
  if (!stagingRange) return undefined;

  // Handle operator-based ranges (convert to min/max)
  if (stagingRange.operator && stagingRange.value !== undefined) {
    switch (stagingRange.operator) {
      case 'lt':
      case 'lte':
        return { min: 0, max: stagingRange.value };
      case 'gt':
      case 'gte':
        return { min: stagingRange.value, max: stagingRange.value * 2 }; // Estimate upper bound
      default:
        return undefined;
    }
  }

  // Handle min/max ranges
  if (stagingRange.min !== undefined || stagingRange.max !== undefined) {
    return {
      min: stagingRange.min ?? 0,
      max: stagingRange.max ?? (stagingRange.min ?? 0) * 2,
    };
  }

  return undefined;
}

/**
 * Determine subcategory from staging metric
 */
function determineSubcategory(metric: StagingMetric): string | undefined {
  if (metric.subcategory) return metric.subcategory;

  const name = metric.name.toLowerCase();

  // Vitamins
  if (metric.category === 'vitamins') {
    if (name.includes('b12') || name.includes('b6') || name.includes('folate') || name.includes('biotin')) {
      return 'b-vitamins';
    }
    if (name.includes('vitamin d') || name.includes('vitamin a') || name.includes('vitamin e') || name.includes('vitamin k')) {
      return 'fat-soluble';
    }
    return 'water-soluble';
  }

  // Hormones
  if (metric.category === 'hormones') {
    if (name.includes('testosterone') || name.includes('estrogen') || name.includes('dhea')) {
      return 'sex-hormones';
    }
    if (name.includes('tsh') || name.includes('t3') || name.includes('t4') || name.includes('thyroid')) {
      return 'thyroid';
    }
    if (name.includes('cortisol') || name.includes('dhea')) {
      return 'stress-hormones';
    }
  }

  // Metabolic
  if (metric.category === 'metabolic') {
    if (name.includes('glucose') || name.includes('hba1c') || name.includes('insulin') || name.includes('homa')) {
      return 'glucose';
    }
    if (name.includes('creatinine') || name.includes('egfr') || name.includes('bun')) {
      return 'kidney';
    }
    if (name.includes('alt') || name.includes('ast') || name.includes('ggt') || name.includes('liver')) {
      return 'liver';
    }
  }

  // Body Composition
  if (metric.category === 'bodyComposition') {
    if (name.includes('fat') || name.includes('adipose') || name.includes('vat')) {
      return 'fat';
    }
    if (name.includes('lean') || name.includes('muscle')) {
      return 'lean';
    }
    if (name.includes('bone') || name.includes('bmc')) {
      return 'bone';
    }
  }

  return undefined;
}

/**
 * Map a single staging metric to a Metric record
 */
function mapStagingMetric(stagingMetric: StagingMetric, timestamp: string): Metric {
  const subcategory = determineSubcategory(stagingMetric);

  const metric: Metric = {
    id: uuidv4(),
    name: stagingMetric.name,
    value: stagingMetric.value,
    unit: stagingMetric.unit,
    category: stagingMetric.category,
    timestamp,
    syncStatus: 'local',
    syncVersion: 1,
    source: 'vault',
  };

  // Add optional fields
  if (subcategory) {
    (metric as any).subcategory = subcategory;
  }

  if (stagingMetric.improvement) {
    (metric as any).improvement = stagingMetric.improvement;
  }

  const referenceRange = convertRange(stagingMetric.referenceRange);
  if (referenceRange) {
    metric.referenceRange = referenceRange;
  }

  const optimalRange = convertRange(stagingMetric.optimalRange);
  if (optimalRange) {
    metric.optimalRange = optimalRange;
  }

  if (stagingMetric.notes && stagingMetric.notes.length > 0) {
    (metric as any).notes = stagingMetric.notes.join('; ');
  }

  return metric;
}

/**
 * Map staging file to metrics array
 */
export function mapStagingToMetrics(
  stagingFile: StagingFile,
  config?: StagingMapConfig
): StagingMapResult {
  const metrics: Metric[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  const timestamp = config?.timestamp || stagingFile.source.collectedAt || new Date().toISOString();

  for (const category of stagingFile.categories) {
    // Check category filters
    if (config?.includeCategories && !config.includeCategories.includes(category.category)) {
      skipped.push(`Category excluded: ${category.category}`);
      continue;
    }

    if (config?.excludeCategories?.includes(category.category)) {
      skipped.push(`Category excluded: ${category.category}`);
      continue;
    }

    for (const stagingMetric of category.metrics) {
      // Check status filter
      if (config?.filterByStatus && !config.filterByStatus.includes(stagingMetric.status)) {
        skipped.push(`${stagingMetric.name} (status: ${stagingMetric.status})`);
        continue;
      }

      try {
        const metric = mapStagingMetric(stagingMetric, timestamp);
        metrics.push(metric);
      } catch (error) {
        warnings.push(`Failed to map metric: ${stagingMetric.name}`);
      }
    }
  }

  return { metrics, skipped, warnings };
}

/**
 * Preview what would be imported from staging file
 */
export function previewStagingImport(stagingFile: StagingFile): {
  totalMetrics: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  criticalMetrics: string[];
  warnings: string[];
} {
  const criticalMetrics: string[] = [];
  const warnings: string[] = [];

  for (const category of stagingFile.categories) {
    for (const metric of category.metrics) {
      if (metric.priority === 'CRITICAL' || metric.status === 'deficient' || metric.status === 'excess') {
        criticalMetrics.push(`${metric.name}: ${metric.value} ${metric.unit} (${metric.status})`);
      }
    }
  }

  // Add data currency warning if old
  const collectedDate = new Date(stagingFile.source.collectedAt);
  const daysSinceCollection = Math.floor((Date.now() - collectedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceCollection > 90) {
    warnings.push(`Data is ${daysSinceCollection} days old - consider retesting`);
  }

  return {
    totalMetrics: stagingFile.summary.totalMetrics,
    byCategory: stagingFile.summary.byCategory,
    byStatus: stagingFile.summary.byStatus,
    criticalMetrics,
    warnings: [...stagingFile.validation.warnings, ...warnings],
  };
}

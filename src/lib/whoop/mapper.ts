/**
 * WHOOP Mapper
 *
 * Maps WHOOP analysis data to AutonomicMetric array.
 */

import { v4 as uuidv4 } from 'uuid';
import type { WhoopAnalysisReport } from '@/types/whoop';
import type { AutonomicMetric, MetricRange } from '@/types/metrics';

/**
 * Configuration for WHOOP mapping
 */
export interface WhoopMapConfig {
  includeHrv?: boolean;
  includeRecovery?: boolean;
  includeRhr?: boolean;
  includeSleep?: boolean;
  includeStrain?: boolean;
  timestamp?: string;
}

/**
 * Result of mapping WHOOP data to metrics
 */
export interface WhoopMapResult {
  metrics: AutonomicMetric[];
  skipped: string[];
  warnings: string[];
}

/**
 * Default reference ranges for WHOOP metrics
 */
const WHOOP_REFERENCE_RANGES: Record<string, MetricRange> = {
  hrv: { min: 20, max: 100 },
  recovery: { min: 0, max: 100 },
  rhr: { min: 40, max: 80 },
  sleep: { min: 6, max: 9 },
  strain: { min: 0, max: 21 },
};

/**
 * Default optimal ranges for WHOOP metrics
 */
const WHOOP_OPTIMAL_RANGES: Record<string, MetricRange> = {
  hrv: { min: 50, max: 100 },
  recovery: { min: 67, max: 100 },
  rhr: { min: 45, max: 60 },
  sleep: { min: 7, max: 9 },
  strain: { min: 10, max: 18 },
};

/**
 * Parse WHOOP datetime string to ISO format
 */
function parseWhoopDatetime(datetime: string): string {
  try {
    const date = new Date(datetime);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    const isoFormat = datetime.replace(' ', 'T');
    const isoDate = new Date(isoFormat);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString();
    }

    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Default config values
 */
const DEFAULT_CONFIG: Required<Omit<WhoopMapConfig, 'timestamp'>> = {
  includeHrv: true,
  includeRecovery: true,
  includeRhr: true,
  includeSleep: true,
  includeStrain: true,
};

/**
 * Map parsed WHOOP data to AutonomicMetric array
 */
export function mapWhoopToMetrics(
  report: WhoopAnalysisReport,
  config?: WhoopMapConfig
): WhoopMapResult {
  const metrics: AutonomicMetric[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const timestamp = config?.timestamp || parseWhoopDatetime(report.generated_at);

  // Helper to create a metric
  const createMetric = (
    name: string,
    value: number,
    unit: string,
    subcategory: 'hrv' | 'bloodPressure' | 'sleep' | 'recovery',
    improvement: 'higher is better' | 'lower is better',
    rangeKey: string,
    description?: string
  ): AutonomicMetric => ({
    id: uuidv4(),
    name,
    value,
    unit,
    category: 'autonomic',
    subcategory,
    timestamp,
    improvement,
    source: 'whoop',
    syncStatus: 'local',
    syncVersion: 1,
    referenceRange: WHOOP_REFERENCE_RANGES[rangeKey],
    optimalRange: WHOOP_OPTIMAL_RANGES[rangeKey],
    description,
  });

  // HRV
  if (mergedConfig.includeHrv) {
    if (typeof report.key_metrics.avg_hrv_rmssd === 'number') {
      metrics.push(
        createMetric(
          'HRV (RMSSD)',
          report.key_metrics.avg_hrv_rmssd,
          'ms',
          'hrv',
          'higher is better',
          'hrv',
          'Heart Rate Variability - average RMSSD from WHOOP'
        )
      );
    } else {
      skipped.push('HRV');
      warnings.push('HRV data not available in report');
    }
  } else {
    skipped.push('HRV');
  }

  // Recovery Score
  if (mergedConfig.includeRecovery) {
    if (typeof report.key_metrics.avg_recovery_score === 'number') {
      metrics.push(
        createMetric(
          'Recovery Score',
          report.key_metrics.avg_recovery_score,
          '%',
          'recovery',
          'higher is better',
          'recovery',
          'Daily recovery score from WHOOP'
        )
      );
    } else {
      skipped.push('Recovery');
      warnings.push('Recovery data not available in report');
    }
  } else {
    skipped.push('Recovery');
  }

  // Resting Heart Rate
  if (mergedConfig.includeRhr) {
    if (typeof report.key_metrics.avg_resting_heart_rate === 'number') {
      metrics.push(
        createMetric(
          'Resting Heart Rate',
          report.key_metrics.avg_resting_heart_rate,
          'bpm',
          'hrv',
          'lower is better',
          'rhr',
          'Resting heart rate from WHOOP'
        )
      );
    } else {
      skipped.push('RHR');
      warnings.push('Resting heart rate data not available in report');
    }
  } else {
    skipped.push('RHR');
  }

  // Sleep Duration
  if (mergedConfig.includeSleep) {
    if (typeof report.key_metrics.avg_asleep === 'number') {
      metrics.push(
        createMetric(
          'Sleep Duration',
          report.key_metrics.avg_asleep,
          'hours',
          'sleep',
          'higher is better',
          'sleep',
          'Average time asleep from WHOOP'
        )
      );
    } else {
      skipped.push('Sleep');
      warnings.push('Sleep data not available in report');
    }
  } else {
    skipped.push('Sleep');
  }

  // Daily Strain
  if (mergedConfig.includeStrain) {
    if (typeof report.key_metrics.avg_day_strain === 'number' && report.key_metrics.avg_day_strain > 0) {
      metrics.push(
        createMetric(
          'Daily Strain',
          report.key_metrics.avg_day_strain,
          'strain',
          'recovery',
          'higher is better',
          'strain',
          'Daily strain score from WHOOP'
        )
      );
    } else {
      skipped.push('Strain');
      warnings.push('Strain data not available in report');
    }
  } else {
    skipped.push('Strain');
  }

  return { metrics, skipped, warnings };
}

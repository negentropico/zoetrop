/**
 * WHOOP CSV Mapper
 *
 * Maps parsed WHOOP CSV data to AutonomicMetric array.
 * Creates individual metrics per day (not just averages).
 */

import { v4 as uuidv4 } from 'uuid';
import type { WhoopCsvData, WhoopCsvRow } from '@/types/whoop';
import type { AutonomicMetric, MetricRange } from '@/types/metrics';

/**
 * Configuration for CSV mapping
 */
export interface WhoopCsvMapConfig {
  includeHrv?: boolean;
  includeRecovery?: boolean;
  includeRhr?: boolean;
  includeSleep?: boolean;
  includeStrain?: boolean;
  /** Import all historical data or just most recent */
  importMode?: 'all' | 'latest' | 'recent-week' | 'recent-month';
}

/**
 * Result of mapping CSV data to metrics
 */
export interface WhoopCsvMapResult {
  metrics: AutonomicMetric[];
  skipped: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    metricsCreated: number;
    dateRange: { start: string; end: string };
  };
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
 * Default config values
 */
const DEFAULT_CONFIG: Required<WhoopCsvMapConfig> = {
  includeHrv: true,
  includeRecovery: true,
  includeRhr: true,
  includeSleep: true,
  includeStrain: true,
  importMode: 'all',
};

/**
 * Parse WHOOP datetime string to ISO format
 */
function parseTimestamp(datetime: string): string {
  try {
    // WHOOP uses format "YYYY-MM-DD HH:MM:SS"
    const isoFormat = datetime.replace(' ', 'T');
    const date = new Date(isoFormat);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Filter rows based on import mode
 */
function filterRowsByMode(rows: WhoopCsvRow[], mode: string): WhoopCsvRow[] {
  if (mode === 'all') {
    return rows;
  }

  const now = new Date();
  let cutoffDate: Date;

  switch (mode) {
    case 'latest':
      return rows.slice(0, 1);
    case 'recent-week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'recent-month':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return rows;
  }

  return rows.filter((row) => {
    const rowDate = new Date(row.cycleStartTime);
    return rowDate >= cutoffDate;
  });
}

/**
 * Create a metric from a CSV row value
 */
function createMetric(
  name: string,
  value: number,
  unit: string,
  subcategory: 'hrv' | 'bloodPressure' | 'sleep' | 'recovery',
  improvement: 'higher is better' | 'lower is better',
  rangeKey: string,
  timestamp: string,
  description?: string
): AutonomicMetric {
  return {
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
  };
}

/**
 * Map a single CSV row to metrics
 */
function mapRowToMetrics(row: WhoopCsvRow, config: Required<WhoopCsvMapConfig>): AutonomicMetric[] {
  const metrics: AutonomicMetric[] = [];
  const timestamp = parseTimestamp(row.cycleStartTime);
  const dateStr = row.cycleStartTime.split(' ')[0];

  // HRV
  if (config.includeHrv && row.hrv !== null) {
    metrics.push(
      createMetric(
        'HRV (RMSSD)',
        row.hrv,
        'ms',
        'hrv',
        'higher is better',
        'hrv',
        timestamp,
        `Heart Rate Variability for ${dateStr}`
      )
    );
  }

  // Recovery Score
  if (config.includeRecovery && row.recoveryScore !== null) {
    metrics.push(
      createMetric(
        'Recovery Score',
        row.recoveryScore,
        '%',
        'recovery',
        'higher is better',
        'recovery',
        timestamp,
        `Recovery score for ${dateStr}`
      )
    );
  }

  // Resting Heart Rate
  if (config.includeRhr && row.restingHeartRate !== null) {
    metrics.push(
      createMetric(
        'Resting Heart Rate',
        row.restingHeartRate,
        'bpm',
        'hrv',
        'lower is better',
        'rhr',
        timestamp,
        `Resting heart rate for ${dateStr}`
      )
    );
  }

  // Sleep Duration (convert minutes to hours)
  if (config.includeSleep && row.asleepDuration !== null) {
    const sleepHours = Math.round((row.asleepDuration / 60) * 100) / 100;
    metrics.push(
      createMetric(
        'Sleep Duration',
        sleepHours,
        'hours',
        'sleep',
        'higher is better',
        'sleep',
        timestamp,
        `Time asleep for ${dateStr}`
      )
    );
  }

  // Daily Strain
  if (config.includeStrain && row.dayStrain !== null && row.dayStrain > 0) {
    metrics.push(
      createMetric(
        'Daily Strain',
        row.dayStrain,
        'strain',
        'recovery',
        'higher is better',
        'strain',
        timestamp,
        `Daily strain for ${dateStr}`
      )
    );
  }

  return metrics;
}

/**
 * Map parsed WHOOP CSV data to AutonomicMetric array
 */
export function mapWhoopCsvToMetrics(
  data: WhoopCsvData,
  config?: WhoopCsvMapConfig
): WhoopCsvMapResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const warnings: string[] = [];
  const skipped: string[] = [];

  // Filter rows based on import mode
  const filteredRows = filterRowsByMode(data.rows, mergedConfig.importMode);

  if (filteredRows.length === 0) {
    return {
      metrics: [],
      skipped: ['All rows filtered out by import mode'],
      warnings: [`No data found for import mode: ${mergedConfig.importMode}`],
      summary: {
        totalRows: data.rowCount,
        metricsCreated: 0,
        dateRange: data.dateRange,
      },
    };
  }

  // Map each row to metrics
  const allMetrics: AutonomicMetric[] = [];
  let rowsWithNoData = 0;

  for (const row of filteredRows) {
    const rowMetrics = mapRowToMetrics(row, mergedConfig);
    if (rowMetrics.length === 0) {
      rowsWithNoData++;
    } else {
      allMetrics.push(...rowMetrics);
    }
  }

  if (rowsWithNoData > 0) {
    warnings.push(`${rowsWithNoData} rows had no valid metric data`);
  }

  // Track what was skipped based on config
  if (!mergedConfig.includeHrv) skipped.push('HRV');
  if (!mergedConfig.includeRecovery) skipped.push('Recovery');
  if (!mergedConfig.includeRhr) skipped.push('RHR');
  if (!mergedConfig.includeSleep) skipped.push('Sleep');
  if (!mergedConfig.includeStrain) skipped.push('Strain');

  return {
    metrics: allMetrics,
    skipped,
    warnings,
    summary: {
      totalRows: filteredRows.length,
      metricsCreated: allMetrics.length,
      dateRange: data.dateRange,
    },
  };
}

/**
 * Calculate averages from CSV data (for preview)
 */
export function calculateCsvAverages(data: WhoopCsvData): {
  avgHrv: number | null;
  avgRecovery: number | null;
  avgRhr: number | null;
  avgSleep: number | null;
  avgStrain: number | null;
} {
  const hrvValues = data.rows.map((r) => r.hrv).filter((v): v is number => v !== null);
  const recoveryValues = data.rows.map((r) => r.recoveryScore).filter((v): v is number => v !== null);
  const rhrValues = data.rows.map((r) => r.restingHeartRate).filter((v): v is number => v !== null);
  const sleepValues = data.rows
    .map((r) => r.asleepDuration)
    .filter((v): v is number => v !== null)
    .map((v) => v / 60); // Convert to hours
  const strainValues = data.rows
    .map((r) => r.dayStrain)
    .filter((v): v is number => v !== null && v > 0);

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return {
    avgHrv: avg(hrvValues),
    avgRecovery: avg(recoveryValues),
    avgRhr: avg(rhrValues),
    avgSleep: avg(sleepValues),
    avgStrain: avg(strainValues),
  };
}

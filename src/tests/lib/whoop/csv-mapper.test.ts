/**
 * Tests for WHOOP CSV Mapper
 */

import { describe, it, expect } from 'vitest';
import { mapWhoopCsvToMetrics, calculateCsvAverages } from '@/lib/whoop/csv-mapper';
import type { WhoopCsvData } from '@/types/whoop';

// Sample parsed CSV data
const SAMPLE_CSV_DATA: WhoopCsvData = {
  rows: [
    {
      cycleStartTime: '2026-01-01 01:09:02',
      cycleEndTime: '',
      timezone: 'UTC-07:00',
      recoveryScore: 54,
      restingHeartRate: 56,
      hrv: 34,
      skinTemp: 34.41,
      bloodOxygen: 95.12,
      dayStrain: null,
      energyBurned: null,
      maxHr: null,
      avgHr: null,
      sleepOnset: '2026-01-01 01:09:02',
      wakeOnset: '2026-01-01 07:04:43',
      sleepPerformance: 67,
      respiratoryRate: 18.0,
      asleepDuration: 330,
      inBedDuration: 355,
      lightSleepDuration: 113,
      deepSwsDuration: 109,
      remDuration: 108,
      awakeDuration: 25,
      sleepNeed: 537,
      sleepDebt: 85,
      sleepEfficiency: 92,
      sleepConsistency: 42,
    },
    {
      cycleStartTime: '2025-12-31 01:19:08',
      cycleEndTime: '2026-01-01 01:09:02',
      timezone: 'UTC-07:00',
      recoveryScore: 78,
      restingHeartRate: 55,
      hrv: 37,
      skinTemp: 33.99,
      bloodOxygen: 97.22,
      dayStrain: 4.8,
      energyBurned: 2089,
      maxHr: 137,
      avgHr: 63,
      sleepOnset: '2025-12-31 01:19:08',
      wakeOnset: '2025-12-31 06:06:44',
      sleepPerformance: 64,
      respiratoryRate: 17.7,
      asleepDuration: 281,
      inBedDuration: 287,
      lightSleepDuration: 131,
      deepSwsDuration: 117,
      remDuration: 33,
      awakeDuration: 6,
      sleepNeed: 452,
      sleepDebt: 3,
      sleepEfficiency: 97,
      sleepConsistency: 26,
    },
  ],
  dateRange: {
    start: '2025-12-31',
    end: '2026-01-01',
  },
  rowCount: 2,
};

const EMPTY_CSV_DATA: WhoopCsvData = {
  rows: [],
  dateRange: { start: 'Unknown', end: 'Unknown' },
  rowCount: 0,
};

describe('mapWhoopCsvToMetrics', () => {
  it('should map CSV data to metrics', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA);

    expect(result.metrics.length).toBeGreaterThan(0);
    expect(result.warnings).toBeDefined();
    expect(result.summary.totalRows).toBe(2);
  });

  it('should create HRV metrics when includeHrv is true', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, { includeHrv: true });

    const hrvMetrics = result.metrics.filter((m) => m.name === 'HRV (RMSSD)');
    expect(hrvMetrics).toHaveLength(2);
    expect(hrvMetrics[0].value).toBe(34);
    expect(hrvMetrics[0].unit).toBe('ms');
  });

  it('should create Recovery metrics when includeRecovery is true', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, { includeRecovery: true });

    const recoveryMetrics = result.metrics.filter((m) => m.name === 'Recovery Score');
    expect(recoveryMetrics).toHaveLength(2);
    expect(recoveryMetrics[0].value).toBe(54);
    expect(recoveryMetrics[0].unit).toBe('%');
  });

  it('should create RHR metrics when includeRhr is true', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, { includeRhr: true });

    const rhrMetrics = result.metrics.filter((m) => m.name === 'Resting Heart Rate');
    expect(rhrMetrics).toHaveLength(2);
    expect(rhrMetrics[0].value).toBe(56);
    expect(rhrMetrics[0].unit).toBe('bpm');
  });

  it('should create Sleep metrics when includeSleep is true', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, { includeSleep: true });

    const sleepMetrics = result.metrics.filter((m) => m.name === 'Sleep Duration');
    expect(sleepMetrics).toHaveLength(2);
    // 330 minutes = 5.5 hours
    expect(sleepMetrics[0].value).toBe(5.5);
    expect(sleepMetrics[0].unit).toBe('hours');
  });

  it('should create Strain metrics when includeStrain is true and value > 0', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, { includeStrain: true });

    const strainMetrics = result.metrics.filter((m) => m.name === 'Daily Strain');
    // Only second row has strain (4.8), first row has null
    expect(strainMetrics).toHaveLength(1);
    expect(strainMetrics[0].value).toBe(4.8);
  });

  it('should skip metrics when config excludes them', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, {
      includeHrv: false,
      includeRecovery: false,
      includeRhr: false,
      includeSleep: true,
      includeStrain: false,
    });

    const hrvMetrics = result.metrics.filter((m) => m.name === 'HRV (RMSSD)');
    const sleepMetrics = result.metrics.filter((m) => m.name === 'Sleep Duration');

    expect(hrvMetrics).toHaveLength(0);
    expect(sleepMetrics).toHaveLength(2);
    expect(result.skipped).toContain('HRV');
    expect(result.skipped).toContain('Recovery');
  });

  it('should filter rows by importMode: latest', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA, { importMode: 'latest' });

    // Only the first (most recent) row should be processed
    expect(result.summary.totalRows).toBe(1);
  });

  it('should return empty metrics for empty data', () => {
    const result = mapWhoopCsvToMetrics(EMPTY_CSV_DATA);

    expect(result.metrics).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should set correct metric properties', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA);

    const hrvMetric = result.metrics.find((m) => m.name === 'HRV (RMSSD)');
    expect(hrvMetric).toBeDefined();
    expect(hrvMetric?.category).toBe('autonomic');
    expect(hrvMetric?.subcategory).toBe('hrv');
    expect(hrvMetric?.source).toBe('whoop');
    expect(hrvMetric?.improvement).toBe('higher is better');
    expect(hrvMetric?.referenceRange).toBeDefined();
    expect(hrvMetric?.optimalRange).toBeDefined();
  });

  it('should include date in metric description', () => {
    const result = mapWhoopCsvToMetrics(SAMPLE_CSV_DATA);

    const hrvMetric = result.metrics.find((m) => m.name === 'HRV (RMSSD)');
    expect(hrvMetric?.description).toContain('2026-01-01');
  });
});

describe('calculateCsvAverages', () => {
  it('should calculate correct averages', () => {
    const averages = calculateCsvAverages(SAMPLE_CSV_DATA);

    // (34 + 37) / 2 = 35.5
    expect(averages.avgHrv).toBe(35.5);

    // (54 + 78) / 2 = 66
    expect(averages.avgRecovery).toBe(66);

    // (56 + 55) / 2 = 55.5
    expect(averages.avgRhr).toBe(55.5);

    // (330 + 281) / 2 / 60 = 5.0917 hours
    expect(averages.avgSleep).toBeCloseTo(5.09, 1);

    // Only one strain value (4.8)
    expect(averages.avgStrain).toBe(4.8);
  });

  it('should return null for empty data', () => {
    const averages = calculateCsvAverages(EMPTY_CSV_DATA);

    expect(averages.avgHrv).toBeNull();
    expect(averages.avgRecovery).toBeNull();
    expect(averages.avgRhr).toBeNull();
    expect(averages.avgSleep).toBeNull();
    expect(averages.avgStrain).toBeNull();
  });
});

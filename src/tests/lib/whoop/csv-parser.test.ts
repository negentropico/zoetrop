/**
 * Tests for WHOOP CSV Parser
 */

import { describe, it, expect } from 'vitest';
import { parseWhoopCsv, validateWhoopCsv, isWhoopCsv } from '@/lib/whoop/csv-parser';

// Sample CSV content matching real WHOOP export format
const VALID_CSV = `Cycle start time,Cycle end time,Cycle timezone,Recovery score %,Resting heart rate (bpm),Heart rate variability (ms),Skin temp (celsius),Blood oxygen %,Day Strain,Energy burned (cal),Max HR (bpm),Average HR (bpm),Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),Asleep duration (min),In bed duration (min),Light sleep duration (min),Deep (SWS) duration (min),REM duration (min),Awake duration (min),Sleep need (min),Sleep debt (min),Sleep efficiency %,Sleep consistency %
2026-01-01 01:09:02,,UTC-07:00,54,56,34,34.41,95.12,,,,,2026-01-01 01:09:02,2026-01-01 07:04:43,67,18.0,330,355,113,109,108,25,537,85,92,42
2025-12-31 01:19:08,2026-01-01 01:09:02,UTC-07:00,78,55,37,33.99,97.22,4.8,2089,137,63,2025-12-31 01:19:08,2025-12-31 06:06:44,64,17.7,281,287,131,117,33,6,452,3,97,26`;

const MINIMAL_CSV = `Cycle start time,Cycle end time,Cycle timezone,Recovery score %,Resting heart rate (bpm),Heart rate variability (ms)
2026-01-01 01:09:02,,UTC-07:00,54,56,34`;

const INVALID_CSV_MISSING_HEADERS = `Cycle start time,Cycle end time
2026-01-01 01:09:02,2026-01-02 01:09:02`;

const EMPTY_CSV = ``;

const CSV_WITH_EMPTY_VALUES = `Cycle start time,Cycle end time,Cycle timezone,Recovery score %,Resting heart rate (bpm),Heart rate variability (ms)
2026-01-01 01:09:02,,UTC-07:00,,,`;

describe('validateWhoopCsv', () => {
  it('should validate CSV with all required headers', () => {
    const headers = [
      'Cycle start time',
      'Cycle end time',
      'Recovery score %',
      'Resting heart rate (bpm)',
      'Heart rate variability (ms)',
    ];

    const result = validateWhoopCsv(headers);
    expect(result.valid).toBe(true);
    expect(result.missingHeaders).toHaveLength(0);
  });

  it('should detect missing required headers', () => {
    const headers = ['Cycle start time', 'Cycle end time'];

    const result = validateWhoopCsv(headers);
    expect(result.valid).toBe(false);
    expect(result.missingHeaders).toContain('Recovery score %');
    expect(result.missingHeaders).toContain('Resting heart rate (bpm)');
    expect(result.missingHeaders).toContain('Heart rate variability (ms)');
  });

  it('should be case insensitive for header matching', () => {
    const headers = [
      'CYCLE START TIME',
      'recovery score %',
      'RESTING HEART RATE (BPM)',
      'heart rate variability (ms)',
    ];

    const result = validateWhoopCsv(headers);
    expect(result.valid).toBe(true);
  });
});

describe('parseWhoopCsv', () => {
  it('should parse valid CSV with multiple rows', () => {
    const result = parseWhoopCsv(VALID_CSV);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should extract correct values from CSV row', () => {
    const result = parseWhoopCsv(VALID_CSV);

    expect(result.success).toBe(true);
    const firstRow = result.data?.rows[0];

    expect(firstRow?.cycleStartTime).toBe('2026-01-01 01:09:02');
    expect(firstRow?.recoveryScore).toBe(54);
    expect(firstRow?.restingHeartRate).toBe(56);
    expect(firstRow?.hrv).toBe(34);
    expect(firstRow?.skinTemp).toBe(34.41);
    expect(firstRow?.bloodOxygen).toBe(95.12);
  });

  it('should parse minimal CSV with required columns only', () => {
    const result = parseWhoopCsv(MINIMAL_CSV);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(1);
  });

  it('should fail on empty CSV', () => {
    const result = parseWhoopCsv(EMPTY_CSV);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Empty CSV content');
  });

  it('should fail on CSV missing required headers', () => {
    const result = parseWhoopCsv(INVALID_CSV_MISSING_HEADERS);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Missing required columns');
  });

  it('should handle empty values as null', () => {
    const result = parseWhoopCsv(CSV_WITH_EMPTY_VALUES);

    expect(result.success).toBe(true);
    const row = result.data?.rows[0];
    expect(row?.recoveryScore).toBeNull();
    expect(row?.restingHeartRate).toBeNull();
    expect(row?.hrv).toBeNull();
  });

  it('should calculate correct date range', () => {
    const result = parseWhoopCsv(VALID_CSV);

    expect(result.success).toBe(true);
    expect(result.data?.dateRange.start).toBe('2025-12-31');
    expect(result.data?.dateRange.end).toBe('2026-01-01');
  });

  it('should sort rows by date (newest first)', () => {
    const result = parseWhoopCsv(VALID_CSV);

    expect(result.success).toBe(true);
    const rows = result.data?.rows || [];
    expect(rows[0]?.cycleStartTime).toContain('2026-01-01');
    expect(rows[1]?.cycleStartTime).toContain('2025-12-31');
  });

  it('should return correct row count', () => {
    const result = parseWhoopCsv(VALID_CSV);

    expect(result.success).toBe(true);
    expect(result.data?.rowCount).toBe(2);
  });
});

describe('isWhoopCsv', () => {
  it('should detect WHOOP CSV format', () => {
    expect(isWhoopCsv(VALID_CSV)).toBe(true);
  });

  it('should reject non-WHOOP CSV', () => {
    const otherCsv = 'name,age,city\nJohn,30,NYC';
    expect(isWhoopCsv(otherCsv)).toBe(false);
  });

  it('should reject JSON content', () => {
    const json = '{"key": "value"}';
    expect(isWhoopCsv(json)).toBe(false);
  });

  it('should reject empty content', () => {
    expect(isWhoopCsv('')).toBe(false);
  });
});

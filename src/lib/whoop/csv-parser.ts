/**
 * WHOOP CSV Parser
 *
 * Parses raw WHOOP export CSV files (physiological_cycles.csv).
 */

import type { WhoopCsvRow, WhoopCsvData } from '@/types/whoop';

/**
 * Result of parsing WHOOP CSV
 */
export interface WhoopCsvParseResult {
  success: boolean;
  data?: WhoopCsvData;
  errors: string[];
  warnings: string[];
}

/**
 * CSV column headers from physiological_cycles.csv
 */
const CSV_HEADERS = [
  'Cycle start time',
  'Cycle end time',
  'Cycle timezone',
  'Recovery score %',
  'Resting heart rate (bpm)',
  'Heart rate variability (ms)',
  'Skin temp (celsius)',
  'Blood oxygen %',
  'Day Strain',
  'Energy burned (cal)',
  'Max HR (bpm)',
  'Average HR (bpm)',
  'Sleep onset',
  'Wake onset',
  'Sleep performance %',
  'Respiratory rate (rpm)',
  'Asleep duration (min)',
  'In bed duration (min)',
  'Light sleep duration (min)',
  'Deep (SWS) duration (min)',
  'REM duration (min)',
  'Awake duration (min)',
  'Sleep need (min)',
  'Sleep debt (min)',
  'Sleep efficiency %',
  'Sleep consistency %',
];

/**
 * Parse a numeric value from CSV, returning null if empty or invalid
 */
function parseNumeric(value: string): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  const num = parseFloat(value.trim());
  return isNaN(num) ? null : num;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse a single CSV row into WhoopCsvRow
 */
function parseRow(values: string[], headers: string[]): WhoopCsvRow | null {
  if (values.length < 6) {
    return null;
  }

  const getIndex = (header: string) => headers.indexOf(header);

  const cycleStartTime = values[getIndex('Cycle start time')] || '';
  if (!cycleStartTime) {
    return null;
  }

  return {
    cycleStartTime,
    cycleEndTime: values[getIndex('Cycle end time')] || '',
    timezone: values[getIndex('Cycle timezone')] || 'UTC',
    recoveryScore: parseNumeric(values[getIndex('Recovery score %')]),
    restingHeartRate: parseNumeric(values[getIndex('Resting heart rate (bpm)')]),
    hrv: parseNumeric(values[getIndex('Heart rate variability (ms)')]),
    skinTemp: parseNumeric(values[getIndex('Skin temp (celsius)')]),
    bloodOxygen: parseNumeric(values[getIndex('Blood oxygen %')]),
    dayStrain: parseNumeric(values[getIndex('Day Strain')]),
    energyBurned: parseNumeric(values[getIndex('Energy burned (cal)')]),
    maxHr: parseNumeric(values[getIndex('Max HR (bpm)')]),
    avgHr: parseNumeric(values[getIndex('Average HR (bpm)')]),
    sleepOnset: values[getIndex('Sleep onset')] || '',
    wakeOnset: values[getIndex('Wake onset')] || '',
    sleepPerformance: parseNumeric(values[getIndex('Sleep performance %')]),
    respiratoryRate: parseNumeric(values[getIndex('Respiratory rate (rpm)')]),
    asleepDuration: parseNumeric(values[getIndex('Asleep duration (min)')]),
    inBedDuration: parseNumeric(values[getIndex('In bed duration (min)')]),
    lightSleepDuration: parseNumeric(values[getIndex('Light sleep duration (min)')]),
    deepSwsDuration: parseNumeric(values[getIndex('Deep (SWS) duration (min)')]),
    remDuration: parseNumeric(values[getIndex('REM duration (min)')]),
    awakeDuration: parseNumeric(values[getIndex('Awake duration (min)')]),
    sleepNeed: parseNumeric(values[getIndex('Sleep need (min)')]),
    sleepDebt: parseNumeric(values[getIndex('Sleep debt (min)')]),
    sleepEfficiency: parseNumeric(values[getIndex('Sleep efficiency %')]),
    sleepConsistency: parseNumeric(values[getIndex('Sleep consistency %')]),
  };
}

/**
 * Validate that CSV has required WHOOP headers
 */
export function validateWhoopCsv(headers: string[]): {
  valid: boolean;
  missingHeaders: string[];
} {
  const requiredHeaders = [
    'Cycle start time',
    'Recovery score %',
    'Resting heart rate (bpm)',
    'Heart rate variability (ms)',
  ];

  const missingHeaders = requiredHeaders.filter(
    (h) => !headers.some((header) => header.toLowerCase() === h.toLowerCase())
  );

  return {
    valid: missingHeaders.length === 0,
    missingHeaders,
  };
}

/**
 * Parse WHOOP CSV content into structured data
 */
export function parseWhoopCsv(content: string): WhoopCsvParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content || !content.trim()) {
    return {
      success: false,
      errors: ['Empty CSV content'],
      warnings: [],
    };
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      success: false,
      errors: ['CSV must have at least a header row and one data row'],
      warnings: [],
    };
  }

  // Parse header row
  const headers = parseCsvLine(lines[0]);

  // Validate headers
  const validation = validateWhoopCsv(headers);
  if (!validation.valid) {
    return {
      success: false,
      errors: [`Missing required columns: ${validation.missingHeaders.join(', ')}`],
      warnings: [],
    };
  }

  // Parse data rows
  const rows: WhoopCsvRow[] = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = parseRow(values, headers);

    if (row) {
      rows.push(row);
    } else {
      skippedRows++;
    }
  }

  if (skippedRows > 0) {
    warnings.push(`Skipped ${skippedRows} invalid rows`);
  }

  if (rows.length === 0) {
    return {
      success: false,
      errors: ['No valid data rows found in CSV'],
      warnings,
    };
  }

  // Sort by date (newest first)
  rows.sort((a, b) => {
    const dateA = new Date(a.cycleStartTime);
    const dateB = new Date(b.cycleStartTime);
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate date range
  const dates = rows.map((r) => new Date(r.cycleStartTime)).filter((d) => !isNaN(d.getTime()));
  const dateRange = {
    start: dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : 'Unknown',
    end: dates.length > 0 ? dates[0].toISOString().split('T')[0] : 'Unknown',
  };

  return {
    success: true,
    data: {
      rows,
      dateRange,
      rowCount: rows.length,
    },
    errors: [],
    warnings,
  };
}

/**
 * Detect if content is WHOOP CSV format
 */
export function isWhoopCsv(content: string): boolean {
  const firstLine = content.split(/\r?\n/)[0] || '';
  return (
    firstLine.includes('Cycle start time') &&
    firstLine.includes('Recovery score') &&
    firstLine.includes('Heart rate variability')
  );
}

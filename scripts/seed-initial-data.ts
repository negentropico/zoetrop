/**
 * Seed Initial Data Script
 *
 * Imports health metrics from:
 * - Obsidian vault markdown files (blood work, body composition)
 * - WHOOP CSV exports
 *
 * Run: npx tsx scripts/seed-initial-data.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Types
interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  subcategory?: string;
  timestamp: string;
  source: string;
  referenceRange?: { min: number; max: number };
  optimalRange?: { min: number; max: number };
  improvement?: string;
  notes?: string;
  syncStatus: string;
  syncVersion: number;
}

interface SeedData {
  version: string;
  generatedAt: string;
  profile: {
    id: string;
    name: string;
    createdAt: string;
  };
  metrics: Metric[];
  summary: {
    totalMetrics: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    dateRange: { start: string; end: string };
  };
}

// Paths
const VAULT_PATH = '/Users/mac/vaults/#Bwell/602';
const VAULT_601_PATH = '/Users/mac/vaults/#Bwell/601';
const VAULT_ARCHIVE_PATH = '/Users/mac/vaults/#Bwell/_archive';
const WHOOP_PATH = '/Users/mac/vaults/#Bwell/_archive/my_whoop_data_2026_01_01';
const OUTPUT_PATH = '/Users/mac/Code/Tracker/public/.dev/seed-data.json';

// Helper to parse value and unit from string like "82 mg/dL"
function parseValueUnit(text: string): { value: number; unit: string } | null {
  const match = text.match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    return { value: parseFloat(match[1]), unit: match[2].trim() };
  }
  return null;
}

// Helper to parse range from string like "75-90" or "<100" or ">90"
function parseRange(text: string): { min?: number; max?: number; operator?: string; value?: number } | null {
  // Range format: "75-90"
  const rangeMatch = text.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }

  // Less than: "<100"
  const ltMatch = text.match(/^<\s*([\d.]+)$/);
  if (ltMatch) {
    return { operator: 'lt', value: parseFloat(ltMatch[1]) };
  }

  // Greater than: ">90"
  const gtMatch = text.match(/^>\s*([\d.]+)$/);
  if (gtMatch) {
    return { operator: 'gt', value: parseFloat(gtMatch[1]) };
  }

  return null;
}

// Parse status from emoji
function parseStatus(text: string): string {
  if (text.includes('✅') || text.toLowerCase().includes('optimal') || text.toLowerCase().includes('good') || text.toLowerCase().includes('normal')) {
    return 'optimal';
  }
  if (text.includes('⚠️') || text.toLowerCase().includes('above') || text.toLowerCase().includes('elevated') || text.toLowerCase().includes('border')) {
    return 'borderline';
  }
  if (text.includes('🔴') || text.toLowerCase().includes('low') || text.toLowerCase().includes('high') || text.toLowerCase().includes('critical')) {
    return 'deficient';
  }
  return 'unknown';
}

// Convert operator-based range to min/max
function convertRange(range: { min?: number; max?: number; operator?: string; value?: number } | null): { min: number; max: number } | undefined {
  if (!range) return undefined;

  if (range.min !== undefined && range.max !== undefined) {
    return { min: range.min, max: range.max };
  }

  if (range.operator && range.value !== undefined) {
    if (range.operator === 'lt') {
      return { min: 0, max: range.value };
    }
    if (range.operator === 'gt') {
      return { min: range.value, max: range.value * 2 };
    }
  }

  return undefined;
}

// Metric category and improvement mappings
const METRIC_MAPPINGS: Record<string, { category: string; subcategory?: string; improvement: string }> = {
  // Metabolic Panel
  'Glucose': { category: 'metabolic', subcategory: 'glucose', improvement: 'lower is better' },
  'HbA1c': { category: 'metabolic', subcategory: 'glucose', improvement: 'lower is better' },
  'Insulin': { category: 'metabolic', subcategory: 'glucose', improvement: 'lower is better' },
  'HOMA-IR': { category: 'metabolic', subcategory: 'glucose', improvement: 'lower is better' },
  'Creatinine': { category: 'metabolic', subcategory: 'kidney', improvement: 'lower is better' },
  'eGFR': { category: 'metabolic', subcategory: 'kidney', improvement: 'higher is better' },
  'BUN': { category: 'metabolic', subcategory: 'kidney', improvement: 'target range' },

  // Lipid Panel
  'Total Cholesterol': { category: 'lipids', subcategory: 'cholesterol', improvement: 'lower is better' },
  'HDL': { category: 'lipids', subcategory: 'cholesterol', improvement: 'higher is better' },
  'LDL': { category: 'lipids', subcategory: 'cholesterol', improvement: 'lower is better' },
  'Triglycerides': { category: 'lipids', subcategory: 'triglycerides', improvement: 'lower is better' },
  'Total/HDL Ratio': { category: 'lipids', subcategory: 'ratios', improvement: 'lower is better' },
  'TG/HDL Ratio': { category: 'lipids', subcategory: 'ratios', improvement: 'lower is better' },

  // Vitamins (fat-soluble and B-vitamins)
  'Vitamin D': { category: 'vitamins', subcategory: 'fat-soluble', improvement: 'target range' },
  'B12': { category: 'vitamins', subcategory: 'b-vitamins', improvement: 'target range' },
  'Folate': { category: 'vitamins', subcategory: 'b-vitamins', improvement: 'target range' },
  'B6 (P5P)': { category: 'vitamins', subcategory: 'b-vitamins', improvement: 'target range' },
  'Biotin': { category: 'vitamins', subcategory: 'b-vitamins', improvement: 'target range' },

  // Minerals
  'Zinc': { category: 'minerals', subcategory: 'trace-minerals', improvement: 'target range' },
  'Copper': { category: 'minerals', subcategory: 'trace-minerals', improvement: 'target range' },
  'RBC Magnesium': { category: 'minerals', subcategory: 'macro-minerals', improvement: 'target range' },

  // Inflammatory Markers
  'Homocysteine': { category: 'inflammatory', subcategory: 'cardiovascular', improvement: 'lower is better' },

  // Hormones - Sex
  'Total T': { category: 'hormones', subcategory: 'sex-hormones', improvement: 'higher is better' },
  'Free T': { category: 'hormones', subcategory: 'sex-hormones', improvement: 'target range' },
  'DHEA-S': { category: 'hormones', subcategory: 'sex-hormones', improvement: 'target range' },

  // Hormones - Thyroid
  'TSH': { category: 'hormones', subcategory: 'thyroid', improvement: 'target range' },
  'Free T3': { category: 'hormones', subcategory: 'thyroid', improvement: 'target range' },
  'Free T4': { category: 'hormones', subcategory: 'thyroid', improvement: 'target range' },

  // Hormones - Stress
  'Cortisol AM': { category: 'hormones', subcategory: 'stress-hormones', improvement: 'target range' },

  // Hematology
  'WBC': { category: 'hematology', subcategory: 'white-cells', improvement: 'target range' },
  'RBC': { category: 'hematology', subcategory: 'red-cells', improvement: 'target range' },
  'Hemoglobin': { category: 'hematology', subcategory: 'red-cells', improvement: 'target range' },
  'Hematocrit': { category: 'hematology', subcategory: 'red-cells', improvement: 'target range' },
  'MCV': { category: 'hematology', subcategory: 'indices', improvement: 'target range' },
  'Platelets': { category: 'hematology', subcategory: 'platelets', improvement: 'target range' },
};

// Reference ranges for proper status calculation
const REFERENCE_RANGES: Record<string, { min: number; max: number }> = {
  'Glucose': { min: 65, max: 100 },
  'HbA1c': { min: 4.0, max: 5.7 },
  'Insulin': { min: 2, max: 20 },
  'HOMA-IR': { min: 0, max: 2.5 },
  'Creatinine': { min: 0.7, max: 1.3 },
  'eGFR': { min: 60, max: 120 },
  'BUN': { min: 7, max: 25 },
  'Total Cholesterol': { min: 100, max: 200 },
  'HDL': { min: 40, max: 100 },
  'LDL': { min: 0, max: 130 },
  'Triglycerides': { min: 0, max: 150 },
  'Vitamin D': { min: 30, max: 100 },
  'B12': { min: 200, max: 1100 },
  'Folate': { min: 3, max: 25 },
  'B6 (P5P)': { min: 5, max: 50 },
  'Biotin': { min: 0.1, max: 4.0 },
  'Zinc': { min: 60, max: 130 },
  'Copper': { min: 70, max: 155 },
  'RBC Magnesium': { min: 4.0, max: 7.0 },
  'Homocysteine': { min: 0, max: 15 },
  'Total T': { min: 250, max: 1100 },
  'Free T': { min: 5, max: 25 },
  'DHEA-S': { min: 100, max: 600 },
  'TSH': { min: 0.4, max: 4.5 },
  'Free T3': { min: 2.0, max: 4.5 },
  'Free T4': { min: 0.7, max: 2.0 },
  'Cortisol AM': { min: 5, max: 25 },
  'WBC': { min: 4.0, max: 11.0 },
  'RBC': { min: 4.0, max: 6.0 },
  'Hemoglobin': { min: 12, max: 18 },
  'Hematocrit': { min: 36, max: 54 },
  'MCV': { min: 80, max: 100 },
  'Platelets': { min: 150, max: 400 },
};

// Parse Blood Work markdown
function parseBloodWork(content: string, timestamp: string): Metric[] {
  const metrics: Metric[] = [];
  const lines = content.split('\n');

  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section
    if (line.includes('## Metabolic Panel')) currentSection = 'metabolic';
    else if (line.includes('## Lipid Panel')) currentSection = 'lipids';
    else if (line.includes('## Nutrient Status')) currentSection = 'nutrients';
    else if (line.includes('## Hormonal Panel')) currentSection = 'hormones';
    else if (line.includes('## Hematology')) currentSection = 'hematology';

    // Parse table rows
    if (line.startsWith('|') && !line.includes('---') && !line.includes('Marker')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      if (cells.length >= 4) {
        const name = cells[0].replace(/\*\*/g, '').trim();
        // Handle different table formats (M1/M2 columns vs single value)
        let valueText = cells[1];
        let rangeText = cells[2];
        let statusText = cells[3];

        // Hormonal panel has M1, M2, Change columns
        if (currentSection === 'hormones' && cells.length >= 6) {
          valueText = cells[2]; // M2 Value
          rangeText = cells[4]; // Optimal
          statusText = cells[5]; // Status
        }

        // Skip non-data rows
        if (!name || name.toLowerCase().includes('marker') || name.toLowerCase().includes('assessment')) continue;

        const parsed = parseValueUnit(valueText);
        if (parsed) {
          const range = parseRange(rangeText);
          const status = parseStatus(statusText);

          // Get mapping info
          const mapping = METRIC_MAPPINGS[name];
          if (!mapping) continue; // Skip unmapped metrics

          const optimalRange = convertRange(range);
          const referenceRange = REFERENCE_RANGES[name];

          metrics.push({
            id: uuidv4(),
            name,
            value: parsed.value,
            unit: parsed.unit,
            category: mapping.category,
            subcategory: mapping.subcategory,
            timestamp,
            source: 'vault',
            referenceRange,
            optimalRange,
            improvement: mapping.improvement,
            notes: status !== 'optimal' ? `Status: ${status}` : undefined,
            syncStatus: 'local',
            syncVersion: 1,
          });
        }
      }
    }
  }

  return metrics;
}

// Body composition metric mappings
const BODY_COMP_MAPPINGS: Record<string, { subcategory: string; improvement: string; unit: string; optimalRange?: { min: number; max: number }; referenceRange?: { min: number; max: number } }> = {
  'Weight': { subcategory: 'weight', improvement: 'target range', unit: 'lbs', optimalRange: { min: 170, max: 200 }, referenceRange: { min: 130, max: 230 } },
  'BMI': { subcategory: 'indices', improvement: 'target range', unit: '', optimalRange: { min: 22, max: 25 }, referenceRange: { min: 18.5, max: 30 } },
  'Body Fat %': { subcategory: 'fat', improvement: 'lower is better', unit: '%', optimalRange: { min: 12, max: 20 }, referenceRange: { min: 8, max: 30 } },
  'Fat Mass': { subcategory: 'fat', improvement: 'lower is better', unit: 'lbs', optimalRange: { min: 20, max: 40 }, referenceRange: { min: 10, max: 60 } },
  'Lean Mass': { subcategory: 'lean', improvement: 'higher is better', unit: 'lbs', optimalRange: { min: 160, max: 180 }, referenceRange: { min: 120, max: 200 } },
  'VAT': { subcategory: 'fat', improvement: 'lower is better', unit: 'g', optimalRange: { min: 0, max: 500 }, referenceRange: { min: 0, max: 1500 } },
  'Android/Gynoid': { subcategory: 'ratios', improvement: 'lower is better', unit: '', optimalRange: { min: 0.8, max: 1.0 }, referenceRange: { min: 0.5, max: 1.5 } },
  'Lean/Height²': { subcategory: 'indices', improvement: 'higher is better', unit: 'kg/m²', optimalRange: { min: 19, max: 22 }, referenceRange: { min: 16, max: 24 } },
  'Appen. Lean/Height²': { subcategory: 'indices', improvement: 'higher is better', unit: 'kg/m²', optimalRange: { min: 9, max: 11 }, referenceRange: { min: 7, max: 13 } },
};

// Parse Body Composition markdown with historical M1, M2, M3 data
function parseBodyComposition(content: string): Metric[] {
  const metrics: Metric[] = [];
  const lines = content.split('\n');

  // Milestone timestamps
  const milestones: { col: number; timestamp: string }[] = [
    { col: 1, timestamp: '2025-02-06' }, // M1
    { col: 2, timestamp: '2025-05-01' }, // M2
    { col: 3, timestamp: '2025-09-04' }, // M3
  ];

  // Parse Milestone Progression Summary table for all milestone values
  let inProgressionTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('## Milestone Progression Summary')) {
      inProgressionTable = true;
      continue;
    }

    if (inProgressionTable && line.startsWith('|') && !line.includes('---') && !line.includes('Metric')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      if (cells.length >= 4) {
        const name = cells[0].replace(/\*\*/g, '').trim();
        const mapping = BODY_COMP_MAPPINGS[name];
        if (!mapping) continue;

        // Extract values for each milestone
        for (const milestone of milestones) {
          const valueText = cells[milestone.col];
          if (!valueText || valueText === '—') continue;

          // Parse value - handle various formats
          const cleanValue = valueText
            .replace('%', ' %')
            .replace('lbs', ' lbs')
            .replace('kg/m²', ' kg/m²')
            .replace('g', ' g')
            .replace(/pp/g, ' pp')
            .trim();

          const parsed = parseValueUnit(cleanValue);
          if (parsed && parsed.value && !isNaN(parsed.value)) {
            metrics.push({
              id: uuidv4(),
              name,
              value: parsed.value,
              unit: mapping.unit,
              category: 'bodyComposition',
              subcategory: mapping.subcategory,
              timestamp: milestone.timestamp,
              source: 'vault',
              referenceRange: mapping.referenceRange,
              optimalRange: mapping.optimalRange,
              improvement: mapping.improvement,
              syncStatus: 'local',
              syncVersion: 1,
            });
          }
        }
      }
    }

    if (inProgressionTable && line.startsWith('##') && !line.includes('Milestone')) {
      inProgressionTable = false;
    }
  }

  return metrics;
}

// Parse WHOOP CSV
function parseWhoopCsv(csvPath: string): Metric[] {
  const metrics: Metric[] = [];

  if (!existsSync(csvPath)) {
    console.log(`  Skipping WHOOP CSV: ${csvPath} not found`);
    return metrics;
  }

  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) return metrics;

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Find column indices (match actual WHOOP export column names)
  const dateIdx = header.findIndex(h => h.toLowerCase().includes('cycle start'));
  const hrvIdx = header.findIndex(h => h.toLowerCase().includes('heart rate variability'));
  const rhrIdx = header.findIndex(h => h.toLowerCase().includes('resting heart rate'));
  const recoveryIdx = header.findIndex(h => h.toLowerCase().includes('recovery score'));
  const strainIdx = header.findIndex(h => h.toLowerCase().includes('day strain'));
  const caloriesIdx = header.findIndex(h => h.toLowerCase().includes('energy burned'));
  const respIdx = header.findIndex(h => h.toLowerCase().includes('respiratory rate'));
  const sleepIdx = header.findIndex(h => h.toLowerCase().includes('asleep duration'));

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handle quoted values)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
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

    // Extract date
    const dateStr = values[dateIdx];
    if (!dateStr) continue;

    // Parse date (format: "2024-01-15 00:00:00")
    const dateParts = dateStr.split(' ')[0];
    if (!dateParts) continue;

    const timestamp = dateParts;

    // HRV
    const hrv = parseFloat(values[hrvIdx]);
    if (!isNaN(hrv) && hrv > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'HRV',
        value: Math.round(hrv * 10) / 10,
        unit: 'ms',
        category: 'autonomic',
        subcategory: 'hrv',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 40, max: 100 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // RHR
    const rhr = parseFloat(values[rhrIdx]);
    if (!isNaN(rhr) && rhr > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Resting Heart Rate',
        value: Math.round(rhr),
        unit: 'bpm',
        category: 'autonomic',
        subcategory: 'heart-rate',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 40, max: 60 },
        improvement: 'lower is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Recovery
    const recovery = parseFloat(values[recoveryIdx]);
    if (!isNaN(recovery) && recovery > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Recovery Score',
        value: Math.round(recovery),
        unit: '%',
        category: 'autonomic',
        subcategory: 'recovery',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 67, max: 100 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Day Strain
    const strain = parseFloat(values[strainIdx]);
    if (!isNaN(strain) && strain > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Day Strain',
        value: Math.round(strain * 10) / 10,
        unit: '',
        category: 'autonomic',
        subcategory: 'strain',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 8, max: 14 },
        improvement: 'target range',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Calories (already in cal)
    const cal = parseFloat(values[caloriesIdx]);
    if (!isNaN(cal) && cal > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'TDEE',
        value: Math.round(cal),
        unit: 'kcal',
        category: 'autonomic',
        subcategory: 'energy',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 2000, max: 3000 },
        improvement: 'target range',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Sleep Duration (convert minutes to hours)
    const sleepMin = parseFloat(values[sleepIdx]);
    if (!isNaN(sleepMin) && sleepMin > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Sleep Duration',
        value: Math.round(sleepMin / 60 * 10) / 10,
        unit: 'hrs',
        category: 'autonomic',
        subcategory: 'sleep',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 7, max: 9 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Respiratory Rate
    const resp = parseFloat(values[respIdx]);
    if (!isNaN(resp) && resp > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Respiratory Rate',
        value: Math.round(resp * 10) / 10,
        unit: 'rpm',
        category: 'autonomic',
        subcategory: 'respiratory',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 12, max: 18 },
        improvement: 'lower is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }
  }

  return metrics;
}

// M1 Historical data mappings (Feb 2025)
const M1_DATA: Array<{ name: string; value: number; unit: string; category: string; subcategory?: string }> = [
  // Hematology
  { name: 'WBC', value: 5.07, unit: 'K/uL', category: 'hematology', subcategory: 'white-cells' },
  { name: 'RBC', value: 4.24, unit: 'M/uL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hemoglobin', value: 13.8, unit: 'g/dL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hematocrit', value: 40.9, unit: '%', category: 'hematology', subcategory: 'red-cells' },
  { name: 'MCV', value: 96.5, unit: 'fL', category: 'hematology', subcategory: 'indices' },
  { name: 'Platelets', value: 184, unit: 'K/uL', category: 'hematology', subcategory: 'platelets' },
  // Metabolic
  { name: 'Glucose', value: 103, unit: 'mg/dL', category: 'metabolic', subcategory: 'glucose' },
  { name: 'BUN', value: 21.0, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Creatinine', value: 0.99, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'eGFR', value: 96, unit: 'mL/min', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Sodium', value: 146, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Potassium', value: 4.2, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Calcium', value: 9.1, unit: 'mg/dL', category: 'metabolic', subcategory: 'electrolytes' },
  // Liver
  { name: 'ALT', value: 16, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'AST', value: 10, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'Alkaline Phosphatase', value: 64, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Bilirubin', value: 0.18, unit: 'mg/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Albumin', value: 4.3, unit: 'g/dL', category: 'metabolic', subcategory: 'liver' },
  // Lipids
  { name: 'Total Cholesterol', value: 137, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'HDL', value: 37, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'LDL', value: 87, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'Triglycerides', value: 65, unit: 'mg/dL', category: 'lipids', subcategory: 'triglycerides' },
  { name: 'Total/HDL Ratio', value: 3.7, unit: '', category: 'lipids', subcategory: 'ratios' },
  { name: 'TG/HDL Ratio', value: 1.8, unit: '', category: 'lipids', subcategory: 'ratios' },
  // Vitamins
  { name: 'Vitamin D', value: 26.78, unit: 'ng/mL', category: 'vitamins', subcategory: 'fat-soluble' },
  { name: 'B6 (P5P)', value: 20.3, unit: 'μg/L', category: 'vitamins', subcategory: 'b-vitamins' },
  { name: 'Biotin', value: 0.31, unit: 'ng/mL', category: 'vitamins', subcategory: 'b-vitamins' },
  { name: 'B2 (Riboflavin)', value: 277, unit: 'μg/L', category: 'vitamins', subcategory: 'b-vitamins' },
  { name: 'B3 (Niacin)', value: 7.5, unit: 'ng/mL', category: 'vitamins', subcategory: 'b-vitamins' },
  { name: 'B5 (Pantothenic)', value: 41.7, unit: 'ng/mL', category: 'vitamins', subcategory: 'b-vitamins' },
  // Minerals
  { name: 'Zinc', value: 63, unit: 'μg/dL', category: 'minerals', subcategory: 'trace-minerals' },
  { name: 'Serum Magnesium', value: 2.29, unit: 'mg/dL', category: 'minerals', subcategory: 'macro-minerals' },
  // Hormones
  { name: 'TSH', value: 2.49, unit: 'μIU/mL', category: 'hormones', subcategory: 'thyroid' },
  { name: 'Cortisol AM', value: 22, unit: 'μg/dL', category: 'hormones', subcategory: 'stress-hormones' },
  { name: 'Total T', value: 564, unit: 'ng/dL', category: 'hormones', subcategory: 'sex-hormones' },
  { name: 'PSA', value: 0.766, unit: 'ng/mL', category: 'hormones', subcategory: 'prostate' },
  // Inflammatory
  { name: 'Kryptopyrrole', value: 3.65, unit: 'μg/dL', category: 'inflammatory', subcategory: 'other' },
];

// Generate M1 metrics from hardcoded data
function generateM1Metrics(): Metric[] {
  const timestamp = '2025-02-06';
  return M1_DATA.map(data => ({
    id: uuidv4(),
    name: data.name,
    value: data.value,
    unit: data.unit,
    category: data.category,
    subcategory: data.subcategory,
    timestamp,
    source: 'vault',
    referenceRange: REFERENCE_RANGES[data.name],
    optimalRange: REFERENCE_RANGES[data.name] ? {
      min: REFERENCE_RANGES[data.name].min * 1.1,
      max: REFERENCE_RANGES[data.name].max * 0.9,
    } : undefined,
    improvement: METRIC_MAPPINGS[data.name]?.improvement || 'target range',
    syncStatus: 'local',
    syncVersion: 1,
  }));
}

// 2021 Historical data
const DATA_2021: Array<{ name: string; value: number; unit: string; category: string; subcategory?: string }> = [
  // CMP
  { name: 'Sodium', value: 146, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Potassium', value: 4.5, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Chloride', value: 107, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'CO2', value: 25, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Glucose', value: 84, unit: 'mg/dL', category: 'metabolic', subcategory: 'glucose' },
  { name: 'BUN', value: 22, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Creatinine', value: 1.10, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'BUN/Creatinine Ratio', value: 20.0, unit: '', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Calcium', value: 8.4, unit: 'mg/dL', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Alkaline Phosphatase', value: 55, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'ALT', value: 39, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'AST', value: 14, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Bilirubin', value: 0.5, unit: 'mg/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Protein', value: 6.6, unit: 'g/dL', category: 'metabolic', subcategory: 'protein' },
  { name: 'Albumin', value: 3.8, unit: 'g/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Globulin', value: 2.8, unit: 'g/dL', category: 'metabolic', subcategory: 'protein' },
  { name: 'A/G Ratio', value: 1.4, unit: '', category: 'metabolic', subcategory: 'protein' },
  { name: 'Anion Gap', value: 18.5, unit: 'mEq/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'eGFR', value: 78.8, unit: 'mL/min', category: 'metabolic', subcategory: 'kidney' },
  // Lipid
  { name: 'Total Cholesterol', value: 166, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'Triglycerides', value: 44, unit: 'mg/dL', category: 'lipids', subcategory: 'triglycerides' },
  { name: 'HDL', value: 49, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'LDL', value: 108, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  // CBC
  { name: 'WBC', value: 5.3, unit: 'K/uL', category: 'hematology', subcategory: 'white-cells' },
  { name: 'RBC', value: 4.15, unit: 'M/uL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hemoglobin', value: 13.7, unit: 'g/dL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hematocrit', value: 41.2, unit: '%', category: 'hematology', subcategory: 'red-cells' },
  { name: 'MCV', value: 99.3, unit: 'fL', category: 'hematology', subcategory: 'indices' },
  { name: 'MCH', value: 33.0, unit: 'pg', category: 'hematology', subcategory: 'indices' },
  { name: 'MCHC', value: 33.3, unit: 'g/dL', category: 'hematology', subcategory: 'indices' },
  { name: 'RDW', value: 13.3, unit: '%', category: 'hematology', subcategory: 'indices' },
  { name: 'Platelets', value: 205, unit: 'K/uL', category: 'hematology', subcategory: 'platelets' },
  { name: 'MPV', value: 9.1, unit: 'fL', category: 'hematology', subcategory: 'platelets' },
  // HbA1c
  { name: 'HbA1c', value: 5.5, unit: '%', category: 'metabolic', subcategory: 'glucose' },
  // Hormones
  { name: 'Total T', value: 564.3, unit: 'ng/dL', category: 'hormones', subcategory: 'sex-hormones' },
  { name: 'PSA', value: 0.766, unit: 'ng/mL', category: 'hormones', subcategory: 'prostate' },
];

// 2025-A data (Jan 2025)
const DATA_2025A: Array<{ name: string; value: number; unit: string; category: string; subcategory?: string }> = [
  // CMP
  { name: 'Sodium', value: 146, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Potassium', value: 4.2, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Chloride', value: 110, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'CO2', value: 24, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Glucose', value: 102, unit: 'mg/dL', category: 'metabolic', subcategory: 'glucose' },
  { name: 'BUN', value: 21.0, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Creatinine', value: 0.99, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'BUN/Creatinine Ratio', value: 21.2, unit: '', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Calcium', value: 9.1, unit: 'mg/dL', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Alkaline Phosphatase', value: 64, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'ALT', value: 16, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'AST', value: 10, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Bilirubin', value: 0.18, unit: 'mg/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Protein', value: 6.3, unit: 'g/dL', category: 'metabolic', subcategory: 'protein' },
  { name: 'Albumin', value: 4.3, unit: 'g/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Globulin', value: 2.0, unit: 'g/dL', category: 'metabolic', subcategory: 'protein' },
  { name: 'A/G Ratio', value: 2.2, unit: '', category: 'metabolic', subcategory: 'protein' },
  { name: 'Anion Gap', value: 16.2, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'eGFR', value: 96, unit: 'mL/min', category: 'metabolic', subcategory: 'kidney' },
  // Lipid
  { name: 'Total Cholesterol', value: 137, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'Triglycerides', value: 65, unit: 'mg/dL', category: 'lipids', subcategory: 'triglycerides' },
  { name: 'HDL', value: 37, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'LDL', value: 87, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  // CBC
  { name: 'WBC', value: 5.07, unit: 'K/uL', category: 'hematology', subcategory: 'white-cells' },
  { name: 'RBC', value: 4.24, unit: 'M/uL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hemoglobin', value: 13.8, unit: 'g/dL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hematocrit', value: 40.9, unit: '%', category: 'hematology', subcategory: 'red-cells' },
  { name: 'MCV', value: 96.5, unit: 'fL', category: 'hematology', subcategory: 'indices' },
  { name: 'MCH', value: 32.5, unit: 'pg', category: 'hematology', subcategory: 'indices' },
  { name: 'MCHC', value: 33.7, unit: 'g/dL', category: 'hematology', subcategory: 'indices' },
  { name: 'RDW', value: 13.6, unit: '%', category: 'hematology', subcategory: 'indices' },
  { name: 'Platelets', value: 184, unit: 'K/uL', category: 'hematology', subcategory: 'platelets' },
  { name: 'MPV', value: 9.9, unit: 'fL', category: 'hematology', subcategory: 'platelets' },
  // Thyroid
  { name: 'TSH', value: 2.49, unit: 'μIU/mL', category: 'hormones', subcategory: 'thyroid' },
];

// 2025-B data (Feb 2025)
const DATA_2025B: Array<{ name: string; value: number; unit: string; category: string; subcategory?: string }> = [
  // CMP
  { name: 'Sodium', value: 142, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Potassium', value: 4.2, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Chloride', value: 108, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'CO2', value: 24, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Glucose', value: 98, unit: 'mg/dL', category: 'metabolic', subcategory: 'glucose' },
  { name: 'BUN', value: 21.0, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Creatinine', value: 1.00, unit: 'mg/dL', category: 'metabolic', subcategory: 'kidney' },
  { name: 'BUN/Creatinine Ratio', value: 21.0, unit: '', category: 'metabolic', subcategory: 'kidney' },
  { name: 'Calcium', value: 9.4, unit: 'mg/dL', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'Alkaline Phosphatase', value: 63, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'ALT', value: 16, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'AST', value: 9, unit: 'U/L', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Bilirubin', value: 0.18, unit: 'mg/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Total Protein', value: 6.3, unit: 'g/dL', category: 'metabolic', subcategory: 'protein' },
  { name: 'Albumin', value: 4.3, unit: 'g/dL', category: 'metabolic', subcategory: 'liver' },
  { name: 'Globulin', value: 2.0, unit: 'g/dL', category: 'metabolic', subcategory: 'protein' },
  { name: 'A/G Ratio', value: 2.2, unit: '', category: 'metabolic', subcategory: 'protein' },
  { name: 'Anion Gap', value: 14.2, unit: 'mmol/L', category: 'metabolic', subcategory: 'electrolytes' },
  { name: 'eGFR', value: 95, unit: 'mL/min', category: 'metabolic', subcategory: 'kidney' },
  // Lipid
  { name: 'Total Cholesterol', value: 138, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'Triglycerides', value: 66, unit: 'mg/dL', category: 'lipids', subcategory: 'triglycerides' },
  { name: 'HDL', value: 38, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  { name: 'LDL', value: 87, unit: 'mg/dL', category: 'lipids', subcategory: 'cholesterol' },
  // CBC
  { name: 'WBC', value: 5.25, unit: 'K/uL', category: 'hematology', subcategory: 'white-cells' },
  { name: 'RBC', value: 4.21, unit: 'M/uL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hemoglobin', value: 14.0, unit: 'g/dL', category: 'hematology', subcategory: 'red-cells' },
  { name: 'Hematocrit', value: 40.3, unit: '%', category: 'hematology', subcategory: 'red-cells' },
  { name: 'MCV', value: 95.7, unit: 'fL', category: 'hematology', subcategory: 'indices' },
  { name: 'MCH', value: 33.3, unit: 'pg', category: 'hematology', subcategory: 'indices' },
  { name: 'MCHC', value: 34.7, unit: 'g/dL', category: 'hematology', subcategory: 'indices' },
  { name: 'RDW', value: 13.4, unit: '%', category: 'hematology', subcategory: 'indices' },
  { name: 'Platelets', value: 185, unit: 'K/uL', category: 'hematology', subcategory: 'platelets' },
  { name: 'MPV', value: 9.4, unit: 'fL', category: 'hematology', subcategory: 'platelets' },
  // HbA1c
  { name: 'HbA1c', value: 5.2, unit: '%', category: 'metabolic', subcategory: 'glucose' },
];

// Generate historical blood work metrics
function generateHistoricalBloodWork(): Metric[] {
  const metrics: Metric[] = [];

  // 2021 data
  for (const data of DATA_2021) {
    metrics.push({
      id: uuidv4(),
      name: data.name,
      value: data.value,
      unit: data.unit,
      category: data.category,
      subcategory: data.subcategory,
      timestamp: '2021-05-29',
      source: 'vault',
      referenceRange: REFERENCE_RANGES[data.name],
      optimalRange: REFERENCE_RANGES[data.name] ? {
        min: REFERENCE_RANGES[data.name].min * 1.1,
        max: REFERENCE_RANGES[data.name].max * 0.9,
      } : undefined,
      improvement: METRIC_MAPPINGS[data.name]?.improvement || 'target range',
      syncStatus: 'local',
      syncVersion: 1,
    });
  }

  // 2025-A data
  for (const data of DATA_2025A) {
    metrics.push({
      id: uuidv4(),
      name: data.name,
      value: data.value,
      unit: data.unit,
      category: data.category,
      subcategory: data.subcategory,
      timestamp: '2025-01-31',
      source: 'vault',
      referenceRange: REFERENCE_RANGES[data.name],
      optimalRange: REFERENCE_RANGES[data.name] ? {
        min: REFERENCE_RANGES[data.name].min * 1.1,
        max: REFERENCE_RANGES[data.name].max * 0.9,
      } : undefined,
      improvement: METRIC_MAPPINGS[data.name]?.improvement || 'target range',
      syncStatus: 'local',
      syncVersion: 1,
    });
  }

  // 2025-B data
  for (const data of DATA_2025B) {
    metrics.push({
      id: uuidv4(),
      name: data.name,
      value: data.value,
      unit: data.unit,
      category: data.category,
      subcategory: data.subcategory,
      timestamp: '2025-02-01',
      source: 'vault',
      referenceRange: REFERENCE_RANGES[data.name],
      optimalRange: REFERENCE_RANGES[data.name] ? {
        min: REFERENCE_RANGES[data.name].min * 1.1,
        max: REFERENCE_RANGES[data.name].max * 0.9,
      } : undefined,
      improvement: METRIC_MAPPINGS[data.name]?.improvement || 'target range',
      syncStatus: 'local',
      syncVersion: 1,
    });
  }

  return metrics;
}

// Parse WHOOP Workouts CSV
function parseWhoopWorkouts(csvPath: string): Metric[] {
  const metrics: Metric[] = [];

  if (!existsSync(csvPath)) {
    console.log(`  Skipping WHOOP workouts: ${csvPath} not found`);
    return metrics;
  }

  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) return metrics;

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const workoutStartIdx = header.findIndex(h => h.toLowerCase().includes('workout start'));
  const durationIdx = header.findIndex(h => h.toLowerCase().includes('duration'));
  const activityIdx = header.findIndex(h => h.toLowerCase().includes('activity name'));
  const strainIdx = header.findIndex(h => h.toLowerCase().includes('activity strain'));
  const caloriesIdx = header.findIndex(h => h.toLowerCase().includes('energy burned'));
  const maxHrIdx = header.findIndex(h => h.toLowerCase().includes('max hr'));
  const avgHrIdx = header.findIndex(h => h.toLowerCase().includes('average hr'));

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

    const dateStr = values[workoutStartIdx];
    if (!dateStr) continue;

    const timestamp = dateStr.split(' ')[0];
    const activityType = values[activityIdx] || 'Unknown';

    // Workout Strain
    const strain = parseFloat(values[strainIdx]);
    if (!isNaN(strain) && strain > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Workout Strain',
        value: Math.round(strain * 10) / 10,
        unit: '',
        category: 'autonomic',
        subcategory: 'strain',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 8, max: 18 },
        improvement: 'target range',
        notes: activityType,
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Workout Duration
    const duration = parseFloat(values[durationIdx]);
    if (!isNaN(duration) && duration > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Workout Duration',
        value: Math.round(duration),
        unit: 'min',
        category: 'autonomic',
        subcategory: 'activity',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 30, max: 90 },
        improvement: 'target range',
        notes: activityType,
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Workout Calories
    const calories = parseFloat(values[caloriesIdx]);
    if (!isNaN(calories) && calories > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Workout Calories',
        value: Math.round(calories),
        unit: 'kcal',
        category: 'autonomic',
        subcategory: 'energy',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 200, max: 600 },
        improvement: 'higher is better',
        notes: activityType,
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Max HR
    const maxHr = parseFloat(values[maxHrIdx]);
    if (!isNaN(maxHr) && maxHr > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Workout Max HR',
        value: Math.round(maxHr),
        unit: 'bpm',
        category: 'autonomic',
        subcategory: 'heart-rate',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 140, max: 180 },
        improvement: 'target range',
        notes: activityType,
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Avg HR
    const avgHr = parseFloat(values[avgHrIdx]);
    if (!isNaN(avgHr) && avgHr > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Workout Avg HR',
        value: Math.round(avgHr),
        unit: 'bpm',
        category: 'autonomic',
        subcategory: 'heart-rate',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 100, max: 150 },
        improvement: 'target range',
        notes: activityType,
        syncStatus: 'local',
        syncVersion: 1,
      });
    }
  }

  return metrics;
}

// Parse WHOOP Sleeps CSV
function parseWhoopSleeps(csvPath: string): Metric[] {
  const metrics: Metric[] = [];

  if (!existsSync(csvPath)) {
    console.log(`  Skipping WHOOP sleeps: ${csvPath} not found`);
    return metrics;
  }

  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) return metrics;

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const sleepOnsetIdx = header.findIndex(h => h.toLowerCase().includes('sleep onset'));
  const sleepPerfIdx = header.findIndex(h => h.toLowerCase().includes('sleep performance'));
  const respRateIdx = header.findIndex(h => h.toLowerCase().includes('respiratory rate'));
  const asleepDurIdx = header.findIndex(h => h.toLowerCase().includes('asleep duration'));
  const inBedDurIdx = header.findIndex(h => h.toLowerCase().includes('in bed duration'));
  const lightSleepIdx = header.findIndex(h => h.toLowerCase().includes('light sleep'));
  const deepSleepIdx = header.findIndex(h => h.toLowerCase().includes('deep'));
  const remSleepIdx = header.findIndex(h => h.toLowerCase().includes('rem duration'));
  const awakeDurIdx = header.findIndex(h => h.toLowerCase().includes('awake duration'));
  const sleepEffIdx = header.findIndex(h => h.toLowerCase().includes('sleep efficiency'));
  const sleepConsIdx = header.findIndex(h => h.toLowerCase().includes('sleep consistency'));
  const napIdx = header.findIndex(h => h.toLowerCase().includes('nap'));

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

    const dateStr = values[sleepOnsetIdx];
    if (!dateStr) continue;

    // Skip naps
    const isNap = values[napIdx]?.toLowerCase() === 'true';
    if (isNap) continue;

    const timestamp = dateStr.split(' ')[0];

    // Sleep Performance
    const sleepPerf = parseFloat(values[sleepPerfIdx]);
    if (!isNaN(sleepPerf) && sleepPerf > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Sleep Performance',
        value: Math.round(sleepPerf),
        unit: '%',
        category: 'autonomic',
        subcategory: 'sleep',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 70, max: 100 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Sleep Efficiency
    const sleepEff = parseFloat(values[sleepEffIdx]);
    if (!isNaN(sleepEff) && sleepEff > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Sleep Efficiency',
        value: Math.round(sleepEff),
        unit: '%',
        category: 'autonomic',
        subcategory: 'sleep',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 85, max: 100 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Sleep Consistency
    const sleepCons = parseFloat(values[sleepConsIdx]);
    if (!isNaN(sleepCons) && sleepCons > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Sleep Consistency',
        value: Math.round(sleepCons),
        unit: '%',
        category: 'autonomic',
        subcategory: 'sleep',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 70, max: 100 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Light Sleep (convert minutes to hours)
    const lightSleep = parseFloat(values[lightSleepIdx]);
    if (!isNaN(lightSleep) && lightSleep > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Light Sleep',
        value: Math.round(lightSleep / 60 * 10) / 10,
        unit: 'hrs',
        category: 'autonomic',
        subcategory: 'sleep-stages',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 2, max: 4 },
        improvement: 'target range',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Deep Sleep (SWS)
    const deepSleep = parseFloat(values[deepSleepIdx]);
    if (!isNaN(deepSleep) && deepSleep > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Deep Sleep (SWS)',
        value: Math.round(deepSleep / 60 * 10) / 10,
        unit: 'hrs',
        category: 'autonomic',
        subcategory: 'sleep-stages',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 1.5, max: 2.5 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // REM Sleep
    const remSleep = parseFloat(values[remSleepIdx]);
    if (!isNaN(remSleep) && remSleep > 0) {
      metrics.push({
        id: uuidv4(),
        name: 'REM Sleep',
        value: Math.round(remSleep / 60 * 10) / 10,
        unit: 'hrs',
        category: 'autonomic',
        subcategory: 'sleep-stages',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 1.5, max: 2.5 },
        improvement: 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }

    // Awake Time
    const awakeTime = parseFloat(values[awakeDurIdx]);
    if (!isNaN(awakeTime) && awakeTime >= 0) {
      metrics.push({
        id: uuidv4(),
        name: 'Awake Time',
        value: Math.round(awakeTime),
        unit: 'min',
        category: 'autonomic',
        subcategory: 'sleep-stages',
        timestamp,
        source: 'whoop',
        optimalRange: { min: 0, max: 30 },
        improvement: 'lower is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }
  }

  return metrics;
}

// Parse WHOOP Journal Entries CSV
function parseWhoopJournal(csvPath: string): Metric[] {
  const metrics: Metric[] = [];

  if (!existsSync(csvPath)) {
    console.log(`  Skipping WHOOP journal: ${csvPath} not found`);
    return metrics;
  }

  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) return metrics;

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const cycleStartIdx = header.findIndex(h => h.toLowerCase().includes('cycle start'));
  const questionIdx = header.findIndex(h => h.toLowerCase().includes('question'));
  const answeredIdx = header.findIndex(h => h.toLowerCase().includes('answered'));

  // Track answers by date
  const answersByDate: Record<string, Record<string, boolean>> = {};

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

    const dateStr = values[cycleStartIdx];
    if (!dateStr) continue;

    const timestamp = dateStr.split(' ')[0];
    const question = values[questionIdx];
    const answered = values[answeredIdx]?.toLowerCase() === 'true';

    if (!answersByDate[timestamp]) {
      answersByDate[timestamp] = {};
    }

    // Map questions to metrics
    if (question?.includes('marijuana') || question?.includes('cannabis')) {
      answersByDate[timestamp]['Cannabis Use'] = answered;
    } else if (question?.includes('caffeine')) {
      answersByDate[timestamp]['Caffeine'] = answered;
    } else if (question?.includes('anxious')) {
      answersByDate[timestamp]['Felt Anxious'] = answered;
    } else if (question?.includes('energized')) {
      answersByDate[timestamp]['Felt Energized'] = answered;
    } else if (question?.includes('motivated')) {
      answersByDate[timestamp]['Felt Motivated'] = answered;
    } else if (question?.includes('fatigue')) {
      answersByDate[timestamp]['Experienced Fatigue'] = answered;
    } else if (question?.includes('back pain')) {
      answersByDate[timestamp]['Back Pain'] = answered;
    }
  }

  // Convert aggregated answers to metrics
  for (const [timestamp, answers] of Object.entries(answersByDate)) {
    for (const [name, value] of Object.entries(answers)) {
      metrics.push({
        id: uuidv4(),
        name,
        value: value ? 1 : 0,
        unit: 'bool',
        category: 'autonomic',
        subcategory: name.includes('Cannabis') || name.includes('Caffeine') ? 'substances' : 'subjective',
        timestamp,
        source: 'whoop',
        optimalRange: name.includes('Anxious') || name.includes('Fatigue') || name.includes('Pain') || name.includes('Cannabis')
          ? { min: 0, max: 0 }
          : { min: 1, max: 1 },
        improvement: name.includes('Anxious') || name.includes('Fatigue') || name.includes('Pain') || name.includes('Cannabis')
          ? 'lower is better'
          : 'higher is better',
        syncStatus: 'local',
        syncVersion: 1,
      });
    }
  }

  return metrics;
}

// Main
async function main() {
  console.log('🌱 Seeding initial data...\n');

  const allMetrics: Metric[] = [];

  // 1. Parse Historical Blood Work (2021 + 2025-A + 2025-B)
  console.log('📊 Adding historical blood work (2021, 2025-A, 2025-B)...');
  const historicalBloodWork = generateHistoricalBloodWork();
  allMetrics.push(...historicalBloodWork);
  console.log(`   Found ${historicalBloodWork.length} historical blood work metrics`);

  // 2. Parse M1 Historical Data (Feb 2025)
  console.log('📊 Adding M1 historical data (Feb 2025)...');
  const m1Metrics = generateM1Metrics();
  allMetrics.push(...m1Metrics);
  console.log(`   Found ${m1Metrics.length} M1 metrics`);

  // 3. Parse Blood Work (M2 - May 2025)
  console.log('📊 Parsing blood work (M2)...');
  const bloodWorkPath = join(VAULT_PATH, '04_Blood_Work.md');
  if (existsSync(bloodWorkPath)) {
    const bloodWorkContent = readFileSync(bloodWorkPath, 'utf-8');
    const bloodWorkMetrics = parseBloodWork(bloodWorkContent, '2025-05-01');
    allMetrics.push(...bloodWorkMetrics);
    console.log(`   Found ${bloodWorkMetrics.length} blood work metrics`);
  }

  // 4. Parse Body Composition (M1, M2, M3)
  console.log('📊 Parsing body composition...');
  const bodyCompPath = join(VAULT_PATH, '03_Body_Composition.md');
  if (existsSync(bodyCompPath)) {
    const bodyCompContent = readFileSync(bodyCompPath, 'utf-8');
    const bodyCompMetrics = parseBodyComposition(bodyCompContent);
    allMetrics.push(...bodyCompMetrics);
    console.log(`   Found ${bodyCompMetrics.length} body composition metrics`);
  }

  // 5. Parse WHOOP Physiological Cycles
  console.log('📊 Parsing WHOOP physiological cycles...');
  const whoopCsvPath = join(WHOOP_PATH, 'physiological_cycles.csv');
  const whoopMetrics = parseWhoopCsv(whoopCsvPath);
  allMetrics.push(...whoopMetrics);
  console.log(`   Found ${whoopMetrics.length} WHOOP cycle metrics`);

  // 6. Parse WHOOP Workouts
  console.log('📊 Parsing WHOOP workouts...');
  const whoopWorkoutsPath = join(WHOOP_PATH, 'workouts.csv');
  const workoutMetrics = parseWhoopWorkouts(whoopWorkoutsPath);
  allMetrics.push(...workoutMetrics);
  console.log(`   Found ${workoutMetrics.length} WHOOP workout metrics`);

  // 7. Parse WHOOP Sleeps
  console.log('📊 Parsing WHOOP sleeps...');
  const whoopSleepsPath = join(WHOOP_PATH, 'sleeps.csv');
  const sleepMetrics = parseWhoopSleeps(whoopSleepsPath);
  allMetrics.push(...sleepMetrics);
  console.log(`   Found ${sleepMetrics.length} WHOOP sleep metrics`);

  // 8. Parse WHOOP Journal
  console.log('📊 Parsing WHOOP journal...');
  const whoopJournalPath = join(WHOOP_PATH, 'journal_entries.csv');
  const journalMetrics = parseWhoopJournal(whoopJournalPath);
  allMetrics.push(...journalMetrics);
  console.log(`   Found ${journalMetrics.length} WHOOP journal metrics`);

  // Calculate summary
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';

  for (const metric of allMetrics) {
    byCategory[metric.category] = (byCategory[metric.category] || 0) + 1;
    bySource[metric.source] = (bySource[metric.source] || 0) + 1;
    if (metric.timestamp < minDate) minDate = metric.timestamp;
    if (metric.timestamp > maxDate) maxDate = metric.timestamp;
  }

  // Create seed data
  const seedData: SeedData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    profile: {
      id: uuidv4(),
      name: 'Default Profile',
      createdAt: new Date().toISOString(),
    },
    metrics: allMetrics,
    summary: {
      totalMetrics: allMetrics.length,
      byCategory,
      bySource,
      dateRange: { start: minDate, end: maxDate },
    },
  };

  // Write to file
  writeFileSync(OUTPUT_PATH, JSON.stringify(seedData, null, 2));

  console.log('\n✅ Seed data generated!\n');
  console.log('📈 Summary:');
  console.log(`   Total metrics: ${seedData.summary.totalMetrics}`);
  console.log(`   Date range: ${minDate} to ${maxDate}`);
  console.log('\n   By category:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${cat}: ${count}`);
  }
  console.log('\n   By source:');
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${src}: ${count}`);
  }
  console.log(`\n📁 Output: ${OUTPUT_PATH}`);
}

main().catch(console.error);

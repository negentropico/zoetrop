/**
 * Vault Markdown Parser
 *
 * Parses Obsidian vault markdown files (especially health data tables)
 * and outputs the staging format for import.
 */

import type {
  StagingFile,
  StagingCategory,
  StagingMetric,
  StagingRange,
  StagingParseResult,
  StagingSource,
} from '@/types/staging';
import type { MetricCategory, MetricStatus } from '@/types/metrics';
import { STATUS_MAPPINGS, CATEGORY_MAPPINGS, UNIT_MAPPINGS } from '@/types/staging';

/**
 * Parsed markdown table
 */
interface ParsedTable {
  section: string;
  headers: string[];
  rows: string[][];
}

/**
 * Extract section name from markdown heading
 */
function extractSectionName(line: string): string | null {
  const match = line.match(/^#{1,3}\s+(.+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Parse a markdown table row
 */
function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell && !cell.match(/^[-:]+$/));
}

/**
 * Check if a line is a table separator
 */
function isTableSeparator(line: string): boolean {
  return /^\|?\s*[-:]+\s*\|/.test(line);
}

/**
 * Check if a line is a table row
 */
function isTableRow(line: string): boolean {
  return line.includes('|') && !isTableSeparator(line);
}

/**
 * Extract tables from markdown content
 */
function extractTables(content: string): ParsedTable[] {
  const lines = content.split('\n');
  const tables: ParsedTable[] = [];
  let currentSection = '';
  let currentTable: ParsedTable | null = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for section headers
    const sectionName = extractSectionName(line);
    if (sectionName) {
      currentSection = sectionName;
      continue;
    }

    // Start of table (header row)
    if (isTableRow(line) && !inTable) {
      const headers = parseTableRow(line);
      if (headers.length >= 2) {
        currentTable = {
          section: currentSection,
          headers,
          rows: [],
        };
        inTable = true;
      }
      continue;
    }

    // Table separator - skip
    if (isTableSeparator(line) && inTable) {
      continue;
    }

    // Table data row
    if (isTableRow(line) && inTable && currentTable) {
      const row = parseTableRow(line);
      if (row.length >= 2) {
        currentTable.rows.push(row);
      }
      continue;
    }

    // End of table (non-table line)
    if (!isTableRow(line) && inTable && currentTable) {
      if (currentTable.rows.length > 0) {
        tables.push(currentTable);
      }
      currentTable = null;
      inTable = false;
    }
  }

  // Don't forget the last table
  if (currentTable && currentTable.rows.length > 0) {
    tables.push(currentTable);
  }

  return tables;
}

/**
 * Parse numeric value from cell (handles formatting like "82 mg/dL")
 */
function parseNumericValue(cell: string): { value: number | null; unit: string } {
  // Remove status emojis and bold markers
  const cleaned = cell.replace(/[✅⚠️🔴🟠\*]/g, '').trim();

  // Try to extract number and unit
  const match = cleaned.match(/^([\d,.]+)\s*(.*)$/);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].trim();
    return { value: isNaN(value) ? null : value, unit };
  }

  return { value: null, unit: '' };
}

/**
 * Parse status from cell content
 */
function parseStatus(cell: string): MetricStatus | 'unknown' {
  const cleaned = cell.toLowerCase();

  // Check for emoji first
  for (const [emoji, status] of Object.entries(STATUS_MAPPINGS)) {
    if (cell.includes(emoji)) {
      return status;
    }
  }

  // Check for text status
  for (const [text, status] of Object.entries(STATUS_MAPPINGS)) {
    if (cleaned.includes(text)) {
      return status;
    }
  }

  return 'unknown';
}

/**
 * Parse range from string like "75-90", "<100", ">40"
 */
function parseRange(rangeStr: string): StagingRange | undefined {
  if (!rangeStr || rangeStr === '—' || rangeStr === '-') {
    return undefined;
  }

  const cleaned = rangeStr.replace(/[^\d.<>=-]/g, '').trim();

  // Range format: "75-90" or "75 - 90"
  const rangeMatch = cleaned.match(/^([\d.]+)[-–]([\d.]+)$/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
    };
  }

  // Less than: "<100" or "< 100"
  const ltMatch = cleaned.match(/^<([\d.]+)$/);
  if (ltMatch) {
    return { operator: 'lt', value: parseFloat(ltMatch[1]) };
  }

  // Greater than: ">40" or "> 40"
  const gtMatch = cleaned.match(/^>([\d.]+)$/);
  if (gtMatch) {
    return { operator: 'gt', value: parseFloat(gtMatch[1]) };
  }

  return undefined;
}

/**
 * Determine category from section name
 */
function determineCategory(section: string): MetricCategory {
  const normalized = section.toLowerCase();

  for (const [pattern, category] of Object.entries(CATEGORY_MAPPINGS)) {
    if (normalized.includes(pattern)) {
      return category;
    }
  }

  // Default based on common patterns
  if (normalized.includes('vitamin') || normalized.includes('b12') || normalized.includes('folate')) {
    return 'vitamins';
  }
  if (normalized.includes('mineral') || normalized.includes('zinc') || normalized.includes('magnesium')) {
    return 'minerals';
  }

  return 'metabolic'; // Default fallback
}

/**
 * Normalize unit string
 */
function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_MAPPINGS[lower] || unit;
}

/**
 * Determine improvement direction based on metric name
 */
function determineImprovement(
  name: string,
  _status: MetricStatus | 'unknown'
): 'higher is better' | 'lower is better' | 'target range' {
  const lower = name.toLowerCase();

  // Higher is better
  const higherBetter = [
    'hdl',
    'testosterone',
    'dhea',
    'egfr',
    'vitamin d',
    'b12',
    'hrv',
    'recovery',
    'lean mass',
    'sleep',
  ];
  if (higherBetter.some((term) => lower.includes(term))) {
    return 'higher is better';
  }

  // Lower is better
  const lowerBetter = [
    'ldl',
    'triglyceride',
    'glucose',
    'hba1c',
    'insulin',
    'homa',
    'homocysteine',
    'resting heart rate',
    'rhr',
    'creatinine',
    'bun',
    'cortisol',
    'vat',
    'body fat',
    'fat mass',
  ];
  if (lowerBetter.some((term) => lower.includes(term))) {
    return 'lower is better';
  }

  return 'target range';
}

/**
 * Parse a metric table (blood work format)
 */
function parseMetricTable(table: ParsedTable, category: MetricCategory): StagingMetric[] {
  const metrics: StagingMetric[] = [];
  const headers = table.headers.map((h) => h.toLowerCase());

  // Find column indices
  const markerIdx = headers.findIndex((h) => h.includes('marker') || h.includes('metric') || h.includes('measure'));
  const valueIdx = headers.findIndex(
    (h) => h.includes('value') || h.includes('m2') || h.includes('m3') || h.includes('result') || h.includes('current')
  );
  const optimalIdx = headers.findIndex((h) => h.includes('optimal') || h.includes('target'));
  const statusIdx = headers.findIndex((h) => h.includes('status'));
  const priorityIdx = headers.findIndex((h) => h.includes('priority'));
  const referenceIdx = headers.findIndex((h) => h.includes('reference'));

  if (markerIdx === -1 || valueIdx === -1) {
    return metrics;
  }

  for (const row of table.rows) {
    const name = row[markerIdx]?.replace(/\*\*/g, '').trim();
    if (!name) continue;

    const { value, unit } = parseNumericValue(row[valueIdx] || '');
    if (value === null) continue;

    const status = statusIdx !== -1 ? parseStatus(row[statusIdx] || '') : 'unknown';
    const optimalRange = optimalIdx !== -1 ? parseRange(row[optimalIdx] || '') : undefined;
    const referenceRange = referenceIdx !== -1 ? parseRange(row[referenceIdx] || '') : undefined;
    const priority = priorityIdx !== -1 ? row[priorityIdx]?.replace(/\*\*/g, '').trim() : undefined;

    const metric: StagingMetric = {
      name,
      value,
      unit: normalizeUnit(unit),
      category,
      status,
      improvement: determineImprovement(name, status),
    };

    if (optimalRange) metric.optimalRange = optimalRange;
    if (referenceRange) metric.referenceRange = referenceRange;
    if (priority) metric.priority = priority;

    metrics.push(metric);
  }

  return metrics;
}

/**
 * Parse vault markdown file into staging format
 */
export function parseVaultMarkdown(content: string, source: Partial<StagingSource>): StagingParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content || !content.trim()) {
    return { success: false, errors: ['Empty content'], warnings: [] };
  }

  // Extract tables
  const tables = extractTables(content);

  if (tables.length === 0) {
    return { success: false, errors: ['No tables found in markdown'], warnings: [] };
  }

  // Parse each table into metrics
  const categoryMap = new Map<MetricCategory, StagingMetric[]>();

  for (const table of tables) {
    const category = determineCategory(table.section);
    const metrics = parseMetricTable(table, category);

    if (metrics.length === 0) {
      warnings.push(`No metrics parsed from table in section: ${table.section}`);
      continue;
    }

    const existing = categoryMap.get(category) || [];
    categoryMap.set(category, [...existing, ...metrics]);
  }

  // Build categories array
  const categories: StagingCategory[] = [];
  const byCategory: Record<MetricCategory, number> = {
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
  const byStatus: Record<MetricStatus | 'unknown', number> = {
    optimal: 0,
    borderline: 0,
    deficient: 0,
    excess: 0,
    unknown: 0,
  };

  for (const [category, metrics] of categoryMap) {
    categories.push({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      metrics,
    });

    byCategory[category] = metrics.length;
    for (const m of metrics) {
      byStatus[m.status]++;
    }
  }

  const totalMetrics = categories.reduce((sum, c) => sum + c.metrics.length, 0);

  if (totalMetrics === 0) {
    return { success: false, errors: ['No metrics could be parsed'], warnings };
  }

  const stagingFile: StagingFile = {
    schemaVersion: '1.0',
    source: {
      file: source.file || 'unknown',
      type: source.type || 'vault',
      collectedAt: source.collectedAt || new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      version: source.version,
      notes: source.notes,
    },
    summary: {
      totalMetrics,
      byCategory,
      byStatus,
    },
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
    categories,
  };

  return { success: true, data: stagingFile, errors: [], warnings };
}

/**
 * Parse multiple vault files and merge into single staging file
 */
export function parseVaultFiles(
  files: Array<{ content: string; source: Partial<StagingSource> }>
): StagingParseResult {
  const allCategories: StagingCategory[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const file of files) {
    const result = parseVaultMarkdown(file.content, file.source);

    if (result.success && result.data) {
      allCategories.push(...result.data.categories);
    }

    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (allCategories.length === 0) {
    return { success: false, errors: allErrors, warnings: allWarnings };
  }

  // Merge categories
  const mergedCategories = new Map<MetricCategory, StagingCategory>();
  for (const cat of allCategories) {
    const existing = mergedCategories.get(cat.category);
    if (existing) {
      existing.metrics.push(...cat.metrics);
    } else {
      mergedCategories.set(cat.category, { ...cat });
    }
  }

  // Calculate summary
  const byCategory: Record<MetricCategory, number> = {
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
  const byStatus: Record<MetricStatus | 'unknown', number> = {
    optimal: 0,
    borderline: 0,
    deficient: 0,
    excess: 0,
    unknown: 0,
  };

  const categories = Array.from(mergedCategories.values());
  for (const cat of categories) {
    byCategory[cat.category] = cat.metrics.length;
    for (const m of cat.metrics) {
      byStatus[m.status]++;
    }
  }

  const totalMetrics = categories.reduce((sum, c) => sum + c.metrics.length, 0);

  const stagingFile: StagingFile = {
    schemaVersion: '1.0',
    source: {
      file: 'multiple',
      type: 'vault',
      collectedAt: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      notes: [`Merged from ${files.length} files`],
    },
    summary: {
      totalMetrics,
      byCategory,
      byStatus,
    },
    validation: {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    },
    categories,
  };

  return { success: true, data: stagingFile, errors: [], warnings: allWarnings };
}

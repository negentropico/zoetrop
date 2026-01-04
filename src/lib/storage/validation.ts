/**
 * Metric Validation Utilities
 *
 * Validates metric data at storage boundaries.
 */

import type { Metric, MetricCategory, MetricRange } from '@/types/metrics';

const VALID_CATEGORIES: MetricCategory[] = [
  'vitamins',
  'minerals',
  'inflammatory',
  'metabolic',
  'hormones',
  'autonomic',
  'bodyComposition',
  'lipids',
  'hematology',
];

const VALID_SOURCES = ['manual', 'whoop', 'dexa', 'bloodwork', 'csv', 'vault'];
const VALID_IMPROVEMENTS = ['higher is better', 'lower is better', 'target range'];

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a metric object
 */
export function validateMetric(metric: unknown): ValidationResult {
  const errors: string[] = [];

  if (!metric || typeof metric !== 'object') {
    return { valid: false, errors: ['Metric must be an object'] };
  }

  const m = metric as Record<string, unknown>;

  // Required string fields
  if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  } else if (m.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  // Unit can be empty for dimensionless metrics (ratios, scores)
  if (m.unit !== undefined && typeof m.unit !== 'string') {
    errors.push('Unit must be a string');
  }

  // Value must be a finite number
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) {
    errors.push('Value must be a finite number');
  }

  // Category validation
  if (!m.category || !VALID_CATEGORIES.includes(m.category as MetricCategory)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Subcategory must be a non-empty string
  if (!m.subcategory || typeof m.subcategory !== 'string' || m.subcategory.trim().length === 0) {
    errors.push('Subcategory is required and must be a non-empty string');
  }

  // Timestamp validation
  if (!m.timestamp || typeof m.timestamp !== 'string') {
    errors.push('Timestamp is required and must be a string');
  } else {
    const date = new Date(m.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('Timestamp must be a valid ISO 8601 date string');
    }
  }

  // Improvement direction
  if (!m.improvement || !VALID_IMPROVEMENTS.includes(m.improvement as string)) {
    errors.push(`Improvement must be one of: ${VALID_IMPROVEMENTS.join(', ')}`);
  }

  // Source validation
  if (!m.source || !VALID_SOURCES.includes(m.source as string)) {
    errors.push(`Source must be one of: ${VALID_SOURCES.join(', ')}`);
  }

  // Optional description length
  if (m.description && typeof m.description === 'string' && m.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  // Range validation
  if (m.referenceRange) {
    const rangeErrors = validateRange(m.referenceRange, 'referenceRange');
    errors.push(...rangeErrors);
  }

  if (m.optimalRange) {
    const rangeErrors = validateRange(m.optimalRange, 'optimalRange');
    errors.push(...rangeErrors);
    // Note: Optimal range doesn't need to be within reference range
    // as health goals may differ from lab reference ranges
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a range object
 */
function validateRange(range: unknown, fieldName: string): string[] {
  const errors: string[] = [];

  if (!range || typeof range !== 'object') {
    errors.push(`${fieldName} must be an object with min and max`);
    return errors;
  }

  const r = range as Record<string, unknown>;

  if (typeof r.min !== 'number' || !Number.isFinite(r.min)) {
    errors.push(`${fieldName}.min must be a finite number`);
  }

  if (typeof r.max !== 'number' || !Number.isFinite(r.max)) {
    errors.push(`${fieldName}.max must be a finite number`);
  }

  // Allow min >= max for boolean/binary metrics (e.g., "Felt Anxious" where 0=no, 1=yes)
  // Only warn if min > max significantly
  if (
    typeof r.min === 'number' &&
    typeof r.max === 'number' &&
    Number.isFinite(r.min) &&
    Number.isFinite(r.max) &&
    r.min > r.max
  ) {
    // Just log a warning, don't fail validation for edge cases
    console.warn(`Warning: ${fieldName}.min (${r.min}) > ${fieldName}.max (${r.max})`);
  }

  return errors;
}

/**
 * Check if a range is valid
 */
function isValidRange(range: unknown): range is MetricRange {
  if (!range || typeof range !== 'object') return false;
  const r = range as Record<string, unknown>;
  return (
    typeof r.min === 'number' &&
    typeof r.max === 'number' &&
    Number.isFinite(r.min) &&
    Number.isFinite(r.max) &&
    r.min < r.max
  );
}

/**
 * Validate a full metric (including id and sync fields)
 */
export function validateFullMetric(metric: unknown): ValidationResult {
  const baseResult = validateMetric(metric);

  if (!baseResult.valid) {
    return baseResult;
  }

  const errors: string[] = [];
  const m = metric as Metric;

  // ID validation
  if (!m.id || typeof m.id !== 'string' || m.id.trim().length === 0) {
    errors.push('ID is required and must be a non-empty string');
  }

  // Sync status validation
  const validSyncStatuses = ['local', 'synced', 'pending'];
  if (!m.syncStatus || !validSyncStatuses.includes(m.syncStatus)) {
    errors.push(`syncStatus must be one of: ${validSyncStatuses.join(', ')}`);
  }

  // Sync version validation
  if (typeof m.syncVersion !== 'number' || m.syncVersion < 1) {
    errors.push('syncVersion must be a positive integer');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

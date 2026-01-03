/**
 * Storage Module
 *
 * Exports storage adapter interface and implementations.
 */

// Interface and types
export type {
  StorageAdapter,
  StorageResult,
  StorageError,
  MetricQuery,
  SyncStatusSummary,
} from './adapter';

// LocalStorage implementation
export { LocalStorageAdapter, STORAGE_KEY } from './local';

// Validation utilities
export { validateMetric, validateFullMetric } from './validation';
export type { ValidationResult } from './validation';

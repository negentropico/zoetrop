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

// LocalStorage implementation (browser)
export { LocalStorageAdapter, STORAGE_KEY } from './local';

// SQLite implementation (Node.js - local persistence)
export { SQLiteAdapter } from './sqlite';

// Validation utilities
export { validateMetric, validateFullMetric } from './validation';
export type { ValidationResult } from './validation';

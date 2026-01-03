/**
 * Storage Adapter Contract
 *
 * Defines the interface for metric persistence.
 * Implementations: LocalStorageAdapter (Phase 1), PostgresAdapter (Phase 5)
 */

import type {
  Metric,
  MetricCategory,
  StoredMetrics,
  SyncStatus,
} from '../../../src/types/metrics';

/**
 * Result of a storage operation
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

/**
 * Storage error with categorization
 */
export interface StorageError {
  code: 'QUOTA_EXCEEDED' | 'PARSE_ERROR' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UNKNOWN';
  message: string;
  details?: unknown;
}

/**
 * Query options for filtering metrics
 */
export interface MetricQuery {
  category?: MetricCategory;
  startDate?: Date;
  endDate?: Date;
  name?: string;
  syncStatus?: SyncStatus;
  limit?: number;
  offset?: number;
}

/**
 * Sync status summary
 */
export interface SyncStatusSummary {
  local: number;
  synced: number;
  pending: number;
  total: number;
  lastUpdated: string;
}

/**
 * Storage Adapter Interface
 *
 * All methods are async to support both LocalStorage and future database implementations.
 */
export interface StorageAdapter {
  /**
   * Initialize the storage adapter
   * Called once on application start
   */
  initialize(): Promise<StorageResult<void>>;

  /**
   * Get all metrics, optionally filtered
   */
  getMetrics(query?: MetricQuery): Promise<StorageResult<Metric[]>>;

  /**
   * Get a single metric by ID
   */
  getMetricById(id: string): Promise<StorageResult<Metric | null>>;

  /**
   * Get historical readings for a metric by name
   */
  getMetricHistory(name: string): Promise<StorageResult<Metric[]>>;

  /**
   * Add a new metric
   * Generates ID and sets initial sync status
   */
  addMetric(metric: Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>): Promise<StorageResult<Metric>>;

  /**
   * Update an existing metric
   * Increments syncVersion, sets syncStatus to 'local' or 'pending'
   */
  updateMetric(id: string, updates: Partial<Metric>): Promise<StorageResult<Metric>>;

  /**
   * Delete a metric by ID
   */
  deleteMetric(id: string): Promise<StorageResult<void>>;

  /**
   * Bulk import metrics (e.g., from WHOOP or CSV)
   * Validates all before saving, atomic operation
   */
  importMetrics(metrics: Metric[]): Promise<StorageResult<Metric[]>>;

  /**
   * Export all metrics as JSON string
   */
  exportMetrics(): Promise<StorageResult<string>>;

  /**
   * Clear all metrics
   * Requires confirmation flag to prevent accidents
   */
  clearMetrics(confirm: boolean): Promise<StorageResult<void>>;

  /**
   * Get sync status summary
   */
  getSyncStatus(): Promise<StorageResult<SyncStatusSummary>>;

  /**
   * Mark metrics as synced (called after successful cloud sync)
   */
  markAsSynced(ids: string[]): Promise<StorageResult<void>>;
}

/**
 * Validation function type for metrics
 */
export type MetricValidator = (metric: unknown) => {
  valid: boolean;
  errors: string[];
};

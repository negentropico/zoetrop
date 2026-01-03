/**
 * LocalStorage Adapter
 *
 * Implements StorageAdapter using browser LocalStorage.
 * Primary storage for Phases 1-4, with sync status tracking for Phase 5+ cloud sync.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Metric, StoredMetrics } from '@/types/metrics';
import type {
  StorageAdapter,
  StorageResult,
  StorageError,
  MetricQuery,
  SyncStatusSummary,
} from './adapter';
import { validateMetric } from './validation';

export const STORAGE_KEY = 'wellness_tracker_metrics';

/**
 * LocalStorage implementation of StorageAdapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  private data: StoredMetrics = {
    metrics: [],
    lastUpdated: new Date().toISOString(),
    syncVersion: 0,
  };

  /**
   * Initialize adapter and load existing data from localStorage
   */
  async initialize(): Promise<StorageResult<void>> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredMetrics;
          if (parsed.metrics && Array.isArray(parsed.metrics)) {
            this.data = parsed;
          }
        } catch {
          // Corrupted data - start fresh
          console.warn('Corrupted localStorage data, initializing empty state');
          this.data = {
            metrics: [],
            lastUpdated: new Date().toISOString(),
            syncVersion: 0,
          };
        }
      }

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to initialize storage', error);
    }
  }

  /**
   * Get metrics with optional filtering
   */
  async getMetrics(query?: MetricQuery): Promise<StorageResult<Metric[]>> {
    try {
      let metrics = [...this.data.metrics];

      if (query) {
        if (query.category) {
          metrics = metrics.filter(m => m.category === query.category);
        }
        if (query.name) {
          metrics = metrics.filter(m => m.name === query.name);
        }
        if (query.syncStatus) {
          metrics = metrics.filter(m => m.syncStatus === query.syncStatus);
        }
        if (query.startDate) {
          metrics = metrics.filter(m => new Date(m.timestamp) >= query.startDate!);
        }
        if (query.endDate) {
          metrics = metrics.filter(m => new Date(m.timestamp) <= query.endDate!);
        }
        if (query.offset) {
          metrics = metrics.slice(query.offset);
        }
        if (query.limit) {
          metrics = metrics.slice(0, query.limit);
        }
      }

      return { success: true, data: metrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get metrics', error);
    }
  }

  /**
   * Get a single metric by ID
   */
  async getMetricById(id: string): Promise<StorageResult<Metric | null>> {
    try {
      const metric = this.data.metrics.find(m => m.id === id) || null;
      return { success: true, data: metric };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get metric', error);
    }
  }

  /**
   * Get historical readings for a metric by name, sorted by timestamp
   */
  async getMetricHistory(name: string): Promise<StorageResult<Metric[]>> {
    try {
      const metrics = this.data.metrics
        .filter(m => m.name === name)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return { success: true, data: metrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get metric history', error);
    }
  }

  /**
   * Add a new metric with generated ID and sync metadata
   */
  async addMetric(
    metric: Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>
  ): Promise<StorageResult<Metric>> {
    try {
      const validation = validateMetric(metric);
      if (!validation.valid) {
        return this.createErrorResult('VALIDATION_ERROR', validation.errors.join(', '));
      }

      const newMetric: Metric = {
        ...metric,
        id: uuidv4(),
        syncStatus: 'local',
        syncVersion: 1,
      } as Metric;

      this.data.metrics.push(newMetric);
      await this.persist();

      return { success: true, data: newMetric };
    } catch (error) {
      if (this.isQuotaError(error)) {
        return this.createErrorResult('QUOTA_EXCEEDED', 'LocalStorage quota exceeded');
      }
      return this.createErrorResult('UNKNOWN', 'Failed to add metric', error);
    }
  }

  /**
   * Update an existing metric
   */
  async updateMetric(
    id: string,
    updates: Partial<Metric>
  ): Promise<StorageResult<Metric>> {
    try {
      const index = this.data.metrics.findIndex(m => m.id === id);

      if (index === -1) {
        return this.createErrorResult('NOT_FOUND', `Metric with id ${id} not found`);
      }

      const existing = this.data.metrics[index];
      const updatedMetric: Metric = {
        ...existing,
        ...updates,
        id: existing.id, // Prevent ID change
        syncStatus: existing.syncStatus === 'synced' ? 'pending' : 'local',
        syncVersion: existing.syncVersion + 1,
      } as Metric;

      this.data.metrics[index] = updatedMetric;
      await this.persist();

      return { success: true, data: updatedMetric };
    } catch (error) {
      if (this.isQuotaError(error)) {
        return this.createErrorResult('QUOTA_EXCEEDED', 'LocalStorage quota exceeded');
      }
      return this.createErrorResult('UNKNOWN', 'Failed to update metric', error);
    }
  }

  /**
   * Delete a metric by ID
   */
  async deleteMetric(id: string): Promise<StorageResult<void>> {
    try {
      const index = this.data.metrics.findIndex(m => m.id === id);

      if (index === -1) {
        return this.createErrorResult('NOT_FOUND', `Metric with id ${id} not found`);
      }

      this.data.metrics.splice(index, 1);
      await this.persist();

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to delete metric', error);
    }
  }

  /**
   * Import multiple metrics (atomic operation)
   */
  async importMetrics(metrics: Metric[]): Promise<StorageResult<Metric[]>> {
    try {
      // Validate all before importing
      for (const metric of metrics) {
        const validation = validateMetric(metric);
        if (!validation.valid) {
          return this.createErrorResult(
            'VALIDATION_ERROR',
            `Invalid metric "${metric.name}": ${validation.errors.join(', ')}`
          );
        }
      }

      // Set sync status for imported metrics
      const importedMetrics = metrics.map(m => ({
        ...m,
        syncStatus: 'local' as const,
        syncVersion: m.syncVersion || 1,
      }));

      this.data.metrics.push(...importedMetrics);
      await this.persist();

      return { success: true, data: importedMetrics };
    } catch (error) {
      if (this.isQuotaError(error)) {
        return this.createErrorResult('QUOTA_EXCEEDED', 'LocalStorage quota exceeded');
      }
      return this.createErrorResult('UNKNOWN', 'Failed to import metrics', error);
    }
  }

  /**
   * Export all metrics as JSON
   */
  async exportMetrics(): Promise<StorageResult<string>> {
    try {
      const exportData = {
        metrics: this.data.metrics,
        lastUpdated: this.data.lastUpdated,
        syncVersion: this.data.syncVersion,
        exportedAt: new Date().toISOString(),
      };

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to export metrics', error);
    }
  }

  /**
   * Clear all metrics (requires confirmation)
   */
  async clearMetrics(confirm: boolean): Promise<StorageResult<void>> {
    if (!confirm) {
      return this.createErrorResult('VALIDATION_ERROR', 'Confirmation required to clear metrics');
    }

    try {
      this.data.metrics = [];
      await this.persist();
      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to clear metrics', error);
    }
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus(): Promise<StorageResult<SyncStatusSummary>> {
    try {
      const local = this.data.metrics.filter(m => m.syncStatus === 'local').length;
      const synced = this.data.metrics.filter(m => m.syncStatus === 'synced').length;
      const pending = this.data.metrics.filter(m => m.syncStatus === 'pending').length;

      return {
        success: true,
        data: {
          local,
          synced,
          pending,
          total: this.data.metrics.length,
          lastUpdated: this.data.lastUpdated,
        },
      };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get sync status', error);
    }
  }

  /**
   * Mark metrics as synced (after successful cloud sync)
   */
  async markAsSynced(ids: string[]): Promise<StorageResult<void>> {
    try {
      for (const id of ids) {
        const metric = this.data.metrics.find(m => m.id === id);
        if (metric) {
          metric.syncStatus = 'synced';
        }
      }

      await this.persist();
      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to mark metrics as synced', error);
    }
  }

  /**
   * Persist current data to localStorage
   */
  private async persist(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
    this.data.syncVersion += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  /**
   * Create a standardized error result
   */
  private createErrorResult<T>(
    code: StorageError['code'],
    message: string,
    details?: unknown
  ): StorageResult<T> {
    return {
      success: false,
      error: { code, message, details },
    };
  }

  /**
   * Check if error is a quota exceeded error
   */
  private isQuotaError(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    );
  }
}

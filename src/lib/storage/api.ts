/**
 * API Storage Adapter
 *
 * Implements StorageAdapter by making HTTP calls to the API endpoints.
 * Used in browser to communicate with server-side SQLite storage.
 */

import type { Metric } from '@/types/metrics';
import type {
  StorageAdapter,
  StorageResult,
  StorageError,
  MetricQuery,
  SyncStatusSummary,
} from './adapter';

const API_BASE = '/api/metrics';

/**
 * API implementation of StorageAdapter
 */
export class ApiAdapter implements StorageAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize - no-op for API adapter
   */
  async initialize(): Promise<StorageResult<void>> {
    // API is always ready
    return { success: true };
  }

  /**
   * Get metrics with optional filtering
   */
  async getMetrics(query?: MetricQuery): Promise<StorageResult<Metric[]>> {
    try {
      const params = new URLSearchParams();

      if (query?.category) params.set('category', query.category);
      if (query?.name) params.set('name', query.name);
      if (query?.syncStatus) params.set('syncStatus', query.syncStatus);
      if (query?.startDate) params.set('startDate', query.startDate.toISOString());
      if (query?.endDate) params.set('endDate', query.endDate.toISOString());
      if (query?.limit) params.set('limit', String(query.limit));
      if (query?.offset) params.set('offset', String(query.offset));

      const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.metrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to fetch metrics: ${error}`);
    }
  }

  /**
   * Get a single metric by ID
   */
  async getMetricById(id: string): Promise<StorageResult<Metric | null>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);

      if (response.status === 404) {
        return { success: true, data: null };
      }

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to fetch metric: ${error}`);
    }
  }

  /**
   * Get historical readings for a metric by name
   */
  async getMetricHistory(name: string): Promise<StorageResult<Metric[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/history/${encodeURIComponent(name)}`);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.history };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to fetch metric history: ${error}`);
    }
  }

  /**
   * Add a new metric
   */
  async addMetric(
    metric: Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>
  ): Promise<StorageResult<Metric>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [metric] }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.metrics[0] };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to add metric: ${error}`);
    }
  }

  /**
   * Update an existing metric - not yet implemented in API
   */
  async updateMetric(id: string, updates: Partial<Metric>): Promise<StorageResult<Metric>> {
    // TODO: Implement PUT endpoint
    return this.createErrorResult('UNKNOWN', 'Update not yet implemented in API');
  }

  /**
   * Delete a metric by ID
   */
  async deleteMetric(id: string): Promise<StorageResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to delete metric: ${error}`);
    }
  }

  /**
   * Import multiple metrics
   */
  async importMetrics(metrics: Metric[]): Promise<StorageResult<Metric[]>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.metrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to import metrics: ${error}`);
    }
  }

  /**
   * Export all metrics as JSON
   */
  async exportMetrics(): Promise<StorageResult<string>> {
    try {
      const result = await this.getMetrics();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const exportData = {
        metrics: result.data,
        exportedAt: new Date().toISOString(),
      };

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to export metrics: ${error}`);
    }
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(confirm: boolean): Promise<StorageResult<void>> {
    if (!confirm) {
      return this.createErrorResult('VALIDATION_ERROR', 'Confirmation required');
    }

    try {
      const response = await fetch(`${this.baseUrl}?confirm=true`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to clear metrics: ${error}`);
    }
  }

  /**
   * Get sync status - returns all as 'synced' since API is source of truth
   */
  async getSyncStatus(): Promise<StorageResult<SyncStatusSummary>> {
    try {
      const result = await this.getMetrics();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const count = result.data?.length ?? 0;

      return {
        success: true,
        data: {
          local: 0,
          synced: count,
          pending: 0,
          total: count,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', `Failed to get sync status: ${error}`);
    }
  }

  /**
   * Mark metrics as synced - no-op for API adapter
   */
  async markAsSynced(_ids: string[]): Promise<StorageResult<void>> {
    // All metrics in API are considered synced
    return { success: true };
  }

  private createErrorResult<T>(
    code: StorageError['code'],
    message: string
  ): StorageResult<T> {
    return {
      success: false,
      error: { code, message },
    };
  }
}

/**
 * useMetrics Hook
 *
 * React hook for metric CRUD operations.
 * Supports multiple storage backends: localStorage (browser), API (server-side SQLite).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Metric, MetricCategory } from '@/types/metrics';
import { LocalStorageAdapter } from '@/lib/storage/local';
import { ApiAdapter } from '@/lib/storage/api';
import type { StorageAdapter, SyncStatusSummary } from '@/lib/storage/adapter';
import { parseWhoopJson, mapWhoopToMetrics, parseWhoopCsv, mapWhoopCsvToMetrics } from '@/lib/whoop';
import type { WhoopMapConfig, WhoopMapResult, WhoopCsvMapConfig, WhoopCsvMapResult } from '@/lib/whoop';

export type StorageMode = 'localStorage' | 'api';

export interface UseMetricsOptions {
  /** Storage backend to use. Defaults to 'localStorage' */
  mode?: StorageMode;
}

export interface UseMetricsReturn {
  metrics: Metric[];
  loading: boolean;
  error: Error | null;
  /** Current storage mode */
  storageMode: StorageMode;
  addMetric: (metric: Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>) => Promise<Metric | null>;
  updateMetric: (id: string, updates: Partial<Metric>) => Promise<void>;
  deleteMetric: (id: string) => Promise<void>;
  getMetricsByCategory: (category: MetricCategory) => Metric[];
  getMetricsByTimeRange: (startDate: Date, endDate: Date) => Metric[];
  getMetricHistory: (name: string) => Metric[];
  exportMetrics: () => Promise<string>;
  importMetrics: (metrics: Metric[]) => Promise<void>;
  importWhoopData: (jsonInput: string | unknown, config?: WhoopMapConfig) => Promise<WhoopMapResult | null>;
  importWhoopCsvData: (csvContent: string, config?: WhoopCsvMapConfig) => Promise<WhoopCsvMapResult | null>;
  clearMetrics: (confirm: boolean) => Promise<void>;
  clearError: () => void;
  getSyncStatus: () => Promise<SyncStatusSummary | null>;
  /** Refresh metrics from storage */
  refresh: () => Promise<void>;
}

/**
 * Create the appropriate storage adapter based on mode
 */
function createAdapter(mode: StorageMode): StorageAdapter {
  switch (mode) {
    case 'api':
      return new ApiAdapter();
    case 'localStorage':
    default:
      return new LocalStorageAdapter();
  }
}

export function useMetrics(options: UseMetricsOptions = {}): UseMetricsReturn {
  const { mode = 'localStorage' } = options;
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);

  // Initialize storage adapter and load metrics
  useEffect(() => {
    const initStorage = async () => {
      try {
        const adapter = createAdapter(mode);
        const initResult = await adapter.initialize();

        if (!initResult.success) {
          throw new Error(initResult.error?.message || 'Failed to initialize storage');
        }

        storageRef.current = adapter;

        const metricsResult = await adapter.getMetrics();
        if (metricsResult.success && metricsResult.data) {
          setMetrics(metricsResult.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load metrics'));
      } finally {
        setLoading(false);
      }
    };

    initStorage();
  }, [mode]);

  // Refresh metrics from storage
  const refresh = useCallback(async (): Promise<void> => {
    if (!storageRef.current) {
      return;
    }

    setLoading(true);
    try {
      const metricsResult = await storageRef.current.getMetrics();
      if (metricsResult.success && metricsResult.data) {
        setMetrics(metricsResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh metrics'));
    } finally {
      setLoading(false);
    }
  }, []);

  const addMetric = useCallback(async (
    metric: Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>
  ): Promise<Metric | null> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return null;
    }

    const result = await storageRef.current.addMetric(metric);

    if (!result.success) {
      setError(new Error(result.error?.message || 'Failed to add metric'));
      return null;
    }

    if (result.data) {
      setMetrics(prev => [...prev, result.data!]);
      return result.data;
    }

    return null;
  }, []);

  const updateMetric = useCallback(async (id: string, updates: Partial<Metric>): Promise<void> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return;
    }

    const result = await storageRef.current.updateMetric(id, updates);

    if (!result.success) {
      setError(new Error(result.error?.message || 'Failed to update metric'));
      return;
    }

    if (result.data) {
      setMetrics(prev => prev.map(m => m.id === id ? result.data! : m));
    }
  }, []);

  const deleteMetric = useCallback(async (id: string): Promise<void> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return;
    }

    const result = await storageRef.current.deleteMetric(id);

    if (!result.success) {
      setError(new Error(result.error?.message || 'Failed to delete metric'));
      return;
    }

    setMetrics(prev => prev.filter(m => m.id !== id));
  }, []);

  const getMetricsByCategory = useCallback((category: MetricCategory): Metric[] => {
    return metrics.filter(m => m.category === category);
  }, [metrics]);

  const getMetricsByTimeRange = useCallback((startDate: Date, endDate: Date): Metric[] => {
    return metrics.filter(m => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
  }, [metrics]);

  const getMetricHistory = useCallback((name: string): Metric[] => {
    return metrics
      .filter(m => m.name === name)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [metrics]);

  const exportMetrics = useCallback(async (): Promise<string> => {
    if (!storageRef.current) {
      throw new Error('Storage not initialized');
    }

    const result = await storageRef.current.exportMetrics();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to export metrics');
    }

    return result.data;
  }, []);

  const importMetrics = useCallback(async (metricsToImport: Metric[]): Promise<void> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return;
    }

    const result = await storageRef.current.importMetrics(metricsToImport);

    if (!result.success) {
      setError(new Error(result.error?.message || 'Failed to import metrics'));
      return;
    }

    if (result.data) {
      setMetrics(prev => [...prev, ...result.data!]);
    }
  }, []);

  const clearMetrics = useCallback(async (confirm: boolean): Promise<void> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return;
    }

    const result = await storageRef.current.clearMetrics(confirm);

    if (!result.success) {
      setError(new Error(result.error?.message || 'Failed to clear metrics'));
      return;
    }

    setMetrics([]);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const getSyncStatus = useCallback(async (): Promise<SyncStatusSummary | null> => {
    if (!storageRef.current) {
      return null;
    }

    const result = await storageRef.current.getSyncStatus();

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  }, []);

  const importWhoopData = useCallback(async (
    jsonInput: string | unknown,
    config?: WhoopMapConfig
  ): Promise<WhoopMapResult | null> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return null;
    }

    // Parse the WHOOP JSON
    const parseResult = parseWhoopJson(jsonInput);

    if (!parseResult.success || !parseResult.data) {
      setError(new Error(parseResult.errors.join(', ') || 'Failed to parse WHOOP data'));
      return null;
    }

    // Map to metrics
    const mapResult = mapWhoopToMetrics(parseResult.data, config);

    if (mapResult.metrics.length === 0) {
      setError(new Error('No metrics could be extracted from WHOOP data'));
      return mapResult;
    }

    // Import the metrics
    const importResult = await storageRef.current.importMetrics(mapResult.metrics);

    if (!importResult.success) {
      setError(new Error(importResult.error?.message || 'Failed to import WHOOP metrics'));
      return null;
    }

    if (importResult.data) {
      setMetrics(prev => [...prev, ...importResult.data!]);
    }

    return mapResult;
  }, []);

  const importWhoopCsvData = useCallback(async (
    csvContent: string,
    config?: WhoopCsvMapConfig
  ): Promise<WhoopCsvMapResult | null> => {
    if (!storageRef.current) {
      setError(new Error('Storage not initialized'));
      return null;
    }

    // Parse the WHOOP CSV
    const parseResult = parseWhoopCsv(csvContent);

    if (!parseResult.success || !parseResult.data) {
      setError(new Error(parseResult.errors.join(', ') || 'Failed to parse WHOOP CSV'));
      return null;
    }

    // Map to metrics
    const mapResult = mapWhoopCsvToMetrics(parseResult.data, config);

    if (mapResult.metrics.length === 0) {
      setError(new Error('No metrics could be extracted from WHOOP CSV'));
      return mapResult;
    }

    // Import the metrics
    const importResult = await storageRef.current.importMetrics(mapResult.metrics);

    if (!importResult.success) {
      setError(new Error(importResult.error?.message || 'Failed to import WHOOP CSV metrics'));
      return null;
    }

    if (importResult.data) {
      setMetrics(prev => [...prev, ...importResult.data!]);
    }

    return mapResult;
  }, []);

  return {
    metrics,
    loading,
    error,
    storageMode: mode,
    addMetric,
    updateMetric,
    deleteMetric,
    getMetricsByCategory,
    getMetricsByTimeRange,
    getMetricHistory,
    exportMetrics,
    importMetrics,
    importWhoopData,
    importWhoopCsvData,
    clearMetrics,
    clearError,
    getSyncStatus,
    refresh,
  };
}

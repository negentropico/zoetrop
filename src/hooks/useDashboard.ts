/**
 * useDashboard Hook
 *
 * Provides aggregated category data for the dashboard.
 * Uses useMetrics for data and aggregateByCategory for summaries.
 */

import { useMemo, useCallback } from 'react';
import { useMetrics, type StorageMode } from './useMetrics';
import { aggregateByCategory, getCategorySummary } from '@/lib/calculations/aggregate';
import type { MetricCategory } from '@/types/metrics';
import type { CategorySummary, UseDashboardReturn } from '@/types/components';

export interface UseDashboardOptions {
  /** Storage mode: 'localStorage' (browser) or 'api' (server SQLite) */
  mode?: StorageMode;
}

/**
 * Hook for dashboard data with category aggregations
 */
export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { mode = 'localStorage' } = options;
  const { metrics, loading, error, clearError, refresh: refreshMetrics, storageMode } = useMetrics({ mode });

  // Aggregate metrics by category
  const categories = useMemo<CategorySummary[]>(() => {
    if (loading || metrics.length === 0) {
      // Return empty summaries while loading or when no data
      return aggregateByCategory([]);
    }
    return aggregateByCategory(metrics);
  }, [metrics, loading]);

  // Refresh function
  const refresh = useCallback(async () => {
    // Clear any existing error to allow retry
    if (error) {
      clearError();
    }
    await refreshMetrics();
  }, [error, clearError, refreshMetrics]);

  return {
    categories,
    isLoading: loading,
    error: error?.message || null,
    refresh,
    storageMode,
  };
}

/**
 * Hook for a single category's data
 */
export function useCategory(category: MetricCategory): {
  summary: CategorySummary;
  isLoading: boolean;
  error: string | null;
} {
  const { metrics, loading, error } = useMetrics();

  const summary = useMemo<CategorySummary>(() => {
    if (loading) {
      return getCategorySummary(category, []);
    }
    return getCategorySummary(category, metrics);
  }, [metrics, loading, category]);

  return {
    summary,
    isLoading: loading,
    error: error?.message || null,
  };
}

export default useDashboard;

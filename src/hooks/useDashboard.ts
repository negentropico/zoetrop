/**
 * useDashboard Hook
 *
 * Provides aggregated category data for the dashboard.
 * Uses useMetrics for data and aggregateByCategory for summaries.
 */

import { useMemo, useCallback } from 'react';
import { useMetrics } from './useMetrics';
import { aggregateByCategory, getCategorySummary } from '@/lib/calculations/aggregate';
import type { MetricCategory } from '@/types/metrics';
import type { CategorySummary, UseDashboardReturn } from '@/types/components';

/**
 * Hook for dashboard data with category aggregations
 */
export function useDashboard(): UseDashboardReturn {
  const { metrics, loading, error, clearError } = useMetrics();

  // Aggregate metrics by category
  const categories = useMemo<CategorySummary[]>(() => {
    if (loading || metrics.length === 0) {
      // Return empty summaries while loading or when no data
      return aggregateByCategory([]);
    }
    return aggregateByCategory(metrics);
  }, [metrics, loading]);

  // Refresh function (triggers re-render via useMetrics internal state)
  const refresh = useCallback(() => {
    // Clear any existing error to allow retry
    if (error) {
      clearError();
    }
    // useMetrics handles data refresh internally
    // This is a placeholder for future refresh logic if needed
  }, [error, clearError]);

  return {
    categories,
    isLoading: loading,
    error: error?.message || null,
    refresh,
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

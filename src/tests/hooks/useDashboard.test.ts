/**
 * Tests for useDashboard Hook
 *
 * Tests dashboard data aggregation hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboard, useCategory } from '@/hooks/useDashboard';
import { seedMetrics, clearLocalStorage, seedLocalStorage } from '@/tests/fixtures/dashboard-fixtures';

// Mock the storage to avoid actual localStorage in tests
vi.mock('@/lib/storage/local', () => ({
  LocalStorageAdapter: class MockLocalStorageAdapter {
    async initialize() {
      return { success: true };
    }
    async getMetrics() {
      const stored = localStorage.getItem('wellness-metrics');
      if (stored) {
        const data = JSON.parse(stored);
        return { success: true, data: data.metrics };
      }
      return { success: true, data: [] };
    }
    async addMetric() {
      return { success: true };
    }
    async updateMetric() {
      return { success: true };
    }
    async deleteMetric() {
      return { success: true };
    }
    async exportMetrics() {
      return { success: true, data: '[]' };
    }
    async importMetrics() {
      return { success: true, data: [] };
    }
    async clearMetrics() {
      return { success: true };
    }
    async getSyncStatus() {
      return { success: true, data: { local: 0, synced: 0, pending: 0 } };
    }
  },
}));

describe('useDashboard', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it('should return all 9 categories', async () => {
    seedLocalStorage();

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toHaveLength(9);
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.isLoading).toBe(true);
  });

  it('should return empty categories when no data', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toHaveLength(9);
    result.current.categories.forEach((cat) => {
      expect(cat.metricCount).toBe(0);
      expect(cat.overallStatus).toBe('empty');
    });
  });

  it('should aggregate metrics by category', async () => {
    seedLocalStorage();

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const autonomic = result.current.categories.find((c) => c.category === 'autonomic');
    expect(autonomic?.metricCount).toBe(3);
    expect(autonomic?.overallStatus).toBe('optimal');

    const inflammatory = result.current.categories.find((c) => c.category === 'inflammatory');
    expect(inflammatory?.metricCount).toBe(1);
    expect(inflammatory?.overallStatus).toBe('borderline');
  });

  it('should have no error on success', async () => {
    seedLocalStorage();

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('should provide refresh function', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');
  });
});

describe('useCategory', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it('should return summary for specific category', async () => {
    seedLocalStorage();

    const { result } = renderHook(() => useCategory('autonomic'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary.category).toBe('autonomic');
    expect(result.current.summary.metricCount).toBe(3);
  });

  it('should return empty summary for category with no data', async () => {
    seedLocalStorage();

    const { result } = renderHook(() => useCategory('minerals'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary.category).toBe('minerals');
    expect(result.current.summary.metricCount).toBe(0);
    expect(result.current.summary.overallStatus).toBe('empty');
  });

  it('should include category info', async () => {
    const { result } = renderHook(() => useCategory('vitamins'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary.info.label).toBe('Vitamins');
    expect(result.current.summary.info.icon).toBeTruthy();
  });
});

/**
 * Tests for useWhoopImport Hook
 *
 * Tests the WHOOP import state machine.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhoopImport } from '@/hooks/useWhoopImport';
import { clearLocalStorage, seedLocalStorage } from '@/tests/fixtures/dashboard-fixtures';

// Mock the storage adapter
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
    async importMetrics(metrics: any[]) {
      return { success: true, data: metrics };
    }
    async clearMetrics() {
      return { success: true };
    }
    async getSyncStatus() {
      return { success: true, data: { local: 0, synced: 0, pending: 0 } };
    }
  },
}));

const validWhoopJson = JSON.stringify({
  generated_at: '2026-01-03 08:00:00',
  data_period: { start: '2025-12-01', end: '2026-01-03' },
  key_metrics: {
    avg_hrv_rmssd: 45,
    avg_recovery_score: 72,
    avg_resting_heart_rate: 58,
    avg_asleep: 7.2,
    avg_day_strain: 12.5,
  },
});

// Helper to create a mock File with text() method for jsdom
function createMockFile(content: string, name: string, type: string): File {
  const file = new File([content], name, { type });
  // Add text() method since jsdom doesn't support it natively
  file.text = () => Promise.resolve(content);
  return file;
}

describe('useWhoopImport', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it('should start in idle state', () => {
    const { result } = renderHook(() => useWhoopImport());
    expect(result.current.step).toBe('idle');
    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should transition to preview after handling valid file', async () => {
    const { result } = renderHook(() => useWhoopImport());

    const file = createMockFile(validWhoopJson, 'whoop.json', 'application/json');

    await act(async () => {
      await result.current.handleFile(file);
    });

    await waitFor(() => {
      expect(result.current.step).toBe('preview');
      expect(result.current.preview).not.toBeNull();
      expect(result.current.preview?.metrics.length).toBeGreaterThan(0);
    });
  });

  it('should transition to error for invalid JSON', async () => {
    const { result } = renderHook(() => useWhoopImport());

    const file = createMockFile('not valid json', 'bad.json', 'application/json');

    await act(async () => {
      await result.current.handleFile(file);
    });

    await waitFor(() => {
      expect(result.current.step).toBe('error');
      expect(result.current.error).not.toBeNull();
    });
  });

  it('should reset to idle state', async () => {
    const { result } = renderHook(() => useWhoopImport());

    const file = createMockFile(validWhoopJson, 'whoop.json', 'application/json');

    await act(async () => {
      await result.current.handleFile(file);
    });

    await waitFor(() => {
      expect(result.current.step).toBe('preview');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.preview).toBeNull();
  });

  it('should provide correct preview data', async () => {
    const { result } = renderHook(() => useWhoopImport());

    const file = createMockFile(validWhoopJson, 'whoop.json', 'application/json');

    await act(async () => {
      await result.current.handleFile(file);
    });

    await waitFor(() => {
      expect(result.current.preview?.filename).toBe('whoop.json');
      expect(result.current.preview?.source).toBe('whoop');
      expect(result.current.preview?.metrics.some(m => m.name === 'HRV (RMSSD)')).toBe(true);
    });
  });
});

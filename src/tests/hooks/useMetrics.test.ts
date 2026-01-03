/**
 * Tests for useMetrics hook
 *
 * Tests CRUD operations, filtering, and storage integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMetrics } from '@/hooks/useMetrics';
import type { Metric, MetricCategory } from '@/types/metrics';

// Helper to create a valid metric input (without id, syncStatus, syncVersion)
function createMetricInput(overrides: Partial<Metric> = {}): Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'> {
  return {
    name: 'Test Metric',
    value: 100,
    unit: 'mg/dL',
    category: 'vitamins' as MetricCategory,
    subcategory: 'b-vitamins',
    timestamp: new Date().toISOString(),
    improvement: 'higher is better',
    source: 'manual',
    ...overrides,
  } as Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>;
}

describe('useMetrics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with empty metrics array', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.metrics).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should load existing metrics from storage', async () => {
      // Pre-populate storage
      const existingData = {
        metrics: [
          {
            id: 'existing-1',
            name: 'Existing Metric',
            value: 50,
            unit: 'ng/mL',
            category: 'vitamins',
            subcategory: 'b-vitamins',
            timestamp: '2024-01-01T00:00:00.000Z',
            improvement: 'higher is better',
            source: 'manual',
            syncStatus: 'local',
            syncVersion: 1,
          },
        ],
        lastUpdated: new Date().toISOString(),
        syncVersion: 1,
      };
      localStorage.setItem('wellness_tracker_metrics', JSON.stringify(existingData));

      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.metrics).toHaveLength(1);
      expect(result.current.metrics[0].name).toBe('Existing Metric');
    });
  });

  describe('addMetric', () => {
    it('should add a new metric', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newMetric = createMetricInput({ name: 'Vitamin D' });

      await act(async () => {
        await result.current.addMetric(newMetric);
      });

      expect(result.current.metrics).toHaveLength(1);
      expect(result.current.metrics[0].name).toBe('Vitamin D');
      expect(result.current.metrics[0].id).toBeDefined();
      expect(result.current.metrics[0].syncStatus).toBe('local');
      expect(result.current.metrics[0].syncVersion).toBe(1);
    });

    it('should persist added metric to storage', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Vitamin B12' }));
      });

      // Verify storage
      const stored = JSON.parse(localStorage.getItem('wellness_tracker_metrics') || '{}');
      expect(stored.metrics).toHaveLength(1);
      expect(stored.metrics[0].name).toBe('Vitamin B12');
    });

    it('should set error for invalid metric', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Missing required field
      const invalidMetric = { name: '', value: 100 } as Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>;

      await act(async () => {
        await result.current.addMetric(invalidMetric);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.metrics).toHaveLength(0);
    });
  });

  describe('updateMetric', () => {
    it('should update an existing metric', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add metric first
      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Zinc', value: 80 }));
      });

      const addedMetric = result.current.metrics[0];

      // Update it
      await act(async () => {
        await result.current.updateMetric(addedMetric.id, { value: 100 });
      });

      expect(result.current.metrics[0].value).toBe(100);
      expect(result.current.metrics[0].syncVersion).toBe(2);
    });

    it('should set error when updating non-existent metric', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateMetric('non-existent-id', { value: 100 });
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('deleteMetric', () => {
    it('should delete an existing metric', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add metric first
      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Iron' }));
      });

      const addedMetric = result.current.metrics[0];

      // Delete it
      await act(async () => {
        await result.current.deleteMetric(addedMetric.id);
      });

      expect(result.current.metrics).toHaveLength(0);
    });

    it('should persist deletion to storage', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Magnesium' }));
      });

      const addedMetric = result.current.metrics[0];

      await act(async () => {
        await result.current.deleteMetric(addedMetric.id);
      });

      const stored = JSON.parse(localStorage.getItem('wellness_tracker_metrics') || '{}');
      expect(stored.metrics).toHaveLength(0);
    });
  });

  describe('getMetricsByCategory', () => {
    it('should filter metrics by category', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add metrics in different categories
      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Vitamin D', category: 'vitamins', subcategory: 'fat-soluble' }));
        await result.current.addMetric(createMetricInput({ name: 'Zinc', category: 'minerals', subcategory: 'essential' }));
        await result.current.addMetric(createMetricInput({ name: 'B12', category: 'vitamins', subcategory: 'b-vitamins' }));
      });

      const vitamins = result.current.getMetricsByCategory('vitamins');
      expect(vitamins).toHaveLength(2);
      expect(vitamins.every(m => m.category === 'vitamins')).toBe(true);

      const minerals = result.current.getMetricsByCategory('minerals');
      expect(minerals).toHaveLength(1);
      expect(minerals[0].name).toBe('Zinc');
    });
  });

  describe('getMetricsByTimeRange', () => {
    it('should filter metrics by time range', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add metrics with different timestamps
      await act(async () => {
        await result.current.addMetric(createMetricInput({
          name: 'Old Metric',
          timestamp: '2024-01-01T00:00:00.000Z'
        }));
        await result.current.addMetric(createMetricInput({
          name: 'Recent Metric',
          timestamp: '2024-06-15T00:00:00.000Z'
        }));
        await result.current.addMetric(createMetricInput({
          name: 'New Metric',
          timestamp: '2024-12-01T00:00:00.000Z'
        }));
      });

      const filtered = result.current.getMetricsByTimeRange(
        new Date('2024-06-01'),
        new Date('2024-12-31')
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map(m => m.name)).toContain('Recent Metric');
      expect(filtered.map(m => m.name)).toContain('New Metric');
    });
  });

  describe('getMetricHistory', () => {
    it('should get historical readings for a metric by name', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add multiple readings of same metric
      await act(async () => {
        await result.current.addMetric(createMetricInput({
          name: 'HRV',
          value: 45,
          timestamp: '2024-01-01T00:00:00.000Z',
          category: 'autonomic',
          subcategory: 'hrv',
        }));
        await result.current.addMetric(createMetricInput({
          name: 'HRV',
          value: 50,
          timestamp: '2024-01-15T00:00:00.000Z',
          category: 'autonomic',
          subcategory: 'hrv',
        }));
        await result.current.addMetric(createMetricInput({
          name: 'HRV',
          value: 55,
          timestamp: '2024-02-01T00:00:00.000Z',
          category: 'autonomic',
          subcategory: 'hrv',
        }));
        await result.current.addMetric(createMetricInput({
          name: 'Different Metric',
          value: 100,
          timestamp: '2024-01-10T00:00:00.000Z'
        }));
      });

      const history = result.current.getMetricHistory('HRV');

      expect(history).toHaveLength(3);
      expect(history[0].value).toBe(45); // Oldest first
      expect(history[2].value).toBe(55); // Newest last
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics as JSON string', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Test Export' }));
      });

      let exported = '';
      await act(async () => {
        exported = await result.current.exportMetrics();
      });

      const parsed = JSON.parse(exported);
      expect(parsed.metrics).toHaveLength(1);
      expect(parsed.metrics[0].name).toBe('Test Export');
      expect(parsed.exportedAt).toBeDefined();
    });
  });

  describe('importMetrics', () => {
    it('should import metrics from JSON array', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const metricsToImport: Metric[] = [
        {
          id: 'import-1',
          name: 'Imported Metric',
          value: 75,
          unit: 'ng/mL',
          category: 'vitamins',
          subcategory: 'fat-soluble',
          timestamp: '2024-01-01T00:00:00.000Z',
          improvement: 'higher is better',
          source: 'bloodwork',
          syncStatus: 'local',
          syncVersion: 1,
        } as Metric,
      ];

      await act(async () => {
        await result.current.importMetrics(metricsToImport);
      });

      expect(result.current.metrics).toHaveLength(1);
      expect(result.current.metrics[0].name).toBe('Imported Metric');
    });

    it('should reject invalid metrics during import', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const invalidMetrics = [
        { name: '', value: 'not a number' }, // Invalid
      ];

      await act(async () => {
        await result.current.importMetrics(invalidMetrics as unknown as Metric[]);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.metrics).toHaveLength(0);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics with confirmation', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Metric 1' }));
        await result.current.addMetric(createMetricInput({ name: 'Metric 2' }));
      });

      expect(result.current.metrics).toHaveLength(2);

      await act(async () => {
        await result.current.clearMetrics(true);
      });

      expect(result.current.metrics).toHaveLength(0);
    });

    it('should not clear metrics without confirmation', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addMetric(createMetricInput({ name: 'Protected Metric' }));
      });

      await act(async () => {
        await result.current.clearMetrics(false);
      });

      expect(result.current.metrics).toHaveLength(1);
      expect(result.current.error).toBeDefined();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', async () => {
      const { result } = renderHook(() => useMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger an error
      await act(async () => {
        await result.current.updateMetric('non-existent', { value: 100 });
      });

      expect(result.current.error).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
